-- Numeros do hero do site novo, so AGREGADO.
--
-- POR QUE EXISTE: "18+ firmas", "90% max discount" e "2.7K+ codigos copiados/mes" estavam
-- ESCRITOS na casca que o Design entregou. Os tres estavam certos no dia da entrega (o de
-- cupom bate exato: 2.714 em 30 dias) e e por isso que era perigoso , numero certo hoje
-- apodrece sem avisar, e isto e claim publico numa home que vai receber anuncio.
--
-- Tentei contar do navegador e voltava ZERO: o RLS nao deixa o anon ler coupon_clicks
-- (por bom motivo), entao a tela caia calada no valor escrito. Esta funcao devolve so o
-- total , nenhuma linha, nenhum dado de pessoa , e e a unica porta do anon pra esse numero.
create or replace function public.numeros_publicos()
returns jsonb
language sql
security definer
stable
set search_path = public
as $fn$
  select jsonb_build_object(
    'firmas',       (select count(*) from cms_firms where active),
    'desconto_max', (select max(discount) from cms_firms where active),
    'cupons_30d',   (select count(*) from coupon_clicks where ts >= now() - interval '30 days')
  )
$fn$;

comment on function public.numeros_publicos() is
  'Numeros do hero do site novo: firmas ativas, maior desconto e cupons copiados em 30 dias. So agregado.';

revoke all on function public.numeros_publicos() from public;
grant execute on function public.numeros_publicos() to anon, authenticated;
