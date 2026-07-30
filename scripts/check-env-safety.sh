#!/usr/bin/env bash
# Trava se credencial de produção aparecer na máquina de dev.
set -uo pipefail
FALHOU=0

[ -f .prod-refs ] || exit 0
REFS=$(grep -vE '^\s*#|^\s*$' .prod-refs 2>/dev/null || true)
[ -z "$REFS" ] && exit 0

while IFS= read -r ref; do
  [ -z "$ref" ] && continue

  if [ -f .env.local ] && grep -qF "$ref" .env.local 2>/dev/null; then
    echo "  PRODUÇÃO no .env.local: identificador '$ref'"
    echo "    Sua máquina de dev não deve guardar credencial de produção."
    FALHOU=1
  fi

  EM_GIT=$(git grep -lF "$ref" -- ':!.prod-refs' ':!*.example' 2>/dev/null | head -3 || true)
  if [ -n "$EM_GIT" ]; then
    echo "  PRODUÇÃO em arquivo versionado: '$ref'"
    echo "$EM_GIT" | sed 's/^/    /'
    FALHOU=1
  fi
done <<< "$REFS"

if [ "$FALHOU" = "1" ]; then
  echo
  echo "BLOQUEADO — credencial de produção no ambiente de dev."
  exit 1
fi
echo "  ambiente limpo: nenhum identificador de produção no dev"
exit 0
