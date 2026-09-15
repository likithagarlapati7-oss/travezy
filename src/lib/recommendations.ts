import type { ServiceWithProvider } from "./travezy";

export interface UserInterests {
  destinations: string[]; // e.g. ["Kochi", "Kerala", "Goa", "Jaipur"]
  categories: string[];   // e.g. ["hotel", "restaurant", "adventure", "tour"]
  viewedIds: string[];    // IDs of recently viewed services
  bookedIds: string[];    // IDs of services booked by the tourist
}

/**
 * Calculates a Bayesian weighted score to fairly rank listings by rating and review count.
 * Formula: (v / (v + m)) * R + (m / (v + m)) * C
 * - R = average rating of item
 * - v = review count of item
 * - m = minimum review threshold (default: 15)
 * - C = marketplace average baseline rating (default: 4.6)
 */
export function calculateBayesianScore(
  rating: number | null | undefined,
  reviewCount: number | null | undefined,
  m = 15,
  c = 4.6
): number {
  const r = typeof rating === "number" && !isNaN(rating) && rating > 0 ? rating : c;
  const v = typeof reviewCount === "number" && !isNaN(reviewCount) && reviewCount > 0 ? reviewCount : 0;

  if (v === 0) {
    return c * 0.85; // Slight dampening for unreviewed items
  }

  const score = (v / (v + m)) * r + (m / (v + m)) * c;
  return Number(score.toFixed(4));
}

/**
 * Computes a combined relevance score considering Bayesian quality score,
 * destination affinity, category affinity, and recency.
 */
export function calculatePersonalizedScore(
  service: ServiceWithProvider,
  userInterests?: UserInterests | null
): number {
  const baseScore = calculateBayesianScore(service.rating, service.review_count);

  if (!userInterests) {
    return baseScore;
  }

  let affinityBoost = 0;
  const destLower = [service.destination, service.city, service.state]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // 1. Destination Match (+0.50 score boost if user previously browsed/booked this destination)
  if (userInterests.destinations?.length) {
    const destMatches = userInterests.destinations.some((d) =>
      destLower.includes(d.toLowerCase())
    );
    if (destMatches) {
      affinityBoost += 0.5;
    }
  }

  // 2. Category Match (+0.30 score boost if user loves this category)
  if (userInterests.categories?.length && service.category) {
    const catMatches = userInterests.categories.some(
      (c) => c.toLowerCase() === service.category.toLowerCase()
    );
    if (catMatches) {
      affinityBoost += 0.3;
    }
  }

  // 3. Penalty if already booked (we want to suggest new complementary services)
  if (userInterests.bookedIds?.includes(service.id)) {
    affinityBoost -= 0.4;
  }

  return Number((baseScore + affinityBoost).toFixed(4));
}

/**
 * Returns personalized recommendations for a tourist.
 * For new users without history, returns a high-scoring balanced mix across Stays, Dining, and Tours.
 */
export function getPersonalizedRecommendations(
  allServices: ServiceWithProvider[],
  userInterests?: UserInterests | null,
  limit = 6
): ServiceWithProvider[] {
  if (!allServices?.length) return [];

  // Sort by personalized score
  const scored = allServices.map((s) => ({
    service: s,
    score: calculatePersonalizedScore(s, userInterests),
  }));

  scored.sort((a, b) => b.score - a.score);

  // If user is new (no destinations/categories), ensure category diversity
  if (!userInterests || (!userInterests.destinations.length && !userInterests.categories.length)) {
    const stays = scored.filter((item) =>
      ["hotel", "resort", "homestay", "heritage"].includes(item.service.category.toLowerCase())
    );
    const dining = scored.filter((item) =>
      ["restaurant", "dining", "culinary"].includes(item.service.category.toLowerCase())
    );
    const tours = scored.filter((item) =>
      ["tour", "adventure", "activity", "guide"].includes(item.service.category.toLowerCase())
    );

    const balanced: ServiceWithProvider[] = [];
    const maxPerCat = Math.ceil(limit / 3);

    for (let i = 0; i < maxPerCat; i++) {
      const stayItem = stays[i];
      if (stayItem) balanced.push(stayItem.service);
      const diningItem = dining[i];
      if (diningItem) balanced.push(diningItem.service);
      const tourItem = tours[i];
      if (tourItem) balanced.push(tourItem.service);
    }

    return balanced.slice(0, limit);
  }

  return scored.slice(0, limit).map((s) => s.service);
}

/**
 * Returns "You May Also Like" cross-category and proximity recommendations for a detail page.
 */
export function getRelatedRecommendations(
  currentService: ServiceWithProvider,
  allServices: ServiceWithProvider[],
  limit = 4
): {
  nearbyStays: ServiceWithProvider[];
  nearbyDining: ServiceWithProvider[];
  nearbyExperiences: ServiceWithProvider[];
  similarCategory: ServiceWithProvider[];
} {
  const otherServices = allServices.filter((s) => s.id !== currentService.id);
  const curDest = (currentService.city || currentService.destination || currentService.state || "").toLowerCase();
  const curState = (currentService.state || "").toLowerCase();
  const curCat = currentService.category.toLowerCase();

  // Match score helper
  const proximityRank = (s: ServiceWithProvider) => {
    let pScore = calculateBayesianScore(s.rating, s.review_count);
    const sDest = [s.destination, s.city].filter(Boolean).join(" ").toLowerCase();
    const sState = (s.state || "").toLowerCase();

    if (curDest && sDest.includes(curDest)) pScore += 1.0;
    else if (curState && sState === curState) pScore += 0.5;

    return pScore;
  };

  // 1. Nearby Stays
  const stays = otherServices
    .filter((s) => ["hotel", "resort", "homestay", "heritage"].includes(s.category.toLowerCase()))
    .sort((a, b) => proximityRank(b) - proximityRank(a))
    .slice(0, limit);

  // 2. Nearby Dining / Restaurants
  const dining = otherServices
    .filter((s) => ["restaurant", "dining", "culinary"].includes(s.category.toLowerCase()))
    .sort((a, b) => proximityRank(b) - proximityRank(a))
    .slice(0, limit);

  // 3. Nearby Experiences / Tours
  const experiences = otherServices
    .filter((s) => ["tour", "adventure", "activity", "guide"].includes(s.category.toLowerCase()))
    .sort((a, b) => proximityRank(b) - proximityRank(a))
    .slice(0, limit);

  // 4. Similar Category
  const similar = otherServices
    .filter((s) => s.category.toLowerCase() === curCat)
    .sort((a, b) => proximityRank(b) - proximityRank(a))
    .slice(0, limit);

  return {
    nearbyStays: stays,
    nearbyDining: dining,
    nearbyExperiences: experiences,
    similarCategory: similar,
  };
}

/**
 * Returns popular listings filtered by a specific city, state, or destination.
 */
export function getPopularInLocation(
  allServices: ServiceWithProvider[],
  locationQuery: string,
  limit = 6
): ServiceWithProvider[] {
  if (!locationQuery || !allServices?.length) return [];
  const q = locationQuery.toLowerCase().trim();

  const matching = allServices.filter((s) => {
    const loc = [s.destination, s.city, s.state, s.country].filter(Boolean).join(" ").toLowerCase();
    return loc.includes(q);
  });

  return matching
    .sort(
      (a, b) =>
        calculateBayesianScore(b.rating, b.review_count) -
        calculateBayesianScore(a.rating, a.review_count)
    )
    .slice(0, limit);
}

/**
 * Returns the highest rated experiences (e.g. 4.7+ and high review count).
 */
export function getHighlyRatedServices(
  allServices: ServiceWithProvider[],
  limit = 6
): ServiceWithProvider[] {
  return [...allServices]
    .filter((s) => (s.rating ?? 0) >= 4.6)
    .sort(
      (a, b) =>
        calculateBayesianScore(b.rating, b.review_count) -
        calculateBayesianScore(a.rating, a.review_count)
    )
    .slice(0, limit);
}
