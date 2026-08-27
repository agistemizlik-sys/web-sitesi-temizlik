import { scanPayloadForInjection } from './_security.js';

/**
 * RELAXAX Enterprise Promo & Referral Validation Engine
 * POST /api/promo
 */

const PROMO_CODES = {
  "RELAX20": {
    discount: 20,
    type: "percent",
    title: { tr: "%20 İndirim", en: "20% Discount", pl: "20% Rabatu", uk: "Знижка 20%" },
    minAmount: 0,
    maxDiscount: 1000
  },
  "BAHAR15": {
    discount: 15,
    type: "percent",
    title: { tr: "%15 Bahar Temizliği İndirimi", en: "15% Spring Discount", pl: "15% Rabatu Wiosennego", uk: "Весняна знижка 15%" },
    minAmount: 0,
    maxDiscount: 750
  },
  "PROMO10": {
    discount: 10,
    type: "percent",
    title: { tr: "%10 Tanışma İndirimi", en: "10% Welcome Discount", pl: "10% Rabatu Powitalnego", uk: "Знижка 10%" },
    minAmount: 0,
    maxDiscount: 500
  },
  "PL10": {
    discount: 10,
    type: "percent",
    title: { tr: "%10 Polonya Özel İndirimi", en: "10% Poland Special Discount", pl: "10% Rabatu dla Warszawy", uk: "Спеціальна знижка 10%" },
    minAmount: 0,
    maxDiscount: 100
  },
  "WARSZAWA20": {
    discount: 20,
    type: "percent",
    title: { tr: "%20 Varşova Açılış İndirimi", en: "20% Warsaw Launch Discount", pl: "20% Rabatu na start w Warszawie", uk: "Знижка 20% у Варшаві" },
    minAmount: 0,
    maxDiscount: 150
  },
  "HOSGELDIN": {
    discount: { TL: 250, PLN: 35 },
    type: "fixed",
    title: { tr: "250 TL Hoş Geldin İndirimi", en: "Welcome Bonus Discount", pl: "35 PLN Rabat Powitalny", uk: "Бонус 35 PLN / 250 TL" },
    minAmount: 500,
    maxDiscount: 250
  },
  "VIP50": {
    discount: { TL: 350, PLN: 50 },
    type: "fixed",
    title: { tr: "350 TL VIP Sadakat İndirimi", en: "VIP Loyalty Discount", pl: "50 PLN Rabat Lojalnościowy VIP", uk: "VIP Знижка" },
    minAmount: 800,
    maxDiscount: 350
  }
};

const MESSAGES = {
  tr: {
    missing: "Lütfen bir indirim kodu giriniz.",
    invalid: "Geçersiz veya süresi dolmuş indirim kodu.",
    success: (title) => `Tebrikler! ${title} başarıyla uygulandı.`,
    error: "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyiniz."
  },
  en: {
    missing: "Please enter a valid promo code.",
    invalid: "Invalid or expired promotional coupon code.",
    success: (title) => `Congratulations! ${title} has been applied.`,
    error: "An error occurred while validating promo code. Please try again."
  },
  pl: {
    missing: "Proszę wprowadzić kod rabatowy.",
    invalid: "Nieprawidłowy lub wygasły kod promocyjny.",
    success: (title) => `Gratulacje! ${title} został pomyślnie naliczony.`,
    error: "Wystąpił błąd podczas weryfikacji kodu. Spróbuj ponownie."
  },
  uk: {
    missing: "Будь ласка, введіть промокод.",
    invalid: "Недійсний або прострочений промокод.",
    success: (title) => `Вітаємо! ${title} успішно застосовано.`,
    error: "Виникла помилка під час перевірки промокоду."
  }
};

// In-Memory sliding-window rate limiting map per Edge isolate (Anti Brute-Force)
const PROMO_RATE_MAP = new Map();
const PROMO_RATE_WINDOW_MS = 60 * 1000;
const MAX_PROMO_PER_MIN = 25;

function checkPromoRateLimit(ip) {
  if (!ip) return false;
  const now = Date.now();
  const entry = PROMO_RATE_MAP.get(ip) || { count: 0, resetAt: now + PROMO_RATE_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + PROMO_RATE_WINDOW_MS;
    PROMO_RATE_MAP.set(ip, entry);
    return false;
  }

  entry.count++;
  PROMO_RATE_MAP.set(ip, entry);

  if (PROMO_RATE_MAP.size > 2000) {
    for (const [k, v] of PROMO_RATE_MAP.entries()) {
      if (now > v.resetAt) PROMO_RATE_MAP.delete(k);
    }
  }

  return entry.count > MAX_PROMO_PER_MIN;
}

export async function onRequestPost(context) {
  const { request } = context;
  const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip') || '';
  const origin = request.headers.get('Origin') || '*';
  const allowedOrigin = (origin && (origin.endsWith('relaxax.com') || origin.endsWith('pages.dev') || origin.includes('localhost')))
    ? origin
    : '*';

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN"
  };

  const traceId = `prm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  // 1. Anti Brute-Force Rate Limiting
  if (checkPromoRateLimit(clientIp)) {
    return new Response(JSON.stringify({
      valid: false,
      error: "Too many coupon validation attempts. Please wait a minute.",
      traceId
    }), {
      status: 429,
      headers: { ...headers, "Retry-After": "60" }
    });
  }

  try {
    const raw = await request.text();
    if (raw.length > 2048) {
      return new Response(JSON.stringify({ valid: false, error: "Payload too large", traceId }), {
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
    } catch(e){}

    // SQL / NoSQL Injection Threat Blocker
    if (scanPayloadForInjection(body)) {
      return new Response(JSON.stringify({
        valid: false,
        error: "Security Alert: Malicious characters detected",
        traceId
      }), {
        status: 400,
        headers
      });
    }

    const rawCode = (body.code || body.promoCode || '').trim();
    const code = rawCode.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const lang = (body.lang && MESSAGES[body.lang]) ? body.lang : 'tr';
    const currency = (body.currency === 'PLN' || body.currency === 'pln') ? 'PLN' : 'TL';
    const subtotal = Number(body.subtotal || body.amount || body.price) || 0;
    const msg = MESSAGES[lang] || MESSAGES.tr;

    if (!code) {
      return new Response(JSON.stringify({
        valid: false,
        error: msg.missing,
        traceId
      }), {
        status: 400,
        headers
      });
    }

    if (PROMO_CODES[code]) {
      const promo = PROMO_CODES[code];
      const title = (promo.title && promo.title[lang]) ? promo.title[lang] : (promo.title.en || promo.title.tr);

      let calculatedDiscount = 0;
      if (promo.type === 'percent') {
        calculatedDiscount = subtotal > 0 ? (subtotal * promo.discount / 100) : promo.discount;
        if (promo.maxDiscount && calculatedDiscount > promo.maxDiscount) {
          calculatedDiscount = promo.maxDiscount;
        }
      } else if (promo.type === 'fixed') {
        calculatedDiscount = typeof promo.discount === 'object'
          ? (promo.discount[currency] || promo.discount.TL || 0)
          : promo.discount;
      }

      return new Response(JSON.stringify({
        valid: true,
        code,
        discount: promo.discount,
        type: promo.type,
        currency,
        calculatedDiscount: Math.round(calculatedDiscount * 100) / 100,
        title,
        message: msg.success(title),
        traceId
      }), {
        status: 200,
        headers
      });
    }

    return new Response(JSON.stringify({
      valid: false,
      code,
      error: msg.invalid,
      traceId
    }), {
      status: 404,
      headers
    });

  } catch(e) {
    return new Response(JSON.stringify({
      valid: false,
      error: "Internal validation error",
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
      "Access-Control-Max-Age": "86400"
    }
  });
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  if (context.request.method === "OPTIONS") return onRequestOptions(context);
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

