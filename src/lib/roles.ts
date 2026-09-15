import { redirect } from "@tanstack/react-router";
import { supabase } from "../integrations/supabase/client.ts";

export type AppRole = "tourist" | "provider" | "verifier" | "admin";

export type DashboardPath =
  | "/tourist/dashboard"
  | "/provider/dashboard"
  | "/verifier/dashboard"
  | "/admin/dashboard";

/** Single source of truth: the `user_roles` table, with the profile as fallback. */
export function dashboardPathForRole(role: AppRole | null | undefined): DashboardPath {
  if (role === "verifier") return "/verifier/dashboard";
  if (role === "provider") return "/provider/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/tourist/dashboard";
}

export function normaliseRole(value: string | null | undefined): AppRole | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  if (v === "verifier" || v === "hotel_partner" || v === "hotel" || v === "hotelier") return "verifier";
  if (v === "provider" || v === "partner") return "provider";
  if (v === "admin") return "admin";
  if (v === "tourist") return "tourist";
  return null;
}

/** Resolves the application role for a user. Never throws — returns null when unknown. */
export async function fetchRole(userId: string): Promise<AppRole | null> {
  const [rolesRes, profileRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("profiles").select("account_type").eq("id", userId).maybeSingle(),
  ]);
  const roles = (rolesRes.data ?? []).map((r) => normaliseRole(r.role)).filter(Boolean) as AppRole[];
  if (roles.includes("admin")) return "admin";
  if (roles.includes("verifier")) return "verifier";
  if (roles.includes("provider")) return "provider";
  if (roles.includes("tourist")) return "tourist";
  return normaliseRole(profileRes.data?.account_type ?? null);
}

/**
 * Route guard. Redirects the user to their own dashboard when their role is not
 * allowed on this route. Users with no resolvable role are treated as tourists.
 */
export async function requireRole(userId: string, allowed: AppRole[]): Promise<AppRole> {
  const role = (await fetchRole(userId)) ?? "tourist";
  if (!allowed.includes(role)) {
    throw redirect({ to: dashboardPathForRole(role), replace: true });
  }
  return role;
}
