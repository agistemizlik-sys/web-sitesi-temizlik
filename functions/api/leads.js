/**
 * Cloudflare Pages Function Relay for Lead API
 * /api/leads
 * Relays lead payload to panel backend server (https://panel.acleanserwis.com/api/leads)
 * preventing Mixed Content / CORS issues on HTTPS.
 */

const PANEL_ENDPOINT = "https://panel.acleanserwis.com/api/leads";

export async function onRequestPost(context) {
  const { request } = context;
  try {
    const rawBody = await request.text();
    const response = await fetch(PANEL_ENDPOINT, {
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
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
      "Access-Control-Max-Age": "86400"
    }
  });
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  if (context.request.method === "OPTIONS") return onRequestOptions();
  return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
