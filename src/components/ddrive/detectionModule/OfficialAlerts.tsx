import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, AlertTriangle, ChevronDown, ChevronUp, FilePlus2, Hourglass, Gauge, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { needsRole } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { OfficialAlert, SOURCES, SourceKey, ago, alertTitle, isStale, manila, useOfficialAlerts } from '@/hooks/useOfficialAlerts';
import { riskCategory, scaleWord } from '@/lib/ddriveAssessment/scoring';

interface Props {
  /** Called when a person chooses to log an alert as one of the organisation's hazard records. */
  onLogAsHazard?: (alert: OfficialAlert) => void;
}

/** One assessed hazard event that an alert in a watch area speaks to (view ddrive_alert_risk_context, ADR-005). */
export interface RiskContext {
  alert_id: string;
  assessment_id: string;
  assessment_ref: string;
  assessment_title: string;
  approved_at: string | null;
  entry_id: string;
  main_hazard: string;
  hazard_event: string;
  risk_code: string;
  risk_rank: number;
  likelihood: number;
  likelihood_level: string;
  severity: number;
  severity_class: string;
  total_vulnerability: number;
  exposure: number;
  v_infrastructure: number; v_productive: number; v_services: number; v_social: number;
  response: number;
  risk_id: string | null;
}

export function useRiskContext(alertIds: string[]) {
  const [rows, setRows] = useState<RiskContext[]>([]);
  const key = alertIds.join(',');
  useEffect(() => {
    let live = true;
    if (!alertIds.length) { setRows([]); return; }
    supabase.from('ddrive_alert_risk_context').select('*').in('alert_id', alertIds).order('risk_rank', { ascending: false })
      .then(({ data }) => { if (live) setRows((data ?? []) as RiskContext[]); });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return rows;
}

// Alert levels are shown in words, with the colour only as a second cue (WCAG: colour is never the only signal).
const LEVEL_STYLE: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-900 border-emerald-400',
  yellow: 'bg-yellow-100 text-yellow-900 border-yellow-500',
  orange: 'bg-orange-100 text-orange-900 border-orange-500',
  red: 'bg-red-100 text-red-900 border-red-500',
};
const LevelBadge: React.FC<{ a: OfficialAlert }> = ({ a }) => {
  if (!a.alert_level) return null;
  const label = a.source === 'USGS' ? `USGS PAGER: ${a.alert_level}` : `GDACS alert level: ${a.alert_level}`;
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_STYLE[a.alert_level.toLowerCase()] ?? 'bg-slate-100 text-slate-800 border-slate-300'}`}>{label}</span>;
};

const sourceMeta = (k: string) => SOURCES.find((s) => s.key === k);

/** "Assessed risk" panel beside an alert: what the organisation's own approved DDRiVE assessment says about this hazard. */
export const RiskPanel: React.FC<{ rows: RiskContext[] }> = ({ rows }) => {
  if (!rows.length) {
    return (
      <p className="mt-3 text-xs rounded-lg border border-dashed border-slate-300 px-3 py-2 text-slate-600 dark:text-slate-300">
        Your approved DDRiVE assessments have not rated this hazard. <Link to="/diagnosis" className="underline font-semibold">Assess it in Diagnosis</Link>.
      </p>
    );
  }
  const top = rows[0];
  return (
    <div className="mt-3 rounded-lg border border-blue-300 bg-blue-50/70 dark:bg-blue-950/40 px-3 py-2 text-xs text-slate-800 dark:text-slate-200" role="note">
      <p className="font-semibold flex items-center gap-1"><Gauge className="w-3.5 h-3.5" aria-hidden="true" /> Your assessed risk for this hazard</p>
      <ul className="mt-1 space-y-1">
        {rows.slice(0, 4).map((r) => (
          <li key={r.entry_id}>
            <strong>{r.risk_code}</strong> ({riskCategory(r.risk_code)}) · {r.main_hazard}: {r.hazard_event} · likelihood {r.likelihood_level.toLowerCase()},
            severity {r.severity_class.toLowerCase()} · total vulnerability {Number(r.total_vulnerability)}/100 · response measures: {scaleWord('response', r.response).toLowerCase()}
          </li>
        ))}
      </ul>
      <p className="mt-1">
        From <Link to={`/diagnosis?assessment=${encodeURIComponent(top.assessment_id)}`} className="underline font-semibold">{top.assessment_ref} {top.assessment_title}</Link>
        {top.approved_at ? `, approved ${manila(top.approved_at)}` : ''}. Context for decisions, not a forecast: follow the agency's warning.
      </p>
    </div>
  );
};

// Official alerts as the agencies issued them. DDRiVE-M relays and attributes, and never originates a public warning
// (RA 10639). Not colour-coded by CAP severity: PAGASA marks all alerts "Minor", so the wind signal number and event
// name carry the meaning. International sources are labelled as such (ADR-005).
const OfficialAlerts: React.FC<Props> = ({ onLogAsHazard }) => {
  const { can } = useAuth();
  const { alerts, inArea, feeds, loading, error } = useOfficialAlerts();
  const [scope, setScope] = useState<'area' | 'all'>('area');
  const [source, setSource] = useState<SourceKey | 'ALL'>('ALL');
  const [open, setOpen] = useState<string | null>(null);

  const base = scope === 'area' ? inArea : alerts;
  const shown = source === 'ALL' ? base : base.filter((a) => a.source === source);
  const context = useRiskContext(useMemo(() => inArea.map((a) => a.id), [inArea]));
  const contextFor = (id: string) => context.filter((c) => c.alert_id === id);
  const staleFeeds = feeds.filter(isStale);
  const count = (k: string) => base.filter((a) => a.source === k).length;

  return (
    <GlassCard className="p-6" hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-montserrat font-bold text-lg">Official alerts</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            From PAGASA, the Pacific Tsunami Warning Center, USGS and GDACS, shown as issued. PHIVOLCS publishes no data feed:
            for official earthquake, tsunami and volcano information, see{' '}
            <a href="https://www.phivolcs.dost.gov.ph/" target="_blank" rel="noopener noreferrer" className="underline">phivolcs.dost.gov.ph</a>.
          </p>
        </div>
        <div role="group" aria-label="Which alerts to show" className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden text-xs font-semibold">
          <button type="button" aria-pressed={scope === 'area'} onClick={() => setScope('area')} className={`px-3 py-1.5 ${scope === 'area' ? 'bg-blue-700 text-white' : ''}`}>
            My watch areas ({inArea.length})
          </button>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')} className={`px-3 py-1.5 ${scope === 'all' ? 'bg-blue-700 text-white' : ''}`}>
            Whole region ({alerts.length})
          </button>
        </div>
      </div>

      <div role="group" aria-label="Filter by source" className="flex flex-wrap gap-1 mb-3 text-xs">
        <button type="button" aria-pressed={source === 'ALL'} onClick={() => setSource('ALL')}
          className={`px-2.5 py-1 rounded-lg border ${source === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300'}`}>All sources</button>
        {SOURCES.map((s) => (
          <button key={s.key} type="button" aria-pressed={source === s.key} onClick={() => setSource(s.key)}
            className={`px-2.5 py-1 rounded-lg border ${source === s.key ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300'}`}>
            {s.key} ({count(s.key)})
          </button>
        ))}
      </div>

      <details className="mb-4 text-xs text-slate-600 dark:text-slate-400" open={staleFeeds.length > 0}>
        <summary className={`cursor-pointer ${staleFeeds.length ? 'text-amber-900 dark:text-amber-300 font-semibold' : ''}`}>
          {staleFeeds.length ? <><AlertTriangle className="inline w-3.5 h-3.5 mr-1" aria-hidden="true" />{staleFeeds.map((f) => f.source).join(', ')} not read recently: information may be out of date.</> : 'All sources read recently.'}
        </summary>
        <ul className="mt-1 grid sm:grid-cols-2 gap-1" role="status">
          {SOURCES.map((s) => {
            const f = feeds.find((x) => x.source === s.key);
            return (
              <li key={s.key}>
                <a href={s.home} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{s.label}</a>:{' '}
                {f?.lastOk ? `read ${ago(f.lastOk)}` : 'not read yet'}{f && isStale(f) ? ' (stale)' : ''}. <span className="text-slate-500">{s.kind}.</span>
              </li>
            );
          })}
        </ul>
      </details>

      {error ? (
        <p className="text-sm text-slate-700 dark:text-slate-300">Official alerts could not be loaded. Check pagasa.dost.gov.ph and phivolcs.dost.gov.ph directly.</p>
      ) : loading && alerts.length === 0 ? (
        <p className="text-sm text-slate-500">Loading official alerts…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {scope === 'area'
            ? (alerts.length > 0 ? `No alert in force covers your watch areas. ${alerts.length} ${alerts.length === 1 ? 'is' : 'are'} in force elsewhere in the region.` : 'No alerts are in force.')
            : 'No alerts are in force.'}
          {scope === 'area' && ' Set watch areas (provinces, or a point and radius) in Settings → Organisation.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((a) => {
            const expanded = open === a.id;
            const meta = sourceMeta(a.source);
            const international = a.source === 'USGS' || a.source === 'GDACS';
            return (
              <li key={a.id} className={`rounded-xl border p-4 ${a.in_watch_area ? 'border-amber-500 border-l-4' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{meta?.label ?? a.source}</p>
                    <p className="font-montserrat font-bold text-base text-slate-900 dark:text-white">{alertTitle(a)}</p>
                    {a.headline && a.headline !== alertTitle(a) && <p className="text-sm text-slate-700 dark:text-slate-300">{a.headline}</p>}
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      <span className="font-semibold">Areas:</span> {a.area_names.join(', ') || a.region_label || 'Not stated'}
                      {a.latitude != null && <span className="text-slate-500"> · {a.latitude.toFixed(2)}°N, {a.longitude?.toFixed(2)}°E</span>}
                      {a.depth_km != null && <span className="text-slate-500"> · depth {Number(a.depth_km)} km</span>}
                      {a.nearest_watch_km != null && <span className="text-slate-500"> · {Number(a.nearest_watch_km)} km from your nearest watch point</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {a.in_watch_area && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">In your watch area</span>}
                    <LevelBadge a={a} />
                    {a.tsunami_flag && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-500 bg-blue-50 text-blue-900">Tsunami information may exist: check PHIVOLCS</span>}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {a.source === 'USGS' ? 'Origin time' : 'Issued'} {manila(a.sent)} · In force until {manila(a.expires)}
                  {a.msg_type === 'Update' && ' · Update to an earlier alert'}
                </p>
                {a.raw_format === 'cap-xml' ? (
                  <p className="text-[11px] text-slate-500 mt-0.5">CAP fields as issued: severity {a.severity ?? '—'} · urgency {a.urgency ?? '—'} · certainty {a.certainty ?? '—'}</p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                    {international ? 'International source. PAGASA and PHIVOLCS issue the official warnings for the Philippines; readings may be revised.' : ''}
                  </p>
                )}

                {a.in_watch_area && <RiskPanel rows={contextFor(a.id)} />}

                {expanded && (
                  <div className="mt-3 space-y-2 text-sm whitespace-pre-line text-slate-800 dark:text-slate-200">
                    {a.description && <div><p className="font-semibold">Details</p><p>{a.description.replace(/\*\*/g, '')}</p></div>}
                    {a.instruction && <div><p className="font-semibold">What to do</p><p>{a.instruction.replace(/\*\*/g, '')}</p></div>}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                  <button type="button" onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={expanded}
                    className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
                    {expanded ? 'Hide details' : 'Details and instructions'}
                  </button>
                  <a href={a.cap_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                    Original from {a.source} <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                  {onLogAsHazard && (
                    <button type="button" onClick={() => onLogAsHazard(a)} disabled={!can('responder')} title={can('responder') ? undefined : needsRole('responder')}
                      className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1 disabled:opacity-50">
                      <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" /> Log as hazard record
                    </button>
                  )}
                  {can('analyst') && (
                    <Link to={`/anticipatory-action?alert=${encodeURIComponent(a.id)}`} className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      <Hourglass className="w-3.5 h-3.5" aria-hidden="true" /> Start anticipatory action
                    </Link>
                  )}
                  <span className="text-slate-500 ml-auto">Source: {a.sender ?? a.source}{a.license ? ` · ${a.license.replace(/^.*?(CC BY [0-9]+(?:\.[0-9]+)?).*$/i, '$1')}` : ''}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
};

export default OfficialAlerts;
