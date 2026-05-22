import http from 'http';
import { fileURLToPath } from 'url';

const check = async (url) => {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, text: body.slice(0, 200) }));
    }).on('error', (err) => resolve({ error: err.message }));
  });
};

const root = await check('http://127.0.0.1:5173/');
console.log('root', root);
const proxy = await check('http://127.0.0.1:5173/supabase/rest/v1');
console.log('proxy', proxy);
