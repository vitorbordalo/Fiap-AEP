# Configurar o Supabase

Passo a passo para ligar o app a um projeto Supabase (feito uma vez por ambiente).

## 1. Criar o projeto

1. Em [supabase.com/dashboard](https://supabase.com/dashboard), crie um projeto (região São Paulo, `sa-east-1`).
2. Em **Project Settings > API**, copie a URL, a `anon` key e a `service_role` key.
3. Na raiz do repositório:

   ```bash
   cp .env.example .env.local
   ```

   Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. A `service_role` ignora o RLS: só fica no `.env.local` e nas variáveis de ambiente do servidor, nunca no código.

## 2. Aplicar as migrations

Antes, confira localmente: `npm run db:validar`.

**Opção A, SQL Editor (mais simples):** no dashboard, abra **SQL Editor** e rode o conteúdo de cada arquivo de `supabase/migrations/`, **em ordem** (o nome começa com a data).

**Opção B, Supabase CLI:**

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>   # o ref está na URL do dashboard
npx supabase db push                               # aplica as migrations que faltam
```

Depois de vincular, dá para regenerar os tipos do TypeScript:

```bash
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

## 3. Configurar o Auth

Em **Authentication**:

| Onde | O que fazer | Por quê |
|---|---|---|
| Sign In / Providers > Email | Deixe **Email** ligado | Login por link mágico |
| Sign In / Providers > User Signups | **Desligue "Allow new users to sign up"** | O usuário só é criado pelo servidor depois de conferir o domínio (`ALLOWED_EMAIL_DOMAINS`). Sem isso, alguém poderia se cadastrar com outro domínio chamando a API direto. |
| URL Configuration > Site URL | `http://localhost:3000` (e a URL da Vercel em produção) | Base dos links |
| URL Configuration > Redirect URLs | `http://localhost:3000/auth/confirmar` e `https://<seu-app>.vercel.app/auth/confirmar` | O Supabase só redireciona para URLs desta lista |
| Emails > Magic Link | Troque o link do template (abaixo) | Funciona mesmo se o e-mail abrir em outro navegador |

Template do Magic Link (substitua o `href` do botão/link):

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Entrar no Achados e Perdidos</a>
```

Com o template padrão (`{{ .ConfirmationURL }}`) o login também funciona, mas só se o link for aberto no mesmo navegador em que foi pedido.

**E-mails em produção:** o servidor de e-mail embutido do Supabase envia poucas mensagens por hora e serve só para testes. Para uso real, configure um SMTP próprio em **Project Settings > Auth > SMTP Settings**.

## 4. Popular com dados de exemplo

```bash
npm run db:seed            # só roda se o banco ainda não tiver itens
npm run db:seed -- --reset # apaga itens, pedidos, retiradas e cadastros de apoio e recria tudo
```

Os dados são fictícios e relativos à data de hoje (um mês de histórico). O seed cria os 4 usuários de teste de `scripts/seed/usuarios-teste.json` (e-mails `@example.com`, que não recebem mensagens) e mais alguns usuários extras para dar volume.

Para entrar como cada perfil sem e-mail, rode `npm run dev` e abra [localhost:3000/dev/entrar](http://localhost:3000/dev/entrar). Essa página só existe em desenvolvimento.

## 5. Dar papéis a pessoas reais

Todo mundo entra como **aluno**. Até a tela G3 existir (Fase 6), promova alguém pelo **SQL Editor**:

```sql
update public.profiles set role = 'gestor' where email = 'pessoa@fiap.com.br';
```
