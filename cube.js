// Check WebGL support
try {
  const test = document.createElement('canvas').getContext('webgl') ||
               document.createElement('canvas').getContext('experimental-webgl');
  if (!test) { alert('WebGL not available in this browser.'); throw new Error('WebGL unavailable'); }
} catch(e) {
  alert('WebGL failed to start.');
  throw e;
}

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0f0f12, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(2.6, 1.8, 3.2);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.6;
controls.minDistance = 1.5;
controls.maxDistance = 8;

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const key = new THREE.DirectionalLight(0xfff2e0, 1.0); key.position.set(3,4,2); scene.add(key);
const rim = new THREE.DirectionalLight(0xbad4ff, 0.7); rim.position.set(-3,2,-3); scene.add(rim);

// Materials with labels
const faceLabels = ["Front","Back","Left","Right","Top","Bottom"];
const colors = [0x9aa4ff,0xffb3b3,0x9fe0c6,0xf4d88a,0xcaa8f3,0x86c5f4];
function faceMat(label, color){
  const mat = new THREE.MeshStandardMaterial({ color, metalness:0.05, roughness:0.35 });
  const size = 256;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#00000022'; ctx.fillRect(0,0,size,size);
  ctx.fillStyle = '#ffffffcc'; ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, size/2, size/2);
  const tex = new THREE.Texture(c); tex.needsUpdate = true;
  mat.map = tex; return mat;
}
const materials = faceLabels.map((l,i)=>faceMat(l,colors[i]));
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.6,1.6), materials);
scene.add(cube);

// Animation
let autoRotate = true;
function animate(){
  requestAnimationFrame(animate);
  if(autoRotate) cube.rotation.y += 0.005;
  controls.update();
  renderer.render(scene,camera);
}
animate();
controls.addEventListener('start', ()=> autoRotate = false);
controls.addEventListener('end', ()=> setTimeout(()=> autoRotate = true, 1200));

// Resize
window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// Click detection
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
  const hit = raycaster.intersectObject(cube, false)[0];
  if(hit){
    const faceIndex = Math.floor(hit.faceIndex/2);
    showToast('You clicked: ' + faceLabels[faceIndex]);
    // Later: trigger your media for that face here
  }
});

// Reset view
document.getElementById('reset').addEventListener('click', ()=>{
  controls.reset();
  camera.position.set(2.6, 1.8, 3.2);
});
