// ─── SUPABASE CONFIG ───
// ─── SUPABASE CONFIG ─── replace with your project values ───────────────────
const SUPABASE_URL  = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { storageKey: 'mc-user-auth' }
});
// ────────────────────────────────────────────────────────────────────────────

// Session ID único por visita (não persiste entre abas)
const MC_SESSION = sessionStorage.getItem('mc_sid') || (()=>{
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'sid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  sessionStorage.setItem('mc_sid', id);
  return id;
})();

// Capturar UTMs da URL uma vez e guardar na sessão
const MC_UTM = (()=>{
  const stored = sessionStorage.getItem('mc_utm');
  if (stored) return JSON.parse(stored);
  const p = new URLSearchParams(window.location.search);
  const utm = {
    utm_source:   p.get('utm_source')   || document.referrer && new URL(document.referrer).hostname || '',
    utm_medium:   p.get('utm_medium')   || '',
    utm_campaign: p.get('utm_campaign') || '',
    utm_content:  p.get('utm_content')  || '',
    utm_term:     p.get('utm_term')     || '',
    referrer:     document.referrer     || '',
  };
  sessionStorage.setItem('mc_utm', JSON.stringify(utm));
  return utm;
})();

// ─── TRACKING & UTILS ───
// Security: HTML escape for user-submitted data
function escHtml(s){ if(s==null) return '—'; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
// Rate limiter: prevents spam submissions on forms
const _rl = {};
function rateLimit(key, cooldownMs) {
  const now = Date.now();
  if (_rl[key] && now - _rl[key] < cooldownMs) return false;
  _rl[key] = now;
  return true;
}

// Central tracking — Supabase + GTM + GA4 + Facebook Pixel + localStorage cache
function track(event, params={}) {
  const ts = new Date().toISOString();

  // 1. Supabase (analytics persistente com UTM)
  try {
    db.from('events').insert({
      session_id:   MC_SESSION,
      event,
      firm_id:      params.firm_id      || params.firm_name || null,
      coupon_code:  params.coupon_code  || null,
      page_name:    params.page_name    || null,
      utm_source:   MC_UTM.utm_source,
      utm_medium:   MC_UTM.utm_medium,
      utm_campaign: MC_UTM.utm_campaign,
      params,
    }).then(r=>{ if(r.error) console.warn('track insert error:', r.error.message); });
  } catch(e) { console.warn('track error:', e); }

  // 2. localStorage cache (fallback offline + compatibilidade admin)
  try {
    const evs = JSON.parse(localStorage.getItem('mc_events')||'[]');
    evs.push({ event, params, ts });
    if(evs.length > 500) evs.splice(0, evs.length - 500);
    localStorage.setItem('mc_events', JSON.stringify(evs));
  } catch(e) {}

  // 3. GTM dataLayer — GA4 and Facebook Pixel triggers are configured inside GTM
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params, timestamp: ts });
}

// Geo: fetch once per session, enrich events
let _geo = null;
async function fetchGeo() {
  if (_geo) return _geo;
  const cached = sessionStorage.getItem('mc_geo');
  if (cached) { _geo = JSON.parse(cached); return _geo; }
  try {
    const r = await fetch('https://ipinfo.io/json');
    const d = await r.json();
    _geo = { geo_country: d.country||'', geo_region: d.region||'', geo_city: d.city||'', geo_timezone: d.timezone||'' };
    sessionStorage.setItem('mc_geo', JSON.stringify(_geo));
    // Store geo event in Supabase
    db.from('events').insert({ session_id: MC_SESSION, event: 'geo_detected', params: _geo }).then(()=>{});
  } catch(e) { _geo = {}; }
  return _geo;
}

// ─── MAIN APP ───
/* DATA */
const FIRMS=[
  {id:'apex',name:'Apex Trader Funding',type:'Futuros',color:'#F97316',bg:'rgba(249,115,22,0.12)',icon:'A',icon_url:'img/Firms/apex.png',rating:4.4,reviews:18382,discount:90,dtype:'lifetime',coupon:'MARKET',badge:{label:'Maior Desconto',color:'#F97316',bg:'rgba(249,115,22,0.15)'},link:'https://apextraderfunding.com/member/aff/go/evertonmiranda',tags:['Futuros','Lifetime','Trailing DD'],platforms:['Rithmic','Tradovate','NinjaTrader','WealthCharts'],minDays:1,evalDays:30,drawdown:'Trailing/EOD',split:'100%',ddPct:'-5% trail',target:'8%',scaling:'Sim',prices:[{a:'25K Intraday',n:'$19.90',o:'$199',n2:'$29.90',o2:'$299'},{a:'50K Intraday',n:'$22.90',o:'$229',n2:'$32.90',o2:'$329'},{a:'100K Intraday',n:'$32.90',o:'$329',n2:'$52.90',o2:'$529'},{a:'150K Intraday',n:'$43.90',o:'$439',n2:'$63.90',o2:'$639'}],price_types:['Intraday','EOD'],perks:['Sem limite diario','Sem regra escalamento','Payout 5 dias','Ate 20 contas','Sem taxas recorrentes'],proibido:['Copy entre contas','Latency arbitrage'],newsTrading:true,day1Payout:true,desc:'Apex Trader Funding e uma das maiores prop firms de futuros dos EUA. Conhecida pelos descontos agressivos e flexibilidade nas regras.',trustpilot:{score:4.4,reviews:18382,url:'https://www.trustpilot.com/review/apextraderfunding.com'}},
  {id:'bulenox',name:'Bulenox',type:'Futuros',color:'#3B82F6',bg:'rgba(59,130,246,0.12)',icon:'B',icon_url:'img/Firms/bulenox.png',rating:4.8,reviews:1516,discount:89,dtype:'lifetime',coupon:'MARKET89',badge:{label:'Melhor Split 90%',color:'#3B82F6',bg:'rgba(59,130,246,0.15)'},link:'https://bulenox.com/member/aff/go/marketcoupons',tags:['Futuros','Lifetime','1 dia'],platforms:['Rithmic','NinjaTrader','Tradovate'],minDays:1,evalDays:null,drawdown:'Trailing',split:'90%',ddPct:'Por conta',target:'Variavel',scaling:'Sim',prices:[{a:'10K',n:'$10.45',o:'$95'},{a:'25K',n:'$15.95',o:'$145'},{a:'50K',n:'$19.25',o:'$175'},{a:'100K',n:'$23.65',o:'$215'},{a:'150K',n:'$35.75',o:'$325'}],perks:['Passa em 1 dia','Sem consistencia','Trade noticias','Payouts semanais','Scaling ate $400K','Sem taxa mensal'],proibido:['Latency arbitrage'],newsTrading:true,day1Payout:true,desc:'Bulenox e uma prop firm de futuros com regras simplificadas. Possivel passar em 1 dia, sem regra de consistencia.',trustpilot:{score:4.8,reviews:1516,url:'https://www.trustpilot.com/review/bulenox.com'}},
  {id:'ftmo',name:'FTMO',type:'Forex',color:'#22C55E',bg:'rgba(34,197,94,0.12)',icon:'F',icon_url:'img/Firms/ftmo.png',rating:4.8,reviews:41073,discount:0,dtype:null,coupon:null,badge:{label:'Líder Forex',color:'#22C55E',bg:'rgba(34,197,94,0.15)'},link:'https://trader.ftmo.com/?affiliates=eyfIptUCGgfcfaUlyrRP',tags:['Forex','Free Trial','90% Split'],platforms:['MT4','MT5','cTrader','DXtrade'],minDays:4,evalDays:30,drawdown:'Trailing/Fixed',split:'90%',ddPct:'-5%/-10%',target:'8%/5%',scaling:'Ate $2M',prices:[{a:'10K',n:'€155',o:'—'},{a:'25K',n:'€250',o:'—'},{a:'50K',n:'€345',o:'—'},{a:'100K',n:'€540',o:'—'},{a:'200K',n:'€1.080',o:'—'}],perks:['Free Trial ilimitado','90% split','Suporte 20 idiomas','$500M+ pagos','Scaling ate $2M','Sem limite de tempo'],proibido:['Latency arbitrage','Manipulacao spread'],newsTrading:false,day1Payout:false,desc:'FTMO e a maior prop firm de Forex do mundo, fundada em 2015. Mais de 3,5M de clientes e $500M+ pagos.',trustpilot:{score:4.8,reviews:41073,url:'https://www.trustpilot.com/review/ftmo.com'}},
  {id:'tpt',name:'Take Profit Trader',type:'Futuros',color:'#A855F7',bg:'rgba(168,85,247,0.12)',icon:'T',icon_url:'img/Firms/tpt.png',rating:4.4,reviews:8848,discount:40,dtype:'lifetime',coupon:'MARKET40',link:'https://takeprofittrader.com/?referralCode=MARKET40',tags:['Futuros','Lifetime','Saque dia 1'],platforms:['Tradovate','TradingView','Rithmic','NinjaTrader'],minDays:4,evalDays:null,drawdown:'End-of-Day',split:'80%',ddPct:'EOD',target:'Variavel',scaling:'Sim',prices:[{a:'25K',n:'$90',o:'$150'},{a:'50K',n:'$102',o:'$170'},{a:'75K',n:'$147',o:'$245'},{a:'100K',n:'$198',o:'$330'},{a:'150K',n:'$216',o:'$360'}],perks:['Saque desde dia 1','Sem taxa ativacao','Sem limite diario','Ate 3 saques/mes'],proibido:['Manipulacao spread'],newsTrading:false,day1Payout:true,desc:'Take Profit Trader destaca-se pelo saque desde o primeiro dia e sem taxa de ativacao.',trustpilot:{score:4.4,reviews:8848,url:'https://www.trustpilot.com/review/takeprofittrader.com'}},
  {id:'fn',name:'FundedNext',type:'Futuros',color:'#06B6D4',bg:'rgba(6,182,212,0.12)',icon:'N',icon_url:'img/Firms/fn.png',rating:4.5,reviews:63736,discount:30,dtype:'1 desafio',coupon:'FNF30',badge:{label:'Mais Avaliações',color:'#06B6D4',bg:'rgba(6,182,212,0.15)'},link:'https://fundednext.com/?fpr=everton33',tags:['Futuros','Payout 24h','Sem limite'],platforms:['MT4','MT5','cTrader','Match-Trader'],minDays:1,evalDays:null,drawdown:'Fixed',split:'95%',ddPct:'Fixo',target:'Variavel',scaling:'Ate $4M',prices:[{a:'6K Evaluation',n:'$48.99',o:'$69.99'},{a:'15K Evaluation',n:'$83.99',o:'$119.99'},{a:'25K Evaluation',n:'$132.99',o:'$189.99'},{a:'50K Evaluation',n:'$188.99',o:'$269.99'},{a:'100K Evaluation',n:'$349.99',o:'$499.99'}],perks:['Payout garantido 24h','Sem limite de tempo','$1K compensacao atraso','Ate 95% split','Scaling ate $4M','15% lucro avaliacao'],proibido:['Latency arbitrage'],newsTrading:true,day1Payout:true,desc:'FundedNext com 400K+ contas e $274M+ pagos. Destaque para payout garantido em 24h.',trustpilot:{score:4.5,reviews:63736,url:'https://www.trustpilot.com/review/fundednext.com'}},
  {id:'e2t',name:'Earn2Trade',type:'Futuros',color:'#F59E0B',bg:'rgba(245,158,11,0.12)',icon:'E',icon_url:'img/Firms/e2t.png',rating:4.7,reviews:4721,discount:60,dtype:'career path',coupon:'MARKETSCOUPONS',badge:{label:'Scaling $400K',color:'#F59E0B',bg:'rgba(245,158,11,0.15)'},link:'https://www.earn2trade.com/purchase?plan=TCP25&a_pid=marketscoupons&a_bid=2e8e8a14',tags:['Futuros','Journalytix','Scaling $400K'],platforms:['Rithmic','NinjaTrader','Tradovate'],minDays:10,evalDays:null,drawdown:'EOD Fixed',split:'80%',ddPct:'TCP100: $3.500',target:'TCP100: $6.000',scaling:'Ate $400K',prices:[{a:'TCP25',n:'$60',o:'$150'},{a:'TCP50',n:'$76',o:'$190'},{a:'TCP100',n:'$140',o:'$350'},{a:'Gauntlet 50K',n:'$68',o:'$170'},{a:'Gauntlet 100K',n:'$126',o:'$315'}],perks:['Journalytix gratis','Reset gratis','Scaling ate $400K','Sem taxa mensal','Educacao inclusa'],proibido:['HFT','Latency arbitrage'],newsTrading:false,day1Payout:false,desc:'Earn2Trade foca em educacao e desenvolvimento com escalamento ate $400K.',trustpilot:{score:4.7,reviews:4721,url:'https://www.trustpilot.com/review/www.earn2trade.com'}},
  {id:'the5ers',name:'The5ers',type:'Forex',color:'#10B981',bg:'rgba(16,185,129,0.12)',icon:'5',icon_url:'img/Firms/the5ers.png',rating:4.7,reviews:22584,discount:0,dtype:null,coupon:null,badge:{label:'Desde 2016',color:'#10B981',bg:'rgba(16,185,129,0.15)'},link:'https://www.the5ers.com/?afmc=19jp',tags:['Forex','Scaling $4M','Static DD'],platforms:['MT5'],minDays:3,evalDays:null,drawdown:'Static',split:'100%',ddPct:'-10% total / -5% diario',target:'10%/5%',scaling:'Ate $4M',prices:[{a:'$5K Hyper Growth',n:'$39',o:'—'},{a:'$10K Hyper Growth',n:'$85',o:'—'},{a:'$20K Hyper Growth',n:'$175',o:'—'},{a:'$100K 2-Step',n:'$491',o:'—'},{a:'$250K 2-Step',n:'$1125',o:'—'}],perks:['Scaling ate $4M','Profit Split ate 100%','Payout medio 16h','Alavancagem 1:100','Sem limite de tempo','Dashboard avancado'],proibido:['Inatividade 30 dias','Mais de 4 contas ativas'],newsTrading:true,day1Payout:false,desc:'The5ers e uma das mais antigas prop firms (desde 2016). Plano de escala ate $4M, Bootcamp com entrada desde $95 para conta de $100K. 262K+ traders.',trustpilot:{score:4.7,reviews:22584,url:'https://www.trustpilot.com/review/the5ers.com'}},
  {id:'fundingpips',name:'Funding Pips',type:'Forex',color:'#6366F1',bg:'rgba(99,102,241,0.12)',icon:'P',icon_url:'img/Firms/fundingpips.png',rating:4.5,reviews:51305,discount:20,dtype:'1 compra',coupon:'31985EAA',badge:{label:'$200M+ Pagos',color:'#6366F1',bg:'rgba(99,102,241,0.15)'},link:'https://app.fundingpips.com/register?ref=31985EAA',tags:['Forex','100% Split','3 Plataformas'],platforms:['MT5','Match-Trader','cTrader'],minDays:3,evalDays:null,drawdown:'Static',split:'100%',ddPct:'-10% total / -5% diario',target:'8%/5%',scaling:'Sim',prices:[{a:'$5K',n:'$28.80',o:'$36'},{a:'$10K',n:'$52.80',o:'$66'},{a:'$25K',n:'$119.20',o:'$149'},{a:'$50K',n:'$199.20',o:'$249'},{a:'$100K',n:'$423.20',o:'$529'}],perks:['Split flexivel: 60-100%','$200M+ pagos globalmente','Alavancagem 1:100','Comunidade Discord ativa','Sem limite de tempo','Payout sob demanda'],proibido:['HFT','Latency arbitrage'],newsTrading:true,day1Payout:false,desc:'Funding Pips e uma das mesas mais populares do mundo. Pagamentos rapidos com split flexivel ate 100% mensal. $200M+ pagos globalmente.',trustpilot:{score:4.5,reviews:51305,url:'https://www.trustpilot.com/review/fundingpips.com'}},
  {id:'brightfunded',name:'BrightFunded',type:'Forex',color:'#00C9A7',bg:'#000000',icon:'B',icon_url:'img/Firms/brightfunded.png',rating:4.2,reviews:528,discount:20,dtype:'easter',coupon:'CLNLTPxtT4Sok0PzHaRIIQ',badge:{label:'Payout 24h',color:'#00C9A7',bg:'rgba(0,201,167,0.15)'},link:'https://brightfunded.com/a/CLNLTPxtT4Sok0PzHaRIIQ',tags:['Forex','Static DD','100% Split'],platforms:['MT5','DXtrade','cTrader'],minDays:5,evalDays:null,drawdown:'Static',split:'100%',ddPct:'-10% total / -5% diario',target:'8%/5%',scaling:'Sem limite',prices:[{a:'$5K',n:'€36',o:'€45'},{a:'$10K',n:'€68',o:'€85'},{a:'$25K',n:'€132',o:'€165'},{a:'$50K',n:'€228',o:'€285'},{a:'$100K',n:'€396',o:'€495'},{a:'$200K',n:'€756',o:'€945'}],perks:['Scaling ate 100% split','Drawdown estatico','Payout garantido 24h ciclo 7 dias','15% bonus lucro avaliacao','Trade2Earn (pontos por operar)','Alavancagem 1:100','Suporte 24/7'],proibido:['Arbitragem','Hedging entre contas','Grid trading','HFT'],newsTrading:true,day1Payout:false,desc:'BrightFunded destaca-se pela experiencia moderna e programa Trade2Earn. Drawdown estatico, scaling ate 100% split, payout em 24h. 150+ instrumentos.',trustpilot:{score:4.2,reviews:528,url:'https://www.trustpilot.com/review/brightfunded.com'}},
];

/* ═══ FIRM DETAIL — Background images & About data ═══ */
const FIRM_BG={
  apex:'img/apex-bg.webp',bulenox:'img/bulenox-bg.webp',ftmo:'img/ftmo-bg.webp',
  tpt:'img/tpt-bg.webp',fn:'img/fn-bg.webp',e2t:'img/e2t-bg.webp',
  the5ers:'img/the5ers-bg.webp',fundingpips:'img/fundingpips-bg.webp',brightfunded:'img/brightfunded-bg.webp'
};
const FIRM_ABOUT={
  apex:{about:'Fundada em <b>2021</b> por Darrell Martin em Austin, Texas. A Apex é a <b>6ª prop firm mais buscada do mundo</b> com 4.2M de visitas mensais. Taxa de aprovação de <b>15-20%</b> — 2x a média do setor.',highlights:[{val:'$721M+',label:'Pagos a traders'},{val:'$85M+',label:'Últimos 90 dias'},{val:'100%',label:'Do lucro (2026)'}],
    types:['Intraday Trail','EOD Trail'],plans:{'Intraday Trail':[{s:'25K',d:'$19.90',o:'$199'},{s:'50K',d:'$22.90',o:'$229'},{s:'100K',d:'$32.90',o:'$329',pop:1},{s:'150K',d:'$43.90',o:'$439'}],'EOD Trail':[{s:'25K',d:'$29.90',o:'$299'},{s:'50K',d:'$32.90',o:'$329'},{s:'100K',d:'$52.90',o:'$529',pop:1},{s:'150K',d:'$63.90',o:'$639'}]},
    includes:['Sem limite de perda diaria','Sem regra de escalamento','Licenca NinjaTrader','Dados em tempo real','Copy Trader (WealthCharts)','Suporte 24/7']},
  bulenox:{about:'Fundada em <b>2022</b>. Crescimento de <b>500%</b> em tráfego ano a ano. Regras simplificadas — possível passar em <b>1 dia</b>, sem regra de consistência.',highlights:[{val:'90%',label:'Profit Split'},{val:'1 dia',label:'Para passar'},{val:'$0',label:'Taxa mensal'}],
    types:['Trailing DD','EOD DD'],plans:{'Trailing DD':[{s:'25K',d:'$15.95',o:'$145'},{s:'50K',d:'$19.25',o:'$175'},{s:'100K',d:'$23.65',o:'$215',pop:1},{s:'150K',d:'$35.75',o:'$325'},{s:'250K',d:'$48.15',o:'$535'}],'EOD DD':[{s:'25K',d:'$15.95',o:'$145'},{s:'50K',d:'$19.25',o:'$175'},{s:'100K',d:'$23.65',o:'$215',pop:1},{s:'150K',d:'$35.75',o:'$325'},{s:'250K',d:'$48.15',o:'$535'}]},
    includes:['Passa em 1 dia','Sem consistencia','Trade durante noticias','Payouts semanais','Trial 14 dias gratis']},
  ftmo:{about:'Fundada em <b>2015</b> em Praga, República Tcheca. A FTMO é a <b>maior prop firm de Forex do mundo</b>. Mais de <b>3.5M de clientes</b> em 140+ países. Equipe de 300+ profissionais.',highlights:[{val:'$500M+',label:'Pagos a traders'},{val:'3.5M+',label:'Clientes'},{val:'10 anos',label:'No mercado'}],
    types:['2-Step Challenge','1-Step Challenge'],plans:{'2-Step Challenge':[{s:'10K',d:'€155',o:'—'},{s:'25K',d:'€250',o:'—'},{s:'50K',d:'€345',o:'—'},{s:'100K',d:'€540',o:'—',pop:1},{s:'200K',d:'€1.080',o:'—'}],'1-Step Challenge':[{s:'10K',d:'€155',o:'—'},{s:'25K',d:'€250',o:'—'},{s:'50K',d:'€345',o:'—'},{s:'100K',d:'€540',o:'—',pop:1},{s:'200K',d:'€1.080',o:'—'}]},
    includes:['Free Trial ilimitado','90% split de lucro','Suporte 20 idiomas','Scaling ate $2M','$500M+ pagos','Sem limite de tempo']},
  tpt:{about:'Fundada em <b>2021</b> por James Sixsmith (ex-jogador profissional de hockey). Taxa de sucesso anual de <b>20.37%</b>. Saque desde o <b>dia 1</b>, sem taxa de ativação.',highlights:[{val:'20.4%',label:'Taxa de sucesso'},{val:'Dia 1',label:'Primeiro saque'},{val:'$0',label:'Taxa ativação'}],
    types:['EOD Drawdown'],plans:{'EOD Drawdown':[{s:'25K',d:'$90',o:'$150'},{s:'50K',d:'$102',o:'$170'},{s:'75K',d:'$147',o:'$245'},{s:'100K',d:'$198',o:'$330',pop:1},{s:'150K',d:'$216',o:'$360'}]},
    includes:['Saque desde dia 1','Sem taxa ativacao','Sem limite diario','EOD Drawdown']},
  fn:{about:'Fundada em <b>2022</b> nos Emirados Árabes. <b>Prop Firm do Ano</b> (Finance Magnates 2025). Mais de <b>200K traders ativos</b> e payout garantido em 24h.',highlights:[{val:'$271M+',label:'Pagos a traders'},{val:'95K+',label:'Traders pagos'},{val:'24h',label:'Payout garantido'}],
    types:['Evaluation'],plans:{'Evaluation':[{s:'6K',d:'$48.99',o:'$69.99'},{s:'15K',d:'$83.99',o:'$119.99'},{s:'25K',d:'$132.99',o:'$189.99'},{s:'50K',d:'$188.99',o:'$269.99',pop:1},{s:'100K',d:'$349.99',o:'$499.99'}]},
    includes:['Payout garantido 24h','Sem limite de tempo','$1K compensacao atraso','Ate 95% split','Scaling ate $4M','15% lucro avaliacao']},
  e2t:{about:'Fundada em <b>2016</b>, celebrando <b>10 anos</b> em 2026. Foco em educação e desenvolvimento. Taxa de aprovação de <b>10.42%</b> — acima da média do setor. Escalamento até $400K.',highlights:[{val:'10 anos',label:'No mercado'},{val:'$400K',label:'Scaling máximo'},{val:'10.4%',label:'Taxa aprovação'}],
    types:['Trader Career Path','Gauntlet Mini'],plans:{'Trader Career Path':[{s:'TCP25',d:'$60',o:'$150'},{s:'TCP50',d:'$76',o:'$190'},{s:'TCP100',d:'$140',o:'$350',pop:1}],'Gauntlet Mini':[{s:'50K',d:'$68',o:'$170'},{s:'100K',d:'$126',o:'$315',pop:1}]},
    includes:['Journalytix gratis','Reset gratis','NT/Finamark gratis','Escalamento ate $400K','Sem taxa mensal']},
  the5ers:{about:'Fundada em <b>2016</b> por Saul Lokier em Raanana, Israel. Uma das <b>mais antigas prop firms</b> em atividade. Scaling até <b>$4M</b> e profit split até 100%.',highlights:[{val:'$43M+',label:'Pagos a traders'},{val:'30K+',label:'Payouts feitos'},{val:'$4M',label:'Scaling máximo'}],
    types:['Hyper Growth','2-Step'],plans:{'Hyper Growth':[{s:'$5K',d:'$39',o:'—'},{s:'$10K',d:'$85',o:'—'},{s:'$20K',d:'$175',o:'—',pop:1}],'2-Step':[{s:'$100K',d:'$491',o:'—',pop:1},{s:'$250K',d:'$1125',o:'—'}]},
    includes:['Scaling ate $4M','Profit Split ate 100%','Payout medio 16h','Alavancagem 1:100','Sem limite de tempo','Dashboard avancado']},
  fundingpips:{about:'Fundada em <b>2022</b> por Khaled Ayesh em Dubai. <b>2M+ de traders</b> no mundo. Uma das mesas mais populares com pagamentos rápidos e split flexível até 100%.',highlights:[{val:'$200M+',label:'Pagos a traders'},{val:'2M+',label:'Traders'},{val:'127K+',label:'Payouts verificados'}],
    types:['2-Step'],plans:{'2-Step':[{s:'$5K',d:'$28.80',o:'$36'},{s:'$10K',d:'$52.80',o:'$66'},{s:'$25K',d:'$119.20',o:'$149'},{s:'$50K',d:'$199.20',o:'$249',pop:1},{s:'$100K',d:'$423.20',o:'$529'}]},
    includes:['Split flexivel ate 100% mensal','$200M+ pagos','Alavancagem 1:100','Comunidade Discord ativa']},
  brightfunded:{about:'Fundada em <b>2022</b> na Holanda por Jelle Dijkstra. <b>20K+ traders</b>. Programa Trade2Earn (pontos por operar). Payout em <b>24h</b> com ciclo de 7 dias.',highlights:[{val:'$7M+',label:'Pagos a traders'},{val:'20K+',label:'Traders'},{val:'24h',label:'Payout garantido'}],
    types:['2-Step'],plans:{'2-Step':[{s:'$5K',d:'€36',o:'€45'},{s:'$10K',d:'€68',o:'€85'},{s:'$25K',d:'€132',o:'€165'},{s:'$50K',d:'€228',o:'€285',pop:1},{s:'$100K',d:'€396',o:'€495'},{s:'$200K',d:'€756',o:'€945'}]},
    includes:['Scaling ate 100% split','Drawdown estatico','Payout 24h ciclo 7 dias','15% bonus lucro avaliacao','Trade2Earn','Alavancagem 1:100','Suporte 24/7']}
};

/* PLATFORM DETAIL DATA — checkout overlay for partner platforms */
const PLAT_BG={
  tradingview:'img/tradingview-bg.webp',
  ninjatrader:'img/ninjatrader-bg.webp'
};
const PLAT_DETAIL={
  tradingview:{
    about:'Fundada em <b>2011</b> nos EUA. A plataforma de gráficos <b>mais usada do mundo</b> com <b>50M+ de usuários</b> em 190+ países. Indicadores profissionais, alertas avançados, screener e a maior comunidade de traders do mundo. <b>Pine Script</b> para criar indicadores customizados.',
    credit:'Ao assinar pela Markets Coupons, você recebe <b>$15 de crédito</b> na sua conta TradingView.',
    highlights:[{val:'50M+',label:'Usuários'},{val:'17%',label:'OFF Anual'},{val:'$15',label:'Crédito na conta'}],
    types:['Anual (17% OFF)','Mensal'],
    plans:{
      'Anual (17% OFF)':[
        {s:'Essential',d:'$12.95/mês',o:'$14.95/mês',feat:'2 gráficos/aba · 5 indicadores · 40 alertas'},
        {s:'Plus',d:'$24.95/mês',o:'$29.95/mês',pop:1,feat:'4 gráficos/aba · 10 indicadores · 200 alertas'},
        {s:'Premium',d:'$49.95/mês',o:'$59.95/mês',feat:'8 gráficos/aba · 25 indicadores · 800 alertas'},
        {s:'Ultimate',d:'$199.95/mês',o:'$239.95/mês',feat:'16 gráficos/aba · 50 indicadores · 2.000 alertas'}
      ],
      'Mensal':[
        {s:'Essential',d:'$14.95/mês',o:'—',feat:'2 gráficos/aba · 5 indicadores · 40 alertas'},
        {s:'Plus',d:'$29.95/mês',o:'—',pop:1,feat:'4 gráficos/aba · 10 indicadores · 200 alertas'},
        {s:'Premium',d:'$59.95/mês',o:'—',feat:'8 gráficos/aba · 25 indicadores · 800 alertas'},
        {s:'Ultimate',d:'$239.95/mês',o:'—',feat:'16 gráficos/aba · 50 indicadores · 2.000 alertas'}
      ]
    },
    includes:['Sem anúncios','Volume Profile','Timeframes customizados','Bar Replay','Alertas avançados','Screener de ativos','Pine Script','Dados multi-mercado','Paper Trading (simulação)','Watchlists ilimitadas','Sync multi-dispositivo','App mobile completo','Comunidade 50M+ traders','Replay de mercado','Heatmaps de mercado','Suporte por chat'],
    stats:[
      {label:'Mercados',val:'Ações, Futuros, Forex, Cripto'},
      {label:'Indicadores',val:'Até 50 por gráfico',color:'var(--green)'},
      {label:'Alertas',val:'Até 2.000',color:'#EAB308'},
      {label:'Dispositivos',val:'Desktop + Web + Mobile'},
      {label:'Linguagem',val:'Pine Script (própria)'},
      {label:'Comunidade',val:'50M+ traders ativos',color:'var(--green)'}
    ]
  },
  ninjatrader:{
    about:'Fundada em <b>2003</b> por Raymond Deux em Denver, Colorado (HQ em Chicago). <b>500K+ usuários</b> em 150+ países. Brokerage própria com acesso direto ao CME Group. Adquiriu a <b>Tradovate</b> em 2023. Aceita pela <b>maioria das Prop Firms</b> de futuros. Margens intraday: <b>$50</b> Micro / <b>$500</b> E-mini.',
    highlights:[{val:'500K+',label:'Usuários ativos'},{val:'$0.09',label:'Menor comissão'},{val:'20+',label:'Anos no mercado'}],
    types:['Plataforma'],
    plans:{
      'Plataforma':[
        {s:'Free',d:'$0/mês',o:'—',feat:'Micro $0.35/lado · Standard $1.29/lado'},
        {s:'Monthly',d:'$99/mês',o:'—',feat:'Micro $0.25/lado · Standard $0.99/lado'},
        {s:'Lifetime',d:'$1,499',o:'—',pop:1,feat:'Micro $0.09/lado · Standard $0.59/lado'}
      ]
    },
    includes:['SuperDOM + Order Flow+','100+ indicadores nativos','Automação NinjaScript (C#)','Strategy Analyzer (backtest)','ATM Strategies','Simulação grátis','Brokerage própria (FCM)','Margens intraday $50 Micro','Chart Trader (visual)','Market Analyzer (scanner)','Aceita por 10+ Prop Firms','Dados CME/CBOT/NYMEX','Relatório de performance','Desktop + Web + Mobile','Marketplace com milhares de add-ons','Suporte 24/5'],
    stats:[
      {label:'Exchanges',val:'CME, CBOT, NYMEX, COMEX'},
      {label:'Comissão mínima',val:'$0.09/lado',color:'var(--green)'},
      {label:'Margem Micro',val:'$50 intraday',color:'#EAB308'},
      {label:'Automação',val:'NinjaScript (C#)'},
      {label:'Prop Firms',val:'Apex, Bulenox, Topstep +7',color:'var(--green)'},
      {label:'Brokerage',val:'Própria (FCM/NFA)'}
    ]
  }
};

/* FIRM DATA TRANSLATIONS — translates PT firm data to all languages */
const _ftL=['en','es','fr','it','de','ar'];
const FIRM_T={
// Scaling
'Sim':['Yes','Sí','Oui','Sì','Ja','نعم'],
'Ate $2M':['Up to $2M','Hasta $2M','Jusqu\'à $2M','Fino a $2M','Bis $2M','حتى $2M'],
'Ate $300K':['Up to $300K','Hasta $300K','Jusqu\'à $300K','Fino a $300K','Bis $300K','حتى $300K'],
'Ate $400K':['Up to $400K','Hasta $400K','Jusqu\'à $400K','Fino a $400K','Bis $400K','حتى $400K'],
'Ate $4M':['Up to $4M','Hasta $4M','Jusqu\'à $4M','Fino a $4M','Bis $4M','حتى $4M'],
'Sem limite':['No limit','Sin límite','Sans limite','Senza limite','Ohne Limit','بدون حدود'],
// dtype (lifetime/career path/easter kept as-is per CLAUDE.md)
'especial':['special','especial','spécial','speciale','spezial','خاص'],
'1 desafio':['1 challenge','1 desafío','1 défi','1 sfida','1 Herausforderung','تحدي واحد'],
'1 compra':['1 purchase','1 compra','1 achat','1 acquisto','1 Kauf','شراء واحد'],
// ddPct
'Por conta':['Per account','Por cuenta','Par compte','Per conto','Pro Konto','لكل حساب'],
'Fixo':['Fixed','Fijo','Fixe','Fisso','Fest','ثابت'],
'-10% total / -5% diario':['-10% total / -5% daily','-10% total / -5% diario','-10% total / -5% journalier','-10% totale / -5% giornaliero','-10% gesamt / -5% täglich','-10% إجمالي / -5% يومي'],
// target
'Variavel':['Variable','Variable','Variable','Variabile','Variabel','متغير'],
// Perks
'Sem limite diario':['No daily limit','Sin límite diario','Sans limite journalier','Senza limite giornaliero','Kein Tageslimit','بدون حد يومي'],
'Sem regra escalamento':['No scaling rules','Sin regla de escalamiento','Sans règle de scaling','Nessuna regola di scaling','Keine Scaling-Regeln','بدون قواعد تصعيد'],
'Payout 5 dias':['5-day payout','Pago en 5 días','Paiement sous 5 jours','Pagamento in 5 giorni','Auszahlung in 5 Tagen','دفع خلال 5 أيام'],
'Reset $99':['Reset $99','Reset $99','Reset $99','Reset $99','Reset $99','إعادة تعيين $99'],
'Passa em 1 dia':['Pass in 1 day','Aprueba en 1 día','Réussite en 1 jour','Superabile in 1 giorno','Bestehen in 1 Tag','اجتياز في يوم واحد'],
'Sem consistencia':['No consistency rule','Sin regla de consistencia','Sans règle de consistance','Nessuna regola di coerenza','Keine Konsistenzregel','بدون قاعدة اتساق'],
'Trade noticias':['News trading allowed','Trading en noticias','Trading de nouvelles autorisé','Trading sulle notizie','Nachrichtenhandel erlaubt','تداول الأخبار مسموح'],
'Payouts semanais':['Weekly payouts','Pagos semanales','Paiements hebdomadaires','Pagamenti settimanali','Wöchentliche Auszahlungen','دفعات أسبوعية'],
'Free Trial ilimitado':['Unlimited free trial','Prueba gratuita ilimitada','Essai gratuit illimité','Prova gratuita illimitata','Unbegrenzter kostenloser Test','تجربة مجانية غير محدودة'],
'90% split':['90% split','90% split','90% split','90% split','90% Split','90% تقسيم'],
'Suporte 20 idiomas':['Support in 20 languages','Soporte en 20 idiomas','Support en 20 langues','Supporto in 20 lingue','Support in 20 Sprachen','دعم بـ 20 لغة'],
'$500M+ pagos':['$500M+ paid out','$500M+ pagados','$500M+ versés','$500M+ pagati','$500M+ ausgezahlt','$500M+ مدفوعة'],
'Saque desde dia 1':['Withdrawal from day 1','Retiro desde el día 1','Retrait dès le jour 1','Prelievo dal giorno 1','Auszahlung ab Tag 1','سحب من اليوم الأول'],
'Sem taxa ativacao':['No activation fee','Sin tarifa de activación','Sans frais d\'activation','Nessuna commissione di attivazione','Keine Aktivierungsgebühr','بدون رسوم تفعيل'],
'Payout garantido 24h':['Guaranteed 24h payout','Pago garantizado 24h','Paiement garanti 24h','Pagamento garantito 24h','Garantierte 24h-Auszahlung','دفع مضمون خلال 24 ساعة'],
'Sem limite de tempo':['No time limit','Sin límite de tiempo','Sans limite de temps','Senza limite di tempo','Kein Zeitlimit','بدون حد زمني'],
'$1K compensacao atraso':['$1K late compensation','$1K compensación por retraso','$1K compensation retard','$1K compenso ritardo','$1K Verspätungsentschädigung','$1K تعويض تأخير'],
'Journalytix gratis':['Free Journalytix','Journalytix gratis','Journalytix gratuit','Journalytix gratuito','Journalytix kostenlos','Journalytix مجاني'],
'Reset gratis':['Free reset','Reset gratis','Reset gratuit','Reset gratuito','Kostenloses Reset','إعادة تعيين مجانية'],
'Scaling ate $400K':['Scaling up to $400K','Scaling hasta $400K','Scaling jusqu\'à $400K','Scaling fino a $400K','Scaling bis $400K','تصعيد حتى $400K'],
'Scaling ate $4M':['Scaling up to $4M','Scaling hasta $4M','Scaling jusqu\'à $4M','Scaling fino a $4M','Scaling bis $4M','تصعيد حتى $4M'],
'Profit Split ate 100%':['Profit Split up to 100%','Profit Split hasta 100%','Profit Split jusqu\'à 100%','Profit Split fino al 100%','Profit Split bis 100%','Profit Split حتى 100%'],
'Bootcamp desde $95':['Bootcamp from $95','Bootcamp desde $95','Bootcamp à partir de $95','Bootcamp da $95','Bootcamp ab $95','معسكر تدريب من $95'],
'Payout medio 16h':['Average 16h payout','Pago promedio 16h','Paiement moyen 16h','Pagamento medio 16h','Durchschn. 16h-Auszahlung','متوسط دفع 16 ساعة'],
'Alavancagem 1:100':['Leverage 1:100','Apalancamiento 1:100','Effet de levier 1:100','Leva 1:100','Hebel 1:100','رافعة مالية 1:100'],
'Split flexivel: 60% semanal / 80% quinzenal / 90% sob demanda / 100% mensal':['Flexible split: 60% weekly / 80% biweekly / 90% on demand / 100% monthly','Split flexible: 60% semanal / 80% quincenal / 90% bajo demanda / 100% mensual','Split flexible : 60% hebdo / 80% bimensuel / 90% sur demande / 100% mensuel','Split flessibile: 60% settimanale / 80% bisettimanale / 90% su richiesta / 100% mensile','Flexibler Split: 60% wöchentlich / 80% zweiwöchentlich / 90% auf Anfrage / 100% monatlich','تقسيم مرن: 60% أسبوعي / 80% نصف شهري / 90% عند الطلب / 100% شهري'],
'$200M+ pagos globalmente':['$200M+ paid globally','$200M+ pagados globalmente','$200M+ versés mondialement','$200M+ pagati globalmente','$200M+ weltweit ausgezahlt','$200M+ مدفوعة عالمياً'],
'Comunidade Discord ativa':['Active Discord community','Comunidad Discord activa','Communauté Discord active','Comunità Discord attiva','Aktive Discord-Community','مجتمع Discord نشط'],
'Scaling ate 100% split':['Scaling up to 100% split','Scaling hasta 100% split','Scaling jusqu\'à 100% split','Scaling fino a 100% split','Scaling bis 100% Split','تصعيد حتى 100% تقسيم'],
'Drawdown estatico':['Static drawdown','Drawdown estático','Drawdown statique','Drawdown statico','Statischer Drawdown','سحب ثابت'],
'Payout garantido 24h ciclo 7 dias':['Guaranteed 24h payout, 7-day cycle','Pago garantizado 24h, ciclo 7 días','Paiement garanti 24h, cycle 7 jours','Pagamento garantito 24h, ciclo 7 giorni','Garantierte 24h-Auszahlung, 7-Tage-Zyklus','دفع مضمون 24 ساعة، دورة 7 أيام'],
'15% bonus lucro avaliacao':['15% evaluation profit bonus','15% bonus beneficio evaluación','15% bonus profit évaluation','15% bonus profitto valutazione','15% Bewertungsgewinn-Bonus','15% مكافأة ربح التقييم'],
'Trade2Earn (pontos por operar)':['Trade2Earn (points for trading)','Trade2Earn (puntos por operar)','Trade2Earn (points pour trader)','Trade2Earn (punti per operare)','Trade2Earn (Punkte für Handel)','Trade2Earn (نقاط للتداول)'],
'Suporte 24/7':['24/7 support','Soporte 24/7','Support 24/7','Supporto 24/7','24/7 Support','دعم 24/7'],
'Ate 20 contas':['Up to 20 accounts','Hasta 20 cuentas','Jusqu\'à 20 comptes','Fino a 20 conti','Bis 20 Konten','حتى 20 حساب'],
'Sem taxas recorrentes':['No recurring fees','Sin tarifas recurrentes','Sans frais récurrents','Nessuna commissione ricorrente','Keine wiederkehrenden Gebühren','بدون رسوم متكررة'],
'Sem taxa mensal':['No monthly fee','Sin tarifa mensual','Sans frais mensuel','Nessuna commissione mensile','Keine monatliche Gebühr','بدون رسوم شهرية'],
'Ate 3 saques/mes':['Up to 3 withdrawals/month','Hasta 3 retiros/mes','Jusqu\'à 3 retraits/mois','Fino a 3 prelievi/mese','Bis 3 Auszahlungen/Monat','حتى 3 سحوبات/شهر'],
'Ate 95% split':['Up to 95% split','Hasta 95% split','Jusqu\'à 95% split','Fino al 95% split','Bis 95% Split','حتى 95% تقسيم'],
'Educacao inclusa':['Education included','Educación incluida','Éducation incluse','Educazione inclusa','Ausbildung inklusive','التعليم مشمول'],
'Dashboard avancado':['Advanced dashboard','Dashboard avanzado','Tableau de bord avancé','Dashboard avanzata','Erweitertes Dashboard','لوحة تحكم متقدمة'],
'Payout sob demanda':['Payout on demand','Pago bajo demanda','Paiement sur demande','Pagamento su richiesta','Auszahlung auf Anfrage','دفع عند الطلب'],
'Split flexivel: 60-100%':['Flexible split: 60-100%','Split flexible: 60-100%','Split flexible : 60-100%','Split flessibile: 60-100%','Flexibler Split: 60-100%','تقسيم مرن: 60-100%'],
// Proibido
'Copy entre contas':['Copy trading between accounts','Copia entre cuentas','Copie entre comptes','Copia tra conti','Kopieren zwischen Konten','نسخ بين الحسابات'],
'Manipulacao spread':['Spread manipulation','Manipulación de spread','Manipulation de spread','Manipolazione dello spread','Spread-Manipulation','التلاعب بالسبريد'],
'Inatividade 30 dias':['30 days inactivity','30 días de inactividad','30 jours d\'inactivité','30 giorni di inattività','30 Tage Inaktivität','30 يوم من عدم النشاط'],
'Mais de 4 contas ativas':['More than 4 active accounts','Más de 4 cuentas activas','Plus de 4 comptes actifs','Più di 4 conti attivi','Mehr als 4 aktive Konten','أكثر من 4 حسابات نشطة'],
'Arbitragem':['Arbitrage','Arbitraje','Arbitrage','Arbitraggio','Arbitrage','المراجحة'],
'Hedging entre contas':['Hedging between accounts','Cobertura entre cuentas','Hedging entre comptes','Hedging tra conti','Hedging zwischen Konten','التحوط بين الحسابات'],
// Descriptions
'Apex Trader Funding e uma das maiores prop firms de futuros dos EUA. Conhecida pelos descontos agressivos e flexibilidade nas regras.':['Apex Trader Funding is one of the largest futures prop firms in the US. Known for aggressive discounts and flexible rules.','Apex Trader Funding es una de las mayores prop firms de futuros de EE.UU. Conocida por sus descuentos agresivos y flexibilidad en las reglas.','Apex Trader Funding est l\'une des plus grandes prop firms de futures aux États-Unis. Connue pour ses remises agressives et la flexibilité de ses règles.','Apex Trader Funding è una delle più grandi prop firm di futures negli USA. Nota per gli sconti aggressivi e la flessibilità delle regole.','Apex Trader Funding ist eine der größten Futures-Prop-Firms in den USA. Bekannt für aggressive Rabatte und flexible Regeln.','Apex Trader Funding هي واحدة من أكبر شركات التداول الممول للعقود الآجلة في الولايات المتحدة. معروفة بخصوماتها الكبيرة ومرونة القواعد.'],
'Bulenox e uma prop firm de futuros com regras simplificadas. Possivel passar em 1 dia, sem regra de consistencia.':['Bulenox is a futures prop firm with simplified rules. You can pass in 1 day, with no consistency rule.','Bulenox es una prop firm de futuros con reglas simplificadas. Es posible aprobar en 1 día, sin regla de consistencia.','Bulenox est une prop firm de futures avec des règles simplifiées. Possibilité de réussir en 1 jour, sans règle de consistance.','Bulenox è una prop firm di futures con regole semplificate. Possibile superare in 1 giorno, senza regola di coerenza.','Bulenox ist eine Futures-Prop-Firm mit vereinfachten Regeln. Bestehen in 1 Tag möglich, ohne Konsistenzregel.','Bulenox هي شركة تداول ممول للعقود الآجلة بقواعد مبسطة. يمكن اجتيازها في يوم واحد، بدون قاعدة اتساق.'],
'FTMO e a maior prop firm de Forex do mundo, fundada em 2015. Mais de 3,5M de clientes e $500M+ pagos.':['FTMO is the world\'s largest Forex prop firm, founded in 2015. Over 3.5M clients and $500M+ paid out.','FTMO es la mayor prop firm de Forex del mundo, fundada en 2015. Más de 3,5M de clientes y $500M+ pagados.','FTMO est la plus grande prop firm Forex au monde, fondée en 2015. Plus de 3,5M de clients et $500M+ versés.','FTMO è la più grande prop firm Forex al mondo, fondata nel 2015. Oltre 3,5M di clienti e $500M+ pagati.','FTMO ist die größte Forex-Prop-Firm der Welt, gegründet 2015. Über 3,5M Kunden und $500M+ ausgezahlt.','FTMO هي أكبر شركة تداول ممول للفوركس في العالم، تأسست عام 2015. أكثر من 3.5 مليون عميل و$500 مليون+ مدفوعة.'],
'Take Profit Trader destaca-se pelo saque desde o primeiro dia e sem taxa de ativacao.':['Take Profit Trader stands out for withdrawal from day 1 and no activation fee.','Take Profit Trader se destaca por el retiro desde el primer día y sin tarifa de activación.','Take Profit Trader se distingue par le retrait dès le premier jour et sans frais d\'activation.','Take Profit Trader si distingue per il prelievo dal primo giorno e nessuna commissione di attivazione.','Take Profit Trader zeichnet sich durch Auszahlung ab Tag 1 und keine Aktivierungsgebühr aus.','Take Profit Trader تتميز بالسحب من اليوم الأول وعدم وجود رسوم تفعيل.'],
'FundedNext com 400K+ contas e $274M+ pagos. Destaque para payout garantido em 24h.':['FundedNext with 400K+ accounts and $274M+ paid out. Highlight: guaranteed payout within 24h.','FundedNext con 400K+ cuentas y $274M+ pagados. Destaque: pago garantizado en 24h.','FundedNext avec 400K+ comptes et $274M+ versés. Point fort : paiement garanti sous 24h.','FundedNext con 400K+ conti e $274M+ pagati. In evidenza: pagamento garantito entro 24h.','FundedNext mit 400K+ Konten und $274M+ ausgezahlt. Highlight: garantierte Auszahlung innerhalb von 24h.','FundedNext مع 400 ألف+ حساب و$274 مليون+ مدفوعة. الميزة: دفع مضمون خلال 24 ساعة.'],
'Earn2Trade foca em educacao e desenvolvimento com escalamento ate $400K.':['Earn2Trade focuses on education and development with scaling up to $400K.','Earn2Trade se enfoca en educación y desarrollo con escalamiento hasta $400K.','Earn2Trade se concentre sur l\'éducation et le développement avec un scaling jusqu\'à $400K.','Earn2Trade si concentra su educazione e sviluppo con scaling fino a $400K.','Earn2Trade konzentriert sich auf Bildung und Entwicklung mit Scaling bis $400K.','Earn2Trade تركز على التعليم والتطوير مع تصعيد حتى $400K.'],
'The5ers e uma das mais antigas prop firms (desde 2016). Plano de escala ate $4M, Bootcamp com entrada desde $95 para conta de $100K. 262K+ traders.':['The5ers is one of the oldest prop firms (since 2016). Scale plan up to $4M, Bootcamp from $95 for a $100K account. 262K+ traders.','The5ers es una de las prop firms más antiguas (desde 2016). Plan de escalamiento hasta $4M, Bootcamp desde $95 para cuenta de $100K. 262K+ traders.','The5ers est l\'une des plus anciennes prop firms (depuis 2016). Plan de scaling jusqu\'à $4M, Bootcamp à partir de $95 pour un compte de $100K. 262K+ traders.','The5ers è una delle prop firm più antiche (dal 2016). Piano scaling fino a $4M, Bootcamp da $95 per conto da $100K. 262K+ trader.','The5ers ist eine der ältesten Prop-Firms (seit 2016). Scaling-Plan bis $4M, Bootcamp ab $95 für ein $100K-Konto. 262K+ Trader.','The5ers هي واحدة من أقدم شركات التداول الممول (منذ 2016). خطة تصعيد حتى $4M، معسكر تدريب من $95 لحساب $100K. أكثر من 262 ألف متداول.'],
'Funding Pips e uma das mesas mais populares do mundo. Pagamentos rapidos com split flexivel ate 100% mensal. $200M+ pagos globalmente.':['Funding Pips is one of the most popular prop firms worldwide. Fast payments with flexible split up to 100% monthly. $200M+ paid globally.','Funding Pips es una de las prop firms más populares del mundo. Pagos rápidos con split flexible hasta 100% mensual. $200M+ pagados globalmente.','Funding Pips est l\'une des prop firms les plus populaires au monde. Paiements rapides avec split flexible jusqu\'à 100% mensuel. $200M+ versés mondialement.','Funding Pips è una delle prop firm più popolari al mondo. Pagamenti rapidi con split flessibile fino al 100% mensile. $200M+ pagati globalmente.','Funding Pips ist eine der beliebtesten Prop-Firms weltweit. Schnelle Zahlungen mit flexiblem Split bis 100% monatlich. $200M+ weltweit ausgezahlt.','Funding Pips هي واحدة من أشهر شركات التداول الممول في العالم. دفعات سريعة مع تقسيم مرن حتى 100% شهرياً. $200 مليون+ مدفوعة عالمياً.'],
'BrightFunded destaca-se pela experiencia moderna e programa Trade2Earn. Drawdown estatico, scaling ate 100% split, payout em 24h. 150+ instrumentos.':['BrightFunded stands out for its modern experience and Trade2Earn program. Static drawdown, scaling up to 100% split, 24h payout. 150+ instruments.','BrightFunded se destaca por su experiencia moderna y programa Trade2Earn. Drawdown estático, scaling hasta 100% split, payout en 24h. 150+ instrumentos.','BrightFunded se distingue par son expérience moderne et le programme Trade2Earn. Drawdown statique, scaling jusqu\'à 100% split, paiement sous 24h. 150+ instruments.','BrightFunded si distingue per la sua esperienza moderna e il programma Trade2Earn. Drawdown statico, scaling fino al 100% split, pagamento in 24h. 150+ strumenti.','BrightFunded zeichnet sich durch moderne Erfahrung und das Trade2Earn-Programm aus. Statischer Drawdown, Scaling bis 100% Split, Auszahlung in 24h. 150+ Instrumente.','BrightFunded تتميز بتجربتها الحديثة وبرنامج Trade2Earn. سحب ثابت، تصعيد حتى 100% تقسيم، دفع خلال 24 ساعة. أكثر من 150 أداة.'],
// Highlight labels (FIRM_ABOUT)
'Pagos a traders':['Paid to traders','Pagados a traders','Versés aux traders','Pagati ai trader','An Trader ausgezahlt','مدفوعة للمتداولين'],
'Últimos 90 dias':['Last 90 days','Últimos 90 días','Derniers 90 jours','Ultimi 90 giorni','Letzte 90 Tage','آخر 90 يوم'],
'Do lucro (2026)':['Of profit (2026)','Del beneficio (2026)','Du profit (2026)','Del profitto (2026)','Vom Gewinn (2026)','من الأرباح (2026)'],
'Clientes':['Clients','Clientes','Clients','Clienti','Kunden','العملاء'],
'No mercado':['In the market','En el mercado','Sur le marché','Sul mercato','Am Markt','في السوق'],
'Taxa de sucesso':['Success rate','Tasa de éxito','Taux de réussite','Tasso di successo','Erfolgsquote','معدل النجاح'],
'Primeiro saque':['First withdrawal','Primer retiro','Premier retrait','Primo prelievo','Erste Auszahlung','أول سحب'],
'Taxa ativação':['Activation fee','Tarifa activación','Frais d\'activation','Commissione attivazione','Aktivierungsgebühr','رسوم التفعيل'],
'Traders pagos':['Traders paid','Traders pagados','Traders payés','Trader pagati','Bezahlte Trader','المتداولون المدفوعون'],
'Payout garantido':['Guaranteed payout','Pago garantizado','Paiement garanti','Pagamento garantito','Garantierte Auszahlung','دفع مضمون'],
'Taxa aprovação':['Approval rate','Tasa de aprobación','Taux d\'approbation','Tasso di approvazione','Genehmigungsrate','معدل الموافقة'],
'Scaling máximo':['Max scaling','Scaling máximo','Scaling maximum','Scaling massimo','Max. Scaling','أقصى تصعيد'],
'Payouts feitos':['Payouts made','Payouts realizados','Paiements effectués','Pagamenti effettuati','Auszahlungen gemacht','الدفعات المنفذة'],
'Payouts verificados':['Verified payouts','Payouts verificados','Paiements vérifiés','Pagamenti verificati','Verifizierte Auszahlungen','دفعات موثقة'],
'Traders':['Traders','Traders','Traders','Trader','Trader','المتداولون'],
'Para passar':['To pass','Para aprobar','Pour réussir','Per superare','Zum Bestehen','للاجتياز'],
'Taxa mensal':['Monthly fee','Tarifa mensual','Frais mensuel','Tariffa mensile','Monatliche Gebühr','رسوم شهرية'],
// FIRM_ABOUT.about texts
'Fundada em <b>2021</b> por Darrell Martin em Austin, Texas. A Apex é a <b>6ª prop firm mais buscada do mundo</b> com 4.2M de visitas mensais. Taxa de aprovação de <b>15-20%</b> — 2x a média do setor.':['Founded in <b>2021</b> by Darrell Martin in Austin, Texas. Apex is the <b>6th most searched prop firm worldwide</b> with 4.2M monthly visits. <b>15-20%</b> approval rate — 2x the industry average.','Fundada en <b>2021</b> por Darrell Martin en Austin, Texas. Apex es la <b>6ª prop firm más buscada del mundo</b> con 4.2M de visitas mensuales. Tasa de aprobación de <b>15-20%</b> — 2x el promedio del sector.','Fondée en <b>2021</b> par Darrell Martin à Austin, Texas. Apex est la <b>6e prop firm la plus recherchée au monde</b> avec 4.2M de visites mensuelles. Taux d\'approbation de <b>15-20%</b> — 2x la moyenne du secteur.','Fondata nel <b>2021</b> da Darrell Martin ad Austin, Texas. Apex è la <b>6ª prop firm più cercata al mondo</b> con 4.2M di visite mensili. Tasso di approvazione del <b>15-20%</b> — 2x la media del settore.','Gegründet <b>2021</b> von Darrell Martin in Austin, Texas. Apex ist die <b>6. meistgesuchte Prop-Firm weltweit</b> mit 4.2M monatlichen Besuchen. Genehmigungsrate von <b>15-20%</b> — 2x der Branchendurchschnitt.','تأسست في <b>2021</b> بواسطة داريل مارتن في أوستن، تكساس. Apex هي <b>سادس أكثر شركة تداول ممول بحثاً في العالم</b> مع 4.2 مليون زيارة شهرية. معدل موافقة <b>15-20%</b> — ضعف متوسط القطاع.'],
'Fundada em <b>2022</b>. Crescimento de <b>500%</b> em tráfego ano a ano. Regras simplificadas — possível passar em <b>1 dia</b>, sem regra de consistência.':['Founded in <b>2022</b>. <b>500%</b> traffic growth year-over-year. Simplified rules — pass in <b>1 day</b>, no consistency rule.','Fundada en <b>2022</b>. Crecimiento de <b>500%</b> en tráfico año a año. Reglas simplificadas — posible aprobar en <b>1 día</b>, sin regla de consistencia.','Fondée en <b>2022</b>. Croissance de <b>500%</b> du trafic d\'une année sur l\'autre. Règles simplifiées — possible de réussir en <b>1 jour</b>, sans règle de consistance.','Fondata nel <b>2022</b>. Crescita del traffico del <b>500%</b> anno su anno. Regole semplificate — possibile superare in <b>1 giorno</b>, senza regola di coerenza.','Gegründet <b>2022</b>. <b>500%</b> Traffic-Wachstum im Jahresvergleich. Vereinfachte Regeln — in <b>1 Tag</b> bestehen, keine Konsistenzregel.','تأسست في <b>2022</b>. نمو في حركة المرور بنسبة <b>500%</b> سنوياً. قواعد مبسطة — يمكن اجتيازها في <b>يوم واحد</b>، بدون قاعدة اتساق.'],
'Fundada em <b>2015</b> em Praga, República Tcheca. A FTMO é a <b>maior prop firm de Forex do mundo</b>. Mais de <b>3.5M de clientes</b> em 140+ países. Equipe de 300+ profissionais.':['Founded in <b>2015</b> in Prague, Czech Republic. FTMO is the <b>world\'s largest Forex prop firm</b>. Over <b>3.5M clients</b> in 140+ countries. Team of 300+ professionals.','Fundada en <b>2015</b> en Praga, República Checa. FTMO es la <b>mayor prop firm de Forex del mundo</b>. Más de <b>3.5M de clientes</b> en 140+ países. Equipo de 300+ profesionales.','Fondée en <b>2015</b> à Prague, République tchèque. FTMO est la <b>plus grande prop firm Forex au monde</b>. Plus de <b>3.5M de clients</b> dans 140+ pays. Équipe de 300+ professionnels.','Fondata nel <b>2015</b> a Praga, Repubblica Ceca. FTMO è la <b>più grande prop firm Forex al mondo</b>. Oltre <b>3.5M di clienti</b> in 140+ paesi. Team di 300+ professionisti.','Gegründet <b>2015</b> in Prag, Tschechische Republik. FTMO ist die <b>größte Forex-Prop-Firm der Welt</b>. Über <b>3.5M Kunden</b> in 140+ Ländern. Team von 300+ Fachleuten.','تأسست في <b>2015</b> في براغ، جمهورية التشيك. FTMO هي <b>أكبر شركة تداول ممول للفوركس في العالم</b>. أكثر من <b>3.5 مليون عميل</b> في 140+ دولة. فريق من 300+ محترف.'],
'Fundada em <b>2021</b> por James Sixsmith (ex-jogador profissional de hockey). Taxa de sucesso anual de <b>20.37%</b>. Saque desde o <b>dia 1</b>, sem taxa de ativação.':['Founded in <b>2021</b> by James Sixsmith (former professional hockey player). Annual success rate of <b>20.37%</b>. Withdrawal from <b>day 1</b>, no activation fee.','Fundada en <b>2021</b> por James Sixsmith (ex jugador profesional de hockey). Tasa de éxito anual de <b>20.37%</b>. Retiro desde el <b>día 1</b>, sin tarifa de activación.','Fondée en <b>2021</b> par James Sixsmith (ancien joueur de hockey professionnel). Taux de réussite annuel de <b>20.37%</b>. Retrait dès le <b>jour 1</b>, sans frais d\'activation.','Fondata nel <b>2021</b> da James Sixsmith (ex giocatore professionista di hockey). Tasso di successo annuale del <b>20.37%</b>. Prelievo dal <b>giorno 1</b>, senza commissione di attivazione.','Gegründet <b>2021</b> von James Sixsmith (ehemaliger Profi-Hockeyspieler). Jährliche Erfolgsquote von <b>20.37%</b>. Auszahlung ab <b>Tag 1</b>, keine Aktivierungsgebühr.','تأسست في <b>2021</b> بواسطة جيمس سيكسميث (لاعب هوكي محترف سابق). معدل نجاح سنوي <b>20.37%</b>. سحب من <b>اليوم الأول</b>، بدون رسوم تفعيل.'],
'Fundada em <b>2022</b> nos Emirados Árabes. <b>Prop Firm do Ano</b> (Finance Magnates 2025). Mais de <b>200K traders ativos</b> e payout garantido em 24h.':['Founded in <b>2022</b> in the UAE. <b>Prop Firm of the Year</b> (Finance Magnates 2025). Over <b>200K active traders</b> and guaranteed 24h payout.','Fundada en <b>2022</b> en Emiratos Árabes. <b>Prop Firm del Año</b> (Finance Magnates 2025). Más de <b>200K traders activos</b> y pago garantizado en 24h.','Fondée en <b>2022</b> aux Émirats arabes unis. <b>Prop Firm de l\'Année</b> (Finance Magnates 2025). Plus de <b>200K traders actifs</b> et paiement garanti sous 24h.','Fondata nel <b>2022</b> negli Emirati Arabi. <b>Prop Firm dell\'Anno</b> (Finance Magnates 2025). Oltre <b>200K trader attivi</b> e pagamento garantito in 24h.','Gegründet <b>2022</b> in den VAE. <b>Prop-Firm des Jahres</b> (Finance Magnates 2025). Über <b>200K aktive Trader</b> und garantierte 24h-Auszahlung.','تأسست في <b>2022</b> في الإمارات العربية المتحدة. <b>شركة التداول الممول للعام</b> (Finance Magnates 2025). أكثر من <b>200 ألف متداول نشط</b> ودفع مضمون خلال 24 ساعة.'],
'Fundada em <b>2016</b>, celebrando <b>10 anos</b> em 2026. Foco em educação e desenvolvimento. Taxa de aprovação de <b>10.42%</b> — acima da média do setor. Escalamento até $400K.':['Founded in <b>2016</b>, celebrating <b>10 years</b> in 2026. Focus on education and development. <b>10.42%</b> approval rate — above the industry average. Scaling up to $400K.','Fundada en <b>2016</b>, celebrando <b>10 años</b> en 2026. Enfoque en educación y desarrollo. Tasa de aprobación de <b>10.42%</b> — por encima del promedio del sector. Escalamiento hasta $400K.','Fondée en <b>2016</b>, célébrant <b>10 ans</b> en 2026. Accent sur l\'éducation et le développement. Taux d\'approbation de <b>10.42%</b> — au-dessus de la moyenne du secteur. Scaling jusqu\'à $400K.','Fondata nel <b>2016</b>, celebra <b>10 anni</b> nel 2026. Focus su educazione e sviluppo. Tasso di approvazione del <b>10.42%</b> — sopra la media del settore. Scaling fino a $400K.','Gegründet <b>2016</b>, feiert <b>10 Jahre</b> in 2026. Fokus auf Bildung und Entwicklung. Genehmigungsrate von <b>10.42%</b> — über dem Branchendurchschnitt. Scaling bis $400K.','تأسست في <b>2016</b>، تحتفل بـ <b>10 سنوات</b> في 2026. التركيز على التعليم والتطوير. معدل موافقة <b>10.42%</b> — أعلى من متوسط القطاع. تصعيد حتى $400K.'],
'Fundada em <b>2016</b> por Saul Lokier em Raanana, Israel. Uma das <b>mais antigas prop firms</b> em atividade. Scaling até <b>$4M</b> e profit split até 100%.':['Founded in <b>2016</b> by Saul Lokier in Raanana, Israel. One of the <b>oldest active prop firms</b>. Scaling up to <b>$4M</b> and profit split up to 100%.','Fundada en <b>2016</b> por Saul Lokier en Raanana, Israel. Una de las <b>prop firms más antiguas</b> en actividad. Scaling hasta <b>$4M</b> y profit split hasta 100%.','Fondée en <b>2016</b> par Saul Lokier à Raanana, Israël. L\'une des <b>plus anciennes prop firms</b> en activité. Scaling jusqu\'à <b>$4M</b> et profit split jusqu\'à 100%.','Fondata nel <b>2016</b> da Saul Lokier a Raanana, Israele. Una delle <b>prop firm più antiche</b> in attività. Scaling fino a <b>$4M</b> e profit split fino al 100%.','Gegründet <b>2016</b> von Saul Lokier in Raanana, Israel. Eine der <b>ältesten aktiven Prop-Firms</b>. Scaling bis <b>$4M</b> und Profit Split bis 100%.','تأسست في <b>2016</b> بواسطة شاؤول لوكير في رعنانا، إسرائيل. واحدة من <b>أقدم شركات التداول الممول</b> النشطة. تصعيد حتى <b>$4M</b> وتقسيم أرباح حتى 100%.'],
'Fundada em <b>2022</b> por Khaled Ayesh em Dubai. <b>2M+ de traders</b> no mundo. Uma das mesas mais populares com pagamentos rápidos e split flexível até 100%.':['Founded in <b>2022</b> by Khaled Ayesh in Dubai. <b>2M+ traders</b> worldwide. One of the most popular firms with fast payments and flexible split up to 100%.','Fundada en <b>2022</b> por Khaled Ayesh en Dubái. <b>2M+ de traders</b> en el mundo. Una de las mesas más populares con pagos rápidos y split flexible hasta 100%.','Fondée en <b>2022</b> par Khaled Ayesh à Dubaï. <b>2M+ de traders</b> dans le monde. L\'une des firmes les plus populaires avec paiements rapides et split flexible jusqu\'à 100%.','Fondata nel <b>2022</b> da Khaled Ayesh a Dubai. <b>2M+ di trader</b> nel mondo. Una delle firme più popolari con pagamenti rapidi e split flessibile fino al 100%.','Gegründet <b>2022</b> von Khaled Ayesh in Dubai. <b>2M+ Trader</b> weltweit. Eine der beliebtesten Firmen mit schnellen Zahlungen und flexiblem Split bis 100%.','تأسست في <b>2022</b> بواسطة خالد عايش في دبي. <b>2 مليون+ متداول</b> حول العالم. واحدة من أشهر الشركات مع دفعات سريعة وتقسيم مرن حتى 100%.'],
'Fundada em <b>2022</b> na Holanda por Jelle Dijkstra. <b>20K+ traders</b>. Programa Trade2Earn (pontos por operar). Payout em <b>24h</b> com ciclo de 7 dias.':['Founded in <b>2022</b> in the Netherlands by Jelle Dijkstra. <b>20K+ traders</b>. Trade2Earn program (points for trading). <b>24h</b> payout with 7-day cycle.','Fundada en <b>2022</b> en Holanda por Jelle Dijkstra. <b>20K+ traders</b>. Programa Trade2Earn (puntos por operar). Pago en <b>24h</b> con ciclo de 7 días.','Fondée en <b>2022</b> aux Pays-Bas par Jelle Dijkstra. <b>20K+ traders</b>. Programme Trade2Earn (points pour trader). Paiement sous <b>24h</b> avec cycle de 7 jours.','Fondata nel <b>2022</b> nei Paesi Bassi da Jelle Dijkstra. <b>20K+ trader</b>. Programma Trade2Earn (punti per operare). Pagamento in <b>24h</b> con ciclo di 7 giorni.','Gegründet <b>2022</b> in den Niederlanden von Jelle Dijkstra. <b>20K+ Trader</b>. Trade2Earn-Programm (Punkte für Handel). <b>24h</b>-Auszahlung mit 7-Tage-Zyklus.','تأسست في <b>2022</b> في هولندا بواسطة جيلي ديكسترا. <b>20 ألف+ متداول</b>. برنامج Trade2Earn (نقاط للتداول). دفع خلال <b>24 ساعة</b> مع دورة 7 أيام.'],
// Includes extras
'Sem limite de perda diaria':['No daily loss limit','Sin límite de pérdida diaria','Sans limite de perte journalière','Senza limite di perdita giornaliera','Kein tägliches Verlustlimit','بدون حد خسارة يومي'],
'Licenca NinjaTrader':['NinjaTrader license','Licencia NinjaTrader','Licence NinjaTrader','Licenza NinjaTrader','NinjaTrader-Lizenz','ترخيص NinjaTrader'],
'Dados em tempo real':['Real-time data','Datos en tiempo real','Données en temps réel','Dati in tempo reale','Echtzeit-Daten','بيانات في الوقت الحقيقي'],
'Copy Trader (WealthCharts)':['Copy Trader (WealthCharts)','Copy Trader (WealthCharts)','Copy Trader (WealthCharts)','Copy Trader (WealthCharts)','Copy Trader (WealthCharts)','Copy Trader (WealthCharts)'],
'Trial 14 dias gratis':['14-day free trial','Prueba 14 días gratis','Essai gratuit 14 jours','Prova gratuita 14 giorni','14 Tage kostenloser Test','تجربة مجانية 14 يوم'],
'Trade durante noticias':['Trade during news','Trading durante noticias','Trading pendant les nouvelles','Trading durante le notizie','Handel während Nachrichten','التداول أثناء الأخبار'],
'NT/Finamark gratis':['Free NT/Finamark','NT/Finamark gratis','NT/Finamark gratuit','NT/Finamark gratuito','Kostenloses NT/Finamark','NT/Finamark مجاني'],
'Escalamento ate $400K':['Scaling up to $400K','Escalamiento hasta $400K','Scaling jusqu\'à $400K','Scaling fino a $400K','Scaling bis $400K','تصعيد حتى $400K'],
'Split flexivel ate 100%':['Flexible split up to 100%','Split flexible hasta 100%','Split flexible jusqu\'à 100%','Split flessibile fino al 100%','Flexibler Split bis 100%','تقسيم مرن حتى 100%'],
'$200M+ pagos':['$200M+ paid out','$200M+ pagados','$200M+ versés','$200M+ pagati','$200M+ ausgezahlt','$200M+ مدفوعة'],
'Scaling ate 100% split':['Scaling up to 100% split','Scaling hasta 100% split','Scaling jusqu\'à 100% split','Scaling fino a 100% split','Scaling bis 100% Split','تصعيد حتى 100% تقسيم'],
'Payout 24h ciclo 7 dias':['24h payout, 7-day cycle','Pago 24h, ciclo 7 días','Paiement 24h, cycle 7 jours','Pagamento 24h, ciclo 7 giorni','24h-Auszahlung, 7-Tage-Zyklus','دفع 24 ساعة، دورة 7 أيام'],
'15% bonus lucro avaliacao':['15% evaluation profit bonus','15% bonus beneficio evaluación','15% bonus profit évaluation','15% bonus profitto valutazione','15% Bewertungsgewinn-Bonus','15% مكافأة ربح التقييم'],
'Trade2Earn':['Trade2Earn','Trade2Earn','Trade2Earn','Trade2Earn','Trade2Earn','Trade2Earn'],
'90% split de lucro':['90% profit split','90% split de beneficio','90% split de profit','90% split del profitto','90% Gewinn-Split','90% تقسيم أرباح'],
'$500M+ pagos':['$500M+ paid out','$500M+ pagados','$500M+ versés','$500M+ pagati','$500M+ ausgezahlt','$500M+ مدفوعة'],
'Sem regra de escalamento':['No scaling rules','Sin regla de escalamiento','Sans règle de scaling','Nessuna regola di scaling','Keine Scaling-Regeln','بدون قواعد تصعيد'],
// PLAT_DETAIL — about texts (updated with richer data)
'Fundada em <b>2011</b> nos EUA. A plataforma de gráficos <b>mais usada do mundo</b> com <b>50M+ de usuários</b> em 190+ países. Indicadores profissionais, alertas avançados, screener e a maior comunidade de traders do mundo. <b>Pine Script</b> para criar indicadores customizados.':['Founded in <b>2011</b> in the USA. The <b>world\'s most used</b> charting platform with <b>50M+ users</b> in 190+ countries. Professional indicators, advanced alerts, screener and the world\'s largest trader community. <b>Pine Script</b> for custom indicators.','Fundada en <b>2011</b> en EE.UU. La plataforma de gráficos <b>más usada del mundo</b> con <b>50M+ de usuarios</b> en 190+ países. Indicadores profesionales, alertas avanzadas, screener y la mayor comunidad de traders del mundo. <b>Pine Script</b> para indicadores personalizados.','Fondée en <b>2011</b> aux États-Unis. La plateforme de graphiques <b>la plus utilisée au monde</b> avec <b>50M+ d\'utilisateurs</b> dans 190+ pays. Indicateurs professionnels, alertes avancées, screener et la plus grande communauté de traders. <b>Pine Script</b> pour indicateurs personnalisés.','Fondata nel <b>2011</b> negli USA. La piattaforma di grafici <b>più usata al mondo</b> con <b>50M+ di utenti</b> in 190+ paesi. Indicatori professionali, avvisi avanzati, screener e la più grande comunità di trader. <b>Pine Script</b> per indicatori personalizzati.','Gegründet <b>2011</b> in den USA. Die <b>weltweit meistgenutzte</b> Charting-Plattform mit <b>50M+ Nutzern</b> in 190+ Ländern. Professionelle Indikatoren, erweiterte Benachrichtigungen, Screener und die größte Trader-Community. <b>Pine Script</b> für benutzerdefinierte Indikatoren.','تأسست في <b>2011</b> في الولايات المتحدة. منصة الرسوم البيانية <b>الأكثر استخداماً في العالم</b> مع <b>50 مليون+ مستخدم</b> في 190+ دولة. مؤشرات احترافية، تنبيهات متقدمة، فاحص وأكبر مجتمع متداولين. <b>Pine Script</b> لمؤشرات مخصصة.'],
'Fundada em <b>2003</b> por Raymond Deux em Denver, Colorado (HQ em Chicago). <b>500K+ usuários</b> em 150+ países. Brokerage própria com acesso direto ao CME Group. Adquiriu a <b>Tradovate</b> em 2023. Aceita pela <b>maioria das Prop Firms</b> de futuros. Margens intraday: <b>$50</b> Micro / <b>$500</b> E-mini.':['Founded in <b>2003</b> by Raymond Deux in Denver, Colorado (HQ in Chicago). <b>500K+ users</b> in 150+ countries. Own brokerage with direct CME Group access. Acquired <b>Tradovate</b> in 2023. Accepted by <b>most futures Prop Firms</b>. Intraday margins: <b>$50</b> Micro / <b>$500</b> E-mini.','Fundada en <b>2003</b> por Raymond Deux en Denver, Colorado (HQ en Chicago). <b>500K+ usuarios</b> en 150+ países. Brokerage propia con acceso directo al CME Group. Adquirió <b>Tradovate</b> en 2023. Aceptada por la <b>mayoría de las Prop Firms</b> de futuros. Márgenes intraday: <b>$50</b> Micro / <b>$500</b> E-mini.','Fondée en <b>2003</b> par Raymond Deux à Denver, Colorado (siège à Chicago). <b>500K+ utilisateurs</b> dans 150+ pays. Courtage propre avec accès direct CME Group. Acquisition de <b>Tradovate</b> en 2023. Acceptée par la <b>plupart des Prop Firms</b> futures. Marges intraday: <b>50$</b> Micro / <b>500$</b> E-mini.','Fondata nel <b>2003</b> da Raymond Deux a Denver, Colorado (sede a Chicago). <b>500K+ utenti</b> in 150+ paesi. Broker proprio con accesso diretto CME Group. Acquisizione di <b>Tradovate</b> nel 2023. Accettata dalla <b>maggior parte delle Prop Firms</b> futures. Margini intraday: <b>$50</b> Micro / <b>$500</b> E-mini.','Gegründet <b>2003</b> von Raymond Deux in Denver, Colorado (HQ in Chicago). <b>500K+ Nutzer</b> in 150+ Ländern. Eigene Brokerage mit direktem CME Group-Zugang. Übernahme von <b>Tradovate</b> 2023. Von den <b>meisten Futures Prop Firms</b> akzeptiert. Intraday-Margen: <b>$50</b> Micro / <b>$500</b> E-mini.','تأسست في <b>2003</b> بواسطة ريموند دو في دنفر، كولورادو (المقر في شيكاغو). <b>500 ألف+ مستخدم</b> في 150+ دولة. وساطة خاصة مع وصول مباشر لـCME Group. استحوذت على <b>Tradovate</b> في 2023. مقبولة من <b>معظم شركات Prop</b> للعقود الآجلة. هوامش يومية: <b>$50</b> مايكرو / <b>$500</b> E-mini.'],
// PLAT_DETAIL — credit text
'Ao assinar pela Markets Coupons, você recebe <b>$15 de crédito</b> na sua conta TradingView.':['By subscribing through Markets Coupons, you get <b>$15 credit</b> on your TradingView account.','Al suscribirte por Markets Coupons, recibes <b>$15 de crédito</b> en tu cuenta TradingView.','En vous abonnant via Markets Coupons, vous recevez <b>15$ de crédit</b> sur votre compte TradingView.','Iscrivendoti tramite Markets Coupons, ricevi <b>$15 di credito</b> sul tuo account TradingView.','Wenn Sie sich über Markets Coupons anmelden, erhalten Sie <b>$15 Guthaben</b> auf Ihrem TradingView-Konto.','عند الاشتراك عبر Markets Coupons، تحصل على <b>رصيد $15</b> في حسابك على TradingView.'],
// PLAT_DETAIL — highlight labels
'Usuários':['Users','Usuarios','Utilisateurs','Utenti','Nutzer','المستخدمون'],
'OFF Anual':['OFF Annual','OFF Anual','OFF Annuel','OFF Annuale','RABATT Jährlich','خصم سنوي'],
'Crédito na conta':['Account credit','Crédito en la cuenta','Crédit sur le compte','Credito sul conto','Kontoguthaben','رصيد في الحساب'],
'Plano disponível':['Plan available','Plan disponible','Plan disponible','Piano disponibile','Plan verfügbar','خطة متاحة'],
'Menor comissão':['Lowest commission','Menor comisión','Commission la plus basse','Commissione più bassa','Niedrigste Kommission','أقل عمولة'],
'Anos no mercado':['Years in market','Años en el mercado','Ans sur le marché','Anni nel mercato','Jahre im Markt','سنوات في السوق'],
// PLAT_DETAIL — plan feature lines
'2 gráficos/aba · 5 indicadores · 40 alertas':['2 charts/tab · 5 indicators · 40 alerts','2 gráficos/pestaña · 5 indicadores · 40 alertas','2 graphiques/onglet · 5 indicateurs · 40 alertes','2 grafici/tab · 5 indicatori · 40 avvisi','2 Charts/Tab · 5 Indikatoren · 40 Alarme','2 رسم بياني/علامة · 5 مؤشرات · 40 تنبيه'],
'4 gráficos/aba · 10 indicadores · 200 alertas':['4 charts/tab · 10 indicators · 200 alerts','4 gráficos/pestaña · 10 indicadores · 200 alertas','4 graphiques/onglet · 10 indicateurs · 200 alertes','4 grafici/tab · 10 indicatori · 200 avvisi','4 Charts/Tab · 10 Indikatoren · 200 Alarme','4 رسم بياني/علامة · 10 مؤشرات · 200 تنبيه'],
'8 gráficos/aba · 25 indicadores · 800 alertas':['8 charts/tab · 25 indicators · 800 alerts','8 gráficos/pestaña · 25 indicadores · 800 alertas','8 graphiques/onglet · 25 indicateurs · 800 alertes','8 grafici/tab · 25 indicatori · 800 avvisi','8 Charts/Tab · 25 Indikatoren · 800 Alarme','8 رسم بياني/علامة · 25 مؤشر · 800 تنبيه'],
'16 gráficos/aba · 50 indicadores · 2.000 alertas':['16 charts/tab · 50 indicators · 2,000 alerts','16 gráficos/pestaña · 50 indicadores · 2.000 alertas','16 graphiques/onglet · 50 indicateurs · 2 000 alertes','16 grafici/tab · 50 indicatori · 2.000 avvisi','16 Charts/Tab · 50 Indikatoren · 2.000 Alarme','16 رسم بياني/علامة · 50 مؤشر · 2,000 تنبيه'],
'Micro $0.35/lado · Standard $1.29/lado':['Micro $0.35/side · Standard $1.29/side','Micro $0.35/lado · Standard $1.29/lado','Micro 0,35$/côté · Standard 1,29$/côté','Micro $0.35/lato · Standard $1.29/lato','Micro $0,35/Seite · Standard $1,29/Seite','مايكرو $0.35/جانب · ستاندرد $1.29/جانب'],
'Micro $0.25/lado · Standard $0.99/lado':['Micro $0.25/side · Standard $0.99/side','Micro $0.25/lado · Standard $0.99/lado','Micro 0,25$/côté · Standard 0,99$/côté','Micro $0.25/lato · Standard $0.99/lato','Micro $0,25/Seite · Standard $0,99/Seite','مايكرو $0.25/جانب · ستاندرد $0.99/جانب'],
'Micro $0.09/lado · Standard $0.59/lado':['Micro $0.09/side · Standard $0.59/side','Micro $0.09/lado · Standard $0.59/lado','Micro 0,09$/côté · Standard 0,59$/côté','Micro $0.09/lato · Standard $0.59/lato','Micro $0,09/Seite · Standard $0,59/Seite','مايكرو $0.09/جانب · ستاندرد $0.59/جانب'],
// NinjaTrader — new includes & highlights
'Usuários ativos':['Active users','Usuarios activos','Utilisateurs actifs','Utenti attivi','Aktive Nutzer','المستخدمون النشطون'],
'SuperDOM + Order Flow+':['SuperDOM + Order Flow+','SuperDOM + Order Flow+','SuperDOM + Order Flow+','SuperDOM + Order Flow+','SuperDOM + Order Flow+','SuperDOM + Order Flow+'],
'100+ indicadores nativos':['100+ native indicators','100+ indicadores nativos','100+ indicateurs natifs','100+ indicatori nativi','100+ native Indikatoren','100+ مؤشر أصلي'],
'Automação NinjaScript (C#)':['NinjaScript automation (C#)','Automatización NinjaScript (C#)','Automatisation NinjaScript (C#)','Automazione NinjaScript (C#)','NinjaScript-Automatisierung (C#)','أتمتة NinjaScript (C#)'],
'Strategy Analyzer (backtest)':['Strategy Analyzer (backtest)','Strategy Analyzer (backtest)','Strategy Analyzer (backtest)','Strategy Analyzer (backtest)','Strategy Analyzer (Backtest)','Strategy Analyzer (اختبار)'],
'ATM Strategies':['ATM Strategies','ATM Strategies','ATM Strategies','ATM Strategies','ATM Strategies','ATM Strategies'],
'Brokerage própria (FCM)':['Own brokerage (FCM)','Brokerage propia (FCM)','Courtage propre (FCM)','Broker proprio (FCM)','Eigene Brokerage (FCM)','وساطة خاصة (FCM)'],
'Margens intraday $50 Micro':['$50 Micro intraday margins','Márgenes intraday $50 Micro','Marges intraday 50$ Micro','Margini intraday $50 Micro','$50 Micro Intraday-Margen','هوامش يومية $50 مايكرو'],
// TradingView — extra includes
'Paper Trading (simulação)':['Paper Trading (simulation)','Paper Trading (simulación)','Paper Trading (simulation)','Paper Trading (simulazione)','Paper Trading (Simulation)','تداول تجريبي (محاكاة)'],
'Watchlists ilimitadas':['Unlimited watchlists','Watchlists ilimitadas','Watchlists illimitées','Watchlist illimitate','Unbegrenzte Watchlists','قوائم مراقبة غير محدودة'],
'Sync multi-dispositivo':['Multi-device sync','Sync multi-dispositivo','Sync multi-appareils','Sync multi-dispositivo','Multi-Geräte-Sync','مزامنة متعددة الأجهزة'],
'App mobile completo':['Full mobile app','App mobile completa','App mobile complète','App mobile completa','Vollständige Mobile-App','تطبيق جوال كامل'],
'Comunidade 50M+ traders':['50M+ trader community','Comunidad 50M+ traders','Communauté 50M+ traders','Comunità 50M+ trader','50M+ Trader-Community','مجتمع 50 مليون+ متداول'],
'Replay de mercado':['Market replay','Replay de mercado','Replay de marché','Replay di mercato','Markt-Replay','إعادة تشغيل السوق'],
'Heatmaps de mercado':['Market heatmaps','Heatmaps de mercado','Heatmaps de marché','Heatmap di mercato','Markt-Heatmaps','خرائط حرارية للسوق'],
'Suporte por chat':['Chat support','Soporte por chat','Support par chat','Supporto via chat','Chat-Support','دعم عبر الدردشة'],
// NinjaTrader — extra includes
'Chart Trader (visual)':['Chart Trader (visual)','Chart Trader (visual)','Chart Trader (visuel)','Chart Trader (visuale)','Chart Trader (visuell)','Chart Trader (مرئي)'],
'Market Analyzer (scanner)':['Market Analyzer (scanner)','Market Analyzer (escáner)','Market Analyzer (scanner)','Market Analyzer (scanner)','Market Analyzer (Scanner)','Market Analyzer (ماسح)'],
'Aceita por 10+ Prop Firms':['Accepted by 10+ Prop Firms','Aceptada por 10+ Prop Firms','Acceptée par 10+ Prop Firms','Accettata da 10+ Prop Firms','Von 10+ Prop Firms akzeptiert','مقبولة من 10+ شركات Prop'],
'Dados CME/CBOT/NYMEX':['CME/CBOT/NYMEX data','Datos CME/CBOT/NYMEX','Données CME/CBOT/NYMEX','Dati CME/CBOT/NYMEX','CME/CBOT/NYMEX-Daten','بيانات CME/CBOT/NYMEX'],
'Relatório de performance':['Performance report','Informe de rendimiento','Rapport de performance','Report di performance','Leistungsbericht','تقرير الأداء'],
'Marketplace com milhares de add-ons':['Marketplace with thousands of add-ons','Marketplace con miles de add-ons','Marketplace avec milliers d\'add-ons','Marketplace con migliaia di add-on','Marktplatz mit tausenden Add-ons','سوق بآلاف الإضافات'],
// Platform stats labels
'Mercados':['Markets','Mercados','Marchés','Mercati','Märkte','الأسواق'],
'Ações, Futuros, Forex, Cripto':['Stocks, Futures, Forex, Crypto','Acciones, Futuros, Forex, Cripto','Actions, Futures, Forex, Crypto','Azioni, Futures, Forex, Crypto','Aktien, Futures, Forex, Crypto','أسهم، عقود آجلة، فوركس، كريبتو'],
'Indicadores':['Indicators','Indicadores','Indicateurs','Indicatori','Indikatoren','المؤشرات'],
'Até 50 por gráfico':['Up to 50 per chart','Hasta 50 por gráfico','Jusqu\'à 50 par graphique','Fino a 50 per grafico','Bis zu 50 pro Chart','حتى 50 لكل رسم بياني'],
'Até 2.000':['Up to 2,000','Hasta 2.000','Jusqu\'à 2 000','Fino a 2.000','Bis zu 2.000','حتى 2,000'],
'Dispositivos':['Devices','Dispositivos','Appareils','Dispositivi','Geräte','الأجهزة'],
'Linguagem':['Language','Lenguaje','Langage','Linguaggio','Sprache','اللغة'],
'Pine Script (própria)':['Pine Script (proprietary)','Pine Script (propia)','Pine Script (propriétaire)','Pine Script (proprietario)','Pine Script (proprietär)','Pine Script (خاص)'],
'Comunidade':['Community','Comunidad','Communauté','Comunità','Community','المجتمع'],
'50M+ traders ativos':['50M+ active traders','50M+ traders activos','50M+ traders actifs','50M+ trader attivi','50M+ aktive Trader','50 مليون+ متداول نشط'],
'Exchanges':['Exchanges','Exchanges','Exchanges','Exchanges','Exchanges','البورصات'],
'Comissão mínima':['Min. commission','Comisión mínima','Commission min.','Commissione min.','Min. Kommission','أقل عمولة'],
'Margem Micro':['Micro margin','Margen Micro','Marge Micro','Margine Micro','Micro-Marge','هامش مايكرو'],
'$50 intraday':['$50 intraday','$50 intraday','50$ intraday','$50 intraday','$50 intraday','$50 يومي'],
'Automação':['Automation','Automatización','Automatisation','Automazione','Automatisierung','الأتمتة'],
'Apex, Bulenox, Topstep +7':['Apex, Bulenox, Topstep +7','Apex, Bulenox, Topstep +7','Apex, Bulenox, Topstep +7','Apex, Bulenox, Topstep +7','Apex, Bulenox, Topstep +7','Apex, Bulenox, Topstep +7'],
'Brokerage':['Brokerage','Brokerage','Courtage','Broker','Brokerage','الوساطة'],
'Própria (FCM/NFA)':['Own (FCM/NFA)','Propia (FCM/NFA)','Propre (FCM/NFA)','Propria (FCM/NFA)','Eigene (FCM/NFA)','خاصة (FCM/NFA)'],
// PLAT_DETAIL — type labels
'Anual (17% OFF)':['Annual (17% OFF)','Anual (17% OFF)','Annuel (17% OFF)','Annuale (17% OFF)','Jährlich (17% RABATT)','سنوي (17% خصم)'],
'Mensal':['Monthly','Mensual','Mensuel','Mensile','Monatlich','شهري'],
'Plataforma':['Platform','Plataforma','Plateforme','Piattaforma','Plattform','منصة'],
// PLAT_DETAIL — includes
'Sem anúncios':['No ads','Sin anuncios','Sans publicités','Senza pubblicità','Ohne Werbung','بدون إعلانات'],
'Volume Profile':['Volume Profile','Volume Profile','Volume Profile','Volume Profile','Volume Profile','Volume Profile'],
'Timeframes customizados':['Custom timeframes','Timeframes personalizados','Timeframes personnalisés','Timeframe personalizzati','Benutzerdefinierte Timeframes','أطر زمنية مخصصة'],
'Bar Replay':['Bar Replay','Bar Replay','Bar Replay','Bar Replay','Bar Replay','Bar Replay'],
'Alertas avançados':['Advanced alerts','Alertas avanzadas','Alertes avancées','Avvisi avanzati','Erweiterte Benachrichtigungen','تنبيهات متقدمة'],
'Screener de ativos':['Asset screener','Screener de activos','Screener d\'actifs','Screener di attivi','Asset Screener','فاحص الأصول'],
'Pine Script':['Pine Script','Pine Script','Pine Script','Pine Script','Pine Script','Pine Script'],
'Dados multi-mercado':['Multi-market data','Datos multi-mercado','Données multi-marchés','Dati multi-mercato','Multi-Markt-Daten','بيانات متعددة الأسواق'],
'Simulação grátis':['Free simulation','Simulación gratuita','Simulation gratuite','Simulazione gratuita','Kostenlose Simulation','محاكاة مجانية'],
'Backtesting avançado':['Advanced backtesting','Backtesting avanzado','Backtesting avancé','Backtesting avanzato','Erweitertes Backtesting','اختبار متقدم'],
'Automação NinjaScript':['NinjaScript automation','Automatización NinjaScript','Automatisation NinjaScript','Automazione NinjaScript','NinjaScript-Automatisierung','أتمتة NinjaScript'],
'Marketplace indicadores':['Indicators marketplace','Marketplace indicadores','Marketplace indicateurs','Marketplace indicatori','Indikator-Marktplatz','سوق المؤشرات'],
'Desktop + Web + Mobile':['Desktop + Web + Mobile','Desktop + Web + Mobile','Desktop + Web + Mobile','Desktop + Web + Mobile','Desktop + Web + Mobile','Desktop + Web + Mobile'],
'Suporte 24/5':['24/5 support','Soporte 24/5','Support 24/5','Supporto 24/5','24/5 Support','دعم 24/5'],
'Market Replay':['Market Replay','Market Replay','Market Replay','Market Replay','Market Replay','Market Replay'],
'Margens intraday baixas':['Low intraday margins','Márgenes intraday bajos','Marges intraday basses','Margini intraday bassi','Niedrige Intraday-Margen','هوامش يومية منخفضة'],
// PLAT_DETAIL — dtype
'plano anual':['annual plan','plan anual','plan annuel','piano annuale','Jahresplan','خطة سنوية'],
};
function tf(s){if(!s||typeof _currentLang==='undefined'||_currentLang==='pt')return s;const r=FIRM_T[s];if(!r)return s;const i=_ftL.indexOf(_currentLang);return i>=0&&r[i]?r[i]:s;}

/* NAV */
function go(page, skipHash){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById('page-'+page);if(pg)pg.classList.add('active');
  document.querySelectorAll('.nt').forEach(t=>t.classList.toggle('active',t.dataset.p===page));
  window.scrollTo({top:0,behavior:'smooth'});
  if(!skipHash) location.hash=page==='home'?'':page;
  try{sessionStorage.setItem('mc_page',page);}catch(e){}
  track('page_view',{page_name:page});
  if(page==='live') checkLoyaltyAndShowLive();
  if(page==='analise' && _authLoaded) checkAnalysisGate();
  if(page==='loyalty') renderLoyaltyPage();
  if(page==='painel' && !currentUser) { openAuthModal('login'); go('home'); return; }
}
window.addEventListener('hashchange',()=>{const h=location.hash.replace('#','');if(h)go(h,true);else go('home',true);});
function toggleMM(){const open=document.getElementById('mm').classList.toggle('open');document.getElementById('mm-ov').classList.toggle('open',open);document.getElementById('hbg').classList.toggle('open',open);document.body.style.overflow=open?'hidden':'';}
function closeMM(){['mm','mm-ov','hbg'].forEach(id=>document.getElementById(id)?.classList.remove('open'));document.body.style.overflow='';}
function mgo(p){closeMM();go(p);}
/* ─── TRANSLATION ENGINE ─── */
let _currentLang = 'pt';
function t(key) { return (I18N[_currentLang] && I18N[_currentLang][key]) || (I18N.pt[key]) || key; }
function detectLang() {
  const saved = localStorage.getItem('mc_lang');
  if (saved && I18N[saved]) return saved;
  const nav = (navigator.language || navigator.userLanguage || 'pt').toLowerCase();
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('en')) return 'en';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('it')) return 'it';
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('ar')) return 'ar';
  return 'pt';
}
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
    else if (el.tagName === 'OPTION') el.textContent = val;
    else el.innerHTML = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
}
function updateTVWidgets(lang) {
  const hmF = document.getElementById('heatmap-frame');
  if(hmF) loadHeatmap(hmF.dataset.source||'SPX500');
}
function setL(lang,flag,code){
  _currentLang = lang;
  localStorage.setItem('mc_lang', lang);
  document.getElementById('l-flag').textContent=flag;
  document.getElementById('l-code').textContent=' '+code;
  document.body.dir=lang==='ar'?'rtl':'ltr';
  applyTranslations();
  renderHome(); renderOffers(); renderAwards(); renderFaq(); renderPlatforms(); renderGuides(); renderBlog(); renderQuiz(); applyF(); renderPolicies(); loadDailyAnalysis(); checkAnalysisGate(); renderCal();
  // Re-render open drawer if language changed
  const activeFr = document.querySelector('.fr.active');
  if (activeFr && document.getElementById('drw')?.classList.contains('open')) openD(activeFr.dataset.id);
  updateTVWidgets(lang);
  track('language_change',{language:lang});
}
function initLang() {
  _currentLang = detectLang();
  const codes = {pt:'BR',en:'EN',es:'ES',it:'IT',fr:'FR',de:'DE',ar:'AR'};
  document.getElementById('l-code').textContent = ' ' + (codes[_currentLang]||'BR');
  document.body.dir = _currentLang==='ar'?'rtl':'ltr';
  applyTranslations();
  updateTVWidgets(_currentLang);
}
/* ─── COOKIE CONSENT & POLICIES ─── */
function acceptCookies(){
  localStorage.setItem('mc-cookies-consent','accepted');
  document.getElementById('ck-banner').style.display='none';
  loadTracking();
  track('cookie_consent',{action:'accepted'});
}
function rejectCookies(){
  localStorage.setItem('mc-cookies-consent','rejected');
  document.getElementById('ck-banner').style.display='none';
}
function showCookieBanner(){
  if(!localStorage.getItem('mc-cookies-consent')){
    document.getElementById('ck-banner').style.display='flex';
  }
}
function renderPolicies(){
  const pb=document.getElementById('privacy-body');if(pb)pb.innerHTML=t('priv_body');
  const tb=document.getElementById('terms-body');if(tb)tb.innerHTML=t('terms_body');
  const cb=document.getElementById('cookies-body');if(cb)cb.innerHTML=t('cookies_body');
}
function strs(r){return'★'.repeat(Math.round(r))+'☆'.repeat(5-Math.round(r));}
function favHeart(active){return active?'<svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4d4d"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';}
function firmIco(f,size='38px',fontSize='14px'){
  if(f.icon_url) return `<div style="width:${size};height:${size};border-radius:8px;overflow:hidden;flex-shrink:0;background:${f.bg};display:flex;align-items:center;justify-content:center;"><img src="${f.icon_url}" alt="${f.name}" style="width:100%;height:100%;object-fit:cover;"></div>`;
  return `<div style="width:${size};height:${size};border-radius:8px;background:${f.bg};color:${f.color};display:flex;align-items:center;justify-content:center;font-size:${fontSize};font-weight:800;flex-shrink:0;">${f.icon}</div>`;
}

/* GUIDES — Supabase-powered */
let _guidesCache=[];
const GUIDES_FALLBACK = [
  {id:'g1',title:'O que é uma Prop Firm?',slug:'o-que-e-uma-prop-firm',category:'Iniciante',cat_color:'var(--blue)',img:'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&h=250&fit=crop',description:'Entenda como funcionam as prop firms, como passar no desafio e receber sua conta financiada.'},
  {id:'g2',title:'Gerenciamento de Drawdown',slug:'gerenciamento-de-drawdown',category:'Intermediário',cat_color:'var(--gold)',img:'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=500&h=250&fit=crop',description:'Como calcular, monitorar e evitar violar os limites de drawdown.'},
  {id:'g3',title:'Como Passar no Desafio',slug:'como-passar-no-desafio',category:'Prático',cat_color:'var(--green)',img:'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=500&h=250&fit=crop',description:'Estratégias comprovadas para passar na fase de avaliação.'},
  {id:'g4',title:'Position Sizing em Prop Firms',slug:'position-sizing-prop-firms',category:'Técnico',cat_color:'var(--purple)',img:'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&h=250&fit=crop',description:'Como calcular o tamanho correto para maximizar lucro sem violar regras.'},
  {id:'g5',title:'Apex vs FTMO vs Bulenox',slug:'apex-vs-ftmo-vs-bulenox',category:'Comparativo',cat_color:'var(--orange)',img:'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=500&h=250&fit=crop',description:'Comparação detalhada: regras, preços, plataformas e payouts.'},
  {id:'g6',title:'Como Sacar seus Lucros',slug:'como-sacar-seus-lucros',category:'Financeiro',cat_color:'var(--cyan)',img:'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=500&h=250&fit=crop',description:'Passo a passo para solicitar payouts em cada firma.'},
];
async function loadGuidesFromSupabase(){
  try{
    const{data,error}=await db.from('cms_guides').select('*').eq('active',true).order('sort_order',{ascending:true});
    if(!error&&data&&data.length){_guidesCache=data;return data;}
  }catch(e){}
  _guidesCache=GUIDES_FALLBACK;return GUIDES_FALLBACK;
}
const _guiaCatMap={'Iniciante':'guia_cat_iniciante','Intermediário':'guia_cat_intermediario','Prático':'guia_cat_pratico','Técnico':'guia_cat_tecnico','Comparativo':'guia_cat_comparativo','Financeiro':'guia_cat_financeiro'};
const _guiaI18nMap={'g1':1,'g2':2,'g3':3,'g4':4,'g5':5,'g6':6};
function _guiaNum(guide,idx){return _guiaI18nMap[guide.id]||(idx+1);}
function renderGuides(){
  const g=document.getElementById('guides-grid');if(!g)return;
  const guides=_guidesCache.length?_guidesCache:GUIDES_FALLBACK;
  g.innerHTML=guides.map((guide,idx)=>{
    const n=_guiaNum(guide,idx);
    const cat=_guiaCatMap[guide.category]?t(_guiaCatMap[guide.category]):guide.category;
    const titulo=t('guia'+n+'_titulo')||guide.title;
    const desc=t('guia'+n+'_desc')||guide.description;
    return `<div class="gc" onclick="openGuideArticle('${guide.slug}')">
      <div class="gc-img" style="background-image:url('${guide.img||''}');background-color:var(--card2);"></div>
      <div class="gc-body">
        <div class="gc-cat" style="color:${guide.cat_color};">${cat}</div>
        <div class="gc-title">${titulo}</div>
        <div class="gc-desc">${desc}</div>
        <div class="gc-read">${t('guia_ler')}</div>
      </div>
    </div>`;}).join('');
}
async function openGuideArticle(slug){
  const guide=_guidesCache.find(g=>g.slug===slug);
  if(!guide)return;
  // If content not loaded yet (fallback), fetch from Supabase
  if(!guide.content){
    try{
      const{data}=await db.from('cms_guides').select('*').eq('slug',slug).maybeSingle();
      if(data){Object.assign(guide,data);}
    }catch(e){}
  }
  if(!guide.content){showToast(t('toast_conteudo_indisponivel'));return;}
  const grid=document.getElementById('guides-grid');
  const hdr=document.getElementById('guides-header');
  const art=document.getElementById('guide-article');
  if(grid)grid.style.display='none';
  if(hdr)hdr.style.display='none';
  const readMin=Math.max(3,Math.round((guide.content||'').replace(/<[^>]*>/g,'').split(/\s+/).length/200));
  const idx=_guidesCache.indexOf(guide);
  const n=_guiaNum(guide,idx>=0?idx:0);
  const cat=_guiaCatMap[guide.category]?t(_guiaCatMap[guide.category]):guide.category;
  const titulo=t('guia'+n+'_titulo')||guide.title;
  art.innerHTML=`
    <button class="guide-back" onclick="closeGuideArticle()">← ${t('guia_voltar')||'Voltar aos guias'}</button>
    <div class="guide-art-cat" style="color:${guide.cat_color};">${cat}</div>
    <div class="guide-art-title">${titulo}</div>
    <div class="guide-art-meta"><span>~${readMin} min de leitura</span></div>
    <div class="guide-art-body">${typeof DOMPurify!=='undefined'?DOMPurify.sanitize(guide.content||''):(guide.content||'')}</div>
    <div class="guide-art-cta">
      <div class="guide-art-cta-title">${t('guia_cta_titulo')||'Pronto para começar?'}</div>
      <div class="guide-art-cta-desc">${t('guia_cta_desc')||'Compare as melhores prop firms com cupons exclusivos de até 90% de desconto.'}</div>
      <button class="guide-art-cta-btn" onclick="go('offers')">${t('guia_cta_btn')||'Ver Ofertas'} →</button>
    </div>`;
  art.classList.add('open');
  window.scrollTo({top:0,behavior:'smooth'});
  track('guide_read',{guide_id:guide.id,guide_title:guide.title,guide_slug:slug});
}
function closeGuideArticle(){
  const grid=document.getElementById('guides-grid');
  const hdr=document.getElementById('guides-header');
  const art=document.getElementById('guide-article');
  art.classList.remove('open');
  art.innerHTML='';
  if(grid)grid.style.display='';
  if(hdr)hdr.style.display='';
}

/* BLOG */
const BLOG_POSTS = [
  // ─── INICIANTE ─────────────────────────────────────
  {
    id:'bp1', slug:'sua-primeira-prop-firm',
    level:'iniciante', levelColor:'#22C55E', levelBg:'rgba(34,197,94,.1)',
    catKey:'blog_cat_educacao', catColor:'var(--green)', bg:'var(--gnbg)',
    img:'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=300&fit=crop',
    titleKey:'blog1_titulo', excerptKey:'blog1_excerpt', dataKey:'blog1_data', readMin:12,
    content:`
<h2>O Que é Uma Prop Firm e Por Que Você Deveria Considerar</h2>
<p>Uma prop firm (proprietary trading firm) é uma empresa que <strong>empresta capital para traders operarem</strong>. Você não precisa arriscar seu próprio dinheiro — paga uma taxa de avaliação, passa no desafio, e recebe uma conta financiada que pode chegar a <strong>$300.000 ou mais</strong>.</p>
<p>Em 2025, o mercado de prop firms movimenta bilhões de dólares. Só a Apex Trader Funding já pagou mais de <strong>$360 milhões em payouts</strong> desde sua fundação. A FTMO ultrapassou <strong>$200 milhões distribuídos</strong>.</p>

<div class="callout callout-tip"><strong>Por que isso importa para você:</strong> Com R$100-300 (em promoção), você pode acessar uma conta de $50.000-$150.000 em futuros. Sem prop firm, você precisaria de pelo menos R$50.000 na conta da corretora para operar 1 contrato de mini ES.</div>

<h2>As 3 Categorias de Prop Firms</h2>
<h3>1. Futuros (CME)</h3>
<p>Operam contratos como ES (S&P 500), NQ (Nasdaq), CL (Petróleo). As maiores são <strong>Apex, Bulenox, TopStep e Tradeify</strong>. Vantagem: mercado regulado, horários definidos, alavancagem natural dos futuros.</p>

<h3>2. Forex/CFD</h3>
<p>Operam pares de moedas e CFDs. Líderes: <strong>FTMO, FundedNext, MyFundedFX</strong>. Vantagem: mercado 24h, mais pares disponíveis, plataformas como MT4/MT5.</p>

<h3>3. Ações/Crypto</h3>
<p>Mercado menor mas crescente. Algumas firms oferecem contas para operar ações americanas ou criptomoedas.</p>

<h2>Quanto Custa Começar (Valores Reais 2025)</h2>
<table>
<thead><tr><th>Firma</th><th>Conta</th><th>Preço Normal</th><th>Com Cupom MC</th></tr></thead>
<tbody>
<tr><td>Apex</td><td>$50K Rithmic</td><td>$167/mês</td><td>~$17-33 (80-90% OFF)</td></tr>
<tr><td>Bulenox</td><td>$50K</td><td>$175/mês</td><td>~$19 (89% OFF lifetime)</td></tr>
<tr><td>FTMO</td><td>$25K</td><td>€250</td><td>~€225 (10% OFF)</td></tr>
<tr><td>FundedNext</td><td>$25K</td><td>$199</td><td>~$179 (10% OFF)</td></tr>
<tr><td>TopStep</td><td>$50K</td><td>$49/mês</td><td>~$25 (50% OFF)</td></tr>
<tr><td>Tradeify</td><td>$50K</td><td>$150/mês</td><td>~$45 (70% OFF)</td></tr>
</tbody>
</table>

<div class="callout"><strong>Dica MarketsCoupons:</strong> Nunca pague preço cheio. As promoções acontecem quase toda semana, especialmente nas firms de futuros. Acompanhe nossas ofertas para pegar o melhor momento.</div>

<h2>O Processo do Desafio — Passo a Passo</h2>
<ol>
<li><strong>Escolha a firma e conta:</strong> Comece com $50K em futuros ou $25K em forex. Não vá direto para contas grandes.</li>
<li><strong>Entenda as regras:</strong> Cada firma tem meta de lucro (geralmente 6-8%) e limite de drawdown (trailing ou fixo).</li>
<li><strong>Passe na avaliação:</strong> Atinja a meta sem violar drawdown. Na Apex não tem prazo. Na FTMO são 30 dias.</li>
<li><strong>Receba a conta financiada:</strong> Após aprovação, você opera com capital real da firma.</li>
<li><strong>Solicite payout:</strong> Lucre e peça saque. A maioria paga via Rise (antigo Deel), PayPal ou crypto.</li>
</ol>

<h2>Os 5 Erros Que Todo Iniciante Comete</h2>
<h3>1. Operar sem stop loss</h3>
<p>"Vou segurar que volta." Não volta. E quando volta, você já violou o drawdown. <strong>Sempre use stop loss.</strong></p>

<h3>2. Arriscar demais por operação</h3>
<p>Regra de ouro: <strong>nunca arrisque mais de 1-2% do drawdown por trade</strong>. Em uma conta de $50K com $2.500 de drawdown, isso significa no máximo $25-50 de risco por operação.</p>

<h3>3. Operar notícias econômicas</h3>
<p>CPI, FOMC, NFP — esses eventos geram volatilidade extrema. Até traders experientes evitam. <strong>Iniciantes devem ficar de fora.</strong></p>

<h3>4. Trocar de estratégia toda semana</h3>
<p>Escolha UMA estratégia, opere ela por pelo menos 30 dias no simulador. Não existe estratégia perfeita — existe consistência.</p>

<h3>5. Não testar no simulador primeiro</h3>
<p>Todas as plataformas (NinjaTrader, Rithmic, TradingView) oferecem conta demo gratuita. Use por pelo menos 2-4 semanas antes de pagar qualquer avaliação.</p>

<h2>Qual Firma Escolher Como Primeiro Desafio</h2>
<p>Para quem está começando, recomendamos:</p>
<ul>
<li><strong>Futuros:</strong> Apex $50K — sem prazo para completar, drawdown end-of-day, promoções frequentes de 80-90% OFF</li>
<li><strong>Forex:</strong> FundedNext $15K Express — preço acessível, processo simples, profit split de 80%</li>
</ul>
<p>Comece pequeno, prove para si mesmo que consegue ser consistente, e depois escale para contas maiores.</p>
`
  },
  {
    id:'bp2', slug:'drawdown-explicado-numeros-reais',
    level:'iniciante', levelColor:'#22C55E', levelBg:'rgba(34,197,94,.1)',
    catKey:'blog_cat_educacao', catColor:'var(--blue)', bg:'var(--bbg)',
    img:'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=300&fit=crop',
    titleKey:'blog2_titulo', excerptKey:'blog2_excerpt', dataKey:'blog2_data', readMin:10,
    content:`
<h2>O Que é Drawdown e Por Que Ele Define Seu Sucesso</h2>
<p>Drawdown é o <strong>limite máximo de perda permitido</strong> na sua conta. Violou? Conta encerrada. Simples assim. É a regra mais importante de qualquer prop firm e a razão #1 de reprovação.</p>
<p>Existem dois tipos principais, e entender a diferença entre eles pode ser a diferença entre passar ou perder sua avaliação.</p>

<h2>Trailing Drawdown (Drawdown Móvel)</h2>
<p>O trailing drawdown <strong>acompanha seu maior lucro</strong>. Conforme você ganha, o piso sobe junto — mas nunca desce.</p>

<h3>Exemplo Prático — Apex $50K</h3>
<table>
<thead><tr><th>Situação</th><th>Saldo</th><th>Maior Saldo</th><th>Piso Drawdown</th><th>Espaço Disponível</th></tr></thead>
<tbody>
<tr><td>Início</td><td>$50.000</td><td>$50.000</td><td>$47.500</td><td>$2.500</td></tr>
<tr><td>Lucro de $500</td><td>$50.500</td><td>$50.500</td><td>$48.000</td><td>$2.500</td></tr>
<tr><td>Lucro de $1.500</td><td>$52.000</td><td>$52.000</td><td>$49.500</td><td>$2.500</td></tr>
<tr><td>Perda de $800</td><td>$51.200</td><td>$52.000</td><td>$49.500</td><td>$1.700</td></tr>
<tr><td>Piso travou em $50K</td><td>$52.500+</td><td>$52.500+</td><td>$50.000</td><td>Fixo!</td></tr>
</tbody>
</table>

<div class="callout callout-tip"><strong>Detalhe crucial da Apex:</strong> Na Apex, o trailing drawdown é <strong>End-of-Day (EOD)</strong> — ele só atualiza no fechamento do dia. Isso significa que durante o dia você pode ter lucros flutuantes sem que o piso suba. Na Bulenox, o trailing é <strong>intraday</strong> — o piso sobe em tempo real, tick a tick.</div>

<h2>Static Drawdown (Drawdown Fixo)</h2>
<p>O drawdown fixo <strong>nunca se move</strong>. Se começou em $47.500, fica em $47.500 para sempre, não importa quanto você ganhe.</p>

<h3>Exemplo Prático — FTMO $50K</h3>
<table>
<thead><tr><th>Situação</th><th>Saldo</th><th>Piso Drawdown</th><th>Espaço Disponível</th></tr></thead>
<tbody>
<tr><td>Início</td><td>$50.000</td><td>$45.000 (10%)</td><td>$5.000</td></tr>
<tr><td>Lucro de $3.000</td><td>$53.000</td><td>$45.000</td><td>$8.000</td></tr>
<tr><td>Perda de $2.000</td><td>$51.000</td><td>$45.000</td><td>$6.000</td></tr>
<tr><td>Lucro de $10.000</td><td>$61.000</td><td>$45.000</td><td>$16.000</td></tr>
</tbody>
</table>

<div class="callout"><strong>Vantagem:</strong> Com drawdown fixo, cada dólar que você ganha aumenta seu "colchão". Com trailing, seu colchão permanece igual até o piso travar.</div>

<h2>Comparativo Real Entre Firmas</h2>
<table>
<thead><tr><th>Firma</th><th>Tipo</th><th>Drawdown ($50K)</th><th>Quando Atualiza</th></tr></thead>
<tbody>
<tr><td>Apex</td><td>Trailing</td><td>$2.500 (trava em $50K)</td><td>End-of-Day</td></tr>
<tr><td>Bulenox</td><td>Trailing</td><td>$2.500 (trava em $50K)</td><td>Intraday (real-time)</td></tr>
<tr><td>TopStep</td><td>Trailing</td><td>$2.000</td><td>End-of-Day</td></tr>
<tr><td>Tradeify</td><td>Trailing</td><td>$2.500 (trava em $50K)</td><td>End-of-Day</td></tr>
<tr><td>FTMO</td><td>Fixo</td><td>$5.000 (10%)</td><td>Não se move</td></tr>
<tr><td>FundedNext</td><td>Fixo</td><td>$5.000 (10%)</td><td>Não se move</td></tr>
</tbody>
</table>

<h2>Drawdown Diário vs Total</h2>
<p>Algumas firms têm <strong>dois limites</strong>:</p>
<ul>
<li><strong>Drawdown diário:</strong> Máximo que pode perder em um único dia (ex: FTMO = 5%)</li>
<li><strong>Drawdown total:</strong> Máximo de perda acumulada (ex: FTMO = 10%)</li>
</ul>
<p>Na Apex e Bulenox, existe apenas o drawdown total (trailing). Na FTMO e FundedNext, os dois se aplicam.</p>

<h2>Estratégia Para Não Violar o Drawdown</h2>
<h3>A Regra dos 1%</h3>
<p>Nunca arrisque mais de 1% do seu drawdown disponível por operação.</p>
<pre>Conta $50K Apex — Drawdown: $2.500
Risco por trade: $2.500 × 1% = $25
Com 1 micro ES (MES): stop de 5 pontos ($25)
Com 1 mini ES (ES): stop de 0.5 ponto ($25)</pre>

<h3>A Regra do "Pare no Vermelho"</h3>
<p>Defina um limite diário de perda. Se perder <strong>30% do seu drawdown em um dia</strong>, pare de operar. Na conta de $50K da Apex, isso seria $750.</p>

<h3>Scaling In (Aumento Gradual)</h3>
<p>Comece a semana com 1 contrato. Só aumente para 2 após estar no lucro. Nunca comece no tamanho máximo.</p>

<div class="callout callout-warn"><strong>Atenção:</strong> O drawdown trailing intraday (Bulenox) é significativamente mais difícil que o EOD (Apex). Se você operar scalping com alvos rápidos, um pico de lucro intraday pode mover seu piso sem que você perceba. Para scalpers, firms com drawdown EOD ou fixo são mais seguras.</div>
`
  },
  {
    id:'bp3', slug:'gerenciamento-risco-unico-que-funciona',
    level:'iniciante', levelColor:'#22C55E', levelBg:'rgba(34,197,94,.1)',
    catKey:'blog_cat_estrategia', catColor:'var(--purple)', bg:'var(--pbg)',
    img:'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=300&fit=crop',
    titleKey:'blog3_titulo', excerptKey:'blog3_excerpt', dataKey:'blog3_data', readMin:11,
    content:`
<h2>Por Que 80% dos Traders Falham no Desafio</h2>
<p>Não é por falta de estratégia. É por falta de <strong>gerenciamento de risco</strong>. O desafio de uma prop firm não testa se você é um gênio do mercado — testa se você consegue <strong>proteger capital enquanto lucra de forma consistente</strong>.</p>
<p>De acordo com dados públicos da FTMO, apenas <strong>~10-15% dos traders passam</strong> na primeira tentativa. Mas dos que passam, mais de 60% usam regras simples de risco.</p>

<h2>O Framework R:R — A Base de Tudo</h2>
<p>R:R é a relação risco/recompensa. Se você arrisca $25 para ganhar $50, seu R:R é 1:2.</p>

<h3>Por que 1:2 é o mínimo aceitável</h3>
<table>
<thead><tr><th>R:R</th><th>Win Rate Necessário</th><th>Resultado em 100 Trades ($25 risco)</th></tr></thead>
<tbody>
<tr><td>1:1</td><td>55%+</td><td>55 wins × $25 - 45 losses × $25 = $250</td></tr>
<tr><td>1:2</td><td>40%+</td><td>40 wins × $50 - 60 losses × $25 = $500</td></tr>
<tr><td>1:3</td><td>30%+</td><td>30 wins × $75 - 70 losses × $25 = $500</td></tr>
</tbody>
</table>

<div class="callout callout-tip"><strong>Insight:</strong> Com R:R de 1:2, você pode errar 60% das vezes e AINDA assim lucrar. Isso tira a pressão de "acertar todas" e permite operar com calma.</div>

<h2>Position Sizing — O Calculador que Salva Contas</h2>
<p>Nunca calcule "de cabeça" quantos contratos operar. Use a fórmula:</p>
<pre>Contratos = Risco por trade ÷ (Stop em pontos × Valor do tick)

Exemplo — ES (S&P 500 Mini):
Drawdown: $2.500 | Risco por trade: 1% = $25
Stop: 2 pontos = $100 por contrato
Contratos: $25 ÷ $100 = 0.25 → Use MES (micro)

Exemplo — MES (Micro E-mini):
$25 ÷ $10 (2 pontos × $5/ponto) = 2.5 → Use 2 MES</pre>

<h2>O Plano de Trading Diário (Template Pronto)</h2>
<p>Antes de abrir qualquer operação, preencha isso:</p>
<table>
<thead><tr><th>Item</th><th>Seu Valor</th></tr></thead>
<tbody>
<tr><td>Capital da conta</td><td>$50.000</td></tr>
<tr><td>Drawdown disponível</td><td>$2.500</td></tr>
<tr><td>Risco máximo por trade (1%)</td><td>$25</td></tr>
<tr><td>Perda máxima diária (30%)</td><td>$750</td></tr>
<tr><td>Máximo de trades por dia</td><td>3</td></tr>
<tr><td>Horário de operação</td><td>9:30-11:30 ET</td></tr>
<tr><td>Instrumentos</td><td>ES ou NQ apenas</td></tr>
<tr><td>Após 2 losses seguidos</td><td>PARAR</td></tr>
</tbody>
</table>

<h2>As 4 Regras de Ouro Para Prop Firms</h2>

<h3>Regra 1: O Stop Loss é Inegociável</h3>
<p>Coloque o stop ANTES de entrar na operação. Não mova. Não "dê mais espaço". O mercado não sabe que você existe.</p>

<h3>Regra 2: Nunca Faça Média (Average Down)</h3>
<p>Se o trade foi contra você, <strong>não adicione mais contratos</strong>. Isso é a forma mais rápida de violar drawdown. Você está tentando provar que está certo, não proteger capital.</p>

<h3>Regra 3: Respeite o Limite Diário</h3>
<p>Perdeu 30% do drawdown no dia? Desligue o computador. Amanhã é outro dia. A prop firm estará lá esperando. Operar no tilt (emocional) é a causa #1 de violação.</p>

<h3>Regra 4: Opere Menos, Não Mais</h3>
<p>A maioria dos traders que passam na avaliação fazem <strong>1-3 trades por dia</strong>. Overtrading gera comissões excessivas e decisões emocionais.</p>

<h2>Simulação: Passando na Apex $50K em 15 Dias</h2>
<table>
<thead><tr><th>Dia</th><th>Trades</th><th>Resultado</th><th>Saldo</th><th>Drawdown Usado</th></tr></thead>
<tbody>
<tr><td>1</td><td>2</td><td>+$150</td><td>$50.150</td><td>$0</td></tr>
<tr><td>2</td><td>1</td><td>+$200</td><td>$50.350</td><td>$0</td></tr>
<tr><td>3</td><td>3</td><td>-$75</td><td>$50.275</td><td>$75</td></tr>
<tr><td>4</td><td>0</td><td>Sem trade</td><td>$50.275</td><td>$75</td></tr>
<tr><td>5</td><td>2</td><td>+$300</td><td>$50.575</td><td>$0</td></tr>
<tr><td>6-10</td><td>~2/dia</td><td>+$1.200</td><td>$51.775</td><td>$0</td></tr>
<tr><td>11-15</td><td>~2/dia</td><td>+$1.525</td><td>$53.300</td><td>$0</td></tr>
</tbody>
</table>
<p><strong>Meta atingida: $3.000 (6%)</strong> com risco controlado. Média de $200/dia, 2 trades/dia, sem dia com perda maior que $200.</p>

<div class="callout"><strong>Chave do sucesso:</strong> Não tente fazer $3.000 em um dia. Faça $150-300 por dia, de forma consistente. O tempo está do seu lado — na Apex não tem prazo.</div>
`
  },

  // ─── INTERMEDIÁRIO ─────────────────────────────────
  {
    id:'bp4', slug:'como-passar-desafio-10-dias',
    level:'intermediario', levelColor:'#EAB308', levelBg:'rgba(234,179,8,.1)',
    catKey:'blog_cat_estrategia', catColor:'var(--gold)', bg:'var(--gbg)',
    img:'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&h=300&fit=crop',
    titleKey:'blog4_titulo', excerptKey:'blog4_excerpt', dataKey:'blog4_data', readMin:14,
    content:`
<h2>A Mentalidade de 10 Dias</h2>
<p>Passar no desafio de uma prop firm não é sobre velocidade — é sobre <strong>eficiência calculada</strong>. Mas se você tem uma estratégia testada e disciplina, 10 dias úteis é totalmente possível. Veja o plano.</p>

<h2>Antes de Começar: Os Pré-Requisitos</h2>
<ul>
<li><strong>Pelo menos 30 dias de operação lucrativa no simulador</strong> — se você não é consistente no demo, não será no desafio</li>
<li><strong>Estratégia definida:</strong> entrada, stop, alvo, horários. Tudo escrito.</li>
<li><strong>Win rate mínimo de 45% com R:R de 1:2</strong> ou 35% com R:R de 1:3</li>
<li><strong>Journal de trading</strong> com pelo menos 50 operações registradas</li>
</ul>

<h2>O Plano de 10 Dias — Fase por Fase</h2>

<h3>Dias 1-3: Fase de Aquecimento (Meta: +30% do objetivo)</h3>
<p>Opere com <strong>tamanho mínimo</strong>. O objetivo é pegar o ritmo, não bater meta.</p>
<ul>
<li>1-2 contratos micro (MES/MNQ)</li>
<li>Máximo 2 trades/dia</li>
<li>Meta diária: $200-400</li>
<li>Se o dia começar com loss, pare imediatamente</li>
</ul>

<h3>Dias 4-6: Fase de Construção (Meta: +40% do objetivo)</h3>
<p>Com o drawdown protegido pelo lucro dos primeiros dias, <strong>aumente levemente o tamanho</strong>.</p>
<ul>
<li>2-3 MES ou 1 ES (se lucro acumulado > $1.000)</li>
<li>2-3 trades/dia</li>
<li>Meta diária: $300-500</li>
<li>Perda máxima diária: 50% do lucro acumulado</li>
</ul>

<h3>Dias 7-9: Fase de Conclusão (Meta: +30% restante)</h3>
<p>Volte ao tamanho conservador. Você está perto — <strong>não é hora de arriscar</strong>.</p>
<ul>
<li>Volte para 1-2 MES</li>
<li>1-2 trades/dia</li>
<li>Meta diária: $200-300</li>
<li>Se faltar menos de $500 para a meta, um bom trade resolve</li>
</ul>

<h3>Dia 10: Dia de Reserva</h3>
<p>Se já atingiu a meta, <strong>não opere</strong>. Se falta pouco, faça 1 trade conservador.</p>

<h2>Estratégia Específica: Open Range Breakout (ORB)</h2>
<p>A estratégia mais usada por traders aprovados em prop firms de futuros:</p>

<h3>Setup</h3>
<ol>
<li>Marque a máxima e mínima dos primeiros 15 minutos após a abertura (9:30-9:45 ET)</li>
<li>Aguarde rompimento com volume acima da média</li>
<li>Entre na direção do rompimento com stop na extremidade oposta do range</li>
<li>Alvo: 1.5x a 2x o tamanho do range</li>
</ol>

<h3>Exemplo Real — ES (S&P 500)</h3>
<pre>Range 15min: 5.450,00 - 5.455,00 (5 pontos)
Rompimento para cima: Compra em 5.455,25
Stop: 5.449,75 (5.5 pontos = $275 por ES)
Alvo: 5.462,50 (7.25 pontos = $362.50 por ES)
R:R: 1:1.3

Com 2 MES: Risco $55, Alvo $72.50</pre>

<h2>Os Horários de Ouro (ET)</h2>
<table>
<thead><tr><th>Horário</th><th>Atividade</th><th>Risco</th><th>Recomendação</th></tr></thead>
<tbody>
<tr><td>9:30-9:45</td><td>Abertura</td><td>Alto</td><td>Observe, marque range</td></tr>
<tr><td>9:45-11:00</td><td>Momentum matinal</td><td>Médio</td><td>Melhor janela</td></tr>
<tr><td>11:00-13:30</td><td>Hora morta</td><td>Baixo</td><td>Evitar (chop)</td></tr>
<tr><td>13:30-15:00</td><td>Momentum vespertino</td><td>Médio</td><td>Segunda melhor janela</td></tr>
<tr><td>15:00-16:00</td><td>Fechamento</td><td>Alto</td><td>Só para experientes</td></tr>
</tbody>
</table>

<h2>O Que Fazer Quando o Dia Começa Mal</h2>
<p>Cenário: Você abriu o dia com 2 losses seguidos e está -$150.</p>
<h3>O que NÃO fazer:</h3>
<ul>
<li>Aumentar tamanho para "recuperar rápido"</li>
<li>Entrar em trade de "vingança"</li>
<li>Ficar operando na hora morta</li>
</ul>
<h3>O que FAZER:</h3>
<ul>
<li>Fechar a plataforma por pelo menos 1 hora</li>
<li>Rever os trades — o setup era válido? A execução foi correta?</li>
<li>Se o setup era válido, é variância normal. Se não era, anote no journal.</li>
<li>Considere voltar só na sessão da tarde, ou encerrar o dia</li>
</ul>

<div class="callout"><strong>Estatística real:</strong> Traders que param após 2 losses seguidos têm taxa de aprovação 3x maior do que os que continuam operando no mesmo dia. O melhor trade que você pode fazer é o trade que você NÃO faz.</div>

<h2>Checklist Final Para os 10 Dias</h2>
<ul>
<li>☐ Estratégia testada em 50+ trades no simulador</li>
<li>☐ Plano de trading escrito (não na cabeça)</li>
<li>☐ Risk por trade ≤ 1% do drawdown</li>
<li>☐ Limite diário de perda definido</li>
<li>☐ Horários de operação definidos</li>
<li>☐ Journal pronto para registrar cada trade</li>
<li>☐ Ambiente de trading preparado (sem distrações)</li>
<li>☐ Regra dos 2 losses: parar</li>
</ul>
`
  },
  {
    id:'bp5', slug:'trailing-vs-static-drawdown-profundo',
    level:'intermediario', levelColor:'#EAB308', levelBg:'rgba(234,179,8,.1)',
    catKey:'blog_cat_analise', catColor:'var(--orange)', bg:'var(--obg)',
    img:'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=600&h=300&fit=crop',
    titleKey:'blog5_titulo', excerptKey:'blog5_excerpt', dataKey:'blog5_data', readMin:13,
    content:`
<h2>A Decisão Que Define Qual Firma Você Deveria Escolher</h2>
<p>Trailing ou static? Essa é a pergunta mais importante que um trader intermediário precisa responder antes de escolher sua prop firm. A resposta depende do seu <strong>estilo de operação, frequência e gerenciamento</strong>.</p>

<h2>Como o Trailing Drawdown Realmente Funciona (Detalhes que Ninguém Explica)</h2>

<h3>End-of-Day (EOD) — Apex, TopStep, Tradeify</h3>
<p>O trailing EOD só atualiza no <strong>fechamento do dia de trading</strong> (17:00 ET para futuros CME). Isso significa:</p>
<ul>
<li>Se você abriu $500 no lucro intraday mas fechou o dia com +$100, o piso só sobe $100</li>
<li>Picos de lucro durante o dia NÃO movem o piso</li>
<li>Você pode scalpar agressivamente intraday sem medo do piso subir a cada tick</li>
</ul>

<h3>Intraday (Real-Time) — Bulenox</h3>
<p>O trailing intraday acompanha o <strong>maior saldo em tempo real</strong>, tick a tick:</p>
<ul>
<li>Se sua conta bateu $51.000 por 1 segundo, o piso subiu para $48.500</li>
<li>Mesmo que você tenha fechado o trade com +$200 apenas, o piso usou o pico de $1.000</li>
<li>Isso penaliza scalpers que capturam picos rápidos</li>
</ul>

<div class="callout callout-warn"><strong>Cenário real que pega traders:</strong> Você abre long em ES, o mercado sobe 8 pontos ($400/contrato), você não realiza, o mercado volta e você sai no breakeven. Com trailing EOD: tudo certo, piso não se moveu. Com trailing intraday: seu piso subiu $400 e você não ganhou nada. Agora tem $400 a menos de espaço.</div>

<h2>Cenários Simulados: Mesmo Trader, Firmas Diferentes</h2>
<p>Trader faz 3 trades no dia. Conta de $50K, drawdown $2.500:</p>

<table>
<thead><tr><th>Trade</th><th>P&L</th><th>Pico Intraday</th><th>Piso EOD</th><th>Piso Intraday</th></tr></thead>
<tbody>
<tr><td>1: Long ES +4pts</td><td>+$200</td><td>$50.200</td><td>Sem mudança</td><td>$47.700</td></tr>
<tr><td>2: Short NQ -2pts</td><td>-$40</td><td>$50.200</td><td>Sem mudança</td><td>$47.700</td></tr>
<tr><td>3: Long ES +6pts, max +10pts</td><td>+$300</td><td>$50.960</td><td>Sem mudança</td><td>$48.460</td></tr>
<tr><td><strong>Fim do dia</strong></td><td><strong>+$460</strong></td><td>—</td><td><strong>$47.960</strong></td><td><strong>$48.460</strong></td></tr>
</tbody>
</table>
<p>O trader terminou +$460. Com EOD, drawdown disponível: $2.500. Com intraday, drawdown disponível: <strong>$2.000</strong>. Diferença de $500 — 20% a menos de espaço.</p>

<h2>Static Drawdown — Quando Ele Brilha</h2>
<p>O drawdown fixo é matematicamente mais favorável quanto mais você lucra:</p>

<table>
<thead><tr><th>Lucro Acumulado</th><th>Trailing ($2.500)</th><th>Static ($5.000)</th></tr></thead>
<tbody>
<tr><td>$0 (início)</td><td>$2.500 de espaço</td><td>$5.000 de espaço</td></tr>
<tr><td>$2.500</td><td>$2.500 de espaço*</td><td>$7.500 de espaço</td></tr>
<tr><td>$5.000</td><td>$2.500 de espaço*</td><td>$10.000 de espaço</td></tr>
<tr><td>$10.000</td><td>$2.500 de espaço*</td><td>$15.000 de espaço</td></tr>
</tbody>
</table>
<p>* Até o piso travar no saldo inicial (na Apex em $50K).</p>

<h2>Qual Escolher Baseado no Seu Estilo</h2>
<table>
<thead><tr><th>Estilo</th><th>Melhor Tipo</th><th>Firma Recomendada</th><th>Motivo</th></tr></thead>
<tbody>
<tr><td>Scalping (5-20 ticks)</td><td>EOD Trailing</td><td>Apex, TopStep</td><td>Picos intraday não penalizam</td></tr>
<tr><td>Day Trading (30-100 ticks)</td><td>Static ou EOD</td><td>FTMO, Apex</td><td>Mais espaço conforme lucra</td></tr>
<tr><td>Swing (overnight)</td><td>Static</td><td>FTMO, FundedNext</td><td>Drawdown não move com gaps</td></tr>
<tr><td>Alta frequência</td><td>EOD Trailing</td><td>Apex, Tradeify</td><td>Múltiplas entradas/saídas sem mover piso</td></tr>
</tbody>
</table>

<h2>O Fator Preço — Análise Custo-Benefício</h2>
<p>Static drawdown geralmente significa avaliação mais cara:</p>
<table>
<thead><tr><th>Tipo</th><th>Firma</th><th>Preço ($50K)</th><th>Drawdown</th><th>Custo por $ de Drawdown</th></tr></thead>
<tbody>
<tr><td>Trailing EOD</td><td>Apex</td><td>~$17 (promo)</td><td>$2.500</td><td>$0.007/$</td></tr>
<tr><td>Trailing Intraday</td><td>Bulenox</td><td>~$19 (promo)</td><td>$2.500</td><td>$0.008/$</td></tr>
<tr><td>Static</td><td>FTMO</td><td>~€225</td><td>$5.000</td><td>$0.045/$</td></tr>
</tbody>
</table>
<p>Em termos de custo-benefício puro, as firms de futuros com promoção são imbatíveis. Mas o drawdown estático da FTMO oferece mais margem de erro.</p>

<div class="callout"><strong>Conclusão prática:</strong> Se você é scalper de futuros, vá de Apex (EOD trailing + preço baixo). Se é day trader de forex que segura posições por horas, vá de FTMO (static + mais espaço). Se quer o melhor dos dois mundos, a Apex trava o trailing em $50K depois de lucrar $2.500 — efetivamente vira static.</div>
`
  },
  {
    id:'bp6', slug:'multi-accounting-vale-o-risco',
    level:'intermediario', levelColor:'#EAB308', levelBg:'rgba(234,179,8,.1)',
    catKey:'blog_cat_analise', catColor:'var(--cyan)', bg:'var(--cbg)',
    img:'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop',
    titleKey:'blog6_titulo', excerptKey:'blog6_excerpt', dataKey:'blog6_data', readMin:11,
    content:`
<h2>O Que é Multi-Accounting e Por Que Todo Mundo Faz</h2>
<p>Multi-accounting é ter <strong>múltiplas contas financiadas simultaneamente</strong>. Um trader com 5 contas de $50K na Apex efetivamente opera com $250K de poder de compra e pode lucrar 5x mais.</p>
<p>A pergunta é: <strong>é permitido?</strong> A resposta varia drasticamente por firma.</p>

<h2>Regras Oficiais por Firma (Atualizado 2025)</h2>

<h3>Apex Trader Funding</h3>
<ul>
<li><strong>Máximo: 20 contas de avaliação ativas + 20 contas PA (performance)</strong></li>
<li>Pode operar múltiplas contas simultâneas</li>
<li>Regra: posições NÃO podem ser opostas entre contas (ex: long em uma, short em outra)</li>
<li>Todas as contas devem estar no mesmo nome/CPF</li>
<li>Não é permitido "flipping" — abrir e fechar contas rapidamente para abusar de promoções</li>
</ul>

<h3>Bulenox</h3>
<ul>
<li><strong>Máximo: 5 contas PA simultâneas</strong></li>
<li>Sem limite de contas de avaliação</li>
<li>Mesma regra de posições opostas se aplica</li>
<li>Payouts independentes por conta</li>
</ul>

<h3>FTMO</h3>
<ul>
<li><strong>Capital máximo total: $400K</strong> (ex: 2 contas de $200K ou 4 de $100K)</li>
<li>Pode combinar diferentes tamanhos</li>
<li>Cada conta é uma avaliação separada</li>
<li>Regra de consistência se aplica por conta individualmente</li>
</ul>

<h3>FundedNext</h3>
<ul>
<li><strong>Capital máximo: $300K</strong></li>
<li>Máximo de 3 contas ativas</li>
<li>Profit split cresce com o tempo (60% → 90%)</li>
</ul>

<h3>TopStep</h3>
<ul>
<li><strong>Máximo: 5 contas ativas</strong></li>
<li>Cada conta precisa de avaliação separada</li>
<li>Contas independentes para payout</li>
</ul>

<h3>Tradeify</h3>
<ul>
<li><strong>Máximo: 5 contas ativas</strong></li>
<li>Promoções frequentes para múltiplas contas</li>
</ul>

<h2>Estratégia Inteligente de Multi-Accounting</h2>

<h3>Abordagem 1: Mesma Estratégia, Mesmo Trade</h3>
<p>Você opera o mesmo setup em todas as contas simultaneamente. Se der certo, lucra em todas. Se der errado, perde em todas.</p>
<ul>
<li><strong>Vantagem:</strong> Simples de executar, multiplica lucros</li>
<li><strong>Desvantagem:</strong> Também multiplica perdas</li>
<li><strong>Ideal para:</strong> Traders consistentes com win rate comprovado > 55%</li>
</ul>

<h3>Abordagem 2: Estratégias Complementares</h3>
<p>Conta 1: scalping na abertura. Conta 2: swing no range. Conta 3: breakout no período da tarde.</p>
<ul>
<li><strong>Vantagem:</strong> Diversifica risco</li>
<li><strong>Desvantagem:</strong> Mais complexo, precisa dominar múltiplas estratégias</li>
<li><strong>Ideal para:</strong> Traders experientes com 1+ ano de consistência</li>
</ul>

<h3>Abordagem 3: Escalonamento Gradual</h3>
<p>Comece com 1 conta. Após 2 payouts bem-sucedidos, adicione a 2ª. Após 2 payouts na 2ª, adicione a 3ª.</p>
<ul>
<li><strong>Vantagem:</strong> Crescimento sustentável, menor risco</li>
<li><strong>Desvantagem:</strong> Mais lento</li>
<li><strong>Ideal para:</strong> Traders que querem construir uma operação profissional</li>
</ul>

<div class="callout callout-warn"><strong>O que NÃO fazer:</strong><br>
• Abrir 10 contas de uma vez na promoção sem ter consistência<br>
• Usar contas diferentes para hedge (long em uma, short em outra) — isso viola os termos de quase todas as firms<br>
• Compartilhar contas com outras pessoas — rastreiam IP e dispositivo<br>
• Usar bots/copy trade entre contas sem verificar se é permitido (Apex proíbe)</div>

<h2>Matemática do Multi-Accounting</h2>
<table>
<thead><tr><th>Cenário</th><th>1 Conta</th><th>3 Contas</th><th>5 Contas</th></tr></thead>
<tbody>
<tr><td>Custo mensal (promo)</td><td>~$20</td><td>~$60</td><td>~$100</td></tr>
<tr><td>Capital total</td><td>$50K</td><td>$150K</td><td>$250K</td></tr>
<tr><td>Lucro mensal (2%)</td><td>$1.000</td><td>$3.000</td><td>$5.000</td></tr>
<tr><td>Payout (80% split)</td><td>$800</td><td>$2.400</td><td>$4.000</td></tr>
<tr><td>Lucro líquido</td><td>$780</td><td>$2.340</td><td>$3.900</td></tr>
</tbody>
</table>

<div class="callout callout-tip"><strong>Realidade:</strong> Com 5 contas Apex em promoção (~$100 total) e 2% de lucro mensal consistente, você pode faturar quase $4.000/mês (~R$20.000). Mas isso REQUER consistência provada — nunca comece com 5 contas se não tem pelo menos 3 meses de resultado positivo em 1 conta.</div>
`
  },

  // ─── PROFISSIONAL ─────────────────────────────────
  {
    id:'bp7', slug:'operando-3-mesas-simultaneamente',
    level:'profissional', levelColor:'#EF4444', levelBg:'rgba(239,68,68,.1)',
    catKey:'blog_cat_estrategia', catColor:'var(--orange)', bg:'var(--obg)',
    img:'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=300&fit=crop',
    titleKey:'blog7_titulo', excerptKey:'blog7_excerpt', dataKey:'blog7_data', readMin:12,
    content:`
<h2>A Realidade de Operar em Múltiplas Prop Firms</h2>
<p>Operar em 3+ prop firms simultaneamente é o caminho que muitos traders profissionais seguem para <strong>maximizar capital, diversificar risco de contraparte e aumentar payouts</strong>. Mas exige organização militar.</p>

<h2>Por Que Diversificar Entre Firmas</h2>
<h3>1. Risco de Contraparte</h3>
<p>Prop firms são empresas privadas. Já vimos firms fecharem do dia para a noite (MFF, True Forex Funds). Se todo seu capital está em uma firma e ela fecha, você perde tudo. Com 3 firmas, perde no máximo 33%.</p>

<h3>2. Regras Complementares</h3>
<p>Apex permite operar notícias. FTMO não permite em certos instrumentos. TopStep tem regras de consistência. Diversificando, você sempre tem uma firma onde seu estilo funciona independente do calendário econômico.</p>

<h3>3. Maximizar Payouts</h3>
<p>Cada firma tem ciclos de payout diferentes. Com 3 firmas, você pode ter payouts semanais alternados, criando fluxo de caixa constante.</p>

<h2>Setup Operacional Profissional</h2>

<h3>Infraestrutura</h3>
<table>
<thead><tr><th>Item</th><th>Recomendação</th><th>Custo Estimado</th></tr></thead>
<tbody>
<tr><td>PC</td><td>i7/Ryzen 7, 32GB RAM, SSD NVMe</td><td>R$5.000-8.000</td></tr>
<tr><td>Monitores</td><td>2-3 monitores (1 por firma + gráfico)</td><td>R$2.000-4.000</td></tr>
<tr><td>Internet</td><td>Fibra 300Mbps+ com backup 4G</td><td>R$200-400/mês</td></tr>
<tr><td>VPS</td><td>Para firms que exigem baixa latência</td><td>$20-50/mês</td></tr>
<tr><td>Plataformas</td><td>NinjaTrader (futuros) + MT5 (forex)</td><td>Licença NT: $99/mês ou $1.099 lifetime</td></tr>
</tbody>
</table>

<h3>Organização por Monitor</h3>
<pre>Monitor 1: Gráfico principal + order flow
Monitor 2: Plataforma Firma 1 (Apex) + Firma 2 (Bulenox)
Monitor 3: Plataforma Firma 3 (FTMO/MT5) + Calendário econômico</pre>

<h2>Gestão de Capital Profissional</h2>

<h3>Distribuição Recomendada</h3>
<table>
<thead><tr><th>Firma</th><th>Contas</th><th>Capital</th><th>Mercado</th><th>Estratégia Principal</th></tr></thead>
<tbody>
<tr><td>Apex</td><td>3-5x $50K</td><td>$150-250K</td><td>Futuros (ES, NQ)</td><td>ORB + Momentum</td></tr>
<tr><td>Bulenox</td><td>2-3x $50K</td><td>$100-150K</td><td>Futuros (ES, CL)</td><td>Range trading</td></tr>
<tr><td>FTMO</td><td>1-2x $100K</td><td>$100-200K</td><td>Forex (EUR/USD, GBP)</td><td>Swing + news</td></tr>
</tbody>
</table>

<h3>Fluxo de Payout Mensal</h3>
<table>
<thead><tr><th>Semana</th><th>Firma</th><th>Payout Estimado</th></tr></thead>
<tbody>
<tr><td>Semana 1</td><td>Apex (contas 1-2)</td><td>$800-1.500</td></tr>
<tr><td>Semana 2</td><td>Bulenox</td><td>$600-1.200</td></tr>
<tr><td>Semana 3</td><td>Apex (contas 3-5)</td><td>$800-1.500</td></tr>
<tr><td>Semana 4</td><td>FTMO</td><td>$1.000-2.500</td></tr>
<tr><td><strong>Total Mensal</strong></td><td></td><td><strong>$3.200-6.700</strong></td></tr>
</tbody>
</table>

<h2>Erros Comuns de Profissionais</h2>

<h3>1. Overleverage Cruzado</h3>
<p>Se você está long em 3 contas Apex + 2 Bulenox simultâneas, efetivamente tem 5x o risco. Uma queda forte de 30 pontos no ES viola TODAS as contas de uma vez.</p>
<p><strong>Solução:</strong> Nunca tenha mais de 60% das contas na mesma direção simultaneamente.</p>

<h3>2. Ignorar Regras Específicas</h3>
<p>Apex permite operar fora do horário regular. TopStep não. FTMO tem limite diário. Misturar regras é receita para violação.</p>
<p><strong>Solução:</strong> Planilha com regras de cada firma visível no setup.</p>

<h3>3. Burnout</h3>
<p>Gerenciar 5-10 contas é mentalmente exaustivo. Dias ruins em todas as contas ao mesmo tempo geram estresse significativo.</p>
<p><strong>Solução:</strong> Escale gradualmente. Não pule de 1 para 10 contas. Adicione 1-2 por mês.</p>

<div class="callout"><strong>Framework profissional:</strong> Trate suas contas como um portfólio. Cada firma é um "ativo" com risco diferente. Diversifique entre mercados (futuros + forex), tipos de drawdown (trailing + static) e estilos (scalp + swing). Isso maximiza retorno ajustado ao risco.</div>
`
  },
  {
    id:'bp8', slug:'gestao-fiscal-traders-financiados-brasil',
    level:'profissional', levelColor:'#EF4444', levelBg:'rgba(239,68,68,.1)',
    catKey:'blog_cat_educacao', catColor:'var(--purple)', bg:'var(--pbg)',
    img:'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=300&fit=crop',
    titleKey:'blog8_titulo', excerptKey:'blog8_excerpt', dataKey:'blog8_data', readMin:15,
    content:`
<h2>Disclaimer Importante</h2>
<div class="callout callout-warn"><strong>Este artigo é educativo.</strong> Não é aconselhamento fiscal ou jurídico. Consulte um contador especializado em renda variável ou tributação internacional para sua situação específica. As regras fiscais podem mudar.</div>

<h2>Como a Receita Federal Enxerga Rendimentos de Prop Firms</h2>
<p>Rendimentos de prop firms estrangeiras são classificados como <strong>rendimentos recebidos do exterior</strong>. Na prática, é dinheiro que uma empresa estrangeira te paga por um serviço (gestão de capital). Isso cai na tributação de <strong>rendimentos de pessoa física recebidos do exterior</strong>.</p>

<h3>Enquadramento Tributário</h3>
<ul>
<li><strong>Para Pessoa Física:</strong> Tributação pelo Carnê-Leão mensal, com alíquotas progressivas de IR (até 27,5%)</li>
<li><strong>Para Pessoa Jurídica (MEI/ME):</strong> Pode ser mais vantajoso dependendo do faturamento — veja análise abaixo</li>
</ul>

<h2>Carnê-Leão — O Passo a Passo</h2>

<h3>1. Recebimento do Payout</h3>
<p>Você recebe via Rise (antigo Deel), PayPal, Wise ou crypto. O valor precisa ser convertido para Reais pela cotação do <strong>dólar PTAX de venda do último dia útil da primeira quinzena do mês anterior ao recebimento</strong>.</p>

<h3>2. Cálculo Mensal</h3>
<table>
<thead><tr><th>Faixa de Rendimento Mensal (2025)</th><th>Alíquota</th><th>Dedução</th></tr></thead>
<tbody>
<tr><td>Até R$2.259,20</td><td>Isento</td><td>—</td></tr>
<tr><td>R$2.259,21 a R$2.826,65</td><td>7,5%</td><td>R$169,44</td></tr>
<tr><td>R$2.826,66 a R$3.751,05</td><td>15%</td><td>R$381,44</td></tr>
<tr><td>R$3.751,06 a R$4.664,68</td><td>22,5%</td><td>R$662,77</td></tr>
<tr><td>Acima de R$4.664,68</td><td>27,5%</td><td>R$896,00</td></tr>
</tbody>
</table>

<h3>3. Exemplo Prático</h3>
<pre>Payout do mês: $2.000
Câmbio PTAX: R$5,20
Rendimento em R$: R$10.400

IR = R$10.400 × 27,5% - R$896 = R$1.964
Líquido: R$10.400 - R$1.964 = R$8.436</pre>

<h2>Pessoa Jurídica — Vale a Pena?</h2>

<h3>Opção 1: MEI (Microempreendedor Individual)</h3>
<ul>
<li>Limite: R$81.000/ano (R$6.750/mês)</li>
<li>Imposto: ~R$70/mês (DAS fixo)</li>
<li><strong>Problema:</strong> Não existe CNAE para "trading em prop firms". Alguns contadores enquadram como consultoria, mas é arriscado.</li>
</ul>

<h3>Opção 2: Simples Nacional (ME)</h3>
<ul>
<li>Limite: R$360.000/ano</li>
<li>Alíquota efetiva: 6-15% dependendo da faixa</li>
<li>Mais seguro juridicamente que MEI</li>
<li>CNAE sugerido: 6619-3/99 (Outras atividades auxiliares dos serviços financeiros)</li>
</ul>

<h3>Opção 3: Lucro Presumido</h3>
<ul>
<li>Sem limite de faturamento prático</li>
<li>Presunção de lucro: 32% para serviços</li>
<li>Alíquota efetiva sobre faturamento: ~13-16%</li>
<li>Ideal para quem fatura acima de R$15.000/mês</li>
</ul>

<h3>Comparativo PF vs PJ</h3>
<table>
<thead><tr><th>Faturamento Mensal</th><th>IR Pessoa Física</th><th>Simples Nacional</th><th>Lucro Presumido</th></tr></thead>
<tbody>
<tr><td>R$5.000</td><td>R$479 (9,6%)</td><td>~R$300 (6%)</td><td>~R$750 (15%)</td></tr>
<tr><td>R$10.000</td><td>R$1.854 (18,5%)</td><td>~R$800 (8%)</td><td>~R$1.500 (15%)</td></tr>
<tr><td>R$20.000</td><td>R$4.604 (23%)</td><td>~R$2.200 (11%)</td><td>~R$3.000 (15%)</td></tr>
<tr><td>R$40.000</td><td>R$10.104 (25,3%)</td><td>~R$5.600 (14%)</td><td>~R$6.000 (15%)</td></tr>
</tbody>
</table>

<div class="callout callout-tip"><strong>Conclusão:</strong> Acima de R$5.000/mês, PJ no Simples Nacional quase sempre compensa. Acima de R$15.000/mês, Lucro Presumido pode ser melhor. Consulte um contador para sua situação.</div>

<h2>Declaração Anual (DIRPF)</h2>
<ol>
<li><strong>Rendimentos do exterior:</strong> Informar todos os payouts na ficha "Rendimentos Tributáveis Recebidos de PF/Exterior"</li>
<li><strong>Bens e direitos:</strong> Declarar saldo em plataformas de pagamento (Rise, PayPal, Wise) acima de $140</li>
<li><strong>Crypto:</strong> Se recebeu payout em crypto, declarar na ficha de Bens e Direitos (cód. 89)</li>
<li><strong>Câmbio:</strong> Usar a cotação PTAX de cada recebimento</li>
</ol>

<h2>Erros Que Podem Dar Problema</h2>
<ul>
<li><strong>Não declarar:</strong> A Receita cruza dados de câmbio. Transferências internacionais acima de $1.000 são reportadas automaticamente.</li>
<li><strong>Declarar como "ganho de capital":</strong> Prop firm não é investimento próprio, é serviço. A tributação é diferente.</li>
<li><strong>Ignorar o câmbio:</strong> Usar "dólar do dia" em vez do PTAX correto pode gerar divergência com a Receita.</li>
<li><strong>Misturar PF e PJ:</strong> Se tem CNPJ, todos os recebimentos devem ir pelo CNPJ. Não alterne.</li>
</ul>

<h2>Checklist Fiscal do Trader Profissional</h2>
<ul>
<li>☐ Planilha mensal de payouts (data, firma, valor USD, câmbio PTAX, valor BRL)</li>
<li>☐ Carnê-Leão pago até o último dia útil do mês seguinte</li>
<li>☐ Comprovantes de transferência arquivados (5 anos)</li>
<li>☐ Contador informado sobre a natureza dos rendimentos</li>
<li>☐ DIRPF completa com rendimentos do exterior</li>
</ul>
`
  },
  {
    id:'bp9', slug:'de-50k-para-300k-scaling-plans',
    level:'profissional', levelColor:'#EF4444', levelBg:'rgba(239,68,68,.1)',
    catKey:'blog_cat_analise', catColor:'var(--gold)', bg:'var(--gbg)',
    img:'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=600&h=300&fit=crop',
    titleKey:'blog9_titulo', excerptKey:'blog9_excerpt', dataKey:'blog9_data', readMin:13,
    content:`
<h2>O Que São Scaling Plans</h2>
<p>Scaling plans são programas onde a prop firm <strong>aumenta o tamanho da sua conta</strong> baseado no seu desempenho consistente. Começou com $50K, pode chegar a $150K, $300K ou até mais — sem pagar novas avaliações.</p>
<p>Nem toda firma oferece, e as regras variam muito. Veja o comparativo completo.</p>

<h2>Scaling Plans por Firma (Atualizado 2025)</h2>

<h3>Apex Trader Funding</h3>
<table>
<thead><tr><th>Requisito</th><th>Detalhes</th></tr></thead>
<tbody>
<tr><td>Elegibilidade</td><td>Conta PA ativa com payouts consistentes</td></tr>
<tr><td>Progressão</td><td>$50K → $75K → $100K → $150K → $200K → $300K</td></tr>
<tr><td>Critério por nível</td><td>3 meses consecutivos lucrativos com pelo menos 1 payout/mês</td></tr>
<tr><td>Drawdown escala?</td><td>Sim, proporcional ao aumento da conta</td></tr>
<tr><td>Profit split muda?</td><td>Mantém o mesmo (100% nos primeiros $25K, 90% depois)</td></tr>
</tbody>
</table>

<h3>FTMO</h3>
<table>
<thead><tr><th>Requisito</th><th>Detalhes</th></tr></thead>
<tbody>
<tr><td>Elegibilidade</td><td>4 meses com lucro ≥10% em pelo menos 2 deles</td></tr>
<tr><td>Progressão</td><td>Aumento de 25% do capital original a cada ciclo</td></tr>
<tr><td>Limite</td><td>Até $400K total (combinando todas as contas)</td></tr>
<tr><td>Profit split</td><td>Sobe de 80% para 90% após scaling</td></tr>
<tr><td>Condição especial</td><td>Não pode ter violado nenhuma regra nos 4 meses</td></tr>
</tbody>
</table>

<h3>FundedNext</h3>
<table>
<thead><tr><th>Requisito</th><th>Detalhes</th></tr></thead>
<tbody>
<tr><td>Modelo</td><td>Profit split progressivo (não aumenta conta)</td></tr>
<tr><td>Início</td><td>60% profit split</td></tr>
<tr><td>Progressão</td><td>60% → 70% → 80% → 90% baseado em lucro acumulado</td></tr>
<tr><td>Capital máximo</td><td>$300K (via múltiplas contas)</td></tr>
</tbody>
</table>

<h3>Bulenox</h3>
<table>
<thead><tr><th>Requisito</th><th>Detalhes</th></tr></thead>
<tbody>
<tr><td>Scaling</td><td>Não possui scaling plan formal</td></tr>
<tr><td>Alternativa</td><td>Compre múltiplas contas (até 5 PA) para escalar capital</td></tr>
<tr><td>Vantagem</td><td>Com promoção de 89% OFF, 5 contas × $50K = $250K por ~$100 total</td></tr>
</tbody>
</table>

<h3>TopStep</h3>
<table>
<thead><tr><th>Requisito</th><th>Detalhes</th></tr></thead>
<tbody>
<tr><td>Scaling</td><td>Programa "Progression" — aumenta poder de compra gradualmente</td></tr>
<tr><td>Início</td><td>$50K com 2 contratos max</td></tr>
<tr><td>Progressão</td><td>Aumenta 1 contrato a cada milestone de lucro</td></tr>
<tr><td>Alternativa</td><td>Até 5 contas simultâneas</td></tr>
</tbody>
</table>

<h2>Roadmap Realista: $50K → $300K em 12 Meses</h2>

<h3>Meses 1-3: Fundação (1 conta $50K)</h3>
<ul>
<li>Meta: passar na avaliação e conseguir 2 payouts</li>
<li>Lucro mensal alvo: $1.000-1.500</li>
<li>Foco: consistência, não tamanho</li>
<li>Payout total: ~$3.000</li>
</ul>

<h3>Meses 4-6: Expansão (3 contas = $150K)</h3>
<ul>
<li>Adicionar 2 contas novas (Apex + Bulenox)</li>
<li>Custo: ~$40 (promoção)</li>
<li>Lucro mensal alvo: $2.500-4.000</li>
<li>Solicitar scaling na conta original (Apex $50K → $75K)</li>
<li>Payout total acumulado: ~$12.000</li>
</ul>

<h3>Meses 7-9: Diversificação (5 contas + FTMO = $300K)</h3>
<ul>
<li>Adicionar FTMO $100K (investimento: ~€450 com desconto)</li>
<li>Total de capital: $75K (Apex scaled) + $100K (2 Apex) + $50K (Bulenox) + $100K (FTMO) = $325K</li>
<li>Lucro mensal alvo: $5.000-8.000</li>
<li>Payout total acumulado: ~$30.000</li>
</ul>

<h3>Meses 10-12: Otimização ($300K+ operacional)</h3>
<ul>
<li>Scaling Apex para $100K+</li>
<li>FTMO scaling para $150K (profit split 90%)</li>
<li>Lucro mensal alvo: $6.000-10.000</li>
<li>Payout total acumulado: ~$54.000</li>
</ul>

<h2>Matemática do Scaling vs Multi-Account</h2>
<table>
<thead><tr><th>Abordagem</th><th>Capital em 12 meses</th><th>Custo</th><th>Complexidade</th><th>Profit Split</th></tr></thead>
<tbody>
<tr><td>1 conta + scaling</td><td>$150K (Apex) ou $200K (FTMO)</td><td>~$20</td><td>Baixa</td><td>90-100%</td></tr>
<tr><td>Multi-account sem scaling</td><td>$250K (5 × $50K)</td><td>~$100</td><td>Alta</td><td>80-90%</td></tr>
<tr><td>Multi-account + scaling</td><td>$400K+</td><td>~$500+</td><td>Muito alta</td><td>80-100%</td></tr>
</tbody>
</table>

<div class="callout"><strong>Estratégia ideal:</strong> Comece com scaling em 1 firma (Apex ou FTMO). Quando estiver estável em $100K+, diversifique para uma segunda firma. Multi-account + scaling é o endgame, mas leva 6-12 meses de consistência para chegar lá com segurança.</div>

<h2>Armadilhas do Scaling</h2>
<ul>
<li><strong>Conta maior ≠ mais agressivo:</strong> Se você escalou de $50K para $100K, continue operando com o mesmo risco percentual. Não dobre o tamanho da posição.</li>
<li><strong>Reset de drawdown:</strong> Algumas firms resetam o drawdown ao escalar. Verifique se o trailing recomeça do zero.</li>
<li><strong>Pressão psicológica:</strong> Operar $300K causa mais ansiedade que $50K. Se perceber que está operando diferente, reduza o tamanho.</li>
<li><strong>Regra de consistência:</strong> FTMO exige que nenhum mês represente mais de 50% do lucro total. Não adianta ter 1 mês excepcional e 3 mediocres.</li>
</ul>
`
  }
];

let _blogFilter = 'all';
let _blogPostsDB = []; // posts carregados do Supabase

const _BLOG_LEVEL_MAP = {
  iniciante:    {key:'blvl_iniciante',     color:'#22C55E', bg:'rgba(34,197,94,.1)'},
  intermediario:{key:'blvl_intermediario', color:'#EAB308', bg:'rgba(234,179,8,.1)'},
  avancado:     {key:'blvl_avancado',      color:'#EF4444', bg:'rgba(239,68,68,.1)'},
  profissional: {key:'blvl_profissional',  color:'#EF4444', bg:'rgba(239,68,68,.1)'},
};
const _BLOG_CAT_MAP = {
  'analise-tecnica':{color:'var(--blue)',  key:'bcat_analise_tecnica'},
  'prop-firms':     {color:'var(--gold)',  key:'bcat_prop_firms'},
  'educacao':       {color:'var(--green)', key:'bcat_educacao'},
  'mercado':        {color:'#EC4899',      key:'bcat_mercado'},
  'risk-management':{color:'var(--gold)',  key:'bcat_risk_mgmt'},
};

let _blogLangLoaded = '';

async function renderBlog(){
  const g=document.getElementById('blog-grid');if(!g)return;
  const curLang = _currentLang || 'pt';

  // Recarrega se mudou de idioma ou ainda não carregou
  if(_blogLangLoaded !== curLang || !_blogPostsDB.length){
    // Mostra fallback hardcoded enquanto carrega (só em PT)
    if(curLang==='pt' && !_blogPostsDB.length){
      _renderBlogCards(g, BLOG_POSTS.map(p=>({
        slug:p.slug, title:t(p.titleKey), excerpt:t(p.excerptKey),
        level:p.level, category:p.catKey?.replace('blog_cat_','') || 'educacao',
        created_at:null, read_time:p.readMin+'min', lang:'pt'
      })));
    }

    try {
      const {data} = await db.from('blog_posts')
        .select('slug,title,excerpt,level,category,created_at,read_time,lang')
        .eq('lang', curLang)
        .eq('active', true)
        .order('created_at',{ascending:false});
      if(data && data.length){
        _blogPostsDB = data;
        _blogLangLoaded = curLang;
        _renderBlogGrid();
      }
    } catch(e){ /* fallback hardcoded já está visível */ }
  } else {
    _renderBlogGrid();
  }
}

function _renderBlogGrid(){
  const g=document.getElementById('blog-grid');if(!g)return;
  const posts = _blogFilter==='all' ? _blogPostsDB : _blogPostsDB.filter(p=>p.level===_blogFilter);
  _renderBlogCards(g, posts);
}

// Capas SVG unicas por tema (match parcial no slug)
const _BLOG_COVER_MAP = [
  ['wyckoff',        'img/blog/wyckoff.svg'],
  ['elliott',        'img/blog/elliott.svg'],
  ['ondas',          'img/blog/elliott.svg'],
  ['vagues',         'img/blog/elliott.svg'],
  ['wellen',         'img/blog/elliott.svg'],
  ['fibonacci',      'img/blog/fibonacci.svg'],
  ['volume-pre',     'img/blog/vpa.svg'],
  ['anna-coulling',  'img/blog/vpa.svg'],
  ['volumen-preis',  'img/blog/vpa.svg'],
  ['analyse-volume', 'img/blog/vpa.svg'],
  ['analisis-volumen','img/blog/vpa.svg'],
  ['analisi-volume', 'img/blog/vpa.svg'],
  ['drawdown',       'img/blog/drawdown.svg'],
  ['trailing',       'img/blog/drawdown.svg'],
  ['risco',          'img/blog/risk-management.svg'],
  ['risk',           'img/blog/risk-management.svg'],
  ['risiko',         'img/blog/risk-management.svg'],
  ['risque',         'img/blog/risk-management.svg'],
  ['gestion-riesgo', 'img/blog/risk-management.svg'],
  ['gestione-rischio','img/blog/risk-management.svg'],
  ['gerenciamento',  'img/blog/risk-management.svg'],
  ['gestao-de-risco','img/blog/risk-management.svg'],
  ['melhores-prop',  'img/blog/best-prop-firms.svg'],
  ['mejores-prop',   'img/blog/best-prop-firms.svg'],
  ['best-prop',      'img/blog/best-prop-firms.svg'],
  ['meilleures-prop','img/blog/best-prop-firms.svg'],
  ['beste-prop',     'img/blog/best-prop-firms.svg'],
  ['migliori-prop',  'img/blog/best-prop-firms.svg'],
  ['como-passar-avaliacao','img/blog/how-to-pass.svg'],
  ['how-to-pass',    'img/blog/how-to-pass.svg'],
  ['como-pasar',     'img/blog/how-to-pass.svg'],
  ['reussir',        'img/blog/how-to-pass.svg'],
  ['bewertung',      'img/blog/how-to-pass.svg'],
  ['superare',       'img/blog/how-to-pass.svg'],
  ['sua-primeira',   'img/blog/first-prop-firm.svg'],
  ['desafio-10',     'img/blog/challenge-10-days.svg'],
  ['como-passar-desafio','img/blog/challenge-10-days.svg'],
  ['multi-account',  'img/blog/multi-account.svg'],
  ['scaling',        'img/blog/scaling.svg'],
  ['50k-para-300k',  'img/blog/scaling.svg'],
  ['operando-3',     'img/blog/multi-desk.svg'],
  ['fiscal',         'img/blog/tax.svg'],
];

function _getBlogCoverImg(slug){
  for(const [key, img] of _BLOG_COVER_MAP){
    if(slug.includes(key)) return img;
  }
  return 'img/blog/wyckoff.svg';
}

function _renderBlogCards(g, posts){
  const curLang = _currentLang || 'pt';
  g.innerHTML=posts.map(post=>{
    const lvl = _BLOG_LEVEL_MAP[post.level]||_BLOG_LEVEL_MAP.iniciante;
    const cat = _BLOG_CAT_MAP[post.category]||{color:'var(--blue)',key:''};
    const coverImg = _getBlogCoverImg(post.slug);
    const blogUrl = curLang==='pt' ? '/blog/'+post.slug : '/blog/'+curLang+'/'+post.slug;
    const _dtLocale = {pt:'pt-BR',en:'en-US',es:'es-ES',it:'it-IT',fr:'fr-FR',de:'de-DE',ar:'ar-SA'}[curLang]||'pt-BR';
    const dateStr = post.created_at ? new Date(post.created_at).toLocaleDateString(_dtLocale,{day:'2-digit',month:'short',year:'numeric'}) : '';
    return `
    <a href="${blogUrl}" class="bc" style="text-decoration:none;color:inherit;">
      <div class="bc-img" style="background-image:url('${coverImg}')">
        <div class="bc-level" style="background:${lvl.bg};color:${lvl.color};">${t(lvl.key)}</div>
      </div>
      <div class="bc-body">
        <div class="bc-cat" style="color:${cat.color};">${cat.key?t(cat.key):(post.category||'Blog')}</div>
        <div class="bc-title">${post.title}</div>
        <div class="bc-excerpt">${post.excerpt||''}</div>
        <div class="bc-meta">
          <span class="bc-date">${dateStr}</span>
          <span class="bc-read">${t('blog_ler')||'Ler →'}</span>
        </div>
      </div>
    </a>`;
  }).join('');
}

function filterBlog(level, btn){
  _blogFilter = level;
  document.querySelectorAll('.bf-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  _renderBlogGrid();
}

// Fallback: se clicar em post hardcoded antes do Supabase carregar
function openBlogArticle(slug){
  const curLang = _currentLang || 'pt';
  const blogUrl = curLang==='pt' ? '/blog/'+slug : '/blog/'+curLang+'/'+slug;
  window.location.href = blogUrl;
}

function closeBlogArticle(){
  const grid=document.getElementById('blog-grid');
  const hdr=document.getElementById('blog-header');
  const filters=document.getElementById('blog-filters');
  const art=document.getElementById('blog-article');
  if(art){art.classList.remove('open');art.innerHTML='';}
  if(grid)grid.style.display='';
  if(hdr)hdr.style.display='';
  if(filters)filters.style.display='';
}

/* QUIZ */
function renderQuiz(){
  const wrap=document.getElementById('quiz-wrap');if(!wrap)return;
  const questions=[
    {titleKey:'quiz_q1_titulo',subKey:'quiz_q1_sub',opts:[{key:'quiz_q1_a1',val:'futures'},{key:'quiz_q1_a2',val:'forex'},{key:'quiz_q1_a3',val:'both'},{key:'quiz_q1_a4',val:'unsure'}],next:1},
    {titleKey:'quiz_q2_titulo',subKey:'quiz_q2_sub',opts:[{key:'quiz_q2_a1',val:'beginner'},{key:'quiz_q2_a2',val:'intermediate'},{key:'quiz_q2_a3',val:'advanced'},{key:'quiz_q2_a4',val:'pro'}],next:2},
    {titleKey:'quiz_q3_titulo',subKey:'quiz_q3_sub',opts:[{key:'quiz_q3_a1',val:'small'},{key:'quiz_q3_a2',val:'mid'},{key:'quiz_q3_a3',val:'large'},{key:'quiz_q3_a4',val:'xlarge'}],next:3},
    {titleKey:'quiz_q4_titulo',subKey:'quiz_q4_sub',opts:[{key:'quiz_q4_a1',val:'scalp'},{key:'quiz_q4_a2',val:'day'},{key:'quiz_q4_a3',val:'swing'},{key:'quiz_q4_a4',val:'algo'}],next:4},
    {titleKey:'quiz_q5_titulo',subKey:'quiz_q5_sub',opts:[{key:'quiz_q5_a1',val:'discount',finish:true},{key:'quiz_q5_a2',val:'speed',finish:true},{key:'quiz_q5_a3',val:'split',finish:true},{key:'quiz_q5_a4',val:'rules',finish:true}],next:null},
  ];
  const total=questions.length;
  let html=questions.map((q,i)=>`
    <div class="qstep${i===0?' active':''}" id="qs${i}">
      <div class="q-num">${t('quiz_pergunta')} ${i+1} ${t('quiz_de')} ${total}</div>
      <div class="q-q">${t(q.titleKey)}</div>
      ${q.subKey&&t(q.subKey)?`<div class="q-sub">${t(q.subKey)}</div>`:''}
      <div class="q-opts">
        ${q.opts.map(o=>`<button class="q-opt" onclick="${o.finish?`qa(this,'${o.val}');qfinish()`:`qa(this,'${o.val}')`}">${t(o.key)}</button>`).join('')}
      </div>
      ${q.next!==null?`<button class="q-next" onclick="qnext(${q.next})">${t('quiz_proxima')}</button>`:''}
    </div>`).join('');
  html+=`<div class="qstep" id="qs-res"><div class="q-res" id="q-res-content"></div></div>`;
  wrap.innerHTML=html;
}

/* HOME */
function renderHome(){
  const g=document.getElementById('home-offers');if(!g)return;
  const h1=document.getElementById('hero-h1');if(h1)h1.innerHTML=t('hero_titulo');
  const shd=document.getElementById('home-sec-hd');if(shd)shd.innerHTML=t('home_melhores_ofertas');
  g.innerHTML=[...FIRMS].sort((a,b)=>b.discount-a.discount).map(f=>`
    <div class="oc">
      <div class="oc-top" onclick="openD('${f.id}')" style="cursor:pointer;">
        <div class="oc-left">${firmIco(f,'36px','13px')}<div><div class="oc-name">${f.name}</div><div class="oc-type">${f.type==='Futuros'?t('firm_type_futuros'):f.type==='Forex'?t('firm_type_forex'):f.type}</div></div></div>
        <div><div class="oc-disc" style="color:${f.color};filter:drop-shadow(0 4px 24px ${f.color}40)">${f.discount}%</div><div class="oc-off">off ${tf(f.dtype)}</div></div>
      </div>
      ${f.coupon?`<div class="oc-coupon"><div class="offer-coupon-left"><div class="offer-coupon-label">${t('offers_cupom_label')}</div><span class="oc-code">${shortCode(f.coupon)}</span></div><button class="oc-copy" onclick="cpCoupon('${f.coupon}','${f.id}','home')">${t('geral_copiar')}</button></div>
      <div class="oc-hint">${t('firms_hint_cupom')}</div>`:`<div class="oc-coupon" style="border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.05);"><div class="offer-coupon-label" style="color:var(--green);">Desconto exclusivo</div><span class="oc-code" style="color:var(--green);font-size:12px;letter-spacing:0;">✓ ${t('offers_desconto_link')}</span></div>
      <div class="oc-hint" style="visibility:hidden;">&nbsp;</div>`}
      <button class="offer-cta" onclick="openD('${f.id}');track('offer_card_click',{firm_id:'${f.id}',location:'home_card'})">${t('home_ver_planos')}</button>
    </div>`).join('');
}

/* FIRMS */
const BADGE_KEY_MAP = {
  'Maior Desconto':  'badge_maior_desconto',
  'Melhor Split 90%':'badge_melhor_split',
  'Líder Forex':     'badge_lider_forex',
  'Mais Avaliações': 'badge_mais_avaliacoes',
  'Scaling $400K':   'badge_scaling',
  'Desde 2016':      'badge_desde_2016',
  '$200M+ Pagos':    'badge_200m_pagos',
  'Payout 24h':      'badge_payout_24h',
};
function getBadgeLabel(label){ return t(BADGE_KEY_MAP[label]) || label; }

function renderFirms(list){
  const el=document.getElementById('firms-list');document.getElementById('cnt').textContent=list.length;
  if(!list.length){el.innerHTML=`<div style="padding:60px;text-align:center;color:var(--t2);">${t('firms_nenhuma_encontrada')}</div>`;return;}
  el.innerHTML=list.map(f=>{
    const tpStars=f.trustpilot?Math.round(f.trustpilot.score):0;
    const tpCount=f.trustpilot?(f.trustpilot.reviews>=1000?(f.trustpilot.reviews/1000).toFixed(1)+'K':f.trustpilot.reviews.toLocaleString()):'';
    return `
    <div class="fr" data-id="${f.id}" onclick="openD('${f.id}')">
      <!-- Col 1: Logo + Name + Tags -->
      <div class="fr-header">
        ${firmIco(f,'34px','13px')}
        <div class="fr-info">
          <div class="fr-name">${f.name}</div>
          <div class="fr-tags">
            <span class="fr-tag" style="background:${f.bg};color:${f.color};">${f.type==='Futuros'?t('firm_type_futuros'):f.type==='Forex'?t('firm_type_forex'):f.type}</span>
            ${f.badge?`<span class="fr-tag" style="background:${f.badge.bg};color:${f.badge.color};">${getBadgeLabel(f.badge.label)}</span>`:''}
          </div>
        </div>
      </div>
      <!-- Col 2: Discount -->
      <div class="fmet"><div class="mv" style="color:var(--green);">${f.discount}%</div><div class="ml">${t('met_desc')}</div></div>
      <!-- Col 3: Split -->
      <div class="fmet"><div class="mv" style="color:var(--green);">${f.split}</div><div class="ml">Split</div></div>
      <!-- Col 4: Rating -->
      <div class="fmet"><div class="mv">${f.rating}</div><div class="ml">Rating</div></div>
      <!-- Col 5: Reviews -->
      <div class="fmet"><div class="mv">${tpCount||f.reviews?.toLocaleString()||'—'}</div><div class="ml">Reviews</div></div>
      <!-- Col 6: Trustpilot -->
      <div class="fr-tp-col" onclick="event.stopPropagation()">${f.trustpilot?`<a class="fr-tp-mini" href="javascript:void(0)" onclick="openTpPopup('${f.trustpilot.url}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="#00b67a" style="flex-shrink:0"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><span class="fr-tp-score">${f.trustpilot.score}</span><span class="fr-tp-count">${tpCount}</span></a>`:''}</div>
      <!-- Col 7: Coupon -->
      <div class="fr-coupon-col" onclick="event.stopPropagation()">
        ${f.coupon?`<div class="fr-coupon-box"><div class="fr-coupon-box-row"><span class="fr-coupon-box-code">${shortCode(f.coupon)}</span><button class="fr-coupon-box-copy" onclick="cpCoupon('${f.coupon}','${f.id}','firms')">${t('firms_copiar')}</button></div></div>`:''}
      </div>
      <!-- Col 7: Actions -->
      <div class="fr-actions" onclick="event.stopPropagation()">
        <button class="fr-fav ${_favs.has(f.id)?'active':''}" id="fav-btn-${f.id}" onclick="toggleFav('${f.id}')" title="${_favs.has(f.id)?t('firms_fav_remove'):t('firms_fav_add')}">
          ${favHeart(_favs.has(f.id))}<span class="fr-fav-count" id="fav-cnt-${f.id}">${_favCounts[f.id]||0}</span>
        </button>
        <button class="det-btn primary" onclick="openD('${f.id}')">${t('firms_ver_planos')}</button>
      </div>
      <!-- Mobile: card layout (hidden on desktop, shown on <=960px) -->
      <div class="fr-left">
        ${f.trustpilot?`<a class="tp-badge" href="javascript:void(0)" onclick="event.stopPropagation();openTpPopup('${f.trustpilot.url}')"><span class="tp-label">${t('tp_excellent')}</span><span class="tp-stars">${'★'.repeat(tpStars)}</span><span class="tp-info">${f.trustpilot.reviews.toLocaleString()} ${t('tp_reviews_on')} <b>Trustpilot</b></span></a>`:''}
      </div>
      <div class="fr-mets">
        <div class="fr-mets-inner">
          <div class="fmet"><div class="mv" style="color:var(--green);">${f.split}</div><div class="ml">${t('met_split')}</div></div>
          <div class="fmet"><div class="mv">${f.drawdown||'—'}</div><div class="ml">DRAWDOWN</div></div>
          <div class="fmet"><div class="mv">${f.rating}</div><div class="ml">${t('met_rating')}</div></div>
        </div>
      </div>
      <div class="fr-right" onclick="event.stopPropagation()">
        ${f.coupon?`<div class="drw-coupon-bar">
          <div class="offer-coupon-left">
            <div class="drw-coupon-label">${t('firms_cupom_exclusivo')}</div>
            <span class="drw-coupon-code">${f.coupon}</span>
          </div>
          <button class="drw-coupon-copy" onclick="cpCoupon('${f.coupon}','${f.id}','firms')">${t('firms_copiar')}</button>
        </div>
        <div class="drw-coupon-hint">${t('firms_hint_cupom')}</div>`:''}
        <div class="fr-btns">
          <button class="fr-fav ${_favs.has(f.id)?'active':''}" id="fav-btn-m-${f.id}" onclick="toggleFav('${f.id}')" title="${_favs.has(f.id)?t('firms_fav_remove'):t('firms_fav_add')}">${favHeart(_favs.has(f.id))}<span class="fr-fav-count" id="fav-cnt-m-${f.id}">${_favCounts[f.id]||0}</span></button>
          <button class="det-btn primary" onclick="openD('${f.id}')">${t('firms_ver_planos')}</button>
        </div>
      </div>
    </div>`}).join('');
}
/* FAVORITES */
const _favs = new Set();
let _favCounts = {};

async function loadFavCounts() {
  try {
    const { data } = await db.from('firm_favorite_counts').select('firm_id,count');
    if (data) data.forEach(r => { _favCounts[r.firm_id] = r.count; });
  } catch(e) {}
}

async function loadUserFavs() {
  if (!currentUser) return;
  try {
    const { data } = await db.from('favorites').select('firm_id').eq('user_id', currentUser.id);
    if (data) data.forEach(r => _favs.add(r.firm_id));
  } catch(e) {}
}

async function toggleFav(firmId) {
  if (!currentUser) { openAuthModal('login'); return; }
  const isFav = _favs.has(firmId);
  const btn = document.getElementById('fav-btn-'+firmId);
  if (isFav) {
    _favs.delete(firmId);
    _favCounts[firmId] = Math.max(0, (_favCounts[firmId]||1) - 1);
    const {error} = await db.from('favorites').delete().eq('user_id', currentUser.id).eq('firm_id', firmId);
    if(error) console.warn('fav delete error:', error.message);
  } else {
    _favs.add(firmId);
    _favCounts[firmId] = (_favCounts[firmId]||0) + 1;
    const {error} = await db.from('favorites').insert({ user_id: currentUser.id, firm_id: firmId });
    if(error){ console.warn('fav insert error:', error.message); _favs.delete(firmId); _favCounts[firmId]=Math.max(0,(_favCounts[firmId]||1)-1); showToast('Erro ao favoritar. Tente novamente.'); }
    else track('firm_favorite', { firm_id: firmId });
  }
  if (btn) { btn.classList.toggle('active', _favs.has(firmId)); btn.innerHTML = favHeart(_favs.has(firmId))+`<span class="fr-fav-count" id="fav-cnt-${firmId}">${_favCounts[firmId]||0}</span>`; }
  // Sync mobile fav button
  const mBtn = document.getElementById('fav-btn-m-'+firmId);
  if (mBtn) { mBtn.classList.toggle('active', _favs.has(firmId)); mBtn.innerHTML = favHeart(_favs.has(firmId))+`<span class="fr-fav-count" id="fav-cnt-m-${firmId}">${_favCounts[firmId]||0}</span>`; }
}

async function initFavs() {
  await loadFavCounts();
  await loadUserFavs();
  applyF();
}

function renderAwards(){
  const el=document.getElementById('awards-grid');
  if(!el)return;
  const _asvg=(d,c='var(--gold)')=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const categories=[
    {trophy:_asvg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),catKey:'aw_cat_melhor_forex',firmId:'ftmo',reasonKey:'aw_reason_ftmo_forex',value:'4.8',ribbonKey:'aw_ribbon_forex'},
    {trophy:_asvg('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>','#22c55e'),catKey:'aw_cat_maior_desconto',firmId:'apex',reasonKey:'aw_reason_apex_desconto',value:'90% OFF',ribbonKey:'aw_ribbon_desconto'},
    {trophy:_asvg('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),catKey:'aw_cat_melhor_split',firmId:'fn',reasonKey:'aw_reason_fn_split',value:'95% Split',ribbonKey:'aw_ribbon_split'},
    {trophy:_asvg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>','#60a5fa'),catKey:'aw_cat_aprovacao_rapida',firmId:'bulenox',reasonKey:'aw_reason_bulenox_rapido',value:'1 dia',ribbonKey:'aw_ribbon_rapido'},
    {trophy:_asvg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>','#22c55e'),catKey:'aw_cat_maior_confianca',firmId:'fn',reasonKey:'aw_reason_fn_confianca',value:'60K+',ribbonKey:'aw_ribbon_confiavel'},
    {trophy:_asvg('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>','#a78bfa'),catKey:'aw_cat_melhor_iniciante',firmId:'ftmo',reasonKey:'aw_reason_ftmo_iniciante',value:'Free Trial',ribbonKey:'aw_ribbon_iniciante'},
    {trophy:_asvg('<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>','#F97316'),catKey:'aw_cat_melhor_custo',firmId:'e2t',reasonKey:'aw_reason_e2t_custo',value:'$400K',ribbonKey:'aw_ribbon_custo'},
    {trophy:_asvg('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>'),catKey:'aw_cat_melhor_rating',firmId:'bulenox',reasonKey:'aw_reason_bulenox_rating',value:'4.8',ribbonKey:'aw_ribbon_rating'},
  ];
  el.innerHTML=categories.map(c=>{
    const f=FIRMS.find(x=>x.id===c.firmId);
    if(!f)return'';
    return`<div class="award-card" onclick="go('firms');setTimeout(()=>openD('${f.id}'),150)" style="cursor:pointer;">
      <span class="award-ribbon">${t(c.ribbonKey)}</span>
      <div class="award-card-top">
        <div class="award-trophy">${c.trophy}</div>
        <div class="award-cat">
          <div class="award-cat-label">${t('aw_categoria')}</div>
          <div class="award-cat-name">${t(c.catKey)}</div>
        </div>
      </div>
      <div class="award-winner">
        ${firmIco(f,'40px','14px')}
        <div class="award-winner-info">
          <div class="award-winner-name">${f.name}</div>
          <div class="award-winner-reason">${t(c.reasonKey)}</div>
        </div>
        <div class="award-winner-value">${c.value}</div>
      </div>
    </div>`;
  }).join('');
}
function renderOffers(){
  const el=document.getElementById('offers-grid');
  if(!el)return;
  el.innerHTML=FIRMS.map(f=>`
    <div class="offer-card">
      <div class="offer-card-top">
        ${firmIco(f,'44px','16px')}
        <div class="offer-card-info">
          ${f.badge?`<div class="offer-badge" style="color:${f.badge.color};background:${f.badge.bg};border:1px solid ${f.badge.color}30;">${getBadgeLabel(f.badge.label)}</div>`:''}
          <div class="offer-card-name">${f.name}</div>
          <div class="offer-card-type">${f.type==='Futuros'?t('firm_type_futuros'):f.type==='Forex'?t('firm_type_forex'):f.type} · ${f.platforms.slice(0,2).join(', ')}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div class="offer-disc-big">${f.discount}%</div>
          <div class="offer-disc-label">OFF ${tf(f.dtype)}</div>
        </div>
      </div>
      <div class="offer-card-body">
        <p class="offer-desc">${tf(f.desc)||''}</p>
        ${f.coupon?`
        <div class="offer-coupon-box">
          <div class="offer-coupon-left">
            <div class="offer-coupon-label">${t('offers_cupom_label')}</div>
            <span class="offer-coupon-code">${shortCode(f.coupon)}</span>
          </div>
          <button class="offer-copy-btn" onclick="cpCoupon('${f.coupon}','${f.id}','offers')">${t('geral_copiar')}</button>
        </div>
        <div class="drw-coupon-hint">${t('firms_hint_cupom')}</div>`:`<div class="offer-coupon-box" style="border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.05);">
          <div class="offer-coupon-row"><span class="offer-no-coupon">✓ ${t('offers_desconto_link')}</span></div>
        </div>`}
        <button class="offer-cta" onclick="go('firms');setTimeout(()=>openD('${f.id}'),150)">${t('firms_comecar')}</button>
      </div>
    </div>`).join('');
}
function applyF(){
  const q=document.getElementById('search').value.toLowerCase();
  const sort=document.querySelector('.sort-sel').value;
  const favOnly=document.getElementById('fFavOnly')?.checked;
  const fFut=document.getElementById('fFut')?.checked;
  const fFx=document.getElementById('fFx')?.checked;
  const dH=document.getElementById('dH')?.checked;
  const dM=document.getElementById('dM')?.checked;
  const dL=document.getElementById('dL')?.checked;
  const fLT=document.getElementById('fLT')?.checked;
  const fNews=document.getElementById('fNews')?.checked;
  const fD1=document.getElementById('fD1')?.checked;
  let list=FIRMS.filter(f=>{
    if(favOnly && !_favs.has(f.id)) return false;
    if(q && !f.name.toLowerCase().includes(q) && !f.type.toLowerCase().includes(q)) return false;
    // Mercado — só filtrar se pelo menos um está marcado
    const anyMkt=fFut||fFx;
    if(anyMkt){
      if(f.type==='Futuros' && !fFut) return false;
      if(f.type==='Forex' && !fFx) return false;
    }
    // Desconto — só filtrar se pelo menos um está marcado
    const d=f.discount;
    const anyDisc=dH||dM||dL;
    if(anyDisc){
      if(d>=80 && !dH) return false;
      if(d>=50 && d<80 && !dM) return false;
      if(d<50 && !dL) return false;
    }
    // Características
    if(fLT && f.dtype!=='lifetime') return false;
    if(fNews && !f.newsTrading) return false;
    if(fD1 && !f.day1Payout) return false;
    return true;
  });
  if(sort==='discount')list.sort((a,b)=>b.discount-a.discount);
  else if(sort==='reviews')list.sort((a,b)=>b.reviews-a.reviews);
  else if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
  else list.sort((a,b)=>b.rating-a.rating);
  renderFirms(list);
}
function clearF(){
  document.getElementById('search').value='';
  ['fFut','fFx','dH','dM','dL'].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=true;});
  ['fLT','fNews','fD1','fFavOnly'].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=false;});
  applyF();
}
function toggleFirmsSb(){
  const sb=document.querySelector('.firms-sb');
  const ov=document.getElementById('firms-sb-overlay');
  if(!sb||!ov)return;
  sb.classList.toggle('open');
  ov.classList.toggle('open');
}

/* DRAWER */
/* Drawer state for inline checkout */
const _drwState = {};

function openD(id){
  const f=FIRMS.find(x=>x.id===id);if(!f)return;
  document.querySelectorAll('.fr').forEach(r=>r.classList.toggle('active',r.dataset.id===id));
  const cf = CHECKOUT_FIRMS.find(x=>x.id===id);
  if (!_drwState[id]) _drwState[id] = {
    type: cf?.types?.[0] || '',
    plat: cf?.platforms?.[0] || (f.platforms?.[0] || ''),
    size: cf?.plans?.[0]?.size || '',
  };

  // Desktop: fullscreen overlay premium | Mobile: drawer lateral
  if (window.innerWidth >= 769 && FIRM_ABOUT[id]) {
    openFD(id, f);
  } else {
    openDrw(id, f, cf);
  }
  history.replaceState(null,'','#firm/'+id);
  track('firm_detail_open',{firm_id:id,firm_name:f.name});
}

// ── DESKTOP: Fullscreen overlay (v2 premium) ──
let _fdCurrent = null;
const _fdState = {};

function openFD(id, f) {
  _fdCurrent = id;
  const fa = FIRM_ABOUT[id];
  if (!fa) { openDrw(id, f, CHECKOUT_FIRMS.find(x=>x.id===id)); return; }

  const firstType = fa.types[0];
  const firstPlans = fa.plans[firstType];
  const popPlan = firstPlans.find(p=>p.pop) || firstPlans[0];
  if (!_fdState[id]) _fdState[id] = { type: firstType, plat: f.platforms?.[0]||'', size: popPlan.s };
  const st = _fdState[id];

  // Ensure size is valid for current type
  const curPlans = fa.plans[st.type];
  if (curPlans && !curPlans.find(p=>p.s===st.size)) st.size = (curPlans.find(p=>p.pop)||curPlans[0]).s;

  // Set accent color
  document.documentElement.style.setProperty('--accent', f.color);

  // Background image
  const bgUrl = FIRM_BG[id];
  document.getElementById('fd-bg').style.backgroundImage = bgUrl ? `url('${bgUrl}')` : 'none';

  // ── LEFT: Branding ──
  const s = strs(f.rating);
  const tpS = Math.round(f.trustpilot?.score||f.rating);
  const tpUrl = f.trustpilot?.url||'';
  const tpReviews = f.trustpilot?.reviews||f.reviews||0;

  let L = `<div class="fd-brand-top">
    <div class="fd-logo-row">
      <div class="fd-logo"><img src="${f.icon_url}" alt="${f.name}" onerror="this.parentElement.innerHTML='<span style=\\'color:${f.color};font-size:22px;font-weight:800\\'>${f.icon}</span>'"></div>
      <div><div class="fd-name">${f.name}</div><div class="fd-type">${f.type==='Futuros'?t('firm_type_futuros'):f.type==='Forex'?t('firm_type_forex'):f.type}</div></div>
    </div>
    <div class="fd-discount">
      <div class="fd-discount-pct" style="background:linear-gradient(135deg,${f.color},#FFD97D,${f.color});-webkit-background-clip:text;filter:drop-shadow(0 4px 24px ${f.color}40)">${f.discount}% OFF</div>
      <div class="fd-discount-label">${t('fd_desconto')} ${(tf(f.dtype)||'').toUpperCase()}</div>
    </div>
    <div class="fd-rating-block"${tpUrl?` onclick="openTpPopup('${tpUrl}')" style="cursor:pointer"`:''}>
      <div class="fd-rating-num">${f.rating}</div>
      <div class="fd-rating-detail">
        <span class="fd-tp-excellent">${t('tp_excellent')}</span>
        <div class="fd-stars">${Array(5).fill(0).map((_,i)=>`<span class="fd-tp-star">${i<tpS?'★':'☆'}</span>`).join('')}</div>
        <div class="fd-reviews">${tpReviews.toLocaleString()} ${t('tp_reviews_on')} <b style="color:var(--tp-green)">Trustpilot</b></div>
      </div>
    </div>`;
  L += `<div class="fd-about">
      <div class="fd-about-title">${t('fd_sobre_firma')}</div>
      <div class="fd-about-text">${tf(fa.about)}</div>
      <div class="fd-about-highlights">${fa.highlights.map(h=>`<div class="fd-about-hl"><div class="fd-about-hl-val" style="color:${f.color}">${h.val}</div><div class="fd-about-hl-label">${tf(h.label)}</div></div>`).join('')}</div>
    </div>
  </div>
  <div class="fd-stats">
    <div class="fd-stat"><div class="fd-stat-label">Profit Split</div><div class="fd-stat-val g">${f.split}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">${t('drw_meta')}</div><div class="fd-stat-val y">${tf(f.target)||'—'}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">Drawdown</div><div class="fd-stat-val r">${tf(f.ddPct)||'—'}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">${t('drw_dias_min')}</div><div class="fd-stat-val">${f.minDays||'—'}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">${t('drw_scaling')}</div><div class="fd-stat-val">${tf(f.scaling)||'—'}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">${t('drw_prazo')}</div><div class="fd-stat-val">${f.evalDays?f.evalDays+'d':t('drw_sem_limite')}</div></div>
  </div>`;
  document.getElementById('fd-left').innerHTML = L;

  // ── RIGHT: Checkout ──
  fdRenderRight(id, f);

  document.getElementById('fd-overlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function fdRenderRight(id, f) {
  if (!f) f = FIRMS.find(x=>x.id===id);
  const fa = FIRM_ABOUT[id];
  if (!fa||!f) return;
  const st = _fdState[id];
  const plans = fa.plans[st.type];

  let h = `<div class="fd-ck-header">
    <div class="fd-ck-title">${t('fd_configure_conta')}</div>
    <div class="fd-ck-sub">${f.coupon?t('fd_aplique_cupom'):''}</div>
  </div>`;

  // Type pills
  if (fa.types.length > 1) {
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_tipo_conta')}</div>
      <div class="fd-pills">${fa.types.map(tp=>`<button class="fd-pill${tp===st.type?' sel':''}" style="${tp===st.type?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="fdSel('${id}','type','${tp}')">${tp}</button>`).join('')}</div></div>`;
  }

  // Platform pills
  if (f.platforms?.length) {
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_plataforma')}</div>
      <div class="fd-pills">${f.platforms.map(p=>`<button class="fd-pill${p===st.plat?' sel':''}" style="${p===st.plat?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="fdSel('${id}','plat','${p}')">${p}</button>`).join('')}</div></div>`;
  }

  // Size pills
  if (plans?.length) {
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_tamanho_conta')}</div>
      <div class="fd-sizes">${plans.map(p=>`<button class="fd-sz${p.s===st.size?' sel':''}${p.pop?' pop':''}" style="${p.s===st.size?`background:${f.color}12;border-color:${f.color}59;color:${f.color}`:''}" onclick="fdSel('${id}','size','${p.s}')">${p.s}</button>`).join('')}</div></div>`;
  }

  // Price card
  const plan = plans?.find(p=>p.s===st.size)||plans?.[0];
  if (plan) {
    const oNum = parseFloat((plan.o||'').replace(/[^0-9.]/g,''));
    const dNum = parseFloat((plan.d||'').replace(/[^0-9.]/g,''));
    const cur = (plan.d||'').match(/[€$]/)?.[0]||'$';
    const save = oNum&&dNum&&plan.o!=='—' ? (oNum-dNum).toFixed(2) : null;
    h += `<div class="fd-price" style="border-color:${f.color}1F"><div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${f.color}40,transparent)"></div>
      <div><div class="fd-price-size">${plan.s}</div><div class="fd-price-type">${st.type}</div></div>
      <div class="fd-price-right"><div class="fd-price-new" style="color:${f.color}">${plan.d}</div>${plan.o&&plan.o!=='—'?`<div class="fd-price-old">${plan.o}</div>`:''} ${save?`<div class="fd-price-save">${t('fd_economia')} ${cur}${save}</div>`:''}</div>
    </div>`;
  }

  // Coupon
  if (f.coupon) {
    const isLong = f.coupon.length > 12;
    h += `<div class="fd-cpn"><div><div class="fd-cpn-tag">${t('fd_cupom_exclusivo')}</div><div class="fd-cpn-code${isLong?' long':''}">${f.coupon}</div></div>
      <button class="fd-cpn-copy" onclick="cpCoupon('${f.coupon}','${f.id||id}','fd_coupon')">${t('firms_copiar')}</button></div>
      <div class="fd-cpn-hint">${t('fd_cupom_hint')}</div>`;
  }

  // CTA
  h += `<button class="fd-cta" onclick="fdGo('${id}')">${t('fd_comecar')} &#8594;</button>`;

  // Includes
  if (fa.includes?.length) {
    h += `<div class="fd-includes"><div class="fd-inc-title">${t('fd_incluso_plano')}</div>
      <div class="fd-inc-grid">${fa.includes.map(i=>`<div class="fd-inc">${tf(i)}</div>`).join('')}</div></div>`;
  }

  document.getElementById('fd-right').innerHTML = h;
}

function fdSel(id, key, val) {
  const st = _fdState[id];
  st[key] = val;
  // If type changed, reset size to popular
  if (key==='type') {
    const fa = FIRM_ABOUT[id];
    const plans = fa?.plans[val];
    if (plans) st.size = (plans.find(p=>p.pop)||plans[0]).s;
  }
  fdRenderRight(id);
}

function fdGo(id) {
  const f = FIRMS.find(x=>x.id===id);
  const cf = CHECKOUT_FIRMS.find(x=>x.id===id);
  const st = _fdState[id]||{};
  if (cf) {
    let url = cf.buildUrl(st.size||'',st.type||'',st.plat||'');
    url += (url.includes('?')?'&':'?')+'utm_source=marketscoupons&utm_medium=detail&utm_campaign='+id+'_'+(st.size||'').replace(/[^a-z0-9]/gi,'_').toLowerCase();
    if (f?.coupon) navigator.clipboard.writeText(f.coupon).catch(()=>{});
    track('checkout_click',{firm_id:id,firm_name:f?.name,platform:st.plat,type:st.type,account_size:st.size,coupon:f?.coupon||'parceiro'});
    registerLoyaltyClick(st.size||'',st.plat||'',st.type||'',f?.name||'');
    window.open(url,'_blank');
  } else {
    if (f?.coupon) navigator.clipboard.writeText(f.coupon).catch(()=>{});
    track('checkout_click',{firm_id:id,firm_name:f?.name||'',coupon:f?.coupon||'parceiro'});
    registerLoyaltyClick('','','',f?.name||'');
    window.open(f?.link||'#','_blank');
  }
}

function closeFD(){
  document.getElementById('fd-overlay').classList.remove('show');
  document.querySelectorAll('.fr').forEach(r=>r.classList.remove('active'));
  document.body.style.overflow='';
  if(location.hash.startsWith('#firm/')) history.replaceState(null,'',location.pathname+location.search);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('fd-overlay')?.classList.contains('show'))closeFD();});

function fdGoCheckout(fId){
  const cf=CHECKOUT_FIRMS.find(x=>x.id===fId);const f=FIRMS.find(x=>x.id===fId);
  if(!cf||!f){window.open(f?.link||'#','_blank');return;}
  const st=_drwState[fId]||{};
  let url=cf.buildUrl(st.size||'',st.type||'',st.plat||'');
  url+=(url.includes('?')?'&':'?')+'utm_source=marketscoupons&utm_medium=detail&utm_campaign='+fId+'_'+(st.size||'').replace(/[^a-z0-9]/gi,'_').toLowerCase();
  if(f.coupon)navigator.clipboard.writeText(f.coupon).catch(()=>{});
  track('checkout_click',{firm_id:fId,firm_name:f.name,platform:st.plat,type:st.type,account_size:st.size,coupon:f.coupon||'parceiro'});
  registerLoyaltyClick(st.size||'',st.plat||'',st.type||'',f.name);
  window.open(url,'_blank');
}

// ── PLATFORM DETAIL OVERLAY (Desktop) ──
let _pdCurrent = null;
const _pdState = {};

function openPD(id) {
  _pdCurrent = id;
  const p = getPlatforms().find(x=>x.id===id);
  const pd = PLAT_DETAIL[id];
  if (!p || !pd) { window.open(p?.link||'#','_blank'); return; }

  const firstType = pd.types[0];
  const firstPlans = pd.plans[firstType];
  const popPlan = firstPlans.find(pl=>pl.pop) || firstPlans[0];
  if (!_pdState[id]) _pdState[id] = { type: firstType, size: popPlan.s };
  const st = _pdState[id];
  const curPlans = pd.plans[st.type];
  if (curPlans && !curPlans.find(pl=>pl.s===st.size)) st.size = (curPlans.find(pl=>pl.pop)||curPlans[0]).s;

  document.documentElement.style.setProperty('--accent', p.color);

  // Background image (same pattern as fd-overlay)
  const bgEl = document.getElementById('pd-bg');
  const bgUrl = PLAT_BG[id];
  bgEl.style.background = `linear-gradient(135deg, ${p.bg} 0%, #060810 50%, ${p.color}08 100%)`;
  bgEl.style.backgroundSize = 'cover';
  bgEl.style.backgroundPosition = 'center';
  if (bgUrl) bgEl.style.backgroundImage = `url('${bgUrl}')`;

  // ── LEFT: Branding (follows fd-overlay pattern exactly) ──
  let L = `<div class="fd-brand-top">
    <div class="fd-logo-row">
      <div class="fd-logo"><img src="${p.icon_url}" alt="${p.name}" onerror="this.parentElement.innerHTML='<span style=\\'color:${p.color};font-size:22px;font-weight:800\\'>${p.icon}</span>'"></div>
      <div><div class="fd-name">${p.name}</div><div class="fd-type">${tf(p.type)}</div></div>
    </div>`;

  // Discount block (same as fd-overlay)
  if (p.discount > 0) {
    L += `<div class="fd-discount">
      <div class="fd-discount-pct" style="background:linear-gradient(135deg,${p.color},#FFD97D,${p.color});-webkit-background-clip:text;filter:drop-shadow(0 4px 24px ${p.color}40)">${p.discount}% OFF</div>
      <div class="fd-discount-label">${t('fd_desconto')} ${(tf(p.dtype)||'').toUpperCase()}</div>
    </div>`;
  }

  // $15 credit badge (TradingView exclusive — inline with discount)
  if (pd.credit) {
    L += `<div style="display:inline-flex;align-items:center;gap:10px;margin-top:12px;padding:10px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;backdrop-filter:blur(8px);">
      <div style="font-size:20px;font-weight:800;color:var(--gold);white-space:nowrap;">+$15</div>
      <div style="font-size:11px;color:rgba(255,255,255,.7);line-height:1.4;">${tf(pd.credit)}</div>
    </div>`;
  }

  // About section
  L += `<div class="fd-about">
      <div class="fd-about-title">${t('pd_sobre')}</div>
      <div class="fd-about-text">${tf(pd.about)}</div>
      <div class="fd-about-highlights">${pd.highlights.map(h=>`<div class="fd-about-hl"><div class="fd-about-hl-val" style="color:${p.color}">${h.val}</div><div class="fd-about-hl-label">${tf(h.label)}</div></div>`).join('')}</div>
    </div>
  </div>
  <div class="fd-stats">
    ${(pd.stats||[]).map(s=>`<div class="fd-stat"><div class="fd-stat-label">${tf(s.label)}</div><div class="fd-stat-val" style="color:${s.color||p.color}">${s.val}</div></div>`).join('')}
  </div>`;

  document.getElementById('pd-left').innerHTML = L;
  pdRenderRight(id, p);
  document.getElementById('pd-overlay').classList.add('show');
  document.body.style.overflow = 'hidden';
  track('platform_detail_open',{platform_id:id,platform_name:p.name});
}

function pdRenderRight(id, p) {
  if (!p) p = getPlatforms().find(x=>x.id===id);
  const pd = PLAT_DETAIL[id];
  if (!pd||!p) return;
  const st = _pdState[id];
  const plans = pd.plans[st.type];

  let h = `<div class="fd-ck-header">
    <div class="fd-ck-title">${t('pd_escolha_plano')}</div>
    <div class="fd-ck-sub">${p.discount>0?t('pd_desconto_anual'):t('pd_planos_disponiveis')}</div>
  </div>`;

  // Type pills (same pattern as fd-overlay)
  if (pd.types.length > 1) {
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${p.color};box-shadow:0 0 8px ${p.color}40"></span>${t('pd_periodo')}</div>
      <div class="fd-pills">${pd.types.map(tp=>`<button class="fd-pill${tp===st.type?' sel':''}" style="${tp===st.type?`background:${p.color}12;border-color:${p.color}4D;color:${p.color}`:''}" onclick="pdSel('${id}','type','${tp}')">${tf(tp)}</button>`).join('')}</div></div>`;
  }

  // Plan pills (same pattern as fd-overlay size pills)
  if (plans?.length) {
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${p.color};box-shadow:0 0 8px ${p.color}40"></span>${t('pd_plano')}</div>
      <div class="fd-sizes">${plans.map(pl=>`<button class="fd-sz${pl.s===st.size?' sel':''}${pl.pop?' pop':''}" style="${pl.s===st.size?`background:${p.color}12;border-color:${p.color}59;color:${p.color}`:''}" onclick="pdSel('${id}','size','${pl.s}')">${pl.s}</button>`).join('')}</div></div>`;
  }

  // Price card (same pattern as fd-overlay with savings)
  const plan = plans?.find(pl=>pl.s===st.size)||plans?.[0];
  if (plan) {
    const oNum = parseFloat((plan.o||'').replace(/[^0-9.]/g,''));
    const dNum = parseFloat((plan.d||'').replace(/[^0-9.]/g,''));
    const cur = (plan.d||'').match(/[$€]/)?.[0]||'$';
    const save = oNum&&dNum&&plan.o!=='—' ? (oNum-dNum).toFixed(2) : null;
    h += `<div class="fd-price" style="border-color:${p.color}1F"><div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${p.color}40,transparent)"></div>
      <div><div class="fd-price-size">${plan.s}</div><div class="fd-price-type">${tf(st.type)}</div></div>
      <div class="fd-price-right"><div class="fd-price-new" style="color:${p.color}">${plan.d}</div>${plan.o&&plan.o!=='—'?`<div class="fd-price-old">${plan.o}</div>`:''} ${save?`<div class="fd-price-save">${t('fd_economia')} ${cur}${save}</div>`:''}</div>
    </div>`;

    // Plan features detail line
    if (plan.feat) {
      h += `<div style="padding:8px 16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:8px;margin-top:-4px;">
        <div style="font-size:11px;color:rgba(255,255,255,.5);margin-bottom:2px;">${t('pd_detalhes_plano')}</div>
        <div style="font-size:12px;color:rgba(255,255,255,.8);font-weight:500;">${tf(plan.feat)}</div>
      </div>`;
    }
  }

  // CTA
  h += `<button class="fd-cta" onclick="pdGo('${id}')">${t('pd_assinar')} ${p.name} &#8594;</button>`;

  // $15 credit reminder for TradingView (right side)
  if (pd.credit) {
    h += `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:10px;">
      <div style="font-size:22px;font-weight:800;color:#22C55E;white-space:nowrap;">+$15</div>
      <div style="font-size:11px;color:rgba(255,255,255,.6);line-height:1.4;">${t('pd_credit_hint')}</div>
    </div>`;
  }

  // Includes
  if (pd.includes?.length) {
    h += `<div class="fd-includes"><div class="fd-inc-title">${t('pd_incluso')}</div>
      <div class="fd-inc-grid">${pd.includes.map(i=>`<div class="fd-inc">${tf(i)}</div>`).join('')}</div></div>`;
  }

  document.getElementById('pd-right').innerHTML = h;
}

function pdSel(id, key, val) {
  const st = _pdState[id];
  st[key] = val;
  if (key==='type') {
    const pd = PLAT_DETAIL[id];
    const plans = pd?.plans[val];
    if (plans) st.size = (plans.find(pl=>pl.pop)||plans[0]).s;
  }
  pdRenderRight(id);
}

function pdGo(id) {
  const p = getPlatforms().find(x=>x.id===id);
  if (!p) return;
  const st = _pdState[id]||{};
  const url = p.link + (p.link.includes('?')?'&':'?') + 'utm_source=marketscoupons&utm_medium=platform_detail&utm_campaign='+id+'_'+(st.size||'').replace(/[^a-z0-9]/gi,'_').toLowerCase();
  track('platform_checkout_click',{platform_id:id,platform_name:p.name,plan:st.size,type:st.type});
  window.open(url,'_blank');
}

function closePD(){
  document.getElementById('pd-overlay').classList.remove('show');
  document.body.style.overflow='';
}

function openPDMobile(id){
  _pdCurrent=id;
  const p=getPlatforms().find(x=>x.id===id);
  const pd=PLAT_DETAIL[id];
  if(!p||!pd){window.open(p?.link||'#','_blank');return;}
  const firstType=pd.types[0];
  const firstPlans=pd.plans[firstType];
  const popPlan=firstPlans.find(pl=>pl.pop)||firstPlans[0];
  if(!_pdState[id])_pdState[id]={type:firstType,size:popPlan.s};

  const icoEl=document.getElementById('d-ico');
  if(p.icon_url){icoEl.style.cssText=`background:${p.bg};`;icoEl.innerHTML=`<img src="${p.icon_url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`;}
  else{icoEl.style.cssText=`background:${p.bg};color:${p.color};`;icoEl.textContent=p.icon;}
  document.getElementById('d-name').textContent=p.name;
  document.getElementById('d-sub').textContent=`${tf(p.type)} · ${p.discount>0?p.discount+'% OFF':''}`;

  const bgUrl=PLAT_BG[id];
  let html='';

  // Hero image (only if has discount or bg)
  if(bgUrl){
    html+=`<div class="drw-hero" style="background-image:url('${bgUrl}');">
      <div class="drw-hero-overlay"></div>
      <div class="drw-hero-content">
        ${p.discount>0?`<div class="drw-hero-discount" style="background:linear-gradient(135deg,${p.color},#FFD97D,${p.color});-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 4px 24px ${p.color}40)">${p.discount}% OFF</div>
        <div class="drw-hero-dtype">${t('pd_desconto_anual')}</div>`:`<div class="drw-hero-discount" style="background:linear-gradient(135deg,${p.color},#FFD97D,${p.color});-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 4px 24px ${p.color}40)">PLANO FREE</div>
        <div class="drw-hero-dtype">${t('pd_planos_disponiveis')}</div>`}
      </div>
    </div>`;
  }

  // About (exposed)
  html+=`<div class="fd-about" style="margin-top:0;margin-bottom:14px;">
    <div class="fd-about-title">${t('pd_sobre')}</div>
    <div class="fd-about-text">${tf(pd.about)}</div>
    <div class="fd-about-highlights">${pd.highlights.map(h=>`<div class="fd-about-hl"><div class="fd-about-hl-val" style="color:${p.color}">${h.val}</div><div class="fd-about-hl-label">${tf(h.label)}</div></div>`).join('')}</div>
  </div>`;

  // Stats grid
  if(pd.stats?.length){
    html+=`<div class="fd-stats" style="margin-top:0;padding-top:0;border-top:none;margin-bottom:14px;">
      ${pd.stats.map(s=>`<div class="fd-stat"><div class="fd-stat-label">${tf(s.label)}</div><div class="fd-stat-val" ${s.color?`style="color:${s.color}"`:''}>${tf(s.val)}</div></div>`).join('')}
    </div>`;
  }

  // Checkout
  html+=`<div class="drw-checkout" id="pd-mob-checkout"></div>`;

  document.getElementById('d-body').innerHTML=html;
  pdRenderMobile(id,p);

  document.getElementById('ov').classList.add('open');
  document.getElementById('drw').classList.add('open');
  document.body.style.overflow='hidden';
  track('platform_detail_open',{platform_id:id,platform_name:p.name});
}

function pdRenderMobile(id,p){
  if(!p)p=getPlatforms().find(x=>x.id===id);
  const pd=PLAT_DETAIL[id];if(!pd||!p)return;
  const st=_pdState[id];
  const plans=pd.plans[st.type];

  let h=`<div class="fd-ck-header" style="padding:0;"><div class="fd-ck-title" style="font-size:18px;">${t('pd_escolha_plano')}</div>
    <div class="fd-ck-sub">${p.discount>0?t('pd_desconto_anual'):t('pd_planos_disponiveis')}</div></div>`;

  // Type pills
  if(pd.types.length>1){
    h+=`<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${p.color};box-shadow:0 0 8px ${p.color}40"></span>${t('pd_periodo')}</div>
      <div class="fd-pills">${pd.types.map(tp=>`<button class="fd-pill${tp===st.type?' sel':''}" style="${tp===st.type?`background:${p.color}12;border-color:${p.color}4D;color:${p.color}`:''}" onclick="_pdState['${id}'].type='${tp}';var pl=PLAT_DETAIL['${id}'].plans['${tp}'];_pdState['${id}'].size=(pl.find(x=>x.pop)||pl[0]).s;pdRenderMobile('${id}')">${tf(tp)}</button>`).join('')}</div></div>`;
  }

  // Plan pills
  if(plans?.length){
    h+=`<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${p.color};box-shadow:0 0 8px ${p.color}40"></span>${t('pd_plano')}</div>
      <div class="fd-sizes">${plans.map(pl=>`<button class="fd-sz${pl.s===st.size?' sel':''}${pl.pop?' pop':''}" style="${pl.s===st.size?`background:${p.color}12;border-color:${p.color}59;color:${p.color}`:''}" onclick="_pdState['${id}'].size='${pl.s}';pdRenderMobile('${id}')">${pl.s}</button>`).join('')}</div></div>`;
  }

  // Price card
  const plan=plans?.find(pl=>pl.s===st.size)||plans?.[0];
  if(plan){
    const oNum=parseFloat((plan.o||'').replace(/[^0-9.]/g,''));
    const dNum=parseFloat((plan.d||'').replace(/[^0-9.]/g,''));
    const cur=(plan.d||'').match(/[$€]/)?.[0]||'$';
    const save=oNum&&dNum&&plan.o!=='—'?(oNum-dNum).toFixed(2):null;
    h+=`<div class="fd-price" style="border-color:${p.color}1F"><div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${p.color}40,transparent)"></div>
      <div><div class="fd-price-size" style="font-size:20px;">${plan.s}</div><div class="fd-price-type">${tf(st.type)}</div></div>
      <div class="fd-price-right"><div class="fd-price-new" style="color:${p.color};font-size:24px;">${plan.d}</div>${plan.o&&plan.o!=='—'?`<div class="fd-price-old">${plan.o}</div>`:''} ${save?`<div class="fd-price-save">${t('fd_economia')} ${cur}${save}</div>`:''}</div>
    </div>`;
  }

  // Credit badge
  if(pd.credit){
    h+=`<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:12px;margin-bottom:14px;">
      <div style="font-size:22px;font-weight:800;color:#22C55E;">+$15</div>
      <div style="font-size:11px;color:rgba(255,255,255,.6);line-height:1.4;">${t('pd_credit_hint')}</div>
    </div>`;
  }

  // CTA
  h+=`<button class="fd-cta" onclick="pdGo('${id}')">${t('pd_assinar')} ${p.name} &#8594;</button>`;

  // Includes
  if(pd.includes?.length){
    h+=`<div class="fd-includes"><div class="fd-inc-title">${t('pd_incluso')}</div>
      <div class="fd-inc-grid">${pd.includes.map(i=>`<div class="fd-inc">${tf(i)}</div>`).join('')}</div></div>`;
  }

  document.getElementById('pd-mob-checkout').innerHTML=h;
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('pd-overlay')?.classList.contains('show'))closePD();});

// ── MOBILE: Drawer sidebar ──
function openDrw(id, f, cf) {
  const icoEl = document.getElementById('d-ico');
  if(f.icon_url) {
    icoEl.style.cssText=`background:${f.bg};`;
    icoEl.innerHTML=`<img src="${f.icon_url}" alt="${f.name}" style="width:100%;height:100%;object-fit:cover;">`;
  } else {
    icoEl.style.cssText=`background:${f.bg};color:${f.color};`;
    icoEl.textContent=f.icon;
  }
  document.getElementById('d-name').textContent=f.name;
  document.getElementById('d-sub').textContent=`${f.type==='Futuros'?t('firm_type_futuros'):f.type==='Forex'?t('firm_type_forex'):f.type} · ${f.discount}% OFF · ${t('drw_split')} ${f.split}`;

  const fa = FIRM_ABOUT[id];
  const bgUrl = FIRM_BG[id];
  const s = strs(f.rating);
  const tpS = Math.round(f.trustpilot?.score||f.rating);
  const tpUrl = f.trustpilot?.url||'';
  const tpReviews = f.trustpilot?.reviews||f.reviews||0;

  // ── Premium layout (same pattern as desktop fd-overlay) ──
  if (fa) {
    if(!_fdState[id]){
      const firstType=fa.types[0]; const firstPlans=fa.plans[firstType];
      const popPlan=firstPlans.find(p=>p.pop)||firstPlans[0];
      _fdState[id]={type:firstType,plat:f.platforms?.[0]||'',size:popPlan.s};
    }

    let html = '';
    // Hero image
    if(bgUrl){
      html+=`<div class="drw-hero" style="background-image:url('${bgUrl}');">
        <div class="drw-hero-overlay"></div>
        <div class="drw-hero-content">
          <div class="drw-hero-discount" style="background:linear-gradient(135deg,${f.color},#FFD97D,${f.color});-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 4px 24px ${f.color}40)">${f.discount}% OFF</div>
          <div class="drw-hero-dtype">${t('fd_desconto')} ${(tf(f.dtype)||'').toUpperCase()}</div>
        </div>
      </div>`;
    }

    // Rating + Trustpilot (unified)
    html+=`<div class="fd-rating-block" style="margin-bottom:12px;${tpUrl?'cursor:pointer':''}"${tpUrl?` onclick="openTpPopup('${tpUrl}')"`:''}>
      <div class="fd-rating-num">${f.rating}</div>
      <div class="fd-rating-detail">
        <span class="fd-tp-excellent">${t('tp_excellent')}</span>
        <div class="fd-stars">${Array(5).fill(0).map((_,i)=>`<span class="fd-tp-star">${i<tpS?'★':'☆'}</span>`).join('')}</div>
        <div class="fd-reviews">${tpReviews.toLocaleString()} ${t('tp_reviews_on')} <b style="color:var(--tp-green)">Trustpilot</b></div>
      </div>
    </div>`;

    // About (exposed, no accordion)
    html+=`<div class="fd-about" style="margin-top:0;margin-bottom:14px;">
      <div class="fd-about-title">${t('fd_sobre_firma')}</div>
      <div class="fd-about-text">${tf(fa.about)}</div>
      <div class="fd-about-highlights">${fa.highlights.map(h=>`<div class="fd-about-hl"><div class="fd-about-hl-val" style="color:${f.color}">${h.val}</div><div class="fd-about-hl-label">${tf(h.label)}</div></div>`).join('')}</div>
    </div>`;

    // Stats grid (exposed)
    html+=`<div class="fd-stats" style="margin-top:0;padding-top:0;border-top:none;margin-bottom:14px;">
      <div class="fd-stat"><div class="fd-stat-label">Profit Split</div><div class="fd-stat-val g">${f.split}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_meta')}</div><div class="fd-stat-val y">${tf(f.target)||'—'}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">Drawdown</div><div class="fd-stat-val r">${tf(f.ddPct)||'—'}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_dias_min')}</div><div class="fd-stat-val">${f.minDays||'—'}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_scaling')}</div><div class="fd-stat-val">${tf(f.scaling)||'—'}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_prazo')}</div><div class="fd-stat-val">${f.evalDays?f.evalDays+'d':t('drw_sem_limite')}</div></div>
    </div>`;

    // ── Checkout section (same as fdRenderRight) ──
    html+=`<div class="drw-checkout" id="drw-ck-${id}"></div>`;

    document.getElementById('d-body').innerHTML = html;
    drwRenderCk(id, f);

    document.getElementById('ov').classList.add('open');
    document.getElementById('drw').classList.add('open');
    document.body.style.overflow='hidden';
    return;
  }

  // ── Fallback: simple drawer for firms without FIRM_ABOUT ──
  let html = '';
  html += `<div class="fd-rating-block"${f.trustpilot?` onclick="openTpPopup('${f.trustpilot.url}')" style="cursor:pointer"`:''}>
    <div class="fd-rating-num">${f.rating}</div>
    <div class="fd-rating-detail">
      <span class="fd-tp-excellent">${t('tp_excellent')}</span>
      <div class="fd-stars">${Array(5).fill(0).map((_,i)=>`<span class="fd-tp-star">${i<tpS?'★':'☆'}</span>`).join('')}</div>
      <div class="fd-reviews">${(f.trustpilot?.reviews||f.reviews||0).toLocaleString()} ${t('tp_reviews_on')} <b style="color:var(--tp-green)">Trustpilot</b></div>
    </div>
  </div>`;
  html+=`<div class="fd-about" style="margin-top:0;margin-bottom:14px;">
    <div class="fd-about-title">${t('fd_sobre_firma')}</div>
    <div class="fd-about-text">${tf(f.desc)||'—'}</div>
  </div>`;
  html+=`<div class="fd-stats" style="margin-top:0;padding-top:0;border-top:none;margin-bottom:14px;">
    <div class="fd-stat"><div class="fd-stat-label">Profit Split</div><div class="fd-stat-val g">${f.split||'—'}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">${t('drw_meta')}</div><div class="fd-stat-val y">${tf(f.target)||'—'}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">Drawdown</div><div class="fd-stat-val r">${tf(f.ddPct)||'—'}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">${t('drw_dias_min')}</div><div class="fd-stat-val">${f.minDays||'—'}</div></div>
  </div>`;
  html+=`<div class="drw-checkout">`;
  if (f.coupon) {
    html+=`<div class="drw-coupon-bar">
      <div class="offer-coupon-left"><div class="drw-coupon-label">${t('firms_cupom_exclusivo')}</div><span class="drw-coupon-code${f.coupon.length>12?' long':''}">${f.coupon}</span></div>
      <button class="drw-coupon-copy" onclick="cpCoupon('${f.coupon}','${f.id}','drw_direct')">${t('firms_copiar')}</button>
    </div><div class="drw-coupon-hint">${t('firms_hint_cupom')}</div>`;
  }
  html+=`<button class="go-btn" onclick="window.open('${f.link}','_blank');track('checkout_click',{firm_id:'${id}',firm_name:'${f.name.replace(/'/g,"\\'")}',coupon:'${f.coupon||'parceiro'}'});registerLoyaltyClick('','','','${f.name.replace(/'/g,"\\'")}')">${t('firms_comecar')}</button></div>`;

  document.getElementById('d-body').innerHTML = html;
  document.getElementById('ov').classList.add('open');
  document.getElementById('drw').classList.add('open');
  document.body.style.overflow='hidden';
}

// ── MOBILE: Render checkout inside drawer (reuses fdRenderRight pattern) ──
function drwRenderCk(id, f) {
  if(!f) f=FIRMS.find(x=>x.id===id);
  const fa=FIRM_ABOUT[id]; if(!fa||!f) return;
  const st=_fdState[id];
  const plans=fa.plans[st.type];

  let h=`<div class="fd-ck-header" style="padding:0;"><div class="fd-ck-title" style="font-size:18px;">${t('fd_configure_conta')}</div>
    <div class="fd-ck-sub">${f.coupon?t('fd_aplique_cupom'):''}</div></div>`;

  // Type pills
  if(fa.types.length>1){
    h+=`<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_tipo_conta')}</div>
      <div class="fd-pills">${fa.types.map(tp=>`<button class="fd-pill${tp===st.type?' sel':''}" style="${tp===st.type?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="_fdState['${id}'].type='${tp}';var pl=FIRM_ABOUT['${id}'].plans['${tp}'];_fdState['${id}'].size=(pl.find(p=>p.pop)||pl[0]).s;drwRenderCk('${id}')">${tp}</button>`).join('')}</div></div>`;
  }

  // Platform pills
  if(f.platforms?.length){
    h+=`<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_plataforma')}</div>
      <div class="fd-pills">${f.platforms.map(p=>`<button class="fd-pill${p===st.plat?' sel':''}" style="${p===st.plat?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="_fdState['${id}'].plat='${p}';drwRenderCk('${id}')">${p}</button>`).join('')}</div></div>`;
  }

  // Size pills
  if(plans?.length){
    h+=`<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_tamanho_conta')}</div>
      <div class="fd-sizes">${plans.map(p=>`<button class="fd-sz${p.s===st.size?' sel':''}${p.pop?' pop':''}" style="${p.s===st.size?`background:${f.color}12;border-color:${f.color}59;color:${f.color}`:''}" onclick="_fdState['${id}'].size='${p.s}';drwRenderCk('${id}')">${p.s}</button>`).join('')}</div></div>`;
  }

  // Price card
  const plan=plans?.find(p=>p.s===st.size)||plans?.[0];
  if(plan){
    const oNum=parseFloat((plan.o||'').replace(/[^0-9.]/g,''));
    const dNum=parseFloat((plan.d||'').replace(/[^0-9.]/g,''));
    const cur=(plan.d||'').match(/[€$]/)?.[0]||'$';
    const save=oNum&&dNum&&plan.o!=='—'?(oNum-dNum).toFixed(2):null;
    h+=`<div class="fd-price" style="border-color:${f.color}1F"><div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${f.color}40,transparent)"></div>
      <div><div class="fd-price-size" style="font-size:20px;">${plan.s}</div><div class="fd-price-type">${st.type}</div></div>
      <div class="fd-price-right"><div class="fd-price-new" style="color:${f.color};font-size:24px;">${plan.d}</div>${plan.o&&plan.o!=='—'?`<div class="fd-price-old">${plan.o}</div>`:''} ${save?`<div class="fd-price-save">${t('fd_economia')} ${cur}${save}</div>`:''}</div>
    </div>`;
  }

  // Coupon
  if(f.coupon){
    const isLong=f.coupon.length>12;
    h+=`<div class="fd-cpn"><div><div class="fd-cpn-tag">${t('fd_cupom_exclusivo')}</div><div class="fd-cpn-code${isLong?' long':''}">${f.coupon}</div></div>
      <button class="fd-cpn-copy" onclick="cpCoupon('${f.coupon}','${id}','drw_fd_coupon')">${t('firms_copiar')}</button></div>
      <div class="fd-cpn-hint">${t('fd_cupom_hint')}</div>`;
  }

  // CTA
  h+=`<button class="fd-cta" onclick="fdGo('${id}')">${t('fd_comecar')} &#8594;</button>`;

  // Includes
  if(fa.includes?.length){
    h+=`<div class="fd-includes"><div class="fd-inc-title">${t('fd_incluso_plano')}</div>
      <div class="fd-inc-grid">${fa.includes.map(i=>`<div class="fd-inc">${tf(i)}</div>`).join('')}</div></div>`;
  }

  document.getElementById('drw-ck-'+id).innerHTML=h;
}

function toggleDrwSection(id) {
  document.getElementById(id)?.classList.toggle('open');
}

function drwSelType(firmId, type) {
  _drwState[firmId] = _drwState[firmId] || {};
  _drwState[firmId].type = type;
  document.querySelectorAll(`#drw-types-${firmId} .drw-btn`).forEach(b=>b.classList.toggle('sel', b.textContent.trim()===type));
}
function drwSelPlat(firmId, plat) {
  _drwState[firmId] = _drwState[firmId] || {};
  _drwState[firmId].plat = plat;
  document.querySelectorAll(`#drw-plats-${firmId} .drw-btn`).forEach(b=>b.classList.toggle('sel', b.textContent.trim()===plat));
}
function drwSelSize(firmId, size) {
  _drwState[firmId] = _drwState[firmId] || {};
  _drwState[firmId].size = size;
  document.querySelectorAll(`#drw-sizes-${firmId} .drw-btn`).forEach(b=>b.classList.toggle('sel', b.textContent.trim()===size));
}
function drwGoCheckout(firmId) {
  const cf = CHECKOUT_FIRMS.find(f=>f.id===firmId);
  const f  = FIRMS.find(x=>x.id===firmId);
  if (!cf || !f) { window.open(f?.link||'#','_blank'); return; }
  const st = _drwState[firmId] || {};
  let url = cf.buildUrl(st.size||'', st.type||'', st.plat||'');
  url+=(url.includes('?')?'&':'?')+'utm_source=marketscoupons&utm_medium=drawer&utm_campaign='+firmId+'_'+(st.size||'').replace(/[^a-z0-9]/gi,'_').toLowerCase();
  if (f.coupon) {
    navigator.clipboard.writeText(f.coupon).catch(()=>{});
  }
  track('checkout_click',{firm_id:firmId,firm_name:f.name,platform:st.plat,type:st.type,account_size:st.size,coupon:f.coupon||'parceiro'});
  registerLoyaltyClick(st.size||'',st.plat||'',st.type||'',f.name);
  window.open(url,'_blank');
}

function closeD(){document.getElementById('ov').classList.remove('open');document.getElementById('drw').classList.remove('open');closeFD();document.querySelectorAll('.fr').forEach(r=>r.classList.remove('active'));document.body.style.overflow='';if(location.hash.startsWith('#firm/'))history.replaceState(null,'',location.pathname+location.search);}

/* TRUSTPILOT POPUP (window.open — Trustpilot blocks iframes) */
function openTpPopup(url) {
  track('trustpilot_click',{url});
  try {
    var isMobile = window.innerWidth <= 767;
    if (isMobile) { window.open(url, '_blank', 'noopener'); return false; }
    var w = Math.min(1100, Math.floor(screen.width * 0.9));
    var h = Math.min(850, Math.floor(screen.height * 0.85));
    var left = Math.floor((screen.width - w) / 2);
    var top = Math.floor((screen.height - h) / 2);
    var features = 'width='+w+',height='+h+',left='+left+',top='+top+',resizable=yes,scrollbars=yes,noopener';
    var popup = window.open(url, 'trustpilotReviews', features);
    if (!popup || popup.closed) window.open(url, '_blank', 'noopener');
    else popup.focus();
  } catch(e) { window.open(url, '_blank'); }
  return false;
}

/* FAQ */
const FAQ_LANGS = {
  pt: [
    {q:'O que é uma prop firm?', a:'Uma prop firm (proprietary trading firm) é uma empresa que fornece capital para traders operarem. O trader faz uma avaliação, e se aprovado, opera com o dinheiro da firma e recebe parte dos lucros.'},
    {q:'Como funcionam os cupons do Markets Coupons?', a:'Nossos cupons são códigos exclusivos negociados diretamente com as prop firms. Basta copiar o código e colar no checkout da firma para receber o desconto automaticamente. Alguns descontos são aplicados diretamente pelo link de parceiro.'},
    {q:'Os cupons são realmente gratuitos?', a:'Sim, todos os cupons são 100% gratuitos para usar. O Markets Coupons é remunerado pelas prop firms através de parcerias de afiliados, sem nenhum custo extra para você.'},
    {q:'Qual a melhor prop firm para iniciantes?', a:'Depende do seu perfil. A Apex Trader Funding oferece até 90% de desconto e regras flexíveis. A Bulenox permite passar em 1 dia. A FTMO tem Free Trial ilimitado. Use nosso Quiz para descobrir a melhor para você.'},
    {q:'Posso usar mais de um cupom ao mesmo tempo?', a:'Geralmente não. Cada prop firm aceita apenas um código de desconto por compra. Nossos cupons já são os maiores disponíveis no mercado.'},
    {q:'O que é Trailing Drawdown vs EOD Drawdown?', a:'Trailing Drawdown se move conforme o lucro, podendo voltar ao breakeven. EOD (End of Day) Drawdown só é calculado no fechamento do dia, dando mais flexibilidade durante a operação.'},
    {q:'Quanto tempo leva para receber o payout?', a:'Varia por firma. Apex e Bulenox processam em 5 dias úteis. FundedNext garante payout em 24h. Take Profit Trader permite saque desde o dia 1.'},
    {q:'O que é o programa de fidelidade?', a:'Nosso programa de fidelidade recompensa membros com benefícios exclusivos por compras validadas. Com 3 compras aprovadas você desbloqueia o Live Room VIP.'},
    {q:'Os cupons têm data de validade?', a:'Alguns cupons são por tempo limitado e outros são permanentes. As promoções de cada firma são atualizadas diariamente. Recomendamos usar o cupom assim que possível.'},
    {q:'Como faço para comparar prop firms?', a:'Use nossa ferramenta de comparação na aba "Comparar" ou acesse a aba "Firmas" para ver todas as opções lado a lado com ratings, preços, plataformas e avaliações do Trustpilot.'},
  ],
  en: [
    {q:'What is a prop firm?', a:'A prop firm (proprietary trading firm) is a company that provides capital for traders to operate. The trader takes an evaluation, and if approved, trades with the firm\'s money and receives a share of the profits.'},
    {q:'How do Markets Coupons coupons work?', a:'Our coupons are exclusive codes negotiated directly with prop firms. Just copy the code and paste it at the firm\'s checkout to receive the discount automatically. Some discounts are applied directly through the affiliate link.'},
    {q:'Are the coupons really free?', a:'Yes, all coupons are 100% free to use. Markets Coupons is paid by prop firms through affiliate partnerships, at no extra cost to you.'},
    {q:'What is the best prop firm for beginners?', a:'It depends on your profile. Apex Trader Funding offers up to 90% off and flexible rules. Bulenox lets you pass in 1 day. FTMO has an unlimited Free Trial. Use our Quiz to find the best one for you.'},
    {q:'Can I use more than one coupon at the same time?', a:'Generally no. Each prop firm accepts only one discount code per purchase. Our coupons are already the largest available in the market.'},
    {q:'What is Trailing Drawdown vs EOD Drawdown?', a:'Trailing Drawdown moves with profit, potentially returning to breakeven. EOD (End of Day) Drawdown is only calculated at market close, giving more flexibility during the trading session.'},
    {q:'How long does it take to receive a payout?', a:'Varies by firm. Apex and Bulenox process in 5 business days. FundedNext guarantees payout in 24h. Take Profit Trader allows withdrawal from day 1.'},
    {q:'What is the loyalty program?', a:'Our loyalty program rewards members with exclusive benefits for validated purchases. With 3 approved purchases you unlock the VIP Live Room.'},
    {q:'Do coupons have an expiration date?', a:'Some coupons are time-limited and others are permanent. Each firm\'s promotions are updated daily. We recommend using the coupon as soon as possible.'},
    {q:'How do I compare prop firms?', a:'Use our comparison tool in the "Compare" tab or access the "Firms" tab to see all options side by side with ratings, prices, platforms and Trustpilot reviews.'},
  ],
  es: [
    {q:'¿Qué es una prop firm?', a:'Una prop firm es una empresa que proporciona capital para que los traders operen. El trader realiza una evaluación y, si es aprobado, opera con el dinero de la empresa y recibe parte de las ganancias.'},
    {q:'¿Cómo funcionan los cupones de Markets Coupons?', a:'Nuestros cupones son códigos exclusivos negociados directamente con las prop firms. Solo copia el código y pégalo en el checkout de la firma para recibir el descuento automáticamente.'},
    {q:'¿Los cupones son realmente gratuitos?', a:'Sí, todos los cupones son 100% gratuitos. Markets Coupons es remunerado por las prop firms a través de asociaciones de afiliados, sin ningún costo extra para ti.'},
    {q:'¿Cuál es la mejor prop firm para principiantes?', a:'Apex ofrece hasta 90% de descuento. Bulenox permite pasar en 1 día. FTMO tiene Free Trial ilimitado. Usa nuestro Quiz para encontrar la mejor para ti.'},
    {q:'¿Puedo usar más de un cupón al mismo tiempo?', a:'Generalmente no. Cada prop firm acepta solo un código de descuento por compra.'},
    {q:'¿Qué es Trailing Drawdown vs EOD Drawdown?', a:'Trailing Drawdown se mueve con el beneficio. EOD Drawdown solo se calcula al cierre del mercado, dando más flexibilidad.'},
    {q:'¿Cuánto tiempo lleva recibir el payout?', a:'Varía por firma. Apex y Bulenox procesan en 5 días hábiles. FundedNext garantiza payout en 24h. Take Profit Trader permite retiro desde el día 1.'},
    {q:'¿Qué es el programa de fidelidad?', a:'Nuestro programa de fidelidad recompensa a los miembros con beneficios exclusivos por sus compras validadas. Con 3 compras aprobadas desbloqueas el Live Room VIP.'},
    {q:'¿Los cupones tienen fecha de vencimiento?', a:'Algunos son por tiempo limitado y otros son permanentes. Recomendamos usar el cupón lo antes posible.'},
    {q:'¿Cómo comparo prop firms?', a:'Usa nuestra herramienta de comparación en la pestaña "Comparar" o accede a "Firmas" para ver todas las opciones lado a lado.'},
  ],
  it: [
    {q:'Cos\'è una prop firm?', a:'Una prop firm è un\'azienda che fornisce capitale ai trader per operare. Il trader supera una valutazione e, se approvato, opera con il denaro dell\'azienda ricevendo una parte dei profitti.'},
    {q:'Come funzionano i coupon di Markets Coupons?', a:'I nostri coupon sono codici esclusivi negoziati direttamente con le prop firm. Basta copiare il codice e incollarlo al checkout per ricevere lo sconto automaticamente.'},
    {q:'I coupon sono davvero gratuiti?', a:'Sì, tutti i coupon sono 100% gratuiti. Markets Coupons è remunerata dalle prop firm tramite partnership di affiliazione, senza costi aggiuntivi per te.'},
    {q:'Qual è la migliore prop firm per i principianti?', a:'Apex offre fino al 90% di sconto. Bulenox permette di superare la valutazione in 1 giorno. FTMO ha un Free Trial illimitato. Usa il nostro Quiz per trovare quella giusta per te.'},
    {q:'Posso usare più di un coupon contemporaneamente?', a:'In generale no. Ogni prop firm accetta solo un codice sconto per acquisto.'},
    {q:'Cos\'è il Trailing Drawdown vs EOD Drawdown?', a:'Il Trailing Drawdown si muove con il profitto. L\'EOD Drawdown viene calcolato solo alla chiusura del mercato, offrendo maggiore flessibilità.'},
    {q:'Quanto tempo ci vuole per ricevere il payout?', a:'Varia per firma. Apex e Bulenox processano in 5 giorni lavorativi. FundedNext garantisce il payout in 24h. Take Profit Trader permette il prelievo dal giorno 1.'},
    {q:'Cos\'è il programma fedeltà?', a:'Il nostro programma fedeltà premia i membri con benefici esclusivi per gli acquisti validati. Con 3 acquisti approvati sblocchi il Live Room VIP.'},
    {q:'I coupon hanno una data di scadenza?', a:'Alcuni sono a tempo limitato e altri sono permanenti. Consigliamo di usare il coupon il prima possibile.'},
    {q:'Come confronto le prop firm?', a:'Usa il nostro strumento di confronto nella scheda "Confronta" o accedi ad "Aziende" per vedere tutte le opzioni fianco a fianco.'},
  ],
  fr: [
    {q:'Qu\'est-ce qu\'une prop firm ?', a:'Une prop firm est une société qui fournit des capitaux aux traders pour opérer. Le trader passe une évaluation et, s\'il est accepté, opère avec l\'argent de l\'entreprise et reçoit une partie des bénéfices.'},
    {q:'Comment fonctionnent les coupons de Markets Coupons ?', a:'Nos coupons sont des codes exclusifs négociés directement avec les prop firms. Il suffit de copier le code et de le coller lors du paiement pour obtenir la réduction automatiquement.'},
    {q:'Les coupons sont-ils vraiment gratuits ?', a:'Oui, tous les coupons sont 100% gratuits. Markets Coupons est rémunéré par les prop firms via des partenariats d\'affiliation.'},
    {q:'Quelle est la meilleure prop firm pour les débutants ?', a:'Apex offre jusqu\'à 90% de réduction. Bulenox permet de réussir en 1 jour. FTMO a un Free Trial illimité. Utilisez notre Quiz pour trouver la meilleure pour vous.'},
    {q:'Puis-je utiliser plusieurs coupons en même temps ?', a:'En général non. Chaque prop firm accepte seulement un code de réduction par achat.'},
    {q:'Qu\'est-ce que le Trailing Drawdown vs EOD Drawdown ?', a:'Le Trailing Drawdown suit le profit. L\'EOD Drawdown n\'est calculé qu\'à la clôture du marché, offrant plus de flexibilité.'},
    {q:'Combien de temps faut-il pour recevoir le payout ?', a:'Varie selon la firme. Apex et Bulenox traitent en 5 jours ouvrables. FundedNext garantit le payout en 24h. Take Profit Trader permet les retraits dès le jour 1.'},
    {q:'Qu\'est-ce que le programme de fidélité ?', a:'Notre programme de fidélité récompense les membres avec des avantages exclusifs pour leurs achats validés. Avec 3 achats approuvés vous débloquez le Live Room VIP.'},
    {q:'Les coupons ont-ils une date d\'expiration ?', a:'Certains sont limités dans le temps et d\'autres sont permanents. Nous recommandons d\'utiliser le coupon le plus tôt possible.'},
    {q:'Comment comparer les prop firms ?', a:'Utilisez notre outil de comparaison dans l\'onglet "Comparer" ou accédez à "Firmes" pour voir toutes les options côte à côte.'},
  ],
  de: [
    {q:'Was ist eine Prop Firm?', a:'Eine Prop Firm ist ein Unternehmen, das Trader mit Kapital versorgt. Der Trader absolviert eine Bewertung und handelt bei Zulassung mit dem Geld der Firma und erhält einen Teil der Gewinne.'},
    {q:'Wie funktionieren die Gutscheine von Markets Coupons?', a:'Unsere Gutscheine sind exklusive Codes, die direkt mit den Prop Firms ausgehandelt wurden. Kopiere den Code und füge ihn beim Checkout ein, um den Rabatt automatisch zu erhalten.'},
    {q:'Sind die Gutscheine wirklich kostenlos?', a:'Ja, alle Gutscheine sind 100% kostenlos. Markets Coupons wird von den Prop Firms über Affiliate-Partnerschaften vergütet.'},
    {q:'Was ist die beste Prop Firm für Anfänger?', a:'Apex bietet bis zu 90% Rabatt. Bulenox ermöglicht das Bestehen in 1 Tag. FTMO hat eine unbegrenzte Free Trial. Nutze unser Quiz, um die Beste für dich zu finden.'},
    {q:'Kann ich mehr als einen Gutschein gleichzeitig verwenden?', a:'Im Allgemeinen nein. Jede Prop Firm akzeptiert nur einen Rabattcode pro Kauf.'},
    {q:'Was ist Trailing Drawdown vs EOD Drawdown?', a:'Trailing Drawdown bewegt sich mit dem Gewinn. EOD Drawdown wird nur bei Marktschluss berechnet und bietet mehr Flexibilität.'},
    {q:'Wie lange dauert es, eine Auszahlung zu erhalten?', a:'Variiert je nach Firma. Apex und Bulenox verarbeiten in 5 Werktagen. FundedNext garantiert Auszahlung in 24h. Take Profit Trader erlaubt Abhebungen ab Tag 1.'},
    {q:'Was ist das Treueprogramm?', a:'Unser Treueprogramm belohnt Mitglieder mit exklusiven Vorteilen für validierte Einkäufe. Mit 3 genehmigten Käufen schaltest du den Live Room VIP frei.'},
    {q:'Haben Gutscheine ein Ablaufdatum?', a:'Einige sind zeitlich begrenzt und andere sind dauerhaft. Wir empfehlen, den Gutschein so bald wie möglich zu verwenden.'},
    {q:'Wie vergleiche ich Prop Firms?', a:'Nutze unser Vergleichstool im Tab "Vergleichen" oder gehe zu "Firmen", um alle Optionen nebeneinander zu sehen.'},
  ],
  ar: [
    {q:'ما هي شركة Prop Firm؟', a:'شركة Prop Firm هي شركة تزود المتداولين برأس المال للتداول. يجتاز المتداول تقييماً وإذا نجح يتداول بأموال الشركة ويحصل على جزء من الأرباح.'},
    {q:'كيف تعمل كوبونات Markets Coupons؟', a:'كوبوناتنا هي رموز حصرية متفاوض عليها مع شركات Prop. انسخ الرمز وألصقه عند الدفع للحصول على الخصم تلقائياً.'},
    {q:'هل الكوبونات مجانية حقاً؟', a:'نعم، جميع الكوبونات مجانية 100%. تحصل Markets Coupons على عمولة من شركات Prop عبر شراكات التسويق.'},
    {q:'ما هي أفضل Prop Firm للمبتدئين؟', a:'Apex تقدم خصماً حتى 90%. Bulenox يتيح الاجتياز في يوم واحد. FTMO لديها تجربة مجانية غير محدودة. استخدم اختبارنا للعثور على الأفضل لك.'},
    {q:'هل يمكنني استخدام أكثر من كوبون في نفس الوقت؟', a:'عموماً لا. تقبل كل شركة كوداً واحداً فقط للخصم لكل عملية شراء.'},
    {q:'ما الفرق بين Trailing Drawdown و EOD Drawdown؟', a:'Trailing Drawdown يتحرك مع الربح. EOD Drawdown يُحسب فقط عند إغلاق السوق مما يمنح مرونة أكبر.'},
    {q:'كم من الوقت يستغرق استلام الدفعة؟', a:'يختلف حسب الشركة. Apex وBulenox تعالج خلال 5 أيام عمل. FundedNext تضمن الدفع خلال 24 ساعة. Take Profit Trader يتيح السحب من اليوم الأول.'},
    {q:'ما هو برنامج الولاء؟', a:'برنامج الولاء يكافئ الأعضاء بمزايا حصرية على المشتريات المعتمدة. مع 3 مشتريات موافق عليها تفتح Live Room VIP.'},
    {q:'هل للكوبونات تاريخ انتهاء؟', a:'بعضها محدود بوقت وآخر دائم. نوصي باستخدام الكوبون في أقرب وقت ممكن.'},
    {q:'كيف أقارن بين شركات Prop؟', a:'استخدم أداة المقارنة في تبويب "مقارنة" أو انتقل إلى "شركات" لرؤية جميع الخيارات جنباً إلى جنب.'},
  ],
};
function getFaqData() { return FAQ_LANGS[_currentLang] || FAQ_LANGS.pt; }
function renderFaq() {
  const el = document.getElementById('faq-list');
  if(!el) return;
  el.innerHTML = getFaqData().map((item,i) => `
    <div class="faq-item" id="faq-${i}">
      <div class="faq-q" onclick="document.getElementById('faq-${i}').classList.toggle('open')">
        <span>${item.q}</span><span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
      </div>
      <div class="faq-a"><p>${item.a}</p></div>
    </div>`).join('');
}

/* COUPON */
function shortCode(c,max=12){return c&&c.length>max?c.slice(0,max)+'…':c;}
function cpCoupon(code,firmId,location){
  navigator.clipboard.writeText(code).then(()=>{
    showToast('Codigo '+code+' copiado!');
    const f=FIRMS.find(x=>x.id===firmId);
    track('coupon_copy',{coupon_code:code,firm_id:firmId,firm_name:f?.name,discount:f?.discount,location});
    // Meta Pixel: CopyCode event on dedicated firm pages
    if(window._dedicatedFirmSlug && typeof fbq==='function') fbq('trackCustom','CopyCode',{firm:firmId,coupon:code});
  });
}

/* MULTI-FIRM CHECKOUT */
const CHECKOUT_FIRMS=[
  {id:'apex',name:'Apex Trader Funding',short:'Apex',coupon:'MARKET',discount:'90%',color:'#F97316',bg:'rgba(249,115,22,0.12)',
   includes:['Sem limite de perda diaria','Sem regra de escalamento','Licenca NinjaTrader (Rithmic)','Dados em tempo real','Copy Trader (WealthCharts)','Suporte 24/7'],
   types:['Intraday Trail','EOD Trail'],platforms:['Rithmic','Tradovate','WealthCharts'],
   plans:[{size:'25K',capital:'$25,000',goal:'$1,500',maxDD:'$1,500',orig:'$199',disc:'$19.90',orig2:'$299',disc2:'$29.90',featured:false},{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'$2,500',orig:'$229',disc:'$22.90',orig2:'$329',disc2:'$32.90',featured:false},{size:'100K',capital:'$100,000',goal:'$6,000',maxDD:'$3,000',orig:'$329',disc:'$32.90',orig2:'$529',disc2:'$52.90',featured:true},{size:'150K',capital:'$150,000',goal:'$9,000',maxDD:'$4,500',orig:'$439',disc:'$43.90',orig2:'$639',disc2:'$63.90',featured:false}],
   buildUrl:(size,type,plat)=>`https://dashboard.apextraderfunding.com/signup/${size.toLowerCase()}-${plat}-${type==='Intraday Trail'?'intraday-trail':'eod-trail'}?referralCode=evertonmiranda`},
  {id:'bulenox',name:'Bulenox',short:'Bulenox',coupon:'MARKET89',discount:'89%',color:'#3B82F6',bg:'rgba(59,130,246,0.12)',
   includes:['Passa em 1 dia','Sem consistencia','Trade durante noticias','Payouts semanais','Trial 14 dias gratis'],
   types:['Trailing DD','EOD DD'],platforms:['Rithmic','NinjaTrader'],
   plans:[{size:'25K',capital:'$25,000',goal:'$1,500',maxDD:'$1,500',orig:'$145',disc:'$15.95',featured:false},{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'$2,500',orig:'$175',disc:'$19.25',featured:false},{size:'100K',capital:'$100,000',goal:'$6,000',maxDD:'$3,000',orig:'$215',disc:'$23.65',featured:true},{size:'150K',capital:'$150,000',goal:'$9,000',maxDD:'$4,500',orig:'$325',disc:'$35.75',featured:false},{size:'250K',capital:'$250,000',goal:'$15,000',maxDD:'$5,500',orig:'$535',disc:'$48.15',featured:false}],
   buildUrl:(size,type,plat)=>{const h={'Trailing DD':{'25K':'XmYUhXXvx1ud','50K':'0bT4YXXXHKC8','100K':'T4Lmwnn9yBzB','150K':'GhglNC59Ffdl','250K':'LZyTKrCf9Gx3'},'EOD DD':{'25K':'gaYjK4hbWZVH','50K':'SO2xo1C8RMiR','100K':'X16PzRq0l1Gf','150K':'hX4U32Jsgrh6','250K':'N3eDYQd3rQF2'}};const hash=h[type]?.[size];return hash?`https://bulenox.com/member/buy/${hash}`:'https://bulenox.com/member/aff/go/marketcoupons';}},
  {id:'ftmo',name:'FTMO',short:'FTMO',coupon:null,discount:'0%',color:'#22C55E',bg:'rgba(34,197,94,0.12)',
   includes:['Free Trial ilimitado','90% split de lucro','1-Step e 2-Step','Suporte 20 idiomas','Scaling ate $2M','Sem limite de tempo'],
   types:['2-Step Challenge','1-Step Challenge'],platforms:['MT4','MT5','cTrader','DXtrade'],
   plans:[{size:'10K',capital:'$10,000',goal:'$1,000',maxDD:'-10%',orig:'—',disc:'€155',featured:false},{size:'25K',capital:'$25,000',goal:'$2,500',maxDD:'-10%',orig:'—',disc:'€250',featured:false},{size:'50K',capital:'$50,000',goal:'$4,000',maxDD:'-10%',orig:'—',disc:'€345',featured:false},{size:'100K',capital:'$100,000',goal:'$8,000',maxDD:'-10%',orig:'—',disc:'€540',featured:true},{size:'200K',capital:'$200,000',goal:'$16,000',maxDD:'-10%',orig:'—',disc:'€1.080',featured:false}],
   buildUrl:(size,type,plat)=>'https://trader.ftmo.com/?affiliates=eyfIptUCGgfcfaUlyrRP'},
  {id:'tpt',name:'Take Profit Trader',short:'TPT',coupon:'MARKET40',discount:'40%',color:'#A855F7',bg:'rgba(168,85,247,0.12)',
   includes:['Saque desde o dia 1','Sem taxa de ativacao','Sem limite de perda diaria','EOD Drawdown'],
   types:['EOD Drawdown'],platforms:['Tradovate','TradingView','Rithmic','NinjaTrader'],
   plans:[{size:'25K',capital:'$25,000',goal:'Variavel',maxDD:'EOD',orig:'$150',disc:'$90',featured:false},{size:'50K',capital:'$50,000',goal:'Variavel',maxDD:'EOD',orig:'$170',disc:'$102',featured:false},{size:'75K',capital:'$75,000',goal:'Variavel',maxDD:'EOD',orig:'$245',disc:'$147',featured:false},{size:'100K',capital:'$100,000',goal:'Variavel',maxDD:'EOD',orig:'$330',disc:'$198',featured:true},{size:'150K',capital:'$150,000',goal:'Variavel',maxDD:'EOD',orig:'$360',disc:'$216',featured:false}],
   buildUrl:(size,type,plat)=>'https://takeprofittrader.com/?referralCode=MARKET40'},
  {id:'fn',name:'FundedNext',short:'FundedNext',coupon:'FNF30',discount:'30%',color:'#06B6D4',bg:'rgba(6,182,212,0.12)',
   includes:['Payout garantido 24h','Sem limite de tempo','$1K compensacao atraso','Ate 95% split','Scaling ate $4M','15% lucro avaliacao'],
   types:['Evaluation'],platforms:['MT4','MT5','cTrader','Match-Trader'],
   plans:[{size:'6K',capital:'$6,000',goal:'Variavel',maxDD:'Fixo',orig:'$69.99',disc:'$48.99',featured:false},{size:'15K',capital:'$15,000',goal:'Variavel',maxDD:'Fixo',orig:'$119.99',disc:'$83.99',featured:false},{size:'25K',capital:'$25,000',goal:'Variavel',maxDD:'Fixo',orig:'$189.99',disc:'$132.99',featured:false},{size:'50K',capital:'$50,000',goal:'Variavel',maxDD:'Fixo',orig:'$269.99',disc:'$188.99',featured:true},{size:'100K',capital:'$100,000',goal:'Variavel',maxDD:'Fixo',orig:'$499.99',disc:'$349.99',featured:false}],
   buildUrl:(size,type,plat)=>'https://fundednext.com/?fpr=everton33'},
  {id:'e2t',name:'Earn2Trade',short:'E2T',coupon:'MARKETSCOUPONS',discount:'60%',color:'#F59E0B',bg:'rgba(245,158,11,0.12)',
   includes:['Journalytix gratis','Reset gratis','NT/Finamark gratis','Escalamento ate $400K','Sem taxa mensal'],
   types:['Trader Career Path','Gauntlet Mini'],platforms:['Rithmic','NinjaTrader','Tradovate'],
   plans:[{size:'TCP25',capital:'$25,000',goal:'$1,750',maxDD:'$1,500',orig:'$150',disc:'$60',featured:false},{size:'TCP50',capital:'$50,000',goal:'$3,000',maxDD:'$2,000',orig:'$190',disc:'$76',featured:false},{size:'TCP100',capital:'$100,000',goal:'$6,000',maxDD:'$3,500',orig:'$350',disc:'$140',featured:true},{size:'Gauntlet 50K',capital:'$50,000',goal:'Variavel',maxDD:'Variavel',orig:'$170',disc:'$68',featured:false},{size:'Gauntlet 100K',capital:'$100,000',goal:'Variavel',maxDD:'Variavel',orig:'$315',disc:'$126',featured:false}],
   buildUrl:(size,type,plat)=>{const m={'TCP25':'TCP25','TCP50':'TCP50','TCP100':'TCP100','Gauntlet 50K':'GML50','Gauntlet 100K':'GML100'};return`https://www.earn2trade.com/purchase?plan=${m[size]||'TCP25'}&a_pid=marketscoupons&a_bid=2e8e8a14&discount=MARKETSCOUPONS`;}},
  {id:'the5ers',name:'The5ers',short:'The5ers',coupon:null,discount:'0%',color:'#10B981',bg:'rgba(16,185,129,0.12)',
   includes:['Scaling ate $4M','Profit Split ate 100%','Payout medio 16h','Alavancagem 1:100','Sem limite de tempo','Dashboard avancado'],
   types:['Hyper Growth','2-Step'],platforms:['MT5'],
   plans:[{size:'$5K HG',capital:'$5,000',goal:'$500',maxDD:'-10%',orig:'—',disc:'$39',featured:false},{size:'$10K HG',capital:'$10,000',goal:'$1,000',maxDD:'-10%',orig:'—',disc:'$85',featured:false},{size:'$20K HG',capital:'$20,000',goal:'$2,000',maxDD:'-10%',orig:'—',disc:'$175',featured:true},{size:'$100K 2-Step',capital:'$100,000',goal:'$10,000',maxDD:'-10%',orig:'—',disc:'$491',featured:false},{size:'$250K 2-Step',capital:'$250,000',goal:'$25,000',maxDD:'-10%',orig:'—',disc:'$1125',featured:false}],
   buildUrl:(size,type,plat)=>'https://www.the5ers.com/?afmc=19jp'},
  {id:'fundingpips',name:'Funding Pips',short:'FundingPips',coupon:'31985EAA',discount:'20%',color:'#6366F1',bg:'rgba(99,102,241,0.12)',
   includes:['Split flexivel ate 100% mensal','$200M+ pagos','Alavancagem 1:100','Comunidade Discord ativa'],
   types:['2-Step'],platforms:['MT5','Match-Trader','cTrader'],
   plans:[{size:'$5K',capital:'$5,000',goal:'$400',maxDD:'-10%',orig:'$36',disc:'$28.80',featured:false},{size:'$10K',capital:'$10,000',goal:'$800',maxDD:'-10%',orig:'$66',disc:'$52.80',featured:false},{size:'$25K',capital:'$25,000',goal:'$2,000',maxDD:'-10%',orig:'$149',disc:'$119.20',featured:false},{size:'$50K',capital:'$50,000',goal:'$4,000',maxDD:'-10%',orig:'$249',disc:'$199.20',featured:true},{size:'$100K',capital:'$100,000',goal:'$8,000',maxDD:'-10%',orig:'$529',disc:'$423.20',featured:false}],
   buildUrl:(size,type,plat)=>'https://app.fundingpips.com/register?ref=31985EAA'},
  {id:'brightfunded',name:'BrightFunded',short:'BrightFunded',coupon:'CLNLTPxtT4Sok0PzHaRIIQ',discount:'20%',color:'#00C9A7',bg:'rgba(0,201,167,0.12)',
   includes:['Scaling ate 100% split','Drawdown estatico','Payout 24h ciclo 7 dias','15% bonus lucro avaliacao','Trade2Earn','Alavancagem 1:100','Suporte 24/7'],
   types:['2-Step'],platforms:['MT5','DXtrade','cTrader'],
   plans:[{size:'$5K',capital:'$5,000',goal:'$400',maxDD:'-10%',orig:'€45',disc:'€36',featured:false},{size:'$10K',capital:'$10,000',goal:'$800',maxDD:'-10%',orig:'€85',disc:'€68',featured:false},{size:'$25K',capital:'$25,000',goal:'$2,000',maxDD:'-10%',orig:'€165',disc:'€132',featured:false},{size:'$50K',capital:'$50,000',goal:'$4,000',maxDD:'-10%',orig:'€285',disc:'€228',featured:true},{size:'$100K',capital:'$100,000',goal:'$8,000',maxDD:'-10%',orig:'€495',disc:'€396',featured:false},{size:'$200K',capital:'$200,000',goal:'$16,000',maxDD:'-10%',orig:'€945',disc:'€756',featured:false}],
   buildUrl:(size,type,plat)=>'https://brightfunded.com/a/CLNLTPxtT4Sok0PzHaRIIQ'}
];

let achActiveFirm='apex';
const achState={};
CHECKOUT_FIRMS.forEach(f=>{achState[f.id]={};f.plans.forEach(p=>{achState[f.id][p.size]={type:f.types[0],plat:f.platforms[0]};});});

/* ── SUPABASE: Load firms dynamically (overwrites hardcoded arrays) ── */
async function loadFirmsFromSupabase() {
  try {
    const { data, error } = await db.from('cms_firms')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error || !data || !data.length) return; // fallback: keep hardcoded

    // Map Supabase rows → FIRMS format (same shape renderFirms() expects)
    FIRMS.length = 0;
    data.forEach(f => {
      const firm = {
        id: f.id, name: f.name, type: f.type,
        color: f.color, bg: f.bg || f.color + '1F',
        icon: f.icon, icon_url: f.icon_url || '',
        discount: f.discount, dtype: f.discount_type || 'lifetime',
        coupon: f.coupon || null, link: f.link, split: f.split || '80%',
        rating: parseFloat(f.rating) || 4.5,
        reviews: parseInt(f.reviews) || 0,
        platforms: Array.isArray(f.platforms) ? f.platforms : (f.platforms||'').split(',').map(s=>s.trim()),
        tags: f.tags || [], drawdown: f.drawdown, minDays: f.min_days,
        evalDays: f.eval_days, ddPct: f.dd_pct, target: f.target, scaling: f.scaling,
        prices: f.prices || [], price_types: f.price_types || [], perks: f.perks || [], proibido: f.proibido || [],
        desc: f.description || '',
        badge: f.badge && f.badge.label ? f.badge : undefined,
        newsTrading: f.news_trading || false,
        day1Payout: f.day1_payout || false,
      };
      if (f.trustpilot_url) {
        firm.trustpilot = { score: parseFloat(f.trustpilot_score)||firm.rating, reviews: parseInt(f.trustpilot_reviews)||firm.reviews, url: f.trustpilot_url };
      }
      FIRMS.push(firm);
    });

    // Map → CHECKOUT_FIRMS format
    CHECKOUT_FIRMS.length = 0;
    data.filter(f => f.checkout_plans?.length).forEach(f => {
      const urlTpl = f.checkout_url_template || f.link || '#';
      CHECKOUT_FIRMS.push({
        id: f.id, name: f.name, short: f.short_name || f.icon,
        coupon: f.coupon || null,
        discount: f.discount + '%',
        color: f.color, bg: f.bg || f.color + '1F',
        platforms: Array.isArray(f.checkout_platforms) ? f.checkout_platforms : (Array.isArray(f.platforms) ? f.platforms : []),
        types: Array.isArray(f.checkout_types) ? f.checkout_types : ['Standard'],
        plans: f.checkout_plans || [],
        includes: Array.isArray(f.checkout_includes) ? f.checkout_includes : [],
        buildUrl: (size, type, plat) => {
          // Interpolate template: ${size}, ${type}, ${plat} (lowercase+dash) and ${SIZE}, ${TYPE}, ${PLAT} (original)
          try {
            return urlTpl
              .replace(/\$\{size\}/g, size.toLowerCase().replace(/\s+/g,'-'))
              .replace(/\$\{type\}/g, type.toLowerCase().replace(/\s+/g,'-'))
              .replace(/\$\{plat\}/g, plat.toLowerCase().replace(/\s+/g,'-'))
              .replace(/\$\{SIZE\}/g, size)
              .replace(/\$\{TYPE\}/g, type)
              .replace(/\$\{PLAT\}/g, plat);
          } catch(e) { return urlTpl; }
        },
      });
    });

    // Rebuild achState for new firms
    CHECKOUT_FIRMS.forEach(f => {
      achState[f.id] = {};
      f.plans.forEach(p => {
        achState[f.id][p.size] = { type: f.types[0] || '', plat: f.platforms[0] || '' };
      });
    });

    // Re-render with live data
    renderHome();
    applyF();
    renderOffers();
    renderAwards();
    renderAchFirmTabs();
    if(CHECKOUT_FIRMS.length)achSelectFirm(CHECKOUT_FIRMS[0].id);
    initCmp();
  } catch(e) {
    // Supabase unavailable — hardcoded data still works
    console.warn('[MC] Supabase firms unavailable, using local data');
  }
}

function renderAchFirmTabs(){
  const el=document.getElementById('ach-firm-tabs');if(!el)return;
  el.innerHTML=CHECKOUT_FIRMS.map(f=>`<button class="ach-firm-tab${f.id===achActiveFirm?' active':''}" onclick="achSelectFirm('${f.id}')">${f.name}<span class="tab-disc">${f.discount}</span></button>`).join('');
}
function achSelectFirm(id){
  // Fallback: se a firma não existe no CHECKOUT_FIRMS, usa a primeira disponível
  const firmExists = CHECKOUT_FIRMS.find(f=>f.id===id);
  achActiveFirm = firmExists ? id : (CHECKOUT_FIRMS[0]?.id || id);
  renderAchFirmTabs();
  renderAchPlans();
  const firm=CHECKOUT_FIRMS.find(f=>f.id===achActiveFirm);if(!firm)return;
  const t=document.getElementById('ach-firm-title');if(t)t.textContent=firm.name;
  const strip=document.getElementById('ach-coupon-strip');
  if(strip){if(firm.coupon){strip.style.display='flex';const cd=document.getElementById('ach-code-display');if(cd)cd.textContent=firm.coupon;}else strip.style.display='none';}
}
function renderAchPlans(){
  const firm=CHECKOUT_FIRMS.find(f=>f.id===achActiveFirm);if(!firm)return;
  const g=document.getElementById('ach-plans-grid');if(!g)return;
  g.innerHTML=firm.plans.map(p=>{
    const state=(achState[firm.id]||{})[p.size]||{type:firm.types[0],plat:firm.platforms[0]};
    const sid=p.size.replace(/[^a-z0-9]/gi,'_');
    return`<div class="ach-card${p.featured?' featured':''}">
      <div class="ach-card-header">
        ${p.featured?'<div class="ach-featured-badge">Mais popular</div>':''}
        <div class="ach-plan-name">${p.size}</div>
        <div class="ach-plan-price"><strong>${p.disc}</strong> /mes ${p.orig!=='—'?`<del>${p.orig}</del>`:''}</div>
        <div class="ach-stats">
          <div class="ach-stat"><div class="ach-stat-lbl">Capital</div><div class="ach-stat-val">${p.capital}</div></div>
          <div class="ach-stat"><div class="ach-stat-lbl">Meta</div><div class="ach-stat-val">${p.goal}</div></div>
          <div class="ach-stat"><div class="ach-stat-lbl">Max DD</div><div class="ach-stat-val">${p.maxDD}</div></div>
          <div class="ach-stat"><div class="ach-stat-lbl">Desconto</div><div class="ach-stat-val" style="color:var(--gold);">${firm.discount}</div></div>
        </div>
      </div>
      <div class="ach-card-body">
        ${firm.types.length>1?`<div class="ach-sel-title">Tipo</div><div class="ach-type-row" id="tr-${firm.id}-${sid}">${firm.types.map(t=>`<button class="ach-type-btn${t===state.type?' sel':''}" onclick="achSelType('${firm.id}','${p.size}','${t}')">${t}</button>`).join('')}</div>`:''}
        <div class="ach-sel-title">Plataforma</div>
        <div class="ach-plat-row" id="pr-${firm.id}-${sid}">${firm.platforms.map(pl=>`<button class="ach-plat-btn${pl===state.plat?' sel':''}" onclick="achSelPlat('${firm.id}','${p.size}','${pl}')">${pl}</button>`).join('')}</div>
        <button class="ach-start-btn" onclick="achGoCheckout('${firm.id}','${p.size}')">Começar agora</button>
      </div>
    </div>`;
  }).join('');
  const inc=document.getElementById('ach-inc-grid');const incW=document.getElementById('ach-includes');
  if(inc&&incW){inc.innerHTML=firm.includes.map(i=>`<div class="ach-inc-item">${i}</div>`).join('');incW.style.display='block';}
}
function achSelType(fId,size,type){
  if(!achState[fId])achState[fId]={};
  if(!achState[fId][size])achState[fId][size]={type,plat:CHECKOUT_FIRMS.find(f=>f.id===fId)?.platforms[0]||''};
  achState[fId][size].type=type;
  const sid=size.replace(/[^a-z0-9]/gi,'_');
  document.getElementById('tr-'+fId+'-'+sid)?.querySelectorAll('.ach-type-btn').forEach(b=>b.classList.toggle('sel',b.textContent.trim()===type));
}
function achSelPlat(fId,size,plat){
  if(!achState[fId])achState[fId]={};
  if(!achState[fId][size])achState[fId][size]={type:CHECKOUT_FIRMS.find(f=>f.id===fId)?.types[0]||'',plat};
  achState[fId][size].plat=plat;
  const sid=size.replace(/[^a-z0-9]/gi,'_');
  document.getElementById('pr-'+fId+'-'+sid)?.querySelectorAll('.ach-plat-btn').forEach(b=>b.classList.toggle('sel',b.textContent.trim()===plat));
}
function achGoCheckout(fId,size){
  const firm=CHECKOUT_FIRMS.find(f=>f.id===fId);if(!firm)return;
  const state=(achState[fId]||{})[size]||{type:firm.types[0],plat:firm.platforms[0]};
  const {type,plat}=state;
  let url=firm.buildUrl(size,type,plat);
  url+=(url.includes('?')?'&':'?')+'utm_source=marketscoupons&utm_medium=checkout&utm_campaign='+fId+'_'+size.replace(/[^a-z0-9]/gi,'_').toLowerCase();
  track('checkout_click',{firm_id:fId,firm_name:firm.name,account_size:size,platform:plat,type,coupon:firm.coupon||'parceiro'});
  registerLoyaltyClick(size,plat,type,firm.name);
  window.open(url,'_blank');
}
function achCopyCoupon(){const firm=CHECKOUT_FIRMS.find(f=>f.id===achActiveFirm);if(!firm?.coupon)return;navigator.clipboard.writeText(firm.coupon).then(()=>{showToast('Codigo '+firm.coupon+' copiado!');track('coupon_copy',{coupon_code:firm.coupon,firm_id:achActiveFirm,location:'checkout_header'});if(window._dedicatedFirmSlug&&typeof fbq==='function')fbq('trackCustom','CopyCode',{firm:achActiveFirm,coupon:firm.coupon});});}

/* COMPARE */
function initCmp(){['c1','c2','c3'].forEach(id=>{const sel=document.getElementById(id);if(!sel)return;FIRMS.forEach(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=f.name;sel.appendChild(o);});});}
function renderCmp(){
  const ids=['c1','c2','c3'].map(id=>document.getElementById(id)?.value).filter(Boolean);
  const sel=ids.map(id=>FIRMS.find(f=>f.id===id)).filter(Boolean);
  const tbl=document.getElementById('cmp-tbl');
  const bannerEl=document.getElementById('cmp-winner-banner');
  if(!tbl)return;
  if(bannerEl) bannerEl.style.display='none';
  if(!sel.length){tbl.innerHTML=`<tr><td style="padding:40px;color:var(--t2);text-align:center;" colspan="4">${t('cmp_selecione_firma')}</td></tr>`;return;}

  const rows=[{l:t('cmp_row_tipo'),k:'type'},{l:t('cmp_row_desconto'),k:'discount',f:v=>v+'%',higher:true},{l:t('cmp_row_split'),k:'split',f:v=>v,higher:true},{l:t('cmp_row_drawdown'),k:'drawdown'},{l:t('cmp_row_ddmax'),k:'ddPct'},{l:t('cmp_row_meta'),k:'target'},{l:t('cmp_row_dias_min'),k:'minDays',f:v=>v+'d'},{l:t('cmp_row_prazo'),k:'evalDays',f:v=>v?v+'d':t('cmp_sem_limite')},{l:t('cmp_row_plataformas'),k:'platforms',f:v=>Array.isArray(v)?v.join(', '):(v||'—')},{l:t('cmp_row_rating'),k:'rating',higher:true},{l:t('cmp_row_reviews'),k:'reviews',f:v=>(v||0).toLocaleString(),higher:true},{l:t('cmp_row_cupom'),k:'coupon',f:v=>v||t('cmp_desconto_especial')}];

  // Determine winner: firm with most "best" values
  const scores = sel.map(()=>0);
  rows.forEach(r=>{
    if(!r.higher) return;
    const vals=sel.map(f=>parseFloat(String(f[r.k]||'0').replace('%','')));
    const maxV=Math.max(...vals);
    vals.forEach((v,i)=>{ if(v===maxV) scores[i]++; });
  });
  const maxScore=Math.max(...scores);
  const winnerIdx=scores.indexOf(maxScore);
  const winner=sel[winnerIdx];

  // Show winner banner
  if(sel.length>=2 && bannerEl && winner) {
    bannerEl.style.display='flex';
    bannerEl.innerHTML=`
      <div>
        <div class="cmp-winner-label">${t('cmp_melhor_mesa')}</div>
        <div class="cmp-winner-name" style="display:flex;align-items:center;gap:10px;color:${winner.color};">${firmIco(winner,'32px','13px')} ${winner.name}</div>
        <div class="cmp-winner-reason">${t('cmp_melhor_em')} ${maxScore} ${t('cmp_de')} ${rows.filter(r=>r.higher).length} ${t('cmp_criterios')}</div>
      </div>
      <div style="margin-left:auto;flex-shrink:0;">
        <button class="det-btn primary" onclick="openD('${winner.id}')">${t('cmp_ver_firma')} →</button>
      </div>`;
  }

  let html=`<thead><tr><th style="min-width:110px;">${t('cmp_criterio')}</th>${sel.map((f,i)=>`<th class="${i===winnerIdx&&sel.length>=2?'winner-col':''}" style="text-align:center;"><div style="display:flex;align-items:center;gap:8px;justify-content:center;">${firmIco(f,'28px','11px')}<span style="font-size:12px;font-weight:700;color:#fff;text-transform:none;letter-spacing:0;">${f.name}</span></div>${i===winnerIdx&&sel.length>=2?`<div style="font-size:9px;color:var(--green);margin-top:4px;font-weight:700;">${t('cmp_vencedor')}</div>`:''}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(r=>{
    const vals=sel.map(f=>f[r.k]);
    const nums=vals.map(v=>parseFloat(String(v||'0').replace('%',''))).filter(v=>!isNaN(v));
    const maxV=nums.length&&r.higher?Math.max(...nums):null;
    html+=`<tr><td class="rl">${r.l}</td>${vals.map((v,i)=>{
      const disp=r.f?r.f(v):(v||'—');
      const num=parseFloat(String(v||'0').replace('%',''));
      const isBest=maxV!==null&&num===maxV&&r.higher;
      const isWinner=i===winnerIdx&&sel.length>=2;
      return`<td class="cv${isBest?' best':''}${isWinner?' winner-col':''}">${disp}${isBest&&sel.length>=2?' ✓':''}</td>`;
    }).join('')}</tr>`;
  });
  tbl.innerHTML=html+'</tbody>';

  // Mobile cards
  const mobEl=document.getElementById('cmp-mobile');
  if(mobEl){
    let mhtml='';
    sel.forEach((f,i)=>{
      const isW=i===winnerIdx&&sel.length>=2;
      mhtml+=`<div class="cmp-mob-card${isW?' winner':''}">
        <div class="cmp-mob-hd">
          ${firmIco(f,'32px','13px')}
          <div><div class="cmp-mob-name">${f.name}</div>${isW?`<div class="cmp-mob-badge">${t('cmp_vencedor')}</div>`:''}</div>
        </div>
        <div class="cmp-mob-rows">${rows.map(r=>{
          const v=f[r.k];
          const disp=r.f?r.f(v):(v||'—');
          const num=parseFloat(String(v||'0').replace('%',''));
          const vals2=sel.map(ff=>parseFloat(String(ff[r.k]||'0').replace('%','')));
          const maxV2=r.higher?Math.max(...vals2):null;
          const isBest=maxV2!==null&&num===maxV2&&r.higher&&sel.length>=2;
          return`<div class="cmp-mob-row"><span class="cmp-mob-row-label">${r.l}</span><span class="cmp-mob-row-val${isBest?' best':''}">${disp}${isBest?' ✓':''}</span></div>`;
        }).join('')}</div>
      </div>`;
    });
    mobEl.innerHTML=mhtml;
  }
}

/* CALC */
async function unlockCalc(){
  const name=document.getElementById('cg-name').value.trim();
  const email=document.getElementById('cg-email').value.trim();
  if(!name||!email){showToast(t('calc_gate_preencha')||'Preencha nome e e-mail!');return;}
  try{await saveLead({name,email,tool:'calc'});}catch(e){}
  document.getElementById('calc-gate').style.display='none';
  document.getElementById('calc-content').style.display='block';
  track('calc_unlocked',{name,email});
}
function calcPS(){
  const bal=parseFloat(document.getElementById('ps-bal')?.value)||0;const risk=parseFloat(document.getElementById('ps-risk')?.value)||0;const ent=parseFloat(document.getElementById('ps-ent')?.value)||0;const sl=parseFloat(document.getElementById('ps-sl')?.value)||0;const tp=parseFloat(document.getElementById('ps-tp')?.value)||0;const mult=parseFloat(document.getElementById('ps-instr')?.value)||50;
  const riskD=bal*(risk/100);const slPts=Math.abs(ent-sl);const contracts=slPts>0?Math.floor(riskD/(slPts*mult)):0;const actRisk=contracts*slPts*mult;const tpPts=tp>0?Math.abs(tp-ent):0;const profit=contracts*tpPts*mult;const rr=tpPts>0&&slPts>0?(tpPts/slPts).toFixed(2):'—';
  document.getElementById('r-ct').textContent=contracts||'—';document.getElementById('r-rs').textContent=actRisk?'$'+actRisk.toFixed(0):'—';document.getElementById('r-rr').textContent=rr!=='—'?'1:'+rr:'—';document.getElementById('r-lp').textContent=profit?'$'+profit.toFixed(0):'—';
}

/* QUIZ */
let qA={},qStep=0;
function qa(btn,val){btn.closest('.q-opts').querySelectorAll('.q-opt').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');qA[qStep]=val;}
function qnext(n){document.getElementById('qs'+qStep).classList.remove('active');qStep=n;document.getElementById('qs'+n).classList.add('active');}
function qfinish(){
  setTimeout(()=>{
    document.getElementById('qs4').classList.remove('active');document.getElementById('qs-res').classList.add('active');
    const market=qA[0]||'futures';const priority=qA[4]||'discount';
    let rec;
    if(market==='forex')rec=FIRMS.find(f=>f.id==='ftmo');
    else if(priority==='discount'||priority==='speed')rec=FIRMS.find(f=>f.id==='bulenox');
    else if(priority==='split')rec=FIRMS.find(f=>f.id==='fn');
    else rec=FIRMS.find(f=>f.id==='tpt');
    if(!rec)rec=FIRMS[0];
    if(!rec)return;
    document.getElementById('q-res-content').innerHTML=`<div class="qr-title">${t('quiz_resultado_firma_ideal')} <span style="display:inline-flex;align-items:center;gap:8px;vertical-align:middle;color:${rec.color};">${firmIco(rec,'28px','11px')} ${rec.name}</span></div><div class="qr-desc">${(I18N[_currentLang]?.['firm_desc_'+rec.id]||I18N.pt['firm_desc_'+rec.id]||rec.desc||'')}</div><div style="display:flex;gap:12px;justify-content:center;margin-top:8px;width:100%;max-width:360px;margin-left:auto;margin-right:auto;"><a href="${rec.link}" target="_blank" style="text-decoration:none;display:flex;flex:1;"><button class="btn-gold" style="width:100%;white-space:nowrap;">${t('quiz_comecar_agora')}</button></a><button class="q-restart" style="flex:1;white-space:nowrap;" onclick="qreset()">${t('quiz_recomecar')}</button></div>`;
    track('quiz_complete',{recommended_firm:rec.id,market_pref:market,priority});
  },300);
}
function qreset(){qA={};qStep=0;renderQuiz();}

/* PLATAFORMAS DE TRADING */
const PLATFORMS_LANGS = {
  pt: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: 'img/Plataformas/tradingview.png', type: 'Gráficos & Análise',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'plano anual', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'A plataforma de gráficos mais usada do mundo. Acesso a dados de futuros, forex, ações e cripto. Indicadores profissionais, alertas e comunidade de traders. <strong style="color:var(--gold);">Receba $15 assim que você adquirir sua primeira assinatura.</strong>',
      features: ['Gráficos avançados','Indicadores personalizados','Alertas em tempo real','Scripts Pine','Screener de ativos','Dados de múltiplos mercados'],
      highlight: true, badge: '17% OFF Anual',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: 'img/Plataformas/rithmic.png', type: 'Execução de Ordens',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Feed de dados e execução de ordens de baixa latência para futuros. Padrão da indústria de prop firms (Apex, Bulenox, E2T).',
      features: ['Ultra baixa latência','Dados CME/CBOT/NYMEX','Order Routing','API para automação','Suporte 24/7'],
      highlight: false, badge: 'Padrão Prop Firms',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: 'img/Plataformas/ninjatrader.png', type: 'Plataforma de Trading',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Plataforma gratuita para futuros com backtesting avançado, automação e marketplace de indicadores. Aceita pela maioria das prop firms.',
      features: ['Grátis para dados EOD','Backtesting avançado','Automação (NinjaScript)','Marketplace indicadores','Multi-broker'],
      highlight: false, badge: 'Grátis disponível',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: 'img/Plataformas/tradovate.png', type: 'Plataforma de Trading',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Plataforma baseada em nuvem para futuros. Excelente interface, dados integrados e suporte a múltiplos dispositivos.',
      features: ['Baseado em nuvem','Interface moderna','Dados integrados','Mobile app','DOM avançado'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: 'img/Plataformas/mt5.png', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Plataforma padrão do mercado Forex. Indicadores técnicos, EAs, backtesting e suporte à maioria das prop firms de Forex.',
      features: ['100+ indicadores','Expert Advisors (EAs)','Strategy Tester','Múltiplos brokers','Mobile app'],
      highlight: false, badge: 'Padrão Forex',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: 'img/Plataformas/wealthcharts.png', type: 'Gráficos & Análise',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Plataforma de gráficos e análise usada pela Apex Trader Funding. Copy trading, indicadores de order flow e análise de mercado.',
      features: ['Copy Trading Apex','Order Flow','Market Analysis','Indicadores premium','Integração Apex'],
      highlight: false, badge: 'Parceira Apex',
    },
  ],
  en: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: 'img/Plataformas/tradingview.png', type: 'Charts & Analysis',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'annual plan', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'The world\'s most used charting platform. Access to futures, forex, stocks and crypto data. Professional indicators, alerts and trader community. <strong style="color:var(--gold);">Receive $15 when you get your first subscription.</strong>',
      features: ['Advanced charts','Custom indicators','Real-time alerts','Pine Scripts','Asset screener','Multi-market data'],
      highlight: true, badge: '17% OFF Annual',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: 'img/Plataformas/rithmic.png', type: 'Order Execution',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Low-latency data feed and order execution for futures. Industry standard for prop firms (Apex, Bulenox, E2T).',
      features: ['Ultra-low latency','CME/CBOT/NYMEX data','Order Routing','Automation API','24/7 support'],
      highlight: false, badge: 'Prop Firms Standard',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: 'img/Plataformas/ninjatrader.png', type: 'Trading Platform',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Free futures platform with advanced backtesting, automation and indicators marketplace. Accepted by most prop firms.',
      features: ['Free for EOD data','Advanced backtesting','Automation (NinjaScript)','Indicators marketplace','Multi-broker'],
      highlight: false, badge: 'Free available',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: 'img/Plataformas/tradovate.png', type: 'Trading Platform',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Cloud-based futures platform. Excellent interface, integrated data and multi-device support.',
      features: ['Cloud-based','Modern interface','Integrated data','Mobile app','Advanced DOM'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: 'img/Plataformas/mt5.png', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Standard Forex market platform. Technical indicators, EAs, backtesting and support for most Forex prop firms.',
      features: ['100+ indicators','Expert Advisors (EAs)','Strategy Tester','Multiple brokers','Mobile app'],
      highlight: false, badge: 'Forex Standard',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: 'img/Plataformas/wealthcharts.png', type: 'Charts & Analysis',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Charting and analysis platform used by Apex Trader Funding. Copy trading, order flow indicators and market analysis.',
      features: ['Copy Trading Apex','Order Flow','Market Analysis','Premium indicators','Apex integration'],
      highlight: false, badge: 'Apex Partner',
    },
  ],
  es: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: 'img/Plataformas/tradingview.png', type: 'Gráficos & Análisis',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'plan anual', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'La plataforma de gráficos más usada del mundo. Acceso a datos de futuros, forex, acciones y cripto. <strong style="color:var(--gold);">Recibe $15 al contratar tu primera suscripción.</strong>',
      features: ['Gráficos avanzados','Indicadores personalizados','Alertas en tiempo real','Scripts Pine','Screener de activos','Datos multi-mercado'],
      highlight: true, badge: '17% OFF Anual',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: 'img/Plataformas/rithmic.png', type: 'Ejecución de Órdenes',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Feed de datos y ejecución de órdenes de baja latencia para futuros. Estándar de la industria de prop firms.',
      features: ['Ultra baja latencia','Datos CME/CBOT/NYMEX','Order Routing','API para automatización','Soporte 24/7'],
      highlight: false, badge: 'Estándar Prop Firms',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: 'img/Plataformas/ninjatrader.png', type: 'Plataforma de Trading',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Plataforma gratuita para futuros con backtesting avanzado, automatización y marketplace de indicadores.',
      features: ['Gratis para datos EOD','Backtesting avanzado','Automatización (NinjaScript)','Marketplace indicadores','Multi-broker'],
      highlight: false, badge: 'Gratis disponible',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: 'img/Plataformas/tradovate.png', type: 'Plataforma de Trading',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Plataforma en la nube para futuros. Excelente interfaz, datos integrados y soporte multi-dispositivo.',
      features: ['Basado en la nube','Interfaz moderna','Datos integrados','App móvil','DOM avanzado'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: 'img/Plataformas/mt5.png', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Plataforma estándar del mercado Forex. Indicadores técnicos, EAs, backtesting y soporte para prop firms de Forex.',
      features: ['100+ indicadores','Expert Advisors (EAs)','Strategy Tester','Múltiples brokers','App móvil'],
      highlight: false, badge: 'Estándar Forex',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: 'img/Plataformas/wealthcharts.png', type: 'Gráficos & Análisis',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Plataforma de gráficos y análisis usada por Apex. Copy trading, indicadores de order flow y análisis de mercado.',
      features: ['Copy Trading Apex','Order Flow','Análisis de mercado','Indicadores premium','Integración Apex'],
      highlight: false, badge: 'Socia de Apex',
    },
  ],
  it: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: 'img/Plataformas/tradingview.png', type: 'Grafici & Analisi',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'piano annuale', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'La piattaforma di grafici più usata al mondo. Accesso a dati futures, forex, azioni e cripto. <strong style="color:var(--gold);">Ricevi $15 con il tuo primo abbonamento.</strong>',
      features: ['Grafici avanzati','Indicatori personalizzati','Avvisi in tempo reale','Script Pine','Screener di attivi','Dati multi-mercato'],
      highlight: true, badge: '17% OFF Annuale',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: 'img/Plataformas/rithmic.png', type: 'Esecuzione Ordini',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Feed dati ed esecuzione ordini a bassa latenza per futures. Standard del settore prop firm.',
      features: ['Latenza ultra-bassa','Dati CME/CBOT/NYMEX','Order Routing','API automazione','Supporto 24/7'],
      highlight: false, badge: 'Standard Prop Firms',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: 'img/Plataformas/ninjatrader.png', type: 'Piattaforma di Trading',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Piattaforma gratuita per futures con backtesting avanzato, automazione e marketplace di indicatori.',
      features: ['Gratis per dati EOD','Backtesting avanzato','Automazione (NinjaScript)','Marketplace indicatori','Multi-broker'],
      highlight: false, badge: 'Gratis disponibile',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: 'img/Plataformas/tradovate.png', type: 'Piattaforma di Trading',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Piattaforma cloud per futures. Eccellente interfaccia, dati integrati e supporto multi-dispositivo.',
      features: ['Basato su cloud','Interfaccia moderna','Dati integrati','App mobile','DOM avanzato'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: 'img/Plataformas/mt5.png', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Piattaforma standard del mercato Forex. Indicatori tecnici, EA, backtesting e supporto per prop firm Forex.',
      features: ['100+ indicatori','Expert Advisors (EAs)','Strategy Tester','Più broker','App mobile'],
      highlight: false, badge: 'Standard Forex',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: 'img/Plataformas/wealthcharts.png', type: 'Grafici & Analisi',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Piattaforma di grafici e analisi usata da Apex. Copy trading, indicatori di order flow e analisi di mercato.',
      features: ['Copy Trading Apex','Order Flow','Analisi di mercato','Indicatori premium','Integrazione Apex'],
      highlight: false, badge: 'Partner Apex',
    },
  ],
  fr: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: 'img/Plataformas/tradingview.png', type: 'Graphiques & Analyse',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'plan annuel', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'La plateforme de graphiques la plus utilisée au monde. Accès aux données futures, forex, actions et crypto. <strong style="color:var(--gold);">Recevez 15$ avec votre premier abonnement.</strong>',
      features: ['Graphiques avancés','Indicateurs personnalisés','Alertes en temps réel','Scripts Pine','Screener d\'actifs','Données multi-marchés'],
      highlight: true, badge: '17% OFF Annuel',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: 'img/Plataformas/rithmic.png', type: 'Exécution d\'Ordres',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Flux de données et exécution d\'ordres à faible latence pour les futures. Standard de l\'industrie des prop firms.',
      features: ['Ultra faible latence','Données CME/CBOT/NYMEX','Order Routing','API d\'automatisation','Support 24/7'],
      highlight: false, badge: 'Standard Prop Firms',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: 'img/Plataformas/ninjatrader.png', type: 'Plateforme de Trading',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Plateforme gratuite pour les futures avec backtesting avancé, automatisation et marketplace d\'indicateurs.',
      features: ['Gratuit pour données EOD','Backtesting avancé','Automatisation (NinjaScript)','Marketplace indicateurs','Multi-broker'],
      highlight: false, badge: 'Gratuit disponible',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: 'img/Plataformas/tradovate.png', type: 'Plateforme de Trading',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Plateforme cloud pour les futures. Excellente interface, données intégrées et support multi-appareils.',
      features: ['Basé sur le cloud','Interface moderne','Données intégrées','App mobile','DOM avancé'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: 'img/Plataformas/mt5.png', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Plateforme standard du marché Forex. Indicateurs techniques, EAs, backtesting et support pour les prop firms Forex.',
      features: ['100+ indicateurs','Expert Advisors (EAs)','Strategy Tester','Plusieurs courtiers','App mobile'],
      highlight: false, badge: 'Standard Forex',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: 'img/Plataformas/wealthcharts.png', type: 'Graphiques & Analyse',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Plateforme de graphiques et d\'analyse utilisée par Apex. Copy trading, indicateurs de flux d\'ordres et analyse de marché.',
      features: ['Copy Trading Apex','Order Flow','Analyse de marché','Indicateurs premium','Intégration Apex'],
      highlight: false, badge: 'Partenaire Apex',
    },
  ],
  de: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: 'img/Plataformas/tradingview.png', type: 'Charts & Analyse',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'Jahresplan', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'Die weltweit meistgenutzte Charting-Plattform. Zugang zu Futures-, Forex-, Aktien- und Krypto-Daten. <strong style="color:var(--gold);">Erhalte $15 mit deinem ersten Abonnement.</strong>',
      features: ['Erweiterte Charts','Benutzerdefinierte Indikatoren','Echtzeit-Benachrichtigungen','Pine Scripts','Asset Screener','Multi-Markt-Daten'],
      highlight: true, badge: '17% RABATT Jährlich',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: 'img/Plataformas/rithmic.png', type: 'Orderausführung',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Niedriglatenz-Datenfeed und Orderausführung für Futures. Branchenstandard für Prop Firms.',
      features: ['Ultra-niedrige Latenz','CME/CBOT/NYMEX-Daten','Order Routing','Automatisierungs-API','24/7 Support'],
      highlight: false, badge: 'Prop Firms Standard',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: 'img/Plataformas/ninjatrader.png', type: 'Trading-Plattform',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Kostenlose Futures-Plattform mit erweitertem Backtesting, Automatisierung und Indikator-Marktplatz.',
      features: ['Kostenlos für EOD-Daten','Erweitertes Backtesting','Automatisierung (NinjaScript)','Indikator-Marktplatz','Multi-broker'],
      highlight: false, badge: 'Kostenlos verfügbar',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: 'img/Plataformas/tradovate.png', type: 'Trading-Plattform',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Cloud-basierte Futures-Plattform. Exzellente Benutzeroberfläche, integrierte Daten und Multi-Device-Support.',
      features: ['Cloud-basiert','Moderne Oberfläche','Integrierte Daten','Mobile App','Erweitertes DOM'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: 'img/Plataformas/mt5.png', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Standard-Forex-Marktplattform. Technische Indikatoren, EAs, Backtesting und Unterstützung für Forex-Prop-Firms.',
      features: ['100+ Indikatoren','Expert Advisors (EAs)','Strategy Tester','Mehrere Broker','Mobile App'],
      highlight: false, badge: 'Forex-Standard',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: 'img/Plataformas/wealthcharts.png', type: 'Charts & Analyse',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Chart- und Analyseplattform von Apex Trader Funding. Copy Trading, Order-Flow-Indikatoren und Marktanalyse.',
      features: ['Copy Trading Apex','Order Flow','Marktanalyse','Premium-Indikatoren','Apex-Integration'],
      highlight: false, badge: 'Apex-Partner',
    },
  ],
  ar: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: 'img/Plataformas/tradingview.png', type: 'الرسوم البيانية والتحليل',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'خطة سنوية', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'منصة الرسوم البيانية الأكثر استخداماً في العالم. وصول لبيانات العقود الآجلة والفوركس والأسهم والكريبتو. <strong style="color:var(--gold);">احصل على $15 مع أول اشتراك.</strong>',
      features: ['رسوم بيانية متقدمة','مؤشرات مخصصة','تنبيهات فورية','نصوص Pine','فاحص الأصول','بيانات متعددة الأسواق'],
      highlight: true, badge: '17% خصم سنوي',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: 'img/Plataformas/rithmic.png', type: 'تنفيذ الأوامر',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'تغذية بيانات وتنفيذ أوامر منخفض الكمون للعقود الآجلة. معيار صناعة شركات Prop.',
      features: ['كمون منخفض جداً','بيانات CME/CBOT/NYMEX','توجيه الأوامر','واجهة برمجية للأتمتة','دعم 24/7'],
      highlight: false, badge: 'معيار Prop Firms',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: 'img/Plataformas/ninjatrader.png', type: 'منصة تداول',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'منصة مجانية للعقود الآجلة مع اختبار متقدم وأتمتة وسوق مؤشرات.',
      features: ['مجاني لبيانات EOD','اختبار متقدم','أتمتة (NinjaScript)','سوق المؤشرات','متعدد الوسطاء'],
      highlight: false, badge: 'متاح مجاناً',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: 'img/Plataformas/tradovate.png', type: 'منصة تداول',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'منصة سحابية للعقود الآجلة. واجهة ممتازة وبيانات متكاملة ودعم متعدد الأجهزة.',
      features: ['قائم على السحابة','واجهة حديثة','بيانات متكاملة','تطبيق موبايل','DOM متقدم'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: 'img/Plataformas/mt5.png', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'منصة السوق الفوركسي القياسية. مؤشرات تقنية وEAs واختبار وسطاء Prop Forex.',
      features: ['100+ مؤشر','مستشارو الخبراء (EAs)','Strategy Tester','وسطاء متعددون','تطبيق موبايل'],
      highlight: false, badge: 'معيار فوركس',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: 'img/Plataformas/wealthcharts.png', type: 'الرسوم البيانية والتحليل',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'منصة رسوم بيانية وتحليل تستخدمها Apex. تداول نسخ ومؤشرات تدفق الأوامر وتحليل السوق.',
      features: ['Copy Trading Apex','تدفق الأوامر','تحليل السوق','مؤشرات متميزة','تكامل Apex'],
      highlight: false, badge: 'شريك Apex',
    },
  ],
};
function getPlatforms() { return PLATFORMS_LANGS[_currentLang] || PLATFORMS_LANGS.pt; }

function renderPlatforms() {
  const g = document.getElementById('plat-grid');
  if (!g) return;
  g.innerHTML = getPlatforms().map(p => `
    <div class="plat-card${p.highlight?' plat-card-featured':''}">
      ${p.highlight ? `<div class="plat-banner"><span class="plat-banner-text">${t('plat_oferta_excl')} — ${p.discount}% OFF</span></div>` : ''}
      <div class="plat-card-top">
        <div class="plat-logo" style="background:${p.bg};color:${p.color};">${p.icon_url?`<img src="${p.icon_url}" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;">`:p.icon}</div>
        <div>
          <div class="plat-name">${p.name}</div>
          <div class="plat-type">${p.type}</div>
        </div>
        ${p.discount > 0 ? `<div class="plat-badge" style="background:rgba(240,180,41,.06);color:var(--gold);border:1px solid rgba(240,180,41,.15);">${p.discount}% OFF</div>` : p.badge ? `<div class="plat-badge" style="background:${p.bg};color:${p.color};border:1px solid ${p.color}30;">${p.badge}</div>` : ''}
      </div>
      <div class="plat-body">
        <div class="plat-sec-label">SOBRE</div>
        <p class="plat-desc">${p.desc}</p>
        <div class="plat-sec-label">RECURSOS</div>
        <div class="plat-feats">
          ${p.features.map(f => `<div class="plat-feat"><span class="plat-feat-dot" style="background:${p.color};box-shadow:0 0 8px ${p.color}40;"></span>${f}</div>`).join('')}
        </div>
        <div class="plat-cta">
          ${PLAT_DETAIL[p.id] ? `<button class="plat-go" onclick="if(window.innerWidth>=769){openPD('${p.id}')}else{openPDMobile('${p.id}')}">${t('pd_ver_planos')} ${p.name} →</button>` : `<a href="${p.link}" target="_blank" style="text-decoration:none;display:block;" onclick="track('platform_click',{platform:'${p.id}',discount:${p.discount}})">
            <button class="plat-go">${p.discount > 0 ? `${t('plat_acessar_com')} ${p.discount}% OFF →` : `${t('plat_acessar')} ${p.name} →`}</button>
          </a>`}
        </div>
      </div>
    </div>`).join('');
}

/* HEATMAP */
function loadHeatmap(source, btn) {
  document.querySelectorAll('#page-heatmap .cal-f').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const titles = {SPX500:t('hm_sp500'),NASDAQ100:t('hm_nasdaq100'),WORLD:t('hm_global'),CRYPTO:t('hm_cripto')};
  const titleEl = document.querySelector('.heatmap-title');
  if (titleEl) titleEl.innerHTML = '<span>' + t('hm_mapa_calor') + '</span> ' + (titles[source]||source);
  const tvLocale = {pt:'br',en:'en',es:'es',it:'it',fr:'fr',de:'de',ar:'en'}[_currentLang]||'en';
  const base = source === 'CRYPTO'
    ? `https://www.tradingview.com/embed-widget/crypto-coins-heatmap/?locale=${tvLocale}#`
    : `https://www.tradingview.com/embed-widget/stock-heatmap/?locale=${tvLocale}#`;
  const grouping = source === 'WORLD' ? 'country' : source === 'CRYPTO' ? 'no_group' : 'sector';
  const cfg = encodeURIComponent(JSON.stringify({
    dataSource: source, blockColor:'change', blockSize:'market_cap_basic',
    grouping, locale:tvLocale, colorTheme:'dark', hasTopBar:true,
    isDataSetEnabled:true, isZoomEnabled:true, hasSymbolTooltip:true,
    width:'100%', height:'100%'
  }));
  const frame = document.getElementById('heatmap-frame');
  if (frame) {
    frame.dataset.source = source;
    frame.src = 'about:blank';
    setTimeout(() => { frame.src = base + cfg; }, 50);
  }
}

/* CALENDÁRIO ECONÔMICO */
const CUR_COLORS = {
  USD:{bg:'rgba(59,130,246,.15)',c:'#60a5fa'},
  EUR:{bg:'rgba(34,197,94,.15)',c:'#22c55e'},
  GBP:{bg:'rgba(168,85,247,.15)',c:'#a78bfa'},
  CAD:{bg:'rgba(249,115,22,.15)',c:'#F97316'},
  AUD:{bg:'rgba(6,182,212,.15)',c:'#06b6d4'},
  JPY:{bg:'rgba(240,180,41,.15)',c:'var(--gold)'},
  BRL:{bg:'rgba(34,197,94,.15)',c:'#22c55e'},
  CNY:{bg:'rgba(239,68,68,.15)',c:'#ef4444'},
  CHF:{bg:'rgba(239,68,68,.15)',c:'#ef4444'},
  NZD:{bg:'rgba(6,182,212,.15)',c:'#06b6d4'},
};
const COUNTRY_CUR = {US:'USD',EU:'EUR',GB:'GBP',CA:'CAD',AU:'AUD',JP:'JPY',BR:'BRL',CN:'CNY',CH:'CHF',NZ:'NZD',DE:'EUR',FR:'EUR',IT:'EUR',ES:'EUR'};

let calActiveFilter = 'all';
let calEvents = [];

function calFilter(filter, btn) {
  calActiveFilter = filter;
  document.querySelectorAll('.cal-f').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCal();
}

async function loadCalendar() {
  const el = document.getElementById('cal-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--t2);"><div class="ar-spinner" style="width:24px;height:24px;border:2px solid rgba(255,255,255,.06);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px;"></div></div>';

  const today = new Date();
  const from = today.toISOString().slice(0,10);
  const toDate = new Date(today); toDate.setDate(toDate.getDate()+7);
  const to = toDate.toISOString().slice(0,10);
  const todayStr = from;
  const tmrDate = new Date(today); tmrDate.setDate(tmrDate.getDate()+1);
  const tmrStr = tmrDate.toISOString().slice(0,10);

  try {
    const FMP_KEY = 'demo';
    const res = await fetch(`https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${FMP_KEY}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No data');

    calEvents = data.map(ev => {
      const cc = ev.country || '';
      const cur = COUNTRY_CUR[cc] || cc;
      const dateStr = (ev.date||'').slice(0,10);
      const timeStr = (ev.date||'').slice(11,16) || '—';
      let day = 'Semana';
      if (dateStr === todayStr) day = 'Hoje';
      else if (dateStr === tmrStr) day = 'Amanhã';
      const chg = ev.changePercentage;
      let imp = 'l';
      if (ev.impact === 'High' || ev.impact === 3) imp = 'h';
      else if (ev.impact === 'Medium' || ev.impact === 2) imp = 'm';
      else if (ev.impact === 'Low' || ev.impact === 1) imp = 'l';
      return {
        day, t: timeStr, cur, ev: ev.event||'',
        actual: ev.actual != null ? String(ev.actual) : '—',
        fore: ev.estimate != null ? String(ev.estimate) : (ev.forecast != null ? String(ev.forecast) : '—'),
        prev: ev.previous != null ? String(ev.previous) : '—',
        imp, date: ev.date||'', dateStr
      };
    }).sort((a,b) => a.date.localeCompare(b.date));
  } catch(e) {
    console.warn('Calendar API fallback:', e);
    calEvents = [
      {day:'Hoje',t:'08:30',cur:'USD',ev:'Jobless Claims',actual:'—',prev:'222K',fore:'215K',imp:'h',dateStr:todayStr},
      {day:'Hoje',t:'09:45',cur:'USD',ev:'S&P Global Manufacturing PMI',actual:'—',prev:'50.2',fore:'50.5',imp:'m',dateStr:todayStr},
      {day:'Hoje',t:'10:00',cur:'USD',ev:'ISM Services PMI',actual:'—',prev:'53.5',fore:'53.0',imp:'h',dateStr:todayStr},
      {day:'Hoje',t:'11:00',cur:'EUR',ev:'ECB Lagarde Speech',actual:'—',prev:'—',fore:'—',imp:'h',dateStr:todayStr},
      {day:'Hoje',t:'14:30',cur:'CAD',ev:'Employment Change',actual:'—',prev:'+37.3K',fore:'+20K',imp:'m',dateStr:todayStr},
      {day:'Amanhã',t:'08:30',cur:'USD',ev:'Non-Farm Payrolls',actual:'—',prev:'275K',fore:'200K',imp:'h',dateStr:tmrStr},
      {day:'Amanhã',t:'08:30',cur:'USD',ev:'Unemployment Rate',actual:'—',prev:'3.7%',fore:'3.8%',imp:'h',dateStr:tmrStr},
      {day:'Amanhã',t:'10:00',cur:'USD',ev:'Fed Chair Powell Speech',actual:'—',prev:'—',fore:'—',imp:'h',dateStr:tmrStr},
      {day:'Semana',t:'08:00',cur:'EUR',ev:'ECB Interest Rate Decision',actual:'—',prev:'4.50%',fore:'4.25%',imp:'h',dateStr:to},
      {day:'Semana',t:'20:00',cur:'USD',ev:'FOMC Meeting Minutes',actual:'—',prev:'—',fore:'—',imp:'h',dateStr:to},
      {day:'Semana',t:'12:30',cur:'USD',ev:'Core PCE Price Index m/m',actual:'—',prev:'0.4%',fore:'0.3%',imp:'h',dateStr:to},
      {day:'Semana',t:'10:00',cur:'USD',ev:'Consumer Confidence',actual:'—',prev:'104.7',fore:'106.0',imp:'m',dateStr:to},
    ];
  }
  renderCal();
}

function renderCal() {
  const el = document.getElementById('cal-list');
  if (!el) return;
  let events = calEvents;
  if (calActiveFilter === 'h') events = events.filter(e => e.imp === 'h');
  else if (calActiveFilter !== 'all') events = events.filter(e => e.cur === calActiveFilter);

  if (!events.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--t2);font-size:13px;">${t('cal_sem_eventos')}</div>`;
    return;
  }

  const groups = {};
  events.forEach(e => { if (!groups[e.day]) groups[e.day] = []; groups[e.day].push(e); });
  const order = ['Hoje','Amanhã','Semana'];

  el.innerHTML = order.filter(d => groups[d]?.length).map(day => `
    <div class="cal-date-group">
      <div class="cal-date-label">${day === 'Hoje' ? t('cal_hoje') : day === 'Amanhã' ? t('cal_amanha') : t('cal_esta_semana')}</div>
      ${groups[day].map(e => {
        const cc = CUR_COLORS[e.cur] || {bg:'rgba(74,85,104,.2)',c:'var(--t2)'};
        const actColor = e.actual !== '—' ? (parseFloat(e.actual) > parseFloat(e.fore) ? 'var(--green)' : parseFloat(e.actual) < parseFloat(e.fore) ? 'var(--red)' : '#fff') : 'var(--t2)';
        return `<div class="cal-item">
          <div class="cal-time">${e.t} <span style="font-size:10px;color:var(--t3);">ET</span></div>
          <div><span class="cal-cur-badge" style="background:${cc.bg};color:${cc.c};">${e.cur}</span></div>
          <div><div class="cal-ev-name">${e.ev}</div></div>
          <div class="cal-act-wrap"><div class="cal-val" style="color:${actColor};font-weight:700;">${e.actual}</div></div>
          <div class="cal-fore-wrap"><div class="cal-val" style="color:var(--gold);">${e.fore}</div></div>
          <div class="cal-prev-wrap"><div class="cal-val">${e.prev}</div></div>
          <div class="imp ${e.imp}" title="${e.imp==='h'?t('cal_alto_impacto'):e.imp==='m'?t('cal_medio_impacto'):t('cal_baixo_impacto')}"></div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

/* ANÁLISE DE MERCADO IA */

/* ─── DAILY ANALYSIS ─── */
const DA_ASSETS={NQ:{name:'Nasdaq 100',tv:'OANDA:NAS100USD'},ES:{name:'S&P 500',tv:'OANDA:SPX500USD'},CL:{name:'Petróleo WTI',tv:'TVC:USOIL'},GC:{name:'Ouro',tv:'TVC:GOLD'}};

async function loadDailyAnalysis(){
  const grid=document.getElementById('da-grid');if(!grid)return;
  try{
    const{data,error}=await db.from('daily_analysis').select('*').eq('date',new Date().toISOString().slice(0,10)).order('asset');
    if(error)throw error;
    if(!data||data.length===0){
      // Tenta o dia anterior (fim de semana ou análise ainda não gerada)
      const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
      const{data:d2}=await db.from('daily_analysis').select('*').eq('date',yesterday.toISOString().slice(0,10)).order('asset');
      if(d2&&d2.length>0) return renderDailyCards(d2);
      // Tenta a mais recente disponível
      const{data:d3}=await db.from('daily_analysis').select('*').order('date',{ascending:false}).limit(4);
      if(d3&&d3.length>0) return renderDailyCards(d3);
      grid.innerHTML=`<div class="da-loading" style="grid-column:1/-1;"><div style="font-size:14px;color:var(--t2);font-weight:600;" data-i18n="da_sem_analise">${t('da_sem_analise')}</div><div style="font-size:12px;color:var(--t3);margin-top:6px;" data-i18n="da_primeira_6h">${t('da_primeira_6h')}</div></div>`;
      return;
    }
    renderDailyCards(data);
  }catch(e){
    grid.innerHTML=`<div class="da-loading" style="grid-column:1/-1;"><div style="color:var(--t3);">${t('da_erro')}</div></div>`;
  }
}

async function checkAnalysisGate(){
  const wrap=document.getElementById('da-wrap-inner');
  const gate=document.getElementById('da-gate');
  if(!wrap||!gate)return;

  // Não logado → gate de login
  if(!currentUser||!currentProfile){
    wrap.classList.add('da-wrap-gated');
    gate.innerHTML=`<div class="da-gate-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
      <div class="da-gate-title">${t('da_gate_title_login')}</div>
      <div class="da-gate-text">${t('da_gate_text_login')}</div>
      <button class="da-gate-btn" onclick="openAuthModal('signup')">${t('da_gate_btn_login')}</button>`;
    return;
  }

  // VIP (admin liberou) → acesso total
  if(currentProfile.analysis_vip===true) {
    wrap.classList.remove('da-wrap-gated');
    gate.innerHTML='';
    return;
  }

  // Trial: 3 dias após criação da conta
  const createdAt=new Date(currentProfile.created_at||currentUser.created_at);
  const now=new Date();
  const diffDays=Math.floor((now-createdAt)/(1000*60*60*24));
  if(diffDays<3){
    wrap.classList.remove('da-wrap-gated');
    gate.innerHTML='';
    // Mostrar badge de trial
    const meta=document.getElementById('da-meta');
    if(meta){
      const remaining=3-diffDays;
      const trialText=t('da_gate_trial').replace('{days}',remaining);
      if(!meta.querySelector('.da-trial-badge')){
        meta.insertAdjacentHTML('beforeend',`<span class="da-trial-badge" style="margin-left:12px;font-size:11px;color:var(--gold);background:rgba(240,180,41,.1);padding:3px 10px;border-radius:20px;">${trialText}</span>`);
      }
    }
    return;
  }

  // Fidelidade: tem comprovante aprovado
  try{
    const email=currentProfile.email||currentUser.email;
    const{data}=await db.from('loyalty_proofs').select('id').eq('member_email',email).eq('status','approved').limit(1);
    if(data&&data.length>0){
      wrap.classList.remove('da-wrap-gated');
      gate.innerHTML='';
      return;
    }
  }catch(e){}

  // Sem acesso → gate de fidelidade
  wrap.classList.add('da-wrap-gated');
  gate.innerHTML=`<div class="da-gate-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
    <div class="da-gate-title">${t('da_gate_title_expired')}</div>
    <div class="da-gate-text">${t('da_gate_text_expired')}</div>
    <button class="da-gate-btn" onclick="go('fidelidade')">${t('da_gate_btn_loyalty')}</button>`;
}

function daT(v){if(!v)return'';if(typeof v==='string')return v;return v[_currentLang]||v.pt||v.en||Object.values(v)[0]||'';}

function renderDailyCards(items){
  const grid=document.getElementById('da-grid');if(!grid)return;
  const meta=document.getElementById('da-meta');
  if(meta&&items[0]){
    const d=new Date(items[0].date+'T12:00:00');
    const dateStr=d.toLocaleDateString(_currentLang==='pt'?'pt-BR':_currentLang,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    meta.innerHTML=`<span><span class="analise-meta-dot"></span> ${t('da_atualizado')} ${dateStr}</span>`;
  }
  const tvTheme='dark';
  grid.innerHTML=items.map(a=>{
    const info=DA_ASSETS[a.asset]||{name:a.asset_name,tv:''};
    const biasClass=a.bias;
    const biasLabel=a.bias==='bullish'?t('da_bullish'):a.bias==='bearish'?t('da_bearish'):t('da_neutro');
    const chgClass=a.change_pct>0?'up':a.change_pct<0?'down':'flat';
    const chgSign=a.change_pct>0?'+':'';
    const confDots=Array.from({length:5},(_, i)=>`<span class="da-conf-dot${i<a.confidence?' on':''}"></span>`).join('');
    return`<div class="da-card">
      <div class="da-card-head">
        <div class="da-asset"><div><div class="da-ticker">${a.asset}</div><div class="da-name">${info.name}</div></div></div>
        <div class="da-price-wrap">
          ${a.last_price?`<div class="da-price">${Number(a.last_price).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>`:''}
          ${a.change_pct!=null?`<div class="da-change ${chgClass}">${chgSign}${Number(a.change_pct).toFixed(2)}%</div>`:''}
        </div>
      </div>
      <div class="da-bias-bar">
        <span class="da-bias-pill ${biasClass}">${biasLabel}</span>
        <div class="da-confidence">${confDots}</div>
      </div>
      <div class="da-chart"><iframe src="https://s.tradingview.com/widgetembed/?frameElementId=da_${a.asset}&symbol=${info.tv}&interval=60&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=0a0e17&studies=[]&theme=${tvTheme}&style=1&timezone=America%2FSao_Paulo&withdateranges=0&hideideas=1&overrides=%7B%7D&utm_source=marketscoupons.com" allowtransparency="true" frameborder="0" allowfullscreen loading="lazy"></iframe></div>
      <div class="da-body">
        <div class="da-levels">
          <div class="da-lvl"><div class="da-lvl-label">${t('da_suporte')} 1</div><div class="da-lvl-val support">${a.support_1||'—'}</div></div>
          <div class="da-lvl"><div class="da-lvl-label">${t('da_resistencia')} 1</div><div class="da-lvl-val resistance">${a.resistance_1||'—'}</div></div>
          <div class="da-lvl"><div class="da-lvl-label">${t('da_suporte')} 2</div><div class="da-lvl-val support">${a.support_2||'—'}</div></div>
          <div class="da-lvl"><div class="da-lvl-label">${t('da_resistencia')} 2</div><div class="da-lvl-val resistance">${a.resistance_2||'—'}</div></div>
          ${a.attention_zone?`<div class="da-lvl" style="grid-column:1/-1;"><div class="da-lvl-label">${t('da_zona_atencao')}</div><div class="da-lvl-val zone">${daT(a.attention_zone)}</div></div>`:''}
        </div>
        <div class="da-context">${daT(a.context)}</div>
        ${a.volume_analysis?`<div class="da-section vol"><div class="da-section-label">${t('da_volume')}</div><div class="da-section-text">${daT(a.volume_analysis)}</div></div>`:''}
        ${a.scenario_bull?`<div class="da-section bull"><div class="da-section-label">${t('da_cenario_bull')}</div><div class="da-section-text">${daT(a.scenario_bull)}</div></div>`:''}
        ${a.scenario_bear?`<div class="da-section bear"><div class="da-section-label">${t('da_cenario_bear')}</div><div class="da-section-text">${daT(a.scenario_bear)}</div></div>`:''}
        ${daT(a.news_impact)&&daT(a.news_impact)!=='—'?`<div class="da-section news"><div class="da-section-label">${t('da_noticias')}</div><div class="da-section-text">${daT(a.news_impact)}</div></div>`:''}
        ${daT(a.events)&&daT(a.events)!=='—'?`<div class="da-events"><strong>${t('da_eventos')}:</strong> ${daT(a.events)}</div>`:''}
      </div>
    </div>`;
  }).join('');
}

/* LEAD / UNLOCK */
/* ── DATA LAYER — Supabase + localStorage cache ── */

// ── Validação de email e telefone ──
const _emailFormatRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const _phoneMinDigits = { '+55':10, '+1':10, '+351':9, '+54':10, '+34':9, '+33':9, '+49':10, '+44':10, '+971':9, '+81':10, '+61':9, '+52':10, '+57':10, '+56':9 };

function validatePhone(raw) {
  if (!raw) return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

async function validateEmailMx(email) {
  if (!_emailFormatRe.test(email)) return { valid: false, reason: 'invalid_format' };
  try {
    const resp = await fetch('/api/validate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!resp.ok) return { valid: true }; // fallback: allow if API fails
    return await resp.json();
  } catch {
    return { valid: true }; // fallback: allow if network fails
  }
}

// saveLead: Supabase primary, localStorage cache
async function saveLead(data) {
  if (!rateLimit('saveLead', 5000)) return; // 5s cooldown
  const payload = {
    ...data,
    idioma:    navigator.language || 'pt-BR',
    timezone:  Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || '',
    ...MC_UTM,
    ts: new Date().toISOString(),
  };

  // 1. Supabase (primary — dados seguros no servidor)
  try {
    await db.from('leads').upsert(payload, { onConflict: 'email', ignoreDuplicates: false });
  } catch(e) {}

  // 2. Enriquecer com geolocalização via IP (usa fetchGeo cacheado)
  try {
    const geo = await fetchGeo();
    if (geo?.geo_country) {
      db.from('leads').update({
        pais: geo.geo_country, estado: geo.geo_region, cidade: geo.geo_city
      }).eq('email', payload.email);
    }
  } catch(e) {}

  // 3. localStorage cache (compatibilidade + offline)
  try {
    const leads = JSON.parse(localStorage.getItem('mc_leads')||'[]');
    if (!leads.find(l => l.email === payload.email)) {
      leads.push(payload);
      if (leads.length > 200) leads.splice(0, leads.length - 200);
      localStorage.setItem('mc_leads', JSON.stringify(leads));
    }
  } catch(e) {}

  localStorage.setItem('mc_unlocked_' + data.tool, '1');
  track('tool_lead_capture', { tool: data.tool, email: data.email, name: data.name });
}
function isUnlocked(t) { return localStorage.getItem('mc_unlocked_' + t) === '1'; }

/* LIVE ROOM — DDI auto-detect */
function updateWaPlaceholder() {
  const ddi = document.getElementById('lv-ddi')?.value || '+55';
  const inp = document.getElementById('lv-whatsapp');
  if (!inp) return;
  const placeholders = {
    '+55':'(11) 99999-9999', '+1':'(555) 000-0000', '+351':'912 345 678',
    '+54':'11 1234-5678', '+34':'612 345 678', '+33':'06 12 34 56 78',
    '+49':'0151 12345678', '+44':'07700 900000', '+971':'050 123 4567',
    '+1-CA':'(416) 000-0000', '+61':'0412 345 678', '+81':'090-1234-5678',
    '+52':'55 1234 5678', '+57':'300 123 4567', '+56':'9 1234 5678',
  };
  inp.placeholder = placeholders[ddi] || '(DDI) número';
}

function autoDetectDDI() {
  const lang = navigator.language || navigator.userLanguage || 'pt-BR';
  const tz   = Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || '';
  let ddi = '+55'; // default BR
  if (lang.startsWith('en-US') || tz.includes('America/New_York') || tz.includes('America/Chicago') || tz.includes('America/Los_Angeles')) ddi = '+1';
  else if (lang.startsWith('en-GB') || tz.includes('Europe/London')) ddi = '+44';
  else if (lang.startsWith('pt-PT') || tz.includes('Europe/Lisbon')) ddi = '+351';
  else if (lang.startsWith('es-AR') || tz.includes('America/Argentina')) ddi = '+54';
  else if (lang.startsWith('es-MX') || tz.includes('America/Mexico')) ddi = '+52';
  else if (lang.startsWith('es-CO') || tz.includes('America/Bogota')) ddi = '+57';
  else if (lang.startsWith('es-CL') || tz.includes('America/Santiago')) ddi = '+56';
  else if (lang.startsWith('fr')    || tz.includes('Europe/Paris')) ddi = '+33';
  else if (lang.startsWith('de')    || tz.includes('Europe/Berlin')) ddi = '+49';
  else if (lang.startsWith('ar')    || tz.includes('Asia/Dubai')) ddi = '+971';
  else if (lang.startsWith('ja')    || tz.includes('Asia/Tokyo')) ddi = '+81';
  else if (tz.includes('Australia')) ddi = '+61';
  else if (tz.includes('America/Toronto') || tz.includes('America/Vancouver')) ddi = '+1-CA';
  const sel = document.getElementById('lv-ddi');
  if (sel) { sel.value = ddi; updateWaPlaceholder(); }
}

function checkLoyaltyAndShowLive(forceCheck = false) {
  const history  = getLoyaltyHistory();
  const approved = history.filter(h => h.status === 'approved').length;
  const member   = getLoyaltyMember();
  const gate     = document.getElementById('live-loyalty-gate');
  const form     = document.getElementById('live-gate');
  const statusEl = document.getElementById('live-gate-status');

  if (approved >= 3) {
    // Acesso liberado
    if (gate) gate.classList.add('hide');
    if (form) form.classList.remove('hide');
    // Pré-preencher nome/email da fidelidade
    if (member) {
      const nameEl = document.getElementById('lv-name');
      const emailEl = document.getElementById('lv-email');
      if (nameEl && !nameEl.value) nameEl.value = member.name || '';
      if (emailEl && !emailEl.value) emailEl.value = member.email || '';
    }
    autoDetectDDI();
    return;
  }

  // Acesso bloqueado — mostrar gate
  if (gate) gate.classList.remove('hide');
  if (form) form.classList.add('hide');

  if (statusEl) {
    const pending = getLoyaltyPending().filter(p => p.status === 'pending').length;
    const total   = approved + pending;
    const faltam  = Math.max(0, 3 - approved);
    statusEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);">${t('live_gate_seu_progresso')}</div>
        <div style="font-size:11px;color:var(--t3);">${approved}/3 ${t('live_gate_validadas_bar')}</div>
      </div>
      <div style="background:var(--b1);border-radius:4px;height:7px;overflow:hidden;margin-bottom:14px;">
        <div style="height:100%;width:${Math.min(100,Math.round(approved/3*100))}%;background:var(--gold);border-radius:4px;transition:width 1s;"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:${member?'14px':'0'};">
        <div style="background:var(--card2);border-radius:7px;padding:10px;text-align:center;border:1px solid var(--b1);">
          <div style="font-size:10px;color:var(--t3);margin-bottom:3px;">${t('live_gate_validadas')}</div>
          <div style="font-size:18px;font-weight:800;color:var(--green);">${approved}</div>
        </div>
        <div style="background:var(--card2);border-radius:7px;padding:10px;text-align:center;border:1px solid var(--b1);">
          <div style="font-size:10px;color:var(--t3);margin-bottom:3px;">${t('live_gate_em_analise')}</div>
          <div style="font-size:18px;font-weight:800;color:var(--gold);">${pending}</div>
        </div>
        <div style="background:var(--card2);border-radius:7px;padding:10px;text-align:center;border:1px solid var(--b1);">
          <div style="font-size:10px;color:var(--t3);margin-bottom:3px;">${t('live_gate_faltam')}</div>
          <div style="font-size:18px;font-weight:800;color:var(--red);">${faltam}</div>
        </div>
      </div>
      ${member ? '' : `<div style="font-size:12px;color:var(--t3);padding-top:12px;border-top:1px solid var(--b1);">${t('live_gate_nao_membro')} <button onclick="go('loyalty')" style="background:none;border:none;color:var(--gold);font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline;">${t('live_gate_cadastre')}</button></div>`}`;
  }
}

function liveStep(step) {
  [1,2,3].forEach(s=>{document.getElementById('live-step'+s)?.classList.toggle('hide',s!==step);const lp=document.getElementById('lp'+s);if(lp)lp.className='lp-step'+(s<step?' done':s===step?' active':'');});
  if(step===2){
    const n=document.getElementById('lv-name')?.value.trim();
    const e=document.getElementById('lv-email')?.value.trim();
    const w=document.getElementById('lv-whatsapp')?.value.trim();
    if(!n||!e||!w){showToast(t('toast_preencha_nome_email_whats'));liveStep(1);return;}
  }
  if(step===3){if(!document.getElementById('lv-pais')?.value){showToast(t('toast_selecione_pais'));liveStep(2);return;}}
  window.scrollTo({top:0,behavior:'smooth'});
}

async function joinLive(){
  const btn=document.getElementById('live-final-btn');if(btn){btn.disabled=true;btn.textContent=t('toast_processando');}
  const name=document.getElementById('lv-name')?.value.trim();
  const email=document.getElementById('lv-email')?.value.trim();
  const ddi=(document.getElementById('lv-ddi')?.value||'+55').replace('-CA','');
  const waNum=document.getElementById('lv-whatsapp')?.value.trim().replace(/\D/g,'');
  const whatsapp= waNum ? ddi+' '+waNum : '';
  if(!name||!email||!whatsapp){showToast(t('toast_preencha_obrigatorios'));if(btn){btn.disabled=false;btn.textContent=t('live_acessar');}return;}
  if(!_emailFormatRe.test(email)){showToast(t('toast_email_invalido'));if(btn){btn.disabled=false;btn.textContent=t('live_acessar');}return;}
  const lvConsent=document.getElementById('lv-consent')?.checked;
  if(!lvConsent){showToast(t('toast_aceite_privacidade'));if(btn){btn.disabled=false;btn.textContent=t('live_acessar');}return;}
  const nasc=document.getElementById('lv-nascimento')?.value;
  const lead={name,email,whatsapp,sexo:document.getElementById('lv-sexo')?.value||null,nascimento:nasc||null,idade:nasc?Math.floor((Date.now()-new Date(nasc))/31557600000):null,pais:document.getElementById('lv-pais')?.value||null,estado:document.getElementById('lv-estado')?.value.trim()||null,cidade:document.getElementById('lv-cidade')?.value.trim()||null,estilo_trading:document.getElementById('lv-estilo')?.value||null,plataforma:document.getElementById('lv-plataforma')?.value||null,firma:document.getElementById('lv-firma')?.value||null,capital_disponivel:document.getElementById('lv-capital')?.value||null,passou_desafio:document.getElementById('lv-desafio')?.value||null,tool:'live',consent:true,consent_date:new Date().toISOString(),ts:new Date().toISOString()};
  saveLead(lead);
  document.getElementById('live-gate').classList.add('hide');document.getElementById('live-room').classList.remove('hide');document.getElementById('lv-viewers').textContent=Math.floor(Math.random()*40+10);
  track('live_signup',{name,email,pais:lead.pais,estilo:lead.estilo_trading});
  if(btn){btn.disabled=false;btn.textContent=t('live_acessar');}
}

/* BOT */
let botOpen=false;
const botHist=[{role:'user',content:'Voce e o TradeBot, assistente especialista em prop firms e trading. Conhece: Apex(90%OFF MARKET,futuros,split 80%), Bulenox(89%OFF MARKET89,futuros,passa 1 dia,split 90%), FTMO(forex,MT4/MT5,split 90%,free trial), TakeProfit(40%OFF MARKET40,futuros,saque dia 1), FundedNext(30%OFF FNF30,futuros,payout 24h,split 95%), Earn2Trade(50%OFF MARKETSCOUPONS,futuros,scaling $400K). Quando o trader estiver frustrado, ofereca suporte emocional primeiro. Para position size: mostre o calculo passo a passo. Responda SEMPRE em portugues. Maximo 200 palavras.'}];
function toggleBot(){botOpen=!botOpen;document.getElementById('bot-win').classList.toggle('open',botOpen);if(botOpen){document.getElementById('bot-badge').style.display='none';document.getElementById('bot-inp').focus();}}
function openBot(){botOpen=false;toggleBot();}
function qmsg(t){document.getElementById('bot-inp').value=t;sendBot();}
function addBMsg(role,text){const c=document.getElementById('bot-msgs');const tm=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});const d=document.createElement('div');d.className='bmsg '+role;const safe=role==='usr'?text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):text;d.innerHTML=`<div class="bbbl">${safe.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div><span class="btime">${tm}</span>`;c.appendChild(d);c.scrollTop=c.scrollHeight;}
async function sendBot(){
  const inp=document.getElementById('bot-inp');const txt=inp.value.trim();if(!txt)return;
  inp.value='';document.getElementById('bot-snd').disabled=true;document.getElementById('bot-quick').style.display='none';
  addBMsg('usr',txt);botHist.push({role:'user',content:txt});
  const ty=document.getElementById('bot-typing');ty.classList.add('show');document.getElementById('bot-msgs').scrollTop=99999;
  try{const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:400,system:botHist[0].content,messages:botHist.slice(1)})});const data=await res.json();ty.classList.remove('show');const reply=data.content?.[0]?.text||'Erro. Tente novamente.';botHist.push({role:'assistant',content:reply});addBMsg('bot',reply);track('bot_message',{user_msg:txt.slice(0,50),response_len:reply.length});}catch(e){ty.classList.remove('show');addBMsg('bot','Erro de conexao. Tente novamente.');}
  document.getElementById('bot-snd').disabled=false;
}

/* TOAST */
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300);}

/* TOOLS */
const TOOLS=[{id:'orderflow',name:'Order Flow Analyzer',badge:'Gratis',badgeColor:'var(--green)',badgeBg:'var(--gnbg)',desc:'Analise o fluxo de ordens. Identifique acumulacao e distribuicao institucional.'},{id:'dashboard',name:'Prop Firm Dashboard',badge:'Premium',badgeColor:'var(--gold)',badgeBg:'var(--gbg)',desc:'Monitore drawdown, lucro e dias de operacao em tempo real.'},{id:'journal',name:'Trade Journal',badge:'Gratis',badgeColor:'var(--green)',badgeBg:'var(--gnbg)',desc:'Registre e analise cada operacao. Identifique padroes e melhore sua performance.'},{id:'backtester',name:'Backtester Pro',badge:'Premium',badgeColor:'var(--gold)',badgeBg:'var(--gbg)',desc:'Simule estrategias. Calcule win rate, profit factor e max drawdown.'},{id:'alerts',name:'Alert Manager',badge:'Gratis',badgeColor:'var(--green)',badgeBg:'var(--gnbg)',desc:'Configure alertas de preco e drawdown via Telegram ou e-mail.'},{id:'ninjapack',name:'NinjaTrader Pack',badge:'VIP',badgeColor:'#A855F7',badgeBg:'rgba(168,85,247,.1)',desc:'Pack com 15 indicadores otimizados para prop firms. NinjaTrader 8.'}];
function renderIndHub(){const g=document.getElementById('ind-hub-grid');if(!g)return;g.innerHTML=TOOLS.map(tool=>`<div class="ic" onclick="openTool('${tool.id}')"><div class="ic-top"><div class="ic-ico"></div><span class="ic-badge" style="background:${tool.badgeBg};color:${tool.badgeColor};">${tool.badge}</span></div><div class="ic-name">${tool.name}</div><div class="ic-desc">${tool.desc}</div><button class="ic-btn">${t('plat_acessar')}</button></div>`).join('');}
function openTool(id){const t=TOOLS.find(x=>x.id===id);if(!t)return;const unlocked=isUnlocked(id);const inner=document.getElementById('tool-modal-inner');inner.innerHTML=`<div class="tm-hd"><div class="tm-title">${t.name} <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${t.badgeBg};color:${t.badgeColor};font-weight:700;">${t.badge}</span></div><button class="tm-x" onclick="closeTool()">x</button></div><div class="tm-body" id="tm-body">${unlocked?renderToolContent(id):renderLeadGate(id,t)}</div>`;document.getElementById('tool-ov').classList.add('open');document.getElementById('tool-modal').classList.add('open');document.body.style.overflow='hidden';track('tool_open',{tool_id:id,tool_name:t.name,unlocked});}
function closeTool(){document.getElementById('tool-ov').classList.remove('open');document.getElementById('tool-modal').classList.remove('open');document.body.style.overflow='';}
function renderLeadGate(toolId,tool){return`<div class="lead-gate"><div class="lg-ico"></div><div class="lg-title">Acesse o ${tool.name}</div><div class="lg-desc">${tool.desc}<br><br><strong style="color:var(--t1);">Cadastre-se gratuitamente para desbloquear.</strong></div><div class="lg-form"><div class="lg-field"><label>Nome</label><input type="text" id="lg-name-${toolId}" placeholder="Seu nome"></div><div class="lg-field"><label>E-mail</label><input type="email" id="lg-email-${toolId}" placeholder="seu@email.com"></div><div class="lg-field"><label>WhatsApp</label><input type="tel" id="lg-wa-${toolId}" placeholder="+55 11 99999-9999"></div><label class="lg-consent"><input type="checkbox" id="lg-consent-${toolId}"> <span>${t('consent_label')}</span></label><button class="lg-sub" onclick="submitLead('${toolId}')">Desbloquear</button><div class="lg-note">Seus dados sao privados.</div></div></div>`;}
function submitLead(toolId){
  const name=document.getElementById('lg-name-'+toolId)?.value.trim();
  const email=document.getElementById('lg-email-'+toolId)?.value.trim();
  const wa=document.getElementById('lg-wa-'+toolId)?.value.trim();
  const consent=document.getElementById('lg-consent-'+toolId)?.checked;
  if(!name||!email){showToast(t('toast_preencha_nome_email'));return;}
  if(!_emailFormatRe.test(email)){showToast(t('toast_email_invalido'));return;}
  if(!consent){showToast(t('toast_aceite_privacidade'));return;}
  saveLead({name,email,whatsapp:wa,tool:toolId,consent:true,consent_date:new Date().toISOString()});
  document.getElementById('tm-body').innerHTML=renderToolContent(toolId);
  showToast(t('toast_acesso_liberado'));
}
function renderToolContent(id){switch(id){case 'orderflow':return renderOrderFlow();case 'dashboard':return renderPFDashboard();case 'journal':return renderJournal();case 'backtester':return renderBacktester();case 'alerts':return renderAlerts();case 'ninjapack':return renderNinjaPack();default:return '<p>'+t('toast_em_breve')+'</p>';}}
function renderOrderFlow(){const syms=['ES','NQ','CL','GC','YM','6E','RTY'];const data=syms.map(s=>({sym:s,buy:Math.floor(Math.random()*5000+1000),sell:Math.floor(Math.random()*5000+1000)}));data.forEach(d=>d.delta=d.buy-d.sell);return`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"><div style="font-size:13px;font-weight:600;">Fluxo de Ordens em Tempo Real</div><button class="btn-sm" onclick="document.getElementById('tm-body').innerHTML=renderToolContent('orderflow')">Atualizar</button></div><div style="display:flex;flex-direction:column;gap:6px;">${data.map(d=>{const tot=d.buy+d.sell;const bp=Math.round(d.buy/tot*100);const col=d.delta>0?'var(--green)':'var(--red)';return`<div class="of-row"><div class="of-sym" style="min-width:36px;">${d.sym}</div><div style="flex:1;margin:0 10px;"><div style="display:flex;gap:2px;height:16px;border-radius:3px;overflow:hidden;"><div style="width:${bp}%;background:rgba(34,197,94,.7);border-radius:3px 0 0 3px;"></div><div style="width:${100-bp}%;background:rgba(239,68,68,.7);border-radius:0 3px 3px 0;"></div></div><div style="display:flex;justify-content:space-between;font-size:9px;color:var(--t3);margin-top:2px;"><span>Buy ${bp}%</span><span>Sell ${100-bp}%</span></div></div><div style="text-align:right;min-width:70px;"><div style="font-size:12px;font-weight:700;color:${col};">${d.delta>0?'+':''}${d.delta.toLocaleString()}</div><div style="font-size:9px;color:var(--t3);">Delta</div></div></div>`;}).join('')}</div>`;}
function renderPFDashboard(){const cfg=JSON.parse(localStorage.getItem('mc_pf_config')||'null')||{balance:100000,startBalance:100000,target:108000,ddLimit:5};const pnl=cfg.balance-cfg.startBalance;const dd=Math.max(0,((cfg.startBalance-cfg.balance)/cfg.startBalance*100)).toFixed(2);const tgt=Math.max(0,Math.min(100,Math.round(pnl/(cfg.target-cfg.startBalance)*100)));return`<div class="tool-grid-2"><div class="tool-card"><div class="tc-lbl">Saldo</div><div class="tc-val ${pnl>=0?'g':'r'}">$${cfg.balance.toLocaleString()}</div></div><div class="tool-card"><div class="tc-lbl">P&L</div><div class="tc-val ${pnl>=0?'g':'r'}">${pnl>=0?'+':''}$${Math.abs(pnl).toLocaleString()}</div></div><div class="tool-card"><div class="tc-lbl">Drawdown</div><div class="tc-val ${parseFloat(dd)>3?'r':'y'}">${dd}%</div></div><div class="tool-card"><div class="tc-lbl">Meta</div><div class="tc-val y">${tgt}%</div></div></div><div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:5px;"><span>Progresso da Meta</span><span>${tgt}%</span></div><div style="height:8px;background:var(--b1);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${tgt}%;background:var(--green);border-radius:4px;"></div></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;"><input class="inp-sm" id="pf-trade" type="number" placeholder="P&L do trade ($)" style="max-width:160px;"><button class="btn-sm" onclick="addPFTrade()">+ Adicionar</button><button class="btn-sm-out" onclick="resetPF()">Resetar</button></div>`;}
function addPFTrade(){const val=parseFloat(document.getElementById('pf-trade')?.value)||0;if(!val){showToast(t('toast_digite_valor'));return;}const cfg=JSON.parse(localStorage.getItem('mc_pf_config')||'null')||{balance:100000,startBalance:100000,target:108000,ddLimit:5};cfg.balance=Math.round(cfg.balance+val);localStorage.setItem('mc_pf_config',JSON.stringify(cfg));document.getElementById('tm-body').innerHTML=renderToolContent('dashboard');showToast(val>0?t('toast_trade_positivo'):t('toast_trade_negativo'));}
function resetPF(){localStorage.removeItem('mc_pf_config');document.getElementById('tm-body').innerHTML=renderToolContent('dashboard');}
function renderJournal(){const trades=JSON.parse(localStorage.getItem('mc_journal')||'[]');const totalPnl=trades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);const wins=trades.filter(t=>parseFloat(t.pnl)>0).length;const wr=trades.length?(wins/trades.length*100).toFixed(0):0;return`<div class="tool-grid-2" style="margin-bottom:14px;"><div class="tool-card"><div class="tc-lbl">Trades</div><div class="tc-val">${trades.length}</div></div><div class="tool-card"><div class="tc-lbl">Win Rate</div><div class="tc-val ${wr>=50?'g':'r'}">${wr}%</div></div><div class="tool-card"><div class="tc-lbl">P&L Total</div><div class="tc-val ${totalPnl>=0?'g':'r'}">${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}</div></div><div class="tool-card"><div class="tc-lbl">Media</div><div class="tc-val">${trades.length?'$'+(totalPnl/trades.length).toFixed(2):'—'}</div></div></div><div class="inp-row" style="margin-bottom:12px;"><input class="inp-sm" id="jn-sym" placeholder="Simbolo" style="max-width:100px;"><select class="inp-sm" id="jn-dir" style="max-width:90px;"><option>Long</option><option>Short</option></select><input class="inp-sm" id="jn-pnl" type="number" placeholder="P&L ($)"><input class="inp-sm" id="jn-note" placeholder="Notas"><button class="btn-sm" onclick="addJTrade()">+ Adicionar</button></div>${trades.length?`<div style="overflow-x:auto;"><table class="tbl-tool"><thead><tr><th>Data</th><th>Simbolo</th><th>Dir</th><th>P&L</th><th>Notas</th><th></th></tr></thead><tbody>${[...trades].reverse().slice(0,10).map((t,i)=>`<tr><td style="color:var(--t3);">${new Date(t.ts).toLocaleDateString('pt-BR')}</td><td style="font-weight:700;">${escHtml(t.sym)}</td><td><span style="padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;background:${t.dir==='Long'?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)'};color:${t.dir==='Long'?'var(--green)':'var(--red)'};">${escHtml(t.dir)}</span></td><td style="font-weight:700;color:${parseFloat(t.pnl)>=0?'var(--green)':'var(--red)'};">${parseFloat(t.pnl)>=0?'+':''}$${parseFloat(t.pnl).toFixed(2)}</td><td style="color:var(--t3);font-size:11px;">${escHtml(t.note)}</td><td><button onclick="deleteJTrade(${trades.length-1-i})" style="background:none;border:none;color:var(--t3);cursor:pointer;">x</button></td></tr>`).join('')}</tbody></table></div><div style="margin-top:10px;display:flex;gap:8px;"><button class="btn-sm-out" onclick="exportJournal()">Exportar CSV</button><button class="btn-sm-out" style="color:var(--red);" onclick="clearJournal()">Limpar</button></div>`:'<div style="text-align:center;padding:30px;color:var(--t3);">Nenhuma operacao registrada ainda.</div>'}`;}
function addJTrade(){const sym=(document.getElementById('jn-sym')?.value||'').trim().toUpperCase();const dir=document.getElementById('jn-dir')?.value||'Long';const pnl=document.getElementById('jn-pnl')?.value;const note=(document.getElementById('jn-note')?.value||'').trim();if(!sym||!pnl){showToast(t('toast_preencha_simbolo_pnl'));return;}const trades=JSON.parse(localStorage.getItem('mc_journal')||'[]');trades.push({sym,dir,pnl:parseFloat(pnl),note,ts:new Date().toISOString()});localStorage.setItem('mc_journal',JSON.stringify(trades));document.getElementById('tm-body').innerHTML=renderToolContent('journal');}
function deleteJTrade(idx){const trades=JSON.parse(localStorage.getItem('mc_journal')||'[]');trades.splice(idx,1);localStorage.setItem('mc_journal',JSON.stringify(trades));document.getElementById('tm-body').innerHTML=renderToolContent('journal');}
function clearJournal(){localStorage.removeItem('mc_journal');document.getElementById('tm-body').innerHTML=renderToolContent('journal');}
function exportJournal(){const trades=JSON.parse(localStorage.getItem('mc_journal')||'[]');if(!trades.length){showToast(t('toast_nenhuma_operacao'));return;}const csv='Data,Simbolo,Direcao,P&L,Notas\n'+trades.map(t=>`${new Date(t.ts).toLocaleDateString('pt-BR')},${t.sym},${t.dir},${t.pnl},"${t.note||''}"`).join('\n');const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='journal.csv';a.click();}
function renderBacktester(){const r=JSON.parse(localStorage.getItem('mc_bt_results')||'null');return`<div style="margin-bottom:16px;"><div style="font-size:13px;font-weight:600;margin-bottom:12px;">Configurar Estrategia</div><div class="inp-row"><div style="flex:1;min-width:110px;"><div style="font-size:10px;color:var(--t3);margin-bottom:4px;">Win Rate (%)</div><input class="inp-sm" id="bt-wr" type="number" value="55" style="width:100%;"></div><div style="flex:1;min-width:110px;"><div style="font-size:10px;color:var(--t3);margin-bottom:4px;">Risco ($)</div><input class="inp-sm" id="bt-risk" type="number" value="200" style="width:100%;"></div><div style="flex:1;min-width:110px;"><div style="font-size:10px;color:var(--t3);margin-bottom:4px;">Retorno ($)</div><input class="inp-sm" id="bt-rew" type="number" value="400" style="width:100%;"></div><div style="flex:1;min-width:110px;"><div style="font-size:10px;color:var(--t3);margin-bottom:4px;">N. Trades</div><input class="inp-sm" id="bt-n" type="number" value="100" style="width:100%;"></div></div><button class="btn-sm" onclick="runBacktest()" style="margin-top:8px;">Simular Estrategia</button></div>${r?renderBTResults(r):'<div style="text-align:center;padding:24px;color:var(--t3);">Configure os parametros e clique em Simular</div>'}`;}
function runBacktest(){const wr=parseFloat(document.getElementById('bt-wr')?.value)/100||.55;const risk=parseFloat(document.getElementById('bt-risk')?.value)||200;const rew=parseFloat(document.getElementById('bt-rew')?.value)||400;const n=parseInt(document.getElementById('bt-n')?.value)||100;let bal=100000;const equity=[100000];let maxBal=100000,maxDD=0,wins=0;for(let i=0;i<n;i++){const win=Math.random()<wr;bal+=win?rew:-risk;if(win)wins++;equity.push(Math.max(0,bal));maxBal=Math.max(maxBal,bal);maxDD=Math.max(maxDD,(maxBal-bal)/maxBal*100);}const r={equity,wins,n,finalBal:bal,maxDD,profitFactor:(wins*rew)/((n-wins)*risk),rr:(rew/risk).toFixed(2),wr:(wr*100).toFixed(0)};localStorage.setItem('mc_bt_results',JSON.stringify(r));document.getElementById('tm-body').innerHTML=renderToolContent('backtester');}
function renderBTResults(r){const pnl=r.finalBal-100000;const pts=r.equity;const minE=Math.min(...pts),maxE=Math.max(...pts),range=maxE-minE||1,h=140,w=pts.length;return`<div class="bt-stat-grid"><div class="tool-card"><div class="tc-lbl">P&L Final</div><div class="tc-val ${pnl>=0?'g':'r'}">${pnl>=0?'+':''}$${Math.abs(pnl).toLocaleString()}</div></div><div class="tool-card"><div class="tc-lbl">Win Rate</div><div class="tc-val">${r.wr}%</div></div><div class="tool-card"><div class="tc-lbl">Profit Factor</div><div class="tc-val ${r.profitFactor>=1?'g':'r'}">${r.profitFactor.toFixed(2)}</div></div><div class="tool-card"><div class="tc-lbl">Max Drawdown</div><div class="tc-val r">${r.maxDD.toFixed(1)}%</div></div></div><div style="margin-top:14px;"><div style="font-size:11px;color:var(--t3);margin-bottom:6px;">Curva de Equidade Simulada</div><div style="background:var(--card);border:1px solid var(--b1);border-radius:8px;padding:12px;overflow:hidden;"><svg viewBox="0 0 400 ${h}" style="width:100%;height:${h}px;"><defs><linearGradient id="btG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${pnl>=0?'#22C55E':'#EF4444'}" stop-opacity=".3"/><stop offset="100%" stop-color="${pnl>=0?'#22C55E':'#EF4444'}" stop-opacity="0"/></linearGradient></defs><polyline points="${pts.map((v,i)=>`${(i/(w-1)*400).toFixed(1)},${((1-(v-minE)/range)*h).toFixed(0)}`).join(' ')}" fill="none" stroke="${pnl>=0?'#22C55E':'#EF4444'}" stroke-width="2"/><polygon points="0,${h} ${pts.map((v,i)=>`${(i/(w-1)*400).toFixed(1)},${((1-(v-minE)/range)*h).toFixed(0)}`).join(' ')} 400,${h}" fill="url(#btG)"/></svg></div></div>`;}
function renderAlerts(){const alerts=JSON.parse(localStorage.getItem('mc_alerts')||'[]');return`<div style="margin-bottom:14px;"><div style="font-size:13px;font-weight:600;margin-bottom:10px;">Criar Novo Alerta</div><div class="inp-row"><select class="inp-sm" id="al-type" style="max-width:150px;"><option value="price">Preco acima de</option><option value="price_below">Preco abaixo de</option><option value="dd">Drawdown atingiu</option></select><input class="inp-sm" id="al-sym" placeholder="Simbolo" style="max-width:110px;"><input class="inp-sm" id="al-val" type="number" placeholder="Valor" style="max-width:100px;"><select class="inp-sm" id="al-ch" style="max-width:130px;"><option>Telegram</option><option>E-mail</option></select><button class="btn-sm" onclick="addAlert()">Criar Alerta</button></div></div>${alerts.length?alerts.map((a,i)=>`<div class="alert-item"><div class="ai-left"><div class="ai-name">${escHtml(a.sym)} — ${a.type==='price'?'Acima de':'Abaixo de'} $${a.val}</div><div class="ai-cond">${escHtml(a.channel)}</div></div><div style="display:flex;align-items:center;gap:8px;"><button class="ai-toggle ${a.active?'on':'off'}" onclick="toggleAlert(${i})"></button><button onclick="deleteAlert(${i})" style="background:none;border:none;color:var(--t3);cursor:pointer;">x</button></div></div>`).join(''):'<div style="text-align:center;padding:24px;color:var(--t3);">Nenhum alerta configurado ainda.</div>'}`;}
function addAlert(){const type=document.getElementById('al-type')?.value;const sym=(document.getElementById('al-sym')?.value||'').trim().toUpperCase();const val=document.getElementById('al-val')?.value;const channel=document.getElementById('al-ch')?.value;if(!sym||!val){showToast(t('toast_preencha_simbolo_valor'));return;}const alerts=JSON.parse(localStorage.getItem('mc_alerts')||'[]');alerts.push({type,sym,val:parseFloat(val),channel,active:true,ts:new Date().toISOString()});localStorage.setItem('mc_alerts',JSON.stringify(alerts));document.getElementById('tm-body').innerHTML=renderToolContent('alerts');showToast(t('toast_alerta_criado'));}
function toggleAlert(i){const alerts=JSON.parse(localStorage.getItem('mc_alerts')||'[]');if(alerts[i])alerts[i].active=!alerts[i].active;localStorage.setItem('mc_alerts',JSON.stringify(alerts));document.getElementById('tm-body').innerHTML=renderToolContent('alerts');}
function deleteAlert(i){const alerts=JSON.parse(localStorage.getItem('mc_alerts')||'[]');alerts.splice(i,1);localStorage.setItem('mc_alerts',JSON.stringify(alerts));document.getElementById('tm-body').innerHTML=renderToolContent('alerts');}
function renderNinjaPack(){return`<div class="vip-box"><div style="font-size:18px;font-weight:700;margin-bottom:6px;">NinjaTrader Pack — 15 Indicadores</div><div style="font-size:13px;color:var(--t2);line-height:1.6;margin-bottom:16px;">Pack exclusivo para traders de prop firms. NinjaTrader 8. Inclui setup e video tutorial.</div><div class="vip-features"><div class="vip-feat">PropFirm DrawdownGuard</div><div class="vip-feat">DailyTarget Tracker</div><div class="vip-feat">OrderFlow Delta</div><div class="vip-feat">Session VWAP</div><div class="vip-feat">EntryZone Finder</div><div class="vip-feat">NewsFilter</div><div class="vip-feat">RiskManager automatico</div><div class="vip-feat">+ 8 indicadores adicionais</div></div><button class="dl-btn" onclick="showToast('Arquivo em preparacao. Voce recebera por e-mail!')">Baixar NinjaTrader Pack</button></div>`;}

/* LOYALTY — Supabase */
/* LOYALTY — tiers removed, simple 3-purchase gate for Live Room */

// Cache local para fidelidade (evita múltiplas chamadas ao Supabase)
let _loyaltyCache = { member: null, history: [], pending: [], loaded: false };

async function loadLoyaltyFromSupabase(email) {
  if (!email) return;
  try {
    const [mRes, pRes] = await Promise.all([
      db.from('loyalty_members').select('*').eq('email', email).maybeSingle(),
      db.from('loyalty_proofs').select('*').eq('member_email', email).order('created_at', { ascending: false }),
    ]);
    if (mRes.data) _loyaltyCache.member = { name: mRes.data.name, email: mRes.data.email, ts: mRes.data.created_at };
    if (pRes.data) {
      _loyaltyCache.history = pRes.data.filter(p => p.status !== 'pending').map(p => ({
        id: p.id, member: p.member_email, name: p.member_name, firma: p.firma,
        size: p.plan_size, orderNumber: p.order_number, coupon: p.coupon_used,
        value: p.purchase_value, status: p.status, ts: p.created_at,
      }));
      _loyaltyCache.pending = pRes.data.filter(p => p.status === 'pending').map(p => ({
        id: p.id, member: p.member_email, name: p.member_name, firma: p.firma,
        size: p.plan_size, orderNumber: p.order_number, coupon: p.coupon_used,
        value: p.purchase_value, status: 'pending', ts: p.created_at,
      }));
    }
    _loyaltyCache.loaded = true;
    // Persist cache to localStorage for offline/gate check
    localStorage.setItem('mc_loyalty_member',  JSON.stringify(_loyaltyCache.member));
    localStorage.setItem('mc_loyalty_history',  JSON.stringify(_loyaltyCache.history));
    localStorage.setItem('mc_loyalty_pending',  JSON.stringify(_loyaltyCache.pending));
  } catch(e) {}
}

function getLoyaltyMember()  {
  if (_loyaltyCache.member) return _loyaltyCache.member;
  return JSON.parse(localStorage.getItem('mc_loyalty_member')||'null');
}
function getLoyaltyHistory() {
  if (_loyaltyCache.loaded) return _loyaltyCache.history;
  return JSON.parse(localStorage.getItem('mc_loyalty_history')||'[]');
}
function getLoyaltyPending() {
  if (_loyaltyCache.loaded) return _loyaltyCache.pending;
  return JSON.parse(localStorage.getItem('mc_loyalty_pending')||'[]');
}
/* LOYALTY — tiers removed: getTier/getNextTier deleted */

async function registerLoyalty() {
  const name  = document.getElementById('ly-name')?.value.trim();
  const email = document.getElementById('ly-email')?.value.trim();
  if (!name || !email) { showToast(t('toast_preencha_nome_email')); return; }
  try {
    await db.from('loyalty_members').upsert({ name, email }, { onConflict: 'email' });
  } catch(e) {}
  // Update cache
  _loyaltyCache.member = { name, email, ts: new Date().toISOString() };
  localStorage.setItem('mc_loyalty_member', JSON.stringify(_loyaltyCache.member));
  saveLead({ name, email, tool: 'loyalty' });
  renderLoyaltyPage();
  showToast(t('toast_bem_vindo') + name + '!');
  track('loyalty_register', { name, email });
}

async function submitProof() {
  if (!rateLimit('submitProof', 10000)) { showToast(t('toast_aguarde')); return; }
  const member = getLoyaltyMember();
  if (!member) { showToast(t('toast_cadastro_primeiro')); return; }
  const firma       = document.getElementById('pf-firma')?.value;
  const size        = document.getElementById('pf-size')?.value;
  const orderNumber = (document.getElementById('pf-order')?.value||'').trim();
  if (!firma)       { showToast(t('toast_selecione_firma'));      return; }
  if (!size)        { showToast(t('toast_selecione_tamanho'));        return; }
  if (!orderNumber) { showToast(t('toast_informe_pedido')); return; }

  // Check duplicate
  const all = [...getLoyaltyPending(), ...getLoyaltyHistory()];
  if (all.find(e => e.orderNumber === orderNumber)) {
    showToast(t('toast_pedido_duplicado')); return;
  }

  // Upload file to Supabase Storage if exists
  let file_url = null;
  if (proofFileData?.data) {
    try {
      const base64  = proofFileData.data.split(',')[1];
      const byteArr = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const path    = `proofs/${member.email.replace('@','_')}/${orderNumber}_${proofFileData.name}`;
      const { data: upData } = await db.storage.from('loyalty-proofs').upload(path, byteArr, {
        contentType: proofFileData.type, upsert: true
      });
      if (upData) {
        const { data: urlData } = db.storage.from('loyalty-proofs').getPublicUrl(path);
        file_url = urlData?.publicUrl || null;
      }
    } catch(e) {}
  }

  const proof = {
    member_email:   member.email,
    member_name:    member.name,
    firma,
    plan_size:      size,
    order_number:   orderNumber,
    purchase_date:  document.getElementById('pf-date')?.value || null,
    coupon_used:    (document.getElementById('pf-coupon')?.value||'').trim().toUpperCase() || null,
    purchase_value: (document.getElementById('pf-value')?.value||'').trim() || null,
    file_name:      proofFileData?.name || null,
    file_url,
    status: 'pending',
  };

  let insertedId = null;
  try {
    const { data: inserted } = await db.from('loyalty_proofs').insert(proof).select('id').maybeSingle();
    insertedId = inserted?.id;
  } catch(e) {
    showToast('Erro ao enviar. Tente novamente.'); return;
  }

  // Update local cache
  _loyaltyCache.pending.unshift({ ...proof, id: insertedId||'local_'+Date.now(), orderNumber, ts: new Date().toISOString() });
  localStorage.setItem('mc_loyalty_pending', JSON.stringify(_loyaltyCache.pending));

  ['pf-firma','pf-size','pf-order','pf-date','pf-coupon','pf-value'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value='';
  });
  removeProofFile();
  renderLoyaltyPage();
  showToast(t('toast_comprovante_enviado'));
  track('loyalty_proof_submitted', { firma, size, orderNumber, member: member.email });

  // Trigger AI validation in background
  if(insertedId){
    try{
      const sess = await db.auth.getSession();
      const token = sess?.data?.session?.access_token;
      const resp = await fetch('https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/validate-loyalty-proof', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+(token||'')},
        body:JSON.stringify({proof_id:insertedId})
      });
      const result = await resp.json();
      if(result.status==='approved'){
        showToast(t('toast_comprovante_aprovado'));
        // Move from pending to history in cache
        _loyaltyCache.pending = _loyaltyCache.pending.filter(p=>p.id!==insertedId);
        _loyaltyCache.history.unshift({...proof, id:insertedId, status:'approved', ai_reason:result.ai_reason});
        localStorage.setItem('mc_loyalty_pending',JSON.stringify(_loyaltyCache.pending));
        localStorage.setItem('mc_loyalty_history',JSON.stringify(_loyaltyCache.history));
        renderLoyaltyPage();
        checkAnalysisGate();
      } else if(result.status==='rejected'){
        showToast(t('toast_comprovante_nao_aprovado')+(result.ai_reason||''));
      } else {
        showToast(t('toast_comprovante_analise'));
      }
    }catch(e){ /* AI validation failed silently, admin will review manually */ }
  }
}
function renderPainelLoyalty(){
  const el = document.getElementById('painel-loyalty-body');
  if(!el || !currentUser) return;

  // Auto-register in loyalty if not yet (using existing profile data)
  if(!getLoyaltyMember()){
    const name = currentProfile?.full_name || currentUser.email.split('@')[0];
    const email = currentUser.email;
    localStorage.setItem('mc_loyalty_member', JSON.stringify({name, email, registered_at: new Date().toISOString()}));
  }

  const history = getLoyaltyHistory();
  const approved = history.filter(h=>h.status==='approved').length;
  const faltam = Math.max(0, 3 - approved);
  const liveUnlocked = approved >= 3;
  const progressPct = Math.min(100, Math.round(approved/3*100));

  el.innerHTML=`
    <!-- Progresso -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:700;">${liveUnlocked
        ? '<span style="color:var(--green);">✓ Live Room Desbloqueado!</span>'
        : '<span style="color:var(--gold);">' + faltam + ' compra' + (faltam===1?'':'s') + ' para desbloquear o Live Room VIP</span>'}</div>
      <div style="font-size:12px;color:var(--t3);font-weight:600;">${approved} de 3 compras validadas</div>
    </div>
    <div style="background:var(--card2);border-radius:6px;height:10px;overflow:hidden;margin-bottom:20px;">
      <div style="height:100%;width:${progressPct}%;background:linear-gradient(90deg,var(--gold),var(--gold-hover));border-radius:6px;transition:.4s;"></div>
    </div>

    <!-- Benefícios -->
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:10px;">O que você desbloqueia</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:20px;">
      <div style="background:var(--card2);border:1px solid ${liveUnlocked?'rgba(34,197,94,.3)':'var(--b1)'};border-radius:8px;padding:12px;text-align:center;">
        <div style="margin-bottom:4px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${liveUnlocked?'var(--green)':'var(--t2)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>
        <div style="font-size:12px;font-weight:700;color:${liveUnlocked?'var(--green)':'var(--t1)'};">${liveUnlocked?'✓ ':''} Live Room VIP</div>
        <div style="font-size:10px;color:var(--t3);margin-top:2px;">Operações ao vivo</div>
      </div>
      <div style="background:var(--card2);border:1px solid ${liveUnlocked?'rgba(34,197,94,.3)':'var(--b1)'};border-radius:8px;padding:12px;text-align:center;">
        <div style="margin-bottom:4px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${liveUnlocked?'var(--green)':'var(--t2)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>
        <div style="font-size:12px;font-weight:700;color:${liveUnlocked?'var(--green)':'var(--t1)'};">${liveUnlocked?'✓ ':''} Sorteios</div>
        <div style="font-size:10px;color:var(--t3);margin-top:2px;">Contas financiadas</div>
      </div>
      <div style="background:var(--card2);border:1px solid ${liveUnlocked?'rgba(34,197,94,.3)':'var(--b1)'};border-radius:8px;padding:12px;text-align:center;">
        <div style="margin-bottom:4px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${liveUnlocked?'var(--green)':'var(--t2)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
        <div style="font-size:12px;font-weight:700;color:${liveUnlocked?'var(--green)':'var(--t1)'};">${liveUnlocked?'✓ ':''} Indicadores</div>
        <div style="font-size:10px;color:var(--t3);margin-top:2px;">Ferramentas premium</div>
      </div>
    </div>

    <!-- Como funciona -->
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:10px;">Como funciona</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--t2);">
        <span style="width:22px;height:22px;border-radius:50%;background:var(--gold);color:#07090D;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</span>
        Compre qualquer prop firm usando nosso <strong style="color:var(--t1);">link ou cupom exclusivo</strong>
      </div>
      <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--t2);">
        <span style="width:22px;height:22px;border-radius:50%;background:var(--gold);color:#07090D;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</span>
        Envie o comprovante (print do email ou PDF de confirmação)
      </div>
      <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--t2);">
        <span style="width:22px;height:22px;border-radius:50%;background:var(--gold);color:#07090D;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</span>
        Nossa equipe valida em até <strong style="color:var(--t1);">48 horas</strong>
      </div>
      <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--t2);">
        <span style="width:22px;height:22px;border-radius:50%;background:${liveUnlocked?'var(--green)':'var(--b2)'};color:${liveUnlocked?'#07090D':'var(--t3)'};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">4</span>
        Com <strong style="color:var(--t1);">3 compras validadas</strong> → acesso ao Live Room VIP e benefícios
      </div>
    </div>

    <!-- CTA -->
    <button class="lrf-btn" onclick="go('loyalty')" style="width:100%;padding:13px;">
      ${approved>0?'Enviar novo comprovante →':'Enviar meu primeiro comprovante →'}
    </button>
    ${approved>0?`<button onclick="go('loyalty')" style="width:100%;margin-top:8px;background:transparent;border:1px solid var(--b2);border-radius:8px;padding:10px;color:var(--t2);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--f);">${t('toast_ver_historico')}</button>`:''}`;
}

function renderLoyaltyPage(){
  const member=getLoyaltyMember(), history=getLoyaltyHistory(), pending=getLoyaltyPending();
  const approved=history.filter(h=>h.status==='approved').length;
  const ms=document.getElementById('loyalty-my-section'); if(!ms) return;

  if(!currentUser){
    ms.innerHTML=`<div class="loyalty-register-form">
      <div style="width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
      <div class="lrf-title">Crie sua conta para participar</div>
      <div class="lrf-sub">O cadastro é gratuito. Após criar sua conta você poderá enviar comprovantes de compra e acompanhar seu progresso no programa.</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
        <button class="lrf-btn" onclick="openAuthModal('signup')">Cadastrar grátis →</button>
        <button class="lrf-btn" style="background:transparent;border:1px solid var(--b2);color:var(--t2);" onclick="openAuthModal('login')">Já tenho conta</button>
      </div>
    </div>`;
    document.getElementById('loyalty-proof-section').style.display='none';
    document.getElementById('loyalty-history-wrap').style.display='none';
    return;
  }
  if(!member){
    ms.innerHTML=`<div class="loyalty-register-form">
      <div style="width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>
      <div class="lrf-title">Ativar programa de fidelidade</div>
      <div class="lrf-sub">Confirme seus dados para começar a registrar compras e acumular benefícios VIP.</div>
      <div class="lrf-grid">
        <div class="lrf-field"><label>Nome</label><input type="text" id="ly-name" placeholder="Seu nome" value="${currentProfile?.full_name||''}"></div>
        <div class="lrf-field"><label>E-mail</label><input type="email" id="ly-email" placeholder="seu@email.com" value="${currentUser.email||''}"></div>
      </div>
      <button class="lrf-btn" onclick="registerLoyalty()">Ativar meu programa →</button>
    </div>`;
    document.getElementById('loyalty-proof-section').style.display='none';
    document.getElementById('loyalty-history-wrap').style.display='none';
    return;
  }

  const pendingCount = pending.filter(p=>p.status==='pending').length;
  const faltam = Math.max(0, 3 - approved);
  const progressPct = Math.min(100, Math.round(approved/3*100));
  const liveUnlocked = approved >= 3;

  ms.innerHTML=`<div class="loyalty-my-card">
    <div class="lmc-top">
      <div>
        <div class="lmc-name">${escHtml(member.name)}</div>
        <div style="font-size:12px;color:var(--t2);margin-top:2px;">${escHtml(member.email)}</div>
      </div>
      <div style="padding:4px 12px;border-radius:6px;background:${liveUnlocked?'rgba(34,197,94,.12)':'var(--gbg)'};color:${liveUnlocked?'var(--green)':'var(--gold)'};font-size:11px;font-weight:700;">
        ${liveUnlocked?'✓ Live Room Desbloqueado':faltam+' compra'+(faltam===1?'':'s')+' para Live Room'}
      </div>
    </div>
    <div class="lmc-stats">
      <div class="lmc-stat"><div class="lmc-stat-lbl">Validadas</div><div class="lmc-stat-val" style="color:var(--green);">${approved}</div></div>
      <div class="lmc-stat"><div class="lmc-stat-lbl">Em análise</div><div class="lmc-stat-val" style="color:var(--gold);">${pendingCount}</div></div>
      <div class="lmc-stat"><div class="lmc-stat-lbl">Live Room</div><div class="lmc-stat-val" style="font-size:12px;font-weight:700;color:${liveUnlocked?'var(--green)':'var(--t3)'};">${liveUnlocked?'Liberado':'Bloqueado'}</div></div>
    </div>
    <div style="margin-top:12px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:5px;">
        <span>${approved}/3 compras validadas</span>
        <span>${liveUnlocked?'Acesso liberado!':faltam+' faltam'}</span>
      </div>
      <div class="lmc-progress-wrap"><div class="lmc-progress-bar" style="width:${progressPct}%;background:${liveUnlocked?'var(--green)':'var(--gold)'};"></div></div>
    </div>
    ${pendingCount>0?`<div class="pending-notice" style="margin-top:12px;"><div style="width:18px;height:18px;flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><strong>${pendingCount} comprovante(s) em análise.</strong> Validação em até 48 horas.</div></div>`:''}
    ${liveUnlocked?`<button onclick="go('live')" style="width:100%;margin-top:14px;padding:11px;background:var(--red);color:#fff;border:none;border-radius:8px;font-family:var(--f);font-size:13px;font-weight:700;cursor:pointer;">Acessar Live Room VIP →</button>`:''}
  </div>`;

  document.getElementById('loyalty-proof-section').style.display='block';
  document.getElementById('loyalty-history-wrap').style.display='block';
  const allEntries=[...pending,...history].sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  const tbl=document.getElementById('loyalty-history-tbl');
  if(tbl)tbl.innerHTML=allEntries.length
    ?`<thead><tr><th>Data</th><th>Firma</th><th>Plano</th><th>Cupom</th><th>N.Pedido</th><th>Status</th></tr></thead><tbody>${allEntries.map(h=>`<tr><td style="color:var(--t3);">${new Date(h.ts).toLocaleDateString('pt-BR')}</td><td style="font-weight:600;">${escHtml(h.firma)}</td><td><span style="background:var(--gbg);color:var(--gold);padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">${escHtml(h.size)}</span></td><td style="font-size:11px;font-family:monospace;">${escHtml(h.coupon)}</td><td style="font-size:11px;color:var(--t2);">${escHtml(h.orderNumber)}</td><td><span class="${h.status==='approved'?'status-approved':h.status==='rejected'?'status-rejected':'status-pending'}">${h.status==='approved'?'Validado':h.status==='rejected'?'Recusado':'Em análise'}</span></td></tr>`).join('')}</tbody>`
    :'<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--t3);">Nenhuma compra registrada ainda.</td></tr>';
}
let proofFileData=null;
function handleProofFile(input){const file=input.files[0];if(!file){proofFileData=null;return;}if(file.size>5*1024*1024){showToast('Arquivo muito grande. Maximo 5MB.');input.value='';return;}if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)){showToast('Formato invalido. JPG, PNG ou PDF.');input.value='';return;}const reader=new FileReader();reader.onload=(e)=>{proofFileData={name:file.name,size:file.size,type:file.type,data:e.target.result};const area=document.getElementById('proof-upload-area');const preview=document.getElementById('pf-file-preview');if(area)area.classList.add('has-file');if(preview){preview.style.display='block';preview.innerHTML=`<div class="pua-preview"><div><div class="pua-preview-name">${file.name}</div><div class="pua-preview-size">${(file.size/1024).toFixed(0)} KB</div></div><button class="pua-remove" onclick="event.stopPropagation();removeProofFile()">x</button></div>`;}const ico=document.getElementById('pua-icon');if(ico)ico.style.display='none';};reader.readAsDataURL(file);}
function removeProofFile(){proofFileData=null;const fi=document.getElementById('pf-file');if(fi)fi.value='';const prev=document.getElementById('pf-file-preview');if(prev)prev.style.display='none';const area=document.getElementById('proof-upload-area');if(area)area.classList.remove('has-file');const ico=document.getElementById('pua-icon');if(ico)ico.style.display='block';}
function registerLoyaltyClick(size,plat,type,firm){track('loyalty_checkout_click',{size,plat,type,firm});}

/* INIT */
/* ══════════════════════════════════════════════════════════════════════════
   AUTH SYSTEM — Supabase Auth + profiles
   ══════════════════════════════════════════════════════════════════════════ */
let currentUser = null;
let currentProfile = null;
let _authLoaded = false;
let _authGroup = 'login';
let _authSlide = 0;
const _authLoginBgs = ['img/auth-bg-1.webp','img/auth-bg-4.webp','img/auth-bg-3.webp','img/auth-bg-2.webp'];
const _authSignupBgs = ['img/auth-bg-5.webp','img/auth-bg-6.webp','img/auth-bg-7.webp','img/auth-bg-8.webp'];

function openAuthModal(type) {
  closeAuthModals();
  _authGroup = type === 'signup' ? 'signup' : 'login';
  document.getElementById('login-overlay').classList.add('show');
  document.body.style.overflow = 'hidden';
  // Show correct form
  const lf = document.getElementById('auth-login-form');
  const sf = document.getElementById('auth-signup-form');
  if (lf) lf.style.display = _authGroup === 'login' ? '' : 'none';
  if (sf) sf.style.display = _authGroup === 'signup' ? '' : 'none';
  goAuthSlide(0);
  startAuthCarousel();
}
function closeAuthModals() {
  document.getElementById('login-overlay').classList.remove('show');
  document.body.style.overflow = '';
  stopAuthCarousel();
  ['login-error','signup-error','signup-success'].forEach(id => {
    const el = document.getElementById(id); if(el){el.style.display='none';el.textContent='';}
  });
}

/* Google OAuth */
async function doGoogleAuth() {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) {
    showToast(error.message || 'Erro ao conectar com Google', 'error');
  }
}

/* Auth Carousel */
let _authCarouselTimer = null;
function startAuthCarousel() {
  stopAuthCarousel();
  _authCarouselTimer = setInterval(() => {
    goAuthSlide((_authSlide + 1) % 4);
  }, 6000);
}
function stopAuthCarousel() {
  if (_authCarouselTimer) { clearInterval(_authCarouselTimer); _authCarouselTimer = null; }
}
function goAuthSlide(idx) {
  _authSlide = idx;
  const bgs = _authGroup === 'login' ? _authLoginBgs : _authSignupBgs;
  const slides = document.querySelectorAll('.auth-slide[data-group="' + _authGroup + '"]');
  const dots = document.querySelectorAll('#auth-dots .auth-dot');
  // Hide all slides
  document.querySelectorAll('#auth-carousel .auth-slide').forEach(s => s.classList.remove('active'));
  if (slides[idx]) slides[idx].classList.add('active');
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  const bg = document.getElementById('auth-bg');
  if (bg) bg.style.backgroundImage = "url('" + bgs[idx] + "')";
  stopAuthCarousel();
  startAuthCarousel();
}

/* Toggle password visibility */
function togglePw(btn) {
  const input = btn.parentElement.querySelector('input');
  if (input.type === 'password') { input.type = 'text'; btn.style.color = 'var(--gold)'; }
  else { input.type = 'password'; btn.style.color = ''; }
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg; el.style.display = 'block';
}

async function doAuthLogin() {
  const email = document.getElementById('auth-login-email').value.trim();
  const pass  = document.getElementById('auth-login-pass').value;
  if (!email || !pass) return showAuthError('login-error', t('auth_preencha_email_senha'));

  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Entrando...';

  const { data, error } = await db.auth.signInWithPassword({ email, password: pass });
  btn.disabled = false; btn.textContent = 'Entrar';

  if (error) return showAuthError('login-error', error.message === 'Invalid login credentials' ? t('auth_email_senha_incorretos') : error.message);

  closeAuthModals();
  await loadUserSession(data.user);
  track('user_login', { method: 'email' });
}

async function doAuthSignup() {
  const name    = document.getElementById('auth-signup-name').value.trim();
  const email   = document.getElementById('auth-signup-email').value.trim();
  const pass    = document.getElementById('auth-signup-pass').value;
  const phone   = document.getElementById('auth-signup-phone').value.trim();
  const city    = document.getElementById('auth-signup-city').value.trim();
  const state   = document.getElementById('auth-signup-state').value.trim();
  const country = document.getElementById('auth-signup-country').value;

  if (!name || !email || !pass) return showAuthError('signup-error', t('auth_nome_email_senha'));
  if (pass.length < 6) return showAuthError('signup-error', t('auth_senha_minimo'));

  const btn = document.getElementById('signup-btn');
  btn.disabled = true; btn.textContent = 'Criando conta...';

  const { data, error } = await db.auth.signUp({
    email,
    password: pass,
    options: {
      data: { full_name: name, phone, city, state, country }
    }
  });
  btn.disabled = false; btn.textContent = 'Criar Conta';

  if (error) return showAuthError('signup-error', error.message);

  // If session returned directly, login immediately
  if (data.session) {
    closeAuthModals();
    await loadUserSession(data.user);
    track('user_signup', { method: 'email' });
    return;
  }

  // If no session (email confirmation enabled), try auto-sign-in
  if (data.user && !data.session) {
    const { data: loginData, error: loginError } = await db.auth.signInWithPassword({ email, password: pass });
    if (loginError) {
      if (loginError.message && (loginError.message.includes('not confirmed') || loginError.message.includes('Email not confirmed'))) {
        const s = document.getElementById('signup-success');
        if(s){s.textContent = t('auth_confirme_email')||'Conta criada! Verifique seu e-mail para confirmar o cadastro.';s.style.display='block';}
        return;
      }
      return showAuthError('signup-error', t('auth_signup_erro_login')||'Conta criada, mas não foi possível entrar automaticamente. Tente fazer login.');
    }
    closeAuthModals();
    await loadUserSession(loginData.user);
    track('user_signup', { method: 'email' });
    return;
  }
}

let _loggingOut = false;
async function doLogout() {
  _loggingOut = true;
  // 1. Tentar signOut via Supabase API
  try { await db.auth.signOut(); } catch(e) {}
  // 2. Limpar manualmente como fallback
  localStorage.removeItem('mc-user-auth');
  try {
    const lsKeys = [];
    for (let i = 0; i < localStorage.length; i++) lsKeys.push(localStorage.key(i));
    lsKeys.forEach(k => { if (k && k.startsWith('sb-')) localStorage.removeItem(k); });
    const ssKeys = [];
    for (let i = 0; i < sessionStorage.length; i++) ssKeys.push(sessionStorage.key(i));
    ssKeys.forEach(k => { if (k && k.startsWith('sb-')) sessionStorage.removeItem(k); });
  } catch(e) {}
  // 3. Limpar estado da app
  currentUser = null;
  currentProfile = null;
  // 4. Recarregar página
  window.location.replace(window.location.origin + window.location.pathname);
}

let _sessionLoading = false;
async function loadUserSession(user) {
  if (_sessionLoading) return;
  _sessionLoading = true;
  currentUser = user;
  const { data } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
  currentProfile = data;
  updateAuthUI(true);
  checkAnalysisGate();
  await loadUserFavs();
  applyF();
  _sessionLoading = false;
}

function updateAuthUI(loggedIn) {
  document.getElementById('auth-btns-out').style.display = loggedIn ? 'none' : 'flex';
  document.getElementById('auth-btns-in').style.display  = loggedIn ? '' : 'none';
  // Mobile menu
  const mmTop = document.getElementById('mm-auth-top');
  const mmIn  = document.getElementById('mm-auth-in');
  if (mmTop) mmTop.style.display = loggedIn ? 'none' : '';
  if (mmIn)  mmIn.style.display  = loggedIn ? '' : 'none';

  if (loggedIn && currentProfile) {
    const initial = (currentProfile.full_name || currentProfile.email || 'U').charAt(0).toUpperCase();
    document.getElementById('nav-avatar').textContent = initial;
    document.getElementById('nav-user-name').textContent = (currentProfile.full_name || currentProfile.email).split(' ')[0];

    // Update panel
    document.getElementById('up-avatar').textContent = initial;
    document.getElementById('up-name').textContent = currentProfile.full_name || 'Usuário';
    document.getElementById('up-email').textContent = currentProfile.email;
    document.getElementById('up-edit-name').value = currentProfile.full_name || '';
    document.getElementById('up-edit-phone').value = currentProfile.phone || '';
    document.getElementById('up-edit-city').value = currentProfile.city || '';
    document.getElementById('up-edit-state').value = currentProfile.state || '';
    document.getElementById('up-edit-country').value = currentProfile.country || 'Brasil';
    renderPainelLoyalty();
  }
}

async function saveProfile() {
  if (!currentUser) return;
  const updates = {
    full_name: document.getElementById('up-edit-name').value.trim(),
    phone:     document.getElementById('up-edit-phone').value.trim(),
    city:      document.getElementById('up-edit-city').value.trim(),
    state:     document.getElementById('up-edit-state').value.trim(),
    country:   document.getElementById('up-edit-country').value,
  };
  const { error } = await db.from('profiles').update(updates).eq('id', currentUser.id);
  if (!error) {
    Object.assign(currentProfile, updates);
    updateAuthUI(true);
    const ok = document.getElementById('up-save-ok');
    ok.style.display = 'block';
    setTimeout(() => ok.style.display = 'none', 3000);
    track('profile_updated');
  }
}

// Check existing session on load
async function checkAuthSession() {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      await loadUserSession(session.user);
    } else {
      updateAuthUI(false);
    }
  } catch(e) {
    updateAuthUI(false);
  }
  // Listen for auth changes
  db.auth.onAuthStateChange(async (event, session) => {
    if (_loggingOut) return;
    if (event === 'SIGNED_IN' && session?.user) {
      await loadUserSession(session.user);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProfile = null;
      updateAuthUI(false);
    }
  });
}
// Fechar dropdown do usuario ao clicar fora
document.addEventListener('click', e => {
  const dd = document.getElementById('user-dd-menu');
  if (dd && dd.classList.contains('open') && !e.target.closest('.user-menu-btn')) {
    dd.classList.remove('open');
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  // Detectar idioma e aplicar traduções
  initLang();
  // Ativar página correta ANTES de renderizar (evita flash da home)
  const _initHash = location.hash.replace('#','') || (function(){try{return sessionStorage.getItem('mc_page')||'';}catch(e){return '';}}());
  if(_initHash && document.getElementById('page-'+_initHash)){
    go(_initHash, true);
  } else {
    go('home', true);
  }
  // Revelar body após decidir a página
  document.body.style.opacity='1';
  // Preload firm background images
  // Lazy preload firm backgrounds — defer to idle time
  if('requestIdleCallback' in window) requestIdleCallback(()=>{Object.values(FIRM_BG).forEach(url=>{const img=new Image();img.src=url;});});
  else setTimeout(()=>{Object.values(FIRM_BG).forEach(url=>{const img=new Image();img.src=url;});},5000);
  // Render com dados hardcoded primeiro (UI imediata)
  renderHome();
  applyF();
  renderOffers();
  renderAwards();
  initCmp();
  loadCalendar();
  calcPS();
  renderIndHub();
  renderPlatforms();
  renderGuides();
  renderBlog();
  renderQuiz();
  renderAchFirmTabs();
  achSelectFirm(CHECKOUT_FIRMS[0]?.id || 'apex');
  renderFaq();
  renderPolicies();
  showCookieBanner();
  autoDetectDDI();

  // Mostrar botões de auth: checar token no localStorage de forma síncrona
  // Se há token Supabase, mantém escondido até checkAuthSession confirmar
  // Se não há token, mostra botões de login imediatamente
  const _hasToken = localStorage.getItem('mc-user-auth') !== null;
  if (!_hasToken) updateAuthUI(false);

  // Auto-copy coupon from email link (?copy=CODE)
  const _urlParams = new URLSearchParams(location.search);
  const _autoCopy = _urlParams.get('copy');
  if(_autoCopy){
    try {
      await navigator.clipboard.writeText(_autoCopy);
      setTimeout(()=>{
        const banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#22C55E;color:#fff;text-align:center;padding:14px 20px;font-size:15px;font-weight:700;font-family:Inter,sans-serif;animation:fadeIn .3s;';
        const _safeCopy = _autoCopy.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        banner.innerHTML = '&#10003; Coupon <strong style="letter-spacing:2px;">'+_safeCopy+'</strong> copied! Now choose your account below.';
        document.body.prepend(banner);
        setTimeout(()=>banner.remove(), 5000);
      }, 300);
    } catch(e){}
    // Clean URL
    history.replaceState(null, '', location.pathname + location.hash);
  }

  // Navegar para o hash da URL ANTES dos awaits — garante que Ctrl+F5 preserve a página
  const initHash = location.hash.replace('#','');
  if(initHash && document.getElementById('page-'+initHash)){
    go(initHash, true);
  } else {
    track('page_view', { page_name: 'home', language: navigator.language });
  }
  fetchGeo();

  // Checar se bot está ativado (hidden by default, show only if enabled)
  try{
    const{data}=await db.from('site_settings').select('value').eq('key','bot_enabled').maybeSingle();
    if(data&&data.value==='true'){
      const fab=document.getElementById('bot-fab');if(fab)fab.style.display='flex';
      const mmBot=document.getElementById('mm-bot-item');if(mmBot)mmBot.style.display='';
    }
  }catch(e){}

  // Carregar firmas e guias do Supabase
  await loadFirmsFromSupabase();
  // Detect dedicated firm page URL (e.g. /apex, /bulenox)
  const _firmSlugs=['apex','bulenox','ftmo','tpt','fn','e2t','the5ers','fundingpips','brightfunded'];
  const _pathSlug=location.pathname.replace(/^\//,'').replace(/\/$/,'').toLowerCase();
  if(_firmSlugs.includes(_pathSlug) && FIRMS.find(x=>x.id===_pathSlug)){
    window._dedicatedFirmSlug=_pathSlug;
    document.body.style.opacity='0';
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const pg=document.getElementById('page-firms');if(pg)pg.classList.add('active');
    document.querySelectorAll('.nt').forEach(t=>t.classList.toggle('active',t.dataset.p==='firms'));
    window.scrollTo(0,0);
    openD(_pathSlug);
    requestAnimationFrame(()=>{document.body.style.opacity='1';});
    // Meta Pixel: Lead event on dedicated firm page
    if(typeof fbq==='function') fbq('track','Lead',{content_name:_pathSlug});
  }
  // Reopen firm overlay from URL hash (e.g. #firm/apex)
  else if(location.hash.startsWith('#firm/')){
    const _hFirmId=location.hash.replace('#firm/','');
    if(_hFirmId && FIRMS.find(x=>x.id===_hFirmId)){
      document.body.style.opacity='0';
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      const pg=document.getElementById('page-firms');if(pg)pg.classList.add('active');
      document.querySelectorAll('.nt').forEach(t=>t.classList.toggle('active',t.dataset.p==='firms'));
      window.scrollTo(0,0);
      openD(_hFirmId);
      requestAnimationFrame(()=>{document.body.style.opacity='1';});
    }
  }
  await loadGuidesFromSupabase();
  renderGuides();
  loadDailyAnalysis();

  // Carregar fidelidade do membro logado (se tiver email salvo)
  const cachedMember = getLoyaltyMember();
  if (cachedMember?.email) {
    await loadLoyaltyFromSupabase(cachedMember.email);
  }
  // Auth session check
  await checkAuthSession();
  _authLoaded = true;
  checkAnalysisGate();
  renderLoyaltyPage();
  await initFavs();
});