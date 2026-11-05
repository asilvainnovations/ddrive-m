import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/ddrive/Sidebar';
import TopBar from '@/components/ddrive/TopBar';
import LoginModal from '@/components/ddrive/LoginModal';
import AccessGate from '@/components/AccessGate';
import { FloatingChatbot } from '@/components/ddrive/AIChatbot';
import { ModuleKey, moduleByKey, moduleByPath } from '@/lib/modules';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const active = moduleByPath(location.pathname);
  const title = active?.title ?? 'Page not found';
  const subtitle = active?.subtitle ?? '';

  const handleNavigate = (key: ModuleKey) => {
    navigate(moduleByKey(key).path);
    setSidebarOpen(false); // close the drawer on phones after a choice
  };

  return (
    <div className="min-h-screen relative font-poppins text-slate-900 dark:text-white">
      {/* Flat background: large blurred layers are slow on low-end phones */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-100 via-blue-50 to-emerald-50 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-white focus:text-blue-800"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen">
        <Sidebar
          active={active?.key}
          onSelect={handleNavigate}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar
            onMenuClick={() => setSidebarOpen(true)}
            title={title}
            subtitle={subtitle}
          />
          <main id="main" className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto">
            <AccessGate>
              <Outlet />
            </AccessGate>
          </main>
        </div>
      </div>

      {active?.key !== 'assistant' && <FloatingChatbot />}
      <LoginModal />
    </div>
  );
};

export default AppLayout;
