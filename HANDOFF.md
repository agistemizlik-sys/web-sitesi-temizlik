# Aclean — Devir Teslim Notu (Hand-off)

Son güncelleme: 2026-07-06 · Son commit: `76b1af3` (main)

Bu doküman, projede çalışacak herkes (insan veya AI aracı) için mevcut durumu,
dokunulmaması gerekenleri ve sıradaki işleri özetler.

---

## 1. Mevcut Durum (doğrulandı)

**Tasarım dili — açık editoryal tema (753d00d):**
- Zemin `#f7f6f2` sıcak kâğıt, beyaz kartlar, mürekkep metin (`#1b1d22`), ince
  `--clr-line` kenarlıklar, yumuşak `--shadow-card` gölgeler.
- Başlık fontu **Fraunces** (Cinzel kaldırıldı), gövde Inter, sinema sahne
  başlıkları Cormorant Garamond italic.
- Tüm sci-fi/HUD kalıntıları kaldırıldı: telemetri, koordinat yazıları,
  retiküller, crosshair, köşe braketleri, "GATEWAY // SECURE" tarzı mono
  metinler. **Bunlar geri getirilmeyecek.**
- Harita: Carto **light_all** katmanı, beyaz hap etiketler, gerçek şehir
  koordinatları, `fitBounds` + `zoomSnap: 0.25` ile her ekranda 6 şehir görünür.
- Sinema videoları içerik olarak karanlık kalır (film); üzerindeki tüm
  arayüz katmanları (sahne metin kartları, hizmet seçimi, rezervasyon, modal,
  nav) açık temadadır.

**Sinema navigasyonu — slayt/adım modeli (c36317a + 76b1af3):**
- Sayfa kaydırması yok; `goToStep(0–14)`: 0 giriş, 1 hizmet seçimi,
  2–13 on iki karakter sahnesi, 14 rezervasyon.
- İlerleme yolları: boş alana tıklama/dokunma, **fare tekerleği** (yukarı =
  geri), **ok/PageUp-Down/Space tuşları**, **dikey kaydırma (swipe)** ve hizmet
  kartındaki **"Devam Et"** butonu. Nav linkleri adımlara bağlı.
- Modal, rezervasyon ekranı, çekmece ve portal içinde tekerlek doğal kaydırma
  olarak çalışır (adım değiştirmez).

**76b1af3 ile giderilen kritik hatalar (tekrarlamayın):**
1. Tekerlek global olarak bloklanmış ama adım ilerletmeye bağlanmamıştı →
   masaüstünde sahnelere hiç ulaşılamıyordu ("monalisa/sumo görünmüyor").
2. LERP render döngüsü hedefler yerine oturunca kendini durduruyor; `goToStep`
   hedefleri **GSAP tween'leriyle sonradan** değiştirdiği için yarış durumunda
   sahne görünmez oynuyordu. Çözüm: hedef değiştiren her tween'de
   `onUpdate: triggerCinemaLoop`. **Bu onUpdate'leri silmeyin.**
3. iOS çözücü-kilidi (play→pause probu) ≤768px'te aktif videoyu donduruyordu;
   artık aktif video muaf + 1 sn aralıklı kendini-toparlama var.
4. Antigravity'nin commit'lenmemiş düzenlemesi şehir koordinatlarını gerçek
   konumlarından kaydırmıştı (İstanbul pini denize düşüyordu) → gerçek
   koordinatlar geri alındı. Orijinal düzenleme `git stash`'te duruyor:
   "antigravity-uncommitted-mainjs". İşe yarayan kısımları (haritayı sahne
   görünür olduktan sonra başlatma, `window.turkeyMapInstance`) commit'te.

---

## 2. Kurallar / Korkuluklar

- **AI-görünümü yasak:** neon glow, monospace teknik etiket, `//` ayraçlı sahte
  telemetri, koordinat süsleri, HUD köşe braketi, shimmer/borderSpin eklemeyin.
- Yeni UI daima açık tema tokenlarıyla: `--clr-bg/-surface/-ink/-muted/-line`,
  `--shadow-card`, Fraunces başlık.
- Şehir koordinatları gerçek coğrafi konumlardır; etiket çakışması çözümü
  koordinat oynatmak değil, etiket offset'i veya zoom ayarıdır.
- `renderCinemaLoop`'un "settled → suspend" optimizasyonu korunmalı; hedef
  değiştiren her yeni tween'e `onUpdate: triggerCinemaLoop` eklenmeli.
- Metinler insan dilinde ve Title Case/normal yazımda (TR'de büyük İ sorunu
  için `toLocaleUpperCase('tr-TR')`).

## 2.1 Sinema Video Ölçüleri ve Kaplama Kuralları (kanonik referans)

Bu bölüm sahne arkasındaki tüm videoların doğal ölçülerini ve boyutlandırma
sözleşmesini tanımlar. **Yeni bir stil/refactor bu kurallara uymalıdır.**

**Sahne (stage):**
- `.cinema-stage`: `position: fixed; inset: 0` → her zaman tam görüntü alanı
  (100vw × 100vh, Safari için `--safari-vh` / `100dvh` fallback), zemin `#000`.
- `#cinema-section`: `100vh/100dvh`, `overflow: hidden`, `touch-action: none`
  (sayfa kaydırması yok; navigasyon adım tabanlı).

**Sahne videoları (12 adet, `#video-scene-1..12`):**

| Video | Dosya | Doğal çözünürlük | Oran | Süre |
|---|---|---|---|---|
| 1 Mona Lisa | monalisa.mp4 | 560×704 | 0.795 (dikey) | 5.2s |
| 2 Samuray | samurai.mp4 | 832×464 | 1.793 (yatay) | 5.2s |
| 3 Teyze | grandmother.mp4 | 560×704 | 0.795 (dikey) | 5.2s |
| 4 Astronot | astronaut.mp4 | 832×464 | 1.793 (yatay) | 5.2s |
| 5 Kovboy | cowboy.mp4 | 832×464 | 1.793 (yatay) | 5.2s |
| 6 Gandalf | gandalf.mp4 | 832×464 | 1.793 (yatay) | 5.2s |
| 7 Şövalye | knight.mp4 | 624×624 | 1.000 (kare) | 5.2s |
| 8 Keşiş | monk.mp4 | 832×464 | 1.793 (yatay) | 5.2s |
| 9 Romalı | roman.mp4 | 832×464 | 1.793 (yatay) | 5.2s |
| 10 Sumo | sumo.mp4 | 560×704 | 0.795 (dikey) | 5.2s |
| 11 Düşes | victorian.mp4 | 832×464 | 1.793 (yatay) | 5.2s |
| 12 Viking | viking.mp4 | 832×464 | 1.793 (yatay) | 5.2s |

**Şehir giriş videoları (`.intro-video`):** city_istanbul/izmir/samsun/
kocaeli/sakarya/balikesir.mp4 → 2160×3840 (9:16 dikey, 10s);
city_warszawa.mp4 → 832×464 (yatay, 5.2s).

**Kaplama mimarisi — "fit + ambiyans dolgu" (9c27ef7 sonrası nihai hali):**

İki katman birlikte çalışır; ekran her zaman %100 dolu, video ise asla
bozulmaz/kırpılıp konusunu kaybetmez ("tam kaplayan ama tam oturmuş"):

1. **Ambiyans dolgu katmanı** — `#cinemaBackfill` canvas'ı
   (`.cinema-backfill`), `.cinema-stage` içinde videoların ARKASINDA
   (z-index 1 / videolar 2 / iris 8):
   - Konum: `top/left: -6%`, `width/height: 112%` (blur kenar solmasını
     taşırarak gizler).
   - Görsel: `filter: blur(38px) brightness(0.68) saturate(1.15)`,
     `opacity` geçişi 0.6s; `.active` sınıfı `goToStep` tarafından yönetilir
     (sahne adımları 2–13'te açık; 0/1/14'te kapalı).
   - İçerik: `drawCinemaBackfill(video)` (main.js) aktif videonun karesini
     **96 × round(96·vh/vw)** iç çözünürlükte cover-kırpımla çizer; sahne
     aktifken `checkProgress` rAF'inde her karede güncellenir (blur nedeniyle
     maliyet ihmal edilebilir).
2. **Ön plan videosu** — eleman her zaman `width/height: 100%` (= viewport):
   - **Yatay viewport + yatay kaynak (832×464 ≈ 16:9):** `object-fit: cover`,
     `object-position: center var(--video-y)` — ORİJİNAL sinematik davranış,
     değişmedi (oranlar ~eş olduğundan kırpma <%1).
   - **Yatay viewport + dikey/kare kaynak** (`.portrait-video`):
     `object-fit: contain; object-position: center` + `background:
     transparent` — kare tam görünür, yanları dolgu kaplar.
   - **Dikey viewport (her genişlikte, `@media (orientation: portrait)`):**
     TÜM kaynaklar `contain` — telefonda yatay sahneler bütünüyle görünür
     (eski `cover` yaklaşımı samurayda sadece kılıcı, monalisa'da esprinin
     tamamını kırpıyordu), üst/alt boşluğu dolgu kaplar.
   - `scale()` hilesi YOK (eski `scale(1.28)` kaldırıldı); `--video-y` pan'i
     yalnız cover'lı (yatay masaüstü) sahnelerde kadraj etkisi yapar.
   - `.cinema-video` taban `background-color: #000`, `contain` alan
     seçicilerde `transparent` (dolgunun görünmesi için şart — `contain`'de
     eleman kutusunun boş kısmını element arka planı boyar!).
- `.portrait-video` / `.landscape-video` sınıfları JS'te otomatik
  (`checkAspectRatio`, eşik: oran < 1.0 → portrait; knight 1.0 → landscape).
- Iris maskesi mobil portrait parametreleri: `--cinema-mask-ellipse-x: 1.15`,
  `--cinema-mask-ellipse-y: 0.85`, `--cinema-mask-y-offset: 3%`.
- Şehir giriş videoları (`.intro-video`, 2160×3840): her viewport'ta `cover`
  — yüksek çözünürlüklü ve 9:16 olduğundan dolguya ihtiyaç yok.
- Doğrulama (2026-07-06): 375×812'de samuray/monalisa contain + dolgu aktif
  (canvas 96×208, opacity 1), video elemanı 375×812; 1280×800'de viking
  `cover` (orijinal), monalisa `contain` + dolgu. Hepsi opacity 1, oynar
  durumda.

**Yeni video eklerken:** herhangi bir çözünürlük kabul; `scenes` dizisine
`yStart/yEnd/irisX/irisY` tanımlayın — fit/dolgu kuralları otomatik. Tercihen
≥1080p kaynak kullanın (mevcut 832×464/560×704 kaynaklar büyük ekranlarda
yumuşak; backlog #3-b). **`.cinema-backfill` katmanını ve `contain`
seçicilerindeki `background: transparent`'ı kaldırmayın** — bant/siyah kutu
bunlardan korunuyor.

**Beyaz-boşluk korumaları ("ekran altı beyaz kaldı" düzeltmesi):**
- `body` zemini varsayılan **siyahtır**; yalnız `portal-intro-mode` /
  `flag-selection-mode` sınıflarında `--clr-bg` (açık) olur. Mobilde adres
  çubuğu gizlenirken/görünürken, overscroll'da veya klavye açılınca fixed
  sahnenin etrafında oluşan boşluklar bu sayede siyah kalır — sinemada asla
  beyaz parlamaz. Portal ekranları kendi tam-ekran zeminlerini boyadığı için
  açık tema etkilenmez. **Bu kuralı `background: var(--clr-bg)`'ye geri
  çevirmeyin.**
- `theme-color` meta dinamiktir (`setThemeColor`, main.js): sinema ekranda
  iken `#000000` (goToStep, portal sınıfları yokken), portala dönüşte
  `#f7f6f2` (openPortalGateway). Mobil tarayıcının üst/alt çubukları böylece
  içerikle uyumlu renkte kalır.
- Viewport meta `viewport-fit=cover` içerir: iOS'ta sayfa home-indicator
  bölgesinin altına uzanır; sinema alt kenarında beyaz sistem şeridi kalmaz.

## 3. Sıradaki İşler (öncelik sırasıyla)

1. **Sahne adım göstergesi:** 12 sahnede kullanıcı nerede olduğunu görmüyor.
   Sağ kenara ince nokta-göstergesi (aktif nokta vurgulu, tıklanınca o adıma
   `goToStep`) + ilk sahnede tek seferlik "Kaydırarak ilerleyin" mikro ipucu.
2. **Kopya temizliği:** `modalCalcApply` hâlâ "TEKLİF ALMAK İÇİN BİLGİLERİ
   DOLDUR ➔" (ok + tüm-büyük). "Teklif Al" gibi sade bir metne çevir;
   PL karşılığı da aynı şekilde.
3. **Video posterleri:** sahne videolarına ilk-kare poster (siyah yanıp sönme
   yerine); `public/videos`'tan kare çıkarıp `poster=""` ekle.
   3-b. **Kaynak kalitesi:** sahne videoları 832×464 / 560×704 — büyük
   ekranlarda yumuşak. Fırsat olursa ≥1080p yeniden üretin (kaplama kuralları
   bölüm 2.1'de; çözünürlük değişse de CSS değişmez).
4. **Gerçek cihaz testi (iOS Safari):** autoplay, 100dvh, decoder unlock,
   swipe hassasiyeti. Masaüstü Chrome'da akış doğrulandı; iOS doğrulanmadı.
5. **Polonya akışı uçtan uca:** Polonya kartı → Warszawa ilçe haritası →
   PL çeviriler → sahneler → rezervasyon. (Kod var, uçtan uca test edilmedi.)
6. **Ölü kod temizliği:** eski scroll-scrub kalıntıları (ScrollTrigger
   importu, `#cinema-section` yükseklik yorumları, gizli `cc-gateway-card`
   önizleme panelleri, kullanılmayan keyframe'ler) güvenle ayıklanabilir.
7. **Erişilebilirlik:** sahne değişiminde `aria-live` duyurusu, görünür focus
   halkaları, `prefers-reduced-motion`'da otomatik video kaydırmasını azaltma.
8. **Rezervasyon ucu:** formun gerçek gönderim hedefi (WhatsApp mesajı /
   e-posta) prod'da doğrulanmalı; telefon numarası hâlâ +90 532 000 00 00
   placeholder.

## 4. Çalıştırma

```bash
npm install
npm run dev     # Vite; varsayılan 5173
npm run build   # prod build — 76b1af3 itibarıyla temiz geçiyor
```

Şehir seçimi `localStorage.tworose_city`'ye yazılır; portalı yeniden görmek
için silin. Ses tercihi `tworose_audio_muted`.
