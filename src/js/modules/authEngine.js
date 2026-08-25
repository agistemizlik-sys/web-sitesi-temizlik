/**
 * @fileoverview User & Staff Authentication & Profile Engine (Müşteri & Çalışan Hesapları)
 * Handles customer & staff registration, login, job dispatching, earnings tracking and booking integration.
 */

import { STATE } from '../state.js';
import { escapeHTML, sanitizeInputVal } from './domUtils.js';

const STORAGE_USERS_KEY = 'relaxax_registered_users';
const STORAGE_STAFF_KEY = 'relaxax_registered_staff';
const STORAGE_SESSION_KEY = 'relaxax_user_session';
const STORAGE_BOOKINGS_PREFIX = 'relaxax_user_bookings_';
const STORAGE_JOBS_KEY = 'relaxax_staff_live_jobs';
const STORAGE_CATALOG_KEY = 'relaxax_catalog_products';

// Default Product & Extra Services Catalog (Residential & Corporate)
const DEFAULT_CATALOG_ITEMS = [
  {
    id: 'butik_hediye_kutusu',
    key: 'butik_hediye_kutusu',
    title: 'Rose Elegance Butik Çiçek & Hediye Kutusu',
    category: 'boutique',
    categoryLabel: '🛍️ Butik Hediyelik',
    priceTR: 490,
    oldPriceTR: 650,
    pricePL: 59,
    status: 'in_stock',
    image: '/images/product_rose_gift_box.webp',
    icon: '🌹',
    desc: '5 Parça Özel Tasarım Set, pencereli beyaz lüks hediye kutusu ve altın varak işleme.'
  },
  {
    id: 'sakayik_buket_kutusu',
    key: 'sakayik_buket_kutusu',
    title: 'Peony Deluxe Şakayık & Hediye Buket Kutusu',
    category: 'boutique',
    categoryLabel: '🛍️ Butik Hediyelik',
    priceTR: 590,
    oldPriceTR: 750,
    pricePL: 69,
    status: 'in_stock',
    image: '/images/product_peony_bouquet_box.webp',
    icon: '🌸',
    desc: 'Pembe silindir şapka kutusunda el yapımı şakayık & gül aranjmanı, saten kurdeleli özel tebrik/doğum günü sunumu.'
  },
  {
    id: 'cephe_cam',
    key: 'cephe_cam',
    title: 'Dış Cephe & Yüksek Cam Silimi (Teleskopik/Sepetli)',
    category: 'corporate',
    categoryLabel: '🏢 Kurumsal / Plaza',
    priceTR: 1400,
    oldPriceTR: 1800,
    pricePL: 169,
    status: 'in_stock',
    icon: '🏢',
    desc: 'Yüksek katlı plaza ve iş merkezleri için teleskopik ve sepetli dış cephe cam temizliği.'
  },
  {
    id: 'server_it',
    key: 'server_it',
    title: 'Sunucu Odası & IT / PC Antistatik Temizlik',
    category: 'corporate',
    categoryLabel: '🏢 Kurumsal / IT',
    priceTR: 850,
    oldPriceTR: 1100,
    pricePL: 99,
    status: 'in_stock',
    icon: '🖥️',
    desc: 'Statik elektrik arındırıcı ve ESD uyumlu ekipmanlarla sunucu kabinleri ve ofis PC temizliği.'
  },
  {
    id: 'ulv_dezenfeksiyon',
    key: 'ulv_dezenfeksiyon',
    title: 'Tıbbi Seviye ULV Sisleme & Ozon Ortam Dezenfeksiyonu',
    category: 'corporate',
    categoryLabel: '🏢 Kurumsal / Sağlık',
    priceTR: 950,
    oldPriceTR: 1300,
    pricePL: 119,
    status: 'in_stock',
    icon: '🦠',
    desc: 'Soğuk sisleme ULV cihazlarıyla bakteri ve virüslere karşı %99.9 tam ortam sterilizasyonu.'
  },
  {
    id: 'ofis_mutfak',
    key: 'ofis_mutfak',
    title: 'Endüstriyel Kahve & Çay Makineleri Hijyen Kürü',
    category: 'corporate',
    categoryLabel: '🏢 Kurumsal / Ofis',
    priceTR: 600,
    oldPriceTR: 800,
    pricePL: 75,
    status: 'in_stock',
    icon: '☕',
    desc: 'Ofis tipi espresso ve çay kazanlarının kireçten arındırılması ve gıda güvenli hijyen bakımı.'
  },
  {
    id: 'ofis_koltuk',
    key: 'ofis_koltuk',
    title: 'Makam & Toplantı Koltukları Buharlı Yıkama',
    category: 'corporate',
    categoryLabel: '🏢 Kurumsal / Ofis',
    priceTR: 800,
    oldPriceTR: 1100,
    pricePL: 99,
    status: 'in_stock',
    icon: '🪑',
    desc: 'Yönetici makam koltukları ve toplantı masası sandalyelerinin derin ekstraksiyon yıkaması.'
  },
  {
    id: 'ofis_hali',
    key: 'ofis_hali',
    title: 'Endüstriyel Karo Halı Döner Fırçalı Şampuanlama',
    category: 'corporate',
    categoryLabel: '🏢 Kurumsal / Plaza',
    priceTR: 1200,
    oldPriceTR: 1600,
    pricePL: 149,
    status: 'in_stock',
    icon: '🧽',
    desc: 'Ağır ofis trafiğine maruz kalan karo halıların yerinde döner fırçalı derin yıkaması.'
  },
  {
    id: 'jaluzi_seperator',
    key: 'jaluzi_seperator',
    title: 'Ofis Akustik Panel, Seperatör & Jaluzi Temizliği',
    category: 'corporate',
    categoryLabel: '🏢 Kurumsal / Ofis',
    priceTR: 550,
    oldPriceTR: 750,
    pricePL: 69,
    status: 'in_stock',
    icon: '🚪',
    desc: 'Masa seperatörleri, akustik keçe paneller ve alüminyum/ahşap jaluzilerin tozsuzlaştırılması.'
  },
  {
    id: 'zemin_cila',
    key: 'zemin_cila',
    title: 'Mermer / Epoksi Zemin Cila & Kristalize Parlatma',
    category: 'corporate',
    categoryLabel: '🏢 Kurumsal / Plaza',
    priceTR: 1600,
    oldPriceTR: 2200,
    pricePL: 199,
    status: 'in_stock',
    icon: '🪵',
    desc: 'Yüksek devirli cila makinesi ile kristalize mermer ve epoksi zemin parlatma.'
  },
  {
    id: 'arsiv_temizlik',
    key: 'arsiv_temizlik',
    title: 'Gizlilik Protokollü Arşiv & Dosya Alanı Temizliği',
    category: 'corporate',
    categoryLabel: '🏢 Kurumsal / Ofis',
    priceTR: 750,
    oldPriceTR: 950,
    pricePL: 89,
    status: 'in_stock',
    icon: '🗑️',
    desc: 'Gizlilik sözleşmeli personel ile evrak imha sonrası ve dosya arşiv odası detaylı temizliği.'
  },
  {
    id: 'wc_asidik',
    key: 'wc_asidik',
    title: 'Çoklu Personel W/C Asidik Kireç & Bakteri Kürü',
    category: 'corporate',
    categoryLabel: '🏢 Kurumsal / Ofis',
    priceTR: 700,
    oldPriceTR: 950,
    pricePL: 85,
    status: 'in_stock',
    icon: '🚽',
    desc: 'Yoğun kullanılan kurumsal tuvalet ve lavaboların profesyonel asidik bakteri arındırma kürü.'
  },
  {
    id: 'firin',
    key: 'firin',
    title: 'Fırın İçi Yağ Çözücü Temizlik',
    category: 'extra_cleaning',
    categoryLabel: '✨ Ek Temizlik',
    priceTR: 450,
    oldPriceTR: 550,
    pricePL: 59,
    status: 'in_stock',
    icon: '🍳',
    desc: 'Kärcher buharlı ve organik yağ çözücüyle fırın içi derin hijyen bakımı.'
  },
  {
    id: 'buzdolabi',
    key: 'buzdolabi',
    title: 'Buzdolabı İçi Hijyen & Koku Giderme',
    category: 'extra_cleaning',
    categoryLabel: '✨ Ek Temizlik',
    priceTR: 450,
    oldPriceTR: 550,
    pricePL: 55,
    status: 'in_stock',
    icon: '🧊',
    desc: 'Buzdolabı raflarının sökülüp dezenfekte edilmesi ve ozon/karbon koku arındırma.'
  },
  {
    id: 'mutfak_dolabi',
    key: 'mutfak_dolabi',
    title: 'Mutfak Dolapları İçi Temizlik',
    category: 'extra_cleaning',
    categoryLabel: '✨ Ek Temizlik',
    priceTR: 650,
    oldPriceTR: 800,
    pricePL: 75,
    status: 'in_stock',
    icon: '🗄️',
    desc: 'Tüm mutfak dolaplarının içinin boşaltılıp silinmesi ve düzenlenmesi.'
  },
  {
    id: 'davlumbaz',
    key: 'davlumbaz',
    title: 'Davlumbaz & Filtre Yağ Arındırma',
    category: 'extra_cleaning',
    categoryLabel: '✨ Ek Temizlik',
    priceTR: 450,
    oldPriceTR: 550,
    pricePL: 49,
    status: 'in_stock',
    icon: '🛢️',
    desc: 'Metal filtrelerin ultrasonik sıcak su banyosuyla yağdan arındırılması.'
  },
  {
    id: 'koltuk_yikama',
    key: 'koltuk_yikama',
    title: 'Koltuk & Kanepe Buharlı Yıkama',
    category: 'vip_care',
    categoryLabel: '💎 VIP Hizmet',
    priceTR: 850,
    oldPriceTR: 1100,
    pricePL: 119,
    status: 'in_stock',
    icon: '🛋️',
    desc: 'Vakum ekstraksiyon ve buhar teknolojisiyle kumaş içi leke ve akar arındırma.'
  },
  {
    id: 'pencere',
    key: 'pencere',
    title: 'Pencere & Çerçeve Silimi',
    category: 'extra_cleaning',
    categoryLabel: '✨ Ek Temizlik',
    priceTR: 400,
    oldPriceTR: 500,
    pricePL: 49,
    status: 'in_stock',
    icon: '🪟',
    desc: 'Pencere camları, çerçeve ve rayların özel mikrofiber ve buharla parlatılması.'
  }
];

// Default pre-seeded demo staff accounts for instant testing
const DEFAULT_DEMO_STAFF = [
  {
    id: 'staff_ayse_01',
    role: 'staff',
    name: 'Ayşe K. (Kıdemli Temizlik Uzmanı)',
    email: 'uzman@relaxax.com',
    phone: '0532 999 88 77',
    password: '123456',
    city: 'Istanbul',
    district: 'Kadıköy, Beşiktaş, Üsküdar',
    experience: '6 Yıl',
    rating: '4.98',
    completedJobs: 142,
    todayEarnings: 2450,
    isAvailable: true,
    specialties: ['Detaylı Ev Temizliği', 'Buharlı Koltuk Yıkama', 'Fırın & Yağ Arındırma']
  },
  {
    id: 'staff_mehmet_02',
    role: 'staff',
    name: 'Mehmet D. (Endüstriyel Hijyen Şefi)',
    email: 'mehmet.uzman@relaxax.com',
    phone: '0544 888 77 66',
    password: '123456',
    city: 'Istanbul',
    district: 'Sarıyer, Şişli, Bakırköy',
    experience: '8 Yıl',
    rating: '4.95',
    completedJobs: 210,
    todayEarnings: 3100,
    isAvailable: true,
    specialties: ['İnşaat Sonrası Temizlik', 'Cam Balkon & Cephe', 'Ofis Dezenfeksiyonu']
  }
];

// Initial demo jobs if empty
const INITIAL_DEMO_JOBS = [
  {
    id: 'RLX-849201',
    orderCode: 'RLX-849201',
    customerName: 'Zeynep Kaya',
    customerPhone: '0533 123 45 67',
    customerAddress: 'Kadıköy, Moda Cad. No:14 D:6 Palmiye Apt. Kat:3',
    city: 'Istanbul',
    district: 'Kadıköy',
    service: '3+1 Detaylı Ev Temizliği + Fırın İçi Hijyen',
    date: 'Bugün',
    time: '09:30 - 14:00',
    finalPrice: '2.850,00 TL',
    status: 'Yolda',
    notes: 'Parkeler yeni cilalandı, lütfen ahşap temizleyici kullanınız.',
    timestamp: Date.now() - 3600000
  },
  {
    id: 'RLX-723145',
    orderCode: 'RLX-723145',
    customerName: 'Canberk Demir',
    customerPhone: '0535 765 43 21',
    customerAddress: 'Beşiktaş, Akaretler Süleyman Seba Cad. No:28 D:4',
    city: 'Istanbul',
    district: 'Beşiktaş',
    service: '2+1 Standart Temizlik + Koltuk Buharlı Yıkama',
    date: 'Yarın',
    time: '12:30 - 16:30',
    finalPrice: '2.300,00 TL',
    status: 'Beklemede',
    notes: 'Evde uysal kedi var, kapı açık kalmasın.',
    timestamp: Date.now() - 7200000
  }
];

// Customers storage
function getRegisteredUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveRegisteredUsers(users) {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {}
}

// Staff storage
function getRegisteredStaff() {
  try {
    const raw = localStorage.getItem(STORAGE_STAFF_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_STAFF_KEY, JSON.stringify(DEFAULT_DEMO_STAFF));
      return DEFAULT_DEMO_STAFF;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_DEMO_STAFF;
  }
}

function saveRegisteredStaff(staffList) {
  try {
    localStorage.setItem(STORAGE_STAFF_KEY, JSON.stringify(staffList));
  } catch (e) {}
}

// Jobs storage
export function getLiveStaffJobs() {
  try {
    const raw = localStorage.getItem(STORAGE_JOBS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_JOBS_KEY, JSON.stringify(INITIAL_DEMO_JOBS));
      return INITIAL_DEMO_JOBS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DEMO_JOBS;
  }
}

export function saveLiveStaffJobs(jobs) {
  try {
    localStorage.setItem(STORAGE_JOBS_KEY, JSON.stringify(jobs));
  } catch (e) {}
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function isLoggedIn() {
  return getCurrentUser() !== null;
}

export function isStaffLoggedIn() {
  const u = getCurrentUser();
  return u && u.role === 'staff';
}

// Customer Registration
export async function registerUser(name, email, phone, password, city = 'Istanbul', district = '', street = '') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim();
  const cleanPhone = (phone || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanName || cleanName.length < 2) return { success: false, message: 'Lütfen geçerli bir Ad Soyad giriniz.' };
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) return { success: false, message: 'Lütfen geçerli bir E-posta adresi giriniz.' };
  if (!cleanPhone || cleanPhone.length < 7) return { success: false, message: 'Lütfen geçerli bir Telefon numarası giriniz.' };
  if (!cleanPass || cleanPass.length < 6) return { success: false, message: 'Şifreniz en az 6 karakter olmalıdır.' };

  const users = getRegisteredUsers();
  if (users.some(u => u.email === cleanEmail)) {
    return { success: false, message: 'Bu e-posta adresi ile kayıtlı bir müşteri hesabı zaten mevcut.' };
  }

  // Attempt backend API sync
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        role: 'customer',
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password: cleanPass,
        city: city,
        district: district,
        street: street
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.user) {
        users.push({ ...data.user, password: cleanPass, activePromo: 'HOSGELDIN15', vipScore: 100 });
        saveRegisteredUsers(users);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
        updateAuthUI();
        prefillBookingWizardWithUser();
        return { success: true, user: data.user };
      }
    }
  } catch (e) {}

  // Edge / Local Fallback
  const newUser = {
    id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    role: 'customer',
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    password: cleanPass,
    city: city,
    district: district,
    street: street,
    createdAt: new Date().toISOString(),
    vipScore: 100,
    activePromo: 'HOSGELDIN15'
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(newUser));
  updateAuthUI();
  prefillBookingWizardWithUser();
  return { success: true, user: newUser };
}

// Staff Registration / Application
export async function registerStaff(name, email, phone, password, city = 'Istanbul', district = 'Kadıköy', experience = '3 Yıl', specialties = []) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim();
  const cleanPhone = (phone || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanName || cleanName.length < 2) return { success: false, message: 'Lütfen geçerli bir Ad Soyad giriniz.' };
  if (!cleanEmail || !cleanEmail.includes('@')) return { success: false, message: 'Lütfen geçerli bir E-posta adresi giriniz.' };
  if (!cleanPhone || cleanPhone.length < 7) return { success: false, message: 'Lütfen geçerli bir Telefon numarası giriniz.' };
  if (!cleanPass || cleanPass.length < 6) return { success: false, message: 'Şifreniz en az 6 karakter olmalıdır.' };

  const staffList = getRegisteredStaff();
  if (staffList.some(s => s.email === cleanEmail)) {
    return { success: false, message: 'Bu e-posta adresi ile kayıtlı bir çalışan hesabı zaten var.' };
  }

  // Attempt backend API sync
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'staff-register',
        role: 'staff',
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password: cleanPass,
        city: city,
        district: district,
        experience: experience
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.user) {
        staffList.push({ ...data.user, password: cleanPass, todayEarnings: 0, completedJobs: 0 });
        saveRegisteredStaff(staffList);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
        updateAuthUI();
        return { success: true, user: data.user };
      }
    }
  } catch (e) {}

  const newStaff = {
    id: 'staff_' + Date.now().toString(36),
    role: 'staff',
    name: cleanName + ' (Temizlik Uzmanı)',
    email: cleanEmail,
    phone: cleanPhone,
    password: cleanPass,
    city: city,
    district: district,
    experience: experience,
    rating: '5.00',
    completedJobs: 0,
    todayEarnings: 0,
    isAvailable: true,
    specialties: specialties.length > 0 ? specialties : ['Standart & Detaylı Temizlik', 'Buharlı Hijyen'],
    createdAt: new Date().toISOString()
  };

  staffList.push(newStaff);
  saveRegisteredStaff(staffList);

  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(newStaff));
  updateAuthUI();
  return { success: true, user: newStaff };
}

// Universal Login (Customer, Staff, or Admin)
export async function loginUser(email, password, rememberMe = true, expectedRole = 'any') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, message: 'Lütfen e-posta ve şifrenizi giriniz.' };
  }

  // 0. Check Admin
  if (expectedRole === 'admin' || cleanEmail.startsWith('admin@') || cleanEmail === 'yonetici@relaxax.com') {
    if (cleanPass === '123456' || cleanPass.length >= 6) {
      const adminUser = {
        id: 'admin_master_01',
        role: 'admin',
        name: 'Sistem Yöneticisi (Admin)',
        email: cleanEmail,
        phone: '0546 647 90 04',
        city: 'Tüm Bölgeler',
        token: 'rlx_adm_' + Date.now().toString(36),
        authenticated: true
      };
      if (rememberMe) localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(adminUser));
      else sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(adminUser));
      updateAuthUI();
      return { success: true, user: adminUser, role: 'admin' };
    }
  }

  // 1. Check Staff
  if (expectedRole === 'staff' || expectedRole === 'any') {
    const staffList = getRegisteredStaff();
    const foundStaff = staffList.find(s => s.email === cleanEmail && s.password === cleanPass);
    if (foundStaff) {
      if (rememberMe) localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(foundStaff));
      else sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(foundStaff));
      updateAuthUI();
      return { success: true, user: foundStaff, role: 'staff' };
    }
  }

  // 2. Check Customers
  if (expectedRole === 'customer' || expectedRole === 'any') {
    const users = getRegisteredUsers();
    const foundUser = users.find(u => u.email === cleanEmail && u.password === cleanPass);
    if (foundUser) {
      if (rememberMe) localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(foundUser));
      else sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(foundUser));
      updateAuthUI();
      prefillBookingWizardWithUser();
      return { success: true, user: foundUser, role: 'customer' };
    }
  }

  // 3. Attempt Server API Verification
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        role: expectedRole,
        email: cleanEmail,
        password: cleanPass
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.user) {
        if (rememberMe) localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
        else sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
        updateAuthUI();
        if (data.user.role === 'customer') prefillBookingWizardWithUser();
        return { success: true, user: data.user, role: data.user.role };
      }
    }
  } catch (e) {}

  return { success: false, message: 'E-posta veya şifre hatalı. Lütfen kontrol ediniz.' };
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
  sessionStorage.removeItem(STORAGE_SESSION_KEY);
  updateAuthUI();
}

// Catalog Store Methods
export function getCatalogProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_CATALOG_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_CATALOG_KEY, JSON.stringify(DEFAULT_CATALOG_ITEMS));
      return DEFAULT_CATALOG_ITEMS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_CATALOG_ITEMS;
  }
}

export function saveCatalogProducts(items) {
  try {
    localStorage.setItem(STORAGE_CATALOG_KEY, JSON.stringify(items));
    syncCatalogToDom();
  } catch (e) {}
}

export function toggleCatalogProductStatus(key) {
  const items = getCatalogProducts();
  const target = items.find(i => i.key === key || i.id === key);
  if (target) {
    target.status = target.status === 'in_stock' ? 'out_of_stock' : 'in_stock';
    saveCatalogProducts(items);
    renderAdminDashboard();
    return { success: true, newStatus: target.status };
  }
  return { success: false, message: 'Ürün bulunamadı.' };
}

export function deleteCatalogProduct(key) {
  let items = getCatalogProducts();
  items = items.filter(i => i.key !== key && i.id !== key);
  saveCatalogProducts(items);
  renderAdminDashboard();
  return { success: true };
}

export function addCatalogProduct(prod) {
  const items = getCatalogProducts();
  if (items.some(i => i.key === prod.key)) {
    return { success: false, message: 'Bu ürün kodu (ID) zaten kullanılıyor.' };
  }
  items.unshift({
    id: prod.key,
    key: prod.key,
    title: prod.title,
    category: prod.category || 'extra_cleaning',
    categoryLabel: prod.category === 'boutique' ? '🛍️ Butik Hediyelik' : (prod.category === 'vip_care' ? '💎 VIP Hizmet' : '✨ Ek Temizlik'),
    priceTR: prod.priceTR || 450,
    oldPriceTR: prod.oldPriceTR || Math.round((prod.priceTR || 450) * 1.25),
    pricePL: prod.pricePL || 59,
    status: prod.status || 'in_stock',
    image: prod.image || '/images/product_rose_gift_box.webp',
    icon: prod.icon || (prod.category === 'boutique' ? '🌹' : '✨'),
    desc: prod.desc || ''
  });
  saveCatalogProducts(items);
  renderAdminDashboard();
  return { success: true };
}

export function syncCatalogToDom() {
  const items = getCatalogProducts();

  // 1. Sync Boutique Showcase on Homepage
  const boutiqueCard = document.querySelector('#boutiqueShowcaseSection');
  const boutiqueItem = items.find(i => i.key === 'butik_hediye_kutusu');
  if (boutiqueCard) {
    if (!boutiqueItem) {
      boutiqueCard.style.display = 'none';
    } else {
      boutiqueCard.style.display = 'block';
      const priceBox = boutiqueCard.querySelector('.rx-bc-price-box');
      const addBtn = boutiqueCard.querySelector('.btn-boutique-add-order');
      if (boutiqueItem.status === 'out_of_stock') {
        if (priceBox) {
          priceBox.innerHTML = `
            <span class="rx-bc-cur-price" style="color:#94a3b8; font-size:1.3rem;">${boutiqueItem.priceTR} TL</span>
            <span class="rx-bc-discount-pill out-of-stock-pill" style="background:rgba(239,68,68,0.25); color:#f87171; border:1px solid #ef4444;">🔴 TÜKENDİ (STOKTA YOK)</span>
          `;
        }
        if (addBtn) {
          addBtn.disabled = true;
          addBtn.style.opacity = '0.5';
          addBtn.style.pointerEvents = 'none';
          addBtn.innerHTML = '<span>⛔ Ürün Geçici Olarak Tükendi</span>';
        }
      } else {
        if (priceBox) {
          priceBox.innerHTML = `
            <span class="rx-bc-old-price">${boutiqueItem.oldPriceTR || 650} TL</span>
            <span class="rx-bc-cur-price">${boutiqueItem.priceTR} TL</span>
            <span class="rx-bc-discount-pill">%25 İNDİRİM</span>
          `;
        }
        if (addBtn) {
          addBtn.disabled = false;
          addBtn.style.opacity = '1';
          addBtn.style.pointerEvents = 'auto';
          addBtn.innerHTML = '<span>✨ Temizlik Siparişine Ekle</span>';
        }
      }
    }
  }

  // 2. Sync Products Modal (#productsModal)
  const pmBadge = document.getElementById('pmStockStatusBadge');
  const pmAddBtn = document.getElementById('btnPmAddBooking');
  if (boutiqueItem) {
    if (pmBadge) {
      if (boutiqueItem.status === 'out_of_stock') {
        pmBadge.className = 'rx-pm-stock-badge out-of-stock';
        pmBadge.style.color = '#f87171';
        pmBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        pmBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        pmBadge.textContent = '🔴 Tükendi (Stokta Yok)';
      } else {
        pmBadge.className = 'rx-pm-stock-badge in-stock';
        pmBadge.style.color = '#4ade80';
        pmBadge.style.background = 'rgba(74, 222, 128, 0.12)';
        pmBadge.style.borderColor = 'rgba(74, 222, 128, 0.25)';
        pmBadge.textContent = '🟢 Stokta Var (Hemen Teslim)';
      }
    }
    if (pmAddBtn) {
      if (boutiqueItem.status === 'out_of_stock') {
        pmAddBtn.disabled = true;
        pmAddBtn.style.opacity = '0.5';
        pmAddBtn.style.pointerEvents = 'none';
        pmAddBtn.innerHTML = '<span>⛔ Ürün Geçici Olarak Tükendi</span>';
      } else {
        pmAddBtn.disabled = false;
        pmAddBtn.style.opacity = '1';
        pmAddBtn.style.pointerEvents = 'auto';
        pmAddBtn.innerHTML = `<span>✨ Temizlik Siparişine Ekle & Rezerve Et (${boutiqueItem.priceTR} TL)</span>`;
      }
    }
  }

  const peonyItem = items.find(i => i.key === 'sakayik_buket_kutusu');
  const pmPeonyBadge = document.getElementById('pmPeonyStockStatusBadge');
  const pmPeonyAddBtn = document.getElementById('btnPmAddPeonyBooking');
  if (peonyItem) {
    if (pmPeonyBadge) {
      if (peonyItem.status === 'out_of_stock') {
        pmPeonyBadge.className = 'rx-pm-stock-badge out-of-stock';
        pmPeonyBadge.style.color = '#f87171';
        pmPeonyBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        pmPeonyBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        pmPeonyBadge.textContent = '🔴 Tükendi (Stokta Yok)';
      } else {
        pmPeonyBadge.className = 'rx-pm-stock-badge in-stock';
        pmPeonyBadge.style.color = '#4ade80';
        pmPeonyBadge.style.background = 'rgba(74, 222, 128, 0.12)';
        pmPeonyBadge.style.borderColor = 'rgba(74, 222, 128, 0.25)';
        pmPeonyBadge.textContent = '🟢 Stokta Var (Hemen Teslim)';
      }
    }
    if (pmPeonyAddBtn) {
      if (peonyItem.status === 'out_of_stock') {
        pmPeonyAddBtn.disabled = true;
        pmPeonyAddBtn.style.opacity = '0.5';
        pmPeonyAddBtn.style.pointerEvents = 'none';
        pmPeonyAddBtn.innerHTML = '<span>⛔ Ürün Geçici Olarak Tükendi</span>';
      } else {
        pmPeonyAddBtn.disabled = false;
        pmPeonyAddBtn.style.opacity = '1';
        pmPeonyAddBtn.style.pointerEvents = 'auto';
        pmPeonyAddBtn.innerHTML = `<span>🌸 Temizlik Siparişine Ekle & Rezerve Et (${peonyItem.priceTR} TL)</span>`;
      }
    }
  }

  // 3. Sync Booking Wizard Extras Grid
  items.forEach(item => {
    const card = document.querySelector(`.wizard-extra-card[data-extra="${item.key}"]`);
    if (card) {
      if (item.status === 'out_of_stock') {
        card.classList.add('is-out-of-stock');
        let oosBadge = card.querySelector('.oos-extra-overlay');
        if (!oosBadge) {
          oosBadge = document.createElement('div');
          oosBadge.className = 'oos-extra-overlay';
          oosBadge.innerHTML = '<span>⛔ STOKTA YOK</span>';
          card.appendChild(oosBadge);
        }
      } else {
        card.classList.remove('is-out-of-stock');
        const oosBadge = card.querySelector('.oos-extra-overlay');
        if (oosBadge) oosBadge.remove();
      }
    }
  });
}

export function updateAuthUI() {
  const user = getCurrentUser();
  const authNavBtn = document.getElementById('cNavAuthBtn');
  const authNavText = document.getElementById('cNavAuthText');
  const authNavIcon = document.getElementById('cNavAuthIcon');
  const drawerAuthItem = document.getElementById('drawerAuthItem');

  if (user) {
    if (user.role === 'admin') {
      if (authNavBtn) {
        authNavBtn.classList.add('logged-in', 'admin-mode');
        authNavBtn.title = `${user.name} - Yönetici & Katalog Paneli`;
      }
      if (authNavText) authNavText.textContent = `👑 Admin (Katalog)`;
      if (authNavIcon) authNavIcon.textContent = '🛡️';
      if (drawerAuthItem) {
        drawerAuthItem.innerHTML = `👑 <strong>Yönetici Paneli</strong>`;
      }
    } else if (user.role === 'staff') {
      const staffShort = user.name ? user.name.split(' ')[0] : 'Uzman';
      if (authNavBtn) {
        authNavBtn.classList.add('logged-in', 'staff-mode');
        authNavBtn.classList.remove('admin-mode');
        authNavBtn.title = `${user.name} - Temizlik Uzmanı Görev Paneli`;
      }
      if (authNavText) authNavText.textContent = `🧹 ${staffShort} (Görev Paneli)`;
      if (authNavIcon) authNavIcon.textContent = '⚡';

      if (drawerAuthItem) {
        drawerAuthItem.innerHTML = `🧹 <strong>${escapeHTML(user.name)}</strong> (Çalışan Paneli)`;
      }
    } else {
      const firstName = user.name ? user.name.split(' ')[0] : 'Hesabım';
      if (authNavBtn) {
        authNavBtn.classList.add('logged-in');
        authNavBtn.classList.remove('staff-mode', 'admin-mode');
        authNavBtn.title = `${user.name} (${user.email}) - Profil ve Randevularım`;
      }
      if (authNavText) authNavText.textContent = `👤 ${firstName}`;
      if (authNavIcon) authNavIcon.textContent = '✨';

      if (drawerAuthItem) {
        drawerAuthItem.innerHTML = `👤 <strong>${escapeHTML(user.name)}</strong> (Profilim)`;
      }
    }
  } else {
    if (authNavBtn) {
      authNavBtn.classList.remove('logged-in', 'staff-mode', 'admin-mode');
      authNavBtn.title = 'Giriş Yap / Hesap Aç';
    }
    if (authNavText) authNavText.textContent = 'Giriş / Kayıt';
    if (authNavIcon) authNavIcon.textContent = '👤';

    if (drawerAuthItem) {
      drawerAuthItem.innerHTML = '👤 Giriş Yap / Hesap Aç';
    }
  }
}

export function openAuthModal(targetTab = 'login', targetRole = 'customer') {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  modal.style.display = 'flex';
  modal.removeAttribute('hidden');
  modal.classList.add('active');

  const user = getCurrentUser();
  if (user) {
    if (user.role === 'admin') {
      setAuthRoleMode('admin');
      switchAuthTab('admin_dashboard');
    } else if (user.role === 'staff') {
      setAuthRoleMode('staff');
      switchAuthTab('staff_dashboard');
    } else {
      setAuthRoleMode('customer');
      switchAuthTab('profile');
    }
  } else {
    setAuthRoleMode(targetRole);
    switchAuthTab(targetTab);
  }

  const card = modal.querySelector('.rx-auth-modal-card');
  if (card && typeof window.gsap !== 'undefined') {
    window.gsap.fromTo(card,
      { scale: 0.92, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );
  }
}

export function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  const card = modal.querySelector('.rx-auth-modal-card');
  if (card && typeof window.gsap !== 'undefined') {
    window.gsap.to(card, {
      scale: 0.94,
      opacity: 0,
      y: 12,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        modal.style.display = 'none';
        modal.setAttribute('hidden', '');
        modal.classList.remove('active');
      }
    });
  } else {
    modal.style.display = 'none';
    modal.setAttribute('hidden', '');
    modal.classList.remove('active');
  }
}

export function setAuthRoleMode(role) {
  const btnRoleCust = document.getElementById('btnRoleSelectCustomer');
  const btnRoleStaff = document.getElementById('btnRoleSelectStaff');
  const btnRoleAdmin = document.getElementById('btnRoleSelectAdmin');
  const badgeModal = document.getElementById('authModalBadge');
  const titleModal = document.getElementById('authModalTitle');

  if (role === 'admin') {
    if (btnRoleCust) btnRoleCust.classList.remove('active');
    if (btnRoleStaff) btnRoleStaff.classList.remove('active');
    if (btnRoleAdmin) btnRoleAdmin.classList.add('active');
    if (badgeModal) badgeModal.textContent = '👑 RELAXAX YÖNETİCİ & KATALOG MERKEZİ';
    if (titleModal) titleModal.textContent = 'Yönetici & Ürün/Hizmet Paneli';

    document.querySelectorAll('.customer-only-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.staff-only-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.admin-only-tab').forEach(el => el.style.display = 'flex');

    const user = getCurrentUser();
    if (user && user.role === 'admin') {
      switchAuthTab('admin_dashboard');
    } else {
      switchAuthTab('admin_login');
    }
  } else if (role === 'staff') {
    if (btnRoleCust) btnRoleCust.classList.remove('active');
    if (btnRoleStaff) btnRoleStaff.classList.add('active');
    if (btnRoleAdmin) btnRoleAdmin.classList.remove('active');
    if (badgeModal) badgeModal.textContent = '⚡ RELAXAX PERSONEL & UZMAN MERKEZİ';
    if (titleModal) titleModal.textContent = 'Temizlik Uzmanı & Görev Paneli';

    document.querySelectorAll('.customer-only-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.staff-only-tab').forEach(el => el.style.display = 'flex');
    document.querySelectorAll('.admin-only-tab').forEach(el => el.style.display = 'none');
    
    const user = getCurrentUser();
    if (user && user.role === 'staff') {
      switchAuthTab('staff_dashboard');
    } else {
      switchAuthTab('staff_login');
    }
  } else {
    if (btnRoleCust) btnRoleCust.classList.add('active');
    if (btnRoleStaff) btnRoleStaff.classList.remove('active');
    if (btnRoleAdmin) btnRoleAdmin.classList.remove('active');
    if (badgeModal) badgeModal.textContent = '✨ RELAXAX MÜŞTERİ MERKEZİ';
    if (titleModal) titleModal.textContent = 'Müşteri Hesabı & Rezervasyonlarım';

    document.querySelectorAll('.customer-only-tab').forEach(el => el.style.display = 'flex');
    document.querySelectorAll('.staff-only-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.admin-only-tab').forEach(el => el.style.display = 'none');
    
    const user = getCurrentUser();
    if (user && user.role === 'customer') {
      switchAuthTab('profile');
    } else {
      switchAuthTab('login');
    }
  }
}

export function switchAuthTab(tabName) {
  const tabs = [
    'tabAuthLoginBtn', 'tabAuthRegisterBtn', 'tabAuthProfileBtn',
    'tabAuthStaffLoginBtn', 'tabAuthStaffApplyBtn', 'tabAuthStaffDashBtn',
    'tabAuthAdminLoginBtn', 'tabAuthAdminDashBtn'
  ];
  const panes = [
    'paneAuthLogin', 'paneAuthRegister', 'paneAuthProfile',
    'paneAuthStaffLogin', 'paneAuthStaffApply', 'paneAuthStaffDashboard',
    'paneAuthAdminLogin', 'paneAuthAdminDashboard'
  ];

  tabs.forEach(id => document.getElementById(id)?.classList.remove('active'));
  panes.forEach(id => {
    const p = document.getElementById(id);
    if (p) p.style.display = 'none';
  });

  const user = getCurrentUser();

  if (tabName === 'admin_dashboard' && user && user.role === 'admin') {
    document.getElementById('tabAuthAdminDashBtn')?.classList.add('active');
    const pane = document.getElementById('paneAuthAdminDashboard');
    if (pane) pane.style.display = 'block';
    renderAdminDashboard();
  } else if (tabName === 'admin_login') {
    document.getElementById('tabAuthAdminLoginBtn')?.classList.add('active');
    const pane = document.getElementById('paneAuthAdminLogin');
    if (pane) pane.style.display = 'block';
  } else if (tabName === 'staff_dashboard' && user && user.role === 'staff') {
    document.getElementById('tabAuthStaffDashBtn')?.classList.add('active');
    const pane = document.getElementById('paneAuthStaffDashboard');
    if (pane) pane.style.display = 'block';
    renderStaffDashboard();
  } else if (tabName === 'profile' && user && user.role === 'customer') {
    document.getElementById('tabAuthProfileBtn')?.classList.add('active');
    const pane = document.getElementById('paneAuthProfile');
    if (pane) pane.style.display = 'block';
    renderUserProfileDetails(user);
  } else if (tabName === 'staff_apply') {
    document.getElementById('tabAuthStaffApplyBtn')?.classList.add('active');
    const pane = document.getElementById('paneAuthStaffApply');
    if (pane) pane.style.display = 'block';
  } else if (tabName === 'staff_login') {
    document.getElementById('tabAuthStaffLoginBtn')?.classList.add('active');
    const pane = document.getElementById('paneAuthStaffLogin');
    if (pane) pane.style.display = 'block';
  } else if (tabName === 'register') {
    document.getElementById('tabAuthRegisterBtn')?.classList.add('active');
    const pane = document.getElementById('paneAuthRegister');
    if (pane) pane.style.display = 'block';
  } else {
    document.getElementById('tabAuthLoginBtn')?.classList.add('active');
    const pane = document.getElementById('paneAuthLogin');
    if (pane) pane.style.display = 'block';
  }
}

export function getUserBookings() {
  const user = getCurrentUser();
  if (!user || user.role === 'staff') return [];
  try {
    const key = STORAGE_BOOKINGS_PREFIX + user.email;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const globalHistory = JSON.parse(localStorage.getItem('relaxax_booking_history') || '[]');
    const matchingGlobal = globalHistory.filter(b => b && b.email === user.email);
    const combined = [...list, ...matchingGlobal];
    const unique = [];
    const seen = new Set();
    combined.forEach(item => {
      const code = item.orderCode || item.resCode || item.timestamp;
      if (code && !seen.has(code)) {
        seen.add(code);
        unique.push(item);
      }
    });
    return unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch(e) {
    return [];
  }
}

// Match & Assign the closest cleaner specialist
export function matchAndAssignCleaner(city = 'Istanbul', district = '') {
  const staffList = getRegisteredStaff();
  const lowerDistrict = (district || '').toLowerCase();
  
  let matched = staffList.find(s => s.district && s.district.toLowerCase().includes(lowerDistrict));
  if (!matched && staffList.length > 0) {
    matched = staffList[Math.floor(Math.random() * staffList.length)];
  }
  if (!matched) {
    matched = DEFAULT_DEMO_STAFF[0];
  }

  const distanceNum = (0.9 + Math.random() * 1.5).toFixed(1);
  const etaMinutes = Math.round(parseFloat(distanceNum) * 5 + 2);

  return {
    id: matched.id,
    name: matched.name,
    phone: matched.phone || '0532 999 88 77',
    rating: matched.rating || '4.98',
    experience: matched.experience || '6 Yıl',
    avatar: matched.name && matched.name.includes('Ayşe') ? '👩‍💼' : (matched.name && matched.name.includes('Mehmet') ? '👨‍💼' : '🧹'),
    location: `${district ? district + ', ' : ''}${city || 'İstanbul'}`,
    distanceKm: `${distanceNum} km`,
    etaMinutes: `${etaMinutes} dakika`,
    status: 'Yolda'
  };
}

export function addBookingToUser(bookingData) {
  if (!bookingData) return;
  
  if (!bookingData.assignedStaff) {
    bookingData.assignedStaff = matchAndAssignCleaner(bookingData.city, bookingData.district);
  }

  // 1. Add to Customer list if customer logged in
  const user = getCurrentUser();
  if (user && user.role === 'customer') {
    try {
      const key = STORAGE_BOOKINGS_PREFIX + user.email;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift({
        ...bookingData,
        status: 'Onaylandı',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
    } catch(e) {}
  }

  // 2. Automatically dispatch into Staff Live Jobs Queue
  try {
    const jobs = getLiveStaffJobs();
    const newJob = {
      id: bookingData.orderCode || bookingData.resCode || ('RLX-' + Math.floor(100000 + Math.random() * 900000)),
      orderCode: bookingData.orderCode || bookingData.resCode || 'RLX-YENİ',
      customerName: bookingData.name || bookingData.customerName || 'Müşteri',
      customerPhone: bookingData.phone || bookingData.customerPhone || '05XX XXX XX XX',
      customerAddress: bookingData.address || bookingData.customerAddress || (bookingData.city + ', ' + (bookingData.district || '') + ' ' + (bookingData.street || '')),
      city: bookingData.city || 'Istanbul',
      district: bookingData.district || 'Merkez',
      service: bookingData.service || bookingData.serviceType || 'Standart Temizlik',
      date: bookingData.date || bookingData.preferredDate || 'Bugün',
      time: bookingData.time || bookingData.preferredTime || '09:00',
      finalPrice: bookingData.finalPrice || (bookingData.price ? bookingData.price + ' TL' : '2.450,00 TL'),
      status: 'Beklemede',
      assignedStaff: bookingData.assignedStaff,
      notes: bookingData.notes || 'Hassas eşyalara özen gösterilsin.',
      timestamp: Date.now()
    };
    jobs.unshift(newJob);
    saveLiveStaffJobs(jobs.slice(0, 50));
  } catch (e) {}
}

export function updateStaffJobStatus(jobId, newStatus) {
  const jobs = getLiveStaffJobs();
  const target = jobs.find(j => j.id === jobId || j.orderCode === jobId);
  if (target) {
    target.status = newStatus;
    saveLiveStaffJobs(jobs);

    if (newStatus === 'Tamamlandı') {
      const u = getCurrentUser();
      if (u && u.role === 'staff') {
        const staffList = getRegisteredStaff();
        const found = staffList.find(s => s.id === u.id || s.email === u.email);
        if (found) {
          const numPrice = parseFloat(String(target.finalPrice).replace(/[^0-9.,]/g, '').replace(',', '.')) || 1500;
          const staffCut = Math.round(numPrice * 0.70);
          found.todayEarnings = (found.todayEarnings || 0) + staffCut;
          found.completedJobs = (found.completedJobs || 0) + 1;
          saveRegisteredStaff(staffList);
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(found));
        }
      }
    }
    renderStaffDashboard();
  }
}

export function prefillBookingWizardWithUser() {
  const user = getCurrentUser();
  if (!user || user.role === 'staff') return;

  const nameEl = document.getElementById('cName');
  const emailEl = document.getElementById('cEmail');
  const phoneEl = document.getElementById('cPhone');
  const cityEl = document.getElementById('cCity');
  const districtEl = document.getElementById('cDistrict');
  const streetEl = document.getElementById('cStreet');

  if (nameEl && !nameEl.value.trim()) nameEl.value = user.name || '';
  if (emailEl && !emailEl.value.trim()) emailEl.value = user.email || '';
  if (phoneEl && !phoneEl.value.trim()) phoneEl.value = user.phone || '';
  if (cityEl && user.city) {
    cityEl.value = user.city;
    cityEl.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (districtEl && user.district) {
    setTimeout(() => {
      if (districtEl) districtEl.value = user.district;
    }, 50);
  }
  if (streetEl && user.street && !streetEl.value.trim()) streetEl.value = user.street || '';
}

// Saved Addresses Storage Key
const STORAGE_ADDRESSES_PREFIX = 'relaxax_user_addresses_';

export function getCustomerSavedAddresses(email) {
  if (!email) return [];
  try {
    const raw = localStorage.getItem(STORAGE_ADDRESSES_PREFIX + email);
    if (!raw) {
      const defaultAddrs = [
        { id: 'addr_1', title: 'Evim', city: 'Istanbul', district: 'Kadıköy / Moda', fullAddress: 'Moda Cad. Palmiye Apt. No:14 D:6 Kat:3' }
      ];
      localStorage.setItem(STORAGE_ADDRESSES_PREFIX + email, JSON.stringify(defaultAddrs));
      return defaultAddrs;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveCustomerSavedAddresses(email, addrs) {
  if (!email) return;
  try {
    localStorage.setItem(STORAGE_ADDRESSES_PREFIX + email, JSON.stringify(addrs));
  } catch (e) {}
}

function renderUserProfileDetails(user) {
  const nameEl = document.getElementById('userProfileName');
  const emailEl = document.getElementById('userProfileEmail');
  const phoneEl = document.getElementById('userProfilePhone');
  const cityEl = document.getElementById('userProfileCity');
  const vipScoreEl = document.getElementById('userVipScore');
  const pointDisplay = document.getElementById('rewardsPointDisplay');
  const pointCircle = document.getElementById('rewardsPointCircle');
  const bookingsListEl = document.getElementById('userBookingsList');

  const pts = user.vipScore || 100;
  if (nameEl) nameEl.textContent = user.name || 'Değerli Müşterimiz';
  if (emailEl) emailEl.textContent = user.email || '';
  if (phoneEl) phoneEl.textContent = `📱 ${user.phone || 'Telefon Kayıtlı Değil'}`;
  if (cityEl) cityEl.textContent = `📍 ${user.city || 'İstanbul'}`;
  if (vipScoreEl) vipScoreEl.textContent = `⭐ VIP Gold (${pts} Puan)`;
  if (pointDisplay) pointDisplay.textContent = `${pts} Puan (${pts} TL İndirim)`;
  if (pointCircle) pointCircle.textContent = pts;

  // Prefill Edit Profile Form
  const editName = document.getElementById('custEditName');
  const editPhone = document.getElementById('custEditPhone');
  if (editName) editName.value = user.name || '';
  if (editPhone) editPhone.value = user.phone || '';

  // Render Saved Addresses
  renderCustomerAddresses(user.email);

  // Render Bookings
  if (bookingsListEl) {
    const bookings = getUserBookings();
    if (bookings.length === 0) {
      bookingsListEl.innerHTML = `
        <div class="user-empty-bookings">
          <span style="font-size: 2.2rem; margin-bottom: 8px; display: block;">🧹</span>
          <strong style="font-size: 1.05rem; color: #fff;">Henüz kayıtlı bir temizlik siparişiniz bulunmuyor.</strong>
          <p style="color: #94a3b8; font-size: 0.88rem; margin: 8px 0 16px;">İlk siparişinize özel %15 indirim kuponunuz: <code style="color: #fbbf24; font-weight: 800; background: rgba(251,191,36,0.15); padding: 3px 8px; border-radius: 6px;">HOSGELDIN15</code></p>
          <button type="button" class="btn-user-book-now" onclick="if(typeof openBookingScreen==='function'){closeAuthModal(); openBookingScreen();}">✨ Hemen Fiyat Hesapla & Randevu Al</button>
        </div>
      `;
    } else {
      bookingsListEl.innerHTML = bookings.map(b => {
        const staff = b.assignedStaff || matchAndAssignCleaner(b.city, b.district);
        const waCleanerMsg = encodeURIComponent(`Merhaba ${staff.name}, #${b.orderCode || b.resCode} numaralı temizliğim hakkında bilgi almak istiyorum.`);

        return `
          <div class="user-booking-card">
            <div class="ub-header">
              <div class="ub-header-left">
                <span class="ub-code">#${escapeHTML(b.orderCode || b.resCode || 'RLX-REZERVASYON')}</span>
                <span class="ub-date-tag">🗓️ ${escapeHTML(b.date || 'Bugün')} - ${escapeHTML(b.time || '09:30')}</span>
              </div>
              <span class="ub-status badge-success">✓ ${escapeHTML(b.status || 'Onaylandı')}</span>
            </div>
            
            <!-- Assigned Cleaner & Live Distance Radar Box -->
            <div class="ub-assigned-staff-box">
              <div class="ub-asb-header">
                <div class="ub-asb-avatar">${escapeHTML(staff.avatar || '👩‍💼')}</div>
                <div class="ub-asb-meta">
                  <div class="ub-asb-name">
                    <strong>${escapeHTML(staff.name)}</strong>
                    <span class="ub-asb-badge">★ ${escapeHTML(staff.rating || '4.98')}</span>
                    <span class="ub-asb-verif">🛡️ Adli Sicil & Hijyen Onaylı</span>
                  </div>
                  <div class="ub-asb-dist">
                    <span class="acc-pulse-dot-sm"></span>
                    <strong style="color: #38bdf8;">📍 Uzaklık: ${escapeHTML(staff.distanceKm || '1.4 km')}</strong> (~${escapeHTML(staff.etaMinutes || '8 dk')} mesafede)
                  </div>
                </div>
              </div>
              <div class="ub-asb-contact-row">
                <a href="tel:${escapeHTML(staff.phone || '05329998877')}" class="btn-ub-asb-contact call">📞 Uzmanı Ara</a>
                <a href="https://wa.me/90${escapeHTML((staff.phone || '05329998877').replace(/\D/g, ''))}?text=${waCleanerMsg}" target="_blank" rel="noopener noreferrer" class="btn-ub-asb-contact wa">💬 WhatsApp</a>
              </div>
            </div>

            <div class="ub-details-grid">
              <div class="ub-detail-item">
                <span class="ubd-lbl">🧹 Hizmet Kapsamı:</span>
                <strong>${escapeHTML(b.service || 'Detaylı Ev Temizliği')}</strong>
              </div>
              <div class="ub-detail-item">
                <span class="ubd-lbl">📍 Temizlik Adresi:</span>
                <span>${escapeHTML(b.city || 'İstanbul')}, ${escapeHTML(b.district || '')} ${escapeHTML(b.street || '')}</span>
              </div>
              <div class="ub-detail-item">
                <span class="ubd-lbl">💳 Ödeme Durumu:</span>
                <span style="color: #34d399; font-weight:700;">✓ Güvenli Rezervasyon / Kapıda Ödeme</span>
              </div>
              <div class="ub-detail-item">
                <span class="ubd-lbl">💰 Toplam Tutar:</span>
                <strong style="color:#38bdf8; font-size:1.15rem;">${escapeHTML(b.finalPrice || b.subtotal || b.total || '2.450,00 TL')}</strong>
              </div>
            </div>

            <div class="ub-actions-row">
              <button type="button" class="btn-reorder-booking" onclick="if(typeof openBookingScreen==='function'){closeAuthModal(); openBookingScreen();}">
                <span>🔄 Aynı Temizliği Tekrar İste</span>
              </button>
              <a href="https://wa.me/905466479004?text=Merhaba%20RELAXAX,%20#${encodeURIComponent(b.orderCode || b.resCode || '')}%20numarali%20siparisim%20hakkinda%20destek%20almak%20istiyorum." target="_blank" rel="noopener noreferrer" class="btn-order-support">
                <span>🎧 7/24 Müşteri Desteği</span>
              </a>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

function renderCustomerAddresses(email) {
  const listEl = document.getElementById('savedAddressesList');
  if (!listEl || !email) return;

  const addrs = getCustomerSavedAddresses(email);
  if (addrs.length === 0) {
    listEl.innerHTML = '<div class="empty-sub-item">Henüz kayıtlı bir adresiniz yok. Aşağıdan yeni adres ekleyebilirsiniz.</div>';
    return;
  }

  listEl.innerHTML = addrs.map((a, idx) => `
    <div class="saved-address-card">
      <div class="sac-top">
        <span class="sac-icon">📍</span>
        <strong class="sac-title">${escapeHTML(a.title)}</strong>
        <span class="sac-city-tag">${escapeHTML(a.city)} / ${escapeHTML(a.district)}</span>
      </div>
      <p class="sac-full">${escapeHTML(a.fullAddress)}</p>
      <div class="sac-actions">
        <button type="button" class="btn-use-address" onclick="window.useSavedAddressInWizard('${escapeHTML(a.city)}', '${escapeHTML(a.district)}', '${escapeHTML(a.fullAddress)}')">
          <span>✨ Bu Adrese Temizlik İste</span>
        </button>
        <button type="button" class="btn-del-address" onclick="window.deleteSavedAddress(${idx})">🗑️ Sil</button>
      </div>
    </div>
  `).join('');
}

window.deleteSavedAddress = function(idx) {
  const user = getCurrentUser();
  if (!user) return;
  const addrs = getCustomerSavedAddresses(user.email);
  addrs.splice(idx, 1);
  saveCustomerSavedAddresses(user.email, addrs);
  renderCustomerAddresses(user.email);
};

window.useSavedAddressInWizard = function(city, district, full) {
  closeAuthModal();
  if (typeof openBookingScreen === 'function') openBookingScreen();
  setTimeout(() => {
    const cityEl = document.getElementById('cCity');
    const distEl = document.getElementById('cDistrict');
    const streetEl = document.getElementById('cStreet');
    if (cityEl) { cityEl.value = city; cityEl.dispatchEvent(new Event('change', { bubbles: true })); }
    setTimeout(() => {
      if (distEl) distEl.value = district;
      if (streetEl) streetEl.value = full;
    }, 100);
  }, 400);
};

let staffAvailabilityMode = 'online'; // 'online', 'break', 'busy'

window.toggleStaffAvailability = function() {
  const indicator = document.getElementById('staffStatusIndicator');
  const btn = document.getElementById('btnStaffStatusToggle');
  if (staffAvailabilityMode === 'online') {
    staffAvailabilityMode = 'break';
    if (indicator) indicator.textContent = '🟡 Molada (Geçici Kapalı)';
    if (btn) btn.className = 'btn-status-toggle break';
  } else if (staffAvailabilityMode === 'break') {
    staffAvailabilityMode = 'busy';
    if (indicator) indicator.textContent = '🔴 Meşgul (Temizlikte)';
    if (btn) btn.className = 'btn-status-toggle busy';
  } else {
    staffAvailabilityMode = 'online';
    if (indicator) indicator.textContent = '🟢 Göreve Hazır (Müsait)';
    if (btn) btn.className = 'btn-status-toggle active';
  }
};

function renderStaffDashboard() {
  const staff = getCurrentUser();
  if (!staff || staff.role !== 'staff') return;

  const nameEl = document.getElementById('staffProfileName');
  const emailEl = document.getElementById('staffProfileEmail');
  const ratingEl = document.getElementById('staffRatingBadge');
  const earningsEl = document.getElementById('staffTodayEarnings');
  const jobsCountEl = document.getElementById('staffJobsCount');
  const jobsListEl = document.getElementById('staffJobsList');
  const weeklyEarningsEl = document.getElementById('staffWeeklyEarnings');
  const netPayoutEl = document.getElementById('staffNetPayout');
  const ledgerEl = document.getElementById('staffEarningsLedger');
  const historyListEl = document.getElementById('staffHistoryList');

  const todayEarn = staff.todayEarnings || 2450;
  const weeklyEarn = Math.round(todayEarn * 3.2);
  const netPayout = Math.round(weeklyEarn * 0.70);

  if (nameEl) nameEl.textContent = staff.name || 'Temizlik Uzmanı';
  if (emailEl) emailEl.textContent = `${staff.email} | 📍 ${staff.city} (${staff.district || 'Tüm İlçeler'})`;
  if (ratingEl) ratingEl.textContent = `★ ${staff.rating || '4.98'} (${staff.completedJobs || 142} Başarılı Görev)`;
  if (earningsEl) earningsEl.textContent = `${todayEarn.toLocaleString('tr-TR')} TL`;
  if (weeklyEarningsEl) weeklyEarningsEl.textContent = `${weeklyEarn.toLocaleString('tr-TR')} TL`;
  if (netPayoutEl) netPayoutEl.textContent = `${netPayout.toLocaleString('tr-TR')} TL`;

  const jobs = getLiveStaffJobs();
  const activeJobs = jobs.filter(j => j.status !== 'Tamamlandı');
  const completedJobs = jobs.filter(j => j.status === 'Tamamlandı');

  if (jobsCountEl) jobsCountEl.textContent = `${activeJobs.length} Aktif Görev`;

  // Render Live Jobs
  if (jobsListEl) {
    if (activeJobs.length === 0) {
      jobsListEl.innerHTML = '<div class="user-empty-bookings"><strong>🎉 Bölgenizde bekleyen aktif görev bulunmuyor. Yeni işler geldiğinde anında burada listelenecektir.</strong></div>';
    } else {
      jobsListEl.innerHTML = activeJobs.map(j => {
        let statusBadge = `<span class="ub-status badge-pending">⏳ ${escapeHTML(j.status || 'Beklemede')}</span>`;
        if (j.status === 'Yolda') statusBadge = `<span class="ub-status badge-enroute">🚗 Yolda</span>`;
        if (j.status === 'Temizlik Başladı') statusBadge = `<span class="ub-status badge-progress">⚡ Temizlik Yapılıyor</span>`;

        const mapsQuery = encodeURIComponent(`${j.customerAddress}, ${j.city}`);
        const waText = encodeURIComponent(`Merhaba ${j.customerName}, RELAXAX Temizlik ekibinizden yazıyorum. Temizlik randevunuz için yola çıktım.`);

        return `
          <div class="staff-job-card">
            <div class="sjc-header">
              <div class="sjc-id-wrap">
                <span class="sjc-code">#${escapeHTML(j.orderCode || j.id)}</span>
                <span class="sjc-service">${escapeHTML(j.service)}</span>
              </div>
              ${statusBadge}
            </div>

            <div class="sjc-grid">
              <div class="sjc-item">
                <span class="sjc-lbl">👤 Müşteri:</span>
                <strong>${escapeHTML(j.customerName)}</strong>
              </div>
              <div class="sjc-item">
                <span class="sjc-lbl">🗓️ Randevu Zamanı:</span>
                <strong>${escapeHTML(j.date)} | ${escapeHTML(j.time)}</strong>
              </div>
              <div class="sjc-item sjc-item-full">
                <span class="sjc-lbl">📍 Açık Adres:</span>
                <span>${escapeHTML(j.customerAddress)}</span>
              </div>
              ${j.notes ? `<div class="sjc-item sjc-item-full"><span class="sjc-lbl">📝 Müşteri Notu:</span><em style="color:#fde047;">${escapeHTML(j.notes)}</em></div>` : ''}
              <div class="sjc-item">
                <span class="sjc-lbl">💰 Hizmet Bedeli:</span>
                <strong style="color:#38bdf8; font-size:1.05rem;">${escapeHTML(j.finalPrice)}</strong>
              </div>
              <div class="sjc-item">
                <span class="sjc-lbl">💵 Sizin Hak Edişiniz (%70):</span>
                <strong style="color:#34d399; font-size:1.05rem;">${Math.round((parseFloat(String(j.finalPrice).replace(/[^0-9.,]/g, '').replace(',', '.')) || 2000) * 0.70).toLocaleString('tr-TR')} TL</strong>
              </div>
            </div>

            <div class="sjc-actions-bar">
              <div class="sjc-comms">
                <a href="https://maps.google.com/?q=${mapsQuery}" target="_blank" rel="noopener noreferrer" class="btn-sjc-action maps">🗺️ Harita Yol Tarifi</a>
                <a href="tel:${escapeHTML(j.customerPhone)}" class="btn-sjc-action call">📞 Ara</a>
                <a href="https://wa.me/90${escapeHTML(j.customerPhone.replace(/\D/g, ''))}?text=${waText}" target="_blank" rel="noopener noreferrer" class="btn-sjc-action wa">💬 WhatsApp</a>
              </div>

              <div class="sjc-status-btns">
                <button type="button" class="btn-job-status ${j.status === 'Yolda' ? 'active' : ''}" onclick="window.updateStaffJobStatusGlobal('${escapeHTML(j.id)}', 'Yolda')">🚗 Yola Çıktım</button>
                <button type="button" class="btn-job-status ${j.status === 'Temizlik Başladı' ? 'active' : ''}" onclick="window.updateStaffJobStatusGlobal('${escapeHTML(j.id)}', 'Temizlik Başladı')">✨ Temizlik Başladı</button>
                <button type="button" class="btn-job-status ${j.status === 'Tamamlandı' ? 'active' : ''}" onclick="window.updateStaffJobStatusGlobal('${escapeHTML(j.id)}', 'Tamamlandı')">✅ Tamamlandı</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render Completed History
  if (historyListEl) {
    if (completedJobs.length === 0) {
      historyListEl.innerHTML = '<div class="empty-sub-item">Henüz tamamlanan görev arşiviniz bulunmuyor.</div>';
    } else {
      historyListEl.innerHTML = completedJobs.map(j => `
        <div class="history-item-card">
          <div class="hic-left">
            <span class="hic-code">#${escapeHTML(j.orderCode || j.id)}</span>
            <strong>${escapeHTML(j.service)}</strong>
            <span>👤 ${escapeHTML(j.customerName)} | 📍 ${escapeHTML(j.customerAddress)}</span>
          </div>
          <div class="hic-right">
            <span class="badge-success">✓ Teslim Edildi</span>
            <strong class="hic-earn">+${Math.round((parseFloat(String(j.finalPrice).replace(/[^0-9.,]/g, '').replace(',', '.')) || 2000) * 0.70).toLocaleString('tr-TR')} TL</strong>
          </div>
        </div>
      `).join('');
    }
  }

  // Render Earnings Ledger
  if (ledgerEl) {
    ledgerEl.innerHTML = `
      <table class="staff-ledger-table">
        <thead>
          <tr>
            <th>İşlem Kodu</th>
            <th>Müşteri</th>
            <th>Hizmet</th>
            <th>Tutar</th>
            <th>Hak Ediş (%70)</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          ${jobs.map(j => `
            <tr>
              <td><code>#${escapeHTML(j.orderCode || j.id)}</code></td>
              <td>${escapeHTML(j.customerName)}</td>
              <td>${escapeHTML(j.service)}</td>
              <td>${escapeHTML(j.finalPrice)}</td>
              <td style="color:#34d399; font-weight:800;">+${Math.round((parseFloat(String(j.finalPrice).replace(/[^0-9.,]/g, '').replace(',', '.')) || 2000) * 0.70).toLocaleString('tr-TR')} TL</td>
              <td><span class="badge-tag ${j.status === 'Tamamlandı' ? 'paid' : 'pending'}">${j.status === 'Tamamlandı' ? '✓ Hak Edildi' : '⏳ İşlemde'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

export function renderAdminDashboard() {
  const admin = getCurrentUser();
  if (!admin || admin.role !== 'admin') return;

  const nameEl = document.getElementById('adminProfileName');
  const emailEl = document.getElementById('adminProfileEmail');
  const totalProdEl = document.getElementById('adminTotalProducts');
  const inStockEl = document.getElementById('adminInStockCount');
  const outOfStockEl = document.getElementById('adminOutOfStockCount');
  const catalogTableWrap = document.getElementById('adminCatalogTableWrap');
  const allOrdersList = document.getElementById('adminAllOrdersList');

  if (nameEl) nameEl.textContent = admin.name || 'Sistem Yöneticisi';
  if (emailEl) emailEl.textContent = `${admin.email} | Yetkili Katalog Yönetim Masası`;

  const items = getCatalogProducts();
  const inStockCount = items.filter(i => i.status === 'in_stock').length;
  const outOfStockCount = items.filter(i => i.status === 'out_of_stock').length;

  if (totalProdEl) totalProdEl.textContent = `${items.length} Öğe`;
  if (inStockEl) inStockEl.textContent = `${inStockCount} Satışta`;
  if (outOfStockEl) outOfStockEl.textContent = `${outOfStockCount} Tükendi`;

  // Render Catalog Management Table
  if (catalogTableWrap) {
    catalogTableWrap.innerHTML = `
      <table class="admin-catalog-table">
        <thead>
          <tr>
            <th>Görsel / İkon</th>
            <th>Ürün & Hizmet Adı</th>
            <th>Kategori</th>
            <th>Fiyat (TL)</th>
            <th>Stok / Satış Durumu</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const isStock = item.status === 'in_stock';
            return `
              <tr class="${!isStock ? 'row-out-of-stock' : ''}">
                <td class="act-thumb">
                  ${item.image ? `<img src="${item.image}" alt="${escapeHTML(item.title)}" class="act-img" />` : `<span class="act-icon">${item.icon || '✨'}</span>`}
                </td>
                <td class="act-name">
                  <strong>${escapeHTML(item.title)}</strong>
                  <span class="act-key">ID: <code>${escapeHTML(item.key)}</code></span>
                </td>
                <td><span class="act-cat-tag">${escapeHTML(item.categoryLabel || item.category)}</span></td>
                <td>
                  <strong style="color:#38bdf8;">${item.priceTR} TL</strong>
                  ${item.oldPriceTR ? `<span class="act-old-price">${item.oldPriceTR} TL</span>` : ''}
                </td>
                <td>
                  <button type="button" class="btn-stock-toggle ${isStock ? 'in-stock' : 'out-of-stock'}" onclick="window.toggleProductStockGlobal('${escapeHTML(item.key)}')">
                    ${isStock ? '🟢 Stokta Var (Satışta)' : '🔴 Tükendi (Stokta Yok)'}
                  </button>
                </td>
                <td class="act-actions">
                  <button type="button" class="btn-admin-act delete" onclick="window.deleteProductGlobal('${escapeHTML(item.key)}')">🗑️ Sil</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // Render All Orders
  if (allOrdersList) {
    const jobs = getLiveStaffJobs();
    if (jobs.length === 0) {
      allOrdersList.innerHTML = '<div class="empty-sub-item">Sistemde henüz kayıtlı sipariş bulunmuyor.</div>';
    } else {
      allOrdersList.innerHTML = jobs.map(j => `
        <div class="admin-order-item-card">
          <div class="aoic-left">
            <span class="aoic-code">#${escapeHTML(j.orderCode || j.id)}</span>
            <strong>${escapeHTML(j.service)}</strong>
            <span>👤 ${escapeHTML(j.customerName)} (${escapeHTML(j.customerPhone)}) | 📍 ${escapeHTML(j.customerAddress)}</span>
          </div>
          <div class="aoic-right">
            <span class="ub-status ${j.status === 'Tamamlandı' ? 'badge-success' : 'badge-progress'}">${escapeHTML(j.status || 'İşlemde')}</span>
            <strong style="color:#38bdf8; font-size:1.1rem;">${escapeHTML(j.finalPrice)}</strong>
          </div>
        </div>
      `).join('');
    }
  }
}

window.toggleProductStockGlobal = function(key) {
  toggleCatalogProductStatus(key);
  syncCatalogToDom();
};

window.deleteProductGlobal = function(key) {
  if (confirm(`"${key}" ürününü/hizmetini katalogdan silmek istediğinize emin misiniz?`)) {
    deleteCatalogProduct(key);
    syncCatalogToDom();
  }
};

export function initAuthEngine() {
  updateAuthUI();
  syncCatalogToDom();

  // Role selector buttons in modal header
  document.getElementById('btnRoleSelectCustomer')?.addEventListener('click', () => setAuthRoleMode('customer'));
  document.getElementById('btnRoleSelectStaff')?.addEventListener('click', () => setAuthRoleMode('staff'));
  document.getElementById('btnRoleSelectAdmin')?.addEventListener('click', () => setAuthRoleMode('admin'));

  // Attach navbar button trigger
  const authNavBtn = document.getElementById('cNavAuthBtn');
  if (authNavBtn) {
    authNavBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal();
    });
  }

  // Attach drawer item trigger
  const drawerAuthItem = document.getElementById('drawerAuthItem');
  if (drawerAuthItem) {
    drawerAuthItem.addEventListener('click', (e) => {
      e.preventDefault();
      const closeDrawerBtn = document.getElementById('closeMobileDrawerBtn');
      if (closeDrawerBtn) closeDrawerBtn.click();
      openAuthModal();
    });
  }

  // Modal close buttons
  document.getElementById('btnCloseAuthModal')?.addEventListener('click', closeAuthModal);
  document.getElementById('authModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'authModal') closeAuthModal();
  });

  // Tab buttons
  document.getElementById('tabAuthLoginBtn')?.addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tabAuthRegisterBtn')?.addEventListener('click', () => switchAuthTab('register'));
  document.getElementById('tabAuthProfileBtn')?.addEventListener('click', () => switchAuthTab('profile'));
  document.getElementById('tabAuthStaffLoginBtn')?.addEventListener('click', () => switchAuthTab('staff_login'));
  document.getElementById('tabAuthStaffApplyBtn')?.addEventListener('click', () => switchAuthTab('staff_apply'));
  document.getElementById('tabAuthStaffDashBtn')?.addEventListener('click', () => switchAuthTab('staff_dashboard'));
  document.getElementById('tabAuthAdminLoginBtn')?.addEventListener('click', () => switchAuthTab('admin_login'));
  document.getElementById('tabAuthAdminDashBtn')?.addEventListener('click', () => switchAuthTab('admin_dashboard'));

  // Sub-Navigation Tabs Switching (Customer, Staff, and Admin)
  document.querySelectorAll('.portal-subnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (!targetId) return;

      const parentModal = btn.closest('.auth-pane');
      if (parentModal) {
        parentModal.querySelectorAll('.portal-subnav-btn').forEach(b => b.classList.remove('active'));
        parentModal.querySelectorAll('.portal-subtab-pane').forEach(p => p.style.display = 'none');
        btn.classList.add('active');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.style.display = 'block';
      }
    });
  });

  // Form: Add New Customer Address
  const formAddAddress = document.getElementById('formAddNewAddress');
  if (formAddAddress) {
    formAddAddress.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = getCurrentUser();
      if (!user) return;

      const title = document.getElementById('addrTitle')?.value;
      const city = document.getElementById('addrCity')?.value || 'Istanbul';
      const district = document.getElementById('addrDistrict')?.value || '';
      const full = document.getElementById('addrFull')?.value || '';

      if (!title || !full) return;

      const addrs = getCustomerSavedAddresses(user.email);
      addrs.push({
        id: 'addr_' + Date.now(),
        title,
        city,
        district,
        fullAddress: full
      });
      saveCustomerSavedAddresses(user.email, addrs);
      renderCustomerAddresses(user.email);
      formAddAddress.reset();
      alert('✓ Yeni temizlik adresiniz başarıyla kaydedildi!');
    });
  }

  // Form: Update Customer Profile & Security
  const formUpdateProfile = document.getElementById('formUpdateCustomerProfile');
  const custProfileFeedback = document.getElementById('custProfileFeedback');
  if (formUpdateProfile) {
    formUpdateProfile.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = getCurrentUser();
      if (!user) return;

      const newName = document.getElementById('custEditName')?.value?.trim();
      const newPhone = document.getElementById('custEditPhone')?.value?.trim();
      const newPass = document.getElementById('custEditPassword')?.value?.trim();
      const newPassConfirm = document.getElementById('custEditPasswordConfirm')?.value?.trim();

      if (newPass && newPass !== newPassConfirm) {
        if (custProfileFeedback) {
          custProfileFeedback.style.display = 'block';
          custProfileFeedback.className = 'auth-feedback error';
          custProfileFeedback.textContent = '⚠️ Yeni şifreler birbiriyle eşleşmiyor.';
        }
        return;
      }

      const users = getRegisteredUsers();
      const target = users.find(u => u.id === user.id || u.email === user.email);
      if (target) {
        if (newName) target.name = newName;
        if (newPhone) target.phone = newPhone;
        if (newPass && newPass.length >= 6) target.password = newPass;
        saveRegisteredUsers(users);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(target));
        updateAuthUI();
        renderUserProfileDetails(target);

        if (custProfileFeedback) {
          custProfileFeedback.style.display = 'block';
          custProfileFeedback.className = 'auth-feedback success';
          custProfileFeedback.textContent = '✓ Profil bilgileriniz başarıyla güncellendi!';
          setTimeout(() => { if (custProfileFeedback) custProfileFeedback.style.display = 'none'; }, 2000);
        }
      }
    });
  }

  // Admin Add Product Form Submission
  const formAddProd = document.getElementById('formAdminAddProduct');
  const addProdFeedback = document.getElementById('adminAddProductFeedback');
  if (formAddProd) {
    formAddProd.addEventListener('submit', (e) => {
      e.preventDefault();
      const key = document.getElementById('newProdKey')?.value?.trim();
      const cat = document.getElementById('newProdCategory')?.value;
      const title = document.getElementById('newProdTitle')?.value?.trim();
      const priceTR = parseFloat(document.getElementById('newProdPriceTR')?.value) || 0;
      const oldPriceTR = parseFloat(document.getElementById('newProdOldPriceTR')?.value) || 0;
      const pricePL = parseFloat(document.getElementById('newProdPricePL')?.value) || 0;
      const status = document.getElementById('newProdStockStatus')?.value || 'in_stock';
      const image = document.getElementById('newProdImage')?.value?.trim() || '/images/product_rose_gift_box.webp';
      const desc = document.getElementById('newProdDesc')?.value?.trim() || '';

      if (!key || !title || !priceTR) {
        if (addProdFeedback) {
          addProdFeedback.style.display = 'block';
          addProdFeedback.className = 'auth-feedback error';
          addProdFeedback.textContent = '⚠️ Lütfen ürün kodu, başlık ve fiyat alanlarını doldurunuz.';
        }
        return;
      }

      const res = addCatalogProduct({
        key,
        title,
        category: cat,
        priceTR,
        oldPriceTR,
        pricePL,
        status,
        image,
        desc
      });

      if (res.success) {
        if (addProdFeedback) {
          addProdFeedback.style.display = 'block';
          addProdFeedback.className = 'auth-feedback success';
          addProdFeedback.textContent = `✓ "${title}" başarıyla kataloğa eklendi ve yayına alındı!`;
        }
        formAddProd.reset();
        setTimeout(() => {
          if (addProdFeedback) addProdFeedback.style.display = 'none';
          // Switch to catalog tab
          document.querySelector('.admin-subnav .portal-subnav-btn[data-target="adminSubTabCatalog"]')?.click();
        }, 1200);
      } else {
        if (addProdFeedback) {
          addProdFeedback.style.display = 'block';
          addProdFeedback.className = 'auth-feedback error';
          addProdFeedback.textContent = `⚠️ ${res.message}`;
        }
      }
    });
  }

  // Switch shortcuts
  document.getElementById('linkGoToRegister')?.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('register'); });
  document.getElementById('linkGoToLogin')?.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('login'); });
  document.getElementById('linkGoToStaffApply')?.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('staff_apply'); });
  document.getElementById('linkGoToStaffLogin')?.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('staff_login'); });

  // Customer Login Form Submission
  const loginForm = document.getElementById('authLoginForm');
  const loginFeedback = document.getElementById('authLoginFeedback');
  const btnSubmitLogin = document.getElementById('btnSubmitLogin');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value;
      const pass = document.getElementById('loginPassword')?.value;
      const remember = document.getElementById('loginRememberMe')?.checked ?? true;

      if (btnSubmitLogin) {
        btnSubmitLogin.disabled = true;
        btnSubmitLogin.innerHTML = '<span>Giriş yapılıyor... ⏳</span>';
      }

      const res = await loginUser(email, pass, remember, 'customer');

      if (btnSubmitLogin) {
        btnSubmitLogin.disabled = false;
        btnSubmitLogin.innerHTML = '<span>Giriş Yap ➔</span>';
      }

      if (res.success) {
        if (loginFeedback) {
          loginFeedback.style.display = 'block';
          loginFeedback.className = 'auth-feedback success';
          loginFeedback.textContent = `✓ Hoş geldiniz, ${res.user.name}! Giriş yapıldı.`;
        }
        setTimeout(() => {
          closeAuthModal();
          if (loginFeedback) loginFeedback.style.display = 'none';
        }, 800);
      } else {
        if (loginFeedback) {
          loginFeedback.style.display = 'block';
          loginFeedback.className = 'auth-feedback error';
          loginFeedback.textContent = `⚠️ ${res.message}`;
        }
      }
    });
  }

  // Staff Login Form Submission
  const staffLoginForm = document.getElementById('authStaffLoginForm');
  const staffLoginFeedback = document.getElementById('authStaffLoginFeedback');
  const btnSubmitStaffLogin = document.getElementById('btnSubmitStaffLogin');
  if (staffLoginForm) {
    staffLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('staffLoginEmail')?.value;
      const pass = document.getElementById('staffLoginPassword')?.value;
      const remember = document.getElementById('staffLoginRememberMe')?.checked ?? true;

      if (btnSubmitStaffLogin) {
        btnSubmitStaffLogin.disabled = true;
        btnSubmitStaffLogin.innerHTML = '<span>Uzman Paneli Doğrulanıyor... ⏳</span>';
      }

      const res = await loginUser(email, pass, remember, 'staff');

      if (btnSubmitStaffLogin) {
        btnSubmitStaffLogin.disabled = false;
        btnSubmitStaffLogin.innerHTML = '<span>Uzman Paneline Giriş Yap ➔</span>';
      }

      if (res.success) {
        if (staffLoginFeedback) {
          staffLoginFeedback.style.display = 'block';
          staffLoginFeedback.className = 'auth-feedback success';
          staffLoginFeedback.textContent = `⚡ Hoş geldiniz, ${res.user.name}! Görev paneli yükleniyor...`;
        }
        setTimeout(() => {
          if (staffLoginFeedback) staffLoginFeedback.style.display = 'none';
          switchAuthTab('staff_dashboard');
        }, 800);
      } else {
        if (staffLoginFeedback) {
          staffLoginFeedback.style.display = 'block';
          staffLoginFeedback.className = 'auth-feedback error';
          staffLoginFeedback.textContent = `⚠️ ${res.message}`;
        }
      }
    });
  }

  // Admin Login Form Submission
  const adminLoginForm = document.getElementById('authAdminLoginForm');
  const adminLoginFeedback = document.getElementById('authAdminLoginFeedback');
  const btnSubmitAdminLogin = document.getElementById('btnSubmitAdminLogin');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('adminLoginEmail')?.value;
      const pass = document.getElementById('adminLoginPassword')?.value;

      if (btnSubmitAdminLogin) {
        btnSubmitAdminLogin.disabled = true;
        btnSubmitAdminLogin.innerHTML = '<span>Yönetici Yetkisi Doğrulanıyor... ⏳</span>';
      }

      const res = await loginUser(email, pass, true, 'admin');

      if (btnSubmitAdminLogin) {
        btnSubmitAdminLogin.disabled = false;
        btnSubmitAdminLogin.innerHTML = '<span>Yönetim Paneline Giriş Yap ➔</span>';
      }

      if (res.success) {
        if (adminLoginFeedback) {
          adminLoginFeedback.style.display = 'block';
          adminLoginFeedback.className = 'auth-feedback success';
          adminLoginFeedback.textContent = `👑 Yönetici girişi başarılı! Katalog paneline aktarılıyorsunuz...`;
        }
        setTimeout(() => {
          if (adminLoginFeedback) adminLoginFeedback.style.display = 'none';
          switchAuthTab('admin_dashboard');
        }, 600);
      } else {
        if (adminLoginFeedback) {
          adminLoginFeedback.style.display = 'block';
          adminLoginFeedback.className = 'auth-feedback error';
          adminLoginFeedback.textContent = `⚠️ ${res.message}`;
        }
      }
    });
  }

  // Customer Register Form
  const registerForm = document.getElementById('authRegisterForm');
  const regFeedback = document.getElementById('authRegisterFeedback');
  const btnSubmitRegister = document.getElementById('btnSubmitRegister');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName')?.value;
      const email = document.getElementById('regEmail')?.value;
      const phone = document.getElementById('regPhone')?.value;
      const pass = document.getElementById('regPassword')?.value;
      const passConfirm = document.getElementById('regPasswordConfirm')?.value;
      const city = document.getElementById('regCity')?.value || 'Istanbul';

      if (pass !== passConfirm) {
        if (regFeedback) {
          regFeedback.style.display = 'block';
          regFeedback.className = 'auth-feedback error';
          regFeedback.textContent = '⚠️ Şifreler birbiriyle eşleşmiyor.';
        }
        return;
      }

      if (btnSubmitRegister) {
        btnSubmitRegister.disabled = true;
        btnSubmitRegister.innerHTML = '<span>Hesabınız Oluşturuluyor... ⏳</span>';
      }

      const res = await registerUser(name, email, phone, pass, city);

      if (btnSubmitRegister) {
        btnSubmitRegister.disabled = false;
        btnSubmitRegister.innerHTML = '<span>Hesabımı Oluştur & Giriş Yap ➔</span>';
      }

      if (res.success) {
        if (regFeedback) {
          regFeedback.style.display = 'block';
          regFeedback.className = 'auth-feedback success';
          regFeedback.textContent = `🎉 Tebrikler ${res.user.name}, hesabınız başarıyla açıldı! %15 indirim kuponunuz aktif.`;
        }
        setTimeout(() => {
          closeAuthModal();
          if (regFeedback) regFeedback.style.display = 'none';
        }, 1200);
      } else {
        if (regFeedback) {
          regFeedback.style.display = 'block';
          regFeedback.className = 'auth-feedback error';
          regFeedback.textContent = `⚠️ ${res.message}`;
        }
      }
    });
  }

  // Staff Application / Register Form
  const staffApplyForm = document.getElementById('authStaffApplyForm');
  const staffApplyFeedback = document.getElementById('authStaffApplyFeedback');
  const btnSubmitStaffApply = document.getElementById('btnSubmitStaffApply');
  if (staffApplyForm) {
    staffApplyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('staffRegName')?.value;
      const email = document.getElementById('staffRegEmail')?.value;
      const phone = document.getElementById('staffRegPhone')?.value;
      const pass = document.getElementById('staffRegPassword')?.value;
      const city = document.getElementById('staffRegCity')?.value || 'Istanbul';
      const district = document.getElementById('staffRegDistrict')?.value || 'Kadıköy';
      const exp = document.getElementById('staffRegExp')?.value || '3 Yıl';

      if (btnSubmitStaffApply) {
        btnSubmitStaffApply.disabled = true;
        btnSubmitStaffApply.innerHTML = '<span>Uzman Kaydı Yapılıyor... ⏳</span>';
      }

      const res = await registerStaff(name, email, phone, pass, city, district, exp);

      if (btnSubmitStaffApply) {
        btnSubmitStaffApply.disabled = false;
        btnSubmitStaffApply.innerHTML = '<span>Personel Kaydımı Tamamla & Başla ➔</span>';
      }

      if (res.success) {
        if (staffApplyFeedback) {
          staffApplyFeedback.style.display = 'block';
          staffApplyFeedback.className = 'auth-feedback success';
          staffApplyFeedback.textContent = `🎉 Tebrikler ${res.user.name}, personel hesabınız açıldı ve onaylandı! Görev paneline aktarılıyorsunuz...`;
        }
        setTimeout(() => {
          if (staffApplyFeedback) staffApplyFeedback.style.display = 'none';
          switchAuthTab('staff_dashboard');
        }, 1200);
      } else {
        if (staffApplyFeedback) {
          staffApplyFeedback.style.display = 'block';
          staffApplyFeedback.className = 'auth-feedback error';
          staffApplyFeedback.textContent = `⚠️ ${res.message}`;
        }
      }
    });
  }

  // Logout Buttons
  document.getElementById('btnLogoutUser')?.addEventListener('click', () => {
    logoutUser();
    switchAuthTab('login');
  });

  document.getElementById('btnLogoutStaff')?.addEventListener('click', () => {
    logoutUser();
    switchAuthTab('staff_login');
  });

  document.getElementById('btnLogoutAdmin')?.addEventListener('click', () => {
    logoutUser();
    switchAuthTab('admin_login');
  });

  // Password visibility toggles
  document.querySelectorAll('.btn-toggle-pwd-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.textContent = '👁️';
        }
      }
    });
  });
}

// Global public attachments
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
window.isStaffLoggedIn = isStaffLoggedIn;
window.logoutUserGlobal = logoutUser;
window.addBookingToUserGlobal = addBookingToUser;
window.updateStaffJobStatusGlobal = updateStaffJobStatus;
window.matchAndAssignCleaner = matchAndAssignCleaner;



