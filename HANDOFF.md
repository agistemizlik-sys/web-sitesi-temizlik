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

**Kaplama mimarisi — "Tam Ekran Kaplama + Kalibre Edilmiş Odak Kaydırma (Cover + Focal Panning)" (Nihai Hali):**

Ekran her zaman %100 dolu, siyah barlar veya bulanıklık kirliliği yok. Tüm videolar hem masaüstünde hem de mobilde **`object-fit: cover !important` (Tam Ekran Kaplama)** modunda çalışmaktadır.

Karakterlerin dikey mobil kadrajda kırpılmaması, sahnenin tamamının organik şekilde gösterilmesi ve premium bir tam ekran hissi sunulması için her videonun yatay kaydırma değerleri dinamik sinematik salınımlarla (slow-panning) canlandırılmıştır:

1. **Samuray (Scene 2):** `%15` ile `%50` yatay koordinatları arasında yavaş salınım (`panSamurai` 14s).
2. **Astronot (Scene 4):** `%35` ile `%65` yatay koordinatları arasında yavaş salınım (`panAstronaut` 15s).
3. **Kovboy (Scene 5):** `%25` ile `%68` yatay koordinatları arasında yavaş salınım (`panCowboy` 13s).
4. **Büyücü / Gandalf (Scene 6):** `%40` ile `%75` yatay koordinatları arasında yavaş salınım (`panGandalf` 16s).
5. **Keşiş (Scene 8):** `%30` ile `%70` yatay koordinatları arasında yavaş salınım (`panMonk` 14s).
6. **Şövalye (Scene 9):** `%35` ile `%72` yatay koordinatları arasında yavaş salınım (`panRoman` 15s).
7. **Düşes (Scene 11):** `%25` ile `%60` yatay koordinatları arasında yavaş salınım (`panVictorian` 14s).
8. **Viking (Scene 12):** `%35` ile `%75` yatay koordinatları arasında yavaş salınım (`panViking` 13s).

**Masaüstünde Dikey Videolar (Mona Lisa, Sumo, Teyze):**
- Masaüstü yatay ekranları tam kapladıkları için dikeyde panning limitleri (`yStart`, `yEnd`) daraltılarak (Mona Lisa: `18% - 72%`, Sumo: `12% - 82%`, Teyze: `15% - 85%`) dikey akış esnasında karakterlerin yüzlerinin kesilmesi tamamen önlenmiştir.

**Yeni video eklerken:** Herhangi bir çözünürlük kabul; `scenes` dizisine `yStart/yEnd/irisX/irisY` tanımlayın. Tercihen ≥1080p kaynak kullanın. Kadraj kaymaları `style.css` altındaki `@media (orientation: portrait)` kurallarıyla dengelenecektir.

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

---

## 5. SEO Katmanı (2026-07-13, commit ee5fa03 + 862976b)

Tamamen **salt-ekleme** olarak kuruldu; görünür deneyime ve motor koduna
dokunulmadı (`index.html` toplam +134/−0 satır; `style.css`/`main.js`
değişmedi). Kaldırmayın, sadeleştirmeyin.

**Neler var:**
- `<head>`: robots (`max-image-preview:large`), author, OG tam seti
  (site_name, locale tr_TR + pl_PL alternate, image 1200×630 + boyut/tip/alt),
  Twitter kartı + görsel, dns-prefetch (gtm, facebook, unpkg, cartocdn a/b/c),
  LCP preload (`soap_foam_bubbles.png`, `fetchpriority=high`).
- **5 JSON-LD bloğu** (hepsi `@id` ile bağlı graf): ProfessionalService,
  Organization (+6 hizmetlik OfferCatalog, Instagram sameAs, contactPoint),
  WebSite, WebPage (primaryImageOfPage), Organization logo takviyesi
  (`logo-512.png` — Google raster ≥112px kuralı).
- **Canonical-sync script'i** (head içi inline): `?lang=pl|tr` URL'lerinde
  canonical'ı kendine çevirir — hreflang hedefleri self-canonical olmalı.
  `main.js` canonical'a dokunmaz; bu script kaldırılırsa PL indekslemesi bozulur.
- **Varlıklar:** `og-image.png` (1200×630, marka logo path'lerinden, sitede
  render edilmez), `favicon-96.png` + `apple-touch-icon.png` (favicon.svg'den
  birebir raster; apple olanı opak `#f7f6f2` zemin — iOS şeffaflığı siyaha
  bindirir), `logo-512.png`, `site.webmanifest` (`display: browser` —
  davranış değiştirmez), `404.html` (noindex; CF Pages'te SPA fallback yerine
  gerçek 404 döner — meşru URL'ler yalnızca `/` + query olduğundan güvenli).
- **sitemap.xml:** 3 URL + hreflang + image uzantısı (og + 7 landmark).
- Görünmez `sr-only` SEO makaleleri (TR + PL, Warszawa ilçeleri dahil) zaten
  vardı; şemadaki hizmet adları bu makalelerle birebir tutarlıdır — birini
  değiştirirseniz diğerini de güncelleyin.

**Senkron kuralları:**
- İçerik (hizmet/SSS/iletişim) değişirse: sr-only makaleler + JSON-LD +
  (merge edilirse) Cloudflare middleware bot snapshot'ı birlikte güncellenir.
- `translations.js` PL `description` gerçek hizmet alanını yazar
  (Warszawa + aglomeracja); servis verilmeyen şehir eklemeyin.

**Lansman kontrol listesi (kod dışı):**
1. Google Search Console'da alan doğrula, `sitemap.xml` gönder.
2. `G-XXXXXXXXXX` / `AW-XXXXXXXXXX` / `PIXEL_ID_BURAYA` placeholder'larını
   gerçek ID'lerle değiştir (şu an tracking veri toplamıyor).
3. Middleware branch'i merge edilirken: bot snapshot'ına 5 şema bloğunu taşı,
   `?lang` varyantlarında canonical'ın self-referencing olduğunu doğrula.
