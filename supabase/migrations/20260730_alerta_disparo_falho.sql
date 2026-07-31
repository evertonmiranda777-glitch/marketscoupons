-- Disparo que FALHA em silencio: pg_cron diz "succeeded" e ninguem fica sabendo.
--
-- INCIDENTE (30/07/2026): o post das 09:00 BRT nao saiu no canal. O Everton perguntou
-- "pq inferno o post das 9 do telegram nao saiu?". No `cron.job_run_details` o job #25
-- estava **succeeded**. Em `net._http_response`, a mesma requisicao: **HTTP 500**.
--
-- POR QUE O pg_cron MENTE: `net.http_post()` so ENFILEIRA a requisicao. O SQL termina com
-- sucesso na hora, e a resposta HTTP chega depois, assincrona, noutra tabela. Entao
-- "succeeded" quer dizer "consegui enfileirar", NUNCA "o post foi publicado".
-- Mesma familia do "SQL OK != feature ok" e do "respondeu 200 != esta funcionando".
--
-- Esta migration cria o registro do que deu errado. Sem isso, so da pra descobrir a falha
-- perguntando pro banco na mao, DEPOIS de alguem notar que o post nao apareceu.

create table if not exists public.disparo_falhas (
  id           bigserial primary key,
  quando       timestamptz not null default now(),
  url          text        not null,
  status_code  int,
  corpo        text,
  visto        boolean     not null default false
);

comment on table public.disparo_falhas is
  'Respostas NAO-2xx das chamadas HTTP feitas pelo pg_cron (telegram, welcome-email, etc). Existe porque cron.job_run_details marca "succeeded" mesmo quando o HTTP devolve 500: net.http_post so enfileira. Criada 30/07/2026, depois do post das 9h nao sair e ninguem ser avisado.';

-- Varre as respostas recentes e registra o que nao foi 2xx. Idempotente: nao duplica.
create or replace function public.registrar_disparos_falhos()
returns integer
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  n integer := 0;
begin
  insert into public.disparo_falhas (quando, url, status_code, corpo)
  select r.created, coalesce(q.url, '(url nao encontrada)'), r.status_code,
         left(coalesce(r.content, r.error_msg, ''), 400)
  from net._http_response r
  left join net.http_request_queue q on q.id = r.id
  where r.created > now() - interval '2 hours'
    and (r.status_code is null or r.status_code < 200 or r.status_code >= 300)
    and not exists (
      select 1 from public.disparo_falhas f
      where f.quando = r.created and f.status_code is not distinct from r.status_code
    );
  get diagnostics n = row_count;
  return n;
end;
$$;

comment on function public.registrar_disparos_falhos() is
  'Le net._http_response e grava em disparo_falhas tudo que nao foi 2xx nas ultimas 2h. Chamada por cron a cada 30min.';

-- A cada 30 min, poucos minutos depois de qualquer disparo. Barato: le 2h de historico.
select cron.unschedule('registrar-disparos-falhos')
where exists (select 1 from cron.job where jobname = 'registrar-disparos-falhos');

select cron.schedule(
  'registrar-disparos-falhos',
  '*/30 * * * *',
  $$select public.registrar_disparos_falhos();$$
);
