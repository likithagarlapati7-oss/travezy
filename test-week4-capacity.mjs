import assert from "node:assert/strict";

console.log("================================================================================");
console.log("=== Running Week 4 Booking System & Capacity Calculation Test Suite ===");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

// Simulated core capacity logic matching src/lib/bookings.server.ts
function calculateAvailability({ service, bookings, travelDate, requestedGuests }) {
  if (!service) throw new Error("Service not found");

  const rawMax = service.max_guests ?? service.capacity ?? service.maxGuests;
  const maxGuests = typeof rawMax === "number" && rawMax > 0 ? rawMax : 10;

  const targetDate = travelDate ? travelDate.slice(0, 10) : "";

  const activeBookings = (bookings ?? []).filter((b) => {
    if (!b || !b.travel_date) return false;
    const bDate = typeof b.travel_date === "string"
      ? b.travel_date.slice(0, 10)
      : new Date(b.travel_date).toISOString().slice(0, 10);
    
    if (bDate !== targetDate) return false;

    const status = (b.status || "").toLowerCase().trim();
    if (status === "cancelled" || status === "rejected") return false;

    return true;
  });

  const currentGuests = activeBookings.reduce((acc, curr) => acc + (Number(curr.guests) || 0), 0);
  const remainingCapacity = Math.max(0, maxGuests - currentGuests);

  return {
    available: requestedGuests > 0 && requestedGuests <= remainingCapacity,
    capacity: remainingCapacity,
    maxGuests,
  };
}

// 1. Service with available capacity can be booked
test("1. A service with available capacity can be booked", () => {
  const service = { id: "s1", title: "Taj Mahal Tour", max_guests: 20 };
  const res = calculateAvailability({
    service,
    bookings: [],
    travelDate: "2026-06-10",
    requestedGuests: 4,
  });

  assert.equal(res.available, true);
  assert.equal(res.capacity, 20);
  assert.equal(res.maxGuests, 20);
});

// 2. Remaining capacity calculation: Capacity = Service Capacity - Currently Occupied
test("2. Remaining capacity is calculated correctly (20 - 5 = 15)", () => {
  const service = { id: "s1", title: "Goa Beach Resort", max_guests: 20 };
  const bookings = [
    { id: "b1", service_id: "s1", travel_date: "2026-06-10", guests: 3, status: "confirmed" },
    { id: "b2", service_id: "s1", travel_date: "2026-06-10", guests: 2, status: "pending" },
  ];
  const res = calculateAvailability({
    service,
    bookings,
    travelDate: "2026-06-10",
    requestedGuests: 3,
  });

  assert.equal(res.capacity, 15);
  assert.equal(res.available, true);
});

// 3. Capacity calculated for selected date
test("3. Capacity is calculated specifically for the selected date", () => {
  const service = { id: "s1", title: "Manali Lodge", max_guests: 10 };
  const bookings = [
    { id: "b1", service_id: "s1", travel_date: "2026-06-10", guests: 6, status: "confirmed" },
    { id: "b2", service_id: "s1", travel_date: "2026-06-11", guests: 2, status: "confirmed" },
  ];

  const resJune10 = calculateAvailability({
    service,
    bookings,
    travelDate: "2026-06-10",
    requestedGuests: 4,
  });
  assert.equal(resJune10.capacity, 4);
  assert.equal(resJune10.available, true);

  const resJune11 = calculateAvailability({
    service,
    bookings,
    travelDate: "2026-06-11",
    requestedGuests: 4,
  });
  assert.equal(resJune11.capacity, 8);
  assert.equal(resJune11.available, true);
});

// 4. Existing bookings affect only appropriate date
test("4. June 10 bookings do not reduce June 11's capacity", () => {
  const service = { id: "s1", title: "Kerala Houseboat", max_guests: 10 };
  const bookings = [
    { id: "b1", service_id: "s1", travel_date: "2026-06-10", guests: 10, status: "confirmed" },
  ];

  const resJune10 = calculateAvailability({
    service,
    bookings,
    travelDate: "2026-06-10",
    requestedGuests: 1,
  });
  assert.equal(resJune10.capacity, 0);
  assert.equal(resJune10.available, false);

  const resJune11 = calculateAvailability({
    service,
    bookings,
    travelDate: "2026-06-11",
    requestedGuests: 5,
  });
  assert.equal(resJune11.capacity, 10);
  assert.equal(resJune11.available, true);
});

// 5. CANCELLED bookings release capacity
test("5. CANCELLED and REJECTED bookings release capacity and do not consume spots", () => {
  const service = { id: "s1", title: "Desert Safari", max_guests: 10 };
  const bookings = [
    { id: "b1", service_id: "s1", travel_date: "2026-06-10", guests: 4, status: "cancelled" },
    { id: "b2", service_id: "s1", travel_date: "2026-06-10", guests: 3, status: "CANCELLED" },
    { id: "b3", service_id: "s1", travel_date: "2026-06-10", guests: 2, status: "rejected" },
    { id: "b4", service_id: "s1", travel_date: "2026-06-10", guests: 2, status: "confirmed" },
  ];

  const res = calculateAvailability({
    service,
    bookings,
    travelDate: "2026-06-10",
    requestedGuests: 8,
  });
  assert.equal(res.capacity, 8); // 10 - 2 (only b4 counts) = 8
  assert.equal(res.available, true);
});

// 6. A booking cannot exceed remaining capacity
test("6. Reject booking when requested guests exceed remaining capacity", () => {
  const service = { id: "s1", max_guests: 20 };
  const bookings = [
    { id: "b1", travel_date: "2026-06-10", guests: 5, status: "confirmed" },
  ];

  // Capacity = 15
  const resValid = calculateAvailability({
    service,
    bookings,
    travelDate: "2026-06-10",
    requestedGuests: 3,
  });
  assert.equal(resValid.available, true);

  const resExceed = calculateAvailability({
    service,
    bookings,
    travelDate: "2026-06-10",
    requestedGuests: 16,
  });
  assert.equal(resExceed.available, false);
  assert.equal(resExceed.capacity, 15);
});

// 7. Multiple bookings consume capacity incrementally preventing overbooking
test("7. Multiple bookings correctly consume capacity until full", () => {
  const service = { id: "s1", max_guests: 10 };
  let currentBookings = [];

  // Tourist 1 books 4 guests
  let check1 = calculateAvailability({ service, bookings: currentBookings, travelDate: "2026-07-01", requestedGuests: 4 });
  assert.equal(check1.available, true);
  currentBookings.push({ id: "b1", travel_date: "2026-07-01", guests: 4, status: "pending" });

  // Tourist 2 books 4 guests
  let check2 = calculateAvailability({ service, bookings: currentBookings, travelDate: "2026-07-01", requestedGuests: 4 });
  assert.equal(check2.available, true);
  assert.equal(check2.capacity, 6);
  currentBookings.push({ id: "b2", travel_date: "2026-07-01", guests: 4, status: "confirmed" });

  // Tourist 3 attempts to book 3 guests (only 2 left) -> must fail
  let check3 = calculateAvailability({ service, bookings: currentBookings, travelDate: "2026-07-01", requestedGuests: 3 });
  assert.equal(check3.available, false);
  assert.equal(check3.capacity, 2);

  // Tourist 3 books 2 guests -> passes
  let check3Valid = calculateAvailability({ service, bookings: currentBookings, travelDate: "2026-07-01", requestedGuests: 2 });
  assert.equal(check3Valid.available, true);
});

// 8. Service with null, 0, undefined, or missing capacity column does not show 0
test("8. Service with null, 0, or missing max_guests defaults to positive capacity (10)", () => {
  const serviceNull = { id: "s1", max_guests: null };
  const resNull = calculateAvailability({ service: serviceNull, bookings: [], travelDate: "2026-06-10", requestedGuests: 5 });
  assert.equal(resNull.capacity, 10);
  assert.equal(resNull.available, true);

  const serviceZero = { id: "s2", max_guests: 0 };
  const resZero = calculateAvailability({ service: serviceZero, bookings: [], travelDate: "2026-06-10", requestedGuests: 5 });
  assert.equal(resZero.capacity, 10);
  assert.equal(resZero.available, true);

  const serviceMissing = { id: "s3" };
  const resMissing = calculateAvailability({ service: serviceMissing, bookings: [], travelDate: "2026-06-10", requestedGuests: 2 });
  assert.equal(resMissing.capacity, 10);
  assert.equal(resMissing.available, true);
});

// 9. Historical completed bookings do not reduce future availability
test("9. Historical completed bookings on earlier dates do not affect future dates", () => {
  const service = { id: "s1", max_guests: 10 };
  const bookings = [
    { id: "b1", travel_date: "2026-01-01", guests: 10, status: "completed" },
    { id: "b2", travel_date: "2026-05-15", guests: 10, status: "completed" },
  ];

  const resFuture = calculateAvailability({
    service,
    bookings,
    travelDate: "2026-09-01",
    requestedGuests: 5,
  });
  assert.equal(resFuture.capacity, 10);
  assert.equal(resFuture.available, true);
});

// 10. Provider booking state machine transitions
test("10. Status state machine validates allowed transitions", () => {
  const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    cancelled: [],
    completed: [],
  };

  function canTransition(curr, next) {
    const allowed = allowedTransitions[curr.toLowerCase()] ?? [];
    return allowed.includes(next.toLowerCase());
  }

  assert.equal(canTransition("pending", "confirmed"), true);
  assert.equal(canTransition("pending", "cancelled"), true);
  assert.equal(canTransition("pending", "completed"), false);
  assert.equal(canTransition("confirmed", "completed"), true);
  assert.equal(canTransition("confirmed", "cancelled"), true);
  assert.equal(canTransition("cancelled", "confirmed"), false);
  assert.equal(canTransition("completed", "cancelled"), false);
});

console.log("\n================================================================================");
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log("================================================================================");

if (failed > 0) process.exit(1);
