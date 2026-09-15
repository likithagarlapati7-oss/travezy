import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types.ts";
import { getBackendUserRole, requireProvider, requireTourist } from "./bookings.server.ts";
import { notifyNewReview, notifyReviewReplied } from "./notifications.server.ts";

type Client = SupabaseClient<Database>;

/**
 * Validates whether a tourist is eligible to review a completed booking.
 */
export async function checkReviewEligibility(
  supabase: Client,
  bookingId: string,
  userId: string
) {
  // 1. Fetch booking with service details
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*, services(*)")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    throw new Error("Booking not found");
  }

  // 2. Ownership check: Only the booking creator can review
  if (booking.user_id !== userId) {
    throw new Error("Forbidden: You can only review your own bookings");
  }

  // 3. Status check: Booking must be COMPLETED
  const status = (booking.status || "").toLowerCase();
  if (status !== "completed") {
    if (status === "cancelled") {
      throw new Error("Cannot review a cancelled booking");
    }
    if (status === "pending") {
      throw new Error("Cannot review a booking that is still pending confirmation");
    }
    throw new Error("You can only review a service after your trip has been completed");
  }

  // 4. Duplicate check: Tourist cannot review the same booking twice
  let existingReview: any = null;
  try {
    const { data: revData, error: revErr } = await supabase
      .from("reviews")
      .select("id, rating, title, comment, images, provider_response, provider_responded_at, created_at, booking_id, user_id, service_id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (!revErr && revData) {
      existingReview = revData;
    }
  } catch (err) {
    // If booking_id column is temporarily missing in PostgREST schema cache, suppress and use fallback
  }

  // Fallback duplicate check: Check if booking notes contain [Reviewed: <id>]
  if (!existingReview) {
    if (typeof booking.notes === "string" && booking.notes.includes("[Reviewed:")) {
      const match = booking.notes.match(/\[Reviewed:\s*([a-zA-Z0-9_-]+)\]/);
      const reviewedId = match ? match[1] : null;
      if (reviewedId) {
        const { data: revById } = await supabase
          .from("reviews")
          .select("id, rating, title, comment, images, provider_response, provider_responded_at, created_at, user_id, service_id")
          .eq("id", reviewedId)
          .maybeSingle();
        if (revById) {
          existingReview = revById;
        }
      }
    }
  }

  if (existingReview) {
    return {
      eligible: false,
      reason: "ALREADY_REVIEWED",
      existingReview,
      booking,
    };
  }

  return {
    eligible: true,
    booking,
  };
}

/**
 * Recalculates and synchronizes the average rating and review count for a service.
 */
export async function recalculateServiceRating(supabase: Client, serviceId: string) {
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("service_id", serviceId);

  if (error) {
    console.error("[Failed to fetch reviews for rating sync]", error);
    return;
  }

  const reviewCount = reviews?.length || 0;
  const avgRating =
    reviewCount > 0
      ? Number((reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount).toFixed(1))
      : 0;

  const { error: updateErr } = await supabase
    .from("services")
    .update({
      rating: avgRating,
      review_count: reviewCount,
    })
    .eq("id", serviceId);

  if (updateErr) {
    console.error("[Failed to update service rating]", updateErr);
  }

  return { avgRating, reviewCount };
}

/**
 * Submits a new review for an eligible completed booking.
 */
export async function createReviewServer({
  supabase,
  userId,
  bookingId,
  serviceId,
  rating,
  title,
  comment,
  images,
}: {
  supabase: Client;
  userId: string;
  bookingId: string;
  serviceId: string;
  rating: number;
  title?: string | undefined;
  comment: string;
  images?: string[] | undefined;
}) {
  await requireTourist(supabase, userId);

  // Validate eligibility
  const eligibility = await checkReviewEligibility(supabase, bookingId, userId);
  if (!eligibility.eligible) {
    throw new Error("This booking has already been reviewed");
  }

  const booking = eligibility.booking;
  const matchesService =
    booking.service_id === serviceId ||
    (typeof booking.notes === "string" && booking.notes.includes(serviceId));

  if (!matchesService) {
    throw new Error("The specified service does not match the booking");
  }

  const providerId = booking.provider_id || (booking.services as any)?.provider_id || null;

  // Insert review record with progressive multi-tiered schema fallback
  // Automatically handles any missing columns in remote PostgREST cache (booking_id, provider_id, title, images, etc.)
  const candidatePayloads = [
    // Attempt 1: Full payload (all columns)
    {
      booking_id: bookingId,
      provider_id: providerId,
      service_id: booking.service_id,
      user_id: userId,
      rating,
      title: title || undefined,
      comment,
      images: images && images.length > 0 ? images : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Attempt 2: Without optional title/images
    {
      booking_id: bookingId,
      provider_id: providerId,
      service_id: booking.service_id,
      user_id: userId,
      rating,
      comment: title ? `[${title}] ${comment}` : comment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Attempt 3: Without provider_id (has booking_id)
    {
      booking_id: bookingId,
      service_id: booking.service_id,
      user_id: userId,
      rating,
      comment: title ? `[${title}] ${comment}` : comment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Attempt 4: Without booking_id (has provider_id)
    {
      provider_id: providerId,
      service_id: booking.service_id,
      user_id: userId,
      rating,
      comment: title ? `[${title}] ${comment}` : comment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Attempt 5: Minimal guaranteed core columns in all PostgreSQL/Supabase instances
    {
      service_id: booking.service_id,
      user_id: userId,
      rating,
      comment: title ? `[${title}] ${comment}` : comment,
    },
  ];

  let insertRes: any = null;
  for (const candidate of candidatePayloads) {
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(candidate)) {
      if (val !== undefined && val !== null) {
        cleanPayload[key] = val;
      }
    }

    try {
      const res = await supabase
        .from("reviews")
        .insert(cleanPayload as any)
        .select("*")
        .single();

      if (!res.error && res.data) {
        insertRes = res;
        break;
      }

      insertRes = res;
      const errMsg = (res.error?.message || "").toLowerCase();
      const isSchemaCacheError =
        errMsg.includes("could not find the") ||
        errMsg.includes("schema cache") ||
        errMsg.includes("column") ||
        errMsg.includes("does not exist") ||
        res.error?.code === "PGRST204" ||
        res.error?.code === "42703";

      if (!isSchemaCacheError) {
        // If not a schema error (e.g. auth failure), break early
        break;
      }
    } catch (err: any) {
      insertRes = { data: null, error: err };
    }
  }

  if (insertRes?.error || !insertRes?.data) {
    console.error("[Review creation failed across all fallback tiers]", insertRes?.error);
    throw new Error(`Failed to submit review: ${insertRes?.error?.message || "Unknown database error"}`);
  }

  const review = insertRes.data;

  // If review was inserted without direct booking_id column, attach review tag to booking notes
  if (!review.booking_id && bookingId) {
    try {
      const currentNotes = (booking.notes || "").trim();
      const reviewTag = `[Reviewed: ${review.id}]`;
      if (!currentNotes.includes(reviewTag)) {
        const updatedNotes = currentNotes ? `${currentNotes} ${reviewTag}` : reviewTag;
        await supabase
          .from("bookings")
          .update({ notes: updatedNotes })
          .eq("id", bookingId);
      }
    } catch (notesErr) {
      console.warn("[Failed to attach review tag to booking notes]", notesErr);
    }
  }

  // Recalculate service rating
  await recalculateServiceRating(supabase, booking.service_id);

  // Trigger review notification to provider
  try {
    let providerUserId = "";
    if (providerId) {
      const { data: prov } = await supabase
        .from("providers")
        .select("user_id")
        .eq("id", providerId)
        .maybeSingle();
      providerUserId = prov?.user_id || "";
    }

    if (providerUserId) {
      const { data: touristProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();

      await notifyNewReview({
        reviewId: review.id,
        serviceId,
        serviceTitle: (booking.services as any)?.title || "Marketplace Listing",
        providerUserId,
        reviewerName: touristProfile?.full_name || touristProfile?.email || "A guest",
        rating,
        comment,
      });
    }
  } catch (notifErr) {
    console.warn("[createReviewServer notification error]", notifErr);
  }

  return review;
}

/**
 * Updates an existing review (only allowed for the author).
 */
export async function updateReviewServer({
  supabase,
  userId,
  reviewId,
  rating,
  title,
  comment,
  images,
}: {
  supabase: Client;
  userId: string;
  reviewId: string;
  rating: number;
  title?: string | undefined;
  comment: string;
  images?: string[] | undefined;
}) {
  const { data: existing, error: eErr } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", reviewId)
    .maybeSingle();

  if (eErr || !existing) {
    throw new Error("Review not found");
  }

  if (existing.user_id !== userId) {
    throw new Error("Forbidden: You can only edit your own reviews");
  }

  const updatePayload: any = {
    rating,
    comment,
    updated_at: new Date().toISOString(),
  };
  if (title !== undefined) updatePayload.title = title;
  if (images !== undefined) updatePayload.images = images;

  let updateRes = await supabase
    .from("reviews")
    .update(updatePayload)
    .eq("id", reviewId)
    .select("*")
    .single();

  if (updateRes.error && (updateRes.error.message?.includes("title") || updateRes.error.message?.includes("images"))) {
    updateRes = await supabase
      .from("reviews")
      .update({
        rating,
        comment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .select("*")
      .single();
  }

  if (updateRes.error) throw new Error(updateRes.error.message);

  await recalculateServiceRating(supabase, existing.service_id);

  return updateRes.data;
}

/**
 * Deletes a review (only allowed for the author or admin).
 */
export async function deleteReviewServer({
  supabase,
  userId,
  reviewId,
}: {
  supabase: Client;
  userId: string;
  reviewId: string;
}) {
  const { data: existing, error: eErr } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", reviewId)
    .maybeSingle();

  if (eErr || !existing) {
    throw new Error("Review not found");
  }

  const role = await getBackendUserRole(supabase, userId);
  if (existing.user_id !== userId && role !== "admin") {
    throw new Error("Forbidden: You can only delete your own reviews");
  }

  const { error: dErr } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (dErr) throw new Error(dErr.message);

  await recalculateServiceRating(supabase, existing.service_id);

  return { success: true, id: reviewId };
}

/**
 * Allows a verified service Provider to respond to a customer review.
 */
export async function respondToReviewServer({
  supabase,
  userId,
  reviewId,
  response,
}: {
  supabase: Client;
  userId: string;
  reviewId: string;
  response: string;
}) {
  // 1. Assert provider role
  const providerId = await requireProvider(supabase, userId);

  // 2. Fetch review and its service
  const { data: review, error: rErr } = await supabase
    .from("reviews")
    .select("*, services(id, title, provider_id, providers(business_name))")
    .eq("id", reviewId)
    .maybeSingle();

  if (rErr || !review) {
    throw new Error("Review not found");
  }

  // 3. Authorization: Provider must own the reviewed service
  const serviceProviderId = review.provider_id || (review.services as any)?.provider_id;
  if (serviceProviderId !== providerId) {
    throw new Error("Forbidden: You can only respond to reviews for your own services");
  }

  // 4. Update review with provider reply
  const { data: updated, error: uErr } = await supabase
    .from("reviews")
    .update({
      provider_response: response,
      provider_responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .select("*")
    .single();

  if (uErr) throw new Error(uErr.message);

  // 5. Notify the tourist that the host replied
  try {
    if (review.user_id) {
      const hostName = (review.services as any)?.providers?.business_name || "Your Host";
      const serviceTitle = (review.services as any)?.title || "Marketplace Experience";

      await notifyReviewReplied({
        reviewId,
        serviceId: review.service_id,
        serviceTitle,
        touristUserId: review.user_id,
        hostName,
        response,
      });
    }
  } catch (notifErr) {
    console.warn("[respondToReviewServer notification error]", notifErr);
  }

  return updated;
}
