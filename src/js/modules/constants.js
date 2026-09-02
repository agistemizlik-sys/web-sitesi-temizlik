/**
 * @fileoverview Central Application Constants & Configuration (Clean Code Standard)
 * Eliminates magic strings and numbers across the entire codebase.
 */

export const CONSTANTS = Object.freeze({
  STORAGE_KEYS: Object.freeze({
    USER_SESSION: 'relaxax_user_session',
    REGISTERED_USERS: 'relaxax_registered_users',
    REGISTERED_STAFF: 'relaxax_registered_staff',
    STAFF_JOBS: 'relaxax_staff_live_jobs',
    BOOKING_HISTORY: 'relaxax_booking_history',
    STAFF_APPLICANTS: 'relaxax_staff_applicants',
    CATALOG_PRODUCTS: 'relaxax_catalog_products',
    COUPONS: 'relaxax_coupons',
    AUTH_TOKEN: 'relaxax_auth_token',
    PREFERRED_LANG: 'relaxax_preferred_language',
    OFFLINE_QUEUE: 'relaxax_offline_leads_queue',
    BOOKINGS_PREFIX: 'relaxax_user_bookings_'
  }),

  API_ENDPOINTS: Object.freeze({
    PANEL_WEBHOOK_HTTPS: 'https://64.177.116.243/api/webhook/lead',
    PANEL_WEBHOOK_HTTP: 'http://64.177.116.243/api/webhook/lead',
    PANEL_SYNC_ALL: 'http://64.177.116.243/api/sync-all',
    ORDERS: '/api/orders',
    LEADS: '/api/leads',
    HEALTH: '/api/health',
    CONTACT: '/api/contact',
    AUTH: '/api/auth',
    AVAILABILITY: '/api/availability',
    QUOTE: '/api/quote',
    PROMO: '/api/promo',
    REVIEWS: '/api/reviews',
    SERVICES: '/api/services',
    CATALOG: '/api/catalog',
    STAFF: '/api/staff'
  }),

  ORDER_STATUS: Object.freeze({
    PENDING: 'Beklemede',
    APPROVED: 'Onaylandı',
    ON_THE_WAY: 'Yolda',
    IN_PROGRESS: 'Saha Görevinde',
    COMPLETED: 'Tamamlandı',
    CANCELLED: 'İptal Edildi'
  }),

  PANEL_STATUS: Object.freeze({
    PENDING_APPROVAL: 'pending_approval',
    WAITING_APPROVAL: 'WAITING_APPROVAL',
    APPROVED: 'approved',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed'
  }),

  LANGUAGES: Object.freeze({
    TR: 'tr',
    PL: 'pl',
    EN: 'en',
    DE: 'de'
  }),

  TIMEOUTS: Object.freeze({
    API_FETCH_MS: 4000,
    APPROVAL_POLL_MS: 2500,
    TOAST_DISPLAY_MS: 3000,
    DEBOUNCE_INPUT_MS: 250
  }),

  COMPANY_INFO: Object.freeze({
    NAME: 'RELAXAX',
    FULL_TITLE: 'RELAXAX Temizlik ve Medikal Hijyen Teknolojileri A.Ş.',
    PHONE_FORMATTED: '+90 546 647 90 04',
    PHONE_RAW: '905466479004',
    EMAIL: 'info@relaxax.com',
    WA_LINK: 'https://wa.me/905466479004'
  })
});
