import React, { useState } from 'react';
import { Menu, Bell, Sun, Moon, ChevronDown, LogIn } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/roles';
import { toast } from '@/components/ui/sonner';

interface TopBarProps {
  onMenuClick: () => void;
  title: string;
  subtitle: string;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick, title, subtitle }) => {
  const { theme, setTheme } = useTheme();
  const { user, profile, loading, openLogin, signOut, memberships, activeTenant, setActiveTenant } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const name = profile?.full_name || user?.email || '';
  const initials = profile?.avatar_initials || (name ? name.slice(0, 2).toUpperCase() : '');
  const role = activeTenant ? `${ROLE_LABELS[activeTenant.role]} · ${activeTenant.tenant_name}` : 'No organisation';

  const switchTo = async (tenantId: string) => {
    setShowProfile(false);
    const { error } = await setActiveTenant(tenantId);
    if (error) toast.error(error);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/40 dark:border-white/10 bg-white/90 dark:bg-slate-900/90">
      <div className="flex items-center gap-4 px-4 lg:px-8 h-16">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="lg:hidden p-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/5"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:block">
          <h2 className="font-montserrat font-bold text-lg text-slate-900 dark:text-white leading-tight">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-poppins">{subtitle}</p>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 transition"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotif(!showNotif)}
            aria-label="Notifications"
            aria-expanded={showNotif}
            className="relative p-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 transition"
          >
            <Bell className="w-5 h-5" />
          </button>
          {showNotif && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-4 text-xs">
              <p className="font-semibold text-sm mb-1 font-montserrat">Notifications</p>
              <p className="text-slate-600 dark:text-slate-300">
                No notifications yet. Agency alert feeds are not connected in this version.
              </p>
            </div>
          )}
        </div>

        {loading ? null : user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfile(!showProfile)}
              aria-expanded={showProfile}
              aria-label="Account menu"
              className="flex items-center gap-2 p-1 pr-3 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold font-poppins leading-tight">{name}</p>
                <p className="text-[10px] text-slate-500">{role}</p>
              </div>
              <ChevronDown className="w-3 h-3 hidden md:block" />
            </button>
            {showProfile && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-3 text-sm">
                <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                  <p className="font-semibold">{name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                {memberships.length > 1 && (
                  <div className="py-2 border-b border-slate-200 dark:border-slate-700">
                    <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-slate-500">Switch organisation</p>
                    {memberships.map((m) => (
                      <button
                        type="button"
                        key={m.tenant_id}
                        onClick={() => switchTo(m.tenant_id)}
                        aria-current={m.tenant_id === activeTenant?.tenant_id ? 'true' : undefined}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between gap-2"
                      >
                        <span className="truncate">{m.tenant_name}</span>
                        <span className="text-[11px] text-slate-500 shrink-0">{ROLE_LABELS[m.role]}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setShowProfile(false); signOut(); }}
                  className="mt-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={openLogin}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800"
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </button>
        )}
      </div>
    </header>
  );
};

export default TopBar;
