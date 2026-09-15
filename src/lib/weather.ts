import { KNOWN_DESTINATION_COORDS } from "@/lib/mapbox";
import { TOURS_AND_EXPERIENCES, type ToursListing } from "@/data/tours-and-experiences";
import { INDIAN_RESTAURANTS, type IndianRestaurantData } from "@/data/indian-restaurants";

export interface LiveWeatherData {
  isAvailable: boolean;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
  condition: string;
  icon: string;
  isRainy: boolean;
  isSunny: boolean;
  isCold: boolean;
  isHot: boolean;
  recommendationText: string;
  activityCategory: "indoor" | "outdoor" | "mixed";
  recommendedActivityTypes: string[];
  forecast: Array<{
    date: string;
    dayName: string;
    maxTemp: number;
    minTemp: number;
    precipProb: number;
    weatherCode: number;
    condition: string;
    icon: string;
  }>;
  fetchedAt: string;
}

/**
 * Interprets WMO Weather Codes according to the World Meteorological Organization standard
 */
export function parseWmoWeatherCode(code: number): {
  condition: string;
  icon: string;
  isRainy: boolean;
  isSunny: boolean;
  isCold: boolean;
  activityCategory: "indoor" | "outdoor" | "mixed";
  recommendationText: string;
} {
  // Clear sky
  if (code === 0) {
    return {
      condition: "Clear & Sunny",
      icon: "☀️",
      isRainy: false,
      isSunny: true,
      isCold: false,
      activityCategory: "outdoor",
      recommendationText: "Good conditions for outdoor activities, backwaters & nature walks.",
    };
  }
  // Mainly clear, partly cloudy
  if (code === 1 || code === 2) {
    return {
      condition: "Partly Cloudy",
      icon: "⛅",
      isRainy: false,
      isSunny: true,
      isCold: false,
      activityCategory: "outdoor",
      recommendationText: "Pleasant mild weather. Ideal for sightseeing, heritage walks & photography.",
    };
  }
  // Overcast
  if (code === 3) {
    return {
      condition: "Overcast",
      icon: "☁️",
      isRainy: false,
      isSunny: false,
      isCold: false,
      activityCategory: "mixed",
      recommendationText: "Comfortable cool skies. Great for city explorations, market trails & cafe hopping.",
    };
  }
  // Fog
  if (code === 45 || code === 48) {
    return {
      condition: "Misty / Foggy",
      icon: "🌫️",
      isRainy: false,
      isSunny: false,
      isCold: true,
      activityCategory: "mixed",
      recommendationText: "Misty atmosphere. Wonderful for tea garden viewpoints and warm local dining.",
    };
  }
  // Drizzle / Light Rain
  if (code >= 51 && code <= 57) {
    return {
      condition: "Light Drizzle",
      icon: "🌦️",
      isRainy: true,
      isSunny: false,
      isCold: false,
      activityCategory: "indoor",
      recommendationText: "Light rain expected. Carry an umbrella; great for indoor museums, art galleries & spice tastings.",
    };
  }
  // Rain / Heavy Showers
  if (code >= 61 && code <= 67) {
    return {
      condition: "Rain & Showers",
      icon: "🌧️",
      isRainy: true,
      isSunny: false,
      isCold: false,
      activityCategory: "indoor",
      recommendationText: "Rain expected. We recommend indoor cultural shows, heritage museums & culinary dining.",
    };
  }
  // Snow
  if (code >= 71 && code <= 77) {
    return {
      condition: "Snowfall",
      icon: "❄️",
      isRainy: false,
      isSunny: false,
      isCold: true,
      activityCategory: "mixed",
      recommendationText: "Cold snowfall. Dress in warm thermals; enjoy snow sports & warm alpine fires.",
    };
  }
  // Thunderstorm
  if (code >= 95 && code <= 99) {
    return {
      condition: "Thunderstorm",
      icon: "⛈️",
      isRainy: true,
      isSunny: false,
      isCold: false,
      activityCategory: "indoor",
      recommendationText: "Storm warning. Stay in sheltered indoor heritage venues, authentic restaurants & spas.",
    };
  }

  return {
    condition: "Fair Weather",
    icon: "🌤️",
    isRainy: false,
    isSunny: true,
    isCold: false,
    activityCategory: "outdoor",
    recommendationText: "Favourable travel conditions for discovering local landmarks.",
  };
}

/**
 * In-memory cache to prevent redundant weather API calls across components
 */
const weatherCache = new Map<string, { data: LiveWeatherData; expiresAt: number }>();

/**
 * Fetches real-time live weather from Open-Meteo for given coordinates or destination
 */
export async function fetchLiveWeather(
  arg1?: string | number | null,
  arg2?: number | null,
  arg3?: string | number | null
): Promise<LiveWeatherData | null> {
  let destinationName: string | undefined;
  let lat: number | null | undefined;
  let lng: number | null | undefined;

  if (typeof arg1 === "string") {
    destinationName = arg1;
    lat = typeof arg2 === "number" ? arg2 : null;
    lng = typeof arg3 === "number" ? (arg3 as number) : null;
  } else {
    lat = typeof arg1 === "number" ? arg1 : null;
    lng = typeof arg2 === "number" ? arg2 : null;
    destinationName = typeof arg3 === "string" ? arg3 : undefined;
  }

  // If coordinates are missing, resolve from known coordinates dictionary
  if ((lat === undefined || lat === null || lng === undefined || lng === null) && destinationName) {
    const key = destinationName.toLowerCase().trim();
    if (KNOWN_DESTINATION_COORDS[key]) {
      lng = KNOWN_DESTINATION_COORDS[key]![0];
      lat = KNOWN_DESTINATION_COORDS[key]![1];
    } else {
      // Substring match
      for (const [k, coords] of Object.entries(KNOWN_DESTINATION_COORDS)) {
        if (key.includes(k) || k.includes(key)) {
          lng = coords[0];
          lat = coords[1];
          break;
        }
      }
    }
  }

  const numLat = Number(lat);
  const numLng = Number(lng);

  if (isNaN(numLat) || isNaN(numLng)) {
    return null;
  }

  const cacheKey = `${numLat.toFixed(2)},${numLng.toFixed(2)}`;
  const now = Date.now();
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${numLat}&longitude=${numLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current;
    if (!current) return null;

    const weatherCode = current.weather_code ?? 0;
    const parsed = parseWmoWeatherCode(weatherCode);
    const temp = Math.round(current.temperature_2m ?? 25);
    const apparent = Math.round(current.apparent_temperature ?? temp);
    const isCold = temp < 15;
    const isHot = temp > 34;

    const dailyDays = data.daily?.time ?? [];
    const dailyCodes = data.daily?.weather_code ?? [];
    const dailyMax = data.daily?.temperature_2m_max ?? [];
    const dailyMin = data.daily?.temperature_2m_min ?? [];
    const dailyPrecip = data.daily?.precipitation_probability_max ?? [];

    const forecast = dailyDays.slice(0, 4).map((d: string, i: number) => {
      const code = dailyCodes[i] ?? 0;
      const p = parseWmoWeatherCode(code);
      const dateObj = new Date(d);
      const dayName = i === 0 ? "Today" : dateObj.toLocaleDateString("en-US", { weekday: "short" });

      return {
        date: d,
        dayName,
        maxTemp: Math.round(dailyMax[i] ?? temp),
        minTemp: Math.round(dailyMin[i] ?? temp - 5),
        precipProb: Math.round(dailyPrecip[i] ?? 0),
        weatherCode: code,
        condition: p.condition,
        icon: p.icon,
      };
    });

    const recommendedActivityTypes = parsed.isRainy
      ? ["museum", "culinary", "food", "cultural_show", "shopping", "indoor_temple", "indoor"]
      : isCold
        ? ["sightseeing", "cafe", "snow_activity", "heritage_palace", "cultural_walk"]
        : ["trekking", "boating", "beach", "safari", "nature_walk", "outdoor", "photography"];

    const result: LiveWeatherData = {
      isAvailable: true,
      temperature: temp,
      apparentTemperature: apparent,
      humidity: Math.round(current.relative_humidity_2m ?? 60),
      windSpeed: Math.round(current.wind_speed_10m ?? 10),
      precipitation: Number(current.precipitation ?? 0),
      weatherCode,
      condition: parsed.condition,
      icon: parsed.icon,
      isRainy: parsed.isRainy,
      isSunny: parsed.isSunny,
      isCold,
      isHot,
      recommendationText: `${parsed.icon} ${temp}°C — ${parsed.recommendationText}`,
      activityCategory: parsed.activityCategory,
      recommendedActivityTypes,
      forecast,
      fetchedAt: new Date().toISOString(),
    };

    // Cache for 15 minutes
    weatherCache.set(cacheKey, { data: result, expiresAt: now + 15 * 60 * 1000 });
    return result;
  } catch (err) {
    console.warn("Weather API fetch error:", err);
    return null;
  }
}

/**
 * Returns weather-filtered experiences for a destination based on whether it is raining vs sunny
 */
export function getWeatherAwareExperiences(
  destinationName: string,
  weather: LiveWeatherData | null
): {
  indoorRecommendations: ToursListing[];
  outdoorRecommendations: ToursListing[];
  diningRecommendations: IndianRestaurantData[];
  weatherAdvice: string;
} {
  const destLower = destinationName.toLowerCase();

  const isMatch = (item: { destination?: string; city?: string; state?: string }) => {
    return (
      (item.destination && item.destination.toLowerCase().includes(destLower)) ||
      (item.state && item.state.toLowerCase().includes(destLower)) ||
      (item.city && item.city.toLowerCase().includes(destLower))
    );
  };

  const destTours = TOURS_AND_EXPERIENCES.filter(isMatch);
  const destRestaurants = INDIAN_RESTAURANTS.filter(isMatch);

  // Indoor keywords: museum, heritage, temple, cooking, food, tasting, dance, culture, indoor, palace, workshop
  const indoorKeywords = ["museum", "temple", "synagogue", "palace", "cooking", "tasting", "tea", "spice", "art", "dance", "culture", "trail", "bazaar", "heritage"];
  // Outdoor keywords: rafting, trekking, safari, cruise, boat, island, beach, hill, cycling, camp, walk, nature
  const outdoorKeywords = ["rafting", "trekking", "safari", "cruise", "boat", "island", "beach", "hill", "cycling", "camp", "walk", "nature", "valley", "caves"];

  const indoorRecommendations = destTours.filter((t) => {
    const text = `${t.title} ${t.tour_type} ${t.description}`.toLowerCase();
    return indoorKeywords.some((kw) => text.includes(kw));
  });

  const outdoorRecommendations = destTours.filter((t) => {
    const text = `${t.title} ${t.tour_type} ${t.description}`.toLowerCase();
    return outdoorKeywords.some((kw) => text.includes(kw));
  });

  const weatherAdvice = weather?.isRainy
    ? "🌧️ Rain forecast. Indoor cultural museums, spice tastings & heritage havelis are recommended."
    : weather?.isCold
      ? "❄️ Cool temperatures. Scenic drives, warm culinary feasts & fireplace stays are recommended."
      : "☀️ Clear skies. Ideal for backwater cruises, nature treks, open-air safaris & photography.";

  return {
    indoorRecommendations: indoorRecommendations.length > 0 ? indoorRecommendations : destTours.slice(0, 4),
    outdoorRecommendations: outdoorRecommendations.length > 0 ? outdoorRecommendations : destTours.slice(0, 4),
    diningRecommendations: destRestaurants.slice(0, 4),
    weatherAdvice,
  };
}
