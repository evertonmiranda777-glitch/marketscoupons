// Vercel Edge Function — Generate dark email image for prop firms
// GET /api/email-image?firm=e2t

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

function e(type, style, children) {
  if (typeof children === 'string' || typeof children === 'number') {
    return { type, props: { style, children: String(children) } };
  }
  if (Array.isArray(children)) {
    return { type, props: { style, children: children.filter(Boolean) } };
  }
  if (children && typeof children === 'object') {
    return { type, props: { style, children } };
  }
  return { type, props: { style } };
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const firmId = searchParams.get('firm');
    if (!firmId) return new Response('Missing ?firm=', { status: 400 });

    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/cms_firms?id=eq.${firmId}&select=*`,
      { headers: { 'apikey': SUPABASE_KEY, 'Accept': 'application/json' } }
    );
    const firms = await resp.json();
    const f = firms?.[0];
    if (!f) return new Response('Firm not found', { status: 404 });

    const color = f.color || '#F0B429';
    const lt = f.discount_type === 'lifetime' ? ' Lifetime' : '';
    const prices = f.prices || [];
    const plats = f.platforms || [];
    const perks = f.perks || [];
    const tpScore = f.trustpilot_score || f.rating || 0;
    const tpReviews = f.trustpilot_reviews || f.reviews || 0;

    // Build element tree
    const rows = [];

    // Accent bar top
    rows.push(e('div', { height: '4px', backgroundColor: color, width: '100%' }));

    // Header
    rows.push(
      e('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px 16px' }, [
        e('div', { display: 'flex', alignItems: 'center' }, [
          e('span', { fontSize: '22px', fontWeight: 800, color: '#EDF2F7', letterSpacing: '-0.5px' }, 'Markets '),
          e('span', { fontSize: '22px', fontWeight: 800, color: '#F0B429', letterSpacing: '-0.5px' }, 'Coupons'),
          e('div', { width: '7px', height: '7px', backgroundColor: '#22C55E', borderRadius: '50%', marginLeft: '6px' }),
        ]),
        e('div', { fontSize: '10px', fontWeight: 500, letterSpacing: '1.5px', color: '#3D4F63', marginTop: '5px', textTransform: 'uppercase' }, 'AS MELHORES OFERTAS PARA TRADERS'),
      ])
    );

    // Divider
    rows.push(e('div', { height: '1px', backgroundColor: '#1C2535', margin: '0 32px', width: '536px' }));

    // Hero card
    rows.push(
      e('div', { padding: '20px 24px 0', display: 'flex', width: '100%' }, [
        e('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '12px', overflow: 'hidden' }, [
          e('div', { height: '3px', backgroundColor: color, width: '100%' }),
          e('div', { padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }, [
            // Discount badge
            e('div', { backgroundColor: 'rgba(240,180,41,0.10)', border: '1px solid rgba(240,180,41,0.30)', borderRadius: '20px', padding: '6px 20px' },
              e('span', { color: '#F0B429', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }, f.discount + '% OFF' + lt)
            ),
            // Firm name
            e('div', { marginTop: '16px', fontSize: '28px', fontWeight: 900, color: '#EDF2F7', letterSpacing: '-0.8px' }, f.name),
            // Type
            f.type ? e('div', { marginTop: '8px', display: 'flex' },
              e('span', { backgroundColor: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.20)', borderRadius: '6px', padding: '3px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#F0B429' }, f.type)
            ) : null,
            // Description
            e('div', { marginTop: '12px', color: '#7A8FA6', fontSize: '13px', lineHeight: '1.6', maxWidth: '460px', textAlign: 'center' }, f.description || ''),
            // Trustpilot
            tpScore ? e('div', { marginTop: '10px', color: '#7A8FA6', fontSize: '11px' }, tpScore + '/5 · ' + tpReviews.toLocaleString() + ' reviews no Trustpilot') : null,
          ]),
        ]),
      ])
    );

    // Greeting
    rows.push(
      e('div', { padding: '24px 24px 0', display: 'flex', flexDirection: 'column' }, [
        e('div', { color: '#EDF2F7', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }, 'Ola Trader,'),
        e('div', { color: '#7A8FA6', fontSize: '14px', lineHeight: '1.7' }, 'A ' + f.name + ' esta com ' + f.discount + '% de desconto' + lt + '. Veja todos os detalhes abaixo e comece agora mesmo.'),
      ])
    );

    // Coupon
    if (f.coupon) {
      rows.push(
        e('div', { padding: '20px 24px 0', display: 'flex', width: '100%' },
          e('div', { width: '100%', border: '2px dashed rgba(240,180,41,0.35)', borderRadius: '12px', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }, [
            e('div', { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: '10px' }, 'CUPOM EXCLUSIVO'),
            e('div', { color: '#F0B429', fontSize: '36px', fontWeight: 800, letterSpacing: '6px' }, f.coupon),
            e('div', { color: '#7A8FA6', fontSize: '11px', marginTop: '12px' }, 'Copie o cupom e cole no checkout'),
          ])
        )
      );
    }

    // Stats bar
    rows.push(
      e('div', { padding: '20px 24px 0', display: 'flex', width: '100%' },
        e('div', { width: '100%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '10px', display: 'flex', overflow: 'hidden' }, [
          e('div', { flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }, [
            e('div', { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }, 'Profit Split'),
            e('div', { color: '#22C55E', fontSize: '20px', fontWeight: 800, marginTop: '4px' }, f.split || ''),
          ]),
          e('div', { flex: 1, padding: '16px 8px', borderLeft: '1px solid #1C2535', borderRight: '1px solid #1C2535', display: 'flex', flexDirection: 'column', alignItems: 'center' }, [
            e('div', { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }, 'Desconto'),
            e('div', { color: '#F0B429', fontSize: '20px', fontWeight: 800, marginTop: '4px' }, f.discount + '%'),
          ]),
          e('div', { flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }, [
            e('div', { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }, 'Drawdown'),
            e('div', { color: '#EDF2F7', fontSize: '20px', fontWeight: 800, marginTop: '4px' }, f.dd_pct || ''),
          ]),
        ])
      )
    );

    // Platforms
    if (plats.length) {
      rows.push(
        e('div', { padding: '16px 24px 0', display: 'flex', flexDirection: 'column' }, [
          e('div', { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }, 'PLATAFORMAS'),
          e('div', { display: 'flex', flexWrap: 'wrap', gap: '6px' },
            plats.map(p => e('span', { backgroundColor: '#07090D', border: '1px solid ' + color, borderRadius: '6px', padding: '6px 14px', fontSize: '11px', fontWeight: 600, color: '#EDF2F7' }, p))
          ),
        ])
      );
    }

    // Perks
    if (perks.length) {
      rows.push(
        e('div', { padding: '16px 24px 0', display: 'flex', flexDirection: 'column' }, [
          e('div', { color: '#3D4F63', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }, 'BENEFICIOS'),
          ...perks.slice(0, 6).map(p =>
            e('div', { padding: '3px 0', color: '#EDF2F7', fontSize: '12px', display: 'flex' }, [
              e('span', { color: '#22C55E', marginRight: '6px' }, '✓'),
              e('span', {}, p),
            ])
          ),
        ])
      );
    }

    // Pricing table
    if (prices.length) {
      rows.push(
        e('div', { padding: '20px 24px 0', display: 'flex', width: '100%' },
          e('div', { width: '100%', backgroundColor: '#10151F', border: '1px solid #1C2535', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }, [
            // Table header
            e('div', { padding: '12px 16px', borderBottom: '1px solid #1C2535', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
              e('span', { fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#3D4F63' }, 'CONTAS DISPONIVEIS'),
              e('span', { backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '4px', padding: '2px 8px', fontSize: '9px', fontWeight: 700, color: '#22C55E' }, f.discount + '% OFF'),
            ]),
            // Price rows
            ...prices.map(r =>
              e('div', { display: 'flex', padding: '8px 16px', borderTop: '1px solid #1C2535', alignItems: 'center' }, [
                e('div', { flex: 2, color: '#EDF2F7', fontWeight: 700, fontSize: '13px' }, r.a),
                e('div', { flex: 1, textAlign: 'center', color: '#22C55E', fontWeight: 800, fontSize: '13px' }, r.n),
                e('div', { flex: 1, textAlign: 'center', color: '#3D4F63', fontSize: '11px', textDecoration: 'line-through' }, r.o || ''),
              ])
            ),
          ])
        )
      );
    }

    // CTA
    rows.push(
      e('div', { padding: '24px 24px 0', display: 'flex', justifyContent: 'center', width: '100%' },
        e('div', { backgroundColor: color, color: '#FFFFFF', padding: '16px 0', borderRadius: '8px', fontSize: '16px', fontWeight: 800, letterSpacing: '0.5px', width: '100%', maxWidth: '500px', textAlign: 'center' }, 'COMECAR AGORA →')
      )
    );

    // Footer
    rows.push(
      e('div', { padding: '24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }, [
        e('div', { borderTop: '1px solid #1C2535', width: '100%', paddingTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }, [
          e('div', { display: 'flex' }, [
            e('span', { fontSize: '13px', fontWeight: 800, color: '#EDF2F7' }, 'Markets'),
            e('span', { fontSize: '13px', fontWeight: 800, color: '#F0B429' }, 'Coupons'),
          ]),
          e('div', { color: '#3D4F63', fontSize: '10px', marginTop: '6px' }, 'www.marketscoupons.com'),
        ]),
      ])
    );

    // Accent bar bottom
    rows.push(e('div', { height: '4px', backgroundColor: color, width: '100%' }));

    const root = e('div', {
      display: 'flex',
      flexDirection: 'column',
      width: '600px',
      backgroundColor: '#07090D',
      color: '#EDF2F7',
    }, rows);

    return new ImageResponse(root, { width: 600 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
