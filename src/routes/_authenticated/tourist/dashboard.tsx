import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  Heart,
  History,
  Languages,
  MapPin,
  MapPinned,
  MessageSquareQuote,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
  Wand2,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ServiceCard } from "@/components/ServiceCard";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserInterests } from "@/hooks/useUserInterests";
import { requireRole } from "@/lib/roles";
import { getPersonalizedRecommendations } from "@/lib/recommendations";
import { getUserTripPlansFn } from "@/lib/itinerary.functions";
import {
  formatPrice,
  myBookingsQuery,
  myPaymentsQuery,
  profileQuery,
  servicesQuery,
  touristReviewsQuery,
  type BookingWithService,
} from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/tourist/dashboard")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["tourist"]);
  },
  head: () => ({
    meta: [
      { title: "Traveller Dashboard — Travezy" },
      {
        name: "description",
        content: "See your upcoming trips, booking activity, payments, reviews and personalized recommendations.",
      },
      { property: "og:title", content: "Traveller Dashboard — Travezy" },
      {
        property: "og:description",
        content: "Upcoming trips, bookings, payments and recommendations for your Travezy account.",
      },
    ],
  }),
  component: TouristDashboard,
});

function TouristDashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({ ...profileQuery(userId), enabled: !!userId });

  const {
    data: bookings,
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useQuery({ ...myBookingsQuery(userId), enabled: !!userId });

  const {
    data: payments,
    isLoading: paymentsLoading,
    error: paymentsError,
  } = useQuery({ ...myPaymentsQuery(userId), enabled: !!userId });

  const {
    data: reviews,
    isLoading: reviewsLoading,
    error: reviewsError,
  } = useQuery({ ...touristReviewsQuery(userId), enabled: !!userId });

  const { data: tripPlans = [], isLoading: tripPlansLoading } = useQuery({
    queryKey: ["tourist-trip-plans", userId],
    queryFn: () => getUserTripPlansFn(),
    enabled: !!userId,
  });

  const { data: services } = useQuery(servicesQuery());

  const today = new Date().toISOString().slice(0, 10);

  // ─── Real Statistics Calculations ──────────────────────────────────────────
  const allBookings = bookings ?? [];
  const totalBookingsCount = allBookings.length;

  const upcomingTrips = allBookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    const isFuture = !b.travel_date || b.travel_date >= today;
    return isFuture && s !== "cancelled" && s !== "completed";
  });

  const completedTrips = allBookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "completed";
  });

  const pendingBookings = allBookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "pending";
  });

  const allReviews = reviews ?? [];
  const totalReviewsCount = allReviews.length;
  const avgRatingGiven = totalReviewsCount > 0
    ? (allReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviewsCount).toFixed(1)
    : "—";

  const allPayments = payments ?? [];
  const successfulPayments = allPayments.filter((p) => (p.status || "").toUpperCase() === "SUCCESS");
  const pendingPayments = allPayments.filter((p) => {
    const st = (p.status || "").toUpperCase();
    return st === "CREATED" || st === "PENDING";
  });
  const totalSpent = successfulPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const { interests } = useUserInterests();

  // Recommendations & Wishlist
  const bookedIds = new Set(allBookings.map((b) => b.service_id));
  const wishlist = (services ?? [])
    .filter((s) => !bookedIds.has(s.id) && Number(s.rating) >= 4.8)
    .slice(0, 3);

  const recommended = getPersonalizedRecommendations(
    (services ?? []).filter((s) => !bookedIds.has(s.id)),
    interests,
    3
  );

  // Status badges helper
  const getBookingStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold capitalize text-amber-800 dark:text-amber-300">
          <Clock className="size-3 mr-1" /> Pending
        </span>
      );
    }
    if (s === "confirmed") {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold capitalize text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-3 mr-1" /> Confirmed
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="inline-flex items-center rounded-full bg-destructive/10 border border-destructive/20 px-2.5 py-0.5 text-xs font-semibold capitalize text-destructive">
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-800 dark:text-slate-300">
        Completed
      </span>
    );
  };

  const getPaymentStatusBadge = (booking: BookingWithService) => {
    const isPaid = (booking.payments ?? []).some(
      (p) => (p.status || "").toUpperCase() === "SUCCESS"
    );
    if (isPaid) {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          <CreditCard className="size-3 mr-1" /> Paid
        </span>
      );
    }
    if ((booking.status || "").toLowerCase() === "cancelled") {
      return null;
    }
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
        Payment Due
      </span>
    );
  };

  const isInitialLoading = profileLoading || bookingsLoading;

  return (
    <PageShell
      eyebrow="Traveller Command Centre"
      title={`Welcome back, ${profile?.full_name?.split(" ")[0] || "Traveller"}`}
      subtitle="Track your trips, bookings, payments, and holiday itineraries all in one place."
    >
      {/* ─── 1. Summary Statistics Grid ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={CalendarCheck}
          label="Upcoming Trips"
          value={isInitialLoading ? "…" : String(upcomingTrips.length)}
          subtitle={upcomingTrips.length > 0 ? "Ready to travel" : "None scheduled"}
          to="/tourist/bookings"
          accent="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
        />
        <StatCard
          icon={Clock}
          label="Pending Bookings"
          value={isInitialLoading ? "…" : String(pendingBookings.length)}
          subtitle="Awaiting provider"
          to="/tourist/bookings"
          accent="text-amber-600 dark:text-amber-400 bg-amber-500/10"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed Trips"
          value={isInitialLoading ? "…" : String(completedTrips.length)}
          subtitle="Past journeys"
          to="/tourist/bookings"
          accent="text-blue-600 dark:text-blue-400 bg-blue-500/10"
        />
        <StatCard
          icon={MapPinned}
          label="Total Bookings"
          value={isInitialLoading ? "…" : String(totalBookingsCount)}
          subtitle="Lifetime requests"
          to="/tourist/bookings"
          accent="text-purple-600 dark:text-purple-400 bg-purple-500/10"
        />
        <StatCard
          icon={Wallet}
          label="Total Spent"
          value={isInitialLoading ? "…" : formatPrice(totalSpent)}
          subtitle={`${successfulPayments.length} paid transactions`}
          to="/tourist/payments"
          accent="text-teal-600 dark:text-teal-400 bg-teal-500/10"
        />
        <StatCard
          icon={Star}
          label="Reviews Written"
          value={isInitialLoading ? "…" : String(totalReviewsCount)}
          subtitle={avgRatingGiven !== "—" ? `Avg rating: ${avgRatingGiven}★` : "No reviews yet"}
          to="/tourist/reviews"
          accent="text-gold bg-amber-500/10"
        />
      </div>

      {/* ─── 2. Quick Actions Hub ────────────────────────────────────────────── */}
      <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="font-display text-xl font-bold">Quick Actions & Platform Services</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jump straight to your travel tools, bookings, support, and smart assistants.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
          <QuickActionTile
            to="/planner"
            icon={Sparkles}
            title="✨ AI Planner"
            description="Build custom trip schedule"
            color="bg-amber-500/10 text-gold border-amber-500/30 font-semibold"
          />
          <QuickActionTile
            to="/tourist/itineraries"
            icon={CalendarRange}
            title="My Itineraries"
            description="Saved travel plans"
            color="bg-primary/10 text-primary border-primary/20"
          />
          <QuickActionTile
            to="/services"
            icon={Compass}
            title="Browse Stays"
            description="Explore verified hotels & tours"
            color="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
          />
          <QuickActionTile
            to="/tourist/bookings"
            icon={CalendarClock}
            title="My Trips"
            description="Manage all reservations"
            color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          />
          <QuickActionTile
            to="/tourist/payments"
            icon={CreditCard}
            title="Payments"
            description="Invoices & transactions"
            color="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
          />
          <QuickActionTile
            to="/tourist/reviews"
            icon={MessageSquareQuote}
            title="My Reviews"
            description="Rate & share feedback"
            color="bg-amber-500/10 text-gold border-amber-500/20"
          />
          <QuickActionTile
            to="/translator"
            icon={Languages}
            title="Translator"
            description="Multilingual phrases & voice"
            color="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
          />
          <QuickActionTile
            to="/emergency"
            icon={ShieldAlert}
            title="Emergency Support"
            description="Hospitals, police & SOS"
            color="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
          />
        </div>
      </section>

      {/* ─── 3. AI Assistant & Trip Planner Banner ────────────────────────────── */}
      <section className="mt-8 overflow-hidden rounded-3xl bg-gradient-lagoon p-6 text-primary-foreground shadow-float md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="size-3.5 text-gold animate-spin" />
            AI Travel Planner & Custom Itineraries
          </div>
          <h3 className="font-display text-2xl md:text-3xl font-semibold leading-tight">
            Plan your next journey with Grounded AI
          </h3>
          <p className="text-sm text-primary-foreground/85 leading-relaxed">
            Generate customized day-by-day itineraries with 100% genuine hotels, authentic restaurants, handpicked activities, and verified tour guides.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Button asChild variant="hero" size="lg" className="rounded-2xl shadow-card gap-2">
            <Link to="/planner">
              <Sparkles className="size-4" />
              ✨ Plan My Trip
            </Link>
          </Button>
          <Button asChild variant="glass" size="lg" className="rounded-2xl gap-2">
            <Link to="/tourist/itineraries">
              <CalendarRange className="size-4" />
              My Itineraries
            </Link>
          </Button>
        </div>
      </section>

      {/* ─── 3.5 Saved AI Itineraries Preview ─────────────────────────────────── */}
      {tripPlans.length > 0 && (
        <section className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <CalendarRange className="size-5 text-primary" /> My Saved Itineraries ({tripPlans.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Custom trip schedules crafted for your upcoming journeys.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
              <Link to="/tourist/itineraries">View All Itineraries</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tripPlans.slice(0, 3).map((plan) => (
              <Link
                key={plan.id}
                to="/itinerary/$itineraryId"
                params={{ itineraryId: plan.id }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-muted/30 p-4 transition-all hover:bg-card hover:border-primary/40 hover:shadow-card"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="font-semibold text-primary capitalize">{plan.destination}</span>
                    <span>{plan.days_count} Days · {plan.travelers_count} {plan.travelers_count === 1 ? "Traveller" : "Travellers"}</span>
                  </div>
                  <h4 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {plan.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {plan.travel_style} pace · {plan.budget_tier} tier · {plan.interests?.slice(0, 3).join(", ")}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">
                    {formatPrice(Number(plan.estimated_total_cost || 0))}
                  </span>
                  <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    View Schedule <ArrowRight className="size-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── 4. Upcoming Trips Section ───────────────────────────────────────── */}
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2.5">
              <Compass className="size-6 text-primary" /> Upcoming Trips
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Confirmed and pending journeys scheduled for your upcoming dates.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/tourist/bookings">All Bookings</Link>
            </Button>
            <Button asChild variant="ocean" size="sm">
              <Link to="/services">Book Another</Link>
            </Button>
          </div>
        </div>

        {bookingsLoading ? (
          <div className="mt-6 space-y-4">
            <div className="h-28 bg-muted/60 animate-pulse rounded-3xl" />
            <div className="h-28 bg-muted/60 animate-pulse rounded-3xl" />
          </div>
        ) : bookingsError ? (
          <div className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
            <p className="text-destructive text-sm font-medium">
              We couldn't load your bookings right now.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchBookings()}>
              <RefreshCw className="size-3.5 mr-1.5" /> Try Again
            </Button>
          </div>
        ) : upcomingTrips.length > 0 ? (
          <div className="mt-6 grid gap-4">
            {upcomingTrips.map((b) => {
              const service = b.services;
              const providerName = service?.providers?.business_name || "Travezy Partner";

              return (
                <div
                  key={b.id}
                  className="flex flex-wrap md:flex-nowrap items-center gap-5 rounded-3xl border border-border bg-card p-5 shadow-card hover:shadow-float hover:border-accent/40 transition-all group"
                >
                  <img
                    src={service?.image_url || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80"}
                    alt={service?.title || "Trip Booking"}
                    loading="lazy"
                    className="w-full md:size-24 rounded-2xl object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getBookingStatusBadge(b.status)}
                      {getPaymentStatusBadge(b)}
                      <span className="text-xs text-muted-foreground font-mono">
                        #{b.id.slice(0, 8)}
                      </span>
                    </div>

                    <Link
                      to="/tourist/bookings/$bookingId"
                      params={{ bookingId: b.id }}
                      className="font-display text-xl leading-snug group-hover:text-primary transition-colors block"
                    >
                      {service?.title || "Travel Experience"}
                    </Link>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5 text-accent shrink-0" />
                        {service?.destination || "Destination to confirm"}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                        Provider: <strong>{providerName}</strong>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="size-3.5 text-accent shrink-0" />
                        {b.travel_date || "Date to confirm"}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5 text-accent shrink-0" />
                        {b.guests} guest{b.guests > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between md:flex-col items-center md:items-end w-full md:w-auto border-t md:border-t-0 border-border pt-3 md:pt-0 shrink-0 gap-2">
                    <p className="font-display text-2xl text-primary font-bold">
                      {formatPrice(Number(b.total_price))}
                    </p>
                    <Button asChild variant="ocean" size="sm" className="rounded-xl">
                      <Link to="/tourist/bookings/$bookingId" params={{ bookingId: b.id }}>
                        View Trip <ArrowRight className="size-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-border bg-card/40 p-10 text-center space-y-3">
            <Compass className="size-10 text-muted-foreground mx-auto" />
            <h3 className="font-display text-lg font-semibold">No upcoming trips booked</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your next adventure is waiting. Discover verified stays, day tours, and thrilling outdoor experiences.
            </p>
            <Button asChild variant="hero" size="sm" className="mt-2">
              <Link to="/services">Explore Stays & Tours</Link>
            </Button>
          </div>
        )}
      </section>

      {/* ─── 5. Recent Booking Activity Timeline ─────────────────────────────── */}
      {allBookings.length > 0 && (
        <section className="mt-14">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                <History className="size-5 text-primary" /> Recent Booking Activity
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time chronological timeline of your recent reservations.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/tourist/bookings">View All Activity</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3">
            {allBookings.slice(0, 4).map((b) => {
              const status = (b.status || "").toLowerCase();
              let activityLabel = "Booking request submitted";
              let activityIcon = Clock;
              let activityBg = "bg-amber-500/10 text-amber-600 dark:text-amber-400";

              if (status === "confirmed") {
                activityLabel = "Booking confirmed by host";
                activityIcon = CheckCircle2;
                activityBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
              } else if (status === "completed") {
                activityLabel = "Trip completed";
                activityIcon = CheckCircle2;
                activityBg = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
              } else if (status === "cancelled") {
                activityLabel = "Booking cancelled";
                activityIcon = AlertCircle;
                activityBg = "bg-rose-500/10 text-rose-600 dark:text-rose-400";
              }

              const ActivityIconComponent = activityIcon;

              return (
                <Link
                  key={b.id}
                  to="/tourist/bookings/$bookingId"
                  params={{ bookingId: b.id }}
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`p-2.5 rounded-xl ${activityBg} shrink-0`}>
                      <ActivityIconComponent className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                        {activityLabel} — {b.services?.title || "Trip Booking"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Date: {b.travel_date || "TBD"} · {b.guests} guest{b.guests > 1 ? "s" : ""} · Ref: #{b.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div className="hidden sm:block">
                      <p className="text-sm font-bold text-foreground">
                        {formatPrice(Number(b.total_price))}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── 6. Payment Overview Section ─────────────────────────────────────── */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2.5">
              <Wallet className="size-6 text-teal-600 dark:text-teal-400" /> Payment & Transaction Summary
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review your transaction receipts, active orders, and completed charges.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/tourist/payments">View Payment History</Link>
          </Button>
        </div>

        {paymentsLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-36 bg-muted/60 animate-pulse rounded-3xl" />
            <div className="h-36 bg-muted/60 animate-pulse rounded-3xl" />
            <div className="h-36 bg-muted/60 animate-pulse rounded-3xl" />
          </div>
        ) : allPayments.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allPayments.slice(0, 3).map((p) => {
              const isSuccess = (p.status || "").toUpperCase() === "SUCCESS";
              return (
                <Link
                  key={p.id}
                  to="/tourist/payments/$paymentId"
                  params={{ paymentId: p.id }}
                  className="rounded-3xl border border-border bg-card p-5 shadow-card hover:shadow-float hover:border-accent/40 transition-all block group"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{p.id.slice(0, 8)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        isSuccess
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="font-display text-lg mt-2.5 group-hover:text-primary transition-colors truncate">
                    {p.bookings?.services?.title || "Trip Booking"}
                  </p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-border text-xs">
                    <span className="text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-display text-base font-bold text-primary">
                      {formatPrice(Number(p.amount), p.currency)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center space-y-2">
            <CreditCard className="size-8 text-muted-foreground mx-auto" />
            <h4 className="font-semibold text-sm">No payment records found</h4>
            <p className="text-xs text-muted-foreground">
              Payments made for your trips and experiences will show up here with itemized receipts.
            </p>
          </div>
        )}
      </section>

      {/* ─── 7. Review Overview Section ──────────────────────────────────────── */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2.5">
              <Star className="size-6 text-gold fill-current" /> My Reviews & Ratings
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Feedback you have given to hosts and their official responses.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/tourist/reviews">View My Reviews</Link>
          </Button>
        </div>

        {reviewsLoading ? (
          <div className="mt-6 space-y-4">
            <div className="h-32 bg-muted/60 animate-pulse rounded-3xl" />
          </div>
        ) : allReviews.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {allReviews.slice(0, 2).map((r) => {
              const service = r.services;
              return (
                <div
                  key={r.id}
                  className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5">
                      {service?.image_url && (
                        <img
                          src={service.image_url}
                          alt={service.title}
                          className="size-10 rounded-xl object-cover shrink-0"
                        />
                      )}
                      <div>
                        <h4 className="font-display text-base font-semibold truncate max-w-[200px]">
                          {service?.title || "Travel Experience"}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center text-gold">
                      {Array.from({ length: Number(r.rating) }).map((_, i) => (
                        <Star key={i} className="size-3.5 fill-current" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-foreground/90 italic bg-muted/30 p-3 rounded-xl border border-border">
                    "{r.comment}"
                  </p>

                  {r.provider_response && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1">
                      <div className="flex justify-between items-center text-[11px] text-primary font-bold">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="size-3.5" /> Host Reply ({service?.providers?.business_name || "Provider"})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {r.provider_response}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center space-y-2">
            <MessageSquareQuote className="size-8 text-muted-foreground mx-auto" />
            <h4 className="font-semibold text-sm">No reviews submitted yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Once you finish an experience, you can rate and review your stay to help future travellers.
            </p>
          </div>
        )}
      </section>

      {/* ─── 8. Wishlist & Recommended ──────────────────────────────────────── */}
      {wishlist.length > 0 && (
        <section className="mt-14">
          <h2 className="flex items-center gap-2 font-display text-2xl md:text-3xl font-bold">
            <Heart className="size-6 text-gold fill-current" /> Handpicked for Your Wishlist
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {wishlist.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} />
            ))}
          </div>
        </section>
      )}

      {recommended.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl md:text-3xl font-bold">
            Recommended Experiences for You
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  to,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  subtitle?: string;
  to?: string;
  accent: string;
}) {
  const content = (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card hover:shadow-float hover:border-accent/40 transition-all flex flex-col justify-between h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className={`grid size-9 place-items-center rounded-xl ${accent} shrink-0`}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3">
        <p className="font-display text-2xl font-bold leading-tight">{value}</p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to} className="block group">{content}</Link>;
  }

  return content;
}

function QuickActionTile({
  to,
  icon: Icon,
  title,
  description,
  color,
}: {
  to: string;
  icon: any;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className={`rounded-2xl border p-4 transition-all hover:scale-[1.02] hover:shadow-card flex flex-col justify-between group ${color}`}
    >
      <div className="flex items-center justify-between">
        <Icon className="size-5" />
        <ArrowRight className="size-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
      <div className="mt-3">
        <p className="font-display text-sm font-bold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">
          {description}
        </p>
      </div>
    </Link>
  );
}

