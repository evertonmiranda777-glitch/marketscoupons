import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Safe JSON parse: returns parsed JSON or throws with the actual response text
// when it's not valid JSON (e.g. Google returns HTML error pages on 4xx/5xx).
async function safeJson(res: Response, ctx: string) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.slice(0, 300).replace(/\s+/g, ' ');
    throw new Error(`${ctx} returned non-JSON (HTTP ${res.status}): ${snippet}`);
  }
}

async function getAccessToken(): Promise<string> {
  const saRaw = Deno.env.get('GA4_SERVICE_ACCOUNT') || '';
  if (!saRaw) throw new Error('GA4_SERVICE_ACCOUNT secret is empty/unset in Supabase');
  let sa: any;
  try { sa = JSON.parse(saRaw); }
  catch { throw new Error('GA4_SERVICE_ACCOUNT is not valid JSON (check escaping of \\n in private_key)'); }
  if (!sa.private_key || !sa.client_email) throw new Error('GA4_SERVICE_ACCOUNT missing private_key or client_email');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = enc(header) + '.' + enc(claim);

  const pemBody = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsignedToken));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = unsignedToken + '.' + sig;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await safeJson(res, 'OAuth token exchange');
  if (!data.access_token) throw new Error('OAuth refused token: ' + JSON.stringify(data));
  return data.access_token;
}

async function queryGA4(token: string, propertyId: string, body: unknown) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return safeJson(res, `GA4 runReport (property ${propertyId})`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { days = 30, propertyId } = await req.json().catch(() => ({ days: 30 }));
    if (!propertyId) return new Response(JSON.stringify({ error: 'propertyId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = await getAccessToken();
    const dateRange = { startDate: `${days}daysAgo`, endDate: 'today' };

    const [countries, cities, languages, devices, browsers, os, channels, age, gender, timeseries, topPages, sourceMedium, overview, topEvents, landingPages] = await Promise.all([
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'bounceRate' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 30,
      }),
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'city' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 30,
      }),
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'language' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 15,
      }),
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      }),
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'browser' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'operatingSystem' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'userAgeBracket' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'userAgeBracket' } }],
      }),
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'userGender' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      }),
      // TIMESERIES — daily users/sessions/new users
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'newUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      // TOP PAGES — most viewed pages
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 20,
      }),
      // SOURCE/MEDIUM — granular attribution
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'sessionSourceMedium' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'bounceRate' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      }),
      // OVERVIEW — rich totals (single row, no dimensions)
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        metrics: [
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'eventCount' },
          { name: 'conversions' },
          { name: 'userEngagementDuration' },
        ],
      }),
      // TOP EVENTS — custom events ranked
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 20,
      }),
      // LANDING PAGES — entry pages
      queryGA4(token, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'landingPage' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'bounceRate' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15,
      }),
    ]);

    const parse = (report: any) => {
      if (!report?.rows) return [];
      return report.rows.map((r: any) => ({
        dim: r.dimensionValues?.[0]?.value || '(not set)',
        users: parseInt(r.metricValues?.[0]?.value || '0'),
        sessions: parseInt(r.metricValues?.[1]?.value || '0'),
        bounceRate: parseFloat(r.metricValues?.[2]?.value || '0'),
      }));
    };

    const parseTimeseries = (report: any) => {
      if (!report?.rows) return [];
      return report.rows.map((r: any) => ({
        date: r.dimensionValues?.[0]?.value || '',
        users: parseInt(r.metricValues?.[0]?.value || '0'),
        sessions: parseInt(r.metricValues?.[1]?.value || '0'),
        newUsers: parseInt(r.metricValues?.[2]?.value || '0'),
        pageViews: parseInt(r.metricValues?.[3]?.value || '0'),
      }));
    };

    const parseTopPages = (report: any) => {
      if (!report?.rows) return [];
      return report.rows.map((r: any) => ({
        path: r.dimensionValues?.[0]?.value || '',
        title: r.dimensionValues?.[1]?.value || '',
        views: parseInt(r.metricValues?.[0]?.value || '0'),
        users: parseInt(r.metricValues?.[1]?.value || '0'),
        avgDuration: parseFloat(r.metricValues?.[2]?.value || '0'),
      }));
    };

    const parseSourceMedium = (report: any) => {
      if (!report?.rows) return [];
      return report.rows.map((r: any) => ({
        dim: r.dimensionValues?.[0]?.value || '(not set)',
        users: parseInt(r.metricValues?.[0]?.value || '0'),
        sessions: parseInt(r.metricValues?.[1]?.value || '0'),
        bounceRate: parseFloat(r.metricValues?.[2]?.value || '0'),
        engagementRate: parseFloat(r.metricValues?.[3]?.value || '0'),
      }));
    };

    const parseTopEvents = (report: any) => {
      if (!report?.rows) return [];
      return report.rows.map((r: any) => ({
        dim: r.dimensionValues?.[0]?.value || '(not set)',
        count: parseInt(r.metricValues?.[0]?.value || '0'),
        users: parseInt(r.metricValues?.[1]?.value || '0'),
      }));
    };

    const parseLandingPages = (report: any) => {
      if (!report?.rows) return [];
      return report.rows.map((r: any) => ({
        path: r.dimensionValues?.[0]?.value || '',
        sessions: parseInt(r.metricValues?.[0]?.value || '0'),
        users: parseInt(r.metricValues?.[1]?.value || '0'),
        bounceRate: parseFloat(r.metricValues?.[2]?.value || '0'),
        engagementRate: parseFloat(r.metricValues?.[3]?.value || '0'),
      }));
    };

    // Rich overview totals from dedicated query (more accurate than summing countries)
    const ovRow = overview?.rows?.[0]?.metricValues || [];
    const totals = {
      users: parseInt(ovRow[0]?.value || '0'),
      newUsers: parseInt(ovRow[1]?.value || '0'),
      sessions: parseInt(ovRow[2]?.value || '0'),
      pageViews: parseInt(ovRow[3]?.value || '0'),
      engagementRate: parseFloat(ovRow[4]?.value || '0'),
      avgSessionDuration: parseFloat(ovRow[5]?.value || '0'),
      bounceRate: parseFloat(ovRow[6]?.value || '0'),
      eventCount: parseInt(ovRow[7]?.value || '0'),
      conversions: parseInt(ovRow[8]?.value || '0'),
      userEngagementDuration: parseFloat(ovRow[9]?.value || '0'),
    };
    const _sessions = totals.sessions || 1;
    totals.avgEngagedTime = totals.userEngagementDuration / _sessions;

    const result = {
      countries: parse(countries),
      cities: parse(cities),
      languages: parse(languages),
      devices: parse(devices),
      browsers: parse(browsers),
      os: parse(os),
      channels: parse(channels),
      age: parse(age),
      gender: parse(gender),
      timeseries: parseTimeseries(timeseries),
      topPages: parseTopPages(topPages),
      sourceMedium: parseSourceMedium(sourceMedium),
      topEvents: parseTopEvents(topEvents),
      landingPages: parseLandingPages(landingPages),
      totals,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
