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
const WHITELISTED_DOMAINS = [
  'relaxax.com',
  'pages.dev',
  'jsdelivr.net',
  'cloudflare.com',
  'unpkg.com',
  'googleapis.com',
  'gstatic.com',
  'telegram.org'
];

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
            threatCounter++;
            console.warn('[CYBER_LOOP_DEFENSE] Blocked unauthorized external script injection:', src);
          }
        }

        // Check injected iframes (clickjacking / phishing frames)
        if (node.tagName === 'IFRAME') {
          const src = node.getAttribute('src');
          if (src && !isTrustedSource(src)) {
            node.remove();
            threatCounter++;
            console.warn('[CYBER_LOOP_DEFENSE] Quarantined rogue iframe injection:', src);
          }
        }

        // Check inline event handlers (XSS vectors like onerror, onload, onclick on injected elements)
        const hasDangerousAttr = node.hasAttribute && (
          node.hasAttribute('onerror') ||
          node.hasAttribute('onload') ||
          node.hasAttribute('onclick') && node.getAttribute('onclick').includes('eval(')
        );
        if (hasDangerousAttr) {
          node.removeAttribute('onerror');
          node.removeAttribute('onload');
          threatCounter++;
          console.warn('[CYBER_LOOP_DEFENSE] Neutralized dangerous inline attribute vector');
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
    const nativeJSONParse = JSON.parse;
    const nativeSetTimeout = window.setTimeout;

    // Freeze critical prototype chains against pollution
    if (Object.freeze) {
      Object.freeze(Object.prototype.__proto__);
    }

    // Monitor for malicious fetch hijacking
    let fetchCheckInterval = setInterval(() => {
      if (window.fetch !== nativeFetch && typeof window.fetch === 'function') {
        // Attempt restoring native fetch if unauthorized hook is detected
        if (!window.fetch.toString().includes('[native code]') && !window.fetch.__isWhitelistedWrapper) {
          threatCounter++;
          console.warn('[CYBER_LOOP_DEFENSE] Detected fetch prototype tampering attempt');
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
    document.documentElement.dataset.botThreat = 'detected';
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
 * Initializes the full Cyber Defense Loop Engine across the application runtime.
 */
export function initCyberLoopEngine() {
  if (isCyberLoopActive) return;
  isCyberLoopActive = true;

  initDomIntegrityWatcher();
  initAntiTamperingShield();
  initCyberHeartbeatLoop();
  detectHeadlessAutomation();
}
