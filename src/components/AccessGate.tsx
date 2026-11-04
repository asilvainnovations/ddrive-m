import React, { useState } from 'react';
import { LogIn, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isBackendConfigured } from '@/lib/supabase';
import { ROLE_LABELS } from '@/lib/roles';
import { toast } from '@/components/ui/sonner';

const KINDS: { value: string; label: string }[] = [
  { value: 'lgu', label: 'Local government unit (LGU)' },
  { value: 'national_agency', label: 'National government agency' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'ngo', label: 'NGO or civil society organisation' },
  { value: 'academe', label: 'Academe' },
  { value: 'other', label: 'Other' },
];

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="max-w-lg mx-auto mt-10 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-8 space-y-4">
    <h1 className="font-montserrat font-bold text-2xl text-slate-900 dark:text-white">{title}</h1>
    {children}
  </div>
);

// Shows the page only to signed-in members of an organisation. Everyone else is told what to do next.
const AccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, memberships, activeTenant, openLogin, setActiveTenant, createTenant } = useAuth();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('lgu');
  const [busy, setBusy] = useState(false);

  if (!isBackendConfigured) return <>{children}</>; // the dashboard explains the missing configuration
  if (loading) return <p role="status" className="p-8 text-sm text-slate-500">Loading your account…</p>;

  if (!user) {
    return (
      <Panel title="Sign in to DDRiVE-M">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          DDRiVE-M holds your organisation's risk, hazard and incident records, so you need to sign in to see them.
        </p>
        <button type="button" onClick={openLogin} className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center gap-2">
          <LogIn className="w-4 h-4" aria-hidden="true" /> Sign in or create an account
        </button>
        <p className="text-xs text-slate-500">For official warnings, follow PAGASA, PHIVOLCS and your local DRRM office.</p>
      </Panel>
    );
  }

  if (activeTenant) return <>{children}</>;

  if (memberships.length > 0) {
    return (
      <Panel title="Choose an organisation">
        <p className="text-sm text-slate-600 dark:text-slate-300">You belong to more than one. Choose where to work; you can switch later from your account menu.</p>
        <ul className="space-y-2">
          {memberships.map((m) => (
            <li key={m.tenant_id}>
              <button
                type="button"
                onClick={async () => { const { error } = await setActiveTenant(m.tenant_id); if (error) toast.error(error); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between"
              >
                <span className="font-semibold">{m.tenant_name}</span>
                <span className="text-sm text-slate-500">{ROLE_LABELS[m.role]}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    );
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await createTenant(name.trim(), kind);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success(`${name.trim()} is set up. You are its administrator.`);
  };

  return (
    <Panel title="You're not in an organisation yet">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        If your organisation already uses DDRiVE-M, ask its administrator to add you with the email <strong>{user.email}</strong>.
      </p>
      <form onSubmit={create} className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="w-4 h-4" aria-hidden="true" /> Or set up a new organisation
        </p>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Organisation name</span>
          <input
            required
            minLength={2}
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent">
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>
        <p className="text-xs text-slate-500">You become its administrator and can add colleagues afterwards.</p>
        <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm disabled:opacity-60">
          {busy ? 'Setting up…' : 'Set up organisation'}
        </button>
      </form>
    </Panel>
  );
};

export default AccessGate;
