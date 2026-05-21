const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const withCors = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers':
      'authorization,apikey,content-type,accept,prefer,x-client-info,accept-profile,content-profile,range,range-unit',
    'access-control-max-age': '86400',
    ...headers,
  },
  body,
});

export const handler = async (event) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return withCors(
      500,
      JSON.stringify({
        error: 'Missing Supabase env vars on Netlify',
        required: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
      }),
      { 'content-type': 'application/json; charset=utf-8' }
    );
  }

  if (event.httpMethod === 'OPTIONS') return withCors(204, '');

  const prefix = '/.netlify/functions/supabase';
  const rawPath = event.path && event.path.startsWith(prefix) ? event.path.slice(prefix.length) : event.path || '';
  const rawQuery =
    typeof event.rawQuery === 'string'
      ? event.rawQuery
      : event.queryStringParameters
        ? new URLSearchParams(event.queryStringParameters).toString()
        : '';
  const upstreamUrl = `${SUPABASE_URL}${rawPath}${rawQuery ? `?${rawQuery}` : ''}`;

  const headers = { apikey: SUPABASE_ANON_KEY };
  const passHeader = (name) => {
    const v = event.headers?.[name] ?? event.headers?.[name.toLowerCase()];
    if (typeof v === 'string' && v.length) headers[name] = v;
  };

  passHeader('authorization');
  passHeader('content-type');
  passHeader('accept');
  passHeader('prefer');
  passHeader('x-client-info');
  passHeader('accept-profile');
  passHeader('content-profile');
  passHeader('range');
  passHeader('range-unit');

  try {
    const resp = await fetch(upstreamUrl, {
      method: event.httpMethod,
      headers,
      body: event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body) : undefined,
    });

    const respText = await resp.text();
    const passRespHeader = (name) => {
      const v = resp.headers.get(name);
      return v ? { [name]: v } : {};
    };
    const contentType = resp.headers.get('content-type') || 'application/json; charset=utf-8';
    return withCors(resp.status, respText, {
      'content-type': contentType,
      ...passRespHeader('content-range'),
      ...passRespHeader('range-unit'),
      ...passRespHeader('content-location'),
      ...passRespHeader('location'),
    });
  } catch (err) {
    return withCors(
      502,
      JSON.stringify({ error: 'Supabase proxy failed', message: `${err?.message || err}` }),
      { 'content-type': 'application/json; charset=utf-8' }
    );
  }
};
