// Validation · ICS simulator for a sub-region (ADR-019). Individual runs and facilitated tabletops on Metro Manila
// scenarios: each phase is a decision under time pressure, scored on five dimensions, with the doctrine behind the
// best answer. Runs are saved to the organisation (ddrive_ics_runs) and can be linked to an exercise as evidence.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Lightbulb, Pause, Play, Printer, Radio, RotateCcw, Save } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { listExercises, type Exercise } from '@/lib/planning';
import { esc, printDocument } from '@/lib/printDoc';
import { DIFFICULTY, RUBRIC, TIMEOUT_OPTION, VERDICT, band, difficultyOf, metrics, pickFor, scoreDecision, shuffled, spotlight, type Pick } from '@/lib/ics/engine';
import { FORMS, ROLES, SCENARIOS, roleOf, scenarioOf } from '@/content/ics/metroManila';
import { METRO_MANILA } from '@/content/subRegions';
import { LEVELS } from '@/lib/eoc';
import { Field, card, input, primary, secondary } from '../rapidMappingModule/ui';

type Mode = 'single' | 'tabletop';
interface Setup { mode: Mode; participant: string; office: string; role: string; scenario: string; difficulty: 'beginner' | 'intermediate' | 'expert'; exerciseId: string }
interface Live { phase: number; order: number[]; intel: boolean; hint: boolean; left: number; total: number; elapsed: number; paused: boolean; picks: Pick[]; shown: Pick | null }

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const lguName = (c: string) => METRO_MANILA.lgus.find((l) => l.psgc === c)?.name ?? c;

export function printIcsAar(setup: Setup, picks: Pick[], seconds: number) {
  const s = scenarioOf(setup.scenario)!; const m = metrics(picks);
  const rows = picks.map((p) => `<tr><td>${esc(p.clock)}<br>${esc(p.name)}</td><td>${esc(roleOf(p.role).abbr)}</td><td>${esc(p.choice)}<br><em>${esc(VERDICT[p.verdict].label)}</em>${p.timeout ? ' (time ran out)' : ''}</td><td>${esc(p.verdict === 'best' ? '' : p.best)}</td><td>${esc(p.refs.join('; '))}</td></tr>`).join('');
  printDocument(`ICS exercise AAR: ${s.name}`, `<h1>ICS exercise: after-action summary</h1>
<p class="meta">${esc(s.name)} · ${esc(setup.mode === 'tabletop' ? 'Facilitated tabletop' : 'Individual run')} · ${esc(setup.participant)}${setup.office ? `, ${esc(setup.office)}` : ''} · ${esc(difficultyOf(setup.difficulty).name)} · ${fmt(seconds)}</p>
<p>Overall ${m.total}/100 (${esc(band(m.total))}). ${RUBRIC.map((r) => `${esc(r.name)} ${m[r.id]}`).join(' · ')}</p>
<table><thead><tr><th>Phase</th><th>Position</th><th>Decision</th><th>Best practice</th><th>Basis</th></tr></thead><tbody>${rows}</tbody></table>
<p class="src">Training scenario for ${esc(METRO_MANILA.name)}; not a forecast. Sources: ${esc(s.sources.join('; '))}.</p>`);
}

const IcsSimulator: React.FC = () => {
  const { activeTenant } = useAuth();
  const [setup, setSetup] = useState<Setup>({ mode: 'single', participant: '', office: '', role: 'ic', scenario: SCENARIOS[0]!.id, difficulty: 'intermediate', exerciseId: '' });
  const [live, setLive] = useState<Live | null>(null);
  const [done, setDone] = useState<{ picks: Pick[]; seconds: number; saved: boolean } | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const scenario = scenarioOf(setup.scenario)!;
  const diff = difficultyOf(setup.difficulty);
  const tick = useRef<number | null>(null);

  useEffect(() => { listExercises().then((r) => setExercises((r.data ?? []).filter((e) => e.status === 'planned' || e.status === 'conducted'))); }, [activeTenant]);

  const startPhase = (i: number, picks: Pick[], elapsed: number) => {
    const secs = setup.mode === 'tabletop' ? diff.ttx : diff.limit;
    setLive({ phase: i, order: shuffled(scenario.phases[i]!.opts.map((_, k) => k)), intel: false, hint: false, left: secs, total: secs, elapsed, paused: false, picks, shown: null });
  };
  const start = () => {
    if (setup.participant.trim().length < 2) { toast.error('Enter the participant or team name.'); return; }
    setDone(null); startPhase(0, [], 0);
  };

  const choose = (optIndex: number | null) => {
    setLive((l) => {
      if (!l || l.shown) return l;
      const ph = scenario.phases[l.phase]!;
      const opt = optIndex === null ? TIMEOUT_OPTION : ph.opts[optIndex]!;
      const used = l.total - l.left;
      const scores = scoreDecision(opt, used, l.total, { intel: l.intel, hint: l.hint, expert: setup.difficulty === 'expert' });
      const pick = pickFor(l.phase, ph, opt, scores, used, { intel: l.intel, hint: l.hint, timeout: optIndex === null }, spotlight(setup.mode, setup.role, l.phase));
      return { ...l, picks: [...l.picks, pick], shown: pick, paused: true };
    });
  };

  useEffect(() => {
    if (!live || live.paused || live.shown) return;
    tick.current = window.setInterval(() => {
      setLive((l) => (l && !l.paused && !l.shown ? { ...l, left: l.left - 1, elapsed: l.elapsed + 1 } : l));
    }, 1000);
    return () => { if (tick.current) window.clearInterval(tick.current); };
  }, [live?.paused, live?.shown, live?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (live && !live.shown && live.left <= 0) choose(null); }, [live?.left]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    if (!live) return;
    if (live.phase + 1 < scenario.phases.length) startPhase(live.phase + 1, live.picks, live.elapsed);
    else { setDone({ picks: live.picks, seconds: live.elapsed, saved: false }); setLive(null); }
  };

  const save = async () => {
    if (!done) return;
    setSaving(true);
    const m = metrics(done.picks);
    const { total, ...scores } = m;
    const { error } = await supabase.from('ddrive_ics_runs').insert({
      participant: setup.participant.trim(), office: setup.office.trim() || null, mode: setup.mode, role: setup.role, scenario_id: scenario.id,
      scenario_name: scenario.name, difficulty: setup.difficulty, seconds: done.seconds, total, scores, picks: done.picks, exercise_id: setup.exerciseId || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Run saved to your organisation'); setDone({ ...done, saved: true });
  };

  const m = useMemo(() => (done ? metrics(done.picks) : null), [done]);

  if (live) {
    const ph = scenario.phases[live.phase]!;
    const who = roleOf(spotlight(setup.mode, setup.role, live.phase));
    const low = live.left <= Math.max(10, live.total * 0.15);
    return (
      <section className={card} aria-labelledby="ics-phase">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">{scenario.name} · phase {live.phase + 1} of {scenario.phases.length} · {ph.clock}</p>
            <h3 id="ics-phase" className="font-montserrat font-bold text-lg">{ph.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${LEVELS[ph.eoc].badge}`}>EOC {LEVELS[ph.eoc].label} (scenario)</span>
            <span role="timer" aria-live="off" className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-mono ${low ? 'bg-red-100 text-red-900' : 'bg-slate-100 dark:bg-slate-800'}`}><Clock className="w-4 h-4" aria-hidden />{fmt(Math.max(0, live.left))}</span>
            {!live.shown && <button type="button" className={secondary} onClick={() => setLive({ ...live, paused: !live.paused })} aria-label={live.paused ? 'Resume the clock' : 'Pause the clock'}>{live.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}</button>}
          </div>
        </div>
        <p className="text-sm mb-2"><strong>Your position:</strong> {who.name} ({who.abbr}) — {who.desc}</p>
        <div className="space-y-2 text-sm mb-3">{ph.situation.map((p, i) => <p key={i}>{p}</p>)}</div>
        <div className="flex flex-wrap gap-2 mb-3">
          <button type="button" className={secondary} disabled={live.intel || !!live.shown} onClick={() => setLive({ ...live, intel: true })}><Radio className="w-4 h-4" aria-hidden /> Request intelligence</button>
          {diff.hint && <button type="button" className={secondary} disabled={live.hint || !!live.shown} onClick={() => setLive({ ...live, hint: true })}><Lightbulb className="w-4 h-4" aria-hidden /> Doctrine hint</button>}
          <span className="text-xs text-slate-500 self-center">Forms: {ph.forms.map((f) => `ICS ${f} ${FORMS[f] ?? ''}`).join(', ')}</span>
        </div>
        {live.intel && <p className="text-sm rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3 mb-2">{ph.intel}</p>}
        {live.hint && <p className="text-sm rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 mb-2">{ph.hint}</p>}
        <fieldset disabled={!!live.shown || live.paused} className="space-y-2">
          <legend className="text-sm font-semibold mb-1">What do you do?</legend>
          {live.order.map((k) => (
            <button key={k} type="button" onClick={() => choose(k)} className="w-full text-left p-3 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm min-h-[44px] disabled:opacity-60">{ph.opts[k]!.t}</button>
          ))}
        </fieldset>
        {live.shown && (
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4" role="status">
            <p className="mb-2"><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${VERDICT[live.shown.verdict].tone}`}>{VERDICT[live.shown.verdict].label}</span>{live.shown.timeout && <span className="ml-2 text-sm">Time ran out.</span>}</p>
            <p className="text-sm mb-2">{live.shown.why}</p>
            {live.shown.verdict !== 'best' && <p className="text-sm mb-2"><strong>Best practice:</strong> {live.shown.best} <span className="text-slate-600 dark:text-slate-300">{live.shown.bestWhy}</span></p>}
            <p className="text-xs text-slate-500 mb-2">Basis: {live.shown.refs.join('; ')}</p>
            {setup.mode === 'tabletop' && <p className="text-sm mb-2"><strong>Discuss:</strong> {ph.discuss}</p>}
            <button type="button" className={primary} onClick={next}>{live.phase + 1 < scenario.phases.length ? 'Next operational period' : 'See results'}</button>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {done && m && (
        <section className={card} aria-labelledby="ics-results">
          <h3 id="ics-results" className="font-montserrat font-bold text-lg mb-1">Results: {m.total}/100 · {band(m.total)}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{scenario.name} · {fmt(done.seconds)} · {done.picks.filter((p) => p.verdict === 'best').length} of {done.picks.length} best-practice decisions</p>
          <dl className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
            {RUBRIC.map((r) => <div key={r.id} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2"><dt className="text-xs text-slate-500">{r.name}</dt><dd className="text-xl font-bold">{m[r.id]}</dd></div>)}
          </dl>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primary} disabled={saving || done.saved || !activeTenant} onClick={save}><Save className="w-4 h-4" aria-hidden />{done.saved ? 'Saved' : 'Save run'}</button>
            <button type="button" className={secondary} onClick={() => printIcsAar(setup, done.picks, done.seconds)}><Printer className="w-4 h-4" aria-hidden /> Print summary</button>
            <button type="button" className={secondary} onClick={start}><RotateCcw className="w-4 h-4" aria-hidden /> Run again</button>
          </div>
        </section>
      )}
      <section className={card} aria-labelledby="ics-setup">
        <h3 id="ics-setup" className="font-montserrat font-bold text-lg mb-1">ICS simulator: {METRO_MANILA.name}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Decisions under time pressure on multi-LGU scenarios, scored on command, coordination, communication, decision quality and timeliness. Training only; the scenarios are composites, not forecasts.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <Field id="ics-participant" label="Participant or team"><input id="ics-participant" className={input} value={setup.participant} onChange={(e) => setSetup({ ...setup, participant: e.target.value })} /></Field>
          <Field id="ics-office" label="Office (optional)"><input id="ics-office" className={input} value={setup.office} onChange={(e) => setSetup({ ...setup, office: e.target.value })} /></Field>
          <Field id="ics-mode" label="Format"><select id="ics-mode" className={input} value={setup.mode} onChange={(e) => setSetup({ ...setup, mode: e.target.value as Mode })}>
            <option value="single">Individual run: one position throughout</option><option value="tabletop">Facilitated tabletop: the spotlight moves round the table</option></select></Field>
          <Field id="ics-role" label={setup.mode === 'tabletop' ? 'Starting position' : 'Position'}><select id="ics-role" className={input} value={setup.role} onChange={(e) => setSetup({ ...setup, role: e.target.value })}>
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.abbr})</option>)}</select></Field>
          <Field id="ics-scenario" label="Scenario"><select id="ics-scenario" className={input} value={setup.scenario} onChange={(e) => setSetup({ ...setup, scenario: e.target.value })}>
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field id="ics-diff" label="Difficulty" hint={diff.desc}><select id="ics-diff" className={input} value={setup.difficulty} onChange={(e) => setSetup({ ...setup, difficulty: e.target.value as Setup['difficulty'] })}>
            {DIFFICULTY.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field id="ics-ex" label="Link to an exercise (optional)" hint="The saved run becomes evidence for that exercise."><select id="ics-ex" className={input} value={setup.exerciseId} onChange={(e) => setSetup({ ...setup, exerciseId: e.target.value })}>
            <option value="">No exercise</option>{exercises.map((x) => <option key={x.id} value={x.id}>{x.ref} {x.title}</option>)}</select></Field>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm">
          <p className="font-semibold">{scenario.name} · {scenario.hazard}</p>
          <p className="mb-1">{scenario.blurb}</p>
          <p className="text-slate-600 dark:text-slate-300 mb-1">{scenario.context}</p>
          <p className="text-xs text-slate-500">LGUs: {scenario.lgus.map(lguName).join(', ')}. Sources: {scenario.sources.join('; ')}.</p>
        </div>
        <button type="button" className={`${primary} mt-4`} onClick={start}><Play className="w-4 h-4" aria-hidden /> Start</button>
      </section>
    </div>
  );
};

export default IcsSimulator;
