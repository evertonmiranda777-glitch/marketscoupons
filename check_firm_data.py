#!/usr/bin/env python3
"""
check_firm_data.py , procura incoerencia no dado de firma que o TRIGGER nao alcanca.

DIVISAO DE TRABALHO:
  · trigger `trg_guard_cms_firms` (banco, TEMPO REAL): recusa o que da pra provar com
    a propria linha , promo_label em portugues, em-dash, % que contradiz `discount`,
    codigo diferente do cupom, lifetime com prazo, preco final maior que o cheio.
  · ESTE script (cron diario): o que precisa CRUZAR fontes , `firms` x `cms_firms`,
    `cms_firms.kb` x colunas, `prices` x `detail_plans`.
  · `check_links.py`: atribuicao do link de afiliado.
  · `check_pages.py`: as ~2.700 paginas estaticas x tabela.

POR QUE EXISTE (30/07/2026, ordem do Everton: "cria uma ferramenta que te avisa
mudancas em tempo real e etc, foda-se vc precisa resolver essa merda"):
Ele coletou o dado na mao e eu ficava perguntando a ele coisa que estava na tabela,
ou publicando valor podre. Achados de 29-30/07, TODOS no ar ao mesmo tempo:
has_activation_fee errado em 8 de 18 firmas · 7 promo_label contradizendo o cupom ou
o % · 6 em portugues num canal EN-only · a Aqua mandando digitar `h5d`, que e o
parametro de afiliado e nao um cupom · a resposta de cupons do bot chumbada mandando
usar `E8` (publico, zero comissao).

Exit code: 0 = limpo, 1 = achou divergencia. Nao corrige nada, so aponta.

Uso:
  SUPABASE_SERVICE_ROLE_KEY=... python check_firm_data.py
  FIRMS_CHECK_TOKEN=...        python check_firm_data.py     # caminho do CI
"""
import json
import os
import re
import sys
import urllib.request
import urllib.error

SB = "https://qfwhduvutfumsaxnuofa.supabase.co"
FN = os.environ.get("FIRMS_CHECK_URL", f"{SB}/functions/v1/firms-check")
KB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "firm-kb")

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def _get(url, headers):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


def carregar():
    """cms_firms via service role (local). `firms` pela Edge Function quando no CI,
    porque a service role NAO entra no GitHub Actions (ignora RLS = banco inteiro)."""
    sr = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE")
    tok = os.environ.get("FIRMS_CHECK_TOKEN")

    cms = None
    if sr:
        cols = ("id,name,discount,discount_type,coupon,disc_note,promo_label,promo_ends_at,"
                "has_activation_fee,prices,detail_plans,kb,active")
        cms = _get(f"{SB}/rest/v1/cms_firms?active=eq.true&select={cols}&order=id",
                   {"apikey": sr, "Authorization": f"Bearer {sr}"})

    aff = None
    if tok:
        d = _get(FN, {"X-Firms-Token": tok})
        aff = [f for f in (d.get("firms") or []) if f.get("ativo")]
    elif sr:
        aff = _get(f"{SB}/rest/v1/firms?ativo=eq.true&select=slug,coupon_code,affiliate_url,"
                   f"tracking_param,tracking_value,needs_review",
                   {"apikey": sr, "Authorization": f"Bearer {sr}"})
    return cms, aff


def num(s):
    t = re.sub(r"[^0-9.]", "", str(s or ""))
    try:
        return float(t) if t else None
    except ValueError:
        return None


def main():
    cms, aff = carregar()
    if not cms:
        print("sem acesso ao cms_firms (SUPABASE_SERVICE_ROLE_KEY). Abortado, "
              "nao dou 'ok' sem ter lido.")
        return 2

    por_slug = {a["slug"]: a for a in (aff or [])}
    problemas = []   # contam como falha (exit 1)
    notas = []       # informativo, NAO mexe no exit code

    def erro(fid, tipo, msg):
        problemas.append((fid, tipo, msg))

    for f in cms:
        fid = f["id"]

        # 1. Cupom TEM que ser igual nas duas tabelas. `firms` e a fonte de afiliado;
        #    o cms_firms e' quem o card e o Max leem. Divergir = anunciar um e creditar outro.
        a = por_slug.get(fid)
        if a:
            c_aff = (a.get("coupon_code") or "").strip()
            c_cms = (f.get("coupon") or "").strip()
            if c_aff != c_cms:
                erro(fid, "CUPOM DIVERGE",
                     f"firms='{c_aff or '(vazio)'}' x cms_firms='{c_cms or '(vazio)'}'")
            # 2. O cupom NAO pode ser o parametro de tracking. Foi a Aqua: `h5d` e o
            #    valor do afmc, nao um codigo , o cliente digitava e nao ganhava nada.
            #
            # ⚠️ NAO EXISTE regra "cupom == tracking_value". Eu escrevi e ela deu 6
            # FALSOS POSITIVOS de primeira: em alphafutures (MARKETS026158), blueberry
            # (MARKET-7652C), blueguardian e e8 (MARKET), brightfunded (CLNLTPxt...) e
            # e2t (MARKETSCOUPONS) o codigo do afiliado E, legitimamente, o cupom que o
            # cliente digita. O caso da Aqua (`h5d`, que rastreia mas nao desconta) NAO
            # da pra separar desses com o dado que existe aqui , so no checkout ou na KB.
            # Regra que nao distingue certo de errado nao entra: viraria ruido, e pior,
            # eu acabaria "consertando" dado bom. Mesma licao dos 6 falsos positivos da
            # 1a versao do check_links.py.
        elif aff is not None:
            erro(fid, "SEM LINHA EM firms", "ativa no cms_firms mas ausente/inativa em firms")

        # 3. `detail_plans` e o SEGUNDO armazem de preco (alimenta o fd-overlay) e sofre
        #    do mesmo bug do primeiro: desconto gravado MAIOR que o preco cheio.
        #
        # ⚠️ NAO comparo o CONJUNTO de precos entre os dois armazens. Tentei e deu falso
        # positivo em apex, fn e toponefutures: o `prices` da apex usa 4 dimensoes
        # (n/na/n2/n5/na52...) e o `detail_plans` usa tipos por tamanho, entao os
        # conjuntos legitimamente NAO coincidem. O que da pra provar e a inversao.
        pr = f.get("prices") or []
        dp = f.get("detail_plans") or {}
        for tipo, linhas in dp.items():
            for l in (linhas or []):
                d_num, o_num = num(l.get("d")), num(l.get("o"))
                if d_num is not None and o_num is not None and d_num > o_num:
                    erro(fid, "DETAIL_PLANS INVERTIDO",
                         f"{tipo} {l.get('s')}: desconto {l.get('d')} > cheio {l.get('o')}")

        # 4. has_activation_fee x o que a KB diz. A KB foi destilada dos relatorios do
        #    Everton, entao ela e a fonte. A coluna estava errada em 8 de 18 em 30/07.
        kb_path = os.path.join(KB_DIR, f"{fid}.md")
        if os.path.exists(kb_path):
            kb = open(kb_path, encoding="utf-8").read()
            diz_sem = re.search(r"NO ACTIVATION FEE", kb) is not None
            # ⚠️ Nao basta achar "$" perto de "activation fee". A KB da alphafutures diz
            # "the $149 Advanced activation fee WAS REMOVED 2026-07-08", e a da FFF fala
            # de um plano legacy que nao esta a venda , as duas casavam e davam falso
            # positivo. So conta como "cobra" quando o valor NAO aparece em frase de
            # negacao/passado.
            NEGA = r"(removed|no longer|was |were |used to|legacy|discontinued|none|\$0)"
            diz_cobra = False
            for m in re.finditer(r"[^.\n]{0,120}ACTIVATION FEE[^.\n]{0,120}", kb, re.I):
                trecho = m.group(0)
                if re.search(r"\$\s?\d", trecho) and not re.search(NEGA, trecho, re.I):
                    diz_cobra = True
                    break
            col = f.get("has_activation_fee")
            # TRES estados, nao dois. Regex em prosa nao decide firma de plano MISTO,
            # e forcar um veredito ali gera exatamente o ruido que faz a ferramenta ser
            # ignorada. Mesma doutrina do check_links.py: quando nao da pra provar, o
            # resultado e INCONCLUSIVO e NAO conta como falha.
            if diz_sem and diz_cobra:
                # Ex: toponefutures (Elite Daily $0 + Elite Access $139) e the5ers
                # (maioria "None" + Bootcamp cobra na aprovacao). Sao os casos AMBAR.
                notas.append((fid, "MISTO (conferir na mao)",
                              f"a KB diz 'no activation fee' E cita valor; coluna={col}"))
            elif diz_sem and col is True:
                erro(fid, "has_activation_fee",
                     "coluna diz que COBRA, mas a KB diz NO ACTIVATION FEE em todos os planos")
            elif diz_cobra and col is False:
                erro(fid, "has_activation_fee",
                     "coluna diz que NAO cobra, mas a KB cita valor de taxa")

        # 5. Firma com desconto declarado mas TODA linha de preco sem desconto = o card
        #    anuncia % e mostra preco cheio. Ponto cego da triagem, custou retrabalho.
        d = f.get("discount") or 0
        if d > 0 and pr:
            pares = [(num(p.get("n")), num(p.get("o"))) for p in pr]
            pares = [(n, o) for n, o in pares if n is not None and o is not None]
            if pares and all(n >= o for n, o in pares):
                erro(fid, "ANUNCIA % SEM DESCONTO",
                     f"discount={d}% mas NENHUMA das {len(pares)} linhas tem final < cheio")

        # 6. Prazo no passado ainda gravado = contador zerado/negativo na tela.
        pe = f.get("promo_ends_at")
        if pe:
            from datetime import datetime, timezone
            try:
                dt = datetime.fromisoformat(str(pe).replace("Z", "+00:00"))
                if dt < datetime.now(timezone.utc):
                    erro(fid, "PRAZO VENCIDO", f"promo_ends_at={str(pe)[:16]} ja passou")
            except ValueError:
                erro(fid, "PRAZO INVALIDO", str(pe))

    print(f"Conferidas {len(cms)} firmas ativas"
          f"{' + ' + str(len(aff)) + ' em firms' if aff else ''}\n")
    if not problemas:
        print("Nenhuma divergencia.")
        return 0

    largura = max(len(p[1]) for p in problemas)
    for fid, tipo, msg in problemas:
        print(f"  {fid:<24}{tipo:<{largura + 2}}{msg}")
    print(f"\n{len(problemas)} divergencia(s).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
