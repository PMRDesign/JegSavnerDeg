// cube.js — transparent renderer over gradient, menu faces (OFFRER),
// Source Sans Pro labels, hover cursor, inertia, and mobile tap-to-open.
const THREE = await import('https://esm.sh/three@0.179.1');
const { OrbitControls } = await import('https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js');

// Canvas & (optional) debug element
const canvas = document.getElementById('scene');
const health = document.getElementById('health'); // safe if missing

// ---------- MENU CONFIG (OFFRER) ----------
const faceLabels = ["Form", "Echoes", "Flow", "Rituals", "Origin", "Resonance"];
// Faces: 0=Front, 1=Back, 2=Left, 3=Right, 4=Top, 5=Bottom
const routes = {
  0: "form/",       // Front
  1: "echoes/",     // Back
  2: "flow/",       // Left
  3: "rituals/",    // Right
  4: "origin/",     // Top
  5: "resonance/"   // Bottom
};
// ---------------------------------

// Use your uploaded cursor for the clickable center (desktop hover)
const CLICK_CURSOR = "url('./assets/cursor.svg') 6 2, pointer";

// ---------- ZOOM LIMITS (wheel zoom) ----------
const minZoomDistance = 1.5;
const maxZoomDistance = 15.0;
// ---------------------------------------------

// Renderer — transparent so CSS gradient/starfield show through
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

// Scene & camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3.2, 2.0, 4.6);

// Controls: wheel zoom only
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false;
controls.enablePan = false;
controls.minDistance = minZoomDistance;
controls.maxDistance = maxZoomDistance;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const key = new THREE.DirectionalLight(0xeacffc, 1.4); key.position.set(3, 4, 2); scene.add(key);
const rim = new THREE.DirectionalLight(0x9cc6ff, 0.6); rim.position.set(-2.5, 2.0, -2.5); scene.add(rim);

// Face material: Source Sans Pro font
function makeFaceMaterial(label, opts = {}) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  ctx.fillStyle = opts.bg || "#1b1f27";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = opts.fg || "#eaeaf5";
  ctx.font = "600 58px 'Source Sans Pro', sans-serif"; // updated font
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

// Starting orientation
cube.rotation.set(0, 2, 0);

// -------- Motion / inertia ----------
let showIntroSpin = true;
let introRotationY = 0.010;
let introRotationX = 0.000;
const dragSensitivity = 0.006;
let isScrubbing = false;
let inertiaActive = false;
let vX = 0, vY = 0;
const inertiaDamping = 0.985;
const stopThreshold = 0.00002;

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
      inertiaActive = false; vX = vY = 0;
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

// Raycaster
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
  const uv = hit.uv || null;
  return { faceIndex, uv };
}

// Hover → cursor
renderer.domElement.addEventListener("mousemove", (ev) => {
  if (isScrubbing) return;
  const p = pick(ev);
  if (!p || !p.uv) { document.body.style.cursor = ""; return; }
  const { x: u, y: v } = p.uv;
  const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
  document.body.style.cursor = inCenter ? CLICK_CURSOR : "";
});

// Click → route
renderer.domElement.addEventListener("click", (ev) => {
  if (isScrubbing) return;
  const p = pick(ev);
  if (!p || !p.uv) return;
  const { x: u, y: v } = p.uv;
  if (!(u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8)) return;
  const dest = routes[p.faceIndex];
  if (dest) window.location.href = dest;
});

// (…rest of drag / touch / inertia code unchanged…)

// ===== Corner weights unchanged =====
