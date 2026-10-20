-- Views do aluno: acrescenta colunas que as telas precisam (sempre no fim, regra do CREATE OR REPLACE VIEW).
--   itens_busca:  numero
--   meus_pedidos: numero, turma_id, observacao (nula em categoria sensível)

create or replace view public.itens_busca
with (security_invoker = false)
as
select
  i.id,
  i.codigo,
  i.categoria_id,
  i.sala_id,
  i.turma_id,
  i.encontrado_em,
  i.local_id,
  case when cat.foto_sensivel then null else i.foto_path end as foto_path,
  case when cat.foto_sensivel then null else i.observacao end as observacao,
  cat.foto_sensivel as foto_oculta,
  i.numero
from public.itens i
join public.categorias cat on cat.id = i.categoria_id
where not exists (
  select 1 from public.retiradas r where r.item_id = i.id and r.desfeita_em is null
);

create or replace view public.meus_pedidos
with (security_invoker = false)
as
select
  p.id,
  p.item_id,
  p.sala_informada_id,
  p.turma_informada_id,
  p.horario_informado,
  p.created_at,
  i.codigo,
  i.categoria_id,
  i.sala_id,
  i.local_id,
  i.encontrado_em,
  case when cat.foto_sensivel then null else i.foto_path end as foto_path,
  cat.foto_sensivel as foto_oculta,
  case
    when r.pedido_id = p.id then 'retirado'
    when r.id is not null then 'encerrado'
    else 'pendente'
  end::public.pedido_status as status,
  i.numero,
  i.turma_id,
  case when cat.foto_sensivel then null else i.observacao end as observacao
from public.pedidos p
join public.itens i on i.id = p.item_id
join public.categorias cat on cat.id = i.categoria_id
left join public.retiradas r on r.item_id = p.item_id and r.desfeita_em is null
where p.aluno_id = (select auth.uid());

-- CREATE OR REPLACE mantém os privilégios; reforça para não depender disso.
revoke all on public.itens_busca, public.meus_pedidos from anon;
grant select on public.itens_busca, public.meus_pedidos to authenticated;
