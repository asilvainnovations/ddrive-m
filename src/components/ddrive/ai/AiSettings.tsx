// Settings → DDRiVER AI. Each person chooses the answer style; an organisation administrator turns the assistant on
// or off and sets daily limits, after being told what is sent to the AI provider (Privacy Policy, ADR-011).
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AiStatus, AiStyle, aiStatus, configureAi, getStyle, refreshAiStatus, setStyle } from '@/lib/ddriver';

const AiSettings: React.FC = () => {
  const { can } = useAuth();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [style, setLocalStyle] = useState<AiStyle>(getStyle());
  const [userLimit, setUserLimit] = useState(30);
  const [orgLimit, setOrgLimit] = useState(300);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const s = await aiStatus();
    setStatus(s);
    if (s) { setUserLimit(s.user_limit); setOrgLimit(s.org_limit); }
  };
  useEffect(() => { load(); }, []);
  const save = async (enabled: boolean) => {
    setBusy(true);
    const { error } = await configureAi(enabled, userLimit, orgLimit);
    setBusy(false);
    if (error) { toast.error(error); return; }
    toast.success(enabled ? 'DDRiVER AI is on for your organisation.' : 'DDRiVER AI is off for your organisation.');
    refreshAiStatus(); setAck(false); load();
  };

  return (
    <div className="space-y-5 text-sm">
      <h3 className="font-montserrat font-bold text-lg">DDRiVER AI</h3>
      <p>
        Status for your organisation: <strong>{status ? (status.enabled ? 'On' : 'Off') : '…'}</strong>
        {status?.enabled && <> · you have used {status.used_by_me_today} of {status.user_limit} questions today; the organisation {status.used_by_org_today} of {status.org_limit}.</>}
      </p>

      <fieldset>
        <legend className="text-xs text-slate-600 font-semibold mb-2">Answer style (just for you, on this device)</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['concise', 'detailed'] as AiStyle[]).map((s) => (
            <button key={s} type="button" aria-pressed={style === s} onClick={() => { setStyle(s); setLocalStyle(s); }}
              className={cn('p-3 rounded-xl border text-sm font-semibold capitalize', style === s ? 'border-purple-600 bg-purple-500/10 text-purple-800' : 'border-slate-300')}>{s}</button>
          ))}
        </div>
      </fieldset>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
        <p className="font-semibold">What DDRiVER AI does with your data</p>
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li>When someone asks, the server reads the records that person is allowed to see for that question (alerts, hazard records, risks, assessments, actions, budget lines) and sends them, with the question, to Anthropic's Claude API to write the answer.</li>
          <li>It does not send names of members, contact details or documents. People should not type personal information into questions.</li>
          <li>Each question and answer is kept 90 days for review, visible to the person who asked and to your administrators.</li>
          <li>Answers are decision support with cited sources. DDRiVER AI never issues warnings, orders evacuations, approves actions or releases funds.</li>
        </ul>
        <p className="text-xs">Details: <Link to="/policies/privacy" className="underline">Privacy Policy</Link> and <Link to="/ai-ethics" className="underline">AI Use, Ethics and Governance Policy</Link>.</p>
      </div>

      {can('tenant_admin') ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <label className="text-xs font-semibold">Questions per person per day
              <input type="number" min={1} max={500} value={userLimit} onChange={(e) => setUserLimit(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 bg-transparent" />
            </label>
            <label className="text-xs font-semibold">Questions per organisation per day
              <input type="number" min={1} max={10000} value={orgLimit} onChange={(e) => setOrgLimit(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 bg-transparent" />
            </label>
          </div>
          {!status?.enabled ? (
            <>
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
                <span>I have read the above and the Privacy Policy, and my organisation agrees to send records to the AI provider for this purpose.</span>
              </label>
              <button type="button" disabled={!ack || busy} onClick={() => save(true)} className="px-4 py-2 rounded-xl bg-purple-700 text-white font-semibold disabled:opacity-50">Turn on DDRiVER AI</button>
            </>
          ) : (
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => save(true)} className="px-4 py-2 rounded-xl border border-slate-300 font-semibold">Save limits</button>
              <button type="button" disabled={busy} onClick={() => save(false)} className="px-4 py-2 rounded-xl border border-red-300 text-red-800 font-semibold">Turn off DDRiVER AI</button>
            </div>
          )}
        </div>
      ) : <p className="text-xs text-slate-600">An organisation administrator turns DDRiVER AI on or off and sets the daily limits.</p>}
    </div>
  );
};

export default AiSettings;
