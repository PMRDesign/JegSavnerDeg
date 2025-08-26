// cube.js — OFFRER cube, Source Sans Pro faces, drag+inertia, mobile tap,
// corner weights with label/corner snap, transparent over your background.

const THREE = await import('https://esm.sh/three@0.179.1');
const { OrbitControls } = await import('https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js');

const canvas = document.getElementById('scene');

// ---------- MENU CONFIG (OFFRER) ----------
// Faces: 0=Front, 1=Back, 2=Left, 3=Right, 4=Top, 5=Bottom
const faceLabels = ["Form", "Echoes", "Flow", "Rituals", "Origin", "Resonance"];
const routes = {
  0: "form/",       // Front
  1: "echoes/",     // Back
  2: "flow/",       // Left
  3: "rituals/",    // Right
  4: "origin/",     // Top
  5: "resonance/"   // Bottom
};
// ------------------------------------------

// Desktop hover cursor for the clickable center
const CLICK_CURSOR = "url('./assets/cursor.svg') 6 2, pointer";

// ---------- Zoom limits ----------
const minZoomDistance = 1.5;
const maxZoomDistance = 15.0;
// ---------------------------------

// Renderer (transparent)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

// Scene & camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3.2, 2.0, 4.6);

// Controls (wheel zoom only)
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
const rim = new THREE.DirectionalLight(0x9cc6ff, 0.6);  rim.position.set(-2.5, 2.0, -2.5); scene.add(rim);

// Face material — Source Sans Pro
function makeFaceMaterial(label) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#1b1f27";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#eaeaf5";
  ctx.font = "400 58px 'Source Sans Pro', sans-serif";
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

// Starting pose (slight up-tilt shows a bit of the bottom; tweak to taste)
cube.rotation.set(0, -2, 0);

// -------- Feel / motion ----------
let showIntroSpin = true;   // first-time hint spin
let introRotationY = 0.010;
let introRotationX = 0.000;

const dragSensitivity = 0.006;
let isScrubbing = false;
let inertiaActive = false;
let vX = 0, vY = 0;
const inertiaDamping = 0.985;
const stopThreshold = 0.00002;
// -------------------------------

// Animate loop
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
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ------- Picking helpers -------
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
  const uv = hit.uv || null; // 0..1 across that face
  return { faceIndex, uv };
}
// -------------------------------

// Desktop hover cursor (center 60%)
renderer.domElement.addEventListener("mousemove", (ev) => {
  if (isScrubbing) return;
  const p = pick(ev);
  if (!p || !p.uv) { document.body.style.cursor = ""; return; }
  const { x: u, y: v } = p.uv;
  const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
  document.body.style.cursor = inCenter ? CLICK_CURSOR : "";
});

// Desktop click → route (center 60%)
renderer.domElement.addEventListener("click", (ev) => {
  if (isScrubbing) return;
  const p = pick(ev);
  if (!p || !p.uv) return;
  const { x: u, y: v } = p.uv;
  if (!(u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8)) return;
  const dest = routes[p.faceIndex];
  if (dest) window.location.href = dest;
});

// Mouse drag to rotate (edges/background), with inertia
let lastMoveTime = 0;

renderer.domElement.addEventListener("mousedown", (ev) => {
  const p = pick(ev);
  let startDrag = false;

  if (!p || !p.uv) startDrag = true;
  else {
    const { x: u, y: v } = p.uv;
    const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
    startDrag = !inCenter;
  }

  if (startDrag) {
    isScrubbing = true;
    inertiaActive = false;
    showIntroSpin = false; // cancel intro on first drag
    document.body.style.cursor = 'grabbing';
  }
});

renderer.domElement.addEventListener("mousemove", (ev) => {
  if (!isScrubbing) return;
  const dx = ev.movementX || 0;
  const dy = ev.movementY || 0;
  const k = dragSensitivity;
  cube.rotation.y += dx * k;
  cube.rotation.x += dy * k;
  vY = dx * k; vX = dy * k;
  lastMoveTime = performance.now();
});

function endScrub() {
  if (!isScrubbing) return;
  isScrubbing = false;
  document.body.style.cursor = "";
  if (performance.now() - lastMoveTime < 120) inertiaActive = true;
}
addEventListener("mouseup", endScrub);
renderer.domElement.addEventListener("mouseleave", endScrub);

// Touch support: tap center to open; drag edges/background to rotate
let lastTouch = null;
let tapCandidate = null;
const TAP_MOVE_MAX = 12;   // px
const TAP_TIME_MAX = 450;  // ms

renderer.domElement.addEventListener('touchstart', (ev) => {
  if (!ev.touches || ev.touches.length === 0) return;
  const t = ev.touches[0];
  const now = performance.now();
  const p = pick(t);

  if (!p || !p.uv) {
    isScrubbing = true; inertiaActive = false; showIntroSpin = false;
    lastTouch = { x: t.clientX, y: t.clientY, time: now };
    tapCandidate = null;
  } else {
    const { x: u, y: v } = p.uv;
    const inCenter = (u > 0.2 && u < 0.8 && v > 0.2 && v < 0.8);
    if (inCenter) {
      isScrubbing = false; inertiaActive = false; showIntroSpin = false;
      lastTouch = { x: t.clientX, y: t.clientY, time: now };
      tapCandidate = { faceIndex: p.faceIndex, startX: t.clientX, startY: t.clientY, startTime: now };
    } else {
      isScrubbing = true; inertiaActive = false; showIntroSpin = false;
      lastTouch = { x: t.clientX, y: t.clientY, time: now };
      tapCandidate = null;
    }
  }
  ev.preventDefault();
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (ev) => {
  if (!ev.touches || ev.touches.length === 0) return;
  const t = ev.touches[0];
  const now = performance.now();
  const dx = t.clientX - (lastTouch?.x ?? t.clientX);
  const dy = t.clientY - (lastTouch?.y ?? t.clientY);

  if (tapCandidate) {
    const moved = Math.hypot(t.clientX - tapCandidate.startX, t.clientY - tapCandidate.startY);
    if (moved > TAP_MOVE_MAX) { isScrubbing = true; tapCandidate = null; }
  }

  if (isScrubbing) {
    const k = dragSensitivity;
    cube.rotation.y += dx * k;
    cube.rotation.x += dy * k;
    const dt = Math.max(1, (now - (lastTouch?.time ?? now)));
    vY = (dx * k) * (16 / dt);
    vX = (dy * k) * (16 / dt);
  }

  lastTouch = { x: t.clientX, y: t.clientY, time: now };
  ev.preventDefault();
}, { passive: false });

function endTouch(ev) {
  const now = performance.now();

  if (tapCandidate) {
    const moved = Math.hypot((lastTouch?.x ?? tapCandidate.startX) - tapCandidate.startX,
                             (lastTouch?.y ?? tapCandidate.startY) - tapCandidate.startY);
    const elapsed = now - tapCandidate.startTime;
    if (moved <= TAP_MOVE_MAX && elapsed <= TAP_TIME_MAX) {
      const dest = routes[tapCandidate.faceIndex];
      tapCandidate = null;
      if (dest) { window.location.href = dest; ev && ev.preventDefault(); return; }
    }
    tapCandidate = null;
  }

  if (isScrubbing) { isScrubbing = false; inertiaActive = true; }
  lastTouch = null;
  ev && ev.preventDefault();
}
renderer.domElement.addEventListener('touchend', endTouch,   { passive: false });
renderer.domElement.addEventListener('touchcancel', endTouch, { passive: false });

// ===== Bilinear corner weights with snapping =====
const wTL = document.getElementById('w-tl');
const wTR = document.getElementById('w-tr');
const wBL = document.getElementById('w-bl');
const wBR = document.getElementById('w-br');
const clamp01 = v => Math.max(0, Math.min(1, v));

function updateCornerWeightsFromClient(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();

  // A) Snap on label hover/touch
  const SNAP_PAD = 10; // px
  const inRect = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return (clientX >= r.left - SNAP_PAD && clientX <= r.right + SNAP_PAD &&
            clientY >= r.top  - SNAP_PAD && clientY <= r.bottom + SNAP_PAD);
  };
  if (inRect(wTL)) return setWeights(100, 0, 0, 0); // TL=Kongsvinger
  if (inRect(wTR)) return setWeights(0, 100, 0, 0); // TR=Berlin
  if (inRect(wBL)) return setWeights(0, 0, 100, 0); // BL=Rio
  if (inRect(wBR)) return setWeights(0, 0, 0, 100); // BR=Sydney

  // B) Snap near canvas corners
  const x = clamp01((clientX - rect.left) / rect.width);
  const y = clamp01((clientY - rect.top)  / rect.height);
  const CORNER_THRESH = 0.06; // 6%
  if (x <= CORNER_THRESH && y <= CORNER_THRESH)   return setWeights(100, 0, 0, 0);
  if (x >= 1 - CORNER_THRESH && y <= CORNER_THRESH) return setWeights(0, 100, 0, 0);
  if (x <= CORNER_THRESH && y >= 1 - CORNER_THRESH) return setWeights(0, 0, 100, 0);
  if (x >= 1 - CORNER_THRESH && y >= 1 - CORNER_THRESH) return setWeights(0, 0, 0, 100);

  // C) Smooth bilinear blend + residual fix
  let K = Math.round((1 - x) * (1 - y) * 100);
  let B = Math.round(x * (1 - y) * 100);
  let R = Math.round((1 - x) * y * 100);
  let S = Math.round(x * y * 100);

  const sum = K + B + R + S;
  const residual = 100 - sum;
  if (residual !== 0) {
    const arr = [K, B, R, S];
    let maxIdx = 0; for (let i = 1; i < 4; i++) if (arr[i] > arr[maxIdx]) maxIdx = i;
    arr[maxIdx] += residual;
    [K, B, R, S] = arr;
  }
  return setWeights(K, B, R, S);

  function setWeights(K, B, R, S) {
    if (wTL) wTL.textContent = `Kongsvinger ${K}`;
    if (wTR) wTR.textContent = `Berlin ${B}`;
    if (wBL) wBL.textContent = `Rio ${R}`;
    if (wBR) wBR.textContent = `Sydney ${S}`;
  }
}

// Update numbers on move (mouse/touch)
renderer.domElement.addEventListener('mousemove', (ev) => {
  updateCornerWeightsFromClient(ev.clientX, ev.clientY);
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (ev) => {
  if (!ev.touches || ev.touches.length === 0) return;
  const t = ev.touches[0];
  updateCornerWeightsFromClient(t.clientX, t.clientY);
}, { passive: true });

// Initialize centered (50/50 split)
(function initWeightsAtCenter(){
  const r = renderer.domElement.getBoundingClientRect();
  updateCornerWeightsFromClient(r.left + r.width/2, r.top + r.height/2);
})();
