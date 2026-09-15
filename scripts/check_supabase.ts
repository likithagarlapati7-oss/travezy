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

console.log("Connecting to:", url);
const supabase = createClient(url, key);

async function check() {
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("*").limit(20);
  console.log("Profiles count:", profiles?.length, "Error:", pErr?.message);
  if (profiles) {
    console.log("Profiles:", profiles.map(p => ({ id: p.id, email: p.email, role: p.role })));
  }

  const { data: providers, error: provErr } = await supabase.from("providers").select("*").limit(20);
  console.log("Providers count:", providers?.length, "Error:", provErr?.message);
  if (providers) {
    console.log("Providers:", providers.map(p => ({ id: p.id, user_id: p.user_id, business_name: p.business_name })));
  }

  const { data: messages, error: mErr } = await supabase.from("messages").select("*").limit(5);
  console.log("Messages count:", messages?.length, "Error:", mErr?.message);
}

check();
