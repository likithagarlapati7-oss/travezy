import {
  HUMAN_TOUR_GUIDES,
  POPULAR_LOCATIONS,
  type HumanTourGuide,
  type GuidePackage,
  type GuideReview,
} from "../data/human-guides.ts";
import { supabase } from "../integrations/supabase/client.ts";

export { HUMAN_TOUR_GUIDES, POPULAR_LOCATIONS };
export type { HumanTourGuide, GuidePackage, GuideReview };

export interface GuideBooking {
  id: string;
  tourist_id: string;
  tourist_name?: string | undefined;
  tourist_email?: string | undefined;
  tourist_phone?: string | undefined;
  guide_id: string;
  guide?: HumanTourGuide | undefined;
  booking_date: string;
  start_time: string;
  duration_hours: number;
  duration_type: "hourly" | "half_day" | "full_day";
  travellers: number;
  meeting_location: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  total_price: number;
  currency: "INR";
  booking_status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "IN_PROGRESS" | "COMPLETED";
  payment_status: "PENDING" | "PAID" | "REFUNDED";
  notes?: string | undefined;
  package_id?: string | undefined;
  package_title?: string | undefined;
  created_at: string;
}

export interface GuideSearchFilters {
  userLat?: number | undefined;
  userLng?: number | undefined;
  radiusKm?: number | undefined; // 5, 10, 25, 50
  query?: string | undefined; // text search for city, area or name
  category?: string | undefined;
  language?: string | undefined;
  minRating?: number | undefined;
  maxHourlyRate?: number | undefined;
  availableOnly?: boolean | undefined;
  sortBy?: "distance" | "rating" | "completed_tours" | "price_asc" | "experience" | undefined;
}

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number(d.toFixed(1));
}

/**
 * Resolves a text query into representative GPS coordinates from predefined major Indian locations.
 */
export function resolveLocationCoords(queryText: string): { lat: number; lng: number; label: string } | null {
  if (!queryText) return null;
  const q = queryText.toLowerCase().trim();
  const match = POPULAR_LOCATIONS.find(
    (loc) =>
      loc.city.toLowerCase().includes(q) ||
      loc.state.toLowerCase().includes(q) ||
      loc.label.toLowerCase().includes(q) ||
      q.includes(loc.city.toLowerCase()),
  );
  if (match) {
    return { lat: match.lat, lng: match.lng, label: match.label };
  }
  return null;
}

/**
 * Guide with distance metadata attached.
 */
export type GuideWithDistance = HumanTourGuide & {
  distanceKm: number | null;
  isWithinRadius: boolean;
};

/**
 * Search and filter human tour guides by location, distance radius, language, category and rating.
 */
export function searchHumanGuides(
  guides: HumanTourGuide[],
  filters: GuideSearchFilters,
): GuideWithDistance[] {
  const {
    userLat,
    userLng,
    radiusKm = 25,
    query = "",
    category = "all",
    language = "all",
    minRating = 0,
    maxHourlyRate,
    availableOnly = false,
    sortBy = userLat != null && userLng != null ? "distance" : "rating",
  } = filters;

  const normalizedQuery = query.toLowerCase().trim();

  // If query corresponds to a location and userLat/userLng not provided, resolve coordinates
  let effectiveLat = userLat;
  let effectiveLng = userLng;
  if ((effectiveLat == null || effectiveLng == null) && normalizedQuery) {
    const locCoords = resolveLocationCoords(normalizedQuery);
    if (locCoords) {
      effectiveLat = locCoords.lat;
      effectiveLng = locCoords.lng;
    }
  }

  const results: GuideWithDistance[] = guides
    .map((g) => {
      let distance: number | null = null;
      let withinRadius = true;

      if (effectiveLat != null && effectiveLng != null) {
        distance = calculateDistanceKm(effectiveLat, effectiveLng, g.latitude, g.longitude);
        // A guide is considered within radius if distance <= filter radius OR distance <= guide's service_radius_km
        withinRadius = distance <= radiusKm || distance <= g.service_radius_km;
      }

      return {
        ...g,
        distanceKm: distance,
        isWithinRadius: withinRadius,
      };
    })
    .filter((g) => {
      // 1. Text Query Search (name, city, state, bio, coverage areas, specializations)
      if (normalizedQuery) {
        const matchesName = g.name.toLowerCase().includes(normalizedQuery);
        const matchesCity = g.city.toLowerCase().includes(normalizedQuery);
        const matchesState = g.state.toLowerCase().includes(normalizedQuery);
        const matchesCoverage = g.coverage_areas.some((area) =>
          area.toLowerCase().includes(normalizedQuery),
        );
        const matchesSpec = g.specializations.some((spec) =>
          spec.toLowerCase().includes(normalizedQuery),
        );
        const matchesBio = g.bio.toLowerCase().includes(normalizedQuery);

        // If GPS coordinate was resolved for city search, we accept guides within radius or explicit text matches
        const hasTextMatch =
          matchesName || matchesCity || matchesState || matchesCoverage || matchesSpec || matchesBio;

        if (!hasTextMatch && (g.distanceKm == null || g.distanceKm > radiusKm)) {
          return false;
        }
      }

      // 2. Distance Radius Filter (if GPS/Coordinates active)
      if (effectiveLat != null && effectiveLng != null && !normalizedQuery) {
        if (g.distanceKm != null && g.distanceKm > radiusKm) {
          return false;
        }
      }

      // 3. Category Filter
      if (category && category !== "all") {
        const cat = category.toLowerCase();
        const hasCategory =
          g.tour_categories.some((c) => c.toLowerCase() === cat) ||
          g.specializations.some((s) => s.toLowerCase().includes(cat));
        if (!hasCategory) return false;
      }

      // 4. Language Filter
      if (language && language !== "all") {
        const lang = language.toLowerCase();
        const speaksLanguage = g.languages.some((l) => l.toLowerCase() === lang);
        if (!speaksLanguage) return false;
      }

      // 5. Min Rating Filter
      if (minRating > 0 && g.rating < minRating) {
        return false;
      }

      // 6. Max Hourly Rate
      if (maxHourlyRate != null && g.hourly_rate > maxHourlyRate) {
        return false;
      }

      // 7. Availability Filter
      if (availableOnly && !g.available_today) {
        return false;
      }

      return true;
    });

  // Sort Results
  results.sort((a, b) => {
    // If language is specified, prioritize exact language match
    if (language && language !== "all") {
      const aLang = a.languages.some((l) => l.toLowerCase() === language.toLowerCase());
      const bLang = b.languages.some((l) => l.toLowerCase() === language.toLowerCase());
      if (aLang && !bLang) return -1;
      if (!aLang && bLang) return 1;
    }

    if (sortBy === "distance") {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      return (b.rating ?? 0) - (a.rating ?? 0);
    }

    if (sortBy === "rating") {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }

    if (sortBy === "completed_tours") {
      return (b.completed_tours ?? 0) - (a.completed_tours ?? 0);
    }

    if (sortBy === "price_asc") {
      return a.hourly_rate - b.hourly_rate;
    }

    if (sortBy === "experience") {
      return b.experience_years - a.experience_years;
    }

    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Guide Storage & State Helper Functions (Hybrid DB + Local Cache)
// ─────────────────────────────────────────────────────────────────────────────

const GUIDE_BOOKINGS_STORAGE_KEY = "travezy_guide_bookings_v1";
const GUIDE_REVIEWS_STORAGE_KEY = "travezy_guide_reviews_v1";

export function getLocalGuideBookings(): GuideBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUIDE_BOOKINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalGuideBooking(booking: GuideBooking): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalGuideBookings();
    const filtered = existing.filter((b) => b.id !== booking.id);
    localStorage.setItem(GUIDE_BOOKINGS_STORAGE_KEY, JSON.stringify([booking, ...filtered]));
  } catch (e) {
    console.error("Error saving guide booking to localStorage:", e);
  }
}

export function updateLocalGuideBookingStatus(
  bookingId: string,
  newStatus: GuideBooking["booking_status"],
): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalGuideBookings();
    const updated = existing.map((b) => (b.id === bookingId ? { ...b, booking_status: newStatus } : b));
    localStorage.setItem(GUIDE_BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error updating guide booking in localStorage:", e);
  }
}

export function getLocalGuideReviews(): { guide_id: string; review: GuideReview }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUIDE_REVIEWS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalGuideReview(guideId: string, review: GuideReview): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalGuideReviews();
    localStorage.setItem(GUIDE_REVIEWS_STORAGE_KEY, JSON.stringify([...existing, { guide_id: guideId, review }]));
  } catch (e) {
    console.error("Error saving guide review to localStorage:", e);
  }
}

/**
 * Fetch a guide by ID, augmenting with any user-submitted reviews.
 */
export function getGuideById(guideId: string): HumanTourGuide | null {
  const guide = HUMAN_TOUR_GUIDES.find((g) => g.id === guideId);
  if (!guide) return null;

  const localReviews = getLocalGuideReviews()
    .filter((r) => r.guide_id === guideId)
    .map((r) => r.review);

  if (!localReviews.length) return guide;

  const allReviews = [...localReviews, ...guide.reviews];
  const avgRating = Number(
    (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(2),
  );

  return {
    ...guide,
    rating: avgRating,
    review_count: allReviews.length,
    reviews: allReviews,
  };
}

const GUIDE_FALLBACK_PORTRAITS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
];

export function getDeterministicGuideImage(idOrName: string): string {
  let hash = 0;
  const str = idOrName || "guide";
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GUIDE_FALLBACK_PORTRAITS.length;
  return GUIDE_FALLBACK_PORTRAITS[idx]!;
}

/**
 * React Query definition for Human Tour Guides list
 */
export const humanGuidesQuery = (filters: GuideSearchFilters = {}) => ({
  queryKey: ["human-guides", filters],
  queryFn: async (): Promise<GuideWithDistance[]> => {
    let guides = [...HUMAN_TOUR_GUIDES];

    // Check if Supabase has additional registered tour guides
    try {
      const { data, error } = await supabase
        .from("tour_guides" as any)
        .select("*")
        .eq("active", true);

      if (!error && data && data.length > 0) {
        const dbGuides: HumanTourGuide[] = data.map((d: any) => ({
          id: d.id,
          user_id: d.user_id || `user-guide-${d.id}`,
          name: d.name,
          profile_image:
            d.profile_image ||
            getDeterministicGuideImage(d.id || d.name),
          bio: d.bio || "Certified Travezy Tour Guide",
          city: d.city,
          state: d.state,
          latitude: Number(d.latitude),
          longitude: Number(d.longitude),
          service_radius_km: d.service_radius_km || 25,
          coverage_areas: d.coverage_areas || [d.city],
          languages: d.languages || ["English", "Hindi"],
          tour_categories: d.tour_categories || ["heritage", "culture"],
          specializations: d.specializations || ["Local Sightseeing & History"],
          hourly_rate: Number(d.hourly_rate || 350),
          half_day_rate: Number(d.half_day_rate || 1300),
          full_day_rate: Number(d.full_day_rate || 2400),
          currency: "INR",
          experience_years: d.experience_years || 5,
          verification_status: (d.verification_status as any) || "verified",
          is_travezy_verified: d.is_travezy_verified !== false,
          active: true,
          rating: Number(d.rating || 4.8),
          review_count: d.review_count || 0,
          completed_tours: d.completed_tours || 0,
          phone_masked: d.phone ? `${d.phone.substring(0, 7)} •••••` : "+91 98470 •••••",
          phone_full: d.phone || undefined,
          email: d.email || `${d.name.toLowerCase().replace(/\s+/g, ".")}@travezyguides.com`,
          available_today: true,
          availability_slots: [
            { slot_id: "s1", start_time: "09:00", end_time: "12:30", label: "Morning Tour", is_available: true },
            { slot_id: "s2", start_time: "14:30", end_time: "18:00", label: "Afternoon Tour", is_available: true },
          ],
          tour_packages: [
            {
              id: `pkg-${d.id}-1`,
              title: `${d.city} Guided Exploration`,
              duration: "3.5 Hours",
              duration_type: "half_day",
              price: Number(d.half_day_rate || 1300),
              description: `Guided walk through the top sights and hidden gems of ${d.city}.`,
              highlights: ["Local Heritage", "Photo Spots", "Local Delicacies"],
            },
          ],
          reviews: [],
        }));

        const existingIds = new Set(guides.map((g) => g.id));
        const newDbGuides = dbGuides.filter((dbg) => !existingIds.has(dbg.id));
        guides = [...guides, ...newDbGuides];
      }
    } catch {
      // Graceful fallback to static seed guides
    }

    return searchHumanGuides(guides, filters);
  },
});

/**
 * React Query definition for a single Tour Guide detail
 */
export const humanGuideQuery = (guideId: string) => ({
  queryKey: ["human-guide", guideId],
  queryFn: async (): Promise<HumanTourGuide | null> => {
    return getGuideById(guideId);
  },
});
