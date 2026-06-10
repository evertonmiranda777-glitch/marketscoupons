// /api/leads/volumefilter
// Captura email → salva no email_subscribers → dispara email com link do .zip.
// Lead magnet: indicador VolumeFilter NinjaTrader 8.
//
// POST { email, utm_source?, utm_campaign? }
// → { ok:true, sent:true } | { ok:false, error }

const { applyCors } = require('../_cors.js');
const { rateLimitIp } = require('../_ratelimit.js');
const { safeError } = require('../_safe-error.js');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = 'https://www.marketscoupons.com';
const DOWNLOAD_URL = `${APP_URL}/downloads/MarketsCoupons-VolumeFilter-v1.0.zip`;

function isValidEmail(s) {
  if (!s || typeof s !== 'string' || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function buildEmailHtml(email) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>VolumeFilter, Markets Coupons</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Inter',Helvetica,Arial,sans-serif;color:#0a0d14;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f6f8;padding:24px 0;"><tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.08);">
    <tr><td style="background:#0a0d14;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.3px;">Markets <span style="color:#ff8c00;">Coupons</span></div>
    </td></tr>
    <tr><td style="padding:36px 36px 12px;">
      <div style="display:inline-block;background:#e6f7f1;color:#10b981;padding:5px 11px;border-radius:9px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:14px;">VOLUMEFILTER PRONTO</div>
      <h1 style="margin:6px 0 14px;font-size:26px;line-height:1.25;font-weight:800;color:#0a0d14;">Aqui está o seu indicador, Trader</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">Você cadastrou o email <strong>${email}</strong> pra receber o VolumeFilter. Baixe o arquivo <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px;">.zip</code> abaixo e siga as instruções no LEIA-ME.txt, instalação leva 2 cliques no NinjaTrader 8.</p>
    </td></tr>
    <tr><td style="padding:0 36px;text-align:center;">
      <a href="${DOWNLOAD_URL}" style="display:inline-block;padding:16px 42px;background:#10b981;color:#fff;font-size:16px;font-weight:800;text-decoration:none;border-radius:10px;letter-spacing:.2px;box-shadow:0 4px 14px rgba(16,185,129,.35);">⬇ Baixar VolumeFilter (.zip)</a>
      <p style="margin:12px 0 0;font-size:12px;color:#6b7480;">2.5 KB · NinjaTrader 8 · validade até 31/12/2026</p>
    </td></tr>
    <tr><td style="padding:30px 36px 18px;">
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;background:#fafafa;">
        <div style="font-size:13px;font-weight:700;color:#0a0d14;margin-bottom:8px;">⚡ Instalação rápida (2 cliques)</div>
        <ol style="margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.7;color:#374151;">
          <li>Abra o NinjaTrader 8</li>
          <li><strong>Tools → Import → NinjaScript Add-On</strong></li>
          <li>Selecione o arquivo <code style="background:#fff;padding:1px 5px;border:1px solid #e5e7eb;border-radius:3px;font-size:12px;">MarketsCoupons-VolumeFilter-v1.0.zip</code></li>
          <li>Confirme. Pronto. Abra um gráfico → <strong>Ctrl+I</strong> → procure <strong>"VolumeFilter"</strong> → Add</li>
        </ol>
      </div>
    </td></tr>
    <tr><td style="padding:18px 36px 8px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7480;">Travou? Manda mensagem na comunidade <a href="https://t.me/marketcouponss" style="color:#0a74da;text-decoration:underline;">t.me/marketcouponss</a>, tem trader online sempre.</p>
    </td></tr>
    <tr><td style="padding:24px 36px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;padding-right:14px;"><div style="width:42px;height:42px;border-radius:50%;background:#ff8c00;text-align:center;line-height:42px;font-size:16px;font-weight:800;color:#fff;">L</div></td>
      <td style="vertical-align:middle;"><div style="font-size:14px;font-weight:700;color:#0a0d14;">Lara</div><div style="font-size:12px;color:#6b7480;">Markets Coupons</div></td>
    </tr></table></td></tr>
    <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;line-height:1.6;">Você está recebendo este email porque pediu o VolumeFilter em marketscoupons.com.<br>Markets Coupons é plataforma educacional/afiliada, não somos broker, FCM ou consultor registrado.</p>
      <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} Markets Coupons</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

module.exports = async (req, res) => {
  if (applyCors(req, res, { methods: 'POST, OPTIONS' })) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  if (!rateLimitIp(req, 6)) return res.status(429).json({ ok: false, error: 'rate_limit' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const email = String(body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: 'invalid_email' });

  const utm_source = String(body.utm_source || 'volumefilter-landing').slice(0, 80);
  const utm_campaign = String(body.utm_campaign || 'volumefilter-lead').slice(0, 80);
  const lang = ['pt','en','es','it','fr','de','ar','id'].includes(body.lang) ? body.lang : 'pt';

  try {
    // 1) Upsert em email_subscribers
    const upsertHeaders = {
      'Content-Type': 'application/json',
      'apikey': SK || SUPABASE_KEY,
      'Authorization': `Bearer ${SK || SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=representation',
    };
    const upsertBody = {
      email,
      lang,
      source: utm_source,
      tags: ['volumefilter-lead', utm_campaign, `lang-${lang}`],
    };
    const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?on_conflict=email`, {
      method: 'POST',
      headers: upsertHeaders,
      body: JSON.stringify(upsertBody),
    });
    if (!upsertResp.ok && upsertResp.status !== 409) {
      const errTxt = await upsertResp.text();
      console.error('[volumefilter] supabase upsert failed', upsertResp.status, errTxt);
      // não aborta, segue pro envio do email mesmo assim
    }

    // 2) Send email via Brevo (fallback Resend)
    const BREVO_KEY = process.env.BREVO_API_KEY;
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const subject = 'Seu VolumeFilter chegou, Markets Coupons';
    const htmlContent = buildEmailHtml(email);

    let sent = false;
    let provider = null;
    let lastErr = null;

    if (BREVO_KEY) {
      try {
        const r = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_KEY },
          body: JSON.stringify({
            sender: { name: 'Lara | Markets Coupons', email: 'lara@marketscoupons.com' },
            to: [{ email, name: 'Trader' }],
            subject, htmlContent,
            tags: ['volumefilter-lead'],
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok) { sent = true; provider = 'brevo'; }
        else lastErr = { provider: 'brevo', status: r.status, data: d };
      } catch (e) { lastErr = { provider: 'brevo', error: String(e) }; }
    }

    if (!sent && RESEND_KEY) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from: 'Lara | Markets Coupons <lara@marketscoupons.com>',
            to: [email], subject, html: htmlContent,
            tags: [{ name: 'type', value: 'volumefilter-lead' }],
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok) { sent = true; provider = 'resend'; }
        else lastErr = { provider: 'resend', status: r.status, data: d };
      } catch (e) { lastErr = { provider: 'resend', error: String(e) }; }
    }

    if (!sent) {
      console.error('[volumefilter] email send failed', lastErr);
      return res.status(502).json({ ok: false, error: 'email_send_failed', details: lastErr });
    }

    return res.status(200).json({ ok: true, sent: true, provider });
  } catch (e) {
    return safeError(res, 500, 'lead_save_failed', e);
  }
};
