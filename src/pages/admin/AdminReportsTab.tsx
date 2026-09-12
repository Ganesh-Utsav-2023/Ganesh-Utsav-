import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig.ts';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Calendar, Filter, RefreshCw, Sparkles } from 'lucide-react';

export const AdminReportsTab: React.FC = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('2026-09-14');
  const [endDate, setEndDate] = useState('2026-09-25');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let res: any = null;
      try {
        res = await api.getAnalytics(startDate || undefined, endDate || undefined);
      } catch (apiErr) {
        console.warn('Analytics API note, computing from Firestore:', apiErr);
      }

      if (!res) {
        const snap = await getDocs(collection(db, 'bookings'));
        const allBookings = snap.docs.map((d) => d.data() as any);
        const filtered = allBookings.filter((b) => {
          const d = b.slot_date || b.date;
          if (!d) return true;
          if (startDate && d < startDate) return false;
          if (endDate && d > endDate) return false;
          return true;
        });

        const byDateMap = new Map<string, number>();
        const byStatusMap = new Map<string, number>();
        const bySourceMap = new Map<string, number>();

        filtered.forEach((b) => {
          const d = b.slot_date || b.date || 'Unknown';
          const st = b.status || 'PENDING';
          const src = b.booking_source || b.bookingSource || 'ONLINE';

          byDateMap.set(d, (byDateMap.get(d) || 0) + 1);
          byStatusMap.set(st, (byStatusMap.get(st) || 0) + 1);
          bySourceMap.set(src, (bySourceMap.get(src) || 0) + 1);
        });

        res = {
          bookingsByDate: Array.from(byDateMap.entries()).map(([date, count]) => ({ date, count })),
          bookingsBySlot: [{ slot_time: '07:30 PM – 09:00 PM', count: filtered.length }],
          statusBreakdown: Array.from(byStatusMap.entries()).map(([status, count]) => ({ status, count })),
          sourceBreakdown: Array.from(bySourceMap.entries()).map(([source, count]) => ({ source, count })),
        };
      }

      setAnalytics(res);
    } catch (err) {
      console.warn('Analytics report fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
            Reports & Analytics
          </h2>
          <p className="text-xs text-stone-500">
            Export comprehensive booking data and inspect slot performance
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700">Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700">End Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
            />
          </div>

          <button
            onClick={fetchReports}
            className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold transition-colors cursor-pointer"
          >
            Apply Range
          </button>
        </div>

        <span className="text-xs text-stone-500">
          Showing data between {startDate} and {endDate}
        </span>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings per Aarti Batch */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold font-serif text-stone-900">Aarti Slot Demand Breakdown</h3>

          {loading ? (
            <div className="h-48 rounded-xl bg-stone-100 animate-pulse" />
          ) : !analytics?.bookingsBySlot?.length ? (
            <p className="text-xs text-stone-500 py-6 text-center">No data for selected range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Slot Timing</th>
                    <th className="py-2.5 px-3 text-center">Bookings</th>
                    <th className="py-2.5 px-3 text-right">Total Devotees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {analytics.bookingsBySlot.map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-950">{s.slot_time}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-stone-900">{s.total_bookings}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-stone-900">{s.total_devotees}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Date-wise Summary */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold font-serif text-stone-900">Date-wise Headcount Analysis</h3>

          {loading ? (
            <div className="h-48 rounded-xl bg-stone-100 animate-pulse" />
          ) : !analytics?.bookingsByDate?.length ? (
            <p className="text-xs text-stone-500 py-6 text-center">No data for selected range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Requests</th>
                    <th className="py-2.5 px-3 text-center">Accepted</th>
                    <th className="py-2.5 px-3 text-right">Headcount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {analytics.bookingsByDate.map((d: any, idx: number) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-2.5 px-3 font-semibold text-stone-900">{d.date}</td>
                      <td className="py-2.5 px-3 text-center text-stone-600">{d.total_bookings}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{d.accepted}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-amber-900">{d.total_people}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
