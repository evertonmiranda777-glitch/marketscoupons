/* Giveaway popup , módulo único (site + /coupons), 8 idiomas, auto-contido.
   Captura nome+email SEM sair da tela -> sucesso rápido -> auto-fecha ~2.3s.
   Email das regras dispara em 2º plano via /api/leads/volumefilter?action=subscribe.
   Gated: só aparece se giveaways.active=true (ou ?gw_preview=1 pra quem tem o link). */
(function(){
  if (window.__mcGwLoaded) return; window.__mcGwLoaded = true;
  var SB = 'https://qfwhduvutfumsaxnuofa.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

  var S = {
    en:{pill:'Exclusive giveaway',title:'Win one of <em>3 Apex</em> accounts',sub:'Register your name and email in under 10 seconds and enter for free.',acct:'Apex Account',wins:['1st Winner','2nd Winner','3rd Winner'],b1:'3 winners',b2:'No purchase required',bres:'Result on',name:'Your name',email:'Your best email',cta:'Enter the giveaway',okh:"You're in!",okp:'Check your email , we sent the rules and your entry link to',later:'Maybe later',errn:'Please enter your name.',erre:'Please enter a valid email.'},
    pt:{pill:'Sorteio exclusivo',title:'Ganhe uma das <em>3 contas</em> Apex',sub:'Cadastre seu nome e e-mail em menos de 10 segundos e participe gratuitamente.',acct:'Conta Apex',wins:['1º Sorteado','2º Sorteado','3º Sorteado'],b1:'3 ganhadores',b2:'Sem compra obrigatória',bres:'Resultado em',name:'Seu nome',email:'Seu melhor e-mail',cta:'Quero participar do sorteio',okh:'Você entrou!',okp:'Confira seu email , enviamos as regras e seu link para',later:'Talvez depois',errn:'Digite seu nome.',erre:'Digite um email válido.'},
    es:{pill:'Sorteo exclusivo',title:'Gana una de las <em>3 cuentas</em> Apex',sub:'Registra tu nombre y correo en menos de 10 segundos y participa gratis.',acct:'Cuenta Apex',wins:['1er Ganador','2º Ganador','3er Ganador'],b1:'3 ganadores',b2:'Sin compra obligatoria',bres:'Resultado el',name:'Tu nombre',email:'Tu mejor correo',cta:'Quiero participar en el sorteo',okh:'¡Ya estás dentro!',okp:'Revisa tu correo , enviamos las reglas y tu enlace a',later:'Quizás después',errn:'Escribe tu nombre.',erre:'Escribe un correo válido.'},
    it:{pill:'Giveaway esclusivo',title:'Vinci uno dei <em>3 account</em> Apex',sub:'Registra nome ed email in meno di 10 secondi e partecipa gratis.',acct:'Account Apex',wins:['1° Vincitore','2° Vincitore','3° Vincitore'],b1:'3 vincitori',b2:'Nessun acquisto obbligatorio',bres:'Risultato il',name:'Il tuo nome',email:'La tua email migliore',cta:'Voglio partecipare al giveaway',okh:'Ci sei!',okp:'Controlla la tua email , abbiamo inviato le regole e il tuo link a',later:'Forse dopo',errn:'Inserisci il tuo nome.',erre:'Inserisci un email valida.'},
    fr:{pill:'Tirage exclusif',title:'Gagnez un des <em>3 comptes</em> Apex',sub:'Enregistrez votre nom et email en moins de 10 secondes et participez gratuitement.',acct:'Compte Apex',wins:['1er Gagnant','2e Gagnant','3e Gagnant'],b1:'3 gagnants',b2:'Sans achat obligatoire',bres:'Résultat le',name:'Votre nom',email:'Votre meilleur email',cta:'Je veux participer au tirage',okh:'Vous participez !',okp:'Consultez votre email , on a envoyé les règles et votre lien à',later:'Plus tard',errn:'Entrez votre nom.',erre:'Entrez un email valide.'},
    de:{pill:'Exklusives Gewinnspiel',title:'Gewinne eines von <em>3 Apex</em>-Konten',sub:'Registriere Name und E-Mail in unter 10 Sekunden und nimm kostenlos teil.',acct:'Apex-Konto',wins:['1. Gewinner','2. Gewinner','3. Gewinner'],b1:'3 Gewinner',b2:'Kein Kauf erforderlich',bres:'Ergebnis am',name:'Dein Name',email:'Deine beste E-Mail',cta:'Am Gewinnspiel teilnehmen',okh:'Du bist dabei!',okp:'Prüfe deine E-Mail , wir haben die Regeln und deinen Link gesendet an',later:'Vielleicht später',errn:'Bitte gib deinen Namen ein.',erre:'Bitte gib eine gültige E-Mail ein.'},
    ar:{pill:'سحب حصري',title:'اربح واحدًا من <em>3 حسابات</em> Apex',sub:'سجّل اسمك وبريدك في أقل من 10 ثوانٍ وشارك مجانًا.',acct:'حساب Apex',wins:['الفائز الأول','الفائز الثاني','الفائز الثالث'],b1:'3 فائزين',b2:'بدون شراء إلزامي',bres:'النتيجة في',name:'اسمك',email:'أفضل بريد لك',cta:'أريد المشاركة في السحب',okh:'أنت مشارك!',okp:'تحقق من بريدك , أرسلنا القواعد ورابطك إلى',later:'ربما لاحقًا',errn:'من فضلك أدخل اسمك.',erre:'من فضلك أدخل بريدًا صحيحًا.'},
    id:{pill:'Giveaway eksklusif',title:'Menangkan salah satu dari <em>3 akun</em> Apex',sub:'Daftarkan nama dan email kamu dalam kurang dari 10 detik dan ikut gratis.',acct:'Akun Apex',wins:['Pemenang 1','Pemenang 2','Pemenang 3'],b1:'3 pemenang',b2:'Tanpa pembelian wajib',bres:'Hasil pada',name:'Nama kamu',email:'Email terbaikmu',cta:'Ikut giveaway sekarang',okh:'Kamu ikut!',okp:'Cek emailmu , kami kirim aturan dan link kamu ke',later:'Nanti saja',errn:'Masukkan namamu.',erre:'Masukkan email yang valid.'}
  };
  function lang(){
    var l = window._currentLang || (document.documentElement.getAttribute('lang')||'').slice(0,2);
    try{ l = l || localStorage.getItem('mc_lang') || localStorage.getItem('lang'); }catch(e){}
    l = (l||'en').toLowerCase();
    return S[l] ? l : 'en';
  }
  function esc(s){ return String(s||'').replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); }

  var TROPHY='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
  var GIFT='<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>';
  var CHK='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#3DE3A8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  var CSS = '\
  #mcgw-bd{position:fixed;inset:0;background:rgba(5,7,11,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99998;display:none;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;opacity:0;transition:opacity .25s ease}\
  #mcgw-bd.show{display:flex;opacity:1}\
  .g2w{position:relative;width:100%;max-width:432px;margin:auto;overflow:hidden;background:#0A0D14;border:1px solid rgba(61,227,168,.28);border-radius:20px;box-shadow:0 30px 90px rgba(0,0,0,.7),0 0 70px rgba(61,227,168,.10)}\
  .g2w::before{content:"";position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:150%;height:80%;background:radial-gradient(ellipse at center,rgba(61,227,168,.16),transparent 62%);pointer-events:none}\
  .g2w-in{position:relative;padding:20px 22px 16px}\
  .g2w-x{position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#cbd0d8;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:6;font-size:15px}\
  .g2w-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border:1px solid rgba(61,227,168,.45);border-radius:100px;font:700 10.5px monospace;color:#3DE3A8;letter-spacing:.14em;text-transform:uppercase}\
  .g2w-h{margin-top:13px;font:900 30px/1.02 Inter,sans-serif;letter-spacing:-.03em;color:#fff}\
  .g2w-h em{font-style:normal;color:#3DE3A8}\
  .g2w-sub{margin-top:9px;font:500 13.5px/1.45 Inter,sans-serif;color:rgba(255,255,255,.64)}\
  .g2w-tix{display:flex;gap:9px;margin-top:16px}\
  .g2w-tk{flex:1;background:linear-gradient(165deg,#12171f,#0c1017);border:1px solid rgba(61,227,168,.30);border-radius:14px;padding:13px 6px 12px;text-align:center}\
  .g2w-tk-ic{color:#F0B429;display:flex;justify-content:center;margin-bottom:5px;filter:drop-shadow(0 2px 8px rgba(240,180,41,.35))}\
  .g2w-tk-n{font:800 12.5px Inter,sans-serif;color:#fff;letter-spacing:-.01em}\
  .g2w-tk-s{margin-top:2px;font:600 10px Inter,sans-serif;color:rgba(255,255,255,.5)}\
  .g2w-bl{margin-top:14px;display:flex;flex-direction:column;gap:8px}\
  .g2w-b{display:flex;align-items:center;gap:9px;font:600 13px Inter,sans-serif;color:rgba(255,255,255,.82)}\
  .g2w-b svg{flex:none}\
  .g2w-b b{color:#fff}\
  .g2w-form{margin-top:16px;display:flex;flex-direction:column;gap:9px}\
  .g2w-inp{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:11px;padding:13px 14px;color:#fff;font:500 14px Inter,sans-serif;outline:none;box-sizing:border-box}\
  .g2w-inp:focus{border-color:#3DE3A8}\
  .g2w-inp::placeholder{color:rgba(255,255,255,.4)}\
  .g2w-err{margin-top:8px;color:#ff6b6b;font:600 12px Inter,sans-serif}\
  .g2w-cta{display:block;width:100%;margin-top:12px;background:#3DE3A8;color:#06150f;border:none;border-radius:13px;padding:14px;font:800 15.5px Inter,sans-serif;cursor:pointer;box-shadow:0 16px 40px rgba(61,227,168,.28)}\
  .g2w-cta:hover{background:#4dedb5}\
  .g2w-ft{margin-top:11px;text-align:center}\
  .g2w-ft button{background:none;border:none;color:rgba(255,255,255,.5);text-decoration:underline;cursor:pointer;font:400 11.5px Inter,sans-serif}\
  .g2w-ok-ic{width:58px;height:58px;border-radius:50%;background:rgba(61,227,168,.12);border:1px solid rgba(61,227,168,.4);display:flex;align-items:center;justify-content:center;color:#3DE3A8;margin:6px 0 14px}\
  .g2w-ok-h{font:900 27px Inter,sans-serif;color:#fff}\
  .g2w-ok-p{margin-top:10px;font:500 14px/1.5 Inter,sans-serif;color:rgba(255,255,255,.72)}\
  .g2w-ok-p b{color:#3DE3A8}';

  var slug='', shownAt=0;
  function build(t, isRtl, drawStr){
    var cards = t.wins.map(function(w,i){
      return '<div class="g2w-tk"><div class="g2w-tk-ic">'+TROPHY+'</div><div class="g2w-tk-n">'+esc(w)+'</div><div class="g2w-tk-s">'+esc(t.acct)+'</div></div>';
    }).join('');
    var bres = drawStr ? '<div class="g2w-b">'+CHK+'<span>'+esc(t.bres)+' <b>'+esc(drawStr)+'</b></span></div>' : '';
    return '<div class="g2w"'+(isRtl?' dir="rtl"':'')+'><div class="g2w-in">\
      <button class="g2w-x" aria-label="Close" data-gw-close>&#10005;</button>\
      <div class="g2w-pill">'+GIFT+' '+esc(t.pill)+'</div>\
      <div class="g2w-h">'+t.title+'</div>\
      <div class="g2w-sub">'+esc(t.sub)+'</div>\
      <div class="g2w-tix">'+cards+'</div>\
      <div class="g2w-bl">\
        <div class="g2w-b">'+CHK+'<span><b>'+esc(t.b1)+'</b></span></div>\
        <div class="g2w-b">'+CHK+'<span>'+esc(t.b2)+'</span></div>\
        '+bres+'</div>\
      <div id="gw-fs"><div class="g2w-form">\
        <input id="gw-nm" class="g2w-inp" placeholder="'+esc(t.name)+'" autocomplete="name">\
        <input id="gw-em" class="g2w-inp" type="email" placeholder="'+esc(t.email)+'" autocomplete="email">\
      </div><div class="g2w-err" id="gw-er" style="display:none"></div>\
      <button class="g2w-cta" id="gw-submit">'+esc(t.cta)+' &#8594;</button></div>\
      <div id="gw-ok" style="display:none"><div class="g2w-ok-ic"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>\
        <div class="g2w-ok-h">'+esc(t.okh)+'</div>\
        <div class="g2w-ok-p">'+esc(t.okp)+' <b id="gw-ok-em"></b>.</div></div>\
      <div class="g2w-ft" id="gw-ft"><button data-gw-close>'+esc(t.later)+'</button></div>\
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
    // se o modal de cadastro/login estiver aberto, NÃO cobrir com o sorteio
    try{ var af=document.getElementById('auth-signup-form'), lf=document.getElementById('auth-login-form');
      if((af&&af.offsetParent!==null)||(lf&&lf.offsetParent!==null)) return; }catch(e){}
    var l=lang(), t=S[l];
    var host=document.getElementById('mcgw-bd');
    if(!host){ host=document.createElement('div'); host.id='mcgw-bd'; document.body.appendChild(host); }
    var drawStr = (gw&&gw.draw_date) ? fmtDate(gw.draw_date,l) : '';
    host.innerHTML = build(t, l==='ar', drawStr);
    host.onclick=function(ev){ if(ev.target===host) close('outside'); };
    document.querySelectorAll('[data-gw-close]').forEach(function(b){ b.onclick=function(){ close('x'); }; });
    document.getElementById('gw-submit').onclick=submit;
    slug=(gw&&gw.slug)||'apex-3-accounts-2026';
    host.classList.add('show'); shownAt=Date.now();
    try{ localStorage.setItem('mc_gw_seen_'+slug,'1'); }catch(e){}
  }
  // REGRA DO EVERTON (16/jul): aparece UMA VEZ e nunca mais, igual o banner de cookies.
  // Era sessionStorage -> apagava ao fechar a aba e o visitante recorrente tomava o popup
  // toda visita = perde venda. Agora localStorage: viu uma vez, acabou.
  function seen(sl){ try{ return localStorage.getItem('mc_gw_seen_'+sl)==='1'; }catch(e){ return false; } }
  function closedRecently(sl){ try{ var c=parseInt(localStorage.getItem('mc_gw_closed_'+sl)||'0',10); return c && (Date.now()-c) < 7*864e5; }catch(e){ return false; } }
  function enteredLead(sl){ try{ return localStorage.getItem('mc_gw_lead_'+sl)==='1'; }catch(e){ return false; } }

  // Na home existe o banner de cookies (#ck-banner). Não empilhar: só abrir o
  // sorteio depois que a pessoa aceitar/recusar cookies. /coupons não tem banner.
  function cookiePending(){
    if(!document.getElementById('ck-banner')) return false;
    try{ return !localStorage.getItem('mc-cookies-consent'); }catch(e){ return false; }
  }
  function whenReady(delay, cb){
    if(!cookiePending()){ setTimeout(cb, delay); return; }
    var iv=setInterval(function(){ if(!cookiePending()){ clearInterval(iv); setTimeout(cb, 1200); } }, 500);
  }
  function init(){
    var isPreview=false, sp=null; try{ sp=new URLSearchParams(location.search); isPreview=sp.get('gw_preview')==='1'; }catch(e){}
    // NÃO abrir por cima do fluxo de cadastro/login: deep-link do sorteio (/signup?gw=),
    // ?signup=1 ou ?login=1. Quem já veio pra se cadastrar não pode levar o popup em cima do form.
    try{ if(sp && !isPreview && (sp.get('signup')==='1' || sp.get('login')==='1' || sp.get('gw'))) return; }catch(e){}
    // Quem JA E MEMBRO nao vê: o popup existe pra capturar nome+email de quem nao tem
    // conta. Logado ja deu os dois -> popup so atrapalha (e cobria o painel).
    // Ele entra no sorteio pelas TAREFAS do painel, nao por aqui.
    try{ if(!isPreview && window.MC_AUTH && window.MC_AUTH.getUser()) return; }catch(e){}
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
        if(isPreview){ setTimeout(function(){ show(gw); }, 300); }
        else { whenReady(gw.delay_ms||3000, function(){ show(gw); }); }
      }).catch(function(){});
    // Esc fecha
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') close('esc'); });
  }
  // injeta CSS
  var st=document.createElement('style'); st.id='gw-css'; st.textContent=CSS; document.head.appendChild(st);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.mcGiveaway = { show: show, close: close };
})();
