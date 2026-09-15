import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getBackendUserRole } from "./bookings.server";
import { deleteReviewServer } from "./reviews.server";
import type { AppRole } from "./roles";

type Client = SupabaseClient<Database>;

/**
 * Asserts the authenticated user holds the 'admin' role in the database.
 * Throws a 403 Forbidden error if the user is not an admin.
 */
export async function requireAdmin(supabase: Client, userId: string): Promise<boolean> {
  const role = await getBackendUserRole(supabase, userId);
  if (role !== "admin") {
    throw new Error("Forbidden: Admin privileges required to perform this action.");
  }
  return true;
}

/**
 * Safely updates a user's role on the platform.
 * Enforces critical invariant: Prevents removing the last admin from the platform.
 */
export async function updateUserRoleServer({
  supabase,
  adminUserId,
  targetUserId,
  newRole,
}: {
  supabase: Client;
  adminUserId: string;
  targetUserId: string;
  newRole: AppRole;
}) {
  // 1. Verify caller is an admin
  await requireAdmin(supabase, adminUserId);

  if (!["tourist", "provider", "admin"].includes(newRole)) {
    throw new Error("Invalid role specified");
  }

  // 2. Fetch current target user role
  const targetCurrentRole = await getBackendUserRole(supabase, targetUserId);

  // 3. Last Admin Protection: If demoting an admin, ensure at least one other admin exists
  if (targetCurrentRole === "admin" && newRole !== "admin") {
    // Count admins across user_roles table
    const { data: adminRoles, error: countErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (countErr) {
      throw new Error(`Failed to verify admin count: ${countErr.message}`);
    }

    // Also check profiles with account_type = 'admin'
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("account_type", "admin");

    const allAdminIds = new Set<string>([
      ...(adminRoles ?? []).map((r) => r.user_id),
      ...(adminProfiles ?? []).map((p) => p.id),
    ]);

    if (allAdminIds.size <= 1 && allAdminIds.has(targetUserId)) {
      throw new Error(
        "Action blocked: Cannot remove the last remaining Administrator from the platform. Promote another user first.",
      );
    }
  }

  // 4. Update or insert into user_roles
  const { data: existingRoleRow } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (existingRoleRow) {
    const { error: roleUpdateErr } = await supabase
      .from("user_roles")
      .update({ role: newRole as any })
      .eq("id", existingRoleRow.id);

    if (roleUpdateErr) throw new Error(`Failed to update user_roles: ${roleUpdateErr.message}`);
  } else {
    const { error: roleInsertErr } = await supabase
      .from("user_roles")
      .insert({ user_id: targetUserId, role: newRole as any });

    if (roleInsertErr) throw new Error(`Failed to assign role: ${roleInsertErr.message}`);
  }

  // 5. Keep profiles.account_type in sync
  const { error: profileUpdateErr } = await supabase
    .from("profiles")
    .update({ account_type: newRole })
    .eq("id", targetUserId);

  if (profileUpdateErr) {
    console.warn(`[Profile sync warning] Failed to update account_type: ${profileUpdateErr.message}`);
  }

  return {
    success: true,
    userId: targetUserId,
    newRole,
    message: `User role successfully updated to ${newRole}.`,
  };
}

/**
 * Toggles verification status for a travel business provider.
 */
export async function toggleProviderVerifiedServer({
  supabase,
  adminUserId,
  providerId,
  verified,
}: {
  supabase: Client;
  adminUserId: string;
  providerId: string;
  verified: boolean;
}) {
  await requireAdmin(supabase, adminUserId);

  const { data, error } = await supabase
    .from("providers")
    .update({ verified })
    .eq("id", providerId)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update provider: ${error.message}`);
  return data;
}

/**
 * Toggles active/published visibility for a marketplace listing.
 */
export async function toggleServiceActiveServer({
  supabase,
  adminUserId,
  serviceId,
  isActive,
}: {
  supabase: Client;
  adminUserId: string;
  serviceId: string;
  isActive: boolean;
}) {
  await requireAdmin(supabase, adminUserId);

  const { data, error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", serviceId)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update service status: ${error.message}`);
  return data;
}

/**
 * Deletes a marketplace listing with safeguard checks.
 */
export async function deleteServiceAdminServer({
  supabase,
  adminUserId,
  serviceId,
}: {
  supabase: Client;
  adminUserId: string;
  serviceId: string;
}) {
  await requireAdmin(supabase, adminUserId);

  // Check if there are active bookings or reviews
  const [{ count: bookingCount }, { count: reviewCount }] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("service_id", serviceId),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("service_id", serviceId),
  ]);

  if ((bookingCount ?? 0) > 0 || (reviewCount ?? 0) > 0) {
    throw new Error(
      `Cannot permanently delete this listing because it has ${bookingCount ?? 0} bookings and ${reviewCount ?? 0} reviews. Please deactivate (Hide) the listing instead to preserve historical records.`,
    );
  }

  const { error } = await supabase.from("services").delete().eq("id", serviceId);
  if (error) throw new Error(`Failed to delete service: ${error.message}`);

  return { success: true, serviceId };
}

/**
 * Moderates / deletes a review as an admin and recalculates service ratings.
 */
export async function deleteReviewAdminServer({
  supabase,
  adminUserId,
  reviewId,
}: {
  supabase: Client;
  adminUserId: string;
  reviewId: string;
}) {
  await requireAdmin(supabase, adminUserId);
  return await deleteReviewServer({
    supabase,
    userId: adminUserId,
    reviewId,
  });
}

/**
 * Updates a booking's status from the admin console.
 */
export async function updateBookingStatusAdminServer({
  supabase,
  adminUserId,
  bookingId,
  status,
}: {
  supabase: Client;
  adminUserId: string;
  bookingId: string;
  status: string;
}) {
  await requireAdmin(supabase, adminUserId);

  const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
  if (!validStatuses.includes(status.toLowerCase())) {
    throw new Error(`Invalid booking status: ${status}. Must be one of ${validStatuses.join(", ")}`);
  }

  let res = await supabase
    .from("bookings")
    .update({
      status: status.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select("*")
    .single();

  if (
    res.error &&
    (res.error.message?.includes("updated_at") ||
      res.error.message?.includes("schema cache") ||
      res.error.code === "PGRST204")
  ) {
    res = await supabase
      .from("bookings")
      .update({
        status: status.toLowerCase(),
      })
      .eq("id", bookingId)
      .select("*")
      .single();
  }

  if (res.error) throw new Error(`Failed to update booking status: ${res.error.message}`);
  return res.data;
}
