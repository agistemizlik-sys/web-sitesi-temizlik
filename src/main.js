/**
 * RELAXAX Modern Minimalist Cleaning Service Engine
 * Ultra-fast, responsive, zero-bloat vanilla JavaScript
 */

// Core Pricing Engine Configuration
const PRICING = {
  currencies: {
    TR: { symbol: 'TL', code: 'TL' },
    PL: { symbol: 'PLN', code: 'PLN' }
  },
  services: {
    standart: {
      TL: { base: 1850, perRoom: 350, perBath: 250 },
      PLN: { base: 219, perRoom: 45, perBath: 35 }
    },
    detayli: {
      TL: { base: 2450, perRoom: 450, perBath: 350 },
      PLN: { base: 289, perRoom: 60, perBath: 45 }
    },
    tasinma: {
      TL: { base: 2750, perRoom: 500, perBath: 400 },
      PLN: { base: 319, perRoom: 65, perBath: 50 }
    },
    insaat: {
      TL: { base: 3350, perRoom: 600, perBath: 500 },
      PLN: { base: 389, perRoom: 80, perBath: 65 }
    }
  },
  extras: {
    firin: { TL: 450, PLN: 59 },
    buzdolabi: { TL: 450, PLN: 55 },
    balkon: { TL: 400, PLN: 49 },
    cam: { TL: 550, PLN: 79 },
    koltuk: { TL: 750, PLN: 99 }
  },
  promos: {
    RELAX10: { type: 'percent', value: 0.10, label: '%10 Tanışma İndirimi' },
    RELAX20: { type: 'percent', value: 0.20, label: '%20 İndirim' },
    RELAXAXVIP: { type: 'percent', value: 0.20, label: '%20 VIP İndirim', maxTR: 1000, maxPL: 150 },
    VIP50: { type: 'fixed', TL: 350, PLN: 50, label: 'VIP Sadakat İndirimi' },
    HOSGELDIN: { type: 'fixed', TL: 250, PLN: 35, label: 'Hoş Geldin İndirimi' }
  }
};

// Application State
const state = {
  service: 'standart',
  rooms: 2,
  baths: 1,
  selectedExtras: new Set(),
  city: 'Istanbul',
  currency: 'TL',
  appliedPromo: null,
  calculatedPrice: 1850,
  language: 'tr'
};

// DOM Elements
const DOM = {
  form: document.getElementById('bookingForm'),
  serviceRadios: document.querySelectorAll('input[name="serviceType"]'),
  roomPills: document.querySelectorAll('.room-pill'),
  bathPills: document.querySelectorAll('.bath-pill'),
  extraCheckboxes: document.querySelectorAll('input[name="extras"]'),
  citySelect: document.getElementById('orderCity'),
  orderDate: document.getElementById('orderDate'),
  promoInput: document.getElementById('promoCodeInput'),
  applyPromoBtn: document.getElementById('applyPromoBtn'),
  promoMessage: document.getElementById('promoMessage'),
  promoRow: document.getElementById('promoRow'),
  summaryBasePrice: document.getElementById('summaryBasePrice'),
  summaryExtrasPrice: document.getElementById('summaryExtrasPrice'),
  summaryDiscount: document.getElementById('summaryDiscount'),
  summaryTotalPrice: document.getElementById('summaryTotalPrice'),
  formAlertBox: document.getElementById('formAlertBox'),
  submitOrderBtn: document.getElementById('submitOrderBtn'),
  orderSuccessBox: document.getElementById('orderSuccessBox'),
  confirmedOrderCode: document.getElementById('confirmedOrderCode'),
  orderWhatsAppBtn: document.getElementById('orderWhatsAppBtn'),
  resetOrderFormBtn: document.getElementById('resetOrderFormBtn'),
  mobileToggle: document.getElementById('mobileToggle'),
  mainNav: document.getElementById('mainNav'),
  langBtns: document.querySelectorAll('.lang-btn'),
  serviceSelectBtns: document.querySelectorAll('.select-service-btn')
};

// Calculate and Update Price
function updatePrice() {
  const isPoland = state.city === 'Warszawa' || state.language === 'pl';
  state.currency = isPoland ? 'PLN' : 'TL';
  const curr = state.currency;

  const serviceRates = PRICING.services[state.service][curr];
  const basePrice = serviceRates.base + ((state.rooms - 1) * serviceRates.perRoom) + ((state.baths - 1) * serviceRates.perBath);

  let extrasTotal = 0;
  state.selectedExtras.forEach(extraKey => {
    if (PRICING.extras[extraKey]) {
      extrasTotal += PRICING.extras[extraKey][curr] || 0;
    }
  });

  const subtotal = basePrice + extrasTotal;
  let discount = 0;

  if (state.appliedPromo) {
    const promo = state.appliedPromo;
    if (promo.type === 'percent') {
      discount = Math.round(subtotal * promo.value);
      const maxLimit = curr === 'PLN' ? (promo.maxPL || 9999) : (promo.maxTR || 9999);
      if (discount > maxLimit) discount = maxLimit;
    } else if (promo.type === 'fixed') {
      discount = promo[curr] || 0;
    }
  }

  const finalTotal = Math.max(curr === 'PLN' ? 99 : 600, subtotal - discount);
  state.calculatedPrice = finalTotal;

  // Format helper
  const fmt = (num) => `${num.toLocaleString('tr-TR')} ${curr}`;

  if (DOM.summaryBasePrice) DOM.summaryBasePrice.textContent = fmt(basePrice);
  if (DOM.summaryExtrasPrice) DOM.summaryExtrasPrice.textContent = fmt(extrasTotal);
  
  if (DOM.promoRow && DOM.summaryDiscount) {
    if (discount > 0) {
      DOM.promoRow.style.display = 'flex';
      DOM.summaryDiscount.textContent = `-${fmt(discount)}`;
    } else {
      DOM.promoRow.style.display = 'none';
    }
  }

  if (DOM.summaryTotalPrice) DOM.summaryTotalPrice.textContent = fmt(finalTotal);
}

// Event Listeners Initialization
function initCalculatorEvents() {
  // Service Radio Cards
  DOM.serviceRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.service = e.target.value;
      document.querySelectorAll('.service-radio-card').forEach(card => card.classList.remove('active'));
      const parentCard = e.target.closest('.service-radio-card');
      if (parentCard) parentCard.classList.add('active');
      updatePrice();
    });
  });

  // Room Pills
  DOM.roomPills.forEach(pill => {
    pill.addEventListener('click', () => {
      DOM.roomPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.rooms = parseInt(pill.dataset.rooms, 10) || 2;
      updatePrice();
    });
  });

  // Bath Pills
  DOM.bathPills.forEach(pill => {
    pill.addEventListener('click', () => {
      DOM.bathPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.baths = parseInt(pill.dataset.baths, 10) || 1;
      updatePrice();
    });
  });

  // Extras Checkboxes
  DOM.extraCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        state.selectedExtras.add(cb.value);
      } else {
        state.selectedExtras.delete(cb.value);
      }
      updatePrice();
    });
  });

  // City Selector
  if (DOM.citySelect) {
    DOM.citySelect.addEventListener('change', (e) => {
      state.city = e.target.value;
      updatePrice();
    });
  }

  // Promo Code Application
  if (DOM.applyPromoBtn && DOM.promoInput) {
    DOM.applyPromoBtn.addEventListener('click', handleApplyPromo);
    DOM.promoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleApplyPromo();
      }
    });
  }

  // Set min date to today for date picker
  if (DOM.orderDate) {
    const today = new Date().toISOString().split('T')[0];
    DOM.orderDate.min = today;
    DOM.orderDate.value = today;
  }

  // "Bu Paketi Seç" buttons in Services section
  DOM.serviceSelectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetService = btn.dataset.targetService;
      if (targetService) {
        state.service = targetService;
        const targetRadio = document.querySelector(`input[name="serviceType"][value="${targetService}"]`);
        if (targetRadio) {
          targetRadio.checked = true;
          document.querySelectorAll('.service-radio-card').forEach(card => card.classList.remove('active'));
          const parentCard = targetRadio.closest('.service-radio-card');
          if (parentCard) parentCard.classList.add('active');
        }
        updatePrice();

        const calcSection = document.getElementById('hesapla');
        if (calcSection) {
          calcSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

function handleApplyPromo() {
  const code = (DOM.promoInput.value || '').trim().toUpperCase();
  if (!code) {
    showPromoMessage('Lütfen bir indirim kodu giriniz.', 'error');
    return;
  }

  const promo = PRICING.promos[code];
  if (promo) {
    state.appliedPromo = promo;
    showPromoMessage(`Tebrikler! ${promo.label} başarıyla uygulandı.`, 'success');
    updatePrice();
  } else {
    state.appliedPromo = null;
    showPromoMessage('Geçersiz indirim kodu.', 'error');
    updatePrice();
  }
}

function showPromoMessage(text, type) {
  if (!DOM.promoMessage) return;
  DOM.promoMessage.textContent = text;
  DOM.promoMessage.className = `promo-msg ${type}`;
}

// Order Form Submission
function initOrderSubmission() {
  if (!DOM.form) return;

  DOM.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (DOM.formAlertBox) DOM.formAlertBox.style.display = 'none';

    const customerName = document.getElementById('customerName')?.value?.trim();
    const customerPhone = document.getElementById('customerPhone')?.value?.trim();
    const district = document.getElementById('orderDistrict')?.value?.trim();
    const date = document.getElementById('orderDate')?.value?.trim();
    const time = document.getElementById('orderTime')?.value?.trim() || '09:00';
    const city = DOM.citySelect?.value || 'Istanbul';

    if (!customerName || !customerPhone || !district || !date) {
      showAlert('Lütfen Ad Soyad, Telefon, İlçe ve Tarih alanlarını eksiksiz doldurunuz.', 'error');
      return;
    }

    const orderPayload = {
      customerName,
      customerPhone,
      city,
      district,
      serviceType: state.service,
      rooms: `${state.rooms}+1 Daire (${state.rooms * 25 + 35} m²)`,
      baths: `${state.baths} Banyo`,
      date,
      time,
      totalPrice: state.calculatedPrice,
      currency: state.currency,
      extras: Array.from(state.selectedExtras),
      notes: `Web Rezervasyonu | ${state.rooms}+1 | ${state.baths} Banyo`
    };

    // UI Loading state
    if (DOM.submitOrderBtn) {
      DOM.submitOrderBtn.disabled = true;
      DOM.submitOrderBtn.innerHTML = '<span>Lütfen bekleyiniz, kaydediliyor...</span>';
    }

    let generatedCode = 'RLX-' + Math.floor(100000 + Math.random() * 900000);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.orderCode) generatedCode = data.orderCode;
      }
    } catch (err) {
      console.warn('[ORDER_CLIENT_OFFLINE_RELAY]', err);
    }

    // Success Screen
    showOrderSuccess(generatedCode, orderPayload);
  });

  if (DOM.resetOrderFormBtn) {
    DOM.resetOrderFormBtn.addEventListener('click', () => {
      DOM.orderSuccessBox.style.display = 'none';
      DOM.form.style.display = 'block';
      DOM.form.reset();
      state.selectedExtras.clear();
      state.appliedPromo = null;
      if (DOM.promoMessage) DOM.promoMessage.textContent = '';
      if (DOM.submitOrderBtn) {
        DOM.submitOrderBtn.disabled = false;
        DOM.submitOrderBtn.innerHTML = '<span>Randevuyu Onayla & WhatsApp\'a Aktar</span>';
      }
      updatePrice();
    });
  }
}

function showAlert(text, type = 'error') {
  if (!DOM.formAlertBox) return;
  DOM.formAlertBox.textContent = text;
  DOM.formAlertBox.className = `form-alert-box ${type}`;
  DOM.formAlertBox.style.display = 'block';
}

function showOrderSuccess(orderCode, payload) {
  DOM.form.style.display = 'none';
  DOM.orderSuccessBox.style.display = 'block';
  if (DOM.confirmedOrderCode) DOM.confirmedOrderCode.textContent = orderCode;

  // Compose clean WhatsApp text
  const waMsg = `Merhaba RELAXAX,%0A%0A*Yeni Temizlik Randevusu:*%0A📋 Sipariş No: ${orderCode}%0A👤 Ad Soyad: ${encodeURIComponent(payload.customerName)}%0A📞 Tel: ${encodeURIComponent(payload.customerPhone)}%0A📍 Şehir/İlçe: ${encodeURIComponent(payload.city)} / ${encodeURIComponent(payload.district)}%0A🧹 Hizmet: ${encodeURIComponent(payload.serviceType)}%0A🏠 Alan: ${encodeURIComponent(payload.rooms)} (${payload.baths})%0A📅 Tarih: ${payload.date} - ${payload.time}%0A💰 Net Tutar: ${payload.totalPrice} ${payload.currency}%0A%0ARandevumu onaylamak istiyorum.`;

  if (DOM.orderWhatsAppBtn) {
    DOM.orderWhatsAppBtn.href = `https://wa.me/905466479004?text=${waMsg}`;
  }

  DOM.orderSuccessBox.scrollIntoView({ behavior: 'smooth' });
}

// Mobile Nav Toggle
function initMobileNav() {
  if (!DOM.mobileToggle || !DOM.mainNav) return;

  DOM.mobileToggle.addEventListener('click', () => {
    DOM.mainNav.classList.toggle('open');
  });

  // Close nav on link click
  document.querySelectorAll('.main-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      DOM.mainNav.classList.remove('open');
    });
  });
}

// Simple Multi-language Switcher
const I18N_TEXTS = {
  tr: {
    heroTitle: 'Eviniz ve Ofisiniz İçin <span class="text-gradient">Kusursuz & Güvenilir</span> Temizlik',
    heroSub: 'İstanbul, İzmir, Ankara, Antalya, Bursa ve Warszawa\'da sabit fiyat garantisiyle eğitimli, adli sicil kontrollü ve sigortalı profesyonel temizlik uzmanları.',
    calcTitle: '30 Saniyede Fiyatınızı Hesaplayın',
    submitBtn: 'Randevuyu Onayla & WhatsApp\'a Aktar'
  },
  en: {
    heroTitle: 'Flawless & Reliable Cleaning For <span class="text-gradient">Your Home & Office</span>',
    heroSub: 'Insured and background-checked professional cleaning teams across Istanbul, Warsaw, Izmir, and Antalya with guaranteed fixed pricing.',
    calcTitle: 'Calculate Your Price in 30 Seconds',
    submitBtn: 'Confirm Booking & Send via WhatsApp'
  },
  pl: {
    heroTitle: 'Profesjonalne i Niezawodne <span class="text-gradient">Sprzątanie Mieszkań i Biur</span>',
    heroSub: 'Ubezpieczone i sprawdzone ekipy sprzątające w Warszawie ze stałą gwarancją ceny i 100% zadowoleniem.',
    calcTitle: 'Oblicz Cenę w 30 Sekund',
    submitBtn: 'Potwierdź Rezerwację i Wyślij na WhatsApp'
  }
};

function initLanguageSwitcher() {
  DOM.langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      DOM.langBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.language = lang;

      const texts = I18N_TEXTS[lang];
      if (texts) {
        const hTitle = document.querySelector('.hero-title');
        const hSub = document.querySelector('.hero-subtitle');
        const cTitle = document.querySelector('.calculator-section .section-title');
        const sBtn = document.querySelector('#submitOrderBtn span');

        if (hTitle) hTitle.innerHTML = texts.heroTitle;
        if (hSub) hSub.textContent = texts.heroSub;
        if (cTitle) cTitle.textContent = texts.calcTitle;
        if (sBtn) sBtn.textContent = texts.submitBtn;
      }

      if (lang === 'pl') {
        state.city = 'Warszawa';
        if (DOM.citySelect) DOM.citySelect.value = 'Warszawa';
      }
      updatePrice();
    });
  });
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
  initCalculatorEvents();
  initOrderSubmission();
  initMobileNav();
  initLanguageSwitcher();
  updatePrice();
});
