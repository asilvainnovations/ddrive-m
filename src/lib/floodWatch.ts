// Sub-regional flood watch and the flood-measure benefit-cost screen (ADR-019).
//
// The watch list rolls the organisation's Flood Intelligence outlook (ADR-016: its own barangays, hazard shares and
// rainfall, with their sources) up to the LGUs of a sub-region. It sets no rainfall, river or warning threshold of its
// own. The screen is plain discounted arithmetic over figures the planner types in; it ships with no cost or benefit
// numbers, so it cannot pass an invented value off as evidence. It ranks options; it is not an appraisal.
//
// watchText and the benefit-cost screen are adapted from MODE (Ormoc City CDRRMO), src/domain/floodScreen.ts, Apache
// License 2.0. See THIRD_PARTY_NOTICES.md.
import { LEVEL_LABEL, type FloodLevel, type Outlook } from '@/lib/floodIntel';
import { lguOf, type SubRegion } from '@/content/subRegions';

const LEVEL_RANK: Record<FloodLevel, number> = { danger: 0, warning: 1, safe: 2 };

export interface WatchRow { o: Outlook; lgu: string | null; level: FloodLevel | null }
export interface LguRollup { psgc: string | null; name: string; group: string | null; areas: number; withRain: number; high: number; watch: number; low: number; maxHazard: number | null }

export function watchRows(region: SubRegion, outlooks: Outlook[]): WatchRow[] {
  return outlooks.map((o) => ({ o, lgu: lguOf(region, o.area.adm4_pcode)?.psgc ?? null, level: o.score?.level ?? null }));
}

/** Areas with a level of Watch or High, most severe first, then the higher hazard share, then name. No reading sorts out. */
export function watchList(rows: WatchRow[], min: FloodLevel = 'warning'): WatchRow[] {
  return rows.filter((r) => r.level !== null && LEVEL_RANK[r.level] <= LEVEL_RANK[min])
    .sort((a, b) => (LEVEL_RANK[a.level!] - LEVEL_RANK[b.level!]) || (b.o.area.flood_hazard_pct - a.o.area.flood_hazard_pct) || a.o.area.name.localeCompare(b.o.area.name));
}

/** Per-LGU counts. Areas whose code is not in the sub-region are kept under "Not matched to an LGU", never dropped. */
export function rollup(region: SubRegion, rows: WatchRow[]): LguRollup[] {
  const out = new Map<string, LguRollup>();
  for (const l of region.lgus) out.set(l.psgc, { psgc: l.psgc, name: l.name, group: l.group, areas: 0, withRain: 0, high: 0, watch: 0, low: 0, maxHazard: null });
  const other: LguRollup = { psgc: null, name: 'Not matched to an LGU', group: null, areas: 0, withRain: 0, high: 0, watch: 0, low: 0, maxHazard: null };
  for (const r of rows) {
    const x = (r.lgu && out.get(r.lgu)) || other;
    x.areas += 1;
    x.maxHazard = Math.max(x.maxHazard ?? 0, r.o.area.flood_hazard_pct);
    if (r.level) {
      x.withRain += 1;
      if (r.level === 'danger') x.high += 1; else if (r.level === 'warning') x.watch += 1; else x.low += 1;
    }
  }
  return [...out.values(), ...(other.areas ? [other] : [])];
}

/** Plain text for the EOC log or a message. Rainfall context is what the person read from PAGASA; it is not used to rank. */
export function watchText(region: SubRegion, list: WatchRow[], date: string, note: { product: string; at: string }): string {
  const ctx = [note.product && `source: ${note.product}`, note.at && `as of ${note.at}`].filter(Boolean).join('; ');
  const name = (psgc: string | null) => region.lgus.find((l) => l.psgc === psgc)?.name ?? 'LGU not matched';
  const head = `Flood watch list for ${date}, ${region.name} (DDRiVE-M flood rule v1; decision support, not a warning)${ctx ? ` | ${ctx}` : ''}`;
  const lines = list.map((r, i) => `${i + 1}. ${r.o.area.name} (${name(r.lgu)}) | ${LEVEL_LABEL[r.level!]} | ${r.o.rainToday} mm ${r.o.todayKind} | hazard ${r.o.area.flood_hazard_pct}%`);
  return [head, ...(lines.length ? lines : ['No area at Watch or High for this day.'])].join('\n');
}

// ─── Benefit-cost screen ─────────────────────────────────────────────────────
export type MeasureType = 'nbs' | 'hybrid' | 'grey';
export const MEASURE_TYPE: Record<MeasureType, string> = { nbs: 'Nature-based', hybrid: 'Hybrid', grey: 'Grey' };
export interface Assumptions { assets: number; damage: number; events: number; horizon: number; discount: number; om: number }
export interface Measure { id: string; name: string; type: MeasureType; capital: number; reduction: number; economic: number; social: number }
export interface MeasureResult { measure: Measure; avoided: number; economic: number; social: number; benefits: number; cost: number; bcr: number | null; npv: number }

/** Present value of 1 a year for n years. */
export function annuity(rate: number, years: number): number {
  const k = Math.max(0, Math.floor(years));
  return rate === 0 ? k : (1 - (1 + rate) ** -k) / rate;
}

export function screenMeasure(a: Assumptions, m: Measure): MeasureResult {
  const A = annuity(a.discount, a.horizon);
  const avoided = a.assets * a.damage * a.events * m.reduction * A;
  const economic = m.economic * A;
  const social = m.social * A;
  const benefits = avoided + economic + social;
  const cost = m.capital + m.capital * a.om * A;
  return { measure: m, avoided, economic, social, benefits, cost, bcr: cost > 0 ? benefits / cost : null, npv: benefits - cost };
}

/** Measures with a cost entered, best BCR first. */
export function screenAll(a: Assumptions, ms: Measure[]): MeasureResult[] {
  return ms.filter((m) => m.capital > 0).map((m) => screenMeasure(a, m)).sort((x, y) => (y.bcr ?? -1) - (x.bcr ?? -1));
}

/** Which assumptions are still blank, so the screen says what it needs instead of showing zeros. */
export function missingAssumptions(a: Assumptions): string[] {
  const out: string[] = [];
  if (!(a.assets > 0)) out.push('assets exposed');
  if (!(a.damage > 0)) out.push('damage share');
  if (!(a.events > 0)) out.push('events per year');
  if (!(a.horizon > 0)) out.push('years');
  return out;
}
