// Vercel Serverless Function — Generate dark email image for prop firms
// GET /api/email-image?firm=e2t
// Returns a PNG image (1200x auto) that can be used in emails

const { ImageResponse } = require('@vercel/og');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

module.exports = async (req, res) => {
  const firmId = req.query.firm;
  if (!firmId) return res.status(400).json({ error: 'Missing ?firm= parameter' });

  // Fetch firm from Supabase
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/cms_firms?id=eq.${firmId}&select=*`,
    { headers: { 'apikey': SUPABASE_KEY, 'Accept': 'application/json' } }
  );
  const firms = await resp.json();
  const f = firms?.[0];
  if (!f) return res.status(404).json({ error: 'Firm not found' });

  const color = f.color || '#F0B429';
  const lt = f.discount_type === 'lifetime' ? ' Lifetime' : '';
  const prices = f.prices || [];
  const plats = f.platforms || [];
  const perks = f.perks || [];
  const tpScore = f.trustpilot_score || f.rating;
  const tpReviews = f.trustpilot_reviews || f.reviews;

  const image = new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '600px',
          backgroundColor: '#07090D',
          fontFamily: 'Inter, Arial, sans-serif',
          color: '#EDF2F7',
        },
        children: [
          // Accent bar top
          { type: 'div', props: { style: { height: '4px', backgroundColor: color, width: '100%' } } },

          // Header
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px 16px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center', gap: '6px' },
                    children: [
                      { type: 'span', props: { style: { fontSize: '22px', fontWeight: 800, color: '#EDF2F7', letterSpacing: '-0.5px' }, children: 'Markets ' } },
                      { type: 'span', props: { style: { fontSize: '22px', fontWeight: 800, color: '#F0B429', letterSpacing: '-0.5px' }, children: 'Coupons' } },
                      { type: 'span', props: { style: { width: '7px', height: '7px', backgroundColor: '#22C55E', borderRadius: '50%', marginLeft: '4px' } } },
                    ],
                  },
                },
                { type: 'div', props: { style: { fontSize: '10px', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3D4F63', marginTop: '5px' }, children: 'AS MELHORES OFERTAS PARA TRADERS' } },
              ],
            },
          },

          // Divider
          { type: 'div', props: { style: { height: '1px', backgroundColor: '#1C2535', margin: '0 32px' } } },

          // Hero
          {
            type: 'div',
            props: {
              style: { padding: '20px 24px 0', display: 'flex' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '12px', overflow: 'hidden' },
                    children: [
                      { type: 'div', props: { style: { height: '3px', backgroundColor: color, width: '100%' } } },
                      {
                        type: 'div',
                        props: {
                          style: { padding: '28px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
                          children: [
                            // Discount badge
                            {
                              type: 'div',
                              props: {
                                style: { backgroundColor: 'rgba(240,180,41,0.10)', border: '1px solid rgba(240,180,41,0.30)', borderRadius: '20px', padding: '6px 20px' },
                                children: { type: 'span', props: { style: { color: '#F0B429', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }, children: `${f.discount}% OFF${lt}` } },
                              },
                            },
                            // Firm name
                            { type: 'div', props: { style: { marginTop: '16px', fontSize: '28px', fontWeight: 900, color: '#EDF2F7', letterSpacing: '-0.8px' }, children: f.name } },
                            // Type badge
                            f.type ? {
                              type: 'div',
                              props: {
                                style: { marginTop: '8px', display: 'flex' },
                                children: { type: 'span', props: { style: { backgroundColor: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.20)', borderRadius: '6px', padding: '3px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#F0B429' }, children: f.type } },
                              },
                            } : null,
                            // Description
                            { type: 'div', props: { style: { marginTop: '12px', color: '#7A8FA6', fontSize: '13px', lineHeight: '1.6', maxWidth: '460px' }, children: f.description || '' } },
                            // Trustpilot
                            tpScore ? { type: 'div', props: { style: { marginTop: '10px', color: '#7A8FA6', fontSize: '11px' }, children: `★★★★★ ${tpScore}/5 · ${(tpReviews||0).toLocaleString()} reviews no Trustpilot` } } : null,
                          ].filter(Boolean),
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Greeting
          {
            type: 'div',
            props: {
              style: { padding: '24px 24px 0', display: 'flex', flexDirection: 'column' },
              children: [
                { type: 'div', props: { style: { color: '#EDF2F7', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }, children: 'Ola Trader,' } },
                { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '14px', lineHeight: '1.7' }, children: `A ${f.name} esta com ${f.discount}% de desconto${lt}. Veja todos os detalhes abaixo e comece agora mesmo.` } },
              ],
            },
          },

          // Coupon
          f.coupon ? {
            type: 'div',
            props: {
              style: { padding: '20px 24px 0', display: 'flex' },
              children: {
                type: 'div',
                props: {
                  style: { width: '100%', border: '2px dashed rgba(240,180,41,0.35)', borderRadius: '12px', padding: '24px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
                  children: [
                    { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: '10px' }, children: 'CUPOM EXCLUSIVO' } },
                    { type: 'div', props: { style: { color: '#F0B429', fontSize: '36px', fontWeight: 800, letterSpacing: '6px', fontFamily: 'Courier New, monospace' }, children: f.coupon } },
                    { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '11px', marginTop: '12px' }, children: 'Copie o cupom e cole no checkout' } },
                  ],
                },
              },
            },
          } : null,

          // Stats bar
          {
            type: 'div',
            props: {
              style: { padding: '20px 24px 0', display: 'flex' },
              children: {
                type: 'div',
                props: {
                  style: { width: '100%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '10px', display: 'flex', overflow: 'hidden' },
                  children: [
                    { type: 'div', props: { style: { flex: 1, textAlign: 'center', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [
                      { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }, children: 'Profit Split' } },
                      { type: 'div', props: { style: { color: '#22C55E', fontSize: '20px', fontWeight: 800, marginTop: '4px' }, children: f.split || '—' } },
                    ] } },
                    { type: 'div', props: { style: { flex: 1, textAlign: 'center', padding: '16px 8px', borderLeft: '1px solid #1C2535', borderRight: '1px solid #1C2535', display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [
                      { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }, children: 'Desconto' } },
                      { type: 'div', props: { style: { color: '#F0B429', fontSize: '20px', fontWeight: 800, marginTop: '4px' }, children: `${f.discount}%` } },
                    ] } },
                    { type: 'div', props: { style: { flex: 1, textAlign: 'center', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [
                      { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }, children: 'Drawdown' } },
                      { type: 'div', props: { style: { color: '#EDF2F7', fontSize: '20px', fontWeight: 800, marginTop: '4px' }, children: f.dd_pct || '—' } },
                    ] } },
                  ],
                },
              },
            },
          },

          // Platforms
          plats.length ? {
            type: 'div',
            props: {
              style: { padding: '16px 24px 0', display: 'flex', flexDirection: 'column' },
              children: [
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }, children: 'PLATAFORMAS' } },
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
                    children: plats.map(p => ({
                      type: 'span',
                      props: { style: { backgroundColor: '#07090D', border: `1px solid ${color}`, borderRadius: '6px', padding: '6px 14px', fontSize: '11px', fontWeight: 600, color: '#EDF2F7' }, children: p },
                    })),
                  },
                },
              ],
            },
          } : null,

          // Perks
          perks.length ? {
            type: 'div',
            props: {
              style: { padding: '16px 24px 0', display: 'flex', flexDirection: 'column' },
              children: [
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }, children: 'BENEFICIOS' } },
                ...perks.slice(0, 6).map(p => ({
                  type: 'div',
                  props: {
                    style: { padding: '3px 0', color: '#EDF2F7', fontSize: '12px', display: 'flex', gap: '6px' },
                    children: [
                      { type: 'span', props: { style: { color: '#22C55E' }, children: '✓' } },
                      { type: 'span', props: { children: p } },
                    ],
                  },
                })),
              ],
            },
          } : null,

          // Pricing table
          prices.length ? {
            type: 'div',
            props: {
              style: { padding: '20px 24px 0', display: 'flex' },
              children: {
                type: 'div',
                props: {
                  style: { width: '100%', backgroundColor: '#10151F', border: '1px solid #1C2535', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
                  children: [
                    // Header
                    {
                      type: 'div',
                      props: {
                        style: { padding: '12px 16px', borderBottom: '1px solid #1C2535', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                        children: [
                          { type: 'span', props: { style: { fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#3D4F63' }, children: 'CONTAS DISPONIVEIS' } },
                          { type: 'span', props: { style: { backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '4px', padding: '2px 8px', fontSize: '9px', fontWeight: 700, color: '#22C55E' }, children: `${f.discount}% OFF` } },
                        ],
                      },
                    },
                    // Rows
                    ...prices.map(r => ({
                      type: 'div',
                      props: {
                        style: { display: 'flex', padding: '8px 16px', borderTop: '1px solid #1C2535', alignItems: 'center' },
                        children: [
                          { type: 'div', props: { style: { flex: 2, color: '#EDF2F7', fontWeight: 700, fontSize: '13px' }, children: r.a } },
                          { type: 'div', props: { style: { flex: 1, textAlign: 'center', color: '#22C55E', fontWeight: 800, fontSize: '13px' }, children: r.n } },
                          { type: 'div', props: { style: { flex: 1, textAlign: 'center', color: '#3D4F63', fontSize: '11px', textDecoration: 'line-through' }, children: r.o || '' } },
                        ],
                      },
                    })),
                  ],
                },
              },
            },
          } : null,

          // CTA
          {
            type: 'div',
            props: {
              style: { padding: '24px 24px 0', display: 'flex', justifyContent: 'center' },
              children: {
                type: 'div',
                props: {
                  style: { backgroundColor: color, color: '#FFFFFF', padding: '16px 0', borderRadius: '8px', fontSize: '16px', fontWeight: 800, letterSpacing: '0.5px', width: '100%', maxWidth: '500px', textAlign: 'center' },
                  children: 'COMECAR AGORA →',
                },
              },
            },
          },

          // Footer
          {
            type: 'div',
            props: {
              style: { padding: '24px 32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
              children: [
                { type: 'div', props: { style: { borderTop: '1px solid #1C2535', width: '100%', paddingTop: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' } , children: [
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', gap: '0px' },
                      children: [
                        { type: 'span', props: { style: { fontSize: '13px', fontWeight: 800, color: '#EDF2F7' }, children: 'Markets' } },
                        { type: 'span', props: { style: { fontSize: '13px', fontWeight: 800, color: '#F0B429' }, children: 'Coupons' } },
                      ],
                    },
                  },
                  { type: 'div', props: { style: { color: '#3D4F63', fontSize: '10px', marginTop: '6px' }, children: 'www.marketscoupons.com' } },
                ] } },
              ],
            },
          },

          // Accent bar bottom
          { type: 'div', props: { style: { height: '4px', backgroundColor: color, width: '100%' } } },
        ].filter(Boolean),
      },
    },
    {
      width: 600,
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'image/png',
      },
    }
  );

  // Convert to buffer and send
  const buffer = Buffer.from(await image.arrayBuffer());
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buffer);
};
