# Brief — Novo Admin do Markets Coupons

> Para colar no Claude Design. Escrito a partir do admin atual (`admin.html`, ~16.400 linhas)
> e do schema real do Supabase, conferido em 28/07/2026. Nada aqui é suposição.

---

## 1. O que é

Painel interno de UMA pessoa (o dono). Não é produto, não tem multi-tenant, não tem
onboarding. Prioridade é **densidade de informação e velocidade**, não beleza.

- Idioma da interface: **PT-BR**. (O site público é EN — o admin não.)
- **ZERO emoji na UI.** Ícones sempre SVG inline, padrão Feather:
  `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`
- Tema dark. Paleta gold `#F0B429`. Fonte Inter.
- Sem framework pesado se der pra evitar; o site atual é vanilla + Supabase CDN.

## 2. Backend: já existe, não construir

**Supabase** `https://qfwhduvutfumsaxnuofa.supabase.co` — 27 tabelas em uso.
**RLS está ativa.** O admin autentica com Supabase Auth usando storageKey **`mc-admin-auth`**
(o site público usa `mc-user-auth` — não misturar, senão logar no admin desloga o usuário).

Autorização: allowlist de e-mail no cliente é **só UX**. A segurança real é
`profiles.is_admin` validado no servidor em todo endpoint.

### As duas tabelas que mais importam

**`firms` (13 colunas) — FONTE ÚNICA do dado de afiliado.**
`id, slug, nome, affiliate_url, tracking_param, tracking_value, coupon_code,
coupon_description, ativo, updated_at, needs_review, extra, needs_review_since`

- `coupon_code = NULL` significa **a firma não tem código** (o desconto vem no link).
  É estado válido e final. **Não confundir com `needs_review = true`**, que significa
  "valor desconhecido, pendente de humano". São coisas diferentes e a UI tem que
  mostrar diferente.
- `tracking_param = 'path'` quando o código vai no caminho da URL, não na query.
- `needs_review_since` é carimbado por trigger. **Nunca escrever nesse campo.**

**`cms_firms` (65 colunas) — preço, regra, conteúdo, KB.**
Campos que a UI precisa tratar com cuidado:
- `prices` (jsonb) `[{a,n,o}]` — `a`=rótulo, `n`=preço final, `o`=preço cheio
- `detail_plans` (jsonb) `{tipo:[{s,d,o,pop}]}` — **segundo armazém de preço**;
  os dois têm que contar a mesma história
- `discount`, `discount_type` (`lifetime`/`flash`), `disc_note`, `promo_label`, `promo_ends_at`
- `kb` (texto longo, até 60k) — **NUNCA carregar no frontend público**, só no admin

## 3. O que o admin ATUAL faz

> **O detalhe página a página está em [brief-admin-inventario.md](brief-admin-inventario.md)** —
> os 37 containers de página com os botões e handlers reais de cada um. Leia junto: esta
> tabela é só o mapa; o inventário é o que não pode sumir.


O novo não precisa clonar tudo, mas nada pode sumir sem decisão explícita.

| Seção | Sub-abas | Função |
|---|---|---|
| Dashboard | — | visão geral |
| Analytics | Tracking, Eventos, Geo | funil, heatmap por fuso BRT, ranking geográfico |
| Usuários | Leads, Cadastros | base de e-mail + `profiles` |
| Firmas | Firmas, Preços & Cupons | edita `cms_firms` |
| E-mail | — | envio manual + templates institucionais |
| Monetização / Financeiro / Impostos | — | comissão, ROAS, ranking de criativo, gross-up Meta +13,83% |
| Conteúdo | Blog, Guias, FAQ | CMS |
| Telegram | — | disparo e agenda |
| Criativos | — | render do criativo + download PNG + copy pro Instagram |
| Reviews | — | moderação |
| **Site** | **15 sub-abas** | Hero, Nav, Ofertas, Firmas, Plataformas, Indicadores, Calendário, Análise, Gamma, Calculadora, Quiz, Live Room, Footer, Cores, Logo |
| Config | Textos, I18N, Traduções Firmas | 8 idiomas |

⚠️ A seção **Site** edita blocos do layout ANTIGO. Conferir contra a LP nova antes de
replicar — boa parte provavelmente morre junto.

### Endpoints que já existem e devem continuar sendo usados
`/api/brevo-stats` · `/api/delete-user` · `/api/gen-firm-copy` · `/api/render-criativo`
· `/api/send-email` · `/api/validate-mx`
(Limite do Vercel Hobby: **12 Serverless Functions**. Não criar novas sem consolidar.)

## 4. O QUE FALTA — construir de novo

Isto não existe hoje e é o que custa tempo toda semana.

### 4.1 Tela da tabela `firms` (PRIORIDADE 1)
O dado mais crítico do negócio — cupom, URL de afiliado, parâmetro de tracking —
**não tem nenhuma UI**. Hoje só se edita por SQL. Precisa de CRUD com:
- edição por firma dos 7 campos operacionais
- `coupon_code` vazio tem que ser **explicitamente** "esta firma não tem código",
  com um checkbox, nunca um input em branco ambíguo
- `needs_review` com o motivo e **há quantos dias** está pendente
- histórico de quem mudou o quê (hoje não existe)

### 4.2 Painel de saúde das firmas (PRIORIDADE 2)
Uma tela que responda "posso publicar?" sem ninguém conferir na mão. Por firma:
- cupom bate entre `firms` e `cms_firms`?
- link de afiliado ainda atribui? (resultado do verificador diário)
- selo de taxa de ativação certo?
- algum preço com `n >= o` (anuncia desconto e mostra preço cheio)?
- `discount` declarado bate com o implicado por `1 − n/o`?
- `promo_ends_at` vencido? `promo_label` citando cupom morto?

### 4.3 Resultado do verificador
`check_links.py` e `check_pages.py` rodam todo dia 08:00 BRT no GitHub Actions.
Hoje o resultado só chega como e-mail de falha. Trazer pra dentro do admin,
incluindo as seções PENDÊNCIAS ANTIGAS e CANDIDATAS A REATIVAÇÃO.

### 4.4 Botão de pausar / tirar firma do ar
Hoje é script no terminal (`scripts/kill-firm.mjs`). Vira botão, com aviso do que
vai acontecer (quantas páginas, quantos redirects) e confirmação.

### 4.5 Normalizar o nome da campanha ANTES de agrupar (não é opcional)

O Instagram anexa **`_seeall`** ao `utm_campaign` quando o clique vem do "ver mais"
do perfil. A campanha é **a mesma** — só o rótulo vem sujo. Mas o cruzamento
gasto × venda é por **nome exato**: sem normalizar, a venda com sufixo não acha a
campanha e **fica fora do ROAS dela**. O gasto aparece sem a receita que gerou.

Medido no banco em 29/07: **9 vendas / US$ 26,30 órfãs**, incluindo as duas
campanhas que mais gastam (`[RMKT][PAISES][NEWSCRIATIVOS]` e `[LEADS][APEX][EUA][DAY]`).

```js
function normCampanha(nome) {
  const sufixos = /_(seeall|see_all|profile|bio|linkinbio)$/i;
  let n = String(nome || '').trim();
  if (!n) return '';
  let antes;
  do { antes = n; n = n.replace(sufixos, ''); } while (n !== antes);  // podem vir empilhados
  return n;
}
```

**Normalizar na LEITURA, nunca na escrita.** Na leitura conserta o histórico inteiro
de uma vez e o sufixo continua no banco — dá pra saber de onde veio o clique. Na
escrita só corrige daqui pra frente e joga a informação fora.

Aplicar em **todo** ponto onde o nome vira chave de agrupamento: ROAS por campanha,
gasto por campanha, keyword do painel da firma, leads por campanha, eventos e
atribuições. No admin atual são 9 pontos.

## 5. Regras duras (violar = prejuízo real, não estética)

1. **Dado de afiliado só vem da tabela `firms`.** Proibido escrever cupom, URL ou
   código de tracking em qualquer arquivo. Já custou 4 vazamentos de comissão.
2. **`MARKET`, `MARKETS`, `MARKET89`, `MARKETSCOUPONS`, `MARKET-7652C` são valores
   DIFERENTES.** Nunca normalizar, nunca autocompletar, nunca assumir equivalência.
3. **Nunca inventar dado público** (preço, %, prazo, regra). Não visto = `null`.
   Publicidade enganosa aqui é Procon, não bug.
4. **Oferta `discount_type = 'lifetime'` não tem prazo.** Zero contador, em qualquer tela.
5. **Selo verde "sem taxa de ativação" só se a firma não cobra em NENHUM plano.**
   Cobra em algum = selo âmbar "tem plano sem taxa".
6. **Nada de emoji na UI.** SVG Feather sempre.
7. **Mudou dado de firma → as ~3.000 páginas estáticas precisam ser regeradas.**
   O site lê o banco em runtime, as páginas não.
8. **Nome de campanha SEMPRE passa por `normCampanha()` antes de virar chave.**
   Sem isso o `_seeall` do Instagram tira a venda do ROAS da campanha (ver 4.5).

## 6. Armadilhas que já custaram caro aqui

- **Código duplicado em dois arquivos** foi a causa de 4 bugs em um único dia
  (`renderHeroPremium`, `CR_NOFEE`, `FIRM_WORDMARK`, `INST_TEMPLATES` existem em
  duplicata). No admin novo: **fonte única, sempre.**
- **Cache do frontend**: o site cacheia firmas em localStorage por 6h (limite de
  egress do Supabase Free, teto 5GB/mês). O admin **não** deve cachear dado de firma.
- **`.maybeSingle()`, nunca `.single()`** — `single()` devolve 406 quando vazio.
- **Todo caminho de asset com `/` na frente.** `'img/x'` quebra em `/es/...`.

## 7. Como entregar

Migração **por partes**, não big bang. Ordem sugerida pelo uso real:
1. **Firmas + a tela nova da `firms`** (é o que trava o dia a dia)
2. **Criativos** (usado toda semana)
3. **E-mail**
4. Analytics / Financeiro
5. Conteúdo / Site / Config

O admin atual continua no ar até cada parte estar substituída e conferida.
