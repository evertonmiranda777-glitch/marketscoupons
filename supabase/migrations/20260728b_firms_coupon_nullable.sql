-- Ajuste (decisao do dono, 27/07/2026): separar "nao tem cupom" de "valor desconhecido".
--
-- Antes: coupon_code NOT NULL forcava a string 'VERIFICAR_MANUALMENTE' em firmas que
-- comprovadamente NAO tem codigo (desconto automatico pelo link) — e isso as tirava do ar.
--
-- Agora:
--   coupon_code NULL           = firma sem codigo. Desconto automatico pelo link. ESTADO VALIDO E FINAL.
--   needs_review = true        = valor desconhecido / pendente de verificacao humana.
-- Os dois sao independentes: uma firma pode estar sem codigo E validada (needs_review=false).

alter table public.firms alter column coupon_code drop not null;

alter table public.firms
  add column if not exists needs_review boolean not null default false;

comment on column public.firms.coupon_code  is 'NULL = a firma nao tem codigo; o desconto e aplicado automaticamente pelo link. Nunca gravar sentinela de texto aqui.';
comment on column public.firms.needs_review is 'true = valor desconhecido/pendente de verificacao humana. Nao confundir com coupon_code NULL.';

-- Limpa a sentinela: quem estava como VERIFICAR_MANUALMENTE foi VERIFICADO nos sites em 27/07
-- (ftmo, the5ers, futureselite, brightfunded nao tem codigo) -> NULL, sem pendencia, e de volta ao ar.
update public.firms
   set coupon_code = null,
       needs_review = false,
       ativo = true
 where coupon_code = 'VERIFICAR_MANUALMENTE';

create index if not exists firms_needs_review_idx on public.firms (needs_review) where needs_review;
