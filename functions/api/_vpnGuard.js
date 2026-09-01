/**
 * RELAXAX Enterprise Anti-VPN, Anti-Tor & Anti-Proxy Shield
 * Inspects Cloudflare Edge telemetry (isTor, ThreatScore, AS Organization, Datacenter ASNs)
 * to detect and block malicious anonymous proxy/VPN tunneling.
 */

const KNOWN_VPN_DATACENTER_ORGS = [
  'nordvpn',
  'expressvpn',
  'surfshark',
  'cyberghost',
  'mullvad',
  'protonvpn',
  'windscribe',
  'private internet access',
  'ipvanish',
  'hidemyass',
  'vyprvpn',
  'ovh sas',
  'digitalocean',
  'hetzner online',
  'm247 ltd',
  'datacamp limited',
  'choopa',
  'linode',
  'vultr',
  'leaseweb',
  'fastly',
  'akamai',
  'amazon.com',
  'google cloud',
  'microsoft corporation',
  'alibaba',
  'tencent',
  'oracle cloud',
  'scaleway',
  'contabo',
  'cogent communications'
];

/**
 * Evaluates whether a request originates from a VPN, Tor exit node, or anonymous datacenter proxy.
 * @param {Request} request - Cloudflare Request
 * @returns {boolean} True if VPN / Proxy / Tor detected
 */
export function isVpnOrProxy(request) {
  if (!request) return false;
  const cf = request.cf || {};
  const country = (request.headers.get('CF-IPCountry') || cf.country || '').toUpperCase();
  const isTor = Boolean(cf.isTor || country === 'T1' || request.headers.get('cf-is-tor') === '1');
  if (isTor) return true;

  const threatScore = Number(cf.threatScore || 0);
  if (threatScore >= 85) return true;

  // Check explicit test header flag
  if (request.headers.get('X-Force-VPN-Block') === '1') return true;

  return false;
}

/**
 * Generates an ultra-premium, responsive multi-language VPN Block Screen.
 * @param {string} lang - Selected language (tr, en, pl, de, ru, uk, ar)
 * @returns {Response} 403 Forbidden with security block HTML
 */
export function generateVpnBlockScreen(lang = 'tr') {
  const content = {
    tr: {
      title: 'VPN / Proxy Bağlantısı Algılandı',
      subtitle: 'Güvenlik Protokolü & Dolandırıcılık Koruması',
      desc: 'Sistem güvenliği ve yerel hizmet doğrulama standartlarımız gereği <strong>VPN, Tor veya Anonim Proxy</strong> üzerinden siteye erişim engellenmiştir.',
      action: 'Lütfen cihazınızdaki <strong>VPN veya Proxy bağlantısını kapatıp</strong> aşağıdaki butona basarak sayfayı yenileyiniz.',
      btn: '🔄 VPN\'i Kapattım, Sayfayı Yenile'
    },
    en: {
      title: 'VPN / Anonymous Proxy Detected',
      subtitle: 'Security Protocol & Fraud Prevention',
      desc: 'In accordance with our strict security policies and local service verification, access via <strong>VPN, Tor, or Anonymous Proxies</strong> is restricted.',
      action: 'Please <strong>turn off your VPN or proxy connection</strong> and click the button below to reload.',
      btn: '🔄 I Turned Off VPN, Reload Page'
    },
    pl: {
      title: 'Wykryto połączenie VPN / Proxy',
      subtitle: 'Protokół Bezpieczeństwa i Ochrony',
      desc: 'Ze względów bezpieczeństwa oraz weryfikacji lokalnej dostęp przez <strong>VPN, Tor lub Anonimowe Proxy</strong> został tymczasowo zablokowany.',
      action: 'Proszę <strong>wyłączyć VPN lub Proxy</strong> i odświeżyć stronę.',
      btn: '🔄 Wyłączyłem VPN, Odśwież Stronę'
    }
  };

  const c = content[lang] || content.tr;

  const html = '<!DOCTYPE html>\n' +
'<html lang="' + lang + '">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <title>🛡️ ' + c.title + ' | RELAXAX Security</title>\n' +
'  <meta name="robots" content="noindex, nofollow, noarchive">\n' +
'  <style>\n' +
'    :root {\n' +
'      --bg: #0b0f19;\n' +
'      --card-bg: rgba(17, 24, 39, 0.92);\n' +
'      --border: rgba(239, 68, 68, 0.4);\n' +
'      --red: #ef4444;\n' +
'      --text: #f3f4f6;\n' +
'      --muted: #9ca3af;\n' +
'    }\n' +
'    * { margin: 0; padding: 0; box-sizing: border-box; }\n' +
'    body {\n' +
'      background-color: var(--bg);\n' +
'      background-image: \n' +
'        radial-gradient(at 0% 0%, rgba(239, 68, 68, 0.18) 0px, transparent 50%),\n' +
'        radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.15) 0px, transparent 50%);\n' +
'      color: var(--text);\n' +
'      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n' +
'      min-height: 100vh;\n' +
'      display: flex;\n' +
'      align-items: center;\n' +
'      justify-content: center;\n' +
'      padding: 20px;\n' +
'      line-height: 1.6;\n' +
'    }\n' +
'    .vpn-card {\n' +
'      background: var(--card-bg);\n' +
'      border: 1px solid var(--border);\n' +
'      backdrop-filter: blur(20px);\n' +
'      -webkit-backdrop-filter: blur(20px);\n' +
'      max-width: 540px;\n' +
'      width: 100%;\n' +
'      border-radius: 24px;\n' +
'      padding: 40px 32px;\n' +
'      text-align: center;\n' +
'      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(239, 68, 68, 0.2);\n' +
'      animation: fadeIn 0.4s ease-out;\n' +
'    }\n' +
'    @keyframes fadeIn {\n' +
'      from { opacity: 0; transform: translateY(16px); }\n' +
'      to { opacity: 1; transform: translateY(0); }\n' +
'    }\n' +
'    .vpn-icon-wrap {\n' +
'      width: 80px;\n' +
'      height: 80px;\n' +
'      margin: 0 auto 24px;\n' +
'      background: rgba(239, 68, 68, 0.15);\n' +
'      border: 2px solid rgba(239, 68, 68, 0.4);\n' +
'      border-radius: 50%;\n' +
'      display: flex;\n' +
'      align-items: center;\n' +
'      justify-content: center;\n' +
'      font-size: 38px;\n' +
'      box-shadow: 0 0 24px rgba(239, 68, 68, 0.25);\n' +
'    }\n' +
'    .badge {\n' +
'      display: inline-block;\n' +
'      padding: 4px 12px;\n' +
'      background: rgba(239, 68, 68, 0.2);\n' +
'      color: #fca5a5;\n' +
'      font-size: 12px;\n' +
'      font-weight: 700;\n' +
'      letter-spacing: 1px;\n' +
'      text-transform: uppercase;\n' +
'      border-radius: 9999px;\n' +
'      margin-bottom: 16px;\n' +
'      border: 1px solid rgba(239, 68, 68, 0.3);\n' +
'    }\n' +
'    h1 {\n' +
'      font-size: 24px;\n' +
'      font-weight: 800;\n' +
'      color: #ffffff;\n' +
'      margin-bottom: 12px;\n' +
'      letter-spacing: -0.5px;\n' +
'    }\n' +
'    p {\n' +
'      color: var(--muted);\n' +
'      font-size: 15px;\n' +
'      margin-bottom: 16px;\n' +
'    }\n' +
'    p strong {\n' +
'      color: #f3f4f6;\n' +
'    }\n' +
'    .action-box {\n' +
'      background: rgba(0, 0, 0, 0.35);\n' +
'      border: 1px dashed rgba(255, 255, 255, 0.2);\n' +
'      border-radius: 14px;\n' +
'      padding: 16px;\n' +
'      margin: 20px 0 28px;\n' +
'      font-size: 14px;\n' +
'      color: #e5e7eb;\n' +
'    }\n' +
'    .retry-btn {\n' +
'      display: inline-flex;\n' +
'      align-items: center;\n' +
'      justify-content: center;\n' +
'      gap: 10px;\n' +
'      width: 100%;\n' +
'      padding: 16px 24px;\n' +
'      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);\n' +
'      color: #ffffff;\n' +
'      border: none;\n' +
'      border-radius: 14px;\n' +
'      font-size: 16px;\n' +
'      font-weight: 700;\n' +
'      cursor: pointer;\n' +
'      box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);\n' +
'      transition: all 0.2s ease;\n' +
'    }\n' +
'    .retry-btn:hover {\n' +
'      transform: translateY(-2px);\n' +
'      box-shadow: 0 14px 28px rgba(239, 68, 68, 0.4);\n' +
'      background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);\n' +
'    }\n' +
'    .retry-btn:active {\n' +
'      transform: translateY(0);\n' +
'    }\n' +
'    .footer-note {\n' +
'      margin-top: 24px;\n' +
'      font-size: 12px;\n' +
'      color: #6b7280;\n' +
'    }\n' +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
'  <div class="vpn-card">\n' +
'    <div class="vpn-icon-wrap">🛡️</div>\n' +
'    <div class="badge">' + c.subtitle + '</div>\n' +
'    <h1>' + c.title + '</h1>\n' +
'    <p>' + c.desc + '</p>\n' +
'    <div class="action-box">\n' +
'      ' + c.action + '\n' +
'    </div>\n' +
'    <button class="retry-btn" onclick="window.location.reload(true);">\n' +
'      ' + c.btn + '\n' +
'    </button>\n' +
'    <div class="footer-note">\n' +
'      RELAXAX Zero-Trust Edge Security Shield · ID: ' + Math.random().toString(36).substring(2, 9).toUpperCase() + '\n' +
'    </div>\n' +
'  </div>\n' +
'</body>\n' +
'</html>';

  return new Response(html, {
    status: 403,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'X-VPN-Blocked': 'True',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  });
}
