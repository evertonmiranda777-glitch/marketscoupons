#!/usr/bin/env bash
# Limpeza de fim de sessão — remove SÓ artefatos regeneráveis (snapshots, cache, scratch).
# NUNCA toca em código, conteúdo versionado, img/, docs/, scripts/ ou .env*.
# Uso: bash scripts/clean-session.sh
set -e
cd "$(dirname "$0")/.."

echo "== Limpeza de sessão =="
# 1. Snapshots do navegador (Playwright MCP) — gitignored, regeneram
n=$(find .playwright-mcp -type f 2>/dev/null | wc -l); rm -rf .playwright-mcp/* 2>/dev/null || true
echo "  .playwright-mcp:  $n arquivos"
# 2. Cache de scrape (Firecrawl) — gitignored, regeneram
n=$(find .firecrawl -type f 2>/dev/null | wc -l); rm -rf .firecrawl/* 2>/dev/null || true
echo "  .firecrawl:       $n arquivos"
# 3. Scratch HTML/JSON no tmp do repo (scratchpad — telegram-preview.html é preservado pelo .gitignore)
n=$(find tmp -type f ! -name 'telegram-preview.html' 2>/dev/null | wc -l); find tmp -type f ! -name 'telegram-preview.html' -delete 2>/dev/null || true
echo "  tmp/ (scratch):   $n arquivos"
# 4. Dumps meus no /tmp do sistema (scraping de firma)
n=$(ls /tmp/*.html /tmp/*-gm.html /tmp/fs.json /tmp/b.json /tmp/t.json 2>/dev/null | wc -l)
rm -f /tmp/*.html /tmp/fs.json /tmp/b.json /tmp/t.json 2>/dev/null || true
echo "  /tmp (dumps):     $n arquivos"

echo "== OK. Disco preservado: img/ docs/ scripts/ código intactos. =="
