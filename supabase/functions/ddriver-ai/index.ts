// Supabase Edge Function: DDRiVER AI (ADR-011).
//
// Called from the app by a signed-in user. The function:
//   1. checks the user's session with Supabase Auth;
//   2. asks the database whether this user may ask now (organisation opted in, daily limits) and opens a log entry;
//   3. reads the sources for the task WITH THE USER'S OWN TOKEN, so Row Level Security decides what the model may see;
//      the browser only names the task and the record, it never supplies the data;
//   4. calls Claude with the policy rules, the sources and the question;
//   5. removes citations to sources that were not given, parses suggestions, logs the answer, and returns it.
// The model key never leaves this function.
//
// Environment: SUPABASE_URL, SUPABASE_SECRET_KEYS or SUPABASE_SERVICE_ROLE_KEY (set by Supabase),
//   ANTHROPIC_API_KEY (required), DDRIVER_MODEL (default claude-sonnet-5-5),
//   ANTHROPIC_BASE_URL (tests only), DDRIVER_ALLOWED_ORIGINS (comma-separated; default the production site).
// Deploy with verify_jwt = false (supabase/config.toml): the function checks the session itself.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.106.2';
import { readServerKeys } from '../_shared/auth.ts';
import {
  ModelError, PROMPT_VERSION, TASKS, callClaude, checkCitations, numberSources, parseSuggestions, sourcesBlock, systemPrompt, trimHistory,
  type Source, type Task,
} from '../_shared/ddriver.ts';

const env = (k: string) => Deno.env.get(k) ?? undefined;
const SUPABASE_URL = env('SUPABASE_URL') ?? '';
const KEYS = readServerKeys((n) => Deno.env.get(n));
const API_KEY = env('ANTHROPIC_API_KEY') ?? '';
const MODEL = env('DDRIVER_MODEL') ?? 'claude-sonnet-5-5';
const BASE_URL = env('ANTHROPIC_BASE_URL');
const ORIGINS = (env('DDRIVER_ALLOWED_ORIGINS') ?? 'https://ddrive-m.asilvainnovations.com').split(',').map((s) => s.trim()).filter(Boolean);

function cors(req: Request): Record<string, string> {
  const o = req.headers.get('origin') ?? '';
  return {
    'access-control-allow-origin': ORIGINS.includes(o) || ORIGINS.includes('*') ? o : ORIGINS[0],
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'origin',
  };
}

type Rec = Omit<Source, 'key'>;
const line = (o: Record<string, unknown>) => Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== '')
  .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join('\n');
const manila = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) + ' PHT' : null);

// ─── Sources per task, read as the user ──────────────────────────────────────
async function alertsInArea(db: SupabaseClient, limit = 8): Promise<Rec[]> {
  const { data } = await db.from('ddrive_active_alerts').select('id, source, event, headline, signal_level, magnitude, alert_level, area_names, sent, expires, instruction, cap_url')
    .eq('in_watch_area', true).order('sent', { ascending: false }).limit(limit);
  return (data ?? []).map((a) => ({ kind: 'record', label: `${a.source} alert: ${a.signal_level ? `Wind Signal No. ${a.signal_level}` : a.event}`, href: a.cap_url,
    text: line({ agency: a.source, event: a.event, headline: a.headline, signal: a.signal_level, magnitude: a.magnitude, level: a.alert_level,
      areas: (a.area_names ?? []).slice(0, 12), issued: manila(a.sent), expires: manila(a.expires), instruction: a.instruction?.slice(0, 800) }) }));
}
async function openHazards(db: SupabaseClient, limit = 10): Promise<Rec[]> {
  const { data } = await db.from('ddrive_hazards').select('id, agency, type, name, severity, location, status, origin, detected_at')
    .in('status', ['Active', 'Monitoring']).order('detected_at', { ascending: false }).limit(limit);
  return (data ?? []).map((h) => ({ kind: 'record', label: `Hazard record: ${h.name}`, href: '/detection',
    text: line({ agency: h.agency, type: h.type, severity: h.severity, place: h.location, status: h.status, from: h.origin === 'official' ? 'official alert' : 'field report', detected: manila(h.detected_at) }) }));
}
async function topRisks(db: SupabaseClient, limit = 8): Promise<Rec[]> {
  const { data } = await db.from('ddrive_risks').select('id, ref, title, category, likelihood, impact, score, level, status, ddrive_risk_code')
    .order('score', { ascending: false }).limit(limit);
  return (data ?? []).map((r) => ({ kind: 'record', label: `Risk ${r.ref} ${r.title}`, href: '/diagnosis?tab=register',
    text: line({ ref: r.ref, risk: r.title, category: r.category, 'likelihood x impact': `${r.likelihood} x ${r.impact} = ${r.score}`, level: r.level, ddrive_rating: r.ddrive_risk_code, status: r.status }) }));
}
async function actions(db: SupabaseClient, filter: { column?: string; value?: string } = {}, limit = 15): Promise<Rec[]> {
  let q = db.from('ddrive_response_actions').select('id, ref, title, status, priority, drrm_area, strategy, due_on, progress, cost_php, budget_line_id, owner_office')
    .in('status', ['proposed', 'approved', 'in_progress']).order('created_at', { ascending: false }).limit(limit);
  if (filter.column && filter.value) q = q.eq(filter.column, filter.value);
  const { data } = await q;
  const today = new Date().toISOString().slice(0, 10);
  return (data ?? []).map((a) => ({ kind: 'record', label: `Action ${a.ref} ${a.title}`, href: `/response?tab=actions&action=${a.id}`,
    text: line({ ref: a.ref, action: a.title, status: a.status, progress: `${a.progress}%`, priority: a.priority, area: a.drrm_area, treatment: a.strategy,
      due: a.due_on ? `${a.due_on}${a.due_on < today && a.status !== 'proposed' ? ' (overdue)' : ''}` : null, cost_php: a.cost_php,
      funded: a.budget_line_id ? 'yes' : 'no', office: a.owner_office }) }));
}
async function budget(db: SupabaseClient): Promise<Rec[]> {
  const year = new Date().getFullYear();
  const { data } = await db.from('ddrive_budget_line_status').select('ref, title, fund_source, drrm_area, amount_php, committed_php, available_php, status, fiscal_year')
    .eq('fiscal_year', year).neq('status', 'draft').limit(20);
  return (data ?? []).map((l) => ({ kind: 'record', label: `Budget line ${l.ref} ${l.title}`, href: '/integration?tab=budget',
    text: line({ ref: l.ref, line: l.title, year: l.fiscal_year, fund: l.fund_source, area: l.drrm_area, amount_php: l.amount_php, committed_php: l.committed_php, available_php: l.available_php, status: l.status }) }));
}
async function entry(db: SupabaseClient, id: string): Promise<Rec[]> {
  const { data: e } = await db.from('ddrive_hazard_assessment_entries')
    .select('id, main_hazard, hazard_event, exposure, v_infrastructure, v_productive, v_services, v_social, total_vulnerability, response, likelihood, likelihood_level, severity, severity_class, risk_code, comments, ddrive_hazard_assessments(ref, title, status)')
    .eq('id', id).maybeSingle();
  if (!e) return [];
  const hx = (e as unknown as { ddrive_hazard_assessments?: { ref: string; title: string; status: string } | { ref: string; title: string; status: string }[] }).ddrive_hazard_assessments;
  const h = Array.isArray(hx) ? hx[0] : hx;
  return [{ kind: 'record', label: `DDRiVE assessment ${h?.ref ?? ''}: ${e.hazard_event} (${e.main_hazard})`, href: '/diagnosis?tab=assessments',
    text: line({ assessment: h ? `${h.ref} ${h.title} (${h.status})` : null, hazard: `${e.main_hazard}: ${e.hazard_event}`,
      'exposure (0-10)': e.exposure, 'vulnerability infrastructure (0-10)': e.v_infrastructure, 'vulnerability productive (0-10)': e.v_productive,
      'vulnerability services (0-10)': e.v_services, 'vulnerability social (0-10)': e.v_social, 'total vulnerability (0-100)': e.total_vulnerability,
      'response measures (0-10, higher is better)': e.response, likelihood: `${e.likelihood} (${e.likelihood_level})`, severity: `${e.severity} (${e.severity_class})`,
      rating: e.risk_code, assessor_comments: e.comments?.slice(0, 800) }) }];
}
async function risk(db: SupabaseClient, id: string): Promise<Rec[]> {
  const { data: r } = await db.from('ddrive_risks').select('ref, title, category, likelihood, impact, score, level, status, ddrive_risk_code').eq('id', id).maybeSingle();
  return r ? [{ kind: 'record', label: `Risk ${r.ref} ${r.title}`, href: '/diagnosis?tab=register',
    text: line({ ref: r.ref, risk: r.title, category: r.category, 'likelihood x impact': `${r.likelihood} x ${r.impact} = ${r.score}`, level: r.level, ddrive_rating: r.ddrive_risk_code, status: r.status }) }] : [];
}
async function alertContext(db: SupabaseClient, alertId: string): Promise<Rec[]> {
  const { data: a } = await db.from('ddrive_active_alerts').select('id, source, event, headline, description, instruction, signal_level, magnitude, depth_km, alert_level, area_names, sent, expires, cap_url, in_watch_area, nearest_watch_km')
    .eq('id', alertId).maybeSingle();
  if (!a) return [];
  const out: Rec[] = [{ kind: 'record', label: `${a.source} alert: ${a.signal_level ? `Wind Signal No. ${a.signal_level}` : a.event}`, href: a.cap_url,
    text: line({ agency: a.source, event: a.event, headline: a.headline, description: a.description?.slice(0, 1500), instruction: a.instruction?.slice(0, 1000),
      signal: a.signal_level, magnitude: a.magnitude, depth_km: a.depth_km, level: a.alert_level, areas: (a.area_names ?? []).slice(0, 20),
      issued: manila(a.sent), expires: manila(a.expires), in_your_watch_areas: a.in_watch_area ? 'yes' : 'no', nearest_watch_point_km: a.nearest_watch_km }) }];
  const { data: ctx } = await db.from('ddrive_alert_risk_context').select('assessment_ref, assessment_title, main_hazard, hazard_event, risk_code, likelihood_level, severity_class, total_vulnerability, response')
    .eq('alert_id', alertId).order('risk_rank', { ascending: false }).limit(6);
  for (const c of ctx ?? []) out.push({ kind: 'record', label: `Your assessed risk: ${c.hazard_event} (${c.risk_code})`, href: '/diagnosis?tab=assessments',
    text: line({ assessment: `${c.assessment_ref} ${c.assessment_title}`, hazard: `${c.main_hazard}: ${c.hazard_event}`, rating: c.risk_code, likelihood: c.likelihood_level,
      severity: c.severity_class, 'total vulnerability (0-100)': c.total_vulnerability, 'response measures (0-10)': c.response }) });
  return [...out, ...await actions(db, { column: 'official_alert_id', value: alertId }, 8)];
}

async function gather(db: SupabaseClient, task: Task, subject: string | null): Promise<Rec[]> {
  switch (task) {
    case 'explain_alert': return subject ? alertContext(db, subject) : [];
    case 'explain_rating': return subject ? entry(db, subject) : [];
    case 'suggest_treatments': {
      if (!subject) return [];
      const [kind, id] = subject.split(':');
      const target = kind === 'entry' ? await entry(db, id) : await risk(db, id);
      return [...target, ...await actions(db, { column: kind === 'entry' ? 'hazard_entry_id' : 'risk_id', value: id }, 10)];
    }
    case 'funding_gaps': return [...await budget(db), ...(await actions(db, {}, 30)).filter((a) => a.text.includes('funded: no'))];
    case 'situation_brief':
    case 'ask':
    default: {
      const [al, hz, rk, ac, bu] = await Promise.all([alertsInArea(db), openHazards(db), topRisks(db), actions(db), budget(db)]);
      return [...al, ...hz, ...rk, ...ac, ...bu];
    }
  }
}

const QUESTION: Record<Task, string> = {
  ask: '', explain_alert: 'What does this alert mean for us?', explain_rating: 'Why does this hazard event have this rating, and what would lower it?',
  suggest_treatments: 'Suggest treatment options for this risk.', situation_brief: 'Give me the situation brief.', funding_gaps: 'Where are our funding gaps?',
};

Deno.serve(async (req) => {
  const headers = { ...cors(req), 'content-type': 'application/json' };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!KEYS.clientKey || !API_KEY) return json({ error: 'DDRiVER AI is not set up on the server yet. Tell your administrator.' }, 503);

  // 1. Who is asking.
  const auth = req.headers.get('authorization') ?? '';
  const apikey = req.headers.get('apikey') ?? '';
  if (!/^Bearer\s+\S+/.test(auth) || !apikey) return json({ error: 'Sign in to use DDRiVER AI.' }, 401);
  const asUser = createClient(SUPABASE_URL, apikey, { auth: { persistSession: false }, global: { headers: { Authorization: auth } } });
  const { data: u, error: ue } = await asUser.auth.getUser(auth.replace(/^Bearer\s+/, ''));
  if (ue || !u?.user) return json({ error: 'Your session has ended. Sign in again.' }, 401);

  let body: { task?: string; subject?: string; question?: string; history?: unknown; style?: string };
  try { body = await req.json(); } catch { return json({ error: 'The request was not readable.' }, 400); }
  const task = TASKS.includes(body.task as Task) ? body.task as Task : null;
  if (!task) return json({ error: 'Unknown request.' }, 400);
  const question = (task === 'ask' ? String(body.question ?? '') : QUESTION[task]).trim();
  if (task === 'ask' && (question.length < 3 || question.length > 2000)) return json({ error: 'Ask a question of 3 to 2,000 characters.' }, 400);
  const subject = typeof body.subject === 'string' && /^[\w:-]{1,80}$/.test(body.subject) ? body.subject : null;
  const style = body.style === 'detailed' ? 'detailed' : 'concise';

  // 2. May they ask now? Opens the log entry (service role).
  const svc = createClient(SUPABASE_URL, KEYS.clientKey, { auth: { persistSession: false } });
  const { data: logId, error: be } = await svc.rpc('ddrive_ai_begin', { p_user: u.user.id, p_task: task, p_subject: subject, p_question: question });
  if (be) return json({ error: be.message.replace(/^.*?: /, '') }, /limit|requests/i.test(be.message) ? 429 : 403);

  // 3. Sources, read as the user.
  let sources: Source[] = [];
  try {
    const records = await gather(asUser, task, subject);
    if (task !== 'ask' && task !== 'situation_brief' && task !== 'funding_gaps' && records.length === 0) {
      await svc.rpc('ddrive_ai_finish', { p_id: logId, p_ok: false, p_model: null, p_prompt_version: PROMPT_VERSION, p_sources: [], p_answer: null, p_unverified: 0, p_in: null, p_out: null, p_error: 'record not found' });
      return json({ error: 'That record was not found, or you cannot see it.' }, 404);
    }
    sources = numberSources(records);
  } catch (e) {
    console.error('ddriver gather failed', e);
    sources = numberSources([]);
  }

  // 4. The model.
  const system = `${systemPrompt(task, style)}\n\n${sourcesBlock(sources)}`;
  const messages = task === 'ask' ? trimHistory(body.history, question) : [{ role: 'user' as const, content: question }];
  const publicSources = sources.map(({ key, label, href, kind }) => ({ key, label, href: href ?? null, kind }));
  try {
    const reply = await callClaude({ apiKey: API_KEY, model: MODEL, baseUrl: BASE_URL, system, messages, maxTokens: task === 'situation_brief' || style === 'detailed' ? 1800 : 1000 });
    // 5. Check, log, return.
    const { prose, suggestions } = task === 'suggest_treatments' ? parseSuggestions(reply.text) : { prose: reply.text, suggestions: [] };
    const checked = checkCitations(prose, sources);
    const cleanSuggestions = suggestions.map((s) => ({ ...s, rationale: checkCitations(s.rationale, sources).text }));
    await svc.rpc('ddrive_ai_finish', { p_id: logId, p_ok: true, p_model: reply.model, p_prompt_version: PROMPT_VERSION, p_sources: publicSources,
      p_answer: checked.text + (cleanSuggestions.length ? `\n\nSuggestions: ${JSON.stringify(cleanSuggestions)}` : ''), p_unverified: checked.removed,
      p_in: reply.inputTokens, p_out: reply.outputTokens, p_error: null });
    return json({
      log_id: logId, answer: checked.text, suggestions: cleanSuggestions, model: reply.model,
      sources: publicSources.filter((s) => checked.cited.includes(s.key) || cleanSuggestions.some((x) => x.rationale.includes(`[${s.key}`))),
      removed_citations: checked.removed,
      notice: 'AI-generated decision support. Check it against the cited records; the agencies\' warnings and your officials\' decisions prevail.',
    });
  } catch (e) {
    const friendly = e instanceof ModelError ? e.friendly : 'DDRiVER AI could not answer just now. Try again, or continue without it.';
    console.error('ddriver model call failed', e instanceof Error ? e.message : e);
    await svc.rpc('ddrive_ai_finish', { p_id: logId, p_ok: false, p_model: MODEL, p_prompt_version: PROMPT_VERSION, p_sources: publicSources, p_answer: null,
      p_unverified: 0, p_in: null, p_out: null, p_error: e instanceof Error ? e.message : String(e) });
    return json({ error: friendly, log_id: logId }, 502);
  }
});
