/**
 * PROJECT   : ZOOSTREAM - DETAIL (Vercel Serverless Function)
 * AUTHOR    : BINTANG
 * ENDPOINT  : /api/detail?url=<encoded target url>
 */

const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

async function getSinopsisFromFirstEpisode(episodes) {
  if (!episodes || episodes.length === 0) return '';

  const firstEpisode = episodes.sort((a, b) => parseInt(a.episode) - parseInt(b.episode))[0];
  if (firstEpisode && firstEpisode.url) {
    try {
      const html = await fetchHtml(firstEpisode.url);
      const synMatch = html.match(/<p>([^<]{30,400})<\/p>/i);
      if (synMatch) return synMatch[1].trim();

      const metaDesc = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
      if (metaDesc) return metaDesc[1].trim();
    } catch (e) {
      /* ignore */
    }
  }
  return '';
}

async function getDetail(url) {
  const html = await fetchHtml(url);

  let title = '';
  const titleMatch = html.match(/<h1[^>]*>#?\s*([^<]+)<\/h1>/i);
  if (titleMatch) title = titleMatch[1].trim();
  if (!title) {
    const tMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (tMatch) title = tMatch[1].replace(/Nonton\s+|\s+Sub\s+Indo\s+–\s+Rijunime/gi, '').trim();
  }

  let image = '';
  const imgMatch =
    html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
    html.match(/<img[^>]*class="[^"]*attachment-post-thumbnail[^"]*"[^>]*src="([^"]+)"/i);
  if (imgMatch) image = imgMatch[1];

  let rating = '';
  const ratingMatch = html.match(/Rating\s*([0-9.]+)/i) || html.match(/([0-9.]+)\s*\/\s*10/i);
  if (ratingMatch) rating = ratingMatch[1];

  const metadata = {};
  const metaPatterns = ['Status', 'Dirilis', 'Durasi', 'Tipe', 'Episode', 'Kualitas', 'Studio', 'Network', 'Negara'];
  for (const label of metaPatterns) {
    const regex = new RegExp(`${label}:\\s*([^<\\n]+)`, 'i');
    const match = html.match(regex);
    if (match && !match[1].includes('text/javascript')) {
      const key = label.toLowerCase().replace(/ /g, '_');
      metadata[key] = match[1].trim();
    }
  }

  const episodes = [];
  const epRegex =
    /<a[^>]*href="(https?:\/\/rijunime\.com\/id\/[^"]+-episode-(\d+)\/)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*epl-num[^"]*"[^>]*>E?p?\s*(\d+)<\/div>/gi;
  let epMatch;
  while ((epMatch = epRegex.exec(html)) !== null) {
    const episodeNum = epMatch[2] || epMatch[3];
    episodes.push({
      episode: episodeNum,
      title: `${title} Episode ${episodeNum}`,
      url: epMatch[1],
    });
  }

  episodes.sort((a, b) => parseInt(a.episode) - parseInt(b.episode));

  const synopsis = await getSinopsisFromFirstEpisode(episodes);

  const genres = [];
  const genreRegex = /<a[^>]*href="[^"]*\/genres\/[^\/]+\/"[^>]*>([^<]+)<\/a>/gi;
  let genreMatch;
  while ((genreMatch = genreRegex.exec(html)) !== null && genres.length < 15) {
    const genre = genreMatch[1].trim();
    if (!genres.includes(genre) && genre.length > 2 && !genre.includes('&amp;')) {
      genres.push(genre);
    }
  }

  return {
    success: true,
    project: 'ZOOSTREAM - DETAIL',
    author: 'BINTANG',
    detail: {
      title: title || 'Tidak diketahui',
      image: image || '',
      rating: rating || 'N/A',
      metadata,
      synopsis: synopsis || 'Sinopsis tidak tersedia (buka episode 1 untuk lihat sinopsis)',
      genres: genres.slice(0, 10),
      total_episodes: episodes.length,
      episodes,
      source_url: url,
    },
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    res.status(400).json({
      success: false,
      project: 'ZOOSTREAM - DETAIL',
      author: 'BINTANG',
      error: 'Parameter "url" wajib diisi. Contoh: /api/detail?url=https://rijunime.com/id/renegade-immortal/',
    });
    return;
  }

  try {
    const result = await getDetail(targetUrl);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      project: 'ZOOSTREAM - DETAIL',
      author: 'BINTANG',
      error: err.message,
    });
  }
};
