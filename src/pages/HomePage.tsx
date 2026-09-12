import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { AartiSlot } from '../types/index.ts';
import { AartiBadge } from '../components/AartiBadge.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { subscribeToAartiSlots } from '../lib/slotsService.ts';
import { subscribeToFestivalSettings, subscribeToActiveFestivalYear, FestivalSettings } from '../lib/festivalService.ts';
import { getDatesListBetween } from '../utils/festivalCalculator.ts';
import { formatToIndianDate } from '../utils/dateUtils.ts';
import { getCelebratingYear } from '../utils/celebrationYear.ts';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  ShieldCheck,
  Phone,
  MapPin,
  Flame,
  ArrowRight,
  Info,
  ChevronRight,
  Award,
  HeartHandshake
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: string, params?: any) => void;
  scrollToSection?: string;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, scrollToSection }) => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [festivalSettings, setFestivalSettings] = useState<FestivalSettings | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-14');
  const [slots, setSlots] = useState<AartiSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(true);

  useEffect(() => {
    if (scrollToSection) {
      if (scrollToSection === 'about') {
        const el = document.getElementById('about-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (scrollToSection === 'timings') {
        const el = document.getElementById('available-slots-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (scrollToSection === 'rules') {
        const el = document.getElementById('rules-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (scrollToSection === 'contact') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [scrollToSection]);

  // Subscribe to master active festival year
  useEffect(() => {
    const unsubscribe = subscribeToActiveFestivalYear((activeYear) => {
      setSelectedYear(activeYear);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to festival settings for selected year
  useEffect(() => {
    const unsubscribe = subscribeToFestivalSettings(selectedYear, (settings) => {
      setFestivalSettings(settings);
      if (settings && settings.festivalStartDate && settings.festivalEndDate) {
        const dates = getDatesListBetween(settings.festivalStartDate, settings.festivalEndDate);
        setAvailableDates(dates);
        if (dates.length > 0 && (!selectedDate || !dates.includes(selectedDate))) {
          setSelectedDate(dates[0]);
        }
      }
    });
    return () => unsubscribe();
  }, [selectedYear]);

  useEffect(() => {
    setLoadingSlots(true);
    const unsubscribe = subscribeToAartiSlots(
      selectedDate,
      (updatedSlots) => {
        setSlots(updatedSlots);
        setLoadingSlots(false);
      },
      (err) => {
        console.warn('Realtime slots error note:', err);
        setLoadingSlots(false);
      }
    );

    return () => unsubscribe();
  }, [selectedDate]);

  return (
    <div className="space-y-20 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#fdfbf7] via-[#fff8ed] to-[#fbf2e3] pt-12 pb-24 border-b border-amber-200/60">
        {/* Subtle decorative background circles / rays */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none opacity-40">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/10 blur-3xl" />
          <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-red-500/15 to-amber-300/10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Festival Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 text-xs sm:text-sm font-semibold shadow-xs">
              <span className="text-lg" role="img" aria-label="Blessing Diya">🪔</span>
              <span>Shri Ganesh Chaturthi Mahotsav {selectedYear}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
              <span className="text-orange-800">Online Devotee Portal</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-serif tracking-tight text-stone-900 leading-[1.15]">
              Ganesh Aarti <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-700 bg-clip-text text-transparent">Booking</span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-stone-700 leading-relaxed max-w-2xl mx-auto font-normal">
              Devotees can now reserve their sacred Aarti slot online for Shri Ganesh Utsav. Experience peaceful darshan, avoid long queues, and participate in divine seva with your family.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                id="hero-book-aarti-btn"
                onClick={() => onNavigate('book')}
                className="px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-red-700 hover:from-orange-700 hover:via-amber-700 hover:to-red-800 shadow-xl shadow-orange-700/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2.5"
              >
                <Sparkles className="w-5 h-5 text-amber-200" />
                <span>Book Aarti</span>
              </button>

              <button
                id="hero-my-bookings-btn"
                onClick={() => onNavigate('my-bookings')}
                className="px-7 py-4 rounded-2xl text-base font-semibold text-stone-800 bg-white/90 hover:bg-white border-2 border-amber-300/80 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Check My Booking</span>
                <ArrowRight className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            {/* Trust Metrics */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200/80 shadow-xs">
                <p className="text-2xl font-extrabold text-amber-900 font-serif">{getCelebratingYear()}</p>
                <p className="text-xs text-stone-600 mt-0.5">Year of Utsav</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200/80 shadow-xs">
                <p className="text-2xl font-extrabold text-amber-900 font-serif">Maha Aarti</p>
                <p className="text-xs text-stone-600 mt-0.5">Sacred Daily Ritual</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200/80 shadow-xs">
                <p className="text-2xl font-extrabold text-amber-900 font-serif">100%</p>
                <p className="text-xs text-stone-600 mt-0.5">Hassle-Free Seva</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200/80 shadow-xs">
                <p className="text-2xl font-extrabold text-amber-900 font-serif">Instant</p>
                <p className="text-xs text-stone-600 mt-0.5">Digital Pass</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW BOOKING WORKS */}
      <section id="how-it-works-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
            Simple 4-Step Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold font-serif text-stone-900 mt-3">
            How Aarti Booking Works
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            Reserve your sanctum entry pass within 2 minutes by following these simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#fffdfa] p-6 rounded-2xl border border-amber-200/80 shadow-sm relative">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-800 font-bold text-base flex items-center justify-center mb-4">
              1
            </div>
            <h3 className="text-base font-bold text-stone-900 font-serif">Create Account / Sign In</h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Register with your mobile number and name so your bookings are stored safely and accessible on any device.
            </p>
          </div>

          <div className="bg-[#fffdfa] p-6 rounded-2xl border border-amber-200/80 shadow-sm relative">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold text-base flex items-center justify-center mb-4">
              2
            </div>
            <h3 className="text-base font-bold text-stone-900 font-serif">Select Date & Time Slot</h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Pick your preferred festival date and choose an available Aarti slot for Maha Sandhya Aarti.
            </p>
          </div>

          <div className="bg-[#fffdfa] p-6 rounded-2xl border border-amber-200/80 shadow-sm relative">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-800 font-bold text-base flex items-center justify-center mb-4">
              3
            </div>
            <h3 className="text-base font-bold text-stone-900 font-serif">Enter Devotee Details</h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Provide family member count, address, and any special assistance (e.g. senior citizen wheelchair or sankalp note).
            </p>
          </div>

          <div className="bg-[#fffdfa] p-6 rounded-2xl border border-amber-200/80 shadow-sm relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-base flex items-center justify-center mb-4">
              4
            </div>
            <h3 className="text-base font-bold text-stone-900 font-serif">Receive Sacred Pass</h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Instantly generate your unique Booking ID (e.g. GA-2026-0001) with live status tracking and printable pass.
            </p>
          </div>
        </div>
      </section>

      {/* 3. LIVE AVAILABLE AARTI SLOTS PREVIEW */}
      <section id="available-slots-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#fffdfa] rounded-3xl p-6 sm:p-10 border border-amber-300 shadow-md">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
                Live Availability
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 mt-2">
                Available Aarti Slots
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Select a festival date to inspect real-time remaining seat capacity before booking.
              </p>
            </div>

            {/* Year Selector & Date Selection Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="appearance-none bg-stone-900 text-amber-100 font-bold text-xs px-3 py-2 rounded-xl border border-amber-300 shadow-xs cursor-pointer pr-7 outline-none"
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map((yr) => (
                    <option key={yr} value={yr}>
                      Utsav {yr}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-300 text-[10px]">
                  ▼
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                {availableDates.map((date) => {
                  const isSelected = selectedDate === date;
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-900 text-amber-100 shadow-sm'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {formatToIndianDate(date)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Slots Grid */}
          {loadingSlots ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <Calendar className="w-10 h-10 mx-auto text-stone-300 mb-2" />
              <p className="text-sm">No Aarti slots scheduled for this date yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot) => {
                const isFull = slot.status === 'FULL' || (slot.remaining_capacity !== undefined && slot.remaining_capacity <= 0);
                const isClosed = slot.status === 'CLOSED';
                const capacity = slot.capacity || 50;
                const booked = slot.booked_count || 0;
                const remaining = slot.remaining_capacity ?? (capacity - booked);
                const percent = Math.min(100, Math.round((booked / capacity) * 100));

                return (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isClosed
                        ? 'bg-stone-50 border-stone-200 opacity-60'
                        : isFull
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-white border-amber-200/90 hover:border-amber-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-base font-extrabold text-stone-900 font-mono flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-700" />
                          {slot.start_time} – {slot.end_time}
                        </span>
                        <p className="text-xs text-stone-500 mt-0.5">Date: {formatToIndianDate(slot.date)}</p>
                      </div>
                      <AartiBadge status={slot.status} size="sm" />
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-medium text-stone-600 mb-1">
                        <span>Capacity: {capacity}</span>
                        <span className={remaining <= 10 && remaining > 0 ? 'text-orange-700 font-bold' : ''}>
                          {remaining} seats left
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            percent >= 90
                              ? 'bg-rose-500'
                              : percent >= 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[11px] text-stone-500">
                        {isClosed ? 'Booking Closed' : isFull ? 'Capacity Reached' : 'Open for devotees'}
                      </span>
                      <button
                        disabled={isFull || isClosed}
                        onClick={() => onNavigate('book', { preselectedSlotId: slot.id, date: slot.date })}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          isFull || isClosed
                            ? 'text-stone-400 bg-stone-100 cursor-not-allowed'
                            : 'text-amber-900 bg-amber-100 hover:bg-amber-200'
                        }`}
                      >
                        {isFull ? 'Full' : 'Select & Book →'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. ABOUT GANESH UTSAV & AARTI TIMINGS */}
      <section id="about-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* About Text */}
          <div className="space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
              Tradition & Seva
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-stone-900 leading-tight">
              About Navyuvak Ganesh Mitra Mandal
            </h2>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
              Established in <strong className="font-bold text-amber-950">2023</strong>, Navyuvak Ganesh Mitra Mandal is a young and dedicated community organization committed to celebrating <strong className="font-bold text-amber-950">Shri Ganesh Chaturthi</strong> with devotion, traditional values, cultural spirit, and community seva.
            </p>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
              Since its establishment, the Mandal has been bringing devotees and families together to celebrate the arrival of <strong className="font-bold text-amber-950">Bappa</strong> with faith, unity, and joy. Every year, <strong className="font-bold text-amber-950">500+ devotees</strong> visit our mandap to seek the divine blessings of Lord Ganesha and participate in the festive celebrations.
            </p>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
              To make the darshan and Aarti experience more peaceful, organized, and convenient for devotees, our committee has introduced this <strong className="font-bold text-amber-950">modern digital Aarti booking system</strong>. Through online booking, devotees can reserve their Aarti slots in advance and enjoy a smoother experience without unnecessary waiting in long queues.
            </p>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
              Our aim is to beautifully combine <strong className="font-bold text-amber-950">tradition with technology</strong>, while continuing our commitment to devotion, community service, and the spirit of togetherness.
            </p>
            <p className="text-base sm:text-lg font-bold font-serif text-amber-800 pt-1">
              Ganpati Bappa Morya! 🙏
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200">
                <Flame className="w-5 h-5 text-orange-600 mb-1" />
                <h4 className="text-sm font-bold text-stone-900">Maha Aarti Seva</h4>
                <p className="text-xs text-stone-600 mt-0.5">Conducted daily with traditional dhol-tasha, conch shells, and mantras.</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <HeartHandshake className="w-5 h-5 text-amber-700 mb-1" />
                <h4 className="text-sm font-bold text-stone-900">Senior Seva Priority</h4>
                <p className="text-xs text-stone-600 mt-0.5">Dedicated wheelchair ramps and assistance for elders & differently abled.</p>
              </div>
            </div>
          </div>

          {/* Aarti Significance Card */}
          <div className="bg-stone-900 text-white p-8 rounded-3xl border-2 border-amber-500/50 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl" role="img" aria-label="Aarti">🪔</span>
              <div>
                <h3 className="text-xl font-bold font-serif text-amber-300">Daily Sacred Aarti Schedule</h3>
                <p className="text-xs text-stone-400">
                  Timing observed throughout the festival ({festivalSettings ? `${formatToIndianDate(festivalSettings.festivalStartDate)} – ${formatToIndianDate(festivalSettings.festivalEndDate)}` : `14-09-2026 – 25-09-2026`})
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-stone-800/90 border-2 border-amber-500/60 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 mb-1">
                    Grand Evening Ritual
                  </span>
                  <p className="font-bold text-amber-200 text-base">Maha Sandhya Aarti</p>
                  <p className="text-stone-300 text-xs mt-1 leading-relaxed">
                    Prime evening worship ceremony with deep lighting, sacred chants, and dhol-tasha darshan for all devotees.
                  </p>
                </div>
                <div className="sm:text-right shrink-0">
                  <span className="font-mono text-amber-300 font-extrabold text-base bg-amber-950/80 px-3 py-1.5 rounded-xl border border-amber-500/40 block">
                    07:30 PM – 09:00 PM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MANDAP GUIDELINES & IMPORTANT RULES */}
      <section id="rules-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50/60 rounded-3xl p-8 sm:p-10 border border-amber-200">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-3 py-1 rounded-full">
              Darshan Protocol
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 mt-2">
              Mandap Guidelines & Rules
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Please adhere to these guidelines for a disciplined and peaceful Aarti experience for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-stone-700">
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center font-bold">
                ⏰
              </div>
              <h4 className="font-bold text-stone-900 text-sm">Reporting Time</h4>
              <p className="leading-relaxed">
                Devotees must report to the VIP / Online Darshan Gate at least <strong>15 minutes prior</strong> to the scheduled Aarti time. Present your digital or printed pass.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                👔
              </div>
              <h4 className="font-bold text-stone-900 text-sm">Traditional Attire</h4>
              <p className="leading-relaxed">
                Devotees participating inside the Aarti circle are requested to wear traditional or modest Indian attire (Kurta/Pajama, Saree, Salwar).
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold">
                🍬
              </div>
              <h4 className="font-bold text-stone-900 text-sm">Prasad & Offerings</h4>
              <p className="leading-relaxed">
                Blessed Modak & Panchamrit Mahaprasad will be distributed to all attendees immediately after the Aarti ceremony concludes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PROMINENT BOTTOM CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-700 text-white rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <span className="text-3xl" role="img" aria-label="Ganesh">🌺</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-serif tracking-wide">
              Book Your Aarti
            </h2>
            <p className="text-amber-100 text-sm sm:text-base leading-relaxed">
              Slots fill up swiftly during evening Maha Aartis. Reserve your sanctum seva slot now to seek the blessings of Lord Ganesha with peace of mind.
            </p>
            <div className="pt-2">
              <button
                id="bottom-cta-book-btn"
                onClick={() => onNavigate('book')}
                className="px-8 py-4 rounded-2xl bg-white text-stone-900 hover:bg-amber-50 font-bold text-base shadow-xl transition-all transform hover:scale-105 cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-amber-600" />
                <span>Book Your Aarti Slot Now</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
