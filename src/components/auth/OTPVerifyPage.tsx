import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  Mail, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle, 
  Lock, 
  ArrowLeft, 
  CheckCircle2, 
  Edit3
} from 'lucide-react';

export const OTPVerifyPage: React.FC = () => {
  const { 
    signupDraft, 
    setSignupDraft,
    verifyOTP, 
    resendOTP, 
    setCurrentView,
    updateSignupPassword
  } = useApp();

  // Email state: initialize from signupDraft, with inline edit capability
  const [emailInput, setEmailInput] = useState(signupDraft?.email || '');
  const [isEditingEmail, setIsEditingEmail] = useState(!signupDraft?.email);

  // 6 separate spaced digit boxes
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [password, setPassword] = useState(signupDraft?.password || '');
  const [confirmPassword, setConfirmPassword] = useState(signupDraft?.password || '');
  const [needsPassword, setNeedsPassword] = useState(!signupDraft?.password);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Sync draft changes if present
  useEffect(() => {
    if (signupDraft?.email && !emailInput) {
      setEmailInput(signupDraft.email);
      setIsEditingEmail(false);
    }
  }, [signupDraft]);

  // Resend countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Autofocus first digit box on mount
  useEffect(() => {
    const firstEmptyIndex = otpDigits.findIndex(d => !d);
    const targetIdx = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
    inputRefs.current[targetIdx]?.focus();
  }, []);

  // Handle individual digit input change
  const handleDigitChange = (index: number, value: string) => {
    // If user pasted multiple digits into one slot
    const cleanNumbers = value.replace(/[^0-9]/g, '');
    if (cleanNumbers.length > 1) {
      handlePastedCode(cleanNumbers);
      return;
    }

    const singleDigit = cleanNumbers.slice(-1); // Take latest typed digit
    const newDigits = [...otpDigits];
    newDigits[index] = singleDigit;
    setOtpDigits(newDigits);

    // Auto-advance focus to next slot if a digit was typed
    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace, left/right arrow navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Current box is empty; step back to previous box and clear it
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste anywhere on the digit boxes
  const handlePastedCode = (pastedText: string) => {
    const digitsOnly = pastedText.replace(/[^0-9]/g, '').slice(0, 6);
    if (!digitsOnly) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < digitsOnly.length; i++) {
      newDigits[i] = digitsOnly[i];
    }
    setOtpDigits(newDigits);

    // Focus on the slot after the last pasted digit or the 6th slot
    const nextIdx = Math.min(digitsOnly.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  // Handle OTP verification submission
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendSuccess(null);

    const fullOtp = otpDigits.join('').trim();
    if (fullOtp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      const firstEmptyIndex = otpDigits.findIndex(d => !d);
      if (firstEmptyIndex !== -1) {
        inputRefs.current[firstEmptyIndex]?.focus();
      }
      return;
    }

    const targetEmail = (emailInput || signupDraft?.email || '').trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your registered email address.');
      setIsEditingEmail(true);
      return;
    }

    // Ensure signup draft has the active email
    if (!signupDraft || signupDraft.email !== targetEmail) {
      setSignupDraft({
        name: signupDraft?.name || targetEmail.split('@')[0],
        email: targetEmail,
        password: password || signupDraft?.password,
      });
    }

    if (needsPassword) {
      if (!password || password.length < 6) {
        setError('Please create a secure password (at least 6 characters).');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
      updateSignupPassword(password);
    }

    setIsSubmitting(true);
    try {
      const res = await verifyOTP(fullOtp, password || signupDraft?.password);
      if (!res.success) {
        setError(res.error || 'Verification code is invalid or has expired. You can retrieve a new code below.');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend
  const handleResend = async () => {
    if (countdown > 0 || isResending) return;

    const targetEmail = (emailInput || signupDraft?.email || '').trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your email address to resend the code.');
      setIsEditingEmail(true);
      return;
    }

    setIsResending(true);
    setError(null);
    setResendSuccess(null);

    try {
      // Ensure draft exists
      if (!signupDraft || signupDraft.email !== targetEmail) {
        setSignupDraft({
          name: signupDraft?.name || targetEmail.split('@')[0],
          email: targetEmail,
          password: signupDraft?.password || password,
        });
      }

      const res = await resendOTP(targetEmail, signupDraft?.name);
      if (res.success) {
        setCountdown(60);
        setResendSuccess('A fresh 6-digit verification code has been dispatched to your email!');
      } else {
        setError(res.error || 'Failed to resend code. Please wait a moment.');
      }
    } catch (err: any) {
      setError('Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  const activeEmail = emailInput || signupDraft?.email || '';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4 py-10">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 mb-3 border border-emerald-200/80 shadow-xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Verify your email
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            Enter the 6-digit code to verify your SkillMesh account
          </p>

          {/* Email badge / inline editor */}
          <div className="mt-3 flex items-center justify-center">
            {!isEditingEmail && activeEmail ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs font-semibold shadow-xs">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>{activeEmail}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(true)}
                  className="text-emerald-700 hover:text-emerald-900 hover:underline text-[11px] font-bold ml-1 cursor-pointer flex items-center gap-0.5"
                  title="Change target email"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
            ) : (
              <div className="w-full max-w-sm flex items-center gap-2 mt-1">
                <input
                  id="otp-target-email-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your registered email"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                />
                {activeEmail && (
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(false)}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resendSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{resendSuccess}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {/* 6 Individual Spaced Verification Code Boxes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800">
                  Enter 6-Digit Verification Code
                </label>
                <span className="text-[11px] text-slate-500">
                  {otpDigits.filter(Boolean).length}/6 entered
                </span>
              </div>

              {/* Spaced Input Slots */}
              <div 
                className="flex items-center justify-center gap-2 sm:gap-3 py-2"
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text');
                  handlePastedCode(pasted);
                }}
              >
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    id={`otp-box-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-11 h-13 sm:w-13 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border transition-all select-none ${
                      digit 
                        ? 'bg-emerald-50/50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20' 
                        : 'bg-slate-50/80 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Type each digit or paste your entire 6-digit code directly
              </p>
            </div>

            {/* Email Delivery Guidance */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800">
                  Code sent to your email inbox
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Please check your inbox as well as your <strong className="text-slate-700">Spam or Junk folder</strong>. Verification emails usually arrive within a few seconds.
                </p>
              </div>
            </div>

            {/* Set Account Password (if needed) */}
            {needsPassword && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-800">Set Account Password</p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Create Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="otp-new-password-input"
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="otp-confirm-password-input"
                      type="password"
                      required
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-1">
              <button
                id="otp-verify-submit-btn"
                type="submit"
                disabled={isSubmitting || otpDigits.join('').length < 6}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-900/10 hover:shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? 'Verifying Code...' : 'Verify Code & Complete Setup'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Resend & Return navigation */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              id="otp-back-to-signup-btn"
              type="button"
              onClick={() => setCurrentView('signup')}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Signup</span>
            </button>

            <button
              id="otp-resend-btn"
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || isResending}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 cursor-pointer disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              <span>
                {countdown > 0 ? `Resend code (${countdown}s)` : 'Resend code via email'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
