import { writeArticle, cdn } from './build-articles.mjs';

const slug = 'plano-de-trading-guia-pratico';

const meta = {
  title: 'Plano de Trading: O Documento que Separa Profissionais de Apostadores',
  slug,
  category: 'Educação',
  level: 'iniciante',
  read_time: '14 min',
  lang: 'pt',
  icon: '📋',
  author: 'Markets Coupons',
  excerpt: 'Trader profissional não opera por intuição. Opera por plano. Este guia mostra os 12 elementos que todo plano de trading precisa ter — do critério de entrada ao risco por trade ao journal — com templates práticos para prop firm.',
  cover_url: cdn(slug, 'hero.jpeg')
};

const body = `
<img src="${cdn(slug, 'hero.jpeg')}" alt="Documento de plano de trading com setup, regras de risco e checklist">

<h2>Por Que 95% dos Traders Não Têm Plano — e Por Que Isso os Mata</h2>
<p>Pergunte a 10 traders iniciantes se eles têm plano escrito. 9 dirão que "têm na cabeça". O décimo terá um documento de 200 páginas que nunca lê. Ambos vão quebrar a conta.</p>
<p>O plano "na cabeça" é um mito conveniente. Sob estresse — e mercado em movimento é estresse — o cérebro humano prioriza emoções (medo, ganância, esperança) sobre lógica. Sem plano físico, escrito, revisado regularmente, decisões viram torcida. E torcida não se sustenta em 1.000 trades.</p>
<p>Plano de trading não é burocracia. É o <strong>contrato que você assina consigo mesmo antes do mercado abrir</strong>. Cada elemento existe pra impedir você de fazer a besteira que faria sem ele.</p>

<div class="callout callout-gold">
<strong>Princípio fundador (Mark Douglas, "Trading in the Zone"):</strong> "Você não negocia mercados. Você negocia suas crenças sobre o mercado." O plano de trading é a externalização dessas crenças em forma operacional. Sem ele, suas crenças mudam a cada candle. Com ele, você opera o mesmo trader durante 1.000 trades.
</div>

<h2>Os 12 Elementos de um Plano de Trading Completo</h2>

<table>
<thead><tr><th>#</th><th>Elemento</th><th>Pergunta que responde</th></tr></thead>
<tbody>
<tr><td>1</td><td><strong>Objetivos</strong></td><td>Por que opero? Qual meta de retorno e prazo?</td></tr>
<tr><td>2</td><td><strong>Mercados e instrumentos</strong></td><td>O que opero? Por que esses?</td></tr>
<tr><td>3</td><td><strong>Timeframes</strong></td><td>Em qual escala leio o mercado?</td></tr>
<tr><td>4</td><td><strong>Critério de entrada</strong></td><td>O que define um setup válido?</td></tr>
<tr><td>5</td><td><strong>Critério de saída</strong></td><td>Quando fecho com lucro? Com perda?</td></tr>
<tr><td>6</td><td><strong>Gerenciamento de risco</strong></td><td>Quanto arrisco por trade? Por dia? Por semana?</td></tr>
<tr><td>7</td><td><strong>Position sizing</strong></td><td>Como calculo o tamanho da posição?</td></tr>
<tr><td>8</td><td><strong>Stop-loss</strong></td><td>Onde coloco stop? Como ajusto?</td></tr>
<tr><td>9</td><td><strong>Rotina diária</strong></td><td>O que faço antes/durante/depois do mercado?</td></tr>
<tr><td>10</td><td><strong>Regras de filtro</strong></td><td>Quando NÃO opero? (eventos, condições, estado mental)</td></tr>
<tr><td>11</td><td><strong>Journal de trades</strong></td><td>Como registro e analiso operações?</td></tr>
<tr><td>12</td><td><strong>Revisão e melhoria</strong></td><td>Quando e como evoluo o plano?</td></tr>
</tbody>
</table>

<h2>1. Objetivos — Por Que Você Opera</h2>
<p>Sem objetivo claro, todo trade vira "vamos ver no que dá". Objetivo precisa ser SMART: Específico, Mensurável, Atingível, Relevante, Temporal.</p>

<h3>Objetivos ruins</h3>
<ul>
<li>"Ganhar dinheiro com trading" (vago)</li>
<li>"Ficar rico em 1 ano" (não atingível)</li>
<li>"Operar todos os dias" (atividade, não resultado)</li>
</ul>

<h3>Objetivos bons</h3>
<ul>
<li>"Ganhar 10% líquido em 90 dias na conta de avaliação Apex 50K, operando 3-5 dias/semana"</li>
<li>"Manter expectância positiva (Win Rate × Avg Win &gt; Loss Rate × Avg Loss) por 100 trades consecutivos"</li>
<li>"Limitar drawdown a 5% do peak em qualquer momento"</li>
</ul>

<div class="callout callout-blue">
<strong>Foco em processo, não resultado:</strong> nas primeiras fases, o objetivo deve ser <em>seguir o plano</em>, não <em>ganhar dinheiro</em>. Resultado financeiro é consequência. Trader que foca em resultado força trades. Trader que foca em processo passa por avaliação.
</div>

<h2>2. Mercados e Instrumentos — Foco Não é Limite, é Vantagem</h2>
<p>Trader iniciante quer operar tudo. Trader profissional escolhe 1-3 instrumentos e domina. Profundidade vence amplitude.</p>

<table>
<thead><tr><th>Perfil</th><th>Recomendação</th><th>Razão</th></tr></thead>
<tbody>
<tr><td><strong>Iniciante (0-6 meses)</strong></td><td>1 instrumento (MES ou MNQ em micros)</td><td>Aprender comportamento de UM mercado profundamente</td></tr>
<tr><td><strong>Intermediário (6-18 meses)</strong></td><td>2-3 instrumentos correlacionados (ES + NQ + RTY)</td><td>Diversificação modesta sem perder foco</td></tr>
<tr><td><strong>Avançado</strong></td><td>3-5 instrumentos não-correlacionados (ES, CL, GC, ZB)</td><td>Diversificação real entre asset classes</td></tr>
</tbody>
</table>

<h2>3. Timeframes — A Hierarquia que Ninguém Pode Ignorar</h2>
<p>Trader profissional opera em <strong>3 timeframes simultâneos</strong>:</p>

<table>
<thead><tr><th>Tipo</th><th>Função</th><th>Exemplo (day trader)</th></tr></thead>
<tbody>
<tr><td><strong>Macro</strong></td><td>Direção principal — onde estamos no ciclo</td><td>1h ou 4h</td></tr>
<tr><td><strong>Operacional</strong></td><td>Onde os setups acontecem</td><td>15min</td></tr>
<tr><td><strong>Micro</strong></td><td>Refina o timing de entrada</td><td>5min ou 1min</td></tr>
</tbody>
</table>

<p>Regra fundamental: <strong>operacional sempre a favor do macro</strong>. Macro em alta? Operacional só procura long. Brigar contra essa hierarquia é a maneira mais rápida de zerar conta.</p>

<h2>4. Critério de Entrada — A Definição Operacional do Setup</h2>
<p>"Vou comprar quando o gráfico mostrar força" — isso NÃO é critério de entrada. É torcida com vocabulário técnico.</p>
<p>Critério de entrada precisa ser <strong>binário</strong>: ou os elementos estão presentes ou não estão. Sem subjetividade.</p>

<h3>Exemplo de critério bem definido</h3>
<div class="callout callout-green">
<strong>Setup #1 — Pullback no Markup (long):</strong>
<ul style="margin-top:8px;">
<li>(a) Diário: SMA 50 acima da SMA 200 (regime bull)</li>
<li>(b) 1h: preço acima da EMA 20</li>
<li>(c) 15min: preço retrai pra EMA 20</li>
<li>(d) Aparece barra de queda PEQUENA com volume abaixo da média (no-supply)</li>
<li>(e) Próxima barra rompe a máxima da barra no-supply</li>
<li>(f) RSI(14) entre 35-65 (sem extremos perigosos)</li>
<li>(g) Não tem evento macro nas próximas 30min</li>
</ul>
Se TODOS os 7 critérios estão presentes: entra. Se UM falta: não entra.
</div>

<h2>5. Critério de Saída — A Outra Metade do Trade</h2>
<p>Saída é onde a maioria dos planos falha. Trader define entrada com cuidado mas "sai quando achar que tá bom". Não vai funcionar.</p>

<table>
<thead><tr><th>Tipo de saída</th><th>Quando usar</th><th>Como definir</th></tr></thead>
<tbody>
<tr><td><strong>Stop-loss inicial</strong></td><td>Sempre</td><td>Ponto técnico (abaixo de S/R, da no-supply, etc) — não palpite</td></tr>
<tr><td><strong>Take-profit fixo</strong></td><td>Setups com alvo definível (extensão Fib, próximo S/R)</td><td>RR mínimo 2:1</td></tr>
<tr><td><strong>Trailing stop</strong></td><td>Setups de continuação em tendência forte</td><td>1.5× ATR(14) abaixo da máxima recente</td></tr>
<tr><td><strong>Saída parcial</strong></td><td>Setups com 2 alvos (T1 / T2)</td><td>Fecha 50% no T1, deixa 50% rodar com trailing</td></tr>
<tr><td><strong>Saída por tempo</strong></td><td>Setups intraday que não andam</td><td>Se trade não anda em 15 barras, fecha</td></tr>
</tbody>
</table>

<h2>6. Gerenciamento de Risco — O Pilar que Sustenta Tudo</h2>

<table>
<thead><tr><th>Limite</th><th>Valor recomendado</th><th>Razão</th></tr></thead>
<tbody>
<tr><td><strong>Risco por trade</strong></td><td>0.25-0.5% da conta</td><td>Permite 200-400 trades antes de zerar (matematicamente)</td></tr>
<tr><td><strong>Perda diária máxima</strong></td><td>1.5% da conta (3 trades stopados)</td><td>Limita "tilt" emocional após perdas seguidas</td></tr>
<tr><td><strong>Perda semanal máxima</strong></td><td>3% da conta</td><td>Pausa pra revisão se semana foi ruim</td></tr>
<tr><td><strong>Drawdown máximo total</strong></td><td>10% da conta (em conta pessoal)</td><td>Em prop firm: respeite o limite da firma estritamente</td></tr>
<tr><td><strong>Trades simultâneos</strong></td><td>1-2 (iniciante), 3-5 (avançado)</td><td>Mais que isso e você perde controle</td></tr>
</tbody>
</table>

<div class="callout callout-red">
<strong>Regra absoluta:</strong> ao bater perda diária máxima, FECHA tudo e desliga a tela. Não importa que o setup "perfeito" apareça. Não importa o "feeling". Mercado abre amanhã. Sua conta TEM que abrir amanhã.
</div>

<h2>7. Position Sizing — A Matemática que Decide Antes do Mercado</h2>
<p>Tamanho de posição não é "intuição". É cálculo:</p>
<p style="background:#1a1f2c;padding:14px;border-radius:8px;font-family:monospace;font-size:14px;">
<strong>Contracts = (Account × Risk%) / (Stop Pontos × $/Ponto)</strong>
</p>

<h3>Exemplo prático</h3>
<ul>
<li>Conta: $50.000</li>
<li>Risco por trade: 0.5% = $250</li>
<li>Instrumento: NQ ($5/ponto)</li>
<li>Stop em pontos: 20</li>
<li>Position: $250 / (20 × $5) = $250 / $100 = <strong>2.5 contratos</strong> → arredonda para 2</li>
</ul>

<div class="callout callout-blue">
<strong>Use a fórmula religiosamente.</strong> Calcule antes de cada trade. Não estime. Não "ah, vou de 3 mesmo". A fórmula te protege contra você mesmo.
</div>

<h2>8. Stop-Loss — Onde Tudo Começa</h2>
<p>Stop não é "o preço onde paro de aceitar perda". Stop é "o preço onde minha tese sobre o mercado fica matematicamente errada". Diferença filosófica enorme — e financeira ainda maior.</p>

<table>
<thead><tr><th>Tipo de stop</th><th>Onde colocar</th><th>Quando usar</th></tr></thead>
<tbody>
<tr><td><strong>Estrutural</strong></td><td>Abaixo do último S/R relevante</td><td>Setups baseados em estrutura de mercado</td></tr>
<tr><td><strong>Por volatilidade</strong></td><td>1.5× ATR abaixo do preço de entrada</td><td>Setups em mercado volátil sem S/R claro</td></tr>
<tr><td><strong>Por padrão</strong></td><td>Abaixo da mínima do padrão (martelo, no-supply, engolfo)</td><td>Setups baseados em padrões clássicos</td></tr>
<tr><td><strong>Por tempo</strong></td><td>Fechar após X barras se não andar</td><td>Setups intraday rápidos</td></tr>
</tbody>
</table>

<h3>Erros mortais com stops</h3>
<ul>
<li><strong>Mover stop pra dentro do prejuízo</strong> ("vai voltar..."). Nunca. NUNCA.</li>
<li><strong>Operar sem stop físico</strong>. Mental stop é mito.</li>
<li><strong>Stops em números redondos</strong>. Algoritmos varrem ali. Use 1.245.10 em vez de 1.245.00.</li>
<li><strong>Stop muito apertado</strong> (&lt; 0.5× ATR). Vira ruído normal stopando você.</li>
</ul>

<h2>9. Rotina Diária — A Disciplina que Ninguém Vê</h2>

<table>
<thead><tr><th>Momento</th><th>Atividade</th><th>Tempo</th></tr></thead>
<tbody>
<tr><td><strong>Pre-market (1h antes do open)</strong></td><td>Calendário macro, notícias overnight, gap analysis, SR levels do dia</td><td>30-45min</td></tr>
<tr><td><strong>Open (primeiros 15min)</strong></td><td>Observar reação, confirmar bias, NÃO operar imediatamente</td><td>15min</td></tr>
<tr><td><strong>Sessão prime (9:45-11:30 ET)</strong></td><td>Operar setups limpos. Máximo 3-5 trades.</td><td>~2h</td></tr>
<tr><td><strong>Almoço institucional (11:30-13:30 ET)</strong></td><td>NÃO operar. Comer. Andar. Resetar.</td><td>2h</td></tr>
<tr><td><strong>Power hour (15:00-16:00 ET)</strong></td><td>Setups de fechamento. Cuidado com posicionamento institucional.</td><td>1h</td></tr>
<tr><td><strong>Pós-mercado</strong></td><td>Journal de trades, revisão, screenshot dos setups que NÃO operei</td><td>30min</td></tr>
</tbody>
</table>

<h2>10. Regras de Filtro — Quando NÃO Operar</h2>
<p>Trader profissional não opera todo dia. Filtros eliminam dias estatisticamente ruins:</p>

<table>
<thead><tr><th>Condição</th><th>Decisão</th></tr></thead>
<tbody>
<tr><td>FOMC, NFP ou CPI no dia (5min antes / 15min depois)</td><td>NÃO opera</td></tr>
<tr><td>ADX no operacional &lt; 20 (mercado em range sem direção)</td><td>NÃO opera (a menos que tenha estratégia específica de range)</td></tr>
<tr><td>Já bateu perda diária máxima</td><td>FECHA tudo, desliga</td></tr>
<tr><td>Sem dormir bem (&lt; 6h) ou estado emocional alterado</td><td>NÃO opera</td></tr>
<tr><td>Não consegue ler o mercado claramente</td><td>NÃO opera. "Não entendo" é sinal pra ficar fora.</td></tr>
<tr><td>Operou perdendo última hora — quer "recuperar"</td><td>NÃO opera. Mentalidade de revanche destroi.</td></tr>
<tr><td>Volume muito baixo (sexta tarde, feriado americano, véspera)</td><td>NÃO opera. Slippage e ranges erráticos.</td></tr>
</tbody>
</table>

<div class="callout callout-red">
<strong>Os 7 NÃO acima são absolutos.</strong> Se um deles está presente, fora. Trader que abre exceção pra um, abre pra todos. E quem abre pra todos, perde tudo.
</div>

<h2>11. Journal de Trades — O Espelho que Não Mente</h2>
<p>Sem journal, você não sabe o que funciona e o que não funciona. Cada trade precisa ser registrado com:</p>

<table>
<thead><tr><th>Campo</th><th>Conteúdo</th></tr></thead>
<tbody>
<tr><td>Data e hora</td><td>Quando o trade foi aberto</td></tr>
<tr><td>Instrumento</td><td>NQ, ES, CL, GC, etc</td></tr>
<tr><td>Direção</td><td>Long ou short</td></tr>
<tr><td>Setup</td><td>Nome do setup (ex: "Pullback markup")</td></tr>
<tr><td>Critérios atendidos?</td><td>Lista de checks (binário sim/não)</td></tr>
<tr><td>Entrada / Stop / Alvo</td><td>Preços</td></tr>
<tr><td>Tamanho</td><td>Número de contratos</td></tr>
<tr><td>Risco em $</td><td>Quanto está perdendo se stop tocar</td></tr>
<tr><td>Resultado</td><td>+ ou - $X</td></tr>
<tr><td>RR realizado</td><td>1:1.8 (por exemplo)</td></tr>
<tr><td>Screenshot do setup</td><td>Print do gráfico com marcações</td></tr>
<tr><td>Estado emocional pré-trade</td><td>Calmo, ansioso, "tilt", etc</td></tr>
<tr><td>Notas pós-trade</td><td>O que aprendi? O que faria diferente?</td></tr>
</tbody>
</table>

<div class="callout callout-blue">
<strong>Ferramentas pra journal:</strong> TraderVue, TradesViz (planos pagos), Notion ou planilha Google (grátis). O importante não é a ferramenta — é a disciplina de fazer todo dia.
</div>

<h2>12. Revisão e Evolução do Plano</h2>

<table>
<thead><tr><th>Frequência</th><th>Atividade</th><th>Foco</th></tr></thead>
<tbody>
<tr><td><strong>Diária (15min)</strong></td><td>Revisar trades do dia no journal</td><td>O que funcionou? O que falhou? Por quê?</td></tr>
<tr><td><strong>Semanal (1h)</strong></td><td>Estatísticas: WR, Avg Win, Avg Loss, expectância</td><td>Setups que estão performando bem vs mal</td></tr>
<tr><td><strong>Mensal (3h)</strong></td><td>Análise de drawdown, conformidade com plano</td><td>Está seguindo as regras? Onde está burlando?</td></tr>
<tr><td><strong>Trimestral (1 dia inteiro)</strong></td><td>Revisão e ajuste do plano completo</td><td>Atualizar critérios baseado em resultado de 60-90 dias</td></tr>
</tbody>
</table>

<h2>Template de Plano de Trading Para Prop Firm</h2>

<div class="callout callout-gold">
<strong>Plano base — Prop Firm Apex 50K Funded:</strong><br><br>
<strong>1. Objetivo:</strong> Atingir profit target de $3.000 em 30-60 dias respeitando drawdown de $2.500.<br><br>
<strong>2. Mercado:</strong> NQ (E-mini Nasdaq) — micros (MNQ) primeiros 50 trades, depois mini.<br><br>
<strong>3. Timeframes:</strong> Macro 1h, Operacional 15min, Micro 5min.<br><br>
<strong>4. Setup principal:</strong> Pullback no markup (regras 7 itens acima).<br><br>
<strong>5. Saídas:</strong> Stop estrutural; alvo extensão Fib 1.272 ou +50 ticks; trailing 1.5× ATR após +30 ticks.<br><br>
<strong>6. Risco:</strong> 0.5% por trade ($250 numa conta de $50k). Max 3 trades/dia. Max perda $750/dia. Max perda $2.000/semana.<br><br>
<strong>7. Position size:</strong> Calculado pela fórmula. Stop em pontos × $5 (NQ) ≤ $250.<br><br>
<strong>8. Stop:</strong> abaixo da mínima da barra no-supply. Ajustado pra breakeven após +20 ticks.<br><br>
<strong>9. Rotina:</strong> 9:30-11:30 ET (sessão prime). 15:00-16:00 ET (power hour). Resto do dia: NÃO opera.<br><br>
<strong>10. NÃO opera se:</strong> (a) calendário tem FOMC/NFP/CPI; (b) ADX &lt;20 no 15min; (c) já perdeu $750 hoje; (d) dormiu &lt;6h; (e) sexta-feira tarde.<br><br>
<strong>11. Journal:</strong> TradesViz. Toda operação registrada com screenshot. Revisão semanal aos domingos.<br><br>
<strong>12. Revisão:</strong> Plano revisado a cada 30 trades ou se WR cair abaixo de 50% por 20 trades.
</div>

<h2>Erros Mais Comuns na Construção do Plano</h2>

<h3>Plano teórico em vez de operacional</h3>
<p>"Operar com disciplina, gestão de risco e psicologia controlada." Lindo. Inútil. Plano precisa ser específico ao ponto de outra pessoa conseguir executar.</p>

<h3>Critérios subjetivos disfarçados de objetivos</h3>
<p>"Comprar quando o gráfico mostrar força" — não é critério. "Comprar quando preço fizer pullback de 50% pra EMA 20 com volume decrescente e RSI &gt;40" — é critério.</p>

<h3>Não revisar</h3>
<p>Plano escrito uma vez e nunca lido vira ficção. Toda semana, releia 5 minutos. Toda mês, revise estatística. Toda trimestre, ajuste.</p>

<h3>Mudar plano após perda</h3>
<p>Você teve 3 perdas seguidas. Quer mudar tudo? PARE. Plano precisa ser testado em 100+ trades antes de mudar. 3 perdas é amostra estatisticamente irrelevante.</p>

<h3>Plano sem regras de "NÃO operar"</h3>
<p>Plano que diz só quando entrar é metade do plano. A outra metade é quando ficar fora. Se seu plano não tem 5+ filtros de "não", está incompleto.</p>

<div class="callout callout-red">
<strong>Erro fatal:</strong> ter o plano e ignorar quando o mercado "parece bom demais pra perder a oportunidade". Esse momento — o do "FOMO setup que não está no plano" — é exatamente onde a maioria das contas morre.
</div>

<h2>O Que Muda na Sua Mesa Amanhã</h2>
<p><strong>Primeiro:</strong> você vai escrever seu plano. De verdade. Em arquivo físico (Notion, Google Doc, papel). Vai parecer trabalho. Vai parecer chato. Em 90 dias, vai te separar dos amadores que ainda operam por intuição.</p>
<p><strong>Segundo:</strong> você vai começar journal. Cada trade, mesmo os perdedores. Especialmente os perdedores. Em 100 trades, padrões de comportamento vão emergir que você não imaginava.</p>
<p><strong>Terceiro:</strong> você vai operar menos. Filtros eliminam dias. Filtros eliminam setups ambíguos. Você vai descobrir que operava o triplo do que devia — e isso era o problema.</p>

<div class="callout callout-gold">
<strong>Checklist final do plano:</strong>
<ul style="margin-top:8px;">
<li>1. Tenho objetivo SMART escrito?</li>
<li>2. Tenho 1-3 instrumentos definidos (não "tudo que for líquido")?</li>
<li>3. Meu setup tem 5+ critérios binários?</li>
<li>4. Tenho stop estrutural definido por regra (não por palpite)?</li>
<li>5. Tenho alvo definido por regra (não "vamos ver até onde vai")?</li>
<li>6. Tenho risco por trade calculado (em $ ou em %)?</li>
<li>7. Tenho 5+ regras de "NÃO opero quando..."?</li>
<li>8. Tenho ferramenta de journal escolhida e configurada?</li>
<li>9. Tenho horário fixo de revisão (semanal e mensal)?</li>
<li>10. Imprimo o plano e mantenho ao lado da tela?</li>
</ul>
</div>

<h2>Leituras Recomendadas</h2>
<ul>
<li><strong>Trading in the Zone</strong> — Mark Douglas. A psicologia por trás de seguir um plano.</li>
<li><strong>The Disciplined Trader</strong> — Mark Douglas. Antecessor de "Trading in the Zone" — mais técnico em disciplina.</li>
<li><strong>The Daily Trading Coach</strong> — Brett Steenbarger. 101 lições aplicáveis ao trabalho diário.</li>
<li><strong>Trading for a Living</strong> — Alexander Elder. Tripé sistema + risco + psicologia.</li>
<li><strong>Best Loser Wins</strong> — Tom Hougaard. Sobre psicologia de perda profissional.</li>
<li><strong>Market Wizards</strong> — Jack Schwager. Os melhores traders do mundo descrevem seus planos.</li>
<li><strong>The Inner Voice of Trading</strong> — Michael Martin. A relação entre disciplina interna e plano externo.</li>
</ul>

<hr>

<p><em>Para combinar plano de trading com regras específicas de prop firm, leia também o <a href="/guides/gerenciamento-drawdown">guia de gerenciamento de drawdown</a> e o <a href="/guides/como-passar-no-desafio">como passar no desafio</a>.</em></p>
`.trim();

const stats = writeArticle(meta, body);
console.log('Plano de Trading:', JSON.stringify(stats, null, 2));
