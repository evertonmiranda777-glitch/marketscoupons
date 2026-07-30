-- GUARDA DE DADO DE FIRMA, em tempo real, no banco.
--
-- POR QUE EXISTE (30/07/2026, ordem do Everton: "cria uma ferramenta que te avisa
-- mudancas em tempo real"):
-- Os campos de firma apodrecem CALADOS. Ninguem valida nada e o erro so aparece
-- quando ja esta publicado. Achados de 29-30/07, todos no ar:
--   · promo_label da cti anunciava "ADHA30 30% OFF" com o cupom MARKET a 15%
--   · futureselite anunciava "JUNE30" em julho
--   · aquafutures "AQUA 60%" quando e MIDSUMMER 45%
--   · e8 "up to 10%" com discount 40 · blueguardian "45%" com 25 · tradeday "50%" com 55
--   · 6 promo_label em PORTUGUES num canal publico que e' EN-only
--   · has_activation_fee errado em 8 de 18 firmas
--   · prices com preco final >= preco cheio (cliente ve o dobro e vai embora)
--
-- Relatorio diario nao resolve: o dado ruim fica horas no ar antes do relatorio.
-- Este trigger RECUSA a escrita, entao o erro nunca chega no cliente.
--
-- A mensagem de erro e' em PORTUGUES e explica o conserto, porque quem vai ver ela
-- e' o Everton no admin, e ele nao e' dev.
--
-- Escopo de proposito ESTREITO: so o que da pra provar com o dado da PROPRIA LINHA.
-- Nada de heuristica de proporcao (ja matou dado correto antes). O que depende de
-- fonte externa (o % real no checkout) fica pro check_firm_data.py.

create or replace function public.guard_cms_firms()
returns trigger
language plpgsql
as $$
declare
  lbl        text := coalesce(new.promo_label, '');
  pct_no_lbl int;
  linha      jsonb;
  final_num  numeric;
  cheio_num  numeric;
  rotulo     text;
begin
  -- ── 1. promo_label vai pro canal publico e pro Max: INGLES, sem em-dash ──────
  if lbl <> '' then
    -- Palavras que so existem em portugues. "e' so em ingles, ponto final" (Everton, 30/07).
    if lbl ~* '(\mcupom\M|\mnosso\M|\mnossa\M|\mavalia|\mgr[aá]tis\M|\mvitalício\M|\mtermina\M|\mdesconto\M|\mpor \$|\map[oó]s\M|\mgarantir\M)' then
      raise exception
        'promo_label da firma "%" esta em PORTUGUES: "%". O canal do Telegram e o Max sao publicos e o site e americano , escreva em INGLES.',
        new.id, lbl;
    end if;
    -- Em-dash com espacos e proibido em conteudo publico (regra do repo).
    if lbl like '% — %' or lbl like '% – %' then
      raise exception
        'promo_label da firma "%" usa em-dash (" — "), proibido em conteudo publico. Troque por virgula ou ponto: "%"',
        new.id, lbl;
    end if;
    -- Um % no label que contradiz a coluna `discount` = publicidade enganosa.
    -- Tolerancia de 5 pontos cobre "up to X%" legitimo por produto.
    pct_no_lbl := substring(lbl from '(\d{1,3})\s*%')::int;
    if pct_no_lbl is not null and new.discount is not null and new.discount > 0
       and abs(pct_no_lbl - new.discount) > 5 then
      raise exception
        'promo_label da firma "%" anuncia % por cento, mas a coluna discount diz % por cento. Um dos dois esta errado , conferir no site antes de gravar. Label: "%"',
        new.id, pct_no_lbl, new.discount, lbl;
    end if;
    -- Label citando um codigo diferente do cupom da firma = cupom morto no ar.
    -- Foi exatamente a cti (ADHA30 x MARKET) e a futureselite (JUNE30).
    if new.coupon is not null and new.coupon <> ''
       and lbl ~ '\m[A-Z][A-Z0-9]{3,}\M'
       and position(upper(new.coupon) in upper(lbl)) = 0 then
      raise exception
        'promo_label da firma "%" cita um codigo que NAO e o cupom dela ("%"). Cupom morto no ar credita zero comissao. Label: "%"',
        new.id, new.coupon, lbl;
    end if;
  end if;

  -- ── 2. Oferta vitalicia nao tem prazo, por definicao ────────────────────────
  -- Em 28/07 o canal publicou "89% OFF (vitalicio!)" e "Termina em 48h" na MESMA
  -- mensagem, porque a firma era lifetime E tinha promo_ends_at.
  if new.discount_type = 'lifetime' and new.promo_ends_at is not null then
    raise exception
      'firma "%" e discount_type=lifetime MAS tem promo_ends_at (%). Vitalicia nao tem prazo , ou zera o prazo, ou troca o tipo.',
      new.id, new.promo_ends_at;
  end if;

  -- ── 3. prices: preco final nunca pode ser >= preco cheio ────────────────────
  -- Bug recorrente do repo (Aqua 25K mostrava $125 e custava $50; TradeDay EOD 50K
  -- $175 e era $87; Earn2Trade cobrava o DOBRO). O cliente ve o dobro e abandona.
  if new.prices is not null and jsonb_typeof(new.prices) = 'array' then
    for linha in select * from jsonb_array_elements(new.prices) loop
      rotulo := coalesce(linha->>'a', '?');
      begin
        final_num := nullif(regexp_replace(coalesce(linha->>'n',''), '[^0-9.]', '', 'g'), '')::numeric;
        cheio_num := nullif(regexp_replace(coalesce(linha->>'o',''), '[^0-9.]', '', 'g'), '')::numeric;
      exception when others then
        final_num := null; cheio_num := null;
      end;
      -- final = cheio e' LEGITIMO (plano sem desconto). Só barra final > cheio.
      if final_num is not null and cheio_num is not null and final_num > cheio_num then
        raise exception
          'firma "%", plano "%": preco final (%) e MAIOR que o preco cheio (%). Provavelmente os dois campos estao invertidos.',
          new.id, rotulo, linha->>'n', linha->>'o';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_cms_firms on public.cms_firms;
create trigger trg_guard_cms_firms
  before insert or update on public.cms_firms
  for each row execute function public.guard_cms_firms();

comment on function public.guard_cms_firms() is
  'Recusa escrita em cms_firms com dado que ja causou incidente publico: promo_label em portugues / com em-dash / com % ou codigo que contradiz as colunas, lifetime com prazo, e preco final maior que o cheio. Criado 30/07/2026. O que depende de fonte externa fica no check_firm_data.py.';
