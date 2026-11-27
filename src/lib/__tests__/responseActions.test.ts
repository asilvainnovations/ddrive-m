import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
import { priorityFor, sourceText, type ResponseAction } from '../responseActions';

const base = { ddrive_risks: null, ddrive_hazard_assessment_entries: null, ddrive_official_alerts: null, ddrive_hazards: null } as unknown as ResponseAction;

describe('priorityFor', () => {
  it('follows the register level', () => {
    expect(priorityFor('Critical')).toBe('critical');
    expect(priorityFor('High')).toBe('high');
    expect(priorityFor('Medium')).toBe('medium');
    expect(priorityFor('Low')).toBe('low');
  });
  it('follows the DDRiVE rating when there is no level', () => {
    expect(priorityFor(null, 'VH9')).toBe('critical');
    expect(priorityFor(null, 'H7')).toBe('high');
    expect(priorityFor(null, 'M6')).toBe('medium');
    expect(priorityFor(null, 'L2')).toBe('low');
    expect(priorityFor(null, 'VL1')).toBe('low');
  });
  it('defaults to medium', () => {
    expect(priorityFor(undefined, undefined)).toBe('medium');
  });
});

describe('sourceText', () => {
  it('names the assessed hazard event and its rating first', () => {
    expect(sourceText({ ...base, ddrive_hazard_assessment_entries: { hazard_event: 'Storm Surge', main_hazard: 'Tropical cyclone', risk_code: 'H7' },
      ddrive_risks: { ref: 'R-004', title: 'x', level: 'High', ddrive_risk_code: 'H7' } }))
      .toBe('DDRiVE assessment: Storm Surge (Tropical cyclone), rated H7');
  });
  it('names a register risk', () => {
    expect(sourceText({ ...base, ddrive_risks: { ref: 'R-004', title: 'EOC loses power', level: 'High', ddrive_risk_code: null } }))
      .toBe('Risk R-004 EOC loses power, High');
  });
  it('names a wind signal from an alert', () => {
    expect(sourceText({ ...base, ddrive_official_alerts: { source: 'PAGASA', event: 'Tropical Cyclone Wind Signal', headline: null, signal_level: 3 } }))
      .toBe('PAGASA alert: Wind Signal No. 3');
  });
  it('names a hazard report, or a direct entry', () => {
    expect(sourceText({ ...base, ddrive_hazards: { name: 'Landslide', location: 'Brgy. Lake Danao', severity: 'High' } }))
      .toBe('Hazard report: Landslide, Brgy. Lake Danao');
    expect(sourceText(base)).toBe('Entered directly');
  });
});
