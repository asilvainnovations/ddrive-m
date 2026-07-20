import React from 'react';
import GlassCard from './GlassCard';
import StatCard from './StatCard';
import {
  AlertTriangle, Activity, ShieldCheck, Users, FileCheck2, Globe2,
  Radar, Stethoscope, Shield, Network, FlaskConical, Sparkles, Radio,
  ArrowRight, Zap, BookOpen
} from 'lucide-react';
import { resilienceTrend, alerts } from '@/data/sampleData';
import type { ModuleKey } from './Sidebar';
import { useHazards, useRisks, useIncidents, useUndrr } from '@/hooks/useDDriveData';

interface DashboardProps {
  onNavigate: (key: ModuleKey) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { data: hazards } = useHazards();
  const { data: risks } = useRisks();
  const { data: incidents } = useIncidents();
  const { data: undrr } = useUndrr();

  const resilienceScore = undrr.length > 0 ? Math.round(undrr.reduce((a, b) => a + b.score, 0) / undrr.length) : 78;
  const openIncidents = incidents.filter(i => i.status !== 'Completed').length;
  const criticalAlerts = hazards.filter(h => h.severity === 'Critical' || h.severity === 'High').length;

  const moduleCards = [
    { key: 'detection', label: 'Detection', icon: Radar, color: 'from-blue-500 to-cyan-500', count: hazards.length, status: 'Active Feeds', phase: 1 },
    { key: 'diagnosis', label: 'Diagnosis', icon: Stethoscope, color: 'from-cyan-500 to-teal-500', count: risks.length, status: 'Registered Risks', phase: 2 },
    { key: 'response', label: 'Response', icon: Shield, color: 'from-teal-500 to-emerald-500', count: openIncidents, status: 'Open Incidents', phase: 3 },
    { key: 'integration', label: 'Integration', icon: Network, color: 'from-emerald-500 to-green-600', count: resilienceScore, status: 'Resilience Score', phase: 4 },
    { key: 'validation', label: 'Validation', icon: FlaskConical, color: 'from-amber-500 to-orange-500', count: 9, status: 'Simulations', phase: 5 },
    { key: 'enhancement', label: 'Enhancement', icon: Sparkles, color: 'from-orange-500 to-red-500', count: 32, status: 'Active Plans', phase: 6 },
    { key: 'monitoring', label: 'Monitoring', icon: Radio, color: 'from-red-500 to-pink-500', count: 156, status: 'Team Members', phase: 7 },
  ];

  const maxScore = Math.max(...resilienceTrend.map(d => d.score));
  const minScore = Math.min(...resilienceTrend.map(d => d.score));

  return (
    <div className="space-y-6">
      <GlassCard className="p-6 lg:p-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-amber-300/10 to-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE OPERATIONS
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                ALERT LEVEL: ORANGE
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                SUPABASE: CONNECTED
              </span>
            </div>
            <h1 className="font-montserrat font-bold text-3xl lg:text-4xl text-slate-900 dark:text-white tracking-tight">
              Command Intelligence Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 font-poppins max-w-2xl">
              Republic of the Philippines · National Disaster Risk Reduction & Management Council · Real-time situational awareness across all 7 phases of the intelligence cycle.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('detection')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 text-white font-poppins font-semibold text-sm shadow-lg shadow-blue-900/25 hover:shadow-xl hover:-translate-y-0.5 transition flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              View Live Threats
            </button>
            <a
              href="https://asilvainnovations.github.io/ddrive-m/user-manual.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-white/60 dark:border-white/20 text-slate-700 dark:text-white font-poppins font-semibold text-sm hover:bg-white transition flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              User Manual
            </a>
            <button
              onClick={() => onNavigate('assistant')}
              className="px-5 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-white/60 dark:border-white/20 text-slate-700 dark:text-white font-poppins font-semibold text-sm hover:bg-white transition"
            >
              Ask DDRiVER AI
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Risks Tracked" value={risks.length} trend={8} icon={AlertTriangle} color="red" />
        <StatCard label="Resilience Score" value={resilienceScore} suffix="/100" trend={4} icon={ShieldCheck} color="green" />
        <StatCard label="Open Incidents" value={openIncidents} trend={-12} icon={Activity} color="amber" />
        <StatCard label="Critical Alerts" value={criticalAlerts} trend={-3} icon={Zap} color="red" />
        <StatCard label="Active Responders" value={342} trend={15} icon={Users} color="blue" />
        <StatCard label="Completed Drills" value={89} trend={22} icon={FileCheck2} color="purple" />
        <StatCard label="Compliance Rate" value={92} suffix="%" trend={2} icon={ShieldCheck} color="green" />
        <StatCard label="Pop. Covered" value="12.4M" trend={5} icon={Globe2} color="cyan" />
      </div>

      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-montserrat font-bold text-xl text-slate-900 dark:text-white">Seven Intelligence Cycle Modules</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-poppins">Live counts from Supabase · click to enter workspace</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {moduleCards.map((m) => {
            const Icon = m.icon;
            return (
              <GlassCard
                key={m.key}
                onClick={() => onNavigate(m.key as ModuleKey)}
                className="p-4 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    PHASE {m.phase}
                  </span>
                </div>
                <p className="font-montserrat font-bold text-slate-900 dark:text-white">{m.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-montserrat">{m.count}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-roboto-condensed uppercase tracking-wide">{m.status}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-blue-700 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition">
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-montserrat font-bold text-lg text-slate-900 dark:text-white">Resilience Score Trend</h3>
              <p className="text-xs text-slate-500 font-poppins">UNDRR 10 Essentials composite · 2025</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold">+10 YoY</span>
          </div>
          <div className="h-48 flex items-end gap-2">
            {resilienceTrend.map((d, i) => {
              const heightPct = ((d.score - minScore + 5) / (maxScore - minScore + 10)) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{d.score}</div>
                  <div
                    className="w-full bg-gradient-to-t from-blue-700 to-cyan-400 rounded-t-lg transition-all hover:from-blue-800 hover:to-amber-400 cursor-pointer"
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-[10px] text-slate-500 font-roboto-condensed">{d.month}</div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-montserrat font-bold text-lg text-slate-900 dark:text-white">Critical Alerts</h3>
            <button onClick={() => onNavigate('detection')} className="text-xs text-blue-700 dark:text-blue-400 font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className={`p-3 rounded-xl border-l-4 ${
                a.type === 'critical' ? 'border-red-500 bg-red-50/80 dark:bg-red-900/20' :
                a.type === 'warning' ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-900/20' :
                'border-blue-500 bg-blue-50/80 dark:bg-blue-900/20'
              }`}>
                <p className="text-xs font-semibold text-slate-900 dark:text-white font-poppins leading-tight">{a.title}</p>
                <p className="text-[10px] text-slate-500 mt-1">{a.time}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-montserrat font-bold text-lg text-slate-900 dark:text-white">Multi-Agency Hazard Feed (Live from Supabase)</h3>
            <p className="text-xs text-slate-500 font-poppins">PAGASA · PHIVOLCS · NOAH · NDRRMC</p>
          </div>
          <button onClick={() => onNavigate('detection')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800">Open Detection →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-poppins">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500 font-roboto-condensed border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-2">Agency</th>
                <th className="text-left py-2 px-2">Hazard</th>
                <th className="text-left py-2 px-2">Location</th>
                <th className="text-left py-2 px-2">Severity</th>
                <th className="text-left py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {hazards.slice(0, 6).map((h) => (
                <tr key={h.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white/50 dark:hover:bg-white/5">
                  <td className="py-2.5 px-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{h.agency}</span>
                  </td>
                  <td className="py-2.5 px-2 font-medium text-slate-900 dark:text-white">{h.name}</td>
                  <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">{h.location}</td>
                  <td className="py-2.5 px-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      h.severity === 'Critical' ? 'bg-red-500/15 text-red-700 dark:text-red-400' :
                      h.severity === 'High' ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400' :
                      h.severity === 'Medium' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                      'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                    }`}>{h.severity.toUpperCase()}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${h.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default Dashboard;