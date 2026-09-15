import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { INDIAN_RESTAURANTS } from "@/data/indian-restaurants";
import { HOTELS_AND_STAYS } from "@/data/hotels-and-stays";
import { TOURS_AND_EXPERIENCES } from "@/data/tours-and-experiences";
import { getCuratedReviewsForService } from "@/data/curated-reviews";

export type Service = Tables<"services">;
export type Booking = Tables<"bookings">;
export type Profile = Tables<"profiles">;
export type Provider = Tables<"providers">;
export type Review = Tables<"reviews">;
export type Payment = Tables<"payments">;
export type Message = Tables<"messages">;

export type BookingWithService = Booking & {
  services: ServiceWithProvider | null;
  profiles: {
    id?: string;
    full_name: string;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
  payments?: Payment[] | null;
};

export type PaymentWithDetails = Payment & {
  bookings?: (Booking & {
    services: (Service & { providers: ServiceProvider | null }) | null;
    profiles: { full_name: string; email?: string | null; phone?: string | null } | null;
  }) | null;
  providers?: ServiceProvider | null;
};

export type PublicReview = Pick<
  Review,
  | "id"
  | "service_id"
  | "booking_id"
  | "user_id"
  | "rating"
  | "comment"
  | "provider_response"
  | "provider_responded_at"
  | "created_at"
  | "updated_at"
> & {
  title?: string | null;
  images?: string[] | null;
  reviewer_name?: string | null;
  reviewer_avatar?: string | null;
  reviewer_location?: string | null;
  profiles?: { full_name: string; avatar_url: string | null } | null;
};

export type ReviewWithService = PublicReview & {
  services: (Pick<Service, "id" | "title" | "destination" | "image_url" | "category"> & {
    providers?: { business_name: string } | null;
  }) | null;
};

/** Public-safe provider fields joined onto a listing. */
export type ServiceProvider = { id: string; user_id?: string; business_name: string; verified: boolean | null };
export type ServiceWithProvider = Service & { providers: ServiceProvider | null };

export function providerName(service: { providers?: ServiceProvider | null }) {
  return service.providers?.business_name ?? "Travezy verified partner";
}

const SERVICE_WITH_PROVIDER = "*, providers(id, user_id, business_name, verified)";

export function formatIndianRestaurantsAsServices(): ServiceWithProvider[] {
  return INDIAN_RESTAURANTS.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    destination: r.destination,
    city: r.city,
    state: r.state,
    country: r.country,
    price: r.price,
    currency: r.currency,
    rating: r.rating,
    review_count: r.review_count,
    latitude: r.latitude,
    longitude: r.longitude,
    image_url: r.image_url,
    is_active: r.is_active,
    max_guests: r.max_guests,
    provider_id: null,
    created_at: "2026-09-06T00:00:00.000Z",
    providers: {
      id: "p-culinary-partner",
      business_name: "Travezy Verified Culinary Partner",
      verified: true,
    },
  }));
}

export function formatHotelsAsServices(): ServiceWithProvider[] {
  return HOTELS_AND_STAYS.map((h) => ({
    id: h.id,
    title: h.title,
    description: h.description,
    category: h.category,
    destination: h.destination,
    city: h.city,
    state: h.state,
    country: h.country,
    price: h.price,
    currency: h.currency,
    rating: h.rating,
    review_count: h.review_count,
    latitude: h.latitude,
    longitude: h.longitude,
    image_url: h.image_url,
    is_active: h.is_active,
    max_guests: h.max_guests,
    provider_id: null,
    created_at: "2026-09-01T00:00:00.000Z",
    providers: {
      id: "p-hotel-partner",
      business_name: "Travezy Verified Hotel Partner",
      verified: true,
    },
  }));
}

export function formatToursAsServices(): ServiceWithProvider[] {
  return TOURS_AND_EXPERIENCES.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    destination: t.destination,
    city: t.city,
    state: t.state,
    country: t.country,
    price: t.price,
    currency: t.currency,
    rating: t.rating,
    review_count: t.review_count,
    latitude: t.latitude,
    longitude: t.longitude,
    image_url: t.image_url,
    is_active: t.is_active,
    max_guests: t.max_guests,
    provider_id: null,
    created_at: "2026-09-01T00:00:00.000Z",
    providers: {
      id: "p-tour-guide",
      business_name: "Travezy Verified Local Guide",
      verified: true,
    },
  }));
}

export function getAllCuratedServices(): ServiceWithProvider[] {
  return [
    ...formatHotelsAsServices(),
    ...formatToursAsServices(),
    ...formatIndianRestaurantsAsServices(),
  ];
}

export const servicesQuery = (categories?: string[]) => ({
  queryKey: ["services", categories ?? "all"],
  queryFn: async (): Promise<ServiceWithProvider[]> => {
    let dbServices: ServiceWithProvider[] = [];
    try {
      let query = supabase.from("services").select(SERVICE_WITH_PROVIDER).eq("is_active", true);
      if (categories?.length) query = query.in("category", categories);
      const { data, error } = await query.order("rating", { ascending: false });
      if (!error && data) dbServices = (data ?? []) as unknown as ServiceWithProvider[];
    } catch {
      // Fallback to catalog
    }

    const allCurated = getAllCuratedServices();
    const curatedMatching = !categories?.length
      ? allCurated
      : allCurated.filter((c) => categories.includes(c.category));

    const existingTitles = new Set(dbServices.map((s) => s.title.toLowerCase().trim()));
    const additional = curatedMatching.filter(
      (c) => !existingTitles.has(c.title.toLowerCase().trim())
    );

    return [...dbServices, ...additional].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  },
});

export const serviceQuery = (id: string) => ({
  queryKey: ["service", id],
  queryFn: async (): Promise<ServiceWithProvider | null> => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(SERVICE_WITH_PROVIDER)
        .eq("id", id)
        .maybeSingle();
      if (!error && data) return data as unknown as ServiceWithProvider;
    } catch {
      // Fallback
    }

    const curated = getAllCuratedServices().find((s) => s.id === id);
    if (curated) return curated;

    return null;
  },
});

export const serviceReviewsQuery = (serviceId: string) => ({
  queryKey: ["reviews", serviceId],
  queryFn: async (): Promise<PublicReview[]> => {
    let dbReviews: PublicReview[] = [];
    try {
      let { data, error } = await supabase
        .from("reviews")
        .select("id, service_id, booking_id, user_id, rating, title, comment, images, reviewer_name, reviewer_location, provider_response, provider_responded_at, created_at, updated_at, profiles(full_name, avatar_url)")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });

      if (error) {
        const fallbackRes = await supabase
          .from("reviews")
          .select("*, profiles(full_name, avatar_url)")
          .eq("service_id", serviceId)
          .order("created_at", { ascending: false });
        data = fallbackRes.data;
      }

      if (data) {
        dbReviews = data as unknown as PublicReview[];
      }
    } catch {
      // Supabase query error fallback
    }

    const allCurated = getAllCuratedServices();
    const currentService = allCurated.find((s) => s.id === serviceId);

    if (currentService) {
      const curatedReviews = getCuratedReviewsForService(currentService);
      const dbIds = new Set(dbReviews.map((r) => r.id));
      const formattedCurated: PublicReview[] = curatedReviews
        .filter((cr) => !dbIds.has(cr.id))
        .map((cr) => ({
          id: cr.id,
          service_id: cr.service_id,
          booking_id: cr.booking_id || null,
          user_id: cr.user_id || "curated-tourist",
          rating: cr.rating,
          title: cr.title || null,
          comment: cr.comment,
          images: cr.images || null,
          reviewer_name: cr.reviewer_name,
          reviewer_avatar: cr.reviewer_avatar || null,
          reviewer_location: cr.reviewer_location || null,
          provider_response: cr.provider_response || null,
          provider_responded_at: cr.provider_responded_at || null,
          created_at: cr.created_at,
          updated_at: cr.created_at,
          profiles: {
            full_name: cr.reviewer_name,
            avatar_url: cr.reviewer_avatar || null,
          },
        }));

      return [...dbReviews, ...formattedCurated];
    }

    return dbReviews;
  },
});

export const profileQuery = (userId: string) => ({
  queryKey: ["profile", userId],
  queryFn: async (): Promise<Profile | null> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export function resolveBookingService(b: any, allCurated: ServiceWithProvider[]): BookingWithService {
  let curatedId = "";
  let cleanNotes = b.notes || null;
  if (b.notes && typeof b.notes === "string" && b.notes.includes("[Curated:")) {
    const match = b.notes.match(/\[Curated:([^\]]+)\]\s*(.*)/s);
    if (match) {
      curatedId = match[1];
      cleanNotes = match[2]?.trim() || null;
    }
  }

  const targetId = curatedId || b.service_id;
  const curated = allCurated.find((c) => c.id === targetId);

  if (curated) {
    return {
      ...b,
      notes: cleanNotes,
      service_id: targetId,
      services: {
        ...(b.services || {}),
        ...curated,
      },
    } as unknown as BookingWithService;
  }

  return {
    ...b,
    notes: cleanNotes,
  } as unknown as BookingWithService;
}

export const myBookingsQuery = (userId: string) => ({
  queryKey: ["bookings", userId],
  queryFn: async (): Promise<BookingWithService[]> => {
    if (!userId) return [];
    let bookings: any[] = [];
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(*, providers(id, user_id, business_name, verified)), payments(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("myBookingsQuery error:", error);
      } else if (data) {
        bookings = data;
      }
    } catch (err) {
      console.error("myBookingsQuery catch:", err);
    }

    const allCurated = getAllCuratedServices();
    return bookings.map((b) => resolveBookingService(b, allCurated));
  },
});

export const touristBookingQuery = (bookingId: string) => ({
  queryKey: ["booking", bookingId],
  queryFn: async (): Promise<BookingWithService | null> => {
    if (!bookingId) return null;
    let booking: any = null;
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(*, providers(id, user_id, business_name, verified)), payments(*)")
        .eq("id", bookingId)
        .maybeSingle();
      if (error) {
        console.error("touristBookingQuery error:", error);
      } else if (data) {
        booking = data;
      }
    } catch (err) {
      console.error("touristBookingQuery catch:", err);
    }

    if (!booking) return null;

    const allCurated = getAllCuratedServices();
    return resolveBookingService(booking, allCurated);
  },
});


export const bookingPaymentQuery = (bookingId: string) => ({
  queryKey: ["payment", bookingId],
  queryFn: async (): Promise<{ payment: Payment | null; isPaid: boolean; allPayments: Payment[] }> => {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const payments = (data ?? []) as unknown as Payment[];
    const successPayment = payments.find((p) => p.status.toUpperCase() === "SUCCESS");
    return {
      payment: successPayment || payments[0] || null,
      isPaid: !!successPayment,
      allPayments: payments,
    };
  },
});

export const myPaymentsQuery = (userId: string) => ({
  queryKey: ["my-payments", userId],
  queryFn: async (): Promise<PaymentWithDetails[]> => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("payments")
      .select("*, bookings(*, services(*, providers(id, business_name, verified)))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("myPaymentsQuery error:", error);
      throw error;
    }
    return (data ?? []) as unknown as PaymentWithDetails[];
  },
});

export const paymentDetailQuery = (paymentId: string) => ({
  queryKey: ["payment-detail", paymentId],
  queryFn: async (): Promise<PaymentWithDetails | null> => {
    if (!paymentId) return null;
    const { data, error } = await supabase
      .from("payments")
      .select("*, bookings(*, services(*, providers(id, business_name, verified)))")
      .eq("id", paymentId)
      .maybeSingle();
    if (error) {
      console.error("paymentDetailQuery error:", error);
      throw error;
    }
    return data as unknown as PaymentWithDetails | null;
  },
});



export const myProviderQuery = (userId: string) => ({
  queryKey: ["provider", userId],
  queryFn: async (): Promise<Provider | null> => {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const providerServicesQuery = (providerId: string) => ({
  queryKey: ["provider-services", providerId],
  queryFn: async (): Promise<Service[]> => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const providerBookingsQuery = (providerId: string) => ({
  queryKey: ["provider-bookings", providerId],
  queryFn: async (): Promise<BookingWithService[]> => {
    if (!providerId) return [];
    const { data: services, error: sErr } = await supabase
      .from("services")
      .select("id")
      .eq("provider_id", providerId);
    if (sErr) throw sErr;
    const ids = (services ?? []).map((s) => s.id);
    if (!ids.length) return [];

    const { data: rawBookings, error } = await supabase
      .from("bookings")
      .select("*, services(*, providers(id, business_name, verified)), payments(*)")
      .in("service_id", ids)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("providerBookingsQuery error:", error);
      throw error;
    }

    if (!rawBookings || rawBookings.length === 0) return [];

    const allCurated = getAllCuratedServices();
    let enrichedList = rawBookings.map((b) => resolveBookingService(b, allCurated));

    try {
      const userIds = [...new Set(enrichedList.map((b) => b.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url")
          .in("id", userIds);

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
        enrichedList = enrichedList.map((b) => ({
          ...b,
          profiles: profileMap.get(b.user_id) ?? b.profiles ?? null,
        })) as unknown as BookingWithService[];
      }
    } catch {
      // Safe fallback
    }

    return enrichedList as unknown as BookingWithService[];
  },
});

export const bookingReviewQuery = (bookingId: string) => ({
  queryKey: ["booking-review", bookingId],
  queryFn: async (): Promise<PublicReview | null> => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles(full_name, avatar_url), services(id, title, destination)")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (!error && data) {
        return data as unknown as PublicReview;
      }
      if (error && (error.message?.includes("booking_id") || error.code === "PGRST204" || error.code === "42703")) {
        const { data: bData } = await supabase
          .from("bookings")
          .select("notes")
          .eq("id", bookingId)
          .maybeSingle();
        if (bData && typeof bData.notes === "string" && bData.notes.includes("[Reviewed:")) {
          const match = bData.notes.match(/\[Reviewed:\s*([a-zA-Z0-9_-]+)\]/);
          if (match && match[1]) {
            const { data: rData } = await supabase
              .from("reviews")
              .select("*, profiles(full_name, avatar_url), services(id, title, destination)")
              .eq("id", match[1])
              .maybeSingle();
            if (rData) return rData as unknown as PublicReview;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  },
});

export const providerReviewsQuery = (providerId: string) => ({
  queryKey: ["provider-reviews", providerId],
  queryFn: async (): Promise<ReviewWithService[]> => {
    const { data: services, error: sErr } = await supabase
      .from("services")
      .select("id")
      .eq("provider_id", providerId);
    if (sErr) throw sErr;
    const ids = (services ?? []).map((s) => s.id);
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from("reviews")
      .select("*, profiles(full_name, avatar_url), services(id, title, destination, image_url, category)")
      .in("service_id", ids)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ReviewWithService[];
  },
});

export const providerPaymentsQuery = (providerId: string) => ({
  queryKey: ["provider-payments", providerId],
  queryFn: async (): Promise<PaymentWithDetails[]> => {
    if (!providerId) return [];
    const { data, error } = await supabase
      .from("payments")
      .select("*, bookings(*, services(*, providers(id, business_name, verified)))")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("providerPaymentsQuery error:", error);
      throw error;
    }
    return (data ?? []) as unknown as PaymentWithDetails[];
  },
});

export const touristReviewsQuery = (userId: string) => ({
  queryKey: ["tourist-reviews", userId],
  queryFn: async (): Promise<ReviewWithService[]> => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*, services(id, title, destination, image_url, category, providers(business_name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ReviewWithService[];
  },
});

export const myMessagesQuery = (userId: string) => ({
  queryKey: ["messages", userId],
  queryFn: async (): Promise<Message[]> => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  },
});

export function formatPrice(price: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

// ─── Backend search / filter / pagination ────────────────────────────────────

/** Number of services returned per page. */
export const PAGE_LIMIT = 12;

/**
 * Search and filter parameters — also used as URL search params in
 * /services?q=beach&category=tour&location=goa&minPrice=1000&maxPrice=5000&...
 */
export type ServiceSearchParams = {
  q?: string | undefined;
  category?: string | undefined;
  location?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  rating?: number | undefined;
  sort?: string | undefined;
  page?: number | undefined;
  /** "list" (default) or "map" — controls list/map toggle on the services page */
  view?: "list" | "map" | undefined;
};

export type ServiceSearchResult = {
  services: ServiceWithProvider[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Strips characters that are special in PostgREST filter syntax (comma, parens)
 * from user-supplied strings so they cannot break the `.or()` filter string.
 * Note: PostgREST parameterises queries internally — this is a belt-and-
 * suspenders guard against malformed filter strings, not raw SQL injection.
 */
function escapeForFilter(value: string): string {
  return value.replace(/[,)(]/g, " ").trim();
}

/**
 * TanStack Query factory for the backend-searched, paginated service list.
 * Every filter is applied by Supabase/PostgREST on the database — nothing
 * is loaded into the browser then filtered in JavaScript.
 */
export const servicesSearchQuery = (params: ServiceSearchParams) => ({
  queryKey: ["services", "search", params] as const,
  queryFn: async (): Promise<ServiceSearchResult> => {
    const page = Math.max(1, params.page ?? 1);
    const limit = PAGE_LIMIT;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbServices: ServiceWithProvider[] = [];
    try {
      let query = supabase
        .from("services")
        .select(SERVICE_WITH_PROVIDER)
        .eq("is_active", true);

      // Full-text keyword search across title, description, destination, category
      if (params.q?.trim()) {
        const q = escapeForFilter(params.q.trim());
        if (q) {
          query = query.or(
            `title.ilike.%${q}%,description.ilike.%${q}%,destination.ilike.%${q}%,category.ilike.%${q}%`,
          );
        }
      }

      // Category equality filter
      if (params.category) {
        query = query.eq("category", params.category);
      }

      // Location search across destination, city, state, country
      if (params.location?.trim()) {
        const loc = escapeForFilter(params.location.trim());
        if (loc) {
          query = query.or(
            `destination.ilike.%${loc}%,city.ilike.%${loc}%,state.ilike.%${loc}%,country.ilike.%${loc}%`,
          );
        }
      }

      // Price range
      if (params.minPrice !== undefined && params.minPrice > 0) {
        query = query.gte("price", params.minPrice);
      }
      if (params.maxPrice !== undefined && params.maxPrice > 0) {
        query = query.lte("price", params.maxPrice);
      }

      // Minimum rating
      if (params.rating !== undefined && params.rating > 0) {
        query = query.gte("rating", params.rating);
      }

      const { data, error } = await query;
      if (!error && data) {
        dbServices = data as unknown as ServiceWithProvider[];
      }
    } catch {
      // Safe fallback
    }

    // Filter curated catalog
    const allCurated = getAllCuratedServices();
    const existingTitles = new Set(dbServices.map((s) => s.title.toLowerCase().trim()));
    const availableCurated = allCurated.filter(
      (c) => !existingTitles.has(c.title.toLowerCase().trim())
    );

    const filteredCurated = availableCurated.filter((s) => {
      if (params.category && s.category !== params.category) return false;
      if (params.minPrice !== undefined && s.price < params.minPrice) return false;
      if (params.maxPrice !== undefined && s.price > params.maxPrice) return false;
      if (params.rating !== undefined && s.rating < params.rating) return false;
      if (params.location?.trim()) {
        const loc = params.location.toLowerCase().trim();
        const matchesLoc = [s.destination, s.city, s.state, s.country]
          .filter((v): v is string => Boolean(v))
          .some((v) => v.toLowerCase().includes(loc));
        if (!matchesLoc) return false;
      }
      if (params.q?.trim()) {
        const q = params.q.toLowerCase().trim();
        const matchesQ = [s.title, s.description, s.destination, s.city, s.state, s.category]
          .filter((v): v is string => Boolean(v))
          .some((v) => v.toLowerCase().includes(q));
        if (!matchesQ) return false;
      }
      return true;
    });

    const combined = [...dbServices, ...filteredCurated];

    // Sorting
    switch (params.sort) {
      case "price_asc":
        combined.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        combined.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        combined.sort(
          (a, b) =>
            new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
        );
        break;
      default: // "recommended"
        combined.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
    }

    const total = combined.length;
    const paginated = combined.slice(from, to + 1);

    return {
      services: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
});
