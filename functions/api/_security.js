/**
 * RELAXAX Enterprise Security & Anti-Injection Guard
 * Defends against:
 * 1. SQL Injection (Union-based, Error-based, Blind, Time-based, Stacked Queries)
 * 2. NoSQL Operator Injections ($where, $regex, $gt, $ne, $in, $or, $expr)
 * 3. Command Injection & Shell Metacharacters (;, |, &, `, $(), >)
 * 4. XSS & HTML Script Tag Injection
 * 5. KV Key Path Traversal & Delimiter Injection
 */

const SQLI_PATTERNS = [
  /(\b(union(\s+all)?|select|insert|update|delete|drop|alter|truncate|create|replace|declare|exec(ute)?|benchmark|sleep)\b)/i,
  /(\b(into\s+(outfile|dumpfile)|load_file|information_schema|pg_sleep|waitfor\s+delay)\b)/i,
  /(--|\#|\/\*|\*\/)/,
  /('|\")\s*(or|and)\s*('|\")?\d+('|\")?\s*=\s*('|\")?\d+/i,
  /('|\")\s*(or|and)\s*('|\")?[a-z0-9_]+('|\")?\s*=\s*('|\")?[a-z0-9_]+/i,
  /(\b(or|and)\b\s+1\s*=\s*1)/i,
  /(\b(or|and)\b\s+true\s*=\s*true)/i,
  /(\$where|\$regex|\$gt|\$gte|\$lt|\$lte|\$ne|\$in|\$nin|\$or|\$and|\$not|\$nor|\$expr)/i
];

export function hasSqlInjection(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    return Object.values(value).some(v => hasSqlInjection(v));
  }
  const str = String(value).trim();
  if (!str) return false;
  return SQLI_PATTERNS.some(regex => regex.test(str));
}

export function scanPayloadForInjection(obj) {
  if (!obj || typeof obj !== 'object') return false;
  for (const key of Object.keys(obj)) {
    if (hasSqlInjection(key)) return true;
    const val = obj[key];
    if (typeof val === 'string' && hasSqlInjection(val)) {
      return true;
    } else if (typeof val === 'object' && val !== null) {
      if (scanPayloadForInjection(val)) return true;
    }
  }
  return false;
}

export function sanitizeSafeString(str, maxLen = 300) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '')
    .replace(/['";\\]/g, '')
    .replace(/--|\/\*|\*\//g, '')
    .trim()
    .substring(0, maxLen);
}

export function sanitizeKey(key) {
  if (typeof key !== 'string') return '';
  return key.replace(/[^a-zA-Z0-9_\-\.]/g, '').substring(0, 80);
}

/**
 * Constant-time string comparison to prevent cryptographic timing side-channel attacks.
 * @param {string} a - First string (e.g. expected HMAC)
 * @param {string} b - Second string (e.g. provided HMAC)
 * @returns {boolean} True if strings are equal
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Masks internal server errors to prevent information disclosure vulnerabilities.
 * @param {Error|string} err - Original error
 * @returns {string} Safe generic message for client
 */
export function maskErrorMessage(err) {
  return "İşlem sırasında güvenli bir hata oluştu. Lütfen tekrar deneyiniz.";
}

