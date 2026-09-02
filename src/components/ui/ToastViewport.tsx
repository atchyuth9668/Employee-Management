import { CheckCircle2, AlertTriangle, XCircle, InfoIcon } from 'lucide-react';
import { useToast } from '../../providers/ToastProvider';

export const ToastViewport = () => {
  const { toasts, dismiss } = useToast();
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => {
        const Icon = t.variant === 'success' ? CheckCircle2 : t.variant === 'error' ? XCircle : t.variant === 'warning' ? AlertTriangle : InfoIcon;
        return (
          <div key={t.id} className={`toast toast-${t.variant}`} role="status">
            <Icon size={18} aria-hidden="true" style={{ marginTop: 2 }} />
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              {t.description && <div className="toast-desc">{t.description}</div>}
            </div>
            <button className="btn btn-ghost btn-sm" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};