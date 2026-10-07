create table public.store_admins(user_id uuid primary key references auth.users(id));
alter table public.store_admins enable row level security;
revoke all on public.store_admins from anon,authenticated;
insert into public.store_admins select id from auth.users where email in ('admin@happihaus.com','kifun.admin@happihaus.com');
create function public.is_store_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.store_admins where user_id=auth.uid()); $$;
revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to anon,authenticated,service_role;
do $$ declare item record; p record; begin
 for item in select tablename from pg_tables where schemaname='public' and tablename not in ('store_admins','store_catalog','store_orders') loop
  execute format('alter table public.%I enable row level security',item.tablename);
  for p in select policyname from pg_policies where schemaname='public' and tablename=item.tablename loop execute format('drop policy %I on public.%I',p.policyname,item.tablename); end loop;
  execute format('revoke all on public.%I from anon',item.tablename);
  execute format('grant select,insert,update,delete on public.%I to authenticated',item.tablename);
  execute format('create policy "store admin only" on public.%I for all to authenticated using(public.is_store_admin()) with check(public.is_store_admin())',item.tablename);
 end loop;
 for item in select viewname from pg_views where schemaname='public' loop
  execute format('revoke all on public.%I from anon',item.viewname);
  execute format('alter view public.%I set (security_invoker=true)',item.viewname);
 end loop;
end $$;
