import { z } from "zod";

/** Group travel styles / companion types */
export const TravelGroupType = z.enum([
  "solo",
  "couple",
  "family",
  "friends",
  "backpacker",
  "luxury",
]);

export type TravelGroupType = z.infer<typeof TravelGroupType>;

/** Activity pace preferences */
export const ActivityPace = z.enum(["relaxed", "moderate", "packed"]);
export type ActivityPace = z.infer<typeof ActivityPace>;

export const SAFETY_DISCLAIMER =
  "Opening hours, ticket prices, transport schedules, and local weather are subject to change. Please verify dynamic details with official local operators before travel.";

/** Available interest categories */
export const TravelInterests = [
  "Adventure",
  "Nature & Outdoors",
  "Beaches & Water Sports",
  "Food & Culinary",
  "History & Heritage",
  "Culture & Art",
  "Shopping & Markets",
  "Relaxation & Wellness",
  "Nightlife & Entertainment",
  "Family & Kids",
  "Photography & Sightseeing",
  "Wildlife & Safari",
  "Heritage & Architecture",
] as const;

export const BudgetTierEnum = z.enum(["budget", "moderate", "luxury", "ultra_luxury"]);
export type BudgetTier = z.infer<typeof BudgetTierEnum>;

export const TravelStyleEnum = z.enum(["relaxed", "balanced", "packed"]);
export type TravelStyle = z.infer<typeof TravelStyleEnum>;

/** Schema for structured trip planning form */
export const itineraryInputSchema = z.object({
  destination: z.string().min(1, "Destination is required").max(120),
  days: z.number().int().min(1, "At least 1 day").max(14, "Maximum 14 days supported"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().min(0).optional(),
  budgetTier: BudgetTierEnum.default("moderate"),
  currency: z.string().default("INR"),
  travelers: z.number().int().min(1, "At least 1 traveller").default(2),
  groupType: TravelGroupType.default("couple"),
  interests: z.array(z.string()).default([]),
  travelStyle: TravelStyleEnum.default("balanced"),
  activityPace: ActivityPace.default("moderate"),
  customNotes: z.string().max(1000).optional(),
});

export type ItineraryInput = z.infer<typeof itineraryInputSchema>;

/** Individual activity item within a day */
export const activityItemSchema = z.object({
  id: z.string().optional(),
  itemType: z.enum(["hotel", "restaurant", "experience", "guide", "activity", "custom_activity"]).default("activity"),
  timeSlot: z.enum(["morning", "afternoon", "evening", "night"]),
  title: z.string(),
  description: z.string().default(""),
  location: z.string().optional(),
  estimatedCost: z.union([z.string(), z.number()]).optional(),
  numericCost: z.number().default(0),
  currency: z.string().default("INR"),
  imageUrl: z.string().optional(),
  rating: z.number().optional(),
  bookingUrl: z.string().optional(),
  matchedServiceId: z.string().uuid().optional(),
  externalReferenceId: z.string().optional(),
  notes: z.string().optional(),
  isBooked: z.boolean().default(false),
  orderIndex: z.number().default(0),
});

export type ActivityItem = z.infer<typeof activityItemSchema>;

/** Structure for a single day in the itinerary */
export const itineraryDaySchema = z.object({
  day: z.number().int(),
  title: z.string(),
  theme: z.string().optional(),
  morning: activityItemSchema,
  afternoon: activityItemSchema,
  evening: activityItemSchema,
  hotel: activityItemSchema.optional(),
  guide: activityItemSchema.optional(),
  activities: z.array(activityItemSchema).default([]),
  foodSuggestions: z.array(z.string()).default([]),
  estimatedDailyExpense: z.string().optional(),
  dailyCostNumeric: z.number().default(0),
  insiderTip: z.string().optional(),
});

export type ItineraryDay = z.infer<typeof itineraryDaySchema>;

/** Complete structured day-by-day itinerary */
export const structuredItinerarySchema = z.object({
  id: z.string().optional(),
  title: z.string().default("Curated Travezy Itinerary"),
  destination: z.string(),
  destinationSlug: z.string().optional(),
  daysCount: z.number().int(),
  travelersCount: z.number().int().default(2),
  budgetTier: BudgetTierEnum.default("moderate"),
  estimatedTotalBudget: z.string().optional(),
  totalCostNumeric: z.number().default(0),
  currency: z.string().default("INR"),
  summary: z.string(),
  travelStyle: TravelStyleEnum.default("balanced"),
  travelerType: z.string().optional(),
  interests: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  coverImageUrl: z.string().optional(),
  days: z.array(itineraryDaySchema),
  practicalTips: z.array(z.string()).default([]),
  packingAdvice: z.array(z.string()).default([]),
  bestTimeToVisit: z.string().optional(),
  safetyNotice: z.string().default(
    "Opening hours, ticket prices, transport schedules, and weather can fluctuate. Please verify dynamic information with official local providers before your trip."
  ),
});

export type StructuredItinerary = z.infer<typeof structuredItinerarySchema>;

/** Save Trip Plan Input Schema */
export const saveTripPlanSchema = z.object({
  title: z.string().min(1),
  destination: z.string().min(1),
  destinationSlug: z.string().optional(),
  daysCount: z.number().int().min(1),
  travelersCount: z.number().int().default(1),
  budgetTier: z.string().default("moderate"),
  estimatedTotalCost: z.number().default(0),
  maxBudget: z.number().nullable().optional(),
  currency: z.string().default("INR"),
  travelStyle: z.string().default("balanced"),
  interests: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  coverImageUrl: z.string().optional(),
  summary: z.string().optional(),
  items: z.array(
    z.object({
      dayNumber: z.number().int(),
      timeSlot: z.string(),
      orderIndex: z.number().int().default(0),
      itemType: z.string(),
      title: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      estimatedCost: z.number().default(0),
      serviceId: z.string().uuid().optional().nullable(),
      externalReferenceId: z.string().optional().nullable(),
      imageUrl: z.string().optional().nullable(),
      rating: z.number().optional().nullable(),
      bookingUrl: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    })
  ),
});

export type SaveTripPlanInput = z.infer<typeof saveTripPlanSchema>;

/** Chat message representation */
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(4000),
  itinerary: structuredItinerarySchema.optional(),
  recommendedServiceIds: z.array(z.string().uuid()).optional(),
  timestamp: z.string().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** Request schema for conversational chat endpoint */
export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(4000, "Message is too long (max 4000 characters)"),
  conversationHistory: z.array(chatMessageSchema).max(30).default([]),
  preferences: itineraryInputSchema.partial().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** Response schema for AI chat & itinerary endpoints */
export const aiResponseSchema = z.object({
  reply: z.string(),
  itinerary: structuredItinerarySchema.optional(),
  recommendedServices: z.array(z.any()).default([]),
  suggestedFollowUps: z.array(z.string()).default([]),
  safetyNotice: z.string(),
  providerUsed: z.string(),
});

export type AiResponse = z.infer<typeof aiResponseSchema>;

// ─── TRANSLATION SCHEMAS & DICTIONARIES ──────────────────────────────────────

/** Supported language codes and names */
export const SUPPORTED_LANGUAGES: Record<string, { name: string; nativeName: string; flag: string }> = {
  auto: { name: "Auto Detect", nativeName: "Auto Detect", flag: "🌐" },
  en: { name: "English", nativeName: "English", flag: "🇬🇧" },
  hi: { name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  te: { name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  ta: { name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  ml: { name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳" },
  kn: { name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  mr: { name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
  bn: { name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳" },
  gu: { name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳" },
  es: { name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  fr: { name: "French", nativeName: "Français", flag: "🇫🇷" },
  de: { name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  ja: { name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  ar: { name: "Arabic", nativeName: "العربية", flag: "🇦🇪" },
  it: { name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
};

/** Categorized travel phrase shortcuts */
export const TRAVEL_PHRASE_CATEGORIES = [
  {
    category: "Emergency & Safety",
    icon: "ShieldAlert",
    phrases: [
      "Where is the nearest hospital?",
      "I need urgent medical help.",
      "Please call the police.",
      "Where is the nearest pharmacy or medical store?",
      "I have lost my passport and wallet.",
    ],
  },
  {
    category: "Directions & Transit",
    icon: "Navigation",
    phrases: [
      "Where is the nearest bus station?",
      "How do I get to the train station / airport?",
      "Can you help me find this location on the map?",
      "How far is the beach from here?",
      "Which taxi or auto-rickshaw should I take?",
    ],
  },
  {
    category: "Hotel & Stays",
    icon: "Hotel",
    phrases: [
      "Where is my hotel?",
      "I have a confirmed booking with Travezy.",
      "What time is check-in and check-out?",
      "Can I leave my luggage here for a few hours?",
      "Is Wi-Fi available in the room?",
    ],
  },
  {
    category: "Shopping & Dining",
    icon: "Utensils",
    phrases: [
      "How much does this cost?",
      "Can you give me a receipt / bill?",
      "Is this dish vegetarian / vegan?",
      "Is drinking water safe here?",
      "Do you accept UPI / card payments?",
    ],
  },
] as const;

/** Request schema for text translation */
export const translationRequestSchema = z.object({
  text: z.string().min(1, "Text to translate cannot be empty").max(5000, "Text exceeds maximum limit of 5,000 characters"),
  sourceLanguage: z.string().default("auto"),
  targetLanguage: z.string().min(2, "Target language is required"),
  preserveFormatting: z.boolean().default(true),
});

export type TranslationRequest = z.infer<typeof translationRequestSchema>;

/** Response schema for translation */
export const translationResponseSchema = z.object({
  originalText: z.string(),
  translatedText: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  detectedLanguage: z.string().optional(),
  providerUsed: z.string(),
});

export type TranslationResponse = z.infer<typeof translationResponseSchema>;
