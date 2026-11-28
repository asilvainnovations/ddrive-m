// ICS simulator engine: types, scoring and doctrine references. No React here, so it is tested directly.
//
// Adapted from MODE (Ormoc City CDRRMO), src/features/tools/ics/engine.ts, Apache License 2.0. Changes: scenario data
// moved to src/content/ics/metroManila.ts (sub-regional scenarios), doctrine patterns for Metro Manila instruments,
// position drills and the browser run store removed (runs are saved in ddrive_ics_runs). See THIRD_PARTY_NOTICES.md.

export type Verdict = 'best' | 'good' | 'weak' | 'unsafe';
export type Dimension = 'command' | 'coordination' | 'communication' | 'decision' | 'time';
/** Scores per option: [command, coordination, communication, decision, time], 0 to 100. */
export interface Option { t: string; v: Verdict; s: [number, number, number, number, number]; why: string }
export interface Phase {
  name: string; clock: string; eoc: 'white' | 'blue' | 'red';
  situation: string[]; intel: string; hint: string; forms: string[]; discuss: string; opts: Option[];
}
export interface Scenario { id: string; name: string; hazard: string; lgus: string[]; blurb: string; context: string; sources: string[]; phases: Phase[] }
export interface Role { id: string; abbr: string; name: string; who: string; desc: string }
export interface RubricItem { id: Dimension; name: string; w: number; desc: string }
export interface Difficulty { id: 'beginner' | 'intermediate' | 'expert'; name: string; limit: number; ttx: number; hint: boolean; desc: string }

export const RUBRIC: RubricItem[] = [
  { id: 'command', name: 'Command and control', w: 0.2, desc: 'Delegation, unity of command, span of control, clear objectives' },
  { id: 'coordination', name: 'Coordination', w: 0.2, desc: 'EOC, clusters, neighbouring LGUs, the sub-regional council' },
  { id: 'communication', name: 'Communication', w: 0.2, desc: 'Warnings, verified public information, situation reports' },
  { id: 'decision', name: 'Decision quality', w: 0.25, desc: 'Risk-informed, life safety first, legally sound' },
  { id: 'time', name: 'Timeliness', w: 0.15, desc: 'Acting within the warning lead time; decision speed' },
];

export const DIFFICULTY: Difficulty[] = [
  { id: 'beginner', name: 'Beginner', limit: 180, ttx: 420, hint: true, desc: '3 minutes per decision; doctrine hints available' },
  { id: 'intermediate', name: 'Intermediate', limit: 120, ttx: 300, hint: false, desc: '2 minutes per decision' },
  { id: 'expert', name: 'Expert', limit: 75, ttx: 180, hint: false, desc: '75 seconds per decision; intelligence costs double' },
];
export const difficultyOf = (id: string) => DIFFICULTY.find((d) => d.id === id) ?? DIFFICULTY[1];

export const VERDICT: Record<Verdict, { label: string; tone: string }> = {
  best: { label: 'Best practice', tone: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100' },
  good: { label: 'Acceptable', tone: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' },
  weak: { label: 'Weak', tone: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' },
  unsafe: { label: 'Unsafe or non-compliant', tone: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100' },
};

export const TIMEOUT_OPTION: Option = {
  t: 'No decision within the time available.', v: 'unsafe', s: [25, 20, 20, 15, 5],
  why: 'Inaction is a decision. While the EOC deliberated, the warning lead time was used up.',
};

export type Scores = Record<Dimension, number>;
export interface Pick {
  phase: number; name: string; clock: string; choice: string; verdict: Verdict; why: string; best: string; bestWhy: string;
  scores: Scores; secs: number; intel: boolean; hint: boolean; timeout: boolean; role: string; refs: string[];
}

/**
 * Score one decision. Timeliness keeps full marks for the first half of the time allowed, then falls to 60% at the
 * limit; asking for intelligence or a hint costs timeliness points.
 */
export function scoreDecision(opt: Option, secsUsed: number, secsAllowed: number, used: { intel: boolean; hint: boolean; expert: boolean }): Scores {
  const frac = secsAllowed > 0 ? Math.min(1, Math.max(0, secsUsed / secsAllowed)) : 0;
  const tmult = frac <= 0.5 ? 1 : Math.max(0.6, 1 - (0.4 * (frac - 0.5)) / 0.5);
  let time = Math.round(opt.s[4] * tmult);
  if (used.intel) time -= used.expert ? 4 : 2;
  if (used.hint) time -= 3;
  return { command: opt.s[0], coordination: opt.s[1], communication: opt.s[2], decision: opt.s[3], time: Math.max(0, time) };
}

/** Average per dimension, and the weighted total (rubric weights add up to 1). */
export function metrics(picks: Pick[]): Scores & { total: number } {
  const m = {} as Scores & { total: number };
  for (const c of RUBRIC) m[c.id] = picks.length ? Math.round(picks.reduce((a, p) => a + p.scores[c.id], 0) / picks.length) : 0;
  m.total = Math.round(RUBRIC.reduce((a, c) => a + m[c.id] * c.w, 0));
  return m;
}

export const band = (v: number) => (v >= 85 ? 'Exemplary' : v >= 70 ? 'Proficient' : v >= 55 ? 'Developing' : 'Needs further training');

const DOCTRINE_PATTERNS: [RegExp, string][] = [
  [/RA 12287|imminent disaster|anticipatory/i, 'RA 12287 and its IRR (State of Imminent Disaster, anticipatory action)'],
  [/RA 10121|state of calamity|Sec\. 16/i, 'RA 10121 (DRRM Act)'],
  [/MMDRRMC|OCD-NCR|sub-regional|neighbouring LGU|receiving LGU|host LGU/i, 'RA 10121 s. 10–12; MMDRRMC coordination'],
  [/Memo 131|EOC level|BLUE|RED|alternate EOC|deactivat/, 'NDRRMC Memo No. 131, s. 2018 (EOC)'],
  [/cluster|CCCM|DSWD|DAFAC/i, 'National cluster approach (DSWD Response and Early Recovery)'],
  [/Unified Command|ICS 211|check-in|span of control|Incident Commander/i, 'NDRRMC MC No. 4, s. 2012 (ICS)'],
  [/PAGASA|rainfall|Signal|storm surge/i, 'PAGASA warning system; RA 10639 (warnings come from authorised agencies)'],
  [/PHIVOLCS|intensity|aftershock|West Valley/i, 'PHIVOLCS bulletins; MMEIRS (JICA–MMDA–PHIVOLCS, 2004)'],
  [/Metro Yakal|quadrant/i, 'MMDA Oplan Metro Yakal Plus (earthquake response)'],
  [/alarm|Sto\. Niño/i, 'Marikina City river alarm protocol (Sto. Niño gauge)'],
  [/evacuation cent|Ligtas Pinoy|RA 12076/i, 'RA 12076 (Ligtas Pinoy Centers Act)'],
  [/school|learners|RA 10821|children/i, 'RA 10821 (Children\'s Emergency Relief and Protection Act)'],
  [/older persons|persons with disabilit|PWD|SADD|disaggregat/i, 'NDRRMP 2020–2030 inclusion; DSWD-DILG-DOH-DepEd JMC No. 02 s. 2021'],
  [/dead and missing|MDM|MC No\. 19/i, 'NDRRMC MC No. 19, s. 2016 (Management of the Dead and Missing)'],
  [/RDANA|damage assessment/i, 'NDRRMC RDANA guidelines'],
  [/PCG|sea travel|fisherfolk/i, 'PCG maritime safety mandate'],
];

/** The instruments a decision and its explanation rest on (ICS doctrine always applies). */
export function doctrineFor(...texts: string[]): string[] {
  const t = texts.join(' ');
  const out = new Set(['NDRRMC MC No. 4, s. 2012 (ICS)']);
  for (const [re, label] of DOCTRINE_PATTERNS) if (re.test(t)) out.add(label);
  return [...out];
}

/** Fisher–Yates shuffle (options appear in a new order every run). */
export function shuffled<T>(xs: T[], rnd: () => number = Math.random): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

/** Whose turn it is in a facilitated tabletop: the spotlight moves round the table, one position per phase. */
export const TTX_ROTATION = ['ic', 'osc', 'psc', 'lsc', 'pio', 'sofr', 'lofr', 'fsc', 'eoc', 'ro'];
export function spotlight(mode: 'single' | 'tabletop', roleId: string, phase: number): string {
  if (mode !== 'tabletop') return roleId;
  const i = Math.max(0, TTX_ROTATION.indexOf(roleId));
  return TTX_ROTATION[(i + phase) % TTX_ROTATION.length]!;
}

/** Build the record of one decision. */
export function pickFor(phaseIndex: number, phase: Phase, opt: Option, scores: Scores, secs: number,
  used: { intel: boolean; hint: boolean; timeout: boolean }, role: string): Pick {
  const best = phase.opts.find((o) => o.v === 'best') ?? phase.opts[0]!;
  return {
    phase: phaseIndex, name: phase.name, clock: phase.clock, choice: opt.t, verdict: opt.v, why: opt.why, best: best.t, bestWhy: best.why,
    scores, secs, intel: used.intel, hint: used.hint, timeout: used.timeout, role, refs: doctrineFor(opt.t, opt.why, best.t, best.why),
  };
}

/** Problems with a scenario set (each phase needs exactly one best option; scores are 0–100). Used by the tests. */
export function scenarioProblems(s: Scenario): string[] {
  const out: string[] = [];
  if (s.phases.length < 3) out.push(`${s.id}: fewer than three phases`);
  s.phases.forEach((p, i) => {
    if (p.opts.length < 3) out.push(`${s.id} phase ${i + 1}: fewer than three options`);
    if (p.opts.filter((o) => o.v === 'best').length !== 1) out.push(`${s.id} phase ${i + 1}: needs exactly one best option`);
    for (const o of p.opts) if (o.s.some((v) => v < 0 || v > 100)) out.push(`${s.id} phase ${i + 1}: score out of range`);
    const best = p.opts.find((o) => o.v === 'best');
    if (best && p.opts.some((o) => o !== best && o.s[3] > best.s[3])) out.push(`${s.id} phase ${i + 1}: an option outscores the best on decision quality`);
  });
  return out;
}
