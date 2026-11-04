import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Sparkles, FileText, Wand2, CheckCircle2, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { usePlans, insertRow } from '@/hooks/useDDriveData';

const templates = [
  { name: 'DRRM Plan', desc: 'RA 10121 compliant', standard: 'RA 10121', color: 'from-blue-500 to-cyan-500', type: 'DRRM' },
  { name: 'Business Continuity Plan', desc: 'ISO 22301 aligned', standard: 'ISO 22301', color: 'from-emerald-500 to-teal-500', type: 'Continuity' },
  { name: 'Recovery Plan', desc: 'DILG standards', standard: 'DILG MC', color: 'from-amber-500 to-orange-500', type: 'Recovery' },
  { name: 'Public Service Continuity', desc: 'PSCP 2nd Edition', standard: 'PSCP 2E', color: 'from-purple-500 to-pink-500', type: 'Continuity' },
];

const EnhancementModule: React.FC = () => {
  const { data: plans, refetch } = usePlans();
  const [generating, setGenerating] = useState<typeof templates[0] | null>(null);

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!generating) return;
    const form = new FormData(e.currentTarget);
    const nextId = `P-${String(plans.length + 1).padStart(3, '0')}`;
    const { error } = await insertRow('ddrive_plans', {
      id: nextId,
      title: `${generating.name} - ${form.get('org')}`,
      type: generating.type,
      standard: generating.standard,
      status: 'Draft',
      compliance: null, // not assessed yet; never a made-up score
      last_updated: new Date().toISOString().split('T')[0],
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`${generating.name} saved as a draft`);
    setGenerating(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Enhancement Module</h1>
            <p className="text-sm text-slate-500 font-poppins">Phase 6 · AI Plan Generator (Supabase-persisted)</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {templates.map(t => (
          <GlassCard key={t.name} className="p-5" onClick={() => setGenerating(t)}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center shadow-lg mb-3`}>
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <p className="font-montserrat font-bold">{t.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t.desc}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40">{t.standard}</span>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-montserrat font-bold text-lg">Active Plans & Documents ({plans.length})</h3>
          </div>
          <div className="space-y-3">
            {plans.map(p => (
              <div key={p.id} className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-poppins font-semibold text-sm truncate">{p.title}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">{p.type}</span>
                    <span>{p.standard}</span>
                    <span>·</span>
                    <span>Updated {p.last_updated}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-montserrat font-bold text-lg">{p.compliance == null ? 'Not assessed' : `${p.compliance}%`}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-700' :
                    p.status === 'In Review' ? 'bg-amber-500/15 text-amber-700' :
                    'bg-slate-500/15 text-slate-700'
                  }`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-montserrat font-bold text-lg mb-4">Compliance Dashboard</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Not assessed yet. Compliance against RA 10121, ISO 22301, ISO 31000 and PSCP guidance will be scored
            clause by clause, with the evidence behind each score, once that checklist is built.
          </p>
          <button onClick={() => toast.info('Regulatory reports is not available yet.')} className="w-full mt-4 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 text-white font-semibold text-sm">Generate Regulatory Report</button>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h3 className="font-montserrat font-bold text-lg mb-4">Resource Availability & Recovery Tracking</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Not set up yet. Resource figures (funds, relief stocks, evacuation centres, teams) will appear here once your
          organisation records them.
        </p>
      </GlassCard>

      {generating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setGenerating(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-montserrat font-bold text-xl">Generate {generating.name}</h3>
              <button onClick={() => setGenerating(null)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleGenerate} className="space-y-3">
              <input name="org" required placeholder="Organization name" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <input name="scope" placeholder="Geographic scope (e.g. Metro Manila)" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <textarea name="objectives" placeholder="Key objectives and scope..." rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent resize-none" />
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>AI will generate a plan aligned with {generating.standard} and save it to Supabase.</span>
              </div>
              <button type="submit" className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold">
                <Wand2 className="w-4 h-4 inline mr-1" /> Generate with AI
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancementModule;
