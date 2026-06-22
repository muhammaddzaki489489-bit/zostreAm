/**
 * ZOOSTREAM - DETAIL (frontend)
 * Ambil ?url= dari query string, fetch /api/detail, render specimen + episode grid.
 */

const root = document.getElementById('detailRoot');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function getTargetUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('url');
}

function metaItem(label, value) {
  if (!value) return '';
  return `<span class="meta-item">${escapeHtml(label)}: <strong>${escapeHtml(value)}</strong></span>`;
}

function episodeHtml(ep, sourceUrl) {
  const href = `../stream/?url=${encodeURIComponent(ep.url)}&from=${encodeURIComponent(sourceUrl)}`;
  return `
    <a class="episode-item" href="${href}">
      <span class="episode-num">EPS</span>
      <span class="episode-label">${escapeHtml(ep.episode)}</span>
    </a>
  `;
}

function renderDetail(data, sourceUrl) {
  const d = data.detail;
  const meta = d.metadata || {};

  const genrePills = (d.genres || [])
    .map((g) => `<span class="genre-pill">${escapeHtml(g)}</span>`)
    .join('');

  const episodes = d.episodes || [];
  const episodeGrid = episodes.length
    ? `<div class="episode-grid">${episodes.map((ep) => episodeHtml(ep, sourceUrl)).join('')}</div>`
    : `<p class="detail-empty">Belum ada episode tercatat untuk judul ini.</p>`;

  root.innerHTML = `
    <section class="specimen">
      <img class="specimen-poster" src="${escapeHtml(d.image)}" alt="${escapeHtml(d.title)}" onerror="this.style.opacity=0">
      <div class="specimen-info">
        <span class="specimen-tag">Spesimen Koleksi</span>
        <h1 class="specimen-title">${escapeHtml(d.title)}</h1>
        <div class="specimen-meta-row">
          ${d.rating && d.rating !== 'N/A' ? `<span class="rating-badge">★ ${escapeHtml(d.rating)}</span>` : ''}
          ${metaItem('Status', meta.status)}
          ${metaItem('Tipe', meta.tipe)}
          ${metaItem('Rilis', meta.dirilis)}
          ${metaItem('Negara', meta.negara)}
        </div>
        ${genrePills ? `<div class="specimen-genres">${genrePills}</div>` : ''}
        <p class="specimen-synopsis">${escapeHtml(d.synopsis)}</p>
      </div>
    </section>

    <section class="episode-section">
      <div class="episode-head">
        <span class="episode-eyebrow">Katalog</span>
        <h2 class="episode-heading">Episode</h2>
        <span class="episode-count">${d.total_episodes} total</span>
      </div>
      ${episodeGrid}
    </section>
  `;
}

function renderError(message) {
  root.innerHTML = `<p class="detail-error">GAGAL MEMUAT SPESIMEN · ${escapeHtml(message)}</p>`;
}

async function init() {
  const targetUrl = getTargetUrl();
  if (!targetUrl) {
    renderError('Tidak ada judul yang ditentukan. Kembali ke Home dan pilih salah satu.');
    return;
  }

  try {
    const res = await fetch(`/api/detail?url=${encodeURIComponent(targetUrl)}`);
    if (!res.ok) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Respons tidak sukses');

    renderDetail(data, targetUrl);
    document.title = `${data.detail.title} — ZooStream`;
  } catch (err) {
    renderError(err.message);
  }
}

init();
