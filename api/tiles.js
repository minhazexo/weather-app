// Vercel Serverless: GET /api/tiles?layer=clouds_new&z={z}&x={x}&y={y}
// Proxies OWM map tiles so the browser never sees ?appid=.
// Cesium UrlTemplateImageryProvider substitutes {z}/{x}/{y} before requesting.

const ALLOWED = new Set(['clouds_new', 'precipitation_new', 'temp_new', 'wind_new', 'pressure_new']);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { layer, z, x, y } = req.query || {};
  const zi = Number(z), xi = Number(x), yi = Number(y);
  if (!ALLOWED.has(String(layer)) || !Number.isInteger(zi) || !Number.isInteger(xi) || !Number.isInteger(yi)) {
    res.status(400).json({ error: 'Invalid tile params' });
    return;
  }
  if (zi < 0 || zi > 19 || xi < 0 || yi < 0) {
    res.status(400).json({ error: 'Tile out of range' });
    return;
  }
  const key = process.env.OWM_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Server missing OWM_API_KEY' });
    return;
  }

  try {
    const upstream = await fetch(
      `https://tile.openweathermap.org/map/${layer}/${zi}/${xi}/${yi}.png?appid=${key}`
    );
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Tile upstream ${upstream.status}` });
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=300');
    res.status(200).send(buf);
  } catch (err) {
    res.status(502).json({ error: 'Tile fetch failed' });
  }
}
