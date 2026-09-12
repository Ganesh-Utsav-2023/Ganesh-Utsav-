import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api.ts';
import { AartiSlot, Booking } from '../../types/index.ts';
import { BookingPassModal } from '../../components/BookingPassModal.tsx';
import { subscribeToAartiSlots, createBookingAtomic } from '../../lib/slotsService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Sparkles,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Printer
} from 'lucide-react';

interface AdminCreateBookingTabProps {
  onSuccess: () => void;
}

export const AdminCreateBookingTab: React.FC<AdminCreateBookingTabProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-14');
  const [slots, setSlots] = useState<AartiSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(2);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'ACCEPTED'>('ACCEPTED');

  const isSubmittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    async function loadDates() {
      try {
        const res = await api.getSlotDates();
        if (res.dates.length > 0) {
          setAvailableDates(res.dates);
          setSelectedDate(res.dates[0]);
        }
      } catch (err) {
        console.warn('Load dates error:', err);
      }
    }
    loadDates();
  }, []);

  useEffect(() => {
    setLoadingSlots(true);
    const unsubscribe = subscribeToAartiSlots(
      selectedDate,
      (updatedSlots) => {
        setSlots(updatedSlots);
        setLoadingSlots(false);
      },
      (err) => {
        console.warn('Realtime slots error in AdminCreateBookingTab:', err);
        setLoadingSlots(false);
      }
    );

    return () => unsubscribe();
  }, [selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || submitting) {
      console.warn('[AdminCreateBooking] Duplicate submission blocked.');
      return;
    }

    setError('');

    if (!selectedSlotId) {
      setError('Please select an Aarti slot.');
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      const currentUserId = user?.id || 'admin';

      const { booking } = await createBookingAtomic({
        slotId: selectedSlotId,
        userId: currentUserId,
        devoteeName: name.trim(),
        phone: phone.trim(),
        email: (email || '').trim(),
        numberOfPeople: Number(numberOfPeople),
        address: (address || '').trim(),
        specialRequest: (notes || '').trim(),
        bookingSource: 'ADMIN',
        status,
        selectedDate,
      });

      setCreatedBooking(booking);
      if (onSuccess) onSuccess();

      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
    } catch (err: any) {
      const msg = err?.message || 'Failed to create booking.';
      if (msg.includes('429') || msg.includes('Too many requests')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError(msg);
      }
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
          Create Booking (Admin Desk)
        </h2>
        <p className="text-xs text-stone-500">
          Manually register walk-in devotees, phone enquiries, or mandap committee seva guests
        </p>
      </div>

      {createdBooking && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-950">
                Booking Created Successfully: {createdBooking.booking_id}
              </p>
              <p className="text-xs text-emerald-800">
                Devotee: {createdBooking.devotee_name} • Status: {createdBooking.status} • {createdBooking.number_of_people} Devotees
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPass(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </button>
            <button
              onClick={() => setCreatedBooking(null)}
              className="px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-emerald-100 rounded-xl cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
        {/* Date & Slot selection */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
            1. Select Aarti Date & Batch
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {availableDates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setSelectedDate(d);
                  setSelectedSlotId(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedDate === d
                    ? 'bg-amber-900 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Slots picker */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {slots.map((s) => {
              const isSelected = selectedSlotId === s.id;
              const remaining = s.remaining_capacity ?? (s.capacity - (s.booked_count || 0));

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSlotId(s.id)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer select-none transition-all ${
                    isSelected
                      ? 'bg-amber-100/90 border-amber-500 ring-1 ring-amber-500 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-amber-300'
                  }`}
                >
                  <p className="font-mono font-bold text-stone-900">{s.start_time} – {s.end_time}</p>
                  <div className="flex justify-between items-center text-[11px] text-stone-500 mt-1">
                    <span>{s.status}</span>
                    <span className="font-semibold text-emerald-700">{remaining} seats</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Devotee Info */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
            2. Devotee Contact Information
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Devotee Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Devotee name"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Mobile Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Email Address (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="devotee@email.com"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Number of People *</label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Residential Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Devotee address / locality"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Seva Notes / Requests</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VIP seva pass, senior assistance, or special gotra prayers"
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Initial Status Setting */}
        <div className="space-y-2 pt-4 border-t border-stone-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
            3. Direct Booking Status
          </label>
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="admin-status"
                value="ACCEPTED"
                checked={status === 'ACCEPTED'}
                onChange={() => setStatus('ACCEPTED')}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span className="font-semibold text-emerald-800">Immediately Accept & Confirm (Recommended)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="admin-status"
                value="PENDING"
                checked={status === 'PENDING'}
                onChange={() => setStatus('PENDING')}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span className="font-semibold text-amber-800">Save as Pending Review</span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting || !selectedSlotId}
            className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>{submitting ? 'Generating Booking...' : 'Create & Issue Booking'}</span>
          </button>
        </div>
      </form>

      {/* Pass modal */}
      <BookingPassModal
        booking={createdBooking}
        isOpen={showPass}
        onClose={() => setShowPass(false)}
      />
    </div>
  );
};
