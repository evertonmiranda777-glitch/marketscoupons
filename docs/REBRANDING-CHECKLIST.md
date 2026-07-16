# marketscoupons — Especificação de Construção (para o Claude construtor)

> **LEIA ISTO PRIMEIRO.**
>
> Você vai construir o front-end novo de um site de cupons de prop firms. O back-end **já existe e não muda** (Supabase + funções serverless + crons + Meta CAPI + extensão Chrome). Seu HTML/CSS/JS novo vai ser **plugado nele**.
>
> **Regras absolutas:**
> 1. **Não invente nome.** Todo nome de evento, campo, chave de storage e rota que aparece aqui é literal. Se você renomear qualquer um, o site continua bonito e **para de gerar dinheiro sem dar erro na tela**.
> 2. **Não invente dado de firma.** Preço, desconto, cupom e regra vêm do banco (`cms_firms`) em tempo de execução. Nunca chumbe preço no código. Combo de plano que não existe → mostre "indisponível", **nunca calcule um preço plausível**.
> 3. **A PARTE 0 é contrato.** Ela não é sugestão nem "boa prática". É a lista do que quebra faturamento.
> 4. Se algo aqui estiver ambíguo, **pergunte**. Não preencha a lacuna com suposição.
>
> **Stack atual:** HTML/CSS/JS vanilla, sem framework, sem bundler. Supabase JS v2 via CDN. Deploy estático na Vercel. Você pode propor stack diferente, mas a Parte 0 continua valendo em qualquer stack.
>
> **Idioma:** o site é **EN por padrão** (público americano). Todo conteúdo público nasce em inglês. O admin é PT-BR.

---

# PARTE 0 — CONTRATO INTOCÁVEL

## 0.1 Rotas (mudar sem redirect 301 = apaga o SEO existente)

Existem hoje ~1.100 páginas indexadas (924 comparações, 133 landings SEO, 70 artigos). Preserve:

```
/                          → home
/{firma}                   → serve o index (SPA). 19 firmas, lista abaixo.
                             🔴 /apex é o CHECKOUT do dono, desenhado por ele nos
                             mínimos detalhes. NÃO redesenhar sem ordem explícita dele.
/{firma}-coupon            → landing SEO dedicada
/{lang}/{firma}-coupon     → idem, por idioma
/coupons                   → LP de tráfego pago
/signup                    → serve o index; o JS abre o modal de cadastro detectando
                             pathname === '/signup'. NÃO limpar a URL. NÃO criar signup.html.
/panel                     → painel do usuário
/blog  /blog/{slug}  /{lang}/guides/{slug}
/{firma-a}-vs-{firma-b}    → comparação
/buy/{firma}               → interstitial de compra
/go                        → interstitial de redirect
```

**As 19 firmas (ids literais):**
`apex, bulenox, ftmo, fn, e2t, the5ers, fundingpips, brightfunded, e8, cti, tradeday, blueguardian, toponefutures, aquafutures, blueberryfutures, alphafutures, futureselite, goat, funded-futures-family`

**8 idiomas:** `pt` (raiz, **sem prefixo**) + `/en /es /fr /de /it /ar /id`. **Não existe `/pt/`** , criar hreflang pra `/pt/` gera 404.

**A ordem das rotas importa:** `/{firma}-coupon` tem que ser resolvida **antes** de `/{firma}`.

## 0.2 Tracking , é o ROAS, não é enfeite

Existe **uma única porta de entrada**. Toda ação do site chama:

```js
track(nomeDoEvento, params)
```

**Nunca chame `gtag('event', ...)` nem `fbq(...)` direto.** Única exceção permitida: `gtag('consent', 'default'|'update', ...)` (Consent Mode v2, não é evento).

### Nomes de evento (literais, não traduzir, não renomear)

O site emite estes nomes; um mapa interno traduz pro padrão GA4. **Mudar o nome da esquerda = o evento some do GA4 e da Meta em silêncio.**

| Você emite | Vira no GA4 |
|---|---|
| `page_view` | `page_view` |
| `firm_detail_open` | `view_item` |
| `platform_detail_open` | `view_item` |
| `coupon_copy` / `copy_coupon` | `add_to_cart` |
| `checkout_click` | `begin_checkout` |
| `platform_checkout_click` | `begin_checkout` |
| `user_signup` | `sign_up` |
| `newsletter_subscribe` | `subscribe` |
| `tool_lead_capture` | `generate_lead` |
| `purchase` | `purchase` |

Só eventos desta lista entram no dataLayer. Telemetria interna (erros, abas, quiz) **não** vai pro GA4.

### O `event_id` , a regra que mais custa dinheiro

Gere **UM** `event_id` (`crypto.randomUUID()`) por ação, e use **o mesmo** no `dataLayer.push` e no envio server-side (CAPI). É isso que faz a Meta somar 1 venda em vez de 2. **Dois ids = venda contada em dobro = ROAS falso = decisão de verba errada.**

### Shape do `dataLayer.push` (o GTM lê exatamente estas chaves)

```js
dataLayer.push({
  event, event_id, timestamp,
  user_data: { external_id, em, ph, fn, ln, anon_id, fbp, fbc },
  ecommerce: { currency, value, items: [{ item_id, item_name,
               item_category: 'prop_firm', coupon, quantity, price }] },
  content_ids, content_name, content_type, content_category,
  firm_id, firm_name, coupon_code, page_name,
  utm_source, utm_medium, utm_campaign
});
```

Container GTM: **`GTM-WJGTVX8G`**. Pixel Meta: **`813048241061812`**. GA4: **`G-CZ3L00NY77`**.

### Gate LGPD (obrigatório)

Nenhum evento pode sair antes de `localStorage['mc-cookies-consent'] === 'accepted'`. Única exceção: o próprio evento `cookie_consent`.

### Atribuição , 3 regras que já custaram caro

1. **`_fbc` vem do cookie.** Só reconstrua se o cookie não existir **ou** se a URL trouxer um `fbclid` diferente. **Nunca reconstrua a cada evento com `Date.now()`** , timestamp instável faz a Meta acusar "fbc modificado" e descartar.
2. **`_fbp`** deve ser semeado uma vez se ausente (formato `fb.1.{timestamp}.{random}`), porque o Pixel carrega tarde e eventos iniciais saíam sem ele.
3. **First-touch de 7 dias** em `localStorage['mc_attribution']`. Só sobrescreva se a URL trouxer origem nova (`fbclid`, `gclid`, `ttclid`, `utm_campaign`, `utm_source`). 🔴 **`utm_source=pwa` NÃO conta como origem nova** , o `start_url` do PWA carrega esse valor, e sem essa exceção quem instalou o app vindo de um anúncio tem a atribuição apagada toda vez que abre pelo ícone.

### Chaves de storage (literais)

```
mc-cookies-consent   mc_attribution   mc_anon   mc_sid   mc_lang
mc-user-auth   (sessão do usuário)      mc-admin-auth  (sessão do admin , SEPARADAS)
_fbp   _fbc
mc_gw_seen_{slug}    (popup visto , localStorage, NUNCA sessionStorage)
```

## 0.3 Link de afiliado , é literalmente como o dinheiro entra

**Ordem fixa, não reordenar:**

```
1. injetar o sub_id na URL
2. track('firm_redirect', ...)
3. window.location.href = url     ← MESMA ABA. Nunca window.open / target=_blank.
```

**O parâmetro entra ANTES do `#fragment`.** O link da Apex é `/aff/go/X#block_660bfb7d`. O jeito ingênuo (`url += '?'+qs`) joga o parâmetro **dentro do hash** e a Apex nunca recebe = comissão perdida. Já aconteceu.

**O nome do parâmetro muda por plataforma de afiliado:**

| Firma | Parâmetro |
|---|---|
| Apex, Bulenox | `keyword` |
| FundedNext (FirstPromoter) | `fpr_t` |
| TradeDay (PostAffiliatePro) | `data1` |
| Goat | `sub_id` |

**Valor do sub_id** , cascata: `utm_term` → `utm_campaign` → `fbclid` (vira `'fb'`) → `utm_source` → `'mcsite'`. Rejeite macro não substituída (`__ad_name__`, `{{campaign.name}}`) , sem isso o painel da firma recebe lixo tipo `fb___ad_name__`.

🔴 **Apex paga por COOKIE, não por cupom.** Todo tráfego pra Apex vai por `apextraderfunding.com/member/aff/go/evertonmiranda`. Link do tipo `dashboard.apextraderfunding.com/signup/...?referralCode=` **não seta o cookie** e gera "venda sem clique" no painel = comissão perdida.

**Copiar cupom grava em `coupon_clicks`.** É essa linha que casa o clique com a venda depois. Se sumir, a atribuição de venda morre.

## 0.4 Estado assíncrono , a causa dos bugs mais caros

`db`, `FIRMS`, `currentUser`, `currentProfile`, `_geo` **chegam depois do load**. Quem checa no `init()` pega `null`/vazio e **falha em silêncio** (já causou: popup aparecendo pra usuário logado, e painel mostrando 11 firmas em vez de 19).

**Regra:** checagem que depende de sessão/perfil/firmas/geo roda **na hora de usar**, não no init.

Módulo externo **nunca** acessa `window.db` ou `window.FIRMS` (não existem , são variáveis de escopo). Use a ponte, que é feita de **getters** (o client é recriado no retry de sessão):

```js
window.MC_AUTH.getDb()      // client Supabase atual
window.MC_AUTH.getUser()    // usuário logado ou null
window.MC_AUTH.getProfile() // perfil ou null
window.MC_AUTH.getFirms()   // array de firmas (vazio até carregar)
```

Eventos: `mc:user-loaded` (perfil pronto) · `mc:firms-loaded` (firmas prontas).

## 0.5 Dados , `cms_firms` é a fonte única

Nunca chumbe preço. Campos literais:

`id, name, type, color, icon_url, badge{label,color}, sort_order, active, discount (número), discount_type, coupon, disc_note (faixa de promo), link (URL de afiliado), promo_ends_at, has_activation_fee, split, dd_pct, drawdown, target, scaling, leverage, consistency, payout_speed, max_accounts, min_days, eval_days, news_trading, day1_payout, platforms, tags, perks, description, rating, reviews, trustpilot_*, prices, price_types, detail_types, detail_plans, about_html, about_highlights, detail_includes, bg_image`

**`prices`** , array, um objeto por tamanho. É uma matriz de 4 dimensões: **tipo × tamanho × variante × pack**.

```jsonc
[{
  "a": "50K",                                  // tamanho (chave de match)
  "n": "$24.90",  "o": "$249",                 // tipo 0 (ex: Intraday), 1 conta, Standard
  "n5": "$95", "o5": "$950", "e5": "$19",      // pack de 5 (e = preço por conta)
  "na": "$79", "nao": "$790",                  // variante "No Activation Fee"
  "na5": "$345", "na5o": "$3450", "na5e": "$69",
  "n2": "$49", "o2": "$490",                   // tipo 1 (ex: EOD) , sufixo 2
  "n52": "$225", "o52": "$2250", "e52": "$45",
  "na2": "$109", "nao2": "$1090",
  "na52": "$445", "na52o": "$4450", "na52e": "$89"
}]
```

Legenda: `n` = com cupom · `o` = preço cheio · `5` = pack de 5 · `e` = por conta · `na` = sem taxa de ativação · sufixo `2` = segundo tipo.

🔴 **Combo ausente = "indisponível".** Nunca derive preço por proporção. (Já aconteceu: chutei preços "por proporção linear" e o dono flagrou. Publicidade enganosa no Brasil = Procon até R$12,6M.)

**`detail_plans`** , objeto chaveado pelo tipo:
```jsonc
{ "Intraday Trail": [ {"s":"25K","d":"$19.90","o":"$199"},
                      {"s":"100K","d":"$39.90","o":"$399","pop":1} ] }
```
`pop:1` = marcado como popular. `detail_types` = as chaves desse objeto.

## 0.6 Cupons oficiais , NUNCA trocar pelos cupons públicos da firma

O site tem cupons negociados. As firmas também publicam cupons públicos (SAVENOW, SUMMER50, LAUNCH, JLFLEX...). **Usar o público = o dono perde a comissão.**

```
apex MARKET · bulenox MARKET89 (oferta exclusiva de 89%, NÃO usar os $50OFF/$60OFF públicos)
fn MARKET · e2t MARKETSCOUPONS · the5ers MARKET · e8 MARKET · tradeday MARKETS
blueguardian MARKET · toponefutures MARKET · aquafutures AQUA
blueberryfutures MARKET-7652C · funded-futures-family MARKET
alphafutures MARKETS026158 · goat MARKET
brightfunded CLNLTPxtT4Sok0PzHaRIIQ  ← é oficial, parece lixo mas NÃO é. Nunca trocar.
ftmo (sem cupom, comissão via link)
```

## 0.7 Compliance (proibido na copy pública)

Nunca escrever: "sinais", "entrada", "stop loss", "take profit", "lucro garantido", "trader profissional", "operação ao vivo", "copy trade", "we trade for you", "fique rico", "renda garantida".
Nunca traduzir: "Prop Firm", "Profit Split", "Drawdown", "Lifetime".
Zero emoji em UI , ícones são SVG inline padrão Feather (`viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`).
Nunca usar em-dash com espaços (" — ") em conteúdo público.

---

# PARTE 1 — INDEX (site público)

## 1.1 Chrome
- [ ] **Topbar de promoção** , oculta por padrão, ligada por `site_settings.promo_topbar_enabled`.
- [ ] **Nav** , logo, busca global com resultados, sino, seletor de 8 idiomas, Entrar/Cadastrar, dropdown do usuário logado.
- [ ] **Menu mobile** , drawer + overlay.
- [ ] **Footer** , 4 colunas + newsletter + disclaimer de afiliado.
- [ ] **Banner de cookies** , Accept/Decline. É o gate de todo o tracking (§0.2).

## 1.2 Telas
- [ ] **Home** , hero (badge, título, subtítulo, 4 stats clicáveis, CTA Telegram) + "melhores ofertas agora".
- [ ] **Ofertas** · **Firmas** (catálogo + filtros) · **Checkout** (firma → tipo → planos + cupom) · **Comparar**.
- [ ] **Indicadores** , hub com 6 ferramentas (orderflow, dashboard, journal, backtester, alerts, ninjapack).
- [ ] **Calendário econômico** · **Análise diária** (gate) · **Gamma/GEX** (gate: grid, heatmap, vanna) · **Plataformas** · **Heatmap S&P 500**.
- [ ] **Guias** · **Blog** · **Calculadora** de position size (gate) · **Quiz** · **Live Room** (gate) · **FAQ** · **Prêmios**.
- [ ] **Painel do usuário** , bilhetes do sorteio + barra X/5, tarefas clicáveis, "seu perfil de trader", resumo com dado real de cliques, edição de dados, troca de senha, pills de firmas favoritas (**as 19 do banco**).
- [ ] **Legal** (privacidade/termos/cookies) · **App** (instalação PWA).

## 1.3 Overlays
- [ ] **Detalhe da firma** , painel esquerdo (imagem de fundo + história + destaques) e direito (planos/checkout). Grid de stats 4×3. Precisa suportar o **seletor de 4 dimensões da Apex** (tipo × tamanho × variante × pack).
- [ ] **Detalhe de plataforma** · **Drawer de checkout** com barra de cupom.
- [ ] **Modal de auth** , login + cadastro.
  🔴 **Cadastro = 3 campos.** Nome completo, email, senha. Mais: ☐ termos (**obrigatório**) e ☐ ofertas (**opcional, separado, NUNCA condição do cadastro**). Forçar marketing = GDPR art. 7.4 = ilegal.
  ☐ ofertas **não vem pré-marcado** em: UE/EEA, Reino Unido, Suíça, **Índia** e Brasil (essas leis exigem ação afirmativa; a Índia é 75% do tráfego). Sem geo detectado → desmarcado.
  Os outros 9 dados são capturados sozinhos: país/cidade/região por IP, idioma pela rota, fuso pelo `Intl`, versão do consentimento. **Apelido é derivado do nome, não perguntado.**
  *Contexto: o form antigo tinha 12 campos e nem listava a Índia no dropdown de país. Resultado: 7,8k visitantes/mês → 25 cadastros.*
- [ ] **Confirmação de email** , 6 caixas de código; colar distribui e verifica sozinho; reenviar; trava em 6 tentativas. O link de confirmação continua valendo como alternativa.
- [ ] **Popup do sorteio** , nome + email, cards de ganhador com troféu, auto-fecha ~2,3s.
  🔴 **Aparece UMA vez e nunca mais** (`localStorage['mc_gw_seen_{slug}']`, **jamais sessionStorage** , com sessionStorage o visitante recorrente toma o popup toda visita e o dono perde venda).
  Não aparece pra logado, nem durante o cadastro. Na home, espera a decisão do banner de cookies (senão os dois se empilham).
- [ ] **Onboarding** , 4 passos em chips, **todos puláveis**.
- [ ] **Bilhetes** , tarefas → 1 bilhete cada.
- [ ] **Chat do Max** (bot) , FAB, mensagens, typing, quick replies.
- [ ] **Popup Trustpilot** · **toast** · **gates de conteúdo**.

## 1.4 Transversal
- [ ] **i18n 8 idiomas.** ⚠️ Hoje a função `t()` **devolve a própria chave quando a tradução falta**, então `t('x') || 'fallback'` nunca cai no fallback e o usuário vê `signup_full_name` cru na tela. **No site novo, faça `t()` retornar vazio ou o fallback.**
- [ ] **RTL automático** para árabe.
- [ ] **Todo caminho de asset começa com `/`.** Em `/es/blog`, caminho relativo resolve pra `/es/img/...` = 404 = site quebrado.
- [ ] **PWA** , manifest, service worker, push. Ver a exceção do `utm_source=pwa` em §0.2.
- [ ] **Um leitor de artigo só.** Hoje são três (blog standalone, blog SPA, guias estáticos) e toda mudança de UX tem que ser feita em três lugares. **Unificar é uma das melhores entregas do rebranding.**
- [ ] **`/coupons` hoje é um site paralelo** , CSS próprio e dataset de firmas chumbado, separado do banco. **No site novo, ela deve ler do `cms_firms` como todo o resto.** (Já aconteceu de um preço ficar diferente entre a LP e o site = publicidade enganosa.)

---

# PARTE 2 — ADMIN (PT-BR)

Hoje: 16.380 linhas, 22 páginas sob 15 botões, **zero view/função SQL** , toda agregação é feita em JavaScript no navegador sobre arrays baixados. Por isso existem tetos: 500 leads, 2.000 eventos, 20.000 cliques. **O admin novo deve agregar no banco.**

## 2.1 Operação
- [ ] **Dashboard** (visão geral + alertas) · **Analytics** (funil: topo GA4 → meio `coupon_clicks` → fundo conversões; campanhas; heatmap de horário; geo).
- [ ] **Usuários** (leads + cadastros , cadastros vêm de endpoint server-side, porque o RLS bloqueia leitura anônima de `profiles`).
- [ ] **E-mail** , envio + push. Fila, limite diário, campanhas ativas, **cooldown por template** (padrão 7 dias).
- [ ] **Monetização** (provas) · **Financeiro** (receita, ROAS, criativos, keywords) · **Impostos** (gross-up Meta Brasil +13,83%).
- [ ] **Filtro de data global** que re-renderiza a página ativa.

## 2.2 CMS
- [ ] **Firmas** (CRUD + editor rápido de desconto/cupom/split) · **Conteúdo** (blog, guias, FAQ) · **Indicadores**.
- [ ] **Telegram** · **Criativos** (+ automações IG/ManyChat) · **Reviews** (moderação).
- [ ] **Site** , 15 sub-abas que escrevem em `site_settings` e mudam o site público **sem deploy**: hero, navegação, ofertas, firmas, plataformas, indicadores, calendário, análise, gamma, calculadora, quiz, live room, footer, cores/tema, logo.
- [ ] **Config** , textos, traduções i18n, traduções de firma.

## 2.3 Dívidas a consertar no admin novo
- [ ] **A aba de Sorteios existe e está VAZIA** , hoje liga/desliga na unha no banco (`giveaways.active`). Construir a UI.
- [ ] **Templates de email duplicados** em dois arquivos. Editar um só faz o cron disparar corpo velho. **Fonte única.**
- [ ] **Tela de login mostra números chumbados e errados** ("6+ Firmas", "7 Idiomas"; são 19 e 8).
- [ ] **Campo "senha atual" é coletado e nunca validado.**
- [ ] Duas páginas mortas.
- [ ] Allowlist de email no navegador é só UX , a segurança real é `profiles.is_admin` validado no servidor, em todo endpoint. **Manter os dois.**
- [ ] **Auth do admin e do usuário usam chaves de storage separadas** (`mc-admin-auth` vs `mc-user-auth`). Logar no admin não pode derrubar a sessão do usuário no mesmo navegador.

---

# PARTE 3 — O QUE JÁ EXISTE (não construir)

Você não precisa fazer nada disto. Está aqui pra você saber o que **não** reinventar:

- **14 funções serverless** (chatbot Max, stats Brevo, welcome/confirmação de email, envio, push, leads, unsubscribe, delete-user, render de criativo, OG images, validação de email/MX, geração de copy). ⚠️ **O plano da Vercel permite 12 e já estamos em 14** , se precisar de uma nova, consolide em `?action=` de uma existente.
- **13 edge functions**, com destaque pra `facebook-capi` (o dinheiro), `finance-sync` (recebe a extensão), `sale-instant-attrib`, `attribution-matcher`, `meta-ads-control`, `ga4-geo`, `telegram-bot`, `daily-analysis`.
- **12 crons no GitHub Actions** + 4 no banco + 2 triggers SQL.
- **Extensão Chrome** que raspa os painéis de afiliado e alimenta o financeiro.
- **Tabelas:** `cms_firms, profiles, coupon_clicks, email_subscribers, email_logs, blog_posts, cms_guides, cms_faq, cms_texts, i18n, firm_translations, site_settings, giveaways, giveaway_tickets, favorites, firm_reviews, affiliate_daily_stats, affiliate_conversions, coupon_attributions, daily_analysis, gex_levels, ad_spend_daily`.

---

# O QUE PRECISO SABER ANTES DE VOCÊ COMEÇAR

1. **É só visual ou é produto novo?** Mesma estrutura com cara/nome/paleta novos, ou telas e fluxos diferentes? Isso muda tudo.
2. **O nome e a marca novos** , quais são? (o logo atual é hexágono + M dourado; paleta dark, gold `#F0B429`, fonte Inter).
3. **Vai manter as 27 telas** ou é pra cortar? Se cortar, quais , essa decisão é do dono, não sua.
4. **O `/apex`** , o dono desenhou aquele checkout. Confirma com ele antes de encostar.
