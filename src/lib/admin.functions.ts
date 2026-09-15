import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deleteReviewAdminServer,
  deleteServiceAdminServer,
  toggleProviderVerifiedServer,
  toggleServiceActiveServer,
  updateBookingStatusAdminServer,
  updateUserRoleServer,
} from "./admin.server";

const roleEnumSchema = z.enum(["tourist", "provider", "admin"]);

/**
 * Server function to update a user's role on the platform.
 * Enforces admin authorization and prevents zero-admin state.
 */
export const adminUpdateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        newRole: roleEnumSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return await updateUserRoleServer({
      supabase: context.supabase,
      adminUserId: context.userId,
      targetUserId: data.userId,
      newRole: data.newRole,
    });
  });

/**
 * Server function to toggle provider verification status.
 */
export const adminToggleProviderVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        providerId: z.string().uuid(),
        verified: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return await toggleProviderVerifiedServer({
      supabase: context.supabase,
      adminUserId: context.userId,
      providerId: data.providerId,
      verified: data.verified,
    });
  });

/**
 * Server function to toggle service active / visibility status.
 */
export const adminToggleServiceActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        serviceId: z.string().uuid(),
        isActive: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return await toggleServiceActiveServer({
      supabase: context.supabase,
      adminUserId: context.userId,
      serviceId: data.serviceId,
      isActive: data.isActive,
    });
  });

/**
 * Server function to delete a marketplace service listing.
 */
export const adminDeleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        serviceId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return await deleteServiceAdminServer({
      supabase: context.supabase,
      adminUserId: context.userId,
      serviceId: data.serviceId,
    });
  });

/**
 * Server function to moderate and delete a review.
 */
export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        reviewId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return await deleteReviewAdminServer({
      supabase: context.supabase,
      adminUserId: context.userId,
      reviewId: data.reviewId,
    });
  });

/**
 * Server function to update a booking's status.
 */
export const adminUpdateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        status: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return await updateBookingStatusAdminServer({
      supabase: context.supabase,
      adminUserId: context.userId,
      bookingId: data.bookingId,
      status: data.status,
    });
  });
