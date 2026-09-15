import { supabase } from "@/integrations/supabase/client";

export interface PackingItem {
  id: string;
  packing_list_id?: string | undefined;
  category: "Clothing" | "Toiletries" | "Electronics" | "Documents" | "Health" | "Activity Gear" | string;
  name: string;
  is_packed: boolean;
  is_custom: boolean;
  reason?: string | undefined;
}

export interface PackingList {
  id: string;
  trip_plan_id?: string | null | undefined;
  destination: string;
  title: string;
  weather_summary?: string | undefined;
  total_items: number;
  packed_items: number;
  items: PackingItem[];
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

const LOCAL_STORAGE_PACKING_PREFIX = "travezy_packing_list_";

/**
 * Generates an intelligent, tailored packing checklist based on destination, duration, weather, and activities.
 */
export function generateSmartPackingList(
  destinationName: string,
  durationDays: number = 4,
  weatherSummary?: string,
  activities: string[] = []
): PackingItem[] {
  const destLower = destinationName.toLowerCase();
  const weatherLower = (weatherSummary || "").toLowerCase();
  const actsLower = activities.map((a) => a.toLowerCase()).join(" ");

  const items: PackingItem[] = [];
  let idCounter = 1;
  const createItem = (
    category: PackingItem["category"],
    name: string,
    reason?: string
  ): PackingItem => ({
    id: `item-${idCounter++}-${name.replace(/\s+/g, "_").toLowerCase()}`,
    category,
    name,
    is_packed: false,
    is_custom: false,
    reason,
  });

  // ── 1. CLOTHING ────────────────────────────────────────────────────────────
  const topsCount = Math.min(durationDays + 2, 8);
  const bottomsCount = Math.min(Math.ceil(durationDays / 2) + 1, 5);

  items.push(createItem("Clothing", `${topsCount}x Breathable T-shirts / Tops`, "Day-to-day comfort"));
  items.push(createItem("Clothing", `${bottomsCount}x Pants / Shorts / Linen Trousers`, "Daily exploration"));
  items.push(createItem("Clothing", "Comfortable Walking Shoes / Sneakers", "Heritage trails & sightseeing"));

  // Destination & Climate specific clothing
  if (
    destLower.includes("manali") ||
    destLower.includes("shimla") ||
    destLower.includes("ladakh") ||
    destLower.includes("leh") ||
    destLower.includes("kashmir") ||
    destLower.includes("sikkim") ||
    destLower.includes("darjeeling") ||
    weatherLower.includes("snow") ||
    weatherLower.includes("cold")
  ) {
    items.push(createItem("Clothing", "Thermal Innerwear (Top & Bottom)", "Cold mountain temperatures"));
    items.push(createItem("Clothing", "Warm Fleece Jacket / Down Coat", "Chilly evenings & alpine winds"));
    items.push(createItem("Clothing", "Woollen Socks & Beanie Cap", "Head & foot warmth"));
    items.push(createItem("Clothing", "Gloves / Mittens", "Sub-zero or windy conditions"));
  } else if (
    destLower.includes("kerala") ||
    destLower.includes("goa") ||
    destLower.includes("andaman") ||
    destLower.includes("pondicherry") ||
    destLower.includes("beach") ||
    weatherLower.includes("humid") ||
    weatherLower.includes("coastal")
  ) {
    items.push(createItem("Clothing", "Light Breathable Linen Shirts", "Tropical coastal humidity"));
    items.push(createItem("Clothing", "Quick-Dry Swimwear & Beach Towel", "Beaches, resorts & pools"));
    items.push(createItem("Clothing", "Water-Friendly Sandals / Flip-Flops", "Houseboats & sandy shores"));
    items.push(createItem("Clothing", "Wide-Brim Sun Hat", "Sun protection"));
  } else if (
    destLower.includes("rajasthan") ||
    destLower.includes("jaipur") ||
    destLower.includes("jodhpur") ||
    destLower.includes("udaipur") ||
    destLower.includes("jaisalmer")
  ) {
    items.push(createItem("Clothing", "Light Cotton Long-Sleeve Shirts", "Desert sun & sand protection"));
    items.push(createItem("Clothing", "Light Shawl / Evening Jacket", "Desert night temperature drops"));
    items.push(createItem("Clothing", "Sunglasses with UV400 Protection", "Bright desert glare"));
  }

  // Modest temple wear for cultural heritage
  if (
    destLower.includes("varanasi") ||
    destLower.includes("kerala") ||
    destLower.includes("madurai") ||
    destLower.includes("hampi") ||
    actsLower.includes("temple") ||
    actsLower.includes("heritage")
  ) {
    items.push(createItem("Clothing", "Modest Temple Attire (Shoulders & Knees Covered)", "Sacred site dress codes"));
    items.push(createItem("Clothing", "Slip-on Shoes / Clean Socks", "Easy removal at shrines"));
  }

  // ── 2. WEATHER-AWARE GEAR ──────────────────────────────────────────────────
  if (weatherLower.includes("rain") || weatherLower.includes("drizzle") || weatherLower.includes("shower")) {
    items.push(createItem("Activity Gear", "Compact Windproof Umbrella", "Rain forecast"));
    items.push(createItem("Activity Gear", "Lightweight Rain Poncho", "Walking in showers"));
    items.push(createItem("Activity Gear", "Waterproof Phone Pouch / Dry Bag", "Electronics moisture safety"));
  }

  // ── 3. TOILETRIES & SUN CARE ───────────────────────────────────────────────
  items.push(createItem("Toiletries", "Sunscreen (Broad Spectrum SPF 50+)", "Daily UV protection"));
  items.push(createItem("Toiletries", "Mosquito / Insect Repellent Lotion", "Evening outdoors & backwaters"));
  items.push(createItem("Toiletries", "Hand Sanitizer & Wet Wipes", "Street food & travel hygiene"));
  items.push(createItem("Toiletries", "Lip Balm & Hydrating Moisturizer", "Travel dryness"));
  items.push(createItem("Toiletries", "Travel Toothbrush & Toiletries Kit", "Personal hygiene"));

  // ── 4. ELECTRONICS ─────────────────────────────────────────────────────────
  items.push(createItem("Electronics", "High-Capacity Power Bank (10,000+ mAh)", "All-day photography & GPS"));
  items.push(createItem("Electronics", "Universal Travel Adapter & Charging Cables", "Device charging"));
  items.push(createItem("Electronics", "Camera / Extra SD Memory Card", "Capturing memories"));

  // ── 5. DOCUMENTS & MONEY ───────────────────────────────────────────────────
  items.push(createItem("Documents", "Original Government Photo ID (Aadhaar / Passport / DL)", "Hotel check-in & verification"));
  items.push(createItem("Documents", "Printed & Digital Hotel / Guide Bookings", "Quick offline access"));
  items.push(createItem("Documents", "Emergency Cash (INR ₹2,000 - ₹5,000)", "Rural vendors & tips"));

  // ── 6. HEALTH & FIRST AID ──────────────────────────────────────────────────
  items.push(createItem("Health", "Personal Prescription Medications", "Daily healthcare"));
  items.push(createItem("Health", "Basic First Aid Kit (Band-Aids, Antiseptic)", "Minor scrapes & blisters"));
  items.push(createItem("Health", "Oral Rehydration Salts (ORS) / Electrolytes", "Travel hydration"));
  items.push(createItem("Health", "Motion Sickness / Antacid Tablets", "Winding roads & boat cruises"));

  return items;
}

/**
 * Loads a packing list for a trip from Supabase or localStorage fallback
 */
export async function loadTripPackingList(
  tripPlanId?: string | null,
  destinationName: string = "India",
  durationDays: number = 4,
  weatherSummary?: string
): Promise<PackingList> {
  const localKey = `${LOCAL_STORAGE_PACKING_PREFIX}${tripPlanId || destinationName.toLowerCase()}`;

  // Try localStorage first
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
  }

  // If no saved list exists, generate an intelligent default
  const generatedItems = generateSmartPackingList(destinationName, durationDays, weatherSummary);
  const newList: PackingList = {
    id: `local-pack-${Date.now()}`,
    trip_plan_id: tripPlanId || null,
    destination: destinationName,
    title: `${destinationName} Packing Checklist`,
    weather_summary: weatherSummary || "Fair conditions",
    total_items: generatedItems.length,
    packed_items: 0,
    items: generatedItems,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(localKey, JSON.stringify(newList));
    } catch {
      // ignore
    }
  }

  return newList;
}

/**
 * Saves packing list updates to localStorage and Supabase
 */
export async function saveTripPackingList(
  list: PackingList,
  userId?: string | null
): Promise<PackingList> {
  const localKey = `${LOCAL_STORAGE_PACKING_PREFIX}${list.trip_plan_id || list.destination.toLowerCase()}`;

  const packedCount = list.items.filter((i) => i.is_packed).length;
  const updatedList: PackingList = {
    ...list,
    packed_items: packedCount,
    total_items: list.items.length,
    updated_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(localKey, JSON.stringify(updatedList));
    } catch {
      // ignore
    }
  }

  // Sync to Supabase if authenticated
  if (userId) {
    try {
      await supabase
        .from("packing_lists" as any)
        .upsert(
          {
            user_id: userId,
            trip_plan_id: list.trip_plan_id || null,
            destination: list.destination,
            title: list.title,
            weather_summary: list.weather_summary || null,
            total_items: updatedList.total_items,
            packed_items: updatedList.packed_items,
          },
          { onConflict: "id" }
        );
    } catch (err) {
      console.warn("Supabase packing list sync warning:", err);
    }
  }

  return updatedList;
}

/**
 * Calculates packing checklist progress metrics
 */
export function calculatePackingProgress(items: PackingItem[]): {
  total: number;
  packed: number;
  remaining: number;
  percentage: number;
} {
  const total = items.length;
  const packed = items.filter((i) => i.is_packed).length;
  const remaining = total - packed;
  const percentage = total === 0 ? 0 : Math.round((packed / total) * 100);
  return { total, packed, remaining, percentage };
}
