// Integration: the organisation's self-assessment against the Gawad KALASAG LDRRMCO Assessment Toolkit CY 2026
// (RA 10121 ss. 11-12). The LGU rates itself; the Regional and National Validation Committees validate separately.
// Each indicator shows its means of verification and rating guide, and the evidence DDRiVE-M already holds.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Landmark } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { GK_ITEMS, GK_MIN_REQUIREMENTS, GK_SECTIONS, gkBand, type GkItem } from '@/content/gkToolkit';
import {
  GovernanceAssessment, GovernanceRating, SectionScore, finaliseAssessment, listAssessments, listMainstreaming, listPlans, listExercises,
  loadRatings, loadScores, saveMinRequirements, saveRating, startAssessment,
} from '@/lib/planning';
import { listLines } from '@/lib/budget';
import { card, input, primary, secondary } from '../rapidMappingModule/ui';

const thisYear = new Date().getFullYear();

/** What DDRiVE-M itself can show for an indicator, so the assessor knows where the evidence is. */
function useEvidence() {
  const [ev, setEv] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const [p, x, m, b] = await Promise.all([listPlans(), listExercises(), listMainstreaming(), listLines(thisYear)]);
      const plans = p.data;
      const approved = (k: string) => plans.filter((pl) => pl.template_key === k && pl.status === 'Approved');
      const threeYears = new Date(); threeYears.setFullYear(threeYears.getFullYear() - 3);
      const recentAar = x.data.filter((e) => e.status === 'evaluated' && e.conducted_on && new Date(e.conducted_on) >= threeYears);
      const cps = approved('contingency_plan');
      const adoptedIn = (ins: string[]) => m.data.filter((e) => e.status === 'adopted' && ins.includes(e.instrument)).length;
      const lines = b.data.filter((l) => l.status !== 'draft');
      setEv({
        '2.4.A': approved('ldrrmp').length ? `In DDRiVE-M: ${approved('ldrrmp').map((x2) => `${x2.ref} ${x2.title} (${x2.adoption_ref})`).join('; ')}` : 'No approved LDRRMP in DDRiVE-M yet (Enhancement → Plans).',
        '2.4.C': approved('lccap').length ? `In DDRiVE-M: ${approved('lccap').map((x2) => x2.ref).join(', ')}` : 'No approved LCCAP in DDRiVE-M yet.',
        '2.4.D': `In DDRiVE-M: ${cps.length} approved contingency plan${cps.length === 1 ? '' : 's'}${cps.length ? ` (${cps.map((c) => c.hazard ?? c.title).join(', ')})` : ''}.`,
        '3.1': `In DDRiVE-M: ${recentAar.length} evaluated exercise${recentAar.length === 1 ? '' : 's'} with after-action findings in the last three years (Validation).`,
        '3.2': `In DDRiVE-M: ${adoptedIn(['clup', 'zoning_ordinance', 'cdp', 'pdpfp', 'ldip', 'aip'])} risk priorities recorded as adopted in the CLUP, zoning ordinance, CDP/PDPFP, LDIP or AIP (Risk priorities in plans).`,
        '3.3': `In DDRiVE-M: ${lines.length} approved DRRM budget line${lines.length === 1 ? '' : 's'} for ${thisYear} (DRRM budget).`,
        '1.8': approved('eoc_manual').length ? `In DDRiVE-M: approved EOC manual ${approved('eoc_manual').map((x2) => x2.ref).join(', ')}.` : 'No approved EOC manual in DDRiVE-M yet.',
      });
    })();
  }, []);
  return ev;
}

const ItemRow: React.FC<{
  item: GkItem; rating: GovernanceRating | undefined; level: GovernanceAssessment['lgu_level']; editable: boolean; evidence?: string;
  onSave: (r: GovernanceRating) => Promise<void>;
}> = ({ item, rating, level, editable, evidence, onSave }) => {
  const [open, setOpen] = useState(false);
  const [ev, setEv] = useState(rating?.evidence ?? '');
  const [gap, setGap] = useState(rating?.gap_note ?? '');
  useEffect(() => { setEv(rating?.evidence ?? ''); setGap(rating?.gap_note ?? ''); }, [rating]);
  const scope = level === 'province' ? 'Provinces' : 'Cities and municipalities';
  const guide = item.rating_guide.filter((g) => !g.scope || g.scope === scope);
  const cur = rating?.score ?? null;
  const save = (patch: Partial<GovernanceRating>) => onSave({ item_code: item.code, score: cur, evidence: ev || null, gap_note: gap || null, ...patch });
  return (
    <li className="border-b border-slate-100 dark:border-slate-800 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex-1 min-w-[14rem] text-left flex items-start gap-1 text-sm">
          {open ? <ChevronDown className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /> : <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />}
          <span><span className="font-mono text-xs">{item.code}</span> {item.title}</span>
        </button>
        <label className="sr-only" htmlFor={`gk-${item.code}`}>Score for {item.code}</label>
        <select id={`gk-${item.code}`} disabled={!editable} className={cn(input, 'w-auto py-1 text-xs')} value={cur ?? ''}
          onChange={(e) => save({ score: e.target.value === '' ? null : Number(e.target.value) })}>
          <option value="">Not rated</option>
          {[3, 2, 1, 0].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      {open && (
        <div className="mt-2 ml-5 grid gap-3 lg:grid-cols-2 text-xs">
          <div className="space-y-2">
            {item.indicators.length > 0 && <div><p className="font-semibold">Indicators</p><ul className="list-disc pl-4">{item.indicators.slice(0, 12).map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
            {item.means_of_verification.length > 0 && <div><p className="font-semibold">Means of verification</p><ul className="list-disc pl-4">{item.means_of_verification.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          </div>
          <div className="space-y-2">
            <div><p className="font-semibold">Rating guide{guide.some((g) => g.scope) ? ` (${scope.toLowerCase()})` : ''}</p>
              <ul className="space-y-1">{guide.map((g, i) => <li key={i} className={cn('rounded px-2 py-1', cur === g.score ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-slate-50 dark:bg-slate-800/60')}><strong>{g.score}</strong>: {g.text}</li>)}</ul>
            </div>
            {evidence && <p className="rounded bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1">{evidence}</p>}
            <label className="block font-semibold" htmlFor={`gk-ev-${item.code}`}>Evidence held (MOVs, with references)</label>
            <textarea id={`gk-ev-${item.code}`} rows={2} disabled={!editable} className={cn(input, 'text-xs')} value={ev} onChange={(e) => setEv(e.target.value)} onBlur={() => ev !== (rating?.evidence ?? '') && save({ evidence: ev || null })} />
            <label className="block font-semibold" htmlFor={`gk-gap-${item.code}`}>Gap and what will close it</label>
            <textarea id={`gk-gap-${item.code}`} rows={2} disabled={!editable} className={cn(input, 'text-xs')} value={gap} onChange={(e) => setGap(e.target.value)} onBlur={() => gap !== (rating?.gap_note ?? '') && save({ gap_note: gap || null })} />
          </div>
        </div>
      )}
    </li>
  );
};

const GovernancePanel: React.FC = () => {
  const { can } = useAuth();
  const [list, setList] = useState<GovernanceAssessment[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [ratings, setRatings] = useState<GovernanceRating[]>([]);
  const [scores, setScores] = useState<SectionScore[]>([]);
  const [year, setYear] = useState(thisYear);
  const [level, setLevel] = useState<GovernanceAssessment['lgu_level']>('city_municipality');
  const evidence = useEvidence();
  const loadList = useCallback(async () => {
    const { data } = await listAssessments();
    setList(data);
    setCurrent((c) => c ?? data[0]?.id ?? null);
  }, []);
  useEffect(() => { loadList(); }, [loadList]);
  const loadOne = useCallback(async () => {
    if (!current) return;
    const [r, s] = await Promise.all([loadRatings(current), loadScores(current)]);
    setRatings(r.data); setScores(s.data);
  }, [current]);
  useEffect(() => { loadOne(); }, [loadOne]);

  const a = list.find((x) => x.id === current) ?? null;
  const editable = !!a && a.status === 'draft' && can('analyst');
  const byCode = useMemo(() => new Map(ratings.map((r) => [r.item_code, r])), [ratings]);
  const mean = scores[0]?.weighted_mean ?? null;
  const band = gkBand(mean == null ? null : Number(mean));
  const gaps = GK_ITEMS.filter((i) => (byCode.get(i.code)?.score ?? 3) < 2);

  const onSave = async (r: GovernanceRating) => {
    if (!current) return;
    const { error } = await saveRating(current, r);
    if (error) toast.error(error); else loadOne();
  };

  return (
    <section className={cn(card, 'space-y-5')} aria-labelledby="gov-h">
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center"><Landmark className="w-5 h-5 text-white" aria-hidden="true" /></div>
        <div className="flex-1 min-w-[16rem]">
          <h2 id="gov-h" className="font-montserrat font-bold text-lg">DRRM governance self-assessment</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            The council and office against the Gawad KALASAG LDRRMCO Assessment Toolkit CY 2026: 32 indicators in six criteria, rated 0 to 3, with the toolkit's weights
            (Structure 25%, Competency 35%, Management Systems 15%, Enabling Policies 5%, Knowledge Management 10%, Partnership 10%). This is the LGU's own rating;
            the Regional and National Validation Committees validate it separately.
          </p>
        </div>
        {list.length > 0 && (
          <label className="text-xs flex items-center gap-1">Assessment
            <select className={cn(input, 'py-1 w-auto')} value={current ?? ''} onChange={(e) => setCurrent(e.target.value)}>
              {list.map((x) => <option key={x.id} value={x.id}>{x.ref} · {x.assessment_year} ({x.status})</option>)}
            </select>
          </label>
        )}
      </div>

      {can('analyst') && (
        <form className="flex flex-wrap items-end gap-2 text-xs" onSubmit={async (e) => {
          e.preventDefault();
          const { id, error } = await startAssessment(year, level);
          if (error) toast.error(error); else { toast.success(`Assessment for ${year} started.`); await loadList(); setCurrent(id); }
        }}>
          <label>Year<input type="number" min={2020} max={2100} className={cn(input, 'py-1 w-24 block')} value={year} onChange={(e) => setYear(Number(e.target.value))} /></label>
          <label>Level<select className={cn(input, 'py-1 w-auto block')} value={level} onChange={(e) => setLevel(e.target.value as GovernanceAssessment['lgu_level'])}>
            <option value="city_municipality">City or municipality</option><option value="province">Province</option></select></label>
          <button type="submit" className={secondary}>Start assessment</button>
        </form>
      )}

      {!a && <p className="text-sm text-slate-500">No assessment yet.</p>}
      {a && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold mb-1">Scores ({scores[0]?.total_rated ?? 0} of {scores[0]?.total_items ?? 32} rated)</h3>
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-500"><th className="py-1">Criterion</th><th>Weight</th><th>Rated</th><th>Average</th></tr></thead>
                <tbody>{scores.map((s) => (
                  <tr key={s.section} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1">{s.title}</td><td>{Math.round(Number(s.weight) * 100)}%</td><td>{s.rated} / {s.items}</td><td>{s.average ?? '—'}</td></tr>
                ))}</tbody>
              </table>
              <p className="mt-2 text-sm">Weighted mean: <strong>{mean ?? 'when every indicator is rated'}</strong>{band && <> · <strong>{band.label}</strong></>}</p>
              {band && <p className="text-xs text-slate-600 dark:text-slate-300">{band.description}</p>}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">Minimum requirements (Checklist I)</h3>
              <p className="text-xs text-slate-600 mb-1">Without all six, the LGU is not endorsed to the national awards.</p>
              <ul className="space-y-1 text-xs">
                {GK_MIN_REQUIREMENTS.map((m) => {
                  const v = a.min_requirements?.[m.key];
                  return (
                    <li key={m.key} className="flex items-center gap-2">
                      <select aria-label={m.label} disabled={!editable && !(a.status === 'draft' && can('drrm_officer'))} className={cn(input, 'py-0.5 w-auto text-xs')} value={v === undefined ? '' : v ? 'yes' : 'no'}
                        onChange={async (e) => {
                          const next = { ...a.min_requirements, [m.key]: e.target.value === 'yes' };
                          const { error } = await saveMinRequirements(a.id, next);
                          if (error) toast.error(error); else loadList();
                        }}>
                        <option value="">?</option><option value="yes">Yes</option><option value="no">No</option>
                      </select>
                      <span>{m.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {GK_SECTIONS.map((s) => (
            <div key={s.key}>
              <h3 className="text-sm font-semibold mt-2">{s.title} <span className="text-slate-500 font-normal">({Math.round(s.weight * 100)}%)</span></h3>
              <ul>{GK_ITEMS.filter((i) => i.section === s.key).map((i) => (
                <ItemRow key={i.code} item={i} rating={byCode.get(i.code)} level={a.lgu_level} editable={editable} evidence={evidence[i.code]} onSave={onSave} />
              ))}</ul>
            </div>
          ))}

          {gaps.length > 0 && ratings.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-xs">
              <p className="font-semibold">Indicators rated below 2: improvement priorities</p>
              <ul className="list-disc pl-4">{gaps.filter((g) => byCode.get(g.code)?.score != null).map((g) => <li key={g.code}>{g.code} {g.title}{byCode.get(g.code)?.gap_note ? `: ${byCode.get(g.code)?.gap_note}` : ''}</li>)}</ul>
              <p className="mt-1">Turn each into an action in <Link to="/response?tab=actions" className="underline font-semibold">Response</Link> and fund it in the DRRM budget.</p>
            </div>
          )}

          {a.status === 'draft' && can('drrm_officer') && (
            <button type="button" className={primary} onClick={async () => {
              const { error } = await finaliseAssessment(a.id);
              if (error) toast.error(error); else { toast.success('Assessment finalised.'); loadList(); }
            }}>Finalise assessment</button>
          )}
          {a.status === 'final' && <p className="text-xs text-slate-600">Final on {a.finalized_at?.slice(0, 10)}. Ratings are locked.</p>}
        </>
      )}
    </section>
  );
};

export default GovernancePanel;
