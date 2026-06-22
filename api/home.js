/**
 * PROJECT   : ZOOSTREAM - HOME (Vercel Serverless Function)
 * AUTHOR    : BINTANG
 * ENDPOINT  : /api/home
 *
 * Function ini jalan di server Vercel, bukan di browser,
 * jadi request ke rijunime.com tidak kena masalah CORS.
 */

const https = require('https');
const querystring = require('querystring');

const BASE_URL = 'rijunime.com';

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(data);
    const options = {
      hostname: BASE_URL,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          reject(new Error('Parse error: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function categorizeItems(items) {
  const donghua = [];
  const anime = [];
  const movie = [];
  const drama = [];

  for (const item of items) {
    const genres = (item.post_genres || '').toLowerCase();
    const title = (item.post_title || '').toLowerCase();
    const entry = {
      title: item.post_title,
      url: item.post_link,
      image: item.post_image,
      genres: item.post_genres,
      type: item.post_type,
      year: item.post_title.match(/\((\d{4})\)/)?.[1] || 'Unknown',
    };

    if (genres.includes('animation') || title.includes('donghua') || genres.includes('donghua')) {
      donghua.push(entry);
    } else if (genres.includes('anime') || title.includes('anime') || genres.includes('japan')) {
      anime.push(entry);
    } else if (genres.includes('drama')) {
      drama.push(entry);
    } else {
      movie.push(entry);
    }
  }

  return { donghua, anime, movie, drama };
}

async function getHome() {
  const result = await post('/wp-admin/admin-ajax.php', {
    action: 'ts_ac_do_search',
    ts_ac_query: '',
    ts_ac_limit: 100,
  });

  const items = result.anime?.[0]?.all || [];
  const categorized = categorizeItems(items);

  return {
    success: true,
    project: 'ZOOSTREAM - HOME',
    author: 'BINTANG',
    total_items: items.length,
    categories: categorized,
  };
}

module.exports = async function handler(req, res) {
  // Izinkan dipanggil dari domain Vercel kamu sendiri (frontend statis)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const result = await getHome();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      project: 'ZOOSTREAM - HOME',
      author: 'BINTANG',
      error: err.message,
    });
  }
};
