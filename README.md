<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/88cae728-7ea5-4ec0-8cc3-3b8a115ece28

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` based on `.env.example`
3. Configure Supabase in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Run SQL schema in Supabase SQL editor:
   - `supabase-schema.sql`
5. In Supabase Auth > Providers, enable `Google`
6. In Supabase Auth > URL Configuration, add:
   - `http://localhost:3000` as Site URL
   - `http://localhost:3000` in Redirect URLs
7. (Optional) Set `GEMINI_API_KEY` in `.env.local` if using Gemini features
8. Run the app:
   `npm run dev`

## Supabase Keepalive (anti-pausa por inatividade)

Para manter o banco ativo mesmo sem ninguém abrir o sistema, este projeto inclui:

- SQL: `supabase-keepalive.sql` (cria a função `public.keepalive_ping()`)
- Script: `scripts/supabase-keepalive.mjs`
- Agendamento: `.github/workflows/supabase-keepalive.yml` (a cada 12 horas)

### Como ativar

1. Rode o SQL do arquivo `supabase-keepalive.sql` no SQL Editor da Supabase (uma única vez).
2. No GitHub do repositório, configure os Secrets:
   - `KEEPALIVE_SUPABASE_URL` = URL do projeto Supabase (`https://...supabase.co`)
   - `KEEPALIVE_SUPABASE_SERVICE_ROLE_KEY` = Service Role Key da Supabase
3. O workflow `Supabase Keepalive` vai executar automaticamente no cron ou manualmente em `workflow_dispatch`.

### Teste local (opcional)

Com variáveis de ambiente definidas:

`npm run keepalive:ping`
