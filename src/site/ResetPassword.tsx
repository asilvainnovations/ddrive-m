import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import PageHeader from './PageHeader';

const input = 'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

// Where the "Reset your password" email leads. Following the link signs the person in for this one
// purpose; here they choose the new password.
const ResetPassword: React.FC = () => {
  const { user, loading, updatePassword, openLogin } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <>
      <PageHeader eyebrow="Account" title="Choose a new password" />
      <div className="max-w-md mx-auto px-4 py-10">
        {loading ? (
          <p role="status" className="text-sm text-slate-500">Checking your reset link…</p>
        ) : !user ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3 text-sm">
            <p>This reset link has expired or has already been used. Links work once and expire soon.</p>
            <button type="button" onClick={openLogin} className="font-semibold text-blue-700 dark:text-blue-300 hover:underline">Ask for a new link from the sign-in window</button>
          </div>
        ) : (
          <form
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (pw !== again) { toast.error('The two passwords do not match.'); return; }
              setBusy(true);
              const { error } = await updatePassword(pw);
              setBusy(false);
              if (error) toast.error(error);
              else { toast.success('Password changed.'); navigate('/dashboard'); }
            }}
          >
            <p className="text-sm text-slate-600 dark:text-slate-300">For {user.email}. Use at least 12 characters, and a password you do not use anywhere else.</p>
            <div>
              <label htmlFor="np" className="block text-sm font-semibold mb-1">New password</label>
              <input id="np" type="password" required minLength={12} autoComplete="new-password" className={input} value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div>
              <label htmlFor="np2" className="block text-sm font-semibold mb-1">New password again</label>
              <input id="np2" type="password" required minLength={12} autoComplete="new-password" className={input} value={again} onChange={(e) => setAgain(e.target.value)} />
            </div>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm disabled:opacity-50">
              <KeyRound className="w-4 h-4" aria-hidden="true" /> Save new password
            </button>
          </form>
        )}
      </div>
    </>
  );
};

export default ResetPassword;
