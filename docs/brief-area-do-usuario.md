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

## 5. No admin: tela de resgates (faz parte da entrega)

Sem esta tela o sistema não fecha. O usuário pede a conta e o Everton recebe o pedido sem
ter onde clicar. Entra como módulo novo do admin, ao lado de "Usuários e leads".

### Lista de pedidos

Colunas: **usuário** (nome, e-mail, ID de membro) · **prêmio** · **pontos gastos** ·
**situação** · **data do pedido**.

Filtro por situação, com **Pendente** aberto por padrão — é o que exige ação.

### Situações, nesta ordem

| Situação | O que significa | Ação disponível |
|---|---|---|
| **Pendente** | acabou de pedir, ninguém olhou | Aprovar · Recusar |
| **Aprovado** | Everton confirmou com a firma, ainda não entregou | Marcar como entregue |
| **Entregue** | conta na mão do usuário | nenhuma, é final |
| **Recusado** | não deu, pontos devolvidos | nenhuma, é final |

### Regras duras

**1. Recusar exige motivo escrito.** Campo obrigatório. O motivo aparece pro usuário — pessoa
que juntou 100 pontos e levou "não" sem explicação não volta.

**2. Recusar devolve os pontos sozinho.** Já é automático no banco, junto com o estoque.
A tela **não** deve somar nem devolver ponto por conta própria: só chama a ação e relê o
saldo. Se a tela mexer no saldo, vai divergir do extrato.

**3. Entregue e Recusado não voltam atrás.** Sem botão de desfazer. Se errou, o Everton
lança um ajuste manual no extrato, que fica registrado com autor e motivo.

**4. Aviso de pendente à espera.** Contador no menu, como o "2" que já aparece em Firmas.
Pedido parado é cliente esperando.

**5. Nunca mostrar tamanho de conta nem firma no pedido.** Nem no admin. Isso é combinado
na entrega, e o campo não existe na tabela (ver regra 3 da seção 2).

### API do admin

Mesma base. O admin **não escreve na tabela** — passa pela mesma porta do usuário. A
permissão é conferida no banco (`profiles.is_admin`), não pela lista de e-mails do
`admin.html`, que é só aparência e vive no navegador.

```
GET  ?action=admin_resgates              → { pendentes, resgates[] }
GET  ?action=admin_resgates&status=pendente
POST ?action=admin_situacao   { id, status: "aprovado"|"entregue"|"recusado", nota }
POST ?action=admin_ajuste     { user_id, delta, nota }
```

Cada resgate já vem com `usuario: { email, full_name }` — não precisa buscar à parte.

`admin_situacao` com `"recusado"` **exige** `nota` e devolve pontos e estoque sozinho.
Tentar mudar algo já entregue ou recusado volta `409 situacao_final`.

`admin_ajuste` é a correção manual: `delta` positivo ou negativo, `nota` obrigatória. Fica
no extrato registrando quem fez.

Se a chamada voltar `403 nao_autorizado`, a conta não é admin no banco — não é bug de tela.

---

## 6. Os valores são do Everton, não seus

A economia hoje:

- as 4 tarefas de uma vez só somam **40 pontos**
- review vale **20**, indicação vale **25**, e as duas repetem
- a conta custa **100 pontos**

Ou seja: **ninguém resgata só marcando as tarefas fáceis.** Precisa escrever review ou
trazer amigo, que é o que dá trabalho e é o que vale pro negócio. Foi de propósito.

Mas os números são calibráveis e o Everton pode mudar a qualquer momento, sem publicar nada
— é uma linha no banco. **Por isso nenhum número desses pode estar escrito na tela.** Puxe
sempre da chamada `me`, inclusive o custo do resgate e a barra de progresso do tier.

---

## 7. Ainda não existe no backend

Peça ao Everton antes de desenhar em cima:

- **ID de membro** — precisa ser criado
- **Programa de afiliados** — não existe
- **Sorteio semanal com raspadinha** — o sorteio atual é por bilhete, sem raspadinha
- **Analytics do trader** (ROI, taxa de aprovação, challenges) — exigiria o usuário cadastrar
  cada challenge à mão; é um produto inteiro, não uma tela
- **Formulário de suporte** — não há tabela de chamados

Desenhe o que existe. O resto entra depois, ligado de verdade.
