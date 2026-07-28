# AGENTS.md — regras para qualquer agente que mexer neste repo

Este arquivo vale para IA e para humano. Ele existe porque quatro falhas reais
ficaram meses no ar sem ninguém ver, e todas tinham a mesma causa: **um valor de
afiliado escrito à mão em algum arquivo**.

O que aconteceu:

| Falha | Efeito | Tempo no ar |
|---|---|---|
| Cupom da E8 trocado de `MARKET` por um código público | venda acontecia, comissão não | dias |
| FundingPips com `?ref=` no lugar de `referral_code=` | atribuição zerada | meses |
| Futures Elite apontando pro **login** em vez do cadastro | 0 cadastros afiliados | meses |
| Aqua no domínio `aquafutures.io` depois do rebrand | link morto em 152 páginas | semanas |

Nenhuma delas gera erro. A página carrega, o usuário compra, e o dinheiro
simplesmente não chega. Por isso as regras abaixo são duras.

---

## 1. Onde mora o dado de afiliado

**Tabela `firms` no Supabase. Só lá.**

| Coluna | O que é |
|---|---|
| `slug` | id da firma (bate com `cms_firms.id`) |
| `affiliate_url` | URL completa, **sempre da rota de CADASTRO**, nunca de login |
| `tracking_param` | nome do parâmetro (`referral_code`, `afmc`, `a_aid`, `aff`…). `path` quando o código vai no caminho da URL |
| `tracking_value` | o código em si |
| `coupon_code` | cupom. **`NULL` = a firma não tem código** (desconto vem do link). Estado válido e final |
| `needs_review` | `true` = valor desconhecido, pendente de humano. **Não confundir com `coupon_code NULL`** |
| `extra` | jsonb pra caso específico (ex: `a_bid` condicional da Earn2Trade, nota de verificação da E8) |

`cms_firms` continua sendo a fonte de **preço, regra e KB**. Não misturar.

## 2. Proibido escrever valor de afiliado em código

Nunca digite cupom, código de referral, URL de afiliado ou nome de plano em
`.js`, `.html`, `.md`, `.json` ou em comentário. Nem "só pra testar".

- **Runtime** (`app.js`, `coupons.html`, `firm-detail.html`, `api/bot.js`, `lib/email-render.js`, `js/site-footer.js`): lê a tabela e sobrepõe.
- **Páginas geradas** (`seo/`, `compare/`, `guides/`): geradas da tabela via `scripts/lib/firms-source.mjs`. Nos `.md` dos guias use os tokens `{{AFF:slug}}` e `{{CUP:slug}}`.
- **Migrations** são a única exceção: é lá que o valor entra no banco pela primeira vez.

Critério de aceite, tem que voltar vazio:

```bash
grep -rnE "MARKET89|MARKETSCOUPONS|MARKETS026158|MARKET-7652C|INFINITY8|AFF5585615|eyfIptUCGgfcfaUlyrRP|31985EAA|ed5ae23f|lp_707970|CLNLTPxtT4Sok0PzHaRIIQ" \
  --include="*.js" --include="*.html" . | grep -v node_modules
```

## 3. Nunca invente um valor

Esta é a regra que não tem exceção.

- Não digite um cupom, código ou URL a partir de memória, resumo ou contexto de conversa.
- Não deduza por analogia. `MARKET`, `MARKETS`, `MARKET89`, `MARKETSCOUPONS`, `MARKET-7652C` e `MARKETS026158` são **valores diferentes**. Compare caractere por caractere.
- Não normalize, não padronize, não "corrija" o que parece inconsistente.
- Sem fonte → `needs_review = true` e avise o dono. Nunca chute.

Memória não é fonte. Se a memória diz que existe, **abra e confirme** antes de agir.

## 4. Cupom exclusivo é intocável

| Tipo | Regra |
|---|---|
| Exclusivo da parceria | **NUNCA trocar**, nem por cupom público que dê mais desconto. Público não paga comissão. |
| Público da firma | pode atualizar sozinho |
| Sem código | `coupon_code = NULL`. Nunca preencher com o cupom de outra firma |

Publicar cupom público da firma = entregar a venda de graça. Os já conhecidos
estão bloqueados em `PADROES_PROIBIDOS` no `check_pages.py`.

## 5. Mudou a tabela? Regere as páginas

O site lê a tabela em runtime, então corrigir o banco conserta o site na hora.
**As ~3.000 páginas em `seo/`, `compare/` e `guides/` não.** Elas são HTML em disco.

```bash
node scripts/regen-static.mjs          # só regera se a tabela mudou
node scripts/regen-static.mjs --force  # regera de qualquer jeito
```

**Nunca edite uma página gerada à mão.** A próxima geração desfaz, e o bug real
volta escondido.

## 6. Verifique antes de declarar pronto

```bash
python3 check_links.py     # a atribuição sobrevive até o destino?
python3 check_pages.py     # as páginas batem com a tabela?
```

Rodam sozinhos todo dia às 08:00 BRT (`.github/workflows/check-links.yml`).

**HTTP status não é veredito.** Provado neste repo:

- `e8markets.com/d/MARKET` responde **404** e mesmo assim renderiza a home e grava `discount=MARKET`. Link perfeito.
- Apex devolve **403** pra qualquer cliente sem browser real (Cloudflare). Não é link morto.
- FTMO some com o parâmetro e reembala o código em base64 dentro do `authPayload`. Atribuição intacta.
- Bulenox e BrightFunded jogam pra home mas gravam cookie (`amember_aff_id`, `affiliateId`).

Por isso o verificador julga por **evidência de atribuição** (URL, path, cookie,
payload base64), não por status. Quando o site barra o robô, o resultado é
`INCONCLUSIVO` — nunca falha, nunca desativa.

Antes de afirmar que algo está quebrado ou ausente: **olhe a tela renderizada**
(Playwright/print), não o `grep` nem o status.

## 7. O que o `--fix` pode e não pode

Ele só sabe **desativar** e **registrar**. Escrever valor novo é decisão humana.

| Caso | O que ele faz |
|---|---|
| Página diverge da tabela | regera da tabela (`regen-static.mjs --force`) e commita |
| Link morto / parâmetro perdido | `ativo = false`. Melhor a firma sumir do site do que receber tráfego pago que não credita |
| Destino devolveu **outro** código | `ativo = false` + `needs_review = true`. **Nunca adota o valor novo** — pode ser rotação legítima ou sequestro de afiliado, e daqui não dá pra saber |

Tudo fica em `logs/autofix.log`.

## 8. Dívida conhecida — cupom literal que ficou de propósito

Estes pontos ainda têm cupom escrito à mão. **Não são bug**: nenhum deles chega
no usuário final. Ficaram fora do escopo de propósito, para o diff da migração
não virar um refactor de arquivo inteiro.

| Onde | O que é | Por que pode ficar |
|---|---|---|
| `admin.html:3664-3667` | dados de exemplo do dashboard de tracking quando não há evento | só popula gráfico vazio no seu painel |
| `admin.html:6842` | preview do corpo de e-mail (`{cupom}` de mentira) | é o preview, não o envio |
| `admin.html:7041-7058` | `PUSH_PRESETS.apex_nofee` (en/pt/es) | ⚠️ **não é e-mail, mas é disparado pra base.** Mesmo raio de alcance de um e-mail. Migrar quando o dono autorizar |

Tudo que **é enviado** já lê da tabela via `{{CUP:slug}}`: `lib/email-render.js`
(cron, base inteira) e `admin.html` `buildInstitutionalHtml` (envio manual).
Os dois são espelho um do outro — **mexeu num, mexe no outro**.

## 9. Escopo

Não altere lógica de autenticação, migrations já aplicadas, nem schema de tabela
que não seja a que você está criando. Se achar que precisa: **pare e pergunte.**

---

Regras de produto, deploy, i18n e visual estão em [CLAUDE.md](CLAUDE.md).
