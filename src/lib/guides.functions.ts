import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createGuideBookingServer,
  updateGuideBookingStatusServer,
  createGuideReviewServer,
} from "./guides.server";

export const createGuideBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        touristId: z.string(),
        touristName: z.string().optional(),
        touristEmail: z.string().optional(),
        touristPhone: z.string().optional(),
        guideId: z.string(),
        bookingDate: z.string(),
        startTime: z.string(),
        durationHours: z.number(),
        durationType: z.enum(["hourly", "half_day", "full_day"]),
        travellers: z.number().min(1),
        meetingLocation: z.string().min(2),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        totalPrice: z.number(),
        notes: z.string().optional(),
        packageId: z.string().optional(),
        packageTitle: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return await createGuideBookingServer(data);
  });

export const updateGuideBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        bookingId: z.string(),
        guideId: z.string(),
        status: z.enum(["ACCEPTED", "REJECTED", "CANCELLED", "IN_PROGRESS", "COMPLETED"]),
        touristUserId: z.string(),
        bookingDate: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return await updateGuideBookingStatusServer(data);
  });

export const createGuideReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        guideId: z.string(),
        touristId: z.string(),
        touristName: z.string().optional(),
        touristLocation: z.string().optional(),
        bookingId: z.string().optional(),
        rating: z.number().min(1).max(5),
        comment: z.string().min(5),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return await createGuideReviewServer(data);
  });
