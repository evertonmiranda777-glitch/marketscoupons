/* Giveaway popup , módulo único (site + /coupons), 8 idiomas, auto-contido.
   Captura nome+email SEM sair da tela -> sucesso rápido -> auto-fecha ~2.3s.
   Email das regras dispara em 2º plano via /api/leads/volumefilter?action=subscribe.
   Gated: só aparece se giveaways.active=true (ou ?gw_preview=1 pra quem tem o link). */
(function(){
  if (window.__mcGwLoaded) return; window.__mcGwLoaded = true;
  var SB = 'https://qfwhduvutfumsaxnuofa.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

  var S = {
    en:{title:'Win <em>3 Apex</em> Accounts',eyebrow:"We're giving away",sub:'Drop your name and email to enter. We\'ll send the rules and your entry link right away.',ticket:'EVALUATION',name:'Your name',email:'Your best email',cta:'Enter the giveaway',okh:"You're in!",okp:'Check your email , we sent the rules and your entry link to',draw:'Draw',free:'Free to enter, no purchase needed',later:'Maybe later',errn:'Please enter your name.',erre:'Please enter a valid email.',pill:'Giveaway'},
    pt:{title:'Ganhe <em>3 contas</em> Apex',eyebrow:'Estamos sorteando',sub:'Deixe seu nome e email pra entrar. Enviamos as regras e seu link na hora.',ticket:'AVALIAÇÃO',name:'Seu nome',email:'Seu melhor email',cta:'Entrar no sorteio',okh:'Você entrou!',okp:'Confira seu email , enviamos as regras e seu link para',draw:'Sorteio',free:'Grátis, sem compra necessária',later:'Talvez depois',errn:'Digite seu nome.',erre:'Digite um email válido.',pill:'Sorteio'},
    es:{title:'Gana <em>3 cuentas</em> Apex',eyebrow:'Estamos sorteando',sub:'Deja tu nombre y correo para entrar. Enviamos las reglas y tu enlace al instante.',ticket:'EVALUACIÓN',name:'Tu nombre',email:'Tu mejor correo',cta:'Entrar al sorteo',okh:'¡Ya estás dentro!',okp:'Revisa tu correo , enviamos las reglas y tu enlace a',draw:'Sorteo',free:'Gratis, sin compra necesaria',later:'Quizás después',errn:'Escribe tu nombre.',erre:'Escribe un correo válido.',pill:'Sorteo'},
    it:{title:'Vinci <em>3 account</em> Apex',eyebrow:'Stiamo regalando',sub:'Lascia nome ed email per partecipare. Ti inviamo le regole e il link subito.',ticket:'VALUTAZIONE',name:'Il tuo nome',email:'La tua email migliore',cta:'Partecipa al giveaway',okh:'Ci sei!',okp:'Controlla la tua email , abbiamo inviato le regole e il tuo link a',draw:'Estrazione',free:'Gratis, nessun acquisto necessario',later:'Forse dopo',errn:'Inserisci il tuo nome.',erre:'Inserisci un email valida.',pill:'Giveaway'},
    fr:{title:'Gagnez <em>3 comptes</em> Apex',eyebrow:'Nous offrons',sub:'Laissez votre nom et email pour participer. On envoie les règles et votre lien tout de suite.',ticket:'ÉVALUATION',name:'Votre nom',email:'Votre meilleur email',cta:'Participer au tirage',okh:'Vous participez !',okp:'Consultez votre email , on a envoyé les règles et votre lien à',draw:'Tirage',free:'Gratuit, sans achat',later:'Plus tard',errn:'Entrez votre nom.',erre:'Entrez un email valide.',pill:'Tirage'},
    de:{title:'Gewinne <em>3 Apex</em>-Konten',eyebrow:'Wir verlosen',sub:'Name und E-Mail eingeben, um teilzunehmen. Wir senden die Regeln und deinen Link sofort.',ticket:'EVALUATION',name:'Dein Name',email:'Deine beste E-Mail',cta:'Am Gewinnspiel teilnehmen',okh:'Du bist dabei!',okp:'Prüfe deine E-Mail , wir haben die Regeln und deinen Link gesendet an',draw:'Verlosung',free:'Kostenlos, kein Kauf nötig',later:'Vielleicht später',errn:'Bitte gib deinen Namen ein.',erre:'Bitte gib eine gültige E-Mail ein.',pill:'Gewinnspiel'},
    ar:{title:'اربح <em>3 حسابات</em> Apex',eyebrow:'نقدّم في السحب',sub:'اترك اسمك وبريدك للمشاركة. سنرسل القواعد ورابط مشاركتك فورًا.',ticket:'تقييم',name:'اسمك',email:'أفضل بريد لك',cta:'ادخل السحب',okh:'أنت مشارك!',okp:'تحقق من بريدك , أرسلنا القواعد ورابطك إلى',draw:'السحب',free:'مجاني، بدون شراء',later:'ربما لاحقًا',errn:'من فضلك أدخل اسمك.',erre:'من فضلك أدخل بريدًا صحيحًا.',pill:'سحب'},
    id:{title:'Menangkan <em>3 akun</em> Apex',eyebrow:'Kami membagikan',sub:'Isi nama dan email untuk ikut. Kami kirim aturan dan link kamu langsung.',ticket:'EVALUASI',name:'Nama kamu',email:'Email terbaikmu',cta:'Ikuti giveaway',okh:'Kamu ikut!',okp:'Cek emailmu , kami kirim aturan dan link kamu ke',draw:'Undian',free:'Gratis, tanpa pembelian',later:'Nanti saja',errn:'Masukkan namamu.',erre:'Masukkan email yang valid.',pill:'Giveaway'}
  };
  function lang(){
    var l = window._currentLang || (document.documentElement.getAttribute('lang')||'').slice(0,2);
    try{ l = l || localStorage.getItem('mc_lang') || localStorage.getItem('lang'); }catch(e){}
    l = (l||'en').toLowerCase();
    return S[l] ? l : 'en';
  }
  function esc(s){ return String(s||'').replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); }

  var CSS = '\
  #mcgw-bd{position:fixed;inset:0;background:rgba(5,7,11,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99998;display:none;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;opacity:0;transition:opacity .25s ease}\
  #mcgw-bd.show{display:flex;opacity:1}\
  .g2w{position:relative;width:100%;max-width:430px;margin:auto;overflow:hidden;background:#0A0D14;border:1px solid rgba(61,227,168,.28);border-radius:20px;box-shadow:0 30px 90px rgba(0,0,0,.7),0 0 70px rgba(61,227,168,.10)}\
  .g2w-in{position:relative;padding:20px 22px 16px}\
  .g2w-x{position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#cbd0d8;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:6;font-size:15px}\
  .g2w-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border:1px solid rgba(61,227,168,.45);border-radius:100px;font:700 10.5px monospace;color:#3DE3A8;letter-spacing:.14em;text-transform:uppercase}\
  .g2w-eyebrow{margin-top:13px;font:500 14px Inter,sans-serif;color:rgba(255,255,255,.6)}\
  .g2w-h{margin-top:2px;font:900 35px/0.98 Inter,sans-serif;letter-spacing:-.03em;color:#fff}\
  .g2w-h em{font-style:normal;color:#3DE3A8}\
  .g2w-sub{margin-top:9px;font:500 13.5px/1.4 Inter,sans-serif;color:rgba(255,255,255,.62)}\
  .g2w-tix{display:flex;gap:9px;margin-top:14px}\
  .g2w-tk{flex:1;background:linear-gradient(160deg,#11161f,#0d1219);border:1px solid rgba(61,227,168,.38);border-radius:13px;padding:12px 6px 11px;text-align:center}\
  .g2w-tk-l{font:700 9px monospace;color:#3DE3A8;letter-spacing:.04em}\
  .g2w-tk-n{margin-top:6px;font:900 23px Inter,sans-serif;color:#fff}\
  .g2w-tk-c{margin-top:7px;display:inline-flex;width:19px;height:19px;border-radius:50%;background:#3DE3A8;color:#06150f;align-items:center;justify-content:center;font-size:11px}\
  .g2w-form{margin-top:16px;display:flex;flex-direction:column;gap:9px}\
  .g2w-inp{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:11px;padding:13px 14px;color:#fff;font:500 14px Inter,sans-serif;outline:none;box-sizing:border-box}\
  .g2w-inp:focus{border-color:#3DE3A8}\
  .g2w-inp::placeholder{color:rgba(255,255,255,.4)}\
  .g2w-err{margin-top:8px;color:#ff6b6b;font:600 12px Inter,sans-serif}\
  .g2w-cta{display:block;width:100%;margin-top:12px;background:#3DE3A8;color:#06150f;border:none;border-radius:13px;padding:14px;font:800 15.5px Inter,sans-serif;cursor:pointer;box-shadow:0 16px 40px rgba(61,227,168,.28)}\
  .g2w-ft{margin-top:11px;text-align:center;font:400 11.5px monospace;color:rgba(255,255,255,.4)}\
  .g2w-ft b{color:#fff}\
  .g2w-ft button{background:none;border:none;color:rgba(255,255,255,.55);text-decoration:underline;cursor:pointer;font-size:11.5px;font-family:inherit;margin-top:6px}\
  .g2w-ok-ic{width:58px;height:58px;border-radius:50%;background:rgba(61,227,168,.12);border:1px solid rgba(61,227,168,.4);display:flex;align-items:center;justify-content:center;color:#3DE3A8;margin:6px 0 14px}\
  .g2w-ok-h{font:900 27px Inter,sans-serif;color:#fff}\
  .g2w-ok-p{margin-top:10px;font:500 14px/1.5 Inter,sans-serif;color:rgba(255,255,255,.72)}\
  .g2w-ok-p b{color:#3DE3A8}';

  var slug='', shownAt=0;
  function build(t, isRtl){
    return '<div class="g2w"'+(isRtl?' dir="rtl"':'')+'><div class="g2w-in">\
      <button class="g2w-x" aria-label="Close" data-gw-close>&#10005;</button>\
      <div class="g2w-pill">&#9733; '+esc(t.pill)+'</div>\
      <div class="g2w-eyebrow">'+esc(t.eyebrow)+'</div>\
      <div class="g2w-h">'+t.title+'</div>\
      <div class="g2w-sub">'+esc(t.sub)+'</div>\
      <div class="g2w-tix">'+[0,0,0].map(function(){return '<div class="g2w-tk"><div class="g2w-tk-l">'+esc(t.ticket)+'</div><div class="g2w-tk-n">Apex</div><div class="g2w-tk-c">&#10003;</div></div>';}).join('')+'</div>\
      <div id="gw-fs"><div class="g2w-form">\
        <input id="gw-nm" class="g2w-inp" placeholder="'+esc(t.name)+'" autocomplete="name">\
        <input id="gw-em" class="g2w-inp" type="email" placeholder="'+esc(t.email)+'" autocomplete="email">\
      </div><div class="g2w-err" id="gw-er" style="display:none"></div>\
      <button class="g2w-cta" id="gw-submit">'+esc(t.cta)+' &#8594;</button></div>\
      <div id="gw-ok" style="display:none"><div class="g2w-ok-ic"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>\
        <div class="g2w-ok-h">'+esc(t.okh)+'</div>\
        <div class="g2w-ok-p">'+esc(t.okp)+' <b id="gw-ok-em"></b>.</div></div>\
      <div class="g2w-ft" id="gw-ft"><span id="gw-draw"></span><br><button data-gw-close>'+esc(t.later)+'</button></div>\
    </div></div>';
  }
  function fmtDate(d, l){ try{ var map={pt:'pt-BR',en:'en-US',es:'es-ES',fr:'fr-FR',it:'it-IT',de:'de-DE',ar:'ar-SA',id:'id-ID'}; return new Date(d+'T12:00:00').toLocaleDateString(map[l]||'en-US',{month:'long',day:'numeric',year:'numeric'}); }catch(e){ return d; } }

  function close(reason){ var bd=document.getElementById('mcgw-bd'); if(!bd||!bd.classList.contains('show'))return; bd.classList.remove('show'); try{localStorage.setItem('mc_gw_closed_'+slug,String(Date.now()));}catch(e){} }
  function submit(){
    var l=lang(), t=S[l], er=document.getElementById('gw-er');
    var nm=(document.getElementById('gw-nm').value||'').trim(), em=(document.getElementById('gw-em').value||'').trim();
    function e(m){ er.textContent=m; er.style.display='block'; }
    er.style.display='none';
    if(nm.length<2){ e(t.errn); document.getElementById('gw-nm').focus(); return; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ e(t.erre); document.getElementById('gw-em').focus(); return; }
    // fire-and-forget: sucesso na hora, email em 2º plano
    try{ fetch('/api/leads/volumefilter?action=subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,name:nm,source:'giveaway',lang:l,tags:['giveaway-lead','giveaway-lead-'+slug],giveaway_rules_slug:slug})}).catch(function(){}); }catch(e2){}
    try{ localStorage.setItem('mc_gw_lead_'+slug,'1'); }catch(e2){}
    document.getElementById('gw-ok-em').textContent=em;
    document.getElementById('gw-fs').style.display='none';
    document.getElementById('gw-ft').style.display='none';
    document.getElementById('gw-ok').style.display='block';
    setTimeout(function(){ close('after_lead'); }, 2300);
  }
  function show(gw){
    var l=lang(), t=S[l];
    var host=document.getElementById('mcgw-bd');
    if(!host){ host=document.createElement('div'); host.id='mcgw-bd'; document.body.appendChild(host); }
    host.setAttribute('onclick','');
    host.innerHTML = build(t, l==='ar');
    host.onclick=function(ev){ if(ev.target===host) close('outside'); };
    // título por sorteio (se o DB tiver prize_label, respeita; senão o localizado)
    var draw=document.getElementById('gw-draw');
    if(draw) draw.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" style="vertical-align:-2px;margin-right:4px" fill="none" stroke="#3DE3A8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'+esc(t.draw)+' <b style="color:#fff">'+(gw&&gw.draw_date?fmtDate(gw.draw_date,l):'')+'</b> &middot; '+esc(t.free);
    document.querySelectorAll('[data-gw-close]').forEach(function(b){ b.onclick=function(){ close('x'); }; });
    document.getElementById('gw-submit').onclick=submit;
    slug=(gw&&gw.slug)||'apex-3-accounts-2026';
    host.classList.add('show'); shownAt=Date.now();
    try{ sessionStorage.setItem('mc_gw_seen_'+slug,'1'); }catch(e){}
  }
  function seen(sl){ try{ return sessionStorage.getItem('mc_gw_seen_'+sl)==='1'; }catch(e){ return false; } }
  function closedRecently(sl){ try{ var c=parseInt(localStorage.getItem('mc_gw_closed_'+sl)||'0',10); return c && (Date.now()-c) < 7*864e5; }catch(e){ return false; } }
  function enteredLead(sl){ try{ return localStorage.getItem('mc_gw_lead_'+sl)==='1'; }catch(e){ return false; } }

  function init(){
    var isPreview=false; try{ isPreview=new URLSearchParams(location.search).get('gw_preview')==='1'; }catch(e){}
    // admin não vê (evita poluir)
    if(window.currentProfile && window.currentProfile.is_admin && !isPreview) return;
    fetch(SB+'/rest/v1/giveaways?select=*&order=created_at.desc&limit=1',{headers:{apikey:ANON,Authorization:'Bearer '+ANON}})
      .then(function(r){ return r.json(); })
      .then(function(rows){
        var gw = rows && rows[0]; if(!gw) return;
        if(!isPreview){
          if(!gw.active) return;
          if(seen(gw.slug) || closedRecently(gw.slug) || enteredLead(gw.slug)) return;
        }
        setTimeout(function(){ show(gw); }, isPreview?300:(gw.delay_ms||3000));
      }).catch(function(){});
    // Esc fecha
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') close('esc'); });
  }
  // injeta CSS
  var st=document.createElement('style'); st.id='gw-css'; st.textContent=CSS; document.head.appendChild(st);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.mcGiveaway = { show: show, close: close };
})();
