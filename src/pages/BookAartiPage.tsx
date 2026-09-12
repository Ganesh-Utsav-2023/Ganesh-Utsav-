import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebaseConfig.ts';
import { api } from '../lib/api.ts';
import { AartiSlot, Booking } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { subscribeToAartiSlots, createBookingAtomic } from '../lib/slotsService.ts';
import { subscribeToFestivalSettings, subscribeToActiveFestivalYear } from '../lib/festivalService.ts';
import { AartiBadge } from '../components/AartiBadge.tsx';
import { AartiCalendar } from '../components/AartiCalendar.tsx';
import { BookingPassModal } from '../components/BookingPassModal.tsx';
import { isDateInPastInKolkata, getDatesListBetween } from '../utils/festivalCalculator.ts';
import { formatToIndianDate } from '../utils/dateUtils.ts';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Users,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Printer
} from 'lucide-react';

interface BookAartiPageProps {
  onNavigate: (view: string) => void;
  preselectedSlotId?: number;
  initialDate?: string;
}

export const BookAartiPage: React.FC<BookAartiPageProps> = ({
  onNavigate,
  preselectedSlotId,
  initialDate,
}) => {
  const { user, loading: authLoading } = useAuth();

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || '2026-09-14');
  const [slots, setSlots] = useState<AartiSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Form states
  const [selectedSlotId, setSelectedSlotId] = useState<number | string | null>(preselectedSlotId || null);
  const [devoteeName, setDevoteeName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(2);
  const [address, setAddress] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  // Submit states
  const isSubmittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [showPassModal, setShowPassModal] = useState(false);

  // Sync user details if logged in
  useEffect(() => {
    if (user) {
      if (!devoteeName) setDevoteeName(user.full_name);
      if (!phone) setPhone(user.phone);
      if (!email) setEmail(user.email);
    }
  }, [user]);

  // Subscribe to master active festival year
  useEffect(() => {
    const unsubscribe = subscribeToActiveFestivalYear((activeYear) => {
      setSelectedYear(activeYear);
    });
    return () => unsubscribe();
  }, []);

  // Load available festival dates for selectedYear using festivalSettings
  useEffect(() => {
    const unsubscribe = subscribeToFestivalSettings(selectedYear, (settings) => {
      if (settings && settings.festivalStartDate && settings.festivalEndDate) {
        const dates = getDatesListBetween(settings.festivalStartDate, settings.festivalEndDate);
        setAvailableDates(dates);
        if (dates.length > 0 && (!initialDate || !dates.includes(selectedDate))) {
          setSelectedDate(dates[0]);
        }
      }
    });
    return () => unsubscribe();
  }, [selectedYear, initialDate]);

  // Load slots for selected date using real-time listener
  useEffect(() => {
    setLoadingSlots(true);
    setSlotsError(null);

    const unsubscribe = subscribeToAartiSlots(
      selectedDate,
      (updatedSlots) => {
        setSlots(updatedSlots);
        setLoadingSlots(false);
        setSlotsError(null);

        // Auto select available slot for selected date
        if (updatedSlots.length > 0) {
          const avail = updatedSlots.find((s) => s.status === 'AVAILABLE') || updatedSlots[0];
          if (avail) {
            setSelectedSlotId(avail.id);
          }
        }
      },
      (err: any) => {
        console.error('Realtime Firestore Aarti slots listener error:', {
          code: err?.code,
          message: err?.message,
          error: err,
        });
        setSlotsError('Unable to load Aarti slot availability. Please try again.');
        setLoadingSlots(false);
      }
    );

    return () => unsubscribe();
  }, [selectedDate, retryCount]);

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl p-8 border border-amber-200 shadow-md flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-amber-900 font-medium">Verifying devotee session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl p-8 border-2 border-amber-200 text-center shadow-lg space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 p-2 mx-auto flex items-center justify-center shadow-inner">
            <img
              src="/logo.png"
              alt="Navyuvak Ganesh Mitra Mandal Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-serif text-stone-900">Aarti Slot Reservation</h2>
            <p className="text-xs text-amber-800 font-bold bg-amber-50 rounded-lg py-2 px-3 inline-block border border-amber-200">
              Please Sign In or Log In to book your Aarti slot.
            </p>
            <p className="text-xs text-stone-600 leading-relaxed mt-2">
              To preserve the sanctity and fair allocation of the limited Aarti seats (11 seats daily), devotee authentication is strictly required before slots can be requested.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <button
              onClick={() => onNavigate('register')}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Safely derive active slot with robust fallback so it is never null/hidden
  const selectedSlot: AartiSlot =
    (slots.length > 0 && selectedSlotId
      ? slots.find((s) => String(s.id) === String(selectedSlotId))
      : null) ||
    (slots.length > 0 ? slots[0] : {
      id: selectedDate,
      date: selectedDate,
      name: 'Maha Sandhya Aarti',
      start_time: '07:30 PM',
      end_time: '09:00 PM',
      capacity: 11,
      status: 'AVAILABLE',
      booked_count: 0,
      bookedCount: 0,
      remaining_capacity: 11,
      remainingSeats: 11,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  const slotCapacity = selectedSlot.capacity || 11;
  const slotBooked = selectedSlot.booked_count ?? selectedSlot.bookedCount ?? 0;
  const remainingCapacity = Math.max(0, selectedSlot.remaining_capacity ?? (slotCapacity - slotBooked));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || submitting) {
      console.warn('[BookAartiPage] Duplicate submission blocked.');
      return;
    }

    setError('');

    if (isDateInPastInKolkata(selectedDate)) {
      setError('Aarti bookings are closed for past dates. Please select a current or upcoming date.');
      return;
    }

    const activeSlotId = selectedSlotId || selectedSlot.id;
    if (!activeSlotId) {
      setError('Please select an Aarti slot.');
      return;
    }

    if (!devoteeName.trim()) {
      setError('Please enter Devotee Name.');
      return;
    }

    if (!phone.trim()) {
      setError('Please enter Mobile Number.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter Email Address.');
      return;
    }

    if (numberOfPeople < 1) {
      setError('At least 1 devotee is required.');
      return;
    }

    if (numberOfPeople > remainingCapacity) {
      if (remainingCapacity <= 0) {
        setError('Sorry, no seats are remaining for this date.');
      } else {
        setError(`Sorry, only ${remainingCapacity} seats are remaining for this date.`);
      }
      return;
    }

    if (!address.trim()) {
      setError('Please enter your residential address.');
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const { bookingId, booking } = await createBookingAtomic({
        slotId: activeSlotId,
        userId: user?.uid || user?.id || (auth.currentUser ? auth.currentUser.uid : ''),
        devoteeName: devoteeName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        numberOfPeople: Number(numberOfPeople),
        address: address.trim(),
        specialRequest: specialRequest.trim(),
        bookingSource: 'ONLINE',
        status: 'PENDING',
        selectedDate,
      });

      // Save to localStorage for quick lookup in Check My Booking
      try {
        localStorage.setItem('latest_booking_id', bookingId);
        localStorage.setItem('latest_booking_phone', phone.trim());
      } catch (e) {
        // ignore
      }

      setConfirmedBooking(booking);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit booking. Please check seat availability and try again.';
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

  // SUCCESS CONFIRMATION VIEW
  if (confirmedBooking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-[#fffdfa] rounded-3xl p-6 sm:p-10 border-2 border-amber-400 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Aarti Slot Reserved Successfully
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-stone-900">
              Jai Shree Ganesh! Booking Received
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
              Your Aarti request has been submitted with initial <strong>Pending</strong> status. The Mandap Committee will review and confirm your slot shortly.
            </p>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-200 text-left max-w-lg mx-auto space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
              <div>
                <p className="text-[11px] text-stone-500 font-medium">Booking Reference ID</p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xl font-extrabold font-mono text-amber-950">{confirmedBooking.booking_id}</p>
                  {(confirmedBooking.tokenNumber || confirmedBooking.token_number) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-600 text-white uppercase tracking-wider">
                      Token #{confirmedBooking.tokenNumber || confirmedBooking.token_number}
                    </span>
                  )}
                </div>
              </div>
              <AartiBadge status={confirmedBooking.status} size="md" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">Devotee Name</span>
                <span className="font-semibold text-stone-900">{confirmedBooking.devotee_name}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Number of Devotees</span>
                <span className="font-semibold text-stone-900">{confirmedBooking.number_of_people} Person(s)</span>
              </div>
              <div>
                <span className="text-stone-500 block">Aarti Date</span>
                <span className="font-semibold text-stone-900">{formatToIndianDate(confirmedBooking.slot_date)}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Aarti Time</span>
                <span className="font-semibold text-amber-900 font-mono">
                  {confirmedBooking.slot_start_time} – {confirmedBooking.slot_end_time}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowPassModal(true)}
              className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>View & Print Sacred Pass</span>
            </button>

            <button
              onClick={() => onNavigate('my-bookings')}
              className="px-6 py-3 rounded-xl font-semibold text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 shadow-xs transition-all cursor-pointer"
            >
              Go to My Bookings
            </button>

            <button
              onClick={() => {
                setConfirmedBooking(null);
                setSelectedSlotId(null);
              }}
              className="px-5 py-3 rounded-xl font-semibold text-amber-900 hover:bg-amber-100/50 transition-colors cursor-pointer text-xs"
            >
              Book Another Slot
            </button>
          </div>
        </div>

        {/* Sacred Pass Modal */}
        <BookingPassModal
          booking={confirmedBooking}
          isOpen={showPassModal}
          onClose={() => setShowPassModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Devotee Seva Reservation
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-serif text-stone-900">
          Book an Aarti Slot
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Select your festival date, choose an available Aarti batch, and enter your family devotee details.
        </p>
      </div>



      {error && (
        <div className="mb-6 p-4 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col (7 cols): Dynamic Calendar & Realtime Slot Selector */}
        <div className="lg:col-span-7 space-y-6">
          <AartiCalendar
            selectedYear={selectedYear}
            onYearChange={(year) => {
              setSelectedYear(year);
            }}
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setSelectedSlotId(null);
            }}
            slots={slots}
            loadingSlots={loadingSlots}
          />
        </div>

        {/* Right Col (5 cols): Devotee Info & Confirmation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#fffdfa] rounded-3xl p-6 sm:p-7 border border-amber-300 shadow-md space-y-4 sticky top-24">
            {/* Step 2: Aarti Time Slot Card */}
            <div className="space-y-2 pb-3 border-b border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold font-serif text-base">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span>Step 2: Aarti Time Slot *</span>
                </div>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                  Daily Evening
                </span>
              </div>

              {loadingSlots ? (
                <div className="h-20 rounded-2xl bg-amber-50 border border-amber-200 animate-pulse flex items-center justify-center text-xs text-amber-800">
                  Loading Aarti slot availability...
                </div>
              ) : slotsError ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{slotsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRetryCount((prev) => prev + 1)}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              ) : selectedSlot ? (
                <div
                  id="selectable-aarti-slot-card"
                  onClick={() => setSelectedSlotId(selectedSlot.id)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between select-none ${
                    String(selectedSlotId) === String(selectedSlot.id) || !selectedSlotId
                      ? 'bg-amber-100/90 border-amber-600 ring-2 ring-amber-500/40 shadow-sm'
                      : 'bg-white border-amber-200 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold flex-shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-serif text-stone-900">
                        Maha Sandhya Aarti
                      </h4>
                      <p className="text-xs text-amber-900 font-mono font-bold mt-0.5">
                        {selectedSlot.start_time || '07:30 PM'} – {selectedSlot.end_time || '09:00 PM'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-extrabold block ${
                        remainingCapacity <= 3 && remainingCapacity > 0
                          ? 'text-orange-700'
                          : remainingCapacity <= 0
                          ? 'text-rose-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {remainingCapacity <= 0 ? 'Sold Out' : `${remainingCapacity} Seats Left`}
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium block">
                      Occupied: {selectedSlot.booked_count ?? 0} / {selectedSlot.capacity || 11}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  No slots currently configured for this date.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-amber-900 font-bold font-serif text-base pb-1">
              <User className="w-5 h-5 text-orange-600" />
              <span>Step 3: Devotee Details</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Primary Devotee Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={devoteeName}
                  onChange={(e) => setDevoteeName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98200 12345"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  No. of Devotees *
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, remainingCapacity)}
                    required
                    value={numberOfPeople}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      const maxAllowed = Math.max(1, remainingCapacity);
                      setNumberOfPeople(Math.min(maxAllowed, Math.max(1, val)));
                    }}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-bold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Residential Address *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Rampura, MP"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Special Request / Assistance (Optional)
              </label>
              <textarea
                rows={2}
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder="e.g. Senior citizen wheelchair assistance or family sankalp gotra"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Selection Summary */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-600">Aarti Date:</span>
                <span className="font-bold text-amber-950 font-mono">
                  {formatToIndianDate(selectedDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Selected Slot:</span>
                <span className="font-bold text-amber-950">
                  {selectedSlot ? `${selectedSlot.start_time} - ${selectedSlot.end_time}` : 'Maha Sandhya Aarti (07:30 PM - 09:00 PM)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Total Devotees:</span>
                <span className="font-bold text-amber-950">{numberOfPeople} Person(s)</span>
              </div>
            </div>

            <button
              id="confirm-booking-submit-btn"
              type="submit"
              disabled={submitting || remainingCapacity <= 0}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-red-700 hover:from-orange-700 hover:to-red-800 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span>Reserving Aarti Slot...</span>
              ) : remainingCapacity <= 0 ? (
                <span>Aarti Slot Full (Sold Out)</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Reserve Aarti Slot</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
