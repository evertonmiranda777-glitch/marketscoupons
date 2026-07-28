-- Coluna `extra`: parametros de afiliado que dependem de contexto e nao cabem em
-- tracking_param/tracking_value (ex: Earn2Trade usa um a_bid diferente nos planos GML).
-- Sem isso, esses valores continuariam literais no codigo — que e' exatamente o que a
-- tabela `firms` existe pra impedir.
alter table public.firms add column if not exists extra jsonb;
comment on column public.firms.extra is 'Parametros de afiliado dependentes de contexto. Ex e2t: {"a_bid_default":"...","a_bid_gml":"..."}';

update public.firms
   set extra = jsonb_build_object('a_bid_default','2e8e8a14','a_bid_gml','fcc26bfd')
 where slug = 'e2t';
