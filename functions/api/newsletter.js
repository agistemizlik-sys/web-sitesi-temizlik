import { hasSqlInjection, sanitizeKey } from './_security.js';

/**
 * RELAXAX Enterprise Newsletter & VIP Hygiene Club API
 * POST /api/newsletter & OPTIONS /api/newsletter
 *
 * Collects emails for exclusive promo coupons, seasonal offers, and cleaning tips with SQL injection protection.
 */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').toLowerCase().trim());
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const traceId = `nl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  const origin = request.headers.get('Origin') || '*';
  const allowedOrigin = (origin && (origin.endsWith('relaxax.com') || origin.endsWith('pages.dev') || origin.includes('localhost')))
    ? origin
    : '*';

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, X-RELAXAX-Trace-ID",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-RELAXAX-Trace-ID": traceId
  };

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').toLowerCase().trim();
    const lang = String(body.lang || 'tr').toLowerCase();

    if (hasSqlInjection(email) || hasSqlInjection(lang)) {
      return new Response(JSON.stringify({
        success: false,
        error: "Security Alert: Invalid characters detected",
        traceId
      }), {
        status: 400,
        headers
      });
    }

    if (!isValidEmail(email) || email.length > 120) {
      return new Response(JSON.stringify({
        success: false,
        error: lang === 'pl' ? "Proszę podać poprawny adres e-mail." : "Geçerli bir e-posta adresi giriniz.",
        traceId
      }), {
        status: 400,
        headers
      });
    }

    // Persist subscriber to KV if available
    if (env && env.LEADS_KV) {
      try {
        await env.LEADS_KV.put(`newsletter:${email}`, JSON.stringify({
          email,
          lang,
          subscribedAt: new Date().toISOString(),
          ip: request.headers.get('CF-Connecting-IP') || ''
        }));
      } catch(e) {}
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        message: lang === 'pl' 
          ? "Dziękujemy! Twój kod rabatowy 10%: RELAX10" 
          : "Teşekkürler! %10 Tanışma İndirim Kodunuz: RELAX10",
        couponCode: "RELAX10",
        discountPercent: 10,
        traceId
      }
    }, null, 2), {
      status: 200,
      headers
    });

  } catch(err) {
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error",
      traceId
    }), {
      status: 500,
      headers
    });
  }
}

export async function onRequestOptions(context) {
  const origin = (context && context.request) ? context.request.headers.get('Origin') : '';
  const allowedOrigin = (origin && (origin.endsWith('relaxax.com') || origin.endsWith('pages.dev') || origin.includes('localhost')))
    ? origin
    : '*';

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, X-RELAXAX-Trace-ID",
      "Access-Control-Max-Age": "86400"
    }
  });
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  if (context.request.method === "OPTIONS") return onRequestOptions(context);
  return new Response(JSON.stringify({ success: false, error: "Method not allowed. Use POST." }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
