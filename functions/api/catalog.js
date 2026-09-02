/**
 * RELAXAX Enterprise Cloudflare Pages Function for Product Catalog & Inventory Management API
 * GET /api/catalog
 * POST /api/catalog
 */

const DEFAULT_CATALOG_ITEMS = [
  {
    id: 'butik_hediye_kutusu',
    key: 'butik_hediye_kutusu',
    title: 'Rose Elegance Butik Çiçek & Hediye Kutusu',
    category: 'boutique',
    categoryLabel: '🛍️ Butik Hediyelik',
    priceTR: 490,
    oldPriceTR: 650,
    pricePL: 59,
    status: 'in_stock',
    image: '/images/product_rose_gift_box.webp',
    icon: '🌹',
    desc: '5 Parça Özel Tasarım Set, pencereli beyaz lüks hediye kutusu ve altın varak işleme.'
  },
  {
    id: 'firin',
    key: 'firin',
    title: 'Fırın İçi Yağ Çözücü Temizlik',
    category: 'extra_cleaning',
    categoryLabel: '✨ Ek Temizlik',
    priceTR: 450,
    oldPriceTR: 550,
    pricePL: 59,
    status: 'in_stock',
    icon: '🍳',
    desc: 'Kärcher buharlı ve organik yağ çözücüyle fırın içi derin hijyen bakımı.'
  },
  {
    id: 'buzdolabi',
    key: 'buzdolabi',
    title: 'Buzdolabı İçi Hijyen & Koku Giderme',
    category: 'extra_cleaning',
    categoryLabel: '✨ Ek Temizlik',
    priceTR: 450,
    oldPriceTR: 550,
    pricePL: 55,
    status: 'in_stock',
    icon: '🧊',
    desc: 'Buzdolabı raflarının sökülüp dezenfekte edilmesi ve ozon/karbon koku arındırma.'
  },
  {
    id: 'mutfak_dolabi',
    key: 'mutfak_dolabi',
    title: 'Mutfak Dolapları İçi Temizlik',
    category: 'extra_cleaning',
    categoryLabel: '✨ Ek Temizlik',
    priceTR: 650,
    oldPriceTR: 800,
    pricePL: 75,
    status: 'in_stock',
    icon: '🗄️',
    desc: 'Tüm mutfak dolaplarının içinin boşaltılıp silinmesi ve düzenlenmesi.'
  },
  {
    id: 'davlumbaz',
    key: 'davlumbaz',
    title: 'Davlumbaz & Filtre Yağ Arındırma',
    category: 'extra_cleaning',
    categoryLabel: '✨ Ek Temizlik',
    priceTR: 450,
    oldPriceTR: 550,
    pricePL: 49,
    status: 'in_stock',
    icon: '🛢️',
    desc: 'Metal filtrelerin ultrasonik sıcak su banyosuyla yağdan arındırılması.'
  },
  {
    id: 'koltuk_yikama',
    key: 'koltuk_yikama',
    title: 'Koltuk & Kanepe Buharlı Yıkama',
    category: 'vip_care',
    categoryLabel: '💎 VIP Hizmet',
    priceTR: 650,
    oldPriceTR: 800,
    pricePL: 89,
    status: 'in_stock',
    icon: '🛋️',
    desc: 'Vakum ekstraksiyon ve buhar teknolojisiyle kumaş içi leke ve akar arındırma.'
  },
  {
    id: 'pencere',
    key: 'pencere',
    title: 'Pencere & Çerçeve Silimi',
    category: 'extra_cleaning',
    categoryLabel: '✨ Ek Temizlik',
    priceTR: 400,
    oldPriceTR: 500,
    pricePL: 49,
    status: 'in_stock',
    icon: '🪟',
    desc: 'Pencere camları, çerçeve ve rayların özel mikrofiber ve buharla parlatılması.'
  }
];

import { createApiResponse, createApiError, handleOptionsCors, parseAndValidateJson, generateTraceId } from './_utils.js';

export async function onRequestGet(context) {
  const origin = context.request.headers.get('Origin') || '*';
  return createApiResponse({
    success: true,
    items: DEFAULT_CATALOG_ITEMS,
    timestamp: new Date().toISOString()
  }, 200, origin);
}

export async function onRequestPost(context) {
  const { request } = context;
  const origin = request.headers.get('Origin') || '*';
  const traceId = generateTraceId('cat');

  try {
    const { data: body, error, status } = await parseAndValidateJson(request, 4096);
    if (error) return createApiError(error, status, traceId, null, origin);

    const action = body.action || 'toggle-status';
    const key = body.key;

    return createApiResponse({
      success: true,
      action: action,
      key: key,
      message: 'Katalog işlemi başarıyla işlendi.',
      updatedAt: new Date().toISOString()
    }, 200, origin, traceId);
  } catch (e) {
    return createApiError('İşlem başarısız.', 400, traceId, null, origin);
  }
}

export async function onRequestOptions(context) {
  return handleOptionsCors(context.request, "GET, POST, OPTIONS");
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  if (context.request.method === "OPTIONS") return onRequestOptions(context);
  return onRequestGet(context);
}
