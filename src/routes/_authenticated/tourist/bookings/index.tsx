import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays,
  Compass,
  History,
  MapPin,
  Users,
  ArrowRight,
  Star,
  CheckCircle2,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ReviewFormDialog } from "@/components/ReviewFormDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import { formatPrice, myBookingsQuery, touristReviewsQuery, type BookingWithService } from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/tourist/bookings/")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["tourist"]);
  },
  head: () => ({
    meta: [
      { title: "My Trips — Travezy" },
      { name: "description", content: "Review and manage all of your Travezy bookings." },
    ],
  }),
  component: MyBookings,
});

type FilterStatus = "all" | "pending" | "confirmed" | "completed" | "cancelled";

function MyBookings() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const {
    data: bookings,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({ ...myBookingsQuery(userId), enabled: !!userId });

  const { data: userReviews } = useQuery({
    ...touristReviewsQuery(userId),
    enabled: !!userId,
  });

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [activeReviewBooking, setActiveReviewBooking] = useState<BookingWithService | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Map of bookingId -> Review for quick O(1) lookup
  const reviewMap = new Map<string, any>();
  (userReviews ?? []).forEach((r) => {
    if (r.booking_id) reviewMap.set(r.booking_id, r);
    if (r.service_id) reviewMap.set(`srv_${r.service_id}`, r);
  });

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/20 px-2.5 py-0.5 text-xs font-semibold capitalize text-amber-800 dark:text-amber-300">
          Pending
        </span>
      );
    }
    if (s === "confirmed") {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-0.5 text-xs font-semibold capitalize text-emerald-800 dark:text-emerald-300">
          Confirmed
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-destructive">
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-800 dark:text-slate-300">
        Completed
      </span>
    );
  };

  const getPaymentBadge = (booking: any) => {
    const isPaid = (booking.payments ?? []).some(
      (p: any) => p.status?.toUpperCase() === "SUCCESS"
    );
    if (isPaid) {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          Paid
        </span>
      );
    }
    if (booking.status?.toLowerCase() === "cancelled") {
      return null;
    }
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
        Payment Due
      </span>
    );
  };

  const filteredBookings = (bookings ?? []).filter((b) => {
    if (filter === "all") return true;
    return b.status.toLowerCase() === filter;
  });

  // Split into upcoming and past
  const upcoming = filteredBookings.filter((b) => {
    const s = b.status.toLowerCase();
    const date = b.travel_date ?? "";
    return date >= todayStr && s !== "cancelled" && s !== "completed";
  });

  const past = filteredBookings.filter((b) => {
    const s = b.status.toLowerCase();
    const date = b.travel_date ?? "";
    return date < todayStr || s === "cancelled" || s === "completed";
  });

  const filterTabs: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "All bookings" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <PageShell eyebrow="Traveller" title="My trips" subtitle="Every experience and stay booked through Travezy.">
      {error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
          <p className="font-medium text-destructive">
            We couldn't load your bookings. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-32 bg-muted animate-pulse rounded-3xl" />
          <div className="h-32 bg-muted animate-pulse rounded-3xl" />
        </div>
      ) : bookings?.length ? (
        <div className="space-y-8">
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-4">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                  filter === tab.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Upcoming Trips */}
          {upcoming.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-display flex items-center gap-2">
                <Compass className="size-5 text-primary" /> Upcoming trips
              </h3>
              <div className="grid gap-4">
                {upcoming.map((b) => (
                  <Link
                    key={b.id}
                    to="/tourist/bookings/$bookingId"
                    params={{ bookingId: b.id }}
                    className="flex flex-wrap md:flex-nowrap items-center gap-5 rounded-3xl border border-border bg-card p-5 shadow-card hover:shadow-float hover:border-accent/40 transition-all group cursor-pointer"
                  >
                    <img
                      src={b.services?.image_url ?? ""}
                      alt={b.services?.title ?? "Trip"}
                      loading="lazy"
                      className="w-full md:size-24 rounded-2xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(b.status)}
                        {getPaymentBadge(b)}
                        <span className="text-xs text-muted-foreground font-mono">ID: {b.id.slice(0, 8)}</span>
                      </div>
                      <p className="font-display text-xl mt-1.5 leading-snug group-hover:text-primary transition-colors font-bold">
                        {b.services?.title}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                        <MapPin className="size-4 text-accent shrink-0" />
                        {b.services?.destination} · <CalendarDays className="size-4 text-accent shrink-0" /> {b.travel_date} · <Users className="size-4 text-accent shrink-0" /> {b.guests} guest{b.guests > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex justify-between md:flex-col items-center md:items-end w-full md:w-auto border-t md:border-t-0 border-border pt-3 md:pt-0 shrink-0">
                      <p className="font-display text-xl text-primary font-bold">
                        {formatPrice(Number(b.total_price))}
                      </p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1 group-hover:translate-x-1 transition-transform">
                        Details <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Past & Completed Trips */}
          {past.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-xl font-display flex items-center gap-2 text-muted-foreground">
                <History className="size-5" /> Past & Completed trips
              </h3>
              <div className="grid gap-4">
                {past.map((b) => {
                  const isCompleted = b.status.toLowerCase() === "completed";
                  const existingRev = reviewMap.get(b.id) || reviewMap.get(`srv_${b.service_id}`);

                  return (
                    <div
                      key={b.id}
                      className="flex flex-wrap md:flex-nowrap items-center justify-between gap-5 rounded-3xl border border-border bg-card/75 p-5 shadow-card hover:shadow-float hover:border-accent/40 transition-all group"
                    >
                      <Link
                        to="/tourist/bookings/$bookingId"
                        params={{ bookingId: b.id }}
                        className="flex flex-1 items-center gap-5 min-w-0 cursor-pointer"
                      >
                        <img
                          src={b.services?.image_url ?? ""}
                          alt={b.services?.title ?? "Trip"}
                          loading="lazy"
                          className="size-20 rounded-2xl object-cover shrink-0 filter brightness-95"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(b.status)}
                            {getPaymentBadge(b)}
                            <span className="text-xs text-muted-foreground font-mono">ID: {b.id.slice(0, 8)}</span>
                          </div>
                          <p className="font-display text-lg mt-1.5 leading-snug group-hover:text-primary transition-colors font-bold truncate">
                            {b.services?.title}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
                            <MapPin className="size-3.5 text-accent shrink-0" />
                            {b.services?.destination} · <CalendarDays className="size-3.5 text-accent shrink-0" /> {b.travel_date} · <Users className="size-3.5 text-accent shrink-0" /> {b.guests} guest{b.guests > 1 ? "s" : ""}
                          </p>
                        </div>
                      </Link>

                      {/* Right actions: Review & Details */}
                      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-border pt-3 md:pt-0 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="font-display text-base text-foreground font-bold">
                            {formatPrice(Number(b.total_price))}
                          </p>
                        </div>

                        {isCompleted && (
                          existingRev ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveReviewBooking(b)}
                              className="rounded-full text-xs gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2 className="size-3.5" /> Review Submitted ({existingRev.rating}★)
                            </Button>
                          ) : (
                            <Button
                              variant="hero"
                              size="sm"
                              onClick={() => setActiveReviewBooking(b)}
                              className="rounded-full text-xs gap-1 shadow-xs"
                            >
                              <Star className="size-3.5 fill-current" /> Write a Review
                            </Button>
                          )
                        )}

                        <Button asChild variant="ghost" size="sm" className="rounded-full text-xs">
                          <Link to="/tourist/bookings/$bookingId" params={{ bookingId: b.id }}>
                            Details <ArrowRight className="size-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredBookings.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">No bookings found matching the selected filter.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">You haven't made any bookings yet.</p>
          <Button asChild variant="hero" className="mt-5">
            <Link to="/services">Explore experiences</Link>
          </Button>
        </div>
      )}

      {/* Review Dialog Trigger from My Trips List */}
      {activeReviewBooking && activeReviewBooking.services && (
        <ReviewFormDialog
          bookingId={activeReviewBooking.id}
          serviceId={activeReviewBooking.services.id || activeReviewBooking.service_id}
          serviceTitle={activeReviewBooking.services.title}
          existingReview={reviewMap.get(activeReviewBooking.id) || reviewMap.get(`srv_${activeReviewBooking.service_id}`) || null}
          isOpen={!!activeReviewBooking}
          onClose={() => setActiveReviewBooking(null)}
        />
      )}
    </PageShell>
  );
}
