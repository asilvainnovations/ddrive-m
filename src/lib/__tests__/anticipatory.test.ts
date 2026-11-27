import { describe, expect, it } from 'vitest';
import { LDRRMF_AA_CEILING_SHARE, leadBandFor } from '../anticipatory';

// Mirrors ddrive_aa_action_guard (supabase/migrations/20261127010000_phase3_aa_graduated_disbursement.sql),
// which is the rule that counts; the SQL tests in supabase/tests/70_phase3_aa_graduated.sql prove it.
const onset = '2026-12-10T12:00:00+08:00';
const at = (hoursBefore: number) => new Date(new Date(onset).getTime() - hoursBefore * 3_600_000).toISOString();

describe('lead-time band (IRR of RA 12287, Rule V s. 2)', () => {
  it('puts interventions more than 3 days before onset in the 30% band', () => {
    expect(leadBandFor('ldrrmf', 'tropical_cyclone', at(72.01), onset)).toBe('beyond_3_days');
  });
  it('puts interventions exactly 3 days or less before onset in the 70% band', () => {
    expect(leadBandFor('ldrrmf', 'flood', at(72), onset)).toBe('within_3_days');
    expect(leadBandFor('ndrrmf', 'storm_surge', at(1), onset)).toBe('within_3_days');
  });
  it('does not graduate other sources', () => {
    for (const f of ['grant_donation', 'ldrrmf_special_trust_fund', 'other', 'none'] as const) {
      expect(leadBandFor(f, 'tropical_cyclone', at(100), onset)).toBe('not_graduated');
    }
  });
  it('leaves drought to the operational guidelines', () => {
    expect(leadBandFor('ldrrmf', 'drought', at(500), onset)).toBe('not_graduated');
  });
  it('cannot tell the band without an implementation time', () => {
    expect(leadBandFor('agency_budget', 'volcanic', null, onset)).toBeNull();
  });
  it('uses the 10% of 70% LDRRMF ceiling (Rule V s. 1(b))', () => {
    expect(LDRRMF_AA_CEILING_SHARE).toBeCloseTo(0.1 * 0.7, 10);
  });
});
