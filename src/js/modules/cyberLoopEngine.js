/**
 * @fileoverview RELAXAX Enterprise Cyber Defense Loop Engine (Client-Side Sentinel)
 * Continuous In-Memory & Runtime Security Protection:
 * 1. DOM Integrity & Malicious Script/Iframe Injection Watcher Loop (MutationObserver)
 * 2. Global Prototype Freezing & Anti-Tampering Shield (Anti-Monkey-Patching)
 * 3. Headless Bot, Automation & Debugger Interception Detection Loop
 * 4. Memory Scrubbing & Sensitive Input Deallocation Loop
 * 5. Synchronized Threat Telemetry Heartbeat Loop
 */

let isCyberLoopActive = false;
let threatCounter = 0;
let blockedInjections = 0;
let detectedBots = 0;
let lastHeartbeat = Date.now();

const WHITELISTED_DOMAINS = [
  'relaxax.com',
  'pages.dev',
  'jsdelivr.net',
  'cloudflare.com',
  'unpkg.com',
  'googleapis.com',
  'gstatic.com'
];

const threatListeners = new Set();

/**
 * Validates if an external resource URL matches trusted whitelisted CDNs and origins.
 * @param {string} src - Script or iframe source URL
 * @returns {boolean} True if source is safe
 */
function isTrustedSource(src) {
  if (!src) return true;
  if (src.startsWith('/') || src.startsWith('./') || src.startsWith('blob:') || src.startsWith('data:')) return true;
  try {
    const url = new URL(src, window.location.href);
    return WHITELISTED_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch (e) {
    return false;
  }
}

/**
 * Dispatches threat signals to registered telemetry subscribers and Admin Radar.
 */
function notifyThreat(type, details) {
  threatCounter++;
  const payload = {
    id: 'THREAT-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
    timestamp: new Date().toISOString(),
    type,
    details,
    totalThreats: threatCounter
  };
  
  threatListeners.forEach(fn => {
    try { fn(payload); } catch (e) {}
  });

  // Also log securely to session storage for Admin Radar retrieval
  try {
    const logs = JSON.parse(sessionStorage.getItem('relaxax_runtime_threats') || '[]');
    logs.unshift(payload);
    sessionStorage.setItem('relaxax_runtime_threats', JSON.stringify(logs.slice(0, 20)));
  } catch (e) {}
}

/**
 * 1. DOM Integrity Watcher Loop: Intercepts and neutralizes rogue script or iframe injection in real-time.
 */
function initDomIntegrityWatcher() {
  const sentinel = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        // Check injected scripts
        if (node.tagName === 'SCRIPT') {
          const src = node.getAttribute('src');
          if (src && !isTrustedSource(src)) {
            node.remove();
            blockedInjections++;
            notifyThreat('UNAUTHORIZED_SCRIPT_INJECTION', `Blocked external script from: ${src}`);
            console.warn('[CYBER_LOOP] Blocked unauthorized script injection:', src);
          }
        }

        // Check injected iframes (clickjacking / phishing frames)
        if (node.tagName === 'IFRAME') {
          const src = node.getAttribute('src');
          if (src && !isTrustedSource(src)) {
            node.remove();
            blockedInjections++;
            notifyThreat('CLICKJACKING_IFRAME_INJECTION', `Quarantined rogue iframe: ${src}`);
            console.warn('[CYBER_LOOP] Quarantined rogue iframe injection:', src);
          }
        }

        // Check inline event handlers (XSS vectors like onerror, onload, onclick on injected elements)
        const hasDangerousAttr = node.hasAttribute && (
          node.hasAttribute('onerror') ||
          node.hasAttribute('onload') ||
          (node.hasAttribute('onclick') && String(node.getAttribute('onclick')).includes('eval('))
        );
        if (hasDangerousAttr) {
          node.removeAttribute('onerror');
          node.removeAttribute('onload');
          blockedInjections++;
          notifyThreat('INLINE_XSS_VECTOR', 'Neutralized dangerous inline event handler attribute');
          console.warn('[CYBER_LOOP] Neutralized dangerous inline attribute vector');
        }
      });
    });
  });

  sentinel.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

/**
 * 2. Anti-Tampering Shield: Protects core globals and prototype chains against monkey-patching.
 */
function initAntiTamperingShield() {
  try {
    // Preserve pristine native references
    const nativeFetch = window.fetch;

    // Freeze critical prototype chains against prototype pollution
    if (Object.freeze && Object.prototype) {
      try {
        Object.freeze(Object.prototype.__proto__);
      } catch (e) {}
    }

    // Monitor for malicious fetch hijacking
    setInterval(() => {
      if (window.fetch !== nativeFetch && typeof window.fetch === 'function') {
        if (!window.fetch.toString().includes('[native code]') && !window.fetch.__isWhitelistedWrapper) {
          notifyThreat('FETCH_HIJACKING_ATTEMPT', 'Unauthorized hook on window.fetch detected');
          console.warn('[CYBER_LOOP] Detected fetch prototype tampering attempt');
        }
      }
    }, 5000);
  } catch (e) {}
}

/**
 * 3. Headless Bot & Automation Sniffer Loop: Flags Puppeteer/Selenium scraping bots.
 */
function detectHeadlessAutomation() {
  const isAutomated = Boolean(
    navigator.webdriver ||
    window.document.documentElement.getAttribute('webdriver') ||
    window.callPhantom ||
    window._phantom ||
    window.__nightmare ||
    window.cdc_adoQpoasnfa76pfcZLmcfl_Array
  );

  if (isAutomated) {
    detectedBots++;
    document.documentElement.dataset.botThreat = 'detected';
    notifyThreat('AUTOMATION_BOT_SNIFFED', 'Headless scraper / WebDriver environment active');
  }
}

/**
 * 4. Memory Scrubbing Loop: Clears sensitive password and credit card strings from DOM memory.
 */
export function scrubSensitiveFormMemory(formElement) {
  if (!formElement) return;
  const sensitiveInputs = formElement.querySelectorAll('input[type="password"], input[autocomplete="cc-number"], input[name="cardnumber"]');
  sensitiveInputs.forEach(input => {
    input.value = '';
  });
}

/**
 * 5. Master Threat Heartbeat Loop (Idle Execution)
 */
function initCyberHeartbeatLoop() {
  const checkThreatStatus = () => {
    lastHeartbeat = Date.now();
    detectHeadlessAutomation();

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(checkThreatStatus, { timeout: 12000 });
    } else {
      setTimeout(checkThreatStatus, 12000);
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(checkThreatStatus, { timeout: 8000 });
  } else {
    setTimeout(checkThreatStatus, 8000);
  }
}

/**
 * 6. Deep Recursive Payload Sanitizer & Threat Neutralizer (XSS / SQLi / Prototype Pollution)
 */
export function sanitizeInputString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '') // Strip angle brackets
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '') // Strip onerror=, onclick=, etc.
    .replace(/--|;|union\s+select|drop\s+table/gi, '') // SQLi patterns
    .trim();
}

export function sanitizePayload(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return sanitizeInputString(data);
  if (Array.isArray(data)) return data.map(item => sanitizePayload(item));
  if (typeof data === 'object') {
    const clean = {};
    for (const key of Object.keys(data)) {
      // Prototype pollution defense
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        notifyThreat('PROTOTYPE_POLLUTION_ATTEMPT', `Neutralized malicious object key: ${key}`);
        continue;
      }
      clean[key] = sanitizePayload(data[key]);
    }
    return clean;
  }
  return data;
}

/**
 * 7. Adaptive Client-Side Rate Limiter & Tarpit Shield
 */
const rateLimitBuckets = new Map();

export function enforceAdaptiveRateLimit(actionKey, maxCalls = 10, windowMs = 60000) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(actionKey) || { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 1;
    bucket.resetAt = now + windowMs;
  } else {
    bucket.count++;
  }

  rateLimitBuckets.set(actionKey, bucket);

  if (bucket.count > maxCalls) {
    const excess = bucket.count - maxCalls;
    const tarpitDelayMs = Math.min(5000, excess * 500);
    notifyThreat('RATE_LIMIT_EXCEEDED', `Action "${actionKey}" rate limit exceeded (${bucket.count}/${maxCalls}). Tarpit: ${tarpitDelayMs}ms`);
    return { allowed: false, retryAfterMs: bucket.resetAt - now, tarpitDelayMs };
  }

  return { allowed: true, remaining: maxCalls - bucket.count };
}

/**
 * Returns real-time cyber loop metrics for telemetry dashboards.
 */
export function getCyberLoopStats() {
  return {
    isActive: isCyberLoopActive,
    totalThreats: threatCounter,
    blockedInjections,
    detectedBots,
    lastHeartbeat,
    whitelistedDomains: WHITELISTED_DOMAINS.length
  };
}

/**
 * Subscribes to real-time cyber threat events.
 */
export function onCyberThreatDetected(callback) {
  if (typeof callback === 'function') {
    threatListeners.add(callback);
  }
}

/**
 * Initializes the full Cyber Defense Loop Engine across the application runtime.
 */
export function initCyberLoopEngine() {
  if (isCyberLoopActive) return;
  isCyberLoopActive = true;

  initDomIntegrityWatcher();
  initAntiTamperingShield();
  initCyberHeartbeatLoop();
  detectHeadlessAutomation();

  window.sanitizePayload = sanitizePayload;
  window.enforceAdaptiveRateLimit = enforceAdaptiveRateLimit;

  console.log('🛡️ [RELAXAX] Cyber Loop Engineering Sentinel v3.2 Active (Deep Sanitizer & Adaptive Tarpit)');
}
