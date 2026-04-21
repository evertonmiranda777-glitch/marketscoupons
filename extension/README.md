# MarketsCoupons Sync — Extensão Chrome

Extensão que sincroniza dados de afiliado das prop firms (Apex, Bulenox, FTMO, etc.) direto do seu browser pro admin do MarketsCoupons.

## Como funciona

- Você loga **normal** no painel de afiliado da firma (2FA, Google SSO, tudo humano)
- A extensão detecta que você tá logado e baixa/raspa os dados usando sua sessão
- **Cookies nunca saem do seu browser.** Só os dados parseados (CSV/tabela) vão pro Supabase
- Sync automático a cada 6h quando você navega. Ou manual pelo popup da extensão

## Instalar (modo desenvolvedor)

1. Abre `chrome://extensions` no Chrome
2. Liga **Modo desenvolvedor** (canto superior direito)
3. Clica **Carregar sem compactação** e escolhe a pasta `extension/` do repo
4. Pronto. Ícone aparece ao lado da barra

## Uso

1. Clica no ícone da extensão → vê status por firma (última sync)
2. Clica **Sync** de uma firma → abre o painel dela (se fechado) e sincroniza
3. Ou só abra o painel normalmente (ex: visitar `dashboard.apextraderfunding.com/aff/member/stats`) e a extensão sincroniza sozinha em background

## Firmas suportadas

| Firma | URL | Método |
|---|---|---|
| Apex | dashboard.apextraderfunding.com/aff/member/stats | CSV export + fallback tabela |
| Bulenox | dashboard.bulenox.com/aff/member/stats | CSV download + fallback tabela |
| FTMO | trader.ftmo.com/affiliate | scraping Dashboard cards + Leads table |

## Status

Dados sincronizados aparecem no admin em **Financeiro** (marketscoupons.com/admin).

## Segurança

- Não armazenamos senhas, cookies, ou tokens em nenhum lugar
- Cada sync é autenticada com a **sua sessão** do browser
- Edge function `finance-sync` só aceita POST de firmas whitelistadas
- Dados salvos em `affiliate_daily_stats` + `affiliate_conversions` (RLS ligado)
