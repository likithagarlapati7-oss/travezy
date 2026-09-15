import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types.ts";
import { supabaseAdmin } from "../integrations/supabase/client.server.ts";
import { dispatchExternalNotification } from "./notifications.delivery.ts";

type Client = SupabaseClient<Database>;

export type CreateNotificationInput = {
  userId: string;
  type:
    | "booking_created"
    | "booking_confirmed"
    | "booking_cancelled"
    | "booking_completed"
    | "payment_success"
    | "payment_failed"
    | "cash_confirmed"
    | "withdrawal_requested"
    | "withdrawal_processed"
    | "withdrawal_completed"
    | "withdrawal_failed"
    | "review_received"
    | "message_received"
    | "system";
  title: string;
  message: string;
  relatedBookingId?: string | null;
  relatedServiceId?: string | null;
  relatedMessageId?: string | null;
  linkUrl?: string | null;
};

/**
 * Creates an in-app notification record and initiates email/SMS notification hooks.
 */
export async function createNotificationServer(input: CreateNotificationInput) {
  try {
    // 1. Insert into database using admin client to guarantee delivery
    const { data: notification, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        related_booking_id: input.relatedBookingId || null,
        related_service_id: input.relatedServiceId || null,
        related_message_id: input.relatedMessageId || null,
        link_url: input.linkUrl || null,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("[Failed to insert notification]", error);
    }

    // 2. Fetch recipient contact information for email/SMS dispatch
    const { data: recipientProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, phone, full_name")
      .eq("id", input.userId)
      .maybeSingle();

    if (recipientProfile) {
      const env = process.env as Record<string, string | undefined>;
      await dispatchExternalNotification({
        recipientEmail: recipientProfile.email,
        recipientPhone: recipientProfile.phone,
        recipientName: recipientProfile.full_name,
        subject: input.title,
        title: input.title,
        body: input.message,
        actionUrl: input.linkUrl ? `${env["APP_URL"] || "http://localhost:3000"}${input.linkUrl}` : null,
        type: input.type as any,
      });
    }

    return notification;
  } catch (err) {
    console.error("[createNotificationServer unexpected error]", err);
    return null;
  }
}

/**
 * Helper: Triggered when a tourist creates a new booking.
 */
export async function notifyBookingCreated({
  bookingId,
  serviceId,
  serviceTitle,
  touristId,
  touristName,
  providerUserId,
  totalPrice,
}: {
  bookingId: string;
  serviceId: string;
  serviceTitle: string;
  touristId: string;
  touristName: string;
  providerUserId: string;
  totalPrice: number;
}) {
  // Notify Provider
  await createNotificationServer({
    userId: providerUserId,
    type: "booking_created",
    title: "New Booking Request",
    message: `${touristName || "A tourist"} has booked "${serviceTitle}" for ₹${Number(totalPrice).toLocaleString()}.`,
    relatedBookingId: bookingId,
    relatedServiceId: serviceId,
    linkUrl: `/provider/bookings`,
  });

  // Notify Tourist
  await createNotificationServer({
    userId: touristId,
    type: "booking_created",
    title: "Booking Submitted",
    message: `Your reservation request for "${serviceTitle}" has been received and is awaiting confirmation.`,
    relatedBookingId: bookingId,
    relatedServiceId: serviceId,
    linkUrl: `/tourist/bookings/${bookingId}`,
  });
}

/**
 * Helper: Triggered when booking status changes (confirmed, cancelled, completed).
 */
export async function notifyBookingStatusChanged({
  bookingId,
  serviceId,
  serviceTitle,
  touristId,
  providerUserId,
  newStatus,
}: {
  bookingId: string;
  serviceId?: string | null;
  serviceTitle: string;
  touristId: string;
  providerUserId?: string | null;
  newStatus: string;
}) {
  const status = newStatus.toLowerCase();

  if (status === "confirmed") {
    await createNotificationServer({
      userId: touristId,
      type: "booking_confirmed",
      title: "Trip Confirmed! 🎉",
      message: `Your booking for "${serviceTitle}" has been confirmed by the provider. Get ready for your journey!`,
      relatedBookingId: bookingId,
      linkUrl: `/tourist/bookings/${bookingId}`,
    });
  } else if (status === "cancelled") {
    // Notify Tourist
    await createNotificationServer({
      userId: touristId,
      type: "booking_cancelled",
      title: "Booking Cancelled",
      message: `Your booking for "${serviceTitle}" was cancelled.`,
      relatedBookingId: bookingId,
      linkUrl: `/tourist/bookings/${bookingId}`,
    });

    // Notify Provider if known
    if (providerUserId) {
      await createNotificationServer({
        userId: providerUserId,
        type: "booking_cancelled",
        title: "Booking Cancelled",
        message: `Booking #${bookingId.slice(0, 8)} for "${serviceTitle}" has been cancelled.`,
        relatedBookingId: bookingId,
        linkUrl: `/provider/bookings`,
      });
    }
  } else if (status === "rejected") {
    // Notify Tourist
    await createNotificationServer({
      userId: touristId,
      type: "booking_cancelled",
      title: "Booking Request Declined",
      message: `Your booking request for "${serviceTitle}" was declined by the provider.`,
      relatedBookingId: bookingId,
      linkUrl: `/tourist/bookings/${bookingId}`,
    });
  } else if (status === "completed") {
    await createNotificationServer({
      userId: touristId,
      type: "booking_completed",
      title: "Trip Completed ✨",
      message: `Hope you enjoyed "${serviceTitle}"! Leave a review to share your experience with other travelers.`,
      relatedBookingId: bookingId,
      linkUrl: `/tourist/bookings/${bookingId}`,
    });
  }
}

/**
 * Helper: Triggered on payment verification success or failure.
 */
export async function notifyPaymentOutcome({
  bookingId,
  serviceTitle,
  touristId,
  providerUserId,
  amount,
  status,
  paymentMethod,
}: {
  bookingId: string;
  serviceTitle: string;
  touristId: string;
  providerUserId?: string | null;
  amount: number;
  status: "SUCCESS" | "FAILED" | "PENDING";
  paymentMethod?: string | null;
}) {
  if (status === "SUCCESS") {
    // Tourist Receipt Notification
    await createNotificationServer({
      userId: touristId,
      type: "payment_success",
      title: "Payment Received",
      message: `Payment of ₹${Number(amount).toLocaleString()} for "${serviceTitle}" was successfully processed (${paymentMethod?.toUpperCase() || "ONLINE"}).`,
      relatedBookingId: bookingId,
      linkUrl: `/tourist/bookings/${bookingId}`,
    });

    // Provider Settlement Notification
    if (providerUserId) {
      await createNotificationServer({
        userId: providerUserId,
        type: "payment_success",
        title: "Payment Settled",
        message: `Customer payment of ₹${Number(amount).toLocaleString()} confirmed for "${serviceTitle}".`,
        relatedBookingId: bookingId,
        linkUrl: `/provider/bookings`,
      });
    }
  } else if (status === "PENDING") {
    // Cash / Pending notification
    await createNotificationServer({
      userId: touristId,
      type: "system",
      title: "Cash at Service Selected 💵",
      message: `Your booking for "${serviceTitle}" is reserved. Please pay ₹${Number(amount).toLocaleString()} cash directly to your host.`,
      relatedBookingId: bookingId,
      linkUrl: `/tourist/bookings/${bookingId}`,
    });

    if (providerUserId) {
      await createNotificationServer({
        userId: providerUserId,
        type: "system",
        title: "Cash Collection Pending",
        message: `Guest selected Cash at Service (₹${Number(amount).toLocaleString()}) for "${serviceTitle}". Collect payment upon guest arrival.`,
        relatedBookingId: bookingId,
        linkUrl: `/provider/bookings`,
      });
    }
  } else {
    // Payment failure notification to tourist
    await createNotificationServer({
      userId: touristId,
      type: "payment_failed",
      title: "Payment Failed",
      message: `Your payment of ₹${Number(amount).toLocaleString()} for "${serviceTitle}" could not be completed. Please try again.`,
      relatedBookingId: bookingId,
      linkUrl: `/tourist/bookings/${bookingId}`,
    });
  }
}

/**
 * Helper: Triggered when a guest leaves a review.
 */
export async function notifyNewReview({
  reviewId,
  serviceId,
  serviceTitle,
  providerUserId,
  reviewerName,
  rating,
  comment,
}: {
  reviewId: string;
  serviceId: string;
  serviceTitle: string;
  providerUserId: string;
  reviewerName: string;
  rating: number;
  comment?: string | null | undefined;
}) {
  await createNotificationServer({
    userId: providerUserId,
    type: "review_received",
    title: "New Review Received ⭐",
    message: `${reviewerName || "A guest"} left a ${rating}-star review for "${serviceTitle}". Click to view and post an official reply.`,
    relatedServiceId: serviceId,
    linkUrl: `/provider/reviews`,
  });
}

/**
 * Helper: Triggered when a chat message is sent.
 */
export async function notifyNewChatMessage({
  messageId,
  senderId,
  recipientId,
  senderName,
  contentPreview,
  bookingId,
  isRecipientProvider,
}: {
  messageId: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  contentPreview: string;
  bookingId?: string | null;
  isRecipientProvider?: boolean;
}) {
  await createNotificationServer({
    userId: recipientId,
    type: "message_received",
    title: `New message from ${senderName || "User"}`,
    message: contentPreview.length > 80 ? `${contentPreview.slice(0, 80)}…` : contentPreview,
    relatedMessageId: messageId,
    relatedBookingId: bookingId || null,
    linkUrl: isRecipientProvider ? `/provider/messages` : `/tourist/messages`,
  });
}

/**
 * Helper: Triggered when host/admin confirms cash payment received.
 */
export async function notifyCashPaymentConfirmed({
  bookingId,
  serviceTitle,
  touristId,
  amount,
  confirmedByName,
}: {
  bookingId: string;
  serviceTitle: string;
  touristId: string;
  amount: number;
  confirmedByName?: string | undefined;
}) {
  await createNotificationServer({
    userId: touristId,
    type: "cash_confirmed",
    title: "Cash Payment Confirmed 💵",
    message: `${confirmedByName || "Your host"} has confirmed receiving ₹${Number(amount).toLocaleString()} cash for "${serviceTitle}".`,
    relatedBookingId: bookingId,
    linkUrl: `/tourist/bookings/${bookingId}`,
  });
}

/**
 * Helper: Triggered when withdrawal status changes.
 */
export async function notifyWithdrawalStatus({
  providerUserId,
  withdrawalId,
  amount,
  status,
  method,
  note,
}: {
  providerUserId: string;
  withdrawalId: string;
  amount: number;
  status: string;
  method?: string | undefined;
  note?: string | undefined;
}) {
  const st = status.toUpperCase();
  let title = "Withdrawal Update";
  let message = `Your withdrawal request of ₹${Number(amount).toLocaleString()} is now ${st}.`;
  let type: CreateNotificationInput["type"] = "withdrawal_requested";

  if (st === "PENDING") {
    title = "Withdrawal Requested ⏳";
    message = `Your payout request of ₹${Number(amount).toLocaleString()} (${method === "bank_transfer" ? "Bank" : "UPI"}) has been queued for processing.`;
    type = "withdrawal_requested";
  } else if (st === "PROCESSING") {
    title = "Payout Processing 🏦";
    message = `Your withdrawal of ₹${Number(amount).toLocaleString()} is being processed by the finance desk.`;
    type = "withdrawal_processed";
  } else if (st === "COMPLETED") {
    title = "Withdrawal Completed 💸";
    message = `₹${Number(amount).toLocaleString()} has been disbursed to your payout account.`;
    type = "withdrawal_completed";
  } else if (st === "FAILED" || st === "CANCELLED") {
    title = "Withdrawal Failed / Cancelled ⚠️";
    message = `Your payout of ₹${Number(amount).toLocaleString()} could not be completed and funds have been returned to your available balance.${note ? ` Reason: ${note}` : ""}`;
    type = "withdrawal_failed";
  }

  await createNotificationServer({
    userId: providerUserId,
    type,
    title,
    message,
    linkUrl: `/provider/wallet`,
  });
}

/**
 * Helper: Triggered when a provider or hotel partner responds to a guest review.
 */
export async function notifyReviewReplied({
  reviewId,
  serviceId,
  serviceTitle,
  touristUserId,
  hostName,
  response,
}: {
  reviewId: string;
  serviceId?: string | null;
  serviceTitle: string;
  touristUserId: string;
  hostName: string;
  response: string;
}) {
  await createNotificationServer({
    userId: touristUserId,
    type: "review_received",
    title: `Response from ${hostName || "Host"} 💬`,
    message: `${hostName || "Your host"} replied to your review on "${serviceTitle}": "${response.length > 80 ? response.slice(0, 80) + '…' : response}"`,
    relatedServiceId: serviceId || null,
    linkUrl: serviceId ? `/services/${serviceId}` : `/tourist/reviews`,
  });
}

/**
 * Helper: Triggered when a review is moderated by admin.
 */
export async function notifyReviewModerated({
  touristUserId,
  serviceTitle,
  action,
  reason,
}: {
  touristUserId: string;
  serviceTitle: string;
  action: "hidden" | "removed";
  reason?: string;
}) {
  await createNotificationServer({
    userId: touristUserId,
    type: "system",
    title: `Review Notice — ${serviceTitle}`,
    message: `Your review for "${serviceTitle}" was ${action === "hidden" ? "temporarily hidden" : "removed"} by community moderation.${reason ? ` Reason: ${reason}` : ""}`,
    linkUrl: `/tourist/reviews`,
  });
}

/**
 * Helper: Triggered when a tourist books a personal human tour guide.
 */
export async function notifyGuideTourRequested({
  bookingId,
  guideUserId,
  guideName,
  touristUserId,
  touristName,
  date,
  totalPrice,
}: {
  bookingId: string;
  guideUserId: string;
  guideName: string;
  touristUserId: string;
  touristName: string;
  date: string;
  totalPrice: number;
}) {
  // 1. Notify Guide
  if (guideUserId && !guideUserId.startsWith("user-guide-")) {
    await createNotificationServer({
      userId: guideUserId,
      type: "booking_created",
      title: "New Tour Guide Request! 🧭",
      message: `${touristName || "A traveller"} requested your personal guide services for ${date} (₹${Number(totalPrice).toLocaleString()}). Please review and accept.`,
      relatedBookingId: bookingId,
      linkUrl: `/guide/dashboard`,
    });
  }

  // 2. Notify Tourist
  await createNotificationServer({
    userId: touristUserId,
    type: "booking_created",
    title: "Guide Request Sent ⏳",
    message: `Your booking request with ${guideName} for ${date} has been sent. You will be notified once ${guideName} accepts.`,
    relatedBookingId: bookingId,
    linkUrl: `/tourist/bookings`,
  });
}

/**
 * Helper: Triggered when a guide accepts or confirms a tour.
 */
export async function notifyGuideTourStatusUpdated({
  bookingId,
  touristUserId,
  guideName,
  status,
  date,
}: {
  bookingId: string;
  touristUserId: string;
  guideName: string;
  status: "ACCEPTED" | "REJECTED" | "COMPLETED";
  date: string;
}) {
  let title = `Tour Guide Update — ${guideName}`;
  let message = `Your guide booking with ${guideName} for ${date} is now ${status}.`;

  if (status === "ACCEPTED") {
    title = `Tour Accepted by ${guideName}! 🎉`;
    message = `${guideName} has accepted your tour for ${date}. You can now chat or coordinate your meeting point.`;
  } else if (status === "REJECTED") {
    title = `Tour Request Declined`;
    message = `${guideName} is unfortunately unavailable for ${date}. Please choose another time slot or nearby guide.`;
  } else if (status === "COMPLETED") {
    title = `Tour Completed — Rate ${guideName} ⭐`;
    message = `We hope you enjoyed your guided tour with ${guideName}! Please share your feedback and rate your experience.`;
  }

  await createNotificationServer({
    userId: touristUserId,
    type: status === "ACCEPTED" ? "booking_confirmed" : status === "COMPLETED" ? "booking_completed" : "booking_cancelled",
    title,
    message,
    relatedBookingId: bookingId,
    linkUrl: status === "COMPLETED" ? `/tourist/bookings` : `/tourist/bookings`,
  });
}


