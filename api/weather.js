// Vercel Serverless: GET /api/weather?lat=..&lon=..
// Proxies OpenWeatherMap (key stays in process.env.OWM_API_KEY, never in git).
// Frontend still fetches Open-Meteo + NWS directly (no key needed) and formats.

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

function isValidCoord(lat, lon) {
  return (
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  );
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const lat = Number(req.query?.lat);
  const lon = Number(req.query?.lon);
  if (!isValidCoord(lat, lon)) {
    res.status(400).json({ error: 'Invalid lat/lon' });
    return;
  }
  const key = process.env.OWM_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Server missing OWM_API_KEY' });
    return;
  }

  try {
    const urls = [
      `${OWM_BASE}/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`,
      `${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric`,
      `${OWM_BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${key}`,
    ];
    const [curR, foreR, aqiR] = await Promise.all(urls.map((u) => fetch(u)));

    if (!curR.ok) {
      const text = await curR.text().catch(() => '');
      res.status(curR.status).json({ error: `OWM weather ${curR.status}`, detail: text.slice(0, 200) });
      return;
    }
    const current = await curR.json();
    const forecast = foreR.ok ? await foreR.json().catch(() => null) : null;
    const aqi = aqiR.ok ? await aqiR.json().catch(() => null) : null;

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=60');
    res.status(200).json({ current, forecast, aqi });
  } catch (err) {
    res.status(502).json({ error: 'Upstream OWM fetch failed', detail: String(err && err.message).slice(0, 200) });
  }
}
