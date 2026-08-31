/**
 * @fileoverview Robust Enterprise API Client (Clean Code & Clean Architecture)
 * Handles multi-tier resilient synchronization with 64.177.116.243 and Cloudflare Edge KV.
 */

import { CONSTANTS } from './constants.js';

/**
 * Safely parses JSON string with fallback.
 * @template T
 * @param {string|null} raw - Raw JSON string
 * @param {T} fallback - Default fallback value
 * @returns {T} Parsed object or fallback
 */
export function safeJsonParse(raw, fallback) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

/**
 * Safely saves data to localStorage.
 * @param {string} key - Storage key
 * @param {any} data - Data to serialize and store
 */
export function safeStorageSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[STORAGE_WRITE_WARN]', key, e);
  }
}

/**
 * Safely retrieves data from localStorage.
 * @template T
 * @param {string} key - Storage key
 * @param {T} fallback - Default fallback value
 * @returns {T} Retrieved data or fallback
 */
export function safeStorageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * Executes a resilient fetch with configurable timeout.
 * @param {string} url - Request URL
 * @param {RequestInit} [options] - Fetch options
 * @param {number} [timeoutMs] - Abort timeout in milliseconds
 * @returns {Promise<Response>}
 */
export async function timedFetch(url, options = {}, timeoutMs = CONSTANTS.TIMEOUTS.API_FETCH_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Dispatches a new lead/order to panel endpoints with multi-tier failover.
 * @param {Object} leadPayload - Normalized lead data
 * @returns {Promise<{success: boolean, endpoint?: string}>}
 */
export async function dispatchLeadToPanel(leadPayload) {
  const targets = [
    CONSTANTS.API_ENDPOINTS.PANEL_WEBHOOK_HTTPS,
    CONSTANTS.API_ENDPOINTS.PANEL_WEBHOOK_HTTP,
    CONSTANTS.API_ENDPOINTS.ORDERS,
    CONSTANTS.API_ENDPOINTS.LEADS
  ];

  const bodyStr = JSON.stringify(leadPayload);
  let delivered = false;

  for (const endpoint of targets) {
    try {
      const resp = await timedFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'hc_live_7x9f2m4a1v8'
        },
        body: bodyStr
      }, 3500);

      if (resp && resp.ok) {
        delivered = true;
        break;
      }
    } catch (err) {
      // Continue to next redundant tier
    }
  }

  // Backup to local offline queue
  const offlineQueue = safeStorageGet(CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE, []);
  offlineQueue.unshift({
    ...leadPayload,
    queuedAt: new Date().toISOString(),
    synced: delivered
  });
  safeStorageSet(CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE, offlineQueue.slice(0, 50));

  return { success: true, delivered };
}

/**
 * Polls for real-time live approval from server / panel.
 * @param {string} resCode - Reservation code (e.g. RLX-123456)
 * @returns {Promise<Object|null>} Approved job data or null
 */
export async function pollOrderApproval(resCode) {
  if (!resCode) return null;

  // 1. Check local staff jobs cache
  const localJobs = safeStorageGet(CONSTANTS.STORAGE_KEYS.STAFF_JOBS, []);
  const localMatch = localJobs.find(j => j && (j.id === resCode || j.orderCode === resCode || j.resCode === resCode));
  if (localMatch && (localMatch.status === CONSTANTS.ORDER_STATUS.APPROVED || localMatch.status === CONSTANTS.ORDER_STATUS.ON_THE_WAY || localMatch.status === CONSTANTS.ORDER_STATUS.COMPLETED)) {
    return localMatch;
  }

  // 2. Check Edge KV Orders API
  try {
    const res = await timedFetch(`${CONSTANTS.API_ENDPOINTS.ORDERS}?code=${encodeURIComponent(resCode)}`, {}, 2500);
    if (res && res.ok) {
      const data = await res.json();
      if (data && data.success && data.order) {
        const o = data.order;
        if (o.status === CONSTANTS.ORDER_STATUS.APPROVED || o.status === CONSTANTS.ORDER_STATUS.ON_THE_WAY || o.status === CONSTANTS.ORDER_STATUS.COMPLETED) {
          return o;
        }
      }
    }
  } catch (e) {}

  return null;
}
