/**
 * RELAXAX Enterprise i18n Engine
 * Modularized Language Architecture supporting TR, EN, PL, DE, RU, UK, AR
 */
import { TRANSLATIONS } from '../translations.js';
import { STATE } from '../state.js';

export const SUPPORTED_LANGUAGES = {
  tr: { code: 'tr', name: 'Türkçe', flag: '🇹🇷', currency: 'TL', dir: 'ltr' },
  en: { code: 'en', name: 'English', flag: '🇬🇧', currency: '€', dir: 'ltr' },
  pl: { code: 'pl', name: 'Polski', flag: '🇵🇱', currency: 'PLN', dir: 'ltr' },
  de: { code: 'de', name: 'Deutsch', flag: '🇩🇪', currency: '€', dir: 'ltr' },
  ru: { code: 'ru', name: 'Русский', flag: '🇷🇺', currency: '$', dir: 'ltr' },
  uk: { code: 'uk', name: 'Українська', flag: '🇺🇦', currency: 'PLN', dir: 'ltr' },
  ar: { code: 'ar', name: 'العربية', flag: '🇸🇦', currency: '$', dir: 'rtl' }
};

export function getTranslation(key, fallback = '') {
  const lang = STATE.language || 'tr';
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.tr || {};
  return dict[key] !== undefined ? dict[key] : fallback;
}

export function getCurrentLangConfig() {
  const lang = STATE.language || 'tr';
  return SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES.tr;
}

export function applyLanguageGlobal(lang) {
  if (!SUPPORTED_LANGUAGES[lang]) {
    lang = 'tr';
  }

  STATE.language = lang;
  STATE.currentLang = lang;

  try {
    localStorage.setItem('relaxax_language', lang);
  } catch (e) {}

  const config = SUPPORTED_LANGUAGES[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = config.dir;

  // Update Top Navbar Language Pill
  const navFlag = document.getElementById('cNavLangFlag');
  const navCode = document.getElementById('cNavLangCode');
  if (navFlag) navFlag.textContent = config.flag;
  if (navCode) navCode.textContent = config.code.toUpperCase();

  // Update CSO popover text
  const csoText = document.getElementById('csoCurrentLangText');
  if (csoText) csoText.textContent = config.name;

  // Highlight active buttons
  document.querySelectorAll('.cso-lang-option, .c-nav-lang-opt').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  const dict = TRANSLATIONS[lang] || TRANSLATIONS.tr;

  // 1. Page Title & Meta
  if (dict.title) document.title = dict.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && dict.description) metaDesc.setAttribute('content', dict.description);

  // 2. Navigation Pills Text
  const navMapText = document.getElementById('cNavMapText');
  const navProductsText = document.getElementById('cNavProductsText');
  const navCalcText = document.getElementById('cNavCalcText');
  const navAuthText = document.getElementById('cNavAuthText');
  const navWhatsappText = document.getElementById('cNavWhatsappText');

  if (navMapText) navMapText.textContent = dict.navChangeCity || 'Şehir Haritası';
  if (navProductsText) navProductsText.textContent = lang === 'pl' ? 'Nasze Produkty' : (lang === 'en' ? 'Our Products' : (lang === 'de' ? 'Unsere Produkte' : (lang === 'ru' ? 'Наши Товары' : (lang === 'ar' ? 'منتجاتنا' : 'Ürünlerimiz'))));
  if (navCalcText) navCalcText.textContent = lang === 'pl' ? 'Oblicz Cenę' : (lang === 'en' ? 'Calculate Price' : (lang === 'de' ? 'Preis Berechnen' : (lang === 'ru' ? 'Рассчитать' : (lang === 'ar' ? 'حساب التكلفة' : 'Fiyat Hesapla'))));
  if (navAuthText && !STATE.currentUser) navAuthText.textContent = lang === 'pl' ? 'Logowanie / Rejestracja' : (lang === 'en' ? 'Login / Sign Up' : (lang === 'de' ? 'Anmelden / Registrieren' : (lang === 'ru' ? 'Вход / Регистрация' : (lang === 'ar' ? 'دخول / تسجيل' : 'Giriş / Kayıt'))));
  if (navWhatsappText) navWhatsappText.textContent = lang === 'pl' ? 'Zamów przez WhatsApp' : (lang === 'en' ? 'WhatsApp Order' : (lang === 'de' ? 'WhatsApp Bestellung' : (lang === 'ru' ? 'Заказ в WhatsApp' : (lang === 'ar' ? 'طلب عبر واتساب' : 'WhatsApp Sipariş'))));

  // 3. Wizard & Booking Headers
  const bBadge = document.querySelector('.booking-section-header .b-badge');
  const bTitle = document.querySelector('.booking-section-header .b-sec-main-title');
  const bSub = document.querySelector('.booking-section-header .b-sec-main-sub');

  if (bBadge) bBadge.textContent = lang === 'pl' ? 'SZYBKIE ZAMÓWIENIE' : (lang === 'en' ? 'FAST BOOKING' : (lang === 'de' ? 'SCHNELLE BUCHUNG' : (lang === 'ru' ? 'БЫСТРЫЙ ЗАКАЗ' : (lang === 'ar' ? 'حجز سريع' : 'HIZLI SİPARİŞİ OLUŞTURUN'))));
  if (bTitle) bTitle.textContent = dict.bookingTitle || 'EVİNİZ / DAİRENİZ İÇİN TEMİZLİK HESAPLAYICI';
  if (bSub) bSub.textContent = dict.bookingSubtitle || 'Kusursuz hijyen, profesyonel ekipman.';

  // 4. Wizard Step Texts
  const sInd1 = document.querySelector('#stepIndicator1 .w-step-text');
  const sInd2 = document.querySelector('#stepIndicator2 .w-step-text');
  const sInd3 = document.querySelector('#stepIndicator3 .w-step-text');
  if (sInd1) sInd1.textContent = lang === 'pl' ? 'Mieszkanie i Częstotliwość' : (lang === 'en' ? 'Home & Frequency' : (lang === 'de' ? 'Wohnung & Intervall' : (lang === 'ru' ? 'Жилье и Частота' : (lang === 'ar' ? 'العقار والتكرار' : 'Daire & Sıklık'))));
  if (sInd2) sInd2.textContent = lang === 'pl' ? 'Usługi Dodatkowe' : (lang === 'en' ? 'Extra Services' : (lang === 'de' ? 'Zusatzleistungen' : (lang === 'ru' ? 'Дополнительные услуги' : (lang === 'ar' ? 'خدمات إضافية' : 'Ek Hizmetler'))));
  if (sInd3) sInd3.textContent = lang === 'pl' ? 'Adres i Termin' : (lang === 'en' ? 'Address & Schedule' : (lang === 'de' ? 'Adresse & Termin' : (lang === 'ru' ? 'Адрес и Дата' : (lang === 'ar' ? 'العنوان والموعد' : 'Adres & Randevu'))));

  // 5. Trigger calculation redraw
  if (typeof window.calculatePriceGlobal === 'function') {
    window.calculatePriceGlobal();
  }
}

export function initI18nDropdowns() {
  const langBtn = document.getElementById('cNavLangBtn');
  const langDropdown = document.getElementById('cNavLangDropdown');
  const langWrap = document.getElementById('cNavLangWrap');

  if (langBtn && langDropdown) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (langWrap && !langWrap.contains(e.target)) {
        langDropdown.classList.remove('show');
      }
    });

    document.querySelectorAll('.c-nav-lang-opt').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        const targetLang = opt.getAttribute('data-lang');
        if (targetLang) {
          applyLanguageGlobal(targetLang);
          langDropdown.classList.remove('show');
        }
      });
    });
  }

  // Country Selector Popover
  document.querySelectorAll('.cso-lang-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.preventDefault();
      const targetLang = opt.getAttribute('data-lang');
      if (targetLang) {
        applyLanguageGlobal(targetLang);
      }
    });
  });
}

// Make accessible globally
if (typeof window !== 'undefined') {
  window.applyLanguageGlobal = applyLanguageGlobal;
}
