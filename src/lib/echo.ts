// ECHO: Evacuation and Camp Handling Operations, with evacuation intelligence for a sub-region (ADR-019).
//
// Planning arithmetic for an exercise in which several LGUs evacuate at once. Each benchmark keeps its own source:
// Sphere, the DSWD-DILG-DOH-DepEd JMC No. 02 s. 2021 and RA 12076 are different instruments and are never merged or
// averaged. A figure here is a planning check, not a certification: nothing in ECHO certifies a site as safe, orders
// an evacuation or opens or closes a centre. Counts are aggregates; a blank is "not reported" (null), never zero.
//
// Benchmarks and the water, space and toilet checks are adapted from MODE (Ormoc City CDRRMO), src/domain/echo.ts,
// Apache License 2.0. The multi-LGU roll-up and host suggestions are new. See THIRD_PARTY_NOTICES.md.

export type SourceKey = 'sphere' | 'jmc' | 'ra12076' | 'dpms';
export const SOURCES: Record<SourceKey, string> = {
  sphere: 'Sphere Handbook (2018)',
  jmc: 'DSWD-DILG-DOH-DepEd JMC No. 02, s. 2021',
  ra12076: 'RA 12076, Ligtas Pinoy Centers Act',
  dpms: 'NDRRMC Disaster Preparedness Minimum Standards, Vol. 2',
};
export interface Benchmark { key: string; label: string; value: string; source: SourceKey; where: string; note?: string }
export const BENCHMARKS: Benchmark[] = [
  { key: 'water_sphere', label: 'Safe water, initial planning', value: '15 L per person per day', source: 'sphere', where: 'WASH, water supply standard 2.1' },
  { key: 'water_jmc_prolonged', label: 'Minimum water demand, prolonged period', value: '52 L per person per day', source: 'jmc', where: 'VII, WASH (e), p. 13', note: 'Not the same as the Sphere 15 L.' },
  { key: 'toilet_jmc_short', label: 'Toilets, short-term displacement', value: '1 per 50 persons', source: 'jmc', where: 'VII, WASH (a)(i), p. 12', note: 'Applies when displacement exceeds 3 days.' },
  { key: 'toilet_jmc_long', label: 'Toilets, long-term displacement', value: '1 per 20 persons', source: 'jmc', where: 'VII, WASH (a)(ii), p. 12' },
  { key: 'toilet_ra', label: 'Toilets (permanent evacuation centres)', value: '1 per 20 males, 1 per 20 females; 1 per 8 persons with disability or older persons', source: 'ra12076', where: 'Sec. 4(c)(2)', note: 'A facility design standard, not the JMC camp ratio.' },
  { key: 'space_sphere', label: 'Covered living space', value: '3.5 m² per person', source: 'sphere', where: 'Shelter and settlement standard 3; cited in the JMC, VII.1(c), p. 11' },
  { key: 'settlement_sphere', label: 'Camp-type settlement area', value: '45 m² per person (30 m² where communal services are outside)', source: 'sphere', where: 'Shelter and settlement standard 2', note: 'Total site area, not floor area.' },
  { key: 'room_dpms', label: 'Families per evacuation room', value: '6 families per 40 m² room', source: 'dpms', where: 'Evacuation centre minimum standards, p. 15' },
];

export const SPHERE_WATER_L = 15;
export const JMC_PROLONGED_WATER_L = 52;
export const SPHERE_SPACE_M2 = 3.5;
export const SPHERE_SITE_M2 = 45;
export const JMC_TOILET_SHORT = 50;
export const JMC_TOILET_LONG = 20;

const n = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const ceilDiv = (a: number, b: number) => (b > 0 ? Math.ceil(a / b) : 0);

/** A number from a form field: '' is not reported (null); anything else must be a whole number, 0 or more. */
export function parseWhole(s: string): number | null | 'invalid' {
  const v = s.trim().replace(/,/g, '');
  if (v === '') return null;
  if (!/^\d+$/.test(v)) return 'invalid';
  return Number(v);
}

export interface WaterCheck { needSphere: number; needJmc: number; meetsSphere: boolean | null; meetsJmc: boolean | null; perPerson: number | null }
export function waterCheck(persons: number | null, litresPerDay: number | null): WaterCheck {
  const p = n(persons) ?? 0, a = n(litresPerDay);
  return {
    needSphere: p * SPHERE_WATER_L, needJmc: p * JMC_PROLONGED_WATER_L,
    meetsSphere: a === null || p === 0 ? null : a >= p * SPHERE_WATER_L,
    meetsJmc: a === null || p === 0 ? null : a >= p * JMC_PROLONGED_WATER_L,
    perPerson: a === null || p === 0 ? null : a / p,
  };
}

export interface SpaceCheck { need: number; meets: boolean | null; capacityAtStandard: number | null }
/** Covered floor area against 3.5 m² per person (Sphere). */
export function spaceCheck(persons: number | null, coveredM2: number | null): SpaceCheck {
  const p = n(persons) ?? 0, a = n(coveredM2);
  return { need: p * SPHERE_SPACE_M2, meets: a === null || p === 0 ? null : a >= p * SPHERE_SPACE_M2, capacityAtStandard: a === null ? null : Math.floor(a / SPHERE_SPACE_M2) };
}

/** Toilets needed under the JMC ratio for the expected length of displacement. */
export function toiletNeed(persons: number | null, phase: 'short' | 'long'): number {
  return ceilDiv(n(persons) ?? 0, phase === 'long' ? JMC_TOILET_LONG : JMC_TOILET_SHORT);
}

/** Hours to move `persons` with `vehicles` carrying `perTrip` each, at `roundTripMin` minutes a round trip. */
export function movementHours(persons: number | null, vehicles: number | null, perTrip: number | null, roundTripMin: number | null): number | null {
  const p = n(persons), v = n(vehicles), c = n(perTrip), r = n(roundTripMin);
  if (p === null || !v || !c || !r) return null;
  const trips = Math.ceil(p / (v * c));
  return (trips * r) / 60;
}

// ─── Multi-LGU exercise ──────────────────────────────────────────────────────
export interface LguPlan {
  psgc: string; name: string; group: string;
  displaced: number | null; female: number | null; children: number | null; older: number | null; pwd: number | null;
  /** Covered floor area of the LGU's available centres, m². */ coveredM2: number | null;
  waterLpd: number | null; toilets: number | null;
}
export type Tone = 'ok' | 'warn' | 'bad' | 'info';
export interface Finding { tone: Tone; lgu: string; title: string; body: string; source: string }
export interface LguResult {
  plan: LguPlan; capacity: number | null; shortfall: number | null; spare: number | null;
  space: SpaceCheck; water: WaterCheck; toiletsNeeded: number; findings: Finding[];
}

export function sadProblems(p: LguPlan): string[] {
  const out: string[] = [];
  const d = n(p.displaced);
  for (const [k, label] of [['female', 'Females'], ['children', 'Children'], ['older', 'Older persons'], ['pwd', 'Persons with disabilities']] as const) {
    const v = n(p[k]);
    if (v !== null && d !== null && v > d) out.push(`${p.name}: ${label} (${v}) exceed the displaced total (${d}).`);
  }
  return out;
}

export function assessLgu(p: LguPlan, phase: 'short' | 'long'): LguResult {
  const space = spaceCheck(p.displaced, p.coveredM2);
  const water = waterCheck(p.displaced, p.waterLpd);
  const capacity = space.capacityAtStandard;
  const d = n(p.displaced);
  const shortfall = d === null || capacity === null ? null : Math.max(0, d - capacity);
  const spare = d === null || capacity === null ? null : Math.max(0, capacity - d);
  const toiletsNeeded = toiletNeed(p.displaced, phase);
  const f: Finding[] = [];
  if (d === null) f.push({ tone: 'info', lgu: p.name, title: 'Displaced persons not reported', body: 'No check can run until a projected figure is entered.', source: 'ECHO' });
  if (d !== null && capacity === null) f.push({ tone: 'info', lgu: p.name, title: 'Centre floor area not reported', body: 'Enter the covered area of available centres to check space.', source: SOURCES.sphere });
  if (shortfall) f.push({ tone: 'bad', lgu: p.name, title: 'Not enough covered space', body: `${shortfall.toLocaleString('en-PH')} persons over capacity at 3.5 m² per person (${capacity!.toLocaleString('en-PH')} fit).`, source: `${SOURCES.sphere}, shelter standard 3` });
  if (water.meetsSphere === false) f.push({ tone: 'bad', lgu: p.name, title: 'Water below the Sphere planning figure', body: `${(p.waterLpd ?? 0).toLocaleString('en-PH')} L a day against ${water.needSphere.toLocaleString('en-PH')} L needed at 15 L per person.`, source: `${SOURCES.sphere}, WASH 2.1` });
  else if (phase === 'long' && water.meetsJmc === false) f.push({ tone: 'warn', lgu: p.name, title: 'Water below the JMC prolonged-stay figure', body: `${water.needJmc.toLocaleString('en-PH')} L a day needed at 52 L per person.`, source: `${SOURCES.jmc}, VII WASH (e)` });
  if (d !== null && d > 0 && n(p.toilets) !== null && p.toilets! < toiletsNeeded)
    f.push({ tone: 'warn', lgu: p.name, title: 'Too few toilets', body: `${p.toilets} available; ${toiletsNeeded} needed at the JMC ${phase === 'long' ? '1:20' : '1:50'} ratio.`, source: `${SOURCES.jmc}, VII WASH (a)` });
  if (d !== null && d > 0 && n(p.older) === null && n(p.pwd) === null)
    f.push({ tone: 'info', lgu: p.name, title: 'Disaggregated counts incomplete', body: 'Record older persons and persons with disabilities to plan assisted movement.', source: SOURCES.jmc });
  for (const s of sadProblems(p)) f.push({ tone: 'bad', lgu: p.name, title: 'Figures do not add up', body: s, source: 'ECHO' });
  return { plan: p, capacity, shortfall, spare, space, water, toiletsNeeded, findings: f };
}

export interface HostSuggestion { from: string; to: string; persons: number; group: string }
/**
 * Evacuation intelligence: for each LGU short of space, candidate hosts in the same group (district) with spare space,
 * largest spare first. A candidate is not an arrangement: hosting needs the receiving LGU's consent, a checked route
 * and the CCCM cluster's coordination.
 */
export function hostSuggestions(results: LguResult[]): HostSuggestion[] {
  const spare = new Map(results.map((r) => [r.plan.psgc, r.spare ?? 0]));
  const out: HostSuggestion[] = [];
  const short = results.filter((r) => (r.shortfall ?? 0) > 0).sort((a, b) => (b.shortfall ?? 0) - (a.shortfall ?? 0));
  for (const s of short) {
    let left = s.shortfall!;
    const hosts = results.filter((r) => r.plan.group === s.plan.group && r.plan.psgc !== s.plan.psgc && (spare.get(r.plan.psgc) ?? 0) > 0)
      .sort((a, b) => (spare.get(b.plan.psgc)! - spare.get(a.plan.psgc)!) || a.plan.name.localeCompare(b.plan.name));
    for (const h of hosts) {
      if (left <= 0) break;
      const take = Math.min(left, spare.get(h.plan.psgc)!);
      out.push({ from: s.plan.name, to: h.plan.name, persons: take, group: s.plan.group });
      spare.set(h.plan.psgc, spare.get(h.plan.psgc)! - take);
      left -= take;
    }
  }
  return out;
}

export interface Totals { displaced: number; capacity: number; shortfall: number; unhoused: number; notReported: number }
export function totals(results: LguResult[], hosts: HostSuggestion[]): Totals {
  const displaced = results.reduce((a, r) => a + (r.plan.displaced ?? 0), 0);
  const capacity = results.reduce((a, r) => a + (r.capacity ?? 0), 0);
  const shortfall = results.reduce((a, r) => a + (r.shortfall ?? 0), 0);
  const hosted = hosts.reduce((a, h) => a + h.persons, 0);
  return { displaced, capacity, shortfall, unhoused: shortfall - hosted, notReported: results.filter((r) => r.plan.displaced === null).length };
}
