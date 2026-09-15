import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types.ts";
import { DESTINATIONS_DATA, getDestinationBySlug } from "../data/destinations-data.ts";
import { HOTELS_AND_STAYS } from "../data/hotels-and-stays.ts";
import { INDIAN_RESTAURANTS } from "../data/indian-restaurants.ts";
import { TOURS_AND_EXPERIENCES } from "../data/tours-and-experiences.ts";
import { HUMAN_TOUR_GUIDES } from "../data/human-guides.ts";
import {
  type ItineraryInput,
  type StructuredItinerary,
  type ItineraryDay,
  type ActivityItem,
  type SaveTripPlanInput,
  SAFETY_DISCLAIMER,
} from "./ai.schema.ts";
import { getActiveAiProvider } from "./ai.server.ts";

type Client = SupabaseClient<Database>;

/**
 * Normalizes destination string to match destination data
 */
function normalizeDestination(dest: string) {
  const clean = dest.trim().toLowerCase().replace(/[,.-]/g, " ");
  for (const d of DESTINATIONS_DATA) {
    if (
      d.name.toLowerCase().includes(clean) ||
      clean.includes(d.name.toLowerCase()) ||
      d.slug.toLowerCase().includes(clean) ||
      clean.includes(d.slug.toLowerCase()) ||
      d.state.toLowerCase().includes(clean) ||
      clean.includes(d.state.toLowerCase())
    ) {
      return d;
    }
  }
  // Default to first destination (Kerala) if unmatched
  return DESTINATIONS_DATA[0]!;
}

/**
 * Generates an AI-grounded multi-day itinerary using genuine Travezy database records.
 * STRICT RULE: Never invents fake businesses. Uses actual Hotels, Restaurants,
 * Experiences, and Human Tour Guides with exact IDs and details.
 */
export async function generateGroundedItinerary(
  supabase: Client | null,
  input: ItineraryInput
): Promise<StructuredItinerary> {
  const destinationData = normalizeDestination(input.destination);
  const destName = destinationData.name;
  const destSlug = destinationData.slug;
  const daysCount = Math.min(14, Math.max(1, input.days || 3));
  const travelersCount = Math.max(1, input.travelers || 2);
  const budgetTier = input.budgetTier || "moderate";
  const travelStyle = input.travelStyle || "balanced";
  const userInterests = input.interests || [];

  // ── 1. Filter Real Destination Records ─────────────────────────────────────
  // A. Hotels matching destination
  const matchedHotels = HOTELS_AND_STAYS.filter(
    (h) =>
      h.destination.toLowerCase().includes(destSlug) ||
      h.destination.toLowerCase().includes(destName.toLowerCase()) ||
      h.city.toLowerCase().includes(destName.toLowerCase())
  );
  const hotelsPool = matchedHotels.length > 0 ? matchedHotels : HOTELS_AND_STAYS.slice(0, 10);

  // Filter hotel by budget tier
  const budgetFilteredHotels = hotelsPool.filter((h) => {
    if (budgetTier === "budget") return h.price <= 3500;
    if (budgetTier === "moderate") return h.price >= 2500 && h.price <= 9000;
    if (budgetTier === "luxury") return h.price >= 7000 && h.price <= 25000;
    return h.price >= 15000; // ultra_luxury
  });
  const selectedHotels = budgetFilteredHotels.length > 0 ? budgetFilteredHotels : hotelsPool;

  // B. Restaurants matching destination
  const matchedRestaurants = INDIAN_RESTAURANTS.filter(
    (r) =>
      r.destination.toLowerCase().includes(destSlug) ||
      r.destination.toLowerCase().includes(destName.toLowerCase()) ||
      r.city.toLowerCase().includes(destName.toLowerCase())
  );
  const restaurantsPool = matchedRestaurants.length > 0 ? matchedRestaurants : INDIAN_RESTAURANTS.slice(0, 15);

  // C. Tours and Experiences matching destination
  const matchedExperiences = TOURS_AND_EXPERIENCES.filter(
    (t) =>
      t.destination.toLowerCase().includes(destSlug) ||
      t.destination.toLowerCase().includes(destName.toLowerCase()) ||
      t.city.toLowerCase().includes(destName.toLowerCase())
  );
  const experiencesPool = matchedExperiences.length > 0 ? matchedExperiences : TOURS_AND_EXPERIENCES.slice(0, 15);

  // D. Human Guides matching destination
  const matchedGuides = HUMAN_TOUR_GUIDES.filter(
    (g) =>
      g.state.toLowerCase() === destinationData.state.toLowerCase() ||
      g.coverage_areas.some((area) =>
        area.toLowerCase().includes(destName.toLowerCase()) ||
        area.toLowerCase().includes(destSlug.toLowerCase())
      )
  );
  const guidesPool = matchedGuides.length > 0 ? matchedGuides : HUMAN_TOUR_GUIDES.slice(0, 5);

  // ── 2. Build Day-by-Day Grounded Structure ────────────────────────────────
  const days: ItineraryDay[] = [];
  let cumulativeCost = 0;

  for (let dayNum = 1; dayNum <= daysCount; dayNum++) {
    const hotelForDay = selectedHotels[(dayNum - 1) % selectedHotels.length] || selectedHotels[0] || HOTELS_AND_STAYS[0]!;
    const lunchRestaurant = restaurantsPool[((dayNum - 1) * 2) % restaurantsPool.length] || restaurantsPool[0] || INDIAN_RESTAURANTS[0]!;
    const dinnerRestaurant = restaurantsPool[((dayNum - 1) * 2 + 1) % restaurantsPool.length] || restaurantsPool[0] || INDIAN_RESTAURANTS[0]!;
    const morningExp = experiencesPool[((dayNum - 1) * 2) % experiencesPool.length] || experiencesPool[0] || TOURS_AND_EXPERIENCES[0]!;
    const afternoonExp = experiencesPool[((dayNum - 1) * 2 + 1) % experiencesPool.length] || experiencesPool[0] || TOURS_AND_EXPERIENCES[0]!;
    const guideForDay = guidesPool.length > 0 ? guidesPool[(dayNum - 1) % guidesPool.length] : undefined;

    // Build Morning Activity
    const morningActivity: ActivityItem = {
      id: morningExp.id,
      itemType: "experience",
      timeSlot: "morning",
      title: morningExp.title,
      description: morningExp.description.slice(0, 180) + "…",
      location: `${morningExp.city}, ${morningExp.destination}`,
      estimatedCost: `₹${morningExp.price.toLocaleString("en-IN")}`,
      numericCost: morningExp.price,
      currency: "INR",
      imageUrl: morningExp.image_url || destinationData.cover_image,
      rating: morningExp.rating,
      bookingUrl: `/tours`,
      matchedServiceId: undefined,
      externalReferenceId: morningExp.id,
      isBooked: false,
      orderIndex: 1,
    };

    // Build Afternoon Activity (Lunch + Sight)
    const afternoonActivity: ActivityItem = {
      id: lunchRestaurant.id,
      itemType: "restaurant",
      timeSlot: "afternoon",
      title: `Lunch at ${lunchRestaurant.title}`,
      description: `Savour authentic ${lunchRestaurant.cuisine_type || "regional"} specialties in ${lunchRestaurant.city}.`,
      location: `${lunchRestaurant.city}, ${lunchRestaurant.destination}`,
      estimatedCost: `₹${lunchRestaurant.price.toLocaleString("en-IN")}`,
      numericCost: lunchRestaurant.price,
      currency: "INR",
      imageUrl: lunchRestaurant.image_url || destinationData.cover_image,
      rating: lunchRestaurant.rating,
      bookingUrl: `/destinations/${destSlug}`,
      matchedServiceId: undefined,
      externalReferenceId: lunchRestaurant.id,
      isBooked: false,
      orderIndex: 2,
    };

    // Build Evening Activity (Experience / Sunset / Dinner)
    const eveningActivity: ActivityItem = {
      id: afternoonExp.id,
      itemType: "experience",
      timeSlot: "evening",
      title: afternoonExp.title,
      description: afternoonExp.description.slice(0, 180) + "…",
      location: `${afternoonExp.city}, ${afternoonExp.destination}`,
      estimatedCost: `₹${afternoonExp.price.toLocaleString("en-IN")}`,
      numericCost: afternoonExp.price,
      currency: "INR",
      imageUrl: afternoonExp.image_url || destinationData.cover_image,
      rating: afternoonExp.rating,
      bookingUrl: `/tours`,
      matchedServiceId: undefined,
      externalReferenceId: afternoonExp.id,
      isBooked: false,
      orderIndex: 3,
    };

    // Hotel accommodation object
    const hotelActivity: ActivityItem = {
      id: hotelForDay.id,
      itemType: "hotel",
      timeSlot: "night",
      title: hotelForDay.title,
      description: hotelForDay.description.slice(0, 180) + "…",
      location: `${hotelForDay.city}, ${hotelForDay.destination}`,
      estimatedCost: `₹${hotelForDay.price.toLocaleString("en-IN")}/night`,
      numericCost: hotelForDay.price,
      currency: "INR",
      imageUrl: hotelForDay.image_url || destinationData.cover_image,
      rating: hotelForDay.rating,
      bookingUrl: `/destinations/${destSlug}`,
      matchedServiceId: undefined,
      externalReferenceId: hotelForDay.id,
      isBooked: false,
      orderIndex: 4,
    };

    // Guide object
    const guideActivity: ActivityItem | undefined = guideForDay
      ? {
          id: guideForDay.id,
          itemType: "guide",
          timeSlot: "morning",
          title: `${guideForDay.name} — Local Heritage & Tour Guide`,
          description: `Certified guide (${guideForDay.experience_years}+ yrs exp). Languages: ${(guideForDay.languages || []).join(", ")}. Expertise: ${(guideForDay.specializations || []).join(", ")}.`,
          location: `${guideForDay.city}, ${guideForDay.state}`,
          estimatedCost: `₹${(guideForDay.half_day_rate || guideForDay.hourly_rate * 4).toLocaleString("en-IN")}/half-day`,
          numericCost: guideForDay.half_day_rate || guideForDay.hourly_rate * 4,
          currency: "INR",
          imageUrl: guideForDay.profile_image || destinationData.cover_image,
          rating: guideForDay.rating,
          bookingUrl: `/tours`,
          matchedServiceId: undefined,
          externalReferenceId: guideForDay.id,
          isBooked: false,
          orderIndex: 0,
        }
      : undefined;

    // Daily activities list
    const dayActivities: ActivityItem[] = [
      ...(guideActivity ? [guideActivity] : []),
      morningActivity,
      afternoonActivity,
      eveningActivity,
      hotelActivity,
    ];

    const dayExpenseNumeric =
      (hotelForDay.price / 2) * travelersCount +
      morningExp.price * travelersCount +
      lunchRestaurant.price * travelersCount +
      afternoonExp.price * travelersCount +
      dinnerRestaurant.price * travelersCount;

    cumulativeCost += dayExpenseNumeric;

    days.push({
      day: dayNum,
      title: `Day ${dayNum} — Discover ${morningExp.city || destName}`,
      theme: `${morningExp.category} & ${afternoonExp.category}`,
      morning: morningActivity,
      afternoon: afternoonActivity,
      evening: eveningActivity,
      hotel: hotelActivity,
      guide: guideActivity,
      activities: dayActivities,
      foodSuggestions: [
        `${lunchRestaurant.title} (${lunchRestaurant.cuisine_type || "Regional"}) in ${lunchRestaurant.city}`,
        `${dinnerRestaurant.title} (${dinnerRestaurant.cuisine_type || "Regional"}) in ${dinnerRestaurant.city}`,
      ],
      estimatedDailyExpense: `₹${Math.round(dayExpenseNumeric).toLocaleString("en-IN")}`,
      dailyCostNumeric: Math.round(dayExpenseNumeric),
      insiderTip: `Start morning activities early around 8:30 AM to beat midday crowds. Book ${guideForDay ? guideForDay.name : "local guides"} in advance for authentic storytelling.`,
    });
  }

  const roundedTotalCost = Math.round(cumulativeCost);

  // ── 3. Synthesize Summary & Metadata ──────────────────────────────────────
  const title = `${daysCount}-Day ${destinationData.name} ${budgetTier.charAt(0).toUpperCase() + budgetTier.slice(1)} Explorer`;
  const summary = `A curated ${daysCount}-day ${travelStyle} travel experience across ${destinationData.name} tailored for ${travelersCount} ${travelersCount > 1 ? "travellers" : "traveller"}. Featuring handpicked stays at ${selectedHotels[0]?.title || "verified properties"}, iconic local experiences, and authentic dining.`;

  const structuredItinerary: StructuredItinerary = {
    title,
    destination: destinationData.name,
    destinationSlug: destinationData.slug,
    daysCount,
    travelersCount,
    budgetTier,
    estimatedTotalBudget: `₹${roundedTotalCost.toLocaleString("en-IN")}`,
    totalCostNumeric: roundedTotalCost,
    currency: "INR",
    summary,
    travelStyle,
    interests: userInterests,
    startDate: input.startDate,
    endDate: input.endDate,
    coverImageUrl: destinationData.cover_image,
    days,
    practicalTips: [
      `Carry light cotton clothing and comfortable walking shoes for outdoor exploration in ${destinationData.name}.`,
      `UPI payments (Google Pay, PhonePe, Paytm) are widely accepted across hotels, cafes, and verified merchants.`,
      `Keep local guide contact numbers handy on Travezy chat for seamless meetup coordination.`,
      `Respect local customs and dress respectfully when visiting religious shrines or heritage monuments.`,
    ],
    packingAdvice: [
      "Comfortable breathable walking footwear",
      "Power bank & multi-port adapter",
      "Sunscreen (SPF 50+), sunglasses & wide-brim hat",
      "Eco-friendly reusable water bottle",
      "Government-issued photo ID for hotel check-ins & safari passes",
    ],
    bestTimeToVisit: destinationData.best_time_to_visit || "October to March",
    safetyNotice: SAFETY_DISCLAIMER,
  };

  // ── 4. Optional AI Enrichment if API Key Present ──────────────────────────
  const aiProvider = getActiveAiProvider();
  if (aiProvider.provider === "gemini" && aiProvider.apiKey) {
    try {
      // Light AI prompt to enrich narrative tips without changing listing IDs
      const systemPrompt = `You are the Travezy AI Itinerary Stylist. Polish this travel plan summary into an exciting, evocative 2-sentence intro for travellers visiting ${destName}. Return ONLY the 2 sentences text.`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiProvider.apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nCurrent Summary: ${summary}` }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 },
        }),
      });
      if (response.ok) {
        const aiJson = await response.json();
        const enrichedText = aiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (enrichedText && enrichedText.length > 20) {
          structuredItinerary.summary = enrichedText;
        }
      }
    } catch {
      // Safe fallback to deterministic summary
    }
  }

  return structuredItinerary;
}

/**
 * Saves a generated itinerary plan and all its day items into Supabase.
 */
export async function saveTripPlanServer(
  supabase: Client,
  userId: string | null,
  input: SaveTripPlanInput
) {
  // 1. Insert into trip_plans table
  const { data: tripPlan, error: tpError } = await supabase
    .from("trip_plans")
    .insert({
      user_id: userId,
      title: input.title,
      destination: input.destination,
      destination_slug: input.destinationSlug || input.destination.toLowerCase().replace(/\s+/g, "-"),
      days_count: input.daysCount,
      travelers_count: input.travelersCount,
      budget_tier: input.budgetTier,
      estimated_total_cost: input.estimatedTotalCost,
      currency: input.currency,
      travel_style: input.travelStyle,
      interests: input.interests,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      cover_image_url: input.coverImageUrl || null,
      summary: input.summary || null,
      status: "saved",
      is_public: false,
    })
    .select("*")
    .single();

  if (tpError || !tripPlan) {
    console.error("[saveTripPlanServer error]", tpError);
    throw new Error(`Failed to save trip plan: ${tpError?.message || "Unknown error"}`);
  }

  // 2. Insert items into itinerary_items table
  if (input.items && input.items.length > 0) {
    const itemRecords = input.items.map((item, idx) => ({
      trip_plan_id: tripPlan.id,
      day_number: item.dayNumber,
      time_slot: item.timeSlot,
      order_index: item.orderIndex ?? idx,
      item_type: item.itemType,
      title: item.title,
      description: item.description || null,
      location: item.location || null,
      estimated_cost: item.estimatedCost || 0,
      service_id: item.serviceId || null,
      external_reference_id: item.externalReferenceId || null,
      image_url: item.imageUrl || null,
      rating: item.rating || null,
      booking_url: item.bookingUrl || null,
      notes: item.notes || null,
      is_booked: false,
    }));

    const { error: itemsError } = await supabase
      .from("itinerary_items")
      .insert(itemRecords);

    if (itemsError) {
      console.warn("[saveTripPlanServer items insert warning]", itemsError);
    }
  }

  return tripPlan;
}

/**
 * Fetches all saved trip plans for a user.
 */
export async function getUserTripPlansServer(supabase: Client, userId: string) {
  const { data: plans, error } = await supabase
    .from("trip_plans")
    .select("*, itinerary_items(id, day_number, time_slot, item_type, title, estimated_cost, is_booked)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getUserTripPlansServer error]", error);
    throw new Error(`Failed to load your itineraries: ${error.message}`);
  }

  return plans ?? [];
}

/**
 * Fetches a single trip plan with full day-by-day item details.
 */
export async function getTripPlanByIdServer(
  supabase: Client,
  tripPlanId: string,
  userId?: string | null
) {
  const { data: plan, error } = await supabase
    .from("trip_plans")
    .select("*, itinerary_items(*)")
    .eq("id", tripPlanId)
    .maybeSingle();

  if (error || !plan) {
    throw new Error("Itinerary not found");
  }

  // Check access authorization (if private plan, must belong to user or admin)
  if (!plan.is_public && plan.user_id && plan.user_id !== userId) {
    throw new Error("Forbidden: You do not have access to this private itinerary");
  }

  return plan;
}

/**
 * Updates a specific itinerary item.
 */
export async function updateItineraryItemServer(
  supabase: Client,
  userId: string,
  itemId: string,
  updates: {
    title?: string | undefined;
    description?: string | undefined;
    timeSlot?: string | undefined;
    dayNumber?: number | undefined;
    estimatedCost?: number | undefined;
    notes?: string | undefined;
    isBooked?: boolean | undefined;
    orderIndex?: number | undefined;
  }
) {
  // Fetch item and check ownership of parent trip plan
  const { data: item, error: iErr } = await supabase
    .from("itinerary_items")
    .select("*, trip_plans(user_id)")
    .eq("id", itemId)
    .maybeSingle();

  if (iErr || !item) {
    throw new Error("Itinerary item not found");
  }

  if ((item.trip_plans as any)?.user_id !== userId) {
    throw new Error("Forbidden: You can only edit items in your own itinerary");
  }

  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.timeSlot !== undefined) payload.time_slot = updates.timeSlot;
  if (updates.dayNumber !== undefined) payload.day_number = updates.dayNumber;
  if (updates.estimatedCost !== undefined) payload.estimated_cost = updates.estimatedCost;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.isBooked !== undefined) payload.is_booked = updates.isBooked;
  if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;

  const { data: updated, error: uErr } = await supabase
    .from("itinerary_items")
    .update(payload)
    .eq("id", itemId)
    .select("*")
    .single();

  if (uErr) throw new Error(uErr.message);

  return updated;
}

/**
 * Adds a new activity item to an existing trip plan.
 */
export async function addItineraryItemServer(
  supabase: Client,
  userId: string,
  tripPlanId: string,
  item: {
    dayNumber: number;
    timeSlot: string;
    itemType: string;
    title: string;
    description?: string | undefined;
    location?: string | undefined;
    estimatedCost?: number | undefined;
    serviceId?: string | null | undefined;
    externalReferenceId?: string | null | undefined;
    imageUrl?: string | null | undefined;
    rating?: number | null | undefined;
    bookingUrl?: string | null | undefined;
    notes?: string | null | undefined;
  }
) {
  // Check ownership
  const { data: plan, error: pErr } = await supabase
    .from("trip_plans")
    .select("id, user_id, estimated_total_cost")
    .eq("id", tripPlanId)
    .maybeSingle();

  if (pErr || !plan) throw new Error("Itinerary not found");
  if (plan.user_id !== userId) throw new Error("Forbidden: You can only add items to your own itinerary");

  const { data: newItem, error: nErr } = await supabase
    .from("itinerary_items")
    .insert({
      trip_plan_id: tripPlanId,
      day_number: item.dayNumber,
      time_slot: item.timeSlot,
      item_type: item.itemType,
      title: item.title,
      description: item.description || null,
      location: item.location || null,
      estimated_cost: item.estimatedCost || 0,
      service_id: item.serviceId || null,
      external_reference_id: item.externalReferenceId || null,
      image_url: item.imageUrl || null,
      rating: item.rating || null,
      booking_url: item.bookingUrl || null,
      notes: item.notes || null,
      is_booked: false,
    })
    .select("*")
    .single();

  if (nErr || !newItem) throw new Error(`Failed to add activity: ${nErr?.message || "Unknown error"}`);

  // Update total estimated cost on trip_plans
  if (item.estimatedCost && item.estimatedCost > 0) {
    const newTotal = Number(plan.estimated_total_cost || 0) + Number(item.estimatedCost);
    await supabase
      .from("trip_plans")
      .update({ estimated_total_cost: newTotal, updated_at: new Date().toISOString() })
      .eq("id", tripPlanId);
  }

  return newItem;
}

/**
 * Deletes an itinerary item.
 */
export async function deleteItineraryItemServer(
  supabase: Client,
  userId: string,
  itemId: string
) {
  const { data: item, error: iErr } = await supabase
    .from("itinerary_items")
    .select("*, trip_plans(id, user_id, estimated_total_cost)")
    .eq("id", itemId)
    .maybeSingle();

  if (iErr || !item) throw new Error("Itinerary item not found");
  if ((item.trip_plans as any)?.user_id !== userId) {
    throw new Error("Forbidden: You can only remove items from your own itinerary");
  }

  const { error: dErr } = await supabase
    .from("itinerary_items")
    .delete()
    .eq("id", itemId);

  if (dErr) throw new Error(dErr.message);

  // Deduct cost
  const parentPlan = item.trip_plans as any;
  if (parentPlan && item.estimated_cost && Number(item.estimated_cost) > 0) {
    const newTotal = Math.max(0, Number(parentPlan.estimated_total_cost || 0) - Number(item.estimated_cost));
    await supabase
      .from("trip_plans")
      .update({ estimated_total_cost: newTotal, updated_at: new Date().toISOString() })
      .eq("id", parentPlan.id);
  }

  return { success: true, id: itemId };
}

/**
 * Deletes a trip plan and all its items.
 */
export async function deleteTripPlanServer(
  supabase: Client,
  userId: string,
  tripPlanId: string
) {
  const { data: plan, error: pErr } = await supabase
    .from("trip_plans")
    .select("id, user_id")
    .eq("id", tripPlanId)
    .maybeSingle();

  if (pErr || !plan) throw new Error("Itinerary not found");
  if (plan.user_id !== userId) throw new Error("Forbidden: You can only delete your own itinerary");

  const { error: dErr } = await supabase
    .from("trip_plans")
    .delete()
    .eq("id", tripPlanId);

  if (dErr) throw new Error(dErr.message);

  return { success: true, id: tripPlanId };
}
