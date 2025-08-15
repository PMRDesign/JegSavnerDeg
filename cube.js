// cube.js — straight start, custom cursor on clickable center, no hover bg, background-drag with inertia
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

// Use your uploaded cursor (adjust hotspot numbers if needed)
const CLICK_CURSOR = "url('./assets/cursor.svg') 6 2, pointer";

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0f0f12, 1);

// Scene & camera (slightly zoomed out; feel free to tweak)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3.2, 2.0, 4.6);

// Controls: wheel zoom only; we rotate the cube ourselves
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false;
controls.enablePan = false;
controls.minDistance = 1.5;
controls.maxDistance = 8;

// Lights (subtle shine on faces)
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const key = new THREE.DirectionalLight(0xfff2e0, 1.0); key.position.set(3, 4, 2); scene.add(key);
const rim = new THREE.DirectionalLight(0x9cc6ff, 0.6); rim.position.set(-2.5, 2.0, -2.5); scene.add(rim);

// Flat label face with gentle surface shine (no vignette / no hover bg)
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
    metalness: 0.15,
    roughness: 0.22
  });
}

const materials = faceLabels.map(lbl => makeFaceMaterial(lbl));
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), materials);
scene.add(cube);

// Start perfectly straight
cube.rotation.set(0, 0, 0);

// -------- Feel / motion parameters --------
let introRotationY = 0.010; // intro hint spin; stops forever after first drag
let introRotationX = 0.000;
let showIntroSpin = true;

const dragSensitivity = 0.006; // how strongly the cube follows your hand
let isScrubbing = false;

// inertia after drag:
let inertiaActive = false;
let vX = 0; // rotational velocity around X
let vY = 0; // rotational velocity around Y
const inertiaDamping = 0.92; // 0.9–0.98 = more/less glide
const stopThreshold = 0.00002; // when to stop inertia
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
  const uv = hit.uv || null;
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

// ===== Background drag to rotate with inertia =====
let lastMoveTime = 0;
renderer.domElement.addEventListener("mousedown", (ev) => {
  // Only start scrubbing if click began on background (not on the cube)
  const p = pick(ev);
  if (!p) {
    isScrubbing = true;
    inertiaActive = false;
    showIntroSpin = false; // stop the intro hint forever after first drag
    document.body.style.cursor = 'grabbing';
  }
});

renderer.domElement.addEventListener("mousemove", (ev) => {
  if (!isScrubbing) return;
  const dx = ev.movementX || 0;
  const dy = ev.movementY || 0;

  // Update rotation directly
  const k = dragSensitivity;
  cube.rotation.y += dx * k;
  cube.rotation.x += dy * k;

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

if (health) health.textContent = "Menu ready ✓ — hover center of a face, or drag background to rotate";
console.log("[cube] inertial control + custom cursor ready");
