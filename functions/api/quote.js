import { scanPayloadForInjection } from './_security.js';
import { createApiResponse, createApiError, handleOptionsCors, parseAndValidateJson, generateTraceId, sanitizeString, generateHmacSignature } from './_utils.js';

/**
 * RELAXAX Enterprise Server-Side Quote & Dynamic Pricing Engine
 * POST /api/quote & GET /api/quote
 *
 * Provides authoritative server-side price calculation and cryptographic quote tokens (HMAC-SHA256)
 * to prevent client-side price manipulation and SQL injection attacks.
 */

const BASE_RATES = {
  standart: {
    TL: { base: 1850, perRoom: 350, perBath: 250, perSqm: 8 },
    PLN: { base: 219, perRoom: 45, perBath: 35, perSqm: 1.2 }
  },
  detayli: {
    TL: { base: 2450, perRoom: 450, perBath: 350, perSqm: 12 },
    PLN: { base: 289, perRoom: 60, perBath: 45, perSqm: 1.8 }
  },
  tasinma: {
    TL: { base: 2750, perRoom: 500, perBath: 400, perSqm: 14 },
    PLN: { base: 319, perRoom: 65, perBath: 50, perSqm: 2.0 }
  },
  insaat: {
    TL: { base: 3350, perRoom: 600, perBath: 500, perSqm: 18 },
    PLN: { base: 389, perRoom: 80, perBath: 65, perSqm: 2.6 }
  },
  kurumsal: {
    TL: { base: 3500, perRoom: 550, perBath: 450, perSqm: 16 },
    PLN: { base: 420, perRoom: 75, perBath: 60, perSqm: 2.4 }
  },
  ilaclama: {
    TL: { base: 1450, perRoom: 200, perBath: 150, perSqm: 5 },
    PLN: { base: 179, perRoom: 30, perBath: 25, perSqm: 0.9 }
  }
};

const EXTRAS_PRICING = {
  firin: { TL: 450, PLN: 59, name: { tr: "Fırın İçi", pl: "Wnętrze piekarnika", en: "Oven Interior" } },
  buzdolabi: { TL: 450, PLN: 59, name: { tr: "Buzdolabı İçi", pl: "Wnętrze lodówki", en: "Fridge Interior" } },
  balkon: { TL: 400, PLN: 49, name: { tr: "Balkon Yıkama", pl: "Mycie balkonu", en: "Balcony Wash" } },
  cam: { TL: 550, PLN: 79, name: { tr: "Detaylı Cam Silme", pl: "Mycie okien", en: "Window Detailing" } },
  dolap: { TL: 500, PLN: 69, name: { tr: "Dolap İçi", pl: "Wnętrze szafek", en: "Cabinet Interior" } },
  utu: { TL: 400, PLN: 49, name: { tr: "Ütü (1 Saat)", pl: "Prasowanie", en: "Ironing (1h)" } },
  koltuk: { TL: 750, PLN: 99, name: { tr: "Koltuk Yıkama", pl: "Pranie kanapy", en: "Sofa Wash" } },
  pet: { TL: 350, PLN: 45, name: { tr: "Evcil Hayvan Tüyü", pl: "Sierść zwierząt", en: "Pet Hair Care" } }
};

const FREQUENCY_DISCOUNTS = {
  once: 0,
  monthly: 0.05,
  biweekly: 0.10,
  weekly: 0.15
};

const PAYMENT_DISCOUNTS = {
  transfer: 0.05,
  fast: 0.05,
  blik: 0.05,
  cash: 0
};

async function calculateQuote(body, env, origin, traceId) {
  // SQL / Injection Threat Blocker
  if (scanPayloadForInjection(body)) {
    return createApiError("Security Alert: Malicious SQL or script injection payload detected", 400, traceId, null, origin);
  }

  // Honeypot spam guard
  if (body.website_url || body._hp_check) {
    return createApiResponse({ success: true, message: "Quote generated" }, 200, origin, traceId);
  }

  const city = sanitizeString(body.city || 'Istanbul', 60);
  const isPoland = city.toLowerCase().includes('warsz') || String(body.country || '').toUpperCase() === 'PL' || body.currency === 'PLN';
  const currency = isPoland ? 'PLN' : 'TL';
  const lang = sanitizeString(body.lang || (isPoland ? 'pl' : 'tr'), 10).toLowerCase();

  const serviceType = sanitizeString(body.serviceType || body.service || 'standart', 40).toLowerCase();
  const serviceRate = BASE_RATES[serviceType] || BASE_RATES.standart;
  const rate = serviceRate[currency];

  const rooms = Math.max(1, Math.min(10, parseInt(body.rooms || body.roomCount) || 1));
  const baths = Math.max(1, Math.min(6, parseInt(body.baths || body.bathCount) || 1));
  const squareMeters = Math.max(20, Math.min(1000, Number(body.squareMeters || body.area || body.sqm) || (rooms * 25 + 40)));

  // 1. Calculate Base Price
  let baseCleaningPrice = rate.base + ((rooms - 1) * rate.perRoom) + ((baths - 1) * rate.perBath);
  if (squareMeters > (rooms * 25 + 45)) {
    const extraSqm = squareMeters - (rooms * 25 + 45);
    baseCleaningPrice += extraSqm * rate.perSqm;
  }
  baseCleaningPrice = Math.round(baseCleaningPrice);

  // 2. Extras Calculation
  const selectedExtras = Array.isArray(body.extras)
    ? body.extras
    : (typeof body.extras === 'string' ? body.extras.split(',').map(s => s.trim()) : []);

  let extrasTotal = 0;
  const itemizedExtras = [];

  selectedExtras.forEach(item => {
    const itemKey = sanitizeString(item, 30).toLowerCase();
    const extraDef = EXTRAS_PRICING[itemKey];
    if (extraDef) {
      const extraCost = extraDef[currency] || 0;
      extrasTotal += extraCost;
      itemizedExtras.push({
        id: itemKey,
        name: extraDef.name[lang] || extraDef.name.en || extraDef.name.tr,
        price: extraCost,
        currency
      });
    }
  });

  const subtotal = baseCleaningPrice + extrasTotal;

  // 3. Frequency Discount
  const frequency = sanitizeString(body.frequency || 'once', 20).toLowerCase();
  const freqDiscountRate = FREQUENCY_DISCOUNTS[frequency] || 0;
  const frequencyDiscountAmount = Math.round(subtotal * freqDiscountRate);

  // 4. Payment Method Discount
  const payMethod = sanitizeString(body.paymentMethod || body.payMethod || 'transfer', 20).toLowerCase();
  const payDiscountRate = PAYMENT_DISCOUNTS[payMethod] || 0;
  const subtotalAfterFreq = subtotal - frequencyDiscountAmount;
  const paymentDiscountAmount = Math.round(subtotalAfterFreq * payDiscountRate);

  // 5. Promo Code Discount
  let promoDiscountAmount = 0;
  const promoCode = sanitizeString(body.promoCode || body.code || '', 30).toUpperCase().trim();
  if (promoCode) {
    if (promoCode === 'RELAX20' || promoCode === 'WARSZAWA20') {
      promoDiscountAmount = Math.round(subtotalAfterFreq * 0.20);
    } else if (promoCode === 'BAHAR15') {
      promoDiscountAmount = Math.round(subtotalAfterFreq * 0.15);
    } else if (promoCode === 'PROMO10' || promoCode === 'PL10') {
      promoDiscountAmount = Math.round(subtotalAfterFreq * 0.10);
    } else if (promoCode === 'HOSGELDIN') {
      promoDiscountAmount = currency === 'PLN' ? 35 : 250;
    }
  }

  const totalDiscount = frequencyDiscountAmount + paymentDiscountAmount + promoDiscountAmount;
  const finalPrice = Math.max(currency === 'PLN' ? 99 : 600, Math.round(subtotal - totalDiscount));

  const quoteSummary = {
    quoteId: `QT-${Date.now().toString(36).toUpperCase()}`,
    serviceType,
    city,
    currency,
    rooms,
    baths,
    squareMeters,
    breakdown: {
      basePrice: baseCleaningPrice,
      extrasTotal,
      subtotal,
      itemizedExtras,
      frequencyDiscount: {
        rate: freqDiscountRate,
        amount: frequencyDiscountAmount,
        type: frequency
      },
      paymentDiscount: {
        rate: payDiscountRate,
        amount: paymentDiscountAmount,
        method: payMethod
      },
      promoDiscount: {
        code: promoCode || null,
        amount: promoDiscountAmount
      },
      totalDiscount,
      finalPrice,
      formattedFinalPrice: currency === 'PLN' ? `${finalPrice} PLN` : `${finalPrice.toLocaleString('tr-TR')} TL`
    },
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    timestamp: new Date().toISOString()
  };

  const quoteSignature = await generateHmacSignature(env?.QUOTE_SECRET || 'relaxax_quote_key_2026', quoteSummary);
  quoteSummary.signature = quoteSignature;

  return createApiResponse({
    success: true,
    quote: quoteSummary
  }, 200, origin, traceId);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  const traceId = generateTraceId('quote');
  const url = new URL(request.url);

  const queryParams = Object.fromEntries(url.searchParams.entries());
  return calculateQuote(queryParams, env, origin, traceId);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  const traceId = generateTraceId('quote');

  const { data, error, status } = await parseAndValidateJson(request, 15000);
  if (error) return createApiError(error, status, traceId, null, origin);

  return calculateQuote(data, env, origin, traceId);
}

export async function onRequestOptions(context) {
  return handleOptionsCors(context.request, "GET, POST, OPTIONS");
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "OPTIONS") return onRequestOptions(context);
  return createApiError("Method not allowed. Use GET or POST.", 405, null, null, context.request.headers.get('Origin') || '*');
}
