// Vercel Serverless — Public email validation (MX check)
// POST /api/validate-email
// Body: { email: "user@example.com" }
// Returns: { valid: true/false, reason: "..." }

const dns = require('dns');
const { promisify } = require('util');
const { applyCors } = require('./_cors.js');
const { rateLimitIp } = require('./_ratelimit.js');
const resolveMx = promisify(dns.resolveMx);

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
  if (applyCors(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!rateLimitIp(req, 30)) return res.status(429).json({ valid: false, reason: 'rate_limit' });

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
