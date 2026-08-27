/**
 * @fileoverview Modal Dialogs & Overlay Manager (Clean Code Module)
 * Handles opening, closing, GSAP transitions, backdrop taps, and ESC key navigation.
 */

import { gsap } from 'gsap';

/**
 * Opens a modal dialog with smooth GSAP scaling and backdrop fade.
 * @param {HTMLElement|string} modal - Element or selector.
 */
export function openModal(modal) {
  const modalEl = typeof modal === 'string' ? document.querySelector(modal) : modal;
  if (!modalEl) return;

  modalEl.removeAttribute('hidden');
  modalEl.style.display = 'flex';
  modalEl.classList.add('active');

  const content = modalEl.querySelector('.modal-content, .modal-dialog, .corporate-modal-dialog, .glass-card');
  if (content) {
    gsap.fromTo(content,
      { scale: 0.92, opacity: 0, y: 15 },
      { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );
  }
}

/**
 * Closes an active modal dialog.
 * @param {HTMLElement|string} modal - Element or selector.
 */
export function closeModal(modal) {
  const modalEl = typeof modal === 'string' ? document.querySelector(modal) : modal;
  if (!modalEl) return;

  const content = modalEl.querySelector('.modal-content, .modal-dialog, .corporate-modal-dialog, .glass-card');
  if (content) {
    gsap.to(content, {
      scale: 0.94,
      opacity: 0,
      y: 10,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        modalEl.setAttribute('hidden', '');
        modalEl.style.display = 'none';
        modalEl.classList.remove('active');
      }
    });
  } else {
    modalEl.setAttribute('hidden', '');
    modalEl.style.display = 'none';
    modalEl.classList.remove('active');
  }
}

/**
 * Opens the Legal & Compliance Contracts Modal to a specific tab.
 * @param {string} tabKey - Target tab ('terms', 'kvkk', 'staff', 'security', 'distance')
 */
export function openLegalModal(tabKey = 'terms') {
  const modal = document.getElementById('legalModal');
  if (!modal) return;

  const tabs = modal.querySelectorAll('.rx-legal-tab-btn');
  const panes = modal.querySelectorAll('.rx-legal-tab-pane');

  tabs.forEach(tab => {
    if (tab.dataset.legalTab === tabKey) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  panes.forEach(pane => {
    if (pane.id === `legalPane_${tabKey}`) {
      pane.style.display = 'block';
    } else {
      pane.style.display = 'none';
    }
  });

  openModal(modal);
}

/**
 * Registers global ESC key and outside backdrop click handlers.
 */
export function initGlobalModalHandlers() {
  // ESC Key listener
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal.active, .custom-modal.active, .info-modal.active, .rx-corporate-modal-overlay.active');
      if (activeModal) {
        closeModal(activeModal);
      }
    }
  });

  // Close buttons & backdrop clicks
  document.addEventListener('click', (e) => {
    const closeTrigger = e.target.closest('.modal-close, .btn-close, .custom-modal-close, .info-modal-close, .rx-cmodal-close-btn, [data-modal-close]');
    if (closeTrigger) {
      const modal = closeTrigger.closest('.modal, .custom-modal, .info-modal, .rx-corporate-modal-overlay');
      if (modal) closeModal(modal);
      return;
    }

    // Direct backdrop click
    if (e.target.classList.contains('modal') || e.target.classList.contains('custom-modal') || e.target.classList.contains('info-modal') || e.target.classList.contains('rx-corporate-modal-overlay')) {
      closeModal(e.target);
    }
  });
}

