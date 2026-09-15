import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  format,
  subDays,
  subMonths,
  subYears,
  parseISO,
  isAfter,
  startOfMonth,
  eachMonthOfInterval,
  eachDayOfInterval,
} from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  CreditCard,
  DollarSign,
  Eye,
  Filter,
  Flame,
  Layers,
  LineChart,
  MapPin,
  PieChart,
  Plane,
  Receipt,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import {
  formatPrice,
  myProviderQuery,
  providerBookingsQuery,
  providerReviewsQuery,
  providerServicesQuery,
  type BookingWithService,
  type ReviewWithService,
  type Service,
} from "@/lib/travezy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/provider/analytics")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Revenue & Performance Analytics — Travezy Provider Hub" },
      {
        name: "description",
        content: "Deep business telemetry, booking growth trajectories, earnings breakdowns, and listing metrics on Travezy.",
      },
      { property: "og:title", content: "Revenue & Performance Analytics — Travezy Provider Hub" },
      {
        property: "og:description",
        content: "Track your hospitality business growth and revenue performance.",
      },
    ],
  }),
  component: ProviderAnalyticsPage,
});

type TimeRange = "7d" | "30d" | "90d" | "180d" | "1y" | "all";

function ProviderAnalyticsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: provider } = useQuery({ ...myProviderQuery(userId), enabled: !!userId });
  const providerId = provider?.id ?? "";

  // 1. Services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    ...providerServicesQuery(providerId),
    enabled: !!providerId,
  });

  // 2. Bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    ...providerBookingsQuery(providerId),
    enabled: !!providerId,
  });

  // 3. Reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    ...providerReviewsQuery(providerId),
    enabled: !!providerId,
  });

  // Time range filter state
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>("all");

  // Determine cutoff date for time range filtering
  const now = useMemo(() => new Date(), []);
  const cutoffDate = useMemo(() => {
    switch (timeRange) {
      case "7d":
        return subDays(now, 7);
      case "30d":
        return subDays(now, 30);
      case "90d":
        return subMonths(now, 3);
      case "180d":
        return subMonths(now, 6);
      case "1y":
        return subYears(now, 1);
      case "all":
      default:
        return new Date(0);
    }
  }, [timeRange, now]);

  // Filter bookings within selected time range & service filter
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (selectedServiceFilter !== "all" && b.service_id !== selectedServiceFilter) return false;
      const bDate = b.created_at ? parseISO(b.created_at) : (b.travel_date ? parseISO(b.travel_date) : new Date(0));
      return isAfter(bDate, cutoffDate);
    });
  }, [bookings, selectedServiceFilter, cutoffDate]);

  // Core Financial & Operational Telemetry
  const metrics = useMemo(() => {
    let grossBookingValue = 0;
    let realizedEarnings = 0;
    let pendingEarnings = 0;
    let completedCount = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let totalGuests = 0;

    for (const b of filteredBookings) {
      const price = Number(b.total_price) || 0;
      const guests = Number(b.guests) || 1;
      grossBookingValue += price;
      totalGuests += guests;

      if (b.status === "completed") {
        completedCount++;
        realizedEarnings += price;
      } else if (b.status === "confirmed") {
        confirmedCount++;
        pendingEarnings += price;
      } else if (b.status === "pending") {
        pendingCount++;
        pendingEarnings += price;
      } else if (b.status === "cancelled" || b.status === "rejected") {
        cancelledCount++;
      }
    }

    const totalCount = filteredBookings.length;
    const avgBookingValue = totalCount > 0 ? Math.round(grossBookingValue / totalCount) : 0;
    const completionRate = totalCount > 0 ? Math.round(((completedCount + confirmedCount) / totalCount) * 100) : 0;
    const cancellationRate = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0;
    const platformFee = Math.round(realizedEarnings * 0.10); // 10% platform fee
    const netEarnings = Math.max(0, realizedEarnings - platformFee);

    return {
      grossBookingValue,
      realizedEarnings,
      netEarnings,
      platformFee,
      pendingEarnings,
      completedCount,
      confirmedCount,
      pendingCount,
      cancelledCount,
      totalCount,
      totalGuests,
      avgBookingValue,
      completionRate,
      cancellationRate,
    };
  }, [filteredBookings]);

  // Top Performing Services Leaderboard
  const servicePerformance = useMemo(() => {
    const map = new Map<string, { service: Service; revenue: number; bookings: number; completed: number }>();

    for (const s of services) {
      map.set(s.id, { service: s, revenue: 0, bookings: 0, completed: 0 });
    }

    for (const b of filteredBookings) {
      if (!b.service_id) continue;
      const entry = map.get(b.service_id);
      if (entry) {
        entry.bookings++;
        const price = Number(b.total_price) || 0;
        if (b.status !== "cancelled" && b.status !== "rejected") {
          entry.revenue += price;
        }
        if (b.status === "completed") {
          entry.completed++;
        }
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [services, filteredBookings]);

  // Monthly Revenue Trajectory
  const monthlyRevenueData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now,
    });

    return months.map((month) => {
      const monthKey = format(month, "yyyy-MM");
      const monthLabel = format(month, "MMM yyyy");

      let revenue = 0;
      let count = 0;

      for (const b of bookings) {
        if (!b.travel_date || !b.travel_date.startsWith(monthKey)) continue;
        if (selectedServiceFilter !== "all" && b.service_id !== selectedServiceFilter) continue;
        if (b.status === "completed" || b.status === "confirmed") {
          revenue += Number(b.total_price) || 0;
          count++;
        }
      }

      return { monthLabel, revenue, count };
    });
  }, [bookings, now, selectedServiceFilter]);

  const maxMonthRev = Math.max(1, ...monthlyRevenueData.map((d) => d.revenue));

  // Reviews Sentiment & Star Distribution
  const reviewStats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / total).toFixed(1) : "5.0";

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5))) as 1 | 2 | 3 | 4 | 5;
      counts[star]++;
    }

    return { total, avg, counts };
  }, [reviews]);

  return (
    <PageShell
      eyebrow="Provider Command Center"
      title="Revenue & Performance Analytics"
      subtitle="Examine your hospitality revenue growth, booking fulfillment metrics, and listing performance trends."
    >
      <div className="space-y-6">
        {/* ─── 1. Filter Bar & Time Range Selector ─────────────────────────────── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          {/* Time Range Pills */}
          <div className="flex items-center rounded-xl border border-border/70 bg-muted/40 p-1 overflow-x-auto scrollbar-none">
            {[
              { id: "7d", label: "Last 7 Days" },
              { id: "30d", label: "Last 30 Days" },
              { id: "90d", label: "Last 3 Months" },
              { id: "180d", label: "Last 6 Months" },
              { id: "1y", label: "Last 1 Year" },
              { id: "all", label: "All Time" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeRange(t.id as TimeRange)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  timeRange === t.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Service Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <select
              value={selectedServiceFilter}
              onChange={(e) => setSelectedServiceFilter(e.target.value)}
              className="h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium"
            >
              <option value="all">All Service Listings ({services.length})</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── 2. Top-Line Financial KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gross Booking Value
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Receipt className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {formatPrice(metrics.grossBookingValue, "INR")}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Across {metrics.totalCount} total bookings</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Net Provider Earnings
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Coins className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
              {formatPrice(metrics.netEarnings, "INR")}
            </div>
            <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/80">
              After 10% platform fee ({formatPrice(metrics.platformFee, "INR")})
            </p>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                Avg Booking Value (ABV)
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-400">
              {formatPrice(metrics.avgBookingValue, "INR")}
            </div>
            <p className="mt-0.5 text-xs text-purple-600/80 dark:text-purple-400/80">Per customer itinerary</p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Fulfillment Rate
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
              {metrics.completionRate}%
            </div>
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80">
              {metrics.completedCount} completed • {metrics.confirmedCount} upcoming
            </p>
          </div>
        </div>

        {/* ─── 3. Visual Charts & Revenue Trend ────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Monthly Revenue Trajectory Bar Chart (8 cols) */}
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card lg:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" /> Monthly Revenue Trajectory (Last 6 Months)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gross fulfilled booking revenue by travel month
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  Real Database Data
                </Badge>
              </div>

              {/* Responsive Bar Chart Canvas */}
              <div className="mt-6 grid grid-cols-6 gap-3 sm:gap-4 items-end h-56 pt-6 border-b border-border/40 pb-2">
                {monthlyRevenueData.map((item, idx) => {
                  const pct = Math.max(8, Math.round((item.revenue / maxMonthRev) * 100));

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full group">
                      <div className="text-[11px] font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity mb-1.5">
                        {formatPrice(item.revenue, "INR")}
                      </div>
                      <div className="w-full max-w-[48px] bg-muted/40 rounded-t-xl overflow-hidden h-full flex items-end">
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-primary/80 to-primary transition-all duration-500 group-hover:from-primary group-hover:to-accent"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="mt-2 text-[10px] sm:text-xs font-semibold text-muted-foreground text-center truncate w-full">
                        {item.monthLabel}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
                        {item.count} {item.count === 1 ? "trip" : "trips"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Insight Footer */}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Sparkles className="size-3.5" /> High season fulfillment active
              </span>
              <Link to="/provider/wallet" className="text-primary hover:underline font-medium">
                View detailed payout ledger →
              </Link>
            </div>
          </div>

          {/* Booking Status Distribution (4 cols) */}
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card lg:col-span-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
                <PieChart className="size-4 text-primary" /> Booking Status Ratio
              </h3>

              <div className="mt-5 space-y-3.5">
                {/* Completed */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <span className="size-2 rounded-full bg-blue-500" /> Completed Stays
                    </span>
                    <strong className="text-foreground">{metrics.completedCount}</strong>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{
                        width: `${metrics.totalCount > 0 ? (metrics.completedCount / metrics.totalCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Confirmed */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <span className="size-2 rounded-full bg-emerald-500" /> Confirmed Upcoming
                    </span>
                    <strong className="text-foreground">{metrics.confirmedCount}</strong>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${metrics.totalCount > 0 ? (metrics.confirmedCount / metrics.totalCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Pending */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <span className="size-2 rounded-full bg-amber-500" /> Pending Requests
                    </span>
                    <strong className="text-foreground">{metrics.pendingCount}</strong>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{
                        width: `${metrics.totalCount > 0 ? (metrics.pendingCount / metrics.totalCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Cancelled */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <span className="size-2 rounded-full bg-rose-500" /> Cancelled / Declined
                    </span>
                    <strong className="text-foreground">{metrics.cancelledCount}</strong>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-rose-500 transition-all duration-300"
                      style={{
                        width: `${metrics.totalCount > 0 ? (metrics.cancelledCount / metrics.totalCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              Total Guest Count: <strong className="text-foreground">{metrics.totalGuests} Guests</strong> hosted or scheduled.
            </div>
          </div>
        </div>

        {/* ─── 4. Top Performing Services & Reviews Analysis ──────────────────── */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Top Performing Services (7 cols) */}
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card lg:col-span-7">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Award className="size-4 text-amber-500" /> Top Performing Listings
              </h3>
              <Link to="/provider/services">
                <span className="text-xs text-primary hover:underline font-medium">View All Services →</span>
              </Link>
            </div>

            {servicePerformance.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No active service bookings in this time period.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {servicePerformance.map(({ service, revenue, bookings: bCount }, idx) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-3.5 text-xs transition-all hover:border-primary/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <strong className="text-foreground text-sm font-semibold line-clamp-1 block">
                          {service.title}
                        </strong>
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {service.category} • {service.destination}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <strong className="text-sm font-bold text-foreground block">
                        {formatPrice(revenue, "INR")}
                      </strong>
                      <span className="text-[11px] text-muted-foreground">
                        {bCount} {bCount === 1 ? "booking" : "bookings"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Sentiment & Rating Breakdown (5 cols) */}
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Star className="size-4 fill-amber-400 text-amber-500" /> Guest Review Breakdown
                </h3>
                <Link to="/provider/reviews">
                  <span className="text-xs text-primary hover:underline font-medium">Manage Reviews →</span>
                </Link>
              </div>

              {/* Average Rating Hero */}
              <div className="mt-4 flex items-center gap-4 rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20">
                <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {reviewStats.avg}
                </div>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "size-4",
                          s <= Math.round(Number(reviewStats.avg))
                            ? "fill-amber-400 text-amber-500"
                            : "text-muted/40"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5 block">
                    Based on {reviewStats.total} verified reviews
                  </span>
                </div>
              </div>

              {/* Star Meters */}
              <div className="mt-4 space-y-2 text-xs">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = reviewStats.counts[star] || 0;
                  const pct = reviewStats.total > 0 ? Math.round((count / reviewStats.total) * 100) : 0;

                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-8 font-semibold text-muted-foreground">{star}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-amber-400 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-medium text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground text-center">
              All ratings calculated dynamically from legitimate completed guest bookings.
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
