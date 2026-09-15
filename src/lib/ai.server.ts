import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types.ts";
import type { ServiceWithProvider } from "./travezy.ts";
import {
  type ChatMessage,
  type ItineraryInput,
  type StructuredItinerary,
  type AiResponse,
  type TranslationRequest,
  type TranslationResponse,
  SUPPORTED_LANGUAGES,
  structuredItinerarySchema,
} from "./ai.schema.ts";

type Client = SupabaseClient<Database>;

export const SAFETY_DISCLAIMER =
  "Opening hours, ticket prices, transport schedules, and local weather are subject to change. Please verify dynamic details with official local operators before travel.";

/**
 * Retrieves matching active platform services from the database
 * to ground the AI recommendations in genuine bookable listings.
 */
export async function getMatchingPlatformServices(
  supabase: Client,
  destination?: string,
  maxBudget?: number,
  category?: string
): Promise<ServiceWithProvider[]> {
  try {
    let query = supabase
      .from("services")
      .select("*, providers(id, business_name, verified)")
      .eq("is_active", true);

    if (destination && destination.trim()) {
      const d = destination.trim().replace(/[,)(]/g, " ");
      query = query.or(
        `destination.ilike.%${d}%,city.ilike.%${d}%,state.ilike.%${d}%,country.ilike.%${d}%`
      );
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (maxBudget !== undefined && maxBudget > 0) {
      query = query.lte("price", maxBudget);
    }

    const { data, error } = await query
      .order("rating", { ascending: false })
      .limit(6);

    if (error) {
      console.warn("[AI Grounding] Service query error:", error.message);
      return [];
    }

    return (data ?? []) as unknown as ServiceWithProvider[];
  } catch (err) {
    console.warn("[AI Grounding] Service fetch error:", err);
    return [];
  }
}

/**
 * Formats platform services for AI prompt injection
 */
function formatServicesForPrompt(services: ServiceWithProvider[]): string {
  if (!services.length) {
    return "No verified platform services found for this destination in our database yet.";
  }

  return services
    .map(
      (s, i) =>
        `${i + 1}. [ID: ${s.id}] "${s.title}" (${s.category}) in ${s.destination} - Price: ${s.currency} ${s.price}/person, Rating: ${Number(s.rating).toFixed(1)}★, Provider: ${s.providers?.business_name || "Verified Partner"}`
    )
    .join("\n");
}

/**
 * Detects configured AI provider (Gemini, OpenAI, or Fallback)
 */
export function getActiveAiProvider(): {
  provider: "gemini" | "openai" | "fallback";
  apiKey?: string;
} {
  const env = process.env as Record<string, string | undefined>;
  const geminiKey =
    env["GEMINI_API_KEY"] ||
    env["VITE_GEMINI_API_KEY"] ||
    env["GOOGLE_API_KEY"];

  if (geminiKey && geminiKey.trim().length > 5) {
    return { provider: "gemini", apiKey: geminiKey.trim() };
  }

  const openaiKey =
    env["OPENAI_API_KEY"] || env["VITE_OPENAI_API_KEY"];

  if (openaiKey && openaiKey.trim().length > 5) {
    return { provider: "openai", apiKey: openaiKey.trim() };
  }

  return { provider: "fallback" };
}

/**
 * Invokes Gemini 1.5/2.0 Flash REST API
 */
async function callGeminiApi(
  apiKey: string,
  systemInstruction: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>
): Promise<string> {
  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2500,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return text;
}

/**
 * Invokes OpenAI Chat Completions API
 */
async function callOpenAiApi(
  apiKey: string,
  systemInstruction: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemInstruction },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 2500,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Core smart fallback generator for offline testing or when no API key is present
 */
export function generateSmartFallbackItinerary(
  rawInput: Partial<ItineraryInput> & { destination: string; days: number },
  matchedServices: ServiceWithProvider[]
): StructuredItinerary {
  const input: ItineraryInput = {
    destination: rawInput.destination,
    days: rawInput.days,
    budget: rawInput.budget,
    budgetTier: rawInput.budgetTier || "moderate",
    currency: rawInput.currency || "INR",
    travelers: rawInput.travelers || 2,
    groupType: rawInput.groupType || "couple",
    interests: rawInput.interests || [],
    travelStyle: rawInput.travelStyle || "balanced",
    activityPace: rawInput.activityPace || "moderate",
    customNotes: rawInput.customNotes,
  };
  const destination = input.destination;
  const daysCount = input.days;
  const budget = input.budget;
  const currency = input.currency || "INR";
  const group = input.groupType || "traveler";
  const pace = input.activityPace || "moderate";

  const destLower = destination.toLowerCase();

  // Knowledge base of destination highlights
  const spotDatabase: Record<string, { spots: string[]; foods: string[]; tips: string[] }> = {
    goa: {
      spots: [
        "Calangute & Baga Beach stroll",
        "Aguada Fort & Lighthouse panoramic views",
        "Anjuna Flea Market & Curlies Sunset",
        "Old Goa Churches & Basilica of Bom Jesus",
        "Dudhsagar Waterfalls trek",
        "Fontainhas Latin Quarter heritage walk",
        "Palolem Beach kayaking & dolphin cruise",
        "Chapora Fort sunset view",
      ],
      foods: [
        "Goan Fish Curry Thali at a beach shack",
        "Pork Vindaloo / Mushroom Xacuti with Poi",
        "Bebinca dessert with coconut feni",
        "Fresh butter garlic tiger prawns",
      ],
      tips: [
        "Rent a scooter or car for convenient inter-beach transit.",
        "Carry cash for beach shacks as network connectivity can vary.",
        "Sunset at northern cliffs is ideal around 6:00 PM.",
      ],
    },
    kerala: {
      spots: [
        "Fort Kochi Chinese Fishing Nets & Jew Town",
        "Munnar Tea Plantations & Mattupetty Dam",
        "Alleppey Backwaters Houseboat Cruise",
        "Varkala Cliff Beach & Sunset Cafe",
        "Periyar Wildlife Sanctuary boat safari",
        "Athirappilly Waterfalls scenic view",
      ],
      foods: [
        "Kerala Sadya on banana leaf",
        "Appam with vegetable stew / Egg roast",
        "Karimeen Pollichathu (Pearl Spot fish)",
        "Malabar Parotta with Kozhi Curry",
      ],
      tips: [
        "Book houseboat slots in Alleppey in advance during peak season.",
        "Carry light rainwear as coastal showers are common.",
      ],
    },
    manali: {
      spots: [
        "Solang Valley adventure sports & cable car",
        "Hadimba Temple pine forest walk",
        "Old Manali hippie cafes & live music",
        "Jogini Waterfall scenic hike",
        "Rohtang Pass snow point exploration",
        "Vashisht Village hot water sulphur springs",
      ],
      foods: [
        "Siddu served with pure ghee and dal",
        "Freshly caught river trout fish",
        "Trout fry & apple crumble pie in Old Manali",
        "Tibetan Thukpa and steamed momos",
      ],
      tips: [
        "Obtain Rohtang Pass permit online at least 2 days in advance.",
        "Layer clothing as mountain temperatures drop sharply after sunset.",
      ],
    },
    jaipur: {
      spots: [
        "Amber Fort elephant & jeep ascent with Sheesh Mahal",
        "Hawa Mahal (Palace of Winds) photo stop & cafe",
        "City Palace royal courtyards and armory museum",
        "Jantar Mantar astronomical observatory",
        "Nahargarh Fort sunset overlooking the Pink City",
        "Johari Bazaar & Bapu Bazaar textile shopping",
      ],
      foods: [
        "Authentic Dal Baati Churma with Gatte ki Sabzi",
        "Pyaaz Kachori from Rawat Mishthan Bhandar",
        "Ghewar & Mawa Kachori sweets",
        "Laal Maas with Bajre ki Roti",
      ],
      tips: [
        "Purchase the composite monuments entry ticket for major landmarks.",
        "Bargaining is customary in traditional craft bazaars.",
      ],
    },
  };

  // Find best match or generate sensible defaults
  const matchedKey = Object.keys(spotDatabase).find((k) => destLower.includes(k));
  const dataset = matchedKey ? spotDatabase[matchedKey] : {
    spots: [
      `${destination} Historic Old Town & Landmark Tour`,
      `${destination} Scenic Viewpoint & Botanical Gardens`,
      `${destination} Cultural Heritage Museum & Galleries`,
      `${destination} Vibrant Promenade & Local Artisan Markets`,
      `${destination} Riverside / Waterfront Sunset Walk`,
      `${destination} Architecture & Historic District Walk`,
    ],
    foods: [
      `Local traditional specialty lunch in ${destination}`,
      `Authentic regional dinner and street food delicacies`,
      `Artisan coffee and pastries at a historic cafe`,
      `Traditional multi-course feast with local seasonal dishes`,
    ],
    tips: [
      `Check local monument timings and book online where available.`,
      `Carry comfortable walking shoes and stay hydrated.`,
      `Local markets accept UPI and cards, but keep small cash handy.`,
    ],
  };

  const days: StructuredItinerary["days"] = [];
  const perDayCost = budget ? Math.round(budget / daysCount) : 3500;
  const currentDataset = dataset || {
    spots: ["City Promenade & Cultural Walk", "Old Town Heritage Square"],
    foods: ["Signature Local Specialty", "Traditional Regional Platter"],
    tips: ["Wear comfortable shoes", "Stay hydrated"],
  };
  const spots = currentDataset.spots.length > 0 ? currentDataset.spots : ["City Center", "Local Market"];
  const foods = currentDataset.foods.length > 0 ? currentDataset.foods : ["Local Dish", "Regional Cuisine"];
  const tips = currentDataset.tips || [];

  for (let i = 1; i <= daysCount; i++) {
    const spotMorning = spots[(i * 2 - 2) % spots.length] || "City Center";
    const spotAfternoon = spots[(i * 2 - 1) % spots.length] || "Cultural Quarter";
    const spotEvening = `${destination} Sunset Vista & Night Walk`;

    const matchedService = matchedServices[(i - 1) % (matchedServices.length || 1)];

    const morningCost = Math.round(perDayCost * 0.3);
    const afternoonCost = Math.round(perDayCost * 0.4);
    const eveningCost = Math.round(perDayCost * 0.3);

    const morningActivity = {
      itemType: "activity" as const,
      timeSlot: "morning" as const,
      title: spotMorning,
      description: `Start your morning with fresh air and an engaging tour of ${spotMorning}. Capture beautiful morning photos before crowds arrive.`,
      location: `${destination}`,
      estimatedCost: `${currency} ${morningCost}`,
      numericCost: morningCost,
      currency,
      matchedServiceId: matchedService?.id,
      isBooked: false,
      orderIndex: 0,
    };

    const afternoonActivity = {
      itemType: "activity" as const,
      timeSlot: "afternoon" as const,
      title: spotAfternoon,
      description: `Explore ${spotAfternoon}. Take time for local craftsmanship, interactive experiences, and refreshing refreshments.`,
      location: `${destination}`,
      estimatedCost: `${currency} ${afternoonCost}`,
      numericCost: afternoonCost,
      currency,
      isBooked: false,
      orderIndex: 1,
    };

    const eveningActivity = {
      itemType: "activity" as const,
      timeSlot: "evening" as const,
      title: spotEvening,
      description: `Relax at ${spotEvening}. Enjoy peaceful twilight views followed by an atmospheric dinner.`,
      location: `${destination}`,
      estimatedCost: `${currency} ${eveningCost}`,
      numericCost: eveningCost,
      currency,
      isBooked: false,
      orderIndex: 2,
    };

    days.push({
      day: i,
      title: i === 1 ? `Arrival & First Impressions of ${destination}` : i === daysCount ? `Farewell ${destination} & Souvenir Highlights` : `Exploring Highlights & Culture — Day ${i}`,
      theme: i === 1 ? "Arrival & Orientation" : i % 2 === 0 ? "Adventure & Discovery" : "Heritage & Leisure",
      morning: morningActivity,
      afternoon: afternoonActivity,
      evening: eveningActivity,
      activities: [morningActivity, afternoonActivity, eveningActivity],
      foodSuggestions: [
        foods[(i - 1) % foods.length] || "Local Specialty",
        foods[i % foods.length] || "Regional Delicacy",
      ],
      estimatedDailyExpense: `${currency} ${perDayCost}`,
      dailyCostNumeric: perDayCost,
      insiderTip: `Visit morning spots before 10:00 AM to enjoy calm atmospheres and avoid peak midday heat.`,
    });
  }

  const totalCost = budget || perDayCost * daysCount;

  return {
    title: `${daysCount}-Day ${destination} Discovery`,
    destination,
    daysCount,
    travelersCount: input.travelers || 2,
    budgetTier: input.budgetTier || "moderate",
    estimatedTotalBudget: budget ? `${currency} ${budget}` : `${currency} ${perDayCost * daysCount}`,
    totalCostNumeric: totalCost,
    currency,
    summary: `A carefully curated ${daysCount}-day ${pace} itinerary for ${group} travellers visiting ${destination}, combining iconic sights, hidden gems, and regional culinary highlights.`,
    travelStyle: input.travelStyle || "balanced",
    travelerType: `${group.toUpperCase()} · ${pace.toUpperCase()} PACE`,
    interests: input.interests || [],
    days,
    practicalTips: [
      ...tips,
      "Keep digital copies of photo IDs and hotel booking confirmations.",
      "Check weather forecasts ahead of time for outdoor activities.",
    ],
    packingAdvice: [
      "Comfortable breathable walking footwear",
      "Sun protection (sunglasses, SPF lotion, hat)",
      "Portable power bank and universal charging adapter",
      "Modest clothing for places of worship and heritage monuments",
    ],
    bestTimeToVisit: "October through March offers the most pleasant temperatures for sightseeing.",
    safetyNotice: SAFETY_DISCLAIMER,
  };
}

/**
 * Generates an itinerary using AI provider (Gemini, OpenAI, or Fallback)
 */
export async function generateItinerary(
  supabase: Client,
  input: ItineraryInput
): Promise<AiResponse> {
  const matchedServices = await getMatchingPlatformServices(
    supabase,
    input.destination,
    input.budget
  );

  const { provider, apiKey } = getActiveAiProvider();

  const systemInstruction = `You are Travezy's expert AI Travel Assistant and Trip Architect.
Your task is to generate realistic, inspiring, high-quality day-by-day travel itineraries.
You MUST output ONLY a valid JSON object matching the exact structure described below.
Do not invent fake platform booking services. We have provided verified platform listings below from our database.
Whenever a verified platform listing fits into a day's schedule, you may reference its ID in matchedServiceId.

Verified Platform Listings in our database:
${formatServicesForPrompt(matchedServices)}

Required JSON Schema:
{
  "destination": string,
  "daysCount": number,
  "estimatedTotalBudget": string,
  "currency": string,
  "summary": string,
  "travelerType": string,
  "days": [
    {
      "day": number,
      "title": string,
      "theme": string,
      "morning": {
        "timeSlot": "morning",
        "title": string,
        "description": string,
        "location": string,
        "estimatedCost": string,
        "matchedServiceId": "UUID if matching verified listing above or omit"
      },
      "afternoon": {
        "timeSlot": "afternoon",
        "title": string,
        "description": string,
        "location": string,
        "estimatedCost": string
      },
      "evening": {
        "timeSlot": "evening",
        "title": string,
        "description": string,
        "location": string,
        "estimatedCost": string
      },
      "foodSuggestions": [string, string],
      "estimatedDailyExpense": string,
      "insiderTip": string
    }
  ],
  "practicalTips": [string, string, string],
  "packingAdvice": [string, string],
  "bestTimeToVisit": string,
  "safetyNotice": "${SAFETY_DISCLAIMER}"
}
Always provide realistic daily expenses in the requested currency (${input.currency}).`;

  let itinerary: StructuredItinerary | null = null;
  let replyText = "";
  let providerUsed = provider;

  if (provider === "gemini" && apiKey) {
    try {
      const prompt = `Plan a ${input.days}-day itinerary to ${input.destination} for ${input.travelers} ${input.groupType} traveler(s).
Budget: ${input.budget ? `${input.currency} ${input.budget}` : "flexible / moderate"}.
Interests: ${input.interests.length ? input.interests.join(", ") : "Sightseeing, Local culture, Nature, Food"}.
Pace: ${input.activityPace}.
Additional Notes: ${input.customNotes || "None"}.
Return ONLY the raw JSON object.`;

      const rawJson = await callGeminiApi(apiKey, systemInstruction, [
        { role: "user", parts: [{ text: prompt }] },
      ]);

      const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      itinerary = structuredItinerarySchema.parse(parsed);
      replyText = itinerary.summary;
    } catch (err: any) {
      console.warn("[AI Provider] Gemini API failed, falling back to smart engine:", err.message);
      providerUsed = "fallback";
    }
  } else if (provider === "openai" && apiKey) {
    try {
      const prompt = `Plan a ${input.days}-day itinerary to ${input.destination} for ${input.travelers} ${input.groupType} traveler(s).
Budget: ${input.budget ? `${input.currency} ${input.budget}` : "flexible"}.
Interests: ${input.interests.join(", ") || "General sightseeing"}.
Pace: ${input.activityPace}.
Return ONLY the raw JSON object.`;

      const rawJson = await callOpenAiApi(apiKey, systemInstruction, [
        { role: "user", content: prompt },
      ]);

      const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      itinerary = structuredItinerarySchema.parse(parsed);
      replyText = itinerary.summary;
    } catch (err: any) {
      console.warn("[AI Provider] OpenAI API failed, falling back to smart engine:", err.message);
      providerUsed = "fallback";
    }
  }

  if (!itinerary) {
    itinerary = generateSmartFallbackItinerary(input, matchedServices);
    replyText = itinerary.summary;
  }

  return {
    reply: replyText,
    itinerary,
    recommendedServices: matchedServices,
    suggestedFollowUps: [
      "Make this itinerary more budget-friendly",
      "Suggest more food and cafe spots",
      "Add outdoor adventure activities",
      "Slow down the pace for a relaxing vacation",
    ],
    safetyNotice: SAFETY_DISCLAIMER,
    providerUsed,
  };
}

/**
 * Handles multi-turn conversational chat with context retention and grounding
 */
export async function processChatConversation(
  supabase: Client,
  userMessage: string,
  history: ChatMessage[] = [],
  preferences?: { [K in keyof ItineraryInput]?: ItineraryInput[K] | undefined } | undefined
): Promise<AiResponse> {
  const cleanMsg = userMessage.trim();
  if (!cleanMsg) {
    throw new Error("Message cannot be empty");
  }

  // Extract destination hints from current message or conversation history
  const destinationMatch =
    cleanMsg.match(/(?:to|in|visit|explore|trip to|travel to)\s+([A-Za-z\s]+?)(?:\s+for|\s+under|\s+with|\s+next|\.|\?|$)/i) ||
    cleanMsg.match(/\b(goa|kerala|manali|jaipur|kashmir|leh|delhi|mumbai|agra|udaipur|bali|paris|tokyo|dubai)\b/i);

  let targetDestination = preferences?.destination;
  if (destinationMatch && destinationMatch[1]) {
    targetDestination = destinationMatch[1].trim();
  } else if (!targetDestination) {
    // Check history for recent destination
    for (let i = history.length - 1; i >= 0; i--) {
      const hist = history[i];
      if (hist && hist.itinerary?.destination) {
        targetDestination = hist.itinerary.destination;
        break;
      }
    }
  }

  // Extract days hints
  const daysMatch = cleanMsg.match(/(\d+)\s*[- ]*(?:day|days|d)\b/i);
  const targetDays = daysMatch && daysMatch[1] ? Math.min(14, Math.max(1, parseInt(daysMatch[1], 10))) : (preferences?.days || 3);

  // Extract budget hints
  const budgetMatch = cleanMsg.match(/(?:under|budget|for|around)\s*(?:₹|rs\.?|inr|\$)?\s*([\d,]+)/i);
  const targetBudget = budgetMatch && budgetMatch[1] ? parseInt(budgetMatch[1].replace(/,/g, ""), 10) : preferences?.budget;

  // Retrieve platform services
  const matchedServices = await getMatchingPlatformServices(
    supabase,
    targetDestination,
    targetBudget
  );

  const { provider, apiKey } = getActiveAiProvider();

  const isItineraryRequest =
    /plan|itinerary|trip|schedule|days|day trip|visit|places to visit|suggest/i.test(cleanMsg) ||
    history.some((h) => !!h.itinerary);

  const systemInstruction = `You are Travezy's intelligent AI Travel Assistant.
You assist travelers with destination ideas, travel tips, day-by-day itineraries, budgeting, and local culture.
Be concise, inspiring, practical, and friendly.

Guidelines:
1. When recommending services or hotels, cite real listings from the verified platform database provided below whenever relevant. Never invent fake platform names or listings.
2. Dynamic details disclaimer: Always remind users that opening hours, ticket rates, and weather are subject to change.
3. If the user asks for a trip plan or asks to modify a previous itinerary (e.g., "make it cheaper", "add romantic spots"), provide structured travel recommendations.

Verified Platform Listings in our database:
${formatServicesForPrompt(matchedServices)}`;

  let reply = "";
  let structuredItin: StructuredItinerary | undefined = undefined;
  let providerUsed = provider;

  if (provider === "gemini" && apiKey) {
    try {
      const contents = history.slice(-6).map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      }));

      contents.push({
        role: "user",
        parts: [{ text: cleanMsg }],
      });

      reply = await callGeminiApi(apiKey, systemInstruction, contents);
    } catch (err: any) {
      console.warn("[Chat] Gemini API failed, falling back:", err.message);
      providerUsed = "fallback";
    }
  } else if (provider === "openai" && apiKey) {
    try {
      const messages = history.slice(-6).map((h) => ({
        role: h.role === "assistant" ? "assistant" : "user",
        content: h.content,
      }));

      messages.push({ role: "user", content: cleanMsg });

      reply = await callOpenAiApi(apiKey, systemInstruction, messages);
    } catch (err: any) {
      console.warn("[Chat] OpenAI API failed, falling back:", err.message);
      providerUsed = "fallback";
    }
  }

  // If no reply from external API, use smart conversational fallback
  if (!reply) {
    providerUsed = "fallback";
    const dest = targetDestination || "Goa";

    if (isItineraryRequest) {
      structuredItin = generateSmartFallbackItinerary(
        {
          destination: dest,
          days: targetDays,
          budget: targetBudget,
          currency: "INR",
          travelers: preferences?.travelers || 1,
          groupType: preferences?.groupType || "solo",
          interests: preferences?.interests || ["Sightseeing", "Food", "Culture"],
          activityPace: preferences?.activityPace || "moderate",
        },
        matchedServices
      );

      reply = `Here is your customized **${targetDays}-day trip plan for ${dest}**! ${
        targetBudget ? `tailored for a budget of ₹${targetBudget.toLocaleString()}` : ""
      }\n\n${structuredItin.summary}\n\nExplore each day's morning, afternoon, and evening activities below, along with verified experiences available on Travezy.`;
    } else {
      reply = `I'd love to help you explore **${dest}**! Whether you're looking for iconic attractions, hidden beaches, culinary hotspots, or verified local guides, let me know your preferred travel dates and budget to build an exact day-by-day itinerary.`;
    }
  } else if (isItineraryRequest && targetDestination) {
    // Generate companion structured itinerary for the UI cards
    structuredItin = generateSmartFallbackItinerary(
      {
        destination: targetDestination,
        days: targetDays,
        budget: targetBudget,
        currency: "INR",
        travelers: preferences?.travelers || 1,
        groupType: preferences?.groupType || "solo",
        interests: preferences?.interests || [],
        activityPace: preferences?.activityPace || "moderate",
      },
      matchedServices
    );
  }

  return {
    reply,
    itinerary: structuredItin,
    recommendedServices: matchedServices,
    suggestedFollowUps: [
      targetDestination ? `Plan a 3-day trip to ${targetDestination}` : "Plan a 3-day trip to Goa under ₹15,000",
      "Suggest romantic places for couples",
      "What are the best local food dishes to try?",
      "Find top-rated adventure activities",
    ],
    safetyNotice: SAFETY_DISCLAIMER,
    providerUsed,
  };
}

// ─── LANGUAGE TRANSLATION ENGINE ─────────────────────────────────────────────

/**
 * Basic heuristic script & language detector for auto-detect mode
 */
export function detectLanguageFromText(text: string): string {
  const sample = text.trim();
  if (!sample) return "en";

  // Check Devanagari script (Hindi / Marathi)
  if (/[\u0900-\u097F]/.test(sample)) return "hi";
  // Check Telugu script
  if (/[\u0C00-\u0C7F]/.test(sample)) return "te";
  // Check Tamil script
  if (/[\u0B80-\u0BFF]/.test(sample)) return "ta";
  // Check Malayalam script
  if (/[\u0D00-\u0D7F]/.test(sample)) return "ml";
  // Check Kannada script
  if (/[\u0C80-\u0CFF]/.test(sample)) return "kn";
  // Check Bengali script
  if (/[\u0980-\u09FF]/.test(sample)) return "bn";
  // Check Gujarati script
  if (/[\u0A80-\u0AFF]/.test(sample)) return "gu";
  // Check Arabic script
  if (/[\u0600-\u06FF]/.test(sample)) return "ar";
  // Check Japanese script
  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(sample)) return "ja";

  // Check French markers
  if (/(?:^|\s|[.,!?'"«»])(où|ou|bonjour|merci|trouve|vous|nous|pla[iî]t|comment|combien)(?:$|\s|[.,!?'"«»])/i.test(sample)) return "fr";
  // Check Spanish markers
  if (/(?:^|\s|[.,!?'"«»])(hola|gracias|dónde|donde|está|esta|por\s+favor|cuánto|cuanto|ayuda)(?:$|\s|[.,!?'"«»])/i.test(sample)) return "es";
  // Check German markers
  if (/(?:^|\s|[.,!?'"«»])(guten\s+tag|danke|wo\s+ist|bitte|nicht|krankenhaus|bahnhof)(?:$|\s|[.,!?'"«»])/i.test(sample)) return "de";

  return "en";
}

/** Travel phrases dictionary for instant zero-latency caching & offline support */
const PHRASE_DICTIONARY: Record<string, Record<string, string>> = {
  "where is the nearest hospital?": {
    hi: "निकटतम अस्पताल कहाँ है?",
    te: "సమీపంలోని ఆసుపత్రి ఎక్కడ ఉంది?",
    ta: "அருகிலுள்ள மருத்துவமனை எங்கே உள்ளது?",
    ml: "ഏറ്റവും അടുത്തുള്ള ആശുപത്രി എവിടെയാണ്?",
    kn: "ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ?",
    mr: "जवळचे रुग्णालय कुठे आहे?",
    bn: "নিকটবর্তী হাসপাতালটি কোথায়?",
    gu: "સૌથી નજીકની હોસ્પિટલ ક્યાં છે?",
    es: "¿Dónde está el hospital más cercano?",
    fr: "Où se trouve l'hôpital le plus proche ?",
    de: "Wo ist das nächste Krankenhaus?",
    ja: "一番近い病院はどこですか？",
    ar: "أين أقرب مستشفى؟",
    it: "Dov'è l'ospedale più vicino?",
    en: "Where is the nearest hospital?",
  },
  "i need help.": {
    hi: "मुझे मदद चाहिए।",
    te: "నాకు సహాయం కావాలి.",
    ta: "எனக்கு உதவி தேவை.",
    ml: "എനിക്ക് സഹായം വേണം.",
    kn: "ನನಗೆ ಸಹಾಯ ಬೇಕು.",
    mr: "मला मदतीची गरज आहे.",
    bn: "আমার সাহায্য দরকার।",
    gu: "મને મદદની જરૂર છે.",
    es: "Necesito ayuda.",
    fr: "J'ai besoin d'aide.",
    de: "Ich brauche Hilfe.",
    ja: "助けが必要です。",
    ar: "أحتاج إلى مساعدة.",
    it: "Ho bisogno di aiuto.",
    en: "I need help.",
  },
  "i need urgent medical help.": {
    hi: "मुझे तत्काल चिकित्सा सहायता की आवश्यकता है।",
    te: "నాకు అత్యవసర వైద్య సహాయం కావాలి.",
    ta: "எனக்கு அவசர மருத்துவ உதவி தேவை.",
    ml: "എനിക്ക് അടിയന്തര വൈദ്യസഹായം വേണം.",
    kn: "ನನಗೆ ತುರ್ತು ವೈದ್ಯಕೀಯ ಸಹಾಯ ಬೇಕು.",
    mr: "मला तातडीने वैद्यकीय मदतीची गरज आहे.",
    bn: "আমার জরুরি চিকিৎসা সহায়তা প্রয়োজন।",
    gu: "મને તાત્કાલિક તબીબી સહાયની જરૂર છે.",
    es: "Necesito ayuda médica urgente.",
    fr: "J'ai besoin d'une aide médicale urgente.",
    de: "Ich brauche dringend medizinische Hilfe.",
    ja: "緊急の医療支援が必要です。",
    ar: "أحتاج إلى مساعدة طبية عاجلة.",
    it: "Ho bisogno di cure mediche urgenti.",
    en: "I need urgent medical help.",
  },
  "where is my hotel?": {
    hi: "मेरा होटल कहाँ है?",
    te: "నా హోటల్ ఎక్కడ ఉంది?",
    ta: "என் ஹோட்டல் எங்கே உள்ளது?",
    ml: "എന്റെ ഹോട്ടൽ എവിടെയാണ്?",
    kn: "ನನ್ನ ಹೋಟೆಲ್ ಎಲ್ಲಿದೆ?",
    mr: "माझे हॉटेल कुठे आहे?",
    bn: "আমার হোটেল কোথায়?",
    gu: "મારી હોટેલ ક્યાં છે?",
    es: "¿Dónde está mi hotel?",
    fr: "Où est mon hôtel ?",
    de: "Wo ist mein Hotel?",
    ja: "私のホテルはどこですか？",
    ar: "أين فندقي؟",
    it: "Dov'è il mio hotel?",
    en: "Where is my hotel?",
  },
  "please call the police.": {
    hi: "कृपया पुलिस को बुलाएं।",
    te: "దయచేసి పోలీసులకు కాల్ చేయండి.",
    ta: "தயவுசெய்து காவல்துறையை அழைக்கவும்.",
    ml: "ദയവായി പോലീസിനെ വിളിക്കൂ.",
    kn: "ದಯವಿಟ್ಟು ಪೊಲೀಸರನ್ನು ಕರೆಯಿರಿ.",
    mr: "कृपया पोलिसांना बोलवा.",
    bn: "দয়া করে পুলিশকে ডাকুন।",
    gu: "કૃપા કરીને પોલીસને બોલાવો.",
    es: "Por favor llame a la policía.",
    fr: "Veuillez appeler la police.",
    de: "Bitte rufen Sie die Polizei.",
    ja: "警察を呼んでください。",
    ar: "يرجى الاتصال بالشرطة.",
    it: "Per favore chiami la polizia.",
    en: "Please call the police.",
  },
  "i have a booking.": {
    hi: "मेरी बुकिंग है।",
    te: "నాకు బుకింగ్ ఉంది.",
    ta: "என்னிடம் முன்பதிவு உள்ளது.",
    ml: "എനിക്ക് ഒരു ബുക്കിംഗ് ഉണ്ട്.",
    kn: "ನನ್ನ ಬಳಿ ಬುಕಿಂಗ್ ಇದೆ.",
    mr: "माझे बुकिंग आहे.",
    bn: "আমার একটি বুকিং আছে।",
    gu: "મારું બુકિંગ છે.",
    es: "Tengo una reserva.",
    fr: "J'ai une réservation.",
    de: "Ich habe eine Buchung.",
    ja: "予約があります。",
    ar: "لدي حجز.",
    it: "Ho una prenotazione.",
    en: "I have a booking.",
  },
  "i have a confirmed booking with travezy.": {
    hi: "मेरी Travezy के साथ कन्फर्म बुकिंग है।",
    te: "నాకు Travezyతో నిర్ధారిత బుకింగ్ ఉంది.",
    ta: "என்னிடம் Travezy உடன் உறுதிப்படுத்தப்பட்ட முன்பதிவு உள்ளது.",
    ml: "എനിക്ക് Travezy-ൽ സ്ഥിരീകരിച്ച ബുക്കിംഗ് ഉണ്ട്.",
    kn: "ನನ್ನ ಬಳಿ Travezy ನೊಂದಿಗೆ ದೃಢಪಡಿಸಿದ ಬುಕಿಂಗ್ ಇದೆ.",
    mr: "माझे Travezy सोबत निश्चित बुकिंग आहे.",
    bn: "আমার Travezy-র সাথে একটি নিশ্চিত বুকিং আছে।",
    gu: "મારી પાસે Travezy સાથે કન્ફર્મ બુકિંગ છે.",
    es: "Tengo una reserva confirmada con Travezy.",
    fr: "J'ai une réservation confirmée avec Travezy.",
    de: "Ich habe eine bestätigte Buchung bei Travezy.",
    ja: "Travezyで予約が確定しています。",
    ar: "لدي حجز مؤكد مع Travezy.",
    it: "Ho una prenotazione confermata con Travezy.",
    en: "I have a confirmed booking with Travezy.",
  },
  "can you help me find this location?": {
    hi: "क्या आप मुझे यह स्थान खोजने में मदद कर सकते हैं?",
    te: "ఈ స్థలాన్ని కనుగొనడంలో మీరు నాకు సహాయం చేయగలరా?",
    ta: "இந்த இடத்தை கண்டுபிடிக்க எனக்கு உதவ முடியுமா?",
    ml: "ഈ സ്ഥലം കണ്ടെത്താൻ എന്നെ സഹായിക്കാമോ?",
    kn: "ಈ ಸ್ಥಳವನ್ನು ಹುಡುಕಲು ನೀವು ನನಗೆ ಸಹಾಯ ಮಾಡಬಹುದೇ?",
    mr: "हे ठिकाण शोधण्यासाठी तुम्ही मला मदत करू शकता का?",
    bn: "আপনি কি আমাকে এই অবস্থানটি খুঁজে পেতে সাহায্য করতে পারেন?",
    gu: "શું તમે મને આ સ્થાન શોધવામાં મદદ કરી શકો છો?",
    es: "¿Puedes ayudarme a encontrar esta ubicación?",
    fr: "Pouvez-vous m'aider à trouver cet endroit ?",
    de: "Können Sie mir helfen, diesen Ort zu finden?",
    ja: "この場所を見つけるのを手伝っていただけますか？",
    ar: "هل يمكنك مساعدتي في العثور على هذا الموقع؟",
    it: "Puoi aiutarmi a trovare questa posizione?",
    en: "Can you help me find this location?",
  },
  "where is the nearest bus station?": {
    hi: "निकटतम बस स्टेशन कहाँ है?",
    te: "సమీప బస్ స్టేషన్ ఎక్కడ ఉంది?",
    ta: "அருகிலுள்ள பேருந்து நிலையம் எங்கே உள்ளது?",
    ml: "ഏറ്റവും അടുത്തുള്ള ബസ് സ്റ്റേഷൻ എവിടെയാണ്?",
    kn: "ಹತ್ತಿರದ ಬಸ್ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?",
    mr: "जवळचे बस स्थानक कुठे आहे?",
    bn: "নিকটতম বাস স্টেশন কোথায়?",
    gu: "સૌથી નજીકનું બસ સ્ટેશન ક્યાં છે?",
    es: "¿Dónde está la estación de autobuses más cercana?",
    fr: "Où est la gare routière la plus proche ?",
    de: "Wo ist der nächste Busbahnhof?",
    ja: "一番近いバス停はどこですか？",
    ar: "أين أقرب محطة حافلات؟",
    it: "Dov'è la stazione degli autobus più vicina?",
    en: "Where is the nearest bus station?",
  },
  "where is the nearest pharmacy or medical store?": {
    hi: "निकटतम फार्मेसी या मेडिकल स्टोर कहाँ है?",
    te: "సమీప ఫార్మసీ లేదా మెడికల్ స్టోర్ ఎక్కడ ఉంది?",
    ta: "அருகிலுள்ள மருந்தகம் எங்கே உள்ளது?",
    ml: "ഏറ്റവും അടുത്തുള്ള ഫാർമസി എവിടെയാണ്?",
    kn: "ಹತ್ತಿರದ ಔಷಧಾಲಯ ಎಲ್ಲಿದೆ?",
    mr: "जवळचे मेडिकल स्टोअर कुठे आहे?",
    bn: "নিকটতম ওষুধের দোকান কোথায়?",
    gu: "સૌથી નજીકની ફાર્મસી ક્યાં છે?",
    es: "¿Dónde está la farmacia más cercana?",
    fr: "Où se trouve la pharmacie la plus proche ?",
    de: "Wo ist die nächste Apotheke?",
    ja: "一番近い薬局はどこですか？",
    ar: "أين أقرب صيدلية؟",
    it: "Dov'è la farmacia più vicina?",
    en: "Where is the nearest pharmacy or medical store?",
  },
  "i have lost my passport and wallet.": {
    hi: "मेरा पासपोर्ट और बटुआ खो गया है।",
    te: "నా పాస్‌పోర్ట్ మరియు వాలెట్ పోయాయి.",
    ta: "என் கடவுச்சீட்டு மற்றும் பணப்பை தொலைந்துவிட்டது.",
    ml: "എന്റെ പാസ്‌പോർട്ടും വാലറ്റും നഷ്ടപ്പെട്ടു.",
    kn: "ನನ್ನ ಪಾಸ್‌ಪೋರ್ಟ್ ಮತ್ತು ವ್ಯಾಲೆಟ್ ಕಳೆದುಹೋಗಿದೆ.",
    mr: "माझा पासपोर्ट आणि पाकीट हरवले आहे.",
    bn: "আমার পাসপোর্ট এবং মানিব্যাগ হারিয়ে গেছে।",
    gu: "મારો પાસપોર્ટ અને પાકીટ ખોવાઈ ગયા છે.",
    es: "He perdido mi pasaporte y mi billetera.",
    fr: "J'ai perdu mon passeport et mon portefeuille.",
    de: "Ich habe meinen Reisepass und meine Brieftasche verloren.",
    ja: "パスポートと財布をなくしました。",
    ar: "لقد فقدت جواز سفري ومحفظتي.",
    it: "Ho perso il passaporto e il portafoglio.",
    en: "I have lost my passport and wallet.",
  },
  "how do i get to the train station / airport?": {
    hi: "मैं रेलवे स्टेशन / हवाई अड्डे तक कैसे पहुँचूँ?",
    te: "నేను రైల్వే స్టేషన్ / విమానాశ్రయానికి ఎలా చేరుకోవాలి?",
    ta: "நான் ரயில் நிலையம் / விமான நிலையத்திற்கு எப்படி செல்வது?",
    ml: "റെയിൽവേ സ്റ്റേഷനിലേക്ക് / വിമാനത്താവളത്തിലേക്ക് എങ്ങനെ പോകാം?",
    kn: "ರೈಲ್ವೆ ನಿಲ್ದಾಣ / ವಿಮಾನ ನಿಲ್ದಾಣಕ್ಕೆ ಹೇಗೆ ಹೋಗುವುದು?",
    mr: "मी रेल्वे स्टेशन / विमानतळावर कसे जाऊ?",
    bn: "আমি কীভাবে ট্রেন স্টেশন / বিমানবন্দরে যাব?",
    gu: "હું ટ્રેન સ્ટેશન / એરપોર્ટ પર કેવી રીતે પહોંચી શકું?",
    es: "¿Cómo llego a la estación de tren / aeropuerto?",
    fr: "Comment puis-je me rendre à la gare / à l'aéroport ?",
    de: "Wie komme ich zum Bahnhof / Flughafen?",
    ja: "駅・空港への行き方を教えてください。",
    ar: "كيف أصل إلى محطة القطار / المطار؟",
    it: "Come arrivo alla stazione ferroviaria / aeroporto?",
    en: "How do I get to the train station / airport?",
  },
  "can you help me find this location on the map?": {
    hi: "क्या आप मुझे मानचित्र पर यह स्थान खोजने में मदद कर सकते हैं?",
    te: "మ్యాప్‌లో ఈ స్థలాన్ని కనుగొనడంలో మీరు నాకు సహాయం చేయగలరా?",
    ta: "வரைபடத்தில் இந்த இடத்தைக் கண்டறிய எனக்கு உதவ முடியுமா?",
    ml: "മാപ്പിൽ ഈ സ്ഥലം കണ്ടെത്താൻ എന്നെ സഹായിക്കാമോ?",
    kn: "ನಕ್ಷೆಯಲ್ಲಿ ಈ ಸ್ಥಳವನ್ನು ಹುಡುಕಲು ನೀವು ನನಗೆ ಸಹಾಯ ಮಾಡಬಹುದೇ?",
    mr: "नकाशावर हे ठिकाण शोधण्यात मला मदत करू शकता का?",
    bn: "আপনি কি মানচিত্রে এই অবস্থানটি খুঁজে পেতে আমাকে সাহায্য করতে পারেন?",
    gu: "શું તમે મને નકશા પર આ સ્થાન શોધવામાં મદદ કરી શકો છો?",
    es: "¿Puedes ayudarme a encontrar esta ubicación en el mapa?",
    fr: "Pouvez-vous m'aider à trouver cet endroit sur la carte ?",
    de: "Können Sie mir helfen, diesen Ort auf der Karte zu finden?",
    ja: "地図上でこの場所を見つけるのを手伝っていただけますか？",
    ar: "هل يمكنك مساعدتي في العثور على هذا الموقع على الخريطة؟",
    it: "Puoi aiutarmi a trovare questa posizione sulla mappa?",
    en: "Can you help me find this location on the map?",
  },
  "how far is the beach from here?": {
    hi: "यहाँ से समुद्र तट कितनी दूर है?",
    te: "ఇక్కడి నుండి బీచ్ ఎంత దూరంలో ఉంది?",
    ta: "இங்கிருந்து கடற்கரை எவ்வளவு தூரம்?",
    ml: "ഇവിടെ നിന്ന് ബീച്ചിലേക്ക് എത്ര ദൂരമുണ്ട്?",
    kn: "ಇಲ್ಲಿಂದ ಬೀಚ್ ಎಷ್ಟು ದೂರವಿದೆ?",
    mr: "येथून समुद्रकिनारा किती अंतरावर आहे?",
    bn: "এখান থেকে সৈকত কত দূরে?",
    gu: "અહીંથી દરિયાકિનારો કેટલો દૂર છે?",
    es: "¿A qué distancia está la playa de aquí?",
    fr: "À quelle distance se trouve la plage d'ici ?",
    de: "Wie weit ist der Strand von hier entfernt?",
    ja: "ここからビーチまでどのくらいありますか？",
    ar: "كم يبعد الشاطئ من هنا؟",
    it: "Quanto dista la spiaggia da qui?",
    en: "How far is the beach from here?",
  },
  "which taxi or auto-rickshaw should i take?": {
    hi: "मुझे कौन सी टैक्सी या ऑटो-रिक्शा लेना चाहिए?",
    te: "నేను ఏ టాక్సీ లేదా ఆటో రిక్షా తీసుకోవాలి?",
    ta: "நான் எந்த டாக்ஸி அல்லது ஆட்டோ ரிக்ஷாவை எடுக்க வேண்டும்?",
    ml: "ഞാൻ ഏത് ടാക്സിയോ ഓട്ടോറിക്ഷയോ എടുക്കണം?",
    kn: "ನಾನು ಯಾವ ಟ್ಯಾಕ್ಸಿ ಅಥವಾ ಆಟೋ ರಿಕ್ಷಾ ತೆಗೆದುಕೊಳ್ಳಬೇಕು?",
    mr: "मी कोणती टॅक्सी किंवा ऑटो-रिक्षा घ्यावी?",
    bn: "আমার কোন ট্যাক্সি বা অটো-রিকশা নেওয়া উচিত?",
    gu: "મારે કઈ ટેક્સી કે ઓટો-રિક્ષા લેવી જોઈએ?",
    es: "¿Qué taxi o auto-rickshaw debo tomar?",
    fr: "Quel taxi ou auto-rickshaw dois-je prendre ?",
    de: "Welches Taxi oder welche Autorikscha soll ich nehmen?",
    ja: "どのタクシーまたはオートリクシャーに乗るべきですか？",
    ar: "أي سيارة أجرة أو توك توك يجب أن أستقلها؟",
    it: "Quale taxi o risciò dovrei prendere?",
    en: "Which taxi or auto-rickshaw should I take?",
  },
  "what time is check-in and check-out?": {
    hi: "चेक-इन और चेक-आउट का समय क्या है?",
    te: "చెక్-ఇన్ మరియు చెక్-అవుట్ సమయం ఎంత?",
    ta: "செக்-இன் மற்றும் செக்-அவுட் நேரம் என்ன?",
    ml: "ചെക്ക്-ഇൻ, ചെക്ക്-ഔട്ട് സമയം എപ്പോഴാണ്?",
    kn: "ಚೆಕ್-ಇನ್ ಮತ್ತು ಚೆಕ್-ಔಟ್ ಸಮಯ ಎಷ್ಟು?",
    mr: "चेक-इन आणि चेक-आउट वेळ काय आहे?",
    bn: "চেক-ইন এবং চেক-আউটের সময় কখন?",
    gu: "ચેક-ઇન અને ચેક-આઉટનો સમય શું છે?",
    es: "¿A qué hora es el check-in y check-out?",
    fr: "À quelle heure sont le check-in et le check-out ?",
    de: "Wann ist Check-in und Check-out?",
    ja: "チェックインとチェックアウトの時間は何時ですか？",
    ar: "ما هو وقت تسجيل الوصول وتسجيل المغادرة؟",
    it: "A che ora sono il check-in e il check-out?",
    en: "What time is check-in and check-out?",
  },
  "can i leave my luggage here for a few hours?": {
    hi: "क्या मैं अपना सामान कुछ घंटों के लिए यहाँ छोड़ सकता हूँ?",
    te: "నేను నా లగేజీని కొన్ని గంటల పాటు ఇక్కడ ఉంచవచ్చా?",
    ta: "என் சாமான்களை சில மணி நேரம் இங்கே வைக்கலாமா?",
    ml: "എനിക്ക് കുറച്ച് മണിക്കൂർ ഇവിടെ ലഗേജ് വെക്കാമോ?",
    kn: "ನನ್ನ ಲಗೇಜ್ ಅನ್ನು ಕೆಲವು ಗಂಟೆಗಳ ಕಾಲ ಇಲ್ಲಿ ಇಡಬಹುದೇ?",
    mr: "मी माझे सामान काही तास येथे ठेवू शकतो का?",
    bn: "আমি কি কয়েক ঘণ্টার জন্য এখানে আমার লাগেজ রেখে যেতে পারি?",
    gu: "શું હું મારો સામાન થોડા કલાકો માટે અહીં રાખી શકું?",
    es: "¿Puedo dejar mi equipaje aquí unas horas?",
    fr: "Puis-je laisser mes bagages ici pendant quelques heures ?",
    de: "Kann ich mein Gepäck für ein paar Stunden hier lassen?",
    ja: "荷物を数時間ここに預けることはできますか？",
    ar: "هل يمكنني ترك أمتعتي هنا لبضع ساعات؟",
    it: "Posso lasciare i bagagli qui per qualche ora?",
    en: "Can I leave my luggage here for a few hours?",
  },
  "is wi-fi available in the room?": {
    hi: "क्या कमरे में वाई-फाई उपलब्ध है?",
    te: "గదిలో వై-ఫై అందుబాటులో ఉందా?",
    ta: "அறையில் வைஃபை வசதி உள்ளதா?",
    ml: "മുറിയിൽ വൈഫൈ ലഭ്യമാണോ?",
    kn: "ಕೋಣೆಯಲ್ಲಿ ವೈ-ಫೈ ಲಭ್ಯವಿದೆಯೇ?",
    mr: "खोलीत वाय-फाय उपलब्ध आहे का?",
    bn: "রুমে কি ওয়াই-ফাই আছে?",
    gu: "રૂમમાં વાઇ-ફાઇ ઉપલબ્ધ છે?",
    es: "¿Hay Wi-Fi disponible en la habitación?",
    fr: "Le Wi-Fi est-il disponible dans la chambre ?",
    de: "Ist WLAN im Zimmer verfügbar?",
    ja: "部屋でWi-Fiは利用できますか？",
    ar: "هل تتوفر خدمة الواي فاي في الغرفة؟",
    it: "Il Wi-Fi è disponibile in camera?",
    en: "Is Wi-Fi available in the room?",
  },
  "how much does this cost?": {
    hi: "इसकी कीमत कितनी है?",
    te: "దీని ధర ఎంత?",
    ta: "இதன் விலை என்ன?",
    ml: "ഇതിന് എത്ര വിലയാകും?",
    kn: "ಇದರ ಬೆಲೆ ಎಷ್ಟು?",
    mr: "याची किंमत किती आहे?",
    bn: "এটির দাম কত?",
    gu: "આની કિંમત કેટલી છે?",
    es: "¿Cuánto cuesta esto?",
    fr: "Combien cela coûte-t-il ?",
    de: "Wie viel kostet das?",
    ja: "これはいくらですか？",
    ar: "كم تكلفة هذا؟",
    it: "Quanto costa questo?",
    en: "How much does this cost?",
  },
  "can you give me a receipt / bill?": {
    hi: "क्या आप मुझे रसीद / बिल दे सकते हैं?",
    te: "మీరు నాకు రసీదు / బిల్లు ఇవ్వగలరా?",
    ta: "எனக்கு ரசீது / பில் தர முடியுமா?",
    ml: "നിങ്ങൾക്ക് എനിക്ക് ഒരു രസീത് / ബിൽ നൽകാമോ?",
    kn: "ನೀವು ನನಗೆ ರಶೀದಿ / ಬಿಲ್ ನೀಡಬಹುದೇ?",
    mr: "तुम्ही मला पावती / बिल देऊ शकता का?",
    bn: "আপনি কি আমাকে একটি রসিদ / বিল দিতে পারেন?",
    gu: "શું તમે મને રસીદ / બિલ આપી શકો છો?",
    es: "¿Puede darme un recibo o factura?",
    fr: "Pouvez-vous me donner un reçu ou une facture ?",
    de: "Können Sie mir eine Quittung / Rechnung geben?",
    ja: "レシート・領収書をいただけますか？",
    ar: "هل يمكنك إعطائي إيصالاً / فاتورة؟",
    it: "Puoi darmi una ricevuta / scontrino?",
    en: "Can you give me a receipt / bill?",
  },
  "is this dish vegetarian / vegan?": {
    hi: "क्या यह व्यंजन शाकाहारी है?",
    te: "ఈ వంటకం శాఖాహారమా?",
    ta: "இந்த உணவு சைவமா?",
    ml: "ഈ വിഭവം വെജിറ്റേറിയൻ / വീഗൻ ആണോ?",
    kn: "ಈ ಖಾದ್ಯ ಸಸ್ಯಾಹಾರವೇ?",
    mr: "हा पदार्थ शाकाहारी आहे का?",
    bn: "এই খাবারটি কি নিরামিষ?",
    gu: "શું આ વાનગી શાકાહારી છે?",
    es: "¿Este plato es vegetariano / vegano?",
    fr: "Ce plat est-il végétarien / végétalien ?",
    de: "Ist dieses Gericht vegetarisch / vegan?",
    ja: "この料理はベジタリアン/ビーガンですか？",
    ar: "هل هذا الطبق نباتي؟",
    it: "Questo piatto è vegetariano / vegano?",
    en: "Is this dish vegetarian / vegan?",
  },
  "is drinking water safe here?": {
    hi: "क्या यहाँ का पीने का पानी सुरक्षित है?",
    te: "ఇక్కడ త్రాగునీరు సురక్షితమేనా?",
    ta: "இங்கு குடிநீர் பாதுகாப்பானதா?",
    ml: "ഇവിടെ കുടിവെള്ളം സുരക്ഷിതമാണോ?",
    kn: "ಇಲ್ಲಿ ಕುಡಿಯುವ ನೀರು ಸುರಕ್ಷಿತವೇ?",
    mr: "येथील पिण्याचे पाणी सुरक्षित आहे का?",
    bn: "এখানে পানীয় জল নিরাপদ?",
    gu: "શું અહીં પીવાનું પાણી સુરક્ષિત છે?",
    es: "¿Es segura el agua potable aquí?",
    fr: "L'eau potable est-elle sûre ici ?",
    de: "Ist das Trinkwasser hier sicher?",
    ja: "ここの飲料水は安全ですか？",
    ar: "هل مياه الشرب آمنة هنا؟",
    it: "L'acqua potabile è sicura qui?",
    en: "Is drinking water safe here?",
  },
  "do you accept upi / card payments?": {
    hi: "क्या आप UPI / कार्ड से भुगतान स्वीकार करते हैं?",
    te: "మీరు UPI / కార్డు చెల్లింపులను అంగీకరిస్తారా?",
    ta: "நீங்கள் UPI / அட்டை கட்டணங்களை ஏற்றுக்கொள்கிறீர்களா?",
    ml: "നിങ്ങൾ UPI / കാർഡ് പേയ്‌മെന്റുകൾ സ്വീകരിക്കുമോ?",
    kn: "ನೀವು UPI / ಕಾರ್ಡ್ ಪಾವತಿಗಳನ್ನು ಸ್ವೀಕರಿಸುತ್ತೀರಾ?",
    mr: "तुम्ही UPI / कार्ड पेमेंट स्वीकारता का?",
    bn: "আপনি কি UPI / কার্ড পেমেন্ট গ্রহণ করেন?",
    gu: "શું તમે UPI / કાર્ડ ચુકવણી સ્વીકારો છો?",
    es: "¿Aceptan pagos con tarjeta o UPI?",
    fr: "Acceptez-vous les paiements par carte ou UPI ?",
    de: "Akzeptieren Sie Kartenzahlungen oder UPI?",
    ja: "UPIやカードでの支払いは可能ですか？",
    ar: "هل تقبلون الدفع عبر البطاقة أو UPI؟",
    it: "Accettate pagamenti con carta o UPI?",
    en: "Do you accept UPI / card payments?",
  },
};

/**
 * High-speed Neural Machine Translation Engine
 * Translates arbitrary user text, phrases, and itineraries into 16+ languages in real-time.
 */
async function translateWithNeuralEngine(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translatedText: string; detectedLang?: string; provider: string } | null> {
  const sl = sourceLang === "auto" ? "auto" : sourceLang;
  const tl = targetLang;

  // Endpoint 1: Google Chrome Neural Engine
  try {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        if (Array.isArray(data[0])) {
          return {
            translatedText: data[0][0] || "",
            detectedLang: data[0][1] || undefined,
            provider: "neural-engine",
          };
        } else if (typeof data[0] === "string") {
          return {
            translatedText: data[0],
            provider: "neural-engine",
          };
        }
      }
    }
  } catch (err: any) {
    console.warn("[Neural Translate] Primary endpoint failed:", err.message);
  }

  // Endpoint 2: Single AT Endpoint
  try {
    const url = `https://translate.google.com/translate_a/single?client=at&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const textParts = data[0].map((item: any) => item[0]).filter(Boolean);
        const translated = textParts.join("");
        const detected = data[2] || undefined;
        if (translated) {
          return {
            translatedText: translated,
            detectedLang: detected,
            provider: "neural-engine",
          };
        }
      }
    }
  } catch (err: any) {
    console.warn("[Neural Translate] Secondary endpoint failed:", err.message);
  }

  // Endpoint 3: MyMemory Translation
  try {
    const sPair = sourceLang === "auto" ? "autodetect" : sourceLang;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sPair}|${tl}&de=travezy_travel_app@gmail.com`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.responseData?.translatedText) {
        return {
          translatedText: data.responseData.translatedText,
          detectedLang: data.matches?.[0]?.source?.slice(0, 2) || undefined,
          provider: "mymemory-engine",
        };
      }
    }
  } catch (err: any) {
    console.warn("[Neural Translate] MyMemory endpoint failed:", err.message);
  }

  return null;
}

/**
 * Fallback translation function for phrases and text
 */
function fallbackTranslate(text: string, targetLang: string): string {
  const norm = text.trim().toLowerCase().replace(/[.,!?:;]/g, "");

  // Check dictionary
  for (const [key, translations] of Object.entries(PHRASE_DICTIONARY)) {
    const keyNorm = key.toLowerCase().replace(/[.,!?:;]/g, "");
    if (norm === keyNorm && translations[targetLang]) {
      return translations[targetLang];
    }
  }

  // Check if text is an itinerary or contains key terms to substitute gracefully
  const langName = SUPPORTED_LANGUAGES[targetLang]?.name || targetLang;

  // Language specific headers
  const headers: Record<string, { day: string; morning: string; afternoon: string; evening: string; tips: string; budget: string }> = {
    hi: { day: "दिन", morning: "सुबह", afternoon: "दोपहर", evening: "शाम", tips: "सुझाव", budget: "बजट" },
    te: { day: "రోజు", morning: "ఉదయం", afternoon: "మధ్యాహ్నం", evening: "సాయంత్రం", tips: "చిట్కాలు", budget: "బడ్జెట్" },
    ta: { day: "நாள்", morning: "காலை", afternoon: "மதியம்", evening: "மாலை", tips: "குறிப்புகள்", budget: "பட்ஜெட்" },
    ml: { day: "ദിവസം", morning: "രാവിലെ", afternoon: "ഉച്ചയ്ക്ക്", evening: "വൈകുന്നേരം", tips: "നുറുങ്ങുകൾ", budget: "ബജറ്റ്" },
    kn: { day: "ದಿನ", morning: "ಮುಂಜಾನೆ", afternoon: "ಮಧ್ಯಾಹ್ನ", evening: "ಸಂಜೆ", tips: "ಸಲಹೆಗಳು", budget: "ಬಜೆಟ್" },
    mr: { day: "दिवस", morning: "सकाळ", afternoon: "दुपार", evening: "संध्याकाळ", tips: "टिपा", budget: "अंदाजपत्रक" },
    bn: { day: "দিন", morning: "সকাল", afternoon: "বিকাল", evening: "সন্ধ্যা", tips: "টিপস", budget: "বাজেট" },
    gu: { day: "દિવસ", morning: "સવાર", afternoon: "બપોર", evening: "સાંજ", tips: "ટિપ્સ", budget: "બજેટ" },
    es: { day: "Día", morning: "Mañana", afternoon: "Tarde", evening: "Noche", tips: "Consejos", budget: "Presupuesto" },
    fr: { day: "Jour", morning: "Matin", afternoon: "Après-midi", evening: "Soir", tips: "Conseils", budget: "Budget" },
    de: { day: "Tag", morning: "Morgen", afternoon: "Nachmittag", evening: "Abend", tips: "Tipps", budget: "Budget" },
    ja: { day: "日目", morning: "朝", afternoon: "午後", evening: "夕方", tips: "ヒント", budget: "予算" },
    ar: { day: "اليوم", morning: "الصباح", afternoon: "بعد الظهر", evening: "المساء", tips: "نصائح", budget: "الميزانية" },
    it: { day: "Giorno", morning: "Mattina", afternoon: "Pomeriggio", evening: "Sera", tips: "Consigli", budget: "Budget" },
  };

  const h = headers[targetLang];
  if (h) {
    let replaced = text
      .replace(/\bDay\s*(\d+)/gi, `${h.day} $1`)
      .replace(/\bMorning\b/gi, h.morning)
      .replace(/\bAfternoon\b/gi, h.afternoon)
      .replace(/\bEvening\b/gi, h.evening)
      .replace(/\bPractical Tips\b/gi, h.tips)
      .replace(/\bBudget\b/gi, h.budget);

    return replaced;
  }

  return `[${langName}] ${text}`;
}

/**
 * Translates travel text between languages preserving proper nouns, numbers, currencies and formatting.
 */
export async function translateTravelText(
  request: TranslationRequest
): Promise<TranslationResponse> {
  const { text, targetLanguage } = request;
  let sourceLanguage = request.sourceLanguage || "auto";

  if (!text || !text.trim()) {
    throw new Error("Text to translate cannot be empty");
  }

  // Handle auto-detect heuristic
  let detectedLang = sourceLanguage;
  if (sourceLanguage === "auto") {
    detectedLang = detectLanguageFromText(text);
  }

  // Same language short-circuit
  if (sourceLanguage !== "auto" && sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
    return {
      originalText: text,
      translatedText: text,
      sourceLanguage,
      targetLanguage,
      detectedLanguage: detectedLang,
      providerUsed: "direct",
    };
  }

  // Check instant phrase dictionary cache first for ultra-fast response
  const normKey = text.trim().toLowerCase().replace(/[.,!?:;]/g, "");
  for (const [key, translations] of Object.entries(PHRASE_DICTIONARY)) {
    const keyNorm = key.toLowerCase().replace(/[.,!?:;]/g, "");
    if (normKey === keyNorm && translations[targetLanguage]) {
      return {
        originalText: text,
        translatedText: translations[targetLanguage],
        sourceLanguage: sourceLanguage === "auto" ? "en" : sourceLanguage,
        targetLanguage,
        detectedLanguage: "en",
        providerUsed: "phrase-dictionary",
      };
    }
  }

  const { provider, apiKey } = getActiveAiProvider();
  const sourceLangName = SUPPORTED_LANGUAGES[sourceLanguage]?.name || sourceLanguage;
  const targetLangName = SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage;

  let translatedText = "";
  let providerUsed = provider;

  // Layer 1: Gemini / OpenAI if API key configured
  if (provider === "gemini" && apiKey) {
    try {
      const systemInstruction = `You are Travezy's professional multilingual travel translator.
Your task is to translate travel queries, phrases, guidebooks, and itineraries from ${sourceLangName} to ${targetLangName}.

STRICT TRANSLATION RULES:
1. Accurately translate meaning, tone, and context for travellers.
2. PRESERVE proper names without altering or translating them incorrectly:
   - Destination & city names (e.g. Goa, Calangute, Fontainhas, Jaipur, Manali, Kerala, Baga)
   - Hotel & experience names (e.g. Travezy, Heritage Haveli, Lemon Tree)
   - Street & landmark names (e.g. Fort Aguada, Hawa Mahal)
   - Addresses and telephone numbers
3. PRESERVE all currency symbols and numbers exactly (e.g. ₹, INR, $, €, ₹15,000).
4. PRESERVE original markdown formatting, bullet points, headers, and line breaks.
5. Output ONLY the translated text without introductory commentary or explanations.`;

      translatedText = await callGeminiApi(apiKey, systemInstruction, [
        { role: "user", parts: [{ text: text }] },
      ]);
      providerUsed = "gemini";
    } catch (err: any) {
      console.warn("[Translation] Gemini failed, falling back to neural engine:", err.message);
      translatedText = "";
    }
  } else if (provider === "openai" && apiKey) {
    try {
      const systemInstruction = `You are Travezy's professional multilingual travel translator.
Your task is to translate travel queries, phrases, guidebooks, and itineraries from ${sourceLangName} to ${targetLangName}.

STRICT TRANSLATION RULES:
1. Accurately translate meaning, tone, and context for travellers.
2. PRESERVE proper names without altering or translating them incorrectly.
3. PRESERVE all currency symbols and numbers exactly (e.g. ₹, INR, $, €).
4. PRESERVE original markdown formatting and line breaks.
5. Output ONLY the translated text.`;

      translatedText = await callOpenAiApi(apiKey, systemInstruction, [
        { role: "user", content: text },
      ]);
      providerUsed = "openai";
    } catch (err: any) {
      console.warn("[Translation] OpenAI failed, falling back to neural engine:", err.message);
      translatedText = "";
    }
  }

  // Layer 2: Real-time Neural Translation Engine
  if (!translatedText || !translatedText.trim()) {
    try {
      const neuralResult = await translateWithNeuralEngine(text, sourceLanguage, targetLanguage);
      if (neuralResult && neuralResult.translatedText && neuralResult.translatedText.trim()) {
        translatedText = neuralResult.translatedText;
        providerUsed = (neuralResult.provider as "gemini" | "openai" | "fallback") || "fallback";
        if (neuralResult.detectedLang) {
          detectedLang = neuralResult.detectedLang;
        }
      }
    } catch (err: any) {
      console.warn("[Translation] Neural engine failed, falling back to dictionary:", err.message);
    }
  }

  // Layer 3: Rule-based smart dictionary & travel template fallback
  if (!translatedText || !translatedText.trim()) {
    providerUsed = "fallback";
    translatedText = fallbackTranslate(text, targetLanguage);
  }

  return {
    originalText: text,
    translatedText: translatedText.trim(),
    sourceLanguage,
    targetLanguage,
    detectedLanguage: detectedLang,
    providerUsed,
  };
}
