// cube.js — clean shine, central hover/click, background-drag, one-time idle spin
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

// Pixelated hand cursor (SVG data URI)
const PIXEL_HAND_CURSOR = `url('data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" shape-rendering="crispEdges">
  <rect width="16" height="16" fill="none"/>
  <rect x="3" y="2" width="3" height="7" fill="#ffffff"/>
  <rect x="6" y="4" width="3" height="7" fill="#ffffff"/>
  <rect x="9" y="6" width="3" height="6" fill="#ffffff"/>
  <rect x="12" y="8" width="2" height="4" fill="#ffffff"/>
  <rect x="3" y="9" width="8" height="3" fill="#ffffff"/>
  <rect x="4" y="12" width="5" height="2" fill="#ffffff"/>
  <rect x="5" y="14" width="3" height="1" fill="#ffffff"/>
</svg>`)}') 6 2, pointer`;

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0f0f12, 1);

// Scene & camera (more zoomed out; “looking a little upward” at the cube to show bottom)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3.2, 1.6, 4.6);    // slightly lower Y than before so we see bottom face angle

// Controls: keep wheel zoom; we rotate cube via background drag
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false;
controls.enablePan = false;
controls.minDistance = 1.5;
controls.maxDistance = 8;

// Lights for subtle shine
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const key = new THREE.DirectionalLight(0xfff2e0, 1.0); key.position.set(3, 4, 2); scene.add(key);
const rim = new THREE.DirectionalLight(0x9cc6ff, 0.6); rim.position.set(-2.5, 2.0, -2.5); scene.add(rim);

// Build a flat label face, but use a shiny material (no vignette)
function makeFaceMaterial(label, opts={}) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  // Flat background
  ctx.fillStyle = opts.bg || "#1b1f27";
  ctx.fillRect(0, 0, size, size);

  // Centered label text
  ctx.fillStyle = opts.fg || "#eaeaf5";
  ctx.font = "600 58px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, size / 2, size / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  // MeshStandardMaterial for gentle shine
  return new THREE.MeshStandardMaterial({
    map: tex,
    metalness: 0.15,     // a touch of metallic sheen
    roughness: 0.22      // lower = smoother highlight
  });
}

// Materials (one per face)
const materials = faceLabels.map(lbl => makeFaceMaterial(lbl));
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), materials);
scene.add(cube);

// Initial orientation so you glimpse the bottom face a bit
cube.rotation.x = -0.22;
cube.rotation.y = 0.35;

// ------- Feel / motion parameters -------
let rotationSpeedY = 0.010;   // initial idle spin (indicator only)
let rotationSpeedX = 0.000;
const dragSensitivity = 0.006; // background-drag responsiveness
let autoRotate = true;         // only before first drag
let hasUserScrubbed = false;   // once true, idle spin never returns
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

// Hover / click region: only central 60% (UV 0.2–0.8) is interactive
let hoverFace = -1;
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

function setHover(faceIdx) {
  if (hoverFace === faceIdx) return;
  // clear previous hover emissive
  if (hoverFace >= 0) {
    const m = materials[hoverFace];
    m.emissive = new THREE.Color(0x000000);
    m.emissiveIntensity = 0;
    m.needsUpdate = true;
  }
  hoverFace = faceIdx;
  if (hoverFace >= 0) {
    const m = materials[hoverFace];
    // soft “lift” on hover
    m.emissive = new THREE.Color(0xffffff);
    m.emissiveIntensity = 0.22;
    m.needsUpdate = true;
  }
  // cursor
  if (hoverFace >= 0) {
    document.body.style.cursor = PIXEL_HAND_CURSOR;
  } else if (isScrubbing) {
    document.body.style.cursor = 'grabbing';
  } else {
    document.body.style.cursor = '';
  }
}

// Hover detection
renderer.domElement.addEventListener("mousemove", (ev) => {
  if (isScrubbing) return; // during scrubbing, ignore hover
  const res = pick(ev);
  if (!res || !res.uv) { setHover(-1); return; }
  const { x: u, y: v } = res.uv;
  const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
  setHover(inCenter ? res.faceIndex : -1);
});

// Click → route (only when hover is active)
renderer.domElement.addEventListener("click", (ev) => {
  if (isScrubbing) return;
  const res = pick(ev);
  if (!res || !res.uv) return;
  const { x: u, y: v } = res.uv;
  const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
  if (!inCenter) return;
  const dest = routes[res.faceIndex];
  if (dest) window.location.href = dest;
});

// ===== Background drag to rotate the cube (stop idle forever after first drag) =====
let isScrubbing = false;
function startScrub() {
  isScrubbing = true;
  autoRotate = false;
  hasUserScrubbed = true; // never resume idle spin
  document.body.style.cursor = 'grabbing';
  // remove any hover highlight while scrubbing
  if (hoverFace >= 0) setHover(-1);
}
function endScrub() {
  if (!isScrubbing) return;
  isScrubbing = false;
  document.body.style.cursor = '';
}

renderer.domElement.addEventListener('mousedown', (ev) => {
  const res = pick(ev);
  if (!res) startScrub(); // click on background only
});
renderer.domElement.addEventListener('mousemove', (ev) => {
  if (!isScrubbing) return;
  cube.rotation.y += (ev.movementX || 0) * dragSensitivity;
  cube.rotation.x += (ev.movementY || 0) * dragSensitivity;
});
addEventListener('mouseup', endScrub);
renderer.domElement.addEventListener('mouseleave', endScrub);

if (health) health.textContent = "Menu ready ✓ — hover center of a face, or drag background to rotate";
console.log("[cube] polished minimal cube loaded");
