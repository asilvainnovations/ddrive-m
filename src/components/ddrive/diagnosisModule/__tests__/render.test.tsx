// Server-side render checks for the Diagnosis reports and the official-alerts risk panel.
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { Entry } from '@/lib/ddriveAssessment/api';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ can: () => true, user: { id: 'u' }, activeTenant: { tenant_id: 't' } }) }));
vi.mock('@/components/ui/sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const { DataScores, MatrixCounts } = await import('../Reports');

const e = (over: Partial<Entry>): Entry => ({
  id: Math.random().toString(36).slice(2), assessment_id: 'a', sort_order: 0, family_code: 'H3', main_hazard: 'Tropical Cyclone', hazard_event: 'Wind',
  exposure: 10, v_infrastructure: 9, v_productive: 9, v_services: 9, v_social: 9, response: 5, comments: null,
  total_vulnerability: 90, likelihood: 9, severity: 40, likelihood_level: 'Very High', severity_class: 'Moderate', risk_code: 'H7', risk_rank: 7, risk_id: null, ...over,
});

describe('Diagnosis reports', () => {
  const entries = [
    e({}),
    e({ hazard_event: 'Storm Surge', likelihood: 8, severity: 60, likelihood_level: 'High', severity_class: 'Major', risk_code: 'H7' }),
    e({ family_code: 'H2', main_hazard: 'Flood', hazard_event: 'Riverine Flood', likelihood: 8, severity: 40, likelihood_level: 'High', risk_code: 'M6', risk_rank: 6 }),
    e({ family_code: 'H1', main_hazard: 'Earthquake', hazard_event: 'Tsunami', exposure: null, risk_code: null, likelihood: null, severity: null, total_vulnerability: null }),
  ];
  it('counts hazard events per matrix cell, with the code always written', () => {
    const html = renderToStaticMarkup(<MatrixCounts entries={entries} />);
    expect(html).toContain('Moderate severity, Very High likelihood: H7, 1 hazard event');
    expect(html).toContain('Major severity, High likelihood: H7, 1 hazard event');
    expect(html).toContain('Moderate severity, High likelihood: M6, 1 hazard event');
    expect(html).toContain('VH9');
  });
  it('lists data scores by family with the family severity total, and marks unscored rows', () => {
    const html = renderToStaticMarkup(<DataScores entries={entries} />);
    expect(html).toContain('Total severity for Meteorological');
    expect(html).toContain('>100<');           // 40 + 60
    expect(html).toContain('not scored');
  });
});

describe('Detection risk panel', () => {
  const row = {
    alert_id: 'al', assessment_id: 'as1', assessment_ref: 'HA-002', assessment_title: 'Tacloban City coastal barangays', approved_at: '2026-11-20T02:00:00Z',
    entry_id: 'e1', main_hazard: 'Tropical Cyclone', hazard_event: 'Wind', risk_code: 'H7', risk_rank: 7, likelihood: 9, likelihood_level: 'Very High',
    severity: 40, severity_class: 'Moderate', total_vulnerability: 90, exposure: 10, v_infrastructure: 9, v_productive: 9, v_services: 9, v_social: 9, response: 5, risk_id: null,
  };
  it('shows the assessed rating, vulnerability and response measures beside an alert, with its source', async () => {
    const { RiskPanel } = await import('../../detectionModule/OfficialAlerts');
    const html = renderToStaticMarkup(<MemoryRouter><RiskPanel rows={[row]} /></MemoryRouter>);
    expect(html).toContain('Your assessed risk for this hazard');
    expect(html).toContain('<strong>H7</strong> (High)');
    expect(html).toContain('total vulnerability 90/100');
    expect(html).toContain('reasonable measures in place');
    expect(html).toContain('HA-002 Tacloban City coastal barangays');
    expect(html).toContain('not a forecast');
  });
  it('says plainly when no approved assessment rated the hazard', async () => {
    const { RiskPanel } = await import('../../detectionModule/OfficialAlerts');
    const html = renderToStaticMarkup(<MemoryRouter><RiskPanel rows={[]} /></MemoryRouter>);
    expect(html).toContain('have not rated this hazard');
    expect(html).toContain('href="/diagnosis"');
  });
});
