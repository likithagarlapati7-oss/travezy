/**
 * Automated Verification Suite for Travezy Upgrade 3: Smart Travel Tools
 *
 * Tests:
 * 1. Trip Budget Calculations & Category Grouping (Hotel, Food, Experiences, Guide, Transport, Other)
 * 2. Max Budget comparison (Within / Over budget indicators & percentage calculations)
 * 3. Cheaper Alternatives Engine (Finds real listings matching destination with price < currentCost, computes exact savings)
 * 4. Open-Meteo Live Weather Integration & WMO Weather Code Parsing
 * 5. Weather-Aware Activity Categorization (Rain -> Indoor, Sun -> Outdoor)
 * 6. Smart Packing List Generator (Destination, Duration, Weather, and Activity tailored checklist)
 * 7. Packing Checklist Item Toggle, Custom Items, and Progress Tracking
 */

import { calculateItineraryBudget, findCheaperAlternatives } from "./src/lib/budget.ts";
import { fetchLiveWeather, parseWmoWeatherCode, getWeatherAwareExperiences } from "./src/lib/weather.ts";
import { generateSmartPackingList, calculatePackingProgress } from "./src/lib/packing.ts";
import { DESTINATIONS_DATA } from "./src/data/destinations-data.ts";
import { HOTELS_AND_STAYS } from "./src/data/hotels-and-stays.ts";
import { INDIAN_RESTAURANTS } from "./src/data/indian-restaurants.ts";
import { TOURS_AND_EXPERIENCES } from "./src/data/tours-and-experiences.ts";
import { HUMAN_TOUR_GUIDES } from "./src/data/human-guides.ts";

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("🚀 STARTING TRAVEZY UPGRADE 3 (SMART TRAVEL TOOLS) VERIFICATION");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // TEST 1: Budget Calculations & Category Grouping
  // -------------------------------------------------------------------------
  console.log("🧪 TEST 1: Trip Budget Planner - Category Cost Calculations");

  const sampleItineraryItems = [
    { id: "hotel-1", item_type: "hotel", title: "Spice Tree Munnar", estimated_cost: 12000, location: "Munnar, Kerala" },
    { id: "food-1", item_type: "restaurant", title: "Rapsy Restaurant", estimated_cost: 3000, location: "Munnar, Kerala" },
    { id: "food-2", item_type: "food", title: "Saravana Bhavan", estimated_cost: 3000, location: "Munnar, Kerala" },
    { id: "exp-1", item_type: "experience", title: "Tea Plantation Trek", estimated_cost: 4500, location: "Munnar, Kerala" },
    { id: "guide-1", item_type: "guide", title: "Anand Kumar (Guide)", estimated_cost: 3000, location: "Munnar, Kerala" },
    { id: "trans-1", item_type: "transport", title: "Private Cab Transfer", estimated_cost: 4000, location: "Munnar, Kerala" },
    { id: "other-1", item_type: "other", title: "Souvenir Shopping", estimated_cost: 1000, location: "Munnar, Kerala" },
  ];

  const budget1 = calculateItineraryBudget(sampleItineraryItems, 25000);

  assert(budget1.totalEstimated === 30500, `Total cost calculated accurately (expected 30500, got ${budget1.totalEstimated})`);
  assert(budget1.breakdown.hotels === 12000, `Hotel category cost = ₹12,000 (got ${budget1.breakdown.hotels})`);
  assert(budget1.breakdown.food === 6000, `Food category cost = ₹6,000 (got ${budget1.breakdown.food})`);
  assert(budget1.breakdown.experiences === 4500, `Experiences category cost = ₹4,500 (got ${budget1.breakdown.experiences})`);
  assert(budget1.breakdown.guide === 3000, `Guide category cost = ₹3,000 (got ${budget1.breakdown.guide})`);
  assert(budget1.breakdown.transport === 4000, `Transport category cost = ₹4,000 (got ${budget1.breakdown.transport})`);
  assert(budget1.breakdown.other === 1000, `Other category cost = ₹1,000 (got ${budget1.breakdown.other})`);

  // -------------------------------------------------------------------------
  // TEST 2: Max Budget Indicator & Thresholds
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 2: Trip Budget Planner - Max Budget Comparison & Indicators");

  assert(budget1.isOverBudget === true, "Correctly identifies Over Budget state when Total (30,500) > Max (25,000)");
  assert(budget1.difference === -5500, `Correctly calculates over-budget difference of -₹5,500 (got ${budget1.difference})`);
  assert(budget1.percentageUsed === 122, `Calculates 122% spent of target budget (got ${budget1.percentageUsed}%)`);

  // Within budget test
  const budget2 = calculateItineraryBudget(sampleItineraryItems, 35000);
  assert(budget2.isOverBudget === false, "Correctly identifies Within Budget state when Total (30,500) <= Max (35,000)");
  assert(budget2.isWithinBudget === true, "isWithinBudget flagged as true");
  assert(budget2.difference === 4500, `Correctly calculates remaining budget of ₹4,500 (got ${budget2.difference})`);
  assert(budget2.percentageUsed === 87, `Calculates 87% spent of target budget (got ${budget2.percentageUsed}%)`);

  // -------------------------------------------------------------------------
  // TEST 3: Cheaper Alternatives Finder (Real database listings only)
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 3: Find Cheaper Options Engine (Strictly Real Database Records)");

  // Munnar expensive hotel alternative check
  const expensiveHotel = {
    id: "h-munnar-high",
    item_type: "hotel",
    title: "Luxury Resort Munnar",
    estimated_cost: 10000,
  };

  const hotelAlternatives = findCheaperAlternatives("Munnar", [expensiveHotel]);
  assert(Array.isArray(hotelAlternatives) && hotelAlternatives.length > 0, "Found real cheaper hotel alternatives in Munnar");
  assert(
    hotelAlternatives.every((alt) => alt.cheaperItem.price < alt.currentCost),
    "Every recommended alternative has strictly lower price than current cost"
  );
  assert(
    hotelAlternatives.every((alt) => alt.savings === alt.currentCost - alt.cheaperItem.price),
    "Computed savings accurately reflect price difference (cost - alternativePrice)"
  );
  assert(
    hotelAlternatives[0].savings > 0,
    `Top alternative "${hotelAlternatives[0].cheaperItem.title}" saves ₹${hotelAlternatives[0].savings.toLocaleString("en-IN")}`
  );

  // Experience alternative check in Goa
  const expensiveTour = {
    id: "tour-expensive-goa",
    item_type: "experience",
    title: "VIP Yacht Cruise",
    estimated_cost: 8000,
  };
  const tourAlternatives = findCheaperAlternatives("Goa", [expensiveTour]);
  assert(tourAlternatives.length > 0, "Found real cheaper tour/experience alternatives in Goa");
  assert(
    tourAlternatives.every((alt) => alt.cheaperItem.price < alt.currentCost),
    "All tour alternatives are strictly cheaper"
  );

  // -------------------------------------------------------------------------
  // TEST 4: Open-Meteo Live Weather & WMO Weather Code Parser
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 4: Live Weather Integration (Open-Meteo API + WMO Code Parser)");

  // Test WMO Weather Code parser directly
  const clearInfo = parseWmoWeatherCode(0);
  assert(clearInfo.condition.includes("Clear") || clearInfo.condition.includes("Sunny"), `WMO 0 parsed as Clear/Sunny (got ${clearInfo.condition})`);
  assert(clearInfo.isRainy === false, "Clear sky is not marked as rainy");
  assert(clearInfo.isSunny === true, "Clear sky is marked as sunny");

  const rainInfo = parseWmoWeatherCode(63);
  assert(rainInfo.condition.includes("Rain"), `WMO 63 parsed as Rain (got ${rainInfo.condition})`);
  assert(rainInfo.isRainy === true, "Rain code correctly flagged as isRainy = true");
  assert(rainInfo.isSunny === false, "Rain code correctly flagged as isSunny = false");

  const stormInfo = parseWmoWeatherCode(95);
  assert(stormInfo.condition.includes("Thunderstorm"), `WMO 95 parsed as Thunderstorm (got ${stormInfo.condition})`);
  assert(stormInfo.isRainy === true, "Thunderstorm flagged as isRainy = true");

  // Live Open-Meteo API Fetch for Goa (15.2993, 74.1240)
  console.log("  📡 Fetching live weather data from Open-Meteo API for Goa...");
  const goaWeather = await fetchLiveWeather("Goa", 15.2993, 74.1240);

  assert(goaWeather !== null && goaWeather.isAvailable === true, "Successfully fetched live weather payload from Open-Meteo");
  assert(typeof goaWeather.temperature === "number", `Valid live temperature: ${goaWeather.temperature}°C`);
  assert(typeof goaWeather.weatherCode === "number", `Valid WMO weather code: ${goaWeather.weatherCode} (${goaWeather.condition})`);
  assert(Array.isArray(goaWeather.forecast) && goaWeather.forecast.length >= 3, `3-day daily forecast available (${goaWeather.forecast.length} days returned)`);
  assert(typeof goaWeather.forecast[0].maxTemp === "number", `Day 1 Forecast: Max ${goaWeather.forecast[0].maxTemp}°C / Min ${goaWeather.forecast[0].minTemp}°C`);

  // Live Open-Meteo API Fetch for Munnar (10.0889, 77.0595)
  console.log("  📡 Fetching live weather data from Open-Meteo API for Munnar...");
  const munnarWeather = await fetchLiveWeather("Munnar", 10.0889, 77.0595);
  assert(munnarWeather !== null && munnarWeather.isAvailable === true, "Successfully fetched live weather payload for Munnar");
  assert(typeof munnarWeather.temperature === "number", `Munnar live temperature: ${munnarWeather.temperature}°C`);

  // -------------------------------------------------------------------------
  // TEST 5: Weather-Aware Experience Categorization
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 5: Weather-Aware Recommendations (Rain -> Indoor, Sun -> Outdoor)");

  // Test rain recommendations
  const rainyWeatherData = {
    ...goaWeather,
    weatherCode: 65, // Heavy rain
    condition: "Heavy rain",
    isRainy: true,
    isSunny: false,
  };
  const rainRecs = getWeatherAwareExperiences("Goa", rainyWeatherData);
  assert(rainRecs.indoorRecommendations.length > 0, `Found ${rainRecs.indoorRecommendations.length} indoor activities for rainy day`);
  assert(rainRecs.weatherAdvice.toLowerCase().includes("rain") || rainRecs.weatherAdvice.toLowerCase().includes("indoor"), `Rain-aware message generated: "${rainRecs.weatherAdvice}"`);

  // Test sunny recommendations
  const sunnyWeatherData = {
    ...goaWeather,
    weatherCode: 0, // Clear sky
    condition: "Clear sky",
    isRainy: false,
    isSunny: true,
  };
  const sunRecs = getWeatherAwareExperiences("Goa", sunnyWeatherData);
  assert(sunRecs.outdoorRecommendations.length > 0, `Found ${sunRecs.outdoorRecommendations.length} outdoor activities for sunny day`);
  assert(sunRecs.weatherAdvice.toLowerCase().includes("clear") || sunRecs.weatherAdvice.toLowerCase().includes("cruises") || sunRecs.weatherAdvice.toLowerCase().includes("treks"), `Sun-aware message generated: "${sunRecs.weatherAdvice}"`);

  // -------------------------------------------------------------------------
  // TEST 6: Smart Packing List Generator
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 6: Smart Packing List Generator (Destination, Duration & Weather Tailored)");

  // 1. Kerala (5 days, coastal/tropical with humidity)
  const keralaItems = generateSmartPackingList(
    "Kerala",
    5,
    "Humid and pleasant tropical breezes with light showers",
    ["Trekking", "Backwater Cruise", "Ayurvedic Spa"]
  );

  assert(keralaItems.length >= 10, `Generated comprehensive checklist (${keralaItems.length} items)`);
  assert(
    keralaItems.some((i) => i.name.toLowerCase().includes("mosquito") || i.name.toLowerCase().includes("cotton") || i.name.toLowerCase().includes("linen") || i.name.toLowerCase().includes("breathable")),
    "Includes Kerala-specific tropical/monsoon items (mosquito repellent, breathable cottons)"
  );
  const categories = [...new Set(keralaItems.map((i) => i.category))];
  assert(
    categories.includes("Clothing") &&
    categories.includes("Toiletries") &&
    categories.includes("Documents"),
    "Properly categorizes packing items into intuitive groups"
  );

  // 2. Ladakh / Himachal (Cold & Mountain climate)
  const ladakhItems = generateSmartPackingList(
    "Ladakh",
    7,
    "Chilly alpine cold with night subzero winds",
    ["High Altitude Pass", "Monastery Tour"]
  );

  assert(
    ladakhItems.some((i) => i.name.toLowerCase().includes("thermal") || i.name.toLowerCase().includes("fleece") || i.name.toLowerCase().includes("jacket") || i.name.toLowerCase().includes("woollen") || i.name.toLowerCase().includes("warm")),
    "Includes cold-weather mountain items (thermal innerwear, fleece jacket) for Ladakh"
  );

  // 3. Goa (Beach climate)
  const goaItems = generateSmartPackingList(
    "Goa",
    3,
    "Sunny and warm beach weather",
    ["Beach hopping", "Water sports"]
  );

  assert(
    goaItems.some((i) => i.name.toLowerCase().includes("swimwear") || i.name.toLowerCase().includes("sunscreen") || i.name.toLowerCase().includes("sandals") || i.name.toLowerCase().includes("sunglasses")),
    "Includes beachwear and sun protection items for Goa"
  );

  // -------------------------------------------------------------------------
  // TEST 7: Packing Progress & Item State Toggle
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 7: Packing Progress Tracking & Checklist Completion");

  const testItems = [
    { id: "p1", name: "Passport & ID", category: "Documents", is_packed: true },
    { id: "p2", name: "T-Shirts (5x)", category: "Clothing", is_packed: true },
    { id: "p3", name: "Sunscreen SPF 50", category: "Toiletries", is_packed: false },
    { id: "p4", name: "Phone Charger", category: "Electronics", is_packed: false },
  ];

  const progress = calculatePackingProgress(testItems);
  assert(progress.total === 4, `Total items = 4 (got ${progress.total})`);
  assert(progress.packed === 2, `Packed items = 2 (got ${progress.packed})`);
  assert(progress.percentage === 50, `Progress percentage = 50% (got ${progress.percentage}%)`);
  assert(progress.remaining === 2, `Remaining items = 2 (got ${progress.remaining})`);

  // Mark all as packed
  const allPackedItems = testItems.map((i) => ({ ...i, is_packed: true }));
  const fullProgress = calculatePackingProgress(allPackedItems);
  assert(fullProgress.percentage === 100, `All items packed = 100% (got ${fullProgress.percentage}%)`);
  assert(fullProgress.remaining === 0, "Zero remaining items when all packed");

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`🎉 ALL TESTS PASSED SUCCESSFULLY (${passedTests}/${totalTests})`);
  console.log("==================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("FATAL TEST SUITE ERROR:", err);
  process.exit(1);
});
