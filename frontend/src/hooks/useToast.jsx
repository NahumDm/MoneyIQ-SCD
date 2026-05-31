import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const value = useMemo(
    () => ({ showToast, success: (m) => showToast(m, 'success'), error: (m) => showToast(m, 'error'), info: (m) => showToast(m, 'info') }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-slide-up rounded-xl px-4 py-3 text-sm font-medium text-white shadow-elevated ${
              t.type === 'success' ? 'bg-success' : t.type === 'error' ? 'bg-error' : 'bg-primary'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || 'Something went wrong';
}
