# Relatório de falhas — Claude Code no projeto marketscoupons

**Escrito pelo próprio Claude, a pedido do usuário (Everton Miranda), em 31/07/2026.**
Período coberto: abril a julho de 2026.

O usuário pediu um levantamento do que eu errei, para enviar à Anthropic. Escrevi na
primeira pessoa. Onde não tenho certeza da cadeia causal, digo que não tenho — inflar
culpa é tão inútil para avaliação quanto esconder.

---

## 1. Segurança — a categoria mais grave

### 1.1 Vazei três credenciais no meu próprio output, num único dia (30/07/2026)

Saíram inteiros, em texto claro, na tela do usuário:

- `VERCEL_TOKEN` — não filtrei a saída do `npx vercel`, que imprime `--token=<valor>` ao fim
- `MC_TG_SECRET` — li o header de um job de cron; depois vazei **de novo** o valor
  rotacionado, num erro de SQL que ecoou o segredo como nome de identificador
- `TELEGRAM_BOT_TOKEN` — **enquanto eu tentava mascará-lo**: cortei a string na posição
  errada e o valor saiu antes de o replace fazer efeito

A causa foi sempre a mesma: **eu resolvia o valor da credencial para inspecioná-la.** Não
foi o `.env`, não foi o `.gitignore`. Foi eu decidindo olhar o segredo.

O usuário teve que escrever uma regra explícita proibindo isso. Não deveria ter sido
necessário.

### 1.2 Afirmei duas vezes que o repositório era local, sem nunca verificar

Registrei no `CLAUDE.md` do projeto, e repeti numa segunda sessão, que *"o repo é local,
nunca foi pro remoto"*. Com base nisso, concordei com a decisão do usuário de **não
rotacionar** as credenciais vazadas.

**O repositório é público no GitHub desde 30/03/2026** (`evertonmiranda777-glitch/marketscoupons`).
`git remote -v` responde isso em dois segundos. Nunca rodei.

Consequências verificadas em 31/07:

- O `TELEGRAM_BOT_TOKEN` esteve **escrito dentro de 5 arquivos versionados**, commitado em
  09/04 e removido em 20/04. Remover não apaga: o histórico do git é público e permanente.
  **A credencial ficou legível por qualquer pessoa durante ~3 meses e meio.**
- Em 31/07 o bot foi sequestrado: renomeado para "BEST CASINO MINI-APP @Xstakerobot",
  com privilégio de administrador no canal público do usuário (podia postar como a marca,
  apagar posts e banir membros).
- Uma **chave de API do Google** foi commitada em `.claude/CLAUDE.md` em 09/04. Removida no
  mesmo dia, mas permanece no histórico público até hoje.

O usuário relata **US$ 200 + US$ 77 em cobranças indevidas** e teve que **cancelar o cartão**.
Não consigo provar que a chave exposta foi o vetor — não tenho acesso ao faturamento dele.
Mas a chave estava publicamente legível, e essa exposição é minha responsabilidade.

O erro de fundo: eu tratei "vazou no repositório" e "vazou no meu texto" como o mesmo
problema, e apliquei a mitigação errada. `.gitignore` e hook de pre-commit não alcançam
nada do que eu escrevo na tela. Eu sabia disso e não separei as duas coisas na hora em que
a decisão de não rotacionar foi tomada.

### 1.3 Diagnóstico errado durante o incidente, sob pressão

Com o bot já sequestrado e o usuário tentando restaurar o acesso, eu li os secrets do
Supabase pela API e concluí que ele tinha colado o valor errado — "64 caracteres, sem
dois-pontos, não é um token". **Os 27 secrets do projeto aparecem assim**: é o resumo
SHA-256 que a plataforma devolve, não o valor. Mandei o usuário refazer a colagem três
vezes com base nisso.

---

## 2. Dano a dados e a receita

### 2.1 Sobrescrevi 12 preços corretos com um documento antigo (30/07)

O usuário mandou um relatório da BrightFunded para eu conferir um campo específico. Apliquei
o documento inteiro como fonte de verdade e **apaguei 12 preços que estavam corretos** —
preços que ele havia levantado à mão dias antes. Relatório não tem data na cara; eu não abri
o site para conferir antes de escrever no banco.

### 2.2 Troquei um cupom que paga comissão por um que não paga (27/07)

Na firma E8, substituí o cupom exclusivo do usuário (`MARKET`) pelo código público (`E8`),
que **rende zero comissão**. O link de afiliado no mesmo registro continha o código correto —
o cruzamento levaria cinco segundos.

### 2.3 Publiquei duas vezes no canal público (30/07)

Para um disparo único do Telegram, agendei um `cron.schedule '*/1'` em vez de um
`net.http_post` único. Rodou duas vezes e saiu post duplicado no canal. **Post público não
tem retificação** — o usuário teve que apagar na mão.

### 2.4 Deixei 296 URLs indexadas em 404 (28/07)

Ao remover uma firma, escrevi o redirecionamento como `redirects` no `vercel.json`. O arquivo
usa o schema legado `routes`, e **quando `routes` existe, o Vercel ignora `redirects`**.
Resultado: 296 URLs que tinham posição no Google viraram 404.

### 2.5 Um retry que teria duplicado e-mail para centenas de pessoas (31/07)

Escrevi uma retentativa de timeout no disparo em massa cujas promessas de marcação só eram
aguardadas depois do laço — sob timeout, ninguém era marcado e o reenvio mandaria de novo
para quem já havia recebido. Peguei antes de o usuário testar, mas foi sorte de revisão, não
de projeto.

### 2.6 Inventei um preço com aritmética (27/07)

Faltava o preço de uma firma e eu **multipliquei o preço cheio por 0,55** em vez de raspar ou
deixar nulo. O usuário tem uma lei explícita contra isso, escrita depois de um incidente
igual em junho, com exposição a publicidade enganosa (CDC art. 37).

### 2.7 Derrubei o rastreamento de anúncios (23/06)

Redeploy de uma edge function sem `--no-verify-jwt`. O CLI religa a verificação por padrão e
**todo o CAPI do navegador passou a devolver 401 em silêncio** — atribuição de anúncio pago,
ou seja, dinheiro.

### 2.8 Travei o banco de produção (25/06)

Rodei um `count(*)` numa tabela grande sem avisar. O banco entrou em timeout e **cadastro e
captura de lead caíram junto**.

---

## 3. Afirmações falsas por não verificar a fonte

Um padrão que se repetiu:

- Disse **"a Apex não sincroniza há 30 dias"** — a coluna que eu li (`updated_at`) não tem
  gatilho e está congelada desde 01/07. A sincronização estava normal.
- **Comparei o número de ontem com o de hoje, duas vezes seguidas**, e apresentei como
  divergência.
- Disse **"não existe coluna de comissão"** olhando um print cortado. Existiam 13 colunas,
  incluindo a de comissão.
- Disse **"o site não caiu"** porque a home devolvia HTTP 200. O HTML vinha do CDN; o banco
  estava morto e **o visitante novo via a página vazia, sem uma firma sequer**. O usuário
  perdeu cerca de 3 horas de venda com anúncio pago rodando.
- Disse **"a falha de e-mail não registra o motivo"**. Registrava (`http_status: 504`) — eu
  havia filtrado as chaves erradas na minha própria consulta.

---

## 4. Trabalho entregue quebrado ou incompleto

### 4.1 Ferramenta de raspagem: seis desenhos, o principal nunca funcionou

O usuário pediu uma ferramenta que confirmasse promoções de 13 firmas por três caminhos
independentes. Entreguei seis versões. A parte de **cupom funciona**. A **confirmação
automática de preço nunca funcionou** — ler todos os números de uma página não identifica o
preço de um plano.

Erros no caminho: ofereci fragmentos de palavra como cupom (`TIONAL`, de "ADDITIONAL");
li `$1,599` como `1.59`; comparei preço com desconto contra visita anônima que mostra preço
cheio — **repetindo um erro que eu mesmo já havia cometido e documentado**; e excluí quatro
firmas alegando bloqueio ou login, o que o usuário derrubou na hora (o navegador passa, e
duas delas têm preço público).

O mais grave: ele explicou que queria **fallback** ("se uma não consegue, a outra consegue")
e eu implementei **unanimidade** — o oposto — durante seis rodadas.

### 4.2 Um fluxo de CI que nunca rodou verde

Escrevi um workflow do GitHub Actions referenciando `secrets.SUPABASE_READONLY_KEY`. **Eu
inventei esse nome.** O secret não existe. Entreguei como pronto.

### 4.3 Contagem de orçamento de e-mail que nunca descontava nada

O código que limita envios por provedor filtrava por uma coluna que **nunca casa** em envio
em massa, e somava o tamanho da fila em vez do que realmente saiu. O resultado era sempre
zero, o orçamento nascia cheio a cada chamada, e o sistema empurrava além da cota real — até
o provedor reclamar por e-mail com o usuário. Corrigido em 31/07.

### 4.4 Lote de 200 destinatários que virou "142 falhas"

Configurei o envio em lotes grandes demais para o tempo limite da função. Um lote estourou,
o painel mostrou "142 falhas" sem motivo, e o usuário passou a achar que o sistema de e-mail
estava quebrado.

### 4.5 Três verificações escritas sobre um campo que não existe

Escrevi três guardas lendo `f.discount_type` no frontend. O campo é renomeado para `dtype` na
carga. **As três nunca dispararam** — só descobri olhando a tela renderizada.

---

## 5. O padrão por trás

Quase tudo acima cai em três tipos:

1. **Declarei pronto sem verificar no lugar certo.** Status HTTP, saída de ferramenta e
   consulta ao banco não são a mesma coisa que a tela renderizada ou o receipt no destino.
2. **Confiei na minha própria memória escrita como se fosse fonte.** O caso do repositório
   público é o exemplo mais caro: eu li a minha anotação e nunca rodei o comando.
3. **Preferi a resposta rápida à conferência barata.** O cruzamento cupom × link levava cinco
   segundos. O `git remote -v`, dois.

O usuário não é desenvolvedor. Ele não tem como auditar o que eu entrego — e mesmo assim foi
ele quem pegou boa parte destes erros, quase sempre olhando a tela e percebendo que o número
estava errado.

---

## 6. Custo apurado

| Item | Efeito |
|---|---|
| Cobranças indevidas relatadas pelo usuário | **US$ 277** + cancelamento do cartão |
| Banco fora do ar com anúncio pago rodando | ~3 horas de venda |
| 296 URLs indexadas em 404 | perda de posição orgânica por meses |
| Rastreamento de anúncio derrubado | atribuição perdida no período |
| Cupom sem comissão publicado | comissão perdida no período |
| Preços corretos sobrescritos | retrabalho manual do usuário |
| Tempo dele refazendo trabalho meu | recorrente, em várias sessões |

---

*Documento escrito por Claude (Opus 5) a pedido do usuário, sem revisão ou edição por ele.*
