-- Tabela `firms`: FONTE UNICA DE VERDADE para dados de afiliado
-- (cupom, codigo de referral, parametro de tracking, URL de cadastro).
--
-- Motivacao: esses valores viviam como texto espalhado em app.js, index.html, home.html,
-- coupons.html, admin.html, api/bot.js, js/site-footer.js, lib/email-render.js e em ~900
-- paginas geradas (compare/seo). Isso causou 4 falhas em producao que ficaram meses sem
-- deteccao: cupom trocado (E8), parametro de referral errado (FundingPips ?ref=),
-- link apontando pro login em vez do cadastro (FuturesElite) e link morto apos rebrand (Aqua).
--
-- NAO altera nem substitui `cms_firms` (preco/regra/KB continuam la).

create table if not exists public.firms (
  id                 bigint generated always as identity primary key,
  slug               text        not null unique,
  nome               text        not null,
  affiliate_url      text        not null,   -- URL completa de CADASTRO, nunca de login
  tracking_param     text        not null,   -- ex: referral_code, ref_code, afmc, a_aid, aff, path
  tracking_value     text        not null,   -- ex: 31985EAA
  coupon_code        text        not null,   -- SEM default: cada firma recebe valor explicito
  coupon_description text,
  ativo              boolean     not null default true,
  updated_at         timestamptz not null default now()
);

comment on table  public.firms                    is 'Fonte unica de verdade dos dados de afiliado. Proibido escrever esses valores em codigo/documentacao.';
comment on column public.firms.affiliate_url      is 'Sempre a rota de CADASTRO (sign-up/register/checkout), nunca a de login.';
comment on column public.firms.tracking_param     is 'Nome do parametro na URL. "path" quando o codigo vai no caminho (ex: /aff/go/<valor>).';
comment on column public.firms.coupon_code        is 'NOT NULL e sem default. VERIFICAR_MANUALMENTE quando o valor nao for identificavel na fonte.';

create index if not exists firms_ativo_idx on public.firms (ativo);

-- updated_at automatico
create or replace function public.firms_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists firms_touch on public.firms;
create trigger firms_touch before update on public.firms
for each row execute function public.firms_touch_updated_at();

-- ============ RLS ============
alter table public.firms enable row level security;

-- Leitura publica APENAS de linhas ativas
drop policy if exists firms_public_read_active on public.firms;
create policy firms_public_read_active on public.firms
  for select to anon, authenticated
  using (ativo = true);

-- NENHUMA policy de escrita para anon/authenticated.
-- O service role ignora RLS por definicao, entao a escrita fica restrita a ele.
revoke insert, update, delete on public.firms from anon, authenticated;
