// DDRiVER AI from the app. Every call goes to the ddriver-ai Edge Function, which reads the data as the signed-in
// user and keeps the model key (ADR-011). The browser only names the task and the record.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AiTask = 'ask' | 'explain_alert' | 'explain_rating' | 'suggest_treatments' | 'situation_brief' | 'funding_gaps';
export type AiStyle = 'concise' | 'detailed';

export interface AiSource { key: string; label: string; href: string | null; kind: 'record' | 'reference' }
export interface AiSuggestion { title: string; strategy: string; drrm_area: string; rationale: string }
export interface AiAnswer {
  log_id: string;
  answer: string;
  sources: AiSource[];
  suggestions: AiSuggestion[];
  removed_citations: number;
  model: string;
  notice: string;
}
export interface AiStatus { enabled: boolean; user_limit: number; org_limit: number; used_by_me_today: number; used_by_org_today: number }

const STYLE_KEY = 'ddriver-style';
export function getStyle(): AiStyle {
  try { return localStorage.getItem(STYLE_KEY) === 'detailed' ? 'detailed' : 'concise'; } catch { return 'concise'; }
}
export function setStyle(s: AiStyle) { try { localStorage.setItem(STYLE_KEY, s); } catch { /* storage unavailable */ } }

export async function askDdriver(task: AiTask, opts: { subject?: string; question?: string; history?: { role: 'user' | 'assistant'; content: string }[] } = {}):
  Promise<{ data: AiAnswer | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('ddriver-ai', { body: { task, style: getStyle(), ...opts } });
  if (error) {
    // The function answers with { error } in plain words; show that, not the transport message.
    let message = 'DDRiVER AI could not answer just now. Try again, or continue without it.';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') message = (await ctx.json())?.error ?? message;
    } catch { /* keep the default */ }
    return { data: null, error: message };
  }
  return { data: data as AiAnswer, error: null };
}

export async function aiStatus(): Promise<AiStatus | null> {
  const { data } = await supabase.rpc('ddrive_ai_status');
  return (data as AiStatus) ?? null;
}
export async function configureAi(enabled: boolean, userLimit?: number, orgLimit?: number) {
  const { error } = await supabase.rpc('ddrive_ai_configure', { p_enabled: enabled, p_user_limit: userLimit ?? null, p_org_limit: orgLimit ?? null });
  return { error: error?.message ?? null };
}
export async function sendFeedback(logId: string, feedback: 'helpful' | 'not_helpful', note?: string) {
  const { error } = await supabase.rpc('ddrive_ai_feedback', { p_id: logId, p_feedback: feedback, p_note: note ?? null });
  return { error: error?.message ?? null };
}

// The organisation's AI status, shared by every "Ask DDRiVER" button on a page (one request per page load).
let cached: { at: number; p: Promise<AiStatus | null> } | null = null;
export function refreshAiStatus() { cached = null; }
export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    if (!cached || Date.now() - cached.at > 60_000) cached = { at: Date.now(), p: aiStatus() };
    let live = true;
    cached.p.then((s) => { if (live) setStatus(s); });
    return () => { live = false; };
  }, []);
  return status;
}

/** Splits an answer into text and citation markers, so citations can be shown as links to the sources. */
export function splitCitations(text: string): ({ t: string } | { cite: string[] })[] {
  const out: ({ t: string } | { cite: string[] })[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[(S\d+(?:,\s*S\d+)*)\]/g)) {
    if (m.index! > last) out.push({ t: text.slice(last, m.index) });
    out.push({ cite: m[1].split(',').map((s) => s.trim()) });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
