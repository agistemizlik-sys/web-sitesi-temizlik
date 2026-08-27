import { executeCyberLoopSentinel, scanAllPayloadThreats, sanitizeSafeString, sanitizeKey, dispatchSecurityTrapAlert, createSecurityTrapResponse } from './_security.js';

/**
 * RELAXAX Enterprise Contact & Corporate Inquiry API
 * POST /api/contact & OPTIONS /api/contact
 *
 * Handles customer support tickets, B2B commercial quote requests, and franchise inquiries with SQL Anti-Injection defense.
 */

function sanitizeStr(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().substring(0, maxLen);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const waitUntil = context.waitUntil ? context.waitUntil.bind(context) : null;
  const traceId = `cnt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

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
    const raw = await request.text();
    if (raw.length > 10000) {
      return new Response(JSON.stringify({ success: false, error: "Payload too large", traceId }), {
        status: 413,
        headers
      });
    }

    let body = {};
    try {
      body = JSON.parse(raw);
      if (body && (body.__proto__ || body.constructor?.prototype)) {
        delete body.__proto__;
      }
    } catch(e) {}

    // Autonomous Cyber Loop Sentinel Inspection
    const cyberCheck = await executeCyberLoopSentinel(env, request, body, waitUntil);
    if (cyberCheck.blocked) {
      return cyberCheck.response;
    }

    // Honeypot spam guard
    if (body.website_url || body._hp_check) {
      return new Response(JSON.stringify({ success: true, message: "Message received.", traceId }), {
        status: 200,
        headers
      });
    }

    const name = sanitizeStr(body.name || body.fullName || '', 100);
    const phone = sanitizeStr(body.phone || '', 50);
    const email = sanitizeStr(body.email || '', 100);
    const subject = sanitizeStr(body.subject || 'Genel İletişim', 100);
    const message = sanitizeStr(body.message || body.notes || '', 2000);
    const city = sanitizeStr(body.city || 'Istanbul', 60);
    const company = sanitizeStr(body.company || body.companyName || '', 120);
    const type = sanitizeStr(body.type || 'general', 40);
    const ip = request.headers.get('CF-Connecting-IP') || '';

    if (!name || (!phone && !email) || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required contact fields (name, contact detail, message)",
        traceId
      }), {
        status: 400,
        headers
      });
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

    // Persist to KV / Admin Panel if configured
    if (env && env.LEADS_KV) {
      try {
        const kvP = env.LEADS_KV.put(`ticket:${payload.ticketId}`, JSON.stringify(payload), {
          expirationTtl: 60 * 60 * 24 * 60 // 60 days
        });
        if (waitUntil) waitUntil(kvP);
        else await kvP;
      } catch(e) {}
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        ticketId: payload.ticketId,
        message: "Thank you. Your message has been received. Our team will contact you shortly.",
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
      message: err.message,
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
