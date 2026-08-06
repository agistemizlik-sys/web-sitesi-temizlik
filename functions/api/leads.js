/**
 * Cloudflare Pages Function Relay for Lead API
 * POST /api/leads
 * Relays lead payload to panel backend server (http://45.76.83.185/api/leads)
 * preventing Mixed Content / CORS issues on HTTPS.
 */

export async function onRequestPost(context) {
  const { request } = context;

  try {
    const rawBody = await request.text();
    if (rawBody.length > 20_000) {
      return new Response(JSON.stringify({ success: false, error: "Payload too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" }
      });
    }

    const panelEndpoint = "http://64.177.116.243/api/leads";
    
    const response = await fetch(panelEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "hc_live_7x9f2m4a1v8"
      },
      body: rawBody
    });

    const resText = await response.text();
    return new Response(resText, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      "Access-Control-Max-Age": "86400"
    }
  });
}
