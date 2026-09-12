import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { Sparkles, Menu, X, Shield, User as UserIcon, LogOut, Calendar, HeartHandshake } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, isAdmin, logout } = useAuth();
  const { connected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    handleNav('home');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#fffdfa]/95 backdrop-blur-md border-b border-amber-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div
            onClick={() => handleNav('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-md border border-amber-200/80 group-hover:scale-105 transition-transform flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Navyuvak Ganesh Mitra Mandal Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold font-serif tracking-tight text-amber-950">
                  Ganesh Aarti Booking
                </h1>
                <span className="hidden sm:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Utsav 2026
                </span>
              </div>
              <p className="text-xs text-orange-800/80 font-medium">
                Navyuvak Ganesh Mitra Mandal
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-stone-700">
            <button
              onClick={() => handleNav('home')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                currentView === 'home' ? 'text-amber-900 bg-amber-100/70 font-semibold' : 'hover:text-stone-950 hover:bg-stone-100/60'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNav('about')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                currentView === 'about' ? 'text-amber-900 bg-amber-100/70 font-semibold' : 'hover:text-stone-950 hover:bg-stone-100/60'
              }`}
            >
              About Utsav
            </button>
            <button
              onClick={() => handleNav('timings')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                currentView === 'timings' ? 'text-amber-900 bg-amber-100/70 font-semibold' : 'hover:text-stone-950 hover:bg-stone-100/60'
              }`}
            >
              Aarti Timings
            </button>
            <button
              onClick={() => handleNav('book')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                currentView === 'book' ? 'text-amber-900 bg-amber-100/70 font-semibold' : 'hover:text-stone-950 hover:bg-stone-100/60'
              }`}
            >
              Book Aarti
            </button>
            <button
              onClick={() => handleNav('my-bookings')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                currentView === 'my-bookings' ? 'text-amber-900 bg-amber-100/70 font-semibold' : 'hover:text-stone-950 hover:bg-stone-100/60'
              }`}
            >
              Check My Booking
            </button>
            <button
              onClick={() => handleNav('rules')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                currentView === 'rules' ? 'text-amber-900 bg-amber-100/70 font-semibold' : 'hover:text-stone-950 hover:bg-stone-100/60'
              }`}
            >
              Rules & Seva
            </button>
            <button
              onClick={() => handleNav('contact')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                currentView === 'contact' ? 'text-amber-900 bg-amber-100/70 font-semibold' : 'hover:text-stone-950 hover:bg-stone-100/60'
              }`}
            >
              Contact
            </button>
            {!user && (
              <>
                <button
                  onClick={() => handleNav('register')}
                  className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    currentView === 'register' ? 'text-amber-900 bg-amber-100/70 font-semibold' : 'hover:text-stone-950 hover:bg-stone-100/60'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNav('login')}
                  className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    currentView === 'login' ? 'text-amber-900 bg-amber-100/70 font-semibold' : 'hover:text-stone-950 hover:bg-stone-100/60'
                  }`}
                >
                  Log In
                </button>
              </>
            )}
          </nav>

          {/* Right Action Buttons / Admin Auth State */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Live real-time indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 border border-stone-200 text-stone-600">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px]">{connected ? 'Live Sync' : 'Connecting'}</span>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <button
                    onClick={() => handleNav('admin')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      currentView === 'admin'
                        ? 'bg-amber-900 text-white'
                        : 'bg-amber-950 text-amber-200 hover:bg-black'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Admin Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleNav('profile')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-amber-200/60 cursor-pointer ${
                        currentView === 'profile'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-white hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5 text-amber-700" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => handleNav('book')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>Book Aarti</span>
                    </button>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-stone-600 hover:text-rose-700 hover:bg-rose-50 transition-colors border border-amber-200/60 cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav('book')}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md shadow-orange-700/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Book Aarti Slot</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-amber-200 bg-[#fffdfa] px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-3 duration-200 shadow-lg">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-amber-100">
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-amber-200 shadow-2xs flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Navyuvak Ganesh Mitra Mandal Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950 leading-tight">Ganesh Aarti Booking</p>
              <p className="text-[10px] text-orange-800/80">Navyuvak Ganesh Mitra Mandal</p>
            </div>
          </div>

          {user && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mb-3">
              <p className="text-xs text-amber-800 font-medium">Jai Shree Ganesh,</p>
              <p className="text-sm font-bold text-amber-950">{user.full_name}</p>
              <p className="text-xs text-stone-500">{user.email}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 text-sm">
            <button
              onClick={() => handleNav('home')}
              className="px-3 py-2 text-left rounded-lg text-stone-800 hover:bg-amber-50 font-medium"
            >
              Home
            </button>
            <button
              onClick={() => handleNav('about')}
              className="px-3 py-2 text-left rounded-lg text-stone-800 hover:bg-amber-50 font-medium"
            >
              About Utsav
            </button>
            <button
              onClick={() => handleNav('timings')}
              className="px-3 py-2 text-left rounded-lg text-stone-800 hover:bg-amber-50 font-medium"
            >
              Aarti Timings
            </button>
            <button
              onClick={() => handleNav('book')}
              className="px-3 py-2 text-left rounded-lg text-stone-800 hover:bg-amber-50 font-medium"
            >
              Book Aarti
            </button>
            <button
              onClick={() => handleNav('my-bookings')}
              className="px-3 py-2 text-left rounded-lg text-stone-800 hover:bg-amber-50 font-medium"
            >
              Check My Booking
            </button>
            <button
              onClick={() => handleNav('rules')}
              className="px-3 py-2 text-left rounded-lg text-stone-800 hover:bg-amber-50 font-medium"
            >
              Rules & Guidelines
            </button>
            <button
              onClick={() => handleNav('contact')}
              className="px-3 py-2 text-left rounded-lg text-stone-800 hover:bg-amber-50 font-medium"
            >
              Contact
            </button>
            {!user && (
              <>
                <button
                  onClick={() => handleNav('register')}
                  className="px-3 py-2 text-left rounded-lg text-stone-800 hover:bg-amber-50 font-medium"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNav('login')}
                  className="px-3 py-2 text-left rounded-lg text-stone-800 hover:bg-amber-50 font-medium"
                >
                  Log In
                </button>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-amber-200 space-y-2">
            {isAdmin && (
              <button
                onClick={() => handleNav('admin')}
                className="w-full py-2.5 px-4 text-center rounded-xl bg-amber-950 text-amber-200 font-bold text-sm flex items-center justify-center gap-2 shadow-xs"
              >
                <Shield className="w-4 h-4" />
                Admin Dashboard
              </button>
            )}

            {user && !isAdmin && (
              <button
                onClick={() => handleNav('profile')}
                className="w-full py-2.5 px-4 text-center rounded-xl border border-amber-200 bg-white text-stone-800 font-semibold text-sm flex items-center justify-center gap-2 shadow-xs"
              >
                <UserIcon className="w-4 h-4 text-amber-700" />
                My Profile
              </button>
            )}

            <button
              onClick={() => handleNav('book')}
              className="w-full py-2.5 px-4 text-center rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold text-sm shadow-sm cursor-pointer"
            >
              Book Aarti Slot
            </button>

            {user && (
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-4 text-center rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-sm flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
