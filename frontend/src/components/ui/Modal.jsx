export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-primary/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg animate-scale-in rounded-2xl bg-white p-6 shadow-elevated">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
