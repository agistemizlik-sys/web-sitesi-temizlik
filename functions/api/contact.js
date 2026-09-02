import { executeCyberLoopSentinel } from './_security.js';
import { createApiResponse, createApiError, handleOptionsCors, parseAndValidateJson, generateTraceId, sanitizeString, sanitizeEmail, sanitizePhone } from './_utils.js';

/**
 * RELAXAX Enterprise Contact & Corporate Inquiry API
 * POST /api/contact & OPTIONS /api/contact
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const waitUntil = context.waitUntil ? context.waitUntil.bind(context) : null;
  const origin = request.headers.get('Origin') || '*';
  const traceId = generateTraceId('cnt');

  try {
    const { data: body, error, status } = await parseAndValidateJson(request, 10000);
    if (error) return createApiError(error, status, traceId, null, origin);

    // Autonomous Cyber Loop Sentinel Inspection
    const cyberCheck = await executeCyberLoopSentinel(env, request, body, waitUntil);
    if (cyberCheck.blocked) {
      return cyberCheck.response;
    }

    // Honeypot spam guard
    if (body.website_url || body._hp_check) {
      return createApiResponse({ success: true, message: "Message received." }, 200, origin, traceId);
    }

    const name = sanitizeString(body.name || body.fullName || '', 100);
    const phone = sanitizePhone(body.phone || '', body.city || '');
    const email = sanitizeEmail(body.email || '');
    const subject = sanitizeString(body.subject || 'Genel İletişim', 100);
    const message = sanitizeString(body.message || body.notes || '', 2000);
    const city = sanitizeString(body.city || 'Istanbul', 60);
    const company = sanitizeString(body.company || body.companyName || '', 120);
    const type = sanitizeString(body.type || 'general', 40);
    const ip = request.headers.get('CF-Connecting-IP') || '';

    if (!name || (!phone && !email) || !message) {
      return createApiError("Missing required contact fields (name, contact detail, message)", 400, traceId, null, origin);
    }

    const payload = {
      ticketId: `TCK-${Date.now().toString(36).toUpperCase()}`,
      name,
      phone,
      email,
      subject,
      message,
      city,
      company,
      type,
      ip,
      createdAt: new Date().toISOString()
    };

    // Persist to KV
    if (env && env.LEADS_KV) {
      try {
        const kvP = env.LEADS_KV.put(`ticket:${payload.ticketId}`, JSON.stringify(payload), {
          expirationTtl: 60 * 60 * 24 * 60 // 60 days
        });
        if (waitUntil) waitUntil(kvP);
        else await kvP;
      } catch(e) {}
    }

    // Forward to Company Panel at 64.177.116.243
    try {
      const panelP = fetch('http://64.177.116.243/api/webhook/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Cloudflare-ContactRelay' },
        body: JSON.stringify({
          fullName: payload.name,
          phone: payload.phone,
          email: payload.email,
          city: payload.city,
          serviceType: `İletişim & Kurumsal Talep (${payload.subject})`,
          message: payload.message,
          source: 'relaxax.com / İletişim Masası',
          status: 'pending_approval',
          currentStep: 'WAITING_APPROVAL'
        })
      }).catch(() => {});
      if (waitUntil) waitUntil(panelP);
    } catch(err) {}

    return createApiResponse({
      success: true,
      data: {
        ticketId: payload.ticketId,
        message: "Thank you. Your message has been received. Our team will contact you shortly."
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
