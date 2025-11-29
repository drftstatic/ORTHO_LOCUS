import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
  maxDuration: 60, // Allow longer timeout for image generation
};

type ArtworkStyle = 'PLANAR' | 'PLEIN_AIR';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { lat, lng, style } = await req.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid coordinates' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (style !== 'PLANAR' && style !== 'PLEIN_AIR') {
      return new Response(JSON.stringify({ error: 'Invalid style' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp-image-generation" });

    let prompt = '';

    if (style === 'PLANAR') {
      prompt = `
      Generate a high-precision architectural planar drawing (site plan) for the location at coordinates: ${lat}, ${lng}.

      STYLE:
      - Top-down orthographic view (Planar)
      - Technical architectural drawing / Blueprint style
      - High contrast: White lines on dark blueprint blue background
      - Precise line weights showing infrastructure, building footprints, and terrain
      - Annotations in technical font

      GROUNDING:
      - Use the actual geographic data for these coordinates to ensure the layout matches reality.
      - Accurately represent the road network and major structures present at this location.
      `;
    } else {
      prompt = `
      Generate a "Plein Air" artistic masterpiece capturing the essence of the location at coordinates: ${lat}, ${lng}.

      STYLE:
      - Plein Air / Impressionist style
      - Oil on canvas texture
      - Atmospheric perspective, capturing the light and mood of the specific location
      - Viewpoint: Eye-level or slightly elevated, looking AT the landscape/cityscape (not top-down)
      - Expressive brushwork, vibrant but naturalistic colors

      GROUNDING:
      - Capture the specific biome, lighting conditions, and architectural vernacular of this real-world location.
      - If urban: capture the energy, streets, and skyline.
      - If nature: capture the flora, terrain, and atmosphere.
      `;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;

    const images = response.candidates?.[0]?.content?.parts?.filter(
      (p: any) => p.inlineData
    );

    if (images && images.length > 0 && images[0].inlineData) {
      const imageData = images[0].inlineData;
      return new Response(JSON.stringify({
        imageUrl: `data:${imageData.mimeType};base64,${imageData.data}`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'No image generated' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Artwork generation error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Generation failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
