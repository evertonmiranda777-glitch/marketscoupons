// Pixel-perfect creative renderer via htmlcsstoimage.com API.
// Receives the fully-serialized #cr-canvas HTML + all admin <style> blocks,
// posts to HCTI, fetches the resulting PNG, returns binary to the browser.
// Supports backdrop-filter, background-clip:text, web fonts natively.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const { html, styles, width, height, origin } = req.body || {};
    if (!html || !width || !height) {
      return res.status(400).json({ error: 'missing html/width/height' });
    }

    const base = (origin || 'https://www.marketscoupons.com/').replace(/\/$/, '') + '/';
    const absolutize = (s) => (s || '')
      .replace(/url\((['"]?)(?!https?:|data:|\/\/|#)([^'")]+)\1\)/g, (_m, q, p) => `url(${q}${base}${p.replace(/^\/+/, '')}${q})`)
      .replace(/(src|href)=(['"])(?!https?:|data:|\/\/|#|mailto:)([^'"]+)\2/g, (_m, attr, q, p) => `${attr}=${q}${base}${p.replace(/^\/+/, '')}${q}`);

    const absHtml = absolutize(html);
    const absStyles = absolutize(styles);

    const userId = process.env.HCTI_USER_ID;
    const apiKey = process.env.HCTI_API_KEY;
    if (!userId || !apiKey) {
      return res.status(500).json({ error: 'HCTI credentials not configured' });
    }

    const baseCss = `
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#060810;font-family:'Inter',sans-serif;}
body{width:${width}px;height:${height}px;overflow:hidden;}
#cr-canvas{margin:0 !important;}
`;

    const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');
    const hctiResp = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: absHtml,
        css: baseCss + '\n' + (absStyles || ''),
        google_fonts: 'Inter:400,500,600,700,800,900',
        viewport_width: width,
        viewport_height: height,
        device_scale: 1,
        ms_delay: 600,
      }),
    });

    if (!hctiResp.ok) {
      const errText = await hctiResp.text();
      console.error('[render-criativo] HCTI error', hctiResp.status, errText);
      return res.status(502).json({ error: `HCTI ${hctiResp.status}: ${errText.slice(0, 200)}` });
    }

    const { url } = await hctiResp.json();
    if (!url) return res.status(502).json({ error: 'HCTI returned no url' });

    const imgResp = await fetch(url);
    if (!imgResp.ok) {
      return res.status(502).json({ error: `image fetch ${imgResp.status}` });
    }
    const buf = Buffer.from(await imgResp.arrayBuffer());

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (e) {
    console.error('[render-criativo]', e);
    return res.status(500).json({ error: e.message || 'render failed' });
  }
};
