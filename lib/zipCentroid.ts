export interface ZipCentroid {
  lat: number;
  lng: number;
}

/**
 * Returns the centroid lat/lng for a US zip code using the Zippopotamus API.
 * Returns null on 404, bad zip, or network error — never throws.
 */
export async function getZipCentroid(zip: string): Promise<ZipCentroid | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
    };
  } catch {
    return null;
  }
}
