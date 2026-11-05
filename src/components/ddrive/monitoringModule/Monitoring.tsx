import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Radio, Send, Users, Bell, Share2, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useMessages } from '@/hooks/useDDriveData';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessage } from '@/lib/actions';
import { needsRole } from '@/lib/roles';

const MonitoringModule: React.FC = () => {
  const { data: messages, refetch } = useMessages();
  const [draft, setDraft] = useState('');
  const [priority, setPriority] = useState<'medium' | 'high' | 'critical'>('medium');

  const { can } = useAuth();
  const [armed, setArmed] = useState(false);
  const canPost = can('responder');
  const canCritical = can('drrm_officer');

  // The database stamps the sender's real name and role; the app sends only the text and priority.
  const send = async () => {
    if (!draft.trim()) return;
    const { error } = await sendMessage(draft, priority);
    if (error) { toast.error(error); return; }
    setDraft('');
    toast.success('Message sent');
    refetch();
  };

  // Emergency message: an authority action (DRRM officer or above), confirmed with a second click.
  const broadcast = async () => {
    if (!armed) { setArmed(true); return; }
    setArmed(false);
    const { error } = await sendMessage('EMERGENCY: all team members check in and report to your assigned zones.', 'critical');
    if (error) { toast.error(error); return; }
    toast.success('Emergency message sent to all members of this organisation');
    refetch();
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Monitoring Module</h1>
            <p className="text-sm text-slate-500 font-poppins">Phase 7 · Collaboration Hub (Supabase real-time)</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'People who posted', val: new Set(messages.map(m => m.user_name)).size, icon: Users, color: 'from-blue-500 to-blue-700' },
          { label: 'Messages Logged', val: messages.length, icon: Send, color: 'from-emerald-500 to-teal-500' },
          { label: 'Critical Broadcasts', val: messages.filter(m => m.priority === 'critical').length, icon: Bell, color: 'from-amber-500 to-orange-500' },
          { label: 'High-priority messages', val: messages.filter(m => m.priority === 'high').length, icon: Share2, color: 'from-purple-500 to-pink-500' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <GlassCard key={i} className="p-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-montserrat font-bold">{s.val}</p>
              <p className="text-xs text-slate-500 font-roboto-condensed uppercase tracking-wider">{s.label}</p>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-montserrat font-bold text-lg">Team Communication Hub</h3>
            <span className="text-xs flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 12 online</span>
          </div>
          <div className="h-96 overflow-y-auto space-y-3 mb-4 pr-2">
            {messages.map(m => (
              <div key={m.id} className={`p-3 rounded-xl border-l-4 ${
                m.priority === 'critical' ? 'border-red-500 bg-red-50/60 dark:bg-red-900/20' :
                m.priority === 'high' ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-900/20' :
                'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center text-[10px] font-bold">
                      {m.user_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{m.user_name}</p>
                      <p className="text-[10px] text-slate-500">{m.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">{m.time || ''}</span>
                </div>
                <p className="text-sm font-poppins">{m.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={priority} onChange={(e) => setPriority(e.target.value as 'medium' | 'high' | 'critical')} disabled={!canPost} aria-label="Message priority" className="px-2 py-2 rounded-xl border border-slate-300 bg-transparent text-xs">
              <option value="medium">Medium</option>
              <option value="high">High</option>
              {canCritical && <option value="critical">Critical</option>}
            </select>
            <input
              disabled={!canPost}
              aria-label="Message to your team"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={canPost ? 'Message your team…' : needsRole('responder')}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-white/5 text-sm"
            />
            <button type="button" onClick={send} disabled={!canPost} className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-montserrat font-bold text-lg mb-4">Instant Reports</h3>
          <div className="space-y-2">
            {[
              'Situational Awareness Report',
              'Incident Summary (24h)',
              'Resource Status Report',
              'Compliance Snapshot',
              'Community Engagement Brief',
            ].map((r, i) => (
              <button key={i} onClick={() => toast.info(`${r} is not available yet.`)} className="w-full p-3 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left flex items-center justify-between transition">
                <span className="text-sm font-poppins">{r}</span>
                <Download className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 text-white">
            <p className="text-xs font-bold uppercase tracking-wider">Emergency Protocol</p>
            <p className="text-sm mt-1">Message every member of this organisation</p>
            <button
              type="button"
              onClick={broadcast}
              onBlur={() => setArmed(false)}
              disabled={!canCritical}
              className="w-full mt-2 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-bold hover:bg-white/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {armed ? 'Select again to confirm and send' : 'Send emergency message'}
            </button>
            <p className="mt-1 text-[11px] text-white/90">
              {canCritical
                ? 'Reaches members of this organisation only. It is not a public warning.'
                : needsRole('drrm_officer')}
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default MonitoringModule;
