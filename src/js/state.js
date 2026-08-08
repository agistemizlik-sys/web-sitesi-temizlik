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
    price: 1500,
    promoCode: null,
    discountRate: 0
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
  akdeniz: { accent: '#06b6d4', rgb: '6, 182, 212' },
  marmara: { accent: '#2563eb', rgb: '37, 99, 235' },
  ege: { accent: '#d97706', rgb: '217, 119, 6' },
  karadeniz: { accent: '#dc2626', rgb: '220, 38, 38' },
  icanadolu: { accent: '#8b5cf6', rgb: '139, 92, 246' },
  guneydogu: { accent: '#f59e0b', rgb: '245, 158, 11' },
  dogu: { accent: '#6366f1', rgb: '99, 102, 241' },
  mazowsze: { accent: '#dc2626', rgb: '220, 38, 38' }
};

export const CITY_TO_REGION = {
  Istanbul: 'marmara',
  Kocaeli: 'marmara',
  Sakarya: 'marmara',
  Bursa: 'marmara',
  Izmir: 'ege',
  Balikesir: 'ege',
  Bodrum: 'ege',
  Denizli: 'ege',
  Samsun: 'karadeniz',
  Trabzon: 'karadeniz',
  Antalya: 'akdeniz',
  Adana: 'akdeniz',
  Mersin: 'akdeniz',
  Ankara: 'icanadolu',
  Konya: 'icanadolu',
  Eskisehir: 'icanadolu',
  Kayseri: 'icanadolu',
  Gaziantep: 'guneydogu',
  Diyarbakir: 'guneydogu',
  Erzurum: 'dogu',
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
  Bursa: 'BURSA',
  Izmir: 'İZMİR',
  Balikesir: 'BALIKESİR',
  Bodrum: 'BODRUM',
  Denizli: 'DENİZLİ',
  Samsun: 'SAMSUN',
  Trabzon: 'TRABZON',
  Antalya: 'ANTALYA',
  Adana: 'ADANA',
  Mersin: 'MERSİN',
  Ankara: 'ANKARA',
  Konya: 'KONYA',
  Eskisehir: 'ESKİŞEHİR',
  Kayseri: 'KAYSERİ',
  Gaziantep: 'GAZİANTEP',
  Diyarbakir: 'DİYARBAKIR',
  Erzurum: 'ERZURUM',
  Warszawa: 'WARSZAWA'
};

export const CITY_NAMES_TR_TITLE = {
  Istanbul: 'İstanbul',
  Kocaeli: 'Kocaeli',
  Sakarya: 'Sakarya',
  Bursa: 'Bursa',
  Izmir: 'İzmir',
  Balikesir: 'Balıkesir',
  Bodrum: 'Bodrum',
  Denizli: 'Denizli',
  Samsun: 'Samsun',
  Trabzon: 'Trabzon',
  Antalya: 'Antalya',
  Adana: 'Adana',
  Mersin: 'Mersin',
  Ankara: 'Ankara',
  Konya: 'Konya',
  Eskisehir: 'Eskişehir',
  Kayseri: 'Kayseri',
  Gaziantep: 'Gaziantep',
  Diyarbakir: 'Diyarbakır',
  Erzurum: 'Erzurum',
  Warszawa: 'Warszawa'
};
