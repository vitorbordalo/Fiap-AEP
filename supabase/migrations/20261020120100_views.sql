-- Views de leitura. O status nunca é armazenado: é calculado aqui, a cada consulta.
--
-- Regra (CLAUDE.md):
--   retirado   = existe retirada válida (não desfeita)
--   aguardando = não retirado e encontrado há mais de N dias (configuracoes.dias_para_aguardando)
--   recebido   = não retirado e encontrado há N dias ou menos

-- Visão completa para equipe, gestor e monitor. security_invoker: respeita o RLS de quem consulta.
create view public.itens_com_status
with (security_invoker = true)
as
select
  i.id,
  i.numero,
  i.codigo,
  i.foto_path,
  i.categoria_id,
  i.sala_id,
  i.turma_id,
  i.encontrado_em,
  i.observacao,
  i.local_id,
  i.cadastrado_por,
  i.created_at,
  case
    when r.id is not null then 'retirado'
    when i.encontrado_em < now() - make_interval(days => c.dias_para_aguardando) then 'aguardando'
    else 'recebido'
  end::public.item_status as status,
  r.id as retirada_id,
  (select count(*) from public.pedidos p where p.item_id = i.id)::integer as total_pedidos
from public.itens i
cross join public.configuracoes c
left join public.retiradas r on r.item_id = i.id and r.desfeita_em is null;

-- Busca do aluno. Roda com os privilégios do dono da view (security_invoker = false) porque o aluno
-- não tem acesso direto a itens nem a retiradas. Por isso ela expõe só o necessário:
--   - nunca mostra itens já retirados, nem quem cadastrou;
--   - em categorias sensíveis (Documento), não mostra foto nem observação.
create view public.itens_busca
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
  cat.foto_sensivel as foto_oculta
from public.itens i
join public.categorias cat on cat.id = i.categoria_id
where not exists (
  select 1 from public.retiradas r where r.item_id = i.id and r.desfeita_em is null
);

-- "Meus pedidos": só os pedidos de quem consulta, com status calculado.
--   retirado  = a retirada válida do item veio deste pedido
--   encerrado = o item foi retirado por outra pessoa (sem revelar quem)
--   pendente  = o item ainda não foi retirado
create view public.meus_pedidos
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
  end::public.pedido_status as status
from public.pedidos p
join public.itens i on i.id = p.item_id
join public.categorias cat on cat.id = i.categoria_id
left join public.retiradas r on r.item_id = p.item_id and r.desfeita_em is null
where p.aluno_id = (select auth.uid());
