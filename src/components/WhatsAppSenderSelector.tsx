import React, { useEffect, useState } from 'react';
import { WhatsAppContactNumber } from '../types/index.ts';
import { subscribeToAdminWhatsAppNumbers } from '../services/whatsappService.ts';
import { MessageSquare, AlertCircle, Check, Settings, Sparkles } from 'lucide-react';

interface WhatsAppSenderSelectorProps {
  selectedNumberId?: string;
  onSelect: (selected: WhatsAppContactNumber | null) => void;
  title?: string;
  onNavigateToSettings?: () => void;
  className?: string;
}

export const WhatsAppSenderSelector: React.FC<WhatsAppSenderSelectorProps> = ({
  selectedNumberId,
  onSelect,
  title = 'Send From WhatsApp Channel',
  onNavigateToSettings,
  className = '',
}) => {
  const [numbers, setNumbers] = useState<WhatsAppContactNumber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAdminWhatsAppNumbers((data) => {
      const activeList = data.filter((n) => n.active);
      setNumbers(activeList);
      setLoading(false);

      // Auto-select logic
      if (activeList.length === 1) {
        onSelect(activeList[0]);
      } else if (activeList.length > 1) {
        // If current selected is valid, keep it
        const currentMatch = activeList.find((n) => n.id === selectedNumberId);
        if (currentMatch) {
          onSelect(currentMatch);
        } else {
          // Choose default or first
          const defaultOne = activeList.find((n) => n.isDefault) || activeList[0];
          onSelect(defaultOne);
        }
      } else {
        onSelect(null);
      }
    });

    return () => unsub();
  }, [selectedNumberId, onSelect]);

  if (loading) {
    return (
      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 animate-pulse text-xs text-stone-500">
        Loading configured WhatsApp channels...
      </div>
    );
  }

  if (numbers.length === 0) {
    return (
      <div className={`p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2 ${className}`}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">No WhatsApp number has been configured.</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Please add and activate a WhatsApp number in Admin Profile settings.
            </p>
          </div>
        </div>
        {onNavigateToSettings && (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Go to Admin Profile & Settings</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
          <span>{title}</span>
        </label>
        <span className="text-[10px] text-stone-500 font-medium">
          {numbers.length} Active {numbers.length === 1 ? 'Number' : 'Numbers'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {numbers.map((num) => {
          const isSelected = selectedNumberId === num.id || (numbers.length === 1);
          return (
            <button
              key={num.id}
              type="button"
              onClick={() => onSelect(num)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
              }`}
            >
              <div className="min-w-0 flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-stone-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-stone-900 truncate">{num.label}</span>
                    {num.isDefault && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-stone-500 font-mono block truncate">{num.phoneNumber}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
