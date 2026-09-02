import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile, UserRole } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isTeamLead: boolean;
  isEngineer: boolean;
  isViewer: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  canManageEngineers: boolean;
  canManageSchools: boolean;
  canApproveLogs: boolean;
  canAssignVisits: boolean;
}

import { createContext, useContext } from 'react';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const configured = isSupabaseConfigured();

  const fetchProfile = useCallback(async (uid: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Failed to load profile', error);
      return null;
    }
    return data as Profile | null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          const p = await fetchProfile(data.session.user.id);
          if (mounted) setProfile(p);
        }
      } catch (err) {
        console.error('Auth init failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await fetchProfile(s.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const role = profile?.role ?? null;

  const value = useMemo<AuthContextValue>(() => {
    const hasRole = (...roles: UserRole[]) => (role ? roles.includes(role) : false);
    return {
      session,
      user,
      profile,
      loading,
      configured,
      signOut,
      refreshProfile,
      isAdmin: role === 'admin',
      isTeamLead: role === 'team_lead',
      isEngineer: role === 'engineer',
      isViewer: role === 'viewer',
      hasRole,
      canManageEngineers: role === 'admin' || role === 'team_lead',
      canManageSchools: role === 'admin' || role === 'team_lead',
      canApproveLogs: role === 'admin' || role === 'team_lead',
      canAssignVisits: role === 'admin' || role === 'team_lead',
    };
  }, [session, user, profile, loading, configured, signOut, refreshProfile, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};