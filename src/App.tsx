import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SocketProvider, useSocket } from './context/SocketContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { ToastContainer } from './components/Toast.tsx';

// Printable layouts
import { PrintableReceipt, PrintablePass } from './components/PrintPage.tsx';

// Pages
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.tsx';
import { BookAartiPage } from './pages/BookAartiPage.tsx';
import { MyBookingsPage } from './pages/MyBookingsPage.tsx';
import { UserDashboardPage } from './pages/UserDashboardPage.tsx';
import { UserProfilePage } from './pages/UserProfilePage.tsx';
import { AdminLayout } from './pages/admin/AdminLayout.tsx';

function MainApp() {
  const { user, isAdmin, loading } = useAuth();
  const { toasts, removeToast } = useSocket();

  // Route state initialized from window.location.pathname (with legacy hash sanitization)
  const getInitialView = () => {
    // If URL contains legacy or incoming hash like #/login, sanitize it immediately
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashContent = window.location.hash.replace(/^#\/?/, '').trim();
      const [hashRoute] = hashContent.split('?');
      if (hashRoute) {
        window.history.replaceState(null, '', `/${hashRoute}`);
        return hashRoute;
      }
      window.history.replaceState(null, '', window.location.pathname || '/');
    }

    const path = window.location.pathname.replace(/^\//, '').trim();
    if (!path) return 'home';
    const [view] = path.split('?');
    return view || 'home';
  };

  const [currentView, setCurrentView] = useState<string>(getInitialView);
  const [selectedSlotData, setSelectedSlotData] = useState<any>(null);
  const [activePrintJob, setActivePrintJob] = useState<{
    type: 'receipt' | 'pass';
    data: any;
    mobile?: string;
  } | null>(null);

  // Setup same-origin print listener
  useEffect(() => {
    const handleTriggerPrint = (e: Event) => {
      const customEvent = e as CustomEvent;
      const job = customEvent.detail;
      if (job) {
        setActivePrintJob(job);
        document.body.classList.add('print-active');
        
        // Give layout 150ms to mount and construct the printable view
        setTimeout(() => {
          try {
            window.print();
          } catch (printErr) {
            console.error("Direct print trigger failed:", printErr);
          }
          
          // Remove print view to return back to normal screen state
          setTimeout(() => {
            setActivePrintJob(null);
            document.body.classList.remove('print-active');
          }, 500);
        }, 150);
      }
    };

    window.addEventListener('mandal-trigger-print', handleTriggerPrint);
    return () => {
      window.removeEventListener('mandal-trigger-print', handleTriggerPrint);
    };
  }, []);

  // Sync popstate & hashchange listeners to prevent fragment-induced auth errors
  useEffect(() => {
    const handleUrlChange = () => {
      // Always strip hash if one gets introduced
      if (window.location.hash) {
        const hashContent = window.location.hash.replace(/^#\/?/, '').trim();
        const [hashRoute] = hashContent.split('?');
        if (hashRoute) {
          window.history.replaceState(null, '', `/${hashRoute}`);
          setCurrentView(hashRoute);
          return;
        }
        window.history.replaceState(null, '', window.location.pathname || '/');
      }

      const path = window.location.pathname.replace(/^\//, '').trim();
      const [view] = path.split('?');
      if (view) {
        setCurrentView(view);
      } else {
        setCurrentView('home');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const navigateTo = (view: string, data?: any) => {
    if (data) {
      setSelectedSlotData(data);
    }
    setCurrentView(view);
    window.history.pushState(null, '', `/${view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Session check loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfbf7]">
        <div className="text-center space-y-3">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-12 h-12 mx-auto animate-bounce object-contain"
            referrerPolicy="no-referrer"
          />
          <p className="text-sm font-semibold text-stone-700 font-serif">Connecting with Devotee Session...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated user redirect guard
  const isPublicAuthPage =
    currentView === 'login' ||
    currentView === 'register' ||
    currentView === 'forgot-password';

  const isBypassPage =
    isPublicAuthPage ||
    currentView === 'home' ||
    currentView === 'about' ||
    currentView === 'timings' ||
    currentView === 'rules' ||
    currentView === 'contact' ||
    currentView === 'book' ||
    currentView === 'my-bookings';

  if (!user && !isBypassPage) {
    // Force redirect to Home Page instead of Login / Authentication portal
    setCurrentView('home');
    window.history.replaceState(null, '', '/');
  }

  // 3. Authenticated user redirect guard (prevent login/signup screen access when logged in)
  if (user && isPublicAuthPage) {
    setCurrentView('home');
    window.history.replaceState(null, '', '/');
  }

  // Guard for protected admin views including Chanda / Donation Management
  const isAdminView =
    currentView === 'admin' ||
    currentView === 'chanda' ||
    currentView === 'donations' ||
    currentView === 'donation' ||
    currentView === 'chanda-management';

  const initialAdminTab =
    currentView === 'chanda' ||
    currentView === 'donations' ||
    currentView === 'donation' ||
    currentView === 'chanda-management'
      ? 'chanda'
      : 'dashboard';

  if (isAdminView) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f6f0]">
          <div className="text-center space-y-3">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-12 h-12 mx-auto animate-bounce object-contain"
              referrerPolicy="no-referrer"
            />
            <p className="text-sm font-semibold text-stone-700">Checking Mandap Security Credentials...</p>
          </div>
        </div>
      );
    }

    if (!user || !isAdmin) {
      return (
        <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
          <Navbar currentView={currentView} onNavigate={navigateTo} />
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-amber-200 text-center shadow-lg space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 mx-auto flex items-center justify-center font-bold text-2xl">
                🛡️
              </div>
              <h2 className="text-xl font-bold font-serif text-stone-900">
                Access Denied — Protected Mandal Treasury Area
              </h2>
              <p className="text-xs text-stone-600">
                Only the authorized administrator account (navyuvakganeshmitramandal14@gmail.com) can access Chanda / Donation Management and the Admin Dashboard.
              </p>
              <div className="pt-2 space-y-2">
                {!user && (
                  <button
                    onClick={() => navigateTo('login')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-amber-900 hover:bg-stone-900 transition-colors cursor-pointer"
                  >
                    Sign In with Admin Account
                  </button>
                )}
                <button
                  onClick={() => navigateTo('home')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
          <Footer onNavigate={navigateTo} />
        </div>
      );
    }

    return (
      <>
        <AdminLayout initialTab={initialAdminTab} onNavigateHome={() => navigateTo('home')} />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }


  // Render Public & Devotee Pages
  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col text-stone-900 selection:bg-amber-200 selection:text-amber-950">
      <Navbar currentView={currentView} onNavigate={navigateTo} />

      <main className="flex-1">
        {(currentView === 'home' || currentView === 'about' || currentView === 'timings' || currentView === 'rules' || currentView === 'contact') && (
          <HomePage onNavigate={navigateTo} scrollToSection={currentView} />
        )}
        {currentView === 'book' && <BookAartiPage onNavigate={navigateTo} preselectedSlot={selectedSlotData} />}
        {currentView === 'my-bookings' && <MyBookingsPage onNavigate={navigateTo} />}
        {currentView === 'dashboard' && <UserDashboardPage onNavigate={navigateTo} />}
        {currentView === 'profile' && <UserProfilePage onNavigate={navigateTo} />}
        {currentView === 'login' && <LoginPage onNavigate={navigateTo} />}
        {currentView === 'register' && <RegisterPage onNavigate={navigateTo} />}
        {currentView === 'forgot-password' && <ForgotPasswordPage onNavigate={navigateTo} />}
      </main>

      <Footer onNavigate={navigateTo} />
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {activePrintJob && createPortal(
        <div className="hidden print:block fixed inset-0 z-[999999] bg-white print-page-container p-4 overflow-auto">
          {activePrintJob.type === 'receipt' && (
            <PrintableReceipt receipt={activePrintJob.data} mobile={activePrintJob.mobile} />
          )}
          {activePrintJob.type === 'pass' && (
            <PrintablePass booking={activePrintJob.data} />
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ThemeProvider>
          <MainApp />
        </ThemeProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
