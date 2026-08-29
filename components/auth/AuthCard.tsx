'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye, EyeOff, User, Mail, Lock, AlertCircle, KeyRound, CheckCircle2,
  ArrowLeft, ArrowRight, ShieldCheck, ShieldAlert, Clock, RefreshCw, Sparkles, Check, GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { validateEmail, validateFullName, checkPasswordStrength, ALLOWED_EMAIL_DOMAIN } from '@/lib/validators';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import GoogleButton from './GoogleButton';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import OtpInput from './OtpInput';

export type AuthView =
  | 'signin'
  | 'signup'
  | 'verify_signup_otp'
  | 'forgot_email'
  | 'forgot_otp'
  | 'forgot_new_password';

interface InputWrapperProps {
  children: React.ReactNode;
  error?: string;
  touched?: boolean;
}

function InputWrapper({ children, error, touched: isTouched }: InputWrapperProps) {
  return (
    <div className="relative">
      {children}
      {isTouched && error && (
        <div className="flex items-center gap-1.5 mt-1.5 animate-fade-in">
          <AlertCircle size={12} className="text-red-400 flex-shrink-0" aria-hidden="true" />
          <p className="text-xs text-red-400" role="alert">{error}</p>
        </div>
      )}
    </div>
  );
}

export default function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    signIn,
    requestSignupOtp,
    verifySignupOtp,
    resendSignupOtp,
    requestPasswordReset,
    verifyPasswordResetOtp,
    updateNewPassword,
    checkLockoutStatus,
    isLoading,
  } = useAuth();
  const toast = useToast();

  const [view, setView] = useState<AuthView>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Catch unauthorized domain error from OAuth callback
  useEffect(() => {
    if (searchParams?.get('error') === 'unauthorized_domain') {
      setAuthError('Access restricted: Only Google accounts with the @umak.edu.ph domain are authorized to sign in.');
    }
  }, [searchParams]);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Lockout Security State (6 Failed Attempts -> 15 Minute Lock)
  const [isLocked, setIsLocked] = useState(false);
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Live 15-Minute Lockout Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockSecondsRemaining > 0) {
      setIsLocked(true);
      timer = setInterval(() => {
        setLockSecondsRemaining(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttemptsRemaining(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setIsLocked(false);
    }
    return () => clearInterval(timer);
  }, [lockSecondsRemaining]);

  const formatLockTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Resend OTP Cooldown timer (60 seconds)
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Touch state for validation display
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
    otpToken: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const touch = (field: keyof typeof touched) =>
    setTouched(prev => ({ ...prev, [field]: true }));

  // Computed validation
  const nameValidation = validateFullName(fullName);
  const emailValidation = validateEmail(email);
  const strength = checkPasswordStrength(password);
  const newStrength = checkPasswordStrength(newPassword);

  const passwordOk = view === 'signin' ? password.length >= 1 : strength.score >= 3;
  const confirmOk = confirmPassword === password && confirmPassword.length > 0;
  const newPasswordOk = newStrength.score >= 3;
  const confirmNewPasswordOk = confirmNewPassword === newPassword && confirmNewPassword.length > 0;
  const otpOk = otpToken.trim().length >= 6;

  const resetErrors = () => {
    setAuthError(null);
    setAuthSuccess(null);
  };

  const handleSwitchView = (newView: AuthView) => {
    setView(newView);
    resetErrors();
    setOtpToken('');
    if (newView === 'signin' || newView === 'signup') {
      setPassword('');
      setConfirmPassword('');
    }
  };

  // Check email lockout status when user finishes typing email in signin view
  const handleEmailBlur = async () => {
    touch('email');
    if (emailValidation.valid && view === 'signin') {
      try {
        const status = await checkLockoutStatus(email);
        if (status.isLocked) {
          setIsLocked(true);
          setLockSecondsRemaining(status.remainingSeconds || Math.ceil(status.remainingMs / 1000) || 900);
          setAttemptsRemaining(0);
        } else {
          setIsLocked(false);
          setLockSecondsRemaining(0);
          if (status.failedAttempts > 0) {
            setAttemptsRemaining(status.attemptsLeft);
          } else {
            setAttemptsRemaining(null);
          }
        }
      } catch {}
    }
  };

  // ── 1. Handle Sign In ───────────────────────────────────────────────────────
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValidation.valid || password.length === 0 || isLoading || isLocked) return;
    resetErrors();

    try {
      const loggedInUser = await signIn(email, password);
      setIsLocked(false);
      setLockSecondsRemaining(0);
      setAttemptsRemaining(null);
      toast.success('Welcome back!', `Signed in as ${loggedInUser.name || email}`);
      if (loggedInUser.role === 'ADMIN') {
        router.push('/admin');
      } else if (loggedInUser.role === 'TECHNICIAN') {
        router.push('/technician');
      } else {
        router.push('/student');
      }
    } catch (err: any) {
      if (err?.isLocked) {
        setIsLocked(true);
        setLockSecondsRemaining(err.remainingSeconds || 900);
        setAttemptsRemaining(0);
      } else if (err?.attemptsLeft !== undefined) {
        setAttemptsRemaining(err.attemptsLeft);
      }

      const msg = err?.message || 'Invalid email or password';
      setAuthError(msg);
      toast.error(err?.isLocked ? 'Account Temporarily Locked' : 'Sign in failed', msg);
    }
  };

  // ── 2. Handle Sign Up (Triggers OTP & Redirects or Signs In directly if OTP bypassed) ────
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameValidation.valid || !emailValidation.valid || !passwordOk || !confirmOk || isLoading) return;
    resetErrors();

    try {
      const res = await requestSignupOtp(fullName, email, password);

      // If OTP verification is bypassed/disabled, log directly into dashboard
      if (res && !res.needOtp && res.user) {
        toast.success('Account Created!', `Welcome to LabAssist, ${res.user.name || fullName}!`);
        if (res.user.role === 'ADMIN') {
          router.push('/admin');
        } else if (res.user.role === 'TECHNICIAN') {
          router.push('/technician');
        } else {
          router.push('/student');
        }
        return;
      }

      // Normal flow when OTP is required — stay on this page so `password` stays in state
      toast.info('Verification Code Sent', `A 6-digit activation code was sent to ${email}`);
      setView('verify_signup_otp');
      setResendCooldown(60);
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account. Please check details and try again.';
      setAuthError(msg);
      toast.error('Sign up failed', msg);
    }
  };


  // ── 3. Handle Verify Sign Up OTP ─────────────────────────────────────────────
  const handleVerifySignupOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpOk || isLoading) return;
    resetErrors();

    try {
      const verifiedUser = await verifySignupOtp(email, otpToken, fullName, password);
      toast.success('Email Verified!', `Welcome to LabAssist, ${verifiedUser.name || fullName}!`);
      if (verifiedUser.role === 'ADMIN') {
        router.push('/admin');
      } else if (verifiedUser.role === 'TECHNICIAN') {
        router.push('/technician');
      } else {
        router.push('/student');
      }
    } catch (err: any) {
      const msg = err?.message || 'Invalid or expired verification code. Please try again.';
      setAuthError(msg);
      toast.error('Verification failed', msg);
    }
  };

  // ── 4. Handle Resend Sign Up OTP ─────────────────────────────────────────────
  const handleResendSignupOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    resetErrors();
    try {
      await resendSignupOtp(email);
      setResendCooldown(60);
      setAuthSuccess(`A new 6-digit code was sent to ${email}.`);
      toast.success('Code Resent', 'A fresh verification code has been dispatched to your email.');
    } catch (err: any) {
      const msg = err?.message || 'Failed to resend code. Please try again shortly.';
      setAuthError(msg);
      toast.error('Resend failed', msg);
    } finally {
      setIsResending(false);
    }
  };

  // ── 5. Handle Forgot Password - Step 1: Request Recovery Code ────────────────
  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValidation.valid || isLoading) return;
    resetErrors();

    try {
      await requestPasswordReset(email);
      setView('forgot_otp');
      setResendCooldown(60);
      setAuthSuccess(`Recovery code sent to ${email}. Check your inbox.`);
      toast.info('Recovery Code Dispatched', `We sent a 6-digit recovery code to ${email}`);
    } catch (err: any) {
      const msg = err?.message || 'Unable to send recovery code. Ensure the email is registered.';
      setAuthError(msg);
      toast.error('Reset request failed', msg);
    }
  };

  // ── 6. Handle Forgot Password - Step 2: Verify Recovery OTP ──────────────────
  const handleForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpOk || isLoading) return;
    resetErrors();

    try {
      await verifyPasswordResetOtp(email, otpToken);
      setView('forgot_new_password');
      toast.success('Code Verified', 'Please enter your new password.');
    } catch (err: any) {
      const msg = err?.message || 'Invalid or expired recovery code. Please check and re-enter.';
      setAuthError(msg);
      toast.error('Code verification failed', msg);
    }
  };

  // ── 7. Handle Forgot Password - Resend Recovery Code ────────────────────────
  const handleResendRecoveryOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    resetErrors();
    try {
      await requestPasswordReset(email);
      setResendCooldown(60);
      setAuthSuccess(`A fresh recovery code was sent to ${email}.`);
      toast.success('Code Resent', 'Recovery code dispatched to your inbox.');
    } catch (err: any) {
      const msg = err?.message || 'Failed to resend code.';
      setAuthError(msg);
      toast.error('Resend failed', msg);
    } finally {
      setIsResending(false);
    }
  };

  // ── 8. Handle Forgot Password - Step 3: Set New Password ─────────────────────
  const handleForgotNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordOk || !confirmNewPasswordOk || isLoading) return;
    resetErrors();

    try {
      await updateNewPassword(newPassword, email);
      toast.success('Password Updated!', 'Your password was reset successfully. You can now sign in.');
      setView('signin');
      setPassword('');
      setConfirmPassword('');
      setAuthSuccess('Password updated successfully. Please sign in with your new password.');
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password. Please try again.';
      setAuthError(msg);
      toast.error('Password reset failed', msg);
    }
  };


  return (
    <div className="glass rounded-2xl p-8 w-full max-w-md mx-auto shadow-2xl animate-fade-in-up">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="text-xl font-black text-slate-100">Lab</span>
          <span className="text-xl font-black gradient-text">Assist</span>
        </div>
        <p className="text-xs text-slate-400 font-medium">University of Makati Lab Maintenance</p>
        <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[11px] text-indigo-300 font-medium">
          <GraduationCap size={13} className="text-indigo-400" />
          <span>Restricted to @umak.edu.ph</span>
        </div>
      </div>

      {/* Tabs (Only visible in signin / signup views) */}
      {(view === 'signin' || view === 'signup') && (
        <div className="flex rounded-xl bg-slate-900/60 p-1 mb-6" role="tablist" aria-label="Authentication options">
          <button
            role="tab"
            id="auth-tab-signin"
            aria-selected={view === 'signin'}
            onClick={() => handleSwitchView('signin')}
            className={`
              flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200
              ${view === 'signin' ? 'bg-slate-700 text-slate-100 shadow-md' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            Sign In
          </button>
          <button
            role="tab"
            id="auth-tab-signup"
            aria-selected={view === 'signup'}
            onClick={() => handleSwitchView('signup')}
            className={`
              flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200
              ${view === 'signup' ? 'bg-slate-700 text-slate-100 shadow-md' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Inline Feedback Alerts */}
      {authError && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 animate-fade-in" role="alert">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-red-300 leading-relaxed font-medium">
            {authError}
          </div>
        </div>
      )}

      {authSuccess && (
        <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 animate-fade-in" role="status">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-emerald-300 leading-relaxed font-medium">
            {authSuccess}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: SIGN IN                                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {view === 'signin' && (
        <div className="space-y-4">
                        <GoogleButton />

          <div className="flex items-center gap-3 my-5" role="separator" aria-label="Or continue with email">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium">or continue with UMak email</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <form onSubmit={handleSignInSubmit} className="space-y-4" noValidate>
            {/* Account Lockout Banner with Live Countdown */}
            {isLocked && lockSecondsRemaining > 0 && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 animate-fade-in shadow-lg shadow-red-950/40">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-900/80 border border-red-500/40 text-red-300 mt-0.5 flex-shrink-0">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-red-200">Account Temporarily Locked</h4>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-900/90 border border-red-400/50 text-red-200 shadow-sm">
                        <Clock size={12} className="animate-spin text-red-300" />
                        {formatLockTime(lockSecondsRemaining)}
                      </span>
                    </div>
                    <p className="text-xs text-red-300/90 mt-1.5 leading-relaxed">
                      Your account will automatically unlock when the timer expires.
                    </p>
                    <div className="mt-3 pt-2.5 border-t border-red-900/50 flex items-center justify-between text-xs flex-wrap gap-2">
                      <span className="text-red-400">Need immediate access?</span>
                      <button
                        type="button"
                        onClick={() => handleSwitchView('forgot_email')}
                        className="font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors inline-flex items-center gap-1"
                      >
                        <span>Reset password via OTP</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <InputWrapper error={emailValidation.message} touched={touched.email}>
              <label htmlFor="signin-email" className="block text-xs font-semibold text-slate-400 mb-1.5">UMak Campus Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); resetErrors(); }}
                  onBlur={handleEmailBlur}
                  placeholder="student@umak.edu.ph"
                  className={`
                    w-full pl-10 pr-4 py-3 rounded-xl text-sm
                    bg-slate-900/60 text-slate-100 placeholder-slate-600
                    border input-glow transition-all
                    ${touched.email && !emailValidation.valid ? 'border-red-500/60' : 'border-slate-700'}
                  `}
                  aria-invalid={touched.email && !emailValidation.valid}
                />
              </div>
            </InputWrapper>


            <InputWrapper touched={touched.password}>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="signin-password" className="block text-xs font-semibold text-slate-400">Password</label>
                <button
                  type="button"
                  onClick={() => handleSwitchView('forgot_email')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={isLocked}
                  value={password}
                  onChange={e => { setPassword(e.target.value); resetErrors(); }}
                  onBlur={() => touch('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm bg-slate-900/60 text-slate-100 placeholder-slate-600 border border-slate-700 input-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5 disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </InputWrapper>

            <button
              type="submit"
              disabled={!emailValidation.valid || password.length === 0 || isLoading || isLocked}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-glow-indigo transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 ${
                isLocked
                  ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                  : 'btn-primary'
              }`}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size={16} className="text-white" />
                  <span>Signing In…</span>
                </>
              ) : isLocked ? (
                <>
                  <Lock size={16} className="text-red-400" />
                  <span>Account Locked ({formatLockTime(lockSecondsRemaining)})</span>
                </>
              ) : (
                <span>Sign In to LabAssist</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: SIGN UP                                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {view === 'signup' && (
        <div className="space-y-4">
                        <GoogleButton />

          <div className="flex items-center gap-3 my-5" role="separator" aria-label="Or continue with email">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium">or register with email</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <form onSubmit={handleSignUpSubmit} className="space-y-4" noValidate>
            <InputWrapper error={nameValidation.message} touched={touched.fullName}>
              <label htmlFor="signup-fullname" className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="signup-fullname"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={e => { setFullName(e.target.value); resetErrors(); }}
                  onBlur={() => touch('fullName')}
                  placeholder="Maria Santos"
                  className={`
                    w-full pl-10 pr-4 py-3 rounded-xl text-sm
                    bg-slate-900/60 text-slate-100 placeholder-slate-600
                    border input-glow transition-all
                    ${touched.fullName && !nameValidation.valid ? 'border-red-500/60' : 'border-slate-700'}
                  `}
                  aria-invalid={touched.fullName && !nameValidation.valid}
                />
              </div>
            </InputWrapper>

            <InputWrapper error={emailValidation.message} touched={touched.email}>
              <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-400 mb-1.5">UMak Campus Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); resetErrors(); }}
                  onBlur={() => touch('email')}
                  placeholder="student@umak.edu.ph"
                  className={`
                    w-full pl-10 pr-4 py-3 rounded-xl text-sm
                    bg-slate-900/60 text-slate-100 placeholder-slate-600
                    border input-glow transition-all
                    ${touched.email && !emailValidation.valid ? 'border-red-500/60' : 'border-slate-700'}
                  `}
                  aria-invalid={touched.email && !emailValidation.valid}
                />
              </div>
            </InputWrapper>


            <InputWrapper touched={touched.password}>
              <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); resetErrors(); }}
                  onBlur={() => touch('password')}
                  placeholder="Create a strong password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm bg-slate-900/60 text-slate-100 placeholder-slate-600 border border-slate-700 input-glow transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {password.length > 0 && <PasswordStrengthMeter strength={strength} />}
            </InputWrapper>

            <InputWrapper
              error={confirmPassword.length > 0 && !confirmOk ? 'Passwords do not match' : undefined}
              touched={touched.confirmPassword}
            >
              <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-400 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="signup-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); resetErrors(); }}
                  onBlur={() => touch('confirmPassword')}
                  placeholder="Repeat your password"
                  className={`
                    w-full pl-10 pr-11 py-3 rounded-xl text-sm
                    bg-slate-900/60 text-slate-100 placeholder-slate-600
                    border input-glow transition-all
                    ${touched.confirmPassword && !confirmOk ? 'border-red-500/60' : 'border-slate-700'}
                  `}
                  aria-invalid={touched.confirmPassword && !confirmOk}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </InputWrapper>

            <button
              type="submit"
              disabled={!nameValidation.valid || !emailValidation.valid || !passwordOk || !confirmOk || isLoading}
              className="w-full py-3.5 px-4 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2 shadow-glow-indigo transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size={16} className="text-white" />
                  <span>Sending Verification Code…</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: VERIFY SIGN UP OTP                                                 */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {view === 'verify_signup_otp' && (
        <div className="space-y-5 animate-fade-in">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto mb-2 shadow-glow-indigo">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Verify Your Email</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              We sent a 6-digit confirmation code to <span className="text-indigo-300 font-mono font-semibold">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifySignupOtpSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="signup-otp-0" className="block text-xs font-semibold text-slate-400 mb-2 text-center">
                6-Digit Verification Code
              </label>
              <OtpInput
                value={otpToken}
                onChange={val => {
                  setOtpToken(val);
                  resetErrors();
                }}
                hasError={!!authError || (touched.otpToken && !otpOk && otpToken.length > 0)}
                disabled={isLoading}
                autoFocus={true}
                idPrefix="signup-otp"
              />
              {touched.otpToken && !otpOk && otpToken.length > 0 && (
                <p className="text-xs text-rose-400 text-center mt-1.5 animate-fade-in">Please enter all 6 digits</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!otpOk || isLoading}
              className="w-full py-3.5 px-4 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2 shadow-glow-indigo transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size={16} className="text-white" />
                  <span>Verifying Code…</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Verify &amp; Activate Account</span>
                </>
              )}
            </button>
          </form>

          {/* Resend button & Back link */}
          <div className="pt-2 flex flex-col items-center gap-3 text-xs">
            <button
              type="button"
              onClick={handleResendSignupOtp}
              disabled={resendCooldown > 0 || isResending}
              className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} className={isResending ? 'animate-spin' : ''} />
              <span>
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchView('signup')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors pt-1"
            >
              <ArrowLeft size={13} />
              <span>Back to Edit Registration Details</span>
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: FORGOT PASSWORD - STEP 1 (ENTER EMAIL)                             */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {view === 'forgot_email' && (
        <div className="space-y-5 animate-fade-in">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 mx-auto mb-2 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <KeyRound size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Reset Your Password</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Enter your registered email address and we will send you a 6-digit recovery code.
            </p>
          </div>

          <form onSubmit={handleForgotEmailSubmit} className="space-y-4" noValidate>
            <InputWrapper error={emailValidation.message} touched={touched.email}>
              <label htmlFor="forgot-email-input" className="block text-xs font-semibold text-slate-400 mb-1.5">Registered UMak Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="forgot-email-input"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={e => { setEmail(e.target.value); resetErrors(); }}
                  onBlur={() => touch('email')}
                  placeholder="student@umak.edu.ph"
                  className={`
                    w-full pl-10 pr-4 py-3 rounded-xl text-sm
                    bg-slate-900/60 text-slate-100 placeholder-slate-600
                    border input-glow transition-all
                    ${touched.email && !emailValidation.valid ? 'border-red-500/60' : 'border-slate-700'}
                  `}
                  aria-invalid={touched.email && !emailValidation.valid}
                />
              </div>
            </InputWrapper>


            <button
              type="submit"
              disabled={!emailValidation.valid || isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size={16} className="text-white" />
                  <span>Sending Recovery Code…</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Code</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => handleSwitchView('signin')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Back to Sign In</span>
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: FORGOT PASSWORD - STEP 2 (ENTER OTP)                               */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {view === 'forgot_otp' && (
        <div className="space-y-5 animate-fade-in">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 mx-auto mb-2 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Enter Recovery Code</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Please enter the 6-digit recovery code sent to <span className="text-violet-300 font-mono font-semibold">{email}</span>
            </p>
          </div>

          <form onSubmit={handleForgotOtpSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="recovery-otp-0" className="block text-xs font-semibold text-slate-400 mb-2 text-center">
                6-Digit Recovery OTP
              </label>
              <OtpInput
                value={otpToken}
                onChange={val => {
                  setOtpToken(val);
                  resetErrors();
                }}
                hasError={!!authError || (touched.otpToken && !otpOk && otpToken.length > 0)}
                disabled={isLoading}
                autoFocus={true}
                idPrefix="recovery-otp"
              />
              {touched.otpToken && !otpOk && otpToken.length > 0 && (
                <p className="text-xs text-rose-400 text-center mt-1.5 animate-fade-in">Please enter all 6 digits</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!otpOk || isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size={16} className="text-white" />
                  <span>Verifying Recovery Code…</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Verify Code &amp; Proceed</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 flex flex-col items-center gap-3 text-xs">
            <button
              type="button"
              onClick={handleResendRecoveryOtp}
              disabled={resendCooldown > 0 || isResending}
              className="flex items-center gap-1.5 text-slate-400 hover:text-violet-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} className={isResending ? 'animate-spin' : ''} />
              <span>
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Recovery Code'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchView('forgot_email')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Use a different email address</span>
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: FORGOT PASSWORD - STEP 3 (SET NEW PASSWORD)                        */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {view === 'forgot_new_password' && (
        <div className="space-y-5 animate-fade-in">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Lock size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Set New Password</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Please enter a strong new password for your account.
            </p>
          </div>

          <form onSubmit={handleForgotNewPasswordSubmit} className="space-y-4" noValidate>
            <InputWrapper touched={touched.newPassword}>
              <label htmlFor="new-password-input" className="block text-xs font-semibold text-slate-400 mb-1.5">New Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="new-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); resetErrors(); }}
                  onBlur={() => touch('newPassword')}
                  placeholder="Enter strong new password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm bg-slate-900/60 text-slate-100 placeholder-slate-600 border border-slate-700 input-glow transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {newPassword.length > 0 && <PasswordStrengthMeter strength={newStrength} />}
            </InputWrapper>

            <InputWrapper
              error={confirmNewPassword.length > 0 && !confirmNewPasswordOk ? 'Passwords do not match' : undefined}
              touched={touched.confirmNewPassword}
            >
              <label htmlFor="confirm-new-password-input" className="block text-xs font-semibold text-slate-400 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="confirm-new-password-input"
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={e => { setConfirmNewPassword(e.target.value); resetErrors(); }}
                  onBlur={() => touch('confirmNewPassword')}
                  placeholder="Repeat your new password"
                  className={`
                    w-full pl-10 pr-10 py-3 rounded-xl text-sm
                    bg-slate-900/60 text-slate-100 placeholder-slate-600
                    border input-glow transition-all
                    ${touched.confirmNewPassword && !confirmNewPasswordOk ? 'border-red-500/60' : 'border-slate-700'}
                  `}
                  aria-invalid={touched.confirmNewPassword && !confirmNewPasswordOk}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  onClick={() => setShowConfirmNewPassword(p => !p)}
                  aria-label={showConfirmNewPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </InputWrapper>

            <button
              type="submit"
              disabled={!newPasswordOk || !confirmNewPasswordOk || isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size={16} className="text-white" />
                  <span>Updating Password…</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Update Password &amp; Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
