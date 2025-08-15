// sketches.js — build grid from manifest.json + lightbox
const grid = document.getElementById('grid');
const lb  = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbMeta = document.getElementById('lb-meta');
const lbClose = document.getElementById('lb-close');

async function loadManifest() {
  try {
    const res = await fetch('./manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    return await res.json();
  } catch (e) {
    console.error('manifest load error', e);
    return [];
  }
}

function makeItem(item) {
  const div = document.createElement('div');
  div.className = 'item';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = item.src;
  img.alt = item.title ? item.title : 'Sketch';
  div.appendChild(img);

  if (item.title || item.year) {
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.textContent = [item.title, item.year].filter(Boolean).join(' · ');
    div.appendChild(cap);
  }

  div.addEventListener('click', () => openLightbox(item));
  return div;
}

function openLightbox(item) {
  lbImg.src = item.src;
  lbImg.alt = item.title || 'Sketch';
  lbMeta.textContent = [item.title, item.year].filter(Boolean).join(' · ');
  lb.classList.add('open');
}

function closeLightbox() {
  lb.classList.remove('open');
  // release memory for big images
  lbImg.src = '';
}

lb.addEventListener('click', (e) => {
  if (e.target === lb || e.target === lbClose) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

(async function init(){
  const manifest = await loadManifest();
  manifest.forEach(item => grid.appendChild(makeItem(item)));
})();
