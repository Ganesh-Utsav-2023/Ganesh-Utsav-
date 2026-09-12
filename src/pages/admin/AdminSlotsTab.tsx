import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api.ts';
import { AartiSlot } from '../../types/index.ts';
import { AartiBadge } from '../../components/AartiBadge.tsx';
import { ConfirmationModal } from '../../components/ConfirmationModal.tsx';
import {
  subscribeToAartiSlots,
  saveAartiSlotInFirestore,
  deleteAartiSlotFromFirestore
} from '../../lib/slotsService.ts';
import {
  FestivalSettings,
  subscribeToFestivalSettings,
  updateFestivalSettings,
  getActiveFestivalYear,
  setActiveFestivalYear
} from '../../lib/festivalService.ts';
import { getDatesListBetween } from '../../utils/festivalCalculator.ts';
import { formatToIndianDate } from '../../utils/dateUtils.ts';
import {
  Calendar,
  Clock,
  Plus,
  Layers,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Settings
} from 'lucide-react';

export const AdminSlotsTab: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [festivalSettings, setFestivalSettings] = useState<FestivalSettings | null>(null);
  const [showFestivalModal, setShowFestivalModal] = useState(false);
  const [festivalForm, setFestivalForm] = useState({
    festivalName: '',
    ganeshChaturthiDate: '',
    festivalStartDate: '',
    festivalEndDate: '',
  });

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-14');
  const [slots, setSlots] = useState<AartiSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Slot Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    date: '2026-09-14',
    start_time: '07:30 PM',
    end_time: '09:00 PM',
    capacity: 11,
  });

  // Batch Generator Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchDate, setBatchDate] = useState('2026-09-14');
  const [batchCapacity, setBatchCapacity] = useState(11);

  // Edit Slot Modal
  const [editModalSlot, setEditModalSlot] = useState<AartiSlot | null>(null);
  const [editForm, setEditForm] = useState({
    start_time: '',
    end_time: '',
    capacity: 11,
    status: 'AVAILABLE',
  });

  // Delete Slot Modal
  const [deleteModalSlot, setDeleteModalSlot] = useState<AartiSlot | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Load active festival year on mount
  useEffect(() => {
    getActiveFestivalYear().then((yr) => {
      if (yr) setSelectedYear(yr);
    }).catch(() => {});
  }, []);

  // Realtime subscription to Festival Settings for selected year
  useEffect(() => {
    const unsubscribe = subscribeToFestivalSettings(selectedYear, (settings) => {
      setFestivalSettings(settings);
      setFestivalForm({
        festivalName: settings.festivalName,
        ganeshChaturthiDate: settings.ganeshChaturthiDate,
        festivalStartDate: settings.festivalStartDate,
        festivalEndDate: settings.festivalEndDate,
      });

      const dates = getDatesListBetween(settings.festivalStartDate, settings.festivalEndDate);
      setAvailableDates(dates);

      if (!dates.includes(selectedDate)) {
        setSelectedDate(settings.festivalStartDate);
      }
    });

    return () => unsubscribe();
  }, [selectedYear]);

  // Handle Festival Settings Save
  const handleFestivalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    setMessage('');
    try {
      await updateFestivalSettings(selectedYear, {
        festivalName: festivalForm.festivalName,
        ganeshChaturthiDate: festivalForm.ganeshChaturthiDate,
        festivalStartDate: festivalForm.festivalStartDate,
        festivalEndDate: festivalForm.festivalEndDate,
      });
      setMessage(`Festival dates for ${selectedYear} updated & slots synced in Firestore!`);
      setShowFestivalModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update festival dates.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadDates = async () => {
    try {
      const res = await api.getSlotDates();
      if (res.dates && res.dates.length > 0) {
        setAvailableDates((prev) => Array.from(new Set([...prev, ...res.dates])).sort());
      }
    } catch (e) {
      console.warn('Failed to load slot dates:', e);
    }
  };

  const loadSlots = async () => {
    setLoading(true);
    await loadDates();
    try {
      const res = await api.getSlots(selectedDate || undefined);
      if (res.slots && res.slots.length > 0) {
        setSlots(res.slots);
      }
    } catch (err) {
      console.warn('Load slots manual refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAartiSlots(
      selectedDate,
      (updatedSlots) => {
        setSlots(updatedSlots);
        setLoading(false);
      },
      (err) => {
        console.warn('Realtime slots error note:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedDate]);

  // Handle Add Single Slot
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    setMessage('');
    try {
      // 1. Write to Firestore
      await saveAartiSlotInFirestore({
        date: addForm.date,
        start_time: addForm.start_time,
        end_time: addForm.end_time,
        capacity: addForm.capacity,
        status: 'AVAILABLE',
      });

      // 2. Sync API
      try {
        await api.createSlot(addForm);
      } catch (e) {
        // Fallback
      }

      setMessage('Aarti slot created successfully in Firestore!');
      setShowAddModal(false);
      await loadDates();
    } catch (err: any) {
      setError(err.message || 'Failed to create slot.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Batch Generate
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    setMessage('');

    try {
      await saveAartiSlotInFirestore({
        date: batchDate,
        start_time: '07:30 PM',
        end_time: '09:00 PM',
        capacity: 11,
        status: 'AVAILABLE',
      });

      try {
        await api.batchCreateSlots({
          date: batchDate,
          default_capacity: 11,
          slots: [{ start_time: '07:30 PM', end_time: '09:00 PM', capacity: 11 }],
        });
      } catch (e) {
        // Fallback
      }

      setMessage(`Maha Sandhya Aarti slot (11 seats) generated for ${batchDate}!`);
      setShowBatchModal(false);
      setSelectedDate(batchDate);
      await loadDates();
    } catch (err: any) {
      setError(err.message || 'Batch generation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalSlot) return;
    setIsProcessing(true);
    setError('');
    try {
      await saveAartiSlotInFirestore({
        id: editModalSlot.id,
        date: editModalSlot.date,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        capacity: editForm.capacity,
        status: editForm.status as any,
      });

      try {
        await api.updateSlot(editModalSlot.id, editForm);
      } catch (e) {
        // Fallback
      }

      setEditModalSlot(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update slot.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!deleteModalSlot) return;
    setIsProcessing(true);
    setError('');
    try {
      await deleteAartiSlotFromFirestore(deleteModalSlot.id);
      try {
        await api.deleteSlot(deleteModalSlot.id);
      } catch (e) {
        // Fallback
      }
      setDeleteModalSlot(null);
      await loadDates();
    } catch (err: any) {
      alert(err.message || 'Failed to delete slot.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openEdit = (slot: AartiSlot) => {
    setEditModalSlot(slot);
    setEditForm({
      start_time: slot.start_time,
      end_time: slot.end_time,
      capacity: slot.capacity,
      status: slot.status,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
            Aarti Slot Management
          </h2>
          <p className="text-xs text-stone-500">
            Configure timings, sanctum devotee limits, and occupancy status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={async (e) => {
              const yr = Number(e.target.value);
              setSelectedYear(yr);
              try {
                await setActiveFestivalYear(yr);
              } catch (err) {
                console.warn('Failed to set active festival year:', err);
              }
            }}
            className="px-3 py-2 rounded-xl border border-amber-300 font-bold text-xs text-amber-950 bg-amber-50 cursor-pointer outline-none"
          >
            {[2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map((yr) => (
              <option key={yr} value={yr}>
                Year {yr}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFestivalModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-800 bg-amber-100/80 border border-amber-300 hover:bg-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Configure Festival Dates"
          >
            <Settings className="w-3.5 h-3.5 text-amber-900" />
            <span>Festival Dates</span>
          </button>

          <button
            onClick={loadSlots}
            className="p-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
            title="Refresh slots"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-amber-700" />
            <span>Batch Generator</span>
          </button>
          <button
            onClick={() => {
              setAddForm({ ...addForm, date: selectedDate });
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Slot</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Date Filter Pills */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedDate('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              !selectedDate ? 'bg-amber-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            All Festival Dates
          </button>
          {availableDates.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedDate === d ? 'bg-amber-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {formatToIndianDate(d)}
            </button>
          ))}
        </div>

        <span className="text-xs text-stone-500 whitespace-nowrap hidden sm:inline">
          {slots.length} Slot(s) listed
        </span>
      </div>

      {/* Slots Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
          <Clock className="w-12 h-12 text-stone-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-stone-800 font-serif">No Aarti Slots for this Date</h4>
          <p className="text-xs text-stone-500 mt-1">Use the Batch Generator to quickly set up standard daily slots.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map((slot) => {
            const booked = slot.booked_count ?? slot.bookedCount ?? 0;
            const cap = slot.capacity || 11;
            const remaining = Math.max(0, slot.remaining_capacity ?? (cap - booked));
            const percent = Math.min(100, Math.round((booked / cap) * 100));

            return (
              <div
                key={slot.id}
                className="bg-white rounded-3xl p-5 border border-amber-200/80 hover:border-amber-400 shadow-sm transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div>
                    <h4 className="font-serif font-extrabold text-stone-900 text-sm">
                      {slot.name || 'Maha Sandhya Aarti'}
                    </h4>
                    <span className="font-mono text-xs font-bold text-amber-900 block mt-0.5">
                      {slot.start_time || '07:30 PM'} – {slot.end_time || '09:00 PM'}
                    </span>
                    <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                      Date: {formatToIndianDate(slot.date)}
                    </p>
                  </div>
                  <AartiBadge status={remaining <= 0 ? 'FULL' : slot.status || 'AVAILABLE'} size="sm" />
                </div>

                {/* Progress & Live Seats */}
                <div className="space-y-1.5 bg-stone-50/80 p-3 rounded-2xl border border-stone-200/60">
                  <div className="grid grid-cols-3 gap-1 text-center text-xs">
                    <div className="bg-white p-1.5 rounded-xl border border-stone-100">
                      <span className="text-[10px] text-stone-500 block">Capacity</span>
                      <span className="font-bold text-stone-900">{cap}</span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-stone-100">
                      <span className="text-[10px] text-stone-500 block">Occupied</span>
                      <span className="font-bold text-amber-700">{booked}</span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-stone-100">
                      <span className="text-[10px] text-stone-500 block">Remaining</span>
                      <span className={`font-bold ${remaining === 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {remaining}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-300 ${
                        percent >= 90 ? 'bg-rose-500' : percent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <span className="text-[11px] text-stone-400 font-mono">ID #{slot.id}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(slot)}
                      className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                      title="Edit slot details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteModalSlot(slot)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Single Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <h3 className="text-base font-bold font-serif text-stone-900">Add Single Aarti Slot</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Festival Date</label>
                <input
                  type="date"
                  required
                  value={addForm.date}
                  onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    value={addForm.start_time}
                    onChange={(e) => setAddForm({ ...addForm, start_time: e.target.value })}
                    placeholder="07:00 PM"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    value={addForm.end_time}
                    onChange={(e) => setAddForm({ ...addForm, end_time: e.target.value })}
                    placeholder="07:45 PM"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Sanctum Capacity (Devotees)</label>
                <input
                  type="number"
                  min={5}
                  max={250}
                  required
                  value={addForm.capacity}
                  onChange={(e) => setAddForm({ ...addForm, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-amber-900 hover:bg-stone-900"
                >
                  {isProcessing ? 'Adding...' : 'Create Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Generator Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold font-serif text-stone-900">Batch Generate Aarti Slots</h3>
                <p className="text-xs text-stone-500">Auto-create Maha Sandhya Aarti slot</p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            <form onSubmit={handleBatchSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Target Festival Date</label>
                <input
                  type="date"
                  required
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Base Capacity per Slot</label>
                <input
                  type="number"
                  min={10}
                  max={200}
                  required
                  value={batchCapacity}
                  onChange={(e) => setBatchCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none font-bold"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Evening Maha Aarti slots automatically receive 1.5x expanded capacity.
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <span className="font-bold">Generates daily Aarti slot:</span>
                <p>Maha Sandhya Aarti: 07:30 PM – 09:00 PM</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
                >
                  {isProcessing ? 'Generating...' : 'Generate 7 Slots'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {editModalSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <h3 className="text-base font-bold font-serif text-stone-900">
                Edit Aarti Slot #{editModalSlot.id}
              </h3>
              <button onClick={() => setEditModalSlot(null)} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    value={editForm.start_time}
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    value={editForm.end_time}
                    onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  required
                  value={editForm.capacity}
                  onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Status Override</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none bg-white"
                >
                  <option value="AVAILABLE">AVAILABLE (Open for booking)</option>
                  <option value="FULL">FULL (Mark manually as full)</option>
                  <option value="CLOSED">CLOSED (Suspended for seva / VIP)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditModalSlot(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-amber-900 hover:bg-stone-900"
                >
                  {isProcessing ? 'Saving...' : 'Save Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Festival Dates Configuration Modal */}
      {showFestivalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold font-serif text-stone-900">
                  Festival Calendar Settings ({selectedYear})
                </h3>
                <p className="text-xs text-stone-500">
                  Configure Ganesh Utsav dates for Year {selectedYear}
                </p>
              </div>
              <button onClick={() => setShowFestivalModal(false)} className="text-stone-400 hover:text-stone-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleFestivalSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Festival Name</label>
                <input
                  type="text"
                  required
                  value={festivalForm.festivalName}
                  onChange={(e) => setFestivalForm({ ...festivalForm, festivalName: e.target.value })}
                  placeholder={`Shri Ganesh Utsav ${selectedYear}`}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Ganesh Chaturthi Date (Day 1)
                </label>
                <input
                  type="date"
                  required
                  value={festivalForm.ganeshChaturthiDate}
                  onChange={(e) =>
                    setFestivalForm({
                      ...festivalForm,
                      ganeshChaturthiDate: e.target.value,
                      festivalStartDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Festival Start Date</label>
                  <input
                    type="date"
                    required
                    value={festivalForm.festivalStartDate}
                    onChange={(e) => setFestivalForm({ ...festivalForm, festivalStartDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Festival End Date</label>
                  <input
                    type="date"
                    required
                    value={festivalForm.festivalEndDate}
                    onChange={(e) => setFestivalForm({ ...festivalForm, festivalEndDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                Saving updates <strong>festivalSettings/{selectedYear}</strong> in Firestore and automatically ensures 11-seat Aarti slots exist for all dates in the range.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowFestivalModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 cursor-pointer"
                >
                  {isProcessing ? 'Saving...' : 'Save & Sync Slots'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Slot Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteModalSlot)}
        title="Delete Aarti Slot?"
        message={`Are you sure you want to delete Aarti slot ${deleteModalSlot?.start_time} - ${deleteModalSlot?.end_time} on ${deleteModalSlot?.date}? Any active bookings on this slot will be removed.`}
        confirmLabel="Confirm Delete"
        variant="danger"
        isLoading={isProcessing}
        onConfirm={handleDeleteSubmit}
        onCancel={() => setDeleteModalSlot(null)}
      />
    </div>
  );
};
