// Vercel Cron — Auto-send promo emails every 3 days
// Triggered by Vercel Cron (vercel.json)
// GET /api/cron-promo?key=CRON_SECRET

const { sign: signUnsub } = require('./unsubscribe.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

// Conversational subject pool (7 langs). No symbols/%/emojis — plain chat tone to escape Promotions tab.
// Placeholders: {firm} = firm name, {nome} = subscriber first name.
const SUBJECT_POOL = {
  pt: [
    'Vc viu o que a {firm} tá fazendo?',
    '{nome}, rapidinho — sobre a {firm}',
    'Preciso te mostrar uma coisa da {firm}',
    'Isso da {firm} não vai durar',
    'Olha isso antes de escolher firma',
    'Quase não te mandei esse',
    '{nome}, deu uma olhada na {firm}?',
    'Acho que você vai gostar disso',
    'Sobre ontem — dá uma olhada',
    'Esse aqui vale o seu tempo',
    'Sério, dá uma olhada na {firm}',
    'Você tava esperando isso',
  ],
  en: [
    'Did you see what {firm} is doing?',
    '{nome}, quick one about {firm}',
    'Need to show you something from {firm}',
    'This {firm} thing won\'t last',
    'Check this before you pick a firm',
    'Almost didn\'t send you this',
    '{nome}, seen {firm} lately?',
    'Think you\'ll like this one',
    'About yesterday — take a look',
    'This one is worth your time',
    'Seriously, take a look at {firm}',
    'You\'ve been waiting for this',
  ],
  es: [
    'Viste lo que está haciendo {firm}?',
    '{nome}, rápido — sobre {firm}',
    'Tengo que mostrarte algo de {firm}',
    'Esto de {firm} no va a durar',
    'Mira esto antes de elegir firma',
    'Casi no te mando este',
    '{nome}, viste {firm} últimamente?',
    'Creo que te va a gustar',
    'Sobre ayer — dale una mirada',
    'Este vale tu tiempo',
    'En serio, mira {firm}',
    'Estabas esperando esto',
  ],
  it: [
    'Hai visto cosa sta facendo {firm}?',
    '{nome}, veloce — su {firm}',
    'Devo mostrarti una cosa di {firm}',
    'Questa di {firm} non durerà',
    'Guarda prima di scegliere una firm',
    'Quasi non te lo mandavo',
    '{nome}, hai visto {firm}?',
    'Penso che ti piacerà',
    'Su ieri — dai un\'occhiata',
    'Questo vale il tuo tempo',
    'Davvero, guarda {firm}',
    'Stavi aspettando questo',
  ],
  fr: [
    'T\'as vu ce que fait {firm}?',
    '{nome}, rapide — sur {firm}',
    'Faut que je te montre un truc de {firm}',
    'Ça de {firm} va pas durer',
    'Regarde avant de choisir une firm',
    'J\'ai failli pas envoyer',
    '{nome}, t\'as vu {firm}?',
    'Je pense que tu vas aimer',
    'À propos d\'hier — jette un œil',
    'Celui-là vaut ton temps',
    'Sérieux, regarde {firm}',
    'Tu attendais ça',
  ],
  de: [
    'Hast du gesehen was {firm} macht?',
    '{nome}, kurz — zu {firm}',
    'Muss dir was von {firm} zeigen',
    'Das von {firm} hält nicht lang',
    'Schau das bevor du eine Firm wählst',
    'Hätte ich fast nicht geschickt',
    '{nome}, {firm} in letzter Zeit gesehen?',
    'Glaube das wird dir gefallen',
    'Zu gestern — schau mal rein',
    'Das hier lohnt sich',
    'Ernsthaft, schau dir {firm} an',
    'Darauf hast du gewartet',
  ],
  ar: [
    'شفت شو عم تعمل {firm}؟',
    '{nome}، سريعاً — عن {firm}',
    'لازم أوريك شي من {firm}',
    'هالشي من {firm} ما رح يدوم',
    'شوف هيدا قبل ما تختار firm',
    'كدت ما بعت لك ياها',
    '{nome}، شفت {firm} مؤخراً؟',
    'بعتقد رح يعجبك',
    'عن مبارح — ألقِ نظرة',
    'هيدا يستحق وقتك',
    'جدياً، شوف {firm}',
    'كنت عم تستنى هيدا',
  ],
};

function pickSubject(lang, firmName, userName) {
  const pool = SUBJECT_POOL[lang] || SUBJECT_POOL.en;
  const tpl = pool[Math.floor(Math.random() * pool.length)];
  return tpl.replace(/\{firm\}/g, firmName).replace(/\{nome\}/g, userName || (lang === 'pt' ? 'Trader' : 'Trader'));
}

// Email translations (7 languages)
const EMAIL_I18N = {
  pt: {
    greeting: 'Ola {nome},',
    intro: 'Confira as melhores promocoes ativas para prop firms! Escolha sua conta e compre direto pelo email.',
    exclusive_coupon: 'Cupom Exclusivo',
    paste_checkout: 'Copie e cole no checkout',
    auto_discount: 'Desconto aplicado pelo link',
    see_plans: 'Ver planos',
    see_all: 'Ver todas as ofertas no site',
    footer: 'Voce recebeu este email por estar inscrito no MarketsCoupons.',
    unsub: 'Cancelar inscrição',
    tagline: 'As melhores ofertas para traders',
    off: 'OFF',
  },
  en: {
    greeting: 'Hey {nome},',
    intro: 'Check out the best active deals for prop firms! Pick your account and sign up directly from this email.',
    exclusive_coupon: 'Exclusive Coupon',
    paste_checkout: 'Copy and paste at checkout',
    auto_discount: 'Discount applied through link',
    see_plans: 'See plans',
    see_all: 'See all deals on our site',
    footer: 'You received this email because you subscribed to MarketsCoupons.',
    unsub: 'Unsubscribe',
    tagline: 'The best deals for traders',
    off: 'OFF',
  },
  es: {
    greeting: 'Hola {nome},',
    intro: 'Mira las mejores promociones activas para prop firms! Elige tu cuenta y registrate directo desde este email.',
    exclusive_coupon: 'Cupon Exclusivo',
    paste_checkout: 'Copia y pega en el checkout',
    auto_discount: 'Descuento aplicado por el enlace',
    see_plans: 'Ver planes',
    see_all: 'Ver todas las ofertas en el sitio',
    footer: 'Recibiste este email porque estas suscrito a MarketsCoupons.',
    unsub: 'Cancelar suscripcion',
    tagline: 'Las mejores ofertas para traders',
    off: 'OFF',
  },
  fr: {
    greeting: 'Bonjour {nome},',
    intro: 'Decouvrez les meilleures promotions actives pour prop firms! Choisissez votre compte et inscrivez-vous directement.',
    exclusive_coupon: 'Coupon Exclusif',
    paste_checkout: 'Copiez et collez au checkout',
    auto_discount: 'Reduction appliquee via le lien',
    see_plans: 'Voir les plans',
    see_all: 'Voir toutes les offres sur le site',
    footer: 'Vous recevez cet email car vous etes inscrit a MarketsCoupons.',
    unsub: 'Se desinscrire',
    tagline: 'Les meilleures offres pour traders',
    off: 'OFF',
  },
  de: {
    greeting: 'Hallo {nome},',
    intro: 'Entdecken Sie die besten aktiven Angebote fur Prop Firms! Wahlen Sie Ihr Konto und melden Sie sich direkt an.',
    exclusive_coupon: 'Exklusiver Gutschein',
    paste_checkout: 'Kopieren und beim Checkout einfugen',
    auto_discount: 'Rabatt uber den Link angewendet',
    see_plans: 'Plane ansehen',
    see_all: 'Alle Angebote auf der Seite ansehen',
    footer: 'Sie erhalten diese E-Mail, weil Sie bei MarketsCoupons angemeldet sind.',
    unsub: 'Abmelden',
    tagline: 'Die besten Angebote fur Trader',
    off: 'OFF',
  },
  it: {
    greeting: 'Ciao {nome},',
    intro: 'Scopri le migliori promozioni attive per prop firms! Scegli il tuo conto e iscriviti direttamente.',
    exclusive_coupon: 'Coupon Esclusivo',
    paste_checkout: 'Copia e incolla al checkout',
    auto_discount: 'Sconto applicato tramite il link',
    see_plans: 'Vedi piani',
    see_all: 'Vedi tutte le offerte sul sito',
    footer: 'Hai ricevuto questa email perche sei iscritto a MarketsCoupons.',
    unsub: 'Annulla iscrizione',
    tagline: 'Le migliori offerte per trader',
    off: 'OFF',
  },
  ar: {
    greeting: '{nome} مرحبا',
    intro: 'اطلع على افضل العروض النشطة لشركات التداول! اختر حسابك وسجل مباشرة.',
    exclusive_coupon: 'كوبون حصري',
    paste_checkout: 'انسخ والصقه عند الدفع',
    auto_discount: 'الخصم يطبق عبر الرابط',
    see_plans: 'عرض الخطط',
    see_all: 'شاهد جميع العروض على الموقع',
    footer: 'تلقيت هذا البريد لانك مشترك في MarketsCoupons.',
    unsub: 'الغاء الاشتراك',
    tagline: 'افضل العروض للمتداولين',
    off: 'OFF',
  },
};

function et(lang, key) {
  return (EMAIL_I18N[lang] || EMAIL_I18N.en)[key] || EMAIL_I18N.en[key] || key;
}

function buildCronEmail(firms, lang) {
  const t = (key) => et(lang, key);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const promoCards = firms.map(f => `
    <div style="background:#10151F;border:1px solid #1C2535;border-radius:12px;padding:20px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;margin-bottom:12px;">
        ${f.icon_url ? `<img src="https://www.marketscoupons.com/${f.icon_url}" width="36" height="36" style="width:36px;height:36px;border-radius:8px;margin-right:12px;object-fit:contain;background:${(f.color || '#F0B429')}22;">` : `<div style="width:36px;height:36px;border-radius:8px;background:${(f.color || '#F0B429')}22;display:flex;align-items:center;justify-content:center;margin-right:12px;font-size:16px;font-weight:900;color:${f.color || '#F0B429'}">${f.name[0]}</div>`}
        <div style="flex:1;">
          <div style="color:#EDF2F7;font-size:16px;font-weight:800;">${f.name}</div>
          <div style="color:#7A8FA6;font-size:11px;margin-top:2px;">${f.type || ''}${f.split ? ' · Split ' + f.split : ''}${f.rating ? ' · ' + f.rating.toFixed(1) + ' Trustpilot' : ''}</div>
        </div>
        <div style="text-align:center;margin-left:10px;">
          <div style="color:#22C55E;font-size:22px;font-weight:900;">${f.discount}%</div>
          <div style="color:#3D4F63;font-size:9px;font-weight:700;">${t('off')}</div>
        </div>
      </div>
      <div style="color:#7A8FA6;font-size:13px;line-height:1.5;margin-bottom:14px;">${f.description || ''}</div>
      ${f.coupon ? `<div style="background:#0B0F16;border:1px dashed #F0B429;border-radius:10px;padding:12px 16px;text-align:center;margin-bottom:14px;">
        <div style="color:#3D4F63;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${t('exclusive_coupon')}</div>
        <div style="color:#F0B429;font-size:20px;font-weight:900;letter-spacing:4px;margin-top:4px;">${f.coupon}</div>
        <div style="color:#3D4F63;font-size:10px;margin-top:4px;">${t('paste_checkout')}</div>
      </div>` : `<div style="color:#22C55E;font-size:13px;font-weight:600;margin-bottom:14px;">&#10003; ${t('auto_discount')}</div>`}
      <a href="${f.link}" style="display:block;text-align:center;background:linear-gradient(135deg,${f.color || '#F0B429'},${f.color || '#F0B429'}cc);color:#fff;padding:14px;border-radius:10px;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:0.5px;">${t('see_plans')} &rarr;</a>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07090D;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#07090D;">

  <!-- Gold gradient top bar -->
  <div style="height:4px;background:linear-gradient(90deg,#F0B429,#22C55E,#F0B429);"></div>

  <!-- Header -->
  <div style="text-align:center;padding:28px 24px 14px;">
    <div style="font-size:24px;font-weight:900;">
      <span style="color:#EDF2F7;">Markets</span><span style="color:#F0B429;">Coupons</span>
      <span style="display:inline-block;width:7px;height:7px;background:#22C55E;border-radius:50%;margin-left:4px;vertical-align:middle;"></span>
    </div>
    <div style="color:#3D4F63;font-size:9px;font-weight:700;letter-spacing:3px;margin-top:6px;">${t('tagline').toUpperCase()}</div>
  </div>

  <div style="padding:0 24px 28px;">
    <div style="font-size:15px;color:#EDF2F7;font-weight:600;margin-bottom:6px;">${t('greeting')}</div>
    <div style="color:#7A8FA6;font-size:14px;margin-bottom:20px;line-height:1.7;">${t('intro')}</div>

    ${promoCards}

    <div style="text-align:center;margin-top:20px;">
      <a href="https://www.marketscoupons.com" style="color:#F0B429;font-size:13px;font-weight:600;text-decoration:underline;">${t('see_all')} &rarr;</a>
    </div>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #1C2535;padding:20px 24px;text-align:center;">
    <div style="font-size:14px;font-weight:900;">
      <span style="color:#EDF2F7;">Markets</span><span style="color:#F0B429;">Coupons</span>
    </div>
    <div style="color:#3D4F63;font-size:10px;margin-top:4px;">www.marketscoupons.com</div>
    <div style="color:#3D4F63;font-size:11px;margin-top:12px;line-height:1.6;">
      ${t('footer')}<br>
      <a href="{unsub_url}" style="color:#3D4F63;">${t('unsub')}</a>
    </div>
  </div>

  <!-- Gold gradient bottom bar -->
  <div style="height:4px;background:linear-gradient(90deg,#F0B429,#22C55E,#F0B429);"></div>
</div>
</body></html>`;
}

module.exports = async (req, res) => {
  // Verify cron secret (mandatory)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const BREVO_KEY = process.env.BREVO_API_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!BREVO_KEY && !RESEND_KEY) return res.status(500).json({ error: 'No email provider configured' });

  // Reserve 5 Brevo slots per day for critical emails (signup, welcome).
  // Query Brevo directly to get the real daily-credits-remaining number.
  const BREVO_DAILY_RESERVE = 5;
  let brevoRemaining = 0;
  if (BREVO_KEY) {
    try {
      const accResp = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'accept': 'application/json', 'api-key': BREVO_KEY },
      });
      const acc = await accResp.json();
      // Brevo returns plan[] with type 'free' having 'credits' = emails left for the period
      const freePlan = (acc.plan || []).find(p => /free|pay|send/i.test(p.type || '') && typeof p.credits === 'number');
      brevoRemaining = freePlan ? Math.max(0, freePlan.credits - BREVO_DAILY_RESERVE) : 0;
      console.log(`[cron-promo] Brevo credits left: ${freePlan?.credits || 0}, reserving ${BREVO_DAILY_RESERVE}, budget for bulk: ${brevoRemaining}`);
    } catch (e) {
      console.error('[cron-promo] Could not fetch Brevo account:', e.message);
      brevoRemaining = 0; // fail safe: don't send via Brevo if we can't read credits
    }
  }

  try {
    // 1. Get active subscribers with language
    const subResp = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?status=eq.active&select=email,name,lang`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const subscribers = await subResp.json();
    if (!subscribers?.length) return res.status(200).json({ message: 'No active subscribers' });

    // 2. Get active firms with best promotions
    const firmsResp = await fetch(`${SUPABASE_URL}/rest/v1/cms_firms?active=eq.true&discount=gt.0&order=discount.desc&limit=3`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const firms = await firmsResp.json();
    if (!firms?.length) return res.status(200).json({ message: 'No active promotions' });

    // 3. Group subscribers by language
    const langGroups = {};
    for (const sub of subscribers) {
      const lang = sub.lang || 'en';
      if (!langGroups[lang]) langGroups[lang] = [];
      langGroups[lang].push(sub);
    }

    // 4. Send to each language group with localized email
    let sent = 0, failed = 0;
    // Rotate through top firms so the conversational subject mentions different names across the batch.
    const subjectFirms = firms.slice(0, 3).map(f => f.short_name || f.name);

    for (const [lang, group] of Object.entries(langGroups)) {
      // UTM tagging: tag all marketscoupons.com links (external affiliate links pass-through)
      const tagUrl = (url) => {
        try {
          if (!/^https?:\/\/(www\.)?marketscoupons\.(com|vercel\.app)/i.test(url)) return url;
          const u = new URL(url);
          if (!u.searchParams.get('utm_source')) u.searchParams.set('utm_source', 'email');
          if (!u.searchParams.get('utm_medium')) u.searchParams.set('utm_medium', 'email');
          if (!u.searchParams.get('utm_campaign')) u.searchParams.set('utm_campaign', 'promo_' + lang);
          return u.toString();
        } catch { return url; }
      };
      const htmlContent = buildCronEmail(firms, lang)
        .replace(/href\s*=\s*"(https?:\/\/[^"]+)"/gi, (m, url) => `href="${tagUrl(url)}"`);

      for (const sub of group) {
        // Brevo budget hit? Stop the bulk send — resumes tomorrow when credits reset.
        // Resend path intentionally disabled for bulk (lands in Gmail Promotions tab).
        if (brevoRemaining <= 0) break;

        const unsubUrl = (() => { try { return `https://www.marketscoupons.com/api/unsubscribe?e=${encodeURIComponent(sub.email)}&t=${signUnsub(sub.email)}&lang=${lang}`; } catch { return 'https://www.marketscoupons.com/'; } })();
        const listUnsubHeader = `<${unsubUrl}>, <mailto:unsubscribe@marketscoupons.com?subject=unsubscribe>`;
        const personalizedHtml = htmlContent
          .replace(/{nome}/g, sub.name || 'Trader')
          .replace(/\{unsub_url\}/g, unsubUrl);
        const firstName = (sub.name || '').trim().split(/\s+/)[0] || '';
        const firmForSubject = subjectFirms[Math.floor(Math.random() * subjectFirms.length)];
        const subject = pickSubject(lang, firmForSubject, firstName);
        try {
          const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_KEY },
            body: JSON.stringify({
              sender: { name: 'Lara | Markets Coupons', email: 'lara@marketscoupons.com' },
              to: [{ email: sub.email, name: sub.name || '' }],
              subject, htmlContent: personalizedHtml,
              headers: {
                'List-Unsubscribe': listUnsubHeader,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
              tags: ['promo-auto', 'lang-' + lang],
            }),
          });
          if (resp.ok) { sent++; brevoRemaining--; } else failed++;
        } catch { failed++; }

        // Rate limit
        await new Promise(r => setTimeout(r, 150));
      }
      if (brevoRemaining <= 0) break; // outer lang loop also stops
    }

    // 5. Log to Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        campaign_name: 'Promo Automatica',
        subject: subject,
        recipients: subscribers.length,
        status: failed === 0 ? 'sent' : (sent === 0 ? 'failed' : 'partial'),
        sent_by: 'cron',
        provider: 'brevo',
      }),
    });

    return res.status(200).json({
      success: true, sent, failed,
      total: subscribers.length,
      languages: Object.keys(langGroups),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
