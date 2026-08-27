/**
 * @fileoverview RELAXAX Enterprise WebPush & Smart In-App Notification Engine
 * Manages push permission requests, Service Worker registration, and instant notifications.
 */

let swRegistration = null;

/**
 * Registers the Service Worker and checks push notification support.
 */
export async function initPushEngine() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (err) {}
}

/**
 * Requests browser push notification permission from the user.
 * @returns {Promise<boolean>} True if granted
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showLocalNotification(
        '🔔 Bildirimler Aktif!',
        'Temizlik randevularınız ve VIP fırsatlar hakkında anlık bildirimler alacaksınız.'
      );
      return true;
    }
  } catch (e) {}

  return false;
}

/**
 * Dispatches a local rich notification via ServiceWorker or Notification API.
 * @param {string} title - Notification title
 * @param {string} body - Body text
 * @param {string} [url] - Target click URL
 */
export function showLocalNotification(title, body, url = '/') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  if (swRegistration && 'showNotification' in swRegistration) {
    swRegistration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [80, 40, 80],
      data: { url }
    });
  } else {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.svg'
      });
    } catch (e) {}
  }
}
