# Restore de backup Supabase

Backups diários ficam em `backups/YYYY-MM-DD/<tabela>.json` no Supabase Storage do projeto. Retenção 30 dias.

## Pra ver o que tem disponível

```bash
# Lista pastas de backup (por data)
curl -s "https://qfwhduvutfumsaxnuofa.supabase.co/storage/v1/object/list/backups" \
  -X POST \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":100}'
```

## Pra baixar um backup específico

```bash
# Substitui YYYY-MM-DD pela data desejada e TABLE pela tabela
DATE="2026-04-27"
TABLE="cms_firms"

curl -s "https://qfwhduvutfumsaxnuofa.supabase.co/storage/v1/object/backups/${DATE}/${TABLE}.json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -o "${TABLE}.json"
```

## Pra restaurar dados

**Antes de qualquer restore — sempre fazer backup do estado atual primeiro:**

```bash
# Trigger backup manual no GitHub Actions
gh workflow run backup-supabase.yml
```

### Opção A — restore parcial (linhas específicas)

Edita o JSON baixado, mantém só as linhas que quer restaurar, depois faz upsert via REST:

```bash
curl -X POST "https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1/cms_firms" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d @cms_firms.json
```

### Opção B — restore completo (substitui tudo da tabela)

⚠️ **Destrutivo.** Confirme com Everton antes:

```bash
# 1. Backup do estado atual (gh workflow run backup-supabase.yml)
# 2. Trunca a tabela via Supabase SQL Editor
# 3. Reimporta o JSON via Supabase Studio → Table Editor → Insert → JSON
```

## Validar que backup tá rodando

```bash
# Última run do workflow
gh run list --workflow=backup-supabase.yml --limit=3

# Ver pasta mais recente em Supabase Storage
DATE=$(date -u +%Y-%m-%d)
curl -s "https://qfwhduvutfumsaxnuofa.supabase.co/storage/v1/object/list/backups" \
  -X POST \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"prefix\":\"$DATE/\",\"limit\":50}"
```

Vai listar todos os arquivos do dia. Se `_manifest.json` existir, o backup completou OK.
