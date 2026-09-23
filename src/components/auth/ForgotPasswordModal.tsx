import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, ShieldCheck, KeyRound, Lock, Eye, EyeOff, RefreshCw, ExternalLink } from 'lucide-react';
import { requestPasswordResetCode, resetPasswordWithCode, requestSupabasePasswordReset } from '../../services/supabaseClient';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const [step, setStep] = useState<'email' | 'code_and_password' | 'success'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmail && initialEmail.includes('@')) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Step 1: Send verification code to email
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await requestPasswordResetCode(cleanEmail);
      if (res.success) {
        if (res.fallbackToLink) {
          setStatusMessage(res.message);
          setResendCooldown(60);
        } else {
          setStep('code_and_password');
          setStatusMessage(res.message || `A 6-digit code has been sent to ${cleanEmail}.`);
          setResendCooldown(60);
        }
      } else {
        if (res.cooldownRemaining) {
          setResendCooldown(res.cooldownRemaining);
        }
        setError(res.message || 'Failed to send verification code. Please check your email.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Supabase password reset link fallback
  const handleSendDirectLink = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid registered email address first.');
      return;
    }
    setError(null);
    setIsSendingLink(true);
    try {
      const res = await requestSupabasePasswordReset(cleanEmail);
      if (res.success) {
        setStatusMessage(res.message || `A password reset link has been dispatched to ${cleanEmail}.`);
        setResendCooldown(60);
      } else {
        setError(res.error || 'Failed to send reset link. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error sending reset link.');
    } finally {
      setIsSendingLink(false);
    }
  };

  // Resend code handler
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;
    setError(null);
    setIsResending(true);
    try {
      const res = await requestPasswordResetCode(email.trim().toLowerCase());
      if (res.success) {
        setStatusMessage(`New verification code sent! Valid for 25 minutes.`);
        setResendCooldown(60);
      } else {
        if (res.cooldownRemaining) {
          setResendCooldown(res.cooldownRemaining);
        }
        setError(res.message || 'Failed to resend code.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error while resending code.');
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Submit 6-digit code & new password to reset in the app
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setError('Please enter the full 6-digit verification code sent to your email.');
      return;
    }

    if (!password || password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPasswordWithCode(email.trim().toLowerCase(), cleanCode, password);
      if (res.success) {
        setStep('success');
      } else {
        setError(res.message || 'Failed to update password. Please verify your 6-digit code.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while resetting your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('email');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setStatusMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        {/* Close / Back button */}
        <button
          id="forgot-password-close-btn"
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close modal"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Step 1: Request Code */}
        {step === 'email' && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-100 text-indigo-700 mb-3 shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Forgot Password?</h2>
              <p className="text-sm text-slate-600 mt-1.5">
                Enter your registered email address. We'll send a 6-digit verification code so you can set a new password directly in the app.
              </p>
            </div>

            <form onSubmit={handleRequestCode} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Registered Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="forgot-password-email-input"
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Verification codes are sent directly to your registered email and remain valid for 25 minutes.</span>
              </div>

              <div className="pt-2">
                <button
                  id="forgot-password-submit-btn"
                  type="submit"
                  disabled={isSubmitting || isSendingLink}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Sending Code...' : 'Send Verification Code'}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={handleSendDirectLink}
                  disabled={isSendingLink || isSubmitting || !email.includes('@')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 font-medium flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{isSendingLink ? 'Sending Link...' : 'Or email me a direct password reset link'}</span>
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  id="forgot-password-cancel-btn"
                  type="button"
                  onClick={handleClose}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: In-App Verification Code & New Password */}
        {step === 'code_and_password' && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-100 text-indigo-700 mb-2 shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Set New Password</h2>
              <p className="text-xs text-slate-600 mt-1">
                We sent a 6-digit code to <strong className="text-slate-800 font-semibold">{email}</strong>.
              </p>
              <div className="inline-block mt-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-semibold border border-emerald-200">
                Valid for 25 minutes
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {statusMessage && !error && (
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* 6-Digit Code Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">6-Digit Verification Code</label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setError(null);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>
                <input
                  id="reset-otp-code-input"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  className="w-full text-center tracking-widest font-mono text-xl py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder:text-slate-400 font-bold"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-new-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Resend Code Button */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Didn't get the code?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={handleResendCode}
                  className="font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  id="reset-password-submit-btn"
                  type="submit"
                  disabled={isSubmitting || code.length < 6 || password.length < 6}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Updating Password...' : 'Change Password'}</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <div className="space-y-5 animate-in zoom-in-95 text-center">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex flex-col items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-extrabold text-base text-emerald-900">Password Changed Successfully!</p>
                <p className="text-xs text-emerald-700">
                  Your SkillMesh password has been updated. You can now log in to your account with your new password.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600 text-left">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Your account credentials are encrypted and safely synchronized.</span>
            </div>

            <button
              id="forgot-password-done-btn"
              onClick={handleClose}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-colors cursor-pointer"
            >
              Proceed to Log In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
