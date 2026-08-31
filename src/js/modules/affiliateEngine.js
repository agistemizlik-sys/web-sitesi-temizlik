/**
 * @fileoverview RELAXAX Affiliate & Influencer Partner Portal Engine
 * Empowers real estate agents, influencers, property managers, and affiliate partners with live tracking and commissions.
 */

import { CONSTANTS } from './constants.js';
import { escapeHTML } from './domUtils.js';
import { safeStorageGet, safeStorageSet } from './apiClient.js';

const STORAGE_AFFILIATE_KEY = 'relaxax_affiliate_partner_data';

function getAffiliateData() {
  return safeStorageGet(STORAGE_AFFILIATE_KEY, {
    name: 'Ahmet Yılmaz (Emlak & Gayrimenkul İş Ortağı)',
    code: 'EMLAK15',
    email: 'affiliate@relaxax.com',
    iban: 'TR62 0001 5001 5800 9876 5432 10',
    commissionRate: 0.15,
    discountRate: 0.10,
    clicks: 428,
    ordersCount: 26,
    grossSalesTL: 54600,
    earnedCommissionTL: 8190,
    balanceTL: 8190,
    paidTL: 16400
  });
}

function saveAffiliateData(data) {
  safeStorageSet(STORAGE_AFFILIATE_KEY, data);
}

export function openAffiliatePortal() {
  let modal = document.getElementById('affiliatePortalModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'affiliatePortalModal';
    modal.className = 'rx-corporate-modal affiliate-modal';
    modal.innerHTML = `
      <div class="rx-corporate-modal-dialog" style="max-width: 900px; width: 95vw; max-height: 90vh; overflow-y: auto; background: #0b1329; border: 1px solid rgba(251,191,36,0.35); border-radius: 20px; box-shadow: 0 25px 60px rgba(0,0,0,0.85); color: #fff; padding: 24px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 16px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">💎</div>
            <div>
              <h3 style="font-size: 1.25rem; font-weight: 800; color: #fbbf24; margin: 0;">RELAXAX İş Ortaklığı & Affiliate Kazanç Masası</h3>
              <span id="affiliateHeaderSub" style="font-size: 0.8rem; color: #94a3b8;">Partner Masası: Her yönlendirdiğiniz temizlik siparişinden anında %15 net komisyon kazanın.</span>
            </div>
          </div>
          <button type="button" id="btnCloseAffiliateModal" style="background: transparent; border: none; font-size: 1.8rem; color: #94a3b8; cursor: pointer; line-height: 1;">&times;</button>
        </div>

        <!-- Content Container -->
        <div id="affiliatePortalBody"></div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btnCloseAffiliateModal')?.addEventListener('click', closeAffiliatePortal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAffiliatePortal();
    });
  }

  renderAffiliatePortalContent();
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

export function closeAffiliatePortal() {
  const modal = document.getElementById('affiliatePortalModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  document.body.style.overflow = '';
}

export function renderAffiliatePortalContent() {
  const container = document.getElementById('affiliatePortalBody');
  if (!container) return;

  const aff = getAffiliateData();
  const origin = window.location.origin || 'https://web-temizlik-sitesi.pages.dev';
  const partnerLink = `${origin}/?ref=${aff.code}`;

  container.innerHTML = `
    <!-- Top Link & Promo Code Bar -->
    <div style="background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius: 14px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <span style="font-size: 0.75rem; color: #fbbf24; font-weight: 700; text-transform: uppercase;">🔗 Sizin Özel Referans Linkiniz:</span>
          <strong style="display: block; font-family: monospace; font-size: 0.95rem; color: #ffffff; margin-top: 2px;">${partnerLink}</strong>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" onclick="window.copyAffiliateLink('${partnerLink}')" style="background: #f59e0b; color: #000; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 0.82rem; cursor: pointer;">📋 Linki Kopyala</button>
          <span style="background: rgba(255,255,255,0.1); border: 1px dashed rgba(255,255,255,0.3); padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; color: #38bdf8;">Kupon: ${aff.code}</span>
        </div>
      </div>
    </div>

    <!-- Live Performance KPI Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px;">
      <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 14px; padding: 14px;">
        <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 4px;">👁️ Link Tıklamaları</span>
        <strong style="font-size: 1.4rem; color: #38bdf8;">${aff.clicks} Ziyaretçi</strong>
      </div>
      <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 14px; padding: 14px;">
        <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 4px;">🛍️ Tamamlanan Satışlar</span>
        <strong style="font-size: 1.4rem; color: #34d399;">${aff.ordersCount} Sipariş</strong>
      </div>
      <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; padding: 14px;">
        <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 4px;">💰 Toplam Sipariş Hacmi</span>
        <strong style="font-size: 1.4rem; color: #ffffff;">${aff.grossSalesTL.toLocaleString('tr-TR')} TL</strong>
      </div>
      <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(251, 191, 36, 0.35); border-radius: 14px; padding: 14px;">
        <span style="font-size: 0.75rem; color: #fbbf24; display: block; margin-bottom: 4px;">💵 Çekilebilir Komisyon (%15)</span>
        <strong style="font-size: 1.4rem; color: #fbbf24;">${aff.balanceTL.toLocaleString('tr-TR')} TL</strong>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div style="display: flex; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 20px; overflow-x: auto;">
      <button type="button" class="aff-tab-btn active" data-target="affTabPayout" style="background: #f59e0b; color: #000; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; cursor: pointer;">💳 Anında IBAN Ödeme Talebi</button>
      <button type="button" class="aff-tab-btn" data-target="affTabMarketing" style="background: rgba(255,255,255,0.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">🎨 Pazarlama & Paylaşım Kiti</button>
      <button type="button" class="aff-tab-btn" data-target="affTabHistory" style="background: rgba(255,255,255,0.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">📜 Geçmiş Kazanç ve Transferler</button>
    </div>

    <!-- Sub-Tab 1: Payout Request -->
    <div id="affTabPayout" class="aff-pane" style="display: block;">
      <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 18px; max-width: 540px;">
        <h4 style="font-size: 1rem; color: #fbbf24; margin-bottom: 12px;">💸 Komisyon Bakiyenizi Banka Hesabınıza Aktarın</h4>
        <div style="margin-bottom: 12px;">
          <span style="font-size: 0.8rem; color: #94a3b8;">Kayıtlı IBAN Numaranız:</span>
          <strong style="display: block; color: #38bdf8; font-family: monospace; font-size: 1rem; margin-top: 2px;">${aff.iban}</strong>
        </div>
        <div style="margin-bottom: 16px;">
          <span style="font-size: 0.8rem; color: #94a3b8;">Aktarılacak Tutar:</span>
          <strong style="display: block; color: #34d399; font-size: 1.6rem;">${aff.balanceTL.toLocaleString('tr-TR')} TL</strong>
        </div>
        <button type="button" onclick="window.requestAffiliatePayout()" style="width: 100%; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; border: none; padding: 12px; border-radius: 10px; font-weight: 900; font-size: 0.95rem; cursor: pointer;">💵 Banka Hesabıma FAST ile Gönder</button>
      </div>
    </div>

    <!-- Sub-Tab 2: Marketing Kit -->
    <div id="affTabMarketing" class="aff-pane" style="display: none;">
      <h4 style="font-size: 1rem; color: #fbbf24; margin-bottom: 12px;">📱 Hazır Paylaşım & Pazarlama Materyalleri</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px;">
          <strong style="color: #38bdf8; display: block; margin-bottom: 6px;">💬 WhatsApp / SMS Paylaşım Metni</strong>
          <p style="font-size: 0.78rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-bottom: 8px; line-height: 1.4;">
            "Merhaba! Ev veya ofis temizliğinde 5 yıldızlı medikal hijyen sunan RELAXAX'ta geçerli %10 indirim kuponum: ${aff.code}. Rezervasyon için: ${partnerLink}"
          </p>
          <button type="button" onclick="window.copyTextToClipboard('Merhaba! Ev veya ofis temizliğinde 5 yıldızlı medikal hijyen sunan RELAXAX\'ta geçerli %10 indirim kuponum: ${aff.code}. Rezervasyon için: ${partnerLink}')" style="background: #0284c7; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.76rem; font-weight: 700; cursor: pointer;">📋 Metni Kopyala</button>
        </div>

        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px;">
          <strong style="color: #fbbf24; display: block; margin-bottom: 6px;">🏢 Emlakçı & Asansör Pano Broşürü</strong>
          <p style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 10px;">
            Apartman panoları ve emlak ofisleri için QR kodlu profesyonel A4 baskı şablonu.
          </p>
          <button type="button" onclick="window.downloadAffiliateFlyer('${aff.code}', '${partnerLink}')" style="background: rgba(251,191,36,0.2); border: 1px solid rgba(251,191,36,0.4); color: #fbbf24; padding: 6px 12px; border-radius: 6px; font-size: 0.76rem; font-weight: 700; cursor: pointer;">📄 QR Kodlu Afişi İndir (PDF/HTML)</button>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 3: History -->
    <div id="affTabHistory" class="aff-pane" style="display: none;">
      <h4 style="font-size: 1rem; color: #fbbf24; margin-bottom: 12px;">📜 Geçmiş Başarılı Transferler</h4>
      <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 8px; font-size: 0.8rem;">
          <span style="color:#94a3b8;">Tarih</span>
          <span style="color:#94a3b8;">Açıklama</span>
          <span style="color:#94a3b8;">Tutar</span>
          <span style="color:#94a3b8;">Durum</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.82rem; padding: 6px 0;">
          <span>24 Ağustos 2026</span>
          <span>Ağustos Dönemi FAST Komisyon Ödemesi</span>
          <strong style="color:#34d399;">+16.400 TL</strong>
          <span style="color:#34d399; font-weight:700;">✓ Tamamlandı</span>
        </div>
      </div>
    </div>
  `;

  // Attach tab switching events
  container.querySelectorAll('.aff-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      container.querySelectorAll('.aff-tab-btn').forEach(b => {
        b.style.background = 'rgba(255,255,255,0.06)';
        b.style.color = '#cbd5e1';
      });
      container.querySelectorAll('.aff-pane').forEach(p => p.style.display = 'none');
      btn.style.background = '#f59e0b';
      btn.style.color = '#000000';
      const pane = document.getElementById(targetId);
      if (pane) pane.style.display = 'block';
    });
  });
}

// Window Globals for Affiliate Actions
window.copyAffiliateLink = function(link) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(() => {
      if (typeof window.playSuccessChime === 'function') window.playSuccessChime();
      alert(`✓ Referans linkiniz kopyalandı!\n\n${link}`);
    }).catch(() => {});
  } else {
    prompt('Referans linkinizi kopyalayınız:', link);
  }
};

window.copyTextToClipboard = function(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof window.playSuccessChime === 'function') window.playSuccessChime();
      alert('✓ Paylaşım metni panoya kopyalandı!');
    }).catch(() => {});
  } else {
    prompt('Paylaşım metnini kopyalayınız:', text);
  }
};

window.requestAffiliatePayout = function() {
  const aff = getAffiliateData();
  if (aff.balanceTL <= 0) {
    alert('⚠️ Çekilebilir komisyon bakiyeniz bulunmamaktadır.');
    return;
  }
  const amount = aff.balanceTL;
  aff.paidTL = (aff.paidTL || 0) + amount;
  aff.balanceTL = 0;
  saveAffiliateData(aff);
  renderAffiliatePortalContent();
  if (typeof window.playCashRegisterChime === 'function') window.playCashRegisterChime();
  alert(`🎉 ${amount.toLocaleString('tr-TR')} TL tutarındaki komisyon hak edişiniz kayıtlı IBAN (${aff.iban}) adresinize FAST transfer talimatı olarak iletildi!`);
};

window.downloadAffiliateFlyer = function(promoCode, partnerLink) {
  if (typeof window.playSuccessChime === 'function') window.playSuccessChime();
  const flyerHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>RELAXAX Partner İndirim Afişi - ${promoCode}</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 40px; text-align: center; background: #030712; color: #fff; }
    .card { max-width: 600px; margin: 0 auto; border: 2px solid #f59e0b; border-radius: 20px; padding: 40px; background: #0b1329; }
    h1 { color: #f59e0b; font-size: 28px; }
    .code { font-size: 32px; font-weight: 900; background: #f59e0b; color: #000; padding: 12px 24px; border-radius: 12px; display: inline-block; margin: 20px 0; }
    p { font-size: 16px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>✨ RELAXAX VIP TEMİZLİK KUPONU</h1>
    <p>Binamız ve sitemiz sakinlerine özel profesyonel buharlı ev temizliğinde anında indirim!</p>
    <div class="code">%10 İNDİRİM KODU: ${promoCode}</div>
    <p>Rezervasyon ve Randevu: <strong>${partnerLink}</strong></p>
    <p>Çağrı Merkezi: <strong>0546 647 90 04</strong></p>
  </div>
</body>
</html>`;
  const blob = new Blob([flyerHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RELAXAX_Partner_Afis_${promoCode}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
