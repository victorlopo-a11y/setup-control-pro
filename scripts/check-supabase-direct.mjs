import fs from 'fs';

const env = fs
  .readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .reduce((acc, line) => {
    const [k, ...rest] = line.split('=');
    acc[k] = rest.join('=').replace(/^"|"$/g, '');
    return acc;
  }, {});

const supabaseUrl = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const fetchJson = async (url) => {
  const resp = await fetch(url, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      accept: 'application/json',
    },
  });
  const text = await resp.text();
  return {
    url,
    status: resp.status,
    contentType: resp.headers.get('content-type'),
    cfRay: resp.headers.get('cf-ray'),
    snippet: text.slice(0, 500),
  };
};

const main = async () => {
  console.log(await fetchJson(`${supabaseUrl}/auth/v1/health`));
  console.log(await fetchJson(`${supabaseUrl}/rest/v1/`));
  console.log(await fetchJson(`${supabaseUrl}/rest/v1/oppo_requests?select=*&limit=1`));
};

main().catch((err) => {
  console.error('error', err?.message || err);
  process.exit(1);
});

