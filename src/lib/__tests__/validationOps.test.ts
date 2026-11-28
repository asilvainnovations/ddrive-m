import { describe, expect, it } from 'vitest';
import { METRO_MANILA, alarmAt, lguOf } from '@/content/subRegions';
import { SCENARIOS, ROLES } from '@/content/ics/metroManila';
import { TIMEOUT_OPTION, doctrineFor, metrics, pickFor, scenarioProblems, scoreDecision, shuffled, spotlight, band } from '@/lib/ics/engine';
import { assessLgu, hostSuggestions, movementHours, parseWhole, spaceCheck, totals, waterCheck, type LguPlan } from '@/lib/echo';
import { annuity, missingAssumptions, rollup, screenAll, watchList, watchRows, watchText } from '@/lib/floodWatch';
import { previewAt, setProblems } from '@/lib/cpActivation';
import type { FloodArea, Outlook } from '@/lib/floodIntel';
import { ruleScore } from '@/lib/floodIntel';

describe('Metro Manila sub-region', () => {
  it('has the sixteen cities and one municipality, each with a 9-digit PSGC in a known district', () => {
    expect(METRO_MANILA.lgus).toHaveLength(17);
    expect(METRO_MANILA.lgus.filter((l) => l.kind === 'municipality').map((l) => l.name)).toEqual(['Pateros']);
    const groups = new Set(METRO_MANILA.groups.map((g) => g.id));
    for (const l of METRO_MANILA.lgus) { expect(l.psgc).toMatch(/^\d{9}$/); expect(groups.has(l.group)).toBe(true); }
    expect(new Set(METRO_MANILA.lgus.map((l) => l.psgc)).size).toBe(17);
  });
  it('matches a barangay code to its LGU and leaves other codes unmatched', () => {
    expect(lguOf(METRO_MANILA, '137404123')?.name).toBe('Quezon City');
    expect(lguOf(METRO_MANILA, '083738001')).toBeNull();
    expect(lguOf(METRO_MANILA, null)).toBeNull();
  });
  it('reads the Marikina alarm levels from the reading', () => {
    const p = METRO_MANILA.watchPoints[0]!;
    expect(alarmAt(p, 14.9)).toBeNull();
    expect(alarmAt(p, 15)?.label).toBe('1st alarm');
    expect(alarmAt(p, 17.2)?.meaning).toMatch(/^Evacuate/);
    expect(alarmAt(p, 18)?.meaning).toBe('Forced evacuation');
    expect(alarmAt(p, null)).toBeNull();
  });
});

describe('ICS simulator', () => {
  it('every scenario is well formed (one best option per phase, best leads on decision quality)', () => {
    for (const s of SCENARIOS) expect(scenarioProblems(s)).toEqual([]);
    expect(SCENARIOS.map((s) => s.id)).toEqual(['mm-flood', 'mm-quake', 'mm-surge']);
  });
  it('every scenario LGU is in Metro Manila', () => {
    for (const s of SCENARIOS) for (const c of s.lgus) expect(lguOf(METRO_MANILA, c)).not.toBeNull();
  });
  it('timeliness holds for the first half of the time, then falls to 60%; intel and hints cost points', () => {
    const o = SCENARIOS[0]!.phases[0]!.opts[0]!;
    expect(scoreDecision(o, 30, 120, { intel: false, hint: false, expert: false }).time).toBe(o.s[4]);
    expect(scoreDecision(o, 120, 120, { intel: false, hint: false, expert: false }).time).toBe(Math.round(o.s[4] * 0.6));
    expect(scoreDecision(o, 30, 120, { intel: true, hint: true, expert: true }).time).toBe(o.s[4] - 7);
  });
  it('a run of best answers is Exemplary; a timeout is scored as unsafe', () => {
    const picks = SCENARIOS[0]!.phases.map((p, i) => {
      const best = p.opts.find((o) => o.v === 'best')!;
      return pickFor(i, p, best, scoreDecision(best, 10, 120, { intel: false, hint: false, expert: false }), 10, { intel: false, hint: false, timeout: false }, 'ic');
    });
    expect(band(metrics(picks).total)).toBe('Exemplary');
    const t = pickFor(0, SCENARIOS[0]!.phases[0]!, TIMEOUT_OPTION, scoreDecision(TIMEOUT_OPTION, 120, 120, { intel: false, hint: false, expert: false }), 120, { intel: false, hint: false, timeout: true }, 'ic');
    expect(t.verdict).toBe('unsafe');
    expect(metrics([t]).total).toBeLessThan(55);
  });
  it('names the instruments behind a decision', () => {
    const refs = doctrineFor('Request hosting through the MMDRRMC and the CCCM cluster', 'RA 10121 Sec. 16');
    expect(refs).toContain('NDRRMC MC No. 4, s. 2012 (ICS)');
    expect(refs).toContain('RA 10121 (DRRM Act)');
    expect(refs.some((r) => r.includes('MMDRRMC'))).toBe(true);
  });
  it('moves the tabletop spotlight round the table and shuffles without losing options', () => {
    expect(spotlight('single', 'osc', 3)).toBe('osc');
    expect(spotlight('tabletop', 'ic', 1)).toBe('osc');
    expect(ROLES.map((r) => r.id)).toContain(spotlight('tabletop', 'ro', 5));
    const xs = [1, 2, 3, 4];
    expect(shuffled(xs, () => 0.5).sort()).toEqual(xs);
  });
});

describe('ECHO', () => {
  const plan = (o: Partial<LguPlan>): LguPlan => ({ psgc: '137402000', name: 'Marikina', group: 'eastern', displaced: null, female: null, children: null, older: null, pwd: null, coveredM2: null, waterLpd: null, toilets: null, ...o });
  it('treats a blank as not reported, never zero', () => {
    expect(parseWhole('')).toBeNull();
    expect(parseWhole('1,200')).toBe(1200);
    expect(parseWhole('12.5')).toBe('invalid');
    expect(waterCheck(1000, null).meetsSphere).toBeNull();
  });
  it('checks space, water and toilets against their own sources', () => {
    expect(spaceCheck(100, 350).meets).toBe(true);
    expect(spaceCheck(100, 349).meets).toBe(false);
    const r = assessLgu(plan({ displaced: 1200, coveredM2: 2800, waterLpd: 15000, toilets: 10, older: 50, pwd: 10 }), 'short');
    expect(r.capacity).toBe(800);
    expect(r.shortfall).toBe(400);
    expect(r.toiletsNeeded).toBe(24);
    expect(r.findings.map((f) => f.title)).toEqual(['Not enough covered space', 'Water below the Sphere planning figure', 'Too few toilets']);
  });
  it('flags counts that exceed the total', () => {
    expect(assessLgu(plan({ displaced: 100, female: 120, older: 0, pwd: 0 }), 'short').findings.some((f) => f.title === 'Figures do not add up')).toBe(true);
  });
  it('suggests hosts only within the same district, largest spare first, and counts who is left without space', () => {
    const rs = [
      assessLgu(plan({ displaced: 1200, coveredM2: 2800 }), 'short'),                                                 // short 400
      assessLgu(plan({ psgc: '137403000', name: 'Pasig', displaced: 100, coveredM2: 1050 }), 'short'),                // spare 200
      assessLgu(plan({ psgc: '137404000', name: 'Quezon City', displaced: 0, coveredM2: 3500 }), 'short'),           // spare 1000
      assessLgu(plan({ psgc: '137602000', name: 'Makati', group: 'southern', displaced: 0, coveredM2: 35000 }), 'short'), // other district
    ];
    const h = hostSuggestions(rs);
    expect(h).toEqual([{ from: 'Marikina', to: 'Quezon City', persons: 400, group: 'eastern' }]);
    expect(totals(rs, h).unhoused).toBe(0);
  });
  it('estimates movement time', () => {
    expect(movementHours(1200, 12, 20, 60)).toBe(5);
    expect(movementHours(1200, 0, 20, 60)).toBeNull();
  });
});

describe('Sub-regional flood watch', () => {
  const area = (id: string, code: string | null, pct: number): FloodArea => ({ id, adm4_pcode: code, name: `Area ${id}`, flood_hazard_pct: pct, hazard_source: 'NOAH', lat: null, lon: null });
  const o = (a: FloodArea, rain: number | null): Outlook => ({ area: a, date: '2026-11-28', rainToday: rain, todayKind: rain === null ? null : 'observed', rainPrev: 0, prevDays: 3, score: rain === null ? null : ruleScore(rain, 0, a.flood_hazard_pct) });
  const outs = [o(area('1', '137402001', 80), 300), o(area('2', '137403005', 10), 5), o(area('3', '137404009', 60), null), o(area('4', '083738001', 50), 300)];
  it('rolls areas up to LGUs and keeps unmatched areas', () => {
    const r = rollup(METRO_MANILA, watchRows(METRO_MANILA, outs));
    expect(r.find((x) => x.name === 'Marikina')).toMatchObject({ areas: 1, withRain: 1, high: 1 });
    expect(r.find((x) => x.name === 'Quezon City')).toMatchObject({ areas: 1, withRain: 0 });
    expect(r.at(-1)).toMatchObject({ name: 'Not matched to an LGU', areas: 1 });
  });
  it('lists only areas at Watch or High, and says so when there are none', () => {
    const rows = watchRows(METRO_MANILA, outs);
    const list = watchList(rows);
    expect(list.map((r) => r.o.area.id)).toEqual(['1', '4']);
    expect(watchText(METRO_MANILA, list, '2026-11-28', { product: '', at: '' })).toMatch(/1\. Area 1 \(Marikina\) \| High/);
    expect(watchText(METRO_MANILA, [], '2026-11-28', { product: '', at: '' })).toMatch(/No area at Watch or High/);
  });
  it('screens measures only with the planner\'s figures', () => {
    expect(annuity(0, 10)).toBe(10);
    const a = { assets: 0, damage: 0, events: 0, horizon: 0, discount: 0.1, om: 0.02 };
    expect(missingAssumptions(a)).toEqual(['assets exposed', 'damage share', 'events per year', 'years']);
    const full = { assets: 1000, damage: 0.2, events: 0.5, horizon: 20, discount: 0, om: 0 };
    const r = screenAll(full, [
      { id: 'a', name: 'Detention pond', type: 'grey', capital: 500, reduction: 0.3, economic: 0, social: 0 },
      { id: 'b', name: 'Riparian buffer', type: 'nbs', capital: 100, reduction: 0.1, economic: 1, social: 1 },
      { id: 'c', name: 'No cost entered', type: 'nbs', capital: 0, reduction: 0.5, economic: 0, social: 0 },
    ]);
    expect(r.map((x) => x.measure.id)).toEqual(['b', 'a']);
    expect(r[1]!.bcr).toBeCloseTo(1.2);
  });
});

describe('Contingency plan activation', () => {
  const items = [
    { item_kind: 'function' as const, item_code: 'operations', state: 'lead' as const, min_level: 'blue' as const },
    { item_kind: 'cluster' as const, item_code: 'cccm', state: 'lead' as const, min_level: 'blue' as const },
    { item_kind: 'cluster' as const, item_code: 'srr', state: 'on' as const, min_level: 'red' as const },
    { item_kind: 'cluster' as const, item_code: 'mdm', state: 'standby' as const, min_level: 'red' as const },
  ];
  it('previews with the database rule: RED items wait at BLUE; planned standby stays standby', () => {
    expect(previewAt(items, 'blue').map((i) => `${i.code}=${i.state}`)).toEqual(['cccm=lead', 'mdm=standby', 'srr=standby', 'operations=lead']);
    expect(previewAt(items, 'red').map((i) => `${i.code}=${i.state}`)).toEqual(['cccm=lead', 'mdm=standby', 'srr=on', 'operations=lead']);
  });
  it('names what an activation set is missing', () => {
    expect(setProblems([])).toEqual(['The plan has no activation set yet.']);
    const p = setProblems(items);
    expect(p.filter((x) => x.includes('EOC function'))).toHaveLength(4);
    expect(p.some((x) => x.includes('lead'))).toBe(false);
  });
});
