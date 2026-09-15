import { z } from "zod";

/** Emergency place categories */
export const EmergencyPlaceCategory = z.enum([
  "all",
  "hospital",
  "police",
  "pharmacy",
  "emergency",
]);

export type EmergencyPlaceCategory = z.infer<typeof EmergencyPlaceCategory>;

/** Individual emergency facility / place representation */
export const emergencyPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["hospital", "police", "pharmacy", "emergency"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  distanceKm: z.number().min(0),
  formattedDistance: z.string(),
  address: z.string(),
  phone: z.string().optional(),
  isOpen: z.boolean().optional(),
  directionsUrl: z.string(),
});

export type EmergencyPlace = z.infer<typeof emergencyPlaceSchema>;

/** Query schema for nearby emergency facility lookup */
export const nearbyEmergencyQuerySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  category: EmergencyPlaceCategory.default("all"),
  radiusKm: z.number().min(0.5).max(50).default(10),
  limit: z.number().int().min(1).max(30).default(15),
  searchQuery: z.string().max(100).optional(),
});

export type NearbyEmergencyQuery = z.infer<typeof nearbyEmergencyQuerySchema>;

/** Response schema for nearby emergency search */
export const nearbyEmergencyResponseSchema = z.object({
  userLocation: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  category: EmergencyPlaceCategory,
  count: z.number(),
  places: z.array(emergencyPlaceSchema),
  providerUsed: z.string(),
});

export type NearbyEmergencyResponse = z.infer<typeof nearbyEmergencyResponseSchema>;

/** National and tourist emergency helpline directory */
export const EMERGENCY_HELPLINES = [
  {
    category: "Universal Emergency (India / EU)",
    number: "112",
    description: "National emergency number for police, fire, or medical dispatch.",
    country: "India / International",
    icon: "ShieldAlert",
    priority: true,
  },
  {
    category: "Police Assistance",
    number: "100",
    description: "Direct emergency dispatch for law enforcement & police.",
    country: "India",
    icon: "ShieldCheck",
    priority: true,
  },
  {
    category: "Medical Ambulance",
    number: "108",
    description: "Government emergency medical response & ambulance service.",
    country: "India",
    icon: "Ambulance",
    priority: true,
  },
  {
    category: "Tourist Helpline",
    number: "1363",
    description: "Ministry of Tourism 24/7 multi-lingual tourist assistance line.",
    country: "India",
    icon: "LifeBuoy",
    priority: true,
  },
  {
    category: "Travezy Concierge Desk",
    number: "+1 800 555 0119",
    description: "24/7 dedicated support for Travezy travelers & booking assistance.",
    country: "Travezy Global",
    icon: "Phone",
    priority: false,
  },
] as const;
