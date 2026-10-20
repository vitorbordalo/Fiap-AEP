# Achados e Perdidos FIAP

Aplicação web que substitui o processo de achados e perdidos da FIAP: monitores cadastram itens esquecidos, alunos consultam e pedem a retirada, a equipe registra **quem retirou cada item** e a coordenação acompanha números. Também é um case de portfólio: código limpo, organizado e documentado importa tanto quanto funcionar.

O dono do projeto é o PM e desenvolvedor. Trabalhe em fases, explique decisões importantes em poucas linhas e **pare ao final de cada fase** para revisão.

## Estado atual

| Fase | Status |
|---|---|
| 1. Fundação (projeto, tokens, componentes base, schema, RLS, migrations, este arquivo) | concluída |
| 2. Dados e auth (seed, link mágico, perfis, proxy, `/dev/entrar`, login M1/A1) | concluída, aguardando revisão |
| 3. Monitor (M1 a M4) | pendente |
| 4. Aluno (A1 a A6 + Meus pedidos) | pendente |
| 5. Equipe (E1 a E7) | pendente |
| 6. Gestor (G1 a G3) | pendente |
| 7. Acabamento (testes, acessibilidade, README, deploy na Vercel) | pendente |
| 8. Opcional: sugestão de categoria por IA atrás de feature flag | pendente |

Atualize esta tabela ao terminar cada fase.

## Comandos

```bash
npm run dev          # servidor local (http://localhost:3000)
npm run build        # build de produção
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest (unitários + RLS no PGlite)
npm run db:validar   # aplica as migrations num Postgres em memória
npm run db:seed      # dados de exemplo no Supabase (--reset para recriar)
```

Configuração do Supabase (migrations, Auth, template de e-mail, seed): `docs/supabase.md`.

Rode `lint`, `typecheck` e `test` antes de cada commit. Não há Docker nesta máquina: `supabase start` não funciona; use o PGlite (`scripts/db/pglite.mjs`) para validar SQL e um projeto Supabase remoto para o resto.

## Stack

- Next.js 16 (App Router) + TypeScript strict (`noUncheckedIndexedAccess` ligado). TypeScript fica na 6.x enquanto o `typescript-eslint` não suportar a 7.
- Tailwind CSS v4: os tokens ficam em `src/app/globals.css` (`@theme`), que é o equivalente ao `tailwind.config` no v4.
- Componentes próprios em `src/components/ui/`, no estilo shadcn/ui (cva + `cn`). Ícones `lucide-react`. Fonte Inter via `next/font`.
- Supabase: Postgres, Auth (link mágico), Storage (fotos), RLS. Pacotes `@supabase/ssr` e `@supabase/supabase-js`.
- Zod para validação, Server Actions para mutações, Recharts no dashboard.
- Vitest (unitários e RLS), Playwright (fluxos, Fase 7). Deploy na Vercel.
- No Next 16, o antigo `middleware.ts` se chama **`proxy.ts`**.

Mudanças de stack: proponha antes de fazer.

## Estrutura

```
src/app/                 rotas (App Router)
src/components/ui/       componentes base do design system
src/lib/dominio/         regras de negócio puras (status, conferência) + testes
src/lib/auth/            regras de rota por perfil (rotas.ts), e-mail, sessão (exigirPapel)
src/lib/supabase/        clientes (server, client, admin) e tipos do banco
src/proxy.ts             renova a sessão e redireciona por perfil (Next 16: ex-middleware)
src/lib/utils.ts         cn()
supabase/migrations/     SQL versionado (schema, views, rls, storage)
supabase/tests/          testes de RLS no PGlite
scripts/db/              harness PGlite e stub do Supabase
scripts/seed/            gerador de dados fictícios, usuários de teste, runner do seed
public/seed/             fotos de exemplo (SVG por categoria)
docs/banco-de-dados.md   schema, views, matriz de permissões
design/                  DESIGN.md e export do Stitch (referência, não copiar)
```

## Design

- **`design/DESIGN.md` é a fonte da verdade do visual.** O export do Stitch (`design/stitch/<tela>/code.html` e `screen.png`) serve só para entender layout, hierarquia e espaçamento. **Nunca copie o HTML do Stitch**: reconstrua como componentes React.
- Se Stitch e DESIGN.md divergirem, vale o DESIGN.md. A cor de destaque é **#ED145B** (ignore o "primary" rosa-claro do Stitch).
- Os `screen.png` de E1, E6 e G2 estão corrompidos: use só o `code.html` dessas três.
- Ignore o que o Stitch inventou: menu de navegação no topo da E4, "ID do Lote" na E7, rodapé "FIAP • Campus Aclimação" em M1/A1, ícone de perfil duplicado na A2, aviso "Seu pedido expira em 48h" na A6, campo "Nome do item" na M3, rodapés, "versão", "sincronizado", QR Code, notificações, arquivamento e transferência.
- Topo da equipe: sempre o da E2 (logo + "Achados e Perdidos" à esquerda; seletor de local e usuário à direita; sem menu). O gestor tem só as abas Dashboard, Histórico e Configurações. **Sem menu lateral** (vale sobre o "left sidebar" do DESIGN.md).

### Tokens (classes Tailwind)

| DESIGN.md | Classe |
|---|---|
| background / surface / surface-elevated / border | `bg-background`, `bg-surface`, `bg-surface-elevated`, `border-border` |
| text-primary / text-secondary / text-disabled | `text-foreground`, `text-muted`, `text-disabled` |
| accent / accent-pressed | `bg-accent`, `bg-accent-pressed`; texto em destaque sobre fundo escuro: `text-accent-text` (contraste AA) |
| Status Recebido / Aguardando / Retirado | ponto `bg-recebido` `bg-aguardando` `bg-retirado`; texto `text-*-text` |
| Display / Title / Body / Label / Caption | `text-display`, `text-title`, `text-body`, `text-label`, `text-caption` |

As paletas padrão do Tailwind estão desligadas: só os tokens existem. Raio: `rounded-xl` (12px) em cards, inputs e botões; `rounded-full` em pílulas e chips. Sem sombras pesadas: profundidade pela cor da superfície.

### Componentes base (`src/components/ui/`)

`Button` (primary, secondary, ghost, link; `size="lg"` = 52px do mobile; `asChild`, `loading`), `Input`/`Textarea` (label acima, ícone, erro, contador via `aside`), `Select` (nativo, sem digitação livre), `Chip`/`RemovableChip`, `Badge`/`StatusBadge`, `Card`, `CategoryIcon` (nome do ícone vem do banco), `Toaster`/`toast` (sonner; "Desfazer" via `action`), `Modal` (Radix Dialog), `Skeleton`, `EmptyState`, `ErrorState`. Vitrine em `/dev/componentes` (só em desenvolvimento). Reutilize antes de criar.

## Perfis e telas

| Código | Perfil | Dispositivo | Telas |
|---|---|---|---|
| M | Monitor | Mobile (390px) | M1 Login · M2 Câmera · M3 Detalhes do item · M4 Item cadastrado |
| A | Aluno | Mobile (390px) | A1 Login · A2 Busca · A3 Resultados · A4 Detalhe · A5 Confirmar pedido · A6 Pedido enviado |
| E | Equipe | Desktop (1440px) | E1 Início · E2 Recebidos · E3 Aguardando · E4 Retirados · E5 Registrar retirada · E6 Novo item · E7 Detalhe |
| G | Gestor | Desktop (1440px) | G1 Dashboard · G2 Histórico de retiradas · G3 Configurações |

Pastas do Stitch: `m1_login_do_monitor`, `m2_novo_item_c_mera`, `m3_detalhes_do_item`, `m4_item_cadastrado`, `a1_login_do_aluno`, `a2_buscar_item_perdido`, `a3_resultados_da_busca`, `a4_detalhes_do_item`, `a5_confirmar_pedido`, `a6_pedido_confirmado`, `e1_in_cio_de_itens_desktop`, `e2_itens_recebidos_desktop`, `e3_aguardando_retirada_desktop`, `e4_itens_retirados_desktop`, `e5_registrar_retirada_desktop`, `e6_novo_item_desktop`, `e7_detalhe_do_item_desktop`, `g1_dashboard`, `g2_hist_rico`, `g3_configura_es`.

### Rotas

- Monitor: `/monitor/login` (M1), `/monitor` (M2), `/monitor/novo` (M3), `/monitor/novo/sucesso` (M4)
- Aluno: `/login` (A1), `/aluno` (A2), `/aluno/resultados` (A3), `/aluno/itens/[id]` (A4), `/aluno/itens/[id]/pedido` (A5), `/aluno/pedidos/[id]` (A6), `/aluno/pedidos` (Meus pedidos)
- Equipe: `/equipe` (E1), `/equipe/recebidos` (E2), `/equipe/aguardando` (E3), `/equipe/retirados` (E4), `/equipe/itens/[id]/retirada` (E5, modal sobre a lista), `/equipe/itens/novo` (E6, modal), `/equipe/itens/[id]` (E7, página inteira)
- Gestor: `/gestor` (G1), `/gestor/historico` (G2), `/gestor/configuracoes` (G3)
- O proxy redireciona cada perfil para a sua área e bloqueia as áreas dos outros.

## Regras de negócio

**Status do item** (calculado, nunca editado; ver `itens_com_status` e `src/lib/dominio/status.ts`):
- **Retirado:** existe retirada válida (não desfeita).
- **Aguardando retirada:** não retirado e `encontrado_em` há mais de N dias (`configuracoes.dias_para_aguardando`, padrão 7).
- **Recebido:** não retirado e há N dias ou menos.
- A mudança Recebido → Aguardando é automática, só pelo tempo. Nada de arrastar ou mover.

**Cadastro (monitor ou equipe):** foto obrigatória, categoria obrigatória, sala obrigatória, turma opcional, data e hora automáticas (editáveis), observação opcional (até 140 caracteres), local de guarda (Achados e Perdidos ou Sala de TI). Código sequencial `#AP-0001`. Meta: **cadastrar em menos de 30 segundos**. Nada de digitar onde dá para escolher.

**Pedido ("É meu"):** aluno informa sala, turma e horário aproximado e confirma que vai apresentar a carteirinha. Vários alunos podem pedir o mesmo item; a equipe decide na entrega.

**Retirada (equipe, sempre presencial):** RM, nome completo, checkbox "Conferi a carteirinha do aluno" (obrigatório), funcionário e data/hora automáticos. Com pedido, mostra a conferência cadastro × informado (sala, turma, horário) com check verde em cada campo que bate; horário bate se a diferença for de até 60 minutos. Também pode ser registrada sem pedido (aluno direto no balcão). "Desfazer retirada" fica no detalhe (E7): marca como desfeita, nunca apaga.

**Privacidade (LGPD), aplicada com RLS no banco:**
- Nunca pedir nem armazenar a senha do portal FIAP. Login por link mágico no e-mail institucional; domínios em `ALLOWED_EMAIL_DOMAINS` (padrão `fiap.com.br`).
- Categoria sensível (Documento) nunca mostra foto a alunos: placeholder "Foto oculta · documento".
- Alunos nunca veem dados de outros alunos (pedidos, retiradas, RMs). Histórico de retiradas só para equipe e gestor.

**Perfis:** todo usuário novo entra como aluno. O gestor define monitor, equipe e gestor (G3). Cada pessoa da equipe tem um local padrão; o seletor no topo troca a visão (sem alterar o perfil).

## Auth e acesso

- Login só por link mágico (`src/app/auth/actions.ts`). O cadastro público fica **desligado** no Supabase: o servidor confere o domínio e cria o usuário com a service role antes de enviar o link.
- Três barreiras: `proxy.ts` (navegação), `exigirPapel()` no layout de cada área (servidor) e RLS (dados). Toda área nova chama `exigirPapel` no layout.
- A área do monitor fica em `src/app/monitor/(area)/` para que `/monitor/login` fique fora do layout protegido.
- Cliente admin (`src/lib/supabase/admin.ts`) só para criar usuário e `/dev/entrar`. Dados de negócio sempre pelo cliente com sessão (RLS).
- Use `getClaims()` para identificar o usuário no servidor, nunca `getSession()`.

## Banco

Detalhes e matriz de permissões em `docs/banco-de-dados.md`. Pontos que não podem ser quebrados:
- Toda tabela nova tem RLS habilitado e policies explícitas; teste as policies em `supabase/tests/`.
- Alunos leem itens só pela view `itens_busca` e pedidos pela `meus_pedidos`.
- Autoria e datas de criação são preenchidas por trigger a partir da sessão.
- Migrations novas: novo arquivo em `supabase/migrations/` com timestamp; nunca edite uma migration já aplicada no Supabase.
- Mudou o schema? Atualize `src/lib/supabase/database.types.ts` (ou regenere com a CLI) e o seed.
- Fotos: `foto_path` que começa com `seed/` é uma foto de exemplo servida de `public/seed/`; as demais estão no bucket privado `itens` e são exibidas com URL assinada.

## Qualidade e UX

- Mobile-first em M e A: largura máxima de 430px centralizada (`max-w-mobile`), botão principal fixo no rodapé, toque de pelo menos 48px.
- M2: câmera com `getUserMedia` (traseira) e fallback `<input type="file" accept="image/*" capture="environment">`. Comprimir no navegador antes do upload (lado maior 1600px, WebP).
- Toda ação mostra toast; "Desfazer" quando fizer sentido.
- Skeleton, vazio e erro em todas as listas.
- Acessibilidade: contraste AA, label em todo input, teclado nas telas desktop.
- Textos em português do Brasil, tom do DESIGN.md: direto, amigável, curto, "você".
- Commits pequenos e descritivos ao final de cada etapa.

## Dados de exemplo

Seed (`scripts/seed/dados.mjs`, determinístico e relativo à data de hoje; validado em `supabase/tests/seed.test.ts`): 2 locais, ~15 salas, ~10 turmas, categorias (Celular, Fone, Notebook, Carregador, Garrafa, Casaco, Mochila, Documento, Guarda-chuva, Outros), ~30 itens entre Recebidos, Aguardando e Retirados, pedidos e retiradas coerentes, um mês de dados para o dashboard. **Só dados fictícios.** Fotos: placeholders SVG por categoria em `public/seed/`. 4 usuários de teste (um por perfil) e `/dev/entrar`, **só em desenvolvimento**.

## O que não fazer

- Não inventar funcionalidades fora deste documento. Se algo faltar, sugerir e esperar aprovação.
- Sem menu lateral nem menu no topo da equipe.
- Sem arrastar e soltar, arquivamento, transferência, QR Code ou notificações.
- Sem chaves ou segredos no código: `.env.local` (fora do git) e `.env.example`.
