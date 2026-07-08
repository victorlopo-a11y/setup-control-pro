import { createClient } from '@supabase/supabase-js';
import { RealtimeClient } from '@supabase/realtime-js';

const supabaseAnonKey = `${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`.trim();
const supabaseUrl = `${import.meta.env.VITE_SUPABASE_URL || ''}`.trim().replace(/\/$/, '');

const supabaseUrlForDebugValue = supabaseUrl || '(vazio)';
// Direct mode is the most reliable option for Auth, REST and Realtime. The proxy remains available
// only as an explicit escape hatch for environments with a confirmed network/CORS restriction.
const shouldUseSupabaseProxy = import.meta.env.VITE_SUPABASE_PROXY === 'true';

const getSupabaseBaseUrl = () => {
  if (shouldUseSupabaseProxy && !import.meta.env.DEV && typeof window !== 'undefined') {
    const netlifyFnBase = new URL('/.netlify/functions/supabase', window.location.origin).toString();
    return netlifyFnBase;
  }
  if (shouldUseSupabaseProxy && import.meta.env.DEV && typeof window !== 'undefined') {
    return new URL('/supabase', window.location.origin).toString();
  }
  return supabaseUrl;
};

const getDirectSupabaseBaseUrl = () => supabaseUrl;

const isValidSupabaseUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl);
export const isSupabaseConfigured = isValidSupabaseUrl && !!supabaseAnonKey;
export const supabaseConfigError = isSupabaseConfigured
  ? ''
  : 'Configuração inválida: informe VITE_SUPABASE_URL (https://PROJETO.supabase.co) e VITE_SUPABASE_ANON_KEY.';

export const supabaseUrlForDebug = supabaseUrlForDebugValue;
export const supabaseBaseUrlForDebug = getSupabaseBaseUrl();
export const isSupabaseUrlPlaceholder =
  !isValidSupabaseUrl || supabaseUrl.includes('example.supabase.co');

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

// When base URL is a proxy (dev or Netlify Function), Realtime must still use the direct Supabase endpoint (WebSockets).
// supabase-js doesn't currently expose an option to override realtime URL, so we patch it at runtime.
if (shouldUseSupabaseProxy && typeof window !== 'undefined') {
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
