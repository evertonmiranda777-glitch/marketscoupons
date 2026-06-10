/* ─────────────────────────────────────────────
   MarketsCoupons Reviews, sistema de avaliações
   Inspirado em PropFirmMatch. Só usuários com email_confirmed_at podem postar.
   Admin (Everton) soft-delete via admin.html.

   Usage:
     await MCReviews.mount(firmId, containerEl)  // renderiza UI completa
     MCReviews.fetchStats(firmId)                 // só estatísticas
   ───────────────────────────────────────────── */

(function(global){
  // i18n, 8 idiomas
  const I18N = {
    pt:{review:'avaliação',reviews:'avaliações',share:'Compartilhe sua experiência',signup_login:'Cadastre-se ou faça login pra avaliar',enter_signup:'Entrar / Cadastrar',loading:'Carregando avaliações...',reviews_title:'Avaliações',be_first:'Seja o primeiro a avaliar',edit_review:'Editar sua avaliação',rate_firm:'Avalie',your_rating:'Sua nota geral',title_opt:'Título (opcional)',short_summary:'Resumo curto',your_exp:'Sua experiência (min 30 chars)',exp_ph:'Conte como foi com essa firma, payouts, regras, suporte...',account_size:'Tamanho da conta',program:'Programa',program_ph:'1-Step, EOD, Sprint...',reached_payout:'Já recebeu payout?',yes:'Sim',not_yet:'Ainda não',publish:'Publicar avaliação',update:'Atualizar',sending:'Enviando...',min_chars:'✗ Mínimo 30 caracteres',published:'✓ Avaliação publicada!',login_req:'Login necessário',publish_err:'Erro ao publicar',helpful:'Útil',by:'por',got_payout:'Recebeu payout',no_payout_yet:'Sem payout ainda',payouts:'payouts'},
    en:{review:'review',reviews:'reviews',share:'Share your experience',signup_login:'Sign up or log in to review',enter_signup:'Log in / Sign up',loading:'Loading reviews...',reviews_title:'Reviews',be_first:'Be the first to review',edit_review:'Edit your review',rate_firm:'Rate',your_rating:'Your overall rating',title_opt:'Title (optional)',short_summary:'Short summary',your_exp:'Your experience (min 30 chars)',exp_ph:'Tell us how it went with this firm, payouts, rules, support...',account_size:'Account size',program:'Program',program_ph:'1-Step, EOD, Sprint...',reached_payout:'Reached payout?',yes:'Yes',not_yet:'Not yet',got_payout:'Reached payout',no_payout_yet:'No payout yet',payouts:'payouts',publish:'Publish review',update:'Update',sending:'Sending...',min_chars:'✗ Minimum 30 characters',published:'✓ Review published!',login_req:'Login required',publish_err:'Failed to publish',helpful:'Helpful',by:'by'},
    es:{review:'reseña',reviews:'reseñas',share:'Comparte tu experiencia',signup_login:'Regístrate o inicia sesión para reseñar',enter_signup:'Entrar / Registrarse',loading:'Cargando reseñas...',reviews_title:'Reseñas',be_first:'Sé el primero en reseñar',edit_review:'Editar tu reseña',rate_firm:'Califica',your_rating:'Tu calificación general',title_opt:'Título (opcional)',short_summary:'Resumen corto',your_exp:'Tu experiencia (mín 30 chars)',exp_ph:'Cuéntanos cómo te fue con esta firma, pagos, reglas, soporte...',account_size:'Tamaño de cuenta',program:'Programa',program_ph:'1-Step, EOD, Sprint...',reached_payout:'¿Recibiste payout?',yes:'Sí',not_yet:'Aún no',got_payout:'Recibió payout',no_payout_yet:'Sin payout aún',payouts:'payouts',publish:'Publicar reseña',update:'Actualizar',sending:'Enviando...',min_chars:'✗ Mínimo 30 caracteres',published:'✓ ¡Reseña publicada!',login_req:'Inicio de sesión requerido',publish_err:'Error al publicar',helpful:'Útil',by:'por'},
    it:{review:'recensione',reviews:'recensioni',share:'Condividi la tua esperienza',signup_login:'Registrati o accedi per recensire',enter_signup:'Accedi / Registrati',loading:'Caricamento recensioni...',reviews_title:'Recensioni',be_first:'Sii il primo a recensire',edit_review:'Modifica la tua recensione',rate_firm:'Valuta',your_rating:'La tua valutazione generale',title_opt:'Titolo (opzionale)',short_summary:'Riepilogo breve',your_exp:'La tua esperienza (min 30 caratteri)',exp_ph:'Raccontaci com\'è andata con questa firma, payout, regole, supporto...',account_size:'Dimensione account',program:'Programma',program_ph:'1-Step, EOD, Sprint...',reached_payout:'Hai ricevuto un payout?',yes:'Sì',not_yet:'Non ancora',got_payout:'Payout ricevuto',no_payout_yet:'Nessun payout',payouts:'payouts',publish:'Pubblica recensione',update:'Aggiorna',sending:'Invio...',min_chars:'✗ Minimo 30 caratteri',published:'✓ Recensione pubblicata!',login_req:'Accesso richiesto',publish_err:'Errore di pubblicazione',helpful:'Utile',by:'di'},
    fr:{review:'avis',reviews:'avis',share:'Partagez votre expérience',signup_login:'Inscrivez-vous ou connectez-vous pour évaluer',enter_signup:'Se connecter / S\'inscrire',loading:'Chargement des avis...',reviews_title:'Avis',be_first:'Soyez le premier à évaluer',edit_review:'Modifier votre avis',rate_firm:'Évaluer',your_rating:'Votre note globale',title_opt:'Titre (optionnel)',short_summary:'Résumé court',your_exp:'Votre expérience (min 30 car.)',exp_ph:'Racontez comment ça s\'est passé avec cette firme, paiements, règles, support...',account_size:'Taille du compte',program:'Programme',program_ph:'1-Step, EOD, Sprint...',reached_payout:'Avez-vous reçu un payout ?',yes:'Oui',not_yet:'Pas encore',got_payout:'Payout reçu',no_payout_yet:'Pas de payout',payouts:'payouts',publish:'Publier l\'avis',update:'Mettre à jour',sending:'Envoi...',min_chars:'✗ Minimum 30 caractères',published:'✓ Avis publié !',login_req:'Connexion requise',publish_err:'Erreur de publication',helpful:'Utile',by:'par'},
    de:{review:'Bewertung',reviews:'Bewertungen',share:'Teile deine Erfahrung',signup_login:'Registriere dich oder logge dich ein, um zu bewerten',enter_signup:'Anmelden / Registrieren',loading:'Bewertungen werden geladen...',reviews_title:'Bewertungen',be_first:'Sei der Erste, der bewertet',edit_review:'Bewertung bearbeiten',rate_firm:'Bewerten',your_rating:'Deine Gesamtbewertung',title_opt:'Titel (optional)',short_summary:'Kurze Zusammenfassung',your_exp:'Deine Erfahrung (min. 30 Zeichen)',exp_ph:'Erzähle uns, wie es mit dieser Firma war, Auszahlungen, Regeln, Support...',account_size:'Kontogröße',program:'Programm',program_ph:'1-Step, EOD, Sprint...',reached_payout:'Auszahlung erhalten?',yes:'Ja',not_yet:'Noch nicht',got_payout:'Auszahlung erhalten',no_payout_yet:'Keine Auszahlung',payouts:'Auszahlungen',publish:'Bewertung veröffentlichen',update:'Aktualisieren',sending:'Senden...',min_chars:'✗ Mindestens 30 Zeichen',published:'✓ Bewertung veröffentlicht!',login_req:'Anmeldung erforderlich',publish_err:'Veröffentlichung fehlgeschlagen',helpful:'Hilfreich',by:'von'},
    ar:{review:'تقييم',reviews:'تقييمات',share:'شارك تجربتك',signup_login:'سجّل أو ادخل لتقييم',enter_signup:'تسجيل / دخول',loading:'تحميل التقييمات...',reviews_title:'التقييمات',be_first:'كن أول من يقيم',edit_review:'تعديل تقييمك',rate_firm:'قيّم',your_rating:'تقييمك العام',title_opt:'العنوان (اختياري)',short_summary:'ملخص قصير',your_exp:'تجربتك (٣٠ حرفًا على الأقل)',exp_ph:'أخبرنا كيف كانت تجربتك مع هذه الشركة, المدفوعات، القواعد، الدعم...',account_size:'حجم الحساب',program:'البرنامج',program_ph:'1-Step, EOD, Sprint...',reached_payout:'هل حصلت على دفعة؟',yes:'نعم',not_yet:'ليس بعد',got_payout:'حصل على دفعة',no_payout_yet:'بدون دفعة',payouts:'دفعات',publish:'نشر التقييم',update:'تحديث',sending:'إرسال...',min_chars:'✗ الحد الأدنى ٣٠ حرفًا',published:'✓ تم نشر التقييم!',login_req:'تسجيل الدخول مطلوب',publish_err:'فشل النشر',helpful:'مفيد',by:'بواسطة'},
    id:{review:'ulasan',reviews:'ulasan',share:'Bagikan pengalaman Anda',signup_login:'Daftar atau masuk untuk mengulas',enter_signup:'Masuk / Daftar',loading:'Memuat ulasan...',reviews_title:'Ulasan',be_first:'Jadilah yang pertama mengulas',edit_review:'Edit ulasan Anda',rate_firm:'Nilai',your_rating:'Penilaian keseluruhan Anda',title_opt:'Judul (opsional)',short_summary:'Ringkasan singkat',your_exp:'Pengalaman Anda (min 30 karakter)',exp_ph:'Ceritakan pengalaman Anda dengan firma ini, payout, aturan, dukungan...',account_size:'Ukuran akun',program:'Program',program_ph:'1-Step, EOD, Sprint...',reached_payout:'Sudah dapat payout?',yes:'Ya',not_yet:'Belum',got_payout:'Dapat payout',no_payout_yet:'Belum payout',payouts:'payout',publish:'Publikasikan ulasan',update:'Perbarui',sending:'Mengirim...',min_chars:'✗ Minimal 30 karakter',published:'✓ Ulasan dipublikasikan!',login_req:'Login diperlukan',publish_err:'Gagal mempublikasikan',helpful:'Bermanfaat',by:'oleh'}
  };
  function detectLang(){
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q && I18N[q]) return q;
      const stored = localStorage.getItem('mc_lang');
      if (stored && I18N[stored]) return stored;
      const html = (document.documentElement.lang||'').slice(0,2);
      if (html && I18N[html]) return html;
    } catch(e){}
    const nav = (navigator.language||'en').toLowerCase().split('-')[0];
    return I18N[nav] ? nav : 'en';
  }
  function T(k){ const lang = detectLang(); return (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; }

  const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

  function getAuthToken() {
    try {
      const raw = localStorage.getItem('mc-user-auth');
      if (!raw) return null;
      const j = JSON.parse(raw);
      return j.access_token || j.currentSession?.access_token || null;
    } catch(e){ return null; }
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem('mc-user-auth');
      if (!raw) return null;
      const j = JSON.parse(raw);
      return j.user || j.currentSession?.user || null;
    } catch(e){ return null; }
  }

  function esc(s){ return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  function timeAgo(date){
    const d = new Date(date);
    const sec = Math.max(1, Math.floor((Date.now() - d.getTime())/1000));
    if (sec < 60) return 'agora';
    if (sec < 3600) return Math.floor(sec/60)+'min atrás';
    if (sec < 86400) return Math.floor(sec/3600)+'h atrás';
    if (sec < 2592000) return Math.floor(sec/86400)+'d atrás';
    return d.toLocaleDateString('pt-BR');
  }

  function starsHtml(rating, size){
    size = size || 14;
    const full = Math.floor(rating);
    const half = (rating - full) >= 0.5;
    let h = '';
    for (let i = 1; i <= 5; i++){
      const fill = i <= full ? '#F0B429' : (i === full+1 && half ? 'url(#half)' : 'rgba(255,255,255,.15)');
      h += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:inline-block;vertical-align:middle"><defs><linearGradient id="half"><stop offset="50%" stop-color="#F0B429"/><stop offset="50%" stop-color="rgba(255,255,255,.15)"/></linearGradient></defs><path fill="${fill}" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>`;
    }
    return h;
  }

  async function fetchStats(firmId){
    const r = await fetch(`${SB_URL}/rest/v1/rpc/get_firm_review_stats`, {
      method: 'POST',
      headers: { apikey: SB_ANON, Authorization: 'Bearer '+SB_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_firm_id: firmId })
    });
    const data = await r.json();
    return data?.[0] || { total_reviews: 0, avg_rating: 0, count_5: 0, count_4: 0, count_3: 0, count_2: 0, count_1: 0 };
  }

  async function fetchReviews(firmId, limit=20, offset=0){
    const r = await fetch(`${SB_URL}/rest/v1/firm_reviews?firm_id=eq.${firmId}&deleted_at=is.null&select=*&order=created_at.desc&limit=${limit}&offset=${offset}`, {
      headers: { apikey: SB_ANON, Authorization: 'Bearer '+SB_ANON }
    });
    return await r.json();
  }

  async function fetchUserReview(firmId){
    const u = getCurrentUser();
    if (!u) return null;
    const tk = getAuthToken();
    const r = await fetch(`${SB_URL}/rest/v1/firm_reviews?firm_id=eq.${firmId}&user_id=eq.${u.id}&deleted_at=is.null&select=*&limit=1`, {
      headers: { apikey: SB_ANON, Authorization: 'Bearer '+(tk||SB_ANON) }
    });
    const data = await r.json();
    return data?.[0] || null;
  }

  async function postReview(payload){
    const tk = getAuthToken();
    if (!tk) throw new Error('login_required');
    const u = getCurrentUser();
    payload.user_id = u.id;
    const r = await fetch(`${SB_URL}/rest/v1/firm_reviews`, {
      method: 'POST',
      headers: { apikey: SB_ANON, Authorization: 'Bearer '+tk, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.message || 'post_failed');
    }
    return (await r.json())[0];
  }

  async function toggleUpvote(reviewId, currentlyUpvoted){
    const tk = getAuthToken();
    if (!tk) throw new Error('login_required');
    const u = getCurrentUser();
    if (currentlyUpvoted) {
      const r = await fetch(`${SB_URL}/rest/v1/firm_review_upvotes?review_id=eq.${reviewId}&user_id=eq.${u.id}`, {
        method: 'DELETE',
        headers: { apikey: SB_ANON, Authorization: 'Bearer '+tk }
      });
      return r.ok;
    } else {
      const r = await fetch(`${SB_URL}/rest/v1/firm_review_upvotes`, {
        method: 'POST',
        headers: { apikey: SB_ANON, Authorization: 'Bearer '+tk, 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId, user_id: u.id })
      });
      return r.ok;
    }
  }

  function renderReviewCard(rev){
    const rating = parseFloat(rev.rating) || 0;
    const userName = rev.user_name || 'Trader';
    return `
    <div class="mcr-review" data-rid="${rev.id}">
      <div class="mcr-review-head">
        <div class="mcr-avatar">${esc(userName.slice(0,1).toUpperCase())}</div>
        <div class="mcr-rev-meta">
          <div class="mcr-rev-name">${esc(userName)}</div>
          <div class="mcr-rev-time">${esc(timeAgo(rev.created_at))}</div>
        </div>
        <div class="mcr-rev-rating">${starsHtml(rating, 16)} <b style="margin-left:6px">${rating.toFixed(1)}</b></div>
      </div>
      ${rev.title ? `<div class="mcr-rev-title">${esc(rev.title)}</div>` : ''}
      <div class="mcr-rev-body">${esc(rev.body)}</div>
      <div class="mcr-rev-context">
        ${rev.account_size ? `<span class="mcr-tag">📊 ${esc(rev.account_size)}</span>` : ''}
        ${rev.program ? `<span class="mcr-tag">🎯 ${esc(rev.program)}</span>` : ''}
        ${rev.reached_payout === true ? `<span class="mcr-tag mcr-tag-good">✓ ${T('got_payout')}</span>` : ''}
        ${rev.reached_payout === false ? `<span class="mcr-tag mcr-tag-neutral">${T('no_payout_yet')}</span>` : ''}
        ${rev.payout_count ? `<span class="mcr-tag">💰 ${rev.payout_count} ${T('payouts')}</span>` : ''}
      </div>
      <div class="mcr-rev-actions">
        <button class="mcr-upvote" data-rid="${rev.id}">▲ ${T('helpful')} (${rev.upvote_count||0})</button>
      </div>
    </div>`;
  }

  function renderStats(stats, firmName){
    const total = stats.total_reviews || 0;
    const avg = parseFloat(stats.avg_rating) || 0;
    const maxBar = Math.max(stats.count_5, stats.count_4, stats.count_3, stats.count_2, stats.count_1, 1);
    const bar = (count, lbl) => {
      const pct = total > 0 ? (count/total*100) : 0;
      return `<div class="mcr-dist-row"><span class="mcr-dist-lbl">${lbl}★</span><div class="mcr-dist-bar"><div class="mcr-dist-fill" style="width:${pct}%"></div></div><span class="mcr-dist-cnt">${count}</span></div>`;
    };
    return `
    <div class="mcr-stats">
      <div class="mcr-stats-left">
        <div class="mcr-avg">${avg.toFixed(1)}</div>
        <div class="mcr-stars">${starsHtml(avg, 20)}</div>
        <div class="mcr-total">${total} ${total===1?T('review'):T('reviews')}</div>
      </div>
      <div class="mcr-stats-right">
        ${bar(stats.count_5, 5)}
        ${bar(stats.count_4, 4)}
        ${bar(stats.count_3, 3)}
        ${bar(stats.count_2, 2)}
        ${bar(stats.count_1, 1)}
      </div>
    </div>`;
  }

  function renderForm(firmId, firmName, existing){
    const u = getCurrentUser();
    if (!u) {
      return `<div class="mcr-cta-login"><strong>${T('share')}</strong><br><span style="font-size:13px;color:rgba(255,255,255,.6)">${T('signup_login')} ${esc(firmName)}.</span><br><button class="mcr-btn" onclick="window.openAuthModal ? openAuthModal() : alert('Login')">${T('enter_signup')}</button></div>`;
    }
    const isEdit = !!existing;
    const def = existing || { rating: 5, title:'', body:'', account_size:'', program:'', reached_payout:null };
    return `
    <div class="mcr-form" data-firm="${firmId}">
      <div class="mcr-form-title">${isEdit ? T('edit_review') : T('rate_firm') + ' ' + esc(firmName)}</div>
      <div class="mcr-form-row">
        <label>${T('your_rating')}</label>
        <div class="mcr-rate-pick" data-current="${def.rating}">
          ${[1,2,3,4,5].map(n => `<span class="mcr-rate-star ${n<=def.rating?'on':''}" data-v="${n}">★</span>`).join('')}
        </div>
      </div>
      <div class="mcr-form-row">
        <label>${T('title_opt')}</label>
        <input type="text" class="mcr-input" id="mcr-title" maxlength="100" placeholder="${T('short_summary')}" value="${esc(def.title||'')}">
      </div>
      <div class="mcr-form-row">
        <label>${T('your_exp')}</label>
        <textarea class="mcr-textarea" id="mcr-body" maxlength="4000" rows="5" placeholder="${T('exp_ph')}">${esc(def.body||'')}</textarea>
      </div>
      <div class="mcr-form-row mcr-form-grid">
        <div>
          <label>${T('account_size')}</label>
          <select class="mcr-input" id="mcr-size">
            <option value="">—</option>
            <option ${def.account_size==='$25K'?'selected':''}>$25K</option>
            <option ${def.account_size==='$50K'?'selected':''}>$50K</option>
            <option ${def.account_size==='$100K'?'selected':''}>$100K</option>
            <option ${def.account_size==='$150K'?'selected':''}>$150K</option>
            <option ${def.account_size==='$200K'?'selected':''}>$200K</option>
            <option ${def.account_size==='$400K'?'selected':''}>$400K+</option>
          </select>
        </div>
        <div>
          <label>${T('program')}</label>
          <input type="text" class="mcr-input" id="mcr-program" maxlength="40" placeholder="${T('program_ph')}" value="${esc(def.program||'')}">
        </div>
        <div>
          <label>${T('reached_payout')}</label>
          <select class="mcr-input" id="mcr-payout">
            <option value="">—</option>
            <option value="true" ${def.reached_payout===true?'selected':''}>${T('yes')}</option>
            <option value="false" ${def.reached_payout===false?'selected':''}>${T('not_yet')}</option>
          </select>
        </div>
      </div>
      <div class="mcr-form-actions">
        <button class="mcr-btn mcr-btn-primary" id="mcr-submit">${isEdit ? T('update') : T('publish')}</button>
        <span class="mcr-form-msg" id="mcr-msg"></span>
      </div>
    </div>`;
  }

  function bindForm(container, firmId, firmName, onSuccess){
    const form = container.querySelector('.mcr-form');
    if (!form) return;
    const rate = form.querySelector('.mcr-rate-pick');
    if (rate) {
      rate.addEventListener('click', e => {
        const s = e.target.closest('[data-v]');
        if (!s) return;
        const v = parseInt(s.dataset.v, 10);
        rate.dataset.current = v;
        rate.querySelectorAll('[data-v]').forEach(el => el.classList.toggle('on', parseInt(el.dataset.v,10) <= v));
      });
    }
    const submit = form.querySelector('#mcr-submit');
    if (submit) submit.addEventListener('click', async () => {
      const msg = form.querySelector('#mcr-msg');
      msg.textContent = '';
      const rating = parseFloat(rate?.dataset.current) || 5;
      const body = form.querySelector('#mcr-body').value.trim();
      if (body.length < 30) { msg.textContent = T('min_chars'); msg.style.color = '#EF4444'; return; }
      submit.disabled = true; submit.textContent = T('sending');
      try {
        const payload = {
          firm_id: firmId,
          rating,
          title: form.querySelector('#mcr-title').value.trim() || null,
          body,
          account_size: form.querySelector('#mcr-size').value || null,
          program: form.querySelector('#mcr-program').value.trim() || null,
          reached_payout: form.querySelector('#mcr-payout').value === 'true' ? true : form.querySelector('#mcr-payout').value === 'false' ? false : null,
          language: (document.documentElement.lang || 'pt').slice(0,2),
        };
        await postReview(payload);
        msg.textContent = T('published'); msg.style.color = '#10B981';
        if (onSuccess) setTimeout(onSuccess, 800);
      } catch(e) {
        msg.textContent = '✗ ' + (e.message === 'login_required' ? T('login_req') : T('publish_err'));
        msg.style.color = '#EF4444';
      }
      submit.disabled = false; submit.textContent = T('publish');
    });
  }

  async function mount(firmId, container, firmName){
    if (!container) return;
    firmName = firmName || firmId;
    container.innerHTML = '<div class="mcr-loading">' + T('loading') + '</div>';
    const [stats, reviews, userReview] = await Promise.all([
      fetchStats(firmId),
      fetchReviews(firmId, 20, 0),
      fetchUserReview(firmId),
    ]);
    const html = `
      <div class="mcr-container">
        ${renderStats(stats, firmName)}
        <div class="mcr-section">
          ${renderForm(firmId, firmName, userReview)}
        </div>
        <div class="mcr-section">
          <div class="mcr-section-title">${T('reviews_title')} (${stats.total_reviews||0})</div>
          <div class="mcr-list">
            ${reviews.length ? reviews.map(renderReviewCard).join('') : '<div class="mcr-empty">' + T('be_first') + ' ' + esc(firmName) + '.</div>'}
          </div>
        </div>
      </div>`;
    container.innerHTML = html;
    bindForm(container, firmId, firmName, () => mount(firmId, container, firmName));

    // Bind upvotes
    container.querySelectorAll('.mcr-upvote').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!getAuthToken()) { alert('Faça login pra marcar como útil'); return; }
        const rid = btn.dataset.rid;
        try {
          await toggleUpvote(rid, btn.classList.contains('voted'));
          btn.classList.toggle('voted');
        } catch(e){}
      });
    });
  }

  global.MCReviews = { mount, fetchStats, fetchReviews, postReview };
})(window);
