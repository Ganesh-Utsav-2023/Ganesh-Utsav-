import React from 'react';
import { BookingStatus, SlotStatus } from '../types/index.ts';
import { Clock, CheckCircle, XCircle, Slash, Sparkles } from 'lucide-react';

interface AartiBadgeProps {
  status: BookingStatus | SlotStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const AartiBadge: React.FC<AartiBadgeProps> = ({ status, size = 'md' }) => {
  const s = status.toUpperCase();

  let styles = 'bg-stone-100 text-stone-700 border-stone-300';
  let Icon = Clock;
  let label = s;

  if (s === 'PENDING') {
    styles = 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/20';
    Icon = Clock;
    label = 'Pending Approval';
  } else if (s === 'ACCEPTED') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20';
    Icon = CheckCircle;
    label = 'Accepted / Confirmed';
  } else if (s === 'REJECTED') {
    styles = 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/20';
    Icon = XCircle;
    label = 'Rejected';
  } else if (s === 'CANCELLED') {
    styles = 'bg-stone-100 text-stone-600 border-stone-300';
    Icon = Slash;
    label = 'Cancelled';
  } else if (s === 'COMPLETED') {
    styles = 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/20';
    Icon = Sparkles;
    label = 'Aarti Completed';
  } else if (s === 'AVAILABLE') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    Icon = CheckCircle;
    label = 'Available';
  } else if (s === 'FULL') {
    styles = 'bg-rose-50 text-rose-800 border-rose-300';
    Icon = XCircle;
    label = 'Full';
  } else if (s === 'CLOSED') {
    styles = 'bg-stone-100 text-stone-600 border-stone-300';
    Icon = Slash;
    label = 'Closed';
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : size === 'lg'
      ? 'text-sm px-3.5 py-1.5 gap-2 font-semibold'
      : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  const iconSizes = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border whitespace-nowrap ${styles} ${sizeClasses}`}
    >
      <Icon className={iconSizes} />
      <span>{label}</span>
    </span>
  );
};
