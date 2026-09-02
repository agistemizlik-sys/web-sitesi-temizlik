/**
 * @fileoverview RELAXAX Enterprise AI Interactive Voice & Consultation Assistant
 * Features:
 * 1. 🎙️ Web Speech API Real-Time Speech-to-Text (STT) Recognition
 * 2. 🗣️ Multilingual Natural Voice Synthesis (TTS) (TR, EN, PL, DE, UK, RU)
 * 3. 🧠 Intelligent NLP Intent & Keyword Parser (Pricing, Booking, Promos, VIP, Hygiene, Cities)
 * 4. ⚡ Interactive Dynamic Action Buttons (Apply Coupon, Jump to Booking, Open Certificate, WhatsApp)
 * 5. 🎛️ Glassmorphic Voice Wave HUD with Real-time Speech Equalizer
 */

import { STATE } from '../state.js';
import { playTickSound, playSuccessChime } from './soundEngine.js';
import { openModal } from './modalManager.js';
import { escapeHTML } from './domUtils.js';

let isListening = false;
let isSpeaking = false;
let recognition = null;

export const INTENT_RESPONSES = {
  tr: {
    greeting: "Merhaba! RELAXAX Premium Temizlik Merkezine hoş geldiniz. Size nasıl yardımcı olabilirim? Aşağıdaki hızlı başlıklardan seçebilir veya mikrofona basarak konuşabilirsiniz.",
    pricing: "Standart 2+1 ev temizliğimiz 1.850 TL'den, 3+1 detaylı temizliğimiz ise 2.450 TL'den başlamaktadır. Haftalık veya 2 haftada bir periyodik seçimlerde %20'ye varan kalıcı indirim sunuyoruz.",
    hygiene: "Tüm temizliklerimizde Kärcher 150°C buharlı dezenfeksiyon cihazları, renk kodlu hijyenik bezler ve 48 nokta denetim sertifikası standart olarak uygulanır.",
    vip: "Black & Gold VIP Concierge hizmetimizle villanıza veya rezidansınıza özel kıdemli housekeeper tahsis edilir ve 2 saat içinde ekspres sevk sağlanır.",
    promo: "İlk siparişinize özel %15 hoş geldin indirim kuponunuz: HOSGELDIN15. Kuponu aşağıdaki butona basarak hemen tanımlayabilirsiniz.",
    booking: "Sizi doğrudan interaktif temizlik hesaplayıcı ve randevu bölümüne yönlendiriyorum. Daire tipinizi seçerek 30 saniyede sipariş oluşturabilirsiniz.",
    contact: "Müşteri hizmetlerimize 7/24 +90 (546) 647 90 04 numaralı WhatsApp hattımızdan veya doğrudan arayarak ulaşabilirsiniz.",
    cities: "Türkiye'de İstanbul, İzmir, Antalya, Kocaeli, Sakarya, Samsun, Balıkesir; Polonya'da ise Warszawa genelinde hizmet vermekteyiz.",
    fallback: "Sorunuzu anladım. Size en doğru fiyat ve hizmet detayını sunabilmemiz için hemen rezervasyon formumuzu doldurabilir veya WhatsApp hattımıza yazabilirsiniz."
  },
  en: {
    greeting: "Hello! Welcome to RELAXAX Premier Housekeeping. How can I assist you today? You can choose a quick topic or tap the microphone to speak.",
    pricing: "Our standard 2-room home cleaning starts from 1.850 TL (or 189 PLN in Warsaw), and 3-room deep cleaning starts from 2.450 TL (249 PLN) with up to 20% recurring discounts.",
    hygiene: "We deploy Kärcher 150°C hospital-grade steam purification, color-coded hygiene microfibers, and an official 48-Point Quality Certificate.",
    vip: "Our VIP Concierge provides a dedicated private housekeeper and 2-hour express dispatch for luxury residences and villas.",
    promo: "Your exclusive 15% welcome discount code is: WELCOME15. You can apply it instantly with the button below.",
    booking: "Directing you to our online instant booking calculator. Select your rooms and schedule in under 30 seconds.",
    contact: "You can reach our dedicated customer support team via WhatsApp at +90 (546) 647 90 04.",
    cities: "We actively serve Warsaw in Poland, as well as Istanbul, Izmir, Antalya, Kocaeli, and major metropolitan areas in Turkey.",
    fallback: "I understand your request. You can check our online booking calculator or reach out via WhatsApp for immediate assistance."
  },
  pl: {
    greeting: "Dzień dobry! Witamy w RELAXAX Warszawa. W czym mogę pomóc? Wybierz szybki temat lub naciśnij mikrofon, aby zadać pytanie głosowo.",
    pricing: "Sprzątanie mieszkania 2-pokojowego od 189 zł, a 3-pokojowego z myciem okien od 249 zł ze zniżką do 20% na wizyty cykliczne.",
    hygiene: "Zapewniamy 48-punktowy profesjonalny standard czystości, dezynfekcję parową Kärcher 150°C i ekologiczne środki czyszczące.",
    vip: "Usługa VIP Concierge oferuje dedykowanego asystenta domowego oraz ekspresowy dojazd w 2 godziny na terenie Warszawy.",
    promo: "Twój kod rabatowy 15% na pierwsze sprzątanie to: WARSZAWA15. Możesz go aktywować jednym kliknięciem.",
    booking: "Przekierowuję do interaktywnego kalkulatora wyceny i rezerwacji terminu online.",
    contact: "Nasz zespół w Warszawie jest dostępny pod numerem WhatsApp: +90 546 647 90 04.",
    cities: "Świadczymy usługi w Warszawie (Śródmieście, Mokotów, Wola, Ursynów, Bemowo, Wilanów) oraz w największych miastach Turcji.",
    fallback: "Rozumiem pytanie. Aby uzyskać dokładną wycenę, skorzystaj z kalkulatora na stronie lub skontaktuj się z nami przez WhatsApp."
  },
  de: {
    greeting: "Guten Tag! Willkommen bei RELAXAX Premium Reinigungsservice. Wie kann ich Ihnen helfen?",
    pricing: "Unsere Standardreinigung beginnt ab 1.850 TL (oder 189 PLN) mit bis zu 20% Dauerrabatt.",
    hygiene: "Wir bieten 150°C Dampfdesinfektion und ein 48-Punkte-Qualitätszertifikat für maximale Reinheit.",
    vip: "Unser VIP Concierge bietet persönliche Betreuung und 2-Stunden-Express-Service.",
    promo: "Ihr exklusiver 15% Willkommensrabatt lautet: WILLKOMMEN15.",
    booking: "Ich leite Sie direkt zum Online-Preisrechner und Buchungsformular weiter.",
    contact: "Sie erreichen unseren Kundenservice über WhatsApp unter +90 (546) 647 90 04.",
    cities: "Wir sind in Warschau (Polen) sowie in Istanbul, Izmir, Antalya und weiteren Regionen aktiv.",
    fallback: "Gerne können Sie unser Buchungsformular nutzen oder uns direkt per WhatsApp kontaktieren."
  },
  uk: {
    greeting: "Вітаємо! Вас вітає преміальний клінінг-сервіс RELAXAX. Чим ми можемо вам допомогти?",
    pricing: "Стандартне прибирання 2-кімнатної квартири від 189 злотих (1.850 TL) зі знижкою до 20% на регулярні візити.",
    hygiene: "Ми використовуємо парову дезінфекцію Kärcher 150°C та надаємо 48-точковий сертифікат контролю якості.",
    vip: "VIP Concierge надає персонального хаус-кіпера та експрес-виїзд протягом 2 годин.",
    promo: "Ваш промокод на знижку 15%: HOSGELDIN15.",
    booking: "Перенаправляю вас до калькулятора вартості та швидкого оформлення замовлення.",
    contact: "Зв'яжіться з нашою підтримкою у WhatsApp: +90 (546) 647 90 04.",
    cities: "Ми працюємо у Варшаві (Польща), а також у Стамбулі, Ізмірі, Анталії та інших містах.",
    fallback: "Будь ласка, заповніть форму розрахунку вартості на сайті або зв'яжіться з нами через WhatsApp."
  }
};

/**
 * Normalizes speech transcript and identifies intent.
 * @param {string} text - User spoken transcript
 * @returns {{ intent: string, action?: string, coupon?: string }}
 */
export function detectVoiceIntent(text) {
  if (!text || typeof text !== 'string') return { intent: 'fallback' };
  const lower = text.toLowerCase().trim();

  // 1. Pricing Intent
  if (/fiyat|ücret|kaç para|tutar|ne kadar|kaça|maliyet|cena|koszt|ile kosztuje|price|cost|how much|preis|preise|вартість|ціна|скільки/i.test(lower)) {
    return { intent: 'pricing', action: 'GOTO_CALC' };
  }

  // 2. Promo / Discount Intent
  if (/indirim|kupon|promosyon|kampanya|iskonto|kod|rabat|kod rabatowy|znizka|promo|coupon|discount|voucher|gutschein|промокод|знижка/i.test(lower)) {
    return { intent: 'promo', action: 'APPLY_PROMO', coupon: 'HOSGELDIN15' };
  }

  // 3. Booking Intent
  if (/randevu|rezervasyon|sipariş|temizlik iste|rezerwacj|zamów|book|schedule|appointment|termin|buchen|бронюван|замов/i.test(lower)) {
    return { intent: 'booking', action: 'GOTO_BOOKING' };
  }

  // 4. VIP Concierge Intent
  if (/vip|concierge|lüks|özel asistan|housekeeper|butler|rezidans|rezydencj/i.test(lower)) {
    return { intent: 'vip', action: 'OPEN_VIP' };
  }

  // 5. Hygiene & Protocol Intent
  if (/hijyen|buhar|kärcher|karcher|sertifika|kalite|güven|koruma|dezynfekcj|parow|certyfikat|hygiene|steam|certificate|гігієн|паров/i.test(lower)) {
    return { intent: 'hygiene', action: 'OPEN_CERT' };
  }

  // 6. Cities Intent
  if (/şehir|istanbul|izmir|antalya|warszawa|varşova|polonya|nerede|miast|gdzie|city|cities|where|stadt|місто/i.test(lower)) {
    return { intent: 'cities', action: 'CHANGE_CITY' };
  }

  // 7. Contact Intent
  if (/iletişim|telefon|whatsapp|ara|destek|kontakt|telefon|support|contact|call|kontakt|контакт|дзвінок/i.test(lower)) {
    return { intent: 'contact', action: 'OPEN_WHATSAPP' };
  }

  return { intent: 'fallback', action: 'GOTO_CALC' };
}

/**
 * Speaks text via Web Speech API with smooth animated equalizer status.
 * @param {string} text
 */
export function speakText(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const lang = STATE.language || 'tr';
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set voice language code
  if (lang === 'pl') utterance.lang = 'pl-PL';
  else if (lang === 'en') utterance.lang = 'en-US';
  else if (lang === 'de') utterance.lang = 'de-DE';
  else if (lang === 'uk') utterance.lang = 'uk-UA';
  else utterance.lang = 'tr-TR';

  utterance.rate = 1.02;
  utterance.pitch = 1.04;

  const hudWave = document.getElementById('voiceWaveAnim');
  const hudStatus = document.getElementById('voiceHudStatusText');

  utterance.onstart = () => {
    isSpeaking = true;
    if (hudWave) hudWave.classList.add('speaking');
    if (hudStatus) {
      hudStatus.textContent = lang === 'pl' ? '🔊 Odpowiadam...' : (lang === 'en' ? '🔊 Speaking...' : '🔊 Yanıt veriliyor...');
    }
  };

  utterance.onend = () => {
    isSpeaking = false;
    if (hudWave) hudWave.classList.remove('speaking');
    if (hudStatus) {
      hudStatus.textContent = lang === 'pl' ? '🎙️ Gotowy do rozmowy' : (lang === 'en' ? '🎙️ Ready to listen' : '🎙️ Dinlemeye hazır');
    }
  };

  utterance.onerror = () => {
    isSpeaking = false;
    if (hudWave) hudWave.classList.remove('speaking');
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Executes interactive action associated with intent (e.g. apply promo, open VIP, scroll to booking).
 * @param {string} actionType
 * @param {Object} [meta]
 */
export function executeVoiceAction(actionType, meta = {}) {
  playSuccessChime();

  if (actionType === 'APPLY_PROMO') {
    const promoInput = document.getElementById('bPromoInput') || document.getElementById('promoCodeInput');
    const applyBtn = document.getElementById('btnApplyPromo') || document.getElementById('btnApplyPromoCode');
    if (promoInput) {
      promoInput.value = meta.coupon || 'HOSGELDIN15';
      if (applyBtn) applyBtn.click();
    }
    // Also scroll to booking
    const bookingSec = document.getElementById('bookingSection') || document.getElementById('b-step-1');
    if (bookingSec) bookingSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (actionType === 'GOTO_CALC' || actionType === 'GOTO_BOOKING') {
    const bookingSec = document.getElementById('bookingSection') || document.getElementById('b-step-1') || document.querySelector('.booking-section-wrapper');
    if (bookingSec) bookingSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (actionType === 'OPEN_VIP') {
    const vipModal = document.getElementById('vipConciergeModal');
    if (vipModal) openModal(vipModal);
  } else if (actionType === 'OPEN_CERT') {
    const certModal = document.getElementById('hygieneCertModal');
    if (certModal) openModal(certModal);
  } else if (actionType === 'OPEN_WHATSAPP') {
    window.open('https://wa.me/905466479004?text=Merhaba,%20RELAXAX%20hizmetleri%20hakkinda%20bilgi%20almak%20istiyorum.', '_blank');
  } else if (actionType === 'CHANGE_CITY') {
    if (typeof window.returnToCountrySelector === 'function') {
      window.returnToCountrySelector();
    } else {
      window.location.hash = '#city-map';
    }
  }
}

/**
 * Renders response message and dynamic action buttons into the Voice HUD.
 * @param {string} text
 * @param {string} [actionType]
 * @param {Object} [actionMeta]
 */
export function renderVoiceReply(text, actionType = '', actionMeta = {}) {
  const replyEl = document.getElementById('voiceHudReplyBox');
  const lang = STATE.language || 'tr';

  if (!replyEl) return;

  let actionHtml = '';
  if (actionType === 'APPLY_PROMO') {
    const btnText = lang === 'pl' ? '🎟️ Aktywuj Kod: WARSZAWA15' : (lang === 'en' ? '🎟️ Apply Code: WELCOME15' : '🎟️ %15 Kuponunu Uygula');
    actionHtml = `<div class="rx-vah-action-row"><button type="button" class="btn-voice-action-pill" id="btnVoiceActionApplyPromo">${btnText}</button></div>`;
  } else if (actionType === 'GOTO_CALC' || actionType === 'GOTO_BOOKING') {
    const btnText = lang === 'pl' ? '📅 Oblicz Cenę i Zarezerwuj' : (lang === 'en' ? '📅 Calculate & Book Online' : '📅 Fiyat Hesapla & Randevu Al');
    actionHtml = `<div class="rx-vah-action-row"><button type="button" class="btn-voice-action-pill" id="btnVoiceActionGoBooking">${btnText}</button></div>`;
  } else if (actionType === 'OPEN_VIP') {
    const btnText = lang === 'pl' ? '👑 Otwórz VIP Concierge' : (lang === 'en' ? '👑 Open VIP Concierge' : '👑 VIP Concierge Başvur');
    actionHtml = `<div class="rx-vah-action-row"><button type="button" class="btn-voice-action-pill" id="btnVoiceActionOpenVip">${btnText}</button></div>`;
  } else if (actionType === 'OPEN_CERT') {
    const btnText = lang === 'pl' ? '🏆 Zobacz 48-Pkt Certyfikat' : (lang === 'en' ? '🏆 View 48-Point Standard' : '🏆 48 Nokta Belgesini İncele');
    actionHtml = `<div class="rx-vah-action-row"><button type="button" class="btn-voice-action-pill" id="btnVoiceActionOpenCert">${btnText}</button></div>`;
  } else if (actionType === 'OPEN_WHATSAPP') {
    const btnText = lang === 'pl' ? '💬 Napisz na WhatsApp' : (lang === 'en' ? '💬 Chat on WhatsApp' : '💬 WhatsApp ile Danış');
    actionHtml = `<div class="rx-vah-action-row"><button type="button" class="btn-voice-action-pill" id="btnVoiceActionWhatsApp">${btnText}</button></div>`;
  }

  replyEl.innerHTML = `
    <div class="rx-vah-reply-text">${escapeHTML(text)}</div>
    ${actionHtml}
  `;

  // Attach dynamic button listeners
  const actBtn = replyEl.querySelector('.btn-voice-action-pill');
  if (actBtn) {
    actBtn.addEventListener('click', () => executeVoiceAction(actionType, actionMeta));
  }

  speakText(text);
}

/**
 * Handles topic button clicks inside Voice HUD.
 * @param {string} topicKey
 */
export function askVoiceTopic(topicKey) {
  playTickSound();
  const lang = STATE.language || 'tr';
  const dict = INTENT_RESPONSES[lang] || INTENT_RESPONSES.tr;
  const replyText = dict[topicKey] || dict.greeting;

  let actionType = '';
  if (topicKey === 'pricing') actionType = 'GOTO_CALC';
  else if (topicKey === 'promo') actionType = 'APPLY_PROMO';
  else if (topicKey === 'vip') actionType = 'OPEN_VIP';
  else if (topicKey === 'hygiene') actionType = 'OPEN_CERT';
  else if (topicKey === 'booking') actionType = 'GOTO_BOOKING';
  else if (topicKey === 'contact') actionType = 'OPEN_WHATSAPP';

  renderVoiceReply(replyText, actionType, { coupon: 'HOSGELDIN15' });
}

/**
 * Starts or stops live speech recognition via microphone.
 */
export function toggleSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById('btnVoiceMicListen');
  const speechBox = document.getElementById('voiceUserSpeechBox');
  const hudStatus = document.getElementById('voiceHudStatusText');
  const lang = STATE.language || 'tr';

  if (!SpeechRec) {
    const noSupportMsg = lang === 'pl' ? 'Twoja przeglądarka nie obsługuje mikrofonu. Możesz kliknąć poniższe tematy.' : 'Tarayıcınız ses tanımayı desteklemiyor. Lütfen butonları kullanınız.';
    renderVoiceReply(noSupportMsg);
    return;
  }

  if (isListening) {
    if (recognition) recognition.stop();
    isListening = false;
    if (micBtn) micBtn.classList.remove('listening');
    if (hudStatus) hudStatus.textContent = '🎙️ Dinlemeye hazır';
    return;
  }

  try {
    if (!recognition) {
      recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
    }

    if (lang === 'pl') recognition.lang = 'pl-PL';
    else if (lang === 'en') recognition.lang = 'en-US';
    else if (lang === 'de') recognition.lang = 'de-DE';
    else if (lang === 'uk') recognition.lang = 'uk-UA';
    else recognition.lang = 'tr-TR';

    recognition.onstart = () => {
      isListening = true;
      playTickSound();
      if (micBtn) micBtn.classList.add('listening');
      if (hudStatus) {
        hudStatus.textContent = lang === 'pl' ? '🔴 Słucham... Mów teraz' : (lang === 'en' ? '🔴 Listening... Speak now' : '🔴 Dinliyorum... Konuşun');
      }
      if (speechBox) {
        speechBox.style.display = 'block';
        speechBox.textContent = '...';
      }
    };

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');

      if (speechBox) {
        speechBox.textContent = `🗣️ "${transcript}"`;
      }

      if (e.results[0].isFinal) {
        isListening = false;
        if (micBtn) micBtn.classList.remove('listening');
        const decision = detectVoiceIntent(transcript);
        const dict = INTENT_RESPONSES[lang] || INTENT_RESPONSES.tr;
        const replyText = dict[decision.intent] || dict.fallback;
        renderVoiceReply(replyText, decision.action, { coupon: decision.coupon });
      }
    };

    recognition.onerror = (err) => {
      isListening = false;
      if (micBtn) micBtn.classList.remove('listening');
      if (hudStatus) hudStatus.textContent = '🎙️ Dinlemeye hazır';
    };

    recognition.onend = () => {
      isListening = false;
      if (micBtn) micBtn.classList.remove('listening');
      if (hudStatus && !isSpeaking) hudStatus.textContent = '🎙️ Dinlemeye hazır';
    };

    recognition.start();

  } catch (err) {
    isListening = false;
    if (micBtn) micBtn.classList.remove('listening');
  }
}

/**
 * Toggles Voice Consultation HUD open/closed.
 */
export function toggleVoiceAssistantHud() {
  const hud = document.getElementById('voiceAssistantHud');
  if (!hud) return;

  const isVisible = hud.style.display !== 'none';
  if (isVisible) {
    hud.style.display = 'none';
    if (isListening && recognition) recognition.stop();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } else {
    hud.style.display = 'block';
    playSuccessChime();
    const lang = STATE.language || 'tr';
    const dict = INTENT_RESPONSES[lang] || INTENT_RESPONSES.tr;
    renderVoiceReply(dict.greeting);
  }
}

/**
 * Initializes Voice Assistant Engine, DOM triggers, and Speech Recognition.
 */
export function initVoiceAssistantEngine() {
  const toggleBtn = document.getElementById('btnToggleVoiceAssistant');
  const closeBtn = document.getElementById('btnVoiceHudClose');
  const quickBtns = document.querySelectorAll('.btn-voice-quick-ask');
  const micBtn = document.getElementById('btnVoiceMicListen');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => toggleVoiceAssistantHud());
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => toggleVoiceAssistantHud());
  }

  if (micBtn) {
    micBtn.addEventListener('click', () => toggleSpeechRecognition());
  }

  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const topic = btn.getAttribute('data-topic');
      if (topic) askVoiceTopic(topic);
    });
  });

  window.toggleVoiceAssistantHud = toggleVoiceAssistantHud;
  window.toggleSpeechRecognition = toggleSpeechRecognition;
  window.askVoiceTopic = askVoiceTopic;
  window.speakText = speakText;
  window.executeVoiceAction = executeVoiceAction;
}

