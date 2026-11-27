import { describe, expect, it } from 'vitest';
import { GK_ITEMS, GK_MIN_REQUIREMENTS, GK_SECTIONS, gkBand } from '@/content/gkToolkit';
import { PLAN_TEMPLATES, completeness, templateByKey } from '@/content/planTemplates';
import { CHECK_LIBRARY, FORM_TEMPLATES, LDRRMP_CERTIFICATE_CRITERIA, startingChecks } from '@/content/formsAndExercises';

describe('Gawad KALASAG toolkit CY 2026', () => {
  it('has the 32 scored items of the Summary sheet, in six sections', () => {
    expect(GK_ITEMS).toHaveLength(32);
    const per = Object.fromEntries(GK_SECTIONS.map((s) => [s.key, GK_ITEMS.filter((i) => i.section === s.key).length]));
    expect(per).toEqual({ structure: 9, competency: 15, management_systems: 3, enabling_policies: 1, knowledge_management: 2, partnership: 2 });
  });
  it('uses the toolkit weights, which add up to 1', () => {
    expect(GK_SECTIONS.map((s) => s.weight)).toEqual([0.25, 0.35, 0.15, 0.05, 0.1, 0.1]);
    expect(GK_SECTIONS.reduce((a, s) => a + s.weight, 0)).toBeCloseTo(1);
  });
  it('gives every item a 0-3 rating guide and means of verification', () => {
    for (const i of GK_ITEMS) {
      expect(new Set(i.rating_guide.map((g) => g.score))).toEqual(new Set([0, 1, 2, 3]));
      expect(i.means_of_verification.length).toBeGreaterThan(0);
      expect(i.rating_guide.every((g) => g.text.trim().length > 0)).toBe(true);
    }
  });
  it('keeps the separate provincial and city/municipal guides where the toolkit has them', () => {
    const i13 = GK_ITEMS.find((i) => i.code === '1.3')!;
    expect(i13.rating_guide.filter((g) => g.scope === 'Provinces')).toHaveLength(4);
    expect(i13.rating_guide.filter((g) => g.scope === 'Cities and municipalities')).toHaveLength(4);
  });
  it('bands the weighted mean as the Summary sheet does', () => {
    expect(gkBand(3)?.label).toBe('Gold Recognition');
    expect(gkBand(2.5)?.label).toBe('Gold Recognition');
    expect(gkBand(2.49)?.label).toBe('Silver Recognition');
    expect(gkBand(1.5)?.label).toBe('Bronze Recognition');
    expect(gkBand(0.5)?.label).toBe('Partially Compliant');
    expect(gkBand(0.49)?.label).toBe('Non-Compliant');
    expect(gkBand(null)).toBeNull();
  });
  it('lists the six minimum requirements', () => { expect(GK_MIN_REQUIREMENTS).toHaveLength(6); });
});

describe('plan templates', () => {
  it('every section cites a source, and every template says how it comes into force', () => {
    for (const t of PLAN_TEMPLATES) {
      expect(t.adoption.length).toBeGreaterThan(20);
      for (const s of t.sections) { expect(s.source.length).toBeGreaterThan(3); expect(s.guidance.length).toBeGreaterThan(10); }
    }
  });
  it('the LDRRMP follows the Memo 147 outline A to H', () => {
    const titles = templateByKey('ldrrmp')!.sections.map((s) => s.title);
    for (const p of ['A. Ecological profile', 'B. Institutional', 'C. Risk profile', 'D. Situational analysis', 'E. Thematic area plans', 'F. Monitoring and evaluation', 'G. Annexes', 'H. References']) {
      expect(titles.some((t) => t.startsWith(p))).toBe(true);
    }
  });
  it('the contingency plan protects children as RA 10821 requires', () => {
    const ids = templateByKey('contingency_plan')!.sections.map((s) => s.id);
    expect(ids).toContain('children');
    expect(templateByKey('contingency_plan')!.sections.find((s) => s.id === 'evacuation')!.guidance).toMatch(/schools/i);
  });
  it('completeness counts required sections: text from 20 characters, tables from one filled row', () => {
    const t = templateByKey('pscp')!;
    const required = t.sections.filter((s) => s.required).length;
    expect(completeness(t, {}).done).toBe(0);
    const c = completeness(t, { summary: 'A summary that is long enough to count.', bia: [{ function: 'Issue permits' }], profile: 'short' });
    expect(c.done).toBe(2);
    expect(c.total).toBe(required);
    expect(c.missing).toContain('Agency profile');
  });
});

describe('forms and exercises', () => {
  it('the Certificate of Review has Memo 147\'s four criteria', () => { expect(LDRRMP_CERTIFICATE_CRITERIA).toHaveLength(4); });
  it('the initial report asks the SOPG\'s what, when, where, why, who, how and initial steps', () => {
    const ids = FORM_TEMPLATES.find((f) => f.key === 'initial_report')!.fields.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['what', 'occurred_at', 'where', 'why', 'who', 'how', 'initial_steps']));
  });
  it('every check in the library cites its standard', () => { expect(CHECK_LIBRARY.every((c) => c.source.length > 5)).toBe(true); });
  it('an exercise of a plan starts with an objective, an assumption and the relevant capabilities', () => {
    const cp = startingChecks('contingency_plan');
    expect(cp.some((c) => c.kind === 'objective')).toBe(true);
    expect(cp.some((c) => c.kind === 'assumption')).toBe(true);
    expect(cp.some((c) => c.statement.startsWith('Initial report within two hours'))).toBe(true);
    expect(new Set(cp.map((c) => c.statement)).size).toBe(cp.length);
  });
});
