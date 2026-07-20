import React, { useState } from 'react';
import { Menu, Search, Bell, Sun, Moon, ChevronDown } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface TopBarProps {
  onMenuClick: () => void;
  title: string;
  subtitle: string;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick, title, subtitle }) => {
  const { theme, setTheme } = useTheme();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl">
      <div className="flex items-center gap-4 px-4 lg:px-8 h-16">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/5"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:block">
          <h2 className="font-montserrat font-bold text-lg text-slate-900 dark:text-white leading-tight">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-poppins">{subtitle}</p>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search risks, incidents, plans..."
            className="bg-transparent outline-none text-sm flex-1 font-poppins"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 dark:bg-white/10 text-slate-500">⌘K</kbd>
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 transition"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative p-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 transition"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
          </button>
          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-3">
              <p className="font-semibold text-sm mb-2 font-montserrat">Notifications</p>
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs">
                  <p className="font-semibold text-red-700 dark:text-red-300">Critical: Typhoon Signal #3</p>
                  <p className="text-slate-600 dark:text-slate-400">Eastern Visayas - 2 min ago</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs">
                  <p className="font-semibold text-amber-700 dark:text-amber-300">Warning: River Level Rising</p>
                  <p className="text-slate-600 dark:text-slate-400">Marikina - 15 min ago</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 p-1 pr-3 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 transition"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">
              JD
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold font-poppins leading-tight">J. Dela Cruz</p>
              <p className="text-[10px] text-slate-500">Super Admin</p>
            </div>
            <ChevronDown className="w-3 h-3 hidden md:block" />
          </button>
          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-3 text-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-sm font-bold">JD</div>
                <div>
                  <p className="font-semibold">Juan Dela Cruz</p>
                  <p className="text-xs text-slate-500">jdelacruz@ddrive.gov.ph</p>
                </div>
              </div>
              <div className="py-2 space-y-1">
                <button className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">My Profile</button>
                <button className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">Activity History</button>
                <button className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">Credentials</button>
                <button className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">Sign Out</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
