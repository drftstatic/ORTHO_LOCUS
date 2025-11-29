import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { lat, lng } = await req.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid coordinates' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GOOGLE_MAPS_SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

    if (!GEMINI_API_KEY || !GOOGLE_MAPS_SERVER_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Fetch satellite image server-side
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=19&size=600x800&maptype=satellite&key=${GOOGLE_MAPS_SERVER_KEY}`;

    let imagePart = null;
    try {
      const response = await fetch(staticMapUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: "image/png"
          }
        };
      }
    } catch (e) {
      console.warn("Image fetch error:", e);
    }

    const prompt = `
    SYSTEM: ORBITAL RECONNAISSANCE // GEMINI-3.0-PRO UPLINK ESTABLISHED
    TARGET: ${lat}, ${lng}
    ${imagePart ? 'DATA SOURCE: VISUAL SATELLITE FEED' : 'DATA SOURCE: GEOSPATIAL COORDINATE DATABASE'}

    MISSION: Perform deep-spectrum analysis of the provided ${imagePart ? 'satellite imagery' : 'location'}.

    OUTPUT FORMAT:
    [SECTOR ANALYSIS - G3-PRO]
    > TERRAIN: [Detailed geological/topographical analysis]
    > INFRASTRUCTURE: [Identify structures, road networks, potential utility lines]
    > ANOMALIES: [Detect any irregularities or notable features]
    > STRATEGIC VALUE: [Assessment of location importance]

    Keep the tone cold, robotic, and hyper-precise.
    Demonstrate the superior reasoning capabilities of the V3 engine.
    Limit response to 200 words.
    `;

    const parts: any[] = [prompt];
    if (imagePart) parts.push(imagePart);

    const result = await model.generateContent(parts);
    const text = await result.response.text();

    return new Response(JSON.stringify({ result: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Scan error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      result: `[SYSTEM ERROR]\n> VISUAL UPLINK FAILED\n> REASON: ${errorMessage}\n> RETRYING ON SECURE CHANNEL...`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
