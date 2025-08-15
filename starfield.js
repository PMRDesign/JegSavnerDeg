// starfield.js — subtle animated star layer (2D canvas), mobile-friendly
const cvs = document.getElementById('stars');
const ctx = cvs.getContext('2d', { alpha: true });

const DPR = Math.min(window.devicePixelRatio || 1, 2);   // cap DPI for perf
let W = 0, H = 0;

// tune for mood/perf
const STAR_COUNT_DESKTOP = 220;
const STAR_COUNT_MOBILE  = 140;
const MAX_SPEED = 0.015;   // px/ms drift magnitude
const MIN_SPEED = 0.004;
const stars = [];

function resize() {
  W = cvs.width  = Math.floor(innerWidth  * DPR);
  H = cvs.height = Math.floor(innerHeight * DPR);
  cvs.style.width  = innerWidth  + 'px';
  cvs.style.height = innerHeight + 'px';
}
resize();
addEventListener('resize', resize);

// init stars
function resetStars() {
  stars.length = 0;
  const count = (innerWidth < 800 || innerHeight < 700) ? STAR_COUNT_MOBILE : STAR_COUNT_DESKTOP;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: (Math.random() * 1.3 + 0.3) * DPR,    // radius
      a0: 0.35 + Math.random() * 0.4,          // base alpha
      tw: Math.random() * 0.6 + 0.2,           // twinkle amplitude
      ph: Math.random() * Math.PI * 2,         // phase
      sp: MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED), // speed
      dir: Math.random() * Math.PI * 2         // drift direction
    });
  }
}
resetStars();
addEventListener('resize', resetStars, { passive: true });

let last = performance.now();
function tick(now) {
  const dt = now - last; last = now;

  // fade previous frame for a soft trail (very subtle)
  ctx.clearRect(0, 0, W, H);

  for (let s of stars) {
    // drift
    s.x += Math.cos(s.dir) * s.sp * dt;
    s.y += Math.sin(s.dir) * s.sp * dt;

    // wrap around edges
    if (s.x < -4) s.x = W + 4;
    if (s.x > W + 4) s.x = -4;
    if (s.y < -4) s.y = H + 4;
    if (s.y > H + 4) s.y = -4;

    // twinkle (slow)
    const twinkle = Math.sin(now * 0.0006 + s.ph) * s.tw;
    const a = Math.max(0, Math.min(1, s.a0 + twinkle));

    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = '#b8ccff'; // cool star tone
    ctx.fill();
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
