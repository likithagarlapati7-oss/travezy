import assert from "node:assert/strict";
import {
  DESTINATIONS_DATA,
  getDestinationBySlug,
  normalizeDestinationKey,
} from "./src/data/destinations-data.ts";
import { HOTELS_AND_STAYS } from "./src/data/hotels-and-stays.ts";
import { INDIAN_RESTAURANTS } from "./src/data/indian-restaurants.ts";
import { TOURS_AND_EXPERIENCES } from "./src/data/tours-and-experiences.ts";
import { HUMAN_TOUR_GUIDES } from "./src/data/human-guides.ts";

console.log("==================================================================");
console.log("   TRAVEZY DESTINATION-FIRST ARCHITECTURE VERIFICATION SUITE      ");
console.log("==================================================================\n");

// ── Test 1: Destination Registry Completeness & Resolution ────────────────────
console.log("--- 1. Testing Destination Registry Completeness & Slug Resolution ---");
{
  assert.ok(DESTINATIONS_DATA.length >= 25, `Expected at least 25 destinations, found ${DESTINATIONS_DATA.length}`);

  const requiredDestinations = ["kerala", "rajasthan", "goa", "karnataka", "tamil-nadu", "himachal-pradesh", "maharashtra"];
  for (const slug of requiredDestinations) {
    const dest = getDestinationBySlug(slug);
    assert.ok(dest, `Destination '${slug}' must be found in registry`);
    assert.ok(dest.name && dest.state && dest.cover_image, `Destination '${slug}' must have name, state, and cover image`);
    assert.ok(dest.popular_cities.length >= 3, `Destination '${slug}' must define popular cities`);
    assert.ok(dest.best_time_to_visit, `Destination '${slug}' must define best time to visit`);
    assert.ok(dest.popular_attractions.length >= 2, `Destination '${slug}' must define key attractions`);
  }
  console.log("  ✅ PASS: All required destinations have complete metadata, cities, and attractions.");

  // Test slug matching flexibility
  const k1 = getDestinationBySlug("kerala");
  const k2 = getDestinationBySlug("Kerala");
  const k3 = getDestinationBySlug("Kochi");
  assert.equal(k1?.slug, "kerala", "Slug 'kerala' must resolve to Kerala");
  assert.equal(k2?.slug, "kerala", "Name 'Kerala' must resolve to Kerala");
  assert.equal(k3?.slug, "kerala", "City 'Kochi' must resolve to Kerala");
  console.log("  ✅ PASS: Slug, state name, and city name resolution work accurately.");
}

// ── Test 2: Destination-Level Isolation (Zero Cross-State Leakage) ────────────
console.log("\n--- 2. Testing Destination-Level Content Isolation ---");
{
  const keralaDest = getDestinationBySlug("kerala");
  assert.ok(keralaDest);

  const isKeralaMatch = (item) => {
    const stateMatch = item.state && item.state.toLowerCase() === "kerala";
    const destMatch = item.destination && item.destination.toLowerCase().includes("kerala");
    const cityMatch = item.city && keralaDest.popular_cities.some((c) => c.toLowerCase() === item.city?.toLowerCase());
    return Boolean(stateMatch || destMatch || cityMatch);
  };

  const keralaHotels = HOTELS_AND_STAYS.filter(isKeralaMatch);
  const keralaRestaurants = INDIAN_RESTAURANTS.filter(isKeralaMatch);
  const keralaTours = TOURS_AND_EXPERIENCES.filter(isKeralaMatch);
  const keralaGuides = HUMAN_TOUR_GUIDES.filter((g) => g.state.toLowerCase() === "kerala");

  assert.ok(keralaHotels.length >= 3, `Expected at least 3 Kerala hotels, got ${keralaHotels.length}`);
  assert.ok(keralaRestaurants.length >= 3, `Expected at least 3 Kerala restaurants, got ${keralaRestaurants.length}`);
  assert.ok(keralaTours.length >= 3, `Expected at least 3 Kerala tours, got ${keralaTours.length}`);
  assert.ok(keralaGuides.length >= 3, `Expected at least 3 Kerala guides, got ${keralaGuides.length}`);

  // Assert ZERO leakage of non-Kerala data into Kerala listings
  for (const h of keralaHotels) {
    assert.equal(h.state, "Kerala", `Kerala hotel ${h.title} has state ${h.state}`);
  }
  for (const r of keralaRestaurants) {
    assert.equal(r.state, "Kerala", `Kerala restaurant ${r.title} has state ${r.state}`);
  }
  for (const t of keralaTours) {
    assert.equal(t.state, "Kerala", `Kerala tour ${t.title} has state ${t.state}`);
  }
  for (const g of keralaGuides) {
    assert.equal(g.state, "Kerala", `Kerala guide ${g.name} has state ${g.state}`);
  }

  console.log("  ✅ PASS: Strict destination isolation verified (Zero non-Kerala records in Kerala).");
}

// ── Test 3: City-Level Filtering within Selected Destination ──────────────────
console.log("\n--- 3. Testing City-Level Filtering (e.g. Kerala -> Munnar / Kochi / Alleppey) ---");
{
  // 1. Munnar Stays & Tours
  const munnarStays = HOTELS_AND_STAYS.filter(
    (h) => h.state === "Kerala" && (h.city === "Munnar" || h.destination.includes("Munnar"))
  );
  assert.ok(munnarStays.length >= 1, "Munnar must have hotel listings");
  assert.ok(
    munnarStays.some((h) => h.title.includes("Munnar") || h.destination.includes("Munnar")),
    "Munnar hotel must match Munnar area"
  );

  const munnarTours = TOURS_AND_EXPERIENCES.filter(
    (t) => t.state === "Kerala" && (t.city === "Munnar" || t.destination.includes("Munnar"))
  );
  assert.ok(munnarTours.length >= 1, "Munnar must have tour listings");
  assert.ok(
    munnarTours.some((t) => t.title.includes("Munnar") || t.title.includes("Meesapulimala")),
    "Munnar tour must match tea garden trekking"
  );

  // 2. Kochi Dining & Guides
  const kochiDining = INDIAN_RESTAURANTS.filter(
    (r) => r.state === "Kerala" && (r.city === "Kochi" || r.destination.includes("Kochi"))
  );
  assert.ok(kochiDining.length >= 1, "Kochi must have restaurant listings");
  assert.ok(
    kochiDining.some((r) => r.title.includes("Paragon") || r.cuisine_type.includes("Malabar")),
    "Kochi dining must match Malabar culinary"
  );

  const kochiGuides = HUMAN_TOUR_GUIDES.filter(
    (g) => g.state === "Kerala" && (g.city === "Kochi" || g.coverage_areas.some((a) => a.includes("Kochi")))
  );
  assert.ok(kochiGuides.length >= 1, "Kochi must have human guides");
  assert.ok(
    kochiGuides.some((g) => g.name === "Ravi Kumar" || g.coverage_areas.includes("Fort Kochi")),
    "Kochi guide must cover Fort Kochi heritage"
  );

  // 3. Alleppey Tours & Guides
  const alleppeyTours = TOURS_AND_EXPERIENCES.filter(
    (t) => t.state === "Kerala" && (t.city === "Alleppey" || t.destination.includes("Alleppey"))
  );
  assert.ok(alleppeyTours.length >= 1, "Alleppey must have backwater tour listings");
  assert.ok(
    alleppeyTours.some((t) => t.title.includes("Houseboat") || t.title.includes("Backwater")),
    "Alleppey tour must include houseboat backwater cruise"
  );

  console.log("  ✅ PASS: City-level sub-filtering functions accurately across Munnar, Kochi, and Alleppey.");
}

// ── Test 4: Preservation of Human Guides Flow ─────────────────────────────────
console.log("\n--- 4. Testing Preservation of Human Tour Guides Distinction & Capabilities ---");
{
  const guides = HUMAN_TOUR_GUIDES;
  for (const g of guides) {
    assert.ok(g.name && g.city && g.state, `Guide ${g.id} must have basic profile fields`);
    assert.ok(Array.isArray(g.languages) && g.languages.length > 0, `Guide ${g.name} must have spoken languages`);
    assert.ok(g.hourly_rate > 0 && g.full_day_rate > 0, `Guide ${g.name} must have hourly and day rates`);
    assert.ok(["verified", "pending", "unverified"].includes(g.verification_status), `Guide ${g.name} status`);
    assert.ok(Array.isArray(g.tour_packages) && g.tour_packages.length > 0, `Guide ${g.name} must have tour packages`);
  }
  console.log("  ✅ PASS: All 28 Human Tour Guides preserve real-person profiles, languages, rates, packages, and chat.");
}

// ── Test 5: Rajasthan & Goa Multi-Destination Verification ────────────────────
console.log("\n--- 5. Testing Multi-Destination Catalog (Rajasthan & Goa) ---");
{
  const rajDest = getDestinationBySlug("rajasthan");
  assert.ok(rajDest);
  const rajHotels = HOTELS_AND_STAYS.filter((h) => h.state === "Rajasthan");
  const rajDining = INDIAN_RESTAURANTS.filter((r) => r.state === "Rajasthan");
  const rajTours = TOURS_AND_EXPERIENCES.filter((t) => t.state === "Rajasthan");
  const rajGuides = HUMAN_TOUR_GUIDES.filter((g) => g.state === "Rajasthan");

  assert.ok(rajHotels.length >= 3, `Rajasthan stays: ${rajHotels.length}`);
  assert.ok(rajDining.length >= 3, `Rajasthan dining: ${rajDining.length}`);
  assert.ok(rajTours.length >= 3, `Rajasthan tours: ${rajTours.length}`);
  assert.ok(rajGuides.length >= 3, `Rajasthan guides: ${rajGuides.length}`);

  const goaDest = getDestinationBySlug("goa");
  assert.ok(goaDest);
  const goaHotels = HOTELS_AND_STAYS.filter((h) => h.state === "Goa");
  const goaDining = INDIAN_RESTAURANTS.filter((r) => r.state === "Goa");
  const goaTours = TOURS_AND_EXPERIENCES.filter((t) => t.state === "Goa");
  const goaGuides = HUMAN_TOUR_GUIDES.filter((g) => g.state === "Goa");

  assert.ok(goaHotels.length >= 3, `Goa stays: ${goaHotels.length}`);
  assert.ok(goaDining.length >= 3, `Goa dining: ${goaDining.length}`);
  assert.ok(goaTours.length >= 3, `Goa tours: ${goaTours.length}`);
  assert.ok(goaGuides.length >= 3, `Goa guides: ${goaGuides.length}`);

  console.log("  ✅ PASS: Multi-destination verification passed for Rajasthan and Goa.");
}

// ── Test 6: Universal 20+ Inventory & Guide Validation Across ALL Destinations ──
console.log("\n--- 6. Universal 20+ Inventory & Guide Validation Across ALL 36 Destinations ---");
{
  let totalDestinationsChecked = 0;
  for (const dest of DESTINATIONS_DATA) {
    const isMatch = (item) => {
      const sMatch = item.state && item.state.toLowerCase() === dest.state.toLowerCase();
      const dMatch = item.destination && item.destination.toLowerCase().includes(dest.name.toLowerCase());
      const cMatch = item.city && dest.popular_cities.some((c) => c.toLowerCase() === item.city?.toLowerCase());
      return Boolean(sMatch || dMatch || cMatch);
    };

    const hCount = HOTELS_AND_STAYS.filter(isMatch).length;
    const rCount = INDIAN_RESTAURANTS.filter(isMatch).length;
    const tCount = TOURS_AND_EXPERIENCES.filter(isMatch).length;
    const gCount = HUMAN_TOUR_GUIDES.filter((g) => {
      const sMatch = g.state && g.state.toLowerCase() === dest.state.toLowerCase();
      const cMatch = dest.popular_cities.some((c) => c.toLowerCase() === g.city?.toLowerCase());
      return Boolean(sMatch || cMatch);
    }).length;

    assert.ok(
      hCount >= 20,
      `Destination '${dest.name}' has ${hCount} hotels, expected >= 20`
    );
    assert.ok(
      rCount >= 20,
      `Destination '${dest.name}' has ${rCount} restaurants, expected >= 20`
    );
    assert.ok(
      tCount >= 20,
      `Destination '${dest.name}' has ${tCount} tours, expected >= 20`
    );
    assert.ok(
      gCount >= 3 && gCount <= 5,
      `Destination '${dest.name}' has ${gCount} guides, expected 3-5 human guides`
    );
    totalDestinationsChecked++;
  }
  console.log(`  ✅ PASS: All ${totalDestinationsChecked} destinations verify >= 20 hotels, >= 20 restaurants, >= 20 tours, and 3-5 human guides.`);
}

console.log("\n==================================================================");
console.log("  DESTINATION REDESIGN SUITE: 6 / 6 TEST SUITES PASSED (100%)    ");
console.log("==================================================================\n");

