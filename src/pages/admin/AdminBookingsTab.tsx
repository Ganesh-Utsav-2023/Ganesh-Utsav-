import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig.ts';
import { api } from '../../lib/api.ts';
import { Booking } from '../../types/index.ts';
import { AartiBadge } from '../../components/AartiBadge.tsx';
import { ConfirmationModal } from '../../components/ConfirmationModal.tsx';
import { changeBookingStatusAtomic, deleteBookingAtomic, editBookingAtomic } from '../../lib/slotsService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatToIndianDate } from '../../utils/dateUtils.ts';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Printer,
  Ban,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface AdminBookingsTabProps {
  initialFilter?: { status?: string; date?: string };
  onViewPass: (booking: Booking) => void;
  onNavigateTab: (tab: string) => void;
}

export const AdminBookingsTab: React.FC<AdminBookingsTabProps> = ({
  initialFilter,
  onViewPass,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [allFirestoreBookings, setAllFirestoreBookings] = useState<Booking[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(initialFilter?.status || 'ALL');
  const [date, setDate] = useState<string>(initialFilter?.date || '');
  const [source, setSource] = useState<string>('ALL');
  const [sort, setSort] = useState<string>('newest');

  // Sync filters if initialFilter changes (e.g. from Dashboard quick cards)
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.status) {
        setStatus(initialFilter.status);
      }
      if (initialFilter.date !== undefined) {
        setDate(initialFilter.date);
      }
    }
  }, [initialFilter]);

  // Modals
  const [statusModal, setStatusModal] = useState<{
    booking: Booking;
    targetStatus: 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  } | null>(null);
  const [statusReason, setStatusReason] = useState('');

  const [deleteModalBooking, setDeleteModalBooking] = useState<Booking | null>(null);

  const [editModalBooking, setEditModalBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    devotee_name: '',
    phone: '',
    email: '',
    number_of_people: 1,
    address: '',
    special_request: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch bookings from server API with Firestore fallback and real-time listener
  const loadBookings = useCallback(async () => {
    try {
      let items: Booking[] = [];
      try {
        const res = await api.getAdminBookings();
        items = res.bookings || [];
      } catch (err) {
        console.warn('API getAdminBookings note, fetching from Firestore:', err);
      }

      if (items.length === 0) {
        const snap = await getDocs(collection(db, 'bookings'));
        items = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id, doc_id: d.id }));
      }

      setAllFirestoreBookings(items);
    } catch (err) {
      console.warn('AdminBookings load notice:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);

    // Subscribe to real-time updates from Firestore bookings collection
    const unsub = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const items = snapshot.docs.map((d) => ({ ...(d.data() as any), id: d.id, doc_id: d.id } as Booking));
      setAllFirestoreBookings(items);
      setLoading(false);
    }, (err) => {
      console.warn('Firestore bookings onSnapshot error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Filter & Sort Logic
  useEffect(() => {
    let filtered = [...allFirestoreBookings];

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.booking_id.toLowerCase().includes(q) ||
          b.devotee_name.toLowerCase().includes(q) ||
          b.phone.includes(q) ||
          b.email.toLowerCase().includes(q)
      );
    }

    if (status !== 'ALL') {
      filtered = filtered.filter((b) => b.status === status);
    }

    if (date) {
      filtered = filtered.filter((b) => b.slot_date === date);
    }

    if (source !== 'ALL') {
      filtered = filtered.filter((b) => b.booking_source === source);
    }

    filtered.sort((a, b) => {
      if (sort === 'newest') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    setBookings(filtered);
  }, [allFirestoreBookings, search, status, date, source, sort]);

  // Handle status update (Accept, Reject, Cancel, Complete)
  const handleStatusSubmit = async () => {
    if (!statusModal) return;
    setIsProcessing(true);
    const { booking, targetStatus } = statusModal;
    const targetDocId = String(booking.doc_id || booking.id);

    try {
      const activePassId = booking.passId || booking.pass_id || `GA-PASS-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Atomic Firestore transaction for status update + seat management
      await changeBookingStatusAtomic({
        bookingDocId: targetDocId,
        targetStatus,
        reason: statusReason || undefined,
        passId: targetStatus === 'ACCEPTED' ? activePassId : undefined,
      });

      // 2. Sync backend API
      try {
        await api.adminUpdateBookingStatus(booking.id, {
          status: targetStatus,
          reason: statusReason,
        });
      } catch (e) {
        // Fallback
      }

      if (targetStatus === 'ACCEPTED') {
        setStatusModal(null);
        setStatusReason('');

        alert(`Booking accepted successfully (Pass ID: ${activePassId}). Aarti Pass is now available for the devotee.`);
      } else {
        setStatusModal(null);
        setStatusReason('');
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle delete
  const handleDeleteSubmit = async () => {
    if (!deleteModalBooking) return;
    setIsProcessing(true);
    try {
      const targetDocId = String(deleteModalBooking.doc_id || deleteModalBooking.id);

      // 1. Atomic Firestore Delete + seat restoration
      await deleteBookingAtomic(targetDocId);

      // 2. Sync API
      try {
        await api.adminDeleteBooking(deleteModalBooking.id);
      } catch (e) {
        // Fallback
      }

      setDeleteModalBooking(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete booking.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle edit save
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalBooking) return;
    setIsProcessing(true);
    try {
      const targetDocId = String(editModalBooking.doc_id || editModalBooking.id);

      // 1. Atomic Firestore Edit + seat adjustment
      await editBookingAtomic(targetDocId, {
        devoteeName: editForm.devotee_name,
        phone: editForm.phone,
        email: editForm.email,
        numberOfPeople: Number(editForm.number_of_people),
        address: editForm.address,
        specialRequest: editForm.special_request,
      });

      // 2. Sync API
      try {
        await api.adminEditBooking(editModalBooking.id, editForm);
      } catch (e) {
        // Fallback
      }

      setEditModalBooking(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update booking.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (booking: Booking) => {
    setEditModalBooking(booking);
    setEditForm({
      devotee_name: booking.devotee_name,
      phone: booking.phone,
      email: booking.email,
      number_of_people: booking.number_of_people,
      address: booking.address || '',
      special_request: booking.special_request || '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
            Aarti Bookings Directory
          </h2>
          <p className="text-xs text-stone-500">
            Search, verify, approve, edit, or reject devotee reservations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 300);
            }}
            className="p-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => onNavigateTab('create-booking')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Add Booking</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, Devotee name, phone, email..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="ACCEPTED">Accepted Only</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none bg-white"
            />
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none bg-white"
            >
              <option value="ALL">All Sources</option>
              <option value="ONLINE">Online Portal</option>
              <option value="ADMIN">Admin Manual</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Helper */}
        {(search || status !== 'ALL' || date || source !== 'ALL') && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
            <span className="text-stone-500 font-medium">
              Active filter: showing <strong className="text-stone-900">{bookings.length}</strong> of {allFirestoreBookings.length} booking(s)
            </span>
            
            <button
              onClick={() => {
                setSearch('');
                setStatus('ALL');
                setDate('');
                setSource('ALL');
              }}
              className="text-amber-800 font-semibold hover:underline cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-stone-800 font-serif">No Bookings Matched</h4>
            <p className="text-xs text-stone-500 mt-1">Try relaxing search terms or status filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Devotee Information</th>
                  <th className="py-3 px-4">Aarti Date & Slot</th>
                  <th className="py-3 px-4 text-center">Devotees</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-950">
                      <div>{b.booking_id}</div>
                      {(b.tokenNumber || b.token_number) && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-600 text-white uppercase tracking-wider">
                            Token #{b.tokenNumber || b.token_number}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-stone-900">{b.devotee_name}</p>
                      <p className="text-[11px] text-stone-500">{b.phone} • {b.email}</p>
                      {b.address && (
                        <p className="text-[11px] text-stone-400 truncate max-w-xs">{b.address}</p>
                      )}
                      {b.special_request && (
                        <p className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 mt-1 inline-block">
                          Note: {b.special_request}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-stone-900">{formatToIndianDate(b.slot_date)}</p>
                      <p className="font-mono text-[11px] text-amber-900">
                        {b.slot_start_time} – {b.slot_end_time}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-stone-900">
                      {b.number_of_people}
                    </td>

                    <td className="py-3.5 px-4">
                      <AartiBadge status={b.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        b.booking_source === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {b.booking_source}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                      {b.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => setStatusModal({ booking: b, targetStatus: 'ACCEPTED' })}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Accept Booking"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setStatusModal({ booking: b, targetStatus: 'REJECTED' })}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                            title="Reject Booking"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {b.status === 'ACCEPTED' && (
                        <>
                          <button
                            onClick={() => setStatusModal({ booking: b, targetStatus: 'COMPLETED' })}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            title="Mark Aarti Completed"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => onViewPass(b)}
                        className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                        title="View Pass"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => openEditModal(b)}
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {(b.status === 'PENDING' || b.status === 'ACCEPTED') && (
                        <button
                          onClick={() => setStatusModal({ booking: b, targetStatus: 'CANCELLED' })}
                          className="p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          title="Cancel Booking"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setDeleteModalBooking(b)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Update Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(statusModal)}
        title={`${statusModal?.targetStatus} Booking?`}
        message={`Are you sure you want to change booking ${statusModal?.booking.booking_id} status to ${statusModal?.targetStatus}?`}
        confirmLabel={`Confirm ${statusModal?.targetStatus}`}
        variant={statusModal?.targetStatus === 'ACCEPTED' ? 'success' : statusModal?.targetStatus === 'REJECTED' || statusModal?.targetStatus === 'CANCELLED' ? 'danger' : 'warning'}
        showInput={statusModal?.targetStatus === 'REJECTED'}
        inputPlaceholder="Reason for rejection (sent to audit log)..."
        inputValue={statusReason}
        onInputChange={setStatusReason}
        isLoading={isProcessing}
        onConfirm={handleStatusSubmit}
        onCancel={() => {
          setStatusModal(null);
          setStatusReason('');
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteModalBooking)}
        title="Permanently Delete Booking?"
        message={`This will permanently remove record ${deleteModalBooking?.booking_id} (${deleteModalBooking?.devotee_name}) from the database. This action cannot be undone.`}
        confirmLabel="Permanently Delete"
        variant="danger"
        isLoading={isProcessing}
        onConfirm={handleDeleteSubmit}
        onCancel={() => setDeleteModalBooking(null)}
      />

      {/* Edit Booking Details Modal */}
      {editModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold font-serif text-stone-900">
                  Edit Booking #{editModalBooking.booking_id}
                </h3>
                <p className="text-xs text-stone-500">Update devotee details and headcount</p>
              </div>
              <button
                onClick={() => setEditModalBooking(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Devotee Name</label>
                <input
                  type="text"
                  required
                  value={editForm.devotee_name}
                  onChange={(e) => setEditForm({ ...editForm, devotee_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">No. of People</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={editForm.number_of_people}
                    onChange={(e) => setEditForm({ ...editForm, number_of_people: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Special Seva Request</label>
                <textarea
                  rows={2}
                  value={editForm.special_request}
                  onChange={(e) => setEditForm({ ...editForm, special_request: e.target.value })}
                  className="w-full p-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditModalBooking(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-amber-900 hover:bg-stone-900"
                >
                  {isProcessing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
