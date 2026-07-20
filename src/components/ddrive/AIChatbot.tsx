import React, { useState, useRef, useEffect } from 'react';
import GlassCard from './GlassCard';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Msg {
  id: number;
  role: 'user' | 'ai';
  text: string;
}

const suggestedPrompts = [
  'Explain RA 10121 key provisions',
  'Generate a Typhoon Response Plan',
  'ISO 31000 vs ISO 22301 differences',
  'UNDRR 10 Essentials overview',
  'Current top risks in Metro Manila',
];

const aiResponses: Record<string, string> = {
  'ra 10121': 'RA 10121 (Philippine Disaster Risk Reduction and Management Act of 2010) institutionalizes DRRM at all levels. Key provisions: (1) NDRRMC as policy-making body, (2) OCD as operating arm, (3) 5% of LGU budget for LDRRMF, (4) four thematic areas: prevention/mitigation, preparedness, response, and rehabilitation/recovery.',
  'iso 31000': 'ISO 31000 is the international standard for risk management, providing principles and generic guidelines. It differs from ISO 22301 (Business Continuity) in scope: ISO 31000 covers all risk types holistically, while ISO 22301 specifically addresses operational continuity during disruption. Both complement each other in the DDRiVE-M framework.',
  'iso 22301': 'ISO 22301 specifies requirements for a Business Continuity Management System (BCMS). Core components: (1) Business Impact Analysis, (2) Risk Assessment, (3) Recovery Strategies, (4) Plan Documentation, (5) Testing & Exercises. It aligns with PSCP 2nd Edition for Philippine public service continuity.',
  'undrr': 'The UNDRR 10 Essentials for Making Cities Resilient 2030 provide a framework: (1) Organize, (2) Identify scenarios, (3) Financial capacity, (4) Urban development, (5) Natural buffers, (6) Institutional capacity, (7) Societal capacity, (8) Infrastructure resilience, (9) Effective response, (10) Recovery. Your city scores 78/100.',
  'typhoon': 'For a Typhoon Response Plan, I recommend: (1) Pre-landfall activation at PAGASA Signal #2, (2) Evacuate low-lying and coastal areas, (3) Coordinate with DSWD for relief, (4) Deploy PNP/BFP for security, (5) Activate EOC per PSCP protocols. Shall I generate the full document?',
  'metro manila': 'Current top risks for Metro Manila (from DDRiVE-M registry): (1) Flooding — Critical (Score 25), (2) West Valley Fault earthquake — High (15), (3) Cyber attack on government IT — High (16), (4) Supply chain disruption — High (16), (5) Power grid failure — High (15). All have active treatment plans.',
};

const getResponse = (q: string): string => {
  const lower = q.toLowerCase();
  for (const [key, val] of Object.entries(aiResponses)) {
    if (lower.includes(key)) return val;
  }
  return `I'm DDRiVER AI, your Philippine DRRM assistant. I can help with RA 10121, ISO 31000, ISO 22301, UNDRR 10 Essentials, risk assessment, plan generation, and emergency protocols. Ask me anything about disaster risk reduction in the Philippines.`;
};

interface AIChatbotProps {
  embedded?: boolean;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ embedded = false }) => {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, role: 'ai', text: 'Kumusta! I\'m DDRiVER AI — your intelligent assistant for Philippine disaster risk reduction and management. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { id: Date.now(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: getResponse(text) }]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className={embedded ? 'space-y-6' : ''}>
      {embedded && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-montserrat font-bold text-2xl">DDRiVER AI Assistant</h1>
              <p className="text-sm text-slate-500 font-poppins">Context-aware expert on Philippine DRRM laws & international standards</p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/40 dark:border-white/10 bg-gradient-to-r from-purple-600/10 to-pink-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="font-montserrat font-bold text-sm">Intelligent Assistant</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 font-bold">ONLINE</span>
          </div>
        </div>

        <div className="h-[500px] overflow-y-auto p-4 space-y-3">
          {messages.map(m => (
            <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={cn(
                'max-w-[75%] p-3 rounded-2xl text-sm font-poppins',
                m.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-br-sm'
                  : 'bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white rounded-bl-sm border border-white/40'
              )}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-white/10">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
          {suggestedPrompts.slice(0, 3).map(p => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="text-[10px] px-2 py-1 rounded-full bg-white/60 dark:bg-white/5 border border-white/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
            >
              {p}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-white/40 dark:border-white/10 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask about RA 10121, ISO standards, or risk strategies..."
            className="flex-1 px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 text-sm outline-none focus:border-purple-500"
          />
          <button
            onClick={() => handleSend(input)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold text-sm flex items-center gap-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default AIChatbot;

// Floating chat button
export const FloatingChatbot: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-2xl shadow-purple-500/30 flex items-center justify-center hover:scale-110 transition"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)]">
          <AIChatbot />
        </div>
      )}
    </>
  );
};
