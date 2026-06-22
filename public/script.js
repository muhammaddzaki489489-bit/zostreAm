/**
 * ZOOSTREAM - HOME (frontend)
 * Fetch data dari /api/home (rail kategori) dan /api/search (hasil cari),
 * dengan search bar terintegrasi: ketik -> hasil gantiin rail, hapus -> balik ke rail.
 */

const CHANNELS = [
  { key: 'donghua', ch: 'ENC-01', title: 'Donghua' },
  { key: 'anime',   ch: 'ENC-02', title: 'Anime' },
  { key: 'movie',   ch: 'ENC-03', title: 'Movie' },
  { key: 'drama',   ch: 'ENC-04', title: 'Drama' },
];

const channelsEl = document.getElementById('channels');
const heroCountEl = document.getElementById('heroCount');
const statusDot = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');
const stateBanner = document.getElementById('stateBanner');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const searchStatus = document.getElementById('searchStatus');

let homeData = null;   // cache hasil /api/home, dipakai untuk balik dari mode search
let searchTimer = null;
let searchAbort = null;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function setStatus(state) {
  // state: 'connecting' | 'ok' | 'err'
  statusDot.className = 'status-dot ' + (state === 'ok' ? 'ok' : state === 'err' ? 'err' : '');
  statusLabel.textContent = state === 'ok' ? 'tersambung' : state === 'err' ? 'terputus' : 'menghubungkan';
}

function renderSkeleton() {
  channelsEl.innerHTML = CHANNELS.map((c) => `
    <section class="rail">
      <div class="rail-head">
        <span class="rail-ch">${c.ch}</span>
        <h2 class="rail-title">${c.title}</h2>
      </div>
      <div class="skel-row">
        ${Array.from({ length: 6 }).map(() => '<div class="skel-card"></div>').join('')}
      </div>
    </section>
  `).join('');
}

function cardHtml(entry) {
  const genre = (entry.genres || '').split(',')[0]?.trim() || '—';
  const img = entry.image || '';
  const detailHref = `detail/?url=${encodeURIComponent(entry.url || '')}`;
  return `
    <a class="card" href="${detailHref}">
      <img class="card-thumb" src="${escapeHtml(img)}" alt="${escapeHtml(entry.title)}" loading="lazy"
           onerror="this.style.opacity=0">
      <div class="card-body">
        <p class="card-title">${escapeHtml(entry.title)}</p>
        <div class="card-meta">
          <span>${escapeHtml(genre)}</span>
          <span>${escapeHtml(entry.year)}</span>
        </div>
      </div>
    </a>
  `;
}

function renderChannels(categories, labels = CHANNELS) {
  channelsEl.innerHTML = labels.map((c) => {
    const items = categories[c.key] || [];
    const body = items.length
      ? `<div class="rail-scroll">${items.map(cardHtml).join('')}</div>`
      : `<p class="rail-empty">Belum ada penghuni di habitat ini.</p>`;

    return `
      <section class="rail">
        <div class="rail-head">
          <span class="rail-ch">${c.ch}</span>
          <h2 class="rail-title">${c.title}</h2>
          <span class="rail-count">${items.length} judul</span>
        </div>
        ${body}
      </section>
    `;
  }).join('');
}

function showError(message) {
  stateBanner.hidden = false;
  stateBanner.textContent = `GAGAL MEMUAT · ${message}`;
  setStatus('err');
  heroCountEl.textContent = 'data tidak tersedia';
  channelsEl.innerHTML = CHANNELS.map((c) => `
    <section class="rail">
      <div class="rail-head">
        <span class="rail-ch">${c.ch}</span>
        <h2 class="rail-title">${c.title}</h2>
      </div>
      <p class="rail-empty">Tidak bisa memuat data.</p>
    </section>
  `).join('');
}

async function loadHome() {
  renderSkeleton();
  try {
    const res = await fetch('/api/home');
    if (!res.ok) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Respons tidak sukses');

    homeData = data;
    stateBanner.hidden = true;
    setStatus('ok');
    heroCountEl.textContent = `${data.total_items} judul tersedia`;
    renderChannels(data.categories || {});
  } catch (err) {
    showError(err.message);
  }
}

function backToHome() {
  searchStatus.textContent = '';
  searchClear.classList.remove('show');
  if (homeData) {
    heroCountEl.textContent = `${homeData.total_items} judul tersedia`;
    renderChannels(homeData.categories || {});
  } else {
    loadHome();
  }
}

async function runSearch(query) {
  searchClear.classList.add('show');
  searchStatus.textContent = 'mencari…';
  renderSkeleton();

  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: searchAbort.signal });
    if (!res.ok) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Respons tidak sukses');

    searchStatus.textContent = `${data.total} hasil untuk "${query}"`;
    heroCountEl.textContent = `${data.total} hasil pencarian`;
    renderChannels(data.categories || {});
  } catch (err) {
    if (err.name === 'AbortError') return;
    searchStatus.textContent = `Gagal mencari: ${err.message}`;
  }
}

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim();
  clearTimeout(searchTimer);

  if (!query) {
    backToHome();
    return;
  }

  searchStatus.textContent = 'mengetik…';
  searchClear.classList.add('show');
  searchTimer = setTimeout(() => runSearch(query), 450);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchInput.focus();
  backToHome();
});

loadHome();
