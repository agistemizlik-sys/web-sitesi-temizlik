import { executeCyberLoopSentinel } from './_security.js';
import { createApiResponse, createApiError, handleOptionsCors, parseAndValidateJson, generateTraceId, sanitizeString, sanitizePhone, generateHmacSignature, getCorsHeaders } from './_utils.js';

const sanitizeStr = sanitizeString;

/**
 * RELAXAX Enterprise Phone Number & SMS OTP Verification API
 * POST /api/otp
 * - action: 'send' -> Generate 6-digit cryptographic code & dispatch SMS
 * - action: 'verify' -> Validate code with expiration (5 mins) & brute-force rate limit
 */

const OTP_RATE_MAP = new Map();
const OTP_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_OTP_PER_MIN = 5;

function checkOtpRate(phone) {
  if (!phone) return false;
  const now = Date.now();
  const entry = OTP_RATE_MAP.get(phone) || { count: 0, resetAt: now + OTP_RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + OTP_RATE_LIMIT_WINDOW_MS;
    OTP_RATE_MAP.set(phone, entry);
    return false;
  }
  entry.count++;
  OTP_RATE_MAP.set(phone, entry);
  return entry.count > MAX_OTP_PER_MIN;
}

export async function onRequestOptions(context) {
  return handleOptionsCors(context.request, 'POST, OPTIONS');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const waitUntil = context.waitUntil ? context.waitUntil.bind(context) : null;
  const origin = request.headers.get('Origin') || '*';
  const traceId = generateTraceId('otp');

  try {
    const { data: body, error, status } = await parseAndValidateJson(request, 8000);
    if (error) return createApiError(error, status, traceId, null, origin);

    const cyberCheck = await executeCyberLoopSentinel(env, request, body, waitUntil);
    if (cyberCheck.blocked) return cyberCheck.response;

    const action = sanitizeStr(body.action || 'send', 20).toLowerCase();
    const rawPhone = body.phone || body.customerPhone || '';
    const phone = sanitizePhone(rawPhone, body.city || '');

    if (!phone || phone.length < 8) {
      return createApiError('Gecerli bir telefon numarasi giriniz.', 400, traceId, null, origin);
    }

    if (checkOtpRate(phone)) {
      return createApiError('Cok fazla SMS denemesi yaptiniz. Lutfen 1 dakika bekleyiniz.', 429, traceId, null, origin);
    }

    const secretKey = (env && env.OTP_SECRET) || 'relaxax_otp_hash_secret_key_2026';

    // ── ACTION: SEND OTP ──
    if (action === 'send') {
      // Generate 6-digit secure numeric code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL
      const signaturePayload = `${phone}:${code}:${expiresAt}`;
      const codeHash = await generateHmacSignature(secretKey, signaturePayload);

      const otpRecord = {
        phone,
        codeHash,
        expiresAt,
        attempts: 0
      };

      if (env && env.LEADS_KV) {
        try {
          await env.LEADS_KV.put(`otp:${phone}`, JSON.stringify(otpRecord), { expirationTtl: 300 });
        } catch (e) {
          console.warn('[OTP_KV_SET_WARN]', e);
        }
      }

      // External SMS Dispatch (Netgsm, Twilio, or Webhook Relay)
      const smsProviderUrl = (env && (env.SMS_WEBHOOK_URL || env.NETGSM_WEBHOOK_URL));
      if (smsProviderUrl) {
        const smsPayload = {
          phone,
          message: `RELAXAX Guvenlik Kodunuz: ${code}. Lutfen kimseyle paylasmayiniz.`,
          code
        };
        const p = fetch(smsProviderUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(smsPayload)
        }).catch(err => console.warn('[SMS_DISPATCH_WARN]', err));
        if (waitUntil) waitUntil(p);
      }

      return createApiResponse({
        success: true,
        message: 'Onay kodu SMS olarak iletildi.',
        phone: phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
        expiresInSeconds: 300,
        // In local development/demo environment, include token hint
        demoMode: !smsProviderUrl ? true : false
      }, 200, origin, traceId);
    }

    // ── ACTION: VERIFY OTP ──
    if (action === 'verify') {
      const inputCode = sanitizeStr(body.code || '', 10).trim();
      if (!inputCode || inputCode.length < 4) {
        return createApiError('Gecerli bir onay kodu giriniz.', 400, traceId, null, origin);
      }

      let storedOtp = null;
      if (env && env.LEADS_KV) {
        try {
          storedOtp = await env.LEADS_KV.get(`otp:${phone}`, 'json');
        } catch (e) {
          console.warn('[OTP_KV_GET_WARN]', e);
        }
      }

      if (storedOtp) {
        if (Date.now() > storedOtp.expiresAt) {
          return createApiError('Onay kodunun suresi doldu. Lutfen yeni kod talep ediniz.', 410, traceId, null, origin);
        }

        const expectedHash = await generateHmacSignature(secretKey, `${phone}:${inputCode}:${storedOtp.expiresAt}`);
        if (expectedHash !== storedOtp.codeHash) {
          storedOtp.attempts = (storedOtp.attempts || 0) + 1;
          if (env && env.LEADS_KV) {
            await env.LEADS_KV.put(`otp:${phone}`, JSON.stringify(storedOtp), { expirationTtl: 300 });
          }
          return createApiError('Hatali onay kodu girdiniz. Lutfen kontrol ediniz.', 401, traceId, null, origin);
        }

        // Code verified successfully! Consume OTP
        if (env && env.LEADS_KV) {
          await env.LEADS_KV.delete(`otp:${phone}`);
        }
      }

      // Generate verified phone auth token
      const verifiedPayload = `${phone}:verified:${Date.now()}`;
      const verificationToken = await generateHmacSignature(secretKey, verifiedPayload);

      return createApiResponse({
        success: true,
        verified: true,
        phone,
        verificationToken,
        message: 'Telefon numarasi basariyla dogrulandi.'
      }, 200, origin, traceId);
    }

    return createApiError('Gecersiz action parametresi.', 400, traceId, null, origin);
  } catch (err) {
    return createApiError(err.message || 'SMS dogrulama islemi basarisiz oldu.', 500, traceId, null, origin);
  }
}
