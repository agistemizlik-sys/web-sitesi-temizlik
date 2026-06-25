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
      targetVideoY: 50
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
  marmara: { accent: '#3366ff', rgb: '51, 102, 255' },
  ege: { accent: '#ff9100', rgb: '255, 145, 0' },
  karadeniz: { accent: '#ff3366', rgb: '255, 51, 102' },
  mazowsze: { accent: '#ff3355', rgb: '255, 51, 85' }
};

export const CITY_TO_REGION = {
  Istanbul: 'marmara',
  Kocaeli: 'marmara',
  Sakarya: 'marmara',
  Izmir: 'ege',
  Balikesir: 'ege',
  Samsun: 'karadeniz',
  Warszawa: 'mazowsze'
};

export const CITY_NAMES_TR = {
  Istanbul: 'İSTANBUL',
  Kocaeli: 'KOCAELİ',
  Sakarya: 'SAKARYA',
  Izmir: 'İZMİR',
  Balikesir: 'BALIKESİR',
  Samsun: 'SAMSUN',
  Warszawa: 'WARSZAWA'
};

export const CITY_NAMES_TR_TITLE = {
  Istanbul: 'İstanbul',
  Kocaeli: 'Kocaeli',
  Sakarya: 'Sakarya',
  Izmir: 'İzmir',
  Balikesir: 'Balıkesir',
  Samsun: 'Samsun',
  Warszawa: 'Warszawa'
};
