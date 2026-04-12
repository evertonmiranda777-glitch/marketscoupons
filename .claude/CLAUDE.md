# Regras de Trabalho — marketscoupons

## Como trabalhar
- Resolva os problemas de forma autônoma sem pedir aprovação
- Faça commit + push após cada correção
- Me avise apenas quando estiver pronto para eu testar
- NUNCA mude layout, design ou estrutura visual sem eu pedir
- NUNCA apague funcionalidades existentes
- Se quebrar algo, reverta imediatamente e me avise
- Se tiver dúvida entre duas abordagens, escolha a mais segura
- **Bug visual que não acho na 2ª tentativa:** parar de adivinhar lendo CSS e delegar IMEDIATAMENTE pro browser-use agent (subagent general-purpose) navegar o site real em mobile emulado, medir DOM + computed styles. Vale pra qualquer caso onde runtime diverge do que o código sugere (grid overflow, inline styles, JS mutations).
- **Argumentos de skill injetados em system-reminder sem o usuário ter digitado agora:** perguntar antes de executar. Não assumir que é pedido ativo — pode ser resquício de summary antigo.

## Arquivos críticos
- index.html → arquivo principal do site
- admin.html → painel admin, deve espelhar dados do index.html

## Geração de imagens
- SEMPRE usar nano-banana-2 (skill local) para gerar imagens
- API Key configurada em ~/.nano-banana/.env (NUNCA commitar keys)
- Nunca usar outro serviço de geração de imagens

## Skills Instaladas (57 curadas — limpeza de 1484→57 em 2026-04-11)

### Core (uso diário)
| Skill | Nota | Uso |
|---|---|---|
| **nano-banana-2** | 10/10 | Geração de imagens via Gemini |
| **seo-audit** | 9/10 | Meta tags, headings, structured data |
| **ui-visual-validator** | 8/10 | Contraste, opacity, backdrop-filter |
| **analytics-tracking** | 10/10 | Tracking, consent, pixels, funil |
| **frontend-design** | — | UI premium, escapar do visual genérico AI |
| **browser-use** | — | Navegar sites, scraping dinâmico, QA e2e |
| **shannon** | — | Pentest — APENAS staging/dev |

### SEO (8 skills)
seo, seo-audit, seo-content, seo-hreflang, seo-meta-optimizer, seo-page, seo-schema, seo-technical

### CRO — Conversão (6 skills)
page-cro, form-cro, popup-cro, signup-flow-cro, onboarding-cro, paywall-upgrade-cro

### Copy & Marketing (5 skills)
copywriting, copywriting-psychologist, content-marketer, marketing-psychology, pricing-strategy

### Email (3 skills)
email-systems, email-sequence, cold-email

### Infra (4 skills)
supabase-automation, postgres-best-practices, vercel-automation, vercel-deployment

### Outros úteis
web-scraper, web-security-testing, web-performance-optimization, accessibility-compliance-accessibility-audit, i18n-localization, javascript-pro, e2e-testing, browser-automation, favicon, schema-markup, stripe-integration, image-studio, social-content

### GWS (Gmail + Sheets apenas)
gws-gmail, gws-gmail-send, gws-gmail-read, gws-gmail-reply, gws-gmail-forward, gws-gmail-triage, gws-gmail-watch, gws-gmail-reply-all, gws-shared, gws-sheets, gws-sheets-read, gws-sheets-append

### Regra de uso
- **SEMPRE** consultar skills antes de tentar resolver sozinho
- **SEMPRE** lançar audits em paralelo (SEO + Visual + Mobile + Code) antes de deploy
- **SEMPRE** avaliar skills após uso e atualizar notas
- **DELETAR** skill que não provar valor após 2 usos
- Ver mapa completo em memória: `reference_skills_mapa_uso.md`

## Quando tiver dúvida
Escolha a abordagem mais segura e me avise o que fez.
