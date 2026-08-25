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
export function registerUser(name, email, phone, password, city = 'Istanbul', district = '', street = '') {
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
    return { success: false, message: 'Bu e-posta adresi ile kayıtlı bir müşteri hesabı zaten var.' };
  }

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
export function registerStaff(name, email, phone, password, city = 'Istanbul', district = 'Kadıköy', experience = '3 Yıl', specialties = []) {
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

// Universal Login (Customer or Staff)
export function loginUser(email, password, rememberMe = true, expectedRole = 'any') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, message: 'Lütfen e-posta ve şifrenizi giriniz.' };
  }

  // Check Staff First if expectedRole is staff or any
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

  // Check Customers
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

  return { success: false, message: 'E-posta veya şifre hatalı. Lütfen kontrol ediniz.' };
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
  sessionStorage.removeItem(STORAGE_SESSION_KEY);
  updateAuthUI();
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

export function addBookingToUser(bookingData) {
  if (!bookingData) return;
  
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

export function updateAuthUI() {
  const user = getCurrentUser();
  const authNavBtn = document.getElementById('cNavAuthBtn');
  const authNavText = document.getElementById('cNavAuthText');
  const authNavIcon = document.getElementById('cNavAuthIcon');
  const drawerAuthItem = document.getElementById('drawerAuthItem');

  if (user) {
    if (user.role === 'staff') {
      const staffShort = user.name ? user.name.split(' ')[0] : 'Uzman';
      if (authNavBtn) {
        authNavBtn.classList.add('logged-in', 'staff-mode');
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
        authNavBtn.classList.remove('staff-mode');
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
      authNavBtn.classList.remove('logged-in', 'staff-mode');
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
    if (user.role === 'staff') {
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
  const badgeModal = document.getElementById('authModalBadge');
  const titleModal = document.getElementById('authModalTitle');

  if (role === 'staff') {
    if (btnRoleCust) btnRoleCust.classList.remove('active');
    if (btnRoleStaff) btnRoleStaff.classList.add('active');
    if (badgeModal) badgeModal.textContent = '⚡ RELAXAX PERSONEL & UZMAN MERKEZİ';
    if (titleModal) titleModal.textContent = 'Temizlik Uzmanı & Görev Paneli';

    document.querySelectorAll('.customer-only-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.staff-only-tab').forEach(el => el.style.display = 'flex');
    
    const user = getCurrentUser();
    if (user && user.role === 'staff') {
      switchAuthTab('staff_dashboard');
    } else {
      switchAuthTab('staff_login');
    }
  } else {
    if (btnRoleCust) btnRoleCust.classList.add('active');
    if (btnRoleStaff) btnRoleStaff.classList.remove('active');
    if (badgeModal) badgeModal.textContent = '✨ RELAXAX MÜŞTERİ MERKEZİ';
    if (titleModal) titleModal.textContent = 'Müşteri Hesabı & Rezervasyonlarım';

    document.querySelectorAll('.customer-only-tab').forEach(el => el.style.display = 'flex');
    document.querySelectorAll('.staff-only-tab').forEach(el => el.style.display = 'none');
    
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
    'tabAuthStaffLoginBtn', 'tabAuthStaffApplyBtn', 'tabAuthStaffDashBtn'
  ];
  const panes = [
    'paneAuthLogin', 'paneAuthRegister', 'paneAuthProfile',
    'paneAuthStaffLogin', 'paneAuthStaffApply', 'paneAuthStaffDashboard'
  ];

  tabs.forEach(id => document.getElementById(id)?.classList.remove('active'));
  panes.forEach(id => {
    const p = document.getElementById(id);
    if (p) p.style.display = 'none';
  });

  const user = getCurrentUser();

  if (tabName === 'staff_dashboard' && user && user.role === 'staff') {
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

function renderUserProfileDetails(user) {
  const nameEl = document.getElementById('userProfileName');
  const emailEl = document.getElementById('userProfileEmail');
  const phoneEl = document.getElementById('userProfilePhone');
  const vipScoreEl = document.getElementById('userVipScore');
  const bookingsListEl = document.getElementById('userBookingsList');

  if (nameEl) nameEl.textContent = user.name || 'Değerli Müşterimiz';
  if (emailEl) emailEl.textContent = user.email || '';
  if (phoneEl) phoneEl.textContent = user.phone || 'Telefon Kayıtlı Değil';
  if (vipScoreEl) vipScoreEl.textContent = (user.vipScore || 100) + ' Puan (VIP Üye)';

  if (bookingsListEl) {
    const bookings = getUserBookings();
    if (bookings.length === 0) {
      bookingsListEl.innerHTML = `
        <div class="user-empty-bookings">
          <span style="font-size: 2rem; margin-bottom: 6px; display: block;">🧹</span>
          <strong>Henüz kayıtlı bir temizlik siparişiniz yok.</strong>
          <p>İlk siparişinize özel %15 indirim kuponunuz: <code style="color: #fbbf24; font-weight: bold;">HOSGELDIN15</code></p>
          <button type="button" class="btn-user-book-now" onclick="if(typeof openBookingScreen==='function'){closeAuthModal(); openBookingScreen();}">✨ Hemen Fiyat Hesapla & Randevu Al</button>
        </div>
      `;
    } else {
      bookingsListEl.innerHTML = bookings.map(b => `
        <div class="user-booking-card">
          <div class="ub-header">
            <span class="ub-code">#${escapeHTML(b.orderCode || b.resCode || 'RLX-REZERVASYON')}</span>
            <span class="ub-status badge-success">✓ ${escapeHTML(b.status || 'Onaylandı')}</span>
          </div>
          <div class="ub-details">
            <div><strong>Hizmet:</strong> ${escapeHTML(b.service || 'Standart Daire Temizliği')}</div>
            <div><strong>Tarih:</strong> 🗓️ ${escapeHTML(b.date || 'Belirtilmedi')} | 🕒 ${escapeHTML(b.time || '09:00')}</div>
            <div><strong>Adres:</strong> 📍 ${escapeHTML(b.city || 'İstanbul')}, ${escapeHTML(b.district || '')} ${escapeHTML(b.street || '')}</div>
            <div class="ub-total"><strong>Toplam Tutar:</strong> <span style="color:#38bdf8; font-weight:800;">${escapeHTML(b.finalPrice || b.subtotal || b.total || 'Fiyat Hesaplanıyor')}</span></div>
          </div>
        </div>
      `).join('');
    }
  }
}

function renderStaffDashboard() {
  const staff = getCurrentUser();
  if (!staff || staff.role !== 'staff') return;

  const nameEl = document.getElementById('staffProfileName');
  const emailEl = document.getElementById('staffProfileEmail');
  const ratingEl = document.getElementById('staffRatingBadge');
  const earningsEl = document.getElementById('staffTodayEarnings');
  const jobsCountEl = document.getElementById('staffJobsCount');
  const jobsListEl = document.getElementById('staffJobsList');

  if (nameEl) nameEl.textContent = staff.name || 'Temizlik Uzmanı';
  if (emailEl) emailEl.textContent = `${staff.email} | 📍 ${staff.city} (${staff.district || 'Tüm İlçeler'})`;
  if (ratingEl) ratingEl.textContent = `★ ${staff.rating || '4.98'} (${staff.completedJobs || 142} Başarılı Görev)`;
  if (earningsEl) earningsEl.textContent = `${(staff.todayEarnings || 2450).toLocaleString('tr-TR')} TL`;

  const jobs = getLiveStaffJobs();
  if (jobsCountEl) jobsCountEl.textContent = `${jobs.length} Aktif Görev`;

  if (jobsListEl) {
    if (jobs.length === 0) {
      jobsListEl.innerHTML = '<div class="user-empty-bookings"><strong>Şu anda bölgenizde bekleyen yeni görev bulunmuyor.</strong></div>';
    } else {
      jobsListEl.innerHTML = jobs.map(j => {
        let statusBadge = `<span class="ub-status badge-pending">⏳ ${escapeHTML(j.status || 'Beklemede')}</span>`;
        if (j.status === 'Yolda') statusBadge = `<span class="ub-status badge-enroute">🚗 Yolda</span>`;
        if (j.status === 'Temizlik Başladı') statusBadge = `<span class="ub-status badge-progress">⚡ Temizlik Yapılıyor</span>`;
        if (j.status === 'Tamamlandı') statusBadge = `<span class="ub-status badge-success">✓ Tamamlandı</span>`;

        const mapsQuery = encodeURIComponent(`${j.customerAddress}, ${j.city}`);
        const waText = encodeURIComponent(`Merhaba ${j.customerName}, RELAXAX Temizlik ekibinizden yazıyorum. Randevunuz hakkında bilgi vermek istedim.`);

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
}

export function initAuthEngine() {
  updateAuthUI();

  // Role selector buttons in modal header
  document.getElementById('btnRoleSelectCustomer')?.addEventListener('click', () => setAuthRoleMode('customer'));
  document.getElementById('btnRoleSelectStaff')?.addEventListener('click', () => setAuthRoleMode('staff'));

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

  // Switch shortcuts
  document.getElementById('linkGoToRegister')?.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('register'); });
  document.getElementById('linkGoToLogin')?.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('login'); });
  document.getElementById('linkGoToStaffApply')?.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('staff_apply'); });
  document.getElementById('linkGoToStaffLogin')?.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('staff_login'); });

  // Quick Staff Demo Login Preset Buttons
  document.getElementById('btnQuickStaffDemo1')?.addEventListener('click', () => {
    const emailEl = document.getElementById('staffLoginEmail');
    const passEl = document.getElementById('staffLoginPassword');
    if (emailEl) emailEl.value = 'uzman@relaxax.com';
    if (passEl) passEl.value = '123456';
    document.getElementById('btnSubmitStaffLogin')?.click();
  });

  document.getElementById('btnQuickStaffDemo2')?.addEventListener('click', () => {
    const emailEl = document.getElementById('staffLoginEmail');
    const passEl = document.getElementById('staffLoginPassword');
    if (emailEl) emailEl.value = 'mehmet.uzman@relaxax.com';
    if (passEl) passEl.value = '123456';
    document.getElementById('btnSubmitStaffLogin')?.click();
  });

  // Customer Login Form Submission
  const loginForm = document.getElementById('authLoginForm');
  const loginFeedback = document.getElementById('authLoginFeedback');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value;
      const pass = document.getElementById('loginPassword')?.value;
      const remember = document.getElementById('loginRememberMe')?.checked ?? true;

      const res = loginUser(email, pass, remember, 'customer');
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
  if (staffLoginForm) {
    staffLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('staffLoginEmail')?.value;
      const pass = document.getElementById('staffLoginPassword')?.value;
      const remember = document.getElementById('staffLoginRememberMe')?.checked ?? true;

      const res = loginUser(email, pass, remember, 'staff');
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

  // Customer Register Form
  const registerForm = document.getElementById('authRegisterForm');
  const regFeedback = document.getElementById('authRegisterFeedback');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
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

      const res = registerUser(name, email, phone, pass, city);
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
  if (staffApplyForm) {
    staffApplyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('staffRegName')?.value;
      const email = document.getElementById('staffRegEmail')?.value;
      const phone = document.getElementById('staffRegPhone')?.value;
      const pass = document.getElementById('staffRegPassword')?.value;
      const city = document.getElementById('staffRegCity')?.value || 'Istanbul';
      const district = document.getElementById('staffRegDistrict')?.value || 'Kadıköy';
      const exp = document.getElementById('staffRegExp')?.value || '3 Yıl';

      const res = registerStaff(name, email, phone, pass, city, district, exp);
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

