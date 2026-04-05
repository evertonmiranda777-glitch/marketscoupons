// Vercel Serverless — Public email validation (MX check)
// POST /api/validate-email
// Body: { email: "user@example.com" }
// Returns: { valid: true/false, reason: "..." }

const dns = require('dns');
const { promisify } = require('util');
const resolveMx = promisify(dns.resolveMx);

const ALLOWED_ORIGINS = [
  'https://www.marketscoupons.com',
  'https://marketscoupons.com',
  'https://marketscoupons.vercel.app',
];

function getCorsOrigin(req) {
  const origin = req.headers.origin || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

// Disposable/temporary email domains (common ones)
const DISPOSABLE = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email','yopmail.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info','guerrillamail.de',
  'tmail.ws','tmails.net','mohmal.com','fakeinbox.com','dispostable.com',
  'maildrop.cc','mailnesia.com','mailcatch.com','trashmail.com','trashmail.me',
  'harakirimail.com','tempinbox.com','getnada.com','emailondeck.com','33mail.com',
  'temp-mail.org','10minutemail.com','minutemail.com','emailfake.com','crazymailing.com',
]);

module.exports = async (req, res) => {
  const corsOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ valid: false, reason: 'missing_email' });
  }

  // Basic format check
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRe.test(email)) {
    return res.status(200).json({ valid: false, reason: 'invalid_format' });
  }

  const domain = email.split('@')[1].toLowerCase();

  // Check disposable
  if (DISPOSABLE.has(domain)) {
    return res.status(200).json({ valid: false, reason: 'disposable' });
  }

  // MX check
  const domainRe = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!domainRe.test(domain)) {
    return res.status(200).json({ valid: false, reason: 'invalid_domain' });
  }

  try {
    const records = await resolveMx(domain);
    if (!records || records.length === 0) {
      return res.status(200).json({ valid: false, reason: 'no_mx' });
    }
    return res.status(200).json({ valid: true });
  } catch {
    return res.status(200).json({ valid: false, reason: 'no_mx' });
  }
};
