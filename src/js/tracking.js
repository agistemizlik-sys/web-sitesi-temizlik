// ============================================================
// PAID ADS ENGINE — UTM kalıcılığı + first-party dönüşüm izleme
// ============================================================
// Reklam tıklamasından gelen utm_* / gclid / fbclid parametreleri
// sessionStorage'da saklanır (sayfa yenilense de kaybolmaz) ve her
// dönüşümde sitenin KENDİ /api/conversion ucuna sendBeacon ile basılır.
// AdBlocker'lar üçüncü parti pikselleri engeller; first-party uç engellenmez —
// sunucu tarafı Meta CAPI / GA4 MP iletimini functions/api/conversion.js yapar.

const ATTR_KEY = 'relaxax_attribution';
const CID_KEY = 'relaxax_cid';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const CLICK_KEYS = ['gclid', 'fbclid'];

function safeGet(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}
function safeSet(storage, key, value) {
  try { storage.setItem(key, value); } catch { /* private mode vb. */ }
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function generateId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** GA4 client_id benzeri kalıcı first-party kimlik (localStorage). */
export function getClientId() {
  let cid = safeGet(localStorage, CID_KEY);
  if (!cid) {
    cid = generateId();
    safeSet(localStorage, CID_KEY, cid);
  }
  return cid;
}

/**
 * URL'deki reklam parametrelerini yakalar ve sessionStorage'daki kayıtla
 * birleştirir. utm_* için ilk dokunuş korunur (first-touch); gclid/fbclid
 * gibi tıklama kimlikleri her yeni değerde tazelenir (last-click).
 */
export function initAttribution() {
  let stored = {};
  try { stored = JSON.parse(safeGet(sessionStorage, ATTR_KEY) || '{}'); } catch { stored = {}; }

  const params = new URLSearchParams(window.location.search);
  let dirty = false;

  UTM_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value && !stored[key]) { stored[key] = value; dirty = true; }
  });
  CLICK_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value && stored[key] !== value) { stored[key] = value; dirty = true; }
  });

  // Meta çerezleri (pixel yüklüyse) — CAPI eşleşme kalitesini yükseltir
  const fbp = readCookie('_fbp');
  const fbc = readCookie('_fbc');
  if (fbp && stored.fbp !== fbp) { stored.fbp = fbp; dirty = true; }
  if (fbc && stored.fbc !== fbc) { stored.fbc = fbc; dirty = true; }

  if (!stored.landing_page) {
    stored.landing_page = window.location.pathname + window.location.search;
    stored.first_seen = new Date().toISOString();
    dirty = true;
  }

  if (dirty) safeSet(sessionStorage, ATTR_KEY, JSON.stringify(stored));
  getClientId(); // kimliği erkenden üret
  return stored;
}

export function getAttribution() {
  try { return JSON.parse(safeGet(sessionStorage, ATTR_KEY) || '{}'); } catch { return {}; }
}

/**
 * Dönüşümü first-party uca gönderir. sendBeacon asenkron ve non-blocking'dir;
 * sayfa WhatsApp'a yönlense bile gönderim tarayıcı tarafından tamamlanır.
 * @param {'generate_lead'|'contact_whatsapp'|'contact_phone'|'contact_email'} eventName
 * @param {object} extra — { city, service, lang, user: { name, phone } } vb.
 */
export function trackConversion(eventName, extra = {}) {
  try {
    const payload = JSON.stringify({
      event_name: eventName,
      event_id: generateId(),
      event_source_url: window.location.href,
      client_id: getClientId(),
      attribution: getAttribution(),
      ...extra,
    });

    const sent = navigator.sendBeacon &&
      navigator.sendBeacon('/api/conversion', new Blob([payload], { type: 'application/json' }));

    if (!sent) {
      fetch('/api/conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // İzleme asla kullanıcı akışını bozamaz
  }
}
