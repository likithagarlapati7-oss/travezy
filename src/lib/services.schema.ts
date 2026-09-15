import { z } from "zod";

/** Shared by the Add/Edit forms (client) and the server functions (backend). */
export const SERVICE_CATEGORIES = [
  "hotel",
  "resort",
  "homestay",
  "heritage",
  "tour",
  "experience",
  "transport",
  "restaurant",
  "dining",
] as const;

export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;

export const COMMON_AMENITIES = [
  "Free High-Speed Wi-Fi",
  "Air Conditioning / Climate Control",
  "Swimming Pool & Lounge",
  "Complimentary Breakfast",
  "Free Valet Parking",
  "24/7 Room Service & Concierge",
  "Spa & Ayurvedic Wellness",
  "Fine Dining Restaurant",
  "Airport / Railway Station Transfers",
  "Pet Friendly Accommodations",
  "Certified Tour Guide Included",
  "Scenic Mountain / Ocean View",
  "Fitness Center / Gym",
  "Eco-Friendly & Sustainable",
] as const;

export const CANCELLATION_POLICIES = [
  { value: "flexible", label: "Flexible: Full refund up to 24 hours before arrival" },
  { value: "moderate", label: "Moderate: Full refund up to 5 days before arrival" },
  { value: "strict", label: "Strict: 50% refund up to 7 days before arrival" },
  { value: "non_refundable", label: "Non-refundable: No refund upon cancellation" },
] as const;

export const serviceInputSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(4000),
  category: z.enum(SERVICE_CATEGORIES),
  destination: z.string().trim().min(2, "Location is required").max(120),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().max(120).optional().or(z.literal("")),
  price: z
    .number({ error: "Price is required" })
    .positive("Price must be greater than 0")
    .max(10_000_000),
  currency: z.enum(CURRENCIES).default("INR"),
  max_guests: z.number().int().min(1, "Capacity must be at least 1 guest").max(1000).optional(),
  duration: z.string().trim().max(100).optional().or(z.literal("")),
  amenities: z.array(z.string()).optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  cancellation_policy: z.string().optional().or(z.literal("")),
  is_active: z.boolean().optional().default(true),
  image_url: z
    .string()
    .trim()
    .max(600)
    .refine(
      (v) => v === "" || /^(https?:\/\/|\/)/.test(v),
      { message: "Enter a valid image URL" },
    )
    .optional()
    .or(z.literal("")),
  images: z.array(z.string()).optional(),
  /** Geographical coordinates — optional, set via Mapbox location picker */
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;

export const RATING_RANGE = { min: 0, max: 5 } as const;
