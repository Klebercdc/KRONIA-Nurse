-- Rate limiting por usuário para rotas que chamam LLM (Groq/Cohere).
-- Janela fixa: contador por (usuário, rota, início da janela), incrementado
-- atomicamente via função. Compatível com Vercel serverless (nenhum estado
-- em memória de processo).
create table if not exists public.rate_limits (
  user_id       uuid not null,
  rota          text not null,
  janela_inicio timestamptz not null,
  contador      integer not null default 1,
  primary key (user_id, rota, janela_inicio)
);

alter table public.rate_limits enable row level security;
-- Sem policies: nenhum acesso via anon/authenticated. Só o service_role usa.

-- Incrementa e devolve o contador da janela atual de forma atômica.
create or replace function public.incrementar_rate_limit(
  p_user_id uuid,
  p_rota text,
  p_janela_segundos integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_janela   timestamptz;
  v_contador integer;
begin
  v_janela := to_timestamp(floor(extract(epoch from now()) / p_janela_segundos) * p_janela_segundos);

  insert into public.rate_limits (user_id, rota, janela_inicio, contador)
  values (p_user_id, p_rota, v_janela, 1)
  on conflict (user_id, rota, janela_inicio)
    do update set contador = rate_limits.contador + 1
  returning contador into v_contador;

  -- Limpeza oportunista: janelas com mais de 2 dias não servem para nada.
  delete from public.rate_limits where janela_inicio < now() - interval '2 days';

  return v_contador;
end;
$$;

revoke execute on function public.incrementar_rate_limit(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.incrementar_rate_limit(uuid, text, integer) to service_role;
