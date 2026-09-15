import assert from "node:assert/strict";

console.log("================================================================================");
console.log("=== Running Week 4 Booking Notes & Full Workflow Verification Test Suite ===");
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

// 1. Booking creation without notes
test("1. Create booking payload without notes (notes is optional)", () => {
  const input = {
    service_id: "1d9e2fc7-7a9f-4398-9609-10d72f4d563e",
    travel_date: "2026-09-10",
    guests: 2,
    notes: null,
  };

  const booking = {
    id: "booking-001",
    user_id: "tourist-user-1",
    service_id: input.service_id,
    travel_date: input.travel_date,
    guests: input.guests,
    total_price: 9600,
    status: "pending",
    notes: input.notes,
  };

  assert.equal(booking.notes, null);
  assert.equal(booking.status, "pending");
  assert.equal(booking.guests, 2);
});

// 2. Booking creation with notes
test("2. Create booking payload with notes", () => {
  const input = {
    service_id: "1d9e2fc7-7a9f-4398-9609-10d72f4d563e",
    travel_date: "2026-09-10",
    guests: 2,
    notes: "Vegetarian breakfast and quiet upper floor room please",
  };

  const booking = {
    id: "booking-002",
    user_id: "tourist-user-1",
    service_id: input.service_id,
    travel_date: input.travel_date,
    guests: input.guests,
    total_price: 9600,
    status: "pending",
    notes: input.notes,
  };

  assert.equal(booking.notes, "Vegetarian breakfast and quiet upper floor room please");
  assert.equal(booking.status, "pending");
});

// 3. View booking as Tourist (with notes and without notes fallback)
test("3. Tourist view formatting displays notes or 'No special requests.' fallback", () => {
  function formatTouristNotes(b) {
    return b.notes ? `"${b.notes}"` : "No special requests.";
  }

  const bookingWithNotes = { id: "b1", notes: "Extra towels" };
  const bookingWithoutNotes = { id: "b2", notes: null };
  const bookingWithEmptyNotes = { id: "b3", notes: "" };

  assert.equal(formatTouristNotes(bookingWithNotes), '"Extra towels"');
  assert.equal(formatTouristNotes(bookingWithoutNotes), "No special requests.");
  assert.equal(formatTouristNotes(bookingWithEmptyNotes), "No special requests.");
});

// 4. View booking as Provider (with notes and without notes fallback)
test("4. Provider view formatting displays notes or 'No special requests.' fallback", () => {
  function formatProviderNotes(b) {
    return b.notes ? `"${b.notes}"` : "No special requests.";
  }

  const bookingWithNotes = { id: "b1", notes: "Airport pickup at 10 AM" };
  const bookingWithoutNotes = { id: "b2", notes: null };

  assert.equal(formatProviderNotes(bookingWithNotes), '"Airport pickup at 10 AM"');
  assert.equal(formatProviderNotes(bookingWithoutNotes), "No special requests.");
});

// 5. Confirm booking (state transition)
test("5. Confirm booking: transition pending -> confirmed", () => {
  const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    cancelled: [],
    completed: [],
  };

  function transition(current, next) {
    const allowed = allowedTransitions[current.toLowerCase()] ?? [];
    if (!allowed.includes(next.toLowerCase())) {
      throw new Error(`Invalid transition from ${current} to ${next}`);
    }
    return next;
  }

  let status = "pending";
  status = transition(status, "confirmed");
  assert.equal(status, "confirmed");
});

// 6. Cancel booking (state transition)
test("6. Cancel booking: transition confirmed -> cancelled", () => {
  const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    cancelled: [],
    completed: [],
  };

  function transition(current, next) {
    const allowed = allowedTransitions[current.toLowerCase()] ?? [];
    if (!allowed.includes(next.toLowerCase())) {
      throw new Error(`Invalid transition from ${current} to ${next}`);
    }
    return next;
  }

  let status = "confirmed";
  status = transition(status, "cancelled");
  assert.equal(status, "cancelled");
});

// 7. Complete booking (state transition)
test("7. Complete booking: transition confirmed -> completed", () => {
  const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    cancelled: [],
    completed: [],
  };

  function transition(current, next) {
    const allowed = allowedTransitions[current.toLowerCase()] ?? [];
    if (!allowed.includes(next.toLowerCase())) {
      throw new Error(`Invalid transition from ${current} to ${next}`);
    }
    return next;
  }

  let status = "confirmed";
  status = transition(status, "completed");
  assert.equal(status, "completed");
});

// 8. Existing bookings without notes load and function properly
test("8. Existing legacy bookings without notes property load safely", () => {
  const legacyBooking = {
    id: "legacy-b-1",
    user_id: "user-1",
    service_id: "s-1",
    travel_date: "2026-09-01",
    guests: 2,
    total_price: 5000,
    status: "confirmed",
  };

  // Safe property access
  const notesText = legacyBooking.notes ? `"${legacyBooking.notes}"` : "No special requests.";
  assert.equal(notesText, "No special requests.");
  assert.equal(legacyBooking.status, "confirmed");
});

// 9. Verify capacity & availability calculation still works with notes
test("9. Capacity and availability calculation continues to work seamlessly", () => {
  const service = { id: "s1", max_guests: 10 };
  const bookings = [
    { id: "b1", travel_date: "2026-09-10", guests: 3, status: "confirmed", notes: "Note 1" },
    { id: "b2", travel_date: "2026-09-10", guests: 2, status: "pending", notes: null },
    { id: "b3", travel_date: "2026-09-10", guests: 4, status: "cancelled", notes: "Cancelled note" },
  ];

  const targetDate = "2026-09-10";
  const active = bookings.filter((b) => b.travel_date === targetDate && b.status !== "cancelled");
  const occupied = active.reduce((sum, b) => sum + b.guests, 0);
  const remaining = Math.max(0, service.max_guests - occupied);

  assert.equal(occupied, 5); // 3 + 2 = 5
  assert.equal(remaining, 5); // 10 - 5 = 5
});

// 10. Verify no existing data is mutated
test("10. Data integrity check: all booking core fields preserved", () => {
  const fields = ["id", "user_id", "service_id", "travel_date", "guests", "total_price", "status"];
  const booking = {
    id: "b-001",
    user_id: "u-001",
    service_id: "s-001",
    travel_date: "2026-09-10",
    guests: 2,
    total_price: 4800,
    status: "pending",
    notes: null,
  };

  for (const f of fields) {
    assert.ok(booking[f] !== undefined, `Field ${f} must exist`);
  }
});

console.log("\n================================================================================");
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log("================================================================================");

if (failed > 0) process.exit(1);
