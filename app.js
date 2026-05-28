var _currentPage = 'home';
// ─── TRACKING SPY (dev) — ativa com ?spy=1 na URL ───
(function(){try{
  if(!new URLSearchParams(location.search).has('spy'))return;
  const hits={ga4:[],fb:[]};
  const capture=(url)=>{
    try{
      if(url.includes('google-analytics.com')||url.includes('/g/collect')){
        const u=new URL(url);
        hits.ga4.push({en:u.searchParams.get('en'),id:u.searchParams.get('ep.event_id')||u.searchParams.get('event_id'),t:Date.now()});
      }
      if(url.includes('facebook.com/tr')){
        const u=new URL(url);
        hits.fb.push({ev:u.searchParams.get('ev'),id:u.searchParams.get('eid')||u.searchParams.get('event_id'),t:Date.now()});
      }
    }catch(e){}
  };
  const of=window.fetch;
  window.fetch=function(...a){const u=typeof a[0]==='string'?a[0]:a[0]?.url||'';capture(u);return of.apply(this,a);};
  const osend=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(m,u){capture(u||'');return osend.apply(this,arguments);};
  if(navigator.sendBeacon){
    const osb=navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon=function(u,d){
      capture(u||'');
      // Se for POST com body, GA4 manda múltiplos eventos num só beacon — tenta parsear
      try{
        if(d && typeof d==='string' && (u.includes('google-analytics.com')||u.includes('/g/collect'))){
          d.split('\n').forEach(line=>{
            const p=new URLSearchParams(line);
            const en=p.get('en');
            if(en) hits.ga4.push({en,id:p.get('ep.event_id')||p.get('event_id'),t:Date.now()});
          });
        }
      }catch(e){}
      return osb(u,d);
    };
  }
  const OI=window.Image;
  window.Image=function(){const i=new OI();Object.defineProperty(i,'src',{set(v){capture(v||'');i.setAttribute('src',v);},get(){return i.getAttribute('src');}});return i;};
  window._trackHits=hits;
  window._snap=(label)=>{
    const ga=hits.ga4.slice(),fb=hits.fb.slice();
    hits.ga4.length=0;hits.fb.length=0;
    const gaStr=ga.map(h=>h.en+(h.id?' #'+h.id.slice(0,8):' NO_ID')).join(' | ')||'(nada)';
    const fbStr=fb.map(h=>h.ev+(h.id?' #'+h.id.slice(0,8):' NO_ID')).join(' | ')||'(nada)';
    const msg=`── ${label} ──\nGA4 (${ga.length}): ${gaStr}\nFB  (${fb.length}): ${fbStr}`;
    console.log('%c'+msg,'color:#F7B928;font-weight:bold;font-size:13px');
    return msg;
  };
  // Painel flutuante pra disparar _snap sem digitar no console
  const mk=()=>{
    const d=document.createElement('div');
    d.id='spy-panel';
    d.style.cssText='position:fixed;top:72px;right:12px;z-index:999999;background:#0b1020;border:2px solid #F7B928;border-radius:10px;padding:10px;font:12px monospace;color:#fff;max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,.6)';
    d.innerHTML='<div style="color:#F7B928;font-weight:700;margin-bottom:6px">TRACKING SPY</div><div id="spy-log" style="max-height:260px;overflow:auto;white-space:pre-wrap;font-size:10px;line-height:1.4;margin-bottom:8px;color:#cfd6e4"></div><div style="display:flex;flex-wrap:wrap;gap:4px"><button data-a="page_load">page</button><button data-a="firm_open">firm</button><button data-a="copy_coupon">copy</button><button data-a="checkout">checkout</button><button data-a="__clear">clear</button></div>';
    d.querySelectorAll('button').forEach(b=>{
      b.style.cssText='background:#F7B928;color:#0b1020;border:0;padding:4px 8px;border-radius:4px;font:600 10px monospace;cursor:pointer';
      b.onclick=(e)=>{
        e.stopPropagation();
        const a=b.getAttribute('data-a');
        const log=d.querySelector('#spy-log');
        if(a==='__clear'){log.textContent='';return;}
        const msg=window._snap(a);
        log.textContent=(log.textContent?log.textContent+'\n\n':'')+msg;
        log.scrollTop=log.scrollHeight;
      };
    });
    document.body.appendChild(d);
  };
  if(document.body)mk();else document.addEventListener('DOMContentLoaded',mk);
  console.log('%c✅ Tracking spy ativo (?spy=1)','color:#22C55E;font-weight:bold');
}catch(e){console.warn('spy error',e);}})();
// ─── SUPABASE CONFIG ───
const SUPABASE_URL  = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
// Clear expired session BEFORE client init to prevent token refresh hang
(function(){try{const raw=localStorage.getItem('mc-user-auth');if(!raw)return;const s=JSON.parse(raw);if(s.expires_at&&s.expires_at<Math.floor(Date.now()/1000)){localStorage.removeItem('mc-user-auth');}}catch(e){}})();
const _dbOpts = { auth: { storageKey: 'mc-user-auth', lock: async (name, acquireTimeout, fn) => await fn(), autoRefreshToken: false, persistSession: true } };
let db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, _dbOpts);
// ────────────────────────────────────────────────────────────────────────────

// Session ID único por visita (não persiste entre abas)
const MC_SESSION = sessionStorage.getItem('mc_sid') || (()=>{
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'sid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  sessionStorage.setItem('mc_sid', id);
  return id;
})();

// Decode recursivo de UTMs — Meta as vezes manda double-encoded (%255B -> %5B -> [).
// URLSearchParams decodifica 1x; se o valor ainda parece encoded, decodifica de novo
// ate estabilizar. Failsafe: se decode falhar, retorna o ultimo valor valido.
function safeDecodeUtm(s){
  if(!s) return '';
  let cur = String(s), prev = '';
  for(let i=0; i<3 && cur !== prev; i++){
    prev = cur;
    try { cur = decodeURIComponent(cur); } catch(e){ return prev; }
  }
  return cur;
}

// Capturar UTMs da URL uma vez e guardar na sessão
const MC_UTM = (()=>{
  const stored = sessionStorage.getItem('mc_utm');
  if (stored) return JSON.parse(stored);
  const p = new URLSearchParams(window.location.search);
  const _g = (k) => safeDecodeUtm(p.get(k) || '');
  // Detect Telegram referrer (t.me, web.telegram.org) — auto-tag as social/telegram
  const ref = document.referrer || '';
  let refHost = '';
  try { refHost = ref ? new URL(ref).hostname : ''; } catch(_) {}
  const isTelegram = /(^|\.)t\.me$|telegram\.org$/i.test(refHost);
  // For firm slug landings from Telegram, auto-fill flash_promo campaign
  const firmSlug = (location.pathname.match(/^\/(apex|bulenox|ftmo|fn|e2t|the5ers|fundingpips|brightfunded|e8|cti)\/?$/i)||[])[1];
  const utm = {
    utm_source:   _g('utm_source')   || (isTelegram ? 'telegram' : (refHost || '')),
    utm_medium:   _g('utm_medium')   || (isTelegram ? 'referral' : ''),
    utm_campaign: _g('utm_campaign') || (isTelegram && firmSlug ? 'flash_promo' : (isTelegram ? 'channel' : '')),
    utm_content:  _g('utm_content')  || (firmSlug || ''),
    utm_term:     _g('utm_term')     || '',
    referrer:     ref,
  };
  sessionStorage.setItem('mc_utm', JSON.stringify(utm));
  return utm;
})();

// Anonymous ID persistente (1 ano) — sobrevive entre sessoes, pra atribuicao campanha→cupom→venda
const MC_ANON = (()=>{
  let a = localStorage.getItem('mc_anon');
  if (!a) {
    a = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem('mc_anon', a);
  }
  return a;
})();

// Attribution first-touch (janela 7 dias) — pra linkar campanha Meta/Google ao click de cupom
const MC_ATTR = (()=>{
  const p = new URLSearchParams(window.location.search);
  const _g = (k) => safeDecodeUtm(p.get(k) || '');
  const fbclid = p.get('fbclid') || '';
  const gclid = p.get('gclid') || '';
  const ttclid = p.get('ttclid') || '';
  const hasNew = fbclid || gclid || ttclid || p.get('utm_campaign') || p.get('utm_source');
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem('mc_attribution') || 'null'); } catch(_) {}
  const now = Date.now();
  if (stored && (now - stored.ts) < 7*86400000 && !hasNew) return stored;
  const attr = {
    ts: now,
    fbclid, gclid, ttclid,
    utm_source:   _g('utm_source')   || MC_UTM.utm_source   || '',
    utm_medium:   _g('utm_medium')   || MC_UTM.utm_medium   || '',
    utm_campaign: _g('utm_campaign') || MC_UTM.utm_campaign || '',
    utm_content:  _g('utm_content')  || MC_UTM.utm_content  || '',
    utm_term:     _g('utm_term')     || MC_UTM.utm_term     || '',
    referrer:     document.referrer || '',
    landing_page: location.pathname + location.search,
  };
  if (hasNew || !stored) localStorage.setItem('mc_attribution', JSON.stringify(attr));
  return attr;
})();

// Apex: roteia 100% via /member/aff/go/evertonmiranda (homepage #products) pra garantir
// cookie afiliado. Deep-link de plano nao e possivel — amember reescreve URL no redirect.
// Bug historico: usar dashboard.apextraderfunding.com/signup/...?referralCode= NAO seta
// cookie e gera "vendas sem click" no painel (ex: 3 vendas / 1 click em 2026-04-29).
//
// Sub_id (?keyword=) injection movido pra tracking.js em 2026-04-30 — unifica Apex+Bulenox
// com cascata utm_term > utm_campaign > fbclid > utm_source > mcsite.

// Append query params ANTES do hash (#fragment).
// FIX 2026-05-05: padrão antigo `url += (url.includes('?')?'&':'?') + 'utm=...'`
// quebrava quando a URL tinha #anchor (ex: apex `/aff/go/X#block_660bfb7d`) —
// utm caía dentro do hash (UTMs perdidos pra Apex/Bulenox).
function _appendQuery(url, qs) {
  if (!qs || typeof url !== 'string') return url;
  const hashIdx = url.indexOf('#');
  const beforeHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const hash       = hashIdx >= 0 ? url.slice(hashIdx)    : '';
  const sep = beforeHash.indexOf('?') >= 0 ? '&' : '?';
  return beforeHash + sep + qs + hash;
}

// ─── SAME-TAB REDIRECT + OVERLAY + ABANDON TRACKING ───
// window.location.href elimina about:blank gap.
// Overlay 'Redirecionando para X' = feedback visual imediato.
// pagehide listener loga tempo no overlay antes de sair (firma carregou ou abandonou).
function mcOpenFirm(firmId, finalUrl, coupon, firmName){
  const startTs = Date.now();
  const _safeErr = (e) => { try { return String(e?.message || e || '').slice(0,200); } catch { return 'unknown'; } };
  // Validação inicial: URL precisa ser string válida
  if (!finalUrl || typeof finalUrl !== 'string' || !/^https?:\/\//.test(finalUrl)) {
    try { if (typeof track === 'function') track('firm_redirect_failed', { firm_id: firmId, stage: 'invalid_url', err: 'url_missing_or_invalid', url: String(finalUrl).slice(0,120) }); } catch(e){}
    // Sem URL não tem o que abrir — retorna em vez de window.location undefined
    return;
  }
  // Inject sub_id (?keyword=fb_<adname>) ANTES do redirect.
  try {
    if (typeof window.mcInjectKeyword === 'function') finalUrl = window.mcInjectKeyword(finalUrl);
  } catch(e){
    try { if (typeof track === 'function') track('firm_redirect_failed', { firm_id: firmId, stage: 'inject_keyword', err: _safeErr(e), url: finalUrl.slice(0,120) }); } catch{}
  }

  // Overlay visual com contexto (cupom + desconto reforçam motivo do click).
  try {
    const ov = document.getElementById('mc-redirect-ov');
    const fn = document.getElementById('mc-redirect-firm');
    const cp = document.getElementById('mc-redirect-coupon');
    const fb = document.getElementById('mc-redirect-fallback');
    const ds = document.getElementById('mc-redirect-discount');
    if (fn) fn.textContent = firmName || 'a firma';
    if (cp) cp.textContent = coupon || '';
    if (cp) cp.parentElement.style.display = coupon ? '' : 'none';
    // Discount inline (busca FIRMS pra info)
    try {
      const f = (typeof FIRMS !== 'undefined' ? FIRMS : []).find(x=>x.id===firmId);
      if (ds && f?.discount) ds.textContent = `${f.discount}% OFF`;
      else if (ds) ds.textContent = '';
    } catch(e){}
    if (fb) {
      fb.style.display = 'none';
      fb.href = finalUrl;
    }
    if (ov) ov.style.display = 'flex';
  } catch(e){
    try { if (typeof track === 'function') track('firm_redirect_failed', { firm_id: firmId, stage: 'overlay_render', err: _safeErr(e) }); } catch{}
  }

  // Track inicio com keepalive — não perde se user fechar muito rápido.
  try {
    if (typeof track === 'function') track('firm_redirect', {firm_id:firmId, firm_name:firmName, coupon_code:coupon||null, to_url:finalUrl});
  } catch(e){}

  // Fallback CTA aparece após 5s — recupera abandono em conexão lenta / Instagram in-app
  let fbTimer = null, panicTimer = null;
  try {
    fbTimer = setTimeout(() => {
      const fb = document.getElementById('mc-redirect-fallback');
      const sub = document.getElementById('mc-redirect-sub');
      if (fb) fb.style.display = '';
      if (sub) sub.textContent = 'Demorou mais que o normal — toque no botão pra abrir manualmente';
    }, 5000);
    // Após 12s mostra "algo deu errado" — page provavelmente bloqueada (in-app browsers, etc)
    panicTimer = setTimeout(() => {
      const sub = document.getElementById('mc-redirect-sub');
      if (sub) { sub.textContent = '⚠ Não carregou — tente abrir manualmente ou fora do app do Instagram/TikTok'; sub.style.color = '#EF4444'; }
    }, 12000);
  } catch(e){}

  // Unload listener — fetch keepalive + connection type pra distinguir 4G ruim de desinteresse
  try {
    const onPageHide = () => {
      try { if (fbTimer) clearTimeout(fbTimer); if (panicTimer) clearTimeout(panicTimer); } catch(e){}
      const elapsed = Date.now() - startTs;
      // Threshold ajustado (mobile 4G normal fica 3-5s):
      // <3s = fast · 3-12s = slow · >12s = abandoned
      const category = elapsed < 3000 ? 'fast' : (elapsed < 12000 ? 'slow' : 'abandoned');
      try {
        const payload = JSON.stringify({
          session_id: typeof MC_SESSION !== 'undefined' ? MC_SESSION : null,
          event: 'firm_redirect_unload',
          firm_id: firmId || null,
          params: {
            firm_name: firmName, to_url: finalUrl, elapsed_ms: elapsed, category,
            anon_id: typeof MC_ANON !== 'undefined' ? MC_ANON : null,
            connection_type: (navigator.connection && navigator.connection.effectiveType) || null,
          },
        });
        // CORS: credentials:omit pra Supabase wildcard ACAO:*
        fetch(SUPABASE_URL+'/rest/v1/events', {
          method: 'POST', keepalive: true, credentials: 'omit',
          headers: { 'Content-Type':'application/json', 'apikey':SUPABASE_ANON },
          body: payload
        }).catch(()=>{});
      } catch(e){}
    };
    window.addEventListener('pagehide', onPageHide, { once: true });
  } catch(e){
    try { if (typeof track === 'function') track('firm_redirect_failed', { firm_id: firmId, stage: 'unload_listener', err: _safeErr(e) }); } catch{}
  }
  // Redirect final — captura exceção raríssima de browser bloqueado/CSP
  try {
    window.location.href = finalUrl;
  } catch(e){
    try { if (typeof track === 'function') track('firm_redirect_failed', { firm_id: firmId, stage: 'navigation', err: _safeErr(e), url: finalUrl.slice(0,120) }); } catch{}
  }
}

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

// ─── GA4 funnel allowlist: nome interno do site → nome PADRÃO GA4 ───
// SÓ esses eventos vão pro dataLayer (logo, pro GA4 + Meta Pixel via GTM).
// Todo o resto (instrumentação interna: tab_hidden, idle, bot_*, js_error,
// quiz_*, scroll_depth, drawer_select, etc) fica SÓ no Supabase — não polui o GA4.
// 1 nome por ação. Coordenado com o container GTM-WJGTVX8G (triggers nesses nomes).
const GA4_FUNNEL = {
  page_view:               'page_view',
  firm_detail_open:        'view_item',
  platform_detail_open:    'view_item',
  coupon_copy:             'add_to_cart',
  copy_coupon:             'add_to_cart',   // variante legada — mesmo destino
  checkout_click:          'begin_checkout',
  loyalty_checkout_click:  'begin_checkout',
  platform_checkout_click: 'begin_checkout',
  user_signup:             'sign_up',
  loyalty_register:        'sign_up',
  newsletter_subscribe:    'subscribe',
  tool_lead_capture:       'generate_lead',
  purchase:                'purchase',
};

// Central tracking — Supabase + GTM + GA4 + Facebook Pixel + CAPI + localStorage cache
// Event priority: CAPI (server-side, ad-blocker-proof) > Supabase (first-party) > browser pixels
function track(event, params={}) {
  const ts = new Date().toISOString();
  const consentOk = localStorage.getItem('mc-cookies-consent') === 'accepted';

  // Anti-canibalização do popup giveaway: marca flags de intent de compra
  try{
    if((event==='checkout_click' || event==='coupon_copy') && params.firm_id){
      sessionStorage.setItem('mc_'+event.replace('checkout_click','checkout_clicked').replace('coupon_copy','coupon_copied')+'_'+params.firm_id,'1');
    }
  }catch(e){}

  // Generate event_id for FB deduplication (browser fbq + server CAPI) and GA4 transaction_id
  const eid = typeof crypto!=='undefined'&&crypto.randomUUID ? crypto.randomUUID() : 'e'+Date.now()+Math.random().toString(36).slice(2,10);
  window._lastTrackId = eid;

  // 1. Supabase (analytics persistente com UTM) — first-party, always allowed
  // Atribuicao: fallback MC_UTM (sessao) -> MC_ATTR (localStorage 7d) pra nao perder campanha em sessao 2+
  const _src = MC_UTM.utm_source   || MC_ATTR.utm_source   || '';
  const _med = MC_UTM.utm_medium   || MC_ATTR.utm_medium   || '';
  const _cmp = MC_UTM.utm_campaign || MC_ATTR.utm_campaign || '';
  const _enrich = {
    referrer:     document.referrer || MC_ATTR.referrer || null,
    path:         location.pathname || null,
    landing_page: MC_ATTR.landing_page || null,
    country:      (_geo && _geo.geo_country) || null,
    region:       (_geo && _geo.geo_region) || null,
    city:         (_geo && _geo.geo_city) || null,
    fbclid:       MC_ATTR.fbclid || null,
    gclid:        MC_ATTR.gclid || null,
    ttclid:       MC_ATTR.ttclid || null,
    anon_id:      MC_ANON,
    // A/B test "default size" — A=control (menor), B=treatment (popular). Estável por sessão.
    ab_default_size: (typeof _abDefaultSizeVariant === 'function') ? _abDefaultSizeVariant() : null,
  };
  const row = {
    session_id:   MC_SESSION,
    event,
    firm_id:      params.firm_id      || params.firm_name || null,
    coupon_code:  params.coupon_code  || null,
    page_name:    params.page_name    || null,
    utm_source:   _src,
    utm_medium:   _med,
    utm_campaign: _cmp,
    params:       { ..._enrich, ...params, event_id: eid },
  };
  try {
    db.from('events').insert(row).then(r=>{ if(r.error){ console.warn('track insert error:', r.error.message); _trackEnqueue(row); } });
  } catch(e) { console.warn('track error:', e); _trackEnqueue(row); }

  // 1b. coupon_clicks — atribuicao campanha→cupom pra fechar loop com venda real da firma
  if (event === 'copy_coupon' || event === 'coupon_copy') {
    try {
      const click = {
        ts: ts,
        anon_id: MC_ANON,
        user_id: (window.currentUser && window.currentUser.id) || null,
        email: (window.currentUser && window.currentUser.email) || null,
        firm_id: params.firm_id || params.firm_name || null,
        coupon_code: params.coupon_code || params.coupon || null,
        event_id: eid,
        fbclid: MC_ATTR.fbclid || null,
        gclid: MC_ATTR.gclid || null,
        ttclid: MC_ATTR.ttclid || null,
        utm_source: MC_ATTR.utm_source || null,
        utm_medium: MC_ATTR.utm_medium || null,
        utm_campaign: MC_ATTR.utm_campaign || null,
        utm_content: MC_ATTR.utm_content || null,
        utm_term: MC_ATTR.utm_term || null,
        referrer: MC_ATTR.referrer || null,
        landing_page: MC_ATTR.landing_page || null,
        page_url: location.pathname + location.search,
        user_agent: navigator.userAgent,
        country: (_geo && _geo.geo_country) || null,
        region: (_geo && _geo.geo_region) || null,
        city: (_geo && _geo.geo_city) || null,
      };
      db.from('coupon_clicks').insert(click).then(r=>{ if(r.error) console.warn('coupon_clicks insert:', r.error.message); });
    } catch(e) { console.warn('coupon_clicks error:', e); }
  }

  // 2. localStorage cache (fallback offline + compatibilidade admin)
  try {
    const evs = JSON.parse(localStorage.getItem('mc_events')||'[]');
    evs.push({ event, params, ts });
    if(evs.length > 500) evs.splice(0, evs.length - 500);
    localStorage.setItem('mc_events', JSON.stringify(evs));
  } catch(e) {}

  // GDPR/LGPD: only send to third-party trackers if consent accepted (or consent event itself)
  if (!consentOk && event !== 'cookie_consent') return;

  // 3. GTM dataLayer — ÚNICA fonte pra GA4 + Meta Pixel + Google Ads.
  // SÓ eventos de funil (allowlist GA4_FUNNEL) chegam aqui. O nome empurrado é o
  // PADRÃO GA4 (1 nome por ação) — o site faz a tradução, não o GTM. Instrumentação
  // interna (tab_hidden, idle, bot_*, js_error, quiz_*, drawer_select, scroll_depth…)
  // NÃO entra no dataLayer — fica só no Supabase acima. Mantém GA4 limpo (~6-8 eventos).
  // SEM gtag()/fbq() direto — disciplina dataLayer-only (memória feedback_tracking_saga).
  const _ga4Event = GA4_FUNNEL[event];
  if (_ga4Event) {
    window.dataLayer = window.dataLayer || [];
    const _fb = _getFbAttribution();
    const _anonId = _getAnonId();
    const _user = typeof currentUser!=='undefined' ? currentUser : null;
    window.dataLayer.push({
      event:    _ga4Event,            // nome PADRÃO GA4 (view_item/add_to_cart/begin_checkout/…)
      event_id: eid,                  // MESMO eid vai pro CAPI logo abaixo → Meta dedup Pixel × CAPI
      timestamp: ts,
      // user_data (Meta Advanced Matching + GA4 user_id)
      user_data: {
        external_id: _user?.id || _anonId || null,
        em:          params.em || _user?.email || null,
        ph:          params.ph || null,
        fn:          params.fn || _user?.user_metadata?.full_name?.split(' ')[0] || null,
        ln:          params.ln || null,
        anon_id:     _anonId,
        fbp:         _fb.fbp || null,
        fbc:         _fb.fbc || null,
      },
      // ecommerce schema (GA4 enhanced ecommerce)
      ecommerce: {
        currency: params.currency || 'USD',
        value:    params.value || 0,
        items:    params.firm_id ? [{
          item_id:   params.firm_id,
          item_name: params.firm_name || params.content_name || params.firm_id,
          item_category: 'prop_firm',
          coupon:    params.coupon_code || params.coupon || null,
          quantity:  1,
          price:     params.value || 0,
        }] : (params.items || []),
      },
      // Campos pra Meta Pixel + GTM dlv legacy (firm_id/firm_name/coupon_code/page_name)
      content_ids:  params.content_ids || (params.firm_id ? [params.firm_id] : null),
      content_name: params.content_name || params.firm_name || params.page_name || null,
      content_type: params.content_type || (params.firm_id ? 'product' : null),
      content_category: params.content_category || null,
      firm_id:      params.firm_id || null,
      firm_name:    params.firm_name || null,
      coupon_code:  params.coupon_code || params.coupon || null,
      page_name:    params.page_name || null,
      // UTM (GTM pode usar pra source/medium dimensions)
      utm_source:   _src,
      utm_medium:   _med,
      utm_campaign: _cmp,
      // Spread params extras no final (eventos custom passam dados específicos)
      ...params,
    });
  }

  // 4. Facebook Conversions API server-side (bypassa ad blockers) — MESMO event_id do dataLayer
  // Dedup Pixel browser × CAPI: GTM dispara Pixel com event_id=eid, CAPI envia event_id=eid → Meta soma 1.
  _sendCAPI(event, params, eid, ts);
}

// ─── RETRY QUEUE: events that failed to reach Supabase (network error, offline) ───
function _trackEnqueue(row){
  try {
    const q = JSON.parse(localStorage.getItem('mc_track_queue')||'[]');
    q.push(row);
    if(q.length > 200) q.splice(0, q.length - 200); // cap at 200
    localStorage.setItem('mc_track_queue', JSON.stringify(q));
  } catch(e){}
}
async function _trackFlushQueue(){
  let q=[]; try { q = JSON.parse(localStorage.getItem('mc_track_queue')||'[]'); } catch(e){ return; }
  if(!q.length) return;
  try {
    const { error } = await db.from('events').insert(q);
    if(!error) localStorage.removeItem('mc_track_queue');
  } catch(e){}
}
// Flush queue on page show (back from bfcache) and on first load
window.addEventListener('pageshow', _trackFlushQueue);
setTimeout(_trackFlushQueue, 3000);
// Flush on unload via sendBeacon (survives page close)
window.addEventListener('pagehide', ()=>{
  try {
    const q = JSON.parse(localStorage.getItem('mc_track_queue')||'[]');
    if(!q.length) return;
    const url = SUPABASE_URL + '/rest/v1/events';
    const blob = new Blob([JSON.stringify(q)], {type:'application/json'});
    // sendBeacon can't set auth headers — use fetch with keepalive instead
    fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Prefer':'return=minimal'},
      body: blob,
      keepalive: true,
    }).then(r=>{ if(r.ok) localStorage.removeItem('mc_track_queue'); }).catch(()=>{});
  } catch(e){}
});

// ─── ENHANCED CONVERSIONS: hashed PII for cross-device matching ───
async function _sha256(str){
  if(!str||typeof crypto==='undefined'||!crypto.subtle) return '';
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(str).trim().toLowerCase()));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  } catch(e) { return ''; }
}
// Call when user logs in — enables GA4 Enhanced Conversions + FB Advanced Matching via GTM dataLayer
// (sem gtag/fbq direto — GTM consome user_data e Pixel/GA4 hash automaticamente)
async function setTrackingUser(user){
  if(!user||localStorage.getItem('mc-cookies-consent')!=='accepted') return;
  const email = user.email || '';
  const phone = user.user_metadata?.phone || '';
  const fn    = user.user_metadata?.full_name || '';
  // Push pra dataLayer — GTM tem variável "user_data" que lê desse stack e injeta no Pixel base + GA4 config
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'user_identified',
    user_data: {
      external_id: user.id || null,
      em:          email || null,
      ph:          phone || null,
      fn:          fn.split(' ')[0] || null,
      ln:          fn.split(' ').slice(1).join(' ') || null,
      plan:        user.user_metadata?.plan || 'free',
      loyalty_tier:user.user_metadata?.loyalty_tier || 'none',
      country:     user.user_metadata?.country || (_geo&&_geo.geo_country) || null,
    },
  });
}
// Call when geo detected (enriches even anonymous users) — via dataLayer
function setTrackingGeo(geo){
  if(!geo) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'geo_resolved',
    geo: {
      country:  geo.geo_country || null,
      region:   geo.geo_region || null,
      timezone: geo.geo_timezone || null,
    },
  });
}

// Lê fbp/fbc do cookie. O cookie _fbc é a fonte CANÔNICA — o Pixel da Meta o seta no
// formato certo (fb.1.{ts}.{fbclid}) com timestamp ESTÁVEL. Só reconstruímos quando o
// cookie não existe, ou quando a URL traz um fbclid genuinamente novo (ad mais recente).
// NUNCA reconstruir por evento: Date.now() a cada chamada gera fbc com timestamp variável
// → Meta sinaliza "fbc modificado" entre PageView/Lead do mesmo usuário. fbclid vai EXATO
// (URLSearchParams decodifica, sem toLowerCase / sem truncar / sem substring).
function _getFbAttribution() {
  try {
    const ck = document.cookie.split(';').reduce((o,c)=>{const [k,...v]=c.trim().split('=');o[k]=v.join('=');return o;},{});
    // fbp: o Pixel seta _fbp, mas carrega lazy (requestIdleCallback) → eventos cedo
    // (page_view no load) saíam sem fbp. Semeia 1x no formato canônico fb.1.{ts}.{rand};
    // quando o Pixel carrega ele reusa o cookie existente. Garante fbp em TODO evento CAPI.
    let fbp = ck._fbp || null;
    if (!fbp) {
      fbp = `fb.1.${Date.now()}.${Math.floor(Math.random()*1e10)}`;
      try { document.cookie = `_fbp=${fbp}; path=/; max-age=7776000; SameSite=Lax`; } catch(_) {}
    }
    let fbc = ck._fbc || null;
    const urlFbclid = new URLSearchParams(location.search).get('fbclid');
    // Reconstrói só se: (a) cookie ausente, ou (b) URL tem fbclid diferente do cookie (ad novo).
    if (urlFbclid && (!fbc || !fbc.endsWith('.' + urlFbclid))) {
      fbc = `fb.1.${Date.now()}.${urlFbclid}`;
      try { document.cookie = `_fbc=${fbc}; path=/; max-age=7776000; SameSite=Lax`; } catch(_) {}
    }
    // Sem cookie e sem fbclid na URL → última tentativa via mc_attribution (sessão anterior).
    if (!fbc) {
      try {
        const att = JSON.parse(localStorage.getItem('mc_attribution') || '{}');
        if (att.fbclid) {
          fbc = `fb.1.${Date.now()}.${att.fbclid}`;
          try { document.cookie = `_fbc=${fbc}; path=/; max-age=7776000; SameSite=Lax`; } catch(_) {}
        }
      } catch(_) {}
    }
    return { fbp, fbc };
  } catch(_) { return { fbp: null, fbc: null }; }
}

// Anon ID estável (já setado em tracking-init.js). Usado como external_id quando user não logado.
function _getAnonId() {
  try { return localStorage.getItem('mc_anon') || null; } catch(_) { return null; }
}

// Facebook CAPI — fire-and-forget server-side event
function _sendCAPI(event, params, eid, ts) {
  // GDPR/LGPD: block server-side tracking without consent
  if (localStorage.getItem('mc-cookies-consent') !== 'accepted') return;
  try {
    const { fbp, fbc } = _getFbAttribution();
    const anon_id = _getAnonId();
    const user = typeof currentUser!=='undefined' ? currentUser : null;
    // external_id: prefere user.id (logado); fallback pra anon_id (cobre 90% do tráfego pago)
    const external_id = user?.id || anon_id || '';
    fetch('https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/facebook-capi', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        ua: navigator.userAgent,
        events: [{
          event,
          event_id: eid,
          ts,
          url: location.href,
          fbp: fbp || '',
          fbc: fbc || '',
          em: params.em || user?.email || '',
          ph: params.ph || user?.user_metadata?.phone || '',
          external_id,
          anon_id: anon_id || '',
          fn: params.fn || user?.user_metadata?.full_name || '',
          ln: params.ln || '',
          country: user?.user_metadata?.country || '',
          firm_id: params.firm_id || null,
          firm_name: params.firm_name || null,
          content_name: params.content_name || params.firm_name || params.page_name || null,
          content_category: params.content_category || null,
          content_ids: params.content_ids || (params.firm_id ? [params.firm_id] : null),
          content_type: params.content_type || null,
          value: params.value || 0,
          currency: params.currency || 'USD',
          num_items: params.num_items || null,
          coupon: params.coupon_code || params.coupon || null,
        }]
      }),
      keepalive: true,
    }).catch(()=>{});
  } catch(e){}
}

// Helper: extract price value from firm for FB Pixel enrichment
// Valor de conversão (Lead/CAPI) = $3.00 flat por Lead (decidido c/ Everton 2026-05-20).
// Comissão é 10% da venda mas varia muito por plano; Everton optou por valor fixo.
// Constante — NUNCA 0: a Meta acusava "Lead sem value" quando isso devolvia 0.
// Mantém a assinatura (f,size) pois callers passam args — JS ignora os extras.
function _fbVal(){
  return 3.00;
}

// Single source of truth for plan prices: Supabase FIRMS[].prices with hardcoded fallback.
// Lookup is fuzzy: exact size match first, then numeric match (25K ≈ TCP25 ≈ $25K).
// For dual-type firms (e.g. Apex Intraday/EOD), typeIdx selects n/n2 and o/o2.
function getPlanPrice(firmId, typeName, sizeStr, pack, variant){
  const numOf = s => { const m = (s||'').replace(/[,$]/g,'').match(/(\d+(?:\.\d+)?)/); return m?parseFloat(m[1]):null; };
  // Start with hardcoded fallback from FIRM_ABOUT (used while Supabase is loading or if it fails)
  let d='', o='', each='', unavailable=false;
  const fa = (typeof FIRM_ABOUT!=='undefined') && FIRM_ABOUT[firmId];
  if(fa && fa.plans && fa.plans[typeName]){
    const hp = fa.plans[typeName].find(p=>p.s===sizeStr);
    if(hp){ d = hp.d||''; o = hp.o||''; }
  }
  // Fallback to CHECKOUT_FIRMS plansByType if FIRM_ABOUT missing this entry
  if(!d){
    const cf = (typeof CHECKOUT_FIRMS!=='undefined') && CHECKOUT_FIRMS.find(x=>x.id===firmId);
    if(cf && cf.plansByType && cf.plansByType[typeName]){
      const hp = cf.plansByType[typeName].find(p=>p.size===sizeStr) ||
                 cf.plansByType[typeName].find(p=>numOf(p.size)===numOf(sizeStr));
      if(hp){ d = hp.disc||''; o = hp.orig||''; }
    }
  }
  // Override with Supabase data if FIRMS[] has loaded
  const f = FIRMS.find(x=>x.id===firmId);
  if(f && f.prices && f.prices.length){
    const types = (fa && fa.types) || (f.price_types||[]);
    const typeIdx = Math.max(0, types.indexOf(typeName));
    const hasDual = f.price_types && f.price_types.length >= 2;
    let match = f.prices.find(p=>p.a===sizeStr);
    if(!match){
      const pn = numOf(sizeStr);
      if(pn!==null){
        const cands = f.prices.filter(p=>numOf(p.a)===pn);
        if(cands.length===1) match = cands[0];
        else if(cands.length>1){
          match = cands.find(p=>p.a.toLowerCase().includes((sizeStr||'').toLowerCase())) || cands[typeIdx] || cands[0];
        }
      }
    }
    if(match){
      const isEod = hasDual && typeIdx!==0;
      const naf = variant==='nofee';   // No Activation Fee variant
      const five = pack==='5';
      // Pick field keys for [type][variant][pack]. na* = no-activation prefix.
      let dk, ok, ek=null;
      if(five){
        if(isEod){ dk=naf?'na52':'n52'; ok=naf?'na52o':'o52'; ek=naf?'na52e':'e52'; }
        else     { dk=naf?'na5':'n5';   ok=naf?'na5o':'o5';   ek=naf?'na5e':'e5'; }
      } else {
        if(isEod){ dk=naf?'na2':'n2'; ok=naf?'nao2':'o2'; }
        else     { dk=naf?'na':'n';   ok=naf?'nao':'o'; }
      }
      const dv = match[dk];
      if(dv){ d=dv; o=match[ok]||''; each = ek?(match[ek]||''):''; }
      else if(naf || five){ // combo not offered (e.g. EOD 100K/150K No-Activation 5-pack)
        d=''; o=''; each=''; unavailable=true;
      } else if(!hasDual){ d = match.n || d; o = match.o || o; }
    }
  }
  return { d, o, each, unavailable };
}
// Does this firm offer a 5-account pack? (drives the pack toggle UI)
function firmHas5Pack(firmId){
  const f = (typeof FIRMS!=='undefined') && FIRMS.find(x=>x.id===firmId);
  return !!(f && f.prices && f.prices.some(p=>p.n5||p.n52));
}
// Does this firm offer a No-Activation-Fee variant? (drives the Standard/No-Activation toggle)
function firmHasNoFee(firmId){
  const f = (typeof FIRMS!=='undefined') && FIRMS.find(x=>x.id===firmId);
  return !!(f && f.prices && f.prices.some(p=>p.na||p.na2));
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
    setTrackingGeo(_geo); // GA4 user_properties for anonymous users
    // Store geo event in Supabase
    db.from('events').insert({ session_id: MC_SESSION, event: 'geo_detected', params: _geo }).then(()=>{});
  } catch(e) { _geo = {}; }
  return _geo;
}

// ─── MAIN APP ───
/* DATA — Firms loaded from Supabase (cms_firms), cached in localStorage for offline fallback */
const FIRMS=[];

/* ═══ FIRM DETAIL — Background images & About data ═══ */
const FIRM_BG={
  apex:'/img/apex-bg.webp',bulenox:'/img/bulenox-bg.webp',ftmo:'/img/ftmo-bg.webp',
  fn:'/img/fn-bg.webp',e2t:'/img/e2t-bg.webp',
  the5ers:'/img/the5ers-bg.webp',fundingpips:'/img/fundingpips-bg.webp',brightfunded:'/img/brightfunded-bg.webp',
  e8:'/img/e8-bg.webp',cti:'/img/cti-bg.webp',tradeday:'/img/tradeday-bg.webp'
};
const FIRM_ABOUT={
  apex:{about:'Fundada em <b>2021</b> por Darrell Martin em Austin, Texas. A Apex é a <b>6ª prop firm mais buscada do mundo</b> com 4.2M de visitas mensais. Taxa de aprovação de <b>15-20%</b> — 2x a média do setor.',highlights:[{val:'$721M+',label:'Pagos a traders'},{val:'$85M+',label:'Últimos 90 dias'},{val:'100%',label:'Do lucro (2026)'}],
    types:['Intraday Trail','EOD Trail'],plans:{'Intraday Trail':[{s:'25K',d:'$19.90',o:'$199'},{s:'50K',d:'$24.90',o:'$249'},{s:'100K',d:'$39.90',o:'$399',pop:1},{s:'150K',d:'$59.90',o:'$599'}],'EOD Trail':[{s:'25K',d:'$29.90',o:'$299'},{s:'50K',d:'$34.90',o:'$349'},{s:'100K',d:'$59.90',o:'$599',pop:1},{s:'150K',d:'$79.90',o:'$799'}]},
    includes:['Sem limite de perda diária','Sem regra de escalamento','Licença NinjaTrader','Dados em tempo real','Copy Trader (WealthCharts)','Suporte 24/7']},
  bulenox:{about:'Fundada em <b>2022</b>. Crescimento de <b>500%</b> em tráfego ano a ano. Regras simplificadas — possível passar em <b>1 dia</b>, sem regra de consistência.',highlights:[{val:'90%',label:'Profit Split'},{val:'1 dia',label:'Para passar'},{val:'$0',label:'Taxa mensal'}],
    types:['Trailing DD','EOD DD'],plans:{'Trailing DD':[{s:'25K',d:'$15.95',o:'$145'},{s:'50K',d:'$19.25',o:'$175'},{s:'100K',d:'$23.65',o:'$215',pop:1},{s:'150K',d:'$35.75',o:'$325'},{s:'250K',d:'$58.85',o:'$535'}],'EOD DD':[{s:'25K',d:'$15.95',o:'$145'},{s:'50K',d:'$19.25',o:'$175'},{s:'100K',d:'$23.65',o:'$215',pop:1},{s:'150K',d:'$35.75',o:'$325'},{s:'250K',d:'$58.85',o:'$535'}]},
    includes:['Passa em 1 dia','Sem consistência','Trade durante notícias','Payouts semanais','Trial 14 dias grátis']},
  ftmo:{about:'Fundada em <b>2015</b> em Praga, República Tcheca. A FTMO é a <b>maior prop firm de Forex do mundo</b>. Mais de <b>3.5M de clientes</b> em 140+ países. Equipe de 300+ profissionais.',highlights:[{val:'$500M+',label:'Pagos a traders'},{val:'3.5M+',label:'Clientes'},{val:'10 anos',label:'No mercado'}],
    types:['1-Step Challenge','2-Step Challenge'],plans:{'1-Step Challenge':[{s:'10K',d:'€79',o:'—'},{s:'25K',d:'€199',o:'—'},{s:'50K',d:'€319',o:'—'},{s:'100K',d:'€499',o:'—',pop:1},{s:'200K',d:'€999',o:'—'}],'2-Step Challenge':[{s:'10K',d:'€79',o:'—'},{s:'25K',d:'€199',o:'—'},{s:'50K',d:'€319',o:'—'},{s:'100K',d:'€499',o:'—',pop:1},{s:'200K',d:'€999',o:'—'}]},
    includes:['Free Trial ilimitado','90% split de lucro','Suporte 20 idiomas','Scaling até $2M','$500M+ pagos','Sem limite de tempo']},
  fn:{about:'Fundada em <b>2022</b> nos Emirados Árabes. <b>Prop Firm do Ano</b> (Finance Magnates 2025). Mais de <b>423K+ contas</b> e payout garantido em 24h.',highlights:[{val:'$285M+',label:'Pagos a traders'},{val:'108K+',label:'Traders pagos'},{val:'24h',label:'Payout garantido'}],
    types:['Stellar 2-Step','Stellar 1-Step','Stellar Lite','Futures Bolt','Futures Rapid','Futures Legacy'],plans:{'Stellar 2-Step':[{s:'$6K',d:'$52.49',o:'$69.99'},{s:'$15K',d:'$89.99',o:'$119.99'},{s:'$25K',d:'$142.49',o:'$189.99'},{s:'$50K',d:'$202.49',o:'$269.99',pop:1},{s:'$100K',d:'$374.99',o:'$499.99'}],'Stellar 1-Step':[{s:'$6K',d:'$65.99',o:'—'},{s:'$15K',d:'$130.99',o:'—'},{s:'$25K',d:'$170.99',o:'—'},{s:'$50K',d:'$219.99',o:'—',pop:1},{s:'$100K',d:'$449.99',o:'—'},{s:'$200K',d:'$1,099.99',o:'—'}],'Stellar Lite':[{s:'$5K',d:'$32',o:'—'},{s:'$10K',d:'$58',o:'—'},{s:'$25K',d:'$159',o:'—'},{s:'$50K',d:'$229',o:'—',pop:1},{s:'$100K',d:'$399',o:'—'},{s:'$200K',d:'$799',o:'—'}],'Futures Bolt':[{s:'$50K',d:'~$199',o:'—',pop:1}],'Futures Rapid':[{s:'$25K',d:'~$99',o:'—'},{s:'$50K',d:'~$159',o:'—',pop:1},{s:'$100K',d:'~$279',o:'—'}],'Futures Legacy':[{s:'$25K',d:'~$79',o:'—'},{s:'$50K',d:'~$119',o:'—',pop:1},{s:'$100K',d:'~$349',o:'—'}]},
    includes:['Payout garantido 24h','Sem limite de tempo','$1K compensação atraso','Até 90% split','Scaling até $4M','15% bônus lucro avaliação']},
  e2t:{about:'Fundada em <b>2016</b>, celebrando <b>10 anos</b> em 2026. Foco em educação e desenvolvimento. Taxa de aprovação de <b>10.42%</b> — acima da média do setor. Escalamento até $400K.',highlights:[{val:'10 anos',label:'No mercado'},{val:'$400K',label:'Scaling máximo'},{val:'10.4%',label:'Taxa aprovação'}],
    types:['Trader Career Path','Gauntlet Mini'],plans:{'Trader Career Path':[{s:'TCP25',d:'$60',o:'$150'},{s:'TCP50',d:'$76',o:'$190'},{s:'TCP100',d:'$140',o:'$350',pop:1}],'Gauntlet Mini':[{s:'50K',d:'$68',o:'$170'},{s:'100K',d:'$126',o:'$315',pop:1},{s:'150K',d:'$150',o:'$375'},{s:'200K',d:'$220',o:'$550'}]},
    includes:['Journalytix grátis','Reset grátis','NT/Finamark grátis','Escalamento até $400K','Sem taxa mensal']},
  the5ers:{about:'Fundada em <b>2016</b> por Saul Lokier em Raanana, Israel. Uma das <b>mais antigas prop firms</b> em atividade. Scaling até <b>$4M</b> e profit split até 100%.',highlights:[{val:'$43M+',label:'Pagos a traders'},{val:'30K+',label:'Payouts feitos'},{val:'$4M',label:'Scaling máximo'}],
    types:['Hyper Growth','Pro Growth','High Stakes','Bootcamp','Futures Basecamp','Futures Rebate'],plans:{'Hyper Growth':[{s:'$5K',d:'$39',o:'—'},{s:'$10K',d:'$85',o:'—'},{s:'$20K',d:'$175',o:'—',pop:1}],'Pro Growth':[{s:'$5K',d:'$74',o:'—'},{s:'$10K',d:'$140',o:'—'},{s:'$20K',d:'$270',o:'—',pop:1}],'High Stakes':[{s:'$2.5K',d:'$19',o:'—'},{s:'$5K',d:'$39',o:'—'},{s:'$10K',d:'$75',o:'—'},{s:'$25K',d:'$175',o:'—',pop:1},{s:'$50K',d:'$315',o:'—'},{s:'$100K',d:'$575',o:'—'}],'Bootcamp':[{s:'$20K',d:'$22',o:'—'},{s:'$100K',d:'$99',o:'—',pop:1},{s:'$250K',d:'$225',o:'—'}],'Futures Basecamp':[{s:'$25K',d:'$50',o:'—'},{s:'$50K',d:'$99',o:'—',pop:1}],'Futures Rebate':[{s:'$25K',d:'$150',o:'—'},{s:'$50K',d:'$299',o:'—',pop:1}]},
    includes:['Scaling até $4M','Profit Split até 100%','Payout médio 16h','Alavancagem 1:30','Sem limite de tempo','Dashboard avançado']},
  fundingpips:{about:'Fundada em <b>2022</b> por Khaled Ayesh em Dubai. <b>2M+ de traders</b> no mundo. Uma das mesas mais populares com pagamentos rápidos e split flexível até 100%.',highlights:[{val:'$210M+',label:'Pagos a traders'},{val:'2M+',label:'Traders'},{val:'127K+',label:'Payouts verificados'}],
    types:['Zero','1-Step','2-Step','Pro'],plans:{'Zero':[{s:'$5K',d:'$55.20',o:'$69'},{s:'$10K',d:'$79.20',o:'$99'},{s:'$25K',d:'$159.20',o:'$199'},{s:'$50K',d:'$239.20',o:'$299',pop:1},{s:'$100K',d:'$399.20',o:'$499'},{s:'$200K',d:'$798.40',o:'$998'}],'1-Step':[{s:'$5K',d:'$47.20',o:'$59'},{s:'$10K',d:'$79.20',o:'$99'},{s:'$25K',d:'$159.20',o:'$199'},{s:'$50K',d:'$255.20',o:'$319',pop:1},{s:'$100K',d:'$444',o:'$555'}],'2-Step':[{s:'$5K',d:'$28.80',o:'$36'},{s:'$10K',d:'$52.80',o:'$66'},{s:'$25K',d:'$124.80',o:'$156'},{s:'$50K',d:'$231.20',o:'$289',pop:1},{s:'$100K',d:'$423.20',o:'$529'}],'Pro':[{s:'$5K',d:'$23.20',o:'$29'},{s:'$10K',d:'$44',o:'$55'},{s:'$25K',d:'$87.20',o:'$109'},{s:'$50K',d:'$175.20',o:'$219',pop:1},{s:'$100K',d:'$319.20',o:'$399'},{s:'$200K',d:'$638.40',o:'$798'}]},
    includes:['Split flexível até 100%','$210M+ pagos','Alavancagem 1:100','Comunidade Discord ativa']},
  brightfunded:{about:'Fundada em <b>2022</b> na Holanda por Jelle Dijkstra. <b>27.5K+ traders</b>. Programa Trade2Earn (pontos por operar). Payout em <b>24h</b> com ciclo de 7 dias.',highlights:[{val:'$13M+',label:'Pagos a traders'},{val:'27.5K+',label:'Traders'},{val:'24h',label:'Payout garantido'}],
    types:['2-Step'],plans:{'2-Step':[{s:'5K',d:'€41.25',o:'€55'},{s:'10K',d:'€71.25',o:'€95'},{s:'25K',d:'€146.25',o:'€195'},{s:'50K',d:'€221.25',o:'€295',pop:1},{s:'100K',d:'€371.25',o:'€495'},{s:'200K',d:'€731.25',o:'€975'}]},
    includes:['Scaling até 100% split','Drawdown estático','Payout 24h ciclo 7 dias','15% bônus lucro avaliação','Trade2Earn','Alavancagem 1:100','Suporte 24/7']},
  e8:{about:'Fundada em <b>2021</b> nos EUA. E8 Markets oferece contas de <b>$5K a $500K</b> em Forex, Futuros e Crypto. Dois produtos: <b>Signature</b> (EOD, 80% split) e <b>E8 One</b> (drawdown dinâmico configurável 4-14%, até 100% split).',highlights:[{val:'$500K',label:'Conta máxima'},{val:'100%',label:'Split máximo'},{val:'3',label:'Mercados'}],
    types:['Signature','E8 One'],plans:{'Signature':[{s:'$25K',d:'$99',o:'$110'},{s:'$50K',d:'$135',o:'$150'},{s:'$100K',d:'$234',o:'$260',pop:1},{s:'$150K',d:'$351',o:'$390'}],'E8 One':[{s:'$5K',d:'$54',o:'$60'},{s:'$10K',d:'$81',o:'$90'},{s:'$25K',d:'$153',o:'$170'},{s:'$50K',d:'$234',o:'$260'},{s:'$100K',d:'$439.20',o:'$488',pop:1},{s:'$200K',d:'$836.10',o:'$929'},{s:'$400K',d:'$1,619.10',o:'$1,799'},{s:'$500K',d:'$2,069.10',o:'$2,299'}]},
    includes:['Sem taxa de ativação','Passa em 1 dia','Forex, Futuros e Crypto','Drawdown configurável 4-14%','Split até 100%','Contas até $500K']},
  cti:{about:'Fundada em <b>2018</b> no Reino Unido. City Traders Imperium (CTI) oferece <b>5 programas</b> de avaliação com split até <b>100%</b>. Premiada: <b>Best MatchTrader Prop Firm 2025</b>, Top Choice for Traders 2025, Most Trusted Prop Firm 2025.',highlights:[{val:'100%',label:'Split máximo'},{val:'5',label:'Programas'},{val:'$1',label:'Entrada mínima'}],
    types:['1-Step','2-Step','3-Step','Instant','Instant Pro'],plans:{'1-Step':[{s:'$2.5K',d:'$27',o:'$39'},{s:'$5K',d:'$41',o:'$59'},{s:'$10K',d:'$76',o:'$109'},{s:'$25K',d:'$139',o:'$199',pop:1},{s:'$50K',d:'$280',o:'$399'},{s:'$100K',d:'$412',o:'$589'}],'2-Step':[{s:'$2.5K',d:'$34',o:'$49'},{s:'$5K',d:'$48',o:'$69'},{s:'$10K',d:'$97',o:'$139'},{s:'$25K',d:'$174',o:'$249',pop:1},{s:'$50K',d:'$314',o:'$449'},{s:'$100K',d:'$482',o:'$689'}],'3-Step':[{s:'$2.5K',d:'$1',o:'—'},{s:'$5K',d:'$2',o:'—'},{s:'$10K',d:'$4',o:'—'},{s:'$25K',d:'$10',o:'—',pop:1},{s:'$50K',d:'$20',o:'—'},{s:'$100K',d:'$40',o:'—'}],'Instant':[{s:'$2.5K',d:'$62',o:'$89'},{s:'$5K',d:'$111',o:'$159'},{s:'$10K',d:'$216',o:'$309'},{s:'$20K',d:'$391',o:'$559',pop:1},{s:'$40K',d:'$741',o:'$1,059'},{s:'$80K',d:'$1,315',o:'$1,879'}],'Instant Pro':[{s:'$5K',d:'$263',o:'$329'},{s:'$10K',d:'$527',o:'$659'},{s:'$20K',d:'$1,055',o:'$1,319',pop:1},{s:'$40K',d:'$2,111',o:'$2,639'},{s:'$80K',d:'$4,223',o:'$5,279'}]},
    includes:['5 programas de avaliação','VIP Program: Bronze, Silver, Gold','Coaching 1-on-1 gratuito','Certificado de conquista','Split até 100%','Scaling disponível']},
  tradeday:{about:'Fundada em <b>Chicago, Illinois</b>. A TradeDay opera <b>apenas futuros</b> nas exchanges CME, CBOT, NYMEX e COMEX. Destaque pelo <b>Day 1 Payout</b>, <b>sem regra de consistência</b> e split progressivo até <b>95%</b>. Taxa de aprovação de <b>28.2%</b> (Out 2023 – Mar 2024) — acima da média do setor.',highlights:[{val:'Dia 1',label:'Primeiro saque'},{val:'95%',label:'Split máximo'},{val:'28.2%',label:'Taxa aprovação'}],
    types:['Intraday','EOD','Static'],plans:{'Intraday':[{s:'50K',d:'$87.50',o:'$125'},{s:'100K',d:'$140',o:'$200',pop:1},{s:'150K',d:'$210',o:'$300'}],'EOD':[{s:'50K',d:'$122.50',o:'$175'},{s:'100K',d:'$192.50',o:'$275',pop:1},{s:'150K',d:'$262.50',o:'$375'}],'Static':[{s:'50K',d:'$115.50',o:'$165'},{s:'100K',d:'$175',o:'$250',pop:1},{s:'150K',d:'$245',o:'$350'}]},
    includes:['Sem regra de consistência','Day 1 Payout','Split até 95%','Sem taxa de ativação (SAVE30)','Futuros CME/CBOT/NYMEX/COMEX','Suporte 24/7']}

};

/* PLATFORM DETAIL DATA — checkout overlay for partner platforms */
const PLAT_BG={
  tradingview:'/img/tradingview-bg.webp',
  ninjatrader:'/img/ninjatrader-bg.webp'
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
    about:'Fundada em <b>2003</b> por Raymond Deux em Denver, Colorado (HQ em Chicago). <b>500K+ usuários</b> em 150+ países. Adquiriu a <b>Tradovate</b> em 2023. Aceita pela <b>maioria das Prop Firms</b> de futuros.',
    highlights:[{val:'500K+',label:'Usuários ativos'},{val:'C#',label:'Automação'},{val:'20+',label:'Anos no mercado'}],
    types:['Plataforma'],
    plans:{
      'Plataforma':[
        {s:'Free',d:'$0/mês',o:'—',feat:'Dados EOD gratuitos'},
        {s:'Monthly',d:'$99/mês',o:'—',feat:'Dados em tempo real inclusos'},
        {s:'Lifetime',d:'$1,499',o:'—',pop:1,feat:'Licença vitalícia + dados real-time'}
      ]
    },
    includes:['SuperDOM + Order Flow+','100+ indicadores nativos','Automação NinjaScript (C#)','Strategy Analyzer (backtest)','ATM Strategies','Simulação grátis','Chart Trader (visual)','Market Analyzer (scanner)','Aceita por 10+ Prop Firms','Dados CME/CBOT/NYMEX','Relatório de performance','Desktop + Web + Mobile','Marketplace com milhares de add-ons','Suporte 24/5'],
    stats:[
      {label:'Exchanges',val:'CME, CBOT, NYMEX, COMEX'},
      {label:'Automação',val:'NinjaScript (C#)'},
      {label:'Backtesting',val:'Strategy Analyzer',color:'var(--green)'},
      {label:'Prop Firms',val:'Apex, Bulenox, Topstep +7',color:'var(--green)'},
      {label:'Marketplace',val:'Milhares de add-ons'}
    ]
  }
};

/* FIRM DATA TRANSLATIONS — translates PT firm data to all languages */
const _ftL=['en','es','fr','it','de','ar'];
const FIRM_T={
// Scaling
'Sim':['Yes','Sí','Oui','Sì','Ja','نعم'],
'Até $2M':['Up to $2M','Hasta $2M','Jusqu\'à $2M','Fino a $2M','Bis $2M','حتى $2M'],
'Até $300K':['Up to $300K','Hasta $300K','Jusqu\'à $300K','Fino a $300K','Bis $300K','حتى $300K'],
'Até $400K':['Up to $400K','Hasta $400K','Jusqu\'à $400K','Fino a $400K','Bis $400K','حتى $400K'],
'Até $4M':['Up to $4M','Hasta $4M','Jusqu\'à $4M','Fino a $4M','Bis $4M','حتى $4M'],
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
'Variável':['Variable','Variable','Variable','Variabile','Variabel','متغير'],
// Perks
'Sem limite diário':['No daily limit','Sin límite diario','Sans limite journalier','Senza limite giornaliero','Kein Tageslimit','بدون حد يومي'],
'Sem regra escalamento':['No scaling rules','Sin regla de escalamiento','Sans règle de scaling','Nessuna regola di scaling','Keine Scaling-Regeln','بدون قواعد تصعيد'],
'Payout 5 dias':['5-day payout','Pago en 5 días','Paiement sous 5 jours','Pagamento in 5 giorni','Auszahlung in 5 Tagen','دفع خلال 5 أيام'],
'Reset $99':['Reset $99','Reset $99','Reset $99','Reset $99','Reset $99','إعادة تعيين $99'],
'Passa em 1 dia':['Pass in 1 day','Aprueba en 1 día','Réussite en 1 jour','Superabile in 1 giorno','Bestehen in 1 Tag','اجتياز في يوم واحد'],
'Sem consistência':['No consistency rule','Sin regla de consistencia','Sans règle de consistance','Nessuna regola di coerenza','Keine Konsistenzregel','بدون قاعدة اتساق'],
'Trade notícias':['News trading allowed','Trading en noticias','Trading de nouvelles autorisé','Trading sulle notizie','Nachrichtenhandel erlaubt','تداول الأخبار مسموح'],
'Payouts semanais':['Weekly payouts','Pagos semanales','Paiements hebdomadaires','Pagamenti settimanali','Wöchentliche Auszahlungen','دفعات أسبوعية'],
'Free Trial ilimitado':['Unlimited free trial','Prueba gratuita ilimitada','Essai gratuit illimité','Prova gratuita illimitata','Unbegrenzter kostenloser Test','تجربة مجانية غير محدودة'],
'90% split':['90% split','90% split','90% split','90% split','90% Split','90% تقسيم'],
'Suporte 20 idiomas':['Support in 20 languages','Soporte en 20 idiomas','Support en 20 langues','Supporto in 20 lingue','Support in 20 Sprachen','دعم بـ 20 لغة'],
'$500M+ pagos':['$500M+ paid out','$500M+ pagados','$500M+ versés','$500M+ pagati','$500M+ ausgezahlt','$500M+ مدفوعة'],
'Saque desde dia 1':['Withdrawal from day 1','Retiro desde el día 1','Retrait dès le jour 1','Prelievo dal giorno 1','Auszahlung ab Tag 1','سحب من اليوم الأول'],
'Sem taxa de ativação':['No activation fee','Sin tarifa de activación','Sans frais d\'activation','Nessuna commissione di attivazione','Keine Aktivierungsgebühr','بدون رسوم تفعيل'],
'Payout garantido 24h':['Guaranteed 24h payout','Pago garantizado 24h','Paiement garanti 24h','Pagamento garantito 24h','Garantierte 24h-Auszahlung','دفع مضمون خلال 24 ساعة'],
'Sem limite de tempo':['No time limit','Sin límite de tiempo','Sans limite de temps','Senza limite di tempo','Kein Zeitlimit','بدون حد زمني'],
'$1K compensação atraso':['$1K late compensation','$1K compensación por retraso','$1K compensation retard','$1K compenso ritardo','$1K Verspätungsentschädigung','$1K تعويض تأخير'],
'Journalytix grátis':['Free Journalytix','Journalytix gratis','Journalytix gratuit','Journalytix gratuito','Journalytix kostenlos','Journalytix مجاني'],
'Reset grátis':['Free reset','Reset gratis','Reset gratuit','Reset gratuito','Kostenloses Reset','إعادة تعيين مجانية'],
'Scaling até $400K':['Scaling up to $400K','Scaling hasta $400K','Scaling jusqu\'à $400K','Scaling fino a $400K','Scaling bis $400K','تصعيد حتى $400K'],
'Scaling até $4M':['Scaling up to $4M','Scaling hasta $4M','Scaling jusqu\'à $4M','Scaling fino a $4M','Scaling bis $4M','تصعيد حتى $4M'],
'Profit Split até 100%':['Profit Split up to 100%','Profit Split hasta 100%','Profit Split jusqu\'à 100%','Profit Split fino al 100%','Profit Split bis 100%','Profit Split حتى 100%'],
'Bootcamp desde $95':['Bootcamp from $95','Bootcamp desde $95','Bootcamp à partir de $95','Bootcamp da $95','Bootcamp ab $95','معسكر تدريب من $95'],
'Payout médio 16h':['Average 16h payout','Pago promedio 16h','Paiement moyen 16h','Pagamento medio 16h','Durchschn. 16h-Auszahlung','متوسط دفع 16 ساعة'],
'Alavancagem 1:100':['Leverage 1:100','Apalancamiento 1:100','Effet de levier 1:100','Leva 1:100','Hebel 1:100','رافعة مالية 1:100'],
'Split flexivel: 60% semanal / 80% quinzenal / 90% sob demanda / 100% mensal':['Flexible split: 60% weekly / 80% biweekly / 90% on demand / 100% monthly','Split flexible: 60% semanal / 80% quincenal / 90% bajo demanda / 100% mensual','Split flexible : 60% hebdo / 80% bimensuel / 90% sur demande / 100% mensuel','Split flessibile: 60% settimanale / 80% bisettimanale / 90% su richiesta / 100% mensile','Flexibler Split: 60% wöchentlich / 80% zweiwöchentlich / 90% auf Anfrage / 100% monatlich','تقسيم مرن: 60% أسبوعي / 80% نصف شهري / 90% عند الطلب / 100% شهري'],
'$200M+ pagos globalmente':['$200M+ paid globally','$200M+ pagados globalmente','$200M+ versés mondialement','$200M+ pagati globalmente','$200M+ weltweit ausgezahlt','$200M+ مدفوعة عالمياً'],
'Comunidade Discord ativa':['Active Discord community','Comunidad Discord activa','Communauté Discord active','Comunità Discord attiva','Aktive Discord-Community','مجتمع Discord نشط'],
'Scaling até 100% split':['Scaling up to 100% split','Scaling hasta 100% split','Scaling jusqu\'à 100% split','Scaling fino a 100% split','Scaling bis 100% Split','تصعيد حتى 100% تقسيم'],
'Drawdown estático':['Static drawdown','Drawdown estático','Drawdown statique','Drawdown statico','Statischer Drawdown','سحب ثابت'],
'Payout garantido 24h ciclo 7 dias':['Guaranteed 24h payout, 7-day cycle','Pago garantizado 24h, ciclo 7 días','Paiement garanti 24h, cycle 7 jours','Pagamento garantito 24h, ciclo 7 giorni','Garantierte 24h-Auszahlung, 7-Tage-Zyklus','دفع مضمون 24 ساعة، دورة 7 أيام'],
'15% bônus lucro avaliação':['15% evaluation profit bonus','15% bonus beneficio evaluación','15% bonus profit évaluation','15% bonus profitto valutazione','15% Bewertungsgewinn-Bonus','15% مكافأة ربح التقييم'],
'Trade2Earn (pontos por operar)':['Trade2Earn (points for trading)','Trade2Earn (puntos por operar)','Trade2Earn (points pour trader)','Trade2Earn (punti per operare)','Trade2Earn (Punkte für Handel)','Trade2Earn (نقاط للتداول)'],
'Suporte 24/7':['24/7 support','Soporte 24/7','Support 24/7','Supporto 24/7','24/7 Support','دعم 24/7'],
'Até 20 contas':['Up to 20 accounts','Hasta 20 cuentas','Jusqu\'à 20 comptes','Fino a 20 conti','Bis 20 Konten','حتى 20 حساب'],
'Sem taxas recorrentes':['No recurring fees','Sin tarifas recurrentes','Sans frais récurrents','Nessuna commissione ricorrente','Keine wiederkehrenden Gebühren','بدون رسوم متكررة'],
'Sem taxa mensal':['No monthly fee','Sin tarifa mensual','Sans frais mensuel','Nessuna commissione mensile','Keine monatliche Gebühr','بدون رسوم شهرية'],
'Até 3 saques/mês':['Up to 3 withdrawals/month','Hasta 3 retiros/mes','Jusqu\'à 3 retraits/mois','Fino a 3 prelievi/mese','Bis 3 Auszahlungen/Monat','حتى 3 سحوبات/شهر'],
'Até 95% split':['Up to 95% split','Hasta 95% split','Jusqu\'à 95% split','Fino al 95% split','Bis 95% Split','حتى 95% تقسيم'],
'Educação inclusa':['Education included','Educación incluida','Éducation incluse','Educazione inclusa','Ausbildung inklusive','التعليم مشمول'],
'Dashboard avançado':['Advanced dashboard','Dashboard avanzado','Tableau de bord avancé','Dashboard avanzata','Erweitertes Dashboard','لوحة تحكم متقدمة'],
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
'Sem limite de perda diária':['No daily loss limit','Sin límite de pérdida diaria','Sans limite de perte journalière','Senza limite di perdita giornaliera','Kein tägliches Verlustlimit','بدون حد خسارة يومي'],
'Licença NinjaTrader':['NinjaTrader license','Licencia NinjaTrader','Licence NinjaTrader','Licenza NinjaTrader','NinjaTrader-Lizenz','ترخيص NinjaTrader'],
'Dados em tempo real':['Real-time data','Datos en tiempo real','Données en temps réel','Dati in tempo reale','Echtzeit-Daten','بيانات في الوقت الحقيقي'],
'Copy Trader (WealthCharts)':['Copy Trader (WealthCharts)','Copy Trader (WealthCharts)','Copy Trader (WealthCharts)','Copy Trader (WealthCharts)','Copy Trader (WealthCharts)','Copy Trader (WealthCharts)'],
'Trial 14 dias grátis':['14-day free trial','Prueba 14 días gratis','Essai gratuit 14 jours','Prova gratuita 14 giorni','14 Tage kostenloser Test','تجربة مجانية 14 يوم'],
'Trade durante notícias':['Trade during news','Trading durante noticias','Trading pendant les nouvelles','Trading durante le notizie','Handel während Nachrichten','التداول أثناء الأخبار'],
'NT/Finamark grátis':['Free NT/Finamark','NT/Finamark gratis','NT/Finamark gratuit','NT/Finamark gratuito','Kostenloses NT/Finamark','NT/Finamark مجاني'],
'Escalamento até $400K':['Scaling up to $400K','Escalamiento hasta $400K','Scaling jusqu\'à $400K','Scaling fino a $400K','Scaling bis $400K','تصعيد حتى $400K'],
'Split flexível até 100%':['Flexible split up to 100%','Split flexible hasta 100%','Split flexible jusqu\'à 100%','Split flessibile fino al 100%','Flexibler Split bis 100%','تقسيم مرن حتى 100%'],
'$200M+ pagos':['$200M+ paid out','$200M+ pagados','$200M+ versés','$200M+ pagati','$200M+ ausgezahlt','$200M+ مدفوعة'],
'Scaling até 100% split':['Scaling up to 100% split','Scaling hasta 100% split','Scaling jusqu\'à 100% split','Scaling fino a 100% split','Scaling bis 100% Split','تصعيد حتى 100% تقسيم'],
'Payout 24h ciclo 7 dias':['24h payout, 7-day cycle','Pago 24h, ciclo 7 días','Paiement 24h, cycle 7 jours','Pagamento 24h, ciclo 7 giorni','24h-Auszahlung, 7-Tage-Zyklus','دفع 24 ساعة، دورة 7 أيام'],
'15% bônus lucro avaliação':['15% evaluation profit bonus','15% bonus beneficio evaluación','15% bonus profit évaluation','15% bonus profitto valutazione','15% Bewertungsgewinn-Bonus','15% مكافأة ربح التقييم'],
'Trade2Earn':['Trade2Earn','Trade2Earn','Trade2Earn','Trade2Earn','Trade2Earn','Trade2Earn'],
'90% split de lucro':['90% profit split','90% split de beneficio','90% split de profit','90% split del profitto','90% Gewinn-Split','90% تقسيم أرباح'],
'$500M+ pagos':['$500M+ paid out','$500M+ pagados','$500M+ versés','$500M+ pagati','$500M+ ausgezahlt','$500M+ مدفوعة'],
'Sem regra de escalamento':['No scaling rules','Sin regla de escalamiento','Sans règle de scaling','Nessuna regola di scaling','Keine Scaling-Regeln','بدون قواعد تصعيد'],
// PLAT_DETAIL — about texts (updated with richer data)
'Fundada em <b>2011</b> nos EUA. A plataforma de gráficos <b>mais usada do mundo</b> com <b>50M+ de usuários</b> em 190+ países. Indicadores profissionais, alertas avançados, screener e a maior comunidade de traders do mundo. <b>Pine Script</b> para criar indicadores customizados.':['Founded in <b>2011</b> in the USA. The <b>world\'s most used</b> charting platform with <b>50M+ users</b> in 190+ countries. Professional indicators, advanced alerts, screener and the world\'s largest trader community. <b>Pine Script</b> for custom indicators.','Fundada en <b>2011</b> en EE.UU. La plataforma de gráficos <b>más usada del mundo</b> con <b>50M+ de usuarios</b> en 190+ países. Indicadores profesionales, alertas avanzadas, screener y la mayor comunidad de traders del mundo. <b>Pine Script</b> para indicadores personalizados.','Fondée en <b>2011</b> aux États-Unis. La plateforme de graphiques <b>la plus utilisée au monde</b> avec <b>50M+ d\'utilisateurs</b> dans 190+ pays. Indicateurs professionnels, alertes avancées, screener et la plus grande communauté de traders. <b>Pine Script</b> pour indicateurs personnalisés.','Fondata nel <b>2011</b> negli USA. La piattaforma di grafici <b>più usata al mondo</b> con <b>50M+ di utenti</b> in 190+ paesi. Indicatori professionali, avvisi avanzati, screener e la più grande comunità di trader. <b>Pine Script</b> per indicatori personalizzati.','Gegründet <b>2011</b> in den USA. Die <b>weltweit meistgenutzte</b> Charting-Plattform mit <b>50M+ Nutzern</b> in 190+ Ländern. Professionelle Indikatoren, erweiterte Benachrichtigungen, Screener und die größte Trader-Community. <b>Pine Script</b> für benutzerdefinierte Indikatoren.','تأسست في <b>2011</b> في الولايات المتحدة. منصة الرسوم البيانية <b>الأكثر استخداماً في العالم</b> مع <b>50 مليون+ مستخدم</b> في 190+ دولة. مؤشرات احترافية، تنبيهات متقدمة، فاحص وأكبر مجتمع متداولين. <b>Pine Script</b> لمؤشرات مخصصة.'],
'Fundada em <b>2003</b> por Raymond Deux em Denver, Colorado (HQ em Chicago). <b>500K+ usuários</b> em 150+ países. Adquiriu a <b>Tradovate</b> em 2023. Aceita pela <b>maioria das Prop Firms</b> de futuros.':['Founded in <b>2003</b> by Raymond Deux in Denver, Colorado (HQ in Chicago). <b>500K+ users</b> in 150+ countries. Acquired <b>Tradovate</b> in 2023. Accepted by <b>most futures Prop Firms</b>.','Fundada en <b>2003</b> por Raymond Deux en Denver, Colorado (HQ en Chicago). <b>500K+ usuarios</b> en 150+ países. Adquirió <b>Tradovate</b> en 2023. Aceptada por la <b>mayoría de las Prop Firms</b> de futuros.','Fondée en <b>2003</b> par Raymond Deux à Denver, Colorado (siège à Chicago). <b>500K+ utilisateurs</b> dans 150+ pays. Acquisition de <b>Tradovate</b> en 2023. Acceptée par la <b>plupart des Prop Firms</b> futures.','Fondata nel <b>2003</b> da Raymond Deux a Denver, Colorado (sede a Chicago). <b>500K+ utenti</b> in 150+ paesi. Acquisizione di <b>Tradovate</b> nel 2023. Accettata dalla <b>maggior parte delle Prop Firms</b> futures.','Gegründet <b>2003</b> von Raymond Deux in Denver, Colorado (HQ in Chicago). <b>500K+ Nutzer</b> in 150+ Ländern. Übernahme von <b>Tradovate</b> 2023. Von den <b>meisten Futures Prop Firms</b> akzeptiert.','تأسست في <b>2003</b> بواسطة ريموند دو في دنفر، كولورادو (المقر في شيكاغو). <b>500 ألف+ مستخدم</b> في 150+ دولة. استحوذت على <b>Tradovate</b> في 2023. مقبولة من <b>معظم شركات Prop</b> للعقود الآجلة.'],
// PLAT_DETAIL — credit text
'Ao assinar pela Markets Coupons, você recebe <b>$15 de crédito</b> na sua conta TradingView.':['By subscribing through Markets Coupons, you get <b>$15 credit</b> on your TradingView account.','Al suscribirte por Markets Coupons, recibes <b>$15 de crédito</b> en tu cuenta TradingView.','En vous abonnant via Markets Coupons, vous recevez <b>15$ de crédit</b> sur votre compte TradingView.','Iscrivendoti tramite Markets Coupons, ricevi <b>$15 di credito</b> sul tuo account TradingView.','Wenn Sie sich über Markets Coupons anmelden, erhalten Sie <b>$15 Guthaben</b> auf Ihrem TradingView-Konto.','عند الاشتراك عبر Markets Coupons، تحصل على <b>رصيد $15</b> في حسابك على TradingView.'],
// PLAT_DETAIL — highlight labels
'Usuários':['Users','Usuarios','Utilisateurs','Utenti','Nutzer','المستخدمون'],
'OFF Anual':['OFF Annual','OFF Anual','OFF Annuel','OFF Annuale','RABATT Jährlich','خصم سنوي'],
'Crédito na conta':['Account credit','Crédito en la cuenta','Crédit sur le compte','Credito sul conto','Kontoguthaben','رصيد في الحساب'],
'Plano disponível':['Plan available','Plan disponible','Plan disponible','Piano disponibile','Plan verfügbar','خطة متاحة'],
'Automação':['Automation','Automatización','Automatisation','Automazione','Automatisierung','الأتمتة'],
'Anos no mercado':['Years in market','Años en el mercado','Ans sur le marché','Anni nel mercato','Jahre im Markt','سنوات في السوق'],
// PLAT_DETAIL — plan feature lines
'2 gráficos/aba · 5 indicadores · 40 alertas':['2 charts/tab · 5 indicators · 40 alerts','2 gráficos/pestaña · 5 indicadores · 40 alertas','2 graphiques/onglet · 5 indicateurs · 40 alertes','2 grafici/tab · 5 indicatori · 40 avvisi','2 Charts/Tab · 5 Indikatoren · 40 Alarme','2 رسم بياني/علامة · 5 مؤشرات · 40 تنبيه'],
'4 gráficos/aba · 10 indicadores · 200 alertas':['4 charts/tab · 10 indicators · 200 alerts','4 gráficos/pestaña · 10 indicadores · 200 alertas','4 graphiques/onglet · 10 indicateurs · 200 alertes','4 grafici/tab · 10 indicatori · 200 avvisi','4 Charts/Tab · 10 Indikatoren · 200 Alarme','4 رسم بياني/علامة · 10 مؤشرات · 200 تنبيه'],
'8 gráficos/aba · 25 indicadores · 800 alertas':['8 charts/tab · 25 indicators · 800 alerts','8 gráficos/pestaña · 25 indicadores · 800 alertas','8 graphiques/onglet · 25 indicateurs · 800 alertes','8 grafici/tab · 25 indicatori · 800 avvisi','8 Charts/Tab · 25 Indikatoren · 800 Alarme','8 رسم بياني/علامة · 25 مؤشر · 800 تنبيه'],
'16 gráficos/aba · 50 indicadores · 2.000 alertas':['16 charts/tab · 50 indicators · 2,000 alerts','16 gráficos/pestaña · 50 indicadores · 2.000 alertas','16 graphiques/onglet · 50 indicateurs · 2 000 alertes','16 grafici/tab · 50 indicatori · 2.000 avvisi','16 Charts/Tab · 50 Indikatoren · 2.000 Alarme','16 رسم بياني/علامة · 50 مؤشر · 2,000 تنبيه'],
'Dados EOD gratuitos':['Free EOD data','Datos EOD gratuitos','Données EOD gratuites','Dati EOD gratuiti','Kostenlose EOD-Daten','بيانات EOD مجانية'],
'Dados em tempo real inclusos':['Real-time data included','Datos en tiempo real incluidos','Données en temps réel incluses','Dati in tempo reale inclusi','Echtzeit-Daten inklusive','بيانات فورية مضمنة'],
'Licença vitalícia + dados real-time':['Lifetime license + real-time data','Licencia vitalicia + datos real-time','Licence à vie + données temps réel','Licenza a vita + dati real-time','Lebenslange Lizenz + Echtzeit-Daten','ترخيص مدى الحياة + بيانات فورية'],
// NinjaTrader — new includes & highlights
'Usuários ativos':['Active users','Usuarios activos','Utilisateurs actifs','Utenti attivi','Aktive Nutzer','المستخدمون النشطون'],
'SuperDOM + Order Flow+':['SuperDOM + Order Flow+','SuperDOM + Order Flow+','SuperDOM + Order Flow+','SuperDOM + Order Flow+','SuperDOM + Order Flow+','SuperDOM + Order Flow+'],
'100+ indicadores nativos':['100+ native indicators','100+ indicadores nativos','100+ indicateurs natifs','100+ indicatori nativi','100+ native Indikatoren','100+ مؤشر أصلي'],
'Automação NinjaScript (C#)':['NinjaScript automation (C#)','Automatización NinjaScript (C#)','Automatisation NinjaScript (C#)','Automazione NinjaScript (C#)','NinjaScript-Automatisierung (C#)','أتمتة NinjaScript (C#)'],
'Strategy Analyzer (backtest)':['Strategy Analyzer (backtest)','Strategy Analyzer (backtest)','Strategy Analyzer (backtest)','Strategy Analyzer (backtest)','Strategy Analyzer (Backtest)','Strategy Analyzer (اختبار)'],
'ATM Strategies':['ATM Strategies','ATM Strategies','ATM Strategies','ATM Strategies','ATM Strategies','ATM Strategies'],
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
'Backtesting':['Backtesting','Backtesting','Backtesting','Backtesting','Backtesting','اختبار خلفي'],
'Milhares de add-ons':['Thousands of add-ons','Miles de add-ons','Milliers d\'add-ons','Migliaia di add-on','Tausende Add-ons','آلاف الإضافات'],
'Automação':['Automation','Automatización','Automatisation','Automazione','Automatisierung','الأتمتة'],
'Apex, Bulenox, Topstep +7':['Apex, Bulenox, Topstep +7','Apex, Bulenox, Topstep +7','Apex, Bulenox, Topstep +7','Apex, Bulenox, Topstep +7','Apex, Bulenox, Topstep +7','Apex, Bulenox, Topstep +7'],
'Marketplace':['Marketplace','Marketplace','Marketplace','Marketplace','Marktplatz','السوق'],
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
// Consistency values
'Not required':['Não exige','No requiere','Non requise','Non richiesta','Nicht erforderlich','غير مطلوب'],
'50% Best Day':['50% Melhor Dia','50% Mejor Día','50% Meilleur Jour','50% Miglior Giorno','50% Bester Tag','50% أفضل يوم'],
'40%':['40%','40%','40%','40%','40%','40%'],
'Yes':['Sim','Sí','Oui','Sì','Ja','نعم'],
// Payout speed values
'5 days':['5 dias','5 días','5 jours','5 giorni','5 Tage','5 أيام'],
'Weekly':['Semanal','Semanal','Hebdomadaire','Settimanale','Wöchentlich','أسبوعي'],
'Instant':['Instantâneo','Instantáneo','Instantané','Istantaneo','Sofort','فوري'],
'14 days':['14 dias','14 días','14 jours','14 giorni','14 Tage','14 يوم'],
'24h':['24h','24h','24h','24h','24h','24 ساعة'],
'Monthly':['Mensal','Mensual','Mensuel','Mensile','Monatlich','شهري'],
'16h avg':['16h média','16h promedio','16h moyenne','16h media','16h Durchschn.','16 ساعة متوسط'],
'On Demand':['Sob Demanda','Bajo Demanda','Sur Demande','Su Richiesta','Auf Anfrage','عند الطلب'],
'Bi-weekly':['Quinzenal','Quincenal','Bimensuel','Bisettimanale','Zweiwöchentlich','نصف شهري'],
'3 days':['3 dias','3 días','3 jours','3 giorni','3 Tage','3 أيام'],
};
function tf(s){if(!s||typeof _currentLang==='undefined'||_currentLang==='pt')return s;const r=FIRM_T[s];if(!r)return s;const i=_ftL.indexOf(_currentLang);return i>=0&&r[i]?r[i]:s;}

/* NAV */
// Page ID → clean URL slug mapping
const PAGE_SLUGS={home:'',firms:'firms',plataformas:'platforms',indicators:'indicators',compare:'compare',calendar:'calendar',heatmap:'heatmap',analise:'analysis',gamma:'gamma',guides:'guides',blog:'blog',live:'live',quiz:'quiz',awards:'awards',painel:'panel',loyalty:'loyalty','pro-success':'pro-success',calc:'calculator',privacy:'privacy',terms:'terms'};
const SLUG_PAGES=Object.fromEntries(Object.entries(PAGE_SLUGS).map(([k,v])=>[v,k]));
function _pageUrl(page){const s=PAGE_SLUGS[page];return s?'/'+s:'/';}
function _pageFromPath(){const p=location.pathname.replace(/^\/(en|es|fr|de|it|ar)\//,'/').replace(/^\//,'').replace(/\/$/,'');return SLUG_PAGES[p]||'';}
function go(page, skipPush){
  // Limpa timers de página anterior pra evitar memory leak
  if (_currentPage === 'calendar' && page !== 'calendar') {
    if (_calRefreshTimer) { clearInterval(_calRefreshTimer); _calRefreshTimer = null; }
    if (_calCdTimer) { clearInterval(_calCdTimer); _calCdTimer = null; }
  }
  _currentPage=page;
  try { document.body.dataset.page = page; } catch(e){} // pra CSS condicional (ex: bot-fab posicionamento por page)
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById('page-'+page);if(pg)pg.classList.add('active');
  document.querySelectorAll('.nt').forEach(t=>t.classList.toggle('active',t.dataset.p===page));
  window.scrollTo({top:0,behavior:'instant'});
  if(!skipPush) history.pushState({page}, '', _pageUrl(page));
  try{sessionStorage.setItem('mc_page',page);}catch(e){}
  track('page_view',{page_name:page});
  // Preview banner only on gated pages
  if(page!=='analise'&&page!=='gamma') removePreviewBanner();
  if(page==='live'){ if(_authLoaded) checkLoyaltyAndShowLive(); else showLiveGatePreview(); }
  if(page==='analise' && _authLoaded) checkAnalysisGate();
  if(page==='loyalty') renderLoyaltyPage();
  if(page==='painel' && !isAuthed() && _authLoaded) { if(!currentUser) openAuthModal('login'); else showConfirmEmailModal('pending'); go('home'); return; }
  if(page==='painel' && !isAuthed() && !_authLoaded) { _authReadyPromise?.then(()=>{ if(!isAuthed()){ if(!currentUser) openAuthModal('login'); else showConfirmEmailModal('pending'); go('home'); } }); }
  if(page==='gamma') loadGEX();
  if(page==='pro-success'){
    go('analise');
    setTimeout(()=>{showProSuccessOverlay();checkAnalysisGate();},500);
    return;
  }
}
window.addEventListener('popstate',()=>{const page=_pageFromPath()||location.hash.replace('#','')||'home';if(document.getElementById('page-'+page))go(page,true);else go('home',true);});
// Backward compat: redirect old # URLs to clean URLs
if(location.hash && !location.hash.startsWith('#firm/')){const _oldPage=location.hash.replace('#','');if(PAGE_SLUGS[_oldPage]!==undefined){history.replaceState(null,'',_pageUrl(_oldPage));}}
function toggleMM(){const open=document.getElementById('mm').classList.toggle('open');document.getElementById('mm-ov').classList.toggle('open',open);document.getElementById('hbg').classList.toggle('open',open);document.body.style.overflow=open?'hidden':'';track('menu_toggle',{state:open?'open':'close'});}
function closeMM(){['mm','mm-ov','hbg'].forEach(id=>document.getElementById(id)?.classList.remove('open'));document.body.style.overflow='';}
function mgo(p){closeMM();go(p);}
/* ─── GLOBAL SEARCH ─── */
function globalSearch(q){
  const box=document.getElementById('global-search-results');
  if(!box)return;
  q=(q||'').trim().toLowerCase();
  if(q.length<2){box.classList.remove('open');box.innerHTML='';return;}
  track('search',{query:q.slice(0,50),page:_currentPage||'home'});
  const results=[];
  // Search pages/sections
  const pages=[
    {id:'home',icon:'tag',label:t('nav_ofertas'),sub:t('nav_ofertas'),color:'#F0B429'},
    {id:'firms',icon:'briefcase',label:t('nav_firmas'),sub:t('nav_firmas'),color:'#F0B429'},
    {id:'plataformas',icon:'monitor',label:t('nav_plataformas'),sub:t('nav_plataformas'),color:'#8B5CF6'},
    {id:'indicators',icon:'activity',label:t('nav_indicadores'),sub:t('nav_indicadores'),color:'#22C55E'},
    {id:'compare',icon:'bar',label:t('nav_comparar'),sub:t('nav_comparar'),color:'#3B82F6'},
    {id:'calendar',icon:'cal',label:t('nav_calendario'),sub:t('nav_calendario'),color:'#EF4444'},
    {id:'heatmap',icon:'grid',label:t('nav_heatmap'),sub:t('nav_heatmap'),color:'#F97316'},
    {id:'analise',icon:'search',label:t('nav_analise'),sub:t('nav_analise'),color:'#06B6D4'},
    {id:'guides',icon:'book',label:t('nav_guias'),sub:t('nav_guias'),color:'#8B5CF6'},
    {id:'blog',icon:'edit',label:t('nav_blog'),sub:t('nav_blog'),color:'#EC4899'},
    {id:'calc',icon:'calc',label:t('nav_calc'),sub:'Position Size Calculator',color:'#22C55E'},
    {id:'quiz',icon:'?',label:t('nav_quiz'),sub:'Quiz',color:'#F59E0B'},
    {id:'faq',icon:'faq',label:t('nav_faq'),sub:'FAQ',color:'#64748B'},
    {id:'awards',icon:'award',label:'Awards',sub:'Awards',color:'#F0B429'},
    {id:'live',icon:'live',label:'Live Room',sub:'Live Room VIP',color:'#EF4444'},
  ];
  pages.forEach(p=>{
    if(p.label.toLowerCase().includes(q)||p.sub.toLowerCase().includes(q)||p.id.includes(q))
      results.push({type:'page',...p});
  });
  // Search firms
  if(typeof FIRMS!=='undefined'){
    FIRMS.filter(f=>f.name.toLowerCase().includes(q)||f.id.includes(q)||(f.coupon||'').toLowerCase().includes(q))
      .slice(0,5).forEach(f=>{
        results.push({type:'firm',id:f.id,label:f.name,sub:f.type+(f.coupon?' · '+f.coupon:''),color:f.color,icon_url:f.icon_url,icon:f.icon});
      });
  }
  if(!results.length){box.classList.remove('open');box.innerHTML='';return;}
  box.innerHTML=results.slice(0,8).map(r=>{
    const iconHtml=r.icon_url
      ?`<img src="${r.icon_url}" style="width:28px;height:28px;border-radius:6px;object-fit:contain;background:${r.color||'#222'};">`
      :`<div class="nav-search-item-icon" style="background:${r.color||'#333'};color:#fff;">${(r.icon||r.label[0]).substring(0,2)}</div>`;
    const action=r.type==='firm'?`openD('${r.id}')`:`go('${r.id}')`;
    return `<div class="nav-search-item" onclick="${action};document.getElementById('global-search-results').classList.remove('open');document.getElementById('global-search').value='';">
      ${iconHtml}
      <div class="nav-search-item-text"><div class="nav-search-item-title">${r.label}</div><div class="nav-search-item-sub">${r.sub}</div></div>
    </div>`;
  }).join('');
  box.classList.add('open');
}
// Close search on click outside
document.addEventListener('click',e=>{
  const sr=document.getElementById('global-search-results');
  const si=document.getElementById('global-search');
  if(sr&&!sr.contains(e.target)&&e.target!==si)sr.classList.remove('open');
});

/* ─── TRANSLATION ENGINE ─── */
let _currentLang = 'en';
let _cmsTexts = {}; // DB overrides loaded from cms_texts
let _siteSettings = {}; // site_settings key-value from Supabase
function t(key) {
  // Prioridade: I18N (sobrescrito por tabela `i18n` no Supabase, que é onde o admin edita) → cms_texts (fallback legacy) → I18N.en → key literal
  const i18nVal = (I18N[_currentLang] && I18N[_currentLang][key]) || I18N.en[key];
  if (i18nVal) return i18nVal;
  if (_cmsTexts[key]) return _cmsTexts[key][_currentLang] || _cmsTexts[key].en || _cmsTexts[key].pt || key;
  return key;
}
function detectLang() {
  // Priority 1: URL path language (/en/, /es/apex, etc.)
  const _pathLangs=['en','es','fr','de','it','ar'];
  const _pathParts=location.pathname.split('/').filter(Boolean);
  if(_pathParts.length>0 && _pathLangs.includes(_pathParts[0])){
    localStorage.setItem('mc_lang',_pathParts[0]);
    return _pathParts[0];
  }
  // Priority 2: URL query param (?lang=en)
  const _qLang=new URLSearchParams(location.search).get('lang');
  if(_qLang && I18N[_qLang]) return _qLang;
  // Priority 3: Hash param (#lang=en)
  const _hMatch=location.hash.match(/lang=(\w+)/);
  if(_hMatch && I18N[_hMatch[1]]) return _hMatch[1];
  // Priority 4: Saved preference
  const saved = localStorage.getItem('mc_lang');
  if (saved && I18N[saved]) return saved;
  // Priority 5: Browser language
  const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  if (nav.startsWith('en')) return 'en';
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('it')) return 'it';
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('ar')) return 'ar';
  return 'en';
}
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    let val = t(key);
    // Interpolação de placeholders: {name} via data-bot-name
    const _name = el.getAttribute('data-bot-name');
    if (_name && typeof val === 'string' && val.indexOf('{name}') !== -1) {
      val = val.replace(/\{name\}/g, _name);
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
    else if (el.tagName === 'OPTION') el.textContent = val;
    else {
      const svg = el.querySelector('svg');
      if (svg) { el.innerHTML = ''; el.appendChild(svg); el.append(val); }
      else el.innerHTML = val;
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
}
function updateTVWidgets(lang) {
  const hmF = document.getElementById('heatmap-frame');
  if(hmF) loadHeatmap(hmF.dataset.source||'SPX500');
}
function _loadLangChunk(lang){
  if (window.I18N && window.I18N[lang]) return Promise.resolve();
  return new Promise((resolve)=>{
    var s=document.createElement('script');
    s.src='/i18n-'+lang+'.js?v=20260521';
    s.onload=resolve; s.onerror=()=>resolve();
    document.head.appendChild(s);
  });
}
async function setL(lang,flag,code){
  await _loadLangChunk(lang);
  _currentLang = lang;
  localStorage.setItem('mc_lang', lang);
  document.getElementById('l-flag').textContent=flag;
  document.getElementById('l-code').textContent=' '+code;
  document.body.dir=lang==='ar'?'rtl':'ltr';
  applyTranslations();
  // If reading a blog article, reload it in the new language
  if(_openBlogSlug && _openBlogGroup){
    db.from('blog_posts').select('slug').eq('article_group',_openBlogGroup).eq('lang',lang).eq('active',true).maybeSingle().then(({data})=>{
      if(data) openBlogArticle(data.slug);
      else { closeBlogArticle(); renderBlog(); }
    });
  } else if(_openBlogSlug){
    closeBlogArticle(); renderBlog();
  }
  renderHome(); renderOffers(); renderAwards(); renderFaq(); renderPlatforms(); renderGuides();
  if(!_openBlogSlug) renderBlog();
  renderQuiz(); applyF(); renderPolicies(); renderAchPlans();
  // Re-render daily analysis sync with cached data so labels/text atualizam imediato
  if(_lastDailyData && _lastDailyData.length) renderDailyCards(_lastDailyData);
  loadDailyAnalysis(); checkAnalysisGate(); loadCalendar(true); if(_authLoaded) checkLoyaltyAndShowLive(); else showLiveGatePreview();
  // Re-render open drawer if language changed
  const activeFr = document.querySelector('.fr.active');
  if (activeFr && document.getElementById('drw')?.classList.contains('open')) openD(activeFr.dataset.id);
  // Re-render promo topbar so "Ends in:" label picks up new translation
  if (typeof renderPromoTopbar === 'function') renderPromoTopbar();
  // Re-render open desktop firm overlay so checkout pill label updates
  const fdOpen = document.getElementById('fd-overlay');
  if (fdOpen && fdOpen.classList.contains('show') && typeof _fdCurrent !== 'undefined' && _fdCurrent) {
    const _f = FIRMS.find(x=>x.id===_fdCurrent);
    if (_f && typeof fdRenderRight === 'function') fdRenderRight(_fdCurrent, _f);
  }
  updateTVWidgets(lang);
  // Update bot welcome message language but keep conversation history
  if(typeof botHist!=='undefined'){
    const welcomeEl=document.querySelector('#bot-msgs .bmsg.bot:first-child .bbbl[data-i18n="bot_welcome"]');
    if(welcomeEl) welcomeEl.innerHTML=t('bot_welcome');
    const nowEls=document.querySelectorAll('#bot-msgs .btime[data-i18n="bot_now"]');
    nowEls.forEach(el=>{ el.textContent=t('bot_now'); });
  }
  track('language_change',{language:lang});
}
function initLang() {
  _currentLang = detectLang();
  const codes = {pt:'BR',en:'EN',es:'ES',it:'IT',fr:'FR',de:'DE',ar:'AR'};
  document.getElementById('l-code').textContent = ' ' + (codes[_currentLang]||'EN');
  document.body.dir = _currentLang==='ar'?'rtl':'ltr';
  applyTranslations();
  updateTVWidgets(_currentLang);
  // Update meta tags with translated content
  document.title = t('meta_title');
  const metaDesc = document.querySelector('meta[name="description"]');
  if(metaDesc) metaDesc.content = t('meta_description');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if(ogTitle) ogTitle.content = t('meta_title');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if(ogDesc) ogDesc.content = t('meta_og_description');
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if(twDesc) twDesc.content = t('meta_og_description');
  // Update canonical for language path URLs (/en/, /es/, etc.)
  const _langPath=location.pathname.split('/').filter(Boolean);
  const _isLangPage=['en','es','fr','de','it','ar'].includes(_langPath[0])&&_langPath.length===1;
  if(_isLangPage){
    const canon=document.querySelector('link[rel="canonical"]');
    if(canon) canon.href='https://www.marketscoupons.com/'+_langPath[0]+'/';
    const ogUrl=document.querySelector('meta[property="og:url"]');
    if(ogUrl) ogUrl.content='https://www.marketscoupons.com/'+_langPath[0]+'/';
  }
  // Race fix i18n: o chunk i18n-<lang>.js é injetado async → pode não ter chegado
  // quando initLang roda → 1ª render sai em EN (ex: gate da Análise em inglês com BR).
  // Se o idioma ainda não está carregado, busca o chunk e re-aplica tudo ao chegar.
  if(_currentLang!=='en' && !(window.I18N && window.I18N[_currentLang])){
    _loadLangChunk(_currentLang).then(()=>{
      // re-roda initLang inteiro (traduções + meta tags title/description) — sem
      // recursão: o chunk já está em window.I18N, então este bloco é pulado.
      try{ initLang(); }catch(_){}
      try{ if(typeof checkAnalysisGate==='function') checkAnalysisGate(); }catch(_){}
      try{ if(typeof checkGEXGate==='function') checkGEXGate(); }catch(_){}
    });
  }
}

/* ─── SEO: Dynamic meta tags + Schema for dedicated firm pages ─── */
const FIRM_SEO_META={
  pt:{title:'{name} Cupom — {discount}% OFF | {coupon} | MarketsCoupons',titleNoCoupon:'{name} — Planos e Avaliação | MarketsCoupons',desc:'Economize até {discount}% na {name} com o cupom exclusivo {coupon}. Planos a partir de {minPrice}. Trustpilot {rating}/5 ({reviews} avaliações).',descNoCoupon:'{name}: planos a partir de {minPrice}, {split} profit split. Trustpilot {rating}/5 ({reviews} avaliações). Compare e escolha.',og:'Cupom exclusivo {name} com até {discount}% OFF. Código {coupon}. Compare planos, preços e avaliações no MarketsCoupons.'},
  en:{title:'{name} Coupon — {discount}% OFF | {coupon} | MarketsCoupons',titleNoCoupon:'{name} — Plans & Review | MarketsCoupons',desc:'Save up to {discount}% on {name} with exclusive coupon code {coupon}. Plans from {minPrice}. Trustpilot {rating}/5 ({reviews} reviews).',descNoCoupon:'{name}: plans from {minPrice}, {split} profit split. Trustpilot {rating}/5 ({reviews} reviews). Compare and choose.',og:'Exclusive {name} coupon with up to {discount}% OFF. Code {coupon}. Compare plans, prices and reviews on MarketsCoupons.'},
  es:{title:'{name} Cupón — {discount}% OFF | {coupon} | MarketsCoupons',titleNoCoupon:'{name} — Planes y Reseña | MarketsCoupons',desc:'Ahorra hasta {discount}% en {name} con el cupón exclusivo {coupon}. Planes desde {minPrice}. Trustpilot {rating}/5 ({reviews} reseñas).',descNoCoupon:'{name}: planes desde {minPrice}, {split} profit split. Trustpilot {rating}/5 ({reviews} reseñas). Compara y elige.',og:'Cupón exclusivo {name} con hasta {discount}% OFF. Código {coupon}. Compara planes, precios y reseñas en MarketsCoupons.'},
  it:{title:'{name} Coupon — {discount}% OFF | {coupon} | MarketsCoupons',titleNoCoupon:'{name} — Piani e Recensione | MarketsCoupons',desc:'Risparmia fino al {discount}% su {name} con il coupon esclusivo {coupon}. Piani da {minPrice}. Trustpilot {rating}/5 ({reviews} recensioni).',descNoCoupon:'{name}: piani da {minPrice}, {split} profit split. Trustpilot {rating}/5 ({reviews} recensioni). Confronta e scegli.',og:'Coupon esclusivo {name} con fino al {discount}% OFF. Codice {coupon}. Confronta piani, prezzi e recensioni su MarketsCoupons.'},
  fr:{title:'{name} Coupon — {discount}% OFF | {coupon} | MarketsCoupons',titleNoCoupon:'{name} — Plans et Avis | MarketsCoupons',desc:'Économisez jusqu\'à {discount}% sur {name} avec le coupon exclusif {coupon}. Plans à partir de {minPrice}. Trustpilot {rating}/5 ({reviews} avis).',descNoCoupon:'{name}: plans à partir de {minPrice}, {split} profit split. Trustpilot {rating}/5 ({reviews} avis). Comparez et choisissez.',og:'Coupon exclusif {name} avec jusqu\'à {discount}% OFF. Code {coupon}. Comparez plans, prix et avis sur MarketsCoupons.'},
  de:{title:'{name} Gutschein — {discount}% OFF | {coupon} | MarketsCoupons',titleNoCoupon:'{name} — Pläne & Bewertung | MarketsCoupons',desc:'Sparen Sie bis zu {discount}% bei {name} mit dem exklusiven Gutschein {coupon}. Pläne ab {minPrice}. Trustpilot {rating}/5 ({reviews} Bewertungen).',descNoCoupon:'{name}: Pläne ab {minPrice}, {split} Profit Split. Trustpilot {rating}/5 ({reviews} Bewertungen). Vergleichen und wählen.',og:'Exklusiver {name} Gutschein mit bis zu {discount}% OFF. Code {coupon}. Vergleichen Sie Pläne, Preise und Bewertungen auf MarketsCoupons.'},
  ar:{title:'{name} كوبون — {discount}% OFF | {coupon} | MarketsCoupons',titleNoCoupon:'{name} — الخطط والمراجعة | MarketsCoupons',desc:'وفر حتى {discount}% على {name} مع كوبون حصري {coupon}. خطط تبدأ من {minPrice}. Trustpilot {rating}/5 ({reviews} تقييم).',descNoCoupon:'{name}: خطط تبدأ من {minPrice}، {split} profit split. Trustpilot {rating}/5 ({reviews} تقييم). قارن واختر.',og:'كوبون حصري {name} مع خصم يصل إلى {discount}%. الكود {coupon}. قارن الخطط والأسعار والتقييمات على MarketsCoupons.'}
};
function setFirmSEO(id){
  const f=FIRMS.find(x=>x.id===id);if(!f)return;
  const lang=_currentLang||'en';
  const seo=FIRM_SEO_META[lang]||FIRM_SEO_META.pt;
  const hasCoupon=f.coupon&&f.discount>0;
  const minPrice=f.prices&&f.prices[0]?f.prices[0].n:'';
  const vars={'{name}':f.name,'{discount}':f.discount,'{coupon}':f.coupon||'','{minPrice}':minPrice,'{rating}':f.rating,'{reviews}':f.reviews,'{split}':f.split};
  function fill(tpl){let s=tpl;for(const[k,v]of Object.entries(vars))s=s.replaceAll(k,v);return s;}
  const title=fill(hasCoupon?seo.title:seo.titleNoCoupon);
  const desc=fill(hasCoupon?seo.desc:seo.descNoCoupon);
  const og=fill(hasCoupon?seo.og:seo.descNoCoupon);
  // Update title
  document.title=title;
  // Update meta description
  const md=document.querySelector('meta[name="description"]');if(md)md.content=desc;
  // Update keywords
  const mk=document.querySelector('meta[name="keywords"]');
  if(mk)mk.content=f.name+' coupon, '+f.name+' discount, '+f.name+' cupom, '+f.name+' review, '+f.name+' promo code, prop firm coupon, '+f.name+' '+new Date().getFullYear();
  // Update canonical
  const canon=document.querySelector('link[rel="canonical"]');if(canon)canon.href='https://www.marketscoupons.com/'+id;
  // Update OG tags
  const ogUrl=document.querySelector('meta[property="og:url"]');if(ogUrl)ogUrl.content='https://www.marketscoupons.com/'+id;
  const ogTitle=document.querySelector('meta[property="og:title"]');if(ogTitle)ogTitle.content=title;
  const ogDesc=document.querySelector('meta[property="og:description"]');if(ogDesc)ogDesc.content=og;
  const ogImg=document.querySelector('meta[property="og:image"]');if(ogImg&&f.icon_url)ogImg.content='https://www.marketscoupons.com/'+f.icon_url;
  // Update Twitter tags
  const twTitle=document.querySelector('meta[name="twitter:title"]');if(twTitle)twTitle.content=title;
  const twDesc=document.querySelector('meta[name="twitter:description"]');if(twDesc)twDesc.content=og;
  const twImg=document.querySelector('meta[name="twitter:image"]');if(twImg&&f.icon_url)twImg.content='https://www.marketscoupons.com/'+f.icon_url;
  // Update hreflang to firm page (path-based)
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link=>{
    const hl=link.getAttribute('hreflang');
    if(hl==='x-default'||hl==='pt')link.href='https://www.marketscoupons.com/'+id;
    else link.href='https://www.marketscoupons.com/'+hl+'/'+id;
  });
  // Inject Product schema JSON-LD
  let schemaEl=document.getElementById('seo-firm-schema');
  if(!schemaEl){schemaEl=document.createElement('script');schemaEl.type='application/ld+json';schemaEl.id='seo-firm-schema';document.head.appendChild(schemaEl);}
  const schema={
    '@context':'https://schema.org',
    '@type':'Product',
    name:f.name+(hasCoupon?' — '+f.discount+'% OFF Coupon':''),
    description:desc,
    image:'https://www.marketscoupons.com/'+f.icon_url,
    url:'https://www.marketscoupons.com/'+id,
    brand:{'@type':'Brand',name:f.name},
    category:'Prop Firm',
    aggregateRating:{'@type':'AggregateRating',ratingValue:f.rating,bestRating:5,worstRating:1,reviewCount:f.reviews,url:f.trustpilot?.url||''},
    offers:{'@type':'AggregateOffer',priceCurrency:'USD',lowPrice:minPrice.replace(/[^0-9.]/g,''),offerCount:f.prices?.length||1,availability:'https://schema.org/InStock'}
  };
  if(hasCoupon){
    schema.offers.priceSpecification={'@type':'PriceSpecification',price:minPrice.replace(/[^0-9.]/g,''),priceCurrency:'USD',valueAddedTaxIncluded:true};
  }
  schemaEl.textContent=JSON.stringify(schema);
  // Inject BreadcrumbList schema
  let bcEl=document.getElementById('seo-firm-breadcrumb');
  if(!bcEl){bcEl=document.createElement('script');bcEl.type='application/ld+json';bcEl.id='seo-firm-breadcrumb';document.head.appendChild(bcEl);}
  bcEl.textContent=JSON.stringify({
    '@context':'https://schema.org','@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:'MarketsCoupons',item:'https://www.marketscoupons.com/'},
      {'@type':'ListItem',position:2,name:t('nav_firms')||'Firmas',item:'https://www.marketscoupons.com/#firms'},
      {'@type':'ListItem',position:3,name:f.name,item:'https://www.marketscoupons.com/'+id}
    ]
  });
  // Inject SEO-visible content for crawlers (hidden from users, visible in DOM)
  let seoBlock=document.getElementById('seo-firm-content');
  if(!seoBlock){
    seoBlock=document.createElement('article');
    seoBlock.id='seo-firm-content';
    seoBlock.setAttribute('aria-hidden','true');
    seoBlock.style.cssText='position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(seoBlock);
  }
  const fa=FIRM_ABOUT[id];
  const aboutText=fa?.about?.replace(/<[^>]+>/g,'')||f.desc||'';
  const perksText=(f.perks||[]).join(', ');
  const platsText=(f.platforms||[]).join(', ');
  const pricesHtml=(f.prices||[]).map(p=>'<li>'+escHtml(p.a)+': '+escHtml(p.n)+(p.o&&p.o!=='—'?' <del>'+escHtml(p.o)+'</del>':'')+'</li>').join('');
  seoBlock.innerHTML='<h1>'+escHtml(f.name)+(hasCoupon?' — '+f.discount+'% OFF Coupon Code '+escHtml(f.coupon):'')+'</h1>'
    +'<p>'+escHtml(aboutText)+'</p>'
    +'<h2>'+escHtml(f.name)+' Plans & Prices</h2><ul>'+pricesHtml+'</ul>'
    +'<h2>Key Features</h2><p>'+escHtml(perksText)+'</p>'
    +'<p>Platforms: '+escHtml(platsText)+'</p>'
    +'<p>Profit Split: '+escHtml(f.split)+' | Drawdown: '+escHtml(f.drawdown)+' | Rating: '+f.rating+'/5 ('+f.reviews+' reviews)</p>'
    +(hasCoupon?'<p>Use coupon code <strong>'+escHtml(f.coupon)+'</strong> for '+f.discount+'% discount.</p>':'')
    +'<h2>Compare with Other Prop Firms</h2><ul>'
    +FIRMS.filter(x=>x.id!==id&&x.id!==f.id).slice(0,5).map(x=>'<li><a href="/'+x.id+'">'+escHtml(x.name)+(x.coupon?' — '+x.discount+'% OFF':'')+' ('+x.rating+'/5)</a></li>').join('')
    +'</ul>'
    +'<p><a href="/">View all prop firm coupons on MarketsCoupons</a></p>';
}
/* ─── COOKIE CONSENT & POLICIES ─── */
function acceptCookies(){
  localStorage.setItem('mc-cookies-consent','accepted');
  const banner=document.getElementById('ck-banner'); if(banner) banner.style.display='none';
  // Consent Mode v2 — ÚNICO formato que o GTM reconhece: comando nativo gtag('consent','update').
  // O shim gtag em tracking-init.js faz dataLayer.push(arguments) → empurra ['consent','update',{...}] cru.
  // NÃO usar dataLayer.push({event:'consent_update'}) — Consent Mode ignora esse formato.
  if (typeof gtag === 'function') {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  }
  track('cookie_consent',{action:'accepted'});
  // Page_view RETROATIVO pós-consent: track inicial rolou ANTES do consent (CAPI bloqueado).
  // Esse page_view carrega event_id → Meta Pixel Base (trigger page_view) dispara com dedup vs CAPI.
  try {
    const page = sessionStorage.getItem('mc_page') || (typeof _pageFromPath === 'function' ? _pageFromPath() : '') || 'home';
    track('page_view', { page_name: page, retroactive: true });
  } catch(_){}
}
function rejectCookies(){
  localStorage.setItem('mc-cookies-consent','rejected');
  document.getElementById('ck-banner').style.display='none';
  // registra a recusa pra MEDIR a taxa real (antes não media — só 'accepted' era trackeado)
  try { track('cookie_consent',{action:'rejected'}); } catch(_){}
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
/* FIRM REVIEWS — static, 11 firms × 7 langs (covers in img/guides/<slug>-cover-<lang>.png) */
const FIRM_REVIEWS = [
  {id:'apex',         name:'Apex Trader Funding',      slug:'apex-trader-funding-review'},
  {id:'ftmo',         name:'FTMO',                     slug:'ftmo-review'},
  {id:'bulenox',      name:'Bulenox',                  slug:'bulenox-review'},
  {id:'fn',           name:'FundedNext',               slug:'fundednext-review'},
  {id:'e2t',          name:'Earn2Trade',               slug:'earn2trade-review'},
  {id:'the5ers',      name:'The5ers',                  slug:'the5ers-review'},
  {id:'fundingpips',  name:'FundingPips',              slug:'fundingpips-review'},
  {id:'brightfunded', name:'BrightFunded',             slug:'brightfunded-review'},
  {id:'e8',           name:'E8 Markets',               slug:'e8-review'},
  {id:'cti',          name:'City Traders Imperium',    slug:'cti-review'},
  {id:'tradeday',     name:'TradeDay',                 slug:'tradeday-review'},
];
/* Langs with dedicated /<lang>/guides/ pages. Others fall back to EN root /guides/ */
const REVIEW_LANGS = ['pt','es','it','fr','de','ar'];
function firmReviewUrl(slug){
  const lang=_currentLang||'en';
  return REVIEW_LANGS.includes(lang)?`/${lang}/guides/${slug}`:`/guides/${slug}`;
}
function firmReviewCover(firmId){
  const lang=_currentLang||'en';
  return `/img/guides/${firmId}-cover-${lang}.jpg`;
}
function openFirmReview(slug){ window.location.assign(firmReviewUrl(slug)); }
const GUIDES_FALLBACK = [];
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
  const firmCards=FIRM_REVIEWS.map(r=>{
    const cover=firmReviewCover(r.id);
    const titulo=t('firm_review_title')?t('firm_review_title').replace('{firm}',r.name):`${r.name} Review`;
    const desc=t('firm_review_desc')||'Rules, pricing, payouts and the full breakdown for 2026.';
    const readLabel=t('firm_review_read')||'Read full review →';
    return `<div class="gc firm" onclick="openFirmReview('${r.slug}')">
      <div class="gc-img" style="background-image:url('${cover}');background-color:#0A0A0F;"></div>
      <div class="gc-body">
        <div class="gc-title">${titulo}</div>
        <div class="gc-desc">${desc}</div>
        <div class="gc-read">${readLabel}</div>
      </div>
    </div>`;
  }).join('');
  const cmsGuides=_guidesCache.length?_guidesCache:[];
  const cmsCards=cmsGuides.map((guide,idx)=>{
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
    </div>`;
  }).join('');
  g.innerHTML=firmCards+cmsCards;
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
    <div class="guide-art-title">${typeof DOMPurify!=='undefined'?DOMPurify.sanitize(titulo):titulo}</div>
    <div class="guide-art-meta"><span>~${readMin} ${t('guia_leitura')}</span></div>
    <div class="guide-art-body">${typeof DOMPurify!=='undefined'?DOMPurify.sanitize(guide.content||''):(guide.content||'')}</div>
    <div class="guide-art-cta">
      <div class="guide-art-cta-title">${t('guia_cta_titulo')||'Pronto para começar?'}</div>
      <div class="guide-art-cta-desc">${t('guia_cta_desc')||'Compare as melhores prop firms com cupons exclusivos de até 90% de desconto.'}</div>
      <button class="guide-art-cta-btn" onclick="go('home')">${t('guia_cta_btn')||'Ver Ofertas'} →</button>
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
<h3>1. Operar sem proteção</h3>
<p>"Vou segurar que volta." Não volta. E quando volta, você já violou o drawdown. <strong>Sempre defina seu limite de perda antes de entrar.</strong></p>

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
<li><strong>Estratégia definida:</strong> critérios de entrada, proteção, alvo, horários. Tudo escrito.</li>
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
<p>Operar em 3+ prop firms simultaneamente é uma estratégia para <strong>maximizar capital, diversificar risco de contraparte e aumentar payouts</strong>. Mas exige organização militar.</p>

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
        .select('slug,title,excerpt,level,category,created_at,read_time,lang,article_group,cover_url')
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
  // Auto-open article from URL param (?a=slug) on Ctrl+F5
  const _blogParam = new URLSearchParams(location.search).get('a');
  if(_blogParam && !_openBlogSlug) openBlogArticle(_blogParam);
}

function _renderBlogGrid(){
  const g=document.getElementById('blog-grid');if(!g)return;
  const posts = _blogFilter==='all' ? _blogPostsDB : _blogPostsDB.filter(p=>p.level===_blogFilter);
  _renderBlogCards(g, posts);
}

// Capas SVG unicas por tema (match parcial no slug)
const _BLOG_COVER_MAP = [
  ['wyckoff',        '/img/blog/wyckoff.svg'],
  ['elliott',        '/img/blog/elliott.svg'],
  ['ondas',          '/img/blog/elliott.svg'],
  ['vagues',         '/img/blog/elliott.svg'],
  ['wellen',         '/img/blog/elliott.svg'],
  ['fibonacci',      '/img/blog/fibonacci.svg'],
  ['volume-pre',     '/img/blog/vpa.svg'],
  ['anna-coulling',  '/img/blog/vpa.svg'],
  ['volumen-preis',  '/img/blog/vpa.svg'],
  ['analyse-volume', '/img/blog/vpa.svg'],
  ['analisis-volumen','/img/blog/vpa.svg'],
  ['analisi-volume', '/img/blog/vpa.svg'],
  ['drawdown',       '/img/blog/drawdown.svg'],
  ['trailing',       '/img/blog/drawdown.svg'],
  ['risco',          '/img/blog/risk-management.svg'],
  ['risk',           '/img/blog/risk-management.svg'],
  ['risiko',         '/img/blog/risk-management.svg'],
  ['risque',         '/img/blog/risk-management.svg'],
  ['gestion-riesgo', '/img/blog/risk-management.svg'],
  ['gestione-rischio','/img/blog/risk-management.svg'],
  ['gerenciamento',  '/img/blog/risk-management.svg'],
  ['gestao-de-risco','/img/blog/risk-management.svg'],
  ['melhores-prop',  '/img/blog/best-prop-firms.svg'],
  ['mejores-prop',   '/img/blog/best-prop-firms.svg'],
  ['best-prop',      '/img/blog/best-prop-firms.svg'],
  ['meilleures-prop','/img/blog/best-prop-firms.svg'],
  ['beste-prop',     '/img/blog/best-prop-firms.svg'],
  ['migliori-prop',  '/img/blog/best-prop-firms.svg'],
  ['como-passar-avaliacao','/img/blog/how-to-pass.svg'],
  ['how-to-pass',    '/img/blog/how-to-pass.svg'],
  ['como-pasar',     '/img/blog/how-to-pass.svg'],
  ['reussir',        '/img/blog/how-to-pass.svg'],
  ['bewertung',      '/img/blog/how-to-pass.svg'],
  ['superare',       '/img/blog/how-to-pass.svg'],
  ['sua-primeira',   '/img/blog/first-prop-firm.svg'],
  ['desafio-10',     '/img/blog/challenge-10-days.svg'],
  ['como-passar-desafio','/img/blog/challenge-10-days.svg'],
  ['multi-account',  '/img/blog/multi-account.svg'],
  ['scaling',        '/img/blog/scaling.svg'],
  ['50k-para-300k',  '/img/blog/scaling.svg'],
  ['operando-3',     '/img/blog/multi-desk.svg'],
  ['fiscal',         '/img/blog/tax.svg'],
];

function _getBlogCoverImg(slug){
  for(const [key, img] of _BLOG_COVER_MAP){
    if(slug.includes(key)) return img;
  }
  return '/img/blog/wyckoff.svg';
}

function _renderBlogCards(g, posts){
  const curLang = _currentLang || 'pt';
  g.innerHTML=posts.map(post=>{
    const lvl = _BLOG_LEVEL_MAP[post.level]||_BLOG_LEVEL_MAP.iniciante;
    const cat = _BLOG_CAT_MAP[post.category]||{color:'var(--blue)',key:''};
    const coverImg = post.cover_url || _getBlogCoverImg(post.slug);
    const blogUrl = curLang==='pt' ? '/blog/'+post.slug : '/blog/'+curLang+'/'+post.slug;
    const _dtLocale = {pt:'pt-BR',en:'en-US',es:'es-ES',it:'it-IT',fr:'fr-FR',de:'de-DE',ar:'ar-SA'}[curLang]||'pt-BR';
    const dateStr = post.created_at ? new Date(post.created_at).toLocaleDateString(_dtLocale,{day:'2-digit',month:'short',year:'numeric'}) : '';
    return `
    <div class="bc" style="cursor:pointer;" onclick="openBlogArticle('${post.slug}')">
      <div class="bc-img" style="background-image:url('${coverImg}')">
        <div class="bc-level" style="background:${lvl.bg};color:${lvl.color};">${t(lvl.key)}</div>
      </div>
      <div class="bc-body">
        <div class="bc-cat" style="color:${cat.color};">${cat.key?t(cat.key):(post.category||'Blog')}</div>
        <div class="bc-title">${DOMPurify.sanitize(post.title)}</div>
        <div class="bc-excerpt">${post.excerpt||''}</div>
        <div class="bc-meta">
          <span class="bc-date">${dateStr}</span>
          <span class="bc-read">${t('blog_ler')||'Ler →'}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterBlog(level, btn){
  _blogFilter = level;
  document.querySelectorAll('.bf-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  _renderBlogGrid();
  track('blog_filter',{level});
}

let _openBlogSlug = '';
let _openBlogGroup = '';
async function openBlogArticle(slug){
  const grid=document.getElementById('blog-grid');
  const hdr=document.getElementById('blog-header');
  const filters=document.getElementById('blog-filters');
  const art=document.getElementById('blog-article');
  if(!art) return;
  _openBlogSlug = slug;
  // Hide grid, show article
  if(grid) grid.style.display='none';
  if(hdr) hdr.style.display='none';
  if(filters) filters.style.display='none';
  art.classList.add('open');
  art.innerHTML='<div style="text-align:center;padding:60px 20px;"><div class="ar-spinner" style="width:24px;height:24px;border:2px solid rgba(255,255,255,.06);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto;"></div></div>';
  art.scrollIntoView({behavior:'smooth',block:'start'});
  // Update URL so Ctrl+F5 preserves the article
  history.replaceState({page:'blog',article:slug}, '', '/blog?a='+encodeURIComponent(slug));
  try {
    // Try from already-loaded posts first (same language)
    let post = _blogPostsDB.find(p=>p.slug===slug);
    if(!post || !post.body){
      const curLang = _currentLang || 'pt';
      const{data}=await db.from('blog_posts').select('*').eq('slug',slug).eq('lang',curLang).maybeSingle();
      if(!data){
        // Fallback: try any language with this slug
        const{data:d2}=await db.from('blog_posts').select('*').eq('slug',slug).maybeSingle();
        if(d2) post=d2;
      } else { post=data; }
    }
    if(!post){art.innerHTML=`<div style="color:var(--t2);padding:40px 0;">${t('blog_post_not_found')||'Post not found.'}</div>`;return;}
    _openBlogGroup = post.article_group || '';
    const lvl = _BLOG_LEVEL_MAP[post.level]||_BLOG_LEVEL_MAP.iniciante;
    const _dtLocale = {pt:'pt-BR',en:'en-US',es:'es-ES',it:'it-IT',fr:'fr-FR',de:'de-DE',ar:'ar-SA'}[_currentLang]||'pt-BR';
    const dateStr = post.created_at ? new Date(post.created_at).toLocaleDateString(_dtLocale,{day:'2-digit',month:'long',year:'numeric'}) : '';
    const coverHtml = post.cover_url ? `<div class="blog-art-cover"><img src="${post.cover_url}" alt=""></div>` : '';
    const authorHtml = post.author ? `<span class="blog-art-author">${post.author}</span> · ` : '';
    const backLabel = t('blog_voltar')||'Back to Blog';
    art.innerHTML=`
      <button class="blog-back" onclick="closeBlogArticle()">&larr; ${backLabel}</button>
      ${coverHtml}
      <div class="blog-art-level" style="background:${lvl.bg};color:${lvl.color};">${t(lvl.key)}</div>
      <div class="blog-art-title">${DOMPurify.sanitize(post.title)}</div>
      <div class="blog-art-meta">${authorHtml}<span>${dateStr}</span>${post.read_time?' · <span>'+post.read_time+'</span>':''}</div>
      <div class="blog-art-body">${DOMPurify.sanitize(post.body||'')}</div>
      <div class="blog-art-end" style="margin:40px 0 8px;display:flex;justify-content:center;flex-wrap:wrap;gap:12px;padding-top:24px;border-top:1px solid rgba(255,255,255,.08);">
        <button onclick="closeBlogArticle()" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.03);color:#E6EAF2;font-weight:600;font-size:15px;cursor:pointer;font-family:inherit;transition:.2s;" onmouseover="this.style.borderColor='#F0B429';this.style.color='#F0B429'" onmouseout="this.style.borderColor='rgba(255,255,255,.18)';this.style.color='#E6EAF2'">&larr; ${backLabel}</button>
      </div>`;
  } catch(e){
    art.innerHTML='<div style="color:var(--t2);padding:40px 0;">'+t('err_blog_post')+'</div>';
  }
}

function closeBlogArticle(){
  _openBlogSlug = '';
  _openBlogGroup = '';
  const grid=document.getElementById('blog-grid');
  const hdr=document.getElementById('blog-header');
  const filters=document.getElementById('blog-filters');
  const art=document.getElementById('blog-article');
  if(art){art.classList.remove('open');art.innerHTML='';}
  if(grid)grid.style.display='';
  if(hdr)hdr.style.display='';
  if(filters)filters.style.display='';
  history.replaceState({page:'blog'}, '', '/blog');
  // Scroll back to top of blog section so user lands on the grid, not the footer
  const blogSec = hdr || document.getElementById('blog-section') || grid;
  if(blogSec) blogSec.scrollIntoView({behavior:'smooth', block:'start'});
  else window.scrollTo({top:0, behavior:'smooth'});
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

/* ── Promo countdown timer (home cards + checkout) ── */
function promoTimerPill(f){
  const end = f.promo_ends_at ? Date.parse(f.promo_ends_at) : 0;
  if(!end || end <= Date.now()) return '';
  if(!f.show_promo_on_checkout) return '';
  return `<div class="promo-timer promo-pill" data-promo-ends="${end}" data-promo-mode="cards">
    <span class="pp-label"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg><span>${t('promo_ends_in')||'Ends in:'}</span></span>
    <span class="pp-clock">
      <span class="pp-unit"><span class="pt-num pt-d">--</span><span class="pp-suf">d</span></span>
      <span class="pp-unit"><span class="pt-num pt-h">--</span><span class="pp-suf">h</span></span>
      <span class="pp-unit"><span class="pt-num pt-m">--</span><span class="pp-suf">m</span></span>
      <span class="pp-unit"><span class="pt-num pt-s">--</span><span class="pp-suf">s</span></span>
    </span></div>`;
}
function tickPromoTimers(){
  document.querySelectorAll('[data-promo-ends]').forEach(el=>{
    const end = parseInt(el.dataset.promoEnds,10);
    const diff = end - Date.now();
    const mode = el.dataset.promoMode || '';
    if(diff <= 0){
      const bar=document.getElementById('promo-topbar');
      if(el===bar || el.closest?.('#promo-topbar')){ if(bar){ bar.style.display='none'; bar.innerHTML=''; } }
      else { el.style.display='none'; }
      return;
    }
    const d = Math.floor(diff/86400000);
    const h = Math.floor(diff%86400000/3600000);
    const m = Math.floor(diff%3600000/60000);
    const s = Math.floor(diff%60000/1000);
    if(mode === 'cards'){
      const dEl=el.querySelector('.pt-d'), hEl=el.querySelector('.pt-h'), mEl=el.querySelector('.pt-m'), sEl=el.querySelector('.pt-s');
      if(dEl) dEl.textContent = String(d).padStart(2,'0');
      if(hEl) hEl.textContent = String(h).padStart(2,'0');
      if(mEl) mEl.textContent = String(m).padStart(2,'0');
      if(sEl) sEl.textContent = String(s).padStart(2,'0');
    } else {
      const val = el.querySelector('.pt-val');
      if(val) val.textContent = `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    }
  });
}
window.tickPromoTimers = tickPromoTimers;
if(!window._promoTimerInterval){
  window._promoTimerInterval = setInterval(tickPromoTimers, 1000);
}

/* ── Global promo top bar (above nav, all pages) ── */
function renderPromoTopbar(){
  const bar = document.getElementById('promo-topbar');
  if(!bar) return;
  const hideBar = () => {
    bar.style.display='none'; bar.innerHTML='';
    document.body.classList.remove('has-promo-topbar');
    document.documentElement.style.removeProperty('--promo-h');
    try { localStorage.setItem('mc_promo_off', '1'); } catch(_) {}
  };
  // Master toggle via site_settings
  const enabled = (typeof _siteSettings !== 'undefined' && _siteSettings?.promo_topbar_enabled !== undefined) ? _siteSettings.promo_topbar_enabled === 'true' : true;
  if(!enabled){ hideBar(); return; }
  const active = (FIRMS||[]).filter(f=>{
    const end = f.promo_ends_at ? Date.parse(f.promo_ends_at) : 0;
    return end && end > Date.now();
  }).sort((a,b)=>Date.parse(a.promo_ends_at)-Date.parse(b.promo_ends_at));
  if(!active.length){ hideBar(); return; }
  bar.style.display='flex';
  bar.innerHTML = active.map((f,i)=>{
    const end = Date.parse(f.promo_ends_at);
    return `<div class="pt-item">
      <span class="pt-headline" onclick="openD('${f.id}');track('promo_topbar_click',{firm_id:'${f.id}'})">${f.name} ${t('promo_ends_in')||'promo ends in'}</span>
      <span class="pt-clock promo-timer" data-promo-ends="${end}" data-promo-mode="cards">
        <span class="pt-unit"><span class="pt-num pt-d">--</span><span class="pt-suf">d</span></span>
        <span class="pt-unit"><span class="pt-num pt-h">--</span><span class="pt-suf">h</span></span>
        <span class="pt-unit"><span class="pt-num pt-m">--</span><span class="pt-suf">m</span></span>
        <span class="pt-unit"><span class="pt-num pt-s">--</span><span class="pt-suf">s</span></span>
      </span>
    </div>${i<active.length-1?'<span class="pt-sep">•</span>':''}`;
  }).join('');
  document.body.classList.add('has-promo-topbar');
  try { localStorage.removeItem('mc_promo_off'); } catch(_) {}
  requestAnimationFrame(()=>{
    const h = bar.offsetHeight;
    if(h) document.documentElement.style.setProperty('--promo-h', h+'px');
  });
}
if(!window._promoResizeBound){
  window._promoResizeBound = true;
  let _lastW = window.innerWidth;
  window.addEventListener('resize', ()=>{
    const bar = document.getElementById('promo-topbar');
    if(!bar || !document.body.classList.contains('has-promo-topbar')) return;
    const h = bar.offsetHeight;
    if(h) document.documentElement.style.setProperty('--promo-h', h+'px');
    // Only re-render if width actually changed (breakpoint cross), not mobile URL-bar scroll
    if(Math.abs(window.innerWidth - _lastW) > 2){ _lastW = window.innerWidth; renderPromoTopbar(); }
  });
}

/* HOME */
function renderHome(){
  const g=document.getElementById('home-offers');if(!g)return;
  const h1=document.getElementById('hero-h1');if(h1 && _currentLang && _currentLang!=='en')h1.innerHTML=t('hero_titulo');
  const shd=document.getElementById('home-sec-hd');if(shd)shd.innerHTML=t('home_melhores_ofertas');
  g.innerHTML=[...FIRMS].sort((a,b)=>b.discount-a.discount).map(f=>`
    <div class="oc">
      <div class="oc-top" onclick="openD('${f.id}')" style="cursor:pointer;">
        <div class="oc-left">${firmIco(f,'44px','14px')}<div><div class="oc-name">${f.name}</div><div class="oc-type">${f.type==='Futuros'?t('firm_type_futuros'):f.type==='Forex'?t('firm_type_forex'):f.type}</div></div></div>
        <div><div class="oc-disc" style="color:${f.color};filter:drop-shadow(0 4px 24px ${f.color}40)">${f.discount}%</div><div class="oc-off">off ${tf(f.dtype)}</div></div>
      </div>
      ${f.coupon?`<div class="oc-coupon"><div class="offer-coupon-left"><div class="offer-coupon-label">${t('offers_cupom_label')}</div><span class="oc-code">${shortCode(f.coupon)}</span></div><button class="oc-copy" onclick="cpCoupon('${f.coupon}','${f.id}','home')">${t('geral_copiar')}</button></div>
      <div class="oc-hint">${t('firms_hint_cupom')}</div>`:`<div class="oc-coupon" style="border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.05);"><div class="offer-coupon-label" style="color:var(--green);">${t('offers_desconto_exclusivo')}</div><span class="oc-code" style="color:var(--green);font-size:12px;letter-spacing:0;">✓ ${t('offers_desconto_link')}</span></div>
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
      <div class="fmet"><div class="mv" style="color:var(--t2);font-size:12px;font-weight:600;line-height:1.25;">${f.split}</div><div class="ml">Split</div></div>
      <!-- Col 4: Rating -->
      <div class="fmet"><div class="mv">${f.rating}</div><div class="ml">Rating</div></div>
      <!-- Col 5: Reviews -->
      <div class="fmet"><div class="mv">${tpCount||f.reviews?.toLocaleString()||'—'}</div><div class="ml">Reviews</div></div>
      <!-- Col 6: Trustpilot -->
      <div class="fr-tp-col" onclick="event.stopPropagation()">${f.trustpilot?`<a class="fr-tp-mini" href="${f.trustpilot.url}" rel="nofollow noopener" target="_blank" onclick="event.preventDefault();openTpPopup('${f.trustpilot.url}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="#00b67a" style="flex-shrink:0"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><span class="fr-tp-score">${f.trustpilot.score}</span><span class="fr-tp-count">${tpCount}</span></a>`:''}</div>
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
        ${f.trustpilot?`<a class="tp-badge" href="${f.trustpilot.url}" rel="nofollow noopener" target="_blank" onclick="event.preventDefault();event.stopPropagation();openTpPopup('${f.trustpilot.url}')"><span class="tp-label">${t('tp_excellent')}</span><span class="tp-stars">${'★'.repeat(tpStars)}</span><span class="tp-info">${f.trustpilot.reviews.toLocaleString()} ${t('tp_reviews_on')} <b>Trustpilot</b></span></a>`:''}
      </div>
      <div class="fr-mets">
        <div class="fr-mets-inner">
          <div class="fmet"><div class="mv" style="color:var(--t2);font-size:12px;font-weight:600;line-height:1.25;">${f.split}</div><div class="ml">${t('met_split')}</div></div>
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
  if (!isAuthed()) { showConfirmEmailModal('pending'); return; }
  const isFav = _favs.has(firmId);
  const btn = document.getElementById('fav-btn-'+firmId);
  if (isFav) {
    _favs.delete(firmId);
    _favCounts[firmId] = Math.max(0, (_favCounts[firmId]||1) - 1);
    const {error} = await db.from('favorites').delete().eq('user_id', currentUser.id).eq('firm_id', firmId);
    if(error) console.warn('fav delete error:', error.message);
    else track('firm_unfavorite', { firm_id: firmId });
  } else {
    _favs.add(firmId);
    _favCounts[firmId] = (_favCounts[firmId]||0) + 1;
    const {error} = await db.from('favorites').insert({ user_id: currentUser.id, firm_id: firmId });
    if(error){ console.warn('fav insert error:', error.message); _favs.delete(firmId); _favCounts[firmId]=Math.max(0,(_favCounts[firmId]||1)-1); showToast(t('toast_fav_error')||'Error saving favorite. Try again.'); }
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
    {trophy:_asvg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>','#a78bfa'),catKey:'aw_cat_maior_scaling',firmId:'the5ers',reasonKey:'aw_reason_the5ers_scaling',value:'$4M',ribbonKey:'aw_ribbon_scaling'},
    {trophy:_asvg('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>','#22c55e'),catKey:'aw_cat_melhor_payout',firmId:'fundingpips',reasonKey:'aw_reason_fundingpips_payout',value:'100% Split',ribbonKey:'aw_ribbon_payout'},
    {trophy:_asvg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>','#F97316'),catKey:'aw_cat_payout_garantido',firmId:'brightfunded',reasonKey:'aw_reason_brightfunded_payout',value:'24h',ribbonKey:'aw_ribbon_payout24h'},
    {trophy:_asvg('<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>','#60a5fa'),catKey:'aw_cat_mais_versatil',firmId:'e8',reasonKey:'aw_reason_e8_versatil',value:'3 mercados',ribbonKey:'aw_ribbon_versatil'},
    {trophy:_asvg('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>','#22c55e'),catKey:'aw_cat_menor_entrada',firmId:'cti',reasonKey:'aw_reason_cti_entrada',value:'$1',ribbonKey:'aw_ribbon_entrada'},
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
  const searchEl=document.getElementById('search'); if(!searchEl) return;
  const sortEl=document.querySelector('.sort-sel'); if(!sortEl) return;
  const q=searchEl.value.toLowerCase();
  const sort=sortEl.value;
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
  const s=document.getElementById('search'); if(s) s.value='';
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
  track('firms_sidebar_toggle',{state:sb.classList.contains('open')?'open':'close'});
}

/* DRAWER */
/* Drawer state for inline checkout */
const _drwState = {};

const _firmPageSlugs=['apex','bulenox','ftmo','fn','e2t','the5ers','fundingpips','brightfunded','e8','cti','tradeday'];
const _slugToFirmId = {};
const _firmIdToSlug = {};
// Lazy load overlay data (about_html, detail_plans, bg_image) for a single firm
const _overlayLoaded = {};
async function loadFirmOverlayData(id) {
  if (_overlayLoaded[id]) return;
  try {
    const { data } = await db.from('cms_firms')
      .select('id,bg_image,about_html,about_highlights,detail_types,detail_plans,detail_includes')
      .eq('id', id).maybeSingle();
    if (data) {
      if (data.bg_image) FIRM_BG[id] = data.bg_image;
      if (data.about_html || data.detail_plans) {
        FIRM_ABOUT[id] = {
          about: data.about_html || FIRM_ABOUT[id]?.about || '',
          highlights: data.about_highlights || FIRM_ABOUT[id]?.highlights || [],
          types: Array.isArray(data.detail_types) ? data.detail_types : FIRM_ABOUT[id]?.types || [],
          plans: data.detail_plans || FIRM_ABOUT[id]?.plans || {},
          includes: Array.isArray(data.detail_includes) ? data.detail_includes : FIRM_ABOUT[id]?.includes || [],
        };
      }
      _overlayLoaded[id] = true;
    }
  } catch(e) { console.warn('[MC] Overlay data load failed for', id); }
}

// ─── A/B TEST: default size na pill de planos ───
// A (control) = primeiro plano (firstPlans[0]) — comportamento atual
// B (treatment) = plano popular (pop:1) se existir, senão fallback A
// Hash estável do session id pra 50/50 — variante NÃO muda durante a sessão.
function _abDefaultSizeVariant(){
  try {
    if (window._abVariantCache) return window._abVariantCache;
    const sid = (typeof MC_SESSION !== 'undefined' && MC_SESSION) || (typeof MC_ANON !== 'undefined' && MC_ANON) || 'anon';
    let h = 0; for (let i=0;i<sid.length;i++) h = ((h<<5)-h + sid.charCodeAt(i))|0;
    const v = (Math.abs(h) % 2) === 0 ? 'A' : 'B';
    window._abVariantCache = v;
    return v;
  } catch(e){ return 'A'; }
}
// Pega size default conforme variante. fa = FIRM_ABOUT entry, type = type atual
function _abPickDefaultSize(planList){
  if (!Array.isArray(planList) || !planList.length) return '';
  const variant = _abDefaultSizeVariant();
  if (variant === 'B') {
    const popular = planList.find(p => p.pop || p.pop===1 || p.pop===true);
    if (popular) return popular.s;
  }
  return planList[0].s;
}

async function openD(id){
  const f=FIRMS.find(x=>x.id===id);if(!f)return;
  window._fdOriginPage=_currentPage;
  try{ maybeShowGiveaway(id, 'firm_open'); }catch(e){}
  document.querySelectorAll('.fr').forEach(r=>r.classList.toggle('active',r.dataset.id===id));
  const cf = CHECKOUT_FIRMS.find(x=>x.id===id);
  if (!_drwState[id]) {
    const firstPlans = cf?.plans || [];
    // _drwState usa shape diferente (cf.plans com .size, não .s)
    const popPlan = firstPlans.find(p => p.pop || p.pop===1);
    const variant = _abDefaultSizeVariant();
    const defSize = (variant === 'B' && popPlan) ? popPlan.size : (firstPlans[0]?.size || '');
    _drwState[id] = {
      type: cf?.types?.[0] || '',
      plat: cf?.platforms?.[0] || (f.platforms?.[0] || ''),
      size: defSize,
    };
  }

  // Lazy load overlay data from Supabase — AWAIT so firms not in FIRM_ABOUT (new firms)
  // still render the full fd-overlay padrão instead of falling back to the simple drawer.
  if (window.innerWidth >= 769 && !FIRM_ABOUT[id]) {
    await loadFirmOverlayData(id);
  } else {
    loadFirmOverlayData(id);
  }
  // Desktop: fullscreen overlay premium | Mobile: drawer lateral
  if (window.innerWidth >= 769 && FIRM_ABOUT[id]) {
    openFD(id, f);
  } else {
    openDrw(id, f, cf);
  }
  // Clean URL: /apex instead of #firm/apex for firms with dedicated pages
  const _curPath=location.pathname.replace(/^\//,'').replace(/\/$/,'');
  if(_firmPageSlugs.includes(id)){
    // Use canonical firm slug na URL
    const _urlSlug = _firmIdToSlug[id] || id;
    if(_curPath!==_urlSlug) history.pushState({firmPage:_urlSlug},'','/'+_urlSlug);
  } else {
    history.replaceState(null,'','#firm/'+id);
  }
  // Tracking: ViewContent on firm overlay open (PageView step of funnel)
  const _src=window._dedicatedFirmSlug?'dedicated':'homepage';
  track('firm_detail_open',{firm_id:id,firm_name:f.name,source:_src});
}

// ── DESKTOP: Fullscreen overlay (v2 premium) ──
let _fdCurrent = null;
let _fdClosing = false;
const _fdState = {};

function openFD(id, f) {
  _fdCurrent = id;
  const fa = FIRM_ABOUT[id];
  if (!fa) { openDrw(id, f, CHECKOUT_FIRMS.find(x=>x.id===id)); return; }

  const firstType = fa.types[0];
  const firstPlans = fa.plans[firstType];
  // A/B test default size (50/50 stable por sessão):
  //   A = firstPlans[0] (controle, comportamento atual = menor tamanho)
  //   B = plano com pop:1 (treatment, geralmente $100K)
  if (!_fdState[id]) _fdState[id] = { type: firstType, plat: f.platforms?.[0]||'', size: _abPickDefaultSize(firstPlans) };
  const st = _fdState[id];

  // Ensure size is valid for current type
  const curPlans = fa.plans[st.type];
  if (curPlans && !curPlans.find(p=>p.s===st.size)) st.size = curPlans[0].s;

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
    <div class="fd-stat"><div class="fd-stat-label">News Trading</div><div class="fd-stat-val ${f.newsTrading?'g':'r'}">${f.newsTrading?t('drw_sim'):t('drw_nao')}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">Day 1 Payout</div><div class="fd-stat-val ${f.day1Payout?'g':'r'}">${f.day1Payout?t('drw_sim'):t('drw_nao')}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">${t('drw_alavancagem')}</div><div class="fd-stat-val">${f.leverage||'—'}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">${t('drw_consistencia')}</div><div class="fd-stat-val ${f.consistency==='Não exige'||!f.consistency?'g':'y'}">${tf(f.consistency)||t('drw_nao_exige')}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">${t('drw_payout')}</div><div class="fd-stat-val b">${tf(f.payoutSpeed)||'—'}</div></div>
    <div class="fd-stat"><div class="fd-stat-label">${t('drw_max_contas')}</div><div class="fd-stat-val b">${f.maxAccounts||'—'}</div></div>
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
    const tc = fa.types.length <= 4 ? fa.types.length : 3;
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_tipo_conta')}</div>
      <div class="fd-pills" style="--cols:${tc}">${fa.types.map(tp=>`<button class="fd-pill${tp===st.type?' sel':''}" style="${tp===st.type?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="fdSel('${id}','type','${tp}')">${tp}</button>`).join('')}</div></div>`;
  }

  // Platform pills
  if (f.platforms?.length) {
    const pc = f.platforms.length <= 4 ? f.platforms.length : 3;
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_plataforma')}</div>
      <div class="fd-pills" style="--cols:${pc}">${f.platforms.map(p=>`<button class="fd-pill${p===st.plat?' sel':''}" style="${p===st.plat?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="fdSel('${id}','plat','${p}')">${p}</button>`).join('')}</div></div>`;
  }

  // Size pills
  if (plans?.length) {
    const sc = plans.length <= 5 ? plans.length : 3;
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_tamanho_conta')}</div>
      <div class="fd-sizes" style="--cols:${sc}">${plans.map(p=>`<button class="fd-sz${p.s===st.size?' sel':''}${p.pop?' pop':''}"${p.pop?' data-pop-label="'+t('ach_popular')+'"':''} style="${p.s===st.size?`background:${f.color}12;border-color:${f.color}59;color:${f.color}`:''}" onclick="fdSel('${id}','size','${p.s}')">${p.s}</button>`).join('')}</div></div>`;
  }

  // Pack toggle (1 conta / 5 contas) — only for firms that offer a 5-pack (e.g. Apex)
  // _tt: use translation if the key resolves, else fall back (t() returns the key itself when missing)
  const _tt=(k,fb)=>{const v=t(k);return(!v||v===k)?fb:v;};
  const packSel = st.pack==='5' ? '5' : '1';
  const variantSel = st.variant==='nofee' ? 'nofee' : 'std';
  // Variant toggle (Standard / No Activation Fee) — mirrors Apex
  if (firmHasNoFee(id)) {
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${_tt('fd_taxa','Taxa de ativação')}</div>
      <div class="fd-pills" style="--cols:2">
        <button class="fd-pill${variantSel==='std'?' sel':''}" style="${variantSel==='std'?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="fdSel('${id}','variant','std')">${_tt('fd_var_std','Standard')}</button>
        <button class="fd-pill${variantSel==='nofee'?' sel':''}" style="${variantSel==='nofee'?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="fdSel('${id}','variant','nofee')">${_tt('fd_var_nofee','Sem taxa de ativação')}</button>
      </div></div>`;
  }
  if (firmHas5Pack(id)) {
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${_tt('fd_qtd_contas','Quantidade de contas')}</div>
      <div class="fd-pills" style="--cols:2">
        <button class="fd-pill${packSel==='1'?' sel':''}" style="${packSel==='1'?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="fdSel('${id}','pack','1')">${_tt('fd_pack_1','1 conta')}</button>
        <button class="fd-pill${packSel==='5'?' sel':''}" style="${packSel==='5'?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="fdSel('${id}','pack','5')">${_tt('fd_pack_5','5 contas')}</button>
      </div></div>`;
  }

  // Price card — getPlanPrice reads Supabase FIRMS[].prices with hardcoded fallback
  const plan = plans?.find(p=>p.s===st.size)||plans?.[0];
  if (plan) {
    const pp = getPlanPrice(id, st.type, plan.s, packSel, variantSel);
    if (pp.unavailable) {
      h += `<div class="fd-price" style="border-color:${f.color}1F"><div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${f.color}40,transparent)"></div>
        <div><div class="fd-price-size">${plan.s} ×5</div><div class="fd-price-type">${st.type}</div></div>
        <div class="fd-price-right" style="max-width:170px"><div style="font-size:12px;color:var(--t2);line-height:1.4">${_tt('fd_combo_na','Pack de 5 não disponível neste plano sem taxa. Use 1 conta ou Standard.')}</div></div>
      </div>`;
    } else {
    const oNum = parseFloat((pp.o||'').replace(/[^0-9.]/g,''));
    const dNum = parseFloat((pp.d||'').replace(/[^0-9.]/g,''));
    const cur = (pp.d||'').match(/[€$]/)?.[0]||'$';
    const save = oNum&&dNum&&pp.o!=='—' ? (oNum-dNum).toFixed(2) : null;
    // 5-pack advantage: per-account price vs single (same variant)
    let advHtml = '';
    if (packSel==='5' && pp.each) {
      const single = getPlanPrice(id, st.type, plan.s, '1', variantSel);
      const sNum = parseFloat((single.d||'').replace(/[^0-9.]/g,''));
      const eNum = parseFloat((pp.each||'').replace(/[^0-9.]/g,''));
      const perAcctSave = (sNum&&eNum&&sNum>eNum) ? (sNum-eNum).toFixed(2) : null;
      advHtml = `<div class="fd-pack-adv" style="margin-top:8px;padding:8px 12px;border-radius:8px;background:${f.color}10;border:1px solid ${f.color}33;font-size:12px;color:var(--t1);display:flex;align-items:center;gap:8px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${f.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>
        <span><b>5 contas</b> · <b style="color:${f.color}">${pp.each}</b>/conta${perAcctSave?` — ${_tt('fd_pack_economia','economiza')} ${cur}${perAcctSave}/conta vs avulso`:''}</span></div>`;
    }
    h += `<div class="fd-price" style="border-color:${f.color}1F"><div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${f.color}40,transparent)"></div>
      <div><div class="fd-price-size">${plan.s}${packSel==='5'?' ×5':''}</div><div class="fd-price-type">${st.type}${variantSel==='nofee'?' · '+_tt('fd_var_nofee','Sem taxa'):''}</div></div>
      <div class="fd-price-right"><div class="fd-price-new" style="color:${f.color}">${pp.d}</div>${pp.o&&pp.o!=='—'?`<div class="fd-price-old">${pp.o}</div>`:''} ${save?`<div class="fd-price-save">${t('fd_economia')} ${cur}${save}</div>`:''}</div>
    </div>${advHtml}`;
    }
  }

  // Promo countdown (if active)
  h += promoTimerPill(f);

  // Coupon + CTA card
  if (f.coupon) {
    const isLong = f.coupon.length > 12;
    h += `<div class="fd-steps-card">`;
    h += `<div class="fd-step-instruction"><span class="fd-step-num active">1</span><span class="fd-step-text active">${t('fd_step1_cupom_text')}</span></div>`;
    h += `<div class="fd-cpn"><div><div class="fd-cpn-tag">${t('fd_cupom_exclusivo')}</div><div class="fd-cpn-code${isLong?' long':''}">${f.coupon}</div></div>
      <button class="fd-cpn-copy" onclick="cpCoupon('${f.coupon}','${f.id||id}','fd_coupon')">${t('firms_copiar')}</button></div>
`;
    h += `<div class="fd-step-instruction"><span class="fd-step-num">2</span><span class="fd-step-text">${t('fd_step2_cta_text')}</span></div>`;
    h += `<button class="fd-cta" onclick="fdGo('${id}')">${t('fd_comecar')} &#8594;</button>`;
    h += `</div>`;
  } else {
    h += `<button class="fd-cta" onclick="fdGo('${id}')">${t('fd_comecar')} &#8594;</button>`;
  }

  // Includes
  if (fa.includes?.length) {
    h += `<div class="fd-includes"><div class="fd-inc-title">${t('fd_incluso_plano')}</div>
      <div class="fd-inc-grid">${fa.includes.map(i=>`<div class="fd-inc">${tf(i)}</div>`).join('')}</div></div>`;
  }

  // Activation fee disclaimer (transparência: trader sabe antes do checkout que tem taxa extra ao passar)
  if (f.hasActivationFee) {
    h += `<div class="fd-fee-note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span><strong>${t('fee_inclui')||'Inclui'}:</strong> ${t('fee_avaliacao')||'avaliação'}. <strong>${t('fee_nao_inclui')||'Não inclui'}:</strong> ${t('fee_taxa_ativacao')||'taxa de ativação (paga ao passar, varia por tamanho de conta)'}.</span></div>`;
  } else {
    h += `<div class="fd-fee-note fd-fee-note-good"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><polyline points="20 6 9 17 4 12"/></svg><span><strong>${t('fee_sem_taxa')||'Sem taxa de ativação'}</strong> — ${t('fee_passou_opera')||'passou na avaliação, já opera'}.</span></div>`;
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
  const _src=window._dedicatedFirmSlug?'dedicated':'homepage';
  if (cf) {
    let url = cf.buildUrl(st.size||'',st.type||'',st.plat||'');
    url = _appendQuery(url, 'utm_source=marketscoupons&utm_medium=detail&utm_campaign='+id+'_'+(st.size||'').replace(/[^a-z0-9]/gi,'_').toLowerCase());
    // Clipboard automatico removido — gerava prompt mobile e nao agregava (user nem via).
    track('checkout_click',{firm_id:id,firm_name:f?.name,platform:st.plat,type:st.type,account_size:st.size,coupon:f?.coupon||'parceiro',source:_src,value:_fbVal(f,st.size),currency:'USD'});
    registerLoyaltyClick(st.size||'',st.plat||'',st.type||'',f?.name||'');
    mcOpenFirm(id, url, f?.coupon, f?.name);
  } else {
    // Clipboard automatico removido (era _cpToClip aqui).
    track('checkout_click',{firm_id:id,firm_name:f?.name||'',coupon:f?.coupon||'parceiro',source:_src,value:_fbVal(f),currency:'USD'});
    registerLoyaltyClick('','','',f?.name||'');
    mcOpenFirm(id, f?.link||'#', f?.coupon, f?.name);
  }
}

function closeFD(){
  if(_fdClosing) return;
  _fdClosing = true;
  const ov = document.getElementById('fd-overlay');
  if(ov) ov.classList.remove('show');
  const bg = document.getElementById('fd-bg');
  if(bg) bg.style.backgroundImage = 'none';
  document.querySelectorAll('.fr').forEach(r=>r.classList.remove('active'));
  document.body.style.overflow='';
  _fdCurrent = null;

  const p = location.pathname.replace(/^\//,'').replace(/\/$/,'');
  const needsBack = window._dedicatedFirmSlug || _firmPageSlugs.includes(p);
  if(needsBack){
    setTimeout(()=>{ _fdClosing = false; history.back(); }, 0);
    return;
  }
  if(location.hash.startsWith('#firm/')) history.replaceState(null,'',location.pathname+location.search);
  if(window._fdOriginPage && window._fdOriginPage !== _currentPage) go(window._fdOriginPage,true);
  _fdClosing = false;
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('fd-overlay')?.classList.contains('show'))closeFD();});
// Handle browser back from pushState /apex → close overlay instantly
window.addEventListener('popstate',()=>{
  const fdOv=document.getElementById('fd-overlay');
  if(fdOv&&fdOv.classList.contains('show')){
    fdOv.classList.remove('show');
    document.body.style.overflow='';
    const bg = document.getElementById('fd-bg');
    if(bg) bg.style.backgroundImage = 'none';
    _fdCurrent = null;
  }
  document.getElementById('ov')?.classList.remove('open');
  document.getElementById('drw')?.classList.remove('open');
  document.querySelectorAll('.fr').forEach(r=>r.classList.remove('active'));
});

function fdGoCheckout(fId){
  const cf=CHECKOUT_FIRMS.find(x=>x.id===fId);const f=FIRMS.find(x=>x.id===fId);
  if(!cf||!f){window.open(f?.link||'#','_blank','noopener,noreferrer');return;}
  const st=_drwState[fId]||{};
  const _src=window._dedicatedFirmSlug?'dedicated':'homepage';
  let url=cf.buildUrl(st.size||'',st.type||'',st.plat||'');
  url = _appendQuery(url, 'utm_source=marketscoupons&utm_medium=detail&utm_campaign='+fId+'_'+(st.size||'').replace(/[^a-z0-9]/gi,'_').toLowerCase());
  // Clipboard automatico removido — redirect limpo
  track('checkout_click',{firm_id:fId,firm_name:f.name,platform:st.plat,type:st.type,account_size:st.size,coupon:f.coupon||'parceiro',source:_src,value:_fbVal(f,st.size),currency:'USD'});
  registerLoyaltyClick(st.size||'',st.plat||'',st.type||'',f.name);
  mcOpenFirm(fId, url, f.coupon, f.name);
}

// ── PLATFORM DETAIL OVERLAY (Desktop) ──
let _pdCurrent = null;
const _pdState = {};

function openPD(id) {
  _pdCurrent = id;
  const p = getPlatforms().find(x=>x.id===id);
  const pd = PLAT_DETAIL[id];
  if (!p || !pd) { window.open(p?.link||'#','_blank','noopener,noreferrer'); return; }

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
    L += `<div style="display:inline-flex;align-items:center;gap:10px;margin-top:12px;padding:10px 16px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:10px;">
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
  const tc=pd.types.length<=4?pd.types.length:3;
  const sc=plans?.length<=5?plans?.length:3;

  let h = `<div class="fd-ck-header">
    <div class="fd-ck-title">${t('pd_escolha_plano')}</div>
    <div class="fd-ck-sub">${p.discount>0?t('pd_desconto_anual'):t('pd_planos_disponiveis')}</div>
  </div>`;

  // Type pills (same pattern as fd-overlay)
  if (pd.types.length > 1) {
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${p.color};box-shadow:0 0 8px ${p.color}40"></span>${t('pd_periodo')}</div>
      <div class="fd-pills" style="--cols:${tc}">${pd.types.map(tp=>`<button class="fd-pill${tp===st.type?' sel':''}" style="${tp===st.type?`background:${p.color}12;border-color:${p.color}4D;color:${p.color}`:''}" onclick="pdSel('${id}','type','${tp}')">${tf(tp)}</button>`).join('')}</div></div>`;
  }

  // Plan pills (same pattern as fd-overlay size pills)
  if (plans?.length) {
    h += `<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${p.color};box-shadow:0 0 8px ${p.color}40"></span>${t('pd_plano')}</div>
      <div class="fd-sizes" style="--cols:${sc}">${plans.map(pl=>`<button class="fd-sz${pl.s===st.size?' sel':''}${pl.pop?' pop':''}"${pl.pop?' data-pop-label="'+t('ach_popular')+'"':''} style="${pl.s===st.size?`background:${p.color}12;border-color:${p.color}59;color:${p.color}`:''}" onclick="pdSel('${id}','size','${pl.s}')">${pl.s}</button>`).join('')}</div></div>`;
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
      h += `<div style="padding:8px 16px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:8px;margin-top:-4px;">
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
  track('platform_select',{platform_id:id,field:key,value:val});
}

function pdGo(id) {
  const p = getPlatforms().find(x=>x.id===id);
  if (!p) return;
  const st = _pdState[id]||{};
  const url = _appendQuery(p.link, 'utm_source=marketscoupons&utm_medium=platform_detail&utm_campaign='+id+'_'+(st.size||'').replace(/[^a-z0-9]/gi,'_').toLowerCase());
  track('platform_checkout_click',{platform_id:id,platform_name:p.name,plan:st.size,type:st.type});
  window.open(url,'_blank','noopener,noreferrer');
}

function closePD(){
  document.getElementById('pd-overlay').classList.remove('show');
  document.body.style.overflow='';
}

function openPDMobile(id){
  _pdCurrent=id;
  const p=getPlatforms().find(x=>x.id===id);
  const pd=PLAT_DETAIL[id];
  track('platform_detail_open',{platform_id:id,platform_name:p?.name||id,device:'mobile'});
  if(!p||!pd){window.open(p?.link||'#','_blank','noopener,noreferrer');return;}
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
  const tc=pd.types.length<=4?pd.types.length:3;
  const sc=plans?.length<=5?plans?.length:3;

  let h=`<div class="fd-ck-header" style="padding:0;"><div class="fd-ck-title" style="font-size:18px;">${t('pd_escolha_plano')}</div>
    <div class="fd-ck-sub">${p.discount>0?t('pd_desconto_anual'):t('pd_planos_disponiveis')}</div></div>`;

  // Type pills
  if(pd.types.length>1){
    h+=`<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${p.color};box-shadow:0 0 8px ${p.color}40"></span>${t('pd_periodo')}</div>
      <div class="fd-pills" style="--cols:${tc}">${pd.types.map(tp=>`<button class="fd-pill${tp===st.type?' sel':''}" style="${tp===st.type?`background:${p.color}12;border-color:${p.color}4D;color:${p.color}`:''}" onclick="_pdState['${id}'].type='${tp}';var pl=(PLAT_DETAIL['${id}']&&PLAT_DETAIL['${id}'].plans&&PLAT_DETAIL['${id}'].plans['${tp}'])||[];if(pl.length)_pdState['${id}'].size=(pl.find(x=>x.pop)||pl[0]).s;pdRenderMobile('${id}')">${tf(tp)}</button>`).join('')}</div></div>`;
  }

  // Plan pills
  if(plans?.length){
    h+=`<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${p.color};box-shadow:0 0 8px ${p.color}40"></span>${t('pd_plano')}</div>
      <div class="fd-sizes" style="--cols:${sc}">${plans.map(pl=>`<button class="fd-sz${pl.s===st.size?' sel':''}${pl.pop?' pop':''}"${pl.pop?' data-pop-label="'+t('ach_popular')+'"':''} style="${pl.s===st.size?`background:${p.color}12;border-color:${p.color}59;color:${p.color}`:''}" onclick="_pdState['${id}'].size='${pl.s}';pdRenderMobile('${id}')">${pl.s}</button>`).join('')}</div></div>`;
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
      // A/B test default size (variante A = menor / B = popular)
      _fdState[id]={type:firstType,plat:f.platforms?.[0]||'',size:_abPickDefaultSize(firstPlans)};
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

    // Stats grid (exposed - 12 cards)
    html+=`<div class="fd-stats" style="margin-top:0;padding-top:0;border-top:none;margin-bottom:14px;">
      <div class="fd-stat"><div class="fd-stat-label">Profit Split</div><div class="fd-stat-val g">${f.split}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_meta')}</div><div class="fd-stat-val y">${tf(f.target)||'—'}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">Drawdown</div><div class="fd-stat-val r">${tf(f.ddPct)||'—'}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_dias_min')}</div><div class="fd-stat-val">${f.minDays||'—'}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_scaling')}</div><div class="fd-stat-val">${tf(f.scaling)||'—'}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_prazo')}</div><div class="fd-stat-val">${f.evalDays?f.evalDays+'d':t('drw_sem_limite')}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">News Trading</div><div class="fd-stat-val ${f.newsTrading?'g':'r'}">${f.newsTrading?t('drw_sim'):t('drw_nao')}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">Day 1 Payout</div><div class="fd-stat-val ${f.day1Payout?'g':'r'}">${f.day1Payout?t('drw_sim'):t('drw_nao')}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_alavancagem')}</div><div class="fd-stat-val">${f.leverage||'—'}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_consistencia')}</div><div class="fd-stat-val ${f.consistency==='Not required'||!f.consistency?'g':'y'}">${tf(f.consistency)||t('drw_nao_exige')}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_payout')}</div><div class="fd-stat-val b">${tf(f.payoutSpeed)||'—'}</div></div>
      <div class="fd-stat"><div class="fd-stat-label">${t('drw_max_contas')}</div><div class="fd-stat-val b">${f.maxAccounts||'—'}</div></div>
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
  html+= promoTimerPill(f);
  if (f.coupon) {
    html+=`<div class="drw-coupon-bar">
      <div class="offer-coupon-left"><div class="drw-coupon-label">${t('firms_cupom_exclusivo')}</div><span class="drw-coupon-code${f.coupon.length>12?' long':''}">${f.coupon}</span></div>
      <button class="drw-coupon-copy" onclick="cpCoupon('${f.coupon}','${f.id}','drw_direct')">${t('firms_copiar')}</button>
    </div><div class="drw-coupon-hint">${t('firms_hint_cupom')}</div>`;
  }
  html+=`<button class="go-btn" onclick="mcOpenFirm('${id}','${f.link}','${f.coupon||''}','${f.name.replace(/'/g,"\\'")}');var _s=window._dedicatedFirmSlug?'dedicated':'homepage';var _v=_fbVal(FIRMS.find(function(x){return x.id==='${id}'}));track('checkout_click',{firm_id:'${id}',firm_name:'${f.name.replace(/'/g,"\\'")}',coupon_code:'${f.coupon||'parceiro'}',value:_v,source:_s});registerLoyaltyClick('','','','${f.name.replace(/'/g,"\\'")}')">${t('firms_comecar')}</button></div>`;

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
    const tc=fa.types.length<=4?fa.types.length:3;
    h+=`<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_tipo_conta')}</div>
      <div class="fd-pills" style="--cols:${tc}">${fa.types.map(tp=>`<button class="fd-pill${tp===st.type?' sel':''}" style="${tp===st.type?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="_fdState['${id}'].type='${tp}';var pl=(FIRM_ABOUT['${id}']&&FIRM_ABOUT['${id}'].plans&&FIRM_ABOUT['${id}'].plans['${tp}'])||[];if(pl.length)_fdState['${id}'].size=(pl.find(p=>p.pop)||pl[0]).s;drwRenderCk('${id}')">${tp}</button>`).join('')}</div></div>`;
  }

  // Platform pills
  if(f.platforms?.length){
    const pc=f.platforms.length<=4?f.platforms.length:3;
    h+=`<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_plataforma')}</div>
      <div class="fd-pills" style="--cols:${pc}">${f.platforms.map(p=>`<button class="fd-pill${p===st.plat?' sel':''}" style="${p===st.plat?`background:${f.color}12;border-color:${f.color}4D;color:${f.color}`:''}" onclick="_fdState['${id}'].plat='${p}';drwRenderCk('${id}')">${p}</button>`).join('')}</div></div>`;
  }

  // Size pills
  if(plans?.length){
    const sc=plans.length<=5?plans.length:3;
    h+=`<div class="fd-step"><div class="fd-step-label"><span class="fd-step-dot" style="background:${f.color};box-shadow:0 0 8px ${f.color}40"></span>${t('fd_tamanho_conta')}</div>
      <div class="fd-sizes" style="--cols:${sc}">${plans.map(p=>`<button class="fd-sz${p.s===st.size?' sel':''}${p.pop?' pop':''}"${p.pop?' data-pop-label="'+t('ach_popular')+'"':''} style="${p.s===st.size?`background:${f.color}12;border-color:${f.color}59;color:${f.color}`:''}" onclick="_fdState['${id}'].size='${p.s}';drwRenderCk('${id}')">${p.s}</button>`).join('')}</div></div>`;
  }

  // Price card — getPlanPrice reads Supabase FIRMS[].prices with hardcoded fallback
  const plan=plans?.find(p=>p.s===st.size)||plans?.[0];
  if(plan){
    const pp=getPlanPrice(id, st.type, plan.s);
    const oNum=parseFloat((pp.o||'').replace(/[^0-9.]/g,''));
    const dNum=parseFloat((pp.d||'').replace(/[^0-9.]/g,''));
    const cur=(pp.d||'').match(/[€$]/)?.[0]||'$';
    const save=oNum&&dNum&&pp.o!=='—'?(oNum-dNum).toFixed(2):null;
    h+=`<div class="fd-price" style="border-color:${f.color}1F"><div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${f.color}40,transparent)"></div>
      <div><div class="fd-price-size" style="font-size:20px;">${plan.s}</div><div class="fd-price-type">${st.type}</div></div>
      <div class="fd-price-right"><div class="fd-price-new" style="color:${f.color};font-size:24px;">${pp.d}</div>${pp.o&&pp.o!=='—'?`<div class="fd-price-old">${pp.o}</div>`:''} ${save?`<div class="fd-price-save">${t('fd_economia')} ${cur}${save}</div>`:''}</div>
    </div>`;
  }

  // Promo countdown pill
  h += promoTimerPill(f);

  // Coupon + CTA card
  if(f.coupon){
    const isLong=f.coupon.length>12;
    h+=`<div class="fd-steps-card">`;
    h+=`<div class="fd-step-instruction"><span class="fd-step-num active">1</span><span class="fd-step-text active">${t('fd_step1_cupom_text')}</span></div>`;
    h+=`<div class="fd-cpn"><div><div class="fd-cpn-tag">${t('fd_cupom_exclusivo')}</div><div class="fd-cpn-code${isLong?' long':''}">${f.coupon}</div></div>
      <button class="fd-cpn-copy" onclick="cpCoupon('${f.coupon}','${id}','drw_fd_coupon')">${t('firms_copiar')}</button></div>
`;
    h+=`<div class="fd-step-instruction"><span class="fd-step-num">2</span><span class="fd-step-text">${t('fd_step2_cta_text')}</span></div>`;
    h+=`<button class="fd-cta" onclick="fdGo('${id}')">${t('fd_comecar')} &#8594;</button>`;
    h+=`</div>`;
  } else {
    h+=`<button class="fd-cta" onclick="fdGo('${id}')">${t('fd_comecar')} &#8594;</button>`;
  }

  // Includes
  if(fa.includes?.length){
    h+=`<div class="fd-includes"><div class="fd-inc-title">${t('fd_incluso_plano')}</div>
      <div class="fd-inc-grid">${fa.includes.map(i=>`<div class="fd-inc">${tf(i)}</div>`).join('')}</div></div>`;
  }

  // Activation fee disclaimer (mesma lógica do desktop fd-overlay)
  if (f.hasActivationFee) {
    h += `<div class="fd-fee-note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span><strong>${t('fee_inclui')||'Inclui'}:</strong> ${t('fee_avaliacao')||'avaliação'}. <strong>${t('fee_nao_inclui')||'Não inclui'}:</strong> ${t('fee_taxa_ativacao')||'taxa de ativação (paga ao passar, varia por tamanho de conta)'}.</span></div>`;
  } else {
    h += `<div class="fd-fee-note fd-fee-note-good"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><polyline points="20 6 9 17 4 12"/></svg><span><strong>${t('fee_sem_taxa')||'Sem taxa de ativação'}</strong> — ${t('fee_passou_opera')||'passou na avaliação, já opera'}.</span></div>`;
  }

  document.getElementById('drw-ck-'+id).innerHTML=h;
}

function toggleDrwSection(id) {
  document.getElementById(id)?.classList.toggle('open');
  track('drawer_section_toggle',{section:id});
}

function drwSelType(firmId, type) {
  _drwState[firmId] = _drwState[firmId] || {};
  _drwState[firmId].type = type;
  document.querySelectorAll(`#drw-types-${firmId} .drw-btn`).forEach(b=>b.classList.toggle('sel', b.textContent.trim()===type));
  track('drawer_select',{firm_id:firmId,field:'type',value:type});
}
function drwSelPlat(firmId, plat) {
  _drwState[firmId] = _drwState[firmId] || {};
  _drwState[firmId].plat = plat;
  document.querySelectorAll(`#drw-plats-${firmId} .drw-btn`).forEach(b=>b.classList.toggle('sel', b.textContent.trim()===plat));
  track('drawer_select',{firm_id:firmId,field:'platform',value:plat});
}
function drwSelSize(firmId, size) {
  _drwState[firmId] = _drwState[firmId] || {};
  _drwState[firmId].size = size;
  document.querySelectorAll(`#drw-sizes-${firmId} .drw-btn`).forEach(b=>b.classList.toggle('sel', b.textContent.trim()===size));
  track('drawer_select',{firm_id:firmId,field:'size',value:size});
}
function drwGoCheckout(firmId) {
  const cf = CHECKOUT_FIRMS.find(f=>f.id===firmId);
  const f  = FIRMS.find(x=>x.id===firmId);
  if (!cf || !f) { mcOpenFirm(firmId, f?.link||'#', f?.coupon, f?.name); return; }
  const st = _drwState[firmId] || {};
  let url = cf.buildUrl(st.size||'', st.type||'', st.plat||'');
  url = _appendQuery(url, 'utm_source=marketscoupons&utm_medium=drawer&utm_campaign='+firmId+'_'+(st.size||'').replace(/[^a-z0-9]/gi,'_').toLowerCase());
  // Clipboard automatico removido — redirect limpo
  const _src=window._dedicatedFirmSlug?'dedicated':'homepage';
  track('checkout_click',{firm_id:firmId,firm_name:f.name,platform:st.plat,type:st.type,account_size:st.size,coupon:f.coupon||'parceiro',source:_src,value:_fbVal(f,st.size),currency:'USD'});
  registerLoyaltyClick(st.size||'',st.plat||'',st.type||'',f.name);
  mcOpenFirm(firmId, url, f.coupon, f.name);
}

function closeD(){if(window._dedicatedFirmSlug){history.back();return;}document.getElementById('ov').classList.remove('open');document.getElementById('drw').classList.remove('open');document.getElementById('fd-overlay')?.classList.remove('show');document.querySelectorAll('.fr').forEach(r=>r.classList.remove('active'));document.body.style.overflow='';const p=location.pathname.replace(/^\//,'').replace(/\/$/,'');if(_firmPageSlugs.includes(p)){history.back();}else{if(location.hash.startsWith('#firm/'))history.replaceState(null,'',location.pathname+location.search);if(window._fdOriginPage)go(window._fdOriginPage,true);}}

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
  } catch(e) { window.open(url, '_blank', 'noopener,noreferrer'); }
  return false;
}

/* FAQ */
const FAQ_LANGS = {
  pt: [
    {q:'O que é uma prop firm?', a:'Uma prop firm (proprietary trading firm) é uma empresa que fornece capital para traders operarem. O trader faz uma avaliação, e se aprovado, opera com o dinheiro da firma e recebe parte dos lucros.'},
    {q:'Como funcionam os cupons do Markets Coupons?', a:'Nossos cupons são códigos exclusivos negociados diretamente com as prop firms. Basta copiar o código e colar no checkout da firma para receber o desconto automaticamente. Alguns descontos são aplicados diretamente pelo link de parceiro.'},
    {q:'Os cupons têm custo?', a:'Não. Os cupons são códigos de desconto negociados diretamente com as prop firms. Você aplica no checkout e o desconto é ativado automaticamente, sem custo adicional.'},
    {q:'Qual a melhor prop firm para iniciantes?', a:'Depende do seu perfil. A Apex Trader Funding oferece até 90% de desconto e regras flexíveis. A Bulenox permite passar em 1 dia. A FTMO tem Free Trial ilimitado. Use nosso Quiz para descobrir a melhor para você.'},
    {q:'Posso usar mais de um cupom ao mesmo tempo?', a:'Geralmente não. Cada prop firm aceita apenas um código de desconto por compra. Nossos cupons já são os maiores disponíveis no mercado.'},
    {q:'O que é Trailing Drawdown vs EOD Drawdown?', a:'Trailing Drawdown se move conforme o lucro, podendo voltar ao breakeven. EOD (End of Day) Drawdown só é calculado no fechamento do dia, dando mais flexibilidade durante a operação.'},
    {q:'Quanto tempo leva para receber o payout?', a:'Varia por firma. Apex e Bulenox processam em 5 dias úteis. FundedNext garante payout em 24h.'},
    {q:'O que é o programa de fidelidade?', a:'Nosso programa de fidelidade recompensa membros com benefícios exclusivos por compras validadas. Com 1 compra aprovada você desbloqueia o Live Room VIP, análises diárias e GEX.'},
    {q:'Os cupons têm data de validade?', a:'Alguns cupons são por tempo limitado e outros são permanentes. As promoções de cada firma são atualizadas diariamente. Recomendamos usar o cupom assim que possível.'},
    {q:'Como faço para comparar prop firms?', a:'Use nossa ferramenta de comparação na aba "Comparar" ou acesse a aba "Firmas" para ver todas as opções lado a lado com ratings, preços, plataformas e avaliações do Trustpilot.'},
  ],
  en: [
    {q:'What is a prop firm?', a:'A prop firm (proprietary trading firm) is a company that provides capital for traders to operate. The trader takes an evaluation, and if approved, trades with the firm\'s money and receives a share of the profits.'},
    {q:'How do Markets Coupons coupons work?', a:'Our coupons are exclusive codes negotiated directly with prop firms. Just copy the code and paste it at the firm\'s checkout to receive the discount automatically. Some discounts are applied directly through the partner link.'},
    {q:'Do the coupons have a cost?', a:'No. The coupons are discount codes negotiated directly with prop firms. You apply them at checkout and the discount is activated automatically, at no additional cost.'},
    {q:'What is the best prop firm for beginners?', a:'It depends on your profile. Apex Trader Funding offers up to 90% off and flexible rules. Bulenox lets you pass in 1 day. FTMO has an unlimited Free Trial. Use our Quiz to find the best one for you.'},
    {q:'Can I use more than one coupon at the same time?', a:'Generally no. Each prop firm accepts only one discount code per purchase. Our coupons are already the largest available in the market.'},
    {q:'What is Trailing Drawdown vs EOD Drawdown?', a:'Trailing Drawdown moves with profit, potentially returning to breakeven. EOD (End of Day) Drawdown is only calculated at market close, giving more flexibility during the trading session.'},
    {q:'How long does it take to receive a payout?', a:'Varies by firm. Apex and Bulenox process in 5 business days. FundedNext guarantees payout in 24h.'},
    {q:'What is the loyalty program?', a:'Our loyalty program rewards members with exclusive benefits for validated purchases. With 1 approved purchase you unlock the VIP Live Room, daily analysis and GEX.'},
    {q:'Do coupons have an expiration date?', a:'Some coupons are time-limited and others are permanent. Each firm\'s promotions are updated daily. We recommend using the coupon as soon as possible.'},
    {q:'How do I compare prop firms?', a:'Use our comparison tool in the "Compare" tab or access the "Firms" tab to see all options side by side with ratings, prices, platforms and Trustpilot reviews.'},
  ],
  es: [
    {q:'¿Qué es una prop firm?', a:'Una prop firm es una empresa que proporciona capital para que los traders operen. El trader realiza una evaluación y, si es aprobado, opera con el dinero de la empresa y recibe parte de las ganancias.'},
    {q:'¿Cómo funcionan los cupones de Markets Coupons?', a:'Nuestros cupones son códigos exclusivos negociados directamente con las prop firms. Solo copia el código y pégalo en el checkout de la firma para recibir el descuento automáticamente.'},
    {q:'¿Los cupones tienen costo?', a:'No. Los cupones son códigos de descuento negociados directamente con las prop firms. Los aplicas en el checkout y el descuento se activa automáticamente, sin costo adicional.'},
    {q:'¿Cuál es la mejor prop firm para principiantes?', a:'Apex ofrece hasta 90% de descuento. Bulenox permite pasar en 1 día. FTMO tiene Free Trial ilimitado. Usa nuestro Quiz para encontrar la mejor para ti.'},
    {q:'¿Puedo usar más de un cupón al mismo tiempo?', a:'Generalmente no. Cada prop firm acepta solo un código de descuento por compra.'},
    {q:'¿Qué es Trailing Drawdown vs EOD Drawdown?', a:'Trailing Drawdown se mueve con el beneficio. EOD Drawdown solo se calcula al cierre del mercado, dando más flexibilidad.'},
    {q:'¿Cuánto tiempo lleva recibir el payout?', a:'Varía por firma. Apex y Bulenox procesan en 5 días hábiles. FundedNext garantiza payout en 24h.'},
    {q:'¿Qué es el programa de fidelidad?', a:'Nuestro programa de fidelidad recompensa a los miembros con beneficios exclusivos por sus compras validadas. Con 1 compra aprobada desbloqueas el Live Room VIP, análisis diarios y GEX.'},
    {q:'¿Los cupones tienen fecha de vencimiento?', a:'Algunos son por tiempo limitado y otros son permanentes. Recomendamos usar el cupón lo antes posible.'},
    {q:'¿Cómo comparo prop firms?', a:'Usa nuestra herramienta de comparación en la pestaña "Comparar" o accede a "Firmas" para ver todas las opciones lado a lado.'},
  ],
  it: [
    {q:'Cos\'è una prop firm?', a:'Una prop firm è un\'azienda che fornisce capitale ai trader per operare. Il trader supera una valutazione e, se approvato, opera con il denaro dell\'azienda ricevendo una parte dei profitti.'},
    {q:'Come funzionano i coupon di Markets Coupons?', a:'I nostri coupon sono codici esclusivi negoziati direttamente con le prop firm. Basta copiare il codice e incollarlo al checkout per ricevere lo sconto automaticamente.'},
    {q:'I coupon hanno un costo?', a:'No. I coupon sono codici sconto negoziati direttamente con le prop firm. Li applichi al checkout e lo sconto viene attivato automaticamente, senza costi aggiuntivi.'},
    {q:'Qual è la migliore prop firm per i principianti?', a:'Apex offre fino al 90% di sconto. Bulenox permette di superare la valutazione in 1 giorno. FTMO ha un Free Trial illimitato. Usa il nostro Quiz per trovare quella giusta per te.'},
    {q:'Posso usare più di un coupon contemporaneamente?', a:'In generale no. Ogni prop firm accetta solo un codice sconto per acquisto.'},
    {q:'Cos\'è il Trailing Drawdown vs EOD Drawdown?', a:'Il Trailing Drawdown si muove con il profitto. L\'EOD Drawdown viene calcolato solo alla chiusura del mercato, offrendo maggiore flessibilità.'},
    {q:'Quanto tempo ci vuole per ricevere il payout?', a:'Varia per firma. Apex e Bulenox processano in 5 giorni lavorativi. FundedNext garantisce il payout in 24h.'},
    {q:'Cos\'è il programma fedeltà?', a:'Il nostro programma fedeltà premia i membri con benefici esclusivi per gli acquisti validati. Con 1 acquisto approvato sblocchi il Live Room VIP.'},
    {q:'I coupon hanno una data di scadenza?', a:'Alcuni sono a tempo limitato e altri sono permanenti. Consigliamo di usare il coupon il prima possibile.'},
    {q:'Come confronto le prop firm?', a:'Usa il nostro strumento di confronto nella scheda "Confronta" o accedi ad "Aziende" per vedere tutte le opzioni fianco a fianco.'},
  ],
  fr: [
    {q:'Qu\'est-ce qu\'une prop firm ?', a:'Une prop firm est une société qui fournit des capitaux aux traders pour opérer. Le trader passe une évaluation et, s\'il est accepté, opère avec l\'argent de l\'entreprise et reçoit une partie des bénéfices.'},
    {q:'Comment fonctionnent les coupons de Markets Coupons ?', a:'Nos coupons sont des codes exclusifs négociés directement avec les prop firms. Il suffit de copier le code et de le coller lors du paiement pour obtenir la réduction automatiquement.'},
    {q:'Les coupons ont-ils un coût ?', a:'Non. Les coupons sont des codes de réduction négociés directement avec les prop firms. Vous les appliquez au checkout et la réduction est activée automatiquement, sans coût supplémentaire.'},
    {q:'Quelle est la meilleure prop firm pour les débutants ?', a:'Apex offre jusqu\'à 90% de réduction. Bulenox permet de réussir en 1 jour. FTMO a un Free Trial illimité. Utilisez notre Quiz pour trouver la meilleure pour vous.'},
    {q:'Puis-je utiliser plusieurs coupons en même temps ?', a:'En général non. Chaque prop firm accepte seulement un code de réduction par achat.'},
    {q:'Qu\'est-ce que le Trailing Drawdown vs EOD Drawdown ?', a:'Le Trailing Drawdown suit le profit. L\'EOD Drawdown n\'est calculé qu\'à la clôture du marché, offrant plus de flexibilité.'},
    {q:'Combien de temps faut-il pour recevoir le payout ?', a:'Varie selon la firme. Apex et Bulenox traitent en 5 jours ouvrables. FundedNext garantit le payout en 24h.'},
    {q:'Qu\'est-ce que le programme de fidélité ?', a:'Notre programme de fidélité récompense les membres avec des avantages exclusifs pour leurs achats validés. Avec 1 achat approuvé vous débloquez le Live Room VIP.'},
    {q:'Les coupons ont-ils une date d\'expiration ?', a:'Certains sont limités dans le temps et d\'autres sont permanents. Nous recommandons d\'utiliser le coupon le plus tôt possible.'},
    {q:'Comment comparer les prop firms ?', a:'Utilisez notre outil de comparaison dans l\'onglet "Comparer" ou accédez à "Firmes" pour voir toutes les options côte à côte.'},
  ],
  de: [
    {q:'Was ist eine Prop Firm?', a:'Eine Prop Firm ist ein Unternehmen, das Trader mit Kapital versorgt. Der Trader absolviert eine Bewertung und handelt bei Zulassung mit dem Geld der Firma und erhält einen Teil der Gewinne.'},
    {q:'Wie funktionieren die Gutscheine von Markets Coupons?', a:'Unsere Gutscheine sind exklusive Codes, die direkt mit den Prop Firms ausgehandelt wurden. Kopiere den Code und füge ihn beim Checkout ein, um den Rabatt automatisch zu erhalten.'},
    {q:'Haben die Gutscheine Kosten?', a:'Nein. Die Gutscheine sind Rabattcodes, die direkt mit den Prop Firms ausgehandelt wurden. Du wendest sie beim Checkout an und der Rabatt wird automatisch aktiviert, ohne zusätzliche Kosten.'},
    {q:'Was ist die beste Prop Firm für Anfänger?', a:'Apex bietet bis zu 90% Rabatt. Bulenox ermöglicht das Bestehen in 1 Tag. FTMO hat eine unbegrenzte Free Trial. Nutze unser Quiz, um die Beste für dich zu finden.'},
    {q:'Kann ich mehr als einen Gutschein gleichzeitig verwenden?', a:'Im Allgemeinen nein. Jede Prop Firm akzeptiert nur einen Rabattcode pro Kauf.'},
    {q:'Was ist Trailing Drawdown vs EOD Drawdown?', a:'Trailing Drawdown bewegt sich mit dem Gewinn. EOD Drawdown wird nur bei Marktschluss berechnet und bietet mehr Flexibilität.'},
    {q:'Wie lange dauert es, eine Auszahlung zu erhalten?', a:'Variiert je nach Firma. Apex und Bulenox verarbeiten in 5 Werktagen. FundedNext garantiert Auszahlung in 24h.'},
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
    {q:'كم من الوقت يستغرق استلام الدفعة؟', a:'يختلف حسب الشركة. Apex وBulenox تعالج خلال 5 أيام عمل. FundedNext تضمن الدفع خلال 24 ساعة.'},
    {q:'ما هو برنامج الولاء؟', a:'برنامج الولاء يكافئ الأعضاء بمزايا حصرية على المشتريات المعتمدة. مع 3 مشتريات موافق عليها تفتح Live Room VIP.'},
    {q:'هل للكوبونات تاريخ انتهاء؟', a:'بعضها محدود بوقت وآخر دائم. نوصي باستخدام الكوبون في أقرب وقت ممكن.'},
    {q:'كيف أقارن بين شركات Prop؟', a:'استخدم أداة المقارنة في تبويب "مقارنة" أو انتقل إلى "شركات" لرؤية جميع الخيارات جنباً إلى جنب.'},
  ],
};
function getFaqData() { return (_cmsFaq&&_cmsFaq[_currentLang]&&_cmsFaq[_currentLang].length ? _cmsFaq[_currentLang] : null) || FAQ_LANGS[_currentLang] || FAQ_LANGS.pt; }
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
function _cpToClip(code){
  const msg=t('toast_cupom_copiado').replace('{code}',code);
  try{
    navigator.clipboard.writeText(code).then(()=>showToast(msg)).catch(()=>{
      const ta=document.createElement('textarea');ta.value=code;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
      showToast(msg);
    });
  }catch(e){const ta=document.createElement('textarea');ta.value=code;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showToast(msg);}
}
function cpCoupon(code,firmId,loc){
  const msg=t('toast_cupom_copiado').replace('{code}',code);
  try{
    navigator.clipboard.writeText(code).then(()=>showToast(msg)).catch(()=>{
      // Fallback for clipboard API failure
      const ta=document.createElement('textarea');ta.value=code;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
      showToast(msg);
    });
  }catch(e){showToast(msg);}
  const f=FIRMS.find(x=>x.id===firmId);
  const _src=window._dedicatedFirmSlug?'dedicated':'homepage';
  // Anti-canibalização do popup giveaway: marca intent de compra
  try{ if(firmId) sessionStorage.setItem('mc_coupon_copied_'+firmId,'1'); }catch(e){}
  track('coupon_copy',{coupon_code:code,firm_id:firmId,firm_name:f?.name,discount:f?.discount,location:loc,source:_src});
}

/* MULTI-FIRM CHECKOUT */
const CHECKOUT_FIRMS=[
  {id:'apex',name:'Apex Trader Funding',short:'Apex',coupon:'MARKET',discount:'90%',color:'#F97316',bg:'rgba(249,115,22,0.12)',
   includes:['No daily loss limit','No scaling rules','NinjaTrader License (Rithmic)','Real-time data','Copy Trader (WealthCharts)','24/7 Support'],
   types:['Intraday Trail','EOD Trail'],platforms:['Rithmic','Tradovate','WealthCharts'],
   plansByType:{
     'Intraday Trail':[{size:'25K',capital:'$25,000',goal:'$1,500',maxDD:'$1,500',orig:'$199',disc:'$19.90',featured:false},{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'$2,500',orig:'$249',disc:'$24.90',featured:false},{size:'100K',capital:'$100,000',goal:'$6,000',maxDD:'$3,000',orig:'$399',disc:'$39.90',featured:true},{size:'150K',capital:'$150,000',goal:'$9,000',maxDD:'$4,500',orig:'$599',disc:'$59.90',featured:false}],
     'EOD Trail':[{size:'25K',capital:'$25,000',goal:'$1,500',maxDD:'$1,500',orig:'$299',disc:'$29.90',featured:false},{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'$2,500',orig:'$349',disc:'$34.90',featured:false},{size:'100K',capital:'$100,000',goal:'$6,000',maxDD:'$3,000',orig:'$599',disc:'$59.90',featured:true},{size:'150K',capital:'$150,000',goal:'$9,000',maxDD:'$4,500',orig:'$799',disc:'$79.90',featured:false}]
   },
   buildUrl:(size,type,plat)=>'https://apextraderfunding.com/member/aff/go/evertonmiranda#block_660bfb7d9cd2c41901144ab4319f8644'},
  {id:'bulenox',name:'Bulenox',short:'Bulenox',coupon:'MARKET89',discount:'89%',color:'#3B82F6',bg:'rgba(59,130,246,0.12)',
   includes:['Pass in 1 day','No consistency rule','News trading allowed','Weekly payouts','Scaling up to $400K','14-day free Rithmic trial'],
   types:['Trailing DD','EOD DD'],platforms:['Rithmic','NinjaTrader'],
   plansByType:{
     'Trailing DD':[{size:'25K',capital:'$25,000',goal:'$1,500',maxDD:'$1,500',orig:'$145',disc:'$15.95',featured:false},{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'$2,500',orig:'$175',disc:'$19.25',featured:false},{size:'100K',capital:'$100,000',goal:'$6,000',maxDD:'$3,000',orig:'$215',disc:'$23.65',featured:true},{size:'150K',capital:'$150,000',goal:'$9,000',maxDD:'$4,500',orig:'$325',disc:'$35.75',featured:false},{size:'250K',capital:'$250,000',goal:'$15,000',maxDD:'$5,500',orig:'$535',disc:'$58.85',featured:false}],
     'EOD DD':[{size:'25K',capital:'$25,000',goal:'$1,500',maxDD:'$1,500',orig:'$145',disc:'$15.95',featured:false},{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'$2,500',orig:'$175',disc:'$19.25',featured:false},{size:'100K',capital:'$100,000',goal:'$6,000',maxDD:'$3,000',orig:'$215',disc:'$23.65',featured:true},{size:'150K',capital:'$150,000',goal:'$9,000',maxDD:'$4,500',orig:'$325',disc:'$35.75',featured:false},{size:'250K',capital:'$250,000',goal:'$15,000',maxDD:'$5,500',orig:'$535',disc:'$58.85',featured:false}]
   },
   buildUrl:(size,type,plat)=>'https://bulenox.com/member/aff/go/marketcoupons'},
  {id:'ftmo',name:'FTMO',short:'FTMO',coupon:null,discount:'0%',color:'#22C55E',bg:'rgba(34,197,94,0.12)',
   includes:['Free Trial available','Up to 90% profit split','1-Step (NEW) and 2-Step','Support in 18 languages','Scaling up to $2M','No time limit'],
   types:['1-Step Challenge','2-Step Challenge'],platforms:['MT4','MT5','cTrader','DXtrade'],
   plansByType:{
     '1-Step Challenge':[{size:'10K',capital:'€10,000',goal:'€1,000',maxDD:'-10%',orig:'—',disc:'€79',featured:false},{size:'25K',capital:'€25,000',goal:'€2,500',maxDD:'-10%',orig:'—',disc:'€199',featured:false},{size:'50K',capital:'€50,000',goal:'€5,000',maxDD:'-10%',orig:'—',disc:'€319',featured:false},{size:'100K',capital:'€100,000',goal:'€10,000',maxDD:'-10%',orig:'—',disc:'€499',featured:true},{size:'200K',capital:'€200,000',goal:'€20,000',maxDD:'-10%',orig:'—',disc:'€999',featured:false}],
     '2-Step Challenge':[{size:'10K',capital:'€10,000',goal:'€1,000',maxDD:'-10%',orig:'—',disc:'€79',featured:false},{size:'25K',capital:'€25,000',goal:'€2,500',maxDD:'-10%',orig:'—',disc:'€199',featured:false},{size:'50K',capital:'€50,000',goal:'€5,000',maxDD:'-10%',orig:'—',disc:'€319',featured:false},{size:'100K',capital:'€100,000',goal:'€10,000',maxDD:'-10%',orig:'—',disc:'€499',featured:true},{size:'200K',capital:'€200,000',goal:'€20,000',maxDD:'-10%',orig:'—',disc:'€999',featured:false}]
   },
   buildUrl:(size,type,plat)=>'https://trader.ftmo.com/?affiliates=eyfIptUCGgfcfaUlyrRP'},
  {id:'fn',name:'FundedNext',short:'FundedNext',coupon:'',discount:'25%',color:'#06B6D4',bg:'rgba(6,182,212,0.12)',
   includes:['Up to 95% profit split','15% reward in challenge phase','Guaranteed 24h payout','No time limit','News trading allowed','$288M+ total rewarded'],
   types:['Stellar 2-Step','Stellar 1-Step','Stellar Instant','Bolt (Futures)','Rapid (Futures)','Legacy (Futures)'],platforms:['MT4','MT5','cTrader','Match-Trader','Rithmic'],
   plansByType:{
     'Stellar 2-Step':[{size:'25K',capital:'$25,000',goal:'$2,000',maxDD:'-10%',orig:'$189.99',disc:'$142.49',featured:false},{size:'50K',capital:'$50,000',goal:'$4,000',maxDD:'-10%',orig:'$269.99',disc:'$202.49',featured:true},{size:'100K',capital:'$100,000',goal:'$8,000',maxDD:'-10%',orig:'$499.99',disc:'$374.99',featured:false}],
     'Stellar 1-Step':[{size:'25K',capital:'$25,000',goal:'$2,500',maxDD:'-4%',orig:'$239.99',disc:'$179.99',featured:false},{size:'50K',capital:'$50,000',goal:'$5,000',maxDD:'-4%',orig:'$339.99',disc:'$254.99',featured:true},{size:'100K',capital:'$100,000',goal:'$10,000',maxDD:'-4%',orig:'$649.99',disc:'$487.49',featured:false}],
     'Stellar Instant':[{size:'5K',capital:'$5,000',goal:'—',maxDD:'-4%',orig:'$149.99',disc:'$112.49',featured:false},{size:'10K',capital:'$10,000',goal:'—',maxDD:'-4%',orig:'$299.99',disc:'$224.99',featured:false},{size:'20K',capital:'$20,000',goal:'—',maxDD:'-4%',orig:'$599.99',disc:'$449.99',featured:true}],
     'Bolt (Futures)':[{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'-4%',orig:'$99.99',disc:'$74.99',featured:true}],
     'Rapid (Futures)':[{size:'25K',capital:'$25,000',goal:'$2,000',maxDD:'-4%',orig:'$89.99',disc:'$67.49',featured:false},{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'-4%',orig:'$159.99',disc:'$119.99',featured:true},{size:'100K',capital:'$100,000',goal:'$6,000',maxDD:'-4%',orig:'$279.99',disc:'$209.99',featured:false}],
     'Legacy (Futures)':[{size:'25K',capital:'$25,000',goal:'$2,000',maxDD:'-4%',orig:'$79.99',disc:'$59.99',featured:false},{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'-4%',orig:'$149.99',disc:'$112.49',featured:true},{size:'100K',capital:'$100,000',goal:'$6,000',maxDD:'-4%',orig:'$249.99',disc:'$187.49',featured:false}]
   },
   buildUrl:(size,type,plat)=>'https://fundednext.com/?fpr=everton33'},
  {id:'e2t',name:'Earn2Trade',short:'E2T',coupon:'MARKETSCOUPONS',discount:'60%',color:'#F59E0B',bg:'rgba(245,158,11,0.12)',
   includes:['Free NinjaTrader/Finamark license','Free Journalytix license','Free reset when rebilled','Scaling up to $400K','Education catalog included'],
   types:['Trader Career Path','Gauntlet Mini'],platforms:['Rithmic','NinjaTrader','Finamark','Tradovate','TradingView'],
   plansByType:{
     'Trader Career Path':[{size:'TCP 25K',capital:'$25,000',goal:'$1,750',maxDD:'$1,500',orig:'$150',disc:'$60',featured:false},{size:'TCP 50K',capital:'$50,000',goal:'$3,000',maxDD:'$2,000',orig:'$190',disc:'$76',featured:false},{size:'TCP 100K',capital:'$100,000',goal:'$6,000',maxDD:'$3,500',orig:'$350',disc:'$140',featured:true}],
     'Gauntlet Mini':[{size:'GAU 50K',capital:'$50,000',goal:'$3,000',maxDD:'$2,000',orig:'$170',disc:'$68',featured:false},{size:'GAU 100K',capital:'$100,000',goal:'$6,000',maxDD:'$3,500',orig:'$315',disc:'$126',featured:true},{size:'GAU 150K',capital:'$150,000',goal:'$9,000',maxDD:'$4,500',orig:'$375',disc:'$150',featured:false},{size:'GAU 200K',capital:'$200,000',goal:'$12,000',maxDD:'$5,000',orig:'$550',disc:'$220',featured:false}]
   },
   buildUrl:(size,type,plat)=>{const m={'TCP 25K':'TCP25','TCP 50K':'TCP50','TCP 100K':'TCP100','GAU 50K':'GML50','GAU 100K':'GML100','GAU 150K':'GML150','GAU 200K':'GML200'};const plan=m[size]||'TCP25';const aBid=plan.startsWith('GML')?'fcc26bfd':'2e8e8a14';return`https://www.earn2trade.com/purchase?plan=${plan}&a_pid=marketscoupons&a_bid=${aBid}&discount=MARKETSCOUPONS`;}},
  {id:'the5ers',name:'The5ers',short:'The5ers',coupon:null,discount:'0%',color:'#10B981',bg:'rgba(16,185,129,0.12)',
   includes:['Scale up to $4M','Up to 100% profit split','No time limit','Since 2016','24/7 support','Multi-currency: USD/EUR/GBP'],
   types:['Hyper Growth','Pro Growth','High Stakes','Bootcamp','Futures Basecamp','Futures Rebate'],platforms:['MT5','TradingView','Rithmic'],
   plansByType:{
     'Hyper Growth':[{size:'$5K',capital:'$5,000',goal:'$500',maxDD:'-10%',orig:'—',disc:'$39',featured:false},{size:'$10K',capital:'$10,000',goal:'$1,000',maxDD:'-10%',orig:'—',disc:'$85',featured:false},{size:'$20K',capital:'$20,000',goal:'$2,000',maxDD:'-10%',orig:'—',disc:'$175',featured:true}],
     'Pro Growth':[{size:'$5K',capital:'$5,000',goal:'$500',maxDD:'-6%',orig:'—',disc:'$74',featured:false},{size:'$10K',capital:'$10,000',goal:'$1,000',maxDD:'-6%',orig:'—',disc:'$140',featured:false},{size:'$20K',capital:'$20,000',goal:'$2,000',maxDD:'-6%',orig:'—',disc:'$270',featured:true}],
     'High Stakes':[{size:'$2.5K',capital:'$2,500',goal:'$250',maxDD:'-3%',orig:'—',disc:'$19',featured:false},{size:'$5K',capital:'$5,000',goal:'$500',maxDD:'-3%',orig:'—',disc:'$39',featured:false},{size:'$10K',capital:'$10,000',goal:'$1,000',maxDD:'-3%',orig:'—',disc:'$75',featured:false},{size:'$25K',capital:'$25,000',goal:'$2,500',maxDD:'-3%',orig:'—',disc:'$175',featured:true},{size:'$50K',capital:'$50,000',goal:'$5,000',maxDD:'-3%',orig:'—',disc:'$315',featured:false},{size:'$100K',capital:'$100,000',goal:'$10,000',maxDD:'-3%',orig:'—',disc:'$575',featured:false}],
     'Bootcamp':[{size:'$20K',capital:'$20,000',goal:'$1,500',maxDD:'-5%',orig:'—',disc:'$22',featured:false},{size:'$100K',capital:'$100,000',goal:'$6,000',maxDD:'-5%',orig:'—',disc:'$99',featured:true},{size:'$250K',capital:'$250,000',goal:'$15,000',maxDD:'-5%',orig:'—',disc:'$225',featured:false}],
     'Futures Basecamp':[{size:'$25K',capital:'$25,000',goal:'$1,500',maxDD:'-4%',orig:'—',disc:'$50',featured:false},{size:'$50K',capital:'$50,000',goal:'$3,000',maxDD:'-4%',orig:'—',disc:'$99',featured:true}],
     'Futures Rebate':[{size:'$25K',capital:'$25,000',goal:'$1,500',maxDD:'-4%',orig:'—',disc:'$150',featured:false},{size:'$50K',capital:'$50,000',goal:'$3,000',maxDD:'-4%',orig:'—',disc:'$299',featured:true}]
   },
   buildUrl:(size,type,plat)=>'https://www.the5ers.com/?afmc=19jp'},
  {id:'fundingpips',name:'Funding Pips',short:'FundingPips',coupon:'HELLO',discount:'20%',color:'#6366F1',bg:'rgba(99,102,241,0.12)',
   includes:['Up to 100% profit split','Weekly/Bi-weekly/On Demand payouts','Leverage up to 1:100','No time limit','Swap Free add-on (+10%)'],
   types:['Zero','1-Step','2-Step','Pro'],platforms:['MT5','Match-Trader','cTrader'],
   plansByType:{
     'Zero':[{size:'$5K',capital:'$5,000',goal:'—',maxDD:'-5%',orig:'$69',disc:'$55.20',featured:false},{size:'$10K',capital:'$10,000',goal:'—',maxDD:'-5%',orig:'$99',disc:'$79.20',featured:false},{size:'$25K',capital:'$25,000',goal:'—',maxDD:'-5%',orig:'$199',disc:'$159.20',featured:false},{size:'$50K',capital:'$50,000',goal:'—',maxDD:'-5%',orig:'$299',disc:'$239.20',featured:true},{size:'$100K',capital:'$100,000',goal:'—',maxDD:'-5%',orig:'$499',disc:'$399.20',featured:false},{size:'$200K',capital:'$200,000',goal:'—',maxDD:'-5%',orig:'$998',disc:'$798.40',featured:false}],
     '1-Step':[{size:'$5K',capital:'$5,000',goal:'$500',maxDD:'-5%',orig:'$59',disc:'$47.20',featured:false},{size:'$10K',capital:'$10,000',goal:'$1,000',maxDD:'-5%',orig:'$99',disc:'$79.20',featured:false},{size:'$25K',capital:'$25,000',goal:'$2,500',maxDD:'-5%',orig:'$199',disc:'$159.20',featured:false},{size:'$50K',capital:'$50,000',goal:'$5,000',maxDD:'-5%',orig:'$319',disc:'$255.20',featured:true},{size:'$100K',capital:'$100,000',goal:'$10,000',maxDD:'-5%',orig:'$555',disc:'$444',featured:false}],
     '2-Step':[{size:'$5K',capital:'$5,000',goal:'$400',maxDD:'-5%',orig:'$36',disc:'$28.80',featured:false},{size:'$10K',capital:'$10,000',goal:'$800',maxDD:'-5%',orig:'$66',disc:'$52.80',featured:false},{size:'$25K',capital:'$25,000',goal:'$2,000',maxDD:'-5%',orig:'$156',disc:'$124.80',featured:false},{size:'$50K',capital:'$50,000',goal:'$4,000',maxDD:'-5%',orig:'$289',disc:'$231.20',featured:true},{size:'$100K',capital:'$100,000',goal:'$8,000',maxDD:'-5%',orig:'$529',disc:'$423.20',featured:false}],
     'Pro':[{size:'$5K',capital:'$5,000',goal:'$500',maxDD:'-3%',orig:'$29',disc:'$23.20',featured:false},{size:'$10K',capital:'$10,000',goal:'$1,000',maxDD:'-3%',orig:'$55',disc:'$44',featured:false},{size:'$25K',capital:'$25,000',goal:'$2,500',maxDD:'-3%',orig:'$109',disc:'$87.20',featured:false},{size:'$50K',capital:'$50,000',goal:'$5,000',maxDD:'-3%',orig:'$219',disc:'$175.20',featured:true},{size:'$100K',capital:'$100,000',goal:'$10,000',maxDD:'-3%',orig:'$399',disc:'$319.20',featured:false},{size:'$200K',capital:'$200,000',goal:'$20,000',maxDD:'-3%',orig:'$798',disc:'$638.40',featured:false}]
   },
   buildUrl:(size,type,plat)=>'https://app.fundingpips.com/register?ref=31985EAA'},
  {id:'brightfunded',name:'BrightFunded',short:'BrightFunded',coupon:'CLNLTPxtT4Sok0PzHaRIIQ',discount:'25%',color:'#00C9A7',bg:'rgba(0,201,167,0.12)',
   includes:['Up to 100% profit split','Static drawdown','Guaranteed 24h payout (7-day cycle)','15% profit in challenge phase','Trade2Earn loyalty program','Leverage 1:100','24/7 support'],
   types:['2-Step'],platforms:['MT5','DXtrade','cTrader'],
   plansByType:{
     '2-Step':[{size:'5K',capital:'€5,000',goal:'€400',maxDD:'-10%',orig:'€55',disc:'€41.25',featured:false},{size:'10K',capital:'€10,000',goal:'€800',maxDD:'-10%',orig:'€95',disc:'€71.25',featured:false},{size:'25K',capital:'€25,000',goal:'€2,000',maxDD:'-10%',orig:'€195',disc:'€146.25',featured:false},{size:'50K',capital:'€50,000',goal:'€4,000',maxDD:'-10%',orig:'€295',disc:'€221.25',featured:true},{size:'100K',capital:'€100,000',goal:'€8,000',maxDD:'-10%',orig:'€495',disc:'€371.25',featured:false},{size:'200K',capital:'€200,000',goal:'€16,000',maxDD:'-10%',orig:'€975',disc:'€731.25',featured:false}]
   },
   buildUrl:(size,type,plat)=>'https://brightfunded.com/a/CLNLTPxtT4Sok0PzHaRIIQ'},
  {id:'e8',name:'E8 Markets',short:'E8',coupon:'MARKET',discount:'10%',color:'#FF4400',bg:'rgba(255,68,0,0.12)',
   includes:['No activation fee','Pass in 1 day','Forex, Futures and Crypto','Configurable drawdown 4-14%','Split up to 100%','$70M+ paid since 2021'],
   types:['Signature','E8 One'],platforms:['MT5','Match-Trader'],
   plansByType:{
     'Signature':[{size:'$25K',capital:'$25,000',goal:'$1,500',maxDD:'-3% EOD',orig:'$110',disc:'$99',featured:false},{size:'$50K',capital:'$50,000',goal:'$3,000',maxDD:'-3% EOD',orig:'$150',disc:'$135',featured:false},{size:'$100K',capital:'$100,000',goal:'$6,000',maxDD:'-3% EOD',orig:'$260',disc:'$234',featured:true},{size:'$150K',capital:'$150,000',goal:'$9,000',maxDD:'-3% EOD',orig:'$390',disc:'$351',featured:false}],
     'E8 One':[{size:'$5K',capital:'$5,000',goal:'$450',maxDD:'-6%',orig:'$60',disc:'$54',featured:false},{size:'$10K',capital:'$10,000',goal:'$900',maxDD:'-6%',orig:'$90',disc:'$81',featured:false},{size:'$25K',capital:'$25,000',goal:'$2,250',maxDD:'-6%',orig:'$170',disc:'$153',featured:false},{size:'$50K',capital:'$50,000',goal:'$4,500',maxDD:'-6%',orig:'$260',disc:'$234',featured:false},{size:'$100K',capital:'$100,000',goal:'$9,000',maxDD:'-6%',orig:'$488',disc:'$439.20',featured:true},{size:'$200K',capital:'$200,000',goal:'$18,000',maxDD:'-6%',orig:'$929',disc:'$836.10',featured:false},{size:'$400K',capital:'$400,000',goal:'$36,000',maxDD:'-6%',orig:'$1,799',disc:'$1,619.10',featured:false},{size:'$500K',capital:'$500,000',goal:'$45,000',maxDD:'-6%',orig:'$2,299',disc:'$2,069.10',featured:false}]
   },
   buildUrl:(size,type,plat)=>'https://e8markets.com/d/MARKET'},
  {id:'cti',name:'City Traders Imperium',short:'CTI',coupon:'APR30',discount:'30%',color:'#0A74DA',bg:'rgba(10,116,218,0.12)',
   includes:['5 evaluation programs','Up to 100% profit share','CTI Academy Access','No time limit','3-Step starts at $1','Instant funding available'],
   types:['1-Step','2-Step','3-Step (Direct)','Instant Funding','Pro Trader'],platforms:['Match-Trader'],
   plansByType:{
     '1-Step':[{size:'$2.5K',capital:'$2,500',goal:'$200',maxDD:'-5%',orig:'$35',disc:'$27',featured:false},{size:'$5K',capital:'$5,000',goal:'$400',maxDD:'-5%',orig:'$59',disc:'$41',featured:false},{size:'$10K',capital:'$10,000',goal:'$800',maxDD:'-5%',orig:'$109',disc:'$76',featured:false},{size:'$25K',capital:'$25,000',goal:'$2,000',maxDD:'-5%',orig:'$199',disc:'$139',featured:true},{size:'$50K',capital:'$50,000',goal:'$4,000',maxDD:'-5%',orig:'$399',disc:'$280',featured:false},{size:'$100K',capital:'$100,000',goal:'$8,000',maxDD:'-5%',orig:'$589',disc:'$412',featured:false}],
     '2-Step':[{size:'$2.5K',capital:'$2,500',goal:'$200',maxDD:'-10%',orig:'$49',disc:'$34',featured:false},{size:'$5K',capital:'$5,000',goal:'$400',maxDD:'-10%',orig:'$69',disc:'$48',featured:false},{size:'$10K',capital:'$10,000',goal:'$800',maxDD:'-10%',orig:'$139',disc:'$97',featured:false},{size:'$25K',capital:'$25,000',goal:'$2,000',maxDD:'-10%',orig:'$249',disc:'$174',featured:true},{size:'$50K',capital:'$50,000',goal:'$4,000',maxDD:'-10%',orig:'$449',disc:'$314',featured:false},{size:'$100K',capital:'$100,000',goal:'$8,000',maxDD:'-10%',orig:'$689',disc:'$482',featured:false}],
     '3-Step (Direct)':[{size:'$2.5K',capital:'$2,500',goal:'$200',maxDD:'-10%',orig:'—',disc:'$1',featured:false},{size:'$5K',capital:'$5,000',goal:'$400',maxDD:'-10%',orig:'—',disc:'$2',featured:false},{size:'$10K',capital:'$10,000',goal:'$800',maxDD:'-10%',orig:'—',disc:'$4',featured:false},{size:'$25K',capital:'$25,000',goal:'$2,000',maxDD:'-10%',orig:'—',disc:'$10',featured:true},{size:'$50K',capital:'$50,000',goal:'$4,000',maxDD:'-10%',orig:'—',disc:'$20',featured:false},{size:'$100K',capital:'$100,000',goal:'$8,000',maxDD:'-10%',orig:'—',disc:'$40',featured:false}],
     'Instant Funding':[{size:'$2.5K',capital:'$2,500',goal:'—',maxDD:'-5%',orig:'$89',disc:'$62',featured:false},{size:'$5K',capital:'$5,000',goal:'—',maxDD:'-5%',orig:'$159',disc:'$111',featured:false},{size:'$10K',capital:'$10,000',goal:'—',maxDD:'-5%',orig:'$309',disc:'$216',featured:false},{size:'$20K',capital:'$20,000',goal:'—',maxDD:'-5%',orig:'$559',disc:'$391',featured:true},{size:'$40K',capital:'$40,000',goal:'—',maxDD:'-5%',orig:'$1,059',disc:'$741',featured:false},{size:'$80K',capital:'$80,000',goal:'—',maxDD:'-5%',orig:'$1,879',disc:'$1,315',featured:false}],
     'Pro Trader':[{size:'$5K',capital:'$5,000',goal:'—',maxDD:'-3%',orig:'$329',disc:'$263',featured:false},{size:'$10K',capital:'$10,000',goal:'—',maxDD:'-3%',orig:'$659',disc:'$527',featured:false},{size:'$20K',capital:'$20,000',goal:'—',maxDD:'-3%',orig:'$1,319',disc:'$1,055',featured:true},{size:'$40K',capital:'$40,000',goal:'—',maxDD:'-3%',orig:'$2,639',disc:'$2,111',featured:false},{size:'$80K',capital:'$80,000',goal:'—',maxDD:'-3%',orig:'$5,279',disc:'$4,223',featured:false}]
   },
   buildUrl:(size,type,plat)=>'https://app.citytradersimperium.com/user-auth/register?referral_code=1331c5&utm_source=client&utm_medium=referral&utm_id=1331c5'},
  {id:'tradeday',name:'TradeDay',short:'TradeDay',coupon:'SAVE30',discount:'30%',color:'#0EA5E9',bg:'rgba(14,165,233,0.12)',
   includes:['No consistency rule','Day 1 payouts','Keep up to 95% profit split','No activation fee with SAVE30','Futures only (CME, CBOT, NYMEX, COMEX)','24/7 support'],
   types:['Intraday','EOD','Static'],platforms:['NinjaTrader','Tradovate','TradingView','Jigsaw'],
   plansByType:{
     'Intraday':[{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'$2,000 trail',orig:'$125',disc:'$87.50',featured:false},{size:'100K',capital:'$100,000',goal:'$6,000',maxDD:'$3,000 trail',orig:'$200',disc:'$140',featured:true},{size:'150K',capital:'$150,000',goal:'$9,000',maxDD:'$4,000 trail',orig:'$300',disc:'$210',featured:false}],
     'EOD':[{size:'50K',capital:'$50,000',goal:'$3,000',maxDD:'$2,000 EOD',orig:'$175',disc:'$122.50',featured:false},{size:'100K',capital:'$100,000',goal:'$6,000',maxDD:'$3,000 EOD',orig:'$275',disc:'$192.50',featured:true},{size:'150K',capital:'$150,000',goal:'$9,000',maxDD:'$4,000 EOD',orig:'$375',disc:'$262.50',featured:false}],
     'Static':[{size:'50K',capital:'$50,000',goal:'$1,500',maxDD:'$500 static',orig:'$165',disc:'$115.50',featured:false},{size:'100K',capital:'$100,000',goal:'$2,500',maxDD:'$750 static',orig:'$250',disc:'$175',featured:true},{size:'150K',capital:'$150,000',goal:'$3,750',maxDD:'$1,000 static',orig:'$350',disc:'$245',featured:false}]
   },
   buildUrl:(size,type,plat)=>'https://www.tradeday.com/?a_aid=marketscoupons'}
];

let achActiveFirm='apex';
let achActiveType={};
const achState={};
function _achGetPlans(f){if(f.plansByType)return f.plansByType[achActiveType[f.id]||f.types[0]]||[];return f.plans||[];}
function _achAllPlans(f){if(f.plansByType){let a=[];Object.values(f.plansByType).forEach(ps=>a.push(...ps));return a;}return f.plans||[];}
CHECKOUT_FIRMS.forEach(f=>{achActiveType[f.id]=f.types[0];achState[f.id]={};_achAllPlans(f).forEach(p=>{achState[f.id][p.size]={type:f.types[0],plat:f.platforms[0]};});});

/* ── SUPABASE: Load firms dynamically (overwrites hardcoded arrays) ── */
async function loadFirmsFromSupabase() {
  try {
    const { data, error } = await db.from('cms_firms')
      .select('id,name,type,color,bg,icon,icon_url,rating,reviews,discount,discount_type,coupon,link,tags,platforms,min_days,eval_days,drawdown,split,dd_pct,target,scaling,prices,price_types,perks,proibido,description,trustpilot_url,trustpilot_score,trustpilot_reviews,sort_order,badge,news_trading,day1_payout,short_name,checkout_types,checkout_platforms,checkout_plans,checkout_url_template,checkout_includes,leverage,consistency,payout_speed,max_accounts,promo_ends_at,show_promo_on_checkout,has_activation_fee')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error || !data || !data.length) {
      // Fallback: try localStorage cache
      const cached = localStorage.getItem('mc_firms_cache_v7');
      if (cached && FIRMS.length === 0) {
        try { const arr = JSON.parse(cached); arr.forEach(f => FIRMS.push(f)); } catch(e){}
      }
      return;
    }
    // Include promo column in SELECT result (already fetched above since we used named cols)

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
        hasActivationFee: f.has_activation_fee !== false,
        leverage: f.leverage || null,
        consistency: f.consistency || null,
        payoutSpeed: f.payout_speed || null,
        maxAccounts: f.max_accounts || null,
        promo_ends_at: f.promo_ends_at || null,
        show_promo_on_checkout: f.show_promo_on_checkout || false,
      };
      if (f.trustpilot_url) {
        firm.trustpilot = { score: parseFloat(f.trustpilot_score)||firm.rating, reviews: parseInt(f.trustpilot_reviews)||firm.reviews, url: f.trustpilot_url };
      }
      FIRMS.push(firm);

      // Overlay data (about_html, detail_plans, bg_image) loaded lazily via loadFirmOverlayData()
    });

    // Sync non-price CHECKOUT_FIRMS fields (discount label, coupon, platforms)
    // Prices are NOT synced in-place anymore — getPlanPrice() reads from FIRMS[].prices
    // on each render, avoiding race conditions and stale-overwrite bugs.
    CHECKOUT_FIRMS.forEach(cf => {
      const firm = FIRMS.find(x => x.id === cf.id);
      if (!firm) return;
      cf.discount = firm.discount + '%';
      cf.coupon = firm.coupon || null;
      cf.platforms = firm.platforms || cf.platforms;
    });

    // Rebuild achState for new firms
    CHECKOUT_FIRMS.forEach(f => {
      achState[f.id] = {};
      achActiveType[f.id] = f.types[0] || '';
      _achAllPlans(f).forEach(p => {
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

    // Cache firms in localStorage for offline fallback
    try { localStorage.setItem('mc_firms_cache_v7', JSON.stringify(FIRMS)); } catch(e){}

    // Retry opening firm overlay if dedicated page loaded before FIRMS arrived
    if(window._dedicatedFirmSlug && !document.getElementById('fd-overlay')?.classList.contains('show') && !document.getElementById('drw')?.classList.contains('open')){
      openD(window._dedicatedFirmSlug);
      document.body.style.opacity='1';
    }
  } catch(e) {
    // Supabase unavailable — try localStorage cache
    console.warn('[MC] Supabase firms unavailable, trying cache');
    const cached = localStorage.getItem('mc_firms_cache_v7');
    if (cached && FIRMS.length === 0) {
      try { const arr = JSON.parse(cached); arr.forEach(f => FIRMS.push(f)); } catch(e2){}
    }
  }
}

async function loadCmsTexts(){
  try{
    const{data}=await db.from('cms_texts').select('key,"values"');
    if(data) data.forEach(r=>{ _cmsTexts[r.key]=r.values; });
  }catch(e){}
}

/* ─── Load I18N overrides from Supabase ─── */
async function loadI18nFromSupabase(){
  try{
    const{data,error}=await db.from('i18n').select('key,pt,en,es,fr,it,de,ar');
    if(error||!data||!data.length){
      const cached=localStorage.getItem('mc_i18n_cache');
      if(cached){try{const d=JSON.parse(cached);_applyI18nRows(d);}catch(e){}}
      return;
    }
    _applyI18nRows(data);
    try{localStorage.setItem('mc_i18n_cache',JSON.stringify(data));}catch(e){}
  }catch(e){
    const cached=localStorage.getItem('mc_i18n_cache');
    if(cached){try{_applyI18nRows(JSON.parse(cached));}catch(e2){}}
  }
}
function _applyI18nRows(rows){
  const langs=['pt','en','es','fr','it','de','ar'];
  rows.forEach(r=>{
    langs.forEach(l=>{
      if(r[l]!=null && typeof I18N[l]==='object') I18N[l][r.key]=r[l];
    });
  });
}

/* ─── Load FIRM_T overrides from Supabase ─── */
async function loadFirmTFromSupabase(){
  try{
    const{data,error}=await db.from('firm_translations').select('key,en,es,fr,it,de,ar');
    if(error||!data||!data.length){
      const cached=localStorage.getItem('mc_firmt_cache');
      if(cached){try{_applyFirmTRows(JSON.parse(cached));}catch(e){}}
      return;
    }
    _applyFirmTRows(data);
    try{localStorage.setItem('mc_firmt_cache',JSON.stringify(data));}catch(e){}
  }catch(e){
    const cached=localStorage.getItem('mc_firmt_cache');
    if(cached){try{_applyFirmTRows(JSON.parse(cached));}catch(e2){}}
  }
}
function _applyFirmTRows(rows){
  const langs=['en','es','fr','it','de','ar'];
  rows.forEach(r=>{
    FIRM_T[r.key]=langs.map(l=>r[l]||'');
  });
}

let _cmsFaq=null;
async function loadCmsFaq(){
  try{
    const{data}=await db.from('cms_faq').select('*').eq('active',true).order('sort_order',{ascending:true});
    if(data&&data.length){
      _cmsFaq={};
      const langs=['pt','en','es','it','fr','de','ar'];
      langs.forEach(l=>{ _cmsFaq[l]=data.map(r=>({q:r.question[l]||r.question.pt||'',a:r.answer[l]||r.answer.pt||''})).filter(x=>x.q); });
    }
  }catch(e){}
}

function renderAchFirmTabs(){
  const el=document.getElementById('ach-firm-tabs');if(!el)return;
  el.innerHTML=CHECKOUT_FIRMS.map(f=>`<button class="ach-firm-tab${f.id===achActiveFirm?' active':''}" onclick="achSelectFirm('${escHtml(f.id)}')">${escHtml(f.name)}<span class="tab-disc">${escHtml(f.discount)}</span></button>`).join('');
}
function achSelectFirm(id){
  const firmExists = CHECKOUT_FIRMS.find(f=>f.id===id);
  achActiveFirm = firmExists ? id : (CHECKOUT_FIRMS[0]?.id || id);
  track('checkout_firm_select',{firm_id:achActiveFirm});
  const firm=CHECKOUT_FIRMS.find(f=>f.id===achActiveFirm);if(!firm)return;
  if(!achActiveType[firm.id])achActiveType[firm.id]=firm.types[0];
  renderAchFirmTabs();
  renderAchTypeTabs();
  renderAchPlans();
  const ti=document.getElementById('ach-firm-title');if(ti)ti.textContent=firm.name;
  const strip=document.getElementById('ach-coupon-strip');
  if(strip){if(firm.coupon){strip.style.display='flex';const cd=document.getElementById('ach-code-display');if(cd)cd.textContent=firm.coupon;}else strip.style.display='none';}
}
function renderAchTypeTabs(){
  const firm=CHECKOUT_FIRMS.find(f=>f.id===achActiveFirm);if(!firm)return;
  const el=document.getElementById('ach-type-tabs');if(!el)return;
  if(firm.types.length<=1){el.style.display='none';return;}
  el.style.display='flex';
  const cur=achActiveType[firm.id]||firm.types[0];
  el.innerHTML=firm.types.map(tp=>`<button class="ach-type-tab${tp===cur?' active':''}" onclick="achSelectType('${firm.id}','${tp.replace(/'/g,"\\'")}')">${tp}</button>`).join('');
}
function achSelectType(fId,type){
  achActiveType[fId]=type;
  track('checkout_select',{firm_id:fId,field:'type',value:type});
  renderAchTypeTabs();
  renderAchPlans();
}
function renderAchPlans(){
  const firm=CHECKOUT_FIRMS.find(f=>f.id===achActiveFirm);if(!firm)return;
  const g=document.getElementById('ach-plans-grid');if(!g)return;
  const plans=_achGetPlans(firm);
  const curType=achActiveType[firm.id]||firm.types[0];
  g.innerHTML=plans.map(p=>{
    const state=(achState[firm.id]||{})[p.size]||{plat:firm.platforms[0]};
    const sid=p.size.replace(/[^a-z0-9]/gi,'_');
    // Supabase-first price lookup with hardcoded fallback
    const pp=getPlanPrice(firm.id, curType, p.size);
    const disc=pp.d||p.disc;
    const orig=pp.o||p.orig;
    return`<div class="ach-card${p.featured?' featured':''}">
      <div class="ach-card-header">
        ${p.featured?`<div class="ach-featured-badge">${t('ach_popular')}</div>`:''}
        <div class="ach-plan-name">${p.size}</div>
        <div class="ach-plan-price"><strong>${disc}</strong> ${t('ach_mes')} ${orig!=='—'?`<del>${orig}</del>`:''}</div>
        <div class="ach-stats">
          <div class="ach-stat"><div class="ach-stat-lbl">${t('ach_capital')}</div><div class="ach-stat-val">${p.capital}</div></div>
          <div class="ach-stat"><div class="ach-stat-lbl">${t('ach_meta')}</div><div class="ach-stat-val">${p.goal}</div></div>
          <div class="ach-stat"><div class="ach-stat-lbl">${t('ach_max_dd')}</div><div class="ach-stat-val">${p.maxDD}</div></div>
          <div class="ach-stat"><div class="ach-stat-lbl">${t('ach_desconto')}</div><div class="ach-stat-val" style="color:var(--gold);">${firm.discount}</div></div>
        </div>
      </div>
      <div class="ach-card-body">
        <div class="ach-sel-title">${t('ach_plataforma')}</div>
        <div class="ach-plat-row" id="pr-${firm.id}-${sid}">${firm.platforms.map(pl=>`<button class="ach-plat-btn${pl===state.plat?' sel':''}" onclick="achSelPlat('${firm.id}','${p.size}','${pl}')">${pl}</button>`).join('')}</div>
        <button class="ach-start-btn" onclick="achGoCheckout('${firm.id}','${p.size}')">${t('ach_comecar')}</button>
      </div>
    </div>`;
  }).join('');
  const inc=document.getElementById('ach-inc-grid');const incW=document.getElementById('ach-includes');
  if(inc&&incW){inc.innerHTML=firm.includes.map(i=>`<div class="ach-inc-item">${tf(i)}</div>`).join('');incW.style.display='block';}
}
function achSelType(fId,size,type){
  if(!achState[fId])achState[fId]={};
  if(!achState[fId][size])achState[fId][size]={type,plat:CHECKOUT_FIRMS.find(f=>f.id===fId)?.platforms[0]||''};
  achState[fId][size].type=type;
  const sid=size.replace(/[^a-z0-9]/gi,'_');
  document.getElementById('tr-'+fId+'-'+sid)?.querySelectorAll('.ach-type-btn').forEach(b=>b.classList.toggle('sel',b.textContent.trim()===type));
  track('checkout_select',{firm_id:fId,field:'type',value:type,size});
}
function achSelPlat(fId,size,plat){
  if(!achState[fId])achState[fId]={};
  if(!achState[fId][size])achState[fId][size]={type:CHECKOUT_FIRMS.find(f=>f.id===fId)?.types[0]||'',plat};
  achState[fId][size].plat=plat;
  const sid=size.replace(/[^a-z0-9]/gi,'_');
  document.getElementById('pr-'+fId+'-'+sid)?.querySelectorAll('.ach-plat-btn').forEach(b=>b.classList.toggle('sel',b.textContent.trim()===plat));
  track('checkout_select',{firm_id:fId,field:'platform',value:plat,size});
}
function achGoCheckout(fId,size){
  const firm=CHECKOUT_FIRMS.find(f=>f.id===fId);if(!firm)return;
  const state=(achState[fId]||{})[size]||{plat:firm.platforms[0]};
  const type=achActiveType[fId]||firm.types[0];
  const plat=state.plat||firm.platforms[0];
  let url=firm.buildUrl(size,type,plat);
  url = _appendQuery(url, 'utm_source=marketscoupons&utm_medium=checkout&utm_campaign='+fId+'_'+size.replace(/[^a-z0-9]/gi,'_').toLowerCase());
  const _src=window._dedicatedFirmSlug?'dedicated':'homepage';
  {const _f=FIRMS.find(x=>x.id===fId);track('checkout_click',{firm_id:fId,firm_name:firm.name,account_size:size,platform:plat,type,coupon:firm.coupon||'parceiro',source:_src,value:_fbVal(_f,size),currency:'USD'});}
  registerLoyaltyClick(size,plat,type,firm.name);
  mcOpenFirm(fId, url, firm.coupon, firm.name);
}
function achCopyCoupon(){const firm=CHECKOUT_FIRMS.find(f=>f.id===achActiveFirm);if(!firm?.coupon)return;navigator.clipboard.writeText(firm.coupon).then(()=>{const _src=window._dedicatedFirmSlug?'dedicated':'homepage';showToast(t('toast_cupom_copiado').replace('{code}',firm.coupon));const _f=FIRMS.find(x=>x.id===achActiveFirm);track('coupon_copy',{coupon_code:firm.coupon,firm_id:achActiveFirm,firm_name:_f?.name||achActiveFirm,value:_fbVal(_f),location:'checkout_header',source:_src});});}

/* COMPARE */
function initCmp(){['c1','c2','c3'].forEach(id=>{const sel=document.getElementById(id);if(!sel)return;FIRMS.forEach(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=f.name;sel.appendChild(o);});});}
function renderCmp(){
  const ids=['c1','c2','c3'].map(id=>document.getElementById(id)?.value).filter(Boolean);
  const sel=ids.map(id=>FIRMS.find(f=>f.id===id)).filter(Boolean);
  if(sel.length>=2) track('compare_firms',{firms:sel.map(f=>f.id).join(','),count:sel.length});
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
  // Removido fbq Lead + gtag generate_lead — tool unlock NÃO é candidato a compra.
  // Inflava denominador Lead ~30x (4994 leads vs 160 IC) tanto em Meta quanto GA4.
  // Evento interno calc_unlocked segue rastreado em Supabase pra analytics próprios.
}
function calcPS(){
  const bal=parseFloat(document.getElementById('ps-bal')?.value)||0;const risk=parseFloat(document.getElementById('ps-risk')?.value)||0;const ent=parseFloat(document.getElementById('ps-ent')?.value)||0;const sl=parseFloat(document.getElementById('ps-sl')?.value)||0;const tp=parseFloat(document.getElementById('ps-tp')?.value)||0;const mult=parseFloat(document.getElementById('ps-instr')?.value)||50;
  const riskD=bal*(risk/100);const slPts=Math.abs(ent-sl);const contracts=slPts>0?Math.floor(riskD/(slPts*mult)):0;const actRisk=contracts*slPts*mult;const tpPts=tp>0?Math.abs(tp-ent):0;const profit=contracts*tpPts*mult;const rr=tpPts>0&&slPts>0?(tpPts/slPts).toFixed(2):'—';
  document.getElementById('r-ct').textContent=contracts||'—';document.getElementById('r-rs').textContent=actRisk?'$'+actRisk.toFixed(0):'—';document.getElementById('r-rr').textContent=rr!=='—'?'1:'+rr:'—';document.getElementById('r-lp').textContent=profit?'$'+profit.toFixed(0):'—';
}

/* QUIZ */
let qA={},qStep=0;
function qa(btn,val){btn.closest('.q-opts').querySelectorAll('.q-opt').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');qA[qStep]=val;track('quiz_answer',{step:qStep,answer:val});}
function qnext(n){document.getElementById('qs'+qStep).classList.remove('active');qStep=n;document.getElementById('qs'+n).classList.add('active');track('quiz_step',{step:n});}
function qfinish(){
  setTimeout(()=>{
    document.getElementById('qs4').classList.remove('active');document.getElementById('qs-res').classList.add('active');
    const market=qA[0]||'futures';const budget=qA[1]||'medium';const exp=qA[2]||'beginner';const dd=qA[3]||'any';const priority=qA[4]||'discount';
    const scores={};
    FIRMS.forEach(f=>{
      let s=0;
      if(market==='forex'&&f.type==='Forex')s+=3; else if(market==='forex'&&f.type!=='Forex')s-=2;
      if(market==='futures'&&(f.type==='Futuros'||f.tags?.includes('Futuros')))s+=3; else if(market==='futures'&&f.type==='Forex'&&!f.tags?.includes('Futuros'))s-=2;
      if(market==='both')s+=1;
      if(budget==='low'){const cheapest=f.prices?.[0];if(cheapest){const p=parseFloat(String(cheapest.n).replace(/[^0-9.]/g,''));if(p&&p<30)s+=2;else if(p&&p<60)s+=1;}}
      if(budget==='high'&&f.scaling)s+=1;
      if(exp==='beginner'){if(f.id==='ftmo'||f.id==='e2t')s+=2;if(f.minDays<=1)s+=1;}
      if(exp==='advanced'&&f.scaling)s+=1;
      if(dd==='trailing'&&f.drawdown?.includes('Trail'))s+=2; else if(dd==='static'&&(f.drawdown?.includes('Static')||f.drawdown?.includes('Fixed')))s+=2; else if(dd==='eod'&&f.drawdown?.includes('EOD'))s+=2;
      if(priority==='discount')s+=Math.min(f.discount/20,5);
      if(priority==='split'){const sp=parseInt(f.split);if(sp>=100)s+=3;else if(sp>=95)s+=2;else if(sp>=90)s+=1;}
      if(priority==='speed'){if(f.day1Payout)s+=2;if(f.minDays<=1)s+=2;if(f.payoutSpeed==='fast')s+=1;}
      if(priority==='rules'){if(f.newsTrading)s+=1;if(!f.consistency||f.consistency==='Não')s+=1;if(f.minDays<=1)s+=1;}
      scores[f.id]=s;
    });
    const sorted=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    let rec=FIRMS.find(f=>f.id===sorted[0][0]);
    if(!rec)rec=FIRMS[0];
    if(!rec)return;
    document.getElementById('q-res-content').innerHTML=`<div class="qr-title">${t('quiz_resultado_firma_ideal')} <span style="display:inline-flex;align-items:center;gap:8px;vertical-align:middle;color:${rec.color};">${firmIco(rec,'28px','11px')} ${rec.name}</span></div><div class="qr-desc">${(I18N[_currentLang]?.['firm_desc_'+rec.id]||I18N.pt['firm_desc_'+rec.id]||rec.desc||'')}</div><div style="display:flex;gap:12px;justify-content:center;margin-top:8px;width:100%;max-width:360px;margin-left:auto;margin-right:auto;"><a href="${rec.link}" target="_blank" style="text-decoration:none;display:flex;flex:1;"><button class="btn-gold" style="width:100%;white-space:nowrap;">${t('quiz_comecar_agora')}</button></a><button class="q-restart" style="flex:1;white-space:nowrap;" onclick="qreset()">${t('quiz_recomecar')}</button></div>`;
    track('quiz_complete',{recommended_firm:rec.id,market_pref:market,priority});
    // Removido fbq Lead — quiz não indica intenção de compra. Inflava denominador.
  },300);
}
function qreset(){qA={};qStep=0;renderQuiz();track('quiz_reset');}

/* PLATAFORMAS DE TRADING */
const PLATFORMS_LANGS = {
  pt: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: '/img/Plataformas/icone tradingview.webp', type: 'Gráficos & Análise',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'plano anual', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'A plataforma de gráficos mais usada do mundo. Acesso a dados de futuros, forex, ações e cripto. Indicadores profissionais, alertas e comunidade de traders. <strong style="color:var(--gold);">Receba $15 assim que você adquirir sua primeira assinatura.</strong>',
      features: ['Gráficos avançados','Indicadores personalizados','Alertas em tempo real','Scripts Pine','Screener de ativos','Dados de múltiplos mercados'],
      highlight: true, badge: '17% OFF Anual',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: '/img/Plataformas/icone rithmic.webp', type: 'Execução de Ordens',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Feed de dados e execução de ordens de baixa latência para futuros. Padrão da indústria de prop firms (Apex, Bulenox, E2T).',
      features: ['Ultra baixa latência','Dados CME/CBOT/NYMEX','Order Routing','API para automação','Suporte 24/7'],
      highlight: false, badge: 'Padrão Prop Firms',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: '/img/Plataformas/icone ninjatrader.webp', type: 'Plataforma de Trading',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Plataforma gratuita para futuros com backtesting avançado, automação e marketplace de indicadores. Aceita pela maioria das prop firms.',
      features: ['Grátis para dados EOD','Backtesting avançado','Automação (NinjaScript)','Marketplace indicadores','Multi-broker'],
      highlight: false, badge: 'Grátis disponível',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: '/img/Plataformas/tradovate.webp', type: 'Plataforma de Trading',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Plataforma baseada em nuvem para futuros. Excelente interface, dados integrados e suporte a múltiplos dispositivos.',
      features: ['Baseado em nuvem','Interface moderna','Dados integrados','Mobile app','DOM avançado'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: '/img/Plataformas/icone mt5.webp', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Plataforma padrão do mercado Forex. Indicadores técnicos, EAs, backtesting e suporte à maioria das prop firms de Forex.',
      features: ['100+ indicadores','Expert Advisors (EAs)','Strategy Tester','Múltiplos brokers','Mobile app'],
      highlight: false, badge: 'Padrão Forex',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: '/img/Plataformas/icone wealthcharts.webp', type: 'Gráficos & Análise',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Plataforma de gráficos e análise usada pela Apex Trader Funding. Copy trading, indicadores de order flow e análise de mercado.',
      features: ['Copy Trading Apex','Order Flow','Market Analysis','Indicadores premium','Integração Apex'],
      highlight: false, badge: 'Parceira Apex',
    },
  ],
  en: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: '/img/Plataformas/icone tradingview.webp', type: 'Charts & Analysis',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'annual plan', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'The world\'s most used charting platform. Access to futures, forex, stocks and crypto data. Professional indicators, alerts and trader community. <strong style="color:var(--gold);">Receive $15 when you get your first subscription.</strong>',
      features: ['Advanced charts','Custom indicators','Real-time alerts','Pine Scripts','Asset screener','Multi-market data'],
      highlight: true, badge: '17% OFF Annual',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: '/img/Plataformas/icone rithmic.webp', type: 'Order Execution',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Low-latency data feed and order execution for futures. Industry standard for prop firms (Apex, Bulenox, E2T).',
      features: ['Ultra-low latency','CME/CBOT/NYMEX data','Order Routing','Automation API','24/7 support'],
      highlight: false, badge: 'Prop Firms Standard',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: '/img/Plataformas/icone ninjatrader.webp', type: 'Trading Platform',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Free futures platform with advanced backtesting, automation and indicators marketplace. Accepted by most prop firms.',
      features: ['Free for EOD data','Advanced backtesting','Automation (NinjaScript)','Indicators marketplace','Multi-broker'],
      highlight: false, badge: 'Free available',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: '/img/Plataformas/tradovate.webp', type: 'Trading Platform',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Cloud-based futures platform. Excellent interface, integrated data and multi-device support.',
      features: ['Cloud-based','Modern interface','Integrated data','Mobile app','Advanced DOM'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: '/img/Plataformas/icone mt5.webp', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Standard Forex market platform. Technical indicators, EAs, backtesting and support for most Forex prop firms.',
      features: ['100+ indicators','Expert Advisors (EAs)','Strategy Tester','Multiple brokers','Mobile app'],
      highlight: false, badge: 'Forex Standard',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: '/img/Plataformas/icone wealthcharts.webp', type: 'Charts & Analysis',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Charting and analysis platform used by Apex Trader Funding. Copy trading, order flow indicators and market analysis.',
      features: ['Copy Trading Apex','Order Flow','Market Analysis','Premium indicators','Apex integration'],
      highlight: false, badge: 'Apex Partner',
    },
  ],
  es: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: '/img/Plataformas/icone tradingview.webp', type: 'Gráficos & Análisis',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'plan anual', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'La plataforma de gráficos más usada del mundo. Acceso a datos de futuros, forex, acciones y cripto. <strong style="color:var(--gold);">Recibe $15 al contratar tu primera suscripción.</strong>',
      features: ['Gráficos avanzados','Indicadores personalizados','Alertas en tiempo real','Scripts Pine','Screener de activos','Datos multi-mercado'],
      highlight: true, badge: '17% OFF Anual',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: '/img/Plataformas/icone rithmic.webp', type: 'Ejecución de Órdenes',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Feed de datos y ejecución de órdenes de baja latencia para futuros. Estándar de la industria de prop firms.',
      features: ['Ultra baja latencia','Datos CME/CBOT/NYMEX','Order Routing','API para automatización','Soporte 24/7'],
      highlight: false, badge: 'Estándar Prop Firms',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: '/img/Plataformas/icone ninjatrader.webp', type: 'Plataforma de Trading',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Plataforma gratuita para futuros con backtesting avanzado, automatización y marketplace de indicadores.',
      features: ['Gratis para datos EOD','Backtesting avanzado','Automatización (NinjaScript)','Marketplace indicadores','Multi-broker'],
      highlight: false, badge: 'Gratis disponible',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: '/img/Plataformas/tradovate.webp', type: 'Plataforma de Trading',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Plataforma en la nube para futuros. Excelente interfaz, datos integrados y soporte multi-dispositivo.',
      features: ['Basado en la nube','Interfaz moderna','Datos integrados','App móvil','DOM avanzado'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: '/img/Plataformas/icone mt5.webp', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Plataforma estándar del mercado Forex. Indicadores técnicos, EAs, backtesting y soporte para prop firms de Forex.',
      features: ['100+ indicadores','Expert Advisors (EAs)','Strategy Tester','Múltiples brokers','App móvil'],
      highlight: false, badge: 'Estándar Forex',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: '/img/Plataformas/icone wealthcharts.webp', type: 'Gráficos & Análisis',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Plataforma de gráficos y análisis usada por Apex. Copy trading, indicadores de order flow y análisis de mercado.',
      features: ['Copy Trading Apex','Order Flow','Análisis de mercado','Indicadores premium','Integración Apex'],
      highlight: false, badge: 'Socia de Apex',
    },
  ],
  it: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: '/img/Plataformas/icone tradingview.webp', type: 'Grafici & Analisi',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'piano annuale', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'La piattaforma di grafici più usata al mondo. Accesso a dati futures, forex, azioni e cripto. <strong style="color:var(--gold);">Ricevi $15 con il tuo primo abbonamento.</strong>',
      features: ['Grafici avanzati','Indicatori personalizzati','Avvisi in tempo reale','Script Pine','Screener di attivi','Dati multi-mercato'],
      highlight: true, badge: '17% OFF Annuale',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: '/img/Plataformas/icone rithmic.webp', type: 'Esecuzione Ordini',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Feed dati ed esecuzione ordini a bassa latenza per futures. Standard del settore prop firm.',
      features: ['Latenza ultra-bassa','Dati CME/CBOT/NYMEX','Order Routing','API automazione','Supporto 24/7'],
      highlight: false, badge: 'Standard Prop Firms',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: '/img/Plataformas/icone ninjatrader.webp', type: 'Piattaforma di Trading',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Piattaforma gratuita per futures con backtesting avanzato, automazione e marketplace di indicatori.',
      features: ['Gratis per dati EOD','Backtesting avanzato','Automazione (NinjaScript)','Marketplace indicatori','Multi-broker'],
      highlight: false, badge: 'Gratis disponibile',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: '/img/Plataformas/tradovate.webp', type: 'Piattaforma di Trading',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Piattaforma cloud per futures. Eccellente interfaccia, dati integrati e supporto multi-dispositivo.',
      features: ['Basato su cloud','Interfaccia moderna','Dati integrati','App mobile','DOM avanzato'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: '/img/Plataformas/icone mt5.webp', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Piattaforma standard del mercato Forex. Indicatori tecnici, EA, backtesting e supporto per prop firm Forex.',
      features: ['100+ indicatori','Expert Advisors (EAs)','Strategy Tester','Più broker','App mobile'],
      highlight: false, badge: 'Standard Forex',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: '/img/Plataformas/icone wealthcharts.webp', type: 'Grafici & Analisi',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Piattaforma di grafici e analisi usata da Apex. Copy trading, indicatori di order flow e analisi di mercato.',
      features: ['Copy Trading Apex','Order Flow','Analisi di mercato','Indicatori premium','Integrazione Apex'],
      highlight: false, badge: 'Partner Apex',
    },
  ],
  fr: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: '/img/Plataformas/icone tradingview.webp', type: 'Graphiques & Analyse',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'plan annuel', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'La plateforme de graphiques la plus utilisée au monde. Accès aux données futures, forex, actions et crypto. <strong style="color:var(--gold);">Recevez 15$ avec votre premier abonnement.</strong>',
      features: ['Graphiques avancés','Indicateurs personnalisés','Alertes en temps réel','Scripts Pine','Screener d\'actifs','Données multi-marchés'],
      highlight: true, badge: '17% OFF Annuel',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: '/img/Plataformas/icone rithmic.webp', type: 'Exécution d\'Ordres',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Flux de données et exécution d\'ordres à faible latence pour les futures. Standard de l\'industrie des prop firms.',
      features: ['Ultra faible latence','Données CME/CBOT/NYMEX','Order Routing','API d\'automatisation','Support 24/7'],
      highlight: false, badge: 'Standard Prop Firms',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: '/img/Plataformas/icone ninjatrader.webp', type: 'Plateforme de Trading',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Plateforme gratuite pour les futures avec backtesting avancé, automatisation et marketplace d\'indicateurs.',
      features: ['Gratuit pour données EOD','Backtesting avancé','Automatisation (NinjaScript)','Marketplace indicateurs','Multi-broker'],
      highlight: false, badge: 'Gratuit disponible',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: '/img/Plataformas/tradovate.webp', type: 'Plateforme de Trading',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Plateforme cloud pour les futures. Excellente interface, données intégrées et support multi-appareils.',
      features: ['Basé sur le cloud','Interface moderne','Données intégrées','App mobile','DOM avancé'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: '/img/Plataformas/icone mt5.webp', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Plateforme standard du marché Forex. Indicateurs techniques, EAs, backtesting et support pour les prop firms Forex.',
      features: ['100+ indicateurs','Expert Advisors (EAs)','Strategy Tester','Plusieurs courtiers','App mobile'],
      highlight: false, badge: 'Standard Forex',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: '/img/Plataformas/icone wealthcharts.webp', type: 'Graphiques & Analyse',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Plateforme de graphiques et d\'analyse utilisée par Apex. Copy trading, indicateurs de flux d\'ordres et analyse de marché.',
      features: ['Copy Trading Apex','Order Flow','Analyse de marché','Indicateurs premium','Intégration Apex'],
      highlight: false, badge: 'Partenaire Apex',
    },
  ],
  de: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: '/img/Plataformas/icone tradingview.webp', type: 'Charts & Analyse',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'Jahresplan', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'Die weltweit meistgenutzte Charting-Plattform. Zugang zu Futures-, Forex-, Aktien- und Krypto-Daten. <strong style="color:var(--gold);">Erhalte $15 mit deinem ersten Abonnement.</strong>',
      features: ['Erweiterte Charts','Benutzerdefinierte Indikatoren','Echtzeit-Benachrichtigungen','Pine Scripts','Asset Screener','Multi-Markt-Daten'],
      highlight: true, badge: '17% RABATT Jährlich',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: '/img/Plataformas/icone rithmic.webp', type: 'Orderausführung',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'Niedriglatenz-Datenfeed und Orderausführung für Futures. Branchenstandard für Prop Firms.',
      features: ['Ultra-niedrige Latenz','CME/CBOT/NYMEX-Daten','Order Routing','Automatisierungs-API','24/7 Support'],
      highlight: false, badge: 'Prop Firms Standard',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: '/img/Plataformas/icone ninjatrader.webp', type: 'Trading-Plattform',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'Kostenlose Futures-Plattform mit erweitertem Backtesting, Automatisierung und Indikator-Marktplatz.',
      features: ['Kostenlos für EOD-Daten','Erweitertes Backtesting','Automatisierung (NinjaScript)','Indikator-Marktplatz','Multi-broker'],
      highlight: false, badge: 'Kostenlos verfügbar',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: '/img/Plataformas/tradovate.webp', type: 'Trading-Plattform',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'Cloud-basierte Futures-Plattform. Exzellente Benutzeroberfläche, integrierte Daten und Multi-Device-Support.',
      features: ['Cloud-basiert','Moderne Oberfläche','Integrierte Daten','Mobile App','Erweitertes DOM'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: '/img/Plataformas/icone mt5.webp', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'Standard-Forex-Marktplattform. Technische Indikatoren, EAs, Backtesting und Unterstützung für Forex-Prop-Firms.',
      features: ['100+ Indikatoren','Expert Advisors (EAs)','Strategy Tester','Mehrere Broker','Mobile App'],
      highlight: false, badge: 'Forex-Standard',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: '/img/Plataformas/icone wealthcharts.webp', type: 'Charts & Analyse',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'WC',
      discount: 0, dtype: '', coupon: null, link: 'https://wealthcharts.com',
      desc: 'Chart- und Analyseplattform von Apex Trader Funding. Copy Trading, Order-Flow-Indikatoren und Marktanalyse.',
      features: ['Copy Trading Apex','Order Flow','Marktanalyse','Premium-Indikatoren','Apex-Integration'],
      highlight: false, badge: 'Apex-Partner',
    },
  ],
  ar: [
    {
      id: 'tradingview', name: 'TradingView', icon_url: '/img/Plataformas/icone tradingview.webp', type: 'الرسوم البيانية والتحليل',
      color: '#2962FF', bg: 'rgba(41,98,255,0.12)', icon: 'TV',
      discount: 17, dtype: 'خطة سنوية', coupon: null,
      link: 'https://tradingview.com/?aff_id=164855',
      desc: 'منصة الرسوم البيانية الأكثر استخداماً في العالم. وصول لبيانات العقود الآجلة والفوركس والأسهم والكريبتو. <strong style="color:var(--gold);">احصل على $15 مع أول اشتراك.</strong>',
      features: ['رسوم بيانية متقدمة','مؤشرات مخصصة','تنبيهات فورية','نصوص Pine','فاحص الأصول','بيانات متعددة الأسواق'],
      highlight: true, badge: '17% خصم سنوي',
    },
    {
      id: 'rithmic', name: 'Rithmic', icon_url: '/img/Plataformas/icone rithmic.webp', type: 'تنفيذ الأوامر',
      color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: 'R',
      discount: 0, dtype: '', coupon: null, link: 'https://rithmic.com',
      desc: 'تغذية بيانات وتنفيذ أوامر منخفض الكمون للعقود الآجلة. معيار صناعة شركات Prop.',
      features: ['كمون منخفض جداً','بيانات CME/CBOT/NYMEX','توجيه الأوامر','واجهة برمجية للأتمتة','دعم 24/7'],
      highlight: false, badge: 'معيار Prop Firms',
    },
    {
      id: 'ninjatrader', name: 'NinjaTrader', icon_url: '/img/Plataformas/icone ninjatrader.webp', type: 'منصة تداول',
      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'NT',
      discount: 0, dtype: '', coupon: null, link: 'https://ninjatraderdomesticvendor.sjv.io/xJJ7ZO',
      desc: 'منصة مجانية للعقود الآجلة مع اختبار متقدم وأتمتة وسوق مؤشرات.',
      features: ['مجاني لبيانات EOD','اختبار متقدم','أتمتة (NinjaScript)','سوق المؤشرات','متعدد الوسطاء'],
      highlight: false, badge: 'متاح مجاناً',
    },
    {
      id: 'tradovate', name: 'Tradovate', icon_url: '/img/Plataformas/tradovate.webp', type: 'منصة تداول',
      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'TV',
      discount: 0, dtype: '', coupon: null, link: 'https://tradovate.com',
      desc: 'منصة سحابية للعقود الآجلة. واجهة ممتازة وبيانات متكاملة ودعم متعدد الأجهزة.',
      features: ['قائم على السحابة','واجهة حديثة','بيانات متكاملة','تطبيق موبايل','DOM متقدم'],
      highlight: false, badge: 'Cloud-based',
    },
    {
      id: 'mt5', name: 'MetaTrader 5', icon_url: '/img/Plataformas/icone mt5.webp', type: 'Forex & CFDs',
      color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M5',
      discount: 0, dtype: '', coupon: null, link: 'https://metatrader5.com',
      desc: 'منصة السوق الفوركسي القياسية. مؤشرات تقنية وEAs واختبار وسطاء Prop Forex.',
      features: ['100+ مؤشر','مستشارو الخبراء (EAs)','Strategy Tester','وسطاء متعددون','تطبيق موبايل'],
      highlight: false, badge: 'معيار فوركس',
    },
    {
      id: 'wealthcharts', name: 'WealthCharts', icon_url: '/img/Plataformas/icone wealthcharts.webp', type: 'الرسوم البيانية والتحليل',
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
  track('heatmap_load',{source});
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

const CUR_FLAGS = {USD:'🇺🇸',EUR:'🇪🇺',GBP:'🇬🇧',CAD:'🇨🇦',AUD:'🇦🇺',JPY:'🇯🇵',BRL:'🇧🇷',CNY:'🇨🇳',CHF:'🇨🇭',NZD:'🇳🇿',MXN:'🇲🇽',KRW:'🇰🇷',INR:'🇮🇳',ZAR:'🇿🇦',SEK:'🇸🇪',NOK:'🇳🇴',DKK:'🇩🇰',PLN:'🇵🇱',TRY:'🇹🇷',SGD:'🇸🇬',HKD:'🇭🇰',TWD:'🇹🇼',THB:'🇹🇭',IDR:'🇮🇩',RUB:'🇷🇺'};

const CAL_API = 'https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/economic-calendar';

// Timezone offsets from UTC in hours
const CAL_TZ_OFFSETS = {ET:-4,CT:-5,PT:-7,UTC:0,GMT:0,CET:1,JST:9,BRT:-3};

let calFilterCur = 'all';
let calFilterImp = new Set(); // multi-select de impacto: vazio = todos; pode ter 'h','m','l' juntos
let calEvents = [];   // raw events with ET times
let _calRefreshTimer = null;
let _calLang = '';
let _calLastUpdate = null;
let _calTz = 'local'; // current timezone — auto-detect via browser (igual investing.com)
let _calCdTimer = null; // countdown interval

// ── Timezone ──
function calSetTz(tz){
  _calTz = tz;
  try { localStorage.setItem('mc_cal_tz', tz); } catch(e){}
  renderCal();
  calUpdateCountdown();
}

function calInitTz(){
  try { const saved = localStorage.getItem('mc_cal_tz'); if(saved) _calTz = saved; } catch(e){}
  const sel = document.getElementById('cal-tz');
  if(sel) sel.value = _calTz;
}

// Convert HH:MM in UTC (API returns UTC) to the selected timezone.
// FIX 2026-05-05: antes assumia input em ET → calendar mostrava UTC com label "ET"
// (ex: JOLTs 14:00 UTC virava "14:00 ET" mas o real é 10:00 ET = 11:00 BRT).
function calConvertTime(hhmm){
  if(!hhmm || hhmm === '—') return {display:'—', label:''};
  const [hh,mm] = hhmm.split(':').map(Number);
  if(isNaN(hh) || isNaN(mm)) return {display:hhmm, label:_calTz};
  if(_calTz === 'local'){
    const now = new Date();
    const localOffset = -now.getTimezoneOffset() / 60; // offset local em horas vs UTC
    let lh = hh + localOffset;
    if(lh < 0) lh += 24; if(lh >= 24) lh -= 24;
    let tzName = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop().replace(/_/g,' ');
    if(tzName==='Sao Paulo') tzName='São Paulo';
    return {display:String(Math.floor(lh)).padStart(2,'0')+':'+String(mm).padStart(2,'0'), label:tzName};
  }
  const offset = CAL_TZ_OFFSETS[_calTz];
  if(offset === undefined) return {display:hhmm, label:_calTz};
  // input em UTC → simplesmente soma o offset do tz alvo
  let converted = hh + offset;
  if(converted < 0) converted += 24; if(converted >= 24) converted -= 24;
  return {display:String(Math.floor(converted)).padStart(2,'0')+':'+String(mm).padStart(2,'0'), label:_calTz};
}

// HH:MM em UTC → HH:MM em ET (site exibe ET). -4 (EDT) consistente com o resto do calendário.
function calUtcToET(hhmm){
  if(!/^\d{1,2}:\d{2}$/.test(hhmm||'')) return hhmm;
  const [h,m] = hhmm.split(':').map(Number);
  return String((h-4+24)%24).padStart(2,'0')+':'+String(m).padStart(2,'0');
}

// ── Countdown timer for next high-impact event ──
function calUpdateCountdown(){
  const bar = document.getElementById('cal-countdown-bar');
  if(!bar) return;
  // e.t e e.dateStr estão em UTC (API retorna UTC) — comparar via timestamp absoluto.
  // Bug corrigido 2026-05-20: antes tratava e.t como ET → countdown 4h errado (FOMC 5h48m vs 1h45m real).
  const now = Date.now();
  let nextEv = null, nextTs = Infinity;
  for(const e of calEvents){
    if(e.imp !== 'h' || e.t === '—' || !e.dateStr || !/^\d{1,2}:\d{2}$/.test(e.t)) continue;
    const ts = Date.parse(e.dateStr + 'T' + e.t + ':00Z');
    if(isNaN(ts) || ts <= now) continue;
    if(ts < nextTs){ nextTs = ts; nextEv = e; }
  }
  // só mostra se o próximo evento de alto impacto for nas próximas 24h
  if(!nextEv || (nextTs - now) > 24*3600*1000){ bar.style.display = 'none'; return; }
  const diff = Math.floor((nextTs - now)/1000);
  const dH = Math.floor(diff/3600);
  const dM = Math.floor((diff%3600)/60);
  const dS = diff%60;
  document.getElementById('cal-cd-name').textContent = (CUR_FLAGS[nextEv.cur]||'') + ' ' + nextEv.ev + ' (' + nextEv.cur + ')';
  document.getElementById('cal-cd-timer').textContent = (dH>0?dH+'h ':'') + String(dM).padStart(2,'0') + 'm ' + String(dS).padStart(2,'0') + 's';
  bar.style.display = 'flex';
}

function calStartCountdown(){
  if(_calCdTimer) clearInterval(_calCdTimer);
  calUpdateCountdown();
  _calCdTimer = setInterval(calUpdateCountdown, 1000);
}

// ── Filters ──
function calFilter(filter, btn) {
  track('calendar_filter',{filter});
  if (filter === 'all') { calFilterCur = 'all'; calFilterImp.clear(); }
  else if (filter === 'h' || filter === 'm' || filter === 'l') {
    // multi-select: 3★ e 2★ (e 1★) podem ficar selecionados juntos — mostra a união
    if (calFilterImp.has(filter)) calFilterImp.delete(filter); else calFilterImp.add(filter);
  }
  else { calFilterCur = calFilterCur === filter ? 'all' : filter; }
  // escopo #cal-filters — não tocar nos botões .cal-f do heatmap
  document.querySelectorAll('#cal-filters .cal-f').forEach(b => {
    const f = b.getAttribute('data-filter');
    if (f === 'all') b.classList.toggle('active', calFilterCur === 'all' && calFilterImp.size === 0);
    else if (f === 'h' || f === 'm' || f === 'l') b.classList.toggle('active', calFilterImp.has(f));
    else b.classList.toggle('active', calFilterCur === f);
  });
  renderCal();
}

function getTodayHighImpactEvents(){
  const todayStr = new Date().toISOString().slice(0,10);
  return calEvents.filter(e=>e.dateStr===todayStr && e.imp==='h');
}

// ── Load ──
async function loadCalendar(silent) {
  const el = document.getElementById('cal-list');
  if (!el) return;
  if(!silent) el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--t2);"><div class="ar-spinner" style="width:24px;height:24px;border:2px solid rgba(255,255,255,.06);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px;"></div></div>';

  calInitTz();

  const today = new Date();
  const etNow = new Date(today.getTime() - 4 * 60 * 60 * 1000);
  const todayStr = etNow.toISOString().slice(0,10);
  const tmrDate = new Date(etNow); tmrDate.setDate(tmrDate.getDate()+1);
  const tmrStr = tmrDate.toISOString().slice(0,10);

  try{localStorage.removeItem('mc_cal_cache');}catch(e){}

  try {
    const lang = _currentLang || 'en';
    const res = await fetch(CAL_API + '?lang=' + lang);
    if (!res.ok) throw new Error('Calendar API error '+res.status);
    const data = await res.json();
    if (!data.events?.length) throw new Error('No events');

    // High-impact US events that Trading Economics under-rates vs Investing.com
    const _calBoost = /\b(non.?farm|nfp|payroll|cpi\b|inflation rate|ppi\b|producer price|retail sales|gdp |initial jobless|philadelph|philly fed|ism |fomc|fed.*rate|interest rate decision|core pce|pce price|consumer confidence|durable goods|s&p global.*pmi|adp employment|housing starts|building permits|michigan consumer|jolts|import price|export price|employment cost|trade balance|industrial production|baker hughes|empire state|capacity utilization|crude oil inventories|api crude|cftc)\b/i;

    calEvents = data.events.map(ev => {
      const dateStr = ev.date || '';
      let day = 'Semana';
      if (dateStr === todayStr) day = 'Hoje';
      else if (dateStr === tmrStr) day = 'Amanhã';
      // Boost known high-impact US events from imp 2 → 3
      let rawImp = ev.importance || 1;
      if (rawImp === 2 && (ev.currency === 'USD' || /united states/i.test(ev.country)) && _calBoost.test(ev.event)) rawImp = 3;
      let imp = 'l';
      if (rawImp >= 3) imp = 'h';
      else if (rawImp >= 2) imp = 'm';
      // Convert 12h → 24h. Horários da API são UTC — conversão pra ET/local é em calConvertTime / calUtcToET.
      let t24 = ev.time || '—';
      if (t24 !== '—') {
        const m = t24.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (m) { let h = parseInt(m[1]); const ampm = m[3].toUpperCase(); if (ampm==='PM' && h<12) h+=12; if (ampm==='AM' && h===12) h=0; t24 = h.toString().padStart(2,'0')+':'+m[2]; }
      }
      return {
        day, t: t24, cur: ev.currency || '', ev: ev.event || '',
        ref: ev.reference || '',
        actual: ev.actual != null ? String(ev.actual) : '—',
        fore: ev.forecast != null ? String(ev.forecast) : '—',
        prev: ev.previous != null ? String(ev.previous) : '—',
        imp, dateStr
      };
    });
    calEvents.sort((a,b) => (a.dateStr+a.t).localeCompare(b.dateStr+b.t));
    _calLastUpdate = new Date().toISOString();
  } catch(e) {
    console.warn('Calendar API error:', e);
    if (!calEvents.length) {
      calEvents = [{day:'Hoje',t:'—',cur:'—',ev:t('cal_erro_api'),actual:'—',fore:'—',prev:'—',imp:'l',dateStr:todayStr}];
    }
  }
  renderCal();
  calStartCountdown();
  if (!_calRefreshTimer) _startCalRefresh();
}

function _startCalRefresh(){
  _calRefreshTimer = setInterval(() => loadCalendar(true), 5*60*1000);
}

// ── Tooltip on actual value ──
function calShowTip(el, actual, forecast){
  let tip = document.getElementById('cal-tip');
  if(!tip){ tip = document.createElement('div'); tip.id='cal-tip'; tip.className='cal-tooltip'; document.body.appendChild(tip); }
  const actN = parseFloat(actual.replace(/[^0-9.\-]/g,''));
  const foreN = parseFloat(forecast.replace(/[^0-9.\-]/g,''));
  if(isNaN(actN) || isNaN(foreN) || foreN === 0) return;
  const diff = actN - foreN;
  const pct = ((diff / Math.abs(foreN)) * 100).toFixed(1);
  const isUp = diff > 0;
  tip.innerHTML = `<span class="${isUp?'cal-tooltip-up':'cal-tooltip-dn'}">${isUp?'▲':'▼'} ${isUp?'+':''}${pct}%</span> ${t('cal_vs_forecast')}`;
  const r = el.getBoundingClientRect();
  tip.style.left = (r.left + r.width/2 - 60) + 'px';
  tip.style.top = (r.top - 40 + window.scrollY) + 'px';
  requestAnimationFrame(()=> tip.classList.add('show'));
}
function calHideTip(){ const tip = document.getElementById('cal-tip'); if(tip) tip.classList.remove('show'); }

// ── Render ──
function renderCal() {
  const el = document.getElementById('cal-list');
  if (!el) return;
  let events = calEvents;
  if (calFilterCur !== 'all') events = events.filter(e => e.cur === calFilterCur);
  if (calFilterImp.size) events = events.filter(e => calFilterImp.has(e.imp));
  const searchEl = document.getElementById('cal-search');
  const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
  if (q) events = events.filter(e => e.ev.toLowerCase().includes(q) || e.cur.toLowerCase().includes(q) || (e.ref||'').toLowerCase().includes(q));

  const countEl = document.getElementById('cal-count');
  if (countEl) countEl.textContent = events.length + ' ' + (events.length === 1 ? t('cal_evento_singular') || 'event' : t('cal_eventos_plural') || 'events');

  if (!events.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--t2);font-size:13px;">${t('cal_sem_eventos')}</div>`;
    return;
  }

  // Current time em UTC (e.t está armazenado em UTC, comparação tem que ser em UTC)
  const nowUTC = new Date();
  const nowHHMM = nowUTC.getUTCHours().toString().padStart(2,'0') + ':' + nowUTC.getUTCMinutes().toString().padStart(2,'0');

  // Find next upcoming high-impact event (search today first, then future days)
  const todayStr = nowUTC.toISOString().slice(0,10);
  let nextHiId = null;
  for(const e of calEvents){
    if(e.imp !== 'h' || e.t === '—') continue;
    if(e.dateStr === todayStr && e.t > nowHHMM){ nextHiId = e.dateStr + e.t + e.ev; break; }
    if(e.dateStr > todayStr){ nextHiId = e.dateStr + e.t + e.ev; break; }
  }

  const groups = {};
  events.forEach(e => { if (!groups[e.day]) groups[e.day] = []; groups[e.day].push(e); });
  const order = ['Hoje','Amanhã','Semana'];

  el.innerHTML = order.filter(d => groups[d]?.length).map(day => {
    let nowInserted = false;
    const items = groups[day];
    return `<div class="cal-date-group">
      <div class="cal-date-label">${day === 'Hoje' ? t('cal_hoje') + ' — ' + new Date().toLocaleDateString(_currentLang||'en',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : day === 'Amanhã' ? t('cal_amanha') : t('cal_esta_semana')}</div>
      ${items.map((e) => {
        const cc = CUR_COLORS[e.cur] || {bg:'rgba(74,85,104,.2)',c:'var(--t2)'};
        const flag = ''; // flags don't render on Windows — keep text only
        const actVal = parseFloat((e.actual||'').replace(/[^0-9.\-]/g,''));
        const foreVal = parseFloat((e.fore||'').replace(/[^0-9.\-]/g,''));
        const actClass = (e.actual !== '—' && !isNaN(actVal) && !isNaN(foreVal)) ? (actVal > foreVal ? 'cal-act-up' : actVal < foreVal ? 'cal-act-dn' : '') : '';
        const actArrow = actClass === 'cal-act-up' ? ' ▲' : actClass === 'cal-act-dn' ? ' ▼' : '';
        const isPast = day === 'Hoje' && e.t !== '—' && e.t < nowHHMM;
        const isNextHi = (e.dateStr + e.t + e.ev) === nextHiId;
        const tipAttr = (e.actual !== '—' && actClass) ? ` onmouseenter="calShowTip(this,'${e.actual}','${e.fore}')" onmouseleave="calHideTip()"` : '';
        // Timezone conversion
        const tz = calConvertTime(e.t);
        // "Now" separator
        let nowLine = '';
        if (day === 'Hoje' && !nowInserted && e.t !== '—' && e.t >= nowHHMM) {
          nowInserted = true;
          nowLine = `<div class="cal-now-line"><div class="cal-now-dot"></div><div class="cal-now-label">${t('cal_agora')||'NOW'}</div><div class="cal-now-hr"></div></div>`;
        }
        return `${nowLine}<div class="cal-item${isPast?' cal-past':''}${isNextHi?' cal-next-hi':''}">
          <div class="cal-time">${tz.display} <span style="font-size:10px;color:var(--t2);">${tz.label}</span></div>
          <div><span class="cal-cur-badge" style="background:${cc.bg};color:${cc.c};">${e.cur}</span></div>
          <div><div class="cal-ev-name">${e.ev}${e.ref?` <span style="font-size:10px;color:var(--t2);font-weight:400;">${e.ref}</span>`:''}</div></div>
          <div class="cal-act-wrap"${tipAttr}><div class="cal-val ${actClass}">${e.actual}${actArrow}</div></div>
          <div class="cal-fore-wrap"><div class="cal-val" style="color:var(--gold);">${e.fore}</div></div>
          <div class="cal-prev-wrap"><div class="cal-val">${e.prev}</div></div>
          <div class="cal-stars ${e.imp}" title="${e.imp==='h'?t('cal_alto_impacto'):e.imp==='m'?t('cal_medio_impacto'):t('cal_baixo_impacto')}">${e.imp==='h'?'★★★':e.imp==='m'?'★★':'★'}</div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');

  const updEl = document.getElementById('cal-updated');
  if (updEl && _calLastUpdate) updEl.textContent = (t('cal_atualizado')||'Updated') + ' ' + new Date(_calLastUpdate).toLocaleTimeString(_currentLang||'en',{hour:'2-digit',minute:'2-digit'});
}

/* ANÁLISE DE MERCADO IA */

/* ─── DAILY ANALYSIS ─── */
const DA_ASSETS={NQ:{name:'Nasdaq 100',tv:'OANDA:NAS100USD'},ES:{name:'S&P 500',tv:'OANDA:SPX500USD'},CL:{name:'Petróleo WTI',tv:'TVC:USOIL'},GC:{name:'Ouro',tv:'TVC:GOLD'}};

let _lastDailyData=null;
async function loadDailyAnalysis(){
  const grid=document.getElementById('da-grid');if(!grid)return;
  // Guarantee calendar is loaded before rendering analysis (events are needed)
  if(!calEvents.length) await loadCalendar(true);
  try{
    const{data,error}=await db.from('daily_analysis').select('*').eq('date',new Date().toISOString().slice(0,10)).order('asset');
    if(error)throw error;
    if(!data||data.length===0){
      const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
      const{data:d2}=await db.from('daily_analysis').select('*').eq('date',yesterday.toISOString().slice(0,10)).order('asset');
      if(d2&&d2.length>0){_lastDailyData=d2;return renderDailyCards(d2);}
      const{data:d3}=await db.from('daily_analysis').select('*').order('date',{ascending:false}).limit(4);
      if(d3&&d3.length>0){_lastDailyData=d3;return renderDailyCards(d3);}
      grid.innerHTML=`<div class="da-loading" style="grid-column:1/-1;"><div style="font-size:14px;color:var(--t2);font-weight:600;" data-i18n="da_sem_analise">${t('da_sem_analise')}</div><div style="font-size:12px;color:var(--t2);margin-top:6px;" data-i18n="da_primeira_6h">${t('da_primeira_6h')}</div></div>`;
      return;
    }
    _lastDailyData=data;
    renderDailyCards(data);
  }catch(e){
    grid.innerHTML=`<div class="da-loading" style="grid-column:1/-1;"><div style="color:var(--t2);">${t('da_erro')}</div></div>`;
  }
}

async function loadAccuracyBadge(){
  const el=document.getElementById('da-accuracy');if(!el)return;
  try{
    const since=new Date();since.setDate(since.getDate()-30);
    const{data}=await db.from('analysis_targets').select('bull_t1_hit,bull_t2_hit,bear_t1_hit,bear_t2_hit').gte('date',since.toISOString().slice(0,10)).not('scored_at','is',null);
    if(!data||data.length<4)return;
    let hits=0,total=0;
    for(const r of data){
      if(r.bull_t1_hit!==null){total++;if(r.bull_t1_hit)hits++;}
      if(r.bull_t2_hit!==null){total++;if(r.bull_t2_hit)hits++;}
      if(r.bear_t1_hit!==null){total++;if(r.bear_t1_hit)hits++;}
      if(r.bear_t2_hit!==null){total++;if(r.bear_t2_hit)hits++;}
    }
    if(!total)return;
    const pct=Math.round(hits/total*100);
    el.innerHTML=`<span class="da-acc-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg> ${t('da_acuracia')}: ${pct}% <span class="da-acc-sub">(${data.length} ${t('da_analises')})</span></span>`;
  }catch(e){}
}

// ═══ PRO ACCESS CHECK (vip + loyalty + 5min preview) ═══
// Trial v2 (2026-05-18): timer de 5 min inicia QUANDO user entra em Análise Diária
// (não da criação da conta). Anon e logado compartilham mesmo timer local (mc_da_preview_start).
const DA_PREVIEW_MS = 5 * 60 * 1000; // 5 minutos

function _daPreviewRemaining(){
  try {
    const s = parseInt(localStorage.getItem('mc_da_preview_start') || '0', 10);
    if (!s) return DA_PREVIEW_MS; // ainda não iniciou (não entrou na análise)
    const elapsed = Date.now() - s;
    return Math.max(0, DA_PREVIEW_MS - elapsed);
  } catch(_) { return DA_PREVIEW_MS; }
}

function _daPreviewStartIfNeeded(){
  try {
    if (!localStorage.getItem('mc_da_preview_start')) {
      localStorage.setItem('mc_da_preview_start', String(Date.now()));
    }
  } catch(_) {}
}

function _daPreviewActive(){
  try {
    const s = parseInt(localStorage.getItem('mc_da_preview_start') || '0', 10);
    if (!s) return false; // nunca iniciou — gate fechado até entrar na Análise
    return (Date.now() - s) < DA_PREVIEW_MS;
  } catch(_) { return false; }
}

// Acesso a Análise Diária / GEX = só ter conta (modelo 2026-05-20: cadastro libera
// o site todo; só o Live Room continua exigindo fidelidade — gate próprio).
async function checkProAccess(){
  return !!(currentUser && currentProfile);
}

// P1 v2 — Pro Gate 3 caminhos
const PG_ICO_USER='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
const PG_ICO_GIFT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>';
const PG_ICO_STAR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
const PG_ICO_CLOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
const PG_CHK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

// _pgProCard removido 2026-05-20 — plano pago Pro fora do ar. Motor Stripe (startCheckout/
// openStripePortal/edge functions) mantido dormente pra reativar depois. Pra voltar o card,
// reescrever aqui e re-plugar em buildProGate/buildProGateAnon.

// User logado sem acesso — só fidelidade (Pro pago removido 2026-05-18, volta depois)
function buildProGate(mode){
  const head = mode==='compact' ? '' :
    `<div class="da-gate-head"><div class="da-gate-icon">${PG_ICO_CLOCK}</div><h2 class="da-gate-title">${t('pro_gate_logged_title')||'Seu preview acabou'}</h2><p class="da-gate-subtitle">${t('pro_gate_logged_sub')||'Continue acessando Análise + GEX + Live Room.'}</p></div>`;
  return head+
    `<div class="pg-stack">`+
      `<div class="pg-card pg-card-primary">`+
        `<div class="pg-card-head"><span class="pg-card-ico">${PG_ICO_GIFT}</span><span class="pg-card-title">${t('pro_gate_loyalty_logged_title')||'Acesso grátis com fidelidade'}</span></div>`+
        `<p class="pg-card-sub">${t('pro_gate_loyalty_sub')||'Compre uma avaliação com cupom Markets e ative sua fidelidade.'}</p>`+
        `<button class="pg-btn pg-btn-gold" onclick="track('gate_loyalty_click',{src:'pro_gate_logged'});go('loyalty')">${t('pro_gate_loyalty_cta')||'Ver firmas com cupom'}</button>`+
      `</div>`+
    `</div>`;
}

// Visitante anônimo. ctx='live' → Live Room (cadastro + fidelidade, 2 cards).
// Senão (Análise/GEX/resto) → SÓ cadastro: criar conta grátis libera tudo
// (modelo 2026-05-20 — só o Live Room continua exigindo fidelidade).
function buildProGateAnon(ctx){
  const isLive = ctx==='live';
  let html = `<div class="da-gate-head"><div class="da-gate-icon">${isLive?PG_ICO_GIFT:PG_ICO_USER}</div><h2 class="da-gate-title">${t('pro_gate_title')||'Crie sua conta grátis'}</h2><p class="da-gate-subtitle">${t('pro_gate_anon_sub')||'Crie sua conta grátis para continuar.'}</p></div>`+
    `<div class="pg-stack">`+
      `<div class="pg-card pg-card-primary">`+
        `<div class="pg-card-head"><span class="pg-card-ico">${PG_ICO_USER}</span><span class="pg-card-title">${t('da_gate_btn_login')||'Criar conta grátis'}</span></div>`+
        `<p class="pg-card-sub">${t('pro_gate_signup_sub')||'Sem cartão. Acesso imediato a Análise Diária, GEX e tudo no site.'}</p>`+
        `<button class="pg-btn pg-btn-gold" onclick="track('gate_signup_click',{src:'pro_gate_anon'});openAuthModal('signup')">${t('pro_gate_signup_cta')||'Criar conta grátis →'}</button>`+
      `</div>`;
  // Live Room é a ÚNICA área que precisa de fidelidade — só aqui o card aparece.
  if(isLive){
    html += `<div class="pg-divider-or">${t('pro_gate_or_path')||'E pra entrar no Live Room VIP'}</div>`+
      `<div class="pg-card pg-card-secondary">`+
        `<div class="pg-card-head"><span class="pg-card-ico">${PG_ICO_GIFT}</span><span class="pg-card-title">${t('pro_gate_loyalty_title')||'Programa de fidelidade'}</span></div>`+
        `<p class="pg-card-sub">${t('pro_gate_loyalty_sub')||'Compre uma avaliação com cupom Markets e ative sua fidelidade.'}</p>`+
        `<button class="pg-btn pg-btn-glass" onclick="track('gate_loyalty_click',{src:'pro_gate_anon_live'});go('loyalty')">${t('pro_gate_loyalty_cta')||'Ver firmas com cupom'}</button>`+
      `</div>`;
  }
  return html + `</div>`;
}

async function startCheckout(){
  if(!currentUser){openAuthModal('signup');return;}
  if(!isAuthed()){showConfirmEmailModal('pending');return;}
  // Track InitiateCheckout
  track('checkout_click',{item:'pro_subscription',value:9.99,currency:'USD'});
  // Disable button and show loading
  const btn=document.querySelector('[onclick="startCheckout()"]');
  const origText=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent=t('btn_loading');}
  try{
    const{data:{session},error:sessErr}=await db.auth.getSession();
    if(sessErr||!session){
      if(btn){btn.disabled=false;btn.textContent=origText;}
      openAuthModal('login');
      return;
    }
    const res=await fetch('https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/stripe-checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':SUPABASE_ANON},
      body:JSON.stringify({success_url:window.location.origin+'/pro-success',cancel_url:window.location.origin+(_pageUrl(_pageFromPath()||'analise'))})
    });
    const json=await res.json();
    if(json.url) window.location.href=json.url;
    else if(json.error==='Already subscribed'){alert(t('pro_already_subscribed'));if(btn){btn.disabled=false;btn.textContent=origText;}}
    else throw new Error(json.error||'Checkout failed');
  }catch(e){
    console.error('Checkout error:',e);
    alert('Error: '+e.message);
    if(btn){btn.disabled=false;btn.textContent=origText;}
  }
}

async function openStripePortal(){
  if(!currentUser) return;
  try{
    const{data:{session}}=await db.auth.getSession();
    if(!session) return;
    const res=await fetch('https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/stripe-portal',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':SUPABASE_ANON},
      body:JSON.stringify({return_url:window.location.href})
    });
    const json=await res.json();
    if(json.url) window.location.href=json.url;
  }catch(e){console.error('Portal error:',e);}
}

function showProSuccessOverlay(){
  // Deterministic transaction_id per user per day (GA4 dedupes repeated purchases)
  const _txId = 'pro_'+(currentUser?.id||MC_SESSION)+'_'+new Date().toISOString().slice(0,10);
  // Track purchase conversion (event_id auto-generated inside track() for CAPI dedupe)
  track('purchase',{item:'pro_subscription',value:9.99,currency:'USD',transaction_id:_txId,content_ids:['pro_monthly'],content_type:'product',content_name:'Pro Subscription',num_items:1});
  const ov=document.createElement('div');
  ov.className='pro-success-ov';
  ov.innerHTML=`<div class="pro-success-box">
    <div class="pro-success-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
    <h2>${t('pro_success_title')}</h2>
    <p>${t('pro_success_text')}</p>
    <button class="pro-success-cta" onclick="this.closest('.pro-success-ov').remove()">${t('pro_success_cta')}</button>
  </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
  checkProBadge();
}

async function checkProBadge(){
  const badge=document.getElementById('nav-pro-badge');
  const manageBtn=document.getElementById('dd-manage-sub');
  if(!isAuthed()){
    if(badge)badge.style.display='none';
    if(manageBtn)manageBtn.style.display='none';
    return;
  }
  try{
    let isPro=false, hasSub=false;
    // Check VIP flag
    if(currentProfile?.analysis_vip===true) isPro=true;
    // Check active subscription (plano pago Stripe — dormente desde 2026-05-18)
    {
      const{data}=await db.from('subscriptions').select('status').eq('user_id',currentUser.id).in('status',['active','trialing']).limit(1);
      if(data&&data.length>0){ isPro=true; hasSub=true; }
    }
    // Check approved loyalty proof
    if(!isPro){
      const email=currentProfile?.email||currentUser.email;
      const{data}=await db.from('loyalty_proofs').select('id').eq('member_email',email).eq('status','approved').limit(1);
      if(data&&data.length>0) isPro=true;
    }
    if(badge)badge.style.display=isPro?'flex':'none';
    // "Gerenciar assinatura" só pra quem TEM assinatura Stripe — loyalty/VIP não tem portal
    if(manageBtn)manageBtn.style.display=hasSub?'block':'none';
    // Update panel Pro status
    const panelPro=document.getElementById('up-pro-status');
    if(panelPro) panelPro.style.display=isPro?'block':'none';
  }catch(e){
    if(badge)badge.style.display='none';
    if(manageBtn)manageBtn.style.display='none';
  }
}

// Preview timer: 60s free preview for non-logged users
let _previewCountdown=null;
const PREVIEW_BANNER_ID='mc-preview-banner';
function startPreviewTimer(gateId,wrapId,wrapClass){
  // Preview v2 (2026-05-18): 5 min, key unificada com user logado (mc_da_preview_start)
  // Inicia APENAS quando user entra em Análise Diária (não em GEX)
  const KEY='mc_da_preview_start';
  const DUR=5*60; // segundos
  const isAnaliseDiaria = gateId === 'da-gate';
  const stored=localStorage.getItem(KEY);
  const now=Date.now();
  // Em GEX, NÃO inicia timer — só herda se já rodando
  if(!stored){
    if(!isAnaliseDiaria){
      // GEX sem timer rodando → gate fechado direto
      removePreviewBanner();
      showPreviewGate(gateId,wrapId,wrapClass);
      return;
    }
    localStorage.setItem(KEY,now);
  }
  const start=parseInt(stored||now,10);
  const elapsed=Math.floor((now-start)/1000);
  if(elapsed>=DUR){removePreviewBanner();showPreviewGate(gateId,wrapId,wrapClass);return;}
  // Still within 60s — show content, start countdown
  const wrap=document.getElementById(wrapId);
  if(wrap) wrap.classList.remove(wrapClass);
  const gate=document.getElementById(gateId);
  if(gate){gate.innerHTML='';gate.style.display='none';}
  if(_previewCountdown) clearInterval(_previewCountdown);
  showPreviewBanner(DUR-elapsed);
  _previewCountdown=setInterval(()=>{
    const rem=DUR-Math.floor((Date.now()-start)/1000);
    if(rem<=0){
      clearInterval(_previewCountdown);
      removePreviewBanner();
      showPreviewGate('da-gate','da-wrap-inner','da-wrap-gated');
      showPreviewGate('gx-gate','gx-wrap-inner','gx-wrap-gated');
      return;
    }
    const modalOpen=document.getElementById('login-overlay')?.classList.contains('show');
    if(!_isGatedPage()||modalOpen){removePreviewBanner();return;}
    const el=document.getElementById(PREVIEW_BANNER_ID);
    // Mostra MM:SS no banner (era só "60s")
    const min=Math.floor(rem/60),sec=rem%60,fmt=`${min}:${String(sec).padStart(2,'0')}`;
    if(el){const s=el.querySelector('.pvw-time');if(s)s.textContent=fmt;}
    else showPreviewBanner(fmt);
  },1000);
}
function _isGatedPage(){const p=sessionStorage.getItem('mc_page')||_pageFromPath()||location.hash.replace('#','');const pg=document.getElementById('page-'+p);return (p==='analise'||p==='gamma')&&pg&&pg.classList.contains('active');}
function showPreviewBanner(secs){
  if(!_isGatedPage())return;
  if(document.getElementById(PREVIEW_BANNER_ID))return;
  const bar=document.createElement('div');
  bar.id=PREVIEW_BANNER_ID;
  bar.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,rgba(240,180,41,.95),rgba(200,148,26,.95));color:#07090D;display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 16px;font-size:13px;font-weight:600;box-shadow:0 -4px 20px rgba(0,0,0,.3);';
  bar.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07090D" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
    <span>${t('preview_banner_text')}</span>
    <span class="pvw-time" style="background:#07090D;color:var(--gold);padding:2px 8px;border-radius:6px;font-size:12px;font-weight:800;min-width:42px;text-align:center;">${typeof secs==='string'?secs:secs+'s'}</span>
    <button onclick="openAuthModal('signup')" style="background:#07090D;color:var(--gold);border:none;padding:6px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;margin-left:8px;">${t('da_gate_btn_login')}</button>`;
  document.body.appendChild(bar);
}
function removePreviewBanner(){const el=document.getElementById(PREVIEW_BANNER_ID);if(el)el.remove();}
function showPreviewGate(gateId,wrapId,wrapClass){
  const wrap=document.getElementById(wrapId);
  const gate=document.getElementById(gateId);
  if(!wrap||!gate)return;
  wrap.classList.add(wrapClass);
  gate.style.display='';
  gate.innerHTML=buildProGateAnon();
}

async function checkAnalysisGate(){
  const wrap=document.getElementById('da-wrap-inner');
  const gate=document.getElementById('da-gate');
  if(!wrap||!gate)return;

  // Não logado → preview 60s, depois gate com cadastro + pro
  if(!currentUser||!currentProfile){
    startPreviewTimer('da-gate','da-wrap-inner','da-wrap-gated');
    return;
  }

  // Logado = acesso total a Análise Diária (cadastro libera — modelo 2026-05-20).
  // Sem checagem de fidelidade nem preview: ter conta já basta.
  removePreviewBanner();
  if(_previewCountdown){clearInterval(_previewCountdown);_previewCountdown=null;}
  _userHasAccess=true;
  wrap.classList.remove('da-wrap-gated');
  gate.innerHTML='';
}

function daT(v){if(!v)return'';if(typeof v==='string')return v;return v[_currentLang]||v.pt||v.en||Object.values(v)[0]||'';}

// Build events section: use DB events field + inject live high-impact calendar events
function _renderDaEvents(a){
  const dbEvents = daT(a.events);
  const highImpact = getTodayHighImpactEvents();
  // Build live calendar events HTML
  let calHtml='';
  if(highImpact.length){
    const evList = highImpact.map(e=>{
      const cc=CUR_COLORS[e.cur]||{bg:'rgba(74,85,104,.2)',c:'var(--t2)'};
      const actStr = e.actual!=='—' ? ` → <b style="color:var(--green);">${e.actual}</b>` : '';
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
        <span style="font-size:10px;color:var(--t2);min-width:38px;">${calUtcToET(e.t)} ET</span>
        <span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:${cc.bg};color:${cc.c};">${e.cur}</span>
        <span style="font-size:11px;color:var(--t1);">${e.ev}${actStr}</span>
        ${e.fore!=='—'?`<span style="font-size:10px;color:var(--t2);">(${t('da_previsao')}: ${e.fore})</span>`:''}
      </div>`;
    }).join('');
    calHtml=`<div style="margin-top:8px;padding:10px 12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.1);border-radius:8px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#ef4444;margin-bottom:6px;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" style="vertical-align:-1px;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        ${t('da_eventos_hoje')}
      </div>
      ${evList}
    </div>`;
  }
  const dbHtml = dbEvents&&dbEvents!=='—'?`<div class="da-events"><strong>${t('da_eventos')}:</strong> ${dbEvents}</div>`:'';
  return dbHtml+calHtml;
}

function renderDailyCards(items){
  const grid=document.getElementById('da-grid');if(!grid)return;
  const meta=document.getElementById('da-meta');
  if(meta&&items[0]){
    const loc=_currentLang==='pt'?'pt-BR':_currentLang;
    const d=new Date(items[0].date+'T12:00:00');
    const dateStr=d.toLocaleDateString(loc,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    let timeStr='';
    if(items[0].created_at){
      const upd=new Date(items[0].created_at);
      timeStr=' — '+upd.toLocaleTimeString(loc,{hour:'2-digit',minute:'2-digit',timeZone:'America/New_York'})+' ET';
    }
    meta.innerHTML=`<span><span class="analise-meta-dot"></span> ${t('da_atualizado')} ${dateStr}${timeStr}</span><span id="da-accuracy"></span>`;
    loadAccuracyBadge();
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
        ${_renderDaEvents(a)}
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

// B.4 — country/state/zip/phone/birthday helpers
const STATES_BR = [['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
const STATES_US = [['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']];

const ZIP_RE = {
  BR: /^\d{5}-?\d{3}$/,
  US: /^\d{5}(-\d{4})?$/,
  MX: /^\d{5}$/,
  PT: /^\d{4}-\d{3}$/,
};

const PHONE_PREFIX_BY_COUNTRY = {
  BR:'+55', US:'+1', CA:'+1', PT:'+351', ES:'+34', MX:'+52', AR:'+54',
  CO:'+57', CL:'+56', PE:'+51', UY:'+598', PY:'+595', VE:'+58', EC:'+593',
  BO:'+591', GB:'+44', DE:'+49', FR:'+33', IT:'+39', NL:'+31', BE:'+32',
  CH:'+41', AT:'+43', AU:'+61', JP:'+81',
};

function normalizePhoneE164(raw, country) {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('+')) return '+' + trimmed.replace(/\D/g,'');
  const digits = trimmed.replace(/\D/g,'');
  if (!digits) return '';
  const prefix = PHONE_PREFIX_BY_COUNTRY[country] || '';
  return prefix + digits;
}

function validateBirthdayAdult(iso) {
  if (!iso) return false;
  const dob = new Date(iso);
  if (isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 18;
}

// Genéricos (recebem prefixo de IDs, reutilizados por signup e painel — Fase C)
function renderStateFieldFor(prefix, country) {
  const wrap = document.getElementById(prefix + '-state-wrap');
  if (!wrap) return;
  const labelEl = wrap.querySelector('label');
  const labelHtml = labelEl ? labelEl.outerHTML : '<label data-i18n="signup_estado">Estado</label>';
  let inner;
  if (country === 'BR' || country === 'US') {
    const list = country === 'BR' ? STATES_BR : STATES_US;
    inner = `<select id="${prefix}-state"><option value="">--</option>${list.map(([c,n])=>`<option value="${c}">${c} — ${n}</option>`).join('')}</select>`;
  } else {
    inner = `<input type="text" id="${prefix}-state" placeholder="State / Region">`;
  }
  wrap.innerHTML = labelHtml + inner;
}

function onCountryChangeFor(prefix) {
  const country = document.getElementById(prefix + '-country')?.value;
  if (!country) return;
  renderStateFieldFor(prefix, country);
  const ph = document.getElementById(prefix + '-phone');
  if (ph) ph.placeholder = (PHONE_PREFIX_BY_COUNTRY[country] || '+') + ' XXX...';
}

async function onZipBlurFor(prefix) {
  const zip = document.getElementById(prefix + '-zip')?.value.trim();
  const country = document.getElementById(prefix + '-country')?.value;
  if (!zip || !country) return;
  const spin = document.getElementById(prefix + '-zip-spin');
  const msg = document.getElementById(prefix + '-zip-msg');
  if (spin) spin.style.display = 'block';
  if (msg) msg.style.display = 'none';
  try {
    const r = await fetchAddressByZip(zip, country);
    if (spin) spin.style.display = 'none';
    if (r && r.ok) {
      const addr = document.getElementById(prefix + '-address');
      const city = document.getElementById(prefix + '-city');
      const state = document.getElementById(prefix + '-state');
      if (addr && r.address) addr.value = r.address;
      if (city && r.city) city.value = r.city;
      if (state && r.state) state.value = r.state;
      if (msg) { msg.style.display='block'; msg.className='auth-zip-msg ok'; msg.textContent = t('zip_ok')||'Address found'; }
    } else {
      const errKey = 'zip_' + ((r && r.error) || 'zip_not_found');
      if (msg) { msg.style.display='block'; msg.className='auth-zip-msg error'; msg.textContent = t(errKey) || t('zip_zip_not_found') || 'CEP não encontrado, preencha manualmente'; }
    }
  } catch(e) {
    if (spin) spin.style.display = 'none';
  }
}

// Wrappers compat (mantém callsites HTML existentes — onclick="onZipBlur()" etc)
function renderStateField(country)  { renderStateFieldFor('auth-signup', country); }
function onCountryChange()          { onCountryChangeFor('auth-signup'); }
function onZipBlur()                { return onZipBlurFor('auth-signup'); }

// Wrappers do painel (Fase C)
function onCountryChangePainel()    { onCountryChangeFor('up-edit'); }
function onZipBlurPainel()          { return onZipBlurFor('up-edit'); }

function prefillCountryFromGeo() {
  if (!_geo || !_geo.geo_country) return;
  const sel = document.getElementById('auth-signup-country');
  if (!sel) return;
  const cc = _geo.geo_country.toUpperCase();
  if ([...sel.options].some(o => o.value === cc)) {
    sel.value = cc;
    onCountryChange();
  }
}

function initSignupForm() {
  prefillCountryFromGeo();
  const sel = document.getElementById('auth-signup-country');
  if (sel) renderStateField(sel.value);
}

/* ══════════════════════════════════════════════════════════════════════════
   B.6 — Complete Profile + Nickname (modal CP + nickname OAuth)
   ══════════════════════════════════════════════════════════════════════════ */
const FIRM_SLUGS = ['apex','brightfunded','bulenox','cti','e2t','e8','fn','ftmo','fundingpips','the5ers','tradeday'];
const FIRM_LABELS = {
  apex:'Apex Trader Funding', brightfunded:'BrightFunded', bulenox:'Bulenox',
  cti:'City Traders Imperium', e2t:'Earn2Trade', e8:'E8 Markets',
  fn:'FundedNext', ftmo:'FTMO', fundingpips:'Funding Pips',
  the5ers:'The5ers', tradeday:'TradeDay',
};

function renderFirmPillsInto(containerId, selected) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const sel = new Set(Array.isArray(selected) ? selected : []);
  wrap.innerHTML = FIRM_SLUGS.map(s =>
    `<button type="button" class="firm-pill${sel.has(s)?' selected':''}" data-firm="${s}">${FIRM_LABELS[s]}</button>`
  ).join('');
  wrap.querySelectorAll('.firm-pill').forEach(p => {
    p.addEventListener('click', (e) => { e.preventDefault(); p.classList.toggle('selected'); });
  });
}

function getSelectedFirmsFrom(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return [];
  return [...wrap.querySelectorAll('.firm-pill.selected')].map(p => p.dataset.firm);
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

/* ══════════════════════════════════════════════════════════════════════════
   GEOCODER — B.5 fetch address by ZIP/CEP (ViaCEP BR + Zippopotam fallback)
   Cache em memória por sessão. Helper standalone, não conectado ao form ainda.
   ══════════════════════════════════════════════════════════════════════════ */
const _zipCache = new Map();

function _normalizeZip(zip, country) {
  const raw = String(zip || '').replace(/\s/g, '');
  if (country === 'BR') return raw.replace(/\D/g, '');
  return raw;
}

async function fetchAddressByZip(zip, country) {
  const cc = String(country || '').toUpperCase().slice(0, 2);
  if (!cc) return { ok: false, error: 'unsupported_country', zip };
  const norm = _normalizeZip(zip, cc);
  if (!norm) return { ok: false, error: 'invalid_format', zip };

  const cacheKey = `${cc}:${norm}`;
  if (_zipCache.has(cacheKey)) return _zipCache.get(cacheKey);

  let result;
  try {
    if (cc === 'BR') {
      if (norm.length !== 8) {
        result = { ok: false, error: 'invalid_format', zip: norm };
      } else {
        const r = await fetch(`https://viacep.com.br/ws/${norm}/json/`);
        if (!r.ok) result = { ok: false, error: 'network_error', zip: norm };
        else {
          const d = await r.json();
          if (d.erro) result = { ok: false, error: 'zip_not_found', zip: norm };
          else result = {
            ok: true,
            address: d.logradouro || '',
            city: d.localidade || '',
            state: d.uf || '',
            state_full: d.uf || '',
            country: 'BR',
            zip: d.cep || norm,
            raw: d,
          };
        }
      }
    } else {
      const r = await fetch(`https://api.zippopotam.us/${cc.toLowerCase()}/${encodeURIComponent(norm)}`);
      if (r.status === 404) result = { ok: false, error: 'zip_not_found', zip: norm };
      else if (!r.ok) result = { ok: false, error: 'network_error', zip: norm };
      else {
        const d = await r.json();
        const place = (d.places && d.places[0]) || {};
        result = {
          ok: true,
          address: '',
          city: place['place name'] || '',
          state: place['state abbreviation'] || place['state'] || '',
          state_full: place['state'] || '',
          country: d['country abbreviation'] || cc,
          zip: d['post code'] || norm,
          raw: d,
        };
      }
    }
  } catch (e) {
    result = { ok: false, error: 'network_error', zip: norm };
  }

  _zipCache.set(cacheKey, result);
  return result;
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
  // Removido fbq Lead + gtag generate_lead — tool unlock genérico não é compra.
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

let _liveCountdownInterval=null;
function _startLiveCountdown(){
  if(_liveCountdownInterval) clearInterval(_liveCountdownInterval);
  const target=new Date('2026-06-01T13:30:00Z').getTime(); // 01/06/2026 · 9:30 ET = 13:30 UTC
  function _update(){
    const now=Date.now();
    const diff=target-now;
    if(diff<=0){
      const el=document.getElementById('live-countdown');
      if(el) el.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:16px;font-size:14px;font-weight:700;color:var(--green);">🔴 Live Now!</div>';
      clearInterval(_liveCountdownInterval);
      return;
    }
    const d=Math.floor(diff/86400000);
    const h=Math.floor((diff%86400000)/3600000);
    const m=Math.floor((diff%3600000)/60000);
    const s=Math.floor((diff%60000)/1000);
    const el=id=>document.getElementById(id);
    if(el('lv-cd-days')) el('lv-cd-days').textContent=String(d).padStart(2,'0');
    if(el('lv-cd-hours')) el('lv-cd-hours').textContent=String(h).padStart(2,'0');
    if(el('lv-cd-mins')) el('lv-cd-mins').textContent=String(m).padStart(2,'0');
    if(el('lv-cd-secs')) el('lv-cd-secs').textContent=String(s).padStart(2,'0');
  }
  _update();
  _liveCountdownInterval=setInterval(_update,1000);
}

function showLiveGatePreview(){
  const gateEl=document.getElementById('live-gate');
  const roomEl=document.getElementById('live-room');
  const contentEl=document.getElementById('live-gate-content');
  const staticEl=document.getElementById('live-gate-static');
  if(!gateEl||!roomEl||!contentEl) return;
  gateEl.classList.remove('hide'); roomEl.classList.add('hide');
  const hasToken=!!localStorage.getItem('mc-user-auth');
  if(!hasToken){
    if(staticEl) staticEl.style.display='none';
    contentEl.innerHTML=buildProGateAnon('live');
  } else {
    if(staticEl) staticEl.style.display='';
    contentEl.innerHTML=`<div class="lg-loading"><span>${t('live_checking_access')||'Checking access...'}</span></div>`;
  }
}

async function checkLoyaltyAndShowLive(forceCheck = false) {
  const gateEl = document.getElementById('live-gate');
  const roomEl = document.getElementById('live-room');
  const contentEl = document.getElementById('live-gate-content');
  if(!gateEl||!roomEl) return;

  // Check access: VIP, subscription, or 1 approved loyalty proof
  let hasAccess = false;
  if(currentUser && currentProfile){
    if(currentProfile.analysis_vip===true) hasAccess=true;
    if(!hasAccess){
      try{
        const{data}=await db.from('subscriptions').select('status').eq('user_id',currentUser.id).in('status',['active','trialing']).limit(1);
        if(data&&data.length>0) hasAccess=true;
      }catch(e){}
    }
    if(!hasAccess){
      const history=getLoyaltyHistory();
      const approved=history.filter(h=>h.status==='approved').length;
      if(approved>=1) hasAccess=true;
    }
  }

  if(hasAccess){
    gateEl.classList.add('hide');
    roomEl.classList.remove('hide');
    document.getElementById('lv-viewers').textContent=Math.floor(Math.random()*40+10);
    // Countdown to April 20, 2026
    _startLiveCountdown();
    return;
  }

  // Blocked — show gate
  gateEl.classList.remove('hide');
  roomEl.classList.add('hide');

  if(!contentEl) return;
  const staticEl=document.getElementById('live-gate-static');

  if(!isAuthed()){
    // Not logged in or unverified — show full Pro gate, hide static header
    if(staticEl) staticEl.style.display='none';
    contentEl.innerHTML=buildProGateAnon('live');
  } else {
    // Logged in, no access — show Pro gate with checkout, hide static header
    if(staticEl) staticEl.style.display='none';
    contentEl.innerHTML=buildProGate('compact');
  }
}

/* BOT */
let botOpen=false;
// BOT_SYSTEM moved server-side to api/bot.js — never expose prompt to client
const BOT_STORE_KEY='mc_bot_hist';
const BOT_TTL=48*60*60*1000; // 48h
function loadBotHist(){
  try{
    const raw=localStorage.getItem(BOT_STORE_KEY);
    if(!raw) return [];
    const {ts,msgs}=JSON.parse(raw);
    if(Date.now()-ts>BOT_TTL){localStorage.removeItem(BOT_STORE_KEY);return [];}
    return Array.isArray(msgs)?msgs:[];
  }catch(e){return [];}
}
function saveBotHist(){
  try{
    const slim=botHist.slice(-20);
    localStorage.setItem(BOT_STORE_KEY,JSON.stringify({ts:Date.now(),msgs:slim}));
  }catch(e){}
}
const botHist=loadBotHist();
let _askingName=false;
function getTraderName(){
  let n=localStorage.getItem('mc_trader_name')||'';
  if(!n && typeof _currentUser!=='undefined' && _currentUser){
    n=(_currentUser.user_metadata?.name||_currentUser.user_metadata?.full_name||'').trim().split(/\s+/)[0]||'';
    if(n) localStorage.setItem('mc_trader_name',n);
  }
  return n;
}
let _botRestored=false;
function toggleBot(){
  botOpen=!botOpen;
  document.getElementById('bot-win').classList.toggle('open',botOpen);
  const fab=document.getElementById('bot-fab');if(fab)fab.style.display=botOpen?'none':'flex';
  if(botOpen){
    document.getElementById('bot-badge').style.display='none';
    document.getElementById('bot-inp').focus();
    const name=getTraderName();
    // Restore saved conversation on first open
    if(!_botRestored && botHist.length>0){
      _botRestored=true;
      botHist.forEach(m=>addBMsg(m.role==='user'?'usr':'bot',m.content));
      document.getElementById('bot-quick').style.display='none';
    }else if(!_botRestored){
      _botRestored=true;
    }
    const welcomeEl=document.querySelector('#bot-msgs .bmsg.bot .bbbl[data-i18n="bot_welcome"], #bot-msgs .bmsg.bot .bbbl');
    if(!name){
      _askingName=true;
    }else if(welcomeEl && botHist.length===0){
      // Mantém data-i18n + data-bot-name pra que setL re-traduza + reinterpola nome
      welcomeEl.setAttribute('data-i18n','bot_welcome_back');
      welcomeEl.setAttribute('data-bot-name',name);
      welcomeEl.innerHTML=(t('bot_welcome_back')||'Fala, {name}!').replace(/\{name\}/g,name);
    }
  }
  track('bot_toggle',{state:botOpen?'open':'close'});
}
function openBot(){botOpen=false;toggleBot();}
const BOT_QUICK_ANSWERS={
  'bot_q_coupons':{
    pt:`Sim! Esses são os cupons ativos agora:\n\n**APEX** — cupom **MARKET** → 90% OFF vitalício (25K sai por $19.90)\n**BULENOX** — cupom **MARKET89** → 89% OFF vitalício (25K sai por $15.95)\n**EARN2TRADE** — cupom **MARKETSCOUPONS** → 60% OFF\n**FUNDEDNEXT** — cupom **FLEX** → 47% OFF\n**CTI** — cupom **APR30** → 30% OFF\n**FUNDINGPIPS** — cupom **HELLO** → 20% OFF\n**BRIGHTFUNDED** — cupom na aba Firmas → 20% OFF\n**E8 MARKETS** — cupom **MARKET** → 10% OFF\n**FTMO** e **THE5ERS** não tem cupom, mas oferecem trial grátis.\n\nTodos na aba **Ofertas** com link direto.`,
    en:`Yes! Here are the active coupons right now:\n\n**APEX** — coupon **MARKET** → 90% OFF lifetime (25K for $19.90)\n**BULENOX** — coupon **MARKET89** → 89% OFF lifetime (25K for $15.95)\n**EARN2TRADE** — coupon **MARKETSCOUPONS** → 60% OFF\n**FUNDEDNEXT** — coupon **FLEX** → 47% OFF\n**CTI** — coupon **APR30** → 30% OFF\n**FUNDINGPIPS** — coupon **HELLO** → 20% OFF\n**BRIGHTFUNDED** — coupon on Firms tab → 20% OFF\n**E8 MARKETS** — coupon **MARKET** → 10% OFF\n**FTMO** and **THE5ERS** have no coupon but offer a free trial.\n\nAll on the **Offers** tab with direct links.`,
    es:`¡Sí! Estos son los cupones activos ahora:\n\n**APEX** — cupón **MARKET** → 90% OFF vitalicio (25K por $19.90)\n**BULENOX** — cupón **MARKET89** → 89% OFF vitalicio\n**EARN2TRADE** — cupón **MARKETSCOUPONS** → 60% OFF\n**FUNDEDNEXT** — cupón **FLEX** → 47% OFF\n**CTI** — cupón **APR30** → 30% OFF\n**FUNDINGPIPS** — cupón **HELLO** → 20% OFF\n**BRIGHTFUNDED** — cupón en pestaña Firmas → 20% OFF\n**E8 MARKETS** — cupón **MARKET** → 10% OFF\n**FTMO** y **THE5ERS** no tienen cupón pero ofrecen prueba gratis.\n\nTodo en la pestaña **Ofertas**.`,
    it:`Sì! Ecco i coupon attivi adesso:\n\n**APEX** — coupon **MARKET** → 90% OFF a vita (25K a $19.90)\n**BULENOX** — coupon **MARKET89** → 89% OFF a vita\n**EARN2TRADE** — coupon **MARKETSCOUPONS** → 60% OFF\n**FUNDEDNEXT** — coupon **FLEX** → 47% OFF\n**CTI** — coupon **APR30** → 30% OFF\n**FUNDINGPIPS** — coupon **HELLO** → 20% OFF\n**BRIGHTFUNDED** — coupon nella scheda Firme → 20% OFF\n**E8 MARKETS** — coupon **MARKET** → 10% OFF\n**FTMO** e **THE5ERS** non hanno coupon ma offrono prova gratuita.\n\nTutto nella scheda **Offerte**.`,
    fr:`Oui ! Voici les coupons actifs maintenant :\n\n**APEX** — coupon **MARKET** → 90% OFF à vie (25K à $19.90)\n**BULENOX** — coupon **MARKET89** → 89% OFF à vie\n**EARN2TRADE** — coupon **MARKETSCOUPONS** → 60% OFF\n**FUNDEDNEXT** — coupon **FLEX** → 47% OFF\n**CTI** — coupon **APR30** → 30% OFF\n**FUNDINGPIPS** — coupon **HELLO** → 20% OFF\n**BRIGHTFUNDED** — coupon dans l'onglet Firmes → 20% OFF\n**E8 MARKETS** — coupon **MARKET** → 10% OFF\n**FTMO** et **THE5ERS** n'ont pas de coupon mais offrent un essai gratuit.\n\nTout dans l'onglet **Offres**.`,
    de:`Ja! Hier sind die aktiven Coupons:\n\n**APEX** — Coupon **MARKET** → 90% OFF lebenslang (25K für $19.90)\n**BULENOX** — Coupon **MARKET89** → 89% OFF lebenslang\n**EARN2TRADE** — Coupon **MARKETSCOUPONS** → 60% OFF\n**FUNDEDNEXT** — Coupon **FLEX** → 47% OFF\n**CTI** — Coupon **APR30** → 30% OFF\n**FUNDINGPIPS** — Coupon **HELLO** → 20% OFF\n**BRIGHTFUNDED** — Coupon im Tab Firmen → 20% OFF\n**E8 MARKETS** — Coupon **MARKET** → 10% OFF\n**FTMO** und **THE5ERS** haben keinen Coupon, bieten aber eine kostenlose Testversion.\n\nAlles im Tab **Angebote**.`,
    ar:`نعم! هذه الكوبونات النشطة الآن:\n\n**APEX** — كوبون **MARKET** → 90% خصم مدى الحياة (25K بـ $19.90)\n**BULENOX** — كوبون **MARKET89** → 89% خصم مدى الحياة\n**EARN2TRADE** — كوبون **MARKETSCOUPONS** → 60% خصم\n**FUNDEDNEXT** — كوبون **FLEX** → 30% خصم\n**CTI** — كوبون **APR30** → 30% خصم\n**FUNDINGPIPS** — كوبون **HELLO** → 20% خصم\n**BRIGHTFUNDED** — كوبون في تبويب الشركات → 20% خصم\n**E8 MARKETS** — كوبون **MARKET** → 10% خصم\n**FTMO** و **THE5ERS** بدون كوبون لكن يوفرون تجربة مجانية.\n\nالكل في تبويب **العروض**.`
  },
  'bot_q_firm':{
    pt:`Depende do teu perfil. Vou direto ao ponto:\n\n**Futures com maior desconto?** Apex — cupom **MARKET**, 90% OFF vitalício. 25K por $19.90. 100% profit split.\n\n**Forex com melhor split?** FundedNext — 95% split, cupom **FLEX** 47% OFF. Ou The5ers — 100% split, scaling até $4M.\n\n**Menor preço pra começar?** CTI tem conta de $1. Bulenox 25K por $15.95.\n\n**Sem regra de consistência?** Bulenox e Apex.\n\n**Pra decidir melhor:** vai na aba **Quiz** (6 perguntas e te recomendo a ideal) ou **Comparator** pra colocar lado a lado.`,
    en:`Depends on your profile. Straight to the point:\n\n**Futures with biggest discount?** Apex — coupon **MARKET**, 90% OFF lifetime. 25K for $19.90. 100% profit split.\n\n**Forex with best split?** FundedNext — 95% split, coupon **FLEX** 47% OFF. Or The5ers — 100% split, scaling to $4M.\n\n**Cheapest to start?** CTI has a $1 account. Bulenox 25K for $15.95.\n\n**No consistency rule?** Bulenox and Apex.\n\n**To decide better:** go to the **Quiz** tab (6 questions, I'll recommend the best fit) or **Comparator** to compare side by side.`,
    es:`Depende de tu perfil. Directo al grano:\n\n**Futures con mayor descuento?** Apex — cupón **MARKET**, 90% OFF vitalicio. 25K por $19.90. 100% profit split.\n\n**Forex con mejor split?** FundedNext — 95% split, cupón **FLEX** 47% OFF. O The5ers — 100% split, scaling hasta $4M.\n\n**Más barato para empezar?** CTI tiene cuenta de $1. Bulenox 25K por $15.95.\n\n**Sin regla de consistencia?** Bulenox y Apex.\n\n**Para decidir mejor:** ve a la pestaña **Quiz** o al **Comparador**.`,
    it:`Dipende dal tuo profilo. Dritto al punto:\n\n**Futures con più sconto?** Apex — coupon **MARKET**, 90% OFF a vita. 25K a $19.90. 100% profit split.\n\n**Forex con miglior split?** FundedNext — 95% split, coupon **FLEX** 47% OFF. O The5ers — 100% split, scaling fino a $4M.\n\n**Più economico per iniziare?** CTI ha un conto da $1. Bulenox 25K a $15.95.\n\n**Senza regola di consistenza?** Bulenox e Apex.\n\n**Per decidere meglio:** vai alla scheda **Quiz** o al **Comparatore**.`,
    fr:`Ça dépend de ton profil. Droit au but :\n\n**Futures avec plus de réduction ?** Apex — coupon **MARKET**, 90% OFF à vie. 25K à $19.90. 100% profit split.\n\n**Forex avec meilleur split ?** FundedNext — 95% split, coupon **FLEX** 47% OFF. Ou The5ers — 100% split, scaling jusqu'à $4M.\n\n**Le moins cher pour démarrer ?** CTI a un compte à $1. Bulenox 25K à $15.95.\n\n**Sans règle de consistance ?** Bulenox et Apex.\n\n**Pour mieux choisir :** va dans l'onglet **Quiz** ou le **Comparateur**.`,
    de:`Kommt auf dein Profil an. Direkt zur Sache:\n\n**Futures mit größtem Rabatt?** Apex — Coupon **MARKET**, 90% OFF lebenslang. 25K für $19.90. 100% Profit Split.\n\n**Forex mit bestem Split?** FundedNext — 95% Split, Coupon **FLEX** 47% OFF. Oder The5ers — 100% Split, Scaling bis $4M.\n\n**Am günstigsten starten?** CTI hat ein Konto ab $1. Bulenox 25K für $15.95.\n\n**Ohne Konsistenzregel?** Bulenox und Apex.\n\n**Für bessere Entscheidung:** geh zum **Quiz**-Tab oder zum **Vergleich**.`,
    ar:`يعتمد على ملفك. مباشرة للنقطة:\n\n**عقود مستقبلية بأكبر خصم؟** Apex — كوبون **MARKET**، 90% خصم مدى الحياة. 25K بـ $19.90.\n\n**فوركس بأفضل سبليت؟** FundedNext — 95% سبليت، كوبون **FLEX** 30% خصم. أو The5ers — 100% سبليت.\n\n**أرخص للبداية؟** CTI حساب بـ $1. Bulenox 25K بـ $15.95.\n\n**بدون قاعدة اتساق؟** Bulenox و Apex.\n\n**لاتخاذ قرار أفضل:** روح تبويب **الاختبار** أو **المقارنة**.`
  },
  'bot_q_risk':{
    pt:`As dicas mais importantes pra passar na avaliação:\n\n**1. Gestão de risco acima de tudo.** Use a aba **Position Size Calculator** pra calcular o lote certo. Nunca arrisque mais de 1-2% por trade.\n\n**2. Conheça as regras da sua firma.** Cada uma tem drawdown diferente (trailing, EOD, fixo). Se não souber a diferença, vai na aba **Guides**.\n\n**3. Tenha um plano antes de operar.** Horários, ativos, setup — tudo definido antes de abrir o trade. Sem improviso.\n\n**4. Não tente fazer a meta em 1 dia.** Consistência vale mais que um trade home run. Várias firmas exigem mínimo de dias.\n\n**5. Fique atento ao calendário econômico.** Eventos 3 estrelas movem o mercado. Use a aba **Economic Calendar** pra não ser pego de surpresa.\n\nA aba **Guides** tem material completo sobre cada tópico.`,
    en:`Key tips to pass the evaluation:\n\n**1. Risk management above all.** Use the **Position Size Calculator** tab to calculate the right lot size. Never risk more than 1-2% per trade.\n\n**2. Know your firm's rules.** Each one has different drawdown (trailing, EOD, fixed). Check the **Guides** tab if unsure.\n\n**3. Have a plan before trading.** Hours, assets, setup — all defined before opening a trade. No improvising.\n\n**4. Don't try to hit the target in 1 day.** Consistency matters more than a home run trade. Many firms require minimum days.\n\n**5. Watch the economic calendar.** 3-star events move the market. Use the **Economic Calendar** tab to stay prepared.\n\nThe **Guides** tab has complete material on each topic.`,
    es:`Tips clave para pasar la evaluación:\n\n**1. Gestión de riesgo ante todo.** Usa la pestaña **Position Size**. Nunca arriesgues más del 1-2% por trade.\n\n**2. Conoce las reglas de tu firma.** Cada una tiene drawdown diferente. Revisa la pestaña **Guías**.\n\n**3. Ten un plan antes de operar.** Sin improvisar.\n\n**4. No intentes la meta en 1 día.** Consistencia > home run.\n\n**5. Vigila el calendario económico.** Eventos 3 estrellas mueven el mercado. Usa **Calendario Económico**.\n\nLa pestaña **Guías** tiene material completo.`,
    it:`Consigli chiave per superare la valutazione:\n\n**1. Gestione del rischio prima di tutto.** Usa la scheda **Position Size Calculator**. Mai rischiare più dell'1-2% per trade.\n\n**2. Conosci le regole della tua firma.** Ogni una ha drawdown diverso. Controlla la scheda **Guide**.\n\n**3. Avere un piano prima di operare.** Niente improvvisazione.\n\n**4. Non cercare di raggiungere il target in 1 giorno.** La consistenza vale più di un trade da home run.\n\n**5. Controlla il calendario economico.** Eventi 3 stelle muovono il mercato.\n\nLa scheda **Guide** ha materiale completo.`,
    fr:`Conseils clés pour réussir l'évaluation :\n\n**1. Gestion du risque avant tout.** Utilise l'onglet **Position Size Calculator**. Ne risque jamais plus de 1-2% par trade.\n\n**2. Connais les règles de ta firme.** Chaque une a un drawdown différent. Vérifie l'onglet **Guides**.\n\n**3. Aie un plan avant de trader.** Pas d'improvisation.\n\n**4. Ne tente pas le target en 1 jour.** La consistance vaut plus qu'un home run.\n\n**5. Surveille le calendrier économique.** Les événements 3 étoiles bougent le marché.\n\nL'onglet **Guides** a du matériel complet.`,
    de:`Wichtige Tipps für die Evaluation:\n\n**1. Risikomanagement über alles.** Nutze den **Position Size Calculator** Tab. Nie mehr als 1-2% pro Trade riskieren.\n\n**2. Kenne die Regeln deiner Firma.** Jede hat unterschiedliches Drawdown. Prüfe den **Leitfäden** Tab.\n\n**3. Habe einen Plan vor dem Trading.** Kein Improvisieren.\n\n**4. Versuche nicht, das Ziel an 1 Tag zu erreichen.** Konsistenz zählt mehr als ein Home Run.\n\n**5. Achte auf den Wirtschaftskalender.** 3-Sterne-Events bewegen den Markt.\n\nDer **Leitfäden** Tab hat vollständiges Material.`,
    ar:`نصائح أساسية لاجتياز التقييم:\n\n**1. إدارة المخاطر فوق كل شيء.** استخدم تبويب **حاسبة حجم المركز**. لا تخاطر بأكثر من 1-2% في كل صفقة.\n\n**2. اعرف قواعد شركتك.** كل واحدة لها drawdown مختلف. راجع تبويب **الأدلة**.\n\n**3. خطط قبل التداول.** بدون ارتجال.\n\n**4. لا تحاول تحقيق الهدف في يوم واحد.** الاتساق أهم.\n\n**5. راقب التقويم الاقتصادي.** أحداث 3 نجوم تحرك السوق.\n\nتبويب **الأدلة** فيه محتوى كامل.`
  },
  'bot_q_tips':{
    pt:`As regras variam por firma, mas essas são universais — quebre uma e perde a conta:\n\n**1. Drawdown máximo.** Pode ser trailing (acompanha seu lucro), EOD (calcula no fim do dia) ou fixo. Entenda qual a sua firma usa. Perde a conta se ultrapassar.\n\n**2. Meta de lucro.** Geralmente 6-10% do tamanho da conta. Sem atingir, não passa.\n\n**3. Dias mínimos de trading.** Apex: 1 dia. Earn2Trade: 10 dias. Não adianta bater a meta em 1 trade se a firma exige 10 dias.\n\n**4. Proibições comuns:** copy trading entre contas, arbitragem de latência, manipulação de mercado. Cada firma tem sua lista.\n\n**5. News trading.** Apex e Bulenox permitem. FTMO e Earn2Trade **não**. Operar em CPI/NFP sem saber disso = ban.\n\nNa aba **Firms**, cada firma tem todas as regras detalhadas.`,
    en:`Rules vary by firm, but these are universal — break one and you lose the account:\n\n**1. Max drawdown.** Can be trailing (follows your profit), EOD (calculated at end of day), or fixed. Understand which your firm uses. Exceeding it = account lost.\n\n**2. Profit target.** Usually 6-10% of account size. Must hit it to pass.\n\n**3. Minimum trading days.** Apex: 1 day. Earn2Trade: 10 days No point hitting target in 1 trade if firm requires 10 days.\n\n**4. Common bans:** copy trading between accounts, latency arbitrage, market manipulation.\n\n**5. News trading.** Apex and Bulenox allow it. FTMO and Earn2Trade **don't**. Trading CPI/NFP without knowing this = ban.\n\nOn the **Firms** tab, each firm has all rules detailed.`,
    es:`Las reglas varían por firma, pero estas son universales — rompe una y pierdes la cuenta:\n\n**1. Drawdown máximo.** Trailing, EOD o fijo. Entiende cuál usa tu firma.\n\n**2. Meta de lucro.** Generalmente 6-10%. Sin alcanzarla, no pasas.\n\n**3. Días mínimos.** Apex: 1. Earn2Trade: 10.\n\n**4. Prohibiciones:** copy trading, arbitraje de latencia, manipulación.\n\n**5. News trading.** Apex y Bulenox sí. FTMO y Earn2Trade **no**.\n\nEn la pestaña **Firmas** están todas las reglas detalladas.`,
    it:`Le regole variano per firma, ma queste sono universali — violane una e perdi il conto:\n\n**1. Drawdown massimo.** Può essere trailing, EOD o fisso. Capire quale usa la tua firma.\n\n**2. Target di profitto.** Di solito 6-10%. Devi raggiungerlo per passare.\n\n**3. Giorni minimi.** Apex: 1. Earn2Trade: 10.\n\n**4. Divieti comuni:** copy trading, arbitraggio di latenza, manipolazione.\n\n**5. News trading.** Apex e Bulenox lo permettono. FTMO e Earn2Trade **no**.\n\nNella scheda **Firme** ci sono tutte le regole dettagliate.`,
    fr:`Les règles varient par firme, mais celles-ci sont universelles — enfreindre une et tu perds le compte :\n\n**1. Drawdown maximum.** Trailing, EOD ou fixe. Comprends lequel ta firme utilise.\n\n**2. Objectif de profit.** Généralement 6-10%. Tu dois l'atteindre pour passer.\n\n**3. Jours minimum.** Apex : 1. Earn2Trade : 10.\n\n**4. Interdictions :** copy trading, arbitrage de latence, manipulation.\n\n**5. News trading.** Apex et Bulenox oui. FTMO et Earn2Trade **non**.\n\nDans l'onglet **Firmes** tu trouveras toutes les règles détaillées.`,
    de:`Regeln variieren pro Firma, aber diese sind universal — brich eine und du verlierst das Konto:\n\n**1. Maximales Drawdown.** Trailing, EOD oder fest. Verstehe, welches deine Firma nutzt.\n\n**2. Gewinnziel.** Meist 6-10%. Musst es erreichen.\n\n**3. Mindesttage.** Apex: 1. Earn2Trade: 10.\n\n**4. Verbote:** Copy Trading, Latenz-Arbitrage, Manipulation.\n\n**5. News Trading.** Apex und Bulenox ja. FTMO und Earn2Trade **nein**.\n\nIm Tab **Firmen** findest du alle Regeln im Detail.`,
    ar:`القواعد تختلف حسب الشركة، لكن هذه عالمية — اكسر واحدة وتخسر الحساب:\n\n**1. أقصى drawdown.** Trailing أو EOD أو ثابت. افهم أي نوع تستخدمه شركتك.\n\n**2. هدف الربح.** عادة 6-10%. لازم توصله.\n\n**3. أيام تداول minimum.** Apex: 1. Earn2Trade: 10.\n\n**4. ممنوعات:** copy trading، latency arbitrage، تلاعب بالسوق.\n\n**5. News trading.** Apex و Bulenox يسمحون. FTMO و Earn2Trade **لا**.\n\nفي تبويب **الشركات** كل القواعد بالتفصيل.`
  }
};
function getQuickAnswer(qKey){
  const lang=typeof _currentLang!=='undefined'?_currentLang:'en';
  const a=BOT_QUICK_ANSWERS[qKey];
  if(!a)return null;
  return a[lang]||a.en||a.pt||null;
}
function qmsg(txt,qKey){
  _askingName=false;
  const quick=qKey?getQuickAnswer(qKey):null;
  document.getElementById('bot-quick').style.display='none';
  addBMsg('usr',txt);
  if(quick){
    setTimeout(()=>addBMsg('bot',quick),300);
    track('bot_quick_msg',{message:txt.slice(0,50),source:'preset'});
  }else{
    document.getElementById('bot-inp').value=txt;
    sendBot();
    track('bot_quick_msg',{message:txt.slice(0,50)});
  }
}
function addBMsg(role,text){const c=document.getElementById('bot-msgs');const tm=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});const d=document.createElement('div');d.className='bmsg '+role;const safe=role==='usr'?text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):text;d.innerHTML=`<div class="bbbl">${safe.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div><span class="btime">${tm}</span>`;c.appendChild(d);c.scrollTop=c.scrollHeight;}
async function sendBot(){
  const inp=document.getElementById('bot-inp');const txt=inp.value.trim();if(!txt)return;
  inp.value='';
  if(_askingName){
    const name=txt.replace(/[^\p{L}\p{M}\s'-]/gu,'').trim().split(/\s+/)[0].slice(0,24);
    if(name){
      localStorage.setItem('mc_trader_name',name);
      _askingName=false;
      addBMsg('usr',txt);
      const ack=(t('bot_name_ack')||'Prazer, {name}! Bora.').replace('{name}',name);
      setTimeout(()=>{addBMsg('bot',ack);const q=document.getElementById('bot-quick');if(q)q.style.display='';},300);
      track('bot_name_set',{});
      return;
    }
  }
  document.getElementById('bot-snd').disabled=true;document.getElementById('bot-quick').style.display='none';
  addBMsg('usr',txt);botHist.push({role:'user',content:txt});saveBotHist();
  const bw=document.getElementById('bot-win');bw&&bw.classList.add('typing');
  const ty=document.getElementById('bot-typing');ty.classList.add('show');document.getElementById('bot-msgs').scrollTop=99999;
  const traderName=getTraderName();
  const geo=(typeof _geo!=='undefined'&&_geo)?`${_geo.geo_country||''}${_geo.geo_region?', '+_geo.geo_region:''}`.trim():'';
  const errMsg={pt:'Eita, deu ruim aqui. Tenta de novo?',en:'Oops, something went wrong. Try again?',es:'Ups, algo falló. ¿Intentas de nuevo?'};
  const userLang=typeof _currentLang!=='undefined'?_currentLang:'en';
  const friendlyErr=errMsg[userLang]||errMsg.en;
  try{const res=await fetch('/api/bot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:botHist,lang:userLang,traderName:traderName||undefined,geo:geo||undefined})});const data=await res.json();ty.classList.remove('show');bw&&bw.classList.remove('typing');const reply=data.content?.[0]?.text||(data.error?friendlyErr:friendlyErr);botHist.push({role:'assistant',content:reply});saveBotHist();addBMsg('bot',reply);track('bot_message',{user_msg:txt.slice(0,50),response_len:reply.length});}catch(e){ty.classList.remove('show');bw&&bw.classList.remove('typing');addBMsg('bot',friendlyErr);}
  document.getElementById('bot-snd').disabled=false;
}

/* TOAST */
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300);}

/* TOOLS */
const TOOLS=[{id:'orderflow',name:'Order Flow Analyzer',badge:'Gratis',badgeColor:'var(--green)',badgeBg:'var(--gnbg)',desc:'Analise o fluxo de ordens. Identifique acumulacao e distribuicao institucional.'},{id:'dashboard',name:'Prop Firm Dashboard',badge:'Premium',badgeColor:'var(--gold)',badgeBg:'var(--gbg)',desc:'Monitore drawdown, lucro e dias de operacao em tempo real.'},{id:'journal',name:'Trade Journal',badge:'Gratis',badgeColor:'var(--green)',badgeBg:'var(--gnbg)',desc:'Registre e analise cada operacao. Identifique padroes e melhore sua performance.'},{id:'backtester',name:'Backtester Pro',badge:'Premium',badgeColor:'var(--gold)',badgeBg:'var(--gbg)',desc:'Simule estrategias. Calcule win rate, profit factor e max drawdown.'},{id:'alerts',name:'Alert Manager',badge:'Gratis',badgeColor:'var(--green)',badgeBg:'var(--gnbg)',desc:'Configure alertas de preco e drawdown via Telegram ou e-mail.'},{id:'ninjapack',name:'NinjaTrader Pack',badge:'VIP',badgeColor:'#A855F7',badgeBg:'rgba(168,85,247,.1)',desc:'Pack com 15 indicadores otimizados para prop firms. NinjaTrader 8.'}];
function renderIndHub(){const g=document.getElementById('ind-hub-grid');if(!g)return;g.innerHTML=TOOLS.map(tool=>`<div class="ic" onclick="openTool('${tool.id}')"><div class="ic-top"><div class="ic-ico"></div><span class="ic-badge" style="background:${tool.badgeBg};color:${tool.badgeColor};">${tool.badge}</span></div><div class="ic-name">${tool.name}</div><div class="ic-desc">${tool.desc}</div><button class="ic-btn">${t('plat_acessar')}</button></div>`).join('');}
function openTool(id){const t=TOOLS.find(x=>x.id===id);if(!t)return;const unlocked=isUnlocked(id);const inner=document.getElementById('tool-modal-inner');inner.innerHTML=`<div class="tm-hd"><div class="tm-title">${t.name} <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${t.badgeBg};color:${t.badgeColor};font-weight:700;">${t.badge}</span></div><button class="tm-x" onclick="closeTool()">x</button></div><div class="tm-body" id="tm-body">${unlocked?renderToolContent(id):renderLeadGate(id,t)}</div>`;document.getElementById('tool-ov').classList.add('open');document.getElementById('tool-modal').classList.add('open');document.body.style.overflow='hidden';track('tool_open',{tool_id:id,tool_name:t.name,unlocked});}
function closeTool(){document.getElementById('tool-ov').classList.remove('open');document.getElementById('tool-modal').classList.remove('open');document.body.style.overflow='';track('tool_close');}
function renderLeadGate(toolId,tool){return`<div class="lead-gate"><div class="lg-ico"></div><div class="lg-title">${t('lg_acesse')} ${tool.name}</div><div class="lg-desc">${tool.desc}<br><br><strong style="color:var(--t1);">${t('lg_cadastre')}</strong></div><div class="lg-form"><div class="lg-field"><label>${t('lg_nome')}</label><input type="text" id="lg-name-${toolId}" placeholder="${t('lg_nome')}"></div><div class="lg-field"><label>E-mail</label><input type="email" id="lg-email-${toolId}" placeholder="email@example.com"></div><div class="lg-field"><label>WhatsApp</label><input type="tel" id="lg-wa-${toolId}" placeholder="+1 555 123-4567"></div><label class="lg-consent"><input type="checkbox" id="lg-consent-${toolId}"> <span>${t('consent_label')}</span></label><button class="lg-sub" onclick="submitLead('${toolId}')">${t('lg_desbloquear')}</button><div class="lg-note">${t('lg_privacidade')}</div></div></div>`;}
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
function resetPF(){localStorage.removeItem('mc_pf_config');document.getElementById('tm-body').innerHTML=renderToolContent('dashboard');track('dashboard_reset');}
function renderJournal(){const trades=JSON.parse(localStorage.getItem('mc_journal')||'[]');const totalPnl=trades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);const wins=trades.filter(t=>parseFloat(t.pnl)>0).length;const wr=trades.length?(wins/trades.length*100).toFixed(0):0;return`<div class="tool-grid-2" style="margin-bottom:14px;"><div class="tool-card"><div class="tc-lbl">Trades</div><div class="tc-val">${trades.length}</div></div><div class="tool-card"><div class="tc-lbl">Win Rate</div><div class="tc-val ${wr>=50?'g':'r'}">${wr}%</div></div><div class="tool-card"><div class="tc-lbl">P&L Total</div><div class="tc-val ${totalPnl>=0?'g':'r'}">${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}</div></div><div class="tool-card"><div class="tc-lbl">Media</div><div class="tc-val">${trades.length?'$'+(totalPnl/trades.length).toFixed(2):'—'}</div></div></div><div class="inp-row" style="margin-bottom:12px;"><input class="inp-sm" id="jn-sym" placeholder="Simbolo" style="max-width:100px;"><select class="inp-sm" id="jn-dir" style="max-width:90px;"><option>Long</option><option>Short</option></select><input class="inp-sm" id="jn-pnl" type="number" placeholder="P&L ($)"><input class="inp-sm" id="jn-note" placeholder="Notas"><button class="btn-sm" onclick="addJTrade()">+ Adicionar</button></div>${trades.length?`<div style="overflow-x:auto;"><table class="tbl-tool"><thead><tr><th>Data</th><th>Simbolo</th><th>Dir</th><th>P&L</th><th>Notas</th><th></th></tr></thead><tbody>${[...trades].reverse().slice(0,10).map((t,i)=>`<tr><td style="color:var(--t3);">${new Date(t.ts).toLocaleDateString('pt-BR')}</td><td style="font-weight:700;">${escHtml(t.sym)}</td><td><span style="padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;background:${t.dir==='Long'?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)'};color:${t.dir==='Long'?'var(--green)':'var(--red)'};">${escHtml(t.dir)}</span></td><td style="font-weight:700;color:${parseFloat(t.pnl)>=0?'var(--green)':'var(--red)'};">${parseFloat(t.pnl)>=0?'+':''}$${parseFloat(t.pnl).toFixed(2)}</td><td style="color:var(--t3);font-size:11px;">${escHtml(t.note)}</td><td><button onclick="deleteJTrade(${trades.length-1-i})" style="background:none;border:none;color:var(--t3);cursor:pointer;">x</button></td></tr>`).join('')}</tbody></table></div><div style="margin-top:10px;display:flex;gap:8px;"><button class="btn-sm-out" onclick="exportJournal()">Exportar CSV</button><button class="btn-sm-out" style="color:var(--red);" onclick="clearJournal()">Limpar</button></div>`:'<div style="text-align:center;padding:30px;color:var(--t3);">Nenhuma operacao registrada ainda.</div>'}`;}
function addJTrade(){const sym=(document.getElementById('jn-sym')?.value||'').trim().toUpperCase();const dir=document.getElementById('jn-dir')?.value||'Long';const pnl=document.getElementById('jn-pnl')?.value;const note=(document.getElementById('jn-note')?.value||'').trim();if(!sym||!pnl){showToast(t('toast_preencha_simbolo_pnl'));return;}const trades=JSON.parse(localStorage.getItem('mc_journal')||'[]');trades.push({sym,dir,pnl:parseFloat(pnl),note,ts:new Date().toISOString()});localStorage.setItem('mc_journal',JSON.stringify(trades));document.getElementById('tm-body').innerHTML=renderToolContent('journal');track('journal_add_trade',{symbol:sym,direction:dir,pnl:parseFloat(pnl)});}
function deleteJTrade(idx){const trades=JSON.parse(localStorage.getItem('mc_journal')||'[]');trades.splice(idx,1);localStorage.setItem('mc_journal',JSON.stringify(trades));document.getElementById('tm-body').innerHTML=renderToolContent('journal');track('journal_delete_trade');}
function clearJournal(){localStorage.removeItem('mc_journal');document.getElementById('tm-body').innerHTML=renderToolContent('journal');track('journal_clear');}
function exportJournal(){const trades=JSON.parse(localStorage.getItem('mc_journal')||'[]');if(!trades.length){showToast(t('toast_nenhuma_operacao'));return;}const csv='Data,Simbolo,Direcao,P&L,Notas\n'+trades.map(t=>`${new Date(t.ts).toLocaleDateString('pt-BR')},${t.sym},${t.dir},${t.pnl},"${t.note||''}"`).join('\n');const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='journal.csv';a.click();track('journal_export',{trades_count:trades.length});}
function renderBacktester(){const r=JSON.parse(localStorage.getItem('mc_bt_results')||'null');return`<div style="margin-bottom:16px;"><div style="font-size:13px;font-weight:600;margin-bottom:12px;">Configurar Estrategia</div><div class="inp-row"><div style="flex:1;min-width:110px;"><div style="font-size:10px;color:var(--t3);margin-bottom:4px;">Win Rate (%)</div><input class="inp-sm" id="bt-wr" type="number" value="55" style="width:100%;"></div><div style="flex:1;min-width:110px;"><div style="font-size:10px;color:var(--t3);margin-bottom:4px;">Risco ($)</div><input class="inp-sm" id="bt-risk" type="number" value="200" style="width:100%;"></div><div style="flex:1;min-width:110px;"><div style="font-size:10px;color:var(--t3);margin-bottom:4px;">Retorno ($)</div><input class="inp-sm" id="bt-rew" type="number" value="400" style="width:100%;"></div><div style="flex:1;min-width:110px;"><div style="font-size:10px;color:var(--t3);margin-bottom:4px;">N. Trades</div><input class="inp-sm" id="bt-n" type="number" value="100" style="width:100%;"></div></div><button class="btn-sm" onclick="runBacktest()" style="margin-top:8px;">Simular Estrategia</button></div>${r?renderBTResults(r):'<div style="text-align:center;padding:24px;color:var(--t3);">Configure os parametros e clique em Simular</div>'}`;}
function runBacktest(){const wr=parseFloat(document.getElementById('bt-wr')?.value)/100||.55;const risk=parseFloat(document.getElementById('bt-risk')?.value)||200;const rew=parseFloat(document.getElementById('bt-rew')?.value)||400;const n=parseInt(document.getElementById('bt-n')?.value)||100;let bal=100000;const equity=[100000];let maxBal=100000,maxDD=0,wins=0;for(let i=0;i<n;i++){const win=Math.random()<wr;bal+=win?rew:-risk;if(win)wins++;equity.push(Math.max(0,bal));maxBal=Math.max(maxBal,bal);maxDD=Math.max(maxDD,(maxBal-bal)/maxBal*100);}const r={equity,wins,n,finalBal:bal,maxDD,profitFactor:(wins*rew)/((n-wins)*risk),rr:(rew/risk).toFixed(2),wr:(wr*100).toFixed(0)};localStorage.setItem('mc_bt_results',JSON.stringify(r));document.getElementById('tm-body').innerHTML=renderToolContent('backtester');track('backtest_run',{win_rate:r.wr,trades:n,profit_factor:r.profitFactor.toFixed(2)});}
function renderBTResults(r){const pnl=r.finalBal-100000;const pts=r.equity;const minE=Math.min(...pts),maxE=Math.max(...pts),range=maxE-minE||1,h=140,w=pts.length;return`<div class="bt-stat-grid"><div class="tool-card"><div class="tc-lbl">P&L Final</div><div class="tc-val ${pnl>=0?'g':'r'}">${pnl>=0?'+':''}$${Math.abs(pnl).toLocaleString()}</div></div><div class="tool-card"><div class="tc-lbl">Win Rate</div><div class="tc-val">${r.wr}%</div></div><div class="tool-card"><div class="tc-lbl">Profit Factor</div><div class="tc-val ${r.profitFactor>=1?'g':'r'}">${r.profitFactor.toFixed(2)}</div></div><div class="tool-card"><div class="tc-lbl">Max Drawdown</div><div class="tc-val r">${r.maxDD.toFixed(1)}%</div></div></div><div style="margin-top:14px;"><div style="font-size:11px;color:var(--t3);margin-bottom:6px;">Curva de Equidade Simulada</div><div style="background:var(--card);border:1px solid var(--b1);border-radius:8px;padding:12px;overflow:hidden;"><svg viewBox="0 0 400 ${h}" style="width:100%;height:${h}px;"><defs><linearGradient id="btG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${pnl>=0?'#22C55E':'#EF4444'}" stop-opacity=".3"/><stop offset="100%" stop-color="${pnl>=0?'#22C55E':'#EF4444'}" stop-opacity="0"/></linearGradient></defs><polyline points="${pts.map((v,i)=>`${(i/(w-1)*400).toFixed(1)},${((1-(v-minE)/range)*h).toFixed(0)}`).join(' ')}" fill="none" stroke="${pnl>=0?'#22C55E':'#EF4444'}" stroke-width="2"/><polygon points="0,${h} ${pts.map((v,i)=>`${(i/(w-1)*400).toFixed(1)},${((1-(v-minE)/range)*h).toFixed(0)}`).join(' ')} 400,${h}" fill="url(#btG)"/></svg></div></div>`;}
function renderAlerts(){const alerts=JSON.parse(localStorage.getItem('mc_alerts')||'[]');return`<div style="margin-bottom:14px;"><div style="font-size:13px;font-weight:600;margin-bottom:10px;">Criar Novo Alerta</div><div class="inp-row"><select class="inp-sm" id="al-type" style="max-width:150px;"><option value="price">Preco acima de</option><option value="price_below">Preco abaixo de</option><option value="dd">Drawdown atingiu</option></select><input class="inp-sm" id="al-sym" placeholder="Simbolo" style="max-width:110px;"><input class="inp-sm" id="al-val" type="number" placeholder="Valor" style="max-width:100px;"><select class="inp-sm" id="al-ch" style="max-width:130px;"><option>Telegram</option><option>E-mail</option></select><button class="btn-sm" onclick="addAlert()">Criar Alerta</button></div></div>${alerts.length?alerts.map((a,i)=>`<div class="alert-item"><div class="ai-left"><div class="ai-name">${escHtml(a.sym)} — ${a.type==='price'?'Acima de':'Abaixo de'} $${a.val}</div><div class="ai-cond">${escHtml(a.channel)}</div></div><div style="display:flex;align-items:center;gap:8px;"><button class="ai-toggle ${a.active?'on':'off'}" onclick="toggleAlert(${i})"></button><button onclick="deleteAlert(${i})" style="background:none;border:none;color:var(--t3);cursor:pointer;">x</button></div></div>`).join(''):'<div style="text-align:center;padding:24px;color:var(--t3);">Nenhum alerta configurado ainda.</div>'}`;}
function addAlert(){const type=document.getElementById('al-type')?.value;const sym=(document.getElementById('al-sym')?.value||'').trim().toUpperCase();const val=document.getElementById('al-val')?.value;const channel=document.getElementById('al-ch')?.value;if(!sym||!val){showToast(t('toast_preencha_simbolo_valor'));return;}const alerts=JSON.parse(localStorage.getItem('mc_alerts')||'[]');alerts.push({type,sym,val:parseFloat(val),channel,active:true,ts:new Date().toISOString()});localStorage.setItem('mc_alerts',JSON.stringify(alerts));document.getElementById('tm-body').innerHTML=renderToolContent('alerts');showToast(t('toast_alerta_criado'));track('alert_create',{type,symbol:sym,value:parseFloat(val),channel});}
function toggleAlert(i){const alerts=JSON.parse(localStorage.getItem('mc_alerts')||'[]');if(alerts[i])alerts[i].active=!alerts[i].active;localStorage.setItem('mc_alerts',JSON.stringify(alerts));document.getElementById('tm-body').innerHTML=renderToolContent('alerts');track('alert_toggle',{symbol:alerts[i]?.sym,active:alerts[i]?.active});}
function deleteAlert(i){const alerts=JSON.parse(localStorage.getItem('mc_alerts')||'[]');const deleted=alerts[i];alerts.splice(i,1);localStorage.setItem('mc_alerts',JSON.stringify(alerts));document.getElementById('tm-body').innerHTML=renderToolContent('alerts');track('alert_delete',{symbol:deleted?.sym});}
function renderNinjaPack(){return`<div class="vip-box"><div style="font-size:18px;font-weight:700;margin-bottom:6px;">NinjaTrader Pack — 15 Indicadores</div><div style="font-size:13px;color:var(--t2);line-height:1.6;margin-bottom:16px;">Pack exclusivo para traders de prop firms. NinjaTrader 8. Inclui setup e video tutorial.</div><div class="vip-features"><div class="vip-feat">PropFirm DrawdownGuard</div><div class="vip-feat">DailyTarget Tracker</div><div class="vip-feat">OrderFlow Delta</div><div class="vip-feat">Session VWAP</div><div class="vip-feat">EntryZone Finder</div><div class="vip-feat">NewsFilter</div><div class="vip-feat">RiskManager automatico</div><div class="vip-feat">+ 8 indicadores adicionais</div></div><button class="dl-btn" onclick="showToast('Arquivo em preparacao. Voce recebera por e-mail!')">Baixar NinjaTrader Pack</button></div>`;}

/* LOYALTY — Supabase */
/* LOYALTY — tiers removed, simple 1-approved-purchase gate for Live Room + Daily Analysis + GEX */

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
  track('loyalty_register', { name, email, em: email, fn: name, content_name:'Loyalty Program', content_category:'loyalty' });
}

async function submitProof() {
  if (!rateLimit('submitProof', 10000)) { showToast(t('toast_aguarde')); return; }
  if (currentUser && !isAuthed()) { showConfirmEmailModal('pending'); return; }
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
    showToast(t('toast_send_error')||'Error sending. Try again.'); return;
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
  const faltam = Math.max(0, 1 - approved);
  const liveUnlocked = approved >= 1;
  const progressPct = Math.min(100, Math.round(approved/1*100));

  el.innerHTML=`
    <!-- Progresso -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:700;">${liveUnlocked
        ? '<span style="color:var(--green);">✓ '+t('loyalty_desbloqueado')+'</span>'
        : '<span style="color:var(--gold);">'+faltam+' '+t('loyalty_faltam_suf')+'</span>'}</div>
      <div style="font-size:12px;color:var(--t3);font-weight:600;">${approved} ${t('loyalty_validada')}</div>
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
        Com <strong style="color:var(--t1);">1 compra validada</strong> → acesso ao Live Room VIP e benefícios
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
      <div class="lrf-title">${t('loyalty_crie_conta')}</div>
      <div class="lrf-sub">${t('loyalty_crie_sub')}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
        <button class="lrf-btn" onclick="openAuthModal('signup')">${t('loyalty_btn_cadastrar')}</button>
        <button class="lrf-btn" style="background:transparent;border:1px solid var(--b2);color:var(--t2);" onclick="openAuthModal('login')">${t('loyalty_btn_login')}</button>
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
  const faltam = Math.max(0, 1 - approved);
  const progressPct = Math.min(100, Math.round(approved/1*100));
  const liveUnlocked = approved >= 1;

  ms.innerHTML=`<div class="loyalty-my-card">
    <div class="lmc-top">
      <div>
        <div class="lmc-name">${escHtml(member.name)}</div>
        <div style="font-size:12px;color:var(--t2);margin-top:2px;">${escHtml(member.email)}</div>
      </div>
      <div style="padding:4px 12px;border-radius:6px;background:${liveUnlocked?'rgba(34,197,94,.12)':'var(--gbg)'};color:${liveUnlocked?'var(--green)':'var(--gold)'};font-size:11px;font-weight:700;">
        ${liveUnlocked?'✓ '+t('loyalty_desbloqueado'):faltam+' '+t('loyalty_faltam')}
      </div>
    </div>
    <div class="lmc-stats">
      <div class="lmc-stat"><div class="lmc-stat-lbl">${t('loyalty_validadas')}</div><div class="lmc-stat-val" style="color:var(--green);">${approved}</div></div>
      <div class="lmc-stat"><div class="lmc-stat-lbl">${t('loyalty_em_analise')}</div><div class="lmc-stat-val" style="color:var(--gold);">${pendingCount}</div></div>
      <div class="lmc-stat"><div class="lmc-stat-lbl">Live Room</div><div class="lmc-stat-val" style="font-size:12px;font-weight:700;color:${liveUnlocked?'var(--green)':'var(--t3)'};">${liveUnlocked?t('loyalty_liberado'):t('loyalty_bloqueado')}</div></div>
    </div>
    <div style="margin-top:12px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:5px;">
        <span>${approved}/1 ${t('loyalty_compra_validada')}</span>
        <span>${liveUnlocked?t('loyalty_acesso_liberado'):faltam+' '+t('loyalty_faltam')}</span>
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
    ?`<thead><tr><th>${t('loy_col_date')||'Date'}</th><th>${t('loy_col_firm')||'Firm'}</th><th>${t('loy_col_plan')||'Plan'}</th><th>${t('loy_col_coupon')||'Coupon'}</th><th>${t('loy_col_order')||'Order #'}</th><th>${t('loy_col_status')||'Status'}</th></tr></thead><tbody>${allEntries.map(h=>`<tr><td style="color:var(--t2);">${new Date(h.ts).toLocaleDateString((_currentLang==='en'?'en-US':_currentLang==='es'?'es-ES':'pt-BR'))}</td><td style="font-weight:600;">${escHtml(h.firma)}</td><td><span style="background:var(--gbg);color:var(--gold);padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">${escHtml(h.size)}</span></td><td style="font-size:11px;font-family:monospace;">${escHtml(h.coupon)}</td><td style="font-size:11px;color:var(--t2);">${escHtml(h.orderNumber)}</td><td><span class="${h.status==='approved'?'status-approved':h.status==='rejected'?'status-rejected':'status-pending'}">${h.status==='approved'?(t('loy_status_approved')||'Validated'):h.status==='rejected'?(t('loy_status_rejected')||'Rejected'):(t('loy_status_pending')||'Under review')}</span></td></tr>`).join('')}</tbody>`
    :`<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--t2);">${t('loy_no_entries')||'No purchases registered yet.'}</td></tr>`;
}
let proofFileData=null;
function handleProofFile(input){const file=input.files[0];if(!file){proofFileData=null;return;}if(file.size>5*1024*1024){showToast(t('toast_file_too_large')||'File too large. Max 5MB.');input.value='';return;}if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)){showToast(t('toast_file_format_invalid')||'Invalid format. JPG, PNG or PDF.');input.value='';return;}const reader=new FileReader();reader.onload=(e)=>{proofFileData={name:file.name,size:file.size,type:file.type,data:e.target.result};const area=document.getElementById('proof-upload-area');const preview=document.getElementById('pf-file-preview');if(area)area.classList.add('has-file');if(preview){preview.style.display='block';preview.innerHTML=`<div class="pua-preview"><div><div class="pua-preview-name">${escHtml(file.name)}</div><div class="pua-preview-size">${(file.size/1024).toFixed(0)} KB</div></div><button class="pua-remove" onclick="event.stopPropagation();removeProofFile()">x</button></div>`;}const ico=document.getElementById('pua-icon');if(ico)ico.style.display='none';};reader.readAsDataURL(file);}
function removeProofFile(){proofFileData=null;const fi=document.getElementById('pf-file');if(fi)fi.value='';const prev=document.getElementById('pf-file-preview');if(prev)prev.style.display='none';const area=document.getElementById('proof-upload-area');if(area)area.classList.remove('has-file');const ico=document.getElementById('pua-icon');if(ico)ico.style.display='block';}
function registerLoyaltyClick(size,plat,type,firm){track('loyalty_checkout_click',{size,plat,type,firm});}

/* INIT */
/* ══════════════════════════════════════════════════════════════════════════
   AUTH SYSTEM — Supabase Auth + profiles
   ══════════════════════════════════════════════════════════════════════════ */
let currentUser = null;
let currentProfile = null;
function isAuthed() {
  return !!(currentUser && currentProfile && (currentProfile.email_verified === true || currentProfile.is_admin === true));
}
function isOAuthUser() {
  return !!(currentUser?.app_metadata?.provider && currentUser.app_metadata.provider !== 'email');
}
let _authLoaded = false;
let _authReadyPromise = null;
let _userHasAccess = false; // cached: user has pro access (sub, loyalty, vip, trial)
let _authGroup = 'login';
let _authSlide = 0;
const _authLoginBgs = ['/img/auth-bg-1.webp','/img/auth-bg-4.webp','/img/auth-bg-3.webp','/img/auth-bg-2.webp'];
const _authSignupBgs = ['/img/auth-bg-5.webp','/img/auth-bg-6.webp','/img/auth-bg-7.webp','/img/auth-bg-8.webp','/img/auth-bg-5.webp'];

function openAuthModal(type) {
  closeAuthModals();
  removePreviewBanner();
  _authGroup = type === 'signup' ? 'signup' : 'login';
  document.getElementById('login-overlay').classList.add('show');
  document.body.style.overflow = 'hidden';
  // Show correct form
  const lf = document.getElementById('auth-login-form');
  const sf = document.getElementById('auth-signup-form');
  if (lf) lf.style.display = _authGroup === 'login' ? '' : 'none';
  if (sf) sf.style.display = _authGroup === 'signup' ? '' : 'none';
  if (_authGroup === 'signup') { try { initSignupForm(); } catch(e) {} }
  rebuildAuthDots();
  goAuthSlide(0);
  startAuthCarousel();
}
function rebuildAuthDots() {
  const host = document.getElementById('auth-dots');
  if (!host) return;
  const count = document.querySelectorAll('.auth-slide[data-group="' + _authGroup + '"]').length;
  host.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const b = document.createElement('button');
    b.className = 'auth-dot' + (i === 0 ? ' active' : '');
    b.onclick = () => goAuthSlide(i);
    host.appendChild(b);
  }
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
    showToast(error.message || t('auth_google_error') || 'Failed to connect with Google', 'error');
  }
}

/* Auth Carousel */
let _authCarouselTimer = null;
function startAuthCarousel() {
  stopAuthCarousel();
  _authCarouselTimer = setInterval(() => {
    const total = document.querySelectorAll('.auth-slide[data-group="' + _authGroup + '"]').length || 4;
    goAuthSlide((_authSlide + 1) % total);
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
  btn.disabled = true; btn.textContent = t('auth_entrando');

  // signInWithPassword with 12s timeout + 1 retry
  let data, error;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const authCall = db.auth.signInWithPassword({ email, password: pass });
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000));
      const result = await Promise.race([authCall, timeout]);
      data = result.data; error = result.error;
      if (!error || (error.message === 'Invalid login credentials')) break;
    } catch(e) {
      error = { message: e.message === 'timeout' ? '' : e.message };
    }
    if (attempt < 1) await new Promise(r => setTimeout(r, 2000));
  }
  btn.disabled = false; btn.textContent = t('auth_btn_entrar');

  if (error) {
    const msg = (typeof error.message === 'string' && error.message.length > 2) ? error.message : null;
    if (msg === 'Invalid login credentials') return showAuthError('login-error', t('auth_email_senha_incorretos'));
    return showAuthError('login-error', msg || t('auth_servidor_indisponivel') || 'Servidor indisponível. Tente novamente.');
  }

  closeAuthModals();
  await loadUserSession(data.user);
  track('user_login', { method: 'email' });
}

async function doAuthSignup() {
  const first    = document.getElementById('auth-signup-first')?.value.trim() || '';
  const last     = document.getElementById('auth-signup-last')?.value.trim() || '';
  const nickname = document.getElementById('auth-signup-nickname')?.value.trim() || '';
  const email    = document.getElementById('auth-signup-email').value.trim();
  const pass     = document.getElementById('auth-signup-pass').value;
  const phone    = document.getElementById('auth-signup-phone')?.value.trim() || '';
  const birthday = document.getElementById('auth-signup-birthday')?.value || '';
  const country  = document.getElementById('auth-signup-country')?.value || '';
  const zip      = document.getElementById('auth-signup-zip')?.value.trim() || '';
  const address  = document.getElementById('auth-signup-address')?.value.trim() || '';
  const city     = document.getElementById('auth-signup-city')?.value.trim() || '';
  const state    = document.getElementById('auth-signup-state')?.value.trim() || '';
  const terms    = document.getElementById('auth-signup-terms')?.checked;

  // Hard-required
  if (!first || !last || !nickname || !email || !pass) return showAuthError('signup-error', t('auth_campos_obrigatorios')||'Preencha todos os campos obrigatórios');
  if (pass.length < 6) return showAuthError('signup-error', t('auth_senha_minimo'));
  if (!terms) return showAuthError('signup-error', t('auth_aceite_termos')||'Aceite os termos para continuar');

  // Soft-required: birthday se preenchido tem que ser adulto
  if (birthday && !validateBirthdayAdult(birthday)) return showAuthError('signup-error', t('auth_idade_minima')||'Você deve ter 18 anos ou mais');

  // ZIP validation por país (se preenchido)
  if (zip && country && ZIP_RE[country]) {
    if (!ZIP_RE[country].test(zip)) return showAuthError('signup-error', t('auth_cep_invalido')||'CEP/ZIP inválido para o país selecionado');
  }

  const btn = document.getElementById('signup-btn');
  btn.disabled = true; btn.textContent = t('auth_validando_email')||'Validating email...';

  // B.3.2.1 — server-side email validation (DNS MX + disposable + cache, fallback permissivo)
  const validation = await validateEmailMx(email);
  if (validation && validation.valid === false) {
    btn.disabled = false; btn.textContent = t('auth_btn_criar');
    const reasonKey = 've_' + (validation.reason || 'cached_invalid');
    return showAuthError('signup-error', t(reasonKey) || t('ve_cached_invalid') || 'Invalid email');
  }

  btn.textContent = t('auth_criando');

  const phoneE164 = phone ? normalizePhoneE164(phone, country) : '';
  const fullName  = `${first} ${last}`.trim();
  const name      = fullName; // compat com referências locais abaixo

  // Giveaway: marcar tag IMEDIATAMENTE no email (antes do double opt-in completar)
  // Garante que mesmo se user fechar a aba antes de confirmar email, lead fica taggeado.
  let _gwPendingSlug = null;
  let _gwPendingIg = null;
  try{
    _gwPendingSlug = sessionStorage.getItem('mc_gw_pending_signup');
    _gwPendingIg   = sessionStorage.getItem('mc_gw_pending_ig');
    if(_gwPendingSlug){
      db.from('email_subscribers').upsert(
        { email, name: fullName, lang:(window._currentLang||'en'), source:'giveaway', tags:['received-giveaway-'+_gwPendingSlug,'giveaway-entered'] },
        { onConflict:'email' }
      ).then(()=>{}).catch(()=>{});
      try{ track('giveaway_popup_signup_submit', {slug:_gwPendingSlug, email_domain: email.split('@')[1]||''}); }catch(e){}
    }
  }catch(e){}

  const { data, error } = await db.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        first_name: first,
        last_name:  last,
        nickname,
        full_name:  fullName,
        phone:      phoneE164,
        birthday:   birthday || '',
        address,
        city,
        state,
        country,
        zip,
        terms_accepted: 'true',
      }
    }
  });
  btn.disabled = false; btn.textContent = t('auth_btn_criar');

  if (error) return showAuthError('signup-error', error.message);

  // Auto-cadastra na lista de email_subscribers (pra aparecer no admin/email)
  try {
    const lang = (window.currentLang || 'pt');
    db.from('email_subscribers').upsert({
      email,
      name: fullName || '',
      source: 'signup',
      lang,
      tags: ['site','signup'],
      status: 'active'
    }, { onConflict: 'email', ignoreDuplicates: false }).then(()=>{}).catch(()=>{});
  } catch(e){}

  // Giveaway: signup OK, abre Instagram em nova aba (não espera email confirmation)
  if(_gwPendingSlug && _gwPendingIg && data?.user){
    try{ localStorage.setItem('mc_gw_entered_'+_gwPendingSlug,'1'); }catch(e){}
    try{ track('giveaway_popup_instagram_open', {slug:_gwPendingSlug, via:'signup_complete'}); }catch(e){}
    try{ sessionStorage.removeItem('mc_gw_pending_signup'); sessionStorage.removeItem('mc_gw_pending_ig'); }catch(e){}
    setTimeout(()=>{ try{ window.open(_gwPendingIg,'_blank','noopener'); }catch(e){} }, 800);
  }

  // If session returned directly, login immediately
  if (data.session) {
    closeAuthModals();
    await loadUserSession(data.user);
    track('user_signup', { method: 'email', em: email, fn: name, content_name:'MarketsCoupons Account', content_category:'signup' });
    _cemPendingEmail = email;
    try { fetch('/api/welcome-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send_confirm',email,name,lang:(window.currentLang||'pt')})}); } catch(e){}
    if(!isAuthed()) showConfirmEmailModal('pending');
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
    track('user_signup', { method: 'email', em: email, fn: name, content_name:'MarketsCoupons Account', content_category:'signup' });
    _cemPendingEmail = email;
    try { fetch('/api/welcome-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send_confirm',email,name,lang:(window.currentLang||'pt')})}); } catch(e){}
    if(!isAuthed()) showConfirmEmailModal('pending');
    return;
  }
}

let _loggingOut = false;
async function doLogout() {
  _loggingOut = true;
  // 1. Tentar signOut via Supabase API (with 3s timeout to avoid hang)
  try { await Promise.race([db.auth.signOut(), new Promise(r => setTimeout(r, 3000))]); } catch(e) {}
  // 2. Limpar manualmente APENAS a chave do user (NUNCA tocar em mc-admin-auth nem sb-* genéricos — quebra sessão do admin no mesmo browser)
  try {
    localStorage.removeItem('mc-user-auth');
    sessionStorage.removeItem('mc-user-auth');
    localStorage.removeItem(BOT_STORE_KEY);
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
  setTrackingUser(user); // Enhanced Conversions + User Properties (hashed PII, GA4 user_id)
  updateAuthUI(true);
  checkAnalysisGate();
  if(_gexLoaded) checkGEXGate();
  checkLoyaltyAndShowLive();
  checkProBadge();
  await loadUserFavs();
  applyF();
  _sessionLoading = false;
  try{ window.dispatchEvent(new CustomEvent('mc:user-loaded')); }catch(e){}
}

function updateAuthUI(loggedIn) {
  document.getElementById('auth-btns-out').style.display = loggedIn ? 'none' : 'flex';
  document.getElementById('auth-btns-in').style.display  = loggedIn ? '' : 'none';
  // Mobile menu
  const mmTop = document.getElementById('mm-auth-top');
  const mmIn  = document.getElementById('mm-auth-in');
  if (mmTop) mmTop.style.display = loggedIn ? 'none' : '';
  if (mmIn)  mmIn.style.display  = loggedIn ? '' : 'none';

  // Painel logged-out: zera textos pra evitar mostrar placeholder "Usuário/email@example.com"
  if (!loggedIn) {
    const _z = (id) => { const el = document.getElementById(id); if (el) el.textContent = ''; };
    _z('up-name'); _z('up-email'); _z('up-avatar');
  }

  if (loggedIn && currentProfile) {
    const initial = (currentProfile.full_name || currentProfile.email || 'U').charAt(0).toUpperCase();
    document.getElementById('nav-avatar').textContent = initial;
    document.getElementById('nav-user-name').textContent = (currentProfile.full_name || currentProfile.email).split(' ')[0];

    // Update panel
    document.getElementById('up-avatar').textContent = initial;
    document.getElementById('up-name').textContent = currentProfile.full_name || t('painel_user_fallback') || 'User';
    document.getElementById('up-email').textContent = currentProfile.email;
    // username oculto do form de troca de senha — gerenciador de senha precisa pra parear credencial
    { const _un=document.getElementById('up-pass-uname'); if(_un) _un.value=currentProfile.email||''; }
    // Fase C — prefill 12 campos (cascata pra default country: profile → IP → 'BR')
    const _setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    const defaultCountry = currentProfile.country
      || (typeof _geo !== 'undefined' && _geo && _geo.geo_country ? _geo.geo_country.toUpperCase() : '')
      || 'BR';
    _setVal('up-edit-first',    currentProfile.first_name);
    _setVal('up-edit-last',     currentProfile.last_name);
    _setVal('up-edit-nickname', currentProfile.nickname);
    _setVal('up-edit-phone',    currentProfile.phone);
    _setVal('up-edit-birthday', currentProfile.birthday);
    _setVal('up-edit-zip',      currentProfile.zip);
    _setVal('up-edit-address',  currentProfile.address);
    _setVal('up-edit-city',     currentProfile.city);
    _setVal('up-edit-country',  defaultCountry);
    renderStateFieldFor('up-edit', defaultCountry);
    _setVal('up-edit-state',    currentProfile.state);
    // B.6 — render pills firmas favoritas pré-selecionadas
    renderFirmPillsInto('up-edit-firm-pills', currentProfile.favorite_firms || []);
    renderPainelLoyalty();
  }
}

async function changePassword() {
  if (!currentUser) return;
  const current = document.getElementById('up-pass-current').value;
  const newPass = document.getElementById('up-pass-new').value;
  const confirm = document.getElementById('up-pass-confirm').value;
  const errEl = document.getElementById('up-pass-error');
  const okEl = document.getElementById('up-pass-ok');
  errEl.style.display = 'none'; okEl.style.display = 'none';

  if (!current || !newPass || !confirm) { errEl.textContent = t('painel_senha_preencha_todos'); errEl.style.display = 'block'; return; }
  if (newPass.length < 6) { errEl.textContent = t('auth_senha_minimo'); errEl.style.display = 'block'; return; }
  if (newPass !== confirm) { errEl.textContent = t('painel_senhas_nao_coincidem'); errEl.style.display = 'block'; return; }

  // Verify current password by re-authenticating
  const { error: authErr } = await db.auth.signInWithPassword({ email: currentUser.email, password: current });
  if (authErr) { errEl.textContent = t('painel_senha_atual_incorreta'); errEl.style.display = 'block'; return; }

  // Update password
  const { error } = await db.auth.updateUser({ password: newPass });
  if (error) { errEl.textContent = error.message || t('auth_servidor_indisponivel'); errEl.style.display = 'block'; return; }

  document.getElementById('up-pass-current').value = '';
  document.getElementById('up-pass-new').value = '';
  document.getElementById('up-pass-confirm').value = '';
  okEl.style.display = 'block';
  setTimeout(() => okEl.style.display = 'none', 5000);
  track('password_changed');
}

async function saveProfile() {
  if (!currentUser) return;

  const _val = (id) => (document.getElementById(id)?.value || '').trim();
  const first    = _val('up-edit-first');
  const last     = _val('up-edit-last');
  const nickname = _val('up-edit-nickname');
  const phone    = _val('up-edit-phone');
  const birthday = _val('up-edit-birthday');
  const country  = _val('up-edit-country');
  const zip      = _val('up-edit-zip');
  const address  = _val('up-edit-address');
  const city     = _val('up-edit-city');
  const state    = _val('up-edit-state');

  const errEl = document.getElementById('up-save-err');
  const okEl  = document.getElementById('up-save-ok');
  if (errEl) { errEl.style.display='none'; errEl.textContent=''; }
  if (okEl)  { okEl.style.display='none'; }
  const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display='block'; } };

  if (birthday && !validateBirthdayAdult(birthday)) return showErr(t('auth_idade_minima')||'Você deve ter 18 anos ou mais');
  if (zip && country && ZIP_RE[country] && !ZIP_RE[country].test(zip)) return showErr(t('auth_cep_invalido')||'CEP/ZIP inválido para o país selecionado');

  const phoneE164 = phone ? normalizePhoneE164(phone, country) : '';
  const fullName  = `${first} ${last}`.trim() || (currentProfile && currentProfile.full_name) || '';

  // B.6 — firmas favoritas (sanitizadas vs whitelist)
  const favFirms = getSelectedFirmsFrom('up-edit-firm-pills').filter(f => FIRM_SLUGS.includes(f));

  const updates = {
    first_name: first    || null,
    last_name:  last     || null,
    nickname:   nickname || null,
    full_name:  fullName || null,
    phone:      phoneE164 || null,
    birthday:   birthday || null,
    address:    address  || null,
    city:       city     || null,
    state:      state    || null,
    country:    country  || null,
    zip:        zip      || null,
    favorite_firms: favFirms,
  };

  const { error } = await db.from('profiles').update(updates).eq('id', currentUser.id);
  if (error) return showErr(error.message);

  Object.assign(currentProfile, updates);
  updateAuthUI(true);
  if (okEl) { okEl.style.display = 'block'; setTimeout(() => { okEl.style.display = 'none'; }, 3000); }
  track('profile_updated');
}

// Check existing session on load (with 6s timeout — recreates client if stuck)
async function checkAuthSession() {
  try {
    const sessionPromise = db.auth.getSession();
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
    const { data: { session } } = await Promise.race([sessionPromise, timeout]);
    if (session?.user) {
      await loadUserSession(session.user);
    } else {
      updateAuthUI(false);
    }
  } catch(e) {
    console.warn('[Auth] Session check failed:', e.message);
    // If stuck, nuke stored session and recreate client so signInWithPassword works
    localStorage.removeItem('mc-user-auth');
    db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, _dbOpts);
    updateAuthUI(false);
  }
  // Listen for auth changes
  db.auth.onAuthStateChange(async (event, session) => {
    if (_loggingOut) return;
    if (event === 'SIGNED_IN' && session?.user) {
      await loadUserSession(session.user);
      if (currentUser && currentProfile && !isAuthed() && !isOAuthUser()) {
        try { if (!sessionStorage.getItem('confirm_modal_shown')) { _cemPendingEmail = currentUser.email; showConfirmEmailModal('pending'); } } catch(e){}
      }
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
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  // Preload FIRMS from localStorage cache BEFORE sync boot (avoids empty-state flash on /firm-slug refresh)
  if(FIRMS.length===0){
    try{ const cached=localStorage.getItem('mc_firms_cache_v7'); if(cached){ const arr=JSON.parse(cached); arr.forEach(f=>FIRMS.push(f)); } }catch(e){}
  }
  // Detectar idioma e aplicar traduções
  initLang();
  // Load CMS overrides (texts, FAQ) — single Promise.all, one renderFaq call
  Promise.all([loadCmsTexts(), loadCmsFaq(), loadI18nFromSupabase(), loadFirmTFromSupabase()]).then(() => { applyTranslations(); renderFaq(); });
  // Ativar página correta ANTES de renderizar (evita flash da home)
  // Detect dedicated firm page BEFORE revealing body (avoid flash)
  const _pathParts=location.pathname.split('/').filter(Boolean);
  const _pathLangs=['en','es','fr','de','it','ar'];
  const _earlySlug=_pathLangs.includes(_pathParts[0])?(_pathParts[1]||''):(_pathParts[0]||'');
  const _isFirmPage=_firmPageSlugs.includes(_earlySlug);
  const _initPage = _pageFromPath() || location.hash.replace('#','') || (function(){try{return sessionStorage.getItem('mc_page')||'';}catch(e){return '';}}());
  if(_isFirmPage){
    go('home', true);
  } else if(_initPage && document.getElementById('page-'+_initPage)){
    go(_initPage, true);
  } else {
    go('home', true);
  }
  // Revelar body — mas NÃO se é firma dedicada (overlay abrirá e revelará depois)
  if(!_isFirmPage) document.body.style.opacity='1';
  // REMOVIDO 2026-05-15: prefetch dos 12 bg files queimava 12-13MB no LCP (5MB tradeday + 3MB cti + ...).
  // User só abre 1 firma — não vale carregar 12. Bg agora baixa on-demand quando openD() roda.
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

  // Abrir overlay da firma IMEDIATAMENTE com dados hardcoded (antes de qualquer await)
  if(_isFirmPage){
    // Resolve firm slug aliases
    const _resolvedId = _slugToFirmId[_earlySlug] || _earlySlug;
    window._dedicatedFirmSlug=_resolvedId;
    setFirmSEO(_resolvedId);
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const pg=document.getElementById('page-firms');if(pg)pg.classList.add('active');
    document.querySelectorAll('.nt').forEach(t=>t.classList.toggle('active',t.dataset.p==='firms'));
    window.scrollTo(0,0);
    openD(_resolvedId);
    // If FIRMS not loaded yet, keep body hidden until retry in loadCmsFirms.
    if(FIRMS.find(x=>x.id===_resolvedId)) document.body.style.opacity='1';
    else setTimeout(()=>{document.body.style.opacity='1';},2500); // safety fallback
  } else if(location.hash.startsWith('#firm/')){
    const _hFirmId=location.hash.replace('#firm/','');
    if(_hFirmId && FIRMS.find(x=>x.id===_hFirmId)){
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      const pg=document.getElementById('page-firms');if(pg)pg.classList.add('active');
      document.querySelectorAll('.nt').forEach(t=>t.classList.toggle('active',t.dataset.p==='firms'));
      window.scrollTo(0,0);
      openD(_hFirmId);
      document.body.style.opacity='1';
    }
  }

  // Auth: iniciar check imediatamente (em paralelo com o resto)
  const _hasToken = localStorage.getItem('mc-user-auth') !== null;
  if (!_hasToken) updateAuthUI(false);
  const _authPromise = _authReadyPromise = checkAuthSession().then(()=>{
    _authLoaded=true;
    checkAnalysisGate();
    if(_gexLoaded) checkGEXGate();
    if(_pageFromPath()==='live'||location.hash==='#live') checkLoyaltyAndShowLive();
    renderLoyaltyPage();
  });

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
        banner.innerHTML = '&#10003; '+t('coupon_copied_choose').replace('{code}','<strong style="letter-spacing:2px;">'+_safeCopy+'</strong>');
        document.body.prepend(banner);
        setTimeout(()=>banner.remove(), 5000);
      }, 300);
    } catch(e){}
    // Clean URL
    history.replaceState(null, '', location.pathname + location.hash);
  }

  fetchGeo();

  // Carregar configurações do site (site_settings)
  try{
    const{data}=await db.from('site_settings').select('key,value');
    if(data){
      _siteSettings={};
      data.forEach(s=>{_siteSettings[s.key]=s.value;});
      // Bot
      if(_siteSettings.bot_enabled==='false'){
        const fab=document.getElementById('bot-fab');if(fab)fab.style.display='none';
        const mmBot=document.getElementById('mm-bot-item');if(mmBot)mmBot.style.display='none';
      }
      // Theme colors
      if(_siteSettings.theme_colors){
        const tc=typeof _siteSettings.theme_colors==='string'?JSON.parse(_siteSettings.theme_colors):_siteSettings.theme_colors;
        const root=document.documentElement;
        const _hex2rgb=h=>{const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return r+','+g+','+b;};
        Object.entries(tc).forEach(([varName,val])=>{
          if(!varName.startsWith('--')||!val) return;
          if(varName==='--glass-rgb'){
            const rgb=_hex2rgb(val);
            const gp=(tc['--glass-pct']||8)/100;
            const gbp=(tc['--glass-border-pct']||18)/100;
            root.style.setProperty('--glass','rgba('+rgb+','+gp+')');
            root.style.setProperty('--glass-border','rgba('+rgb+','+gbp+')');
            root.style.setProperty('--glass-strong','rgba('+rgb+','+gp+')');
            root.style.setProperty('--cbr','rgba('+rgb+','+gbp+')');
          } else {
            root.style.setProperty(varName,val);
          }
          // Derived gold vars
          if(varName==='--gold'){
            const rgb=_hex2rgb(val);
            root.style.setProperty('--gbg','rgba('+rgb+',0.09)');
            root.style.setProperty('--gbr','rgba('+rgb+',0.25)');
            root.style.setProperty('--gold-dim','rgba('+rgb+',.15)');
            root.style.setProperty('--glow-gold','rgba('+rgb+',.15)');
            root.style.setProperty('--glow-gold-border','rgba('+rgb+',.25)');
          }
        });
      }
      // Background images
      if(_siteSettings.bg_desktop_url){
        document.body.style.backgroundImage='url('+_siteSettings.bg_desktop_url+')';
      }
      if(_siteSettings.bg_mobile_url && window.innerWidth<=900){
        document.body.style.backgroundImage='url('+_siteSettings.bg_mobile_url+')';
      }
      // Logo text
      if(_siteSettings.logo_text1||_siteSettings.logo_text2){
        document.querySelectorAll('.nav-logo-text').forEach(el=>{
          el.innerHTML=(_siteSettings.logo_text1||'Markets')+'<em>'+(_siteSettings.logo_text2||'Coupons')+'</em>';
        });
      }
      // Nav visibility
      if(_siteSettings.nav_visibility){
        const nv=typeof _siteSettings.nav_visibility==='string'?JSON.parse(_siteSettings.nav_visibility):_siteSettings.nav_visibility;
        Object.entries(nv).forEach(([tabId,visible])=>{
          if(visible===false){
            document.querySelectorAll(`.nt[data-p="${tabId}"],.mm-item[onclick*="'${tabId}'"]`).forEach(el=>{el.style.display='none';});
          }
        });
      }
    }
  }catch(e){}

  // Carregar firmas do Supabase (atualiza dados em background)
  await loadFirmsFromSupabase();
  // Render promo top bar (global, all pages) with active firm timers
  try { renderPromoTopbar(); tickPromoTimers(); } catch(e){}
  // Se overlay de firma está aberto, re-render com dados atualizados do Supabase
  if(_fdCurrent && !_fdClosing && document.getElementById('fd-overlay')?.classList.contains('show')){
    openFD(_fdCurrent, FIRMS.find(x=>x.id===_fdCurrent));
  }
  await loadGuidesFromSupabase();
  renderGuides();
  loadDailyAnalysis();
  loadGEX();

  // Carregar fidelidade do membro logado (se tiver email salvo)
  const cachedMember = getLoyaltyMember();
  if (cachedMember?.email) {
    await loadLoyaltyFromSupabase(cachedMember.email);
  }
  // Wait for auth to finish before initializing favorites
  await _authPromise;
  await initFavs();
});

// ═══ GAMMA EXPOSURE (GEX) ═══
let _gexLoaded = false;
let _gexAllData = [];
let _gexSelectedTickers = ['ES','NQ'];
let _gexSelectedExp = null;
const GEX_TICKER_GROUPS = [
  {label:'Futures',tickers:['ES','NQ']},
  {label:'ETFs',tickers:['SPY','QQQ','GLD']},
  {label:'Stocks',tickers:['AAPL','TSLA','NVDA','MSFT','AMZN','META','GOOGL']},
];
function gxFmt(n){return Number(n).toLocaleString('en-US',{maximumFractionDigits:0});}

function renderGEXTickerBar(){
  const bar=document.getElementById('gx-ticker-bar');if(!bar)return;
  const avail=new Set(_gexAllData.map(d=>d.ticker));
  let html='';
  for(const g of GEX_TICKER_GROUPS){
    for(const tk of g.tickers){
      if(!avail.has(tk)) continue;
      const sel=_gexSelectedTickers.includes(tk)?'sel':'';
      html+=`<button class="gx-ticker-btn ${sel}" onclick="gxToggleTicker('${tk}')">${tk}</button>`;
    }
  }
  bar.innerHTML=html;
}

function renderGEXExpBar(){
  const bar=document.getElementById('gx-exp-bar');if(!bar)return;
  const selected=_gexAllData.filter(d=>_gexSelectedTickers.includes(d.ticker));
  const allExps=new Set();
  selected.forEach(d=>(d.expirations||[]).forEach(e=>allExps.add(e)));
  const exps=Array.from(allExps).sort().slice(0,10);
  if(!exps.length){bar.innerHTML='';return;}
  const loc=_currentLang==='pt'?'pt-BR':'en-US';
  let html=`<button class="gx-exp-btn ${!_gexSelectedExp?'sel':''}" onclick="gxSelectExp(null)">${t('gx_all_exp')}</button>`;
  for(const e of exps){
    const d=new Date(e+'T12:00:00');
    const label=d.toLocaleDateString(loc,{month:'short',day:'numeric'});
    const sel=_gexSelectedExp===e?'sel':'';
    html+=`<button class="gx-exp-btn ${sel}" onclick="gxSelectExp('${e}')">${label}</button>`;
  }
  bar.innerHTML=html;
}

function gxToggleTicker(tk){
  if(_gexSelectedTickers.includes(tk)){
    if(_gexSelectedTickers.length===1) return;
    _gexSelectedTickers=_gexSelectedTickers.filter(t=>t!==tk);
  } else {
    _gexSelectedTickers.push(tk);
  }
  _gexSelectedExp=null;
  renderGEXTickerBar();
  renderGEXExpBar();
  renderGEXFiltered();
}

function gxSelectExp(exp){
  _gexSelectedExp=exp;
  renderGEXExpBar();
  renderGEXFiltered();
}

let _gexView='chart';
function gxSwitchView(v){
  _gexView=v;
  document.querySelectorAll('.gx-vtab').forEach(b=>b.classList.toggle('sel',b.dataset.v===v));
  document.getElementById('gx-grid').style.display=v==='chart'?'block':'none';
  document.getElementById('gx-heatmap').style.display=v==='heatmap'?'block':'none';
  document.getElementById('gx-vanna').style.display=v==='vanna'?'block':'none';
  if(v==='heatmap') renderGEXHeatmap();
  if(v==='vanna') renderGEXVanna();
}

function renderGEXHeatmap(){
  const container=document.getElementById('gx-heatmap');if(!container)return;
  const items=_gexAllData.filter(d=>_gexSelectedTickers.includes(d.ticker));
  if(!items.length){container.innerHTML='<div style="color:var(--t2);text-align:center;padding:40px;">No data</div>';return;}

  const loc=_currentLang==='pt'?'pt-BR':'en-US';
  container.innerHTML=items.map(item=>{
    const bd=item.exp_breakdown||[];
    if(!bd.length) return '';
    const spot=parseFloat(item.spot_price);

    // Collect all strikes across expirations
    const strikeSet=new Set();
    bd.forEach(exp=>exp.topStrikes.forEach(s=>strikeSet.add(s.strike)));
    const strikes=Array.from(strikeSet).sort((a,b)=>b-a);
    const nearSpot=strikes.filter(s=>s>=spot*0.96&&s<=spot*1.04);
    const displayStrikes=nearSpot.length>5?nearSpot:strikes.slice(0,30);
    displayStrikes.sort((a,b)=>b-a);

    // Build GEX lookup: {exp: {strike: gex}}
    const lookup={};
    let maxAbsGex=1;
    bd.forEach(exp=>{
      lookup[exp.expiration]={};
      exp.topStrikes.forEach(s=>{
        lookup[exp.expiration][s.strike]=s.gex;
        if(Math.abs(s.gex)>maxAbsGex) maxAbsGex=Math.abs(s.gex);
      });
    });

    const cols=bd.length+1;
    const expHeaders=bd.map(exp=>{
      const d=new Date(exp.expiration+'T12:00:00');
      return`<div class="gx-hm-hdr">${d.toLocaleDateString(loc,{month:'short',day:'numeric'})}</div>`;
    }).join('');

    const rows=displayStrikes.map(strike=>{
      const isSpot=Math.abs(strike-Math.round(spot))<=2;
      const strikeCell=`<div class="gx-hm-strike">${gxFmt(strike)}</div>`;
      const cells=bd.map(exp=>{
        const gex=lookup[exp.expiration]?.[strike]||0;
        const intensity=Math.min(Math.abs(gex)/maxAbsGex,1);
        let bg,color;
        if(gex>0){
          bg=`rgba(34,197,94,${(intensity*0.7+0.05).toFixed(2)})`;
          color=intensity>0.3?'#fff':'var(--t2)';
        } else if(gex<0){
          bg=`rgba(239,68,68,${(intensity*0.7+0.05).toFixed(2)})`;
          color=intensity>0.3?'#fff':'var(--t2)';
        } else {
          bg='rgba(255,255,255,.03)';
          color='var(--t3)';
        }
        const spotCls=isSpot?' gx-hm-spot':'';
        return`<div class="gx-hm-cell${spotCls}" style="background:${bg};color:${color};" title="${gxFmt(strike)} | ${exp.expiration}: ${gex>0?'+':''}${gex}M">${gex?((gex>0?'+':'')+gex):'·'}</div>`;
      }).join('');
      return strikeCell+cells;
    }).join('');

    const names={ES:'S&P 500',NQ:'Nasdaq 100',SPY:'SPY',QQQ:'QQQ',AAPL:'AAPL',TSLA:'TSLA',NVDA:'NVDA',MSFT:'MSFT',AMZN:'AMZN',META:'META',GOOGL:'GOOGL',GLD:'GLD'};

    return`<div class="gx-hm-wrap">
      <div class="gx-hm-title">${item.ticker} <small>${names[item.ticker]||''} — Spot: ${gxFmt(spot)}</small></div>
      <div class="gx-hm-grid" style="grid-template-columns:auto repeat(${bd.length},1fr);">
        <div class="gx-hm-hdr">Strike</div>
        ${expHeaders}
        ${rows}
      </div>
      <div class="gx-hm-legend">
        <span>Puts (−)</span>
        <div class="gx-hm-legend-bar"></div>
        <span>Calls (+)</span>
        <span style="margin-left:12px;color:var(--gold);">■ Spot</span>
      </div>
    </div>`;
  }).join('');
}

function renderGEXVanna(){
  const container=document.getElementById('gx-vanna');if(!container)return;
  const items=_gexAllData.filter(d=>_gexSelectedTickers.includes(d.ticker));
  if(!items.length){container.innerHTML='<div style="color:var(--t2);text-align:center;padding:40px;">No data</div>';return;}

  const names={ES:'S&P 500',NQ:'Nasdaq 100',SPY:'SPY',QQQ:'QQQ',AAPL:'AAPL',TSLA:'TSLA',NVDA:'NVDA',MSFT:'MSFT',AMZN:'AMZN',META:'META',GOOGL:'GOOGL',GLD:'GLD'};

  container.innerHTML=items.map(item=>{
    const vc=item.vanna_charm;
    if(!vc||!vc.topStrikes||!vc.topStrikes.length) return `<div class="gx-vc-wrap"><div class="gx-vc-title">${item.ticker}</div><div style="color:var(--t3);font-size:12px;padding:20px 0;">${t('gx_vanna_nodata')}</div></div>`;

    const spot=parseFloat(item.spot_price);
    const strikes=vc.topStrikes.sort((a,b)=>b.strike-a.strike);
    const maxV=Math.max(...strikes.map(s=>Math.abs(s.vanna)),1);
    const maxC=Math.max(...strikes.map(s=>Math.abs(s.charm)),1);
    const maxAbs=Math.max(maxV,maxC);

    const rows=strikes.map(s=>{
      const vW=Math.abs(s.vanna)/maxAbs*45;
      const cW=Math.abs(s.charm)/maxAbs*45;
      const vLeft=s.vanna>=0?`left:50%;width:${Math.max(vW,0.5)}%`:`right:50%;width:${Math.max(vW,0.5)}%`;
      const cLeft=s.charm>=0?`left:50%;width:${Math.max(cW,0.5)}%`:`right:50%;width:${Math.max(cW,0.5)}%`;
      return`<div class="gx-vc-row">
        <div class="gx-vc-strike">${gxFmt(s.strike)}</div>
        <div class="gx-vc-bars">
          <div class="gx-vc-center"></div>
          <div class="gx-vc-bar vanna" style="${vLeft};" title="Vanna: ${s.vanna>0?'+':''}${s.vanna}M"></div>
          <div class="gx-vc-bar charm" style="${cLeft};" title="Charm: ${s.charm>0?'+':''}${s.charm}M"></div>
        </div>
      </div>`;
    }).join('');

    const tV=vc.totalVanna||0;
    const tC=vc.totalCharm||0;
    const vannaDir=tV>0?t('gx_vanna_bullish'):t('gx_vanna_bearish');
    const charmDir=tC>0?t('gx_charm_increasing'):t('gx_charm_decaying');

    return`<div class="gx-vc-wrap">
      <div class="gx-vc-title">${item.ticker} <small>${names[item.ticker]||''} — Spot: ${gxFmt(spot)}</small></div>
      <div class="gx-vc-totals">
        <div class="gx-vc-total"><span class="dot vanna"></span> Vanna: ${tV>0?'+':''}${tV}M <small style="color:var(--t3);">${vannaDir}</small></div>
        <div class="gx-vc-total"><span class="dot charm"></span> Charm: ${tC>0?'+':''}${tC}M <small style="color:var(--t3);">${charmDir}</small></div>
      </div>
      <div class="gx-vc-chart">${rows}</div>
      <div class="gx-vc-legend">
        <span><span style="display:inline-block;width:12px;height:4px;background:#8b5cf6;border-radius:2px;vertical-align:middle;"></span> Vanna</span>
        <span><span style="display:inline-block;width:12px;height:4px;background:#06b6d4;border-radius:2px;vertical-align:middle;"></span> Charm</span>
      </div>
      <div class="gx-vc-edu">
        ${t('gx_vanna_edu_vanna')}<br>
        ${t('gx_vanna_edu_charm')}
      </div>
    </div>`;
  }).join('');
}

function renderGEXFiltered(){
  const items=_gexAllData.filter(d=>_gexSelectedTickers.includes(d.ticker));
  if(_gexSelectedExp){
    const filtered=items.map(item=>{
      const bd=(item.exp_breakdown||[]).find(b=>b.expiration===_gexSelectedExp);
      if(!bd) return null;
      return {...item,zero_gamma:bd.zeroGamma,put_wall:bd.putWall,call_wall:bd.callWall,total_gex:bd.totalGex,top_strikes:bd.topStrikes};
    }).filter(Boolean);
    renderGEX(filtered.length?filtered:items);
  } else {
    renderGEX(items);
  }
  if(_gexView==='heatmap') renderGEXHeatmap();
  if(_gexView==='vanna') renderGEXVanna();
}

async function loadGEX(){
  if(_gexLoaded) return;
  const gxLoading = document.getElementById('gx-loading');
  if(!gxLoading) return; // user navigated away from gx page before load completed
  try{
    const{data,error}=await db.from('gex_levels').select('*,updated_at').order('date',{ascending:false}).limit(24);
    if(error) throw error;
    if(!data||!data.length){
      gxLoading.innerHTML='<div style="color:var(--t2);font-size:14px;" data-i18n="gx_no_data">GEX data not yet available. Check back after 6 AM ET.</div>';
      applyTranslations();
      return;
    }
    const latestDate=data[0].date;
    _gexAllData=data.filter(d=>d.date===latestDate);
    renderGEXTickerBar();
    renderGEXExpBar();
    const initial=_gexAllData.filter(d=>_gexSelectedTickers.includes(d.ticker));
    renderGEX(initial.length?initial:_gexAllData.slice(0,2));
    _gexLoaded=true;
  }catch(e){
    console.error('GEX load error:',e);
    if(gxLoading) gxLoading.innerHTML='<div style="color:var(--t2);">Error: '+(e.message||e)+'</div>';
  }
  if(_authLoaded) checkGEXGate();
}

async function checkGEXGate(){
  const wrap=document.getElementById('gx-wrap-inner');
  const gate=document.getElementById('gx-gate');
  if(!wrap||!gate)return;

  if(!currentUser||!currentProfile){
    startPreviewTimer('gx-gate','gx-wrap-inner','gx-wrap-gated');
    return;
  }

  // Logged in — cancel any preview timer/banner
  removePreviewBanner();
  if(_previewCountdown){clearInterval(_previewCountdown);_previewCountdown=null;}

  // Logado = acesso ao GEX (cadastro libera — modelo 2026-05-20).
  if(await checkProAccess()){
    _userHasAccess=true;
    wrap.classList.remove('gx-wrap-gated');
    gate.innerHTML='';
    return;
  }

  wrap.classList.add('gx-wrap-gated');
  gate.innerHTML=buildProGate();
}

function renderGEX(items){
  document.getElementById('gx-loading').style.display='none';
  const grid=document.getElementById('gx-grid');
  grid.style.display='block';

  if(items[0]){
    const d=new Date(items[0].date+'T12:00:00');
    const locMap={pt:'pt-BR',en:'en-US',es:'es-ES',it:'it-IT',fr:'fr-FR',de:'de-DE',ar:'ar-SA'};
    const loc=locMap[_currentLang]||'en-US';
    const ds=d.toLocaleDateString(loc,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    const el=document.getElementById('gx-date');
    if(el){
      el.removeAttribute('data-i18n');
      let timeStr='';
      if(items[0].updated_at){
        const upd=new Date(items[0].updated_at);
        timeStr=' — '+upd.toLocaleTimeString(loc,{hour:'2-digit',minute:'2-digit',timeZone:'America/New_York'})+' ET';
      }
      el.innerHTML=t('gx_updated_prefix')+' <strong>'+ds+'</strong>'+timeStr;
    }
  }

  grid.innerHTML=items.map(item=>{
    const names={ES:'S&P 500 Futures',NQ:'Nasdaq 100 Futures',SPY:'SPDR S&P 500 ETF',QQQ:'Invesco QQQ ETF',AAPL:'Apple Inc.',TSLA:'Tesla Inc.',NVDA:'NVIDIA Corp.',MSFT:'Microsoft Corp.',AMZN:'Amazon.com Inc.',META:'Meta Platforms',GOOGL:'Alphabet Inc.',GLD:'SPDR Gold Shares'};
    const totalGex=parseFloat(item.total_gex)||0;
    const regime=totalGex>=0;
    const regimeLabel=regime?t('gx_positive'):t('gx_negative');
    const regimeClass=regime?'gx-regime-pos':'gx-regime-neg';
    const topStrikes=(item.top_strikes||[]).sort((a,b)=>a.strike-b.strike);
    const maxGex=Math.max(...topStrikes.map(s=>Math.abs(s.gex)),1);
    const spot=parseFloat(item.spot_price);
    const ROW_H=15;

    // All levels
    const levels=[
      {val:parseFloat(item.zero_gamma),cls:'lv-zero',label:'Zero Gamma'},
      {val:parseFloat(item.put_wall),cls:'lv-put',label:'Put Wall'},
      {val:parseFloat(item.call_wall),cls:'lv-call',label:'Call Wall'},
      {val:parseFloat(item.hvl),cls:'lv-hvl',label:'HVL'},
      {val:parseFloat(item.vol_trigger)||0,cls:'lv-vt',label:'Vol Trigger'},
      {val:parseFloat(item.max_pain)||0,cls:'lv-mp',label:'Max Pain'},
    ].filter(l=>l.val>0);

    // Map strikes that match a level → highlight row + tag
    const strikeLevels={};
    levels.forEach(l=>{const k=Math.round(l.val);if(!strikeLevels[k])strikeLevels[k]=[];strikeLevels[k].push(l);});

    // Ensure level strikes are in the chart even if not in top 50
    const strikeSet=new Set(topStrikes.map(s=>s.strike));
    for(const k of Object.keys(strikeLevels).map(Number)){
      if(!strikeSet.has(k)){topStrikes.push({strike:k,gex:0,type:'neutral'});strikeSet.add(k);}
    }
    topStrikes.sort((a,b)=>a.strike-b.strike);
    const minStrike=topStrikes[0]?.strike||spot-100;
    const maxStrike=topStrikes[topStrikes.length-1]?.strike||spot+100;
    const range=maxStrike-minStrike||1;
    const chartH=topStrikes.length*ROW_H;

    function lvTop(val){return((maxStrike-val)/range)*100;}
    const spotTop=lvTop(spot);

    // Build horizontal bar rows (top=highest strike, bottom=lowest)
    const reversedStrikes=[...topStrikes].reverse();
    const rows=reversedStrikes.map(s=>{
      const w=Math.abs(s.gex)/maxGex*48;
      const isPos=s.gex>=0;
      const barStyle=isPos
        ?`left:50%;width:${Math.max(w,0.5)}%;`
        :`right:50%;width:${Math.max(w,0.5)}%;`;
      const lvls=strikeLevels[s.strike]||[];
      const hlCls=lvls.length?` gx-hl-${lvls[0].cls}`:'';
      const lines=lvls.map(l=>`<div class="gx-lvl-line ${l.cls}"></div>`).join('');
      return`<div class="gx-hrow${lvls.length?' gx-hrow-level':''}">
        <div class="gx-hlabel${hlCls}">${gxFmt(s.strike)}</div>
        <div class="gx-hbar-area">
          <div class="gx-zero-line"></div>
          <div class="gx-hbar ${isPos?'pos':'neg'}" style="${barStyle}"></div>
          <div class="gx-htip">${gxFmt(s.strike)}: ${s.gex>0?'+':''}${s.gex}M</div>
        </div>
        ${lines}
      </div>`;
    }).join('');

    // Level tags: collect all, compute positions, anti-collision, render absolute in chart
    const allTags=[];
    reversedStrikes.forEach((s,idx)=>{
      const lvls=strikeLevels[s.strike]||[];
      lvls.forEach(l=>{allTags.push({...l,basePx:idx*ROW_H+ROW_H/2});});
    });
    allTags.sort((a,b)=>a.basePx-b.basePx);
    const TAG_H=20;
    for(let i=0;i<allTags.length;i++) allTags[i].tagPx=allTags[i].basePx;
    for(let pass=0;pass<3;pass++){
      for(let i=1;i<allTags.length;i++){
        if(allTags[i].tagPx-allTags[i-1].tagPx<TAG_H) allTags[i].tagPx=allTags[i-1].tagPx+TAG_H;
      }
    }
    const levelTags=allTags.map(t=>`<div class="gx-row-tag ${t.cls}" style="top:${Math.round(t.tagPx-8)}px;">${t.label}</div>`).join('');

    // Spot price line — find closest row
    let spotIdx=0,spotMinD=Infinity;
    reversedStrikes.forEach((s,i)=>{const d=Math.abs(s.strike-Math.round(spot));if(d<spotMinD){spotMinD=d;spotIdx=i;}});
    const spotPx=spotIdx*ROW_H+ROW_H/2;
    const spotLine=`<div class="gx-spot-line" style="top:${spotPx}px;"><div class="gx-spot-tag">${gxFmt(spot)}</div></div>`;

    return`<div class="gx-asset-card">
      <div class="gx-asset-hd">
        <div class="gx-asset-name">${item.ticker} <small>${names[item.ticker]||''}</small></div>
        <div class="gx-asset-spot">${gxFmt(spot)} <span class="gx-regime ${regimeClass}">${regimeLabel}</span></div>
      </div>
      <div class="gx-levels">
        <div class="gx-lvl"><div class="gx-lvl-label">Zero Gamma</div><div class="gx-lvl-val zero">${gxFmt(item.zero_gamma)}</div><div class="gx-lvl-desc">Gamma Flip</div></div>
        <div class="gx-lvl"><div class="gx-lvl-label">Put Wall</div><div class="gx-lvl-val put">${gxFmt(item.put_wall)}</div><div class="gx-lvl-desc">${t('gx_support')}</div></div>
        <div class="gx-lvl"><div class="gx-lvl-label">Call Wall</div><div class="gx-lvl-val call">${gxFmt(item.call_wall)}</div><div class="gx-lvl-desc">${t('gx_resistance')}</div></div>
        <div class="gx-lvl"><div class="gx-lvl-label">HVL</div><div class="gx-lvl-val hvl">${gxFmt(item.hvl)}</div><div class="gx-lvl-desc">${t('gx_magnet')}</div></div>
        <div class="gx-lvl"><div class="gx-lvl-label">Vol Trigger</div><div class="gx-lvl-val vt">${gxFmt(item.vol_trigger||0)}</div><div class="gx-lvl-desc">${t('gx_vol_trigger')}</div></div>
        <div class="gx-lvl"><div class="gx-lvl-label">Max Pain</div><div class="gx-lvl-val mp">${gxFmt(item.max_pain||0)}</div><div class="gx-lvl-desc">${t('gx_max_pain')}</div></div>
      </div>
      <div class="gx-chart-wrap">
        <div class="gx-chart-title">Gamma Exposure<small>Total: ${totalGex>0?'+':''}${totalGex}M</small></div>
        <div class="gx-hchart" style="height:${chartH}px;">
          ${rows}
          ${spotLine}
          ${levelTags}
        </div>
        <div class="gx-chart-legend">
          <span><span class="dot pos"></span> Calls (${t('gx_resistance').toLowerCase()})</span>
          <span><span class="dot neg"></span> Puts (${t('gx_support').toLowerCase()})</span>
          <span style="color:var(--gold);">— ${gxFmt(spot)} Spot</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ─── BEHAVIORAL TRACKING MODULE ─── */
(function(){
  if(typeof track!=='function') return;

  // 1. Scroll depth tracking (25%, 50%, 75%, 100%)
  const _scrollFired={};
  let _scrollTick=false;
  window.addEventListener('scroll',function(){
    if(_scrollTick) return; _scrollTick=true;
    requestAnimationFrame(function(){
      _scrollTick=false;
      const h=document.documentElement.scrollHeight-window.innerHeight;
      if(h<=0) return;
      const pct=Math.round(window.scrollY/h*100);
      [25,50,75,100].forEach(function(m){
        if(pct>=m && !_scrollFired[m]){
          _scrollFired[m]=true;
          track('scroll_depth',{depth:m,page:_currentPage||'home'});
        }
      });
    });
  },{passive:true});

  // Reset scroll tracking on page change
  const _origGo=window.go;
  if(typeof _origGo==='function'){
    window.go=function(){
      Object.keys(_scrollFired).forEach(function(k){delete _scrollFired[k];});
      return _origGo.apply(this,arguments);
    };
  }

  // 2. Engagement time (fires every 30s while tab is visible)
  let _engStart=Date.now(), _engTotal=0, _engVisible=true;
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){
      _engTotal+=Date.now()-_engStart;
      _engVisible=false;
      track('tab_hidden',{time_on_page:Math.round(_engTotal/1000),page:_currentPage||'home'});
    } else {
      _engStart=Date.now();
      _engVisible=true;
      track('tab_visible',{page:_currentPage||'home'});
    }
  });
  setInterval(function(){
    if(!_engVisible) return;
    const total=_engTotal+(Date.now()-_engStart);
    const secs=Math.round(total/1000);
    if(secs>0 && secs%30===0) track('engagement_time',{seconds:secs,page:_currentPage||'home'});
  },30000);

  // 3. Session end (beforeunload) — time on site
  window.addEventListener('beforeunload',function(){
    const total=_engTotal+(_engVisible?Date.now()-_engStart:0);
    track('session_end',{total_seconds:Math.round(total/1000),pages_viewed:window._pagesViewed||1});
  });

  // 4. Rage clicks (3+ clicks within 800ms in same area)
  let _rageClicks=[], _rageTimer=null;
  document.addEventListener('click',function(e){
    _rageClicks.push({x:e.clientX,y:e.clientY,t:Date.now()});
    clearTimeout(_rageTimer);
    _rageTimer=setTimeout(function(){
      const now=Date.now();
      const recent=_rageClicks.filter(function(c){return now-c.t<800;});
      if(recent.length>=3){
        const el=document.elementFromPoint(recent[0].x,recent[0].y);
        track('rage_click',{
          clicks:recent.length,
          element:el?(el.tagName+(el.className?' .'+el.className.split(' ')[0]:'')):'-',
          page:_currentPage||'home'
        });
      }
      _rageClicks=[];
    },900);
  },{passive:true});

  // 5. JS Error tracking
  window.addEventListener('error',function(e){
    if(!rateLimit('js_error',5000)) return;
    track('js_error',{message:(e.message||'').slice(0,100),source:(e.filename||'').split('/').pop(),line:e.lineno,page:_currentPage||'home'});
  });
  window.addEventListener('unhandledrejection',function(e){
    if(!rateLimit('promise_error',5000)) return;
    track('js_error',{message:('Promise: '+(e.reason?.message||String(e.reason)||'')).slice(0,100),page:_currentPage||'home'});
  });

  // 6. Idle detection (60s no interaction = idle, reactivation tracked)
  let _idleTimer=null, _isIdle=false;
  function _resetIdle(){
    if(_isIdle){_isIdle=false;track('user_reactivated',{idle_seconds:60,page:_currentPage||'home'});}
    clearTimeout(_idleTimer);
    _idleTimer=setTimeout(function(){_isIdle=true;track('user_idle',{page:_currentPage||'home'});},60000);
  }
  ['mousemove','keydown','scroll','touchstart','click'].forEach(function(ev){
    document.addEventListener(ev,_resetIdle,{passive:true,once:false});
  });
  _resetIdle();

  // 7. Outbound link clicks
  document.addEventListener('click',function(e){
    const a=e.target.closest('a[href]');
    if(!a) return;
    const href=a.href||'';
    if(href.startsWith('http') && !href.includes(location.hostname)){
      track('outbound_click',{url:href.slice(0,120),text:(a.textContent||'').trim().slice(0,50),page:_currentPage||'home'});
    }
  },{passive:true});

  // 8. Page count tracker
  window._pagesViewed=(window._pagesViewed||0)+1;
})();

// ═══ NEWSLETTER SUBSCRIBE ═══
async function subscribeNewsletter(e){
  e.preventDefault();
  const input = document.getElementById('ft-nl-email');
  const btn = document.getElementById('ft-nl-btn');
  const msg = document.getElementById('ft-nl-msg');
  const email = (input?.value||'').trim().toLowerCase();
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

  btn.disabled = true;
  btn.textContent = '...';

  try {
    const lang = _currentLang || 'en';
    const { error } = await db.from('email_subscribers').upsert({
      email: email,
      name: '',
      source: 'newsletter',
      lang: lang,
      tags: ['newsletter','site'],
      status: 'active'
    }, { onConflict: 'email', ignoreDuplicates: true });

    if(error) throw error;

    msg.style.display = 'block';
    msg.style.color = '#4ade80';
    msg.textContent = t('ft_newsletter_ok') || 'Done! You\'ll receive our best deals.';
    input.value = '';
    track('newsletter_subscribe', { lang: lang, em: email, content_name:'Newsletter', content_category:'newsletter' });
  } catch(err) {
    msg.style.display = 'block';
    msg.style.color = '#ef4444';
    msg.textContent = t('ft_newsletter_error') || 'Error. Try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = t('ft_newsletter_btn') || 'Subscribe';
  }
  return false;
}

/* ══════════════════════════════════════════════════════════════════════════
   CONFIRM EMAIL MODAL — B.3.2 (Fix #1.6)
   ══════════════════════════════════════════════════════════════════════════ */
let _cemRateInterval = null;
let _cemPendingEmail = null;

function showConfirmEmailModal(state){
  state = state || 'pending';
  const email = _cemPendingEmail || currentUser?.email || currentProfile?.email || '';
  if(!email){ openAuthModal('signup'); return; }
  _cemPendingEmail = email;
  const ov = document.getElementById('confirm-email-overlay');
  if(!ov) return;
  const ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  document.getElementById('cem-icon').innerHTML = state==='expired' ? ICON_CLOCK : ICON_MAIL;
  document.getElementById('cem-title').textContent = t(state==='expired'?'cem_expired_title':'cem_pending_title');
  document.getElementById('cem-body').textContent  = t(state==='expired'?'cem_expired_body':'cem_pending_body');
  document.getElementById('cem-email-display').textContent = email;
  const btn = document.getElementById('cem-resend-btn');
  btn.textContent = t('cem_resend');
  btn.disabled = false;
  document.getElementById('cem-rate-limit').style.display = 'none';
  document.getElementById('cem-close-text').textContent = t('cem_close');
  ov.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  try{ sessionStorage.setItem('confirm_modal_shown','1'); }catch(e){}
}

function closeConfirmEmailModal(){
  const ov = document.getElementById('confirm-email-overlay');
  if(ov) ov.style.display = 'none';
  document.body.style.overflow = '';
  if(_cemRateInterval){ clearInterval(_cemRateInterval); _cemRateInterval = null; }
}

async function resendConfirmEmail(){
  if(!_cemPendingEmail) return;
  const btn = document.getElementById('cem-resend-btn');
  btn.disabled = true;
  try{
    const r = await fetch('/api/welcome-email',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'send_confirm', email:_cemPendingEmail, lang:(window.currentLang||'pt')})
    });
    const j = await r.json().catch(()=>({}));
    if(r.status===429){ startResendCountdown(j.retry_after||120); return; }
    if(!r.ok){ btn.disabled = false; showCemToast(t('cem_resent_ok'),'#EF4444'); return; }
    showCemToast(t('cem_resent_ok'));
    startResendCountdown(120);
  }catch(e){
    btn.disabled = false;
    showCemToast(t('cem_resent_ok'),'#EF4444');
  }
}

function startResendCountdown(secs){
  const btn = document.getElementById('cem-resend-btn');
  const rl  = document.getElementById('cem-rate-limit');
  if(!btn || !rl) return;
  let s = secs;
  btn.disabled = true;
  rl.style.display = 'block';
  rl.textContent = t('cem_rate_limit').replace('{s}', s);
  if(_cemRateInterval) clearInterval(_cemRateInterval);
  _cemRateInterval = setInterval(()=>{
    s--;
    if(s<=0){ clearInterval(_cemRateInterval); _cemRateInterval=null; rl.style.display='none'; btn.disabled=false; return; }
    rl.textContent = t('cem_rate_limit').replace('{s}', s);
  },1000);
}

function showCemToast(msg, bg){
  let el = document.getElementById('cem-toast');
  if(!el){ el = document.createElement('div'); el.id = 'cem-toast'; el.className = 'cem-toast'; document.body.appendChild(el); }
  el.style.background = bg || '#10B981';
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(()=>{ el.style.display = 'none'; }, 3000);
}

(function handleConfirmQueryParams(){
  try{
    const q = new URLSearchParams(location.search);
    const cleanQuery = (keys)=>{
      keys.forEach(k=>q.delete(k));
      const qs = q.toString();
      history.replaceState(null,'',location.pathname + (qs?'?'+qs:'') + location.hash);
    };
    if(q.get('email_confirmed')==='1'){
      setTimeout(()=>showCemToast(t('cem_confirmed_ok')||'Email confirmed!'), 600);
      cleanQuery(['email_confirmed','email']);
    }
    const err = q.get('email_confirm_error');
    if(err){
      _cemPendingEmail = q.get('email') || null;
      setTimeout(()=>showConfirmEmailModal('expired'), 600);
      cleanQuery(['email_confirm_error','email']);
    }
    if(q.get('just_confirmed')==='1'){
      const em = q.get('email');
      setTimeout(()=>{ try{ openAuthModal('login'); const f=document.getElementById('auth-login-email'); if(f && em) f.value=em; const p=document.getElementById('auth-login-pass'); if(p) p.focus(); }catch(e){} }, 500);
      cleanQuery(['just_confirmed','email']);
    }
  }catch(e){}
})();

/* ============= GIVEAWAY POPUP ============= */
let _gwData = null;
let _gwShownAt = 0;

async function loadActiveGiveaway(){
  if(_gwData!==null) return _gwData;
  try{
    const { data } = await db.from('giveaways').select('*').eq('active',true).order('created_at',{ascending:false}).limit(1).maybeSingle();
    _gwData = data || false;
    return _gwData;
  }catch(e){ _gwData=false; return false; }
}

function gwAlreadyEntered(slug){
  try{ return localStorage.getItem('mc_gw_entered_'+slug)==='1'; }catch(e){ return false; }
}
function gwClosedRecently(slug, days){
  try{
    const t = parseInt(localStorage.getItem('mc_gw_closed_'+slug)||'0',10);
    return t && (Date.now()-t) < days*86400000;
  }catch(e){ return false; }
}
function gwSeenThisSession(slug){
  try{ return sessionStorage.getItem('mc_gw_seen_'+slug)==='1'; }catch(e){ return false; }
}

async function maybeShowGiveaway(triggerFirmId, triggerType){
  if(currentProfile && currentProfile.is_admin) return;
  const gw = await loadActiveGiveaway();
  if(!gw) return;
  if(gw.firm_id && gw.firm_id !== triggerFirmId && !gw.show_global) return;
  if(triggerType==='firm_open' && !gw.show_on_firm_open) return;
  if(triggerType==='coupon_copy' && !gw.show_on_coupon_copy) return;
  if(triggerType==='checkout' && !gw.show_on_checkout) return;
  if(gwAlreadyEntered(gw.slug)) return;
  if(gwSeenThisSession(gw.slug)) return;
  if(gwClosedRecently(gw.slug, gw.reshow_after_close_days||7)) return;

  // ANTI-CANIBALIZAÇÃO (2026-05-09):
  // 1. Se user já copiou cupom da firma do giveaway nesta sessão → tem intent de compra alta, NÃO mostrar
  try{
    if(sessionStorage.getItem('mc_coupon_copied_'+gw.firm_id)) return;
  }catch(e){}
  // 2. Se user já clicou checkout da firma → NÃO mostrar
  try{
    if(sessionStorage.getItem('mc_checkout_clicked_'+gw.firm_id)) return;
  }catch(e){}
  // 3. Só mostra a partir do 2º firm_open na mesma sessão (1ª vez é "exploração", 2ª é "considerando")
  try{
    const opens = parseInt(sessionStorage.getItem('mc_firm_opens_'+gw.firm_id)||'0',10) + 1;
    sessionStorage.setItem('mc_firm_opens_'+gw.firm_id, String(opens));
    if(opens < 2) return; // primeira vez não mostra
  }catch(e){}

  setTimeout(()=>showGiveaway(gw, triggerType), gw.delay_ms||3000);
}

function showGiveaway(gw, trigger){
  const bd = document.getElementById('gw-bd'); if(!bd) return;
  // Aplicar i18n nos elementos com data-i18n (pill, draw_date label, how_to_enter, cta, free_entry, maybe_later)
  if (typeof applyTranslations === 'function') applyTranslations();
  // Title: usa i18n key específica por firma se existir, senão fallback pro prize_label do DB
  const titleKey = 'gw_title_' + (gw.firm_id || '').toLowerCase();
  const titleI18n = (typeof t === 'function') ? t(titleKey) : null;
  const titleEl = document.querySelector('[data-gw="title"]');
  if(titleEl) titleEl.innerHTML = (titleI18n && titleI18n !== titleKey) ? titleI18n : (gw.prize_label || 'Win a free Evaluation');
  // Subtitle: i18n genérica
  const subEl = document.querySelector('[data-gw="sub"]');
  if(subEl) subEl.innerHTML = (typeof t === 'function') ? t('gw_subtitle') : '3 accounts. Free entry. Your shot at funded.';
  // Disclaimer: i18n específica por firma se existir, senão DB
  const disclKey = 'gw_disclaimer_' + (gw.firm_id || '').toLowerCase();
  const disclI18n = (typeof t === 'function') ? t(disclKey) : null;
  const disclText = (disclI18n && disclI18n !== disclKey) ? disclI18n : (gw.prize_disclaimer || '');
  const whatYouWin = (typeof t === 'function') ? t('gw_what_you_win') : 'What you win';
  document.querySelector('[data-gw="disclaimer"]').innerHTML = '<strong>'+whatYouWin+':</strong> '+disclText;
  const heroImg = document.getElementById('gw-hero');
  if(heroImg && gw.hero_image){ heroImg.src = gw.hero_image; heroImg.alt = gw.prize_label?.replace(/<[^>]+>/g,'') || 'Giveaway prize'; }
  if(gw.draw_date){
    const d = new Date(gw.draw_date+'T12:00:00');
    const langMap = {pt:'pt-BR',en:'en-US',es:'es-ES',fr:'fr-FR',it:'it-IT',de:'de-DE',ar:'ar-SA'};
    const locale = langMap[_currentLang] || 'en-US';
    document.getElementById('gw-date').textContent = d.toLocaleDateString(locale, {month:'long',day:'numeric',year:'numeric'});
  }
  const stepsEl = document.getElementById('gw-steps');
  // Steps: tenta i18n key gw_step1..gw_step4, senão usa do DB
  stepsEl.innerHTML = (gw.steps||[]).map((s,i)=>{
    const stepKey = 'gw_step' + (i+1);
    const stepI18n = (typeof t === 'function') ? t(stepKey) : null;
    const txt = (stepI18n && stepI18n !== stepKey) ? stepI18n : s.text;
    return `<li class="gw-stp"><span class="gw-stp-n">${i+1}</span><span>${txt}</span></li>`;
  }).join('');
  const cta = document.getElementById('gw-cta');
  if(cta){
    const ctaI18n = (typeof t === 'function') ? t('gw_cta') : null;
    cta.textContent = (ctaI18n && ctaI18n !== 'gw_cta') ? ctaI18n : (gw.cta_label || 'Sign up & enter the giveaway');
  }
  bd.dataset.slug = gw.slug;
  bd.dataset.instagram = gw.instagram_url || '';
  bd.classList.add('show');
  _gwShownAt = Date.now();
  try{ sessionStorage.setItem('mc_gw_seen_'+gw.slug,'1'); }catch(e){}
  try{ track('giveaway_popup_shown', {slug:gw.slug, trigger, firm:gw.firm_id}); }catch(e){}
}

function closeGiveaway(reason){
  const bd = document.getElementById('gw-bd'); if(!bd) return;
  if(!bd.classList.contains('show')) return;
  const slug = bd.dataset.slug;
  const elapsed = _gwShownAt ? Math.round((Date.now()-_gwShownAt)/1000) : 0;
  bd.classList.remove('show');
  try{ localStorage.setItem('mc_gw_closed_'+slug, String(Date.now())); }catch(e){}
  try{ track('giveaway_popup_close_'+(reason||'x'), {slug, time_to_close_s:elapsed}); }catch(e){}
}

async function giveawayCtaClick(){
  const bd = document.getElementById('gw-bd');
  const slug = bd?.dataset?.slug;
  const igUrl = bd?.dataset?.instagram;
  const elapsed = _gwShownAt ? Math.round((Date.now()-_gwShownAt)/1000) : 0;
  try{ track('giveaway_popup_cta_click', {slug, time_to_click_s:elapsed}); }catch(e){}
  if(currentUser && currentProfile){
    // Já logado — só marca tag e abre Instagram
    try{
      await db.from('email_subscribers').upsert({email: currentUser.email, tags:['received-giveaway-'+slug, 'giveaway-entered']}, {onConflict:'email'});
    }catch(e){}
    try{ localStorage.setItem('mc_gw_entered_'+slug,'1'); }catch(e){}
    try{ track('giveaway_popup_instagram_open', {slug}); }catch(e){}
    bd?.classList.remove('show');
    if(igUrl) window.open(igUrl,'_blank','noopener');
    return;
  }
  // Não logado — abre signup. Tag será adicionada após confirmação.
  try{ sessionStorage.setItem('mc_gw_pending_signup', slug); }catch(e){}
  try{ sessionStorage.setItem('mc_gw_pending_ig', igUrl||''); }catch(e){}
  bd?.classList.remove('show');
  if(typeof openAuthModal==='function') openAuthModal('signup');
}

// ESC fecha popup
document.addEventListener('keydown', function(e){
  if(e.key==='Escape'){
    const bd = document.getElementById('gw-bd');
    if(bd && bd.classList.contains('show')) closeGiveaway('esc');
  }
});

// Hook pós-signup: se houver giveaway pendente, marca tag e abre Instagram
window.addEventListener('mc:user-loaded', async function(){
  let pendingSlug, pendingIg;
  try{ pendingSlug = sessionStorage.getItem('mc_gw_pending_signup'); pendingIg = sessionStorage.getItem('mc_gw_pending_ig'); }catch(e){}
  if(!pendingSlug || !currentUser) return;
  try{
    await db.from('email_subscribers').upsert({email: currentUser.email, tags:['received-giveaway-'+pendingSlug, 'giveaway-entered']}, {onConflict:'email'});
  }catch(e){}
  try{ localStorage.setItem('mc_gw_entered_'+pendingSlug,'1'); }catch(e){}
  try{ sessionStorage.removeItem('mc_gw_pending_signup'); sessionStorage.removeItem('mc_gw_pending_ig'); }catch(e){}
  try{ track('giveaway_popup_signup_complete', {slug:pendingSlug}); }catch(e){}
  if(pendingIg){
    try{ track('giveaway_popup_instagram_open', {slug:pendingSlug}); }catch(e){}
    setTimeout(()=>window.open(pendingIg,'_blank','noopener'), 1500);
  }
});
