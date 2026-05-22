import http from 'http';
import fs from 'fs';
const env = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .reduce((acc,line)=>{ const [k,v]=line.split('='); acc[k]=v.replace(/^"|"$/g,''); return acc; }, {});
const options = {
  hostname: '127.0.0.1',
  port: 5173,
  path: '/supabase/rest/v1/oppo_requests?select=*',
  method: 'GET',
  headers: {
    apikey: env.VITE_SUPABASE_ANON_KEY,
  },
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log('body', body.slice(0, 500));
  });
});
req.on('error', (err) => console.error('error', err.message));
req.end();
