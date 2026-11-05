import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Role, needsRole } from '@/lib/roles';

interface GatedButtonProps {
  /** Lowest role allowed to use this control. The database enforces the same rule. */
  min: Role;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}

// A button that is disabled, with the reason shown, when the person's role is too low.
const GatedButton: React.FC<GatedButtonProps> = ({ min, onClick, className, children }) => {
  const { can } = useAuth();
  const allowed = can(min);
  const reasonId = useId();
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={allowed ? onClick : undefined}
        disabled={!allowed}
        aria-describedby={allowed ? undefined : reasonId}
        className={cn(className, !allowed && 'opacity-50 cursor-not-allowed')}
      >
        {children}
      </button>
      {!allowed && (
        <span id={reasonId} className="mt-1 max-w-[16rem] text-right text-[11px] leading-tight text-slate-600 dark:text-slate-400">
          {needsRole(min)}
        </span>
      )}
    </span>
  );
};

export default GatedButton;
