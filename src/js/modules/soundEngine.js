/**
 * @fileoverview Web Audio Synthesizer & Sound Engine (Clean Code Module)
 * Synthesizes subtle micro-ticks, harmonic success chimes, and rose petal sounds
 * without external asset loading dependencies.
 */

let audioCtx = null;
let soundEnabled = true;

/**
 * Initializes and unlocks Web Audio context on user gesture.
 * @returns {AudioContext|null}
 */
export function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Triggers subtle device haptic vibration on touch-enabled devices.
 * @param {number|number[]} pattern - Vibration pattern in milliseconds.
 */
export function triggerHaptic(pattern = 12) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch (e) {}
}

/**
 * Plays a luxury harmonic cash register "Cha-Ching" synthesizer chord for order completions.
 */
export function playCashRegisterChime() {
  triggerHaptic([30, 80, 40]);
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const freqs = [987.77, 1318.51, 1567.98, 2093.00];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
      gain.gain.setValueAtTime(0.045, ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.05 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.05);
      osc.stop(ctx.currentTime + idx * 0.05 + 0.45);
    });
  } catch (e) {}
}

/**
 * Plays an alert tone for security quarantine and threat radar.
 */
export function playAlertChime() {
  triggerHaptic([50, 50]);
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

/**
 * Plays an ultra-subtle mechanical tick micro-interaction sound (800Hz gentle sine) + haptic pulse.
 */
export function playTickSound() {
  triggerHaptic(10);
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {}
}

/**
 * Plays a luxury harmonic success chime chord (C5 - E5 - G5 - C6) + celebratory haptic feedback.
 */
export function playSuccessChime() {
  triggerHaptic([20, 60, 25]);
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.6);
    });
  } catch (e) {}
}

/**
 * Toggles sound mute state and updates UI indicator button.
 * @returns {boolean} New soundEnabled state.
 */
export function toggleSound() {
  soundEnabled = !soundEnabled;
  const toggleBtns = document.querySelectorAll('.wizard-sound-toggle-btn, #wizardSoundToggleBtn');
  toggleBtns.forEach(btn => {
    const icon = btn.querySelector('.sound-icon');
    const txt = btn.querySelector('.sound-text');
    if (icon) icon.textContent = soundEnabled ? '🔊' : '🔇';
    if (txt) txt.textContent = soundEnabled ? 'Ses: Açık' : 'Ses: Kapalı';
  });
  return soundEnabled;
}

/**
 * Checks if sound effects are enabled.
 * @returns {boolean}
 */
export function isSoundEnabled() {
  return soundEnabled;
}

if (typeof window !== 'undefined') {
  window.toggleSound = toggleSound;
  window.isSoundEnabled = isSoundEnabled;
  window.playCashRegisterChime = playCashRegisterChime;
  window.playAlertChime = playAlertChime;
  window.playSuccessChime = playSuccessChime;
  window.playTickSound = playTickSound;
}
