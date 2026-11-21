// A schematic map: AOI outline and product layers drawn as SVG, with legend, scale bar and north arrow.
// No basemap and no tile provider, so it works offline and on low-end phones (ADR-004). It is a preview for
// checking geometry and for briefings, not a replacement for a GIS.
import React, { useMemo, useState } from 'react';
import type { BBox, Geometry, Layer, StoredFeature } from '@/lib/rapidMapping/types';
import { FEATURE_VERIFICATION_LABEL, LAYER_ROLE_LABEL } from '@/lib/rapidMapping/types';
import { mergeBbox, positions } from '@/lib/rapidMapping/geometry';

// Colour-blind-safe palette (Okabe–Ito). Shapes and dashes carry meaning too; colour only tells layers apart.
export const LAYER_COLOURS = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#000000'];
const MAX_DRAWN = 5000;
const W = 640;
const H = 420;
const PAD = 24;

export interface PreviewLayer {
  layer: Pick<Layer, 'id' | 'name' | 'layer_role'>;
  colour: string;
  features: Pick<StoredFeature, 'id' | 'geometry' | 'properties' | 'verification_status' | 'external_feature_id'>[];
}

function bboxOf(g: Geometry): BBox {
  const ps = positions(g);
  let b: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of ps) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)];
  return b;
}

/** Equirectangular projection fitted to the extent, with the longitude scaled by cos(latitude). */
function projector(b: BBox) {
  const midLat = ((b[1] + b[3]) / 2) * (Math.PI / 180);
  const kx = Math.cos(midLat);
  const spanX = Math.max((b[2] - b[0]) * kx, 1e-6);
  const spanY = Math.max(b[3] - b[1], 1e-6);
  const s = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
  const ox = (W - spanX * s) / 2;
  const oy = (H - spanY * s) / 2;
  return {
    p: ([x, y]: number[]) => [ox + (x - b[0]) * kx * s, H - oy - (y - b[1]) * s] as [number, number],
    // Metres per SVG unit (1° latitude ≈ 111.32 km).
    metresPerUnit: 111_320 / s,
  };
}

const path = (rings: number[][][], p: (c: number[]) => [number, number], close: boolean) =>
  rings.map((r) => r.map((c, i) => `${i ? 'L' : 'M'}${p(c).map((n) => n.toFixed(1)).join(' ')}`).join('') + (close ? 'Z' : '')).join('');

function Shape({ g, p, colour, dashed, onSelect, label }: {
  g: Geometry; p: (c: number[]) => [number, number]; colour: string; dashed: boolean; onSelect?: () => void; label?: string;
}) {
  const common = {
    stroke: colour, strokeWidth: 2, strokeDasharray: dashed ? '5 3' : undefined,
    onClick: onSelect, style: onSelect ? { cursor: 'pointer' } : undefined,
    'aria-label': label,
  };
  switch (g.type) {
    case 'Point':
    case 'MultiPoint': {
      const pts = g.type === 'Point' ? [g.coordinates] : g.coordinates;
      return <g {...common} fill={dashed ? '#fff' : colour}>{pts.map((c, i) => { const [x, y] = p(c); return <circle key={i} cx={x} cy={y} r={5} />; })}</g>;
    }
    case 'LineString': return <path {...common} fill="none" d={path([g.coordinates], p, false)} />;
    case 'MultiLineString': return <path {...common} fill="none" d={path(g.coordinates, p, false)} />;
    case 'Polygon': return <path {...common} fill={colour} fillOpacity={0.18} fillRule="evenodd" d={path(g.coordinates, p, true)} />;
    case 'MultiPolygon': return <path {...common} fill={colour} fillOpacity={0.18} fillRule="evenodd" d={g.coordinates.map((poly) => path(poly, p, true)).join('')} />;
  }
}

function niceScale(metresPerUnit: number) {
  const target = metresPerUnit * 120;   // about 120 SVG units wide
  const pow = 10 ** Math.floor(Math.log10(target));
  const m = [1, 2, 5, 10].map((k) => k * pow).reverse().find((v) => v <= target) ?? pow;
  return { metres: m, units: m / metresPerUnit, label: m >= 1000 ? `${m / 1000} km` : `${m} m` };
}

const MapPreview: React.FC<{
  title: string;
  aoi?: { name: string; geometry: Geometry } | null;
  layers: PreviewLayer[];
  watermark?: string | null;
  caption?: string;
}> = ({ title, aoi, layers, watermark, caption }) => {
  const [picked, setPicked] = useState<{ layer: string; f: PreviewLayer['features'][number] } | null>(null);
  const total = layers.reduce((n, l) => n + l.features.length, 0);

  const extent = useMemo(() => {
    let b: BBox | null = aoi ? bboxOf(aoi.geometry) : null;
    for (const l of layers) for (const f of l.features.slice(0, MAX_DRAWN)) b = mergeBbox(b, bboxOf(f.geometry));
    return b;
  }, [aoi, layers]);

  if (!extent) {
    return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 text-center">Nothing to show on the map yet.</p>;
  }
  const { p, metresPerUnit } = projector(extent);
  const scale = niceScale(metresPerUnit);
  let drawn = 0;

  return (
    <figure className="space-y-2">
      <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
             aria-label={`${title}. Schematic map without basemap: ${aoi ? `area of interest ${aoi.name}, ` : ''}${layers.length} layer${layers.length === 1 ? '' : 's'}, ${total} feature${total === 1 ? '' : 's'}.`}>
          <rect x={0} y={0} width={W} height={H} fill="transparent" />
          {aoi && <Shape g={aoi.geometry} p={p} colour="#334155" dashed={false} label={`Area of interest ${aoi.name}`} />}
          {layers.map((l) => (
            <g key={l.layer.id}>
              {l.features.map((f) => {
                if (drawn >= MAX_DRAWN) return null;
                drawn += 1;
                return <Shape key={f.id} g={f.geometry} p={p} colour={l.colour}
                              dashed={f.verification_status === 'unverified' || f.verification_status === 'disputed'}
                              onSelect={() => setPicked({ layer: l.layer.name, f })} />;
              })}
            </g>
          ))}
          {watermark && (
            <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={40} fontWeight={700} fill="#b45309" opacity={0.18}
                  transform={`rotate(-20 ${W / 2} ${H / 2})`} aria-hidden="true">{watermark}</text>
          )}
          {/* North arrow */}
          <g transform={`translate(${W - 34}, 22)`} aria-hidden="true">
            <path d="M10 0 L18 22 L10 17 L2 22 Z" fill="#0f172a" />
            <text x={10} y={36} textAnchor="middle" fontSize={12} fontWeight={700} fill="#0f172a">N</text>
          </g>
          {/* Scale bar */}
          <g transform={`translate(${PAD}, ${H - 18})`} aria-hidden="true">
            <rect x={0} y={0} width={scale.units} height={5} fill="#0f172a" />
            <rect x={scale.units / 2} y={0} width={scale.units / 2} height={5} fill="#fff" stroke="#0f172a" />
            <text x={scale.units + 6} y={6} fontSize={11} fill="#0f172a">{scale.label}</text>
          </g>
        </svg>
      </div>
      <figcaption className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
          {aoi && <li className="flex items-center gap-1"><span className="inline-block w-4 h-3 border-2 border-slate-700" aria-hidden="true" /> Area of interest: {aoi.name}</li>}
          {layers.map((l) => (
            <li key={l.layer.id} className="flex items-center gap-1">
              <span className="inline-block w-4 h-3 rounded-sm" style={{ background: l.colour }} aria-hidden="true" />
              {l.layer.name} ({LAYER_ROLE_LABEL[l.layer.layer_role]}, {l.features.length})
            </li>
          ))}
          <li className="flex items-center gap-1"><svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke="#334155" strokeWidth="2" strokeDasharray="5 3" /></svg> Dashed / hollow = unverified</li>
        </ul>
        <p>EPSG:4326. Schematic preview without basemap; scale is approximate. {caption}</p>
        {total > MAX_DRAWN && <p>Showing the first {MAX_DRAWN.toLocaleString()} of {total.toLocaleString()} features. Export the data to see all of it in a GIS.</p>}
      </figcaption>
      {picked && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs" aria-live="polite">
          <div className="flex justify-between gap-2">
            <p className="font-semibold">{picked.layer} · {picked.f.external_feature_id ?? picked.f.id.slice(0, 8)} · {FEATURE_VERIFICATION_LABEL[picked.f.verification_status]}</p>
            <button type="button" className="underline" onClick={() => setPicked(null)}>Close</button>
          </div>
          {/* Properties are untrusted text: rendered as text, never as HTML (spec §6.5). */}
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {Object.entries(picked.f.properties ?? {}).slice(0, 25).map(([k, v]) => (
              <React.Fragment key={k}><dt className="text-slate-500">{k}</dt><dd className="break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></React.Fragment>
            ))}
          </dl>
        </div>
      )}
    </figure>
  );
};

export default MapPreview;
