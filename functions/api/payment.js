import { executeCyberLoopSentinel } from './_security.js';
import { createApiResponse, createApiError, handleOptionsCors, parseAndValidateJson, generateTraceId, sanitizeString, sanitizeEmail, sanitizePhone, generateHmacSignature, getCorsHeaders } from './_utils.js';

const sanitizeStr = sanitizeString;

/**
 * RELAXAX Enterprise Payment Gateway API Endpoint
 * POST /api/payment - Create payment session or handle provider webhook
 * GET /api/payment?sessionId=... - Check payment status
 */

const SUPPORTED_CURRENCIES = ['TRY', 'TL', 'PLN', 'EUR', 'USD'];
const SUPPORTED_PROVIDERS = ['paytr', 'iyzico', 'stripe', 'blik', 'bank_transfer'];

export async function onRequestOptions(context) {
  return handleOptionsCors(context.request, 'GET, POST, OPTIONS');
}

// GET /api/payment?sessionId=... OR ?orderCode=...
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId') || url.searchParams.get('id');
  const orderCode = url.searchParams.get('orderCode') || url.searchParams.get('code');
  const origin = request.headers.get('Origin') || '*';
  const traceId = generateTraceId('pay');

  if (!sessionId && !orderCode) {
    return createApiError('Session ID veya Order Code gereklidir.', 400, traceId, null, origin);
  }

  const lookupKey = sessionId ? `payment_sess:${sanitizeStr(sessionId, 64)}` : `payment_order:${sanitizeStr(orderCode, 40)}`;

  let paymentRecord = null;
  if (env && env.LEADS_KV) {
    try {
      paymentRecord = await env.LEADS_KV.get(lookupKey, 'json');
    } catch (e) {
      console.warn('[PAYMENT_KV_GET_WARN]', e);
    }
  }

  if (!paymentRecord) {
    return createApiResponse({
      status: 'pending',
      message: 'Odeme kaydi henuz tamamlanmadi veya dogrulama bekleniyor.',
      sessionId: sessionId || null,
      orderCode: orderCode || null
    }, 200, origin, traceId);
  }

  return createApiResponse({
    success: true,
    payment: paymentRecord
  }, 200, origin, traceId);
}

// POST /api/payment - Initiate Payment or Process Webhook
export async function onRequestPost(context) {
  const { request, env } = context;
  const waitUntil = context.waitUntil ? context.waitUntil.bind(context) : null;
  const origin = request.headers.get('Origin') || '*';
  const traceId = generateTraceId('pay');

  try {
    const { data: body, error, status } = await parseAndValidateJson(request, 15000);
    if (error) return createApiError(error, status, traceId, null, origin);

    // Autonomous Cyber Sentinel Inspection
    const cyberCheck = await executeCyberLoopSentinel(env, request, body, waitUntil);
    if (cyberCheck.blocked) return cyberCheck.response;

    const action = sanitizeStr(body.action || 'create_session', 32);

    // ── 1. PROVIDER WEBHOOK / CALLBACK HANDLER ──
    if (action === 'webhook' || body.payment_status || body.merchant_oid) {
      const orderCode = sanitizeStr(body.orderCode || body.merchant_oid || body.order_id || '', 60);
      const statusStr = sanitizeStr(body.status || body.payment_status || 'success', 30).toLowerCase();
      const isSuccess = statusStr === 'success' || statusStr === 'approved' || statusStr === 'paid';

      const updateData = {
        orderCode,
        status: isSuccess ? 'paid' : 'failed',
        paidAt: isSuccess ? new Date().toISOString() : null,
        provider: sanitizeStr(body.provider || 'paytr', 30),
        transactionId: sanitizeStr(body.transaction_id || body.payment_id || `TX-${Date.now()}`, 64),
        amount: Number(body.amount || body.total_amount || 0)
      };

      if (env && env.LEADS_KV && orderCode) {
        try {
          await env.LEADS_KV.put(`payment_order:${orderCode}`, JSON.stringify(updateData), { expirationTtl: 86400 * 30 });
          const existingOrder = await env.LEADS_KV.get(`order:${orderCode}`, 'json');
          if (existingOrder) {
            existingOrder.status = isSuccess ? 'Odendi' : 'Odeme Basarisiz';
            existingOrder.paymentDetails = updateData;
            await env.LEADS_KV.put(`order:${orderCode}`, JSON.stringify(existingOrder), { expirationTtl: 86400 * 90 });
          }
        } catch (e) {
          console.warn('[PAYMENT_WEBHOOK_KV_WARN]', e);
        }
      }

      return createApiResponse({
        success: isSuccess,
        status: updateData.status,
        orderCode
      }, 200, origin, traceId);
    }

    // ── 2. CREATE PAYMENT SESSION ──
    const orderCode = sanitizeStr(body.orderCode || body.resCode || `RLX-${Date.now().toString(36).toUpperCase()}`, 40);
    const amount = Math.max(0, Number(body.amount || body.totalPrice || body.price || 0));
    const currency = sanitizeStr(body.currency || 'TL', 10).toUpperCase();
    const provider = sanitizeStr(body.provider || 'paytr', 30).toLowerCase();
    const customerName = sanitizeStr(body.customerName || body.name || 'Musteri', 100);
    const customerEmail = sanitizeEmail(body.customerEmail || body.email || '');
    const customerPhone = sanitizePhone(body.customerPhone || body.phone || '', body.city || '');

    if (amount <= 0) {
      return createApiError('Gecerli bir odeme tutari belirtilmelidir.', 400, traceId, null, origin);
    }

    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const secretKey = (env && env.PAYMENT_SECRET) || 'relaxax_payment_jwt_secret_2026';
    const rawPayload = `${sessionId}:${orderCode}:${amount}:${currency}`;
    const tokenSignature = await generateHmacSignature(secretKey, rawPayload);

    const sessionData = {
      sessionId,
      orderCode,
      amount,
      currency,
      provider: SUPPORTED_PROVIDERS.includes(provider) ? provider : 'paytr',
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone
      },
      token: tokenSignature,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    if (env && env.LEADS_KV) {
      try {
        await env.LEADS_KV.put(`payment_sess:${sessionId}`, JSON.stringify(sessionData), { expirationTtl: 1800 });
        await env.LEADS_KV.put(`payment_order:${orderCode}`, JSON.stringify(sessionData), { expirationTtl: 86400 });
      } catch (e) {
        console.warn('[PAYMENT_KV_SET_WARN]', e);
      }
    }

    return createApiResponse({
      success: true,
      sessionId,
      orderCode,
      amount,
      currency,
      token: tokenSignature,
      checkoutUrl: `/checkout?session=${sessionId}`,
      expiresInSeconds: 1800
    }, 201, origin, traceId);

  } catch (err) {
    return createApiError(err.message || 'Odeme oturumu baslatilamadi.', 500, traceId, null, origin);
  }
}
