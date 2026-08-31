'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck, ArrowLeft, RefreshCw, Check, AlertCircle, Mail,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import OtpInput from '@/components/auth/OtpInput';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { refreshProfile } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const typeParam = (searchParams.get('type') as any) || 'email';
  const nameParam = searchParams.get('name') || '';

  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

  // 60-second cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (cleanToken.length < 6 || !email) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const defaultName = nameParam || cleanEmail.split('@')[0];

      // 1. Verify OTP with Brevo backend API route
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          otpCode: cleanToken,
          name: defaultName,
          purpose: typeParam === 'signup' ? 'signup' : 'oauth_signup',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired 6-digit verification code.');
      }

      await refreshProfile();
      toast.success('Email Verified!', `Welcome to LabAssist, ${defaultName}!`);

      const resolvedRole = data.role || 'STUDENT';
      if (resolvedRole === 'ADMIN') {
        router.replace('/admin');
      } else if (resolvedRole === 'TECHNICIAN') {
        router.replace('/technician');
      } else {
        router.replace('/student');
      }
    } catch (err: any) {
      const msg = err?.message || 'Invalid or expired 6-digit verification code. Please check and try again.';
      setErrorMsg(msg);
      toast.error('Verification Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending || !email) return;
    setIsResending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: nameParam || cleanEmail.split('@')[0],
          purpose: typeParam === 'signup' ? 'signup' : 'oauth_signup',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch new verification code.');
      }

      setResendCooldown(60);
      setSuccessMsg(`A fresh verification code was sent to ${email} via Brevo.`);
      toast.success('Code Resent', 'Please check your email inbox.');
    } catch (err: any) {
      const msg = err?.message || 'Failed to resend code. Please try again in a few moments.';
      setErrorMsg(msg);
      toast.error('Resend Failed', msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-base flex flex-col justify-between" id="verify-otp-main">
      {/* Top Navbar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 nav-blur border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Back to LabAssist Home">
          <Image
            src="/UMakLabAssistLogo.png"
            alt="UMak LabAssist Logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain rounded-full drop-shadow-md group-hover:scale-105 transition-transform duration-300"
          />
          <div className="flex items-center">
            <span className="text-sm font-bold text-slate-100 tracking-tight">Lab</span>
            <span className="text-sm font-bold gradient-text tracking-tight">Assist</span>
          </div>
        </Link>

        <Link
          href="/auth"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {/* Main OTP Verification Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-8 border border-indigo-500/30 shadow-2xl space-y-6 animate-fade-in-up">
            {/* Header Icon */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto shadow-glow-indigo">
                <ShieldCheck size={24} />
              </div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Verify Your Account</h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Enter the 6-digit verification code sent to <br />
                <span className="text-indigo-300 font-mono font-semibold">{email || 'your email'}</span>
              </p>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs animate-shake" role="alert">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success banner */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs animate-fade-in" role="status">
                <Check size={15} className="flex-shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleVerify} className="space-y-4" noValidate>
              <div>
                <label htmlFor="verify-otp-0" className="block text-xs font-semibold text-slate-400 mb-2 text-center">
                  6-Digit OTP Code
                </label>
                <OtpInput
                  value={token}
                  onChange={val => {
                    setToken(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  hasError={!!errorMsg}
                  disabled={isSubmitting}
                  autoFocus={true}
                  idPrefix="verify-otp"
                />
              </div>

              <button
                type="submit"
                disabled={token.trim().length < 6 || isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2 shadow-glow-indigo transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size={16} className="text-white" />
                    <span>Activating Account…</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Verify &amp; Enter Portal</span>
                  </>
                )}
              </button>
            </form>

            {/* Resend Actions */}
            <div className="pt-2 flex flex-col items-center gap-3 text-xs border-t border-slate-800">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} className={isResending ? 'animate-spin' : ''} />
                <span>
                  {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
                </span>
              </button>

              <Link
                href="/auth"
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Use a different email address</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-4 text-xs text-slate-600">
        LabAssist Campus Infrastructure &amp; Security Services
      </div>
    </main>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-base flex flex-col items-center justify-center p-4">
        <LoadingSpinner size={28} className="text-indigo-400 mb-2" />
        <p className="text-xs text-slate-400 font-mono">Loading Verification Gateway…</p>
      </main>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}
