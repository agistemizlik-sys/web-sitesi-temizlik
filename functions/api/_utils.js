export function getCorsHeaders(origin, methods = 'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD') {
  const allowed = (origin && (
    origin.endsWith('relaxax.com') ||
    origin.endsWith('pages.dev') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  )) ? origin : '*';

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-RELAXAX-Signature, X-RELAXAX-Trace-ID',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
}

export function handleOptionsCors(request, methods = 'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD') {
  const origin = (request && request.headers) ? request.headers.get('Origin') || '*' : '*';
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin, methods)
  });
}

export function generateTraceId(prefix = 'rlx') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

export function createApiResponse(data, status = 200, origin = '*', traceId = null, extraHeaders = {}) {
  const cors = getCorsHeaders(origin);
  const tId = traceId || generateTraceId();

  const responseBody = typeof data === 'object' && data !== null
    ? { traceId: tId, ...data }
    : { success: true, data, traceId: tId };

  return new Response(JSON.stringify(responseBody, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-RELAXAX-Trace-ID': tId,
      ...cors,
      ...extraHeaders
    }
  });
}

export function createApiError(errorMsg, status = 400, traceId = null, details = null, origin = '*') {
  const cors = getCorsHeaders(origin);
  const tId = traceId || generateTraceId('err');

  const body = {
    success: false,
    error: errorMsg || 'An error occurred',
    traceId: tId
  };

  if (details) body.details = details;

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-RELAXAX-Trace-ID': tId,
      ...cors
    }
  });
}

export async function parseAndValidateJson(request, maxBytes = 15000) {
  try {
    const raw = await request.text();
    if (raw.length > maxBytes) {
      return { error: 'Payload too large', status: 413 };
    }
    if (!raw.trim()) {
      return { data: {} };
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if (parsed.__proto__ || parsed.constructor?.prototype) {
        delete parsed.__proto__;
      }
    }
    return { data: parsed || {} };
  } catch (err) {
    return { error: 'Invalid JSON body format', status: 400 };
  }
}

export function sanitizeString(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().substring(0, maxLen);
}

export function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  const clean = email.toLowerCase().trim().substring(0, 150);
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(clean) ? clean : '';
}

export function sanitizePhone(rawPhone, city = '') {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  digits = digits.replace(/^0+/, '');
  const isPolish = city && city.toLowerCase().includes('warsz');
  if (isPolish && !digits.startsWith('48') && digits.length === 9) {
    return '+48' + digits;
  }
  if (!digits.startsWith('90') && digits.length === 10) {
    return '+90' + digits;
  }
  return digits.startsWith('90') ? '+' + digits : (digits ? '+' + digits : '');
}

export function parseSafeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    const now = new Date();
    return {
      dateObj: now,
      dateString: now.toISOString().split('T')[0],
      isPast: false,
      isToday: true,
      isValid: true
    };
  }

  const cleanStr = dateStr.trim().substring(0, 10);
  const parsed = new Date(cleanStr);

  if (isNaN(parsed.getTime())) {
    const now = new Date();
    return {
      dateObj: now,
      dateString: now.toISOString().split('T')[0],
      isPast: false,
      isToday: true,
      isValid: false
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(parsed);
  targetDate.setHours(0, 0, 0, 0);

  return {
    dateObj: parsed,
    dateString: cleanStr,
    isPast: targetDate.getTime() < today.getTime(),
    isToday: targetDate.getTime() === today.getTime(),
    isValid: true
  };
}

export async function generateHmacSignature(secret, message) {
  if (!secret || !message) return '';
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(typeof message === 'string' ? message : JSON.stringify(message));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    return '';
  }
}
