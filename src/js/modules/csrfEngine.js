/**
 * @fileoverview RELAXAX Enterprise Cryptographic Anti-CSRF & Nonce Protection Engine
 * Generates unique ephemeral session nonces and attaches cryptographic anti-replay headers
 * to all outgoing API mutations.
 */

let activeCsrfToken = null;
let tokenIssuedAt = 0;
const CSRF_LIFETIME_MS = 15 * 60 * 1000; // 15 minutes rotation

/**
 * Generates or returns a valid ephemeral cryptographic Anti-CSRF token.
 * @returns {string} Cryptographic token
 */
export function getCsrfToken() {
  const now = Date.now();
  if (!activeCsrfToken || (now - tokenIssuedAt) > CSRF_LIFETIME_MS) {
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 16; i++) array[i] = Math.floor(Math.random() * 256);
    }
    const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    activeCsrfToken = 'rlx_csrf_' + hex + '_' + now.toString(36);
    tokenIssuedAt = now;
  }
  return activeCsrfToken;
}

/**
 * Generates standard security headers for API mutations.
 * @returns {Record<string, string>} Security headers object
 */
export function getSecurityHeaders() {
  return {
    'X-RELAXAX-CSRF-Token': getCsrfToken(),
    'X-Client-Timestamp': Date.now().toString(),
    'X-Requested-With': 'XMLHttpRequest'
  };
}

/**
 * Wraps native fetch with automatic Anti-CSRF and security header injection for internal API endpoints.
 * @param {string} url - Target URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function secureFetch(url, options = {}) {
  const isApi = typeof url === 'string' && url.startsWith('/api/');
  if (!isApi) return fetch(url, options);

  const mergedHeaders = new Headers(options.headers || {});
  const secHeaders = getSecurityHeaders();
  
  for (const [key, value] of Object.entries(secHeaders)) {
    if (!mergedHeaders.has(key)) {
      mergedHeaders.set(key, value);
    }
  }

  const secureOptions = {
    ...options,
    headers: mergedHeaders
  };

  return fetch(url, secureOptions);
}
