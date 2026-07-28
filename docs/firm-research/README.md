# Relatorios BRUTOS do Everton (verbatim)

## Por que isso existe
O Everton manda relatorios COMPLETOS de cada firma. Eu destilava para `data/firm-kb/<id>.md` e
**descartava o original** — quando eu errava na destilacao, o erro virava permanente, porque depois
eu passava a consultar o MEU resumo e nunca mais o texto dele.

Incidentes reais causados por isso (27/jul):
- **E8**: destilei `COUPON: E8` e troquei o cupom oficial dele (**MARKET**) por um publico que nao paga comissao.
- **Alpha**: o plano **Standard** sumiu do banco (nao entrou na destilacao).
- **E8 Signature 25K** e **Aqua One Step Flex/Beginner**: tamanhos/linhas que existiam e ficaram de fora.
- **FundingPips**: o parametro correto do link (`referral_code=`) nunca foi registrado — ficamos com `ref=` (0 atribuicoes).

## Regra
1. TODO relatorio que o Everton mandar entra aqui **verbatim**, sem editar, com data no nome.
2. A KB (`data/firm-kb/`) continua sendo o resumo pro Max — mas o bruto manda.
3. **Divergencia entre KB e bruto => o BRUTO vence** e a KB se corrige.
4. Antes de mudar cupom/link/preco de uma firma, **abrir o bruto dela aqui**.
