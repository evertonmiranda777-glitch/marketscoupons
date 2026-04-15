# MarketsCoupons - Contexto do Projeto

## Max - Mascote oficial (2026-04-15)

Max e uma raposa 3D Pixar-style (dourado-laranja #F0B429, olhos amber, bone preto com M dourado). Avatar do chatbot e mascote da marca. **Tem 4 outfits oficiais, todos completos com 3 tipos de asset cada (avatar 1:1 + bible 5-view + sprite 4-frame).**

### Assets em `img/bot/`
- **Varsity** (principal, integrado no chatbot): max-avatar.jpeg, max-bible.jpeg, max-sprite.jpeg — letterman jacket preto+dourado, Jordan 1 Chicago, gold headphones, Rolex
- **Hoodie** (streetwear): max-avatar-hoodie, max-bible-hoodie, max-sprite-hoodie — moletom preto com M, jogger, Jordan 1 Chicago
- **Blazer** (executive): max-avatar-blazer, max-bible-blazer, max-sprite-blazer — blazer+camisa branca, Oxford, Rolex, SEM headphones
- **Golf** (country-club): max-avatar-golf, max-bible-golf, max-sprite-golf — polo branca (sem bolso) com M bordado, chino bege sem cinto, Air Jordan 1 LOW Golf Travis Scott Neutral Olive
- **Extras:** max-athlete-drip.jpeg (corpo inteiro varsity), max-nfl-mascot.jpeg (cabecudao plush merch futuro)

### Regras criticas para gerar Max
- **NUNCA gerar sem usar template salvo em `memory/reference_max_prompts.md`**
- **PADRAO VALIDADO NAO SE TOCA:** max-avatar.jpeg, max-bible.jpeg e max-sprite.jpeg sao os refs de estilo imutaveis. Qualquer variacao nova usa eles como ref + replica enquadramento/fundo/proporcoes 1:1 — so muda outfit e face
- **OUTFIT sempre cobre da cabeca aos pes** (calca + sapato explicitos, senao o modelo preenche com "fur natural" = Max pantless)
- **Bibles (5-view):** sempre incluir "entire body rotated together, NO head/body twisting" — senao sai 3/4 com corpo frontal e cabeca torcida
- **Sprites (4-frame):** usar max-sprite.jpeg como ref-sprite-style + "CHEST-UP, DARK CHARCOAL GRADIENT" — senao sai tight headshot fundo solido
- **Travis Scott Jordan 1 Low Golf:** swoosh externo (lateral) REVERSO PRETO, swoosh interno (medial) REGULAR BRANCO/CREAM (NAO preto), LOW TOP (nao high), off-white leather + olive suede
- **Blazer:** maos NUNCA no bolso do blazer — se for ter mao no bolso, e no bolso da CALCA. Blazer executivo sem headphones/acessorios
- **Polo golf:** sem bolso no peito, M bordado direto no tecido

### Template de prompt (resumo, completo em `memory/reference_max_prompts.md`)
```
Character model sheet of the fox mascot, EXACT SAME STYLE as ref-bible-style.jpeg
(dark charcoal gradient background, chunky collectible toy figure proportions,
5 views numbered). Same face/fur/cap as ref-{outfit}.jpeg — golden-orange fur
(#F0B429), amber eyes, black cap with gold M. OUTFIT: {outfit completo cabeca aos pes}.
Each view: entire body rotated together, NO head/body twisting. Pixar 3D render.
```
Flags: `-r ref-bible-style.jpeg -r ref-{outfit}.jpeg -s 2K -a 16:9`

### Integracao chatbot (em `index.html`)
- `.bot-fab` (linha ~1943) usa max-avatar.jpeg com object-position:center 20%, animacao max-ring pulse + max-float
- `.bot-av` (linha ~1974) — **PENDENTE** atualizar src (ainda aponta pra fox-mascot-mc-cap.png deletado)
- Sprite animation no `.bot-win.typing .bot-av` — **PENDENTE** implementar `background-image: url(max-sprite.jpeg)` + `background-size: 400% 100%` + `steps(4)`

### Bot backend (`api/bot.js`)
- Gemini 2.5 Flash (2.0 deprecated pra novos users)
- Env var: GEMINI_API_KEY
- Tier pago Google Cloud ativo (R$49 acumulados de ~20 imagens geradas)

### Proximos passos do Max (Fase 2+ do plano brand)
Ver `memory/project_max_expansao_brand.md`. Resumo:
1. Fechar integracao chatbot (HTML/CSS/commit)
2. Gerar poses contextuais a partir dos bibles: Max com laptop (hero Analise), trofeu (Fidelidade), lupa (Comparador), grafico (guias), etc
3. Rollout: home hero → 404 → emails → OG images → banners features

## Event Alert 3-estrelas Telegram (2026-04-15)

Sistema que avisa no Telegram sobre eventos economicos de alto impacto (3 estrelas) em **dois momentos**: 5 min antes do release, e apos o release com o dado real + contexto de mercado.

### Arquitetura
- **Script:** `scripts/send-event-alert.js` — busca calendario via edge function `economic-calendar`, filtra `importance=3` do dia, renderiza `templates/criativo_evento.html` via Playwright, envia ao Telegram com botao inline `📅 Open Calendar` → marketscoupons.com/calendar
- **Workflow:** `.github/workflows/event-alert.yml` — cron `*/5 * * * 1-5` (a cada 5 min em dias uteis UTC), permissions `contents: write`, instala playwright chromium, roda o script, commita dedup state
- **Template:** `templates/criativo_evento.html` (1080x1350) — layout premium com alert pill, currency badge (.cny/.usd/.eur/.jpy/.gbp), event-name 82px, data-grid 3 colunas (Actual/Forecast/Previous), result-badge (.miss/.beat/.inline), market-context
- **Dedup state:** `.firecrawl/events-sent.json` — map `{ eventId: { preMsgId, released } }` (migra auto do formato antigo array)

### Fluxo de 2 mensagens
1. **Pass 1 (pre-alert):** eventos 3★ no dia com horario ET em `[+5, +11]` min do agora, nao pre-alertados ainda. Render em modo **upcoming**: alert pill fica amarelo "UPCOMING IN 5 MIN", Actual = "Pending", badge amarelo "⏱ In 5 Min", market-context = "Prepare for volatility...". Envia via `sendPhoto` e salva `message_id`.
2. **Pass 2 (release):** eventos ja pre-alertados que agora tem `actual` populado. Calcula `result` (beat/miss/inline) comparando actual vs forecast (tolerancia 1%). Gera contexto de mercado via `marketContext()` (regra-based por currency + result + tipo de evento: CPI→bonds, NFP→equities+USD, loans→Asian markets, etc). **Deleta** mensagem do pre-alert via `deleteMessage` API, envia nova com dados reais. Marca `released: true`.

### Helpers-chave no script
- `parseTimeET("09:00 AM")` → minutos-do-dia
- `nowInET()` via `Intl.DateTimeFormat` timeZone America/New_York
- `classifyResult(actual, forecast)` → 'beat' | 'miss' | 'inline'
- `marketContext(event, result)` → texto HTML com `<span>` destacando pressure/strength
- `renderEvent(e, mode)` com modes 'upcoming' e 'released' — mesmo template, overrides via page.evaluate

### Selectors do template novo (NAO confundir com versao antiga)
`.alert-pill .adot .albl` (header), `.event-name`, `.event-sub`, `.time-val`, `.ev-date`, `.cur-badge`, 3x `.data-card > .data-lbl + .data-val`, `.result-badge` (dentro do Actual card), `.mc-lbl`, `.mc-txt` (market context).

### Regras criticas
- **SO eventos US 3-star** — filtra por `currency === 'USD'` ou country match `/united states|^us$|usa/i`. Eventos CNY/EUR/JPY/GBP sao IGNORADOS. Nao existe "alerta de evento chines" nesse sistema.
- **Cutoff 18:30 ET** — eventos agendados depois das 18:30 ET sao ignorados (`CUTOFF_ET = 18*60+30`). Mercado ja fechou, nao tem pq acordar ninguem.
- **NUNCA** usar Satori pra esse template — complexo demais, usar Playwright direto
- `sendPhoto` por multipart (Blob), nao por URL
- `parse_mode` nao usado nas captions (texto simples)
- Dedup state mantem historico capado em 500 entradas
- Validacao de `actual`: ignora '-', string vazia, null
- Cron ja ativo dias uteis UTC — nao precisa trigger manual

## Firm Monitor Semanal (2026-04-15)

Sistema automatizado pra detectar mudancas nas prop firms (promocoes, precos, regras) toda segunda-feira.

### Arquitetura
- **Script:** `scripts/monitor-firms.js` — le lista hardcoded de 11 firmas, scrapeia homepage de cada uma via `firecrawl scrape --only-main-content`, salva markdown em `.firecrawl/firms/<id>-YYYY-MM-DD.md`, faz diff linha-a-linha contra ultimo snapshot commitado, dispara alerta Telegram se houver mudancas
- **Workflow:** `.github/workflows/firm-monitor.yml` — cron `0 9 * * 1` (seg 09:00 UTC), instala firecrawl-cli, autentica via `FIRECRAWL_API_KEY` secret, roda o script, commita `.firecrawl/firms/` alterado
- **Telegram:** usa secrets `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` ja existentes
- **Custo:** 11 credits/semana = ~44/mes (caber na free tier 500/mes com folga)

### Secrets necessarios no GitHub (Settings → Secrets → Actions)
- `FIRECRAWL_API_KEY` = `fc-9b25c6ef0ca448209c3ffd1e3e11e540` (ja gerado, conta criada via GitHub 2026-04-15)
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (reusar os do bot existente)

### URLs monitoradas (11 firmas, homepage publica NAO link afiliado)
apex, bulenox, ftmo, tpt (takeprofittrader), fn (fundednext), e2t (earn2trade), the5ers, fundingpips, brightfunded, e8, cti (citytradersimperium). Lista em `scripts/monitor-firms.js` FIRMS array.

### Como funciona o diff
- Compara linhas unicas do markdown novo vs ultimo snapshot commitado daquela firma
- Report: `<firm_id>: +X/-Y` (linhas adicionadas/removidas)
- Baseline (primeiro snapshot) nao dispara alerta, so salva

### Skills de scraping instaladas 2026-04-15
- **firecrawl-cli** (`npm i -g firecrawl-cli`) — bypass Cloudflare via stealth/residential proxy. 500 credits/mes free, 1 credit/scrape, 5 credits/query. Auth: `firecrawl login --api-key fc-...`
- **browser-use** — NAO usar pra prop firms, Cloudflare bloqueia headless. Usar so pra sites simples
- Skills firecrawl globais em `~/.claude/skills/`: firecrawl-scrape, firecrawl-crawl, firecrawl-map, firecrawl-search, firecrawl-interact, firecrawl-agent, firecrawl-download

### Validacao feita
Apex Trader Funding scrapeado com sucesso em 2026-04-15 → `.firecrawl/apex-home.md` (942 linhas). Extraiu: 90% desconto, 100% profit split, $1500 target 25K, Rithmic/Tradovate/NinjaTrader/WealthCharts, Trustpilot 4.4/19K, activation $89, payout 5 dias, consistency 50%.

### Proximos passos
1. User precisa adicionar `FIRECRAWL_API_KEY` como secret no repo GitHub
2. Primeira run manual via `workflow_dispatch` pra criar baseline
3. Monday 09:00 UTC comeca a rodar automatico e notificar Telegram se algo mudar

## Visao Geral

Site de cupons e descontos para **prop firms** de trading. Compara firmas, oferece cupons exclusivos, programa de fidelidade, blog, guias, quiz, calculadoras e mais. Deploy no **Vercel** como site estatico (sem build step).

- **URL producao:** https://www.marketscoupons.com
- **Dominio Vercel:** https://marketscoupons.vercel.app
- **Idioma padrao do site:** Ingles (EN) — todo conteudo novo (paginas, textos, meta tags) deve ser criado em ingles primeiro. Traducoes via I18N (data-i18n + objeto I18N)
- **Excecao:** `admin.html` (dashboard admin) — tudo em portugues, sem I18N
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
- Google Analytics 4: `G-CZ3L00NY77`
- Facebook Pixel: `813048241061812`
- Google Tag Manager: `GTM-WJGTVX8G` (DESATIVADO em 2026-04-12 — container existe mas nao e carregado pelo site)

### Arquitetura — Code-primary (NAO mexer sem ler tudo)
**Historico:** Em 2026-04-12 o GTM foi removido do `loadTracking()` porque estava sobrescrevendo `window.gtag` com alias `dataLayer.push` (async) depois dele carregar, quebrando todos os `gtag('event',...)` custom — apenas `page_view` chegava no GA4 (via gtag('config')). A limpeza de 10 tags duplicadas no GTM tambem deixou o codigo como fonte unica confiavel. Entao migramos pra code-primary: **direct gtag.js + direct fbq**, sem GTM.

**Arquivos:**
- `index.html` → `loadTracking()` carrega gtag.js direto + fbq direto. So roda apos `mc-cookies-consent === 'accepted'`.
- `app.js` → funcao `track(event, params)` e a fonte unica.

**O que `track()` faz (em ordem):**
1. **Supabase** — insere linha em `events` (first-party, sempre, independente de consent)
2. **localStorage cache** — fallback offline + compatibilidade admin
3. **Retry queue** — se Supabase falhar, enfileira em `mc_track_queue` pra re-enviar via fetch keepalive em pagehide/pageshow
4. **GTM dataLayer push** — mantido por compatibilidade futura (GTM nao carrega mas dataLayer existe)
5. **GA4 direct** — `gtag('event', event, {event_id, firm_id, value, currency, coupon, transaction_id, ...params})` — dispara pra TODOS os eventos com event_id unico
6. **FB Pixel direct** — `fbq('trackCustom', event, {...}, {eventID: eid})` APENAS pra eventos nao-standard. Eventos standard (PageView, ViewContent, InitiateCheckout, Lead, Purchase, CopyCode) sao disparados inline com items array completo.
7. **Facebook CAPI** — `_sendCAPI()` envia server-side pra bypass ad blockers, com mesmo `event_id` pra dedupe com o pixel browser

**Todos os eventos sao disparados com `event_id` unico (UUID).** O mesmo `event_id` vai pro gtag, fbq browser, e FB CAPI — permite dedupe perfeito.

**Enhanced Conversions (GA4) + Advanced Matching (FB):** `setTrackingUser(user)` em `app.js:208-235` hash SHA-256 de email/phone/name e envia via `gtag('set','user_data',...)` + `fbq('init',...,{em,ph,fn,external_id})`. Chamado em `loadUserSession()` quando o usuario loga.

**User properties GA4:** `gtag('set','user_properties',{user_id,plan,loyalty_tier,country})` + `gtag('config',GA_ID,{user_id})`. Permite segmentacao no GA4.

**Geo anon properties:** `setTrackingGeo(geo)` em `fetchGeo()` adiciona country/region/timezone pra users nao logados.

### O que NUNCA fazer
- Nunca re-habilitar GTM no `loadTracking()` sem refazer a logica do gtag — GTM sobrescreve `window.gtag` e quebra tudo.
- Nunca chamar `gtag()` ou `fbq()` DIRETAMENTE sem tambem chamar `track()` com os mesmos params — perde a fonte Supabase e o event_id consistente.
- Nunca remover o event_id dos params — quebra dedupe CAPI e sobe CPL no FB.

### Debug — Spy de tracking (`?spy=1`)
URL: `https://www.marketscoupons.com/?spy=1` — ativa painel flutuante no topo direito que intercepta fetch/XHR/sendBeacon/Image.src e conta hits GA4 + FB Pixel por acao (page/firm/copy/checkout). **CUIDADO:** o spy NAO consegue ler bodies do tipo Blob (GA4 batch events usam Blob) — se aparecer "null NO_ID" nos hits GA4, e um bulk beacon e os eventos reais estao chegando normalmente. Validar com GA4 Realtime.

### Validacao GA4
- Realtime: https://analytics.google.com → Property G-CZ3L00NY77 → Relatorios → Tempo real
- Debug View: Administrador → DebugView (mostra cada evento com params)
- Eventos report: Ver o engajamento dos usuarios → Eventos (historico 28 dias)

### Funil de Firmas (4 etapas)
| Etapa | Quando | dataLayer event | FB Pixel | GA4 gtag |
|---|---|---|---|---|
| 1. PageView | Abre overlay da firma | `firm_detail_open` | `ViewContent` | `view_item` |
| 2. CopyCoupon | Copia cupom | `coupon_copy` | `CopyCode` (custom) | `copy_coupon` (custom) |
| 3. InitiateCheckout | Clica no botao de checkout | `checkout_click` | `InitiateCheckout` | `begin_checkout` |
| 4. Lead | Redirect (window.open) | (mesmo que 3) | `Lead` | `generate_lead` |

### Funil Pro Subscription (2 etapas)
| Etapa | Quando | FB Pixel | GA4 gtag |
|---|---|---|---|
| InitiateCheckout | Clica em assinar Pro | `InitiateCheckout` | `begin_checkout` |
| Purchase | Sucesso do Stripe | `Purchase` | `purchase` |

### Funcoes de checkout que disparam tracking (firmas)
- `fdGo(id)` — Desktop fullscreen overlay
- `fdGoCheckout(fId)` — Desktop checkout button
- `drwGoCheckout(firmId)` — Drawer mobile checkout
- `achGoCheckout(fId,size)` — Accordion checkout
- Inline onclick no drawer direto (firmas sem checkout integrado)

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

### Padrao de dados curtos (OBRIGATORIO)

Textos de dados das firmas devem ser **curtos e padronizados** para caber nos cards de 3 colunas (email e site):

| Campo | Maximo | Bom | Ruim |
|---|---|---|---|
| `dd_pct` | ~12 chars | `-5% / -10%` | `-5% diário / -10% total` |
| `target` | ~10 chars | `8% / 5%` | `TCP100: $6.000` |
| `split` | ~8 chars | `90%` | `80-100% progressivo` |
| `scaling` | ~10 chars | `Ate $4M` | `Ate $4M com progressao` |

- Ao adicionar/editar uma firma, **padronizar TODAS** as firmas juntas — nunca so a que foi pedida
- Formato drawdown: `-X% / -Y%` (daily / total)
- Formato target: `X% / Y%` (fase 1 / fase 2)

### Tipos de colunas no Supabase (CUIDADO)
- `tags`, `platforms`, `perks`, `proibido` = **TEXT[]** → usar `ARRAY['item1','item2']`
- `prices`, `badge`, `checkout_plans` = **JSONB** → usar `'[...]'::jsonb`
- NAO misturar: `'["item"]'::jsonb` em colunas TEXT[] causa erro

---

## Padrao do fd-overlay (Design Aprovado)

### Botoes (Tipo de Conta, Plataforma, Tamanho da Conta)
- Usar CSS grid: `grid-template-columns: repeat(var(--cols,2), 1fr)`
- `--cols` definido inline em cada `.fd-pills` / `.fd-sizes` conforme qtd de botoes por linha
- Altura fixa: `height: 38px`
- `display: inline-flex; align-items: center; justify-content: center`
- `padding: 0 12px; border-radius: 10px; font-size: 12px; font-weight: 600`
- `white-space: nowrap` — texto nunca quebra
- Todos os botoes do mesmo grupo tem **mesma largura** (1fr no grid)
- Se quebra em 2 linhas, segunda linha mantem mesmo tamanho dos de cima
- Classes: `.fd-pill` (tipo/plataforma), `.fd-sz` (tamanho)
- Selected state via classe `.sel` — NUNCA inline styles para selected

### Stats Grid (lado esquerdo, abaixo do About)
- Grid **4 colunas x 3 linhas = 12 cards**
- `grid-template-columns: 1fr 1fr 1fr 1fr`
- Conteudo **centralizado** (`text-align: center`)
- 12 infos padrao: Profit Split, Meta, Drawdown, Dias Minimos, Scaling, Prazo, News Trading, Day 1 Payout, Alavancagem, Consistencia + 2 especificos da firma
- Padding: `12px 14px`, radius: `10px`, bg: `rgba(255,255,255,.10)`, border: `rgba(255,255,255,.14)`

### Highlights (3 cards sobre a firma)
- `flex: 1` — todos tem mesma largura
- Conteudo **centralizado** (`align-items: center; text-align: center`)
- Dentro do `.fd-about` box

### Regras criticas
- **NUNCA mexer no Trustpilot** — manter CSS original do site
- **NUNCA mexer nas cores** — cada firma mantem sua cor accent
- **Mobile responsivo obrigatorio** — tudo que muda no desktop precisa funcionar no mobile

---

## Padrao de Contraste (Minimos Obrigatorios)

Valores minimos de opacidade para rgba(255,255,255,...) em fundo escuro. NUNCA usar valores abaixo destes:

| Elemento | Propriedade | Minimo | Exemplo |
|---|---|---|---|
| Card background | `background` | `.10` | `rgba(255,255,255,.10)` |
| Card border | `border-color` | `.14` | `rgba(255,255,255,.14)` |
| Hover background | `background` | `.10` | `rgba(255,255,255,.10)` |
| Linhas decorativas | `border/background` | `.12` | `rgba(255,255,255,.12)` |
| Texto primario | `color` | `var(--t1)` | Branco/quase branco |
| Texto secundario | `color` | `var(--t2)` | Nunca abaixo de t2 para conteudo legivel |
| Labels/filtros | `color` | `var(--t1)` | Com `font-weight:600` |
| Valores numericos | `color` + `font-weight` | `var(--t1)` + `700` | Dados importantes sempre bold |

### Regras
- **NUNCA** usar `.04`, `.05`, `.06` em backgrounds de cards — minimo `.10`
- **NUNCA** usar `.08` em borders — minimo `.12` (decorativo) ou `.14` (cards)
- **NUNCA** usar `var(--t3)` em texto que o usuario precisa ler — minimo `var(--t2)`
- Filtros e botoes de acao: `var(--t1)` com `font-weight:600`
- `backdrop-filter` proibido em cards/conteudo — apenas em nav, overlay e footer

---

## Analise Diaria (Daily Analysis) — Padrao de Qualidade

### Edge Function `daily-analysis` (v25+)
- **Cron:** `0 9 * * 1-5` (6h Brasilia, seg-sex)
- **Calendario:** Busca eventos via nossa edge function `economic-calendar` (Trading Economics), NAO Finnhub
- **Modelo:** Claude Sonnet (`claude-sonnet-4-20250514`), `max_tokens: 6000`
- **Ativos:** ES (S&P 500), NQ (Nasdaq 100), GC (Ouro), CL (Petroleo WTI)
- **Idiomas da analise:** 3 (pt, en, es) — outros idiomas usam fallback pt→en no frontend
- **Custo estimado:** ~$0.45/dia = ~$9/mes (4 ativos × 3 idiomas × 10 campos)

### Padrao de qualidade da analise
1. **Tom:** Profissional mas acessivel — iniciante entende, profissional respeita. Se usar termo tecnico, explicar entre parenteses na primeira vez
2. **Assertividade:** Opiniao clara baseada nos dados. NUNCA usar "talvez", "possivelmente", "pode ser que". Cenarios com probabilidade (ex: "65% chance")
3. **Eventos do calendario:** OBRIGATORIO referenciar eventos de alto impacto do dia com horario e impacto esperado. NUNCA dizer "sem eventos" se existem eventos na lista
4. **Cenarios completos:** Gatilho especifico, alvo 1, alvo 2, stop loss, probabilidade estimada
5. **Feedback loop:** Historico de acertos dos ultimos 5 dias calibra a confianca automaticamente
6. **Suportes/resistencias:** Sempre justificados (swing high/low, pivot, EMA, Bollinger)
7. **Mecanismo de transmissao:** Nao apenas dizer "NFP afeta o mercado", mas explicar COMO (ex: "NFP forte → expectativa de juros altos → yields sobem → NQ pressao vendedora")
8. **Multilingual:** Cada campo em 3 idiomas {pt, en, es} — outros idiomas usam fallback no frontend (daT: lang→pt→en)
9. **Economia de tokens:** max 2-3 frases por campo, historico de 15 dias, max_tokens 6000, prompt compacto

### Campos da analise
| Campo | Descricao | Frases |
|---|---|---|
| `context` | Narrativa macro, correlacoes, eventos | 4-5 |
| `volume_analysis` | Range/momentum, participacao institucional | 2-3 |
| `scenario_bull` | Gatilho, alvos, stop, probabilidade | 3-4 |
| `scenario_bear` | Idem | 3-4 |
| `news_impact` | Noticias + eventos → impacto no ativo | 2-3 |
| `events` | Eventos do calendario com horarios | 2-4 |
| `attention_zone` | Zona critica com confluencia | 1-2 |
| `vix_context` | Volatilidade e correlacao | 1-2 |
| `indicators_summary` | Interpretacao (nao repetir numeros) | 2-3 |
| `market_phase` | Fase Wyckoff com evidencia | 1 |

### O que NAO fazer
- NUNCA gerar analise sem consultar calendario economico primeiro
- NUNCA usar Finnhub para calendario (premium $3500/mes) — usar economic-calendar edge function
- NUNCA dizer "sem eventos relevantes" sem confirmar no calendario
- NUNCA ser generico — cada afirmacao ancorada em dados concretos
- NUNCA ultrapassar max_tokens desnecessariamente — concisao e qualidade

---

## Criativos do Telegram (bot @marketscouponsbot)

### Arquitetura
- 4 criativos 1080x1350 px: `firms`, `calendar`, `gamma`, `analysis`
- Fonte: HTMLs perfeitos em `templates/criativo_<nome>.html` (com base64 images, SVGs, grids complexos)
- Render: `scripts/render-firms-png.js` usa **playwright** (devDep) -> screenshot estatico -> `img/<nome>-creative.png`
- Entrega: Vercel serve o PNG estatico; edge function `supabase/functions/telegram-bot/index.ts` faz fetch dos bytes e envia via `sendPhoto` multipart upload
- Comando de render: `node scripts/render-firms-png.js [firms|calendar|gamma|analysis|all]`

### Pra atualizar um criativo
1. Edita `templates/criativo_<nome>.html`
2. `node scripts/render-firms-png.js <nome>`
3. `git add templates/ img/ && git commit -m "..." && git push`
4. Aguarda ~1min deploy Vercel
5. Se mexeu no `telegram-bot/index.ts`, redeploy: `SUPABASE_ACCESS_TOKEN=<token 1h> npx supabase functions deploy telegram-bot --project-ref qfwhduvutfumsaxnuofa --no-verify-jwt` (token em supabase.com/dashboard/account/tokens)
6. Testa: `curl "https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/telegram-bot?action=coupons" -H "Authorization: Bearer <anon-key>"`

### Regras criticas
- **NUNCA usar Satori/@vercel/og** pra reproduzir HTML complexo — nao renderiza glyphs (estrela vira quadrado), flex quebra, fontes faltam. Ja perdi horas nessa saga em 2026-04-14 — ir direto pro playwright
- **NUNCA usar subpasta nova em img/** (ex: `img/og/`) — vercel.json legacy `routes` nao serve automaticamente. Usar root `/img/*.png`
- **NUNCA enviar photo por URL direta** pro Telegram — timeout 5s estoura se CDN nao cacheou. Edge function deve baixar bytes e mandar via FormData multipart
- **Caption max 1024 chars** — o helper `sendPhoto()` trunca pra 1020 + reticencias
- **Cache-bust sempre** — `?t=${Date.now()}` no URL do photo pra Telegram nao servir versao velha
- Anon key Supabase correta: iat `1774377946`. A antiga `1759267651` retorna 401

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
15. **Revisar CADA LINHA de texto visivel antes do deploy:** Antes de qualquer commit que adicione ou altere conteudo visivel, revisar CADA LINHA de texto no diff. Se qualquer texto estiver hardcoded (sem data-i18n, sem t(), sem tf()), corrigir ANTES do commit. Isso inclui mini-UIs, labels dentro de componentes visuais, textos decorativos, tooltips — TUDO que o usuario ve. Nao existe texto "pequeno demais para traduzir".
16. **NUNCA sair do padrao visual estabelecido:** Ao criar qualquer nova pagina, overlay ou componente, DEVE seguir EXATAMENTE o padrao visual ja aprovado. Exemplos: overlay de firma (fd-overlay) tem imagem de background no lado esquerdo, branding premium, checkout no lado direito com steps, preco, cupom, CTA e includes. Qualquer novo overlay (plataformas, etc.) deve replicar esse padrao 1:1, incluindo imagem de fundo, estrutura dos dados e nivel de detalhe. Pesquisar dados reais com o mesmo rigor das firmas (site oficial, precos, features). Nunca simplificar ou "adaptar" — replicar o padrao.
17. **NUNCA remover conteudo existente sem ser pedido:** Ao ajustar layout, adicionar features ou refatorar, NUNCA remover textos, secoes, descricoes ou funcionalidades que ja existem. Apenas adicionar ou ajustar o que foi pedido. Se precisar mover algo, manter o original no lugar e adicionar a copia — nunca substituir sem autorizacao explicita.
18. **Consistencia visual obrigatoria:** Botoes, textos, espacamentos, fontes, cores, tamanhos — TUDO deve seguir o mesmo padrao dentro de um design. Se um botao tem border-radius 8px, TODOS os botoes daquele contexto tem 8px. Se um label usa font-size 10px uppercase, TODOS os labels equivalentes usam. Se um card tem padding 16px, TODOS os cards irmaos tem. Nunca criar um elemento "quase igual" — ou replica exato ou nao faz. Isso vale para: emails, overlays, cards, tabelas, stats, CTAs, badges, tooltips. O usuario tem olho clinico para inconsistencia — qualquer diferenca sera notada e cobrada.
19. **COMPLIANCE LEGAL — REGRA CRITICA:** NUNCA escrever copy que prometa, sugira ou implique consultoria financeira, sinais de trading, recomendacoes de compra/venda, ou qualquer servico regulado. Isso inclui:
    - NUNCA usar: "sinais de entrada", "stop loss", "take profit", "sinais de trading", "trade signals", "recomendacoes"
    - NUNCA prometer resultados financeiros ou retornos
    - NUNCA mencionar ativos especificos como promessa de cobertura (ex: "sinais para ES, NQ, GC e CL")
    - NUNCA usar as palavras "trader(s)", "operacoes ao vivo", "operacoes reais" em contexto de Live Room
    - Live Room deve ser descrito como "conteudo exclusivo VIP", "insights de mercado", "niveis-chave" — NUNCA como servico de sinais
    - Termos seguros: "insights", "niveis-chave", "contexto de mercado", "conteudo exclusivo", "espaco para membros"
    - Termos PROIBIDOS: "sinais", "entrada", "stop loss", "take profit", "recomendacao", "trader(s) profissionais", "operacoes"
    - **Consequencia:** Copy errada que vai pro ar pode gerar problema legal REAL. Cada texto visivel deve ser revisado com lente de compliance ANTES do commit.
