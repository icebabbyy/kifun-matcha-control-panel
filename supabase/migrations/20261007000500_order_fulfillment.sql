alter table public.store_orders add column fulfillment text not null default 'awaiting' check(fulfillment in ('awaiting','accepted','ready','completed','declined'));
alter table public.store_orders add column payment_status text not null default 'unpaid' check(payment_status in ('unpaid','paid'));
alter table public.store_orders add column decision_at timestamptz;
create table public.store_order_events(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.store_orders(request_id),created_at timestamptz not null default now(),actor_id bigint not null,action text not null,previous_state text not null,next_state text not null);
alter table public.store_order_events enable row level security;
revoke all on public.store_order_events from anon,authenticated;
grant all on public.store_order_events to service_role;
create function public.decide_store_order(p_request uuid,p_action text,p_actor bigint) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare item public.store_orders; next_state text;
begin
 select * into item from public.store_orders where request_id=p_request for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 next_state=case when p_action='accept' and item.fulfillment='awaiting' then 'accepted' when p_action='decline' and item.fulfillment='awaiting' then 'declined' when p_action='ready' and item.fulfillment='accepted' then 'ready' when p_action='complete' and item.fulfillment='ready' then 'completed' else null end;
 if next_state is null then return to_jsonb(item); end if;
 insert into public.store_order_events(request_id,actor_id,action,previous_state,next_state) values(p_request,p_actor,p_action,item.fulfillment,next_state);
 update public.store_orders set fulfillment=next_state,payment_status=case when next_state='completed' then 'paid' else payment_status end,decision_at=now() where request_id=p_request returning * into item;
 return to_jsonb(item);
end $$;
revoke all on function public.decide_store_order(uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.decide_store_order(uuid,text,bigint) to service_role;
