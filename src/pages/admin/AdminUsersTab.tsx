import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig.ts';
import { RegisteredDevotee, Booking } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { isRealDevotee, formatProviderName, AUTHORIZED_ADMIN_EMAIL } from '../../utils/devoteeUtils.ts';
import { ConfirmationModal } from '../../components/ConfirmationModal.tsx';
import { AartiBadge } from '../../components/AartiBadge.tsx';
import {
  Users,
  Search,
  Shield,
  Calendar,
  RefreshCw,
  Eye,
  Trash2,
  Phone,
  Mail,
  Filter,
  ArrowUpDown,
  UserCheck,
  Clock,
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';

export const AdminUsersTab: React.FC = () => {
  const [devotees, setDevotees] = useState<RegisteredDevotee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<'ALL' | 'GOOGLE' | 'PASSWORD'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'BOOKINGS' | 'NAME'>('NEWEST');

  // Modals
  const [selectedDevotee, setSelectedDevotee] = useState<RegisteredDevotee | null>(null);
  const [deleteModalDevotee, setDeleteModalDevotee] = useState<RegisteredDevotee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Users & Bookings from API
  const fetchData = useCallback(async () => {
    try {
      const [usersRes, bookingsRes] = await Promise.all([
        api.getUsers().catch(() => ({ users: [] })),
        api.getAdminBookings().catch(() => ({ bookings: [] })),
      ]);

      const usersList = usersRes?.users || [];
      const bookingsList = bookingsRes?.bookings || [];

      const realUsers = usersList.filter(isRealDevotee);
      setDevotees(realUsers);
      setBookings(bookingsList);
    } catch (err) {
      console.warn('AdminUsersTab fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const firestoreUsers: RegisteredDevotee[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: d.id,
          displayName: data.displayName || data.full_name || 'Devotee',
          full_name: data.full_name || data.displayName || 'Devotee',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'user',
          provider: data.provider || 'password',
          status: data.status || 'Active',
          createdAt: data.createdAt || data.created_at || new Date().toISOString(),
          updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
        } as RegisteredDevotee;
      });

      const realUsers = firestoreUsers.filter(isRealDevotee);
      if (realUsers.length > 0) {
        setDevotees(realUsers);
      }
    }, (err) => {
      console.warn('Firestore users onSnapshot note:', err);
    });

    return () => unsubUsers();
  }, [fetchData]);

  // Map devotee with calculated booking stats
  const devoteesWithStats = useMemo(() => {
    return devotees.map((devotee) => {
      const devoteeEmail = (devotee.email || '').toLowerCase().trim();
      const devoteeUid = devotee.uid || devotee.id;

      const userBookings = bookings.filter((b) => {
        const matchEmail = devoteeEmail && (b.email || '').toLowerCase().trim() === devoteeEmail;
        const matchUid = (b as any).user_id === devoteeUid;
        return matchEmail || matchUid;
      });

      const acceptedBookings = userBookings.filter((b) => b.status === 'ACCEPTED').length;

      return {
        ...devotee,
        total_bookings: userBookings.length,
        accepted_bookings: acceptedBookings,
      };
    });
  }, [devotees, bookings]);

  // Filter & Sort
  const filteredDevotees = useMemo(() => {
    return devoteesWithStats
      .filter((u) => {
        // Provider filter
        if (providerFilter === 'GOOGLE') {
          if (!u.provider?.toLowerCase().includes('google')) return false;
        } else if (providerFilter === 'PASSWORD') {
          if (!u.provider?.toLowerCase().includes('password')) return false;
        }

        // Search text
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        return (
          (u.displayName || u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q) ||
          (u.uid || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === 'OLDEST') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === 'BOOKINGS') {
          return (b.total_bookings || 0) - (a.total_bookings || 0);
        }
        if (sortBy === 'NAME') {
          return (a.displayName || a.full_name || '').localeCompare(b.displayName || b.full_name || '');
        }
        return 0;
      });
  }, [devoteesWithStats, search, providerFilter, sortBy]);

  // Handle delete devotee account
  const handleDeleteDevotee = async () => {
    if (!deleteModalDevotee) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', deleteModalDevotee.id));
      setDevotees((prev) => prev.filter((d) => d.id !== deleteModalDevotee.id));
      setDeleteModalDevotee(null);
      if (selectedDevotee?.id === deleteModalDevotee.id) {
        setSelectedDevotee(null);
      }
    } catch (err: any) {
      alert(`Failed to delete devotee account: ${err.message || 'Permission denied'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Selected devotee's bookings list
  const selectedDevoteeBookings = useMemo(() => {
    if (!selectedDevotee) return [];
    const email = (selectedDevotee.email || '').toLowerCase().trim();
    const uid = selectedDevotee.uid || selectedDevotee.id;
    return bookings.filter((b) => {
      const matchEmail = email && (b.email || '').toLowerCase().trim() === email;
      const matchUid = (b as any).user_id === uid;
      return matchEmail || matchUid;
    });
  }, [selectedDevotee, bookings]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
              Registered Devotee Accounts
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Registered Users: {devotees.length}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time synchronization from Firebase Firestore <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-mono">users/{'{uid}'}</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-stone-500 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
            Admin Account Excluded: <span className="font-semibold text-stone-800">{AUTHORIZED_ADMIN_EMAIL}</span>
          </div>
        </div>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">Total Registered Devotees</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif mt-1">
            {devotees.length}
          </p>
          <span className="text-[11px] text-stone-400 mt-0.5 block">Dynamic live count</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">Google Sign-In</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-blue-700 font-serif mt-1">
            {devotees.filter((d) => d.provider?.toLowerCase().includes('google')).length}
          </p>
          <span className="text-[11px] text-stone-400 mt-0.5 block">OAuth accounts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">Email & Password</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-900 font-serif mt-1">
            {devotees.filter((d) => d.provider?.toLowerCase().includes('password')).length}
          </p>
          <span className="text-[11px] text-stone-400 mt-0.5 block">Direct registrations</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">Devotees with Bookings</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-serif mt-1">
            {devoteesWithStats.filter((d) => (d.total_bookings || 0) > 0).length}
          </p>
          <span className="text-[11px] text-stone-400 mt-0.5 block">Active participants</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by devotee name, email, mobile, or UID..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Provider Filter */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="ALL">All Providers ({devotees.length})</option>
              <option value="GOOGLE">Google Sign-In</option>
              <option value="PASSWORD">Email & Password</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="NEWEST">Newest Registered</option>
              <option value="OLDEST">Oldest Registered</option>
              <option value="BOOKINGS">Most Bookings</option>
              <option value="NAME">Name (A-Z)</option>
            </select>
          </div>

          <span className="text-xs text-stone-500 whitespace-nowrap pl-2">
            Showing {filteredDevotees.length} of {devotees.length}
          </span>
        </div>
      </div>

      {/* Devotees Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : filteredDevotees.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mx-auto mb-3 font-bold font-serif text-lg">
              0
            </div>
            <h3 className="text-sm font-bold text-stone-800">Registered Users: 0</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {search || providerFilter !== 'ALL'
                ? 'No registered devotees found matching your current filter criteria.'
                : 'No devotee accounts registered yet. The count will automatically start incrementing (+1) as devotees register with Google or Email.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Devotee</th>
                  <th className="py-3 px-4">Email & Mobile</th>
                  <th className="py-3 px-4">User ID (UID)</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4 text-center">Total Bookings</th>
                  <th className="py-3 px-4 text-center">Accepted</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredDevotees.map((u) => {
                  const isGoogle = (u.provider || '').toLowerCase().includes('google');

                  return (
                    <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {(u.displayName || u.full_name || 'D').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-stone-900 block">
                              {u.displayName || u.full_name || 'Devotee'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {u.status || 'Active'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4 text-stone-600">
                        <p className="font-medium text-stone-900 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-stone-400" />
                          {u.email || '—'}
                        </p>
                        <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-stone-400" />
                          {u.phone || 'Not provided'}
                        </p>
                      </td>

                      {/* UID */}
                      <td className="py-3 px-4">
                        <span
                          title={u.uid}
                          className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 inline-block max-w-[100px] truncate"
                        >
                          {u.uid}
                        </span>
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isGoogle
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {formatProviderName(u.provider)}
                        </span>
                      </td>

                      {/* Total Bookings */}
                      <td className="py-3 px-4 text-center font-bold text-stone-900">
                        <span className="bg-stone-100 px-2 py-0.5 rounded-md text-xs">
                          {u.total_bookings}
                        </span>
                      </td>

                      {/* Accepted Bookings */}
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">
                        <span className="bg-emerald-50 px-2 py-0.5 rounded-md text-xs">
                          {u.accepted_bookings}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-4 text-stone-400 whitespace-nowrap text-[11px]">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => setSelectedDevotee(u)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="View devotee profile & booking history"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => setDeleteModalDevotee(u)}
                          className="px-2 py-1 rounded-lg text-[11px] text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center cursor-pointer"
                          title="Remove user account from Firestore"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Devotee Details & Booking History Modal */}
      {selectedDevotee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-stone-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-lg">
                  {(selectedDevotee.displayName || selectedDevotee.full_name || 'D').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-stone-900">
                    {selectedDevotee.displayName || selectedDevotee.full_name || 'Devotee'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-stone-500 font-mono">
                      UID: {selectedDevotee.uid}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      {selectedDevotee.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedDevotee(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50/80 p-4 rounded-2xl border border-stone-200">
                <div>
                  <span className="text-[11px] uppercase font-semibold text-stone-400">Email Address</span>
                  <p className="text-xs font-semibold text-stone-800 mt-0.5">{selectedDevotee.email || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-semibold text-stone-400">Mobile Number</span>
                  <p className="text-xs font-semibold text-stone-800 mt-0.5">{selectedDevotee.phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-semibold text-stone-400">Registration Provider</span>
                  <p className="text-xs font-semibold text-stone-800 mt-0.5">
                    {formatProviderName(selectedDevotee.provider)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-semibold text-stone-400">Registered On</span>
                  <p className="text-xs font-semibold text-stone-800 mt-0.5">
                    {selectedDevotee.createdAt ? new Date(selectedDevotee.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-semibold text-stone-400">Last Login</span>
                  <p className="text-xs font-semibold text-stone-800 mt-0.5">
                    {selectedDevotee.lastLoginAt ? new Date(selectedDevotee.lastLoginAt).toLocaleString() : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-semibold text-stone-400">Total Bookings</span>
                  <p className="text-xs font-bold text-amber-900 mt-0.5">
                    {selectedDevoteeBookings.length} Aarti booking(s)
                  </p>
                </div>
              </div>

              {/* Devotee's Booking History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Aarti Booking History ({selectedDevoteeBookings.length})
                  </h4>
                </div>

                {selectedDevoteeBookings.length === 0 ? (
                  <div className="text-center py-6 text-xs text-stone-400 bg-stone-50 rounded-xl border border-stone-200">
                    No Aarti bookings made by this devotee yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDevoteeBookings.map((b) => (
                      <div
                        key={b.id || b.booking_id}
                        className="p-3 rounded-xl border border-stone-200 bg-white flex items-center justify-between gap-4 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-950">{b.booking_id}</span>
                            <AartiBadge status={b.status} size="sm" />
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1">
                            Date: <span className="font-medium text-stone-800">{b.slot_date}</span> • Slot:{' '}
                            <span className="font-medium text-stone-800">
                              {b.slot_start_time} – {b.slot_end_time}
                            </span>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-semibold text-stone-900 block">
                            {b.number_of_people} Devotee(s)
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {b.created_at ? new Date(b.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50">
              <button
                onClick={() => setDeleteModalDevotee(selectedDevotee)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete User Account</span>
              </button>

              <button
                onClick={() => setSelectedDevotee(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Account Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteModalDevotee)}
        title="Delete Devotee Account?"
        message={`Are you sure you want to permanently delete devotee account for ${deleteModalDevotee?.displayName || deleteModalDevotee?.full_name} (${deleteModalDevotee?.email})? This action deletes the profile from Firestore users collection.`}
        confirmLabel="Confirm & Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteDevotee}
        onCancel={() => setDeleteModalDevotee(null)}
      />
    </div>
  );
};
