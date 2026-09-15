import assert from "node:assert/strict";

console.log("===============================================================");
console.log("  Week 7: Dashboards & Administration — Part 1 Unit & Logic Tests");
console.log("===============================================================\n");

// ─── Test Helpers & Mocks ───────────────────────────────────────────────────

const mockTouristUserA = { id: "user_tourist_111", email: "touristA@example.com", full_name: "Alice Tourist" };
const mockTouristUserB = { id: "user_tourist_222", email: "touristB@example.com", full_name: "Bob Tourist" };

const mockProviderUserA = { id: "user_prov_aaa", email: "providerA@example.com", full_name: "Provider Alice" };
const mockProviderUserB = { id: "user_prov_bbb", email: "providerB@example.com", full_name: "Provider Bob" };

const mockProviderProfileA = { id: "prov_profile_aaa", user_id: mockProviderUserA.id, business_name: "Himalayan Escapes" };
const mockProviderProfileB = { id: "prov_profile_bbb", user_id: mockProviderUserB.id, business_name: "Goa Beach Villas" };

const mockServices = [
  { id: "svc_1", provider_id: "prov_profile_aaa", title: "Manali Mountain Lodge", price: 4200, is_active: true, rating: 4.8, review_count: 5 },
  { id: "svc_2", provider_id: "prov_profile_aaa", title: "Solang Valley Paragliding", price: 3000, is_active: true, rating: 4.9, review_count: 3 },
  { id: "svc_3", provider_id: "prov_profile_aaa", title: "Winter Ski Pass (Archived)", price: 5000, is_active: false, rating: 4.5, review_count: 2 },
  { id: "svc_4", provider_id: "prov_profile_bbb", title: "Goa Sunset Cruise", price: 2500, is_active: true, rating: 4.7, review_count: 10 },
];

const mockBookings = [
  // Tourist A bookings
  { id: "bk_1", user_id: "user_tourist_111", service_id: "svc_1", provider_id: "prov_profile_aaa", status: "confirmed", travel_date: "2026-10-15", guests: 2, total_price: 8400, created_at: "2026-09-01T10:00:00Z" },
  { id: "bk_2", user_id: "user_tourist_111", service_id: "svc_2", provider_id: "prov_profile_aaa", status: "pending", travel_date: "2026-11-20", guests: 1, total_price: 3000, created_at: "2026-09-02T12:00:00Z" },
  { id: "bk_3", user_id: "user_tourist_111", service_id: "svc_1", provider_id: "prov_profile_aaa", status: "completed", travel_date: "2026-05-10", guests: 2, total_price: 8400, created_at: "2026-05-01T09:00:00Z" },
  { id: "bk_4", user_id: "user_tourist_111", service_id: "svc_4", provider_id: "prov_profile_bbb", status: "cancelled", travel_date: "2026-07-04", guests: 4, total_price: 10000, created_at: "2026-06-20T15:00:00Z" },
  
  // Tourist B bookings
  { id: "bk_5", user_id: "user_tourist_222", service_id: "svc_4", provider_id: "prov_profile_bbb", status: "confirmed", travel_date: "2026-12-01", guests: 2, total_price: 5000, created_at: "2026-09-03T11:00:00Z" },
  { id: "bk_6", user_id: "user_tourist_222", service_id: "svc_1", provider_id: "prov_profile_aaa", status: "confirmed", travel_date: "2026-10-25", guests: 3, total_price: 12600, created_at: "2026-09-04T08:00:00Z" },
];

const mockPayments = [
  // Payments for Tourist A
  { id: "pay_1", booking_id: "bk_1", user_id: "user_tourist_111", provider_id: "prov_profile_aaa", amount: 8400, status: "SUCCESS", created_at: "2026-09-01T10:05:00Z" },
  { id: "pay_2", booking_id: "bk_2", user_id: "user_tourist_111", provider_id: "prov_profile_aaa", amount: 3000, status: "CREATED", created_at: "2026-09-02T12:05:00Z" }, // Pending payment
  { id: "pay_3", booking_id: "bk_3", user_id: "user_tourist_111", provider_id: "prov_profile_aaa", amount: 8400, status: "SUCCESS", created_at: "2026-05-01T09:10:00Z" },
  { id: "pay_4", booking_id: "bk_4", user_id: "user_tourist_111", provider_id: "prov_profile_bbb", amount: 10000, status: "FAILED", created_at: "2026-06-20T15:10:00Z" }, // Failed payment

  // Payments for Tourist B
  { id: "pay_5", booking_id: "bk_5", user_id: "user_tourist_222", provider_id: "prov_profile_bbb", amount: 5000, status: "SUCCESS", created_at: "2026-09-03T11:10:00Z" },
  { id: "pay_6", booking_id: "bk_6", user_id: "user_tourist_222", provider_id: "prov_profile_aaa", amount: 12600, status: "SUCCESS", created_at: "2026-09-04T08:05:00Z" },
];

const mockReviews = [
  { id: "rev_1", user_id: "user_tourist_111", service_id: "svc_1", provider_id: "prov_profile_aaa", booking_id: "bk_3", rating: 5, comment: "Breathtaking mountain views and cozy wooden lodge!", provider_response: "Thank you Alice, hope to host you again in winter!", provider_responded_at: "2026-05-15T10:00:00Z", created_at: "2026-05-12T14:00:00Z" },
  { id: "rev_2", user_id: "user_tourist_222", service_id: "svc_1", provider_id: "prov_profile_aaa", booking_id: null, rating: 4, comment: "Great hospitality and local food.", provider_response: null, created_at: "2026-06-01T10:00:00Z" },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ─── Part A: Tourist Dashboard Tests ─────────────────────────────────────────

console.log("\n--- PART A: Tourist Dashboard Calculations & Security ---");

test("Tourist Dashboard calculates total bookings accurately from user's records", () => {
  const touristABookings = mockBookings.filter((b) => b.user_id === mockTouristUserA.id);
  assert.equal(touristABookings.length, 4, "Tourist A should have exactly 4 bookings");
});

test("Tourist Dashboard accurately filters upcoming trips (future date & active status)", () => {
  const today = "2026-09-04";
  const touristABookings = mockBookings.filter((b) => b.user_id === mockTouristUserA.id);
  
  const upcoming = touristABookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    const isFuture = !b.travel_date || b.travel_date >= today;
    return isFuture && s !== "cancelled" && s !== "completed";
  });

  // bk_1 (2026-10-15, confirmed) and bk_2 (2026-11-20, pending) are upcoming
  // bk_3 is completed (past), bk_4 is cancelled
  assert.equal(upcoming.length, 2, "Tourist A should have 2 upcoming trips");
  assert.deepEqual(upcoming.map(u => u.id).sort(), ["bk_1", "bk_2"].sort());
});

test("Tourist Dashboard accurately filters completed and pending trips", () => {
  const touristABookings = mockBookings.filter((b) => b.user_id === mockTouristUserA.id);
  
  const completed = touristABookings.filter((b) => b.status.toLowerCase() === "completed");
  const pending = touristABookings.filter((b) => b.status.toLowerCase() === "pending");

  assert.equal(completed.length, 1, "Tourist A should have 1 completed trip");
  assert.equal(pending.length, 1, "Tourist A should have 1 pending booking");
  assert.equal(completed[0].id, "bk_3");
  assert.equal(pending[0].id, "bk_2");
});

test("Tourist Dashboard calculates total spent strictly from SUCCESS payments", () => {
  const touristAPayments = mockPayments.filter((p) => p.user_id === mockTouristUserA.id);
  
  const successPayments = touristAPayments.filter((p) => p.status.toUpperCase() === "SUCCESS");
  const pendingPayments = touristAPayments.filter((p) => ["CREATED", "PENDING"].includes(p.status.toUpperCase()));
  const failedPayments = touristAPayments.filter((p) => p.status.toUpperCase() === "FAILED");

  const totalSpent = successPayments.reduce((sum, p) => sum + p.amount, 0);

  // pay_1 (8400) + pay_3 (8400) = 16800. Excludes pay_2 (3000 pending) and pay_4 (10000 failed)
  assert.equal(successPayments.length, 2, "Tourist A should have 2 successful payments");
  assert.equal(pendingPayments.length, 1, "Tourist A should have 1 pending payment");
  assert.equal(failedPayments.length, 1, "Tourist A should have 1 failed payment");
  assert.equal(totalSpent, 16800, "Tourist A total spent should be 16,800");
});

test("Tourist Dashboard calculates reviews written and average given rating", () => {
  const touristAReviews = mockReviews.filter((r) => r.user_id === mockTouristUserA.id);
  
  assert.equal(touristAReviews.length, 1, "Tourist A should have written 1 review");
  assert.equal(touristAReviews[0].rating, 5, "Rating should be 5");
  assert.ok(touristAReviews[0].provider_response, "Provider response should be present");
});

test("Tourist Data Security: Tourist A cannot view Tourist B records", () => {
  const touristAId = mockTouristUserA.id;
  const touristBId = mockTouristUserB.id;

  const touristABookingIds = mockBookings.filter((b) => b.user_id === touristAId).map(b => b.id);
  const touristBBookingIds = mockBookings.filter((b) => b.user_id === touristBId).map(b => b.id);

  // Assert no overlap
  const overlap = touristABookingIds.filter(id => touristBBookingIds.includes(id));
  assert.equal(overlap.length, 0, "No bookings must overlap between Tourist A and Tourist B");

  // Payment isolation
  const touristAPaymentIds = mockPayments.filter((p) => p.user_id === touristAId).map(p => p.id);
  const touristBPaymentIds = mockPayments.filter((p) => p.user_id === touristBId).map(p => p.id);
  const paymentOverlap = touristAPaymentIds.filter(id => touristBPaymentIds.includes(id));
  assert.equal(paymentOverlap.length, 0, "No payments must overlap between Tourist A and Tourist B");
});

// ─── Part B: Provider Dashboard Tests ─────────────────────────────────────────

console.log("\n--- PART B: Provider Dashboard Calculations & Revenue Security ---");

test("Provider Dashboard calculates total and active services for Provider A", () => {
  const providerAServices = mockServices.filter((s) => s.provider_id === mockProviderProfileA.id);
  const activeServices = providerAServices.filter((s) => s.is_active);

  assert.equal(providerAServices.length, 3, "Provider A should have 3 total services");
  assert.equal(activeServices.length, 2, "Provider A should have 2 active services");
});

test("Provider Dashboard calculates booking breakdown for Provider A", () => {
  const providerABookings = mockBookings.filter((b) => b.provider_id === mockProviderProfileA.id);

  const pending = providerABookings.filter((b) => b.status.toLowerCase() === "pending");
  const confirmed = providerABookings.filter((b) => b.status.toLowerCase() === "confirmed");
  const completed = providerABookings.filter((b) => b.status.toLowerCase() === "completed");
  const cancelled = providerABookings.filter((b) => b.status.toLowerCase() === "cancelled");

  // bk_1 (confirmed), bk_2 (pending), bk_3 (completed), bk_6 (confirmed)
  assert.equal(providerABookings.length, 4, "Provider A should have 4 total bookings");
  assert.equal(pending.length, 1, "Provider A should have 1 pending booking");
  assert.equal(confirmed.length, 2, "Provider A should have 2 confirmed bookings");
  assert.equal(completed.length, 1, "Provider A should have 1 completed booking");
  assert.equal(cancelled.length, 0, "Provider A should have 0 cancelled bookings");
});

test("Provider Revenue Integrity: Strictly counts only successful payments", () => {
  const providerAPayments = mockPayments.filter((p) => p.provider_id === mockProviderProfileA.id);
  
  // Successful payments for Provider A: pay_1 (8400), pay_3 (8400), pay_6 (12600) = 29400
  // pay_2 is CREATED/pending (3000) -> MUST be excluded
  const verifiedPayments = providerAPayments.filter((p) => p.status.toUpperCase() === "SUCCESS");
  const verifiedRevenue = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);

  assert.equal(verifiedPayments.length, 3, "Provider A should have 3 verified successful payments");
  assert.equal(verifiedRevenue, 29400, "Provider A verified revenue must be exactly 29,400");
  
  // Unverified amount (pending/failed) should not be included
  const unverifiedPayments = providerAPayments.filter((p) => p.status.toUpperCase() !== "SUCCESS");
  assert.equal(unverifiedPayments.length, 1, "Provider A should have 1 unverified/pending payment");
});

test("Provider Average Rating calculation across provider reviews", () => {
  const providerAReviews = mockReviews.filter((r) => r.provider_id === mockProviderProfileA.id);
  
  // rev_1 (5), rev_2 (4) -> average = 4.5
  assert.equal(providerAReviews.length, 2, "Provider A should have 2 reviews");
  const avg = (providerAReviews.reduce((s, r) => s + r.rating, 0) / providerAReviews.length).toFixed(1);
  assert.equal(avg, "4.5", "Provider A average rating should be 4.5");
});

test("Provider Data Security: Provider A cannot view Provider B services or revenue", () => {
  const provAId = mockProviderProfileA.id;
  const provBId = mockProviderProfileB.id;

  const provAServices = mockServices.filter((s) => s.provider_id === provAId).map(s => s.id);
  const provBServices = mockServices.filter((s) => s.provider_id === provBId).map(s => s.id);
  assert.equal(provAServices.filter(id => provBServices.includes(id)).length, 0, "Services must not overlap");

  const provAPayments = mockPayments.filter((p) => p.provider_id === provAId);
  const provBPayments = mockPayments.filter((p) => p.provider_id === provBId);
  assert.equal(provAPayments.filter(p => provBPayments.some(bp => bp.id === p.id)).length, 0, "Payments must not overlap");
});

// ─── Status Workflow Transitions ─────────────────────────────────────────────

console.log("\n--- Booking Workflow Status Transition Tests ---");

function validateTransition(current, next) {
  const cur = current.toLowerCase();
  const nxt = next.toLowerCase();
  const allowed = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  return (allowed[cur] || []).includes(nxt);
}

test("Provider can confirm a pending booking", () => {
  assert.equal(validateTransition("pending", "confirmed"), true);
});

test("Provider can reject (cancel) a pending booking", () => {
  assert.equal(validateTransition("pending", "cancelled"), true);
});

test("Provider can complete a confirmed booking", () => {
  assert.equal(validateTransition("confirmed", "completed"), true);
});

test("Provider cannot complete a pending booking directly", () => {
  assert.equal(validateTransition("pending", "completed"), false);
});

test("Terminal states (completed, cancelled) cannot be transitioned", () => {
  assert.equal(validateTransition("completed", "pending"), false);
  assert.equal(validateTransition("cancelled", "confirmed"), false);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n===============================================================`);
console.log(`  Tests Passed: ${passed} | Tests Failed: ${failed}`);
console.log(`===============================================================\n`);

if (failed > 0) {
  process.exit(1);
}
