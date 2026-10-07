create table public.store_questions (
 request_id uuid primary key, conversation_id uuid not null, client_hash text not null, ip_hash text not null,
 created_at timestamptz not null default now(), name text not null, question text not null,
 telegram_message_id bigint unique, reply text, replied_at timestamptz
);
create index store_questions_conversation on public.store_questions(conversation_id,created_at);
create index store_questions_rate on public.store_questions(ip_hash,created_at);
alter table public.store_questions enable row level security;
revoke all on public.store_questions from anon,authenticated;
grant all on public.store_questions to service_role;
create or replace function public.store_telegram_config() returns jsonb language sql security definer set search_path=vault,pg_temp as $$
 select jsonb_object_agg(name,decrypted_secret) from vault.decrypted_secrets where name in ('store_telegram_token','store_telegram_chat','store_telegram_webhook_secret');
$$;
create function public.reserve_store_question(p_request uuid,p_conversation uuid,p_client text,p_ip text,p_name text,p_question text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare row_data public.store_questions;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_ip,1));
 select * into row_data from public.store_questions where request_id=p_request;
 if found then
  if row_data.client_hash<>p_client or row_data.question<>p_question or row_data.name<>p_name or row_data.conversation_id<>p_conversation then raise exception 'REQUEST_CONFLICT'; end if;
  return to_jsonb(row_data);
 end if;
 if (select count(*) from public.store_questions where ip_hash=p_ip and created_at>now()-interval '1 minute')>=3 then raise exception 'RATE_LIMIT'; end if;
 insert into public.store_questions(request_id,conversation_id,client_hash,ip_hash,name,question) values(p_request,p_conversation,p_client,p_ip,p_name,p_question) returning * into row_data;
 return to_jsonb(row_data);
end $$;
revoke all on function public.reserve_store_question(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_store_question(uuid,uuid,text,text,text,text) to service_role;
