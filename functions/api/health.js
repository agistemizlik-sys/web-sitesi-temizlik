/**
 * RELAXAX Enterprise Backend Health Check & Telemetry Endpoint
 * GET /api/health & HEAD /api/health
 */

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';

  const allowedOrigin = (origin && (origin.endsWith('relaxax.com') || origin.endsWith('pages.dev') || origin.includes('localhost')))
    ? origin
    : '*';

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, X-RELAXAX-Trace-ID",
    "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const cf = request.cf || {};
  const traceId = `hlth-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  const responsePayload = {
    status: "healthy",
    code: 200,
    service: "RELAXAX Global Edge Serverless Engine",
    version: "3.5.0-enterprise",
    timestamp: new Date().toISOString(),
    traceId,
    runtime: {
      platform: "cloudflare_pages_functions",
      datacenter: cf.colo || "EDGE-GLOBAL",
      country: cf.country || "GLOBAL",
      city: cf.city || "EDGE",
      timezone: cf.timezone || "UTC",
      httpProtocol: cf.httpProtocol || "HTTP/2",
      asn: cf.asn || null,
      asOrganization: cf.asOrganization || null
    },
    capabilities: {
      multiTierRelay: true,
      directPanelSync: true,
      kvPersistence: Boolean(env && env.LEADS_KV),
      serverSideConversions: Boolean(env && env.META_PIXEL_ID && env.META_CAPI_ACCESS_TOKEN),
      geoEnrichment: true,
      dynamicPrerender: true,
      cryptographicQuoteVerification: true
    },
    endpoints: [
      { path: "/api/leads", methods: ["POST", "OPTIONS"], desc: "Lead dispatch, validation, multi-channel notification & KV persistence relay" },
      { path: "/api/quote", methods: ["POST", "OPTIONS"], desc: "Authoritative server-side price calculation & HMAC cryptographic quote token generator" },
      { path: "/api/promo", methods: ["POST", "OPTIONS"], desc: "Multi-currency discount & coupon code verification engine with anti brute-force" },
      { path: "/api/availability", methods: ["GET", "POST", "OPTIONS"], desc: "Real-time date and hourly time-slot capacity engine" },
      { path: "/api/contact", methods: ["POST", "OPTIONS"], desc: "Customer support tickets, B2B commercial quotes & franchise applications" },
      { path: "/api/reviews", methods: ["GET", "HEAD", "OPTIONS"], desc: "Verified customer ratings, sentiment score & localized reviews catalog" },
      { path: "/api/newsletter", methods: ["POST", "OPTIONS"], desc: "VIP Hygiene Club coupon generation & email collector" },
      { path: "/api/services", methods: ["GET", "HEAD", "OPTIONS"], desc: "Multi-currency service catalog, extras & regional pricing tables" },
      { path: "/api/conversion", methods: ["POST", "OPTIONS"], desc: "Server-side Meta Conversions API & GA4 Measurement Protocol relay" },
      { path: "/api/health", methods: ["GET", "HEAD", "OPTIONS"], desc: "System diagnostics, capability flags & edge status monitor" }
    ]
  };

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(JSON.stringify(responsePayload, null, 2), {
    status: 200,
    headers
  });
}
