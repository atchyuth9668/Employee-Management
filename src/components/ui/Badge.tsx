import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
  children: ReactNode;
  className?: string;
}

export const Badge = ({ variant = 'neutral', children, className }: BadgeProps) => {
  return <span className={cn('badge', `badge-${variant}`, className)}>{children}</span>;
};