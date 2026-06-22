/**
 * PROJECT   : ZOOSTREAM - STREAM (Vercel Serverless Function)
 * AUTHOR    : BINTANG
 * ENDPOINT  : /api/stream?url=<encoded episode url>
 */

const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + (urlObj.search || ''),
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'id-ID,id;q=0.9',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function getStream(episodeUrl) {
  const html = await fetchHtml(episodeUrl);

  let videoUrl = null;
  const iframeMatch = html.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (iframeMatch) {
    videoUrl = iframeMatch[1];
    if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;
  }

  const servers = [];
  const optionRegex = /<option[^>]*value="([^"]+)"[^>]*>([^<]+)<\/option>/gi;
  let match;
  while ((match = optionRegex.exec(html)) !== null) {
    const value = match[1];
    const name = match[2].trim();
    if (value && name !== 'Select Video Server' && name !== 'Select Server') {
      try {
        const decoded = Buffer.from(value, 'base64').toString('utf-8');
        const srcMatch = decoded.match(/src=["']([^"']+)["']/i);
        if (srcMatch) {
          let serverUrl = srcMatch[1];
          if (serverUrl.startsWith('//')) serverUrl = 'https:' + serverUrl;
          servers.push({ name, url: serverUrl });
        } else {
          servers.push({ name, url: value });
        }
      } catch (e) {
        servers.push({ name, url: value });
      }
    }
  }

  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  return {
    success: true,
    project: 'ZOOSTREAM - STREAM',
    author: 'BINTANG',
    episode: title,
    video_url: videoUrl,
    servers,
    total_servers: servers.length,
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
      project: 'ZOOSTREAM - STREAM',
      author: 'BINTANG',
      error: 'Parameter "url" wajib diisi. Contoh: /api/stream?url=https://rijunime.com/id/renegade-immortal-episode-1/',
    });
    return;
  }

  try {
    const result = await getStream(targetUrl);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      project: 'ZOOSTREAM - STREAM',
      author: 'BINTANG',
      error: err.message,
    });
  }
};
