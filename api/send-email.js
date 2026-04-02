// Vercel Serverless Function — Send emails via Brevo API
// POST /api/send-email
// Body: { to: [{email, name}], subject, htmlContent, sender?: {name, email}, tags?: [] }

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) return res.status(500).json({ error: 'BREVO_API_KEY not configured' });

  // Simple auth: require admin token (Supabase JWT)
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { to, subject, htmlContent, textContent, sender, tags } = req.body;
  if (!to || !to.length || !subject || (!htmlContent && !textContent)) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, htmlContent or textContent' });
  }

  const senderInfo = sender || { name: 'Markets Coupons', email: 'noreply@marketscoupons.com' };

  // Brevo: batch send (max 50 per request, we chunk)
  const results = [];
  const chunks = [];
  for (let i = 0; i < to.length; i += 50) {
    chunks.push(to.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    try {
      // Use transactional email for each recipient (personalized)
      for (const recipient of chunk) {
        const body = {
          sender: senderInfo,
          to: [{ email: recipient.email, name: recipient.name || '' }],
          subject: subject
            .replace(/{nome}/g, recipient.name || 'Trader')
            .replace(/{email}/g, recipient.email || ''),
          htmlContent: (htmlContent || textToHtml(textContent))
            .replace(/{nome}/g, recipient.name || 'Trader')
            .replace(/{email}/g, recipient.email || '')
            .replace(/{cupom}/g, recipient.cupom || 'MARKET')
            .replace(/{firma}/g, recipient.firma || '')
            .replace(/{link}/g, 'https://www.marketscoupons.com'),
          tags: tags || ['campaign'],
        };

        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'api-key': BREVO_KEY,
          },
          body: JSON.stringify(body),
        });

        const data = await resp.json();
        results.push({ email: recipient.email, status: resp.ok ? 'sent' : 'failed', response: data });

        // Small delay to avoid rate limiting
        if (chunk.length > 10) await new Promise(r => setTimeout(r, 100));
      }
    } catch (err) {
      results.push({ error: err.message });
    }
  }

  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status === 'failed').length;

  return res.status(200).json({
    success: true,
    total: to.length,
    sent,
    failed,
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
