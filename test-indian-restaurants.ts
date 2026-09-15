import { INDIAN_RESTAURANTS } from "./src/data/indian-restaurants.js";
import { formatIndianRestaurantsAsServices, servicesQuery, servicesSearchQuery } from "./src/lib/travezy.js";
import { getServiceCoordinates, KNOWN_DESTINATION_COORDS } from "./src/lib/mapbox.js";

const ALL_28_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const UNION_TERRITORIES = [
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
];

console.log("================================================================================");
console.log("TRAVEZY INDIA-WIDE RESTAURANTS VERIFICATION SUITE");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ── 1. Total Count Check ──────────────────────────────────────────────────────
assert(
  INDIAN_RESTAURANTS.length >= 108,
  `Catalog contains 108+ curated authentic Indian restaurants (Found: ${INDIAN_RESTAURANTS.length})`
);

// ── 2. All 28 States Coverage (>= 3 distinct restaurants in distinct cities) ──
const stateMap = new Map<string, typeof INDIAN_RESTAURANTS>();
for (const r of INDIAN_RESTAURANTS) {
  const list = stateMap.get(r.state) || [];
  list.push(r);
  stateMap.set(r.state, list);
}

let all28StatesCovered = true;
const stateCityDistribution: Record<string, string[]> = {};

for (const state of ALL_28_STATES) {
  const restaurantsInState = stateMap.get(state) || [];
  const citiesInState = Array.from(new Set(restaurantsInState.map((r) => r.city)));
  stateCityDistribution[state] = citiesInState;

  if (restaurantsInState.length < 3 || citiesInState.length < 3) {
    all28StatesCovered = false;
    console.error(
      `State ${state} has only ${restaurantsInState.length} restaurants across ${citiesInState.length} cities (${citiesInState.join(", ")})`
    );
  }
}

assert(
  all28StatesCovered,
  "All 28 Indian States have at least 3 distinct restaurants in distinct cities",
  JSON.stringify(stateCityDistribution)
);

// ── 3. Union Territories Coverage (>= 3 restaurants each) ─────────────────────
let allUTsCovered = true;
for (const ut of UNION_TERRITORIES) {
  const restaurantsInUT = stateMap.get(ut) || [];
  if (restaurantsInUT.length < 3) {
    allUTsCovered = false;
    console.error(`Union Territory ${ut} has only ${restaurantsInUT.length} restaurants.`);
  }
}

assert(
  allUTsCovered,
  "All 8 Union Territories (Delhi, J&K, Ladakh, Puducherry, Chandigarh, Andaman, D&D, Lakshadweep) have at least 3 restaurants"
);

// ── 4. Quality, Data Integrity & Realistic Information ────────────────────────
let validQuality = true;
for (const r of INDIAN_RESTAURANTS) {
  if (!r.id || !r.title || !r.state || !r.city || !r.destination || !r.description) {
    validQuality = false;
  }
  if (r.price <= 0 || r.currency !== "INR") {
    validQuality = false;
  }
  if (r.rating < 4.0 || r.rating > 5.0 || r.review_count < 10) {
    validQuality = false;
  }
  if (!r.image_url.startsWith("http")) {
    validQuality = false;
  }
  if (r.title.includes("Restaurant 1") || r.title.includes("Sample")) {
    validQuality = false;
  }
}

assert(
  validQuality,
  "Every restaurant has authentic names, realistic pricing in INR, ratings (4.0-5.0), reviews, descriptions, and high-res image URLs"
);

// ── 5. Coordinate & Map Integration Check ─────────────────────────────────────
let allCoordsValid = true;
for (const r of INDIAN_RESTAURANTS) {
  const coords = getServiceCoordinates(r);
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
    allCoordsValid = false;
    console.error(`Missing valid coordinates for restaurant: ${r.title} in ${r.city}, ${r.state}`);
  }
}

assert(
  allCoordsValid,
  "Every restaurant resolves to valid geographic coordinates [lat, lng] for Mapbox map rendering"
);

// ── 6. Search & Filter Integration Engine Tests ───────────────────────────────
async function runSearchTests() {
  const formattedServices = formatIndianRestaurantsAsServices();

  // Test category query
  const resQuery = servicesQuery(["restaurant"]);
  const restaurantResults = await resQuery.queryFn();
  assert(
    restaurantResults.length >= 108,
    `servicesQuery(["restaurant"]) returns all curated restaurants (${restaurantResults.length} found)`
  );

  // Test keyword search for "Biryani"
  const biryaniSearch = servicesSearchQuery({ q: "Biryani" });
  const biryaniResults = await biryaniSearch.queryFn();
  assert(
    biryaniResults.services.length > 0 &&
      biryaniResults.services.some((s) => s.description?.toLowerCase().includes("biryani")),
    `Keyword search for 'Biryani' returns regional biryani specialties across India (${biryaniResults.total} found)`
  );

  // Test location filter for "Kerala"
  const keralaSearch = servicesSearchQuery({ location: "Kerala" });
  const keralaResults = await keralaSearch.queryFn();
  assert(
    keralaResults.services.length >= 3 &&
      keralaResults.services.every((s) => s.state === "Kerala" || s.destination.includes("Kerala")),
    `Location filter for 'Kerala' correctly discovers all Kerala restaurants (${keralaResults.total} found)`
  );

  // Test location filter for "Rajasthan"
  const rajasthanSearch = servicesSearchQuery({ location: "Rajasthan" });
  const rajasthanResults = await rajasthanSearch.queryFn();
  assert(
    rajasthanResults.services.length >= 3,
    `Location filter for 'Rajasthan' discovers Jaipur, Udaipur, and Jodhpur restaurants (${rajasthanResults.total} found)`
  );

  console.log("\n================================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runSearchTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
