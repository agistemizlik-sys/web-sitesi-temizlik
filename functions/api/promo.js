/**
 * RELAXAX Promo Code Validation API Endpoint
 * POST /api/promo
 */

const PROMO_CODES = {
  "RELAX20": { discount: 20, type: "percent", title: "20% İndirim" },
  "BAHAR15": { discount: 15, type: "percent", title: "15% İndirim" },
  "PROMO10": { discount: 10, type: "percent", title: "10% İndirim" },
  "PL10": { discount: 10, type: "percent", title: "10% Zniżki" },
  "HOSGELDIN": { discount: 250, type: "fixed_tl", title: "250 TL Hoş Geldin İndirimi" }
};

export async function onRequestPost(context) {
  const origin = context.request.headers.get('Origin') || '*';

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key"
  };

  try {
    const raw = await context.request.text();
    let body = {};
    try { body = JSON.parse(raw); } catch(e){}

    const code = (body.code || '').trim().toUpperCase();

    if (!code) {
      return new Response(JSON.stringify({ valid: false, error: "Lütfen bir indirim kodu giriniz." }), {
        status: 400,
        headers
      });
    }

    if (PROMO_CODES[code]) {
      const promo = PROMO_CODES[code];
      return new Response(JSON.stringify({
        valid: true,
        code: code,
        discount: promo.discount,
        type: promo.type,
        title: promo.title,
        message: `Tebrikler! ${promo.title} başarıyla uygulandı.`
      }), {
        status: 200,
        headers
      });
    }

    return new Response(JSON.stringify({
      valid: false,
      code: code,
      error: "Geçersiz veya süresi dolmuş indirim kodu."
    }), {
      status: 404,
      headers
    });
  } catch(e) {
    return new Response(JSON.stringify({ valid: false, error: "İşlem sırasında hata oluştu." }), {
      status: 500,
      headers
    });
  }
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin') || '*';
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key"
    }
  });
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  if (context.request.method === "OPTIONS") return onRequestOptions(context);
  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
}
