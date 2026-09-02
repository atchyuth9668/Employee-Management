import { cn } from '../../utils/cn';

export const Skeleton = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={cn('skeleton', className)} style={style} />
);

export const SkeletonRow = ({ cols = 4 }: { cols?: number }) => (
  <div className="card-pad">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex gap-3" style={{ marginBottom: 12 }}>
        {Array.from({ length: cols }).map((__, j) => (
          <Skeleton key={j} style={{ height: 16, flex: 1 }} />
        ))}
      </div>
    ))}
  </div>
);