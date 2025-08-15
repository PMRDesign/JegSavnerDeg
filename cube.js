// cube.js — 6-face menu cube with background-drag rotation
const THREE = await import('https://esm.sh/three@0.179.1');
const { OrbitControls } = await import('https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js');

const health = document.getElementById('health');
const canvas = document.getElementById('scene');

// --------- MENU CONFIG (edit labels/destinations here) ---------
const faceLabels = ["Music", "Sketches", "Texts", "Demos", "About", "Notes"];
const routes = {
  0: "music/",     // Front
  1: "sketches/",  // Back
  2: "texts/",     // Left
  3: "demos/",     // Right
  4: "about.html", // Top
  5: "notes.html"  // Bottom
};
// ---------------------------------------------------------------

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0f0f12, 1);

// Scene & camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(2.6, 1.8, 3.2);

// Controls: keep zoom, but let US rotate the cube ourselves
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false;   // <— disable OrbitControls rotation
controls.enablePan = false;
controls.minDistance = 1.5;
controls.maxDistance = 8;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const key = new THREE.DirectionalLight(0xfff2e0, 1.0); key.position.set(3, 4, 2); scene.add(key);

// Helper to build a face with a labeled texture
function makeFaceMaterial(label, color = "#1b1f2a") {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  // background
  ctx.fillStyle = color; ctx.fillRect(0, 0, size, size);

  // subtle vignette
  const g = ctx.createRadialGradient(size/2, size/2, size*0.2, size/2, size/2, size*0.7);
  g.addColorStop(0, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);

  // label
  ctx.fillStyle = "#eaeaf5";
  ctx.font = "600 56px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, size/2, size/2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: tex,
    metalness: 0.04,
    roughness: 0.42,
  });
}

// Materials (one per face)
const materials = faceLabels.map(lbl => makeFaceMaterial(lbl));

// Cube
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), materials);
scene.add(cube);

// --- Feel / motion parameters you can tweak ---
let rotationSpeedY = 0.010;     // idle spin left/right (gentle: 0.005–0.015)
let rotationSpeedX = 0.000;     // idle spin up/down
const hoverSpinPause = 1200;    // ms after user interaction before resuming idle
const dragSensitivity = 0.006;  // how much the cube follows your hand (try 0.003–0.012)
// ------------------------------------------------

let autoRotate = true;
let isScrubbing = false;

// Animate
function animate() {
  requestAnimationFrame(animate);
  if (autoRotate) {
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

// Raycaster for hit tests
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// CLICK → ROUTE (when clicking ON the cube)
renderer.domElement.addEventListener("click", (ev) => {
  if (isScrubbing) return; // ignore clicks if we were dragging background
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(cube, false)[0];
  if (!hit) return;
  const face = Math.floor(hit.faceIndex / 2);
  const dest = routes[face];
  if (dest) window.location.href = dest;
});

// ===== Background drag to rotate the cube =====
function startScrub() {
  isScrubbing = true;
  autoRotate = false;
  document.body.style.cursor = 'grabbing';
}
function endScrub() {
  isScrubbing = false;
  document.body.style.cursor = '';
  setTimeout(() => autoRotate = true, hoverSpinPause);
}

// Start scrub ONLY if we clicked the background (not the cube)
renderer.domElement.addEventListener('mousedown', (ev) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(cube, false)[0];
  if (!hit) startScrub();
});

renderer.domElement.addEventListener('mousemove', (ev) => {
  if (!isScrubbing) return;
  // Use movementX/Y (delta since last mousemove) for smooth scrubbing
  const dx = ev.movementX || 0;
  const dy = ev.movementY || 0;
  cube.rotation.y += dx * dragSensitivity;   // horizontal moves twist left/right
  cube.rotation.x += dy * dragSensitivity;   // vertical moves tilt up/down
});

addEventListener('mouseup', endScrub);
renderer.domElement.addEventListener('mouseleave', endScrub);

if (health) health.textContent = "Menu ready ✓ — drag background to rotate";
console.log("[cube] menu cube with background-drag loaded");
