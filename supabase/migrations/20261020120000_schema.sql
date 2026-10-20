-- Achados e Perdidos FIAP: tabelas, tipos e integridade.
-- Policies de RLS ficam em 20261020120200_rls.sql; views em 20261020120100_views.sql.

-- Funções internas (helpers de RLS e triggers) ficam fora do schema exposto pela API.
create schema if not exists private;

create type public.papel as enum ('aluno', 'monitor', 'equipe', 'gestor');
create type public.item_status as enum ('recebido', 'aguardando', 'retirado');
create type public.pedido_status as enum ('pendente', 'retirado', 'encerrado');

-- ---------------------------------------------------------------------------
-- Cadastros de apoio
-- ---------------------------------------------------------------------------

create table public.locais (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(btrim(nome)) between 1 and 60),
  horario_retirada text not null default '' check (char_length(horario_retirada) <= 80),
  created_at timestamptz not null default now()
);
comment on table public.locais is 'Onde os itens ficam guardados (Achados e Perdidos, Sala de TI).';

create table public.salas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(btrim(nome)) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(btrim(nome)) between 1 and 20),
  created_at timestamptz not null default now()
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(btrim(nome)) between 1 and 40),
  -- nome de um ícone lucide aceito por src/components/ui/category-icon.tsx
  icone text not null default 'package',
  cor text not null default '#737373' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  -- LGPD: categorias sensíveis (ex.: Documento) nunca mostram foto nem observação para alunos
  foto_sensivel boolean not null default false,
  ordem smallint not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nome text not null default '' check (char_length(nome) <= 120),
  rm text check (rm ~ '^[0-9]{4,10}$'),
  role public.papel not null default 'aluno',
  -- local padrão de quem é da equipe; o seletor do topo troca a visão sem alterar este campo
  local_id uuid references public.locais (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on column public.profiles.role is 'Todo usuário novo entra como aluno. Só o gestor altera.';

-- ---------------------------------------------------------------------------
-- Configurações (linha única)
-- ---------------------------------------------------------------------------

create table public.configuracoes (
  id boolean primary key default true check (id),
  dias_para_aguardando integer not null default 7 check (dias_para_aguardando between 1 and 365),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.configuracoes default values;

-- ---------------------------------------------------------------------------
-- Itens
-- ---------------------------------------------------------------------------

create table public.itens (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity unique,
  -- código legível exibido como #AP-0001; passa de 4 dígitos sem truncar depois do 9999
  codigo text generated always as (
    'AP-' || case when numero < 10000 then lpad(numero::text, 4, '0') else numero::text end
  ) stored unique,
  foto_path text not null check (foto_path <> ''),
  categoria_id uuid not null references public.categorias (id),
  sala_id uuid not null references public.salas (id),
  turma_id uuid references public.turmas (id),
  encontrado_em timestamptz not null default now(),
  observacao text check (char_length(observacao) <= 140),
  local_id uuid not null references public.locais (id),
  cadastrado_por uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  -- tolerância para relógios fora de sincronia; impede datas no futuro por engano
  constraint itens_encontrado_no_passado check (encontrado_em <= created_at + interval '5 minutes')
);
comment on column public.itens.encontrado_em is 'Início da contagem de dias no local (regra Recebido -> Aguardando).';

create index itens_local_encontrado_idx on public.itens (local_id, encontrado_em desc);
create index itens_categoria_idx on public.itens (categoria_id);
create index itens_sala_idx on public.itens (sala_id);
create index itens_cadastrado_por_idx on public.itens (cadastrado_por);

-- ---------------------------------------------------------------------------
-- Pedidos ("É meu")
-- ---------------------------------------------------------------------------

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.itens (id) on delete restrict,
  aluno_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  sala_informada_id uuid not null references public.salas (id),
  turma_informada_id uuid not null references public.turmas (id),
  horario_informado time not null,
  confirmou_carteirinha boolean not null check (confirmou_carteirinha),
  created_at timestamptz not null default now(),
  -- um pedido por aluno por item; vários alunos podem pedir o mesmo item
  constraint pedidos_um_por_aluno unique (item_id, aluno_id),
  -- alvo da FK composta de retiradas (garante que o pedido é do mesmo item)
  constraint pedidos_id_item_key unique (id, item_id)
);
comment on table public.pedidos is 'O status do pedido é calculado (view meus_pedidos), não armazenado.';

create index pedidos_aluno_idx on public.pedidos (aluno_id);

-- ---------------------------------------------------------------------------
-- Retiradas
-- ---------------------------------------------------------------------------

create table public.retiradas (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.itens (id) on delete restrict,
  pedido_id uuid,
  rm text not null check (rm ~ '^[0-9]{4,10}$'),
  nome text not null check (char_length(btrim(nome)) between 3 and 120),
  carteirinha_conferida boolean not null check (carteirinha_conferida),
  registrado_por uuid not null default auth.uid() references public.profiles (id),
  retirado_em timestamptz not null default now(),
  desfeita_em timestamptz,
  desfeita_por uuid references public.profiles (id),
  constraint retiradas_pedido_do_mesmo_item
    foreign key (pedido_id, item_id) references public.pedidos (id, item_id) on delete restrict,
  constraint retiradas_desfeita_completa check ((desfeita_em is null) = (desfeita_por is null))
);
comment on table public.retiradas is 'Registro de auditoria: nunca é apagado. Desfazer = preencher desfeita_em.';

-- no máximo uma retirada válida por item
create unique index retiradas_uma_valida_por_item on public.retiradas (item_id) where desfeita_em is null;
create index retiradas_retirado_em_idx on public.retiradas (retirado_em desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Cria o perfil (sempre como aluno) quando alguém entra pela primeira vez.
-- E-mails no formato rm123456@fiap.com.br já preenchem o RM.
create function private.criar_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario text := split_part(new.email, '@', 1);
begin
  insert into public.profiles (id, email, nome, rm)
  values (
    new.id,
    lower(new.email),
    case when usuario ~* '^rm[0-9]+$' then '' else initcap(replace(usuario, '.', ' ')) end,
    case when usuario ~* '^rm[0-9]{4,10}$' then substring(usuario from 3) end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.criar_profile();

-- Campos preenchidos pelo servidor: quem fez e quando. Com sessão de usuário, não dá para forjar.
-- Sem sessão (service role, usado pelo seed), os valores enviados são mantidos.
create function private.preencher_autoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  case tg_table_name
    when 'itens' then
      new.cadastrado_por := auth.uid();
      new.created_at := now();
    when 'pedidos' then
      new.aluno_id := auth.uid();
      new.created_at := now();
    when 'retiradas' then
      new.registrado_por := auth.uid();
      new.retirado_em := now();
      new.desfeita_em := null;
      new.desfeita_por := null;
  end case;
  return new;
end;
$$;

create trigger itens_autoria before insert on public.itens
  for each row execute function private.preencher_autoria();
create trigger pedidos_autoria before insert on public.pedidos
  for each row execute function private.preencher_autoria();
create trigger retiradas_autoria before insert on public.retiradas
  for each row execute function private.preencher_autoria();

-- Uma retirada só pode ser desfeita, uma única vez. Nenhum outro campo muda.
create function private.retiradas_somente_desfazer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.desfeita_em is not null then
    raise exception 'Esta retirada já foi desfeita.' using errcode = 'P0001';
  end if;

  if (new.id, new.item_id, new.pedido_id, new.rm, new.nome, new.carteirinha_conferida, new.registrado_por, new.retirado_em)
     is distinct from
     (old.id, old.item_id, old.pedido_id, old.rm, old.nome, old.carteirinha_conferida, old.registrado_por, old.retirado_em)
     or new.desfeita_em is null then
    raise exception 'Uma retirada não pode ser alterada, só desfeita.' using errcode = 'P0001';
  end if;

  if auth.uid() is not null then
    new.desfeita_em := now();
    new.desfeita_por := auth.uid();
  end if;
  return new;
end;
$$;

create trigger retiradas_somente_desfazer before update on public.retiradas
  for each row execute function private.retiradas_somente_desfazer();

-- Registra quem alterou as configurações e quando.
create function private.configuracoes_autoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create trigger configuracoes_autoria before update on public.configuracoes
  for each row execute function private.configuracoes_autoria();
