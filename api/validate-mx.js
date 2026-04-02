// Vercel Serverless — Bulk MX record validation
// POST /api/validate-mx
// Body: { domains: ["gmail.com", "hotmail.com", ...] }
// Returns: { results: { "gmail.com": true, "fakeemail.xyz": false, ... } }

const dns = require('dns');
const { promisify } = require('util');
const resolveMx = promisify(dns.resolveMx);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { domains } = req.body;
  if (!domains || !Array.isArray(domains)) {
    return res.status(400).json({ error: 'Missing domains array' });
  }

  // Limit to 500 domains per request
  const batch = domains.slice(0, 500);
  const results = {};

  await Promise.all(batch.map(async (domain) => {
    try {
      const records = await resolveMx(domain);
      results[domain] = records && records.length > 0;
    } catch {
      results[domain] = false;
    }
  }));

  return res.status(200).json({ results, checked: Object.keys(results).length });
};
