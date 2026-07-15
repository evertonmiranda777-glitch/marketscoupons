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

**🛑 LEI (25/jun) , AVALIAR + AVISAR + PERGUNTAR antes de risco:** antes de QUALQUER ação que pode dar merda (query pesada/`count(*)` em tabela grande tipo `events`, infra prod, restart, deploy crítico, billing, irreversível) = (1) avaliar o risco, (2) avisar em 1 linha que pode dar merda, (3) perguntar se pode tentar e esperar OK. NUNCA risco no automático. Travei o banco (522/timeout, lead/signup caíram) rodando count na `events` sem avisar. **Analytics SEMPRE pelo GA4** (não toca no banco). Leitura leve/código/tradução seguem autônomos. Detalhe: `memory/feedback_avaliar_avisar_perguntar_antes_de_risco.md`.

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

**REGRA Sorteio popup (REFEITO 14/jul , MÓDULO ÚNICO):** o popup de sorteio agora é o **módulo `js/giveaway-popup.js`** (auto-contido: CSS + markup + **8 idiomas** no objeto `S` + lógica), carregado em **`index.html` E `coupons.html`** (a LP de tráfego pago é prioridade). ⚠️ O popup antigo inline no index.html (`.g2*` + `#gw-bd` + `showGiveaway`/`maybeShowGiveaway`/`giveawaySubmit` no app.js) está **MORTO** , gatilhos removidos do app.js; NÃO usar. **Fluxo:** captura **nome+email** (id `mcgw-bd`), submit **fire-and-forget** (não espera, sucesso na hora ~60ms), auto-fecha **~2.3s**, volta pro site. Fecha fácil (X/Esc/fora/maybe-later). **Prêmio = 3 contas Apex, ganhador ESCOLHE O TAMANHO (cupom, sem tamanho fixo).** Regras (cadastrar + seguir @marketscoupons IG + compartilhar) = **email multilíngue** `sendGiveawayRulesEmail`/`buildGiveawayRulesHtml` em `api/leads/volumefilter.js` (handleSubscribe, `source=giveaway`) → Brevo, botão "Finish signup"→`/signup?gw=apex-3-accounts-2026`. **Controle = `giveaways.active`** (linha `apex-3-accounts-2026`, DESATIVADA `active=false` , ligar SÓ com ordem: `update giveaways set active=true where slug='apex-3-accounts-2026'`, DB-only sem deploy). **Preview: `?gw_preview=1`** (funciona pra qualquer um , RLS `giveaways_read_active` agora `USING(true)`; popup real segue gated por `active`). `/signup?gw=slug` = deep-link que entra no sorteio. Detalhe: `memory/project_sessao_2026_07_08.md` §10.

**REGRA KB do Everton = VERBATIM (LEI 30/jun):** quando Everton manda KB de firma, aplicar os números EXATOS (preço cheio `o` E desconto `n`) no `cms_firms.prices`. **NÃO recalcular** `n=cheio×%` (se a KB traz o desconto, é ESSE); **NÃO perguntar "confirma?"**. Só recalcular quando a KB der SÓ preço cheio (sem coluna de desconto) → aí aplica o `%` do banco. **Cupom:** firma COM cupom Markets (MARKET/MARKET89/MARKETS/MARKETS026158/MARKET-7652C/MARKETSCOUPONS/AQUA) = MANTÉM; firma SEM cupom Markets = usa o **público ATUAL** (ex CTI virou SPARKWEEK15, FundedNext NEW25 "deles até assinar papéis"). Detalhe: `memory/feedback_kb_everton_aplicar_verbatim.md`.

**REGRA 522 events KILL-SWITCH (LEI 30/jun):** escrita em `events` pelo browser está DESLIGADA (`MC_EVENTS_DB=false` app.js + `if(false)` coupons/buy + `return` go) E `REVOKE INSERT ON events FROM anon,authenticated` no banco. Analytics = **100% GA4**, não a tabela `events`. NÃO religar sem compute maior. Recuperar outage: restart via `POST api.supabase.com/v1/projects/<ref>/restart` (token .env.local) + REVOKE no SQL Editor dashboard (fura o pooler). ⚠️ gatear só a LINHA do fetch de events (não o try inteiro , tem CAPI/GA4 junto no buy.html). Detalhe: `memory/project_db_522_kill_switch_2026_06_30.md`.

**REGRA firma sem desconto = transparência no card (30/jun):** discount=0 → card mostra "Via link / No code" (i18n `met_via`/`met_nocode` em `i18n-en.js`), não "0% OFF" falso. app.js ~3093 (card) + ~3050 (home offers); fd-overlay já esconde quando 0. FTMO agora = 19% (só na 100K, aviso no `disc_note` + `about_html`).

**🚨 REGRA COMPLIANCE = FIRMA NOVA *OU ATUALIZAÇÃO* SINCRONIZA TODAS AS SUPERFÍCIES (LEI 01/jul):** desconto/cupom/preço de uma firma DIFERENTE entre superfícies = **publicidade enganosa**. Ao mudar QUALQUER firma, sincronizar: (1) `cms_firms` (banco, fonte); (2) **telegram-creative** SCHEDULE `off%` + COUPONS , ⚠️ é hardcoded, e a IMAGEM (criativo-render) puxa do banco, então caption e imagem podem se contradizer no MESMO post; (3) **api/bot.js** Max (cupom/desconto + preços já puxam do banco ao vivo desde 01/jul; regras profundas hardcoded); (4) **coupons.html** LP (4 firmas hardcoded); (5) **lib/email-render.js** + admin INST_TEMPLATES (Apex/Bulenox/top3 hardcoded); (6) **push templates** admin.html. **Ideal:** tudo puxar do `cms_firms` (Max e imagem já fazem; telegram-creative caption ainda é hardcoded , TODO tornar dinâmico). Incidente 01/jul: mudei 5 descontos no banco (Top One/BG/CTI/FN/FTMO) e NÃO sincronizei o telegram-creative → post do TG mostrava 60% no texto e 40% na imagem. Everton furioso (compliance).

**PENDÊNCIAS 30/jun (retomar):** (1) **FundedNext** , parada, oferta acabou de subir/ativa, acertar com calma amanhã (usar NEW25 deles até assinar contrato GrowthNext). (2) **CTI** , SPARKWEEK15 expira 30/jun, re-checar/trocar. (3) **Popup sorteio** , preview `?gw_preview=1` não abriu no teste do Everton (debug interrompido , investigar showGiveaway/cache amanhã). (4) Email Nuhash = Everton já mandou. (5) ProveSource FOMO popup dado real + Node 24 package.json = backlog.

**ESTADO 02-03/jul (RELER `memory/project_sessao_2026_07_02.md`):** Sessão grande. (a) **FFF completa** , preços KB verbatim, finance-sync dispara Purchase/Telegram, 288 compare pages (build R$0, EU traduzo, ZERO Gemini), extensão +7 firmas. (b) **522 resolvido de vez** , `TRUNCATE events, events_archive` (235MB de bloat = a fonte de I/O). (c) **Imposto Meta Brasil +13,83%** (COFINS 7,60%+PIS 1,65%+ISS 2,90% por dentro) , gross-up `1.1383` no admin + aba Impostos (`memory/reference_meta_brasil_impostos.md`). (d) **Auditoria segurança 8/9** (`memory/project_sec_hardening_2026_07_02.md`) , ⚠️ **NÃO re-adicionar Origin gate no `finance-sync`** (quebra o Markets Monitor externo). Everton precisa **Ctrl+F5 no admin**. (e) **Apex 1776 PARADO** , previews prontos (`data/preview/email-apex-1776.html` + `popup-apex-1776.html`, zero emoji/cores do site), esperando o **$250K Legacy aparecer no checkout do Apex** (Lei #0). Popup só no site, LP limpa. (f) `.env.local` `SUPABASE_SERVICE_ROLE_KEY` **VAZIO** , recolocar (scripts locais rodam com anon por ora).

**ESTADO 13-14/jul (RELER `memory/project_sessao_2026_07_08.md` §9-10):** (a) **FFF não sincronizava Telegram/financeiro** , causa era GATILHO (content-script SPA não re-raspava), não parser/pipeline. Ext **v0.4.4**: auto-sync com tab aberto (throttle 30→2min) + auto-fetch fundo 30→10min + `mcWaitFFFTable` espera grid React. **Everton RECARREGAR ext (deve virar 0.4.4).** (b) **CAPI "FALHOU" em venda atribuída = event_time no FUTURO** , finance-sync carimba `created_at` 15:00 UTC fixo, venda de manhã fica no futuro, Meta rejeita (subcode 2804004). Fix: cap `[now-7d, now]` no `facebook-capi/index.ts` (deploy `--no-verify-jwt`) + backfill 4 vendas $21.65. (c) **Specials Apex Legacy $250K + Bulenox 25K $9.95 DELETADOS** (acabaram): `FIRM_SPECIALS={}` / `SPECIALS=[]` + apagadas 6 páginas preview + 14 PNGs + apex-legacy.html. (d) 🎁 **SORTEIO 3 Apex = MÓDULO `js/giveaway-popup.js`** (ver REGRA Sorteio acima) , no site+/coupons, 8 idiomas, submit fire-and-forget, auto-fecha 2.3s, email regras multilíngue. Popup REDESENHADO 14/jul (cards de ganhador com troféu dourado 1º/2º/3º + Conta Apex, 3 checks: 3 ganhadores/sem compra/resultado 20 jul, pill "Sorteio exclusivo" c/ ícone presente). **ATIVADO 15/jul (`active=true`).** ⚠️ **Gate na home:** o sorteio espera a escolha do modal de cookies (`mc-cookies-consent`) antes de abrir p/ não empilhar (backdrop do sorteio z99998 cobria os botões Accept/Decline z9998); /coupons não tem banner, abre direto. Prêmio = ganhador escolhe tamanho. Preview 8 idiomas: `/data/preview/giveaway-popup-v3.html`. **DECISÃO ABERTA:** faixa Apex gancho $17 (5-Pack) vs $59 (activation).

**ESTADO 10-13/jul (mesmo arquivo `memory/project_sessao_2026_07_08.md`, seções 5-8):** (a) **FFF "no activation fee"** , faixa verde brilhante no card /coupons (Variante A aprovada, copy EXATA do Everton "The only account with NO ACTIVATION FEE, regardless of account size", "ZERO activation fee" foi REJEITADO), i18n `FFF_NOFEE` 8 idiomas; Max ensinado; stat FFF "Activation Fee: $0" + "News Trading: Yes" (confirmado no help center oficial da FFF). (b) **Bug leverage SISTÊMICO** (9 firmas futures tinham faixa de conta no campo `leverage`) , fix generalizado em app.js: FFF→"Activation Fee $0", futures→"Account Size" limpo, forex→"Leverage 1:100". (c) **Bug "app desloga sozinho" RESOLVIDO** , timeout 6s do `getSession()` apagava `mc-user-auth` (rede lenta/mobile deslogava usuário válido); agora re-tenta em vez de apagar. (d) **Bulenox special 25K $9.95 REMOVIDO** (expirou 08/jul; `FIRM_SPECIALS.bulenox active:false` + tirado do SPECIALS coupons.html) e **25K regular RESTAURADA** , ⚠️ EU INVERTI primeiro (removi a regular, mantive o special) e Everton furioso; corrigido. LIÇÃO: dado de plano vive em 3 fontes (cms_firms, CHECKOUT_FIRMS ~4501, **FIRM_ABOUT.plans ~841 que alimenta o seletor do fd-overlay**). (e) **Apex promo $59** (email oficial: taxa ativação PA Intraday $59 flat qualquer tamanho + 90% off, até **21/jul 23:59 ET**) , **`disc_note` estava MORTO** (faltava no SELECT/mapa do `loadFirmsFromSupabase`), liguei; faixa laranja no card /coupons ("PA Intraday Trail Activation Fee: $59 for any account size", `APEX_FEE` 8 idiomas) com **auto-expire 21/jul** (`APEX_FEE_ENDS`); Max ensinado. Cupom MARKET intocado (site Apex usa SAVENOW público). **DECISÃO ABERTA:** trocar faixa Apex pro gancho "$17" (5-Pack) ou manter $59. (f) 🚨 **LEIS novas:** [[feedback_barra_escassez_so_promo_curta]] (contador SÓ em promo curta, promo longa mata urgência) + **BrightFunded `CLNLTPxtT4Sok0PzHaRIIQ` é cupom OFICIAL do Everton, NUNCA trocar pelos públicos SUMMER** (incidente: quase troquei, [[reference_cupons_oficiais_markets]]).

**ESTADO 08/jul (RELER `memory/project_sessao_2026_07_08.md`):** (a) **Extensão consertada (v0.4.2)** , TDZ `Cannot access 'AUTOFETCH_ALARM' before initialization` quebrava o service worker inteiro (Status 15, keep-alive+auto-fetch mortos); movi cold start pro FIM do `extension/background.js` + FFF espera grid React montar antes de raspar (`mcWaitFFFTable`). **Everton precisa RECARREGAR a extensão (deve virar 0.4.2, aba "Erros" limpa).** (b) **FundedNext PUBLICADA** , Nuhash corrigiu o MARKET (validei no checkout via Playwright: **47% Futures Flex** / **25% CFD Stellar 2-Step**; CFD 100K+ só 5%). Ordem por ORDEM DIRETA do Everton: **home = desconto decrescente MAS FundedNext FIXADA em 3º** (helper `pinFN()` em app.js, usado em renderHome+applyF) · **/coupons em 4º** (array manual coupons.html). Sincronizei cms_firms (`discount 47`, `coupon MARKET`, `sort_order 3`, FTMO→4, `disc_note`, **adicionei Futures Flex** em detail_types/detail_plans/prices , faltava o plano do headline) + coupons.html + telegram-creative (fallback + live) + Max (bot.js). Deploy + pente fino no ar confirmou 3º home / 4º coupons. KB: [[reference_fundednext_kb_2026_07_06]].

**ESTADO 07/jul NOITE (Markets Monitor sync manual):** A extensão TRAVOU raspando FFF em aba de fundo (reCAPTCHA + dashboard pesado). Fallback aplicado: raspei **manual pelo browser Playwright** com o parser EXATO da extensão + sync dedupado no `finance-sync`. **FFF: 9 vendas/$24,62** (`app.fundedfuturesfamily.com/affiliate/affiliate-orders/?filter=all_time`; a FFF DUPLICA linhas com mesmo transaction_id → dedup por `fff:<txn>`; painel mostra 11/$28,70 contando as dup; resp `leads_saved:9,rows_saved:5,synth_refund_removed:2`). **BlueGuardian: 4 vendas/$4,09** (`trader.blueguardian.com/affiliates` tabela "Referrals income", Amount=comissão, Reference=id, renderiza 2× desktop+mobile→dedup; resp `leads_saved:4,rows_saved:3`). ⚠️ **BG divergência:** "Commissions Generated $3.09" ≠ "Total to payout $4.09", diferença = linha `blueguardian:42473466` $1 (01/jul), possível bônus de lead (não venda) — validar antes de excluir em sync futuro. **PENDÊNCIAS:** (1) Everton recarregar extensão Chrome (auto-fetch aba de fundo v0.4 commitado, hoje foi manual). (2) validar linha $1 BG. Endpoint finance-sync tem Origin gate DESLIGADO (não re-adicionar). Payload `{firm,source,snapshot:null,rows,leads}`, sempre dedupado.

**ESTADO 06-07/jul (RELER `memory/project_sessao_2026_07_06.md`):** Sessão gigante. (a) **Tracking dashboard** (admin) migrado da `events` morta → coupon_clicks/GA4/conversões (4 cards, heatmap fuso BRT fixo, nota metodologia); índice `idx_subscribers_created_at` (slow query real era email_subscribers, não events). (b) **Análise diária religada DE GRAÇA** , estava parada desde 15/jun (modelo `claude-sonnet-4` depreciado + **Anthropic SEM CRÉDITO**). Troquei motor → **Gemini 2.5 Flash free** (`supabase/functions/daily-analysis`, GEMINI_API_KEY secret, JSON mode + thinkingBudget:0). Cron 5AM ET volta sozinho, R$0. (c) **Cards SPECIAL** (novo mecanismo `FIRM_SPECIALS` app.js + `SPECIALS` coupons.html, i18n SP_T 8 idiomas): **Apex 1776 $250K Legacy $17.76** (MARKET, acaba 7/jul) + **Bulenox 25K $9.95** (MARKET25K) no site+/coupons. ⚠️ **Apex paga por LINK aff/go (cookie amember_aff_id), NÃO por cupom** , link no ar = `member/aff/go/evertonmiranda#limited-time` (comissão garantida mas cai no configurador; `#limited-time` plano cai no Legacy mas NÃO paga). `apex-legacy.html` de teste (fetch aff/go bg + redirect; funciona Chrome, iOS/Safari bloqueia cookie 3º). Fix bulletproof = Everton troca redirect URL do aff/go no painel Apex p/ `#limited-time`. (d) **15 MESAS atualizadas verbatim (07/jul)** mantendo TODOS os cupons Markets (Everton: "sem falar nada, mantenha os cupons markets"): TradeDay/Aqua/Blueberry/BlueGuardian/Goat/Alpha/Earn2Trade/CTI/FuturesElite/FundingPips/FTMO/E8/The5ers/TopOne + FFF. Coupon field INTOCADO; só discount+prices+detail_plans. Onde KB incompleto, só o que tinha (Lei #0). **NÃO mexidos:** FundedNext (MARKET dá só 10% quebrado, email Nuhash pronto p/ subir 47%), BrightFunded (KB incompleto). (e) **FFF corrigida** verbatim (Velocity 3 tam, Prime EOD-only, S2F sem desconto) em cms_firms+LP+Max. (f) **Extensão** (Everton PRECISA RECARREGAR): BlueGuardian parser (Amount=comissão, Reference=id, dedup) + throttle FFF/genéricas 6h→30min. (g) **⚠️ FFF Telegram não é real-time** , só sincroniza pela extensão (não tem Markets Monitor), vendas de hoje não chegam sem reload+painel aberto. (h) **Template de atualização de firma** `docs/firm-update-template.txt` + [[reference_template_atualizacao_firma]] (copy-paste pro Claude do navegador). (i) `.env.local` service_role ainda VAZIO. **PENDÊNCIAS Everton:** verificar MARKET no checkout Top One; testar apex-legacy.html no iPhone OU config redirect painel Apex; recarregar extensão; mandar email Nuhash; completar BrightFunded.

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
Mudança de UX de leitura de artigo (botão, CTA, share, voltar, layout do corpo) tem que ir nos TRÊS: (1) `blog.html` `renderPost()`, standalone `/blog/<slug>`; (2) `app.js` `openBlogArticle()`, SPA in-page `/blog?a=<slug>`, fecha com `closeBlogArticle()` que DEVE scrollar pro topo; (3) guias estáticos `/guides/*.html` + `<lang>/guides/*.html` (HTML puro). Detalhe: `memory/feedback_dois_readers_blog.md`. ✅ Guias traduzidos (en/es/fr/de/it/ar) CONSERTADOS 08/jul , 19 arquivos recompletados a partir do master PT (eu traduzi, sem Gemini) + resíduo PT de tabela limpo (do saldo→of balance, Futuros→Futures). Truncados = 0, deployado e verificado no ar.

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
VT=$(grep '^VERCEL_TOKEN=' .env.local | sed 's/^VERCEL_TOKEN=//' | tr -d '" '); CI=1 npx vercel --prod --yes --token="$VT"
```
Validar com curl `?v=$(date +%s)` antes de falar "no ar". **`VERCEL_TOKEN` agora no `.env.local`** (sem expiração, gitignored, desde 24/jun) , **deploy autônomo, NÃO pedir token ao Everton toda hora.** Se der erro de auth, aí sim pedir um novo. DDL no Supabase quando o MCP cai: `POST https://api.supabase.com/v1/projects/qfwhduvutfumsaxnuofa/database/query` com `{"query":"..."}` + token `sbp_`.

**Limite Vercel Hobby = 12 Serverless Functions.** Adicionar nova exige consolidar com existente.

### Deploy de Edge Function Supabase (canônico 2026-06-23)
`supabase/functions/<nome>/` deploya com **CLI byte-exato**, NUNCA via MCP retranscrito:
```
export SUPABASE_ACCESS_TOKEN=<sbp_ do ~/.bashrc>
npx supabase functions deploy <nome> --project-ref qfwhduvutfumsaxnuofa --no-verify-jwt
```
🚨 **`--no-verify-jwt` OBRIGATÓRIO** pra função chamada pelo browser SEM Authorization header (ex: `facebook-capi`, que o `app.js _sendCAPI` chama só com `Content-Type`). O CLI religa `verify_jwt=true` por DEFAULT a cada deploy → quebra com **401 silencioso** (incidente 23/jun: redeploy do facebook-capi derrubou TODO o CAPI do browser, pego só no pente fino e2e com Playwright). Segurança da função é o **Origin gate**, não o JWT.
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

**Onde inserir (atualizado 26/jun , o "FIRMS em index.html" está MORTO, `FIRMS=[]` em app.js é dinâmico do cms_firms):** firma nova vive **só no `cms_firms`**. `CHECKOUT_FIRMS` (app.js) é fallback só das firmas core antigas , NÃO add firma nova lá.

**🚨 FIRMA = COMPLETA E EM TODOS OS LUGARES de 1ª (LEI 26/jun, Everton furioso por subir aos pedaços).** Checklist , seguir INTEIRO antes de "pronto", detalhe em `memory/reference_estrutura_render_firma_cms.md` + `memory/feedback_screenshot_primeiro_e_nao_thrashing.md`:
1. `cms_firms`: card + **detalhe com TODOS os planos** (`detail_types`+`detail_plans`+`checkout_types`+`checkout_plans`, senão preço some no fd-overlay) + `about_html` = **HISTÓRIA padrão Apex** ("Founded in ANO by FUNDADOR in CIDADE...", ~200 chars, pesquisar na WEB não só no site) + about_highlights + detail_includes.
2. **/coupons** (`coupons.html`, dataset próprio): ordem **desconto DECRESCENTE**.
3. **URL limpa** `/<id>`: add em `app.js _firmPageSlugs` E `vercel.json` (regex `/(...)`, `/<lang>/(...)`, `/buy/(...)`, header) , senão 404 + quebra Ctrl+F5.
4. **Telegram** `telegram-creative` SCHEDULE+COUPONS (deploy CLI). 5. **Compare pages** (build + regex vercel). 6. **Push dropdown** (dinâmico já). 7. **Back criativo** `img/<id>-bg.png` **E** `.webp` + FIRM_WORDMARK (criativo-render + admin). 8. **🤖 MAX (bot) `api/bot.js`** , add a firma no `BOT_SYSTEM` com planos/min-days/perks (o Max puxa cupom/desconto do cms_firms ao vivo, MAS os detalhes de plano são hardcoded no prompt , sem isso o bot NÃO conhece a firma). **Incidente 01/jul: FFF estava no site mas faltava no Max, cliente perguntou da Velocity e o bot não sabia. Everton furioso , "firma aos pedaços".** Ideal futuro: Max puxar `prices`/`detail_plans` do cms_firms pra ficar sempre atualizado sozinho.

### Push notifications (canônico 26/jun)
`js/pwa-register.js` lê `window._currentUser` , `app.js` DEVE manter sincronizado (set no login, null no logout) senão TODA inscrição salva `user_id:null` (anônima, não dá pra targetar por conta). Push é por **device/inscrição**, não por sessão (recebe deslogado). Admin tem "Enviar teste pro email" (`api/push` `test_user_email` → resolve via `profiles.email`). ⚠️ iOS web push: server pode estar 100% (Apple aceita, sent>0) e MESMO ASSIM não mostrar , é nível device (app foreground não dá banner, SW velho no PWA, Ajustes iOS).

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
