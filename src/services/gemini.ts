export type ArtworkStyle = 'PLANAR' | 'PLEIN_AIR';

export const initiateScan = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.result;
  } catch (error) {
    console.error("Scan error:", error);
    return `
[SYSTEM ERROR]
> VISUAL UPLINK FAILED
> REASON: ${error instanceof Error ? error.message : 'UNKNOWN'}
> RETRYING ON SECURE CHANNEL...
    `;
  }
};

export const generateLocationArtwork = async (
  lat: number,
  lng: number,
  style: ArtworkStyle
): Promise<string | null> => {
  try {
    const response = await fetch('/api/artwork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, style }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.imageUrl;
  } catch (error) {
    console.error("Artwork generation error:", error);
    return null;
  }
};

// Note: Static map proxy endpoint is available at /api/staticmap if needed
// Currently unused as the scan API fetches satellite imagery server-side
