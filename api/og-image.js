// Vercel Edge Function — Generate OG image for social sharing
// GET /api/og-image

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler() {
  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #07090D 0%, #0D1117 40%, #111820 100%)',
          fontFamily: 'Inter, Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          // Subtle grid overlay
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              },
            },
          },
          // Top gold line
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #F0B429, transparent)',
              },
            },
          },
          // Glow effect
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '-100px',
                right: '-100px',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(240,180,41,0.08) 0%, transparent 70%)',
              },
            },
          },
          // Logo text
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'baseline',
                marginBottom: '16px',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: { color: '#EDF2F7', fontSize: '64px', fontWeight: 800, letterSpacing: '-1px' },
                    children: 'Markets',
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: { color: '#F0B429', fontSize: '64px', fontWeight: 800, letterSpacing: '-1px' },
                    children: 'Coupons',
                  },
                },
              ],
            },
          },
          // Divider
          {
            type: 'div',
            props: {
              style: {
                width: '80px',
                height: '3px',
                background: 'linear-gradient(90deg, #F0B429, rgba(240,180,41,0.3))',
                borderRadius: '2px',
                marginBottom: '20px',
              },
            },
          },
          // Subtitle
          {
            type: 'div',
            props: {
              style: {
                color: '#7A8FA6',
                fontSize: '24px',
                fontWeight: 500,
                marginBottom: '32px',
                letterSpacing: '0.5px',
              },
              children: 'Exclusive Prop Firm Coupons & Discounts',
            },
          },
          // Stats row
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                gap: '40px',
                alignItems: 'center',
              },
              children: [
                // Stat 1
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '16px 28px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                    },
                    children: [
                      { type: 'div', props: { style: { color: '#F0B429', fontSize: '32px', fontWeight: 800 }, children: '90%' } },
                      { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '13px', fontWeight: 500, marginTop: '4px' }, children: 'MAX DISCOUNT' } },
                    ],
                  },
                },
                // Stat 2
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '16px 28px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                    },
                    children: [
                      { type: 'div', props: { style: { color: '#22C55E', fontSize: '32px', fontWeight: 800 }, children: '11+' } },
                      { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '13px', fontWeight: 500, marginTop: '4px' }, children: 'PROP FIRMS' } },
                    ],
                  },
                },
                // Stat 3
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '16px 28px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                    },
                    children: [
                      { type: 'div', props: { style: { color: '#EDF2F7', fontSize: '32px', fontWeight: 800 }, children: 'FREE' } },
                      { type: 'div', props: { style: { color: '#7A8FA6', fontSize: '13px', fontWeight: 500, marginTop: '4px' }, children: 'DAILY ANALYSIS' } },
                    ],
                  },
                },
              ],
            },
          },
          // Bottom URL
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '24px',
                color: '#3D4F63',
                fontSize: '16px',
                fontWeight: 500,
                letterSpacing: '1px',
              },
              children: 'www.marketscoupons.com',
            },
          },
        ],
      },
    },
    { width: 1200, height: 630 }
  );
}
