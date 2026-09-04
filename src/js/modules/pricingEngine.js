/**
 * @fileoverview Transparent Pricing & Subscription Calculation Engine (Clean Code Module)
 * Implements strict financial formulas for base square meters, rooms/baths,
 * frequency subscription tiers, extras aggregation, and promo discounts.
 */

// Turkish & Polish Base Rates
export const RATES_TR = {
  roomBase: 450,
  bathBase: 250,
  minBase: 1450,
  smallKitchenDiscount: 10,
  villaMultiplier: 1.2,
  duplexAddon: 150,
  transferDiscountRate: 0.05
};

export const RATES_PL = {
  roomBase: 65,
  bathBase: 45,
  minBase: 189,
  smallKitchenDiscount: 5,
  villaMultiplier: 1.2,
  duplexAddon: 30,
  transferDiscountRate: 0.05
};

// Verified promotional discount codes
export const PROMO_CODES = {
  RELAX10: { rate: 0.10, desc: '%10 Hoş Geldin İndirimi' },
  RELAXAX10: { rate: 0.10, desc: '%10 Hoş Geldin İndirimi' },
  RELAX20: { rate: 0.20, desc: '%20 Özel Kampanya İndirimi' },
  RELAXAX20: { rate: 0.20, desc: '%20 VIP İndirim' },
  RELAXAXVIP: { rate: 0.20, desc: '%20 VIP İndirim' },
  HOSGELDIN15: { rate: 0.15, desc: '%15 Hoş Geldin İndirimi' },
  INDIRIM10: { rate: 0.10, desc: '%10 İndirim' },
  EMLAK10: { rate: 0.10, desc: '%10 Referans İndirimi' },
  TEMIZLIK20: { rate: 0.20, desc: '%20 Özel Kampanya İndirimi' },
  VIP25: { rate: 0.25, desc: '%25 VIP Müşteri İndirimi' },
  BAHAR15: { rate: 0.15, desc: '%15 Bahar Temizliği İndirimi' },
  WARSZAWA15: { rate: 0.15, desc: '15% Rabat na Start w Warszawie' },
  WARSZAWA10: { rate: 0.10, desc: '10% Rabat w Warszawie' },
  WARSZAWA20: { rate: 0.20, desc: '20% Rabat w Warszawie' },
  RABAT10: { rate: 0.10, desc: '10% Kod Rabatowy' },
  RABAT20: { rate: 0.20, desc: '20% Kod Rabatowy' }
};

/**
 * Calculates raw base price before frequency and promo discounts.
 */
export function calculateBasePrice({ rooms = 1, baths = 1, isSmallKitchen = false, isVilla = false, isDuplex = false, country = 'tr' }) {
  const rates = country === 'pl' ? RATES_PL : RATES_TR;
  let base = (rooms * rates.roomBase) + (baths * rates.bathBase);
  if (base < rates.minBase) base = rates.minBase;

  if (isSmallKitchen) base -= rates.smallKitchenDiscount;
  if (isVilla) base *= rates.villaMultiplier;
  if (isDuplex) base += rates.duplexAddon;

  return Math.round(base);
}

/**
 * Calculates frequency discount percentage and savings.
 */
export function getFrequencyDiscountRate(freq) {
  switch (freq) {
    case 'haftalik':
    case 'tydzien':
      return 0.20; // 20% OFF
    case 'ikahaftada':
    case '2tygodnie':
      return 0.15; // 15% OFF
    case 'aylik':
    case 'miesiac':
      return 0.10; // 10% OFF
    case 'tekseferlik':
    case 'jednorazowo':
    default:
      return 0.0;
  }
}

/**
 * Validates promotional coupon code.
 */
export function verifyPromoCode(code) {
  if (!code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  return PROMO_CODES[cleanCode] || null;
}
