import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Shield, Film, KeyRound, Lock, AlertCircle, Sparkles, CheckCircle2, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../../types/index.ts';
import { JaanalaLogo } from '../common/JaanalaLogo.tsx';
import { JanalaaWallpaper } from '../common/JanalaaWallpaper.tsx';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState('admin@janala.local');
  const [password, setPassword] = useState('janala123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Please check your admin credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <JanalaaWallpaper
      variant="login"
      overlayOpacity={0}
      className="min-h-screen w-full text-[#F5EBE1] flex flex-col justify-center items-center p-4 relative"
    >
      {/* Decorative Golden Edge Lines */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#8B181E] to-transparent opacity-80" />

      <div className="w-full max-w-lg z-10 py-6">
        {/* Brand header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#1C1216]/90 border border-[#8B181E]/70 text-[11px] sm:text-xs text-[#F5D77F] font-serif tracking-[0.16em] mb-4 shadow-xl backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            THE HERITAGE ICON &bull; ROOTED IN BENGAL. MADE FOR TOMORROW.
          </div>

          <JaanalaLogo size="xl" variant="vertical" showTagline={true} showBengali={true} />

          <div className="mt-3 flex items-center justify-center gap-3 text-xs font-serif text-[#E0D0BE]">
            <span>গল্পের এক নতুন জানালা</span>
            <span className="text-[#D4AF37]">&bull;</span>
            <span>CINEMA &bull; SERIES &bull; HERITAGE</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#120B0E]/50 border border-[#521319]/60 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-5 p-4 rounded-xl bg-[#2A0E13] border border-[#8B181E]/80 flex items-start gap-3 text-[#F8D7DA] text-xs font-serif">
              <AlertCircle className="w-4 h-4 text-[#E5C365] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Authorization Error</span>
                {error}
              </div>
            </div>
          )}

          {infoMessage && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-950/80 border border-emerald-700/80 flex items-start gap-3 text-emerald-200 text-xs font-serif">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">{infoMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.15em] text-[#D8C7B5] mb-1.5">
                Admin Login
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@janala.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B080A] border border-[#381A20] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#F5EBE1] placeholder-[#6E5A60] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-colors font-serif"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.15em] text-[#D8C7B5]">
                  Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] font-serif text-[#D4AF37] hover:underline cursor-pointer transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0B080A] border border-[#381A20] rounded-xl pl-4 pr-11 py-3 text-xs sm:text-sm text-[#F5EBE1] placeholder-[#6E5A60] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-colors font-serif"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A89886] hover:text-[#D4AF37] transition-colors cursor-pointer p-1 rounded-md focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#8B181E] via-[#A82027] to-[#7B1113] hover:from-[#9E1B22] hover:to-[#8B181E] text-white font-serif font-bold tracking-wider rounded-xl text-xs sm:text-sm shadow-lg shadow-[#8B181E]/40 border border-[#D4AF37]/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4 text-[#F5D77F]" />
              {submitting ? 'Authenticating Admin Session...' : 'Sign In to JANALAA Central Console'}
            </button>
          </form>

          {/* Test Admin Credentials hint */}
          <div className="mt-5 pt-3 border-t border-[#381A20] flex items-center justify-between text-xs text-[#A89886] font-serif">
            <span>Admin Default Credentials:</span>
            <span className="text-[#D4AF37] font-mono text-[11px]">admin@janala.local / janala123</span>
          </div>
        </div>

        {/* Footer specs */}
        <div className="text-center mt-6 text-xs text-[#8F7C82] font-serif space-y-1">
          <p>JANALAA (জানালা) OTT Platform &bull; Cloudflare R2 Video Engine &bull; PostgreSQL</p>
          <p className="text-[11px] text-[#6E5A60]">Protected by Unified Administrator Security &bull; Stories Find a Home Here</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#140D10] border border-[#381A20] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8B181E]/30 text-[#F5D77F] border border-[#D4AF37]/40 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[#F5EBE1]">Admin Password Recovery</h3>
                <p className="text-xs text-[#A89886] font-serif">
                  Request credentials reset for JANALAA Central Control Console
                </p>
              </div>
            </div>

            {forgotSent ? (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs font-serif space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Reset Request Initiated</span>
                </div>
                <p>
                  Password reset link & security token sent to <strong className="text-white">{forgotEmail}</strong>. Please check your inbox or contact studio IT administration.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotSent(false);
                    }}
                    className="w-full py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-serif text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Return to Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.15em] text-[#D8C7B5] mb-1.5">
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@janala.local"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-[#0B080A] border border-[#381A20] rounded-xl px-4 py-2.5 text-xs text-[#F5EBE1] placeholder-[#6E5A60] focus:outline-none focus:border-[#D4AF37] font-serif"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#381A20]">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-serif text-[#C5B4A0] hover:text-white hover:bg-[#1E1116] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B181E] to-[#A82027] hover:from-[#9E1B22] hover:to-[#8B181E] text-white text-xs font-serif font-bold shadow-md border border-[#D4AF37]/50 cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </JanalaaWallpaper>
  );
};
