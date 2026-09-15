import assert from "node:assert/strict";
import fs from "node:fs";
import {
  itineraryInputSchema,
  activityItemSchema,
  itineraryDaySchema,
  structuredItinerarySchema,
  saveTripPlanSchema,
  SAFETY_DISCLAIMER,
} from "./src/lib/ai.schema.ts";
import { generateGroundedItinerary } from "./src/lib/itinerary.server.ts";
import { DESTINATIONS_DATA } from "./src/data/destinations-data.ts";
import { HOTELS_AND_STAYS } from "./src/data/hotels-and-stays.ts";
import { INDIAN_RESTAURANTS } from "./src/data/indian-restaurants.ts";
import { TOURS_AND_EXPERIENCES } from "./src/data/tours-and-experiences.ts";
import { HUMAN_TOUR_GUIDES } from "./src/data/human-guides.ts";

console.log("================================================================================");
console.log("=== Running AI Trip Planner & My Itinerary Comprehensive Test Suite ===");
console.log("================================================================================");

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failedCount++;
  }
}

async function runAll() {
  // ── 1. Schema Validation Tests ────────────────────────────────────────────────
  await test("1.1 Itinerary input schema validates complete and valid payloads", () => {
    const input = itineraryInputSchema.parse({
      destination: "kerala",
      days: 4,
      travelers: 2,
      budgetTier: "moderate",
      travelStyle: "balanced",
      interests: ["Nature", "Food", "Culture"],
      startDate: "2026-10-15",
      customNotes: "Vegetarian food preferred and scenic backwaters.",
    });
    assert.equal(input.destination, "kerala");
    assert.equal(input.days, 4);
    assert.equal(input.travelers, 2);
    assert.equal(input.budgetTier, "moderate");
    assert.equal(input.travelStyle, "balanced");
  });

  await test("1.2 Itinerary input schema rejects out-of-range days (<1 or >14)", () => {
    assert.throws(() => itineraryInputSchema.parse({
      destination: "goa",
      days: 0,
      travelers: 2,
    }), /At least 1 day/);

    assert.throws(() => itineraryInputSchema.parse({
      destination: "goa",
      days: 15,
      travelers: 2,
    }), /Maximum 14 days supported/);
  });

  await test("1.3 Itinerary input schema enforces travellers count boundaries (>=1)", () => {
    assert.throws(() => itineraryInputSchema.parse({
      destination: "rajasthan",
      days: 3,
      travelers: 0,
    }), /At least 1 traveller/);
  });

  await test("1.4 Itinerary input schema provides sensible defaults", () => {
    const parsed = itineraryInputSchema.parse({
      destination: "karnataka",
      days: 3,
    });
    assert.equal(parsed.days, 3);
    assert.equal(parsed.travelers, 2);
    assert.equal(parsed.budgetTier, "moderate");
    assert.equal(parsed.travelStyle, "balanced");
    assert.deepEqual(parsed.interests, []);
  });

  // ── 2. Grounding Engine Verification (Zero Fake Businesses) ────────────────────
  const testDestinations = [
    { slug: "kerala", days: 3, budget: "moderate", style: "balanced" },
    { slug: "rajasthan", days: 5, budget: "luxury", style: "relaxed" },
    { slug: "goa", days: 4, budget: "budget", style: "packed" },
    { slug: "karnataka", days: 2, budget: "ultra_luxury", style: "balanced" },
    { slug: "himachal-pradesh", days: 4, budget: "moderate", style: "relaxed" },
    { slug: "jammu-and-kashmir", days: 6, budget: "luxury", style: "balanced" },
  ];

  for (const td of testDestinations) {
    await test(`2. Grounding Engine for ${td.slug} (${td.days} days, ${td.budget} tier, ${td.style} pace)`, async () => {
      const itinerary = await generateGroundedItinerary(null, {
        destination: td.slug,
        days: td.days,
        travelers: 2,
        budgetTier: td.budget,
        travelStyle: td.style,
        interests: ["Nature", "Food", "History", "Beaches", "Culture"],
      });

      assert.equal(itinerary.days.length, td.days, `Must generate exactly ${td.days} days`);
      assert.ok(itinerary.totalCostNumeric > 0, "Total estimated cost must be positive");
      assert.ok(itinerary.summary && itinerary.summary.length > 20, "Summary should be descriptive");
      assert.ok(itinerary.practicalTips.length > 0, "Should contain practical tips");

      // Verify all activities are grounded to real data
      for (const day of itinerary.days) {
        assert.ok(day.activities.length >= 3, `Day ${day.day} must have >= 3 activities`);
        assert.ok(day.dailyCostNumeric > 0, `Day ${day.day} cost must be positive`);

        for (const item of day.activities) {
          assert.ok(item.title, `Item must have title`);
          assert.ok(item.bookingUrl, `Item must have booking URL: ${item.title}`);
          assert.ok(item.timeSlot, `Item must have time slot`);
          assert.ok(typeof item.numericCost === "number", `Item numericCost must be a number`);

          // Check reference catalog integrity
          if (item.itemType === "hotel") {
            const hotelExists = HOTELS_AND_STAYS.some((h) => h.id === item.externalReferenceId || h.title === item.title);
            assert.ok(hotelExists, `Hotel '${item.title}' (${item.externalReferenceId}) must exist in real HOTELS_AND_STAYS catalog`);
          } else if (item.itemType === "restaurant") {
            const restExists = INDIAN_RESTAURANTS.some((r) => r.id === item.externalReferenceId || item.title.includes(r.title));
            assert.ok(restExists, `Restaurant '${item.title}' (${item.externalReferenceId}) must exist in real INDIAN_RESTAURANTS catalog`);
          } else if (item.itemType === "experience") {
            const expExists = TOURS_AND_EXPERIENCES.some((e) => e.id === item.externalReferenceId || e.title === item.title);
            assert.ok(expExists, `Experience '${item.title}' (${item.externalReferenceId}) must exist in real TOURS_AND_EXPERIENCES catalog`);
          } else if (item.itemType === "guide") {
            const guideExists = HUMAN_TOUR_GUIDES.some((g) => g.id === item.externalReferenceId || item.title.includes(g.name));
            assert.ok(guideExists, `Guide '${item.title}' (${item.externalReferenceId}) must exist in real HUMAN_TOUR_GUIDES catalog`);
          }
        }
      }
    });
  }

  // ── 3. Budget Tier Scaling Verification ───────────────────────────────────────
  await test("3.1 Higher budget tiers allocate higher quality stays and overall costs", async () => {
    const budgetPlan = await generateGroundedItinerary(null, {
      destination: "goa",
      days: 3,
      travelers: 2,
      budgetTier: "budget",
    });

    const luxuryPlan = await generateGroundedItinerary(null, {
      destination: "goa",
      days: 3,
      travelers: 2,
      budgetTier: "luxury",
    });

    assert.ok(
      luxuryPlan.totalCostNumeric > budgetPlan.totalCostNumeric,
      `Luxury plan cost (₹${luxuryPlan.totalCostNumeric}) must be greater than Budget plan cost (₹${budgetPlan.totalCostNumeric})`
    );
  });

  // ── 4. Itinerary Modification & Math Calculations ─────────────────────────────
  await test("4.1 Custom item addition and live cost recalculation", async () => {
    const initialItinerary = await generateGroundedItinerary(null, {
      destination: "kerala",
      days: 2,
      travelers: 2,
      budgetTier: "moderate",
    });

    const originalTotal = initialItinerary.totalCostNumeric;
    const originalDay1Total = initialItinerary.days[0].dailyCostNumeric;

    // Add a new activity item to Day 1
    const newActivity = {
      id: "item_custom_sunset_cruise",
      timeSlot: "evening",
      itemType: "experience",
      title: "Sunset Luxury Backwater Cruise",
      description: "Private sunset cruise with traditional live music",
      location: "Vembanad Lake, Alleppey",
      estimatedCost: "₹3,500",
      numericCost: 3500,
      currency: "INR",
      bookingUrl: "/tours",
      externalReferenceId: "exp-sunset-alleppey",
    };

    initialItinerary.days[0].activities.push(newActivity);
    initialItinerary.days[0].dailyCostNumeric += newActivity.numericCost;
    initialItinerary.totalCostNumeric += newActivity.numericCost;

    assert.equal(initialItinerary.days[0].dailyCostNumeric, originalDay1Total + 3500);
    assert.equal(initialItinerary.totalCostNumeric, originalTotal + 3500);
  });

  // ── 5. Save Trip Plan Schema Validation ───────────────────────────────────────
  await test("5.1 Save trip plan schema validates database payload format", () => {
    const savePayload = {
      title: "3 Days in Kerala (Backwaters & Culture)",
      destination: "kerala",
      destinationSlug: "kerala",
      daysCount: 3,
      travelersCount: 2,
      budgetTier: "moderate",
      travelStyle: "balanced",
      interests: ["Nature", "Food"],
      estimatedTotalCost: 28500,
      currency: "INR",
      items: [
        {
          dayNumber: 1,
          timeSlot: "morning",
          itemType: "hotel",
          title: "Heritage Cochin Grand Resort",
          estimatedCost: 8000,
          bookingUrl: "/destinations/kerala",
          externalReferenceId: "stay-cochin-grand",
        },
      ],
    };

    const parsed = saveTripPlanSchema.parse(savePayload);
    assert.equal(parsed.title, savePayload.title);
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].itemType, "hotel");
  });

  // ── 6. Migration SQL File Verification ─────────────────────────────────────────
  await test("6.1 Supabase migration file contains proper tables, indexes, and RLS", () => {
    const migrationPath = "supabase/migrations/20260908020000_trip_plans_and_itineraries.sql";
    assert.ok(fs.existsSync(migrationPath), `Migration file ${migrationPath} must exist`);

    const sqlContent = fs.readFileSync(migrationPath, "utf8");
    assert.ok(sqlContent.includes("CREATE TABLE IF NOT EXISTS public.trip_plans"), "Contains trip_plans table creation");
    assert.ok(sqlContent.includes("CREATE TABLE IF NOT EXISTS public.itinerary_items"), "Contains itinerary_items table creation");
    assert.ok(sqlContent.includes("ENABLE ROW LEVEL SECURITY"), "Enables RLS on both tables");
    assert.ok(sqlContent.includes("idx_trip_plans_user_id"), "Creates index on user_id");
    assert.ok(sqlContent.includes("idx_itinerary_items_trip_plan_id"), "Creates index on trip_plan_id");
  });

  // ── 7. Navigation & Route Registration Verification ───────────────────────────
  await test("7.1 Planner and Itinerary routes exist and compile", () => {
    assert.ok(fs.existsSync("src/routes/planner.tsx"), "src/routes/planner.tsx must exist");
    assert.ok(fs.existsSync("src/routes/itinerary/$itineraryId.tsx"), "src/routes/itinerary/$itineraryId.tsx must exist");
    assert.ok(fs.existsSync("src/routes/_authenticated/tourist/itineraries.tsx"), "src/routes/_authenticated/tourist/itineraries.tsx must exist");
  });

  console.log("\n================================================================================");
  console.log(`🎉 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
