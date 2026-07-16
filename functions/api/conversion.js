/**
 * Aclean — Server-Side Conversion Relay (Cloudflare Pages Function)
 * POST /api/conversion
 *
 * Tarayıcıdaki AdBlocker / ITP / Brave kalkanları Meta Pixel ve gtag.js'i
 * engellese bile dönüşümler bu first-party uca düşer; buradan sunucu tarafında
 * Meta Conversion API ve GA4 Measurement Protocol'e iletilir.
 *
 * Gerekli ortam değişkenleri (Cloudflare Pages → Settings → Environment variables):
 *   META_PIXEL_ID          — Meta Pixel ID
 *   META_CAPI_ACCESS_TOKEN — Meta Conversions API erişim token'ı
 *   META_TEST_EVENT_CODE   — (opsiyonel) Events Manager test kodu
 *   GA4_MEASUREMENT_ID     — G-XXXXXXX
 *   GA4_API_SECRET         — GA4 Measurement Protocol API secret
 * Değişkenler tanımlı değilse uç sessizce 202 döner (site davranışı değişmez).
 */

const ALLOWED_EVENTS = new Set([
  'generate_lead',
  'contact_whatsapp',
  'contact_phone',
  'contact_email',
]);

// GA4 event adı → Meta standart event adı
const META_EVENT_MAP = {
  generate_lead: 'Lead',
  contact_whatsapp: 'Contact',
  contact_phone: 'Contact',
  contact_email: 'Contact',
};

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Meta normalizasyonu: telefon = ülke kodlu, yalnız rakam. */
function normalizePhone(rawPhone, lang) {
  let digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return null;
  digits = digits.replace(/^0+/, '');
  const cc = lang === 'pl' ? '48' : '90';
  if (!digits.startsWith(cc)) digits = cc + digits;
  return digits;
}

async function sendToMeta(env, payload, request, waitUntil) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_ACCESS_TOKEN) return;

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('User-Agent') || '';
  const attr = payload.attribution || {};
  const now = Math.floor(Date.now() / 1000);

  const userData = {
    client_ip_address: ip,
    client_user_agent: ua,
  };
  if (attr.fbp) userData.fbp = attr.fbp;
  if (attr.fbc) userData.fbc = attr.fbc;
  else if (attr.fbclid) userData.fbc = `fb.1.${Date.now()}.${attr.fbclid}`;

  const phone = normalizePhone(payload.user && payload.user.phone, payload.lang);
  if (phone) userData.ph = [await sha256Hex(phone)];
  const fullName = ((payload.user && payload.user.name) || '').trim().toLowerCase();
  if (fullName) {
    const parts = fullName.split(/\s+/);
    userData.fn = [await sha256Hex(parts[0])];
    if (parts.length > 1) userData.ln = [await sha256Hex(parts[parts.length - 1])];
  }
  if (payload.client_id) userData.external_id = [await sha256Hex(String(payload.client_id))];

  const body = {
    data: [
      {
        event_name: META_EVENT_MAP[payload.event_name] || 'Lead',
        event_time: now,
        event_id: payload.event_id,
        event_source_url: payload.event_source_url || '',
        action_source: 'website',
        user_data: userData,
        custom_data: {
          city: payload.city || '',
          service: payload.service || '',
          language: payload.lang || '',
          utm_source: attr.utm_source || '',
          utm_medium: attr.utm_medium || '',
          utm_campaign: attr.utm_campaign || '',
        },
      },
    ],
  };
  if (env.META_TEST_EVENT_CODE) body.test_event_code = env.META_TEST_EVENT_CODE;

  const endpoint = `https://graph.facebook.com/v21.0/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_ACCESS_TOKEN)}`;
  waitUntil(
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) console.error('Meta CAPI error', res.status, await res.text());
      })
      .catch((err) => console.error('Meta CAPI fetch failed', err))
  );
}

function sendToGa4(env, payload, waitUntil) {
  if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) return;

  const attr = payload.attribution || {};
  const clientId = payload.client_id || `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;

  const params = {
    engagement_time_msec: 100,
    city: payload.city || '',
    service: payload.service || '',
    language: payload.lang || '',
  };
  if (attr.utm_source) params.source = attr.utm_source;
  if (attr.utm_medium) params.medium = attr.utm_medium;
  if (attr.utm_campaign) params.campaign = attr.utm_campaign;
  if (attr.utm_term) params.term = attr.utm_term;
  if (attr.utm_content) params.content = attr.utm_content;
  if (attr.gclid) params.gclid = attr.gclid;

  const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(env.GA4_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(env.GA4_API_SECRET)}`;
  waitUntil(
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: String(clientId),
        events: [{ name: payload.event_name, params }],
      }),
    })
      .then((res) => {
        if (!res.ok) console.error('GA4 MP error', res.status);
      })
      .catch((err) => console.error('GA4 MP fetch failed', err))
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    const raw = await request.text();
    if (raw.length > 10_000) return new Response(null, { status: 413 });
    payload = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!payload || !ALLOWED_EVENTS.has(payload.event_name)) {
    return new Response(null, { status: 400 });
  }
  if (!payload.event_id) payload.event_id = crypto.randomUUID();

  const waitUntil = context.waitUntil.bind(context);
  try {
    await sendToMeta(env, payload, request, waitUntil);
    sendToGa4(env, payload, waitUntil);
  } catch (err) {
    console.error('conversion relay error', err);
  }

  // sendBeacon yanıtı okumaz; hızlı 202 → INP/main-thread maliyeti sıfır
  return new Response(JSON.stringify({ ok: true }), {
    status: 202,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://acleanserwis.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
