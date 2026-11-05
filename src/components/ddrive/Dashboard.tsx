import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Activity, ShieldCheck, FileCheck2, FlaskConical,
  Radar, Stethoscope, Shield, Network, Sparkles, Radio, ArrowRight, BookOpen,
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import StatCard from '@/components/ddrive/StatCard';
import { ModuleKey, moduleByKey } from '@/lib/modules';
import { isBackendConfigured } from '@/lib/supabase';
import { useOfficialAlerts, ago } from '@/hooks/useOfficialAlerts';
import {
  useHazards, useRisks, useIncidents, useUndrr, useScenarios, usePlans, useMessages, TableState,
} from '@/hooks/useDDriveData';

// Every figure on this screen comes from a database table. When a table is empty or cannot be
// read, the screen says so instead of showing a default number.

const fmtTime = (d: Date | null) =>
  d ? d.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : '';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const go = (key: ModuleKey) => navigate(moduleByKey(key).path);

  const hazards = useHazards();
  const risks = useRisks();
  const incidents = useIncidents();
  const undrr = useUndrr();
  const scenarios = useScenarios();
  const plans = usePlans();
  const messages = useMessages();
  const official = useOfficialAlerts();

  const sources: TableState<unknown>[] = [hazards, risks, incidents, undrr, scenarios, plans, messages];
  const loading = sources.some((s) => s.loading);
  const failed = sources.filter((s) => s.error).length;
  const lastLoaded = sources
    .map((s) => s.loadedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  // A table that could not be read shows "Unavailable", never 0: zero hazards and unknown hazards are different facts.
  const unreadable = (src: TableState<unknown>) => !isBackendConfigured || src.error !== null;
  const show = (src: TableState<unknown>, value: number) => (unreadable(src) ? 'Unavailable' : value);

  const resilienceScore =
    undrr.data.length > 0
      ? Math.round(undrr.data.reduce((sum, row) => sum + row.score, 0) / undrr.data.length)
      : null;
  const openIncidents = incidents.data.filter((i) => i.status !== 'Completed').length;
  const severeHazards = hazards.data.filter((h) => h.severity === 'Critical' || h.severity === 'High');

  const moduleCards: { key: ModuleKey; icon: React.ElementType; color: string; src: TableState<unknown>; count: number | null; status: string }[] = [
    { key: 'detection', icon: Radar, color: 'from-blue-500 to-cyan-500', src: hazards, count: hazards.data.length, status: 'Hazard records' },
    { key: 'diagnosis', icon: Stethoscope, color: 'from-cyan-500 to-teal-500', src: risks, count: risks.data.length, status: 'Registered risks' },
    { key: 'response', icon: Shield, color: 'from-teal-500 to-emerald-500', src: incidents, count: openIncidents, status: 'Open incidents' },
    { key: 'integration', icon: Network, color: 'from-emerald-500 to-green-600', src: undrr, count: resilienceScore, status: 'UNDRR average' },
    { key: 'validation', icon: FlaskConical, color: 'from-amber-500 to-orange-500', src: scenarios, count: scenarios.data.length, status: 'Scenarios' },
    { key: 'enhancement', icon: Sparkles, color: 'from-orange-500 to-red-500', src: plans, count: plans.data.length, status: 'Plans' },
    { key: 'monitoring', icon: Radio, color: 'from-red-500 to-pink-500', src: messages, count: messages.data.length, status: 'Messages' },
  ];

  return (
    <div className="space-y-6">
      <GlassCard className="p-6 lg:p-8" hover={false}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div role="status" className="flex flex-wrap items-center gap-2 mb-3 text-xs font-semibold">
              {!isBackendConfigured ? (
                <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-800 dark:text-red-300">
                  Database not configured
                </span>
              ) : loading ? (
                <span className="px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300">Loading data…</span>
              ) : failed > 0 ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-900 dark:text-amber-300">
                  {failed} of {sources.length} data sources could not be read
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                  Data loaded {fmtTime(lastLoaded)} (Manila time)
                </span>
              )}
              {isBackendConfigured && !official.loading && (
                official.stale ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-900 dark:text-amber-300">
                    PAGASA alerts last read {ago(official.feed.lastOk)}; may be out of date
                  </span>
                ) : official.inArea.length > 0 ? (
                  <button type="button" onClick={() => go('detection')}
                    className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500 underline-offset-2 hover:underline">
                    {official.inArea.length} PAGASA {official.inArea.length === 1 ? 'alert' : 'alerts'} in your watch areas
                    {official.maxSignalInArea ? ` · highest: Wind Signal No. ${official.maxSignalInArea}` : ''}
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300">
                    No PAGASA alert in your watch areas · read {ago(official.feed.lastOk)}
                  </span>
                )
              )}
            </div>
            <h1 className="font-montserrat font-bold text-3xl lg:text-4xl text-slate-900 dark:text-white tracking-tight">
              Command Intelligence Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 font-poppins max-w-2xl">
              Your organisation's records across the 7 phases of the resilience intelligence cycle. For official
              warnings, follow PAGASA, PHIVOLCS and your local DRRM office.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => go('detection')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 text-white font-poppins font-semibold text-sm shadow hover:shadow-lg transition flex items-center gap-2"
            >
              <Radar className="w-4 h-4" />
              Open hazard records
            </button>
            <a
              href="/user-manual.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-slate-200 dark:border-white/20 text-slate-700 dark:text-white font-poppins font-semibold text-sm hover:bg-white transition flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              User Manual
            </a>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard label="Risks tracked" value={show(risks, risks.data.length)} icon={AlertTriangle} color="red" />
        <StatCard
          label="Resilience score (UNDRR avg.)"
          value={unreadable(undrr) ? 'Unavailable' : resilienceScore ?? 'No data yet'}
          suffix={unreadable(undrr) || resilienceScore === null ? undefined : '/100'}
          icon={ShieldCheck}
          color="green"
        />
        <StatCard label="Open incidents" value={show(incidents, openIncidents)} icon={Activity} color="amber" />
        <StatCard label="High or critical hazards" value={show(hazards, severeHazards.length)} icon={AlertTriangle} color="red" />
        <StatCard label="Scenarios" value={show(scenarios, scenarios.data.length)} icon={FlaskConical} color="purple" />
        <StatCard label="Plans" value={show(plans, plans.data.length)} icon={FileCheck2} color="blue" />
      </div>

      <section aria-labelledby="modules-heading">
        <div className="mb-4">
          <h2 id="modules-heading" className="font-montserrat font-bold text-xl text-slate-900 dark:text-white">
            Seven intelligence cycle modules
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-poppins">Counts from your records · select a module to open it</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {moduleCards.map((m) => {
            const Icon = m.icon;
            const meta = moduleByKey(m.key);
            return (
              <button
                type="button"
                key={m.key}
                onClick={() => go(m.key)}
                className="text-left rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/50 p-4 group hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    PHASE {meta.phase}
                  </span>
                </div>
                <p className="font-montserrat font-bold text-slate-900 dark:text-white">{meta.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-montserrat">
                  {unreadable(m.src) || m.count === null ? '—' : m.count}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-roboto-condensed uppercase tracking-wide">
                  {unreadable(m.src) ? 'Unavailable' : m.count === null ? 'No data yet' : m.status}
                </p>
                <span className="flex items-center gap-1 mt-2 text-xs text-blue-700 dark:text-blue-400">
                  Open <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-6 lg:col-span-2" hover={false}>
          <h3 className="font-montserrat font-bold text-lg text-slate-900 dark:text-white">UNDRR 10 Essentials scores</h3>
          <p className="text-xs text-slate-500 font-poppins mb-4">From your organisation's latest scorecard entries</p>
          {unreadable(undrr) ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Scorecard data could not be loaded.</p>
          ) : undrr.data.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No scorecard entries yet. Record them in the Integration module.
            </p>
          ) : (
            <ul className="space-y-2">
              {undrr.data.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <span className="w-56 shrink-0 truncate" title={e.name}>{e.name}</span>
                  <span className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
                    <span className="block h-2 rounded-full bg-blue-700" style={{ width: `${Math.max(0, Math.min(100, e.score))}%` }} />
                  </span>
                  <span className="w-12 text-right font-semibold">{e.score}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-6" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-montserrat font-bold text-lg text-slate-900 dark:text-white">High and critical hazards</h3>
            <button type="button" onClick={() => go('detection')} className="text-xs text-blue-700 dark:text-blue-400 font-semibold hover:underline">
              View all
            </button>
          </div>
          {unreadable(hazards) ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Hazard records could not be loaded. Check official sources directly.</p>
          ) : severeHazards.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">No high or critical hazard records.</p>
          ) : (
            <ul className="space-y-3">
              {severeHazards.slice(0, 5).map((h) => (
                <li
                  key={h.id}
                  className={`p-3 rounded-xl border-l-4 ${
                    h.severity === 'Critical' ? 'border-red-600 bg-red-50/80 dark:bg-red-900/20' : 'border-orange-500 bg-orange-50/80 dark:bg-orange-900/20'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                    {h.severity}: {h.name}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                    {h.location} · source: {h.agency}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-montserrat font-bold text-lg text-slate-900 dark:text-white">Hazard records</h3>
            <p className="text-xs text-slate-500 font-poppins">
              Entered by your team, with the agency each came from. Automatic agency feeds are not connected yet.
            </p>
          </div>
          <button type="button" onClick={() => go('detection')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800">
            Open Detection
          </button>
        </div>
        {unreadable(hazards) ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Hazard records could not be loaded.</p>
        ) : hazards.data.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No hazard records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-poppins">
              <caption className="sr-only">Latest hazard records</caption>
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500 font-roboto-condensed border-b border-slate-200 dark:border-slate-700">
                  <th scope="col" className="text-left py-2 px-2">Source</th>
                  <th scope="col" className="text-left py-2 px-2">Hazard</th>
                  <th scope="col" className="text-left py-2 px-2">Location</th>
                  <th scope="col" className="text-left py-2 px-2">Severity</th>
                  <th scope="col" className="text-left py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {hazards.data.slice(0, 6).map((h) => (
                  <tr key={h.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2.5 px-2">{h.agency}</td>
                    <td className="py-2.5 px-2 font-medium text-slate-900 dark:text-white">{h.name}</td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">{h.location}</td>
                    <td className="py-2.5 px-2">{h.severity}</td>
                    <td className="py-2.5 px-2">{h.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Dashboard;
