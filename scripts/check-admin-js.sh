#!/usr/bin/env bash
# Valida TODO o JavaScript inline do admin.html.
#
# Por que existe: em 29/07 eu inseri um helper fazendo replace de
# "function renderRoasKeywords(" — mas a declaracao era "ASYNC function ...".
# O replace casou o pedaco de dentro, o "async" ficou orfao numa linha sozinha, a
# funcao perdeu o modificador e os "await" dela viraram SyntaxError. Isso derruba o
# parse do script INTEIRO: doLogin nem chegava a existir e ninguem conseguia entrar
# no admin. O deploy passou porque eu validei o TRECHO que editei, nao o ARQUIVO.
#
# Rodar SEMPRE antes de deployar mudanca no admin.html.
set -e
cd "$(dirname "$0")/.."

python -c "
import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
s = open('admin.html', encoding='utf-8').read()
blocos = re.findall(r'<script(?![^>]*\ssrc=)[^>]*>(.*?)</script>', s, re.S)
sys.stdout.write('\n;\n'.join(blocos))
" > /tmp/_adminjs.js

node --check /tmp/_adminjs.js
echo "admin.html: JS inline compila"
