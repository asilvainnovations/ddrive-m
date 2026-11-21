// The organisation's risk register (ISO 31000 likelihood × impact). Risks are typed in here, or added from a scored
// DDRiVE hazard event, which keeps its DDRiVE rating and a link back (ADR-006).
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { toast } from '@/components/ui/sonner';
import { useRisks, Risk } from '@/hooks/useDDriveData';
import { addRisk } from '@/lib/actions';
import GatedButton from '@/components/ddrive/GatedButton';

const categories = ['All', 'Strategic', 'Operational', 'Financial', 'Compliance', 'Environmental'];
type DdriveRisk = Risk & { ddrive_risk_code?: string | null; total_vulnerability?: number | null; hazard_entry_id?: string | null };

const levelClass = (l: string) =>
  l === 'Critical' ? 'bg-red-100 text-red-900' : l === 'High' ? 'bg-orange-100 text-orange-900' : l === 'Medium' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900';
const cellClass = (score: number) => (score >= 20 ? 'bg-red-600' : score >= 12 ? 'bg-orange-500' : score >= 6 ? 'bg-amber-400 text-slate-900' : 'bg-emerald-600');

const RiskRegister: React.FC<{ onOpenAssessment?: (entryId: string) => void }> = () => {
  const { data, refetch, error } = useRisks();
  const risks = data as DdriveRisk[];
  const [filter, setFilter] = useState('All');
  const [origin, setOrigin] = useState<'all' | 'ddrive'>('all');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = risks
    .filter((r) => filter === 'All' || r.category === filter)
    .filter((r) => origin === 'all' || Boolean(r.ddrive_risk_code));

  const matrix = Array.from({ length: 5 }, (_, i) => Array.from({ length: 5 }, (_, j) => {
    const likelihood = 5 - i;
    const impact = j + 1;
    return { likelihood, impact, score: likelihood * impact, count: risks.filter((r) => r.likelihood === likelihood && r.impact === impact).length };
  }));

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Score, level, id and reference number are set by the database from the organisation's risk criteria.
    const { error: err, ref } = await addRisk({
      title: String(form.get('title') ?? ''),
      category: String(form.get('category') ?? 'Operational'),
      likelihood: parseInt(form.get('likelihood') as string),
      impact: parseInt(form.get('impact') as string),
      owner: String(form.get('owner') ?? ''),
    });
    if (err) { toast.error(err); return; }
    toast.success(`Risk ${ref ?? ''} saved`);
    setShowAdd(false);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-6 lg:col-span-2" hover={false}>
          <h3 className="font-montserrat font-bold text-lg mb-1">Risk register matrix (likelihood × impact)</h3>
          <p className="text-xs text-slate-500 mb-3">Each cell shows the score and how many risks sit in it. Levels follow your organisation's risk criteria (Settings → Organisation).</p>
          <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
            <span className="text-[10px] font-bold text-slate-500 [writing-mode:vertical-rl] rotate-180">Likelihood (5 → 1)</span>
            <div className="grid grid-cols-5 gap-1" role="table" aria-label="Risk matrix">
              {matrix.flat().map((c) => (
                <div key={`${c.likelihood}-${c.impact}`} role="cell" className={`${cellClass(c.score)} aspect-square rounded-lg flex flex-col items-center justify-center text-white`}
                     aria-label={`Likelihood ${c.likelihood}, impact ${c.impact}: score ${c.score}, ${c.count} risk${c.count === 1 ? '' : 's'}`}>
                  <span className="text-xs font-bold">{c.score}</span>
                  {c.count > 0 && <span className="text-[10px] mt-0.5 px-1 rounded bg-black/30">{c.count}</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="text-center text-[10px] font-bold text-slate-500 mt-2">Impact (1 → 5)</div>
        </GlassCard>
        <GlassCard className="p-6" hover={false}>
          <h3 className="font-montserrat font-bold text-lg mb-2">From DDRiVE assessments</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            A scored hazard event can be added to this register from its assessment. Its DDRiVE likelihood level (Very Low … Very High) becomes
            likelihood 1–5, and its severity class (Insignificant … Catastrophic) becomes impact 1–5. The DDRiVE rating and total vulnerability are kept.
          </p>
          <p className="mt-2 text-sm"><strong>{risks.filter((r) => r.ddrive_risk_code).length}</strong> of {risks.length} risks came from an assessment.</p>
        </GlassCard>
      </div>

      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-montserrat font-bold text-lg">Risk register ({risks.length})</h3>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex gap-1 flex-wrap" role="group" aria-label="Category">
              {categories.map((c) => (
                <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${filter === c ? 'bg-blue-700 text-white' : 'bg-white/60 dark:bg-white/5 border border-slate-200'}`}>{c}</button>
              ))}
            </div>
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={origin === 'ddrive'} onChange={(e) => setOrigin(e.target.checked ? 'ddrive' : 'all')} /> Only from assessments
            </label>
            <GatedButton min="analyst" onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" aria-hidden="true" /> Add risk
            </GatedButton>
          </div>
        </div>
        {error && <p className="text-sm text-red-800">The register could not be loaded.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-2">Ref</th><th className="text-left py-2 px-2">Risk</th><th className="text-left py-2 px-2">Category</th>
                <th className="text-left py-2 px-2">L × I</th><th className="text-left py-2 px-2">Score</th><th className="text-left py-2 px-2">Level</th>
                <th className="text-left py-2 px-2">DDRiVE</th><th className="text-left py-2 px-2">Owner</th><th className="text-left py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="py-4 text-center text-slate-500">No risks yet.</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 px-2 font-mono text-xs">{r.ref}</td>
                  <td className="py-2.5 px-2 font-medium">{r.title}</td>
                  <td className="py-2.5 px-2 text-slate-600">{r.category}</td>
                  <td className="py-2.5 px-2 text-xs">{r.likelihood} × {r.impact}</td>
                  <td className="py-2.5 px-2 font-bold">{r.score}</td>
                  <td className="py-2.5 px-2"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${levelClass(r.level)}`}>{r.level}</span></td>
                  <td className="py-2.5 px-2 text-xs">{r.ddrive_risk_code ? <span title={`Total vulnerability ${r.total_vulnerability}/100`}><strong>{r.ddrive_risk_code}</strong> · TV {Number(r.total_vulnerability)}</span> : '—'}</td>
                  <td className="py-2.5 px-2 text-xs">{r.owner}</td>
                  <td className="py-2.5 px-2 text-xs text-slate-600">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="add-risk-title" className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 id="add-risk-title" className="font-montserrat font-bold text-xl">Register a risk</h3>
              <button type="button" onClick={() => setShowAdd(false)} aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <input name="title" required aria-label="Risk title" placeholder="Risk title" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <select name="category" required aria-label="Category" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent">
                {categories.slice(1).map((c) => <option key={c}>{c}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input name="likelihood" type="number" min={1} max={5} required aria-label="Likelihood 1 to 5" placeholder="Likelihood 1-5" className="px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
                <input name="impact" type="number" min={1} max={5} required aria-label="Impact 1 to 5" placeholder="Impact 1-5" className="px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              </div>
              <input name="owner" required aria-label="Risk owner" placeholder="Risk owner (office or person)" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <button type="submit" className="w-full px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold">Register risk</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskRegister;
