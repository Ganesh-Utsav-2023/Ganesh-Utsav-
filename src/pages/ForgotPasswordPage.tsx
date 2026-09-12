import React, { useState } from 'react';
import { api } from '../lib/api.ts';
import { Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordPageProps {
  onNavigate: (view: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message);
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Could not initiate reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.resetPassword({
        email,
        reset_token: resetToken,
        new_password: newPassword,
      });
      setMessage(res.message);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#fdfbf7] to-[#fbf2e3]">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <button
            onClick={() => onNavigate('login')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </button>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900">
            Reset Devotee Password
          </h2>
          <p className="text-xs text-stone-600">
            Enter your registered email to receive a password reset token
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-xl space-y-5">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. devotee@example.com"
                    className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Generating Code...' : 'Send Reset Instructions'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl">
                {message || 'Reset token generated. Enter your new password below.'}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Reset Verification Token
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste 6-digit or hex reset code"
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 font-serif">Password Reset Successfully!</h3>
              <p className="text-xs text-stone-600">
                You can now log in using your newly configured password.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-amber-900 hover:bg-stone-900 shadow-md transition-all cursor-pointer"
              >
                Proceed to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
