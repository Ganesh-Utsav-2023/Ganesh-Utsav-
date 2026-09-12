import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig.ts';
import { api } from '../../lib/api.ts';
import { DashboardStats, Booking, RegisteredDevotee } from '../../types/index.ts';
import { AartiBadge } from '../../components/AartiBadge.tsx';
import { ConfirmationModal } from '../../components/ConfirmationModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { changeBookingStatusAtomic } from '../../lib/slotsService.ts';
import { generateUnifiedAdminExcel } from '../../utils/excelGenerator.ts';
import { isRealDevotee, formatProviderName } from '../../utils/devoteeUtils.ts';
import { formatToIndianDate } from '../../utils/dateUtils.ts';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Search,
  ExternalLink,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AdminDashboardTabProps {
  onNavigateTab: (tab: string, params?: any) => void;
  onViewPass: (booking: Booking) => void;
}

const COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#64748b', '#3b82f6'];

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({ onNavigateTab, onViewPass }) => {
  const { user } = useAuth();
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [devotees, setDevotees] = useState<RegisteredDevotee[]>([]);
  const [devoteeSearch, setDevoteeSearch] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [pendingQueue, setPendingQueue] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (user?.role !== 'admin') {
      alert('Security Violation: Only authenticated Mandal Admin accounts can export portal data.');
      return;
    }

    setIsExporting(true);
    try {
      const res = await generateUnifiedAdminExcel(user.role);

      if (res.success) {
        alert(
          `Successfully exported comprehensive Mandal Excel workbook!\n` +
          `• Aarti Bookings: ${res.bookingsCount}\n` +
          `• Chanda Receipts: ${res.chandaCount}\n` +
          `• Expenses Recorded: ${res.expenseCount}\n` +
          `• Summary Sheets: Financial Summary & Aarti Summary included\n` +
          `Filename: ${res.filename}`
        );
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Error generating Excel'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Quick action modal
  const [actionModal, setActionModal] = useState<{
    booking: Booking;
    action: 'ACCEPTED' | 'REJECTED';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [bookingsRes, usersRes, statsRes] = await Promise.all([
        api.getAdminBookings().catch(() => ({ bookings: [] })),
        api.getUsers().catch(() => ({ users: [] })),
        api.getStats().catch(() => null),
      ]);

      let items = bookingsRes?.bookings || [];
      let usersList = usersRes?.users || [];

      // Direct Firestore fallback
      if (items.length === 0) {
        try {
          const snap = await getDocs(collection(db, 'bookings'));
          items = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id, doc_id: d.id }));
        } catch (fsErr) {
          console.warn('Firestore bookings fetch note:', fsErr);
        }
      }

      if (usersList.length === 0) {
        try {
          const snapUsers = await getDocs(collection(db, 'users'));
          usersList = snapUsers.docs.map((d) => ({ ...(d.data() as any), id: d.id, uid: d.id }));
        } catch (fsErr) {
          console.warn('Firestore users fetch note:', fsErr);
        }
      }

      const realUsers = usersList.filter(isRealDevotee);
      setDevotees(realUsers);

      const totalBookings = items.length;
      const pendingCount = items.filter((b) => b.status === 'PENDING').length;
      const acceptedCount = items.filter((b) => b.status === 'ACCEPTED').length;
      const rejectedCount = items.filter((b) => b.status === 'REJECTED').length;
      const todayCount = items.filter((b) => b.slot_date === todayStr).length;
      const upcomingCount = items.filter((b) => b.status === 'ACCEPTED' && b.slot_date >= todayStr).length;
      const totalDevotees = items.reduce((sum, b) => sum + (b.number_of_people || 1), 0);

      setStats({
        total_bookings: statsRes?.total_bookings ?? totalBookings,
        pending_bookings: statsRes?.pending_bookings ?? pendingCount,
        accepted_bookings: statsRes?.accepted_bookings ?? acceptedCount,
        rejected_bookings: statsRes?.rejected_bookings ?? rejectedCount,
        today_bookings: statsRes?.today_bookings ?? todayCount,
        upcoming_bookings: statsRes?.upcoming_bookings ?? upcomingCount,
        total_devotees: statsRes?.total_devotees ?? totalDevotees,
        total_users: realUsers.length,
      });

      setAllBookings(items);
      setTodayBookings(items.filter((b) => b.slot_date === todayStr));
      setPendingQueue(items.filter((b) => b.status === 'PENDING'));
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDashboardData();

    const unsub = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const items = snapshot.docs.map((d) => ({ ...(d.data() as any), id: d.id, doc_id: d.id } as Booking));
      const todayStr = new Date().toISOString().split('T')[0];

      setAllBookings(items);
      setTodayBookings(items.filter((b) => b.slot_date === todayStr));
      setPendingQueue(items.filter((b) => b.status === 'PENDING'));

      const totalBookings = items.length;
      const pendingCount = items.filter((b) => b.status === 'PENDING').length;
      const acceptedCount = items.filter((b) => b.status === 'ACCEPTED').length;
      const rejectedCount = items.filter((b) => b.status === 'REJECTED').length;
      const todayCount = items.filter((b) => b.slot_date === todayStr).length;
      const upcomingCount = items.filter((b) => b.status === 'ACCEPTED' && b.slot_date >= todayStr).length;
      const totalDevotees = items.reduce((sum, b) => sum + (b.number_of_people || 1), 0);

      setStats((prev) => ({
        ...prev,
        total_bookings: totalBookings,
        pending_bookings: pendingCount,
        accepted_bookings: acceptedCount,
        rejected_bookings: rejectedCount,
        today_bookings: todayCount,
        upcoming_bookings: upcomingCount,
        total_devotees: totalDevotees,
      }));
      setLoading(false);
    }, (err) => {
      console.warn('Dashboard bookings onSnapshot error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [fetchDashboardData]);

  const loadData = async () => {
    try {
      const [analyticsRes, statsRes] = await Promise.all([
        api.getAnalytics().catch(() => null),
        api.getStats().catch(() => null),
      ]);

      if (analyticsRes) setAnalytics(analyticsRes);
      if (statsRes?.stats) {
        setStats((prev) => ({
          ...prev,
          total_users: prev?.total_users ?? statsRes.stats.total_users ?? 0,
        } as DashboardStats));
      }
    } catch (err) {
      console.warn('Backend metrics fallback notice:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async () => {
    if (!actionModal) return;
    setIsProcessing(true);
    const { booking, action } = actionModal;
    const targetDocId = String(booking.doc_id || booking.id);

    try {
      const activePassId = booking.passId || booking.pass_id || `GA-PASS-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Atomic Firestore transaction for status update & seat adjustment
      await changeBookingStatusAtomic({
        bookingDocId: targetDocId,
        targetStatus: action,
        reason: actionReason || undefined,
        passId: action === 'ACCEPTED' ? activePassId : undefined,
      });

      // 2. Sync Backend API
      try {
        await api.adminUpdateBookingStatus(booking.id, {
          status: action,
          reason: actionReason || (action === 'ACCEPTED' ? 'Accepted by Admin Mandal Committee' : undefined),
        });
      } catch (e) {
        // Fallback
      }

      if (action === 'ACCEPTED') {
        // Refresh dashboard data
        await fetchDashboardData();

        setActionModal(null);
        setActionReason('');

        alert(`Booking accepted successfully (Pass ID: ${activePassId}). Aarti Pass is now available for the devotee.`);
      } else {
        setActionModal(null);
        setActionReason('');
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Prepare chart data
  const dateChartData = analytics?.bookingsByDate?.map((d: any) => ({
    date: d.date.split('-').slice(1).join('/'),
    Bookings: d.total_bookings,
    Devotees: d.total_people,
  })) || [];

  const pieData = analytics?.statusBreakdown?.map((s: any) => ({
    name: s.status,
    value: s.count,
  })) || [];

  return (
    <div className="space-y-8">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
            Mandap Operations Overview
          </h2>
          <p className="text-xs text-stone-500">
            Live metrics, devotees queue, and daily capacity utilization
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-600 disabled:opacity-50"
            title="Export complete portal data (Aarti Bookings, Chanda, Expenses, Summaries) to Excel (.xlsx)"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
            <span>{isExporting ? 'Preparing...' : 'Export Excel'}</span>
          </button>

          <button
            onClick={() => onNavigateTab('create-booking')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* 8 Statistic Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div
          onClick={() => onNavigateTab('bookings')}
          className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-xs font-semibold text-stone-500">Total Bookings</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif mt-1">
            {stats?.total_bookings || 0}
          </p>
          <span className="text-[11px] text-stone-400 mt-1 block">All registered requests</span>
        </div>

        {/* Pending Approval */}
        <div
          onClick={() => onNavigateTab('bookings', { status: 'PENDING' })}
          className="bg-amber-50/70 p-4 rounded-2xl border border-amber-300 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-xs font-semibold text-amber-800">Pending Review</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-serif mt-1">
            {stats?.pending_bookings || 0}
          </p>
          <span className="text-[11px] text-amber-900 font-bold mt-1 block">Action required →</span>
        </div>

        {/* Accepted Bookings */}
        <div
          onClick={() => onNavigateTab('bookings', { status: 'ACCEPTED' })}
          className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-300 hover:border-emerald-400 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-xs font-semibold text-emerald-800">Accepted & Confirmed</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-serif mt-1">
            {stats?.accepted_bookings || 0}
          </p>
          <span className="text-[11px] text-emerald-800 mt-1 block">Passes activated</span>
        </div>

        {/* Rejected Bookings */}
        <div
          onClick={() => onNavigateTab('bookings', { status: 'REJECTED' })}
          className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 hover:border-rose-300 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-xs font-semibold text-rose-800">Rejected</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 font-serif mt-1">
            {stats?.rejected_bookings || 0}
          </p>
          <span className="text-[11px] text-rose-600 mt-1 block">Capacity / rules</span>
        </div>

        {/* Today's Bookings */}
        <div
          onClick={() => onNavigateTab('bookings', { date: new Date().toISOString().split('T')[0] })}
          className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-xs font-semibold text-stone-500">Today's Aarti</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif mt-1">
            {stats?.today_bookings || 0}
          </p>
          <span className="text-[11px] text-amber-700 mt-1 block">Scheduled for today</span>
        </div>

        {/* Upcoming Bookings */}
        <div
          onClick={() => onNavigateTab('bookings', { status: 'ACCEPTED' })}
          className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-xs font-semibold text-stone-500">Upcoming Active</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif mt-1">
            {stats?.upcoming_bookings || 0}
          </p>
          <span className="text-[11px] text-stone-400 mt-1 block">Future festival dates</span>
        </div>

        {/* Total Devotees Headcount */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">Total Devotees</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-900 font-serif mt-1">
            {stats?.total_devotees || 0}
          </p>
          <span className="text-[11px] text-stone-400 mt-1 block">Sum of headcount</span>
        </div>

        {/* Registered Devotees */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-xs font-semibold text-stone-500">Registered Users</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif mt-1">
            {stats?.total_users || 0}
          </p>
          <span className="text-[11px] text-stone-400 mt-1 block">Devotee accounts</span>
        </div>
      </div>

      {/* Visual Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings Trend Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 font-serif">Daily Booking Volume</h3>
            <span className="text-[11px] text-stone-500">Festival Date Distribution</span>
          </div>

          <div className="h-60 w-full">
            {dateChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Bookings" fill="#d97706" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Devotees" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">
                No booking trend data yet.
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown Donut Chart (1 col) */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-stone-900 font-serif">Status Distribution</h3>
          <div className="h-52 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-stone-400">No data</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
            {pieData.map((d: any, i: number) => (
              <div key={d.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-stone-600">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Approval Queue */}
      <div className="bg-white rounded-3xl border border-amber-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-serif text-stone-900">Pending Bookings Queue</h3>
              {pendingQueue.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {pendingQueue.length} New
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Newly submitted devotee requests awaiting Mandal verification
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('bookings', { status: 'PENDING' })}
            className="text-xs font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Pending ({stats?.pending_bookings || 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingQueue.length === 0 ? (
          <div className="text-center py-8 text-xs text-stone-500">
            No pending bookings awaiting review. All requests are processed!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-50/60 text-stone-600 border-b border-amber-200/80 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Booking ID</th>
                  <th className="py-2.5 px-3">Devotee Name & Mobile</th>
                  <th className="py-2.5 px-3">Date & Aarti Time</th>
                  <th className="py-2.5 px-3">People</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pendingQueue.slice(0, 8).map((b) => (
                  <tr key={b.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-amber-950">{b.booking_id}</td>
                    <td className="py-3 px-3 font-medium text-stone-900">
                      {b.devotee_name}
                      <span className="block text-[11px] text-stone-400">{b.phone} • {b.email}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-stone-700">
                      {formatToIndianDate(b.slot_date)} ({b.slot_start_time} – {b.slot_end_time})
                    </td>
                    <td className="py-3 px-3 font-semibold text-stone-900">{b.number_of_people}</td>
                    <td className="py-3 px-3">
                      <AartiBadge status={b.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setActionModal({ booking: b, action: 'ACCEPTED' })}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setActionModal({ booking: b, action: 'REJECTED' })}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => onViewPass(b)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Today's Aarti Devotee Queue */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-serif text-stone-900">Today's Aarti Devotee Queue</h3>
            <p className="text-xs text-stone-500">
              Immediate actions for today's scheduled Aarti batches
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('bookings')}
            className="text-xs font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Bookings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayBookings.length === 0 ? (
          <div className="text-center py-8 text-xs text-stone-500">
            No bookings scheduled for today's date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 border-b border-stone-200 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Booking ID</th>
                  <th className="py-2.5 px-3">Devotee Name</th>
                  <th className="py-2.5 px-3">Slot Time</th>
                  <th className="py-2.5 px-3">People</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {todayBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-amber-950">{b.booking_id}</td>
                    <td className="py-3 px-3 font-medium text-stone-900">
                      {b.devotee_name}
                      <span className="block text-[11px] text-stone-400">{b.phone}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-stone-700">
                      {b.slot_start_time} – {b.slot_end_time}
                    </td>
                    <td className="py-3 px-3 font-semibold text-stone-900">{b.number_of_people}</td>
                    <td className="py-3 px-3">
                      <AartiBadge status={b.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                      {b.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => setActionModal({ booking: b, action: 'ACCEPTED' })}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => setActionModal({ booking: b, action: 'REJECTED' })}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onViewPass(b)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
                      >
                        Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registered Devotee Accounts Section */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold font-serif text-stone-900">Registered Devotee Accounts</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/60">
                Registered Users: {devotees.length}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Real-time synchronization from Firebase user accounts (admin excluded)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={devoteeSearch}
                onChange={(e) => setDevoteeSearch(e.target.value)}
                placeholder="Search name, email, mobile..."
                className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 focus:border-amber-500 outline-none w-48 sm:w-56"
              />
            </div>

            <button
              onClick={() => onNavigateTab('users')}
              className="text-xs font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Manage Devotees</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {devotees.length === 0 ? (
          <div className="text-center py-10 px-4 bg-stone-50/60 rounded-2xl border border-dashed border-stone-200">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-2 text-amber-800 font-serif font-bold">
              0
            </div>
            <p className="text-xs font-semibold text-stone-700">Registered Users: 0</p>
            <p className="text-[11px] text-stone-500 mt-1 max-w-sm mx-auto">
              No devotee accounts registered yet. The count will automatically start incrementing (+1) as devotees register with Google or Email.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 border-b border-stone-200 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Devotee Name</th>
                  <th className="py-2.5 px-3">Email & Contact</th>
                  <th className="py-2.5 px-3">User ID (UID)</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Registered On</th>
                  <th className="py-2.5 px-3 text-center">Bookings</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {devotees
                  .filter((d) => {
                    if (!devoteeSearch.trim()) return true;
                    const q = devoteeSearch.toLowerCase();
                    return (
                      (d.displayName || d.full_name || '').toLowerCase().includes(q) ||
                      (d.email || '').toLowerCase().includes(q) ||
                      (d.phone || '').toLowerCase().includes(q) ||
                      (d.uid || '').toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 10)
                  .map((d) => {
                    const devoteeEmail = (d.email || '').toLowerCase();
                    const bookingCount = allBookings.filter(
                      (b) => (b.email || '').toLowerCase() === devoteeEmail || (b as any).user_id === d.uid
                    ).length;

                    const isGoogle = (d.provider || '').toLowerCase().includes('google');

                    return (
                      <tr key={d.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                              {(d.displayName || d.full_name || 'D').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-stone-900">
                              {d.displayName || d.full_name || 'Devotee'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-stone-800">{d.email || '—'}</p>
                          <p className="text-[11px] text-stone-400">{d.phone || 'No phone'}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                            {d.uid ? `${d.uid.substring(0, 10)}...` : d.id}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              isGoogle
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-stone-100 text-stone-700 border border-stone-200'
                            }`}
                          >
                            {formatProviderName(d.provider)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-600">
                          {d.createdAt
                            ? new Date(d.createdAt).toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md">
                            {bookingCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {d.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(actionModal)}
        title={actionModal?.action === 'ACCEPTED' ? 'Accept Aarti Booking?' : 'Reject Aarti Booking?'}
        message={`Are you sure you want to change status to ${actionModal?.action} for booking ${actionModal?.booking.booking_id} (${actionModal?.booking.devotee_name})?`}
        confirmLabel={actionModal?.action === 'ACCEPTED' ? 'Confirm & Accept' : 'Confirm & Reject'}
        variant={actionModal?.action === 'ACCEPTED' ? 'success' : 'danger'}
        showInput={actionModal?.action === 'REJECTED'}
        inputPlaceholder="Reason for rejection (e.g. sanctum capacity reached)"
        inputValue={actionReason}
        onInputChange={setActionReason}
        isLoading={isProcessing}
        onConfirm={handleStatusUpdate}
        onCancel={() => {
          setActionModal(null);
          setActionReason('');
        }}
      />
    </div>
  );
};
