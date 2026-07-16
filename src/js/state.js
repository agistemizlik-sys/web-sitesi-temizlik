// Global Application State (Single Source of Truth)
export const STATE = {
  selectedCity: null,
  selectedRegion: null,
  lenisInstance: null,
  language: 'tr',
  
  // Interactive Selection State
  calculator: {
    applied: false,
    serviceType: 'standart',
    area: 100,
    frequency: '1',
    extras: [],
    price: 1500
  },
  
  // Cinematic Scrubbing Interpolation States
  cinema: {
    activeIdx: -1,
    activeTextBlockIdx: -1,
    targetRadius: 120,
    currentRadius: 120,
    targetX: 50,
    currentX: 50,
    targetY: 50,
    currentY: 50,
    isScrubbing: false,
    sceneStates: Array.from({ length: 12 }, () => ({
      currentTime: 0,
      targetTime: 0,
      currentOpacity: 0,
      targetOpacity: 0,
      currentVideoY: 50, // default center
      targetVideoY: 50,
      currentVideoX: 50, // default center
      targetVideoX: 50
    })),
    introVideoState: {
      currentTime: 0,
      targetTime: 0,
      currentScale: 1.0,
      targetScale: 1.0,
      currentTranslateY: 0,
      targetTranslateY: 0,
      currentOpacity: 1.0,
      targetOpacity: 1.0
    },
    introTextState: {
      currentOffset: 0,
      targetOffset: 0,
      currentOpacity: 1.0,
      targetOpacity: 1.0
    }
  },

  // Ambient Portal Particles
  ambientParticles: []
};

// Regional styling and themes configuration
export const REGION_THEMES = {
  akdeniz: { accent: '#0d9488', rgb: '13, 148, 136' },
  marmara: { accent: '#2563eb', rgb: '37, 99, 235' },
  ege: { accent: '#d97706', rgb: '217, 119, 6' },
  karadeniz: { accent: '#dc2626', rgb: '220, 38, 38' },
  mazowsze: { accent: '#dc2626', rgb: '220, 38, 38' }
};

export const CITY_TO_REGION = {
  Istanbul: 'marmara',
  Kocaeli: 'marmara',
  Sakarya: 'marmara',
  Izmir: 'ege',
  Balikesir: 'ege',
  Samsun: 'karadeniz',
  Antalya: 'akdeniz',
  Warszawa: 'mazowsze',
  // Warsaw Districts
  Srodmiescie: 'mazowsze',
  Mokotow: 'mazowsze',
  Wola: 'mazowsze',
  Ursynow: 'mazowsze',
  Bemowo: 'mazowsze',
  Bialoleka: 'mazowsze',
  'Praga-Polnoc': 'mazowsze',
  'Praga-Poludnie': 'mazowsze',
  Targowek: 'mazowsze',
  Ochota: 'mazowsze',
  Zoliborz: 'mazowsze',
  Bielany: 'mazowsze',
  Ursus: 'mazowsze',
  Wlochy: 'mazowsze',
  Wilanow: 'mazowsze',
  Wawer: 'mazowsze',
  Rembertow: 'mazowsze',
  Wesola: 'mazowsze',
  // Warsaw Suburbs
  Zabki: 'mazowsze',
  Marki: 'mazowsze',
  Sulejowek: 'mazowsze',
  Jozefow: 'mazowsze',
  Pruszkow: 'mazowsze',
  Piastow: 'mazowsze',
  Piaseczno: 'mazowsze',
  'Konstancin-Jeziorna': 'mazowsze'
};

export const CITY_NAMES_TR = {
  Istanbul: 'İSTANBUL',
  Kocaeli: 'KOCAELİ',
  Sakarya: 'SAKARYA',
  Izmir: 'İZMİR',
  Balikesir: 'BALIKESİR',
  Samsun: 'SAMSUN',
  Antalya: 'ANTALYA',
  Warszawa: 'WARSZAWA'
};

export const CITY_NAMES_TR_TITLE = {
  Istanbul: 'İstanbul',
  Kocaeli: 'Kocaeli',
  Sakarya: 'Sakarya',
  Izmir: 'İzmir',
  Balikesir: 'Balıkesir',
  Samsun: 'Samsun',
  Antalya: 'Antalya',
  Warszawa: 'Warszawa'
};
