import { scanPayloadForInjection } from './_security.js';

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

async function signQuote(secret, quoteData) {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret || 'relaxax_quote_signing_key_2026');
    const msgData = encoder.encode(JSON.stringify(quoteData));
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
  } catch(e) {
    return '';
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const traceId = `quote-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  
  const origin = request.headers.get('Origin') || '*';
  const allowedOrigin = (origin && (origin.endsWith('relaxax.com') || origin.endsWith('pages.dev') || origin.includes('localhost')))
    ? origin
    : '*';

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, X-RELAXAX-Trace-ID",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-RELAXAX-Trace-ID": traceId
  };

  try {
    const raw = await request.text();
    if (raw.length > 15000) {
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
    } catch(e) {
      body = {};
    }

    // SQL / NoSQL Injection Threat Blocker
    if (scanPayloadForInjection(body)) {
      return new Response(JSON.stringify({
        success: false,
        error: "Security Alert: Malicious SQL or script injection payload detected",
        traceId
      }), {
        status: 400,
        headers
      });
    }

    // Honeypot spam guard
    if (body.website_url || body._hp_check) {
      return new Response(JSON.stringify({ success: true, message: "Quote generated", traceId }), {
        status: 200,
        headers
      });
    }

    const city = String(body.city || 'Istanbul').trim();
    const isPoland = city.toLowerCase().includes('warsz') || String(body.country || '').toUpperCase() === 'PL' || body.currency === 'PLN';
    const currency = isPoland ? 'PLN' : 'TL';
    const lang = String(body.lang || (isPoland ? 'pl' : 'tr')).toLowerCase();

    const serviceType = String(body.serviceType || body.service || 'standart').toLowerCase();
    const serviceRate = BASE_RATES[serviceType] || BASE_RATES.standart;
    const rate = serviceRate[currency];

    const rooms = Math.max(1, Math.min(10, parseInt(body.rooms || body.roomCount) || 1));
    const baths = Math.max(1, Math.min(6, parseInt(body.baths || body.bathCount) || 1));
    const squareMeters = Math.max(20, Math.min(1000, Number(body.squareMeters || body.area) || (rooms * 25 + 40)));

    // 1. Calculate Base Price
    let baseCleaningPrice = rate.base + ((rooms - 1) * rate.perRoom) + ((baths - 1) * rate.perBath);
    if (squareMeters > (rooms * 25 + 45)) {
      const extraSqm = squareMeters - (rooms * 25 + 45);
      baseCleaningPrice += extraSqm * rate.perSqm;
    }
    baseCleaningPrice = Math.round(baseCleaningPrice);

    // 2. Extras Calculation
    const selectedExtras = Array.isArray(body.extras) ? body.extras : [];
    let extrasTotal = 0;
    const itemizedExtras = [];

    selectedExtras.forEach(item => {
      const itemKey = String(item).toLowerCase();
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
    const frequency = String(body.frequency || 'once').toLowerCase();
    const freqDiscountRate = FREQUENCY_DISCOUNTS[frequency] || 0;
    const frequencyDiscountAmount = Math.round(subtotal * freqDiscountRate);

    // 4. Payment Method Discount (e.g., 5% on bank transfer)
    const payMethod = String(body.paymentMethod || body.payMethod || 'transfer').toLowerCase();
    const payDiscountRate = PAYMENT_DISCOUNTS[payMethod] || 0;
    const subtotalAfterFreq = subtotal - frequencyDiscountAmount;
    const paymentDiscountAmount = Math.round(subtotalAfterFreq * payDiscountRate);

    // 5. Promo Code Discount
    let promoDiscountAmount = 0;
    const promoCode = String(body.promoCode || '').toUpperCase().trim();
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

    const quoteSignature = await signQuote(env?.QUOTE_SECRET, quoteSummary);
    quoteSummary.signature = quoteSignature;

    return new Response(JSON.stringify({
      success: true,
      quote: quoteSummary,
      traceId
    }, null, 2), {
      status: 200,
      headers
    });

  } catch(err) {
    return new Response(JSON.stringify({
      success: false,
      error: "Error calculating quote",
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
