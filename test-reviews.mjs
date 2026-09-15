import assert from "node:assert/strict";

console.log("=== Running Week 5 Part 3 Reviews & Ratings Unit & Logic Tests ===");

// 1. Test Rating Schema Validation
function validateRating(rating) {
  if (typeof rating !== "number" || !Number.isInteger(rating)) return false;
  if (rating < 1 || rating > 5) return false;
  return true;
}

assert.equal(validateRating(1), true, "Rating 1 should be valid");
assert.equal(validateRating(3), true, "Rating 3 should be valid");
assert.equal(validateRating(5), true, "Rating 5 should be valid");
assert.equal(validateRating(0), false, "Rating 0 must be invalid");
assert.equal(validateRating(6), false, "Rating 6 must be invalid");
assert.equal(validateRating(-1), false, "Negative rating must be invalid");
assert.equal(validateRating(4.5), false, "Non-integer rating must be invalid");
console.log("[PASS] Rating range (1 to 5 integer) validation passes");

// 2. Test Eligibility Business Rules
function checkEligibilityRule({ booking, userId, existingReview }) {
  if (!booking) throw new Error("Booking not found");
  if (booking.user_id !== userId) throw new Error("Forbidden: You can only review your own bookings");
  const status = booking.status.toLowerCase();
  if (status !== "completed") {
    if (status === "cancelled") throw new Error("Cannot review a cancelled booking");
    if (status === "pending") throw new Error("Cannot review a booking that is still pending confirmation");
    throw new Error("You can only review a service after your trip has been completed");
  }
  if (existingReview) {
    return { eligible: false, reason: "ALREADY_REVIEWED" };
  }
  return { eligible: true };
}

// Case A: Completed booking owned by user
const validBooking = { id: "b1", user_id: "u1", service_id: "s1", status: "completed" };
assert.deepEqual(
  checkEligibilityRule({ booking: validBooking, userId: "u1", existingReview: null }),
  { eligible: true },
  "Completed booking owned by user should be eligible"
);
console.log("[PASS] Completed booking owned by tourist is eligible");

// Case B: Pending booking
const pendingBooking = { id: "b2", user_id: "u1", service_id: "s1", status: "pending" };
assert.throws(
  () => checkEligibilityRule({ booking: pendingBooking, userId: "u1", existingReview: null }),
  /still pending confirmation/,
  "Pending booking must throw error"
);
console.log("[PASS] Pending booking review is strictly rejected");

// Case C: Cancelled booking
const cancelledBooking = { id: "b3", user_id: "u1", service_id: "s1", status: "cancelled" };
assert.throws(
  () => checkEligibilityRule({ booking: cancelledBooking, userId: "u1", existingReview: null }),
  /Cannot review a cancelled booking/,
  "Cancelled booking must throw error"
);
console.log("[PASS] Cancelled booking review is strictly rejected");

// Case D: Other user's booking
assert.throws(
  () => checkEligibilityRule({ booking: validBooking, userId: "u2", existingReview: null }),
  /Forbidden/,
  "Unowned booking must throw forbidden error"
);
console.log("[PASS] Reviewing another user's booking is strictly forbidden");

// Case E: Already reviewed booking
assert.deepEqual(
  checkEligibilityRule({ booking: validBooking, userId: "u1", existingReview: { id: "r1" } }),
  { eligible: false, reason: "ALREADY_REVIEWED" },
  "Duplicate review attempt must return ALREADY_REVIEWED"
);
console.log("[PASS] Duplicate review prevention returns ALREADY_REVIEWED");

// 3. Test Provider Response Authorization
function verifyProviderResponseAuth({ serviceProviderId, authenticatedProviderId }) {
  if (!authenticatedProviderId) throw new Error("Unauthorized");
  if (serviceProviderId !== authenticatedProviderId) {
    throw new Error("Forbidden: You can only respond to reviews for your own services");
  }
  return true;
}

assert.equal(
  verifyProviderResponseAuth({ serviceProviderId: "prov-1", authenticatedProviderId: "prov-1" }),
  true,
  "Matching provider should be authorized"
);

assert.throws(
  () => verifyProviderResponseAuth({ serviceProviderId: "prov-1", authenticatedProviderId: "prov-2" }),
  /Forbidden/,
  "Different provider must be rejected"
);
console.log("[PASS] Provider response authorization enforces service ownership");

// 4. Test Service Average Rating Calculation
function computeServiceRating(ratings) {
  const count = ratings.length;
  if (count === 0) return { avgRating: 0, reviewCount: 0 };
  const avg = Number((ratings.reduce((a, b) => a + b, 0) / count).toFixed(1));
  return { avgRating: avg, reviewCount: count };
}

assert.deepEqual(computeServiceRating([5, 5, 4]), { avgRating: 4.7, reviewCount: 3 });
assert.deepEqual(computeServiceRating([5, 4, 3, 2, 1]), { avgRating: 3.0, reviewCount: 5 });
assert.deepEqual(computeServiceRating([]), { avgRating: 0, reviewCount: 0 });
assert.deepEqual(computeServiceRating([5]), { avgRating: 5.0, reviewCount: 1 });
console.log("[PASS] Dynamic average rating computation accurately handles decimals and empty sets");

console.log("\nAll 8 Part 3 Review & Response tests passed successfully!");
