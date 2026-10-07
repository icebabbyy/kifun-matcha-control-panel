create table if not exists public.store_catalog (
 id integer primary key check(id=1), payload jsonb not null, updated_at timestamptz not null default now()
);
alter table public.store_catalog enable row level security;
revoke all on public.store_catalog from anon,authenticated;
grant select on public.store_catalog to anon,authenticated;
create policy "read store menu" on public.store_catalog for select to anon,authenticated using(true);
create table public.store_orders (
 request_id uuid primary key, order_number bigint generated always as identity unique,
 created_at timestamptz not null default now(), ip_hash text not null,
 payload_hash text not null, details jsonb not null, total_cents integer not null check(total_cents>0),
 status text not null default 'pending' check(status in ('pending','sending','notified')),
 claimed_at timestamptz, notified_at timestamptz, telegram_message_id bigint
);
create index store_orders_rate_idx on public.store_orders(ip_hash,created_at);
alter table public.store_orders enable row level security;
revoke all on public.store_orders from anon,authenticated;
grant all on public.store_orders,public.store_catalog to service_role;
grant usage,select on sequence public.store_orders_order_number_seq to service_role;
create function public.claim_store_order(p_request uuid,p_ip text,p_hash text,p_details jsonb,p_total integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare found_order public.store_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_ip,0));
 select * into found_order from public.store_orders where request_id=p_request for update;
 if found then
  if found_order.payload_hash<>p_hash then raise exception 'REQUEST_CONFLICT'; end if;
  if found_order.status='notified' then return to_jsonb(found_order); end if;
  if found_order.status='sending' and found_order.claimed_at>now()-interval '60 seconds' then raise exception 'ORDER_PROCESSING'; end if;
 else
  if (select count(*) from public.store_orders where ip_hash=p_ip and created_at>now()-interval '1 minute')>=5 then raise exception 'RATE_LIMIT'; end if;
  insert into public.store_orders(request_id,ip_hash,payload_hash,details,total_cents) values(p_request,p_ip,p_hash,p_details,p_total) returning * into found_order;
 end if;
 update public.store_orders set status='sending',claimed_at=now() where request_id=p_request returning * into found_order;
 return to_jsonb(found_order);
end $$;
revoke all on function public.claim_store_order(uuid,text,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.claim_store_order(uuid,text,text,jsonb,integer) to service_role;
create function public.store_telegram_config() returns jsonb language sql security definer set search_path=vault,pg_temp as $$
 select jsonb_object_agg(name,decrypted_secret) from vault.decrypted_secrets where name in ('store_telegram_token','store_telegram_chat');
$$;
revoke all on function public.store_telegram_config() from public,anon,authenticated;
grant execute on function public.store_telegram_config() to service_role;
