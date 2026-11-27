// UP NOAH "Know Your Hazards" on the Dashboard (ADR-014).
// NOAH (UP Resilience Institute) shows, for any place in the Philippines, its exposure to flood (100-year rain return
// period), landslide (including alluvial fan and debris flow) and storm surge (Storm Surge Advisory 4, NOAH's worst
// case), as "little to none", "low", "medium" or "high". DDRiVE-M does not copy or query NOAH's data: the hazard
// layers are NOAH's own Mapbox tilesets, the noah-frontend repository has no licence, and NOAH's web API is
// undocumented. So the official page is linked, and shown here in a frame only when the user asks (nothing is loaded
// from NOAH before that). What a user reads there can be recorded as a hazard record with NOAH as the source.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Map as MapIcon, Copy } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { listWatchAreas, type WatchArea } from '@/lib/actions';
import { isBackendConfigured } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

export const NOAH_KYH_URL = 'https://noah.up.edu.ph/know-your-hazards';

export const NOAH_HAZARDS = [
  { key: 'flood', label: 'Flood', scenario: '100-year rain return period', url: `${NOAH_KYH_URL}/flood` },
  { key: 'landslide', label: 'Landslide', scenario: 'Landslide, alluvial fan and debris flow', url: `${NOAH_KYH_URL}/landslide` },
  { key: 'storm-surge', label: 'Storm surge', scenario: 'Storm Surge Advisory 4 (worst case)', url: `${NOAH_KYH_URL}/storm-surge` },
] as const;

/** NOAH's exposure levels, as the site words them. */
export const NOAH_LEVELS = ['little to none', 'low', 'medium', 'high'] as const;

const NoahKnowYourHazards: React.FC = () => {
  const { activeTenant, can } = useAuth();
  const [areas, setAreas] = useState<WatchArea[]>([]);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (isBackendConfigured && activeTenant) listWatchAreas(activeTenant.tenant_id).then(setAreas);
  }, [activeTenant]);

  const copy = async (a: WatchArea) => {
    const text = a.lat != null && a.lon != null ? `${a.lat}, ${a.lon}` : a.label;
    try { await navigator.clipboard.writeText(text); toast.success(`Copied "${text}". Paste it in NOAH's search box.`); }
    catch { toast.error(`Search NOAH for: ${text}`); }
  };

  return (
    <GlassCard className="p-6" hover={false}>
      <section aria-labelledby="noah-heading" className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-600 to-blue-800 flex items-center justify-center">
            <MapIcon className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-[16rem]">
            <h2 id="noah-heading" className="font-montserrat font-bold text-xl text-slate-900 dark:text-white">Know your hazards: UP NOAH</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Hazard maps from Project NOAH of the UP Resilience Institute: how exposed a place is to flood, landslide and storm surge.
              They are reference maps of what could happen, not warnings. For warnings, follow PAGASA, PHIVOLCS and your local DRRM office.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={NOAH_KYH_URL} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-800">
              Open NOAH <ExternalLink className="w-4 h-4" aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
            </a>
            <button type="button" onClick={() => setShow((s) => !s)} aria-expanded={show} aria-controls="noah-frame"
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold">
              {show ? 'Hide the map' : 'Show the map here'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {NOAH_HAZARDS.map((h) => (
            <a key={h.key} href={h.url} target="_blank" rel="noopener noreferrer"
              className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:border-blue-500 block">
              <p className="font-semibold text-sm text-slate-900 dark:text-white">{h.label} <ExternalLink className="inline w-3 h-3" aria-hidden="true" /></p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Scenario: {h.scenario}</p>
            </a>
          ))}
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          NOAH rates each place as {NOAH_LEVELS.map((l, i) => <React.Fragment key={l}>{i ? ', ' : ''}<em>{l}</em></React.Fragment>)}, or says no data is available.
          NOAH's maps cover the 100-year flood, not every flood; check the city's own flood and CLUP hazard maps and the MGB and PHIVOLCS maps too.
        </p>

        {areas.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-1">Your watch areas</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">NOAH cannot be opened at a place from a link. Copy the place, open NOAH, and paste it in NOAH's search box.</p>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {areas.map((a) => (
                <li key={a.id} className="py-1.5 flex flex-wrap gap-2 items-center text-sm">
                  <span className="flex-1 min-w-[10rem]">{a.label}{a.lat != null && a.lon != null ? <span className="text-xs text-slate-500"> · {a.lat}, {a.lon}</span> : null}</span>
                  <button type="button" onClick={() => copy(a)} className="text-xs font-semibold inline-flex items-center gap-1 underline">
                    <Copy className="w-3 h-3" aria-hidden="true" /> Copy {a.lat != null ? 'coordinates' : 'name'}<span className="sr-only"> of {a.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {can('responder') && (
          <p className="text-xs">Record what NOAH shows for a place: <Link to="/detection?log=1&source=NOAH" className="underline font-semibold">log it as a hazard record</Link> with NOAH as the source, or use it as evidence in a <Link to="/diagnosis" className="underline font-semibold">DDRiVE hazard assessment</Link>.</p>
        )}

        {show && (
          <div id="noah-frame" className="space-y-1">
            <iframe src={NOAH_KYH_URL} title="UP NOAH Know Your Hazards map" className="w-full h-[32rem] rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
              loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" allow="geolocation" />
            <p className="text-xs text-slate-500">Shown from noah.up.edu.ph; NOAH's own terms and privacy notice apply inside the frame. If the frame stays blank, NOAH does not allow embedding: use "Open NOAH".</p>
          </div>
        )}
        <p className="text-xs text-slate-500">Source: Project NOAH, UP Resilience Institute (noah.up.edu.ph). DDRiVE-M is not affiliated with UP NOAH.</p>
      </section>
    </GlassCard>
  );
};

export default NoahKnowYourHazards;
