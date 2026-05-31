export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
      <p className="text-sm text-neutral">{label}</p>
    </div>
  );
}
