/* ─────────────────────────────────────────────
   MarketsCoupons Reviews — sistema de avaliações
   Inspirado em PropFirmMatch. Só usuários com email_confirmed_at podem postar.
   Admin (Everton) soft-delete via admin.html.

   Usage:
     await MCReviews.mount(firmId, containerEl)  // renderiza UI completa
     MCReviews.fetchStats(firmId)                 // só estatísticas
   ───────────────────────────────────────────── */

(function(global){
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
        ${rev.reached_payout === true ? `<span class="mcr-tag mcr-tag-good">✓ Recebeu payout</span>` : ''}
        ${rev.reached_payout === false ? `<span class="mcr-tag mcr-tag-neutral">Sem payout ainda</span>` : ''}
        ${rev.payout_count ? `<span class="mcr-tag">💰 ${rev.payout_count} payouts</span>` : ''}
      </div>
      <div class="mcr-rev-actions">
        <button class="mcr-upvote" data-rid="${rev.id}">▲ Útil (${rev.upvote_count||0})</button>
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
        <div class="mcr-total">${total} ${total===1?'avaliação':'avaliações'}</div>
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
      return `<div class="mcr-cta-login"><strong>Compartilhe sua experiência</strong><br><span style="font-size:13px;color:rgba(255,255,255,.6)">Cadastre-se ou faça login pra avaliar ${esc(firmName)}.</span><br><button class="mcr-btn" onclick="window.openAuthModal ? openAuthModal() : alert('Abra o menu de login')">Entrar / Cadastrar</button></div>`;
    }
    const isEdit = !!existing;
    const def = existing || { rating: 5, title:'', body:'', account_size:'', program:'', reached_payout:null };
    return `
    <div class="mcr-form" data-firm="${firmId}">
      <div class="mcr-form-title">${isEdit ? 'Editar sua avaliação' : 'Avalie ' + esc(firmName)}</div>
      <div class="mcr-form-row">
        <label>Sua nota geral</label>
        <div class="mcr-rate-pick" data-current="${def.rating}">
          ${[1,2,3,4,5].map(n => `<span class="mcr-rate-star ${n<=def.rating?'on':''}" data-v="${n}">★</span>`).join('')}
        </div>
      </div>
      <div class="mcr-form-row">
        <label>Título (opcional)</label>
        <input type="text" class="mcr-input" id="mcr-title" maxlength="100" placeholder="Resumo curto" value="${esc(def.title||'')}">
      </div>
      <div class="mcr-form-row">
        <label>Sua experiência (min 30 chars)</label>
        <textarea class="mcr-textarea" id="mcr-body" maxlength="4000" rows="5" placeholder="Conte como foi com essa firma — payouts, regras, suporte...">${esc(def.body||'')}</textarea>
      </div>
      <div class="mcr-form-row mcr-form-grid">
        <div>
          <label>Tamanho da conta</label>
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
          <label>Programa</label>
          <input type="text" class="mcr-input" id="mcr-program" maxlength="40" placeholder="1-Step, EOD, Sprint..." value="${esc(def.program||'')}">
        </div>
        <div>
          <label>Já recebeu payout?</label>
          <select class="mcr-input" id="mcr-payout">
            <option value="">—</option>
            <option value="true" ${def.reached_payout===true?'selected':''}>Sim</option>
            <option value="false" ${def.reached_payout===false?'selected':''}>Ainda não</option>
          </select>
        </div>
      </div>
      <div class="mcr-form-actions">
        <button class="mcr-btn mcr-btn-primary" id="mcr-submit">${isEdit ? 'Atualizar' : 'Publicar avaliação'}</button>
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
      if (body.length < 30) { msg.textContent = '✗ Mínimo 30 caracteres'; msg.style.color = '#EF4444'; return; }
      submit.disabled = true; submit.textContent = 'Enviando...';
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
        msg.textContent = '✓ Avaliação publicada!'; msg.style.color = '#10B981';
        if (onSuccess) setTimeout(onSuccess, 800);
      } catch(e) {
        msg.textContent = '✗ ' + (e.message === 'login_required' ? 'Login necessário' : 'Erro ao publicar');
        msg.style.color = '#EF4444';
      }
      submit.disabled = false; submit.textContent = 'Publicar avaliação';
    });
  }

  async function mount(firmId, container, firmName){
    if (!container) return;
    firmName = firmName || firmId;
    container.innerHTML = '<div class="mcr-loading">Carregando avaliações...</div>';
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
          <div class="mcr-section-title">Avaliações (${stats.total_reviews||0})</div>
          <div class="mcr-list">
            ${reviews.length ? reviews.map(renderReviewCard).join('') : '<div class="mcr-empty">Seja o primeiro a avaliar ' + esc(firmName) + '.</div>'}
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
