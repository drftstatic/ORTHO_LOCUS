import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const initiateScan = async (lat: number, lng: number, _imageUrl: string): Promise<string> => {
    try {
        // UPGRADE: Using the newly released Gemini 3 Pro model
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

        // Fetch the image via our local proxy to bypass CORS and add necessary headers
        // The proxy at /api/maps forwards to maps.googleapis.com
        const staticMapUrl = `/api/maps/staticmap?center=${lat},${lng}&zoom=19&size=600x800&maptype=satellite&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;

        let imagePart = null;
        try {
            const response = await fetch(staticMapUrl);
            if (response.ok) {
                const blob = await response.blob();
                const base64Data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });

                imagePart = {
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/png"
                    }
                };
            } else {
                console.warn(`Image fetch failed: ${response.status}, falling back to coordinate analysis.`);
            }
        } catch (e) {
            console.warn("Image fetch error, falling back to coordinate analysis:", e);
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
        return text;
    } catch (error) {
        console.error("Gemini 3.0 Scan Error:", error);
        return `
        [SYSTEM ERROR]
        > VISUAL UPLINK FAILED
        > REASON: ${error instanceof Error ? error.message : 'UNKNOWN'}
        > RETRYING ON SECURE CHANNEL...
        `;
    }
};

export type ArtworkStyle = 'PLANAR' | 'PLEIN_AIR';

export const generateLocationArtwork = async (lat: number, lng: number, style: ArtworkStyle): Promise<string | null> => {
    try {
        // "Nano Banana Pro" - Google's advanced image generation model with grounding
        // Official model name: gemini-3-pro-image-preview
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

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

        // Request image generation
        const result = await model.generateContent(prompt);
        const response = await result.response;

        const images = response.candidates?.[0]?.content?.parts?.filter(p => p.inlineData);

        if (images && images.length > 0 && images[0].inlineData) {
            return `data:${images[0].inlineData.mimeType};base64,${images[0].inlineData.data}`;
        }

        return null;
    } catch (error) {
        console.error("Nano Banana Pro Generation Error:", error);
        return null;
    }
};
