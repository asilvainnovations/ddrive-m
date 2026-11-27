// DDRiVER AI chat: questions answered from the organisation's own records and verified references, with citations
// (ADR-011). The Edge Function reads the data as the signed-in user; this screen never sends records to the model.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, X, Info, Send } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AiAnswer, askDdriver, useAiStatus } from '@/lib/ddriver';
import { AiAnswerView } from '@/components/ddrive/ai/AskDdriver';

const officialSources = [
  { label: 'PAGASA (weather, typhoon and rainfall warnings)', href: 'https://www.pagasa.dost.gov.ph/' },
  { label: 'PHIVOLCS (earthquake, volcano and tsunami bulletins)', href: 'https://www.phivolcs.dost.gov.ph/' },
  { label: 'NDRRMC (situational reports and advisories)', href: 'https://ndrrmc.gov.ph/' },
];

const STARTERS = [
  'What needs my attention first today?',
  'Which approved actions are overdue or not funded?',
  'How much of the LDRRMF can go to anticipatory action?',
  'Which of our risks are rated highest, and what is being done about them?',
];

type Turn = { role: 'user'; content: string } | { role: 'assistant'; content: string; answer: AiAnswer } | { role: 'error'; content: string };

const AIChatbot: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { can } = useAuth();
  const status = useAiStatus();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [turns, busy]);

  const ask = async (text: string) => {
    const question = text.trim();
    if (question.length < 3 || busy) return;
    const history = turns.flatMap((t) => (t.role === 'error' ? [] : [{ role: t.role, content: t.content }]));
    setTurns((t) => [...t, { role: 'user', content: question }]);
    setQ(''); setBusy(true);
    const r = await askDdriver('ask', { question, history });
    setBusy(false);
    setTurns((t) => [...t, r.data ? { role: 'assistant', content: r.data.answer, answer: r.data } : { role: 'error', content: r.error ?? 'No answer.' }]);
  };

  const off = status && !status.enabled;
  return (
    <div className={embedded ? 'space-y-6' : ''}>
      {embedded && (
        <GlassCard className="p-6" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-montserrat font-bold text-2xl">DDRiVER AI</h1>
              <p className="text-sm text-slate-600 font-poppins">Decision support from your records and verified DRRM references, with sources</p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-0 overflow-hidden" hover={false}>
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-600" aria-hidden="true" />
          <span className="font-montserrat font-bold text-sm">Assistant</span>
          {status && <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold', status.enabled ? 'bg-emerald-500/15 text-emerald-800' : 'bg-slate-500/15 text-slate-700')}>
            {status.enabled ? `ON · ${Math.max(0, status.user_limit - status.used_by_me_today)} questions left today` : 'OFF FOR YOUR ORGANISATION'}
          </span>}
        </div>

        <div className={cn('p-4 space-y-3 text-sm font-poppins text-slate-700 dark:text-slate-200 overflow-y-auto', embedded ? 'max-h-[60vh]' : 'max-h-[50vh]')}>
          {off && (
            <p>DDRiVER AI is off for your organisation. {can('tenant_admin')
              ? <>You can turn it on in <Link to="/settings?section=ai" className="underline font-semibold">Settings → DDRiVER AI</Link> after reading what it sends to the AI provider.</>
              : 'An organisation administrator can turn it on in Settings.'}</p>
          )}
          {turns.length === 0 && !off && (
            <div className="space-y-2">
              <p>Ask about your organisation's alerts, hazard records, risks, actions and budget, or about the DRRM rules DDRiVER AI has verified references for. Answers cite their sources; check them before acting.</p>
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((s) => <button key={s} type="button" onClick={() => ask(s)} disabled={!status?.enabled} className="text-xs px-2 py-1 rounded-full border border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 disabled:opacity-50">{s}</button>)}
              </div>
            </div>
          )}
          {turns.map((t, i) => t.role === 'user' ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-blue-700 text-white px-3 py-2">{t.content}</div>
          ) : t.role === 'assistant' ? (
            <div key={i} className="max-w-[95%] rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50/60 dark:bg-purple-950/30 px-3 py-2">
              <AiAnswerView a={t.answer} idPrefix={`chat-${i}`} />
            </div>
          ) : (
            <p key={i} role="alert" className="text-red-800 dark:text-red-300">{t.content}</p>
          ))}
          {busy && <p role="status" className="text-slate-500">DDRiVER AI is reading your records…</p>}
          <div ref={end} />
          <div className="text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-white/10 pt-2">
            <p>For warnings and official information, use:</p>
            <ul className="list-disc pl-5">
              {officialSources.map((s) => <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer" className="underline">{s.label}</a></li>)}
            </ul>
            <p className="mt-1">In an emergency, follow your local DRRM office and call 911. Do not type personal information about people into DDRiVER AI.</p>
          </div>
        </div>

        <form className="p-3 border-t border-slate-200 dark:border-white/10 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
          <label htmlFor={embedded ? 'ddriver-input' : 'ddriver-input-float'} className="sr-only">Message DDRiVER AI</label>
          <input id={embedded ? 'ddriver-input' : 'ddriver-input-float'} value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000}
            disabled={!status?.enabled || busy} placeholder={status?.enabled ? 'Ask DDRiVER AI' : 'DDRiVER AI is off'}
            className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-300 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
          <button type="submit" disabled={!status?.enabled || busy || q.trim().length < 3} aria-label="Send"
            className="px-3 py-2 rounded-xl bg-purple-700 text-white disabled:opacity-50"><Send className="w-4 h-4" aria-hidden="true" /></button>
        </form>
      </GlassCard>
    </div>
  );
};

export default AIChatbot;

// Floating launcher shown on every page except the assistant's own page.
export const FloatingChatbot: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close DDRiVER AI' : 'Open DDRiVER AI'}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-xl flex items-center justify-center"
      >
        {open ? <X className="w-6 h-6" aria-hidden="true" /> : <Bot className="w-6 h-6" aria-hidden="true" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[400px] max-w-[calc(100vw-3rem)]">
          <AIChatbot />
        </div>
      )}
    </>
  );
};
