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
 * Sends real-time threat intelligence alert to admin Telegram when honeypot is triggered.
 */
export async function alertHoneypotTrigger(env, request, pathname, waitUntil) {
  if (!env || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const country = request.headers.get('CF-IPCountry') || 'TR';
  const city = request.headers.get('CF-IPCity') || 'Unknown';
  const userAgent = request.headers.get('User-Agent') || 'Unknown';
  const cfRay = request.headers.get('CF-Ray') || 'N/A';

  const tgMessage = [
    '🚨 <b>SALDIRGAN TUZAĞA DÜŞTÜ (HONEYPOT TRAP)!</b> 🚨',
    '━━━━━━━━━━━━━━━━━━━━━',
    '🎯 <b>Tetiklenen Yol:</b> <code>' + pathname + '</code>',
    '🌐 <b>Saldırgan IP:</b> <code>' + clientIp + '</code>',
    '📍 <b>Konum:</b> ' + city + ' / ' + country,
    '🕵️ <b>User-Agent:</b> <code>' + userAgent.substring(0, 100) + '</code>',
    '⚡ <b>Ray ID:</b> <code>' + cfRay + '</code>',
    '━━━━━━━━━━━━━━━━━━━━━',
    '🛡️ <i>Saldırgana sahte Canary Decoy yanıtı servis edildi ve IP adresi tehdit günlüğüne işlendi.</i>'
  ].join('\n');

  const url = 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage';
  const p = fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: tgMessage,
      parse_mode: 'HTML'
    })
  }).then(r => r.json()).catch(() => {});

  if (waitUntil) waitUntil(p);
  else await p;
}
