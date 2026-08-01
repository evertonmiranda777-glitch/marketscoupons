# Brief — Área do usuário com sistema de pontos

Para o Claude Design. O backend já está pronto e no ar: tabelas, regras e API.
**Não crie tabela, não invente endpoint, não guarde saldo no navegador.** Consuma a API abaixo.

---

## 1. O que construir

Um **dashboard de conta com barra lateral própria**, não uma página solta. Modelo de
referência: a área de usuário do Prop Firm Match.

### Barra lateral

| Item | Conteúdo |
|---|---|
| **Overview** | tela principal (detalhe abaixo) |
| **Meus Pontos** | extrato completo + resgates |
| **Minhas Reviews** | reviews escritas + pendentes |
| **Favoritas** | firmas salvas |
| **Indicar amigo** | link de convite + quem já entrou |
| **Ajuda** | perguntas frequentes + formulário de suporte |
| **Perfil** | dados da conta |

### Overview

1. **"Bem-vindo de volta" + ID de membro** — identificador curto e público (ex. `MC-4F2A`),
   serve para o suporte e dá identidade. Vem do backend.
2. **Cartão de pontos** — saldo grande, tier atual (bronze/prata/ouro), barra de progresso
   até o próximo tier, e botão **Resgatar**.
3. **Tarefas** — lista com pontos de cada uma, marcadas quando concluídas, com botão de ação.
4. **Prêmio** — cartão único de resgate (ver regra 3 abaixo).
5. **Firmas favoritas** — separadas por mercado (Forex / Futures / Crypto), com editar.
6. **Resumo** — cupons copiados nesta conta.

---

## 2. Regras que a interface tem que respeitar

**1. Nunca calcule saldo no navegador.** O saldo é a soma de um extrato no servidor. Mostre
o que a API devolver. Se somar do lado do cliente, a tela vai divergir do banco.

**2. Nunca escreva ponto direto no banco.** A tabela é somente leitura para o navegador —
qualquer tentativa volta erro de permissão. Todo crédito passa por `?action=claim`.

**3. O prêmio NÃO diz tamanho de conta nem nome de firma.** Nada de "conta de 100K" ou
"conta da Apex". O cartão diz **"Trading Account"** e pronto. Firma e tamanho são combinados
na entrega. Isso é ordem do Everton e não é negociável: ele não controla qual firma libera
conta nem quando, e prometer produto específico vira dívida.

**4. Resgate nasce PENDENTE.** Depois de resgatar, mostre "Pedido em análise". Não escreva
"conta liberada" — a entrega é manual.

**5. Tier sobe pelo total já ganho, não pelo saldo.** Resgatar não rebaixa ninguém. A API já
devolve o tier pronto, só exiba.

**6. Erro de crédito duplicado não é falha.** Se `claim` voltar `ja_creditada` (HTTP 409),
mostre a tarefa como concluída. É o sistema funcionando, não bug.

**7. Zero emoji.** Ícones em SVG traçado, padrão Feather, `stroke-width: 2`.

**8. Sem travessão (—) em texto nenhum.**

**9. Tudo em inglês.** O site é americano. Só o admin é em português.

**10. Mobile primeiro.** 88% do tráfego. Testar em 390px, sem rolagem horizontal.

---

## 3. A API

Base: `https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/points`

Exige usuário logado. Mande sempre o token da sessão do Supabase:

```js
const { data: { session } } = await supabase.auth.getSession();
const r = await fetch(BASE + '?action=me', {
  headers: { Authorization: 'Bearer ' + session.access_token }
});
```

### `GET ?action=me` — tudo que a tela precisa, numa chamada

```json
{
  "saldo": 30,
  "ganho_total": 30,
  "tier": "bronze",
  "tarefas": [
    { "key": "complete_profile", "points": 10, "repeatable": false,
      "label_en": "Complete your profile", "label_pt": "Complete seu perfil",
      "url": null, "feita": true }
  ],
  "premios": [
    { "slug": "trading-account", "label": "Trading Account",
      "custo_pontos": 100, "estoque": null, "ativo": true }
  ],
  "resgates": [
    { "id": 1, "reward_slug": "trading-account", "custo_pontos": 100,
      "status": "pendente", "created_at": "2026-08-01T..." }
  ]
}
```

### `POST ?action=claim` — creditar tarefa

```json
{ "task_key": "follow_instagram" }
```

Tarefa repetível (review, indicação) exige também `"ref"` — o id da review ou do indicado.
Sem isso volta `ref_obrigatoria`.

Respostas: `{ "ok": true, "ganhou": 10, "saldo": 40, "tier": "bronze" }` ·
`409 ja_creditada` · `400 tarefa_invalida`

### `POST ?action=redeem` — resgatar

```json
{ "reward_slug": "trading-account" }
```

Respostas: `{ "ok": true, "resgate_id": 3, "saldo_novo": 0 }` ·
`{ "ok": false, "erro": "saldo_insuficiente", "saldo": 60, "custo": 100 }` ·
`sem_estoque` · `premio_inativo`

### `GET ?action=extrato` — últimos 100 lançamentos

```json
{ "extrato": [ { "delta": 10, "task_key": "join_telegram", "motivo": "task",
                 "nota": null, "created_at": "..." } ] }
```

---

## 4. Tarefas e valores atuais

| Chave | Pontos | Repete |
|---|---|---|
| `complete_profile` | 10 | não |
| `follow_instagram` | 10 | não |
| `join_telegram` | 10 | não |
| `marketing_optin` | 10 | não |
| `write_review` | 20 | sim |
| `refer_friend` | 25 | sim |

Resgate: **Trading Account — 100 pontos**.

Os valores saem do banco na chamada `me`. **Não escreva nenhum desses números na tela à mão**
— se o Everton mudar o valor, a tela muda sozinha.

---

## 5. Ainda não existe no backend

Peça ao Everton antes de desenhar em cima:

- **ID de membro** — precisa ser criado
- **Programa de afiliados** — não existe
- **Sorteio semanal com raspadinha** — o sorteio atual é por bilhete, sem raspadinha
- **Analytics do trader** (ROI, taxa de aprovação, challenges) — exigiria o usuário cadastrar
  cada challenge à mão; é um produto inteiro, não uma tela
- **Formulário de suporte** — não há tabela de chamados

Desenhe o que existe. O resto entra depois, ligado de verdade.
