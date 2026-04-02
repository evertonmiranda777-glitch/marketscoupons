// Vercel Cron — Auto-send promo emails every 3 days
// Triggered by Vercel Cron (vercel.json)
// GET /api/cron-promo?key=CRON_SECRET

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzOTAzMjQsImV4cCI6MjA1ODk2NjMyNH0.is5j8TUJMQ4B6OeLmvJGJnCycnbWbY3WqjJCmS84gFI';

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
    // 1. Get active subscribers
    const subResp = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?status=eq.active&select=email,name`, {
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

    // 3. Build promo email HTML
    const promoCards = firms.map(f => `
      <div style="background:#10151F;border:1px solid #1C2535;border-radius:12px;padding:20px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="color:#EDF2F7;font-size:16px;">${f.name}</strong>
          <span style="color:#22C55E;font-size:20px;font-weight:800;">${f.discount}% OFF</span>
        </div>
        <div style="color:#7A8FA6;font-size:13px;margin-bottom:12px;">${f.description || ''}</div>
        ${f.coupon ? `<div style="background:#0B0F16;border:1px dashed #F0B429;border-radius:8px;padding:10px 16px;text-align:center;">
          <div style="color:#7A8FA6;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Cupom exclusivo</div>
          <div style="color:#F0B429;font-size:18px;font-weight:800;letter-spacing:2px;margin-top:4px;">${f.coupon}</div>
        </div>` : `<div style="color:#22C55E;font-size:13px;">✓ Desconto aplicado pelo link</div>`}
        <a href="${f.link}" style="display:block;text-align:center;background:#F0B429;color:#07090D;padding:12px;border-radius:8px;font-weight:700;text-decoration:none;margin-top:12px;">Ver planos →</a>
      </div>
    `).join('');

    const htmlContent = `
      <div style="max-width:600px;margin:0 auto;background:#07090D;padding:32px 24px;font-family:Inter,Arial,sans-serif;color:#EDF2F7;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:22px;font-weight:800;">Markets<span style="color:#F0B429;">Coupons</span></div>
          <div style="color:#7A8FA6;font-size:13px;margin-top:4px;">As melhores promoções para traders</div>
        </div>
        <div style="font-size:15px;margin-bottom:20px;">Ola {nome},</div>
        <div style="color:#7A8FA6;font-size:14px;margin-bottom:20px;line-height:1.6;">
          Confira as melhores promoções ativas para prop firms! Aproveite antes que acabem.
        </div>
        ${promoCards}
        <div style="text-align:center;margin-top:24px;">
          <a href="https://www.marketscoupons.com" style="color:#F0B429;font-size:13px;">Ver todas as ofertas no site →</a>
        </div>
        <hr style="border-color:#1C2535;margin:24px 0;">
        <div style="text-align:center;color:#3D4F63;font-size:11px;">
          Voce recebeu este email por estar inscrito no Markets Coupons.<br>
          <a href="https://www.marketscoupons.com" style="color:#3D4F63;">Cancelar inscricao</a>
        </div>
      </div>
    `;

    // 4. Send to each subscriber via Brevo
    let sent = 0, failed = 0;
    for (const sub of subscribers) {
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
            subject: `🔥 ${firms[0].name} com ${firms[0].discount}% OFF + mais ofertas!`,
            htmlContent: htmlContent.replace(/{nome}/g, sub.name || 'Trader'),
            tags: ['promo-auto'],
          }),
        });
        if (resp.ok) sent++; else failed++;
      } catch { failed++; }

      // Rate limit
      await new Promise(r => setTimeout(r, 150));
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
        subject: `${firms[0].name} com ${firms[0].discount}% OFF + mais ofertas`,
        recipients: subscribers.length,
        status: failed === 0 ? 'sent' : (sent === 0 ? 'failed' : 'partial'),
        sent_by: 'cron',
        provider: 'brevo',
      }),
    });

    return res.status(200).json({ success: true, sent, failed, total: subscribers.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
