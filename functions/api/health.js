/**
 * RELAXAX Backend Health Check API Endpoint
 * GET /api/health & HEAD /api/health
 */

export async function onRequest(context) {
  const origin = context.request.headers.get('Origin') || '*';

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    "Cache-Control": "no-cache, no-store, must-revalidate"
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const responsePayload = {
    status: "ok",
    service: "RELAXAX Enterprise Backend API",
    version: "2.5.0",
    environment: "cloudflare_pages_functions",
    timestamp: new Date().toISOString(),
    region: context.request.cf ? context.request.cf.colo : "UNKNOWN"
  };

  if (context.request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(JSON.stringify(responsePayload), {
    status: 200,
    headers
  });
}
