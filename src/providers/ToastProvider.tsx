import { useCallback, useMemo, useState } from 'react';
import type { Toast, ToastVariant } from '../utils/helpers';

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

import { createContext, useContext } from 'react';

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const buildToast = (variant: ToastVariant, title: string, description?: string): Omit<Toast, 'id'> => ({
  variant,
  title,
  description,
});

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((curr) => [...curr, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      dismiss,
      success: (title, description) => push(buildToast('success', title, description)),
      error: (title, description) => push(buildToast('error', title, description)),
      warning: (title, description) => push(buildToast('warning', title, description)),
      info: (title, description) => push(buildToast('info', title, description)),
    }),
    [push, dismiss, toasts]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};