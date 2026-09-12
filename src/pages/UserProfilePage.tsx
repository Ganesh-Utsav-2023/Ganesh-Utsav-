import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { Booking } from '../types/index.ts';
import { formatProviderName } from '../utils/devoteeUtils.ts';
import { AartiBadge } from '../components/AartiBadge.tsx';
import { BookingPassModal } from '../components/BookingPassModal.tsx';
import {
  User as UserIcon,
  Phone,
  Mail,
  Lock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Users,
  Eye,
  Sparkles,
  ArrowRight,
  PlusCircle,
  KeyRound
} from 'lucide-react';

interface UserProfilePageProps {
  onNavigate?: (view: string) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ onNavigate }) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings'>('profile');

  // Profile Form state
  const [fullName, setFullName] = useState(user?.full_name || user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Devotee's own bookings state (Strictly scoped)
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [selectedPassBooking, setSelectedPassBooking] = useState<Booking | null>(null);

  // Keep state synced if user context changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || user.displayName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Fetch devotee's personal bookings
  useEffect(() => {
    if (!user) {
      setBookingsLoading(false);
      return;
    }

    let active = true;
    api.getMyBookings()
      .then((res) => {
        if (active) {
          const items = res.bookings || [];
          items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          setMyBookings(items);
        }
      })
      .catch((err) => {
        console.warn('Error fetching personal bookings:', err);
      })
      .finally(() => {
        if (active) setBookingsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const payload: any = { full_name: fullName, phone };
      if (newPassword) {
        if (!currentPassword) {
          setError('Please provide your current password to set a new password.');
          setLoading(false);
          return;
        }
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await api.updateProfile(payload);
      setMessage(res.message || 'Profile successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const isGoogleUser = user?.provider?.toLowerCase().includes('google');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Account Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-bold font-serif text-2xl flex-shrink-0 shadow-inner">
              {(user?.full_name || user?.displayName || 'D').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
                  {user?.full_name || user?.displayName || 'Devotee'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {user?.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                UID: <span className="font-mono text-stone-700">{user?.uid || user?.id}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                isGoogleUser
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{formatProviderName(user?.provider)}</span>
            </span>

            {onNavigate && (
              <button
                onClick={() => onNavigate('book')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-900 hover:bg-stone-900 text-white transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Book Aarti</span>
              </button>
            )}
          </div>
        </div>

        {/* Account Details Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-[11px] text-stone-400 font-medium block">Email Address</span>
            <span className="font-semibold text-stone-800 break-all">{user?.email || '—'}</span>
          </div>
          <div>
            <span className="text-[11px] text-stone-400 font-medium block">Registered Mobile</span>
            <span className="font-semibold text-stone-800">{user?.phone || 'Not provided'}</span>
          </div>
          <div>
            <span className="text-[11px] text-stone-400 font-medium block">Member Since</span>
            <span className="font-semibold text-stone-800">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '2026'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-stone-400 font-medium block">Total Bookings</span>
            <span className="font-bold text-amber-900 text-sm">
              {myBookings.length} Aarti Booking{myBookings.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-amber-800 text-amber-900 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Profile Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'bookings'
              ? 'border-amber-800 text-amber-900 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>My Aarti Bookings ({myBookings.length})</span>
        </button>
      </div>

      {/* Tab 1: Profile Form */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold font-serif text-stone-900">Personal Information</h2>
            <p className="text-xs text-stone-500">
              Keep your devotee contact details updated for Aarti notifications and passes.
            </p>
          </div>

          {message && (
            <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name / Primary Devotee
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mobile Number (For Pass SMS & WhatsApp)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Address (Permanent Account Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {!isGoogleUser ? (
              <div className="pt-4 border-t border-stone-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                  Change Password (Optional)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Required only if changing"
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <p className="text-xs text-stone-500 bg-blue-50/60 p-3 rounded-xl border border-blue-200/60 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>You signed in using Google. Password changes are managed directly in your Google Account.</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-900 hover:bg-stone-900 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: My Aarti Bookings */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold font-serif text-stone-900">
                My Aarti Booking History
              </h2>
              <p className="text-xs text-stone-500">
                Real-time booking statuses and digital Aarti Passes for your festival visits.
              </p>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate('book')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-900 hover:bg-stone-900 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Book Another Slot</span>
              </button>
            )}
          </div>

          {bookingsLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : myBookings.length === 0 ? (
            <div className="text-center py-12 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-700">No Aarti bookings found</p>
              <p className="text-[11px] text-stone-500 mt-1 max-w-sm mx-auto">
                You haven't reserved any Aarti slots yet. Click below to view available dates and reserve your sanctum darshan pass.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('book')}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-amber-900 hover:bg-stone-900 text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Reserve Aarti Slot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((b) => (
                <div
                  key={b.id || b.booking_id}
                  className="p-4 rounded-2xl border border-stone-200 hover:border-amber-300 transition-colors bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-amber-950 text-sm">
                        {b.booking_id}
                      </span>
                      <AartiBadge status={b.status} size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-stone-600 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        Date: <strong className="text-stone-800">{b.slot_date}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        Time: <strong className="text-stone-800">{b.slot_start_time} – {b.slot_end_time}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-stone-400" />
                        Devotees: <strong className="text-stone-800">{b.number_of_people}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {b.status === 'ACCEPTED' ? (
                      <button
                        onClick={() => setSelectedPassBooking(b)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Aarti Pass</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-400 italic">
                        {b.status === 'PENDING' ? 'Under mandap review' : 'Slot unavailable'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Pass Modal */}
      <BookingPassModal
        booking={selectedPassBooking}
        isOpen={Boolean(selectedPassBooking)}
        onClose={() => setSelectedPassBooking(null)}
      />
    </div>
  );
};
