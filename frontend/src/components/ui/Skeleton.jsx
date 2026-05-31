export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
