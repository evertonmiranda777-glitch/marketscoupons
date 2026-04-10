// Vercel Cron — Auto-send promo emails every 3 days
// Triggered by Vercel Cron (vercel.json)
// GET /api/cron-promo?key=CRON_SECRET

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

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
      <a href="https://www.marketscoupons.com" style="color:#3D4F63;">${t('unsub')}</a>
    </div>
  </div>

  <!-- Gold gradient bottom bar -->
  <div style="height:4px;background:linear-gradient(90deg,#F0B429,#22C55E,#F0B429);"></div>
</div>
</body></html>`;
}

module.exports = async (req, res) => {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) return res.status(500).json({ error: 'BREVO_API_KEY not configured' });

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
    const subject = `${firms[0].name} — ${firms[0].discount}% OFF`;

    for (const [lang, group] of Object.entries(langGroups)) {
      const htmlContent = buildCronEmail(firms, lang);

      for (const sub of group) {
        try {
          const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'api-key': BREVO_KEY,
            },
            body: JSON.stringify({
              sender: { name: 'Markets Coupons', email: 'offers@marketscoupons.com' },
              to: [{ email: sub.email, name: sub.name || '' }],
              subject: subject,
              htmlContent: htmlContent.replace(/{nome}/g, sub.name || 'Trader'),
              tags: ['promo-auto', 'lang-' + lang],
            }),
          });
          if (resp.ok) sent++; else failed++;
        } catch { failed++; }

        // Rate limit
        await new Promise(r => setTimeout(r, 150));
      }
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
