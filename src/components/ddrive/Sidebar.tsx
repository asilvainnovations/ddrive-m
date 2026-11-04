import React from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Radar, Stethoscope, Shield, Network, FlaskConical,
  Sparkles, Radio, FileText, Bot, Settings, X
} from 'lucide-react';

import { MODULES, ModuleKey } from '@/lib/modules';

export type { ModuleKey };

interface SidebarProps {
  active?: ModuleKey;
  onSelect: (key: ModuleKey) => void;
  open: boolean;
  onClose: () => void;
}

const icons: Record<ModuleKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  detection: Radar,
  diagnosis: Stethoscope,
  response: Shield,
  integration: Network,
  validation: FlaskConical,
  enhancement: Sparkles,
  monitoring: Radio,
  documents: FileText,
  assistant: Bot,
  settings: Settings,
};

const items = MODULES.map((m) => ({
  ...m,
  icon: icons[m.key],
  badge: m.key === 'assistant' ? 'AI' : undefined,
}));

const Sidebar: React.FC<SidebarProps> = ({ active, onSelect, open, onClose }) => {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-72 shrink-0',
          'bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl',
          'border-r border-white/40 dark:border-white/10',
          'transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/40 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center shadow-lg shadow-blue-900/30">
              <Shield className="w-5 h-5 text-amber-300" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-montserrat font-bold text-lg tracking-tight text-slate-900 dark:text-white">DDRiVE-M</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-roboto-condensed">Intelligence Platform</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close menu" className="lg:hidden text-slate-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Modules" className="p-3 overflow-y-auto h-[calc(100vh-80px)]">
          <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-400 font-roboto-condensed font-semibold">Intelligence Cycle</p>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                type="button"
                key={item.key}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => { onSelect(item.key); onClose(); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-poppins transition-all group relative',
                  isActive
                    ? 'bg-gradient-to-r from-blue-700 to-blue-800 text-white shadow-lg shadow-blue-900/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5'
                )}
              >
                {item.phase && (
                  <span className={cn(
                    'text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                    isActive ? 'bg-amber-300 text-blue-900' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  )}>
                    {item.phase}
                  </span>
                )}
                <Icon className={cn('w-4 h-4 shrink-0', !item.phase && 'ml-0')} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <p className="mt-6 mx-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Hazard information shown here is entered by your team. For official warnings, follow PAGASA,
            PHIVOLCS and your local DRRM office.
          </p>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
