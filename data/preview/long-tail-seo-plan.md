# SEO Fase 2 — Plano de Long-Tail Blog Posts

**Objetivo:** capturar tráfego orgânico em ~30 queries de cauda longa que hoje quase ninguém ranqueia, com posts focados (1500-3000 palavras cada) + schema Article/FAQ/HowTo.

**Volume estimado por post:** 50-300 visitas/mês cada (cauda longa = volume baixo mas conversão alta).
**Total esperado:** 1500-9000 visitas orgânicas/mês após 90-120 dias indexação.

---

## Categoria 1 — Comparativos firma × firma (10 posts)

Já temos pages /compare/X-vs-Y.html. Esses posts devem ser BLOG (mais conteúdo + opinião) que linkam pra compare page e firma:

1. `/blog/apex-vs-bulenox-qual-vale-mais-em-2026` — query "apex vs bulenox"
2. `/blog/apex-vs-tradeday-comparativo-completo` — "apex vs tradeday"
3. `/blog/ftmo-vs-apex-futures-ou-forex` — "ftmo vs apex"
4. `/blog/bulenox-vs-tradeday-89-vs-50-off` — "bulenox vs tradeday"
5. `/blog/fundednext-vs-ftmo-qual-escolher-2026` — "fundednext vs ftmo"
6. `/blog/the5ers-vs-fundednext-forex-prop-firm` — "the5ers vs fundednext"
7. `/blog/e8-markets-vs-fundingpips-best-1-step` — "e8 vs fundingpips"
8. `/blog/brightfunded-vs-ftmo-novo-vs-veterano` — "brightfunded vs ftmo"
9. `/blog/goat-vs-bulenox-90-off-disputa` — "goat vs bulenox"
10. `/blog/aqua-futures-vs-blueberry-iniciantes` — "aqua vs blueberry"

## Categoria 2 — How-to por contexto (8 posts)

11. `/blog/como-passar-no-desafio-apex-em-30-dias` — "como passar apex 30 dias"
12. `/blog/como-calcular-drawdown-apex-50k` — "drawdown apex 50k"
13. `/blog/como-sacar-payout-na-bulenox-passo-a-passo` — "payout bulenox"
14. `/blog/como-passar-em-1-dia-bulenox` — "passar bulenox 1 dia"
15. `/blog/como-evitar-daily-loss-na-ftmo` — "evitar daily loss ftmo"
16. `/blog/como-funciona-trailing-drawdown-apex` — "trailing drawdown apex"
17. `/blog/como-usar-cupom-market-na-apex-90-off` — "cupom market apex"
18. `/blog/como-recuperar-conta-resetada-em-prop-firm` — "reset apex"

## Categoria 3 — Comparativo por critério (6 posts)

19. `/blog/melhor-prop-firm-para-iniciantes-2026` — "melhor prop firm iniciantes"
20. `/blog/prop-firm-mais-barata-para-comecar` — "prop firm barata"
21. `/blog/prop-firm-com-maior-profit-split` — "maior profit split"
22. `/blog/prop-firm-com-payout-mais-rapido` — "payout rápido"
23. `/blog/prop-firm-que-aceita-brasileiros-2026` — "prop firm brasileiro"
24. `/blog/prop-firm-sem-regra-de-consistencia` — "sem consistency"

## Categoria 4 — Conceitos explicados (6 posts)

25. `/blog/o-que-e-profit-split-em-prop-firm` — "profit split"
26. `/blog/o-que-e-trailing-drawdown-vs-static` — "trailing vs static drawdown"
27. `/blog/o-que-e-consistency-rule-prop-firm` — "consistency rule"
28. `/blog/o-que-e-daily-loss-limit-prop-firm` — "daily loss"
29. `/blog/scaling-plan-em-prop-firm-como-funciona` — "scaling prop firm"
30. `/blog/news-trading-em-prop-firm-permitido` — "news trading prop firm"

---

## Template de cada post

```
H1: [Query como pergunta natural]
H2 introdução: contexto + por que isso importa em 2026
H2 corpo dividido em 4-6 seções com H3
H2 tabela comparativa (se aplicavel) com firmas + dados reais do banco
H2 conclusão + CTA pra firma específica com link de afiliado
H2 FAQ (3-5 perguntas)
Schema: Article + FAQPage + HowTo (quando aplicável)
Internal links: 2-3 pra /guides/, 1 pra /compare/, 1 pra firma específica
```

## Cronograma sugerido

- **Sprint 1 (1 semana):** posts 1-10 (comparativos firma vs firma — base de dados já existe no banco)
- **Sprint 2 (1 semana):** posts 11-18 (how-to — reuso do conteúdo dos guias)
- **Sprint 3 (1 semana):** posts 19-30 (conceitos + critérios)

## Custo

- Geração via Vertex AI Gemini 2.5 Pro (gratuito tier alto)
- 1500-3000 palavras × 30 posts ≈ 90k palavras totais
- Custo estimado: $0 (free tier suficiente) ou $5-10 em Pro tier
- Imagens: nano-banana-2 (na conta paga do Everton)

## Próximos passos

1. **Aprovação Everton** das 30 keywords
2. Gerar drafts em `data/preview/blog-fase-2/*.html` (1 por post)
3. Everton revisa lote por lote
4. Insert em `blog_posts` no Supabase
5. Adicionar ao sitemap.xml
6. Submit ao GSC
