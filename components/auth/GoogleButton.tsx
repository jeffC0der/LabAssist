'use client';
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

// ─── GIS type declarations ────────────────────────────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            hosted_domain?: string;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleButtonProps {
  onNewGoogleUser?: (email: string, name: string) => void;
}

/**
 * GoogleButton mounts Google Identity Services (GIS) button directly.
 * Clicking the button opens Google's native popup window anchored to YOUR domain
 * (localhost / vercel domain) rather than redirecting through supabase.co.
 *
 * The resulting ID Token is passed to Supabase via signInWithIdToken.
 */
export default function GoogleButton({ onNewGoogleUser }: GoogleButtonProps) {
  const { signInWithGoogleIdToken, isLoading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isGisReady, setIsGisReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Credential callback from GIS popup ────────────────────────────────────
  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      if (!response.credential) return;
      setIsSubmitting(true);
      try {
        const result = await signInWithGoogleIdToken(response.credential);
        
        if (result.isNewUser) {
          toast.info('Setup Manual Password', 'Please create a password for your account to complete registration.');
          if (onNewGoogleUser) {
            onNewGoogleUser(result.email || '', result.name || '');
          }
          return;
        }

        const loggedInUser = result.user!;
        toast.success('Welcome back!', `Signed in as ${loggedInUser.name || loggedInUser.email}`);
        if (loggedInUser.role === 'ADMIN') {
          router.push('/admin');
        } else if (loggedInUser.role === 'TECHNICIAN') {
          router.push('/technician');
        } else {
          router.push('/student');
        }
      } catch (err: any) {
        const msg = err?.message ?? 'Google sign-in failed. Please check your account and try again.';
        toast.error('Google sign-in failed', msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [signInWithGoogleIdToken, toast, router]
  );

  // ── Initialize GIS and render the Google button ───────────────────────────
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('[GoogleButton] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.');
      return;
    }

    const setupButton = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          hosted_domain: 'umak.edu.ph',
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Clear existing children before rendering
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Render official GIS button with container width (up to 384px)
        const containerWidth = Math.min(
          Math.max(containerRef.current.offsetWidth || 384, 280),
          384
        );

        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: containerWidth,
          locale: 'en',
        });

        setIsGisReady(true);
      } catch (err) {
        console.error('[GoogleButton] GIS render error:', err);
      }
    };

    if (window.google?.accounts?.id) {
      setupButton();
    } else {
      const script = document.querySelector<HTMLScriptElement>(
        'script[src*="accounts.google.com/gsi/client"]'
      );
      if (script) {
        script.addEventListener('load', setupButton);
        return () => script.removeEventListener('load', setupButton);
      }
    }
  }, [handleCredential]);

  const isLoading = authLoading || isSubmitting;

  return (
    <div className="w-full flex flex-col items-center relative">
      {/* GIS Button Target Container */}
      <div
        ref={containerRef}
        className={`w-full flex justify-center items-center transition-opacity duration-200 ${
          isGisReady && !isLoading ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        }`}
        style={{ minHeight: '44px' }}
      />

      {/* Loading / Fallback placeholder */}
      {(!isGisReady || isLoading) && (
        <div className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-slate-800 font-semibold text-sm border border-slate-200 shadow-md">
          <LoadingSpinner size={18} className="text-slate-600" label="Connecting with Google..." />
          <span>{isLoading ? 'Connecting to Google…' : 'Loading Google sign-in…'}</span>
        </div>
      )}
    </div>
  );
}
