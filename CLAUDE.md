# MarketsCoupons, Contexto do Projeto

## 🔥🔥🔥 DOUTRINA IMPARÁVEL, vigente 03/06/2026 🔥🔥🔥

**13 mandamentos absolutos do Everton:** nunca dizer "não", sempre buscar solução, usar qualquer skill/agent/ferramenta do mundo, construir memória permanente, reconhecer erros, melhorar infinitamente, acatar ordem com maestria. Detalhe completo: [memory/feedback_doutrina_imparavel.md](memory/feedback_doutrina_imparavel.md). Documento vivo, Everton adiciona ao longo do tempo.

**Estado mental obrigatório:** quota estourou? → outra ferramenta. SPA não revela? → outra abordagem. Sempre próximo passo. Zero desistência antes de exaurir opções gratuitas e zero-risco.

---

## 🚨🚨🚨 LEI INVIOLÁVEL #0, NUNCA CHUTAR DADOS PÚBLICOS 🚨🚨🚨

**Antes de QUALQUER UPDATE em preço/%/prazo/regra/spec de firma, abrir site oficial via Firecrawl/Playwright e VER o dado. Sem chute, sem "estimativa proporcional", sem "linear progression".**

Dado não visto = `null` ou `"TBD validar"` no DB. Detalhe: [memory/feedback_nunca_chutar_dados_publicos.md](memory/feedback_nunca_chutar_dados_publicos.md).

**Custo de chutar:** publicidade enganosa CDC art. 37 + Procon até R$12.6M + cancelamento afiliação + processo civil + perda reputação. Incidente 2026-06-03: chutei 200K Alpha Futures $239/$319 por "proporção linear", Everton flagrou. Memória durável.

**Vale pra TODA superfície:** site público, criativos, LP /coupons, emails (lib/email-render.js), ads (data/ad-copies.json), Telegram bot, schema markup, OG/Twitter cards.

---

## 🚨 LER PRIMEIRO (antes de qualquer ação)

1. `memory/reference_doutrina_continuidade.md`, você é IA orientada a continuidade. Sistema com estado, não chatbot. Reconstruir contexto antes de cada resposta.
2. `memory/reference_o_que_e_contexto.md`, operacionalização. 4 camadas, ritual início/fim, sinais de perda.
3. `memory/feedback_modo_trabalho_empresario.md`, 7 regras: ação concreta, reconhecer antes de explicar, modo autônomo, caminhos exatos, memória ativa, PT-BR, codewords stop/preguiça.
4. `memory/feedback_salvar_a_cada_sessao.md`, toda sessão termina com memória + MEMORY.md + CLAUDE.md atualizados, sem precisar pedir.
5. `memory/MEMORY.md`, índice de memórias por tema.
6. `memory/project_backlog_proximos_passos.md`, onde paramos / prioridades.

**Codewords:** "stop" / "preguiça" → para tudo, confessa o que cortou, refaz.

**REGRA DURA pós-deploy (2026-05-10):** SQL retornar OK ≠ feature funcionando. SEMPRE abrir URL renderizada via `curl -s 'site.com/path?v=$(date +%s)'` ou Playwright (`mcp__playwright__browser_navigate` + `browser_evaluate`) ANTES de declarar pronto. Bug `cover_url` faltando no SELECT seria pego em 1 curl, não foi.

**REGRA Telegram (2026-05-11):** TG NÃO é canal de status de progresso. Use SOMENTE quando user explicitamente fora do PC ou em momentos críticos (alerta, falha, conclusão de job longo agendado). Default: status no chat do Claude Code.

**REGRA não inflar features (2026-05-11):** Antes de chamar view/função de "ROAS real" / "venda-a-venda" / similar, LER definição SQL primeiro. `v_attribution_campaign_30d` é RATEIO PROPORCIONAL (clicks da campaign ÷ total clicks × sales do dia), NÃO matching individual. Matcher venda-a-venda REAL = `attribution-matcher` cron 5h30 BRT em `affiliate_conversions` (que só popula desde fix de constraint 2026-05-11).

**REGRA Top 3 email (2026-06-09):** template `top3` em INST_TEMPLATES é SAGRADO. Sempre as 3 firmas top do momento (Apex + Bulenox + TradeDay no padrão atual). NÃO inflar com variants, NÃO substituir firmas sem ordem direta. Pra mostrar opções de Apex (Pack 5x, Sem Taxa), usar `buildWhitePromoHtml` que tem seção "MAIS OPÇÕES" condicional (renderiza só se `prices[].n5` ou `prices[].na` existirem). Template existe em admin.html (envio manual) E lib/email-render.js (cron-bulk), atualizar nos dois.

**REGRA bug visual (2026-06-09):** print mostrando dropdown branco/UI quebrada/cor errada = ajustar CSS, NÃO deletar a feature. Detalhes em `memory/feedback_ajustar_css_nao_deletar.md`. Quase apaguei aba Reviews por confundir.

**REGRA case-sensitivity (2026-06-09):** arquivos em `img/Firms/` precisam ter o EXATO `firm.id` lowercase (`tradeday.png`, `e8.png`, `goat.png`). Templates usam `${f.id}.png`, Linux Vercel case-sensitive quebra com `Tradeday.png`/`E8 Markets.png`. `git config core.ignorecase=false` setado no projeto previne regressão.

**REGRA cooldown email (2026-06-09):** dedup de templates institucionais NÃO é mais pra sempre. Usa `email_logs.template_slug` + janela configurável (input "Cooldown" no admin, default 7d). Tag Brevo `received-{slug}` ainda grava mas não bloqueia. Pra reenviar: ajustar input no admin.

**REGRA EN-default LEI (2026-06-09):** site é americano. TODO conteúdo público novo (caption Telegram, push, email default, criativos, OG cards, social copy) sai em INGLÊS. Admin é PT (privado). Detalhes em `memory/feedback_site_en_default.md`. Custou retrabalho no telegram-creative v1-v8 que tinha caption em PT.

**REGRA LP nova = parte do site (2026-06-10):** toda landing nova nasce com header logo SVG hexágono+M dourado padrão + footer 4 colunas (Prop Firms/Ferramentas/Links/Legal) + i18n 8 idiomas (PT/EN/ES/IT/FR/DE/AR/ID) via `<slug>-i18n.js` + lang switcher + hreflang completo + RTL automático pra árabe + rotas Vercel `/(en|es|fr|de|it|ar|id)/<slug>`. NÃO criar LP self-contained "que parece de outro site". Detalhe: `memory/feedback_lp_padrao_site_obrigatorio.md`. Custou refatorar `/volumefilter` em 2 sessões.

**REGRA em-dash proibido (2026-06-10):** NUNCA usar " — " (em-dash com espaços) em conteúdo público. Substituir por ", " ou "." conforme contexto. En-dash "–" em ranges ($25K–$150K) OK. Script massa: `scripts/remove-em-dash.mjs`. Detalhe: `memory/feedback_em_dash_proibido.md`.

**REGRA API consolidação (2026-06-10):** Vercel Hobby = 12 functions. Antes de criar `.js` novo em `/api`, contar `find api -name "*.js" -not -name "_*"`. Se ≥12, consolidar nova action em arquivo de feature existente com `?action=X`. Ex: `/api/leads/volumefilter` tem lead + reviews lista + reviews post no mesmo arquivo. Detalhe: `memory/feedback_consolidar_api_em_acoes.md`.

## Visão geral

Site de cupons de **prop firms** de trading. Compara firmas, oferece cupons, fidelidade, blog, guias, calculadoras, análise diária. Deploy estático no Vercel.

- **Prod:** https://www.marketscoupons.com
- **Idioma do site:** EN (todo conteúdo novo em inglês primeiro, traduzido via I18N)
- **Admin:** PT-BR, sem I18N
- **Respostas ao user:** PT-BR sempre

## Arquitetura

| Arquivo | O que é |
|---|---|
| `index.html` (~9.5k linhas) | Frontend público (HTML+CSS+JS inline) |
| `admin.html` (~3.4k linhas) | Painel admin |
| `app.js` | Lógica frontend, FIRMS array, helpers, tracking |
| `vercel.json` | Rotas, headers no-cache, CSP |
| `api/*.js` | 12 Serverless Functions (limite Hobby) |
| `<lang>/guides/*.html` | 5 guias edu × 7 idiomas |
| `docs/guias-piloto/*.md` | Guias por firma (11 firmas) |

**Stack:** vanilla HTML/CSS/JS, Supabase v2 CDN, Vercel hosting, DeepL API (traduções offline). Sem framework, sem bundler.

## Supabase

- URL: `https://qfwhduvutfumsaxnuofa.supabase.co`
- Anon key hardcoded (RLS protege)
- **Auth storageKey separados:** `mc-user-auth` (index) vs `mc-admin-auth` (admin)
- Tabelas críticas: `cms_firms`, `cms_guides`, `blog_posts`, `email_subscribers`, `email_logs`, `loyalty_members`, `loyalty_proofs`, `affiliate_daily_stats`, `events`, `i18n`, `firm_translations`, `cms_texts`, `site_settings`
- **Sempre usar `.maybeSingle()`** (não `.single()`, retorna 406 quando vazio)

## Regras canônicas

### Compliance legal (CRÍTICO)
NUNCA usar: "sinais", "entrada", "stop loss", "take profit", "lucro garantido", "trader profissional", "operação ao vivo", "copy trade", "we trade for you". Em copy de Meta Ads também banido: "fique rico", "renda garantida", "you'll profit". Live Room = "conteúdo exclusivo VIP", nunca "sinais".

### Preços de firma, fonte única
`cms_firms.prices` no Supabase é única fonte de verdade. `FIRM_ABOUT`/`CHECKOUT_FIRMS` em app.js = fallback puro. Helper canônico: `getPlanPrice(firmId, typeName, sizeStr)` em app.js:456. Nunca re-introduzir sync destrutivo. Cache localStorage `mc_firms_cache_v3`.

### Welcome email, real-time (RESOLVIDO 2026-04-28)
Trigger SQL `welcome_on_confirm` em `auth.users` dispara `pg_net.http_post` pra `/api/welcome-email` quando email_confirmed_at sai de NULL. Header `X-Webhook-Secret` (env Vercel `WELCOME_HOOK_SECRET`). Idempotente via tag `received-welcome` em email_subscribers. Latência ~2s. Cron horário backup em `.github/workflows/welcome-catchup.yml`.

### Email cron auto-dispatch
GitHub Actions cron diário 14h UTC dispara `/api/cron-bulk-send` (campaign=site-invite, batch=400). Auth `Bearer ${CRON_SECRET}`. Filtra por tag `received-{campaign}`. Substitui auto-dispatcher do admin (browser-based).

### INST_TEMPLATES, dual source
Templates institucionais (welcome, site-invite, loyalty, indicators, blog-guides, ultimas-horas, giveaway-*) vivem em **2 lugares**: `admin.html` (cliente, envio manual) E `lib/email-render.js` (servidor, cron-bulk-send). Adicionar/editar template = update nos dois. Senão overflow da fila não disparar via cron. Subject/preheader em 7 langs; se body builder é hardcoded num idioma, travar `subject` em todos os langs apontando pro mesmo texto pra evitar mismatch (ex: subject EN + corpo PT). Site é EN-default, caixas traduzem auto se preciso, então padrão é EN.

### profiles RLS bloqueia anon
`public.profiles` RLS só expõe a própria row. Admin client-side não vê todos signups. Pra audience de email/dashboards, usar `/api/brevo-stats?type=signups_all` (service_role + isAdminJwt guard). `loadAllLeadsOnce` em admin.html: profiles primeiro → email_subscribers (merge tags) → loyalty. Inverter ofusca signups como 'subscriber'.

### Blog, 2 readers + guias = 3 sistemas (canônico 2026-05-27)
Mudança de UX de leitura de artigo (botão, CTA, share, voltar, layout do corpo) tem que ir nos TRÊS: (1) `blog.html` `renderPost()`, standalone `/blog/<slug>`; (2) `app.js` `openBlogArticle()`, SPA in-page `/blog?a=<slug>`, fecha com `closeBlogArticle()` que DEVE scrollar pro topo; (3) guias estáticos `/guides/*.html` + `<lang>/guides/*.html` (HTML puro). Detalhe: `memory/feedback_dois_readers_blog.md`. ⚠️ Guias traduzidos (en/es/fr/de/it/ar) estão TRUNCADOS (sem `</article>`/`</body>`), bug de tradução Gemini incompleta, pendente.

### SVG didático blog, audit v4 obrigatório (canônico 2026-05-27)
`scripts/audit-svgs-v4.mjs` (Playwright) detecta: line-crosses-text, line-crosses-card, text-overlap, text-near-card-bottom, **text-crosses-card-edge** (texto encavalando borda de card de outro grupo). Usa `sameLogicalGroup()` pra ignorar `<g>` aninhados (tabelas = falso positivo). NUNCA declarar SVG pronto sem rodar e ver `Files with bugs: 0`. Padrão v7 completo: `memory/reference_blog_svg_padrao.md` + `reference_blog_v7_doutrina.md`.

### Blog vs Guias, não duplicar
Antes de criar/manter post, checar se tema já está em `<lang>/guides/`. 5 guias canônicos:
- `o-que-e-uma-prop-firm` · `como-passar-no-desafio` · `gerenciamento-drawdown` · `position-sizing` · `como-sacar-lucros`

Padrão long-form (ref: Wyckoff PT 28k chars): body 15k+ chars, hero `<img>` embedded ou `cover_url`, read_time honesto (~1min/1.5k chars). Stubs de 3k com read_time inflado = rejeitados.

### Tradução guias (Gemini 2.5 Flash)
`scripts/translate-guides-edu.mjs` usa `maxOutputTokens: 65536` + safety `cleaned.length < src.length * 0.85`. NUNCA baixar, HTMLs ~45kb truncam silenciosamente com 32k tokens. Não commitar enquanto job background roda.

### Finance + extensão
`supabase/functions/finance-sync/index.ts` DEVE filtrar `r.granularity !== 'month'` antes do upsert em `affiliate_daily_stats`. CSV de Apex/Bulenox tem linha "monthly summary" que colide com daily do dia 01 → infla dashboard 2x.

### Firma, accent semântico em ilustração
Imagens de guia de firma usam **cor accent da firma**, NUNCA dourado default:
| Firma | Accent |
|---|---|
| Apex | #F97316 (orange) |
| TradeDay | #22D3EE (cyan) |
| FTMO | #1976D2 (blue) |

**Workflow firma:** reusar `img/<firm>-bg.webp` como hero, logos reais em `img/Plataformas/`, SVG editorial pra diagramas, NUNCA logo fake via IA.

### Guias edu, accent por guia
| Guia | Accent | Semântica |
|---|---|---|
| G1 Prop Firm | #F97316 (orange/gold) | premium |
| G2 Como Passar | #10B981 (emerald) | ganho |
| G3 Drawdown | #EF4444 (red) | risco |
| G4 Position Sizing | #3B82F6 (blue) | precisão |
| G5 Sacar Lucros | #F0B429+#10B981 | conquista |

### Auth (admin/user separados)
Logout user usa `mc-user-auth`, logout admin usa `mc-admin-auth`. Logar/deslogar do admin NÃO afeta sessão user. Listener `onAuthStateChange` com guard `if (_loggingOut) return`. **`isAuthed()` helper** (app.js) = `currentUser && currentProfile && (email_verified===true || is_admin===true)`. Admin tem bypass pra não travar operação interna. Gates de conversão usam `isAuthed()`, não `currentUser` puro.

### Sistema cores por contexto de email (canônico 2026-04-29)
🟠 `#ff8c00` ofertas · 🟢 verde blog · 🔴 vermelho urgência · 🔵 `#1976D2` (FTMO) verificação. **Logo "Coupons" SEMPRE laranja `#ff8c00`** independente do contexto, regra fixa de marca.

### Skeleton canônico de email institucional
Header `#fff` (logo+tagline) → linha separadora cor temática → hero `#111111` dark (pill+h1 34-38px branco+subtitle) → linha separadora → body `#fff` (saudação Olá+nome → parágrafo → CTA gradient cor temática → fallback → assinatura Lara avatar circular gradient → footer disclaimer). Ref: `api/welcome-email.js` `buildHtml()`+`buildConfirmHtml()`.

### Modal sobre o site = skeleton auth-overlay
bg `var(--card)` `#10151F`, border `rgba(107,182,201,.22)`, botão herda `.auth-btn` shimmer gold, texto `var(--t1)`/`t2`/`t3`. Backdrop `rgba(8,12,18,.85) + blur(8px)`. Ref `.cem-*` em `index.html`.

### Ícones = Feather pattern, ZERO emoji em UI
Padrão: `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`. Não usar emoji em modal/card/UI, sempre SVG inline.

### Previews visuais antes de prod
Mudança visual significativa = preview HTML standalone em `data/preview/<feature>.html` com mock + estados → user abre local → aprova → aplica. Previews ficam versionados como referência canônica futura. Ex: `data/preview/modal-confirm-email.html` + `email-confirmation.html`.

### Validate-email, fallback permissivo
`validateEmailMx()` em app.js retorna `{valid:true}` em erro de rede/500. Melhor aceitar email duvidoso ocasional do que bloquear todos por infra própria. Conectado em `doAuthSignup` antes do `db.auth.signUp`, bloqueia disposable/no_mx/invalid_format com mensagens i18n por reason (`ve_*`).

### URLs absolutas obrigatórias (canônico 2026-05-10)
TODO asset path deve ter `/` prefix. **NUNCA** `'img/X'`, `'fonts/X'`, `src="app.js"`. Sempre `'/img/X'`, `'/fonts/X'`, `src="/app.js"`. Em `/es/blog` ou qualquer `/<lang>/path`, browser resolve relativo como `/es/img/X` = 404 → site quebra. Aplica em: index.html, app.js, i18n.js, js/*.js, cms_firms.icon_url/bg_image, blog_posts.cover_url.

### Compare pages multi-lang (canônico 2026-05-10)
- 132 PT em `/compare/X-vs-Y.html` (root URL `/X-vs-Y`)
- 6 langs em `/<lang>/compare/X-vs-Y.html` (URL `/<lang>/X-vs-Y`)
- vercel.json: route `/(en|es|fr|de|it|ar)/(firm)-vs-(firm)` → `/<lang>/compare/X-vs-Y.html`
- Total 924 paginas. Sitemap inclui hreflang completo.
- Re-traduzir: `node scripts/translate-compare-pages.mjs <lang>` (paralelo, Vertex AI Gemini)

### blog_posts schema (canônico 2026-05-10)
- UNIQUE constraint mudou de `(slug)` pra `(slug, lang)`, permite mesmo slug em N idiomas
- `cover_url` HÁ DE estar no SELECT do front (app.js:2380). Sem ele, blog cards caem em SVG fallback.
- 70 artigos = 10 PT × 7 langs. Heros em `/img/blog-heros/SLUG.jpg` (não Supabase storage).

### Vertex AI Gemini pra texto (canônico 2026-05-10)
- Endpoint: `https://aiplatform.googleapis.com/v1/publishers/google/models/{model}:generateContent?key={KEY}`
- REQUER `contents:[{role:'user', parts:[{text:'...'}]}]`
- Funciona MESMO com `generativelanguage.googleapis.com` bloqueado (memória `hardening_2026_04_27`)
- Modelos: `gemini-2.5-flash` (rápido, 60s/30k chars), `gemini-2.5-pro` (artigos longos com chunking, mais lento)
- Custo: ~$0.50 / 60 traduções de 20k chars

### Tracking, GTM dataLayer-only (NÃO mexer sem ler tudo)
Migrado pra **GTM-WJGTVX8G** em 2026-05-20. `track(event,params)` em app.js + `trackEvent()` em coupons.html = fonte única → `dataLayer.push({event,event_id,user_data,ecommerce,firm_id,firm_name,coupon_code,content_*})` + `_sendCAPI()` server-side (mesmo `event_id` pra dedup Pixel×CAPI). GTM consome dataLayer e dispara tags GA4 (`G-CZ3L00NY77`) + Meta Pixel (`813048241061812`) + Google Ads. **NUNCA chamar `gtag('event',...)` ou `fbq(...)` direto**, só `dataLayer.push`. Exceção: `gtag('consent','default'/'update',...)` (Consent Mode v2, não é evento). Snippet GTM em `js/tracking-init.js` (shim `window.gtag` = `dataLayer.push(arguments)`). Pixel dispara no trigger `page_view` (carrega event_id); `consent_granted` NÃO serve de trigger. `/coupons` = consent granted automático (sem banner). Funil firmas: firm_detail_open → coupon_copy → checkout_click → Lead.

**GA4 só com o funil (2026-05-20):** allowlist `GA4_FUNNEL` em `track()`/`trackEvent()`, SÓ evento de funil entra no dataLayer, com nome PADRÃO GA4 (view_item/add_to_cart/begin_checkout/sign_up/subscribe/generate_lead/purchase/page_view). Instrumentação interna (tab_hidden, bot_*, js_error, quiz_*…) fica só no Supabase. Adicionar evento de funil novo = pôr na `GA4_FUNNEL` dos 2 arquivos.

**fbc/fbp/value CAPI (2026-05-20):** `_getFbAttribution()`/`_fbAttr()` priorizam cookie `_fbc`/`_fbp` (Pixel seta certo). fbc só reconstrói se cookie ausente ou fbclid novo, NUNCA `Date.now()` por evento (timestamp instável = Meta acusa "fbc modificado"). fbp semeado se ausente. Lead value = **$3.00 flat** (`_fbVal()` retorna 3.00), nunca 0. Detalhe: `memory/feedback_fbc_timestamp_estavel.md`.

Detalhe geral: `memory/project_gtm_tracking_2026_05_20.md`.

## Deploy

Git push **NÃO deploya sozinho** (auto-deploy quebrado nesse repo). Sempre rodar:
```
CI=1 npx vercel --prod --yes --token=$VERCEL_TOKEN
```
Validar com curl `?v=$(date +%s)` antes de falar "no ar". `VERCEL_TOKEN` no `.bashrc` (expira ~2026-05-21).

**Limite Vercel Hobby = 12 Serverless Functions.** Adicionar nova exige consolidar com existente.

### Deploy de Edge Function Supabase (canônico 2026-06-23)
`supabase/functions/<nome>/` deploya com **CLI byte-exato**, NUNCA via MCP retranscrito:
```
export SUPABASE_ACCESS_TOKEN=<sbp_ do ~/.bashrc>
npx supabase functions deploy <nome> --project-ref qfwhduvutfumsaxnuofa
```
**Por que NÃO MCP `deploy_edge_function`:** ele exige conteúdo inline; arquivos com chars Unicode invisíveis (ex: combining marks numa regex, `facebook-capi/index.ts` linhas 63-64) podem quebrar na carga se a transcrição falhar → derruba a função inteira ao vivo (= atribuição de anúncio = R$). CLI lê o arquivo do disco, zero risco. Token `sbp_` expira , se der **401 Unauthorized**, Everton gera novo em https://supabase.com/dashboard/account/tokens e troca no `~/.bashrc`. **Pós-deploy OBRIGATÓRIO:** disparar pelo gatilho real + verificar (curl com Origin certo/errado, ler `{ok,sent}`), nunca declarar pronto sem receipt. Detalhe: `memory/project_secure_build_audit_2026_06_22.md`.

### Edge function anon-callable = Origin allowlist (canônico 2026-06-23)
Toda edge function chamável com anon key (CORS `*`) que faz efeito (CAPI, webhook, write) DEVE ter gate de Origin: `ALLOWED_ORIGINS` (marketscoupons.com www+apex) → 403 quando Origin presente e estranho, tolera Origin ausente (server-to-server não quebra). Aplicado no `facebook-capi`. Anti-spam cross-site sem Upstash/rate-limit pago.

## CSS / Design

Tema dark, font Inter, paleta gold (`--gold` `#F0B429`). **Mínimos de contraste:** card bg `rgba(255,255,255,.10)`, border `.14`, texto `var(--t1)`/`var(--t2)` (nunca `t3` em conteúdo). Backdrop-filter PROIBIDO em cards (só nav/overlay/footer com bg opaco). Sobre hero image: usar bg `rgba(13,20,28,.78)` semi-opaco.

**Cupons:** label "Cupom exclusivo" + código à esquerda, botão "Copiar" à direita centralizado (flex space-between, label/code em `.offer-coupon-left` coluna). Classes por contexto: `.oc-coupon` (home), `.offer-coupon-box` (cards), `.fr-coupon-box` (grid), `.drw-coupon-bar` (drawer/checkout). NUNCA inline styles em template JS.

**Padrão fd-overlay (firma):** botões grid `--cols`, altura 38px, `white-space:nowrap`, mesma largura. Stats grid 4×3 = 12 cards centralizados. NUNCA mexer em Trustpilot/cores. Mobile responsivo obrigatório.

## I18N

Objeto `const I18N = {...}` em index.html. 7 idiomas: pt, en, es, it, fr, de, ar. Função `t('chave')` traduz. Helper `tf()` traduz dados de firma via `FIRM_T`.

**NUNCA traduzir:** "Prop Firm(s)", "Profit Split", "Drawdown", "Lifetime".

**OBRIGATÓRIO antes de deploy:**
- Texto novo HTML → `data-i18n="chave"` + entry no objeto I18N
- Texto novo JS template → `t('chave')` ou `tf('texto')`
- Componentes que usam `t()` em template JS DEVEM ser re-renderizados em `setL()` (senão exige Ctrl+F5 pra trocar idioma)
- Revisar CADA LINHA de texto visível no diff antes do commit

Conteúdo institucional pra aprovação **sempre em PT primeiro**, traduz só após OK.

### 🚨 Arquivo i18n VIVO = `i18n-<lang>.js` na RAIZ (com hífen), 2026-05-28
O site carrega `i18n-en.js` etc da **raiz** (uma linha JSON minificada). A pasta `i18n/<lang>.js` é **loader MORTO** (não carregado). Editar a pasta NÃO tem efeito. Ordem: split file raiz → **tabela Supabase `i18n` SOBRESCREVE** (se a key existe lá, atualizar a tabela também). Confirmar qual arquivo o site carrega antes de editar. Detalhe em memória `i18n-3-camadas`. Catálogo = **17 firmas** (não 12/6+).

### Apex, 4 dimensões de preço (canônico 2026-05-28)
type (Intraday/EOD) × size × **variant (Standard / Sem taxa de ativação)** × **pack (1/5 contas)**. `getPlanPrice(id,type,size,pack,variant)`; `firmHas5Pack`/`firmHasNoFee` disparam toggles; campos cms `n/o`,`n2/o2`,`n5/o5/e5`,`na*`,`na5*` etc. EOD 100K/150K 5-pack sem-taxa = N/A. Espelhar site (app.js fd-overlay) **e** `coupons.html`.

## Padrões de adição

### Firma nova
**NUNCA** subir com dados incompletos/inventados. Coletar do site oficial: nome, ID, cor, logo (`img/Firms/<id>.png`), link afiliado, cupom+%, Trustpilot, plataformas, todos os tamanhos com preços (original+desconto), drawdown, profit target, split, dias mín, scaling, news trading, Day-1 payout, perks, regras proibidas, descrição PT, badge.

**Inserir em 2 lugares:** `cms_firms` (Supabase, primário) E array `FIRMS` em index.html (fallback). Mapeamento: `discount_type` → `dtype`, `min_days` → `minDays`, `description` → `desc`, etc.

**Dados curtos obrigatório:** dd_pct ~12 chars (`-5% / -10%`), target ~10 (`8% / 5%`), split ~8 (`90%`), scaling ~10. Padronizar TODAS as firmas juntas.

## Boas práticas

1. PT-BR sempre nas respostas
2. Sem frameworks/dependências/bundlers
3. Inline styles → evitar; usar classes CSS
4. `.maybeSingle()` proibido `.single()`
5. Testar com curl pós-deploy + Ctrl+F5
6. Storage keys auth separados
7. Termos técnicos não traduzidos (Prop Firm, Profit Split, Drawdown, Lifetime)
8. Commits focados, descritivos
9. NUNCA quebrar layout existente
10. NUNCA remover conteúdo sem ser pedido
11. Consistência visual obrigatória (border-radius, padding, font-size iguais em irmãos)
12. NUNCA secret em código (Supabase Secrets / env vars)
13. NUNCA expor service_role key
14. NUNCA inventar feature; ler site/dados antes de escrever copy
15. NUNCA mencionar IA/Gemini/Claude/API em copy ao usuário final
