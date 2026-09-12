import React from 'react';
import { useSocket } from '../context/SocketContext.tsx';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useSocket();

  if (toasts.length === 0) return null;

  return (
    <div id="toast-container" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        const bgClass = isSuccess
          ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-amber-900/10'
          : isWarning
          ? 'bg-orange-50 border-orange-300 text-orange-950 shadow-orange-900/10'
          : isError
          ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-rose-900/10'
          : 'bg-stone-50 border-amber-200 text-stone-900 shadow-stone-900/10';

        const IconComponent = isSuccess
          ? CheckCircle2
          : isWarning
          ? AlertTriangle
          : isError
          ? AlertCircle
          : Info;

        const iconColor = isSuccess
          ? 'text-amber-600'
          : isWarning
          ? 'text-orange-600'
          : isError
          ? 'text-rose-600'
          : 'text-amber-700';

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto border rounded-xl p-4 shadow-lg flex items-start gap-3 backdrop-blur-md transition-all duration-300 ${bgClass}`}
          >
            <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{toast.title}</p>
              <p className="text-xs text-stone-700 mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-stone-400 hover:text-stone-700 p-1 -mr-1 -mt-1 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
