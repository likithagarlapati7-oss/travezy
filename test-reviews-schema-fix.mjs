import assert from "node:assert/strict";
import {
  createReviewSchema,
  updateReviewSchema,
  providerResponseSchema,
} from "./src/lib/reviews.schema.ts";
import {
  checkReviewEligibility,
  recalculateServiceRating,
  createReviewServer,
  respondToReviewServer,
} from "./src/lib/reviews.server.ts";

console.log("================================================================================");
console.log("=== Running Travezy Reviews & Booking Schema Fix Comprehensive Test Suite ===");
console.log("================================================================================");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

// ── Test 1: Review Schema Validation ─────────────────────────────────────────
await test("1. Schema Validation: Validates inputs (rating, booking_id, comment, title, images)", () => {
  const valid = {
    booking_id: "c1965a31-b7f8-49a3-80b9-0493ad3c4fba",
    service_id: "b223d67d-44ad-4ae2-ad98-5e6dc08f39a4",
    rating: 5,
    title: "Unforgettable Stay!",
    comment: "The room was spacious and the hospitality was truly world class.",
    images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945"],
  };

  const parsed = createReviewSchema.parse(valid);
  assert.equal(parsed.rating, 5);
  assert.equal(parsed.booking_id, valid.booking_id);
  assert.equal(parsed.title, "Unforgettable Stay!");

  // Reject invalid ratings
  assert.throws(() => {
    createReviewSchema.parse({ ...valid, rating: 6 });
  });
  assert.throws(() => {
    createReviewSchema.parse({ ...valid, rating: 0 });
  });

  // Reject comment too short (< 3 chars)
  assert.throws(() => {
    createReviewSchema.parse({ ...valid, comment: "Hi" });
  });

  // Reject non-uuid booking_id
  assert.throws(() => {
    createReviewSchema.parse({ ...valid, booking_id: "invalid-id" });
  });
});

// ── Test 2: Booking Eligibility Check Logic ──────────────────────────────────
await test("2. Review Eligibility: Enforces tourist ownership and completed booking lifecycle", async () => {
  const touristId = "11111111-1111-4111-8111-111111111111";
  const otherUserId = "22222222-2222-4222-8222-222222222222";
  const bookingId = "33333333-3333-4333-8333-333333333333";
  const serviceId = "44444444-4444-4444-8444-444444444444";

  // Mock Supabase client for pending booking
  const mockPendingSupabase = {
    from: (table) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: bookingId,
                  user_id: touristId,
                  service_id: serviceId,
                  status: "pending",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    },
  };

  await assert.rejects(
    async () => {
      await checkReviewEligibility(mockPendingSupabase, bookingId, touristId);
    },
    { message: /pending confirmation/ }
  );

  // Mock Supabase client for wrong user (forbidden)
  const mockWrongUserSupabase = {
    from: (table) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: bookingId,
                  user_id: otherUserId,
                  service_id: serviceId,
                  status: "completed",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    },
  };

  await assert.rejects(
    async () => {
      await checkReviewEligibility(mockWrongUserSupabase, bookingId, touristId);
    },
    { message: /Forbidden: You can only review your own bookings/ }
  );

  // Mock Supabase client for cancelled booking
  const mockCancelledSupabase = {
    from: (table) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: bookingId,
                  user_id: touristId,
                  service_id: serviceId,
                  status: "cancelled",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    },
  };

  await assert.rejects(
    async () => {
      await checkReviewEligibility(mockCancelledSupabase, bookingId, touristId);
    },
    { message: /Cannot review a cancelled booking/ }
  );

  // Mock Supabase client for completed eligible booking
  const mockEligibleSupabase = {
    from: (table) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: bookingId,
                  user_id: touristId,
                  service_id: serviceId,
                  status: "completed",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "reviews") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    },
  };

  const eligibility = await checkReviewEligibility(mockEligibleSupabase, bookingId, touristId);
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.booking.id, bookingId);
});

// ── Test 3: Duplicate Review Prevention ──────────────────────────────────────
await test("3. Duplicate Review Prevention: Rejects second review submission for same booking", async () => {
  const touristId = "11111111-1111-4111-8111-111111111111";
  const bookingId = "33333333-3333-4333-8333-333333333333";
  const serviceId = "44444444-4444-4444-8444-444444444444";

  // Mock Supabase client where review already exists
  const mockDuplicateSupabase = {
    from: (table) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: bookingId,
                  user_id: touristId,
                  service_id: serviceId,
                  status: "completed",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "reviews") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "rev-already-submitted",
                  booking_id: bookingId,
                  rating: 5,
                  comment: "Great experience!",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    },
  };

  const duplicateCheck = await checkReviewEligibility(mockDuplicateSupabase, bookingId, touristId);
  assert.equal(duplicateCheck.eligible, false);
  assert.equal(duplicateCheck.reason, "ALREADY_REVIEWED");
  assert.ok(duplicateCheck.existingReview);
});

// ── Test 4: Schema Cache Resilience and Multi-Tier Fallback ──────────────────
await test("4. Schema Cache Resilience: Gracefully falls back when booking_id is not in schema cache", async () => {
  const touristId = "11111111-1111-4111-8111-111111111111";
  const bookingId = "33333333-3333-4333-8333-333333333333";
  const serviceId = "44444444-4444-4444-8444-444444444444";
  const providerId = "55555555-5555-4555-8555-555555555555";

  let insertCalls = [];
  let updatedBookingNotes = null;

  // Mock client simulating PostgREST schema cache error on booking_id
  const mockCacheMissingSupabase = {
    from: (table) => {
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: "tourist" }, error: null }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { account_type: "tourist", full_name: "Test Tourist" }, error: null }),
            }),
          }),
        };
      }
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: bookingId,
                  user_id: touristId,
                  service_id: serviceId,
                  provider_id: providerId,
                  status: "completed",
                  services: { id: serviceId, title: "Test Resort", provider_id: providerId },
                },
                error: null,
              }),
            }),
          }),
          update: (payload) => ({
            eq: async (col, val) => {
              updatedBookingNotes = payload.notes;
              return { data: null, error: null };
            },
          }),
        };
      }
      if (table === "reviews") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          insert: (payload) => {
            insertCalls.push(payload);
            if (payload.booking_id) {
              return {
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: {
                      code: "PGRST204",
                      message: "Could not find the 'booking_id' column of 'reviews' in the schema cache",
                    },
                  }),
                }),
              };
            }
            if (payload.provider_id) {
              return {
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: {
                      code: "PGRST204",
                      message: "Could not find the 'provider_id' column of 'reviews' in the schema cache",
                    },
                  }),
                }),
              };
            }
            // Fallback insert with minimal core schema succeeds
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: "rev-fallback-12345",
                    user_id: payload.user_id,
                    service_id: payload.service_id,
                    rating: payload.rating,
                    comment: payload.comment,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === "services") {
        return {
          update: () => ({
            eq: async () => ({ data: null, error: null }),
          }),
        };
      }
      if (table === "providers") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { user_id: "prov-user-1" }, error: null }),
            }),
          }),
        };
      }
      return {};
    },
  };

  const review = await createReviewServer({
    supabase: mockCacheMissingSupabase,
    userId: touristId,
    bookingId,
    serviceId,
    rating: 5,
    title: "Smooth Fallback",
    comment: "Everything worked flawlessly even during cache sync.",
  });

  assert.ok(review);
  assert.equal(review.id, "rev-fallback-12345");
  assert.equal(insertCalls.length >= 2, true);
  // Verify notes attached to booking for linking & duplicate prevention
  assert.ok(updatedBookingNotes && updatedBookingNotes.includes("[Reviewed: rev-fallback-12345]"));
});

// ── Test 5: Dynamic Rating Recalculation & Seed Review Compatibility ──────────
await test("5. Dynamic Rating Calculation: Computes avg score & count, preserving seed reviews", async () => {
  const serviceId = "44444444-4444-4444-8444-444444444444";
  let updatedRating = null;
  let updatedCount = null;

  // Reviews contains both seed review (booking_id=null) and verified reviews
  const mockReviews = [
    { id: "seed-1", service_id: serviceId, booking_id: null, rating: 5 },
    { id: "seed-2", service_id: serviceId, booking_id: null, rating: 4 },
    { id: "tourist-1", service_id: serviceId, booking_id: "b-1", rating: 5 },
    { id: "tourist-2", service_id: serviceId, booking_id: "b-2", rating: 4 },
  ];

  const mockRatingSupabase = {
    from: (table) => {
      if (table === "reviews") {
        return {
          select: () => ({
            eq: async () => ({
              data: mockReviews,
              error: null,
            }),
          }),
        };
      }
      if (table === "services") {
        return {
          update: (payload) => ({
            eq: async (col, val) => {
              updatedRating = payload.rating;
              updatedCount = payload.review_count;
              return { data: null, error: null };
            },
          }),
        };
      }
      return {};
    },
  };

  const result = await recalculateServiceRating(mockRatingSupabase, serviceId);
  // Avg of [5, 4, 5, 4] = 18 / 4 = 4.5
  assert.equal(result.avgRating, 4.5);
  assert.equal(result.reviewCount, 4);
  assert.equal(updatedRating, 4.5);
  assert.equal(updatedCount, 4);
});

// ── Test 6: Provider Reviews & Response Workflow ─────────────────────────────
await test("6. Provider Reviews & Response: Provider views reviews and posts host reply", async () => {
  const providerUserId = "prov-user-uuid-111";
  const providerId = "prov-record-uuid-222";
  const reviewId = "rev-target-uuid-333";
  const serviceId = "srv-target-uuid-444";

  let savedResponse = null;

  const mockProviderSupabase = {
    from: (table) => {
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: async () => ({ data: [{ role: "provider" }], error: null }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { account_type: "provider", full_name: "Test Host" }, error: null }),
            }),
          }),
        };
      }
      if (table === "providers") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: providerId, user_id: providerUserId }, error: null }),
            }),
          }),
        };
      }
      if (table === "reviews") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: reviewId,
                  service_id: serviceId,
                  provider_id: providerId,
                  user_id: "tourist-user-1",
                  rating: 5,
                  comment: "Wonderful hospitality!",
                  services: { id: serviceId, title: "Grand Heritage Resort", provider_id: providerId },
                },
                error: null,
              }),
            }),
          }),
          update: (payload) => ({
            eq: () => ({
              select: () => ({
                single: async () => {
                  savedResponse = payload.provider_response;
                  return {
                    data: {
                      id: reviewId,
                      provider_response: payload.provider_response,
                      provider_responded_at: payload.provider_responded_at,
                    },
                    error: null,
                  };
                },
              }),
            }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: async () => ({ data: null, error: null }),
        };
      }
      return {};
    },
  };

  const responseText = "Thank you so much for visiting us! We look forward to hosting you again.";
  const updatedReview = await respondToReviewServer({
    supabase: mockProviderSupabase,
    userId: providerUserId,
    reviewId,
    response: responseText,
  });

  assert.ok(updatedReview);
  assert.equal(savedResponse, responseText);
});

console.log("\n================================================================================");
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log("================================================================================");

if (failed > 0) process.exit(1);
