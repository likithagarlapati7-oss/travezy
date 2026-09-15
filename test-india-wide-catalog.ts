import { HOTELS_AND_STAYS } from "./src/data/hotels-and-stays.js";
import { INDIAN_RESTAURANTS } from "./src/data/indian-restaurants.js";
import { TOURS_AND_EXPERIENCES } from "./src/data/tours-and-experiences.js";
import {
  formatHotelsAsServices,
  formatIndianRestaurantsAsServices,
  formatToursAsServices,
  getAllCuratedServices,
  servicesQuery,
  servicesSearchQuery,
} from "./src/lib/travezy.js";
import { isValidCoord } from "./src/lib/mapbox.js";

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
console.log("🇮🇳 TRAVEZY INDIA-WIDE HOTELS, RESTAURANTS & TOURS VALIDATION SUITE");
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

// ── 1. Total Catalog Counts ───────────────────────────────────────────────────
assert(
  HOTELS_AND_STAYS.length >= 108,
  `Hotels catalog contains 108+ listings (Found: ${HOTELS_AND_STAYS.length})`
);

assert(
  INDIAN_RESTAURANTS.length >= 108,
  `Restaurants catalog contains 108+ listings (Found: ${INDIAN_RESTAURANTS.length})`
);

assert(
  TOURS_AND_EXPERIENCES.length >= 108,
  `Tours & Activities catalog contains 108+ listings (Found: ${TOURS_AND_EXPERIENCES.length})`
);

const totalCurated = getAllCuratedServices();
assert(
  totalCurated.length >= 324,
  `Total combined tourism catalog contains 324+ listings (Found: ${totalCurated.length})`
);

// ── 2. All 28 States Hotels Coverage (>= 3 distinct hotels in distinct cities) ─
const hotelStateMap = new Map<string, typeof HOTELS_AND_STAYS>();
for (const h of HOTELS_AND_STAYS) {
  const list = hotelStateMap.get(h.state) || [];
  list.push(h);
  hotelStateMap.set(h.state, list);
}

let all28StatesHotelsCovered = true;
const hotelStateCityDistribution: Record<string, string[]> = {};

for (const state of ALL_28_STATES) {
  const hotelsInState = hotelStateMap.get(state) || [];
  const citiesInState = Array.from(new Set(hotelsInState.map((h) => h.city)));
  hotelStateCityDistribution[state] = citiesInState;

  if (hotelsInState.length < 3 || citiesInState.length < 3) {
    all28StatesHotelsCovered = false;
    console.error(
      `Hotels: State ${state} has only ${hotelsInState.length} hotels across ${citiesInState.length} cities (${citiesInState.join(", ")})`
    );
  }
}

assert(
  all28StatesHotelsCovered,
  "All 28 Indian States have >= 3 distinct hotels across distinct cities",
  JSON.stringify(hotelStateCityDistribution)
);

// ── 3. All 28 States Restaurants Coverage (>= 3 distinct restaurants) ─────────
const restStateMap = new Map<string, typeof INDIAN_RESTAURANTS>();
for (const r of INDIAN_RESTAURANTS) {
  const list = restStateMap.get(r.state) || [];
  list.push(r);
  restStateMap.set(r.state, list);
}

let all28StatesRestsCovered = true;
const restStateCityDistribution: Record<string, string[]> = {};

for (const state of ALL_28_STATES) {
  const restsInState = restStateMap.get(state) || [];
  const citiesInState = Array.from(new Set(restsInState.map((r) => r.city)));
  restStateCityDistribution[state] = citiesInState;

  if (restsInState.length < 3 || citiesInState.length < 3) {
    all28StatesRestsCovered = false;
    console.error(
      `Restaurants: State ${state} has only ${restsInState.length} restaurants across ${citiesInState.length} cities (${citiesInState.join(", ")})`
    );
  }
}

assert(
  all28StatesRestsCovered,
  "All 28 Indian States have >= 3 distinct restaurants across distinct cities",
  JSON.stringify(restStateCityDistribution)
);

// ── 4. All 28 States Tours & Activities Coverage (>= 3 distinct tours) ────────
const tourStateMap = new Map<string, typeof TOURS_AND_EXPERIENCES>();
for (const t of TOURS_AND_EXPERIENCES) {
  const list = tourStateMap.get(t.state) || [];
  list.push(t);
  tourStateMap.set(t.state, list);
}

let all28StatesToursCovered = true;
const tourStateCityDistribution: Record<string, string[]> = {};

for (const state of ALL_28_STATES) {
  const toursInState = tourStateMap.get(state) || [];
  const citiesInState = Array.from(new Set(toursInState.map((t) => t.city)));
  tourStateCityDistribution[state] = citiesInState;

  if (toursInState.length < 3 || citiesInState.length < 3) {
    all28StatesToursCovered = false;
    console.error(
      `Tours: State ${state} has only ${toursInState.length} tours across ${citiesInState.length} locations (${citiesInState.join(", ")})`
    );
  }
}

assert(
  all28StatesToursCovered,
  "All 28 Indian States have >= 3 distinct tours/activities across distinct locations",
  JSON.stringify(tourStateCityDistribution)
);

// ── 5. Union Territories Coverage (>= 3 hotels, >= 3 restaurants, >= 3 tours) ─
let allUTsCovered = true;
for (const ut of UNION_TERRITORIES) {
  const hotels = hotelStateMap.get(ut) || [];
  const rests = restStateMap.get(ut) || [];
  const tours = tourStateMap.get(ut) || [];

  if (hotels.length < 3 || rests.length < 3 || tours.length < 3) {
    allUTsCovered = false;
    console.error(
      `UT ${ut} coverage: Hotels=${hotels.length}, Restaurants=${rests.length}, Tours=${tours.length}`
    );
  }
}

assert(
  allUTsCovered,
  "All 8 major Union Territories have >= 3 hotels, >= 3 restaurants, and >= 3 tours each"
);

// ── 6. Geographic Coordinates & Data Quality Check ────────────────────────────
let allCoordinatesValid = true;
let allImagesValid = true;
let allPricesValid = true;
let allDescriptionsRich = true;

for (const item of totalCurated) {
  if (!isValidCoord(item.latitude, item.longitude)) {
    allCoordinatesValid = false;
    console.error(`Invalid coordinates for item: ${item.title} (${item.latitude}, ${item.longitude})`);
  }

  // India Lat bounds: ~8 to 38, Lng bounds: ~68 to 98 (with Lakshadweep/Andamans)
  if (
    item.latitude < 8 ||
    item.latitude > 38 ||
    item.longitude < 68 ||
    item.longitude > 98
  ) {
    allCoordinatesValid = false;
    console.error(`Coordinates out of India boundary: ${item.title} (${item.latitude}, ${item.longitude})`);
  }

  if (!item.image_url || !item.image_url.startsWith("http")) {
    allImagesValid = false;
    console.error(`Invalid image for item: ${item.title}`);
  }

  if (!item.price || item.price <= 0) {
    allPricesValid = false;
    console.error(`Invalid price for item: ${item.title} (${item.price})`);
  }

  if (!item.description || item.description.length < 30) {
    allDescriptionsRich = false;
    console.error(`Insufficient description for item: ${item.title}`);
  }
}

assert(allCoordinatesValid, "All 324+ tourism listings have verified geographic coordinates in India");
assert(allImagesValid, "All 324+ tourism listings have valid high-resolution image URLs");
assert(allPricesValid, "All 324+ tourism listings have realistic positive pricing (INR)");
assert(allDescriptionsRich, "All 324+ tourism listings have rich, descriptive tourism information");

// ── 7. Services Search & Filter Query Verification ───────────────────────────
async function runQueryTests() {
  // Test category filtering for hotels
  const hotelsResult = await servicesSearchQuery({ category: "hotel", page: 1 }).queryFn();
  assert(
    hotelsResult.total >= 10,
    `Search query by category 'hotel' returns items (Found: ${hotelsResult.total})`
  );

  // Test state search
  const rajasthanResult = await servicesSearchQuery({ location: "Rajasthan", page: 1 }).queryFn();
  assert(
    rajasthanResult.total >= 9,
    `Search query by state 'Rajasthan' returns hotels + restaurants + tours (Found: ${rajasthanResult.total})`
  );

  // Test keyword search
  const safariResult = await servicesSearchQuery({ q: "Safari", page: 1 }).queryFn();
  assert(
    safariResult.total >= 5,
    `Search query by keyword 'Safari' returns relevant experiences (Found: ${safariResult.total})`
  );

  // Test price range filter
  const priceResult = await servicesSearchQuery({ minPrice: 1000, maxPrice: 5000, page: 1 }).queryFn();
  assert(
    priceResult.total >= 50,
    `Search query with price range 1000-5000 INR returns results (Found: ${priceResult.total})`
  );
}

runQueryTests()
  .then(() => {
    console.log("\n================================================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================");
    if (failed > 0) process.exit(1);
  })
  .catch((err) => {
    console.error("Query test exception:", err);
    process.exit(1);
  });
