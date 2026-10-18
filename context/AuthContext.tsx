'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isUmakEmail } from '@/lib/validators';
import { installApiAuthFetch } from '@/lib/apiAuthFetch';
import { clearSessionClock, rememberSignOutReason, staleReason } from '@/lib/sessionActivity';

// Every /api/ call from the browser carries the signed-in user's access token
installApiAuthFetch();

export type UserRole = 'STUDENT' | 'TECHNICIAN' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  department: string;
  requireLoginOtp?: boolean;
}

export interface LockoutInfo {
  isLocked: boolean;
  remainingMs: number;
  remainingMinutes: number;
  remainingSeconds: number;
  failedAttempts: number;
  attemptsLeft: number;
  lockedUntil: number | null;
  justLocked?: boolean;
}

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  requestSignupOtp: (name: string, email: string, password: string) => Promise<{ needOtp: boolean; user?: User }>;
  verifySignupOtp: (email: string, token: string, name: string, password?: string) => Promise<User>;
  resendSignupOtp: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyPasswordResetOtp: (email: string, token: string) => Promise<void>;
  updateNewPassword: (newPassword: string, email?: string) => Promise<void>;
  checkLockoutStatus: (email: string) => Promise<LockoutInfo>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleIdToken: (idToken: string) => Promise<{ user?: User; isNewUser: boolean; requireOtp?: boolean; email?: string; name?: string }>;
  completeGoogleSignupWithPassword: (password: string) => Promise<User>;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  promoteUser: (emailOrId: string, newRole: UserRole) => Promise<void>;
  demoteUser: (emailOrId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: { name?: string; department?: string; avatar?: string }) => Promise<User>;
  toggleLoginOtp: (enabled: boolean) => Promise<boolean>;
  requestLoginOtp: (email: string, name?: string) => Promise<void>;
  verifyLoginOtp: (email: string, token: string, password?: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY_USER = 'labassist_active_user';
const STORAGE_KEY_PROMOTIONS = 'labassist_user_promotions';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_USER);
        if (saved) return JSON.parse(saved);
      } catch { }
    }
    return null;
  });
  const [promotions, setPromotions] = useState<Record<string, UserRole>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Helper to construct initials avatar
  const getInitials = (nameOrEmail: string) => {
    const parts = nameOrEmail.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameOrEmail.substring(0, 2).toUpperCase();
  };

  const saveUserSession = (u: User | null) => {
    setUser(u);
    if (typeof window !== 'undefined') {
      if (u) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    }
  };

  // Proof of a verified password-reset OTP, required by /api/update-password
  const resetTokenRef = useRef<string | null>(null);

  // Fetch or create profile in Supabase
  const fetchUserProfile = async (supabaseUser: any): Promise<User> => {
    if (!supabaseUser) throw new Error('No Supabase user found');

    const email = (supabaseUser.email || '').toLowerCase();
    const metadata = supabaseUser.user_metadata || {};
    const defaultName = metadata.full_name || metadata.name || email.split('@')[0].replace('.', ' ');

    // 1. Try public.profiles table
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (data && !error) {
        // The role is whatever the database says; it is only changed server-side (Admin Console / allowlist)
        const effectiveRole = ((data.role as UserRole) || 'STUDENT');

        const requireLoginOtp = supabaseUser.app_metadata?.require_login_otp === true;

        return {
          id: data.id,
          name: data.name || data.full_name || defaultName,
          email: data.email || email,
          role: effectiveRole,
          avatar: data.avatar || getInitials(data.name || defaultName),
          department: data.department || metadata.department || 'Undergraduate Engineering',
          requireLoginOtp: !!requireLoginOtp,
        };
      }
    } catch {
      // Continue to next check
    }

    // 2. New user — NOT yet verified via OTP. Return a skeleton profile without
    //    writing to the database. The /auth/callback page and /auth/verify-otp page
    //    own new-user record creation AFTER OTP is confirmed.
    return {
      id: supabaseUser.id,
      email,
      name: defaultName,
      role: 'STUDENT' as UserRole,
      avatar: getInitials(defaultName),
      department: metadata.department || 'Undergraduate Engineering',
      requireLoginOtp: supabaseUser.app_metadata?.require_login_otp === true,
    };
  };

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        if (typeof window !== 'undefined') {
          const savedPromotions = localStorage.getItem(STORAGE_KEY_PROMOTIONS);
          if (savedPromotions) {
            setPromotions(JSON.parse(savedPromotions));
          }
        }

        // Check active Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        const onAuthPages = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth');
        // Coming back after the browser/PC was closed: a session idle for 30 min (or older than
        // 12 h) is ended here, before anything is shown
        const stale = session?.user ? staleReason() : null;
        if (stale) {
          await supabase.auth.signOut({ scope: 'local' });
          clearSessionClock();
          rememberSignOutReason(stale);
          if (isMounted) saveUserSession(null);
          return;
        }
        if (session?.user && isMounted) {
          const userProfile = await fetchUserProfile(session.user);

          // A two-factor account whose session never passed its code is not signed in
          // (the /auth pages are where that code gets entered, so leave those alone)
          if (userProfile.requireLoginOtp && !onAuthPages) {
            const check = await fetch('/api/user/profile', { cache: 'no-store' }).catch(() => null);
            const body = check && !check.ok ? await check.json().catch(() => ({})) : {};
            if (body?.code === 'second_factor_required') {
              await supabase.auth.signOut();
              saveUserSession(null);
              return;
            }
          }

          saveUserSession(userProfile);
        } else if (isMounted) {
          // A login is only valid with a real Supabase session; drop any stale/edited local copy
          clearSessionClock();
          saveUserSession(null);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    }

    initSession();

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip setting user session when on the OAuth callback page —
      // that page owns routing for new vs existing users.
      const isOnCallbackPage =
        typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback');

      if (isOnCallbackPage) {
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        try {
          const profile = await fetchUserProfile(session.user);
          // Only persist session if the user has a verified DB record
          const hasRecord =
            !!(await supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle()).data;
          // The session may have been ended meanwhile (e.g. the idle sign-out on page load)
          const stillSignedIn = !!(await supabase.auth.getSession()).data.session;
          if (hasRecord && stillSignedIn) {
            saveUserSession(profile);
          }
        } catch {
          // Fallback
        }
      } else if (event === 'SIGNED_OUT') {
        clearSessionClock();
        saveUserSession(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const profile = await fetchUserProfile(currentUser);
      saveUserSession(profile);
    }
  }, []);

  // Helper to check lockout status from server
  const checkLockoutStatus = useCallback(async (email: string): Promise<LockoutInfo> => {
    try {
      const res = await fetch('/api/auth/lockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), action: 'check' }),
      });
      const data = await res.json();
      if (data && data.success) {
        return data;
      }
    } catch { }
    return {
      isLocked: false,
      remainingMs: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      failedAttempts: 0,
      attemptsLeft: 6,
      lockedUntil: null,
    };
  }, []);

  // Password sign-in runs on the server (/api/auth/signin), which enforces the lockout and counts
  // failures from real password checks; the returned Supabase session is then installed here.
  const passwordSignIn = useCallback(async (email: string, password: string, otpCode?: string) => {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, ...(otpCode ? { otpCode } : {}) }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success || !data.session) {
      if (data.code === 'otp_required') {
        // Password was correct; the account uses two-factor login and a code was emailed
        const err: any = new Error(data.error || 'Enter the verification code sent to your email.');
        err.otpRequired = true;
        err.codeSent = !!data.codeSent;
        throw err;
      }
      if (data.code === 'locked') {
        const err: any = new Error(
          'Account temporarily locked. Your account will automatically unlock when the timer expires.'
        );
        err.isLocked = true;
        err.lockedUntil = data.lockedUntil;
        err.remainingSeconds = data.remainingSeconds || 900;
        throw err;
      }
      if (data.code === 'invalid_credentials') {
        const remaining = data.attemptsLeft ?? 5;
        const err: any = new Error(
          `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining`
        );
        err.attemptsLeft = remaining;
        throw err;
      }
      throw new Error(data.error || 'Sign in failed. Please try again.');
    }

    const { data: sessionData, error } = await supabase.auth.setSession(data.session);
    if (error || !sessionData.user) throw new Error(error?.message || 'Could not start your session.');
    return sessionData.user;
  }, []);

  // Standard user sign in
  const signIn = useCallback(async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      // Any existing account may sign in (registration is what's limited to @umak.edu.ph)
      const authUser = await passwordSignIn(email, password);
      const profile = await fetchUserProfile(authUser);
      saveUserSession(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  }, [passwordSignIn]);

  // Request Email OTP for Sign Up via Brevo
  const requestSignupOtp = useCallback(async (name: string, email: string, password: string): Promise<{ needOtp: boolean; user?: User }> => {
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim() || trimmedEmail.split('@')[0];

      // Enforce @umak.edu.ph domain validation
      if (!isUmakEmail(trimmedEmail)) {
        throw new Error('Access restricted: Only @umak.edu.ph email addresses are authorized to register.');
      }

      // Dispatch Brevo OTP via API (the server refuses if the email is already registered)
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, name: trimmedName, purpose: 'signup' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification code via Brevo.');
      }

      return { needOtp: true };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify Email OTP for Sign Up via Brevo & Complete Registration
  const verifySignupOtp = useCallback(async (email: string, token: string, name: string, password?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedToken = token.trim();
      const trimmedName = name.trim() || trimmedEmail.split('@')[0];

      // Verify OTP and create/activate account directly via server
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          otpCode: trimmedToken,
          name: trimmedName,
          password,
          purpose: 'signup',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired verification code.');
      }

      // Sign in the newly created account to get a real session
      if (!password) {
        throw new Error('Account created. Please sign in with your new password.');
      }
      return await signIn(trimmedEmail, password);
    } finally {
      setIsLoading(false);
    }
  }, [signIn]);

  // Resend Sign Up OTP Code via Brevo
  const resendSignupOtp = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, purpose: 'signup' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend verification code.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Step 1: Request Password Recovery Code via Brevo
  const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Any existing account (including staff accounts outside @umak.edu.ph) can recover its password;
      // the code only goes to the account's own inbox
      const lower = email.trim().toLowerCase();

      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lower, purpose: 'password_reset' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to send recovery code via Brevo.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Step 2: Verify Recovery OTP Code via Brevo
  const verifyPasswordResetOtp = useCallback(async (email: string, token: string): Promise<void> => {
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          otpCode: token.trim(),
          purpose: 'password_reset',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired recovery code.');
      }
      resetTokenRef.current = data.resetToken || null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Step 3: Update to New Password (called after OTP has already been verified)
  const updateNewPassword = useCallback(async (newPassword: string, email?: string): Promise<void> => {
    setIsLoading(true);
    try {
      if (email) {
        // Recovery flow: the server only accepts the token issued when the recovery OTP was verified
        // (it also clears any lockout on the account)
        if (!resetTokenRef.current) {
          throw new Error('Please verify your recovery code first.');
        }
        const res = await fetch('/api/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resetToken: resetTokenRef.current,
            newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update password. Please try again.');
        }
        resetTokenRef.current = null;
      } else {
        // Fallback: update via active Supabase session (e.g. after OAuth token)
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Standard user sign up -> fallback direct signup
  const signUp = useCallback(async (name: string, email: string, password: string): Promise<User> => {
    const res = await requestSignupOtp(name, email, password);
    if (!res.needOtp && res.user) {
      return res.user;
    }
    throw new Error('OTP verification required');
  }, [requestSignupOtp]);

  // Google OAuth sign in (Restricts to @umak.edu.ph accounts)
  const signInWithGoogle = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

      // Obtain an AES-256-GCM encrypted CSRF state token from the server.
      // This prevents login-CSRF and redirect-injection attacks on the OAuth flow.
      let oauthState: string | undefined;
      try {
        const stateRes = await fetch('/api/auth/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnUrl: redirectUrl }),
        });
        if (stateRes.ok) {
          const { state } = await stateRes.json();
          oauthState = state;
        }
      } catch {
        // Non-fatal: proceed without state if server is unreachable during generation
        console.warn('[signInWithGoogle] Could not generate encrypted OAuth state token.');
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: 'umak.edu.ph',
            ...(oauthState ? { state: oauthState } : {}),
          },
        },
      });

      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);


  // Google GIS ID-Token sign in (used by GoogleButton via GIS popup — no Supabase redirect URL shown)
  const signInWithGoogleIdToken = useCallback(async (idToken: string): Promise<{ user?: User; isNewUser: boolean; requireOtp?: boolean; email?: string; name?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
      if (!data.user) throw new Error('Failed to retrieve user information from Google.');

      const email = (data.user.email || '').toLowerCase().trim();

      // Check if profile exists
      const { data: profileRow } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle();

      // Non-UMak Google accounts may only sign in to accounts that already exist (e.g. staff added by an admin)
      if (!isUmakEmail(email) && !profileRow) {
        await supabase.auth.signOut();
        throw new Error('Access restricted: Only Google accounts with the @umak.edu.ph domain are authorized.');
      }

      // Lockout bypass check
      const lockStatus = await checkLockoutStatus(email);
      if (lockStatus.isLocked) {
        await supabase.auth.signOut();
        const err: any = new Error('Account temporarily locked. Your account will automatically unlock when the timer expires.');
        err.isLocked = true;
        err.lockedUntil = lockStatus.lockedUntil;
        err.remainingSeconds = lockStatus.remainingSeconds;
        throw err;
      }

      const isNewUser = !profileRow;
      const fullName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0];

      if (isNewUser) {
        return {
          isNewUser: true,
          email,
          name: fullName,
        };
      }

      const profile = await fetchUserProfile(data.user);

      // Check if user account has OTP required on login
      const isOtpRequired = data.user.app_metadata?.require_login_otp === true;

      if (isOtpRequired) {
        // Dispatch Brevo OTP email for login
        try {
          await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: fullName, purpose: 'login' }),
          });
        } catch (err) {
          console.warn('[signInWithGoogleIdToken] OTP dispatch warning:', err);
        }

        return {
          user: profile,
          isNewUser: false,
          requireOtp: true,
          email,
          name: fullName,
        };
      }

      saveUserSession(profile);

      // ── Feature D: Store AES-256-GCM encrypted Google ID token at rest ──
      // Dispatched in the background — does not block routing or sign-in UX.
      fetch('/api/auth/store-google-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, userId: data.user.id }),
      }).catch((err) =>
        console.warn('[signInWithGoogleIdToken] Non-critical: failed to persist encrypted token:', err)
      );

      return {
        user: profile,
        isNewUser: false,
        requireOtp: false,
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile, saveUserSession, checkLockoutStatus]);

  // Complete first-time Google signup by asking user for a custom password
  const completeGoogleSignupWithPassword = useCallback(async (password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('No active Google session found.');

      // Update manual sign-in password
      const { error: pwdError } = await supabase.auth.updateUser({ password });
      if (pwdError) throw pwdError;

      const email = (currentUser.email || '').toLowerCase().trim();
      const fullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || email.split('@')[0];

      // Upsert the profile record (the database decides the role for new accounts)
      await supabase.from('profiles').upsert({
        id: currentUser.id,
        email,
        name: fullName,
        role: 'STUDENT',
        department: 'Undergraduate Engineering',
      });

      const profile = await fetchUserProfile(currentUser);
      saveUserSession(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile, saveUserSession]);


  // Admin Login: admin accounts are regular Supabase accounts whose profile role is ADMIN.
  // The password check, lockout and failure counting all happen in /api/auth/signin.
  const adminLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      let authUser;
      try {
        authUser = await passwordSignIn(username, password);
      } catch (err: any) {
        if (err?.isLocked) throw err;
        if (err?.attemptsLeft !== undefined) {
          const remaining = err.attemptsLeft;
          throw new Error(`Invalid Administrator Credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
        }
        throw err;
      }

      const profile = await fetchUserProfile(authUser);
      if (profile.role !== 'ADMIN') {
        // Valid credentials but not an admin: don't leave a session open from the admin portal
        await supabase.auth.signOut();
        throw new Error('This account does not have administrator access.');
      }

      saveUserSession(profile);
      return true;
    } finally {
      setIsLoading(false);
    }
  }, [passwordSignIn]);

  // Admin Promotion Workflow: Updates state, local storage & Supabase profiles
  const promoteUser = useCallback(async (emailOrId: string, newRole: UserRole) => {
    setPromotions(prev => {
      const updated = { ...prev, [emailOrId]: newRole };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_PROMOTIONS, JSON.stringify(updated));
      }
      return updated;
    });

    // The database role itself is changed server-side by POST /api/admin/users
    setUser(current => {
      if (current && (current.email === emailOrId || current.id === emailOrId)) {
        const updated = { ...current, role: newRole };
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
        }
        return updated;
      }
      return current;
    });
  }, []);

  const demoteUser = useCallback(async (emailOrId: string) => {
    await promoteUser(emailOrId, 'STUDENT');
  }, [promoteUser]);

  // Update user profile details (Name, Department, Avatar)
  const updateProfile = useCallback(async (updates: { name?: string; department?: string; avatar?: string }): Promise<User> => {
    setIsLoading(true);
    try {
      if (!user) throw new Error('No active user session found.');

      const newName = updates.name !== undefined ? updates.name.trim() : user.name;
      const newDept = updates.department !== undefined ? updates.department.trim() : user.department;
      const newAvatar = updates.avatar !== undefined ? updates.avatar : getInitials(newName);

      // 1. Call server API
      try {
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            name: newName,
            department: newDept,
            avatar: newAvatar,
          }),
        });
      } catch (err) {
        console.warn('[updateProfile] API call warning:', err);
      }

      // 2. Direct Supabase update if possible
      try {
        await supabase
          .from('profiles')
          .update({
            name: newName,
            department: newDept,
            avatar: newAvatar,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      } catch { }

      try {
        await supabase.auth.updateUser({
          data: {
            name: newName,
            full_name: newName,
            department: newDept,
          },
        });
      } catch { }

      const updatedUser: User = {
        ...user,
        name: newName,
        department: newDept,
        avatar: newAvatar,
      };

      saveUserSession(updatedUser);
      return updatedUser;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Toggle require OTP on login
  const toggleLoginOtp = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (!user) throw new Error('No active user session found.');

    try {
      // 1. Update via server API (the setting lives in server-only app_metadata)
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requireLoginOtp: enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Could not update two-factor login. Please try again.');
      }

      // 2. Refresh the token so it carries the new setting (same session, so it stays verified)
      try {
        await supabase.auth.refreshSession();
      } catch { }

      // 3. Update active session
      const updatedUser: User = {
        ...user,
        requireLoginOtp: enabled,
      };
      saveUserSession(updatedUser);

      return enabled;
    } catch (err: any) {
      console.error('[toggleLoginOtp] Error:', err);
      throw err;
    }
  }, [user]);


  // Request OTP for login
  const requestLoginOtp = useCallback(async (email: string, name?: string): Promise<void> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: name || cleanEmail.split('@')[0],
          purpose: 'login',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch login verification code.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify OTP for login and finalize session
  const verifyLoginOtp = useCallback(async (email: string, token: string, password?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Password login: the server checks password + code together before issuing the session
      if (password) {
        const authUser = await passwordSignIn(cleanEmail, password, token.trim());
        const profile = await fetchUserProfile(authUser);
        saveUserSession(profile);
        return profile;
      }

      // Google login: the session already exists; verifying the code marks it as two-factor verified
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          otpCode: token.trim(),
          purpose: 'login',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired verification code.');
      }

      // Check current session
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const profile = await fetchUserProfile(currentUser);
        saveUserSession(profile);
        return profile;
      }

      // A verified code alone is not a login: a real Supabase session is required
      throw new Error('Code verified, but your session has expired. Please sign in again.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile, passwordSignIn]);

  const signOut = useCallback(async () => {
    try {
      // 'local' ends this browser's session only (the default would also sign out other devices)
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore
    }
    clearSessionClock();
    saveUserSession(null);
  }, []);

  const activeRole: UserRole = user?.role || 'STUDENT';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: activeRole,
        isAuthenticated: !!user,
        isLoading: !isInitialized || isLoading,
        signIn,
        signUp,
        requestSignupOtp,
        verifySignupOtp,
        resendSignupOtp,
        requestPasswordReset,
        verifyPasswordResetOtp,
        updateNewPassword,
        checkLockoutStatus,
        signInWithGoogle,
        signInWithGoogleIdToken,
        completeGoogleSignupWithPassword,
        adminLogin,
        promoteUser,
        demoteUser,
        signOut,
        refreshProfile,
        updateProfile,
        toggleLoginOtp,
        requestLoginOtp,
        verifyLoginOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

