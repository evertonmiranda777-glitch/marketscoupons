# Inventário do admin atual — página por página

> Complemento do [brief-admin-novo.md](brief-admin-novo.md). Aquele diz **o que construir**;
> este diz **o que cada página faz hoje**, pra nada sumir na troca.
>
> Extraído do `admin.html` (~16.400 linhas) em 28/07/2026: 37 containers de página,
> com os botões e handlers reais de cada um. Não é descrição de memória.

---

## Como o admin funciona por baixo

- **SPA monolítico** num arquivo só. Roteador `adminGo(p)` / `renderPage(p)`, aba ativa
  guardada em `localStorage.mc_admin_tab`. **URL fica limpa, sem `#`** (o dono não quer hash).
- **ZERO view/RPC no SQL.** Toda agregação é JavaScript no browser sobre arrays. Daí os
  limites: 500 leads, 2.000 events, 20.000 coupon_clicks por consulta.
- Auth: Supabase com storageKey **`mc-admin-auth`** (separado do site, que usa `mc-user-auth`).
- Gate no cliente é só UX; segurança real é `profiles.is_admin` validado no servidor.

---

## 1. Dashboard (`overview`)
Visão geral + `renderAlerts()` (alertas de coisa fora do lugar).

## 2. Analytics

**2.1 Tracking** — a página mais pesada de dados (254 linhas de markup).
Funil, calendário navegável (`◀ ▶`), heatmap por hora em **fuso BRT fixo**, GA4.
Ações: `renderTrackingPage`, `fetchGA4Geo`, `openAdSpendModal` (**+ Registrar Gasto**),
`exportAdSpendCSV`, `_trkCalNav`.
Tabelas: `coupon_clicks`, `events`, `affiliate_conversions`, `affiliate_daily_stats`.
⚠️ A tabela `events` está com **escrita desligada** (kill-switch por causa de 522). Analytics = GA4.

**2.2 Eventos** — lista crua de `events` (legado).
**2.3 Geo** — ranking geográfico de venda.

## 3. Usuários
**3.1 Leads** — base de e-mail, filtros, exportação.
**3.2 Cadastros** — `profiles`.
⚠️ `profiles` tem RLS que só expõe a própria linha. Pra ver todos, usar
`/api/brevo-stats?type=signups_all` (service_role + guard `isAdminJwt`).

## 4. E-mail (492 linhas — a maior página do admin)
Fluxo completo de e-mail, em etapas numeradas:
1. **Importar Leads** (`importLeadsAsSubscribers`, `importDirectToSubscribers`, `addSubscriberManual`)
2. **Validar Lista** → `Verificar MX` (`/api/validate-mx`)
3. **Importar → Inscritos** / `Importar apenas validados` / `Exportar CSV limpo`
4. **Envio**: `Quantos receberiam? (dry-run)` · `Enviar teste pro email (o meu)` ·
   `Enviar pra todos elegíveis` · `Enviar agora` · `forceCronSend`
5. **Monitoramento**: `loadEmailStats`, `loadEmailToday`, `loadEmailHealth`,
   `loadCampaignsProgress`, `renderCampaignLog`, `Ver histórico`, contas SMTP (`renderSmtpAccounts`)
6. **Templates**: `renderTemplatesList`, `loadQuickTemplate`, `insertVar` (variáveis no corpo)
7. Chips de firma (`renderEmailFirmaChips`), audiência por firma (`populateAudienceFirms`),
   contador de destinatários (`updateDestCount`), auto-refresh de status a cada 30s
Endpoint: `/api/send-email`. Provedores: Brevo (principal) e Resend.

⚠️ Os templates institucionais vivem em **DOIS lugares**: `admin.html` (envio manual) e
`lib/email-render.js` (cron). **Mexeu num, mexe no outro** ou o cron manda coisa diferente.
⚠️ Cupom nos templates vem por token **`{{CUP:slug}}`** resolvido da tabela `firms`.

## 5. Monetização / Financeiro / Impostos
**Financeiro** — `Sync Meta Ads` (`syncMetaAds`), `Rodar Matcher` (`runAttributionMatcher`),
`Enviar CSV` (`finUploadCsv`), ROAS, ranking de criativo por `utm_term`.
Tabelas: `ad_spend_daily`, `affiliate_conversions`, `affiliate_daily_stats`, `affiliate_keyword_stats`.

**Impostos** — gross-up do imposto brasileiro sobre Meta Ads: **+13,83%**
(COFINS 7,60% + PIS 1,65% + ISS 2,90%, por dentro). `ad_spend_daily` guarda o valor CRU;
o multiplicador `1.1383` é aplicado na exibição.

## 6. Firmas (`cms-firms`)
`+ Nova Firma Manual` (`openFirmModal`), **`Adicionar via IA`** (`toggleAiFirmPanel` →
`generateFirmFromUrl` → `saveAiGeneratedFirm`: gera a firma a partir da URL do site dela),
`Exportar JSON` (`exportCmsJson`), `Salvar firma`.
Tabela: `cms_firms` (65 colunas).
⚠️ **NÃO existe tela pra tabela `firms`** (cupom/URL/tracking de afiliado). É o buraco nº 1.

## 7. Indicadores (`cms-indicators`)
CRUD dos indicadores (VolumeFilter etc.).

## 8. Conteúdo
**Blog** — CRUD de `blog_posts`. ⚠️ `cover_url` **precisa** estar no SELECT do front,
senão os cards caem em SVG de fallback.
**Guias** — `cms_guides`. **FAQ** — `cms_faq`.

## 9. Telegram (118 linhas, 14 botões)
Cada ação tem **preview antes de enviar** (`tgPreview*` → `tgConfirmAction`):
`Cupons` · `GEX` · `Calendário` · `Flash Promo` (`tgFlashPromoOpen`, `tgPreviewFlashPromo`) ·
`Análise` · **`Limpar Canal`** (remove mensagens antigas) · `Enviar para o canal` ·
`tgDownloadPng`, `tgShowStaticPng`.
⚠️ Promo **`lifetime` não pode ter contador** — deadline em oferta vitalícia é inventado.

## 10. Criativos (232 linhas, 15 ações)
**10.1 Firma única**: formato `Feed 1080×1350` / `Story 1080×1920` (`setCrFormat`),
idioma PT/EN (`setCrLang`), seletor de firma, checkboxes **INFORMAÇÕES VISÍVEIS**
(desconto, cupom, trustpilot, preços), **`Baixar PNG`** (`exportCreative`).
**10.2 Copy pro Instagram**: idioma PT/EN/ES (`setCrCopyLang`), template
Institucional/Promocional (`setCrCopyTmpl`), `Gerar copy` (`generateFirmCopy` →
`/api/gen-firm-copy`), `Copiar` (`copyFirmCopyToClipboard`).
**10.3 Top 3 Cupons**: `bsGeneratePng`, `bsGenerateAllLangs` (**zip com 8 idiomas**),
`bsCopyCaption`, `bsCopyUrl`.
**10.4 Automação Instagram**: `+ Nova automação` (`igNewAutomation`, `igSaveAutomation`),
`Rodar agora` (`runIgBot`).

⚠️ **O `Baixar PNG` faz `canvas.outerHTML`** — o PNG é foto exata do preview.
Se o preview está errado, o PNG sai errado. Não é problema cosmético.
⚠️ O renderizador (`renderHeroPremium`) e os mapas `CR_NOFEE`, `CR_NOFEE_PLAN`,
`FIRM_WORDMARK` estão **duplicados** com `criativo-render.html`. Isso causou 4 bugs
em um único dia. **No admin novo: fonte única.**
⚠️ A copy é gerada na hora, sem cache; o cupom vem da tabela `firms`.
O rodapé é fixo e anexado **no servidor**: `.` `.` `.` `#daytrading #trader #tradingtips`.

## 11. Reviews
Moderação de `firm_reviews`.

## 12. Site — 15 sub-abas
`Home/Hero` · `Navegação` · `Ofertas` · `Firmas` · `Plataformas` · `Indicadores` ·
`Calendário` · `Análise` · `Gamma` · `Calculadora` · `Quiz` · `Live Room` ·
`Fidelidade` · `Footer` · `Cores/Tema` · `Logo`.
Quase todas usam o mesmo `loadSiteSection` genérico sobre `site_settings`.
`site-tema` é a maior (129 linhas: paleta, cores, gradientes).

⚠️ **Esta seção edita blocos do layout ANTIGO.** Conferir contra a LP nova antes de
replicar — provavelmente boa parte morre junto.

## 13. Config
**Textos** (`cms_texts`) · **I18N** (`i18n-editor`, 8 idiomas) ·
**Traduções de Firmas** (`firmt-editor` → `firm_translations`).
⚠️ O arquivo vivo de i18n é `i18n-<lang>.js` **na raiz**; a pasta `i18n/` é loader morto.
A tabela `i18n` do Supabase **sobrescreve** o arquivo.

---

## Endpoints `/api` usados (limite Hobby: 12 functions)
`/api/brevo-stats` · `/api/delete-user` · `/api/gen-firm-copy` ·
`/api/render-criativo` · `/api/send-email` · `/api/validate-mx`

## Tabelas tocadas (27)
`ad_spend`, `ad_spend_daily`, `affiliate_conversions`, `affiliate_daily_stats`,
`affiliate_keyword_stats`, `blog_posts`, `cms_faq`, `cms_firms`, `cms_guides`,
`cms_texts`, `coupon_attributions`, `coupon_clicks`, `daily_analysis`, `email_logs`,
`email_subscribers`, `email_templates`, `events`, `firm_reviews`, `firm_translations`,
`firms`, `gex_levels`, `loyalty_members`, `loyalty_proofs`, `profiles`,
`push_subscriptions`, `site_settings`, `subscriptions`
