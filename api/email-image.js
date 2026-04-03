// Vercel Edge Function — Generate dark email image for prop firms
// GET /api/email-image?firm=e2t

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const firmId = searchParams.get('firm');
    if (!firmId) return new Response('Missing ?firm=', { status: 400 });

    // Minimal test first
    return new ImageResponse(
      (
        {
          type: 'div',
          props: {
            children: 'Hello ' + firmId,
            style: {
              display: 'flex',
              fontSize: 40,
              color: 'white',
              background: '#07090D',
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            },
          },
        }
      ),
      { width: 600, height: 400 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
