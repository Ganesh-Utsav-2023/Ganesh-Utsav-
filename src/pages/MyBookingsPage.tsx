import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig.ts';
import { api } from '../lib/api.ts';
import { Booking } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { AartiBadge } from '../components/AartiBadge.tsx';
import { BookingPassModal } from '../components/BookingPassModal.tsx';
import { ConfirmationModal } from '../components/ConfirmationModal.tsx';
import { changeBookingStatusAtomic } from '../lib/slotsService.ts';
import { downloadAartiPassPDF } from '../utils/pdfGenerator.ts';
import { formatToIndianDate } from '../utils/dateUtils.ts';
import {
  Calendar,
  Clock,
  Users,
  Search,
  Download,
  Eye,
  Ban,
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
  Phone,
  FileText,
  MapPin,
  Mail,
  User as UserIcon,
  Plus
} from 'lucide-react';

interface MyBookingsPageProps {
  onNavigate: (view: string) => void;
}

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ onNavigate }) => {
  const { user, loading: authLoading } = useAuth();
  
  // Devotee bookings state
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Manual lookup state (for guest or backup)
  const [showLookup, setShowLookup] = useState(false);
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupBooking, setLookupBooking] = useState<Booking | null>(null);

  // Modals state
  const [selectedPassBooking, setSelectedPassBooking] = useState<Booking | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Download states
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Real-time Firestore subscription for authenticated devotee bookings
  useEffect(() => {
    // If Firebase Auth is still loading, wait before querying
    if (authLoading) {
      setLoadingBookings(true);
      return;
    }

    const currentUid = auth.currentUser?.uid || user?.id || user?.uid;
    if (!currentUid) {
      setUserBookings([]);
      setSelectedBooking(null);
      setLoadingBookings(false);
      return;
    }

    console.log('AUTH UID:', currentUid);
    console.log('MY BOOKINGS QUERY UID:', currentUid);
    setLoadingBookings(true);

    const bookingsCol = collection(db, 'bookings');
    const q = query(bookingsCol, where('userId', '==', currentUid));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Booking[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;
          const bId = data.booking_id || data.bookingId || docId;
          const tokenNum = data.tokenNumber ?? data.token_number ?? 1;
          const pId = data.passId || data.pass_id || '';
          const sDate = data.slot_date || data.date || '2026-09-14';
          const seats = Number(data.numberOfPeople ?? data.number_of_people) || 1;

          return {
            ...data,
            id: docId,
            doc_id: docId,
            booking_id: bId,
            bookingId: bId,
            userId: data.userId || data.user_id || currentUid,
            user_id: data.userId || data.user_id || currentUid,
            devoteeName: data.devoteeName || data.devotee_name || '',
            devotee_name: data.devoteeName || data.devotee_name || '',
            phone: data.phone || data.mobile || '',
            mobile: data.phone || data.mobile || '',
            email: data.email || '',
            slot_date: sDate,
            date: sDate,
            timeSlot: data.timeSlot || '07:30 PM – 09:00 PM',
            slot_start_time: data.slot_start_time || '07:30 PM',
            slot_end_time: data.slot_end_time || '09:00 PM',
            numberOfPeople: seats,
            number_of_people: seats,
            address: data.address || '',
            specialRequest: data.specialRequest || data.special_request || '',
            special_request: data.specialRequest || data.special_request || '',
            status: data.status || 'PENDING',
            bookingSource: data.bookingSource || data.booking_source || 'ONLINE',
            booking_source: data.bookingSource || data.booking_source || 'ONLINE',
            tokenNumber: tokenNum,
            token_number: tokenNum,
            passId: pId,
            pass_id: pId,
            passGenerated: Boolean(data.passGenerated || data.pass_generated || data.status === 'ACCEPTED'),
            pass_generated: Boolean(data.passGenerated || data.pass_generated || data.status === 'ACCEPTED'),
            createdAt: data.createdAt || data.created_at || new Date().toISOString(),
            created_at: data.created_at || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
            updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
            updated_at: data.updated_at || (data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString()),
          } as Booking;
        });

        // Sort newest bookings first
        list.sort((a, b) => {
          const timeA = new Date(a.created_at || (a as any).createdAt || 0).getTime();
          const timeB = new Date(b.created_at || (b as any).createdAt || 0).getTime();
          return timeB - timeA;
        });

        console.log('MY BOOKINGS RESULT COUNT:', list.length);
        if (list.length === 0) {
          console.log(`[MyBookings] 0 bookings returned for userId == "${currentUid}".`);
        }

        setUserBookings(list);
        setSelectedBooking((prev) => {
          if (!prev) return list[0] || null;
          const match = list.find((item) => (item.doc_id || item.id) === (prev.doc_id || prev.id));
          return match || list[0] || null;
        });
        setLoadingBookings(false);
      },
      (err) => {
        console.error('CRITICAL: Error in MyBookings onSnapshot listener:', {
          code: err.code,
          message: err.message,
          error: err,
        });
        setLoadingBookings(false);
      }
    );

    return () => unsub();
  }, [authLoading, user]);

  // Perform manual search lookup
  const performLookup = async (idToSearch: string, phoneToSearch: string) => {
    if (!idToSearch.trim() || !phoneToSearch.trim()) {
      setLookupError('Please enter both Booking ID and registered Mobile Number.');
      return;
    }

    setSearching(true);
    setLookupError(null);
    setLookupBooking(null);

    try {
      let b: Booking | null = null;
      try {
        const res = await api.lookupBooking({
          booking_id: idToSearch.trim(),
          phone: phoneToSearch.trim(),
        });
        if (res && res.booking) {
          b = res.booking;
        }
      } catch (apiErr) {
        console.warn('API lookup note, querying Firestore:', apiErr);
      }

      if (!b) {
        try {
          const bookingsCol = collection(db, 'bookings');
          const q = query(bookingsCol, where('booking_id', '==', idToSearch.trim().toUpperCase()));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const found = snap.docs[0].data() as any;
            if (
              (found.phone && found.phone.includes(phoneToSearch.trim())) ||
              (found.mobile && found.mobile.includes(phoneToSearch.trim()))
            ) {
              b = { ...found, id: snap.docs[0].id, doc_id: snap.docs[0].id };
            }
          }
        } catch (fsErr) {
          console.warn('Firestore lookup error:', fsErr);
        }
      }

      if (b) {
        setLookupBooking(b);
        setSelectedBooking(b);
      } else {
        setLookupError('No booking found matching this Booking ID and Mobile Number combination.');
      }
    } catch (err: any) {
      console.error('Lookup error:', err);
      setLookupError(err.message || 'No booking found matching this Booking ID and Mobile Number combination.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(bookingIdInput, phoneInput);
  };

  const handleDownloadPDF = async (booking: Booking) => {
    if (!booking) return;
    if (booking.status !== 'ACCEPTED') {
      alert('Your Aarti booking has not been accepted yet. The pass will be available after approval.');
      return;
    }

    setDownloading(true);
    try {
      const res = await downloadAartiPassPDF(booking, undefined, 'booking-pass-card-content', false);
      if (res.success) {
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 3000);
      }
    } catch (err) {
      console.error('Download PDF error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelModalBooking) return;
    setCancelling(true);
    try {
      const docId = String(cancelModalBooking.doc_id || cancelModalBooking.id);

      await changeBookingStatusAtomic({
        bookingDocId: docId,
        targetStatus: 'CANCELLED',
        reason: 'Cancelled by devotee',
      });

      try {
        await api.cancelMyBooking(cancelModalBooking.id);
      } catch (e) {
        // Fallback endpoint if needed
      }

      // Update state for selected and lists
      const updateList = (prevList: Booking[]) =>
        prevList.map((b) => (b.id === cancelModalBooking.id ? { ...b, status: 'CANCELLED' as const } : b));

      setUserBookings(updateList);
      if (lookupBooking && lookupBooking.id === cancelModalBooking.id) {
        setLookupBooking({ ...lookupBooking, status: 'CANCELLED' as const });
      }
      setSelectedBooking((prev) => (prev && prev.id === cancelModalBooking.id ? { ...prev, status: 'CANCELLED' as const } : prev));
      setCancelModalBooking(null);
    } catch (err: any) {
      alert(err.message || 'Could not cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  const activeBooking = selectedBooking;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Devotee Booking Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900">
          My Aarti Bookings
        </h1>
        {user && (
          <p className="text-xs sm:text-sm text-amber-800 font-medium mt-1">
            Welcome, Devotee {user.full_name}
          </p>
        )}
      </div>

      {!user ? (
        <div className="bg-white rounded-3xl p-8 max-w-md mx-auto border border-amber-200 text-center shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white border border-amber-200 p-1.5 mx-auto flex items-center justify-center shadow-sm">
            <img
              src="/logo.png"
              alt="Navyuvak Ganesh Mitra Mandal Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-xl font-bold font-serif text-stone-900">Devotee Session Required</h2>
          <p className="text-xs text-stone-600">
            Please Sign In or Log In to view your reservations and sacred entry passes.
          </p>
          <div className="pt-2 space-y-2">
            <button
              onClick={() => onNavigate('register')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-amber-900 hover:bg-stone-950 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      ) : loadingBookings ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto" />
          <p className="text-xs text-stone-500 font-medium">Fetching your sacred bookings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Bookings List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider">
                Booking History ({userBookings.length})
              </h2>
              <button
                onClick={() => setShowLookup(!showLookup)}
                className="text-xs text-amber-800 font-bold hover:text-amber-900 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3 h-3" />
                <span>{showLookup ? 'Show My List' : 'Search by ID'}</span>
              </button>
            </div>

            {showLookup ? (
              /* Lookup Card */
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <p className="text-xs text-stone-600">
                  Search other registrations by entering the Booking ID and Mobile number.
                </p>
                <form onSubmit={handleSearchSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                      Booking ID
                    </label>
                    <div className="relative">
                      <FileText className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="e.g. GA-2026-0001"
                        value={bookingIdInput}
                        onChange={(e) => setBookingIdInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 text-xs font-mono uppercase transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        placeholder="e.g. 9812345678"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 text-xs transition-all"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={searching}
                    className="w-full py-2 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {searching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Lookup</span>
                      </>
                    )}
                  </button>
                </form>

                {lookupError && (
                  <div className="p-3 text-[11px] bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                    <span>{lookupError}</span>
                  </div>
                )}
              </div>
            ) : userBookings.length === 0 ? (
              /* Empty list state */
              <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-4">
                <Calendar className="w-12 h-12 text-stone-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-stone-800">No Bookings Yet</h3>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    You haven't reserved any Ganesh Aarti slots yet. Select a date and book your seat now.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('book')}
                  className="px-4 py-2 bg-amber-900 text-amber-100 font-bold rounded-xl text-xs hover:bg-black transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Book Aarti Slot</span>
                </button>
              </div>
            ) : (
              /* Bookings List Layout */
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {userBookings.map((b) => {
                  const isSelected = activeBooking && activeBooking.id === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-500 shadow-sm'
                          : 'bg-white border-stone-200 hover:border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-stone-900">
                            {b.booking_id}
                          </span>
                          {(b.tokenNumber || b.token_number) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-600 text-white uppercase tracking-wider">
                              Token #{b.tokenNumber || b.token_number}
                            </span>
                          )}
                        </div>
                        <AartiBadge status={b.status} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{b.slot_date ? formatToIndianDate(b.slot_date) : 'Festival Date'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Users className="w-3.5 h-3.5 text-stone-400" />
                          <span>{b.number_of_people} Devotee{b.number_of_people > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Active Booking Details Panel */}
          <div className="lg:col-span-7">
            {activeBooking ? (
              <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6 animate-in fade-in duration-200">
                {/* Status Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
                  <div>
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">Official Booking ID</span>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl sm:text-2xl font-black font-mono text-stone-900">{activeBooking.booking_id}</h2>
                      {(activeBooking.tokenNumber || activeBooking.token_number) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-orange-600 text-white uppercase tracking-wider">
                          Token #{activeBooking.tokenNumber || activeBooking.token_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <AartiBadge status={activeBooking.status} size="lg" />
                  </div>
                </div>

                {/* Key Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-amber-50/60 p-4 rounded-xl border border-amber-200/60">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold uppercase text-stone-500 block">Devotee Name</span>
                      <span className="text-sm font-bold text-stone-900">{activeBooking.devotee_name}</span>
                      <span className="text-xs text-stone-600 block mt-0.5">({activeBooking.number_of_people} Devotee{activeBooking.number_of_people > 1 ? 's' : ''})</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold uppercase text-stone-500 block">Aarti Date</span>
                      <span className="text-sm font-bold text-stone-900">
                        {activeBooking.slot_date ? formatToIndianDate(activeBooking.slot_date) : 'Festival Date'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold uppercase text-stone-500 block">Aarti Batch</span>
                      <span className="text-sm font-bold text-stone-900">
                        {activeBooking.slot_start_time || '07:30 PM'} – {activeBooking.slot_end_time || '09:00 PM'}
                      </span>
                      <span className="text-xs text-amber-800 block mt-0.5 font-medium">Maha Sandhya Aarti</span>
                    </div>
                  </div>
                </div>

                {/* Contact & Request Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-700">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-stone-400" />
                      <span><strong>Phone:</strong> {activeBooking.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-stone-400" />
                      <span><strong>Email:</strong> {activeBooking.email}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-stone-400 mt-0.5" />
                      <span><strong>Address:</strong> {activeBooking.address || 'Navyuvak Mandal Pandal'}</span>
                    </div>
                    {activeBooking.special_request && (
                      <div className="flex items-start gap-2 text-stone-600">
                        <FileText className="w-4 h-4 text-stone-400 mt-0.5" />
                        <span><strong>Special Request:</strong> {activeBooking.special_request}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Context Banner based on status */}
                {activeBooking.status === 'PENDING' && (
                  <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="block font-bold">Booking Request Pending Approval</strong>
                      Your Aarti slot request has been submitted to Navyuvak Ganesh Mitra Mandal. Once approved by the Mandap Committee, your official pass will be ready for instant download here.
                    </div>
                  </div>
                )}

                {activeBooking.status === 'ACCEPTED' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="block font-bold">Aarti Booking Confirmed!</strong>
                      Your Aarti pass is active. Please present your pass on your smartphone or carry a printed copy at Mandap gate entry.
                    </div>
                  </div>
                )}

                {activeBooking.status === 'REJECTED' && (
                  <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="block font-bold">Booking Request Not Approved</strong>
                      This booking request could not be accepted due to slot capacity or scheduling constraints. You may submit a new request for another date.
                    </div>
                  </div>
                )}

                {activeBooking.status === 'CANCELLED' && (
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-start gap-2">
                    <Ban className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="block font-bold">Booking Cancelled</strong>
                      This Aarti slot booking has been cancelled and seats have been released.
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200">
                  <div className="flex flex-wrap items-center gap-3">
                    {activeBooking.status === 'ACCEPTED' && (
                      <>
                        <button
                          onClick={() => setSelectedPassBooking(activeBooking)}
                          className="px-5 py-2.5 bg-amber-900 hover:bg-black text-amber-100 font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-amber-400" />
                          <span>View & Print Aarti Pass</span>
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(activeBooking)}
                          disabled={downloading}
                          className="px-5 py-2.5 bg-white border-2 border-amber-400 text-stone-800 hover:bg-amber-50 font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {downloading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                          ) : downloaded ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Download className="w-4 h-4 text-amber-700" />
                          )}
                          <span>{downloaded ? 'Pass Downloaded!' : 'Download Pass PDF'}</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => onNavigate('book')}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      + Book Another Slot
                    </button>
                  </div>

                  {(activeBooking.status === 'PENDING' || activeBooking.status === 'ACCEPTED') && (
                    <button
                      onClick={() => setCancelModalBooking(activeBooking)}
                      className="px-3.5 py-2 text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel Booking</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-400">
                <Calendar className="w-12 h-12 text-stone-200 mx-auto mb-2" />
                <p className="text-sm">Select a booking from the left list to view passes and download PDFs.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pass Modal */}
      {selectedPassBooking && (
        <BookingPassModal
          booking={selectedPassBooking}
          onClose={() => setSelectedPassBooking(null)}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <ConfirmationModal
          isOpen={true}
          title="Cancel Aarti Booking?"
          message={`Are you sure you want to cancel booking ${cancelModalBooking.booking_id}? This will release your reserved Aarti seats.`}
          confirmLabel={cancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
          confirmVariant="danger"
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelModalBooking(null)}
        />
      )}
    </div>
  );
};
