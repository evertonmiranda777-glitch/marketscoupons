// Vercel Serverless Function — Send emails via Brevo + Resend (round-robin fallback)
// POST /api/send-email
// Body: { to: [{email, name}], subject, htmlContent, sender?: {name, email}, tags?: [], provider?: 'brevo'|'resend'|'auto' }

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const ALLOWED_ORIGINS = [
  'https://www.marketscoupons.com',
  'https://marketscoupons.com',
  'https://marketscoupons.vercel.app',
];

function getCorsOrigin(req) {
  const origin = req.headers.origin || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

// Validate JWT with Supabase and check admin role
async function validateAdmin(jwt) {
  if (!jwt || jwt.length < 50) return null;
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_KEY }
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    if (!user?.id) return null;

    // Check admin status in profiles table
    const profileResp = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&is_admin=eq.true&select=id`,
      { headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_KEY } }
    );
    if (!profileResp.ok) return null;
    const profiles = await profileResp.json();
    return (profiles && profiles.length > 0) ? user : null;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  // CORS — restricted to our domains
  const corsOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  // Auth: validate JWT and verify admin role
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const admin = await validateAdmin(auth);
  if (!admin) return res.status(403).json({ error: 'Forbidden: admin access required' });

  // Input validation
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 512000) return res.status(413).json({ error: 'Payload too large (max 500KB)' });

  const { to, subject, htmlContent, textContent, sender, tags, provider } = req.body;
  if (!to || !to.length || !subject || (!htmlContent && !textContent)) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, htmlContent or textContent' });
  }

  // Limit recipients per request
  if (to.length > 200) {
    return res.status(400).json({ error: 'Too many recipients (max 200 per request)' });
  }

  // Validate email format (basic)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = to.filter(r => !emailRe.test(r.email));
  if (invalidEmails.length > 0) {
    return res.status(400).json({ error: `Invalid email(s): ${invalidEmails.map(r => r.email).join(', ').slice(0, 200)}` });
  }

  const senderInfo = sender || { name: 'Lara | MarketsCoupons', email: 'lara@marketscoupons.com' };

  // Send via Brevo
  async function sendViaBrevo(recipient, finalSubject, finalHtml) {
    if (!BREVO_KEY) return { email: recipient.email, status: 'skipped', provider: 'brevo', response: { error: 'no key' } };
    const body = {
      sender: senderInfo,
      to: [{ email: recipient.email, name: recipient.name || 'Trader' }],
      subject: finalSubject,
      htmlContent: finalHtml,
      tags: tags || ['campaign'],
    };
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_KEY },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    console.log(`[BREVO] ${recipient.email} → ${resp.status}`);
    return { email: recipient.email, status: resp.ok ? 'sent' : 'failed', provider: 'brevo', response: data };
  }

  // Send via Resend
  async function sendViaResend(recipient, finalSubject, finalHtml) {
    if (!RESEND_KEY) return { email: recipient.email, status: 'skipped', provider: 'resend', response: { error: 'no key' } };
    const body = {
      from: `${senderInfo.name} <${senderInfo.email}>`,
      to: [recipient.email],
      subject: finalSubject,
      html: finalHtml,
      tags: (tags || ['campaign']).map(t => ({ name: 'tag', value: t })),
    };
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    console.log(`[RESEND] ${recipient.email} → ${resp.status}`);
    return { email: recipient.email, status: resp.ok ? 'sent' : 'failed', provider: 'resend', response: data };
  }

  // Determine provider: 'brevo', 'resend', or 'auto' (brevo first, fallback to resend)
  const useProvider = provider || 'auto';

  const results = [];
  for (const recipient of to) {
    const finalSubject = subject
      .replace(/{nome}/g, recipient.name || 'Trader')
      .replace(/{email}/g, recipient.email || '');
    const finalHtml = (htmlContent || textToHtml(textContent))
      .replace(/{nome}/g, recipient.name || 'Trader')
      .replace(/{email}/g, recipient.email || '')
      .replace(/{cupom}/g, recipient.cupom || 'MARKET')
      .replace(/{firma}/g, recipient.firma || '')
      .replace(/{link}/g, 'https://www.marketscoupons.com');

    let result;
    try {
      if (useProvider === 'resend') {
        result = await sendViaResend(recipient, finalSubject, finalHtml);
      } else if (useProvider === 'brevo') {
        result = await sendViaBrevo(recipient, finalSubject, finalHtml);
      } else {
        // Auto: try Brevo first, fallback to Resend on failure
        result = await sendViaBrevo(recipient, finalSubject, finalHtml);
        if (result.status === 'failed' && RESEND_KEY) {
          console.log(`[AUTO] Brevo failed for ${recipient.email}, trying Resend...`);
          result = await sendViaResend(recipient, finalSubject, finalHtml);
        }
      }
    } catch (err) {
      result = { email: recipient.email, status: 'failed', error: err.message };
    }
    results.push(result);

    // Small delay to avoid rate limiting
    if (to.length > 10) await new Promise(r => setTimeout(r, 100));
  }

  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const providers = { brevo: results.filter(r => r.provider === 'brevo' && r.status === 'sent').length, resend: results.filter(r => r.provider === 'resend' && r.status === 'sent').length };

  return res.status(200).json({
    success: true,
    total: to.length,
    sent,
    failed,
    providers,
    results,
  });
};

function textToHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}
