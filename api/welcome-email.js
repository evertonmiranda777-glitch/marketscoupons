// Vercel Serverless — Send welcome email to new subscriber
// POST /api/welcome-email { email, name, lang }
// Called by Supabase webhook on email_subscribers insert, or manually

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const WELCOME_I18N = {
  pt: {
    subject: 'Bem-vindo ao MarketsCoupons!',
    greeting: 'Ola {nome},',
    welcome_title: 'Bem-vindo ao MarketsCoupons',
    welcome_text: 'Agora voce tem acesso as melhores ofertas e ferramentas para traders. Confira tudo que preparamos para voce:',
    section_coupons: 'Cupons Exclusivos',
    desc_coupons: 'Ate 90% de desconto em prop firms selecionadas. Cupons atualizados diariamente.',
    section_compare: 'Comparador de Firmas',
    desc_compare: 'Compare precos, condicoes, drawdown, profit split e mais — lado a lado.',
    section_analysis: 'Analise Diaria',
    desc_analysis: 'Insights de mercado diarios para ES, NQ, GC e CL. Gratuito para todos.',
    section_gex: 'GEX / Gamma Exposure',
    desc_gex: 'Niveis de gamma exposure atualizados diariamente com zonas-chave.',
    section_calendar: 'Calendario Economico',
    desc_calendar: 'Eventos de alto impacto com horarios e expectativas do mercado.',
    section_blog: 'Blog & Guias',
    desc_blog: 'Artigos educacionais e guias completos sobre prop trading.',
    section_calc: 'Calculadora de Position Size',
    desc_calc: 'Calcule o tamanho ideal da sua posicao baseado no seu risco.',
    section_quiz: 'Quiz de Prop Firms',
    desc_quiz: 'Descubra qual prop firm combina com seu perfil de trader.',
    section_loyalty: 'Programa de Fidelidade',
    desc_loyalty: 'Ganhe pontos a cada compra e troque por beneficios exclusivos.',
    cta: 'Explorar MarketsCoupons',
    footer: 'Voce recebeu este email por estar inscrito no MarketsCoupons.',
    unsub: 'Cancelar inscricao',
    tagline: 'As melhores ofertas para traders',
  },
  en: {
    subject: 'Welcome to MarketsCoupons!',
    greeting: 'Hey {nome},',
    welcome_title: 'Welcome to MarketsCoupons',
    welcome_text: 'You now have access to the best deals and tools for traders. Here\'s everything we\'ve prepared for you:',
    section_coupons: 'Exclusive Coupons',
    desc_coupons: 'Up to 90% off on selected prop firms. Coupons updated daily.',
    section_compare: 'Firm Comparator',
    desc_compare: 'Compare prices, conditions, drawdown, profit split and more — side by side.',
    section_analysis: 'Daily Analysis',
    desc_analysis: 'Daily market insights for ES, NQ, GC and CL. Free for everyone.',
    section_gex: 'GEX / Gamma Exposure',
    desc_gex: 'Daily updated gamma exposure levels with key zones.',
    section_calendar: 'Economic Calendar',
    desc_calendar: 'High-impact events with schedules and market expectations.',
    section_blog: 'Blog & Guides',
    desc_blog: 'Educational articles and complete guides on prop trading.',
    section_calc: 'Position Size Calculator',
    desc_calc: 'Calculate your ideal position size based on your risk.',
    section_quiz: 'Prop Firm Quiz',
    desc_quiz: 'Find out which prop firm matches your trading profile.',
    section_loyalty: 'Loyalty Program',
    desc_loyalty: 'Earn points with every purchase and redeem exclusive benefits.',
    cta: 'Explore MarketsCoupons',
    footer: 'You received this email because you subscribed to MarketsCoupons.',
    unsub: 'Unsubscribe',
    tagline: 'The best deals for traders',
  },
  es: {
    subject: 'Bienvenido a MarketsCoupons!',
    greeting: 'Hola {nome},',
    welcome_title: 'Bienvenido a MarketsCoupons',
    welcome_text: 'Ahora tienes acceso a las mejores ofertas y herramientas para traders. Mira todo lo que preparamos para ti:',
    section_coupons: 'Cupones Exclusivos',
    desc_coupons: 'Hasta 90% de descuento en prop firms seleccionadas. Cupones actualizados diariamente.',
    section_compare: 'Comparador de Firmas',
    desc_compare: 'Compara precios, condiciones, drawdown, profit split y mas — lado a lado.',
    section_analysis: 'Analisis Diario',
    desc_analysis: 'Insights de mercado diarios para ES, NQ, GC y CL. Gratis para todos.',
    section_gex: 'GEX / Gamma Exposure',
    desc_gex: 'Niveles de gamma exposure actualizados diariamente con zonas clave.',
    section_calendar: 'Calendario Economico',
    desc_calendar: 'Eventos de alto impacto con horarios y expectativas del mercado.',
    section_blog: 'Blog y Guias',
    desc_blog: 'Articulos educativos y guias completas sobre prop trading.',
    section_calc: 'Calculadora de Position Size',
    desc_calc: 'Calcula el tamano ideal de tu posicion basado en tu riesgo.',
    section_quiz: 'Quiz de Prop Firms',
    desc_quiz: 'Descubre cual prop firm combina con tu perfil de trader.',
    section_loyalty: 'Programa de Fidelidad',
    desc_loyalty: 'Gana puntos con cada compra y canjea beneficios exclusivos.',
    cta: 'Explorar MarketsCoupons',
    footer: 'Recibiste este email porque estas suscrito a MarketsCoupons.',
    unsub: 'Cancelar suscripcion',
    tagline: 'Las mejores ofertas para traders',
  },
  fr: {
    subject: 'Bienvenue sur MarketsCoupons!',
    greeting: 'Bonjour {nome},',
    welcome_title: 'Bienvenue sur MarketsCoupons',
    welcome_text: 'Vous avez maintenant acces aux meilleures offres et outils pour traders. Decouvrez tout ce que nous avons prepare pour vous:',
    section_coupons: 'Coupons Exclusifs',
    desc_coupons: 'Jusqu\'a 90% de reduction sur des prop firms selectionnees. Coupons mis a jour quotidiennement.',
    section_compare: 'Comparateur de Firmes',
    desc_compare: 'Comparez prix, conditions, drawdown, profit split et plus — cote a cote.',
    section_analysis: 'Analyse Quotidienne',
    desc_analysis: 'Insights de marche quotidiens pour ES, NQ, GC et CL. Gratuit pour tous.',
    section_gex: 'GEX / Gamma Exposure',
    desc_gex: 'Niveaux de gamma exposure mis a jour quotidiennement avec zones cles.',
    section_calendar: 'Calendrier Economique',
    desc_calendar: 'Evenements a fort impact avec horaires et attentes du marche.',
    section_blog: 'Blog & Guides',
    desc_blog: 'Articles educatifs et guides complets sur le prop trading.',
    section_calc: 'Calculateur de Taille de Position',
    desc_calc: 'Calculez la taille ideale de votre position en fonction de votre risque.',
    section_quiz: 'Quiz Prop Firms',
    desc_quiz: 'Decouvrez quelle prop firm correspond a votre profil de trader.',
    section_loyalty: 'Programme de Fidelite',
    desc_loyalty: 'Gagnez des points a chaque achat et echangez-les contre des avantages exclusifs.',
    cta: 'Explorer MarketsCoupons',
    footer: 'Vous recevez cet email car vous etes inscrit a MarketsCoupons.',
    unsub: 'Se desinscrire',
    tagline: 'Les meilleures offres pour traders',
  },
  de: {
    subject: 'Willkommen bei MarketsCoupons!',
    greeting: 'Hallo {nome},',
    welcome_title: 'Willkommen bei MarketsCoupons',
    welcome_text: 'Sie haben jetzt Zugang zu den besten Angeboten und Tools fur Trader. Hier ist alles, was wir fur Sie vorbereitet haben:',
    section_coupons: 'Exklusive Gutscheine',
    desc_coupons: 'Bis zu 90% Rabatt auf ausgewahlte Prop Firms. Gutscheine taglich aktualisiert.',
    section_compare: 'Firmenvergleich',
    desc_compare: 'Vergleichen Sie Preise, Bedingungen, Drawdown, Profit Split und mehr — nebeneinander.',
    section_analysis: 'Tagliche Analyse',
    desc_analysis: 'Tagliche Markteinblicke fur ES, NQ, GC und CL. Kostenlos fur alle.',
    section_gex: 'GEX / Gamma Exposure',
    desc_gex: 'Taglich aktualisierte Gamma-Exposure-Niveaus mit Schlüsselzonen.',
    section_calendar: 'Wirtschaftskalender',
    desc_calendar: 'Ereignisse mit hohem Einfluss mit Zeitplanen und Markterwartungen.',
    section_blog: 'Blog & Leitfaden',
    desc_blog: 'Lehrreiche Artikel und vollstandige Leitfaden zum Prop Trading.',
    section_calc: 'Positionsgrosse-Rechner',
    desc_calc: 'Berechnen Sie Ihre ideale Positionsgrosse basierend auf Ihrem Risiko.',
    section_quiz: 'Prop Firm Quiz',
    desc_quiz: 'Finden Sie heraus, welche Prop Firm zu Ihrem Trading-Profil passt.',
    section_loyalty: 'Treueprogramm',
    desc_loyalty: 'Sammeln Sie Punkte bei jedem Kauf und losen Sie exklusive Vorteile ein.',
    cta: 'MarketsCoupons entdecken',
    footer: 'Sie erhalten diese E-Mail, weil Sie bei MarketsCoupons angemeldet sind.',
    unsub: 'Abmelden',
    tagline: 'Die besten Angebote fur Trader',
  },
  it: {
    subject: 'Benvenuto su MarketsCoupons!',
    greeting: 'Ciao {nome},',
    welcome_title: 'Benvenuto su MarketsCoupons',
    welcome_text: 'Ora hai accesso alle migliori offerte e strumenti per trader. Ecco tutto cio che abbiamo preparato per te:',
    section_coupons: 'Coupon Esclusivi',
    desc_coupons: 'Fino al 90% di sconto su prop firms selezionate. Coupon aggiornati quotidianamente.',
    section_compare: 'Comparatore di Firme',
    desc_compare: 'Confronta prezzi, condizioni, drawdown, profit split e altro — fianco a fianco.',
    section_analysis: 'Analisi Giornaliera',
    desc_analysis: 'Insights di mercato giornalieri per ES, NQ, GC e CL. Gratuito per tutti.',
    section_gex: 'GEX / Gamma Exposure',
    desc_gex: 'Livelli di gamma exposure aggiornati quotidianamente con zone chiave.',
    section_calendar: 'Calendario Economico',
    desc_calendar: 'Eventi ad alto impatto con orari e aspettative del mercato.',
    section_blog: 'Blog & Guide',
    desc_blog: 'Articoli educativi e guide complete sul prop trading.',
    section_calc: 'Calcolatore Position Size',
    desc_calc: 'Calcola la dimensione ideale della tua posizione in base al rischio.',
    section_quiz: 'Quiz Prop Firms',
    desc_quiz: 'Scopri quale prop firm si adatta al tuo profilo di trader.',
    section_loyalty: 'Programma Fedelta',
    desc_loyalty: 'Guadagna punti ad ogni acquisto e riscatta vantaggi esclusivi.',
    cta: 'Esplora MarketsCoupons',
    footer: 'Hai ricevuto questa email perche sei iscritto a MarketsCoupons.',
    unsub: 'Annulla iscrizione',
    tagline: 'Le migliori offerte per trader',
  },
  ar: {
    subject: 'MarketsCoupons مرحبا بك في',
    greeting: '{nome} مرحبا',
    welcome_title: 'MarketsCoupons مرحبا بك في',
    welcome_text: 'الان لديك وصول لافضل العروض والادوات للمتداولين. اليك كل ما اعددناه لك:',
    section_coupons: 'كوبونات حصرية',
    desc_coupons: 'خصم يصل الى 90% على شركات تداول مختارة. كوبونات محدثة يوميا.',
    section_compare: 'مقارنة الشركات',
    desc_compare: 'قارن الاسعار والشروط والسحب وتقسيم الارباح والمزيد — جنبا الى جنب.',
    section_analysis: 'تحليل يومي',
    desc_analysis: '.رؤى سوقية يومية. مجاني للجميع',
    section_gex: 'GEX / Gamma Exposure',
    desc_gex: 'مستويات gamma exposure محدثة يوميا مع مناطق رئيسية.',
    section_calendar: 'التقويم الاقتصادي',
    desc_calendar: 'احداث عالية التاثير مع المواعيد وتوقعات السوق.',
    section_blog: 'مدونة وادلة',
    desc_blog: 'مقالات تعليمية وادلة كاملة حول prop trading.',
    section_calc: 'حاسبة حجم المركز',
    desc_calc: 'احسب الحجم المثالي لمركزك بناء على مخاطرك.',
    section_quiz: 'اختبار Prop Firms',
    desc_quiz: 'اكتشف اي prop firm تناسب ملفك كمتداول.',
    section_loyalty: 'برنامج الولاء',
    desc_loyalty: 'اكسب نقاط مع كل عملية شراء واستبدلها بمزايا حصرية.',
    cta: 'MarketsCoupons استكشف',
    footer: '.MarketsCoupons تلقيت هذا البريد لانك مشترك في',
    unsub: 'الغاء الاشتراك',
    tagline: 'افضل العروض للمتداولين',
  },
};

function wt(lang, key) {
  return (WELCOME_I18N[lang] || WELCOME_I18N.en)[key] || WELCOME_I18N.en[key] || key;
}

function featureCard(icon, title, desc) {
  return `
    <div style="display:flex;align-items:flex-start;background:#10151F;border:1px solid #1C2535;border-radius:10px;padding:16px;margin-bottom:8px;">
      <div style="width:40px;height:40px;min-width:40px;background:#0B0F16;border:1px solid #1C2535;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-right:14px;">
        <span style="font-size:18px;">${icon}</span>
      </div>
      <div>
        <div style="color:#EDF2F7;font-size:15px;font-weight:700;margin-bottom:4px;">${title}</div>
        <div style="color:#7A8FA6;font-size:13px;line-height:1.5;">${desc}</div>
      </div>
    </div>`;
}

function buildWelcomeEmail(lang, firms) {
  const t = (key) => wt(lang, key);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Top 3 firms mini-cards
  const firmCards = firms.slice(0, 3).map(f => `
    <div style="display:flex;align-items:center;background:#0B0F16;border:1px solid #1C2535;border-radius:10px;padding:12px 14px;margin-bottom:6px;">
      ${f.icon_url ? `<img src="https://www.marketscoupons.com/${f.icon_url}" width="32" height="32" style="width:32px;height:32px;border-radius:6px;margin-right:10px;object-fit:contain;background:${(f.color || '#F0B429')}22;">` : `<div style="width:32px;height:32px;border-radius:6px;background:${(f.color || '#F0B429')}22;display:flex;align-items:center;justify-content:center;margin-right:10px;font-size:14px;font-weight:900;color:${f.color || '#F0B429'}">${f.name[0]}</div>`}
      <div style="flex:1;">
        <div style="color:#EDF2F7;font-size:14px;font-weight:700;">${f.name}</div>
        <div style="color:#7A8FA6;font-size:11px;">${f.type}${f.coupon ? ' · Coupon: ' + f.coupon : ''}</div>
      </div>
      <div style="text-align:center;margin-left:10px;">
        <div style="color:#22C55E;font-size:18px;font-weight:900;">${f.discount}%</div>
        <div style="color:#3D4F63;font-size:9px;font-weight:700;">OFF</div>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07090D;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#07090D;">

  <!-- Gold gradient top bar -->
  <div style="height:4px;background:linear-gradient(90deg,#F0B429,#22C55E,#F0B429);"></div>

  <!-- Header -->
  <div style="text-align:center;padding:32px 24px 16px;">
    <div style="font-size:28px;font-weight:900;">
      <span style="color:#EDF2F7;">Markets</span><span style="color:#F0B429;">Coupons</span>
      <span style="display:inline-block;width:8px;height:8px;background:#22C55E;border-radius:50%;margin-left:4px;vertical-align:middle;"></span>
    </div>
    <div style="color:#3D4F63;font-size:10px;font-weight:700;letter-spacing:3px;margin-top:6px;">${t('tagline').toUpperCase()}</div>
  </div>

  <div style="padding:0 24px 32px;">
    <!-- Greeting -->
    <div style="font-size:16px;color:#EDF2F7;font-weight:600;margin-bottom:6px;">${t('greeting')}</div>
    <div style="color:#7A8FA6;font-size:14px;line-height:1.7;margin-bottom:24px;">${t('welcome_text')}</div>

    <!-- Stats row -->
    <div style="display:flex;gap:8px;margin-bottom:24px;">
      <div style="flex:1;background:#0B0F16;border:1px solid #1C2535;border-radius:10px;padding:14px 12px;text-align:center;">
        <div style="color:#F0B429;font-size:24px;font-weight:900;">90%</div>
        <div style="color:#3D4F63;font-size:9px;font-weight:700;letter-spacing:1px;margin-top:4px;">MAX DISCOUNT</div>
      </div>
      <div style="flex:1;background:#0B0F16;border:1px solid #1C2535;border-radius:10px;padding:14px 12px;text-align:center;">
        <div style="color:#22C55E;font-size:24px;font-weight:900;">11+</div>
        <div style="color:#3D4F63;font-size:9px;font-weight:700;letter-spacing:1px;margin-top:4px;">PROP FIRMS</div>
      </div>
      <div style="flex:1;background:#0B0F16;border:1px solid #1C2535;border-radius:10px;padding:14px 12px;text-align:center;">
        <div style="color:#EDF2F7;font-size:24px;font-weight:900;">FREE</div>
        <div style="color:#3D4F63;font-size:9px;font-weight:700;letter-spacing:1px;margin-top:4px;">DAILY ANALYSIS</div>
      </div>
    </div>

    <!-- Top deals -->
    <div style="color:#3D4F63;font-size:10px;font-weight:700;letter-spacing:2px;margin-bottom:10px;">TOP DEALS</div>
    ${firmCards}

    <!-- Divider -->
    <div style="height:1px;background:#1C2535;margin:24px 0;"></div>

    <!-- Features section -->
    <div style="color:#3D4F63;font-size:10px;font-weight:700;letter-spacing:2px;margin-bottom:12px;">FEATURES</div>

    ${featureCard('&#128176;', t('section_coupons'), t('desc_coupons'))}
    ${featureCard('&#128200;', t('section_compare'), t('desc_compare'))}
    ${featureCard('&#128202;', t('section_analysis'), t('desc_analysis'))}
    ${featureCard('&#127919;', t('section_gex'), t('desc_gex'))}
    ${featureCard('&#128197;', t('section_calendar'), t('desc_calendar'))}
    ${featureCard('&#128221;', t('section_blog'), t('desc_blog'))}
    ${featureCard('&#129518;', t('section_calc'), t('desc_calc'))}
    ${featureCard('&#127942;', t('section_quiz'), t('desc_quiz'))}
    ${featureCard('&#11088;', t('section_loyalty'), t('desc_loyalty'))}

    <!-- CTA -->
    <a href="https://www.marketscoupons.com" style="display:block;text-align:center;background:linear-gradient(135deg,#F0B429,#D4991A);color:#07090D;padding:16px;border-radius:10px;font-weight:800;font-size:16px;text-decoration:none;margin-top:20px;letter-spacing:0.5px;">${t('cta')} &rarr;</a>
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
  // CORS
  const origin = req.headers.origin || '';
  const allowed = ['https://www.marketscoupons.com', 'https://marketscoupons.com', 'https://marketscoupons.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', allowed.includes(origin) ? origin : allowed[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) return res.status(500).json({ error: 'BREVO_API_KEY not configured' });

  const { email, name, lang } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const useLang = lang || 'en';

  try {
    // Fetch top 3 firms for the email
    const firmsResp = await fetch(`${SUPABASE_URL}/rest/v1/cms_firms?active=eq.true&discount=gt.0&order=discount.desc&limit=3&select=id,name,icon_url,color,discount,coupon,type`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const firms = await firmsResp.json();

    const htmlContent = buildWelcomeEmail(useLang, Array.isArray(firms) ? firms : [])
      .replace(/{nome}/g, name || 'Trader');

    const subject = wt(useLang, 'subject');

    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'Markets Coupons', email: 'offers@marketscoupons.com' },
        to: [{ email, name: name || 'Trader' }],
        subject,
        htmlContent,
        tags: ['welcome', 'lang-' + useLang],
      }),
    });

    const data = await resp.json();

    // Log
    await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        campaign_name: 'Welcome Email',
        subject,
        recipients: 1,
        status: resp.ok ? 'sent' : 'failed',
        sent_by: 'webhook',
        provider: 'brevo',
      }),
    });

    return res.status(resp.ok ? 200 : 500).json({
      success: resp.ok,
      email,
      lang: useLang,
      response: data,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
