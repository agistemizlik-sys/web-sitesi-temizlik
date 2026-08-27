/**
 * @fileoverview RELAXAX Enterprise Interactive Voice & Consultation Assistant
 * Features:
 * 1. 🎙️ Web Speech API Natural Voice Synthesis & Guided Consultation
 * 2. ⚡ Real-Time Price Inquiries & Instant FAQ Answers
 * 3. 🌐 Multilingual Voice Prompts (TR, EN, PL, DE)
 * 4. 🎛️ Interactive Glassmorphic Voice Wave HUD
 */

import { STATE } from '../state.js';
import { playTickSound, playSuccessChime } from './soundEngine.js';

let isListening = false;
let isSpeaking = false;
let recognition = null;

const VOICE_RESPONSES = {
  tr: {
    greeting: "Merhaba! RELAXAX Premium Temizlik Merkezine hoş geldiniz. Size nasıl yardımcı olabilirim?",
    pricing: "Standart 2+1 ev temizliğimiz 1.850 TL'den, 3+1 detaylı temizliğimiz ise 2.450 TL'den başlamaktadır. Sıklık seçiminize göre %25'e varan indirim kazanabilirsiniz.",
    hygiene: "Tüm operasyonlarımızda Kärcher 150 derece buharlı dezenfeksiyon, medikal standartlar ve 48 nokta ISO-9001 onaylı dijital hijyen sertifikası sunuyoruz.",
    vip: "Black & Gold VIP Concierge hizmetimizle evinize özel kıdemli housekeeper tahsis edilir ve 2 saat içinde ekspres sevk sağlanır.",
    promo: "İlk siparişinize özel %15 indirim kuponunuz: HOSGELDIN15. Kuponunuzu rezervasyon adımında kullanabilirsiniz."
  },
  en: {
    greeting: "Hello! Welcome to RELAXAX Premium Housekeeping. How can I assist you today?",
    pricing: "Our standard 2-bedroom home cleaning starts from 1.850 TL (or 189 PLN in Warsaw), and 3-bedroom deep cleaning starts from 2.450 TL (249 PLN) with up to 25% recurring discounts.",
    hygiene: "We provide 48-point ISO-9001 certified medical-grade 150°C steam disinfection for all spaces.",
    vip: "Our VIP Concierge provides a dedicated private butler and 2-hour express dispatch for luxury residences.",
    promo: "Your exclusive 15% discount code for your first booking is: WELCOME15."
  },
  pl: {
    greeting: "Dzień dobry! Witamy w RELAXAX Warszawa. W czym mogę pomóc?",
    pricing: "Sprzątanie mieszkania 2-pokojowego od 189 zł, a 3-pokojowego z myciem okien od 249 zł ze zniżką do 25%.",
    hygiene: "Zapewniamy 48-punktowy certyfikowany medyczny standard czystości i dezynfekcję parową 150°C.",
    vip: "Usługa VIP Concierge oferuje dedykowanego asystenta oraz ekspresowy dojazd w 2 godziny w Warszawie.",
    promo: "Twój kod rabatowy 15% na pierwsze sprzątanie to: WITAJ15."
  }
};

/**
 * Speaks a given text using browser SpeechSynthesis with natural voice tuning.
 */
export function speakText(text) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const lang = STATE.language || 'tr';
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'pl' ? 'pl-PL' : (lang === 'en' ? 'en-US' : (lang === 'de' ? 'de-DE' : 'tr-TR'));
  utterance.rate = 1.0;
  utterance.pitch = 1.05;

  const hudWave = document.getElementById('voiceWaveAnim');
  const hudStatus = document.getElementById('voiceHudStatusText');

  utterance.onstart = () => {
    isSpeaking = true;
    if (hudWave) hudWave.classList.add('speaking');
    if (hudStatus) hudStatus.textContent = '🔊 Yanıt veriliyor...';
  };

  utterance.onend = () => {
    isSpeaking = false;
    if (hudWave) hudWave.classList.remove('speaking');
    if (hudStatus) hudStatus.textContent = '🎙️ Dinlemeye hazır';
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Handles automated quick-question cards in the Voice HUD.
 */
export function askVoiceTopic(topicKey) {
  playTickSound();
  const lang = STATE.language || 'tr';
  const dict = VOICE_RESPONSES[lang] || VOICE_RESPONSES.tr;
  const reply = dict[topicKey] || dict.greeting;

  const replyEl = document.getElementById('voiceHudReplyBox');
  if (replyEl) {
    replyEl.textContent = reply;
    replyEl.style.display = 'block';
  }

  speakText(reply);
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
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } else {
    hud.style.display = 'block';
    playSuccessChime();
    const lang = STATE.language || 'tr';
    const dict = VOICE_RESPONSES[lang] || VOICE_RESPONSES.tr;
    const replyEl = document.getElementById('voiceHudReplyBox');
    if (replyEl) replyEl.textContent = dict.greeting;
    speakText(dict.greeting);
  }
}

/**
 * Initializes the Voice Assistant Engine & speech triggers.
 */
export function initVoiceAssistantEngine() {
  const toggleBtn = document.getElementById('btnToggleVoiceAssistant');
  const closeBtn = document.getElementById('btnVoiceHudClose');
  const quickBtns = document.querySelectorAll('.btn-voice-quick-ask');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => toggleVoiceAssistantHud());
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => toggleVoiceAssistantHud());
  }

  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const topic = btn.getAttribute('data-topic');
      if (topic) askVoiceTopic(topic);
    });
  });

  window.toggleVoiceAssistantHud = toggleVoiceAssistantHud;
  window.askVoiceTopic = askVoiceTopic;
  window.speakText = speakText;
}
