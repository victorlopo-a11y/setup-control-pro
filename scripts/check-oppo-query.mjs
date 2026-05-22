import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .reduce((acc, line) => {
    const [k, v] = line.split('=');
    acc[k] = v.replace(/^"|"$/g, '');
    return acc;
  }, {});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const result = await supabase
  .from('oppo_requests')
  .select('*')
  .eq('created_by', 'a6a95a6d-6b31-43c7-aac2-3d8a26cfa21e')
  .eq('call_type', 'SOLICITACAO_DISPOSITIVO')
  .in('status', ['ABERTO', 'SEPARACAO', 'CONFERINDO', 'FINALIZADO_ALMOXERIFADO', 'DIVERGENCIA'])
  .order('requested_at', { ascending: false });
console.log('error', result.error);
console.log('data', result.data);
