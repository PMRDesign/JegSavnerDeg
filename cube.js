// cube.js — transparent renderer over gradient, menu faces, hover cursor,
// background/cube-edge drag with inertia, touch support, zoom limits exposed.
const THREE = await import('https://esm.sh/three@0.179.1');
const { OrbitControls } = await import('https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js');

// Canvas & (optional) debug element
const canvas = document.getElementById('scene');
const health = document.getElementById('health'); // safe if missing

// ---------- MENU CONFIG ----------
const faceLabels = ["Music", "Sketches", "Texts", "Demos", "About", "Notes"];
const routes = {
  0: "music/",     // Front
  1: "sketches/",  // Back
  2: "texts/",     // Left
  3: "demos/",     // Right
  4: "about.html", // Top
  5: "notes.html"  // Bottom
};
// ---------------------------------

// Use your uploaded cursor for the clickable center
const CLICK_CURSOR = "url('./assets/cursor.svg') 6 2, pointer";

// ---------- ZOOM LIMITS (wheel zoom) ----------
// Camera distance clamps (hard stops) while wheel-zooming.
const minZoomDistance = 2.5;   // zoom-in limit (closer is blocked)
const maxZoomDistance = 22.5;  // zoom-out limit (farther is blocked)
// ---------------------------------------------

// Renderer — transparent so CSS gradient and starfield show through
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // fully transparent

// Scene & camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

// Initial camera position (feel free to tune)
camera.position.set(3.2, 2.0, 4.6);

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
cube.rotation.set(0, 2, 0); // current choice: turned ~2 rad (~114°) around Y
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

// Hover: only change cursor when over the central 60% of a face
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

// Click → route (only if over central 60%)
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

// ===== Touch support (mirrors mouse behavior) =====
let lastTouch = null;

renderer.domElement.addEventListener('touchstart', (ev) => {
  if (!ev.touches || ev.touches.length === 0) return;
  const t = ev.touches[0];

  const p = pick(t);
  let startDrag = false;
  if (!p) startDrag = true;
  else if (!p.uv) startDrag = true;
  else {
    const { x: u, y: v } = p.uv;
    const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
    startDrag = !inCenter; // tap-drag edges/background to rotate
  }

  if (startDrag) {
    isScrubbing = true;
    inertiaActive = false;
    showIntroSpin = false;
    lastTouch = { x: t.clientX, y: t.clientY, time: performance.now() };
  }
  ev.preventDefault();
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (ev) => {
  if (!isScrubbing || !ev.touches || ev.touches.length === 0) return;
  const t = ev.touches[0];
  const now = performance.now();
  const dx = t.clientX - (lastTouch?.x ?? t.clientX);
  const dy = t.clientY - (lastTouch?.y ?? t.clientY);

  const k = dragSensitivity;
  cube.rotation.y += dx * k;
  cube.rotation.x += dy * k;

  // approximate per-frame velocity
  const dt = Math.max(1, (now - (lastTouch?.time ?? now)));
  vY = (dx * k) * (16 / dt);
  vX = (dy * k) * (16 / dt);

  lastTouch = { x: t.clientX, y: t.clientY, time: now };
  ev.preventDefault();
}, { passive: false });

function endTouch(ev) {
  if (!isScrubbing) return;
  isScrubbing = false;
  // Always give a bit of glide on touch release
  inertiaActive = true;
  lastTouch = null;
  ev && ev.preventDefault();
}
renderer.domElement.addEventListener('touchend', endTouch, { passive: false });
renderer.domElement.addEventListener('touchcancel', endTouch, { passive: false });

// (Optional) tiny status for your own testing
if (health) health.textContent = "";
console.log("[cube] ready: transparent renderer, star-ready CSS, inertia + touch, zoom limits exposed");
