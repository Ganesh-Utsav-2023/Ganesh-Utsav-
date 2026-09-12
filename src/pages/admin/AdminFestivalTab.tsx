import React, { useState, useEffect } from 'react';
import {
  FestivalSettings,
  subscribeToFestivalSettings,
  updateFestivalSettings,
  getOrInitFestivalSettings,
  getActiveFestivalYear,
  setActiveFestivalYear
} from '../../lib/festivalService.ts';
import { getCalculatedFestivalPeriod, getDatesListBetween } from '../../utils/festivalCalculator.ts';
import { getCelebratingYear, getOrdinalSuffix } from '../../utils/celebrationYear.ts';
import {
  Calendar,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Flame,
  AlertCircle
} from 'lucide-react';

export const AdminFestivalTab: React.FC = () => {
  const currentCalYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentCalYear >= 2026 ? currentCalYear : 2026);
  const [settings, setSettings] = useState<FestivalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    festivalName: '',
    ganeshChaturthiDate: '',
    festivalStartDate: '',
    festivalEndDate: '',
  });

  // Load active festival year on mount
  useEffect(() => {
    getActiveFestivalYear().then((yr) => {
      if (yr) setSelectedYear(yr);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToFestivalSettings(selectedYear, (updated) => {
      setSettings(updated);
      setFormData({
        festivalName: updated.festivalName,
        ganeshChaturthiDate: updated.ganeshChaturthiDate,
        festivalStartDate: updated.festivalStartDate,
        festivalEndDate: updated.festivalEndDate,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedYear]);

  const handleResetToCalculated = () => {
    const calc = getCalculatedFestivalPeriod(selectedYear);
    setFormData({
      festivalName: calc.festivalName,
      ganeshChaturthiDate: calc.ganeshChaturthiDate,
      festivalStartDate: calc.festivalStartDate,
      festivalEndDate: calc.festivalEndDate,
    });
    setSuccessMsg('Reset to calculated Hindu calendar astronomical dates. Click Save to apply.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await updateFestivalSettings(selectedYear, {
        festivalName: formData.festivalName.trim(),
        ganeshChaturthiDate: formData.ganeshChaturthiDate,
        festivalStartDate: formData.festivalStartDate,
        festivalEndDate: formData.festivalEndDate,
      });
      setSuccessMsg(`Festival settings for ${selectedYear} saved & Aarti dates synchronized successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Error updating festival settings:', err);
      setErrorMsg('Failed to update festival settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const datesList = getDatesListBetween(formData.festivalStartDate, formData.festivalEndDate);
  const celebratingYearStr = getCelebratingYear(selectedYear);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-stone-900 text-white p-6 rounded-3xl shadow-sm border border-amber-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Celebrating our {celebratingYearStr} Year (Est. 2023)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-amber-100 flex items-center gap-2.5">
              <span>📅 Festival Settings & Calendar</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              Configure annual festival dates, sacred Ganesh Chaturthi mahurat, and synchronize daily Aarti slots (11 capacity per day).
            </p>
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-2 bg-stone-900/90 p-2 rounded-2xl border border-stone-700">
            <span className="text-xs font-semibold text-stone-300 pl-2">Select Year:</span>
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
              className="bg-amber-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl focus:outline-none cursor-pointer"
            >
              {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>
                  {y} ({getCelebratingYear(y)} Year)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Festival Title / Heading
              </label>
              <input
                type="text"
                required
                value={formData.festivalName}
                onChange={(e) => setFormData({ ...formData, festivalName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Ganesh Chaturthi Date *
              </label>
              <input
                type="date"
                required
                value={formData.ganeshChaturthiDate}
                onChange={(e) => setFormData({ ...formData, ganeshChaturthiDate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Aarti Capacity per Day
              </label>
              <div className="px-3.5 py-2.5 text-xs bg-amber-50 border border-amber-200 rounded-xl text-amber-950 font-bold flex items-center justify-between">
                <span>11 Devotees / Day (Sacred Mandap Capacity)</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-extrabold">
                  ENFORCED
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Festival Period Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.festivalStartDate}
                onChange={(e) => setFormData({ ...formData, festivalStartDate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Festival Period End Date *
              </label>
              <input
                type="date"
                required
                value={formData.festivalEndDate}
                onChange={(e) => setFormData({ ...formData, festivalEndDate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Active Period Days Chips */}
          <div className="p-4 bg-[#fcfaf5] rounded-2xl border border-amber-200/80">
            <h4 className="text-xs font-bold text-stone-900 mb-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600" />
              <span>Active 10-Day Festival Dates ({datesList.length} Days Generated):</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {datesList.map((d, i) => (
                <span
                  key={d}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-stone-800 text-[11px] font-mono font-bold shadow-2xs"
                >
                  Day {i + 1}: {d}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={handleResetToCalculated}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Hindu Calendar Defaults</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-900 hover:bg-stone-900 transition-colors cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving & Syncing Slots...' : 'Save & Synchronize Slots'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
