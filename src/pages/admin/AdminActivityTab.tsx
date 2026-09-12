import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig.ts';
import { api } from '../../lib/api.ts';
import { AdminActivity } from '../../types/index.ts';
import { History, Shield, RefreshCw } from 'lucide-react';

export const AdminActivityTab: React.FC = () => {
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      let actList: AdminActivity[] = [];
      try {
        const res = await api.getActivity();
        actList = res.activities || [];
      } catch (err) {
        console.warn('Fetch activity API note, fetching from Firestore:', err);
      }

      if (actList.length === 0) {
        try {
          const snap = await getDocs(query(collection(db, 'bookings'), limit(30)));
          actList = snap.docs.map((d, i) => {
            const data = d.data();
            return {
              id: i + 1,
              admin_id: data.userId || 'admin',
              admin_name: data.devotee_name || 'Admin',
              action: data.status === 'ACCEPTED' ? 'BOOKING_CONFIRMED' : data.status === 'REJECTED' ? 'BOOKING_REJECTED' : 'BOOKING_CREATED',
              description: `Booking ${data.booking_id || d.id} (${data.slot_date || data.date || ''}) marked as ${data.status || 'PENDING'}`,
              created_at: data.created_at || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
            };
          });
        } catch (fsErr) {
          console.warn('Firestore fallback note:', fsErr);
        }
      }

      setActivities(actList);
    } catch (err) {
      console.warn('Fetch activity error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
            Administrative Audit Trail
          </h2>
          <p className="text-xs text-stone-500">
            Permanent record of committee decisions, slot alterations, and booking confirmations
          </p>
        </div>

        <button
          onClick={fetchActivity}
          className="p-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
          title="Refresh logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-xs text-stone-500">
            No activity records logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Admin Member</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {activities.map((a) => (
                  <tr key={a.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-stone-100 text-amber-950 border border-stone-200">
                        {a.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-800 font-medium">{a.description}</td>
                    <td className="py-3 px-4 text-stone-600">
                      <span className="font-semibold text-stone-900">{a.admin_name || 'Admin'}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-stone-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
