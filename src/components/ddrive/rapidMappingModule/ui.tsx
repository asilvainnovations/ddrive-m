// Shared building blocks for the Rapid Mapping screens.
import React, { useState } from 'react';
import { AlertTriangle, BadgeCheck, Clock, FileQuestion, Archive, XCircle, CircleDashed, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { needsRole, Role } from '@/lib/roles';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import {
  isPreliminary, PRELIMINARY_DISCLAIMER, ProductStatus, ProductVersion, VERIFIED_DISCLAIMER, VERSION_STATUS_LABEL,
} from '@/lib/rapidMapping/types';

export const input = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const btn = 'inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed';
export const primary = `${btn} bg-blue-700 hover:bg-blue-800 text-white`;
export const secondary = `${btn} border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800`;
export const danger = `${btn} border border-red-300 text-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950`;
export const card = 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-5';

export const Field: React.FC<{ id: string; label: string; hint?: string; children: React.ReactNode }> = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold mb-1">{label}</label>
    {children}
    {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
);

/** Shows the children only to people with the role; others see why the control is missing. */
export const Gate: React.FC<{ min: Role; children: React.ReactNode; quiet?: boolean }> = ({ min, children, quiet }) => {
  const { can } = useAuth();
  if (can(min)) return <>{children}</>;
  return quiet ? null : <p className="text-xs text-slate-500 dark:text-slate-400">{needsRole(min)}</p>;
};

export function useSubmit(after: () => void) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<{ error: string | null }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success(ok);
      after();
    }
    return !error;
  };
  return { busy, run };
}

export const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export const fromLocalInput = (v: string) => new Date(v).toISOString();
export const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }) + ' PHT' : '—';

// Status is always written out and carries an icon: colour is never the only signal (spec §10.3).
const STATUS_STYLE: Record<ProductStatus, { cls: string; Icon: React.ElementType }> = {
  draft: { cls: 'bg-slate-100 text-slate-800 border-slate-300', Icon: CircleDashed },
  processing: { cls: 'bg-slate-100 text-slate-800 border-slate-300', Icon: Clock },
  under_review: { cls: 'bg-blue-50 text-blue-900 border-blue-300', Icon: Eye },
  preliminary: { cls: 'bg-amber-50 text-amber-900 border-amber-400', Icon: AlertTriangle },
  for_field_verification: { cls: 'bg-amber-50 text-amber-900 border-amber-400', Icon: FileQuestion },
  verified: { cls: 'bg-emerald-50 text-emerald-900 border-emerald-400', Icon: BadgeCheck },
  published: { cls: 'bg-emerald-50 text-emerald-900 border-emerald-400', Icon: BadgeCheck },
  superseded: { cls: 'bg-slate-100 text-slate-700 border-slate-300', Icon: Archive },
  rejected: { cls: 'bg-red-50 text-red-900 border-red-300', Icon: XCircle },
  archived: { cls: 'bg-slate-100 text-slate-700 border-slate-300', Icon: Archive },
};

export const StatusBadge: React.FC<{ status: ProductStatus; level?: 'preliminary' | 'verified' | null; className?: string }> = ({ status, level, className }) => {
  const prelimPublished = status === 'published' && level !== 'verified';
  const s = prelimPublished ? STATUS_STYLE.preliminary : STATUS_STYLE[status];
  const label = status === 'published' ? `Published · ${level === 'verified' ? 'verified' : 'PRELIMINARY'}` : VERSION_STATUS_LABEL[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', s.cls, className)}>
      <s.Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
    </span>
  );
};

/** The spec's preliminary or verified statement (§16.2), shown with every product version. */
export const Disclaimer: React.FC<{ version: Pick<ProductVersion, 'status' | 'publication_level'> }> = ({ version }) => {
  const prelim = isPreliminary(version);
  return (
    <p role="note" className={cn('rounded-xl border px-3 py-2 text-xs leading-relaxed',
      prelim ? 'border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100' : 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100')}>
      {prelim ? PRELIMINARY_DISCLAIMER : VERIFIED_DISCLAIMER}
    </p>
  );
};

/** A small inline form with one text box and a button: used for notes and reasons on steps. */
export const NoteAction: React.FC<{
  id: string; label: string; button: string; minLength?: number; placeholder?: string; tone?: 'primary' | 'secondary' | 'danger';
  onSubmit: (note: string) => Promise<boolean>;
}> = ({ id, label, button, minLength = 0, placeholder, tone = 'secondary', onSubmit }) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form className="flex flex-wrap gap-2 items-end" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const ok = await onSubmit(note);
      setBusy(false);
      if (ok) setNote('');
    }}>
      <div className="flex-1 min-w-[12rem]">
        <label htmlFor={id} className="block text-xs font-semibold mb-1">{label}</label>
        <input id={id} className={input} value={note} minLength={minLength} required={minLength > 0} placeholder={placeholder} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button type="submit" disabled={busy} className={tone === 'primary' ? primary : tone === 'danger' ? danger : secondary}>{button}</button>
    </form>
  );
};
