/**
 * @fileoverview DOM Utilities & Security Sanitizers (Clean Code Module)
 * Provides robust input sanitization, performance helpers (debounce/throttle),
 * currency formatting, and viewport height management.
 */

/**
 * Universal HTML Entity Sanitizer to eliminate DOM-based XSS vulnerabilities.
 * @param {*} str - Raw string or object to sanitize.
 * @returns {string} Safe HTML-escaped string.
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips control characters, dangerous script injection vectors, and caps maximum length.
 * @param {*} val - Input string.
 * @param {number} [maxLen=255] - Maximum permitted character count.
 * @returns {string} Sanitized clean string.
 */
export function sanitizeInputVal(val, maxLen = 255) {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (str.length > maxLen) {
    str = str.substring(0, maxLen);
  }
  return escapeHTML(str);
}

/**
 * Standard high-frequency debounce wrapper.
 * @param {Function} func - Function to debounce.
 * @param {number} wait - Delay in milliseconds.
 * @returns {Function} Debounced function.
 */
export function debounce(func, wait = 150) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * High-performance throttle wrapper for scroll and animation frames.
 * @param {Function} func - Function to throttle.
 * @param {number} limit - Throttle limit in milliseconds.
 * @returns {Function} Throttled function.
 */
export function throttle(func, limit = 16) {
  let inThrottle = false;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/**
 * Formats numeric price into localized currency string (TR / PL).
 * @param {number} amount - Numeric amount.
 * @param {string} [currency='TL'] - Currency code ('TL' or 'zł').
 * @returns {string} Formatted price string (e.g. "1.450,00 TL").
 */
export function formatCurrency(amount, currency = 'TL') {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const parts = safeAmount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  return `${intPart},${decPart} ${currency}`;
}
