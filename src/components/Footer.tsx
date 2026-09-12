import React from 'react';
import { Sparkles, MapPin, Phone, Mail, Clock, ShieldCheck, Heart } from 'lucide-react';
import { getCelebratingYear } from '../utils/celebrationYear';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-stone-950 text-stone-300 border-t-4 border-amber-500/80 pt-14 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1: Mandap Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center border border-amber-400/40 shadow-sm">
                <img
                  src="/logo.png"
                  alt="Navyuvak Ganesh Mitra Mandal Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-amber-300">Shri Ganesh Utsav</h3>
                <p className="text-xs text-stone-400">Navyuvak Ganesh Mitra Mandal</p>
              </div>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Celebrating our {getCelebratingYear()} year of divine devotion, socio-cultural seva, and grandeur. Reserve your Aarti slot online to experience hassle-free darshan and participate in sacred rituals.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-[11px] text-amber-200">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Utsav Dates: 14 Sept – 25 Sept 2026
              </span>
            </div>
          </div>

          {/* Col 2: Daily Aarti Schedule */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Daily Aarti Timing
            </h4>
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-amber-200">Maha Sandhya Aarti</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">Daily</span>
              </div>
              <p className="text-amber-300 font-mono text-sm font-bold mt-1">07:30 PM – 09:00 PM</p>
              <p className="text-[11px] text-stone-400 mt-1.5 leading-tight">
                Grand evening prayer ritual & darshan for all devotees.
              </p>
            </div>
          </div>

          {/* Col 3: Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Quick Links & Seva
            </h4>
            <ul className="text-xs space-y-2 text-stone-400">
              <li>
                <button
                  onClick={() => onNavigate('book')}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  → Book Aarti Slot Online
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('my-bookings')}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  → Check My Aarti Booking
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('rules')}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  → Mandap Guidelines & Code of Conduct
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  → History of Navyuvak Mandal
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('admin')}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1.5 text-stone-500 hover:text-stone-300 cursor-pointer"
                >
                  → Administrator Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Mandap Location & Contact */}
          <div id="footer-mandap-location" className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              Mandap Location
            </h4>
            <p className="text-xs text-stone-300 leading-relaxed font-medium">
              Navyuvak Ganesh Utsav Pandal, Jannod, Rampura, Madhya Pradesh – 458118
            </p>
            <div className="text-xs space-y-2 pt-1 text-stone-300">
              <div className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-stone-400 block text-[11px]">Helpline Numbers:</span>
                  <div className="flex flex-wrap items-center gap-x-1.5">
                    <a
                      href="tel:+917724095705"
                      className="text-amber-200 hover:text-amber-100 font-semibold underline underline-offset-2 transition-colors"
                    >
                      +91 7724095705
                    </a>
                    <span className="text-stone-500">/</span>
                    <a
                      href="tel:+916262982251"
                      className="text-amber-200 hover:text-amber-100 font-semibold underline underline-offset-2 transition-colors"
                    >
                      +91 6262982251
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-stone-400 block text-[11px]">Email Address:</span>
                  <a
                    href="mailto:navyuvakganeshmitramandal14@gmail.com"
                    className="text-amber-200 hover:text-amber-100 font-semibold underline underline-offset-2 break-all transition-colors"
                  >
                    navyuvakganeshmitramandal14@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom divider */}
        <div className="mt-10 pt-6 border-t border-stone-800 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Navyuvak Ganesh Mitra Mandal. All Rights Reserved.</p>
          <p className="flex items-center gap-1">
            <span>May Lord Ganesha bestow joy, peace & prosperity upon all devotees</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
          </p>
        </div>
      </div>
    </footer>
  );
};
