import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { Booking } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { AartiBadge } from '../components/AartiBadge.tsx';
import { BookingPassModal } from '../components/BookingPassModal.tsx';
import { formatToIndianDate } from '../utils/dateUtils.ts';
import {
  Calendar,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Printer,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface UserDashboardPageProps {
  onNavigate: (view: string) => void;
}

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ onNavigate }) => {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPassBooking, setSelectedPassBooking] = useState<Booking | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMyBookings();
        setBookings(res.bookings || []);
      } catch (err: any) {
        // Silently handle auth status notice
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) {
      load();
    }
  }, [user, authLoading]);

  const total = bookings.length;
  const pending = bookings.filter((b) => b.status === 'PENDING').length;
  const accepted = bookings.filter((b) => b.status === 'ACCEPTED').length;

  // Find next upcoming accepted booking
  const upcomingAccepted = bookings.find((b) => b.status === 'ACCEPTED');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Devotee Greeting Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 text-amber-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Devotee Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif">
              Jai Shree Ganesh, {user?.full_name || 'Devotee'}!
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 max-w-lg leading-relaxed">
              Welcome to your dedicated Aarti Darshan portal. Manage your festival bookings and download your entry passes.
            </p>
          </div>

          <button
            onClick={() => onNavigate('book')}
            className="px-6 py-3.5 rounded-2xl bg-white text-stone-900 hover:bg-amber-50 font-bold text-xs sm:text-sm shadow-md transition-all transform hover:scale-105 cursor-pointer whitespace-nowrap inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Book New Aarti Slot</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#fffdfa] p-5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-xs text-stone-500 font-medium block">Total Bookings</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif mt-1">{total}</p>
          <span className="text-[11px] text-amber-800 font-semibold mt-1 block">Lifetime Utsav Records</span>
        </div>

        <div className="bg-[#fffdfa] p-5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-xs text-stone-500 font-medium block">Pending Approval</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-serif mt-1">{pending}</p>
          <span className="text-[11px] text-stone-500 mt-1 block">Under Mandap review</span>
        </div>

        <div className="bg-[#fffdfa] p-5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-xs text-stone-500 font-medium block">Accepted / Confirmed</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-serif mt-1">{accepted}</p>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">Darshan passes ready</span>
        </div>

        <div className="bg-[#fffdfa] p-5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-xs text-stone-500 font-medium block">Next Aarti Date</span>
          <p className="text-lg sm:text-xl font-bold text-stone-900 font-mono mt-2 truncate">
            {upcomingAccepted ? formatToIndianDate(upcomingAccepted.slot_date) : 'None Scheduled'}
          </p>
          <span className="text-[11px] text-stone-500 mt-0.5 block">
            {upcomingAccepted ? `${upcomingAccepted.slot_start_time} Slot` : 'Reserve an open batch'}
          </span>
        </div>
      </div>

      {/* Next Upcoming Aarti Spotlight (if accepted) */}
      {upcomingAccepted && (
        <div className="bg-amber-50/90 rounded-3xl p-6 border-2 border-amber-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmed Upcoming Aarti
            </span>
            <h3 className="text-xl font-bold font-serif text-stone-900">
              {formatToIndianDate(upcomingAccepted.slot_date)} at {upcomingAccepted.slot_start_time} – {upcomingAccepted.slot_end_time}
            </h3>
            <p className="text-xs text-stone-600">
              Reference: <strong className="font-mono">{upcomingAccepted.booking_id}</strong> • Devotee:{' '}
              {upcomingAccepted.devotee_name} ({upcomingAccepted.number_of_people} Devotees)
            </p>
          </div>

          <button
            onClick={() => setSelectedPassBooking(upcomingAccepted)}
            className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm transition-all cursor-pointer flex items-center gap-2 self-start md:self-auto"
          >
            <Printer className="w-4 h-4" />
            <span>Download / Print Sacred Pass</span>
          </button>
        </div>
      )}

      {/* Recent Bookings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-serif text-stone-900">Recent Aarti Bookings</h2>
          <button
            onClick={() => onNavigate('my-bookings')}
            className="text-xs font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Bookings</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="h-32 rounded-2xl bg-stone-100 animate-pulse" />
        ) : bookings.length === 0 ? (
          <div className="bg-[#fffdfa] rounded-2xl p-8 text-center border border-amber-200">
            <p className="text-sm text-stone-600">No bookings placed yet.</p>
            <button
              onClick={() => onNavigate('book')}
              className="mt-3 px-5 py-2 text-xs font-bold rounded-xl text-amber-900 bg-amber-100 hover:bg-amber-200 cursor-pointer"
            >
              Book Aarti Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.slice(0, 3).map((b) => (
              <div
                key={b.id}
                className="bg-[#fffdfa] rounded-2xl p-4 border border-amber-200/80 hover:border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-amber-950">{b.booking_id}</span>
                    <AartiBadge status={b.status} size="sm" />
                  </div>
                  <div className="text-xs text-stone-600 flex items-center gap-4">
                    <span>Date: {formatToIndianDate(b.slot_date)}</span>
                    <span>Time: {b.slot_start_time} - {b.slot_end_time}</span>
                    <span>Devotees: {b.number_of_people}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPassBooking(b)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors self-start sm:self-auto cursor-pointer"
                >
                  View Pass
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sacred Pass Modal */}
      <BookingPassModal
        booking={selectedPassBooking}
        isOpen={Boolean(selectedPassBooking)}
        onClose={() => setSelectedPassBooking(null)}
      />
    </div>
  );
};
