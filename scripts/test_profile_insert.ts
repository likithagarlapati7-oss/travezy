import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envFile = fs.readFileSync(".env", "utf-8");
const envVars: Record<string, string> = {};
envFile.split("\n").forEach((line) => {
  const [k, ...rest] = line.trim().split("=");
  if (k && rest.length > 0) {
    envVars[k.trim()] = rest.join("=").replace(/(^["']|["']$)/g, "").trim();
  }
});

const url = envVars["SUPABASE_URL"] || envVars["VITE_SUPABASE_URL"];
const key = envVars["SUPABASE_PUBLISHABLE_KEY"] || envVars["VITE_SUPABASE_PUBLISHABLE_KEY"];

const supabase = createClient(url, key);

async function testInsert() {
  const testId = "80100000-0000-4000-8000-000000000001";
  console.log("Testing inserting profile for guide:", testId);
  const { data, error } = await supabase.from("profiles").upsert({
    id: testId,
    full_name: "Ravi Kumar",
    email: "ravi.kochi@travezyguides.com",
    account_type: "tourist",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  }).select();

  console.log("Upsert result:", data, "Error:", error?.message);
}

testInsert();
