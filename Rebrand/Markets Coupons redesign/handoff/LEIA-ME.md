# Markets Coupons, rebranding · pacote de handoff

Três arquivos HTML **standalone**. Abrem em qualquer navegador com duplo clique, sem servidor, sem build, sem internet. Tudo (fontes, imagens, runtime) está embutido.

| Arquivo | O que é |
|---|---|
| `site-markets-coupons.html` | Site completo, 15 páginas, desktop + mobile |
| `lp-markets-coupons.html` | Landing page de tráfego pago |
| `admin-markets-coupons.html` | Admin, 19 módulos |

---

## Leia isto antes de ligar qualquer coisa

Estes arquivos são **referência visual**, não código de produção.

Todo dado está escrito à mão dentro do arquivo: as 19 firmas, preços, cupons, eventos do calendário, posts do blog, métricas do admin. **Nada vem do Supabase.** Login não autentica, checkout não cobra, widgets do TradingView são placeholders.

O caminho é reconstruir no stack de vocês (Next.js + Supabase) usando estes arquivos como especificação de layout, e plugar os dados reais.

---

## Identidade

| Item | Valor |
|---|---|
| Acento | `#bfff00` (lime) |
| Fundo | `#070a06` |
| Superfície de card | `linear-gradient(180deg, #0f1409, #0b0f0c)` |
| Borda | `rgba(255,255,255,0.07)` |
| Texto principal | `#F4F8F9` |
| Texto secundário | `#8a94a0` |
| Positivo | `#34d399` · Atenção `#fbbf24` · Negativo `#f87171` |
| Fonte | Inter, 400 a 900 |
| Ícones | SVG stroke, estilo Feather, `stroke-width: 2` |
| Mascote | Raposa lime (`assets/fox-lime.png`), chat "Max" |

Sem emoji em nenhuma interface. Sem travessão (em dash) em nenhum texto.

### Trocar os ícones do PWA

O `manifest.json` ainda aponta para o "M" dourado antigo. Enquanto não trocar, **toda notificação push chega com a logo antiga**, mesmo com o site já rebrandeado. Atualizar:

- `manifest.json` · ícones de 192px e 512px
- `apple-touch-icon`
- favicon

Fonte: `assets/fox-lime.png`.

---

## Site · estrutura da home

A home é uma página longa. Ordem das seções:

1. Hero (raposa + busca)
2. Best Deals (grid de firmas)
3. App & Coupon Alerts (mockup de iPhone com notificação)
4. Economic Calendar (impacto em estrelas)
5. Heatmap & GEX
6. Daily Analysis
7. Compare & Quiz
8. Live & Indicators
9. Platforms
10. Free Tools
11. Guides & Education
12. 2026 Awards
13. FAQ (acordeão)
14. Rodapé

No mobile, as seções em que o card vem primeiro no HTML (Heatmap, Daily Analysis, Compare) invertem a ordem: texto em cima, card embaixo.

## Site · onde cada tela busca dado

| Rota | Consome |
|---|---|
| `/` (Specials) | `firms` · cards, cupom, desconto, rating |
| `/firms` | `firms` · catálogo com filtros e ordenação |
| `/{slug}` (ex. `/apex`) | `firms` + `cms_firms.prices` + `cms_firms.detail_plans` |
| `/compare` | `firms` · até 3 firmas lado a lado |
| `/platforms` | catálogo de plataformas |
| `/indicators` | `cms_indicators` |
| `/economic-calendar` | eventos + impacto |
| `/heatmap` | **widget TradingView** (placeholder no protótipo) |
| `/daily-analysis` | análise diária · **gate de login** |
| `/gamma` | níveis GEX · **gate de login** |
| `/guides` · `/blog` | CMS de conteúdo |
| `/position-size` | calculadora · **gate de login** |
| `/quiz` | quiz de recomendação |
| `/awards` | ranking e categorias |
| `/app` | instalação PWA e notificações |

### Regras que a interface já respeita, e o backend precisa manter

1. **Cupom nunca é normalizado.** `MARKET`, `MARKETS` e `MARKET89` são valores diferentes. Não faça uppercase, trim automático ou autocomplete.
2. **Firma sem cupom é estado válido e final.** `coupon_code NULL` significa "o desconto vem no próprio link" (caso da FTMO), e a interface mostra "Link Discount". Não confundir com pendente de revisão.
3. **Preço só aparece quando existe.** Combinação de plano sem preço conhecido mostra "Unavailable". Nunca interpole, estime ou invente valor.
4. **Oferta lifetime não tem contador.** Se `discount_type = lifetime`, nenhum prazo é exibido.
5. **Página estática não lê o banco em runtime.** Depois de mudar dado de firma, as ~3.000 páginas precisam ser regeradas.

---

## Admin · 19 módulos

**Visão geral** — Dashboard (cliques, cupons copiados, conversões, taxa, cadastros, receita estimada, funil, alertas)

**Operação** — Firmas · Saúde das firmas · Verificador diário · Preços e planos

**Conteúdo** — Criativos · Blog e Guias · Calendário · Daily Analysis · Awards · Indicadores

**Crescimento** — Analytics · E-mail · Telegram · Reviews · Usuários e leads · Financeiro

**Site** — Banners e avisos · Config e I18N

### Pontos de integração do admin

| Módulo | Liga em |
|---|---|
| Firmas | `firms` · CRUD, histórico, pausar firma (substitui `scripts/kill-firm.mjs`) |
| Preços e planos | `cms_firms.prices` e `cms_firms.detail_plans` · o campo `kb` **nunca** vai ao frontend |
| Verificador | `check_links.py` e `check_pages.py` · GitHub Actions 08:00 BRT |
| E-mail | Brevo via `/api/send-email` · fila passa por `/api/validate-mx` |
| Telegram | canal `@marketcouponss` · prévia obrigatória antes de enviar |
| Reviews | `firm_reviews` · moderação |
| Usuários | `profiles` + Supabase Auth · exclusão via `/api/delete-user` |
| Analytics | GA4 + `coupon_clicks` · escrita em `events` está desligada por kill-switch |
| Financeiro | `ad_spend_daily` · Meta Ads |
| Config | `firm_translations` · 8 idiomas |

### Duas regras críticas do financeiro

**Gross-up do Meta.** O custo declarado no painel do Meta não é o custo real. Sobre a fatura incidem **13,83%** (COFINS 7,60% + PIS 1,65% + ISS 2,90%), e é esse valor que entra em ROAS e lucro.

**Normalizar nome de campanha na leitura.** O Instagram anexa `_seeall` ao nome, o que separa a venda da campanha e joga receita fora do ROAS. Normalize na leitura, o banco mantém o sufixo original:

```js
function normCampanha(nome) {
  const sufixos = /_(seeall|see_all|profile|bio|linkinbio)$/i;
  let n = String(nome || '').trim();
  if (!n) return '';
  let antes;
  do { antes = n; n = n.replace(sufixos, ''); } while (n !== antes);
  return n;
}
```

---

## Idiomas

Português, English, Español, Italiano, Français, Deutsch, العربية, Bahasa Indonesia.

O seletor no header já funciona no protótipo, mas só troca o rótulo. A tradução real vem de `firm_translations` e do i18n, e a tabela sobrescreve o arquivo da raiz.

---

## Mobile

88% do tráfego. Todas as páginas foram ajustadas em 390px:

- Menu sanduíche com Sign In / Create Account no topo, navegação agrupada e assinatura da marca no fim
- Tabelas viram cards, grids colapsam para coluna única
- Rodapé em coluna única
- Área de toque mínima de 44px
- Chat do Max em 64px, some ao chegar no rodapé

---

## Limite de infraestrutura

Vercel Hobby permite **12 Serverless Functions**. Seis já estão em uso. Consolidar antes de criar novas.
