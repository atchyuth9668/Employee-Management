import { cn } from '../../utils/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar = ({ value, max = 100, variant = 'default', showLabel, className }: ProgressBarProps) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('progress', variant === 'success' ? 'progress-success' : variant === 'warning' ? 'progress-warning' : '')} style={{ flex: 1 }}>
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <span className="text-xs text-muted" style={{ minWidth: 36, textAlign: 'right' }}>{Math.round(pct)}%</span>
      )}
    </div>
  );
};