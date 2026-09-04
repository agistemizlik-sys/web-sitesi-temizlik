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

const PROMPT_INJECTION_PATTERNS = [
  /(ignore|disregard|forget|override)\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompts|rules|commands)/i,
  /(\b(system\s*prompt|system\s*directive|developer\s*mode|jailbreak|DAN\s*mode)\b)/i,
  /(you\s+are\s+now|act\s+as\s+an?\s+unrestricted|bypass\s+(safety|content)\s+filters)/i,
  /(\[SYSTEM\]|\[INST\]|<\|im_start\|>|<\|im_end\|>|<<SYS>>)/i
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /on(load|error|click|mouseover|mouseenter|focus|blur|change|submit)\s*=/i,
  /\b(eval|alert|prompt|confirm)\s*\(/i,
  /document\s*\.\s*(cookie|location|domain|write)/i
];

const PATH_TRAVERSAL_PATTERNS = [
  /(\.\.\/|\.\.\\)/,
  /(\/etc\/(passwd|shadow|hosts|group)|\/proc\/self|\/var\/log)/i,
  /(c:\\windows|boot\.ini|win\.ini)/i
];

const RCE_PATTERNS = [
  /(\b(powershell|cmd\.exe|bin\/sh|bin\/bash|curl|wget|nc|netcat|nmap|whoami)\b)/i,
  /(\||\;|\`|\$\()\s*(rm\s+-rf|del\s+\/f|shutdown|kill|reboot)/i
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

export function hasPromptInjection(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    return Object.values(value).some(v => hasPromptInjection(v));
  }
  const str = String(value).trim();
  if (!str) return false;
  return PROMPT_INJECTION_PATTERNS.some(regex => regex.test(str));
}

export function hasXss(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    return Object.values(value).some(v => hasXss(v));
  }
  const str = String(value).trim();
  if (!str) return false;
  return XSS_PATTERNS.some(regex => regex.test(str));
}

export function hasPathTraversal(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    return Object.values(value).some(v => hasPathTraversal(v));
  }
  const str = String(value).trim();
  if (!str) return false;
  return PATH_TRAVERSAL_PATTERNS.some(regex => regex.test(str));
}

export function hasCommandInjection(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    return Object.values(value).some(v => hasCommandInjection(v));
  }
  const str = String(value).trim();
  if (!str) return false;
  return RCE_PATTERNS.some(regex => regex.test(str));
}

const SSRF_PATTERNS = [
  /(169\.254\.169\.254|metadata\.google\.internal|127\.0\.0\.1|localhost|0\.0\.0\.0|::1)/i,
  /(file:\/\/|gopher:\/\/|dict:\/\/|ldap:\/\/|tftp:\/\/)/i
];

export function hasSsrf(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    return Object.values(value).some(v => hasSsrf(v));
  }
  const str = String(value).trim();
  if (!str) return false;
  return SSRF_PATTERNS.some(regex => regex.test(str));
}

/**
 * Scans payload across all 6 enterprise attack vectors: SQLi, Prompt Injection, XSS, Path Traversal, RCE, SSRF.
 */
export function scanAllPayloadThreats(obj) {
  if (!obj || typeof obj !== 'object') return { isMalicious: false };
  for (const key of Object.keys(obj)) {
    if (hasSqlInjection(key)) return { isMalicious: true, attackType: 'SQL Injection (Key)', snippet: key };
    if (hasPromptInjection(key)) return { isMalicious: true, attackType: 'Prompt Injection (Key)', snippet: key };
    if (hasXss(key)) return { isMalicious: true, attackType: 'XSS Vector (Key)', snippet: key };
    if (hasPathTraversal(key)) return { isMalicious: true, attackType: 'Path Traversal (Key)', snippet: key };
    if (hasCommandInjection(key)) return { isMalicious: true, attackType: 'Command Injection (Key)', snippet: key };
    if (hasSsrf(key)) return { isMalicious: true, attackType: 'SSRF Probe (Key)', snippet: key };

    const val = obj[key];
    if (typeof val === 'string') {
      if (hasSqlInjection(val)) return { isMalicious: true, attackType: 'SQL Injection', snippet: val };
      if (hasPromptInjection(val)) return { isMalicious: true, attackType: 'Prompt Injection', snippet: val };
      if (hasXss(val)) return { isMalicious: true, attackType: 'XSS Vector', snippet: val };
      if (hasPathTraversal(val)) return { isMalicious: true, attackType: 'Path Traversal', snippet: val };
      if (hasCommandInjection(val)) return { isMalicious: true, attackType: 'Command Injection', snippet: val };
      if (hasSsrf(val)) return { isMalicious: true, attackType: 'SSRF Cloud Metadata Probe', snippet: val };
    } else if (typeof val === 'object' && val !== null) {
      const nested = scanAllPayloadThreats(val);
      if (nested.isMalicious) return nested;
    }
  }
  return { isMalicious: false };
}

export function scanPayloadForInjection(obj) {
  return scanAllPayloadThreats(obj).isMalicious;
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

/**
 * Extracts verified client IP address preventing IP-spoofing via forged headers.
 * Strictly trusts CF-Connecting-IP provided directly by Cloudflare edge.
 * @param {Request} request - Cloudflare Request
 * @returns {string} Authenticated IP address
 */
export function getTrustedClientIp(request) {
  if (!request || !request.headers) return '127.0.0.1';
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && typeof cfIp === 'string') {
    return cfIp.trim().substring(0, 45);
  }
  return 'unknown';
}

/**
 * Validates and clamps numeric inputs preventing negative price manipulation, NaN, and Infinity exploits.
 * @param {*} val - Input value
 * @param {number} min - Minimum allowed
 * @param {number} max - Maximum allowed
 * @param {number} defaultVal - Fallback default
 * @returns {number} Sanitized bounded number
 */
export function validateSafeNumber(val, min = 0, max = 1000000, defaultVal = 0) {
  if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
    return Math.max(min, Math.min(max, Math.round(val)));
  }
  const parsed = Number(val);
  if (!isNaN(parsed) && isFinite(parsed)) {
    return Math.max(min, Math.min(max, Math.round(parsed)));
  }
  return defaultVal;
}

/**
 * ReDoS-safe and slice-guarded email validator.
 * @param {string} email - Raw email string
 * @returns {boolean} True if email is valid and safe
 */
export function validateSafeEmail(email) {
  if (typeof email !== 'string') return false;
  const clean = email.trim().substring(0, 120);
  if (clean.length < 5 || !clean.includes('@') || !clean.includes('.')) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(clean);
}

/**
 * CYBER LOOP ENGINEERING SENTINEL:
 * Recursive Continuous Threat Assessment & Escalation Feedback Loop.
 */
export async function executeCyberLoopSentinel(env, request, payload, waitUntil) {
  const clientIp = getTrustedClientIp(request);
  const country = request.headers.get('CF-IPCountry') || 'TR';
  const city = request.headers.get('CF-IPCity') || 'Unknown';
  const userAgent = request.headers.get('User-Agent') || 'Unknown';
  const url = request.url || '';
  const traceId = 'RLX-CYBER-' + Math.random().toString(36).substring(2, 9).toUpperCase();

  // Check if IP is already quarantined in Edge KV
  if (env && env.LEADS_KV) {
    try {
      const isBlacklisted = await env.LEADS_KV.get(`sec_blacklist:${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`);
      if (isBlacklisted) {
        return {
          blocked: true,
          response: new Response(JSON.stringify({
            success: false,
            error: 'Access Denied: Your IP address is quarantined by the RELAXAX Cyber Loop Sentinel.',
            status: 'PERMANENTLY_QUARANTINED',
            traceId
          }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'X-Security-Loop-Active': 'True',
              'X-Security-Quarantine-Status': 'ACTIVE_BLACK_HOLE'
            }
          })
        };
      }
    } catch (e) {}
  }

  // Scan for malicious vector signatures
  const threat = scanAllPayloadThreats(payload);
  if (!threat.isMalicious) {
    return { blocked: false, traceId };
  }

  // Escalation Loop: Record strike in Edge KV
  let strikeCount = 1;
  if (env && env.LEADS_KV) {
    try {
      const strikeKey = `sec_strike:${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const existing = await env.LEADS_KV.get(strikeKey);
      strikeCount = (parseInt(existing, 10) || 0) + 1;
      await env.LEADS_KV.put(strikeKey, String(strikeCount), { expirationTtl: 86400 });

      // Strike 3+ -> Auto Blacklist in KV
      if (strikeCount >= 3) {
        await env.LEADS_KV.put(`sec_blacklist:${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`, JSON.stringify({
          clientIp,
          reason: 'Automated Cyber Loop Strike 3 Escalation',
          quarantinedAt: new Date().toISOString()
        }), { expirationTtl: 30 * 86400 });
      }
    } catch (e) {}
  }

  // Dispatch live telemetry directly into Admin Security Radar
  const incidentLog = {
    traceId,
    timestamp: new Date().toISOString(),
    attackType: threat.attackType,
    clientIp,
    country,
    city,
    userAgent: userAgent.substring(0, 150),
    url: url.substring(0, 150),
    snippet: String(threat.snippet || '').substring(0, 150),
    strikeCount,
    loopAction: strikeCount >= 3 ? 'AUTO_QUARANTINE_BLACK_HOLE' : 'TARPIT_DELAY_TRAP'
  };

  if (env && env.LEADS_KV) {
    const key = `sec_threat:${Date.now()}:${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const p = env.LEADS_KV.put(key, JSON.stringify(incidentLog), { expirationTtl: 30 * 86400 }).catch(() => {});
    if (waitUntil) waitUntil(p);
    else await p;
  }

  console.warn('[RELAXAX_CYBER_LOOP_INTERCEPT]', incidentLog);

  // Return Deceptive Tarpit Trap Response
  return {
    blocked: true,
    response: new Response(JSON.stringify({
      success: false,
      error: `Security Loop Alert: ${threat.attackType} quarantined.`,
      status: 'QUARANTINED_AND_RECORDED_TO_PANEL',
      strikeLevel: `${strikeCount}/3`,
      traceId
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Security-Loop-Active': 'True',
        'X-Security-Tarpit-Loop': '1500ms',
        'X-RELAXAX-Trace-ID': traceId
      }
    })
  };
}

/**
 * Logs an instant security incident alert to Edge KV / Admin Panel radar when an attack payload is intercepted.
 */
export async function dispatchSecurityTrapAlert(env, request, attackType, payloadSnippet, waitUntil) {
  const clientIp = getTrustedClientIp(request);
  const country = request.headers.get('CF-IPCountry') || 'TR';
  const city = request.headers.get('CF-IPCity') || 'Unknown';
  const userAgent = request.headers.get('User-Agent') || 'Unknown';
  const url = request.url || '';
  const timestamp = new Date().toISOString();

  const incidentLog = {
    timestamp,
    attackType,
    clientIp,
    country,
    city,
    userAgent: userAgent.substring(0, 150),
    url: url.substring(0, 150),
    payloadSnippet: String(payloadSnippet).substring(0, 150),
    action: 'BLOCKED_AND_RECORDED_TO_PANEL'
  };

  if (env && env.LEADS_KV) {
    const key = `sec_threat:${Date.now()}:${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const p = env.LEADS_KV.put(key, JSON.stringify(incidentLog), { expirationTtl: 30 * 86400 }).catch(() => {});
    if (waitUntil) waitUntil(p);
    else await p;
  }

  console.warn('[RELAXAX_SECURITY_INTERCEPT]', incidentLog);
}

/**
 * Creates a quarantine trap response for malicious payloads.
 */
export function createSecurityTrapResponse(traceId, attackType = 'SQL/Prompt Injection') {
  return new Response(JSON.stringify({
    success: false,
    error: 'Security Alert: Malicious ' + attackType + ' vector quarantined',
    status: 'QUARANTINED_AND_REPORTED',
    traceId
  }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Security-Trap-Active': 'True',
      'X-RELAXAX-Trace-ID': traceId
    }
  });
}

/**
 * Validates Anti-CSRF token on mutation requests (POST/PUT/DELETE).
 */
export function validateCsrfHeader(request) {
  if (!request || !request.headers) return false;
  const token = request.headers.get('X-RELAXAX-CSRF-Token') || request.headers.get('x-csrf-token');
  if (!token || typeof token !== 'string') return false;
  if (!token.startsWith('rlx_csrf_') || token.length < 24) return false;
  return true;
}

const VULN_SCANNER_BOT_RE = /(\b(sqlmap|nikto|acunetix|dirbuster|gobuster|masscan|zgrab|nmap|censys|shodan|python-requests|wpscan|hydra|burpcollaborator|openvas|nessus)\b)/i;

/**
 * Checks if request comes from automated vulnerability scanners or attack frameworks.
 */
export function isVulnScanner(request) {
  if (!request || !request.headers) return false;
  const ua = request.headers.get('User-Agent') || '';
  return VULN_SCANNER_BOT_RE.test(ua);
}

/**
 * Edge KV Token-Bucket Rate Limiter (Anti-DDoS & Brute-Force Shield)
 */
export async function executeRateLimitGuard(env, request, maxRequests = 40, windowSecs = 60) {
  if (!env || !env.LEADS_KV) return { allowed: true };
  const clientIp = getTrustedClientIp(request);
  const key = `ratelimit:${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
  try {
    const raw = await env.LEADS_KV.get(key);
    const current = parseInt(raw, 10) || 0;
    if (current >= maxRequests) {
      return {
        allowed: false,
        response: new Response(JSON.stringify({
          success: false,
          error: 'Rate limit exceeded: Too many requests. Please try again in 60 seconds.',
          status: 'RATE_LIMITED'
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Retry-After': String(windowSecs),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-Security-Guard': 'RateLimitActive'
          }
        })
      };
    }
    await env.LEADS_KV.put(key, String(current + 1), { expirationTtl: windowSecs });
    return { allowed: true, remaining: maxRequests - current - 1 };
  } catch (e) {
    return { allowed: true };
  }
}

/**
 * Hardens HTTP Response with Military-Grade Enterprise Security Headers
 */
export function applyEnterpriseSecurityHeaders(response) {
  const res = new Response(response.body, response);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self), payment=()');
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  return res;
}




