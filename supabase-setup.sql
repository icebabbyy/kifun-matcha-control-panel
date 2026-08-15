-- KIFUN MATCHA — Supabase setup
-- Run once in the Supabase SQL Editor.

-- 1) Single-row table for the whole app state (menu status, stock, sales,
--    history, home editor content and image URLs).
create table if not exists public.app_state (
  id integer primary key default 1 check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Auto-refresh updated_at on every upsert so the timestamp always reflects
-- the last write (main.js calls upsert with its own timestamp, but this
-- guarantees correctness even if a client omits it).
create or replace function public.set_app_state_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_state_updated_at_trigger on public.app_state;
create trigger app_state_updated_at_trigger
  before insert or update on public.app_state
  for each row execute function public.set_app_state_updated_at();

-- Allow anonymous access (the web app uses the anon key).
alter table public.app_state enable row level security;

drop policy if exists "app_state_select" on public.app_state;
create policy "app_state_select" on public.app_state
  for select using (true);

drop policy if exists "app_state_insert" on public.app_state;
create policy "app_state_insert" on public.app_state
  for insert with check (true);

drop policy if exists "app_state_update" on public.app_state;
create policy "app_state_update" on public.app_state
  for update using (true) with check (true);

drop policy if exists "app_state_delete" on public.app_state;
create policy "app_state_delete" on public.app_state
  for delete using (true);

-- 2) Storage bucket for menu photos (uploads are resized to ≤640×640 first).
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- Ensure the bucket is public (in case it was created before this script ran).
update storage.buckets set public = true where id = 'menu-images';

-- Public read + upload/overwrite for anonymous clients.
drop policy if exists "menu_images_public_read" on storage.objects;
create policy "menu_images_public_read" on storage.objects
  for select using (bucket_id = 'menu-images');

drop policy if exists "menu_images_public_insert" on storage.objects;
create policy "menu_images_public_insert" on storage.objects
  for insert with check (bucket_id = 'menu-images');

drop policy if exists "menu_images_public_update" on storage.objects;
create policy "menu_images_public_update" on storage.objects
  for update using (bucket_id = 'menu-images') with check (bucket_id = 'menu-images');

drop policy if exists "menu_images_public_delete" on storage.objects;
create policy "menu_images_public_delete" on storage.objects
  for delete using (bucket_id = 'menu-images');

-- ── Notes ──────────────────────────────────────────────────────
-- The app (main.js) only uses `app_state` + `menu-images`.  The other
-- tables/views in supabase.js (customer_menu, powders, sales, etc.) are
-- unused legacy helpers and are NOT required for the app to work.
-- If you later want to use them, create them separately.
