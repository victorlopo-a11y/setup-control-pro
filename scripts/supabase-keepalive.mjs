const normalizeUrl = (value) => (value || '').trim().replace(/\/+$/, '');

const supabaseUrl = normalizeUrl(
  process.env.KEEPALIVE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
);
const serviceRoleKey = (
  process.env.KEEPALIVE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
).trim();

if (!supabaseUrl) {
  console.error('Missing KEEPALIVE_SUPABASE_URL (or VITE_SUPABASE_URL).');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error(
    'Missing KEEPALIVE_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY).'
  );
  process.exit(1);
}

const endpoint = `${supabaseUrl}/rest/v1/rpc/keepalive_ping`;

const ping = async () => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: '{}',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Keepalive failed (${response.status} ${response.statusText}): ${details || 'no details'}`
    );
  }

  const payload = await response.text();
  console.log(`[keepalive] success ${new Date().toISOString()} ${payload}`);
};

ping().catch((error) => {
  console.error('[keepalive] error:', error.message);
  process.exit(1);
});
