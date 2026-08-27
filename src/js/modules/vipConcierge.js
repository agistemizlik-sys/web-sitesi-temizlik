/**
 * @fileoverview RELAXAX Ultra-Luxury Black & Gold VIP Concierge Engine
 * Provides 5-star presidential housekeeping protocols, dedicated butler assistance, and priority dispatching.
 */

import { openModal, closeModal } from './modalManager.js';
import { playSuccessChime } from './soundEngine.js';

export function openVipConciergeModal() {
  const modal = document.getElementById('vipConciergeModal');
  if (modal) {
    openModal(modal);
  }
}

export function closeVipConciergeModal() {
  const modal = document.getElementById('vipConciergeModal');
  if (modal) {
    closeModal(modal);
  }
}

export function initVipConciergeEngine() {
  const modal = document.getElementById('vipConciergeModal');
  const triggerNavBtn = document.getElementById('cNavVipConciergeBtn');
  const closeBtn = document.getElementById('btnVipModalClose');
  const backdrop = document.getElementById('vipConciergeBackdrop');
  const form = document.getElementById('formVipConciergeRequest');
  const feedbackEl = document.getElementById('vipConciergeFeedback');

  if (triggerNavBtn) {
    triggerNavBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openVipConciergeModal();
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => closeVipConciergeModal());
  }

  if (backdrop && modal) {
    backdrop.addEventListener('click', () => closeVipConciergeModal());
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('vipName')?.value.trim();
      const phone = document.getElementById('vipPhone')?.value.trim();
      const residenceType = document.getElementById('vipResidenceType')?.value || 'Lüks Rezidans / Penthouse';
      const notes = document.getElementById('vipNotes')?.value.trim();

      if (!name || !phone) return;

      if (feedbackEl) {
        feedbackEl.innerHTML = '✨ <strong>VIP Concierge Talebiniz Alındı.</strong> Özel Müşteri Temsilciniz 2 dakika içinde sizinle iletişime geçecektir.';
        feedbackEl.className = 'auth-feedback success';
        feedbackEl.style.display = 'block';
      }

      playSuccessChime();

      // Dispatch directly to Backend & Admin Panel
      try {
        const payload = {
          name,
          phone,
          residenceType,
          notes,
          type: 'VIP_CONCIERGE_PRIORITY',
          timestamp: new Date().toISOString()
        };
        await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}

      setTimeout(() => {
        closeVipConciergeModal();
        if (feedbackEl) feedbackEl.style.display = 'none';
        form.reset();
      }, 3500);
    });
  }

  // Attach globally
  window.openVipConciergeModal = openVipConciergeModal;
  window.closeVipConciergeModal = closeVipConciergeModal;
}
