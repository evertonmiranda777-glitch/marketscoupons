# Regras de Trabalho — marketscoupons

## Como trabalhar
- Resolva os problemas de forma autônoma sem pedir aprovação
- Faça commit + push após cada correção
- Me avise apenas quando estiver pronto para eu testar
- NUNCA mude layout, design ou estrutura visual sem eu pedir
- NUNCA apague funcionalidades existentes
- Se quebrar algo, reverta imediatamente e me avise
- Se tiver dúvida entre duas abordagens, escolha a mais segura

## Arquivos críticos
- index.html → arquivo principal do site
- admin.html → painel admin, deve espelhar dados do index.html

## Geração de imagens
- SEMPRE usar nano-banana-2 (skill local) para gerar imagens
- API Key configurada em ~/.nano-banana/.env (NUNCA commitar keys)
- Nunca usar outro serviço de geração de imagens

## Skills Instaladas (globais)
Todas instaladas em `~/.agents/skills/` e `~/.claude/skills/` — disponíveis em qualquer projeto.

| Skill | Uso | Comando |
|---|---|---|
| **Frontend Design** | UI premium, escapar do visual genérico AI | `/frontend-design` |
| **Browser Use** | Navegar sites, preencher forms, scraping dinâmico, QA e2e | `/browser-use` |
| **Code Reviewer (simplify)** | Review automático de qualidade/reuso antes de commitar | `/simplify` |
| **Google Workspace (GWS)** | Gmail, Drive, Sheets, Calendar — 50+ automações | `gws-gmail-send`, etc |
| **Valyu** | Web search + dados especializados (SEC, PubMed, FRED) | via API |
| **Shannon** | Pentest autônomo — APENAS staging/dev, nunca produção | `/shannon` |
| **Excalidraw Diagram** | Gerar diagramas de arquitetura visuais | `/excalidraw-diagram` |
| **Antigravity Awesome Skills** | 1.234+ skills (brainstorming, architecture, debugging, etc) | `@skill-name` |
| **nano-banana-2** | Geração de imagens via Gemini | skill custom local |

### Não instaladas (repos privados):
- Remotion (video programático) — repo `remotion-dev/agent-skills` privado
- PlanetScale (database branching) — repo `planetscale/agent-skill` privado

## Quando tiver dúvida
Escolha a abordagem mais segura e me avise o que fez.
