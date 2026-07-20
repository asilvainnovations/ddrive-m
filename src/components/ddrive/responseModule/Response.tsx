import React from 'react';
import GlassCard from './GlassCard';
import { Shield, Zap, CheckCircle2, Clock, Users } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useIncidents, updateRow } from '@/hooks/useDDriveData';

const protocols = [
  { agency: 'DTI', name: 'Trade & Industry Continuity', count: 8 },
  { agency: 'DILG', name: 'LGU Emergency Protocol', count: 12 },
  { agency: 'LGU', name: 'Local Controls Framework', count: 25 },
  { agency: 'DOH', name: 'Health Emergency Response', count: 14 },
];

const treatments = [
  { type: 'Avoid', desc: 'Eliminate the risk by not proceeding', color: 'from-red-500 to-red-700' },
  { type: 'Reduce', desc: 'Implement controls to reduce likelihood/impact', color: 'from-amber-500 to-orange-600' },
  { type: 'Transfer', desc: 'Share risk via insurance/partnership', color: 'from-blue-500 to-blue-700' },
  { type: 'Accept', desc: 'Acknowledge and monitor', color: 'from-emerald-500 to-emerald-700' },
];

const ResponseModule: React.FC = () => {
  const { data: incidents, refetch } = useIncidents();

  const advance = async (id: string, current: number) => {
    const newProgress = Math.min(100, current + 10);
    const newStatus = newProgress >= 100 ? 'Completed' : 'In Progress';
    const { error } = await updateRow('ddrive_incidents', id, { progress: newProgress, status: newStatus });
    if (error) { toast.error(error.message); return; }
    toast.success('Progress updated in Supabase');
    refetch();
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Response Module</h1>
            <p className="text-sm text-slate-500 font-poppins">Phase 3 · AI treatment canvas · Incident management (Supabase live)</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-montserrat font-bold text-lg">AI Treatment Canvas</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">ISO 31000 risk response strategies</p>
          <div className="grid grid-cols-2 gap-3">
            {treatments.map(t => (
              <div key={t.type} className={`p-4 rounded-xl bg-gradient-to-br ${t.color} text-white cursor-pointer hover:scale-[1.02] transition`}>
                <p className="font-bold font-montserrat">{t.type}</p>
                <p className="text-xs text-white/80 mt-1">{t.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={() => toast.success('AI generated 12 mitigation strategies')} className="w-full mt-4 px-3 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm">Generate AI Mitigation Strategies</button>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-montserrat font-bold text-lg mb-4">Protocol Library</h3>
          <div className="space-y-2">
            {protocols.map(p => (
              <div key={p.agency} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40">{p.agency}</span>
                  <span className="text-sm font-poppins font-medium">{p.name}</span>
                </div>
                <span className="text-xs font-bold">{p.count} SOPs</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-montserrat font-bold text-lg">Incident Management</h3>
            <p className="text-xs text-slate-500">{incidents.length} tracked in database</p>
          </div>
          <button onClick={() => toast.success('Deployed to incident queue')} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold">+ New Incident</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {incidents.map(inc => (
            <div key={inc.id} className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-[10px] text-slate-500">{inc.id}</p>
                  <p className="font-montserrat font-bold text-sm">{inc.title}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  inc.priority === 'Critical' ? 'bg-red-500/15 text-red-700' :
                  inc.priority === 'High' ? 'bg-orange-500/15 text-orange-700' :
                  'bg-amber-500/15 text-amber-700'
                }`}>{inc.priority.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {inc.assignee_name}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA {inc.eta}</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full ${inc.status === 'Completed' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`} style={{ width: `${inc.progress}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  {inc.status === 'Completed' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3" />}
                  {inc.status} · {inc.progress}%
                </span>
                {inc.status !== 'Completed' && (
                  <button onClick={() => advance(inc.id, inc.progress)} className="text-xs text-blue-700 font-semibold hover:underline">Advance +10%</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

export default ResponseModule;
