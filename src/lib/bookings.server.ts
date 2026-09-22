import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types.ts";
import { normaliseRole, type AppRole } from "./roles.ts";

type Client = SupabaseClient<Database>;

/** Resolves backend user role by checking both user_roles table and profile fallback. */
export async function getBackendUserRole(supabase: Client | null, userId: string): Promise<AppRole | null> {
  if (!supabase) return "tourist";
  try {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("account_type").eq("id", userId).maybeSingle(),
    ]);
    const roles = (rolesRes.data ?? []).map((r) => normaliseRole(r.role)).filter(Boolean) as AppRole[];
    if (roles.includes("admin")) return "admin";
    if (roles.includes("verifier")) return "verifier";
    if (roles.includes("provider")) return "provider";
    if (roles.includes("tourist")) return "tourist";
    return normaliseRole(profileRes.data?.account_type ?? null) ?? "tourist";
  } catch {
    return "tourist";
  }
}

/** Asserts the user holds the tourist role. */
export async function requireTourist(supabase: Client | null, userId: string) {
  const role = (await getBackendUserRole(supabase, userId)) ?? "tourist";
  if (role !== "tourist" && role !== "admin") {
    throw new Error("Forbidden: only tourists can create bookings");
  }
  return true;
}

/** Asserts the user holds the provider role and returns their provider ID. */
export async function requireProvider(supabase: Client, userId: string) {
  const role = await getBackendUserRole(supabase, userId);
  if (role !== "provider") {
    throw new Error("Forbidden: only providers can manage this resource");
  }
  const { data: provider, error } = await supabase
    .from("providers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!provider) throw new Error("Provider profile not found");
  return provider.id;
}

/** Asserts the user holds the verifier (hotel partner) or admin role. */
export async function requireVerifier(supabase: Client, userId: string) {
  const role = await getBackendUserRole(supabase, userId);
  if (role !== "verifier" && role !== "admin") {
    throw new Error("Forbidden: only verified hotel partners can manage this hotel resource");
  }
  return true;
}

/** Checks if a date has sufficient guest capacity for a service. */
export async function checkAvailability(
  supabase: Client | null,
  serviceId: string,
  travelDate: string,
  requestedGuests: number
): Promise<{ available: boolean; capacity: number; maxGuests: number }> {
  // 1. Get the service's capacity limit (query with select(*) for schema compatibility)
  let service: any = null;
  if (supabase) {
    try {
      const { data: s, error: sErr } = await supabase
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .maybeSingle();
      if (!sErr && s) {
        service = s;
      }
    } catch {
      // Database query error fallback
    }
  }

  // If not found in remote DB table, resolve from curated listings
  if (!service) {
    const { getAllCuratedServices } = await import("./travezy");
    const curated = getAllCuratedServices().find((c) => c.id === serviceId);
    if (curated) {
      service = curated;
    }
  }

  // Fallback default capacity if service metadata is missing
  const rawMax = (service as any)?.max_guests ?? (service as any)?.capacity ?? (service as any)?.maxGuests;
  const maxGuests = typeof rawMax === "number" && rawMax > 0 ? rawMax : 10;

  // 2. Sum up existing valid bookings on that date for this service
  let bookings: any[] = [];
  if (supabase) {
    try {
      const { data: bList, error: bErr } = await supabase
        .from("bookings")
        .select("id, service_id, guests, status, travel_date, notes");
      if (!bErr && bList) {
        bookings = bList;
      }
    } catch {
      // Fallback
    }
  }

  // Normalize travelDate to YYYY-MM-DD
  const targetDate = travelDate ? travelDate.slice(0, 10) : "";

  // Filter bookings that consume capacity for this target date:
  // - CANCELLED and REJECTED bookings release capacity (do NOT consume)
  // - Invalid or zero-guest bookings do not consume capacity
  // - Historical/other-date bookings do not affect target date capacity
  // - PENDING and CONFIRMED bookings on target date consume capacity
  const activeBookings = (bookings ?? []).filter((b) => {
    if (!b || !b.travel_date) return false;
    const bDate = typeof b.travel_date === "string"
      ? b.travel_date.slice(0, 10)
      : new Date(b.travel_date).toISOString().slice(0, 10);
    
    if (bDate !== targetDate) return false;

    const status = (b.status || "").toLowerCase().trim();
    if (status === "cancelled" || status === "rejected") return false;

    // Check service match: directly by service_id, or encoded in notes
    const matchesService =
      b.service_id === serviceId ||
      (typeof b.notes === "string" && b.notes.includes(`[Curated:${serviceId}]`));

    return matchesService;
  });

  const currentGuests = activeBookings.reduce((acc, curr) => acc + (Number(curr.guests) || 0), 0);
  const remainingCapacity = Math.max(0, maxGuests - currentGuests);

  return {
    available: requestedGuests > 0 && requestedGuests <= remainingCapacity,
    capacity: remainingCapacity,
    maxGuests,
  };
}

/** Validate status transition state machine rules. */
export function validateStatusTransition(current: string, next: string): void {
  const cur = current.toLowerCase();
  const nxt = next.toLowerCase();

  const allowedTransitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled", "rejected"],
    confirmed: ["completed", "cancelled"],
    cancelled: [],
    rejected: [],
    completed: [],
  };

  const allowed = allowedTransitions[cur] ?? [];
  if (!allowed.includes(nxt)) {
    throw new Error(`Invalid booking status transition from '${current}' to '${next}'`);
  }
}

/** Authenticates a REST API request using its Authorization Bearer header. */
export async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Bearer token required");
  }
  const token = authHeader.replace("Bearer ", "");
  const SUPABASE_URL = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'];
  const SUPABASE_PUBLISHABLE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY'] || process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase configuration");
  }
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { persistSession: false },
  });
  let userId: string | null = null;
  try {
    const { data, error } = await supabase.auth.getClaims(token);
    if (!error && data?.claims?.sub) {
      userId = data.claims.sub;
    }
  } catch {
    // Fallback
  }

  if (!userId) {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (!userErr && userData?.user?.id) {
        userId = userData.user.id;
      }
    } catch {
      // Fallback failed
    }
  }

  if (!userId) {
    throw new Error("Unauthorized: Invalid token");
  }
  return { supabase, userId };
}
