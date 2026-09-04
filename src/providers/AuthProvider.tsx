import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile, UserRole } from '../types';
import { releaseAllChannels } from '../services/api';

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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const queryClient = useQueryClient();
  const configured = isSupabaseConfigured();
  const inFlightToken = useRef<string | null>(null);
  const mountedRef = useRef(true);

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
    if (mountedRef.current) setProfile(p);
  }, [user, fetchProfile]);

  useEffect(() => {
    mountedRef.current = true;
    let initToken: string | null = null;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        const sess = data.session;
        initToken = sess?.access_token ?? null;
        inFlightToken.current = initToken;
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          const p = await fetchProfile(sess.user.id);
          if (mountedRef.current && inFlightToken.current === initToken) {
            setProfile(p);
          }
        }
      } catch (err) {
        console.error('Auth init failed', err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const token = s?.access_token ?? null;
      inFlightToken.current = token;
      if (!mountedRef.current) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).then((p) => {
          if (mountedRef.current && inFlightToken.current === token) {
            setProfile(p);
            setLoading(false);
          }
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    inFlightToken.current = null;
    setProfile(null);
    setUser(null);
    setSession(null);
    queryClient.clear();
    releaseAllChannels();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out failed', err);
    }
  }, [queryClient]);

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
