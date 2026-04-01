# MarketsCoupons - Contexto do Projeto

## Visao Geral

Site de cupons e descontos para **prop firms** de trading. Compara firmas, oferece cupons exclusivos, programa de fidelidade, blog, guias, quiz, calculadoras e mais. Deploy no **Vercel** como site estatico (sem build step).

- **URL producao:** https://www.marketscoupons.com
- **Dominio Vercel:** https://marketscoupons.vercel.app
- **Idioma principal:** Portugues (PT-BR)
- **Respostas ao usuario:** Sempre em portugues

---

## Arquitetura

### Arquivos principais
- `index.html` (~9.450 linhas) — Frontend publico completo (HTML + CSS + JS inline)
- `admin.html` (~3.380 linhas) — Painel administrativo (HTML + CSS + JS inline)
- `vercel.json` — Rotas e headers (rota `/admin` -> `admin.html`, no-cache em HTMLs)
- `translate.js` — Script Node.js para traduzir I18N via DeepL API
- `fix-translations.js` — Script para corrigir problemas de traducao (entidades HTML, termos tecnicos)
- `.gitignore` — Ignora `.deepl-key` e `node_modules/`
- `img/` — Imagens (subpastas `Firms/` e `Plataformas/`)

### Stack
- **100% vanilla** — HTML/CSS/JS puro, sem framework, sem bundler, sem package.json
- **Supabase** (v2 via CDN) — Auth, Database (PostgreSQL), Storage
- **Vercel** — Hosting estatico
- **DeepL API** — Traducoes automaticas (script offline)

---

## Supabase

### Configuracao
- **URL:** `https://qfwhduvutfumsaxnuofa.supabase.co`
- **Anon key:** Hardcoded nos dois HTMLs (mesmo key, protegido por RLS)
- **Auth storage keys SEPARADOS** (critico para evitar conflito de sessao):
  - `index.html` usa `storageKey: 'mc-user-auth'`
  - `admin.html` usa `storageKey: 'mc-admin-auth'`

### Tabelas
| Tabela | index.html | admin.html | Descricao |
|---|---|---|---|
| `events` | X | X | Eventos do calendario |
| `cms_guides` | X | X | Guias educacionais |
| `cms_firms` | X | X | Dados das firmas |
| `blog_posts` | | X | Posts do blog |
| `leads` | X | X | Leads capturados |
| `loyalty_members` | X | X | Membros do programa fidelidade |
| `loyalty_proofs` | X | X | Comprovantes de compra |
| `profiles` | X | | Perfis de usuario |
| `site_settings` | X | X | Configuracoes do site |
| `firm_favorite_counts` | X | | Contagem de favoritos |
| `favorites` | X | | Favoritos dos usuarios |
| `ad_spend` | | X | Gastos com anuncios |

### Storage
- **Bucket:** `loyalty-proofs` — Comprovantes de compra enviados pelos usuarios

### Queries importantes
- Usar `.maybeSingle()` em vez de `.single()` — `.single()` retorna erro 406 quando nenhuma linha e encontrada
- Verificar `data !== null && data !== undefined` em vez de `data?.length` para resultados de queries

---

## I18N (Internacionalizacao)

### Estrutura
- Objeto `const I18N = {...}` dentro do `<script>` do `index.html`
- **7 idiomas:** pt, en, es, it, fr, de, ar
- Funcao `t('chave')` retorna a string traduzida no idioma atual

### Traducao
1. Adicionar/editar strings em `pt` no objeto I18N
2. Rodar `node translate.js` (requer chave DeepL em `.deepl-key` ou `DEEPL_KEY` env var)
3. Rodar `node fix-translations.js` para corrigir termos tecnicos que nao devem ser traduzidos

### Termos que NAO devem ser traduzidos
- "Prop Firm(s)" — manter em ingles em todos os idiomas
- "Profit Split" — termo tecnico de trading
- "Drawdown" — termo tecnico
- "Lifetime" — contexto de desconto

---

## Layout de Cupons (Design Pattern)

### Estrutura correta (todas as variacoes)
```
+------------------------------------------+
| Cupom exclusivo                          |  <- label, alinhado a esquerda
| MARKET89                      [Copiar]   |  <- codigo esquerda, botao direita
+------------------------------------------+     botao centralizado verticalmente
```

### Implementacao HTML
O container e um flex com `space-between`. Dentro dele, um div `.offer-coupon-left` agrupa label + codigo em coluna a esquerda. O botao fica como filho direto do container, centralizado verticalmente.

```html
<div class="[container-class]">
  <div class="offer-coupon-left">
    <div class="[label-class]">Cupom exclusivo</div>
    <span class="[code-class]">MARKET89</span>
  </div>
  <button class="[copy-class]">Copiar</button>
</div>
```

### CSS do container
```css
display: flex !important;
align-items: center !important;      /* botao centralizado verticalmente */
justify-content: space-between !important;  /* codigo esquerda, botao direita */
```

### CSS da coluna esquerda
```css
.offer-coupon-left { display: flex; flex-direction: column; }
```

### Classes por contexto
| Contexto | Container | Label | Code | Button |
|---|---|---|---|---|
| Home (ofertas) | `.oc-coupon` | `.offer-coupon-label` | `.oc-code` | `.oc-copy` |
| Ofertas (cards) | `.offer-coupon-box` | `.offer-coupon-label` | `.offer-coupon-code` | `.offer-copy-btn` |
| Firmas (grid) | `.fr-coupon-box` | `.fr-coupon-box-label` | `.fr-coupon-box-code` | `.fr-coupon-box-copy` |
| Drawer (detalhe) | `.drw-coupon-bar` | `.drw-coupon-label` | `.drw-coupon-code` | `.drw-coupon-copy` |
| Drawer (checkout) | `.drw-coupon-bar` | `.drw-coupon-label` | `.drw-coupon-code` | `.drw-coupon-copy` |
| Generico | `.cpn-blk` | `.cpn-lbl` | `.cpn-code` | — |

### Regras importantes
- **NUNCA** usar inline styles nos templates JS para coupon rows — todo estilo deve vir das classes CSS
- O label "Cupom exclusivo" fica DENTRO de `.offer-coupon-left` (coluna esquerda), NAO como item separado do flex
- O botao "Copiar" e filho direto do container, NAO dentro de um sub-div

---

## Auth (Autenticacao)

### Fluxo do usuario (index.html)
1. Botoes "Entrar"/"Cadastrar-se" iniciam **escondidos** (`display:none`)
2. Check sincrono de `localStorage.getItem('mc-user-auth')` decide se mostra botoes ou menu do usuario
3. `checkAuthSession()` faz verificacao assincrona via `db.auth.getSession()`
4. `updateAuthUI(bool)` alterna entre estado logado/deslogado
5. `onAuthStateChange` listener com guard `if (_loggingOut) return;` para evitar loop

### Logout (doLogout)
- `db.auth.signOut()`
- Remove `mc-user-auth` do localStorage
- Limpa todas as chaves `sb-*` do localStorage e sessionStorage
- `window.location.replace()` para recarregar sem historico

### Separacao admin/usuario
- Admin usa `storageKey: 'mc-admin-auth'` — sessao completamente separada
- Logar/deslogar do admin NAO afeta a sessao do usuario no site principal

---

## Calendario Economico

- Usa widget embed do TradingView: `embed-widget/events/` (NAO `embed-widget/economic-calendar/` que retorna 404)
- A traducao e automatica pelo parametro `locale` no URL do widget
- Aba no nav chama "Calendario Economico" (nao apenas "Calendario") em todos os idiomas

---

## Tracking/Analytics
- Google Tag Manager: `GTM-WJGTVX8G`
- Google Analytics 4: `G-CZ3L00NY77`
- Facebook Pixel: `813048241061812`

---

## Deploy

### Vercel
- Deploy automatico via push no `main`
- Sem build step (arquivos estaticos diretos)
- Headers no-cache em todos os `.html` e `/` para evitar cache de CDN
- Rota `/admin` reescrita para `/admin.html`

### Processo
1. Fazer alteracoes
2. `git add [arquivos]` + `git commit`
3. `git push origin main`
4. Aguardar ~1-2 min para deploy
5. Testar com **Ctrl+F5** (hard refresh) para garantir que nao e cache

---

## CSS - Tema e Variaveis

- **Tema:** Dark mode (fundo escuro, acentos dourados)
- **Font:** Inter (variavel `--f`)
- **Cores principais:** `--gold` (dourado), `--card` (fundo card), `--gbg` (fundo cinza), `--gbr` (borda cinza)
- **Textos:** `--t1` (primario), `--t2` (secundario), `--t3` (terciario)
- **Usar `!important`** em propriedades de layout de cupons para garantir que inline styles nao sobrescrevam

---

## Boas Praticas do Projeto

1. **Idioma das respostas:** Sempre responder em portugues (PT-BR)
2. **Sem frameworks:** Nao introduzir dependencias, bundlers ou frameworks
3. **Inline styles:** Evitar ao maximo — usar classes CSS. Especialmente em templates JS
4. **`.single()` proibido:** Usar `.maybeSingle()` para queries que podem retornar 0 resultados
5. **Testar apos deploy:** Verificar com `curl` que as mudancas estao no site publicado
6. **Cache:** Headers no-cache ja configurados no vercel.json, mas sempre orientar Ctrl+F5
7. **Auth separada:** Nunca usar o mesmo storageKey para admin e usuario
8. **Termos tecnicos:** "Prop Firm", "Profit Split", "Drawdown", "Lifetime" nao sao traduzidos
9. **Commits:** Fazer commits focados e descritivos, um por feature/fix
10. **Nao quebrar layout existente:** Verificar visualmente antes de mudar CSS de componentes compartilhados
11. **Admin noindex:** `admin.html` tem `<meta name="robots" content="noindex,nofollow">`
12. **Seguranca:** Supabase anon key e publica por design (RLS protege), mas nunca expor service_role key
13. **Consultar CLAUDE.md:** Sempre ler este arquivo antes de qualquer acao para manter contexto
