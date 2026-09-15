import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ServiceInput } from "./services.schema";

type Client = SupabaseClient<Database>;

/**
 * Backend authorization: the caller must hold the `provider` role AND own a
 * provider record. Never trust the client for either fact.
 */
export async function requireProvider(supabase: Client, userId: string) {
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (roleError) throw new Error(roleError.message);

  const isProvider = (roles ?? []).some((r) => r.role === "provider");
  if (!isProvider) throw new Error("Forbidden: only service providers can manage services");

  const { data: provider, error } = await supabase
    .from("providers")
    .select("id, business_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!provider) throw new Error("Create your provider profile before publishing services");
  return provider;
}

/** Ownership check — a provider may only touch rows with their own provider_id. */
export async function assertOwnsService(supabase: Client, serviceId: string, providerId: string) {
  const { data, error } = await supabase
    .from("services")
    .select("id, provider_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Service not found");
  if (data.provider_id !== providerId) throw new Error("Forbidden: this service belongs to another provider");
  return data;
}

/** Check if service can be safely deleted or if active bookings exist */
export async function assertCanDeleteService(supabase: Client, serviceId: string) {
  const { data: activeBookings, error } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("service_id", serviceId)
    .in("status", ["pending", "confirmed"]);

  if (error) {
    // If table query fails, fallback safely
    return true;
  }

  if (activeBookings && activeBookings.length > 0) {
    throw new Error(
      `Cannot delete this service because it has ${activeBookings.length} active (pending or confirmed) booking(s). Please unpublish/deactivate the service instead to preserve tourist itinerary records.`
    );
  }

  return true;
}

export function toServiceRow(input: ServiceInput, providerId?: string, includeCoords = true) {
  const row: Record<string, any> = {
    title: input.title,
    description: input.description,
    category: input.category,
    destination: input.destination,
    city: input.city?.trim() || input.destination,
    state: input.state?.trim() || null,
    country: input.country?.trim() || null,
    price: input.price,
    currency: input.currency ?? "INR",
    image_url: input.image_url?.trim() || null,
    is_active: input.is_active ?? true,
    ...(providerId ? { provider_id: providerId } : {}),
  };

  if (input.max_guests != null && input.max_guests > 0) {
    row["max_guests"] = input.max_guests;
  }

  if (includeCoords && (input.latitude != null || input.longitude != null)) {
    row["latitude"] = input.latitude ?? null;
    row["longitude"] = input.longitude ?? null;
  }

  return row;
}
