// Single source of truth for the platform's modules: their keys, routes and page titles.
// Sidebar, AppLayout, App (router) and Dashboard all read from here.

export type ModuleKey =
  | 'dashboard'
  | 'detection'
  | 'diagnosis'
  | 'response'
  | 'integration'
  | 'validation'
  | 'enhancement'
  | 'monitoring'
  | 'documents'
  | 'assistant'
  | 'settings';

export interface ModuleMeta {
  key: ModuleKey;
  label: string;
  path: string;
  title: string;
  subtitle: string;
  phase?: number;
}

export const MODULES: ModuleMeta[] = [
  { key: 'dashboard', label: 'Command Dashboard', path: '/', title: 'Command Dashboard', subtitle: 'Overview of all 7 phases' },
  { key: 'detection', label: 'Detection', path: '/detection', title: 'Detection Module', subtitle: 'Phase 1 · Multi-agency hazard monitoring', phase: 1 },
  { key: 'diagnosis', label: 'Diagnosis', path: '/diagnosis', title: 'Diagnosis Module', subtitle: 'Phase 2 · ISO 31000 risk registry', phase: 2 },
  { key: 'response', label: 'Response', path: '/response', title: 'Response Module', subtitle: 'Phase 3 · Treatment and incident management', phase: 3 },
  { key: 'integration', label: 'Integration', path: '/integration', title: 'Integration Module', subtitle: 'Phase 4 · UNDRR 10 Essentials', phase: 4 },
  { key: 'validation', label: 'Validation', path: '/validation', title: 'Validation Module', subtitle: 'Phase 5 · Simulations and exercises', phase: 5 },
  { key: 'enhancement', label: 'Enhancement', path: '/enhancement', title: 'Enhancement Module', subtitle: 'Phase 6 · Plans and lessons learned', phase: 6 },
  { key: 'monitoring', label: 'Monitoring', path: '/monitoring', title: 'Monitoring Module', subtitle: 'Phase 7 · Collaboration hub', phase: 7 },
  { key: 'documents', label: 'Documents', path: '/documents', title: 'Document Management', subtitle: 'Plans · Protocols · Procedures' },
  { key: 'assistant', label: 'DDRiVER AI', path: '/assistant', title: 'DDRiVER AI', subtitle: 'DRRM reference assistant (not yet connected)' },
  { key: 'settings', label: 'Settings', path: '/settings', title: 'Settings', subtitle: 'Account · Security · Preferences' },
];

export const moduleByKey = (key: ModuleKey): ModuleMeta =>
  MODULES.find((m) => m.key === key) ?? MODULES[0];

/** The module for a URL path, or undefined when no module lives there (the 404 page). */
export const moduleByPath = (pathname: string): ModuleMeta | undefined => {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return MODULES.find((m) => m.path === clean);
};

// Older URLs that used to point at standalone pages. They now redirect to the module that replaced them.
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/dashboard': '/',
  '/risk-assessment': '/diagnosis',
  '/plan-generator': '/enhancement',
  '/plan-library': '/documents',
  '/compliance': '/enhancement',
  '/collaboration': '/monitoring',
};
