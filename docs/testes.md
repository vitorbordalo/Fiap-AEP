# Testes

Cinco camadas, da mais rápida para a mais completa. Nenhuma precisa de Docker nem de conta no Supabase.

| Comando | O que testa | Precisa de |
|---|---|---|
| `npm test` | Regras de negócio puras (status, conferência da retirada, datas no fuso de São Paulo, rotas por perfil, e-mail), **RLS** e seed num Postgres em memória (PGlite) | nada |
| `npm run db:validar` | Aplica todas as migrations num Postgres em memória | nada |
| `npm run test:integracao` | O repositório Supabase (`src/lib/dados/supabase.ts`) pelo `supabase-js`, contra **Postgres 17 + PostgREST reais**, com o JWT de cada perfil | binários (abaixo) |
| `npm run test:e2e` | Playwright no app em **modo demonstração**: fluxo completo, todas as telas de cada perfil, LGPD, bloqueio de áreas e acessibilidade (axe, WCAG 2.1 AA) | um navegador |
| `npm run test:e2e:supabase` | Os mesmos testes do Playwright com o app em **modo Supabase**: banco real, seed real, RLS e upload de foto | binários + navegador |

## Navegador do Playwright

```bash
npx playwright install chromium   # baixa o Chromium do Playwright
# ou use um navegador instalado:
PW_CHANNEL=msedge npm run test:e2e    # Windows (Edge)
PW_CHANNEL=chrome npm run test:e2e    # Chrome instalado
```

## Binários para os testes com Postgres real

Os testes de integração e o E2E em modo Supabase sobem um Postgres e um PostgREST locais (`scripts/db/supabase-local.mjs`). Se os binários não existirem, `test:integracao` pula sozinho.

**Windows** (caminhos padrão, sem instalar nada no sistema):

```powershell
# PostgreSQL 17 (só a pasta pgsql: bin, lib, share)
$dl = "$env:LOCALAPPDATA\pgsql-download"; New-Item -ItemType Directory -Force $dl | Out-Null
Invoke-WebRequest https://get.enterprisedb.com/postgresql/postgresql-17.6-1-windows-x64-binaries.zip -OutFile "$dl\pg17.zip"
& "$env:SystemRoot\System32\tar.exe" -xf "$dl\pg17.zip" -C $dl "pgsql/bin" "pgsql/lib" "pgsql/share"

# PostgREST (usa a libpq.dll da pasta do PostgreSQL)
$pr = "$env:LOCALAPPDATA\postgrest"; New-Item -ItemType Directory -Force $pr | Out-Null
Invoke-WebRequest https://github.com/PostgREST/postgrest/releases/download/v16.5/postgrest-v16.5-windows-x86-64.zip -OutFile "$pr\pr.zip"
Expand-Archive "$pr\pr.zip" $pr
```

**macOS / Linux**: instale `postgresql@17` e `postgrest` pelo gerenciador de pacotes e aponte as variáveis:

```bash
export PG_BIN="$(dirname "$(command -v initdb)")"
export POSTGREST_BIN="$(command -v postgrest)"
```

## Como o modo Supabase é simulado no E2E

`scripts/e2e-supabase.mjs` monta um "Supabase local":

- **Postgres 17** com o stub do Supabase (`scripts/db/supabase-stub.sql`: papéis, `auth.users`, `auth.uid()`, schema `storage`) e todas as migrations.
- **PostgREST** de verdade em `/rest/v1`, com o mesmo RLS do Supabase.
- **Gateway** (`scripts/db/gateway-supabase.mjs`) que imita só o que o app usa de Auth (`/auth/v1/user`, `admin/users`, `otp`) e de Storage (upload, URL assinada, download).
- Roda o **seed real** (`scripts/seed/index.mjs`), compila o app com as chaves locais e entra com cada perfil colocando a sessão no cookie, no formato do `@supabase/ssr`.

O que fica de fora (testar no Supabase de verdade): o envio do e-mail do link mágico e as policies do Storage. As policies de `storage.objects` são testadas em `supabase/tests/rls.test.ts`.

## Onde ficam

```
src/**/*.test.ts                      unitários
supabase/tests/rls.test.ts            RLS, triggers e views (PGlite)
supabase/tests/seed.test.ts           seed contra as migrations (PGlite)
supabase/tests/integracao/            repositório Supabase (Postgres + PostgREST)
e2e/                                  Playwright (fluxo, todas as telas, acessibilidade)
```
