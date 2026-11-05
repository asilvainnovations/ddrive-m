import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { Role, hasRole } from '@/lib/roles';

export interface DDriveProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_initials: string | null;
  active_tenant_id: string | null;
}

export interface Membership {
  tenant_id: string;
  tenant_name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: DDriveProfile | null;
  /** Organisations the user belongs to (active memberships only). */
  memberships: Membership[];
  /** The organisation the user is working in, if any. */
  activeTenant: Membership | null;
  /** True when the user has at least this role in the active organisation. UI only; the database decides. */
  can: (min: Role) => boolean;
  loading: boolean;
  loginModalOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  /** Emails a password-reset link that opens /reset-password. */
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** Sets a new password for the signed-in user (after following a reset link). */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setActiveTenant: (tenantId: string) => Promise<{ error: string | null }>;
  createTenant: (name: string, kind: string) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

interface MembershipRow {
  tenant_id: string;
  role: Role;
  status: string;
  ddrive_tenants: { name: string } | { name: string }[] | null;
}

// Profiles are created by the database when an account is made (Phase 1). Role and organisation come
// from memberships, which only administrators can change.
async function loadAccount(user: User): Promise<{ profile: DDriveProfile | null; memberships: Membership[] }> {
  const [{ data: profile, error: pErr }, { data: rows, error: mErr }] = await Promise.all([
    supabase.from('ddrive_users').select('id, full_name, email, avatar_initials, active_tenant_id').eq('id', user.id).maybeSingle(),
    supabase.from('ddrive_memberships').select('tenant_id, role, status, ddrive_tenants(name)').eq('user_id', user.id),
  ]);
  if (pErr) console.warn('[Auth] profile load failed:', pErr.message);
  if (mErr) console.warn('[Auth] membership load failed:', mErr.message);

  const memberships: Membership[] = ((rows as MembershipRow[] | null) ?? [])
    .filter((m) => m.status === 'active')
    .map((m) => {
      const t = Array.isArray(m.ddrive_tenants) ? m.ddrive_tenants[0] : m.ddrive_tenants;
      return { tenant_id: m.tenant_id, tenant_name: t?.name ?? 'Organisation', role: m.role };
    })
    .sort((a, b) => a.tenant_name.localeCompare(b.tenant_name));

  return { profile: (profile as DDriveProfile | null) ?? null, memberships };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DDriveProfile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const load = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setMemberships([]);
      return;
    }
    const account = await loadAccount(u);
    setProfile(account.profile);
    setMemberships(account.memberships);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        await load(data.session?.user ?? null);
      })
      .catch(() => undefined)
      .finally(() => { if (mounted) setLoading(false); });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      void load(sess?.user ?? null);
      if (sess?.user) setLoginModalOpen(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const activeTenant =
    memberships.find((m) => m.tenant_id === profile?.active_tenant_id) ?? null;

  const can = useCallback((min: Role) => hasRole(activeTenant?.role, min), [activeTenant]);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error ? error.message : null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    return { error: error ? error.message : null };
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    return { error: error ? error.message : null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const setActiveTenant = async (tenantId: string) => {
    const { error } = await supabase.rpc('ddrive_set_active_tenant', { p_tenant: tenantId });
    if (!error) await load(user);
    return { error: error ? error.message : null };
  };

  const createTenant = async (name: string, kind: string) => {
    const { error } = await supabase.rpc('ddrive_create_tenant', { p_name: name, p_kind: kind });
    if (!error) await load(user);
    return { error: error ? error.message : null };
  };

  const refresh = useCallback(() => load(user), [load, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        memberships,
        activeTenant,
        can,
        loading,
        loginModalOpen,
        openLogin: () => setLoginModalOpen(true),
        closeLogin: () => setLoginModalOpen(false),
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        sendPasswordReset,
        updatePassword,
        signOut,
        setActiveTenant,
        createTenant,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
