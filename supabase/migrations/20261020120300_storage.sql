-- Fotos dos itens: bucket privado. As URLs são assinadas no servidor e respeitam as policies abaixo.
-- Convenção de caminho: <id do usuário que enviou>/<uuid>.webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('itens', 'itens', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Monitor, equipe e gestor enviam fotos na própria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'itens'
    and (select private.tem_papel('monitor', 'equipe', 'gestor'))
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Equipe e gestor veem todas as fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'itens' and (select private.tem_papel('equipe', 'gestor')));

create policy "Quem enviou vê a própria foto" on storage.objects
  for select to authenticated
  using (bucket_id = 'itens' and owner_id = (select auth.uid())::text);

-- LGPD: fotos de categorias sensíveis (Documento) ficam de fora.
create policy "Usuários logados veem fotos de itens não sensíveis" on storage.objects
  for select to authenticated
  using (bucket_id = 'itens' and private.foto_publica(name));
