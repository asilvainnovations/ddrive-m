// DRRM budget lines (Integration, Phase 4) and the actions they fund. Rules live in the database
// (supabase/migrations/20261127030000_phase4_action_links_budget.sql, ADR-009); this file reads and calls it.
import { supabase } from '@/lib/supabase';
import type { DrrmArea } from '@/lib/responseActions';

export type FundSource =
  | 'ldrrmf_70' | 'ldrrmf_qrf_30' | 'ldrrmf_trust_fund' | 'development_fund_20' | 'gad' | 'agency_budget' | 'external' | 'other';
export type LineStatus = 'draft' | 'approved' | 'closed';

export interface BudgetLine {
  id: string;
  ref: string;
  fiscal_year: number;
  fund_source: FundSource;
  drrm_area: DrrmArea;
  title: string;
  description: string | null;
  aip_code: string | null;
  amount_php: number;
  status: LineStatus;
  approval_basis: string | null;
  approved_at: string | null;
  ndrrmp_output: string | null;
  committed_php: number;
  available_php: number;
  action_count: number;
}

// RA 10121 s. 21 and NDRRMC-DBM-DILG JMC 2013-1; other sources as listed in the NDRRMC review form for local plans.
export const FUND_LABEL: Record<FundSource, string> = {
  ldrrmf_70: 'LDRRMF: 70% (mitigation, preparedness, response, recovery)',
  ldrrmf_qrf_30: 'LDRRMF: 30% Quick Response Fund (state of calamity)',
  ldrrmf_trust_fund: 'LDRRMF: unexpended, Special Trust Fund',
  development_fund_20: '20% Development Fund',
  gad: 'Gender and Development (GAD) budget',
  agency_budget: 'Agency or company budget',
  external: 'Grants, donations, ODA, partners',
  other: 'Other source',
};
export const FUND_SHORT: Record<FundSource, string> = {
  ldrrmf_70: 'LDRRMF 70%', ldrrmf_qrf_30: 'QRF 30%', ldrrmf_trust_fund: 'LDRRMF trust fund', development_fund_20: '20% DF',
  gad: 'GAD', agency_budget: 'Own budget', external: 'External', other: 'Other',
};

/** The Quick Response Fund is for response, relief and recovery (RA 10121 s. 21); the database enforces this too. */
export const fundFits = (fund: FundSource, area: DrrmArea) =>
  fund !== 'ldrrmf_qrf_30' || area === 'response' || area === 'rehabilitation_recovery';

export const peso = (n: number | null | undefined) =>
  n == null ? '—' : Number(n).toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

type Res<T> = { data: T; error: string | null };
const friendly = (m: string) =>
  /row-level security|permission denied/i.test(m) ? 'Your role does not allow this. Ask your organisation administrator if you need it.'
  : /violates foreign key/i.test(m) ? 'Actions are funded from this line, so it cannot be deleted.'
  : /violates check constraint/i.test(m) ? 'One of the values is not allowed. Check the form and try again.' : m;
const done = (error: { message: string } | null) => ({ error: error ? friendly(error.message) : null });

export async function listLines(year?: number): Promise<Res<BudgetLine[]>> {
  let q = supabase.from('ddrive_budget_line_status').select('*').order('fiscal_year', { ascending: false }).order('ref');
  if (year) q = q.eq('fiscal_year', year);
  const { data, error } = await q;
  return { data: (data as BudgetLine[]) ?? [], error: error ? friendly(error.message) : null };
}

export interface NewLine {
  fiscal_year: number; fund_source: FundSource; drrm_area: DrrmArea; title: string; description: string | null; aip_code: string | null; amount_php: number;
  ndrrmp_output?: string | null;
}
export const addLine = async (l: NewLine) => done((await supabase.from('ddrive_budget_lines').insert(l)).error);
export const deleteLine = async (id: string) => done((await supabase.from('ddrive_budget_lines').delete().eq('id', id)).error);
export const approveLine = async (id: string, basis: string) => done((await supabase.rpc('ddrive_budget_approve', { p_id: id, p_basis: basis })).error);
export const closeLine = async (id: string) => done((await supabase.rpc('ddrive_budget_close', { p_id: id })).error);
