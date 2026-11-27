// Flood Intelligence (ADR-016): daily rainfall against each barangay's flood hazard, with the rule shared with
// scripts/flood_intelligence (src/content/flood-rule-v1.json). Decision support, not a warning: PAGASA issues
// rainfall and flood warnings, and the LDRRMO decides on action.
import rule from '@/content/flood-rule-v1.json';
import { supabase } from '@/lib/supabase';

export const FLOOD_RULE = rule;
export type FloodLevel = 'safe' | 'warning' | 'danger';
export const LEVEL_LABEL: Record<FloodLevel, string> = { safe: 'Low', warning: 'Watch', danger: 'High' };

interface Part { full_ratio: number; half_ratio: number; ramp_below: number; ramp_above: number; at_half: number }

function ramp(r: number, p: Part, onset: number): number {
  if (!(r > onset)) return 0;
  if (r >= p.full_ratio) return 1;
  if (r >= p.half_ratio) return p.at_half + (r - p.half_ratio) * p.ramp_above;
  return (r - onset) * p.ramp_below;
}

/** The rule's danger and warning probabilities and the adjusted thresholds, for one barangay and day. */
export function ruleScore(rainToday: number, rainPrev: number, hazardPct: number) {
  const h = Math.min(100, Math.max(0, hazardPct));
  const factor = Math.max(1 - h / 100, rule.min_factor);
  const dangerMm = rule.base_danger_mm * factor;
  const warningMm = rule.base_warning_mm * factor;
  let pDanger = ramp(rainToday / dangerMm, rule.danger, rule.onset_ratio);
  const bonus = rainPrev > rule.antecedent_bonus.above_mm;
  if (bonus) pDanger += rule.antecedent_bonus.add;
  pDanger = Math.min(pDanger, 1);
  const pWarning = Math.min(ramp(rainToday / warningMm, rule.warning, rule.onset_ratio), 1);
  return { pDanger, pWarning, dangerMm, warningMm, factor, bonus, level: ruleLevel(pDanger, pWarning) };
}

/** Most likely level: danger with pDanger, else warning with pWarning, else safe. Ties go to the more severe. */
export function ruleLevel(pDanger: number, pWarning: number): FloodLevel {
  const pSafe = (1 - pDanger) * (1 - pWarning), pWarn = (1 - pDanger) * pWarning, eps = 1e-9;
  if (pDanger + eps >= Math.max(pWarn, pSafe)) return 'danger';
  if (pWarn + eps >= pSafe) return 'warning';
  return 'safe';
}

// ── Data ──────────────────────────────────────────────────────────────────────
export interface FloodArea { id: string; adm4_pcode: string | null; name: string; flood_hazard_pct: number; hazard_source: string; lat: number | null; lon: number | null }
export interface Rainfall { id: string; area_id: string; obs_date: string; rain_mm: number; kind: 'observed' | 'forecast'; source: string }

export async function listFloodAreas(): Promise<{ data: FloodArea[]; error: string | null }> {
  const { data, error } = await supabase.from('ddrive_flood_areas').select('id, adm4_pcode, name, flood_hazard_pct, hazard_source, lat, lon').order('name');
  return { data: ((data ?? []) as FloodArea[]).map((a) => ({ ...a, flood_hazard_pct: Number(a.flood_hazard_pct) })), error: error?.message ?? null };
}
export async function listRainfall(fromDate: string): Promise<{ data: Rainfall[]; error: string | null }> {
  const { data, error } = await supabase.from('ddrive_rainfall').select('id, area_id, obs_date, rain_mm, kind, source').gte('obs_date', fromDate).order('obs_date');
  return { data: ((data ?? []) as Rainfall[]).map((r) => ({ ...r, rain_mm: Number(r.rain_mm) })), error: error?.message ?? null };
}
export async function importFloodAreas(rows: Omit<FloodArea, 'id' | 'hazard_source'>[], source: string) {
  const { data, error } = await supabase.rpc('ddrive_import_flood_areas', { p: rows, p_source: source });
  return { result: data as { added: number; updated: number } | null, error: error?.message ?? null };
}
export async function recordRainfall(rows: { area_id: string; obs_date: string; rain_mm: number; kind?: 'observed' | 'forecast' }[], source: string) {
  const { data, error } = await supabase.rpc('ddrive_record_rainfall', { p: rows, p_source: source });
  return { result: data as { added: number; updated: number } | null, error: error?.message ?? null };
}
export async function deleteFloodArea(id: string) {
  const { error } = await supabase.from('ddrive_flood_areas').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ── Outlook ───────────────────────────────────────────────────────────────────
export const manilaToday = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d);
export const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export interface Outlook {
  area: FloodArea;
  date: string;
  rainToday: number | null;
  todayKind: 'observed' | 'forecast' | null;
  rainPrev: number;
  prevDays: number;            // how many of the days before have a reading
  score: ReturnType<typeof ruleScore> | null;
}

/** For each area and day: the day's rainfall (observed, else forecast) and the observed rain of the days before.
 *  With no rainfall for the day there is no score: no reading is not "no rain". */
export function outlook(areas: FloodArea[], rain: Rainfall[], date: string): Outlook[] {
  const key = (a: string, d: string, k: string) => `${a}|${d}|${k}`;
  const m = new Map(rain.map((r) => [key(r.area_id, r.obs_date, r.kind), r.rain_mm]));
  return areas.map((area) => {
    const obs = m.get(key(area.id, date, 'observed'));
    const fc = m.get(key(area.id, date, 'forecast'));
    const rainToday = obs ?? fc ?? null;
    let rainPrev = 0, prevDays = 0;
    for (let k = 1; k <= rule.antecedent_days; k++) {
      const v = m.get(key(area.id, addDays(date, -k), 'observed'));
      if (v !== undefined) { rainPrev += v; prevDays++; }
    }
    return {
      area, date, rainToday, todayKind: obs !== undefined ? 'observed' : fc !== undefined ? 'forecast' : null,
      rainPrev, prevDays, score: rainToday === null ? null : ruleScore(rainToday, rainPrev, area.flood_hazard_pct),
    };
  });
}

// ── CSV import ────────────────────────────────────────────────────────────────
/** Small CSV reader: quoted fields, commas inside quotes, CRLF. Header names are lower-cased and trimmed. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') q = false; else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim() !== ''));
  if (!head) return [];
  const h = head.map((x) => x.trim().toLowerCase().replace(/^\uFEFF/, ''));
  return body.map((r) => Object.fromEntries(h.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const pick = (r: Record<string, string>, names: string[]) => names.map((n) => r[n]).find((v) => v !== undefined && v !== '');

/** Areas from a CSV such as Project CCHAIN's project_noah_hazards.csv. */
export function areasFromCsv(text: string): { rows: Omit<FloodArea, 'id' | 'hazard_source'>[]; problems: string[] } {
  const problems: string[] = [];
  const rows = parseCsv(text).flatMap((r, i) => {
    const code = pick(r, ['adm4_pcode', 'psgc', 'psgc_code']) ?? null;
    const name = pick(r, ['name', 'barangay', 'brgy_name', 'adm4_en']) ?? code;
    const pct = Number(pick(r, ['flood_hazard_pct', 'pct_area_flood_hazard_100yr_high']));
    if (!name || !Number.isFinite(pct) || pct < 0 || pct > 100) { problems.push(`Row ${i + 2}: needs a name or adm4_pcode and a flood hazard % from 0 to 100`); return []; }
    const lat = Number(pick(r, ['lat', 'latitude'])), lon = Number(pick(r, ['lon', 'lng', 'longitude']));
    return [{ adm4_pcode: code, name, flood_hazard_pct: Math.round(pct * 100) / 100, lat: Number.isFinite(lat) && pick(r, ['lat', 'latitude']) ? lat : null, lon: Number.isFinite(lon) && pick(r, ['lon', 'lng', 'longitude']) ? lon : null }];
  });
  return { rows, problems };
}

/** Daily rainfall from a CSV with adm4_pcode (or name), date and rain_mm (or pr, as in CCHAIN climate_atmosphere). */
export function rainfallFromCsv(text: string, areas: FloodArea[]) {
  const byCode = new Map(areas.filter((a) => a.adm4_pcode).map((a) => [a.adm4_pcode!, a.id]));
  const byName = new Map(areas.map((a) => [a.name.toLowerCase(), a.id]));
  const problems: string[] = [];
  const rows = parseCsv(text).flatMap((r, i) => {
    const code = pick(r, ['adm4_pcode', 'psgc']);
    const name = pick(r, ['name', 'barangay']);
    const id = (code && byCode.get(code)) || (name && byName.get(name.toLowerCase()));
    const date = pick(r, ['date', 'obs_date']);
    const mm = Number(pick(r, ['rain_mm', 'pr', 'rainfall_mm']));
    const kind = (pick(r, ['kind']) ?? 'observed').toLowerCase();
    if (!id) { problems.push(`Row ${i + 2}: no flood area ${code ?? name ?? ''}`); return []; }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(mm) || mm < 0) { problems.push(`Row ${i + 2}: needs a date (YYYY-MM-DD) and rain_mm of 0 or more`); return []; }
    if (kind !== 'observed' && kind !== 'forecast') { problems.push(`Row ${i + 2}: kind must be observed or forecast`); return []; }
    return [{ area_id: id, obs_date: date, rain_mm: mm, kind: kind as 'observed' | 'forecast' }];
  });
  return { rows, problems };
}
