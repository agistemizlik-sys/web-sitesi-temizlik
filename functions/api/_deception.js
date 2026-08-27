/**
 * RELAXAX Enterprise Active Cyber Defense & Deception Honeypot Engine
 * Detects, traps, logs, and reverse-fingerprints malicious attackers and automated vulnerability scanners.
 */

// Common exploit scanner probe patterns
export const HONEYPOT_TRAP_PATHS = [
  '/.env',
  '/.env.local',
  '/.env.production',
  '/.git/config',
  '/.git/HEAD',
  '/wp-admin',
  '/wp-login.php',
  '/xmlrpc.php',
  '/phpmyadmin',
  '/pma',
  '/admin.php',
  '/administrator',
  '/shell.php',
  '/c99.php',
  '/r57.php',
  '/eval-stdin.php',
  '/backup.sql',
  '/dump.sql',
  '/database.sql',
  '/.aws/credentials',
  '/.ssh/id_rsa',
  '/config.json',
  '/server-status',
  '/actuator/health',
  '/api/v1/debug',
  '/console'
];

/**
 * Checks if incoming request path is an adversarial scanning probe.
 * @param {string} pathname - Request URL pathname
 * @returns {boolean} True if path matches a honeypot trap
 */
export function isHoneypotProbe(pathname) {
  if (!pathname || typeof pathname !== 'string') return false;
  const lower = pathname.toLowerCase();
  return HONEYPOT_TRAP_PATHS.some(trap => lower === trap || lower.startsWith(trap + '/'));
}

/**
 * Generates a fake decoy response with Canary Tokens to trap and waste the attacker's time.
 * @param {string} pathname - Requested probe path
 * @param {string} clientIp - Attacker's IP
 * @returns {Response} Decoy response
 */
export function generateDecoyResponse(pathname, clientIp) {
  const canaryToken = 'rlx_trap_' + Math.random().toString(36).substring(2, 9) + '_decoy';
  
  if (pathname.includes('.env')) {
    const fakeEnv = [
      '# PRODUCTION ENVIRONMENT CONFIG (TRAP)',
      'APP_ENV=production',
      'APP_DEBUG=false',
      'APP_KEY=' + canaryToken,
      'DB_CONNECTION=mysql',
      'DB_HOST=127.0.0.1',
      'DB_PORT=3306',
      'DB_DATABASE=relaxax_db',
      'DB_USERNAME=root',
      'DB_PASSWORD=canary_honeypot_trap_' + Math.random().toString(36).substring(2, 8),
      'HONEYPOT_STATUS=TRIGGERED_AND_LOGGED',
      'ATTACKER_IP=' + clientIp,
      'SECURITY_NOTE=All actions from this IP are logged to global threat intelligence databases.'
    ].join('\n');

    return new Response(fakeEnv, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'X-Honeypot-Active': 'True'
      }
    });
  }

  // Generic fake login decoy for scanners
  return new Response(JSON.stringify({
    status: "ok",
    node: "security-decoy-node-01",
    probe_logged: true,
    ip: clientIp,
    session_canary: canaryToken,
    message: "Decoy authentication endpoint engaged. Security telemetry dispatched."
  }, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

/**
 * Logs real-time threat intelligence to Edge KV / Admin Panel radar when honeypot is triggered.
 */
export async function alertHoneypotTrigger(env, request, pathname, waitUntil) {
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const country = request.headers.get('CF-IPCountry') || 'TR';
  const city = request.headers.get('CF-IPCity') || 'Unknown';
  const userAgent = request.headers.get('User-Agent') || 'Unknown';
  const cfRay = request.headers.get('CF-Ray') || 'N/A';
  const timestamp = new Date().toISOString();

  const incidentLog = {
    timestamp,
    attackType: 'HONEYPOT_PROBE',
    pathname,
    clientIp,
    country,
    city,
    userAgent: userAgent.substring(0, 150),
    cfRay,
    action: 'DECOY_SERVED_RECORDED_TO_PANEL'
  };

  if (env && env.LEADS_KV) {
    const key = `sec_honeypot:${Date.now()}:${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const p = env.LEADS_KV.put(key, JSON.stringify(incidentLog), { expirationTtl: 30 * 86400 }).catch(() => {});
    if (waitUntil) waitUntil(p);
    else await p;
  }

  console.warn('[RELAXAX_HONEYPOT_TRAP]', incidentLog);
}
