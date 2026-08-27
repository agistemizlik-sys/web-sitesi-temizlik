/**
 * RELAXAX Enterprise i18n Engine
 * Modularized Language Architecture supporting TR, EN, PL, DE, RU, UK, AR
 */
import { TRANSLATIONS } from '../translations.js';
import { STATE } from '../state.js';

export const SUPPORTED_LANGUAGES = {
  tr: { code: 'tr', name: 'Türkçe', flag: '🇹🇷', currency: 'TL', dir: 'ltr' },
  en: { code: 'en', name: 'English', flag: '🇬🇧', currency: 'TL', dir: 'ltr' },
  pl: { code: 'pl', name: 'Polski', flag: '🇵🇱', currency: 'PLN', dir: 'ltr' },
  de: { code: 'de', name: 'Deutsch', flag: '🇩🇪', currency: 'TL', dir: 'ltr' },
  ru: { code: 'ru', name: 'Русский', flag: '🇷🇺', currency: 'TL', dir: 'ltr' },
  uk: { code: 'uk', name: 'Українська', flag: '🇺🇦', currency: 'PLN', dir: 'ltr' },
  ar: { code: 'ar', name: 'العربية', flag: '🇸🇦', currency: 'TL', dir: 'rtl' }
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

  // 5. Automatic DOM Translation via data-i18n, data-i18n-placeholder & data-i18n-title
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) {
      el.textContent = dict[key];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key && dict[key]) {
      el.setAttribute('title', dict[key]);
    }
  });

  // 6. Translate Legal Modal Tab Headers
  const legalTabTerms = document.getElementById('legalTabBtn_terms');
  const legalTabKvkk = document.getElementById('legalTabBtn_kvkk');
  const legalTabStaff = document.getElementById('legalTabBtn_staff');
  const legalTabSecurity = document.getElementById('legalTabBtn_security');
  const legalTabDistance = document.getElementById('legalTabBtn_distance');
  const legalModalTitle = document.getElementById('legalModalTitle');

  if (legalModalTitle) {
    legalModalTitle.textContent = lang === 'pl' ? 'Oficjalne Umowy Prawne i Ochrona Danych (RODO)' :
      (lang === 'en' ? 'Official Legal Agreements & Privacy Compliance' :
      (lang === 'de' ? 'Offizielle Rechtliche Vereinbarungen & DSGVO' :
      (lang === 'ru' ? 'Официальные Соглашения и Защита Данных' :
      (lang === 'ar' ? 'الاتفاقيات القانونية وحماية البيانات' :
      (lang === 'uk' ? 'Офіційні Угоди та Захист Даних' : 'Resmi Sözleşmeler & KVKK Uyumluluk Merkezi')))));
  }

  if (legalTabTerms) legalTabTerms.innerHTML = lang === 'pl' ? '📜 Regulamin Usług' : (lang === 'en' ? '📜 Terms of Service' : (lang === 'de' ? '📜 AGB & Nutzungsbedingungen' : (lang === 'ru' ? '📜 Пользовательское Соглашение' : (lang === 'ar' ? '📜 شروط الاستخدام' : '📜 Kullanıcı Sözleşmesi'))));
  if (legalTabKvkk) legalTabKvkk.innerHTML = lang === 'pl' ? '🔒 RODO & Prywatność' : (lang === 'en' ? '🔒 Privacy & GDPR' : (lang === 'de' ? '🔒 Datenschutz & DSGVO' : (lang === 'ru' ? '🔒 Политика Конфиденциальности' : (lang === 'ar' ? '🔒 الخصوصية وحماية البيانات' : '🔒 KVKK & Gizlilik'))));
  if (legalTabStaff) legalTabStaff.innerHTML = lang === 'pl' ? '💼 Warunki Wykonawcy' : (lang === 'en' ? '💼 Contractor Terms' : (lang === 'de' ? '💼 Partner-Bedingungen' : (lang === 'ru' ? '💼 Условия для Исполнителей' : (lang === 'ar' ? '💼 شروط مقدمي الخدمة' : '💼 Hizmet Sağlayıcı Şartları'))));
  if (legalTabSecurity) legalTabSecurity.innerHTML = lang === 'pl' ? '🛡️ Protokół Bezpieczeństwa' : (lang === 'en' ? '🛡️ Security Protocol' : (lang === 'de' ? '🛡️ Sicherheitsprotokoll' : (lang === 'ru' ? '🛡️ Протокол Безопасности' : (lang === 'ar' ? '🛡️ بروتوكول الأمان والسجل الجنائي' : '🛡️ Güvenlik Protokolü'))));
  if (legalTabDistance) legalTabDistance.innerHTML = lang === 'pl' ? '💳 Odstąpienie i Zwroty' : (lang === 'en' ? '💳 Cancellation & Returns' : (lang === 'de' ? '💳 Widerruf & Erstattung' : (lang === 'ru' ? '💳 Возврат и Отмена' : (lang === 'ar' ? '💳 شروط الإلغاء والاسترداد' : '💳 Mesafeli Satış & İade'))));

  // 7. Translate Hygiene Certificate Header
  const certModalTitle = document.getElementById('certModalTitle');
  const certSubtag = document.querySelector('.rx-cert-subtag');
  const printCertBtn = document.getElementById('btnPrintHygieneCert');
  const shareCertBtn = document.getElementById('btnShareCertWa');

  if (certModalTitle) {
    certModalTitle.textContent = lang === 'pl' ? '48-Punktowy Cyfrowy Certyfikat Higieny' :
      (lang === 'en' ? '48-Point Digital Hygiene Certificate' :
      (lang === 'de' ? '48-Punkte Digitales Hygiene-Zertifikat' :
      (lang === 'ru' ? '48-Точечный Цифровой Сертификат Гигиены' :
      (lang === 'ar' ? 'شهادة النظافة والتعقيم الرقمية المعتمدة (48 نقطة)' :
      (lang === 'uk' ? '48-Точковий Цифровий Сертифікат Гігієни' : '48 Nokta Dijital Hijyen Sertifikası')))));
  }

  if (certSubtag) {
    certSubtag.textContent = lang === 'pl' ? 'CERTYFIKOWANY DOKUMENT ISO-9001:2015 & ISO-45001' :
      (lang === 'en' ? 'ISO-9001:2015 & ISO-45001 CERTIFIED OFFICIAL HYGIENE DOCUMENT' :
      (lang === 'de' ? 'ISO-9001:2015 & ISO-45001 ZERTIFIZIERTES HYGIENEDOKUMENT' :
      (lang === 'ru' ? 'СЕРТИФИКАТ СООТВЕТСТВИЯ ISO-9001:2015 & ISO-45001' :
      (lang === 'ar' ? 'وثيقة النظافة الرسمية المعتمدة وفق معايير ISO-9001:2015 و ISO-45001' : 'ISO-9001:2015 & ISO-45001 ONAYLI RESMİ HİJYEN BELGESİ'))));
  }

  if (printCertBtn) {
    printCertBtn.textContent = lang === 'pl' ? '🖨️ Pobierz / Drukuj Certyfikat (PDF)' :
      (lang === 'en' ? '🖨️ Download / Print Certificate (PDF)' :
      (lang === 'de' ? '🖨️ Zertifikat Herunterladen / Drucken (PDF)' :
      (lang === 'ru' ? '🖨️ Скачать / Печать Сертификата (PDF)' :
      (lang === 'ar' ? '🖨️ تحميل / طباعة الشهادة (PDF)' : '🖨️ Sertifikayı İndir / Yazdır (PDF)'))));
  }

  if (shareCertBtn) {
    shareCertBtn.textContent = lang === 'pl' ? '💬 Udostępnij na WhatsApp' :
      (lang === 'en' ? '💬 Share via WhatsApp' :
      (lang === 'de' ? '💬 Über WhatsApp Teilen' :
      (lang === 'ru' ? '💬 Поделиться в WhatsApp' :
      (lang === 'ar' ? '💬 مشاركة عبر واتساب' : '💬 WhatsApp ile Paylaş'))));
  }

  // 8. Trigger calculation redraw
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
