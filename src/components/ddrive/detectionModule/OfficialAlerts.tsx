import React, { useState } from 'react';
import { ExternalLink, AlertTriangle, ChevronDown, ChevronUp, FilePlus2 } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { needsRole } from '@/lib/roles';
import { OfficialAlert, ago, alertTitle, manila, useOfficialAlerts } from '@/hooks/useOfficialAlerts';

interface Props {
  /** Called when a person chooses to log an alert as one of the organisation's hazard records. */
  onLogAsHazard?: (alert: OfficialAlert) => void;
}

// Official alerts from PAGASA's CAP feed. Shown as the agency issued them: DDRiVE-M relays and attributes,
// and never originates a public warning (RA 10639). Not colour-coded by CAP severity: PAGASA marks all
// alerts "Minor", so the wind signal number and event name carry the meaning.
const OfficialAlerts: React.FC<Props> = ({ onLogAsHazard }) => {
  const { can } = useAuth();
  const { alerts, inArea, feed, stale, loading, error } = useOfficialAlerts();
  const [scope, setScope] = useState<'area' | 'all'>('area');
  const [open, setOpen] = useState<string | null>(null);

  const shown = scope === 'area' ? inArea : alerts;

  return (
    <GlassCard className="p-6" hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-montserrat font-bold text-lg">Official alerts</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            From PAGASA-DOST's public alert feed, shown as issued.{' '}
            <a href="https://www.pagasa.dost.gov.ph/" target="_blank" rel="noopener noreferrer" className="underline">pagasa.dost.gov.ph</a>
          </p>
        </div>
        <div role="group" aria-label="Which alerts to show" className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden text-xs font-semibold">
          <button type="button" aria-pressed={scope === 'area'} onClick={() => setScope('area')}
            className={`px-3 py-1.5 ${scope === 'area' ? 'bg-blue-700 text-white' : ''}`}>
            My watch areas ({inArea.length})
          </button>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}
            className={`px-3 py-1.5 ${scope === 'all' ? 'bg-blue-700 text-white' : ''}`}>
            All Philippines ({alerts.length})
          </button>
        </div>
      </div>

      <p role="status" className={`text-xs mb-4 ${stale ? 'text-amber-900 dark:text-amber-300 font-semibold flex items-center gap-1' : 'text-slate-600 dark:text-slate-400'}`}>
        {stale && <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
        {feed.lastOk
          ? `PAGASA feed last read ${ago(feed.lastOk)}.`
          : 'The PAGASA feed has not been read yet.'}
        {stale && ' Information here may be out of date. Check pagasa.dost.gov.ph directly.'}
      </p>

      {error ? (
        <p className="text-sm text-slate-700 dark:text-slate-300">Official alerts could not be loaded. Check pagasa.dost.gov.ph directly.</p>
      ) : loading && alerts.length === 0 ? (
        <p className="text-sm text-slate-500">Loading official alerts…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {scope === 'area'
            ? (alerts.length > 0
              ? `No PAGASA alert in force covers your watch areas. ${alerts.length} ${alerts.length === 1 ? 'is' : 'are'} in force elsewhere in the country.`
              : 'No PAGASA alerts are in force.')
            : 'No PAGASA alerts are in force.'}
          {scope === 'area' && ' Set watch areas in Settings → Organisation.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((a) => {
            const expanded = open === a.id;
            return (
              <li key={a.id} className={`rounded-xl border p-4 ${a.in_watch_area ? 'border-amber-500 border-l-4' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-montserrat font-bold text-base text-slate-900 dark:text-white">{alertTitle(a)}</p>
                    {a.headline && a.headline !== alertTitle(a) && <p className="text-sm text-slate-700 dark:text-slate-300">{a.headline}</p>}
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      <span className="font-semibold">Areas:</span> {a.area_names.join(', ') || a.region_label || 'Not stated'}
                    </p>
                  </div>
                  {a.in_watch_area && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                      In your watch area
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  Issued {manila(a.sent)} · Expires {manila(a.expires)}
                  {a.msg_type === 'Update' && ' · Update to an earlier alert'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  CAP fields as issued: severity {a.severity ?? '—'} · urgency {a.urgency ?? '—'} · certainty {a.certainty ?? '—'}
                </p>

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
                    Full alert from PAGASA <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                  {onLogAsHazard && (
                    <button type="button" onClick={() => onLogAsHazard(a)} disabled={!can('responder')}
                      title={can('responder') ? undefined : needsRole('responder')}
                      className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1 disabled:opacity-50">
                      <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" /> Log as hazard record
                    </button>
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
