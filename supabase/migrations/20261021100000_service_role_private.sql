-- Correção encontrada pelo E2E em modo Supabase: o seed (service role) não conseguia atualizar perfis.
-- O trigger de profiles chamava private.tem_papel() mesmo sem usuário logado, e a service_role
-- não tinha USAGE no schema private ("permission denied for schema private").

-- 1. Sem sessão (service role, seed, admin): sai antes de consultar o papel.
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
       or new.email is distinct from old.email then
      raise exception 'Só a coordenação pode alterar perfil, local ou e-mail.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- 2. A service role (usada só no servidor) também pode usar os helpers das policies.
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;
