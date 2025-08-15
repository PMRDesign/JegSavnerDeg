console.log('[cube] script starting…');

// Check WebGL support early
try {
  const test = document.createElement('canvas').getContext('webgl') ||
               document.createElement('canvas').getContext('experimental-webgl');
  if (!test) { alert('WebGL not available in this browser.'); throw new Error('WebGL unavailable'); }
} catch(e) {
  alert('WebGL failed to start.');
  throw e;
}

if (!window.THREE) {
  console.error('[cube] THREE is not defined — library failed to load.');
  const h = document.getElementById('health'); if (h) h.textContent = 'THREE not loaded ✗';
  throw new Error('THREE not loaded');
}
console.log('[cube] THREE version OK');

// Renderer / scene / camera
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0f0f12, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(2.6, 1.8, 3.2);

// Controls
if (!THREE.OrbitControls) {
  console.warn('[cube] OrbitControls missing — proceeding without controls');
} 
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.6;
controls.minDistance = 1.5;
controls.maxDistance = 8;

// Lights (kept bright to ensure you see something)
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const key = new THREE.DirectionalLight(0xfff2e0, 1.0); key.position.set(3,4,2); scene.add(key);
const rim = new THREE.DirectionalLight(0x99c2ff, 0.9); rim.position.set(-3,2,-3); scene.add(rim);

// Add an axes helper so you always see *something*
const axes = new THREE.AxesHelper(2);
scene.add(axes);

// Cube with solid color (super visible) + a gentle emissive so it pops
const mat = new THREE.MeshStandardMaterial({ color: 0x6aa8ff, metalness: 0.05, roughness: 0.35, emissive: 0x112244, emissiveIntensity: 0.2 });
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.6,1.6), mat);
scene.add(cube);

// Spin
let autoRotate = true;
function animate(){
  requestAnimationFrame(animate);
  if(autoRotate) cube.rotation.y += 0.01;
  if (controls) controls.update();
  renderer.render(scene,camera);
}
animate();
if (controls) {
  controls.addEventListener('start', ()=> autoRotate = false);
  controls.addEventListener('end', ()=> setTimeout(()=> autoRotate = true, 1200));
}

// Resize
window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// Simple click feedback
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const toast = document.getElementById('toast');
function showToast(t){
  toast.textContent = t;
  toast.style.display = 'block';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.style.display='none',1400);
}

renderer.domElement.addEventListener('click', ev=>{
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX-rect.left)/rect.width)*2 - 1;
  pointer.y = -((ev.clientY-rect.top)/rect.height)*2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(cube, false);
  if (hits.length) showToast('Cube clicked');
});

console.log('[cube] scene initialized');
const health = document.getElementById('health');
if (health) health.textContent = 'Scene running ✓';
