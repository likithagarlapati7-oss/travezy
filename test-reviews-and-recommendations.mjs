import assert from "node:assert/strict";

console.log("=== Running Travezy Reviews, Ratings & Recommendation System Tests ===");

// ── 1. Test Bayesian Recommendation Quality Score ────────────────────────────
function calculateBayesianScore(rating, reviewCount, m = 15, c = 4.6) {
  const r = typeof rating === "number" && !isNaN(rating) && rating > 0 ? rating : c;
  const v = typeof reviewCount === "number" && !isNaN(reviewCount) && reviewCount > 0 ? reviewCount : 0;

  if (v === 0) return c * 0.85;

  const score = (v / (v + m)) * r + (m / (v + m)) * c;
  return Number(score.toFixed(4));
}

const highVolumeListing = calculateBayesianScore(4.8, 320); // 4.8★ with 320 reviews
const lowVolumeListing = calculateBayesianScore(5.0, 2);    // 5.0★ with 2 reviews
const unreviewedListing = calculateBayesianScore(0, 0);

assert.ok(
  highVolumeListing > lowVolumeListing,
  `High volume listing (${highVolumeListing}) must rank higher than low volume 5★ (${lowVolumeListing})`
);
assert.ok(
  lowVolumeListing > unreviewedListing,
  `Low volume listing (${lowVolumeListing}) must rank higher than unreviewed (${unreviewedListing})`
);
console.log(`[PASS] Bayesian Weighted Scorer: 4.8★ (320 reviews) score=${highVolumeListing} > 5.0★ (2 reviews) score=${lowVolumeListing}`);

// ── 2. Test Personalization & Affinity Boost Scoring ──────────────────────────
function calculatePersonalizedScore(service, userInterests) {
  const baseScore = calculateBayesianScore(service.rating, service.review_count);
  if (!userInterests) return baseScore;

  let affinityBoost = 0;
  const destLower = [service.destination, service.city, service.state]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (userInterests.destinations?.length) {
    const destMatches = userInterests.destinations.some((d) => destLower.includes(d.toLowerCase()));
    if (destMatches) affinityBoost += 0.5;
  }

  if (userInterests.categories?.length && service.category) {
    const catMatches = userInterests.categories.some(
      (c) => c.toLowerCase() === service.category.toLowerCase()
    );
    if (catMatches) affinityBoost += 0.3;
  }

  if (userInterests.bookedIds?.includes(service.id)) {
    affinityBoost -= 0.4;
  }

  return Number((baseScore + affinityBoost).toFixed(4));
}

const keralaHotel = {
  id: "h-kerala",
  title: "Kumarakom Waters Resort",
  city: "Kochi",
  state: "Kerala",
  destination: "Kochi",
  category: "hotel",
  rating: 4.7,
  review_count: 85,
};

const shimlaHotel = {
  id: "h-shimla",
  title: "Wildflower Hall",
  city: "Shimla",
  state: "Himachal Pradesh",
  destination: "Shimla",
  category: "hotel",
  rating: 4.8,
  review_count: 90,
};

const keralaInterests = {
  destinations: ["Kochi", "Kerala"],
  categories: ["hotel"],
  viewedIds: ["h-kerala"],
  bookedIds: [],
};

const scoreKeralaUser = calculatePersonalizedScore(keralaHotel, keralaInterests);
const scoreShimlaUser = calculatePersonalizedScore(shimlaHotel, keralaInterests);

assert.ok(
  scoreKeralaUser > scoreShimlaUser,
  `Kerala hotel (${scoreKeralaUser}) must be boosted over Shimla (${scoreShimlaUser}) for Kerala-interested tourist`
);
console.log(`[PASS] Personalization boost: Kerala Hotel (${scoreKeralaUser}) > Shimla Hotel (${scoreShimlaUser})`);

// ── 3. Test "You May Also Like" Proximity & Category Resolution ───────────────
function getRelatedRecommendations(currentService, allServices, limit = 4) {
  const otherServices = allServices.filter((s) => s.id !== currentService.id);
  const curDest = (currentService.city || currentService.destination || currentService.state || "").toLowerCase();
  const curState = (currentService.state || "").toLowerCase();

  const proximityRank = (s) => {
    let pScore = calculateBayesianScore(s.rating, s.review_count);
    const sDest = [s.destination, s.city].filter(Boolean).join(" ").toLowerCase();
    const sState = (s.state || "").toLowerCase();

    if (curDest && sDest.includes(curDest)) pScore += 1.0;
    else if (curState && sState === curState) pScore += 0.5;

    return pScore;
  };

  const stays = otherServices
    .filter((s) => ["hotel", "resort", "homestay", "heritage"].includes(s.category.toLowerCase()))
    .sort((a, b) => proximityRank(b) - proximityRank(a))
    .slice(0, limit);

  const dining = otherServices
    .filter((s) => ["restaurant", "dining", "culinary"].includes(s.category.toLowerCase()))
    .sort((a, b) => proximityRank(b) - proximityRank(a))
    .slice(0, limit);

  const experiences = otherServices
    .filter((s) => ["tour", "adventure", "activity", "guide"].includes(s.category.toLowerCase()))
    .sort((a, b) => proximityRank(b) - proximityRank(a))
    .slice(0, limit);

  return { nearbyStays: stays, nearbyDining: dining, nearbyExperiences: experiences };
}

const mockCatalog = [
  { id: "vizag-hotel-1", title: "The Gateway Hotel", city: "Visakhapatnam", state: "Andhra Pradesh", category: "hotel", rating: 4.8, review_count: 480 },
  { id: "vizag-hotel-2", title: "Novotel Varun Beach", city: "Visakhapatnam", state: "Andhra Pradesh", category: "hotel", rating: 4.7, review_count: 320 },
  { id: "vizag-rest-1", title: "Grand Andhra Spice House", city: "Visakhapatnam", state: "Andhra Pradesh", category: "restaurant", rating: 4.9, review_count: 650 },
  { id: "vizag-tour-1", title: "Araku Valley Vistadome Expedition", city: "Visakhapatnam", state: "Andhra Pradesh", category: "adventure", rating: 4.9, review_count: 520 },
  { id: "delhi-hotel-1", title: "The Imperial Delhi", city: "New Delhi", state: "Delhi", category: "hotel", rating: 4.8, review_count: 300 },
];

const relatedForGateway = getRelatedRecommendations(mockCatalog[0], mockCatalog);
assert.equal(relatedForGateway.nearbyStays[0].id, "vizag-hotel-2", "Should recommend Novotel Varun Beach for Gateway Hotel");
assert.equal(relatedForGateway.nearbyDining[0].id, "vizag-rest-1", "Should recommend Grand Andhra Spice House nearby");
assert.equal(relatedForGateway.nearbyExperiences[0].id, "vizag-tour-1", "Should recommend Araku Vistadome tour");
console.log("[PASS] 'You May Also Like' correctly pairs nearby stays, dining, and tours");

// ── 4. Test Review Eligibility & Duplicate Protection ─────────────────────────
function checkReviewEligibilityRule({ booking, userId, existingReview, serviceId }) {
  if (!booking) throw new Error("Booking not found");
  if (booking.user_id !== userId) throw new Error("Forbidden: You can only review your own bookings");
  const status = (booking.status || "").toLowerCase();
  if (status !== "completed") {
    if (status === "cancelled") throw new Error("Cannot review a cancelled booking");
    if (status === "pending") throw new Error("Cannot review a booking that is still pending confirmation");
    throw new Error("You can only review a service after your trip has been completed");
  }
  if (existingReview) {
    return { eligible: false, reason: "ALREADY_REVIEWED", existingReview };
  }
  const matchesService =
    booking.service_id === serviceId ||
    (typeof booking.notes === "string" && booking.notes.includes(serviceId));
  if (!matchesService) {
    throw new Error("The specified service does not match the booking");
  }
  return { eligible: true };
}

// Case A: Completed booking eligible
const compBooking = { id: "b1", user_id: "user-123", service_id: "s1", status: "completed" };
assert.deepEqual(
  checkReviewEligibilityRule({ booking: compBooking, userId: "user-123", existingReview: null, serviceId: "s1" }),
  { eligible: true }
);

// Case B: Curated booking encoded in notes
const curatedBooking = { id: "b2", user_id: "user-123", service_id: "db-anchor", status: "completed", notes: "[Curated:30100000-0000-4000-8000-000000000001]" };
assert.deepEqual(
  checkReviewEligibilityRule({ booking: curatedBooking, userId: "user-123", existingReview: null, serviceId: "30100000-0000-4000-8000-000000000001" }),
  { eligible: true }
);

// Case C: Duplicate review prevention
assert.deepEqual(
  checkReviewEligibilityRule({ booking: compBooking, userId: "user-123", existingReview: { id: "r1" }, serviceId: "s1" }),
  { eligible: false, reason: "ALREADY_REVIEWED", existingReview: { id: "r1" } }
);

// Case D: Pending status rejected
assert.throws(
  () => checkReviewEligibilityRule({ booking: { ...compBooking, status: "pending" }, userId: "user-123", existingReview: null, serviceId: "s1" }),
  /still pending confirmation/
);

// Case E: Cancelled status rejected
assert.throws(
  () => checkReviewEligibilityRule({ booking: { ...compBooking, status: "cancelled" }, userId: "user-123", existingReview: null, serviceId: "s1" }),
  /Cannot review a cancelled booking/
);

// Case F: Wrong user rejected
assert.throws(
  () => checkReviewEligibilityRule({ booking: compBooking, userId: "user-999", existingReview: null, serviceId: "s1" }),
  /Forbidden/
);
console.log("[PASS] Completed booking eligibility, duplicate prevention, and curated notes matching passed");

// ── 5. Test Rating Recalculation Trigger Math ─────────────────────────────────
function recalculateRating(existingReviews, newReview) {
  const all = [...existingReviews, newReview];
  const count = all.length;
  const avg = Number((all.reduce((acc, r) => acc + r.rating, 0) / count).toFixed(1));
  return { avgRating: avg, reviewCount: count };
}

const initialReviews = [
  { rating: 5 },
  { rating: 4 },
  { rating: 5 },
  { rating: 4 },
];
const updatedAfterNew5Star = recalculateRating(initialReviews, { rating: 5 });
assert.deepEqual(updatedAfterNew5Star, { avgRating: 4.6, reviewCount: 5 });

const updatedAfterNew1Star = recalculateRating(initialReviews, { rating: 1 });
assert.deepEqual(updatedAfterNew1Star, { avgRating: 3.8, reviewCount: 5 });
console.log("[PASS] Real-time service rating recalculation accurately updates averages and counts");

console.log("\n🎉 ALL 5 TEST SUITES PASSED (100% GREEN)!");
