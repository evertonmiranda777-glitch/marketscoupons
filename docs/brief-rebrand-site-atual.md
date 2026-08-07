# Brief — Rebrand do Markets Coupons (em cima do site que já roda)

**Objetivo:** trocar a aparência do site, mantendo intacto tudo que o faz funcionar.
Este NÃO é um site novo. É o site de produção, que hoje atende visitante real e
gera venda por link de afiliado.

---

## O que você recebe

| arquivo | o que é |
|---|---|
| `index.html` (383 KB) | **Todo o CSS do site está inline aqui.** É o tema completo: cores, fontes, espaçamentos, componentes, responsivo. Também é a casca da página (head, nav, seções). |
| `app.js` (635 KB) | Onde a tela é montada em JavaScript: card de firma, overlay de detalhe, análise diária, GEX, awards, blog. **E é onde o site lê o banco de dados.** |
| `js/site-header.js` · `js/site-footer.js` | Cabeçalho e rodapé. |

Não existe arquivo `.css` separado. Não existe framework, bundler nem build step.
É HTML + CSS + JavaScript puro, servido direto.

---

## ✅ O QUE VOCÊ PODE MEXER

- **Todo o CSS dentro do `<style>` do `index.html`** — paleta, tipografia,
  espaçamento, sombras, bordas, animação, grid, responsivo. À vontade.
- **A marcação das seções do `index.html`** — layout, ordem dos blocos, hero,
  nav, rodapé.
- **As classes CSS usadas nos template strings do `app.js`** — você pode
  redesenhar o card de firma, o overlay, os selos. Veja a regra abaixo.
- **`js/site-header.js` e `js/site-footer.js`** — visual do topo e do rodapé.

## 🚫 O QUE VOCÊ NÃO PODE ENCOSTAR

1. **Qualquer chamada ao Supabase** (`supabase.createClient`, `.from(...)`,
   `.select(...)`). É de onde vêm as firmas, os preços e os cupons.
2. **Qualquer `${...}` dentro dos template strings do `app.js`.**
   Você pode mudar a `<div class="...">` em volta. **Não pode mudar, remover ou
   renomear o que está dentro do `${}`** — isso é o dado real.
   ```js
   // PODE virar outra classe / outra tag:
   `<div class="firm-card">`
   // NÃO PODE mudar:
   `${f.name}` `${f.coupon}` `${f.discount}` `${t('chave')}` `${tf(...)}`
   ```
3. **Os `id=` usados pelo JavaScript** (ex: `plat-grid`, `ps-bal`, `ps-risk`,
   `ps-ent`, `ps-sl`, `ps-instr`, `cal-tz`, `auth-signup-email`). Se o `id` mudar,
   a funcionalidade morre calada — a página abre e simplesmente não faz nada.
4. **Os atributos `data-i18n`.** São eles que traduzem o site nos 8 idiomas.
5. **`track(...)`, `dataLayer.push(...)`, `_sendCAPI(...)`.** É a medição de
   anúncio pago. Sem isso não dá pra saber o que vende.
6. **As URLs e as rotas.** O site tem ~3.000 páginas indexadas no Google.
   URL que muda vira 404 e perde posição por meses.

---

## Regras duras do produto (jurídico, não é preferência)

1. **NUNCA escrever preço, desconto, % ou cupom de firma no código.**
   Tudo isso vem do banco em tempo real. Número chumbado no arquivo fica velho
   e vira publicidade enganosa (CDC art. 37 — multa de Procon vai a milhões).
   Se precisar de valor pra desenhar, use *placeholder* óbvio (`XX%`, `$XXX`)
   e avise no comentário.
2. **Vocabulário proibido em qualquer texto visível:** "sinais", "entrada",
   "stop loss", "take profit", "lucro garantido", "trader profissional",
   "operação ao vivo", "copy trade", "we trade for you", "fique rico",
   "renda garantida". O Live Room é **"conteúdo exclusivo VIP"**, nunca "sinais".
3. **Zero emoji em interface.** Ícone é SVG inline no padrão Feather:
   `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
   stroke-linecap="round" stroke-linejoin="round"`.
4. **Proibido " — " (em-dash com espaços)** em texto público. Usar vírgula ou ponto.
   En-dash em faixa (`$25K–$150K`) é permitido.
5. **O site é americano: todo texto novo nasce em INGLÊS.**
6. **Termos que não se traduzem:** Prop Firm, Profit Split, Drawdown, Lifetime.

---

## Compatibilidade — isto quebra o site de verdade

O público é **Android antigo e navegador embutido do Instagram (Índia = 75% do
tráfego)**, com motor congelado antes de 2020.

- **Não usar `?.` nem `??`** em arquivo servido. **Uma única ocorrência aborta o
  `app.js` inteiro e a página fica BRANCA** nesses aparelhos — e o anúncio pago
  cai no vazio. (Existe um passo de build que rebaixa a sintaxe, mas não conte
  com ele: escreva compatível.)
- **`backdrop-filter` é proibido em card.** Só em nav, overlay e rodapé com fundo
  opaco.
- **Todo caminho de asset começa com `/`.** `src="app.js"` quebra em `/es/blog`,
  porque o navegador resolve como `/es/app.js` → 404 → site morto.

---

## Acessibilidade e contraste (mínimos, não sugestões)

- Fundo de card: `rgba(255,255,255,.10)` · borda `.14`
- Texto de conteúdo: nunca no tom terciário (`--t3`)
- Sobre imagem: fundo `rgba(13,20,28,.78)` semi-opaco atrás do texto

---

## Como eu quero receber de volta

**Os mesmos arquivos, editados.** `index.html`, `app.js`, `js/site-header.js`,
`js/site-footer.js`.

**Não** empacote como projeto novo. **Não** troque por framework, bundler,
React ou runtime próprio. **Não** gere um arquivo único com o HTML dentro de
uma string. Se vier assim, não serve: o site perde a ligação com o banco e
tudo tem que ser religado à mão, que é exatamente o problema que este brief
existe pra evitar.

---

## Como eu vou conferir (pra você saber o alvo)

1. A home abre com as **18 firmas do banco**, com preço e cupom de verdade.
2. Trocar o idioma no seletor muda o site **sem recarregar**, nos 8 idiomas
   (EN, PT, ES, IT, FR, DE, AR, ID) — inclusive árabe da direita pra esquerda.
3. Copiar o cupom, abrir o detalhe da firma e clicar em comprar continuam
   registrando evento de medição.
4. O site abre em navegador antigo sem ficar em branco.
5. Nenhuma URL mudou.
