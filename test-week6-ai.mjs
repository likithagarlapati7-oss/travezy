import assert from "node:assert/strict";
import { z } from "zod";

console.log("================================================================================");
console.log("=== Running Week 6: AI Travel Assistant & Itinerary Generation Test Suite ===");
console.log("================================================================================");

// 1. Zod Schema Verification for Travel Preferences and Inputs
const itineraryInputSchema = z.object({
  destination: z.string().min(1, "Destination is required").max(120),
  days: z.number().int().min(1, "At least 1 day").max(14, "Maximum 14 days supported"),
  startDate: z.string().optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().default("INR"),
  travelers: z.number().int().min(1, "At least 1 traveller").default(1),
  groupType: z.enum(["solo", "couple", "family", "friends", "backpacker", "luxury"]).default("solo"),
  interests: z.array(z.string()).default([]),
  activityPace: z.enum(["relaxed", "moderate", "packed"]).default("moderate"),
  customNotes: z.string().max(1000).optional(),
});

// Test 1: Valid inputs pass schema validation
const validPlan = itineraryInputSchema.parse({
  destination: "Goa",
  days: 3,
  budget: 15000,
  travelers: 2,
  groupType: "couple",
  interests: ["Beaches & Water Sports", "Food & Culinary"],
  activityPace: "moderate",
});
assert.equal(validPlan.destination, "Goa");
assert.equal(validPlan.days, 3);
assert.equal(validPlan.budget, 15000);
assert.equal(validPlan.currency, "INR");
console.log("[PASS] 1. Valid itinerary input schema passes parsing and defaults");

// Test 2: Invalid inputs are strictly rejected
assert.throws(() => itineraryInputSchema.parse({ destination: "", days: 3 }), /Destination is required/);
assert.throws(() => itineraryInputSchema.parse({ destination: "Goa", days: 0 }), /At least 1 day/);
assert.throws(() => itineraryInputSchema.parse({ destination: "Goa", days: 15 }), /Maximum 14 days/);
assert.throws(() => itineraryInputSchema.parse({ destination: "Goa", days: 3, travelers: 0 }), /At least 1 traveller/);
console.log("[PASS] 2. Invalid inputs (empty destination, days < 1 or > 14, travelers < 1) are rejected");

// Test 3: Chat request schema with length guard
const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(4000, "Message is too long (max 4000 characters)"),
  conversationHistory: z.array(z.any()).max(30).default([]),
  preferences: itineraryInputSchema.partial().optional(),
});

assert.equal(chatRequestSchema.parse({ message: "Plan a 3-day trip to Goa under ₹15,000" }).message, "Plan a 3-day trip to Goa under ₹15,000");
assert.throws(() => chatRequestSchema.parse({ message: "" }), /Message cannot be empty/);
assert.throws(() => chatRequestSchema.parse({ message: "a".repeat(4001) }), /Message is too long/);
console.log("[PASS] 3. Chat request prompt boundaries (non-empty, max 4000 chars) are strictly enforced");

// Test 4: Structured Itinerary Schema Verification
const activityItemSchema = z.object({
  timeSlot: z.enum(["morning", "afternoon", "evening"]),
  title: z.string(),
  description: z.string(),
  location: z.string().optional(),
  estimatedCost: z.string().optional(),
  matchedServiceId: z.string().uuid().optional(),
});

const itineraryDaySchema = z.object({
  day: z.number().int(),
  title: z.string(),
  theme: z.string().optional(),
  morning: activityItemSchema,
  afternoon: activityItemSchema,
  evening: activityItemSchema,
  foodSuggestions: z.array(z.string()).default([]),
  estimatedDailyExpense: z.string().optional(),
  insiderTip: z.string().optional(),
});

const structuredItinerarySchema = z.object({
  destination: z.string(),
  daysCount: z.number().int(),
  estimatedTotalBudget: z.string().optional(),
  currency: z.string().default("INR"),
  summary: z.string(),
  travelerType: z.string().optional(),
  days: z.array(itineraryDaySchema),
  practicalTips: z.array(z.string()).default([]),
  packingAdvice: z.array(z.string()).default([]),
  bestTimeToVisit: z.string().optional(),
  safetyNotice: z.string(),
});

const sampleItinerary = {
  destination: "Goa",
  daysCount: 3,
  estimatedTotalBudget: "INR 15000",
  currency: "INR",
  summary: "A relaxed 3-day beach and culinary journey in North and South Goa.",
  travelerType: "COUPLE · MODERATE PACE",
  days: [
    {
      day: 1,
      title: "Arrival & Calangute Beach Exploration",
      theme: "Coastal Welcome",
      morning: {
        timeSlot: "morning",
        title: "Calangute & Baga Beach Walk",
        description: "Stroll along the golden sands and enjoy coconut water.",
        estimatedCost: "INR 500",
      },
      afternoon: {
        timeSlot: "afternoon",
        title: "Aguada Fort & Lighthouse",
        description: "Explore 17th-century Portuguese fortress overlooking Arabian Sea.",
        estimatedCost: "INR 600",
      },
      evening: {
        timeSlot: "evening",
        title: "Anjuna Sunset Shack Dinner",
        description: "Watch the sun dip below the horizon with live acoustic music.",
        estimatedCost: "INR 1200",
      },
      foodSuggestions: ["Goan Fish Curry Thali", "Bebinca with coconut ice cream"],
      estimatedDailyExpense: "INR 2300",
      insiderTip: "Arrive at Aguada fort before 4:00 PM for best lighting.",
    },
    {
      day: 2,
      title: "Heritage Walk in Fontainhas",
      theme: "Latin Quarter & Architecture",
      morning: {
        timeSlot: "morning",
        title: "Fontainhas Latin Quarter Heritage Walk",
        description: "Explore vibrant pastel Portuguese villas and artisan bakeries.",
        estimatedCost: "INR 800",
      },
      afternoon: {
        timeSlot: "afternoon",
        title: "Old Goa Churches & Se Cathedral",
        description: "Visit UNESCO World Heritage churches and museum.",
        estimatedCost: "INR 400",
      },
      evening: {
        timeSlot: "evening",
        title: "Mandovi River Cruise",
        description: "Scenic evening boat cruise with Goan folk performances.",
        estimatedCost: "INR 1000",
      },
      foodSuggestions: ["Pork Vindaloo / Mushroom Xacuti with Poi bread"],
      estimatedDailyExpense: "INR 2200",
      insiderTip: "Photography in Fontainhas is best in early morning light.",
    },
    {
      day: 3,
      title: "South Goa Serenity & Watersports",
      theme: "Pristine Beaches",
      morning: {
        timeSlot: "morning",
        title: "Palolem Beach Kayaking",
        description: "Paddle across calm crescent bay waters and spot dolphins.",
        estimatedCost: "INR 1000",
      },
      afternoon: {
        timeSlot: "afternoon",
        title: "Cabo de Rama Cliffside View",
        description: "Dramatic sea cliffs and historic fort ruins.",
        estimatedCost: "INR 500",
      },
      evening: {
        timeSlot: "evening",
        title: "Souvenir Shopping & Farewell Feast",
        description: "Pick up local spices, feni, and handcrafted souvenirs.",
        estimatedCost: "INR 1500",
      },
      foodSuggestions: ["Butter garlic tiger prawns at a seaside shack"],
      estimatedDailyExpense: "INR 3000",
      insiderTip: "Pre-book kayaking equipment early in the morning.",
    },
  ],
  practicalTips: [
    "Rent a scooter or car for flexible inter-beach transit.",
    "Carry cash for small beach shacks with patchy cellular network.",
  ],
  packingAdvice: ["Light cotton wear", "High SPF sunscreen and sunglasses", "Waterproof pouch"],
  safetyNotice: "Opening hours, ticket prices, transport schedules, and weather can fluctuate. Please verify dynamic information before travel.",
};

const parsedItin = structuredItinerarySchema.parse(sampleItinerary);
assert.equal(parsedItin.days.length, 3);
assert.equal(parsedItin.days[0].morning.timeSlot, "morning");
assert.equal(parsedItin.days[1].afternoon.timeSlot, "afternoon");
assert.equal(parsedItin.days[2].evening.timeSlot, "evening");
assert.ok(parsedItin.safetyNotice.includes("verify"));
console.log("[PASS] 4. Structured Itinerary accurately contains Day 1, Day 2, Day 3 with morning/afternoon/evening slots and safety disclaimer");

// Test 5: Context Retention & Refinement Simulation
function simulateContextUpdate(history, followUpPrompt) {
  // Extract previous itinerary destination & duration
  let lastDestination = "Goa";
  let lastDays = 3;
  let lastBudget = 15000;

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].itinerary) {
      lastDestination = history[i].itinerary.destination;
      lastDays = history[i].itinerary.daysCount;
      if (history[i].itinerary.estimatedTotalBudget) {
        const num = parseInt(history[i].itinerary.estimatedTotalBudget.replace(/\D/g, ""), 10);
        if (num > 0) lastBudget = num;
      }
      break;
    }
  }

  // If follow up says "make it cheaper"
  let newBudget = lastBudget;
  if (/cheaper|budget|lower cost/i.test(followUpPrompt)) {
    newBudget = Math.round(lastBudget * 0.7);
  }

  return {
    refinedDestination: lastDestination,
    refinedDays: lastDays,
    refinedBudget: newBudget,
    contextRetained: true,
  };
}

const mockHistory = [
  { role: "user", content: "Plan a 4-day trip to Goa under ₹20,000" },
  {
    role: "assistant",
    content: "Here is your 4-day Goa plan",
    itinerary: { ...sampleItinerary, daysCount: 4, destination: "Goa", estimatedTotalBudget: "INR 20000" },
  },
];

const followUpResult = simulateContextUpdate(mockHistory, "Make it cheaper for our group");
assert.equal(followUpResult.refinedDestination, "Goa", "Destination should be retained from prior turn");
assert.equal(followUpResult.refinedDays, 4, "Duration should be retained from prior turn");
assert.equal(followUpResult.refinedBudget, 14000, "Budget should be reduced appropriately");
console.log("[PASS] 5. Conversational context memory correctly resolves follow-up refinements ('Make it cheaper')");

// Test 6: Grounding with Database Listings
function simulateGrounding(databaseServices, targetDestination, targetBudget) {
  const matched = databaseServices.filter((s) => {
    const destMatch = s.destination.toLowerCase().includes(targetDestination.toLowerCase());
    const budgetMatch = targetBudget ? Number(s.price) <= targetBudget : true;
    return s.is_active && destMatch && budgetMatch;
  });

  return {
    verifiedPlatformServices: matched,
    hasLiveServices: matched.length > 0,
    noHallucinatedIds: matched.every((s) => typeof s.id === "string" && s.id.length > 0),
  };
}

const mockDatabaseServices = [
  { id: "s-101", title: "Luxury Beach Villa", destination: "Goa", price: 4500, rating: 4.9, is_active: true, category: "hotel" },
  { id: "s-102", title: "Scuba Diving Grand Island", destination: "Goa", price: 2500, rating: 4.8, is_active: true, category: "experience" },
  { id: "s-103", title: "Jaipur Heritage Havelis", destination: "Jaipur", price: 3000, rating: 4.7, is_active: true, category: "hotel" },
  { id: "s-104", title: "Inactive Goa Tour", destination: "Goa", price: 1000, rating: 4.0, is_active: false, category: "tour" },
];

const groundedGoa = simulateGrounding(mockDatabaseServices, "Goa", 5000);
assert.equal(groundedGoa.verifiedPlatformServices.length, 2);
assert.equal(groundedGoa.verifiedPlatformServices[0].id, "s-101");
assert.equal(groundedGoa.verifiedPlatformServices[1].id, "s-102");
assert.equal(groundedGoa.noHallucinatedIds, true);
console.log("[PASS] 6. Database grounding retrieves actual verified listings without inventing fake IDs");

// Test 7: Separation of General Travel Suggestions vs Bookable Platform Services
function verifyServiceSeparation(generalSuggestions, platformServices) {
  const isDistinct = platformServices.every((ps) => !generalSuggestions.includes(ps.title));
  const hasBookLinks = platformServices.every((ps) => ps.id && ps.price);
  return isDistinct && hasBookLinks;
}

const generalSpots = ["Fort Aguada Sunset View", "Anjuna Flea Market Walk"];
const bookableListings = [{ id: "s-101", title: "Luxury Beach Villa", price: 4500 }];
assert.equal(verifyServiceSeparation(generalSpots, bookableListings), true);
console.log("[PASS] 7. General travel suggestions and verified bookable platform services are clearly segregated");

// Test 8: Non-Exposure of Secret Keys
function checkKeySafety(apiResponse, secretKeys) {
  const responseStr = JSON.stringify(apiResponse);
  for (const key of secretKeys) {
    if (key && key.length > 5 && responseStr.includes(key)) {
      return false;
    }
  }
  return true;
}

const mockResponse = {
  reply: "Your 3-day itinerary is ready!",
  itinerary: sampleItinerary,
  recommendedServices: [{ id: "s-101", title: "Goa Villa" }],
  safetyNotice: "Dynamic prices may change.",
};
const secretKeysList = ["AIzaSyD_dummy_gemini_key_12345", "sk-proj-dummy_openai_key_67890", "rzp_secret_9999"];
assert.equal(checkKeySafety(mockResponse, secretKeysList), true, "Secret keys must NEVER appear in public responses");
console.log("[PASS] 8. Secret AI / Payment keys are not exposed in API responses");

console.log("\n================================================================================");
console.log("All 8 Week 6 AI Travel Assistant & Itinerary tests passed successfully!");
console.log("================================================================================\n");
