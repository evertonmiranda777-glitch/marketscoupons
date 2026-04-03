// Vercel Edge Function — Generate dark email image for prop firms
// GET /api/email-image?firm=e2t

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

// Condition grid cell
function cell(label, value, valueColor) {
  return {
    type: 'div', props: {
      style: { display: 'flex', flexDirection: 'column', width: '48%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '8px', padding: '10px 14px', marginBottom: '6px' },
      children: [
        { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }, children: label } },
        { type: 'div', props: { style: { color: valueColor || '#EDF2F7', fontSize: '14px', fontWeight: 700 }, children: value || '—' } },
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
    const proibido = f.proibido || [];
    const tpScore = f.trustpilot_score || f.rating || 0;
    const tpReviews = f.trustpilot_reviews || f.reviews || 0;
    const hasTwoTypes = prices.some(p => p.n2);

    const sections = [];

    // ══════ GRADIENT TOP BAR ══════
    sections.push({
      type: 'div', props: { style: { display: 'flex', height: '4px', background: `linear-gradient(90deg, ${color}, #F0B429, ${color})`, width: '100%' } }
    });

    // ══════ HEADER ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px 14px', width: '100%' },
        children: [
          {
            type: 'div', props: {
              style: { display: 'flex', alignItems: 'center' },
              children: [
                { type: 'span', props: { style: { fontSize: '20px', fontWeight: 900, color: '#EDF2F7' }, children: 'Markets' } },
                { type: 'span', props: { style: { fontSize: '20px', fontWeight: 900, color: '#F0B429', marginLeft: '4px' }, children: 'Coupons' } },
                { type: 'div', props: { style: { display: 'flex', width: '6px', height: '6px', backgroundColor: '#22C55E', borderRadius: '50%', marginLeft: '6px' } } },
              ],
            },
          },
          { type: 'div', props: { style: { fontSize: '8px', fontWeight: 600, letterSpacing: '2.5px', color: '#3D4F63', marginTop: '4px' }, children: 'AS MELHORES OFERTAS PARA TRADERS' } },
        ],
      },
    });

    // ══════ FIRM HEADER ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', padding: '0 28px', width: '100%', alignItems: 'center' },
        children: [
          // Firm logo
          f.icon_url ? { type: 'img', props: {
            src: 'https://www.marketscoupons.com/' + f.icon_url,
            width: 44, height: 44,
            style: { display: 'flex', width: '44px', height: '44px', borderRadius: '10px', marginRight: '12px', flexShrink: 0, objectFit: 'contain', backgroundColor: color + '22' },
          }} : { type: 'div', props: {
            style: { display: 'flex', width: '44px', height: '44px', borderRadius: '10px', backgroundColor: color + '22', justifyContent: 'center', alignItems: 'center', marginRight: '12px', flexShrink: 0 },
            children: { type: 'span', props: { style: { fontSize: '20px', fontWeight: 900, color: color }, children: f.icon || f.name[0] } },
          }},
          { type: 'div', props: {
            style: { display: 'flex', flexDirection: 'column' },
            children: [
              { type: 'div', props: { style: { fontSize: '18px', fontWeight: 900, color: '#EDF2F7' }, children: f.name } },
              { type: 'div', props: { style: { display: 'flex', fontSize: '11px', color: '#7A8FA6', marginTop: '2px' }, children: f.type + ' · ' + f.discount + '% OFF · Split ' + (f.split || '') } },
            ],
          }},
        ],
      },
    });

    // ══════ TRUSTPILOT ══════
    if (tpScore) {
      const starStr = tpScore.toFixed(1);
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', flexDirection: 'column', padding: '14px 28px 0', width: '100%' },
          children: [
            { type: 'div', props: {
              style: { display: 'flex', alignItems: 'center', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '8px', padding: '12px 14px', flexWrap: 'wrap' },
              children: [
                { type: 'span', props: { style: { fontSize: '11px', fontWeight: 700, color: '#00B67A', marginRight: '8px' }, children: 'Excelente' } },
                { type: 'span', props: { style: { fontSize: '12px', fontWeight: 800, color: '#EDF2F7', marginRight: '6px' }, children: starStr } },
                // Green star boxes (Trustpilot style)
                ...Array.from({ length: 5 }).map((_, i) => ({
                  type: 'div', props: {
                    style: { display: 'flex', width: '22px', height: '22px', backgroundColor: i < Math.round(tpScore) ? '#00B67A' : '#1C2535', marginRight: '2px', borderRadius: '2px', justifyContent: 'center', alignItems: 'center' },
                    children: { type: 'svg', props: { width: '14', height: '14', viewBox: '0 0 24 24', children: { type: 'path', props: { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', fill: '#fff' } } } },
                  },
                })),
                { type: 'span', props: { style: { fontSize: '11px', color: '#7A8FA6', marginLeft: '6px' }, children: tpReviews.toLocaleString() + ' avaliacoes' } },
              ],
            }},
            { type: 'div', props: {
              style: { display: 'flex', marginTop: '6px', alignItems: 'center' },
              children: { type: 'span', props: { style: { fontSize: '11px', color: '#7A8FA6' }, children: 'Trustpilot · ' + tpReviews.toLocaleString() + ' avaliacoes' } },
            }},
          ],
        },
      });
    }

    // ══════ ABOUT ══════
    if (f.description) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', flexDirection: 'column', padding: '14px 28px 0', width: '100%' },
          children: [
            { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '6px', borderBottom: '1px solid #1C2535', paddingBottom: '6px' }, children: 'SOBRE A FIRMA' } },
            { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '12px', lineHeight: '1.7' }, children: f.description } },
          ],
        },
      });
    }

    // ══════ CONDITIONS GRID ══════
    const conditions = [];
    conditions.push(cell('Drawdown', f.drawdown || '—'));
    conditions.push(cell('Split', f.split || '—', '#22C55E'));
    conditions.push(cell('Dias minimos', f.min_days ? f.min_days + 'd' : '—'));
    conditions.push(cell('Prazo avaliacao', f.eval_days ? f.eval_days + 'd' : 'Ilimitado'));
    conditions.push(cell('DD maximo', f.dd_pct || '—', '#EF4444'));
    conditions.push(cell('Meta de lucro', f.target || '—'));
    conditions.push(cell('Scaling', f.scaling || '—', f.scaling === 'Sim' || (f.scaling && f.scaling !== 'Nao') ? '#22C55E' : '#EDF2F7'));
    conditions.push(cell('Desconto', f.discount + '% ' + (f.discount_type || ''), '#F0B429'));

    sections.push({
      type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', padding: '14px 28px 0', width: '100%' },
        children: [
          { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }, children: 'CONDICOES' } },
          {
            type: 'div', props: {
              style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' },
              children: conditions,
            },
          },
        ],
      },
    });

    // ══════ PLATFORMS ══════
    if (plats.length) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', flexDirection: 'column', padding: '14px 28px 0', width: '100%' },
          children: [
            { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }, children: 'PLATAFORMAS' } },
            {
              type: 'div', props: {
                style: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
                children: plats.map(p => ({
                  type: 'span', props: { style: { display: 'flex', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, color: '#EDF2F7' }, children: p },
                })),
              },
            },
          ],
        },
      });
    }

    // ══════ PRICING TABLE ══════
    if (prices.length) {
      const headerCols = [
        { type: 'div', props: { style: { display: 'flex', flex: 1, fontSize: '8px', fontWeight: 700, color: '#3D4F63', letterSpacing: '1px' }, children: 'CONTA' } },
      ];
      if (hasTwoTypes) {
        headerCols.push({ type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center' }, children: { type: 'span', props: { style: { display: 'flex', backgroundColor: '#F0B429', color: '#000', fontSize: '8px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }, children: 'INTRADAY' } } } });
        headerCols.push({ type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center' }, children: { type: 'span', props: { style: { display: 'flex', backgroundColor: '#22C55E', color: '#000', fontSize: '8px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }, children: 'EOD' } } } });
      } else {
        headerCols.push({ type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#3D4F63', letterSpacing: '1px' }, children: 'COM CUPOM' } });
        headerCols.push({ type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#3D4F63', letterSpacing: '1px' }, children: 'ORIGINAL' } });
      }

      const priceRows = prices.map(r => {
        const cols = [
          { type: 'div', props: { style: { display: 'flex', flex: 1, color: '#EDF2F7', fontWeight: 700, fontSize: '14px' }, children: r.a } },
        ];
        if (hasTwoTypes) {
          cols.push({ type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }, children: [
            { type: 'span', props: { style: { color: '#22C55E', fontWeight: 800, fontSize: '13px' }, children: r.n } },
            r.o ? { type: 'span', props: { style: { color: '#3D4F63', fontSize: '10px', textDecoration: 'line-through' }, children: r.o } } : null,
          ].filter(Boolean) } });
          cols.push({ type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }, children: [
            { type: 'span', props: { style: { color: '#22C55E', fontWeight: 800, fontSize: '13px' }, children: r.n2 || '—' } },
            r.o2 ? { type: 'span', props: { style: { color: '#3D4F63', fontSize: '10px', textDecoration: 'line-through' }, children: r.o2 } } : null,
          ].filter(Boolean) } });
        } else {
          cols.push({ type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center', color: '#22C55E', fontWeight: 800, fontSize: '14px' }, children: r.n } });
          cols.push({ type: 'div', props: { style: { display: 'flex', flex: 1, justifyContent: 'center', color: '#3D4F63', fontSize: '11px', textDecoration: 'line-through' }, children: r.o || '' } });
        }
        return {
          type: 'div', props: {
            style: { display: 'flex', padding: '10px 14px', borderTop: '1px solid #1C2535', alignItems: 'center' },
            children: cols,
          },
        };
      });

      sections.push({
        type: 'div', props: {
          style: { display: 'flex', flexDirection: 'column', padding: '14px 28px 0', width: '100%' },
          children: [
            { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }, children: 'PRECOS COM DESCONTO' } },
            {
              type: 'div', props: {
                style: { display: 'flex', flexDirection: 'column', width: '100%', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '10px', overflow: 'hidden' },
                children: [
                  { type: 'div', props: { style: { display: 'flex', padding: '10px 14px', alignItems: 'center' }, children: headerCols } },
                  ...priceRows,
                ],
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
          style: { display: 'flex', flexDirection: 'column', padding: '14px 28px 0', width: '100%' },
          children: [
            { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }, children: 'BENEFICIOS' } },
            {
              type: 'div', props: {
                style: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
                children: perks.slice(0, 8).map(p => ({
                  type: 'span', props: { style: { display: 'flex', backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 600, color: '#22C55E' }, children: '+ ' + p },
                })),
              },
            },
          ],
        },
      });
    }

    // ══════ PROIBIDO ══════
    if (proibido.length) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', flexDirection: 'column', padding: '14px 28px 0', width: '100%' },
          children: [
            { type: 'div', props: { style: { color: '#3D4F63', fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }, children: 'PROIBIDO' } },
            {
              type: 'div', props: {
                style: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
                children: proibido.map(p => ({
                  type: 'span', props: { style: { display: 'flex', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 600, color: '#EF4444' }, children: 'X ' + p },
                })),
              },
            },
          ],
        },
      });
    }

    // ══════ COUPON ══════
    if (f.coupon) {
      sections.push({
        type: 'div', props: {
          style: { display: 'flex', padding: '18px 28px 0', width: '100%' },
          children: {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', border: '2px dashed rgba(240,180,41,0.35)', borderRadius: '12px', padding: '22px 20px', backgroundColor: 'rgba(240,180,41,0.03)' },
              children: [
                { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '9px', fontWeight: 700, letterSpacing: '2.5px', marginBottom: '12px' }, children: 'CUPOM EXCLUSIVO' } },
                { type: 'div', props: { style: { color: '#F0B429', fontSize: '38px', fontWeight: 900, letterSpacing: '8px' }, children: f.coupon } },
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '11px', marginTop: '12px' }, children: 'Copie o cupom e cole no checkout' } },
              ],
            },
          },
        },
      });
    }

    // ══════ CTA BUTTON ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', padding: '18px 28px 0', justifyContent: 'center', width: '100%' },
        children: {
          type: 'div', props: {
            style: { display: 'flex', justifyContent: 'center', alignItems: 'center', background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#FFFFFF', padding: '16px 0', borderRadius: '10px', fontSize: '16px', fontWeight: 900, width: '100%', letterSpacing: '0.5px' },
            children: 'Comecar Agora',
          },
        },
      },
    });

    // ══════ FOOTER ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 32px 16px', width: '100%' },
        children: [
          {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid #1C2535', width: '100%', paddingTop: '14px' },
              children: [
                {
                  type: 'div', props: {
                    style: { display: 'flex' },
                    children: [
                      { type: 'span', props: { style: { fontSize: '12px', fontWeight: 900, color: '#EDF2F7' }, children: 'Markets' } },
                      { type: 'span', props: { style: { fontSize: '12px', fontWeight: 900, color: '#F0B429', marginLeft: '3px' }, children: 'Coupons' } },
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
      type: 'div', props: { style: { display: 'flex', height: '4px', background: `linear-gradient(90deg, ${color}, #F0B429, ${color})`, width: '100%' } }
    });

    // Calculate height
    let h = 100; // header + bars
    h += 60; // firm header
    if (tpScore) h += 80; // trustpilot
    if (f.description) h += 70; // about
    h += (Math.ceil(8 / 2)) * 56 + 40; // conditions grid (4 rows of 2)
    if (plats.length) h += 50; // platforms
    if (prices.length) h += prices.length * 42 + 60; // pricing
    if (perks.length) h += 60; // perks badges
    if (proibido.length) h += 50; // proibido
    if (f.coupon) h += 110; // coupon
    h += 120; // CTA + footer

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
      { width: 600, height: h }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
