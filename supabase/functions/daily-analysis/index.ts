import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY=Deno.env.get("ANTHROPIC_API_KEY")!;
const TWELVEDATA_API_KEY=Deno.env.get("TWELVEDATA_API_KEY")!;
const db=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY);
const LANGS=["pt","en","es"];

const ASSETS=[
  {ticker:"ES",name:"S&P 500",sector:"broad",sym:"SPY",futSym:"ES=F",m:9.91,corr:"Inverso ao VIX, benchmark global, reflete fluxo institucional risk-on/risk-off"},
  {ticker:"NQ",name:"Nasdaq 100",sector:"tech",sym:"QQQ",futSym:"NQ=F",m:40.45,corr:"Altamente sensivel a yields de 10Y, earnings de mega-cap tech, e expectativas de corte de juros"},
  {ticker:"GC",name:"Ouro",sector:"metals",sym:"XAU/USD",futSym:"GC=F",m:1,corr:"Porto seguro classico, inverso ao DXY e yields reais, demanda de bancos centrais"},
  {ticker:"CL",name:"Petroleo WTI",sector:"energy",sym:"USO",futSym:"CL=F",m:0.847,corr:"OPEC+ supply, geopolitica Oriente Medio, estoques EIA/API, demanda China"},
];

async function fetchRealPrice(futSym:string):Promise<number|null>{
  try{
    var r=await fetch("https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(futSym)+"?interval=1d&range=1d",
      {headers:{"User-Agent":"Mozilla/5.0"}});
    if(!r.ok)return null;
    var d=await r.json();
    var meta=d?.chart?.result?.[0]?.meta;
    if(!meta)return null;
    return meta.regularMarketPrice||meta.previousClose||null;
  }catch(e){return null;}
}

async function calcMultipliers(etfData:Record<string,any[]>):Promise<Record<string,number>>{
  var mults:Record<string,number>={};
  var fetches=ASSETS.map(async(A)=>{
    var realPrice=await fetchRealPrice(A.futSym);
    var hist=etfData[A.sym];
    if(realPrice && hist && hist.length>0){
      var etfLast=parseFloat(hist[0].close);
      if(etfLast>0){
        var dynM=realPrice/etfLast;
        if(Math.abs(dynM-A.m)/A.m<0.30){
          mults[A.ticker]=dynM;
          console.log(A.ticker+": dynamic mult="+dynM.toFixed(4)+" (real="+realPrice+", ETF="+etfLast+")");
        }else{
          console.log(A.ticker+": dynamic mult="+dynM.toFixed(4)+" rejected (too far from fallback "+A.m+"), using fallback");
          mults[A.ticker]=A.m;
        }
      }else mults[A.ticker]=A.m;
    }else{
      console.log(A.ticker+": Yahoo unavailable, using fallback mult="+A.m);
      mults[A.ticker]=A.m;
    }
  });
  await Promise.all(fetches);
  return mults;
}

function ema(c:number[],p:number):number[]{var k=2/(p+1),e=[c[0]];for(var i=1;i<c.length;i++)e.push(c[i]*k+e[i-1]*(1-k));return e;}
function rsi(c:number[],p:number):number[]{var r:number[]=[],g=0,l=0;for(var i=1;i<=p;i++){var d=c[i]-c[i-1];d>0?g+=d:l+=Math.abs(d);}var ag=g/p,al=l/p;r.push(100-100/(1+(al===0?100:ag/al)));for(var i=p+1;i<c.length;i++){var d=c[i]-c[i-1];ag=(ag*(p-1)+(d>0?d:0))/p;al=(al*(p-1)+(d<0?Math.abs(d):0))/p;r.push(100-100/(1+(al===0?100:ag/al)));}return r;}
function macd(c:number[]):{m:number[],s:number[],h:number[]}{var e12=ema(c,12),e26=ema(c,26),m:number[]=[];for(var i=0;i<c.length;i++)m.push(e12[i]-e26[i]);var s=ema(m,9),h:number[]=[];for(var i=0;i<m.length;i++)h.push(m[i]-s[i]);return{m,s,h};}
function atr(H:number[],L:number[],C:number[],p:number):number[]{var t=[H[0]-L[0]];for(var i=1;i<C.length;i++)t.push(Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1])));var a:number[]=[],s=0;for(var i=0;i<p;i++)s+=t[i];a.push(s/p);for(var i=p;i<t.length;i++)a.push((a[a.length-1]*(p-1)+t[i])/p);return a;}
function bbNow(c:number[],p:number):{u:number,m:number,l:number}{var n=c.length;if(n<p)return{u:0,m:0,l:0};var s=0;for(var i=n-p;i<n;i++)s+=c[i];var avg=s/p,sq=0;for(var i=n-p;i<n;i++)sq+=Math.pow(c[i]-avg,2);var std=Math.sqrt(sq/p);return{u:avg+2*std,m:avg,l:avg-2*std};}

function indicators(hist:any[],mult:number):string{
  if(!hist||hist.length<25)return"";
  var rev=hist.slice().reverse();
  var C=rev.map((d:any)=>parseFloat(d.close)*mult);
  var H=rev.map((d:any)=>parseFloat(d.high)*mult);
  var L=rev.map((d:any)=>parseFloat(d.low)*mult);
  var n=C.length,last=C[n-1],o:string[]=[];
  var r=rsi(C,14),rN=r[r.length-1];
  o.push("RSI(14):"+rN.toFixed(1)+(rN>70?"[OB]":rN<30?"[OS]":rN>60?"[BULL]":rN<40?"[BEAR]":"[N]"));
  var mc=macd(C),hN=mc.h[n-1],hP=mc.h[n-2],hP2=mc.h[n-3];
  o.push("MACD-H:"+hN.toFixed(2)+(hN>0&&hP<=0?"[BX]":hN<0&&hP>=0?"[SX]":hN>hP&&hP>hP2?"[ACC]":hN<hP&&hP<hP2?"[DEC]":""));
  var e9=ema(C,9)[n-1],e20=ema(C,20)[n-1],e50=ema(C,50)[n-1];
  o.push("E9:"+e9.toFixed(0)+" E20:"+e20.toFixed(0)+" E50:"+e50.toFixed(0)+"["+(e9>e20&&e20>e50?"BULL":e9<e20&&e20<e50?"BEAR":"MIX")+"]");
  var b=bbNow(C,20),bw=(b.u-b.l)/b.m*100;
  o.push("BB:U="+b.u.toFixed(0)+" M="+b.m.toFixed(0)+" L="+b.l.toFixed(0)+" BW="+bw.toFixed(1)+"%"+(bw<3?"[SQZ]":"")+(last>b.u?"[>U]":last<b.l?"[<L]":""));
  var a=atr(H,L,C,14),aN=a[a.length-1];
  o.push("ATR:"+aN.toFixed(2)+"("+( aN/last*100).toFixed(2)+"%)");
  var ranges:number[]=[];
  for(var i=n-5;i<n;i++)ranges.push(H[i]-L[i]);
  var avgRange=ranges.reduce((a,b)=>a+b,0)/ranges.length;
  o.push("RangeHoje:"+(H[n-1]-L[n-1]).toFixed(0)+" vs5d:"+avgRange.toFixed(0));
  return o.join(" | ");
}

function swings(hist:any[],m:number):string{
  if(!hist||hist.length<5)return"";
  var hs:number[]=[],ls:number[]=[];
  for(var i=0;i<Math.min(20,hist.length);i++){hs.push(parseFloat(hist[i].high)*m);ls.push(parseFloat(hist[i].low)*m);}
  var p=hist[1],pH=parseFloat(p.high)*m,pL=parseFloat(p.low)*m,pC=parseFloat(p.close)*m;
  var pp=(pH+pL+pC)/3;
  var r1=2*pp-pL,r2=pp+(pH-pL),s1=2*pp-pH,s2=pp-(pH-pL);
  return"PrevD:H="+pH.toFixed(2)+" L="+pL.toFixed(2)+" C="+pC.toFixed(2)+" | SwH10="+Math.max(...hs.slice(0,10)).toFixed(2)+" SwL10="+Math.min(...ls.slice(0,10)).toFixed(2)+" | Wk:H="+Math.max(...hs.slice(0,5)).toFixed(2)+" L="+Math.min(...ls.slice(0,5)).toFixed(2)+" | Mo:H="+Math.max(...hs).toFixed(2)+" L="+Math.min(...ls).toFixed(2)+" | PP="+pp.toFixed(2)+" R1="+r1.toFixed(2)+" R2="+r2.toFixed(2)+" S1="+s1.toFixed(2)+" S2="+s2.toFixed(2);
}

async function fetchTS(sym:string):Promise<any[]|null>{
  var r=await fetch("https://api.twelvedata.com/time_series?symbol="+sym+"&interval=1day&outputsize=25&apikey="+TWELVEDATA_API_KEY);
  var d=await r.json();if(d.status==="error")return null;return d.values||[];
}
async function fetchVIX():Promise<string>{
  try{var v=await fetchTS("VIXY");if(!v||v.length<5)return"VIX:N/A";
  var l=parseFloat(v[0].close),p=parseFloat(v[1].close),d5=parseFloat(v[4].close);
  return"VIX(VIXY):"+l.toFixed(2)+"("+((l-p)/p*100).toFixed(1)+"%)"+(l>p?"[UP=risk-off]":"[DN=risk-on]")+" 5d:"+((l-d5)/d5*100).toFixed(1)+"%";
  }catch(e){return"VIX:N/A";}
}

async function fetchCal():Promise<string>{
  try{
    var today=new Date().toISOString().slice(0,10);
    var r=await fetch(SUPABASE_URL+"/functions/v1/economic-calendar?lang=en",{
      headers:{"Authorization":"Bearer "+SUPABASE_SERVICE_ROLE_KEY}
    });
    if(!r.ok){console.log("economic-calendar HTTP "+r.status);return"Calendario indisponivel.";}
    var data=await r.json();
    var events=data.events||[];
    var highToday=events.filter((e:any)=>e.date===today && e.importance>=3);
    var medToday=events.filter((e:any)=>e.date===today && e.importance===2);
    if(!highToday.length && !medToday.length){
      var tmr=new Date();tmr.setDate(tmr.getDate()+1);
      var tmrStr=tmr.toISOString().slice(0,10);
      var highTmr=events.filter((e:any)=>e.date===tmrStr && e.importance>=3);
      if(highTmr.length)return"HOJE: Sem eventos de alto impacto. AMANHA: "+highTmr.map((e:any)=>"[HIGH]"+e.time+" "+e.currency+" "+e.event+(e.forecast?" (Prev:"+e.forecast+")":"")).join(" | ");
      return"Sem eventos macro de alto impacto hoje. Dia tecnico.";
    }
    var parts:string[]=[];
    if(highToday.length){
      parts.push("ALTO IMPACTO:");
      highToday.forEach((e:any)=>{
        var s="["+e.time+"]"+e.currency+" "+e.event;
        if(e.previous)s+=" Ant:"+e.previous;
        if(e.forecast)s+=" Prev:"+e.forecast;
        if(e.actual)s+=" REAL:"+e.actual;
        parts.push(s);
      });
    }
    if(medToday.length){
      parts.push("MEDIO:");
      medToday.slice(0,6).forEach((e:any)=>{
        parts.push("["+e.time+"]"+e.currency+" "+e.event+(e.forecast?" Prev:"+e.forecast:"")+(e.actual?" Real:"+e.actual:""));
      });
    }
    console.log("Cal: "+highToday.length+"H "+medToday.length+"M");
    return parts.join("\n");
  }catch(e:any){console.error("fetchCal:"+e.message);return"Erro calendario.";}
}

async function fetchNews():Promise<string>{
  var k=Deno.env.get("FINNHUB_API_KEY")||"";if(!k)return"";try{
  var r=await fetch("https://finnhub.io/api/v1/news?category=general",{headers:{"X-Finnhub-Token":k}});
  var n=await r.json();if(!Array.isArray(n))return"";
  return n.slice(0,6).map((x:any)=>x.headline).join(" | ");
  }catch(e){return"";}
}

async function fetchGEX(today:string):Promise<Record<string,string>>{
  var gexCtx:Record<string,string>={};
  try{
    var{data}=await db.from("gex_levels").select("*").eq("date",today);
    if(!data||!data.length){
      // Try yesterday if today not available yet
      var yd=new Date(today+"T12:00:00");yd.setDate(yd.getDate()-1);
      if(yd.getDay()===0)yd.setDate(yd.getDate()-2); // Skip Sunday
      if(yd.getDay()===6)yd.setDate(yd.getDate()-1); // Skip Saturday
      var ydStr=yd.toISOString().slice(0,10);
      var{data:ydData}=await db.from("gex_levels").select("*").eq("date",ydStr);
      data=ydData;
    }
    if(!data||!data.length)return gexCtx;
    for(var row of data){
      var t=row.ticker; // ES or NQ
      var regime=parseFloat(row.total_gex)>=0?"POSITIVO (market makers suprimem volatilidade, dia de range)":"NEGATIVO (market makers amplificam movimentos, dia de tendencia/volatilidade)";
      var ctx="GEX DATA (Gamma Exposure dos market makers - CBOE):\n";
      ctx+="Regime: GEX Total "+row.total_gex+"M = "+regime+"\n";
      ctx+="Zero Gamma (Gamma Flip): "+row.zero_gamma+" — NIVEL MAIS IMPORTANTE. Acima: market makers compram quedas (suporte). Abaixo: amplificam quedas (perigo).\n";
      ctx+="Put Wall (suporte forte): "+row.put_wall+" — maior concentracao de puts, market makers compram aqui.\n";
      ctx+="Call Wall (resistencia forte): "+row.call_wall+" — maior concentracao de calls, market makers vendem aqui.\n";
      ctx+="HVL (High Volume Level): "+row.hvl+" — preco tende a grudar nesse nivel, maior open interest.\n";
      ctx+="Vol Trigger: "+row.vol_trigger+" — acima = volatilidade suprimida, abaixo = volatilidade expande.\n";
      ctx+="Max Pain: "+row.max_pain+" — strike onde opcoes expiram com menor valor, preco gravita pra ca perto do vencimento.\n";
      ctx+="Spot: "+row.spot_price;
      gexCtx[t]=ctx;
      console.log("GEX "+t+": zero="+row.zero_gamma+" put="+row.put_wall+" call="+row.call_wall+" total="+row.total_gex+"M");
    }
  }catch(e:any){console.error("fetchGEX error:"+e.message);}
  return gexCtx;
}

async function processAsset(A:any, hist:any[]|null, dynMults:Record<string,number>, today:string, vix:string, cal:string, news:string, gexCtx:Record<string,string>):Promise<{result?:any,error?:string}>{
  if(!hist||hist.length<10)return{error:A.ticker+":no data"};
  try{
    var mult=dynMults[A.ticker]||A.m;
    var ind=indicators(hist,mult);
    var sw=swings(hist,mult);
    var last=parseFloat(hist[0].close)*mult,prevC=parseFloat(hist[1].close)*mult;
    var chg=(last-prevC)/prevC*100;
    var prices=hist.slice(0,15).map((d:any)=>d.datetime+":O="+(parseFloat(d.open)*mult).toFixed(2)+" H="+(parseFloat(d.high)*mult).toFixed(2)+" L="+(parseFloat(d.low)*mult).toFixed(2)+" C="+(parseFloat(d.close)*mult).toFixed(2)).join("\n");

    var accCtx="";
    try{
      var accDays:string[]=[];
      for(var dd=1;dd<=5;dd++){
        var yd=new Date(today+"T12:00:00");yd.setDate(yd.getDate()-dd);
        if(yd.getDay()===0||yd.getDay()===6)continue;
        var{data:prev}=await db.from("daily_analysis").select("bias,confidence,last_price,date").eq("date",yd.toISOString().slice(0,10)).eq("asset",A.ticker).maybeSingle();
        if(prev){
          var pp=parseFloat(prev.last_price);
          var nextIdx=hist.findIndex((h:any)=>h.datetime<=prev.date);
          var nextPrice=nextIdx>0?parseFloat(hist[nextIdx-1].close)*mult:last;
          var ok=(prev.bias==="bullish"&&nextPrice>pp)||(prev.bias==="bearish"&&nextPrice<pp)||prev.bias==="neutral";
          accDays.push(prev.date.slice(5)+":"+prev.bias+"("+prev.confidence+") "+pp.toFixed(0)+"->"+nextPrice.toFixed(0)+" "+(ok?"OK":"MISS"));
        }
      }
      if(accDays.length){
        var hits=accDays.filter(d=>d.includes("OK")).length;
        accCtx="Track record "+hits+"/"+accDays.length+" ("+Math.round(hits/accDays.length*100)+"%): "+accDays.join(" | ")+"\nCalibrar confianca com base nisso.";
      }
    }catch(e){}

    // GEX context for ES and NQ
    var gexBlock=gexCtx[A.ticker]||"";    
    var gexInstructions=gexBlock?`

INSTRUCOES GEX (OBRIGATORIO para ES e NQ):
- SEMPRE referencie os niveis GEX nos cenarios bull/bear como suportes/resistencias adicionais.
- O Zero Gamma e o nivel mais importante do dia. Mencione-o no CONTEXT e na ATTENTION_ZONE.
- Se o preco esta ACIMA do Zero Gamma: ambiente de range, market makers suprimem vol. Opere reversoes.
- Se o preco esta ABAIXO do Zero Gamma: ambiente de tendencia, movimentos amplificados. Opere breakouts.
- Put Wall = suporte forte dos market makers. Call Wall = resistencia forte.
- Integre o regime GEX (positivo/negativo) na analise de volatilidade (VIX_CONTEXT e VOLUME_ANALYSIS).
- Use Max Pain como referencia para onde o preco pode gravitar no vencimento de opcoes.
- Vol Trigger: acima dele vol suprimida, abaixo vol expande. Combine com VIX.
`:"";

    var prompt=A.ticker+" "+A.name+" @"+last.toFixed(2)+" ("+chg.toFixed(2)+"%) "+A.corr+"\n"+accCtx+"\n"+vix+"\n"+ind+"\n"+sw+"\n"+(gexBlock?gexBlock+"\n":"")+prices+"\nCalendario:\n"+cal+"\nNews:"+news+gexInstructions+`

Voce e o analista-chefe de um dos maiores hedge funds do mundo. Traders profissionais e iniciantes confiam na sua analise pra operar. Sua marca: PRECISAO CIRURGICA e CLAREZA ABSOLUTA.

TOM E LINGUAGEM:
- Profissional mas acessivel a TODOS. Um iniciante de 18 anos deve entender cada frase. Um gestor de fundo deve respeitar a profundidade.
- Se usar termo tecnico, SEMPRE explique entre parenteses na primeira vez. Ex: "RSI (indicador de forca do movimento) em 62 mostra compradores no controle."
- Seja DIRETO e ASSERTIVO. Nada de "talvez", "possivelmente", "pode ser". Opiniao clara: "O cenario mais provavel e X porque Y."

REGRAS INVIOLAVEIS:
1. Use APENAS dados fornecidos. NUNCA invente precos ou eventos.
2. NUNCA recomende compra/venda. Apresente cenarios com probabilidade.
3. CONFIDENCE deve ser COERENTE com a probabilidade do cenario principal. Se bear tem 65%, confidence deve ser 4+. Se 50/50, confidence = 2-3.
4. CADA nivel de suporte/resistencia deve ter JUSTIFICATIVA entre parenteses: "Suporte em 6605 (confluencia EMA20 + Pivot S1 + minima de ontem)".
5. TODOS os eventos de alto impacto do calendario devem ser mencionados em TODOS os ativos, explicando o mecanismo de transmissao especifico pra ESTE ativo.
6. NUNCA dizer "sem eventos relevantes" se ha eventos listados no calendario.
7. Se um dado ja foi publicado (tem valor REAL), compare com previsao e explique o impacto.

TRADUCAO DE EVENTOS:
- No campo PT: traduzir nomes dos eventos. Ex: "Durable Goods Orders" = "Pedidos de Bens Duraveis", "Consumer Confidence" = "Confianca do Consumidor", "Initial Jobless Claims" = "Pedidos de Seguro-Desemprego", "Non-Farm Payrolls" = "Folha de Pagamento Nao-Agricola", "CPI" = "Indice de Precos ao Consumidor", "PPI" = "Indice de Precos ao Produtor", "Retail Sales" = "Vendas no Varejo", "GDP" = "PIB", "FOMC" = "Reuniao do Fed", "PMI" = "Indice de Gerentes de Compras", "Trade Balance" = "Balanca Comercial", "Housing Starts" = "Inicio de Construcoes", "Crude Oil Inventories" = "Estoques de Petroleo".
- No campo EN: manter em ingles.
- No campo ES: traduzir pro espanhol.

ESTRUTURA (3 idiomas: {pt,en,es}). Max 3-4 frases DENSAS por campo:

1. CONTEXT: Narrativa macro COMPLETA. Mencione correlacoes inter-mercado (VIX, DXY, yields).`+(gexBlock?" Integre o regime GEX e o Zero Gamma na narrativa.":"")+` Conecte os eventos do calendario ao contexto. Como o mercado chegou ate aqui e pra onde aponta.

2. VOLUME_ANALYSIS: Range vs media, expansao/contracao de volatilidade. O que isso diz sobre participacao institucional (smart money ativo ou ausente?).`+(gexBlock?" Referencie o regime GEX (positivo=range, negativo=trending).":"")+`

3. SCENARIO_BULL: "Gatilho: rompimento acima de X (justificativa do nivel). Alvo 1: Y (justificativa). Alvo 2: Z. Stop: W (justificativa). Probabilidade: N%." Cada numero justificado. STOP PRECISO: o stop DEVE ser cirurgico e apertado — baseado no swing low/high mais proximo, EMA mais relevante, ou nivel estrutural claro (ex: fundo do candle anterior, POC, Put Wall). Distancia maxima: 0.5-0.8% do preco de entrada para futuros (ES/NQ/CL) e 1% para ouro (GC). Um stop bem colocado gera tanta credibilidade quanto um alvo acertado. NUNCA colocar stop em nivel arbitrario ou distante sem justificativa estrutural.`+(gexBlock?" Use Call Wall como resistencia e HVL como referencia.":"")+`

4. SCENARIO_BEAR: Mesmo formato. Cada numero justificado. Mesma regra de stop preciso: swing high mais proximo, EMA, nivel estrutural. Stop apertado e justificado.`+(gexBlock?" Use Put Wall como suporte e Zero Gamma como nivel-chave.":"")+`

5. NEWS_IMPACT: Conecte CADA evento/noticia a ESTE ativo com mecanismo de transmissao. Ex: "Pedidos de Bens Duraveis abaixo do esperado (-1.4% vs -0.5%) → sinal de desaceleracao industrial → Fed pode cortar juros mais cedo → positivo pra NQ (growth se beneficia de juros menores)".

6. EVENTS: Liste TODOS os eventos de alto impacto do dia com horario ET. Pra cada um: o que e, previsao, e o que significaria resultado acima/abaixo do esperado PARA ESTE ATIVO. Se dado ja saiu, analise o resultado.

7. ATTENTION_ZONE: Zona MAIS IMPORTANTE do dia com CONFLUENCIA de pelo menos 2 fatores tecnicos`+(gexBlock?" E niveis GEX":"")+`: "Zona 6600-6610 e critica (EMA20 em 6605 + Pivot S1 em 6608 + minima da sessao anterior em 6601`+(gexBlock?" + Zero Gamma em 6604":"")+`)".

8. VIX_CONTEXT: Nivel atual, tendencia, e impacto direto neste ativo.`+(gexBlock?" Combine com o regime GEX: VIX alto + GEX negativo = volatilidade maxima. VIX baixo + GEX positivo = range apertado.":"")+`

9. INDICATORS_SUMMARY: INTERPRETE, nao repita numeros. "Momentum comprador (RSI bull zone + MACD acelerando), mas estrutura de medias ainda bearish (preco abaixo da EMA50) limita upside." Identifique confluencias E divergencias.

10. MARKET_PHASE: Fase Wyckoff com evidencia do price action.

CAMPOS NUMERICOS OBRIGATORIOS (alem do JSON de texto): extraia os numeros exatos dos cenarios bull e bear. Esses campos sao usados para tracking de acuracia — DEVEM ser numeros puros, sem texto.

JSON puro (sem markdown, sem code blocks):
{"bias":"bullish|bearish|neutral","confidence":1-5,"market_phase":{"pt":"..","en":"..","es":".."},"support_1":"num","support_2":"num","resistance_1":"num","resistance_2":"num","bull_trigger":num,"bull_target_1":num,"bull_target_2":num,"bull_stop":num,"bull_probability":num,"bear_trigger":num,"bear_target_1":num,"bear_target_2":num,"bear_stop":num,"bear_probability":num,"attention_zone":{"pt":"..","en":"..","es":".."},"context":{"pt":"..","en":"..","es":".."},"volume_analysis":{"pt":"..","en":"..","es":".."},"indicators_summary":{"pt":"..","en":"..","es":".."},"scenario_bull":{"pt":"..","en":"..","es":".."},"scenario_bear":{"pt":"..","en":"..","es":".."},"news_impact":{"pt":"..","en":"..","es":".."},"events":{"pt":"..","en":"..","es":".."},"vix_context":{"pt":"..","en":"..","es":".."}}`;

    console.log("Claude:"+A.ticker+"@"+last.toFixed(0)+" mult="+mult.toFixed(4)+(gexBlock?" +GEX":""));
    var r=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:6000,messages:[{role:"user",content:prompt}]}),
    });
    var data=await r.json();
    if(data.error)throw new Error(data.error.message);
    var txt=data.content?.[0]?.text||"";
    if(!txt)throw new Error("empty response");
    if(data.stop_reason==="max_tokens")throw new Error("truncated (max_tokens)");
    var analysis=JSON.parse(txt.replace(/```json/g,"").replace(/```/g,"").trim());

    function eo(v:any):any{if(v==null)return null;if(typeof v==="string"){var o:any={};LANGS.forEach(l=>o[l]=v);return o;}return v;}

    var row={
      date:today,asset:A.ticker,asset_name:A.name,last_price:last,change_pct:parseFloat(chg.toFixed(2)),
      bias:analysis.bias,confidence:Math.min(5,Math.max(1,parseInt(analysis.confidence)||3)),
      support_1:String(analysis.support_1||""),support_2:String(analysis.support_2||""),
      resistance_1:String(analysis.resistance_1||""),resistance_2:String(analysis.resistance_2||""),
      attention_zone:eo(analysis.attention_zone),context:eo(analysis.context),
      volume_analysis:eo(analysis.volume_analysis),scenario_bull:eo(analysis.scenario_bull),
      scenario_bear:eo(analysis.scenario_bear),news_impact:eo(analysis.news_impact),events:eo(analysis.events),
      market_phase:eo(analysis.market_phase),
      indicators_summary:eo(analysis.indicators_summary),
      vix_context:eo(analysis.vix_context),
    };
    var dbr=await db.from("daily_analysis").upsert(row,{onConflict:"date,asset"});
    if(dbr.error)return{error:A.ticker+":DB "+dbr.error.message};

    // Save targets for accuracy tracking
    var targets={
      date:today,asset:A.ticker,entry_price:last,
      bull_trigger:parseFloat(analysis.bull_trigger)||null,
      bull_target_1:parseFloat(analysis.bull_target_1)||null,
      bull_target_2:parseFloat(analysis.bull_target_2)||null,
      bull_stop:parseFloat(analysis.bull_stop)||null,
      bull_probability:parseInt(analysis.bull_probability)||null,
      bear_trigger:parseFloat(analysis.bear_trigger)||null,
      bear_target_1:parseFloat(analysis.bear_target_1)||null,
      bear_target_2:parseFloat(analysis.bear_target_2)||null,
      bear_stop:parseFloat(analysis.bear_stop)||null,
      bear_probability:parseInt(analysis.bear_probability)||null,
    };
    var tdr=await db.from("analysis_targets").upsert(targets,{onConflict:"date,asset"});
    if(tdr.error)console.error(A.ticker+":targets DB "+tdr.error.message);
    else console.log(A.ticker+":targets saved bull="+targets.bull_target_1+"/"+targets.bull_target_2+" bear="+targets.bear_target_1+"/"+targets.bear_target_2);

    console.log(A.ticker+":"+row.bias+"("+row.confidence+") @"+last.toFixed(0));
    return{result:{asset:A.ticker,bias:row.bias,conf:row.confidence,price:last,mult:mult.toFixed(4)}};
  }catch(e:any){console.error(A.ticker+":"+e.message);return{error:A.ticker+":"+e.message};}
}

Deno.serve(async function(req:Request){
  var today=new Date().toISOString().slice(0,10);
  console.log("=== v28 "+today+" (GEX integration) ===");

  var[cal,news,vix,gexCtx,...raw]=await Promise.all([fetchCal(),fetchNews(),fetchVIX(),fetchGEX(today),fetchTS("SPY"),fetchTS("QQQ"),fetchTS("XAU/USD"),fetchTS("USO")]);
  console.log("Cal:",cal.slice(0,200));

  var etfMap:Record<string,any[]>={};
  ASSETS.forEach((A,i)=>{if(raw[i])etfMap[A.sym]=raw[i];});
  var dynMults=await calcMultipliers(etfMap);
  var outcomes=await Promise.all(ASSETS.map((A,i)=>processAsset(A,raw[i],dynMults,today,vix,cal,news,gexCtx)));

  var results:any[]=[], errors:string[]=[];
  outcomes.forEach(o=>{if(o.result)results.push(o.result);if(o.error)errors.push(o.error);});
  console.log("Done:"+results.length+"/4");
  return new Response(JSON.stringify({success:results.length>0,date:today,processed:results.length,results,errors:errors.length?errors:undefined},null,2),{headers:{"Content-Type":"application/json","Connection":"keep-alive"}});
});
