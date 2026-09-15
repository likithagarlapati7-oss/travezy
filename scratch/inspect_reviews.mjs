import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectReviews() {
  console.log("--- Querying reviews table ---");
  const { data, error } = await supabase.from("reviews").select("*").limit(3);
  console.log("Reviews data:", data);
  console.log("Reviews query error:", error);

  if (data && data.length > 0) {
    console.log("Columns on existing review:", Object.keys(data[0]));
  }
}

inspectReviews();
