/**
 * RELAXAX — Edge SEO Middleware (Cloudflare Pages Functions)
 *
 * Görevler:
 *  1. HTTP header düzeyinde hreflang + canonical (Link header) — botlar sayfayı
 *     parse etmeden önce dil köprülerini görür.
 *  2. Dynamic Prerendering: JavaScript çalıştırmayan/geç çalıştıran crawler'lara
 *     (?lang= / ?city= parametresine göre) çözümlenmiş HTML snapshot servis eder:
 *     dil-doğru <title>/<meta>/OG etiketleri, dile göre @graph JSON-LD ve
 *     sayfa içeriğinin okunabilir semantik dökümü.
 *  3. İnsan trafiği HİÇ değişmeden geçer (yalnızca Link header eklenir) —
 *     görsel deneyim, animasyonlar ve SPA davranışı aynen korunur.
 */

const ORIGIN = 'https://relaxaxserwis.com';

// JavaScript çalıştırmayan veya rendering kuyruğu gecikmeli bilinen crawler'lar
const BOT_RE = new RegExp(
  [
    'googlebot', 'google-inspectiontool', 'storebot-google', 'adsbot-google', 'mediapartners-google',
    'bingbot', 'bingpreview', 'msnbot',
    'yandex(bot|images|metrika)?', 'duckduckbot', 'baiduspider', 'slurp', 'applebot', 'petalbot',
    'facebookexternalhit', 'facebot', 'meta-externalagent',
    'whatsapp', 'twitterbot', 'linkedinbot', 'telegrambot', 'slackbot', 'discordbot',
    'pinterest(bot)?', 'redditbot', 'skypeuripreview', 'vkshare', 'embedly', 'quora link preview',
    'gptbot', 'oai-searchbot', 'chatgpt-user', 'perplexitybot', 'claudebot', 'claude-web', 'bytespider',
    'semrushbot', 'ahrefsbot', 'screaming frog', 'rogerbot', 'dotbot',
  ].join('|'),
  'i'
);

const META = {
  tr: {
    htmlLang: 'tr',
    ogLocale: 'tr_TR',
    title: 'RELAXAX | Sinematik İnteraktif Temizlik Deneyimi',
    description:
      "İzmir, İstanbul, Sakarya, Kocaeli, Samsun, Balıkesir ve Antalya'da premium temizlik. Kaydırarak kontrol edebileceğiniz efsanevi sinematik sahnelerle tanışın.",
  },
  pl: {
    htmlLang: 'pl',
    ogLocale: 'pl_PL',
    title: 'RELAXAX | Kinowe Interaktywne Wrażenia Sprzątania',
    description:
      'Kompleksowe usługi sprzątania premium w Warszawie — mieszkania, biura i firmy. Poznaj legendarne kinowe sceny i zarezerwuj sprzątanie online.',
  },
};

// ?city= parametresi için şehir bazlı çözümlenmiş meta
const CITY_META = {
  istanbul:  { lang: 'tr', name: 'İstanbul',  title: "İstanbul Temizlik Hizmeti | RELAXAX",  description: "İstanbul'da profesyonel ev, ofis ve kurumsal temizlik. Standart, detaylı, B2B temizlik ile ilaçlama & dezenfeksiyon. Hemen teklif alın." },
  izmir:     { lang: 'tr', name: 'İzmir',     title: "İzmir Temizlik Hizmeti | RELAXAX",     description: "İzmir'de profesyonel ev, ofis ve kurumsal temizlik. Standart, detaylı, B2B temizlik ile ilaçlama & dezenfeksiyon. Hemen teklif alın." },
  kocaeli:   { lang: 'tr', name: 'Kocaeli',   title: "Kocaeli Temizlik Hizmeti | RELAXAX",   description: "Kocaeli'de profesyonel ev, ofis ve kurumsal temizlik. Standart, detaylı, B2B temizlik ile ilaçlama & dezenfeksiyon. Hemen teklif alın." },
  sakarya:   { lang: 'tr', name: 'Sakarya',   title: "Sakarya Temizlik Hizmeti | RELAXAX",   description: "Sakarya'da profesyonel ev, ofis ve kurumsal temizlik. Standart, detaylı, B2B temizlik ile ilaçlama & dezenfeksiyon. Hemen teklif alın." },
  samsun:    { lang: 'tr', name: 'Samsun',    title: "Samsun Temizlik Hizmeti | RELAXAX",    description: "Samsun'da profesyonel ev, ofis ve kurumsal temizlik. Standart, detaylı, B2B temizlik ile ilaçlama & dezenfeksiyon. Hemen teklif alın." },
  balikesir: { lang: 'tr', name: 'Balıkesir', title: "Balıkesir Temizlik Hizmeti | RELAXAX", description: "Balıkesir'de profesyonel ev, ofis ve kurumsal temizlik. Standart, detaylı, B2B temizlik ile ilaçlama & dezenfeksiyon. Hemen teklif alın." },
  antalya:   { lang: 'tr', name: 'Antalya',   title: "Antalya Temizlik Hizmeti | RELAXAX",   description: "Antalya'da profesyonel ev, ofis ve kurumsal temizlik. Standart, detaylı, B2B temizlik ile ilaçlama & dezenfeksiyon. Hemen teklif alın." },
  warszawa:  { lang: 'pl', name: 'Warszawa',  title: 'Sprzątanie Warszawa | RELAXAX',        description: 'Profesjonalne sprzątanie mieszkań, biur i firm w Warszawie. Sprzątanie standardowe, głębokie, B2B oraz dezynsekcja. Zamów wycenę online.' },
};

const FAQ = {
  tr: [
    ["RELAXAX hangi şehirlerde temizlik hizmeti veriyor?", "Türkiye'de İstanbul, İzmir, Kocaeli, Sakarya, Samsun, Balıkesir ve Antalya'da; Polonya'da ise Warszawa'da profesyonel temizlik hizmeti veriyoruz."],
    ["Hangi temizlik hizmetlerini sunuyorsunuz?", "Standart temizlik, detaylı (derin) temizlik, kurumsal (B2B) temizlik ile ilaçlama & dezenfeksiyon hizmetleri sunuyoruz."],
    ["Temizlik fiyatları nasıl belirleniyor?", "Fiyat; alan (m²), hizmet türü, temizlik sıklığı ve ekstra taleplere (detaylı cam temizliği, fırın & beyaz eşya içi, balkon yıkama) göre belirlenir. Talebinizi ilettikten sonra size özel teklif hazırlıyoruz."],
    ["Rezervasyon nasıl yapılır?", "Sitemizdeki formu doldurmanız yeterli; talebiniz WhatsApp üzerinden ekibimize ulaşır ve en kısa sürede sizinle iletişime geçeriz."],
    ["Çalışma saatleriniz nedir?", "Her gün 09:00 - 19:00 saatleri arasında hizmet veriyoruz."],
    ["Kurumsal (B2B) temizlik hizmeti veriyor musunuz?", "Evet; ofis, restoran, plaza ve iş yerleri için periyodik kurumsal temizlik çözümleri sunuyoruz."],
  ],
  pl: [
    ["W jakich miastach RELAXAX świadczy usługi sprzątania?", "W Polsce działamy w Warszawie, a w Turcji w Stambule, Izmirze, Kocaeli, Sakarii, Samsunie, Balıkesirze i Antalyi."],
    ["Jakie usługi sprzątania oferujecie?", "Sprzątanie standardowe, głębokie sprzątanie, sprzątanie firmowe (B2B) oraz dezynsekcję i dezynfekcję."],
    ["Jak ustalane są ceny sprzątania?", "Cena zależy od powierzchni (m²), rodzaju usługi, częstotliwości oraz dodatków (mycie okien, czyszczenie piekarnika i AGD, mycie balkonu). Po przesłaniu zapytania przygotowujemy indywidualną ofertę."],
    ["Jak dokonać rezerwacji?", "Wystarczy wypełnić formularz na stronie — zapytanie trafia do naszego zespołu przez WhatsApp i szybko się z Tobą kontaktujemy."],
    ["W jakich godzinach pracujecie?", "Codziennie w godzinach 09:00 - 19:00."],
    ["Czy oferujecie sprzątanie dla firm (B2B)?", "Tak — oferujemy okresowe usługi dla biur, restauracji i centrów biznesowych."],
  ],
};

const SERVICES = {
  tr: [
    ['Standart Temizlik', 'Ev & ofis için genel düzen ve temel hijyen çözümleri.'],
    ['Detaylı Temizlik', 'Dip köşe, ince temizlik ve detaylı yüzey arındırma.'],
    ['Kurumsal Temizlik (B2B)', 'İş yeri, restoran ve plazalar için periyodik çözümler.'],
    ['İlaçlama & Dezenfeksiyon', 'Böcek, haşere ve bakteri dezenfeksiyon işlemleri.'],
  ],
  pl: [
    ['Standardowe Sprzątanie', 'Ogólne porządki i podstawowa czystość dla domu i biura.'],
    ['Głębokie Sprzątanie', 'Dokładne czyszczenie zakamarków i głębokie usuwanie brudu.'],
    ['Sprzątanie Firmowe (B2B)', 'Okresowe usługi dla biur, restauracji i centrów biznesowych.'],
    ['Dezynsekcja & Dezynfekcja', 'Czyszczenie przeciw owadom, szkodnikom i sterylizacja sanitarna.'],
  ],
};

const CITIES_LABEL = {
  tr: 'İstanbul, İzmir, Kocaeli, Sakarya, Samsun, Balıkesir, Antalya (Türkiye) ve Warszawa (Polonya)',
  pl: 'Warszawa (Polska) oraz Stambuł, Izmir, Kocaeli, Sakarya, Samsun, Balıkesir i Antalya (Turcja)',
};

/** İstek URL'inden kanonik varyant URL'ini üretir (yalnız tanımlı parametreler korunur). */
function variantUrl(lang, city) {
  const params = new URLSearchParams();
  if (lang === 'pl') params.set('lang', 'pl');
  if (city) params.set('city', city);
  const qs = params.toString();
  return `${ORIGIN}/${qs ? `?${qs}` : ''}`;
}

/** RFC 8288 Link header: hreflang alternates + self canonical. */
function buildLinkHeader(lang, city) {
  return [
    `<${variantUrl('tr')}>; rel="alternate"; hreflang="tr"`,
    `<${variantUrl('pl')}>; rel="alternate"; hreflang="pl"`,
    `<${variantUrl('tr')}>; rel="alternate"; hreflang="x-default"`,
    `<${variantUrl(lang, city)}>; rel="canonical"`,
  ].join(', ');
}

/** Tek @graph JSON-LD — index.html'dekiyle aynı yapı, dile/şehre göre çözümlenmiş. */
function buildSchemaGraph(lang, city) {
  const meta = META[lang];
  const pageUrl = variantUrl(lang, city);
  const cityMeta = city ? CITY_META[city] : null;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfessionalService',
        '@id': `${ORIGIN}/#business`,
        name: 'RELAXAX',
        alternateName: 'A Cleaning',
        url: `${ORIGIN}/`,
        logo: `${ORIGIN}/favicon.svg`,
        image: `${ORIGIN}/images/soap_foam_bubbles.png`,
        description: META.tr.description,
        telephone: '+905320000000',
        email: 'info@relaxax.com',
        priceRange: '₺₺',
        knowsLanguage: ['tr', 'pl'],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          telephone: '+905320000000',
          availableLanguage: ['Turkish', 'Polish'],
        },
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '09:00',
          closes: '19:00',
        },
        areaServed: [
          { '@type': 'City', name: 'İstanbul', address: { '@type': 'PostalAddress', addressCountry: 'TR' } },
          { '@type': 'City', name: 'İzmir', address: { '@type': 'PostalAddress', addressCountry: 'TR' } },
          { '@type': 'City', name: 'Kocaeli', address: { '@type': 'PostalAddress', addressCountry: 'TR' } },
          { '@type': 'City', name: 'Sakarya', address: { '@type': 'PostalAddress', addressCountry: 'TR' } },
          { '@type': 'City', name: 'Samsun', address: { '@type': 'PostalAddress', addressCountry: 'TR' } },
          { '@type': 'City', name: 'Balıkesir', address: { '@type': 'PostalAddress', addressCountry: 'TR' } },
          { '@type': 'City', name: 'Antalya', address: { '@type': 'PostalAddress', addressCountry: 'TR' } },
          { '@type': 'City', name: 'Warszawa', address: { '@type': 'PostalAddress', addressCountry: 'PL' } },
        ],
        makesOffer: SERVICES[lang].map(([name, description]) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name, description },
        })),
      },
      {
        '@type': 'WebSite',
        '@id': `${ORIGIN}/#website`,
        url: `${ORIGIN}/`,
        name: 'RELAXAX',
        publisher: { '@id': `${ORIGIN}/#business` },
        inLanguage: ['tr', 'pl'],
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: cityMeta ? cityMeta.title : meta.title,
        description: cityMeta ? cityMeta.description : meta.description,
        isPartOf: { '@id': `${ORIGIN}/#website` },
        about: { '@id': `${ORIGIN}/#business` },
        inLanguage: lang,
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        isPartOf: { '@id': `${pageUrl}#webpage` },
        inLanguage: lang,
        mainEntity: FAQ[lang].map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  });
}

/** Botlara servis edilen, tamamen çözümlenmiş okunabilir içerik dökümü. */
function buildSnapshotSection(lang, city) {
  const cityMeta = city ? CITY_META[city] : null;
  const h = lang === 'pl'
    ? {
        brand: 'RELAXAX — Profesjonalne Usługi Sprzątania',
        intro: 'Kompleksowe usługi sprzątania premium: mieszkania, biura i firmy. Zarezerwuj online — odpowiadamy przez WhatsApp.',
        services: 'Nasze Usługi',
        cities: 'Miasta, w których działamy',
        faq: 'Najczęściej zadawane pytania',
        contact: 'Kontakt',
        hours: 'Godziny pracy: codziennie 09:00 - 19:00',
        phone: 'Telefon',
        email: 'E-mail',
      }
    : {
        brand: 'RELAXAX — Profesyonel Temizlik Hizmetleri',
        intro: 'Premium ev, ofis ve kurumsal temizlik. Online rezervasyon yapın — talebiniz WhatsApp üzerinden ekibimize ulaşır.',
        services: 'Hizmetlerimiz',
        cities: 'Hizmet Verdiğimiz Şehirler',
        faq: 'Sık Sorulan Sorular',
        contact: 'İletişim',
        hours: 'Çalışma Saatleri: Her Gün 09:00 - 19:00',
        phone: 'Telefon',
        email: 'E-posta',
      };

  // Warszawa'da haritadaki gerçek hizmet bölgeleri (src/main.js koordinat verisiyle eşleşir)
  const WARSAW_DISTRICTS = 'Śródmieście, Mokotów, Wola, Ursynów, Bemowo, Białołęka';
  let cityLead = '';
  if (cityMeta) {
    cityLead = `<p><strong>${cityMeta.name}</strong> — ${cityMeta.description}</p>`;
    if (city === 'warszawa') {
      cityLead += `\n  <p>${lang === 'pl' ? 'Obsługiwane dzielnice' : 'Hizmet verilen bölgeler'}: ${WARSAW_DISTRICTS}.</p>`;
    }
  } else if (lang === 'pl') {
    cityLead = `<p>Obsługiwane dzielnice Warszawy: ${WARSAW_DISTRICTS}.</p>`;
  }

  return `
<section id="bot-snapshot" lang="${lang}" style="max-width:760px;margin:0 auto;padding:40px 20px;background:#f7f6f2;color:#1b1d22;font-family:Georgia,serif">
  <h2>${h.brand}</h2>
  <p>${h.intro}</p>
  ${cityLead}
  <h3>${h.services}</h3>
  <ul>
    ${SERVICES[lang].map(([name, desc]) => `<li><strong>${name}</strong> — ${desc}</li>`).join('\n    ')}
  </ul>
  <h3>${h.cities}</h3>
  <p>${CITIES_LABEL[lang]}</p>
  <h3>${h.faq}</h3>
  ${FAQ[lang].map(([q, a]) => `<h4>${q}</h4>\n  <p>${a}</p>`).join('\n  ')}
  <h3>${h.contact}</h3>
  <p>${h.phone}: <a href="tel:+905320000000">+90 (532) 000 00 00</a> · ${h.email}: <a href="mailto:info@relaxax.com">info@relaxax.com</a> · ${h.hours}</p>
</section>`;
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // API yolları için middleware'i tamamen atla
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  // Host kanonikleştirme: www → apex 301 (yinelenen içerik + link equity bölünmesini önler)
  if (url.hostname === 'www.relaxaxserwis.com') {
    url.hostname = 'relaxaxserwis.com';
    return Response.redirect(url.toString(), 301);
  }

  // API ve statik varlıklar (uzantılı yollar) hiç işlenmeden geçer
  const isPageRequest =
    request.method === 'GET' &&
    !url.pathname.startsWith('/api/') &&
    (url.pathname === '/' || url.pathname.endsWith('.html') || !url.pathname.includes('.'));

  if (!isPageRequest) return next();

  // Tek sayfalık SPA: kök dışındaki her sayfa yolu 301 ile köke döner.
  // Pages'in SPA fallback'i her yolu 200 + index.html ile karşıladığından,
  // rastgele URL'ler aksi halde soft-404 olarak indekslenebilirdi.
  if (url.pathname !== '/') {
    return Response.redirect(`${url.origin}/${url.search}`, 301);
  }

  const response = await next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const langParam = url.searchParams.get('lang');
  const cityParam = (url.searchParams.get('city') || '').toLowerCase();
  const city = CITY_META[cityParam] ? cityParam : null;
  const lang = langParam === 'pl' || (city && CITY_META[city].lang === 'pl') ? 'pl' : 'tr';

  // 1B — HTTP header düzeyinde hreflang + canonical: her HTML yanıtına (insan + bot)
  const withHeaders = new Response(response.body, response);
  withHeaders.headers.set('Link', buildLinkHeader(lang, city));
  withHeaders.headers.append('Vary', 'User-Agent');

  const userAgent = request.headers.get('user-agent') || '';
  const isBot = BOT_RE.test(userAgent);
  if (!isBot) return withHeaders; // İnsan trafiği: SPA aynen servis edilir

  // 1A — Dynamic Prerendering: bot isteğine dil/şehir çözümlenmiş snapshot
  const meta = city ? CITY_META[city] : META[lang];
  const pageUrl = variantUrl(lang, city);

  return new HTMLRewriter()
    .on('html', {
      element(el) {
        el.setAttribute('lang', META[lang].htmlLang);
      },
    })
    .on('title', {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute('content', meta.description);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(el) {
        el.setAttribute('content', meta.title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(el) {
        el.setAttribute('content', meta.description);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute('content', meta.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute('content', meta.description);
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute('content', pageUrl);
      },
    })
    .on('meta[property="og:locale"]', {
      element(el) {
        el.setAttribute('content', META[lang].ogLocale);
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute('href', pageUrl);
      },
    })
    .on('script#schema-graph', {
      element(el) {
        el.setInnerContent(buildSchemaGraph(lang, city), { html: true });
      },
    })
    .on('body', {
      element(el) {
        el.append(buildSnapshotSection(lang, city), { html: true });
      },
    })
    .transform(withHeaders);
}
