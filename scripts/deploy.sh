#!/usr/bin/env bash
# Deploy de producao. USAR SEMPRE ISTO, nunca o `npx vercel` na mao.
#
# POR QUE EXISTE (29/07/2026): eu rodei o deploy direto e a saida do CLI ecoou o
# VERCEL_TOKEN inteiro no log da conversa. O CLI imprime, no fim, um bloco de
# "comandos uteis" com `--token=<valor cru>` , ou seja, QUALQUER deploy que
# mostre a saida bruta vaza a credencial. Nao e caso de "tomar cuidado": tem que
# ser impossivel.
#
# Este script:
#   1) le o token do .env.local (nunca de argumento , argv aparece em `ps`)
#   2) manda TODA a saida pra arquivo
#   3) imprime so o filtrado, com o valor do token trocado por [REDIGIDO]
#   4) roda o build-compat ANTES (ES2019; sem isso o WebView velho da India
#      aborta o app.js inteiro e a pagina fica branca)
#
# Uso:  bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

VT=$(grep '^VERCEL_TOKEN=' .env.local | sed 's/^VERCEL_TOKEN=//' | tr -d '" ')
if [ -z "$VT" ]; then
  echo "sem VERCEL_TOKEN no .env.local" >&2
  exit 1
fi

echo "== build-compat (ES2019)"
node scripts/build-compat.mjs

# Snapshot estatico das firmas: e' o fallback que impede a pagina de renderizar
# VAZIA quando o Postgres cai (aconteceu 29/07, ~3h, visitante novo via 0 firmas
# e 0 cupons enquanto o CDN devolvia 200 e nenhum monitor acusava).
# Regerar a cada deploy, senao o fallback envelhece e serve cupom velho.
echo "== snapshot de fallback das firmas"
SR=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | sed 's/^SUPABASE_SERVICE_ROLE_KEY=//' | tr -d '" ')
if [ -n "$SR" ]; then
  SUPABASE_SERVICE_ROLE_KEY="$SR" node scripts/build-firms-fallback.mjs || {
    echo "AVISO: nao regerei o fallback. Deploy segue com o snapshot anterior." >&2
  }
else
  echo "AVISO: sem SUPABASE_SERVICE_ROLE_KEY, fallback nao regerado." >&2
fi

LOG=$(mktemp)
# Sai do log em qualquer caminho , inclusive erro , pra nao deixar o token
# escrito em arquivo temporario no disco.
trap 'rm -f "$LOG"' EXIT

echo "== deploy"
set +e
CI=1 npx vercel --prod --yes --token="$VT" >"$LOG" 2>&1
CODE=$?
set -e

# O filtro roda ANTES de qualquer coisa chegar na tela. Nunca `cat "$LOG"` aqui.
sed "s|$VT|[REDIGIDO]|g" "$LOG" | grep -iE '^(Production|Preview):|error|Error:' || true

if [ "$CODE" -ne 0 ]; then
  echo "DEPLOY FALHOU (exit $CODE) , saida completa, redigida:" >&2
  sed "s|$VT|[REDIGIDO]|g" "$LOG" | tail -40 >&2
  exit "$CODE"
fi

echo "== conferindo no ar"
curl -sI "https://www.marketscoupons.com/?v=$(date +%s)" | head -1
