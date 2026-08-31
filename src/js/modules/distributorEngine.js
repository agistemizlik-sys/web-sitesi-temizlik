/**
 * @fileoverview RELAXAX Regional Distributor & Logistics Dispatcher Portal
 * Dedicated management suite for regional franchise owners, fleet dispatchers, and territorial partners.
 */

import { STATE } from '../state.js';
import { CONSTANTS } from './constants.js';
import { escapeHTML, formatCurrency } from './domUtils.js';
import { safeStorageGet, safeStorageSet } from './apiClient.js';

const STORAGE_DISTRIBUTOR_KEY = 'relaxax_distributor_data';
const STORAGE_DISTRIBUTOR_REQUESTS = 'relaxax_distributor_stock_requests';

function getDistributorData() {
  return safeStorageGet(STORAGE_DISTRIBUTOR_KEY, {
    name: 'Anadolu Yakası Bölge Distribütörlüğü',
    manager: 'Kemal Aksoy (Bölge Direktörü)',
    email: 'distributor@relaxax.com',
    region: 'Kadıköy & Anadolu Yakası',
    city: 'Istanbul',
    iban: 'TR33 0006 1004 5500 1234 5678 90',
    commissionRate: 0.20,
    balanceTL: 14850,
    paidTL: 42300,
    activeStaffCount: 8
  });
}

function saveDistributorData(data) {
  safeStorageSet(STORAGE_DISTRIBUTOR_KEY, data);
}

export function openDistributorPortal() {
  let modal = document.getElementById('distributorPortalModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'distributorPortalModal';
    modal.className = 'rx-corporate-modal distributor-modal';
    modal.innerHTML = `
      <div class="rx-corporate-modal-dialog" style="max-width: 960px; width: 95vw; max-height: 90vh; overflow-y: auto; background: #070e1e; border: 1px solid rgba(56,189,248,0.3); border-radius: 20px; box-shadow: 0 25px 60px rgba(0,0,0,0.85); color: #fff; padding: 24px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 16px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #0369a1); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🏢</div>
            <div>
              <h3 style="font-size: 1.25rem; font-weight: 800; color: #38bdf8; margin: 0;">RELAXAX Bölgesel Distribütörlük & Lojistik Masası</h3>
              <span id="distributorHeaderSub" style="font-size: 0.8rem; color: #94a3b8;">Yetkili Bölge: Kadıköy & Anadolu Yakası | Baş Dağıtım Masası</span>
            </div>
          </div>
          <button type="button" id="btnCloseDistributorModal" style="background: transparent; border: none; font-size: 1.8rem; color: #94a3b8; cursor: pointer; line-height: 1;">&times;</button>
        </div>

        <!-- Content Container -->
        <div id="distributorPortalBody"></div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btnCloseDistributorModal')?.addEventListener('click', closeDistributorPortal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDistributorPortal();
    });
  }

  renderDistributorPortalContent();
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

export function closeDistributorPortal() {
  const modal = document.getElementById('distributorPortalModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  document.body.style.overflow = '';
}

export function renderDistributorPortalContent() {
  const container = document.getElementById('distributorPortalBody');
  if (!container) return;

  const dist = getDistributorData();
  const rawJobs = safeStorageGet(CONSTANTS.STORAGE_KEYS.STAFF_JOBS, []);
  const allStaff = safeStorageGet(CONSTANTS.STORAGE_KEYS.REGISTERED_STAFF, []);

  // Filter regional jobs
  const regionalJobs = rawJobs;
  const totalGrossRevenue = regionalJobs.reduce((acc, j) => {
    const val = parseFloat(String(j.finalPrice || '0').replace(/[^0-9\.]/g, '')) || 0;
    return acc + val;
  }, 0);

  const calculatedCommission = Math.round(totalGrossRevenue * dist.commissionRate);

  container.innerHTML = `
    <!-- Top KPI Stats Row -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px;">
      <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 14px; padding: 14px;">
        <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 4px;">📦 Bölgesel Görev / Sipariş</span>
        <strong style="font-size: 1.4rem; color: #ffffff;">${regionalJobs.length} Sipariş</strong>
      </div>
      <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 14px; padding: 14px;">
        <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 4px;">💰 Bölge Toplam Cirosu</span>
        <strong style="font-size: 1.4rem; color: #38bdf8;">${totalGrossRevenue.toLocaleString('tr-TR')} TL</strong>
      </div>
      <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 14px;">
        <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 4px;">💵 Distribütör Payınız (%20)</span>
        <strong style="font-size: 1.4rem; color: #34d399;">${(dist.balanceTL || calculatedCommission).toLocaleString('tr-TR')} TL</strong>
      </div>
      <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 14px; padding: 14px;">
        <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 4px;">🚚 Bölge Saha Ekibi</span>
        <strong style="font-size: 1.4rem; color: #fbbf24;">${allStaff.length || dist.activeStaffCount} Uzman Aktif</strong>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div style="display: flex; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 20px; overflow-x: auto;">
      <button type="button" class="dist-tab-btn active" data-target="distTabOrders" style="background: #0284c7; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">📋 Bölgesel Görev Dağıtım Masası</button>
      <button type="button" class="dist-tab-btn" data-target="distTabFleet" style="background: rgba(255,255,255,0.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">🚚 Saha Filosu & Uzmanlar</button>
      <button type="button" class="dist-tab-btn" data-target="distTabStock" style="background: rgba(255,255,255,0.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">📦 Merkez Depodan Malzeme Talebi</button>
      <button type="button" class="dist-tab-btn" data-target="distTabFinance" style="background: rgba(255,255,255,0.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">💳 Bakiye & IBAN Havale Masası</button>
    </div>

    <!-- Sub-Tab 1: Orders Dispatch -->
    <div id="distTabOrders" class="dist-pane" style="display: block;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h4 style="font-size: 1rem; color: #e2e8f0; margin: 0;">⚡ Canlı Bölge Görevleri & Sevk Yönetimi</h4>
        <span style="font-size: 0.78rem; color: #94a3b8;">Yetkili Masanızdan personellere doğrudan görev ataması yapabilirsiniz.</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${regionalJobs.length === 0 ? `
          <div style="padding: 30px; text-align: center; color: #94a3b8; background: rgba(13,22,44,0.5); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
            Bölgenizde henüz bekleyen sipariş bulunmuyor. Yeni siparişler geldiğinde anında bu masaya düşecektir.
          </div>
        ` : regionalJobs.map((j, idx) => {
          const isDone = j.status === 'Tamamlandı';
          const isEnRoute = j.status === 'Yolda' || j.status === 'Saha Görevinde';
          const waMsg = encodeURIComponent(`Merhaba, RELAXAX Bölge Distribütörlüğü'nden yazıyorum. #${j.orderCode || j.id} numaralı temizlik randevusu için detaylar: ${j.service}, Adres: ${j.customerAddress}`);
          return `
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.1); border-left: 4px solid ${isDone ? '#10b981' : isEnRoute ? '#38bdf8' : '#fbbf24'}; border-radius: 12px; padding: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <strong style="color: #38bdf8; font-size: 0.95rem;">#${escapeHTML(j.orderCode || j.id)}</strong>
                  <span style="background: rgba(255,255,255,0.08); font-size: 0.75rem; padding: 2px 6px; border-radius: 4px;">${escapeHTML(j.service || 'Standart Temizlik')}</span>
                  <span style="color: ${isDone ? '#34d399' : isEnRoute ? '#38bdf8' : '#fbbf24'}; font-size: 0.75rem; font-weight: 700;">● ${escapeHTML(j.status || 'Onay Bekliyor')}</span>
                </div>
                <div style="font-size: 0.82rem; color: #cbd5e1;">👤 <strong>${escapeHTML(j.customerName)}</strong> | 📞 ${escapeHTML(j.customerPhone)} | 📍 ${escapeHTML(j.customerAddress || j.district || 'Kadıköy')}</div>
                <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">💰 Tutar: <strong style="color:#ffffff;">${escapeHTML(j.finalPrice || '1.950 TL')}</strong> | Distribütör Payı (%20): <strong style="color:#34d399;">${Math.round((parseFloat(String(j.finalPrice).replace(/[^0-9\.]/g, '')) || 2000) * 0.20).toLocaleString('tr-TR')} TL</strong></div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <a href="https://wa.me/90${(j.customerPhone || '').replace(/\D/g, '')}?text=${waMsg}" target="_blank" style="background: rgba(37,211,102,0.15); border: 1px solid rgba(37,211,102,0.3); color: #25d366; text-decoration: none; padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700;">💬 Müşteri WhatsApp</a>
                <button type="button" onclick="window.distributorAssignStaff('${escapeHTML(j.orderCode || j.id)}')" style="background: #0284c7; color: #fff; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer;">⚡ Uzman Ata & Sevk Et</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Sub-Tab 2: Fleet Management -->
    <div id="distTabFleet" class="dist-pane" style="display: none;">
      <h4 style="font-size: 1rem; color: #e2e8f0; margin-bottom: 12px;">🚚 Bölgesel Temizlik Uzmanları & Saha Kapasitesi</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="color: #38bdf8;">👩‍💼 Ayşe K. (Kıdemli Uzman)</strong>
            <span style="background: rgba(16,185,129,0.15); color: #34d399; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: 700;">🟢 Görevde</span>
          </div>
          <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 6px;">Bölge: Kadıköy / Moda • Puan: ★ 4.98 • Tamamlanan: 142 Görev</p>
          <a href="tel:05466479004" style="color: #38bdf8; font-size: 0.8rem; text-decoration: none; font-weight: 700;">📞 Doğrudan Ara (0546 647 90 04)</a>
        </div>
        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="color: #38bdf8;">👩‍💼 Fatma D. (Buharlı Hijyen Uzmanı)</strong>
            <span style="background: rgba(56,189,248,0.15); color: #38bdf8; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: 700;">⚪ Müsait</span>
          </div>
          <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 6px;">Bölge: Ataşehir & Kadıköy • Puan: ★ 4.95 • Tamamlanan: 98 Görev</p>
          <a href="tel:05466479004" style="color: #38bdf8; font-size: 0.8rem; text-decoration: none; font-weight: 700;">📞 Doğrudan Ara (0546 647 90 04)</a>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 3: Stock Requests -->
    <div id="distTabStock" class="dist-pane" style="display: none;">
      <h4 style="font-size: 1rem; color: #e2e8f0; margin-bottom: 12px;">📦 Merkez Depodan Ekipman & Kimyasal İkmal Talebi</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 6px;">🌪️</div>
          <strong style="display: block; font-size: 0.9rem; margin-bottom: 4px;">Kärcher SC 5 Buhar Jeneratörü</strong>
          <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 10px;">150°C Medikal Buharlı Dezenfeksiyon Cihazı</span>
          <button type="button" onclick="window.requestDistributorSupply('Kärcher SC 5 Buhar Makinesi')" style="width: 100%; background: #0284c7; color: #fff; border: none; padding: 8px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer;">İkmal Talep Et</button>
        </div>
        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 6px;">🧪</div>
          <strong style="display: block; font-size: 0.9rem; margin-bottom: 4px;">Ecolab Hijyen Kimyasal Seti</strong>
          <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 10px;">50L Konsantre Ekolojik Yüzey Dezenfektanı</span>
          <button type="button" onclick="window.requestDistributorSupply('Ecolab Hijyen Kimyasal Seti (50L)')" style="width: 100%; background: #0284c7; color: #fff; border: none; padding: 8px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer;">İkmal Talep Et</button>
        </div>
        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 6px;">🧽</div>
          <strong style="display: block; font-size: 0.9rem; margin-bottom: 4px;">100'lü Mikrofiber Bez Kiti</strong>
          <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 10px;">Renk Kodlu Profesyonel Antibakteriyel Bez</span>
          <button type="button" onclick="window.requestDistributorSupply('100lü Mikrofiber Bez Kiti')" style="width: 100%; background: #0284c7; color: #fff; border: none; padding: 8px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer;">İkmal Talep Et</button>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 4: Finance & Payout -->
    <div id="distTabFinance" class="dist-pane" style="display: none;">
      <h4 style="font-size: 1rem; color: #e2e8f0; margin-bottom: 12px;">💳 Bakiye Çekim Masası & Banka Transferi</h4>
      <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; max-width: 500px;">
        <div style="margin-bottom: 12px;">
          <span style="font-size: 0.8rem; color: #94a3b8;">Kayıtlı Distribütör IBAN:</span>
          <strong style="display: block; color: #38bdf8; font-family: monospace; font-size: 1rem;">${dist.iban}</strong>
        </div>
        <div style="margin-bottom: 16px;">
          <span style="font-size: 0.8rem; color: #94a3b8;">Çekilebilir Net Komisyon Tutarı:</span>
          <strong style="display: block; color: #34d399; font-size: 1.5rem;">${dist.balanceTL.toLocaleString('tr-TR')} TL</strong>
        </div>
        <button type="button" onclick="window.requestDistributorPayout()" style="width: 100%; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: 800; font-size: 0.95rem; cursor: pointer;">💵 IBAN Hesabıma Aktar (Anında Havale)</button>
      </div>
    </div>
  `;

  // Attach tab switching events
  container.querySelectorAll('.dist-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      container.querySelectorAll('.dist-tab-btn').forEach(b => {
        b.style.background = 'rgba(255,255,255,0.06)';
        b.style.color = '#cbd5e1';
      });
      container.querySelectorAll('.dist-pane').forEach(p => p.style.display = 'none');
      btn.style.background = '#0284c7';
      btn.style.color = '#ffffff';
      const pane = document.getElementById(targetId);
      if (pane) pane.style.display = 'block';
    });
  });
}

// Window Globals for Distributor Actions
window.distributorAssignStaff = function(orderCode) {
  const staffName = prompt(`Lütfen #${orderCode} numaralı siparişe atanacak temizlik uzmanının adını giriniz:`, 'Ayşe K. (Kıdemli Uzman)');
  if (!staffName) return;

  const jobs = safeStorageGet(CONSTANTS.STORAGE_KEYS.STAFF_JOBS, []);
  const target = jobs.find(j => j.id === orderCode || j.orderCode === orderCode);
  if (target) {
    target.assignedStaff = {
      name: staffName,
      phone: '0546 647 90 04',
      rating: '4.98',
      experience: '6 Yıl',
      avatar: '👩‍💼',
      distanceKm: '1.2 km',
      etaMinutes: '12 dakika'
    };
    target.status = 'Yolda';
    safeStorageSet(CONSTANTS.STORAGE_KEYS.STAFF_JOBS, jobs);
    renderDistributorPortalContent();
    if (typeof window.playSuccessChime === 'function') window.playSuccessChime();
    alert(`✓ #${orderCode} numaralı siparişe uzman "${staffName}" atandı ve sevk başlatıldı!`);
  }
};

window.requestDistributorSupply = function(itemName) {
  const count = prompt(`Lütfen talep ettiğiniz "${itemName}" adetini giriniz:`, '2');
  if (!count) return;
  if (typeof window.playSuccessChime === 'function') window.playSuccessChime();
  alert(`✓ [${count} Adet] "${itemName}" ikmal talebiniz RELAXAX Merkez Lojistik Deposu'na iletildi. Kargo takip kodu 2 saat içinde iletilecektir.`);
};

window.requestDistributorPayout = function() {
  const dist = getDistributorData();
  if (dist.balanceTL <= 0) {
    alert('⚠️ Çekilebilir bakiyeniz bulunmamaktadır.');
    return;
  }
  const amount = dist.balanceTL;
  dist.paidTL = (dist.paidTL || 0) + amount;
  dist.balanceTL = 0;
  saveDistributorData(dist);
  renderDistributorPortalContent();
  if (typeof window.playCashRegisterChime === 'function') window.playCashRegisterChime();
  alert(`🎉 ${amount.toLocaleString('tr-TR')} TL tutarındaki distribütör hak edişiniz kayıtlı IBAN (${dist.iban}) adresinize EFT/FAST talimatı olarak iletildi!`);
};
