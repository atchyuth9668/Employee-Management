import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('card', className)}>{children}</div>
);

export const CardHeader = ({ title, actions }: { title: string; actions?: ReactNode }) => (
  <div className="card-header">
    <h3 className="card-title">{title}</h3>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);

export const CardBody = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('card-body', className)}>{children}</div>
);