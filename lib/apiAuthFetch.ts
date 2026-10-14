import { supabase } from '@/lib/supabaseClient';

// Attach the signed-in user's Supabase access token to every same-origin /api/ request,
// so API routes can verify who is calling (see lib/serverAuth.ts).
// Installed once in the browser when AuthContext loads.

declare global {
  interface Window {
    __labassistApiAuthFetch__?: boolean;
  }
}

function isOwnApiRequest(url: string): boolean {
  if (url.startsWith('/api/')) return true;
  return url.startsWith(`${window.location.origin}/api/`);
}

export function installApiAuthFetch() {
  if (typeof window === 'undefined' || window.__labassistApiAuthFetch__) return;
  window.__labassistApiAuthFetch__ = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!isOwnApiRequest(url)) return originalFetch(input, init);

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Authorization')) {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers.set('Authorization', `Bearer ${token}`);
      } catch {
        // No session available: send the request unauthenticated
      }
    }
    return originalFetch(input, { ...init, headers });
  };
}
