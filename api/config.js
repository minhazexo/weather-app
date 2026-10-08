// Vercel Serverless: GET /api/config
// Returns the public Cesium Ion token WITHOUT committing it to git.
// NOTE: any key the browser needs (Cesium) is visible in DevTools by design —
// protect it via ion.cesium.com → Access Tokens → Allowed URLs (your Vercel domain).

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=300');
  res.status(200).json({ cesiumToken: process.env.CESIUM_ION_TOKEN || '' });
}
