import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useNotifications } from '../../services/api';
import { ESCALATION_URGENCY_LABELS } from '../../utils/constants';
import { relativeFromNow } from '../../utils/date';
import { EmptyState } from '../ui/EmptyState';

export const NotificationsPanel = ({ onClose }: { onClose: () => void }) => {
  const { data = [] } = useNotifications();
  const navigate = useNavigate();

  return (
    <div className="notifications-panel" role="dialog" aria-label="Notifications">
      <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="card-title">Notifications</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <div style={{ overflowY: 'auto' }}>
        {data.length === 0 ? (
          <EmptyState icon={<AlertTriangle size={26} />} title="No active escalations" description="All clear across the platform." />
        ) : (
          data.map((n) => (
            <button
              key={n.id}
              className="list-item"
              style={{ background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
              onClick={() => {
                onClose();
                navigate(`/escalations/${n.id}`);
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-medium truncate" style={{ fontSize: 13 }}>
                  {ESCALATION_URGENCY_LABELS[n.urgency]} · {n.issue_type.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-muted">{relativeFromNow(n.created_at)}</div>
              </div>
              <span className={`badge badge-${n.urgency === 'critical' ? 'danger' : n.urgency === 'high' ? 'warning' : 'info'}`}>
                {n.status}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};