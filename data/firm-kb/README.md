# Firm Deep KBs (base de conhecimento profunda das prop firms)

Levantamento oficial exaustivo por firma (regras, drawdown, payout, taxas, países, violações, etc.), usado pelo **Max** (chatbot).

## Onde vive o dado (3 camadas, nada se perde)
1. **Banco `cms_firms.kb`** (Supabase) — FONTE VIVA. O `api/bot.js` detecta a firma na pergunta do usuário e injeta esta KB no prompt do Gemini sob demanda. O **frontend NÃO seleciona a coluna `kb`** (zero egress).
2. **Estes arquivos `data/firm-kb/<id>.md`** — backup versionado no git (espelho do banco).
3. **GitHub** (após `git push`) — backup fora da máquina.

## Como adicionar/atualizar uma firma
1. Gravar no banco: `PATCH cms_firms?id=eq.<id>` com `{"kb": "<texto>"}` (service key).
2. Re-espelhar no repo: rodar o fetch que gera estes `.md` a partir do banco.
3. Commit + push.

Max detecta a firma via `FIRM_KB_ALIASES` em `api/bot.js`.
