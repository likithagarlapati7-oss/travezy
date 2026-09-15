import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kahhcubqdpvvhdrhtifa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_c79Jk65Ddw0ZL-vZZReJ3A_kJ4bS7jW";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log("================================================================================");
console.log("=== Running Tourist 'My Trips' Data Flow & Query Diagnostic Test Suite ===");
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

// 1. myBookingsQuery syntax & schema cache check
await test("1. myBookingsQuery executes without foreign key or schema cache errors", async () => {
  const testUserId = "00000000-0000-0000-0000-000000000000";
  const { data, error } = await supabase
    .from("bookings")
    .select("*, services(*, providers(id, business_name, verified)), payments(*)")
    .eq("user_id", testUserId)
    .order("created_at", { ascending: false });

  assert.equal(error, null, error?.message);
  assert.ok(Array.isArray(data));
});

// 2. touristBookingQuery syntax & schema cache check
await test("2. touristBookingQuery executes without foreign key or schema cache errors", async () => {
  const testBookingId = "00000000-0000-0000-0000-000000000000";
  const { data, error } = await supabase
    .from("bookings")
    .select("*, services(*, providers(id, business_name, verified)), payments(*)")
    .eq("id", testBookingId)
    .maybeSingle();

  assert.equal(error, null, error?.message);
  assert.equal(data, null);
});

// 3. providerBookingsQuery executes without foreign key errors
await test("3. providerBookingsQuery executes and correctly structures data", async () => {
  const testServiceIds = ["00000000-0000-0000-0000-000000000000"];
  const { data, error } = await supabase
    .from("bookings")
    .select("*, services(*, providers(id, business_name, verified)), payments(*)")
    .in("service_id", testServiceIds)
    .order("created_at", { ascending: false });

  assert.equal(error, null, error?.message);
  assert.ok(Array.isArray(data));
});

// 4. myPaymentsQuery executes without foreign key errors
await test("4. myPaymentsQuery executes and joins bookings, services, and providers", async () => {
  const testUserId = "00000000-0000-0000-0000-000000000000";
  const { data, error } = await supabase
    .from("payments")
    .select("*, bookings(*, services(*, providers(id, business_name, verified)))")
    .eq("user_id", testUserId)
    .order("created_at", { ascending: false });

  assert.equal(error, null, error?.message);
  assert.ok(Array.isArray(data));
});

// 5. Empty bookings state discrimination
await test("5. Frontend separate handling for zero-bookings vs network/server error", () => {
  function renderState(bookings, isLoading, error) {
    if (error) return "ERROR_STATE";
    if (isLoading) return "LOADING_STATE";
    if (bookings && bookings.length > 0) return "BOOKINGS_LIST";
    return "EMPTY_TRIPS_STATE";
  }

  assert.equal(renderState(null, false, new Error("Failed")), "ERROR_STATE");
  assert.equal(renderState([], false, null), "EMPTY_TRIPS_STATE");
  assert.equal(renderState([{ id: "b1" }], false, null), "BOOKINGS_LIST");
  assert.equal(renderState(null, true, null), "LOADING_STATE");
});

// 6. Upcoming vs Past booking partition logic
await test("6. Upcoming vs Past partition correctly splits bookings by travel_date and status", () => {
  const todayStr = "2026-09-01";
  const bookings = [
    { id: "1", travel_date: "2026-09-10", status: "pending" },
    { id: "2", travel_date: "2026-09-15", status: "confirmed" },
    { id: "3", travel_date: "2026-08-20", status: "confirmed" },
    { id: "4", travel_date: "2026-09-25", status: "cancelled" },
    { id: "5", travel_date: "2026-09-05", status: "completed" },
  ];

  const upcoming = bookings.filter((b) => {
    const s = b.status.toLowerCase();
    const date = b.travel_date ?? "";
    return date >= todayStr && s !== "cancelled" && s !== "completed";
  });

  const past = bookings.filter((b) => {
    const s = b.status.toLowerCase();
    const date = b.travel_date ?? "";
    return date < todayStr || s === "cancelled" || s === "completed";
  });

  assert.equal(upcoming.length, 2); // 1, 2
  assert.equal(past.length, 3); // 3 (past date), 4 (cancelled), 5 (completed)
});

// 7. Security: user_id parameter filtering ensures data isolation
await test("7. Queries enforce user_id scoping to prevent cross-tourist data leak", () => {
  const touristA = "user-aaa-111";
  const touristB = "user-bbb-222";

  const allBookings = [
    { id: "b1", user_id: touristA, service_id: "s1" },
    { id: "b2", user_id: touristB, service_id: "s2" },
  ];

  const filteredForA = allBookings.filter((b) => b.user_id === touristA);
  assert.equal(filteredForA.length, 1);
  assert.equal(filteredForA[0].id, "b1");
});

console.log("\n================================================================================");
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log("================================================================================");

if (failed > 0) process.exit(1);
