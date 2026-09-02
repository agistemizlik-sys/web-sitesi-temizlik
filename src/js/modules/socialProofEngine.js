/**
 * @fileoverview Dynamic Live Social Proof & Trust Notification Engine
 * Displays realistic, localized activity notifications to boost customer confidence.
 */

import { STATE } from '../state.js';
import { escapeHTML } from './domUtils.js';

const NOTIFICATIONS_TR = [
  { icon: '📍', title: 'Kadıköy / Moda', text: 'Standart Ev Temizliği randevusu oluşturuldu', time: '2 dakika önce' },
  { icon: '✨', title: 'Beşiktaş / Levent', text: '3+1 Detaylı Buharlı Temizlik onaylandı', time: '4 dakika önce' },
  { icon: '🏢', title: 'Şişli / Maslak', text: 'Kurumsal Ofis Periyodik Temizliği tamamlandı', time: '12 dakika önce' },
  { icon: '🌟', title: 'Üsküdar / Acıbadem', text: 'Müşteri değerlendirmesi: "Mükemmel hijyen!" (★ 5.0)', time: '8 dakika önce' },
  { icon: '🚗', title: 'Bakırköy / Florya', text: 'Temizlik uzmanı adrese ulaştı & çalışmaya başladı', time: 'Az önce' },
  { icon: '🏆', title: 'Ataşehir / Batı', text: '48 Nokta Hijyen Denetim Sertifikası teslim edildi', time: '18 dakika önce' }
];

const NOTIFICATIONS_PL = [
  { icon: '📍', title: 'Warszawa / Mokotów', text: 'Utworzono rezerwację sprzątania mieszkania', time: '2 minuty temu' },
  { icon: '✨', title: 'Warszawa / Śródmieście', text: 'Kompleksowe sprzątanie z parownicą potwierdzone', time: '5 minut temu' },
  { icon: '🏢', title: 'Warszawa / Wola', text: 'Zrealizowano cykliczne sprzątanie biura', time: '14 minut temu' },
  { icon: '🌟', title: 'Warszawa / Wilanów', text: 'Opinia klienta: "Personel na najwyższym poziomie!" (★ 5.0)', time: '9 minut temu' },
  { icon: '🚗', title: 'Warszawa / Ursynów', text: 'Specjalista dotarł na miejsce i rozpoczął pracę', time: 'Przed chwilą' }
];

const NOTIFICATIONS_EN = [
  { icon: '📍', title: 'Warsaw / Mokotów', text: 'New apartment cleaning appointment scheduled', time: '2 minutes ago' },
  { icon: '✨', title: 'Warsaw / City Center', text: 'Deep steam disinfection confirmed', time: '5 minutes ago' },
  { icon: '🏢', title: 'Warsaw / Wola', text: 'Corporate office cleaning completed', time: '14 minutes ago' },
  { icon: '🌟', title: 'Warsaw / Wilanów', text: 'Client review: "Outstanding service quality!" (★ 5.0)', time: '9 minutes ago' },
  { icon: '🚗', title: 'Warsaw / Ursynów', text: 'Cleaning team arrived on site and started work', time: 'Just now' }
];

const NOTIFICATIONS_DE = [
  { icon: '📍', title: 'Warschau / Mokotów', text: 'Wohnungsreinigung erfolgreich gebucht', time: 'Vor 2 Minuten' },
  { icon: '✨', title: 'Warschau / Zentrum', text: 'Dampfdesinfektion & Grundreinigung bestätigt', time: 'Vor 5 Minuten' },
  { icon: '🏢', title: 'Warschau / Wola', text: 'Periodische Büroreinigung abgeschlossen', time: 'Vor 14 Minuten' },
  { icon: '🌟', title: 'Warschau / Wilanów', text: 'Kundenbewertung: "Hervorragende Qualität!" (★ 5.0)', time: 'Vor 9 Minuten' }
];

const NOTIFICATIONS_UK = [
  { icon: '📍', title: 'Варшава / Мокотув', text: 'Створено нове бронювання прибирання квартири', time: '2 хвилини тому' },
  { icon: '✨', title: 'Варшава / Центр', text: 'Генеральне парове прибирання підтверджено', time: '5 хвилин тому' },
  { icon: '🏢', title: 'Варшава / Воля', text: 'Регулярне прибирання офісу завершено', time: '14 хвилин тому' },
  { icon: '🌟', title: 'Варшава / Вілянув', text: 'Відгук клієнта: "Бездоганна чистота!" (★ 5.0)', time: '9 хвилин тому' }
];

let toastEl = null;
let currentTimeout = null;
let intervalId = null;

export function initSocialProofEngine() {
  if (typeof window === 'undefined') return;

  // Create toast container if not present
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'rxSocialProofToast';
    toastEl.className = 'rx-social-proof-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }

  // Show first notification after 8 seconds, then every 28 seconds
  setTimeout(() => {
    showNextNotification();
    intervalId = setInterval(showNextNotification, 28000);
  }, 8000);
}

function showNextNotification() {
  if (!toastEl) return;

  // Don't disturb user if they are inside active booking reveal or open modal
  const isBookingActive = document.body.classList.contains('booking-reveal-active');
  const isModalOpen = !!document.querySelector('.rx-corporate-modal:not(.hidden), .auth-modal-backdrop:not(.hidden)');
  const isSuccessOpen = document.getElementById('bookingSuccessState')?.style.display === 'flex';

  if (isBookingActive || isModalOpen || isSuccessOpen) {
    hideNotification();
    return;
  }

  const lang = STATE && STATE.language ? STATE.language : 'tr';
  let list = NOTIFICATIONS_TR;
  if (lang === 'pl') list = NOTIFICATIONS_PL;
  else if (lang === 'en') list = NOTIFICATIONS_EN;
  else if (lang === 'de') list = NOTIFICATIONS_DE;
  else if (lang === 'uk') list = NOTIFICATIONS_UK;

  const item = list[Math.floor(Math.random() * list.length)];

  toastEl.innerHTML = `
    <div class="spt-icon">${escapeHTML(item.icon)}</div>
    <div class="spt-content">
      <div class="spt-header">
        <strong class="spt-title">${escapeHTML(item.title)}</strong>
        <span class="spt-time">${escapeHTML(item.time)}</span>
      </div>
      <p class="spt-text">${escapeHTML(item.text)}</p>
    </div>
    <button type="button" class="spt-close" aria-label="Kapat">&times;</button>
  `;

  const closeBtn = toastEl.querySelector('.spt-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideNotification();
    });
  }

  toastEl.classList.add('spt-visible');

  if (currentTimeout) clearTimeout(currentTimeout);
  currentTimeout = setTimeout(() => {
    hideNotification();
  }, 5500);
}

function hideNotification() {
  if (toastEl) {
    toastEl.classList.remove('spt-visible');
  }
}
