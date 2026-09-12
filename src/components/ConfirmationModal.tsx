import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'success';
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?: (val: string) => void;
  showInput?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  inputPlaceholder,
  inputValue,
  onInputChange,
  showInput = false,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';

  const btnColor = isDanger
    ? 'bg-rose-700 hover:bg-rose-800 text-white'
    : isSuccess
    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
    : 'bg-amber-600 hover:bg-amber-700 text-white';

  const IconComponent = isDanger ? AlertCircle : isSuccess ? CheckCircle2 : AlertTriangle;
  const iconColor = isDanger ? 'text-rose-600 bg-rose-50' : isSuccess ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50';

  return (
    <div id="confirmation-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
      <div
        id="confirmation-modal-card"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200/80 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-3">
          <div className={`p-2.5 rounded-xl ${iconColor}`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-bold text-stone-900 font-serif">{title}</h3>
          <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">{message}</p>
        </div>

        {showInput && (
          <div className="mt-4">
            <textarea
              id="confirmation-reason-input"
              rows={2}
              value={inputValue || ''}
              onChange={(e) => onInputChange?.(e.target.value)}
              placeholder={inputPlaceholder || 'Add optional remarks or reason...'}
              className="w-full text-sm rounded-xl border border-stone-300 p-2.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-2 ${btnColor} disabled:opacity-50`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
