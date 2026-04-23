// One-click unsubscribe endpoint.
// - GET  /api/unsubscribe?e=<email>&t=<hmac>   → renders a simple confirmation page
// - POST /api/unsubscribe (form body List-Unsubscribe=One-Click) → Gmail/Apple one-click
// Token = base64url(HMAC-SHA256(email, UNSUBSCRIBE_SECRET)).
// Flips email_subscribers.status='unsubscribed' + unsubscribed_at=now().

const crypto = require('crypto');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';

function b64url(buf){ return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }

function sign(email){
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET missing');
  const h = crypto.createHmac('sha256', secret).update(String(email).toLowerCase().trim()).digest();
  return b64url(h);
}

function verify(email, token){
  try {
    const expected = sign(email);
    const a = Buffer.from(expected);
    const b = Buffer.from(String(token||''));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

async function flipUnsubscribed(email){
  const url = `${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }),
  });
  return r.ok;
}

const MSG = {
  pt: { title:'Cancelado', ok:'Você foi descadastrado.', body:'Não vamos mais enviar emails pra você. Se mudar de ideia, é só cadastrar de novo em marketscoupons.com.', bad:'Link inválido ou expirado.', again:'Voltar ao site' },
  en: { title:'Unsubscribed', ok:'You\'ve been unsubscribed.', body:'We won\'t send emails to you anymore. Changed your mind? Sign up again at marketscoupons.com.', bad:'Invalid or expired link.', again:'Back to site' },
  es: { title:'Cancelado', ok:'Te diste de baja.', body:'No te enviaremos más emails. ¿Cambiaste de idea? Regístrate de nuevo en marketscoupons.com.', bad:'Enlace inválido o expirado.', again:'Volver al sitio' },
};

function htmlPage(lang, kind){
  const L = MSG[lang] || MSG.en;
  const ok = kind === 'ok';
  const headline = ok ? L.ok : L.bad;
  const body = ok ? L.body : '';
  return `<!DOCTYPE html><html lang="${lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${L.title} — Markets Coupons</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;background:#07090D;color:#EDF2F7;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{max-width:480px;width:100%;background:#0D131C;border:1px solid #1C2535;border-radius:16px;padding:40px 32px;text-align:center}
.logo{font-size:18px;font-weight:900;margin-bottom:32px}
.logo span.c{color:#F0B429}
h1{font-size:26px;margin:0 0 16px;font-weight:800}
p{color:#9CA3AF;line-height:1.6;font-size:15px;margin:0 0 28px}
a.btn{display:inline-block;background:#F0B429;color:#07090D;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px}
</style></head>
<body><div class="card">
<div class="logo">Markets<span class="c">Coupons</span></div>
<h1>${headline}</h1>
${body ? `<p>${body}</p>` : ''}
<a class="btn" href="https://www.marketscoupons.com/">${L.again}</a>
</div></body></html>`;
}

module.exports = async (req, res) => {
  const method = req.method;
  if (method !== 'GET' && method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Gather params from query (GET) or form/body (POST).
  let email, token, lang;
  if (method === 'GET') {
    email = req.query.e || req.query.email || '';
    token = req.query.t || req.query.token || '';
    lang  = req.query.lang || 'en';
  } else {
    const b = req.body || {};
    email = b.e || b.email || req.query?.e || '';
    token = b.t || b.token || req.query?.t || '';
    lang  = b.lang || req.query?.lang || 'en';
  }

  email = String(email||'').toLowerCase().trim();
  const valid = email && verify(email, token);

  if (method === 'POST') {
    // Gmail one-click expects 200 on success.
    if (!valid) return res.status(400).json({ error: 'invalid token' });
    await flipUnsubscribed(email);
    return res.status(200).json({ ok: true });
  }

  // GET → render page.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!valid) return res.status(400).send(htmlPage(lang, 'bad'));
  await flipUnsubscribed(email);
  return res.status(200).send(htmlPage(lang, 'ok'));
};

module.exports.sign = sign;
