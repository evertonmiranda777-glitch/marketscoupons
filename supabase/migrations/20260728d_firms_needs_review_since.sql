-- needs_review sem prazo vira divida invisivel: fica marcado pra sempre e ninguem
-- e avisado. A FTMO ja estava assim. Esta coluna da idade a pendencia, e o
-- check_links.py passa a listar tudo que passou de 30 dias.
--
-- O carimbo e automatico no trigger, nao no codigo do app: se dependesse do app,
-- bastaria um caminho de escrita esquecer de setar e a pendencia nasceria sem idade.

alter table public.firms
  add column if not exists needs_review_since timestamptz;

comment on column public.firms.needs_review_since is
  'Quando needs_review virou true. Preenchido/zerado pelo trigger firms_touch, nunca na mao.';

-- O trigger firms_touch ja existe (mantem o updated_at). Estendido pra carimbar a
-- idade da pendencia na MESMA transacao do UPDATE.
create or replace function public.firms_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();

  if new.needs_review is distinct from old.needs_review then
    if new.needs_review then
      new.needs_review_since = now();   -- comecou a pendencia
    else
      new.needs_review_since = null;    -- resolvida: zera o relogio
    end if;
  end if;

  return new;
end $$;

-- INSERT nao passa pelo trigger acima (ele e BEFORE UPDATE). Uma firma que ja nasce
-- com needs_review=true precisa nascer com a idade tambem.
create or replace function public.firms_stamp_on_insert()
returns trigger language plpgsql as $$
begin
  if new.needs_review and new.needs_review_since is null then
    new.needs_review_since = now();
  end if;
  return new;
end $$;

drop trigger if exists firms_stamp_insert on public.firms;
create trigger firms_stamp_insert before insert on public.firms
for each row execute function public.firms_stamp_on_insert();

-- Backfill: quem ja esta marcado herda o updated_at. E aproximacao (o updated_at pode
-- ter sido mexido por outra edicao depois), entao SUBESTIMA a idade da pendencia.
-- Subestimar e o lado seguro: no maximo o aviso demora mais a aparecer, nunca aparece
-- antes da hora.
update public.firms
   set needs_review_since = updated_at
 where needs_review = true
   and needs_review_since is null;

create index if not exists firms_needs_review_since_idx
  on public.firms (needs_review_since)
  where needs_review;
