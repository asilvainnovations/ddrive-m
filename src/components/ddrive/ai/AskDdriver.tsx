// "Ask DDRiVER" in a module: one button for one task about one record, and the answer with its cited sources.
// Hidden when the organisation has not turned DDRiVER AI on. Answers are decision support, labelled as AI output,
// and every citation links to the record or reference it rests on (AI Use, Ethics and Governance Policy).
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ThumbsDown, ThumbsUp, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiAnswer, AiSuggestion, AiTask, askDdriver, sendFeedback, splitCitations, useAiStatus } from '@/lib/ddriver';

export const SourceLink: React.FC<{ href: string | null; children: React.ReactNode }> = ({ href, children }) => {
  if (!href) return <span>{children}</span>;
  if (href.startsWith('/')) return <Link to={href} className="underline">{children}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">{children}<ExternalLink className="w-3 h-3" aria-hidden="true" /></a>;
};

/** An answer: text with linked citations, the sources, the AI notice and a rating. */
export const AiAnswerView: React.FC<{ a: AiAnswer; idPrefix: string }> = ({ a, idPrefix }) => {
  const [rated, setRated] = useState<string | null>(null);
  const byKey = new Map(a.sources.map((s) => [s.key, s]));
  const rate = async (f: 'helpful' | 'not_helpful') => { const { error } = await sendFeedback(a.log_id, f); if (!error) setRated(f); };
  return (
    <div className="space-y-2 text-sm">
      <div className="whitespace-pre-wrap leading-relaxed">
        {splitCitations(a.answer).map((p, i) => 't' in p ? <React.Fragment key={i}>{p.t}</React.Fragment> : (
          <sup key={i} className="text-[10px] font-semibold">
            [{p.cite.map((k, j) => <React.Fragment key={k}>{j > 0 && ', '}<a href={`#${idPrefix}-${k}`} className="text-blue-700 dark:text-blue-300 underline">{k}</a></React.Fragment>)}]
          </sup>
        ))}
      </div>
      {a.sources.length > 0 && (
        <div>
          <p className="text-xs font-semibold">Sources</p>
          <ol className="text-xs space-y-0.5">
            {a.sources.map((s) => (
              <li key={s.key} id={`${idPrefix}-${s.key}`}><span className="font-mono">{s.key}</span> <SourceLink href={s.href}>{s.label}</SourceLink>
                {s.kind === 'reference' && <span className="text-slate-500"> (reference)</span>}</li>
            ))}
          </ol>
        </div>
      )}
      {a.removed_citations > 0 && (
        <p className="text-xs text-amber-800 dark:text-amber-300">{a.removed_citations} citation{a.removed_citations > 1 ? 's' : ''} to sources that were not provided {a.removed_citations > 1 ? 'were' : 'was'} removed. Treat the statements around {a.removed_citations > 1 ? 'them' : 'it'} with care.</p>
      )}
      {[...byKey.values()].length === 0 && <p className="text-xs text-amber-800">This answer cites no sources. Check it before relying on it.</p>}
      <p className="text-[11px] text-slate-600 dark:text-slate-400">{a.notice} Model: {a.model}.</p>
      <div className="flex items-center gap-2 text-xs">
        {rated ? <span className="text-slate-600">Thank you for the rating.</span> : <>
          <span className="text-slate-600">Was this useful?</span>
          <button type="button" onClick={() => rate('helpful')} aria-label="Helpful" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10"><ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" /></button>
          <button type="button" onClick={() => rate('not_helpful')} aria-label="Not helpful" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10"><ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" /></button>
        </>}
      </div>
    </div>
  );
};

/**
 * A button that runs one DDRiVER AI task and shows the answer below it.
 * `onSuggestion` (suggest_treatments only) lets the person take one suggestion into a form, where they edit and submit it.
 */
const AskDdriver: React.FC<{
  task: Exclude<AiTask, 'ask'>;
  subject?: string;
  label: string;
  idPrefix: string;
  onSuggestion?: (s: AiSuggestion) => void;
  className?: string;
}> = ({ task, subject, label, idPrefix, onSuggestion, className }) => {
  const status = useAiStatus();
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!status?.enabled) return null;
  const run = async () => {
    setBusy(true); setError(null);
    const r = await askDdriver(task, { subject });
    setBusy(false);
    if (r.error) setError(r.error); else setAnswer(r.data);
  };
  return (
    <div className={cn('text-xs', className)}>
      {!answer && (
        <button type="button" onClick={run} disabled={busy} className="inline-flex items-center gap-1 font-semibold text-purple-800 dark:text-purple-300 hover:underline disabled:opacity-60">
          <Bot className="w-3.5 h-3.5" aria-hidden="true" /> {busy ? 'DDRiVER AI is working…' : label}
        </button>
      )}
      {busy && <span role="status" className="sr-only">DDRiVER AI is working</span>}
      {error && <p role="alert" className="mt-1 text-red-800 dark:text-red-300">{error}</p>}
      {answer && (
        <div className="mt-2 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/60 dark:bg-purple-950/30 p-3" aria-live="polite">
          <p className="text-[11px] font-bold uppercase tracking-wide text-purple-900 dark:text-purple-200 mb-1 flex items-center gap-1"><Bot className="w-3.5 h-3.5" aria-hidden="true" /> DDRiVER AI, decision support</p>
          <AiAnswerView a={answer} idPrefix={idPrefix} />
          {onSuggestion && answer.suggestions.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold">Suggested options (drafts: choose one to edit it in the form; nothing is proposed until you submit)</p>
              {answer.suggestions.map((s, i) => (
                <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-2">
                  <p className="font-semibold text-sm">{s.title}</p>
                  {s.rationale && <p className="text-xs text-slate-600 dark:text-slate-300">{s.rationale}</p>}
                  <button type="button" className="mt-1 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline" onClick={() => onSuggestion(s)}>Use this draft</button>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="mt-2 text-xs text-slate-600 underline" onClick={() => setAnswer(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default AskDdriver;
