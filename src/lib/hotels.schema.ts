import { z } from "zod";

export const hotelInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Hotel name must be at least 2 characters").max(120),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  address: z.string().trim().min(5, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  country: z.string().trim().default("India"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  phone: z.string().trim().min(7, "Enter a valid contact phone number"),
  email: z.string().trim().email("Enter a valid email address"),
  amenities: z.array(z.string()).default([]),
  check_in_time: z.string().default("14:00"),
  check_out_time: z.string().default("11:00"),
  cancellation_policy: z.string().default("Free cancellation up to 24 hours before check-in"),
  hotel_rules: z.string().default("Valid government ID required at check-in. Non-smoking rooms."),
  image_url: z.string().url("Enter a valid image URL").optional().or(z.literal("")),
  images: z.array(z.string()).default([]),
  star_rating: z.number().min(1).max(5).default(4.5),
  status: z.enum(["active", "inactive", "under_maintenance"]).default("active"),
});

export type HotelInput = z.infer<typeof hotelInputSchema>;

export const roomInputSchema = z.object({
  id: z.string().uuid().optional(),
  hotel_id: z.string().uuid(),
  room_type: z.string().trim().min(2, "Room type is required"),
  description: z.string().trim().optional().nullable(),
  price_per_night: z.number().min(100, "Price per night must be at least ₹100"),
  currency: z.string().default("INR"),
  capacity: z.number().int().min(1, "Capacity must be at least 1 guest").max(20),
  total_rooms: z.number().int().min(1, "Must have at least 1 room").max(500),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type RoomInput = z.infer<typeof roomInputSchema>;

export const reservationStatusUpdateSchema = z.object({
  reservation_id: z.string().uuid(),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "REJECTED",
    "CANCELLED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "COMPLETED",
  ]),
  rejection_reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ReservationStatusUpdateInput = z.infer<typeof reservationStatusUpdateSchema>;

export const checkInCheckOutSchema = z.object({
  reservation_id: z.string().uuid(),
  action: z.enum(["check_in", "check_out"]),
  room_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CheckInCheckOutInput = z.infer<typeof checkInCheckOutSchema>;

export const hotelAvailabilityQuerySchema = z.object({
  hotel_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
});

export type HotelAvailabilityQuery = z.infer<typeof hotelAvailabilityQuerySchema>;

export const hotelCashConfirmSchema = z.object({
  reservation_id: z.string().uuid(),
  amount_received: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
});

export type HotelCashConfirmInput = z.infer<typeof hotelCashConfirmSchema>;
