import { createClient } from '@supabase/supabase-js';
import { RealtimeClient } from '@supabase/realtime-js';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

const supabaseUrlForDebugValue = import.meta.env.VITE_SUPABASE_URL || '(vazio)';
const shouldUseLocalSupabaseProxy = import.meta.env.VITE_SUPABASE_PROXY !== 'false';

const getSupabaseBaseUrl = () => {
  // In production on Netlify, route through a serverless function to avoid CORS and
  // to keep browser headers minimal (which can help avoid intermittent 520s).
  if (!import.meta.env.DEV && typeof window !== 'undefined') {
    const netlifyFnBase = new URL('/.netlify/functions/supabase', window.location.origin).toString();
    return netlifyFnBase;
  }
  // Optional: in dev, route Supabase traffic through the local Vite proxy (`/supabase`) to bypass CORS.
  if (shouldUseLocalSupabaseProxy && import.meta.env.DEV && typeof window !== 'undefined') {
    return new URL('/supabase', window.location.origin).toString();
  }
  return supabaseUrl;
};

const getDirectSupabaseBaseUrl = () => supabaseUrl;

export const isSupabaseConfigured = !!(supabaseUrlForDebugValue && supabaseAnonKey);
export const supabaseConfigError = isSupabaseConfigured
  ? ''
  : 'Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY';

export const supabaseUrlForDebug = supabaseUrlForDebugValue;
export const supabaseBaseUrlForDebug = getSupabaseBaseUrl();
export const isSupabaseUrlPlaceholder =
  !supabaseUrlForDebugValue || supabaseUrlForDebugValue.includes('example.supabase.co');

const looksLikeJwt = (value: string) => value.split('.').length === 3;
export const isSupabaseAnonKeyLikelyInvalid =
  !supabaseAnonKey ||
  supabaseAnonKey.startsWith('sb_secret_') ||
  // New Supabase key formats like sb_publishable_... are valid but are not JWTs.
  // The legacy anon key is JWT-like (eyJ...). Accept either.
  (!supabaseAnonKey.startsWith('sb_publishable_') && !looksLikeJwt(supabaseAnonKey));

export const supabaseAnonKeyHint = isSupabaseAnonKeyLikelyInvalid
  ? 'Sua VITE_SUPABASE_ANON_KEY parece invÃ¡lida para o supabase-js. Use a chave "Legacy anon" (formato JWT que comeÃ§a com "eyJ...") ou uma "sb_publishable_..." vÃ¡lida.'
  : '';

const noCookieFetch: typeof fetch = (input, init) => {
  // Avoid sending cookies to the local Vite server/proxy. Large Cookie headers can trigger 431/520 in dev.
  const nextInit: RequestInit = { ...(init ?? {}), credentials: 'omit' };
  if (nextInit.headers) {
    const headers = new Headers(nextInit.headers as HeadersInit);
    headers.delete('cookie');
    nextInit.headers = headers;
  }
  return fetch(input, nextInit);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const cloneHeaders = (headers?: HeadersInit) => {
  if (!headers) return undefined;
  const next = new Headers(headers);
  return next;
};

const tryRewriteProxyToDirect = (input: RequestInfo | URL): URL | null => {
  try {
    const base = getSupabaseBaseUrl();
    const directBase = getDirectSupabaseBaseUrl();
    if (!base || !directBase) return null;

    const inputUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url);
    const baseUrl = new URL(base);
    // Only rewrite when we are in dev proxy mode and the request is currently targeting /supabase on same origin.
    const isProxy =
      baseUrl.origin === inputUrl.origin &&
      baseUrl.pathname.replace(/\/$/, '') === '/supabase' &&
      inputUrl.pathname.startsWith('/supabase/');
    if (!isProxy) return null;

    const direct = new URL(directBase.replace(/\/$/, ''));
    direct.pathname = inputUrl.pathname.replace(/^\/supabase/, '');
    direct.search = inputUrl.search;
    return direct;
  } catch {
    return null;
  }
};

const retryableSupabaseFetch: typeof fetch = async (input, init) => {
  // Supabase is fronted by Cloudflare; transient 520/5xx can happen even when the project shows "Healthy".
  // Retrying GET/HEAD a couple of times makes the UI far more resilient.
  const method = `${init?.method || 'GET'}`.toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';
  const maxAttempts = canRetry ? 3 : 1;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await noCookieFetch(input, init);
      if (!canRetry) return resp;

      const status = resp.status;
      const shouldRetry = status === 520 || status === 502 || status === 503 || status === 504;
      if (!shouldRetry) return resp;

      // If the local dev proxy is the one receiving 520, try bypassing it once by hitting Supabase directly.
      // This provides a practical "just works" path when the proxy/origin edge is flaky.
      if (status === 520 && shouldUseLocalSupabaseProxy && import.meta.env.DEV) {
        const directUrl = tryRewriteProxyToDirect(input);
        if (directUrl) {
          const directInit: RequestInit = { ...(init ?? {}) };
          // Ensure we don't send cookies to Supabase either (not needed for anon key flows).
          directInit.credentials = 'omit';
          directInit.headers = cloneHeaders(directInit.headers);
          const directResp = await fetch(directUrl.toString(), directInit);
          // If direct call succeeded or at least returned a different status than the proxy 520, use it.
          if (directResp.status !== 520) return directResp;
        }
      }

      if (attempt < maxAttempts) {
        // Exponential backoff (small) to smooth edge/network blips.
        await sleep(250 * Math.pow(2, attempt - 1));
        continue;
      }

      return resp;
    } catch (err) {
      lastError = err;
      if (!canRetry || attempt >= maxAttempts) throw err;
      await sleep(250 * Math.pow(2, attempt - 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Supabase fetch failed');
};

const supabaseClient = createClient(
  getSupabaseBaseUrl() || 'https://example.supabase.co',
  supabaseAnonKey || 'missing-supabase-anon-key',
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
    global: {
      fetch: retryableSupabaseFetch,
    },
  }
);

// When base URL is a Netlify Function, Realtime must still use the direct Supabase endpoint (WebSockets).
// supabase-js doesn't currently expose an option to override realtime URL, so we patch it at runtime.
if (!import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    const wsUrl = `${supabaseUrl.replace(/\/$/, '').replace(/^https:/, 'wss:')}/realtime/v1`;
    (supabaseClient as any).realtime = new RealtimeClient(wsUrl, {
      params: { apikey: supabaseAnonKey || '' },
    });
  } catch {
    // ignore; app will fallback to REST polling only
  }
}

export const supabase = supabaseClient;
