// cube.js — transparent renderer over gradient, menu faces, hover cursor,
// background/cube-edge drag with inertia, and mobile tap-to-open.
const THREE = await import('https://esm.sh/three@0.179.1');
const { OrbitControls } = await import('https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js');

// Canvas & (optional) debug element
const canvas = document.getElementById('scene');
const health = document.getElementById('health'); // safe if missing

// ---------- MENU CONFIG ----------
const faceLabels = ["Words", "Sounds", "Story", "Motion", "Sketches", "Pieces"];
const routes = {
  0: "words/",     // Front
  1: "sounds/",    // Back
  2: "story/",     // Left
  3: "motion/",    // Right
  4: "sketches/",  // Top
  5: "pieces/"     // Bottom
};
// ---------------------------------

// Use your uploaded cursor for the clickable center (desktop hover)
const CLICK_CURSOR = "url('./assets/cursor.svg') 6 2, pointer";

// ---------- ZOOM LIMITS (wheel zoom) ----------
const minZoomDistance = 1.5;   // absolute zoom-in stop
const maxZoomDistance = 15.0;  // absolute zoom-out stop
// ---------------------------------------------

// Renderer — transparent so CSS gradient/starfield show through
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // fully transparent

// Scene & camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3.2, 2.0, 4.6); // initial camera position

// Controls: wheel zoom only; we rotate the cube (not the camera)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false;
controls.enablePan = false;
controls.minDistance = minZoomDistance;
controls.maxDistance = maxZoomDistance;

// Lights for a gentle, gallery-like shine
scene.add(new THREE.AmbientLight(0xffffff, 0.75));

const key = new THREE.DirectionalLight(0xeacffc, 1.4); // warm key
key.position.set(3, 4, 2);
scene.add(key);

const rim = new THREE.DirectionalLight(0x9cc6ff, 0.6); // cool rim
rim.position.set(-2.5, 2.0, -2.5);
scene.add(rim);

// Flat label face with a subtle shiny material (no vignette)
function makeFaceMaterial(label, opts = {}) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  ctx.fillStyle = opts.bg || "#1b1f27";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = opts.fg || "#eaeaf5";
  ctx.font = "600 58px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, size / 2, size / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: tex,
    metalness: 0.15, // ↑ more mirror-like if higher (0..1)
    roughness: 0.22  // ↓ shinier if lower (0..1)
  });
}

const materials = faceLabels.map(lbl => makeFaceMaterial(lbl));
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), materials);
scene.add(cube);

// ---------- STARTING ORIENTATION (radians) ----------
// rotation.x → tilt up/down  (− tilts top away; + tilts top toward you)
// rotation.y → turn left/right around vertical axis
// rotation.z → twist clockwise/counterclockwise facing you
//
// Examples:
// cube.rotation.set(-0.15, 0.35, 0);  // see a bit of top + right side
// cube.rotation.set(0,      0.25, 0); // straight, turned a little right
// cube.rotation.set(0,      0,     0); // perfectly straight on
cube.rotation.set(-0.3, 2, 0); // current choice: turned ~2 rad (~114°) around Y
// ----------------------------------------------------

// -------- Feel / motion parameters --------
let showIntroSpin = true;         // one-time hint spin at start
let introRotationY = 0.010;       // intro spin speed (Y)
let introRotationX = 0.000;       // intro spin speed (X)

// Drag responsiveness: how much rotation per pixel of gesture
const dragSensitivity = 0.006;    // try 0.003 (slow) .. 0.012 (snappy)

// Inertia after drag: keeps spinning, then eases out
let isScrubbing = false;
let inertiaActive = false;
let vX = 0; // rotational velocity around X
let vY = 0; // rotational velocity around Y
const inertiaDamping = 0.985;     // 0.92 (short) .. 0.99 (very long glide)
const stopThreshold = 0.00002;    // when both |vX| & |vY| drop below this, stop
// -----------------------------------------

// Animate
function animate() {
  requestAnimationFrame(animate);

  if (showIntroSpin && !isScrubbing && !inertiaActive) {
    cube.rotation.y += introRotationY;
    cube.rotation.x += introRotationX;
  }

  if (inertiaActive) {
    cube.rotation.x += vX;
    cube.rotation.y += vY;
    vX *= inertiaDamping;
    vY *= inertiaDamping;
    if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
      inertiaActive = false;
      vX = vY = 0;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Raycaster helpers
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pick(evOrTouch) {
  const clientX = evOrTouch.clientX ?? (evOrTouch.touches && evOrTouch.touches[0]?.clientX);
  const clientY = evOrTouch.clientY ?? (evOrTouch.touches && evOrTouch.touches[0]?.clientY);
  if (clientX == null || clientY == null) return null;

  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(cube, false)[0];
  if (!hit) return null;
  const faceIndex = Math.floor(hit.faceIndex / 2);
  const uv = hit.uv || null; // (u,v) in [0..1] across the face
  return { faceIndex, uv };
}

// Hover (desktop): only change cursor when over the central 60% of a face
renderer.domElement.addEventListener("mousemove", (ev) => {
  if (isScrubbing) return;
  const p = pick(ev);
  if (!p || !p.uv) {
    document.body.style.cursor = "";
    return;
  }
  const { x: u, y: v } = p.uv;
  const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
  document.body.style.cursor = inCenter ? CLICK_CURSOR : "";
});

// Click (desktop) → route (only if over central 60%)
renderer.domElement.addEventListener("click", (ev) => {
  if (isScrubbing) return; // ignore if we were dragging
  const p = pick(ev);
  if (!p || !p.uv) return;
  const { x: u, y: v } = p.uv;
  const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
  if (!inCenter) return;

  const dest = routes[p.faceIndex];
  if (dest) window.location.href = dest;
});

// ===== Drag to rotate with inertia (mouse) =====
// Clicking the CUBE outside the 60% center also starts a scrub.
let lastMoveTime = 0;

renderer.domElement.addEventListener("mousedown", (ev) => {
  const p = pick(ev);
  let startDrag = false;

  if (!p) startDrag = true;            // background
  else if (!p.uv) startDrag = true;    // rare: no UV
  else {
    const { x: u, y: v } = p.uv;
    const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
    startDrag = !inCenter;             // edges of cube face → rotate
  }

  if (startDrag) {
    isScrubbing = true;
    inertiaActive = false;
    showIntroSpin = false; // first drag cancels intro spin forever
    document.body.style.cursor = 'grabbing';
  }
});

renderer.domElement.addEventListener("mousemove", (ev) => {
  if (!isScrubbing) return;
  const dx = ev.movementX || 0;
  const dy = ev.movementY || 0;

  // Direct rotation
  const k = dragSensitivity;
  cube.rotation.y += dx * k; // left/right
  cube.rotation.x += dy * k; // up/down

  // Velocity for inertia
  vY = dx * k;
  vX = dy * k;
  lastMoveTime = performance.now();
});

function endScrub() {
  if (!isScrubbing) return;
  isScrubbing = false;
  document.body.style.cursor = "";

  // If there was movement very recently, start inertia glide
  const elapsed = performance.now() - lastMoveTime;
  if (elapsed < 120) inertiaActive = true;
}
addEventListener("mouseup", endScrub);
renderer.domElement.addEventListener("mouseleave", endScrub);

// ===== Touch support (tap to open, drag to rotate) =====
let lastTouch = null;       // { x, y, time }
let tapCandidate = null;    // { faceIndex, startX, startY, startTime }
const TAP_MOVE_MAX = 12;    // px — movement threshold to still count as tap
const TAP_TIME_MAX = 450;   // ms — time threshold to still count as tap

renderer.domElement.addEventListener('touchstart', (ev) => {
  if (!ev.touches || ev.touches.length === 0) return;
  const t = ev.touches[0];
  const now = performance.now();

  // Hit test at touch start
  const p = pick(t);

  if (!p || !p.uv) {
    // Background or no UV → begin drag
    isScrubbing = true;
    inertiaActive = false;
    showIntroSpin = false;
    lastTouch = { x: t.clientX, y: t.clientY, time: now };
    tapCandidate = null; // not a tap
  } else {
    const { x: u, y: v } = p.uv;
    const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);

    if (inCenter) {
      // Potential tap to open — don't start drag yet
      isScrubbing = false;
      inertiaActive = false;
      showIntroSpin = false;
      lastTouch = { x: t.clientX, y: t.clientY, time: now };
      tapCandidate = {
        faceIndex: p.faceIndex,
        startX: t.clientX,
        startY: t.clientY,
        startTime: now
      };
    } else {
      // Edge of face → begin drag
      isScrubbing = true;
      inertiaActive = false;
      showIntroSpin = false;
      lastTouch = { x: t.clientX, y: t.clientY, time: now };
      tapCandidate = null;
    }
  }

  // Prevent page scroll while on the canvas
  ev.preventDefault();
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (ev) => {
  if (!ev.touches || ev.touches.length === 0) return;
  const t = ev.touches[0];
  const now = performance.now();

  const dx = t.clientX - (lastTouch?.x ?? t.clientX);
  const dy = t.clientY - (lastTouch?.y ?? t.clientY);

  // If we had a tap candidate but the finger moved too much, cancel the tap and start a drag
  if (tapCandidate) {
    const moved = Math.hypot(t.clientX - tapCandidate.startX, t.clientY - tapCandidate.startY);
    if (moved > TAP_MOVE_MAX) {
      // Start rotating instead
      isScrubbing = true;
      tapCandidate = null;
    }
  }

  if (isScrubbing) {
    const k = dragSensitivity;
    cube.rotation.y += dx * k;
    cube.rotation.x += dy * k;

    // velocity for inertia (normalized a bit)
    const dt = Math.max(1, (now - (lastTouch?.time ?? now)));
    vY = (dx * k) * (16 / dt);
    vX = (dy * k) * (16 / dt);
  }

  lastTouch = { x: t.clientX, y: t.clientY, time: now };
  ev.preventDefault();
}, { passive: false });

function endTouch(ev) {
  const now = performance.now();

  // If we have a valid tap candidate, small movement and short time → navigate
  if (tapCandidate) {
    const moved = Math.hypot(
      (lastTouch?.x ?? tapCandidate.startX) - tapCandidate.startX,
      (lastTouch?.y ?? tapCandidate.startY) - tapCandidate.startY
    );
    const elapsed = now - tapCandidate.startTime;

    if (moved <= TAP_MOVE_MAX && elapsed <= TAP_TIME_MAX) {
      const dest = routes[tapCandidate.faceIndex];
      tapCandidate = null;
      if (dest) {
        window.location.href = dest; // navigate
        ev && ev.preventDefault();
        return;
      }
    }
    // Otherwise: no nav; if we were dragging, we'll start inertia below
    tapCandidate = null;
  }

  // If we were scrubbing (dragging), start inertia glide
  if (isScrubbing) {
    isScrubbing = false;
    inertiaActive = true;
  }

  lastTouch = null;
  ev && ev.preventDefault();
}
renderer.domElement.addEventListener('touchend', endTouch, { passive: false });
renderer.domElement.addEventListener('touchcancel', endTouch, { passive: false });

// (Optional) tiny status for your own testing
if (health) health.textContent = "";
console.log("[cube] ready: mobile tap-to-open + inertia, desktop hover cursor, transparent renderer");

// ===== Bilinear corner weights (Kongsvinger, Berlin, Rio, Sydney) =====
const wTL = document.getElementById('w-tl');
const wTR = document.getElementById('w-tr');
const wBL = document.getElementById('w-bl');
const wBR = document.getElementById('w-br');

const clamp01 = v => Math.max(0, Math.min(1, v));

function updateCornerWeightsFromClient(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = clamp01((clientX - rect.left) / rect.width);   // 0..1, left→right
  const y = clamp01((clientY - rect.top)  / rect.height);  // 0..1, top→bottom

  // Bilinear weights
  let k = (1 - x) * (1 - y); // Kongsvinger (TL)
  let b = x * (1 - y);       // Berlin (TR)
  let r = (1 - x) * y;       // Rio (BL)
  let s = x * y;             // Sydney (BR)

  // Scale to 0..100 (ints)
  let K = Math.round(k * 100);
  let B = Math.round(b * 100);
  let R = Math.round(r * 100);
  let S = Math.round(s * 100);

  // Ensure exact sum = 100 by fixing largest with residual
  const sum = K + B + R + S;
  const residual = 100 - sum;
  if (residual !== 0) {
    const arr = [K, B, R, S];
    let maxIdx = 0;
    for (let i = 1; i < 4; i++) if (arr[i] > arr[maxIdx]) maxIdx = i;
    arr[maxIdx] += residual;
    [K, B, R, S] = arr;
  }

  if (wTL) wTL.textContent = `Kongsvinger ${K}`;
  if (wTR) wTR.textContent = `Berlin ${B}`;
  if (wBL) wBL.textContent = `Rio ${R}`;
  if (wBR) wBR.textContent = `Sydney ${S}`;
}

// Mouse: update on move, freeze on leave
renderer.domElement.addEventListener('mousemove', (ev) => {
  updateCornerWeightsFromClient(ev.clientX, ev.clientY);
}, { passive: true });

// Touch: update on move, freeze on end
renderer.domElement.addEventListener('touchmove', (ev) => {
  if (!ev.touches || ev.touches.length === 0) return;
  const t = ev.touches[0];
  updateCornerWeightsFromClient(t.clientX, t.clientY);
}, { passive: true });

// Initialize at canvas center so labels aren’t dashes on load
(function initWeightsAtCenter(){
  const rect = renderer.domElement.getBoundingClientRect();
  updateCornerWeightsFromClient(rect.left + rect.width/2, rect.top + rect.height/2);
})();

