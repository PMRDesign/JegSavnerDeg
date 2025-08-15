// cube.js — annotated start rotation, long glide, cube-edge drag, and configurable zoom limits
const THREE = await import('https://esm.sh/three@0.179.1');
const { OrbitControls } = await import('https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js');

const health = document.getElementById('health');
const canvas = document.getElementById('scene');

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
// The camera moves toward/away from the target as you wheel-zoom.
// These two values are the "hard stops" for how close/far you can get.
const minZoomDistance = 1.5;  // move closer than this? no.
const maxZoomDistance = 15.0;  // move farther than this? no.
// ---------------------------------------------

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0f0f12, 1);

// Scene & camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

// Initial camera position (feel free to tune)
camera.position.set(3.2, 2.0, 4.6);

// Controls: we keep wheel zoom only; no camera rotate/pan (we rotate the cube instead)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false;
controls.enablePan = false;
controls.minDistance = minZoomDistance; // ← absolute zoom-in stop
controls.maxDistance = maxZoomDistance; // ← absolute zoom-out stop

// Lights for a gentle shine
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const key = new THREE.DirectionalLight(0xfff2e0, 1.0); key.position.set(3, 4, 2); scene.add(key);
const rim = new THREE.DirectionalLight(0x9cc6ff, 0.6); rim.position.set(-2.5, 2.0, -2.5); scene.add(rim);

// Flat label face, with a subtle shiny material (no vignette)
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
// Think of these as designer knobs:
//
// rotation.x  → tilt up/down  (− tilts top away; + tilts top toward you)
// rotation.y  → turn left/right around vertical axis
// rotation.z  → twist clockwise/counterclockwise facing you
//
// Examples:
//   cube.rotation.set(-0.15, 0.35, 0);  // see a bit of top + right side
//   cube.rotation.set(0,      0.25, 0); // straight, turned a little right
//   cube.rotation.set(0,      0,     0); // perfectly straight on
cube.rotation.set(0, 2, 0); // ← current choice: straight-on
// ----------------------------------------------------

// -------- Feel / motion parameters --------
let showIntroSpin = true;         // one-time hint spin at start
let introRotationY = 0.010;       // intro spin speed (Y)
let introRotationX = 0.000;       // intro spin speed (X)

// Drag responsiveness: how much rotation per pixel of mouse movement
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

function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
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

// ===== Drag to rotate with inertia =====
// Now: clicking the CUBE *outside* the 60% center ALSO starts a scrub.
// (Previously, only background started scrubbing.)
let lastMoveTime = 0;

renderer.domElement.addEventListener("mousedown", (ev) => {
  const p = pick(ev);
  let startDrag = false;

  if (!p) {
    // Clicked background → drag
    startDrag = true;
  } else if (!p.uv) {
    // Rare case: no UV, treat as drag
    startDrag = true;
  } else {
    // Clicked cube — only start drag if not inside the central 60%
    const { x: u, y: v } = p.uv;
    const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
    startDrag = !inCenter; // outside center → drag
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

  // Update rotation directly
  const k = dragSensitivity;
  cube.rotation.y += dx * k; // left/right mouse moves twist around Y
  cube.rotation.x += dy * k; // up/down moves tilt around X

  // Track velocity for inertia
  vY = dx * k;
  vX = dy * k;
  lastMoveTime = performance.now();
});

function endScrub() {
  if (!isScrubbing) return;
  isScrubbing = false;
  document.body.style.cursor = "";

  // If the mouse actually moved recently, start inertia
  const elapsed = performance.now() - lastMoveTime;
  if (elapsed < 120) {
    inertiaActive = true;
  }
}
addEventListener("mouseup", endScrub);
renderer.domElement.addEventListener("mouseleave", endScrub);

if (health) health.textContent = "Menu ready ✓ — hover center to click, drag edges/background to rotate";
console.log("[cube] updated: annotated start pose, 0.985 glide, cube-edge drag, zoom limits exposed");
