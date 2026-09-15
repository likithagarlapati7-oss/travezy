import {
  type EmergencyPlace,
  type NearbyEmergencyQuery,
  type NearbyEmergencyResponse,
} from "./emergency.schema";

/** Earth radius in kilometers */
const EARTH_RADIUS_KM = 6371;

/**
 * Calculates Haversine great-circle distance between two geographic coordinates in kilometers.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_KM * c).toFixed(2));
}

/** Formats numeric kilometers into a clean string */
export function formatDistanceString(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m away`;
  }
  return `${km.toFixed(1)} km away`;
}

/** Builds external Google Maps navigation URL */
export function buildDirectionsUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  placeName: string
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&destination_place_id=${encodeURIComponent(placeName)}`;
}

/** Curated verified emergency facilities database for regional hubs & reliable offline testing */
const VERIFIED_EMERGENCY_DATASET: Array<{
  name: string;
  category: "hospital" | "police" | "pharmacy" | "emergency";
  lat: number;
  lng: number;
  address: string;
  phone?: string;
}> = [
  // Goa
  {
    name: "Goa Medical College & Hospital (GMC)",
    category: "hospital",
    lat: 15.4616,
    lng: 73.8567,
    address: "Bambolim, Tiswadi, Goa 403202",
    phone: "+91 832 245 8700",
  },
  {
    name: "Manipal Hospital Goa",
    category: "hospital",
    lat: 15.4745,
    lng: 73.8183,
    address: "Dr E Borges Rd, Dona Paula, Panaji, Goa 403004",
    phone: "+91 832 304 8800",
  },
  {
    name: "Calangute Police Station",
    category: "police",
    lat: 15.5434,
    lng: 73.7661,
    address: "Calangute - Baga Rd, Umtav Vado, Calangute, Goa 403516",
    phone: "+91 832 227 8225",
  },
  {
    name: "Panaji Police Station",
    category: "police",
    lat: 15.4989,
    lng: 73.8278,
    address: "Church Square, Panaji, Goa 403001",
    phone: "+91 832 242 0873",
  },
  {
    name: "Apollo Pharmacy Calangute",
    category: "pharmacy",
    lat: 15.5412,
    lng: 73.7634,
    address: "Near Calangute Circle, Calangute, Goa 403516",
    phone: "+91 832 227 6112",
  },
  // Kerala (Kochi / Ernakulam)
  {
    name: "Aster Medcity Kochi",
    category: "hospital",
    lat: 10.0538,
    lng: 76.2673,
    address: "Kuttisahib Road, Cheranelloor, Kochi, Kerala 682027",
    phone: "+91 484 669 9999",
  },
  {
    name: "Ernakulam Central Police Station",
    category: "police",
    lat: 9.9723,
    lng: 76.2842,
    address: "Park Avenue Road, Marine Drive, Kochi, Kerala 682011",
    phone: "+91 484 235 5000",
  },
  // Delhi
  {
    name: "AIIMS New Delhi (All India Institute of Medical Sciences)",
    category: "hospital",
    lat: 28.5672,
    lng: 77.2100,
    address: "Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029",
    phone: "+91 11 2658 8500",
  },
  {
    name: "Connaught Place Police Station",
    category: "police",
    lat: 28.6315,
    lng: 77.2167,
    address: "Shaheed Bhagat Singh Marg, Connaught Place, New Delhi 110001",
    phone: "+91 11 2336 2200",
  },
  // Mumbai
  {
    name: "Lilavati Hospital & Research Centre",
    category: "hospital",
    lat: 19.0519,
    lng: 72.8295,
    address: "A-791, Bandra Reclamation, Bandra West, Mumbai 400050",
    phone: "+91 22 2675 1000",
  },
  {
    name: "Colaba Police Station",
    category: "police",
    lat: 18.9150,
    lng: 72.8270,
    address: "Shahid Bhagat Singh Road, Colaba, Mumbai 400005",
    phone: "+91 22 2285 2885",
  },
  // Jaipur
  {
    name: "Fortis Escorts Hospital Jaipur",
    category: "hospital",
    lat: 26.8523,
    lng: 75.8052,
    address: "Jawaharlal Nehru Marg, Malviya Nagar, Jaipur, Rajasthan 302017",
    phone: "+91 141 254 7000",
  },
  {
    name: "Manak Chowk Police Station Jaipur",
    category: "police",
    lat: 26.9248,
    lng: 75.8285,
    address: "Near Hawa Mahal, Badi Chaupar, Jaipur, Rajasthan 302002",
    phone: "+91 141 260 8500",
  },
  // Manali
  {
    name: "Civil Hospital Manali",
    category: "hospital",
    lat: 32.2432,
    lng: 77.1892,
    address: "The Mall, Siyal, Manali, Himachal Pradesh 175131",
    phone: "+91 1902 252 355",
  },
  {
    name: "Manali Police Station",
    category: "police",
    lat: 32.2396,
    lng: 77.1887,
    address: "Model Town, Siyal, Manali, Himachal Pradesh 175131",
    phone: "+91 1902 252 326",
  },
];

/**
 * Searches nearby emergency places using Mapbox Geocoding POI or fallback dataset
 */
export async function searchNearbyEmergencyPlaces(
  query: NearbyEmergencyQuery
): Promise<NearbyEmergencyResponse> {
  const { lat, lng, category = "all", radiusKm = 15, limit = 15 } = query;

  const env = process.env as Record<string, string | undefined>;
  const mapboxToken =
    env["MAPBOX_TOKEN"] ||
    env["VITE_MAPBOX_TOKEN"] ||
    "";

  let places: EmergencyPlace[] = [];
  let providerUsed = "verified_places_engine";

  // If Mapbox token is configured, query Mapbox Geocoding POI API
  if (mapboxToken && mapboxToken.startsWith("pk.") && mapboxToken.length > 20) {
    try {
      const poiType = category === "hospital" ? "hospital,clinic" : category === "police" ? "police" : category === "pharmacy" ? "pharmacy" : "hospital,police,pharmacy";
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(poiType)}.json?proximity=${lng},${lat}&types=poi&limit=${limit}&access_token=${mapboxToken}`;

      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        const features = data.features || [];

        places = features.map((f: any) => {
          const [fLng, fLat] = f.center || [lng, lat];
          const dist = calculateHaversineDistance(lat, lng, fLat, fLng);
          const cat: "hospital" | "police" | "pharmacy" | "emergency" =
            f.properties?.category?.includes("police") || f.text?.toLowerCase().includes("police")
              ? "police"
              : f.properties?.category?.includes("pharmacy") || f.text?.toLowerCase().includes("pharmacy")
                ? "pharmacy"
                : "hospital";

          return {
            id: f.id || `poi-${Math.random().toString(36).slice(2, 9)}`,
            name: f.text || f.place_name?.split(",")[0] || "Emergency Center",
            category: cat,
            lat: fLat,
            lng: fLng,
            distanceKm: dist,
            formattedDistance: formatDistanceString(dist),
            address: f.place_name || `${cat} near ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
            phone: f.properties?.tel || undefined,
            isOpen: true,
            directionsUrl: buildDirectionsUrl(lat, lng, fLat, fLng, f.text || "Emergency Location"),
          };
        });

        providerUsed = "mapbox_poi";
      }
    } catch (err: any) {
      console.warn("[Emergency Search] Mapbox API failed, utilizing verified emergency database:", err.message);
    }
  }

  // If no places from Mapbox or offline fallback, calculate from verified dataset
  if (!places.length) {
    // Filter dataset by category if not 'all'
    const filteredDataset = category === "all"
      ? VERIFIED_EMERGENCY_DATASET
      : VERIFIED_EMERGENCY_DATASET.filter((p) => p.category === category);

    places = filteredDataset.map((p, idx) => {
      const dist = calculateHaversineDistance(lat, lng, p.lat, p.lng);
      return {
        id: `emerg-${idx + 1}`,
        name: p.name,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        distanceKm: dist,
        formattedDistance: formatDistanceString(dist),
        address: p.address,
        phone: p.phone,
        isOpen: true,
        directionsUrl: buildDirectionsUrl(lat, lng, p.lat, p.lng, p.name),
      };
    });
  }

  // Sort by nearest distance first
  places.sort((a, b) => a.distanceKm - b.distanceKm);

  // Filter within radius if applicable or return top limit
  const withinRadius = places.filter((p) => p.distanceKm <= Math.max(radiusKm, 50));
  const finalPlaces = (withinRadius.length ? withinRadius : places).slice(0, limit);

  return {
    userLocation: { lat, lng },
    category,
    count: finalPlaces.length,
    places: finalPlaces,
    providerUsed,
  };
}
