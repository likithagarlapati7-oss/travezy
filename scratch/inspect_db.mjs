import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspect() {
  console.log("--- Inspecting Providers ---");
  const { data: providers, error: pErr } = await supabase.from("providers").select("*").limit(5);
  console.log("Providers:", providers, pErr);

  console.log("--- Inspecting Services ---");
  const { data: services, error: sErr } = await supabase.from("services").select("id, title, destination, category, price, provider_id").limit(10);
  console.log("Services count:", services?.length, services?.slice(0, 3), sErr);

  console.log("--- Inspecting Profiles ---");
  const { data: profiles, error: prErr } = await supabase.from("profiles").select("id, full_name, email, account_type").limit(10);
  console.log("Profiles:", profiles, prErr);

  console.log("--- Inspecting User Roles ---");
  const { data: roles, error: rErr } = await supabase.from("user_roles").select("*").limit(10);
  console.log("Roles:", roles, rErr);
}

inspect();
