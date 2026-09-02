import { hasSqlInjection } from './_security.js';
import { createApiResponse, createApiError, handleOptionsCors, parseAndValidateJson, generateTraceId, sanitizeEmail, sanitizeString } from './_utils.js';

/**
 * RELAXAX Enterprise Newsletter & VIP Hygiene Club API
 * POST /api/newsletter & OPTIONS /api/newsletter
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  const traceId = generateTraceId('nl');

  try {
    const { data: body, error, status } = await parseAndValidateJson(request, 4096);
    if (error) return createApiError(error, status, traceId, null, origin);

    const email = sanitizeEmail(body.email);
    const lang = sanitizeString(body.lang || 'tr', 10).toLowerCase();

    if (hasSqlInjection(email) || hasSqlInjection(lang)) {
      return createApiError("Security Alert: Invalid characters detected", 400, traceId, null, origin);
    }

    if (!email) {
      return createApiError(
        lang === 'pl' ? "Proszę podać poprawny adres e-mail." : "Geçerli bir e-posta adresi giriniz.",
        400,
        traceId,
        null,
        origin
      );
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

    return createApiResponse({
      success: true,
      data: {
        message: lang === 'pl' 
          ? "Dziękujemy! Twój kod rabatowy 10%: RELAX10" 
          : "Teşekkürler! %10 Tanışma İndirim Kodunuz: RELAX10",
        couponCode: "RELAX10",
        discountPercent: 10
      }
    }, 200, origin, traceId);

  } catch(err) {
    return createApiError("Internal server error", 500, traceId, err.message, origin);
  }
}

export async function onRequestOptions(context) {
  return handleOptionsCors(context.request, "POST, OPTIONS");
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  if (context.request.method === "OPTIONS") return onRequestOptions(context);
  return createApiError("Method not allowed. Use POST.", 405, null, null, context.request.headers.get('Origin') || '*');
}
