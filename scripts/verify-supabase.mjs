import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
for (const filename of ['.env.local', '.env']) {
  const file = path.join(root, filename);
  if (fs.existsSync(file)) dotenv.config({ path: file, override: false });
}

const url = `${process.env.VITE_SUPABASE_URL || ''}`.trim().replace(/\/$/, '');
const key = `${process.env.VITE_SUPABASE_ANON_KEY || ''}`.trim();
const requiredTables = ['users', 'setup_requests', 'oppo_requests', 'oppo_setup_layouts', 'oppo_setup_requests'];

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || !key) {
  console.error('ERRO: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.');
  process.exit(1);
}

const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
if (!health.ok) {
  console.error(`ERRO: Auth indisponível (${health.status}). Confira URL e chave do mesmo projeto.`);
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let failed = false;
for (const table of requiredTables) {
  const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' }).limit(1);
  if (error) {
    failed = true;
    console.error(`ERRO ${table}: ${error.message}`);
  } else {
    console.log(`OK   ${table}`);
  }
}

if (failed) {
  console.error('\nBanco incompleto. Execute supabase-schema.sql no SQL Editor e rode este comando novamente.');
  process.exit(1);
}

console.log('\nBanco novo conectado e com todas as tabelas essenciais.');
