import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  notifyGuideTourRequested,
  notifyGuideTourStatusUpdated,
} from "./notifications.server";
import { getGuideById, type GuideBooking } from "./guides";

export interface CreateGuideBookingInput {
  touristId: string;
  touristName?: string | undefined;
  touristEmail?: string | undefined;
  touristPhone?: string | undefined;
  guideId: string;
  bookingDate: string;
  startTime: string;
  durationHours: number;
  durationType: "hourly" | "half_day" | "full_day";
  travellers: number;
  meetingLocation: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  totalPrice: number;
  notes?: string | undefined;
  packageId?: string | undefined;
  packageTitle?: string | undefined;
}

export async function createGuideBookingServer(input: CreateGuideBookingInput) {
  const guide = getGuideById(input.guideId);
  const guideName = guide?.name || "Tour Guide";

  let createdId = `gb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    const { data, error } = await (supabaseAdmin.from("guide_bookings" as any) as any)
      .insert({
        tourist_id: input.touristId,
        guide_id: input.guideId,
        booking_date: input.bookingDate,
        start_time: input.startTime,
        duration_hours: input.durationHours,
        duration_type: input.durationType,
        travellers: input.travellers,
        meeting_location: input.meetingLocation,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        total_price: input.totalPrice,
        currency: "INR",
        booking_status: "PENDING",
        payment_status: "PENDING",
        notes: input.notes
          ? `${input.packageTitle ? `[Package: ${input.packageTitle}] ` : ""}${input.notes}`
          : input.packageTitle
            ? `[Package: ${input.packageTitle}]`
            : null,
      })
      .select("*")
      .single();

    if (!error && data) {
      createdId = data.id;
    }
  } catch (err) {
    console.warn("Could not insert guide booking into database table, using local fallback ID:", err);
  }

  // Dispatch live notification
  try {
    await notifyGuideTourRequested({
      bookingId: createdId,
      guideUserId: guide?.user_id || "",
      guideName,
      touristUserId: input.touristId,
      touristName: input.touristName || "Traveller",
      date: `${input.bookingDate} (${input.startTime})`,
      totalPrice: input.totalPrice,
    });
  } catch (e) {
    console.warn("Notification error:", e);
  }

  const booking: GuideBooking = {
    id: createdId,
    tourist_id: input.touristId,
    tourist_name: input.touristName,
    tourist_email: input.touristEmail,
    tourist_phone: input.touristPhone,
    guide_id: input.guideId,
    guide: guide || undefined,
    booking_date: input.bookingDate,
    start_time: input.startTime,
    duration_hours: input.durationHours,
    duration_type: input.durationType,
    travellers: input.travellers,
    meeting_location: input.meetingLocation,
    latitude: input.latitude,
    longitude: input.longitude,
    total_price: input.totalPrice,
    currency: "INR",
    booking_status: "PENDING",
    payment_status: "PENDING",
    notes: input.notes,
    package_id: input.packageId,
    package_title: input.packageTitle,
    created_at: new Date().toISOString(),
  };

  return booking;
}

export async function updateGuideBookingStatusServer({
  bookingId,
  guideId,
  status,
  touristUserId,
  bookingDate,
}: {
  bookingId: string;
  guideId: string;
  status: "ACCEPTED" | "REJECTED" | "CANCELLED" | "IN_PROGRESS" | "COMPLETED";
  touristUserId: string;
  bookingDate?: string | undefined;
}) {
  const guide = getGuideById(guideId);
  const guideName = guide?.name || "Tour Guide";

  try {
    await (supabaseAdmin.from("guide_bookings" as any) as any)
      .update({ booking_status: status })
      .eq("id", bookingId);
  } catch (err) {
    console.warn("Database update error for guide booking status:", err);
  }

  if (status === "ACCEPTED" || status === "REJECTED" || status === "COMPLETED") {
    try {
      await notifyGuideTourStatusUpdated({
        bookingId,
        touristUserId,
        guideName,
        status,
        date: bookingDate || "your scheduled date",
      });
    } catch (e) {
      console.warn("Notification error:", e);
    }
  }

  return { success: true, bookingId, status };
}

export async function createGuideReviewServer({
  guideId,
  touristId,
  touristName,
  touristLocation,
  bookingId,
  rating,
  comment,
}: {
  guideId: string;
  touristId: string;
  touristName?: string | undefined;
  touristLocation?: string | undefined;
  bookingId?: string | undefined;
  rating: number;
  comment: string;
}) {
  const reviewId = `gr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  try {
    await (supabaseAdmin.from("guide_reviews" as any) as any).insert({
      id: reviewId,
      guide_id: guideId,
      tourist_id: touristId,
      booking_id: bookingId || null,
      rating,
      comment,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Could not insert guide review into database table:", err);
  }

  return {
    id: reviewId,
    reviewer_name: touristName || "Travezy Traveller",
    reviewer_location: touristLocation,
    rating,
    date: new Date().toISOString().split("T")[0]!,
    comment,
  };
}
