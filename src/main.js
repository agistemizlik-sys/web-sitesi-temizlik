import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Styled Developer Debugging System (triggered via URL '#debug' or localStorage)
const DEBUG = window.location.hash.includes('debug') || localStorage.getItem('tworose_debug') === 'true';
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
    const pending = parseFloat(video.dataset.pendingSeek);
    if (!isNaN(pending)) {
      video.dataset.pendingSeek = ''; // clear
      const diff = Math.abs(video.currentTime - pending);
      if (diff > 0.01) {
        logDebug(`Executing buffered seek on ${video.id} to ${pending}s`);
        try {
          video.currentTime = pending;
        } catch (e) {
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

// ==========================================
// 1. DUST CANVAS & AMBIENT PARTICLE SYSTEM
// ==========================================
let canvasAnimationId = null;
let resizeCanvasHandler = null;

function setupPortalParticles() {
  const canvas = document.getElementById('dust-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (canvasAnimationId) {
    cancelAnimationFrame(canvasAnimationId);
    canvasAnimationId = null;
  }

  let lastDrawTime = performance.now();
  let explosionParticles = [];
 
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

  // Initialize gentle ambient floating particles
  const ambientCount = 35;
  STATE.ambientParticles = Array.from({ length: ambientCount }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    size: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.4 + 0.1,
    hue: 210 + Math.random() * 30 // Cyan-ish blue range
  }));
 
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
        hue: Math.random() * 40 + 200
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

    // 1. Render & update ambient particles
    STATE.ambientParticles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

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
// ==========================================
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

  // Save to localStorage
  localStorage.setItem('tworose_city', city);
}

// ==========================================
// 3. INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  bookingRevealEl = document.getElementById('bookingReveal');
  setupLenis();
  setupPortalParticles();
  setupPortalGateway();
  setupNavScroll();
  setupCinemaEngine();
  setupBookingReveal();
  setupServicesModal();
  setupResizeObserver();
  setupGlobalEscapeKey();
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
  const cityCards = document.querySelectorAll('.cc-gateway-card');
  const parallaxLayers = document.querySelectorAll('.parallax-layer');

  // Mouse Parallax Track (Cached DOM references to prevent hover mousemove thrashing)
  portalStage.addEventListener('mousemove', (e) => {
    const cx = (e.clientX / window.innerWidth - 0.5) * 2;
    const cy = (e.clientY / window.innerHeight - 0.5) * 2;

    parallaxLayers.forEach(layer => {
      const depth = layer.dataset.depth || 0.04;
      gsap.to(layer, {
        x: cx * depth * 30,
        y: cy * depth * 20,
        duration: 0.8,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });
  });

  // Premium 3D Card Hover Tilt Interaction
  cityCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const px = (x / rect.width - 0.5) * 2;
      const py = (y / rect.height - 0.5) * 2;

      gsap.to(card, {
        y: -6,
        rotateY: px * 8,
        rotateX: -py * 8,
        transformPerspective: 800,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        y: 0,
        rotateY: 0,
        rotateX: 0,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });
  });

  // Handle City Card Click
  cityCards.forEach(card => {
    const triggerSelection = (e) => {
      e.stopPropagation();
      const city = card.dataset.city;
      
      const cx = e.clientX || window.innerWidth / 2;
      const cy = e.clientY || window.innerHeight / 2;
      
      if (typeof window.triggerDust === 'function') {
        window.triggerDust(cx, cy);
      }
      setCityState(city);
      
      // Start dynamic priority prewarming from index 0
      prewarmAround(0);

      // Disable interactions during entry transition
      portalStage.style.pointerEvents = 'none';

      const tl = gsap.timeline({
        onComplete: () => {
          document.body.classList.remove('flag-selection-mode');
          portalStage.style.display = 'none';
          
          // Cancel portal background particle loop and resize handler to save resource overhead
          if (canvasAnimationId) {
            cancelAnimationFrame(canvasAnimationId);
            canvasAnimationId = null;
          }
          if (resizeCanvasHandler) {
            window.removeEventListener('resize', resizeCanvasHandler);
            resizeCanvasHandler = null;
          }
          
          if (STATE.lenisInstance) {
            STATE.lenisInstance.start();
          }
          ScrollTrigger.refresh();
        }
      });

      tl.to('.portal-logo-container', { y: -45, opacity: 0, duration: 0.4, ease: 'power2.in' })
        .to('.portal-center-hint', { opacity: 0, duration: 0.3 }, '-=0.2')
        .to('.portal-columns-container', { scale: 1.01, opacity: 0, duration: 0.4, ease: 'power2.inOut' }, '-=0.2')
        .to(portalStage, { opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.1')
        .to('#main-content', { opacity: 1, pointerEvents: 'all', duration: 0.6, ease: 'power2.out' }, '-=0.3')
        .from('#main-nav', { y: -80, opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.4')
        .from('.cinema-hero-overlay > *', { y: 25, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power2.out' }, '-=0.3');
    };

    card.addEventListener('click', triggerSelection);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const rect = card.getBoundingClientRect();
        const mockEvent = {
          stopPropagation: () => {},
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        };
        triggerSelection(mockEvent);
      }
    });
    const btn = card.querySelector('.city-select-btn');
    if (btn) btn.addEventListener('click', triggerSelection);
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

    tl.to(mainContent, { opacity: 1, duration: 0.6, ease: 'power2.out' })
      .from('#main-nav', { y: -40, opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.3')
      .from('.cinema-hero-overlay > *', { y: 15, opacity: 0, stagger: 0.06, duration: 0.6, ease: 'power2.out' }, '-=0.2');

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
    if (progress <= 0.08) {
      targetLink = navHomeLink;
    } else if (progress > 0.08 && progress < 0.98) {
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

  // ── WORLD-CLASS FILM RENDERING LOOP (smooth lerp requestAnimationFrame) ──
  // Interpolates video seek positions, circle mask scales, and coordinates 
  // at 60fps to eliminate frame jumps on fast scrolls.
  function renderCinemaLoop() {
    // Skip calculations if gateway is active
    if (document.body.classList.contains('flag-selection-mode')) {
      lastFrameTime = performance.now();
      requestAnimationFrame(renderCinemaLoop);
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

    // LERP snapping thresholds to prevent infinite micro-calculations on trailing values
    if (Math.abs(cState.targetTime - cState.currentTime) < 0.01) {
      cState.currentTime = cState.targetTime;
    }
    if (Math.abs(cState.targetRadius - cState.currentRadius) < 0.05) {
      cState.currentRadius = cState.targetRadius;
    }
    if (Math.abs(cState.targetX - cState.currentX) < 0.05) {
      cState.currentX = cState.targetX;
    }
    if (Math.abs(cState.targetY - cState.currentY) < 0.05) {
      cState.currentY = cState.targetY;
    }
    if (Math.abs(cState.targetVideoY - cState.currentVideoY) < 0.05) {
      cState.currentVideoY = cState.targetVideoY;
    }

    // Apply vertical pan Y offset dynamically to active video element (guarded to avoid style recalculations when stationary)
    if (video) {
      const roundedVideoY = Math.round(cState.currentVideoY * 10) / 10;
      if (video !== lastActiveVideo || roundedVideoY !== lastVideoY) {
        video.style.setProperty('--video-y', `${roundedVideoY}%`);
        lastVideoY = roundedVideoY;
        lastActiveVideo = video;
      }
    }

    // Apply safe, buffered video seeking (uses pendingSeek queue)
    if (video && video.readyState >= 1) {
      const seekDiff = Math.abs(video.currentTime - cState.currentTime);
      if (seekDiff > 0.01) {
        if (!video.seeking) {
          try {
            video.currentTime = cState.currentTime;
          } catch (e) {
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

    requestAnimationFrame(renderCinemaLoop);
  }

  // Launch the rendering loop immediately
  requestAnimationFrame(renderCinemaLoop);

  // Link scroll boundaries to target parameters using ScrollTrigger
  const irisInThreshold = 0.15;
  const irisOutThreshold = 0.85;

  ScrollTrigger.create({
    trigger: '#cinema-section',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress; // 0.0 -> 1.0
      const cState = STATE.cinema;

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

      // 1. Landing Hero Overlay fade boundaries (0.0 to 0.08 scroll depth)
      if (p <= 0.08) {
        const ratio = p / 0.08;
        
        if (heroOverlay) {
          heroOverlay.style.opacity = 1 - ratio;
          if (!self.heroVisible) {
            heroOverlay.style.pointerEvents = 'all';
            heroOverlay.style.visibility = 'visible';
            self.heroVisible = true;
          }
        }

        // Keep first video active as background (state-guarded)
        if (cState.activeIdx !== 0) {
          cState.activeIdx = 0;
          scenes.forEach((sc, idx) => {
            if (!sc.video) return;
            if (idx === 0) {
              sc.video.classList.add('active');
            } else {
              sc.video.classList.remove('active');
            }
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
        self.heroVisible = false;
      }

      // 2. Map scroll progress (0.08 -> 0.98) across the 12 film scenes
      const scrubProgress = Math.max(0, Math.min((p - 0.08) / 0.90, 1.0));

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
    summaryBox.style.display = 'none';
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
  summaryBox.style.display = 'block';
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
              { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out' }
            );
          }
        }
      });
    });
  }

  // Reset booking reveal screen and replay movie
  if (okBtn) {
    okBtn.addEventListener('click', () => {
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
      { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto' }
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
      calculatePrice();
    });
  }
  
  if (frequencySelect) {
    frequencySelect.addEventListener('change', calculatePrice);
  }
  
  extraCbs.forEach(cb => {
    cb.addEventListener('change', calculatePrice);
  });
  
  function calculatePrice() {
    const area = areaRange ? parseInt(areaRange.value || 100) : 100;
    const freqCoeff = frequencySelect ? parseFloat(frequencySelect.value || 1) : 1;
    
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
  
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
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

  if (STATE.lenisInstance) {
    STATE.lenisInstance.scrollTo(0, { immediate: true });
    STATE.lenisInstance.stop();
  }

  // Clear cache from localStorage to force gateway
  localStorage.removeItem('tworose_city');

  document.body.classList.add('flag-selection-mode');
  portalStage.style.display = 'flex';
  portalStage.style.opacity = '0';
  portalStage.style.pointerEvents = 'all';

  gsap.set('.portal-logo-container', { y: 0, opacity: 1 });
  gsap.set('.portal-center-hint', { opacity: 1 });
  gsap.set('.portal-columns-container', { scale: 1, opacity: 1 });

  const tl = gsap.timeline({
    onComplete: () => {
      // Re-init portal particles
      setupPortalParticles();
    }
  });

  tl.to('#main-content', { opacity: 0, pointerEvents: 'none', duration: 0.4, ease: 'power2.inOut' })
    .to(portalStage, { opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.1');
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
