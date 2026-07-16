/* Onboarding progressivo , modulo unico, 8 idiomas, auto-contido.
   Aparece SO depois do email verificado, e SO se o usuario nunca completou/pulou.
   Tudo e opcional: todo passo tem Skip, e o Skip tem modal "voce completa depois no perfil".
   Grava em profiles (RLS: o proprio usuario so mexe na propria linha).
   Passos: 1) Pais (pre-preenchido por IP)  2) Perfil  3) Firmas favoritas  4) Como conheceu */
(function(){
  if (window.__mcOnbLoaded) return; window.__mcOnbLoaded = true;

  // Lista ISO completa (o select do passo 1). Pre-selecionado pelo IP.
  window.MC_COUNTRIES = window.MC_COUNTRIES || [["AF", "Afghanistan"], ["AL", "Albania"], ["DZ", "Algeria"], ["AD", "Andorra"], ["AO", "Angola"], ["AG", "Antigua and Barbuda"], ["AR", "Argentina"], ["AM", "Armenia"], ["AU", "Australia"], ["AT", "Austria"], ["AZ", "Azerbaijan"], ["BS", "Bahamas"], ["BH", "Bahrain"], ["BD", "Bangladesh"], ["BB", "Barbados"], ["BY", "Belarus"], ["BE", "Belgium"], ["BZ", "Belize"], ["BJ", "Benin"], ["BT", "Bhutan"], ["BO", "Bolivia"], ["BA", "Bosnia and Herzegovina"], ["BW", "Botswana"], ["BR", "Brazil"], ["BN", "Brunei"], ["BG", "Bulgaria"], ["BF", "Burkina Faso"], ["BI", "Burundi"], ["CV", "Cabo Verde"], ["KH", "Cambodia"], ["CM", "Cameroon"], ["CA", "Canada"], ["CF", "Central African Republic"], ["TD", "Chad"], ["CL", "Chile"], ["CN", "China"], ["CO", "Colombia"], ["KM", "Comoros"], ["CG", "Congo"], ["CD", "Congo (DRC)"], ["CR", "Costa Rica"], ["CI", "Cote d'Ivoire"], ["HR", "Croatia"], ["CU", "Cuba"], ["CY", "Cyprus"], ["CZ", "Czechia"], ["DK", "Denmark"], ["DJ", "Djibouti"], ["DM", "Dominica"], ["DO", "Dominican Republic"], ["EC", "Ecuador"], ["EG", "Egypt"], ["SV", "El Salvador"], ["GQ", "Equatorial Guinea"], ["ER", "Eritrea"], ["EE", "Estonia"], ["SZ", "Eswatini"], ["ET", "Ethiopia"], ["FJ", "Fiji"], ["FI", "Finland"], ["FR", "France"], ["GA", "Gabon"], ["GM", "Gambia"], ["GE", "Georgia"], ["DE", "Germany"], ["GH", "Ghana"], ["GR", "Greece"], ["GD", "Grenada"], ["GT", "Guatemala"], ["GN", "Guinea"], ["GW", "Guinea-Bissau"], ["GY", "Guyana"], ["HT", "Haiti"], ["HN", "Honduras"], ["HK", "Hong Kong"], ["HU", "Hungary"], ["IS", "Iceland"], ["IN", "India"], ["ID", "Indonesia"], ["IR", "Iran"], ["IQ", "Iraq"], ["IE", "Ireland"], ["IL", "Israel"], ["IT", "Italy"], ["JM", "Jamaica"], ["JP", "Japan"], ["JO", "Jordan"], ["KZ", "Kazakhstan"], ["KE", "Kenya"], ["KI", "Kiribati"], ["KW", "Kuwait"], ["KG", "Kyrgyzstan"], ["LA", "Laos"], ["LV", "Latvia"], ["LB", "Lebanon"], ["LS", "Lesotho"], ["LR", "Liberia"], ["LY", "Libya"], ["LI", "Liechtenstein"], ["LT", "Lithuania"], ["LU", "Luxembourg"], ["MO", "Macao"], ["MG", "Madagascar"], ["MW", "Malawi"], ["MY", "Malaysia"], ["MV", "Maldives"], ["ML", "Mali"], ["MT", "Malta"], ["MH", "Marshall Islands"], ["MR", "Mauritania"], ["MU", "Mauritius"], ["MX", "Mexico"], ["FM", "Micronesia"], ["MD", "Moldova"], ["MC", "Monaco"], ["MN", "Mongolia"], ["ME", "Montenegro"], ["MA", "Morocco"], ["MZ", "Mozambique"], ["MM", "Myanmar"], ["NA", "Namibia"], ["NR", "Nauru"], ["NP", "Nepal"], ["NL", "Netherlands"], ["NZ", "New Zealand"], ["NI", "Nicaragua"], ["NE", "Niger"], ["NG", "Nigeria"], ["KP", "North Korea"], ["MK", "North Macedonia"], ["NO", "Norway"], ["OM", "Oman"], ["PK", "Pakistan"], ["PW", "Palau"], ["PS", "Palestine"], ["PA", "Panama"], ["PG", "Papua New Guinea"], ["PY", "Paraguay"], ["PE", "Peru"], ["PH", "Philippines"], ["PL", "Poland"], ["PT", "Portugal"], ["QA", "Qatar"], ["RO", "Romania"], ["RU", "Russia"], ["RW", "Rwanda"], ["KN", "Saint Kitts and Nevis"], ["LC", "Saint Lucia"], ["VC", "Saint Vincent and the Grenadines"], ["WS", "Samoa"], ["SM", "San Marino"], ["ST", "Sao Tome and Principe"], ["SA", "Saudi Arabia"], ["SN", "Senegal"], ["RS", "Serbia"], ["SC", "Seychelles"], ["SL", "Sierra Leone"], ["SG", "Singapore"], ["SK", "Slovakia"], ["SI", "Slovenia"], ["SB", "Solomon Islands"], ["SO", "Somalia"], ["ZA", "South Africa"], ["KR", "South Korea"], ["SS", "South Sudan"], ["ES", "Spain"], ["LK", "Sri Lanka"], ["SD", "Sudan"], ["SR", "Suriname"], ["SE", "Sweden"], ["CH", "Switzerland"], ["SY", "Syria"], ["TW", "Taiwan"], ["TJ", "Tajikistan"], ["TZ", "Tanzania"], ["TH", "Thailand"], ["TL", "Timor-Leste"], ["TG", "Togo"], ["TO", "Tonga"], ["TT", "Trinidad and Tobago"], ["TN", "Tunisia"], ["TR", "Turkiye"], ["TM", "Turkmenistan"], ["TV", "Tuvalu"], ["UG", "Uganda"], ["UA", "Ukraine"], ["AE", "United Arab Emirates"], ["GB", "United Kingdom"], ["US", "United States"], ["UY", "Uruguay"], ["UZ", "Uzbekistan"], ["VU", "Vanuatu"], ["VA", "Vatican City"], ["VE", "Venezuela"], ["VN", "Vietnam"], ["YE", "Yemen"], ["ZM", "Zambia"], ["ZW", "Zimbabwe"]];

  var S = {
    en:{skip:'Skip',skipAll:'Skip onboarding',next:'Next',back:'Back',finish:'Finish',
        s1t:'Your country',s1d:'We use it to show only the firms that accept traders from your country.',
        s2t:'Tell us about you',s2d:'Three taps. It helps us send you only what matters.',
        q1:'How long have you been trading?',q2:'What do you trade?',q2h:'Pick one or more',q3:'Have you taken a prop firm challenge before?',
        s3t:'Your favorite firms',s3d:'Pick up to 5. We will prioritize their deals for you.',
        s4t:'How did you hear about us?',s4d:'Last one, promise.',
        exp:['0-3 months','4-12 months','1-2 years','3-5 years','5+ years'],
        ins:['Forex','Futures','Crypto','Stocks','Metals'],
        chg:['Never','1-3','4-9','10+'],
        src:['Friends / Family','Google','Instagram','YouTube','Telegram','X (Twitter)','Facebook','Ad','Other'],
        modalT:'Skip onboarding',modalB:'Are you sure? You can always complete it later in your profile.',cancel:'Cancel',confirm:'Confirm',
        done:'All set!',doneB:'Thanks. Your deals are now tailored to you.'},
    pt:{skip:'Pular',skipAll:'Pular configuração',next:'Continuar',back:'Voltar',finish:'Concluir',
        s1t:'Seu país',s1d:'Usamos pra mostrar só as firmas que aceitam traders do seu país.',
        s2t:'Conte sobre você',s2d:'Três toques. Ajuda a te mandar só o que interessa.',
        q1:'Há quanto tempo você opera?',q2:'O que você opera?',q2h:'Escolha um ou mais',q3:'Já fez algum challenge de prop firm?',
        s3t:'Suas firmas favoritas',s3d:'Escolha até 5. Vamos priorizar as ofertas delas pra você.',
        s4t:'Como você nos conheceu?',s4d:'Última, prometo.',
        exp:['0-3 meses','4-12 meses','1-2 anos','3-5 anos','5+ anos'],
        ins:['Forex','Futuros','Cripto','Ações','Metais'],
        chg:['Nunca','1-3','4-9','10+'],
        src:['Amigos / Família','Google','Instagram','YouTube','Telegram','X (Twitter)','Facebook','Anúncio','Outro'],
        modalT:'Pular configuração',modalB:'Tem certeza? Você pode completar depois no seu perfil.',cancel:'Cancelar',confirm:'Confirmar',
        done:'Pronto!',doneB:'Obrigado. Agora suas ofertas são sob medida.'},
    es:{skip:'Omitir',skipAll:'Omitir configuración',next:'Continuar',back:'Atrás',finish:'Finalizar',
        s1t:'Tu país',s1d:'Lo usamos para mostrar solo las firmas que aceptan traders de tu país.',
        s2t:'Cuéntanos sobre ti',s2d:'Tres toques. Nos ayuda a enviarte solo lo que importa.',
        q1:'¿Cuánto tiempo llevas operando?',q2:'¿Qué operas?',q2h:'Elige uno o más',q3:'¿Has hecho algún challenge de prop firm?',
        s3t:'Tus firmas favoritas',s3d:'Elige hasta 5. Priorizaremos sus ofertas para ti.',
        s4t:'¿Cómo nos conociste?',s4d:'La última, lo prometo.',
        exp:['0-3 meses','4-12 meses','1-2 años','3-5 años','5+ años'],
        ins:['Forex','Futuros','Cripto','Acciones','Metales'],
        chg:['Nunca','1-3','4-9','10+'],
        src:['Amigos / Familia','Google','Instagram','YouTube','Telegram','X (Twitter)','Facebook','Anuncio','Otro'],
        modalT:'Omitir configuración',modalB:'¿Seguro? Puedes completarlo después en tu perfil.',cancel:'Cancelar',confirm:'Confirmar',
        done:'¡Listo!',doneB:'Gracias. Tus ofertas ahora son a tu medida.'},
    it:{skip:'Salta',skipAll:'Salta la configurazione',next:'Avanti',back:'Indietro',finish:'Fine',
        s1t:'Il tuo paese',s1d:'Lo usiamo per mostrarti solo le firm che accettano trader dal tuo paese.',
        s2t:'Parlaci di te',s2d:'Tre tocchi. Ci aiuta a inviarti solo ciò che conta.',
        q1:'Da quanto tempo fai trading?',q2:'Cosa tradi?',q2h:'Scegline uno o più',q3:'Hai già fatto una challenge di prop firm?',
        s3t:'Le tue firm preferite',s3d:'Scegline fino a 5. Daremo priorità alle loro offerte.',
        s4t:'Come ci hai conosciuto?',s4d:"L'ultima, promesso.",
        exp:['0-3 mesi','4-12 mesi','1-2 anni','3-5 anni','5+ anni'],
        ins:['Forex','Futures','Cripto','Azioni','Metalli'],
        chg:['Mai','1-3','4-9','10+'],
        src:['Amici / Famiglia','Google','Instagram','YouTube','Telegram','X (Twitter)','Facebook','Annuncio','Altro'],
        modalT:'Salta la configurazione',modalB:'Sei sicuro? Puoi completarla dopo nel tuo profilo.',cancel:'Annulla',confirm:'Conferma',
        done:'Fatto!',doneB:'Grazie. Ora le offerte sono su misura per te.'},
    fr:{skip:'Passer',skipAll:'Passer la configuration',next:'Continuer',back:'Retour',finish:'Terminer',
        s1t:'Votre pays',s1d:'On l\'utilise pour n\'afficher que les firms qui acceptent les traders de votre pays.',
        s2t:'Parlez-nous de vous',s2d:'Trois clics. Ça nous aide à ne vous envoyer que l\'essentiel.',
        q1:'Depuis combien de temps tradez-vous ?',q2:'Que tradez-vous ?',q2h:'Choisissez-en un ou plusieurs',q3:'Avez-vous déjà fait un challenge de prop firm ?',
        s3t:'Vos firms préférées',s3d:'Choisissez-en jusqu\'à 5. On priorisera leurs offres.',
        s4t:'Comment nous avez-vous connus ?',s4d:'La dernière, promis.',
        exp:['0-3 mois','4-12 mois','1-2 ans','3-5 ans','5+ ans'],
        ins:['Forex','Futures','Crypto','Actions','Métaux'],
        chg:['Jamais','1-3','4-9','10+'],
        src:['Amis / Famille','Google','Instagram','YouTube','Telegram','X (Twitter)','Facebook','Publicité','Autre'],
        modalT:'Passer la configuration',modalB:'Vous êtes sûr ? Vous pourrez la compléter plus tard dans votre profil.',cancel:'Annuler',confirm:'Confirmer',
        done:'C\'est fait !',doneB:'Merci. Vos offres sont maintenant personnalisées.'},
    de:{skip:'Überspringen',skipAll:'Einrichtung überspringen',next:'Weiter',back:'Zurück',finish:'Fertig',
        s1t:'Dein Land',s1d:'Damit zeigen wir dir nur Firmen, die Trader aus deinem Land akzeptieren.',
        s2t:'Erzähl uns von dir',s2d:'Drei Klicks. So senden wir dir nur das Relevante.',
        q1:'Wie lange tradest du schon?',q2:'Was tradest du?',q2h:'Wähle eins oder mehrere',q3:'Hast du schon eine Prop-Firm-Challenge gemacht?',
        s3t:'Deine Lieblingsfirmen',s3d:'Wähle bis zu 5. Wir priorisieren deren Angebote.',
        s4t:'Wie hast du von uns erfahren?',s4d:'Die letzte, versprochen.',
        exp:['0-3 Monate','4-12 Monate','1-2 Jahre','3-5 Jahre','5+ Jahre'],
        ins:['Forex','Futures','Krypto','Aktien','Metalle'],
        chg:['Nie','1-3','4-9','10+'],
        src:['Freunde / Familie','Google','Instagram','YouTube','Telegram','X (Twitter)','Facebook','Werbung','Andere'],
        modalT:'Einrichtung überspringen',modalB:'Sicher? Du kannst sie später im Profil abschließen.',cancel:'Abbrechen',confirm:'Bestätigen',
        done:'Fertig!',doneB:'Danke. Deine Angebote sind jetzt auf dich zugeschnitten.'},
    ar:{skip:'تخطي',skipAll:'تخطي الإعداد',next:'التالي',back:'رجوع',finish:'إنهاء',
        s1t:'بلدك',s1d:'نستخدمه لعرض الشركات التي تقبل المتداولين من بلدك فقط.',
        s2t:'أخبرنا عنك',s2d:'ثلاث نقرات. تساعدنا على إرسال ما يهمك فقط.',
        q1:'منذ متى وأنت تتداول؟',q2:'ماذا تتداول؟',q2h:'اختر واحدًا أو أكثر',q3:'هل خضت تحدي شركة تمويل من قبل؟',
        s3t:'شركاتك المفضلة',s3d:'اختر حتى 5. سنعطي الأولوية لعروضها.',
        s4t:'كيف عرفت عنا؟',s4d:'آخر سؤال، أعدك.',
        exp:['0-3 أشهر','4-12 شهرًا','1-2 سنة','3-5 سنوات','5+ سنوات'],
        ins:['فوركس','عقود آجلة','كريبتو','أسهم','معادن'],
        chg:['أبدًا','1-3','4-9','10+'],
        src:['أصدقاء / عائلة','جوجل','إنستغرام','يوتيوب','تيليجرام','X (تويتر)','فيسبوك','إعلان','أخرى'],
        modalT:'تخطي الإعداد',modalB:'هل أنت متأكد؟ يمكنك إكماله لاحقًا في ملفك الشخصي.',cancel:'إلغاء',confirm:'تأكيد',
        done:'تم!',doneB:'شكرًا. عروضك الآن مخصصة لك.'},
    id:{skip:'Lewati',skipAll:'Lewati pengaturan',next:'Lanjut',back:'Kembali',finish:'Selesai',
        s1t:'Negara kamu',s1d:'Kami pakai untuk menampilkan hanya firm yang menerima trader dari negaramu.',
        s2t:'Ceritakan tentang kamu',s2d:'Tiga ketuk. Membantu kami kirim yang penting saja.',
        q1:'Sudah berapa lama kamu trading?',q2:'Kamu trading apa?',q2h:'Pilih satu atau lebih',q3:'Pernah ikut challenge prop firm?',
        s3t:'Firm favoritmu',s3d:'Pilih hingga 5. Kami prioritaskan penawaran mereka.',
        s4t:'Dari mana kamu tahu kami?',s4d:'Yang terakhir, janji.',
        exp:['0-3 bulan','4-12 bulan','1-2 tahun','3-5 tahun','5+ tahun'],
        ins:['Forex','Futures','Kripto','Saham','Logam'],
        chg:['Belum pernah','1-3','4-9','10+'],
        src:['Teman / Keluarga','Google','Instagram','YouTube','Telegram','X (Twitter)','Facebook','Iklan','Lainnya'],
        modalT:'Lewati pengaturan',modalB:'Yakin? Kamu bisa melengkapinya nanti di profil.',cancel:'Batal',confirm:'Konfirmasi',
        done:'Selesai!',doneB:'Terima kasih. Penawaranmu kini sesuai dengan kamu.'}
  };

  function lang(){
    var l = window._currentLang || (document.documentElement.getAttribute('lang')||'').slice(0,2);
    l = (l||'en').toLowerCase();
    return S[l] ? l : 'en';
  }
  function esc(s){ return String(s==null?'':s).replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); }

  var CSS = '\
  #mconb{position:fixed;inset:0;background:rgba(5,7,11,.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99990;display:none;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto}\
  #mconb.show{display:flex}\
  .onb-card{position:relative;width:100%;max-width:520px;margin:auto;background:#0A0D14;border:1px solid rgba(240,180,41,.20);border-radius:20px;padding:26px 26px 22px;box-shadow:0 30px 90px rgba(0,0,0,.7)}\
  .onb-bar{display:flex;gap:6px;margin-bottom:22px}\
  .onb-seg{flex:1;height:3px;border-radius:99px;background:rgba(255,255,255,.10)}\
  .onb-seg.on{background:linear-gradient(90deg,#c8941a,#F0B429)}\
  .onb-h{font:800 25px/1.15 Inter,sans-serif;color:#fff;letter-spacing:-.02em;margin-bottom:8px}\
  .onb-d{font:500 13.5px/1.5 Inter,sans-serif;color:rgba(255,255,255,.6);margin-bottom:20px}\
  .onb-q{font:700 13px Inter,sans-serif;color:#EDF2F7;margin:18px 0 9px}\
  .onb-q small{font-weight:500;color:rgba(255,255,255,.42);margin-inline-start:6px}\
  .onb-chips{display:flex;flex-wrap:wrap;gap:8px}\
  .onb-chip{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);color:#C9D4E2;border-radius:99px;padding:9px 15px;font:600 13px Inter,sans-serif;cursor:pointer;transition:.15s;font-family:inherit}\
  .onb-chip:hover{border-color:rgba(240,180,41,.45);color:#fff}\
  .onb-chip.on{background:rgba(240,180,41,.14);border-color:#F0B429;color:#F0B429}\
  .onb-firm{display:flex;align-items:center;gap:8px}\
  .onb-firm img{width:20px;height:20px;border-radius:5px;background:#0a0d14;object-fit:contain}\
  .onb-sel{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:11px;padding:13px 14px;color:#fff;font:500 14px Inter,sans-serif;outline:none}\
  .onb-sel:focus{border-color:#F0B429}\
  .onb-nav{display:flex;align-items:center;gap:10px;margin-top:26px}\
  .onb-next{flex:1;background:linear-gradient(90deg,#c8941a,#F0B429,#f5d060,#F0B429,#c8941a);background-size:200% 100%;color:#0d141c;border:none;border-radius:12px;padding:13px;font:800 15px Inter,sans-serif;cursor:pointer;font-family:inherit}\
  .onb-next:disabled{opacity:.45;cursor:not-allowed}\
  .onb-back{background:none;border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.6);border-radius:12px;padding:13px 16px;font:600 14px Inter,sans-serif;cursor:pointer;font-family:inherit}\
  .onb-skip{display:block;margin:14px auto 0;background:none;border:none;color:rgba(255,255,255,.42);font:400 12.5px Inter,sans-serif;text-decoration:underline;cursor:pointer;font-family:inherit}\
  .onb-ok{text-align:center;padding:14px 0 6px}\
  .onb-ok-ic{width:54px;height:54px;border-radius:50%;background:rgba(61,227,168,.12);border:1px solid rgba(61,227,168,.4);display:flex;align-items:center;justify-content:center;color:#3DE3A8;margin:0 auto 14px}\
  #mconb-mod{position:fixed;inset:0;background:rgba(5,7,11,.7);z-index:99995;display:none;align-items:center;justify-content:center;padding:16px}\
  #mconb-mod.show{display:flex}\
  .onb-mod-c{background:#10151F;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:24px;max-width:380px;width:100%}\
  .onb-mod-t{font:800 17px Inter,sans-serif;color:#fff;margin-bottom:8px}\
  .onb-mod-b{font:500 13.5px/1.5 Inter,sans-serif;color:rgba(255,255,255,.62);margin-bottom:18px}\
  .onb-mod-row{display:flex;gap:9px}\
  .onb-mod-row button{flex:1;border-radius:10px;padding:11px;font:700 13.5px Inter,sans-serif;cursor:pointer;font-family:inherit}\
  .onb-cancel{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#C9D4E2}\
  .onb-confirm{background:#F0B429;border:none;color:#0d141c}\
  @media(max-width:480px){.onb-card{padding:22px 18px 18px}.onb-h{font-size:22px}}';

  // Estado das respostas
  var A = { country:'', trading_experience:'', instruments:[], challenges_taken:'', favorite_firms:[], how_heard:'' };
  var step = 1, TOTAL = 4;

  function chips(items, selected, multi, onPick){
    return items.map(function(it,i){
      var val = (typeof it === 'object') ? it.v : it;
      var lbl = (typeof it === 'object') ? it.l : it;
      var on  = multi ? (selected.indexOf(val)>=0) : (selected===val);
      return '<button class="onb-chip'+(on?' on':'')+'" data-v="'+esc(val)+'">'+lbl+'</button>';
    }).join('');
  }

  function countryOptions(sel){
    var list = (window.MC_COUNTRIES || []);
    if(!list.length) return '';
    return '<option value="">—</option>' + list.map(function(c){
      return '<option value="'+esc(c[0])+'"'+(c[0]===sel?' selected':'')+'>'+esc(c[1])+'</option>';
    }).join('');
  }

  function render(){
    var t = S[lang()], rtl = lang()==='ar';
    var body = '';
    if(step===1){
      body = '<div class="onb-h">'+esc(t.s1t)+'</div><div class="onb-d">'+esc(t.s1d)+'</div>'+
             '<select class="onb-sel" id="onb-country">'+countryOptions(A.country)+'</select>';
    } else if(step===2){
      body = '<div class="onb-h">'+esc(t.s2t)+'</div><div class="onb-d">'+esc(t.s2d)+'</div>'+
             '<div class="onb-q">'+esc(t.q1)+'</div><div class="onb-chips" data-k="trading_experience">'+chips(t.exp, A.trading_experience, false)+'</div>'+
             '<div class="onb-q">'+esc(t.q2)+'<small>'+esc(t.q2h)+'</small></div><div class="onb-chips" data-k="instruments" data-multi="1">'+chips(t.ins, A.instruments, true)+'</div>'+
             '<div class="onb-q">'+esc(t.q3)+'</div><div class="onb-chips" data-k="challenges_taken">'+chips(t.chg, A.challenges_taken, false)+'</div>';
    } else if(step===3){
      var firms = ((A_() && A_().getFirms()) || []).filter(function(f){return f && f.id && f.name;}).slice(0,20).map(function(f){
        return { v:f.id, l:'<span class="onb-firm">'+(f.icon_url?'<img src="'+esc(f.icon_url)+'" alt="" loading="lazy">':'')+esc(f.short_name||f.name)+'</span>' };
      });
      body = '<div class="onb-h">'+esc(t.s3t)+'</div><div class="onb-d">'+esc(t.s3d)+'</div>'+
             '<div class="onb-chips" data-k="favorite_firms" data-multi="1" data-max="5">'+chips(firms, A.favorite_firms, true)+'</div>';
    } else if(step===4){
      body = '<div class="onb-h">'+esc(t.s4t)+'</div><div class="onb-d">'+esc(t.s4d)+'</div>'+
             '<div class="onb-chips" data-k="how_heard">'+chips(t.src, A.how_heard, false)+'</div>';
    }
    var segs = ''; for(var i=1;i<=TOTAL;i++) segs += '<div class="onb-seg'+(i<=step?' on':'')+'"></div>';
    var host = document.getElementById('mconb');
    host.innerHTML = '<div class="onb-card"'+(rtl?' dir="rtl"':'')+'>'+
      '<div class="onb-bar">'+segs+'</div>'+ body +
      '<div class="onb-nav">'+
        (step>1?'<button class="onb-back" id="onb-back">'+esc(t.back)+'</button>':'')+
        '<button class="onb-next" id="onb-next">'+esc(step===TOTAL?t.finish:t.next)+'</button>'+
      '</div>'+
      '<button class="onb-skip" id="onb-skip">'+esc(t.skipAll)+'</button>'+
    '</div>';
    wire();
  }

  function wire(){
    var host = document.getElementById('mconb');
    host.querySelectorAll('.onb-chips').forEach(function(grp){
      var k = grp.getAttribute('data-k');
      var multi = grp.getAttribute('data-multi')==='1';
      var max = parseInt(grp.getAttribute('data-max')||'0',10);
      grp.querySelectorAll('.onb-chip').forEach(function(btn){
        btn.onclick = function(){
          var v = btn.getAttribute('data-v');
          if(multi){
            var arr = A[k] || [];
            var i = arr.indexOf(v);
            if(i>=0) arr.splice(i,1);
            else { if(max && arr.length>=max) return; arr.push(v); }
            A[k] = arr;
            btn.classList.toggle('on', arr.indexOf(v)>=0);
          } else {
            A[k] = (A[k]===v) ? '' : v;
            grp.querySelectorAll('.onb-chip').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-v')===A[k]); });
          }
        };
      });
    });
    var sel = document.getElementById('onb-country');
    if(sel) sel.onchange = function(){ A.country = sel.value; };
    var nx = document.getElementById('onb-next');
    if(nx) nx.onclick = function(){ if(step<TOTAL){ step++; render(); } else finish(); };
    var bk = document.getElementById('onb-back');
    if(bk) bk.onclick = function(){ if(step>1){ step--; render(); } };
    var sk = document.getElementById('onb-skip');
    if(sk) sk.onclick = askSkip;
  }

  function askSkip(){
    var t = S[lang()];
    var m = document.getElementById('mconb-mod');
    m.innerHTML = '<div class="onb-mod-c"><div class="onb-mod-t">'+esc(t.modalT)+'</div>'+
      '<div class="onb-mod-b">'+esc(t.modalB)+'</div>'+
      '<div class="onb-mod-row"><button class="onb-cancel" id="onb-mc">'+esc(t.cancel)+'</button>'+
      '<button class="onb-confirm" id="onb-mo">'+esc(t.confirm)+'</button></div></div>';
    m.classList.add('show');
    document.getElementById('onb-mc').onclick = function(){ m.classList.remove('show'); };
    document.getElementById('onb-mo').onclick = function(){ m.classList.remove('show'); doSkip(); };
  }

  function A_(){ return window.MC_AUTH || null; }
  function uid(){ try{ var u = A_() && A_().getUser(); return (u && u.id) || null; }catch(e){ return null; } }
  function prof(){ try{ return (A_() && A_().getProfile()) || null; }catch(e){ return null; } }

  async function save(patch){
    var id = uid(); var _db = A_() && A_().getDb();
    if(!id || !_db) return false;
    try{
      var r = await _db.from('profiles').update(patch).eq('id', id);
      return !r.error;
    }catch(e){ return false; }
  }

  async function doSkip(){
    await save({ onboarding_skipped_at: new Date().toISOString() });
    try{ track('onboarding_skipped', { step: step }); }catch(e){}
    close();
  }

  async function finish(){
    var patch = { onboarding_completed_at: new Date().toISOString() };
    if(A.country) { patch.country = A.country; }
    if(A.trading_experience) patch.trading_experience = A.trading_experience;
    if(A.instruments && A.instruments.length) patch.instruments = A.instruments;
    if(A.challenges_taken) patch.challenges_taken = A.challenges_taken;
    if(A.how_heard) patch.how_heard = A.how_heard;
    if(A.favorite_firms && A.favorite_firms.length) patch.favorite_firms = A.favorite_firms;
    await save(patch);
    try{ track('onboarding_completed', { how_heard: A.how_heard||'', instruments:(A.instruments||[]).join(','), exp: A.trading_experience||'' }); }catch(e){}
    var t = S[lang()];
    document.getElementById('mconb').innerHTML = '<div class="onb-card"><div class="onb-ok">'+
      '<div class="onb-ok-ic"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>'+
      '<div class="onb-h" style="margin-bottom:6px">'+esc(t.done)+'</div>'+
      '<div class="onb-d" style="margin-bottom:0">'+esc(t.doneB)+'</div></div></div>';
    setTimeout(close, 1800);
  }

  function close(){
    var h=document.getElementById('mconb'); if(h) h.classList.remove('show');
    document.body.style.overflow='';
  }

  function open(){
    var host = document.getElementById('mconb');
    if(!host){ host=document.createElement('div'); host.id='mconb'; document.body.appendChild(host); }
    var m = document.getElementById('mconb-mod');
    if(!m){ m=document.createElement('div'); m.id='mconb-mod'; document.body.appendChild(m); }
    step = 1;
    A.country = (prof() && prof().country) ||
                ((window._geo && window._geo.geo_country) ? String(window._geo.geo_country).toUpperCase() : '');
    render();
    host.classList.add('show');
    try{ track('onboarding_shown', {}); }catch(e){}
  }

  // Mostra so: logado + email verificado + nunca completou nem pulou
  async function maybeShow(){
    try{
      var p = prof();
      if(!p || !uid()) return;
      if(!(p.email_verified === true)) return;
      if(p.onboarding_completed_at || p.onboarding_skipped_at) return;
      if(document.getElementById('mcgw-bd') && document.getElementById('mcgw-bd').classList.contains('show')) return; // nao empilha com o sorteio
      setTimeout(open, 900);
    }catch(e){}
  }

  var st=document.createElement('style'); st.id='onb-css'; st.textContent=CSS; document.head.appendChild(st);
  window.mcOnboarding = { open: open, close: close, maybeShow: maybeShow };
})();
