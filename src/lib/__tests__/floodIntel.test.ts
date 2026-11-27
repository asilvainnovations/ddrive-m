import { describe, expect, it } from 'vitest';
import rule from '@/content/flood-rule-v1.json';
import { FloodArea, Rainfall, areasFromCsv, outlook, parseCsv, rainfallFromCsv, ruleScore } from '@/lib/floodIntel';

describe('flood rule', () => {
  it('matches the golden cases shared with the Python pipeline', () => {
    for (const g of rule.golden) {
      const s = ruleScore(g.rain_today_mm, g.rain_prev_mm, g.flood_hazard_pct);
      expect(s.pDanger).toBeCloseTo(g.p_danger, 9);
      expect(s.pWarning).toBeCloseTo(g.p_warning, 9);
      expect(s.level).toBe(g.level);
    }
  });
  it('lowers the thresholds with flood hazard, but not below 40%', () => {
    expect(ruleScore(0, 0, 50).dangerMm).toBe(75);
    expect(ruleScore(0, 0, 95).dangerMm).toBe(60);
    expect(ruleScore(0, 0, 95).warningMm).toBe(32);
  });
});

const areas: FloodArea[] = [
  { id: 'a', adm4_pcode: 'PH083738001', name: 'Brgy. 5', flood_hazard_pct: 50, hazard_source: 'x', lat: null, lon: null },
  { id: 'b', adm4_pcode: null, name: 'Brgy. 6', flood_hazard_pct: 0, hazard_source: 'x', lat: null, lon: null },
];
const r = (area_id: string, obs_date: string, rain_mm: number, kind: 'observed' | 'forecast' = 'observed'): Rainfall => ({ id: `${area_id}${obs_date}${kind}`, area_id, obs_date, rain_mm, kind, source: 's' });

describe('outlook', () => {
  it('uses the day\'s observation, else its forecast, and the observed rain of the 3 days before', () => {
    const o = outlook(areas, [r('a', '2026-11-24', 60), r('a', '2026-11-25', 30), r('a', '2026-11-26', 20), r('a', '2026-11-27', 80, 'forecast')], '2026-11-27');
    expect(o[0]).toMatchObject({ rainToday: 80, todayKind: 'forecast', rainPrev: 110, prevDays: 3 });
    expect(o[0].score?.level).toBe('danger');      // 80 mm against 75 mm adjusted danger threshold, soaked ground
    expect(o[0].score?.bonus).toBe(true);
  });
  it('gives no score without rainfall for the day: no reading is not "no rain"', () => {
    const o = outlook(areas, [r('b', '2026-11-26', 50)], '2026-11-27');
    expect(o[1]).toMatchObject({ rainToday: null, score: null, prevDays: 1, rainPrev: 50 });
  });
});

describe('CSV import', () => {
  it('reads quoted fields', () => {
    expect(parseCsv('name,pct\r\n"Brgy. 5, Poblacion",3\n')).toEqual([{ name: 'Brgy. 5, Poblacion', pct: '3' }]);
  });
  it('reads Project CCHAIN\'s hazard columns', () => {
    const { rows, problems } = areasFromCsv('adm4_pcode,pct_area_flood_hazard_100yr_high\nPH015518001,2.4657\nPH015518002,abc\n');
    expect(rows).toEqual([{ adm4_pcode: 'PH015518001', name: 'PH015518001', flood_hazard_pct: 2.47, lat: null, lon: null }]);
    expect(problems).toHaveLength(1);
  });
  it('matches rainfall to areas by code or name, and reports the rest', () => {
    const { rows, problems } = rainfallFromCsv('adm4_pcode,name,date,pr,kind\nPH083738001,,2026-11-26,12.5,\n,Brgy. 6,2026-11-27,40,forecast\nPH000,,2026-11-27,1,\n', areas);
    expect(rows).toEqual([{ area_id: 'a', obs_date: '2026-11-26', rain_mm: 12.5, kind: 'observed' }, { area_id: 'b', obs_date: '2026-11-27', rain_mm: 40, kind: 'forecast' }]);
    expect(problems[0]).toMatch(/no flood area PH000/);
  });
});
