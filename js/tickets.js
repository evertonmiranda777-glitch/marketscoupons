/* Bilhetes do sorteio , tarefas que dao chance extra. Modulo auto-contido, 8 idiomas.
   Regra: 1 bilhete por tarefa por sorteio (unique no banco). Honra no clique social
   (igual o concorrente faz) , nao da pra verificar follow de IG por API.
   Abre: window.mcTickets.open()  |  auto apos concluir o onboarding. */
(function(){
  if (window.__mcTixLoaded) return; window.__mcTixLoaded = true;

  var IG = 'https://www.instagram.com/marketscoupons/';
  var TG = 'https://t.me/marketscoupons';

  var S = {
    en:{t:'More chances to win',d:'Each task = 1 extra entry in the draw. No purchase, ever.',
        have:'Your entries',done:'Done',go:'Go',close:'Close',
        k:{complete_profile:'Complete your profile',follow_instagram:'Follow us on Instagram',join_telegram:'Join our Telegram',write_review:'Write a review',refer_friend:'Invite a friend'},
        copied:'Link copied!'},
    pt:{t:'Mais chances de ganhar',d:'Cada tarefa = 1 bilhete extra no sorteio. Sem compra, nunca.',
        have:'Seus bilhetes',done:'Feito',go:'Ir',close:'Fechar',
        k:{complete_profile:'Complete seu perfil',follow_instagram:'Siga no Instagram',join_telegram:'Entre no Telegram',write_review:'Escreva uma review',refer_friend:'Convide um amigo'},
        copied:'Link copiado!'},
    es:{t:'Más chances de ganar',d:'Cada tarea = 1 boleto extra en el sorteo. Sin compra, nunca.',
        have:'Tus boletos',done:'Hecho',go:'Ir',close:'Cerrar',
        k:{complete_profile:'Completa tu perfil',follow_instagram:'Síguenos en Instagram',join_telegram:'Únete a Telegram',write_review:'Escribe una reseña',refer_friend:'Invita a un amigo'},
        copied:'¡Enlace copiado!'},
    it:{t:'Più chance di vincere',d:'Ogni attività = 1 biglietto extra. Nessun acquisto, mai.',
        have:'I tuoi biglietti',done:'Fatto',go:'Vai',close:'Chiudi',
        k:{complete_profile:'Completa il profilo',follow_instagram:'Seguici su Instagram',join_telegram:'Entra nel Telegram',write_review:'Scrivi una recensione',refer_friend:'Invita un amico'},
        copied:'Link copiato!'},
    fr:{t:'Plus de chances de gagner',d:'Chaque tâche = 1 ticket en plus. Sans achat, jamais.',
        have:'Vos tickets',done:'Fait',go:'Aller',close:'Fermer',
        k:{complete_profile:'Complétez votre profil',follow_instagram:'Suivez-nous sur Instagram',join_telegram:'Rejoignez le Telegram',write_review:'Écrivez un avis',refer_friend:'Invitez un ami'},
        copied:'Lien copié !'},
    de:{t:'Mehr Gewinnchancen',d:'Jede Aufgabe = 1 zusätzliches Los. Kein Kauf, niemals.',
        have:'Deine Lose',done:'Erledigt',go:'Los',close:'Schließen',
        k:{complete_profile:'Profil vervollständigen',follow_instagram:'Folge uns auf Instagram',join_telegram:'Tritt Telegram bei',write_review:'Schreibe eine Bewertung',refer_friend:'Lade einen Freund ein'},
        copied:'Link kopiert!'},
    ar:{t:'فرص أكثر للفوز',d:'كل مهمة = فرصة إضافية في السحب. بدون شراء، أبدًا.',
        have:'فرصك',done:'تم',go:'اذهب',close:'إغلاق',
        k:{complete_profile:'أكمل ملفك الشخصي',follow_instagram:'تابعنا على إنستغرام',join_telegram:'انضم إلى تيليجرام',write_review:'اكتب مراجعة',refer_friend:'ادعُ صديقًا'},
        copied:'تم نسخ الرابط!'},
    id:{t:'Lebih banyak peluang menang',d:'Setiap tugas = 1 tiket ekstra. Tanpa pembelian, selamanya.',
        have:'Tiket kamu',done:'Selesai',go:'Buka',close:'Tutup',
        k:{complete_profile:'Lengkapi profilmu',follow_instagram:'Ikuti kami di Instagram',join_telegram:'Gabung Telegram',write_review:'Tulis ulasan',refer_friend:'Undang teman'},
        copied:'Tautan disalin!'}
  };
  function lang(){ var l=(window._currentLang||(document.documentElement.getAttribute('lang')||'').slice(0,2)||'en').toLowerCase(); return S[l]?l:'en'; }
  function esc(s){ return String(s==null?'':s).replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); }
  function A_(){ return window.MC_AUTH || null; }
  function uid(){ try{ var u=A_()&&A_().getUser(); return (u&&u.id)||null; }catch(e){ return null; } }
  function prof(){ try{ return (A_()&&A_().getProfile())||null; }catch(e){ return null; } }
  function dbc(){ try{ return A_()&&A_().getDb(); }catch(e){ return null; } }

  var TASKS = [
    { k:'complete_profile',  n:1, icon:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
    { k:'follow_instagram',  n:1, url:IG, icon:'<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/>' },
    { k:'join_telegram',     n:1, url:TG, icon:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' },
    { k:'write_review',      n:2, url:'/firms', icon:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
    { k:'refer_friend',      n:2, icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>' }
  ];

  var CSS = '\
  #mctix{position:fixed;inset:0;background:rgba(5,7,11,.86);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99992;display:none;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto}\
  #mctix.show{display:flex}\
  .tix-c{position:relative;width:100%;max-width:440px;margin:auto;background:#0A0D14;border:1px solid rgba(61,227,168,.24);border-radius:20px;padding:24px 22px 20px;box-shadow:0 30px 90px rgba(0,0,0,.7)}\
  .tix-x{position:absolute;top:14px;inset-inline-end:14px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#cbd0d8;cursor:pointer;font-size:15px}\
  .tix-h{font:800 23px/1.15 Inter,sans-serif;color:#fff;letter-spacing:-.02em;margin-bottom:6px}\
  .tix-d{font:500 13px/1.5 Inter,sans-serif;color:rgba(255,255,255,.6);margin-bottom:16px}\
  .tix-count{display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,rgba(61,227,168,.14),rgba(61,227,168,.04));border:1px solid rgba(61,227,168,.3);border-radius:14px;padding:14px;margin-bottom:16px}\
  .tix-count b{font:900 30px Inter,sans-serif;color:#3DE3A8;line-height:1}\
  .tix-count span{font:700 11px Inter,sans-serif;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:1.4px}\
  .tix-row{display:flex;align-items:center;gap:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:12px;padding:12px 13px;margin-bottom:8px}\
  .tix-row.on{border-color:rgba(61,227,168,.35);background:rgba(61,227,168,.07)}\
  .tix-ic{width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;color:#F0B429;flex:none}\
  .tix-row.on .tix-ic{color:#3DE3A8}\
  .tix-nm{flex:1;font:600 13.5px Inter,sans-serif;color:#EDF2F7}\
  .tix-n{font:700 11px Inter,sans-serif;color:#F0B429;background:rgba(240,180,41,.12);border-radius:99px;padding:3px 9px;flex:none}\
  .tix-b{background:#F0B429;border:none;color:#0d141c;border-radius:9px;padding:8px 14px;font:800 12px Inter,sans-serif;cursor:pointer;flex:none;font-family:inherit}\
  .tix-ok{color:#3DE3A8;font:800 12px Inter,sans-serif;flex:none;display:flex;align-items:center;gap:4px}\
  .tix-close{display:block;width:100%;margin-top:12px;background:none;border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.6);border-radius:11px;padding:11px;font:600 13px Inter,sans-serif;cursor:pointer;font-family:inherit}\
  .tix-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#3DE3A8;color:#06150f;padding:11px 20px;border-radius:99px;font:700 13px Inter,sans-serif;z-index:99999}';

  var _slug = 'apex-3-accounts-2026', _mine = {};

  async function load(){
    var db = dbc(), id = uid(); if(!db || !id) return;
    try{
      var r = await db.from('giveaway_tickets').select('task,tickets').eq('user_id', id).eq('giveaway_slug', _slug);
      _mine = {}; (r.data||[]).forEach(function(x){ _mine[x.task] = x.tickets; });
    }catch(e){}
  }

  async function award(task, n){
    var db = dbc(), id = uid(); if(!db || !id) return false;
    try{
      var r = await db.from('giveaway_tickets').insert({ user_id:id, giveaway_slug:_slug, task:task, tickets:n });
      if(r.error && r.error.code !== '23505') return false; // 23505 = ja tinha (unique), tudo bem
      _mine[task] = n;
      try{ track('giveaway_task_done', { task:task, tickets:n, slug:_slug }); }catch(e){}
      return true;
    }catch(e){ return false; }
  }

  function total(){ var s=0; for(var k in _mine) s += (_mine[k]||0); return s; }

  function toast(msg){
    var el=document.createElement('div'); el.className='tix-toast'; el.textContent=msg;
    document.body.appendChild(el); setTimeout(function(){ el.remove(); }, 2200);
  }

  function render(){
    var t=S[lang()], rtl=lang()==='ar';
    var rows = TASKS.map(function(x){
      var done = !!_mine[x.k];
      var right = done
        ? '<span class="tix-ok"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+esc(t.done)+'</span>'
        : '<button class="tix-b" data-k="'+x.k+'">'+esc(t.go)+'</button>';
      return '<div class="tix-row'+(done?' on':'')+'">'+
        '<div class="tix-ic"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+x.icon+'</svg></div>'+
        '<div class="tix-nm">'+esc(t.k[x.k])+'</div>'+
        '<div class="tix-n">+'+x.n+'</div>'+ right +'</div>';
    }).join('');
    var host=document.getElementById('mctix');
    host.innerHTML = '<div class="tix-c"'+(rtl?' dir="rtl"':'')+'>'+
      '<button class="tix-x" data-close>&#10005;</button>'+
      '<div class="tix-h">'+esc(t.t)+'</div><div class="tix-d">'+esc(t.d)+'</div>'+
      '<div class="tix-count"><b>'+total()+'</b><span>'+esc(t.have)+'</span></div>'+
      rows +
      '<button class="tix-close" data-close>'+esc(t.close)+'</button></div>';
    host.querySelectorAll('[data-close]').forEach(function(b){ b.onclick=close; });
    host.querySelectorAll('.tix-b').forEach(function(b){
      b.onclick = async function(){
        var k=b.getAttribute('data-k');
        var task=TASKS.filter(function(x){return x.k===k;})[0]; if(!task) return;
        if(k==='refer_friend'){
          var url = location.origin + '/signup?gw=' + encodeURIComponent(_slug);
          try{ await navigator.clipboard.writeText(url); toast(S[lang()].copied); }catch(e){}
        } else if(k==='complete_profile'){
          var p=prof();
          if(!(p && p.onboarding_completed_at)){ if(window.mcOnboarding) window.mcOnboarding.open(); close(); return; }
        } else if(task.url){
          try{ window.open(task.url, '_blank', 'noopener'); }catch(e){}
        }
        b.disabled=true;
        await award(k, task.n);
        render();
      };
    });
  }

  function close(){ var h=document.getElementById('mctix'); if(h) h.classList.remove('show'); }

  async function open(slug){
    if(!uid()) return; // so p/ logado
    _slug = slug || _slug;
    var host=document.getElementById('mctix');
    if(!host){ host=document.createElement('div'); host.id='mctix'; document.body.appendChild(host); }
    await load();
    // Perfil completo ja vale bilhete: credita sozinho
    var p=prof();
    if(p && p.onboarding_completed_at && !_mine.complete_profile){ await award('complete_profile',1); }
    render();
    host.classList.add('show');
    try{ track('giveaway_tasks_shown', { slug:_slug, tickets: total() }); }catch(e){}
  }

  var st=document.createElement('style'); st.id='tix-css'; st.textContent=CSS; document.head.appendChild(st);
  window.mcTickets = { open: open, close: close };
})();
