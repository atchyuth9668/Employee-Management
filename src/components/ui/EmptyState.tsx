import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon ?? <Inbox size={26} />}</div>
    <div className="empty-state-title">{title}</div>
    {description && <div className="empty-state-desc">{description}</div>}
    {action}
  </div>
);