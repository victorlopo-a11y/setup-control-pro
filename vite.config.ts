import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type PluginOption} from 'vite';
import type {IncomingMessage, ServerResponse} from 'http';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const shouldUseLocalSupabaseProxy = env.VITE_SUPABASE_PROXY === 'true';
  const supabaseUrl = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

  const plugins: PluginOption[] = [react(), tailwindcss()];

  if (shouldUseLocalSupabaseProxy && supabaseUrl) {
    plugins.push({
      name: 'supabase-minimal-proxy',
      configureServer(server) {
        server.middlewares.use('/supabase', async (req: IncomingMessage, res: ServerResponse) => {
          try {
            let rawUrl = req.url || '/';
            // In some Connect/Vite setups, `req.url` may still include the mount path.
            // Normalize so upstream URLs never become `...supabase.co/supabase/rest/v1/...`.
            if (rawUrl === '/supabase') rawUrl = '/';
            if (rawUrl.startsWith('/supabase/')) rawUrl = rawUrl.slice('/supabase'.length);
            const upstreamUrl = supabaseUrl + rawUrl;

            // Forward only the headers Supabase needs; do NOT forward Cookie or any browser bloat.
            // Avoid setting a custom User-Agent. Let Node/undici set a default.
            const headers: Record<string, string> = {};

            const getHeader = (name: string) => {
              const value = req.headers[name.toLowerCase()];
              if (typeof value === 'string') return value;
              if (Array.isArray(value)) return value.join(', ');
              return undefined;
            };

            const apikey = getHeader('apikey');
            const authorization = getHeader('authorization');
            const contentType = getHeader('content-type');
            const accept = getHeader('accept');
            const prefer = getHeader('prefer');
            const origin = getHeader('origin');
            const acceptProfile = getHeader('accept-profile');
            const contentProfile = getHeader('content-profile');
            const range = getHeader('range');
            const rangeUnit = getHeader('range-unit');

            if (apikey) headers['apikey'] = apikey;
            if (authorization) headers['authorization'] = authorization;
            if (contentType) headers['content-type'] = contentType;
            if (accept) headers['accept'] = accept;
            if (prefer) headers['prefer'] = prefer;
            const xClientInfo = getHeader('x-client-info');
            if (xClientInfo) headers['x-client-info'] = xClientInfo;
            if (origin) headers['origin'] = origin;
            if (acceptProfile) headers['accept-profile'] = acceptProfile;
            if (contentProfile) headers['content-profile'] = contentProfile;
            if (range) headers['range'] = range;
            if (rangeUnit) headers['range-unit'] = rangeUnit;

            // Forward a couple of CORS-related headers so upstream can respond consistently.
            const accessControlRequestHeaders = getHeader('access-control-request-headers');
            const accessControlRequestMethod = getHeader('access-control-request-method');
            if (accessControlRequestHeaders) headers['access-control-request-headers'] = accessControlRequestHeaders;
            if (accessControlRequestMethod) headers['access-control-request-method'] = accessControlRequestMethod;

            // Avoid manually setting `host` here; undici will set it based on the URL.

            const method = (req.method || 'GET').toUpperCase();
            const hasBody = !['GET', 'HEAD'].includes(method);

            // Ensure preflight requests succeed quickly (browser expects CORS headers).
            if (method === 'OPTIONS') {
              res.statusCode = 204;
              res.setHeader('access-control-allow-origin', req.headers.origin || '*');
              res.setHeader('access-control-allow-credentials', 'true');
              res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
              res.setHeader(
                'access-control-allow-headers',
                (req.headers['access-control-request-headers'] as string) || 'authorization,apikey,content-type,accept,prefer,x-client-info'
              );
              res.end();
              return;
            }

            const upstreamResp = await fetch(upstreamUrl, {
              method,
              headers,
              body: hasBody ? (req as any) : undefined,
              // @ts-expect-error - undici supports this in Node; helps with streaming.
              duplex: hasBody ? 'half' : undefined,
            });

            const status = upstreamResp.status;

            // For upstream failures, prefer returning a JSON diagnostic payload (avoids opaque HTML pages).
            if (status >= 500) {
              const text = await upstreamResp.text();
              const trimmed = text.trimStart();
              const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<');
              // Helpful diagnostics in the dev terminal.
              console.error('[supabase-proxy] upstream error', {
                status,
                cfRay: upstreamResp.headers.get('cf-ray') || null,
                url: upstreamUrl,
                snippet: text.slice(0, 180).replace(/\s+/g, ' ').trim(),
              });
              res.statusCode = status;
              res.setHeader('content-type', 'application/json; charset=utf-8');
              res.end(
                JSON.stringify({
                  status,
                  message: looksLikeHtml ? 'Supabase upstream returned HTML error page' : 'Supabase upstream error',
                  cfRay: upstreamResp.headers.get('cf-ray') || null,
                  contentType: upstreamResp.headers.get('content-type') || null,
                  snippet: text.slice(0, 900),
                  url: upstreamUrl,
                  hint:
                    status === 520
                      ? 'HTTP 520 via Cloudflare normalmente indica o projeto Supabase indisponível/pausado ou um erro no origin. Verifique o status do projeto no Dashboard/Supabase Status e confirme se a URL (ref) está correta.'
                      : null,
                })
              );
              return;
            }

            res.statusCode = status;
            // Always allow browser to read the response (otherwise errors look like generic "Failed to fetch").
            res.setHeader('access-control-allow-origin', req.headers.origin || '*');
            res.setHeader('access-control-allow-credentials', 'true');
            upstreamResp.headers.forEach((value, key) => {
              // Don't leak any upstream cookies back to the browser.
              const lowerKey = key.toLowerCase();
              if (lowerKey === 'set-cookie') return;
              // Node fetch may transparently decompress; avoid sending encoding/length headers that no longer match.
              if (lowerKey === 'content-encoding') return;
              if (lowerKey === 'content-length') return;
              if (lowerKey === 'transfer-encoding') return;
              res.setHeader(key, value);
            });

            const buf = Buffer.from(await upstreamResp.arrayBuffer());
            res.setHeader('content-length', String(buf.byteLength));
            res.end(buf);
          } catch (err: any) {
            res.statusCode = 502;
            res.setHeader('content-type', 'application/json');
            res.setHeader('access-control-allow-origin', req.headers.origin || '*');
            res.setHeader('access-control-allow-credentials', 'true');
            res.end(JSON.stringify({ message: 'Supabase proxy error', error: `${err?.message || err}` }));
          }
        });
      },
    });
  }

  return {
    plugins,
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      // Use 127.0.0.1 to avoid giant `localhost` cookie headers causing 431 on the dev server.
      host: '127.0.0.1',
      // Dev middleware to bypass Supabase CORS without forwarding huge browser headers (can trigger CF 520/Node 431).
      // Enabled only when VITE_SUPABASE_PROXY="true".
      middlewareMode: false,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
