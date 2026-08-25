/**
 * @fileoverview User Authentication & Profile Engine (Hesap Açma / Giriş / Profil)
 * Handles registration, login, password management, session caching and booking pre-fill.
 */

import { STATE } from '../state.js';
import { escapeHTML, sanitizeInputVal } from './domUtils.js';

const STORAGE_USERS_KEY = 'relaxax_registered_users';
const STORAGE_SESSION_KEY = 'relaxax_user_session';
const STORAGE_BOOKINGS_PREFIX = 'relaxax_user_bookings_';

// In-memory / localStorage database of registered accounts
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

export function registerUser(name, email, phone, password, city = 'Istanbul', district = '', street = '') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim();
  const cleanPhone = (phone || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanName || cleanName.length < 2) {
    return { success: false, message: 'Lütfen geçerli bir Ad Soyad giriniz.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, message: 'Lütfen geçerli bir E-posta adresi giriniz.' };
  }
  if (!cleanPhone || cleanPhone.length < 7) {
    return { success: false, message: 'Lütfen geçerli bir Telefon numarası giriniz.' };
  }
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, message: 'Şifreniz en az 6 karakter olmalıdır.' };
  }

  const users = getRegisteredUsers();
  if (users.some(u => u.email === cleanEmail)) {
    return { success: false, message: 'Bu e-posta adresi ile kayıtlı bir hesap zaten var.' };
  }

  const newUser = {
    id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    password: cleanPass, // For real-world production, server hashes with bcrypt
    city: city,
    district: district,
    street: street,
    createdAt: new Date().toISOString(),
    vipScore: 100,
    activePromo: 'HOSGELDIN15'
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  // Auto login after registration
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    city: newUser.city,
    district: newUser.district,
    street: newUser.street,
    vipScore: newUser.vipScore,
    activePromo: newUser.activePromo
  }));

  updateAuthUI();
  prefillBookingWizardWithUser();
  return { success: true, user: newUser };
}

export function loginUser(email, password, rememberMe = true) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, message: 'Lütfen e-posta ve şifrenizi giriniz.' };
  }

  const users = getRegisteredUsers();
  const found = users.find(u => u.email === cleanEmail && u.password === cleanPass);

  if (!found) {
    // Check demo / test login shortcut if users list is empty
    if (users.length === 0 && cleanEmail.includes('@') && cleanPass.length >= 6) {
      // Auto-create on first try for zero-friction testing
      return registerUser('Müşteri', cleanEmail, '05466479004', cleanPass);
    }
    return { success: false, message: 'E-posta veya şifre hatalı. Lütfen tekrar deneyiniz.' };
  }

  const sessionData = {
    id: found.id,
    name: found.name,
    email: found.email,
    phone: found.phone,
    city: found.city,
    district: found.district,
    street: found.street,
    vipScore: found.vipScore || 100,
    activePromo: found.activePromo || 'HOSGELDIN15'
  };

  if (rememberMe) {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
  } else {
    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
  }

  updateAuthUI();
  prefillBookingWizardWithUser();
  return { success: true, user: sessionData };
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
  sessionStorage.removeItem(STORAGE_SESSION_KEY);
  updateAuthUI();
  if (typeof window.showGlobalToast === 'function') {
    window.showGlobalToast('Hesabınızdan güvenle çıkış yapıldı.');
  }
}

export function getUserBookings() {
  const user = getCurrentUser();
  if (!user) return [];
  try {
    const key = STORAGE_BOOKINGS_PREFIX + user.email;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    // Also include global booking history if matching email
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
  const user = getCurrentUser();
  if (!user || !bookingData) return;
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

export function prefillBookingWizardWithUser() {
  const user = getCurrentUser();
  if (!user) return;

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
    // Logged In State
    const firstName = user.name ? user.name.split(' ')[0] : 'Hesabım';
    if (authNavBtn) {
      authNavBtn.classList.add('logged-in');
      authNavBtn.title = `${user.name} (${user.email}) - Profil ve Randevularım`;
    }
    if (authNavText) authNavText.textContent = `👤 ${firstName}`;
    if (authNavIcon) authNavIcon.textContent = '✨';

    if (drawerAuthItem) {
      drawerAuthItem.innerHTML = `👤 <strong>${escapeHTML(user.name)}</strong> (Profilim)`;
    }
  } else {
    // Guest State
    if (authNavBtn) {
      authNavBtn.classList.remove('logged-in');
      authNavBtn.title = 'Giriş Yap / Hesap Aç';
    }
    if (authNavText) authNavText.textContent = 'Giriş / Kayıt';
    if (authNavIcon) authNavIcon.textContent = '👤';

    if (drawerAuthItem) {
      drawerAuthItem.innerHTML = '👤 Giriş Yap / Hesap Aç';
    }
  }
}

export function openAuthModal(initialTab = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  modal.style.display = 'flex';
  modal.removeAttribute('hidden');
  modal.classList.add('active');

  const user = getCurrentUser();
  if (user) {
    switchAuthTab('profile');
    renderUserProfileDetails(user);
  } else {
    switchAuthTab(initialTab);
  }

  // GSAP Entrance
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

export function switchAuthTab(tabName) {
  const tabLoginBtn = document.getElementById('tabAuthLoginBtn');
  const tabRegisterBtn = document.getElementById('tabAuthRegisterBtn');
  const tabProfileBtn = document.getElementById('tabAuthProfileBtn');

  const paneLogin = document.getElementById('paneAuthLogin');
  const paneRegister = document.getElementById('paneAuthRegister');
  const paneProfile = document.getElementById('paneAuthProfile');

  [tabLoginBtn, tabRegisterBtn, tabProfileBtn].forEach(btn => btn && btn.classList.remove('active'));
  [paneLogin, paneRegister, paneProfile].forEach(pane => pane && (pane.style.display = 'none'));

  const user = getCurrentUser();
  if (tabProfileBtn) {
    tabProfileBtn.style.display = user ? 'flex' : 'none';
  }

  if (tabName === 'profile' && user) {
    if (tabProfileBtn) tabProfileBtn.classList.add('active');
    if (paneProfile) paneProfile.style.display = 'block';
    renderUserProfileDetails(user);
  } else if (tabName === 'register') {
    if (tabRegisterBtn) tabRegisterBtn.classList.add('active');
    if (paneRegister) paneRegister.style.display = 'block';
  } else {
    if (tabLoginBtn) tabLoginBtn.classList.add('active');
    if (paneLogin) paneLogin.style.display = 'block';
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

export function initAuthEngine() {
  updateAuthUI();

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

  // Switch to Register shortcut link in login pane
  document.getElementById('linkGoToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('register');
  });

  // Switch to Login shortcut link in register pane
  document.getElementById('linkGoToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('login');
  });

  // Login Form Submission
  const loginForm = document.getElementById('authLoginForm');
  const loginFeedback = document.getElementById('authLoginFeedback');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value;
      const pass = document.getElementById('loginPassword')?.value;
      const remember = document.getElementById('loginRememberMe')?.checked ?? true;

      const res = loginUser(email, pass, remember);
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

  // Register Form Submission
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

  // Logout Button
  document.getElementById('btnLogoutUser')?.addEventListener('click', () => {
    logoutUser();
    switchAuthTab('login');
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
window.logoutUserGlobal = logoutUser;
window.addBookingToUserGlobal = addBookingToUser;
