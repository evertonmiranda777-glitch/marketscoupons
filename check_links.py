#!/usr/bin/env python3
"""
Verificador de links de afiliado - Markets Coupons

Segue os redirects de cada link e confirma que o parametro de tracking
sobreviveu ate o destino final. Falha silenciosa de link de afiliado
nao gera erro nenhum no site: a pagina carrega, o usuario cadastra,
e a comissao simplesmente nao e atribuida.

FONTE: a Edge Function `firms-check`, autenticada por FIRMS_CHECK_TOKEN.
       firms.json e' FALLBACK SOMENTE-LEITURA quando a funcao nao responde.

Este script NUNCA toca no banco direto. A SUPABASE_SERVICE_ROLE_KEY ignora RLS e
da acesso total de leitura e escrita ao banco INTEIRO — por isso ela fica so
dentro da Edge Function e nunca sai do Supabase. O que roda no GitHub Actions
carrega apenas o FIRMS_CHECK_TOKEN, cujo pior caso de vazamento e alguem
desativar uma firma (reversivel), nao perder o banco.

Zero dependencias externas. Roda com qualquer Python 3.
    python3 check_links.py
    python3 check_links.py --offline               # forca o fallback firms.json
    python3 check_links.py --fix                   # ver ETAPA 4b abaixo
"""

import argparse
import base64
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

TIMEOUT = 25
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
MAX_REDIRECTS = 10

FN_URL = os.environ.get(
    "FIRMS_CHECK_URL",
    "https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/firms-check",
)
LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "autofix.log")


# ─────────────────────────── fonte de dados ───────────────────────────

def _token():
    """
    Token da Edge Function. Nunca e' impresso, logado nem posto em mensagem
    de commit. Sem token o script ainda LE (via firms.json), mas nao ESCREVE.
    """
    t = os.environ.get("FIRMS_CHECK_TOKEN")
    if t:
        return t.strip()
    # conveniencia local: arquivo gitignored, so na maquina do dono
    for arq in (".firms-check-token.tmp", ".env.local"):
        try:
            for linha in open(arq, encoding="utf-8"):
                if arq.endswith(".tmp"):
                    return linha.strip()
                if linha.startswith("FIRMS_CHECK_TOKEN="):
                    return linha.split("=", 1)[1].strip().strip('"').strip("'")
        except OSError:
            continue
    return None


def fn_request(metodo="GET", corpo=None):
    """Fala com a Edge Function. Levanta se nao houver token."""
    tok = _token()
    if not tok:
        raise RuntimeError("sem FIRMS_CHECK_TOKEN")
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(
        FN_URL, data=dados, method=metodo,
        headers={"X-Firms-Token": tok, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode() or "{}")


def carregar_da_funcao():
    """
    Le via `firms-check`. A funcao devolve TODAS as firmas, inclusive as
    inativas — precisamos enxergar as inativas pra detectar quando um link
    volta a funcionar e a firma pode ser religada.
    """
    d = fn_request("GET")
    return [
        {
            "slug": x["slug"],
            "nome": x.get("nome") or x["slug"],
            "url": x["affiliate_url"],
            "param": x["tracking_param"],
            "valor": x["tracking_value"],
            "coupon_code": x.get("coupon_code"),
            "ativo": x.get("ativo", True),
            "needs_review": bool(x.get("needs_review")),
            "needs_review_since": x.get("needs_review_since"),
            "coupon_description": x.get("coupon_description"),
            "extra": x.get("extra") or {},
        }
        for x in d.get("firms", [])
    ]


DIAS_PENDENCIA_VELHA = 30


def dias_desde(iso):
    """Dias inteiros desde um timestamptz ISO. None se nao der pra ler."""
    if not iso:
        return None
    try:
        t = datetime.datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=datetime.timezone.utc)
        return (datetime.datetime.now(datetime.timezone.utc) - t).days
    except Exception:
        return None


def carregar_do_json(caminho):
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def carregar(caminho_json, forcar_json=False):
    """
    Edge Function primeiro, firms.json de fallback SOMENTE-LEITURA.
    Devolve (firmas, origem). O fallback nunca habilita escrita: quem cair nele
    fica sem --fix, e o --fix falha de forma explicita (nao em silencio).
    """
    if not forcar_json:
        try:
            firmas = carregar_da_funcao()
            if firmas:
                return firmas, "Edge Function firms-check"
        except Exception as e:
            # Nunca imprimir o corpo do erro: uma URL de erro poderia carregar o token.
            print(f"  aviso: firms-check indisponivel ({type(e).__name__}), "
                  f"caindo pro fallback somente-leitura", file=sys.stderr)
    try:
        return carregar_do_json(caminho_json), f"fallback somente-leitura {caminho_json}"
    except FileNotFoundError:
        print(f"config nao encontrado: {caminho_json}", file=sys.stderr)
        sys.exit(2)


# ─────────────────────────── rede ───────────────────────────

class _SemRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def seguir_redirects(url):
    """
    Segue os redirects manualmente coletando TODA a evidencia do caminho.
    Devolve (url_final, status_final, urls, cookies).

    Coletar os cookies e' obrigatorio: metade das firmas nao carrega o codigo
    ate o destino, ela GRAVA um cookie no primeiro hop e joga o usuario pra home
    (Bulenox amember_aff_id, BrightFunded affiliateId, E8 discount). Julgar so
    pela URL final marcaria essas como quebradas quando estao perfeitas.
    """
    urls = [url]
    cookies = []
    atual = url
    opener = urllib.request.build_opener(_SemRedirect)

    for _ in range(MAX_REDIRECTS):
        req = urllib.request.Request(atual, headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        try:
            resp = opener.open(req, timeout=TIMEOUT)
            cookies += resp.headers.get_all("Set-Cookie") or []
            return atual, resp.status, urls, cookies
        except urllib.error.HTTPError as e:
            cookies += (e.headers.get_all("Set-Cookie") or []) if e.headers else []
            if e.code in (301, 302, 303, 307, 308):
                destino = e.headers.get("Location")
                if not destino:
                    return atual, e.code, urls, cookies
                atual = urllib.parse.urljoin(atual, destino)
                urls.append(atual)
                continue
            return atual, e.code, urls, cookies
        except Exception as e:
            return atual, f"ERRO: {type(e).__name__}", urls, cookies

    return atual, "LOOP_REDIRECT", urls, cookies


# ─────────────────────────── verificacao ───────────────────────────
#
# O QUE ESTE SCRIPT MEDE: se a ATRIBUICAO sobreviveu — nao se o servidor
# devolveu 200. Sao coisas diferentes, e confundir as duas ja custou caro aqui:
#   - e8markets.com/d/MARKET responde 404 e MESMO ASSIM renderiza a home e grava
#     o cookie discount=MARKET. Link perfeito, status feio.
#   - apextraderfunding.com devolve 403 pra qualquer cliente sem browser real
#     (Cloudflare). Nao e' link morto, e' bot-block.
#   - FTMO reembala o codigo em base64 dentro do authPayload do SSO.
#   - Bulenox grava amember_aff_id=<base64 do codigo> e redireciona pra home.
#
# Regra: PASSA se achar o codigo em qualquer lugar do caminho (URL, path, query,
# cookie, cru ou codificado). INCONCLUSIVO se o site bloqueou o robo. So FALHA
# quando o site respondeu de verdade e o codigo NAO esta em lugar nenhum.

BLOQUEIO_ROBO = {401, 403, 405, 406, 409, 418, 429, 451, 503}


def _variantes(valor):
    """Formas em que o mesmo codigo pode aparecer no caminho."""
    v = {valor, valor.lower(), urllib.parse.quote(valor), urllib.parse.quote_plus(valor)}
    try:
        b = base64.b64encode(valor.encode()).decode()
        v |= {b, urllib.parse.quote(b), b.rstrip("=")}
    except Exception:
        pass
    return {x for x in v if x}


def _decodificados(txt):
    """
    Alguns destinos REEMBALAM o afiliado: a FTMO joga o codigo dentro de um JSON
    e manda o JSON em base64 no parametro authPayload
    (authPayload=base64('{"be_CLA":"<codigo>"}')). Procurar o codigo cru na URL
    nao acha nada, mas a atribuicao esta la. Entao: todo pedaco que parece base64
    e' decodificado e vira mais um texto pra procurar.
    """
    saida = []
    for token in re.findall(r"[A-Za-z0-9_\-+/]{16,}={0,2}", urllib.parse.unquote(txt)):
        s = token.replace("-", "+").replace("_", "/")
        s += "=" * (-len(s) % 4)
        try:
            bruto = base64.b64decode(s, validate=False).decode("utf-8", "ignore")
        except Exception:
            continue
        if bruto.isprintable() and len(bruto) > 3:
            saida.append(bruto)
    return saida


def _procurar(valor, textos):
    """Devolve (achou, onde) procurando todas as variantes em todos os textos."""
    vs = _variantes(valor)
    for rotulo, txt in textos:
        low = txt.lower()
        for v in vs:
            if v.lower() in low:
                return True, rotulo
    # 2a passada: so depois de nao achar nada cru, tenta o conteudo decodificado
    for rotulo, txt in textos:
        for bruto in _decodificados(txt):
            if valor.lower() in bruto.lower():
                return True, f"{rotulo} (dentro de um payload base64)"
    return False, None


def checar(firma):
    """Verifica uma firma. Devolve dict com o resultado."""
    nome = firma["nome"]
    url = firma["url"]
    param = firma["param"]
    esperado = firma["valor"]
    extra = firma.get("extra") or {}

    final, status, urls, cookies = seguir_redirects(url)

    r = {
        "slug": firma.get("slug", nome), "nome": nome, "url": url, "final": final,
        "status": status, "cadeia": urls[1:], "ok": False, "inconclusivo": False,
        "motivo": "", "caso": None,
    }

    # 1) Evidencia forte: o parametro exato, com o valor exato, na URL final.
    if param != "path" and isinstance(status, int):
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(final).query)
        vals = qs.get(param, [])
        if vals and vals[0] == esperado:
            r["ok"] = True
            r["motivo"] = f"{param}={esperado} intacto"
            return r
        if vals and vals[0] != esperado:
            # O destino devolveu OUTRO codigo no nosso parametro. Isso e' grave:
            # ou a firma rotacionou, ou alguem sobrescreveu a atribuicao.
            r["motivo"] = f"'{param}' chegou como '{vals[0]}', esperado '{esperado}'"
            r["caso"] = "valor_divergente"
            r["encontrado"] = vals[0]
            return r

    # 2) Evidencia aceita: o codigo em qualquer ponto do caminho ou num cookie.
    textos = [("URL final", final)]
    textos += [(f"redirect #{i+1}", u) for i, u in enumerate(urls[1:])]
    textos += [(f"cookie {c.split('=')[0]}", c) for c in cookies]
    achou, onde = _procurar(esperado, textos)
    if achou:
        r["ok"] = True
        r["motivo"] = f"codigo '{esperado}' presente em {onde}"
        return r

    # 3) Sem evidencia. Antes de acusar, ver se o site simplesmente barrou o robo.
    if not isinstance(status, int):
        r["inconclusivo"] = True
        r["motivo"] = f"nao deu pra checar ({status}) - rede/timeout, nao e' prova de link morto"
        return r

    if status in BLOQUEIO_ROBO:
        r["inconclusivo"] = True
        r["motivo"] = (f"HTTP {status} - o site barra cliente sem browser (Cloudflare/rate-limit). "
                       f"Nao e' prova de link morto; conferir no navegador se insistir")
        return r

    if extra.get("verificacao") == "js":
        r["inconclusivo"] = True
        r["motivo"] = (f"HTTP {status} - atribuicao gravada por JS no browser, invisivel pro "
                       f"verificador headless (ver firms.extra.nota_verificacao)")
        return r

    # 4) O site respondeu de verdade e o codigo nao esta em lugar nenhum.
    if status >= 400:
        r["motivo"] = f"HTTP {status} e nenhum sinal de '{esperado}' na resposta - link morto"
        r["caso"] = "link_morto"
    else:
        r["motivo"] = f"HTTP {status} mas '{esperado}' sumiu do caminho (chegou: {final})"
        r["caso"] = "param_perdido"
    return r


# ─────────────────────────── ETAPA 4b: --fix ───────────────────────────
#
# REGRA DE OURO: o --fix NUNCA inventa valor. Ele so sabe fazer duas coisas:
#   desativar (tirar do ar) e registrar. Escrever um valor novo e' decisao humana.
#
#   Caso 1  site != tabela  -> nao existe aqui. O site le a tabela em runtime e as
#                              paginas estaticas sao regeradas dela (scripts/regen-static.mjs).
#                              Divergencia site-vs-tabela e' trabalho do check_pages.py.
#   Caso 2  link morto / parametro perdido -> ativo = false. Melhor a firma sumir do
#                              site do que mandar trafego pago que nao credita comissao.
#   Caso 3  valor novo desconhecido (o destino devolveu OUTRO codigo) -> NUNCA adotar.
#                              ativo = false + needs_review = true + alerta no log.

def registrar(linhas):
    os.makedirs(LOG_DIR, exist_ok=True)
    carimbo = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        for l in linhas:
            f.write(f"{carimbo} check_links {l}\n")
    for l in linhas:
        print(f"  [autofix] {l}")


def aplicar_fix(falhas):
    """
    Desativa o que quebrou, via Edge Function. Devolve lista de linhas de log.

    A funcao so aceita { slug, motivo } — ela NAO tem como escrever cupom, URL
    ou tracking, nem que este script tentasse. E o unico verbo dela e desativar:
    religar uma firma e sempre decisao humana no banco.
    """
    linhas = []
    for r in falhas:
        slug = r["slug"]
        if r["caso"] == "valor_divergente":
            # Caso 3: o destino devolveu um codigo que nao e' o nosso. Pode ser
            # rotacao legitima da firma OU sequestro de afiliado. Nao da pra saber
            # daqui, entao NAO adota: tira do ar e pede olho humano.
            motivo = (f"destino devolveu '{r.get('encontrado')}' no lugar do nosso codigo; "
                      f"valor novo NAO adotado (so humano decide)")
        else:
            # Caso 2: link morto ou parametro perdido.
            motivo = r["motivo"]
        try:
            fn_request("POST", {"slug": slug, "motivo": motivo})
            linhas.append(f"{slug} DESATIVADA — {motivo}")
        except Exception as e:
            # type(e) apenas: o corpo do erro pode conter a URL com o token.
            linhas.append(f"{slug} FALHA ao desativar ({type(e).__name__})")
    return linhas


# ────────────────────── secoes de acompanhamento ──────────────────────
#
# Nenhuma das duas mexe no exit code. Nao sao falha de link, sao lembrete:
# se derrubassem o job, o painel viveria vermelho e ninguem mais leria o
# vermelho que importa.

def secao_pendencias_antigas(firmas):
    """needs_review=true ha mais de 30 dias. Divida que ninguem cobrou."""
    velhas = []
    for f in firmas:
        if not f.get("needs_review"):
            continue
        d = dias_desde(f.get("needs_review_since"))
        if d is not None and d >= DIAS_PENDENCIA_VELHA:
            velhas.append((d, f))

    pendentes = [f["nome"] for f in firmas if f.get("needs_review")]
    if pendentes:
        print(f"\nPendentes de revisao humana (needs_review): {', '.join(pendentes)}")

    if not velhas:
        return
    velhas.sort(key=lambda x: -x[0])
    print(f"\n{'=' * 100}\nPENDENCIAS ANTIGAS (needs_review ha {DIAS_PENDENCIA_VELHA}+ dias)")
    print("Nao e falha de link: e lembrete. Nao afeta o resultado do job.\n")
    for d, f in velhas:
        motivo = (f.get("coupon_description") or "").strip()
        if not motivo:
            motivo = ((f.get("extra") or {}).get("nota_url")
                      or (f.get("extra") or {}).get("nota_verificacao") or "sem motivo registrado")
        estado = "" if f.get("ativo", True) else " [INATIVA]"
        print(f"  {f['nome']}{estado} — parada ha {d} dias")
        print(f"      {motivo[:160]}")
    print("=" * 100)


def secao_candidatas_reativacao(inativas):
    """
    Testa as firmas com ativo=false. Firma desativada por instabilidade fica fora
    do site ate alguem lembrar dela na mao — e ninguem lembra.

    NAO reativa nada, e de proposito: o link pode ter voltado com atribuicao
    DIFERENTE (codigo rotacionado, afiliado trocado) e daqui nao da pra distinguir
    isso de uma volta legitima. Religar continua sendo decisao manual no banco.

    Inativa que continua falhando: silencio total. Ela ja esta fora do site, o
    problema ja e conhecido, e repetir isso todo dia so gera ruido.
    """
    if not inativas:
        return
    candidatas = []
    for f in inativas:
        try:
            if checar(f)["ok"]:
                candidatas.append(f)
        except Exception:
            pass   # falhou de novo: segue fora, sem barulho
    if not candidatas:
        return

    print(f"\n{'=' * 100}\nCANDIDATAS A REATIVACAO ({len(candidatas)})")
    print("Voltaram a passar em todos os criterios de atribuicao.")
    print("NAO foram reativadas: o link pode ter voltado com atribuicao diferente,")
    print("e daqui nao da pra saber. Religar e decisao sua, no banco.\n")
    for f in candidatas:
        d = dias_desde(f.get("needs_review_since"))
        fora = f"ha {d} dias" if d is not None else "ha tempo indeterminado"
        motivo = (f.get("coupon_description") or "").strip() or "sem motivo registrado"
        print(f"  {f['nome']} — fora do site {fora}")
        print(f"      motivo da desativacao: {motivo[:160]}")
        print(f"      pra religar: update firms set ativo=true, needs_review=false "
              f"where slug='{f['slug']}';")
    print("=" * 100)


# ─────────────────────────── main ───────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="firms.json",
                    help="arquivo de fallback (usado se o Supabase nao responder)")
    ap.add_argument("--offline", action="store_true",
                    help="ignora o Supabase e le direto do --config")
    ap.add_argument("--fix", action="store_true",
                    help="desativa na tabela o que quebrou (nunca inventa valor)")
    args = ap.parse_args()

    firmas, origem = carregar(args.config, forcar_json=args.offline)

    ativas = [f for f in firmas if f.get("ativo", True)]
    inativas = [f for f in firmas if not f.get("ativo", True)]

    falhas, inconclusivos = [], []
    print(f"\nVerificando {len(ativas)} links de afiliado ativos | fonte: {origem}\n")
    print(f"{'FIRMA':<24} {'STATUS':<14} DETALHE")
    print("-" * 100)

    for firma in ativas:
        r = checar(firma)
        marca = "OK" if r["ok"] else ("INCONCLUSIVO" if r["inconclusivo"] else "FALHOU")
        print(f"{r['nome']:<24} {marca:<14} {r['motivo']}")
        if r["ok"]:
            continue
        (inconclusivos if r["inconclusivo"] else falhas).append(r)

    print("-" * 100)

    if inconclusivos:
        # Inconclusivo NUNCA derruba o job e NUNCA entra no --fix. Robo barrado
        # nao e' prova de nada; acusar aqui geraria alarme falso todo dia e o
        # painel vermelho permanente vira ruido que ninguem mais le.
        print(f"\n{len(inconclusivos)} sem veredito (site barrou o robo ou grava por JS) - "
              f"nao conta como falha:")
        for r in inconclusivos:
            print(f"  {r['nome']}: {r['motivo']}")

    secao_pendencias_antigas(firmas)
    secao_candidatas_reativacao(inativas)

    if not falhas:
        print("\nTodos os links preservaram o parametro de tracking.\n")
        return 0

    print(f"\n{len(falhas)} link(s) com problema:\n")
    for r in falhas:
        print(f"  {r['nome']}")
        print(f"    partiu de : {r['url']}")
        print(f"    chegou em : {r['final']}")
        print(f"    problema  : {r['motivo']}\n")

    if args.fix:
        # Falha EXPLICITA, nunca silenciosa: sem token o operador tem que saber
        # que o autofix nao rodou, senao o job fica verde sem ter consertado nada.
        if args.offline:
            print("ERRO: --fix nao roda com --offline (fallback e' somente-leitura).\n")
            return 2
        if not _token():
            print("ERRO: --fix precisa do FIRMS_CHECK_TOKEN. Nada foi alterado.\n")
            return 2
        registrar(aplicar_fix(falhas))
        print()

    return 1


if __name__ == "__main__":
    sys.exit(main())
