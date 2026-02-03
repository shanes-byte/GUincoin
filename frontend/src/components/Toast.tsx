import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    message: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  const typeStyles: Record<ToastType, string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-500 text-gray-900',
  };

  return (
    <ToastContext.Provider value={{ addToast, confirm }}>
      {children}
      {createPortal(
        <>
          {/* Toast notifications */}
          <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                role="alert"
                className={`${typeStyles[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-2 animate-slide-in`}
              >
                <span className="text-sm">{toast.message}</span>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-white/80 hover:text-white text-lg leading-none"
                  aria-label="Dismiss"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {/* Confirm dialog */}
          {confirmState && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-[9999] flex items-center justify-center">
              <div
                className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
              >
                <p id="confirm-title" className="text-gray-900 mb-4">{confirmState.message}</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirm(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
