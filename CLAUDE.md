# MarketsCoupons - Contexto do Projeto

## Visao Geral

Site de cupons e descontos para **prop firms** de trading. Compara firmas, oferece cupons exclusivos, programa de fidelidade, blog, guias, quiz, calculadoras e mais. Deploy no **Vercel** como site estatico (sem build step).

- **URL producao:** https://www.marketscoupons.com
- **Dominio Vercel:** https://marketscoupons.vercel.app
- **Idioma principal:** Portugues (PT-BR)
- **Respostas ao usuario:** Sempre em portugues

---

## Arquitetura

### Arquivos principais
- `index.html` (~9.450 linhas) — Frontend publico completo (HTML + CSS + JS inline)
- `admin.html` (~3.380 linhas) — Painel administrativo (HTML + CSS + JS inline)
- `vercel.json` — Rotas e headers (rota `/admin` -> `admin.html`, no-cache em HTMLs)
- `translate.js` — Script Node.js para traduzir I18N via DeepL API
- `fix-translations.js` — Script para corrigir problemas de traducao (entidades HTML, termos tecnicos)
- `.gitignore` — Ignora `.deepl-key` e `node_modules/`
- `img/` — Imagens (subpastas `Firms/` e `Plataformas/`)

### Stack
- **100% vanilla** — HTML/CSS/JS puro, sem framework, sem bundler, sem package.json
- **Supabase** (v2 via CDN) — Auth, Database (PostgreSQL), Storage
- **Vercel** — Hosting estatico
- **DeepL API** — Traducoes automaticas (script offline)

---

## Supabase

### Configuracao
- **URL:** `https://qfwhduvutfumsaxnuofa.supabase.co`
- **Anon key:** Hardcoded nos dois HTMLs (mesmo key, protegido por RLS)
- **Auth storage keys SEPARADOS** (critico para evitar conflito de sessao):
  - `index.html` usa `storageKey: 'mc-user-auth'`
  - `admin.html` usa `storageKey: 'mc-admin-auth'`

### Tabelas
| Tabela | index.html | admin.html | Descricao |
|---|---|---|---|
| `events` | X | X | Eventos do calendario |
| `cms_guides` | X | X | Guias educacionais |
| `cms_firms` | X | X | Dados das firmas |
| `blog_posts` | | X | Posts do blog |
| `leads` | X | X | Leads capturados |
| `loyalty_members` | X | X | Membros do programa fidelidade |
| `loyalty_proofs` | X | X | Comprovantes de compra |
| `profiles` | X | | Perfis de usuario |
| `site_settings` | X | X | Configuracoes do site |
| `firm_favorite_counts` | X | | Contagem de favoritos |
| `favorites` | X | | Favoritos dos usuarios |
| `ad_spend` | | X | Gastos com anuncios |

### Storage
- **Bucket:** `loyalty-proofs` — Comprovantes de compra enviados pelos usuarios

### Queries importantes
- Usar `.maybeSingle()` em vez de `.single()` — `.single()` retorna erro 406 quando nenhuma linha e encontrada
- Verificar `data !== null && data !== undefined` em vez de `data?.length` para resultados de queries

---

## I18N (Internacionalizacao)

### Estrutura
- Objeto `const I18N = {...}` dentro do `<script>` do `index.html`
- **7 idiomas:** pt, en, es, it, fr, de, ar
- Funcao `t('chave')` retorna a string traduzida no idioma atual

### Traducao
1. Adicionar/editar strings em `pt` no objeto I18N
2. Rodar `node translate.js` (requer chave DeepL em `.deepl-key` ou `DEEPL_KEY` env var)
3. Rodar `node fix-translations.js` para corrigir termos tecnicos que nao devem ser traduzidos

### Termos que NAO devem ser traduzidos
- "Prop Firm(s)" — manter em ingles em todos os idiomas
- "Profit Split" — termo tecnico de trading
- "Drawdown" — termo tecnico
- "Lifetime" — contexto de desconto

---

## Layout de Cupons (Design Pattern)

### Estrutura correta (todas as variacoes)
```
+------------------------------------------+
| Cupom exclusivo                          |  <- label, alinhado a esquerda
| MARKET89                      [Copiar]   |  <- codigo esquerda, botao direita
+------------------------------------------+     botao centralizado verticalmente
```

### Implementacao HTML
O container e um flex com `space-between`. Dentro dele, um div `.offer-coupon-left` agrupa label + codigo em coluna a esquerda. O botao fica como filho direto do container, centralizado verticalmente.

```html
<div class="[container-class]">
  <div class="offer-coupon-left">
    <div class="[label-class]">Cupom exclusivo</div>
    <span class="[code-class]">MARKET89</span>
  </div>
  <button class="[copy-class]">Copiar</button>
</div>
```

### CSS do container
```css
display: flex !important;
align-items: center !important;      /* botao centralizado verticalmente */
justify-content: space-between !important;  /* codigo esquerda, botao direita */
```

### CSS da coluna esquerda
```css
.offer-coupon-left { display: flex; flex-direction: column; }
```

### Classes por contexto
| Contexto | Container | Label | Code | Button |
|---|---|---|---|---|
| Home (ofertas) | `.oc-coupon` | `.offer-coupon-label` | `.oc-code` | `.oc-copy` |
| Ofertas (cards) | `.offer-coupon-box` | `.offer-coupon-label` | `.offer-coupon-code` | `.offer-copy-btn` |
| Firmas (grid) | `.fr-coupon-box` | `.fr-coupon-box-label` | `.fr-coupon-box-code` | `.fr-coupon-box-copy` |
| Drawer (detalhe) | `.drw-coupon-bar` | `.drw-coupon-label` | `.drw-coupon-code` | `.drw-coupon-copy` |
| Drawer (checkout) | `.drw-coupon-bar` | `.drw-coupon-label` | `.drw-coupon-code` | `.drw-coupon-copy` |
| Generico | `.cpn-blk` | `.cpn-lbl` | `.cpn-code` | — |

### Regras importantes
- **NUNCA** usar inline styles nos templates JS para coupon rows — todo estilo deve vir das classes CSS
- O label "Cupom exclusivo" fica DENTRO de `.offer-coupon-left` (coluna esquerda), NAO como item separado do flex
- O botao "Copiar" e filho direto do container, NAO dentro de um sub-div

---

## Auth (Autenticacao)

### Fluxo do usuario (index.html)
1. Botoes "Entrar"/"Cadastrar-se" iniciam **escondidos** (`display:none`)
2. Check sincrono de `localStorage.getItem('mc-user-auth')` decide se mostra botoes ou menu do usuario
3. `checkAuthSession()` faz verificacao assincrona via `db.auth.getSession()`
4. `updateAuthUI(bool)` alterna entre estado logado/deslogado
5. `onAuthStateChange` listener com guard `if (_loggingOut) return;` para evitar loop

### Logout (doLogout)
- `db.auth.signOut()`
- Remove `mc-user-auth` do localStorage
- Limpa todas as chaves `sb-*` do localStorage e sessionStorage
- `window.location.replace()` para recarregar sem historico

### Separacao admin/usuario
- Admin usa `storageKey: 'mc-admin-auth'` — sessao completamente separada
- Logar/deslogar do admin NAO afeta a sessao do usuario no site principal

---

## Calendario Economico

- Usa widget embed do TradingView: `embed-widget/events/` (NAO `embed-widget/economic-calendar/` que retorna 404)
- A traducao e automatica pelo parametro `locale` no URL do widget
- Aba no nav chama "Calendario Economico" (nao apenas "Calendario") em todos os idiomas

---

## Tracking/Analytics
- Google Tag Manager: `GTM-WJGTVX8G`
- Google Analytics 4: `G-CZ3L00NY77`
- Facebook Pixel: `813048241061812`

---

## Deploy

### Vercel
- Deploy automatico via push no `main`
- Sem build step (arquivos estaticos diretos)
- Headers no-cache em todos os `.html` e `/` para evitar cache de CDN
- Rota `/admin` reescrita para `/admin.html`

### Processo
1. Fazer alteracoes
2. `git add [arquivos]` + `git commit`
3. `git push origin main`
4. Aguardar ~1-2 min para deploy
5. Testar com **Ctrl+F5** (hard refresh) para garantir que nao e cache

---

## CSS - Tema e Variaveis

- **Tema:** Dark mode (fundo escuro, acentos dourados)
- **Font:** Inter (variavel `--f`)
- **Cores principais:** `--gold` (dourado), `--card` (fundo card), `--gbg` (fundo cinza), `--gbr` (borda cinza)
- **Textos:** `--t1` (primario), `--t2` (secundario), `--t3` (terciario)
- **Usar `!important`** em propriedades de layout de cupons para garantir que inline styles nao sobrescrevam

---

## Padrao para Adicionar Prop Firms

### REGRA OBRIGATORIA
**NUNCA** subir uma firma com dados incompletos ou inventados. Antes de adicionar qualquer firma:
1. Acessar o site oficial da firma e coletar TODOS os dados abaixo
2. Acessar o Trustpilot da firma para nota e numero de reviews
3. Verificar promocoes ativas no site
4. Conferir que a imagem/logo ja existe em `img/Firms/`
5. Inserir na tabela `cms_firms` do Supabase E no array hardcoded `FIRMS` do `index.html`

### Onde inserir
1. **Supabase:** `INSERT INTO cms_firms` (fonte primaria — o site carrega daqui)
2. **index.html:** Array `FIRMS` (fallback caso Supabase falhe)

### Campos obrigatorios (Supabase `cms_firms`)

Referencia: Apex Trader Funding (firma mais completa)

```
id                  TEXT PK    — slug unico (ex: 'apex', 'bulenox')
name                TEXT       — nome completo (ex: 'Apex Trader Funding')
type                TEXT       — 'Futuros' ou 'Forex'
color               TEXT       — cor hex principal (ex: '#F97316')
bg                  TEXT       — cor de fundo com opacidade (ex: 'rgba(249,115,22,0.12)')
icon                TEXT       — letra para fallback (ex: 'A')
icon_url            TEXT       — caminho da logo (ex: 'img/Firms/apex.png')
rating              NUMERIC    — nota Trustpilot (ex: 4.4)
reviews             INTEGER    — total de reviews Trustpilot (ex: 17686)
discount            INTEGER    — percentual de desconto (ex: 90). Se nao tem desconto: 0
discount_type       TEXT       — tipo do desconto (ex: 'lifetime', '1 desafio', 'gratis', 'easter')
coupon              TEXT       — codigo do cupom (ex: 'MARKET'). NULL se nao tem
link                TEXT       — link de afiliado completo
tags                TEXT[]     — array de tags (ex: ARRAY['Futuros','Lifetime','Trailing DD'])
platforms           TEXT[]     — plataformas disponiveis (ex: ARRAY['Rithmic','Tradovate','NinjaTrader'])
min_days            INTEGER    — dias minimos de trading (ex: 1)
eval_days           INTEGER    — dias de avaliacao (ex: 30). NULL se ilimitado
drawdown            TEXT       — tipo de drawdown (ex: 'Trailing/EOD', 'Static', 'Fixed')
split               TEXT       — profit split (ex: '80%', '90%', '100%')
dd_pct              TEXT       — percentual de drawdown (ex: '-5% trail', '-10% static')
target              TEXT       — meta de lucro (ex: '8%', '8%/5%', '10% / 10%+5%')
scaling             TEXT       — plano de scaling (ex: 'Sim', 'Ate $4M', 'Ate $2M')
prices              JSONB      — array de planos com precos (ver formato abaixo)
perks               TEXT[]     — vantagens (ex: ARRAY['Sem limite diario','Payout 5 dias'])
proibido            TEXT[]     — regras proibidas (ex: ARRAY['Copy entre contas','Latency arbitrage'])
description         TEXT       — descricao curta da firma em PT-BR
trustpilot_url      TEXT       — URL da pagina Trustpilot
trustpilot_score    NUMERIC    — nota Trustpilot (igual ao rating)
trustpilot_reviews  INTEGER    — total reviews (igual ao reviews)
sort_order          INTEGER    — ordem de exibicao (1 = primeiro)
active              BOOLEAN    — true para exibir no site
badge               JSONB      — selo destaque: {"label":"Texto","color":"#hex","bg":"rgba(...)"}
news_trading        BOOLEAN    — permite trading em noticias?
day1_payout         BOOLEAN    — permite saque no dia 1?
short_name          TEXT       — nome curto para checkout (ex: 'Apex')
```

### Campos opcionais (checkout — somente firmas com checkout integrado)
```
checkout_types      TEXT[]     — tipos de conta no checkout (ex: ARRAY['Intraday Trail','EOD Trail'])
checkout_platforms  TEXT[]     — plataformas no checkout
checkout_plans      JSONB      — planos detalhados do checkout (ver formato abaixo)
checkout_url_template TEXT     — template de URL com variaveis ${size}, ${plat}, ${type}
checkout_includes   TEXT[]     — itens inclusos no plano
price_types         TEXT[]     — tipos de preco (ex: ARRAY['Intraday','EOD'])
```

### Formato do campo `prices` (JSONB)

Cada item representa um plano/conta disponivel:
```json
[
  {"a": "25K",       "n": "$19.90", "o": "$199"},
  {"a": "50K",       "n": "$24.90", "o": "$249"},
  {"a": "100K",      "n": "$39.90", "o": "$399"},
  {"a": "150K",      "n": "$59.90", "o": "$599"}
]
```
- `a` = tamanho da conta (account) — pode incluir tipo: "$5K Hyper Growth", "$10K 2-Step"
- `n` = preco novo (com desconto). Se gratis: "Gratis"
- `o` = preco original (sem desconto). Se nao tem desconto: "—"
- `n2`/`o2` = precos alternativos (opcional, quando firma tem 2 tipos como Intraday/EOD)

### Formato do campo `badge` (JSONB)
```json
{"label": "Maior Desconto", "color": "#F97316", "bg": "rgba(249,115,22,0.15)"}
```

### Formato hardcoded no `index.html` (array FIRMS)

Mesmo dado, mas em sintaxe JS (sem aspas nas chaves, aspas simples nos valores):
```javascript
{id:'apex',name:'Apex Trader Funding',type:'Futuros',color:'#F97316',bg:'rgba(249,115,22,0.12)',
icon:'A',icon_url:'img/Firms/apex.png',rating:4.4,reviews:17686,discount:90,dtype:'lifetime',
coupon:'MARKET',badge:{label:'Maior Desconto',color:'#F97316',bg:'rgba(249,115,22,0.15)'},
link:'https://apextraderfunding.com/member/aff/go/evertonmiranda',
tags:['Futuros','Lifetime','Trailing DD'],platforms:['Rithmic','Tradovate','NinjaTrader','WealthCharts'],
minDays:1,evalDays:30,drawdown:'Trailing/EOD',split:'80%',ddPct:'-5% trail',target:'8%',scaling:'Sim',
prices:[{a:'25K',n:'$19.90',o:'$199'},{a:'50K',n:'$24.90',o:'$249'},{a:'100K',n:'$39.90',o:'$399'},{a:'150K',n:'$59.90',o:'$599'}],
perks:['Sem limite diario','Sem regra escalamento','Payout 5 dias','Reset $99'],
proibido:['Copy entre contas','Latency arbitrage'],newsTrading:true,day1Payout:true,
desc:'Apex Trader Funding e uma das maiores prop firms de futuros dos EUA. Conhecida pelos descontos agressivos e flexibilidade nas regras.',
trustpilot:{score:4.4,reviews:17686,url:'https://www.trustpilot.com/review/apextraderfunding.com'}}
```

### Mapeamento Supabase → JS (campos com nomes diferentes)
| Supabase | JS (FIRMS array) |
|---|---|
| `discount_type` | `dtype` |
| `min_days` | `minDays` |
| `eval_days` | `evalDays` |
| `dd_pct` | `ddPct` |
| `description` | `desc` |
| `news_trading` | `newsTrading` |
| `day1_payout` | `day1Payout` |
| `trustpilot_url/score/reviews` | `trustpilot: {url, score, reviews}` |

### Checklist antes de subir uma nova firma

- [ ] Nome, ID (slug) e tipo (Futuros/Forex) definidos
- [ ] Cor principal e cor de fundo com opacidade
- [ ] Logo em `img/Firms/[id].png` (verificar nome exato do arquivo)
- [ ] Link de afiliado completo e testado
- [ ] Cupom de desconto (se existir) e percentual
- [ ] Trustpilot: nota e numero de reviews coletados do site
- [ ] Plataformas de trading coletadas do site oficial
- [ ] TODOS os tamanhos de conta com precos (original e com desconto)
- [ ] Tipo de drawdown e percentuais
- [ ] Meta de lucro (profit target) por fase
- [ ] Profit split percentual
- [ ] Dias minimos e periodo de avaliacao
- [ ] Scaling (se tem, ate quanto)
- [ ] News trading: permitido ou nao
- [ ] Day 1 payout: sim ou nao
- [ ] Perks (vantagens) — lista do site
- [ ] Proibido — regras que resultam em banimento
- [ ] Descricao curta em PT-BR
- [ ] Badge (selo destaque) com label, cor e fundo
- [ ] Inserido no Supabase `cms_firms` com `active: true`
- [ ] Inserido no array `FIRMS` do `index.html` (fallback)
- [ ] sort_order definido (proximo numero disponivel)

### Tipos de colunas no Supabase (CUIDADO)
- `tags`, `platforms`, `perks`, `proibido` = **TEXT[]** → usar `ARRAY['item1','item2']`
- `prices`, `badge`, `checkout_plans` = **JSONB** → usar `'[...]'::jsonb`
- NAO misturar: `'["item"]'::jsonb` em colunas TEXT[] causa erro

---

## Boas Praticas do Projeto

1. **Idioma das respostas:** Sempre responder em portugues (PT-BR)
2. **Sem frameworks:** Nao introduzir dependencias, bundlers ou frameworks
3. **Inline styles:** Evitar ao maximo — usar classes CSS. Especialmente em templates JS
4. **`.single()` proibido:** Usar `.maybeSingle()` para queries que podem retornar 0 resultados
5. **Testar apos deploy:** Verificar com `curl` que as mudancas estao no site publicado
6. **Cache:** Headers no-cache ja configurados no vercel.json, mas sempre orientar Ctrl+F5
7. **Auth separada:** Nunca usar o mesmo storageKey para admin e usuario
8. **Termos tecnicos:** "Prop Firm", "Profit Split", "Drawdown", "Lifetime" nao sao traduzidos
9. **Commits:** Fazer commits focados e descritivos, um por feature/fix
10. **Nao quebrar layout existente:** Verificar visualmente antes de mudar CSS de componentes compartilhados
11. **Admin noindex:** `admin.html` tem `<meta name="robots" content="noindex,nofollow">`
12. **Seguranca:** Supabase anon key e publica por design (RLS protege), mas nunca expor service_role key
13. **Consultar CLAUDE.md:** Sempre ler este arquivo antes de qualquer acao para manter contexto
14. **I18N obrigatorio antes de deploy:** NUNCA fazer deploy sem verificar que TODOS os textos novos/alterados estao traduzidos nos 7 idiomas (pt, en, es, it, fr, de, ar). Todo texto novo em HTML deve ter `data-i18n` com chave no objeto I18N. Todo texto novo em template JS deve usar `t('chave')` ou `tf('texto')`. Todo texto de dados de firma (about, labels, includes) deve estar no FIRM_T. Testar trocando o idioma antes de commitar.
