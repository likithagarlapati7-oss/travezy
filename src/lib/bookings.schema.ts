import { z } from "zod";

export const bookingInputSchema = z.object({
  service_id: z.string().min(1, "Service ID is required"),
  travel_date: z.string().refine((val) => {
    if (!val) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Parse YYYY-MM-DD components directly to avoid timezone shift
    const parts = val.split("-").map(Number);
    const p0 = parts[0];
    const p1 = parts[1];
    const p2 = parts[2];
    if (p0 === undefined || p1 === undefined || p2 === undefined || isNaN(p0) || isNaN(p1) || isNaN(p2)) {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date >= today;
    }
    const date = new Date(p0, p1 - 1, p2);
    return date.getTime() >= today.getTime();
  }, "Booking date cannot be in the past"),
  guests: z.number().int().min(1, "Number of guests must be at least 1"),
  notes: z.string().optional().nullable(),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;
