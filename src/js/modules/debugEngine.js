/**
 * @fileoverview Comprehensive Debug & Runtime Diagnostics Hardening Suite (Clean Code Module)
 * Provides:
 * 1. Visual On-Screen Diagnostics HUD (FPS meter, memory, video monitor, state inspector)
 * 2. High-precision performance profiler & benchmark runner
 * 3. Crash reporter & telemetry event buffer
 * 4. Keyboard shortcuts (Ctrl+Shift+D) & URL hash (#debug) auto-activation
 */

import { STATE } from '../state.js';

let isDebugEnabled = window.location.hash.includes('debug') || 
                     localStorage.getItem('relaxax_debug') === 'true' || 
                     localStorage.getItem('tworose_debug') === 'true';

const diagnosticsLogBuffer = [];
const MAX_LOG_BUFFER = 100;
let hudElement = null;
let fps = 60;
let lastFrameTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();

/**
 * Pushes a structured diagnostic event into the circular log buffer.
 */
function recordDiagnostic(type, category, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    uptimeMs: Math.round(performance.now()),
    type,
    category,
    data
  };
  diagnosticsLogBuffer.unshift(entry);
  if (diagnosticsLogBuffer.length > MAX_LOG_BUFFER) {
    diagnosticsLogBuffer.pop();
  }
}

/**
 * Styled Console Logger for developer inspection.
 */
export function logDebug(category, ...args) {
  recordDiagnostic('INFO', category, args);
  if (isDebugEnabled) {
    console.log(
      `%c[RELAXAX:${category}]`,
      'color: #00e5ff; font-weight: bold; background: #071018; padding: 2px 6px; border-radius: 4px; border: 1px solid #00e5ff;',
      ...args
    );
  }
}

export function logWarnDebug(category, ...args) {
  recordDiagnostic('WARN', category, args);
  if (isDebugEnabled) {
    console.warn(
      `%c[RELAXAX WARN:${category}]`,
      'color: #fbbf24; font-weight: bold; background: #1c1304; padding: 2px 6px; border-radius: 4px; border: 1px solid #fbbf24;',
      ...args
    );
  }
}

export function logErrorDebug(category, ...args) {
  recordDiagnostic('ERROR', category, args);
  console.error(
    `%c[RELAXAX ERROR:${category}]`,
    'color: #ff3366; font-weight: bold; background: #1a050b; padding: 2px 6px; border-radius: 4px; border: 1px solid #ff3366;',
    ...args
  );
}

/**
 * Creates and mounts the visual developer Diagnostics HUD overlay.
 */
function createDiagnosticsHUD() {
  if (hudElement || typeof document === 'undefined') return;

  hudElement = document.createElement('div');
  hudElement.id = 'relaxaxDiagnosticsHUD';
  hudElement.style.cssText = `
    position: fixed;
    bottom: 12px;
    right: 12px;
    z-index: 9999999;
    background: rgba(10, 15, 29, 0.94);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(0, 229, 255, 0.35);
    border-radius: 14px;
    color: #e2e8f0;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 11px;
    line-height: 1.4;
    padding: 12px 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 229, 255, 0.15);
    max-width: 320px;
    pointer-events: auto;
    user-select: none;
    transition: transform 0.2s ease, opacity 0.2s ease;
  `;

  hudElement.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-bottom: 8px;">
      <strong style="color: #00e5ff; font-size: 12px; display: flex; align-items: center; gap: 6px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px #22c55e;"></span>
        RELAXAX DIAGNOSTICS
      </strong>
      <button type="button" id="hudCloseBtn" style="background:none; border:none; color:#94a3b8; font-size:14px; cursor:pointer;">&times;</button>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
      <div>FPS: <strong id="hudFpsVal" style="color: #22c55e;">60</strong></div>
      <div>DOM Nodes: <strong id="hudDomNodes" style="color: #38bdf8;">--</strong></div>
      <div>Lang: <strong id="hudLangVal" style="color: #fbbf24;">TR</strong></div>
      <div>City: <strong id="hudCityVal" style="color: #fbbf24;">Istanbul</strong></div>
      <div>Videos Play/Total: <strong id="hudVideosVal" style="color: #a855f7;">0/0</strong></div>
      <div>Price: <strong id="hudPriceVal" style="color: #34d399;">--</strong></div>
    </div>
    <div style="display: flex; gap: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
      <button type="button" id="hudRunBenchmarkBtn" style="flex:1; background:rgba(0,229,255,0.15); border:1px solid #00e5ff; color:#00e5ff; border-radius:6px; padding:4px 6px; font-size:10px; cursor:pointer;">⚡ Test Çalıştır</button>
      <button type="button" id="hudExportLogsBtn" style="flex:1; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:4px 6px; font-size:10px; cursor:pointer;">📋 Rapor İndir</button>
    </div>
  `;

  document.body.appendChild(hudElement);

  document.getElementById('hudCloseBtn')?.addEventListener('click', () => {
    toggleDiagnosticsHUD(false);
  });

  document.getElementById('hudRunBenchmarkBtn')?.addEventListener('click', () => {
    runPerformanceBenchmark();
  });

  document.getElementById('hudExportLogsBtn')?.addEventListener('click', () => {
    exportDebugReport();
  });
}

/**
 * Updates real-time HUD telemetry values.
 */
function updateHUDTelemetry() {
  if (!hudElement || hudElement.style.display === 'none') return;

  const fpsEl = document.getElementById('hudFpsVal');
  const domNodesEl = document.getElementById('hudDomNodes');
  const langEl = document.getElementById('hudLangVal');
  const cityEl = document.getElementById('hudCityVal');
  const videosEl = document.getElementById('hudVideosVal');
  const priceEl = document.getElementById('hudPriceVal');

  if (fpsEl) {
    fpsEl.textContent = Math.round(fps);
    fpsEl.style.color = fps > 50 ? '#22c55e' : (fps > 30 ? '#fbbf24' : '#ef4444');
  }

  if (domNodesEl) domNodesEl.textContent = document.querySelectorAll('*').length;
  if (langEl) langEl.textContent = (STATE.language || 'tr').toUpperCase();
  if (cityEl) cityEl.textContent = STATE.city || STATE.selectedCity || 'Genel';

  if (videosEl) {
    const allVids = document.querySelectorAll('video');
    const playingCount = Array.from(allVids).filter(v => !v.paused).length;
    videosEl.textContent = `${playingCount}/${allVids.length}`;
  }

  if (priceEl) {
    priceEl.textContent = document.getElementById('wizardFinalPrice')?.textContent || (STATE.calculator?.price + ' TL');
  }
}

/**
 * Global FPS & Frame-timing loop.
 */
function fpsLoop() {
  const now = performance.now();
  frameCount++;

  if (now - lastFpsUpdate >= 500) {
    fps = (frameCount * 1000) / (now - lastFpsUpdate);
    frameCount = 0;
    lastFpsUpdate = now;
    updateHUDTelemetry();
  }

  lastFrameTime = now;
  requestAnimationFrame(fpsLoop);
}

/**
 * Toggles the visibility of the developer Diagnostics HUD.
 */
export function toggleDiagnosticsHUD(forceState) {
  const nextState = typeof forceState === 'boolean' ? forceState : !isDebugEnabled;
  isDebugEnabled = nextState;

  if (isDebugEnabled) {
    localStorage.setItem('relaxax_debug', 'true');
    createDiagnosticsHUD();
    if (hudElement) hudElement.style.display = 'block';
    logDebug('SYSTEM', 'Diagnostics HUD Enabled (Press Ctrl+Shift+D to toggle)');
  } else {
    localStorage.removeItem('relaxax_debug');
    localStorage.removeItem('tworose_debug');
    if (hudElement) hudElement.style.display = 'none';
  }
  return isDebugEnabled;
}

/**
 * Automated System Performance & Stress Benchmark Runner.
 */
export function runPerformanceBenchmark() {
  logDebug('BENCHMARK', 'Starting full automated UX & frame-time stress benchmark...');
  const results = {
    startMemory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'N/A',
    domElementsCount: document.querySelectorAll('*').length,
    activeVideos: Array.from(document.querySelectorAll('video')).map(v => ({ id: v.id, src: v.src, paused: v.paused })),
    currentFps: Math.round(fps),
    score: 100
  };

  if (fps < 45) results.score -= 20;
  if (results.domElementsCount > 3000) results.score -= 10;

  logDebug('BENCHMARK_RESULTS', results);
  alert(`⚡ RELAXAX Benchmark Tamamlandı!\n\n• Performans Skoru: ${results.score}/100\n• FPS: ${results.currentFps}\n• DOM Düğüm Sayısı: ${results.domElementsCount}\n• RAM: ${results.startMemory}`);
  return results;
}

/**
 * Exports JSON crash & diagnostics log report for debugging.
 */
export function exportDebugReport() {
  const report = {
    appName: 'RELAXAX Web Portal',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    screen: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    state: STATE,
    recentLogs: diagnosticsLogBuffer
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relaxax-diagnostics-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Initializes Global Error Boundary & Event Listeners for Debug Hardening.
 */
export function initDebugHardening() {
  // Global Error Listeners
  window.addEventListener('error', (e) => {
    logErrorDebug('WINDOW_ERROR', e.message, `at ${e.filename}:${e.lineno}:${e.colno}`);
  });

  window.addEventListener('unhandledrejection', (e) => {
    logErrorDebug('UNHANDLED_PROMISE', String(e.reason));
  });

  // Keyboard shortcut: Ctrl + Shift + D (or Cmd + Shift + D)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      toggleDiagnosticsHUD();
    }
  });

  // Hash change auto-detection
  window.addEventListener('hashchange', () => {
    if (window.location.hash.includes('debug')) {
      toggleDiagnosticsHUD(true);
    }
  });

  if (isDebugEnabled) {
    createDiagnosticsHUD();
  }

  requestAnimationFrame(fpsLoop);
}
