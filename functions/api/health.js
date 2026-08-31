/**
 * @fileoverview RELAXAX Enterprise Backend Health Check & Telemetry Endpoint
 * GET /api/health & HEAD /api/health
 */

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  const allowedOrigin = (origin && (origin.endsWith('relaxax.com') || origin.endsWith('pages.dev') || origin.includes('localhost') || origin.includes('127.0.0.1')))
    ? origin
    : '*';

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, X-RELAXAX-Trace-ID",
    "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const t0 = Date.now();
  let panelStatus = 'UNKNOWN';
  let panelLatencyMs = 0;

  // Probe Company Panel at 64.177.116.243
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 2500);
    const probeStart = Date.now();
    const panelResp = await fetch('http://64.177.116.243/api/sync-all', {
      headers: { 'User-Agent': 'Cloudflare-Worker-HealthProbe' },
      signal: ctrl.signal
    });
    clearTimeout(tid);
    panelLatencyMs = Date.now() - probeStart;
    panelStatus = panelResp.ok ? 'CONNECTED_AND_SYNCED' : `HTTP_${panelResp.status}`;
  } catch (err) {
    panelStatus = `FAILED (${err.message || 'TIMEOUT'})`;
  }

  const cfData = request.cf || {};

  const healthPayload = {
    status: 'UP_AND_HEALTHY',
    service: 'RELAXAX Enterprise Edge Gateway',
    version: 'v2.5.0-clean',
    timestamp: new Date().toISOString(),
    panelIntegration: {
      targetServer: 'http://64.177.116.243/',
      status: panelStatus,
      latencyMs: panelLatencyMs
    },
    edge: {
      colo: cfData.colo || 'LOCAL_EDGE',
      country: cfData.country || 'TR',
      city: cfData.city || 'Istanbul',
      httpProtocol: cfData.httpProtocol || 'HTTP/2'
    },
    kvStorage: {
      leadsKvBound: !!(env && env.LEADS_KV),
      status: (env && env.LEADS_KV) ? 'CONNECTED' : 'STANDBY_HYBRID'
    },
    totalDurationMs: Date.now() - t0
  };

  return new Response(JSON.stringify(healthPayload, null, 2), {
    status: 200,
    headers
  });
}
