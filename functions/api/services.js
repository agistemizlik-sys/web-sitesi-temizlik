/**
 * RELAXAX Service Catalog & Pricing API Endpoint
 * GET /api/services
 */

export async function onRequest(context) {
  const origin = context.request.headers.get('Origin') || '*';

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const catalog = {
    currencies: {
      TR: "TL",
      PL: "PLN"
    },
    services: [
      {
        id: "standart",
        title: { tr: "Standart Ev Temizliği", pl: "Standardowe Sprzątanie" },
        basePrice: { TL: 1850, PLN: 219 },
        duration: "4 - 5 Saat",
        features: {
          tr: ["Yüzey ve zemin hijyeni", "Toz alma & silme", "Mutfak & banyo dezenfeksiyonu"],
          pl: ["Higiena powierzchni", "Odkurzanie i mycie", "Dezynfekcja kuchni i łazienki"]
        }
      },
      {
        id: "detayli",
        title: { tr: "Detaylı & Derinlemesine", pl: "Sprzątanie Głębokie" },
        basePrice: { TL: 2450, PLN: 289 },
        duration: "6 - 8 Saat",
        features: {
          tr: ["Dolap içi silme", "Fayans derz temizliği", "Buharlı hijyen bakımı"],
          pl: ["Mycie wnętrza szafek", "Czyszczenie fug", "Dezynfekcja parowa"]
        }
      },
      {
        id: "tasinma",
        title: { tr: "Boş Ev & Taşınma", pl: "Sprzątanie Po Przeprowadzce" },
        basePrice: { TL: 2750, PLN: 319 },
        duration: "6 - 8 Saat",
        features: {
          tr: ["Sıfır leke boş ev bakımı", "Cam & çerçeve yıkanması", "Balkon & zemin fırçalama"],
          pl: ["Kompleksowe czyszczenie puste", "Mycie okien i ram", "Szorowanie balkonu"]
        }
      },
      {
        id: "insaat",
        title: { tr: "İnşaat Sonrası", pl: "Sprzątanie Po Remoncie" },
        basePrice: { TL: 3350, PLN: 389 },
        duration: "8 - 10 Saat",
        features: {
          tr: ["Harc & boya kazıma", "Endüstriyel toz çekimi", "Detaylı harç temizliği"],
          pl: ["Usuwanie farb i gipsu", "Odkurzanie przemysłowe", "Czyszczenie pobudowlane"]
        }
      }
    ],
    cities: {
      TR: ["İstanbul", "İzmir", "Sakarya", "Kocaeli", "Samsun", "Balıkesir", "Antalya"],
      PL: ["Warszawa", "Śródmieście", "Mokotów", "Wilanów", "Ochota", "Wola", "Żoliborz"]
    },
    extras: [
      { id: "fridge", title: { tr: "Buzdolabı İçi Temizliği", pl: "Mycie Wnętrza Lodówki" }, price: { TL: 250, PLN: 35 } },
      { id: "oven", title: { tr: "Fırın İçi Temizliği", pl: "Mycie Wnętrza Piekarnika" }, price: { TL: 250, PLN: 35 } },
      { id: "balcony", title: { tr: "Balkon Yıkama", pl: "Mycie Balkonu" }, price: { TL: 300, PLN: 45 } },
      { id: "window", title: { tr: "Ekstra Cam Silme", pl: "Dodatkowe Mycie Okien" }, price: { TL: 350, PLN: 50 } }
    ]
  };

  return new Response(JSON.stringify(catalog), {
    status: 200,
    headers
  });
}
