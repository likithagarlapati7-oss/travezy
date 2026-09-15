/**
 * Mapbox & GIS utilities for Travezy
 *
 * Supports Mapbox GL with fallback to open tiles and geocoding when VITE_MAPBOX_TOKEN
 * is not configured, ensuring the map and location features always work smoothly.
 */

export type Coordinates = {
  lat: number;
  lng: number;
};

export type LocationResult = {
  lat: number;
  lng: number;
  placeName: string;
  city: string;
  state: string;
  country: string;
};

/** Public Mapbox access token read from Vite env. */
export const MAPBOX_TOKEN: string | undefined =
  typeof import.meta !== "undefined" &&
  typeof (import.meta as any).env !== "undefined"
    ? ((import.meta as any).env as Record<string, string | undefined>)[
        "VITE_MAPBOX_TOKEN"
      ] || undefined
    : undefined;

/** Returns true if a valid public Mapbox token is configured. */
export function hasMapboxToken(): boolean {
  return typeof MAPBOX_TOKEN === "string" && MAPBOX_TOKEN.trim().startsWith("pk.") && MAPBOX_TOKEN.trim().length > 15;
}

/** Center of India — used as default map center. [lng, lat] */
export const DEFAULT_CENTER: [number, number] = [78.9629, 20.5937];

/** Default zoom level for a single-location map. */
export const DEFAULT_ZOOM = 12;

/** Default zoom level for the full overview. */
export const OVERVIEW_ZOOM = 4;

/**
 * Returns true if lat and lng are well-formed geographic coordinates.
 * Guards against null, undefined, NaN, and out-of-range values.
 */
export function isValidCoord(
  lat: number | null | undefined,
  lng: number | null | undefined,
): lat is number {
  return (
    lat !== null &&
    lat !== undefined &&
    lng !== null &&
    lng !== undefined &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lng) >= -180 &&
    Number(lng) <= 180
  );
}

/**
 * Curated geographic coordinates for popular tourism destinations.
 * Used to provide exact location pins for destination-level listings.
 */
export const KNOWN_DESTINATION_COORDS: Record<string, [number, number]> = {
  // [lng, lat]
  // Major Tourist hubs
  goa: [73.8567, 15.2993],
  calangute: [73.7628, 15.5439],
  baga: [73.7517, 15.5553],
  candolim: [73.7667, 15.5173],
  panaji: [73.8278, 15.4909],
  margao: [73.9582, 15.2736],
  kerala: [76.3388, 9.4981],
  alleppey: [76.3388, 9.4981],
  alappuzha: [76.3388, 9.4981],
  kochi: [76.2799, 9.9816],
  cochin: [76.2799, 9.9816],
  thiruvananthapuram: [76.9486, 8.4875],
  trivandrum: [76.9486, 8.4875],
  kozhikode: [75.7804, 11.2588],
  calicut: [75.7804, 11.2588],
  wayanad: [76.1320, 11.6854],
  munnar: [77.0595, 10.0889],
  manali: [77.1892, 32.2432],
  shimla: [77.1734, 31.1048],
  dharamshala: [76.3213, 32.2426],
  mcleodganj: [76.3213, 32.2426],
  jaipur: [75.7873, 26.9124],
  udaipur: [73.7125, 24.5854],
  jodhpur: [73.0243, 26.2389],
  rajasthan: [75.7873, 26.9124],
  ooty: [76.6957, 11.4102],
  pondicherry: [79.8083, 11.9416],
  puducherry: [79.8083, 11.9416],
  auroville: [79.8106, 12.0069],
  andaman: [92.9876, 11.9761],
  "port blair": [92.7480, 11.6670],
  havelock: [92.9984, 11.9818],
  "neil island": [93.0478, 11.8322],
  darjeeling: [88.2663, 27.0410],
  siliguri: [88.3953, 26.7271],
  kolkata: [88.3639, 22.5726],
  "west bengal": [88.3639, 22.5726],
  leh: [77.5771, 34.1526],
  ladakh: [77.5771, 34.1526],
  kargil: [76.1349, 34.5539],
  "nubra valley": [77.5620, 34.5428],
  agra: [78.0421, 27.1751],
  "taj mahal": [78.0421, 27.1751],
  lucknow: [80.9462, 26.8467],
  varanasi: [82.9739, 25.3176],
  banaras: [82.9739, 25.3176],
  kashi: [82.9739, 25.3176],
  "uttar pradesh": [80.9462, 26.8467],
  dehradun: [78.0322, 30.3165],
  rishikesh: [78.2676, 30.0869],
  nainital: [79.4636, 29.3803],
  uttarakhand: [78.0322, 30.3165],
  gangtok: [88.6065, 27.3389],
  pelling: [88.2427, 27.3175],
  namchi: [88.3666, 27.1666],
  sikkim: [88.6065, 27.3389],
  amritsar: [74.8765, 31.6200],
  ludhiana: [75.8573, 30.9010],
  jalandhar: [75.5762, 31.3260],
  punjab: [75.8573, 30.9010],
  hyderabad: [78.4867, 17.3850],
  warangal: [79.5941, 17.9689],
  nizamabad: [78.0941, 18.6725],
  telangana: [78.4867, 17.3850],
  chennai: [80.2376, 13.0674],
  madras: [80.2376, 13.0674],
  madurai: [78.1198, 9.9252],
  coimbatore: [76.9558, 11.0168],
  "tamil nadu": [80.2376, 13.0674],
  bengaluru: [77.5721, 12.9431],
  bangalore: [77.5721, 12.9431],
  mysuru: [76.6575, 12.3082],
  mysore: [76.6575, 12.3082],
  mangaluru: [74.8427, 12.8708],
  mangalore: [74.8427, 12.8708],
  hampi: [76.4600, 15.3350],
  coorg: [75.7382, 12.3375],
  karnataka: [77.5721, 12.9431],
  mumbai: [72.8331, 18.9288],
  bombay: [72.8331, 18.9288],
  pune: [73.8410, 18.5204],
  nagpur: [79.0882, 21.1458],
  maharashtra: [72.8331, 18.9288],
  ahmedabad: [72.5714, 23.0225],
  surat: [72.8311, 21.1702],
  vadodara: [73.1812, 22.3072],
  gujarat: [72.5714, 23.0225],
  visakhapatnam: [83.3031, 17.7126],
  vijayawada: [80.6480, 16.5062],
  tirupati: [79.4192, 13.6288],
  "andhra pradesh": [83.3031, 17.7126],
  itanagar: [93.6053, 27.0844],
  tawang: [91.8594, 27.5861],
  ziro: [93.8350, 27.5450],
  "arunachal pradesh": [93.6053, 27.0844],
  guwahati: [91.7539, 26.1856],
  dibrugarh: [94.9120, 27.4728],
  jorhat: [94.2037, 26.7509],
  assam: [91.7539, 26.1856],
  patna: [85.1376, 25.5941],
  gaya: [85.0002, 24.7914],
  muzaffarpur: [85.3647, 26.1209],
  bihar: [85.1376, 25.5941],
  raipur: [81.6296, 21.2514],
  bilaspur: [82.1409, 22.0797],
  jagdalpur: [82.0232, 19.0732],
  chhattisgarh: [81.6296, 21.2514],
  gurugram: [77.0266, 28.4595],
  gurgaon: [77.0266, 28.4595],
  faridabad: [77.3178, 28.4089],
  kurukshetra: [76.8783, 29.9695],
  haryana: [77.0266, 28.4595],
  ranchi: [85.3096, 23.3441],
  jamshedpur: [86.2029, 22.8046],
  dhanbad: [86.4304, 23.7957],
  jharkhand: [85.3096, 23.3441],
  indore: [75.8577, 22.7196],
  bhopal: [77.4126, 23.2599],
  gwalior: [78.1828, 26.2183],
  "madhya pradesh": [75.8577, 22.7196],
  imphal: [93.9368, 24.8170],
  churachandpur: [93.6828, 24.3317],
  ukhrul: [94.3640, 25.1160],
  manipur: [93.9368, 24.8170],
  shillong: [91.8933, 25.5788],
  cherrapunji: [91.7324, 25.2986],
  sohra: [91.7324, 25.2986],
  tura: [90.2033, 25.5141],
  meghalaya: [91.8933, 25.5788],
  aizawl: [92.7176, 23.7271],
  lunglei: [92.7483, 22.8872],
  champhai: [93.3283, 23.4735],
  mizoram: [92.7176, 23.7271],
  kohima: [94.1086, 25.6751],
  dimapur: [93.7266, 25.9095],
  mokokchung: [94.5298, 26.3245],
  nagaland: [94.1086, 25.6751],
  bhubaneswar: [85.8245, 20.2961],
  puri: [85.8312, 19.8135],
  cuttack: [85.8828, 20.4625],
  odisha: [85.8245, 20.2961],
  agartala: [91.2868, 23.8315],
  dharmanagar: [92.1667, 24.3833],
  tripura: [91.2868, 23.8315],
  delhi: [77.2334, 28.6507],
  "new delhi": [77.1945, 28.5539],
  "old delhi": [77.2334, 28.6507],
  srinagar: [74.7973, 34.0837],
  jammu: [74.8570, 32.7266],
  pahalgam: [75.3150, 34.0163],
  "jammu & kashmir": [74.7973, 34.0837],
  "jammu and kashmir": [74.7973, 34.0837],
  chandigarh: [76.7827, 30.7398],
  daman: [72.8328, 20.3974],
  diu: [70.9874, 20.7144],
  silvassa: [73.0083, 20.2763],
  kavaratti: [72.6417, 10.5667],
  agatti: [72.1947, 10.8533],
  "agatti island": [72.1947, 10.8533],
  bangaram: [72.2900, 10.9400],
  "bangaram island": [72.2900, 10.9400],
  lakshadweep: [72.6417, 10.5667],
  // International
  santorini: [25.4317, 36.3932],
  reykjavik: [-21.9426, 64.1466],
  bali: [115.1889, -8.4095],
  kyoto: [135.7681, 35.0116],
  maldives: [73.5093, 4.1755],
  "machu picchu": [-72.5450, -13.1631],
  "cape town": [18.4241, -33.9249],
  serengeti: [34.8233, -2.3333],
  dubrovnik: [18.0944, 42.6507],
  amalfi: [14.6027, 40.6340],
  "amalfi coast": [14.6027, 40.6340],
  "swiss alps": [8.2275, 46.8182],
  switzerland: [8.2275, 46.8182],
  dubai: [55.2708, 25.2048],
};

/**
 * Resolves coordinates for a service either from stored latitude/longitude
 * or from destination/city lookups.
 */
export function getServiceCoordinates(service: {
  latitude?: number | null;
  longitude?: number | null;
  destination?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): Coordinates | null {
  if (isValidCoord(service.latitude, service.longitude)) {
    return {
      lat: Number(service.latitude),
      lng: Number(service.longitude),
    };
  }

  // Check known destination mappings
  const candidates = [
    service.destination,
    service.city,
    service.state,
    service.country,
  ]
    .filter(Boolean)
    .map((s) => s!.toLowerCase().trim());

  for (const query of candidates) {
    if (KNOWN_DESTINATION_COORDS[query]) {
      const [lng, lat] = KNOWN_DESTINATION_COORDS[query]!;
      return { lat, lng };
    }
    // Partial substring match (e.g. "North Goa" -> "goa")
    for (const [key, coords] of Object.entries(KNOWN_DESTINATION_COORDS)) {
      if (query.includes(key) || key.includes(query)) {
        return { lat: coords[1], lng: coords[0] };
      }
    }
  }

  return null;
}

/** Open vector / raster tile style that renders without an API key. */
export const OPEN_MAP_STYLE = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: [
        "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 18,
    },
  ],
};

/** Returns the appropriate style: Mapbox Streets if token configured, otherwise open raster style. */
export function getMapStyle(): string | object {
  if (hasMapboxToken()) {
    return "mapbox://styles/mapbox/streets-v12";
  }
  return OPEN_MAP_STYLE;
}

/** Version of mapbox-gl loaded from CDN. */
export const MAPBOX_GL_VERSION = "3.10.0";

let _mapboxglPromise: Promise<typeof window.mapboxgl> | null = null;

/**
 * Dynamically loads mapbox-gl from CDN and injects its CSS stylesheet.
 * Safe to call multiple times in useEffect.
 */
export async function loadMapboxGL(): Promise<typeof window.mapboxgl> {
  if (typeof window !== "undefined" && window.mapboxgl) {
    return window.mapboxgl;
  }
  if (_mapboxglPromise) return _mapboxglPromise;

  _mapboxglPromise = new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Cannot load Mapbox GL on the server"));
      return;
    }

    if (!document.getElementById("mapbox-gl-css")) {
      const link = document.createElement("link");
      link.id = "mapbox-gl-css";
      link.rel = "stylesheet";
      link.href = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`;
      document.head.appendChild(link);
    }

    if (!document.getElementById("mapbox-gl-js")) {
      const script = document.createElement("script");
      script.id = "mapbox-gl-js";
      script.src = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`;
      script.onload = () => resolve(window.mapboxgl);
      script.onerror = () => {
        _mapboxglPromise = null;
        reject(new Error("Failed to load Mapbox GL from CDN"));
      };
      document.head.appendChild(script);
    } else {
      resolve(window.mapboxgl);
    }
  });

  return _mapboxglPromise;
}

/** Forward Geocoding: Converts query string into LocationResult list. */
export async function geocodeForward(query: string): Promise<LocationResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Check known destination dictionary first for immediate matches
  const lower = trimmed.toLowerCase();
  if (KNOWN_DESTINATION_COORDS[lower]) {
    const [lng, lat] = KNOWN_DESTINATION_COORDS[lower]!;
    return [
      {
        placeName: trimmed,
        city: trimmed,
        state: "",
        country: "India",
        lat,
        lng,
      },
    ];
  }

  // 1. If Mapbox Token is present, query Mapbox Geocoding API
  if (hasMapboxToken()) {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json` +
      `?access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood,address,poi&limit=6&language=en`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return (json.features ?? []).map((f: any) => {
          const [lng, lat] = f.geometry.coordinates;
          const ctx = f.context ?? [];
          return {
            placeName: f.place_name,
            lng: Number(lng) || 0,
            lat: Number(lat) || 0,
            city: ctx.find((c: any) => c.id.startsWith("place."))?.text ?? "",
            state: ctx.find((c: any) => c.id.startsWith("region."))?.text ?? "",
            country: ctx.find((c: any) => c.id.startsWith("country."))?.text ?? "",
          };
        });
      }
    } catch {
      // fallback to open geocoding below
    }
  }

  // 2. OpenStreetMap Nominatim open geocoding fallback
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=6&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    if (res.ok) {
      const results = await res.json();
      return (results ?? []).map((item: any) => ({
        placeName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        city: item.address?.city || item.address?.town || item.address?.village || "",
        state: item.address?.state || "",
        country: item.address?.country || "",
      }));
    }
  } catch {
    // ignore network errors
  }

  return [];
}

/** Reverse Geocoding: Converts [lng, lat] into human-readable place. */
export async function geocodeReverse(lng: number, lat: number): Promise<LocationResult | null> {
  if (!isValidCoord(lat, lng)) return null;

  // 1. If Mapbox Token is present, query Mapbox Reverse Geocoding
  if (hasMapboxToken()) {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${MAPBOX_TOKEN}&types=place,address,poi&limit=1&language=en`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const f = json.features?.[0];
        if (f) {
          const ctx = f.context ?? [];
          return {
            placeName: f.place_name,
            lng,
            lat,
            city: ctx.find((c: any) => c.id.startsWith("place."))?.text ?? "",
            state: ctx.find((c: any) => c.id.startsWith("region."))?.text ?? "",
            country: ctx.find((c: any) => c.id.startsWith("country."))?.text ?? "",
          };
        }
      }
    } catch {
      // fallback to open geocoding below
    }
  }

  // 2. OpenStreetMap Nominatim reverse geocoding fallback
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    if (res.ok) {
      const item = await res.json();
      if (item && item.display_name) {
        return {
          placeName: item.display_name,
          lat,
          lng,
          city: item.address?.city || item.address?.town || item.address?.village || "",
          state: item.address?.state || "",
          country: item.address?.country || "",
        };
      }
    }
  } catch {
    // fallback to coordinates format
  }

  return {
    placeName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    lat,
    lng,
    city: "",
    state: "",
    country: "",
  };
}
