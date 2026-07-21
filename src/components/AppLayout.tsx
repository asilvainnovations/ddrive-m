import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar, { ModuleKey } from '@/components/ddrive/Sidebar';
import TopBar from '@/components/ddrive/TopBar';
import { FloatingChatbot } from '@/components/ddrive/AIChatbot';

const titles: Record<ModuleKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Command Dashboard', subtitle: 'Centralized Intelligence · All 7 Phases' },
  detection: { title: 'Detection Module', subtitle: 'Phase 1 · Multi-Agency Hazard Monitoring' },
  diagnosis: { title: 'Diagnosis Module', subtitle: 'Phase 2 · ISO 31000 Risk Registry' },
  response: { title: 'Response Module', subtitle: 'Phase 3 · Treatment & Incident Management' },
  integration: { title: 'Integration Module', subtitle: 'Phase 4 · UNDRR 10 Essentials' },
  validation: { title: 'Validation Module', subtitle: 'Phase 5 · Simulation Engine' },
  enhancement: { title: 'Enhancement Module', subtitle: 'Phase 6 · AI Plan Generator' },
  monitoring: { title: 'Monitoring Module', subtitle: 'Phase 7 · Collaboration Hub' },
  documents: { title: 'Document Management', subtitle: 'Plans · Protocols · Procedures' },
  assistant: { title: 'DDRiVER AI', subtitle: 'Context-aware DRRM Expert' },
  settings: { title: 'Settings', subtitle: 'Account · Security · Preferences' },
};

// Maps URL paths to their parent ModuleKey for accurate highlighting
const routeToModuleMap: Record<string, ModuleKey> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/detection': 'detection',
  '/diagnosis': 'diagnosis',
  '/risk-assessment': 'diagnosis',
  '/response': 'response',
  '/integration': 'integration',
  '/validation': 'validation',
  '/enhancement': 'enhancement',
  '/compliance': 'enhancement',
  '/monitoring': 'monitoring',
  '/collaboration': 'monitoring',
  '/documents': 'documents',
  '/plan-library': 'documents',
  '/plan-generator': 'documents',
  '/assistant': 'assistant',
  '/settings': 'settings',
};

// Maps ModuleKey back to the primary route for navigation
const moduleToRouteMap: Record<ModuleKey, string> = {
  dashboard: '/',
  detection: '/detection',
  diagnosis: '/diagnosis',
  response: '/response',
  integration: '/integration',
  validation: '/validation',
  enhancement: '/enhancement',
  monitoring: '/monitoring',
  documents: '/documents',
  assistant: '/assistant',
  settings: '/settings',
};

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Determine active module based on current URL path
  const activeModule: ModuleKey = routeToModuleMap[location.pathname] || 'dashboard';

  const handleNavigate = (module: ModuleKey) => {
    navigate(moduleToRouteMap[module]);
    setSidebarOpen(false); // Auto-close sidebar on mobile after selection
  };

  return (
    <div className="min-h-screen relative font-poppins text-slate-900 dark:text-white">
      {/* Ambient background gradient */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-100 via-blue-50 to-emerald-50 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900" />
      <div className="fixed top-0 left-0 w-[800px] h-[800px] -z-10 bg-blue-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] -z-10 bg-emerald-400/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      <div className="fixed top-1/2 left-1/2 w-[400px] h-[400px] -z-10 bg-amber-300/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="flex min-h-screen">
        <Sidebar
          active={activeModule}
          onSelect={handleNavigate}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar
            onMenuClick={() => setSidebarOpen(true)}
            title={titles[activeModule].title}
            subtitle={titles[activeModule].subtitle}
          />
          <main className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto">
            {/* Outlet dynamically renders the matched child route component (e.g., Dashboard, RiskAssessment) */}
            <Outlet />
          </main>
        </div>
      </div>

      <FloatingChatbot />
    </div>
  );
};

export default AppLayout;
