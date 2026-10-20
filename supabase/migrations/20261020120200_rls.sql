-- Row Level Security: as regras de privacidade valem no banco, não só na interface.
--
-- Resumo de acesso (detalhes em docs/banco-de-dados.md):
--   aluno   -> lê cadastros de apoio, busca itens pela view itens_busca, cria e lê os próprios pedidos
--   monitor -> tudo do aluno + cadastra itens e lê os itens que cadastrou
--   equipe  -> lê tudo de itens, pedidos e retiradas; registra e desfaz retiradas; cadastra itens
--   gestor  -> tudo da equipe + altera perfis, configurações e cadastros de apoio

-- ---------------------------------------------------------------------------
-- Helpers (security definer: leem profiles sem cair no RLS de profiles)
-- ---------------------------------------------------------------------------

create function private.papel_atual()
returns public.papel
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create function private.tem_papel(variadic papeis public.papel[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.papel_atual() = any (papeis), false);
$$;

-- O aluno não lê retiradas; esta função responde só "o item ainda pode ser pedido?".
create function private.item_disponivel(alvo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.itens where id = alvo)
     and not exists (select 1 from public.retiradas where item_id = alvo and desfeita_em is null);
$$;

-- Foto liberada para qualquer usuário logado: item existe e a categoria não é sensível.
create function private.foto_publica(caminho text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.itens i
    join public.categorias c on c.id = i.categoria_id
    where i.foto_path = caminho and not c.foto_sensivel
  );
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- Perfil: role e local só mudam pela mão do gestor.
create function private.profiles_protege_campos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and not private.tem_papel('gestor') then
    if new.role is distinct from old.role
       or new.local_id is distinct from old.local_id
       or new.email is distinct from old.email then
      raise exception 'Só a coordenação pode alterar perfil, local ou e-mail.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protege_campos before update on public.profiles
  for each row execute function private.profiles_protege_campos();

-- ---------------------------------------------------------------------------
-- Habilita RLS em todas as tabelas
-- ---------------------------------------------------------------------------

alter table public.locais enable row level security;
alter table public.salas enable row level security;
alter table public.turmas enable row level security;
alter table public.categorias enable row level security;
alter table public.profiles enable row level security;
alter table public.configuracoes enable row level security;
alter table public.itens enable row level security;
alter table public.pedidos enable row level security;
alter table public.retiradas enable row level security;

-- ---------------------------------------------------------------------------
-- Cadastros de apoio e configurações: todos leem, só o gestor escreve
-- ---------------------------------------------------------------------------

create policy "Usuários logados leem locais" on public.locais
  for select to authenticated using (true);
create policy "Gestor gerencia locais" on public.locais
  for all to authenticated
  using ((select private.tem_papel('gestor'))) with check ((select private.tem_papel('gestor')));

create policy "Usuários logados leem salas" on public.salas
  for select to authenticated using (true);
create policy "Gestor gerencia salas" on public.salas
  for all to authenticated
  using ((select private.tem_papel('gestor'))) with check ((select private.tem_papel('gestor')));

create policy "Usuários logados leem turmas" on public.turmas
  for select to authenticated using (true);
create policy "Gestor gerencia turmas" on public.turmas
  for all to authenticated
  using ((select private.tem_papel('gestor'))) with check ((select private.tem_papel('gestor')));

create policy "Usuários logados leem categorias" on public.categorias
  for select to authenticated using (true);
create policy "Gestor gerencia categorias" on public.categorias
  for all to authenticated
  using ((select private.tem_papel('gestor'))) with check ((select private.tem_papel('gestor')));

create policy "Usuários logados leem configurações" on public.configuracoes
  for select to authenticated using (true);
create policy "Gestor altera configurações" on public.configuracoes
  for update to authenticated
  using ((select private.tem_papel('gestor'))) with check ((select private.tem_papel('gestor')));

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------

create policy "Cada um lê o próprio perfil" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Equipe e gestor leem perfis" on public.profiles
  for select to authenticated using ((select private.tem_papel('equipe', 'gestor')));

create policy "Cada um edita o próprio perfil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Gestor edita perfis" on public.profiles
  for update to authenticated
  using ((select private.tem_papel('gestor'))) with check ((select private.tem_papel('gestor')));

-- ---------------------------------------------------------------------------
-- Itens (alunos usam a view itens_busca, nunca a tabela)
-- ---------------------------------------------------------------------------

create policy "Equipe e gestor leem itens" on public.itens
  for select to authenticated using ((select private.tem_papel('equipe', 'gestor')));
create policy "Monitor lê os itens que cadastrou" on public.itens
  for select to authenticated using (cadastrado_por = (select auth.uid()));

create policy "Monitor, equipe e gestor cadastram itens" on public.itens
  for insert to authenticated
  with check (
    (select private.tem_papel('monitor', 'equipe', 'gestor'))
    and cadastrado_por = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------

create policy "Cada um lê os próprios pedidos" on public.pedidos
  for select to authenticated using (aluno_id = (select auth.uid()));
create policy "Equipe e gestor leem pedidos" on public.pedidos
  for select to authenticated using ((select private.tem_papel('equipe', 'gestor')));

create policy "Usuário logado pede item disponível" on public.pedidos
  for insert to authenticated
  with check (aluno_id = (select auth.uid()) and private.item_disponivel(item_id));

-- ---------------------------------------------------------------------------
-- Retiradas: só equipe e gestor. Sem DELETE: desfazer é um UPDATE (ver trigger).
-- ---------------------------------------------------------------------------

create policy "Equipe e gestor leem retiradas" on public.retiradas
  for select to authenticated using ((select private.tem_papel('equipe', 'gestor')));

create policy "Equipe e gestor registram retiradas" on public.retiradas
  for insert to authenticated
  with check (
    (select private.tem_papel('equipe', 'gestor'))
    and registrado_por = (select auth.uid())
    and carteirinha_conferida
  );

create policy "Equipe e gestor desfazem retiradas" on public.retiradas
  for update to authenticated
  using ((select private.tem_papel('equipe', 'gestor')))
  with check ((select private.tem_papel('equipe', 'gestor')));

-- ---------------------------------------------------------------------------
-- Privilégios: ninguém sem login acessa nada; views sensíveis só para logados
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

revoke all on public.itens_busca, public.meus_pedidos from anon, authenticated;
grant select on public.itens_busca, public.meus_pedidos to authenticated;

-- Retiradas e pedidos nunca são apagados pela API (histórico de auditoria).
revoke delete on public.retiradas, public.pedidos from authenticated;
