import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Render Stack */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast) => {
          const typeColors = {
            success: 'bg-emerald-950 border-emerald-500/30 text-emerald-300',
            error: 'bg-red-950 border-red-500/30 text-red-300',
            info: 'bg-blue-950 border-blue-500/30 text-blue-300',
            warning: 'bg-amber-950 border-amber-500/30 text-amber-300',
          };

          const Icons = {
            success: <CheckCircle className="h-5 w-5 text-emerald-400" />,
            error: <AlertCircle className="h-5 w-5 text-red-400" />,
            info: <Info className="h-5 w-5 text-blue-400" />,
            warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
          };

          return (
            <div
              key={toast.id}
              className={`flex items-start justify-between p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 ${typeColors[toast.type]}`}
            >
              <div className="flex items-center gap-3">
                {Icons[toast.type]}
                <p className="text-xs font-semibold tracking-wide text-left">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
