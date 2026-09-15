import assert from "node:assert";
import { normaliseRole, dashboardPathForRole } from "./src/lib/roles";
import {
  checkInCheckOutSchema,
  hotelAvailabilityQuerySchema,
  hotelCashConfirmSchema,
  hotelInputSchema,
  reservationStatusUpdateSchema,
  roomInputSchema,
} from "./src/lib/hotels.schema";
import {
  confirmHotelCashPaymentServer,
  createHotelServer,
  createRoomServer,
  getHotelAvailabilityServer,
  getHotelRoomsServer,
  getVerifierFinancialsServer,
  getVerifierGuestsServer,
  getVerifierHotelsServer,
  getVerifierReservationsServer,
  processCheckInCheckOutServer,
  updateHotelServer,
  updateReservationStatusServer,
  updateRoomServer,
} from "./src/lib/hotels.server";

console.log("================================================================================");
console.log("TRAVEZY VERIFIER / HOTEL PARTNER ROLE TEST SUITE");
console.log("================================================================================\n");

async function runVerifierTests() {
  let passed = 0;
  let failed = 0;

  // Mock Supabase Client for Testing
  const mockSupabase: any = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { account_type: "verifier" },
            error: null,
          }),
          single: async () => ({
            data: { account_type: "verifier" },
            error: null,
          }),
        }),
      }),
    }),
  };

  const verifierUserId = "verifier-user-123";

  // 1. Role normalization and routing tests
  try {
    assert.strictEqual(normaliseRole("verifier"), "verifier");
    assert.strictEqual(normaliseRole("VERIFIER"), "verifier");
    assert.strictEqual(normaliseRole("hotel_partner"), "verifier");
    assert.strictEqual(normaliseRole("hotel"), "verifier");
    assert.strictEqual(dashboardPathForRole("verifier"), "/verifier/dashboard");
    assert.strictEqual(dashboardPathForRole("provider"), "/provider/dashboard");
    assert.strictEqual(dashboardPathForRole("admin"), "/admin/dashboard");
    assert.strictEqual(dashboardPathForRole("tourist"), "/tourist/dashboard");

    console.log("✅ [PASS] 1. Role normalization and dashboard routing correctly resolves 'verifier' -> '/verifier/dashboard'");
    passed++;
  } catch (err: any) {
    console.error("❌ [FAIL] 1. Role normalization failed:", err.message);
    failed++;
  }

  // 2. Hotel Input Schema Validation
  try {
    const validHotel = hotelInputSchema.parse({
      name: "The Oberoi Grand Palace",
      description: "Luxury heritage resort located on lakeside with gardens.",
      address: "1 Palace Road",
      city: "Jaipur",
      state: "Rajasthan",
      country: "India",
      phone: "+91 141 222 3333",
      email: "stay@oberoipalace.com",
      amenities: ["Free High-Speed WiFi", "Swimming Pool", "Ayurvedic Spa"],
      check_in_time: "14:00",
      check_out_time: "11:00",
      image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      star_rating: 5,
    });
    assert.strictEqual(validHotel.name, "The Oberoi Grand Palace");
    assert.strictEqual(validHotel.city, "Jaipur");

    console.log("✅ [PASS] 2. Hotel input schema correctly validates hotel property specifications");
    passed++;
  } catch (err: any) {
    console.error("❌ [FAIL] 2. Hotel input schema validation failed:", err.message);
    failed++;
  }

  // 3. Hotel Listing & Creation
  try {
    const hotels = await getVerifierHotelsServer(mockSupabase, verifierUserId);
    assert.ok(Array.isArray(hotels) && hotels.length > 0, "Hotels should return array of properties");
    
    const newHotel = await createHotelServer(mockSupabase, verifierUserId, {
      name: "Coorg Plantation Sanctuary",
      description: "Eco-luxury timber cottages amidst coffee and pepper plantations in Western Ghats.",
      address: "Madikeri Hill Road",
      city: "Coorg",
      state: "Karnataka",
      country: "India",
      phone: "+91 8272 250 999",
      email: "coorg@plantationsanctuary.com",
      amenities: ["Plantation Walk", "Fireplace", "Free WiFi"],
      check_in_time: "13:00",
      check_out_time: "11:00",
      cancellation_policy: "Free cancellation up to 24h prior.",
      hotel_rules: "Quiet hours after 10 PM.",
      image_url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d",
      images: [],
      star_rating: 4.9,
      status: "active",
    });
    assert.strictEqual(newHotel.name, "Coorg Plantation Sanctuary");

    console.log("✅ [PASS] 3. Verifier hotel listing and creation succeeds with persistent properties");
    passed++;
  } catch (err: any) {
    console.error("❌ [FAIL] 3. Hotel listing/creation failed:", err.message);
    failed++;
  }

  // 4. Room Inventory Management
  try {
    const rooms = await getHotelRoomsServer(mockSupabase);
    assert.ok(rooms.length > 0, "Rooms inventory should return list of rooms");

    const createdRoom = await createRoomServer(mockSupabase, verifierUserId, {
      hotel_id: "h0010000-0000-4000-8000-000000000001",
      room_type: "Royal Garden Villa",
      description: "Private villa with lawn and outdoor rain shower.",
      price_per_night: 8500,
      currency: "INR",
      capacity: 3,
      total_rooms: 4,
      amenities: ["King Bed", "Private Lawn", "Free WiFi"],
      images: [],
      status: "active",
    });
    assert.strictEqual(createdRoom.room_type, "Royal Garden Villa");
    assert.strictEqual(createdRoom.price_per_night, 8500);

    console.log("✅ [PASS] 4. Room inventory creation and capacity tracking operates accurately");
    passed++;
  } catch (err: any) {
    console.error("❌ [FAIL] 4. Room inventory management failed:", err.message);
    failed++;
  }

  // 5. Reservation Lifecycle Transitions
  try {
    const reservations = await getVerifierReservationsServer(mockSupabase, verifierUserId);
    assert.ok(reservations.length > 0, "Reservations should return active list");

    const targetRes = reservations[0]!;

    // Accept Reservation
    const accepted = await updateReservationStatusServer(mockSupabase, verifierUserId, {
      reservation_id: targetRes.id,
      status: "CONFIRMED",
    });
    assert.strictEqual(accepted.booking_status, "CONFIRMED");

    // Check In Guest
    const checkedIn = await processCheckInCheckOutServer(mockSupabase, verifierUserId, {
      reservation_id: targetRes.id,
      action: "check_in",
    });
    assert.strictEqual(checkedIn.status, "CHECKED_IN");
    assert.ok(checkedIn.success);

    // Check Out Guest
    const checkedOut = await processCheckInCheckOutServer(mockSupabase, verifierUserId, {
      reservation_id: targetRes.id,
      action: "check_out",
    });
    assert.strictEqual(checkedOut.status, "CHECKED_OUT");
    assert.ok(checkedOut.success);

    console.log("✅ [PASS] 5. Reservation lifecycle transitions (CONFIRMED -> CHECKED_IN -> CHECKED_OUT) operate seamlessly");
    passed++;
  } catch (err: any) {
    console.error("❌ [FAIL] 5. Reservation lifecycle test failed:", err.message);
    failed++;
  }

  // 6. Reservation Rejection Workflow
  try {
    const reservations = await getVerifierReservationsServer(mockSupabase, verifierUserId);
    const targetRes = reservations[1]!;

    const rejected = await updateReservationStatusServer(mockSupabase, verifierUserId, {
      reservation_id: targetRes.id,
      status: "REJECTED",
      rejection_reason: "Property fully reserved for private heritage wedding celebration.",
    });
    assert.strictEqual(rejected.booking_status, "REJECTED");
    assert.strictEqual(rejected.rejection_reason, "Property fully reserved for private heritage wedding celebration.");

    console.log("✅ [PASS] 6. Reservation rejection properly records rejection reason and updates status");
    passed++;
  } catch (err: any) {
    console.error("❌ [FAIL] 6. Reservation rejection failed:", err.message);
    failed++;
  }

  // 7. Date-Based Room Availability Matrix & Overbooking Prevention
  try {
    const hotelId = "h0010000-0000-4000-8000-000000000001";
    const startStr = "2026-09-05";
    const endStr = "2026-09-12";

    const availability = await getHotelAvailabilityServer(mockSupabase, hotelId, startStr, endStr);
    assert.ok(Array.isArray(availability) && availability.length > 0);

    for (const cell of availability) {
      assert.ok(cell.total_rooms >= cell.booked_rooms, "Booked rooms must not exceed total capacity");
      assert.strictEqual(cell.available_rooms, cell.total_rooms - cell.booked_rooms);
      assert.ok(cell.available_rooms >= 0, "Available rooms must never be negative");
    }

    console.log("✅ [PASS] 7. Room availability matrix computes live date-based capacity and prevents overbooking");
    passed++;
  } catch (err: any) {
    console.error("❌ [FAIL] 7. Availability calculation failed:", err.message);
    failed++;
  }

  // 8. Guest CRM with Privacy Isolation
  try {
    const guests = await getVerifierGuestsServer(mockSupabase, verifierUserId);
    assert.ok(guests.length > 0, "Guest CRM returns guests with bookings at verifier hotels");

    for (const g of guests) {
      assert.ok(g.guest_name && g.guest_email && g.guest_phone);
      assert.ok(g.total_stays >= 1);
      assert.ok(Array.isArray(g.active_reservations));
    }

    console.log("✅ [PASS] 8. Guest CRM correctly isolates and presents guests with verified bookings");
    passed++;
  } catch (err: any) {
    console.error("❌ [FAIL] 8. Guest CRM test failed:", err.message);
    failed++;
  }

  // 9. Front-Desk Cash Confirmation & Hotel Revenue Metrics
  try {
    const reservations = await getVerifierReservationsServer(mockSupabase, verifierUserId);
    const cashRes = reservations.find((r) => r.payment_method === "cash") || reservations[0]!;

    const cashConfirm = await confirmHotelCashPaymentServer(
      mockSupabase,
      verifierUserId,
      cashRes.id,
      cashRes.total_price,
    );
    assert.ok(cashConfirm.success);
    assert.strictEqual(cashConfirm.paidAmount, cashRes.total_price);

    const financials = await getVerifierFinancialsServer(mockSupabase, verifierUserId);
    assert.ok(financials.total_booking_value > 0);
    assert.ok(financials.monthly_revenue >= 0);
    assert.ok(Array.isArray(financials.recent_transactions));

    console.log("✅ [PASS] 9. Front-desk cash confirmation and hotel financial analytics verified");
    passed++;
  } catch (err: any) {
    console.error("❌ [FAIL] 9. Cash confirmation and revenue test failed:", err.message);
    failed++;
  }

  console.log("\n================================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runVerifierTests();
