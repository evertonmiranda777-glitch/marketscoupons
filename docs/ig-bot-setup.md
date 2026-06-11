# Bot DM Instagram — Setup Meta

Backend pronto. Pra ativar precisa configurar 3 coisas no Meta:

## 1. Meta App + Permissões

Em https://developers.facebook.com/apps:

1. **Create App** → tipo "Business" → nome "Markets Coupons Bot"
2. Em **Use cases**, adicionar: **Instagram messaging**
3. Em **App Settings → Basic**: pegar **App ID** e **App Secret** (anota)
4. Em **App Roles**: confirma que sua conta IG `@marketscoupons` tá conectada como tester

**Permissões necessárias** (App Review pode pedir aprovação pra produção):
- `instagram_basic`
- `instagram_manage_comments`
- `instagram_manage_messages`
- `pages_manage_metadata`
- `pages_read_engagement`
- `pages_show_list`

Em modo **Development** funciona sem App Review — só pra contas IG conectadas como tester/admin do App. Pra abrir pro público depois precisa submit.

## 2. Token de acesso da página

Em https://developers.facebook.com/tools/explorer:

1. Selecionar o App criado
2. **Get User Access Token** → marcar permissões acima
3. Login + autorizar
4. Trocar pelo **Page Access Token** (Token nunca-expira) via:
   - GET `https://graph.facebook.com/v21.0/me/accounts?access_token={USER_TOKEN}`
   - Pega `access_token` da página `@marketscoupons` no JSON
5. Esse token é o **`META_PAGE_ACCESS_TOKEN`** (não expira se conta IG ficar conectada)

## 3. Webhook subscription

Em **Dashboard do App → Webhooks**:

1. Add Product → **Webhooks**
2. **Callback URL**: `https://www.marketscoupons.com/api/bot?action=ig_webhook`
3. **Verify Token**: gerar string random (ex: `mc_bot_2026_xyz`) — esse é `META_VERIFY_TOKEN`
4. **Subscribe to fields**: marcar `comments`
5. Test → deve receber 200 OK na verificação

## 4. Env vars no Vercel

Em https://vercel.com/evertonmiranda777-glitchs-projects/marketscoupons → Settings → Environment Variables:

```
META_VERIFY_TOKEN=mc_bot_2026_xyz (mesmo do step 3)
META_PAGE_ACCESS_TOKEN=EAAxxx... (do step 2)
TG_ADMIN_CHAT_ID=<seu chat id Telegram pra alertas, opcional>
```

Após adicionar: **Redeploy** pra aplicar.

## 5. Testar

1. Posta o carrossel VolumeFilter no IG
2. Pede pra alguém comentar **"VOLUME"** (ou comenta de outra conta de teste)
3. Em até 5s deve receber DM com link
4. Checa log em Supabase: `SELECT * FROM ig_dm_log ORDER BY sent_at DESC LIMIT 10`

## 6. Safeguards embutidos

- ✅ Rate limit: **1 DM por user a cada 24h** (não spam o mesmo user)
- ✅ Opt-out: user comenta "STOP" → registrado em `ig_opt_outs`, nunca mais recebe
- ✅ Templates rotativos (3 versões pra "VOLUME") — escolhido random pra não criar pattern
- ✅ Disclaimer "Reply STOP to opt out" em toda DM
- ✅ Log completo de toda tentativa em `ig_dm_log`
- ✅ Alerta Telegram se Meta retornar erro 4xx/5xx
- ✅ Kill switch: `UPDATE ig_auto_replies SET enabled=false WHERE keyword='VOLUME'`

## 7. Adicionar nova keyword

```sql
INSERT INTO ig_auto_replies (keyword, reply_templates, reply_link, notes)
VALUES (
  'CUPOM',
  jsonb_build_array(
    'Template 1 com {link}',
    'Template 2 com {link}',
    'Template 3 com {link}'
  ),
  'https://www.marketscoupons.com/coupons',
  'Auto-reply pra perguntas sobre cupom'
);
```

## 8. Limite Meta (importante)

- **App em Development**: só responde DM em contas IG conectadas como tester no App
- **App em Production** (após App Review): responde qualquer um
- **24h window**: Private Reply só funciona em comments até 24h após o post. Posts antigos = sem DM automático
- **Volume**: Meta tem rate limit ~200 calls/hora por App. Bot embutido respeita

## 9. Em caso de bloqueio Meta

Se Meta bloquear ou suspender:
1. Olhar email do business
2. Em `https://business.facebook.com/settings/accountquality/`
3. Apelar se aplicável
4. Mitigação: reduzir frequência, variar mais templates, opt-out claro
