// DDRiVE scoring: a copy of the database's ddrive_ha_score() and ddrive_ha_scenario_score()
// (supabase/migrations/20261122020000_phase3_ddrive_assessment.sql, ADR-006), for instant previews while scoring.
// The database computes the stored values; tests keep the two in step on the workbook's own case study.
import catalogue from './catalogue.json';

export type Method = 'workbook' | 'continuous';
export type FamilyCode = 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'H7' | 'H8';
export type LikelihoodLevel = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
export type SeverityClass = 'Below threshold' | 'Insignificant' | 'Minor' | 'Moderate' | 'Major' | 'Catastrophic';

export interface Inputs {
  exposure: number | null;
  v_infrastructure: number | null;
  v_productive: number | null;
  v_services: number | null;
  v_social: number | null;
  response: number | null;
}

export interface Score {
  total_vulnerability: number;
  likelihood: number;
  severity: number;
  likelihood_level: LikelihoodLevel;
  severity_class: SeverityClass;
  risk_code: string;
  risk_rank: number;
}

export const LIKELIHOOD_LEVELS: LikelihoodLevel[] = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
export const SEVERITY_CLASSES: Exclude<SeverityClass, 'Below threshold'>[] = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
export const LIKELIHOOD_BANDS = ['0 – 2', '2 – 4', '4 – 6', '6 – 8', '8 – 10'];
export const SEVERITY_BANDS = ['0 – 10', '11 – 25', '26 – 50', '51 – 75', '76 – 100'];

export const likelihoodBand = (lr: number) => (lr <= 2 ? 0 : lr <= 4 ? 1 : lr <= 6 ? 2 : lr <= 8 ? 3 : 4);
export const severityBand = (sr: number) => (sr <= 10 ? 0 : sr <= 25 ? 1 : sr <= 50 ? 2 : sr <= 75 ? 3 : 4);

export function riskCode(rank: number): string {
  const cat = rank <= 2 ? 'VL' : rank <= 4 ? 'L' : rank <= 6 ? 'M' : rank <= 8 ? 'H' : 'VH';
  return `${cat}${rank}`;
}

/** The risk matrix cell for a severity band (row 0 = Insignificant) and likelihood band (column 0 = Very Low). */
export const matrixCode = (sevBand: number, lrBand: number) => riskCode(sevBand + lrBand + 1);

function classify(likelihood: number, severity: number) {
  const li = likelihoodBand(likelihood);
  if (severity <= 0) {
    return { likelihood_level: LIKELIHOOD_LEVELS[li], severity_class: 'Below threshold' as SeverityClass, risk_rank: 1, risk_code: 'VL1' };
  }
  const si = severityBand(severity);
  const rank = si + li + 1;
  return { likelihood_level: LIKELIHOOD_LEVELS[li], severity_class: SEVERITY_CLASSES[si], risk_rank: rank, risk_code: riskCode(rank) };
}

/** Null until every input is given, as in the workbook. */
export function score(method: Method, i: Inputs): Score | null {
  const vals = [i.exposure, i.v_infrastructure, i.v_productive, i.v_services, i.v_social, i.response];
  if (vals.some((v) => v === null || v === undefined || !Number.isInteger(v) || v < 0 || v > 10)) return null;
  const e = i.exposure as number;
  const s = (i.v_infrastructure as number) + (i.v_productive as number) + (i.v_services as number) + (i.v_social as number);
  const total_vulnerability = s * 2.5;
  // The workbook's INDEX() truncates its fractional row number and the list is offset by one (ADR-006).
  const likelihood = method === 'continuous' ? 0.5 * e + s / 8 : Math.max(0, Math.floor((4 * e + 4 + s) / 8) - 1);
  const severity = likelihood * 10 - (i.response as number) * 10;
  return { total_vulnerability, likelihood, severity, ...classify(likelihood, severity) };
}

export interface ScenarioPart { family_code: string; likelihood: number; severity: number }
export interface ScenarioScore { likelihood: number; severity: number; likelihood_level: LikelihoodLevel; severity_class: SeverityClass; risk_code: string; risk_rank: number }

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Compound scenario: average LR; one event keeps its SR; otherwise the mean over families of Σ(LR × SR) / 10, capped at 100. */
export function scenarioScore(parts: ScenarioPart[]): ScenarioScore | null {
  if (!parts.length) return null;
  const likelihood = round2(parts.reduce((a, p) => a + p.likelihood, 0) / parts.length);
  let severity: number;
  if (parts.length === 1) severity = parts[0].severity;
  else {
    const fam = new Map<string, number>();
    for (const p of parts) fam.set(p.family_code, (fam.get(p.family_code) ?? 0) + (p.likelihood * p.severity) / 10);
    severity = round2([...fam.values()].reduce((a, b) => a + b, 0) / fam.size);
  }
  severity = Math.min(severity, 100);
  return { likelihood, severity, ...classify(likelihood, severity) };
}

// ─── Labels ──────────────────────────────────────────────────────────────────
export const SCALES = catalogue.scales as { exposure: string[]; vulnerability: string[]; response: string[] };
/** "9-Extremely likely" → "Extremely likely" */
export const scaleWord = (scale: keyof typeof SCALES, n: number | null) => (n === null ? '—' : SCALES[scale][n]?.replace(/^\d+-/, '') ?? String(n));

export const VULNERABILITY_CATEGORIES = [
  { key: 'v_infrastructure', label: 'Infrastructure' },
  { key: 'v_productive', label: 'Productive sectors' },
  { key: 'v_services', label: 'Essential or basic services' },
  { key: 'v_social', label: 'Human and social aspects' },
] as const;

export const RISK_CATEGORY_LABEL: Record<string, string> = { VL: 'Very low', L: 'Low', M: 'Medium', H: 'High', VH: 'Very high' };
export const riskCategory = (code: string | null) => (code ? RISK_CATEGORY_LABEL[code.replace(/[0-9]+$/, '')] ?? code : '—');

export const METHOD_LABEL: Record<Method, string> = {
  workbook: 'DDRiVE workbook (whole-number likelihood, matches the .xlsm and its case study)',
  continuous: 'Continuous (likelihood = 0.5 × exposure + 0.05 × total vulnerability, as the Instructions describe)',
};

export interface Family { code: FamilyCode; name: string; mainHazards: string[]; events: string[] }
export const FAMILIES = catalogue.families as Family[];
export const ALL_PERILS = catalogue.allPerils as string[];
export const familyName = (c: string) => FAMILIES.find((f) => f.code === c)?.name ?? c;
export const eventsFor = (c: string) => (c === 'H8' ? ALL_PERILS : FAMILIES.find((f) => f.code === c)?.events ?? []);
export const LIKELIHOOD_GUIDE = catalogue.likelihoodGuide as { level: string; definition: string; historical: string }[];
