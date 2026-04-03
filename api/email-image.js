// Vercel Edge Function — Generate dark email image for prop firms
// GET /api/email-image?firm=e2t

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

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

    // Build sections as children array
    const sections = [];

    // --- Accent bar top ---
    sections.push({
      type: 'div', props: { style: { display: 'flex', height: '4px', backgroundColor: color, width: '100%' } }
    });

    // --- Header ---
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px 16px', width: '100%' },
        children: [
          {
            type: 'div', props: {
              style: { display: 'flex', alignItems: 'center' },
              children: [
                { type: 'span', props: { style: { fontSize: '22px', fontWeight: 800, color: '#EDF2F7' }, children: 'Markets ' } },
                { type: 'span', props: { style: { fontSize: '22px', fontWeight: 800, color: '#F0B429' }, children: 'Coupons' } },
                { type: 'div', props: { style: { display: 'flex', width: '7px', height: '7px', backgroundColor: '#22C55E', borderRadius: '50%', marginLeft: '6px' } } },
              ],
            },
          },
          { type: 'div', props: { style: { fontSize: '10px', fontWeight: 500, letterSpacing: '1.5px', color: '#3D4F63', marginTop: '5px' }, children: 'AS MELHORES OFERTAS PARA TRADERS' } },
        ],
      },
    });

    // --- Divider ---
    sections.push({
      type: 'div', props: { style: { display: 'flex', height: '1px', backgroundColor: '#1C2535', width: '536px', margin: '0 32px' } }
    });

    // --- Discount badge + Firm name + Description ---
    const heroChildren = [
      { type: 'div', props: { style: { display: 'flex', height: '3px', backgroundColor: color, width: '100%' } } },
    ];

    const cardInner = [];
    // Discount badge
    cardInner.push({
      type: 'div', props: {
        style: { display: 'flex', backgroundColor: 'rgba(240,180,41,0.10)', border: '1px solid rgba(240,180,41,0.30)', borderRadius: '20px', padding: '6px 20px' },
        children: { type: 'span', props: { style: { color: '#F0B429', fontSize: '12px', fontWeight: 700, letterSpacing: '1px' }, children: f.discount + '% OFF' + lt } },
      },
    });
    // Firm name
    cardInner.push({
      type: 'div', props: { style: { marginTop: '16px', fontSize: '28px', fontWeight: 900, color: '#EDF2F7' }, children: f.name },
    });
    // Type badge
    if (f.type) {
      cardInner.push({
        type: 'div', props: {
          style: { display: 'flex', marginTop: '8px' },
          children: { type: 'span', props: { style: { backgroundColor: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.20)', borderRadius: '6px', padding: '3px 12px', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: '#F0B429' }, children: f.type } },
        },
      });
    }
    // Description
    if (f.description) {
      cardInner.push({
        type: 'div', props: { style: { marginTop: '12px', color: '#7A8FA6', fontSize: '13px', lineHeight: '1.6', textAlign: 'center' }, children: f.description },
      });
    }
    // Trustpilot
    if (tpScore) {
      cardInner.push({
        type: 'div', props: { style: { marginTop: '10px', color: '#7A8FA6', fontSize: '11px' }, children: tpScore + '/5 · ' + tpReviews.toLocaleString() + ' reviews no Trustpilot' },
      });
    }

    heroChildren.push({
      type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px' },
        children: cardInner,
      },
    });

    sections.push({
      type: 'div', props: {
        style: { display: 'flex', padding: '20px 24px 0', width: '100%' },
        children: {
          type: 'div', props: {
            style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '12px', overflow: 'hidden' },
            children: heroChildren,
          },
        },
      },
    });

    // --- Greeting ---
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', padding: '24px 24px 0', width: '100%' },
        children: [
          { type: 'div', props: { style: { color: '#EDF2F7', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }, children: 'Ola Trader,' } },
          { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '14px', lineHeight: '1.7' }, children: 'A ' + f.name + ' esta com ' + f.discount + '% de desconto' + lt + '. Veja os detalhes e comece agora.' } },
        ],
      },
    });

    // --- Coupon ---
    if (f.coupon) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', padding: '20px 24px 0', width: '100%' },
          children: {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', border: '2px dashed rgba(240,180,41,0.35)', borderRadius: '12px', padding: '24px 20px' },
              children: [
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '2.5px', marginBottom: '10px' }, children: 'CUPOM EXCLUSIVO' } },
                { type: 'div', props: { style: { color: '#F0B429', fontSize: '36px', fontWeight: 800, letterSpacing: '6px' }, children: f.coupon } },
                { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '11px', marginTop: '12px' }, children: 'Copie o cupom e cole no checkout' } },
              ],
            },
          },
        },
      });
    }

    // --- Stats bar ---
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', padding: '20px 24px 0', width: '100%' },
        children: {
          type: 'div', props: {
            style: { display: 'flex', width: '100%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '10px', overflow: 'hidden' },
            children: [
              { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '16px 8px' }, children: [
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '0.7px' }, children: 'PROFIT SPLIT' } },
                { type: 'div', props: { style: { color: '#22C55E', fontSize: '20px', fontWeight: 800, marginTop: '4px' }, children: f.split || '' } },
              ] } },
              { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '16px 8px', borderLeft: '1px solid #1C2535', borderRight: '1px solid #1C2535' }, children: [
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '0.7px' }, children: 'DESCONTO' } },
                { type: 'div', props: { style: { color: '#F0B429', fontSize: '20px', fontWeight: 800, marginTop: '4px' }, children: f.discount + '%' } },
              ] } },
              { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '16px 8px' }, children: [
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '0.7px' }, children: 'DRAWDOWN' } },
                { type: 'div', props: { style: { color: '#EDF2F7', fontSize: '20px', fontWeight: 800, marginTop: '4px' }, children: f.dd_pct || '' } },
              ] } },
            ],
          },
        },
      },
    });

    // --- Platforms ---
    if (plats.length) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', flexDirection: 'column', padding: '16px 24px 0', width: '100%' },
          children: [
            { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }, children: 'PLATAFORMAS' } },
            {
              type: 'div', props: {
                style: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
                children: plats.map(p => ({
                  type: 'span', props: { style: { display: 'flex', backgroundColor: '#07090D', border: '1px solid ' + color, borderRadius: '6px', padding: '6px 14px', fontSize: '11px', fontWeight: 600, color: '#EDF2F7' }, children: p },
                })),
              },
            },
          ],
        },
      });
    }

    // --- Perks ---
    if (perks.length) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', flexDirection: 'column', padding: '16px 24px 0', width: '100%' },
          children: [
            { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }, children: 'BENEFICIOS' } },
            ...perks.slice(0, 6).map(p => ({
              type: 'div', props: {
                style: { display: 'flex', padding: '3px 0', color: '#EDF2F7', fontSize: '12px' },
                children: [
                  { type: 'span', props: { style: { color: '#22C55E', marginRight: '6px' }, children: '✓' } },
                  { type: 'span', props: { children: p } },
                ],
              },
            })),
          ],
        },
      });
    }

    // --- Pricing table ---
    if (prices.length) {
      const priceRows = prices.map(r => ({
        type: 'div', props: {
          style: { display: 'flex', padding: '8px 16px', borderTop: '1px solid #1C2535', alignItems: 'center' },
          children: [
            { type: 'div', props: { style: { display: 'flex', flex: 2, color: '#EDF2F7', fontWeight: 700, fontSize: '13px' }, children: r.a } },
            { type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center', color: '#22C55E', fontWeight: 800, fontSize: '13px' }, children: r.n } },
            { type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center', color: '#3D4F63', fontSize: '11px', textDecoration: 'line-through' }, children: r.o || '' } },
          ],
        },
      }));

      sections.push({
        type: 'div', props: {
          style: { display: 'flex', padding: '20px 24px 0', width: '100%' },
          children: {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', width: '100%', backgroundColor: '#10151F', border: '1px solid #1C2535', borderRadius: '10px', overflow: 'hidden' },
              children: [
                {
                  type: 'div', props: {
                    style: { display: 'flex', padding: '12px 16px', borderBottom: '1px solid #1C2535', justifyContent: 'space-between', alignItems: 'center' },
                    children: [
                      { type: 'span', props: { style: { fontSize: '9px', fontWeight: 700, letterSpacing: '2px', color: '#3D4F63' }, children: 'CONTAS DISPONIVEIS' } },
                      { type: 'span', props: { style: { display: 'flex', backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '4px', padding: '2px 8px', fontSize: '9px', fontWeight: 700, color: '#22C55E' }, children: f.discount + '% OFF' } },
                    ],
                  },
                },
                ...priceRows,
              ],
            },
          },
        },
      });
    }

    // --- CTA ---
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', padding: '24px 24px 0', justifyContent: 'center', width: '100%' },
        children: {
          type: 'div', props: {
            style: { display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: color, color: '#FFFFFF', padding: '16px 0', borderRadius: '8px', fontSize: '16px', fontWeight: 800, width: '100%', maxWidth: '500px' },
            children: 'COMECAR AGORA →',
          },
        },
      },
    });

    // --- Footer ---
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 32px', width: '100%' },
        children: [
          {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid #1C2535', width: '100%', paddingTop: '16px' },
              children: [
                {
                  type: 'div', props: {
                    style: { display: 'flex' },
                    children: [
                      { type: 'span', props: { style: { fontSize: '13px', fontWeight: 800, color: '#EDF2F7' }, children: 'Markets' } },
                      { type: 'span', props: { style: { fontSize: '13px', fontWeight: 800, color: '#F0B429' }, children: 'Coupons' } },
                    ],
                  },
                },
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '10px', marginTop: '6px' }, children: 'www.marketscoupons.com' } },
              ],
            },
          },
        ],
      },
    });

    // --- Accent bar bottom ---
    sections.push({
      type: 'div', props: { style: { display: 'flex', height: '4px', backgroundColor: color, width: '100%' } }
    });

    return new ImageResponse(
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#07090D',
            color: '#EDF2F7',
          },
          children: sections,
        },
      },
      { width: 600 }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
