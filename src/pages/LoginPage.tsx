import React, { useState } from 'react';
import { useAuth, AUTHORIZED_ADMIN_EMAIL } from '../context/AuthContext.tsx';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ExternalLink } from 'lucide-react';
import { translateAuthError } from '../utils/authErrorTranslator.ts';

interface LoginPageProps {
  onNavigate: (view: string) => void;
  returnToView?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, returnToView }) => {
  const { login, loginWithGoogle, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleCopyDomain = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    try {
      await loginWithGoogle();
      onNavigate(returnToView || 'home');
    } catch (err: any) {
      console.error("Firebase Authentication Error:", err);
      console.error("Firebase Error Code:", err?.code);
      console.error("Firebase Error Message:", err?.message);
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      await login(normalizedEmail, password);
      onNavigate(returnToView || 'home');
    } catch (err: any) {
      console.error("Firebase Authentication Error:", err);
      console.error("Firebase Error Code:", err?.code);
      console.error("Firebase Error Message:", err?.message);
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#fdfbf7] to-[#fbf2e3]">
      <div className="max-w-md w-full space-y-6">
        {/* Mandap Logo Emblem */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-1.5 shadow-md border border-amber-200/80 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Navyuvak Ganesh Mitra Mandal Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900">
            Devotee Log In
          </h2>
          <p className="text-xs text-stone-600">
            Navyuvak Ganesh Mitra Mandal • Devotee Portal
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-xl space-y-5">
          {error && (
            <div className="p-3.5 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl leading-relaxed space-y-2">
              <div>{error}</div>
              {error.includes('auth/unauthorized-domain') && (
                <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between gap-2">
                  <span className="font-mono bg-rose-100 px-2 py-1 rounded text-[11px] select-all font-semibold break-all">
                    {typeof window !== 'undefined' ? window.location.hostname : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyDomain}
                    className="shrink-0 px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                  >
                    {copiedDomain ? 'Copied!' : 'Copy Domain'}
                  </button>
                </div>
              )}
              {(error.includes('popup-blocked') || error.includes('pop-up') || error.includes('Pop-up')) && (
                <div className="pt-2 border-t border-rose-200/60 space-y-2">
                  <p className="text-[11px] text-rose-700">
                    If pop-ups are blocked by your browser inside the preview frame, open the app directly in a new tab:
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open App in New Tab to Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. devotee@gmail.com"
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-red-700 hover:from-orange-700 hover:to-red-800 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Logging In...</span>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-500 font-semibold">Or Continue with Google</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-sm font-semibold transition-all shadow-2xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
