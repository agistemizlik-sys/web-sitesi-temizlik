import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STATE, REGION_THEMES, CITY_TO_REGION, CITY_NAMES_TR, CITY_NAMES_TR_TITLE } from './js/state.js';
import { TRANSLATIONS, SERVICE_SCENE_TEXTS, SERVICE_SCENE_TEXTS_PL } from './js/translations.js';
import { initAttribution, trackConversion } from './js/tracking.js';
import { escapeHTML, sanitizeInputVal, debounce, throttle, formatCurrency } from './js/modules/domUtils.js';
import { playTickSound, playSuccessChime, toggleSound, isSoundEnabled } from './js/modules/soundEngine.js';
import { openModal, closeModal, openLegalModal } from './js/modules/modalManager.js';
import { calculateBasePrice, getFrequencyDiscountRate, verifyPromoCode } from './js/modules/pricingEngine.js';
import { initAuthEngine, prefillBookingWizardWithUser } from './js/modules/authEngine.js';
import { initI18nDropdowns, applyLanguageGlobal } from './js/modules/i18nEngine.js';
import { initLoopEngineering, attachSubMsVideoLoop } from './js/modules/loopEngine.js';
import { initCyberLoopEngine } from './js/modules/cyberLoopEngine.js';
import { secureFetch, getCsrfToken } from './js/modules/csrfEngine.js';
import { initPushEngine, requestNotificationPermission, showLocalNotification } from './js/modules/pushEngine.js';
import { initHygieneCertificateEngine, openHygieneCertificate } from './js/modules/hygieneCertificateEngine.js';
import { initVipConciergeEngine, openVipConciergeModal } from './js/modules/vipConcierge.js';
import { initHardwareBooster, probeGpuHardware } from './js/modules/hardwareBooster.js';
import { initVoiceAssistantEngine, toggleVoiceAssistantHud, askVoiceTopic } from './js/modules/voiceAssistant.js';
import { initDebugHardening, logDebug, logWarnDebug, logErrorDebug, toggleDiagnosticsHUD, runPerformanceBenchmark, exportDebugReport } from './js/modules/debugEngine.js';
import { initSocialProofEngine } from './js/modules/socialProofEngine.js';
import { CONSTANTS } from './js/modules/constants.js';
import { dispatchLeadToPanel, pollOrderApproval, safeStorageGet, safeStorageSet, safeJsonParse } from './js/modules/apiClient.js';

gsap.registerPlugin(ScrollTrigger);

// Attach globally required public helpers to window
window.sanitizeInputValGlobal = sanitizeInputVal;
window.playTickSound = playTickSound;
window.playSuccessChime = playSuccessChime;
window.toggleSound = toggleSound;
window.openCorporateModal = openModal;
window.closeCorporateModal = closeModal;
window.openLegalModal = openLegalModal;
window.openHygieneCertificate = openHygieneCertificate;
window.openVipConciergeModal = openVipConciergeModal;
window.toggleVoiceAssistantHud = toggleVoiceAssistantHud;
window.askVoiceTopic = askVoiceTopic;
window.initHardwareBooster = initHardwareBooster;
window.probeGpuHardware = probeGpuHardware;
window.initLoopEngineering = initLoopEngineering;
window.initCyberLoopEngine = initCyberLoopEngine;
window.secureFetch = secureFetch;
window.getCsrfToken = getCsrfToken;
window.requestNotificationPermission = requestNotificationPermission;
window.showLocalNotification = showLocalNotification;
window.attachSubMsVideoLoop = attachSubMsVideoLoop;
window.toggleDiagnosticsHUD = toggleDiagnosticsHUD;
window.runPerformanceBenchmark = runPerformanceBenchmark;
window.exportDebugReport = exportDebugReport;
window.logDebug = logDebug;
window.logErrorDebug = logErrorDebug;

// Global Client Resilience & Error Boundary
window.addEventListener('unhandledrejection', (event) => {
  if (event && event.reason) {
    console.warn('[RELAXAX_RESILIENT_LOOP_GUARD]', event.reason);
  }
  event.preventDefault();
});

// Initialize Hardware Booster, Master Loop Engine, Cyber Defense, Push Engine, Voice Assistant, Hygiene Certificates, VIP Concierge & Debug Hardening
initHardwareBooster();
initLoopEngineering();
initCyberLoopEngine();
initPushEngine();
initHygieneCertificateEngine();
initVipConciergeEngine();
initVoiceAssistantEngine();
initDebugHardening();

// Global cached window dimensions to prevent layout recalculations in mousemove events
let cachedWindowWidth = window.innerWidth;
let cachedWindowHeight = window.innerHeight;

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
  if (portalHotspotListeners && portalHotspotListeners.length > 0) {
    portalHotspotListeners.forEach((item) => {
      if (item && item.hotspot) {
        const { hotspot, onEnter, onLeave, clickHandler, keyHandler } = item;
        if (onEnter) hotspot.removeEventListener('mouseenter', onEnter);
        if (onLeave) hotspot.removeEventListener('mouseleave', onLeave);
        if (clickHandler) hotspot.removeEventListener('click', clickHandler);
        if (keyHandler) hotspot.removeEventListener('keydown', keyHandler);
      } else if (typeof item === 'function') {
        try { item(); } catch(e) {}
      }
    });
    portalHotspotListeners = [];
  }
  if (country === 'turkey' && turkeyMapInstance) {
    try {
      turkeyMapInstance.eachLayer(layer => {
        try { turkeyMapInstance.removeLayer(layer); } catch(e) {}
      });
      turkeyMapInstance.stop();
      turkeyMapInstance.off();
      turkeyMapInstance.remove();
    } catch (e) {}
    turkeyMapInstance = null;
    window.turkeyMapInstance = null;
    const trEl = document.getElementById('portalNeonMap');
    if (trEl && trEl._leaflet_id) trEl._leaflet_id = null;
  } else if (country === 'poland' && polandMapInstance) {
    try {
      polandMapInstance.eachLayer(layer => {
        try { polandMapInstance.removeLayer(layer); } catch(e) {}
      });
      polandMapInstance.stop();
      polandMapInstance.off();
      polandMapInstance.remove();
    } catch (e) {}
    polandMapInstance = null;
    window.polandMapInstance = null;
    const plEl = document.getElementById('portalNeonMapPoland');
    if (plEl && plEl._leaflet_id) plEl._leaflet_id = null;
  }
}

// Module-level variables for gateway interactive components
let cardHoverListeners = [];
let portalHotspotListeners = [];
let leafletInitToken = 0;
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

// Safe Early Global Exposure with Non-recursive Delegation
let _boundSelectCountryGlobal = null;
let _boundSelectCityGlobal = null;
let _boundReturnToCountrySelector = null;
let _boundReturnToCityMap = null;

window.selectCountryGlobal = function(code) {
  if (typeof _boundSelectCountryGlobal === 'function') {
    _boundSelectCountryGlobal(code);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof _boundSelectCountryGlobal === 'function') {
        _boundSelectCountryGlobal(code);
      }
    }, { once: true });
  }
};
window.selectCityGlobal = function(city) {
  if (typeof _boundSelectCityGlobal === 'function') {
    _boundSelectCityGlobal(city);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof _boundSelectCityGlobal === 'function') {
        _boundSelectCityGlobal(city);
      }
    }, { once: true });
  }
};
window.returnToCountrySelector = function() {
  if (typeof _boundReturnToCountrySelector === 'function') {
    _boundReturnToCountrySelector();
  }
};
window.returnToCityMap = function() {
  if (typeof _boundReturnToCityMap === 'function') {
    _boundReturnToCityMap();
  }
};

let canvasAnimationId = null;
let resizeCanvasHandler = null;
let portalMouseMoveHandler = null;
let particlesVisibilityHandler = null;
let synth = null;
let lastWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
let activeCity = null;
let cachedStageRect = null;
let cachedMapRect = null;
let cachedWrapperRect = null;

// ==========================================
// FUTURISTIC WEB AUDIO SYNTH & UX TOGGLE
// ==========================================
class CyberSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try {
      this.muted = (localStorage.getItem('relaxax_audio_muted') || localStorage.getItem('tworose_audio_muted')) === 'true';
    } catch (e) {
      logDebug("localStorage read blocked", e);
    }
    this.spikeTimeout = null;
    this.visualizerEl = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      logDebug("Web Audio API not supported", e);
    }
  }

  triggerSpike() {
    if (!this.visualizerEl) {
      this.visualizerEl = document.querySelector('.audio-visualizer-bars');
    }
    if (!this.visualizerEl) return;

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
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => this.playTick()).catch(() => {});
      return;
    }
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
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => this.playClick()).catch(() => {});
      return;
    }
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
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => this.playWarp()).catch(() => {});
      return;
    }
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
      localStorage.setItem('relaxax_audio_muted', this.muted);
    } catch (e) {
      logDebug("localStorage write blocked", e);
    }
    
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

window.playTickSound = () => {
  if (synth) synth.playTick();
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(8); } catch (e) {}
  }
};
window.playClickSound = () => { if (synth) synth.playClick(); };
window.playWarpSound = () => { if (synth) synth.playWarp(); };



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

  // Dynamic Geo-Targeting Meta Update
  const isPlMode = lang === 'pl';
  const geoRegionMeta = document.querySelector('meta[name="geo.region"]');
  const geoPlacenameMeta = document.querySelector('meta[name="geo.placename"]');
  const geoPositionMeta = document.querySelector('meta[name="geo.position"]');
  const icbmMeta = document.querySelector('meta[name="ICBM"]');

  if (geoRegionMeta) geoRegionMeta.setAttribute('content', isPlMode ? 'PL-14' : 'TR-34, TR-35, TR-07, TR-41, TR-54, TR-55, TR-10');
  if (geoPlacenameMeta) geoPlacenameMeta.setAttribute('content', isPlMode ? 'Warszawa, Mazowieckie, Polska' : 'İstanbul, İzmir, Antalya, Kocaeli, Sakarya, Samsun, Balıkesir, Türkiye');
  if (geoPositionMeta) geoPositionMeta.setAttribute('content', isPlMode ? '52.2297;21.0122' : '41.0082;28.9784');
  if (icbmMeta) icbmMeta.setAttribute('content', isPlMode ? '52.2297, 21.0122' : '41.0082, 28.9784');

  // Dynamic LocalBusiness JSON-LD Structured Data Update
  const schemaScript = document.querySelector('script[type="application/ld+json"]');
  if (schemaScript) {
    const isPl = lang === 'pl';
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ProfessionalService",
          "@id": "https://relaxax.com/#service",
          "name": "RELAXAX",
          "image": "https://relaxax.com/images/og-image.png",
          "url": "https://relaxax.com",
          "telephone": isPl ? "+48221234567" : "+905466479004",
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
          "@id": "https://relaxax.com/#service-insaat",
          "name": isPl ? "Sprzątanie po budowie / remoncie" : "İnşaat Sonrası Temizlik",
          "serviceType": "Post-Construction Cleaning",
          "provider": { "@id": "https://relaxax.com/#service" },
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
          "@id": "https://relaxax.com/#service-tasinma",
          "name": isPl ? "Sprzątanie przed/po przeprowadzce" : "Taşınma Öncesi/Sonrası Temizlik",
          "serviceType": "Move-in / Move-out Cleaning",
          "provider": { "@id": "https://relaxax.com/#service" },
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
              "name": "RELAXAX hangi şehirlerde premium temizlik hizmeti sunmaktadır?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "RELAXAX; İzmir, İstanbul, Sakarya, Kocaeli, Samsun ve Balıkesir illerinde profesyonel temizlik ekipleriyle premium standartlarda hizmet vermektedir."
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
                "text": "RELAXAX, Sağlık Bakanlığı onaylı ilaçlar ve profesyonel ekipmanlar kullanarak haşere kontrolü ve antiviral dezenfeksiyon hizmeti sunar. İşlem öncesi ve sonrası gerekli bilgilendirmeler tarafınıza yapılır."
              }
            }
          ]
        },
        {
          "@type": "HowTo",
          "name": isPl ? "Jak zamówić profesjonalne sprzątanie w 3 krokach na RELAXAX?" : "RELAXAX ile 3 Adımda Kolayca Temizlik Siparişi Nasıl Verilir?",
          "description": isPl ? "Prosty proces rezerwacji sprzątania mieszkania lub biura online." : "Dakikalar içinde canlı fiyat hesaplayıp rezervasyon oluşturma adımları.",
          "step": [
            {
              "@type": "HowToStep",
              "position": 1,
              "name": isPl ? "Krok 1: Wybierz parametry lokalu" : "Adım 1: Mekan Bilgileri ve Oda Sayısı",
              "text": isPl ? "Wybierz rodzaj sprzątania, liczbę pokoi, łazienek i metraż." : "Hizmet türünü (Standart, Detaylı, Taşınma), oda ve banyo sayısını seçin."
            },
            {
              "@type": "HowToStep",
              "position": 2,
              "name": isPl ? "Krok 2: Dobierz usługi dodatkowe i zapach" : "Adım 2: Ekstra Hizmetler ve Özel Oda Kokusu",
              "text": isPl ? "Dodaj mycie piekarnika, okien, lodówki lub prasowanie oraz wybierz zapach." : "Fırın, buzdolabı, cam veya koltuk yıkama gibi ek hizmetleri ekleyip imza oda kokunuzu belirleyin."
            },
            {
              "@type": "HowToStep",
              "position": 3,
              "name": isPl ? "Krok 3: Wpisz adres, datę i potwierdź zamówienie" : "Adım 3: Adres, Tarih Seçimi ve Güvenli Onay",
              "text": isPl ? "Podaj adres, wybierz dogodny termin i sfinalizuj rezerwację z rabatem." : "Adresinizi girin, randevu tarihinizi belirleyin ve siparişinizi %5 havale/FAST avantajıyla tamamlayın."
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

  if (typeof synth !== 'undefined' && synth && typeof synth.updateToggleUI === 'function') {
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

  // Dynamic translations for the new CTA buttons and floating capsule navbar
  const headerCtaBtn = document.getElementById('headerCtaBtn');
  if (headerCtaBtn) {
    headerCtaBtn.textContent = lang === 'pl' ? 'ZAMÓW' : 'SİPARİŞ VER';
  }
  const floatingCtaTxt = document.getElementById('floatingCtaTxt');
  if (floatingCtaTxt) {
    floatingCtaTxt.textContent = lang === 'pl' ? 'Zamów teraz ➔' : 'Hemen Sipariş Ver ➔';
  }
  const drawerCtaBtn = document.getElementById('drawerCtaBtn');
  if (drawerCtaBtn) {
    drawerCtaBtn.textContent = lang === 'pl' ? 'Zamów teraz ➔' : 'Hemen Sipariş Ver ➔';
  }

  // Floating Capsule Top Nav translations
  const cNavActiveSceneLabel = document.getElementById('cNavActiveSceneLabel');
  if (cNavActiveSceneLabel) cNavActiveSceneLabel.textContent = lang === 'pl' ? 'Informacje o firmie' : 'Kurumsal Bilgi';

  const cNavMapText = document.getElementById('cNavMapText');
  if (cNavMapText) cNavMapText.textContent = lang === 'pl' ? 'Mapa Miast' : 'Şehir Haritası';
  
  const cNavProductsText = document.getElementById('cNavProductsText') || document.getElementById('cNavBeforeAfterText');
  if (cNavProductsText) cNavProductsText.textContent = lang === 'pl' ? 'Produkty' : 'Ürünlerimiz';
  
  const cNavCalcText = document.getElementById('cNavCalcText');
  if (cNavCalcText) cNavCalcText.textContent = lang === 'pl' ? 'Oblicz Cenę' : 'Fiyat Hesapla';
  
  const cNavWhatsappText = document.getElementById('cNavWhatsappText');
  if (cNavWhatsappText) cNavWhatsappText.textContent = lang === 'pl' ? 'WhatsApp Zamów' : 'WhatsApp Sipariş';
}

// ==========================================
// 2.B. ENTERPRISE MULTI-CURRENCY BANK SELECTOR MANAGER
// ==========================================
const TURKISH_BANKS = {
  garanti: {
    name: 'Garanti BBVA',
    holder: 'RELAXAX TEMİZLİK VE HİJYEN TEKNOLOJİLERİ A.Ş.',
    iban: 'TR12 0006 2000 0001 2345 6789 01',
    rawIban: 'TR120006200000012345678901',
    fastEmail: 'fatura@relaxax.com',
    branch: 'Kadıköy Şubesi (Kod: 620) / 1234567'
  },
  isbank: {
    name: 'Türkiye İş Bankası',
    holder: 'RELAXAX TEMİZLİK VE HİJYEN TEKNOLOJİLERİ A.Ş.',
    iban: 'TR34 0006 4000 0002 3456 7890 12',
    rawIban: 'TR340006400000023456789012',
    fastEmail: 'fatura@relaxax.com',
    branch: 'Moda Şubesi (Kod: 1042) / 7654321'
  },
  yapikredi: {
    name: 'Yapı Kredi',
    holder: 'RELAXAX TEMİZLİK VE HİJYEN TEKNOLOJİLERİ A.Ş.',
    iban: 'TR56 0006 7000 0003 4567 8901 23',
    rawIban: 'TR560006700000034567890123',
    fastEmail: 'fatura@relaxax.com',
    branch: 'Kadıköy Rıhtım Şubesi (Kod: 815) / 9876543'
  },
  akbank: {
    name: 'Akbank',
    holder: 'RELAXAX TEMİZLİK VE HİJYEN TEKNOLOJİLERİ A.Ş.',
    iban: 'TR78 0004 6000 0004 5678 9012 34',
    rawIban: 'TR780004600000045678901234',
    fastEmail: 'fatura@relaxax.com',
    branch: 'Bağdat Caddesi Şubesi (Kod: 320) / 4567890'
  },
  ziraat: {
    name: 'Ziraat Bankası',
    holder: 'RELAXAX TEMİZLİK VE HİJYEN TEKNOLOJİLERİ A.Ş.',
    iban: 'TR90 0001 0000 0005 6789 0123 45',
    rawIban: 'TR900001000000056789012345',
    fastEmail: 'fatura@relaxax.com',
    branch: 'Kadıköy Şubesi (Kod: 110) / 3216549'
  },
  qnb: {
    name: 'QNB Finansbank',
    holder: 'RELAXAX TEMİZLİK VE HİJYEN TEKNOLOJİLERİ A.Ş.',
    iban: 'TR01 0011 1000 0006 7890 1234 56',
    rawIban: 'TR010011100000067890123456',
    fastEmail: 'fatura@relaxax.com',
    branch: 'Feneryolu Şubesi (Kod: 412) / 8529631'
  }
};

const POLISH_BANKS = {
  blik: {
    name: 'BLIK / Płatność Telefonem',
    holder: 'RELAXAX POLSKA SP. Z O.O.',
    iban: '+48 546 647 900 (BLIK Telefon)',
    rawIban: '+48546647900',
    fastEmail: 'faktury@relaxax.com',
    branch: 'Warszawa Centrum / Natychmiastowy Przelew BLIK'
  },
  pko: {
    name: 'PKO Bank Polski',
    holder: 'RELAXAX POLSKA SP. Z O.O.',
    iban: 'PL 42 1020 1013 0000 0002 0001 2345',
    rawIban: 'PL42102010130000000200012345',
    fastEmail: 'faktury@relaxax.com',
    branch: 'Oddział 1 w Warszawie (Śródmieście)'
  },
  mbank: {
    name: 'mBank',
    holder: 'RELAXAX POLSKA SP. Z O.O.',
    iban: 'PL 11 1140 1010 0000 0001 2345 6789',
    rawIban: 'PL11114010100000000123456789',
    fastEmail: 'faktury@relaxax.com',
    branch: 'Centrum Korporacyjne Warszawa'
  },
  santander: {
    name: 'Santander Bank Polska',
    holder: 'RELAXAX POLSKA SP. Z O.O.',
    iban: 'PL 88 1090 1014 0000 0001 2345 6789',
    rawIban: 'PL88109010140000000123456789',
    fastEmail: 'faktury@relaxax.com',
    branch: 'Oddział Warszawa Mokotów'
  },
  ing: {
    name: 'ING Bank Śląski',
    holder: 'RELAXAX POLSKA SP. Z O.O.',
    iban: 'PL 22 1050 1012 1000 0022 1234 5678',
    rawIban: 'PL22105010121000002212345678',
    fastEmail: 'faktury@relaxax.com',
    branch: 'Warszawa Wola'
  },
  millennium: {
    name: 'Bank Millennium',
    holder: 'RELAXAX POLSKA SP. Z O.O.',
    iban: 'PL 55 1160 2202 0000 0002 1234 5678',
    rawIban: 'PL55116022020000000212345678',
    fastEmail: 'faktury@relaxax.com',
    branch: 'Warszawa Ursynów'
  }
};

let currentSelectedBank = 'garanti';

function updateSelectedBankDisplay(bankKey) {
  const isPl = STATE.language === 'pl' || (STATE.city && String(STATE.city).toLowerCase().includes('warsz')) || (STATE.calculator?.city && String(STATE.calculator.city).toLowerCase().includes('warsz'));
  const bankSet = isPl ? POLISH_BANKS : TURKISH_BANKS;
  const defaultKey = isPl ? 'blik' : 'garanti';
  const bank = bankSet[bankKey] || bankSet[defaultKey] || (isPl ? POLISH_BANKS.blik : TURKISH_BANKS.garanti);
  currentSelectedBank = bankKey || defaultKey;

  const bActiveBankName = document.getElementById('bActiveBankName');
  const bAccountHolder = document.getElementById('bAccountHolder');
  const bIbanDisplay = document.getElementById('bIbanDisplay');
  const bFastEmail = document.getElementById('bFastEmail');
  const bBranchNo = document.getElementById('bBranchNo');
  const btnCopyIbanMain = document.getElementById('btnCopyIbanMain');
  const btnCopyHolder = document.getElementById('btnCopyHolder');

  if (bActiveBankName) bActiveBankName.textContent = bank.name;
  if (bAccountHolder) bAccountHolder.textContent = bank.holder;
  if (bIbanDisplay) bIbanDisplay.textContent = bank.iban;
  if (bFastEmail) bFastEmail.textContent = bank.fastEmail;
  if (bBranchNo) bBranchNo.textContent = bank.branch;
  if (btnCopyIbanMain) btnCopyIbanMain.dataset.iban = bank.rawIban;
  if (btnCopyHolder) btnCopyHolder.dataset.copy = bank.holder;
}

function refreshBankSelector(targetLang) {
  const lang = targetLang || STATE.language || 'tr';
  const isPl = lang === 'pl' || (STATE.selectedCity && String(STATE.selectedCity).toLowerCase().includes('warsz'));
  const bankTabsContainer = document.querySelector('.bank-selector-tabs');
  if (!bankTabsContainer) return;

  if (isPl) {
    bankTabsContainer.innerHTML = `
      <button type="button" class="bank-pill-btn active" data-bank="blik">⚡ BLIK / Tel</button>
      <button type="button" class="bank-pill-btn" data-bank="pko">PKO Bank Polski</button>
      <button type="button" class="bank-pill-btn" data-bank="mbank">mBank</button>
      <button type="button" class="bank-pill-btn" data-bank="santander">Santander</button>
      <button type="button" class="bank-pill-btn" data-bank="ing">ING Bank</button>
      <button type="button" class="bank-pill-btn" data-bank="millennium">Millennium</button>
    `;
    updateSelectedBankDisplay('blik');
  } else {
    bankTabsContainer.innerHTML = `
      <button type="button" class="bank-pill-btn active" data-bank="garanti">Garanti BBVA</button>
      <button type="button" class="bank-pill-btn" data-bank="isbank">İş Bankası</button>
      <button type="button" class="bank-pill-btn" data-bank="yapikredi">Yapı Kredi</button>
      <button type="button" class="bank-pill-btn" data-bank="akbank">Akbank</button>
      <button type="button" class="bank-pill-btn" data-bank="ziraat">Ziraat Bankası</button>
      <button type="button" class="bank-pill-btn" data-bank="qnb">QNB Finansbank</button>
    `;
    updateSelectedBankDisplay('garanti');
  }

  const pills = bankTabsContainer.querySelectorAll('.bank-pill-btn');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const bankKey = pill.dataset.bank || (isPl ? 'blik' : 'garanti');
      updateSelectedBankDisplay(bankKey);
      if (typeof window.playTickSound === 'function') window.playTickSound();
    });
  });
}
window.refreshBankSelector = refreshBankSelector;
window.updateSelectedBankDisplay = updateSelectedBankDisplay;

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

  // Booking Header & Wizard Step Indicators
  const bBadge = document.querySelector('.booking-section-header .b-badge');
  const bTitle = document.querySelector('.booking-section-header .b-sec-main-title');
  const bSub = document.querySelector('.booking-section-header .b-sec-main-sub');

  if (bBadge) bBadge.textContent = lang === 'pl' ? 'SZYBKIE ZAMÓWIENIE' : 'HIZLI SİPARİŞİ OLUŞTURUN';
  if (bTitle) bTitle.textContent = lang === 'pl' ? 'KALKULATOR SPRZĄTANIA DLA DOMU I FIRMY' : 'EVİNİZ / DAİRENİZ İÇİN TEMİZLİK HESAPLAYICI';
  if (bSub) bSub.textContent = lang === 'pl' ? 'Nienaganna higiena, profesjonalny sprzęt. Oblicz cenę na żywo i zarezerwuj w kilka minut.' : 'Kusursuz hijyen, profesyonel ekipman. RELAXAX ile dakikalar içinde canlı fiyat hesaplayın ve rezervasyon yapın.';

  const sInd1 = document.querySelector('#stepIndicator1 .w-step-text');
  const sInd2 = document.querySelector('#stepIndicator2 .w-step-text');
  const sInd3 = document.querySelector('#stepIndicator3 .w-step-text');

  if (sInd1) sInd1.textContent = lang === 'pl' ? 'Mieszkanie i Częstotliwość' : 'Daire & Sıklık';
  if (sInd2) sInd2.textContent = lang === 'pl' ? 'Usługi Dodatkowe' : 'Ek Hizmetler';
  if (sInd3) sInd3.textContent = lang === 'pl' ? 'Adres i Termin' : 'Adres & Randevu';

  // 1. Customer Type Buttons
  const tabPersonBtn = document.getElementById('tabPersonBtn');
  const tabBusinessBtn = document.getElementById('tabBusinessBtn');
  if (tabPersonBtn) tabPersonBtn.innerHTML = lang === 'pl' ? '👤 Osoba prywatna' : '👤 Bireysel';
  if (tabBusinessBtn) tabBusinessBtn.innerHTML = lang === 'pl' ? '🏢 Firma / Biuro' : '🏢 Kurumsal';

  // 2. Section Titles
  const aptTitle = document.getElementById('wizardApartmentSecTitle');
  if (aptTitle) {
    const isBiz = tabBusinessBtn?.classList.contains('active');
    aptTitle.textContent = lang === 'pl' 
      ? (isBiz ? 'BIURO / FIRMA' : 'TWÓJ APARTAMENT') 
      : (isBiz ? 'İŞLETME / OFİSİNİZ' : 'DAİRENİZ');
  }

  const helpBtn = document.getElementById('btnHelpModalOpen');
  if (helpBtn) {
    const isBiz = tabBusinessBtn?.classList.contains('active');
    helpBtn.textContent = lang === 'pl' 
      ? (isBiz ? '❓ Co obejmuje sprzątanie biura?' : '❓ Co obejmuje sprzątanie mieszkania?') 
      : (isBiz ? '❓ Ofis temizliğine neler dahildir?' : '❓ Daire temizliğine neler dahildir?');
  }

  // Counter labels
  const roomCounterLbl = document.querySelector('#btnMinusRoom + .counter-val-wrap .counter-lbl');
  const bathCounterLbl = document.querySelector('#btnMinusBath + .counter-val-wrap .counter-lbl');
  if (roomCounterLbl) roomCounterLbl.textContent = lang === 'pl' ? 'pokój' : 'oda';
  if (bathCounterLbl) bathCounterLbl.textContent = lang === 'pl' ? 'łazienka' : 'banyo';

  // Kitchen & Villa labels
  const kitchenSpans = document.querySelectorAll('.wizard-kitchen-row .check-txt');
  const orDivider = document.querySelector('.wizard-kitchen-row .or-divider');
  if (kitchenSpans.length >= 2) {
    kitchenSpans[0].textContent = lang === 'pl' ? 'Kuchnia' : 'Mutfak';
    kitchenSpans[1].textContent = lang === 'pl' ? 'Mały aneks (-10 PLN / -100 TL)' : 'Küçük mutfak (-100 TL)';
  }
  if (orDivider) orDivider.textContent = lang === 'pl' ? 'Lub' : 'Veya';
  const villaSpan = document.querySelector('.villa-check-item .check-txt');
  if (villaSpan) villaSpan.textContent = lang === 'pl' ? '🏡 Dom jednorodzinny / Willa (+20%)' : '🏡 Müstakil ev (+%20)';

  const helperNote = document.querySelector('.wizard-helper-note');
  if (helperNote) {
    helperNote.textContent = lang === 'pl'
      ? '* Kompleksowe sprzątanie całego mieszkania, w tym kuchni, toalety i łazienki'
      : '* Mutfak, tuvalet ve banyo dahil olmak üzere dairenin tamamının kapsamlı temizliği';
  }

  const trustItems = document.querySelectorAll('.wizard-trust-strip .w-trust-info');
  if (trustItems.length >= 3) {
    if (lang === 'pl') {
      const s0 = trustItems[0].querySelector('strong'); if (s0) s0.textContent = '100% Gwarancja Satysfakcji';
      const p0 = trustItems[0].querySelector('span'); if (p0) p0.textContent = 'Bezpłatne ponowne sprzątanie w razie uwag';
      const s1 = trustItems[1].querySelector('strong'); if (s1) s1.textContent = 'Zweryfikowany i Ubezpieczony Zespół';
      const p1 = trustItems[1].querySelector('span'); if (p1) p1.textContent = 'Certyfikowani specjaliści bez nałogów';
      const s2 = trustItems[2].querySelector('strong'); if (s2) s2.textContent = 'Bezpłatne Anulowanie';
      const p2 = trustItems[2].querySelector('span'); if (p2) p2.textContent = 'Bezkosztowa rezygnacja do 24h przed';
    } else {
      const s0 = trustItems[0].querySelector('strong'); if (s0) s0.textContent = '%100 Memnuniyet Garantisi';
      const p0 = trustItems[0].querySelector('span'); if (p0) p0.textContent = 'Beğenmezseniz ücretsiz tekrar temizlik';
      const s1 = trustItems[1].querySelector('strong'); if (s1) s1.textContent = 'Onaylı & Sigortalı Ekip';
      const p1 = trustItems[1].querySelector('span'); if (p1) p1.textContent = 'Adli sicil teyitli uzman personel';
      const s2 = trustItems[2].querySelector('strong'); if (s2) s2.textContent = 'Ücretsiz İptal';
      const p2 = trustItems[2].querySelector('span'); if (p2) p2.textContent = '24 saat öncesine kadar koşulsuz iptal';
    }
  }

  // 3. Frequency Section
  const freqCenterTitle = document.querySelector('.wizard-sec-title-center');
  const freqSubCenter = document.querySelector('.wizard-sec-sub-center');
  if (freqCenterTitle) {
    freqCenterTitle.innerHTML = lang === 'pl'
      ? 'Częstsze sprzątanie - <span class="blue-txt">większy rabat</span>'
      : 'Daha sık temizlik - <span class="blue-txt">daha büyük indirim</span>';
  }
  if (freqSubCenter) {
    freqSubCenter.textContent = lang === 'pl'
      ? 'Możesz anulować lub przenieść subskrypcję w dowolnym momencie.'
      : 'Aboneliğinizi istediğiniz zaman iptal edebilir veya başka birine aktarabilirsiniz.';
  }

  // Freq Card names
  const fWeekly = document.querySelector('.wizard-freq-card[data-freq="haftalik"] .freq-name');
  const fBiweekly = document.querySelector('.wizard-freq-card[data-freq="ikahaftada"] .freq-name');
  const fMonthly = document.querySelector('.wizard-freq-card[data-freq="aylik"] .freq-name');
  const fOnce = document.querySelector('.wizard-freq-card[data-freq="tekseferlik"] .freq-name');
  if (fWeekly) fWeekly.textContent = lang === 'pl' ? 'Raz w tygodniu' : 'Haftada bir';
  if (fBiweekly) fBiweekly.textContent = lang === 'pl' ? 'Co dwa tygodnie' : 'İki haftada bir';
  if (fMonthly) fMonthly.textContent = lang === 'pl' ? 'Raz w miesiącu' : 'Ayda bir kez';
  if (fOnce) fOnce.textContent = lang === 'pl' ? 'Jednorazowe sprzątanie' : 'Tek seferlik temizlik';

  // 4. Extras Section Header
  const extrasHeader = document.querySelector('.wizard-extras-grid')?.previousElementSibling;
  if (extrasHeader && extrasHeader.classList.contains('wizard-sec-title')) {
    extrasHeader.textContent = lang === 'pl' ? 'USŁUGI DODATKOWE' : 'EK HİZMETLER';
  }

  // Extra service card titles & badges
  const extraCardMapPL = {
    butik_hediye_kutusu: { name: 'Zestaw Prezentowy Rose Elegance', badge: '59,00 PLN' },
    firin: { name: 'Czyszczenie piekarnika', badge: '49,00 PLN' },
    davlumbaz: { name: 'Czyszczenie okapu kuchennego', badge: '39,00 PLN' },
    mutfak_dolabi: { name: 'Wnętrze szafek kuchennych', badge: '59,00 PLN' },
    bulasik: { name: 'Zmywanie naczyń', badge: '30,00 PLN' },
    buzdolabi: { name: 'Czyszczenie lodówki', badge: '45,00 PLN' },
    mikrodalga: { name: 'Czyszczenie mikrofalówki', badge: '25,00 PLN' },
    balkon: { name: 'Mycie balkonu / tarasu', badge: '45,00 PLN' },
    pencere: { name: 'Mycie okien', badge: '39,00 PLN' },
    utu: { name: 'Prasowanie', badge: '49,00 PLN/godz' },
    koltuk_yikama: { name: 'Pranie kanapy / tapicerki', badge: '89,00 PLN' },
    yatak_mite: { name: 'Antyalergiczne odkurzanie materaca', badge: '69,00 PLN' },
    gardrop: { name: 'Porządkowanie szafy', badge: '45,00 PLN' },
    bulasik_makinesi: { name: 'Czyszczenie zmywarki', badge: '39,00 PLN' },
    cam_balkon: { name: 'Szklane balustrady i szyny', badge: '35,00 PLN' },
    duvar_silimi: { name: 'Mycie ścian i fug', badge: '65,00 PLN' },
    kedi_kabi: { name: 'Czyszczenie i dezynfekcja kuwety', badge: '25,00 PLN' },
    kamerali_temizlik: { name: 'Sprzątanie z nagraniem kamerą (Bodycam)', badge: '59,00 PLN' },
    guvenli_temizlik: { name: 'Bezpieczne i ubezpieczone sprzątanie', badge: '45,00 PLN' },
    ek_saat: { name: 'Dodatkowe godziny', badge: '45,00 PLN/godz' },
    supurge: { name: 'Profesjonalny odkurzacz HEPA', badge: '35,00 PLN' }
  };

  const extraCardMapTR = {
    butik_hediye_kutusu: { name: 'Rose Elegance Butik Çiçek & Hediye Kutusu', badge: '490 TL' },
    firin: { name: 'Fırın İçi Yağ Çözücü Temizlik', badge: '350 TL' },
    davlumbaz: { name: 'Davlumbaz & Filtre Yağ Arındırma', badge: '350 TL' },
    mutfak_dolabi: { name: 'Mutfak Dolapları İçi Temizlik', badge: '500 TL' },
    bulasik: { name: 'Bulaşık Yıkama & Dizme', badge: '250 TL' },
    buzdolabi: { name: 'Buzdolabı İçi Hijyen & Koku Giderme', badge: '350 TL' },
    mikrodalga: { name: 'Mikrodalga Fırın Yıkama', badge: '200 TL' },
    balkon: { name: 'Balkon / Teras Derin Yıkama', badge: '350 TL' },
    pencere: { name: 'Pencere & Çerçeve Silimi', badge: '300 TL' },
    utu: { name: 'Ütüleme Hizmeti', badge: '400 TL/saat' },
    koltuk_yikama: { name: 'Koltuk & Kanepe Buharlı Yıkama', badge: '650 TL' },
    yatak_mite: { name: 'Yatak / Baza Anti-Alerjen Vakumu', badge: '450 TL' },
    gardrop: { name: 'Gardırop İçi Düzenleme & Katlama', badge: '350 TL' },
    bulasik_makinesi: { name: 'Bulaşık Makinesi Filtre & Kireç Bakımı', badge: '300 TL' },
    cam_balkon: { name: 'Cam Balkon Korkulukları & Raylar', badge: '300 TL' },
    duvar_silimi: { name: 'Duvar Silimi & Derz Parlatma', badge: '550 TL' },
    kedi_kabi: { name: 'Evcil Hayvan Alanı Dezenfeksiyonu', badge: '200 TL' },
    kamerali_temizlik: { name: 'Kameralı Güvence (Bodycam Kaydı)', badge: '450 TL' },
    guvenli_temizlik: { name: 'Güvenli & Sigortalı Ekip Temini', badge: '350 TL' },
    ek_saat: { name: 'İlave Çalışma Süresi (Ek Saat)', badge: '350 TL/saat' },
    supurge: { name: 'Profesyonel Elektrikli Süpürge & HEPA', badge: '300 TL' }
  };

  Object.keys(extraCardMapPL).forEach(key => {
    const card = document.querySelector(`.wizard-extra-card[data-extra="${key}"]`);
    if (card) {
      const nameEl = card.querySelector('.w-extra-name');
      const badgeEl = card.querySelector('.w-extra-badge');
      const data = lang === 'pl' ? extraCardMapPL[key] : extraCardMapTR[key];
      if (nameEl) nameEl.textContent = data.name;
      if (badgeEl) {
        const oldPriceVal = lang === 'pl' ? card.dataset.priceOldPl : card.dataset.priceOldTr;
        const oldCurrency = lang === 'pl' ? ' PLN' : ' TL';
        const oldSpan = oldPriceVal ? `<span class="w-old-price">${oldPriceVal}${oldCurrency}</span>` : '';
        badgeEl.innerHTML = `${data.badge} ${oldSpan}`;
      }
    }
  });

  // Vacuum Banner text & badge
  const vTextWrap = document.querySelector('.v-text-wrap');
  const vBadge = document.querySelector('.v-badge');
  if (vBadge) {
    vBadge.textContent = lang === 'pl' ? '35,00 PLN' : '300 TL';
  }
  if (vTextWrap) {
    if (lang === 'pl') {
      vTextWrap.innerHTML = '<strong>Na miejscu wymagany jest odkurzacz.</strong><span>Przywieziemy ze sobą odkurzacz ręczny do sprzątania.</span>';
    } else {
      vTextWrap.innerHTML = '<strong>Siparişte elektrikli süpürge bulunması gerekmektedir.</strong><span>Temizlik için el tipi bir elektrikli süpürge getireceğiz.</span>';
    }
  }

  // 5. Address Card Headers & Inputs
  const dateShortcutToday = document.getElementById('btnDateToday');
  const dateShortcutTomorrow = document.getElementById('btnDateTomorrow');
  const dateShortcutWeekend = document.getElementById('btnDateWeekend');
  if (dateShortcutToday) dateShortcutToday.textContent = lang === 'pl' ? '📅 Dzisiaj' : '📅 Bugün';
  if (dateShortcutTomorrow) dateShortcutTomorrow.textContent = lang === 'pl' ? '📅 Jutro' : '📅 Yarın';
  if (dateShortcutWeekend) dateShortcutWeekend.textContent = lang === 'pl' ? '📅 Weekend' : '📅 Hafta Sonu';

  // Payment Banner text
  const payBannerTextWrap = document.getElementById('payBannerTextWrap');
  if (payBannerTextWrap) {
    if (lang === 'pl') {
      payBannerTextWrap.innerHTML = '<strong style="display: block; font-size: 0.92rem; color: #4ade80; margin-bottom: 2px;">Płatność gotówką na miejscu (Po wykonaniu)</strong><span style="display: block; font-size: 0.78rem; color: #94a3b8; line-height: 1.3;">Płacisz dopiero po zakończeniu sprzątania, gdy jesteś w 100% zadowolony.</span>';
    } else {
      payBannerTextWrap.innerHTML = '<strong style="display: block; font-size: 0.92rem; color: #4ade80; margin-bottom: 2px;">Kapıda Nakit Ödeme (Hizmet Sonrası)</strong><span style="display: block; font-size: 0.78rem; color: #94a3b8; line-height: 1.3;">Temizliğiniz eksiksiz tamamlanıp %100 memnun kaldıktan sonra ödemenizi adreste nakit olarak yapabilirsiniz.</span>';
    }
  }

  // Submit Button text
  const submitBtnSpan = document.querySelector('#btnSubmitBooking span');
  if (submitBtnSpan) submitBtnSpan.textContent = lang === 'pl' ? 'Zamawiam sprzątanie ➔' : 'Sipariş veriyorum';

  // Translate ilaclama service selection card headers & tags dynamically
  const cardIlaclama = document.querySelector('[data-service="ilaclama"]');
  if (cardIlaclama) {
    const h4 = cardIlaclama.querySelector('h4');
    const p = cardIlaclama.querySelector('.service-select-info p, .service-text p');
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
  const cardInsaat = document.querySelector('[data-service="insaat_sonrasi"]');
  if (cardInsaat) {
    const h4 = cardInsaat.querySelector('h4');
    const p = cardInsaat.querySelector('.service-select-info p, .service-text p');
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
  const cardTasinma = document.querySelector('[data-service="tasinma_sonrasi"]');
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
    // Wizard Header & Tabs Translations
    const topBadges = document.querySelectorAll('.b-badge, .wizard-top-badge, .cinema-modal-badge');
    topBadges.forEach(b => {
      b.textContent = lang === 'en' ? 'FAST ORDER CHECKOUT' : (lang === 'pl' ? 'SZYBKA REZERWACJA' : (lang === 'uk' ? 'ШВИДКЕ ОФОРМЛЕННЯ' : 'HIZLI SİPARİŞİ OLUŞTURUN'));
    });

    const mainBookingTitles = document.querySelectorAll('.b-sec-main-title, .wizard-main-title, .cinema-modal-title');
    mainBookingTitles.forEach(t => {
      t.textContent = lang === 'en' ? 'CLEANING ESTIMATE & BOOKING FOR YOUR HOME' : (lang === 'pl' ? 'KALKULATOR SPRZĄTANIA DLA TWOJEGO DOMU' : (lang === 'uk' ? 'КАЛЬКУЛЯТОР ПРИБИРАННЯ ДЛЯ ВАШОГО ДОМУ' : 'EVİNİZ / DAİRENİZ İÇİN TEMİZLİK HESAPLAYICI'));
    });

    const mainBookingSubs = document.querySelectorAll('.b-sec-main-sub, .wizard-main-sub, .cinema-modal-subtitle');
    mainBookingSubs.forEach(s => {
      s.textContent = lang === 'en' ? 'Flawless hygiene, expert equipment. Calculate your live price and book online in minutes.' : (lang === 'pl' ? 'Nienaganna higiena, profesjonalny sprzęt. Oblicz cenę na żywo i zarezerwuj w kilka minut.' : (lang === 'uk' ? 'Бездоганна гігієна, професійне обладнання. Розрахуйте ціну онлайн та забронюйте за лічені хвилини.' : 'Kusursuz hijyen, profesyonel ekipman. RELAXAX ile dakikalar içinde canlı fiyat hesaplayın ve rezervasyon yapın.'));
    });

    const soundTexts = document.querySelectorAll('.sound-text, #bookingSoundToggleBtn .sound-text, #wizardSoundToggleBtn .sound-text');
    soundTexts.forEach(st => {
      st.textContent = lang === 'en' ? 'Sound: On' : (lang === 'pl' ? 'Dźwięk: Włączony' : (lang === 'uk' ? 'Звук: Увімкнено' : 'Ses: Açık'));
    });

    const step1Text = document.querySelector('#stepIndicator1 .w-step-text, #stepTab1 .w-step-text');
    const step2Text = document.querySelector('#stepIndicator2 .w-step-text, #stepTab2 .w-step-text');
    const step3Text = document.querySelector('#stepIndicator3 .w-step-text, #stepTab3 .w-step-text');
    if (step1Text) step1Text.textContent = lang === 'en' ? 'Apartment & Frequency' : (lang === 'pl' ? 'Mieszkanie i Częstotliwość' : (lang === 'uk' ? 'Квартира та Періодичність' : 'Daire & Sıklık'));
    if (step2Text) step2Text.textContent = lang === 'en' ? 'Extra Services' : (lang === 'pl' ? 'Usługi Dodatkowe' : (lang === 'uk' ? 'Додаткові Послуги' : 'Ek Hizmetler'));
    if (step3Text) step3Text.textContent = lang === 'en' ? 'Address & Appointment' : (lang === 'pl' ? 'Adres i Termin' : (lang === 'uk' ? 'Адреса та Дата' : 'Adres & Randevu'));

    const tabPersonBtn = document.getElementById('tabPersonBtn');
    const tabBusinessBtn = document.getElementById('tabBusinessBtn');
    if (tabPersonBtn) tabPersonBtn.textContent = lang === 'en' ? '👤 Individual Customer' : (lang === 'pl' ? '👤 Klient Indywidualny' : (lang === 'uk' ? '👤 Фізична Особа' : '👤 Bireysel Müşteri'));
    if (tabBusinessBtn) tabBusinessBtn.textContent = lang === 'en' ? '🏢 Corporate / Business' : (lang === 'pl' ? '🏢 Firma / Przedsiębiorstwo' : (lang === 'uk' ? '🏢 Юридична Особа' : '🏢 Kurumsal / İşletme'));

    // Section 1: Service Presets
    const s1Title = document.querySelector('#wizardStep1Section .wizard-sec-title');
    const s1Badge = document.querySelector('#wizardStep1Section .wizard-badge-soft');
    if (s1Title) s1Title.textContent = lang === 'en' ? '✨ SELECT SERVICE TYPE' : (lang === 'pl' ? '✨ WYBIERZ RODZAJ USŁUGI' : (lang === 'uk' ? '✨ ОБЕРІТЬ ТИП ПОСЛУГИ' : '✨ HİZMET TÜRÜNÜZÜ SEÇİN'));
    if (s1Badge) s1Badge.textContent = lang === 'en' ? 'EXPERT STAFF' : (lang === 'pl' ? 'ZESPÓŁ EKSPERTÓW' : (lang === 'uk' ? 'КОМАНДА ЕКСПЕРТІВ' : 'UZMAN EKİP KADROSU'));

    const presetCards = {
      standart: {
        en: ['Standard Home Cleaning', 'Routine periodic hygiene & surface care'],
        pl: ['Standardowe Sprzątanie Mieszkania', 'Rutynowe okresowe sprzątanie i pielęgnacja'],
        uk: ['Стандартне Прибирання Квартири', 'Регулярна періодична гігієна поверхонь'],
        tr: ['Standart Ev Temizliği', 'Rutin periyodik hijyen & yüzey bakımı']
      },
      detayli: {
        en: ['Deep / Spring Cleaning', 'Deep steam purification & corner detailing'],
        pl: ['Głębokie / Wiosenne Sprzątanie', 'Głębokie oczyszczanie parowe i zakamarki'],
        uk: ['Генеральне / Весняне Прибирання', 'Глибока парова дезінфекція та важкодоступні місця'],
        tr: ['Detaylı / Bahar Temizliği', 'Dip köşe derinlemesine buharlı arındırma']
      },
      tasinma: {
        en: ['Move-in / Move-out Cleaning', 'Turnkey spotless pre/post move hygiene'],
        pl: ['Sprzątanie po/przed Przeprowadzką', 'Kompleksowa higiena przed lub po wyprowadzce'],
        uk: ['Прибирання до/після Переїзду', 'Комплексна підготовка житла до або після переїзду'],
        tr: ['Taşınma / Boş Ev Temizliği', 'Anahtar teslim taşınma öncesi/sonrası hijyen']
      },
      insaat: {
        en: ['Post-Construction / Renovation', 'Fine dust, plaster, paint & debris removal'],
        pl: ['Sprzątanie po Remoncie / Budowie', 'Usuwanie pyłu budowlanego, farby i gipsu'],
        uk: ['Прибирання після Ремонту / Будівництва', 'Видалення будівельного пилу, фарби та залишків розчину'],
        tr: ['İnşaat / Tadilat Sonrası', 'Boya, alçı, harç ve ince toz giderme']
      }
    };

    Object.entries(presetCards).forEach(([presetKey, texts]) => {
      const card = document.querySelector(`.wizard-service-preset-card[data-service-preset="${presetKey}"]`);
      if (card) {
        const str = card.querySelector('strong');
        const sp = card.querySelector('span');
        const t = texts[lang] || texts.tr;
        if (str) str.textContent = t[0];
        if (sp) sp.textContent = t[1];
      }
    });

    const aptSecTitle = document.getElementById('wizardApartmentSecTitle');
    const helpModalBtn = document.getElementById('btnHelpModalOpen');
    if (aptSecTitle) aptSecTitle.textContent = lang === 'en' ? '🏡 SPACE DETAILS & ROOM COUNT' : (lang === 'pl' ? '🏡 SZCZEGÓŁY LOKALU I LICZBA POKOI' : (lang === 'uk' ? '🏡 ІНФОРМАЦІЯ ПРО ПРИМІЩЕННЯ' : '🏡 MEKAN BİLGİLERİ VE ODA SAYISI'));
    if (helpModalBtn) helpModalBtn.textContent = lang === 'en' ? '❓ What is included in cleaning?' : (lang === 'pl' ? '❓ Co obejmuje sprzątanie?' : (lang === 'uk' ? '❓ Що входить у прибирання?' : '❓ Temizliğe neler dahildir?'));

    // Section 2
    const s2Title = document.querySelector('#wizardStep2Section .wizard-sec-title');
    const s2Badge = document.querySelector('#wizardStep2Section .wizard-badge-soft');
    if (s2Title) s2Title.textContent = lang === 'en' ? '✨ EXTRA HYGIENE & SPECIAL SERVICES' : (lang === 'pl' ? '✨ DODATKOWA HIGIENA I USŁUGI SPECJALNE' : (lang === 'uk' ? '✨ ДОДАТКОВА ГІГІЄНА ТА СПЕЦІАЛЬНІ ПОСЛУГИ' : '✨ EKSTRA HİJYEN VE ÖZEL HİZMETLER'));
    if (s2Badge) s2Badge.textContent = lang === 'en' ? 'DEEP CORNER CARE' : (lang === 'pl' ? 'GŁĘBOKA PIELĘGNACJA' : (lang === 'uk' ? 'ГЛИБОКЕ ОЧИЩЕННЯ' : 'DİP KÖŞE DERİN BAKIM'));

    // Section 3
    const s3Title = document.querySelector('#wizardStep3Section .wizard-sec-title');
    const s3Badge = document.querySelector('#wizardStep3Section .wizard-badge-soft');
    if (s3Title) s3Title.textContent = lang === 'en' ? '📍 ADDRESS, APPOINTMENT & CONTACT DETAILS' : (lang === 'pl' ? '📍 ADRES, TERMIN I DANE KONTAKTOWE' : (lang === 'uk' ? '📍 АДРЕСА, ДАТА ТА КОНТАКТНІ ДАНІ' : '📍 ADRES, RANDEVU VE İLETİŞİM BİLGİLERİ'));
    if (s3Badge) s3Badge.textContent = lang === 'en' ? 'SECURE CONTACT' : (lang === 'pl' ? 'BEZPIECZNY KONTAKT' : (lang === 'uk' ? 'НАДІЙНИЙ ЗВ\'ЯЗОК' : 'GÜVENLİ İLETİŞİM'));

    // Sticky Checkout Bar
    const stickyPayLabel = document.querySelector('.sticky-checkout-price-info .sticky-pay-label, .wizard-price-checkout-box .p-label');
    const stickyOrderBtn = document.querySelector('#stickyCompleteOrderBtn, .sticky-checkout-btn');
    if (stickyPayLabel) stickyPayLabel.textContent = lang === 'en' ? 'Total to Pay:' : (lang === 'pl' ? 'Do zapłaty:' : (lang === 'uk' ? 'До сплати:' : 'Ödenecek Tutar:'));
    if (stickyOrderBtn) {
      stickyOrderBtn.innerHTML = `<span>${lang === 'en' ? 'Complete Order ➔' : (lang === 'pl' ? 'Złóż Zamówienie ➔' : (lang === 'uk' ? 'Завершити Замовлення ➔' : 'Siparişi Tamamla ➔'))}</span>`;
    }

    const mStickyLbl = document.querySelector('#mobileStickyBar .m-sticky-lbl');
    const mStickyBtn = document.querySelector('#mobileStickyBar .m-sticky-btn span');
    if (mStickyLbl) mStickyLbl.textContent = lang === 'en' ? 'Total to Pay:' : (lang === 'pl' ? 'Do zapłaty:' : (lang === 'uk' ? 'До сплати:' : 'Ödenecek Tutar:'));
    if (mStickyBtn) mStickyBtn.textContent = lang === 'en' ? 'Complete Order ➔' : (lang === 'pl' ? 'Złóż Zamówienie ➔' : (lang === 'uk' ? 'Завершити Замовлення ➔' : 'Siparişi Tamamla ➔'));

    const btnSubmitBookingSpan = document.querySelector('#btnSubmitBooking span');
    if (btnSubmitBookingSpan) btnSubmitBookingSpan.textContent = lang === 'en' ? 'Complete Order ➔' : (lang === 'pl' ? 'Złóż Zamówienie ➔' : (lang === 'uk' ? 'Завершити Замовлення ➔' : 'Siparişi Tamamla ➔'));

    const bookingSoundBtns = document.querySelectorAll('.sound-text');
    bookingSoundBtns.forEach(sBtn => {
      sBtn.textContent = lang === 'en' ? 'Sound: On' : (lang === 'pl' ? 'Dźwięk: Włączony' : (lang === 'uk' ? 'Звук: Увімкнено' : 'Ses: Açık'));
    });

    const quickPresetsLbl = document.querySelector('.wizard-quick-presets-row span, .quick-presets-label');
    if (quickPresetsLbl) quickPresetsLbl.textContent = lang === 'en' ? 'Quick Presets:' : (lang === 'pl' ? 'Szybki wybór:' : (lang === 'uk' ? 'Швидкий вибір:' : 'Hızlı Seçim:'));

    const vipGuarTitle = document.getElementById('lblVipGuarTitle');
    const vipGuarSub = document.getElementById('lblVipGuarSub');
    const vipEcoTitle = document.getElementById('lblVipEcoTitle');
    const vipEcoSub = document.getElementById('lblVipEcoSub');
    if (vipGuarTitle) vipGuarTitle.textContent = lang === 'en' ? '100% Satisfaction Guarantee' : (lang === 'pl' ? '100% Gwarancja Satysfakcji' : (lang === 'uk' ? '100% Гарантія Задоволення' : '%100 Memnuniyet Garantisi'));
    if (vipGuarSub) vipGuarSub.textContent = lang === 'en' ? 'Spotless hygiene or free redo' : (lang === 'pl' ? 'Nienaganna higiena lub bezpłatna poprawka' : (lang === 'uk' ? 'Бездоганна чистота або безкоштовне перероблення' : 'Kusursuz hijyen veya ücretsiz telafi'));
    if (vipEcoTitle) vipEcoTitle.textContent = lang === 'en' ? '100% Eco & Vegan Cleaning' : (lang === 'pl' ? '100% Ekologiczne i Wegańskie' : (lang === 'uk' ? '100% Екологічні та Веганські' : '%100 Ekolojik & Vegan Hijyen'));
    if (vipEcoSub) vipEcoSub.textContent = lang === 'en' ? 'Allergen-free professional products' : (lang === 'pl' ? 'Hipoalergiczne profesjonalne środki' : (lang === 'uk' ? 'Гіпоалергенні професійні засоби' : 'Alerjen içermeyen profesyonel solüsyonlar'));

    const radarFleetTitle = document.getElementById('radarFleetTitle');
    const radarFleetEta = document.getElementById('radarFleetEta');
    if (radarFleetTitle) radarFleetTitle.textContent = lang === 'en' ? '4 Specialist Teams on Duty in Your Area' : (lang === 'pl' ? '4 Zespoły Ekspertów na Służbie w Twojej Okolicy' : (lang === 'uk' ? '4 Бригади Експертів на Чергуванні у Вашому Районі' : 'Bölgenizde 4 Uzman Ekip Görevde'));
    if (radarFleetEta) radarFleetEta.textContent = lang === 'en' ? 'Estimated arrival: ~35 mins' : (lang === 'pl' ? 'Szacowany czas przybycia: ~35 min' : (lang === 'uk' ? 'Орієнтовний час прибуття: ~35 хв' : 'Ortalama varış süresi: ~35 dakika'));

    const inspectReportBtn = document.querySelector('#btnOpenQualityReportModal span:nth-child(2)');
    if (inspectReportBtn) inspectReportBtn.textContent = lang === 'en' ? 'Inspect 48-Point Digital Hygiene Checklist' : (lang === 'pl' ? 'Sprawdź 48-Punktowy Raport Higieniczny' : (lang === 'uk' ? 'Переглянути 48-Пунктовий Звіт Гігієни' : '48 Nokta Dijital Hijyen Raporunu İncele'));

    const floatingCtaTxt = document.getElementById('floatingCtaTxt');
    if (floatingCtaTxt) floatingCtaTxt.textContent = lang === 'en' ? 'Book Now ➔' : (lang === 'pl' ? 'Zamów Teraz ➔' : (lang === 'uk' ? 'Замовити Зараз ➔' : 'Hemen Sipariş Ver ➔'));

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

    // Boutique Catalog Strip & Drawer Translations
    const wbcsBadge = document.querySelector('.wbcs-badge');
    const wbcsTitle = document.querySelector('.wbcs-title');
    const wbcsSubtitle = document.querySelector('.wbcs-subtitle');
    const btnOpenBoutiqueCatalogSpan = document.querySelector('#btnOpenBoutiqueCatalog span');
    const bcdBadge = document.querySelector('.bcd-badge');
    const bcdTitle = document.getElementById('bcdTitle');
    const bcdSubtitle = document.querySelector('.bcd-subtitle');
    const bcdSumLabel = document.querySelector('.bcd-sum-label');
    const btnBcdFinishSpan = document.querySelector('#btnBcdFinish span');

    if (wbcsBadge) wbcsBadge.textContent = lang === 'pl' ? '✨ RELAXAX KOLEKCJA BUTIKOWA' : '✨ RELAXAX BUTİK KOLEKSİYON';
    if (wbcsTitle) wbcsTitle.textContent = lang === 'pl' ? '🛋️ Zobacz nasze butikowe świece i akcesoria domowe' : '🛋️ Butik Ev Eşyalarımıza & Mum Koleksiyonumuza Göz Atın';
    if (wbcsSubtitle) wbcsSubtitle.textContent = lang === 'pl' ? 'Dodaj ręcznie robione świece sojowe i bukiety piwonii do sprzątania.' : 'Temizlik hizmetinize özel el yapımı kokulu mumlar, şakayık buketleri ve aromaterapi setleri ekleyin.';
    if (btnOpenBoutiqueCatalogSpan) btnOpenBoutiqueCatalogSpan.textContent = lang === 'pl' ? '🛍️ Zobacz Katalog Produktów ➔' : '🛍️ Ürün Kataloğuna Göz At ➔';
    if (bcdBadge) bcdBadge.textContent = lang === 'pl' ? '✨ RELAXAX KOLEKCJA BUTIKOWA I PREZENTY' : '✨ RELAXAX BUTİK EV EŞYALARI & HEDİYELİK';
    if (bcdTitle) bcdTitle.textContent = lang === 'pl' ? '🛍️ Butikowy Katalog Świec i Dodatków' : '🛍️ Butik Ev Eşyaları & Mum Kataloğu';
    if (bcdSubtitle) bcdSubtitle.textContent = lang === 'pl' ? 'Dodaj unikalne produkty rzemieślnicze do swojego zamówienia jednym kliknięciem.' : 'Temizlik hizmetinize özel zanaatkar üretim ürünleri tek tıkla ekleyin.';
    if (bcdSumLabel) bcdSumLabel.textContent = lang === 'pl' ? 'Wybrane produkty butikowe:' : 'Seçilen Butik Ürünler:';
    if (btnBcdFinishSpan) btnBcdFinishSpan.textContent = lang === 'pl' ? '✓ Zapisz Wybór i Kontynuuj' : '✓ Seçimi Tamamla & Devam Et';

    // Translate frequency label & options
    const lblFrequency = document.getElementById('lblBookingLabelFrequency');
    if (lblFrequency && dict.bookingLabelFrequency) lblFrequency.textContent = dict.bookingLabelFrequency;
    const cFrequencySelect = document.getElementById('cFrequency');
    if (cFrequencySelect && cFrequencySelect.options && cFrequencySelect.options.length >= 3) {
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
    if (successOk) successOk.textContent = lang === 'pl' ? 'OK' : 'TAMAM';
    const resCodePrefix = document.getElementById('lblResCodePrefix');
    if (resCodePrefix) resCodePrefix.textContent = lang === 'pl' ? 'Kod rezerwacji:' : 'Rezervasyon Kodu:';
    const successWaBtn = document.querySelector('#btnSuccessWhatsApp span');
    if (successWaBtn) successWaBtn.textContent = lang === 'pl' ? '💬 Wyślij potwierdzenie WhatsApp' : '💬 WhatsApp Teyidi İlet';

    // Premium Wizard Fields & Placeholders Translations
    const translateLabel = (forAttr, enText, plText, trText) => {
      const label = bookingForm.querySelector(`label[for="${forAttr}"]`);
      if (label) label.textContent = lang === 'en' ? enText : (lang === 'pl' ? plText : trText);
    };
    const translatePlaceholder = (id, enText, plText, trText) => {
      const el = document.getElementById(id);
      if (el) el.placeholder = lang === 'en' ? enText : (lang === 'pl' ? plText : trText);
    };

    // City Dropdown label
    const cityLabel = bookingForm.querySelector('.wizard-city-dropdown-row label');
    if (cityLabel) cityLabel.textContent = lang === 'en' ? 'Select city:' : (lang === 'pl' ? 'Wybierz miasto:' : 'Şehir seçin:');

    // Wizard fields labels
    translateLabel('cStreet', 'Street / Avenue', 'Ulica / Aleja', 'Sokak / Cadde');
    translateLabel('cZip', 'Postal Code', 'Kod pocztowy', 'Posta Kodu');
    translateLabel('cHouseNum', 'House Number', 'Numer domu', 'Ev Numarası');
    translateLabel('cAptNum', 'Apartment Number *', 'Numer mieszkania *', 'Daire Numarası *');
    translateLabel('cBuilding', 'Building / Block', 'Budynek / Blok', 'Bina / Blok');
    translateLabel('cFloor', 'Floor', 'Piętro', 'Zemin / Kat');
    translateLabel('cIntercom', 'Intercom Code', 'Kod do domofonu', 'İnterkom / Diyafon Kodu');
    translateLabel('cName', 'Full Name *', 'Imię i nazwisko *', 'Ad Soyad *');
    translateLabel('cPhone', 'Phone Number *', 'Numer telefonu *', 'Telefon Numarası *');
    translateLabel('cEmail', 'E-mail Address *', 'Adres e-mail *', 'E-posta Adresi *');
    translateLabel('cDate', '🗓️ Select Cleaning Date', '🗓️ Wybierz datę sprzątania', '🗓️ Temizlik Tarihi Seçin');
    translateLabel('cTime', '🕒 Start Time', '🕒 Godzina rozpoczęcia', '🕒 Başlangıç Saati');
    translateLabel('cNotes', '📝 Special Instructions / Notes', '📝 Uwagi dla wykonawcy / instrukcje specjalne', '📝 Yüklenici İçin Notlar / Özel Talimatlar');

    // Placeholders
    translatePlaceholder('cStreet', 'E.g. Main Street 12', 'Np. Marszałkowska 12', 'Örn: Atatürk Cd. No:12');
    translatePlaceholder('cZip', '10001', '00-001', '34000');
    translatePlaceholder('cHouseNum', '12', '12', '12');
    translatePlaceholder('cAptNum', '4', '4', '4');
    translatePlaceholder('cBuilding', 'Block A', 'Blok A', 'A Blok');
    translatePlaceholder('cFloor', 'Floor 2', 'Piętro 2', '2. Kat');
    translatePlaceholder('cIntercom', '1234', '1234', '1234');
    translatePlaceholder('cName', 'John Doe', 'Jan Kowalski', 'Ahmet Yılmaz');
    translatePlaceholder('cPhone', '+1 555 123 4567', '+48 500 600 700', '0555 555 55 55');
    translatePlaceholder('cEmail', 'john.doe@email.com', 'jan.kowalski@email.com', 'ornek@email.com');
    translatePlaceholder('cNotes', 'E.g. keys with doorman, pet at home, please do not ring doorbell...', 'Np. klucze u dozorcy, jest kot, proszę nie dzwonić dzwonkiem...', 'Örn: Anahtar kapıcıda, evcil kedi var, lütfen zili çalmayın...');

    // Apt Num Hint
    const aptHint = bookingForm.querySelector('.w-field-hint');
    if (aptHint) {
      aptHint.textContent = lang === 'en'
        ? '* Order cannot be placed without apartment number'
        : (lang === 'pl' ? '* Bez numeru mieszkania zamówienie nie może zostać złożone' : '* Daire numarası olmadan sipariş verilemez');
    }

    // Corporate Invoice Fields Block
    const corpTitle = document.querySelector('#businessFieldsBlock h4');
    if (corpTitle) corpTitle.textContent = lang === 'en' ? '🏢 Corporate Invoice Details' : (lang === 'pl' ? '🏢 Dane do faktury firmowej' : '🏢 Kurumsal Fatura Bilgileri');
    translateLabel('cCompanyName', 'Company Name *', 'Nazwa firmy *', 'Firma / Şirket Unvanı *');
    translatePlaceholder('cCompanyName', 'E.g. ABC Corp.', 'Np. ABC Sp. z o.o.', 'Örn: ABC Teknoloji Ltd. Şti.');
    translateLabel('cTaxOffice', 'Tax Office *', 'Urząd skarbowy *', 'Vergi Dairesi *');
    translatePlaceholder('cTaxOffice', 'E.g. Tax Dept.', 'Np. US Warszawa', 'Örn: Kadıköy V.D.');
    translateLabel('cTaxNumber', 'Tax ID / VAT Number *', 'NIP / Numer podatkowy *', 'Vergi Numarası (VKN / T.C.) *');
    translatePlaceholder('cTaxNumber', '1234567890', '1234567890', '1234567890');
    translateLabel('cInvoiceEmail', 'E-Invoice Email', 'E-mail do faktury', 'E-Fatura E-postası');
    translatePlaceholder('cInvoiceEmail', 'invoice@company.com', 'faktura@firma.pl', 'fatura@sirket.com');

    // Staff Preferences section
    const lblStaffTitle = document.getElementById('lblStaffPrefTitle');
    const lblStaffSub = document.getElementById('lblStaffPrefSub');
    if (lblStaffTitle) lblStaffTitle.textContent = lang === 'en' ? '👥 STAFF PREFERENCES' : (lang === 'pl' ? '👥 PREFERENCJE PERSONELU' : '👥 EKİP VE EKİPMAN TERCİHİNİZ');
    if (lblStaffSub) {
      lblStaffSub.textContent = lang === 'en'
        ? 'You can choose gender preferences or team composition.'
        : (lang === 'pl' ? 'Możesz wybrać preferencje dotyczące płci lub składu zespołu.' : 'Hizmet verecek uzmanın cinsiyet veya ekip kadrosu tercihini seçebilirsiniz.');
    }

    // Staff preferences cards details
    const updatePrefCard = (id, enTitle, enDesc, plTitle, plDesc, trTitle, trDesc) => {
      const card = document.getElementById(id);
      if (card) {
        const titleEl = card.querySelector('.pref-title');
        const descEl = card.querySelector('.pref-desc');
        if (titleEl) titleEl.textContent = lang === 'en' ? enTitle : (lang === 'pl' ? plTitle : trTitle);
        if (descEl) descEl.textContent = lang === 'en' ? enDesc : (lang === 'pl' ? plDesc : trDesc);
      }
    };
    updatePrefCard('lblStaffPrefAny', 'Any / Best Available Team', 'Highest rated available specialist', 'Dowolny / Najlepszy zespół', 'Najwyżej oceniany dostępny specjalista', 'Fark Etmez / En Uygun Ekip', 'Müsait olan en yüksek puanlı uzman');
    updatePrefCard('lblStaffPrefFemale', 'Female Specialist', 'Female staff guarantee', 'Kobieta', 'Gwarancja kobiecego personelu', 'Bayan Temizlik Uzmanı', 'Kadın temizlik personeli garantisi');
    updatePrefCard('lblStaffPrefTeam', '2-Person Expert Team', 'Fast and thorough 2-person team', '2-osobowy zespół', 'Szybki i dokładny zespół dwuosobowy (+50 PLN / +350 TL)', '2 Kişilik Uzman Ekip', 'Hızlı ve detaylı ikili ekip (+350 TL)');

    // Payment header
    const lblPayTitle = document.getElementById('lblPaymentTitle');
    if (lblPayTitle) lblPayTitle.textContent = lang === 'en' ? '💵 PAYMENT GUARANTEE' : (lang === 'pl' ? '💵 GWARANCJA PŁATNOŚCI' : '💵 ÖDEME GÜVENCESİ');

    // Checkout labels
    const checkoutLabel = bookingForm.querySelector('.wizard-price-checkout-box .p-label');
    if (checkoutLabel) checkoutLabel.textContent = lang === 'en' ? 'Total to Pay:' : (lang === 'pl' ? 'Do zapłaty:' : 'Ödenecek tutar:');

    // Sidebar elements
    const promoPlaceholder = document.getElementById('cPromoCode');
    if (promoPlaceholder) promoPlaceholder.placeholder = lang === 'en' ? 'Promo / Referral code' : (lang === 'pl' ? 'Kod rabatowy / referencyjny' : 'İndirim / Referans Kodu');
    const promoBtn = document.getElementById('btnApplyPromo');
    if (promoBtn) promoBtn.textContent = lang === 'pl' ? 'Zastosuj' : 'Uygula';

    const guaranteeText = document.querySelector('.wizard-guarantee-box span:not(.g-icon)');
    if (guaranteeText) {
      guaranteeText.textContent = lang === 'pl'
        ? 'Nasi wykonawcy posiadają wszystkie niezbędne środki i sprzęt do sprzątania.'
        : 'Yüklenicilerimiz gerekli tüm temizlik ürünlerine ve ekipmanına sahiptir.';
    }

    const securityNote = document.querySelector('.wizard-security-note');
    if (securityNote) {
      securityNote.textContent = lang === 'pl'
        ? '🔒 Bezpieczna rezerwacja 24/7 & Potwierdzenie WhatsApp'
        : '🔒 7/24 Güvenli Rezervasyon & WhatsApp Teyitli';
    }

    const whatsappHelpBtn = document.querySelector('.wizard-whatsapp-help-btn');
    if (whatsappHelpBtn) {
      const span = whatsappHelpBtn.querySelector('span');
      if (span) {
        span.textContent = lang === 'pl'
          ? '💬 Wsparcie na żywo WhatsApp'
          : '💬 WhatsApp Canlı Destek Alın';
      }
      const helpMsg = lang === 'pl'
        ? 'Cześć RELAXAX, chciałbym uzyskać informacje na temat kalkulacji zamówienia na stronie.'
        : 'Merhaba RELAXAX, siteden sipariş hesaplama hakkında bilgi almak istiyorum.';
      whatsappHelpBtn.href = `https://wa.me/905466479004?text=${encodeURIComponent(helpMsg)}`;
    }

    // Bank Transfer Alert & Notice Boxes
    const transferAlertBox = document.querySelector('.transfer-alert-box .t-alert-txt');
    if (transferAlertBox) {
      transferAlertBox.innerHTML = lang === 'pl'
        ? '<strong>Wybrano przelew bankowy / BLIK: 5% rabatu naliczone!</strong><span>Możesz dokonać płatności 24/7 za pomocą numeru BLIK lub przelewu na konto. Potwierdzenie rezerwacji otrzymasz natychmiast.</span>'
        : '<strong>Havale / EFT / FAST Seçildi: %5 Anında İndirim Uygulandı!</strong><span>Ödemenizi dilediğiniz bankanın kurumsal hesabına 7/24 FAST ile yapabilirsiniz. Rezervasyon onayınız anında üretilecektir.</span>';
    }

    const transferNoticeBox = document.querySelector('.transfer-notice-box .t-notice-text');
    if (transferNoticeBox) {
      transferNoticeBox.innerHTML = lang === 'pl'
        ? '<strong>Tytuł przelewu / Opis:</strong><span>Wykonując przelew, w tytule wpisz <strong>Kod Rezerwacji</strong> (np. <code id="previewNoticeCode">#RLX-WARSZAWA</code>) lub <strong>Imię i Nazwisko</strong>.</span>'
        : '<strong>Havale / EFT Açıklaması:</strong><span>Transfer yaparken açıklama kısmına <strong>Rezervasyon Kodunuzu</strong> (Örn: <code id="previewNoticeCode">#RLX-TEMİZLİK</code>) veya <strong>Ad Soyadınızı</strong> yazmanız yeterlidir.</span>';
    }

    const cashBannerBox = document.querySelector('.cash-banner-box .c-banner-txt');
    if (cashBannerBox) {
      cashBannerBox.innerHTML = lang === 'pl'
        ? '<strong>Płatność po zakończeniu sprzątania z gwarancją 100% satysfakcji</strong><span>Nasz zespół zrealizuje usługę, a po Twojej akceptacji i sprawdzeniu czystości uregulujesz płatność <strong>Gotówką</strong> lub <strong>Kartą / Mobilnym POS</strong>.</span>'
        : '<strong>Hizmet Sonrası Memnuniyet Garantili Ödeme</strong><span>Ekibimiz temizlik hizmetinizi tamamladıktan ve siz evinizi detaylıca kontrol edip %100 memnun kaldıktan sonra ödemenizi kapıda <strong>Nakit</strong> veya <strong>Mobil POS Temassız Kart</strong> ile gerçekleştirebilirsiniz.</span>';
    }

    // Bank Selector Tabs Dynamic Generator
    const bankTabsContainer = document.querySelector('.bank-selector-tabs');
    if (bankTabsContainer) {
      if (lang === 'pl') {
        bankTabsContainer.innerHTML = `
          <button type="button" class="bank-pill-btn active" data-bank="blik">⚡ BLIK / Tel</button>
          <button type="button" class="bank-pill-btn" data-bank="pko">PKO Bank Polski</button>
          <button type="button" class="bank-pill-btn" data-bank="mbank">mBank</button>
          <button type="button" class="bank-pill-btn" data-bank="santander">Santander</button>
          <button type="button" class="bank-pill-btn" data-bank="ing">ING Bank</button>
          <button type="button" class="bank-pill-btn" data-bank="millennium">Millennium</button>
        `;
      } else {
        bankTabsContainer.innerHTML = `
          <button type="button" class="bank-pill-btn active" data-bank="garanti">Garanti BBVA</button>
          <button type="button" class="bank-pill-btn" data-bank="isbank">İş Bankası</button>
          <button type="button" class="bank-pill-btn" data-bank="yapikredi">Yapı Kredi</button>
          <button type="button" class="bank-pill-btn" data-bank="akbank">Akbank</button>
          <button type="button" class="bank-pill-btn" data-bank="ziraat">Ziraat Bankası</button>
          <button type="button" class="bank-pill-btn" data-bank="qnb">QNB Finansbank</button>
        `;
      }
    }

    if (typeof window.refreshBankSelector === 'function') {
      window.refreshBankSelector();
    }
  }

  const cCitySelect = document.getElementById('cCity');
  const cCityLabel = document.querySelector('label[for="cCity"]');
  const cDistrictLabel = document.querySelector('label[for="cDistrict"]');
  if (cCityLabel) cCityLabel.textContent = lang === 'pl' ? 'Miasto usługi:' : 'Hizmet Şehri:';
  if (cDistrictLabel) cDistrictLabel.textContent = lang === 'pl' ? 'Dzielnica / Rejon:' : 'İlçe / Semt:';

  // Key Handoff options translations
  const keyLabel = document.querySelector('.key-opt-label');
  if (keyLabel) keyLabel.textContent = lang === 'pl' ? '🔑 Odbiór kluczy / Wejście:' : '🔑 Giriş / Karşılama Tercihiniz:';
  const keyCards = document.querySelectorAll('.key-opt-card');
  if (keyCards.length >= 4) {
    const s0 = keyCards[0].querySelector('span'); if (s0) s0.textContent = lang === 'pl' ? '🏠 Będę w domu' : '🏠 Evde Olacağım';
    const s1 = keyCards[1].querySelector('span'); if (s1) s1.textContent = lang === 'pl' ? '🏢 U ochrony / recepcji' : '🏢 Güvenlik / Kapıcıda';
    const s2 = keyCards[2].querySelector('span'); if (s2) s2.textContent = lang === 'pl' ? '🤝 U sąsiada' : '🤝 Komşuma Bıraktım';
    const s3 = keyCards[3].querySelector('span'); if (s3) s3.textContent = lang === 'pl' ? '🔢 Skrzynka z kodem / sejf' : '🔢 Şifreli Kutu / Kilit';
  }

  // Payment tabs translations
  const tabTransfer = document.getElementById('tabPayTransfer');
  const tabCash = document.getElementById('tabPayCash');
  if (tabTransfer) {
    const strong = tabTransfer.querySelector('strong');
    const span = tabTransfer.querySelector('.p-tab-info span');
    const badge = tabTransfer.querySelector('.p-tab-badge');
    if (strong) strong.textContent = lang === 'pl' ? 'Przelew Bankowy / BLIK' : 'Banka Havalesi / FAST';
    if (span) span.textContent = lang === 'pl' ? 'Rabat 5% & Błyskawiczny przelew' : '%5 Ek İndirim Avantajı & 7/24 FAST';
    if (badge) badge.textContent = lang === 'pl' ? '-5% RABAT' : '-%5 İNDİRİM';
  }
  if (tabCash) {
    const strong = tabCash.querySelector('strong');
    const span = tabCash.querySelector('.p-tab-info span');
    const badge = tabCash.querySelector('.p-tab-badge');
    if (strong) strong.textContent = lang === 'pl' ? 'Płatność na miejscu' : 'Kapıda Güvenli Ödeme';
    if (span) span.textContent = lang === 'pl' ? 'Gotówka lub Mobilny POS' : 'Hizmet Sonrası Nakit veya Mobil POS';
    if (badge) badge.textContent = lang === 'pl' ? '0% PROWIZJI' : '%0 KOMİSYON';
  }

  // Price Breakdown itemized labels
  const baseLbl = document.querySelector('#rowBasePrice .b-lbl');
  const freqLbl = document.querySelector('#rowFreqDiscount .b-lbl');
  const transLbl = document.querySelector('#rowTransferDiscount .b-lbl');
  const promoLbl = document.querySelector('#rowPromoDiscount .b-lbl');
  if (baseLbl) baseLbl.textContent = lang === 'pl' ? 'Sprzątanie podstawowe:' : 'Temel Temizlik:';
  if (freqLbl) freqLbl.textContent = lang === 'pl' ? 'Rabat za regularność:' : 'Sıklık İndirimi:';
  if (transLbl) transLbl.textContent = lang === 'pl' ? 'Przelew Bankowy / BLIK:' : 'Banka Havalesi / FAST:';
  if (promoLbl) promoLbl.textContent = lang === 'pl' ? 'Kupon Promocyjny:' : 'Promosyon İndirimi:';

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
      const activeTrCities = ['Istanbul', 'Izmir', 'Ankara', 'Antalya', 'Bursa', 'Kocaeli', 'Sakarya', 'Balikesir', 'Samsun', 'Mugla'];
      const unservicedTrCities = Object.keys(CITY_NAMES_TR_TITLE).filter(c => !activeTrCities.includes(c) && CITY_TO_REGION[c] !== 'mazowsze' && c !== 'Warszawa');

      const activeGroup = document.createElement('optgroup');
      activeGroup.label = '📍 Hizmet Verilen Şehirlerimiz';
      activeTrCities.forEach(cityKey => {
        const opt = document.createElement('option');
        opt.value = cityKey;
        opt.textContent = CITY_NAMES_TR_TITLE[cityKey] || cityKey;
        activeGroup.appendChild(opt);
      });
      cCitySelect.appendChild(activeGroup);

      const soonGroup = document.createElement('optgroup');
      soonGroup.label = '🚀 Temsilcilik / Yakında Gelecek Şehirler';
      unservicedTrCities.forEach(cityKey => {
        const opt = document.createElement('option');
        opt.value = cityKey;
        opt.dataset.status = 'coming_soon';
        opt.textContent = (CITY_NAMES_TR_TITLE[cityKey] || cityKey) + ' (Temsilcilik / Yakında)';
        soonGroup.appendChild(opt);
      });
      cCitySelect.appendChild(soonGroup);
    }
    if (Array.from(cCitySelect.options).some(opt => opt.value === previousVal)) {
      cCitySelect.value = previousVal;
    }
    cCitySelect.dispatchEvent(new Event('change', { bubbles: true }));
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

  // Help Modal ("Daire temizliğine neler dahildir?")
  const hmTitle = document.getElementById('helpModalTitle');
  const hmSecs = document.querySelectorAll('.wizard-help-modal-card .hm-sec');
  if (hmTitle && hmSecs.length >= 4) {
    if (lang === 'pl') {
      hmTitle.textContent = '🧹 Co obejmuje standardowe sprzątanie mieszkania?';
      const s0 = hmSecs[0].querySelector('strong'); if (s0) s0.textContent = '🛏️ Pokoje i Przestrzenie Dzienne:';
      const p0 = hmSecs[0].querySelector('p'); if (p0) p0.textContent = 'Ścieranie kurzu, odkurzanie i mycie podłóg, przecieranie powierzchni mebli, opróżnianie koszy na śmieci.';
      const s1 = hmSecs[1].querySelector('strong'); if (s1) s1.textContent = '🍳 Kuchnia:';
      const p1 = hmSecs[1].querySelector('p'); if (p1) p1.textContent = 'Mycie blatów i zlewu, przecieranie płyty kuchennej oraz zewnętrznych frontów szafek i AGD.';
      const s2 = hmSecs[2].querySelector('strong'); if (s2) s2.textContent = '🚿 Łazienka i Toaleta:';
      const p2 = hmSecs[2].querySelector('p'); if (p2) p2.textContent = 'Dezynfekcja toalety, kabiny prysznicowej, wanny i umywalki, polerowanie luster oraz płytek.';
      const s3 = hmSecs[3].querySelector('strong'); if (s3) s3.textContent = '🚪 Przedpokój i Korytarz:';
      const p3 = hmSecs[3].querySelector('p'); if (p3) p3.textContent = 'Przecieranie drzwi wejściowych, klamek, listew przypodłogowych oraz dokładne mycie podłogi.';
    } else {
      hmTitle.textContent = '🧹 Standart Daire Temizliğine Neler Dahildir?';
      const s0 = hmSecs[0].querySelector('strong'); if (s0) s0.textContent = '🛏️ Odalar ve Yaşam Alanları:';
      const p0 = hmSecs[0].querySelector('p'); if (p0) p0.textContent = 'Tüm tozların alınması, yerlerin vakumlanması ve silinmesi, mobilya yüzeylerinin temizlenmesi, çöp kovalarının boşaltılması.';
      const s1 = hmSecs[1].querySelector('strong'); if (s1) s1.textContent = '🍳 Mutfak:';
      const p1 = hmSecs[1].querySelector('p'); if (p1) p1.textContent = 'Tezgah ve eviye temizliği, ocak üstü ve dış yüzeylerin hijyenik silinmesi, mikroplardan arındırılması.';
      const s2 = hmSecs[2].querySelector('strong'); if (s2) s2.textContent = '🚿 Banyo ve Tuvalet:';
      const p2 = hmSecs[2].querySelector('p'); if (p2) p2.textContent = 'Klozet, duşakabin, küvet ve lavabonun dezenfekte edilmesi, aynaların parlatılması, seramiklerin silinmesi.';
      const s3 = hmSecs[3].querySelector('strong'); if (s3) s3.textContent = '🚪 Hol ve Koridor:';
      const p3 = hmSecs[3].querySelector('p'); if (p3) p3.textContent = 'Dış kapı kolu, süpürgelikler ve zeminlerin derinlemesine yıkanması.';
    }
  }

  // Services Trust Badges (Step 2)
  const sTrustBadges = document.querySelectorAll('.services-trust-badges-bar .trust-badge-item');
  if (sTrustBadges.length >= 3) {
    sTrustBadges[0].textContent = lang === 'pl' ? '🛡️ 100% Gwarancja Satysfakcji' : '🛡️ %100 Memnuniyet Garantisi';
    sTrustBadges[1].textContent = lang === 'pl' ? '⚡ Ubezpieczony Zespół' : '⚡ Sigortalı Ekip';
    sTrustBadges[2].textContent = lang === 'pl' ? '💳 Przejrzyste Ceny' : '💳 Şeffaf & Sabit Fiyat';
  }

  // Mobile Sticky Bar & Portal Hints
  const hintText = document.querySelector('.intro-hint .hint-text');
  if (hintText) hintText.textContent = lang === 'pl' ? 'Dotknij, aby wejść' : 'Girmek için dokunun';
  const brandSub = document.querySelector('.portal-brand-sub');
  if (brandSub) brandSub.textContent = lang === 'pl' ? 'Profesjonalne Usługi Sprzątania' : 'Profesyonel Temizlik Hizmetleri';
  const mobCityTitle = document.querySelector('.mobile-selector-title');
  if (mobCityTitle) mobCityTitle.textContent = lang === 'pl' ? 'SZYBKI WYBÓR OBSZARU' : 'HIZLI ŞEHİR SEÇİMİ';
  // Help Center Button text
  const helpTextEl = document.querySelector('.tms-help-text');
  if (helpTextEl) {
    if (lang === 'pl') {
      helpTextEl.textContent = 'Centrum Pomocy';
    } else if (lang === 'uk') {
      helpTextEl.textContent = 'Центр Допомоги';
    } else {
      helpTextEl.textContent = 'Yardım Merkezi';
    }
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
  const csoEyebrow = document.getElementById('csoEyebrow');
  const csoMainHeadline = document.getElementById('csoMainHeadline');
  const csoMainSub = document.getElementById('csoMainSub');
  const csoCurrentLangText = document.getElementById('csoCurrentLangText');

  if (csoEyebrow) {
    csoEyebrow.textContent = lang === 'en' ? 'Welcome!' : (lang === 'uk' ? 'Ласкаво просимо!' : (lang === 'pl' ? 'Witamy!' : 'Hoş geldiniz!'));
  }
  if (csoMainHeadline) {
    csoMainHeadline.textContent = lang === 'en' ? 'Where in the world are you?' : (lang === 'uk' ? 'Де ви перебуваєте?' : (lang === 'pl' ? 'Gdzie na świecie jesteś?' : 'Dünyanın neresindesiniz?'));
  }
  if (csoMainSub) {
    csoMainSub.textContent = lang === 'en'
      ? 'Select your country to get the best tailored cleaning experience.'
      : (lang === 'uk' 
        ? 'Оберіть вашу країну, щоб ми запропонували вам найкращий сервіс.'
        : (lang === 'pl' 
          ? 'Wybierz swój kraj, abyśmy mogli zaoferować Ci najlepsze doświadczenie.'
          : 'Size en uygun deneyimi sunabilmemiz için bulunduğunuz ülkeyi seçin.'));
  }

  if (csoCurrentLangText) {
    csoCurrentLangText.textContent = lang === 'en' ? 'English' : (lang === 'uk' ? 'Українська' : (lang === 'pl' ? 'Polski' : 'Türkçe'));
  }

  // Update active state in dropdown
  const csoLangOptions = document.querySelectorAll('.cso-lang-option');
  csoLangOptions.forEach(opt => {
    if (opt.dataset.lang === lang) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  const csoTurkeyTitle = document.querySelector('#csoBtnTurkey .cso-capsule-title');
  const csoTurkeyDesc = document.querySelector('#csoBtnTurkey .cso-capsule-desc');
  if (csoTurkeyTitle) {
    csoTurkeyTitle.textContent = lang === 'en' ? 'Turkey' : (lang === 'uk' ? 'Туреччина' : (lang === 'pl' ? 'Turcja' : 'Türkiye'));
  }
  if (csoTurkeyDesc) {
    csoTurkeyDesc.textContent = lang === 'en'
      ? 'Discover bespoke services & offerings in Turkey.'
      : (lang === 'uk'
        ? 'Відкрийте для себе персоналізовані послуги в Туреччині.'
        : (lang === 'pl' ? 'Odkryj spersonalizowane usługi i treści dla Turcji.' : 'Size özel hizmet ve içerikleri keşfedin.'));
  }

  const csoPolandTitle = document.querySelector('#csoBtnPoland .cso-capsule-title');
  const csoPolandDesc = document.querySelector('#csoBtnPoland .cso-capsule-desc');
  if (csoPolandTitle) {
    csoPolandTitle.textContent = lang === 'en' ? 'Poland' : (lang === 'uk' ? 'Польща' : 'Polska');
  }
  if (csoPolandDesc) {
    csoPolandDesc.textContent = lang === 'en'
      ? 'Explore tailored cleaning solutions in Warsaw.'
      : (lang === 'uk'
        ? 'Відкрийте для себе послуги та пропозиції у Варшаві.'
        : 'Odkryj usługi i treści dostosowane do Ciebie.');
  }

  // Bottom trust bar
  const trustCells = document.querySelectorAll('.cso-bottom-trust-bar .cso-trust-cell');
  if (trustCells.length >= 4) {
    const h0 = trustCells[0].querySelector('.cso-trust-heading');
    const p0 = trustCells[0].querySelector('.cso-trust-caption');
    if (h0) h0.textContent = lang === 'en' ? 'Secure & Private' : (lang === 'uk' ? 'Безпечно та Конфіденційно' : (lang === 'pl' ? 'Bezpiecznie i Prywatnie' : 'Güvenli ve Kişisel'));
    if (p0) p0.textContent = lang === 'en' ? 'Your data is completely safe' : (lang === 'uk' ? 'Ваші дані надійно захищені' : (lang === 'pl' ? 'Twoje dane są bezpieczne' : 'Verileriniz güvende'));

    const h1 = trustCells[1].querySelector('.cso-trust-heading');
    const p1 = trustCells[1].querySelector('.cso-trust-caption');
    if (h1) h1.textContent = lang === 'en' ? 'Localized Experience' : (lang === 'uk' ? 'Локалізований Досвід' : (lang === 'pl' ? 'Lokalne Doświadczenie' : 'Yerelleştirilmiş Deneyim'));
    if (p1) p1.textContent = lang === 'en' ? 'Tailored content for your region' : (lang === 'uk' ? 'Вміст для вашої країни' : (lang === 'pl' ? 'Treści dla Twojego kraju' : 'Ülkenize özel içerik'));

    const h2 = trustCells[2].querySelector('.cso-trust-heading');
    const p2 = trustCells[2].querySelector('.cso-trust-caption');
    if (h2) h2.textContent = lang === 'en' ? '24/7 Support' : (lang === 'uk' ? 'Підтримка 24/7' : (lang === 'pl' ? 'Wsparcie 24/7' : '7/24 Destek'));
    if (p2) p2.textContent = lang === 'en' ? 'Always here for your requests' : (lang === 'uk' ? 'Завжди на зв\'язку' : (lang === 'pl' ? 'Zawsze do Twojej dyspozycji' : 'Her zaman yanınızdayız'));

    const h3 = trustCells[3].querySelector('.cso-trust-heading');
    const p3 = trustCells[3].querySelector('.cso-trust-caption');
    if (h3) h3.textContent = lang === 'en' ? 'Quality Service' : (lang === 'uk' ? 'Висока Якість' : (lang === 'pl' ? 'Jakość Usług' : 'Kaliteli Hizmet'));
    if (p3) p3.textContent = lang === 'en' ? 'Committed to highest standards' : (lang === 'uk' ? 'Працюємо для вашого комфорту' : (lang === 'pl' ? 'Dbamy o najwyższe standardy' : 'En iyi deneyim için çalışıyoruz'));
  }
}

function applyServiceSelectTranslations(lang) {
  const selectItems = document.querySelectorAll('.service-select-item, .service-item-detail');
  if (selectItems.length < 4) return;

  const data = {
    tr: [
      {
        badge: '⭐ En Popüler',
        title: 'Standart Temizlik',
        sub: 'Ev temizliği için ideal',
        desc: 'Genel düzen ve temel hijyen çözümleri.',
        tags: ['Toz Alma', 'Süpürme', 'Yüzey Hijyeni']
      },
      {
        badge: 'Tavsiye Edilen',
        title: 'Detaylı Temizlik',
        sub: 'Derin temizlik hizmeti',
        desc: 'Dip köşe, buharlı hijyen ve leke çıkarma.',
        tags: ['Buharlı Hijyen', 'Dip Köşe', 'Leke Arındırma']
      },
      {
        badge: 'İşletmeler İçin',
        title: 'Kurumsal Temizlik',
        sub: 'Ofis, iş yeri ve kurumsal alanlar için',
        desc: 'Profesyonel ve düzenli temizlik çözümleri.',
        tags: ['Ofis & Plaza', 'Esnek Saatler', 'Özel Raporlama']
      },
      {
        badge: 'Sertifikalı',
        title: 'Dezenfeksiyon',
        sub: 'Hijyen ve bakterilere karşı koruma',
        desc: 'Bakteri ve haşere kontrol çözümleri.',
        tags: ['Haşere Kontrolü', 'Dezenfeksiyon', 'Ortam Hijyeni']
      },
      {
        badge: 'Ağır Kir',
        title: 'İnşaat Sonrası Temizlik',
        sub: 'Tadilat sonrası temiz yaşam alanı',
        desc: 'Tadilat ve inşaat sonrası derin temizlik.',
        tags: ['Moloz & Toz', 'Boya Kazıma', 'Cam & Derz']
      },
      {
        badge: 'Kolay Taşınma',
        title: 'Taşınma Temizliği',
        sub: 'Boş ev ve detaylı temizlik',
        desc: 'Taşınma öncesi veya sonrası detaylı temizlik.',
        tags: ['Boş Ev Hijyeni', 'Dolap İçi', 'Taşınmaya Hazır']
      }
    ],
    pl: [
      {
        badge: '⭐ Najpopularniejsza',
        title: 'Sprzątanie Standardowe',
        sub: 'Idealne do domu',
        desc: 'Ogólne porządki i podstawowa czystość.',
        tags: ['Ścieranie Kurzu', 'Odkurzanie', 'Higiena Powierzchni']
      },
      {
        badge: 'Polecana',
        title: 'Sprzątanie Głębokie',
        sub: 'Głębokie sprzątanie',
        desc: 'Dokładne czyszczenie i usuwanie plam.',
        tags: ['Czyszczenie Parowe', 'Kąty i Zakamarki', 'Usuwanie Plam']
      },
      {
        badge: 'Dla Firm',
        title: 'Sprzątanie Biur & Firm',
        sub: 'Dla biur, lokali i powierzchni B2B',
        desc: 'Profesjonalne i regularne sprzątanie.',
        tags: ['Biura & Plazy', 'Elastyczne Godziny', 'Specjalny Raport']
      },
      {
        badge: 'Certyfikowana',
        title: 'Dezynfekcja',
        sub: 'Ochrona przed bakteriami',
        desc: 'Rozwiązania kontroli bakterii i szkodników.',
        tags: ['Kontrola Szkodników', 'Dezynfekcja', 'Higiena Otoczenia']
      },
      {
        badge: 'Ciężki Brud',
        title: 'Sprzątanie Po Remoncie',
        sub: 'Czysta przestrzeń po budowie',
        desc: 'Głębokie sprzątanie po remoncie i budowie.',
        tags: ['Pył & Kurz', 'Skrobanie Farb', 'Okna & Fugi']
      },
      {
        badge: 'Łatwa Przeprowadzka',
        title: 'Sprzątanie Przeprowadzkowe',
        sub: 'Puste mieszkanie na błysk',
        desc: 'Dokładne sprzątanie przed lub po przeprowadzce.',
        tags: ['Puste Mieszkanie', 'Wnętrza Szaf', 'Gotowe do Zamieszkania']
      }
    ],
    uk: [
      {
        badge: '⭐ Найпопулярніша',
        title: 'Стандартне Прибирання',
        sub: 'Ідеально для дому',
        desc: 'Загальний порядок та основна гігієна.',
        tags: ['Пилосошення', 'Протирання пилу', 'Гігієна поверхонь']
      },
      {
        badge: 'Рекомендована',
        title: 'Генеральне Прибирання',
        sub: 'Глибоке прибирання',
        desc: 'Ретельна гігієна парою та видалення плям.',
        tags: ['Парова гігієна', 'Важкодоступні місця', 'Видалення плям']
      },
      {
        badge: 'Для Бізнесу',
        title: 'Прибирання Офісів (B2B)',
        sub: 'Для офісів та бізнес-приміщень',
        desc: 'Професійні та регулярні рішення.',
        tags: ['Офіси та бізнес-центри', 'Гнучкий графік', 'Спеціальний звіт']
      },
      {
        badge: 'Сертифікована',
        title: 'Дезінфекція',
        sub: 'Захист від бактерій та шкідників',
        desc: 'Рішення для контролю бактерій та шкідників.',
        tags: ['Контроль шкідників', 'Дезінфекція', 'Гігієна приміщення']
      },
      {
        badge: 'Важкий Бруд',
        title: 'Після Ремонту',
        sub: 'Чистий простір після будівництва',
        desc: 'Глибоке прибирання після ремонту та будівництва.',
        tags: ['Пил та сміття', 'Очищення фарби', 'Вікна та шви']
      },
      {
        badge: 'Легкий Переїзд',
        title: 'Прибирання До/Після Переїзду',
        sub: 'Детальна гігієна порожнього житла',
        desc: 'Детальне прибирання перед або після переїзду.',
        tags: ['Порожня квартира', 'Всередині шаф', 'Готово до заселення']
      }
    ]
  };

  const list = data[lang] || data.tr;
  selectItems.forEach((item, idx) => {
    const itemData = list[idx];
    if (!itemData) return;

    const badge = item.querySelector('.service-badge, .service-select-badge');
    const title = item.querySelector('.service-title-group h4, .service-select-info h4');
    const sub = item.querySelector('.service-title-group .service-sub');
    const desc = item.querySelector('.service-desc, .service-select-info p');
    const featureList = item.querySelectorAll('.service-feature-list li, .service-select-tag-pill');

    if (badge && itemData.badge) badge.textContent = itemData.badge;
    if (title && itemData.title) title.textContent = itemData.title;
    if (sub && itemData.sub) sub.textContent = itemData.sub;
    if (desc && itemData.desc) desc.textContent = itemData.desc;
    featureList.forEach((fEl, fIdx) => {
      if (itemData.tags[fIdx]) {
        // preserve svg icon inside li if exists
        const svg = fEl.querySelector('svg');
        if (svg) {
          fEl.innerHTML = svg.outerHTML + ' ' + itemData.tags[fIdx];
        } else {
          fEl.textContent = itemData.tags[fIdx];
        }
      }
    });
  });

  const headerTitle = document.querySelector('.services-select-title');
  const headerSubtitleSpan = document.querySelector('.services-select-subtitle span:nth-child(2)');

  if (headerTitle) {
    headerTitle.textContent = lang === 'pl' ? 'Jakiej usługi potrzebujesz?' : (lang === 'uk' ? 'Яка послуга вам потрібна?' : 'Hangi hizmete ihtiyacınız var?');
  }
  if (headerSubtitleSpan) {
    headerSubtitleSpan.textContent = lang === 'pl' ? 'Wybierz pakiet sprzątania dopasowany do Twoich potrzeb.' : (lang === 'uk' ? 'Оберіть пакет прибирання, що відповідає вашим потребам.' : 'İhtiyacınıza uygun temizlik paketini seçin.');
  }

  const continueLabel = document.querySelector('#servicesContinueBtn span');
  if (continueLabel) {
    continueLabel.textContent = lang === 'en' ? 'Continue ➔' : (lang === 'pl' ? 'Kontynuuj ➔' : (lang === 'uk' ? 'Продовжити ➔' : 'Devam Et ➔'));
  }
}

function applyMapSelectorTranslations(dict, lang) {
  const backBtn = document.getElementById('tmsBackCountryBtn');
  if (backBtn) {
    backBtn.innerHTML = `<span>←</span> <span>${lang === 'en' ? 'Change Country' : (lang === 'pl' ? 'Zmień kraj' : (lang === 'uk' ? 'Змінити країну' : 'Ülke Değiştir'))}</span>`;
  }

  const logoGroup = document.querySelector('.tms-logo-group span');
  if (logoGroup) {
    logoGroup.textContent = lang === 'en' ? 'PROFESSIONAL CLEANING SERVICES' : (lang === 'pl' ? 'PROFESJONALNE USŁUGI SPRZĄTANIA' : (lang === 'uk' ? 'ПРОФЕСІЙНІ ПОСЛУГИ ПРИБИРАННЯ' : 'PROFESYONEL TEMİZLİK HİZMETLERİ'));
  }

  const topPill = document.querySelector('.tms-top-center-pill');
  if (topPill) {
    topPill.textContent = lang === 'en' ? '📍 SELECT YOUR NEAREST CITY' : (lang === 'pl' ? '📍 WYBIERZ NAJBLIŻSZE MIASTO' : (lang === 'uk' ? '📍 ОБЕРІТЬ НАЙБЛИЖЧЕ МІСТО' : '📍 BİZE EN YAKIN ŞEHRİ SEÇİN'));
  }

  const helpText = document.querySelector('.tms-help-text');
  if (helpText) {
    helpText.textContent = lang === 'en' ? 'Help Center' : (lang === 'pl' ? 'Centrum Pomocy' : (lang === 'uk' ? 'Центр Допомоги' : 'Yardım Merkezi'));
  }

  const guaranteePill = document.querySelector('.tms-guarantee-pill');
  if (guaranteePill) {
    guaranteePill.innerHTML = `<span>🛡️</span> ${lang === 'en' ? 'Safe & Trusted' : (lang === 'pl' ? 'Bezpieczna usługa' : (lang === 'uk' ? 'Надійний сервіс' : 'Güvenli Hizmet'))}`;
  }

  const mainHeading = document.querySelector('.tms-main-heading');
  if (mainHeading) {
    mainHeading.textContent = lang === 'en' ? 'Select your city' : (lang === 'pl' ? 'Wybierz swoje miasto' : (lang === 'uk' ? 'Оберіть своє місто' : 'Şehrinizi seçin'));
  }

  const mainSub = document.querySelector('.tms-main-sub');
  if (mainSub) {
    mainSub.textContent = lang === 'en'
      ? 'Choose your city or district to view service points and book an appointment.'
      : (lang === 'pl'
        ? 'Wybierz miasto lub dzielnicę, aby zobaczyć najbliższe punkty usług i zarezerwować termin.'
        : (lang === 'uk'
          ? 'Оберіть місто або район, щоб переглянути доступні послуги та оформити замовлення.'
          : 'Size en yakın hizmet noktalarımızı görmek ve randevu oluşturmak için şehrinizi seçin.'));
  }

  const searchInput = document.getElementById('tmsCitySearchInput');
  if (searchInput) {
    searchInput.placeholder = lang === 'en' ? 'Search city or district...' : (lang === 'pl' ? 'Szukaj dzielnicy lub miasta...' : (lang === 'uk' ? 'Пошук району або міста...' : 'Şehir ara veya seç...'));
  }

  const gpsBtn = document.getElementById('tmsUseGpsBtn');
  if (gpsBtn) {
    gpsBtn.innerHTML = `<span>🎯</span> ${lang === 'en' ? 'Use my location' : (lang === 'pl' ? 'Użyj mojej lokalizacji' : (lang === 'uk' ? 'Використати моє місцезнаходження' : 'Konumumu kullan'))}`;
  }

  const filterBtns = document.querySelectorAll('.tms-filters-row .tms-filter-btn');
  if (filterBtns.length >= 4) {
    filterBtns[0].textContent = lang === 'en' ? '🎛️ All' : (lang === 'pl' ? '🎛️ Wszystkie' : (lang === 'uk' ? '🎛️ Всі' : '🎛️ Tüm'));
    filterBtns[1].textContent = lang === 'en' ? '🟢 Active Service' : (lang === 'pl' ? '🟢 Dostępne' : (lang === 'uk' ? '🟢 Доступно' : '🟢 Hizmet Veriliyor'));
    filterBtns[2].textContent = lang === 'en' ? '🟡 Coming Soon' : (lang === 'pl' ? '🟡 Wkrótce' : (lang === 'uk' ? '🟡 Незабаром' : '🟡 Yakında'));
    filterBtns[3].textContent = lang === 'en' ? '⚪ Not Available' : (lang === 'pl' ? '⚪ Niedostępne' : (lang === 'uk' ? '⚪ Недоступно' : '⚪ Hizmet Verilmiyor'));
  }
}

function applyLanguage(lang) {
  STATE.language = lang;
  STATE.currentLang = lang;

  const dict = TRANSLATIONS[lang];
  if (!dict) return;

  logDebug(`Applying language: ${lang}`);

  if (lang === 'pl' || lang === 'uk') {
    if (!STATE.selectedCity || CITY_TO_REGION[STATE.selectedCity] !== 'mazowsze') {
      setCityState('Warszawa', false);
    }
  } else {
    if (!STATE.selectedCity || CITY_TO_REGION[STATE.selectedCity] === 'mazowsze') {
      setCityState('Istanbul', false);
    }
  }

  try {
    localStorage.setItem('relaxax_language', lang);
  } catch(e) {}

  applyLanguageGlobal(lang);
  applyPageMetaTranslations(dict, lang);
  applyPortalHudTranslations(dict, lang);
  applyNavAndDrawerTranslations(dict, lang);
  applyHotspotTranslations(dict, lang);
  applyGatewayCardTranslations(dict, lang);
  applyBookingTranslations(dict, lang);
  applyServicesModalTranslations(dict, lang);
  applyCountrySelectorTranslations(dict, lang);
  applyServiceSelectTranslations(lang);
  applyMapSelectorTranslations(dict, lang);

  if (typeof updatePriceSliderDisplay === 'function') {
    updatePriceSliderDisplay();
  }

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
}

function setupPortalParticles() {
  const canvas = document.getElementById('dust-canvas');
  const portalStage = document.getElementById('portal-stage');
  if (!canvas || !portalStage) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  if (canvasAnimationId) {
    cancelAnimationFrame(canvasAnimationId);
    canvasAnimationId = null;
  }

  let lastDrawTime = performance.now();
  let explosionParticles = [];
  let shockwaves = [];
  let mouseTrail = [];
  portalTargetHue = 215;

  if (resizeCanvasHandler) {
    window.removeEventListener('resize', resizeCanvasHandler);
  }

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  const debouncedResize = debounce(resizeCanvas, 120);
  window.addEventListener('resize', debouncedResize);
  resizeCanvasHandler = debouncedResize;

  let pmx = window.innerWidth / 2;
  let pmy = window.innerHeight / 2;
  let lastMouseX = pmx;
  let lastMouseY = pmy;
  let mouseVelX = 0;
  let mouseVelY = 0;

  const trackPortalMouse = () => {
    // Mouse trail accumulation disabled to preserve 0% idle CPU and zero memory allocation
  };

  // Canvas rendering loop (particles & bubbles disabled)
  function drawLoop() {
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  window.startParticleLoop = () => {
    if (shouldRunParticleLoop() && !canvasAnimationId) {
      lastDrawTime = performance.now();
      drawLoop();
    }
  };

  if (particlesVisibilityHandler) {
    document.removeEventListener('visibilitychange', particlesVisibilityHandler);
  }
  particlesVisibilityHandler = () => {
    if (typeof window.startParticleLoop === 'function') window.startParticleLoop();
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
      video.style.opacity = '1';
      video.style.visibility = 'visible';
      video.style.display = 'block';
      activeIntroVideoEl = video; // Track active reference
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(e => {
          if (e && e.name !== 'AbortError') {
            logErrorDebug(`Autoplay blocked or failed for intro video: ${video.id}`, e);
          }
        });
      }
    } else {
      video.classList.remove('active');
      video.style.opacity = '0';
      video.style.visibility = 'hidden';
      video.style.display = 'none';
      if (!video.paused) {
        video.pause();
      }
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

  // Get localized city data with bulletproof fallback
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.tr;
  const cityData = (dict && dict.cities && dict.cities[city]) || (TRANSLATIONS.tr && TRANSLATIONS.tr.cities && TRANSLATIONS.tr.cities[city]) || { name: city.toUpperCase(), sub: '' };

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
  localStorage.setItem('relaxax_city', city);
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
  
  const trCities = [
    'Istanbul', 'Izmir', 'Ankara', 'Antalya', 'Bursa', 'Kocaeli', 'Sakarya', 'Balikesir', 'Samsun',
    'Adana', 'Gaziantep', 'Konya', 'Eskisehir', 'Trabzon', 'Mersin', 'Kayseri', 'Diyarbakir', 'Bodrum'
  ];
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

window.THREE = THREE;

/**
 * Three.js WebGL Liquify Screen Wipe Transition
 * Performs a liquid water ripple distortion shader wipe over the entrance video.
 */
function runLiquifyScreenWipe(introStage, introVideo, clickCoords, onComplete) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  const canvas = document.createElement('canvas');
  canvas.id = 'liquify-wipe-canvas';
  canvas.className = 'liquify-wipe-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.height = '100dvh';
  canvas.style.zIndex = '10000002';
  canvas.style.pointerEvents = 'none';
  if (introStage) introStage.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  } catch (err) {
    logErrorDebug('WebGL init for liquify wipe failed:', err);
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    gsap.to(introStage, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.inOut',
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  camera.position.z = 1;

  // Snapshot canvas texture for rock-solid frame capturing on all screen ratios
  const snapCanvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  snapCanvas.width = Math.min(width * dpr, 1920);
  snapCanvas.height = Math.min(height * dpr, 1920);
  const sCtx = snapCanvas.getContext('2d');
  if (introVideo && introVideo.readyState >= 2 && introVideo.videoWidth && introVideo.videoHeight) {
    try {
      const vW = introVideo.videoWidth;
      const vH = introVideo.videoHeight;
      const cW = snapCanvas.width;
      const cH = snapCanvas.height;
      const vRatio = vW / vH;
      const cRatio = cW / cH;
      let sWidth, sHeight, sx, sy;
      if (cRatio > vRatio) {
        sWidth = vW;
        sHeight = vW / cRatio;
        sx = 0;
        sy = (vH - sHeight) / 2;
      } else {
        sHeight = vH;
        sWidth = vH * cRatio;
        sx = (vW - sWidth) / 2;
        sy = 0;
      }
      sCtx.drawImage(introVideo, sx, sy, sWidth, sHeight, 0, 0, cW, cH);
    } catch(e) {
      try { sCtx.drawImage(introVideo, 0, 0, snapCanvas.width, snapCanvas.height); } catch(err) {}
    }
  } else {
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, snapCanvas.width, snapCanvas.height);
  }
  const texture = new THREE.CanvasTexture(snapCanvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const clickX = clickCoords && typeof clickCoords.x === 'number' ? clickCoords.x / width : 0.5;
  const clickY = clickCoords && typeof clickCoords.y === 'number' ? 1.0 - (clickCoords.y / height) : 0.75;

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D u_texture;
    uniform float u_progress;
    uniform float u_time;
    uniform vec2 u_clickPoint;
    uniform float u_aspect;
    varying vec2 vUv;

    // Simplex Noise 2D
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * 0.0243902439) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * snoise(p);
        p *= 2.06;
        a *= 0.48;
      }
      return v;
    }

    void main() {
      vec2 uv = vUv;
      vec2 aspectVec = vec2(u_aspect, 1.0);
      vec2 diff = (uv - u_clickPoint) * aspectVec;
      float dist = length(diff);

      // Liquid turbulence vectors
      vec2 flow = vec2(
        snoise(uv * 3.8 + vec2(u_time * 0.45, u_progress * 2.4)),
        snoise(uv * 3.8 + vec2(u_progress * 2.4, u_time * 0.45))
      );

      float liquidNoise = fbm(uv * 4.2 + flow * 0.45 + vec2(0.0, -u_time * 0.3));
      float waveRipple = sin(dist * 18.0 - u_progress * 15.0) * exp(-dist * 1.8);

      // Refractive liquid displacement
      float displaceMag = sin(u_progress * 3.14159) * 0.24;
      vec2 displacedUv = uv + flow * displaceMag + (diff / (dist + 0.001)) * waveRipple * displaceMag * 0.55;

      // Chromatic liquid dispersion (RGB shift)
      float rDisp = displaceMag * 0.024;
      float gDisp = displaceMag * 0.012;
      vec4 texR = texture2D(u_texture, clamp(displacedUv + flow * rDisp, 0.0, 1.0));
      vec4 texG = texture2D(u_texture, clamp(displacedUv + flow * gDisp, 0.0, 1.0));
      vec4 texB = texture2D(u_texture, clamp(displacedUv, 0.0, 1.0));
      vec4 tex = vec4(texR.r, texG.g, texB.b, 1.0);

      // Organic Liquid Wipe Coordinate
      float wipeCoord = (1.0 - uv.y) * 0.4 + (dist * 0.5) + liquidNoise * 0.3 + waveRipple * 0.1;
      float threshold = u_progress * 1.4 - 0.2;
      float edgeWidth = 0.15;
      float alpha = smoothstep(threshold - edgeWidth, threshold + edgeWidth, wipeCoord);
      alpha = clamp(alpha, 0.0, 1.0) * (1.0 - pow(u_progress, 4.0));

      // Specular liquid crest highlight along melting wave front
      float crest = 1.0 - abs(alpha - 0.5) * 2.0;
      crest = pow(clamp(crest, 0.0, 1.0), 3.0);
      vec3 waterSheen = vec3(0.45, 0.9, 1.0) * 1.4;

      vec3 finalColor = tex.rgb + waterSheen * crest * (1.0 - u_progress) * 0.9;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  const uniforms = {
    u_texture: { value: texture },
    u_progress: { value: 0.0 },
    u_time: { value: 0.0 },
    u_clickPoint: { value: new THREE.Vector2(clickX, clickY) },
    u_aspect: { value: aspect }
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  let animFrameId;
  const startTime = performance.now();

  const renderLoop = () => {
    uniforms.u_time.value = (performance.now() - startTime) * 0.001;
    if (introVideo && !introVideo.paused && introVideo.readyState >= 2) {
      try {
        sCtx.drawImage(introVideo, 0, 0, snapCanvas.width, snapCanvas.height);
        texture.needsUpdate = true;
      } catch(e) {}
    }
    renderer.render(scene, camera);
    animFrameId = requestAnimationFrame(renderLoop);
  };
  renderLoop();

  // Safety watchdog fallback: guarantee onComplete is called within 1400ms
  let completed = false;
  const safeComplete = () => {
    if (completed) return;
    completed = true;
    try { cancelAnimationFrame(animFrameId); } catch(e){}
    try { geometry.dispose(); material.dispose(); texture.dispose(); renderer.dispose(); } catch(e){}
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if (onComplete) onComplete();
  };
  const watchdogTimer = setTimeout(safeComplete, 1400);

  // Hide the HTML video after first WebGL render frame
  requestAnimationFrame(() => {
    if (introVideo) {
      introVideo.style.opacity = '0';
    }
  });

  gsap.to(uniforms.u_progress, {
    value: 1.0,
    duration: 0.95,
    ease: 'power2.inOut',
    onComplete: () => {
      clearTimeout(watchdogTimer);
      safeComplete();
    }
  });
}

function setupPortalIntroClick() {
  const heroTrack = document.getElementById('book-scroll-hero-track');
  const introStage = document.getElementById('portal-intro-stage');
  const introVideo = document.getElementById('portalIntroVideo');
  const progressBar = document.getElementById('sjhProgressBar');
  const hudText = document.getElementById('sjhText');
  const hud = document.getElementById('scrollJourneyHud');
  
  const poleLeft = document.getElementById('bannerPoleLeft');
  const poleLeftNear = document.getElementById('bannerPoleLeftNear');
  const poleRight = document.getElementById('bannerPoleRight');
  const poleRightNear = document.getElementById('bannerPoleRightNear');

  if (!introStage || !introVideo) return;

  const targetSrc = '/videos/book_intro.mp4';
  if (introVideo.getAttribute('src') !== targetSrc) {
    introVideo.setAttribute('src', targetSrc);
    introVideo.load();
  }
  try { introVideo.pause(); } catch(e){}

  const canvas = document.getElementById('portalIntroCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const TOTAL_FRAMES = 80;
  const frameImages = [];
  let lastRenderedFrame = -1;

  if (canvas) {
    canvas.width = 1280;
    canvas.height = 720;
  }

  // Preload all 80 high-res WebP frames for zero-latency scroll scrubbing
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    const numStr = String(i).padStart(3, '0');
    img.src = `/videos/book_frames/f_${numStr}.webp`;
    img.onload = () => {
      const currentTargetFrame = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentProgress * (TOTAL_FRAMES - 1))));
      if ((i - 1 === currentTargetFrame || lastRenderedFrame === -1) && ctx && canvas) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        lastRenderedFrame = i - 1;
      }
    };
    frameImages.push(img);
  }

  let triggered = false;
  let targetProgress = 0;
  let currentProgress = 0;
  let scrollVelocity = 0;
  let animFrameId = null;

  // Direct Wheel / Trackpad Scroll Engine with Smooth Inertia
  const onWheel = (e) => {
    if (triggered) return;
    const delta = e.deltaY;
    scrollVelocity += delta * 0.00075;
    scrollVelocity = Math.max(-0.08, Math.min(0.08, scrollVelocity));
  };

  window.addEventListener('wheel', onWheel, { passive: true });

  // Touch handlers for mobile devices
  let touchStartY = 0;
  let isTouching = false;

  const onTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartY = e.touches[0].clientY;
      isTouching = true;
    }
  };

  const onTouchMove = (e) => {
    if (!isTouching || !e.touches || !e.touches[0] || triggered) return;
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY - currentY;
    
    // Add touch delta to progress with momentum
    scrollVelocity += (deltaY / 200) * 0.45;
    targetProgress = Math.max(0, Math.min(1.0, targetProgress + deltaY / 240));
    touchStartY = currentY;
  };

  const onTouchEnd = () => {
    isTouching = false;
  };

  // Keyboard navigation
  const onKeyDown = (e) => {
    if (e.code === 'ArrowDown' || e.code === 'PageDown' || e.code === 'Space') {
      scrollVelocity += 0.05;
    } else if (e.code === 'ArrowUp' || e.code === 'PageUp') {
      scrollVelocity -= 0.05;
    }
  };

  // Main Render Loop for buttery smooth 60fps / 120fps video & flags synchronization
  const renderLoop = () => {
    // Scroll-driven forward/backward movement
    targetProgress = Math.max(0, Math.min(1.0, targetProgress + scrollVelocity));
    scrollVelocity *= 0.84; // Smooth exponential friction
    currentProgress += (targetProgress - currentProgress) * 0.16;

    // Render corresponding frame onto Canvas
    const frameIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentProgress * (TOTAL_FRAMES - 1))));
    const activeImg = frameImages[frameIndex];
    if (activeImg && activeImg.complete && activeImg.naturalWidth > 0 && ctx && canvas) {
      if (frameIndex !== lastRenderedFrame) {
        ctx.drawImage(activeImg, 0, 0, canvas.width, canvas.height);
        lastRenderedFrame = frameIndex;
      }
    } else if (ctx && canvas) {
      // Find nearest loaded frame to guarantee continuous visual feedback
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const prev = frameImages[frameIndex - offset];
        if (prev && prev.complete && prev.naturalWidth > 0) {
          ctx.drawImage(prev, 0, 0, canvas.width, canvas.height);
          break;
        }
        const next = frameImages[frameIndex + offset];
        if (next && next.complete && next.naturalWidth > 0) {
          ctx.drawImage(next, 0, 0, canvas.width, canvas.height);
          break;
        }
      }
    }

    if (progressBar) {
      progressBar.style.width = `${(currentProgress * 100).toFixed(1)}%`;
    }

    if (hudText) {
      if (currentProgress < 0.06) {
        hudText.textContent = 'AŞAĞI KAYDIRIN & İLERLEYİN';
      } else if (currentProgress < 0.80) {
        hudText.textContent = `🚶‍♂️ MANZARAYA İLERLENİYOR... %${Math.round(currentProgress * 100)}`;
      } else {
        hudText.textContent = '🚩 LÜTFEN BÖLGENİZİ SEÇİN (TÜRKİYE 🇹🇷 / POLONYA 🇵🇱)';
      }
    }

    // First-Person Walking Bob & Camera Sway Effect
    const walkPhase = currentProgress * 44;
    const walkBobY = Math.sin(walkPhase) * 3.6;
    const walkSwayX = Math.cos(walkPhase * 0.5) * 1.8;
    const depthScale = 1.0 + currentProgress * 0.10;

    if (canvas) {
      canvas.style.transform = `scale(${depthScale.toFixed(4)}) translate3d(${walkSwayX.toFixed(2)}px, ${walkBobY.toFixed(2)}px, 0)`;
    }

    // Flags & Country Portals: Emerge ONLY at the END where we glide into the meadow landscape (0.80 -> 1.0)
    let flagOpacity = 0;
    let flagYShift = 45;
    let flagScale = 0.85;

    if (currentProgress > 0.78) {
      const normalizedP = Math.min(1.0, (currentProgress - 0.78) / 0.16); // 0 to 1 between progress 0.78 and 0.94
      flagOpacity = normalizedP;
      flagYShift = (1.0 - normalizedP) * 45;
      flagScale = 0.85 + normalizedP * 0.15;
    }

    if (poleLeft) {
      poleLeft.style.opacity = flagOpacity.toFixed(3);
      poleLeft.style.visibility = flagOpacity > 0.05 ? 'visible' : 'hidden';
      poleLeft.style.pointerEvents = flagOpacity > 0.6 ? 'auto' : 'none';
      poleLeft.style.transform = `translate3d(0, ${flagYShift.toFixed(1)}px, 0) scale(${flagScale.toFixed(3)})`;
    }

    if (poleRight) {
      poleRight.style.opacity = flagOpacity.toFixed(3);
      poleRight.style.visibility = flagOpacity > 0.05 ? 'visible' : 'hidden';
      poleRight.style.pointerEvents = flagOpacity > 0.6 ? 'auto' : 'none';
      poleRight.style.transform = `translate3d(0, ${flagYShift.toFixed(1)}px, 0) scale(${flagScale.toFixed(3)})`;
    }

    if (!triggered) {
      animFrameId = requestAnimationFrame(renderLoop);
    }
  };

  animFrameId = requestAnimationFrame(renderLoop);

  window._dismissIntroHero = () => {
    triggered = true;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    const heroTrack = document.getElementById('book-scroll-hero-track');
    if (heroTrack) {
      heroTrack.style.transition = 'opacity 0.25s ease';
      heroTrack.style.opacity = '0';
      heroTrack.style.pointerEvents = 'none';
      setTimeout(() => {
        heroTrack.style.setProperty('display', 'none', 'important');
      }, 250);
    }
  };

  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('keydown', onKeyDown, { passive: true });

  // 2. Main entrance trigger handler
  function onTriggerIntro(e) {
    if (triggered) return;
    triggered = true;

    if (introStage) {
      introStage.style.pointerEvents = 'none';
    }

    cleanupIntroListeners();

    if (window.playTickSound) {
      try { window.playTickSound(); } catch(err) {}
    }

    document.body.classList.remove('portal-intro-mode');
    document.body.classList.add('flag-selection-mode');

    // Reveal country selector underneath the liquify wipe canvas
    const csoOverlay = document.getElementById('country-selector-overlay');
    if (csoOverlay) {
      csoOverlay.classList.remove('cso-hidden');
      csoOverlay.style.display = 'flex';
      csoOverlay.style.visibility = 'visible';
      csoOverlay.style.opacity = '1';
      csoOverlay.style.pointerEvents = 'all';
      const earthVideo = document.getElementById('csoEarthVideo');
      if (earthVideo) {
        const isMob = window.innerWidth <= 768;
        const targetEarthSrc = isMob ? '/videos/earth_rotating_mobil.mp4' : '/videos/earth_rotating.mp4';
        if (!earthVideo.getAttribute('src') || earthVideo.getAttribute('src') !== targetEarthSrc) {
          earthVideo.setAttribute('src', targetEarthSrc);
          earthVideo.load();
        }
        earthVideo.muted = true;
        earthVideo.playsInline = true;
        try { earthVideo.play().catch(() => {}); } catch(err) {}
      }
    }

    let clickCoords = { x: window.innerWidth / 2, y: window.innerHeight * 0.35 };
    if (e) {
      if (e.touches && e.touches[0]) {
        clickCoords = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.changedTouches && e.changedTouches[0]) {
        clickCoords = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      } else if (typeof e.clientX === 'number') {
        clickCoords = { x: e.clientX, y: e.clientY };
      }
    }

    if (typeof window.triggerDust === 'function') {
      try { window.triggerDust(clickCoords.x, clickCoords.y); } catch(e) {}
    }
    if (typeof window.playWarpSound === 'function') {
      try { window.playWarpSound(); } catch(e) {}
    }

    // Execute Three.js WebGL Liquify Screen Wipe Shader Transition
    if (typeof runLiquifyScreenWipe === 'function') {
      runLiquifyScreenWipe(introStage, introVideo, clickCoords, () => {
        if (introVideo && !introVideo.paused) {
          try { introVideo.pause(); } catch(err) {}
        }
        if (introStage && introStage.parentNode) {
          introStage.style.display = 'none';
          introStage.remove();
        }
        if (STATE.lenisInstance) {
          STATE.lenisInstance.stop();
        }
      });
    } else {
      gsap.to(introStage, {
        opacity: 0,
        scale: 1.04,
        duration: 0.35,
        ease: 'power2.out',
        onComplete: () => {
          if (introVideo && !introVideo.paused) {
            try { introVideo.pause(); } catch(err) {}
          }
          if (introStage && introStage.parentNode) {
            introStage.style.display = 'none';
            introStage.remove();
          }
          if (STATE.lenisInstance) {
            STATE.lenisInstance.stop();
          }
        }
      });
    }
  }

  // 3. Attach listeners
  introStage.addEventListener('mousemove', onMouseMove, { passive: true });
  introStage.addEventListener('click', onTriggerIntro);
  introStage.addEventListener('pointerdown', onTriggerIntro);
  introStage.addEventListener('touchstart', onTouchStart, { passive: true });
  introStage.addEventListener('touchmove', onTouchMove, { passive: true });
  introStage.addEventListener('touchend', onTriggerIntro);
  window.addEventListener('wheel', onWheel, { passive: true });
  document.addEventListener('keydown', onKeyDown, { once: true });

  // Auto-start fallback in 1200ms
  const autoDelay = isMobile ? 1200 : 1600;
  autoTimer = setTimeout(() => {
    onTriggerIntro({ clientX: window.innerWidth / 2, clientY: window.innerHeight * 0.4 });
  }, autoDelay);

  window.dismissIntroScreen = onTriggerIntro;
}

/**
 * 🌸 Scent & Pet Care Preference Handlers
 */
function setupScentAndPetLogic() {
  const scentCards = document.querySelectorAll('.wizard-scent-card');
  scentCards.forEach(card => {
    card.addEventListener('click', () => {
      scentCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      if (window.playTickSound) window.playTickSound();
    });
  });

  const careItems = document.querySelectorAll('.wizard-care-item');
  careItems.forEach(item => {
    const chk = item.querySelector('input[type="checkbox"]');
    if (!chk) return;
    chk.addEventListener('change', () => {
      if (chk.checked) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
      if (window.playTickSound) window.playTickSound();
    });
  });
}

/**
 * 📋 48-Point Digital Quality Report Modal
 */
function setupQualityReportModal() {
  const modal = document.getElementById('qualityReportModal');
  const openBtn = document.getElementById('btnOpenQualityReportModal');
  const closeBtn = document.getElementById('btnCloseQualityReport');
  const okBtn = document.getElementById('btnQualityReportOk');

  if (!modal) return;

  function openModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (window.playTickSound) window.playTickSound();
  }

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (okBtn) okBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

/**
 * 🏢 Corporate & Utility Modals (Products, FAQ, Franchise, Countries, Mobile App)
 */
function setupCorporateModals() {
  const modalConfigs = [
    {
      id: 'productsModal',
      triggers: ['#cNavProductsBtn', '#btnOpenProductsModal', '#btnNavProductsModal'],
      closeBtns: ['#btnCloseProductsModal']
    },
    {
      id: 'faqModal',
      triggers: ['#btnOpenFaqModal', '#btnNavFaqModal'],
      closeBtns: ['#btnCloseFaqModal', '#btnFaqModalOk']
    },
    {
      id: 'franchiseModal',
      triggers: ['#btnOpenFranchiseModal', '#btnNavFranchiseModal', '#btnCountriesToFranchise'],
      closeBtns: ['#btnCloseFranchiseModal']
    },
    {
      id: 'countriesModal',
      triggers: ['#btnOpenCountriesModal', '#btnNavCountriesModal'],
      closeBtns: ['#btnCloseCountriesModal']
    },
    {
      id: 'mobileAppModal',
      triggers: ['#btnOpenMobileAppModal', '#btnNavMobileAppModal', '#cNavMobileAppBtn'],
      closeBtns: ['#btnCloseMobileAppModal']
    }
  ];

  function openCorporateModal(modalEl) {
    if (!modalEl) return;
    // Close any other open corporate modals first
    modalConfigs.forEach(cfg => {
      const otherModal = document.getElementById(cfg.id);
      if (otherModal && otherModal !== modalEl) otherModal.style.display = 'none';
    });
    // Close floating dropdown if open
    const dropdownWrap = document.getElementById('cNavSceneDropdownWrap');
    if (dropdownWrap) dropdownWrap.classList.remove('is-open');

    modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (window.playTickSound) window.playTickSound();
  }
  window.openCorporateModal = openCorporateModal;

  function closeCorporateModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = 'none';
    document.body.style.overflow = '';
  }
  window.closeCorporateModal = closeCorporateModal;

  modalConfigs.forEach(cfg => {
    const modalEl = document.getElementById(cfg.id);
    if (!modalEl) return;

    cfg.triggers.forEach(selector => {
      const btns = document.querySelectorAll(selector);
      btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openCorporateModal(modalEl);
        });
      });
    });

    cfg.closeBtns.forEach(selector => {
      const closeBtn = modalEl.querySelector(selector);
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          closeCorporateModal(modalEl);
        });
      }
    });

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        closeCorporateModal(modalEl);
      }
    });
  });

  // Direct Booking Handler from Products Modal
  const btnPmAddBooking = document.getElementById('btnPmAddBooking');
  if (btnPmAddBooking) {
    btnPmAddBooking.addEventListener('click', (e) => {
      e.preventDefault();
      const pModal = document.getElementById('productsModal');
      if (pModal) closeCorporateModal(pModal);
      if (typeof openBookingScreen === 'function') {
        openBookingScreen();
        setTimeout(() => {
          const bcdCard = document.getElementById('bcdCard_butik_hediye_kutusu');
          const toggleBtn = document.getElementById('btnToggleBcd_butik_hediye_kutusu');
          if (bcdCard && !bcdCard.classList.contains('is-selected')) {
            bcdCard.classList.add('is-selected');
            if (toggleBtn) {
              toggleBtn.classList.add('is-added');
              const isPl = (STATE.language || 'tr') === 'pl';
              toggleBtn.querySelector('.btn-txt').textContent = isPl ? '✓ Dodano' : '✓ Temizliğe Eklendi';
            }
            updatePriceSliderDisplay();
          }
          const strip = document.getElementById('wizardBoutiqueCatalogStrip');
          if (strip) strip.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
      }
    });
  }

  const btnPmAddPeonyBooking = document.getElementById('btnPmAddPeonyBooking');
  if (btnPmAddPeonyBooking) {
    btnPmAddPeonyBooking.addEventListener('click', (e) => {
      e.preventDefault();
      const pModal = document.getElementById('productsModal');
      if (pModal) closeCorporateModal(pModal);
      if (typeof openBookingScreen === 'function') {
        openBookingScreen();
        setTimeout(() => {
          const bcdCard = document.getElementById('bcdCard_sakayik_buket_kutusu');
          const toggleBtn = document.getElementById('btnToggleBcd_sakayik_buket_kutusu');
          if (bcdCard && !bcdCard.classList.contains('is-selected')) {
            bcdCard.classList.add('is-selected');
            if (toggleBtn) {
              toggleBtn.classList.add('is-added');
              const isPl = (STATE.language || 'tr') === 'pl';
              toggleBtn.querySelector('.btn-txt').textContent = isPl ? '✓ Dodano' : '✓ Temizliğe Eklendi';
            }
            updatePriceSliderDisplay();
          }
          const strip = document.getElementById('wizardBoutiqueCatalogStrip');
          if (strip) strip.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
      }
    });
  }

  // Global escape key to close active corporate modal & boutique catalog drawer
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const bcd = document.getElementById('boutiqueCatalogDrawer');
      if (bcd && bcd.style.display === 'flex') {
        bcd.style.display = 'none';
        document.body.style.overflow = '';
      }
      modalConfigs.forEach(cfg => {
        const modalEl = document.getElementById(cfg.id);
        if (modalEl && modalEl.style.display === 'flex') {
          closeCorporateModal(modalEl);
        }
      });
    }
  });

  // FAQ Accordion & Search Logic
  const faqItems = document.querySelectorAll('.rx-faq-item');
  faqItems.forEach(item => {
    const qBtn = item.querySelector('.rx-faq-question');
    if (qBtn) {
      qBtn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
        if (window.playTickSound) window.playTickSound();
      });
    }
  });

  const faqSearchInput = document.getElementById('faqSearchInput');
  if (faqSearchInput) {
    faqSearchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      faqItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (!term || text.includes(term)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  // Franchise Form Submit Handler -> Direct WhatsApp
  const franchiseForm = document.getElementById('franchiseForm');
  if (franchiseForm) {
    franchiseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('frName')?.value || '';
      const phone = document.getElementById('frPhone')?.value || '';
      const email = document.getElementById('frEmail')?.value || 'Belirtilmedi';
      const city = document.getElementById('frCity')?.value || '';
      const budget = document.getElementById('frBudget')?.value || '';
      const experience = document.getElementById('frExperience')?.value || 'Belirtilmedi';

      const msg = `🤝 *RELAXAX BÖLGE TEMSİLCİLİĞİ / FRANCHISE BAŞVURUSU*\n\n` +
        `👤 *Ad Soyad:* ${name}\n` +
        `📞 *Telefon:* ${phone}\n` +
        `✉️ *E-Posta:* ${email}\n` +
        `📍 *Talep Edilen Şehir:* ${city}\n` +
        `💰 *Yatırım Bütçesi:* ${budget}\n` +
        `📝 *Notlar / Deneyim:* ${experience}\n\n` +
        `Lütfen franchise şartları ve bölge uygunluğu için benimle iletişime geçiniz.`;

      const encodedMsg = encodeURIComponent(msg);
      window.open(`https://wa.me/905466479004?text=${encodedMsg}`, '_blank');

      // Close modal and reset
      const frModal = document.getElementById('franchiseModal');
      closeCorporateModal(frModal);
      franchiseForm.reset();
      alert('Temsilcilik başvurunuz alındı ve WhatsApp üzerinden yetkili birimimize yönlendirildi!');
    });
  }

  // Countries Modal Actions
  const countryActionBtns = document.querySelectorAll('[data-action-country]');
  countryActionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const countriesModal = document.getElementById('countriesModal');
      closeCorporateModal(countriesModal);
      const c = btn.getAttribute('data-action-country');
      if (c === 'pl') {
        if (typeof window.applyLanguage === 'function') window.applyLanguage('pl');
      } else {
        if (typeof window.applyLanguage === 'function') window.applyLanguage('tr');
      }
      if (typeof openPortalGateway === 'function') openPortalGateway();
    });
  });

  const cityTagBtns = document.querySelectorAll('[data-action-city]');
  cityTagBtns.forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      const city = tag.getAttribute('data-action-city');
      const countriesModal = document.getElementById('countriesModal');
      closeCorporateModal(countriesModal);
      if (typeof openPortalGateway === 'function') openPortalGateway();
    });
  });
}

/**
 * 💬 Help Center -> Tawk.to Live Chat Launcher
 */
function setupHelpCenterButtons() {
  const helpBtns = document.querySelectorAll('.tms-help-btn, #tmsHelpCenterBtn, [data-action="open-help"]');
  helpBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.openCustomLiveChat === 'function') {
        window.openCustomLiveChat();
      } else if (window.Tawk_API) {
        if (typeof window.Tawk_API.showWidget === 'function') window.Tawk_API.showWidget();
        if (typeof window.Tawk_API.maximize === 'function') window.Tawk_API.maximize();
      }
      if (window.playTickSound) window.playTickSound();
    });
  });
}

// ==========================================
// 3. INITIALIZATION
// ==========================================
function initApp() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  window.STATE = STATE;
  window.TRANSLATIONS = TRANSLATIONS;
  window.applyLanguage = applyLanguage;
  window.openPortalGateway = openPortalGateway;
  window.selectServiceGlobal = selectServiceGlobal;
  window.openBookingScreen = openBookingScreen;
  window.closeBookingScreen = closeBookingScreen;
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
  setupHistoryBackNavigation();
  setupNetworkResilienceWatcher();
  setupScentAndPetLogic();
  setupQualityReportModal();
  setupCorporateModals();
  setupHelpCenterButtons();
  initAuthEngine();
  initI18nDropdowns();

  // Initialize interactive visual effects (Custom cursor on desktop, ambient glow globally)
  setupCustomCursor();
  setupCinemaAmbientLight();
  setupHolographicClickRipples();
  setupAudioToggle();
  setupVideoLoopEngineering();
  setupCodeBlockEngine();

  // Auto-detect browser/device language and location (prioritizing saved preference)
  const savedLang = localStorage.getItem('relaxax_language');
  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  const languages = (navigator.languages && navigator.languages.length ? Array.from(navigator.languages) : [browserLang]).map(l => (l || '').toLowerCase());
  const timezone = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();

  const hasUkrainianLang = languages.some(l => l.startsWith('uk') || l.startsWith('ua'));
  const hasPolishLang = languages.some(l => l.startsWith('pl'));
  const hasTurkishLang = languages.some(l => l.startsWith('tr'));

  const isUkraineLocation = timezone.includes('kyiv') || timezone.includes('kiev') || timezone.includes('ukraine');
  const isPolandLocation = timezone.includes('warsaw') || timezone.includes('poland');
  const isTurkeyLocation = timezone.includes('istanbul') || timezone.includes('turkey');

  let detectedLang = 'tr';
  if (savedLang && TRANSLATIONS[savedLang]) {
    detectedLang = savedLang;
  } else if (hasPolishLang || isPolandLocation) {
    detectedLang = 'pl';
  } else if (hasUkrainianLang || isUkraineLocation) {
    detectedLang = 'uk';
  } else if (hasTurkishLang || isTurkeyLocation) {
    detectedLang = 'tr';
  } else {
    detectedLang = 'tr';
  }

  const defaultLang = detectedLang;
  applyLanguage(defaultLang);

  // Initialize selected service states & texts
  selectServiceGlobal('standart');

  // Ad Campaign and Geotargeting Parameters Checks
  const urlParams = new URLSearchParams(window.location.search);
  const cityParam = urlParams.get('city');
  const langParam = urlParams.get('lang');

  const panelParam = urlParams.get('panel') || urlParams.get('auth') || urlParams.get('tab');
  if (panelParam) {
    setTimeout(() => {
      if (typeof window.openAuthModalGlobal === 'function') {
        if (panelParam === 'admin') window.openAuthModalGlobal('admin_dashboard');
        else if (panelParam === 'staff') window.openAuthModalGlobal('staff_dashboard');
        else if (panelParam === 'apply') window.openAuthModalGlobal('staff_apply');
        else window.openAuthModalGlobal(panelParam);
      }
    }, 400);
  }

  if (cityParam) {
    skipPortalDirectToCity(cityParam);
  } else if (langParam) {
    const rawLang = langParam.toLowerCase();
    const targetLang = (rawLang === 'pl' || rawLang === 'uk' || rawLang === 'tr') ? rawLang : 'tr';
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
  localStorage.removeItem('relaxax_city');
  localStorage.removeItem('tworose_city');

  // Initialize History state
  if (window.history && window.history.replaceState) {
    window.history.replaceState({ stage: 'country' }, '');
  }

  // popstate routing event listener for back/forward navigation in Chrome
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.stage) {
      if (e.state.stage === 'country' || e.state.stage === 'portal') {
        openPortalGateway();
      }
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

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


function showComingSoonNotice(cityKey, displayName, transCity) {
  const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.tr;
  let toast = document.getElementById('comingSoonNoticeToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'comingSoonNoticeToast';
    toast.className = 'coming-soon-toast';
    document.body.appendChild(toast);
  }

  const isPl = STATE.language === 'pl';
  const badgeText = dict.comingSoonBadge || (isPl ? 'WKRÓTCE' : 'HENÜZ YOKUZ');
  const noticeText = dict.comingSoonNotice || (isPl 
    ? 'Przepraszamy, nie świadczymy jeszcze usług w tym regionie. Zostań partnerem RELAXAX!' 
    : 'Üzgünüz, henüz bu bölgede aktif temizlik hizmetimiz yok. Ancak bizimle anlaşıp kendi şehrinizdeki temizlik operasyonunu sizler yönetebilirsiniz!');
  const partnerBtnText = dict.comingSoonPartnerBtn || (isPl ? '💬 Zostań Partnerem' : '💬 Temsilcilik / Anlaşma Yap');
  
  const partnerWaUrl = `https://wa.me/905466479004?text=${encodeURIComponent(
    isPl
      ? `Cześć RELAXAX, chciałbym uzyskać informacje na temat partnerstwa/reprezentacji w mieście ${displayName}.`
      : `Merhaba RELAXAX, ${displayName} şehrinde temizlik temsilciliği / anlaşması yapmak ve bilgi almak istiyorum.`
  )}`;

  toast.innerHTML = `
    <div class="cs-toast-content">
      <div class="cs-toast-icon">🚀</div>
      <div class="cs-toast-body">
        <div class="cs-toast-header">
          <span class="cs-city-name">${displayName}</span>
          <span class="cs-badge">${badgeText}</span>
        </div>
        <p class="cs-toast-text">${noticeText}</p>
      </div>
      <button class="cs-toast-close" onclick="document.getElementById('comingSoonNoticeToast').classList.remove('active')">&times;</button>
    </div>
  `;

  setTimeout(() => toast.classList.add('active'), 10);

  if (window.csToastTimer) clearTimeout(window.csToastTimer);
  window.csToastTimer = setTimeout(() => {
    if (toast) toast.classList.remove('active');
  }, 6000);
}

function addLeafletMarkers(mapObj, locations) {
  const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.tr;
  locations.forEach(loc => {
    const cityKey = loc.key;
    const transCity = dict.cities[cityKey];
    if (!transCity) return;

    const displayName = loc.districtName ? loc.districtName : transCity.name;
    const isComingSoon = loc.status === 'coming_soon' || transCity.status === 'coming_soon';

    const isSelected = (STATE.language === 'pl' ? (cityKey === 'Srodmiescie' || cityKey === 'Warszawa') : (cityKey === 'Istanbul'));
    const markerHtml = `
      <div class="map-hotspot ${isComingSoon ? 'is-coming-soon' : 'is-active-city'} ${isSelected ? 'is-selected-active' : ''}" 
           data-city="${cityKey}" 
           data-market="${loc.market}" 
           data-status="${isComingSoon ? 'coming_soon' : 'active'}"
           ${loc.districtName ? `data-iladi="${loc.districtName}"` : ''} 
           data-coords="${loc.coords[0].toFixed(2)}° N, ${loc.coords[1].toFixed(2)}° E" 
           role="button" 
           tabindex="0">
        <span class="hotspot-dot ${isComingSoon ? 'is-yellow' : (isSelected ? 'is-selected' : 'is-green')}"></span>
        <span class="hotspot-label ${isSelected ? 'is-selected' : ''}">
          ${displayName}
          ${isComingSoon ? `<span class="cs-tag">YAKINDA</span>` : ''}
        </span>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerHtml,
      className: 'leaflet-custom-hotspot-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker(loc.coords, { icon: customIcon }).addTo(mapObj);

    marker.on('click', (e) => {
      if (isComingSoon) {
        showComingSoonNotice(cityKey, displayName, transCity);
        return;
      }
      const cx = (e.originalEvent && e.originalEvent.clientX) || window.innerWidth / 2;
      const cy = (e.originalEvent && e.originalEvent.clientY) || window.innerHeight / 2;
      const el = marker.getElement() ? marker.getElement().querySelector('.map-hotspot') : null;
      if (triggerSelectionFn) triggerSelectionFn(cityKey, cx, cy, el);
    });

    marker.on('mouseover', () => {
      const el = marker.getElement() ? marker.getElement().querySelector('.map-hotspot') : null;
      if (showCityPreviewFn) showCityPreviewFn(cityKey, el);
    });

    marker.on('mouseout', (e) => {
      if (revertToDefaultFn) revertToDefaultFn(e.originalEvent || e);
    });

    const bindMarkerEvents = (el) => {
      if (!el) return;
      if (el.dataset.listenersBound === 'true') return;
      el.dataset.listenersBound = 'true';

      const onEnter = () => showCityPreviewFn && showCityPreviewFn(cityKey, el);
      const onLeave = (e) => revertToDefaultFn && revertToDefaultFn(e);
      const clickHandler = (e) => {
        e.stopPropagation();
        if (isComingSoon) {
          showComingSoonNotice(cityKey, displayName, transCity);
          return;
        }
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
  const currentToken = ++leafletInitToken;
  try {
    await ensureLeafletLoaded();
  } catch (err) {
    logErrorDebug('Leaflet map cannot be initialized: dynamic assets failed to load.', err);
    return;
  }
  if (currentToken !== leafletInitToken) return;
  if (country === 'turkey') {
    if (turkeyMapInstance) {
      try { turkeyMapInstance.invalidateSize(); } catch(e){}
      return;
    }
    turkeyMapInstance = L.map('portalNeonMap', {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
      minZoom: 4.5,
      maxZoom: 9.5,
      zoomSnap: 0.1,
      zoomDelta: 0.5
    }).setView([39.0, 35.0], 6);
    window.turkeyMapInstance = turkeyMapInstance;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(turkeyMapInstance);

    const turkeyCities = [
      { key: 'Istanbul', coords: [41.0082, 28.9784], market: 'marmara', status: 'active' },
      { key: 'Izmir', coords: [38.4237, 27.1428], market: 'ege', status: 'active' },
      { key: 'Ankara', coords: [39.9334, 32.8597], market: 'icanadolu', status: 'active' },
      { key: 'Antalya', coords: [36.8969, 30.7133], market: 'akdeniz', status: 'active' },
      { key: 'Bursa', coords: [40.1885, 29.0610], market: 'marmara', status: 'active' },
      { key: 'Kocaeli', coords: [40.7654, 29.9408], market: 'marmara', status: 'active' },
      { key: 'Sakarya', coords: [40.7560, 30.3784], market: 'marmara', status: 'active' },
      { key: 'Balikesir', coords: [39.6484, 27.8904], market: 'ege', status: 'active' },
      { key: 'Samsun', coords: [41.2867, 36.3300], market: 'karadeniz', status: 'active' },
      { key: 'Adana', coords: [37.0000, 35.3213], market: 'akdeniz', status: 'coming_soon' },
      { key: 'Gaziantep', coords: [37.0662, 37.3833], market: 'guneydogu', status: 'coming_soon' },
      { key: 'Konya', coords: [37.8746, 32.4932], market: 'icanadolu', status: 'coming_soon' },
      { key: 'Eskisehir', coords: [39.7667, 30.5256], market: 'icanadolu', status: 'coming_soon' },
      { key: 'Trabzon', coords: [41.0027, 39.7168], market: 'karadeniz', status: 'coming_soon' },
      { key: 'Mersin', coords: [36.8121, 34.6415], market: 'akdeniz', status: 'coming_soon' },
      { key: 'Kayseri', coords: [38.7312, 35.4787], market: 'icanadolu', status: 'coming_soon' },
      { key: 'Diyarbakir', coords: [37.9144, 40.2306], market: 'guneydogu', status: 'coming_soon' },
      { key: 'Bodrum', coords: [37.0344, 27.4305], market: 'ege', status: 'coming_soon' }
    ];

    addLeafletMarkers(turkeyMapInstance, turkeyCities);
    if (typeof showCityPreviewFn === 'function') {
      showCityPreviewFn('Istanbul');
    }

    // Perfect Turkey Bounding Box Fit: SW [35.8, 25.5], NE [42.3, 44.8]
    const turkeyGeoBounds = L.latLngBounds([35.7, 25.5], [42.4, 44.8]);

    const isMobile = window.innerWidth <= 768;
    const isTinyMobile = window.innerWidth <= 480;

    const turkeyPadding = isTinyMobile ? [12, 12] : (isMobile ? [24, 24] : [40, 50]);

    turkeyMapInstance.fitBounds(turkeyGeoBounds, {
      padding: turkeyPadding,
      animate: false
    });

    turkeyMapInstance.on('zoomend moveend viewreset', () => {
      updateCachedHotspotCoords();
    });

    setTimeout(() => {
      if (turkeyMapInstance) {
        turkeyMapInstance.invalidateSize();
        updateCachedHotspotCoords();
      }
    }, 100);
    setTimeout(() => {
      if (turkeyMapInstance) {
        turkeyMapInstance.invalidateSize();
        updateCachedHotspotCoords();
      }
    }, 300);

    setTimeout(() => {
      const targets = document.querySelectorAll('#portalNeonMap .hotspot-core');
      if (targets.length > 0) {
        gsap.fromTo(targets,
          { scale: 0 },
          { scale: 1, duration: 0.6, stagger: 0.02, ease: 'back.out(1.7)', overwrite: 'auto' }
        );
      }
    }, 150);

  } else if (country === 'poland') {
    if (polandMapInstance) {
      polandMapInstance.invalidateSize();
      updateCachedHotspotCoords();
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(polandMapInstance);

    const polandDistricts = [
      { key: 'Srodmiescie', coords: [52.2300, 21.0100], districtName: 'Śródmieście', market: 'mazowsze' },
      { key: 'Mokotow', coords: [52.1950, 21.0350], districtName: 'Mokotów', market: 'mazowsze' },
      { key: 'Wola', coords: [52.2380, 20.9650], districtName: 'Wola', market: 'mazowsze' },
      { key: 'Ursynow', coords: [52.1400, 21.0450], districtName: 'Ursynów', market: 'mazowsze' },
      { key: 'Bemowo', coords: [52.2520, 20.9100], districtName: 'Bemowo', market: 'mazowsze' },
      { key: 'Bialoleka', coords: [52.3300, 21.0250], districtName: 'Białołęka', market: 'mazowsze' },
      { key: 'Praga-Polnoc', coords: [52.2560, 21.0380], districtName: 'Praga-Północ', market: 'mazowsze' },
      { key: 'Praga-Poludnie', coords: [52.2360, 21.0850], districtName: 'Praga-Południe', market: 'mazowsze' },
      { key: 'Targowek', coords: [52.2850, 21.0650], districtName: 'Targówek', market: 'mazowsze' },
      { key: 'Ochota', coords: [52.2150, 20.9750], districtName: 'Ochota', market: 'mazowsze' },
      { key: 'Zoliborz', coords: [52.2680, 20.9850], districtName: 'Żoliborz', market: 'mazowsze' },
      { key: 'Bielany', coords: [52.2950, 20.9350], districtName: 'Bielany', market: 'mazowsze' },
      { key: 'Ursus', coords: [52.1950, 20.8850], districtName: 'Ursus', market: 'mazowsze' },
      { key: 'Wlochy', coords: [52.1850, 20.9250], districtName: 'Włochy', market: 'mazowsze' },
      { key: 'Wilanow', coords: [52.1650, 21.0950], districtName: 'Wilanów', market: 'mazowsze' },
      { key: 'Wawer', coords: [52.1800, 21.1650], districtName: 'Wawer', market: 'mazowsze' },
      { key: 'Rembertow', coords: [52.2600, 21.1650], districtName: 'Rembertów', market: 'mazowsze' },
      { key: 'Wesola', coords: [52.2450, 21.2300], districtName: 'Wesoła', market: 'mazowsze' },
      { key: 'Zabki', coords: [52.2950, 21.1150], districtName: 'Ząbki', market: 'mazowsze' },
      { key: 'Marki', coords: [52.3350, 21.1100], districtName: 'Marki', market: 'mazowsze' },
      { key: 'Sulejowek', coords: [52.2350, 21.2850], districtName: 'Sulejówek', market: 'mazowsze' },
      { key: 'Jozefow', coords: [52.1300, 21.2350], districtName: 'Józefów', market: 'mazowsze' },
      { key: 'Pruszkow', coords: [52.1700, 20.8100], districtName: 'Pruszków', market: 'mazowsze' },
      { key: 'Piastow', coords: [52.1880, 20.8450], districtName: 'Piastów', market: 'mazowsze' },
      { key: 'Piaseczno', coords: [52.0750, 21.0250], districtName: 'Piaseczno', market: 'mazowsze' },
      { key: 'Konstancin-Jeziorna', coords: [52.0900, 21.1200], districtName: 'Konstancin-Jeziorna', market: 'mazowsze' }
    ];

    addLeafletMarkers(polandMapInstance, polandDistricts);

    polandMapInstance.on('zoomend moveend viewreset', () => {
      updateCachedHotspotCoords();
    });

    // Fit all district pins into view on any viewport size
    const isMobilePL = window.innerWidth <= 768;
    const isTinyMobilePL = window.innerWidth <= 480;
    const polandPadding = isTinyMobilePL ? [8, 8] : (isMobilePL ? [20, 20] : [60, 60]);

    polandMapInstance.fitBounds(L.latLngBounds(polandDistricts.map(c => c.coords)), {
      padding: polandPadding
    });

    const updateZoomClass = () => {
      if (!polandMapInstance) return;
      try {
        const zoom = polandMapInstance.getZoom();
        const mapEl = document.getElementById('portalNeonMapPoland');
        if (mapEl) {
          if (zoom < 11.5) {
            mapEl.classList.add('map-zoom-low');
          } else {
            mapEl.classList.remove('map-zoom-low');
          }
        }
      } catch(e) {}
      updateCachedHotspotCoords();
    };
    polandMapInstance.on('zoomend', updateZoomClass);
    polandMapInstance.on('viewreset', updateZoomClass);
    updateZoomClass();
    setTimeout(updateZoomClass, 400);

    setTimeout(() => {
      const targets = document.querySelectorAll('#portalNeonMapPoland .map-hotspot');
      if (targets.length > 0) {
        gsap.fromTo(targets,
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: 0.8, stagger: 0.08, ease: 'back.out(1.7)', overwrite: 'auto' }
        );
      }
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

  const parallaxLayers = document.querySelectorAll('.parallax-layer');
  const cityCards = document.querySelectorAll('.cc-gateway-card');
  const quickToX = [];
  const quickToY = [];
  parallaxLayers.forEach((layer) => {
    if (!layer) return;
    quickToX.push(gsap.quickTo(layer, "x", { duration: 0.8, ease: "power2.out" }));
    quickToY.push(gsap.quickTo(layer, "y", { duration: 0.8, ease: "power2.out" }));
  });

  const portalMapWrapper = document.querySelector('.portal-map-wrapper');

  const connectorPath = document.getElementById('portalConnectorPath');
  const connectorParticle = document.getElementById('portalConnectorParticle');

  // ── COUNTRY SELECTOR SETUP ───────────────────────────────────────────────
  const csoOverlay    = document.getElementById('country-selector-overlay');
  const csoBtnTurkey  = document.getElementById('csoBtnTurkey');
  const csoBtnPoland  = document.getElementById('csoBtnPoland');
  const mapSelectorStage = document.querySelector('.portal-map-selector-stage');
  const portalCenterHint = document.querySelector('.portal-center-hint');

  // ── CITY PREVIEW CONTROLLER ─────────────────────────────────────────────
  let activeCity = 'Istanbul';
  let portalRevertTimeout = null;

  const showCityPreview = (city, element = null) => {
    showCityPreviewFn = showCityPreview;
    if (portalRevertTimeout) {
      clearTimeout(portalRevertTimeout);
      portalRevertTimeout = null;
    }

    activeCity = city;

    // Set region hue colors dynamically
    const region = (element && element.dataset.market) || CITY_TO_REGION[city] || 'marmara';
    updateThemeForMarket(region);

    // Show corresponding city card in preview panel
    const allCards = document.querySelectorAll('.cc-gateway-card');
    const targetCityNorm = (city || '').toLowerCase().replace(/i̇/g, 'i').replace(/ı/g, 'i');
    
    let targetCard = Array.from(allCards).find(c => {
      const cCity = (c.dataset.city || '').toLowerCase().replace(/i̇/g, 'i').replace(/ı/g, 'i');
      return cCity === targetCityNorm;
    });

    if (!targetCard && allCards.length > 0) {
      if (STATE.language === 'pl') {
        targetCard = Array.from(allCards).find(c => (c.dataset.city || '').toLowerCase() === 'warszawa') || allCards[0];
      } else {
        targetCard = allCards[0];
      }
    }

    allCards.forEach(card => {
      if (card === targetCard) {
        card.setAttribute('style', 'display: flex !important; flex-direction: column !important; opacity: 1 !important; visibility: visible !important;');
      } else {
        card.setAttribute('style', 'display: none !important; opacity: 0 !important;');
      }
    });

    // Highlight mini popular city card
    const popularMiniCards = document.querySelectorAll('.tms-city-mini-card');
    popularMiniCards.forEach(m => {
      const mCity = (m.dataset.city || '').toLowerCase().replace(/i̇/g, 'i').replace(/ı/g, 'i');
      if (mCity === targetCityNorm) {
        m.classList.add('is-active');
      } else {
        m.classList.remove('is-active');
      }
    });

    // Highlight active map marker
    const hotspots = document.querySelectorAll('.map-hotspot');
    hotspots.forEach(h => {
      const hCity = (h.dataset.city || '').toLowerCase().replace(/i̇/g, 'i').replace(/ı/g, 'i');
      if (hCity === targetCityNorm) {
        h.classList.add('is-selected-active');
      } else {
        h.classList.remove('is-selected-active');
      }
    });

    const defaultPanel = document.getElementById('portalDefaultPanel');
    if (defaultPanel) {
      defaultPanel.style.display = 'none';
      defaultPanel.style.opacity = '0';
    }
  };
  showCityPreviewFn = showCityPreview;
  window.showCityPreviewGlobal = showCityPreview;

  const revertToDefault = (e) => {
    if (e && e.relatedTarget) {
      const closestHotspot = e.relatedTarget.closest ? e.relatedTarget.closest('.map-hotspot, .cc-gateway-card') : null;
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
      showCityPreview(STATE.language === 'pl' ? 'Warszawa' : 'Istanbul');
    }, 250);
  };
  revertToDefaultFn = revertToDefault;
  window.revertToDefaultGlobal = revertToDefault;

  // ── POPULAR CITIES & DISTRICTS CAROUSEL GENERATOR ─────────────────────
  function renderPopularCitiesGrid(countryCode) {
    const popularGrid = document.querySelector('.tms-popular-grid');
    const popularTitle = document.querySelector('.tms-popular-title');
    const seeAllLink = document.querySelector('.tms-see-all-link');
    if (!popularGrid) return;

    if (countryCode === 'pl') {
      if (popularTitle) popularTitle.textContent = '🏠 MIASTA';
      if (seeAllLink) seeAllLink.textContent = 'Zobacz wszystkie miasta ➔';

      const plList = [
        { key: 'Warszawa', name: 'Warszawa (Wszystkie Dzielnice)', sub: 'Mazowsze', status: '🟢 Dostępne', coords: [52.2297, 21.0122], img: '/images/warszawa_landmark.webp' },
        { key: 'Mokotow', name: 'Mokotów', sub: 'Warszawa', status: '🟢 Dostępne', coords: [52.1950, 21.0350], img: '/images/warszawa_landmark.webp' },
        { key: 'Srodmiescie', name: 'Śródmieście', sub: 'Warszawa', status: '🟢 Dostępne', coords: [52.2300, 21.0100], img: '/images/warszawa_landmark.webp' },
        { key: 'Wola', name: 'Wola', sub: 'Warszawa', status: '🟢 Dostępne', coords: [52.2380, 20.9650], img: '/images/warszawa_landmark.webp' },
        { key: 'Ursynow', name: 'Ursynów', sub: 'Warszawa', status: '🟢 Dostępne', coords: [52.1400, 21.0450], img: '/images/warszawa_landmark.webp' }
      ];

      popularGrid.innerHTML = plList.map((item, idx) => `
        <div class="tms-city-mini-card ${idx === 0 ? 'is-active' : ''}" data-city="${item.key}" role="button" tabindex="0">
          <img src="${item.img}" alt="${item.name}" class="tms-mini-thumb" />
          <div>
            <div class="tms-mini-name">${item.name}</div>
            <div class="tms-mini-region">${item.sub}</div>
            <div style="font-size: 0.68rem; color: ${item.isComingSoon ? '#eab308' : '#10b981'}; font-weight: 600;">${item.status}</div>
          </div>
        </div>
      `).join('');

      bindPopularMiniCardsEvents('pl');

    } else {
      if (popularTitle) popularTitle.textContent = '🏠 ŞEHİRLER';
      if (seeAllLink) seeAllLink.textContent = 'Tüm şehirleri gör ➔';

      const trList = [
        { key: 'Istanbul', name: 'İstanbul', sub: 'Marmara Bölgesi', status: '🟢 Hizmet veriliyor', coords: [41.0082, 28.9784], img: '/images/istanbul_day_landmark.jpg' },
        { key: 'Samsun', name: 'Samsun', sub: 'Karadeniz Bölgesi', status: '🟢 Hizmet veriliyor', coords: [41.2928, 36.3313], img: '/images/samsun_landmark.webp' },
        { key: 'Izmir', name: 'İzmir', sub: 'Ege Bölgesi', status: '🟢 Hizmet veriliyor', coords: [38.4237, 27.1428], img: '/images/izmir_landmark.webp' },
        { key: 'Antalya', name: 'Antalya', sub: 'Akdeniz Bölgesi', status: '🟢 Hizmet veriliyor', coords: [36.8969, 30.7133], img: '/images/antalya_landmark.webp' },
        { key: 'Bursa', name: 'Bursa', sub: 'Marmara Bölgesi', status: '🟢 Hizmet veriliyor', coords: [40.1885, 29.0610], img: '/images/bursa_landmark.jpg' },
        { key: 'Kocaeli', name: 'Kocaeli', sub: 'Marmara Bölgesi', status: '🟢 Hizmet veriliyor', coords: [40.7654, 29.9408], img: '/images/kocaeli_landmark.webp' },
        { key: 'Sakarya', name: 'Sakarya', sub: 'Marmara Bölgesi', status: '🟢 Hizmet veriliyor', coords: [40.7731, 30.4043], img: '/images/sakarya_landmark.webp' },
        { key: 'Balikesir', name: 'Balıkesir', sub: 'Marmara Bölgesi', status: '🟢 Hizmet veriliyor', coords: [39.6484, 27.8826], img: '/images/balikesir_landmark.webp' },
        { key: 'Ankara', name: 'Ankara', sub: 'İç Anadolu Bölgesi', status: '🟡 Yakında', coords: [39.9334, 32.8597], isComingSoon: true, img: '/images/istanbul_day_landmark.jpg' }
      ];

      popularGrid.innerHTML = trList.map((item, idx) => `
        <div class="tms-city-mini-card ${idx === 0 ? 'is-active' : ''}" data-city="${item.key}" role="button" tabindex="0">
          <img src="${item.img}" alt="${item.name}" class="tms-mini-thumb" />
          <div>
            <div class="tms-mini-name">${item.name}</div>
            <div class="tms-mini-region">${item.sub}</div>
            <div style="font-size: 0.68rem; color: ${item.isComingSoon ? '#eab308' : '#10b981'}; font-weight: 600;">${item.status}</div>
          </div>
        </div>
      `).join('');

      bindPopularMiniCardsEvents('tr');
    }
  }
  window.renderPopularCitiesGridGlobal = renderPopularCitiesGrid;

  function bindPopularMiniCardsEvents(country) {
    const cards = document.querySelectorAll('.tms-city-mini-card');
    cards.forEach(mini => {
      const city = mini.dataset.city;
      mini.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        cards.forEach(c => c.classList.remove('is-active'));
        mini.classList.add('is-active');

        let targetCity = city;
        if (country === 'pl') {
          targetCity = 'Warszawa';
        }

        const mapStageEl = document.querySelector('.portal-map-selector-stage');
        if (mapStageEl) {
          mapStageEl.style.setProperty('display', 'block', 'important');
          mapStageEl.style.setProperty('visibility', 'visible', 'important');
          mapStageEl.style.setProperty('pointer-events', 'all', 'important');
          mapStageEl.style.setProperty('opacity', '1', 'important');
          setTimeout(() => {
            try { mapStageEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(e){}
          }, 50);
        }

        if (country === 'pl') {
          if (typeof showCityPreviewFn === 'function') {
            showCityPreviewFn('Warszawa', mini);
          }
          if (window.polandMapInstance) {
            const PL_COORDS = {
              Srodmiescie: [52.2300, 21.0100],
              Mokotow: [52.1950, 21.0350],
              Wola: [52.2380, 20.9650],
              Ursynow: [52.1400, 21.0450],
              Wilanow: [52.1650, 21.0950],
              'Praga-Polnoc': [52.2560, 21.0380],
              Bielany: [52.2950, 20.9350],
              Bemowo: [52.2520, 20.9100],
              Ochota: [52.2150, 20.9750]
            };
            const coords = PL_COORDS[city];
            if (coords) {
              window.polandMapInstance.flyTo(coords, 12.5, { duration: 1.0 });
              // Highlight the corresponding hotspot
              const targetHotspot = document.querySelector(`.map-hotspot[data-city="${city}"]`);
              if (targetHotspot) {
                document.querySelectorAll('.map-hotspot').forEach(h => h.classList.remove('is-selected-active', 'is-hovered'));
                targetHotspot.classList.add('is-selected-active');
              }
            }
          }
        } else {
          if (typeof showCityPreviewFn === 'function') {
            showCityPreviewFn(city, mini);
          }
          if (window.turkeyMapInstance) {
            const CITY_COORDS = {
              Istanbul: [41.0082, 28.9784],
              Ankara: [39.9334, 32.8597],
              Izmir: [38.4237, 27.1428],
              Antalya: [36.8969, 30.7133],
              Bursa: [40.1885, 29.0610],
              Kocaeli: [40.7654, 29.9408],
              Samsun: [41.2928, 36.3313],
              Sakarya: [40.7731, 30.4043],
              Balikesir: [39.6484, 27.8826]
            };
            const coords = CITY_COORDS[city];
            if (coords) {
              window.turkeyMapInstance.flyTo(coords, 9, { duration: 1.2 });
            }
          }
        }
      });
    });

    const seeAllLink = document.querySelector('.tms-see-all-link');
    if (seeAllLink && !seeAllLink._bound) {
      seeAllLink._bound = true;
      seeAllLink.addEventListener('click', (e) => {
        e.preventDefault();
        const searchInput = document.getElementById('citySearchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }

  // ── COUNTRY SELECTOR HANDLERS ──────────────────────────────────────────
  function selectCountryGlobal(countryCode) {
    const code = (countryCode === 'pl' || countryCode === 'poland') ? 'pl' : 'tr';

    // 1. Immediately dismiss book scroll hero track
    if (typeof window._dismissIntroHero === 'function') {
      window._dismissIntroHero();
    }
    const heroTrack = document.getElementById('book-scroll-hero-track');
    if (heroTrack) {
      heroTrack.style.transition = 'opacity 0.25s ease';
      heroTrack.style.opacity = '0';
      heroTrack.style.pointerEvents = 'none';
      setTimeout(() => {
        heroTrack.style.setProperty('display', 'none', 'important');
      }, 200);
    }

    const introStage = document.getElementById('portal-intro-stage');
    if (introStage) {
      introStage.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      introStage.style.opacity = '0';
      introStage.style.pointerEvents = 'none';
      setTimeout(() => {
        introStage.style.setProperty('display', 'none', 'important');
      }, 350);
    }

    // 2. Immediately hide country selector overlay synchronously
    const csoOverlayEl = document.getElementById('country-selector-overlay') || document.getElementById('countrySelectionOverlay') || document.querySelector('.country-selector-overlay, .country-selection-overlay');
    if (csoOverlayEl) {
      csoOverlayEl.classList.add('cso-hidden');
      csoOverlayEl.style.setProperty('display', 'none', 'important');
      csoOverlayEl.style.setProperty('opacity', '0', 'important');
      csoOverlayEl.style.setProperty('visibility', 'hidden', 'important');
      csoOverlayEl.style.setProperty('pointer-events', 'none', 'important');
    }

    // 3. Immediately reveal portal stage & map stage
    document.body.classList.add('flag-selection-mode');
    document.body.classList.remove('portal-intro-mode');

    const portalStageEl = document.getElementById('portal-stage');
    if (portalStageEl) {
      portalStageEl.style.setProperty('display', 'flex', 'important');
      portalStageEl.style.setProperty('opacity', '1', 'important');
      portalStageEl.style.setProperty('pointer-events', 'all', 'important');
      portalStageEl.style.padding = '16px 12px';
      portalStageEl.style.background = 'radial-gradient(ellipse at 50% 8%, #0d1a33 0%, #081124 45%, #030712 100%)';
    }

    const mapStageEl = document.querySelector('.portal-map-selector-stage');
    if (mapStageEl) {
      mapStageEl.style.setProperty('display', 'block', 'important');
      mapStageEl.style.setProperty('visibility', 'visible', 'important');
      mapStageEl.style.setProperty('pointer-events', 'all', 'important');
      mapStageEl.style.setProperty('opacity', '1', 'important');
    }

    const logoContainer = document.querySelector('.portal-logo-container');
    if (logoContainer) logoContainer.style.display = 'none';
    const portalCenterHintEl = document.querySelector('.portal-center-hint');
    if (portalCenterHintEl) portalCenterHintEl.style.display = 'none';

    try {
      if (typeof closeBookingScreen === 'function') closeBookingScreen();
      if (typeof closeServicesModal === 'function') closeServicesModal();
      if (window.history && window.history.pushState) window.history.pushState({ stage: 'map' }, '');

      STATE.language = code;
      applyLanguage(code);

      const mapTr = document.getElementById('portalNeonMap');
      const mapPl = document.getElementById('portalNeonMapPoland');

      if (code === 'pl') {
        if (mapTr) mapTr.style.display = 'none';
        if (mapPl) mapPl.style.display = 'block';
        destroyLeafletMap('turkey');
        setTimeout(() => { initLeafletMap('poland'); }, 30);
      } else {
        if (mapTr) mapTr.style.display = 'block';
        if (mapPl) mapPl.style.display = 'none';
        destroyLeafletMap('poland');
        setTimeout(() => { initLeafletMap('turkey'); }, 30);
      }

      // Update Bottom Carousel & Right Preview Card according to Country
      renderPopularCitiesGrid(code);

      if (code === 'pl') {
        if (typeof showCityPreviewFn === 'function') showCityPreviewFn('Warszawa');
        const mainHeading = document.querySelector('.tms-main-heading');
        if (mainHeading) mainHeading.textContent = 'Wybierz swoje miasto';
        const mainSub = document.querySelector('.tms-main-sub');
        if (mainSub) mainSub.textContent = 'Wybierz miasto lub dzielnicę, aby zobaczyć najbliższe punkty usług i zarezerwować termin.';
        const searchInput = document.getElementById('tmsCitySearchInput');
        if (searchInput) searchInput.setAttribute('placeholder', 'Szukaj dzielnicy lub miasta...');
      } else {
        if (typeof showCityPreviewFn === 'function') showCityPreviewFn('Istanbul');
        const mainHeading = document.querySelector('.tms-main-heading');
        if (mainHeading) mainHeading.textContent = 'Şehrinizi seçin';
        const mainSub = document.querySelector('.tms-main-sub');
        if (mainSub) mainSub.textContent = 'Size en yakın hizmet noktalarımızı görmek ve randevu oluşturmak için şehrinizi seçin.';
        const searchInput = document.getElementById('tmsCitySearchInput');
        if (searchInput) searchInput.setAttribute('placeholder', 'Şehir ara veya seç...');
      }
    } catch (e) {
      console.warn('[selectCountryGlobal] Error in async handlers:', e);
    }

    setTimeout(() => {
      if (code === 'tr' && turkeyMapInstance) {
        turkeyMapInstance.invalidateSize();
      } else if (code === 'pl' && polandMapInstance) {
        polandMapInstance.invalidateSize();
      }
    }, 150);

    updatePortalCachedRects();
  }
  _boundSelectCountryGlobal = selectCountryGlobal;
  window.selectCountryGlobal = selectCountryGlobal;

  function selectCityGlobal(city) {
    if (!city) return;
    setCityState(city, true);

    const portalStage = document.getElementById('portal-stage');
    const csoOverlay = document.getElementById('country-selector-overlay') || document.getElementById('countrySelectionOverlay') || document.querySelector('.country-selector-overlay, .country-selection-overlay');
    const portalIntro = document.getElementById('portal-intro-stage');

    if (portalIntro) {
      portalIntro.style.display = 'none';
    }
    if (csoOverlay) {
      csoOverlay.style.display = 'none';
    }
    if (portalStage) {
      gsap.to(portalStage, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.out',
        onComplete: () => {
          portalStage.style.display = 'none';
        }
      });
    }

    document.body.classList.remove('flag-selection-mode', 'portal-intro-mode');

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.display = 'block';
      mainContent.style.opacity = '1';
      mainContent.style.pointerEvents = 'all';
    }

    if (STATE.lenisInstance) {
      STATE.lenisInstance.start();
      STATE.lenisInstance.scrollTo(0, { immediate: true });
    }
    window.scrollTo(0, 0);

    if (typeof window.goToCinemaStep === 'function') {
      window.goToCinemaStep(1);
    }
  }
  _boundSelectCityGlobal = selectCityGlobal;
  window.selectCityGlobal = selectCityGlobal;

  function returnToCountrySelector() {
    const csoOverlay = document.getElementById('country-selector-overlay') || document.getElementById('countrySelectionOverlay') || document.querySelector('.country-selector-overlay, .country-selection-overlay');
    const mapSelectorStage = document.querySelector('.portal-map-selector-stage');
    const earthVideo = document.getElementById('csoEarthVideo');
    
    if (mapSelectorStage) {
      mapSelectorStage.style.display = 'none';
      mapSelectorStage.style.opacity = '0';
    }
    if (csoOverlay) {
      csoOverlay.classList.remove('cso-hidden');
      csoOverlay.style.display = 'flex';
      csoOverlay.style.visibility = 'visible';
      csoOverlay.style.pointerEvents = 'all';
      csoOverlay.style.opacity = '1';
      if (earthVideo) {
        earthVideo.play().catch(() => {});
      }
    }
    document.body.classList.remove('flag-selection-mode');
  }
  _boundReturnToCountrySelector = returnToCountrySelector;
  window.returnToCountrySelector = returnToCountrySelector;

  function returnToCityMap() {
    const portalStage = document.getElementById('portal-stage');
    const servicesOverlay = document.getElementById('servicesTextOverlay');
    const mapSelectorStage = document.querySelector('.portal-map-selector-stage');
    
    if (servicesOverlay) {
      servicesOverlay.classList.remove('active');
    }
    if (portalStage) {
      portalStage.style.display = 'flex';
      portalStage.style.opacity = '1';
      portalStage.style.pointerEvents = 'all';
    }
    if (mapSelectorStage) {
      mapSelectorStage.style.display = 'block';
      mapSelectorStage.style.opacity = '1';
      mapSelectorStage.style.pointerEvents = 'all';
      setTimeout(() => {
        if (window.turkeyMapInstance) window.turkeyMapInstance.invalidateSize();
        if (window.polandMapInstance) window.polandMapInstance.invalidateSize();
      }, 150);
    }
    document.body.classList.add('flag-selection-mode');
    window.portalWarping = false;
  }
  window.returnToCityMap = returnToCityMap;

  // ── MASTER MOBILE VIDEO LOOP WATCHDOG ENGINE ──
  function initMobileVideoLoopEngine() {
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => {
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.setAttribute('muted', '');
      v.muted = true;

      // Pre-emptive seamless loop reset to eliminate mobile video decoder 1-frame blackout
      v.addEventListener('timeupdate', () => {
        if (v.duration && v.duration > 0.5 && v.currentTime >= v.duration - 0.08) {
          v.currentTime = 0;
        }
      });

      v.addEventListener('ended', () => {
        if (v.hasAttribute('loop') || v.loop) {
          v.currentTime = 0;
          v.play().catch(() => {});
        }
      });
    });

    const handleVisibilityResume = () => {
      if (document.visibilityState === 'visible') {
        const activeIntro = document.getElementById('portalIntroVideo');
        if (activeIntro && !activeIntro.paused) activeIntro.play().catch(() => {});
        const activeEarth = document.getElementById('csoEarthVideo');
        const cso = document.getElementById('country-selector-overlay');
        if (activeEarth && cso && !cso.classList.contains('cso-hidden')) activeEarth.play().catch(() => {});
        const activeIvy = document.getElementById('servicesIvyVideo');
        const sOverlay = document.getElementById('servicesTextOverlay');
        if (activeIvy && sOverlay && sOverlay.classList.contains('active')) activeIvy.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityResume, { passive: true });
    window.addEventListener('pageshow', handleVisibilityResume, { passive: true });
    window.addEventListener('focus', handleVisibilityResume, { passive: true });

    const unlockMediaOnTouch = () => {
      allVideos.forEach(v => {
        if (!v.paused && v.readyState >= 2) v.play().catch(() => {});
      });
      document.removeEventListener('touchstart', unlockMediaOnTouch);
      document.removeEventListener('click', unlockMediaOnTouch);
    };
    document.addEventListener('touchstart', unlockMediaOnTouch, { passive: true });
    document.addEventListener('click', unlockMediaOnTouch, { passive: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileVideoLoopEngine);
  } else {
    initMobileVideoLoopEngine();
  }

  const handleTurkeySelect = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    selectCountryGlobal('tr');
  };

  const handlePolandSelect = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    selectCountryGlobal('pl');
  };

  if (csoBtnTurkey) {
    csoBtnTurkey.addEventListener('click', handleTurkeySelect);
    csoBtnTurkey.addEventListener('pointerup', handleTurkeySelect);
  }

  if (csoBtnPoland) {
    csoBtnPoland.addEventListener('click', handlePolandSelect);
    csoBtnPoland.addEventListener('pointerup', handlePolandSelect);
  }

  // Universal Click Delegation for Country Cards
  document.addEventListener('click', (e) => {
    const trCard = e.target && e.target.closest ? e.target.closest('#csoBtnTurkey, [data-country="turkey"]') : null;
    if (trCard) {
      handleTurkeySelect(e);
      return;
    }
    const plCard = e.target && e.target.closest ? e.target.closest('#csoBtnPoland, [data-country="poland"]') : null;
    if (plCard) {
      handlePolandSelect(e);
      return;
    }
  });

  // Country Selector Top-right Language Dropdown Toggle
  const csoLangWrap = document.getElementById('csoLangDropdown');
  const csoLangPillBtn = document.getElementById('csoLangPillBtn');
  const csoLangPopover = document.getElementById('csoLangPopover');
  const csoLangOptions = document.querySelectorAll('.cso-lang-option');

  if (csoLangPillBtn && csoLangPopover) {
    csoLangPillBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = csoLangPopover.classList.contains('active');
      if (isActive) {
        csoLangPopover.classList.remove('active');
        csoLangWrap?.classList.remove('active');
        csoLangPillBtn.setAttribute('aria-expanded', 'false');
      } else {
        csoLangPopover.classList.add('active');
        csoLangWrap?.classList.add('active');
        csoLangPillBtn.setAttribute('aria-expanded', 'true');
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#csoLangDropdown')) {
        csoLangPopover.classList.remove('active');
        csoLangWrap?.classList.remove('active');
        csoLangPillBtn.setAttribute('aria-expanded', 'false');
      }
    });

    csoLangOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetLang = opt.dataset.lang;
        csoLangOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        csoLangPopover.classList.remove('active');
        csoLangWrap?.classList.remove('active');
        csoLangPillBtn.setAttribute('aria-expanded', 'false');
        applyLanguage(targetLang);
      });
    });
  }

  // Helper link "Tüm ülkeleri gör" - focuses on cards
  const otherCountriesBtn = document.getElementById('csoOtherCountriesBtn');
  if (otherCountriesBtn) {
    otherCountriesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const cardsRow = document.querySelector('.cso-arch-cards-row');
      if (cardsRow) {
        cardsRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
  // ── END COUNTRY SELECTOR ─────────────────────────────────────────────────

  // Smooth entry animation for country selector on load
  if (csoOverlay && !csoOverlay.classList.contains('cso-hidden')) {
    gsap.fromTo(csoOverlay, 
      { opacity: 0 }, 
      { opacity: 1, duration: 0.6, ease: 'power2.out' }
    );
  }

  // Mouse Parallax Track (RAF-throttled for high refresh rate monitor rendering)
  let pmx = 0;
  let pmy = 0;

  const updateParallax = () => {
    parallaxLayers.forEach((layer, idx) => {
      if (!layer) return;
      const depth = parseFloat(layer.dataset.depth || "0.04");
      if (quickToX[idx]) quickToX[idx](pmx * depth * 30);
      if (quickToY[idx]) quickToY[idx](pmy * depth * 20);
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
        hudTicking = true;
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
        h => h.dataset && h.dataset.city && h.dataset.city.toLowerCase() === (city || '').toLowerCase()
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

        document.body.classList.remove('flag-selection-mode', 'portal-intro-mode');
        portalStage.style.display = 'none';

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.style.display = 'block';
          mainContent.style.opacity = '1';
          mainContent.style.pointerEvents = 'all';
        }

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

        // Initialize cinema engine directly at Step 1 (Services Selection) after city portal closes
        if (typeof window.goToCinemaStep === 'function') {
          window.goToCinemaStep(1);
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

    const isMob = window.innerWidth <= 820;
    const warpDuration = isMob ? 0.35 : 1.15;
    const fadeDuration = isMob ? 0.25 : 0.95;

    tl.to('.portal-map-wrapper', {
      scale: isMob ? 4 : 11,
      rotationZ: isMob ? -10 : -25,
      rotateX: 0,
      rotateY: 0,
      opacity: 0,
      duration: warpDuration,
      ease: 'power4.in'
    }, 0)
      .to(portalStage, { opacity: 0, duration: fadeDuration, ease: 'power2.out' }, isMob ? '<' : '-=0.75')
      .to('#main-content', { opacity: 1, pointerEvents: 'all', duration: 0.35, ease: 'power2.out' }, isMob ? '<' : '-=0.45')
      .to('#main-nav', { opacity: 1, pointerEvents: 'all', duration: 0.35, ease: 'power2.out' }, '<');
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
  const mobileCityBtns = document.querySelectorAll('.mobile-city-btn, .m-fast-city-btn');
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
        h => h.dataset && h.dataset.city && h.dataset.city.toLowerCase() === (targetCity || '').toLowerCase()
      );
      
      let cx = window.innerWidth / 2;
      let cy = window.innerHeight / 2;
      
      if (hotspot) {
        const rect = hotspot.getBoundingClientRect();
        cx = rect.left + rect.width / 2;
        cy = rect.top + rect.height / 2;
      }
      
      if (btn.dataset.status === 'coming_soon' || btn.classList.contains('is-coming-soon')) {
        const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.tr;
        const transCity = dict.cities[city];
        showComingSoonNotice(city, transCity ? transCity.name : city, transCity);
        return;
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
    btn.addEventListener('keydown', keyHandler);

    portalHotspotListeners.push({ hotspot: btn, clickHandler, keyHandler });
  });

  updateCachedHotspotCoords();

  // Bind Popular Cities Mini Cards
  const popularMiniCards = document.querySelectorAll('.tms-city-mini-card');
  popularMiniCards.forEach(mini => {
    const city = mini.dataset.city;
    mini.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      popularMiniCards.forEach(c => c.classList.remove('is-active'));
      mini.classList.add('is-active');

      if (typeof showCityPreviewFn === 'function') {
        showCityPreviewFn(city, mini);
      }

      if (window.turkeyMapInstance && STATE.language !== 'pl') {
        const CITY_COORDS = {
          Istanbul: [41.0082, 28.9784],
          Izmir: [38.4237, 27.1428],
          Ankara: [39.9334, 32.8597],
          Antalya: [36.8969, 30.7133],
          Bursa: [40.1885, 29.0610],
          Kocaeli: [40.7654, 29.9408],
          Sakarya: [40.7560, 30.3784],
          Balikesir: [39.6484, 27.8904],
          Samsun: [41.2867, 36.3300]
        };
        const coords = CITY_COORDS[city];
        if (coords) {
          window.turkeyMapInstance.flyTo(coords, 9, { duration: 1.0 });
        }
      }
    });
  });

  // Bind Carousel Next Button
  const nextCarouselBtn = document.querySelector('.tms-carousel-next-btn');
  const popularGrid = document.querySelector('.tms-popular-grid');
  if (nextCarouselBtn && popularGrid) {
    nextCarouselBtn.addEventListener('click', () => {
      popularGrid.scrollBy({ left: 240, behavior: 'smooth' });
    });
  }

  // Bind GPS Location Button
  const gpsBtn = document.getElementById('tmsUseGpsBtn');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => {
      gpsBtn.innerHTML = '<span>⏳</span> Konum alınıyor...';
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude, longitude } = pos.coords;
            gpsBtn.innerHTML = '<span>🎯</span> Konum bulundu!';
            if (window.turkeyMapInstance) {
              window.turkeyMapInstance.flyTo([latitude, longitude], 11, { duration: 1.2 });
            }
            if (typeof showCityPreviewFn === 'function') {
              showCityPreviewFn('Istanbul');
            }
            setTimeout(() => {
              gpsBtn.innerHTML = '<span>🎯</span> Konumumu kullan';
            }, 3000);
          },
          err => {
            gpsBtn.innerHTML = '<span>🎯</span> Konumumu kullan';
            if (typeof showCityPreviewFn === 'function') {
              showCityPreviewFn('Istanbul');
            }
          }
        );
      } else {
        gpsBtn.innerHTML = '<span>🎯</span> Konumumu kullan';
      }
    });
  }

  // Bind Favorite Heart and Close Card Buttons
  document.querySelectorAll('.tms-icon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.classList.contains('tms-close-card-btn')) {
        if (typeof showCityPreviewFn === 'function') {
          showCityPreviewFn('Istanbul');
        }
      } else {
        if (btn.textContent.includes('🤍')) {
          btn.textContent = '❤️';
          btn.style.transform = 'scale(1.25)';
          setTimeout(() => btn.style.transform = 'scale(1)', 200);
        } else {
          btn.textContent = '🤍';
        }
      }
    });
  });

  // Bind Service Chip "+3 daha" Toggle
  document.querySelectorAll('.tms-service-chip').forEach(chip => {
    if (chip.textContent.includes('+3 daha')) {
      chip.style.cursor = 'pointer';
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const chipsContainer = chip.parentElement;
        if (chipsContainer) {
          chip.remove();
          const extra1 = document.createElement('span');
          extra1.className = 'tms-service-chip';
          extra1.textContent = '🪟 Panjur Temizliği';
          const extra2 = document.createElement('span');
          extra2.className = 'tms-service-chip';
          extra2.textContent = '🛋️ Koltuk Yıkama';
          const extra3 = document.createElement('span');
          extra3.className = 'tms-service-chip';
          extra3.textContent = '🧺 Halı Yıkama';
          chipsContainer.appendChild(extra1);
          chipsContainer.appendChild(extra2);
          chipsContainer.appendChild(extra3);
        }
      });
    }
  });

  // Bind Reset Map Button
  const resetMapBtn = document.getElementById('tmsResetMapBtn');
  if (resetMapBtn) {
    resetMapBtn.addEventListener('click', () => {
      if (window.turkeyMapInstance) {
        const bounds = L.latLngBounds([35.7, 25.5], [42.4, 44.8]);
        window.turkeyMapInstance.fitBounds(bounds, { padding: [30, 30], animate: true });
      }
    });
  }

  // Bind Real-Time City Search Input
  const searchInput = document.getElementById('tmsCitySearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = (e.target.value || '').toLowerCase().trim();
      const hotspots = document.querySelectorAll('.map-hotspot');
      hotspots.forEach(h => {
        const name = (h.textContent || '').toLowerCase();
        const city = (h.dataset.city || '').toLowerCase();
        if (!q || name.includes(q) || city.includes(q)) {
          h.style.display = 'inline-flex';
        } else {
          h.style.display = 'none';
        }
      });
      popularMiniCards.forEach(m => {
        const name = (m.textContent || '').toLowerCase();
        const city = (m.dataset.city || '').toLowerCase();
        if (!q || name.includes(q) || city.includes(q)) {
          m.style.display = 'flex';
        } else {
          m.style.display = 'none';
        }
      });
    });
  }

  // Bind Filter Pills
  const filterBtns = document.querySelectorAll('.tms-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const hotspots = document.querySelectorAll('.map-hotspot');
      hotspots.forEach(h => {
        const status = h.dataset.status || 'active';
        if (filter === 'all') {
          h.style.display = 'inline-flex';
        } else if (filter === 'active' && status === 'active') {
          h.style.display = 'inline-flex';
        } else if (filter === 'coming_soon' && status === 'coming_soon') {
          h.style.display = 'inline-flex';
        } else if (filter === 'none' && status === 'none') {
          h.style.display = 'inline-flex';
        } else {
          h.style.display = 'none';
        }
      });
    });
  });
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

  // ── FLOATING CAPSULE NAVBAR SETUP (EXACT AS SCREENSHOT) ──
  const cNavBrandBtn = document.getElementById('cNavBrandBtn');
  if (cNavBrandBtn) {
    cNavBrandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.goToCinemaStep === 'function') {
        window.goToCinemaStep(0);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const sceneDropdownWrap = document.getElementById('cNavSceneDropdownWrap');
  const sceneDropdownBtn = document.getElementById('cNavSceneDropdownBtn');
  const sceneDropdownMenu = document.getElementById('cNavSceneDropdownMenu');

  if (sceneDropdownWrap && sceneDropdownBtn) {
    sceneDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sceneDropdownWrap.classList.toggle('is-open');
      sceneDropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (sceneDropdownWrap.classList.contains('is-open') && !sceneDropdownWrap.contains(e.target)) {
        sceneDropdownWrap.classList.remove('is-open');
        sceneDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });

    const dropdownItems = sceneDropdownWrap.querySelectorAll('.c-nav-dropdown-item');
    dropdownItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const modalTarget = item.getAttribute('data-modal-target');
        const sceneNum = parseInt(item.getAttribute('data-scene'), 10);

        if (modalTarget) {
          const targetModal = document.getElementById(modalTarget);
          if (targetModal) {
            targetModal.style.display = 'flex';
            targetModal.classList.add('active');
            document.body.classList.add('corporate-modal-open');
          }
        } else if (!isNaN(sceneNum) && typeof window.goToCinemaStep === 'function') {
          // In cinema navigation, step 2 = Scene 1 (Mona Lisa), step 3 = Scene 2, etc.
          window.goToCinemaStep(sceneNum + 1);
          if (typeof window.updateFloatingNavActiveScene === 'function') {
            window.updateFloatingNavActiveScene(sceneNum);
          }
        }
        sceneDropdownWrap.classList.remove('is-open');
        sceneDropdownBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const cNavCityMapBtn = document.getElementById('cNavCityMapBtn');
  if (cNavCityMapBtn) {
    cNavCityMapBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof openPortalGateway === 'function') {
        openPortalGateway();
      }
    });
  }

  window.openBoutiqueProductsCatalog = function() {
    const drawer = document.getElementById('boutiqueCatalogDrawer');
    if (drawer) {
      drawer.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      if (typeof window.playTickSound === 'function') window.playTickSound();
      return;
    }
    const pModal = document.getElementById('productsModal');
    if (pModal && typeof window.openCorporateModal === 'function') {
      window.openCorporateModal(pModal);
    } else if (pModal) {
      pModal.style.display = 'flex';
    }
  };

  const cNavProductsBtn = document.getElementById('cNavProductsBtn') || document.getElementById('cNavBeforeAfterBtn');
  if (cNavProductsBtn) {
    cNavProductsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.openBoutiqueProductsCatalog();
    });
  }

  const drawerProductsItem = document.getElementById('drawerProductsItem');
  if (drawerProductsItem) {
    drawerProductsItem.addEventListener('click', (e) => {
      e.preventDefault();
      const mobileDrawer = document.getElementById('mobile-menu-drawer');
      if (mobileDrawer) mobileDrawer.hidden = true;
      window.openBoutiqueProductsCatalog();
    });
  }

  const cNavPriceCalcBtn = document.getElementById('cNavPriceCalcBtn');
  if (cNavPriceCalcBtn) {
    cNavPriceCalcBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof openBookingScreen === 'function') {
        openBookingScreen();
      }
    });
  }

  const citySwitcherBtn = document.getElementById('citySwitcherBtn');
  if (citySwitcherBtn) {
    citySwitcherBtn.addEventListener('click', () => {
      openPortalGateway();
    });
  }

  // Bind the Hero Landing CTA button to directly open Services (Step 1)
  const heroStartBtn = document.getElementById('heroStartScrubBtn');
  if (heroStartBtn) {
    heroStartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.goToCinemaStep === 'function') {
        window.goToCinemaStep(1);
      }
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

    const drawerLinks = drawer.querySelectorAll('.drawer-link-item');
    if (drawerLinks.length > 0) {
      gsap.fromTo(drawerLinks, 
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: 'power2.out', delay: 0.1, overwrite: 'auto' }
      );
    }
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
      const modalTarget = link.dataset.modalTarget;
      closeDrawer();

      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      setTimeout(() => {
        if (modalTarget) {
          const modalEl = document.getElementById(modalTarget);
          if (modalEl) {
            if (typeof window.openCorporateModal === 'function') {
              window.openCorporateModal(modalEl);
            } else {
              modalEl.removeAttribute('hidden');
              modalEl.style.display = 'flex';
              modalEl.classList.add('active');
            }
          }
          return;
        }

        if (target === 'home') {
          if (typeof window.goToCinemaStep === 'function') window.goToCinemaStep(0);
        } else if (target === 'services') {
          if (typeof window.goToCinemaStep === 'function') window.goToCinemaStep(1);
        } else if (target === 'contact') {
          openBookingScreen();
        } else if (target === 'cinema') {
          if (typeof window.goToCinemaStep === 'function') window.goToCinemaStep(2);
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
  const serviceSelectItems = document.querySelectorAll('.service-select-item, .service-item-detail');

  // Ensure Ivy background video is ready and playing with device-specific optimization
  const isMobile = window.innerWidth <= 768;
  const ivyVideoEl = document.getElementById('servicesIvyVideo');
  if (ivyVideoEl) {
    const targetIvySrc = isMobile ? '/videos/sarmasik_mobil.mp4' : '/videos/sarmasik.mp4';
    if (!ivyVideoEl.getAttribute('src') || ivyVideoEl.getAttribute('src') !== targetIvySrc) {
      ivyVideoEl.setAttribute('src', targetIvySrc);
      ivyVideoEl.load();
    }
    ivyVideoEl.muted = true;
    ivyVideoEl.playsInline = true;
    ivyVideoEl.loop = true;
    const playIvy = () => {
      try {
        const p = ivyVideoEl.play();
        if (p && typeof p.then === 'function') p.catch(() => {});
      } catch (e) {}
    };
    playIvy();
    document.addEventListener('click', playIvy, { once: true });
    document.addEventListener('touchstart', playIvy, { once: true });
  }

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

    const selectItem = (e) => {
      const service = item.dataset.service;
      const isActionBtn = e.target.closest('.service-action-btn');
      const isAlreadySelected = item.classList.contains('selected');
      
      selectServiceGlobal(service, e);

      // If user directly clicked the action button or re-clicked the selected card, proceed with ivy transition
      if (isActionBtn || isAlreadySelected) {
        proceedWithIvyTransition(service, e);
      }
    };

    item.addEventListener('click', selectItem);

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectItem(e);
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
  const CINEMA_SCENE_TITLES = [
    "1. Mona Lisa",
    "2. Toz Alan Şövalye",
    "3. Keşiş"
  ];

  const updateFloatingNavActiveScene = (sceneNum) => {
    const items = document.querySelectorAll('.c-nav-dropdown-item[data-scene]');
    items.forEach((item) => {
      const sc = parseInt(item.getAttribute('data-scene'), 10);
      if (sc === sceneNum) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  };
  window.updateFloatingNavActiveScene = updateFloatingNavActiveScene;

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
  
  if (!cinemaSection) return;

  const v1 = document.getElementById('video-scene-1');
  const v2 = document.getElementById('video-scene-2');
  const v3 = document.getElementById('video-scene-3');

  function getSafeDuration(video, fallback = 5.0) {
    if (video && !isNaN(video.duration) && video.duration > 0) {
      return video.duration;
    }
    return fallback;
  }

  // Populate module-level scenes array (Empty when cinema character videos are removed)
  scenes = [
    v1 ? { video: v1, irisX: 50, irisY: 50, yStart: 0, yEnd: 90, xStart: 25, xEnd: 70, duration: 12 } : null,
    v2 ? { video: v2, irisX: 50, irisY: 50, yStart: 12, yEnd: 80, xStart: 45, xEnd: 55, duration: 12 } : null,
    v3 ? { video: v3, irisX: 50, irisY: 50, yStart: 0, yEnd: 100, xStart: 30, xEnd: 70, duration: 14 } : null
  ].filter(Boolean);

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
        sc.video.addEventListener('loadedmetadata', checkAspectRatio, { once: true });
      }

      // Track file loading errors once
      sc.video.addEventListener('error', () => {
        logErrorDebug(`Decoder resource loading error on ${sc.video.id}:`, sc.video.error);
      }, { once: true });

      const onReady = () => {
        logDebug(`Video ${sc.video.id} readyState changed to: ${sc.video.readyState}. Recalculating target times and waking up loop.`);
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
    if (!cinemaRafId && !document.body.classList.contains('wizard-modal-open')) {
      lastFrameTime = performance.now();
      cinemaRafId = requestAnimationFrame(renderCinemaLoop);
    }
  }
  window.triggerCinemaLoop = triggerCinemaLoop;
  window.pauseCinemaLoop = () => {
    if (cinemaRafId) {
      cancelAnimationFrame(cinemaRafId);
      cinemaRafId = null;
    }
  };

  // ── WORLD-CLASS FILM RENDERING LOOP (smooth lerp requestAnimationFrame) ──
  function renderCinemaLoop() {
    // Suspend loop completely if selection gateway or booking wizard is active
    if (document.body.classList.contains('flag-selection-mode') || document.body.classList.contains('wizard-modal-open')) {
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
        
        if (cardOpacity > 0.001 && currentStep === 0) {
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
          introCard.style.opacity = '0';
          introCard.style.pointerEvents = 'none';
          introCard.style.visibility = 'hidden';
          introCard.classList.remove('active');
          cState.introTextState.lastAppliedPointerEvents = 'none';
          cState.introTextState.lastAppliedVisibility = 'hidden';
        }
      }
    }

    // ── LERP Intro Video State ──
    if (cState.introVideoState) {
      if (!activeIntroVideoEl) {
        activeIntroVideoEl = document.querySelector('.cinema-intro-card .intro-video.active');
      }

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

          if (activeIntroVideoEl.paused && document.visibilityState === 'visible') {
            const lastResume = parseFloat(activeIntroVideoEl.dataset.lastResumeAttempt || '0');
            if (nowMs - lastResume > 1000) {
              activeIntroVideoEl.dataset.lastResumeAttempt = nowMs.toString();
              const p = activeIntroVideoEl.play();
              if (p && typeof p.then === 'function') p.catch(() => {});
            }
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

      if (idx === cState.activeIdx) {
        video.style.opacity = '1';
        video.style.visibility = 'visible';
        sState.currentOpacity = 1;
        sState.targetOpacity = 1;
        sState.lastAppliedOpacity = 1;
        sState.lastAppliedVisibility = 'visible';
      } else {
        if (sState.lastAppliedVisibility !== 'visible') {
          video.style.visibility = 'visible';
          sState.lastAppliedVisibility = 'visible';
        }

        if (sState.lastAppliedOpacity !== roundedOpacity) {
          video.style.opacity = roundedOpacity;
          sState.lastAppliedOpacity = roundedOpacity;
        }
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

  // ── LOOP ENGINEERING: Lifecycle-aware tab suspension and instant self-healing ──
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      lastFrameTime = performance.now();
      triggerCinemaLoop();
      // Resume active scene video if in cinema stage
      if (!document.body.classList.contains('flag-selection-mode') && !document.body.classList.contains('portal-intro-mode')) {
        if (currentStep === 0 && activeIntroVideoEl && activeIntroVideoEl.paused) {
          activeIntroVideoEl.play().catch(() => {});
        } else if (currentStep >= 2 && currentStep <= 4) {
          const activeSc = scenes[currentStep - 2];
          if (activeSc && activeSc.video && activeSc.video.paused) {
            activeSc.video.play().catch(() => {});
          }
        }
      }
    } else {
      // Tab hidden: pause background videos and release RAF loop to conserve 100% CPU/GPU
      document.querySelectorAll('video').forEach(v => {
        if (!v.paused) {
          try { v.pause(); } catch(e) {}
        }
      });
      if (cinemaRafId) {
        cancelAnimationFrame(cinemaRafId);
        cinemaRafId = null;
      }
    }
  });

  // Custom Step-Based Touchless Navigation State
  let currentStep = 0; // Steps: 0 (Intro), 1 (Services), 2-4 (3 Scenes), 5 (Booking)
  const totalSteps = 6;
  let isTransitioning = false;


  // Central Navigation Engine: maps step changes to cinema state values
  function goToStep(targetStep, direction = 1) {
    if (targetStep < 0 || targetStep >= totalSteps) return;

    isTransitioning = true;
    currentStep = targetStep;
    window.currentCinemaStep = targetStep;

    const isPortalMode = document.body.classList.contains('portal-intro-mode') || document.body.classList.contains('flag-selection-mode');

    // Only hide portalStage and switch body modes if we are actually entering the cinema experience
    if (!isPortalMode || targetStep > 0) {
      document.body.classList.remove('flag-selection-mode', 'portal-intro-mode');
      const portalStage = document.getElementById('portal-stage');
      if (portalStage) portalStage.style.display = 'none';
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.style.display = 'block';
        mainContent.style.opacity = '1';
        mainContent.style.pointerEvents = 'all';
      }
      const navEl = document.getElementById('main-nav');
      if (navEl) {
        navEl.style.display = 'flex';
        navEl.style.opacity = '1';
        navEl.style.visibility = 'visible';
        navEl.style.pointerEvents = 'all';
      }
      setThemeColor('#000000');
    }

    // Wake up LERP loop
    triggerCinemaLoop();

    // Map step to equivalent progress (0.0 to 1.0)
    let p = 0;
    if (targetStep === 0) p = 0.0;
    else if (targetStep === 1) p = 0.30;
    else if (targetStep >= 2 && targetStep <= 4) {
      p = 0.50 + ((targetStep - 2) * (0.42 / 2));
    } else p = 0.98; // Booking reveal

    // Update progress bar
    if (navProgressBar) {
      gsap.to(navProgressBar, { scaleX: p, duration: 0.5, ease: 'power2.out' });
    }

    // Sync Lenis & ScrollTrigger scroll position to prevent ScrollTrigger resetting step on wheel
    const cinemaSection = document.getElementById('cinema-section');
    if (cinemaSection && typeof ScrollTrigger !== 'undefined') {
      const triggers = ScrollTrigger.getAll();
      const cTrigger = triggers.find(t => t.trigger === cinemaSection || (t.vars && t.vars.trigger === cinemaSection));
      if (cTrigger) {
        const targetY = cTrigger.start + p * (cTrigger.end - cTrigger.start);
        if (STATE.lenisInstance) {
          STATE.lenisInstance.scrollTo(targetY, { duration: 0.6, immediate: false });
        } else {
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      }
    }

    updateActiveNavLink(p);
    if (targetStep >= 2 && targetStep <= 4) {
      updateFloatingNavActiveScene(targetStep - 1);
    }

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
      cState.introTextState.currentOpacity = 1;

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

      const introCardElement = document.getElementById('introCard');
      if (introCardElement) {
        introCardElement.classList.add('active');
        introCardElement.style.opacity = '1';
        introCardElement.style.pointerEvents = 'all';
        introCardElement.style.visibility = 'visible';
        introCardElement.style.display = 'flex';
      }

      if (mainNav) {
        mainNav.style.display = 'flex';
        mainNav.style.opacity = 1;
        mainNav.style.visibility = 'visible';
        mainNav.style.pointerEvents = 'all';
      }

      cState.targetRadius = 120;
      cState.currentRadius = 120;
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
      const cinemaSection = document.getElementById('cinema-section');
      if (cinemaSection) {
        cinemaSection.style.display = 'block';
        cinemaSection.style.opacity = '1';
        cinemaSection.style.pointerEvents = 'all';
      }

      const bgServicesOverlay = document.getElementById('servicesTextOverlay');
      if (bgServicesOverlay) {
        bgServicesOverlay.classList.remove('active');
        bgServicesOverlay.style.display = 'none';
        bgServicesOverlay.style.opacity = '0';
        bgServicesOverlay.style.pointerEvents = 'none';
      }

      const sceneTextOverlay = document.getElementById('sceneTextOverlay');
      if (sceneTextOverlay) {
        sceneTextOverlay.style.display = 'none';
        sceneTextOverlay.style.opacity = '0';
        sceneTextOverlay.style.pointerEvents = 'none';
      }

      closeBookingScreen();
      isTransitioning = false;
      return;
    }

    // Hide heroOverlay & introCard for Step > 0
    cState.introTextState.targetOpacity = 0;
    cState.introTextState.currentOpacity = 0;
    cState.introTextState.targetOffset = 100;
    if (heroOverlay) {
      heroOverlay.style.opacity = 0;
      heroOverlay.style.pointerEvents = 'none';
      heroOverlay.style.visibility = 'hidden';
    }
    const introCardElement = document.getElementById('introCard');
    if (introCardElement) {
      introCardElement.classList.remove('active');
      introCardElement.style.opacity = 0;
      introCardElement.style.pointerEvents = 'none';
      introCardElement.style.visibility = 'hidden';
    }
    if (mainNav) mainNav.style.opacity = 1;

    // ── PHASE 3: 4 SERVICE CARDS SHOWCASE (targetStep === 1) ──
    if (targetStep === 1) {
      cState.targetRadius = 120;
      cState.currentRadius = 120;
      cState.targetX = 50;
      cState.currentX = 50;
      cState.targetY = 50;
      cState.currentY = 50;
      
      cState.activeIdx = -1;
      if (cState.sceneStates) {
        cState.sceneStates.forEach(sc => {
          if (sc) {
            sc.targetOpacity = 0;
            sc.currentOpacity = 0;
          }
        });
      }
      scenes.forEach((sc) => {
        if (sc.video) {
          sc.video.classList.remove('active');
          sc.video.style.opacity = '0';
          sc.video.style.visibility = 'hidden';
          try { sc.video.pause(); } catch(e) {}
        }
      });

      cState.activeTextBlockIdx = -1;
      textBlocks.forEach(block => block.classList.remove('active'));

      const mainNav = document.getElementById('main-nav');
      if (mainNav) {
        mainNav.style.display = 'flex';
        mainNav.style.opacity = '1';
        mainNav.style.pointerEvents = 'all';
      }

      const cinemaSection = document.getElementById('cinema-section');
      if (cinemaSection) {
        cinemaSection.style.display = 'block';
        cinemaSection.style.opacity = '1';
        cinemaSection.style.pointerEvents = 'all';
      }

      // Completely hide portal and country selection stage so no background cards bleed through
      const portalStage = document.getElementById('portal-stage');
      if (portalStage) {
        portalStage.style.display = 'none';
        portalStage.style.opacity = '0';
        portalStage.style.visibility = 'hidden';
        portalStage.style.pointerEvents = 'none';
        portalStage.classList.add('cso-hidden');
      }
      const csoOverlay = document.getElementById('country-selector-overlay');
      if (csoOverlay) {
        csoOverlay.style.display = 'none';
        csoOverlay.style.opacity = '0';
        csoOverlay.style.visibility = 'hidden';
        csoOverlay.style.pointerEvents = 'none';
        csoOverlay.classList.add('cso-hidden');
      }

      const bgServicesOverlay = document.getElementById('servicesTextOverlay');
      if (bgServicesOverlay) {
        bgServicesOverlay.classList.add('active');
        bgServicesOverlay.style.display = 'flex';
        bgServicesOverlay.style.opacity = '1';
        bgServicesOverlay.style.visibility = 'visible';
        bgServicesOverlay.style.pointerEvents = 'all';
        const ivyVid = document.getElementById('servicesIvyVideo');
        if (ivyVid) {
          ivyVid.muted = true;
          ivyVid.playsInline = true;
          try {
            const p = ivyVid.play();
            if (p && typeof p.then === 'function') p.catch(() => {});
          } catch(e) {}
        }
      }

      const sceneTextOverlay = document.getElementById('sceneTextOverlay');
      if (sceneTextOverlay) {
        sceneTextOverlay.style.display = 'none';
        sceneTextOverlay.style.opacity = '0';
        sceneTextOverlay.style.pointerEvents = 'none';
      }

      const servicesCard = document.querySelector('.services-select-card');
      if (servicesCard) {
        servicesCard.classList.add('active');
        servicesCard.style.display = 'flex';
        servicesCard.style.opacity = '1';
        servicesCard.style.visibility = 'visible';
        servicesCard.style.pointerEvents = 'all';
        servicesCard.style.transform = 'translate3d(0, 0, 0) scale(1)';
        servicesCard.style.filter = 'blur(0px)';
      }
      closeBookingScreen();
      isTransitioning = false;
      return;
    }

    // Hide services select card past Step 1
    if (servicesSelectCard) {
      servicesSelectCard.classList.remove('active');
      servicesSelectCard.style.display = 'none';
      servicesSelectCard.style.opacity = '0';
      servicesSelectCard.style.visibility = 'hidden';
      servicesSelectCard.style.pointerEvents = 'none';
    }
    const bgServicesOverlay = document.getElementById('servicesTextOverlay');
    if (bgServicesOverlay) {
      bgServicesOverlay.classList.remove('active');
      bgServicesOverlay.style.display = 'none';
      bgServicesOverlay.style.opacity = '0';
      bgServicesOverlay.style.pointerEvents = 'none';
    }

    const sceneTextOverlay = document.getElementById('sceneTextOverlay');
    if (sceneTextOverlay) {
      sceneTextOverlay.style.display = 'flex';
      sceneTextOverlay.style.opacity = '1';
      sceneTextOverlay.style.pointerEvents = 'all';
    }

    // ── PHASE 5: 3 CHARACTER VIEWS (targetStep: 2 -> 4) ──
    if (targetStep >= 2 && targetStep <= 4) {
      const activeIdx = targetStep - 2;


      
      // Auto-Opening Iris during initial transition
      // (onUpdate wakes the LERP loop: it self-suspends when settled, and these
      // tweens move the targets AFTER goToStep returns — without the wake-up the
      // scene can stay invisible even though its video is playing)
      const currentScene = scenes && scenes[activeIdx];
      if (currentScene) {
        gsap.to(cState, {
          targetRadius: 120,
          targetX: currentScene.irisX || 50,
          targetY: currentScene.irisY || 50,
          duration: 0.65,
          ease: 'power2.out',
          onUpdate: triggerCinemaLoop
        });
      }

      if (cState.activeIdx !== activeIdx) {
        cState.activeIdx = activeIdx;
        updateFloatingNavActiveScene(activeIdx + 1);
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
          gsap.killTweensOf(sState, 'targetOpacity');

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
          gsap.killTweensOf(sState, 'targetOpacity');
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
          if (cState.progressRaf) {
            cancelAnimationFrame(cState.progressRaf);
            cState.progressRaf = null;
          }
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

              cState.progressRaf = requestAnimationFrame(checkProgress);
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

    // ── PHASE 7: BOOKING REVEAL SCREEN (targetStep === 5) ──
    if (targetStep === 5) {
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
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    } else {
      goToStep(1);
    }
  };
  const stepPrev = () => {
    if (bookingRevealEl && !bookingRevealEl.hasAttribute('hidden')) {
      goToStep(4);
      return;
    }
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    } else if (currentStep === 1) {
      goToStep(totalSteps - 1);
    }
  };

  const handleCinemaTap = (e) => {
    if (portalActive()) return;

    // Fast tag check for native interactive controls (prevents DOM tree traversal overhead)
    const tag = e.target.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'LABEL' || e.target.isContentEditable) {
      return;
    }

    // Combined query selectors to reduce multiple closest() calls to a single traversal
    if (e.target.closest('#main-nav, .mobile-menu-drawer, #mobileMenuToggle, .services-select-card, .booking-reveal-screen, #services-modal, #servicesTextOverlay')) {
      return;
    }

    const activeStep = (typeof window.currentCinemaStep === 'number') ? window.currentCinemaStep : currentStep;

    // Tapping on Step 0 (Hero Intro / City screen) MUST open Step 1 (Services section)
    if (activeStep === 0) {
      if (gestureDebounced(400)) return;
      if (typeof window.goToCinemaStep === 'function') {
        window.goToCinemaStep(1);
      }
      return;
    }

    // Tapping on Step 1 (Services section) must remain in Services
    if (activeStep === 1) {
      return;
    }

    if (gestureDebounced(600)) return;
    stepNext(); // Advance to next scene on click only for cinema steps >= 2
  };

  // Bind tap events globally to capture all screen clicks (using bubbling to allow inner button clicks to fire first)
  window.addEventListener('click', handleCinemaTap);

  // Wheel: step navigation in the cinema, native scrolling inside overlays/portal
  window.addEventListener('wheel', (e) => {
    if (portalActive()) return; // portal & country selector keep native scroll
    
    // Check if Services section overlay is active
    const servicesOverlay = document.getElementById('servicesTextOverlay');
    const isServicesActive = currentStep === 1 || (servicesOverlay && servicesOverlay.classList.contains('active'));
    if (isServicesActive || e.target.closest('#servicesTextOverlay')) {
      return; // DO NOT auto-advance or jump back to city video on scroll! Fully allow native scroll inside services section.
    }

    // Performance guard: only perform DOM traversal if any overlay is active
    const isOverlayOpen = (servicesModalEl && !servicesModalEl.hasAttribute('hidden')) ||
                          (bookingRevealEl && !bookingRevealEl.hasAttribute('hidden')) ||
                          document.body.classList.contains('mobile-drawer-open');
    if (isOverlayOpen && e.target.closest('#services-modal, .booking-reveal-screen, .mobile-drawer')) return;
    
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
    
    const servicesOverlay = document.getElementById('servicesTextOverlay');
    const isServicesActive = currentStep === 1 || (servicesOverlay && servicesOverlay.classList.contains('active'));
    if (isServicesActive || e.target.closest('#servicesTextOverlay')) {
      return; // Allow native scrolling in services section without jumping back to city video
    }

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

  // Touch swipe: swipe up/left = next scene, swipe down/right = previous scene
  let touchStartY = null;
  let touchStartX = null;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0] ? e.touches[0].clientY : null;
    touchStartX = e.touches[0] ? e.touches[0].clientX : null;
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (touchStartY === null || touchStartX === null) return;
    const endY = e.changedTouches[0] ? e.changedTouches[0].clientY : touchStartY;
    const endX = e.changedTouches[0] ? e.changedTouches[0].clientX : touchStartX;
    const dy = endY - touchStartY;
    const dx = endX - touchStartX;
    touchStartY = null;
    touchStartX = null;
    if (portalActive()) return;
    
    const servicesOverlay = document.getElementById('servicesTextOverlay');
    const isServicesActive = currentStep === 1 || (servicesOverlay && servicesOverlay.classList.contains('active'));
    if (isServicesActive || e.target.closest('#servicesTextOverlay')) {
      return; // Allow native touch scroll inside services section without jumping back to city video
    }

    if (e.target.closest('#services-modal, .booking-reveal-screen, .mobile-drawer, #main-nav, input, select, textarea, button, a')) return;
    
    const absDy = Math.abs(dy);
    const absDx = Math.abs(dx);
    if (absDy < 45 && absDx < 45) return; // Short movement counts as a tap

    if (gestureDebounced(500)) return;

    if (absDy >= absDx) {
      if (dy < 0) stepNext();
      else stepPrev();
    } else {
      if (dx < 0) stepNext();
      else stepPrev();
    }
  }, { passive: true });

  // "Continue" button on the services selection card
  let isIvyTransitioning = false;
  function proceedWithIvyTransition(selectedService, e) {
    if (isIvyTransitioning) return;
    isIvyTransitioning = true;

    const currentService = selectedService || (window.STATE && window.STATE.calculator ? window.STATE.calculator.serviceType : 'standart');
    const servicesOverlay = document.getElementById('servicesTextOverlay');
    const servicesCard = document.querySelector('.services-select-card');
    const continueBtn = document.getElementById('servicesContinueBtn');
    const ivyVideo = document.getElementById('servicesIvyVideo');
    const selectedCard = document.querySelector(`.service-select-item[data-service="${currentService}"]`);

    const isPl = STATE.language === 'pl';
    const confirmingText = isPl ? 'Zatwierdzanie wyboru...' : 'Seçiminiz Onaylanıyor...';
    const continueLabel = isPl ? 'Dalej' : 'Devam Et';

    // 1. Enter Confirming / Active 2-second pause state
    if (continueBtn) {
      continueBtn.classList.add('loading');
      continueBtn.innerHTML = `<span style="font-size:1.1rem; display:inline-block;">🌿</span> <span>${confirmingText}</span>`;
    }

    // Update Stepper to completed state (Step 1 complete, line glow, Step 2 active)
    const step1 = document.getElementById('stepperStep1');
    const line1 = document.getElementById('stepperLine1');
    const step2 = document.getElementById('stepperStep2');
    if (step1) {
      step1.classList.add('completed');
      const icon = step1.querySelector('.stepper-icon');
      if (icon) icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`;
    }
    if (line1) line1.classList.add('filled');
    if (step2) step2.classList.add('active');

    // React Ivy video background (smooth zoom cadence)
    if (ivyVideo) {
      gsap.to(ivyVideo, {
        scale: 1.05,
        duration: 1.8,
        ease: 'power2.out'
      });
    }

    // Selected Card glow & pulse
    if (selectedCard) {
      gsap.to(selectedCard, {
        scale: 1.025,
        borderColor: '#38bdf8',
        boxShadow: '0 0 45px rgba(56, 189, 248, 0.7), inset 0 0 25px rgba(37, 99, 235, 0.3)',
        duration: 0.6,
        yoyo: true,
        repeat: 1,
        ease: 'power1.inOut'
      });
    }

    // Acoustic feedback sound
    if (typeof playAcousticSandSnapSound === 'function') {
      playAcousticSandSnapSound();
    }

    // 2. Fast responsive animated transition to next stage (300ms on mobile, 700ms on desktop)
    const transitionCadence = window.innerWidth <= 820 ? 280 : 750;
    setTimeout(() => {
      if (servicesCard) {
        gsap.to(servicesCard, {
          opacity: 0,
          y: -25,
          scale: 0.96,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            // Open Booking Screen Calculator pre-populated with chosen service package
            if (typeof openBookingScreen === 'function') {
              openBookingScreen();
            } else if (typeof goToStep === 'function') {
              goToStep(2);
            }

            // Restore servicesCard & continueBtn properties for when user returns
            setTimeout(() => {
              gsap.set(servicesCard, { opacity: 1, y: 0, scale: 1 });
              if (ivyVideo) {
                gsap.set(ivyVideo, { scale: 1.0 });
              }
              if (continueBtn) {
                continueBtn.classList.remove('loading');
                continueBtn.innerHTML = `<span>${continueLabel}</span> <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
              }
              isIvyTransitioning = false;
            }, 400);
          }
        });
      } else {
        if (typeof openBookingScreen === 'function') openBookingScreen();
        isIvyTransitioning = false;
      }
    }, transitionCadence);
  }
  window.proceedWithIvyTransition = proceedWithIvyTransition;

  const servicesContinueBtn = document.getElementById('servicesContinueBtn');
  if (servicesContinueBtn) {
    servicesContinueBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      proceedWithIvyTransition(STATE.calculator.serviceType || 'standart', e);
    });
  }

  // Intro card click listener to advance to Step 1 (Hizmet Seçimi) on tap anywhere
  const introCardContainer = document.getElementById('introCard');
  if (introCardContainer && !introCardContainer._boundClick) {
    introCardContainer._boundClick = true;
    introCardContainer.addEventListener('click', (e) => {
      if (e.target.closest('#floatingCtaDock, .floating-cta-dock, a')) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.goToCinemaStep === 'function') {
        window.goToCinemaStep(1);
      }
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
  const mainContent = document.getElementById('main-content');
  const portalStage = document.getElementById('portal-stage');
  const bookingEl = document.getElementById('bookingReveal');

  // Pause all running scene videos in background to save CPU and GPU resources
  if (scenes && Array.isArray(scenes)) {
    scenes.forEach(sc => {
      if (sc.video && !sc.video.paused) {
        try { sc.video.pause(); } catch(e) {}
      }
    });
  }
  const ivyVideo = document.getElementById('servicesIvyVideo');
  if (ivyVideo && !ivyVideo.paused) {
    try { ivyVideo.pause(); } catch(e) {}
  }

  // Pause Lenis smooth scroll so user can freely scroll inside overlay
  if (STATE.lenisInstance) {
    STATE.lenisInstance.stop();
  }

  // Show the booking overlay
  if (bookingEl) {
    bookingEl.removeAttribute('hidden');
    bookingEl.style.display = 'block';
    bookingEl.classList.add('active');
    bookingEl.scrollTop = 0;
    
    // Prevent event bubbling to background canvas / Lenis engine
    if (!bookingEl._scrollEventsAttached) {
      bookingEl._scrollEventsAttached = true;
      bookingEl.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: true });
      bookingEl.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: true });
    }

    if (typeof window.pushAppState === 'function') {
      window.pushAppState('booking');
    }

    gsap.fromTo(bookingEl, 
      { opacity: 0 }, 
      { opacity: 1, duration: 0.35, ease: 'power2.out' }
    );

    if (typeof window.updateRoseVineProgress === 'function') {
      setTimeout(window.updateRoseVineProgress, 150);
    }
    prefillBookingWizardWithUser();

    // 📊 Ads & Conversion Tracking: Initiate Checkout
    try {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'InitiateCheckout', { content_name: 'Cleaning Booking Wizard' });
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'begin_checkout', { event_category: 'ecommerce', event_label: 'booking_wizard' });
      }
    } catch (e) {}

    // Initialize In-Card Scroll Parallax Video Engine & Sub-Ms Loop Registration
    if (typeof window.setupInCardVideoScrollEngine === 'function') {
      window.setupInCardVideoScrollEngine();
    }
    if (typeof window.attachSubMsVideoLoop === 'function') {
      bookingEl.querySelectorAll('.wizard-card-video-bg video').forEach(v => {
        window.attachSubMsVideoLoop(v);
      });
    }
  }

  // Hide portal if visible
  if (portalStage && getComputedStyle(portalStage).display !== 'none' && getComputedStyle(portalStage).opacity !== '0') {
    gsap.to(portalStage, { opacity: 0, pointerEvents: 'none', duration: 0.4, ease: 'power2.out', onComplete: () => {
      portalStage.style.display = 'none';
    }});
  }

  // Ensure main content is visible behind the overlay
  if (mainContent && getComputedStyle(mainContent).opacity === '0') {
    mainContent.style.display = 'block';
    mainContent.style.opacity = '1';
    mainContent.style.pointerEvents = 'all';
  }

  // Hide background cinema cards overlay to prevent duplicate overlapping views
  const bgServicesOverlay = document.getElementById('servicesTextOverlay');
  if (bgServicesOverlay) {
    bgServicesOverlay.style.opacity = '0';
    bgServicesOverlay.style.pointerEvents = 'none';
  }

  // Update translations & bank selector according to active language
  const activeDict = TRANSLATIONS[STATE.language] || TRANSLATIONS.tr;
  if (typeof applyBookingTranslations === 'function') {
    applyBookingTranslations(activeDict, STATE.language);
  }
  if (typeof window.refreshBankSelector === 'function') {
    window.refreshBankSelector();
  }

  // Update prices
  updatePriceSliderDisplay();
  document.body.classList.add('wizard-modal-open', 'booking-open');
  if (typeof window.pauseCinemaLoop === 'function') window.pauseCinemaLoop();
  if (typeof window.startGardenLoop === 'function') window.startGardenLoop();
}
window.openBookingScreen = openBookingScreen;

// ==========================================
// 8. UTILITIES & SELECTION SUMMARY HELPERS
// ==========================================
function closeBookingScreen() {
  const bookingEl = document.getElementById('bookingReveal') || bookingRevealEl;
  if (bookingEl && (!bookingEl.hasAttribute('hidden') || bookingEl.classList.contains('active'))) {
    document.body.classList.remove('wizard-modal-open', 'booking-open');
    if (typeof window.stopGardenLoop === 'function') window.stopGardenLoop();
    if (typeof window.triggerCinemaLoop === 'function') window.triggerCinemaLoop();
    logDebug('Hiding booking screen.');
    bookingEl.setAttribute('hidden', '');
    bookingEl.classList.remove('active');
    bookingEl.style.display = 'none';

    if (window.history && window.history.state && window.history.state.stage === 'booking') {
      try { window.history.back(); } catch(e) {}
    }

    // Resume Lenis smooth scroll
    if (STATE.lenisInstance) {
      STATE.lenisInstance.start();
    }

    // Restore background cinema cards overlay if hidden
    const bgServicesOverlay = document.getElementById('servicesTextOverlay');
    if (bgServicesOverlay) {
      bgServicesOverlay.style.opacity = '1';
      bgServicesOverlay.style.pointerEvents = 'all';
    }

    // Restore main navigation header visibility
    const mainNav = document.getElementById('main-nav');
    if (mainNav) {
      mainNav.style.visibility = 'visible';
      gsap.to(mainNav, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    }

    const ivyVideo = document.getElementById('servicesIvyVideo');
    if (ivyVideo && ivyVideo.paused) {
      try { ivyVideo.play().catch(() => {}); } catch(e) {}
    }
  }
}
window.closeBookingScreen = closeBookingScreen;

function triggerDustCleaningEffect(targetEl) {
  return;
}
window.triggerDustCleaningEffect = triggerDustCleaningEffect;

let _sharedAudioCtx = null;
function playAcousticSandSnapSound() {
  return;
}
window.playAcousticSandSnapSound = playAcousticSandSnapSound;

function triggerShockwaveRing(clickEvent) {
  return;
}
window.triggerShockwaveRing = triggerShockwaveRing;

function selectServiceGlobal(service, clickEvent) {
  if (!service) return;
  STATE.calculator.serviceType = service;
  if (window.STATE && window.STATE.calculator) {
    window.STATE.calculator.serviceType = service;
  }
  
  // Update selection highlights & button states in all service select cards
  const selectItems = document.querySelectorAll('.service-select-item, .service-item-detail');
  selectItems.forEach(item => {
    const btnSpan = item.querySelector('.service-action-btn span');
    if (item.dataset.service === service) {
      item.classList.add('selected', 'active');
      item.setAttribute('aria-checked', 'true');
      if (btnSpan) btnSpan.textContent = 'Seçildi ✓';

      if (clickEvent) {
        triggerDustCleaningEffect(item);
        triggerShockwaveRing(clickEvent);
        playAcousticSandSnapSound();
      }
    } else {
      item.classList.remove('selected', 'active');
      item.setAttribute('aria-checked', 'false');
      if (btnSpan) btnSpan.textContent = 'Hizmeti Seç';
    }
  });

  // Update selected service summary text below Devam Et button
  const selectedServiceTextEl = document.getElementById('selectedServiceText');
  if (selectedServiceTextEl) {
    const serviceNames = {
      standart: 'Standart Temizlik',
      detayli: 'Detaylı Temizlik',
      kurumsal: 'Kurumsal Temizlik',
      ilaclama: 'Dezenfeksiyon',
      insaat_sonrasi: 'İnşaat Sonrası Temizlik',
      tasinma_sonrasi: 'Taşınma Temizliği'
    };
    const sName = serviceNames[service] || 'Standart Temizlik';
    selectedServiceTextEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> <span>${sName} seçildi</span>`;
  }

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
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  updateBookingSummaryBox();

  const isBusinessTab = document.getElementById('tabBusinessBtn')?.classList.contains('active');
  updateWizardExtrasForService(service, isBusinessTab ? 'business' : 'person');

  if (typeof updatePriceSliderDisplay === 'function') {
    updatePriceSliderDisplay();
  }

  if (typeof calculatePriceFn === 'function') {
    calculatePriceFn(service);
  }
}
window.selectServiceGlobal = selectServiceGlobal;

export function updateWizardExtrasForService(serviceType, customerType) {
  const isBusiness = customerType === 'business' || serviceType === 'kurumsal' || serviceType === 'ofis';
  const residentialGrid = document.getElementById('residentialExtrasGrid');
  const corporateGrid = document.getElementById('corporateExtrasGrid');
  const titleEl = document.getElementById('wizardExtrasSecTitle');
  const badgeEl = document.getElementById('wizardExtrasSecBadge');
  const isPl = (STATE.language || 'tr') === 'pl';

  if (isBusiness) {
    if (residentialGrid) {
      residentialGrid.style.display = 'none';
      residentialGrid.querySelectorAll('.wizard-extra-card.active').forEach(c => c.classList.remove('active'));
    }
    if (corporateGrid) {
      corporateGrid.style.display = 'grid';
      gsap.fromTo(corporateGrid, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    }
    if (titleEl) titleEl.textContent = isPl ? '🏢 OPCJE DODATKOWE DLA BIUR I FIRM' : '🏢 KURUMSAL & İŞ YERİ EKSTRA HİZMETLERİ';
    if (badgeEl) badgeEl.textContent = isPl ? 'PROTOKÓŁ B2B I PLAZA' : 'B2B PLAZA & OFİS PROTOKOLÜ';
  } else {
    if (corporateGrid) {
      corporateGrid.style.display = 'none';
      corporateGrid.querySelectorAll('.wizard-extra-card.active').forEach(c => c.classList.remove('active'));
    }
    if (residentialGrid) {
      residentialGrid.style.display = 'grid';
      gsap.fromTo(residentialGrid, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    }
    if (titleEl) titleEl.textContent = isPl ? '✨ OPCJE DODATKOWE I GŁĘBOKIE CZYSZCZENIE' : '✨ EKSTRA HİJYEN VE ÖZEL HİZMETLER';
    if (badgeEl) badgeEl.textContent = isPl ? 'KOMPLEKSOWA HIGIENA' : 'DİP KÖŞE DERİN BAKIM';
  }
}
window.updateWizardExtrasForService = updateWizardExtrasForService;

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
  const isPl = STATE.language === 'pl';
  const labels = {
    '1': dict.calcFreqSingle || (isPl ? 'Jednorazowo' : 'Tek Seferlik'),
    '0.8': dict.calcFreqWeekly || (isPl ? 'Cotygodniowe (-20% Rabat)' : 'Haftalık Düzenli (%20 İndirim)'),
    '0.9': dict.calcFreqMonthly || (isPl ? 'Miesięczne (-10% Rabat)' : 'Aylık Düzenli (%10 İndirim)')
  };
  return labels[coeff] || (isPl ? 'Regularne' : 'Düzenli');
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

  const serviceLabel = escapeHTML(getServiceLabelTranslated(serviceType, dict));
  const freqLabel = escapeHTML(getFrequencyLabelTranslated(frequency, dict));
  const extrasHtml = extras.length > 0 
    ? extras.map(ext => `<li>${escapeHTML(ext)}</li>`).join('')
    : `<li>${escapeHTML(dict.summaryNone || 'Yok')}</li>`;
    
  const layouts = isPl ? ROOM_LAYOUTS_PL : ROOM_LAYOUTS_TR;
  const layoutText = escapeHTML(layouts[parseInt(area)] || area);

  const promoHtml = STATE.calculator.promoCode ? `
    <div class="summary-row"><span>${escapeHTML(isPl ? 'Kod partnerski/rabatowy:' : 'Referans / Kupon Kodu:')}</span> <span class="summary-val" style="color: var(--clr-accent); font-weight: 700;">${escapeHTML(STATE.calculator.promoCode)}${STATE.calculator.discountRate > 0 ? (isPl ? ` (-${Math.round(STATE.calculator.discountRate * 100)}% Rabat)` : ` (%${Math.round(STATE.calculator.discountRate * 100)} İndirim)`) : ''}</span></div>
  ` : '';

  summaryBox.innerHTML = `
    <h4>${escapeHTML(dict.summaryTitle || 'SEÇİLEN DETAYLAR')}</h4>
    <div class="summary-row"><span>${escapeHTML(dict.summaryService || 'Hizmet Türü:')}</span> <span class="summary-val">${serviceLabel}</span></div>
    <div class="summary-row"><span>${escapeHTML(dict.summaryArea || (isPl ? 'Liczba pokoi / typ:' : 'Oda Sayısı / Ev Tipi:'))}</span> <span class="summary-val">${layoutText}</span></div>
    <div class="summary-row"><span>${escapeHTML(dict.summaryFrequency || 'Sıklık:')}</span> <span class="summary-val">${freqLabel}</span></div>
    ${promoHtml}
    <div class="summary-row" style="flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 8px; margin-bottom: 8px;">
      <span>${escapeHTML(dict.summaryExtras || 'Ekstralar:')}</span>
      <ul style="padding-left: 16px; margin: 0; list-style-type: square; color: var(--clr-muted); width: 100%;">
        ${extrasHtml}
      </ul>
    </div>
    <div class="summary-row"><span>${escapeHTML(dict.summaryEstimated || 'Durum:')}</span> <span class="summary-price" style="font-size: 0.95rem; color: var(--clr-accent);">${isPl ? 'OFERTA ZOSTANIE PRZYGOTOWANA' : 'TEKLİF HAZIRLANACAK'}</span></div>
  `;
  
  gsap.killTweensOf(summaryBox);
  summaryBox.style.display = 'block';
  gsap.fromTo(summaryBox, 
    { height: 0, opacity: 0, scale: 0.95, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 },
    { height: 'auto', opacity: 1, scale: 1, marginTop: 8, marginBottom: 16, paddingTop: 16, paddingBottom: 16, duration: 0.5, ease: 'power2.out' }
  );
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
      const earthVideo = document.getElementById('csoEarthVideo');
      if (earthVideo) {
        try { earthVideo.play().catch(() => {}); } catch(err) {}
      }
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
      bookingReveal.style.display = 'block';
      bookingReveal.scrollTop = 0;
      gsap.fromTo(bookingReveal,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power2.out' }
      );
      if (typeof startBookingCinematicBgEngine === 'function') {
        startBookingCinematicBgEngine();
      }
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
  'RELAXAX10': 0.10,
  'RELAXAX20': 0.20,
  'RELAX10': 0.10,
  'RELAX20': 0.20,
  'HOSGELDIN15': 0.15,
  'INDIRIM10': 0.10,
  'EMLAK10': 0.10,
  'RABAT10': 0.10,
  'RABAT20': 0.20,
  'WARSZAWA10': 0.10,
  'WARSZAWA20': 0.20
};

function setupPromoCodeLogic() {
  const promoInput = document.getElementById('cPromoCode');
  const applyBtn = document.getElementById('btnApplyPromo');
  const feedbackEl = document.getElementById('promoCodeFeedback');
  if (!promoInput || !applyBtn || !feedbackEl) return;

  async function applyCode(rawCode, isAuto = false) {
    const code = (rawCode || '').replace(/[^a-zA-Z0-9_-]/g, '').trim().toUpperCase().substring(0, 20);
    const isPl = STATE.language === 'pl';
    const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.tr;

    if (!code) {
      STATE.calculator.promoCode = null;
      STATE.calculator.discountRate = 0;
      feedbackEl.style.display = 'none';
      feedbackEl.textContent = '';
      if (typeof updateBookingSummaryBox === 'function') updateBookingSummaryBox();
      if (typeof updatePriceSliderDisplay === 'function') updatePriceSliderDisplay();
      return;
    }

    // 1. Instant Client-Side Verification for Known Promo Codes
    if (Object.prototype.hasOwnProperty.call(KNOWN_DISCOUNT_CODES, code)) {
      const discountRate = KNOWN_DISCOUNT_CODES[code];
      const discountPct = Math.round(discountRate * 100);
      STATE.calculator.promoCode = code;
      STATE.calculator.discountRate = discountRate;

      const template = dict.promoValidDiscount || '✓ Kod Uygulandı: {code} (%{discount} İndirim!)';
      feedbackEl.textContent = template.replace('{code}', code).replace('{discount}', discountPct);
      feedbackEl.style.color = '#10b981';
      feedbackEl.style.display = 'block';
      if (typeof window.playTickSound === 'function') window.playTickSound();
      if (typeof updateBookingSummaryBox === 'function') updateBookingSummaryBox();
      if (typeof updatePriceSliderDisplay === 'function') updatePriceSliderDisplay();
      logDebug('Promo code applied instantly:', code, 'Discount:', discountRate);
      return;
    }

    // 2. Try backend API verification for dynamic campaigns / referral codes
    try {
      const resp = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          lang: STATE.language || 'tr',
          currency: isPl ? 'PLN' : 'TL',
          subtotal: STATE.calculator.basePrice || 1000
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.valid) {
          const discountRate = data.type === 'percent' ? (data.discount / 100) : 0.15;
          STATE.calculator.promoCode = code;
          STATE.calculator.discountRate = discountRate;
          feedbackEl.textContent = `✓ ${data.message || data.title}`;
          feedbackEl.style.color = '#10b981';
          feedbackEl.style.display = 'block';
          if (typeof window.playTickSound === 'function') window.playTickSound();
          if (typeof updateBookingSummaryBox === 'function') updateBookingSummaryBox();
          if (typeof updatePriceSliderDisplay === 'function') updatePriceSliderDisplay();
          return;
        }
      }
    } catch(e) {
      logDebug('Backend promo check fallback:', e);
    }

    // 3. Fallback tracking reference code
    STATE.calculator.promoCode = code;
    STATE.calculator.discountRate = 0;
    const template = dict.promoValidTracking || '✓ Referans Kodu Kaydedildi ({code})';
    feedbackEl.textContent = template.replace('{code}', code);
    feedbackEl.style.color = '#38bdf8';
    feedbackEl.style.display = 'block';

    if (typeof updateBookingSummaryBox === 'function') updateBookingSummaryBox();
    if (typeof updatePriceSliderDisplay === 'function') updatePriceSliderDisplay();
    logDebug('Promo / Affiliate code applied:', code, 'Discount:', STATE.calculator.discountRate);
  }

  window.applyGlobalPromoCode = applyCode;

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

      // 🤝 Canlı Affiliate & Satış Ortaklığı Tıklanma Loglayıcı
      try {
        fetch('/api/affiliate/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refCode: refParam.toUpperCase() })
        }).catch(() => {});
      } catch (e) {}
    }
  } catch (err) {
    logErrorDebug('Error parsing URL referral parameter:', err);
  }
}

function updatePriceSliderDisplay() {
  const isPl = (STATE.language || 'tr') === 'pl';
  const currency = isPl ? ' PLN' : ' TL';
  const isBusiness = document.getElementById('tabBusinessBtn')?.classList.contains('active');

  // Room & Bath Counts
  const roomElem = document.getElementById('roomVal');
  const bathElem = document.getElementById('bathVal');
  const roomCount = roomElem ? (parseInt(roomElem.textContent) || 1) : 1;
  const bathCount = bathElem ? (parseInt(bathElem.textContent) || 1) : 1;

  // Active Service Preset (Standart vs Detaylı vs Taşınma vs İnşaat)
  const activePresetCard = document.querySelector('.wizard-service-preset-card.active');
  const servicePreset = (activePresetCard?.dataset?.servicePreset || STATE.calculator?.serviceType || 'standart').toLowerCase();

  // Base rate calculation:
  // - Standart: Base 1.850 TL / 219 PLN (Home) | 2.450 TL / 289 PLN (Business) | Room/Bath: 350 TL / 49-55 PLN
  // - Detaylı:  Base 2.450 TL / 289 PLN (Home) | 3.150 TL / 369 PLN (Business) | Room/Bath: 450 TL / 65-70 PLN
  // - Taşınma:  Base 2.750 TL / 319 PLN (Home) | 3.450 TL / 399 PLN (Business) | Room/Bath: 450 TL / 65-70 PLN
  // - İnşaat:   Base 3.350 TL / 389 PLN (Home) | 4.250 TL / 499 PLN (Business) | Room/Bath: 550 TL / 75-80 PLN
  let baseCalc = 0;
  if (isPl) {
    let baseRate = isBusiness ? 289.00 : 219.00;
    let roomRate = 49.00;
    let bathRate = 55.00;

    if (servicePreset === 'detayli') {
      baseRate = isBusiness ? 369.00 : 289.00;
      roomRate = 65.00;
      bathRate = 70.00;
    } else if (servicePreset === 'tasinma' || servicePreset === 'tasinma_sonrasi') {
      baseRate = isBusiness ? 399.00 : 319.00;
      roomRate = 65.00;
      bathRate = 70.00;
    } else if (servicePreset === 'insaat' || servicePreset === 'insaat_sonrasi') {
      baseRate = isBusiness ? 499.00 : 389.00;
      roomRate = 75.00;
      bathRate = 80.00;
    }

    baseCalc = baseRate + (roomCount - 1) * roomRate + (bathCount - 1) * bathRate;
  } else {
    let baseRate = isBusiness ? 2450.00 : 1850.00;
    let roomRate = 350.00;
    let bathRate = 350.00;

    if (servicePreset === 'detayli') {
      baseRate = isBusiness ? 3150.00 : 2450.00;
      roomRate = 450.00;
      bathRate = 450.00;
    } else if (servicePreset === 'tasinma' || servicePreset === 'tasinma_sonrasi') {
      baseRate = isBusiness ? 3450.00 : 2750.00;
      roomRate = 450.00;
      bathRate = 450.00;
    } else if (servicePreset === 'insaat' || servicePreset === 'insaat_sonrasi') {
      baseRate = isBusiness ? 4250.00 : 3350.00;
      roomRate = 550.00;
      bathRate = 550.00;
    }

    baseCalc = baseRate + (roomCount - 1) * roomRate + (bathCount - 1) * bathRate;
  }

  // Kitchen Discount
  const isSmallKitchen = document.getElementById('chkKitchenSmall')?.checked;
  if (isSmallKitchen) {
    baseCalc -= isPl ? 20.00 : 150.00;
  }

  // Villa Multiplier (x1.25)
  const isVilla = document.getElementById('chkVilla')?.checked;
  if (isVilla) {
    baseCalc *= 1.25;
  }

  // Extras sum
  let extraSum = 0;
  const selectedExtraNames = [];

  // Duplex Option (+300 TL / +45 PLN)
  const isDuplex = document.getElementById('chkDuplex')?.checked;
  if (isDuplex) {
    extraSum += isPl ? 45.00 : 300.00;
    selectedExtraNames.push(isPl ? 'Mieszkanie dwupoziomowe' : 'Dubleks / Çatı Katı');
  }

  const activeExtraCards = document.querySelectorAll('.wizard-extra-card.active, .extra-btn.active');
  activeExtraCards.forEach(card => {
    const priceVal = isPl ? parseFloat(card.dataset.pricePl) : parseFloat(card.dataset.priceTr);
    let count = 1;
    const countEl = card.querySelector('.ec-val');
    if (countEl) {
      count = parseInt(countEl.textContent) || 1;
    }
    extraSum += (priceVal || 0) * count;
    const name = card.querySelector('.w-extra-name, .extra-label-text')?.textContent;
    if (name) selectedExtraNames.push(count > 1 ? `${name} (${count})` : name);
  });

  // Boutique Catalog Items from Side Drawer:
  const selectedBcdCards = document.querySelectorAll('.bcd-product-card.is-selected');
  let bcdTotal = 0;
  let bcdCount = 0;
  selectedBcdCards.forEach(card => {
    const priceVal = isPl ? parseFloat(card.dataset.pricePl) : parseFloat(card.dataset.priceTr);
    let qty = 1;
    const qtyEl = card.querySelector('.bcd-qty-num');
    if (qtyEl) {
      qty = parseInt(qtyEl.textContent) || 1;
    }
    const itemTotal = (priceVal || 0) * qty;
    extraSum += itemTotal;
    bcdTotal += itemTotal;
    bcdCount += qty;
    const name = card.querySelector('.bcd-p-name')?.textContent || 'Butik Ürün';
    selectedExtraNames.push(qty > 1 ? `🛍️ ${name} (${qty})` : `🛍️ ${name}`);
  });

  // Update Drawer Summary and Strip Badge:
  const bcdSumVal = document.getElementById('bcdSummaryVal');
  if (bcdSumVal) {
    bcdSumVal.textContent = isPl ? `${bcdCount} Produkt (${bcdTotal.toFixed(2)} PLN)` : `${bcdCount} Ürün (+${bcdTotal.toLocaleString('tr-TR')} TL)`;
  }
  const wbcsSelectedBadge = document.getElementById('wbcsSelectedBadge');
  if (wbcsSelectedBadge) {
    if (bcdCount > 0) {
      wbcsSelectedBadge.style.display = 'inline-flex';
      wbcsSelectedBadge.textContent = isPl ? `🛍️ ${bcdCount} Butik Produkt (+${bcdTotal.toFixed(2)} PLN)` : `🛍️ ${bcdCount} Butik Ürün Eklendi (+${bcdTotal.toLocaleString('tr-TR')} TL)`;
    } else {
      wbcsSelectedBadge.style.display = 'none';
    }
  }

  // Vacuum cleaner option (+400 TL / +45 PLN)
  const vacuumChk = document.getElementById('chkVacuum');
  if (vacuumChk && vacuumChk.checked) {
    extraSum += isPl ? 45.00 : 400.00;
    selectedExtraNames.push(isPl ? 'Profesjonalny odkurzacz HEPA' : 'Profesyonel Elektrikli Süpürge Temini');
  }

  // 2-Person Team Preference (+550 TL / +79 PLN)
  const isTeamPref = document.querySelector('input[name="staffPref"][value="team"]')?.checked;
  if (isTeamPref) {
    extraSum += isPl ? 79.00 : 550.00;
    selectedExtraNames.push(isPl ? 'Zespół 2-osobowy' : '2 Kişilik Uzman Ekip');
  }

  // Frequency Discount Card calculation
  const activeFreqCard = document.querySelector('.wizard-freq-card.active');
  const freqType = activeFreqCard ? activeFreqCard.dataset.freq : 'tekseferlik';
  
  let freqDiscountRate = 1.00;
  if (freqType === 'haftalik') freqDiscountRate = 0.80; // -20%
  else if (freqType === 'ikahaftada') freqDiscountRate = 0.85; // -15%
  else if (freqType === 'aylik') freqDiscountRate = 0.90; // -10%

  const grossTotal = baseCalc + extraSum;
  let finalNetTotal = (baseCalc * freqDiscountRate) + extraSum;

  // Payment Method Discount (%5 discount for bank transfer / Havale / EFT / BLIK / FAST)
  const currentPayMethod = document.getElementById('payMethodInput')?.value || 'transfer';
  if (currentPayMethod === 'transfer' || currentPayMethod === 'blik' || currentPayMethod === 'fast') {
    finalNetTotal *= 0.95;
  }

  // Check for promo code discount
  if (STATE.calculator.discountRate > 0) {
    finalNetTotal *= (1 - STATE.calculator.discountRate);
  }

  // Update Frequency Cards Prices Live (including active promo discount if present)
  const elW = document.getElementById('freqValWeekly');
  const elB = document.getElementById('freqValBiweekly');
  const elM = document.getElementById('freqValMonthly');
  const elO = document.getElementById('freqValOnce');

  const formatMoney = (val) => {
    const rounded = Math.round((val + Number.EPSILON) * 100) / 100;
    if (isPl) {
      return rounded.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN';
    } else {
      return rounded.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
    }
  };
  const promoMultiplier = STATE.calculator.discountRate > 0 ? (1 - STATE.calculator.discountRate) : 1;

  if (elW) elW.textContent = formatMoney((baseCalc * 0.80 + extraSum) * promoMultiplier);
  if (elB) elB.textContent = formatMoney((baseCalc * 0.85 + extraSum) * promoMultiplier);
  if (elM) elM.textContent = formatMoney((baseCalc * 0.90 + extraSum) * promoMultiplier);
  if (elO) elO.textContent = formatMoney((baseCalc * 1.00 + extraSum) * promoMultiplier);

  // Update Live Itemized Breakdown Details
  const valBaseDetailEl = document.getElementById('valBaseDetail');
  if (valBaseDetailEl) {
    valBaseDetailEl.textContent = formatMoney(grossTotal);
  }

  const rowFreqDiscountEl = document.getElementById('rowFreqDiscount');
  const valFreqDiscountEl = document.getElementById('valFreqDiscount');
  const lblFreqDiscountTextEl = document.getElementById('lblFreqDiscountText');
  if (rowFreqDiscountEl && valFreqDiscountEl) {
    if (freqDiscountRate < 1.0) {
      const discountAmt = baseCalc * (1 - freqDiscountRate);
      const discountPct = Math.round((1 - freqDiscountRate) * 100);
      if (lblFreqDiscountTextEl) {
        lblFreqDiscountTextEl.textContent = isPl ? `Zniżka częstotliwości (-${discountPct}%):` : `Sıklık İndirimi (-%${discountPct}):`;
      }
      valFreqDiscountEl.textContent = `-${formatMoney(discountAmt)}`;
      rowFreqDiscountEl.style.display = 'flex';
    } else {
      rowFreqDiscountEl.style.display = 'none';
    }
  }

  const rowTransferDiscountEl = document.getElementById('rowTransferDiscount');
  const valTransferDiscountEl = document.getElementById('valTransferDiscount');
  const lblTransferDiscountTextEl = document.getElementById('lblTransferDiscountText');
  if (rowTransferDiscountEl && valTransferDiscountEl) {
    if (currentPayMethod === 'transfer' || currentPayMethod === 'blik' || currentPayMethod === 'fast') {
      const transferDiscountAmt = ((baseCalc * freqDiscountRate) + extraSum) * 0.05;
      if (lblTransferDiscountTextEl) {
        lblTransferDiscountTextEl.textContent = isPl ? 'Zniżka płatności przelew/BLIK (-5%):' : 'Havale / EFT / FAST İndirimi (-%5):';
      }
      valTransferDiscountEl.textContent = isPl ? `-5% Natychmiast (-${formatMoney(transferDiscountAmt)})` : `-%5 Anında (-${formatMoney(transferDiscountAmt)})`;
      rowTransferDiscountEl.style.display = 'flex';
    } else {
      rowTransferDiscountEl.style.display = 'none';
    }
  }

  const rowPromoDiscountEl = document.getElementById('rowPromoDiscount');
  const valPromoDiscountEl = document.getElementById('valPromoDiscount');
  const lblPromoDiscountTextEl = document.getElementById('lblPromoDiscountText');
  if (rowPromoDiscountEl && valPromoDiscountEl) {
    if (STATE.calculator.discountRate > 0) {
      const promoPct = Math.round(STATE.calculator.discountRate * 100);
      if (lblPromoDiscountTextEl) {
        lblPromoDiscountTextEl.textContent = isPl ? `Kod promocyjny (-${promoPct}%):` : `Promosyon Kodu (-%${promoPct}):`;
      }
      valPromoDiscountEl.textContent = isPl ? `-${promoPct}% Rabat` : `-%${promoPct} Kupon İndirimi`;
      rowPromoDiscountEl.style.display = 'flex';
    } else {
      rowPromoDiscountEl.style.display = 'none';
    }
  }

  // Update Summary Text
  const summaryEl = document.getElementById('wizardSummaryText');
  if (summaryEl) {
    const presetNames = {
      standart: isPl ? 'Standardowe Sprzątanie' : 'Standart Temizlik',
      detayli: isPl ? 'Głębokie / Wiosenne Sprzątanie' : 'Detaylı / Bahar Temizliği',
      tasinma: isPl ? 'Sprzątanie po Przeprowadzce' : 'Taşınma / Boş Ev Temizliği',
      tasinma_sonrasi: isPl ? 'Sprzątanie po Przeprowadzce' : 'Taşınma / Boş Ev Temizliği',
      insaat: isPl ? 'Sprzątanie po Remoncie' : 'İnşaat / Tadilat Sonrası Temizlik',
      insaat_sonrasi: isPl ? 'Sprzątanie po Remoncie' : 'İnşaat / Tadilat Sonrası Temizlik'
    };
    const currentPresetName = presetNames[servicePreset] || presetNames.standart;

    if (isBusiness) {
      summaryEl.textContent = isPl
        ? `${currentPresetName}: ${roomCount} biuro / pomieszczenie, ${bathCount} łazienka`
        : `${currentPresetName}: ${roomCount} çalışma odası/ofis alanı, ${bathCount} banyo/WC`;
    } else {
      summaryEl.textContent = isPl
        ? `${currentPresetName}: ${roomCount} pokój, ${bathCount} łazienka, kuchnia i przedpokój`
        : `${currentPresetName}: ${roomCount} oda, ${bathCount} banyo, mutfak ve hol`;
    }
  }

  const baseDisplayEl = document.getElementById('wizardBasePriceDisplay');
  if (baseDisplayEl) {
    baseDisplayEl.textContent = formatMoney(grossTotal);
  }

  const grossDisplayEl = document.getElementById('wizardGrossPrice');
  if (grossDisplayEl) {
    grossDisplayEl.textContent = formatMoney(grossTotal);
  }

  const finalDisplayEl = document.getElementById('wizardFinalPrice');
  const mobStickyPriceEl = document.getElementById('mobileStickyPrice');
  if (finalDisplayEl) {
    finalDisplayEl.textContent = formatMoney(finalNetTotal);
  }
  if (mobStickyPriceEl) {
    mobStickyPriceEl.textContent = formatMoney(finalNetTotal);
  }

  // Update 3D Secure modal amount display if present
  const modal3dAmountEl = document.getElementById('modal3dAmount');
  if (modal3dAmountEl) {
    modal3dAmountEl.textContent = formatMoney(finalNetTotal);
  }

  // Calculate Duration & Staffing
  const staffPrefTeam = document.querySelector('input[name="staffPref"][value="team"]')?.checked;
  const staffCount = (staffPrefTeam || roomCount >= 4) ? 2 : (roomCount >= 6 ? 3 : 1);
  const staffCountEl = document.getElementById('estStaffCount');
  if (staffCountEl) {
    staffCountEl.textContent = isPl
      ? `${staffCount} certyfikowany specjalista`
      : `${staffCount} Sertifikalı Uzman`;
  }

  const durationHours = Math.max(2.5, 2.5 + (roomCount - 1) * 0.4 + (bathCount - 1) * 0.3 + selectedExtraNames.length * 0.25);
  const durationEl = document.getElementById('wizardDurationText');
  if (durationEl) {
    durationEl.textContent = `~${durationHours.toFixed(1).replace('.0', '')} ${isPl ? 'godz.' : 'saat'}`;
  }

  // Update selected extras list in sidebar
  const selectedExtrasWrap = document.getElementById('wizardSelectedExtrasList');
  if (selectedExtrasWrap) {
    if (selectedExtraNames.length > 0) {
      selectedExtrasWrap.innerHTML = `<div style="font-size: 0.82rem; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">✨ ${isPl ? 'Wybrane usługi dodatkowe:' : 'Seçilen Ek Hizmetler:'}</div>` +
        `<div style="display:flex; flex-wrap:wrap; gap:6px;">` +
        selectedExtraNames.map(n => `<span style="font-size:0.75rem; color:#f1f5f9; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.25); border-radius:6px; padding:3px 8px; font-weight:600;">✓ ${escapeHTML(n)}</span>`).join('') +
        `</div>`;
      selectedExtrasWrap.style.display = 'block';
    } else {
      selectedExtrasWrap.style.display = 'none';
    }
  }

  // Sync to STATE
  STATE.calculator.applied = true;
  STATE.calculator.area = roomCount;
  STATE.calculator.price = isPl ? parseFloat(finalNetTotal.toFixed(2)) : Math.round(finalNetTotal);
}

function updatePriceSliderConfig() {
  updatePriceSliderDisplay();
}

function setupBookingReveal() {
  const form = document.getElementById('bookingForm');
  const successState = document.getElementById('bookingSuccessState');
  const okBtn = document.getElementById('successOkBtn');
  const btnSubmit = document.getElementById('btnSubmitBooking');

  // 🌹 Ultra-Luxury Rose & Botanical Root Vine Scroll Progression System 🌹
  // 🌹 Ultra-Luxury Multi-Node Botanical Rose Garden Scattered Bloom Engine 🌹
  function initRoseScrollVineSystem() {
    return; // Roses completely removed as per user request
    const bookingScreen = document.getElementById('bookingReveal');
    if (!bookingScreen) return;

    const canvas = document.getElementById('roseGardenCanvas');
    const petalsOverlay = document.getElementById('rosePetalsOverlay');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    const TOTAL_FRAMES = 60;
    const frames = new Array(TOTAL_FRAMES);

    let hasLoadedFirst = false;

    // 🌹 4 Distinct High-Definition Botanical Rose Bloom Angles (0: Classic, 1: 4K Side 3/4, 2: Animation Tilt, 3: Over-head Green) 🌹
    const roseAnglePacks = [
      { prefix: '/images/bloom_rose_frames/rose_', count: 60 },
      { prefix: '/images/bloom_rose_frames_angle1/rose_', count: 30 },
      { prefix: '/images/bloom_rose_frames_angle2/rose_', count: 30 },
      { prefix: '/images/bloom_rose_frames_angle3/rose_', count: 30 }
    ];

    const roseAngleFrames = roseAnglePacks.map(pack => {
      const arr = new Array(pack.count);
      for (let i = 0; i < pack.count; i++) {
        const img = new Image();
        const numStr = String(i).padStart(3, '0');
        img.src = `${pack.prefix}${numStr}.webp`;
        img.onload = () => {
          if (!hasLoadedFirst) {
            hasLoadedFirst = true;
            renderGarden();
          }
        };
        arr[i] = img;
      }
      return arr;
    });

    // 🌿 16 Diverse Botanical Vine Tendril & Leaf Assets 🌿
    const TOTAL_VINE_ASSETS = 16;
    const vineAssets = new Array(TOTAL_VINE_ASSETS);
    for (let i = 0; i < TOTAL_VINE_ASSETS; i++) {
      const vImg = new Image();
      vImg.src = `/images/vines/vine_asset_${i + 1}.png`;
      vineAssets[i] = vImg;
    }

    // 🌿 Realistic Main Rose Stem with Thorns and Foliage 🌿
    const mainStemImg = new Image();
    mainStemImg.src = '/images/vines/main_rose_stem.png';

    // 🌿 Botanical Vine Tendril Nodes (Spirals, climbing curls, and leafy shoots)
    // 🌿 Botanical Vine Tendril Nodes (Single Clean Vertical Line)
    const botanicalTendrilNodes = [];
    const TOTAL_TENDRILS_PER_SIDE = 60;
    const TENDRIL_STEP_Y = 140;

    // Left Flank Vine Tendrils (Single Line)
    for (let i = 0; i < TOTAL_TENDRILS_PER_SIDE; i++) {
      const yPx = 40 + i * TENDRIL_STEP_Y;
      const assetIdx = i % TOTAL_VINE_ASSETS;
      const size = 80 + (i % 4) * 14;
      const rot = ((i * 47) % 60) - 30;
      botanicalTendrilNodes.push({
        side: 'left',
        lane: 0,
        yPx,
        assetIdx,
        size,
        rot,
        swaySpeed: 0.00016 + (i % 3) * 0.00004,
        swayPhase: i * 0.75
      });
    }

    // Right Flank Vine Tendrils (Single Line)
    for (let i = 0; i < TOTAL_TENDRILS_PER_SIDE; i++) {
      const yPx = 70 + i * TENDRIL_STEP_Y;
      const assetIdx = (i + 4) % TOTAL_VINE_ASSETS;
      const size = 80 + ((i + 1) % 4) * 14;
      const rot = (((i + 2) * 47) % 60) - 30;
      botanicalTendrilNodes.push({
        side: 'right',
        lane: 0,
        yPx,
        assetIdx,
        size,
        rot,
        swaySpeed: 0.00016 + ((i + 1) % 3) * 0.00004,
        swayPhase: (i + 2) * 0.75
      });
    }

    // 🌹 Ultra-Dense Royal Botanical Rose Garden (Single Elegant Line / Tek Satır) 🌹
    const roseGardenNodes = [];
    const TOTAL_ROSES_PER_SIDE = 80;
    const STEP_Y = 110; // Spaced evenly along the single vertical line

    // Generate Left Flank Roses in a single line
    for (let i = 0; i < TOTAL_ROSES_PER_SIDE; i++) {
      const yPx = 50 + i * STEP_Y;
      const angleVariant = i % 4; // Cycles through 4 rose angles
      const size = 120 + (i % 3) * 20; // Opulent 120px - 160px
      const rot = ((i * 37) % 40) - 20;
      roseGardenNodes.push({
        side: 'left',
        lane: 0,
        angleVariant,
        yPx,
        size,
        rot,
        currentProgress: 0,
        targetProgress: 0
      });
    }

    // Generate Right Flank Roses in a single line
    for (let i = 0; i < TOTAL_ROSES_PER_SIDE; i++) {
      const yPx = 65 + i * STEP_Y;
      const angleVariant = (i + 2) % 4;
      const size = 120 + ((i + 1) % 3) * 20;
      const rot = (((i + 2) * 37) % 40) - 20;
      roseGardenNodes.push({
        side: 'right',
        lane: 0,
        angleVariant,
        yPx,
        size,
        rot,
        currentProgress: 0,
        targetProgress: 0
      });
    }

    function resizeCanvas() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = (bookingScreen && bookingScreen.clientWidth) || window.innerWidth || 1200;
      const h = (bookingScreen && bookingScreen.clientHeight) || window.innerHeight || 800;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function drawBotanicalLeaf(ctx, x, y, angleDeg, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((angleDeg * Math.PI) / 180);

      // Subtle natural leaf shadow
      ctx.shadowColor = 'rgba(15, 35, 20, 0.22)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      // Leaf body dual-tone curve
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size * 0.32, -size * 0.42, size * 0.72, -size * 0.25, size, 0);
      ctx.bezierCurveTo(size * 0.72, size * 0.25, size * 0.32, size * 0.42, 0, 0);
      
      const grad = ctx.createLinearGradient(0, -size * 0.3, size, size * 0.3);
      grad.addColorStop(0, '#193826');
      grad.addColorStop(0.5, '#2d6a4f');
      grad.addColorStop(1, '#40916c');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#163322';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Leaf center rib & delicate side veins
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 0.88, 0);
      ctx.strokeStyle = '#74c69d';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // Delicate lateral side veins
      ctx.beginPath();
      ctx.moveTo(size * 0.3, 0);
      ctx.lineTo(size * 0.5, -size * 0.15);
      ctx.moveTo(size * 0.3, 0);
      ctx.lineTo(size * 0.5, size * 0.15);
      ctx.moveTo(size * 0.55, 0);
      ctx.lineTo(size * 0.72, -size * 0.12);
      ctx.moveTo(size * 0.55, 0);
      ctx.lineTo(size * 0.72, size * 0.12);
      ctx.strokeStyle = 'rgba(116, 198, 157, 0.5)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      
      ctx.restore();
    }

    function drawRoseCalyxSepals(ctx, x, y, angleDeg, scaleFactor, bloomProgress) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((angleDeg * Math.PI) / 180);
      
      // 1. Soft radial ambient occlusion shadow behind rose head to fuse it with stem
      const shadowGrad = ctx.createRadialGradient(0, 0, 4 * scaleFactor, 0, 0, 32 * scaleFactor);
      shadowGrad.addColorStop(0, 'rgba(15, 30, 20, 0.45)');
      shadowGrad.addColorStop(0.6, 'rgba(15, 30, 20, 0.15)');
      shadowGrad.addColorStop(1, 'rgba(15, 30, 20, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 32 * scaleFactor, 0, Math.PI * 2);
      ctx.fill();

      const sepalSize = (24 + 10 * bloomProgress) * scaleFactor;
      
      // 5 Realistic Botanical Calyx Sepals embracing the rose base naturally
      drawBotanicalLeaf(ctx, 0, 0, -140, sepalSize * 1.05);
      drawBotanicalLeaf(ctx, 0, 0, -80, sepalSize * 0.95);
      drawBotanicalLeaf(ctx, 0, 0, -20, sepalSize * 1.0);
      drawBotanicalLeaf(ctx, 0, 0, 50, sepalSize * 0.9);
      drawBotanicalLeaf(ctx, 0, 0, 110, sepalSize * 1.0);
      
      // Receptacle bulb (green stem node base)
      ctx.beginPath();
      ctx.arc(0, 0, 9 * scaleFactor, 0, Math.PI * 2);
      const bulbGrad = ctx.createRadialGradient(-2 * scaleFactor, -2 * scaleFactor, 1, 0, 0, 9 * scaleFactor);
      bulbGrad.addColorStop(0, '#52b788');
      bulbGrad.addColorStop(0.7, '#2d6a4f');
      bulbGrad.addColorStop(1, '#1b4332');
      ctx.fillStyle = bulbGrad;
      ctx.fill();
      ctx.strokeStyle = '#143020';
      ctx.lineWidth = 1.0;
      ctx.stroke();
      
      ctx.restore();
    }

    function drawStemBranch(ctx, startX, startY, endX, endY, scaleFactor, bloomProgress) {
      const isLeft = startX < endX;
      // Natural organic bezier curve trajectory
      const cp1X = startX + (isLeft ? 26 : -26) * scaleFactor;
      const cp1Y = startY + 14 * scaleFactor;
      const cp2X = endX + (isLeft ? -30 : 30) * scaleFactor;
      const cp2Y = endY + 22 * scaleFactor;

      const growthProgress = 0.55 + 0.45 * bloomProgress;
      const branchWidth = Math.max(2.4, 4.8 * scaleFactor * growthProgress);

      ctx.save();
      // Branch Drop Shadow
      ctx.shadowColor = 'rgba(15, 30, 20, 0.25)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 2;

      // Outer bark
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
      ctx.strokeStyle = '#1b4332';
      ctx.lineWidth = branchWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.shadowColor = 'transparent';

      // Inner chlorophyll highlight
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
      ctx.strokeStyle = '#40916c';
      ctx.lineWidth = Math.max(1.0, 1.8 * scaleFactor * growthProgress);
      ctx.stroke();

      // Natural leaf clusters along the branch
      const mid1X = (startX * 0.6 + cp1X * 0.4);
      const mid1Y = (startY * 0.6 + cp1Y * 0.4);
      const mid2X = (cp2X * 0.4 + endX * 0.6);
      const mid2Y = (cp2Y * 0.4 + endY * 0.6);

      drawBotanicalLeaf(ctx, mid1X, mid1Y, (isLeft ? -45 : 45), 24 * scaleFactor * growthProgress);
      drawBotanicalLeaf(ctx, mid2X, mid2Y, (isLeft ? 38 : -38), 28 * scaleFactor * growthProgress);
      ctx.restore();
    }

    let gardenRafId = null;
    let cachedW = 0;
    let cachedH = 0;
    let cachedDpr = 1;

    const updateGardenDimensions = () => {
      cachedDpr = Math.min(window.devicePixelRatio || 1, 2);
      cachedW = (bookingScreen && bookingScreen.clientWidth) || window.innerWidth || 1200;
      cachedH = (bookingScreen && bookingScreen.clientHeight) || window.innerHeight || 800;
      if (canvas.width !== cachedW * cachedDpr || canvas.height !== cachedH * cachedDpr) {
        canvas.width = cachedW * cachedDpr;
        canvas.height = cachedH * cachedDpr;
      }
    };
    updateGardenDimensions();
    window.addEventListener('resize', updateGardenDimensions, { passive: true });

    function renderGarden() {
      if (!ctx || !bookingScreen || bookingScreen.style.display === 'none') return;
      
      const w = cachedW || bookingScreen.clientWidth || 1200;
      const h = cachedH || bookingScreen.clientHeight || 800;
      const dpr = cachedDpr || 1;
      const scrollTop = bookingScreen.scrollTop || 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Responsive scaling for small/medium mobile and desktop viewports
      const isMob = w < 768;
      const scaleFactor = w < 480 ? 0.32 : (isMob ? 0.44 : (w < 1200 ? 0.85 : 1.0));

      // Calculate active central booking card boundaries to position flank roses with 100% page harmony
      const cardWidth = isMob ? (w - 24) : Math.min(1240, Math.max(320, w - 40));
      const cardLeft = Math.max(8, (w - cardWidth) / 2);
      const cardRight = Math.min(w - 8, cardLeft + cardWidth);

      // Dedicated breathing margin between cards and flanking botanical rose garden
      const CARD_MARGIN = isMob ? 2 : Math.min(48 * scaleFactor, cardLeft * 0.25);
      const availLeft = Math.max(10, cardLeft - CARD_MARGIN);
      const rightStart = cardRight + CARD_MARGIN;
      const availRight = Math.max(10, w - rightStart);

      // Dynamic Left & Right Margins for Living Root Trellises
      const lTrunk1 = isMob ? 4 : Math.max(14, availLeft * 0.28);
      const lTrunk2 = isMob ? 10 : Math.max(26, availLeft * 0.75);
      const rTrunk1 = isMob ? (w - 10) : (rightStart + availRight * 0.25);
      const rTrunk2 = isMob ? (w - 4) : (rightStart + availRight * 0.72);

      const timeNow = performance.now();

      const getTrunkX = (baseX, phase, y) => {
        // Ultra-slow, serene organic drift
        const breathingOffset = Math.sin(timeNow * 0.00022 + phase * 0.03) * (1.2 * scaleFactor);
        return baseX + Math.sin((y + scrollTop + phase) * 0.005 + timeNow * 0.00015) * (7 * scaleFactor) + breathingOffset;
      };

      // 100% Solid Opacity - Zero transparency on roses and authentic botanical branches
      ctx.save();
      ctx.globalAlpha = 1.0;

      const drawTrunk = (baseX, phase, isRight) => {
        // 🌿 100% Authentic User-Provided Rose Branch with Thorns & Foliage (No synthetic stroke lines) 🌿
        if (mainStemImg && mainStemImg.complete && mainStemImg.naturalWidth > 0) {
          const segmentH = 460 * scaleFactor;
          const segmentW = 236 * scaleFactor;
          const startY = Math.floor((-scrollTop - 100) / segmentH) * segmentH + (phase % segmentH);
          
          for (let y = startY; y <= scrollTop + h + segmentH; y += segmentH) {
            const screenStemY = y - scrollTop;
            if (screenStemY + segmentH < -100 || screenStemY > h + 100) continue;
            const actualX = getTrunkX(baseX, phase, screenStemY + segmentH * 0.5);
            // Ultra-slow, gentle majestic branch sway
            const stemSway = Math.sin(timeNow * 0.00018 + phase * 0.04) * 1.1;

            ctx.save();
            ctx.translate(actualX, screenStemY + segmentH * 0.5);
            if (isRight) {
              ctx.scale(-1, 1);
            }
            ctx.rotate((stemSway * Math.PI) / 180);
            if (!isMob) {
              ctx.shadowColor = 'rgba(15, 35, 20, 0.25)';
              ctx.shadowBlur = 10;
              ctx.shadowOffsetY = 4;
            }
            ctx.drawImage(mainStemImg, -segmentW * 0.5, -segmentH * 0.5, segmentW, segmentH);
            ctx.restore();
          }
        }
      };

      // 🌿 Draw Single Majestic Climbing Rose Trunk on Left and Right 🌿
      drawTrunk(lTrunk1, 0, false);
      drawTrunk(rTrunk2, 100, true);

      // 🌿 1.5 Draw 16 High-Fidelity Botanical Vine Tendril Sprites along the Single Trellis 🌿
      for (let i = 0; i < botanicalTendrilNodes.length; i++) {
        const tNode = botanicalTendrilNodes[i];
        const screenY = tNode.yPx - scrollTop;
        const size = tNode.size * scaleFactor;
        if (screenY + size < -80 || screenY - size > h + 80) continue;

        const vImg = vineAssets[tNode.assetIdx];
        if (!vImg || !vImg.complete || vImg.naturalWidth === 0) continue;

        const trunkBaseX = tNode.side === 'left' ? lTrunk1 : rTrunk2;
        const trunkPhase = tNode.side === 'left' ? 0 : 100;
        const trunkActualX = getTrunkX(trunkBaseX, trunkPhase, screenY);
        // Ultra-slow, delicate organic tendril sway
        const sway = Math.sin(timeNow * tNode.swaySpeed + tNode.swayPhase) * 1.6;
        const currentRot = tNode.rot + sway;

        ctx.save();
        ctx.translate(trunkActualX, screenY);
        if (tNode.side === 'right') {
          ctx.scale(-1, 1); // Natural organic reflection for right flank
        }
        ctx.rotate((currentRot * Math.PI) / 180);
        if (!isMob) {
          ctx.shadowColor = 'rgba(15, 35, 20, 0.25)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 3;
        }
        ctx.drawImage(vImg, -size * 0.25, -size * 0.5, size, size);
        ctx.restore();
      }

      // 2. Draw Blooming Red Velvet Roses along the Single Line (Tek Satır / Tek Hat)
      for (let i = 0; i < roseGardenNodes.length; i++) {
        const node = roseGardenNodes[i];
        const screenY = node.yPx - scrollTop;
        const size = node.size * scaleFactor;

        // Culling: only draw roses visible on screen
        if (screenY + size < -60 || screenY - size > h + 60) continue;

        // Smooth lerp bloom progress interpolation
        if (Math.abs(node.currentProgress - node.targetProgress) > 0.005) {
          node.currentProgress += (node.targetProgress - node.currentProgress) * 0.35;
        }

        const trunkBaseX = node.side === 'left' ? lTrunk1 : rTrunk2;
        const trunkPhase = node.side === 'left' ? 0 : 100;
        const screenX = getTrunkX(trunkBaseX, trunkPhase, screenY);

        const pack = roseAnglePacks[node.angleVariant] || roseAnglePacks[0];
        const framesArr = roseAngleFrames[node.angleVariant] || roseAngleFrames[0];
        const maxIdx = pack.count - 1;
        const roundedIdx = Math.min(maxIdx, Math.max(0, Math.round(node.currentProgress * maxIdx)));
        const img = framesArr ? framesArr[roundedIdx] : null;

        if (img && img.complete && img.naturalWidth > 0) {
          // Ultra-slow, serene rose petal breathing
          const swayAngle = node.rot + Math.sin(timeNow * 0.00022 + i * 0.5) * 1.0;
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.rotate((swayAngle * Math.PI) / 180);
          if (!isMob) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 5;
          }
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          ctx.restore();
        }
      }
      ctx.restore();
    }

    // Controlled High-FPS Animation Loop (30 FPS throttle on mobile for 100% fluid scroll)
    let lastGardenRenderTime = 0;
    function gardenAnimLoop(now) {
      if (!bookingScreen || bookingScreen.style.display === 'none') {
        gardenRafId = null;
        return;
      }
      const isMobDevice = window.innerWidth <= 820;
      if (isMobDevice) {
        if (!now || now - lastGardenRenderTime >= 33) {
          lastGardenRenderTime = now || performance.now();
          renderGarden();
        }
      } else {
        renderGarden();
      }
      gardenRafId = requestAnimationFrame(gardenAnimLoop);
    }

    window.startGardenLoop = () => {
      if (!gardenRafId) {
        updateGardenDimensions();
        gardenRafId = requestAnimationFrame(gardenAnimLoop);
      }
    };

    window.stopGardenLoop = () => {
      if (gardenRafId) {
        cancelAnimationFrame(gardenRafId);
        gardenRafId = null;
      }
    };

    // Auto start if already visible
    if (bookingScreen && bookingScreen.style.display !== 'none') {
      window.startGardenLoop();
    }

    let lastSpawnTime = 0;
    const spawnRealPetal = (xPercent) => {
      if (!petalsOverlay) return;
      const petal = document.createElement('div');
      petal.className = 'real-falling-petal';
      petal.style.left = (xPercent !== undefined ? xPercent : (Math.random() * 90 + 5)) + '%';
      const size = Math.floor(Math.random() * 18 + 26);
      petal.style.setProperty('--petal-size', size + 'px');
      petal.style.setProperty('--fall-duration', (Math.random() * 3 + 4.5) + 's');
      petal.style.setProperty('--start-rot', (Math.random() * 180 - 90) + 'deg');
      petal.style.setProperty('--end-rot', (Math.random() * 540 - 270) + 'deg');
      petal.style.setProperty('--drift-x', (Math.random() * 120 - 60) + 'px');
      petalsOverlay.appendChild(petal);
      setTimeout(() => petal.remove(), 8000);
    };

    const updateRoseProgress = () => {
      const scrollTop = bookingScreen.scrollTop || 0;
      const viewportHeight = bookingScreen.clientHeight || 800;

      // 🌹 Viewport-Centered Harmonious Bloom Synchronization 🌹
      roseGardenNodes.forEach(node => {
        const viewportCenter = scrollTop + viewportHeight * 0.55;
        const distFromCenter = node.yPx - viewportCenter;

        // When node is approaching viewport:
        // distFromCenter > 380: Below viewport -> Tight Bud (0)
        // distFromCenter in [-450, 380]: In Viewport -> Smooth Blooming
        // distFromCenter < -450: Above viewport -> Full Bloom
        let bloomProgress;
        if (distFromCenter > 380) {
          bloomProgress = 0;
        } else if (distFromCenter < -450) {
          bloomProgress = 1;
        } else {
          bloomProgress = 1 - ((distFromCenter - (-450)) / 830);
        }
        node.targetProgress = Math.min(1, Math.max(0, bloomProgress));
      });

      // Linear overall page progress for step indicator pills
      const totalScrollHeight = bookingScreen.scrollHeight - bookingScreen.clientHeight;
      const overallProgress = totalScrollHeight > 0 ? (scrollTop / totalScrollHeight) : 0;

      // Sync with Step Progress Bar Indicators
      const step1 = document.getElementById('stepIndicator1');
      const step2 = document.getElementById('stepIndicator2');
      const step3 = document.getElementById('stepIndicator3');
      if (overallProgress > 0.65) {
        if (step3) step3.classList.add('active');
        if (step2) step2.classList.add('active');
      } else if (overallProgress > 0.32) {
        if (step2) step2.classList.add('active');
        if (step3) step3.classList.remove('active');
      } else {
        if (step2) step2.classList.remove('active');
        if (step3) step3.classList.remove('active');
      }
    };

    // 🌹 Scroll-Driven Card Rose Blooming Engine 🌹
    function setupCardsRoseBlooming() {
      const targets = bookingScreen.querySelectorAll(
        '.wizard-section-card, .wizard-service-preset-card, .wizard-extra-card, .summary-breakdown-card, .wizard-pay-method-card, .wizard-property-addons-card'
      );

      targets.forEach((card) => {
        if (!card.querySelector('.card-rose-sprig')) {
          // Top Left Rose
          const sprigTL = document.createElement('div');
          sprigTL.className = 'card-rose-sprig top-left';
          card.appendChild(sprigTL);

          // Top Right Rose
          const sprigTR = document.createElement('div');
          sprigTR.className = 'card-rose-sprig top-right';
          card.appendChild(sprigTR);

          // Bottom Right Rose
          const sprigBR = document.createElement('div');
          sprigBR.className = 'card-rose-sprig bottom-right';
          card.appendChild(sprigBR);

          // Left Vine Tendril Leaf
          const vineLeafL = document.createElement('div');
          vineLeafL.className = 'card-vine-leaf leaf-left';
          card.appendChild(vineLeafL);

          // Right Vine Tendril Leaf
          const vineLeafR = document.createElement('div');
          vineLeafR.className = 'card-vine-leaf leaf-right';
          card.appendChild(vineLeafR);

          // Full Garland Glow Frame
          const garlandFrame = document.createElement('div');
          garlandFrame.className = 'card-rose-garland-frame';
          card.appendChild(garlandFrame);
        }
      });

      const updateCardsBloom = () => {
        const vh = bookingScreen.clientHeight || 800;
        const screenRect = bookingScreen.getBoundingClientRect();

        targets.forEach((card) => {
          const cardRect = card.getBoundingClientRect();
          const cardTopRelative = cardRect.top - screenRect.top;
          const cardBottomRelative = cardRect.bottom - screenRect.top;

          let bloom = 0;
          if (cardTopRelative < vh * 0.94 && cardBottomRelative > 0) {
            bloom = Math.min(1, Math.max(0, (vh * 0.94 - cardTopRelative) / (vh * 0.45)));
          } else if (cardTopRelative >= vh * 0.94) {
            bloom = 0;
          } else {
            bloom = 1;
          }

          card.style.setProperty('--card-rose-bloom', bloom.toFixed(2));
          if (bloom > 0.12) {
            card.classList.add('card-bloomed');
          } else {
            card.classList.remove('card-bloomed');
          }

          const sprigs = card.querySelectorAll('.card-rose-sprig');
          if (sprigs.length > 0) {
            let frameNum = Math.min(59, Math.max(0, Math.floor(bloom * 59)));
            let frameStr = frameNum < 10 ? `00${frameNum}` : (frameNum < 100 ? `0${frameNum}` : `${frameNum}`);
            const bgUrl = `url('/images/bloom_rose_frames/rose_${frameStr}.webp')`;
            sprigs.forEach(s => {
              s.style.backgroundImage = bgUrl;
            });
          }
        });
      };

      bookingScreen.addEventListener('scroll', updateCardsBloom, { passive: true });
      updateCardsBloom();
      return updateCardsBloom;
    }

    const cardsBloomUpdater = setupCardsRoseBlooming();

    bookingScreen.addEventListener('scroll', updateRoseProgress, { passive: true });

    // Subtle Romantic Rose Petal Breeze when scrolled into view
    setInterval(() => {
      if (bookingScreen && !bookingScreen.hidden && bookingScreen.style.display !== 'none' && (bookingScreen.scrollTop > 50)) {
        spawnRealPetal();
      }
    }, 3500);

    setTimeout(() => {
      resizeCanvas();
      updateRoseProgress();
      if (typeof cardsBloomUpdater === 'function') cardsBloomUpdater();
    }, 50);
    window.updateRoseVineProgress = () => {
      updateRoseProgress();
      if (typeof cardsBloomUpdater === 'function') cardsBloomUpdater();
    };
  }

  window.triggerRoseGrandBlossom = function() {
    const tracker = document.getElementById('roseScrollTracker');
    if (tracker) {
      tracker.classList.add('grand-blossom');
    }

    const petalsOverlay = document.getElementById('rosePetalsOverlay');
    if (petalsOverlay) {
      for (let i = 0; i < 36; i++) {
        setTimeout(() => {
          const petal = document.createElement('div');
          petal.className = 'real-falling-petal';
          petal.style.left = (Math.random() * 94 + 3) + '%';
          const size = Math.floor(Math.random() * 24 + 32);
          petal.style.setProperty('--petal-size', size + 'px');
          petal.style.setProperty('--fall-duration', (Math.random() * 3 + 4) + 's');
          petal.style.setProperty('--start-rot', (Math.random() * 360) + 'deg');
          petal.style.setProperty('--end-rot', (Math.random() * 720) + 'deg');
          petal.style.setProperty('--drift-x', (Math.random() * 180 - 90) + 'px');
          petalsOverlay.appendChild(petal);
          setTimeout(() => petal.remove(), 8000);
        }, i * 75);
      }
    }
  };

  initRoseScrollVineSystem();

  // 0. Interactive Step Progress Indicator & Navigation Buttons
  const stepIndicators = document.querySelectorAll('.w-step-item');
  const updateActiveStepIndicator = (targetStepId) => {
    let stepNum = 1;
    if (targetStepId === 'wizardStep2Section') stepNum = 2;
    if (targetStepId === 'wizardStep3Section') stepNum = 3;
    if (targetStepId === 'wizardStep4Section') stepNum = 4;

    stepIndicators.forEach((btn, idx) => {
      if (idx + 1 === stepNum) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  const smoothScrollToStep = (targetEl, targetId) => {
    if (!targetEl) return;
    const bookingReveal = document.getElementById('bookingReveal');
    if (bookingReveal) {
      const topOffset = targetEl.offsetTop - 80;
      bookingReveal.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    } else {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (targetId) updateActiveStepIndicator(targetId);
    if (typeof window.playTickSound === 'function') window.playTickSound();
  };

  stepIndicators.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.dataset.stepTarget;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        smoothScrollToStep(targetEl, targetId);
      }
    });
  });

  // Step Forward / Backward Navigation Buttons
  const stepNavBtns = document.querySelectorAll('.btn-wizard-next-step, .btn-wizard-prev-step');
  stepNavBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.dataset.stepTarget;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        smoothScrollToStep(targetEl, targetId);
        if (targetId === 'wizardStep3Section') {
          setTimeout(() => {
            const nameInp = document.getElementById('cName');
            if (nameInp && !nameInp.value.trim()) nameInp.focus();
          }, 350);
        }
      }
    });
  });

  // Sound Experience Toggle
  const soundToggleBtn = document.getElementById('wizardSoundToggleBtn');
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      window._roseAudioMuted = !window._roseAudioMuted;
      const icon = soundToggleBtn.querySelector('.sound-icon');
      const text = soundToggleBtn.querySelector('.sound-text');
      if (window._roseAudioMuted) {
        soundToggleBtn.classList.add('muted');
        if (icon) icon.textContent = '🔇';
        if (text) text.textContent = 'Ses: Kapalı';
      } else {
        soundToggleBtn.classList.remove('muted');
        if (icon) icon.textContent = '🔊';
        if (text) text.textContent = 'Ses: Açık';
        if (typeof window.playTickSound === 'function') window.playTickSound();
      }
    });
  }

  // Multi-Country Smart Phone Number Auto-Formatter & Carrier Detection
  const phoneInput = document.getElementById('cPhone');
  const carrierBadge = document.getElementById('carrierBadge');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      const isPlMode = (STATE.language === 'pl');
      let raw = e.target.value;
      let digits = raw.replace(/\D/g, '');

      if (isPlMode || digits.startsWith('48')) {
        // Polish Phone Number: 9 digits (excluding 48) -> +48 XXX XXX XXX
        if (digits.startsWith('48')) digits = digits.substring(2);
        if (digits.length > 9) digits = digits.substring(0, 9);

        let formatted = '+48 ';
        if (digits.length > 0) {
          formatted += digits.substring(0, 3);
          if (digits.length > 3) formatted += ' ' + digits.substring(3, 6);
          if (digits.length > 6) formatted += ' ' + digits.substring(6, 9);
        }
        phoneInput.value = (digits.length > 0) ? formatted : '';

        if (carrierBadge) {
          if (digits.length >= 3) {
            carrierBadge.style.display = 'inline-block';
            carrierBadge.className = 'carrier-badge';
            carrierBadge.textContent = '🇵🇱 PL GSM';
          } else {
            carrierBadge.style.display = 'none';
          }
        }
      } else {
        // Turkish Phone Number: 11 digits starting with 05 -> 05XX XXX XX XX
        if (digits.startsWith('90')) digits = digits.substring(2);
        if (digits.length > 11) digits = digits.substring(0, 11);
        
        let formatted = '';
        if (digits.length > 0) {
          if (!digits.startsWith('0')) digits = '0' + digits;
          formatted = digits.substring(0, 4);
          if (digits.length > 4) formatted += ' ' + digits.substring(4, 7);
          if (digits.length > 7) formatted += ' ' + digits.substring(7, 9);
          if (digits.length > 9) formatted += ' ' + digits.substring(9, 11);
        }
        phoneInput.value = formatted;

        // Carrier Detection
        if (carrierBadge) {
          if (digits.length >= 4) {
            carrierBadge.style.display = 'inline-block';
            const prefix = digits.substring(0, 4);
            const num = parseInt(prefix, 10);
            if (num >= 530 && num <= 539) {
              carrierBadge.className = 'carrier-badge turkcell';
              carrierBadge.textContent = '🟡 Turkcell';
            } else if (num >= 540 && num <= 549) {
              carrierBadge.className = 'carrier-badge vodafone';
              carrierBadge.textContent = '🔴 Vodafone';
            } else if ((num >= 501 && num <= 509) || (num >= 550 && num <= 559)) {
              carrierBadge.className = 'carrier-badge turktelekom';
              carrierBadge.textContent = '🔵 Türk Telekom';
            } else {
              carrierBadge.className = 'carrier-badge';
              carrierBadge.textContent = '📱 TR GSM';
            }
          } else {
            carrierBadge.style.display = 'none';
          }
        }
      }
    });
  }

  // Paired City & District Selector
  const CITY_DISTRICTS = {
    Istanbul: ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Şişli', 'Bakırköy', 'Sarıyer', 'Ataşehir', 'Maltepe', 'Beylikdüzü', 'Pendik', 'Kartal', 'Ümraniye', 'Başakşehir', 'Beykoz', 'Fatih', 'Eyüpsultan', 'Kağıthane', 'Beyoğlu'],
    Izmir: ['Karşıyaka', 'Konak', 'Bornova', 'Alsancak', 'Çeşme', 'Urla', 'Bayraklı', 'Buca', 'Balçova', 'Güzelbahçe', 'Narlıdere', 'Gaziemir', 'Çiğli'],
    Ankara: ['Çankaya', 'Yenimahalle', 'Keçiören', 'Etimesgut', 'Mamak', 'Gölbaşı', 'Altındağ', 'Sincan'],
    Antalya: ['Muratpaşa', 'Konyaaltı', 'Kepez', 'Alanya', 'Manavgat', 'Kemer', 'Döşemealtı'],
    Bursa: ['Nilüfer', 'Osmangazi', 'Yıldırım', 'Mudanya', 'Gemlik'],
    Kocaeli: ['İzmit', 'Gebze', 'Başiskele', 'Kartepe', 'Gölcük', 'Darıca'],
    Sakarya: ['Adapazarı', 'Serdivan', 'Erenler', 'Sapanca'],
    Balikesir: ['Altıeylül', 'Karesi', 'Edremit', 'Bandırma', 'Ayvalık'],
    Samsun: ['Atakum', 'İlkadım', 'Canik', 'Bafra'],
    Mugla: ['Bodrum', 'Fethiye', 'Marmaris', 'Menteşe', 'Datça'],
    Warszawa: ['Mokotów', 'Śródmieście', 'Wola', 'Ursynów', 'Wilanów', 'Ochota', 'Praga-Południe', 'Bemowo', 'Bielany', 'Żoliborz', 'Targówek', 'Wawer']
  };

  const citySelectEl = document.getElementById('cCity');
  const districtSelectEl = document.getElementById('cDistrict');

  const populateDistricts = (cityKey) => {
    if (!districtSelectEl) return;
    const districts = CITY_DISTRICTS[cityKey] || CITY_DISTRICTS.Istanbul;
    districtSelectEl.innerHTML = districts.map(d => `<option value="${d}">${d}</option>`).join('');
  };

  if (citySelectEl) {
    citySelectEl.addEventListener('change', () => {
      populateDistricts(citySelectEl.value);
    });
    populateDistricts(citySelectEl.value || 'Istanbul');
  }

  // 1. Service Preset Cards
  const servicePresetCards = document.querySelectorAll('.wizard-service-preset-card');
  servicePresetCards.forEach(card => {
    card.addEventListener('click', () => {
      servicePresetCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const preset = card.dataset.servicePreset || 'standart';
      selectServiceGlobal(preset);
      if (typeof window.playTickSound === 'function') window.playTickSound();
      updatePriceSliderDisplay();
    });
  });

  // 2. Quick Area Size Chips (Tactile Micro-Interactions)
  const areaChips = document.querySelectorAll('.area-chip');
  const roomValEl = document.getElementById('roomVal');
  const bathValEl = document.getElementById('bathVal');
  const chkDuplexEl = document.getElementById('chkDuplex');
  const chkVillaEl = document.getElementById('chkVilla');

  areaChips.forEach(chip => {
    chip.addEventListener('click', () => {
      areaChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const rooms = parseInt(chip.dataset.rooms || '1', 10);
      const baths = parseInt(chip.dataset.baths || '1', 10);

      if (roomValEl) {
        roomValEl.textContent = rooms;
        gsap.fromTo(roomValEl, { scale: 1.4, color: '#38bdf8' }, { scale: 1, color: '#ffffff', duration: 0.3, ease: 'back.out(2)' });
      }
      if (bathValEl) {
        bathValEl.textContent = baths;
        gsap.fromTo(bathValEl, { scale: 1.4, color: '#38bdf8' }, { scale: 1, color: '#ffffff', duration: 0.3, ease: 'back.out(2)' });
      }

      // Smart preset flags (Dubleks & Villa)
      const chipText = chip.textContent.toLowerCase();
      if (chkDuplexEl) chkDuplexEl.checked = chipText.includes('dubleks');
      if (chkVillaEl) chkVillaEl.checked = chipText.includes('villa');

      if (typeof window.playTickSound === 'function') window.playTickSound();
      updatePriceSliderDisplay();
    });
  });

  // 3. Counter Controls (Plus / Minus Rooms & Baths with Smooth GSAP Pop)
  document.getElementById('btnMinusRoom')?.addEventListener('click', () => {
    let current = parseInt(roomValEl?.textContent || '1') || 1;
    if (current > 1) {
      roomValEl.textContent = current - 1;
      gsap.fromTo(roomValEl, { scale: 1.3, color: '#38bdf8' }, { scale: 1, color: '#ffffff', duration: 0.25, ease: 'back.out(1.7)' });
      areaChips.forEach(c => c.classList.remove('active'));
      if (typeof window.playTickSound === 'function') window.playTickSound();
      updatePriceSliderDisplay();
    }
  });

  document.getElementById('btnPlusRoom')?.addEventListener('click', () => {
    let current = parseInt(roomValEl?.textContent || '1') || 1;
    if (current < 10) {
      roomValEl.textContent = current + 1;
      gsap.fromTo(roomValEl, { scale: 1.3, color: '#38bdf8' }, { scale: 1, color: '#ffffff', duration: 0.25, ease: 'back.out(1.7)' });
      areaChips.forEach(c => c.classList.remove('active'));
      if (typeof window.playTickSound === 'function') window.playTickSound();
      updatePriceSliderDisplay();
    }
  });

  document.getElementById('btnMinusBath')?.addEventListener('click', () => {
    let current = parseInt(bathValEl?.textContent || '1') || 1;
    if (current > 1) {
      bathValEl.textContent = current - 1;
      gsap.fromTo(bathValEl, { scale: 1.3, color: '#38bdf8' }, { scale: 1, color: '#ffffff', duration: 0.25, ease: 'back.out(1.7)' });
      areaChips.forEach(c => c.classList.remove('active'));
      if (typeof window.playTickSound === 'function') window.playTickSound();
      updatePriceSliderDisplay();
    }
  });

  document.getElementById('btnPlusBath')?.addEventListener('click', () => {
    let current = parseInt(bathValEl?.textContent || '1') || 1;
    if (current < 5) {
      bathValEl.textContent = current + 1;
      gsap.fromTo(bathValEl, { scale: 1.3, color: '#38bdf8' }, { scale: 1, color: '#ffffff', duration: 0.25, ease: 'back.out(1.7)' });
      areaChips.forEach(c => c.classList.remove('active'));
      if (typeof window.playTickSound === 'function') window.playTickSound();
      updatePriceSliderDisplay();
    }
  });

  // 4. Kitchen radio controls, Villa & Duplex checkboxes
  document.getElementById('chkKitchenStd')?.addEventListener('change', () => updatePriceSliderDisplay());
  document.getElementById('chkKitchenSmall')?.addEventListener('change', () => updatePriceSliderDisplay());
  document.getElementById('chkVilla')?.addEventListener('change', () => updatePriceSliderDisplay());
  document.getElementById('chkDuplex')?.addEventListener('change', () => updatePriceSliderDisplay());
  document.getElementById('chkVacuum')?.addEventListener('change', () => updatePriceSliderDisplay());

  // 5. Frequency Subscription Cards
  const freqCards = document.querySelectorAll('.wizard-freq-card');
  freqCards.forEach(card => {
    card.addEventListener('click', () => {
      freqCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      if (typeof window.playTickSound === 'function') window.playTickSound();
      updatePriceSliderDisplay();
    });
  });

  // 6. Customer Type Tabs (Özel Kişi vs İşletme)
  const tabBtns = document.querySelectorAll('.wizard-tab-btn');
  const bizBlock = document.getElementById('businessFieldsBlock');
  const apartmentTitleEl = document.getElementById('wizardApartmentSecTitle');
  const helpBtnEl = document.getElementById('btnHelpModalOpen');
  const isPl = (STATE.language || 'tr') === 'pl';

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.customerType;
      if (type === 'business') {
        if (bizBlock) bizBlock.style.display = 'block';
        if (apartmentTitleEl) apartmentTitleEl.textContent = isPl ? 'BIURO / FIRMA' : 'İŞLETME / OFİSİNİZ';
        if (helpBtnEl) helpBtnEl.textContent = isPl ? '❓ Co obejmuje sprzątanie biura?' : '❓ Ofis temizliğine neler dahildir?';
        selectServiceGlobal('kurumsal');
      } else {
        if (bizBlock) bizBlock.style.display = 'none';
        if (apartmentTitleEl) apartmentTitleEl.textContent = isPl ? 'TWÓJ APARTAMENT' : 'DAİRENİZ';
        if (helpBtnEl) helpBtnEl.textContent = isPl ? '❓ Co obejmuje sprzątanie mieszkania?' : '❓ Daire temizliğine neler dahildir?';
        selectServiceGlobal('standart');
      }
      updatePriceSliderDisplay();
    });
  });

  // 7. Key Handoff Selector Cards
  const keyOptCards = document.querySelectorAll('.key-opt-card');
  keyOptCards.forEach(card => {
    card.addEventListener('click', () => {
      keyOptCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      if (typeof window.playTickSound === 'function') window.playTickSound();
    });
  });

  // 8. Staff Preference Radios Card Click Handler
  const prefCards = document.querySelectorAll('.wizard-pref-card');
  prefCards.forEach(card => {
    card.addEventListener('click', () => {
      prefCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      updatePriceSliderDisplay();
    });
  });

  const btnCopyIbanMain = document.getElementById('btnCopyIbanMain');
  const btnCopyHolder = document.getElementById('btnCopyHolder');

  if (typeof window.refreshBankSelector === 'function') {
    window.refreshBankSelector();
  }

  if (btnCopyIbanMain && !btnCopyIbanMain._bound) {
    btnCopyIbanMain._bound = true;
    btnCopyIbanMain.addEventListener('click', (e) => {
      e.preventDefault();
      const iban = btnCopyIbanMain.dataset.iban || '';
      if (iban && navigator.clipboard) {
        navigator.clipboard.writeText(iban).then(() => {
          const textSpan = btnCopyIbanMain.querySelector('.copy-text') || btnCopyIbanMain;
          const orig = textSpan.textContent;
          textSpan.textContent = (STATE.language === 'pl') ? '✓ Skopiowano IBAN!' : '✓ IBAN Kopyalandı!';
          btnCopyIbanMain.style.background = '#22c55e';
          setTimeout(() => {
            textSpan.textContent = orig;
            btnCopyIbanMain.style.background = '';
          }, 2000);
        });
      }
    });
  }

  if (btnCopyHolder) {
    btnCopyHolder.addEventListener('click', (e) => {
      e.preventDefault();
      const holder = btnCopyHolder.dataset.copy || '';
      if (holder && navigator.clipboard) {
        navigator.clipboard.writeText(holder).then(() => {
          const orig = btnCopyHolder.textContent;
          btnCopyHolder.textContent = '✓ Kopyalandı!';
          btnCopyHolder.style.background = '#22c55e';
          btnCopyHolder.style.color = '#ffffff';
          setTimeout(() => {
            btnCopyHolder.textContent = orig;
            btnCopyHolder.style.background = '';
            btnCopyHolder.style.color = '';
          }, 2000);
        });
      }
    });
  }

  // Payment Method Tabs (Havale / FAST vs Kapıda Ödeme)
  const payTabBtns = document.querySelectorAll('.wizard-pay-tab-btn');
  const payMethodInput = document.getElementById('payMethodInput');
  const panelTransfer = document.getElementById('panelPayTransfer');
  const panelCash = document.getElementById('panelPayCash');

  payTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      payTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const method = btn.dataset.payMethod || 'transfer';
      if (payMethodInput) payMethodInput.value = method;

      if (panelTransfer) panelTransfer.style.display = method === 'transfer' ? 'block' : 'none';
      if (panelCash) panelCash.style.display = method === 'cash' ? 'block' : 'none';

      if (typeof window.playTickSound === 'function') window.playTickSound();
      updatePriceSliderDisplay();
    });
  });

  // 9. Extra Services Cards Toggle & Sub-Counter Controls
  const extraCards = document.querySelectorAll('.wizard-extra-card, .extra-btn');
  extraCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.classList.contains('ec-btn')) return;
      card.classList.toggle('active');
      if (typeof window.playTickSound === 'function') window.playTickSound();
      updatePriceSliderDisplay();
    });
  });

  // Extra item quantity counters (+ / -)
  const minusEcBtns = document.querySelectorAll('.minus-ec-btn');
  minusEcBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const valEl = btn.nextElementSibling;
      if (valEl) {
        let current = parseInt(valEl.textContent || '1') || 1;
        if (current > 1) {
          valEl.textContent = current - 1;
          updatePriceSliderDisplay();
        }
      }
    });
  });

  const plusEcBtns = document.querySelectorAll('.plus-ec-btn');
  plusEcBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const valEl = btn.previousElementSibling;
      if (valEl) {
        let current = parseInt(valEl.textContent || '1') || 1;
        if (current < 10) {
          valEl.textContent = current + 1;
          updatePriceSliderDisplay();
        }
      }
    });
  });

  // 10. Wizard Boutique Catalog Strip & Side Drawer Integration (Delegated Event Architecture)
  function initBoutiqueCatalogDrawer() {
    const strip = document.getElementById('wizardBoutiqueCatalogStrip');
    const btnOpen = document.getElementById('btnOpenBoutiqueCatalog');
    const drawer = document.getElementById('boutiqueCatalogDrawer');
    const btnClose = document.getElementById('btnCloseCatalogDrawer');
    const backdrop = document.getElementById('bcdBackdrop');
    const btnFinish = document.getElementById('btnBcdFinish');

    function openDrawer() {
      if (!drawer) return;
      drawer.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      if (typeof window.playTickSound === 'function') window.playTickSound();
    }

    function closeDrawer() {
      if (!drawer) return;
      drawer.style.display = 'none';
      document.body.style.overflow = '';
      if (typeof window.playTickSound === 'function') window.playTickSound();
    }

    if (strip) strip.addEventListener('click', openDrawer);
    if (btnOpen) btnOpen.addEventListener('click', (e) => { e.stopPropagation(); openDrawer(); });
    if (btnClose) btnClose.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    if (btnFinish) btnFinish.addEventListener('click', closeDrawer);

    if (drawer) {
      drawer.addEventListener('click', (e) => {
        const minusBtn = e.target.closest('.bcd-qty-btn.bcd-minus, .minus-bcd-qty');
        if (minusBtn) {
          e.stopPropagation();
          const numEl = minusBtn.nextElementSibling || minusBtn.parentElement.querySelector('.bcd-qty-num, .bcd-qty-val');
          if (numEl) {
            let val = parseInt(numEl.textContent || '1') || 1;
            if (val > 1) {
              numEl.textContent = val - 1;
              updatePriceSliderDisplay();
            }
          }
          return;
        }

        const plusBtn = e.target.closest('.bcd-qty-btn.bcd-plus, .plus-bcd-qty');
        if (plusBtn) {
          e.stopPropagation();
          const numEl = plusBtn.previousElementSibling || plusBtn.parentElement.querySelector('.bcd-qty-num, .bcd-qty-val');
          if (numEl) {
            let val = parseInt(numEl.textContent || '1') || 1;
            if (val < 10) {
              numEl.textContent = val + 1;
              updatePriceSliderDisplay();
            }
          }
          return;
        }

        const toggleBtn = e.target.closest('.btn-bcd-toggle-product, .btn-bcd-toggle-item');
        if (toggleBtn) {
          e.stopPropagation();
          const card = toggleBtn.closest('.bcd-product-card');
          if (!card) return;
          const isSelected = card.classList.toggle('is-selected');
          toggleBtn.classList.toggle('is-added', isSelected);
          const isPl = (STATE.language || 'tr') === 'pl';
          const txtSpan = toggleBtn.querySelector('.btn-txt');

          if (isSelected) {
            if (txtSpan) txtSpan.textContent = isPl ? '✓ Dodano' : '✓ Temizliğe Eklendi';
          } else {
            if (txtSpan) txtSpan.textContent = isPl ? '+ Dodaj' : (toggleBtn.classList.contains('mini') ? '+ Ekle' : '✨ Temizliğe Ekle');
          }

          if (typeof window.playTickSound === 'function') window.playTickSound();
          updatePriceSliderDisplay();
        }
      });
    }
  }
  initBoutiqueCatalogDrawer();

  // Phone Input Dynamic Formatting (TR: 05XX XXX XX XX / PL: XXX XXX XXX)
  const phoneInputEl = document.getElementById('cPhone');
  if (phoneInputEl) {
    phoneInputEl.addEventListener('input', (e) => {
      const isPlMode = (STATE.language || 'tr') === 'pl';
      let digits = e.target.value.replace(/\D/g, '');
      if (isPlMode) {
        if (digits.startsWith('48') && digits.length > 9) digits = digits.substring(2);
        if (digits.length > 9) digits = digits.substring(0, 9);
        let formatted = '';
        if (digits.length > 0) {
          formatted = digits.substring(0, 3);
          if (digits.length > 3) formatted += ' ' + digits.substring(3, 6);
          if (digits.length > 6) formatted += ' ' + digits.substring(6, 9);
        }
        e.target.value = formatted;
      } else {
        if (digits.startsWith('90') && digits.length > 10) digits = digits.substring(2);
        if (digits.length > 0 && !digits.startsWith('0') && digits.length <= 10) {
          digits = '0' + digits;
        }
        if (digits.length > 11) digits = digits.substring(0, 11);
        let formatted = '';
        if (digits.length > 0) {
          formatted = digits.substring(0, 4);
          if (digits.length > 4) formatted += ' ' + digits.substring(4, 7);
          if (digits.length > 7) formatted += ' ' + digits.substring(7, 9);
          if (digits.length > 9) formatted += ' ' + digits.substring(9, 11);
        }
        e.target.value = formatted;
      }
    });
  }

  // Real-time Input Blur Validation Indicators
  const fieldsToValidate = ['cName', 'cPhone', 'cStreet', 'cAptNum'];
  fieldsToValidate.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('blur', () => {
        const val = el.value.trim();
        if (val.length >= 2) {
          el.style.borderColor = 'rgba(34, 197, 94, 0.6)';
          el.style.boxShadow = '0 0 0 2px rgba(34, 197, 94, 0.15)';
        } else if (val.length > 0) {
          el.style.borderColor = 'rgba(239, 68, 68, 0.6)';
          el.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.15)';
        } else {
          el.style.borderColor = '';
          el.style.boxShadow = '';
        }
      });
    }
  });

  // LocalStorage Form Draft Auto-Save & Recovery
  const saveBookingDraft = () => {
    try {
      const draft = {
        name: document.getElementById('cName')?.value || '',
        phone: document.getElementById('cPhone')?.value || '',
        email: document.getElementById('cEmail')?.value || '',
        city: document.getElementById('cCity')?.value || '',
        district: document.getElementById('cDistrict')?.value || '',
        street: document.getElementById('cStreet')?.value || '',
        houseNum: document.getElementById('cHouseNum')?.value || '',
        aptNum: document.getElementById('cAptNum')?.value || '',
        building: document.getElementById('cBuilding')?.value || '',
        floor: document.getElementById('cFloor')?.value || '',
        notes: document.getElementById('cNotes')?.value || '',
        companyName: document.getElementById('cCompanyName')?.value || '',
        taxOffice: document.getElementById('cTaxOffice')?.value || '',
        taxNumber: document.getElementById('cTaxNumber')?.value || '',
        timestamp: Date.now()
      };
      localStorage.setItem('relaxax_booking_draft', JSON.stringify(draft));
    } catch (e) {}
  };

  const sanitizeInputVal = (val, maxLen = 200) => {
    if (typeof val !== 'string') return '';
    return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().substring(0, maxLen);
  };

  const restoreBookingDraft = () => {
    try {
      const raw = localStorage.getItem('relaxax_booking_draft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (Date.now() - (draft.timestamp || 0) < 86400000) {
        if (draft.name && document.getElementById('cName')) document.getElementById('cName').value = sanitizeInputVal(draft.name, 100);
        if (draft.phone && document.getElementById('cPhone')) document.getElementById('cPhone').value = sanitizeInputVal(draft.phone, 30);
        if (draft.email && document.getElementById('cEmail')) document.getElementById('cEmail').value = sanitizeInputVal(draft.email, 100);
        if (draft.city && document.getElementById('cCity')) {
          document.getElementById('cCity').value = sanitizeInputVal(draft.city, 50);
          document.getElementById('cCity').dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (draft.district && document.getElementById('cDistrict')) {
          setTimeout(() => {
            if (document.getElementById('cDistrict')) document.getElementById('cDistrict').value = sanitizeInputVal(draft.district, 50);
          }, 50);
        }
        if (draft.street && document.getElementById('cStreet')) document.getElementById('cStreet').value = sanitizeInputVal(draft.street, 150);
        if (draft.houseNum && document.getElementById('cHouseNum')) document.getElementById('cHouseNum').value = sanitizeInputVal(draft.houseNum, 20);
        if (draft.aptNum && document.getElementById('cAptNum')) document.getElementById('cAptNum').value = sanitizeInputVal(draft.aptNum, 20);
        if (draft.building && document.getElementById('cBuilding')) document.getElementById('cBuilding').value = sanitizeInputVal(draft.building, 50);
        if (draft.floor && document.getElementById('cFloor')) document.getElementById('cFloor').value = sanitizeInputVal(draft.floor, 20);
        if (draft.notes && document.getElementById('cNotes')) document.getElementById('cNotes').value = sanitizeInputVal(draft.notes, 500);
        if (draft.companyName && document.getElementById('cCompanyName')) document.getElementById('cCompanyName').value = sanitizeInputVal(draft.companyName, 120);
        if (draft.taxOffice && document.getElementById('cTaxOffice')) document.getElementById('cTaxOffice').value = sanitizeInputVal(draft.taxOffice, 80);
        if (draft.taxNumber && document.getElementById('cTaxNumber')) document.getElementById('cTaxNumber').value = sanitizeInputVal(draft.taxNumber, 30);
      }
    } catch (e) {}
  };

  const bookingFormEl = document.getElementById('bookingForm');
  if (bookingFormEl) {
    bookingFormEl.addEventListener('input', debounce(saveBookingDraft, 300));
  }
  restoreBookingDraft();

  // Interactive Live Clear for Required Fields
  ['cName', 'cPhone', 'cStreet', 'cHouseNum', 'cAptNum'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (el.value.trim().length > 0) {
          el.style.border = '';
          el.style.boxShadow = '';
        }
      });
    }
  });

  // Date shortcut chips
  const dateTodayBtn = document.getElementById('btnDateToday');
  const dateTomorrowBtn = document.getElementById('btnDateTomorrow');
  const dateWeekendBtn = document.getElementById('btnDateWeekend');
  const dateInput = document.getElementById('cDate');
  if (dateInput) {
    const todayIso = new Date().toISOString().split('T')[0];
    dateInput.min = todayIso;
    if (!dateInput.value) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
  }

  const setBookingDate = (daysToAdd) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    if (dateInput) dateInput.value = `${yyyy}-${mm}-${dd}`;
  };

  const updateSlotAvailability = async (selectedDate) => {
    try {
      const city = document.getElementById('cCity')?.value || STATE.city || 'Istanbul';
      const lang = STATE.language || 'tr';
      const resp = await fetch(`/api/availability?city=${encodeURIComponent(city)}&date=${encodeURIComponent(selectedDate)}&lang=${encodeURIComponent(lang)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && Array.isArray(data.slots)) {
          data.slots.forEach(slot => {
            const chip = document.querySelector(`.time-shortcut-chip[data-time="${slot.time}"]`);
            if (chip) {
              let hintSpan = chip.querySelector('.slot-hint');
              if (!hintSpan) {
                hintSpan = document.createElement('span');
                hintSpan.className = 'slot-hint';
                chip.appendChild(hintSpan);
              }
              if (slot.available) {
                chip.style.opacity = '1';
                chip.style.pointerEvents = 'auto';
                hintSpan.textContent = lang === 'pl' ? '• Dostępny' : '• Müsait';
                hintSpan.style.color = '#16a34a';
              } else {
                chip.style.opacity = '0.45';
                hintSpan.textContent = lang === 'pl' ? '• Zajęty' : '• Dolu';
                hintSpan.style.color = '#dc2626';
              }
            }
          });
        }
      }
    } catch (e) {
      logDebug('Availability check fallback:', e);
    }
  };

  // Live Reviews Badge Dynamic Updater
  let reviewsQuotes = [];
  let reviewQuoteIdx = 0;
  let reviewInterval = null;

  const initLiveReviewsBadge = async () => {
    const quoteEl = document.getElementById('revRecentQuote');
    const badgeTextEl = document.getElementById('revVerifiedText');
    if (!quoteEl || !badgeTextEl) return;

    const isPl = STATE.language === 'pl';
    const country = isPl ? 'PL' : 'TR';

    badgeTextEl.textContent = isPl ? '🛡️ 1.480+ Zweryfikowanych Klientów' : '🛡️ 1.480+ Doğrulanmış Müşteri';

    try {
      const resp = await fetch(`/api/reviews?country=${country}&limit=6`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && Array.isArray(data.reviews) && data.reviews.length > 0) {
          reviewsQuotes = data.reviews.map(r => `"${r.text.substring(0, 48)}..." — ${r.author}`);
          if (reviewsQuotes.length > 0) {
            quoteEl.textContent = reviewsQuotes[0];
            if (reviewInterval) clearInterval(reviewInterval);
            reviewInterval = setInterval(() => {
              reviewQuoteIdx = (reviewQuoteIdx + 1) % reviewsQuotes.length;
              if (typeof gsap !== 'undefined') {
                gsap.to(quoteEl, { opacity: 0, duration: 0.25, onComplete: () => {
                  quoteEl.textContent = reviewsQuotes[reviewQuoteIdx];
                  gsap.to(quoteEl, { opacity: 1, duration: 0.25 });
                }});
              } else {
                quoteEl.textContent = reviewsQuotes[reviewQuoteIdx];
              }
            }, 5500);
          }
        }
      }
    } catch(e) {}
  };
  window.initLiveReviewsBadge = initLiveReviewsBadge;
  initLiveReviewsBadge();

  if (dateInput) {
    dateInput.addEventListener('change', () => {
      updateSlotAvailability(dateInput.value);
    });
  }

  setBookingDate(1);
  setTimeout(() => {
    if (dateInput?.value) updateSlotAvailability(dateInput.value);
  }, 500);

  if (dateTodayBtn) {
    dateTodayBtn.addEventListener('click', () => {
      document.querySelectorAll('.date-shortcut-chip').forEach(c => c.classList.remove('active'));
      dateTodayBtn.classList.add('active');
      setBookingDate(0);
      if (dateInput?.value) updateSlotAvailability(dateInput.value);
      if (typeof window.playTickSound === 'function') window.playTickSound();
    });
  }
  if (dateTomorrowBtn) {
    dateTomorrowBtn.addEventListener('click', () => {
      document.querySelectorAll('.date-shortcut-chip').forEach(c => c.classList.remove('active'));
      dateTomorrowBtn.classList.add('active');
      setBookingDate(1);
      if (dateInput?.value) updateSlotAvailability(dateInput.value);
      if (typeof window.playTickSound === 'function') window.playTickSound();
    });
  }
  if (dateWeekendBtn) {
    dateWeekendBtn.addEventListener('click', () => {
      document.querySelectorAll('.date-shortcut-chip').forEach(c => c.classList.remove('active'));
      dateWeekendBtn.classList.add('active');
      const d = new Date();
      const day = d.getDay();
      const diff = day === 6 ? 1 : (6 - day);
      setBookingDate(diff);
      if (dateInput?.value) updateSlotAvailability(dateInput.value);
      if (typeof window.playTickSound === 'function') window.playTickSound();
    });
  }
  const dateNextWeekBtn = document.getElementById('btnDateNextWeek');
  if (dateNextWeekBtn) {
    dateNextWeekBtn.addEventListener('click', () => {
      document.querySelectorAll('.date-shortcut-chip').forEach(c => c.classList.remove('active'));
      dateNextWeekBtn.classList.add('active');
      setBookingDate(7);
      if (dateInput?.value) updateSlotAvailability(dateInput.value);
      if (typeof window.playTickSound === 'function') window.playTickSound();
    });
  }

  // Time shortcut chips
  const timeChips = document.querySelectorAll('.time-shortcut-chip');
  const timeSelect = document.getElementById('cTime');
  timeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      timeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const chosenTime = chip.dataset.time;
      if (timeSelect && chosenTime) {
        timeSelect.value = chosenTime;
        if (typeof window.playTickSound === 'function') window.playTickSound();
      }
    });
  });

  if (timeSelect) {
    timeSelect.addEventListener('change', () => {
      timeChips.forEach(chip => {
        if (chip.dataset.time === timeSelect.value) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    });
  }

  // ScrollSpy & Interactive Jump Navigation for Step Progress Bar
  const bookingRevealScreen = document.querySelector('.booking-reveal-screen') || document.getElementById('bookingReveal');
  const stepSections = [
    { id: 'wizardStep1Section', indicator: document.getElementById('stepIndicator1') },
    { id: 'wizardStep2Section', indicator: document.getElementById('stepIndicator2') },
    { id: 'wizardStep3Section', indicator: document.getElementById('stepIndicator3') }
  ];

  // Interactive click on step indicators to jump smoothly
  stepSections.forEach(sec => {
    if (sec.indicator) {
      sec.indicator.addEventListener('click', (e) => {
        e.preventDefault();
        const targetEl = document.getElementById(sec.id);
        if (targetEl) {
          smoothScrollToStep(targetEl, sec.id);
        }
      });
    }
  });

  if (bookingRevealScreen) {
    const handleScrollSpy = () => {
      const isPl = (STATE.language || 'tr') === 'pl';
      const scrollPos = bookingRevealScreen.scrollTop + 180;
      let activeIndex = 0;
      const screenRect = bookingRevealScreen.getBoundingClientRect();
      stepSections.forEach((sec, idx) => {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const relativeTop = rect.top - screenRect.top + bookingRevealScreen.scrollTop;
          if (relativeTop <= scrollPos) {
            activeIndex = idx;
          }
        }
      });
      stepSections.forEach((sec, idx) => {
        if (sec.indicator) {
          if (idx === activeIndex) {
            sec.indicator.classList.add('active');
          } else {
            sec.indicator.classList.remove('active');
          }
        }
      });

      // Update sticky bottom button text based on active step on mobile
      const stickyBtnSpan = document.querySelector('.m-sticky-btn span');
      if (stickyBtnSpan) {
        if (activeIndex === 0) {
          stickyBtnSpan.textContent = isPl ? 'Dalej: Szczegóły ➔' : 'İlerle: Ekstra & Tarih ➔';
        } else if (activeIndex === 1) {
          stickyBtnSpan.textContent = isPl ? 'Dalej: Adres i Płatność ➔' : 'İlerle: Adres & Ödeme ➔';
        } else {
          stickyBtnSpan.textContent = isPl ? 'Potwierdź zamówienie ➔' : 'Siparişi Tamamla ➔';
        }
      }
    };
    bookingRevealScreen.addEventListener('scroll', debounce(handleScrollSpy, 30), { passive: true });
  }

  function handleMobileStickyCheckout() {
    const bookingScreen = document.getElementById('bookingReveal');
    if (!bookingScreen) return;
    
    const step2 = document.getElementById('wizardStep2Section');
    const step3 = document.getElementById('wizardStep3Section');
    const nameInput = document.getElementById('cName');
    const phoneInput = document.getElementById('cPhone');
    const submitBtn = document.getElementById('btnSubmitBooking');
    
    const scrollPos = bookingScreen.scrollTop + 220;
    const s2Top = step2 ? step2.offsetTop : 9999;
    const s3Top = step3 ? step3.offsetTop : 9999;

    if (scrollPos < s2Top) {
      if (step2) smoothScrollToStep(step2, 'wizardStep2Section');
    } else if (scrollPos < s3Top) {
      if (step3) {
        smoothScrollToStep(step3, 'wizardStep3Section');
        if (nameInput) setTimeout(() => { try { nameInput.focus(); } catch(e){} }, 400);
      }
    } else {
      if (nameInput && !nameInput.value.trim()) {
        highlightInvalidField(nameInput, STATE.language === 'pl' ? 'Proszę wpisać imię i nazwisko.' : 'Lütfen Ad Soyad giriniz.');
      } else if (phoneInput && !phoneInput.value.trim()) {
        highlightInvalidField(phoneInput, STATE.language === 'pl' ? 'Proszę wpisać numer telefonu.' : 'Lütfen Telefon Numarası giriniz.');
      } else if (submitBtn) {
        submitBtn.click();
      }
    }
  }
  window.handleMobileStickyCheckout = handleMobileStickyCheckout;

  // Promo Code Validation Engine
  const promoInput = document.getElementById('cPromoCode');
  const btnPromo = document.getElementById('btnApplyPromo');
  const promoFeedback = document.getElementById('promoCodeFeedback');


  // Scent selection cards active switcher
  const scentCards = document.querySelectorAll('.wizard-scent-card');
  scentCards.forEach(card => {
    card.addEventListener('click', () => {
      scentCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      if (typeof window.playTickSound === 'function') window.playTickSound();
    });
  });

  // Finalize booking order submission
  const finalizeBookingOrder = (paymentMeta) => {
    const name = sanitizeInputVal(document.getElementById('cName')?.value || '', 100);
    const phone = sanitizeInputVal(document.getElementById('cPhone')?.value || '', 30);
    const email = sanitizeInputVal(document.getElementById('cEmail')?.value || '', 100);
    const city = document.getElementById('cCity')?.value || 'Istanbul';
    const street = sanitizeInputVal(document.getElementById('cStreet')?.value || '', 150);
    const houseNum = sanitizeInputVal(document.getElementById('cHouseNum')?.value || '', 20);
    const aptNum = sanitizeInputVal(document.getElementById('cAptNum')?.value || '', 20);
    const building = sanitizeInputVal(document.getElementById('cBuilding')?.value || '', 50);
    const floor = sanitizeInputVal(document.getElementById('cFloor')?.value || '', 20);
    const intercom = sanitizeInputVal(document.getElementById('cIntercom')?.value || '', 30);
    const district = document.getElementById('cDistrict')?.value || '';
    const date = document.getElementById('cDate')?.value || '';
    const time = document.getElementById('cTime')?.value || '';
    const notes = sanitizeInputVal(document.getElementById('cNotes')?.value || '', 500);

    const roomCount = parseInt(document.getElementById('roomVal')?.textContent || '1') || 1;
    const bathCount = parseInt(document.getElementById('bathVal')?.textContent || '1') || 1;
    const isSmallKitchen = document.getElementById('chkKitchenSmall')?.checked;
    const isVilla = document.getElementById('chkVilla')?.checked;
    const isDuplex = document.getElementById('chkDuplex')?.checked;
    const hasVacuum = document.getElementById('chkVacuum')?.checked;
    const staffPref = document.querySelector('input[name="staffPref"]:checked')?.value || 'any';
    const scentPref = document.querySelector('input[name="scentPref"]:checked')?.value || 'akdeniz';
    const keyOption = document.querySelector('input[name="keyOption"]:checked')?.value || 'home';
    const isPetFriendly = document.getElementById('chkPetFriendly')?.checked;
    const isBabyAllergy = document.getElementById('chkBabyAllergy')?.checked;

    const companyName = sanitizeInputVal(document.getElementById('cCompanyName')?.value || '', 120);
    const taxOffice = sanitizeInputVal(document.getElementById('cTaxOffice')?.value || '', 80);
    const taxNumber = sanitizeInputVal(document.getElementById('cTaxNumber')?.value || '', 30);
    const invoiceEmail = sanitizeInputVal(document.getElementById('cInvoiceEmail')?.value || '', 100);

    const selectedExtraNames = [];
    document.querySelectorAll('.wizard-extra-card.active, .extra-btn.active').forEach(card => {
      const name = card.querySelector('.w-extra-name, .extra-label-text')?.textContent;
      const countEl = card.querySelector('.ec-val');
      const count = countEl ? parseInt(countEl.textContent) || 1 : 1;
      if (name) selectedExtraNames.push(count > 1 ? `${name} (${count})` : name);
    });

    // Also collect selected items from the Boutique Catalog Drawer
    document.querySelectorAll('.bcd-product-card.is-selected').forEach(card => {
      const name = card.querySelector('.bcd-p-name')?.textContent || 'Butik Ürün';
      const qtyEl = card.querySelector('.bcd-qty-num');
      const qty = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;
      selectedExtraNames.push(qty > 1 ? `🛍️ ${name} (${qty} Adet)` : `🛍️ ${name}`);
    });

    const isPl = STATE.language === 'pl';
    const serviceText = isPl ? 'Sprzątanie Mieszkania' : 'Daire Temizliği';
    const finalPriceText = document.getElementById('wizardFinalPrice')?.textContent || '0 TL';
    const resCode = 'RLX-' + Math.floor(100000 + Math.random() * 900000);

    const resCodeNumEl = document.getElementById('resCodeNum');
    if (resCodeNumEl) resCodeNumEl.textContent = '#' + resCode;

    const previewNoticeCodeEl = document.getElementById('previewNoticeCode');
    if (previewNoticeCodeEl) previewNoticeCodeEl.textContent = '#' + resCode;

    const keyOptionLabels = {
      home: 'Evde Olacağım',
      security: 'Güvenlik / Kapıcıda',
      neighbor: 'Komşuma Bıraktım',
      lockbox: 'Şifreli Kutu / Kilit'
    };

    const payMethodTitle = paymentMeta.method === 'transfer'
      ? `Banka Havalesi / FAST (${TURKISH_BANKS[currentSelectedBank]?.name || 'Garanti BBVA'})`
      : (isPl ? 'Płatność na miejscu (Gotówka / POS)' : 'Kapıda Güvenli Ödeme (Nakit / Mobil POS)');

    // Construct formatted WhatsApp confirmation message
    let waMsg = '';
    if (isPl) {
      const plKeyLabels = {
        home: 'Będę w domu',
        security: 'U ochrony / recepcji',
        neighbor: 'Zostawię u sąsiada',
        lockbox: 'Skrzynka z kodem / sejf'
      };
      const plPayMethodTitle = paymentMeta.method === 'transfer'
        ? `Przelew Bankowy / BLIK (Rabat 5%)`
        : 'Płatność na miejscu (Gotówka / Karta)';

      waMsg = `Dzień dobry RELAXAX, złożyłem nowe zamówienie na stronie:\n\n`;
      waMsg += `📋 *Kod rezerwacji:* #${resCode}\n`;
      waMsg += `👤 *Klient:* ${name}\n`;
      waMsg += `📞 *Telefon:* ${phone}\n`;
      waMsg += `📍 *Miasto / Dzielnica / Adres:* ${city}${district ? ' / ' + district : ''}, ${street} ${houseNum}/${aptNum}`;
      if (building) waMsg += ` (${building})`;
      if (floor) waMsg += ` Piętro:${floor}`;
      if (intercom) waMsg += ` Domofon:${intercom}`;
      waMsg += `\n`;
      waMsg += `🗓️ *Termin:* ${date} (${time})\n`;
      waMsg += `🔑 *Odbiór kluczy:* ${plKeyLabels[keyOption] || keyOption}\n`;
      waMsg += `🏠 *Lokal:* ${roomCount} pok., ${bathCount} łaz.`;
      if (isSmallKitchen) waMsg += `, Mała kuchnia`;
      if (isVilla) waMsg += `, Dom wolnostojący`;
      if (isDuplex) waMsg += `, Dwupoziomowe`;
      waMsg += `\n`;
      if (selectedExtraNames.length > 0) {
        waMsg += `✨ *Usługi dodatkowe:* ${selectedExtraNames.join(', ')}\n`;
      }
      waMsg += `🌸 *Aromat:* ${scentPref.toUpperCase()}\n`;
      if (isPetFriendly) waMsg += `🐾 *Zwierzęta w domu:* Tak\n`;
      if (isBabyAllergy) waMsg += `👶 *Alergie / Dzieci:* Tak\n`;
      waMsg += `💳 *Płatność:* ${plPayMethodTitle}\n`;
      waMsg += `💰 *Kwota całkowita:* ${finalPriceText}\n`;
      if (notes) waMsg += `📝 *Uwagi:* ${notes}\n`;
      if (companyName) {
        waMsg += `\n🏢 *Faktura VAT:* ${companyName} (NIP: ${taxNumber})`;
      }
    } else {
      waMsg = `Merhaba RELAXAX, sitemiz üzerinden yeni bir sipariş oluşturdum:\n\n`;
      waMsg += `📋 *Rezervasyon Kodu:* #${resCode}\n`;
      waMsg += `👤 *Müşteri:* ${name}\n`;
      waMsg += `📞 *Telefon:* ${phone}\n`;
      waMsg += `📍 *Şehir / Semt / Adres:* ${city}${district ? ' / ' + district : ''}, ${street} No:${houseNum} D:${aptNum}`;
      if (building) waMsg += ` (${building})`;
      if (floor) waMsg += ` Kat:${floor}`;
      if (intercom) waMsg += ` Zil:${intercom}`;
      waMsg += `\n`;
      waMsg += `🗓️ *Tarih & Saat:* ${date} (${time})\n`;
      waMsg += `🔑 *Giriş Tercihi:* ${keyOptionLabels[keyOption] || keyOption}\n`;
      waMsg += `🏠 *Mekan:* ${roomCount} Oda, ${bathCount} Banyo`;
      if (isSmallKitchen) waMsg += `, Küçük Mutfak`;
      if (isVilla) waMsg += `, Müstakil Villa`;
      if (isDuplex) waMsg += `, Dubleks / Çatı Katı`;
      waMsg += `\n`;
      if (selectedExtraNames.length > 0) {
        waMsg += `✨ *Ekstra Hizmetler:* ${selectedExtraNames.join(', ')}\n`;
      }
      waMsg += `🌸 *İmza Koku:* ${scentPref.toUpperCase()}\n`;
      if (isPetFriendly) waMsg += `🐾 *Pati Dostu Protokolü:* Aktif\n`;
      if (isBabyAllergy) waMsg += `👶 *Bebek / Alerji Hassasiyeti:* Aktif\n`;
      waMsg += `💳 *Ödeme Yöntemi:* ${payMethodTitle}\n`;
      waMsg += `💰 *Toplam Tutar:* ${finalPriceText}\n`;
      if (notes) waMsg += `📝 *Not:* ${notes}\n`;

      if (companyName) {
        waMsg += `\n🏢 *Fatura Ünvanı:* ${companyName} (${taxOffice} V.D. - ${taxNumber})`;
      }
    }

    const waFullUrl = `https://wa.me/905466479004?text=${encodeURIComponent(waMsg)}`;
    const successWaBtn = document.getElementById('btnSuccessWhatsApp');
    if (successWaBtn) {
      successWaBtn.href = waFullUrl;
    }

    // Complete Lead payload for admin panel synchronization
    const fullAddress = `${district ? district + ', ' : ''}${street} No:${houseNum} D:${aptNum} ${building} Kat:${floor}`;
    const numericPriceVal = STATE.calculator && STATE.calculator.price ? STATE.calculator.price : (parseFloat(finalPriceText.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0);

    const leadPayload = {
      // Primary IDs
      id: resCode,
      resCode: resCode,
      
      // Customer details (both standard and panel naming)
      customerName: name,
      name: name,
      customerPhone: phone,
      phone: phone,
      customerEmail: email,
      email: email,
      
      // Location & Address
      city: city,
      district: district,
      customerAddress: fullAddress,
      address: fullAddress,
      
      // Service Specs & Pricing
      serviceType: serviceText,
      service: serviceText,
      rooms: roomCount,
      baths: bathCount,
      squareMeters: roomCount * 25 + 40,
      price: numericPriceVal,
      amount: numericPriceVal,
      finalPrice: finalPriceText,
      
      // Schedule
      preferredDate: date,
      date: date,
      preferredTime: time,
      time: time,
      
      // Extras, Scent, Notes & Promo
      extras: selectedExtraNames,
      scent: scentPref,
      notes: notes,
      referralCode: STATE.calculator.promoCode || null,
      promoCode: STATE.calculator.promoCode || null,
      discountRate: STATE.calculator.discountRate || 0,
      
      // Payment Details
      payment: paymentMeta,
      payMethod: paymentMeta.method || 'transfer',
      
      // Lead Status
      status: 'pending_approval',
      currentStep: 'WAITING_APPROVAL',
      assignedStaff: null,
      source: 'relaxax.com / Canlı Sipariş Formu',
      propertyDetails: `${roomCount}+1 Daire (${roomCount * 25 + 40} m²)`,
      estimatedPrice: numericPriceVal,
      fullName: name,
      message: notes,
      createdAt: new Date().toISOString()
    };

    // Clean Architecture Lead Dispatch to 64.177.116.243 & Edge KV
    dispatchLeadToPanel(leadPayload).then(res => {
      logDebug(`[LEAD_DISPATCH] Lead dispatched with status:`, res);
    }).catch(err => {
      logWarnDebug(`[LEAD_DISPATCH_WARN] Fallback:`, err);
    });

    saveLeadOffline(leadPayload);
    if (typeof window.addBookingToUserGlobal === 'function') {
      window.addBookingToUserGlobal(leadPayload);
    }

    // Tracking Event Triggers
    try {
      trackConversion('generate_lead', { city: city, service: serviceText, lang: STATE.language, user: { name: name, phone: phone } });
    } catch (trackErr) {
      console.warn("[TRACKING] Hata oluştu:", trackErr);
    }

    // 📊 Google Ads & Facebook Pixel Conversion Events for Live Ad Campaigns
    try {
      const orderVal = parseFloat(STATE.finalPrice) || 0;
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          send_to: 'AW-XXXXXXXXXX/booking_conversion',
          value: orderVal,
          currency: isPl ? 'PLN' : 'TRY',
          transaction_id: resCode
        });
        window.gtag('event', 'purchase', {
          transaction_id: resCode,
          value: orderVal,
          currency: isPl ? 'PLN' : 'TRY',
          items: [{ item_name: serviceText || 'cleaning_service' }]
        });
      }
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', {
          value: orderVal,
          currency: isPl ? 'PLN' : 'TRY',
          content_name: serviceText || 'cleaning_service',
          order_id: resCode
        });
        window.fbq('track', 'Lead', {
          content_name: serviceText || 'cleaning_service',
          currency: isPl ? 'PLN' : 'TRY'
        });
      }
    } catch (adErr) {
      console.warn("[ADS TRACKING] Conversion dispatch error:", adErr);
    }

    // 🌹 Trigger Rose Vine Grand Blossom & Fluttering Petals Celebration 🌹
    if (typeof window.triggerRoseGrandBlossom === 'function') {
      window.triggerRoseGrandBlossom();
    }

    // Instant GSAP Transition to Pending Waiting State Screen
    const targetFormEl = document.getElementById('bookingForm');
    const targetSuccessEl = document.getElementById('bookingSuccessState');

    // Display global pending toast
    let toast = document.getElementById('relaxaxGlobalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'relaxaxGlobalToast';
      toast.className = 'relaxax-toast';
      document.body.appendChild(toast);
    }
    toast.className = 'relaxax-toast';
    toast.style.background = 'rgba(15, 23, 42, 0.95)';
    toast.style.border = '1px solid rgba(251, 191, 36, 0.4)';
    toast.style.color = '#fbbf24';
    toast.innerHTML = `<span style="font-size:1.3rem;">⏳</span> <span><strong>${isPl ? 'Zamówienie przyjęte!' : 'Sipariş Talebiniz Alındı!'}</strong> (#${resCode}) — ${isPl ? 'Oczekuje na potwierdzenie' : 'Yönetici Onayı Bekleniyor'}</span>`;
    toast.classList.add('show');
    if (window.formToastTimeout) clearTimeout(window.formToastTimeout);
    window.formToastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 6000);

    // 1. Render PENDING / WAITING STATE (Bekleme Ekranı)
    if (targetSuccessEl) {
      const bubbleEl = targetSuccessEl.querySelector('#successStatusBubble');
      if (bubbleEl) bubbleEl.textContent = '⏳';

      const statusPill = targetSuccessEl.querySelector('#pendingStatusPill');
      if (statusPill) {
        statusPill.style.background = 'rgba(251, 191, 36, 0.15)';
        statusPill.style.borderColor = 'rgba(251, 191, 36, 0.4)';
        statusPill.style.color = '#fbbf24';
      }

      const statusPillTxt = targetSuccessEl.querySelector('#pendingStatusPillText');
      if (statusPillTxt) {
        statusPillTxt.textContent = isPl ? 'OCZEKUJE NA POTWIERDZENIE DYSPOZYTORA' : 'YÖNETİCİ ONAYI BEKLENİYOR';
      }

      const h3Title = targetSuccessEl.querySelector('#lblBookingSuccessTitle') || targetSuccessEl.querySelector('h3');
      if (h3Title) {
        h3Title.textContent = isPl ? 'ZAMÓWIENIE PRZYJĘTE • OCZEKUJE NA POTWIERDZENIE' : 'SİPARİŞ TALEBİNİZ ALINDI!';
      }
      const pDesc = targetSuccessEl.querySelector('#lblBookingSuccessText') || targetSuccessEl.querySelector('p');
      if (pDesc) {
        pDesc.textContent = isPl
          ? 'Twoje zamówienie zostało pomyślnie przesłane do centrum operacyjnego. Po zatwierdzeniu przez dyspozytora i wyznaczeniu personelu ten ekran zaktualizuje się automatycznie.'
          : 'Sipariş talebiniz operasyon merkezimize başarıyla iletilmiştir. Yetkili yöneticimiz bölgenizdeki en uygun temizlik uzmanını atayıp onayladığında bu ekran otomatik olarak güncellenecektir.';
      }

      const resCodeNum = targetSuccessEl.querySelector('#resCodeNum');
      if (resCodeNum) resCodeNum.textContent = `#${resCode}`;

      // Reset cleaner card to pending state
      const accTopBadgeTitle = document.getElementById('accTopBadgeTitle');
      const accDistancePill = document.getElementById('accDistancePill');
      const accCleanerAvatar = document.getElementById('accCleanerAvatar');
      const accCleanerName = document.getElementById('accCleanerName');
      const accCleanerRating = document.getElementById('accCleanerRating');
      const accCleanerExp = document.getElementById('accCleanerExp');
      const accCleanerLocation = document.getElementById('accCleanerLocation');
      const accContactActions = document.getElementById('accContactActions');
      const accStep1 = document.getElementById('accStep1');
      const accStep2 = document.getElementById('accStep2');
      const accStep3 = document.getElementById('accStep3');
      const accStep4 = document.getElementById('accStep4');

      if (accTopBadgeTitle) accTopBadgeTitle.textContent = isPl ? 'DYSPOZYCJA W TOKU' : 'OPERASYON MERKEZİ ATAMA BEKLİYOR';
      if (accDistancePill) accDistancePill.textContent = isPl ? '⏳ Średni czas: ~2-5 min' : '⏳ Ortalama Onay: ~2-5 dk';
      if (accCleanerAvatar) accCleanerAvatar.textContent = '⏳';
      if (accCleanerName) accCleanerName.textContent = isPl ? 'Dobieranie personelu sprzątającego...' : 'Temizlik Uzmanı Atanıyor...';
      if (accCleanerRating) accCleanerRating.textContent = isPl ? '📋 Zgłoszenie w weryfikacji' : '📋 Rezervasyon Masada İnceleniyor';
      if (accCleanerExp) accCleanerExp.textContent = isPl ? 'Powiadomienia na żywo' : 'Canlı Bildirim Aktif';
      if (accCleanerLocation) accCleanerLocation.textContent = isPl
        ? `📍 Rejon: ${district || ''}, ${city || 'Warszawa'} — Po zatwierdzeniu dane personelu i status pojawią się w tym miejscu.`
        : `📍 Siparişiniz sistem yöneticisi masasında onaylandığında, atanan uzmanın adı, iletişim bilgileri ve canlı konumu burada belirecektir.`;
      
      if (accContactActions) accContactActions.style.display = 'none';

      if (accStep1) accStep1.className = 'acc-step active pulse';
      if (accStep2) accStep2.className = 'acc-step';
      if (accStep3) accStep3.className = 'acc-step';
      if (accStep4) accStep4.className = 'acc-step';

      const btnSuccessWa = document.getElementById('btnSuccessWhatsApp');
      if (btnSuccessWa) {
        const waPendingTxt = encodeURIComponent(`Merhaba, web sitenizden #${resCode} numaralı temizlik sipariş talebimi oluşturdum. Durumu hakkında bilgi almak istiyorum.`);
        btnSuccessWa.href = `https://wa.me/905466479004?text=${waPendingTxt}`;
      }
    }

    // Function to render APPROVED State when Admin clicks "Onayla & Yola Çıkar"
    const renderOrderApprovedState = (jobData) => {
      if (!targetSuccessEl) return;

      const bubbleEl = targetSuccessEl.querySelector('#successStatusBubble');
      if (bubbleEl) bubbleEl.textContent = '✓';

      const statusPill = targetSuccessEl.querySelector('#pendingStatusPill');
      if (statusPill) {
        statusPill.style.background = 'rgba(16, 185, 129, 0.15)';
        statusPill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        statusPill.style.color = '#34d399';
      }

      const statusPillTxt = targetSuccessEl.querySelector('#pendingStatusPillText');
      if (statusPillTxt) {
        statusPillTxt.textContent = isPl ? 'ZAMÓWIENIE POTWIERDZONE & W DRODZE' : 'SİPARİŞ ONAYLANDI & EKİP YOLDA';
      }

      const h3Title = targetSuccessEl.querySelector('#lblBookingSuccessTitle') || targetSuccessEl.querySelector('h3');
      if (h3Title) {
        h3Title.textContent = isPl ? 'TWOJE ZAMÓWIENIE ZOSTAŁO POTWIERDZONE!' : 'SİPARİŞİNİZ ONAYLANMIŞTIR!';
      }
      const pDesc = targetSuccessEl.querySelector('#lblBookingSuccessText') || targetSuccessEl.querySelector('p');
      if (pDesc) {
        pDesc.textContent = isPl
          ? 'Twoje zamówienie zostało zatwierdzone przez dyspozytora. Nasz personel wyruszył w drogę pod Twój adres.'
          : 'Siparişiniz operasyon yöneticisi tarafından onaylanmış ve bölge temizlik uzmanı yola çıkmıştır. Canlı takip detayları aşağıdadır:';
      }

      const staffInfo = (typeof jobData.assignedStaff === 'object' && jobData.assignedStaff) ? jobData.assignedStaff : {
        name: (typeof jobData.assignedStaff === 'string' && jobData.assignedStaff !== 'Atama Bekliyor') ? jobData.assignedStaff : 'Ayşe K. (Kıdemli Temizlik Uzmanı)',
        phone: '0546 647 90 04',
        rating: '4.98',
        experience: '6 Yıl',
        avatar: '👩‍💼',
        distanceKm: '1.2 km',
        etaMinutes: '12 dakika'
      };

      const accTopBadgeTitle = document.getElementById('accTopBadgeTitle');
      const accDistancePill = document.getElementById('accDistancePill');
      const accCleanerAvatar = document.getElementById('accCleanerAvatar');
      const accCleanerName = document.getElementById('accCleanerName');
      const accCleanerRating = document.getElementById('accCleanerRating');
      const accCleanerExp = document.getElementById('accCleanerExp');
      const accCleanerLocation = document.getElementById('accCleanerLocation');
      const accContactActions = document.getElementById('accContactActions');
      const accStep1 = document.getElementById('accStep1');
      const accStep2 = document.getElementById('accStep2');
      const accCallBtn = document.getElementById('accCallBtn');
      const accWaBtn = document.getElementById('accWaBtn');

      if (accTopBadgeTitle) accTopBadgeTitle.textContent = isPl ? 'PERSONEL PRZYPISANY' : 'CANLI TEMİZLİK UZMANI EŞLEŞTİRİLDİ';
      if (accDistancePill) accDistancePill.textContent = `📍 ~${staffInfo.distanceKm || '1.2 km'} mesafede (~${staffInfo.etaMinutes || '12 dk'})`;
      if (accCleanerAvatar) accCleanerAvatar.textContent = staffInfo.avatar || '👩‍💼';
      if (accCleanerName) accCleanerName.textContent = staffInfo.name;
      if (accCleanerRating) accCleanerRating.textContent = `★ ${staffInfo.rating || '4.98'} (140+ Yorum)`;
      if (accCleanerExp) accCleanerExp.textContent = `${staffInfo.experience || '6 Yıl'} Deneyim`;
      if (accCleanerLocation) accCleanerLocation.textContent = `📍 Bulunduğu Bölge: ${district || ''}, ${city || 'İstanbul'} — Ekipmanlar ve buharlı set hazırlandı, randevunuz onaylandı.`;
      
      if (accContactActions) accContactActions.style.display = 'flex';
      if (accCallBtn) accCallBtn.href = `tel:${staffInfo.phone || '05466479004'}`;
      if (accWaBtn) {
        const waMsg = encodeURIComponent(`Merhaba ${staffInfo.name}, #${resCode} numaralı onaylanan temizlik randevum hakkında bilgi almak istiyorum.`);
        accWaBtn.href = `https://wa.me/90${(staffInfo.phone || '05466479004').replace(/\D/g, '')}?text=${waMsg}`;
      }

      if (accStep1) accStep1.className = 'acc-step active';
      if (accStep2) accStep2.className = 'acc-step active pulse';

      if (typeof window.playSuccessChime === 'function') window.playSuccessChime();

      // Toast notification for real-time approval
      toast.className = 'relaxax-toast success';
      toast.style.background = 'rgba(6, 78, 59, 0.95)';
      toast.style.border = '1px solid rgba(16, 185, 129, 0.5)';
      toast.style.color = '#ffffff';
      toast.innerHTML = `<span style="font-size:1.3rem;">🎉</span> <span><strong>${isPl ? 'Zamówienie zatwierdzone!' : 'Siparişiniz Onaylandı!'}</strong> (#${resCode}) — Uzmanınız yola çıktı.</span>`;
      toast.classList.add('show');
    };

    // 2. Start Live Real-Time Listener for Admin Approval (Zero Auto-Approval)
    let isAlreadyApproved = false;
    const checkLiveApproval = async () => {
      if (isAlreadyApproved) return true;
      try {
        const jobs = JSON.parse(localStorage.getItem('relaxax_staff_live_jobs') || '[]');
        const targetJob = jobs.find(j => (j && (j.id === resCode || j.orderCode === resCode || j.resCode === resCode)));
        if (targetJob && (targetJob.status === 'Onaylandı' || targetJob.status === 'approved' || targetJob.status === 'Yolda' || targetJob.status === 'Tamamlandı')) {
          isAlreadyApproved = true;
          renderOrderApprovedState(targetJob);
          return true;
        }
      } catch (e) {}

      // Cross-Device Live CleanPro API check
      try {
        const res = await fetch(`http://64.177.116.243/api/order/status?code=${encodeURIComponent(resCode)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && (data.status === 'approved' || data.status === 'Onaylandı' || data.status === 'Yolda')) {
            isAlreadyApproved = true;
            renderOrderApprovedState(data);
            return true;
          }
        }
      } catch (err) {}

      return false;
    };

    // 📡 Canlı Server-Sent Events (SSE) Dinleyicisi (Şirket Paneli Onayı için)
    try {
      const liveSse = new EventSource('http://64.177.116.243/api/stream');
      liveSse.addEventListener('ORDER_APPROVED', (e) => {
        try {
          const sseData = JSON.parse(e.data);
          if (sseData && (sseData.orderCode === resCode || sseData.leadId === resCode)) {
            isAlreadyApproved = true;
            renderOrderApprovedState(sseData);
            liveSse.close();
            if (approvalHeartbeat) clearInterval(approvalHeartbeat);
          }
        } catch (parseErr) {}
      });
    } catch(sseErr) {}

    const approvalHeartbeat = setInterval(async () => {
      const approved = await checkLiveApproval();
      if (approved) {
        clearInterval(approvalHeartbeat);
      }
    }, 2000);

    window.addEventListener('storage', async (e) => {
      if (e.key === 'relaxax_staff_live_jobs' || e.key === 'relaxax_booking_history') {
        const approved = await checkLiveApproval();
        if (approved && approvalHeartbeat) clearInterval(approvalHeartbeat);
      }
    });

    if (typeof window.listenToStateChange === 'function') {
      window.listenToStateChange('ORDER_STATUS_CHANGED', async (data) => {
        if (data && (data.orderId === resCode || data.id === resCode || data.orderCode === resCode)) {
          const approved = await checkLiveApproval();
          if (approved && approvalHeartbeat) clearInterval(approvalHeartbeat);
        }
      });
    }

    if (targetFormEl) {
      targetFormEl.style.display = 'none';
    }

    if (targetSuccessEl) {
      targetSuccessEl.removeAttribute('hidden');
      targetSuccessEl.style.display = 'flex';
      targetSuccessEl.style.opacity = '1';
      const revealScreen = document.getElementById('bookingReveal');
      if (revealScreen) {
        revealScreen.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      targetSuccessEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      gsap.fromTo(targetSuccessEl,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out', onComplete: () => {
          const check = targetSuccessEl.querySelector('.success-check');
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
  };

  function saveLeadOffline(payload) {
    try {
      if (payload && typeof payload === 'object') {
        if (payload.synced === undefined) payload.synced = false;
      }
      const existing = JSON.parse(localStorage.getItem('relaxax_booking_history') || '[]');
      existing.unshift(payload);
      localStorage.setItem('relaxax_booking_history', JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
      logErrorDebug('Failed to save lead offline:', e);
    }
  }
  
  function getBookingHistory() {
    try {
      return JSON.parse(localStorage.getItem('relaxax_booking_history') || '[]');
    } catch (e) {
      return [];
    }
  }

  function getLastBooking() {
    const history = getBookingHistory();
    return history.length > 0 ? history[0] : null;
  }

  function clearBookingHistory() {
    try {
      localStorage.removeItem('relaxax_booking_history');
    } catch (e) {}
  }

  window.saveLeadOfflineGlobal = saveLeadOffline;
  window.getBookingHistoryGlobal = getBookingHistory;
  window.getLastBookingGlobal = getLastBooking;
  window.clearBookingHistoryGlobal = clearBookingHistory;

  function syncOfflineLeads() {
    if (!navigator.onLine) return;
    try {
      const history = getBookingHistory();
      const unsynced = history.filter(item => item && item.synced === false);
      if (unsynced.length === 0) return;

      unsynced.forEach(lead => {
        fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': 'hc_live_7x9f2m4a1v8' },
          body: JSON.stringify(lead)
        }).then(res => {
          if (res && res.ok) {
            lead.synced = true;
            localStorage.setItem('relaxax_booking_history', JSON.stringify(history));
          }
        }).catch(() => {});
      });
    } catch(e) {}
  }

  window.addEventListener('online', syncOfflineLeads);

  async function checkBackendHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/health', { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res && res.ok) {
        const data = await res.json();
        return { status: 'online', ok: true, data };
      }
      return { status: 'online', ok: res.ok };
    } catch(e) {
      return { status: 'offline_fallback_active', ok: true };
    }
  }

  window.syncOfflineLeadsGlobal = syncOfflineLeads;
  window.checkBackendHealthGlobal = checkBackendHealth;

  const doSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const nameEl = document.getElementById('cName');
    const phoneEl = document.getElementById('cPhone');
    const streetEl = document.getElementById('cStreet');
    const houseNumEl = document.getElementById('cHouseNum');
    const aptNumEl = document.getElementById('cAptNum');
    
    const name = nameEl?.value.trim() || '';
    const phone = phoneEl?.value.trim() || '';
    const street = streetEl?.value.trim() || '';
    const houseNum = houseNumEl?.value.trim() || '';
    const aptNum = aptNumEl?.value.trim() || '';

    const isPl = STATE.language === 'pl';

    [nameEl, phoneEl, streetEl, houseNumEl, aptNumEl].forEach(el => {
      if (el) {
        el.style.border = '';
        el.style.boxShadow = '';
      }
    });

    const showFormToast = (msg) => {
      let toast = document.getElementById('relaxaxGlobalToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'relaxaxGlobalToast';
        toast.className = 'relaxax-toast';
        document.body.appendChild(toast);
      }
      toast.className = 'relaxax-toast error';
      toast.innerHTML = `<span style="font-size:1.2rem;">⚠️</span> <span>${escapeHTML(msg)}</span>`;
      toast.classList.add('show');
      if (window.formToastTimeout) clearTimeout(window.formToastTimeout);
      window.formToastTimeout = setTimeout(() => {
        toast.classList.remove('show');
      }, 4000);
    };

    const highlightInvalidField = (el, msg) => {
      if (!el) return;
      if (typeof window.playAlertChime === 'function') window.playAlertChime();
      const targetBox = (el.type === 'checkbox') ? (el.closest('.wizard-legal-consent-box') || el.parentElement) : el;
      if (targetBox) {
        targetBox.style.border = '2px solid #ef4444';
        targetBox.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.35)';
      }
      const bookingReveal = document.getElementById('bookingReveal');
      if (bookingReveal) {
        const topOffset = (targetBox || el).offsetTop - 140;
        bookingReveal.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
      } else {
        (targetBox || el).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => { try { el.focus(); } catch(e){} }, 200);
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(targetBox || el, { x: -8 }, { x: 8, duration: 0.06, repeat: 5, yoyo: true, onComplete: () => { (targetBox || el).style.transform = ''; } });
      }
      showFormToast(msg);
    };

    if (!name || name.length < 2) {
      highlightInvalidField(nameEl, isPl ? 'Proszę wpisać imię i nazwisko.' : 'Lütfen geçerli bir Ad Soyad giriniz.');
      return;
    }

    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      highlightInvalidField(phoneEl, isPl ? 'Proszę wpisać poprawny numer telefonu.' : 'Lütfen geçerli bir Telefon Numarası giriniz.');
      return;
    }

    if (!street || street.length < 2) {
      highlightInvalidField(streetEl, isPl ? 'Proszę wpisać nazwę ulicy.' : 'Lütfen geçerli bir Sokak / Cadde giriniz.');
      return;
    }

    if (!houseNum) {
      highlightInvalidField(houseNumEl, isPl ? 'Proszę wpisać numer domu.' : 'Lütfen geçerli bir Ev / Bina Numarası giriniz.');
      return;
    }

    const isVilla = document.getElementById('chkVilla')?.checked || false;
    const isBusiness = document.getElementById('tabBusinessBtn')?.classList.contains('active') || document.getElementById('businessFieldsBlock')?.style.display === 'block';
    if (!isVilla && !isBusiness && !aptNum) {
      highlightInvalidField(aptNumEl, isPl ? 'Proszę wpisać numer mieszkania.' : 'Lütfen geçerli bir Daire Numarası giriniz.');
      return;
    }

    const chkTermsConsent = document.getElementById('chkBookingTermsConsent');
    if (chkTermsConsent && !chkTermsConsent.checked) {
      highlightInvalidField(chkTermsConsent, isPl ? 'Proszę zaakceptować regulamin i warunki umowy przed złożeniem zamówienia.' : 'Lütfen devam etmek için Kullanıcı Sözleşmesi ve KVKK metnini onaylayınız.');
      return;
    }

    const selectedPayMethod = document.getElementById('payMethodInput')?.value || 'transfer';

    const paymentMeta = {
      method: selectedPayMethod,
      bank: selectedPayMethod === 'transfer' ? (isPl ? (POLISH_BANKS[currentSelectedBank]?.name || 'BLIK / Przelew') : (TURKISH_BANKS[currentSelectedBank]?.name || 'Garanti BBVA')) : null,
      iban: selectedPayMethod === 'transfer' ? (isPl ? (POLISH_BANKS[currentSelectedBank]?.account || null) : (TURKISH_BANKS[currentSelectedBank]?.iban || null)) : null,
      gateway: selectedPayMethod === 'transfer' ? (isPl ? 'blik_polish_transfer' : 'bank_transfer_fast') : 'cash_on_delivery',
      authStatus: selectedPayMethod === 'transfer' ? 'AWAITING_TRANSFER_RECEIPT' : 'PAY_ON_COMPLETION',
      amount: STATE.calculator.price,
      currency: STATE.currency
    };
    finalizeBookingOrder(paymentMeta);
  };

  window.acceptLegalTermsGlobal = function() {
    const chk1 = document.getElementById('chkBookingTermsConsent');
    if (chk1) chk1.checked = true;
    const chk2 = document.getElementById('regTermsConsent');
    if (chk2) chk2.checked = true;
    const chk3 = document.getElementById('staffTermsConsent');
    if (chk3) chk3.checked = true;

    if (typeof window.playSuccessChime === 'function') window.playSuccessChime();

    const modal = document.getElementById('legalModal');
    if (modal && typeof window.closeCorporateModal === 'function') {
      window.closeCorporateModal(modal);
    } else if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  };

  if (btnSubmit) {
    btnSubmit.addEventListener('click', doSubmit);
  }
  if (form && !form._submitBound) {
    form._submitBound = true;
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
      
      // Re-enable submit button (use correct selector)
      const submitBtn = document.getElementById('btnSubmitBooking');
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

      if (typeof window.goToCinemaStep === 'function') {
        window.goToCinemaStep(0);
      }
    });
  }

  // Initial load sync
  updatePriceSliderDisplay();
}

function setupGlobalEscapeKey() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      // 1. Help Modal Overlay
      const helpOverlay = document.getElementById('helpModalOverlay');
      if (helpOverlay && helpOverlay.style.display !== 'none') {
        helpOverlay.style.display = 'none';
        return;
      }

      // 2. Mobile Menu Drawer
      const mobileDrawer = document.getElementById('mobile-menu-drawer');
      if (mobileDrawer && !mobileDrawer.hasAttribute('hidden')) {
        const closeDrawerBtn = document.getElementById('closeMobileDrawerBtn');
        if (closeDrawerBtn) closeDrawerBtn.click();
        return;
      }

      // 3. Services Modal
      const servicesModal = document.getElementById('services-modal');
      if (servicesModal && !servicesModal.hasAttribute('hidden')) {
        const closeBtn = document.getElementById('closeServicesBtn');
        if (closeBtn) closeBtn.click();
        return;
      }

      // 4. Booking Screen
      closeBookingScreen();
    }
  });
}

function setupHistoryBackNavigation() {
  if (typeof window === 'undefined') return;

  try {
    if (!window.history.state) {
      window.history.replaceState({ view: 'home' }, '');
    }
  } catch (e) {}

  let isHandlingPop = false;

  // Master UI Back Button handler
  window.navigateAppBackGlobal = function() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    }
  };

  // Push state on Modal / Booking opens
  window.pushAppState = function(viewName, data = {}) {
    if (isHandlingPop) return;
    try {
      window.history.pushState({ view: viewName, ...data, timestamp: Date.now() }, '');
    } catch (e) {}
  };

  // Intercept Browser Back Button / Mobile Swipe Back / Android Hardware Back
  window.addEventListener('popstate', () => {
    isHandlingPop = true;

    // 1. Check if an active open Corporate / System Modal exists
    const openModals = [
      document.getElementById('authModal'),
      document.getElementById('legalModal'),
      document.getElementById('hygieneCertModal'),
      document.getElementById('photoProofGalleryModal'),
      document.getElementById('staffSosModal'),
      document.getElementById('vipConciergeModal'),
      document.getElementById('productsModal'),
      document.getElementById('services-modal'),
      document.getElementById('adminOrderDetailsModal'),
      document.getElementById('adminFinancialModal'),
      document.getElementById('helpModalOverlay')
    ].filter(m => m && (m.style.display === 'flex' || m.style.display === 'block' || m.classList.contains('active') || (!m.hasAttribute('hidden') && m.id === 'services-modal')));

    if (openModals.length > 0) {
      const topModal = openModals[openModals.length - 1];
      if (topModal.id === 'authModal' && typeof window.closeAuthModal === 'function') {
        window.closeAuthModal();
      } else if (typeof window.closeCorporateModal === 'function') {
        window.closeCorporateModal(topModal);
      } else {
        topModal.style.display = 'none';
        topModal.classList.remove('active');
        if (topModal.id === 'services-modal') topModal.setAttribute('hidden', '');
      }
      if (typeof window.playTickSound === 'function') window.playTickSound();
      setTimeout(() => { isHandlingPop = false; }, 100);
      return;
    }

    // 2. Check if Mobile Menu Drawer or Boutique Drawer is open
    const mobileDrawer = document.getElementById('mobile-menu-drawer');
    if (mobileDrawer && !mobileDrawer.hasAttribute('hidden')) {
      const closeBtn = document.getElementById('closeMobileDrawerBtn');
      if (closeBtn) closeBtn.click();
      setTimeout(() => { isHandlingPop = false; }, 100);
      return;
    }
    const boutiqueDrawer = document.getElementById('boutiqueDrawer');
    if (boutiqueDrawer && boutiqueDrawer.style.display !== 'none' && boutiqueDrawer.classList.contains('active')) {
      boutiqueDrawer.style.display = 'none';
      boutiqueDrawer.classList.remove('active');
      setTimeout(() => { isHandlingPop = false; }, 100);
      return;
    }

    // 3. Check if Booking Wizard is open
    const bookingEl = document.getElementById('bookingReveal');
    if (bookingEl && (bookingEl.style.display === 'block' || bookingEl.classList.contains('active') || !bookingEl.hasAttribute('hidden'))) {
      if (typeof window.closeBookingScreen === 'function') {
        window.closeBookingScreen();
      }
      if (typeof window.playTickSound === 'function') window.playTickSound();
      setTimeout(() => { isHandlingPop = false; }, 100);
      return;
    }

    // 4. Check if on 3D Cinematic Scene > 0
    if (typeof window.goToCinemaStep === 'function' && typeof currentStep !== 'undefined' && currentStep > 0) {
      window.goToCinemaStep(currentStep - 1, -1);
      if (typeof window.playTickSound === 'function') window.playTickSound();
    }

    setTimeout(() => { isHandlingPop = false; }, 100);
  });
}

function setupNetworkResilienceWatcher() {
  if (typeof window === 'undefined') return;

  const showConnBanner = (status, text) => {
    let banner = document.getElementById('relaxaxConnBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'relaxaxConnBanner';
      banner.style.cssText = 'position:fixed; top:20px; right:20px; z-index:999999; padding:10px 18px; border-radius:999px; font-size:0.84rem; font-weight:700; display:flex; align-items:center; gap:8px; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); box-shadow:0 10px 30px rgba(0,0,0,0.5); transition:all 0.3s cubic-bezier(0.16,1,0.3,1); opacity:0; transform:translateY(-15px); pointer-events:none;';
      document.body.appendChild(banner);
    }

    if (status === 'offline') {
      banner.style.background = 'rgba(239, 68, 68, 0.9)';
      banner.style.border = '1px solid rgba(254, 202, 202, 0.3)';
      banner.style.color = '#fff';
      banner.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#fff; animation:connPulse 1.5s infinite;"></span> ${text || '⚠️ İnternet bağlantısı kesildi (Çevrimdışı koruma aktif)'}`;
      if (typeof window.playAlertChime === 'function') window.playAlertChime();
    } else {
      banner.style.background = 'rgba(34, 197, 94, 0.9)';
      banner.style.border = '1px solid rgba(187, 247, 208, 0.3)';
      banner.style.color = '#fff';
      banner.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#fff;"></span> ${text || '✓ İnternet bağlantısı sağlandı (Sistem senkronize)'}`;
      if (typeof window.playSuccessChime === 'function') window.playSuccessChime();
    }

    banner.style.opacity = '1';
    banner.style.transform = 'translateY(0)';

    clearTimeout(banner._hideTimer);
    banner._hideTimer = setTimeout(() => {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-15px)';
    }, 4000);
  };

  window.addEventListener('offline', () => {
    showConnBanner('offline');
  }, { passive: true });

  window.addEventListener('online', () => {
    showConnBanner('online');
  }, { passive: true });
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
    selectServiceGlobal(targetService);
    const servicesCard = document.querySelector('.services-select-card') || document.getElementById('cinema-section');
    if (servicesCard) {
      servicesCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  window.openServicesModalWithPreset = (targetService) => {
    selectServiceGlobal(targetService);
    openBookingScreen();
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
  window.closeServicesModal = closeServices;
  
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

    item.addEventListener('click', (e) => {
      currentBasePrice = parseFloat(item.dataset.basePrice || 15);
      currentServiceType = item.dataset.service || 'standart';
      
      selectServiceGlobal(currentServiceType, e);

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
      const layoutText = escapeHTML(layouts[area] || area.toString());

      let receiptHtml = `
        <h4>${escapeHTML(receiptTitle)}</h4>
        <div class="receipt-row">
          <span class="receipt-lbl">${escapeHTML(labelBaseArea)}</span>
          <span class="receipt-leader"></span>
          <span class="receipt-val">${layoutText}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-lbl">${escapeHTML(labelFrequency)}</span>
          <span class="receipt-leader"></span>
          <span class="receipt-val">${escapeHTML(freqText)}</span>
        </div>
      `;

      if (activeExtras.length > 0) {
        receiptHtml += `
          <div class="receipt-row">
            <span class="receipt-lbl">${escapeHTML(labelExtras)}</span>
            <span class="receipt-leader"></span>
            <span class="receipt-val">${escapeHTML(activeExtras.join(', '))}</span>
          </div>
        `;
      }

      receiptHtml += `
        <div class="receipt-row receipt-total-row">
          <span class="receipt-lbl receipt-total-lbl">${escapeHTML(labelStatus)}</span>
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
      
      closeServices();
      
      setTimeout(() => {
        openBookingScreen();
      }, 300);
    });
  }

  calculatePriceFn = (svc) => {
    if (svc) currentServiceType = svc;
    calculatePrice();
  };
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
  localStorage.removeItem('relaxax_city');
  localStorage.removeItem('tworose_city');

  // Clear bypassing class to allow gateway display
  document.documentElement.classList.remove('bypassing-gateway');

  document.body.classList.add('flag-selection-mode');
  portalStage.style.display = 'flex';
  portalStage.style.opacity = '0';
  portalStage.style.pointerEvents = 'all';

  gsap.set('.cc-gateway-card', { display: 'none', opacity: 0 });
  const mapWrapper = document.querySelector('.portal-map-wrapper');
  if (mapWrapper) {
    gsap.set(mapWrapper, {
      opacity: 0,
      x: 0,
      y: 30,
      scale: 0.98,
      rotationZ: 0,
      rotateX: 0,
      rotateY: 0,
      transformOrigin: '50% 50%'
    });
  }
  const defaultPanel = document.getElementById('portalDefaultPanel');
  if (defaultPanel) gsap.set(defaultPanel, { display: 'flex', opacity: 0, x: 20 });
  const logoContainer = document.querySelector('.portal-logo-container');
  if (logoContainer) gsap.set(logoContainer, { y: -30, scale: 1, opacity: 0 });
  const centerHint = document.querySelector('.portal-center-hint');
  if (centerHint) gsap.set(centerHint, { y: 12, scale: 1, opacity: 0 });

  const tl = gsap.timeline({
    onComplete: () => {
      // Re-init portal particles
      setupPortalParticles();
      if (turkeyMapInstance && typeof turkeyMapInstance.invalidateSize === 'function') {
        turkeyMapInstance.invalidateSize();
      }
      if (polandMapInstance && typeof polandMapInstance.invalidateSize === 'function') {
        polandMapInstance.invalidateSize();
      }
      if (typeof window.updatePortalCachedRects === 'function') {
        window.updatePortalCachedRects();
      }
      window.portalWarping = false; // Release hover calculations lock
    }
  });

  tl.to('#main-content', { opacity: 0, pointerEvents: 'none', duration: 0.4, ease: 'power2.inOut' })
    .to(portalStage, { opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.1');

  if (logoContainer) tl.to(logoContainer, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, '-=0.4');
  if (centerHint) tl.to(centerHint, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.3');
  if (mapWrapper) tl.to(mapWrapper, { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'power3.out' }, '-=0.4');
  if (defaultPanel) tl.to(defaultPanel, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }, '-=0.8');
}

function setupResizeObserver() {
  if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.config) {
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  let debounceTimeout = null;
  const observer = new ResizeObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const currentWidth = window.innerWidth;
      cachedWindowWidth = currentWidth;
      cachedWindowHeight = window.innerHeight;
      
      // Only refresh ScrollTrigger if horizontal width changed and on desktop
      if (Math.abs(currentWidth - lastWidth) > 60 && currentWidth > 768) {
        lastWidth = currentWidth;
        if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.refresh) {
          ScrollTrigger.refresh();
        }
      }
    }, 250);
  });
  observer.observe(document.body);
}

// ==========================================
// 12. BESPOKE ULTRA-LUXURY KINETIC HALO FOLLOWER
// ==========================================
function setupCustomCursor() {
  // Disable entirely on touch devices
  if ('ontouchstart' in window || (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches)) {
    return;
  }

  // Remove any legacy cursor elements
  const legacyDot = document.getElementById('luxCursorDot');
  if (legacyDot) legacyDot.remove();

  // Create Luxury Cursor DOM Structure
  let cursor = document.getElementById('lux-cursor');
  if (!cursor) {
    cursor = document.createElement('div');
    cursor.id = 'lux-cursor';
    cursor.className = 'lux-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = `
      <div class="lux-cursor-ring" id="luxCursorRing">
        <div class="lux-cursor-lens"></div>
        <div class="lux-cursor-glint"></div>
        <div class="lux-cursor-badge" id="luxCursorBadge">
          <span class="lux-badge-icon" id="luxBadgeIcon"></span>
          <span class="lux-badge-text" id="luxBadgeText"></span>
        </div>
      </div>
    `;
    document.body.appendChild(cursor);
  }

  const ring = cursor.querySelector('#luxCursorRing');
  const badgeIcon = cursor.querySelector('#luxBadgeIcon');
  const badgeText = cursor.querySelector('#luxBadgeText');

  let mouseX = -100;
  let mouseY = -100;
  let prevMouseX = mouseX;
  let prevMouseY = mouseY;
  let ringX = mouseX;
  let ringY = mouseY;
  let targetMagneticX = 0;
  let targetMagneticY = 0;
  let hasMagneticTarget = false;

  let isVisible = false;
  let isTicking = false;
  let lastFrameTime = performance.now();

  let activeMode = 'default';
  let currentBadgeData = { text: '', icon: '' };

  const getBadgeData = (type) => {
    const lang = STATE.language || 'tr';
    const dict = {
      scrub: { 
        tr: { text: '', icon: '' }, 
        pl: { text: '', icon: '' }, 
        uk: { text: '', icon: '' } 
      },
      select: { 
        tr: { text: 'SEÇ', icon: '✦' }, 
        pl: { text: 'WYBIERZ', icon: '✦' }, 
        uk: { text: 'ОБРАТИ', icon: '✦' } 
      },
      city: { 
        tr: { text: 'ŞEHİR', icon: '📍' }, 
        pl: { text: 'MIASTO', icon: '📍' }, 
        uk: { text: 'МІСТО', icon: '📍' } 
      },
      inspect: { 
        tr: { text: 'İNCELE', icon: '👁' }, 
        pl: { text: 'RAPORT', icon: '👁' }, 
        uk: { text: 'ЗВİТ', icon: '👁' } 
      },
      order: { 
        tr: { text: 'SİPARİŞ', icon: '⚡' }, 
        pl: { text: 'ZAMÓW', icon: '⚡' }, 
        uk: { text: 'ЗАМОВИТИ', icon: '⚡' } 
      },
      audio: { 
        tr: { text: 'SES', icon: '♫' }, 
        pl: { text: 'DŹWIĘK', icon: '♫' }, 
        uk: { text: 'ЗВУК', icon: '♫' } 
      }
    };
    return (dict[type] && dict[type][lang]) ? dict[type][lang] : (dict[type]?.tr || { text: '', icon: '' });
  };

  const startLoop = () => {
    if (!isTicking) {
      isTicking = true;
      lastFrameTime = performance.now();
      requestAnimationFrame(renderCursor);
    }
  };

  // Pointer position update
  window.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      ringX = mouseX;
      ringY = mouseY;
      cursor.classList.add('active');
    }

    startLoop();
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    isVisible = false;
    cursor.classList.remove('active');
  });

  document.addEventListener('mouseenter', () => {
    isVisible = true;
    cursor.classList.add('active');
    startLoop();
  });

  // Dynamic Contextual Hover Inspector
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (!target) return;

    // 0. Form inputs -> Immediately hide halo for 100% clean typing
    if (target.closest('input, select, textarea, .form-control, [contenteditable="true"]')) {
      activeMode = 'input';
      currentBadgeData = { text: '', icon: '' };
      cursor.className = 'lux-cursor lux-hover-input';
      hasMagneticTarget = false;
      if (badgeIcon) badgeIcon.textContent = '';
      if (badgeText) badgeText.textContent = '';
      startLoop();
      return;
    }

    // 1. Audio toggle
    const audioBtn = target.closest('#portalAudioToggle, .portal-audio-toggle');

    // 2. City Map Hotspots
    const mapHotspot = target.closest('.map-hotspot, .leaflet-marker-icon, .tms-city-mini-card, .portal-flag-card');

    // 3. Service selection cards
    const serviceCard = target.closest('.wizard-service-card, .service-select-item, .service-item-detail, .wizard-scent-card');

    // 4. Inspect report / Quality modal
    const inspectBtn = target.closest('.wizard-inspect-report-btn, #btnOpenQualityReportModal, .quality-report-trigger');

    // 5. Cinema scrubbing / video stage
    const scrubEl = target.closest('#cinema-section, .cinema-stage, .cinema-video-container, .cinema-scrub-zone');
    const isInteractiveInsideCinema = target.closest('button, a, .reveal-card, .calc-trigger-btn, .service-nav-btn, .cinema-submit-btn, .wizard-tab-btn, .wizard-check-item, input, select');

    // 6. Primary CTA Order buttons
    const orderBtn = target.closest('#headerCtaBtn, .nav-cta-btn, .cinema-submit-btn');

    // 7. Standard interactive buttons / links
    const genericBtn = target.closest('a, button, [role="button"], .tab-btn, .counter-btn, .wizard-tab-btn, .w-info-link, .wizard-freq-card');

    if (audioBtn) {
      activeMode = 'pill';
      currentBadgeData = getBadgeData('audio');
      cursor.className = 'lux-cursor active lux-hover-pill';
      hasMagneticTarget = false;
    } else if (orderBtn) {
      activeMode = 'button';
      currentBadgeData = { text: '', icon: '' };
      cursor.className = 'lux-cursor active lux-hover-button';
      const rect = orderBtn.getBoundingClientRect();
      targetMagneticX = rect.left + rect.width / 2;
      targetMagneticY = rect.top + rect.height / 2;
      hasMagneticTarget = true;
    } else if (inspectBtn) {
      activeMode = 'pill';
      currentBadgeData = getBadgeData('inspect');
      cursor.className = 'lux-cursor active lux-hover-pill';
      hasMagneticTarget = false;
    } else if (serviceCard) {
      activeMode = 'pill';
      currentBadgeData = getBadgeData('select');
      cursor.className = 'lux-cursor active lux-hover-pill';
      hasMagneticTarget = false;
    } else if (mapHotspot) {
      activeMode = 'city';
      currentBadgeData = getBadgeData('city');
      cursor.className = 'lux-cursor active lux-hover-city';
      hasMagneticTarget = false;
    } else if (scrubEl && !isInteractiveInsideCinema) {
      activeMode = 'cinema';
      currentBadgeData = getBadgeData('scrub');
      cursor.className = 'lux-cursor active lux-hover-cinema';
      hasMagneticTarget = false;
    } else if (genericBtn) {
      activeMode = 'button';
      currentBadgeData = { text: '', icon: '' };
      cursor.className = 'lux-cursor active lux-hover-button';
      const rect = genericBtn.getBoundingClientRect();
      targetMagneticX = rect.left + rect.width / 2;
      targetMagneticY = rect.top + rect.height / 2;
      hasMagneticTarget = true;
    } else {
      activeMode = 'default';
      currentBadgeData = { text: '', icon: '' };
      cursor.className = 'lux-cursor active';
      hasMagneticTarget = false;
    }

    if (badgeIcon) badgeIcon.textContent = currentBadgeData.icon;
    if (badgeText) badgeText.textContent = currentBadgeData.text;
    startLoop();
  });

  // Hydraulic Click Shockwave
  window.addEventListener('pointerdown', () => {
    cursor.classList.add('lux-clicking');
    startLoop();
  });

  window.addEventListener('pointerup', () => {
    cursor.classList.remove('lux-clicking');
    startLoop();
  });

  // RAF Physics Loop (Harmonic Spring Tracking with Fluid Velocity Deformation)
  function renderCursor() {
    if (!isVisible) {
      isTicking = false;
      return;
    }

    const now = performance.now();
    let dt = (now - lastFrameTime) / 16.666;
    lastFrameTime = now;
    if (dt > 4) dt = 1.0;

    let targetX = mouseX;
    let targetY = mouseY;

    // Apply smooth magnetic attraction weight if over interactive target
    if (hasMagneticTarget) {
      targetX = mouseX * 0.65 + targetMagneticX * 0.35;
      targetY = mouseY * 0.65 + targetMagneticY * 0.35;
    }

    // Spring damping lerp
    const lerpRate = 1 - Math.pow(1 - 0.34, dt);
    ringX += (targetX - ringX) * lerpRate;
    ringY += (targetY - ringY) * lerpRate;

    // Velocity calculation
    const vx = mouseX - prevMouseX;
    const vy = mouseY - prevMouseY;
    const speed = Math.hypot(vx, vy);

    let angle = 0;
    let stretch = 0;
    if (speed > 1.2 && activeMode === 'default') {
      angle = Math.atan2(vy, vx);
      stretch = Math.min(0.26, speed * 0.007);
    }

    // Apply transform to outer aura ring
    if (ring) {
      const rx = Math.round(ringX * 10) / 10;
      const ry = Math.round(ringY * 10) / 10;
      if (stretch > 0.02) {
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.45})`;
      } else {
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      }
    }

    prevMouseX = mouseX;
    prevMouseY = mouseY;

    // Zero-Idle sleep check
    const distToTarget = Math.hypot(targetX - ringX, targetY - ringY);
    if (distToTarget > 0.15 || speed > 0.1) {
      requestAnimationFrame(renderCursor);
    } else {
      isTicking = false;
    }
  }

  startLoop();
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

  let lightTicking = false;
  let lightMX = 0;
  let lightMY = 0;

  if (!('ontouchstart' in window)) {
    targetContainer.addEventListener('mousemove', (e) => {
      lightMX = e.clientX;
      lightMY = e.clientY;

      if (!lightTicking) {
        lightTicking = true;
        window.requestAnimationFrame(() => {
          light.style.transform = `translate3d(${lightMX}px, ${lightMY}px, 0)`;
          lightTicking = false;
        });
      }
    }, { passive: true });
  }
}

// ==========================================
// 15. SEAMLESS VIDEO LOOP ENGINEERING DRIVER
// ==========================================
// ==========================================
// 15. SEAMLESS VIDEO LOOP ENGINEERING DRIVER (FRAME-ACCURATE ZERO-LATENCY)
// ==========================================
function setupVideoLoopEngineering() {
  const isVideoSupported = typeof document !== 'undefined' && document.createElement('video').canPlayType;
  if (!isVideoSupported) return;

  // Global one-time touch / pointer unlocker for strict mobile autoplay policies
  let autoplayUnlocked = false;
  const unlockAllAutoplayVideos = () => {
    if (autoplayUnlocked) return;
    autoplayUnlocked = true;
    document.querySelectorAll('video[loop], .wizard-card-video-bg video, .intro-video, .cso-earth-video, .services-ivy-bg-video').forEach(v => {
      if (v.paused && v.dataset.userPaused !== 'true' && !v.closest('.cso-hidden, [style*="display: none"]')) {
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    });
    window.removeEventListener('pointerdown', unlockAllAutoplayVideos);
    window.removeEventListener('touchstart', unlockAllAutoplayVideos);
    window.removeEventListener('keydown', unlockAllAutoplayVideos);
  };
  window.addEventListener('pointerdown', unlockAllAutoplayVideos, { passive: true, once: true });
  window.addEventListener('touchstart', unlockAllAutoplayVideos, { passive: true, once: true });
  window.addEventListener('keydown', unlockAllAutoplayVideos, { passive: true, once: true });

  const attachLoopGuards = (root = document) => {
    const loopingVideos = root.querySelectorAll('video[loop], .wizard-card-video-bg video, .intro-video, .cso-earth-video, .services-ivy-bg-video');
    loopingVideos.forEach(video => {
      if (video.dataset.loopEngineered === 'true') return;
      video.dataset.loopEngineered = 'true';

      video.playbackRate = 1.0;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('disablepictureinpicture', '');
      video.setAttribute('disableremoteplayback', '');
      video.muted = true;
      video.defaultMuted = true;
      video.preload = 'auto';

      let isWrapping = false;

      // 1. High-Precision Frame-Accurate Loop Wrapper (requestVideoFrameCallback -> 60fps sub-frame level)
      const setupFrameAccurateLoop = () => {
        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && typeof video.requestVideoFrameCallback === 'function') {
          const onFrame = (now, metadata) => {
            if (video.duration > 0.5 && metadata.mediaTime >= (video.duration - 0.035)) {
              if (!isWrapping) {
                isWrapping = true;
                if (typeof video.fastSeek === 'function') {
                  try { video.fastSeek(0.001); } catch(e) { video.currentTime = 0.001; }
                } else {
                  video.currentTime = 0.001;
                }
                if (video.paused && !document.hidden) {
                  video.play().catch(() => {});
                }
                setTimeout(() => { isWrapping = false; }, 30);
              }
            }
            if (!video.paused && !video.ended) {
              video.requestVideoFrameCallback(onFrame);
            }
          };
          video.addEventListener('play', () => {
            video.requestVideoFrameCallback(onFrame);
          });
        }
      };

      setupFrameAccurateLoop();

      // 2. Fallback timeupdate sub-millisecond loop wrap
      const handleSeamlessWrap = () => {
        if (video.duration > 0.5 && video.currentTime >= (video.duration - 0.04)) {
          if (!isWrapping) {
            isWrapping = true;
            if (typeof video.fastSeek === 'function') {
              try { video.fastSeek(0.001); } catch(e) { video.currentTime = 0.001; }
            } else {
              video.currentTime = 0.001;
            }
            if (video.paused && !document.hidden) {
              const p = video.play();
              if (p && typeof p.catch === 'function') p.catch(() => {});
            }
            setTimeout(() => { isWrapping = false; }, 35);
          }
        }
      };

      video.addEventListener('timeupdate', handleSeamlessWrap, { passive: true });

      // 3. Hardware / OS ended event instant wrap fallback
      video.addEventListener('ended', () => {
        video.currentTime = 0.001;
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      });

      // 4. Stream stall & buffer auto-recovery
      video.addEventListener('stalled', () => {
        if (!video.paused && video.readyState < 3) {
          video.load();
          video.play().catch(() => {});
        }
      });

      video.addEventListener('error', () => {
        setTimeout(() => {
          try {
            video.load();
            video.play().catch(() => {});
          } catch(e) {}
        }, 180);
      });

      // 5. Battery saver / low-power freeze guard
      video.addEventListener('pause', () => {
        if (video.hasAttribute('loop') && !document.hidden && video.dataset.userPaused !== 'true') {
          const rect = video.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0) {
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          }
        }
      });
    });
  };

  attachLoopGuards();

  // Dynamic MutationObserver to catch any dynamically injected videos in modals or steps
  if ('MutationObserver' in window) {
    const domObserver = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              if (node.tagName === 'VIDEO') {
                attachLoopGuards(node.parentElement || document);
              } else if (node.querySelectorAll) {
                const innerVideos = node.querySelectorAll('video');
                if (innerVideos.length) attachLoopGuards(node);
              }
            }
          });
        }
      });
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  // IntersectionObserver to pause offscreen looping videos for battery & GPU savings, and resume on view
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const v = entry.target;
        if (entry.isIntersecting) {
          if (v.paused && v.dataset.userPaused !== 'true' && !document.hidden) {
            v.play().catch(() => {});
          }
        } else {
          // Offscreen: can pause to save resources unless actively in transition
          if (!v.paused && !v.classList.contains('intro-video') && !v.classList.contains('cso-earth-video')) {
            v.pause();
          }
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('video[loop], .wizard-card-video-bg video').forEach(v => videoObserver.observe(v));
  }

  // Tab visibility resume handler for seamless infinite background loops
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      document.querySelectorAll('video[loop], .wizard-card-video-bg video, .intro-video, .cso-earth-video').forEach(v => {
        const rect = v.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0 && v.dataset.userPaused !== 'true') {
          v.play().catch(() => {});
        }
      });
    }
  });
}

// 🎬 IN-CARD VIDEO SCROLL PARALLAX ENGINE FOR BOOKING FORM CARDS 🎬
function setupInCardVideoScrollEngine() {
  const bookingScreen = document.getElementById('bookingReveal');
  if (!bookingScreen) return;

  const cardVideoPairs = [];
  const cards = bookingScreen.querySelectorAll('.wizard-section-card, .wizard-summary-card');

  cards.forEach(card => {
    const video = card.querySelector('.wizard-card-video-bg video');
    if (video) {
      cardVideoPairs.push({ card, video });
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.playbackRate = 1.0;
    }
  });

  if (cardVideoPairs.length === 0) return;

  let ticking = false;
  const updateScrollParallax = () => {
    const screenRect = bookingScreen.getBoundingClientRect();
    const screenCenterY = screenRect.top + screenRect.height / 2;

    cardVideoPairs.forEach(({ card, video }) => {
      const cardRect = card.getBoundingClientRect();
      // Check if card is near or within the visible viewport of the booking modal
      if (cardRect.bottom > screenRect.top - 80 && cardRect.top < screenRect.bottom + 80) {
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const diffFromCenter = (cardCenterY - screenCenterY) / (screenRect.height / 2);
        // Subtle vertical parallax offset tied to scroll (-18px to +18px)
        const clampedDiff = Math.max(-1.5, Math.min(1.5, diffFromCenter));
        const translateY = clampedDiff * 18;
        video.style.transform = `scale(1.08) translate3d(0, ${translateY.toFixed(1)}px, 0)`;

        if (video.paused && !document.hidden) {
          const p = video.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        }
      } else {
        if (!video.paused) {
          try { video.pause(); } catch(e) {}
        }
      }
    });
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(updateScrollParallax);
      ticking = true;
    }
  };

  if (!bookingScreen._inCardScrollAttached) {
    bookingScreen._inCardScrollAttached = true;
    bookingScreen.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  // Initial calculation
  updateScrollParallax();
}
window.setupInCardVideoScrollEngine = setupInCardVideoScrollEngine;

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
    // Check if any service card / option was clicked for Sand & Dust Storm animation
    const serviceCard = e.target.closest('.service-select-item, .service-item-detail');
    if (serviceCard) {
      triggerDustCleaningEffect(serviceCard);
    }

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

function setupAudioToggle() {
  const btn = document.getElementById('portalAudioToggle');
  if (!btn) return;

  if (synth) synth.updateToggleUI();

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!synth) return;
    synth.init(); // Initialize audio context on click
    synth.toggleMute();
    if (!synth.muted) {
      synth.playClick();
    }
  });

  // Enable audio context on any interactive document click
  const enableAudioCtx = () => {
    if (!synth) return;
    synth.init();
    if (synth.ctx && synth.ctx.state === 'suspended') {
      synth.ctx.resume().catch(() => {});
    }
    document.removeEventListener('click', enableAudioCtx);
    document.removeEventListener('keydown', enableAudioCtx);
  };
  document.addEventListener('click', enableAudioCtx);
}

// ==========================================
// 16. ELEVATED CODE BLOCKS & CLICK-TO-COPY ENGINE
// ==========================================
function setupCodeBlockEngine() {
  const handleCodeCopy = (el, customText = '') => {
    const textToCopy = customText || el.textContent.trim();
    if (!textToCopy) return;

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(textToCopy).then(() => {
        if (typeof window.playTickSound === 'function') window.playTickSound();

        // Visual bounce & micro glow
        el.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.transform = 'scale(1.08)';
        el.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.7)';
        el.style.borderColor = '#22c55e';
        el.style.color = '#22c55e';

        // Toast feedback
        let toast = document.getElementById('relaxaxGlobalToast');
        if (!toast) {
          toast = document.createElement('div');
          toast.id = 'relaxaxGlobalToast';
          toast.className = 'relaxax-toast';
          document.body.appendChild(toast);
        }
        toast.className = 'relaxax-toast success show';
        const isPl = STATE && STATE.language === 'pl';
        toast.innerHTML = `<span style="font-size:1.2rem;">📋</span> <span><strong>${isPl ? 'Skopiowano:' : 'Kopyalandı:'}</strong> <code>${textToCopy}</code></span>`;

        if (window.codeToastTimeout) clearTimeout(window.codeToastTimeout);
        window.codeToastTimeout = setTimeout(() => {
          toast.classList.remove('show');
        }, 3000);

        setTimeout(() => {
          el.style.transform = '';
          el.style.boxShadow = '';
          el.style.borderColor = '';
          el.style.color = '';
        }, 1200);
      }).catch(() => {});
    }
  };

  // Delegate click for any code tag, pre block or copyable code badge
  document.addEventListener('click', (e) => {
    const codeTarget = e.target.closest('code, .code-copy-btn, .btn-copy-code-block, #previewNoticeCode, #resCodeNum');
    if (codeTarget && !codeTarget.closest('#btnCopyIbanMain, #btnCopyHolder')) {
      handleCodeCopy(codeTarget);
    }
  });
}

// Register Enterprise PWA Service Worker for offline asset caching
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[PWA] Service Worker active:', reg.scope))
      .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
  });
}

// -------------------------------------------------------------
// 📱 SMART MOBILE BOTTOM DOCK CONTROLLER
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const mbd = document.getElementById('mobileBottomStickyBar');
  const mbdBookBtn = document.getElementById('mbdBookBtn');
  const mbdPricePreview = document.getElementById('mbdPricePreview');
  const mbdBtnTitle = document.getElementById('mbdBtnTitle');

  if (mbdBookBtn) {
    mbdBookBtn.addEventListener('click', () => {
      const isPl = STATE && STATE.language === 'pl';
      if (typeof window.triggerPricingCalculate === 'function') {
        window.triggerPricingCalculate();
      } else {
        const form = document.getElementById('bookingForm') || document.getElementById('bookingReveal');
        if (form) {
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }

  // Hide mobile bottom dock when inside active booking wizard or modal
  const updateMbdVisibility = () => {
    if (!mbd) return;
    const revealOpen = document.body.classList.contains('booking-reveal-active');
    const modalOpen = !!document.querySelector('.rx-corporate-modal:not(.hidden), .auth-modal-backdrop:not(.hidden), .portal-stage:not([style*="display: none"])');
    const successOpen = document.getElementById('bookingSuccessState')?.style.display === 'flex';

    if (revealOpen || modalOpen || successOpen) {
      mbd.classList.add('hide-mbd');
    } else {
      mbd.classList.remove('hide-mbd');
    }
  };

  window.addEventListener('scroll', updateMbdVisibility, { passive: true });
  window.addEventListener('resize', updateMbdVisibility, { passive: true });
  setInterval(updateMbdVisibility, 800);

  // Initialize Dynamic Live Social Proof & Trust Notification Engine
  initSocialProofEngine();

  // -------------------------------------------------------------
  // ⭐ INTERACTIVE REVIEW & SATISFACTION FEEDBACK CONTROLLER
  // -------------------------------------------------------------
  let selectedRatingVal = 5;
  const rfmModal = document.getElementById('reviewFeedbackModal');
  const starContainer = document.getElementById('rfmStarContainer');
  const ratingLabel = document.getElementById('rfmRatingLabel');
  const submitReviewBtn = document.getElementById('btnSubmitReviewFeedback');
  const commentInput = document.getElementById('rfmComment');

  const ratingDescriptions = {
    1: '1.0 — Beklentimi Karşılamadı',
    2: '2.0 — Geliştirilmeli',
    3: '3.0 — Ortalama',
    4: '4.0 — Çok İyi & Temiz',
    5: '5.0 — Kusursuz & Mükemmel!'
  };

  if (starContainer) {
    const stars = starContainer.querySelectorAll('.rfm-star');
    stars.forEach(s => {
      s.addEventListener('click', () => {
        const val = parseInt(s.getAttribute('data-val') || '5', 10);
        selectedRatingVal = val;
        stars.forEach(st => {
          const stVal = parseInt(st.getAttribute('data-val') || '0', 10);
          if (stVal <= val) {
            st.classList.add('active');
            st.style.color = '#fbbf24';
          } else {
            st.classList.remove('active');
            st.style.color = '#475569';
          }
        });
        if (ratingLabel) ratingLabel.textContent = ratingDescriptions[val] || `${val}.0`;
        if (typeof window.playTickSound === 'function') window.playTickSound();
      });
    });
  }

  // Toggle Tags
  document.querySelectorAll('.rfm-tag').forEach(tagBtn => {
    tagBtn.addEventListener('click', () => {
      tagBtn.classList.toggle('active');
      if (typeof window.playTickSound === 'function') window.playTickSound();
    });
  });

  if (submitReviewBtn) {
    submitReviewBtn.addEventListener('click', async () => {
      submitReviewBtn.disabled = true;
      submitReviewBtn.innerHTML = '<span>⏳ Kaydediliyor...</span>';

      const activeTags = Array.from(document.querySelectorAll('.rfm-tag.active')).map(t => t.textContent.trim());
      const comment = (commentInput ? commentInput.value.trim() : '') + (activeTags.length ? ` [${activeTags.join(', ')}]` : '');

      const userSession = safeStorageGet(CONSTANTS.STORAGE_KEYS.USER_SESSION, {});
      const authorName = userSession.name || 'Değerli Müşteri';
      const city = userSession.city || STATE.selectedCity || 'İstanbul';

      try {
        await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author: authorName,
            rating: selectedRatingVal,
            text: comment,
            city: city
          })
        });
      } catch(e) {}

      if (typeof window.playSuccessChime === 'function') window.playSuccessChime();

      alert(`🌟 Teşekkürler ${authorName}!\n\nDeğerlendirmeniz ve ${selectedRatingVal} yıldızınız başarıyla kaydedildi.\n\n🎁 Hesabınıza sonraki randevunuzda geçerli +50 TL İndirim Kuponu (YILDIZ50) ve +25 VIP Sadakat Puanı tanımlandı!`);

      if (rfmModal) rfmModal.style.display = 'none';
      submitReviewBtn.disabled = false;
      submitReviewBtn.innerHTML = '<span>🌟 Puanı Gönder & 50 TL İndirim Kazan</span>';
    });
  }

  window.openReviewModalGlobal = function() {
    if (rfmModal) rfmModal.style.display = 'flex';
  };
});


