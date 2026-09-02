/**
 * RELAXAX Enterprise Service Catalog & Pricing API Endpoint
 * GET /api/services
 */

const CATALOG_DATA = {
  version: "3.2.0",
  currencies: {
    TR: { code: "TL", symbol: "₺", name: "Türk Lirası" },
    PL: { code: "PLN", symbol: "zł", name: "Polski Złoty" }
  },
  discounts: {
    frequency: {
      once: { percent: 0, label: { tr: "Tek Seferlik", en: "One-time", pl: "Jednorazowo", uk: "Одноразово" } },
      weekly: { percent: 15, label: { tr: "Haftalık (-%15)", en: "Weekly (-15%)", pl: "Co tydzień (-15%)", uk: "Щотижня (-15%)" } },
      biweekly: { percent: 10, label: { tr: "2 Haftada Bir (-%10)", en: "Bi-weekly (-10%)", pl: "Co 2 tygodnie (-10%)", uk: "Раз на 2 тижні (-10%)" } },
      monthly: { percent: 5, label: { tr: "Aylık (-%5)", en: "Monthly (-5%)", pl: "Co miesiąc (-5%)", uk: "Щомісяця (-5%)" } }
    },
    paymentMethods: {
      transfer: { percent: 5, label: { tr: "Banka Havalesi / FAST (-%5)", en: "Bank Transfer (-5%)", pl: "Przelew Bankowy / BLIK (-5%)", uk: "Банківський переказ (-5%)" } },
      cash: { percent: 0, label: { tr: "Kapıda Güvenli Ödeme (%0)", en: "Cash on Delivery (0%)", pl: "Płatność na miejscu (0%)", uk: "Оплата на місці (0%)" } }
    }
  },
  services: [
    {
      id: "standart",
      badge: { tr: "⭐ En Popüler", en: "⭐ Most Popular", pl: "⭐ Najpopularniejsze", uk: "⭐ Найпопулярніший" },
      title: { tr: "Standart Ev Temizliği", en: "Standard Home Cleaning", pl: "Standardowe Sprzątanie", uk: "Стандартне Прибирання" },
      subtitle: { tr: "Rutin periyodik hijyen & yüzey bakımı", en: "Routine periodic hygiene & surface care", pl: "Rutynowe okresowe sprzątanie i pielęgnacja", uk: "Регулярна періодична гігієна" },
      basePrice: { TL: 1850, PLN: 219 },
      duration: { tr: "4 - 5 Saat", en: "4 - 5 Hours", pl: "4 - 5 Godziny", uk: "4 - 5 Годин" },
      features: {
        tr: ["Tüm zeminlerin süpürülmesi ve silinmesi", "Yüzey tozlarının hijyenik arındırılması", "Mutfak tezgahı ve eviye temizliği", "Banyo, lavabo ve klozet dezenfeksiyonu", "Çöp kutularının boşaltılması"],
        en: ["Vacuuming & mopping all floors", "Dusting all accessible surfaces", "Kitchen countertops & sink cleaning", "Bathroom, sink & toilet disinfection", "Trash disposal & replacement"],
        pl: ["Odkurzanie i mycie wszystkich podłóg", "Ścieranie kurzu z powierzchni", "Czyszczenie blatów kuchennych i zlewu", "Dezynfekcja łazienki, umywalki i toalety", "Opróżnianie koszy na śmieci"],
        uk: ["Пилососіння та миття підлоги", "Видалення пилу з поверхонь", "Миття кухонних поверхонь та раковини", "Дезінфекція ванної кімнати та санвузла", "Виніс сміття"]
      }
    },
    {
      id: "detayli",
      badge: { tr: "✨ Derin Bakım", en: "✨ Deep Detailing", pl: "✨ Głębokie", uk: "✨ Генеральне" },
      title: { tr: "Detaylı / Bahar Temizliği", en: "Deep / Spring Cleaning", pl: "Głębokie / Wiosenne Sprzątanie", uk: "Генеральне Прибирання" },
      subtitle: { tr: "Dip köşe derinlemesine buharlı arındırma", en: "Deep steam purification & corner detailing", pl: "Głębokie oczyszczanie parowe i zakamarki", uk: "Глибоке парове очищення" },
      basePrice: { TL: 2450, PLN: 289 },
      duration: { tr: "6 - 8 Saat", en: "6 - 8 Hours", pl: "6 - 8 Godzin", uk: "6 - 8 Годин" },
      features: {
        tr: ["Standart paketteki tüm maddeler", "Detaylı buharlı derz ve fayans arındırma", "Dolap dış yüzeyleri ve kapı pervazları", "Süpürgelik ve priz detay temizliği", "Kireç ve inatçı yağ sökme uygulaması"],
        en: ["All standard cleaning items included", "Steam tile and grout cleaning", "Door frames and cabinet exterior detailing", "Baseboards, light switches and sockets", "Heavy limescale & grease removal"],
        pl: ["Wszystkie elementy standardowego pakietu", "Parowe czyszczenie fug i płytek", "Czyszczenie ościeżnic i frontów szafek", "Mycie listew przypodłogowych i włączników", "Usuwanie trudnego kamienia i tłuszczu"],
        uk: ["Усі послуги стандартного пакету", "Парове очищення швів та плитки", "Миття дверних коробок та фасадів", "Очищення плінтусів та вимикачів", "Видалення вапняного нальоту та жиру"]
      }
    },
    {
      id: "tasinma",
      badge: { tr: "📦 Kolay Taşınma", en: "📦 Easy Move", pl: "📦 Przeprowadzka", uk: "📦 Переїзд" },
      title: { tr: "Taşınma / Boş Ev Temizliği", en: "Move-in / Move-out Cleaning", pl: "Sprzątanie Po Przeprowadzce", uk: "Прибирання після Переїзду" },
      subtitle: { tr: "Anahtar teslim taşınma öncesi/sonrası hijyen", en: "Turnkey spotless pre/post move hygiene", pl: "Kompleksowa higiena przed lub po wyprowadzce", uk: "Підготовка житла до заселення" },
      basePrice: { TL: 2750, PLN: 319 },
      duration: { tr: "6 - 8 Saat", en: "6 - 8 Hours", pl: "6 - 8 Godzin", uk: "6 - 8 Годин" },
      features: {
        tr: ["Boş daire komple zemin ve duvar toz arındırma", "Tüm gömme dolapların iç ve dış silinmesi", "Mutfak dolaplarının içi ve çekmeceler", "Cam, pencere çerçevesi ve pervazlar", "Taşınmaya %100 hazır anahtar teslim sterilizasyon"],
        en: ["Complete dust removal of empty apartment", "Interior and exterior wipe-down of all built-in wardrobes", "Inside all kitchen cabinets and drawers", "Full window frames, sills and glass wash", "100% Move-in ready sterilization"],
        pl: ["Kompleksowe odkurzanie i mycie pustego lokalu", "Mycie wnętrza i zewnętrza szaf wnękowych", "Mycie szafek kuchennych wewnątrz i szuflad", "Mycie okien, ram i parapetów", "100% gotowość do zamieszkania"],
        uk: ["Повне знепилення порожнього житла", "Миття вбудованих шаф зсередини та зовні", "Миття кухонних шаф і висувних шухляд", "Миття вікон, рам і підвіконь", "100% готовність до заселення"]
      }
    },
    {
      id: "insaat",
      badge: { tr: "🏗️ Ağır Kir & Toz", en: "🏗️ Post-Build Care", pl: "🏗️ Po Remoncie", uk: "🏗️ Після Ремонту" },
      title: { tr: "İnşaat / Tadilat Sonrası", en: "Post-Construction Cleaning", pl: "Sprzątanie Po Remoncie / Budowie", uk: "Прибирання після Ремонту" },
      subtitle: { tr: "Boya, alçı, harç ve ince toz giderme", en: "Fine dust, plaster, paint & debris removal", pl: "Usuwanie pyłu budowlanego, farby i gipsu", uk: "Видалення будівельного пилу та залишків фарби" },
      basePrice: { TL: 3350, PLN: 389 },
      duration: { tr: "8 - 10 Saat", en: "8 - 10 Hours", pl: "8 - 10 Godzin", uk: "8 - 10 Годин" },
      features: {
        tr: ["İnşaat tozu için endüstriyel HEPA vakumlama", "Zeminlerdeki boya, alçı ve harç kalıntılarının kazınması", "Bant, etiket ve koruyucu folyo sökümü", "Camlardaki silikon ve harç lekelerinin giderilmesi", "Derinlemesine şantiye sterilizasyonu"],
        en: ["Industrial HEPA vacuuming for fine construction dust", "Scraping paint, plaster and grout from floors", "Removal of tape, stickers and protective films", "Removing silicone, cement stains from glass", "Thorough post-renovation site sterilization"],
        pl: ["Przemysłowe odkurzanie HEPA pyłu budowlanego", "Usuwanie resztek farby, gipsu i klejów z posadzek", "Usuwanie taśm malarskich, naklejek i folii ochronnych", "Czyszczenie szyb z silikonu i zaprawy", "Głęboka sterylizacja po pracach wykończeniowych"],
        uk: ["Промислове прибирання пилу пилососами HEPA", "Видалення залишків фарби, шпаклівки та цементу", "Зняття захисних плівок, скотчу та наклейок", "Очищення скла від силікону та розчину", "Повна післяремонтна дезінфекція"]
      }
    }
  ],
  extras: [
    { id: "firin", icon: "🍳", title: { tr: "Fırın İçi Temizliği", en: "Oven Interior Cleaning", pl: "Mycie Wnętrza Piekarnika", uk: "Миття духовки" }, price: { TL: 450, PLN: 59 }, oldPrice: { TL: 550, PLN: 75 } },
    { id: "buzdolabi", icon: "🧊", title: { tr: "Buzdolabı İçi Hijyeni", en: "Fridge Interior Cleaning", pl: "Mycie Wnętrza Lodówki", uk: "Миття холодильника" }, price: { TL: 450, PLN: 59 }, oldPrice: { TL: 550, PLN: 75 } },
    { id: "balkon", icon: "🌿", title: { tr: "Balkon Yıkama & Hijyen", en: "Balcony Wash & Care", pl: "Mycie Balkonu i Tarasu", uk: "Миття балкона" }, price: { TL: 400, PLN: 49 }, oldPrice: { TL: 500, PLN: 65 } },
    { id: "cam", icon: "🪟", title: { tr: "Ekstra Detaylı Cam Silme", en: "Extra Window Cleaning", pl: "Dodatkowe Mycie Okien", uk: "Додаткове миття вікон" }, price: { TL: 550, PLN: 79 }, oldPrice: { TL: 700, PLN: 99 } },
    { id: "dolap", icon: "🚪", title: { tr: "Mutfak Dolapları İçi", en: "Kitchen Cabinets Interior", pl: "Mycie Wnętrza Szafek Kuchennych", uk: "Миття шаф зсередини" }, price: { TL: 500, PLN: 69 }, oldPrice: { TL: 650, PLN: 85 } },
    { id: "utu", icon: "👔", title: { tr: "Ütü Hizmeti (1 Saat)", en: "Ironing Service (1 Hour)", pl: "Prasowanie (1 Godzina)", uk: "Прасування (1 година)" }, price: { TL: 400, PLN: 49 }, oldPrice: { TL: 500, PLN: 65 } },
    { id: "koltuk", icon: "🛋️", title: { tr: "Koltuk Buharlı Yıkama", en: "Sofa Steam Extraction", pl: "Pranie Kanapy / Sofy", uk: "Хімчистка дивана" }, price: { TL: 750, PLN: 99 }, oldPrice: { TL: 950, PLN: 129 } },
    { id: "pet", icon: "🐾", title: { tr: "Evcil Hayvan Tüy Arındırma", en: "Pet Hair Neutralization", pl: "Usuwanie Sierści Zwierząt", uk: "Видалення шерсті тварин" }, price: { TL: 350, PLN: 45 }, oldPrice: { TL: 450, PLN: 59 } }
  ],
  cities: {
    TR: [
      { key: "Istanbul", name: "İstanbul", region: "Marmara", status: "active", lat: 41.0082, lng: 28.9784 },
      { key: "Izmir", name: "İzmir", region: "Ege", status: "active", lat: 38.4237, lng: 27.1428 },
      { key: "Antalya", name: "Antalya", region: "Akdeniz", status: "active", lat: 36.8969, lng: 30.7133 },
      { key: "Bursa", name: "Bursa", region: "Marmara", status: "active", lat: 40.1885, lng: 29.0610 },
      { key: "Kocaeli", name: "Kocaeli", region: "Marmara", status: "active", lat: 40.8533, lng: 29.8815 },
      { key: "Sakarya", name: "Sakarya", region: "Marmara", status: "active", lat: 40.7569, lng: 30.3783 },
      { key: "Balikesir", name: "Balıkesir", region: "Marmara", status: "active", lat: 39.6484, lng: 27.8826 },
      { key: "Samsun", name: "Samsun", region: "Karadeniz", status: "active", lat: 41.2867, lng: 36.3300 },
      { key: "Ankara", name: "Ankara", region: "İç Anadolu", status: "coming_soon", lat: 39.9334, lng: 32.8597 }
    ],
    PL: [
      { key: "Warszawa", name: "Warszawa", region: "Mazowieckie", status: "active", lat: 52.2297, lng: 21.0122 },
      { key: "Srodmiescie", name: "Śródmieście", region: "Warszawa", status: "active", lat: 52.2319, lng: 21.0067 },
      { key: "Mokotow", name: "Mokotów", region: "Warszawa", status: "active", lat: 52.1939, lng: 21.0347 },
      { key: "Wola", name: "Wola", region: "Warszawa", status: "active", lat: 52.2366, lng: 20.9702 },
      { key: "Ursynow", name: "Ursynów", region: "Warszawa", status: "active", lat: 52.1415, lng: 21.0439 },
      { key: "Wilanow", name: "Wilanów", region: "Warszawa", status: "active", lat: 52.1661, lng: 21.0903 },
      { key: "Ochota", name: "Ochota", region: "Warszawa", status: "active", lat: 52.2132, lng: 20.9786 },
      { key: "Zoliborz", name: "Żoliborz", region: "Warszawa", status: "active", lat: 52.2687, lng: 20.9847 }
    ]
  }
};

import { createApiResponse, handleOptionsCors } from './_utils.js';

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") return handleOptionsCors(request, "GET, HEAD, OPTIONS");
  if (request.method === "HEAD") return new Response(null, { status: 200, headers: { "ETag": `"rlx-catalog-${CATALOG_DATA.version}"` } });

  const origin = request.headers.get('Origin') || '*';
  return createApiResponse(CATALOG_DATA, 200, origin, null, {
    "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
    "ETag": `"rlx-catalog-${CATALOG_DATA.version}"`
  });
}

export async function onRequestOptions(context) {
  return handleOptionsCors(context.request, "GET, HEAD, OPTIONS");
}

export async function onRequestGet(context) {
  return onRequest(context);
}

