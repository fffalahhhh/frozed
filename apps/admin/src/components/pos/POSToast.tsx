import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let externalToastHandler: ((message: string, type?: ToastType) => void) | null = null;

export const triggerPOSToast = (message: string, type: ToastType = 'info') => {
  if (externalToastHandler) {
    externalToastHandler(message, type);
  }
};

export const POSToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  externalToastHandler = showToast;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pos-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`pos-toast ${t.type}`}>
            {t.type === 'success' && <span>✓</span>}
            {t.type === 'error' && <span>✕</span>}
            {t.type === 'warning' && <span>⚠</span>}
            {t.type === 'info' && <span>ℹ</span>}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const usePOSToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { showToast: triggerPOSToast };
  }
  return ctx;
};
