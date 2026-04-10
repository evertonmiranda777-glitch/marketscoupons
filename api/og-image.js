// Vercel Edge Function — OG image for social sharing
// GET /api/og-image — matches checkout/email design system

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

function cell(label, value, valueColor) {
  return {
    type: 'div', props: {
      style: { display: 'flex', flexDirection: 'column', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '10px', padding: '16px 20px', flex: 1, minWidth: '140px' },
      children: [
        { type: 'div', props: { style: { color: '#3D4F63', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '6px' }, children: label } },
        { type: 'div', props: { style: { color: valueColor || '#EDF2F7', fontSize: '26px', fontWeight: 900 }, children: value } },
      ],
    },
  };
}

export default async function handler() {
  try {
    // Fetch top firms by discount
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/cms_firms?active=eq.true&order=discount.desc,reviews.desc&limit=5&select=id,name,icon_url,color,discount,coupon,rating,reviews,type`,
      { headers: { 'apikey': SUPABASE_KEY, 'Accept': 'application/json' } }
    );
    const firms = await resp.json();
    const topFirms = Array.isArray(firms) ? firms.slice(0, 5) : [];
    const firmCount = Array.isArray(firms) ? firms.length : 11;

    const sections = [];

    // ══════ GRADIENT TOP BAR ══════
    sections.push({
      type: 'div', props: { style: { display: 'flex', height: '4px', background: 'linear-gradient(90deg, #F0B429, #22C55E, #F0B429)', width: '100%', flexShrink: 0 } }
    });

    // ══════ MAIN CONTENT (2-column layout) ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', flex: 1, width: '100%', padding: '32px 40px 24px' },
        children: [
          // ══════ LEFT COLUMN ══════
          {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '36px' },
              children: [
                // Logo
                {
                  type: 'div', props: {
                    style: { display: 'flex', alignItems: 'center', marginBottom: '6px' },
                    children: [
                      { type: 'span', props: { style: { fontSize: '38px', fontWeight: 900, color: '#EDF2F7' }, children: 'Markets' } },
                      { type: 'span', props: { style: { fontSize: '38px', fontWeight: 900, color: '#F0B429', marginLeft: '4px' }, children: 'Coupons' } },
                      { type: 'div', props: { style: { display: 'flex', width: '8px', height: '8px', backgroundColor: '#22C55E', borderRadius: '50%', marginLeft: '8px' } } },
                    ],
                  },
                },
                // Tagline
                { type: 'div', props: { style: { fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: '#3D4F63', marginBottom: '28px' }, children: 'EXCLUSIVE PROP FIRM COUPONS & DISCOUNTS' } },
                // Stats grid
                {
                  type: 'div', props: {
                    style: { display: 'flex', gap: '10px', marginBottom: '20px' },
                    children: [
                      cell('MAX DISCOUNT', '90%', '#F0B429'),
                      cell('PROP FIRMS', firmCount + '+', '#22C55E'),
                      cell('DAILY ANALYSIS', 'FREE', '#EDF2F7'),
                    ],
                  },
                },
                // Features pills
                {
                  type: 'div', props: {
                    style: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
                    children: ['Coupons', 'Comparator', 'GEX / Gamma', 'Economic Calendar', 'Daily Analysis', 'Blog', 'Quiz', 'Position Calculator'].map(f => ({
                      type: 'span', props: {
                        style: { display: 'flex', backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 600, color: '#22C55E' },
                        children: '+ ' + f,
                      },
                    })),
                  },
                },
              ],
            },
          },
          // ══════ RIGHT COLUMN — Top firms ══════
          {
            type: 'div', props: {
              style: { display: 'flex', flexDirection: 'column', width: '360px', flexShrink: 0 },
              children: [
                { type: 'div', props: { style: { color: '#3D4F63', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', marginBottom: '10px' }, children: 'TOP DISCOUNTS' } },
                ...topFirms.map(f => ({
                  type: 'div', props: {
                    style: { display: 'flex', alignItems: 'center', backgroundColor: '#0B0F16', border: '1px solid #1C2535', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px' },
                    children: [
                      // Firm logo
                      f.icon_url ? {
                        type: 'img', props: {
                          src: 'https://www.marketscoupons.com/' + f.icon_url,
                          width: 36, height: 36,
                          style: { display: 'flex', width: '36px', height: '36px', borderRadius: '8px', marginRight: '12px', flexShrink: 0, objectFit: 'contain', backgroundColor: (f.color || '#F0B429') + '22' },
                        },
                      } : {
                        type: 'div', props: {
                          style: { display: 'flex', width: '36px', height: '36px', borderRadius: '8px', backgroundColor: (f.color || '#F0B429') + '22', justifyContent: 'center', alignItems: 'center', marginRight: '12px', flexShrink: 0 },
                          children: { type: 'span', props: { style: { fontSize: '16px', fontWeight: 900, color: f.color || '#F0B429' }, children: f.name[0] } },
                        },
                      },
                      // Info
                      {
                        type: 'div', props: {
                          style: { display: 'flex', flexDirection: 'column', flex: 1 },
                          children: [
                            { type: 'div', props: { style: { fontSize: '14px', fontWeight: 800, color: '#EDF2F7' }, children: f.name } },
                            { type: 'div', props: { style: { fontSize: '10px', color: '#7A8FA6', marginTop: '2px' }, children: f.type + ' · ' + (f.rating || 0).toFixed(1) + ' Trustpilot · ' + (f.reviews || 0).toLocaleString() + ' reviews' } },
                          ],
                        },
                      },
                      // Discount badge
                      {
                        type: 'div', props: {
                          style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '10px', flexShrink: 0 },
                          children: [
                            { type: 'div', props: { style: { fontSize: '20px', fontWeight: 900, color: '#22C55E' }, children: f.discount + '%' } },
                            { type: 'div', props: { style: { fontSize: '8px', fontWeight: 700, color: '#3D4F63', letterSpacing: '0.5px' }, children: 'OFF' } },
                          ],
                        },
                      },
                    ],
                  },
                })),
              ],
            },
          },
        ],
      },
    });

    // ══════ FOOTER ══════
    sections.push({
      type: 'div', props: {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #1C2535', padding: '14px 40px', width: '100%', flexShrink: 0 },
        children: [
          { type: 'span', props: { style: { fontSize: '13px', fontWeight: 900, color: '#EDF2F7' }, children: 'Markets' } },
          { type: 'span', props: { style: { fontSize: '13px', fontWeight: 900, color: '#F0B429', marginLeft: '3px' }, children: 'Coupons' } },
          { type: 'span', props: { style: { fontSize: '12px', color: '#3D4F63', marginLeft: '16px' }, children: 'www.marketscoupons.com' } },
        ],
      },
    });

    // ══════ GRADIENT BOTTOM BAR ══════
    sections.push({
      type: 'div', props: { style: { display: 'flex', height: '4px', background: 'linear-gradient(90deg, #F0B429, #22C55E, #F0B429)', width: '100%', flexShrink: 0 } }
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
            fontFamily: 'Inter, Arial, sans-serif',
          },
          children: sections,
        },
      },
      { width: 1200, height: 630 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
