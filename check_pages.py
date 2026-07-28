#!/usr/bin/env python3
"""
Verificador de paginas estaticas geradas - Markets Coupons

O check_links.py testa os links da tabela `firms`. Mas as paginas em
seo/, compare/ e guides/ sao HTML estatico: elas NAO passam pela tabela.
Se foram geradas antes de uma correcao, continuam servindo o valor antigo
indefinidamente, e nenhum verificador de link enxerga isso — porque o link
da tabela esta certo; quem esta errada e a pagina.

Foi esse buraco que deixou seo/aquafutures.html anunciando 60% OFF (real: 45%)
apontando pro dominio morto aquafutures.io.

FONTE: a tabela `firms` no Supabase. firms.json e' so FALLBACK.

Uso:
    python3 check_pages.py
    python3 check_pages.py --dirs seo compare guides
    python3 check_pages.py --json
    python3 check_pages.py --fix      # regera as paginas da tabela (ETAPA 4b, caso 1)
"""

import argparse
import json
import os
import re
import subprocess
import sys
from collections import defaultdict

import check_links  # reaproveita carregar()/registrar() — uma fonte de dado so

# ─────────────────────────────────────────────────────────────────────────────
# Valores MORTOS: ja foram corrigidos e nunca podem reaparecer numa pagina.
# Inventario levantado na Etapa 1 (auditoria dos 19 links, 27-28/07/2026).
# Cada entrada: (regex, por que e' proibido)
#
# Regra pra entrar aqui: o valor tem que ser (a) inequivoco — nao pode casar com
# texto legitimo — e (b) comprovadamente morto ou nao-nosso. Cupom PUBLICO da
# firma entra porque, mesmo funcionando pro cliente, ele NAO paga comissao:
# publicar um desses e' o mesmo que dar a venda de graca.
# ─────────────────────────────────────────────────────────────────────────────
PADROES_PROIBIDOS = [
    # -- dominios mortos --
    (r"aquafutures\.io",            "dominio morto da Aqua (rebrand para aquafunded.com)"),
    (r"checkout\.aquafutures",      "dominio morto da Aqua (rebrand)"),

    # -- parametro de tracking errado (nao atribui, comissao perdida) --
    (r"fundingpips[^\"'\s]*[?&]ref=",
     "FundingPips atribui por referral_code; com ?ref= a venda nao credita"),

    # -- cupons NOSSOS que morreram --
    (r"\bFLEXJU\b",                 "cupom velho da FundedNext (morto)"),
    (r"\bMARKETS-2C7C0\b",          "codigo da Blueberry que foi um bug; o certo e MARKET-7652C"),
    (r"\bSPARKWEEK15\b",            "cupom da CTI que expirou em 30/jun"),

    # -- cupons PUBLICOS da firma: funcionam, mas NAO pagam comissao --
    (r"\bSAVENOW\b",                "cupom publico da Apex; o nosso e MARKET (publico nao credita)"),
    (r"\bALPHA40\b",                "cupom publico da Alpha; o nosso e MARKETS026158"),
    (r"\bTDNEW\b",                  "cupom publico da TradeDay; o nosso e MARKETS"),
    (r"\bFUTURES60\b",              "cupom publico da Blueberry; o nosso e MARKET-7652C"),
    (r"\bFLEX50\b",                 "cupom publico da Earn2Trade; o nosso e MARKETSCOUPONS"),
    (r"\b15MPAID\b",                "cupom publico da BrightFunded; o nosso e o codigo do painel"),
    (r"\bNEW25\b",                  "cupom publico da FundedNext; o nosso e MARKET"),
]

# Diretorios gerados (a versao <lang>/ de cada um e descoberta sozinha)
DIRS_PADRAO = ["seo", "compare", "guides"]
LANGS = ["en", "pt", "es", "it", "fr", "de", "ar", "id"]


def expandir_dirs(dirs):
    """seo -> seo, en/seo, es/seo, ... (so os que existem)"""
    saida = []
    for d in dirs:
        if os.path.isdir(d):
            saida.append(d)
        for l in LANGS:
            p = os.path.join(l, d)
            if os.path.isdir(p):
                saida.append(p)
    return saida


def arquivos_html(dirs):
    for d in dirs:
        for raiz, _, nomes in os.walk(d):
            for n in nomes:
                if n.endswith((".html", ".htm")):
                    yield os.path.join(raiz, n)


def firmas_do_caminho(caminho, slugs):
    """
    Descobre de que firma(s) a pagina fala pelo NOME DO ARQUIVO, nao pelo texto.
    seo/apex.html -> {apex} | compare/apex-vs-bulenox.html -> {apex, bulenox}
    Isso evita o falso positivo de casar 'MARKET' com qualquer palavra do corpo.
    """
    base = os.path.basename(caminho)[:-5]  # tira .html
    achadas = set()
    if base in slugs:
        achadas.add(base)
    if "-vs-" in base:
        for parte in base.split("-vs-"):
            if parte in slugs:
                achadas.add(parte)
    return achadas


def checar_arquivo(caminho, por_slug, slugs):
    problemas = []
    try:
        with open(caminho, encoding="utf-8", errors="replace") as f:
            conteudo = f.read()
    except OSError as e:
        return [{"tipo": "leitura", "detalhe": str(e)}]

    # 1. valores que nunca podem reaparecer, em qualquer pagina
    for regex, motivo in PADROES_PROIBIDOS:
        for m in re.finditer(regex, conteudo, re.IGNORECASE):
            problemas.append({
                "tipo": "valor_morto",
                "linha": conteudo[: m.start()].count("\n") + 1,
                "achado": m.group(0),
                "detalhe": motivo,
            })

    # Stub de redirect (as ~1.400 paginas <b>-vs-<a> que so apontam pra canonica).
    # Nao tem conteudo nem link de afiliado: cobrar cupom/URL delas e' falso positivo.
    if re.search(r'http-equiv=["\']?refresh', conteudo, re.IGNORECASE):
        return problemas

    firmas_pagina = sorted(firmas_do_caminho(caminho, slugs))

    # 2. a pagina DESTA firma tem que trazer a URL e o cupom da tabela
    for slug in firmas_pagina:
        f = por_slug[slug]

        url = f["url"]
        # compara so ate o '#': o fragmento nao viaja pro servidor e alguns
        # geradores o omitem — divergir nele nao muda atribuicao nenhuma
        base_url = url.split("#")[0]
        # href em HTML escapa o & como &amp; — as duas formas contam como a mesma URL
        formas = {base_url, base_url.replace("&", "&amp;")}
        if not any(x in conteudo for x in formas):
            problemas.append({
                "tipo": "url_divergente",
                "achado": base_url,
                "detalhe": f"pagina de '{slug}' nao contem a affiliate_url da tabela",
            })

        cup = f.get("coupon_code")
        if cup:
            if cup not in conteudo:
                problemas.append({
                    "tipo": "cupom_ausente",
                    "achado": cup,
                    "detalhe": f"pagina de '{slug}' nao exibe o cupom atual '{cup}'",
                })
        elif len(firmas_pagina) == 1:
            # Firma SEM codigo: exibir um cupom nosso ali faz o usuario digitar
            # um codigo invalido no checkout da firma e abandonar a compra.
            # So vale em pagina de UMA firma — numa compare page o cupom da outra
            # firma esta ali de proposito.
            for outro in slugs:
                c = por_slug[outro].get("coupon_code")
                if not c or outro == slug:
                    continue
                if re.search(r"\b" + re.escape(c) + r"\b", conteudo):
                    problemas.append({
                        "tipo": "cupom_indevido",
                        "achado": c,
                        "detalhe": (f"'{slug}' nao tem cupom (desconto vem do link), "
                                    f"mas a pagina exibe '{c}' (que e' da {outro})"),
                    })
                    break

    return problemas


def aplicar_fix():
    """
    ETAPA 4b, caso 1: pagina divergente da tabela.
    Nao existe 'consertar a pagina': a pagina e' derivada. O conserto e' REGERAR
    da tabela. Editar HTML gerado na mao seria desfeito na proxima geracao e
    esconderia o bug de verdade.
    """
    print("\n[--fix] regerando as paginas estaticas a partir da tabela `firms`...\n")
    r = subprocess.run(["node", "scripts/regen-static.mjs", "--force"])
    ok = r.returncode == 0
    check_links.registrar([
        "check_pages regen-static %s (paginas divergiam da tabela)" % ("OK" if ok else "FALHOU")
    ])
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dirs", nargs="+", default=DIRS_PADRAO)
    ap.add_argument("--firms", default="firms.json", help="fallback quando o Supabase nao responde")
    ap.add_argument("--offline", action="store_true", help="le so do --firms")
    ap.add_argument("--json", action="store_true", help="saida em JSON")
    ap.add_argument("--fix", action="store_true", help="regera as paginas da tabela")
    args = ap.parse_args()

    firmas, origem = check_links.carregar(args.firms, forcar_json=args.offline)
    por_slug = {f["slug"]: f for f in firmas}
    slugs = set(por_slug)

    dirs = expandir_dirs(args.dirs)
    if not dirs:
        print(f"nenhum diretorio gerado encontrado em: {', '.join(args.dirs)}", file=sys.stderr)
        return 2

    total = 0
    afetados = {}
    por_tipo = defaultdict(int)

    for caminho in arquivos_html(dirs):
        total += 1
        problemas = checar_arquivo(caminho, por_slug, slugs)
        if problemas:
            afetados[caminho] = problemas
            for p in problemas:
                por_tipo[p["tipo"]] += 1

    if args.json:
        print(json.dumps(afetados, ensure_ascii=False, indent=2))
        return 1 if afetados else 0

    print(f"\nVarridas {total} paginas geradas em {len(dirs)} diretorios | fonte: {origem}\n")

    if not afetados:
        print("Nenhuma divergencia. Todas batem com a tabela.\n")
        return 0

    print(f"{len(afetados)} pagina(s) com divergencia\n")
    for tipo, qtd in sorted(por_tipo.items()):
        print(f"  {tipo:<18} {qtd}")
    print()

    for caminho, problemas in list(afetados.items())[:25]:
        print(f"  {caminho}")
        for p in problemas[:4]:
            linha = f":{p['linha']}" if "linha" in p else ""
            print(f"      [{p['tipo']}]{linha} {p['detalhe']}")
        if len(problemas) > 4:
            print(f"      ... mais {len(problemas) - 4} nesse arquivo")
        print()

    if len(afetados) > 25:
        print(f"  ... mais {len(afetados) - 25} paginas. Use --json pra lista completa.\n")

    if args.fix:
        return 0 if aplicar_fix() else 1

    print("Correcao: `node scripts/regen-static.mjs --force`. NAO edite a pagina a mao.\n")
    return 1


if __name__ == "__main__":
    sys.exit(main())
