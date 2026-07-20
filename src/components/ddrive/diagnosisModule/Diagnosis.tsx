import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { Stethoscope, Upload, Brain, FileSearch, Plus, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useRisks, insertRow } from '@/hooks/useDDriveData';

const categories = ['All', 'Strategic', 'Operational', 'Financial', 'Compliance', 'Environmental'];

const DiagnosisModule: React.FC = () => {
  const { data: risks, refetch } = useRisks();
  const [filter, setFilter] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = filter === 'All' ? risks : risks.filter(r => r.category === filter);

  const matrix = Array.from({ length: 5 }, (_, i) => Array.from({ length: 5 }, (_, j) => {
    const likelihood = 5 - i;
    const impact = j + 1;
    const count = risks.filter(r => r.likelihood === likelihood && r.impact === impact).length;
    const score = likelihood * impact;
    return { likelihood, impact, score, count };
  }));

  const getColor = (score: number) => {
    if (score >= 20) return 'bg-red-500';
    if (score >= 12) return 'bg-orange-500';
    if (score >= 6) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const likelihood = parseInt(form.get('likelihood') as string);
    const impact = parseInt(form.get('impact') as string);
    const score = likelihood * impact;
    const level = score >= 20 ? 'Critical' : score >= 12 ? 'High' : score >= 6 ? 'Medium' : 'Low';
    const nextId = `R-${String(risks.length + 1).padStart(3, '0')}`;
    const { error } = await insertRow('ddrive_risks', {
      id: nextId,
      title: form.get('title'),
      category: form.get('category'),
      likelihood, impact, level,
      owner: form.get('owner'),
      status: 'Open',
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Risk ${nextId} registered to Supabase`);
    setShowAdd(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-montserrat font-bold text-2xl">Diagnosis Module</h1>
              <p className="text-sm text-slate-500 font-poppins">Phase 2 · ISO 31000 Risk Registry (Supabase persisted)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowUpload(true)} className="px-3 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-white/40 text-sm font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Data
            </button>
            <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Risk
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="font-montserrat font-bold text-lg mb-4">ISO 31000 Risk Matrix (5×5)</h3>
          <div className="grid grid-cols-5 gap-1">
            {matrix.flat().map((cell, idx) => (
              <div
                key={idx}
                className={`${getColor(cell.score)} aspect-square rounded-lg flex flex-col items-center justify-center text-white cursor-pointer hover:scale-105 transition`}
                title={`L:${cell.likelihood} × I:${cell.impact} = ${cell.score}`}
              >
                <span className="text-xs font-bold">{cell.score}</span>
                {cell.count > 0 && <span className="text-[9px] mt-0.5 px-1 rounded bg-black/30">{cell.count}</span>}
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] font-bold text-slate-500 mt-2">Impact (1→5) →</div>
          <div className="flex gap-4 mt-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Low (1-5)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /> Medium (6-11)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500" /> High (12-19)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Critical (20-25)</div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="font-montserrat font-bold text-lg">AI Vulnerability Scanner</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">ML classifier trained on historical PH disaster data.</p>
          <div className="space-y-2">
            {[
              { label: 'Physical Domain', val: 78, color: 'bg-blue-500' },
              { label: 'Environmental', val: 85, color: 'bg-emerald-500' },
              { label: 'Operational', val: 62, color: 'bg-amber-500' },
              { label: 'Cyber/Digital', val: 54, color: 'bg-red-500' },
            ].map(d => (
              <div key={d.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{d.label}</span>
                  <span className="font-semibold">{d.val}%</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${d.color} rounded-full`} style={{ width: `${d.val}%` }} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => toast.success('AI analysis started')} className="w-full mt-4 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm flex items-center justify-center gap-2">
            <FileSearch className="w-4 h-4" /> Run AI Analysis
          </button>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-montserrat font-bold text-lg">Comprehensive Risk Registry ({risks.length})</h3>
          <div className="flex gap-1 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setFilter(c)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${filter === c ? 'bg-blue-700 text-white' : 'bg-white/60 dark:bg-white/5 hover:bg-white'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500 font-roboto-condensed border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">Risk</th>
                <th className="text-left py-2 px-2">Category</th>
                <th className="text-left py-2 px-2">L × I</th>
                <th className="text-left py-2 px-2">Score</th>
                <th className="text-left py-2 px-2">Level</th>
                <th className="text-left py-2 px-2">Owner</th>
                <th className="text-left py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white/50 dark:hover:bg-white/5">
                  <td className="py-2.5 px-2 font-mono text-xs">{r.id}</td>
                  <td className="py-2.5 px-2 font-medium">{r.title}</td>
                  <td className="py-2.5 px-2 text-slate-600">{r.category}</td>
                  <td className="py-2.5 px-2 text-xs">{r.likelihood} × {r.impact}</td>
                  <td className="py-2.5 px-2 font-bold">{r.score}</td>
                  <td className="py-2.5 px-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.level === 'Critical' ? 'bg-red-500/15 text-red-700' :
                      r.level === 'High' ? 'bg-orange-500/15 text-orange-700' :
                      r.level === 'Medium' ? 'bg-amber-500/15 text-amber-700' :
                      'bg-emerald-500/15 text-emerald-700'
                    }`}>{r.level}</span>
                  </td>
                  <td className="py-2.5 px-2 text-xs">{r.owner}</td>
                  <td className="py-2.5 px-2 text-xs text-slate-600">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {(showUpload || showAdd) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setShowUpload(false); setShowAdd(false); }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-montserrat font-bold text-xl">{showUpload ? 'Upload Analysis Data' : 'Register New Risk'}</h3>
              <button onClick={() => { setShowUpload(false); setShowAdd(false); }}><X className="w-5 h-5" /></button>
            </div>
            {showUpload ? (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                  <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-semibold">Drop files here</p>
                  <p className="text-xs text-slate-500">Drone footage · Images · Text · CSV · JSON</p>
                </div>
                <button onClick={() => { toast.success('Files queued for AI analysis'); setShowUpload(false); }} className="w-full px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold">Start AI Analysis</button>
              </div>
            ) : (
              <form onSubmit={handleAdd} className="space-y-3">
                <input name="title" required placeholder="Risk title" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
                <select name="category" required className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent">
                  {categories.slice(1).map(c => <option key={c}>{c}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input name="likelihood" type="number" min={1} max={5} required placeholder="Likelihood 1-5" className="px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
                  <input name="impact" type="number" min={1} max={5} required placeholder="Impact 1-5" className="px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
                </div>
                <input name="owner" required placeholder="Risk Owner (e.g. MMDA)" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
                <button type="submit" className="w-full px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold">Register Risk</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosisModule;
