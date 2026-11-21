// Server-side render checks: the map preview and status labels render, and never rely on colour alone.
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ can: () => true, user: { id: 'u' }, activeTenant: { tenant_id: 't' } }) }));
vi.mock('@/components/ui/sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

import type { Geometry } from '@/lib/rapidMapping/types';

const { default: MapPreview } = await import('../MapPreview');
const { StatusBadge, Disclaimer } = await import('../ui');

const aoi = { name: 'Riverside', geometry: { type: 'MultiPolygon', coordinates: [[[[124.6, 11], [124.62, 11], [124.62, 11.02], [124.6, 11.02], [124.6, 11]]]] } as Geometry };
const layer = {
  layer: { id: 'l1', name: 'Flooded streets', layer_role: 'observed' as const }, colour: '#0072B2',
  features: [
    { id: 'f1', external_feature_id: 's1', geometry: { type: 'LineString' as const, coordinates: [[124.605, 11.005], [124.61, 11.006]] as [number, number][] }, properties: { name: '<script>alert(1)</script>' }, verification_status: 'unverified' as const },
    { id: 'f2', external_feature_id: 'p1', geometry: { type: 'Point' as const, coordinates: [124.61, 11.01] as [number, number] }, properties: {}, verification_status: 'verified' as const },
  ],
};

describe('MapPreview', () => {
  it('draws the AOI, the layer, a legend, a north arrow, a scale bar and the watermark', () => {
    const html = renderToStaticMarkup(<MapPreview title="M-001-FEP-MP-001 v1" aoi={aoi} layers={[layer]} watermark="PRELIMINARY" />);
    expect(html).toContain('role="img"');
    expect(html).toMatch(/aria-label="M-001-FEP-MP-001 v1\. Schematic map without basemap: area of interest Riverside, 1 layer, 2 features\."/);
    expect(html).toContain('Flooded streets (Observed, 2)');
    expect(html).toContain('PRELIMINARY');
    expect(html).toContain('>N</text>');
    expect(html).toMatch(/\d+ (m|km)<\/text>/);
    expect(html).toContain('stroke-dasharray="5 3"');     // unverified line is dashed
    expect(html).toContain('Dashed / hollow = unverified');
    expect(html).not.toContain('<script>');
  });
  it('says so when there is nothing to draw', () => {
    expect(renderToStaticMarkup(<MapPreview title="x" layers={[]} />)).toContain('Nothing to show on the map yet.');
  });
});

describe('status labels', () => {
  it('writes the status out, and marks unverified publications PRELIMINARY', () => {
    expect(renderToStaticMarkup(<StatusBadge status="published" level="preliminary" />)).toContain('Published · PRELIMINARY');
    expect(renderToStaticMarkup(<StatusBadge status="published" level="verified" />)).toContain('Published · verified');
    expect(renderToStaticMarkup(<StatusBadge status="for_field_verification" />)).toContain('needs field verification');
  });
  it('shows the right disclaimer', () => {
    expect(renderToStaticMarkup(<Disclaimer version={{ status: 'published', publication_level: 'preliminary' }} />)).toContain('PRELIMINARY — FOR OPERATIONAL');
    expect(renderToStaticMarkup(<Disclaimer version={{ status: 'published', publication_level: 'verified' }} />)).toContain('VERIFIED FOR THE STATED PURPOSE');
  });
});
