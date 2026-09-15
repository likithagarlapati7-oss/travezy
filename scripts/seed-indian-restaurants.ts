import { createClient } from "@supabase/supabase-js";
import { INDIAN_RESTAURANTS } from "../src/data/indian-restaurants.js";
import type { Database } from "../src/integrations/supabase/types.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials. Checked VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log(`\n========================================================`);
  console.log(`SEEDING ${INDIAN_RESTAURANTS.length} AUTHENTIC INDIAN RESTAURANTS`);
  console.log(`Covering 28 States and 8 Union Territories of India`);
  console.log(`========================================================\n`);

  // Check existing services
  const { data: existing, error: fetchErr } = await supabase
    .from("services")
    .select("id, title")
    .eq("category", "restaurant");

  if (fetchErr) {
    console.error("Error fetching existing restaurant services:", fetchErr);
  }

  const existingTitles = new Set((existing ?? []).map((e) => e.title.toLowerCase().trim()));
  console.log(`Found ${existingTitles.size} existing restaurant services in database.`);

  const toInsert = INDIAN_RESTAURANTS.filter(
    (r) => !existingTitles.has(r.title.toLowerCase().trim())
  );

  console.log(`Preparing to insert ${toInsert.length} new restaurants...`);

  if (toInsert.length === 0) {
    console.log("All 108 Indian restaurants are already present in the database!");
    return;
  }

  // Insert in batches of 20
  const BATCH_SIZE = 20;
  let insertedCount = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE).map((r) => ({
      title: r.title,
      description: r.description,
      category: r.category,
      destination: r.destination,
      city: r.city,
      state: r.state,
      country: r.country,
      price: r.price,
      currency: r.currency,
      rating: r.rating,
      review_count: r.review_count,
      image_url: r.image_url,
      is_active: r.is_active,
    }));

    const { data, error } = await supabase.from("services").insert(batch).select("id, title");

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
    } else {
      insertedCount += data?.length ?? 0;
      console.log(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1} inserted (${insertedCount}/${toInsert.length})`
      );
    }
  }

  console.log(`\n Successfully inserted ${insertedCount} restaurants!`);

  // Verify state coverage
  const { data: allRestaurants, error: verifyErr } = await supabase
    .from("services")
    .select("id, title, city, state, country")
    .eq("category", "restaurant");

  if (!verifyErr && allRestaurants) {
    const stateMap = new Map<string, string[]>();
    for (const r of allRestaurants) {
      const state = r.state || "Unknown";
      const cities = stateMap.get(state) || [];
      if (r.city && !cities.includes(r.city)) {
        cities.push(r.city);
      }
      stateMap.set(state, cities);
    }

    console.log(`\n--- Verification: State Coverage (${stateMap.size} regions) ---`);
    for (const [st, cities] of stateMap.entries()) {
      console.log(`✓ ${st}: ${cities.length} distinct locations (${cities.join(", ")})`);
    }
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
