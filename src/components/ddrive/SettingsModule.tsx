import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { Settings, User, Lock, Bell, Palette, Bot, Globe } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { toast } from '@/components/ui/sonner';

const SettingsModule: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [section, setSection] = useState<'profile' | 'security' | 'notifications' | 'ai' | 'general'>('profile');
  const [twoFA, setTwoFA] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [notifPush, setNotifPush] = useState(true);
  const [aiStyle, setAiStyle] = useState<'concise' | 'detailed'>('detailed');

  const sections = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'general', label: 'General', icon: Globe },
    { key: 'security', label: 'Security', icon: Lock },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'ai', label: 'AI Assistant', icon: Bot },
  ] as const;

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Settings & Personalization</h1>
            <p className="text-sm text-slate-500 font-poppins">Manage your account, security, and preferences</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <GlassCard className="p-3 lg:sticky lg:top-20 h-fit">
          <nav className="space-y-1">
            {sections.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-poppins transition ${
                    section === s.key ? 'bg-blue-700 text-white' : 'hover:bg-white/60 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </GlassCard>

        <GlassCard className="p-6 lg:col-span-3">
          {section === 'profile' && (
            <div className="space-y-4">
              <h3 className="font-montserrat font-bold text-lg">User Profile</h3>
              <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xl font-bold">JD</div>
                <button className="text-xs px-3 py-1.5 rounded-lg bg-white/60 dark:bg-white/5 border border-white/40 font-semibold">Upload Photo</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-semibold">Full Name</label>
                  <input defaultValue="Juan Dela Cruz" className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold">Role</label>
                  <select className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm">
                    <option>Super Admin</option>
                    <option>Field Operator</option>
                    <option>Analyst</option>
                    <option>Compliance Officer</option>
                    <option>Emergency Responder</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold">Organization</label>
                  <input defaultValue="NDRRMC - OCD" className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold">Email</label>
                  <input defaultValue="jdelacruz@ddrive.gov.ph" className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm" />
                </div>
              </div>
              <button onClick={() => toast.success('Profile updated')} className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm">Save Changes</button>
            </div>
          )}

          {section === 'general' && (
            <div className="space-y-4">
              <h3 className="font-montserrat font-bold text-lg">General Settings</h3>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold">Theme</p>
                    <p className="text-xs text-slate-500">Light or dark mode</p>
                  </div>
                </div>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="px-4 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-bold uppercase">
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </button>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold">Language</label>
                <select className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm">
                  <option>English (PH)</option>
                  <option>Filipino</option>
                  <option>Cebuano</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold">Timezone</label>
                <select className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm">
                  <option>Philippine Standard Time (PST / UTC+8)</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5">
                <div>
                  <p className="text-sm font-semibold">Offline Mode</p>
                  <p className="text-xs text-slate-500">Cache data for field operations</p>
                </div>
                <input type="checkbox" defaultChecked className="w-10 h-5" />
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-4">
              <h3 className="font-montserrat font-bold text-lg">Security Settings</h3>
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-semibold">Change Password</label>
                <input type="password" placeholder="Current password" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm" />
                <input type="password" placeholder="New password" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm" />
                <input type="password" placeholder="Confirm password" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5">
                <div>
                  <p className="text-sm font-semibold">Two-Factor Authentication</p>
                  <p className="text-xs text-slate-500">Extra security with SMS or Authenticator app</p>
                </div>
                <button onClick={() => setTwoFA(!twoFA)} className={`px-3 py-1 rounded-lg text-xs font-bold ${twoFA ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'}`}>
                  {twoFA ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5">
                <p className="text-sm font-semibold mb-2">Active Sessions (3)</p>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>· MacBook Pro · Manila · Current</p>
                  <p>· iPhone 15 · Manila · 2h ago</p>
                  <p>· Chrome Windows · Cebu · 1d ago</p>
                </div>
              </div>
              <button onClick={() => toast.success('Security settings updated')} className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm">Save Changes</button>
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-4">
              <h3 className="font-montserrat font-bold text-lg">Notifications</h3>
              {[
                { key: 'email', label: 'Email Notifications', val: notifEmail, set: setNotifEmail },
                { key: 'sms', label: 'SMS Alerts', val: notifSMS, set: setNotifSMS },
                { key: 'push', label: 'Push Notifications', val: notifPush, set: setNotifPush },
              ].map(n => (
                <div key={n.key} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5">
                  <p className="text-sm font-semibold">{n.label}</p>
                  <button onClick={() => n.set(!n.val)} className={`w-12 h-6 rounded-full relative transition ${n.val ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${n.val ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 font-semibold">Priority Level</label>
                <select className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm">
                  <option>All notifications</option>
                  <option>High & Critical only</option>
                  <option>Critical only</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 font-semibold">Quiet Hours Start</label>
                  <input type="time" defaultValue="22:00" className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold">Quiet Hours End</label>
                  <input type="time" defaultValue="06:00" className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-transparent text-sm" />
                </div>
              </div>
            </div>
          )}

          {section === 'ai' && (
            <div className="space-y-4">
              <h3 className="font-montserrat font-bold text-lg">DDRiVER AI Preferences</h3>
              <div>
                <label className="text-xs text-slate-500 font-semibold mb-2 block">Response Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {['concise', 'detailed'].map(s => (
                    <button
                      key={s}
                      onClick={() => setAiStyle(s as any)}
                      className={`p-3 rounded-xl border text-sm font-semibold capitalize ${aiStyle === s ? 'border-purple-500 bg-purple-500/10 text-purple-700' : 'border-slate-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5">
                <p className="text-sm font-semibold">Enable AI suggestions on dashboard</p>
                <input type="checkbox" defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5">
                <p className="text-sm font-semibold">Cite regulatory sources</p>
                <input type="checkbox" defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/5">
                <p className="text-sm font-semibold">Proactive risk insights</p>
                <input type="checkbox" defaultChecked />
              </div>
              <button onClick={() => toast.success('AI preferences saved')} className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold text-sm">Save AI Settings</button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default SettingsModule;
