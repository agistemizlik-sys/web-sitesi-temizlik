import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { STATE, REGION_THEMES, CITY_TO_REGION, CITY_NAMES_TR, CITY_NAMES_TR_TITLE } from './js/state.js';
import { TRANSLATIONS, SERVICE_SCENE_TEXTS, SERVICE_SCENE_TEXTS_PL } from './js/translations.js';
import { initAttribution, trackConversion } from './js/tracking.js';
gsap.registerPlugin(ScrollTrigger);

// Styled Developer Debugging System (triggered via URL '#debug' or localStorage)
let DEBUG = window.location.hash.includes('debug') || localStorage.getItem('tworose_debug') === 'true';
function logDebug(...args) {
  if (DEBUG) {
    console.log('%c[TwoRose Debug]', 'color: #00e5ff; font-weight: bold; background: #071018; padding: 3px 6px; border-radius: 4px; border: 1px solid #00e5ff;', ...args);
  }
}
function logErrorDebug(...args) {
  if (DEBUG) {
    console.error('%c[TwoRose Error]', 'color: #ff3366; font-weight: bold; background: #1a050b; padding: 3px 6px; border-radius: 4px; border: 1px solid #ff3366;', ...args);
  } else {
    console.error(...args);
  }
}
// Global window exception tracker writing directly to our visual screen logger
window.onerror = function(message, source, lineno, colno, error) {
  const debugHUD = document.getElementById('cinemaDebugHUD');
  if (debugHUD) {
    debugHUD.innerHTML = `<span style="color:#ff3366;font-weight:bold;">ERR: ${message}</span><br>at ${source}:${lineno}`;
    debugHUD.style.opacity = '1';
  }
};

// Dynamic debug toggling via hashchange event
window.addEventListener('hashchange', () => {
  const isDebug = window.location.hash.includes('debug');
  DEBUG = isDebug;
  if (isDebug) {
    localStorage.setItem('tworose_debug', 'true');
    console.log('%c[TwoRose Debug Enabled]', 'color: #00e5ff; font-weight: bold; background: #071018; padding: 4px; border-radius: 4px; border: 1px solid #00e5ff;');
  } else {
    localStorage.removeItem('tworose_debug');
    console.log('%c[TwoRose Debug Disabled]', 'color: #ff3366; font-weight: bold; background: #1a050b; padding: 4px; border-radius: 4px; border: 1px solid #ff3366;');
  }
});

// Global cached window dimensions to prevent layout recalculations in mousemove events
let cachedWindowWidth = window.innerWidth;
let cachedWindowHeight = window.innerHeight;

// Utility function to debounce high-frequency events
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Safari viewport height fix — sets --safari-vh CSS custom property
// This compensates for iOS Safari's dynamic toolbar resizing the visual viewport
function setSafariVH() {
  cachedWindowWidth = window.innerWidth;
  cachedWindowHeight = window.innerHeight;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--safari-vh', `${vh}px`);
}
const debouncedSetSafariVH = debounce(setSafariVH, 150);
setSafariVH();
window.addEventListener('resize', debouncedSetSafariVH);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', debouncedSetSafariVH);
}

function scrollToTarget(target, offset = 0, duration = 1.2) {
  if (STATE.lenisInstance) {
    if (typeof target === 'number') {
      STATE.lenisInstance.scrollTo(target, { duration });
    } else {
      STATE.lenisInstance.scrollTo(target, { offset, duration });
    }
    return;
  }

  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' });
    return;
  }

  const el = typeof target === 'string'
    ? document.querySelector(target.startsWith('#') ? target : `#${target}`)
    : target;
  if (el) {
    window.scrollTo({ top: el.offsetTop + offset, behavior: 'smooth' });
  }
}

function shouldRunParticleLoop() {
  return document.body.classList.contains('flag-selection-mode') && !document.hidden;
}

function stopParticleLoop() {
  if (canvasAnimationId) {
    cancelAnimationFrame(canvasAnimationId);
    canvasAnimationId = null;
  }
}

function destroyLeafletMap(country) {
  if (country === 'turkey' && turkeyMapInstance) {
    try { turkeyMapInstance.remove(); } catch (e) {}
    turkeyMapInstance = null;
  } else if (country === 'poland' && polandMapInstance) {
    try { polandMapInstance.remove(); } catch (e) {}
    polandMapInstance = null;
  }
}

// Module-level variables for gateway interactive components
let cardHoverListeners = [];
let portalHotspotListeners = [];
let turkeyMapInstance = null;
let polandMapInstance = null;
let showCityPreviewFn = null;
let revertToDefaultFn = null;
let triggerSelectionFn = null;
let portalStageClickHandler = null;
let portalParallaxHandler = null;
let portalScrollHandler = null;
let portalParallaxRafId = null;
let portalTargetHue = 220;

// Performance caching variables
let cachedIntroVideos = [];
let activeIntroVideoEl = null;
let splitLeftEl = null;
let splitRightEl = null;
let cachedHotspotCoords = {};
let calculatePriceFn = null;
let portalResizeHandler = null;
let portalPingInterval = null;
let portalRevertTimeout = null;
let portalMutationObserver = null;
let portalHUDMoveHandler = null;
let portalHUDLeaveHandler = null;

let canvasAnimationId = null;
let resizeCanvasHandler = null;
let portalMouseMoveHandler = null;
let particlesVisibilityHandler = null;
let synth = null;
let activeCity = null;
let cachedStageRect = null;
let cachedMapRect = null;
let cachedWrapperRect = null;


function cleanupGatewayListeners() {
  const portalStage = document.getElementById('portal-stage');
  if (portalStage && portalParallaxHandler) {
    portalStage.removeEventListener('mousemove', portalParallaxHandler);
    portalParallaxHandler = null;
  }
  if (portalStage && portalScrollHandler) {
    portalStage.removeEventListener('scroll', portalScrollHandler);
    portalScrollHandler = null;
  }
  if (portalResizeHandler) {
    window.removeEventListener('resize', portalResizeHandler);
    portalResizeHandler = null;
  }
  if (resizeCanvasHandler) {
    window.removeEventListener('resize', resizeCanvasHandler);
    resizeCanvasHandler = null;
  }
  if (portalMouseMoveHandler) {
    window.removeEventListener('mousemove', portalMouseMoveHandler);
    portalMouseMoveHandler = null;
  }
  if (portalHUDMoveHandler) {
    if (portalStage) portalStage.removeEventListener('mousemove', portalHUDMoveHandler);
    portalHUDMoveHandler = null;
  }
  if (portalHUDLeaveHandler) {
    if (portalStage) portalStage.removeEventListener('mouseleave', portalHUDLeaveHandler);
    portalHUDLeaveHandler = null;
  }
  if (portalParallaxRafId) {
    cancelAnimationFrame(portalParallaxRafId);
    portalParallaxRafId = null;
  }
  if (portalPingInterval) {
    clearInterval(portalPingInterval);
    portalPingInterval = null;
  }
  if (portalRevertTimeout) {
    clearTimeout(portalRevertTimeout);
    portalRevertTimeout = null;
  }
  if (portalMutationObserver) {
    portalMutationObserver.disconnect();
    portalMutationObserver = null;
  }

  if (portalStage && portalStageClickHandler) {
    portalStage.removeEventListener('click', portalStageClickHandler);
    portalStageClickHandler = null;
  }

  if (particlesVisibilityHandler) {
    document.removeEventListener('visibilitychange', particlesVisibilityHandler);
    particlesVisibilityHandler = null;
  }

  stopParticleLoop();

  if (cardHoverListeners && cardHoverListeners.length > 0) {
    cardHoverListeners.forEach((item) => {
      const { card, onEnter, onLeave, onMove, clickHandler, keyHandler, btnHandler } = item;
      if (card) {
        if (onEnter) card.removeEventListener('mouseenter', onEnter);
        if (onLeave) card.removeEventListener('mouseleave', onLeave);
        if (onMove) card.removeEventListener('mousemove', onMove);
        if (clickHandler) card.removeEventListener('click', clickHandler);
        if (keyHandler) card.removeEventListener('keydown', keyHandler);
        
        const btn = card.querySelector('.city-select-btn');
        if (btn && btnHandler) btn.removeEventListener('click', btnHandler);
      }
    });
    cardHoverListeners = [];
  }
  if (portalHotspotListeners && portalHotspotListeners.length > 0) {
    portalHotspotListeners.forEach((item) => {
      const { hotspot, onEnter, onLeave, clickHandler, keyHandler } = item;
      if (hotspot) {
        if (onEnter) hotspot.removeEventListener('mouseenter', onEnter);
        if (onLeave) hotspot.removeEventListener('mouseleave', onLeave);
        if (clickHandler) hotspot.removeEventListener('click', clickHandler);
        if (keyHandler) hotspot.removeEventListener('keydown', keyHandler);
      }
    });
    portalHotspotListeners = [];
  }

  if (turkeyMapInstance) {
    try { turkeyMapInstance.remove(); } catch(e) {}
    turkeyMapInstance = null;
  }
  if (polandMapInstance) {
    try { polandMapInstance.remove(); } catch(e) {}
    polandMapInstance = null;
  }
}

// ==========================================
// 2.C. TRANSLATION ENGINE FUNCTION
// ==========================================
function applyPageMetaTranslations(dict, lang) {
  document.title = dict.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', dict.description);
  document.documentElement.setAttribute('lang', lang);

  // Dynamic H1 Heading Translation
  const mainH1 = document.querySelector('h1.sr-only');
  if (mainH1 && dict.h1Title) {
    mainH1.textContent = dict.h1Title;
  }

  // Dynamic OpenGraph Metadata Update
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', dict.title);
  
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', dict.description);

  // Dynamic Twitter Cards Metadata Update
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', dict.title);
  
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', dict.description);

  // Dynamic LocalBusiness JSON-LD Structured Data Update
  const schemaScript = document.querySelector('script[type="application/ld+json"]');
  if (schemaScript) {
    const isPl = lang === 'pl';
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ProfessionalService",
          "@id": "https://acleanserwis.com/#service",
          "name": "Aclean",
          "image": "https://acleanserwis.com/images/og-image.png",
          "url": "https://acleanserwis.com",
          "telephone": isPl ? "+48221234567" : "+905320000000",
          "priceRange": "$$",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": isPl ? "PL" : "TR",
            "addressLocality": isPl ? "Warszawa" : "İstanbul"
          },
          "areaServed": isPl ? [
            {"@type": "AdministrativeArea", "name": "Warszawa"},
            {"@type": "AdministrativeArea", "name": "Śródmieście"},
            {"@type": "AdministrativeArea", "name": "Mokotów"},
            {"@type": "AdministrativeArea", "name": "Wola"},
            {"@type": "AdministrativeArea", "name": "Ursynów"},
            {"@type": "AdministrativeArea", "name": "Bemowo"},
            {"@type": "AdministrativeArea", "name": "Białołęka"},
            {"@type": "AdministrativeArea", "name": "Praga-Północ"},
            {"@type": "AdministrativeArea", "name": "Praga-Południe"},
            {"@type": "AdministrativeArea", "name": "Targówek"},
            {"@type": "AdministrativeArea", "name": "Ochota"},
            {"@type": "AdministrativeArea", "name": "Żoliborz"},
            {"@type": "AdministrativeArea", "name": "Bielany"},
            {"@type": "AdministrativeArea", "name": "Ursus"},
            {"@type": "AdministrativeArea", "name": "Włochy"},
            {"@type": "AdministrativeArea", "name": "Wilanów"},
            {"@type": "AdministrativeArea", "name": "Wawer"},
            {"@type": "AdministrativeArea", "name": "Rembertów"},
            {"@type": "AdministrativeArea", "name": "Wesoła"},
            {"@type": "AdministrativeArea", "name": "Ząbki"},
            {"@type": "AdministrativeArea", "name": "Marki"},
            {"@type": "AdministrativeArea", "name": "Sulejówek"},
            {"@type": "AdministrativeArea", "name": "Józefów"},
            {"@type": "AdministrativeArea", "name": "Pruszków"},
            {"@type": "AdministrativeArea", "name": "Piastów"},
            {"@type": "AdministrativeArea", "name": "Łomianki"},
            {"@type": "AdministrativeArea", "name": "Piaseczno"},
            {"@type": "AdministrativeArea", "name": "Konstancin-Jeziorna"}
          ] : [
            {"@type": "AdministrativeArea", "name": "İstanbul"},
            {"@type": "AdministrativeArea", "name": "İzmir"},
            {"@type": "AdministrativeArea", "name": "Kocaeli"},
            {"@type": "AdministrativeArea", "name": "Sakarya"},
            {"@type": "AdministrativeArea", "name": "Samsun"},
            {"@type": "AdministrativeArea", "name": "Balıkesir"}
          ]
        },
        {
          "@type": "Service",
          "@id": "https://acleanserwis.com/#service-insaat",
          "name": isPl ? "Sprzątanie po budowie / remoncie" : "İnşaat Sonrası Temizlik",
          "serviceType": "Post-Construction Cleaning",
          "provider": { "@id": "https://acleanserwis.com/#service" },
          "description": isPl
            ? "Odkurzanie pyłu budowlanego filtrami HEPA, usuwanie plam z farby i gipsu, mycie okien poremontowych."
            : "Tadilat ve inşaat sonrası toz arındırma, boya, alçı ve çimento kalıntılarının temizliği.",
          "offers": {
            "@type": "Offer",
            "priceCurrency": isPl ? "PLN" : "TRY",
            "price": isPl ? "15" : "120",
            "description": isPl ? "Od 15 PLN za m²." : "m² başına 120 TL'den başlayan fiyatlarla."
          }
        },
        {
          "@type": "Service",
          "@id": "https://acleanserwis.com/#service-tasinma",
          "name": isPl ? "Sprzątanie przed/po przeprowadzce" : "Taşınma Öncesi/Sonrası Temizlik",
          "serviceType": "Move-in / Move-out Cleaning",
          "provider": { "@id": "https://acleanserwis.com/#service" },
          "description": isPl
            ? "Głęboka sterylizacja pustego domu, mycie wnętrza szafek i szuflad przed wprowadzeniem się."
            : "Yeni evinize yerleşmeden önce kapı, pencere ve mutfak dolapları dahil derin hijyen temizliği.",
          "offers": {
            "@type": "Offer",
            "priceCurrency": isPl ? "PLN" : "TRY",
            "price": isPl ? "7" : "70",
            "description": isPl ? "Od 7 PLN za m²." : "m² başına 70 TL'den başlayan fiyatlarla."
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": isPl ? [
            {
              "@type": "Question",
              "name": "W jakich dzielnicach Warszawy i okolicach świadczycie usługi sprzątania?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Świadczymy usługi we wszystkich dzielnicach Warszawy (m.in. Śródmieście, Mokotów, Wola, Wilanów, Ursynów, Bemowo) oraz w miastach aglomeracji warszawskiej (Piaseczno, Pruszków, Ząbki, Marki itp.)."
              }
            },
            {
              "@type": "Question",
              "name": "Co dokładnie wchodzi w zakres sprzątania po remoncie i budowie?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Sprzątanie po remoncie obejmuje usuwanie pyłu budowlanego filtrami HEPA, czyszczenie plam po farbach, gipsie i klejach, mycie okien poremontowych z folii ochronnych oraz sterylizację pomieszczeń."
              }
            },
            {
              "@type": "Question",
              "name": "Jak szybko można zamówić sprzątanie przed przeprowadzką?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Dzięki naszemu kalkulatorowi m² online możesz szybko wybrać parametry usługi, a rezerwację sfinalizować bezpośrednio przez WhatsApp w zaledwie kilka minut."
              }
            },
            {
              "@type": "Question",
              "name": "Czy usługi dezynsekcji i dezynfekcji są bezpieczne dla zwierząt domowych?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Tak, stosujemy atestowane preparaty, które są w pełni bezpieczne dla ludzi i zwierząt domowych. Przed zabiegiem nasz specjalista przekaże szczegółowe zalecenia."
              }
            }
          ] : [
            {
              "@type": "Question",
              "name": "Aclean hangi şehirlerde premium temizlik hizmeti sunmaktadır?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Aclean; İzmir, İstanbul, Sakarya, Kocaeli, Samsun ve Balıkesir illerinde profesyonel temizlik ekipleriyle premium standartlarda hizmet vermektedir."
              }
            },
            {
              "@type": "Question",
              "name": "İnşaat sonrası temizlik hizmetine neler dahildir?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "İnşaat sonrası temizlikte; tadilat tozlarının arındırılması, kaba çöplerin atılması, boya, alçı ve çimento kalıntılarının özel kimyasallarla kazınması ve derinlemesine dezenfeksiyon dahildir."
              }
            },
            {
              "@type": "Question",
              "name": "Taşınma öncesi boş ev temizliği fiyatı nasıl hesaplanır?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Fiyatlarımız hizmet alacağınız alanın net metrekaresine (m²) göre şeffaf bir şekilde hesaplanır. Sürpriz ek ücretlerle karşılaşmazsınız."
              }
            },
            {
              "@type": "Question",
              "name": "İlaçlama ve dezenfeksiyon hizmeti alırken nelere dikkat edilmelidir?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Aclean, Sağlık Bakanlığı onaylı ilaçlar ve profesyonel ekipmanlar kullanarak haşere kontrolü ve antiviral dezenfeksiyon hizmeti sunar. İşlem öncesi ve sonrası gerekli bilgilendirmeler tarafınıza yapılır."
              }
            }
          ]
        }
      ]
    };
    schemaScript.textContent = JSON.stringify(schema, null, 2);
  }

  const introEyebrow = document.querySelector('.intro-eyebrow');
  const introSubtitle = document.querySelector('.intro-subtitle');
  const introScrollHint = document.querySelector('.intro-scroll-hint span');
  if (introEyebrow) introEyebrow.textContent = dict.introEyebrow;
  if (introSubtitle) introSubtitle.textContent = dict.introSubtitle;
  if (introScrollHint) introScrollHint.textContent = dict.introScrollHint;

  const telTL = document.querySelector('.telemetry-tick.telemetry-tl');
  if (telTL) telTL.textContent = dict.sysStatus;

  if (typeof synth !== 'undefined') {
    synth.updateToggleUI();
  }
}

function applyPortalHudTranslations(dict, lang) {
  const hintMainTitle = document.querySelector('.portal-center-hint .hint-main-title');
  const hintSubTitle = document.querySelector('.portal-center-hint .hint-sub-title');
  if (hintMainTitle) hintMainTitle.textContent = dict.selectCity;
  if (hintSubTitle) hintSubTitle.textContent = dict.selectRegionalGateway;

  const hudCityLabel = document.querySelector('.hud-data-row:nth-child(1) .hud-lbl');
  const hudRegionLabel = document.querySelector('.hud-data-row:nth-child(2) .hud-lbl');
  const hudCoordsLabel = document.querySelector('.hud-data-row:nth-child(3) .hud-lbl');
  const hudSignalLabel = document.querySelector('.hud-data-row:nth-child(4) .hud-lbl');
  if (hudCityLabel) hudCityLabel.textContent = dict.hudCity;
  if (hudRegionLabel) hudRegionLabel.textContent = dict.hudRegion;
  if (hudCoordsLabel) hudCoordsLabel.textContent = dict.hudCoords;
  if (hudSignalLabel) hudSignalLabel.textContent = dict.hudSignal;

  if (!STATE.selectedCity) {
    const hudCityVal = document.getElementById('hudCityName');
    const hudRegionVal = document.getElementById('hudRegionName');
    const hudCoordsVal = document.getElementById('hudCoordinates');
    const hudSignalVal = document.getElementById('hudSignalStrength');
    if (hudCityVal) hudCityVal.textContent = dict.hudScanning;
    if (hudRegionVal) hudRegionVal.textContent = dict.hudSearching;
    if (hudCoordsVal) hudCoordsVal.textContent = '--° N, --° E';
    if (hudSignalVal) {
      hudSignalVal.textContent = dict.hudSignalWeak;
      hudSignalVal.className = 'hud-val status-blink status-weak';
    }
  }
}

function applyNavAndDrawerTranslations(dict, lang) {
  const navLinks = document.querySelectorAll('.nav-links .nav-link-item');
  const navKeys = ['navHome', 'navServices', 'navCinema', 'navContact'];
  navLinks.forEach((link, idx) => {
    if (link && navKeys[idx] && dict[navKeys[idx]]) {
      link.textContent = dict[navKeys[idx]];
    }
  });

  const drawerLinks = document.querySelectorAll('.drawer-links .drawer-link-item');
  drawerLinks.forEach((link, idx) => {
    if (link && navKeys[idx] && dict[navKeys[idx]]) {
      link.textContent = dict[navKeys[idx]];
    }
  });

  const drawerTelemetry = document.querySelector('.drawer-footer .drawer-telemetry');
  if (drawerTelemetry) drawerTelemetry.textContent = dict.sysStatus;

  const closeMobileDrawerBtn = document.getElementById('closeMobileDrawerBtn');
  if (closeMobileDrawerBtn) {
    closeMobileDrawerBtn.setAttribute('aria-label', lang === 'pl' ? 'Zamknij' : 'Kapat');
  }
}

function applyHotspotTranslations(dict, lang) {
  const hotspots = document.querySelectorAll('.map-hotspot');
  hotspots.forEach(hotspot => {
    const cityKey = hotspot.dataset.city;
    const transCity = dict.cities[cityKey];
    if (transCity) {
      const label = hotspot.querySelector('.hotspot-label');
      const telemetry = hotspot.querySelector('.hotspot-telemetry');
      
      // Fix: If it's a district (e.g. Warszawa districts), preserve the district label and coords.
      if (label && !hotspot.dataset.iladi) {
        label.textContent = transCity.name;
      }
      if (telemetry && !hotspot.dataset.iladi) {
        telemetry.textContent = transCity.coords;
      }
      
      const displayName = hotspot.dataset.iladi ? hotspot.dataset.iladi.toUpperCase() : transCity.name;
      hotspot.setAttribute('aria-label', `${displayName} ${lang === 'pl' ? 'pokaz region' : 'bölgesini göster'}`);
    }
  });
}

function applyGatewayCardTranslations(dict, lang) {
  const cards = document.querySelectorAll('.cc-gateway-card');
  cards.forEach(card => {
    const cityKey = card.dataset.city;
    const transCity = dict.cities[cityKey];
    if (!transCity) return;

    const pill = card.querySelector('.cc-flag-pill');
    if (pill) pill.textContent = `🎪 ${transCity.name}`;

    const title = card.querySelector('.cc-gateway-title');
    const sub = card.querySelector('.cc-gateway-sub');
    if (title) title.textContent = transCity.name;
    if (sub) sub.textContent = transCity.sub;

    const featureList = card.querySelector('.cc-features');
    if (featureList) {
      featureList.innerHTML = '';
      const features = lang === 'pl' ? [
        'Sprzątanie Domów & Willi',
        cityKey === 'Istanbul' || cityKey === 'Kocaeli' || cityKey === 'Samsun' ? 'Biura & Lokale' : 'Hotele & Apartamenty',
        'Codzienne Sprzątanie'
      ] : [
        'Ev & Villa Temizliği',
        cityKey === 'Istanbul' || cityKey === 'Kocaeli' || cityKey === 'Samsun' ? 'Ofis & Plaza' : 'Otel & Tatil Köyü',
        'Günlük Temizlik'
      ];
      features.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f;
        featureList.appendChild(li);
      });
    }

    const labels = card.querySelectorAll('.cc-tel-label');
    if (labels.length >= 3) {
      labels[0].textContent = lang === 'pl' ? 'OPERACJA:' : 'OPERASYON:';
      labels[1].textContent = lang === 'pl' ? 'PING:' : 'PİNG HIZI:';
      labels[2].textContent = lang === 'pl' ? 'ZABEZPIECZENIE:' : 'GÜVENLİK:';
    }

    const values = card.querySelectorAll('.cc-tel-value');
    if (values.length >= 3) {
      if (values[0].textContent.includes('AKTİF') || values[0].textContent.includes('AKTYWNY')) {
        values[0].textContent = lang === 'pl' ? 'ONLINE / AKTYWNY' : 'ONLINE / AKTİF';
      }
    }

    const btn = card.querySelector('.city-select-btn');
    if (btn) btn.textContent = lang === 'pl' ? 'WYBIERZ ➔' : 'SEÇ ➔';
    card.setAttribute('aria-label', `${transCity.name} - ${lang === 'pl' ? 'wybierz usługi sprzątania' : 'temizlik hizmetlerini seçin'}`);
  });

  const mobileCityBtns = document.querySelectorAll('.mobile-city-btn');
  mobileCityBtns.forEach(btn => {
    const cityKey = btn.dataset.city;
    const transCity = dict.cities[cityKey];
    if (transCity) {
      const cityNameEl = btn.querySelector('.btn-city-name');
      const cityMarketEl = btn.querySelector('.btn-city-market');
      if (cityNameEl) cityNameEl.textContent = transCity.name;
      if (cityMarketEl) cityMarketEl.textContent = transCity.market;
    }
    if (lang === 'pl') {
      if (cityKey === 'Istanbul') {
        btn.style.display = 'flex';
      } else {
        btn.style.display = 'none';
      }
    } else {
      btn.style.display = 'flex';
    }
  });

  const currentCityLabel = document.getElementById('currentCityLabel');
  if (currentCityLabel && STATE.selectedCity) {
    const transCity = dict.cities[STATE.selectedCity];
    if (transCity) currentCityLabel.textContent = transCity.name;
  }
}

function applyBookingTranslations(dict, lang) {
  const revealTitle = document.querySelector('.booking-reveal-screen .reveal-title');
  const revealSubtitle = document.querySelector('.booking-reveal-screen .reveal-subtitle');
  if (revealTitle) revealTitle.textContent = dict.bookingTitle;
  if (revealSubtitle) revealSubtitle.textContent = dict.bookingSubtitle;

  const fPhoneLbl = document.getElementById('fPhoneLbl');
  const fEmailLbl = document.getElementById('fEmailLbl');
  const fHoursLbl = document.getElementById('fHoursLbl');
  const fCopyLbl = document.getElementById('fCopyLbl');

  if (fPhoneLbl) {
    if (dict.footerPhone) fPhoneLbl.textContent = dict.footerPhone;
    const phoneValSpan = fPhoneLbl.parentNode.querySelector('.footer-contact-val');
    const phoneLink = fPhoneLbl.closest('a');
    if (phoneValSpan && dict.contactPhone) phoneValSpan.textContent = dict.contactPhone;
    if (phoneLink && dict.contactPhoneValue) phoneLink.setAttribute('href', `tel:${dict.contactPhoneValue}`);
  }
  if (fEmailLbl) {
    if (dict.footerEmail) fEmailLbl.textContent = dict.footerEmail;
    const emailValSpan = fEmailLbl.parentNode.querySelector('.footer-contact-val');
    const emailLink = fEmailLbl.closest('a');
    if (emailValSpan && dict.contactEmail) emailValSpan.textContent = dict.contactEmail;
    if (emailLink && dict.contactEmail) emailLink.setAttribute('href', `mailto:${dict.contactEmail}`);
  }
  if (fHoursLbl && dict.footerWorkingHours) fHoursLbl.textContent = dict.footerWorkingHours;
  if (fCopyLbl && dict.footerCopyright) fCopyLbl.textContent = dict.footerCopyright;

  // Translate ilaclama service selection card headers & tags dynamically
  const cardIlaclama = document.querySelector('.service-select-item[data-service="ilaclama"]');
  if (cardIlaclama) {
    const h4 = cardIlaclama.querySelector('h4');
    const p = cardIlaclama.querySelector('.service-select-info p');
    const pills = cardIlaclama.querySelectorAll('.service-select-tag-pill');
    
    if (lang === 'pl') {
      if (h4) h4.textContent = 'Dezynsekcja & Dezynfekcja';
      if (p) p.textContent = 'Rozwiązania do zwalczania bakterii i szkodników';
      if (pills.length >= 3) {
        pills[0].textContent = 'Kontrola szkodników';
        pills[1].textContent = 'Sterylizacja';
        pills[2].textContent = 'Atestowane środki';
      }
    } else {
      if (h4) h4.textContent = 'İlaçlama';
      if (p) p.textContent = 'Bakteri ve haşere kontrol çözümleri';
      if (pills.length >= 3) {
        pills[0].textContent = 'Haşere Kontrol';
        pills[1].textContent = 'Sterilizasyon';
        pills[2].textContent = 'Bakanlık Onaylı';
      }
    }
  }

  // Translate insaat_sonrasi service selection card headers & tags dynamically
  const cardInsaat = document.querySelector('.service-select-item[data-service="insaat_sonrasi"]');
  if (cardInsaat) {
    const h4 = cardInsaat.querySelector('h4');
    const p = cardInsaat.querySelector('.service-select-info p');
    const pills = cardInsaat.querySelectorAll('.service-select-tag-pill');
    
    if (lang === 'pl') {
      if (h4) h4.textContent = 'Po budowie / remoncie';
      if (p) p.textContent = 'Głębokie sprzątanie po budowie i remontach';
      if (pills.length >= 3) {
        pills[0].textContent = 'Po remoncie';
        pills[1].textContent = 'Usuwanie pyłu';
        pills[2].textContent = 'Czyszczenie spoin';
      }
    } else {
      if (h4) h4.textContent = 'İnşaat Sonrası';
      if (p) p.textContent = 'Tadilat ve inşaat sonrası derin temizlik';
      if (pills.length >= 3) {
        pills[0].textContent = 'Tadilat Sonrası';
        pills[1].textContent = 'İnce Toz Temizliği';
        pills[2].textContent = 'Kalıntı Arındırma';
      }
    }
  }

  // Translate tasinma_sonrasi service selection card headers & tags dynamically
  const cardTasinma = document.querySelector('.service-select-item[data-service="tasinma_sonrasi"]');
  if (cardTasinma) {
    const h4 = cardTasinma.querySelector('h4');
    const p = cardTasinma.querySelector('.service-select-info p');
    const pills = cardTasinma.querySelectorAll('.service-select-tag-pill');
    
    if (lang === 'pl') {
      if (h4) h4.textContent = 'Przed/po przeprowadzce';
      if (p) p.textContent = 'Głębokie sprzątanie przed lub po przeprowadzce';
      if (pills.length >= 3) {
        pills[0].textContent = 'Puste mieszkanie';
        pills[1].textContent = 'Czyszczenie szafek';
        pills[2].textContent = 'Przeprowadzka';
      }
    } else {
      if (h4) h4.textContent = 'Taşınma Temizliği';
      if (p) p.textContent = 'Taşınma öncesi veya sonrası detaylı temizlik';
      if (pills.length >= 3) {
        pills[0].textContent = 'Boş Ev Temizliği';
        pills[1].textContent = 'Dolap İçi Hijyen';
        pills[2].textContent = 'Taşınma Öncesi/Sonrası';
      }
    }
  }

  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    const labels = bookingForm.querySelectorAll('label');
    if (labels.length >= 4) {
      labels[0].textContent = dict.bookingLabelName;
      labels[1].textContent = dict.bookingLabelPhone;
      labels[2].textContent = dict.bookingLabelCity;
      labels[3].textContent = dict.bookingLabelType;
    }
    const lblDate = document.getElementById('lblBookingLabelDate');
    const lblPrice = document.getElementById('lblBookingLabelPrice');
    if (lblDate && dict.bookingLabelDate) {
      lblDate.textContent = dict.bookingLabelDate;
    }
    if (lblPrice && dict.bookingLabelPrice) {
      lblPrice.textContent = dict.bookingLabelPrice;
    }
    
    // Translate extra service labels
    const lblExtras = document.getElementById('lblBookingLabelExtras');
    if (lblExtras && dict.bookingLabelExtras) lblExtras.textContent = dict.bookingLabelExtras;
    const lblExBalkon = document.getElementById('lblExtraBalkon');
    if (lblExBalkon && dict.extraBalkon) lblExBalkon.textContent = dict.extraBalkon;
    const lblExBulasik = document.getElementById('lblExtraBulasik');
    if (lblExBulasik && dict.extraBulasik) lblExBulasik.textContent = dict.extraBulasik;
    const lblExPet = document.getElementById('lblExtraPet');
    if (lblExPet && dict.extraPet) lblExPet.textContent = dict.extraPet;
    const lblExFirin = document.getElementById('lblExtraFirin');
    if (lblExFirin && dict.extraFirin) lblExFirin.textContent = dict.extraFirin;
    const lblExUtu = document.getElementById('lblExtraUtu');
    if (lblExUtu && dict.extraUtu) lblExUtu.textContent = dict.extraUtu;

    // Translate frequency label & options
    const lblFrequency = document.getElementById('lblBookingLabelFrequency');
    if (lblFrequency && dict.bookingLabelFrequency) lblFrequency.textContent = dict.bookingLabelFrequency;
    const cFrequencySelect = document.getElementById('cFrequency');
    if (cFrequencySelect) {
      cFrequencySelect.options[0].textContent = lang === 'pl' ? 'Jednorazowo' : 'Tek Seferlik Temizlik';
      cFrequencySelect.options[1].textContent = lang === 'pl' ? 'Co tydzień' : 'Haftalık Düzenli Temizlik';
      cFrequencySelect.options[2].textContent = lang === 'pl' ? 'Co miesiąc' : 'Aylık Düzenli Temizlik';
    }

    const lblM2Sel = document.getElementById('lblM2Selected');
    if (lblM2Sel && dict.bookingLabelM2Selected) {
      lblM2Sel.textContent = dict.bookingLabelM2Selected;
    }
    const lblPromo = document.getElementById('lblBookingLabelPromo');
    if (lblPromo && dict.bookingLabelPromo) lblPromo.textContent = dict.bookingLabelPromo;
    const promoInput = document.getElementById('cPromoCode');
    if (promoInput && dict.promoPlaceholder) promoInput.placeholder = dict.promoPlaceholder;
    const btnApplyPromo = document.getElementById('btnApplyPromo');
    if (btnApplyPromo && dict.promoApplyBtn) btnApplyPromo.textContent = dict.promoApplyBtn;
    const lblEstimated = document.getElementById('lblEstimatedPrice');
    if (lblEstimated && dict.bookingEstimatedPrice) {
      lblEstimated.textContent = dict.bookingEstimatedPrice;
    }
    updatePriceSliderConfig();

    const submitBtn = bookingForm.querySelector('.cinema-submit-btn');
    if (submitBtn) submitBtn.textContent = dict.bookingSubmit;

    const successTitle = document.getElementById('lblBookingSuccessTitle');
    if (successTitle && dict.bookingSuccessTitle) successTitle.textContent = dict.bookingSuccessTitle;
    const successText = document.getElementById('lblBookingSuccessText');
    if (successText && dict.bookingSuccessText) successText.textContent = dict.bookingSuccessText;
    const successOk = document.getElementById('successOkBtn');
    if (successOk && dict.bookingSuccessOk) successOk.textContent = dict.bookingSuccessOk;
  }

  const cCitySelect = document.getElementById('cCity');
  const cCityLabel = document.querySelector('label[for="cCity"]');
  if (cCityLabel && dict.bookingLabelCity) {
    cCityLabel.textContent = dict.bookingLabelCity;
  }
  if (cCitySelect) {
    const previousVal = cCitySelect.value;
    cCitySelect.innerHTML = '';
    if (lang === 'pl') {
      const plCities = [
        'Warszawa', 'Srodmiescie', 'Mokotow', 'Wola', 'Ursynow', 'Bemowo', 'Bialoleka',
        'Praga-Polnoc', 'Praga-Poludnie', 'Targowek', 'Ochota', 'Zoliborz', 'Bielany',
        'Ursus', 'Wlochy', 'Wilanow', 'Wawer', 'Rembertow', 'Wesola',
        'Zabki', 'Marki', 'Sulejowek', 'Jozefow', 'Pruszkow', 'Piastow', 'Piaseczno', 'Konstancin-Jeziorna'
      ];
      plCities.forEach(cityKey => {
        const opt = document.createElement('option');
        opt.value = cityKey;
        opt.textContent = dict.cities[cityKey] ? dict.cities[cityKey].name : cityKey;
        cCitySelect.appendChild(opt);
      });
    } else {
      const trCities = ['Izmir', 'Sakarya', 'Istanbul', 'Kocaeli', 'Samsun', 'Balikesir'];
      trCities.forEach(cityKey => {
        const opt = document.createElement('option');
        opt.value = cityKey;
        opt.textContent = dict.cities[cityKey] ? dict.cities[cityKey].name : cityKey;
        cCitySelect.appendChild(opt);
      });
    }
    if (Array.from(cCitySelect.options).some(opt => opt.value === previousVal)) {
      cCitySelect.value = previousVal;
    }
  }

  const cServiceSelect = document.getElementById('cService');
  if (cServiceSelect) {
    const options = cServiceSelect.querySelectorAll('option');
    if (options.length >= 6) {
      options[0].textContent = lang === 'pl' ? 'Standardowe Sprzątanie' : 'Standart Temizlik';
      options[1].textContent = lang === 'pl' ? 'Głębokie Sprzątanie' : 'Detaylı Temizlik';
      options[2].textContent = lang === 'pl' ? 'Sprzątanie Firmowe (B2B)' : 'Kurumsal Temizlik (B2B)';
      options[3].textContent = lang === 'pl' ? 'Dezynsekcja & Dezynfekcja' : 'İlaçlama & Dezenfeksiyon';
      options[4].textContent = lang === 'pl' ? 'Sprzątanie po budowie / remoncie' : 'İnşaat Sonrası Temizlik';
      options[5].textContent = lang === 'pl' ? 'Sprzątanie przed/po przeprowadzce' : 'Taşınma Öncesi/Sonrası Temizlik';
    }
  }

  const successState = document.getElementById('bookingSuccessState');
  if (successState) {
    const h3 = successState.querySelector('h3');
    const p = successState.querySelector('p');
    const btn = successState.querySelector('.success-ok-btn');
    if (h3) h3.textContent = dict.bookingSuccessTitle;
    if (p) p.textContent = dict.bookingSuccessText;
    if (btn) btn.textContent = dict.bookingSuccessOk;
  }
}

function applyServicesModalTranslations(dict, lang) {
  const modalTitle = document.querySelector('.cinema-modal .modal-title');
  const modalSubtitle = document.querySelector('.cinema-modal .modal-subtitle');
  if (modalTitle) modalTitle.textContent = dict.modalServicesTitle;
  if (modalSubtitle) modalSubtitle.textContent = dict.modalServicesSubtitle;

  const serviceDetails = document.querySelectorAll('.service-item-detail');
  if (serviceDetails.length >= 4) {
    const stH4 = serviceDetails[0].querySelector('h4');
    const stP = serviceDetails[0].querySelector('p');
    if (stH4) stH4.textContent = lang === 'pl' ? 'Standardowe Sprzątanie' : 'Standart Temizlik';
    if (stP) stP.textContent = lang === 'pl' ? 'Ogólne porządki i podstawowa czystość dla domu i biura.' : 'Ev & Ofis için genel düzen ve temel hijyen çözümleri.';

    const dtH4 = serviceDetails[1].querySelector('h4');
    const dtP = serviceDetails[1].querySelector('p');
    if (dtH4) dtH4.textContent = lang === 'pl' ? 'Głębokie Sprzątanie' : 'Detaylı Temizlik';
    if (dtP) dtP.textContent = lang === 'pl' ? 'Dokładne czyszczenie zakamarków i głębokie usuwanie brudu.' : 'Dip köşe, ince temizlik ve detaylı yüzey arındırma.';

    const krH4 = serviceDetails[2].querySelector('h4');
    const krP = serviceDetails[2].querySelector('p');
    if (krH4) krH4.textContent = lang === 'pl' ? 'Sprzątanie Firmowe (B2B)' : 'Kurumsal Temizlik (B2B)';
    if (krP) krP.textContent = lang === 'pl' ? 'Okresowe usługi dla biur, restauracji i centrów biznesowych.' : 'İş yeri, restoran ve plazalar için periyodik çözümler.';

    const ilH4 = serviceDetails[3].querySelector('h4');
    const ilP = serviceDetails[3].querySelector('p');
    if (ilH4) ilH4.textContent = lang === 'pl' ? 'Sprzątanie po budowie / Przeprowadzka' : 'İnşaat / Taşınma Temizliği';
    if (ilP) ilP.textContent = lang === 'pl' ? 'Dokładne usuwanie pyłu budowlanego, resztek farby i gipsu.' : 'Tadilat kalıntıları, toz ve kaba pislik arındırma.';
  }

  const calcTitle = document.getElementById('modalCalcTitleLbl');
  if (calcTitle) calcTitle.textContent = dict.modalCalcTitle;

  const areaLabel = document.querySelector('.calc-field:nth-child(1) label');
  if (areaLabel) {
    const areaVal = document.getElementById('calc-area-range') ? parseInt(document.getElementById('calc-area-range').value) : 3;
    const layouts = lang === 'pl' ? ROOM_LAYOUTS_PL : ROOM_LAYOUTS_TR;
    const layoutText = layouts[areaVal] || areaVal;
    areaLabel.innerHTML = `${lang === 'pl' ? 'LICZBA POKOI / TYP DOMU' : 'ODA SAYISI / EV TİPİ'}: <span id="area-val-label">${layoutText}</span>`;
  }

  const freqLabel = document.querySelector('.calc-field:nth-child(2) label');
  if (freqLabel) freqLabel.textContent = dict.modalLabelFrequency;

  const freqSelect = document.getElementById('calc-frequency');
  if (freqSelect) {
    const options = freqSelect.querySelectorAll('option');
    if (options.length >= 3) {
      options[0].textContent = dict.modalFreqSingle;
      options[1].textContent = dict.modalFreqWeekly;
      options[2].textContent = dict.modalFreqMonthly;
    }
  }

  const extrasLabel = document.querySelector('.calc-field:nth-child(3) label');
  if (extrasLabel) extrasLabel.textContent = dict.modalLabelExtras;

  const extraCBs = document.querySelectorAll('.calc-cb-label');
  if (extraCBs.length >= 3) {
    const isPl = lang === 'pl';
    const cbTexts = [
      isPl ? 'Dokładne mycie okien' : 'Detaylı Cam Temizliği',
      isPl ? 'Wnętrze piekarnika & AGD' : 'Fırın & Beyaz Eşya İçi',
      isPl ? 'Mycie balkonu' : 'Balkon Yıkama'
    ];
    extraCBs.forEach((label, idx) => {
      const cb = label.querySelector('.calc-extra-cb');
      if (cb) {
        while (label.childNodes.length > 0 && label.lastChild !== cb) {
          label.removeChild(label.lastChild);
        }
        label.appendChild(document.createTextNode(' ' + cbTexts[idx]));
      }
    });
  }

  const resultLabel = document.querySelector('.calculator-result-box .calc-result-lbl');
  if (resultLabel) resultLabel.textContent = dict.modalCalcCost;

  const priceDisplay = document.getElementById('calc-price-display');
  if (priceDisplay) {
    priceDisplay.textContent = lang === 'pl' ? 'OFERTA ZOSTANIE PRZYGOTOWANA' : 'TEKLİF HAZIRLANACAK';
  }

  const disclaimer = document.querySelector('.calculator-result-box .calc-disclaimer');
  if (disclaimer) disclaimer.textContent = dict.modalCalcDisclaimer;

  const applyBtn = document.getElementById('calcApplyBtn');
  if (applyBtn) applyBtn.textContent = dict.modalCalcApply;
}

function applyCountrySelectorTranslations(dict, lang) {
  const csoTitle = document.querySelector('#country-selector-overlay .cso-title');
  const csoSubtitle = document.querySelector('#country-selector-overlay .cso-subtitle');
  if (csoTitle && dict.csoTitle) csoTitle.textContent = dict.csoTitle;
  if (csoSubtitle && dict.csoSubtitle) csoSubtitle.textContent = dict.csoSubtitle;

  const csoTurkeyLabel = document.querySelector('#csoBtnTurkey .cso-country-name');
  const csoTurkeySub = document.querySelector('#csoBtnTurkey .cso-country-sub');
  if (csoTurkeyLabel) csoTurkeyLabel.textContent = lang === 'pl' ? 'Turcja' : 'Türkiye';
  if (csoTurkeySub && dict.csoCardTurkeySub) csoTurkeySub.textContent = dict.csoCardTurkeySub;

  const csoPolandLabel = document.querySelector('#csoBtnPoland .cso-country-name');
  const csoPolandSub = document.querySelector('#csoBtnPoland .cso-country-sub');
  if (csoPolandLabel) csoPolandLabel.textContent = lang === 'pl' ? 'Polska' : 'Polonya';
  if (csoPolandSub && dict.csoCardPolandSub) csoPolandSub.textContent = dict.csoCardPolandSub;
}

function applyServiceSelectTranslations(lang) {
  const selectItems = document.querySelectorAll('.service-select-item');
  if (selectItems.length < 4) return;

  const data = {
    tr: [
      {
        badge: 'En Popüler',
        title: 'Standart',
        desc: 'Genel düzen ve temel hijyen çözümleri',
        tags: ['Toz Alma', 'Süpürme', 'Yüzey Hijyeni']
      },
      {
        badge: 'Tavsiye Edilen',
        title: 'Detaylı',
        desc: 'Derin temizlik ve hassas leke arındırma',
        tags: ['Buharlı Hijyen', 'Dip Köşe', 'Leke Arındırma']
      },
      {
        badge: 'İşletmeler İçin',
        title: 'Kurumsal B2B',
        desc: 'İş yeri, restoran ve plaza temizliği',
        tags: ['Ofis & Plaza', 'Esnek Saatler', 'Özel Raporlama']
      },
      {
        badge: 'Sertifikalı',
        title: 'İlaçlama',
        desc: 'Bakteri ve haşere kontrol çözümleri',
        tags: ['Haşere Kontrol', 'Dezenfeksiyon', 'Ortam Hijyeni']
      }
    ],
    pl: [
      {
        badge: 'Najpopularniejsza',
        title: 'Standardowe',
        desc: 'Ogólne porządki i podstawowa czystość',
        tags: ['Ścieranie Kurzu', 'Odkurzanie', 'Higiena Powierzchni']
      },
      {
        badge: 'Polecana',
        title: 'Głębokie',
        desc: 'Dokładne czyszczenie i usuwanie plam',
        tags: ['Czyszczenie Parowe', 'Kąty i Zakamarki', 'Usuwanie Plam']
      },
      {
        badge: 'Dla Firm',
        title: 'Firmowe B2B',
        desc: 'Sprzątanie biur, restauracji i lokali',
        tags: ['Biura & Plazy', 'Elastyczne Godziny', 'Specjalny Raport']
      },
      {
        badge: 'Certyfikowana',
        title: 'Dezynsekcja',
        desc: 'Rozwiązania kontroli bakterii i szkodników',
        tags: ['Kontrola Szkodników', 'Dezynfekcja', 'Higiena Otoczenia']
      }
    ]
  };

  const list = data[lang] || data.tr;
  selectItems.forEach((item, idx) => {
    const itemData = list[idx];
    if (!itemData) return;

    const badge = item.querySelector('.service-select-badge');
    const title = item.querySelector('.service-select-info h4');
    const desc = item.querySelector('.service-select-info p');
    const tags = item.querySelectorAll('.service-select-tag-pill');

    if (badge) badge.textContent = itemData.badge;
    if (title) title.textContent = itemData.title;
    if (desc) desc.textContent = itemData.desc;
    tags.forEach((tag, tIdx) => {
      if (itemData.tags[tIdx]) tag.textContent = itemData.tags[tIdx];
    });
  });

  const headerTitle = document.querySelector('.services-select-title');
  const headerSubtitle = document.querySelector('.services-select-subtitle');
  const headerHud = document.querySelector('.hud-system-status');
  const stepCounter = document.querySelector('.hud-step-counter');

  if (headerTitle) {
    headerTitle.textContent = lang === 'pl' ? 'Wybór Usługi' : 'Hizmet Seçimi';
  }
  if (headerSubtitle) {
    headerSubtitle.textContent = lang === 'pl' ? 'Wybierz rodzaj usługi sprzątania' : 'Almak istediğiniz temizlik hizmetini seçin';
  }
  if (headerHud) {
    headerHud.textContent = lang === 'pl' ? 'Nasze usługi' : 'Hizmetlerimiz';
  }
  if (stepCounter) {
    stepCounter.textContent = lang === 'pl' ? 'Krok 2' : 'Adım 2';
  }

  const continueLabel = document.querySelector('#servicesContinueBtn .btn-label');
  if (continueLabel) {
    continueLabel.textContent = lang === 'pl' ? 'Kontynuuj' : 'Devam Et';
  }
}

function applyLanguage(lang) {
  STATE.language = lang;
  STATE.currentLang = lang;

  const dict = TRANSLATIONS[lang];
  if (!dict) return;

  logDebug(`Applying language: ${lang}`);

  applyPageMetaTranslations(dict, lang);
  applyPortalHudTranslations(dict, lang);
  applyNavAndDrawerTranslations(dict, lang);
  applyHotspotTranslations(dict, lang);
  applyGatewayCardTranslations(dict, lang);
  applyBookingTranslations(dict, lang);
  applyServicesModalTranslations(dict, lang);
  applyCountrySelectorTranslations(dict, lang);
  applyServiceSelectTranslations(lang);

  if (typeof calculatePriceFn === 'function') {
    calculatePriceFn();
  }

  if (STATE.calculator.serviceType) {
    selectServiceGlobal(STATE.calculator.serviceType);
  }
}

// Module-level cached elements to prevent DOM query overhead
let bookingRevealEl = null;
let scenes = [];

function resetCinemaState() {
  const cState = STATE.cinema;
  if (!cState) return;

  logDebug("Resetting cinema state variables...");

  // Reset main scene states
  cState.activeIdx = -1;
  cState.activeTextBlockIdx = -1;
  cState.targetRadius = 120;
  cState.currentRadius = 120;
  cState.targetX = 50;
  cState.currentX = 50;
  cState.targetY = 50;
  cState.currentY = 50;
  cState.isScrubbing = false;

  if (cState.sceneStates && Array.isArray(cState.sceneStates)) {
    cState.sceneStates.forEach((state) => {
      state.currentTime = 0;
      state.targetTime = 0;
      state.currentOpacity = 0;
      state.targetOpacity = 0;
      state.currentVideoY = 50;
      state.targetVideoY = 50;
      state.currentVideoX = 50;
      state.targetVideoX = 50;
      // Optimization cache variables
      state.lastAppliedOpacity = null;
      state.lastAppliedVisibility = null;
      state.lastAppliedVideoY = null;
      state.lastAppliedVideoX = null;
    });
  }

  // Reset intro video state
  if (cState.introVideoState) {
    cState.introVideoState.currentTime = 0;
    cState.introVideoState.targetTime = 0;
    cState.introVideoState.currentScale = 1.0;
    cState.introVideoState.targetScale = 1.0;
    cState.introVideoState.currentTranslateY = 0;
    cState.introVideoState.targetTranslateY = 0;
    cState.introVideoState.currentOpacity = 1.0;
    cState.introVideoState.targetOpacity = 1.0;
    // Optimization cache variables
    cState.introVideoState.lastAppliedOpacity = null;
    cState.introVideoState.lastAppliedVisibility = null;
    cState.introVideoState.lastAppliedScale = null;
    cState.introVideoState.lastAppliedTranslateY = null;
  }

  // Reset intro text state
  if (cState.introTextState) {
    cState.introTextState.currentOffset = 0;
    cState.introTextState.targetOffset = 0;
    cState.introTextState.currentOpacity = 1.0;
    cState.introTextState.targetOpacity = 1.0;
    // Optimization cache variables
    cState.introTextState.lastAppliedCardOpacity = null;
    cState.introTextState.lastAppliedPointerEvents = null;
    cState.introTextState.lastAppliedVisibility = null;
    cState.introTextState.lastAppliedOffset = null;
    cState.introTextState.lastAppliedTextOpacity = null;
  }

  // 1. Reset all intro videos in the DOM
  const introVideos = document.querySelectorAll('.cinema-intro-card .intro-video');
  introVideos.forEach(video => {
    video.pause();
    try {
      video.currentTime = 0;
    } catch (e) {
      logErrorDebug("Failed to reset intro video time:", e);
    }
    video.style.transform = '';
    video.style.opacity = '';
    video.style.visibility = '';
  });

  // 2. Reset all main scene videos
  if (scenes && Array.isArray(scenes)) {
    scenes.forEach((sc) => {
      const video = sc.video;
      if (video) {
        video.pause();
        try {
          video.currentTime = 0;
        } catch (e) {
          logErrorDebug("Failed to reset scene video time:", e);
        }
        video.style.opacity = '0';
        video.style.visibility = 'hidden';
        video.style.setProperty('--video-y', '50%');
      }
    });
  }

  // 3. Reset text block classes
  const textBlocks = document.querySelectorAll('.scene-text-block');
  textBlocks.forEach(block => block.classList.remove('active'));

  // 4. Reset intro card container inline styles
  const introCard = document.getElementById('introCard');
  if (introCard) {
    introCard.style.opacity = '';
    introCard.style.visibility = '';
    introCard.style.pointerEvents = '';
  }

  // 5. Reset split text elements
  const introCityTitle = document.getElementById('introCityTitle');
  if (introCityTitle) {
    introCityTitle.style.opacity = '';
    introCityTitle.style.transform = '';
  }

  const splitLeft = introCard?.querySelector('.title-split-left');
  const splitRight = introCard?.querySelector('.title-split-right');
  const eyebrow = introCard?.querySelector('.intro-eyebrow');
  const subtitle = introCard?.querySelector('.intro-subtitle');
  const scrollHint = introCard?.querySelector('.intro-scroll-hint');
  const dividerLines = introCard?.querySelectorAll('.intro-divider-line');
  const diamond = introCard?.querySelector('.intro-divider-diamond');

  if (splitLeft) { splitLeft.style.transform = ''; splitLeft.style.opacity = ''; }
  if (splitRight) { splitRight.style.transform = ''; splitRight.style.opacity = ''; }
  if (eyebrow) { eyebrow.style.transform = ''; eyebrow.style.opacity = ''; }
  if (subtitle) { subtitle.style.transform = ''; subtitle.style.opacity = ''; }
  if (scrollHint) { scrollHint.style.transform = ''; scrollHint.style.opacity = ''; }
  if (dividerLines && dividerLines.length >= 2) {
    dividerLines[0].style.transform = ''; dividerLines[0].style.opacity = '';
    dividerLines[1].style.transform = ''; dividerLines[1].style.opacity = '';
  }
  if (diamond) { diamond.style.transform = ''; diamond.style.opacity = ''; }

  logDebug("Cinema state reset complete.");
}

// Prewarming Priority Queue
const prewarmQueue = [];
let isPrewarming = false;

function processPrewarmQueue() {
  if (prewarmQueue.length === 0) {
    isPrewarming = false;
    return;
  }
  isPrewarming = true;
  const idx = prewarmQueue.shift();
  const sc = scenes[idx];
  if (sc && sc.video && sc.video.dataset.warmedUp !== 'true') {
    warmupVideo(sc.video);
    // Short gap: warming must keep up with fast scrolling so upcoming scenes are
    // decoded before they cross-fade in (otherwise they render blank/white).
    setTimeout(processPrewarmQueue, 80);
  } else {
    processPrewarmQueue();
  }
}

function prewarmAround(activeIdx) {
  if (!scenes || scenes.length === 0) return;

  const isMobile = window.innerWidth <= 768;

  // Mobile optimization: Prewarm the active video immediately, and load neighbors sequentially
  if (isMobile) {
    const activeSc = scenes[activeIdx];
    if (activeSc && activeSc.video) {
      warmupVideo(activeSc.video);
    }

    // Warm EVERY upcoming scene (scrolling only moves forward through a fixed
    // 12-clip sequence) plus the previous one for back-scroll. The render loop
    // never unloads ahead scenes, so once warmed they stay decoded — this is what
    // keeps the last scenes (e.g. viking) from rendering blank under fast scroll,
    // where a sliding window would unload/reload them and never finish in time.
    const mobileNeighbors = [];
    for (let n = activeIdx + 1; n < scenes.length; n++) mobileNeighbors.push(n);
    mobileNeighbors.push(activeIdx - 1);
    prewarmQueue.length = 0;
    mobileNeighbors.forEach(n => {
      if (n >= 0 && n < scenes.length) {
        const sc = scenes[n];
        if (sc && sc.video && sc.video.dataset.warmedUp !== 'true') {
          prewarmQueue.push(n);
        }
      }
    });

    if (prewarmQueue.length > 0 && !isPrewarming) {
      processPrewarmQueue();
    } else if (prewarmQueue.length === 0) {
      isPrewarming = false;
    }
    return;
  }

  // 1. Generate priority list based on distance to active viewport scene
  const order = [activeIdx];
  const neighbors = [activeIdx + 1, activeIdx + 2, activeIdx - 1, activeIdx + 3];
  neighbors.forEach(n => {
    if (n >= 0 && n < scenes.length && !order.includes(n)) {
      order.push(n);
    }
  });
  for (let i = 0; i < scenes.length; i++) {
    if (!order.includes(i)) {
      order.push(i);
    }
  }

  // 2. Only queue files that are not already warmed up
  const pending = order.filter(idx => {
    const sc = scenes[idx];
    return sc && sc.video && sc.video.dataset.warmedUp !== 'true';
  });

  logDebug(`Re-prioritizing prewarm queue for index ${activeIdx}. Pending warmups:`, pending);

  // 3. Clear the queue and load prioritized list
  prewarmQueue.length = 0;
  pending.forEach(idx => prewarmQueue.push(idx));

  if (!isPrewarming) {
    processPrewarmQueue();
  }
}

// Video Decoder Warmup Utility
function warmupVideo(video) {
  if (!video || video.dataset.warmedUp === 'true') return;

  // Restore source if dynamically unloaded
  if (window.innerWidth <= 768 && (!video.src || video.src === '')) {
    const originalSrc = video.dataset.originalSrc || video.getAttribute('src');
    if (originalSrc) {
      video.setAttribute('src', originalSrc);
    }
  }

  video.dataset.warmedUp = 'true';
  
  logDebug(`Warming up video decoder for: ${video.id} (${video.getAttribute('src')})`);
  
  video.preload = 'auto'; // Force full asset loading
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');

  try {
    video.load();
  } catch (e) {
    logErrorDebug(`Warmup exception on ${video.id}:`, e);
  }

  // Force the decoder to buffer an actual renderable frame. load()+preload only
  // reliably reaches HAVE_METADATA (readyState 1) for a hidden, never-played video
  // — browsers throttle frame buffering for such videos, so an upcoming scene would
  // still render blank/white the instant it cross-fades in. A muted play→immediate
  // pause forces the first frames to decode (readyState climbs to >=2), so the
  // scene is paint-ready well before it scrolls into view.
  const forceDecode = () => {
    if (video.dataset.warmedUp !== 'true') return; // was unloaded again meanwhile
    try {
      const p = video.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { try { video.pause(); } catch (e) {} })
         .catch(() => {});
      } else {
        try { video.pause(); } catch (e) {}
      }
    } catch (e) {}
  };
  if (video.readyState >= 1) {
    forceDecode();
  } else {
    video.addEventListener('loadedmetadata', forceDecode, { once: true });
  }
}

// Regional styling and themes configuration loaded from state.js module

// ==========================================
// 1. DUST CANVAS & AMBIENT PARTICLE SYSTEM
// ==========================================

function setupPortalParticles() {
  const canvas = document.getElementById('dust-canvas');
  const portalStage = document.getElementById('portal-stage');
  if (!canvas || !portalStage) return;
  const ctx = canvas.getContext('2d');

  if (canvasAnimationId) {
    cancelAnimationFrame(canvasAnimationId);
    canvasAnimationId = null;
  }

  let lastDrawTime = performance.now();
  let explosionParticles = [];
  portalTargetHue = 220; // Default blue-cyan
 
  if (resizeCanvasHandler) {
    window.removeEventListener('resize', resizeCanvasHandler);
  }

  const resizeCanvas = () => {
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
 
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
 
    if (oldWidth > 0 && oldHeight > 0) {
      const scaleX = canvas.width / oldWidth;
      const scaleY = canvas.height / oldHeight;
      STATE.ambientParticles.forEach(p => {
        p.x *= scaleX;
        p.y *= scaleY;
      });
      explosionParticles.forEach(p => {
        p.x *= scaleX;
        p.y *= scaleY;
      });
    }
  };
  resizeCanvas();
  const debouncedResize = debounce(resizeCanvas, 150);
  window.addEventListener('resize', debouncedResize);
  resizeCanvasHandler = debouncedResize;

  // Track mouse position specifically for particle attraction gravity physics
  if (portalMouseMoveHandler) {
    window.removeEventListener('mousemove', portalMouseMoveHandler);
  }

  let pmx = window.innerWidth / 2;
  let pmy = window.innerHeight / 2;

  const trackPortalMouse = (e) => {
    pmx = e.clientX;
    pmy = e.clientY;
  };
  window.addEventListener('mousemove', trackPortalMouse);
  portalMouseMoveHandler = trackPortalMouse;

  // Initialize gentle ambient floating particles
  const ambientCount = 35;
  STATE.ambientParticles = Array.from({ length: ambientCount }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    size: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.4 + 0.1,
    hue: 220 // Initial blue
  }));

  // Setup click handler anywhere on stage for dust bursts
  if (portalStageClickHandler) {
    portalStage.removeEventListener('click', portalStageClickHandler);
  }
  portalStageClickHandler = (e) => {
    if (!e.target.closest('.cc-gateway-card') && !e.target.closest('.map-hotspot')) {
      window.triggerDust(e.clientX, e.clientY);
    }
  };
  portalStage.addEventListener('click', portalStageClickHandler);
 
  // Expose explosion trigger globally
  window.triggerDust = function(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    const px = cx - rect.left;
    const py = cy - rect.top;

    const burst = Array.from({ length: 60 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      return {
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2, // upward drift
        size: Math.random() * 2.2 + 0.8,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.015,
        hue: portalTargetHue + (Math.random() - 0.5) * 15 // Match current selection theme color
      };
    });
    explosionParticles = [...explosionParticles, ...burst];
  };

  // Main canvas rendering loop
  function drawLoop() {
    const now = performance.now();
    let dt = (now - lastDrawTime) / 16.666;
    lastDrawTime = now;

    if (dt > 10) dt = 1.0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Render & update ambient particles (uses dt-scaled attraction physics)
    STATE.ambientParticles.forEach(p => {
      // Calculate distance to mouse for particle attraction
      const dx = pmx - p.x;
      const dy = pmy - p.y;
      const distSq = dx * dx + dy * dy;

      if (window.warpTarget && window.warpTarget.active) {
        const wdx = window.warpTarget.x - p.x;
        const wdy = window.warpTarget.y - p.y;
        const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
        if (wdist > 5) {
          // Gravitational pull toward coordinates
          const gravity = 0.45 * dt;
          p.vx += (wdx / wdist) * gravity;
          p.vy += (wdy / wdist) * gravity;

          // Cross swirl tangential orbit force
          const swirl = 0.22 * dt;
          p.vx += (-wdy / wdist) * swirl;
          p.vy += (wdx / wdist) * swirl;
        }
      } else if (distSq < 48400 && distSq > 100) { // 220^2 = 48400, 10^2 = 100
        const dist = Math.sqrt(distSq);
        const force = ((220 - dist) / 220) * 0.015;
        p.vx += (dx / dist) * force * dt;
        p.vy += (dy / dist) * force * dt;
      }

      // Physics friction to prevent velocity build-up
      p.vx *= Math.pow(0.97, dt);
      p.vy *= Math.pow(0.97, dt);

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Smoothly shift particle hue towards target selection hue
      p.hue += (portalTargetHue - p.hue) * 0.05 * dt;

      // Wrap borders
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.globalAlpha = p.opacity * 0.45;
      ctx.fillStyle = `hsl(${p.hue}, 30%, 55%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Render & update active explosion bursts
    explosionParticles = explosionParticles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.05 * dt; // gravity scaled
      p.life -= p.decay * dt; // decay scaled

      if (p.life <= 0) return false;

      ctx.globalAlpha = p.life * 0.55;
      ctx.fillStyle = `hsl(${p.hue}, 65%, 50%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });

    if (shouldRunParticleLoop()) {
      canvasAnimationId = requestAnimationFrame(drawLoop);
    } else {
      canvasAnimationId = null;
    }
  }

  if (particlesVisibilityHandler) {
    document.removeEventListener('visibilitychange', particlesVisibilityHandler);
  }
  particlesVisibilityHandler = () => {
    if (shouldRunParticleLoop() && !canvasAnimationId) drawLoop();
  };
  document.addEventListener('visibilitychange', particlesVisibilityHandler);

  if (shouldRunParticleLoop()) {
    drawLoop();
  }
}

// ==========================================
// 2. STATE MANAGER & COLOR SYNCHRONIZER
function setSplitCityTitle(cityText) {
  const titleEl = document.getElementById('introCityTitle');
  if (!titleEl) return;
  titleEl.innerHTML = ''; // clear
  titleEl.style.opacity = '1'; // ensure parent is visible
  titleEl.style.transform = 'none'; // clear CSS start transform

  const mid = Math.ceil(cityText.length / 2);
  const leftText = cityText.slice(0, mid);
  const rightText = cityText.slice(mid);

  const spanLeft = document.createElement('span');
  spanLeft.className = 'title-split-left';
  spanLeft.textContent = leftText;
  splitLeftEl = spanLeft; // Cache immediately

  const spanRight = document.createElement('span');
  spanRight.className = 'title-split-right';
  spanRight.textContent = rightText;
  splitRightEl = spanRight; // Cache immediately

  titleEl.appendChild(spanLeft);
  titleEl.appendChild(spanRight);
}

function updateIntroVideoState(city) {
  if (!city) return;
  let targetId = `intro-video-${city.toLowerCase()}`;
  
  // Initialize cache if empty
  if (cachedIntroVideos.length === 0) {
    cachedIntroVideos = Array.from(document.querySelectorAll('.cinema-intro-card .intro-video'));
  }
  
  const hasTarget = cachedIntroVideos.some(v => v.id === targetId);
  if (!hasTarget) {
    targetId = CITY_TO_REGION[city] === 'mazowsze' ? 'intro-video-warszawa' : 'intro-video-istanbul';
  }
  
  cachedIntroVideos.forEach(video => {
    if (video.id === targetId) {
      video.classList.add('active');
      activeIntroVideoEl = video; // Track active reference
      video.loop = true;
      
      video.play().catch(e => {
        logErrorDebug(`Autoplay blocked or failed for intro video: ${video.id}`, e);
      });
    } else {
      video.classList.remove('active');
      video.pause();
      try {
        video.currentTime = 0;
      } catch (err) {}
    }
  });
}

function setCityState(city, shouldReset = true) {
  if (!city) return;

  const lang = STATE.language || STATE.currentLang || 'tr';
  if (lang === 'pl' && city === 'Istanbul') {
    city = 'Warszawa';
  }

  // Reset previous cinema scroll states & video playheads
  if (shouldReset) {
    resetCinemaState();
  }

  STATE.selectedCity = city;
  const region = CITY_TO_REGION[city] || 'marmara';
  STATE.selectedRegion = region;

  // Update Dynamic CSS Variables on :root
  const theme = REGION_THEMES[region] || REGION_THEMES.marmara;
  document.documentElement.style.setProperty('--clr-accent', theme.accent);
  document.documentElement.style.setProperty('--clr-accent-rgb', theme.rgb);

  // Get localized city data
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.tr;
  const cityData = dict.cities[city] || { name: city.toUpperCase(), sub: '' };

  // Update UI labels
  const label = document.getElementById('currentCityLabel');
  if (label) label.textContent = cityData.name;
  
  const formCitySelect = document.getElementById('cCity');
  if (formCitySelect && formCitySelect.value !== city) {
    formCitySelect.value = city;
  }

  // Personalize hero subtitle based on selected city
  const heroSubtitle = document.getElementById('heroSubtitle');
  if (heroSubtitle) {
    if (lang === 'tr') {
      heroSubtitle.innerHTML = `Sıradan temizlik anlayışını geride bırakın. <strong>${cityData.name}</strong> genelinde yaşam alanlarınızı sinematik bir disiplin ve kusursuz hijyenle buluşturuyoruz.`;
    } else {
      heroSubtitle.innerHTML = `Porzuć zwykłe standardy czystości. Wprowadzamy kinową dyscyplinę i nieskazitelną higienę w całym regionie <strong>${cityData.name}</strong>.`;
    }
  }

  // Update introductory title card text (split for sideways parting animation)
  const introCityTitle = document.getElementById('introCityTitle');
  if (introCityTitle) {
    setSplitCityTitle(cityData.name.toLocaleUpperCase(lang === 'pl' ? 'pl-PL' : 'tr-TR'));
  }

  // Update introductory background video
  updateIntroVideoState(city);

  // Save to localStorage
  localStorage.setItem('tworose_city', city);
}

function setupPortalIntroClick() {
  const introStage = document.getElementById('portal-intro-stage');
  if (!introStage) return;

  let triggered = false;

  // Parallax hover movement on mousemove
  const onMouseMove = (e) => {
    if (triggered) return;
    const { clientX, clientY } = e;
    const nx = (clientX / window.innerWidth) - 0.5;
    const ny = (clientY / window.innerHeight) - 0.5;

    // Subtle 3D tilting motion on background images (synchronized to prevent segmentation)
    gsap.to('.intro-panel-left .intro-panel-bg', { x: nx * 15, y: ny * 15, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
    gsap.to('.intro-panel-center .intro-panel-bg', { x: nx * 15, y: ny * 15, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
    gsap.to('.intro-panel-right .intro-panel-bg', { x: nx * 15, y: ny * 15, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });

    // Move borders slightly for shifting depth
    gsap.to('.panel-border', { x: nx * 8, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
  };
  introStage.addEventListener('mousemove', onMouseMove);

  const onTriggerIntro = () => {
    if (triggered) return;
    triggered = true;

    introStage.removeEventListener('click', onTriggerIntro);
    introStage.removeEventListener('touchstart', onTriggerIntro);
    introStage.removeEventListener('mousemove', onMouseMove);

    if (window.playTickSound) {
      window.playTickSound();
    }

    const tl = gsap.timeline({
      onComplete: () => {
        // Pause very briefly on the snapped-shut merged state, then scale out
        gsap.delayedCall(0.3, () => {
          gsap.to(introStage, {
            opacity: 0,
            scale: 1.15,
            duration: 0.85,
            ease: 'power3.inOut',
            onComplete: () => {
              introStage.style.display = 'none';
              introStage.remove();

              document.body.classList.remove('portal-intro-mode');
              document.body.classList.add('flag-selection-mode');

              if (STATE.lenisInstance) {
                STATE.lenisInstance.stop();
              }

              const csoOverlay = document.getElementById('country-selector-overlay');
              if (csoOverlay) {
                csoOverlay.classList.remove('cso-hidden');
                gsap.fromTo(csoOverlay, 
                  { opacity: 0, scale: 0.95 },
                  { opacity: 1, scale: 1, duration: 0.75, ease: 'power3.out' }
                );
              }
            }
          });
        });
      }
    });

    // 1. Initial split (expand panels outward, fade out logo and hint)
    tl.fromTo('.intro-panel-left', { x: '0vw' }, { x: '-12vw', duration: 0.45, ease: 'power2.out' }, 0)
      .fromTo('.intro-panel-right', { x: '0vw' }, { x: '12vw', duration: 0.45, ease: 'power2.out' }, 0)
      .fromTo('.intro-panel .panel-border', { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'none' }, 0)
      .to('.intro-logo-wrap', { opacity: 0, scale: 0.75, duration: 0.35, ease: 'power2.in' }, 0)
      .to('.intro-hint', { opacity: 0, y: 15, duration: 0.25, ease: 'power2.in' }, 0)
      
      // 2. Snap back together (re-merge panels, fade borders back to 0)
      .to('.intro-panel-left', { x: '0vw', duration: 0.65, ease: 'power3.inOut' }, 0.45)
      .to('.intro-panel-right', { x: '0vw', duration: 0.65, ease: 'power3.inOut' }, 0.45)
      .to('.intro-panel .panel-border', { opacity: 0, duration: 0.45, ease: 'power3.inOut' }, 0.45);
  };

  introStage.addEventListener('click', onTriggerIntro);
  introStage.addEventListener('touchstart', onTriggerIntro, { passive: true });
}

// ── AD CAMPAIGN & GEOTARGETING ROUTING ENGINE ────────────────────────────
function skipPortalDirectToCity(city) {
  if (!city) return;
  const plCities = [
    'Warszawa', 'Srodmiescie', 'Mokotow', 'Wola', 'Ursynow', 'Bemowo', 'Bialoleka',
    'Praga-Polnoc', 'Praga-Poludnie', 'Targowek', 'Ochota', 'Zoliborz', 'Bielany',
    'Ursus', 'Wlochy', 'Wilanow', 'Wawer', 'Rembertow', 'Wesola',
    'Zabki', 'Marki', 'Sulejowek', 'Jozefow', 'Pruszkow', 'Piastow', 'Piaseczno', 'Konstancin-Jeziorna'
  ];
  const matchedPlCity = plCities.find(c => c.toLowerCase() === city.toLowerCase());
  
  const trCities = ['Izmir', 'Sakarya', 'Istanbul', 'Kocaeli', 'Samsun', 'Balikesir'];
  const matchedTrCity = trCities.find(c => c.toLowerCase() === city.toLowerCase());

  let targetCity = '';
  let lang = 'tr';

  if (matchedPlCity) {
    targetCity = matchedPlCity;
    lang = 'pl';
  } else if (matchedTrCity) {
    targetCity = matchedTrCity;
    lang = 'tr';
  } else {
    return;
  }

  STATE.language = lang;
  applyLanguage(lang);
  setCityState(targetCity, true);

  const introStage = document.getElementById('portal-intro-stage');
  if (introStage) {
    introStage.style.display = 'none';
    introStage.remove();
  }

  const csoOverlay = document.getElementById('country-selector-overlay');
  if (csoOverlay) {
    csoOverlay.style.display = 'none';
    csoOverlay.classList.add('cso-hidden');
  }

  const portalStage = document.getElementById('portal-stage');
  if (portalStage) {
    portalStage.style.display = 'none';
  }

  document.body.classList.remove('portal-intro-mode');
  document.body.classList.remove('flag-selection-mode');

  if (STATE.lenisInstance) {
    STATE.lenisInstance.start();
    STATE.lenisInstance.scrollTo(0, { immediate: true });
  }
  window.scrollTo(0, 0);

  if (typeof stopParticleLoop === 'function') {
    stopParticleLoop();
  }

  if (typeof window.goToCinemaStep === 'function') {
    window.goToCinemaStep(1);
  }

  if (typeof prewarmAround === 'function') {
    prewarmAround(0);
  }

  if (window.history && window.history.replaceState) {
    window.history.replaceState({ stage: 'cinema' }, '');
  }
}

// ==========================================
// 3. INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  window.STATE = STATE;
  bookingRevealEl = document.getElementById('bookingReveal');
  setupLenis();
  setupPortalIntroClick();
  setupPortalParticles();
  setupCinemaEngine();
  setupPortalGateway();
  setupNavScroll();
  setupMobileDrawer();
  setupBookingReveal();
  setupPromoCodeLogic();
  setupServicesModal();
  setupResizeObserver();
  setupGlobalEscapeKey();

  // Initialize interactive visual effects (Custom cursor on desktop, ambient glow globally)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) {
    setupCustomCursor();
  }
  setupCinemaAmbientLight();
  setupHolographicClickRipples();
  setupAudioToggle();

  // Auto-detect browser language and location (using timezone and language preferences)
  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  const languages = navigator.languages || [browserLang];
  const hasPolishLang = languages.some(l => l.toLowerCase().startsWith('pl'));
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const isPolandLocation = timezone.includes('Warsaw') || hasPolishLang;
  const defaultLang = isPolandLocation ? 'pl' : 'tr';
  applyLanguage(defaultLang);

  // Initialize selected service states & texts
  selectServiceGlobal('standart');

  // Ad Campaign and Geotargeting Parameters Checks
  const urlParams = new URLSearchParams(window.location.search);
  const cityParam = urlParams.get('city');
  const langParam = urlParams.get('lang');

  if (cityParam) {
    skipPortalDirectToCity(cityParam);
  } else if (langParam) {
    const targetLang = langParam.toLowerCase() === 'pl' ? 'pl' : 'tr';
    STATE.language = targetLang;
    applyLanguage(targetLang);
    
    // Automatically skip the country selection overlay and show the appropriate map
    const csoOverlay = document.getElementById('country-selector-overlay');
    if (csoOverlay) {
      csoOverlay.classList.add('cso-hidden');
      csoOverlay.style.opacity = '0';
      csoOverlay.style.pointerEvents = 'none';
    }
    
    document.body.classList.remove('portal-intro-mode');
    document.body.classList.add('flag-selection-mode');
    
    const introStage = document.getElementById('portal-intro-stage');
    if (introStage) {
      introStage.style.display = 'none';
      introStage.remove();
    }
    
    const mapTr = document.getElementById('portalNeonMap');
    const mapPl = document.getElementById('portalNeonMapPoland');
    const mapSelectorStage = document.querySelector('.portal-map-selector-stage');
    const portalCenterHint = document.querySelector('.portal-center-hint');
    
    if (targetLang === 'pl') {
      if (mapTr) mapTr.style.display = 'none';
      if (mapPl) mapPl.style.display = 'block';
      destroyLeafletMap('turkey');
      setTimeout(() => {
        initLeafletMap('poland');
      }, 50);
    } else {
      if (mapTr) mapTr.style.display = 'block';
      if (mapPl) mapPl.style.display = 'none';
      destroyLeafletMap('poland');
      setTimeout(() => {
        initLeafletMap('turkey');
      }, 50);
    }
    
    if (mapSelectorStage) {
      mapSelectorStage.style.pointerEvents = '';
      mapSelectorStage.style.opacity = '1';
    }
    if (portalCenterHint) {
      portalCenterHint.style.opacity = '1';
      portalCenterHint.style.transform = 'none';
    }
  }

  // Clear saved city to satisfy "yenilediginde kaldıgı yerden devam etmesin" requirement
  localStorage.removeItem('tworose_city');

  // Initialize History state
  if (window.history && window.history.replaceState) {
    window.history.replaceState({ stage: 'country' }, '');
  }

  // popstate routing event listener for back/forward navigation in Chrome
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.stage) {
      navigateToStage(e.state.stage, false);
    } else {
      navigateToStage('country', false);
    }
  });

  // Set initial slider config
  updatePriceSliderConfig();

  // ── PAID ADS ENGINE: deferred tracking initialization ──
  const idleInit = () => {
    initAttribution();

    // wa.me / tel: / mailto: clicks — first-party conversion triggers.
    document.addEventListener('click', (e) => {
      const anchor = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      const common = { lang: STATE.language || 'tr', city: STATE.selectedCity || '' };
      if (href.includes('wa.me') || href.includes('api.whatsapp.com')) {
        trackConversion('contact_whatsapp', common);
      } else if (href.startsWith('tel:')) {
        trackConversion('contact_phone', common);
      } else if (href.startsWith('mailto:')) {
        trackConversion('contact_email', common);
      }
    }, { capture: true, passive: true });
  };

  if (window.requestIdleCallback) {
    window.requestIdleCallback(idleInit);
  } else {
    setTimeout(idleInit, 1500);
  }
});

// ==========================================
// 4. LENIS SMOOTH SCROLL SETUP
// ==========================================
function setupLenis() {
  // Lenis smooth scroll disabled to allow clean, slide-based touchless navigation
  STATE.lenisInstance = {
    stop: () => {},
    start: () => {},
    scrollTo: () => {},
    destroy: () => {}
  };
}

function updateCachedHotspotCoords() {
  const overlay = document.getElementById('portalConnectorOverlay');
  if (!overlay) return;
  const overlayRect = overlay.getBoundingClientRect();
  const hotspots = document.querySelectorAll('.map-hotspot');
  
  hotspots.forEach(hotspot => {
    if (!hotspot.dataset.city) return;
    const city = hotspot.dataset.city.toLowerCase();
    const rect = hotspot.getBoundingClientRect();
    cachedHotspotCoords[city] = {
      x: (rect.left - overlayRect.left) + rect.width / 2,
      y: (rect.top - overlayRect.top) + rect.height / 2
    };
  });
}


// ==========================================
// 5.1. PORTAL HELPER FUNCTIONS
// ==========================================

function updatePortalCachedRects() {
  const portalStage = document.getElementById('portal-stage');
  if (portalStage) cachedStageRect = portalStage.getBoundingClientRect();
  const activeMap = document.getElementById(STATE.language === 'pl' ? 'portalNeonMapPoland' : 'portalNeonMap');
  if (activeMap) cachedMapRect = activeMap.getBoundingClientRect();
  const portalMapWrapper = document.querySelector('.portal-map-wrapper');
  if (portalMapWrapper) cachedWrapperRect = portalMapWrapper.getBoundingClientRect();
}
window.updatePortalCachedRects = updatePortalCachedRects;


function startTelemetryFluctuation(card) {
  if (portalPingInterval) clearInterval(portalPingInterval);
  const pingSpan = card.querySelector('.ping-val');
  if (!pingSpan) return;

  let basePing = Math.floor(Math.random() * 8) + 4; // 4 to 11ms
  pingSpan.textContent = `${basePing} ms`;

  portalPingInterval = setInterval(() => {
    const fluctuation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    let newPing = basePing + fluctuation;
    if (newPing < 3) newPing = 3;
    if (newPing > 16) newPing = 16;
    pingSpan.textContent = `${newPing} ms`;
  }, 1200);
}


function addLeafletMarkers(mapObj, locations) {
  const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.tr;
  locations.forEach(loc => {
    const cityKey = loc.key;
    const transCity = dict.cities[cityKey];
    if (!transCity) return;

    const displayName = loc.districtName ? loc.districtName : transCity.name;

    // Clean map pin: colored dot + soft pulse + city label
    const markerHtml = `
      <div class="map-hotspot" data-city="${cityKey}" data-market="${loc.market}" ${loc.districtName ? `data-iladi="${loc.districtName}"` : ''} data-coords="${loc.coords[0].toFixed(2)}° N, ${loc.coords[1].toFixed(2)}° E" role="button" tabindex="0">
        <div class="hotspot-pulse"></div>
        <div class="hotspot-core"></div>
        <span class="hotspot-label">${displayName}</span>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerHtml,
      className: 'leaflet-custom-hotspot-icon',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    const marker = L.marker(loc.coords, { icon: customIcon }).addTo(mapObj);

    const bindMarkerEvents = (el) => {
      if (!el) return;
      if (el.dataset.listenersBound === 'true') return;
      el.dataset.listenersBound = 'true';

      const onEnter = () => showCityPreviewFn && showCityPreviewFn(cityKey, el);
      const onLeave = (e) => revertToDefaultFn && revertToDefaultFn(e);
      const clickHandler = (e) => {
        e.stopPropagation();
        const cx = e.clientX || window.innerWidth / 2;
        const cy = e.clientY || window.innerHeight / 2;
        if (triggerSelectionFn) triggerSelectionFn(cityKey, cx, cy, el);
      };
      const keyHandler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const rect = el.getBoundingClientRect();
          if (triggerSelectionFn) triggerSelectionFn(cityKey, rect.left + rect.width / 2, rect.top + rect.height / 2, el);
        }
      };

      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
      el.addEventListener('click', clickHandler);
      el.addEventListener('pointerdown', clickHandler);
      el.addEventListener('keydown', keyHandler);

      portalHotspotListeners.push({ hotspot: el, onEnter, onLeave, clickHandler, keyHandler });
    };

    marker.on('add', () => {
      setTimeout(() => {
        const el = marker.getElement() ? marker.getElement().querySelector('.map-hotspot') : null;
        if (el) bindMarkerEvents(el);
      }, 0);
    });

    setTimeout(() => {
      const el = marker.getElement() ? marker.getElement().querySelector('.map-hotspot') : null;
      if (el) bindMarkerEvents(el);
    }, 50);
  });
}

let leafletLoadedPromise = null;
function ensureLeafletLoaded() {
  if (typeof L !== 'undefined') return Promise.resolve();
  if (leafletLoadedPromise) return leafletLoadedPromise;
  leafletLoadedPromise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      logDebug('Leaflet script and CSS loaded dynamically.');
      resolve();
    };
    script.onerror = (err) => {
      logErrorDebug('Leaflet script dynamic loading failed.', err);
      reject(err);
    };
    document.head.appendChild(script);
  });
  return leafletLoadedPromise;
}

async function initLeafletMap(country) {
  try {
    await ensureLeafletLoaded();
  } catch (err) {
    logErrorDebug('Leaflet map cannot be initialized: dynamic assets failed to load.', err);
    return;
  }
  if (country === 'turkey') {
    if (turkeyMapInstance) {
      turkeyMapInstance.invalidateSize();
      return;
    }
    turkeyMapInstance = L.map('portalNeonMap', {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
      minZoom: 5,
      maxZoom: 9,
      zoomSnap: 0.25
    }).setView([39.0, 35.0], 6);
    window.turkeyMapInstance = turkeyMapInstance;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(turkeyMapInstance);

    const turkeyCities = [
      { key: 'Istanbul', coords: [41.0082, 28.9784], market: 'marmara' },
      { key: 'Kocaeli', coords: [40.7654, 29.9408], market: 'marmara' },
      { key: 'Sakarya', coords: [40.7560, 30.3784], market: 'marmara' },
      { key: 'Izmir', coords: [38.4237, 27.1428], market: 'ege' },
      { key: 'Balikesir', coords: [39.6484, 27.8904], market: 'ege' },
      { key: 'Samsun', coords: [41.2867, 36.3300], market: 'karadeniz' },
      { key: 'Antalya', coords: [36.8969, 30.7133], market: 'akdeniz' }
    ];

    addLeafletMarkers(turkeyMapInstance, turkeyCities);

    // Fit all city pins (plus label breathing room) into view on any viewport
    const isMobile = window.innerWidth <= 768;
    const isTinyMobile = window.innerWidth <= 480;
    const turkeyPaddingTL = isTinyMobile ? [10, 15] : (isMobile ? [25, 45] : [70, 80]);
    const turkeyPaddingBR = isTinyMobile ? [10, 15] : (isMobile ? [25, 30] : [70, 60]);
    const turkeyMaxZoom = isTinyMobile ? 5.75 : (isMobile ? 6.25 : 7);

    turkeyMapInstance.fitBounds(L.latLngBounds(turkeyCities.map(c => c.coords)), {
      paddingTopLeft: turkeyPaddingTL,
      paddingBottomRight: turkeyPaddingBR,
      maxZoom: turkeyMaxZoom
    });

    setTimeout(() => {
      gsap.fromTo('#portalNeonMap .map-hotspot',
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.8, stagger: 0.08, ease: 'back.out(1.7)', overwrite: 'auto' }
      );
    }, 150);

  } else if (country === 'poland') {
    if (polandMapInstance) {
      polandMapInstance.invalidateSize();
      return;
    }
    polandMapInstance = L.map('portalNeonMapPoland', {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
      minZoom: 8,
      maxZoom: 14,
      zoomSnap: 0.25
    }).setView([52.2297, 21.0122], 11);
    window.polandMapInstance = polandMapInstance;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(polandMapInstance);

    const polandDistricts = [
      { key: 'Srodmiescie', coords: [52.2300, 21.0100], districtName: 'Śródmieście', market: 'mazowsze' },
      { key: 'Mokotow', coords: [52.1900, 21.0200], districtName: 'Mokotów', market: 'mazowsze' },
      { key: 'Wola', coords: [52.2350, 20.9600], districtName: 'Wola', market: 'mazowsze' },
      { key: 'Ursynow', coords: [52.1400, 21.0400], districtName: 'Ursynów', market: 'mazowsze' },
      { key: 'Bemowo', coords: [52.2500, 20.9100], districtName: 'Bemowo', market: 'mazowsze' },
      { key: 'Bialoleka', coords: [52.3200, 21.0100], districtName: 'Białołęka', market: 'mazowsze' },
      { key: 'Praga-Polnoc', coords: [52.2530, 21.0370], districtName: 'Praga-Północ', market: 'mazowsze' },
      { key: 'Praga-Poludnie', coords: [52.2350, 21.0800], districtName: 'Praga-Południe', market: 'mazowsze' },
      { key: 'Targowek', coords: [52.2750, 21.0600], districtName: 'Targówek', market: 'mazowsze' },
      { key: 'Ochota', coords: [52.2130, 20.9800], districtName: 'Ochota', market: 'mazowsze' },
      { key: 'Zoliborz', coords: [52.2680, 20.9850], districtName: 'Żoliborz', market: 'mazowsze' },
      { key: 'Bielany', coords: [52.2850, 20.9300], districtName: 'Bielany', market: 'mazowsze' },
      { key: 'Ursus', coords: [52.1950, 20.8900], districtName: 'Ursus', market: 'mazowsze' },
      { key: 'Wlochy', coords: [52.1850, 20.9250], districtName: 'Włochy', market: 'mazowsze' },
      { key: 'Wilanow', coords: [52.1650, 21.0900], districtName: 'Wilanów', market: 'mazowsze' },
      { key: 'Wawer', coords: [52.1800, 21.1500], districtName: 'Wawer', market: 'mazowsze' },
      { key: 'Rembertow', coords: [52.2580, 21.1600], districtName: 'Rembertów', market: 'mazowsze' },
      { key: 'Wesola', coords: [52.2450, 21.2200], districtName: 'Wesoła', market: 'mazowsze' },
      { key: 'Zabki', coords: [52.2900, 21.1100], districtName: 'Ząbki', market: 'mazowsze' },
      { key: 'Marki', coords: [52.3300, 21.1000], districtName: 'Marki', market: 'mazowsze' },
      { key: 'Sulejowek', coords: [52.2350, 21.2800], districtName: 'Sulejówek', market: 'mazowsze' },
      { key: 'Jozefow', coords: [52.1300, 21.2300], districtName: 'Józefów', market: 'mazowsze' },
      { key: 'Pruszkow', coords: [52.1700, 20.8100], districtName: 'Pruszków', market: 'mazowsze' },
      { key: 'Piastow', coords: [52.1900, 20.8400], districtName: 'Piastów', market: 'mazowsze' },
      { key: 'Piaseczno', coords: [52.0700, 21.0200], districtName: 'Piaseczno', market: 'mazowsze' },
      { key: 'Konstancin-Jeziorna', coords: [52.0900, 21.1200], districtName: 'Konstancin-Jeziorna', market: 'mazowsze' }
    ];

    addLeafletMarkers(polandMapInstance, polandDistricts);

    // Fit all district pins into view on any viewport size
    const isMobilePL = window.innerWidth <= 768;
    const isTinyMobilePL = window.innerWidth <= 480;
    const polandPadding = isTinyMobilePL ? [8, 8] : (isMobilePL ? [20, 20] : [60, 60]);

    polandMapInstance.fitBounds(L.latLngBounds(polandDistricts.map(c => c.coords)), {
      padding: polandPadding
    });

    const updateZoomClass = () => {
      const zoom = polandMapInstance.getZoom();
      const mapEl = document.getElementById('portalNeonMapPoland');
      if (mapEl) {
        if (zoom < 11.5) {
          mapEl.classList.add('map-zoom-low');
        } else {
          mapEl.classList.remove('map-zoom-low');
        }
      }
    };
    polandMapInstance.on('zoomend', updateZoomClass);
    polandMapInstance.on('viewreset', updateZoomClass);
    updateZoomClass();
    setTimeout(updateZoomClass, 400);

    setTimeout(() => {
      gsap.fromTo('#portalNeonMapPoland .map-hotspot',
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.8, stagger: 0.08, ease: 'back.out(1.7)', overwrite: 'auto' }
      );
    }, 150);
  }
}

// ==========================================
// 5.2. PORTAL GATEWAY ORCHESTRATOR
// ==========================================

function setupPortalGateway() {
  const portalStage = document.getElementById('portal-stage');
  if (!portalStage) return;

  cleanupGatewayListeners();

  const cityCards = document.querySelectorAll('.cc-gateway-card');
  const parallaxLayers = document.querySelectorAll('.parallax-layer');

  const portalMapWrapper = document.querySelector('.portal-map-wrapper');

  const connectorPath = document.getElementById('portalConnectorPath');
  const connectorParticle = document.getElementById('portalConnectorParticle');

  // ── COUNTRY SELECTOR SETUP ───────────────────────────────────────────────
  const csoOverlay    = document.getElementById('country-selector-overlay');
  let csoBtnTurkey  = document.getElementById('csoBtnTurkey');
  let csoBtnPoland  = document.getElementById('csoBtnPoland');
  const mapSelectorStage = document.querySelector('.portal-map-selector-stage');
  const portalCenterHint = document.querySelector('.portal-center-hint');

  if (csoBtnTurkey) {
    const clone = csoBtnTurkey.cloneNode(true);
    csoBtnTurkey.parentNode.replaceChild(clone, csoBtnTurkey);
    csoBtnTurkey = clone;
  }
  if (csoBtnPoland) {
    const clone = csoBtnPoland.cloneNode(true);
    csoBtnPoland.parentNode.replaceChild(clone, csoBtnPoland);
    csoBtnPoland = clone;
  }

  // Keep map stage hidden until a country is selected
  if (mapSelectorStage) {
    mapSelectorStage.style.opacity = '0';
    mapSelectorStage.style.pointerEvents = 'none';
  }
  if (portalCenterHint) {
    portalCenterHint.style.opacity = '0';
  }

  // ── Turkey button: hide overlay, reveal Turkey map (TR mode) ──────────────
  if (csoBtnTurkey) {
    csoBtnTurkey.addEventListener('click', () => {
      if (!csoOverlay) return;

      if (window.history && window.history.pushState) {
        window.history.pushState({ stage: 'map' }, '');
      }

      STATE.language = 'tr';
      applyLanguage('tr');

      const mapTr = document.getElementById('portalNeonMap');
      const mapPl = document.getElementById('portalNeonMapPoland');
      if (mapTr) mapTr.style.display = 'block';
      if (mapPl) mapPl.style.display = 'none';
      destroyLeafletMap('poland');

      // Animate card out with a quick scale-up
      gsap.to(csoBtnTurkey, {
        scale: 0.96,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          // Fade + scale overlay away
          gsap.to(csoOverlay, {
            opacity: 0,
            scale: 1.04,
            duration: 0.55,
            ease: 'power3.in',
            onComplete: () => {
              csoOverlay.classList.add('cso-hidden');
              csoOverlay.style.transform = '';

              updatePortalCachedRects();

              // Reveal map stage
              if (mapSelectorStage) {
                mapSelectorStage.style.pointerEvents = '';
                gsap.to(mapSelectorStage, {
                  opacity: 1,
                  duration: 0.8,
                  ease: 'power3.out',
                  onComplete: () => {
                    initLeafletMap('turkey');
                  }
                });
              }
              if (portalCenterHint) {
                gsap.to(portalCenterHint, {
                  opacity: 1,
                  y: 0,
                  duration: 0.8,
                  ease: 'power2.out',
                  delay: 0.3,
                });
              }
            }
          });
        }
      });
    });
  }

  // ── Poland button: hide overlay, reveal Turkey map in PL mode ───────────
  if (csoBtnPoland) {
    csoBtnPoland.addEventListener('click', () => {
      if (!csoOverlay) return;

      if (window.history && window.history.pushState) {
        window.history.pushState({ stage: 'map' }, '');
      }

      STATE.language = 'pl';
      applyLanguage('pl');

      const mapTr = document.getElementById('portalNeonMap');
      const mapPl = document.getElementById('portalNeonMapPoland');
      if (mapTr) mapTr.style.display = 'none';
      if (mapPl) mapPl.style.display = 'block';
      destroyLeafletMap('turkey');

      // Animate card out with a quick scale-up
      gsap.to(csoBtnPoland, {
        scale: 0.96,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          // Fade + scale overlay away
          gsap.to(csoOverlay, {
            opacity: 0,
            scale: 1.04,
            duration: 0.55,
            ease: 'power3.in',
            onComplete: () => {
              csoOverlay.classList.add('cso-hidden');
              csoOverlay.style.transform = '';

              updatePortalCachedRects();

              // Reveal map stage
              if (mapSelectorStage) {
                mapSelectorStage.style.pointerEvents = '';
                gsap.to(mapSelectorStage, {
                  opacity: 1,
                  duration: 0.8,
                  ease: 'power3.out',
                  onComplete: () => {
                    initLeafletMap('poland');
                  }
                });
              }
              if (portalCenterHint) {
                gsap.to(portalCenterHint, {
                  opacity: 1,
                  y: 0,
                  duration: 0.8,
                  ease: 'power2.out',
                  delay: 0.3,
                });
              }
            }
          });
        }
      });
    });
  }
  // ── END COUNTRY SELECTOR ─────────────────────────────────────────────────

  // Staggered premium entry animation on portal load
  if (document.body.classList.contains('flag-selection-mode')) {
    // 1. Grid Lines initialization
    gsap.fromTo('.grid-line.horizontal', 
      { scaleX: 0, transformOrigin: 'center' },
      { scaleX: 1, duration: 1.4, ease: 'power3.inOut' }
    );
    gsap.fromTo('.grid-line.vertical', 
      { scaleY: 0, transformOrigin: 'center' },
      { scaleY: 1, duration: 1.4, ease: 'power3.inOut' }
    );

    // 2. HUD Brackets slide in from corners
    gsap.fromTo('.hud-tl', { x: -20, y: -20, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.9, ease: 'power2.out', delay: 0.3 });
    gsap.fromTo('.hud-tr', { x: 20, y: -20, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.9, ease: 'power2.out', delay: 0.3 });
    gsap.fromTo('.hud-bl', { x: -20, y: 20, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.9, ease: 'power2.out', delay: 0.3 });
    gsap.fromTo('.hud-br', { x: 20, y: 20, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.9, ease: 'power2.out', delay: 0.3 });

    // 3. Telemetry ticks fade in with a digital sweep
    gsap.fromTo('.telemetry-tick', 
      { opacity: 0 },
      { opacity: 0.45, duration: 0.8, stagger: 0.08, ease: 'power1.inOut', delay: 0.5 }
    );

    // 4. Logo and brand container gliding down
    gsap.fromTo('.portal-logo-container', 
      { y: -30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', delay: 0.4 }
    );

    // 5. Center selection hint reveal
    gsap.fromTo('.portal-center-hint',
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.0, ease: 'power2.out', delay: 0.8 }
    );

    // 6. Map and Default Panel premium presentation entry
    gsap.fromTo('.portal-map-wrapper',
      { opacity: 0, y: 30, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out', delay: 0.5 }
    );

    gsap.fromTo('.map-hotspot',
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1, duration: 0.8, stagger: 0.08, ease: 'back.out(1.7)', delay: 0.9 }
    );

    gsap.fromTo('#portalDefaultPanel',
      { display: 'none', opacity: 0, x: 20 },
      { display: 'flex', opacity: 1, x: 0, duration: 1.0, ease: 'power3.out', delay: 0.8 }
    );
  }

  // Mouse Parallax Track (RAF-throttled for high refresh rate monitor rendering)
  let pmx = 0;
  let pmy = 0;

  const updateParallax = () => {
    parallaxLayers.forEach((layer) => {
      if (!layer) return;
      const depth = layer.dataset.depth || 0.04;
      gsap.to(layer, {
        x: pmx * depth * 30,
        y: pmy * depth * 20,
        duration: 0.8,
        ease: "power2.out",
        overwrite: "auto"
      });
    });
    portalParallaxRafId = null;
  };

  const onParallaxMove = (e) => {
    pmx = (e.clientX / cachedWindowWidth - 0.5) * 2;
    pmy = (e.clientY / cachedWindowHeight - 0.5) * 2;
    if (!portalParallaxRafId) {
      portalParallaxRafId = requestAnimationFrame(updateParallax);
    }
  };

  portalStage.addEventListener('mousemove', onParallaxMove);
  portalParallaxHandler = onParallaxMove;

  // Re-calculate laser layout & cached bounds if viewport size changes (debounced)
  portalResizeHandler = debounce(() => {
    updatePortalCachedRects();
    updateCachedHotspotCoords();
  }, 150);
  window.addEventListener('resize', portalResizeHandler);

  // Watch body classes to update cached dimensions when selecting mode toggles
  if (typeof MutationObserver !== 'undefined' && portalStage) {
    portalMutationObserver = new MutationObserver(() => {
      if (document.body.classList.contains('flag-selection-mode')) {
        setTimeout(updatePortalCachedRects, 100);
      }
    });
    portalMutationObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // ── DYNAMIC HUD TELEMETRY CURSOR TRACKER ──
  const mapHUD = document.getElementById('portalMapHUD');
  
  if (mapHUD && portalStage) {
    // Initial rect computation
    setTimeout(updatePortalCachedRects, 300);

    let hudTicking = false;
    let hudMX = 0;
    let hudMY = 0;

    portalHUDMoveHandler = (e) => {
      hudMX = e.clientX;
      hudMY = e.clientY;

      if (!hudTicking) {
        window.requestAnimationFrame(() => {
          // Only track if gateway selection is active and it's not a mobile device
          if (!document.body.classList.contains('flag-selection-mode') || cachedWindowWidth <= 900 || window.portalWarping) {
            hudTicking = false;
            return;
          }

          if (!cachedStageRect || !cachedMapRect || !cachedWrapperRect) {
            updatePortalCachedRects();
          }

          const mapRect = cachedMapRect;
          const wrapperRect = cachedWrapperRect;

          const mx = hudMX;
          const my = hudMY;
          const margin = 80;
          
          const isNearMap = (
            mx >= mapRect.left - margin &&
            mx <= mapRect.right + margin &&
            my >= mapRect.top - margin &&
            my <= mapRect.bottom + margin
          );

          if (isNearMap) {
            // 3D Tilt calculation using gsap.to (fully supports 3D transform shortcuts without console warnings)
            if (portalMapWrapper && wrapperRect) {
              const halfW = wrapperRect.width / 2;
              const halfH = wrapperRect.height / 2;
              const tiltX = -((my - (wrapperRect.top + halfH)) / halfH) * 5; // max 5deg rotateX
              const tiltY = ((mx - (wrapperRect.left + halfW)) / halfW) * 5;  // max 5deg rotateY

              gsap.to(portalMapWrapper, {
                rotateX: tiltX,
                rotateY: tiltY,
                duration: 0.45,
                ease: 'power1.out',
                overwrite: 'auto'
              });
            }
          } else {
            if (portalMapWrapper) {
              gsap.to(portalMapWrapper, {
                rotateX: 0,
                rotateY: 0,
                duration: 0.6,
                ease: 'power2.out',
                overwrite: 'auto'
              });
            }
          }
          hudTicking = false;
        });
        hudTicking = true;
      }
    };

    portalHUDLeaveHandler = () => {
      if (portalMapWrapper) {
        gsap.to(portalMapWrapper, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.6,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    };

    portalStage.addEventListener('mousemove', portalHUDMoveHandler);
    portalStage.addEventListener('mouseleave', portalHUDLeaveHandler);
  }

  // Unified theme visual update function
  const updateThemeForMarket = (market) => {
    let accentRgb = '51, 102, 255';
    
    if (market === 'ege') {
      portalTargetHue = 35; // Gold/orange theme
      accentRgb = '255, 145, 0';
    } else if (market === 'karadeniz') {
      portalTargetHue = 345; // Pink-red theme
      accentRgb = '255, 51, 102';
    } else if (market === 'mazowsze') {
      portalTargetHue = 350; // Polish red theme
      accentRgb = '255, 51, 85';
    } else {
      portalTargetHue = 220; // Blue theme
      accentRgb = '51, 102, 255';
    }

    if (portalStage) {
      portalStage.classList.remove('hover-marmara', 'hover-ege', 'hover-karadeniz', 'hover-mazowsze');
      portalStage.classList.add(`hover-${market}`);
    }

    const portalAmbientBg = document.getElementById('portalAmbientBg');
    if (portalAmbientBg) {
      portalAmbientBg.style.setProperty('--column-accent-rgb', accentRgb);
      gsap.to(portalAmbientBg, {
        opacity: 0.18,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  };

  // Switch preview panel display dynamically
  const showCityPreview = (city, element = null) => {
    if (portalRevertTimeout) {
      clearTimeout(portalRevertTimeout);
      portalRevertTimeout = null;
    }

    if (activeCity === city && !element) return;
    activeCity = city;

    // Set region hue colors dynamically
    const region = (element && element.dataset.market) || CITY_TO_REGION[city] || 'marmara';
    updateThemeForMarket(region);

    // Update HUD values dynamically on hover
    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.tr;
    const cityData = dict.cities[city];
    if (cityData) {
      const hudCityVal = document.getElementById('hudCityName');
      const hudRegionVal = document.getElementById('hudRegionName');
      const hudCoordsVal = document.getElementById('hudCoordinates');
      const hudSignalVal = document.getElementById('hudSignalStrength');

      let displayName = cityData.name;
      let displayRegion = cityData.market || region.toUpperCase();
      let displayCoords = cityData.coords;

      // Extract specific details from elements (e.g. Warsaw districts)
      if (element) {
        const iladi = element.dataset.iladi;
        if (iladi) {
          displayName = iladi.toUpperCase();
        }
        const coordsAttr = element.dataset.coords;
        if (coordsAttr) {
          displayCoords = coordsAttr;
        }
      }

      if (hudCityVal) hudCityVal.textContent = displayName;
      if (hudRegionVal) hudRegionVal.textContent = displayRegion;
      if (hudCoordsVal) hudCoordsVal.textContent = displayCoords;
      if (hudSignalVal) {
        hudSignalVal.textContent = dict.hudSignalActive || (STATE.language === 'pl' ? 'ONLINE / AKTYWNY' : 'ONLINE / AKTİF');
        hudSignalVal.className = 'hud-val status-active';
      }
    }
  };

  // Debounce returning preview panel to default guide screen
  const revertToDefault = (e) => {
    if (e && e.relatedTarget) {
      const closestHotspot = e.relatedTarget.closest ? e.relatedTarget.closest('.map-hotspot') : null;
      const targetCity = closestHotspot ? closestHotspot.dataset.city : '';

      if (targetCity && activeCity && targetCity.toLowerCase() === activeCity.toLowerCase()) {
        return;
      }
    }

    if (portalRevertTimeout) {
      clearTimeout(portalRevertTimeout);
      portalRevertTimeout = null;
    }

    portalRevertTimeout = setTimeout(() => {
      activeCity = null;

      portalTargetHue = 220;
      if (portalStage) {
        portalStage.classList.remove('hover-marmara', 'hover-ege', 'hover-karadeniz', 'hover-mazowsze');
      }

      const portalAmbientBg = document.getElementById('portalAmbientBg');
      if (portalAmbientBg) {
        gsap.to(portalAmbientBg, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }

      // Reset HUD values to scanning/default
      const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.tr;
      const hudCityVal = document.getElementById('hudCityName');
      const hudRegionVal = document.getElementById('hudRegionName');
      const hudCoordsVal = document.getElementById('hudCoordinates');
      const hudSignalVal = document.getElementById('hudSignalStrength');

      if (hudCityVal) hudCityVal.textContent = dict.hudScanning;
      if (hudRegionVal) hudRegionVal.textContent = dict.hudSearching;
      if (hudCoordsVal) hudCoordsVal.textContent = '--° N, --° E';
      if (hudSignalVal) {
        hudSignalVal.textContent = dict.hudSignalWeak;
        hudSignalVal.className = 'hud-val status-blink status-weak';
      }
    }, 200);
  };

  // Helper to spawn expanding concentric sonar target locking rings on map click
  const spawnRadarLockRings = (clientX, clientY, accentColor) => {
    const wrapper = document.querySelector('.portal-map-wrapper');
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('div');
      ring.className = 'radar-lock-ring';
      ring.style.setProperty('--clr-accent', accentColor);
      ring.style.left = `${relX}px`;
      ring.style.top = `${relY}px`;
      ring.style.width = '20px';
      ring.style.height = '20px';
      wrapper.appendChild(ring);

      gsap.to(ring, {
        scale: 25,
        opacity: 0,
        duration: 1.1,
        delay: i * 0.12,
        ease: 'power2.out',
        onComplete: () => ring.remove()
      });
    }
  };

  // Triggers selection state machine transition with cinematic warp zoom teleportation
  const triggerSelection = (city, clientX, clientY, clickedElement = null) => {
    if (window.portalWarping) return;
    if (STATE.language === 'pl' && city === 'Istanbul') {
      city = 'Warszawa';
    }
    window.portalWarping = true; // Lock mouse hover and tilt calculations immediately

    // Lock initial inline opacities to 0 to prevent any visual flash of hero content on selection zoom
    const initialNav = document.getElementById('main-nav');
    const initialOverlay = document.getElementById('heroOverlay');
    const initialVideo = document.getElementById('video-scene-1');
    if (initialNav) initialNav.style.opacity = '0';
    if (initialOverlay) initialOverlay.style.opacity = '0';
    if (initialVideo) {
      initialVideo.style.opacity = '0';
      initialVideo.style.visibility = 'hidden';
    }

    if (typeof window.playWarpSound === 'function') {
      window.playWarpSound();
    }
    if (typeof window.triggerDust === 'function') {
      window.triggerDust(clientX, clientY);
    }

    // Set background canvas dust gravity coordinates for wormhole swirl pull physics
    window.warpTarget = { x: clientX, y: clientY, active: true };

    let hotspot = clickedElement;
    if (!hotspot || !hotspot.classList.contains('map-hotspot')) {
      hotspot = Array.from(document.querySelectorAll('.map-hotspot')).find(
        h => h.dataset.city.toLowerCase() === city.toLowerCase()
      );
    }
    const wrapper = document.querySelector('.portal-map-wrapper');

    // Kill any active hover tilt animations on the map wrapper immediately
    if (wrapper) {
      gsap.killTweensOf(wrapper);
    }

    // Spawn Concentric Radar Sonar Lock Rings directly on the geographical city coordinate
    const region = CITY_TO_REGION[city] || 'marmara';
    const theme = REGION_THEMES[region] || REGION_THEMES.marmara;
    
    let spawnX = clientX;
    let spawnY = clientY;
    if (hotspot) {
      const hRect = hotspot.getBoundingClientRect();
      spawnX = hRect.left + hRect.width / 2;
      spawnY = hRect.top + hRect.height / 2;
    }
    spawnRadarLockRings(spawnX, spawnY, theme.accent);

    // Target Lock HUD orchestration (dynamic brackets clamp-down)
    const targetLock = document.getElementById('hudTargetLock');
    if (targetLock && wrapper) {
      const wrapperRect = wrapper.getBoundingClientRect();
      let rx = spawnX - wrapperRect.left;
      let ry = spawnY - wrapperRect.top;
      
      targetLock.style.setProperty('--clr-accent', theme.accent);
      targetLock.style.setProperty('--clr-accent-rgb', theme.rgb);
      targetLock.style.left = `${rx}px`;
      targetLock.style.top = `${ry}px`;
      targetLock.style.display = 'block';
      
      gsap.fromTo(targetLock,
        { scale: 2.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.2)' }
      );
    }

    // Trigger Warp Flash Screen Overlay color-dodge flash (with boosted brightness)
    const flashEl = document.getElementById('portalWarpFlash');
    if (flashEl) {
      flashEl.style.setProperty('--clr-accent', theme.accent);
      gsap.fromTo(flashEl,
        { opacity: 0 },
        {
          opacity: 0.95,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          ease: 'power2.inOut',
          onComplete: () => {
            gsap.set(flashEl, { opacity: 0 });
          }
        }
      );
    }

    setCityState(city);

    // Start dynamic priority prewarming from index 0
    prewarmAround(0);

    // Disable interactions during entry transition
    portalStage.style.pointerEvents = 'none';

    if (wrapper && hotspot) {
      const wrapperRect = wrapper.getBoundingClientRect();
      const hRect = hotspot.getBoundingClientRect();
      const relX = (hRect.left + hRect.width / 2) - wrapperRect.left;
      const relY = (hRect.top + hRect.height / 2) - wrapperRect.top;
      gsap.set(wrapper, { transformOrigin: `${relX}px ${relY}px` });
    } else if (wrapper) {
      const wrapperRect = wrapper.getBoundingClientRect();
      const relX = clientX - wrapperRect.left;
      const relY = clientY - wrapperRect.top;
      gsap.set(wrapper, { transformOrigin: `${relX}px ${relY}px` });
    }

    // Instantly hide connector laser paths to prevent trailing visuals
    if (connectorPath) gsap.set(connectorPath, { opacity: 0 });
    if (connectorParticle) gsap.set(connectorParticle, { opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        window.warpTarget = null;
        window.portalWarping = false; // Release hover lock

        // Reset scroll position before body layout expands to prevent jumps
        if (STATE.lenisInstance) {
          STATE.lenisInstance.start();
          STATE.lenisInstance.scrollTo(0, { immediate: true });
        }
        window.scrollTo(0, 0);

        document.body.classList.remove('flag-selection-mode');
        portalStage.style.display = 'none';

        if (targetLock) {
          targetLock.style.display = 'none';
        }

        // Cancel portal background particle loop and resize handler to save resource overhead
        stopParticleLoop();
        if (resizeCanvasHandler) {
          window.removeEventListener('resize', resizeCanvasHandler);
          resizeCanvasHandler = null;
        }
        if (portalMouseMoveHandler) {
          window.removeEventListener('mousemove', portalMouseMoveHandler);
          portalMouseMoveHandler = null;
        }
        if (portalResizeHandler) {
          window.removeEventListener('resize', portalResizeHandler);
          portalResizeHandler = null;
        }

        // Keep listeners bound so cities remain clickable upon returning via city switcher
        // cleanupGatewayListeners();

        if (portalStageClickHandler) {
          portalStage.removeEventListener('click', portalStageClickHandler);
          portalStageClickHandler = null;
        }

        ScrollTrigger.refresh();

        // Initialize cinema engine in touch-driven step mode after portal closes
        if (typeof window.goToCinemaStep === 'function') {
          window.goToCinemaStep(0);
        }

        if (window.history && window.history.pushState) {
          window.history.pushState({ stage: 'cinema' }, '');
        }
      }
    });

    // Epic sci-fi zoom-in teleportation timeline (Spiral Warp Exponential Plunge)
    tl.to('.portal-logo-container', { y: -65, scale: 0.75, opacity: 0, duration: 0.45, ease: 'power2.in' })
      .to('.portal-center-hint', { opacity: 0, scale: 0.6, duration: 0.35, ease: 'power2.in' }, 0);

    if (document.getElementById('hudTargetLock')) {
      tl.to('#hudTargetLock', { opacity: 0, scale: 0.3, rotation: 35, duration: 0.45, ease: 'power2.in' }, 0);
    }

    tl.to('.portal-map-wrapper', {
      scale: 11,
      rotationZ: -25,
      rotateX: 0,
      rotateY: 0,
      opacity: 0,
      duration: 1.15,
      ease: 'power4.in'
    }, 0)
      .to(portalStage, { opacity: 0, duration: 0.95, ease: 'power2.out' }, '-=0.75')
      .to('#main-content', { opacity: 1, pointerEvents: 'all', duration: 0.6, ease: 'power2.out' }, '-=0.45');
  };

  showCityPreviewFn = showCityPreview;
  revertToDefaultFn = revertToDefault;
  triggerSelectionFn = triggerSelection;

  // Bind Hotspot events
  const hotspots = document.querySelectorAll('.map-hotspot');
  hotspots.forEach(hotspot => {
    const city = hotspot.dataset.city;

    const onEnter = () => showCityPreview(city, hotspot);
    const onLeave = (e) => revertToDefault(e);
    const clickHandler = (e) => {
      e.stopPropagation();
      const cx = e.clientX || window.innerWidth / 2;
      const cy = e.clientY || window.innerHeight / 2;
      triggerSelection(city, cx, cy, hotspot);
    };
    const keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const rect = hotspot.getBoundingClientRect();
        triggerSelection(city, rect.left + rect.width / 2, rect.top + rect.height / 2, hotspot);
      }
    };

    hotspot.addEventListener('mouseenter', onEnter);
    hotspot.addEventListener('mouseleave', onLeave);
    hotspot.addEventListener('click', clickHandler);
    hotspot.addEventListener('keydown', keyHandler);

    portalHotspotListeners.push({ hotspot, onEnter, onLeave, clickHandler, keyHandler });
  });

  // Bind Card events (tilt and select click)
  cityCards.forEach(card => {
    const city = card.dataset.city;

    let cardRect = null;
    const onEnter = () => {
      cardRect = card.getBoundingClientRect();
      showCityPreview(city, card);
    };
    const onLeave = (e) => {
      cardRect = null;
      gsap.to(card, {
        y: 0,
        rotateY: 0,
        rotateX: 0,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto'
      });
      revertToDefault(e);
    };

    let cardTicking = false;
    let cardMX = 0;
    let cardMY = 0;

    const onMove = (e) => {
      cardMX = e.clientX;
      cardMY = e.clientY;

      if (!cardTicking) {
        window.requestAnimationFrame(() => {
          if (!cardRect) {
            cardRect = card.getBoundingClientRect();
          }
          const x = cardMX - cardRect.left;
          const y = cardMY - cardRect.top;

          card.style.setProperty('--mouse-x', `${x}px`);
          card.style.setProperty('--mouse-y', `${y}px`);

          const px = (x / cardRect.width - 0.5) * 2;
          const py = (y / cardRect.height - 0.5) * 2;

          gsap.to(card, {
            y: -6,
            rotateY: px * 8,
            rotateX: -py * 8,
            transformPerspective: 800,
            duration: 0.4,
            ease: 'power2.out',
            overwrite: 'auto'
          });
          cardTicking = false;
        });
        cardTicking = true;
      }
    };

    const clickHandler = (e) => {
      e.stopPropagation();
      const cx = e.clientX || window.innerWidth / 2;
      const cy = e.clientY || window.innerHeight / 2;
      triggerSelection(city, cx, cy);
    };

    const keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const rect = card.getBoundingClientRect();
        triggerSelection(city, rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    };

    const btnHandler = (e) => {
      e.stopPropagation();
      const rect = card.getBoundingClientRect();
      triggerSelection(city, rect.left + rect.width / 2, rect.top + rect.height / 2);
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('click', clickHandler);
    card.addEventListener('keydown', keyHandler);

    const btn = card.querySelector('.city-select-btn');
    if (btn) btn.addEventListener('click', btnHandler);

    cardHoverListeners.push({ card, onEnter, onLeave, onMove, clickHandler, keyHandler, btnHandler });
  });

  // Bind Mobile City Selector Buttons
  const mobileCityBtns = document.querySelectorAll('.mobile-city-btn');
  mobileCityBtns.forEach(btn => {
    const city = btn.dataset.city;

    const clickHandler = (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      mobileCityBtns.forEach(b => b.classList.remove('active-click'));
      btn.classList.add('active-click');
      
      let targetCity = city;
      if (STATE.language === 'pl' && targetCity === 'Istanbul') {
        targetCity = 'Warszawa';
      }
      
      // Look up corresponding geographical hotspot coordinates to center zoom-in warp animation
      const hotspot = Array.from(document.querySelectorAll('.map-hotspot')).find(
        h => h.dataset.city.toLowerCase() === targetCity.toLowerCase()
      );
      
      let cx = window.innerWidth / 2;
      let cy = window.innerHeight / 2;
      
      if (hotspot) {
        const rect = hotspot.getBoundingClientRect();
        cx = rect.left + rect.width / 2;
        cy = rect.top + rect.height / 2;
      }
      
      triggerSelection(targetCity, cx, cy);
    };

    const keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    };

    btn.addEventListener('click', clickHandler);
    btn.addEventListener('pointerdown', clickHandler);
    btn.addEventListener('keydown', keyHandler);

    portalHotspotListeners.push({ hotspot: btn, clickHandler, keyHandler });
  });

  updateCachedHotspotCoords();
}

function setupNavScroll() {
  const nav = document.getElementById('main-nav');
  if (nav) {
    ScrollTrigger.create({
      start: 'top -50px',
      onEnter: () => nav.classList.add('nav-scrolled'),
      onLeaveBack: () => nav.classList.remove('nav-scrolled')
    });
  }

  const citySwitcherBtn = document.getElementById('citySwitcherBtn');
  if (citySwitcherBtn) {
    citySwitcherBtn.addEventListener('click', () => {
      openPortalGateway();
    });
  }

  // Bind navigation links & logo to cinema step index transitions since page scrolling is disabled
  const handleNavClick = (targetType, e) => {
    if (e) e.preventDefault();
    if (document.body.classList.contains('portal-intro-mode') || document.body.classList.contains('flag-selection-mode')) {
      return;
    }
    if (typeof window.goToCinemaStep === 'function') {
      if (targetType === 'home') {
        window.goToCinemaStep(0);
      } else if (targetType === 'services') {
        window.goToCinemaStep(1);
      } else if (targetType === 'scroller') {
        window.goToCinemaStep(2);
      } else if (targetType === 'contact') {
        window.goToCinemaStep(14);
      }
    }
  };

  const navLogo = document.getElementById('navLogo');
  if (navLogo) {
    navLogo.addEventListener('click', (e) => handleNavClick('home', e));
  }

  const homeLink = document.querySelector('.nav-links a:first-child');
  if (homeLink) {
    homeLink.addEventListener('click', (e) => handleNavClick('home', e));
  }

  const servicesLink = document.getElementById('navServicesLink');
  if (servicesLink) {
    servicesLink.addEventListener('click', (e) => handleNavClick('services', e));
  }

  const scrollerLink = document.getElementById('navScrollerLink');
  if (scrollerLink) {
    scrollerLink.addEventListener('click', (e) => handleNavClick('scroller', e));
  }

  const contactLink = document.getElementById('navContactLink');
  if (contactLink) {
    contactLink.addEventListener('click', (e) => handleNavClick('contact', e));
  }

  // Bind the Hero Landing CTA button
  const heroStartBtn = document.getElementById('heroStartScrubBtn');
  if (heroStartBtn) {
    heroStartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToTarget('#cinema-section', cachedWindowHeight * 1.5, 1.5);
    });
  }
}

// ==========================================
// 5.2. MOBILE MENU DRAWER CONTROL
// ==========================================
function setupMobileDrawer() {
  const drawer = document.getElementById('mobile-menu-drawer');
  const toggle = document.getElementById('mobileMenuToggle');
  const closeBtn = document.getElementById('closeMobileDrawerBtn');
  const backdrop = document.getElementById('mobileDrawerBackdrop');
  const links = document.querySelectorAll('.drawer-link-item');
  const servicesLink = document.getElementById('navServicesLink');

  if (!drawer || !toggle) return;

  const openDrawer = () => {
    drawer.removeAttribute('hidden');
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Menüyü Kapat');
    if (STATE.lenisInstance) STATE.lenisInstance.stop();
    document.body.style.overflow = 'hidden';

    // GSAP staggered entry for links in the drawer
    gsap.fromTo('.drawer-link-item', 
      { x: 30, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: 'power2.out', delay: 0.1, overwrite: 'auto' }
    );
  };

  const closeDrawer = () => {
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menüyü Aç');
    
    // Animate out wrapper
    const wrapper = drawer.querySelector('.drawer-wrapper');
    if (wrapper) {
      // Temporarily disable CSS transition to prevent conflicts with GSAP frame-by-frame updates
      wrapper.style.transition = 'none';

      gsap.to(wrapper, {
        x: '100%',
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => {
          drawer.setAttribute('hidden', '');
          gsap.set(wrapper, { clearProps: 'transform' });
          wrapper.style.transition = ''; // Restore CSS transition for subsequent opens
          const servicesModal = document.getElementById('services-modal');
          const isServicesHidden = !servicesModal || servicesModal.hasAttribute('hidden');
          if (STATE.lenisInstance && !document.body.classList.contains('flag-selection-mode') && isServicesHidden) {
            STATE.lenisInstance.start();
          }
          document.body.style.overflow = '';
        }
      });
    } else {
      drawer.setAttribute('hidden', '');
      if (STATE.lenisInstance) STATE.lenisInstance.start();
      document.body.style.overflow = '';
    }
  };

  toggle.addEventListener('click', () => {
    if (drawer.hasAttribute('hidden')) {
      openDrawer();
    } else {
      closeDrawer();
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.target;
      closeDrawer();

      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      setTimeout(() => {
        if (typeof window.goToCinemaStep === 'function') {
          if (target === 'home') {
            window.goToCinemaStep(0);
          } else if (target === 'services') {
            window.goToCinemaStep(1);
          } else if (target === 'cinema') {
            window.goToCinemaStep(2);
          } else if (target === 'contact') {
            window.goToCinemaStep(14);
          }
        }
      }, 300);
    });
  });
}

// Browser chrome tint: dark while the cinema is on screen, warm paper on the
// light portal screens (mobile address/tool bars follow this meta).
function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && meta.getAttribute('content') !== color) {
    meta.setAttribute('content', color);
  }
}

// ==========================================
// 5.9. AMBIENT BACKFILL RENDERER
// Draws a tiny cover-cropped copy of the active scene video into the
// #cinemaBackfill canvas; CSS blur scales it into a full-screen ambient
// fill behind fitted (object-fit: contain) videos.
// ==========================================
let backfillCanvas = null;
let backfillCtx = null;

function drawCinemaBackfill(video) {
  if (!video || video.readyState < 2 || !video.videoWidth) return;
  if (!backfillCanvas) {
    backfillCanvas = document.getElementById('cinemaBackfill');
    if (!backfillCanvas) return;
    backfillCtx = backfillCanvas.getContext('2d');
  }
  if (!backfillCtx) return;

  // Tiny internal resolution matching the viewport aspect: the CSS blur
  // erases all detail anyway, so drawing stays essentially free per frame.
  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  const cw = 96;
  const ch = Math.max(1, Math.round(cw * (vh / vw)));
  if (backfillCanvas.width !== cw) backfillCanvas.width = cw;
  if (backfillCanvas.height !== ch) backfillCanvas.height = ch;

  // Cover-crop the video frame into the canvas
  const canvasRatio = cw / ch;
  const videoRatio = video.videoWidth / video.videoHeight;
  let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
  if (videoRatio > canvasRatio) {
    sw = video.videoHeight * canvasRatio;
    sx = (video.videoWidth - sw) / 2;
  } else {
    sh = video.videoWidth / canvasRatio;
    sy = (video.videoHeight - sh) / 2;
  }
  try {
    backfillCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
  } catch (e) {}
}

// ==========================================
// 6. CINEMATIC INTERACTIVE SCROLL-SCRUB
// ==========================================
function setupCinemaEngine() {
  const cinemaSection = document.getElementById('cinema-section');
  const irisOverlay = document.getElementById('irisOverlay');
  const heroOverlay = document.getElementById('heroOverlay');
  const textBlocks = document.querySelectorAll('#sceneTextOverlay .scene-text-block');
  const servicesSelectCard = document.querySelector('.services-select-card');
  const serviceSelectItems = document.querySelectorAll('.service-select-item');

  // Cache selectable item bounding client rects to prevent layout thrashing on mousemove
  const serviceItemsRects = [];
  const cacheItemBounds = () => {
    serviceSelectItems.forEach((item, idx) => {
      serviceItemsRects[idx] = item.getBoundingClientRect();
    });
  };
  cacheItemBounds();
  window.addEventListener('resize', cacheItemBounds);

  // Set up click, keydown, mousemove (for spotlight and 3D tilt), and mouseleave listeners for the selectable items
  serviceSelectItems.forEach((item, idx) => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'radio');
    item.setAttribute('aria-checked', item.classList.contains('selected') ? 'true' : 'false');

    const selectItem = () => {
      const service = item.dataset.service;
      selectServiceGlobal(service);
    };

    item.addEventListener('click', selectItem);

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectItem();
      }
    });

    item.addEventListener('mousemove', (e) => {
      const rect = serviceItemsRects[idx] || item.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update CSS variables for CSS spotlight glow follow
      item.style.setProperty('--mouse-x', `${x}px`);
      item.style.setProperty('--mouse-y', `${y}px`);

      // Calculate relative coordinate offset from card center (-0.5 to 0.5)
      const px = (x / rect.width) - 0.5;
      const py = (y / rect.height) - 0.5;

      // 3D card tilt using GSAP
      gsap.to(item, {
        rotateY: px * 14,
        rotateX: -py * 14,
        y: -6,
        transformPerspective: 800,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });

    item.addEventListener('mouseleave', () => {
      // Revert the 3D tilt to normal state
      gsap.to(item, {
        rotateY: 0,
        rotateX: 0,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });
  });
  const navProgressBar = document.getElementById('navProgressBar');
  const loader = document.getElementById('cinemaLoader');

  // Cache elements to prevent DOM query overhead inside the scroll handler
  const introCard = document.getElementById('introCard');
  const splitLeft = introCard?.querySelector('.title-split-left');
  const splitRight = introCard?.querySelector('.title-split-right');
  const eyebrow = introCard?.querySelector('.intro-eyebrow');
  const subtitle = introCard?.querySelector('.intro-subtitle');
  const scrollHint = introCard?.querySelector('.intro-scroll-hint');
  const dividerLines = introCard?.querySelectorAll('.intro-divider-line');
  const diamond = introCard?.querySelector('.intro-divider-diamond');
  const mainNav = document.getElementById('main-nav');

  let isLoaderActive = false;

  const navLinks = document.querySelectorAll('.nav-links .nav-link-item');
  const navHomeLink = document.querySelector('.nav-links a:first-child');
  const navScrollerLink = document.getElementById('navScrollerLink');
  const navContactLink = document.getElementById('navContactLink');

  let lastActiveLink = null;
  const updateActiveNavLink = (progress) => {
    if (navLinks.length === 0) return;
    
    let targetLink = navHomeLink;
    if (progress <= 0.10) {
      targetLink = navHomeLink;
    } else if (progress > 0.10 && progress < 0.98) {
      targetLink = navScrollerLink;
    } else {
      targetLink = navContactLink;
    }

    if (targetLink !== lastActiveLink) {
      if (lastActiveLink) lastActiveLink.classList.remove('active');
      if (targetLink) targetLink.classList.add('active');
      lastActiveLink = targetLink;
    }
  };
  
  if (!cinemaSection || !irisOverlay) return;

  const v1 = document.getElementById('video-scene-1');
  const v2 = document.getElementById('video-scene-2');
  const v3 = document.getElementById('video-scene-3');
  const v4 = document.getElementById('video-scene-4');
  const v5 = document.getElementById('video-scene-5');
  const v6 = document.getElementById('video-scene-6');
  const v7 = document.getElementById('video-scene-7');
  const v8 = document.getElementById('video-scene-8');
  const v9 = document.getElementById('video-scene-9');
  const v10 = document.getElementById('video-scene-10');
  const v11 = document.getElementById('video-scene-11');
  const v12 = document.getElementById('video-scene-12');

  function getSafeDuration(video, fallback = 5.0) {
    if (video && !isNaN(video.duration) && video.duration > 0) {
      return video.duration;
    }
    return fallback;
  }

  // Populate module-level scenes array
  scenes = [
    { video: v1, irisX: 50, irisY: 60, yStart: 18, yEnd: 72, xStart: 50, xEnd: 50, duration: 12 }, // Mona Lisa (Portrait)
    { video: v2, irisX: 50, irisY: 50, yStart: 0, yEnd: 90, xStart: 15, xEnd: 50, duration: 14 },  // Samurai (Landscape)
    { video: v3, irisX: 50, irisY: 45, yStart: 15, yEnd: 85, xStart: 50, xEnd: 50, duration: 12 }, // Grandmother (Portrait)
    { video: v4, irisX: 50, irisY: 50, yStart: 0, yEnd: 90, xStart: 35, xEnd: 65, duration: 15 },  // Astronaut (Landscape)
    { video: v5, irisX: 50, irisY: 50, yStart: 0, yEnd: 95, xStart: 25, xEnd: 68, duration: 13 },  // Cowboy (Landscape)
    { video: v6, irisX: 50, irisY: 50, yStart: 0, yEnd: 95, xStart: 40, xEnd: 75, duration: 16 },  // Gandalf (Landscape)
    { video: v7, irisX: 50, irisY: 50, yStart: 12, yEnd: 80, xStart: 45, xEnd: 55, duration: 12 }, // Knight (Square)
    { video: v8, irisX: 50, irisY: 50, yStart: 0, yEnd: 100, xStart: 30, xEnd: 70, duration: 14 }, // Monk (Landscape)
    { video: v9, irisX: 50, irisY: 50, yStart: 0, yEnd: 100, xStart: 35, xEnd: 72, duration: 15 }, // Roman (Landscape)
    { video: v10, irisX: 50, irisY: 50, yStart: 12, yEnd: 82, xStart: 50, xEnd: 50, duration: 12 },// Sumo (Portrait)
    { video: v11, irisX: 50, irisY: 50, yStart: 0, yEnd: 95, xStart: 25, xEnd: 60, duration: 14 }, // Victorian (Landscape)
    { video: v12, irisX: 50, irisY: 50, yStart: 0, yEnd: 100, xStart: 35, xEnd: 75, duration: 13 } // Viking (Landscape)
  ];

  let trigger = null;

  scenes.forEach(sc => {
    if (sc.video) {
      // Backup original source URL
      if (!sc.video.dataset.originalSrc) {
        sc.video.dataset.originalSrc = sc.video.getAttribute('src') || '';
      }

      // Automatic aspect-ratio detection for mobile responsive view styling
      const checkAspectRatio = () => {
        if (sc.video.videoWidth && sc.video.videoHeight) {
          const ratio = sc.video.videoWidth / sc.video.videoHeight;
          if (ratio < 1.0) {
            sc.video.classList.add('portrait-video');
            sc.video.classList.remove('landscape-video');
          } else {
            sc.video.classList.add('landscape-video');
            sc.video.classList.remove('portrait-video');
          }
        }
      };

      if (sc.video.readyState >= 1) {
        checkAspectRatio();
      } else {
        sc.video.addEventListener('loadedmetadata', checkAspectRatio);
      }

      // Track file loading errors once
      sc.video.addEventListener('error', () => {
        logErrorDebug(`Decoder resource loading error on ${sc.video.id}:`, sc.video.error);
      });

      const onReady = () => {
        logDebug(`Video ${sc.video.id} readyState changed to: ${sc.video.readyState}. Recalculating target times and waking up loop.`);
        if (trigger) {
          trigger.vars.onUpdate(trigger);
        }
        triggerCinemaLoop();

        // Unlock iOS WebKit decoder when video metadata is loaded and ready
        if (cachedWindowWidth <= 768 && sc.video.readyState >= 1 && sc.video.dataset.unlocked !== 'true' && sc.video.dataset.unlockAttempting !== 'true') {
          sc.video.dataset.unlockAttempting = 'true';
          const playPromise = sc.video.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              sc.video.pause();
              sc.video.dataset.unlocked = 'true';
              sc.video.dataset.unlockAttempting = 'false';
            }).catch(e => {
              logDebug(`Unlock play-pause failed on ready for ${sc.video.id}: ${e}`);
              setTimeout(() => {
                sc.video.dataset.unlockAttempting = 'false';
              }, 2000);
            });
          } else {
            sc.video.dataset.unlockAttempting = 'false';
          }
        }
      };
      sc.video.addEventListener('loadedmetadata', onReady);
      sc.video.addEventListener('canplay', onReady);
    }
  });

  // Variables for tracking last applied style variables (reduces paint recalculation)
  let lastRadius = null;
  let lastX = null;
  let lastY = null;
  let lastVideoY = null;
  let lastActiveVideo = null;

  let lastFrameTime = performance.now();
  let cinemaRafId = null;

  function triggerCinemaLoop() {
    if (!cinemaRafId) {
      lastFrameTime = performance.now();
      cinemaRafId = requestAnimationFrame(renderCinemaLoop);
      logDebug("Cinema RAF loop awakened.");
    }
  }

  // ── WORLD-CLASS FILM RENDERING LOOP (smooth lerp requestAnimationFrame) ──
  // Interpolates video seek positions, circle mask scales, and coordinates 
  // at 60fps to eliminate frame jumps on fast scrolls.
  function renderCinemaLoop() {
    // Suspend loop completely if selection gateway is active
    if (document.body.classList.contains('flag-selection-mode')) {
      cinemaRafId = null;
      return;
    }

    const now = performance.now();
    const nowMs = now;
    let dt = (now - lastFrameTime) / 16.666;
    lastFrameTime = now;

    if (dt > 10) dt = 1.0;

    const cState = STATE.cinema;
    const timeLerp = 1 - Math.pow(1 - 0.07, dt);
    const opacityLerp = 1 - Math.pow(1 - 0.09, dt);
    const maskLerp = 1 - Math.pow(1 - 0.11, dt);

    cState.currentRadius += (cState.targetRadius - cState.currentRadius) * maskLerp;
    cState.currentX += (cState.targetX - cState.currentX) * timeLerp;
    cState.currentY += (cState.targetY - cState.currentY) * timeLerp;
 
    // Prevent NaN/negative interpolation errors
    if (isNaN(cState.currentRadius) || cState.currentRadius < 0) cState.currentRadius = 0;

    // Track if all interpolated variables have settled to targets
    let settled = true;

    // LERP snapping thresholds to prevent infinite micro-calculations on trailing values
    if (Math.abs(cState.targetRadius - cState.currentRadius) < 0.05) {
      cState.currentRadius = cState.targetRadius;
    } else {
      settled = false;
    }
    if (Math.abs(cState.targetX - cState.currentX) < 0.05) {
      cState.currentX = cState.targetX;
    } else {
      settled = false;
    }
    if (Math.abs(cState.targetY - cState.currentY) < 0.05) {
      cState.currentY = cState.targetY;
    } else {
      settled = false;
    }

    // Track if any active video is currently seeking/loading to show the spinner loader
    let activeVideoBuffering = false;

    // ── LERP Intro Text State ──
    if (cState.introTextState) {
      cState.introTextState.currentOffset += (cState.introTextState.targetOffset - cState.introTextState.currentOffset) * timeLerp;
      cState.introTextState.currentOpacity += (cState.introTextState.targetOpacity - cState.introTextState.currentOpacity) * opacityLerp;

      if (Math.abs(cState.introTextState.targetOffset - cState.introTextState.currentOffset) < 0.05) {
        cState.introTextState.currentOffset = cState.introTextState.targetOffset;
      } else {
        settled = false;
      }
      if (Math.abs(cState.introTextState.targetOpacity - cState.introTextState.currentOpacity) < 0.001) {
        cState.introTextState.currentOpacity = cState.introTextState.targetOpacity;
      } else {
        settled = false;
      }

      // Apply Intro Text values to DOM (Optimized with Write Caching)
      if (introCard) {
        const cardOpacity = Math.round(cState.introTextState.currentOpacity * 100) / 100;
        
        if (cState.introTextState.lastAppliedCardOpacity !== cardOpacity) {
          introCard.style.opacity = cardOpacity;
          cState.introTextState.lastAppliedCardOpacity = cardOpacity;
        }
        
        if (cardOpacity > 0.001) {
          if (cState.introTextState.lastAppliedPointerEvents !== 'all') {
            introCard.style.pointerEvents = 'all';
            cState.introTextState.lastAppliedPointerEvents = 'all';
          }
          if (cState.introTextState.lastAppliedVisibility !== 'visible') {
            introCard.style.visibility = 'visible';
            cState.introTextState.lastAppliedVisibility = 'visible';
          }

          const textOffset = Math.round(cState.introTextState.currentOffset * 10) / 10;
          const textOpacity = Math.round(cState.introTextState.currentOpacity * 100) / 100;

          if (cState.introTextState.lastAppliedOffset !== textOffset || cState.introTextState.lastAppliedTextOpacity !== textOpacity) {
            // Use cached elements or query if not cached yet
            if (!splitLeftEl) splitLeftEl = introCard.querySelector('.title-split-left');
            if (!splitRightEl) splitRightEl = introCard.querySelector('.title-split-right');

            if (splitLeftEl) {
              splitLeftEl.style.transform = `translate3d(${-textOffset}px, 0, 0)`;
              splitLeftEl.style.opacity = textOpacity;
            }
            if (splitRightEl) {
              splitRightEl.style.transform = `translate3d(${textOffset}px, 0, 0)`;
              splitRightEl.style.opacity = textOpacity;
            }
            if (eyebrow) {
              eyebrow.style.transform = `translate3d(${-textOffset * 0.53}px, 0, 0)`;
              eyebrow.style.opacity = textOpacity;
            }
            if (subtitle) {
              subtitle.style.transform = `translate3d(${textOffset * 0.53}px, 0, 0)`;
              subtitle.style.opacity = textOpacity;
            }
            if (scrollHint) {
              scrollHint.style.transform = `translate3d(0, ${textOffset * 0.4}px, 0)`;
              scrollHint.style.opacity = textOpacity;
            }
            if (dividerLines && dividerLines.length >= 2) {
              dividerLines[0].style.transform = `translate3d(${-textOffset * 0.67}px, 0, 0)`;
              dividerLines[0].style.opacity = textOpacity;
              dividerLines[1].style.transform = `translate3d(${textOffset * 0.67}px, 0, 0)`;
              dividerLines[1].style.opacity = textOpacity;
            }
            if (diamond) {
              const scaleVal = Math.max(0, textOpacity);
              diamond.style.transform = `rotate(45deg) scale(${scaleVal})`;
              diamond.style.opacity = textOpacity;
            }

            cState.introTextState.lastAppliedOffset = textOffset;
            cState.introTextState.lastAppliedTextOpacity = textOpacity;
          }
        } else {
          if (cState.introTextState.lastAppliedPointerEvents !== 'none') {
            introCard.style.pointerEvents = 'none';
            cState.introTextState.lastAppliedPointerEvents = 'none';
          }
          if (cState.introTextState.lastAppliedVisibility !== 'hidden') {
            introCard.style.visibility = 'hidden';
            cState.introTextState.lastAppliedVisibility = 'hidden';
          }
        }
      }
    }

    // ── LERP Intro Video State ──
    if (cState.introVideoState) {
      // Initialize caches if not done yet
      if (cachedIntroVideos.length === 0) {
        cachedIntroVideos = Array.from(document.querySelectorAll('.cinema-intro-card .intro-video'));
      }
      if (!activeIntroVideoEl) {
        activeIntroVideoEl = document.querySelector('.cinema-intro-card .intro-video.active');
      }
      
      // Pause and hide all other intro videos
      cachedIntroVideos.forEach(v => {
        if (v !== activeIntroVideoEl) {
          v.style.opacity = 0;
          v.style.visibility = 'hidden';
          if (!v.paused) v.pause();
        }
      });

      cState.introVideoState.currentScale += (cState.introVideoState.targetScale - cState.introVideoState.currentScale) * timeLerp;
      cState.introVideoState.currentTranslateY += (cState.introVideoState.targetTranslateY - cState.introVideoState.currentTranslateY) * timeLerp;
      cState.introVideoState.currentOpacity += (cState.introVideoState.targetOpacity - cState.introVideoState.currentOpacity) * opacityLerp;

      if (Math.abs(cState.introVideoState.targetScale - cState.introVideoState.currentScale) < 0.001) {
        cState.introVideoState.currentScale = cState.introVideoState.targetScale;
      } else {
        settled = false;
      }
      if (Math.abs(cState.introVideoState.targetTranslateY - cState.introVideoState.currentTranslateY) < 0.05) {
        cState.introVideoState.currentTranslateY = cState.introVideoState.targetTranslateY;
      } else {
        settled = false;
      }
      if (Math.abs(cState.introVideoState.targetOpacity - cState.introVideoState.currentOpacity) < 0.001) {
        cState.introVideoState.currentOpacity = cState.introVideoState.targetOpacity;
      } else {
        settled = false;
      }

      // Apply Intro Video values to DOM (Optimized with Write Caching)
      if (activeIntroVideoEl) {
        const vidOpacity = Math.round(cState.introVideoState.currentOpacity * 100) / 100;
        
        if (cState.introVideoState.lastAppliedOpacity !== vidOpacity) {
          activeIntroVideoEl.style.opacity = vidOpacity;
          cState.introVideoState.lastAppliedOpacity = vidOpacity;
        }

        if (vidOpacity > 0.001) {
          if (cState.introVideoState.lastAppliedVisibility !== 'visible') {
            activeIntroVideoEl.style.visibility = 'visible';
            cState.introVideoState.lastAppliedVisibility = 'visible';
          }
          
          const vidScale = Math.round(cState.introVideoState.currentScale * 1000) / 1000;
          const vidTranslateY = Math.round(cState.introVideoState.currentTranslateY * 10) / 10;

          if (cState.introVideoState.lastAppliedScale !== vidScale || cState.introVideoState.lastAppliedTranslateY !== vidTranslateY) {
            activeIntroVideoEl.style.transform = `translate3d(-50%, -50%, 0) scale(${vidScale}) translateY(${vidTranslateY}px)`;
            cState.introVideoState.lastAppliedScale = vidScale;
            cState.introVideoState.lastAppliedTranslateY = vidTranslateY;
          }

          if (activeIntroVideoEl.paused) {
            activeIntroVideoEl.play().catch(e => {});
          }

          if (activeIntroVideoEl.readyState < 2) {
            activeVideoBuffering = true;
          }
        } else {
          if (cState.introVideoState.lastAppliedVisibility !== 'hidden') {
            activeIntroVideoEl.style.visibility = 'hidden';
            cState.introVideoState.lastAppliedVisibility = 'hidden';
          }
          if (!activeIntroVideoEl.paused) {
            activeIntroVideoEl.pause();
          }
        }
      }
    }

    // Update each scene state (currentTime, opacity, videoY)
    scenes.forEach((sc, idx) => {
      const sState = cState.sceneStates[idx];
      if (!sState) return;

      const video = sc.video;
      if (!video) return;

      // Proximity filter: only render active and adjacent videos (within distance of 2 steps)
      // to keep them loaded and ready for smooth, zero-latency slide transitions.
      const distFromActive = idx - cState.activeIdx;
      if (Math.abs(distFromActive) > 2) {
        sState.currentOpacity = 0;
        sState.targetOpacity = 0;

        if (sState.lastAppliedOpacity !== 0) {
          video.style.opacity = 0;
          sState.lastAppliedOpacity = 0;
        }
        if (sState.lastAppliedVisibility !== 'hidden') {
          video.style.visibility = 'hidden';
          sState.lastAppliedVisibility = 'hidden';
        }
        return;
      }

      // Lerp time (Only for non-active videos to sync their state, letting active video run naturally)
      if (idx !== cState.activeIdx) {
        sState.currentTime += (sState.targetTime - sState.currentTime) * timeLerp;
        // Clamp to actual video duration if available
        if (!isNaN(video.duration) && video.duration > 0) {
          if (sState.targetTime > video.duration) sState.targetTime = video.duration;
          if (sState.currentTime > video.duration) sState.currentTime = video.duration;
        }
        if (Math.abs(sState.targetTime - sState.currentTime) < 0.01) {
          sState.currentTime = sState.targetTime;
        } else {
          settled = false;
        }
      } else {
        // Active video: simply match currentTime with native player head
        sState.currentTime = video.currentTime;
      }

      // Lerp opacity
      sState.currentOpacity += (sState.targetOpacity - sState.currentOpacity) * opacityLerp;
      if (Math.abs(sState.targetOpacity - sState.currentOpacity) < 0.005) {
        sState.currentOpacity = sState.targetOpacity;
      } else {
        settled = false;
      }

      // Lerp videoY
      sState.currentVideoY += (sState.targetVideoY - sState.currentVideoY) * timeLerp;
      if (Math.abs(sState.targetVideoY - sState.currentVideoY) < 0.05) {
        sState.currentVideoY = sState.targetVideoY;
      } else {
        settled = false;
      }

      // Lerp videoX
      sState.currentVideoX += (sState.targetVideoX - sState.currentVideoX) * timeLerp;
      if (Math.abs(sState.targetVideoX - sState.currentVideoX) < 0.05) {
        sState.currentVideoX = sState.targetVideoX;
      } else {
        settled = false;
      }

      // Apply values to DOM elements if changed (Optimized with Write Caching)
      const roundedOpacity = Math.round(sState.currentOpacity * 100) / 100;
      const roundedVideoY = Math.round(sState.currentVideoY * 10) / 10;
      const roundedVideoX = Math.round(sState.currentVideoX * 10) / 10;

      // Keep visibility visible for active and adjacent videos so they are processed/loaded by the browser
      if (sState.lastAppliedVisibility !== 'visible') {
        video.style.visibility = 'visible';
        sState.lastAppliedVisibility = 'visible';
      }

      if (sState.lastAppliedOpacity !== roundedOpacity) {
        video.style.opacity = roundedOpacity;
        sState.lastAppliedOpacity = roundedOpacity;
      }

      if (sState.lastAppliedVideoY !== roundedVideoY) {
        video.style.setProperty('--video-y', `${roundedVideoY}%`);
        sState.lastAppliedVideoY = roundedVideoY;
      }

      if (sState.lastAppliedVideoX !== roundedVideoX) {
        video.style.setProperty('--video-x', `${roundedVideoX}%`);
        sState.lastAppliedVideoX = roundedVideoX;
      }

      // Only pause non-active videos to prevent autonomous background playback
      if (idx !== cState.activeIdx && !video.paused) {
        try {
          video.pause();
        } catch (err) {}
      }

      // Self-heal: keep the visible active video playing (throttled to 1s attempts)
      if (idx === cState.activeIdx && video.paused && sState.currentOpacity > 0.5 && document.visibilityState === 'visible') {
        const lastResume = parseFloat(video.dataset.lastResumeAttempt || '0');
        if (nowMs - lastResume > 1000) {
          video.dataset.lastResumeAttempt = nowMs.toString();
          const rp = video.play();
          if (rp && typeof rp.then === 'function') rp.catch(() => {});
        }
      }

      // Unlock iOS WebKit decoder trick (never on the active video — the
      // play-then-pause probe would freeze the scene that is currently playing)
      if (cachedWindowWidth <= 768 && idx !== cState.activeIdx && video.readyState >= 1 && video.dataset.unlocked !== 'true' && video.dataset.unlockAttempting !== 'true') {
        video.dataset.unlockAttempting = 'true';
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            video.pause();
            video.dataset.unlocked = 'true';
            video.dataset.unlockAttempting = 'false';
          }).catch(err => {
            logDebug(`Decoder unlock failed for ${video.id}: ${err}`);
            setTimeout(() => {
              video.dataset.unlockAttempting = 'false';
            }, 2000);
          });
        } else {
          video.dataset.unlockAttempting = 'false';
        }
      }

      // Apply native seeking only to non-active videos to align their positions, 
      // allowing the active video to play smoothly in its own time without feedback jitter.
      if (idx !== cState.activeIdx && video.readyState >= 1) {
        const seekDiff = Math.abs(video.currentTime - sState.currentTime);
        if (seekDiff > 0.15) {
          settled = false;
          const lastSeekTime = parseFloat(video.dataset.lastSeekTime || '0');
          const seekDuration = nowMs - lastSeekTime;
          
          // Bypass seeking guard if seek has been stuck for > 500ms
          const isSeekingStuck = video.seeking && (seekDuration > 500);
          
          if ((!video.seeking || isSeekingStuck) && (seekDuration > 40)) {
            try {
              video.currentTime = sState.currentTime;
              video.dataset.lastSeekTime = nowMs.toString();
            } catch (e) {
              logErrorDebug(`Seek failed on scene ${idx}:`, e);
            }
          }
        }
      }

      // Track loader/buffering state (only check active video)
      if (idx === cState.activeIdx && (video.seeking || video.readyState < 2)) {
        activeVideoBuffering = true;
      }
    });



    // Loader indicator logic: disabled per customer request
    const needsLoader = false;
    if (needsLoader !== isLoaderActive) {
      isLoaderActive = needsLoader;
      if (loader) {
        loader.classList.remove('active');
      }
    }

    // Apply radial CSS variables directly to the iris overlay element instead of :root (massive paint optimization)
    // Only set variables if values changed (rounded to 1 decimal place to prevent subpixel layout calculation overload)
    const roundedRadius = Math.round(cState.currentRadius * 10) / 10;
    const roundedX = Math.round(cState.currentX * 10) / 10;
    const roundedY = Math.round(cState.currentY * 10) / 10;

    if (irisOverlay && (roundedRadius !== lastRadius || roundedX !== lastX || roundedY !== lastY)) {
      irisOverlay.style.setProperty('--mask-radius', `${roundedRadius}%`);
      irisOverlay.style.setProperty('--mask-radius-val', roundedRadius);
      irisOverlay.style.setProperty('--mask-x', `${roundedX}%`);
      irisOverlay.style.setProperty('--mask-y', `${roundedY}%`);
      lastRadius = roundedRadius;
      lastX = roundedX;
      lastY = roundedY;
    }

    if (!settled) {
      cinemaRafId = requestAnimationFrame(renderCinemaLoop);
    } else {
      logDebug("Cinema LERP settled. Suspending RAF loop to conserve CPU/GPU resources.");
      cinemaRafId = null;
    }
  }

  // Launch the rendering loop immediately for initial setup
  triggerCinemaLoop();

  // Custom Step-Based Touchless Navigation State
  let currentStep = 0; // Steps: 0 (Intro), 1 (Services), 2-13 (12 Scenes), 14 (Booking)
  const totalSteps = 15;
  let isTransitioning = false;


  // Central Navigation Engine: maps step changes to cinema state values
  function goToStep(targetStep, direction = 1) {
    if (targetStep < 0 || targetStep >= totalSteps) return;

    isTransitioning = true;
    currentStep = targetStep;
    window.currentCinemaStep = targetStep;

    // Keep the browser chrome dark, but only once the cinema is actually on
    // screen (the engine also runs goToStep(0) during initial setup while the
    // light portal is still showing)
    if (
      !document.body.classList.contains('portal-intro-mode') &&
      !document.body.classList.contains('flag-selection-mode')
    ) {
      setThemeColor('#000000');
    }



    // Wake up LERP loop
    triggerCinemaLoop();

    // Map step to equivalent progress (0.0 to 1.0)
    let p = 0;
    if (targetStep === 0) p = 0.0;
    else if (targetStep === 1) p = 0.30;
    else if (targetStep >= 2 && targetStep <= 13) {
      // Scale 12 character scenes between 0.50 and 0.92
      p = 0.50 + ((targetStep - 2) * (0.42 / 11));
    } else p = 0.98; // Booking reveal

    // Update progress bar
    if (navProgressBar) {
      gsap.to(navProgressBar, { scaleX: p, duration: 0.5, ease: 'power2.out' });
    }

    updateActiveNavLink(p);

    const cState = STATE.cinema;

    // Reset target opacity rules
    if (p > 0.10) {
      cState.introVideoState.targetOpacity = 0;
      cState.introTextState.targetOpacity = 0;
    }

    // ── PHASE 1: LANDING HERO OVERLAY (p === 0.0) ──
    if (targetStep === 0) {
      cState.introTextState.targetOffset = 0;
      cState.introTextState.targetOpacity = 1;

      if (!activeIntroVideoEl) {
        activeIntroVideoEl = document.querySelector('.cinema-intro-card .intro-video.active');
      }
      if (activeIntroVideoEl) {
        cState.introVideoState.targetScale = 1.0;
        cState.introVideoState.targetTranslateY = 0;
      }
      cState.introVideoState.targetOpacity = 1;

      if (heroOverlay) {
        heroOverlay.style.opacity = 1;
        heroOverlay.style.pointerEvents = 'all';
        heroOverlay.style.visibility = 'visible';
      }
      if (mainNav) mainNav.style.opacity = 0;

      cState.targetRadius = 0;
      cState.targetX = 50;
      cState.targetY = 50;
      cState.sceneStates.forEach((s) => {
        s.targetOpacity = 0;
        s.targetTime = 0;
      });

      cState.activeIdx = -1;
      scenes.forEach(sc => { if (sc.video) sc.video.classList.remove('active'); });
      cState.activeTextBlockIdx = -1;
      textBlocks.forEach(block => block.classList.remove('active'));
      closeBookingScreen();
      isTransitioning = false;
      return;
    }

    // Hide heroOverlay
    if (heroOverlay) {
      heroOverlay.style.opacity = 0;
      heroOverlay.style.pointerEvents = 'none';
      heroOverlay.style.visibility = 'hidden';
    }
    if (mainNav) mainNav.style.opacity = 1;

    // ── PHASE 3: 4 SERVICE CARDS SHOWCASE (targetStep === 1) ──
    if (targetStep === 1) {
      cState.targetRadius = 0;
      cState.targetX = 50;
      cState.targetY = 50;
      cState.sceneStates.forEach((s) => {
        s.targetOpacity = 0;
        s.targetTime = 0;
      });

      cState.activeIdx = -1;
      scenes.forEach(sc => { if (sc.video) sc.video.classList.remove('active'); });
      cState.activeTextBlockIdx = -1;
      textBlocks.forEach(block => block.classList.remove('active'));

      if (servicesSelectCard && !servicesSelectCard.classList.contains('active')) {
        servicesSelectCard.classList.add('active');
      }
      closeBookingScreen();
      isTransitioning = false;
      return;
    }

    // Hide services select card past Step 1
    if (servicesSelectCard && servicesSelectCard.classList.contains('active')) {
      servicesSelectCard.classList.remove('active');
    }

    // ── PHASE 5: 12 CHARACTER VIEWS (targetStep: 2 -> 13) ──
    if (targetStep >= 2 && targetStep <= 13) {
      const activeIdx = targetStep - 2;


      
      // Auto-Opening Iris during initial transition
      // (onUpdate wakes the LERP loop: it self-suspends when settled, and these
      // tweens move the targets AFTER goToStep returns — without the wake-up the
      // scene can stay invisible even though its video is playing)
      gsap.to(cState, {
        targetRadius: 120,
        targetX: scenes[activeIdx].irisX,
        targetY: scenes[activeIdx].irisY,
        duration: 0.65,
        ease: 'power2.out',
        onUpdate: triggerCinemaLoop
      });

      if (cState.activeIdx !== activeIdx) {
        cState.activeIdx = activeIdx;
        prewarmAround(activeIdx);

        scenes.forEach((sc, idx) => {
          if (sc.video) {
            if (idx === activeIdx) {
              sc.video.classList.add('active');
              warmupVideo(sc.video);
              
              // Smooth Video Auto-Play Integration:
              // Fade in and play active video from the beginning (0s) to show full flow
              try {
                sc.video.currentTime = 0;
                const p = sc.video.play();
                if (p && typeof p.then === 'function') {
                  p.catch(() => {});
                }
              } catch (e) {}
            } else {
              sc.video.classList.remove('active');
              try { sc.video.pause(); } catch(e) {}
            }
          }
        });
      }

      // Smoothly cross-fade opacities and animate vertical video flow using GSAP
      cState.sceneStates.forEach((sState, idx) => {
        if (idx === activeIdx) {
          // Initialize active video position at start (0% or yStart) for incoming active scene
          sState.targetVideoY = scenes[idx]?.yStart || 0;
          sState.currentVideoY = scenes[idx]?.yStart || 0;
          sState.targetVideoX = scenes[idx]?.xStart !== undefined ? scenes[idx].xStart : 50;
          sState.currentVideoX = scenes[idx]?.xStart !== undefined ? scenes[idx].xStart : 50;

          // Kill any active manual tweens to prevent fighting playhead synchronization
          gsap.killTweensOf(sState, 'targetVideoY');
          gsap.killTweensOf(sState, 'targetVideoX');

          gsap.to(sState, {
            targetOpacity: 1.0,
            duration: 0.5,
            ease: 'power2.out',
            onUpdate: triggerCinemaLoop
          });
        } else {
          // Reset position and fade out inactive scenes
          gsap.killTweensOf(sState, 'targetVideoY');
          gsap.killTweensOf(sState, 'targetVideoX');
          gsap.to(sState, {
            targetOpacity: 0.0,
            targetVideoY: scenes[idx]?.yStart || 0,
            targetVideoX: scenes[idx]?.xStart !== undefined ? scenes[idx].xStart : 50,
            duration: 0.5,
            ease: 'power2.out',
            onUpdate: triggerCinemaLoop
          });
        }

        // Let the video elements run naturally; update target time to match auto-play
        if (idx === activeIdx) {
          gsap.killTweensOf(sState, 'targetTime');
          const checkProgress = () => {
            if (cState.activeIdx === activeIdx && scenes[idx]?.video) {
              const vid = scenes[idx].video;
              sState.targetTime = vid.currentTime;

              // Synchronize the spotlight/scene sweep directly with video playhead progress
              if (vid.duration > 0) {
                const duration = vid.duration;
                const phase = (vid.currentTime / duration) * Math.PI;
                const yoyoFactor = Math.sin(phase);

                const yStart = scenes[idx]?.yStart || 0;
                const yEnd = scenes[idx]?.yEnd || 100;
                const xStart = scenes[idx]?.xStart !== undefined ? scenes[idx].xStart : 50;
                const xEnd = scenes[idx]?.xEnd !== undefined ? scenes[idx].xEnd : 50;

                sState.targetVideoY = yStart + (yEnd - yStart) * yoyoFactor;
                sState.targetVideoX = xStart + (xEnd - xStart) * yoyoFactor;

                // Continuously wake up the rendering loop
                triggerCinemaLoop();
              }

              requestAnimationFrame(checkProgress);
            }
          };
          checkProgress();
        } else {
          sState.targetTime = 0;
        }
      });

      // Update text overlays
      textBlocks.forEach((block, idx) => {
        if (idx === activeIdx) {
          block.classList.add('active');
        } else {
          block.classList.remove('active');
        }
      });
      cState.activeTextBlockIdx = activeIdx;

      closeBookingScreen();
      isTransitioning = false;
      return;
    }

    // ── PHASE 7: BOOKING REVEAL SCREEN (targetStep === 14) ──
    if (targetStep === 14) {
      // Close Iris overlay smoothly
      gsap.to(cState, {
        targetRadius: 0,
        duration: 0.6,
        ease: 'power2.out',
        onUpdate: triggerCinemaLoop,
        onComplete: () => {
          cState.sceneStates.forEach(s => s.targetOpacity = 0);
          if (cState.activeIdx !== -1) {
            cState.activeIdx = -1;
            scenes.forEach(sc => { if (sc.video) sc.video.classList.remove('active'); });
          }
          if (cState.activeTextBlockIdx !== -1) {
            cState.activeTextBlockIdx = -1;
            textBlocks.forEach(block => block.classList.remove('active'));
          }
          openBookingScreen();
          isTransitioning = false;
        }
      });
    }
  }

  // Unified Cinema Navigation: tap, wheel, keyboard and swipe all map to steps
  let lastGestureTime = 0;
  const servicesModalEl = document.getElementById('services-modal');

  const portalActive = () =>
    document.body.classList.contains('portal-intro-mode') ||
    document.body.classList.contains('flag-selection-mode');

  const gestureDebounced = (ms) => {
    const now = Date.now();
    if (now - lastGestureTime < ms) return true;
    lastGestureTime = now;
    return false;
  };

  const stepNext = () => {
    if (currentStep < totalSteps - 1) goToStep(currentStep + 1);
  };
  const stepPrev = () => {
    if (bookingRevealEl && !bookingRevealEl.hasAttribute('hidden')) {
      goToStep(13);
      return;
    }
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  const handleCinemaTap = (e) => {
    // If the portal gateway/map stage is still active, ignore clicks
    if (portalActive()) return;

    // Ignore clicks on form inputs, interactive select items, menus, and modals
    if (
      e.target.closest('#main-nav') ||
      e.target.closest('.mobile-menu-drawer') ||
      e.target.closest('#mobileMenuToggle') ||
      e.target.closest('.services-select-card') ||
      e.target.closest('.booking-reveal-screen') ||
      e.target.closest('#services-modal') ||
      e.target.closest('button') ||
      e.target.closest('a') ||
      e.target.closest('input') ||
      e.target.closest('select') ||
      e.target.closest('label')
    ) {
      return;
    }

    if (gestureDebounced(600)) return;
    stepNext(); // Advance to next scene on click
  };

  // Bind tap events globally to capture all screen clicks (using bubbling to allow inner button clicks to fire first)
  window.addEventListener('click', handleCinemaTap);

  // Wheel: step navigation in the cinema, native scrolling inside overlays/portal
  window.addEventListener('wheel', (e) => {
    if (portalActive()) return; // portal & country selector keep native scroll
    if (e.target.closest('#services-modal, .booking-reveal-screen, .mobile-drawer')) return;
    e.preventDefault();
    if (Math.abs(e.deltaY) < 10) return;
    if (gestureDebounced(800)) return;
    if (e.deltaY > 0) stepNext();
    else stepPrev();
  }, { passive: false });

  // Keyboard: arrows / page keys / space mirror the wheel behaviour
  window.addEventListener('keydown', (e) => {
    if (portalActive()) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (servicesModalEl && !servicesModalEl.hasAttribute('hidden')) return;
    const bookingOpen = bookingRevealEl && !bookingRevealEl.hasAttribute('hidden');

    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      if (bookingOpen) return; // let the form keep its keys
      e.preventDefault();
      if (gestureDebounced(500)) return;
      stepNext();
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      if (gestureDebounced(500)) return;
      stepPrev();
    }
  });

  // Touch swipe: swipe up = next scene, swipe down = previous scene
  let touchStartY = null;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0] ? e.touches[0].clientY : null;
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (touchStartY === null) return;
    const endY = e.changedTouches[0] ? e.changedTouches[0].clientY : touchStartY;
    const dy = endY - touchStartY;
    touchStartY = null;
    if (portalActive()) return;
    if (e.target.closest('#services-modal, .booking-reveal-screen, .mobile-drawer, #main-nav, input, select, textarea, button, a')) return;
    if (Math.abs(dy) < 50) return; // short movement counts as a tap (click handler)
    if (gestureDebounced(600)) return;
    if (dy < 0) stepNext();
    else stepPrev();
  }, { passive: true });

  // Expose global callback to map nav logo and nav links to steps
  if (navHomeLink) navHomeLink.addEventListener('click', (e) => { e.preventDefault(); goToStep(0); });
  if (navScrollerLink) navScrollerLink.addEventListener('click', (e) => { e.preventDefault(); goToStep(2); });
  if (navContactLink) navContactLink.addEventListener('click', (e) => { e.preventDefault(); goToStep(14); });
  const navLogo = document.getElementById('navLogo');
  if (navLogo) navLogo.addEventListener('click', (e) => { e.preventDefault(); goToStep(0); });

  // "Continue" button on the services selection card
  const servicesContinueBtn = document.getElementById('servicesContinueBtn');
  if (servicesContinueBtn) {
    servicesContinueBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      goToStep(2);
    });
  }

  // Expose goToStep globally for external bindings
  window.goToCinemaStep = goToStep;
  // Set initial step 0 state
  goToStep(0);
}

// ==========================================
// 7. BOOKING REVEAL SCREEN CONTROL
// ==========================================
function openBookingScreen() {
  if (!bookingRevealEl) return;
  
  if (bookingRevealEl.hasAttribute('hidden')) {
    logDebug('Triggering final booking screen fade-in.');
    bookingRevealEl.removeAttribute('hidden');
    
    if (window.history && window.history.pushState) {
      window.history.pushState({ stage: 'booking' }, '');
    }
    
    // Hide main navigation header to prevent visual collision on mobile
    const mainNav = document.getElementById('main-nav');
    if (mainNav) {
      gsap.to(mainNav, { opacity: 0, duration: 0.3, ease: 'power2.out', onComplete: () => { mainNav.style.visibility = 'hidden'; } });
    }

    gsap.fromTo('.reveal-content-box',
      { scale: 0.95, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }
    );
  }
}

// ==========================================
// 8. UTILITIES & SELECTION SUMMARY HELPERS
// ==========================================
function closeBookingScreen() {
  if (bookingRevealEl && !bookingRevealEl.hasAttribute('hidden')) {
    if (window.history && window.history.state && window.history.state.stage === 'booking') {
      window.history.back();
      return;
    }
    logDebug('Hiding booking screen.');
    bookingRevealEl.setAttribute('hidden', '');

    // Restore main navigation header visibility
    const mainNav = document.getElementById('main-nav');
    if (mainNav) {
      mainNav.style.visibility = 'visible';
      gsap.to(mainNav, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    }
  }
}

function selectServiceGlobal(service) {
  if (!service) return;
  STATE.calculator.serviceType = service;
  
  // Update selection highlights in the cinematic select card grid
  const selectItems = document.querySelectorAll('.service-select-item');
  selectItems.forEach(item => {
    if (item.dataset.service === service) {
      item.classList.add('selected');
      item.setAttribute('aria-checked', 'true');
    } else {
      item.classList.remove('selected');
      item.setAttribute('aria-checked', 'false');
    }
  });

  // Update the 12 scene text overlays dynamically based on category
  const lang = STATE.language || 'tr';
  const serviceTextData = lang === 'pl' ? SERVICE_SCENE_TEXTS_PL[service] : SERVICE_SCENE_TEXTS[service];
  if (serviceTextData) {
    const textBlocks = document.querySelectorAll('#sceneTextOverlay .scene-text-block');
    textBlocks.forEach((block, index) => {
      const data = serviceTextData[index];
      if (data) {
        const tagEl = block.querySelector('.scene-text-tag');
        const titleEl = block.querySelector('.scene-text-title');
        const descEl = block.querySelector('.scene-text-desc');
        if (tagEl) tagEl.textContent = data.tag;
        if (titleEl) titleEl.textContent = data.title;
        if (descEl) descEl.textContent = data.desc;
      }
    });
  }

  // Set active service attribute for styling
  const serviceTextOverlay = document.getElementById('sceneTextOverlay');
  if (serviceTextOverlay) {
    serviceTextOverlay.setAttribute('data-active-service', service);
  }
  const cinemaSec = document.getElementById('cinema-section');
  if (cinemaSec) {
    cinemaSec.setAttribute('data-active-service', service);
  }

  // Update the booking form select input
  const cServiceSelect = document.getElementById('cService');
  if (cServiceSelect && cServiceSelect.value !== service) {
    cServiceSelect.value = service;
  }

  // Sync with the pricing calculator modal
  const modalItems = document.querySelectorAll('.services-list-panel .service-item-detail');
  modalItems.forEach(item => {
    if (item.dataset.service === service) {
      if (!item.classList.contains('active')) {
        item.click();
      }
    }
  });

  updateBookingSummaryBox();

  if (typeof updatePriceSliderDisplay === 'function') {
    updatePriceSliderDisplay();
  }

  if (typeof calculatePriceFn === 'function') {
    calculatePriceFn();
  }

  // Programmatic advance on service selection in the touchless engine (Phase 3)
  // Auto-advance to step 2 (Mona Lisa) after 700ms to let the user see the selection feedback
  if (window.currentCinemaStep === 1) {
    setTimeout(() => {
      if (window.currentCinemaStep === 1 && typeof window.goToCinemaStep === 'function') {
        window.goToCinemaStep(2);
      }
    }, 700);
  }
}

function getServiceLabelTranslated(service, dict) {
  const labels = {
    'standart': dict.serviceStandart || 'Standart Temizlik',
    'detayli': dict.serviceDetayli || 'Detaylı Temizlik',
    'kurumsal': dict.serviceKurumsal || 'Kurumsal Temizlik (B2B)',
    'ilaclama': dict.serviceIlaclama || 'İlaçlama & Dezenfeksiyon',
    'insaat_sonrasi': dict.serviceInsaatSonrasi || 'İnşaat Sonrası Temizlik',
    'tasinma_sonrasi': dict.serviceTasinmaSonrasi || 'Taşınma Öncesi/Sonrası Temizlik'
  };
  return labels[service] || service;
}

function getFrequencyLabelTranslated(coeff, dict) {
  const labels = {
    '1': dict.calcFreqSingle || 'Tek Seferlik',
    '0.8': dict.calcFreqWeekly || 'Haftalık Düzenli (%20 İndirim)',
    '0.9': dict.calcFreqMonthly || 'Aylık Düzenli (%10 İndirim)'
  };
  return labels[coeff] || 'Düzenli';
}

const ROOM_LAYOUTS_TR = {
  1: "1+0 (Stüdyo)",
  2: "1+1",
  3: "2+1",
  4: "3+1",
  5: "4+1",
  6: "5+1",
  7: "Dubleks / Villa"
};

const ROOM_LAYOUTS_PL = {
  1: "1+0 (Studio)",
  2: "1+1 (2 Pokoje)",
  3: "2+1 (3 Pokoje)",
  4: "3+1 (4 Pokoje)",
  5: "4+1 (5 Pokoi)",
  6: "5+1 (6 Pokoi)",
  7: "Dupleks / Willa"
};

const PRICING_MATRIX_TR = {
  1: { standart: 3500, detayli: 4500, insaat_sonrasi: 7000, tasinma_sonrasi: 5000, kurumsal: 6000 },
  2: { standart: 4200, detayli: 5400, insaat_sonrasi: 8400, tasinma_sonrasi: 6000, kurumsal: 7200 },
  3: { standart: 5300, detayli: 6800, insaat_sonrasi: 10500, tasinma_sonrasi: 7500, kurumsal: 9000 },
  4: { standart: 6600, detayli: 8600, insaat_sonrasi: 13300, tasinma_sonrasi: 9500, kurumsal: 11500 },
  5: { standart: 8400, detayli: 10800, insaat_sonrasi: 16800, tasinma_sonrasi: 12000, kurumsal: 14500 },
  6: { standart: 10500, detayli: 13500, insaat_sonrasi: 21000, tasinma_sonrasi: 15000, kurumsal: 18000 },
  7: { standart: 14000, detayli: 18000, insaat_sonrasi: 28000, tasinma_sonrasi: 20000, kurumsal: 24000 }
};

const PRICING_MATRIX_PL = {
  1: { standart: 420, detayli: 540, insaat_sonrasi: 840, tasinma_sonrasi: 600, kurumsal: 720 },
  2: { standart: 500, detayli: 650, insaat_sonrasi: 1000, tasinma_sonrasi: 720, kurumsal: 860 },
  3: { standart: 630, detayli: 810, insaat_sonrasi: 1260, tasinma_sonrasi: 900, kurumsal: 1080 },
  4: { standart: 800, detayli: 1020, insaat_sonrasi: 1600, tasinma_sonrasi: 1140, kurumsal: 1370 },
  5: { standart: 1000, detayli: 1300, insaat_sonrasi: 2000, tasinma_sonrasi: 1440, kurumsal: 1720 },
  6: { standart: 1260, detayli: 1620, insaat_sonrasi: 2520, tasinma_sonrasi: 1800, kurumsal: 2160 },
  7: { standart: 1680, detayli: 2160, insaat_sonrasi: 3360, tasinma_sonrasi: 2400, kurumsal: 2880 }
};

function updateBookingSummaryBox() {
  const summaryBox = document.getElementById('bookingSelectionSummary');
  if (!summaryBox) return;

  if (!STATE.calculator.applied) {
    gsap.killTweensOf(summaryBox);
    gsap.to(summaryBox, {
      height: 0,
      opacity: 0,
      scale: 0.95,
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      duration: 0.4,
      ease: 'power2.inOut',
      onComplete: () => {
        summaryBox.style.display = 'none';
      }
    });
    return;
  }

  const { serviceType, area, frequency, extras, price } = STATE.calculator;
  const lang = STATE.language || 'tr';
  const isPl = lang === 'pl';
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.tr;

  const serviceLabel = getServiceLabelTranslated(serviceType, dict);
  const freqLabel = getFrequencyLabelTranslated(frequency, dict);
  const extrasHtml = extras.length > 0 
    ? extras.map(ext => `<li>${ext}</li>`).join('')
    : `<li>${dict.summaryNone || 'Yok'}</li>`;
    
  const layouts = isPl ? ROOM_LAYOUTS_PL : ROOM_LAYOUTS_TR;
  const layoutText = layouts[parseInt(area)] || area;

  const promoHtml = STATE.calculator.promoCode ? `
    <div class="summary-row"><span>${isPl ? 'Kod partnerski/rabatowy:' : 'Referans / Kupon Kodu:'}</span> <span class="summary-val" style="color: var(--clr-accent); font-weight: 700;">${STATE.calculator.promoCode}${STATE.calculator.discountRate > 0 ? ` (%${Math.round(STATE.calculator.discountRate * 100)} İndirim)` : ''}</span></div>
  ` : '';

  summaryBox.innerHTML = `
    <h4>${dict.summaryTitle || 'SEÇİLEN DETAYLAR'}</h4>
    <div class="summary-row"><span>${dict.summaryService || 'Hizmet Türü:'}</span> <span class="summary-val">${serviceLabel}</span></div>
    <div class="summary-row"><span>${dict.summaryArea || (isPl ? 'Liczba pokoi / typ:' : 'Oda Sayısı / Ev Tipi:')}</span> <span class="summary-val">${layoutText}</span></div>
    <div class="summary-row"><span>${dict.summaryFrequency || 'Sıklık:'}</span> <span class="summary-val">${freqLabel}</span></div>
    ${promoHtml}
    <div class="summary-row" style="flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 8px; margin-bottom: 8px;">
      <span>${dict.summaryExtras || 'Ekstralar:'}</span>
      <ul style="padding-left: 16px; margin: 0; list-style-type: square; color: var(--clr-muted); width: 100%;">
        ${extrasHtml}
      </ul>
    </div>
    <div class="summary-row"><span>${dict.summaryEstimated || 'Durum:'}</span> <span class="summary-price" style="font-size: 0.95rem; color: var(--clr-accent);">${isPl ? 'OFERTA ZOSTANIE PRZYGOTOWANA' : 'TEKLİF HAZIRLANACAK'}</span></div>
  `;
  
  gsap.killTweensOf(summaryBox);
  summaryBox.style.display = 'block';
  gsap.fromTo(summaryBox, 
    { height: 0, opacity: 0, scale: 0.95, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 },
    { height: 'auto', opacity: 1, scale: 1, marginTop: 8, marginBottom: 16, paddingTop: 16, paddingBottom: 16, duration: 0.5, ease: 'power2.out' }
  );
}

function updatePriceSliderDisplay() {
  const slider = document.getElementById('cPriceRange');
  const label = document.getElementById('priceRangeVal');
  const serviceSelect = document.getElementById('cService');
  if (!slider || !label) return;

  const roomVal = parseInt(slider.value) || 3;
  const lang = STATE.language || 'tr';
  const isPl = lang === 'pl';
  const serviceType = serviceSelect ? serviceSelect.value : 'standart';
  
  // Calculate percentage for gradient track fill
  const min = 1;
  const max = 7;
  const percent = ((roomVal - min) / (max - min)) * 100;
  slider.style.setProperty('--value-percent', `${percent}%`);

  const layouts = isPl ? ROOM_LAYOUTS_PL : ROOM_LAYOUTS_TR;
  const layoutText = layouts[roomVal] || roomVal.toString();

  // Calculate base price from matrix
  const matrix = isPl ? PRICING_MATRIX_PL : PRICING_MATRIX_TR;
  const servicePricing = matrix[roomVal] || matrix[3];
  let basePrice = servicePricing[serviceType] || servicePricing['standart'] || 0;
  
  // Calculate selected extras price
  let extraSum = 0;
  const activeExtras = document.querySelectorAll('.extra-btn.active');
  activeExtras.forEach(btn => {
    const priceVal = isPl ? parseFloat(btn.dataset.pricePl) : parseFloat(btn.dataset.priceTr);
    extraSum += priceVal || 0;
  });

  const estimatedPrice = basePrice + extraSum;
  const currency = isPl ? ' PLN' : ' TL';

  // Toggle visibility of price slider and extras container
  const extrasContainer = document.querySelector('.extras-container');
  const sliderContainer = document.querySelector('.price-slider-container');
  if (serviceType === 'ilaclama') {
    if (extrasContainer) extrasContainer.style.display = 'none';
    if (sliderContainer) sliderContainer.style.display = 'none';
  } else {
    if (extrasContainer) extrasContainer.style.display = 'block';
    if (sliderContainer) sliderContainer.style.display = 'block';
  }

  // Update label text to show area and price
  if (serviceType === 'ilaclama') {
    label.textContent = isPl ? `${layoutText} (Zapytaj o cenę)` : `${layoutText} (Özel Fiyat Teklifi)`;
  } else {
    label.textContent = `${layoutText} (${estimatedPrice.toLocaleString()}${currency})`;
  }

  // Sync back to state
  STATE.calculator.area = roomVal;
  STATE.calculator.price = estimatedPrice;
}

function updatePriceSliderConfig() {
  const slider = document.getElementById('cPriceRange');
  if (!slider) return;
  
  slider.min = '1';
  slider.max = '7';
  slider.step = '1';
  
  const val = parseInt(slider.value) || 3;
  if (val < 1 || val > 7) {
    slider.value = '3';
  }
  
  updatePriceSliderDisplay();
}

function navigateToStage(stage, shouldPush = true) {
  logDebug(`navigateToStage: ${stage}, shouldPush: ${shouldPush}`);
  if (shouldPush && window.history && window.history.pushState) {
    window.history.pushState({ stage }, '');
  }

  const portalStage = document.getElementById('portal-stage');
  const csoOverlay = document.getElementById('country-selector-overlay');
  const mainContent = document.getElementById('main-content');
  const bookingReveal = document.getElementById('bookingReveal');
  const mapSelectorStage = document.querySelector('.portal-map-selector-stage');
  const portalCenterHint = document.querySelector('.portal-center-hint');
  const mapTr = document.getElementById('portalNeonMap');
  const mapPl = document.getElementById('portalNeonMapPoland');

  if (stage === 'country') {
    if (portalStage) {
      portalStage.style.display = 'block';
      portalStage.style.opacity = '1';
      portalStage.style.pointerEvents = 'all';
    }
    if (csoOverlay) {
      csoOverlay.classList.remove('cso-hidden');
      csoOverlay.style.opacity = '1';
      csoOverlay.style.pointerEvents = 'all';
      csoOverlay.style.transform = '';
      gsap.set('#csoBtnPoland', { scale: 1, opacity: 1 });
      gsap.set('#csoBtnTurkey', { scale: 1, opacity: 1 });
    }
    if (mapSelectorStage) {
      mapSelectorStage.style.opacity = '0';
      mapSelectorStage.style.pointerEvents = 'none';
    }
    if (portalCenterHint) {
      portalCenterHint.style.opacity = '0';
    }
    document.body.classList.add('flag-selection-mode');
    
    if (mainContent) {
      mainContent.style.opacity = '0';
      mainContent.style.pointerEvents = 'none';
    }
    if (bookingReveal) {
      bookingReveal.setAttribute('hidden', '');
    }
    const mainNav = document.getElementById('main-nav');
    if (mainNav) {
      mainNav.style.visibility = 'visible';
      gsap.set(mainNav, { opacity: 1 });
    }

    if (typeof startParticleLoop === 'function') startParticleLoop();

  } else if (stage === 'map') {
    if (portalStage) {
      portalStage.style.display = 'block';
      portalStage.style.opacity = '1';
      portalStage.style.pointerEvents = 'all';
      const portalMapWrapper = document.querySelector('.portal-map-wrapper');
      if (portalMapWrapper) {
        gsap.set(portalMapWrapper, { scale: 1, rotationZ: 0, rotateX: 0, rotateY: 0, opacity: 1 });
      }
      gsap.set('.portal-logo-container', { y: 0, scale: 1, opacity: 1 });
      const targetLock = document.getElementById('hudTargetLock');
      if (targetLock) {
        targetLock.style.display = 'block';
        gsap.set(targetLock, { opacity: 1, scale: 1, rotation: 0 });
      }
    }
    if (csoOverlay) {
      csoOverlay.classList.add('cso-hidden');
      csoOverlay.style.opacity = '0';
      csoOverlay.style.pointerEvents = 'none';
    }
    if (mapSelectorStage) {
      mapSelectorStage.style.opacity = '1';
      mapSelectorStage.style.pointerEvents = 'all';
    }
    if (portalCenterHint) {
      portalCenterHint.style.opacity = '1';
    }
    
    if (STATE.language === 'pl') {
      if (mapTr) mapTr.style.display = 'none';
      if (mapPl) mapPl.style.display = 'block';
      initLeafletMap('poland');
    } else {
      if (mapTr) mapTr.style.display = 'block';
      if (mapPl) mapPl.style.display = 'none';
      initLeafletMap('turkey');
    }
    
    document.body.classList.add('flag-selection-mode');
    
    if (mainContent) {
      mainContent.style.opacity = '0';
      mainContent.style.pointerEvents = 'none';
    }
    if (bookingReveal) {
      bookingReveal.setAttribute('hidden', '');
    }
    
    if (typeof startParticleLoop === 'function') startParticleLoop();

  } else if (stage === 'cinema') {
    if (portalStage) {
      portalStage.style.display = 'none';
    }
    document.body.classList.remove('flag-selection-mode');
    
    if (mainContent) {
      mainContent.style.opacity = '1';
      mainContent.style.pointerEvents = 'all';
    }
    if (bookingReveal) {
      bookingReveal.setAttribute('hidden', '');
    }
    
    const mainNav = document.getElementById('main-nav');
    if (mainNav) {
      mainNav.style.visibility = 'visible';
      gsap.set(mainNav, { opacity: 1 });
    }

    if (STATE.lenisInstance) {
      STATE.lenisInstance.start();
    }
    ScrollTrigger.refresh();

  } else if (stage === 'booking') {
    if (portalStage) {
      portalStage.style.display = 'none';
    }
    document.body.classList.remove('flag-selection-mode');
    
    if (mainContent) {
      mainContent.style.opacity = '1';
      mainContent.style.pointerEvents = 'all';
    }
    if (bookingReveal) {
      bookingReveal.removeAttribute('hidden');
      gsap.fromTo('.reveal-content-box',
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
    
    // Sync price display and extras visibility
    updatePriceSliderDisplay();
    const mainNav = document.getElementById('main-nav');
    if (mainNav) {
      gsap.to(mainNav, { opacity: 0, duration: 0.3, ease: 'power2.out', onComplete: () => { mainNav.style.visibility = 'hidden'; } });
    }
  }
}

// ==========================================
// AFFILIATE & PROMO CODE SYSTEM
// ==========================================
const KNOWN_DISCOUNT_CODES = {
  'INDIRIM10': 0.10,
  'ACLAN10': 0.10,
  'EMLAK10': 0.10,
  'ACLAN20': 0.20,
  'RABAT10': 0.10,
  'RABAT20': 0.20
};

function setupPromoCodeLogic() {
  const promoInput = document.getElementById('cPromoCode');
  const applyBtn = document.getElementById('btnApplyPromo');
  const feedbackEl = document.getElementById('promoCodeFeedback');
  if (!promoInput || !applyBtn || !feedbackEl) return;

  function applyCode(rawCode, isAuto = false) {
    const code = (rawCode || '').trim().toUpperCase();
    const isPl = STATE.language === 'pl';
    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.tr;

    if (!code) {
      STATE.calculator.promoCode = null;
      STATE.calculator.discountRate = 0;
      feedbackEl.style.display = 'none';
      feedbackEl.textContent = '';
      if (typeof updateBookingSummaryBox === 'function') updateBookingSummaryBox();
      return;
    }

    if (KNOWN_DISCOUNT_CODES.hasOwnProperty(code)) {
      const discountRate = KNOWN_DISCOUNT_CODES[code];
      const discountPct = Math.round(discountRate * 100);
      STATE.calculator.promoCode = code;
      STATE.calculator.discountRate = discountRate;

      const template = dict.promoValidDiscount || '✓ Kod Uygulandı: {code} (%{discount} İndirim!)';
      feedbackEl.textContent = template.replace('{code}', code).replace('{discount}', discountPct);
      feedbackEl.style.color = '#10b981';
      feedbackEl.style.display = 'block';
    } else {
      STATE.calculator.promoCode = code;
      STATE.calculator.discountRate = 0;

      const template = dict.promoValidTracking || '✓ Emlakçı Referans Kodu Onaylandı ({code})';
      feedbackEl.textContent = template.replace('{code}', code);
      feedbackEl.style.color = '#3b82f6';
      feedbackEl.style.display = 'block';
    }

    if (typeof updateBookingSummaryBox === 'function') updateBookingSummaryBox();
    logDebug('Promo / Affiliate code applied:', code, 'Discount:', STATE.calculator.discountRate);
  }

  applyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    applyCode(promoInput.value);
  });

  promoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyCode(promoInput.value);
    }
  });

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref') || urlParams.get('aff') || urlParams.get('referral') || urlParams.get('promo');
    if (refParam) {
      promoInput.value = refParam.toUpperCase();
      applyCode(refParam, true);
    }
  } catch (err) {
    logErrorDebug('Error parsing URL referral parameter:', err);
  }
}

function setupBookingReveal() {
  const form = document.getElementById('bookingForm');
  const successState = document.getElementById('bookingSuccessState');
  const okBtn = document.getElementById('successOkBtn');

  const slider = document.getElementById('cPriceRange');
  if (slider) {
    slider.addEventListener('input', () => {
      updatePriceSliderDisplay();
    });
  }

  // Bind extra services toggle buttons
  const extraBtns = document.querySelectorAll('.extra-btn');
  extraBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      
      // Trigger subtle tick/click sound feedback if available
      if (typeof window.playTickSound === 'function') {
        window.playTickSound();
      }
      
      updatePriceSliderDisplay();
    });
  });

  // Bi-directional state/color synchronization on city changes in dropdown
  const citySelect = document.getElementById('cCity');
  if (citySelect) {
    citySelect.addEventListener('change', (e) => {
      const city = e.target.value;
      if (city && CITY_TO_REGION[city]) {
        setCityState(city, false);
      }
    });
  }

  // Recalculate price when frequency changes
  const frequencySelect = document.getElementById('cFrequency');
  if (frequencySelect) {
    frequencySelect.addEventListener('change', () => {
      updatePriceSliderDisplay();
    });
  }

  // Break applied calculator state if the user manually changes the cleaning type dropdown to another service type
  const serviceSelect = document.getElementById('cService');
  if (serviceSelect) {
    serviceSelect.addEventListener('change', () => {
      const newService = serviceSelect.value;
      const oldService = STATE.calculator.serviceType;
      selectServiceGlobal(newService);
      if (STATE.calculator.applied && newService !== oldService) {
        STATE.calculator.applied = false;
        updateBookingSummaryBox();
      }
      updatePriceSliderDisplay();
    });
  }

  // Handle Form Submission via both button click and form submit event
  const btnSubmit = document.getElementById('btnSubmitBooking') || form?.querySelector('.cinema-submit-btn');

  const doSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const name = document.getElementById('cName')?.value.trim() || '';
    const phone = document.getElementById('cPhone')?.value.trim() || '';
    const city = document.getElementById('cCity')?.value || 'Izmir';
    const service = document.getElementById('cService')?.value || 'standart';
    const dateInput = document.getElementById('cDate')?.value || '';
    const priceRange = document.getElementById('cPriceRange')?.value || '3';

    const isPl = STATE.language === 'pl';

    if (!name || name.length < 2) {
      alert(isPl ? 'Proszę wpisać imię i nazwisko.' : 'Lütfen geçerli bir Ad Soyad giriniz.');
      return;
    }

    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      alert(isPl ? 'Proszę wpisać poprawny numer telefonu.' : 'Lütfen geçerli bir Telefon Numarası giriniz.');
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.style.opacity = '0.5';
      btnSubmit.style.cursor = 'not-allowed';
    }

    const date = dateInput || new Date().toISOString().split('T')[0];
    const activeCode = (document.getElementById('cPromoCode')?.value || STATE.calculator.promoCode || '').trim().toUpperCase();
    const roomIdx = parseInt(priceRange) || 3;
    const notesLayoutTextPl = ROOM_LAYOUTS_PL[roomIdx] || priceRange;
    const notesLayoutTextTr = ROOM_LAYOUTS_TR[roomIdx] || priceRange;

    let serviceText = 'Belirtilmedi';
    if (service === 'standart') serviceText = isPl ? 'Standardowe' : 'Standart Temizlik';
    else if (service === 'detayli') serviceText = isPl ? 'Głębokie' : 'Detaylı Temizlik';
    else if (service === 'kurumsal') serviceText = isPl ? 'Firmowe (B2B)' : 'Kurumsal Temizlik (B2B)';
    else if (service === 'ilaclama') serviceText = isPl ? 'Dezynsekcja & Dezynfekcja' : 'İlaçlama & Dezenfeksiyon';
    else if (service === 'insaat_sonrasi') serviceText = isPl ? 'Sprzątanie po budowie / remoncie' : 'İnşaat Sonrası Temizlik';
    else if (service === 'tasinma_sonrasi') serviceText = isPl ? 'Sprzątanie przed/po przeprowadzce' : 'Taşınma Öncesi/Sonrası Temizlik';

    const extraNames = [];
    const activeExtras = document.querySelectorAll('.extra-btn.active');
    activeExtras.forEach(btn => {
      const labelText = btn.querySelector('.extra-label-text')?.textContent || '';
      if (labelText) extraNames.push(labelText);
    });

    const frequencySelect = document.getElementById('cFrequency');
    const frequencyVal = frequencySelect ? frequencySelect.value : 'tekseferlik';
    let freqText = isPl ? 'Jednorazowo' : 'Tek Seferlik Temizlik';
    if (frequencyVal === 'haftalik') freqText = isPl ? 'Co tydzień' : 'Haftalık Düzenli Temizlik';
    else if (frequencyVal === 'aylik') freqText = isPl ? 'Co miesiąc' : 'Aylık Düzenli Temizlik';

    const leadPayload = {
      name: name,
      phone: phone,
      source: "WEBSITE",
      sourceDetail: `Seçilen Şehir: ${city}, Tarih: ${date}`,
      notes: isPl 
        ? `Usługa: ${serviceText}, Częstotliwość: ${freqText}${service !== 'ilaclama' ? `, Pokoje: ${notesLayoutTextPl}` : ''}${extraNames.length > 0 ? `, Dodatki: ${extraNames.join(', ')}` : ''}${activeCode ? `, Kod: ${activeCode}` : ''}`
        : `Hizmet: ${serviceText}, Sıklık: ${freqText}${service !== 'ilaclama' ? `, Oda Sayısı/Ev Tipi: ${notesLayoutTextTr}` : ''}${extraNames.length > 0 ? `, Ekstralar: ${extraNames.join(', ')}` : ''}${activeCode ? `, Kod: ${activeCode}` : ''}`,
      tags: activeCode ? [service, city, `aff:${activeCode}`] : [service, city],
      affiliateCode: activeCode || null,
      promoCode: activeCode || null
    };

    // Send Lead directly to VDS Panel API (http://64.177.116.243/api/leads)
    const directVdsEndpoint = "http://64.177.116.243/api/leads";
    const relayEndpoint = "/api/leads";

    const sendLeadReq = (url) => {
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "hc_live_7x9f2m4a1v8"
        },
        body: JSON.stringify(leadPayload)
      });
    };

    // Send directly to VDS panel API endpoint
    sendLeadReq(directVdsEndpoint).then(res => {
      if (res.ok) {
        logDebug("Lead synced directly to VDS panel successfully:", res);
      } else {
        logErrorDebug("Direct VDS response not OK (status " + res.status + "), trying relay...", res);
        sendLeadReq(relayEndpoint).catch(() => {});
      }
    }).catch(err => {
      logErrorDebug("Direct VDS fetch failed, trying relay fallback...", err);
      sendLeadReq(relayEndpoint).catch(e => logErrorDebug("Relay fallback also failed:", e));
    });

    // Tracking Event Triggers
    try {
      trackConversion('generate_lead', { city: city, service: serviceText, lang: STATE.language, user: { name: name, phone: phone } });
      if (typeof gtag === 'function') {
        gtag('event', 'conversion', { 'send_to': 'AW-XXXXXXXXXX/LABEL_VALUE', 'value': 1.0, 'currency': isPl ? 'PLN' : 'TRY' });
        gtag('event', 'generate_lead', { 'event_category': 'Engagement', 'event_label': 'Website Booking', 'value': 1.0, 'currency': isPl ? 'PLN' : 'TRY', 'city': city, 'service': serviceText });
      }
      if (typeof fbq === 'function') {
        fbq('track', 'Lead', { value: 1.0, currency: isPl ? 'PLN' : 'TRY', content_name: serviceText, content_category: 'Cleaning Booking', content_ids: [city] });
      }
    } catch (trackErr) {
      console.warn("[TRACKING] Hata oluştu:", trackErr);
    }

    // Instant GSAP Transition to Success State Screen
    if (form) {
      gsap.to(form, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          form.style.display = 'none';
          form.style.opacity = '1';
          
          if (successState) {
            successState.removeAttribute('hidden');
            successState.style.display = 'block';
            gsap.fromTo(successState,
              { scale: 0.9, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out', onComplete: () => {
                const check = successState.querySelector('.success-check');
                if (check && typeof window.triggerDust === 'function') {
                  const rect = check.getBoundingClientRect();
                  const cx = rect.left + rect.width / 2;
                  const cy = rect.top + rect.height / 2;
                  window.triggerDust(cx, cy);
                  setTimeout(() => window.triggerDust(cx, cy), 150);
                }
              }}
            );
          }
        }
      });
    }
  };

  if (btnSubmit) {
    btnSubmit.addEventListener('click', doSubmit);
  }
  if (form) {
    form.addEventListener('submit', doSubmit);
  }

  // Reset booking reveal screen and replay movie
  if (okBtn) {
    okBtn.addEventListener('click', () => {
      // Release a small transition spark on click
      if (typeof window.triggerDust === 'function') {
        const rect = okBtn.getBoundingClientRect();
        window.triggerDust(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      if (successState) successState.setAttribute('hidden', '');
      
      // Re-enable submit button
      const submitBtn = form?.querySelector('.cinema-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        submitBtn.style.cursor = '';
      }

      // Reset calculator state
      STATE.calculator.applied = false;
      updateBookingSummaryBox();

      if (form) {
        form.reset();
        form.style.display = 'block';
      }

      if (STATE.lenisInstance) {
        STATE.lenisInstance.scrollTo(0, { immediate: true });
        closeBookingScreen();
      } else {
        window.scrollTo({ top: 0 });
        closeBookingScreen();
      }
    });
  }

  // Initial load sync
  updatePriceSliderDisplay();
}

function setupGlobalEscapeKey() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBookingScreen();
      
      const servicesModal = document.getElementById('services-modal');
      
      if (servicesModal && !servicesModal.hasAttribute('hidden')) {
        const closeBtn = document.getElementById('closeServicesBtn');
        if (closeBtn) closeBtn.click();
      }
    }
  });
}


// ==========================================
// 10. SERVICES & PRICING ESTIMATOR ENGINE
// ==========================================
function setupServicesModal() {
  const servicesModal = document.getElementById('services-modal');
  const modalWrapper = servicesModal?.querySelector('.modal-wrapper');
  const closeServicesBtn = document.getElementById('closeServicesBtn');
  const servicesBackdrop = document.getElementById('servicesBackdrop');
  
  const navServicesLink = document.getElementById('navServicesLink');
  const serviceItems = document.querySelectorAll('.service-item-detail');
  const areaRange = document.getElementById('calc-area-range');
  const areaLabel = document.getElementById('area-val-label');
  const frequencySelect = document.getElementById('calc-frequency');
  const extraCbs = document.querySelectorAll('.calc-extra-cb');
  const priceDisplay = document.getElementById('calc-price-display');
  const applyBtn = document.getElementById('calcApplyBtn');
  
  if (!servicesModal || !modalWrapper) return;
  
  let currentBasePrice = 15; // default base price
  let currentServiceType = 'standart';
  let currentCostObject = { val: 1500 }; // track and animate current price calculation
  
  const openServices = (targetService = 'standart') => {
    // Sync UI selection status
    serviceItems.forEach(item => {
      if (item.dataset.service === targetService) {
        item.classList.add('active');
        currentServiceType = targetService;
        currentBasePrice = parseFloat(item.dataset.basePrice || 15);
      } else {
        item.classList.remove('active');
      }
    });
    
    servicesModal.removeAttribute('hidden');
    if (STATE.lenisInstance) STATE.lenisInstance.stop();
    document.body.style.overflow = 'hidden';
    
    gsap.fromTo(modalWrapper,
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto', onComplete: () => {
        updateSliderBackground();
      }}
    );
    calculatePrice();
  };
  
  // Bind both nav links
  if (navServicesLink) {
    navServicesLink.addEventListener('click', (e) => {
      e.preventDefault();
      openServices('standart');
    });
  }
  
  window.openServicesModalWithPreset = (targetService) => {
    openServices(targetService);
  };
  
  const closeServices = () => {
    gsap.to(modalWrapper, {
      scale: 0.9,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: () => {
        servicesModal.setAttribute('hidden', '');
        if (STATE.lenisInstance) STATE.lenisInstance.start();
        document.body.style.overflow = '';
        
        // Reset invoice breakdown display to animate fresh on next reveal
        const receiptBox = document.getElementById('calculatorReceipt');
        if (receiptBox) {
          receiptBox.style.display = 'none';
          receiptBox.style.opacity = '0';
        }
      }
    });
  };
  
  if (closeServicesBtn) closeServicesBtn.addEventListener('click', closeServices);
  if (servicesBackdrop) servicesBackdrop.addEventListener('click', closeServices);
  
  serviceItems.forEach(item => {
    // Accessibility compliance
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });

    item.addEventListener('click', () => {
      serviceItems.forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      currentBasePrice = parseFloat(item.dataset.basePrice || 15);
      currentServiceType = item.dataset.service || 'standart';
      
      // Update selection in cinematic select grid if exists
      const selectItems = document.querySelectorAll('.service-select-item');
      selectItems.forEach(cItem => {
        if (cItem.dataset.service === currentServiceType) {
          cItem.classList.add('selected');
        } else {
          cItem.classList.remove('selected');
        }
      });

      // Update the booking form select input
      const cServiceSelect = document.getElementById('cService');
      if (cServiceSelect && cServiceSelect.value !== currentServiceType) {
        cServiceSelect.value = currentServiceType;
      }

      calculatePrice();
    });
  });

  if (areaRange) {
    areaRange.addEventListener('input', (e) => {
      const roomVal = parseInt(e.target.value) || 3;
      const lang = STATE.language || 'tr';
      const isPl = lang === 'pl';
      const layouts = isPl ? ROOM_LAYOUTS_PL : ROOM_LAYOUTS_TR;
      if (areaLabel) areaLabel.textContent = layouts[roomVal] || roomVal;
      calculatePrice(true);
    });
  }
  
  if (frequencySelect) {
    frequencySelect.addEventListener('change', calculatePrice);
  }
  
  extraCbs.forEach(cb => {
    cb.addEventListener('change', calculatePrice);
  });
  
  function updateSliderBackground() {
    if (!areaRange) return;
    const min = 1;
    const max = 7;
    const val = parseFloat(areaRange.value || 3);
    const percentage = ((val - min) / (max - min)) * 100;
    const accentColor = document.documentElement.style.getPropertyValue('--clr-accent') || '#3366ff';
    areaRange.style.background = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percentage}%, #d8d4c9 ${percentage}%, #d8d4c9 100%)`;
  }

  function calculatePrice(isDragging = false) {
    const lang = STATE.language || 'tr';
    const isPl = lang === 'pl';

    const area = areaRange ? parseInt(areaRange.value || 3) : 3;
    
    // Update slider fill track
    updateSliderBackground();
    
    const activeExtras = [];
    if (extraCbs) {
      extraCbs.forEach(cb => {
        if (cb.checked) {
          const labelText = cb.parentElement.textContent.replace(/\(\+.*?\)/g, '').trim();
          activeExtras.push(labelText);
        }
      });
    }
    
    // Update STATE calculator
    STATE.calculator.serviceType = currentServiceType;
    STATE.calculator.area = area;
    STATE.calculator.frequency = frequencySelect ? frequencySelect.value : '1';
    STATE.calculator.extras = activeExtras;
    STATE.calculator.price = 0; // No price value

    // Render Request Summary
    const receiptBox = document.getElementById('calculatorReceipt');
    if (receiptBox) {
      const receiptTitle = isPl ? 'Podsumowanie Zapytania' : 'Talep Özeti';
      const labelBaseArea = isPl ? 'Liczba pokoi / typ' : 'Oda Sayısı / Ev Tipi';
      const labelFrequency = isPl ? 'Częstotliwość' : 'Temizlik Sıklığı';
      const labelExtras = isPl ? 'Dodatkowe Opcje' : 'Ekstra Seçenekler';
      const labelStatus = isPl ? 'Status Oferty' : 'Teklif Durumu';
      
      let freqText = '';
      const freqVal = frequencySelect ? frequencySelect.value : '1';
      if (isPl) {
        freqText = freqVal === '0.8' ? 'Co tydzień (Regularnie)' : (freqVal === '0.9' ? 'Co miesiąc (Regularnie)' : 'Jednorazowo');
      } else {
        freqText = freqVal === '0.8' ? 'Haftalık Düzenli' : (freqVal === '0.9' ? 'Aylık Düzenli' : 'Tek Seferlik');
      }

      const layouts = isPl ? ROOM_LAYOUTS_PL : ROOM_LAYOUTS_TR;
      const layoutText = layouts[area] || area.toString();

      let receiptHtml = `
        <h4>${receiptTitle}</h4>
        <div class="receipt-row">
          <span class="receipt-lbl">${labelBaseArea}</span>
          <span class="receipt-leader"></span>
          <span class="receipt-val">${layoutText}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-lbl">${labelFrequency}</span>
          <span class="receipt-leader"></span>
          <span class="receipt-val">${freqText}</span>
        </div>
      `;

      if (activeExtras.length > 0) {
        receiptHtml += `
          <div class="receipt-row">
            <span class="receipt-lbl">${labelExtras}</span>
            <span class="receipt-leader"></span>
            <span class="receipt-val">${activeExtras.join(', ')}</span>
          </div>
        `;
      }

      receiptHtml += `
        <div class="receipt-row receipt-total-row">
          <span class="receipt-lbl receipt-total-lbl">${labelStatus}</span>
          <span class="receipt-leader"></span>
          <span class="receipt-val receipt-total-val" style="color: var(--clr-accent); font-weight: 700; text-transform: uppercase;">
            ${isPl ? 'OFERTA ZOSTANIE PRZYGOTOWANA' : 'TEKLİF HAZIRLANACAK'}
          </span>
        </div>
      `;

      receiptBox.innerHTML = receiptHtml;

      if (receiptBox.style.display === 'none') {
        receiptBox.style.display = 'block';
        gsap.fromTo(receiptBox,
          { opacity: 0, scale: 0.98, y: -5 },
          { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'power2.out' }
        );
      }
      
      // Animate individual rows fade-in stagger (only when not dragging the slider)
      if (!isDragging) {
        gsap.fromTo(receiptBox.querySelectorAll('.receipt-row'),
          { opacity: 0, x: -4 },
          { opacity: 1, x: 0, stagger: 0.04, duration: 0.35, ease: 'power2.out', overwrite: 'auto' }
        );
      }
    }

    if (priceDisplay) {
      priceDisplay.textContent = isPl ? 'OFERTA ZOSTANIE PRZYGOTOWANA' : 'TEKLİF HAZIRLANACAK';
    }
  }
  
  if (applyBtn) {
    applyBtn.addEventListener('click', (e) => {
      if (typeof window.triggerDust === 'function') {
        window.triggerDust(e.clientX, e.clientY);
      }
      
      const formServiceSelect = document.getElementById('cService');
      if (formServiceSelect) {
        formServiceSelect.value = currentServiceType;
      }
      
      // Lock applied state & render summary box in booking form
      STATE.calculator.applied = true;
      updateBookingSummaryBox();

      closeServices();
      
      setTimeout(() => {
        scrollToTarget('#cinema-section', window.innerHeight * 48);
      }, 300);
    });
  }

  calculatePriceFn = calculatePrice;
}

// ==========================================
// 11. RETURN TO PORTAL GATEWAY ENGINE
// ==========================================
function openPortalGateway() {
  const portalStage = document.getElementById('portal-stage');
  const mainContent = document.getElementById('main-content');
  if (!portalStage || !mainContent) return;

  window.portalWarping = true; // Lock hover calculations during return transition

  // Back on the light portal — restore the warm paper browser chrome tint
  setThemeColor('#f7f6f2');

  // Clear previous cinema states & video playheads
  resetCinemaState();
  stopParticleLoop();

  if (STATE.lenisInstance) {
    STATE.lenisInstance.scrollTo(0, { immediate: true });
    STATE.lenisInstance.stop();
  }

  // Clear cache from localStorage to force gateway
  localStorage.removeItem('tworose_city');

  // Clear bypassing class to allow gateway display
  document.documentElement.classList.remove('bypassing-gateway');

  document.body.classList.add('flag-selection-mode');
  portalStage.style.display = 'flex';
  portalStage.style.opacity = '0';
  portalStage.style.pointerEvents = 'all';

  // Set initial states for staggered card entrance and sci-fi decorations
  gsap.set('.cc-gateway-card', { display: 'none', opacity: 0 });
  gsap.set('.portal-map-wrapper', {
    opacity: 0,
    x: 0,
    y: 30,
    scale: 0.98,
    rotationZ: 0,
    rotateX: 0,
    rotateY: 0,
    transformOrigin: '50% 50%'
  });
  gsap.set('.map-hotspot', { opacity: 0, scale: 0 });
  gsap.set('#portalDefaultPanel', { display: 'flex', opacity: 0, x: 20 });
  gsap.set('.portal-logo-container', { y: -30, scale: 1, opacity: 0 });
  gsap.set('.portal-center-hint', { y: 12, scale: 1, opacity: 0 });
  gsap.set('.grid-line.horizontal', { scaleX: 0 });
  gsap.set('.grid-line.vertical', { scaleY: 0 });
  gsap.set('.hud-tl', { x: -20, y: -20, opacity: 0 });
  gsap.set('.hud-tr', { x: 20, y: -20, opacity: 0 });
  gsap.set('.hud-bl', { x: -20, y: 20, opacity: 0 });
  gsap.set('.hud-br', { x: 20, y: 20, opacity: 0 });
  gsap.set('.telemetry-tick', { opacity: 0 });
  gsap.set('#portalMapHUD', { opacity: 0 });

  const tl = gsap.timeline({
    onComplete: () => {
      // Re-init portal particles
      setupPortalParticles();
      // Recalculate cached bounds now that map is static and returned to scale 1, translateY 0
      if (typeof window.updatePortalCachedRects === 'function') {
        window.updatePortalCachedRects();
      }
      window.portalWarping = false; // Release hover calculations lock
    }
  });

  tl.to('#main-content', { opacity: 0, pointerEvents: 'none', duration: 0.4, ease: 'power2.inOut' })
    .to(portalStage, { opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.1')
    .to('.grid-line.horizontal', { scaleX: 1, duration: 1.1, ease: 'power3.inOut' }, '-=0.2')
    .to('.grid-line.vertical', { scaleY: 1, duration: 1.1, ease: 'power3.inOut' }, '-=1.1')
    .to(['.hud-tl', '.hud-tr', '.hud-bl', '.hud-br'], { x: 0, y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.05 }, '-=0.4')
    .to('.telemetry-tick', { opacity: 0.45, duration: 0.6, stagger: 0.05, ease: 'power1.inOut' }, '-=0.4')
    .to('.portal-logo-container', { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, '-=0.4')
    .to('.portal-center-hint', { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.3')
    .to('.portal-map-wrapper', { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'power3.out' }, '-=0.4')
    .to('.map-hotspot', { opacity: 1, scale: 1, duration: 0.7, stagger: 0.05, ease: 'back.out(1.7)' }, '-=0.8')
    .to('#portalDefaultPanel', { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }, '-=0.8');
}

let lastWidth = window.innerWidth;
function setupResizeObserver() {
  let debounceTimeout = null;
  const observer = new ResizeObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const currentWidth = window.innerWidth;
      cachedWindowWidth = currentWidth;
      cachedWindowHeight = window.innerHeight;
      
      // Only refresh ScrollTrigger if horizontal width changed (helps mobile scrolling with address bar)
      if (currentWidth !== lastWidth) {
        lastWidth = currentWidth;
        ScrollTrigger.refresh();
      }
    }, 200);
  });
  observer.observe(document.body);
}

// ==========================================
// 12. CUSTOM CINEMATIC CURSOR (Desktop LERP)
// ==========================================
function setupCustomCursor() {
  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  cursor.className = 'custom-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = `
    <div class="cursor-dot"></div>
    <div class="cursor-ring"></div>
  `;
  document.body.appendChild(cursor);

  // Cache dot and ring elements to avoid expensive DOM queries inside the animation loop
  const dot = cursor.querySelector('.cursor-dot');
  const ring = cursor.querySelector('.cursor-ring');

  let mouseX = 0, mouseY = 0;
  let dotX = 0, dotY = 0;
  let ringX = 0, ringY = 0;
  let isKeyboardNav = false;
  let hasMoved = false;

  let cursorActive = false;
  function startCursorLoop() {
    if (!cursorActive) {
      cursorActive = true;
      requestAnimationFrame(updateCursorLoop);
    }
  }

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    isKeyboardNav = false;
    if (!hasMoved) {
      hasMoved = true;
      dotX = mouseX;
      dotY = mouseY;
      ringX = mouseX;
      ringY = mouseY;
    }
    cursor.style.opacity = '1';
    startCursorLoop();
  }, { passive: true });

  // Hide cursor on viewport escape/enter
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    if (!isKeyboardNav && hasMoved) {
      cursor.style.opacity = '1';
    }
    startCursorLoop();
  });

  // Track hover and focus transitions
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (!target) return;

    const isInteractive = target.closest('a, button, .cc-gateway-card, .service-item-detail, .calc-cb-label, input, select, .map-hotspot');
    const isInCinema = target.closest('#cinema-section') && !target.closest('.reveal-content-box, #main-nav');

    if (isInteractive) {
      document.body.classList.add('cursor-hovering');
    } else {
      document.body.classList.remove('cursor-hovering');
    }

    if (isInCinema) {
      document.body.classList.add('cursor-cinema-active');
    } else {
      document.body.classList.remove('cursor-cinema-active');
    }
  });

  // Keyboard accessibility: hide custom cursor on Tab key press
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      isKeyboardNav = true;
      cursor.style.opacity = '0';
    }
  });

  // Resume custom cursor on mouse movement
  window.addEventListener('mousedown', () => {
    isKeyboardNav = false;
    cursor.style.opacity = '1';
    startCursorLoop();
  });

  let lastDotX = -9999, lastDotY = -9999;
  let lastRingX = -9999, lastRingY = -9999;

  function updateCursorLoop() {
    dotX += (mouseX - dotX) * 0.35;
    dotY += (mouseY - dotY) * 0.35;
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;

    let settled = true;
    if (Math.abs(mouseX - dotX) > 0.05 || Math.abs(mouseY - dotY) > 0.05) {
      settled = false;
    }
    if (Math.abs(mouseX - ringX) > 0.05 || Math.abs(mouseY - ringY) > 0.05) {
      settled = false;
    }

    if (dot && ring) {
      const roundedDotX = Math.round(dotX * 10) / 10;
      const roundedDotY = Math.round(dotY * 10) / 10;
      const roundedRingX = Math.round(ringX * 10) / 10;
      const roundedRingY = Math.round(ringY * 10) / 10;

      // Only perform DOM updates if positions have changed meaningfully (prevents paint overhead when idle)
      if (roundedDotX !== lastDotX || roundedDotY !== lastDotY) {
        dot.style.transform = `translate3d(${roundedDotX}px, ${roundedDotY}px, 0) translate(-50%, -50%)`;
        lastDotX = roundedDotX;
        lastDotY = roundedDotY;
      }
      if (roundedRingX !== lastRingX || roundedRingY !== lastRingY) {
        ring.style.transform = `translate3d(${roundedRingX}px, ${roundedRingY}px, 0) translate(-50%, -50%)`;
        lastRingX = roundedRingX;
        lastRingY = roundedRingY;
      }
    }

    if (!settled) {
      requestAnimationFrame(updateCursorLoop);
    } else {
      cursorActive = false;
    }
  }
  startCursorLoop();
}

// ==========================================
// 13. CINEMA STAGE AMBIENT LIGHT VIGNETTE
// ==========================================
function setupCinemaAmbientLight() {
  const section = document.getElementById('cinema-section');
  if (!section) return;

  const targetContainer = section.querySelector('.cinema-stage') || section;

  const light = document.createElement('div');
  light.id = 'cinema-ambient-light';
  light.className = 'cinema-ambient-light';
  light.setAttribute('aria-hidden', 'true');
  targetContainer.appendChild(light);

  let sectionTop = 0;
  let sectionHeight = 0;
  const updateSectionBounds = () => {
    const rect = section.getBoundingClientRect();
    sectionTop = rect.top + window.scrollY;
    sectionHeight = rect.height;
  };
  updateSectionBounds();
  window.addEventListener('resize', updateSectionBounds);
  window.addEventListener('scroll', updateSectionBounds, { passive: true });

  let lightTicking = false;
  let lightMX = 0;
  let lightMY = 0;

  if (!('ontouchstart' in window)) {
    window.addEventListener('mousemove', (e) => {
      // Check viewport visibility using cached bounds
      const relativeTop = sectionTop - window.scrollY;
      const inView = relativeTop <= cachedWindowHeight && (relativeTop + sectionHeight) >= 0;
      if (!inView) return;

      lightMX = e.clientX;
      lightMY = e.clientY;

      if (!lightTicking) {
        window.requestAnimationFrame(() => {
          light.style.transform = `translate3d(${lightMX}px, ${lightMY}px, 0)`;
          lightTicking = false;
        });
        lightTicking = true;
      }
    }, { passive: true });
  }
}

// ==========================================
// 14. GLOBAL HOLOGRAPHIC CLICK SHOCKWAVE RIPPLES & HOVER TICKS
// ==========================================
function setupHolographicClickRipples() {
  // Global hover micro-ticks using mouseover capturing
  document.addEventListener('mouseover', (e) => {
    const interactive = e.target.closest('a, button, .map-hotspot, .calculator-btn, .tab-btn, .service-item-detail, .service-select-item');
    if (!interactive) return;
    if (interactive.dataset.hoveredSound === 'true') return;
    
    interactive.dataset.hoveredSound = 'true';
    interactive.addEventListener('mouseleave', () => {
      interactive.dataset.hoveredSound = 'false';
    }, { once: true });

    if (typeof window.playTickSound === 'function') {
      window.playTickSound();
    }
  });

  document.addEventListener('click', (e) => {
    // Detect closest interactive element
    const interactive = e.target.closest('a, button, .cc-gateway-card, .map-hotspot, .mobile-menu-toggle, .calculator-btn, .tab-btn, .service-item-detail, .service-select-item');
    if (!interactive) return;

    // Trigger click sound feedback
    if (typeof window.playClickSound === 'function') {
      window.playClickSound();
    }

    // Define accent color
    let accentColor = 'rgba(51, 102, 255, 0.85)'; // Default Marmara blue
    let market = 'marmara';

    const cardOrHotspot = e.target.closest('[data-market]');
    if (cardOrHotspot) {
      market = cardOrHotspot.dataset.market;
      if (market === 'ege') accentColor = 'rgba(255, 145, 0, 0.85)';
      if (market === 'karadeniz') accentColor = 'rgba(255, 51, 102, 0.85)';
    }

    const ripple = document.createElement('div');
    ripple.className = 'cyber-shockwave';
    ripple.style.setProperty('--ripple-accent', accentColor);

    // If it's a map click, position relative to the map wrapper
    const mapWrapper = e.target.closest('.portal-map-wrapper');
    if (mapWrapper) {
      const rect = mapWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      mapWrapper.appendChild(ripple);
    } else {
      const rect = interactive.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (interactive.tagName === 'BUTTON' || interactive.classList.contains('cc-gateway-card')) {
        interactive.style.overflow = 'hidden';
      }

      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      interactive.classList.add('ripple-host');
      interactive.appendChild(ripple);
    }

    // Auto cleanup ripple after animation finishes
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      ripple.remove();
    };
    ripple.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, 900);
  });
}

// ==========================================
// 15. FUTURISTIC WEB AUDIO SYNTH & UX TOGGLE
// ==========================================
class CyberSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try {
      this.muted = localStorage.getItem('tworose_audio_muted') === 'true';
    } catch (e) {
      logDebug("localStorage read blocked", e);
    }
    this.spikeTimeout = null;
    this.visualizerEl = null;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      logDebug("Web Audio API not supported", e);
    }
  }

  triggerSpike() {
    if (!this.visualizerEl) {
      this.visualizerEl = document.querySelector('.audio-visualizer-bars');
    }
    if (!this.visualizerEl) return;

    // Use GPU-accelerated GSAP transform scale instead of class-toggling reflow triggers
    if (typeof gsap !== 'undefined') {
        gsap.killTweensOf(this.visualizerEl);
        gsap.fromTo(this.visualizerEl, 
          { scaleY: 1.5, opacity: 1 },
          { scaleY: 1.0, opacity: 0.25, duration: 0.15, ease: 'power2.out' }
        );
    }
  }

  playTick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    this.triggerSpike();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2800, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.012, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + 0.04);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    this.triggerSpike();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.09);

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.start();
    osc.stop(now + 0.12);
  }

  playWarp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    this.triggerSpike();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.75);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(8, now);
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(1500, now + 0.75);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc.start();
    osc.stop(now + 0.85);
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('tworose_audio_muted', this.muted);
    } catch (e) {
      logDebug("localStorage write blocked", e);
    }
    
    // Resume audio context if suspended to satisfy browser gesture requirements
    if (!this.muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(err => logDebug("Audio Context resume failed", err));
    }
    
    this.updateToggleUI();
  }

  updateToggleUI() {
    const btn = document.getElementById('portalAudioToggle');
    if (!btn) return;

    const text = btn.querySelector('.audio-toggle-text');
    const lang = STATE.language || STATE.currentLang || 'tr';
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.tr;

    if (this.muted) {
      btn.classList.add('muted');
      if (text) text.textContent = dict.audioOff || 'AUDIO: OFF';
    } else {
      btn.classList.remove('muted');
      if (text) text.textContent = dict.audioOn || 'AUDIO: ON';
    }
  }
}

synth = new CyberSynth();

// Global bindings for ease of use in event listeners
window.playTickSound = () => synth.playTick();
window.playClickSound = () => synth.playClick();
window.playWarpSound = () => synth.playWarp();

function setupAudioToggle() {
  const btn = document.getElementById('portalAudioToggle');
  if (!btn) return;

  synth.updateToggleUI();

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    synth.init(); // Initialize audio context on click
    synth.toggleMute();
    if (!synth.muted) {
      synth.playClick();
    }
  });

  // Enable audio context on any interactive document click
  const enableAudioCtx = () => {
    synth.init();
    if (synth.ctx && synth.ctx.state === 'suspended') {
      synth.ctx.resume().catch(() => {});
    }
    document.removeEventListener('click', enableAudioCtx);
    document.removeEventListener('keydown', enableAudioCtx);
  };
  document.addEventListener('click', enableAudioCtx);
  document.addEventListener('keydown', enableAudioCtx);
}

