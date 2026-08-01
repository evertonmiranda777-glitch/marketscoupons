-- SISTEMA DE PONTOS , o ponto vira CONTA DE PROP FIRM, entao ele vale dinheiro.
--
-- POR QUE NAO REPETI O DESENHO DA giveaway_tickets: la o app insere DIRETO do navegador e
-- o campo `task` e TEXTO LIVRE. O unico UNIQUE e (user_id, giveaway_slug, task), que so
-- impede repetir a MESMA palavra , qualquer pessoa abre o console e faz task:'a1', 'a2',
-- 'a3'... e ganha bilhete sem limite. Auditado em 31/07/2026: 43 bilhetes emitidos, todos
-- com nome oficial, ninguem explorou. Mas com ponto valendo conta de verdade isso vira
-- prejuizo, entao aqui:
--
--   1. o LEDGER e append-only e o navegador NAO ESCREVE NELE. Nenhum grant de INSERT pra
--      anon/authenticated. Toda escrita passa pela edge function `points`, que roda com
--      service role e valida a tarefa contra a tabela `point_tasks`.
--   2. `task_key` e CHAVE ESTRANGEIRA pra point_tasks. Nome inventado nao entra , o banco
--      recusa, nao e "o app ignora".
--   3. saldo NUNCA e um numero guardado. E a SOMA do ledger. Contador mutavel pode ser
--      corrompido por uma escrita errada e ninguem descobre a origem; ledger sempre conta
--      de onde cada ponto veio.
--   4. resgate desconta com TRAVA DE LINHA (for update) dentro de uma funcao, senao dois
--      cliques ao mesmo tempo gastam o mesmo saldo duas vezes.

-- ─────────────────────────────────────────────────────────────── catalogo de tarefas
create table if not exists public.point_tasks (
  key           text primary key,
  points        int  not null check (points > 0 and points <= 100),
  repeatable    boolean not null default false,   -- false = uma vez por usuario, pra sempre
  label_en      text not null,
  label_pt      text not null,
  url           text,
  ativo         boolean not null default true,
  ordem         int not null default 0
);

comment on table public.point_tasks is
  'Allowlist do que da ponto. point_ledger.task_key aponta pra ca por FK: tarefa inventada e recusada PELO BANCO. Nao adiantaria validar so no app , o buraco da giveaway_tickets foi exatamente esse.';

insert into public.point_tasks (key, points, repeatable, label_en, label_pt, url, ordem) values
  ('complete_profile', 10, false, 'Complete your profile',   'Complete seu perfil',   null, 1),
  ('follow_instagram', 10, false, 'Follow us on Instagram',  'Siga no Instagram',     'https://www.instagram.com/marketscoupons/', 2),
  ('join_telegram',    10, false, 'Join our Telegram',       'Entre no Telegram',     'https://t.me/marketscoupons', 3),
  ('write_review',     20, true,  'Write a review',          'Escreva uma review',    null, 4),
  ('refer_friend',     25, true,  'Invite a friend',         'Convide um amigo',      null, 5),
  ('marketing_optin',  10, false, 'Accept email offers',     'Aceitar ofertas por e-mail', null, 6)
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────── ledger (append-only)
create table if not exists public.point_ledger (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  delta       int  not null check (delta <> 0),      -- positivo ganha, negativo gasta
  task_key    text references public.point_tasks(key),
  motivo      text not null,                          -- 'task' | 'redeem' | 'admin' | 'bonus'
  ref         text,                                   -- id do resgate, da review, do indicado
  nota        text,
  created_at  timestamptz not null default now()
);

comment on table public.point_ledger is
  'Extrato de pontos, append-only. Saldo = soma daqui, NUNCA um contador guardado. O navegador nao escreve: sem grant de INSERT pra anon/authenticated, toda entrada vem da edge function `points`.';

create index if not exists idx_point_ledger_user on public.point_ledger(user_id, created_at desc);

-- tarefa nao-repetivel: uma vez por usuario, garantido pelo BANCO
create unique index if not exists uq_point_ledger_tarefa_unica
  on public.point_ledger(user_id, task_key)
  where motivo = 'task' and task_key is not null;

-- ⚠️ o indice acima vale pra TODA tarefa. As repetiveis (review, indicacao) precisam de
-- `ref` diferente por ocorrencia, entao entram com motivo 'task_rep' e caem no indice abaixo.
create unique index if not exists uq_point_ledger_tarefa_rep
  on public.point_ledger(user_id, task_key, ref)
  where motivo = 'task_rep';

-- ─────────────────────────────────────────────────────────────── premios
create table if not exists public.point_rewards (
  slug          text primary key,
  label         text not null,
  firm_id       text,
  account_size  int,
  custo_pontos  int  not null check (custo_pontos > 0),
  estoque       int,                                  -- null = ilimitado
  ativo         boolean not null default true,
  ordem         int not null default 0
);

comment on table public.point_rewards is
  'Catalogo de resgate. Conta de prop firm: custo real zero pro Everton (as firmas dao conta), valor percebido alto.';

insert into public.point_rewards (slug, label, account_size, custo_pontos, ordem) values
  ('acc-5k',   '5K Account',   5000,    50, 1),
  ('acc-10k',  '10K Account',  10000,  100, 2),
  ('acc-25k',  '25K Account',  25000,  200, 3),
  ('acc-50k',  '50K Account',  50000,  350, 4),
  ('acc-100k', '100K Account', 100000, 600, 5),
  ('acc-150k', '150K Account', 150000, 850, 6)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────── resgates
create table if not exists public.point_redemptions (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  reward_slug   text not null references public.point_rewards(slug),
  custo_pontos  int  not null,
  status        text not null default 'pendente'
                check (status in ('pendente','aprovado','entregue','recusado')),
  nota_admin    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

comment on table public.point_redemptions is
  'Pedido de resgate. Nasce PENDENTE: o Everton confirma com a firma antes de entregar. O ponto sai do saldo na hora do pedido (lancamento negativo no ledger) e volta se ele recusar.';

create index if not exists idx_point_redemptions_user on public.point_redemptions(user_id, created_at desc);
create index if not exists idx_point_redemptions_status on public.point_redemptions(status) where status = 'pendente';

-- ─────────────────────────────────────────────────────────────── saldo e tier
create or replace view public.v_user_points as
select
  u.id                                                as user_id,
  coalesce(sum(l.delta), 0)                           as saldo,
  coalesce(sum(l.delta) filter (where l.delta > 0), 0) as ganho_total,
  case
    when coalesce(sum(l.delta) filter (where l.delta > 0), 0) >= 600 then 'ouro'
    when coalesce(sum(l.delta) filter (where l.delta > 0), 0) >= 200 then 'prata'
    else 'bronze'
  end                                                 as tier
from auth.users u
left join public.point_ledger l on l.user_id = u.id
group by u.id;

comment on view public.v_user_points is
  'Saldo e tier calculados na hora a partir do ledger. Tier usa GANHO TOTAL, nao o saldo , senao resgatar rebaixaria o usuario, que e o oposto de recompensar.';

-- ─────────────────────────────────────────────────────────────── resgate atomico
create or replace function public.resgatar_premio(p_user uuid, p_reward text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_custo int; v_estoque int; v_ativo boolean; v_saldo int; v_id bigint;
begin
  -- trava a linha do premio: dois cliques ao mesmo tempo nao passam os dois
  select custo_pontos, estoque, ativo into v_custo, v_estoque, v_ativo
  from public.point_rewards where slug = p_reward for update;

  if not found     then return jsonb_build_object('ok', false, 'erro', 'premio_inexistente'); end if;
  if not v_ativo   then return jsonb_build_object('ok', false, 'erro', 'premio_inativo');     end if;
  if v_estoque is not null and v_estoque <= 0
                   then return jsonb_build_object('ok', false, 'erro', 'sem_estoque');        end if;

  select coalesce(sum(delta), 0) into v_saldo from public.point_ledger where user_id = p_user;
  if v_saldo < v_custo then
    return jsonb_build_object('ok', false, 'erro', 'saldo_insuficiente', 'saldo', v_saldo, 'custo', v_custo);
  end if;

  insert into public.point_redemptions (user_id, reward_slug, custo_pontos)
  values (p_user, p_reward, v_custo) returning id into v_id;

  insert into public.point_ledger (user_id, delta, motivo, ref, nota)
  values (p_user, -v_custo, 'redeem', v_id::text, p_reward);

  if v_estoque is not null then
    update public.point_rewards set estoque = estoque - 1 where slug = p_reward;
  end if;

  return jsonb_build_object('ok', true, 'resgate_id', v_id, 'saldo_novo', v_saldo - v_custo);
end;
$$;

-- devolve o ponto quando o Everton recusa o resgate
create or replace function public.recusar_resgate(p_id bigint, p_nota text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid; v_custo int; v_status text; v_slug text;
begin
  select user_id, custo_pontos, status, reward_slug into v_user, v_custo, v_status, v_slug
  from public.point_redemptions where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'erro', 'resgate_inexistente'); end if;
  if v_status = 'recusado' then return jsonb_build_object('ok', false, 'erro', 'ja_recusado'); end if;
  if v_status = 'entregue' then return jsonb_build_object('ok', false, 'erro', 'ja_entregue'); end if;

  update public.point_redemptions
     set status = 'recusado', nota_admin = p_nota, updated_at = now() where id = p_id;

  insert into public.point_ledger (user_id, delta, motivo, ref, nota)
  values (v_user, v_custo, 'refund', p_id::text, 'resgate recusado: ' || coalesce(p_nota, 'sem motivo'));

  update public.point_rewards set estoque = estoque + 1
   where slug = v_slug and estoque is not null;

  return jsonb_build_object('ok', true);
end;
$$;

-- ─────────────────────────────────────────────────────────────── RLS
alter table public.point_tasks       enable row level security;
alter table public.point_ledger      enable row level security;
alter table public.point_rewards     enable row level security;
alter table public.point_redemptions enable row level security;

drop policy if exists pt_tasks_leitura   on public.point_tasks;
drop policy if exists pt_rewards_leitura on public.point_rewards;
drop policy if exists pt_ledger_proprio  on public.point_ledger;
drop policy if exists pt_redemp_proprio  on public.point_redemptions;
drop policy if exists pt_ledger_admin    on public.point_ledger;
drop policy if exists pt_redemp_admin    on public.point_redemptions;

create policy pt_tasks_leitura   on public.point_tasks       for select using (ativo);
create policy pt_rewards_leitura on public.point_rewards     for select using (ativo);
create policy pt_ledger_proprio  on public.point_ledger      for select using (auth.uid() = user_id);
create policy pt_redemp_proprio  on public.point_redemptions for select using (auth.uid() = user_id);
create policy pt_ledger_admin    on public.point_ledger      for all using (is_admin()) with check (is_admin());
create policy pt_redemp_admin    on public.point_redemptions for all using (is_admin()) with check (is_admin());

-- ⚠️ O NAVEGADOR SO LE. Nenhum INSERT/UPDATE/DELETE pra anon nem authenticated , e isso que
-- separa este sistema do buraco da giveaway_tickets. Escrita so pela edge function `points`.
revoke insert, update, delete, truncate on public.point_ledger      from anon, authenticated;
revoke insert, update, delete, truncate on public.point_redemptions from anon, authenticated;
revoke insert, update, delete, truncate on public.point_tasks       from anon, authenticated;
revoke insert, update, delete, truncate on public.point_rewards     from anon, authenticated;
grant select on public.v_user_points to anon, authenticated;

-- as funcoes de resgate rodam com service role (edge function), nunca pelo browser
revoke execute on function public.resgatar_premio(uuid, text)   from anon, authenticated;
revoke execute on function public.recusar_resgate(bigint, text) from anon, authenticated;

-- ─────────────────────────────────────────────────────────────── tapa o buraco antigo
-- Nao apaga a giveaway_tickets (o sorteio de julho esta la), so impede nome de tarefa
-- inventado de virar bilhete daqui pra frente.
alter table public.giveaway_tickets drop constraint if exists gw_tickets_task_valida;
alter table public.giveaway_tickets add  constraint gw_tickets_task_valida
  check (task in ('complete_profile','follow_instagram','join_telegram','write_review',
                  'refer_friend','marketing_optin'));
