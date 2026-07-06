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

**Kaplama sözleşmesi (tam ekran, bantsız):**
- Her viewport'ta: video elemanı `width/height: 100%` (= stage = viewport),
  `object-fit: cover`. **`contain` hiçbir koşulda kullanılmaz** (siyah bant
  yaratır — c36317a'daki mobil `contain` kuralı bu yüzden kaldırıldı).
- Dikey konumlama otomatik pan ile: `object-position: center var(--video-y)`;
  `--video-y` her sahnede `yStart→yEnd` (scenes dizisi, main.js) 4.5 sn'de
  taranır.
- **≤768px portrait:** `object-position: center clamp(28%, var(--video-y), 72%)`
  ve `transform: scale(1)` — eski `scale(1.28)` zoom hilesi kaldırıldı
  (düşük çözünürlüklü kaynakları yumuşatıyor ve konuyu kırpıyordu).
- `.portrait-video` / `.landscape-video` sınıfları JS tarafından otomatik
  atanır (`checkAspectRatio`, eşik: oran < 1.0 → portrait). Şu an ikisi de
  aynı kurala tabidir; ileride orana özel kadraj gerekirse bu sınıflar hazır.
- Kırpma beklentisi (doğal sonuç, hata değil): telefonda (≈9:19.5) yatay
  kaynaklar yanlardan, masaüstünde (16:9) dikey kaynaklar üst/alttan kırpılır;
  konu `--video-y` pan'i ile kadrajda tutulur.
- Iris maskesi mobil portrait parametreleri: `--cinema-mask-ellipse-x: 1.15`,
  `--cinema-mask-ellipse-y: 0.85`, `--cinema-mask-y-offset: 3%`.
- Doğrulama (2026-07-06): 375×812'de samuray/monalisa/knight/şehir-intro ve
  masaüstünde viking/sumo viewport'u piksel piksel kapladı (`getBoundingClientRect`
  = viewport, `object-fit: cover`, opacity 1).

**Yeni video eklerken:** herhangi bir çözünürlük kabul; sadece `scenes`
dizisine `yStart/yEnd/irisX/irisY` değerlerini tanımlayın — kaplama kuralları
otomatik uygulanır. Tercihen ≥1080p kaynak kullanın (mevcut 832×464/560×704
kaynaklar büyük ekranlarda yumuşak kalıyor; backlog #3-b).

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
