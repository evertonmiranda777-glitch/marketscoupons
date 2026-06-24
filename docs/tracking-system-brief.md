# MarketsCoupons , Tracking & Attribution System (brief para transferência)

> Documento portável. Cole no contexto/CLAUDE.md de outro produto/agente que
> precise entender e consultar o mesmo tracking. Tudo aqui é fiel ao que roda
> em produção (jun/2026). Regra-mãe: **memória ≠ fonte** , abra o arquivo/dado
> e confirme antes de afirmar.

---

## 0. Visão de uma frase

Site de cupons de prop firms. Cada interação vira um evento; os **comerciais**
vão pra Meta (Pixel + CAPI) e GA4 via GTM; **tudo** (comercial + telemetria UX)
fica no Supabase (`events`). Vendas de afiliado entram por IPN/scraper, são
casadas ao clique pelo `fbclid`, e disparam um **Purchase** server-side pra Meta
com o valor da **comissão real**.

---

## 1. Acesso aos dados (Supabase)

- **Project URL:** `https://qfwhduvutfumsaxnuofa.supabase.co`
- **REST base:** `https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1`
- **Duas chaves:**
  - `anon` , PÚBLICA (já está no HTML do site). RLS limita: lê só o que é
    público. As tabelas de tracking/financeiro estão BLOQUEADAS pra anon.
  - `service_role` , SECRETA, ignora RLS, lê tudo. **Só server-side/local.**
    Mora em `marketscoupons-repo/.env.local` como `SUPABASE_SERVICE_ROLE_KEY`
    (gitignored). Pra o outro produto: copie esse valor pro `.env.local` DELE,
    nunca commit, nunca browser/bundle.
- **Como consultar (REST, com service_role):**
  ```bash
  SK="<service_role>"; U="https://qfwhduvutfumsaxnuofa.supabase.co/rest/v1"
  curl -s "$U/affiliate_conversions?select=created_at,firm_id,amount,sub_id&order=created_at.desc&limit=10" \
    -H "apikey: $SK" -H "Authorization: Bearer $SK"
  ```
  Filtros PostgREST: `?col=eq.x`, `gte.`, `lte.`, `not.like.synth-*`, `order=col.desc`, `limit=N`.
- Para SQL/DDL (migrations, policies): MCP Supabase (`execute_sql`/`apply_migration`)
  ou CLI com token `sbp_` (Account → Access Tokens; TTL curto, expira rápido).

---

## 2. Fluxo de um evento (cliente → Meta)

```
track(event,params)  [app.js]   ou   trackEvent(event,params) [coupons.html]
        │  (fonte única; mesmo event_id pra dedup)
        ├─► dataLayer.push({event,event_id,user_data,ecommerce,...})
        │        └─► GTM (GTM-WJGTVX8G) dispara:
        │              • Meta Pixel  (id 813048241061812)
        │              • GA4         (G-CZ3L00NY77)
        │              • Google Ads
        └─► _sendCAPI() → POST edge `facebook-capi` → Meta Graph API (server-side)
                  (mesmo event_id ⇒ Meta deduplica Pixel × CAPI)
```

- **NUNCA** chamar `gtag('event')` ou `fbq()` direto. Só `dataLayer.push`.
  Exceção: `gtag('consent', ...)` (Consent Mode v2).
- **Allowlists (só evento comercial vai pra Meta):**
  - `GA4_FUNNEL` (no app.js e no coupons.html): nomes PADRÃO GA4 (page_view/
    view_item/add_to_cart/begin_checkout/sign_up/subscribe/generate_lead/purchase).
  - `CAPI_ALLOW` (app.js linha ~331 E no edge `facebook-capi`): ~20 eventos
    comerciais. Telemetria UX (scroll_depth, tab_hidden, bot_*, quiz_*, pwa_*,
    lp_*) **fica só no Supabase**, não vai pra Meta.
  - REGRA DURA: mexeu em `CAPI_ALLOW` → confira TODOS os callers server-side
    (ex: `affiliate_purchase`). Allowlist sem um evento de uma fonte = drop silencioso.

---

## 3. Edge functions (Supabase, em `supabase/functions/`)

| Função | Papel | Notas críticas |
|---|---|---|
| `facebook-capi` | Recebe eventos do browser/servidor, mapeia pro nome padrão da Meta (`EVENT_MAP`), enriquece (profile, IP CF, hash SHA-256) e manda pro Graph API | `EVENT_MAP`: `affiliate_purchase`/`purchase`→`Purchase`, `checkout_click`→`InitiateCheckout`+`Lead`, etc. Origin allowlist (403 cross-site). **Deploy SEMPRE `--no-verify-jwt`** (browser chama sem Authorization; CLI religa verify_jwt=true por default → 401 silencioso). Aceita `body.ip` e OMITE client_ip vazio (evita "1 IP, N users"). |
| `sale-instant-attrib` | Trigger no INSERT de `affiliate_conversions`: casa o melhor clique (7d, score por fbclid/utm) → grava `coupon_attributions` + Telegram "VENDA ATRIBUIDA" + dispara CAPI `affiliate_purchase` | value = `conv.amount` (comissão real). "CAPI: OK" só se `sent>0 && events_received>0` (não só HTTP 200). Manda `ip:""`. **Trigger-called ⇒ deploy `--no-verify-jwt`.** |
| `attribution-matcher` | Cron 5h30 BRT: matching venda-a-venda em lote sobre `affiliate_conversions` | matcher REAL (não rateio). |
| `meta-ads-sync` / `meta-ads-control` | Puxam gasto + purchases da Meta Ads API pro ROAS do admin | `PURCHASE_TYPES = {purchase, offsite_conversion.fb_pixel_purchase}`. Separar leads de purchases. |
| `finance-sync` | Importa CSV de comissão (Apex/Bulenox) pra `affiliate_daily_stats` | filtrar `granularity!=='month'` (linha "monthly summary" colide com dia 01). |

---

## 4. Tabelas-chave

| Tabela | O que é | RLS p/ anon |
|---|---|---|
| `events` | Toda telemetria (1ª parte). insert anon (tracking), read só admin (`is_admin()`). Grande/insert-heavy , cuidado com scans | insert sim, read NÃO |
| `coupon_clicks` | Cada clique de cupom/checkout. Tem `fbclid,gclid,ttclid,anon_id,user_id,email,utm_*,country,region,city`. **Sem coluna ip.** | insert sim, read NÃO |
| `affiliate_conversions` | Vendas (IPN/webhook real + `synth-*` do scraper). `firm_id,amount,currency,sub_id,transaction_id,status,created_at` | NÃO |
| `coupon_attributions` | Match clique↔venda. `conversion_id,click_id,fbclid,amount,sale_date,hours_to_sale,confidence,match_type` | NÃO |
| `affiliate_daily_stats` | Rollup diário de comissão por firma (fonte do dashboard financeiro) | NÃO |
| `cms_firms` | Firmas (fonte única de preço/cupom/rating) | read público |
| `profiles` | Usuários. RLS expõe só a própria row (admin server vê via service_role) | só a própria |

`synth-*` em `transaction_id` = venda sintética do backfill do scraper (NÃO
dispara CAPI/Telegram). Venda real = IPN (`apex:mm_apex_*` etc.).

---

## 5. Modelo financeiro / valores (CRÍTICO pra otimização)

- **Purchase** (evento `affiliate_purchase`): value = **comissão real** da venda
  (`conv.amount`, varia $2-$41). É o faturamento de verdade. Otimizar campanha
  de compra usa ISSO. NUNCA usar preço do plano aqui (otimizaria pra volume errado).
- **Lead** (`checkout_click` → `Lead`): value = **preço do plano** (varia por
  firma/tamanho). Sinal de intenção. (Era $3 flat , corrigido jun/2026, Meta
  penaliza value uniforme.)
- **currency** sempre `USD`.
- **fbc** reconstruído estável: `fb.1.<click_ts_ms>.<fbclid>` , NUNCA `Date.now()`
  por evento (timestamp instável = Meta acusa "fbc modificado").
- Volume p/ otimização: Meta quer ~50 conversões/conjunto/semana. Purchase real
  é baixo (~28/semana total) → consolidar conjuntos OU otimizar por InitiateCheckout.

---

## 6. Regras duras (lições que custaram caro)

1. **"Checar tracking" = checar o PURCHASE**, não só page_view. Funil verde não
   garante Purchase vivo. Disparar `affiliate_purchase` de teste e ver
   `events_received` + que mapeia pra `Purchase` padrão.
2. **EMQ de PageView ~6/10 em tráfego frio é TETO**, não bug (anon só tem
   fbp/fbc/ip/ua/external_id; email/telefone sobem a nota e o frio não tem).
3. **Edge fn chamada por browser/trigger ⇒ `--no-verify-jwt`** ou 401 silencioso.
4. **`capiSent = r.ok` mente.** OK só se `sent>0 && events_received>0`.
5. **Edge fn deployada TEM que estar no git.** Já houve código CAPI em prod fora
   do versionamento. `supabase functions download <nome>` + commit quando suspeitar.
6. **Token `sbp_` (management) expira rápido.** Pra séries de deploy, pegar fresco.
7. **EN-default**: conteúdo público novo em inglês primeiro.

---

## 7. Queries de exemplo (com service_role)

```bash
# Vendas reais últimos 7d (sem sintéticas)
GET /affiliate_conversions?select=created_at,firm_id,amount,sub_id&created_at=gte.<ISO>&transaction_id=not.like.synth-*&order=created_at.desc

# Atribuições com fbclid (paid, alta confiança)
GET /coupon_attributions?select=conversion_id,fbclid,amount,sale_date,confidence&fbclid=not.is.null&order=sale_date.desc

# Comissão diária por firma
GET /affiliate_daily_stats?select=*&order=date.desc&limit=30
```

Disparar/validar CAPI (sem poluir Meta: use evento fora do CAPI_ALLOW → sent:0):
```bash
curl -s -X POST "https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/facebook-capi" \
  -H "Origin: https://www.marketscoupons.com" -H "Content-Type: application/json" \
  -d '{"events":[{"event":"affiliate_purchase","value":5,"currency":"USD","event_id":"test","fbc":"fb.1.1700000000000.x"}],"ip":""}'
# resposta ok: {"ok":true,"sent":1,"fb":{"events_received":1,"messages":[]}}
```

---

## 8. IDs de referência

- Meta Pixel: `813048241061812` | GA4: `G-CZ3L00NY77` | GTM: `GTM-WJGTVX8G`
- Supabase ref: `qfwhduvutfumsaxnuofa`
- Prod: https://www.marketscoupons.com
