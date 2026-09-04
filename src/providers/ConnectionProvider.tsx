import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface ConnectionContextValue {
  state: ConnectionState;
}

import { createContext, useContext } from 'react';

const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined);

export const ConnectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    const onOnline = () => setState('connected');
    const onOffline = () => setState('disconnected');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    if (!isSupabaseConfigured()) {
      setState(navigator.onLine ? 'connected' : 'disconnected');
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }
    let mounted = true;
    const channel = supabase.channel('connection-state', {
      config: { presence: { key: 'connection-monitor' } },
    });

    channel
      .on('system', {}, () => {
        if (!mounted) return;
        setState('connected');
      })
      .subscribe((status: string) => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED') setState('connected');
        if (status === 'CLOSED' || status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') setState('disconnected');
        if (status === 'CONNECTING') setState('connecting');
      });

    if (navigator.onLine) setState('connected');

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      supabase.removeChannel(channel);
    };
  }, []);

  return <ConnectionContext.Provider value={{ state }}>{children}</ConnectionContext.Provider>;
};

export const useConnection = (): ConnectionContextValue => {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnection must be used within ConnectionProvider');
  return ctx;
};