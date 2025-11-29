export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const zoom = url.searchParams.get('zoom') || '19';
  const size = url.searchParams.get('size') || '800x800';

  if (!lat || !lng) {
    return new Response(JSON.stringify({ error: 'Missing coordinates' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const GOOGLE_MAPS_SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

  if (!GOOGLE_MAPS_SERVER_KEY) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&key=${GOOGLE_MAPS_SERVER_KEY}`;

    const response = await fetch(staticMapUrl);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch map' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error("Static map error:", error);
    return new Response(JSON.stringify({ error: 'Failed to fetch map' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
