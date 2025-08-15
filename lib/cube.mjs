// Import Three.js + OrbitControls as ES modules (current stable r179)
import * as THREE from 'https://unpkg.com/three@0.179.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.179.1/examples/jsm/controls/OrbitControls.js';

console.log('[cube] module starting…');
const health = document.getElementById('health');
const toast = document.getElementById('toast');

function showToast(t){
  toast.textContent = t;
  toast.style.display = 'block';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.style.display='none',1400);
}

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
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.6;
controls.minDistance = 1.5;
controls.maxDistance = 8;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const key = new THREE.DirectionalLight(0xfff2e0, 1.0); key.position.set(3,4,2); scene.add(key);
const rim = new THREE.DirectionalLight(0x99c2ff, 0.9); rim.position.set(-3,2,-3); scene.add(rim);

// Add an axes helper so there's always something visible
scene.add(new THREE.AxesHelper(2));

// The cube
const mat = new THREE.MeshStandardMaterial({
  color: 0x6aa8ff, metalness: 0.05, roughness: 0.35, emissive: 0x112244, emissiveIntensity: 0.2
});
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.6,1.6), mat);
scene.add(cube);

// Animate
let autoRotate = true;
function animate(){
  requestAnimationFrame(animate);
  if (autoRotate) cube.rotation.y += 0.01;
  controls.update();
  renderer.render(scene, camera);
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

// Click feedback
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
renderer.domElement.addEventListener('click', ev=>{
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX-rect.left)/rect.width)*2 - 1;
  pointer.y = -((ev.clientY-rect.top)/rect.height)*2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(cube, false);
  if (hits.length) showToast('Cube clicked');
});

document.getElementById('reset').addEventListener('click', ()=>{
  controls.reset();
  camera.position.set(2.6, 1.8, 3.2);
});

if (health) health.textContent = 'Scene running ✓';
console.log('[cube] scene initialized');
