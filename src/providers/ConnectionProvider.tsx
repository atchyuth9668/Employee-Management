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
    if (!isSupabaseConfigured()) {
      setState(navigator.onLine ? 'connected' : 'disconnected');
      return;
    }
    let mounted = true;
    const channel = supabase.channel('connection-state', {
      config: { presence: { key: 'connection-monitor' } },
    });

    const ping = setInterval(() => {
      if (!mounted) return;
      const last = channel.socket ? 'connected' : 'connecting';
      setState((prev) => (prev === 'disconnected' ? prev : last));
    }, 4000);

    channel
      .on('system', {}, (payload) => {
        if (!mounted) return;
        if (payload?.extension === 'postgres_changes' || payload?.status) {
          setState('connected');
        }
      })
      .subscribe((status: string) => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') {
          setState('connected');
        }
        if (status === 'CLOSED' || status === 'TIMED_OUT') {
          setState('disconnected');
        }
        if (status === 'CONNECTING') {
          setState('connecting');
        }
      });

    const onOnline = () => setState('connected');
    const onOffline = () => setState('disconnected');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    if (navigator.onLine) setState('connected');

    return () => {
      mounted = false;
      clearInterval(ping);
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