import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createReviewSchema,
  deleteReviewSchema,
  providerResponseSchema,
  updateReviewSchema,
} from "./reviews.schema";
import {
  checkReviewEligibility,
  createReviewServer,
  deleteReviewServer,
  respondToReviewServer,
  updateReviewServer,
} from "./reviews.server";

/**
 * Server function to check if a booking is eligible for review.
 */
export const checkBookingReviewEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      booking_id: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    return await checkReviewEligibility(
      context.supabase,
      data.booking_id,
      context.userId
    );
  });

/**
 * Server function to create a new review for a completed booking.
 */
export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createReviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await createReviewServer({
      supabase: context.supabase,
      userId: context.userId,
      bookingId: data.booking_id,
      serviceId: data.service_id,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      images: data.images,
    });
  });

/**
 * Server function to update a tourist's existing review.
 */
export const editReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateReviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await updateReviewServer({
      supabase: context.supabase,
      userId: context.userId,
      reviewId: data.id,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      images: data.images,
    });
  });

/**
 * Server function to delete a tourist's review.
 */
export const removeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteReviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await deleteReviewServer({
      supabase: context.supabase,
      userId: context.userId,
      reviewId: data.id,
    });
  });

/**
 * Server function for service providers to respond to a customer review.
 */
export const replyToReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => providerResponseSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await respondToReviewServer({
      supabase: context.supabase,
      userId: context.userId,
      reviewId: data.review_id,
      response: data.response,
    });
  });
