# Blog Audit — 2026-05-15

Fonte: Supabase `public.blog_posts` (projeto `qfwhduvutfumsaxnuofa`, snapshot 2026-05-15).
Escopo: artigos `lang='pt'` (todos `active=true`).
Critérios:
- **Curto**: `char_length(body) < 15 000` (metade do padrão canônico Wyckoff PT = 28 429 chars).
- **Read-time inflado**: `read_time_claimed` divergente da estimativa `chars/1500` (≈1 min por 1,5k chars). Razão = claimed ÷ estimada; razão ≥ 2x = inflado.
- **Duplicata de cover_url**: dois ou mais slugs distintos em `lang='pt'` apontando para a mesma URL.

> Observação: `char_length(body)` inclui marcação HTML; em prosa pura o tempo real de leitura é tipicamente ~70 % desse cálculo. As estimativas abaixo já são generosas — quando indicado "inflado", a inflação é ainda maior na prática.

---

## 1. Totais

| lang | total | active |
|------|------:|-------:|
| ar   | 18    | 18     |
| de   | 18    | 18     |
| en   | 18    | 16     |
| es   | 18    | 18     |
| fr   | 18    | 18     |
| it   | 18    | 18     |
| **pt** | **19** | **19** |
| **Σ**  | **127** | **125** |

- Você mencionou "70 artigos (10 PT × 7 langs)". **A DB tem 127** — então há significativamente mais conteúdo do que sua memória registrava. PT tem 19 (não 10).
- Apenas **6 artigos PT estão traduzidos para os 7 idiomas** (têm `article_group` preenchido: `best-prop-firms`, `elliott`, `fibonacci`, `risk-management`, `volume-price-analysis`, `wyckoff`). Os outros **13 PT estão com `article_group = NULL`** — nunca foram traduzidos. Os 12 "extras" em cada lang não-PT também têm `article_group = NULL`, ou seja, são órfãos de tradução em ambos os lados.
- Em `en`, 2 artigos estão `active=false` (vale a pena descobrir quais antes de qualquer push).

---

## 2. Duplicatas de `cover_url` em PT

**Nenhuma duplicata interna em PT.** Os 19 artigos PT têm 19 URLs distintas.

Achados relevantes que sua queixa "imagens repetidas no header" pode estar referindo:

- 8 covers são **compartilhadas com as 7 línguas do mesmo artigo** (por design — tradução reusa imagem). Não é bug.
- Os outros 11 PT não têm tradução, então a cover só aparece uma vez no DB.
- **Hipótese alternativa**: a queixa visual pode ser sobre *estilo* (todas as cover_urls geradas por IA com o mesmo prompt têm look-and-feel parecido — cinza/preto/dourado), não sobre URL idêntica. Isso não é detectável por SQL — exigiria inspeção visual das `.jpg` em `/img/blog-heros/`. Anotado como follow-up.

---

## 3. Artigos curtos (`chars < 15 000`)

**7 de 19 PT estão abaixo do limite.** Os 4 primeiros são stubs extremos (< 2k chars):

| # | slug | chars | read_time claimed | min estimados (chars/1500) | razão inflação | ai_generated |
|---|------|------:|------------------:|---------------------------:|---------------:|:------------:|
| 1 | `multi-accounting-vale-o-risco`        | 1 248 | 11 min | 0,83 | **13,2x** | não |
| 2 | `de-50k-para-300k-scaling-plans`       | 1 470 | 13 min | 0,98 | **13,3x** | não |
| 3 | `gestao-fiscal-traders-financiados-brasil` | 1 575 | 15 min | 1,05 | **14,3x** | não |
| 4 | `operando-3-mesas-simultaneamente`     | 1 640 | 12 min | 1,09 | **11,0x** | não |
| 5 | `ondas-de-elliott-guia-simplificado`   | 3 093 | 10 min | 2,06 | **4,8x**  | não |
| 6 | `melhores-prop-firms-2026`             | 3 494 | 10 min | 2,33 | **4,3x**  | não |
| 7 | `analise-volume-preco-anna-coulling`   | 3 568 | 11 min | 2,38 | **4,6x**  | não |

Padrão claro: **nenhum dos 7 curtos é `ai_generated=true`** — todos são drafts manuais antigos que nunca foram expandidos. Os artigos longos (15k+) são exatamente os `ai_generated=true` da batelada nova, exceto Wyckoff/Fibonacci canônicos.

---

## 4. Read-time inflado (todos os 19 PT)

Razão = `read_time_claimed ÷ (chars/1500)`. Verde = ok (0,8–1,3x). Amarelo = leve (1,3–2x). Vermelho = inflado (≥2x).

| slug | chars | claimed | est. | razão | status |
|------|------:|--------:|-----:|------:|:------:|
| multi-accounting-vale-o-risco         | 1 248  | 11 min | 0,83  | 13,2x | 🔴 |
| de-50k-para-300k-scaling-plans        | 1 470  | 13 min | 0,98  | 13,3x | 🔴 |
| gestao-fiscal-traders-financiados-brasil | 1 575 | 15 min | 1,05 | 14,3x | 🔴 |
| operando-3-mesas-simultaneamente      | 1 640  | 12 min | 1,09  | 11,0x | 🔴 |
| ondas-de-elliott-guia-simplificado    | 3 093  | 10 min | 2,06  | 4,8x  | 🔴 |
| melhores-prop-firms-2026              | 3 494  | 10 min | 2,33  | 4,3x  | 🔴 |
| analise-volume-preco-anna-coulling    | 3 568  | 11 min | 2,38  | 4,6x  | 🔴 |
| metagame-prop-firm-trader             | 15 876 | 15 min | 10,58 | 1,4x  | 🟡 |
| teorias-dos-mercados-dow-emh          | 18 433 | 15 min | 12,29 | 1,2x  | 🟢 |
| introducao-analise-tecnica            | 18 507 | 15 min | 12,34 | 1,2x  | 🟢 |
| trading-for-a-living-alexander-elder  | 18 678 | 17 min | 12,45 | 1,4x  | 🟡 |
| wyckoff-2-volume-profile-order-flow   | 19 850 | 18 min | 13,23 | 1,4x  | 🟡 |
| plano-de-trading-guia-pratico         | 20 097 | 14 min | 13,40 | 1,0x  | 🟢 |
| mercado-americano-guia-trader         | 20 280 | 16 min | 13,52 | 1,2x  | 🟢 |
| indicadores-tecnicos-guia-completo    | 20 386 | 16 min | 13,59 | 1,2x  | 🟢 |
| ondas-de-elliott-guia-completo        | 23 604 | 17 min | 15,74 | 1,1x  | 🟢 |
| vpa-volume-price-analysis             | 27 566 | 18 min | 18,38 | 1,0x  | 🟢 |
| metodo-wyckoff-guia-completo          | 28 429 | 22 min | 18,95 | 1,2x  | 🟢 |
| fibonacci-trading-guia-completo       | 82 899 | 32 min | 55,27 | 0,6x  | 🟡 (sub-estimado) |

**Resumo**:
- 🔴 **7 artigos com inflação grave** (≥ 4x) — todos são também os 7 curtos. Read_time foi colocado como se fosse longo, mas o corpo nunca foi escrito.
- 🟡 **4 artigos com inflação leve** (1,4x) — só ajustar campo `read_time`.
- 🟢 **7 artigos com read_time correto**.
- 🟡 **fibonacci**: o oposto — sub-estimado. 82 899 chars marcados como 32 min, deveria ser ~55 min. Provavelmente intencional pra não assustar leitor, mas inconsistente.

---

## 5. Recomendação por artigo

| slug | ação | racional |
|------|------|----------|
| `multi-accounting-vale-o-risco` | **reescrever** | 1 248 chars = stub. Tema relevante (compliance), expandir. |
| `de-50k-para-300k-scaling-plans` | **reescrever** | Stub. Comparativo scaling plans é alta intenção de busca. |
| `gestao-fiscal-traders-financiados-brasil` | **reescrever** | Stub. Tema fiscal Brasil tem demanda real, vale long-form. |
| `operando-3-mesas-simultaneamente` | **reescrever** | Stub. Setup multi-mesa é diferencial competitivo do site. |
| `ondas-de-elliott-guia-simplificado` | **fundir ou deletar** | Já existe `ondas-de-elliott-guia-completo` (23 604 chars). O "simplificado" pode virar resumo introdutório do completo ou ser deletado. |
| `melhores-prop-firms-2026` | **reescrever** | 3 494 chars pra "guia completo" é vergonha. Tema é a porta de entrada do site — prioridade máxima. |
| `analise-volume-preco-anna-coulling` | **fundir ou deletar** | Já existe `vpa-volume-price-analysis` (27 566 chars, canônico). Esse aqui é redundante. |
| `metagame-prop-firm-trader` | **ajustar read_time** (10 min) | Corpo OK (15 876 chars). Só o read_time exagerado. |
| `teorias-dos-mercados-dow-emh` | manter | Read-time ok. |
| `introducao-analise-tecnica` | manter | Read-time ok. |
| `trading-for-a-living-alexander-elder` | **ajustar read_time** (12 min) | |
| `wyckoff-2-volume-profile-order-flow` | **ajustar read_time** (13 min) | |
| `plano-de-trading-guia-pratico` | manter | |
| `mercado-americano-guia-trader` | manter | |
| `indicadores-tecnicos-guia-completo` | manter | |
| `ondas-de-elliott-guia-completo` | manter | |
| `vpa-volume-price-analysis` | manter | Canônico VPA. |
| `metodo-wyckoff-guia-completo` | manter | Canônico. |
| `fibonacci-trading-guia-completo` | **ajustar read_time pra cima** (55 min) ou splitar | 82 899 chars é maratona. Considerar split em série. |

**Quanto a regenerar imagens**: não foi possível detectar problema via SQL (zero duplicatas de URL em PT). Antes de gastar créditos regenerando, vale:
1. Abrir o /blog em produção e listar visualmente quais covers parecem "iguais" (estilo, paleta).
2. Comparar lado a lado as 19 .jpg em `/img/blog-heros/`.
3. Decidir quais N regenerar — não em massa.

Decisão sobre regeneração de imagens: **bloqueada até inspeção visual sua**.

---

## 6. Próximos passos sugeridos (não executados)

- [ ] 4 stubs (`multi-accounting-vale-o-risco`, `de-50k-para-300k-scaling-plans`, `gestao-fiscal-traders-financiados-brasil`, `operando-3-mesas-simultaneamente`): reescrever em long-form (alvo: 18–25k chars).
- [ ] 2 redundâncias (`ondas-de-elliott-guia-simplificado`, `analise-volume-preco-anna-coulling`): fundir com canônico ou deletar.
- [ ] 1 alta-prioridade (`melhores-prop-firms-2026`): reescrever para alinhar com Wyckoff PT canônico.
- [ ] Correções de read_time (5 artigos), trivial: UPDATE direto.
- [ ] Inspeção visual de 19 covers em `/img/blog-heros/` antes de qualquer regeneração.
- [ ] Decidir destino dos 13 PT órfãos sem `article_group` — traduzir ou aceitar como PT-only.

---

*Audit gerado por Claude. Snapshot Supabase: 2026-05-15. Nenhuma row de `blog_posts` foi alterada.*
