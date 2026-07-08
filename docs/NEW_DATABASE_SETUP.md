# Troca para um banco novo sem alterar a lógica

## Recomendação

Use um projeto **Supabase novo**. O aplicativo depende diretamente de Supabase Auth, PostgREST,
Realtime, RLS, funções SQL e `auth.users`. Neon exigiria criar um backend próprio para autenticação,
autorização e tempo real; Firebase exigiria reescrever o modelo relacional e todas as consultas.

## Instalação limpa

1. Crie um projeto gratuito novo no Supabase.
2. No SQL Editor do projeto novo, execute todo o arquivo `supabase-schema.sql`.
3. Execute `supabase-keepalive.sql` somente se for utilizar o workflow de keepalive.
4. Em Authentication > URL Configuration, configure a URL pública do site e os redirects.
5. Em Authentication > Providers, configure os provedores desejados.
6. Copie a Project URL e a chave **publishable/anon** do mesmo projeto.
7. No Netlify, substitua:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_PROXY=false`
8. Faça um novo deploy no Netlify. Variáveis `VITE_*` são incorporadas durante o build.
9. Localmente, use as mesmas variáveis em `.env.local` e execute:

   `npm run db:verify`

10. Crie novamente os usuários. Como o banco está vazio, contas e senhas antigas não são copiadas.

## Critério de aceite

- `npm run db:verify` mostra `OK` para as cinco tabelas.
- Cadastro, login e recuperação de senha funcionam.
- Um chamado de setup pode ser criado, iniciado por posto e finalizado.
- Duas sessões abertas recebem atualizações em tempo real.
- O console do navegador não apresenta erros 401, 403, 404 ou 5xx.

## Voltar ao banco anterior

Mantenha guardadas as duas variáveis antigas. Para reverter, restaure a URL e a chave antigas no
Netlify e faça outro deploy. Não coloque `service_role` em nenhuma variável `VITE_*`.
