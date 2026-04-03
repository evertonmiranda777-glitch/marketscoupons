// Vercel Edge Function — Generate dark email image for prop firms
// GET /api/email-image?firm=e2t

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

// Helper: table row (label left, value right)
function tRow(label, value, valueColor) {
  return {
    type: 'div', props: {
      style: { display: 'flex', padding: '9px 18px', borderTop: '1px solid #1C2535', justifyContent: 'space-between', alignItems: 'center' },
      children: [
        { type: 'span', props: { style: { color: '#7A8FA6', fontSize: '12px', fontWeight: 500 }, children: label } },
        { type: 'span', props: { style: { color: valueColor || '#EDF2F7', fontSize: '12px', fontWeight: 700 }, children: value || '—' } },
      ],
    },
  };
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

    const sections = [];

    // ══════ GRADIENT TOP BAR ══════
    sections.push({
      type: 'div', props: { style: { display: 'flex', height: '5px', background: `linear-gradient(90deg, ${color}, #F0B429, ${color})`, width: '100%' } }
    });

    // ══════ HEADER ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px 16px', width: '100%' },
        children: [
          {
            type: 'div', props: {
              style: { display: 'flex', alignItems: 'center' },
              children: [
                { type: 'span', props: { style: { fontSize: '22px', fontWeight: 900, color: '#EDF2F7' }, children: 'Markets' } },
                { type: 'span', props: { style: { fontSize: '22px', fontWeight: 900, color: '#F0B429', marginLeft: '4px' }, children: 'Coupons' } },
                { type: 'div', props: { style: { display: 'flex', width: '7px', height: '7px', backgroundColor: '#22C55E', borderRadius: '50%', marginLeft: '6px' } } },
              ],
            },
          },
          { type: 'div', props: { style: { fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', color: '#3D4F63', marginTop: '5px' }, children: 'AS MELHORES OFERTAS PARA TRADERS' } },
        ],
      },
    });

    // ══════ DIVIDER ══════
    sections.push({
      type: 'div', props: { style: { display: 'flex', height: '1px', background: 'linear-gradient(90deg, transparent, #1C2535, #1C2535, transparent)', width: '100%' } }
    });

    // ══════ HERO CARD ══════
    const cardInner = [];

    // Discount badge
    cardInner.push({
      type: 'div', props: {
        style: { display: 'flex', backgroundColor: 'rgba(240,180,41,0.10)', border: '1px solid rgba(240,180,41,0.30)', borderRadius: '20px', padding: '6px 22px' },
        children: { type: 'span', props: { style: { color: '#F0B429', fontSize: '13px', fontWeight: 800, letterSpacing: '1px' }, children: f.discount + '% OFF' + lt } },
      },
    });

    // Firm name
    cardInner.push({
      type: 'div', props: { style: { marginTop: '14px', fontSize: '30px', fontWeight: 900, color: '#EDF2F7', letterSpacing: '-0.5px' }, children: f.name },
    });

    // Type badge
    if (f.type) {
      cardInner.push({
        type: 'div', props: {
          style: { display: 'flex', marginTop: '10px' },
          children: { type: 'span', props: { style: { display: 'flex', backgroundColor: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.20)', borderRadius: '6px', padding: '3px 14px', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#F0B429' }, children: f.type } },
        },
      });
    }

    // Description
    if (f.description) {
      cardInner.push({
        type: 'div', props: { style: { marginTop: '12px', color: '#7A8FA6', fontSize: '12px', lineHeight: '1.7', textAlign: 'center', maxWidth: '460px' }, children: f.description },
      });
    }

    // Trustpilot
    if (tpScore) {
      cardInner.push({
        type: 'div', props: { style: { display: 'flex', marginTop: '10px', color: '#7A8FA6', fontSize: '11px' }, children: '★ ' + tpScore + '/5 · ' + tpReviews.toLocaleString() + ' reviews no Trustpilot' },
      });
    }

    sections.push({
      type: 'div', props: {
        style: { display: 'flex', padding: '20px 28px 0', width: '100%' },
        children: {
          type: 'div', props: {
            style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '12px', overflow: 'hidden' },
            children: [
              { type: 'div', props: { style: { display: 'flex', height: '3px', background: `linear-gradient(90deg, transparent, ${color}, transparent)`, width: '100%' } } },
              {
                type: 'div', props: {
                  style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px' },
                  children: cardInner,
                },
              },
            ],
          },
        },
      },
    });

    // ══════ GREETING ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', padding: '22px 28px 0', width: '100%' },
        children: [
          { type: 'div', props: { style: { color: '#EDF2F7', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }, children: 'Ola Trader,' } },
          { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '13px', lineHeight: '1.7' }, children: 'A ' + f.name + ' esta com ' + f.discount + '% de desconto' + lt + '. Veja todos os detalhes abaixo e comece agora mesmo.' } },
        ],
      },
    });

    // ══════ COUPON ══════
    if (f.coupon) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', padding: '18px 28px 0', width: '100%' },
          children: {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', border: '2px dashed rgba(240,180,41,0.35)', borderRadius: '12px', padding: '20px', backgroundColor: 'rgba(240,180,41,0.02)' },
              children: [
                { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '9px', fontWeight: 700, letterSpacing: '2.5px', marginBottom: '8px' }, children: 'CUPOM EXCLUSIVO' } },
                { type: 'div', props: { style: { color: '#F0B429', fontSize: '36px', fontWeight: 900, letterSpacing: '6px' }, children: f.coupon } },
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '11px', marginTop: '10px' }, children: 'Copie e cole no checkout' } },
              ],
            },
          },
        },
      });
    }

    // ══════ STATS BAR (Profit Split / Desconto / Drawdown) ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', padding: '18px 28px 0', width: '100%' },
        children: {
          type: 'div', props: {
            style: { display: 'flex', width: '100%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '10px', overflow: 'hidden' },
            children: [
              { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '16px 8px' }, children: [
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '8px', fontWeight: 700, letterSpacing: '1px' }, children: 'PROFIT SPLIT' } },
                { type: 'div', props: { style: { color: '#22C55E', fontSize: '22px', fontWeight: 900, marginTop: '5px' }, children: f.split || '—' } },
              ] } },
              { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '16px 8px', borderLeft: '1px solid #1C2535', borderRight: '1px solid #1C2535' }, children: [
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '8px', fontWeight: 700, letterSpacing: '1px' }, children: 'DESCONTO' } },
                { type: 'div', props: { style: { color: '#F0B429', fontSize: '22px', fontWeight: 900, marginTop: '5px' }, children: f.discount + '%' } },
              ] } },
              { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '16px 8px' }, children: [
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '8px', fontWeight: 700, letterSpacing: '1px' }, children: 'DRAWDOWN' } },
                { type: 'div', props: { style: { color: '#EDF2F7', fontSize: '22px', fontWeight: 900, marginTop: '5px' }, children: f.drawdown || '—' } },
              ] } },
            ],
          },
        },
      },
    });

    // ══════ RULES TABLE ══════
    const rules = [];
    if (f.min_days) rules.push(['Dias Minimos', f.min_days + ' dia(s)']);
    if (f.eval_days) rules.push(['Periodo Avaliacao', f.eval_days + ' dias']);
    else rules.push(['Periodo Avaliacao', 'Ilimitado']);
    if (f.target) rules.push(['Meta de Lucro', f.target]);
    if (f.drawdown) rules.push(['Tipo Drawdown', f.drawdown]);
    if (f.dd_pct) rules.push(['Drawdown', f.dd_pct]);
    if (f.scaling) rules.push(['Scaling', f.scaling]);
    rules.push(['News Trading', f.news_trading ? 'Sim' : 'Nao']);
    rules.push(['Payout Dia 1', f.day1_payout ? 'Sim' : 'Nao']);

    if (rules.length) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', padding: '18px 28px 0', width: '100%' },
          children: {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', width: '100%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '10px', overflow: 'hidden' },
              children: rules.map((r, i) =>
                tRow(r[0], r[1], r[1] === 'Sim' ? '#22C55E' : r[1] === 'Nao' ? '#EF4444' : '#EDF2F7')
              ),
            },
          },
        },
      });
    }

    // ══════ PLATFORMS ══════
    if (plats.length) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', flexDirection: 'column', padding: '18px 28px 0', width: '100%' },
          children: [
            { type: 'div', props: { style: { color: '#3D4F63', fontSize: '8px', fontWeight: 700, letterSpacing: '2px', marginBottom: '10px' }, children: 'PLATAFORMAS' } },
            {
              type: 'div', props: {
                style: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
                children: plats.map(p => ({
                  type: 'span', props: { style: { display: 'flex', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid ' + color + '44', borderRadius: '6px', padding: '6px 14px', fontSize: '11px', fontWeight: 600, color: '#EDF2F7' }, children: p },
                })),
              },
            },
          ],
        },
      });
    }

    // ══════ PERKS ══════
    if (perks.length) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', flexDirection: 'column', padding: '18px 28px 0', width: '100%' },
          children: [
            { type: 'div', props: { style: { color: '#3D4F63', fontSize: '8px', fontWeight: 700, letterSpacing: '2px', marginBottom: '8px' }, children: 'BENEFICIOS' } },
            ...perks.slice(0, 6).map(p => ({
              type: 'div', props: {
                style: { display: 'flex', padding: '3px 0', color: '#EDF2F7', fontSize: '12px', alignItems: 'center' },
                children: [
                  { type: 'div', props: { style: { display: 'flex', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: '8px', flexShrink: 0 }, children: { type: 'span', props: { style: { color: '#22C55E', fontSize: '9px', fontWeight: 700 }, children: '✓' } } } },
                  { type: 'span', props: { children: p } },
                ],
              },
            })),
          ],
        },
      });
    }

    // ══════ PRICING TABLE ══════
    if (prices.length) {
      const priceRows = prices.map((r, i) => ({
        type: 'div', props: {
          style: { display: 'flex', padding: '9px 18px', borderTop: '1px solid #1C2535', alignItems: 'center', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' },
          children: [
            { type: 'div', props: { style: { display: 'flex', flex: 2, color: '#EDF2F7', fontWeight: 700, fontSize: '13px' }, children: r.a } },
            { type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center', color: '#22C55E', fontWeight: 800, fontSize: '13px' }, children: r.n } },
            { type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center', color: '#3D4F63', fontSize: '11px', textDecoration: 'line-through' }, children: r.o || '' } },
          ],
        },
      }));

      sections.push({
        type: 'div', props: {
          style: { display: 'flex', padding: '18px 28px 0', width: '100%' },
          children: {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', width: '100%', backgroundColor: '#10151F', border: '1px solid #1C2535', borderRadius: '10px', overflow: 'hidden' },
              children: [
                {
                  type: 'div', props: {
                    style: { display: 'flex', padding: '12px 18px', borderBottom: '1px solid #1C2535', justifyContent: 'space-between', alignItems: 'center' },
                    children: [
                      { type: 'span', props: { style: { fontSize: '8px', fontWeight: 700, letterSpacing: '2px', color: '#7A8FA6' }, children: 'CONTAS DISPONIVEIS' } },
                      { type: 'span', props: { style: { display: 'flex', backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '4px', padding: '2px 10px', fontSize: '9px', fontWeight: 800, color: '#22C55E' }, children: '-' + f.discount + '%' } },
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

    // ══════ DISCOUNT BADGE ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', justifyContent: 'center', padding: '20px 28px 0', width: '100%' },
        children: {
          type: 'div', props: {
            style: { display: 'flex', backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', padding: '8px 20px' },
            children: { type: 'span', props: { style: { color: '#22C55E', fontSize: '12px', fontWeight: 700 }, children: '↓ ' + f.discount + '% OFF · ' + (f.short_name || f.name) + ' ↓' } },
          },
        },
      },
    });

    // ══════ CTA BUTTON ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', padding: '16px 28px 0', justifyContent: 'center', width: '100%' },
        children: {
          type: 'div', props: {
            style: { display: 'flex', justifyContent: 'center', alignItems: 'center', background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#FFFFFF', padding: '18px 0', borderRadius: '10px', fontSize: '17px', fontWeight: 900, width: '100%', letterSpacing: '0.5px' },
            children: 'COMECAR AGORA →',
          },
        },
      },
    });

    // ══════ FOOTER ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 32px 8px', width: '100%' },
        children: [
          { type: 'div', props: { style: { color: '#3D4F63', fontSize: '10px', marginBottom: '12px' }, children: 'Ver todas as ofertas no MarketsCoupons →' } },
          {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid #1C2535', width: '100%', paddingTop: '14px', paddingBottom: '8px' },
              children: [
                {
                  type: 'div', props: {
                    style: { display: 'flex' },
                    children: [
                      { type: 'span', props: { style: { fontSize: '13px', fontWeight: 900, color: '#EDF2F7' }, children: 'Markets' } },
                      { type: 'span', props: { style: { fontSize: '13px', fontWeight: 900, color: '#F0B429', marginLeft: '3px' }, children: 'Coupons' } },
                    ],
                  },
                },
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', marginTop: '4px' }, children: 'www.marketscoupons.com' } },
              ],
            },
          },
        ],
      },
    });

    // ══════ GRADIENT BOTTOM BAR ══════
    sections.push({
      type: 'div', props: { style: { display: 'flex', height: '5px', background: `linear-gradient(90deg, ${color}, #F0B429, ${color})`, width: '100%' } }
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
