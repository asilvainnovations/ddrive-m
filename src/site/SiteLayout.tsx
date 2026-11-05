import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogIn, Menu, X } from 'lucide-react';
import DDriveLogo from '@/components/ddrive/DDriveLogo';
import LoginModal from '@/components/ddrive/LoginModal';
import OfflineBanner from '@/components/OfflineBanner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { FOOTER_NAV, PRIMARY_NAV, SiteLink } from './nav';

const linkClass = 'px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-white/5 dark:hover:text-white';

const NavItem: React.FC<{ link: SiteLink; className?: string; onClick?: () => void }> = ({ link, className, onClick }) =>
  link.external ? (
    <a href={link.to} className={className ?? linkClass} onClick={onClick}>
      {link.label}
    </a>
  ) : (
    <NavLink
      to={link.to}
      onClick={onClick}
      className={({ isActive }) => cn(className ?? linkClass, isActive && 'text-blue-800 dark:text-white bg-blue-50 dark:bg-white/10')}
    >
      {link.label}
    </NavLink>
  );

// Layout for the public pages: Home, policies and help. Signed-in or not, everything here is readable.
const SiteLayout: React.FC = () => {
  const { user, openLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const wantsDashboard = useRef(false);

  // After "Sign in" succeeds from a public page, continue to the dashboard.
  useEffect(() => {
    if (user && wantsDashboard.current) {
      wantsDashboard.current = false;
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const signIn = () => {
    wantsDashboard.current = true;
    openLogin();
  };

  const AccountButton: React.FC<{ block?: boolean }> = ({ block }) =>
    user ? (
      <Link
        to="/dashboard"
        className={cn('inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold', block && 'w-full')}
      >
        <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> Open dashboard
      </Link>
    ) : (
      <button
        type="button"
        onClick={signIn}
        className={cn('inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold', block && 'w-full')}
      >
        <LogIn className="w-4 h-4" aria-hidden="true" /> Sign in
      </button>
    );

  return (
    <div className="min-h-screen flex flex-col font-poppins text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-white focus:text-blue-800"
      >
        Skip to main content
      </a>
      <OfflineBanner />

      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-3">
          <DDriveLogo size={40} withName nameClassName="text-xl text-slate-900 dark:text-white" />
          <nav aria-label="Main" className="hidden lg:flex items-center gap-1 ml-6">
            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            {PRIMARY_NAV.map((l) => <NavItem key={l.to} link={l} />)}
          </nav>
          <div className="flex-1" />
          <div className="hidden lg:block"><AccountButton /></div>
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <nav id="site-menu" aria-label="Main" className="lg:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-col gap-1 bg-white dark:bg-slate-900">
            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            {PRIMARY_NAV.map((l) => <NavItem key={l.to} link={l} />)}
            <div className="pt-2"><AccountButton block /></div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-300 mt-16">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <DDriveLogo size={44} withName nameClassName="text-lg text-white" />
            <p className="text-sm text-slate-400">
              Risk and resilience intelligence for disaster risk reduction, climate adaptation and continuity in the Philippines.
            </p>
            <p className="text-xs text-slate-400">
              DDRiVE-M relays official warnings; it does not issue them. Follow PAGASA, PHIVOLCS and your local DRRM office.
            </p>
          </div>
          {FOOTER_NAV.map((col) => (
            <div key={col.heading}>
              <h2 className="font-montserrat font-semibold text-white text-sm mb-3">{col.heading}</h2>
              <ul className="space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.to}>
                    {l.external ? (
                      <a href={l.to} className="hover:text-white">{l.label}</a>
                    ) : (
                      <Link to={l.to} className="hover:text-white">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 py-5 text-center text-xs text-slate-500 px-4">
          © {new Date().getFullYear()} ASilva Innovations. DDRiVE-M is a product of ASilva Innovations, Muntinlupa City, Philippines.
        </div>
      </footer>

      <LoginModal />
    </div>
  );
};

export default SiteLayout;
