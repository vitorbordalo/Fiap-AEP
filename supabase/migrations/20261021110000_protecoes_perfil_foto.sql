-- Correções da revisão de segurança.

-- 1. Perfil: além de papel, local e e-mail, RM e nome também só mudam pela coordenação.
--    Sem isso, um aluno poderia trocar o próprio RM e nome pelos de um colega antes de pedir um item,
--    e a tela de retirada (E5) já viria preenchida com os dados do colega.
create or replace function private.profiles_protege_campos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not private.tem_papel('gestor') then
    if new.role is distinct from old.role
       or new.local_id is distinct from old.local_id
       or new.email is distinct from old.email
       or new.rm is distinct from old.rm
       or new.nome is distinct from old.nome then
      raise exception 'Só a coordenação pode alterar perfil, local, e-mail, RM ou nome.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- 2. Foto do item: só fotos de exemplo (seed/...) ou um arquivo do Storage na pasta de quem cadastrou.
--    Impede apontar para endereços externos e reaproveitar a foto de um Documento num item de outra
--    categoria (o que liberaria a foto para alunos via private.foto_publica).
alter table public.itens
  add constraint itens_foto_path_formato check (
    foto_path ~ '^seed/[a-z0-9-]+\.svg$'
    or (
      foto_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$'
      and split_part(foto_path, '/', 1) = cadastrado_por::text
    )
  );

-- cada arquivo do Storage pertence a um item só (as fotos de exemplo podem se repetir)
create unique index itens_foto_path_unica on public.itens (foto_path) where foto_path not like 'seed/%';
