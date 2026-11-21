import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { score, scenarioScore, matrixCode, scaleWord, FAMILIES, ALL_PERILS, eventsFor } from '../scoring';
import { TEMPLATES } from '../templates';
import { readDdriveWorkbook, scaleValue, excelDate } from '../workbookImport';
import catalogue from '../catalogue.json';
import glossary from '../glossary.json';

const s = (e: number, v: [number, number, number, number], r: number, m: 'workbook' | 'continuous' = 'workbook') =>
  score(m, { exposure: e, v_infrastructure: v[0], v_productive: v[1], v_services: v[2], v_social: v[3], response: r });

// The same cases as supabase/tests/50_phase3_ddrive_assessment.sql: the workbook's case study (Instructions rows 144–149).
describe('scoring matches the DDRiVE workbook', () => {
  it.each([
    ['Riverine flood', 9, [8, 8, 8, 8], 4, 80, 8, 40, 'M6'],
    ['Flash flood', 9, [9, 9, 9, 8], 4, 87.5, 8, 40, 'M6'],
    ['Landslide', 7, [7, 5, 6, 5], 3, 57.5, 5, 20, 'L4'],
    ['Coastal flood', 9, [9, 9, 9, 8], 1, 87.5, 8, 70, 'H7'],
    ['Tropical cyclone wind', 10, [9, 9, 9, 9], 5, 90, 9, 40, 'H7'],
    ['Storm surge', 9, [10, 9, 9, 9], 2, 92.5, 8, 60, 'H7'],
  ] as const)('%s', (_n, e, v, r, tv, lr, sr, code) => {
    const x = s(e, v as unknown as [number, number, number, number], r)!;
    expect([x.total_vulnerability, x.likelihood, x.severity, x.risk_code]).toEqual([tv, lr, sr, code]);
  });
  it('treats severity at or below zero as VL1', () => {
    expect(s(3, [2, 2, 2, 2], 9)).toMatchObject({ severity: -70, severity_class: 'Below threshold', risk_code: 'VL1' });
  });
  it('waits for every input', () => {
    expect(score('workbook', { exposure: 9, v_infrastructure: 8, v_productive: null, v_services: 8, v_social: 8, response: 4 })).toBeNull();
    expect(score('workbook', { exposure: 11, v_infrastructure: 8, v_productive: 8, v_services: 8, v_social: 8, response: 4 })).toBeNull();
  });
  it('offers the continuous method the Instructions describe', () => {
    expect(s(9, [8, 8, 8, 8], 4, 'continuous')).toMatchObject({ likelihood: 8.5, severity: 45, risk_code: 'H7' });
    expect(s(10, [10, 10, 10, 10], 0, 'continuous')!.risk_code).toBe('VH9');
  });
  it('reproduces the matrix table of the Risk Matrix sheet', () => {
    const sheet = [['VL1', 'VL2', 'L3', 'L4', 'M5'], ['VL2', 'L3', 'L4', 'M5', 'M6'], ['L3', 'L4', 'M5', 'M6', 'H7'], ['L4', 'M5', 'M6', 'H7', 'H8'], ['M5', 'M6', 'H7', 'H8', 'VH9']];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) expect(matrixCode(r, c)).toBe(sheet[r][c]);
  });
});

describe('scenarios match the worked examples (Instructions rows 166–192)', () => {
  it('a single event keeps its severity: H8', () => {
    expect(scenarioScore([{ family_code: 'H2', likelihood: 8.5, severity: 65 }])).toMatchObject({ likelihood: 8.5, severity: 65, risk_code: 'H8' });
  });
  it('two events in one family: M5', () => {
    expect(scenarioScore([{ family_code: 'H3', likelihood: 4, severity: 5 }, { family_code: 'H3', likelihood: 7, severity: 40 }]))
      .toMatchObject({ likelihood: 5.5, severity: 30, risk_code: 'M5' });
  });
  it('events across families: H7', () => {
    expect(scenarioScore([
      { family_code: 'H1', likelihood: 6.5, severity: 45 }, { family_code: 'H1', likelihood: 7.5, severity: 60 },
      { family_code: 'H2', likelihood: 8.5, severity: 65 },
    ])).toMatchObject({ likelihood: 7.5, severity: 64.75, risk_code: 'H7' });
  });
});

describe('catalogue, glossary and templates', () => {
  it('has the workbook families and every listed event', () => {
    expect(FAMILIES.map((f) => f.code)).toEqual(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8']);
    expect(ALL_PERILS).toHaveLength(60);
    expect(new Set(FAMILIES.flatMap((f) => f.events))).toEqual(new Set(ALL_PERILS));
  });
  it('is the same list the migration seeds', () => {
    const sql = readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261122020000_phase3_ddrive_assessment.sql'), 'utf8');
    const rows = [...sql.matchAll(/\('(H[1-8])', '[^']+', '(main|event)', '((?:[^']|'')+)'\)/g)].map((m) => `${m[1]}|${m[2]}|${m[3].replace(/''/g, "'")}`);
    const json = catalogue.families.flatMap((f) => [...f.mainHazards.map((m) => `${f.code}|main|${m}`), ...f.events.map((e) => `${f.code}|event|${e}`)]);
    expect(rows.sort()).toEqual(json.sort());
  });
  it('keeps the scale words', () => {
    expect(scaleWord('exposure', 9)).toBe('Extremely likely');
    expect(scaleWord('response', 10)).toBe('Complete control of disaster');
  });
  it('has glossary definitions for the main hazards', () => {
    const terms = glossary.terms.map((t) => t.term.toLowerCase());
    for (const h of ['earthquake', 'tropical cyclone', 'flood', 'storm surge', 'landslide following earthquake']) expect(terms).toContain(h);
  });
  it('templates use only catalogue names', () => {
    for (const t of TEMPLATES) for (const r of t.rows) {
      const fam = FAMILIES.find((f) => f.code === r.family_code)!;
      expect(fam.mainHazards, `${t.key}: ${r.main_hazard}`).toContain(r.main_hazard);
      expect(eventsFor(r.family_code), `${t.key}: ${r.hazard_event}`).toContain(r.hazard_event);
    }
  });
});

describe('workbook import', () => {
  it('reads labels, dates and the Hazard Data Entry layout', () => {
    expect(scaleValue('9-Extremely likely')).toBe(9);
    expect(scaleValue('10-Inevitable')).toBe(10);
    expect(scaleValue('Likely')).toBeNull();
    expect(excelDate('42822')).toBe('2017-03-28');
  });
  it('imports the sample workbook and explains what it skipped', () => {
    const r = readDdriveWorkbook(readFileSync(resolve(__dirname, 'fixtures/ddrive-sample.xlsx')));
    expect(r.info).toMatchObject({ title: 'City of Mackay (case study)', assessor: 'Workshop facilitator', completed_on: '2017-03-28', review: 'v1' });
    expect(r.entries.map((e) => `${e.family_code}:${e.hazard_event}`)).toEqual([
      'H1:Fire following event', 'H2:Riverine Flood', 'H2:Flash Flood', 'H2:Landslide following event', 'H2:Coastal Flood',
      'H3:Wind', 'H3:Storm Surge', 'H8:Rain',
    ]);
    const flood = r.entries.find((e) => e.hazard_event === 'Riverine Flood')!;
    expect(flood).toMatchObject({ exposure: 9, v_infrastructure: 8, response: 4, comments: 'Pioneer River floods' });
    expect(score('workbook', flood)!.risk_code).toBe('M6');
    expect(r.entries.find((e) => e.hazard_event === 'Fire following event')!.v_productive).toBeNull();
    expect(r.skipped.map((x) => x.row)).toEqual([18, 50]);
  });
  it('refuses other files plainly', () => {
    expect(() => readDdriveWorkbook(new TextEncoder().encode('not a zip'))).toThrow(/not an Excel workbook/);
  });
  const real = process.env.DDRIVE_XLSM;
  it.runIf(Boolean(real && existsSync(real)))('reads the real DDRiVE_Diagnosis_Tool.xlsm', () => {
    const r = readDdriveWorkbook(readFileSync(real!));
    expect(r.entries.length).toBeGreaterThan(0);
    expect(r.entries[0]).toMatchObject({ family_code: 'H1', main_hazard: 'Mass Movement', hazard_event: 'Fire following event', exposure: 9 });
  });
});
