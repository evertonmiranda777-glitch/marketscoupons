# Rebranding marketscoupons — Checklist de Construção

**Para:** o designer que vai construir o site novo.
**De:** levantamento factual do código em 16/07/2026 (não é de memória; cada item foi lido no repo).

**Como usar:** construa os itens marcados `[ ]`. Cada um tem um **gancho de religação** entre parênteses , é o nome/id/campo que o backend atual procura. Se o gancho existir, eu ligo a coisa no ar sem reescrever nada. Se o nome mudar, eu tenho que reescrever, e é aí que quebra.

---

## PARTE 0 — CONTRATO INTOCÁVEL (não redesenhar, não renomear, não "melhorar")

Isto não é preferência. Cada linha aqui, se mudar, custa dinheiro **sem dar erro na tela**.

### 0.1 URLs (mudar sem 301 = SEO zerado)
- [ ] `/{firma}` (19 rotas: apex, bulenox, ftmo, fn, e2t, the5ers, fundingpips, brightfunded, e8, cti, tradeday, blueguardian, toponefutures, aquafutures, blueberryfutures, alphafutures, futureselite, goat, funded-futures-family) → **serve o index**. **`/apex` é o CHECKOUT do dono, desenhado por ele. Não redesenhar sem ordem explícita.**
- [ ] `/{firma}-coupon` e `/{lang}/{firma}-coupon` → landings SEO (133 páginas).
- [ ] `/coupons` → LP de tráfego pago (hoje é um site paralelo, dataset próprio).
- [ ] `/signup` → **serve o index**; o JS abre o modal detectando `pathname === '/signup'` e **não limpa a URL**. Não criar `signup.html`.
- [ ] `/blog`, `/blog/{slug}`, `/{lang}/guides/*`, `/{a}-vs-{b}` (924 compare pages), `/buy/{firma}`, `/go`.
- [ ] 8 idiomas: `pt` (raiz, sem prefixo) + `/en /es /fr /de /it /ar /id`. **Não existe `/pt/`.**
- [ ] Ordem das rotas importa: `-coupon` tem que vir **antes** de `/{firma}`.

### 0.2 Tracking (é o ROAS)
- [ ] Toda ação passa por **`track(evento, params)`**. **Nunca chamar `gtag('event')` nem `fbq()` direto** (exceção: `gtag('consent',...)`).
- [ ] Nomes de evento de entrada **preservados**: `firm_detail_open`, `coupon_copy`, `checkout_click`, `user_signup`, `newsletter_subscribe`, `tool_lead_capture`, `purchase`, `page_view`. Mudar o nome = o evento some do GA4 e da Meta **em silêncio**.
- [ ] **Um `event_id` por ação**, compartilhado entre dataLayer e CAPI. Dois ids = a Meta conta a venda duas vezes = ROAS falso.
- [ ] Chaves de storage preservadas: `mc-cookies-consent`, `mc_attribution`, `mc_anon`, `mc_sid`, `mc-user-auth`, `mc-admin-auth`, `_fbp`, `_fbc`.
- [ ] Gate LGPD: nenhum evento sai antes de `mc-cookies-consent === 'accepted'` (exceto o próprio `cookie_consent`).
- [ ] GTM container `GTM-WJGTVX8G` via `js/tracking-init.js`.

### 0.3 Dinheiro (link de afiliado)
- [ ] Ordem fixa: **injetar sub_id → track → `location.href`**. Same-tab. Nunca `window.open`/`target=_blank` no link de firma.
- [ ] O parâmetro é anexado **antes do `#fragment`** (`_appendQuery`). Se cair dentro do hash, a Apex não recebe.
- [ ] Nome do param **muda por plataforma**: Apex `keyword` · Bulenox `keyword` · FundedNext `fpr_t` · TradeDay `data1` · Goat `sub_id`.
- [ ] **Apex paga por COOKIE do link `/member/aff/go/evertonmiranda`, não por cupom.** Link de `dashboard...?referralCode=` não seta cookie = venda sem comissão.
- [ ] Copiar cupom **grava em `coupon_clicks`** , é o que fecha o loop clique→venda.

### 0.4 Dados
- [ ] `cms_firms` é a **fonte única** de preço/cupom/desconto. Nomes de campo preservados (`prices`, `detail_types`, `detail_plans`, `disc_note`, `discount`, `coupon`, `link`, `sort_order`, `active`...).
- [ ] `prices` é matriz [tamanho][tipo][variante][pack]. Combo não ofertado retorna **indisponível**, nunca preço inventado.
- [ ] Módulo externo acessa estado **só via `window.MC_AUTH`** (`getDb/getUser/getProfile/getFirms`) , são **getters**, porque o client é recriado. `window.db`/`window.FIRMS` = falha silenciosa.
- [ ] `db`, `FIRMS`, `currentUser`, `currentProfile`, `_geo` chegam **depois do load**. Checar no init pega vazio. Eventos: `mc:user-loaded`, `mc:firms-loaded`.
- [ ] Cupons oficiais (NÃO trocar pelos públicos das firmas): apex `MARKET` · bulenox `MARKET89` (oferta exclusiva 89%) · fn `MARKET` · e2t `MARKETSCOUPONS` · the5ers `MARKET` · brightfunded `CLNLTPxtT4Sok0PzHaRIIQ` · e8 `MARKET` · tradeday `MARKETS` · blueguardian `MARKET` · toponefutures `MARKET` · aquafutures `AQUA` · blueberryfutures `MARKET-7652C` · funded-futures-family `MARKET` · alphafutures `MARKETS026158` · goat `MARKET`.

---

## PARTE 1 — INDEX (site público)

### 1.1 Chrome (aparece em tudo)
- [ ] **Topbar de promoção** , oculta por default, ligada pelo admin (`site_settings.promo_topbar_enabled`). Altura real vira a CSS var `--promo-h`.
- [ ] **Nav** , logo, busca global com resultados, sino, seletor de idioma (8), botões Entrar/Cadastrar, dropdown do usuário logado, abas de navegação.
- [ ] **Menu mobile** , drawer + overlay.
- [ ] **Footer** , 4 colunas + newsletter + disclaimers de afiliado.
- [ ] **Banner de cookies** , Accept/Decline. **É o gate de todo o tracking** e o sorteio espera a escolha dele na home.

### 1.2 Telas (27 hoje; corte o que não quiser, mas decida conscientemente)
- [ ] **Home** , hero (badge, título, subtítulo, 4 stats clicáveis, CTA Telegram) + "Melhores ofertas agora".
- [ ] **Ofertas** , grid de cupons.
- [ ] **Firmas** , catálogo + sidebar de filtros.
- [ ] **Checkout** , seletor firma → tipo → planos + barra de cupom.
- [ ] **Comparar** , comparador + banner de vencedor.
- [ ] **Indicadores** , hub de ferramentas (6 modais: orderflow, dashboard, journal, backtester, alerts, ninjapack).
- [ ] **Calendário** econômico , countdown + filtros.
- [ ] **Análise diária** , cards (com gate de login).
- [ ] **Gamma/GEX** , ticker, expirações, grid, heatmap, vanna (com gate).
- [ ] **Plataformas** , grid + detalhe.
- [ ] **Heatmap** S&P 500.
- [ ] **Guias** , grid + leitor.
- [ ] **Blog** , filtros + grid + leitor.
- [ ] **Calculadora** de position size (com gate).
- [ ] **Quiz** de recomendação.
- [ ] **Live Room** , gate + sala + countdown (estreia 03/08/2026).
- [ ] **FAQ** , do CMS.
- [ ] **Prêmios**.
- [ ] **Painel do usuário** , avatar, bilhetes do sorteio + barra X/5, tarefas clicáveis, "perfil de trader", resumo com dado real, edição de dados, troca de senha, pills de firmas favoritas (**19, vindas do banco , hoje um bug mostrava 11 do fallback**).
- [ ] **Legal** , privacidade, termos, cookies.
- [ ] **App** , instruções de instalação PWA iOS/Android.

### 1.3 Overlays
- [ ] **Detalhe da firma** (`fd-overlay`) , painel esquerdo (bg + história + highlights) e direito (planos/checkout). Grid de stats 4×3. **Seletor de 4 dimensões da Apex** (tipo × tamanho × variante × pack).
- [ ] **Detalhe de plataforma**.
- [ ] **Drawer de checkout** , com barra de cupom.
- [ ] **Modal de auth** , carrossel + login + cadastro. **Cadastro = 3 campos** (nome, email, senha) + termos (obrigatório) + ofertas (**opcional, nunca pré-marcado em UE/UK/CH/Índia/Brasil**). Os outros 9 dados são capturados sozinhos.
- [ ] **Modal de confirmação de email** , 6 caixas de código, colar distribui e verifica sozinho, reenviar, trava de 6 tentativas.
- [ ] **Popup do sorteio** , nome+email, cards de ganhador com troféu, auto-fecha ~2.3s. **Regra: aparece UMA vez e nunca mais** (`localStorage`, igual cookies). Não aparece pra logado nem durante o cadastro.
- [ ] **Onboarding** , 4 passos em chips, todos puláveis.
- [ ] **Bilhetes** , tarefas → 1 bilhete cada.
- [ ] **Chat do Max** (bot) , FAB, mensagens, typing, quick replies.
- [ ] **Popup Trustpilot**, **toast**, **gates de conteúdo**.

### 1.4 Sistemas transversais
- [ ] **i18n 8 idiomas** , `t(chave)`. **Atenção: hoje `t()` devolve a própria chave quando falta**, então `t('x') || 'fallback'` nunca cai no fallback e aparece `signup_full_name` cru na tela. **Corrigir isso no site novo** (retornar vazio/fallback).
- [ ] **RTL automático** pro árabe.
- [ ] **Todo asset com `/` inicial** , em `/es/blog`, path relativo vira `/es/img/...` = 404.
- [ ] **PWA** , manifest, service worker, push. `start_url` tem `?utm_source=pwa` , **esse valor não pode contar como nova origem de tráfego**, senão apaga a atribuição do anúncio.
- [ ] **Três leitores de artigo** hoje (blog standalone, blog SPA, guias estáticos). **Unificar em um** é uma das melhores oportunidades do rebranding.

---

## PARTE 2 — ADMIN

Hoje: 16.380 linhas, 22 páginas sob 15 botões, **zero view/função SQL** , tudo é agregado em JavaScript no navegador, por isso existem tetos (500 leads, 2.000 eventos, 20.000 cliques). **O admin novo deveria agregar no banco.**

### 2.1 Operação
- [ ] **Dashboard** , visão geral + alertas.
- [ ] **Analytics** , funil (topo GA4 → meio `coupon_clicks` → fundo conversões), campanhas, heatmap de horário, geo.
- [ ] **Usuários** , leads e cadastros. (Cadastros vêm de `/api/brevo-stats?type=signups_all`, porque o RLS bloqueia leitura anônima de `profiles`.)
- [ ] **E-mail** , centro de envio + push embutido. Fila, limite diário, campanhas ativas, cooldown por template (default 7 dias).
- [ ] **Monetização** , aprovação de provas.
- [ ] **Financeiro** , receita, ROAS, criativos, keywords.
- [ ] **Impostos** , gross-up Meta Brasil (+13,83%).
- [ ] **Filtro de data global** , re-renderiza a página ativa.

### 2.2 CMS
- [ ] **Firmas** , CRUD + editor rápido de desconto/cupom/split.
- [ ] **Conteúdo** , blog, guias, FAQ.
- [ ] **Indicadores** , CRUD.
- [ ] **Telegram** , bot, criativos, agendamento.
- [ ] **Criativos** , geração + automações IG/ManyChat.
- [ ] **Reviews** , moderação.
- [ ] **Site** , 15 sub-abas que escrevem em `site_settings` e mudam o site público **sem deploy**: hero, navegação, ofertas, firmas, plataformas, indicadores, calendário, análise, gamma, calculadora, quiz, live room, footer, cores/tema, logo.
- [ ] **Config** , textos, traduções i18n, traduções de firma.

### 2.3 Consertar no admin novo (dívidas conhecidas)
- [ ] **Aba de Sorteios existe e está VAZIA** , hoje liga/desliga só na unha no banco (`giveaways.active`). Construir a UI.
- [ ] **Templates de email duplicados** em `admin.html` e `lib/email-render.js`. Editar um só = o cron dispara corpo velho. **Fonte única.**
- [ ] **Login mostra números chumbados errados** ("6+ Firmas", "7 Idiomas"; são 19 e 8).
- [ ] **Campo "senha atual" é coletado e nunca validado.**
- [ ] Duas páginas mortas (`page-analytics` escondida; seção de sorteios vazia).
- [ ] Allowlist de email no navegador é só UX , a segurança real é `profiles.is_admin` validado no servidor. Manter os dois.

---

## PARTE 3 — RELIGAÇÃO (o que eu faço depois que ele construir)

Não precisa que o designer toque em nada disto. Fica aqui pra ele saber **o que já existe e não precisa reinventar**.

- [ ] **14 serverless functions** (bot/Max, brevo-stats, welcome-email, send-email, push, leads, unsubscribe, delete-user, render-criativo, og-image, validate-email/mx, gen-firm-copy). ⚠️ **O limite do plano Vercel é 12 e já estamos em 14** , function nova exige consolidar em `?action=`.
- [ ] **13 edge functions** , com destaque pra `facebook-capi` (o dinheiro), `finance-sync` (a extensão), `sale-instant-attrib`, `attribution-matcher`, `meta-ads-control`, `ga4-geo`, `telegram-bot`, `daily-analysis`.
- [ ] **12 crons no GitHub Actions** + 4 no banco + 2 triggers SQL.
- [ ] **Tabelas** , cms_firms, profiles, coupon_clicks, email_subscribers, blog_posts, cms_guides, giveaways, giveaway_tickets, i18n, site_settings, affiliate_daily_stats e outras.
- [ ] **Extensão Chrome** que raspa os painéis de afiliado (v0.4.4).

### Riscos de infra a resolver junto (não são do designer)
- [ ] **4 crons de produção e 2 triggers SQL não estão no git.** Se o projeto Supabase for recriado, eles somem em silêncio. **Versionar antes de qualquer migração.**
- [ ] `/api/capi` é chamado pelo `buy.html` e **não existe** , esse InitiateCheckout está morto.
- [ ] `buy.html` lê o cache `mc_firms_cache_v12`, o app grava `v13`.
- [ ] `CRON_SECRET` viaja na query string em 5 workflows (vaza em access log).
- [ ] 4 nomes diferentes para a mesma service_role.
- [ ] `meta-ads-sync` sem gate, enquanto `meta-ads-control` é admin-only , mesmas credenciais Meta.

---

## Decisão que muda tudo (precisa do dono)

**O rebranding é só visual (mesma estrutura, cara/nome/paleta novos) ou é produto novo (telas e fluxos diferentes)?**

- **Só visual:** a checklist acima é um guia de skin. Baixo risco, religação rápida.
- **Produto novo:** cada fluxo precisa ser especificado com regra de negócio, e a Parte 0 vira mais crítica ainda, porque é o que impede o produto novo de nascer sem dinheiro.
