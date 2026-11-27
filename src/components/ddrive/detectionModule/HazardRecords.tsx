// The organisation's hazard records: alerts from the authorised agencies, synchronised by the server for the
// organisation's watch areas (ADR-010), and the field reports its own people send. Plotted on a schematic map with the
// watch points. The agency stays the authority: synchronised records follow its alert and cannot be edited here.
import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, MapPin, RefreshCw } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { Hazard } from '@/hooks/useDDriveData';
import { listWatchAreas, type WatchArea } from '@/lib/actions';
import { ago, manila, type FeedStatus } from '@/hooks/useOfficialAlerts';
import MapPreview, { LAYER_COLOURS, type PreviewLayer } from '../rapidMappingModule/MapPreview';

// The agencies DDRiVE-M reads automatically, and the one it can only link to (PHIVOLCS publishes no data feed).
export const SOURCES = [
  { agency: 'PAGASA', feed: 'PAGASA', what: 'Tropical cyclones, rainfall, thunderstorms, floods', mode: 'auto' as const },
  { agency: 'PTWC (NOAA)', feed: 'PTWC', what: 'Tsunami information for the Pacific', mode: 'auto' as const },
  { agency: 'USGS (international)', feed: 'USGS', what: 'Earthquakes, magnitude 4 and above', mode: 'auto' as const },
  { agency: 'GDACS (international)', feed: 'GDACS', what: 'Cyclones, earthquakes, floods, volcanoes', mode: 'auto' as const },
  { agency: 'PHIVOLCS', feed: null, what: 'Official earthquake, tsunami and volcano bulletins', mode: 'link' as const,
    href: 'https://www.phivolcs.dost.gov.ph/' },
];

const SEV_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const open = (h: Hazard) => h.status === 'Active' || h.status === 'Monitoring';

const HazardRecords: React.FC<{ hazards: Hazard[]; feeds: FeedStatus[]; onSelect: (h: Hazard) => void }> = ({ hazards, feeds, onSelect }) => {
  const { activeTenant } = useAuth();
  const [watch, setWatch] = useState<WatchArea[]>([]);
  const [agency, setAgency] = useState<string | null>(null);
  const [origin, setOrigin] = useState<'all' | 'official' | 'field'>('all');
  const [showClosed, setShowClosed] = useState(false);
  useEffect(() => { if (activeTenant) listWatchAreas(activeTenant.tenant_id).then(setWatch); }, [activeTenant]);

  const shown = hazards
    .filter((h) => showClosed || open(h))
    .filter((h) => origin === 'all' || h.origin === origin)
    .filter((h) => !agency || h.agency === agency)
    .sort((a, b) => Number(open(b)) - Number(open(a)) || (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)
      || b.detected_at.localeCompare(a.detected_at));

  const layers: PreviewLayer[] = useMemo(() => {
    const pts = (rows: Hazard[]) => rows.filter((h) => h.lat != null && h.lng != null).map((h) => ({
      id: String(h.id), external_feature_id: h.name.slice(0, 40), verification_status: (h.origin === 'official' ? 'verified' : 'unverified') as 'verified' | 'unverified',
      geometry: { type: 'Point' as const, coordinates: [h.lng, h.lat] as [number, number] },
      properties: { agency: h.agency, type: h.type, severity: h.severity, status: h.status, place: h.location, detected: manila(h.detected_at) },
    }));
    const live = hazards.filter(open);
    return [
      { layer: { id: 'official', name: 'Official alerts in force', layer_role: 'observed' as const }, colour: LAYER_COLOURS[1], features: pts(live.filter((h) => h.origin === 'official')) },
      { layer: { id: 'field', name: 'Field reports, open', layer_role: 'observed' as const }, colour: LAYER_COLOURS[0], features: pts(live.filter((h) => h.origin === 'field')) },
      { layer: { id: 'watch', name: 'Your watch points', layer_role: 'reference' as const }, colour: LAYER_COLOURS[2], features: watch.filter((w) => w.lat != null && w.lon != null).map((w) => ({
        id: w.id, external_feature_id: w.label, verification_status: 'verified' as const,
        geometry: { type: 'Point' as const, coordinates: [w.lon as number, w.lat as number] as [number, number] },
        properties: { radius_km: w.radius_km },
      })) },
    ];
  }, [hazards, watch]);

  const feedOf = (key: string | null) => feeds.find((f) => f.source === key);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3" role="group" aria-label="Sources of hazard records">
        {SOURCES.map((s) => {
          const count = hazards.filter((h) => h.agency === s.agency && open(h)).length;
          const f = feedOf(s.feed);
          const active = agency === s.agency;
          return (
            <GlassCard key={s.agency} hover={false} className={cn('p-4 text-xs', active && 'ring-2 ring-blue-600')}>
              <button type="button" className="text-left w-full" aria-pressed={active} disabled={s.mode === 'link'} onClick={() => setAgency(active ? null : s.agency)}>
                <p className="font-montserrat font-bold text-sm">{s.agency}</p>
                <p className="text-slate-600 dark:text-slate-300">{s.what}</p>
                {s.mode === 'auto' ? (
                  <>
                    <p className="mt-2"><span className="text-xl font-bold">{count}</span> open</p>
                    <p className="flex items-center gap-1 mt-1 text-emerald-800 dark:text-emerald-300"><RefreshCw className="w-3 h-3" aria-hidden="true" />
                      Synchronised{f ? `, read ${ago(f.lastOk)}` : ''}</p>
                  </>
                ) : <p className="mt-2 text-slate-600">No data feed published</p>}
              </button>
              {s.mode === 'link' && <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline font-semibold mt-1">Open PHIVOLCS <ExternalLink className="w-3 h-3" aria-hidden="true" /></a>}
            </GlassCard>
          );
        })}
        <GlassCard hover={false} className={cn('p-4 text-xs', origin === 'field' && 'ring-2 ring-blue-600')}>
          <button type="button" className="text-left w-full" aria-pressed={origin === 'field'} onClick={() => { setAgency(null); setOrigin(origin === 'field' ? 'all' : 'field'); }}>
            <p className="font-montserrat font-bold text-sm">Field reports</p>
            <p className="text-slate-600 dark:text-slate-300">Observed and reported by your people</p>
            <p className="mt-2"><span className="text-xl font-bold">{hazards.filter((h) => h.origin === 'field' && open(h)).length}</span> open</p>
          </button>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <GlassCard hover={false} className="p-4 lg:col-span-3">
          <MapPreview title="Hazard records and watch points" layers={layers}
            caption="Schematic map: points only, no basemap. Alert areas are named in each record. Points from official alerts are the agency's epicentre or storm position." />
        </GlassCard>

        <GlassCard hover={false} className="p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-montserrat font-bold text-lg">Hazard records{agency ? ` · ${agency}` : ''}</h3>
            <div className="flex flex-wrap gap-2 text-xs items-center">
              <select aria-label="Which records" className="rounded-lg border border-slate-300 px-2 py-1 bg-transparent" value={origin} onChange={(e) => setOrigin(e.target.value as typeof origin)}>
                <option value="all">All sources</option><option value="official">From official alerts</option><option value="field">Field reports</option>
              </select>
              <label className="flex items-center gap-1"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show resolved</label>
              {(agency || origin !== 'all') && <button type="button" className="text-blue-700 font-semibold" onClick={() => { setAgency(null); setOrigin('all'); }}>Clear</button>}
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
            Alerts in force for your watch areas are added and updated automatically every 10 minutes, and closed when the agency cancels them or they expire.
            The agency's alert is the authority; follow its instructions.
          </p>
          {shown.length === 0 && <p className="text-sm text-slate-500">{watch.length === 0 ? 'No watch areas yet: a DRRM officer adds them in Settings → Organisation, and matching alerts then appear here.' : 'No open hazard records.'}</p>}
          <ul className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {shown.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => onSelect(h)} aria-label={`${h.name}, ${h.location}: details and response actions`}
                  className={cn('w-full text-left p-3 rounded-xl border bg-white/60 dark:bg-white/5 hover:border-blue-500', open(h) ? 'border-slate-200 dark:border-slate-700' : 'border-dashed border-slate-300 opacity-80')}>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[10px] font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">{h.agency}</span>
                    <span className="px-1.5 py-0.5 rounded border border-slate-300">{h.severity}</span>
                    <span className="px-1.5 py-0.5 rounded border border-slate-300">{h.origin === 'official' ? 'Official alert, synchronised' : 'Field report'}</span>
                    {!open(h) && <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">{h.status}</span>}
                  </div>
                  <p className="font-montserrat font-bold text-sm">{h.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" /> {h.location} · {manila(h.detected_at)}</p>
                  {h.status_reason && <p className="text-xs text-slate-600 mt-1">{h.status_reason}</p>}
                </button>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </>
  );
};

export default HazardRecords;
