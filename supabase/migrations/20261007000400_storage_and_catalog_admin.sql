drop policy menu_images_public_insert on storage.objects;
drop policy menu_images_public_update on storage.objects;
drop policy menu_images_public_delete on storage.objects;
create policy menu_images_admin_insert on storage.objects for insert to authenticated with check(bucket_id='menu-images' and public.is_store_admin());
create policy menu_images_admin_update on storage.objects for update to authenticated using(bucket_id='menu-images' and public.is_store_admin()) with check(bucket_id='menu-images' and public.is_store_admin());
create policy menu_images_admin_delete on storage.objects for delete to authenticated using(bucket_id='menu-images' and public.is_store_admin());
grant insert,update,delete on public.store_catalog to authenticated;
create policy "store admin catalog write" on public.store_catalog for all to authenticated using(public.is_store_admin()) with check(public.is_store_admin());
