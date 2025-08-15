// cube.js — clean faces, central-hit routing, background-drag control, one-time idle spin
const THREE = await import('https://esm.sh/three@0.179.1');
const { OrbitControls } = await import('https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js');

const health = document.getElementById('health');
const canvas = document.getElementById('scene');

// --------- MENU CONFIG ---------
const faceLabels = ["Music", "Sketches", "Texts", "Demos", "About", "Notes"];
const routes = {
  0: "music/",     // Front
  1: "sketches/",  // Back
  2: "texts/",     // Left
  3: "demos/",     // Right
  4: "about.html", // Top
  5: "notes.html"  // Bottom
};
// -------------------------------

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0f0f12, 1);

// Scene & camera (slightly more zoomed out to start)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3.2, 2.2, 4.6);

// Controls: only zoom via wheel; we rotate the cube ourselves
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false;
controls.enablePan = false;
controls.minDistance = 1.5;
controls.maxDistance = 8;

// Lights (kept, but face material ignores light for a clean, flat look)
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const key = new THREE.DirectionalLight(0xfff2e0, 0.8); key.position.set(3, 4, 2); scene.add(key);

// Build a flat, clean label face (no vignette, no metalness/roughness)
function makeFaceMaterial(label, opts={}) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  // Flat background
  ctx.fillStyle = opts.bg || "#181b22";
  ctx.fillRect(0, 0, size, size);

  // Centered label text
  ctx.fillStyle = opts.fg || "#eaeaf5";
  ctx.font = "600 58px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, size / 2, size / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  // MeshBasicMaterial ignores lights -> crisp, flat result
  return new THREE.MeshBasicMaterial({ map: tex });
}

// Materials (one per face)
const materials = faceLabels.map(lbl => makeFaceMaterial(lbl));

// Cube (slightly larger for readability)
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), materials);
scene.add(cube);

// ------- Feel / motion parameters -------
let rotationSpeedY = 0.010;   // initial idle spin (indicator)
let rotationSpeedX = 0.000;
const dragSensitivity = 0.006; // how fast cube follows your hand
let autoRotate = true;         // only at the very start
let hasUserScrubbed = false;   // once true, idle spin never comes back
// ---------------------------------------

// Animate
function animate() {
  requestAnimationFrame(animate);
  if (autoRotate && !hasUserScrubbed) {
    cube.rotation.y += rotationSpeedY;
    cube.rotation.x += rotationSpeedX;
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

// Utility: detect if click is on cube; return {hit, faceIndex, uv} or null
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(cube, false)[0];
  if (!hit) return null;
  const faceIndex = Math.floor(hit.faceIndex / 2); // 0..5
  const uv = hit.uv || null;                       // per-face UV in [0..1]
  return { hit, faceIndex, uv };
}

// Click → only if on cube AND inside central 60% area
renderer.domElement.addEventListener("click", (ev) => {
  if (isScrubbing) return; // ignore if a drag just happened
  const picked = pick(ev);
  if (!picked) return;

  // central region: 20%..80% in both U and V (approx. text area)
  if (!picked.uv) return;
  const { x: u, y: v } = picked.uv;
  const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
  if (!inCenter) return;

  const dest = routes[picked.faceIndex];
  if (dest) window.location.href = dest;
});

// ===== Background drag to rotate the cube =====
let isScrubbing = false;
let lastMoveTime = 0;

function startScrub() {
  isScrubbing = true;
  autoRotate = false;       // stop idle spin immediately
  hasUserScrubbed = true;   // never resume idle spin after first drag
  document.body.style.cursor = 'grabbing';
}
function endScrub() {
  if (!isScrubbing) return;
  isScrubbing = false;
  document.body.style.cursor = '';
}

renderer.domElement.addEventListener('mousedown', (ev) => {
  const picked = pick(ev);
  if (!picked) startScrub(); // only start scrubbing if click is outside the cube
});

renderer.domElement.addEventListener('mousemove', (ev) => {
  if (!isScrubbing) return;
  const dx = ev.movementX || 0;
  const dy = ev.movementY || 0;
  cube.rotation.y += dx * dragSensitivity;
  cube.rotation.x += dy * dragSensitivity;
  lastMoveTime = performance.now();
});

addEventListener('mouseup', endScrub);
renderer.domElement.addEventListener('mouseleave', endScrub);

if (health) health.textContent = "Menu ready ✓ — drag background to rotate";
console.log("[cube] clean menu cube loaded");
