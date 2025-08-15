// Import Three.js and OrbitControls directly from esm.sh CDN
const THREE = await import('https://esm.sh/three@0.179.1');
const { OrbitControls } = await import('https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js');

// UI elements
const health = document.getElementById('health');
const canvas = document.getElementById('scene');

// Renderer: draws the scene onto our <canvas>
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // match screen resolution
renderer.setSize(window.innerWidth, window.innerHeight); // fill window
renderer.setClearColor(0x0f0f12, 1); // background color

// Scene & Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,                               // Field of view (zoom level)
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1,                              // Near clipping plane
  100                               // Far clipping plane
);
camera.position.set(2.6, 1.8, 3.2); // starting camera position

// OrbitControls: lets the viewer rotate/zoom with the mouse
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // smooth movement

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.7)); // soft fill light
const key = new THREE.DirectionalLight(0xfff2e0, 1.0); // main light
key.position.set(3, 4, 2); // x, y, z position in space
scene.add(key);

// Cube
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.6, 1.6, 1.6), // width, height, depth
  new THREE.MeshStandardMaterial({
    color: 0x6aa8ff,     // cube color
    roughness: 0.35,     // 0 = shiny, 1 = rough/matte
    metalness: 0.05      // 0 = non-metal, 1 = mirror metal
  })
);
scene.add(cube);

// === PARAMETERS YOU CAN TUNE ===
let rotationSpeedY = 0.01; // rotation speed around Y-axis
let rotationSpeedX = 0.00; // rotation speed around X-axis

// Animation loop
function tick() {
  requestAnimationFrame(tick);

  // Rotate cube
  cube.rotation.y += rotationSpeedY; // spin left/right
  cube.rotation.x += rotationSpeedX; // spin up/down

  controls.update();
  renderer.render(scene, camera);
}
tick();

// Handle window resizing
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Click feedback (for future media links)
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('click', (ev) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(cube, false)[0];
  if (hit) {
    health.textContent = 'Cube clicked ✓';
    setTimeout(() => health.textContent = 'Scene running ✓', 1200);
  }
});

health.textContent = 'Scene running ✓';
console.log('[cube] module loaded');
