import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Register GSAP ScrollTrigger
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
    console.error('%c[TwoRose Debug Error]', 'color: #ff3366; font-weight: bold; background: #1a050b; padding: 3px 6px; border-radius: 4px; border: 1px solid #ff3366;', ...args);
  }
}

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

// Module-level variables for gateway interactive components
let cardHoverListeners = [];
let portalHotspotListeners = [];
let portalStageClickHandler = null;
let portalParallaxHandler = null;
let portalParallaxRafId = null;
let portalTargetHue = 220;

function cleanupGatewayListeners() {
  const portalStage = document.getElementById('portal-stage');
  if (portalStage && portalParallaxHandler) {
    portalStage.removeEventListener('mousemove', portalParallaxHandler);
    portalParallaxHandler = null;
  }
  if (portalParallaxRafId) {
    cancelAnimationFrame(portalParallaxRafId);
    portalParallaxRafId = null;
  }

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
}

// Global Application State (Single Source of Truth)
const STATE = {
  selectedCity: null,
  selectedRegion: null,
  lenisInstance: null,
  
  // Interactive Selection State
  calculator: {
    applied: false,
    serviceType: 'konut',
    area: 100,
    frequency: '1',
    extras: [],
    price: 1500
  },
  
  // Cinematic Scrubbing Interpolation States
  cinema: {
    activeIdx: 0,
    activeTextBlockIdx: -1,
    targetTime: 0,
    currentTime: 0,
    targetRadius: 120,
    currentRadius: 120,
    targetX: 50,
    currentX: 50,
    targetY: 50,
    currentY: 50,
    targetVideoY: 0,
    currentVideoY: 0,
    isScrubbing: false
  },

  // Ambient Portal Particles
  ambientParticles: []
};

// Module-level cached elements to prevent DOM query overhead
let bookingRevealEl = null;
let scenes = [];

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
    setTimeout(processPrewarmQueue, 300); // 300ms gap
  } else {
    processPrewarmQueue();
  }
}

function prewarmAround(activeIdx) {
  if (!scenes || scenes.length === 0) return;

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
  video.dataset.warmedUp = 'true';
  
  logDebug(`Warming up video decoder for: ${video.id} (${video.getAttribute('src')})`);
  
  video.preload = 'auto'; // Force full asset loading
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');

  // Track file loading errors
  video.addEventListener('error', () => {
    logErrorDebug(`Decoder resource loading error on ${video.id}:`, video.error);
  });
  
  // Set up pending seek event listener
  video.addEventListener('seeked', () => {
    video.dataset.customSeeking = 'false';
    const pending = parseFloat(video.dataset.pendingSeek);
    if (!isNaN(pending)) {
      video.dataset.pendingSeek = ''; // clear
      const diff = Math.abs(video.currentTime - pending);
      if (diff > 0.01) {
        logDebug(`Executing buffered seek on ${video.id} to ${pending}s`);
        try {
          video.dataset.customSeeking = 'true';
          video.currentTime = pending;
        } catch (e) {
          video.dataset.customSeeking = 'false';
          logErrorDebug(`Seek failed during buffered callback on ${video.id}:`, e);
        }
      }
    }
  });

  try {
    video.load();
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        logDebug(`Warmup play success on ${video.id}`);
        video.pause();
      }).catch(err => {
        logErrorDebug(`Warmup play interrupted on ${video.id}:`, err.message || err);
      });
    } else {
      video.pause();
    }
  } catch (e) {
    logErrorDebug(`Warmup exception on ${video.id}:`, e);
  }
}

// Regional styling and themes configuration
const REGION_THEMES = {
  marmara: { accent: '#3366ff', rgb: '51, 102, 255' },
  ege: { accent: '#ff9100', rgb: '255, 145, 0' },
  karadeniz: { accent: '#ff3366', rgb: '255, 51, 102' }
};

const CITY_TO_REGION = {
  Istanbul: 'marmara',
  Kocaeli: 'marmara',
  Sakarya: 'marmara',
  Izmir: 'ege',
  Balikesir: 'ege',
  Samsun: 'karadeniz'
};

const CITY_NAMES_TR = {
  Istanbul: 'İSTANBUL',
  Kocaeli: 'KOCAELİ',
  Sakarya: 'SAKARYA',
  Izmir: 'İZMİR',
  Balikesir: 'BALIKESİR',
  Samsun: 'SAMSUN'
};

const CITY_NAMES_TR_TITLE = {
  Istanbul: 'İstanbul',
  Kocaeli: 'Kocaeli',
  Sakarya: 'Sakarya',
  Izmir: 'İzmir',
  Balikesir: 'Balıkesir',
  Samsun: 'Samsun'
};

// ==========================================
// 1. DUST CANVAS & AMBIENT PARTICLE SYSTEM
// ==========================================
let canvasAnimationId = null;
let resizeCanvasHandler = null;
let portalMouseMoveHandler = null;

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
  window.addEventListener('resize', resizeCanvas);
  resizeCanvasHandler = resizeCanvas;

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

  // Clean up any existing card/hotspot hover listeners first to prevent duplicates
  // cleanupGatewayListeners();

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

      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = `hsl(${p.hue}, 80%, 65%)`;
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

      ctx.globalAlpha = p.life * 0.7;
      ctx.fillStyle = `hsl(${p.hue}, 90%, 60%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });

    canvasAnimationId = requestAnimationFrame(drawLoop);
  }

  drawLoop();
}

// ==========================================
// 2. STATE MANAGER & COLOR SYNCHRONIZER
function setSplitCityTitle(cityText) {
  const titleEl = document.getElementById('introCityTitle');
  if (!titleEl) return;
  titleEl.innerHTML = ''; // clear

  const mid = Math.ceil(cityText.length / 2);
  const leftText = cityText.slice(0, mid);
  const rightText = cityText.slice(mid);

  const spanLeft = document.createElement('span');
  spanLeft.className = 'title-split-left';
  spanLeft.textContent = leftText;

  const spanRight = document.createElement('span');
  spanRight.className = 'title-split-right';
  spanRight.textContent = rightText;

  titleEl.appendChild(spanLeft);
  titleEl.appendChild(spanRight);
}

function updateIntroVideoState(city) {
  if (!city) return;
  const targetId = `intro-video-${city.toLowerCase()}`;
  const videos = document.querySelectorAll('.cinema-intro-card .intro-video');
  
  videos.forEach(video => {
    if (video.id === targetId) {
      video.classList.add('active');
      video.pause();
      video.currentTime = 0;
    } else {
      video.classList.remove('active');
      video.pause();
      video.currentTime = 0;
    }
  });
}

function setCityState(city) {
  if (!city) return;
  STATE.selectedCity = city;
  const region = CITY_TO_REGION[city] || 'marmara';
  STATE.selectedRegion = region;

  // Update Dynamic CSS Variables on :root
  const theme = REGION_THEMES[region] || REGION_THEMES.marmara;
  document.documentElement.style.setProperty('--clr-accent', theme.accent);
  document.documentElement.style.setProperty('--clr-accent-rgb', theme.rgb);

  // Update UI labels
  const trName = CITY_NAMES_TR[city] || city.toUpperCase();
  const label = document.getElementById('currentCityLabel');
  if (label) label.textContent = trName;
  
  const formCitySelect = document.getElementById('cCity');
  if (formCitySelect && formCitySelect.value !== city) {
    formCitySelect.value = city;
  }

  // Personalize hero subtitle based on selected city
  const heroSubtitle = document.getElementById('heroSubtitle');
  if (heroSubtitle) {
    const titleCity = CITY_NAMES_TR_TITLE[city] || city;
    heroSubtitle.innerHTML = `Sıradan temizlik anlayışını geride bırakın. <strong>${titleCity}</strong> genelinde yaşam alanlarınızı sinematik bir disiplin ve kusursuz hijyenle buluşturuyoruz.`;
  }

  // Update introductory title card text (split for sideways parting animation)
  const introCityTitle = document.getElementById('introCityTitle');
  if (introCityTitle) {
    const titleCity = CITY_NAMES_TR_TITLE[city] || city;
    setSplitCityTitle(titleCity.toUpperCase());
  }

  // Update introductory background video
  updateIntroVideoState(city);

  // Save to localStorage
  localStorage.setItem('tworose_city', city);
}

// ==========================================


// ==========================================
// 3. INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  bookingRevealEl = document.getElementById('bookingReveal');
  setupLenis();
  setupPortalParticles();
  setupCinemaEngine();
  setupPortalGateway();
  setupNavScroll();
  setupMobileDrawer();
  setupBookingReveal();
  setupServicesModal();
  setupResizeObserver();
  setupGlobalEscapeKey();
  setupKeyboardCinemaScroll();

  // Initialize interactive visual effects (Custom cursor on desktop, ambient glow globally)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) {
    setupCustomCursor();
  }
  setupCinemaAmbientLight();
  setupHolographicClickRipples();
  setupAudioToggle();
});

// ==========================================
// 4. LENIS SMOOTH SCROLL SETUP
// ==========================================
function setupLenis() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });
  
  STATE.lenisInstance = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Lock scrolling if gateway is active
  if (document.body.classList.contains('flag-selection-mode')) {
    lenis.stop();
  }
}

// ==========================================
// 5. PORTAL GATEWAY
// ==========================================
function setupPortalGateway() {
  const portalStage = document.getElementById('portal-stage');
  if (!portalStage) return;
  const cityCards = document.querySelectorAll('.cc-gateway-card');
  const parallaxLayers = document.querySelectorAll('.parallax-layer');

  // Staggered premium entry animation on portal load
  if (document.body.classList.contains('flag-selection-mode')) {
    // Blueprint paths initialization
    const provincePaths = document.querySelectorAll('.map-province path');
    provincePaths.forEach(path => {
      const length = path.getTotalLength ? path.getTotalLength() : 300;
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
    });

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
      { y: 0, opacity: 0.25, duration: 1.0, ease: 'power2.out', delay: 0.8 }
    );

    // 6. Map and Default Panel premium presentation entry
    gsap.fromTo('.portal-map-wrapper',
      { opacity: 0, y: 30, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out', delay: 0.5 }
    );

    // Staggered path drawing for 81 provinces
    gsap.to(provincePaths, {
      strokeDashoffset: 0,
      duration: 1.4,
      ease: 'power2.out',
      stagger: 0.004,
      delay: 0.7
    });

    gsap.fromTo('.map-hotspot',
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1, duration: 0.8, stagger: 0.08, ease: 'back.out(1.7)', delay: 0.9 }
    );

    gsap.fromTo('#portalDefaultPanel',
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 1.0, ease: 'power3.out', delay: 0.8 }
    );
  }

  // Mouse Parallax Track (RAF-throttled for high refresh rate monitor rendering)
  let pmx = 0;
  let pmy = 0;

  const updateParallax = () => {
    parallaxLayers.forEach(layer => {
      const depth = layer.dataset.depth || 0.04;
      gsap.to(layer, {
        x: pmx * depth * 30,
        y: pmy * depth * 20,
        duration: 0.8,
        overwrite: 'auto'
      });
    });
    portalParallaxRafId = null;
  };

  const onParallaxMove = (e) => {
    pmx = (e.clientX / window.innerWidth - 0.5) * 2;
    pmy = (e.clientY / window.innerHeight - 0.5) * 2;
    if (!portalParallaxRafId) {
      portalParallaxRafId = requestAnimationFrame(updateParallax);
    }
  };

  portalStage.addEventListener('mousemove', onParallaxMove);
  portalParallaxHandler = onParallaxMove;

  // State tracker variables for hover previews
  let activeCity = null;
  let revertTimeout = null;
  let pingInterval = null;

  const connectorOverlay = document.getElementById('portalConnectorOverlay');
  const connectorPath = document.getElementById('portalConnectorPath');
  const connectorParticle = document.getElementById('portalConnectorParticle');

  const updateLaserConnector = (city) => {
    if (!connectorOverlay || !connectorPath || !connectorParticle) return;
    
    // Hide laser overlay completely on mobile viewport
    if (window.innerWidth <= 1024) {
      gsap.set([connectorPath, connectorParticle], { opacity: 0 });
      return;
    }

    // Find active hotspot element
    const hotspot = Array.from(document.querySelectorAll('.map-hotspot')).find(
      h => h.dataset.city.toLowerCase() === city.toLowerCase()
    );
    
    // Find corresponding city card
    const activeCard = Array.from(cityCards).find(
      c => c.dataset.city.toLowerCase() === city.toLowerCase()
    );

    if (!hotspot || !activeCard) {
      gsap.to([connectorPath, connectorParticle], { opacity: 0, duration: 0.2 });
      return;
    }

    // Measure bounding boxes relative to portalStage
    const stageRect = portalStage.getBoundingClientRect();
    const hotspotRect = hotspot.getBoundingClientRect();
    const cardRect = activeCard.getBoundingClientRect();

    // Hotspot coordinates (center of the hotspot)
    const hX = (hotspotRect.left - stageRect.left) + hotspotRect.width / 2;
    const hY = (hotspotRect.top - stageRect.top) + hotspotRect.height / 2;

    // Card coordinates (left-edge center of the card)
    const cX = (cardRect.left - stageRect.left);
    const cY = (cardRect.top - stageRect.top) + cardRect.height / 2;

    // Cubic Bezier curve algorithm to draw a sleek S-curve
    const cp1x = hX + (cX - hX) * 0.45;
    const cp1y = hY;
    const cp2x = hX + (cX - hX) * 0.55;
    const cp2y = cY;
    const pathD = `M ${hX} ${hY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cX} ${cY}`;

    connectorPath.setAttribute('d', pathD);

    // Apply color theme dynamically based on market area
    const market = activeCard.dataset.market || 'marmara';
    let accentColor = '#3366ff';
    if (market === 'ege') accentColor = '#ff9100';
    if (market === 'karadeniz') accentColor = '#ff3366';
    connectorOverlay.style.setProperty('--c-accent', accentColor);

    // Draw the path using GSAP dashoffset animation
    gsap.killTweensOf(connectorPath);
    gsap.killTweensOf(connectorParticle);

    gsap.set(connectorPath, { opacity: 0.85, strokeDashoffset: 800 });
    gsap.to(connectorPath, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' });

    // Animate the light particle travelling along the laser path
    gsap.set(connectorParticle, { opacity: 1 });
    connectorParticle.style.offsetPath = `path('${pathD}')`;
    
    gsap.fromTo(connectorParticle,
      { offsetDistance: '0%' },
      { offsetDistance: '100%', duration: 1.0, ease: 'power1.inOut', repeat: -1 }
    );
  };

  const startTelemetryFluctuation = (card) => {
    if (pingInterval) clearInterval(pingInterval);
    const pingSpan = card.querySelector('.ping-val');
    if (!pingSpan) return;

    let basePing = Math.floor(Math.random() * 8) + 4; // 4 to 11ms
    pingSpan.textContent = `${basePing} ms`;

    pingInterval = setInterval(() => {
      const fluctuation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      let newPing = basePing + fluctuation;
      if (newPing < 3) newPing = 3;
      if (newPing > 16) newPing = 16;
      pingSpan.textContent = `${newPing} ms`;
    }, 1200);
  };

  // Caching variables for client bounds to eliminate layout thrashing reflows on mousemove
  let cachedStageRect = null;
  let cachedMapRect = null;
  let cachedWrapperRect = null;

  const updateCachedRects = () => {
    if (portalStage) cachedStageRect = portalStage.getBoundingClientRect();
    if (neonMap) cachedMapRect = neonMap.getBoundingClientRect();
    const wrapper = document.querySelector('.portal-map-wrapper');
    if (wrapper) cachedWrapperRect = wrapper.getBoundingClientRect();
  };

  // Re-calculate laser layout & cached bounds if viewport size changes
  window.addEventListener('resize', () => {
    updateCachedRects();
    if (activeCity) {
      updateLaserConnector(activeCity);
    }
  });

  // Watch body classes to update cached dimensions when selecting mode toggles
  if (typeof MutationObserver !== 'undefined' && portalStage) {
    const classObserver = new MutationObserver(() => {
      if (document.body.classList.contains('flag-selection-mode')) {
        setTimeout(updateCachedRects, 100);
      }
    });
    classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // ── DYNAMIC HUD TELEMETRY CURSOR TRACKER ──
  const mapHUD = document.getElementById('portalMapHUD');
  const neonMap = document.getElementById('portalNeonMap');
  
  if (mapHUD && neonMap && portalStage) {
    // Initial rect computation
    setTimeout(updateCachedRects, 300);

    let hudTicking = false;
    let hudMX = 0;
    let hudMY = 0;

    portalStage.addEventListener('mousemove', (e) => {
      hudMX = e.clientX;
      hudMY = e.clientY;

      if (!hudTicking) {
        window.requestAnimationFrame(() => {
          // Only track if gateway selection is active and it's not a mobile device
          if (!document.body.classList.contains('flag-selection-mode') || window.innerWidth <= 1024 || window.portalWarping) {
            gsap.set(mapHUD, { opacity: 0 });
            hudTicking = false;
            return;
          }

          if (!cachedStageRect || !cachedMapRect || !cachedWrapperRect) {
            updateCachedRects();
          }

          const stageRect = cachedStageRect;
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

          const wrapper = document.querySelector('.portal-map-wrapper');

          if (isNearMap) {
            // Show HUD
            gsap.to(mapHUD, { opacity: 1, duration: 0.3, overwrite: 'auto' });
            
            // Offset HUD slightly to the right of cursor
            const hudX = mx - stageRect.left + 95;
            const hudY = my - stageRect.top;
            
            gsap.to(mapHUD, {
              x: hudX,
              y: hudY,
              duration: 0.25,
              ease: 'power2.out',
              overwrite: 'auto'
            });

            // Map relative position to geographic Turkish coordinates
            const mapXPercent = (mx - mapRect.left) / mapRect.width;
            const mapYPercent = (my - mapRect.top) / mapRect.height;

            const longitude = 26.0 + Math.max(0, Math.min(mapXPercent, 1)) * 19.0;
            const latitude = 42.0 - Math.max(0, Math.min(mapYPercent, 1)) * 6.0;

            const hudCoordinates = document.getElementById('hudCoordinates');
            if (hudCoordinates) {
              hudCoordinates.textContent = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;
            }

            const signalStrength = document.getElementById('hudSignalStrength');
            if (signalStrength && Math.random() < 0.05) {
              const strengths = ['MÜKEMMEL', 'KARARLI', 'ZAYIF', 'DÜŞÜK', 'TARANIYOR'];
              signalStrength.textContent = strengths[Math.floor(Math.random() * strengths.length)];
            }

            // Crosshairs & 3D Tilt calculation
            if (wrapper && wrapperRect) {
              const relX = mx - wrapperRect.left;
              const relY = my - wrapperRect.top;
              wrapper.style.setProperty('--map-mouse-x', `${relX}px`);
              wrapper.style.setProperty('--map-mouse-y', `${relY}px`);

              const halfW = wrapperRect.width / 2;
              const halfH = wrapperRect.height / 2;
              const tiltX = -((my - (wrapperRect.top + halfH)) / halfH) * 5; // max 5deg rotateX
              const tiltY = ((mx - (wrapperRect.left + halfW)) / halfW) * 5;  // max 5deg rotateY

              // Direct GSAP transform rotation is hardware-accelerated and bypasses variable parsing repaints
              gsap.to(wrapper, {
                rotateX: tiltX,
                rotateY: tiltY,
                duration: 0.45,
                ease: 'power1.out',
                overwrite: 'auto'
              });
            }
          } else {
            gsap.to(mapHUD, { opacity: 0, duration: 0.3, overwrite: 'auto' });
            if (wrapper) {
              gsap.to(wrapper, {
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
    });

    portalStage.addEventListener('mouseleave', () => {
      gsap.to(mapHUD, { opacity: 0, duration: 0.3, overwrite: 'auto' });
      const wrapper = document.querySelector('.portal-map-wrapper');
      if (wrapper) {
        gsap.to(wrapper, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.6,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    });
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
    } else {
      portalTargetHue = 220; // Blue theme
      accentRgb = '51, 102, 255';
    }

    if (portalStage) {
      portalStage.classList.remove('hover-marmara', 'hover-ege', 'hover-karadeniz');
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
  const showCityPreview = (city) => {
    if (revertTimeout) {
      clearTimeout(revertTimeout);
      revertTimeout = null;
    }

    if (activeCity === city) return;
    activeCity = city;

    // Update Telemetry HUD panel elements
    const hudCity = document.getElementById('hudCityName');
    const hudRegion = document.getElementById('hudRegionName');
    const hudSignal = document.getElementById('hudSignalStrength');
    const region = CITY_TO_REGION[city] || 'marmara';
    const theme = REGION_THEMES[region] || REGION_THEMES.marmara;

    if (hudCity) hudCity.textContent = CITY_NAMES_TR[city] || city.toUpperCase();
    if (hudRegion) hudRegion.textContent = region.toUpperCase();
    if (hudSignal) {
      hudSignal.textContent = 'BAĞLI';
      hudSignal.style.color = '#00e5ff';
    }
    if (mapHUD) {
      mapHUD.style.setProperty('--clr-accent', theme.accent);
      mapHUD.style.setProperty('--clr-accent-rgb', theme.rgb);
      mapHUD.style.borderColor = theme.accent;
      mapHUD.style.boxShadow = `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(${theme.rgb}, 0.25)`;
    }

    // Highlight specific hovered province in the SVG
    const lowerCity = city.toLowerCase();
    const targetProv = document.getElementById(lowerCity);
    if (targetProv) {
      document.querySelectorAll('.map-province.hover-active-province').forEach(p => {
        p.classList.remove('hover-active-province');
      });
      targetProv.classList.add('hover-active-province');
    }

    // Set region hue colors dynamically
    const market = region;
    updateThemeForMarket(market);
  };

  // Debounce returning preview panel to default guide screen
  const revertToDefault = () => {
    if (revertTimeout) {
      clearTimeout(revertTimeout);
      revertTimeout = null;
    }

    revertTimeout = setTimeout(() => {
      activeCity = null;

      // Reset Telemetry HUD panel elements
      const hudCity = document.getElementById('hudCityName');
      const hudRegion = document.getElementById('hudRegionName');
      const hudSignal = document.getElementById('hudSignalStrength');

      if (hudCity) hudCity.textContent = 'TARAMA DIŞI';
      if (hudRegion) hudRegion.textContent = 'ARANIYOR';
      if (hudSignal) {
        hudSignal.textContent = 'ZAYIF';
        hudSignal.style.color = '';
      }
      if (mapHUD) {
        mapHUD.style.setProperty('--clr-accent', '#3366ff');
        mapHUD.style.setProperty('--clr-accent-rgb', '51, 102, 255');
        mapHUD.style.borderColor = '';
        mapHUD.style.boxShadow = '';
      }

      // Remove specific hovered province highlight
      document.querySelectorAll('.map-province.hover-active-province').forEach(p => {
        p.classList.remove('hover-active-province');
      });

      portalTargetHue = 220;
      if (portalStage) {
        portalStage.classList.remove('hover-marmara', 'hover-ege', 'hover-karadeniz');
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
  const triggerSelection = (city, clientX, clientY) => {
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

    const hotspot = Array.from(document.querySelectorAll('.map-hotspot')).find(
      h => h.dataset.city.toLowerCase() === city.toLowerCase()
    );
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
        document.body.classList.remove('flag-selection-mode');
        portalStage.style.display = 'none';

        if (targetLock) {
          targetLock.style.display = 'none';
        }

        // Cancel portal background particle loop and resize handler to save resource overhead
        if (canvasAnimationId) {
          cancelAnimationFrame(canvasAnimationId);
          canvasAnimationId = null;
        }
        if (resizeCanvasHandler) {
          window.removeEventListener('resize', resizeCanvasHandler);
          resizeCanvasHandler = null;
        }
        if (portalMouseMoveHandler) {
          window.removeEventListener('mousemove', portalMouseMoveHandler);
          portalMouseMoveHandler = null;
        }

        // Keep listeners bound so cities remain clickable upon returning via city switcher
        // cleanupGatewayListeners();

        if (portalStageClickHandler) {
          portalStage.removeEventListener('click', portalStageClickHandler);
          portalStageClickHandler = null;
        }

        if (STATE.lenisInstance) {
          STATE.lenisInstance.start();
          STATE.lenisInstance.scrollTo(0, { immediate: true });
        } else {
          window.scrollTo({ top: 0 });
        }
        ScrollTrigger.refresh();
      }
    });

    // Epic sci-fi zoom-in teleportation timeline (Spiral Warp Exponential Plunge)
    tl.to('.portal-logo-container', { y: -65, scale: 0.75, opacity: 0, duration: 0.45, ease: 'power2.in' })
      .to('.portal-center-hint', { opacity: 0, scale: 0.6, duration: 0.35, ease: 'power2.in' }, 0)
      .to('#hudTargetLock', { opacity: 0, scale: 0.3, rotation: 35, duration: 0.45, ease: 'power2.in' }, 0)
      .to('.portal-map-wrapper', {
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

  // Bind Hotspot events
  const hotspots = document.querySelectorAll('.map-hotspot');
  hotspots.forEach(hotspot => {
    const city = hotspot.dataset.city;

    const onEnter = () => showCityPreview(city);
    const onLeave = () => revertToDefault();
    const clickHandler = (e) => {
      e.stopPropagation();
      const cx = e.clientX || window.innerWidth / 2;
      const cy = e.clientY || window.innerHeight / 2;
      triggerSelection(city, cx, cy);
    };
    const keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const rect = hotspot.getBoundingClientRect();
        triggerSelection(city, rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    };

    hotspot.addEventListener('mouseenter', onEnter);
    hotspot.addEventListener('mouseleave', onLeave);
    hotspot.addEventListener('click', clickHandler);
    hotspot.addEventListener('keydown', keyHandler);

    portalHotspotListeners.push({ hotspot, onEnter, onLeave, clickHandler, keyHandler });
  });

  // Bind SVG Active Province Hover/Click events
  const activeProvincesInMap = document.querySelectorAll('.map-province.province-active');
  activeProvincesInMap.forEach(prov => {
    const provId = prov.id;
    const city = provId.charAt(0).toUpperCase() + provId.slice(1);

    const onEnter = () => showCityPreview(city);
    const onLeave = () => revertToDefault();
    const clickHandler = (e) => {
      e.stopPropagation();
      const cx = e.clientX || window.innerWidth / 2;
      const cy = e.clientY || window.innerHeight / 2;
      triggerSelection(city, cx, cy);
    };

    prov.addEventListener('mouseenter', onEnter);
    prov.addEventListener('mouseleave', onLeave);
    prov.addEventListener('click', clickHandler);
    
    portalHotspotListeners.push({ hotspot: prov, onEnter, onLeave, clickHandler });
  });

  // Bind Card events (tilt and select click)
  cityCards.forEach(card => {
    const city = card.dataset.city;

    let cardRect = null;
    const onEnter = () => {
      cardRect = card.getBoundingClientRect();
      showCityPreview(city);
    };
    const onLeave = () => {
      cardRect = null;
      gsap.to(card, {
        y: 0,
        rotateY: 0,
        rotateX: 0,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto'
      });
      revertToDefault();
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

  // Auto-bypass if city is cached
  const savedCity = localStorage.getItem('tworose_city');
  if (savedCity && CITY_TO_REGION[savedCity]) {
    setCityState(savedCity);
    document.body.classList.remove('flag-selection-mode');
    portalStage.style.display = 'none';
    const mainContent = document.getElementById('main-content');
    
    // Stop portal particle loop instantly since we bypassed gateway
    if (canvasAnimationId) cancelAnimationFrame(canvasAnimationId);
    if (resizeCanvasHandler) {
      window.removeEventListener('resize', resizeCanvasHandler);
      resizeCanvasHandler = null;
    }
    if (portalMouseMoveHandler) {
      window.removeEventListener('mousemove', portalMouseMoveHandler);
      portalMouseMoveHandler = null;
    }
    
    // Keep listeners bound so cities are clickable if user returns via city switcher
    // cleanupGatewayListeners();
    if (portalStageClickHandler) {
      portalStage.removeEventListener('click', portalStageClickHandler);
      portalStageClickHandler = null;
    }

    // Lock initial inline opacities to 0 on auto-bypass reload to prevent visual flash
    const initialNav = document.getElementById('main-nav');
    const initialOverlay = document.getElementById('heroOverlay');
    const initialVideo = document.getElementById('video-scene-1');
    if (initialNav) initialNav.style.opacity = '0';
    if (initialOverlay) initialOverlay.style.opacity = '0';
    if (initialVideo) {
      initialVideo.style.opacity = '0';
      initialVideo.style.visibility = 'hidden';
    }

    // Run a smooth premium entrance animation on auto-bypass reload
    gsap.set(mainContent, { opacity: 0 });
    const tl = gsap.timeline({
      onComplete: () => {
        mainContent.style.pointerEvents = 'all';
        if (STATE.lenisInstance) {
          STATE.lenisInstance.start();
        }
        ScrollTrigger.refresh();
      }
    });

    tl.to(mainContent, { opacity: 1, duration: 0.6, ease: 'power2.out' });

    // Start dynamic priority prewarming from index 0 on auto-bypass
    prewarmAround(0);
  }
}

function setupNavScroll() {
  const nav = document.getElementById('main-nav');
  let isScrolled = false;
  window.addEventListener('scroll', () => {
    if (nav) {
      const scrolled = window.scrollY > 50;
      if (scrolled !== isScrolled) {
        isScrolled = scrolled;
        if (scrolled) {
          nav.classList.add('nav-scrolled');
        } else {
          nav.classList.remove('nav-scrolled');
        }
      }
    }
  }, { passive: true });

  const citySwitcherBtn = document.getElementById('citySwitcherBtn');
  if (citySwitcherBtn) {
    citySwitcherBtn.addEventListener('click', () => {
      openPortalGateway();
    });
  }

  // Bind navigation links & logo
  const navLogo = document.getElementById('navLogo');
  if (navLogo) {
    navLogo.addEventListener('click', (e) => {
      e.preventDefault();
      if (STATE.lenisInstance) {
        STATE.lenisInstance.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  const homeLink = document.querySelector('.nav-links a:first-child');
  if (homeLink) {
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (STATE.lenisInstance) {
        STATE.lenisInstance.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  const scrollerLink = document.getElementById('navScrollerLink');
  if (scrollerLink) {
    scrollerLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (STATE.lenisInstance) {
        STATE.lenisInstance.scrollTo('#cinema-section', {
          offset: window.innerHeight * 3.0,
          duration: 1.2
        });
      } else {
        const target = document.getElementById('cinema-section');
        if (target) {
          window.scrollTo({
            top: target.offsetTop + window.innerHeight * 3.0,
            behavior: 'smooth'
          });
        }
      }
    });
  }

  const contactLink = document.getElementById('navContactLink');
  if (contactLink) {
    contactLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (STATE.lenisInstance) {
        STATE.lenisInstance.scrollTo('#cinema-section', {
          offset: window.innerHeight * 36,
          duration: 1.2
        });
      } else {
        const target = document.getElementById('cinema-section');
        if (target) {
          window.scrollTo({
            top: target.offsetTop + window.innerHeight * 36,
            behavior: 'smooth'
          });
        }
      }
    });
  }

  // Bind the Hero Landing CTA button
  const heroStartBtn = document.getElementById('heroStartScrubBtn');
  if (heroStartBtn) {
    heroStartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (STATE.lenisInstance) {
        STATE.lenisInstance.scrollTo('#cinema-section', {
          offset: window.innerHeight * 3.0,
          duration: 1.5
        });
      } else {
        const target = document.getElementById('cinema-section');
        if (target) {
          window.scrollTo({
            top: target.offsetTop + window.innerHeight * 3.0,
            behavior: 'smooth'
          });
        }
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
          if (STATE.lenisInstance && !document.body.classList.contains('flag-selection-mode') && document.getElementById('services-modal').hasAttribute('hidden')) {
            STATE.lenisInstance.start();
          }
        }
      });
    } else {
      drawer.setAttribute('hidden', '');
      if (STATE.lenisInstance) STATE.lenisInstance.start();
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
        if (target === 'home') {
          if (STATE.lenisInstance) {
            STATE.lenisInstance.scrollTo(0, { duration: 1.2 });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else if (target === 'services') {
          if (servicesLink) {
            servicesLink.click();
          }
        } else if (target === 'cinema') {
          if (STATE.lenisInstance) {
            STATE.lenisInstance.scrollTo('#cinema-section', {
              offset: window.innerHeight * 3.0,
              duration: 1.2
            });
          } else {
            const el = document.getElementById('cinema-section');
            if (el) window.scrollTo({ top: el.offsetTop + window.innerHeight * 3.0, behavior: 'smooth' });
          }
        } else if (target === 'contact') {
          if (STATE.lenisInstance) {
            STATE.lenisInstance.scrollTo('#cinema-section', {
              offset: window.innerHeight * 36,
              duration: 1.2
            });
          } else {
            const el = document.getElementById('cinema-section');
            if (el) window.scrollTo({ top: el.offsetTop + window.innerHeight * 36, behavior: 'smooth' });
          }
        }
      }, 300);
    });
  });
}

// ==========================================
// 6. CINEMATIC INTERACTIVE SCROLL-SCRUB
// ==========================================
function setupCinemaEngine() {
  const cinemaSection = document.getElementById('cinema-section');
  const irisOverlay = document.getElementById('irisOverlay');
  const heroOverlay = document.getElementById('heroOverlay');
  const textBlocks = document.querySelectorAll('.scene-text-block');
  const navProgressBar = document.getElementById('navProgressBar');
  const loader = document.getElementById('cinemaLoader');

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
    { video: v1, irisX: 50, irisY: 60, yStart: 0, yEnd: 100 }, // Mona Lisa
    { video: v2, irisX: 50, irisY: 50, yStart: 0, yEnd: 90 },  // Samurai
    { video: v3, irisX: 50, irisY: 45, yStart: 0, yEnd: 100 }, // Grandmother
    { video: v4, irisX: 50, irisY: 50, yStart: 0, yEnd: 90 },  // Astronaut
    { video: v5, irisX: 50, irisY: 50, yStart: 0, yEnd: 95 },  // Cowboy
    { video: v6, irisX: 50, irisY: 50, yStart: 0, yEnd: 95 },  // Gandalf
    { video: v7, irisX: 50, irisY: 50, yStart: 0, yEnd: 95 },  // Knight
    { video: v8, irisX: 50, irisY: 50, yStart: 0, yEnd: 100 }, // Monk
    { video: v9, irisX: 50, irisY: 50, yStart: 0, yEnd: 100 }, // Roman
    { video: v10, irisX: 50, irisY: 50, yStart: 0, yEnd: 100 },// Sumo
    { video: v11, irisX: 50, irisY: 50, yStart: 0, yEnd: 95 }, // Victorian (Duchess)
    { video: v12, irisX: 50, irisY: 50, yStart: 0, yEnd: 100 } // Viking
  ];

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
    let dt = (now - lastFrameTime) / 16.666;
    lastFrameTime = now;

    if (dt > 10) dt = 1.0;

    const cState = STATE.cinema;
    const activeScene = scenes[cState.activeIdx];
    const video = activeScene ? activeScene.video : null;

    // Frame-rate independent physics interpolation formulas using delta-time
    const timeLerp = 1 - Math.pow(1 - 0.14, dt);
    const maskLerp = 1 - Math.pow(1 - 0.11, dt);

    cState.currentTime += (cState.targetTime - cState.currentTime) * timeLerp;
    cState.currentRadius += (cState.targetRadius - cState.currentRadius) * maskLerp;
    cState.currentX += (cState.targetX - cState.currentX) * timeLerp;
    cState.currentY += (cState.targetY - cState.currentY) * timeLerp;
    cState.currentVideoY += (cState.targetVideoY - cState.currentVideoY) * timeLerp;
 
    // Prevent NaN/negative interpolation errors
    if (isNaN(cState.currentTime) || cState.currentTime < 0) cState.currentTime = 0;
    if (isNaN(cState.targetTime) || cState.targetTime < 0) cState.targetTime = 0;
    if (isNaN(cState.currentRadius) || cState.currentRadius < 0) cState.currentRadius = 0;
    if (isNaN(cState.currentVideoY)) cState.currentVideoY = 50;

    // Clamp values dynamically to actual loaded video duration
    if (video && !isNaN(video.duration) && video.duration > 0) {
      if (cState.targetTime > video.duration) {
        cState.targetTime = video.duration;
      }
      if (cState.currentTime > video.duration) {
        cState.currentTime = video.duration;
      }
    }

    // Track if all interpolated variables have settled to targets
    let settled = true;

    // LERP snapping thresholds to prevent infinite micro-calculations on trailing values
    if (Math.abs(cState.targetTime - cState.currentTime) < 0.01) {
      cState.currentTime = cState.targetTime;
    } else {
      settled = false;
    }
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
    if (Math.abs(cState.targetVideoY - cState.currentVideoY) < 0.05) {
      cState.currentVideoY = cState.targetVideoY;
    } else {
      settled = false;
    }

    // Apply vertical pan Y offset dynamically to active video element (guarded to avoid style recalculations when stationary)
    if (video) {
      const roundedVideoY = Math.round(cState.currentVideoY * 10) / 10;
      if (video !== lastActiveVideo || roundedVideoY !== lastVideoY) {
        video.style.setProperty('--video-y', `${roundedVideoY}%`);
        lastVideoY = roundedVideoY;
        lastActiveVideo = video;
      }

      // Sync safeguard: force active video to remain paused during scroll scrubbing to prevent autonomous playback conflicts
      if (!video.paused) {
        video.pause();
      }
    }

    // Apply safe, buffered video seeking (uses pendingSeek queue and synchronous seek lock)
    if (video && video.readyState >= 1) {
      const seekDiff = Math.abs(video.currentTime - cState.currentTime);
      if (seekDiff > 0.01) {
        settled = false;
        
        if (video.dataset.customSeeking === undefined) {
          video.dataset.customSeeking = 'false';
        }
        
        const isCustomSeeking = video.dataset.customSeeking === 'true';
        if (!isCustomSeeking) {
          try {
            video.dataset.customSeeking = 'true';
            video.currentTime = cState.currentTime;
          } catch (e) {
            video.dataset.customSeeking = 'false';
            logErrorDebug(`Direct seek failed on ${video.id}:`, e);
          }
        } else {
          // Store latest position in the pending queue
          video.dataset.pendingSeek = cState.currentTime;
        }
      }
    }

    // Loader indicator logic: show loader if video is loading or buffering the seek frame (state-guarded)
    const needsLoader = !!(video && (video.seeking || video.readyState < 2));
    if (needsLoader !== isLoaderActive) {
      isLoaderActive = needsLoader;
      if (loader) {
        if (needsLoader) {
          loader.classList.add('active');
        } else {
          loader.classList.remove('active');
        }
      }
    }

    // Apply radial CSS variables directly to the iris overlay element instead of :root (massive paint optimization)
    // Only set variables if values changed (rounded to 1 decimal place to prevent subpixel layout calculation overload)
    const roundedRadius = Math.round(cState.currentRadius * 10) / 10;
    const roundedX = Math.round(cState.currentX * 10) / 10;
    const roundedY = Math.round(cState.currentY * 10) / 10;

    if (irisOverlay && (roundedRadius !== lastRadius || roundedX !== lastX || roundedY !== lastY)) {
      irisOverlay.style.setProperty('--mask-radius', `${roundedRadius}%`);
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

  // Link scroll boundaries to target parameters using ScrollTrigger
  const irisInThreshold = 0.15;
  const irisOutThreshold = 0.85;

  const trigger = ScrollTrigger.create({
    trigger: '#cinema-section',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress; // 0.0 -> 1.0
      const cState = STATE.cinema;

      // Wake up the LERP rendering loop if it is suspended
      triggerCinemaLoop();

      // Update navigation progress bar (GPU-accelerated scaleX)
      if (navProgressBar) {
        navProgressBar.style.transform = `scaleX(${p})`;
      }

      // Update active navigation link
      updateActiveNavLink(p);

      // Helper to deactivate all text overlays
      const clearTextOverlays = () => {
        if (cState.activeTextBlockIdx !== -1) {
          cState.activeTextBlockIdx = -1;
          textBlocks.forEach(block => block.classList.remove('active'));
        }
      };

      // State variable to track hero visibility within this context
      if (typeof self.heroVisible === 'undefined') {
        self.heroVisible = true;
      }

      // 1. Landing Hero Overlay fade boundaries (0.0 to 0.10 scroll depth)
      if (p <= 0.10) {
        // Control introCard opacity (fade out completely by p = 0.10) and animate split text
        const introCard = document.getElementById('introCard');
        if (introCard) {
          const introOpacity = Math.max(0, 1 - p / 0.10);
          introCard.style.opacity = introOpacity;
          if (introOpacity > 0) {
            introCard.style.pointerEvents = 'all';
            introCard.style.visibility = 'visible';
          } else {
            introCard.style.pointerEvents = 'none';
            introCard.style.visibility = 'hidden';
          }

          // Split text sideways animations (complete by p = 0.08)
          const splitLeft = introCard.querySelector('.title-split-left');
          const splitRight = introCard.querySelector('.title-split-right');
          const eyebrow = introCard.querySelector('.intro-eyebrow');
          const subtitle = introCard.querySelector('.intro-subtitle');
          const scrollHint = introCard.querySelector('.intro-scroll-hint');
          
          const dividerLines = introCard.querySelectorAll('.intro-divider-line');
          const diamond = introCard.querySelector('.intro-divider-diamond');

          if (p > 0) {
            const pTextNorm = Math.min(1, p / 0.08);
            const opacityVal = 1 - pTextNorm;
            
            if (splitLeft) {
              splitLeft.style.transform = `translate3d(${pTextNorm * -150}px, 0, 0)`;
              splitLeft.style.opacity = opacityVal;
            }
            if (splitRight) {
              splitRight.style.transform = `translate3d(${pTextNorm * 150}px, 0, 0)`;
              splitRight.style.opacity = opacityVal;
            }
            if (eyebrow) {
              eyebrow.style.transform = `translate3d(${pTextNorm * -80}px, 0, 0)`;
              eyebrow.style.opacity = opacityVal;
            }
            if (subtitle) {
              subtitle.style.transform = `translate3d(${pTextNorm * 80}px, 0, 0)`;
              subtitle.style.opacity = opacityVal;
            }
            if (scrollHint) {
              scrollHint.style.transform = `translate3d(0, ${pTextNorm * 60}px, 0)`;
              scrollHint.style.opacity = opacityVal;
            }
            if (dividerLines.length >= 2) {
              dividerLines[0].style.transform = `translate3d(${pTextNorm * -100}px, 0, 0)`;
              dividerLines[0].style.opacity = opacityVal;
              dividerLines[1].style.transform = `translate3d(${pTextNorm * 100}px, 0, 0)`;
              dividerLines[1].style.opacity = opacityVal;
            }
            if (diamond) {
              diamond.style.transform = `rotate(45deg) scale(${1 - pTextNorm})`;
              diamond.style.opacity = opacityVal;
            }
          } else {
            // Reset inline styles to let original CSS keyframe animations run on load
            if (splitLeft) { splitLeft.style.transform = ''; splitLeft.style.opacity = ''; }
            if (splitRight) { splitRight.style.transform = ''; splitRight.style.opacity = ''; }
            if (eyebrow) { eyebrow.style.transform = ''; eyebrow.style.opacity = ''; }
            if (subtitle) { subtitle.style.transform = ''; subtitle.style.opacity = ''; }
            if (scrollHint) { scrollHint.style.transform = ''; scrollHint.style.opacity = ''; }
            if (dividerLines.length >= 2) {
              dividerLines[0].style.transform = ''; dividerLines[0].style.opacity = '';
              dividerLines[1].style.transform = ''; dividerLines[1].style.opacity = '';
            }
            if (diamond) { diamond.style.transform = ''; diamond.style.opacity = ''; }
          }
        }

        // Zoom, Pan, and Scrub Active Intro Video (scrub complete by p = 0.10)
        const activeIntroVid = document.querySelector('.cinema-intro-card .intro-video.active');
        if (activeIntroVid) {
          if (p <= 0.10) {
            if (!activeIntroVid.paused) {
              activeIntroVid.pause();
            }
            // Calculate normalized progress (0.0 -> 1.0)
            const pNorm = p / 0.10;
            
            // Scrub/seek video based on progress
            const maxScrubTime = !isNaN(activeIntroVid.duration) && activeIntroVid.duration > 0 
              ? Math.min(activeIntroVid.duration, 15.0) 
              : 10.0;
            const targetTime = pNorm * maxScrubTime;
            
            const seekDiff = Math.abs(activeIntroVid.currentTime - targetTime);
            if (seekDiff > 0.03) {
              activeIntroVid.currentTime = targetTime;
            }

            // Animate scale (from 1.0 to 1.25 at p=0.10) and translation
            const scale = 1 + p * 2.5;
            const translateY = p * -120;
            activeIntroVid.style.transform = `translate3d(-50%, -50%, 0) scale(${scale}) translateY(${translateY}px)`;
          } else {
            if (!activeIntroVid.paused) {
              activeIntroVid.pause();
            }
          }
        }

        // Fade in from 0.0 to 0.06
        const ratio_in = Math.min(1, p / 0.06);
        // Fade out from 0.08 to 0.10
        let ratio_out = 1;
        if (p >= 0.08) {
          ratio_out = Math.max(0, 1 - (p - 0.08) / 0.02);
        }
        
        const elementOpacity = ratio_in * ratio_out;
        
        if (heroOverlay) {
          heroOverlay.style.opacity = elementOpacity;
          if (elementOpacity > 0) {
            if (!self.heroVisible) {
              heroOverlay.style.pointerEvents = 'all';
              heroOverlay.style.visibility = 'visible';
              self.heroVisible = true;
            }
          } else {
            if (self.heroVisible) {
              heroOverlay.style.pointerEvents = 'none';
              heroOverlay.style.visibility = 'hidden';
              self.heroVisible = false;
            }
          }
        }

        // Handle sticky navbar fade-in (remains visible for all p > 0.05)
        const mainNav = document.getElementById('main-nav');
        if (mainNav) {
          mainNav.style.opacity = ratio_in;
        }

        // Reset active index state-guardedly and hide all film scene videos during intro card phase
        if (cState.activeIdx !== -1) {
          cState.activeIdx = -1;
          prewarmAround(0);
          
          scenes.forEach((sc) => {
            if (!sc.video) return;
            sc.video.classList.remove('active');
            sc.video.style.opacity = '0';
            sc.video.style.visibility = 'hidden';
          });
        }
        
        cState.targetTime = 0;
        cState.targetRadius = 120;
        cState.targetX = 50;
        cState.targetY = 50;
        clearTextOverlays();
        return;
      }

      // Hide hero elements once scrolled past (state-guarded)
      if (self.heroVisible) {
        if (heroOverlay) {
          heroOverlay.style.opacity = 0;
          heroOverlay.style.pointerEvents = 'none';
          heroOverlay.style.visibility = 'hidden';
        }
        const introCard = document.getElementById('introCard');
        if (introCard) {
          introCard.style.opacity = 0;
          introCard.style.pointerEvents = 'none';
          introCard.style.visibility = 'hidden';
        }
        // Pause active video when scrolled past
        const activeIntroVid = document.querySelector('.cinema-intro-card .intro-video.active');
        if (activeIntroVid && !activeIntroVid.paused) {
          activeIntroVid.pause();
        }
        self.heroVisible = false;
      }

      // Restore navigation style when scrolled past hero
      const mainNav = document.getElementById('main-nav');
      if (mainNav) {
        mainNav.style.opacity = 1;
      }

      // 2. Map scroll progress (0.10 -> 0.98) across the 12 film scenes
      const scrubProgress = Math.max(0, Math.min((p - 0.10) / 0.88, 1.0));

      const segmentSize = 1 / 12;
      const activeIdx = Math.min(Math.floor(scrubProgress / segmentSize), 11);
      const rawLocal = (scrubProgress - (activeIdx * segmentSize)) / segmentSize;
      const localProgress = Math.max(0, Math.min(rawLocal, 1.0));

      // Handle video active class shifts (state-guarded)
      if (cState.activeIdx !== activeIdx) {
        cState.activeIdx = activeIdx;
        
        // Dynamic priority prewarming queue
        prewarmAround(activeIdx);
        
        logDebug(`Active scene shifted to index: ${activeIdx}`);
        
        // Snapping: Calculate initial target time and video Y position to prevent visual flashes
        let initialTargetTime = 0;
        let initialVideoY = 0;
        const activeScene = scenes[activeIdx];
        if (activeScene) {
          if (localProgress > 0.5) {
            initialTargetTime = getSafeDuration(activeScene.video);
            initialVideoY = typeof activeScene.yEnd !== 'undefined' ? activeScene.yEnd : 100;
          } else {
            initialVideoY = typeof activeScene.yStart !== 'undefined' ? activeScene.yStart : 0;
          }
        }
        
        cState.currentTime = initialTargetTime;
        cState.targetTime = initialTargetTime;
        cState.currentVideoY = initialVideoY;
        cState.targetVideoY = initialVideoY;
        
        scenes.forEach((sc, idx) => {
          if (!sc.video) return;
          // Clear any inline style overrides applied during the intro card phase
          sc.video.style.opacity = '';
          sc.video.style.visibility = '';
          
          if (idx === activeIdx) {
            sc.video.classList.add('active');
            warmupVideo(sc.video);
            try {
              if (sc.video.readyState >= 1) {
                sc.video.currentTime = initialTargetTime;
              }
            } catch (e) {
              logErrorDebug(`Snap seek failed on active scene shift:`, e);
            }
          } else {
            sc.video.classList.remove('active');
          }
        });
      }

      const activeScene = scenes[activeIdx];
      if (!activeScene) return;

      const video = activeScene.video;
      const duration = getSafeDuration(video);

      // Set target coordinates of active focus area
      cState.targetX = activeScene.irisX;
      cState.targetY = activeScene.irisY;

      // Set target Y position for dynamic vertical panning (only pans during video scrub phase 0.15 -> 0.85)
      const yStart = typeof activeScene.yStart !== 'undefined' ? activeScene.yStart : 0;
      const yEnd = typeof activeScene.yEnd !== 'undefined' ? activeScene.yEnd : 100;
      let panProgress = 0;
      if (localProgress <= irisInThreshold) {
        panProgress = 0;
      } else if (localProgress > irisInThreshold && localProgress <= irisOutThreshold) {
        panProgress = (localProgress - irisInThreshold) / (irisOutThreshold - irisInThreshold);
      } else {
        panProgress = 1.0;
      }
      cState.targetVideoY = yStart + (yEnd - yStart) * panProgress;

      // Map three phases (Iris-In, Scrub, Iris-Out) to targets
      if (localProgress <= irisInThreshold) {
        cState.targetTime = 0;
        const ratio = localProgress / irisInThreshold;
        cState.targetRadius = ratio * 120;
      } else if (localProgress > irisInThreshold && localProgress <= irisOutThreshold) {
        cState.targetRadius = 120;
        const ratio = (localProgress - irisInThreshold) / (irisOutThreshold - irisInThreshold);
        cState.targetTime = ratio * duration;
      } else {
        cState.targetTime = duration;
        const ratio = (localProgress - irisOutThreshold) / (1.0 - irisOutThreshold);
        cState.targetRadius = (1.0 - ratio) * 120;
      }

      // Synchronize text overlays (active only between 15% and 85% of local progress)
      // Fully state-guarded to avoid high-frequency DOM manipulation
      let targetTextBlockIdx = -1;
      if (localProgress > 0.15 && localProgress < 0.85) {
        targetTextBlockIdx = activeIdx;
      }

      if (cState.activeTextBlockIdx !== targetTextBlockIdx) {
        cState.activeTextBlockIdx = targetTextBlockIdx;
        logDebug(`Text overlay shifted to index: ${targetTextBlockIdx}`);
        textBlocks.forEach((block, idx) => {
          if (idx === targetTextBlockIdx) {
            block.classList.add('active');
          } else {
            block.classList.remove('active');
          }
        });
      }

      // 3. Final Booking reveal screen boundary trigger
      if (p >= 0.98) {
        openBookingScreen();
        clearTextOverlays();
      } else {
        closeBookingScreen();
      }
    }
  });

  // Force initial state update immediately to initialize style states on load
  trigger.update();
}

// ==========================================
// 7. BOOKING REVEAL SCREEN CONTROL
// ==========================================
function openBookingScreen() {
  if (!bookingRevealEl) return;
  
  if (bookingRevealEl.hasAttribute('hidden')) {
    logDebug('Triggering final booking screen fade-in.');
    bookingRevealEl.removeAttribute('hidden');
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
    logDebug('Hiding booking screen.');
    bookingRevealEl.setAttribute('hidden', '');
  }
}

function getServiceLabelTR(service) {
  const labels = {
    'konut': 'Ev & Villa Temizliği',
    'ofis': 'Ofis & Plaza Temizliği',
    'insaat': 'İnşaat Sonrası Temizlik',
    'hali': 'Halı & Koltuk Yıkama',
    'dis-cephe': 'Dış Cephe Cam Temizliği',
    'dezenfeksiyon': 'Dezenfeksiyon Hizmeti'
  };
  return labels[service] || service;
}

function getFrequencyLabelTR(coeff) {
  const labels = {
    '1': 'Tek Seferlik',
    '0.8': 'Haftalık Düzenli (%20 İndirim)',
    '0.9': 'Aylık Düzenli (%10 İndirim)'
  };
  return labels[coeff] || 'Düzenli';
}

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

  const serviceLabel = getServiceLabelTR(serviceType);
  const freqLabel = getFrequencyLabelTR(frequency);
  const formattedPrice = new Intl.NumberFormat('tr-TR', { 
    style: 'currency', 
    currency: 'TRY', 
    maximumFractionDigits: 0 
  }).format(price);

  const extrasHtml = extras.length > 0 
    ? extras.map(ext => `<li>${ext}</li>`).join('')
    : '<li>Yok</li>';

  summaryBox.innerHTML = `
    <h4>SEÇİLEN DETAYLAR</h4>
    <div class="summary-row"><span>Hizmet Türü:</span> <span class="summary-val">${serviceLabel}</span></div>
    <div class="summary-row"><span>Hizmet Alanı:</span> <span class="summary-val">${area} m²</span></div>
    <div class="summary-row"><span>Sıklık:</span> <span class="summary-val">${freqLabel}</span></div>
    <div class="summary-row" style="flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 8px; margin-bottom: 8px;">
      <span>Ekstralar:</span>
      <ul style="padding-left: 16px; margin: 0; list-style-type: square; color: #fff; width: 100%;">
        ${extrasHtml}
      </ul>
    </div>
    <div class="summary-row"><span>Tahmini Tutar:</span> <span class="summary-price">${formattedPrice}</span></div>
  `;
  
  gsap.killTweensOf(summaryBox);
  summaryBox.style.display = 'block';
  gsap.fromTo(summaryBox, 
    { height: 0, opacity: 0, scale: 0.95, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 },
    { height: 'auto', opacity: 1, scale: 1, marginTop: 8, marginBottom: 16, paddingTop: 16, paddingBottom: 16, duration: 0.5, ease: 'power2.out' }
  );
}

function setupBookingReveal() {
  const form = document.getElementById('bookingForm');
  const successState = document.getElementById('bookingSuccessState');
  const okBtn = document.getElementById('successOkBtn');

  // Bi-directional state/color synchronization on city changes in dropdown
  const citySelect = document.getElementById('cCity');
  if (citySelect) {
    citySelect.addEventListener('change', (e) => {
      const city = e.target.value;
      if (city && CITY_TO_REGION[city]) {
        setCityState(city);
      }
    });
  }

  // Break applied calculator state if the user manually changes the cleaning type dropdown to another service type
  const serviceSelect = document.getElementById('cService');
  if (serviceSelect) {
    serviceSelect.addEventListener('change', () => {
      if (STATE.calculator.applied && serviceSelect.value !== STATE.calculator.serviceType) {
        STATE.calculator.applied = false;
        updateBookingSummaryBox();
      }
    });
  }

  // Handle Form Submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Disable submit button during animation/load sequence to prevent double submissions
      const submitBtn = form.querySelector('.cinema-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
      }

      const name = document.getElementById('cName')?.value || '';
      const phone = document.getElementById('cPhone')?.value || '';
      const city = document.getElementById('cCity')?.value || '';
      const service = document.getElementById('cService')?.value || '';

      const payload = {
        name,
        phone,
        city,
        service,
        calculatorApplied: STATE.calculator.applied
      };

      if (STATE.calculator.applied) {
        payload.calculatorDetails = {
          serviceType: STATE.calculator.serviceType,
          area: STATE.calculator.area,
          frequency: STATE.calculator.frequency,
          extras: STATE.calculator.extras,
          price: STATE.calculator.price
        };
      }

      logDebug('Booking form submitted. Staging payload:', payload);

      if (city && city !== STATE.selectedCity) {
        setCityState(city);
      }

      gsap.to(form, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          form.style.display = 'none';
          form.style.opacity = '1';
          
          if (successState) {
            successState.removeAttribute('hidden');
            gsap.fromTo(successState,
              { scale: 0.9, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out', onComplete: () => {
                // Celebrate booking request submission with double celebratory dust burst
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
    });
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

function setupKeyboardCinemaScroll() {
  window.addEventListener('keydown', (e) => {
    // Ignore if selection gateway is active, or if booking screen is open, or services modal is open
    if (document.body.classList.contains('flag-selection-mode')) return;
    
    const servicesModal = document.getElementById('services-modal');
    if (servicesModal && !servicesModal.hasAttribute('hidden')) return;

    const bookingReveal = document.getElementById('bookingReveal');
    if (bookingReveal && !bookingReveal.hasAttribute('hidden')) return;

    // Accessibility: Do not intercept keys if user is typing in a text field, textarea, or editable element
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      return;
    }

    // Check if key is ArrowUp, ArrowDown, PageUp, PageDown, or Spacebar
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) {
      e.preventDefault();
      
      const isDown = ['ArrowDown', 'PageDown', ' '].includes(e.key) && !e.shiftKey;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // Each scene block spans 300% window height (3 * windowHeight)
      const step = windowHeight * 3.0;
      
      let targetScroll = scrollY + (isDown ? step : -step);
      
      // Clamp scroll position
      const maxScroll = document.documentElement.scrollHeight - windowHeight;
      targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
      
      if (STATE.lenisInstance) {
        STATE.lenisInstance.scrollTo(targetScroll, {
          duration: 1.4,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      } else {
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }
    }
  });
}

// ==========================================
// 10. SERVICES & PRICING ESTIMATOR ENGINE
// ==========================================
function setupServicesModal() {
  const servicesModal = document.getElementById('services-modal');
  const servicesLink = document.getElementById('navServicesLink');
  const closeServicesBtn = document.getElementById('closeServicesBtn');
  const servicesBackdrop = document.getElementById('servicesBackdrop');
  
  const serviceItems = document.querySelectorAll('.service-item-detail');
  const areaRange = document.getElementById('calc-area-range');
  const areaLabel = document.getElementById('area-val-label');
  const frequencySelect = document.getElementById('calc-frequency');
  const extraCbs = document.querySelectorAll('.calc-extra-cb');
  const priceDisplay = document.getElementById('calc-price-display');
  const applyBtn = document.getElementById('calcApplyBtn');
  
  if (!servicesModal || !servicesLink) return;

  const modalWrapper = servicesModal.querySelector('.modal-wrapper');
  if (!modalWrapper) return;
  
  let currentBasePrice = 15; // Ev & Villa default
  let currentServiceType = 'konut';
  let currentCostObject = { val: 1500 }; // track and animate current price calculation
  
  servicesLink.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Sync services modal selection with current booking form dropdown value
    const formServiceSelect = document.getElementById('cService');
    if (formServiceSelect && formServiceSelect.value) {
      const targetService = formServiceSelect.value;
      const matchingItem = Array.from(serviceItems).find(el => el.dataset.service === targetService);
      if (matchingItem) {
        serviceItems.forEach(el => el.classList.remove('active'));
        matchingItem.classList.add('active');
        currentServiceType = targetService;
        currentBasePrice = parseFloat(matchingItem.dataset.basePrice || 15);
        logDebug(`Syncing services modal with booking form value: ${targetService}`);
      }
    }
    
    servicesModal.removeAttribute('hidden');
    if (STATE.lenisInstance) STATE.lenisInstance.stop();
    
    gsap.fromTo(modalWrapper,
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto', onComplete: () => {
        updateSliderBackground();
      }}
    );
    calculatePrice();
  });
  
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
      currentServiceType = item.dataset.service || 'konut';
      calculatePrice();
    });
  });
  
  if (areaRange) {
    areaRange.addEventListener('input', (e) => {
      if (areaLabel) areaLabel.textContent = e.target.value;
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
    const min = parseFloat(areaRange.min || 20);
    const max = parseFloat(areaRange.max || 500);
    const val = parseFloat(areaRange.value || 100);
    const percentage = ((val - min) / (max - min)) * 100;
    const accentColor = document.documentElement.style.getPropertyValue('--clr-accent') || '#3366ff';
    areaRange.style.background = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percentage}%, rgba(255, 255, 255, 0.08) ${percentage}%, rgba(255, 255, 255, 0.08) 100%)`;
  }

  function calculatePrice(isDragging = false) {
    const area = areaRange ? parseInt(areaRange.value || 100) : 100;
    const freqCoeff = frequencySelect ? parseFloat(frequencySelect.value || 1) : 1;
    
    // Update slider fill track
    updateSliderBackground();
    
    const baseCost = area * currentBasePrice;
    
    let extraCost = 0;
    const activeExtras = [];
    if (extraCbs) {
      extraCbs.forEach(cb => {
        if (cb.checked) {
          extraCost += parseFloat(cb.value || 0);
          const labelText = cb.parentElement.textContent.trim().split('(+')[0].trim();
          activeExtras.push(labelText);
        }
      });
    }
    
    const totalCost = Math.round((baseCost * freqCoeff) + extraCost);
    
    // Update STATE calculator
    STATE.calculator.serviceType = currentServiceType;
    STATE.calculator.area = area;
    STATE.calculator.frequency = frequencySelect ? frequencySelect.value : '1';
    STATE.calculator.extras = activeExtras;
    STATE.calculator.price = totalCost;

    // Render itemized receipt details
    const receiptBox = document.getElementById('calculatorReceipt');
    if (receiptBox) {
      const tr = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
      
      let receiptHtml = `
        <h4>FİYAT DETAY HESAP DÖKÜMÜ</h4>
        <div class="receipt-row">
          <span class="receipt-lbl">Taban Hizmet Alanı</span>
          <span class="receipt-leader"></span>
          <span class="receipt-val">${area} m²</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-lbl">Birim m² Maliyeti</span>
          <span class="receipt-leader"></span>
          <span class="receipt-val">${tr.format(currentBasePrice)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-lbl">Brüt Alan Maliyeti</span>
          <span class="receipt-leader"></span>
          <span class="receipt-val">${tr.format(baseCost)}</span>
        </div>
      `;

      if (freqCoeff !== 1) {
        const discountPct = Math.round((1 - freqCoeff) * 100);
        const discountVal = baseCost * (1 - freqCoeff);
        receiptHtml += `
          <div class="receipt-row">
            <span class="receipt-lbl">Düzenli Sıklık İndirimi (-%${discountPct})</span>
            <span class="receipt-leader"></span>
            <span class="receipt-val discount-green">-${tr.format(discountVal)}</span>
          </div>
        `;
      }

      if (extraCbs) {
        extraCbs.forEach(cb => {
          if (cb.checked) {
            const val = parseFloat(cb.value || 0);
            const labelText = cb.parentElement.textContent.trim().split('(+')[0].trim();
            receiptHtml += `
              <div class="receipt-row">
                <span class="receipt-lbl">Ekstra: ${labelText}</span>
                <span class="receipt-leader"></span>
                <span class="receipt-val">+${tr.format(val)}</span>
              </div>
            `;
          }
        });
      }

      receiptHtml += `
        <div class="receipt-row receipt-total-row">
          <span class="receipt-lbl" style="font-weight: 700; color: #fff;">Tahmini Toplam Tutar</span>
          <span class="receipt-leader"></span>
          <span class="receipt-val receipt-total-val" id="receipt-total-val">${tr.format(totalCost)}</span>
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

    if (isDragging) {
      // Instant update to prevent visual lag while actively dragging the slider
      currentCostObject.val = totalCost;
      if (priceDisplay) {
        priceDisplay.textContent = new Intl.NumberFormat('tr-TR', { 
          style: 'currency', 
          currency: 'TRY', 
          maximumFractionDigits: 0 
        }).format(totalCost);
      }
    } else {
      // Animate price rolls smoothly (GSAP rolling number)
      gsap.to(currentCostObject, {
        val: totalCost,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto',
        onUpdate: () => {
          if (priceDisplay) {
            const formatted = new Intl.NumberFormat('tr-TR', { 
              style: 'currency', 
              currency: 'TRY', 
              maximumFractionDigits: 0 
            }).format(Math.round(currentCostObject.val));
            priceDisplay.textContent = formatted;
          }
        }
      });
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
        if (STATE.lenisInstance) {
          STATE.lenisInstance.scrollTo('#cinema-section', {
            offset: window.innerHeight * 36,
            duration: 1.2
          });
        } else {
          const target = document.getElementById('cinema-section');
          if (target) {
            window.scrollTo({
              top: target.offsetTop + window.innerHeight * 36,
              behavior: 'smooth'
            });
          }
        }
      }, 300);
    });
  }
}

// ==========================================
// 11. RETURN TO PORTAL GATEWAY ENGINE
// ==========================================
function openPortalGateway() {
  const portalStage = document.getElementById('portal-stage');
  const mainContent = document.getElementById('main-content');
  if (!portalStage || !mainContent) return;

  // Initialize province paths stroke-drawing
  const provincePaths = document.querySelectorAll('.map-province path');
  provincePaths.forEach(path => {
    const length = path.getTotalLength ? path.getTotalLength() : 300;
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
  });

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
  gsap.set('.portal-map-wrapper', { opacity: 0, y: 30, scale: 0.98 });
  gsap.set('.map-hotspot', { opacity: 0, scale: 0 });
  gsap.set('#portalDefaultPanel', { display: 'flex', opacity: 0, x: 20 });
  gsap.set('.portal-logo-container', { y: -30, opacity: 0 });
  gsap.set('.portal-center-hint', { opacity: 0 });
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
    }
  });

  tl.to('#main-content', { opacity: 0, pointerEvents: 'none', duration: 0.4, ease: 'power2.inOut' })
    .to(portalStage, { opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.1')
    .to('.grid-line.horizontal', { scaleX: 1, duration: 1.1, ease: 'power3.inOut' }, '-=0.2')
    .to('.grid-line.vertical', { scaleY: 1, duration: 1.1, ease: 'power3.inOut' }, '-=1.1')
    .to(['.hud-tl', '.hud-tr', '.hud-bl', '.hud-br'], { x: 0, y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.05 }, '-=0.4')
    .to('.telemetry-tick', { opacity: 0.45, duration: 0.6, stagger: 0.05, ease: 'power1.inOut' }, '-=0.4')
    .to('.portal-logo-container', { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, '-=0.4')
    .to('.portal-center-hint', { opacity: 0.25, duration: 0.6 }, '-=0.3')
    .to('.portal-map-wrapper', { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'power3.out' }, '-=0.4')
    .to(provincePaths, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out', stagger: 0.004 }, '-=0.8')
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
    if (!isKeyboardNav) {
      cursor.style.opacity = '1';
    }
    startCursorLoop();
  }, { passive: true });

  // Hide cursor on viewport escape/enter
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    if (!isKeyboardNav) {
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
  window.addEventListener('mousemove', () => {
    if (isKeyboardNav) {
      isKeyboardNav = false;
      cursor.style.opacity = '1';
    }
    startCursorLoop();
  }, { passive: true });

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

  let lightTicking = false;
  let lightMX = 0;
  let lightMY = 0;

  window.addEventListener('mousemove', (e) => {
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

// ==========================================
// 14. GLOBAL HOLOGRAPHIC CLICK SHOCKWAVE RIPPLES & HOVER TICKS
// ==========================================
function setupHolographicClickRipples() {
  // Global hover micro-ticks using mouseover capturing
  document.addEventListener('mouseover', (e) => {
    const interactive = e.target.closest('a, button, .map-hotspot, .map-province.province-active, .calculator-btn, .tab-btn, .service-item-detail');
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
    const interactive = e.target.closest('a, button, .cc-gateway-card, .map-hotspot, .map-province.province-active, .mobile-menu-toggle, .calculator-btn, .tab-btn, .service-item-detail');
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
      // General HTML element click
      const rect = interactive.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Force relative positioning for static nodes to keep ripple aligned
      if (window.getComputedStyle(interactive).position === 'static') {
        interactive.style.position = 'relative';
      }
      
      // Hide overflow on buttons and gateway cards
      if (interactive.tagName === 'BUTTON' || interactive.classList.contains('cc-gateway-card')) {
        interactive.style.overflow = 'hidden';
      }

      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      interactive.appendChild(ripple);
    }

    // Auto cleanup ripple after animation finishes
    setTimeout(() => {
      ripple.remove();
    }, 800);
  });
}

// ==========================================
// 15. FUTURISTIC WEB AUDIO SYNTH & UX TOGGLE
// ==========================================
class CyberSynth {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('tworose_audio_muted') === 'true';
    this.spikeTimeout = null;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  triggerSpike() {
    const visualizer = document.querySelector('.audio-visualizer-bars');
    if (!visualizer) return;
    visualizer.classList.remove('spike-active');
    void visualizer.offsetWidth; // Force layout recalculation
    visualizer.classList.add('spike-active');
    
    if (this.spikeTimeout) clearTimeout(this.spikeTimeout);
    this.spikeTimeout = setTimeout(() => {
      visualizer.classList.remove('spike-active');
    }, 150);
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
    localStorage.setItem('tworose_audio_muted', this.muted);
    
    // Resume audio context if suspended to satisfy browser gesture requirements
    if (!this.muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.updateToggleUI();
  }

  updateToggleUI() {
    const btn = document.getElementById('portalAudioToggle');
    if (!btn) return;

    const text = btn.querySelector('.audio-toggle-text');

    if (this.muted) {
      btn.classList.add('muted');
      if (text) text.textContent = 'AUDIO: OFF';
    } else {
      btn.classList.remove('muted');
      if (text) text.textContent = 'AUDIO: ON';
    }
  }
}

const synth = new CyberSynth();

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
      synth.ctx.resume();
    }
    document.removeEventListener('click', enableAudioCtx);
    document.removeEventListener('keydown', enableAudioCtx);
  };
  document.addEventListener('click', enableAudioCtx);
  document.addEventListener('keydown', enableAudioCtx);
}

