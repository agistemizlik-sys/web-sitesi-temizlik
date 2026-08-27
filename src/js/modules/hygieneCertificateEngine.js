import { openModal, closeModal } from './modalManager.js';

let currentCertData = null;

/**
 * Opens and renders the 48-Point Digital Hygiene Certificate for a specific order.
 * @param {Object} orderData - The order details
 */
export function openHygieneCertificate(orderData = {}) {
  const modal = document.getElementById('hygieneCertModal');
  if (!modal) return;

  currentCertData = orderData;

  const code = orderData.orderCode || orderData.resCode || orderData.id || `HYG-${Date.now().toString(36).toUpperCase()}`;
  const certNo = `HYG-2026-${code.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase()}`;
  const dateStr = orderData.date || new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const customerName = orderData.customerName || orderData.name || 'Değerli Müşterimiz';
  const serviceTitle = orderData.service || orderData.serviceTitle || 'Detaylı Premium Ev Temizliği';
  const address = orderData.customerAddress || orderData.address || `${orderData.district || 'Kadıköy'}, ${orderData.city || 'İstanbul'}`;
  const staffName = orderData.assignedStaff?.name || orderData.staffName || 'Ayşe K. (Baş Denetçi #8821)';

  // Populate DOM elements
  const elNo = document.getElementById('certDisplayNo');
  const elDate = document.getElementById('certDisplayDate');
  const elCustomer = document.getElementById('certDisplayCustomer');
  const elService = document.getElementById('certDisplayService');
  const elAddress = document.getElementById('certDisplayAddress');
  const elStaff = document.getElementById('certDisplayStaff');
  const elFooterCode = document.getElementById('certFooterCode');

  if (elNo) elNo.textContent = `SERTİFİKA NO: ${certNo}`;
  if (elDate) elDate.textContent = `Tarih: ${dateStr}`;
  if (elCustomer) elCustomer.textContent = customerName;
  if (elService) elService.textContent = serviceTitle;
  if (elAddress) elAddress.textContent = address;
  if (elStaff) elStaff.textContent = staffName;
  if (elFooterCode) elFooterCode.textContent = certNo;

  openModal(modal);
}

/**
 * Closes the hygiene certificate modal.
 */
export function closeHygieneCertificate() {
  const modal = document.getElementById('hygieneCertModal');
  if (modal) closeModal(modal);
}

/**
 * Initializes the hygiene certificate modal event handlers.
 */
export function initHygieneCertificateEngine() {
  const modal = document.getElementById('hygieneCertModal');
  const closeBtn = document.getElementById('btnCertModalClose');
  const backdrop = document.getElementById('hygieneCertBackdrop');
  const printBtn = document.getElementById('btnPrintHygieneCert');
  const shareWaBtn = document.getElementById('btnShareCertWa');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => closeModal(modal));
  }

  if (backdrop && modal) {
    backdrop.addEventListener('click', () => closeModal(modal));
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (shareWaBtn) {
    shareWaBtn.addEventListener('click', () => {
      const code = currentCertData?.orderCode || currentCertData?.resCode || 'HYG-2026-RLX';
      const msg = encodeURIComponent(
        `🏆 RELAXAX 48 Nokta ISO-9001 Onaylı Resmi Dijital Hijyen Sertifikası\n` +
        `📋 Belge No: #${code}\n` +
        `✨ 48/48 Medikal Standart Hijyen Denetimi %100 Başarıyla Tamamlandı.\n` +
        `🌐 Doğrulama: https://relaxax.com`
      );
      window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
    });
  }

  // Expose globally for inline onclick triggers
  window.openHygieneCertificate = openHygieneCertificate;
  window.closeHygieneCertificate = closeHygieneCertificate;
}
