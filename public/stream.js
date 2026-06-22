/**
 * ZOOSTREAM - STREAM (frontend)
 * Query params:
 *   url  = url episode yang ditonton (wajib)
 *   from = url halaman detail asal, dipakai untuk tombol "Kembali" dan nav prev/next
 */

const root = document.getElementById('streamRoot');
const backLink = document.getElementById('backToDetail');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    url: params.get('url'),
    from: params.get('from'),
  };
}

function renderError(message) {
  root.innerHTML = `<p class="stream-error">GAGAL MEMUAT TAYANGAN · ${escapeHtml(message)}</p>`;
}

function buildPlayerHtml(servers, activeIndex, fallbackUrl) {
  const active = servers[activeIndex];
  const src = active ? active.url : fallbackUrl;
  if (!src) {
    return `<div class="player-empty">Sumber tayang tidak ditemukan untuk episode ini.<br>Coba server lain atau buka dari halaman detail.</div>`;
  }
  return `<iframe src="${escapeHtml(src)}" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
}

function render(streamData, navInfo) {
  const servers = streamData.servers || [];
  const hasFallback = !!streamData.video_url;
  const initialSrc = hasFallback ? null : (servers[0]?.url || null);

  const serverPills = servers
    .map(
      (s, i) =>
        `<button class="server-pill${i === 0 && !hasFallback ? ' active' : ''}" data-index="${i}">${escapeHtml(s.name)}</button>`
    )
    .join('');

  const navHtml = navInfo
    ? `
      <nav class="episode-nav">
        ${
          navInfo.prev
            ? `<a class="nav-btn prev" href="../stream/?url=${encodeURIComponent(navInfo.prev.url)}&from=${encodeURIComponent(navInfo.from)}">
                <span class="nav-eyebrow">← Sebelumnya</span>
                <span class="nav-label">Episode ${escapeHtml(navInfo.prev.episode)}</span>
              </a>`
            : `<span class="nav-btn prev disabled"><span class="nav-eyebrow">← Sebelumnya</span><span class="nav-label">Tidak ada</span></span>`
        }
        ${
          navInfo.next
            ? `<a class="nav-btn next" href="../stream/?url=${encodeURIComponent(navInfo.next.url)}&from=${encodeURIComponent(navInfo.from)}">
                <span class="nav-eyebrow">Selanjutnya →</span>
                <span class="nav-label">Episode ${escapeHtml(navInfo.next.episode)}</span>
              </a>`
            : `<span class="nav-btn next disabled"><span class="nav-eyebrow">Selanjutnya →</span><span class="nav-label">Tidak ada</span></span>`
        }
      </nav>
    `
    : '';

  root.innerHTML = `
    <div class="episode-eyebrow-row">
      <span class="observation-tag">Ruang Tayang</span>
    </div>
    <h1 class="stream-title">${escapeHtml(streamData.episode || 'Episode')}</h1>

    <div class="player-frame" id="playerFrame">
      ${hasFallback ? `<iframe src="${escapeHtml(streamData.video_url)}" allowfullscreen referrerpolicy="no-referrer"></iframe>` : buildPlayerHtml(servers, 0, initialSrc)}
    </div>

    ${
      servers.length
        ? `<section class="server-section">
            <span class="server-label">Kanal Observasi (${servers.length})</span>
            <div class="server-row">${serverPills}</div>
          </section>`
        : ''
    }

    ${navHtml}
  `;

  const playerFrame = document.getElementById('playerFrame');
  root.querySelectorAll('.server-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      root.querySelectorAll('.server-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const idx = parseInt(pill.dataset.index, 10);
      const server = servers[idx];
      if (server) {
        playerFrame.innerHTML = `<iframe src="${escapeHtml(server.url)}" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
      }
    });
  });
}

async function fetchNavInfo(fromUrl, currentEpisodeUrl) {
  if (!fromUrl) return null;
  try {
    const res = await fetch(`/api/detail?url=${encodeURIComponent(fromUrl)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;

    const episodes = data.detail.episodes || [];
    const idx = episodes.findIndex((e) => e.url === currentEpisodeUrl);
    if (idx === -1) return { from: fromUrl, prev: null, next: null };

    return {
      from: fromUrl,
      prev: idx > 0 ? episodes[idx - 1] : null,
      next: idx < episodes.length - 1 ? episodes[idx + 1] : null,
    };
  } catch (e) {
    return null;
  }
}

async function init() {
  const { url, from } = getParams();

  if (from) {
    backLink.href = `../detail/?url=${encodeURIComponent(from)}`;
  }

  if (!url) {
    renderError('Tidak ada episode yang ditentukan. Kembali ke detail dan pilih salah satu.');
    return;
  }

  try {
    const [streamRes, navInfo] = await Promise.all([
      fetch(`/api/stream?url=${encodeURIComponent(url)}`),
      fetchNavInfo(from, url),
    ]);

    if (!streamRes.ok) throw new Error('Status ' + streamRes.status);
    const data = await streamRes.json();
    if (!data.success) throw new Error(data.error || 'Respons tidak sukses');

    render(data, navInfo);
    document.title = `${data.episode || 'Tayang'} — ZooStream`;
  } catch (err) {
    renderError(err.message);
  }
}

init();
