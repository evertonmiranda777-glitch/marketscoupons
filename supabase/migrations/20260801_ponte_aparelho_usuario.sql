-- PONTE APARELHO -> USUARIO
--
-- O PROBLEMA (medido em 31/07/2026): 8.300 cliques em cupom, 4.833 aparelhos distintos, e
-- apenas 2 cliques com user_id. Nao e bug: `coupon_clicks.user_id` so e preenchido se a
-- pessoa estiver LOGADA no momento de copiar, e copiar cupom nao exige login. Um unico
-- cadastrado, dos 116, chegou a copiar um cupom logado.
--
-- A PECA QUE FALTAVA: todo clique JA grava `anon_id` (o `mc_anon` do localStorage, que
-- sobrevive entre visitas no mesmo aparelho). O historico completo daquela pessoa esta la ,
-- so nao tem nome. Basta dizer UMA VEZ de quem e o aparelho e todo o passado dele passa a
-- ser atribuivel, inclusive cliques de meses atras.
--
-- COMO FUNCIONA: quando o perfil carrega no site, o app chama vincular_aparelho(anon_id).
-- A funcao grava o dono e faz o backfill dos cliques antigos daquele aparelho.
--
-- O user_id NUNCA vem do navegador , sai de auth.uid() dentro da funcao. Se viesse por
-- parametro, qualquer um atribuiria os cliques de outra pessoa a si mesmo.

create table if not exists public.user_devices (
  anon_id     text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  primeira_vez timestamptz not null default now(),
  ultima_vez   timestamptz not null default now()
);

comment on table public.user_devices is
  'De quem e cada aparelho (mc_anon do localStorage). Existe para ligar o historico anonimo de coupon_clicks a um usuario cadastrado , sem isso a atribuicao fica em 0,02%.';

create index if not exists idx_user_devices_user on public.user_devices(user_id);

create or replace function public.vincular_aparelho(p_anon text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_dono uuid;
  v_backfill int := 0;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'erro', 'nao_autenticado'); end if;
  if p_anon is null or length(p_anon) < 8 then
    return jsonb_build_object('ok', false, 'erro', 'anon_invalido');
  end if;

  -- Aparelho compartilhado (lan house, celular emprestado) fica com o PRIMEIRO dono.
  -- Reatribuir a cada login faria o historico trocar de dono e a contagem mentir pros dois.
  select user_id into v_dono from public.user_devices where anon_id = p_anon;
  if v_dono is not null and v_dono <> v_user then
    return jsonb_build_object('ok', true, 'ja_de_outro', true, 'atribuidos', 0);
  end if;

  insert into public.user_devices (anon_id, user_id)
  values (p_anon, v_user)
  on conflict (anon_id) do update set ultima_vez = now();

  -- Backfill: cliques daquele aparelho que ficaram sem dono passam a ser dele.
  -- So mexe onde user_id E NULO , nunca sobrescreve atribuicao que ja existia.
  update public.coupon_clicks
     set user_id = v_user
   where anon_id = p_anon and user_id is null;
  get diagnostics v_backfill = row_count;

  return jsonb_build_object('ok', true, 'atribuidos', v_backfill);
end;
$$;

comment on function public.vincular_aparelho(text) is
  'Diz de quem e o aparelho e adota os cliques orfaos dele. O user_id sai de auth.uid(), NUNCA de parametro , senao qualquer um reivindicaria o historico de outra pessoa.';

alter table public.user_devices enable row level security;
drop policy if exists ud_proprio on public.user_devices;
drop policy if exists ud_admin   on public.user_devices;
create policy ud_proprio on public.user_devices for select using (auth.uid() = user_id);
create policy ud_admin   on public.user_devices for all using (is_admin()) with check (is_admin());

-- escrita so pela funcao (security definer); a tabela em si e somente leitura pro navegador
revoke insert, update, delete on public.user_devices from anon, authenticated;
grant execute on function public.vincular_aparelho(text) to authenticated;

-- ─────────────────────────────────────────────────────────────── o que o admin ve
create or replace view public.v_usuario_atividade as
select
  p.id as user_id, p.email, p.full_name, p.country, p.created_at as cadastro,
  (select count(*) from public.user_devices d where d.user_id = p.id)                       as aparelhos,
  (select count(*) from public.coupon_clicks c where c.user_id = p.id)                      as cupons_copiados,
  (select count(distinct c.firm_id) from public.coupon_clicks c where c.user_id = p.id)     as firmas_distintas,
  (select max(c.ts) from public.coupon_clicks c where c.user_id = p.id)                     as ultimo_cupom,
  (select string_agg(distinct c.firm_id, ', ') from public.coupon_clicks c where c.user_id = p.id) as firmas
from public.profiles p;

comment on view public.v_usuario_atividade is
  'Atividade real por usuario depois da ponte de aparelho. Responde "quantos cupons ele copiou e de quais firmas" , que antes era impossivel.';

grant select on public.v_usuario_atividade to authenticated;
