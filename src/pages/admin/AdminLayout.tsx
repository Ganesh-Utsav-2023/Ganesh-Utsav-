import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { Booking } from '../../types/index.ts';
import { BookingPassModal } from '../../components/BookingPassModal.tsx';
import { AdminDashboardTab } from './AdminDashboardTab.tsx';
import { AdminBookingsTab } from './AdminBookingsTab.tsx';
import { AdminCreateBookingTab } from './AdminCreateBookingTab.tsx';
import { AdminSlotsTab } from './AdminSlotsTab.tsx';
import { AdminUsersTab } from './AdminUsersTab.tsx';
import { AdminChandaTab } from './AdminChandaTab.tsx';
import { AdminExpensesTab } from './AdminExpensesTab.tsx';
import { AdminFestivalTab } from './AdminFestivalTab.tsx';
import { AdminSettingsTab } from './AdminSettingsTab.tsx';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  Users,
  Coins,
  Wallet,
  Calendar,
  Settings,
  Globe,
  LogOut,
  Shield,
  Menu,
  X,
} from 'lucide-react';

interface AdminLayoutProps {
  onNavigateHome: () => void;
  initialTab?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onNavigateHome, initialTab }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [activeSection, setActiveSection] = useState<string>(initialTab || 'overview');
  const [tabParams, setTabParams] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passModalBooking, setPassModalBooking] = useState<Booking | null>(null);
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);

  const navItems = [
    { id: 'overview', targetId: 'admin-overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', targetId: 'admin-bookings', label: 'Aarti Bookings', icon: CalendarCheck },
    { id: 'slots', targetId: 'admin-slots', label: 'Aarti Calendar', icon: Clock },
    { id: 'users', targetId: 'admin-users', label: 'Registered Devotees', icon: Users },
    { id: 'chanda', targetId: 'admin-chanda', label: '💰 Chanda / Donation Management', icon: Coins },
    { id: 'expenses', targetId: 'admin-expenses', label: '📊 Spending / Expenses', icon: Wallet },
    { id: 'festival', targetId: 'admin-festival', label: 'Festival Settings', icon: Calendar },
    { id: 'settings', targetId: 'admin-settings', label: 'Settings', icon: Settings },
  ];

  const scrollToSection = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNavigateTab = (tab: string, params?: any) => {
    if (tab === 'create-booking') {
      setShowCreateBookingModal(true);
      setSidebarOpen(false);
      return;
    }

    setTabParams(params || null);
    setSidebarOpen(false);

    const targetMap: Record<string, { id: string; targetId: string }> = {
      dashboard: { id: 'overview', targetId: 'admin-overview' },
      overview: { id: 'overview', targetId: 'admin-overview' },
      bookings: { id: 'bookings', targetId: 'admin-bookings' },
      slots: { id: 'slots', targetId: 'admin-slots' },
      calendar: { id: 'slots', targetId: 'admin-slots' },
      users: { id: 'users', targetId: 'admin-users' },
      devotees: { id: 'users', targetId: 'admin-users' },
      chanda: { id: 'chanda', targetId: 'admin-chanda' },
      donations: { id: 'chanda', targetId: 'admin-chanda' },
      expenses: { id: 'expenses', targetId: 'admin-expenses' },
      spending: { id: 'expenses', targetId: 'admin-expenses' },
      festival: { id: 'festival', targetId: 'admin-festival' },
      settings: { id: 'settings', targetId: 'admin-settings' },
    };

    const target = targetMap[tab] || { id: tab, targetId: `admin-${tab}` };
    setActiveSection(target.id);
    scrollToSection(target.targetId);
  };

  // Scroll to initial section if passed via props
  useEffect(() => {
    if (initialTab && initialTab !== 'dashboard' && initialTab !== 'overview') {
      const timer = setTimeout(() => {
        handleNavigateTab(initialTab);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialTab]);

  // Sync active nav item based on scroll position
  useEffect(() => {
    const sectionElements = navItems.map((item) => ({
      id: item.id,
      targetId: item.targetId,
    }));

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionElements[i].targetId);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sectionElements[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-stone-950 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center font-bold">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-sm font-bold font-serif text-amber-300">Admin Portal</h1>
            <p className="text-[10px] text-stone-400">Ganesh Utsav (Since 2023)</p>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-stone-300 hover:text-white cursor-pointer"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-stone-950 text-stone-300 flex flex-col justify-between p-5 border-r border-stone-800 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Brand header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-800">
            <div className="w-10 h-10 rounded-xl bg-white p-1 shadow flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold font-serif text-white">Admin Portal</h2>
                <Shield className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-[11px] text-stone-400">Shri Ganesh Utsav</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    scrollToSection(item.targetId);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm font-bold'
                      : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                  <span className="truncate text-left">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom actions */}
        <div className="pt-4 border-t border-stone-800 space-y-2 text-xs">
          {/* Live Sync Status */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-900 text-stone-400">
            <span className="text-[11px]">Server Link</span>
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {connected ? 'Live Sync' : 'Reconnecting'}
            </span>
          </div>

          {/* Return to Public Website */}
          <button
            onClick={onNavigateHome}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-900 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4 text-stone-400" />
            <span>Return to Website</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Renders all 8 dashboard sections simultaneously */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-16">
          {/* Section 1: Overview */}
          <section id="admin-overview" className="scroll-mt-6">
            <AdminDashboardTab
              onNavigateTab={handleNavigateTab}
              onViewPass={(b) => setPassModalBooking(b)}
            />
          </section>

          <hr className="border-stone-200" />

          {/* Section 2: Aarti Bookings */}
          <section id="admin-bookings" className="scroll-mt-6">
            <AdminBookingsTab
              initialFilter={tabParams}
              onViewPass={(b) => setPassModalBooking(b)}
              onNavigateTab={handleNavigateTab}
            />
          </section>

          <hr className="border-stone-200" />

          {/* Section 3: Aarti Calendar */}
          <section id="admin-slots" className="scroll-mt-6">
            <AdminSlotsTab />
          </section>

          <hr className="border-stone-200" />

          {/* Section 4: Registered Devotees */}
          <section id="admin-users" className="scroll-mt-6">
            <AdminUsersTab />
          </section>

          <hr className="border-stone-200" />

          {/* Section 5: 💰 Chanda / Donation Management */}
          <section id="admin-chanda" className="scroll-mt-6">
            <AdminChandaTab />
          </section>

          <hr className="border-stone-200" />

          {/* Section 6: 📊 Spending / Expenses */}
          <section id="admin-expenses" className="scroll-mt-6">
            <AdminExpensesTab />
          </section>

          <hr className="border-stone-200" />

          {/* Section 7: Festival Settings */}
          <section id="admin-festival" className="scroll-mt-6">
            <AdminFestivalTab />
          </section>

          <hr className="border-stone-200" />

          {/* Section 8: Settings */}
          <section id="admin-settings" className="scroll-mt-6">
            <AdminSettingsTab />
          </section>
        </div>
      </main>

      {/* New Booking Modal */}
      {showCreateBookingModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f8f6f0] rounded-3xl max-w-4xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-amber-200/50 relative">
            <button
              onClick={() => setShowCreateBookingModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-700 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <AdminCreateBookingTab
              onSuccess={() => {
                setShowCreateBookingModal(false);
                handleNavigateTab('bookings');
              }}
            />
          </div>
        </div>
      )}

      {/* Sacred Pass Modal accessible anywhere in Admin */}
      <BookingPassModal
        booking={passModalBooking}
        isOpen={Boolean(passModalBooking)}
        onClose={() => setPassModalBooking(null)}
      />
    </div>
  );
};
