import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface DDriveProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  organization: string;
  avatar_initials: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: DDriveProfile | null;
  loading: boolean;
  loginModalOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

function buildInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

async function upsertProfile(user: User): Promise<DDriveProfile | null> {
  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    (user.email ? user.email.split('@')[0] : 'DDRiVE User');
  const initials = buildInitials(fullName);

  const profile = {
    id: user.id,
    full_name: fullName,
    email: user.email || '',
    role: 'Operator',
    organization: 'NDRRMC',
    avatar_initials: initials,
  };

  try {
    // Try insert; if exists, fetch
    const { error: insertErr } = await supabase
      .from('ddrive_users')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();

    if (insertErr) {
      // Fallback: fetch existing
      const { data } = await supabase
        .from('ddrive_users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (data) return data as DDriveProfile;
    }
    return profile;
  } catch (e) {
    console.warn('[Auth] profile upsert fallback', e);
    return profile;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DDriveProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const refreshProfile = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      return;
    }
    const p = await upsertProfile(u);
    setProfile(p);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        refreshProfile(data.session.user);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        refreshProfile(sess.user);
        setLoginModalOpen(false);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshProfile]);

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
      options: { redirectTo: window.location.origin },
    });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        loginModalOpen,
        openLogin: () => setLoginModalOpen(true),
        closeLogin: () => setLoginModalOpen(false),
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
