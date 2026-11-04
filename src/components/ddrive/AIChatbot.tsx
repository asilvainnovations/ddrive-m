import React, { useState } from 'react';
import { Bot, X, Info } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

// DDRiVER AI is not connected in this version.
//
// The previous version answered from a fixed list of canned replies, including made-up scores
// ("Your city scores 78/100") and a made-up Metro Manila risk list. In a DRRM tool those read as facts,
// so they were removed. Phase 2 replaces this with a server-side assistant (one Edge Function holding
// the model key) that answers only from your own records and a curated set of laws and guidance,
// cites its sources, logs every answer, and treats generated plans as drafts until an officer approves them.

const officialSources = [
  { label: 'PAGASA (weather, typhoon and rainfall warnings)', href: 'https://www.pagasa.dost.gov.ph/' },
  { label: 'PHIVOLCS (earthquake, volcano and tsunami bulletins)', href: 'https://www.phivolcs.dost.gov.ph/' },
  { label: 'NDRRMC (situational reports and advisories)', href: 'https://ndrrmc.gov.ph/' },
];

interface AIChatbotProps {
  embedded?: boolean;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ embedded = false }) => {
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
              <p className="text-sm text-slate-600 font-poppins">DRRM reference assistant</p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-0 overflow-hidden" hover={false}>
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-600" aria-hidden="true" />
          <span className="font-montserrat font-bold text-sm">Assistant</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-700 dark:text-slate-300 font-bold">
            NOT CONNECTED
          </span>
        </div>

        <div className="p-4 space-y-3 text-sm font-poppins text-slate-700 dark:text-slate-200">
          <p>
            DDRiVER AI is not connected yet, so it cannot answer questions in this version. When it is connected,
            it will answer only from your organisation's records and official laws and guidance, and show its sources.
          </p>
          <p>For warnings and official information now, use:</p>
          <ul className="list-disc pl-5 space-y-1">
            {officialSources.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-400 underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">In an emergency, follow your local DRRM office and call 911.</p>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-white/10">
          <label htmlFor="ddriver-input" className="sr-only">Message DDRiVER AI</label>
          <input
            id="ddriver-input"
            disabled
            aria-describedby="ddriver-disabled-reason"
            placeholder="Assistant not connected"
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 text-sm cursor-not-allowed"
          />
          <p id="ddriver-disabled-reason" className="mt-1 text-[11px] text-slate-500">
            Typing is off until the assistant is connected to a verified source library.
          </p>
        </div>
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
        <div className="fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)]">
          <AIChatbot />
        </div>
      )}
    </>
  );
};
