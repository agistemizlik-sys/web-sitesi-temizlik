# RUBRA — Project Rules
# Read this entire file before writing any code.

## WHAT YOU ARE BUILDING
Single-file luxury scroll website for a pomegranate wellness brand called RUBRA.
Everything lives in one file: index.html.
No npm. No package.json. No server.js. No build tools.
Served locally with: python3 -m http.server 8080

## HARD RULES — NEVER BREAK
1. ONE FILE ONLY — everything in index.html
2. NO CANVAS EVER
3. VIDEO SCRUB uses getBoundingClientRect() only — never window.scrollY alone
4. Always attach BOTH scroll listeners:
   window.addEventListener("scroll", requestTick, { passive: true })
   lenis.on("scroll", requestTick)
5. Never animate the pinned container — only animate children inside it
6. Never use GSAP pin:true AND CSS position:sticky on the same element
7. Never add will-change:transform or transform:translateZ(0) to #source-video
   — degrades video quality on Retina displays

## CDN IMPORTS — exact order, always
<link rel="stylesheet" href="https://unpkg.com/lenis@1.3.23/dist/lenis.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://unpkg.com/lenis@1.3.23/dist/lenis.min.js"></script>

<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">

## LENIS SETUP
const lenis = new Lenis({ lerp: 0.075, smoothWheel: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);

## VIDEO SCRUB JS
(() => {
  const track = document.querySelector(".hero-scroll-track");
  const video = document.getElementById("source-video");
  if (!track || !video) return;
  let ticking = false, duration = 0, initialized = false;
  const clamp = (v,lo,hi) => Math.min(Math.max(v,lo),hi);

  function update() {
    if (!initialized||!duration||!Number.isFinite(duration)) return;
    const total = track.offsetHeight - window.innerHeight;
    const rect  = track.getBoundingClientRect();
    const passed = clamp(-rect.top, 0, total);
    const progress = total > 0 ? passed/total : 0;
    if (video.readyState >= 2)
      video.currentTime = clamp(progress*duration, 0, duration);
    updatePhases(progress);
  }

  function requestTick() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }

  function initScrub() {
    duration = video.duration;
    if (!duration||!Number.isFinite(duration)) return;
    video.pause(); video.currentTime = 0; initialized = true;
    window.addEventListener("scroll", requestTick, { passive:true });
    window.addEventListener("resize", requestTick);
    if (typeof lenis !== "undefined") lenis.on("scroll", requestTick);
    requestTick();
  }
  if (video.readyState >= 2) initScrub();
  else {
    video.addEventListener("loadedmetadata", initScrub, { once:true });
    video.addEventListener("loadeddata", initScrub, { once:true });
    video.load();
  }
})();

## COLORS — RULE: Red is NEVER used as text color
#f5f0eb          off-white    ALL text, headings, nav, product names
rgba(245,240,235,0.45)  muted cream  Section eyebrow labels
#a08080          muted rose   Body and description text
#000000          black        Body background, footer
#8b0000          deep crimson Progress bar background only
#c0002a          ruby red     Buttons, accent lines, card borders

## FONTS
Cormorant Garamond — all display/headings
Inter            — all body/labels

## ASSETS
All image files are .png — not .jpg. Always use .png extensions.

## ALWAYS END THE SCRIPT WITH
ScrollTrigger.refresh();
