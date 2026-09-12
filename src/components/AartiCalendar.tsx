import React, { useState, useEffect } from 'react';
import { AartiSlot } from '../types/index.ts';
import { FestivalSettings, subscribeToFestivalSettings } from '../lib/festivalService.ts';
import {
  isDateInPastInKolkata,
  getTodayInKolkata,
} from '../utils/festivalCalculator.ts';
import { formatToIndianDate } from '../utils/dateUtils.ts';
import { AartiBadge } from './AartiBadge.tsx';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sparkles,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users
} from 'lucide-react';

interface AartiCalendarProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  slots: AartiSlot[];
  loadingSlots?: boolean;
}

export const AartiCalendar: React.FC<AartiCalendarProps> = ({
  selectedYear,
  onYearChange,
  selectedDate,
  onDateSelect,
  slots,
  loadingSlots = false,
}) => {
  const [festivalSettings, setFestivalSettings] = useState<FestivalSettings | null>(null);
  const [activeMonth, setActiveMonth] = useState<number>(8); // September (0-indexed) default

  // Subscribe to festival settings for selected year
  useEffect(() => {
    const unsubscribe = subscribeToFestivalSettings(selectedYear, (settings) => {
      setFestivalSettings(settings);

      // Auto-set active month based on festival start date
      if (settings.festivalStartDate) {
        const [y, m] = settings.festivalStartDate.split('-').map(Number);
        setActiveMonth(m - 1); // 0-indexed month
      }
    });

    return () => unsubscribe();
  }, [selectedYear]);

  // Today in IST
  const todayIST = getTodayInKolkata();

  // Selected Slot
  const selectedSlot = slots.find((s) => s.date === selectedDate) || (slots.length > 0 ? slots[0] : null);

  // Month navigation
  const handlePrevMonth = () => {
    if (activeMonth === 0) {
      setActiveMonth(11);
      onYearChange(selectedYear - 1);
    } else {
      setActiveMonth(activeMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonth === 11) {
      setActiveMonth(0);
      onYearChange(selectedYear + 1);
    } else {
      setActiveMonth(activeMonth + 1);
    }
  };

  // Generate Calendar Grid for activeMonth and selectedYear
  const monthDateObj = new Date(Date.UTC(selectedYear, activeMonth, 1));
  const monthName = monthDateObj.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const firstDayOfWeek = monthDateObj.getUTCDay(); // 0 = Sun
  const daysInMonth = new Date(Date.UTC(selectedYear, activeMonth + 1, 0)).getUTCDate();

  // Helper maps for slot data by date
  const slotByDateMap: Record<string, AartiSlot> = {};
  slots.forEach((s) => {
    if (s.date) slotByDateMap[s.date] = s;
  });

  // Festival range check
  const isFestivalDate = (dateStr: string) => {
    if (!festivalSettings) return false;
    return dateStr >= festivalSettings.festivalStartDate && dateStr <= festivalSettings.festivalEndDate;
  };

  // Format date helper (DD-MM-YYYY)
  const formatDateLabel = (dateStr: string) => {
    return formatToIndianDate(dateStr);
  };

  return (
    <div className="bg-[#fffdfa] rounded-3xl p-5 sm:p-7 border-2 border-amber-300/80 shadow-md space-y-6">
      {/* 1. Year & Month Navigation Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-amber-200">
        {/* Year Navigator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onYearChange(selectedYear - 1)}
            className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Previous Year"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{selectedYear - 1}</span>
          </button>

          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="appearance-none bg-gradient-to-r from-amber-900 to-amber-950 text-amber-100 font-extrabold font-serif text-sm sm:text-base px-4 py-2 rounded-xl border border-amber-500/50 shadow-xs cursor-pointer text-center pr-8 outline-none"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map((yr) => (
                <option key={yr} value={yr} className="bg-stone-900 text-white font-sans">
                  Ganesh Utsav {yr}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-300">
              ▼
            </div>
          </div>

          <button
            type="button"
            onClick={() => onYearChange(selectedYear + 1)}
            className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Next Year"
          >
            <span>{selectedYear + 1}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Festival Info Banner */}
        {festivalSettings && (
          <div className="flex items-center gap-2 bg-amber-50/90 px-3.5 py-2 rounded-2xl border border-amber-200 text-xs">
            <Sparkles className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <div>
              <span className="font-bold text-amber-950 block">
                {festivalSettings.festivalName}
              </span>
              <span className="text-[11px] text-amber-800 font-medium">
                Chaturthi: {formatDateLabel(festivalSettings.ganeshChaturthiDate)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Month Selector Controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <h3 className="text-base sm:text-lg font-bold font-serif text-stone-900">
          {monthName} {selectedYear}
        </h3>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Calendar Grid */}
      <div className="space-y-2">
        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-amber-900/80 uppercase tracking-wider pb-1">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Month Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty lead cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-2xl bg-stone-50/50 border border-transparent" />
          ))}

          {/* Day tiles */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const mmStr = String(activeMonth + 1).padStart(2, '0');
            const ddStr = String(dayNum).padStart(2, '0');
            const dateStr = `${selectedYear}-${mmStr}-${ddStr}`;

            const isFest = isFestivalDate(dateStr);
            const isGaneshChaturthi = festivalSettings?.ganeshChaturthiDate === dateStr;
            const isSelected = selectedDate === dateStr;
            const isPast = isDateInPastInKolkata(dateStr);

            const slot = slotByDateMap[dateStr];
            const capacity = slot?.capacity || 11;
            const booked = slot?.booked_count || 0;
            const remaining = slot?.remaining_capacity ?? (capacity - booked);
            const isFull = slot?.status === 'FULL' || remaining <= 0;
            const isClosed = slot?.status === 'CLOSED';

            const canSelect = isFest && !isPast && !isClosed && !isFull;

            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (canSelect) {
                    onDateSelect(dateStr);
                  }
                }}
                className={`relative h-20 sm:h-24 p-1.5 sm:p-2 rounded-2xl border transition-all flex flex-col justify-between select-none ${
                  !isFest
                    ? 'bg-stone-50/60 border-stone-100 text-stone-400 opacity-50 cursor-default'
                    : isPast
                    ? 'bg-stone-100/80 border-stone-200 text-stone-400 cursor-not-allowed opacity-75'
                    : isClosed
                    ? 'bg-rose-50/50 border-rose-200 text-stone-500 cursor-not-allowed'
                    : isFull
                    ? 'bg-rose-50 border-rose-300 text-rose-900 cursor-not-allowed'
                    : isSelected
                    ? 'bg-amber-100/90 border-amber-600 ring-2 ring-amber-500/50 shadow-md cursor-pointer scale-102'
                    : 'bg-white border-amber-300/80 hover:border-amber-500 hover:bg-amber-50/40 shadow-2xs cursor-pointer'
                }`}
              >
                {/* Day header & Badge */}
                <div className="flex items-start justify-between gap-1">
                  <span className={`text-xs sm:text-sm font-extrabold ${isSelected ? 'text-amber-950 font-serif' : isFest ? 'text-stone-900' : 'text-stone-400'}`}>
                    {dayNum}
                  </span>

                  {isGaneshChaturthi && (
                    <span className="text-[9px] font-extrabold px-1 py-0.5 rounded bg-amber-500 text-amber-950 truncate max-w-[50px] shadow-2xs" title="Ganesh Chaturthi">
                      Chaturthi
                    </span>
                  )}
                </div>

                {/* Status Indicator inside tile */}
                <div className="mt-auto">
                  {!isFest ? (
                    <span className="text-[9px] text-stone-400 block">—</span>
                  ) : isPast ? (
                    <span className="text-[9px] font-semibold text-stone-500 block leading-tight">
                      Closed
                    </span>
                  ) : isClosed ? (
                    <span className="text-[9px] font-bold text-rose-700 block">Closed</span>
                  ) : isFull ? (
                    <span className="text-[9px] font-bold text-rose-700 block">Sold Out</span>
                  ) : (
                    <div className="space-y-0.5">
                      <span className={`text-[10px] font-extrabold block ${remaining <= 3 ? 'text-orange-700' : 'text-emerald-800'}`}>
                        {remaining} Seats
                      </span>
                      <span className="text-[8px] text-stone-500 block hidden sm:block">Available</span>
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Selected Date Real-Time Availability Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-200 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <h4 className="text-sm font-bold font-serif text-amber-950">
                Maha Sandhya Aarti (07:30 PM – 09:00 PM)
              </h4>
              <p className="text-xs text-amber-800">
                Selected Date: <strong>{formatDateLabel(selectedDate)}</strong>
              </p>
            </div>
          </div>

          <AartiBadge
            status={
              isDateInPastInKolkata(selectedDate)
                ? 'CLOSED'
                : selectedSlot?.status || 'AVAILABLE'
            }
            size="md"
          />
        </div>

        {/* Seats breakdown bar */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
          <div className="p-2 bg-white/80 rounded-xl border border-amber-200">
            <span className="text-stone-500 block text-[10px]">Daily Capacity</span>
            <span className="font-extrabold text-stone-900 text-sm font-mono">11 Seats</span>
          </div>
          <div className="p-2 bg-white/80 rounded-xl border border-amber-200">
            <span className="text-stone-500 block text-[10px]">Booked Seats</span>
            <span className="font-extrabold text-amber-900 text-sm font-mono">
              {selectedSlot?.booked_count || 0}
            </span>
          </div>
          <div className="p-2 bg-white/80 rounded-xl border border-amber-200">
            <span className="text-stone-500 block text-[10px]">Remaining Seats</span>
            <span className="font-extrabold text-emerald-700 text-sm font-mono">
              {selectedSlot
                ? (selectedSlot.remaining_capacity ?? (11 - (selectedSlot.booked_count || 0)))
                : 11}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
