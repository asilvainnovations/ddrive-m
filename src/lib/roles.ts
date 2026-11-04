// Organisation roles. These mirror the database (supabase/migrations/*_phase1_core.sql, ADR-001).
// The database enforces them; the app only uses them to show or explain what a person can do.

export type Role = 'viewer' | 'responder' | 'analyst' | 'drrm_officer' | 'tenant_admin';

export const ROLES: Role[] = ['viewer', 'responder', 'analyst', 'drrm_officer', 'tenant_admin'];

export const ROLE_LABELS: Record<Role, string> = {
  viewer: 'Viewer',
  responder: 'Responder',
  analyst: 'Analyst',
  drrm_officer: 'DRRM officer',
  tenant_admin: 'Administrator',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  viewer: 'Reads everything in the organisation.',
  responder: 'Also reports hazards and incidents, updates incidents, posts messages, logs exercise participation.',
  analyst: 'Also manages risks, scorecard entries, plan drafts and documents.',
  drrm_officer: 'Also approves and retires plans, manages exercises, sends critical messages, reads the audit log.',
  tenant_admin: 'Also manages members, roles and organisation settings.',
};

const rank = (r: Role | null | undefined) => (r ? ROLES.indexOf(r) + 1 : 0);

/** True when `role` has at least the authority of `min`. */
export const hasRole = (role: Role | null | undefined, min: Role) => rank(role) >= rank(min);

/** Plain-language reason shown on a disabled control. */
export const needsRole = (min: Role) => `Needs the ${ROLE_LABELS[min]} role or higher. Ask your administrator.`;
