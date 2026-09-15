import { supabase } from "@/integrations/supabase/client";
import type { Booking, Profile, Provider, Service } from "@/lib/travezy";
import type { AppRole } from "./roles";

export type AdminReview = {
  id: string;
  service_id: string;
  user_id: string;
  booking_id: string | null;
  rating: number;
  title?: string | null;
  comment: string | null;
  images?: string[] | null;
  is_hidden?: boolean | null;
  is_moderated?: boolean | null;
  provider_response: string | null;
  provider_responded_at: string | null;
  created_at: string;
  services?: Pick<Service, "title" | "destination"> | null;
  user?: Pick<Profile, "full_name" | "email"> | null;
};

export type AdminUser = Profile & {
  resolved_role: AppRole;
};

export type AdminProviderWithStats = Provider & {
  services_count: number;
  bookings_count: number;
  average_rating: number;
  profile?: Pick<Profile, "full_name" | "email" | "phone"> | null;
};

export type AdminPayment = {
  id: string;
  booking_id: string;
  user_id: string;
  provider_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  method: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  error_code: string | null;
  error_description: string | null;
  created_at: string;
  updated_at: string;
  booking?: {
    id: string;
    travel_date: string | null;
    status: string;
    guests: number;
    services?: Pick<Service, "title" | "destination"> | null;
  } | null;
  user?: Pick<Profile, "full_name" | "email"> | null;
};

export type AdminOverviewData = {
  users: number;
  tourists: number;
  providers: number;
  admins: number;
  services: number;
  activeServices: number;
  bookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  successfulPaymentsCount: number;
  grossRevenue: number;
  reviews: number;
  recentBookings: Array<
    Pick<Booking, "id" | "status" | "guests" | "total_price" | "created_at" | "travel_date"> & {
      services: Pick<Service, "title" | "destination"> | null;
    }
  >;
  recentPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    payment_method: string | null;
    created_at: string;
    booking_id: string;
  }>;
};

export const adminOverviewQuery = {
  queryKey: ["admin", "overview"],
  queryFn: async (): Promise<AdminOverviewData> => {
    // 1. Fetch profiles and user_roles to get exact user counts
    const [
      profilesRes,
      rolesRes,
      providersRes,
      servicesRes,
      bookingsRes,
      paymentsRes,
      reviewsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id, account_type"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("providers").select("id"),
      supabase.from("services").select("id, is_active"),
      supabase.from("bookings").select("id, status, total_price"),
      supabase.from("payments").select("id, amount, status"),
      supabase.from("reviews").select("id"),
    ]);

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const providers = providersRes.data ?? [];
    const services = servicesRes.data ?? [];
    const bookings = bookingsRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const reviews = reviewsRes.data ?? [];

    // Map role for each user
    let touristCount = 0;
    let providerCount = providers.length;
    let adminCount = 0;

    const roleMap = new Map<string, string>();
    roles.forEach((r) => roleMap.set(r.user_id, r.role));

    profiles.forEach((p) => {
      const explicitRole = roleMap.get(p.id) || p.account_type;
      if (explicitRole === "admin") adminCount++;
      else if (explicitRole === "provider") {
        /* already counted from providers table */
      } else touristCount++;
    });

    // Bookings breakdown
    let pendingCount = 0;
    let confirmedCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    bookings.forEach((b) => {
      const s = (b.status || "").toLowerCase();
      if (s === "pending") pendingCount++;
      else if (s === "confirmed") confirmedCount++;
      else if (s === "completed") completedCount++;
      else if (s === "cancelled") cancelledCount++;
    });

    // Payments calculations
    let successfulPaymentsCount = 0;
    let grossRevenue = 0;

    payments.forEach((p) => {
      const s = (p.status || "").toLowerCase();
      if (s === "success" || s === "paid") {
        successfulPaymentsCount++;
        grossRevenue += Number(p.amount) || 0;
      }
    });

    // If payments table is empty but completed/confirmed bookings exist, calculate from bookings
    if (grossRevenue === 0 && bookings.length > 0) {
      bookings.forEach((b) => {
        const s = (b.status || "").toLowerCase();
        if (s === "completed" || s === "confirmed") {
          grossRevenue += Number(b.total_price) || 0;
        }
      });
    }

    // Recent bookings
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("id, status, guests, total_price, travel_date, created_at, services(title, destination)")
      .order("created_at", { ascending: false })
      .limit(8);

    // Recent payments
    const { data: recentPayments } = await supabase
      .from("payments")
      .select("id, amount, currency, status, payment_method, created_at, booking_id")
      .order("created_at", { ascending: false })
      .limit(6);

    return {
      users: profiles.length,
      tourists: touristCount,
      providers: providerCount,
      admins: adminCount,
      services: services.length,
      activeServices: services.filter((s) => s.is_active).length,
      bookings: bookings.length,
      pendingBookings: pendingCount,
      confirmedBookings: confirmedCount,
      completedBookings: completedCount,
      cancelledBookings: cancelledCount,
      successfulPaymentsCount,
      grossRevenue,
      reviews: reviews.length,
      recentBookings: (recentBookings ?? []) as AdminOverviewData["recentBookings"],
      recentPayments: (recentPayments ?? []) as AdminOverviewData["recentPayments"],
    };
  },
};

export const adminUsersQuery = {
  queryKey: ["admin", "users"],
  queryFn: async (): Promise<AdminUser[]> => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profilesRes.error) throw profilesRes.error;

    const roleMap = new Map<string, AppRole>();
    (rolesRes.data ?? []).forEach((r) => {
      const role = r.role as AppRole;
      if (role === "admin" || !roleMap.has(r.user_id)) {
        roleMap.set(r.user_id, role);
      }
    });

    return (profilesRes.data ?? []).map((p) => {
      const resolved = roleMap.get(p.id) || (p.account_type as AppRole) || "tourist";
      return {
        ...p,
        resolved_role: resolved,
      };
    });
  },
};

export const adminProvidersQuery = {
  queryKey: ["admin", "providers"],
  queryFn: async (): Promise<AdminProviderWithStats[]> => {
    const [providersRes, servicesRes, bookingsRes, profilesRes] = await Promise.all([
      supabase.from("providers").select("*").order("created_at", { ascending: false }),
      supabase.from("services").select("id, provider_id, rating"),
      supabase.from("bookings").select("id, provider_id, service_id"),
      supabase.from("profiles").select("id, full_name, email, phone"),
    ]);

    if (providersRes.error) throw providersRes.error;

    const providers = providersRes.data ?? [];
    const services = servicesRes.data ?? [];
    const bookings = bookingsRes.data ?? [];
    const profiles = profilesRes.data ?? [];

    const profileMap = new Map<string, Pick<Profile, "full_name" | "email" | "phone">>();
    profiles.forEach((p) => profileMap.set(p.id, p));

    return providers.map((prov) => {
      const provServices = services.filter((s) => s.provider_id === prov.id);
      const provBookings = bookings.filter((b) => b.provider_id === prov.id);
      const ratings = provServices.map((s) => s.rating).filter((r) => r > 0);
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      return {
        ...prov,
        services_count: provServices.length,
        bookings_count: provBookings.length,
        average_rating: Number(avgRating.toFixed(1)),
        profile: profileMap.get(prov.user_id) || null,
      };
    });
  },
};

export const adminServicesQuery = {
  queryKey: ["admin", "services"],
  queryFn: async (): Promise<Array<Service & { providers: Pick<Provider, "business_name" | "verified"> | null }>> => {
    const { data, error } = await supabase
      .from("services")
      .select("*, providers(business_name, verified)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

export const adminBookingsQuery = {
  queryKey: ["admin", "bookings"],
  queryFn: async () => {
    const [bookingsRes, profilesRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, services(title, destination, category, price, currency, provider_id)")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, phone"),
    ]);

    if (bookingsRes.error) throw bookingsRes.error;

    const profiles = profilesRes.data ?? [];
    const profileMap = new Map<string, Pick<Profile, "full_name" | "email" | "phone">>();
    profiles.forEach((p) => profileMap.set(p.id, p));

    return (bookingsRes.data ?? []).map((b) => ({
      ...b,
      tourist: profileMap.get(b.user_id) || null,
    }));
  },
};

export const adminPaymentsQuery = {
  queryKey: ["admin", "payments"],
  queryFn: async (): Promise<AdminPayment[]> => {
    const [paymentsRes, bookingsRes, profilesRes] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("id, travel_date, status, guests, services(title, destination)"),
      supabase.from("profiles").select("id, full_name, email"),
    ]);

    if (paymentsRes.error) throw paymentsRes.error;

    const bookings = bookingsRes.data ?? [];
    const profiles = profilesRes.data ?? [];

    const bookingMap = new Map<string, any>();
    bookings.forEach((b) => bookingMap.set(b.id, b));

    const profileMap = new Map<string, Pick<Profile, "full_name" | "email">>();
    profiles.forEach((p) => profileMap.set(p.id, p));

    return (paymentsRes.data ?? []).map((p) => ({
      ...p,
      booking: bookingMap.get(p.booking_id) || null,
      user: profileMap.get(p.user_id) || null,
    }));
  },
};

export const adminReviewsQuery = {
  queryKey: ["admin", "reviews"],
  queryFn: async (): Promise<AdminReview[]> => {
    let dbReviews: any[] = [];
    let profiles: any[] = [];

    try {
      const [reviewsRes, profilesRes] = await Promise.all([
        supabase
          .from("reviews")
          .select("id, service_id, user_id, booking_id, rating, title, comment, images, is_hidden, is_moderated, provider_response, provider_responded_at, created_at, services(title, destination)")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email"),
      ]);

      if (!reviewsRes.error && reviewsRes.data) {
        dbReviews = reviewsRes.data;
      }
      if (!profilesRes.error && profilesRes.data) {
        profiles = profilesRes.data;
      }
    } catch {
      // Fallback
    }

    const profileMap = new Map<string, Pick<Profile, "full_name" | "email">>();
    profiles.forEach((p) => profileMap.set(p.id, p));

    const mappedDbReviews: AdminReview[] = dbReviews.map((r) => ({
      ...r,
      user: profileMap.get(r.user_id) || null,
    }));

    // Merge curated reviews if present
    const { CURATED_REVIEWS } = await import("@/data/curated-reviews");
    const { getAllCuratedServices } = await import("@/lib/travezy");
    const allCuratedServices = getAllCuratedServices();
    const serviceMap = new Map(allCuratedServices.map((s) => [s.id, s]));

    const existingIds = new Set(mappedDbReviews.map((r) => r.id));
    const formattedCurated: AdminReview[] = CURATED_REVIEWS.filter(
      (cr) => !existingIds.has(cr.id)
    ).map((cr) => {
      const s = serviceMap.get(cr.service_id);
      return {
        id: cr.id,
        service_id: cr.service_id,
        user_id: cr.user_id || "demo-tourist",
        booking_id: cr.booking_id || null,
        rating: cr.rating,
        title: cr.title || null,
        comment: cr.comment,
        images: cr.images || null,
        is_hidden: false,
        is_moderated: false,
        provider_response: cr.provider_response || null,
        provider_responded_at: cr.provider_responded_at || null,
        created_at: cr.created_at,
        services: s ? { title: s.title, destination: s.destination } : null,
        user: { full_name: cr.reviewer_name, email: `${cr.reviewer_name.toLowerCase().replace(/\s+/g, '.')}@example.com` },
      };
    });

    return [...mappedDbReviews, ...formattedCurated];
  },
};
