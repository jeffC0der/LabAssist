'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isUmakEmail } from '@/lib/validators';

export type UserRole = 'STUDENT' | 'TECHNICIAN' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  department: string;
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
  signInWithGoogleIdToken: (idToken: string) => Promise<{ user?: User; isNewUser: boolean; email?: string; name?: string }>;
  completeGoogleSignupWithPassword: (password: string) => Promise<User>;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  promoteUser: (emailOrId: string, newRole: UserRole) => Promise<void>;
  demoteUser: (emailOrId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
      } catch {}
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

  // Resolve effective role: check allowlist for TECHNICIAN, then DB record, then default
  const resolveRole = async (email: string, fallbackRole: UserRole): Promise<UserRole> => {
    const lowerEmail = (email || '').toLowerCase().trim();

    // 1. Root admin email identification
    if (
      lowerEmail === 'labadmin@gmail.com' ||
      lowerEmail === 'labadmin@campus.edu' ||
      lowerEmail === 'labadmin' ||
      lowerEmail === 'admin@campus.edu'
    ) {
      return 'ADMIN';
    }

    // 2. Preserve existing verified ADMIN role from DB/session
    if (fallbackRole === 'ADMIN') {
      return 'ADMIN';
    }

    // 3. Check technician allowlist
    try {
      const { data: wl, error } = await supabase
        .from('whitelisted_technicians')
        .select('email')
        .eq('email', lowerEmail)
        .maybeSingle();
      if (!error && wl) return 'TECHNICIAN';
    } catch {
      // Table may not exist yet — fall through
    }

    return fallbackRole || 'STUDENT';
  };

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
        // Re-resolve role via allowlist while preserving ADMIN if already assigned
        const effectiveRole = await resolveRole(email, (data.role as UserRole) || 'STUDENT');

        // Sync role back to DB if allowlist overrides stored role
        if (effectiveRole !== data.role) {
          try {
            await supabase.from('profiles').update({ role: effectiveRole, updated_at: new Date().toISOString() }).eq('id', supabaseUser.id);
          } catch {}
        }

        return {
          id: data.id,
          name: data.name || data.full_name || defaultName,
          email: data.email || email,
          role: effectiveRole,
          avatar: data.avatar || getInitials(data.name || defaultName),
          department: data.department || 'Undergraduate Engineering',
        };
      }
    } catch {
      // Continue to next check
    }

    // 2. Try public.users table if profiles table is empty/missing
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (userData && !userError) {
        const effectiveRole = await resolveRole(email, (userData.role as UserRole) || 'STUDENT');
        return {
          id: userData.id,
          name: userData.full_name || userData.name || defaultName,
          email: userData.email || email,
          role: effectiveRole,
          avatar: userData.avatar || getInitials(userData.full_name || defaultName),
          department: userData.department || 'Undergraduate Engineering',
        };
      }
    } catch {
      // Continue to upsert
    }

    // 3. New user — NOT yet verified via OTP. Return a skeleton profile without
    //    writing to the database. The /auth/callback page and /auth/verify-otp page
    //    own new-user record creation AFTER OTP is confirmed.
    return {
      id: supabaseUser.id,
      email,
      name: defaultName,
      role: 'STUDENT' as UserRole,
      avatar: getInitials(defaultName),
      department: 'Undergraduate Engineering',
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
        if (session?.user && isMounted) {
          const userProfile = await fetchUserProfile(session.user);
          saveUserSession(userProfile);
        } else if (typeof window !== 'undefined') {
          // Check if root admin or guest session was stored
          const savedUser = localStorage.getItem(STORAGE_KEY_USER);
          if (savedUser && isMounted) {
            setUser(JSON.parse(savedUser));
          }
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
            !!(await supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle()).data ||
            !!(await supabase.from('users').select('id').eq('id', session.user.id).maybeSingle()).data;
          if (hasRecord) {
            saveUserSession(profile);
          }
        } catch {
          // Fallback
        }
      } else if (event === 'SIGNED_OUT') {
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
    } catch {}
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

  // Helper to report failed login attempt to server
  const reportFailedAttempt = useCallback(async (email: string, name?: string): Promise<any> => {
    try {
      const res = await fetch('/api/auth/lockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), action: 'record_failure', name }),
      });
      return await res.json();
    } catch {}
    return null;
  }, []);

  // Helper to reset lockout upon success
  const reportSuccessfulLogin = useCallback(async (email: string): Promise<void> => {
    try {
      await fetch('/api/auth/lockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), action: 'record_success' }),
      });
    } catch {}
  }, []);

  // Standard user sign in
  const signIn = useCallback(async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const lowerEmail = email.trim().toLowerCase();

      // 1. Proactive Lockout Check: Block login if account is temporarily locked (15 minutes)
      const lockStatus = await checkLockoutStatus(lowerEmail);
      if (lockStatus.isLocked) {
        const err: any = new Error(
          'Account temporarily locked. Your account will automatically unlock when the timer expires.'
        );
        err.isLocked = true;
        err.lockedUntil = lockStatus.lockedUntil;
        err.remainingSeconds = lockStatus.remainingSeconds;
        throw err;
      }

      // Unified Root Admin Credentials check: labadmin@gmail.com / labadmin32
      if (
        (lowerEmail === 'labadmin@gmail.com' ||
         lowerEmail === 'labadmin@campus.edu' ||
         lowerEmail === 'labadmin') &&
        password === 'labadmin32'
      ) {
        await reportSuccessfulLogin(lowerEmail);
        try {
          const { data } = await supabase.auth.signInWithPassword({
            email: lowerEmail === 'labadmin' ? 'labadmin@gmail.com' : lowerEmail,
            password,
          });
          if (data?.user) {
            const profile = await fetchUserProfile(data.user);
            const adminProfile = { ...profile, role: 'ADMIN' as UserRole };
            saveUserSession(adminProfile);
            return adminProfile;
          }
        } catch {
          // Fallback to local admin root session if not in Supabase yet
        }

        const adminUser: User = {
          id: 'USR-ROOT-ADMIN',
          name: 'Lab Operations Admin',
          email: lowerEmail === 'labadmin' ? 'labadmin@gmail.com' : lowerEmail,
          role: 'ADMIN',
          avatar: 'AD',
          department: 'Campus Infrastructure & Security',
        };
        saveUserSession(adminUser);
        return adminUser;
      }

      // Enforce @umak.edu.ph domain validation
      if (!isUmakEmail(lowerEmail) && lowerEmail !== 'labadmin' && lowerEmail !== 'labadmin@gmail.com') {
        throw new Error('Access restricted: Only @umak.edu.ph email addresses are authorized to sign in.');
      }

      // Standard Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        // Record failed attempt on server (triggers Brevo email on 6th failed attempt)
        const failResult = await reportFailedAttempt(lowerEmail);

        if (failResult?.isLocked) {
          const err: any = new Error(
            'Account temporarily locked. Your account will automatically unlock when the timer expires.'
          );
          err.isLocked = true;
          err.lockedUntil = failResult.lockedUntil;
          err.remainingSeconds = failResult.remainingSeconds || 900;
          throw err;
        }

        const remaining = failResult?.attemptsLeft ?? 5;
        const err: any = new Error(
          `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining`
        );
        err.attemptsLeft = remaining;
        throw err;
      }

      // Clear any failed attempts on successful sign in
      await reportSuccessfulLogin(lowerEmail);

      const profile = await fetchUserProfile(data.user);
      saveUserSession(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  }, [checkLockoutStatus, reportFailedAttempt, reportSuccessfulLogin]);

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

      // Check if user already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (existingProfile) {
        throw new Error('An account with this email address already exists.');
      }

      // Dispatch Brevo OTP via API
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

      // Sign in the newly created account
      if (password) {
        return await signIn(trimmedEmail, password);
      }

      const resolvedRole = data.role || (await resolveRole(trimmedEmail, 'STUDENT'));
      const newUser: User = {
        id: 'usr-' + Date.now(),
        name: trimmedName,
        email: trimmedEmail,
        role: resolvedRole,
        avatar: getInitials(trimmedName),
        department: 'Undergraduate Engineering',
      };
      saveUserSession(newUser);
      return newUser;
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
      const lower = email.trim().toLowerCase();
      if (!isUmakEmail(lower)) {
        throw new Error('Access restricted: Only @umak.edu.ph email addresses are supported for password recovery.');
      }

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
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Step 3: Update to New Password (called after OTP has already been verified)
  const updateNewPassword = useCallback(async (newPassword: string, email?: string): Promise<void> => {
    setIsLoading(true);
    try {
      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        // Use the dedicated update-password endpoint (admin-level, no OTP re-check needed)
        const res = await fetch('/api/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update password. Please try again.');
        }
        // Unlock account and reset failed attempts
        await reportSuccessfulLogin(cleanEmail);
      } else {
        // Fallback: update via active Supabase session (e.g. after OAuth token)
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }
    } finally {
      setIsLoading(false);
    }
  }, [reportSuccessfulLogin]);

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
  const signInWithGoogleIdToken = useCallback(async (idToken: string): Promise<{ user?: User; isNewUser: boolean; email?: string; name?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
      if (!data.user) throw new Error('Failed to retrieve user information from Google.');

      const email = (data.user.email || '').toLowerCase().trim();
      const isAdmin = email === 'labadmin@gmail.com' || email === 'labadmin@campus.edu';

      if (!isAdmin && !isUmakEmail(email)) {
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

      // Check if profile exists
      const [{ data: profileRow }, { data: userRow }] = await Promise.all([
        supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle(),
        supabase.from('users').select('id').eq('id', data.user.id).maybeSingle(),
      ]);

      const isNewUser = !profileRow && !userRow;
      const fullName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0];

      if (isNewUser) {
        return {
          isNewUser: true,
          email,
          name: fullName,
        };
      }

      const profile = await fetchUserProfile(data.user);
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

      // Upsert user profile records
      await Promise.all([
        supabase.from('profiles').upsert({
          id: currentUser.id,
          email,
          name: fullName,
          role: 'STUDENT',
          department: 'Undergraduate Engineering',
        }),
        supabase.from('users').upsert({
          id: currentUser.id,
          email,
          full_name: fullName,
          role: 'STUDENT',
        }),
      ]);

      const profile = await fetchUserProfile(currentUser);
      saveUserSession(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile, saveUserSession]);


  // Root Admin Login
  const adminLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 400));

    const lower = username.trim().toLowerCase();

    // Check lockout first
    const lockStatus = await checkLockoutStatus(lower);
    if (lockStatus.isLocked) {
      setIsLoading(false);
      const err: any = new Error('Account temporarily locked. Your account will automatically unlock when the timer expires.');
      err.isLocked = true;
      err.lockedUntil = lockStatus.lockedUntil;
      err.remainingSeconds = lockStatus.remainingSeconds;
      throw err;
    }

    if (
      (lower === 'labadmin' || lower === 'labadmin@gmail.com' || lower === 'labadmin@campus.edu') &&
      password === 'labadmin32'
    ) {
      await reportSuccessfulLogin(lower);
      const adminUser: User = {
        id: 'USR-ROOT-ADMIN',
        name: 'Lab Operations Admin',
        email: lower === 'labadmin' ? 'labadmin@gmail.com' : lower,
        role: 'ADMIN',
        avatar: 'AD',
        department: 'Campus Infrastructure & Security',
      };
      saveUserSession(adminUser);
      setIsLoading(false);
      return true;
    }

    // Also attempt Supabase sign in for admin
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: username, password });
      if (!error && data.user) {
        const profile = await fetchUserProfile(data.user);
        if (profile.role === 'ADMIN') {
          await reportSuccessfulLogin(lower);
          saveUserSession(profile);
          setIsLoading(false);
          return true;
        }
      }
    } catch {
      // Ignore
    }

    // Record failed attempt
    const failResult = await reportFailedAttempt(lower);
    setIsLoading(false);

    if (failResult?.isLocked) {
      throw new Error('Account temporarily locked. Your account will automatically unlock when the timer expires.');
    }

    const remaining = failResult?.attemptsLeft ?? 5;
    throw new Error(`Invalid Administrator Credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
  }, [checkLockoutStatus, reportFailedAttempt, reportSuccessfulLogin]);

  // Admin Promotion Workflow: Updates state, local storage & Supabase profiles
  const promoteUser = useCallback(async (emailOrId: string, newRole: UserRole) => {
    setPromotions(prev => {
      const updated = { ...prev, [emailOrId]: newRole };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_PROMOTIONS, JSON.stringify(updated));
      }
      return updated;
    });

    try {
      // Sync to Supabase profiles
      await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .or(`id.eq.${emailOrId},email.eq.${emailOrId}`);
    } catch {
      // Ignore
    }

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

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
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

