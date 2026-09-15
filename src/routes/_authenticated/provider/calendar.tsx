import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
  isToday,
} from "date-fns";
import {
  AlertCircle,
  Ban,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  Filter,
  Info,
  Layers,
  MapPin,
  MessageSquare,
  Sparkles,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import {
  formatPrice,
  myProviderQuery,
  providerBookingsQuery,
  providerServicesQuery,
  type BookingWithService,
  type Service,
} from "@/lib/travezy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/provider/calendar")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Availability & Bookings Calendar — Travezy Provider Hub" },
      {
        name: "description",
        content: "Interactive real-time schedule, capacity tracker, and booking calendar for Travezy providers.",
      },
      { property: "og:title", content: "Availability & Bookings Calendar — Travezy Provider Hub" },
      {
        property: "og:description",
        content: "Track guest arrivals, remaining service capacity, and blocked dates.",
      },
    ],
  }),
  component: ProviderCalendarPage,
});

function ProviderCalendarPage() {
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

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());

  // Chat & Details state
  const [chatPartner, setChatPartner] = useState<{
    id: string;
    name: string;
    bookingId?: string | null | undefined;
    serviceTitle?: string | null | undefined;
  } | null>(null);

  const [inspectBooking, setInspectBooking] = useState<BookingWithService | null>(null);

  // Month navigation
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Build calendar matrix
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [startDate, endDate]);

  // Index bookings by ISO date string (YYYY-MM-DD)
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingWithService[]>();
    for (const b of bookings) {
      if (!b.travel_date) continue;
      const dateKey = b.travel_date.slice(0, 10);
      const list = map.get(dateKey) || [];
      list.push(b);
      map.set(dateKey, list);
    }
    return map;
  }, [bookings]);

  // Selected date ISO string
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDateBookings = useMemo(() => {
    const allOnDate = bookingsByDate.get(selectedDateKey) || [];
    return allOnDate.filter((b) => {
      if (selectedServiceId !== "all" && b.service_id !== selectedServiceId) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      return true;
    });
  }, [bookingsByDate, selectedDateKey, selectedServiceId, statusFilter]);

  // Compute capacity statistics for a given service on a given date
  function getServiceCapacityForDate(service: Service, dateKey: string) {
    const maxCapacity = service.max_guests ?? 4;
    const allOnDate = bookingsByDate.get(dateKey) || [];

    // Only active (confirmed and pending) bookings consume capacity!
    // Cancelled and rejected bookings do NOT consume capacity.
    const activeBookings = allOnDate.filter((b) => {
      const isThisService =
        b.service_id === service.id ||
        (b.notes && typeof b.notes === "string" && b.notes.includes(`[Curated:${service.id}]`));
      if (!isThisService) return false;
      return b.status === "confirmed" || b.status === "pending";
    });

    const bookedGuests = activeBookings.reduce((sum, b) => sum + (Number(b.guests) || 1), 0);
    const remainingCapacity = Math.max(0, maxCapacity - bookedGuests);
    const isBlocked = blockedDates.has(`${service.id}:${dateKey}`);
    const isFullyBooked = remainingCapacity === 0;

    return {
      maxCapacity,
      bookedGuests,
      remainingCapacity,
      isBlocked,
      isFullyBooked,
      activeCount: activeBookings.length,
      status: isBlocked
        ? "blocked"
        : isFullyBooked
          ? "sold_out"
          : remainingCapacity <= 2
            ? "limited"
            : "available",
    };
  }

  // Toggle custom date block for provider
  function toggleBlockDate(serviceId: string, dateKey: string) {
    const key = `${serviceId}:${dateKey}`;
    setBlockedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        toast.success(`Date unblocked for bookings.`);
      } else {
        next.add(key);
        toast.warning(`Date marked as blocked/unavailable.`);
      }
      return next;
    });
  }

  // Monthly summary stats
  const monthStats = useMemo(() => {
    let confirmedCount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let monthRevenue = 0;

    const currentMonthStr = format(currentMonth, "yyyy-MM");

    for (const b of bookings) {
      if (!b.travel_date || !b.travel_date.startsWith(currentMonthStr)) continue;
      if (selectedServiceId !== "all" && b.service_id !== selectedServiceId) continue;

      if (b.status === "confirmed") {
        confirmedCount++;
        monthRevenue += Number(b.total_price) || 0;
      } else if (b.status === "pending") {
        pendingCount++;
      } else if (b.status === "completed") {
        completedCount++;
        monthRevenue += Number(b.total_price) || 0;
      }
    }

    return { confirmedCount, pendingCount, completedCount, monthRevenue };
  }, [bookings, currentMonth, selectedServiceId]);

  return (
    <PageShell
      eyebrow="Provider Console"
      title="Availability & Bookings Calendar"
      subtitle="Track daily guest arrivals, monitor remaining capacity per listing, and manage booking schedules."
    >
      <div className="space-y-6">
        {/* ─── 1. Monthly Telemetry KPI Pills ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Confirmed Trips
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
              {monthStats.confirmedCount}
            </div>
            <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/80">In {format(currentMonth, "MMMM yyyy")}</p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Pending Requests
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Clock className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
              {monthStats.pendingCount}
            </div>
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80">Awaiting your response</p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Completed
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <Sparkles className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-400">
              {monthStats.completedCount}
            </div>
            <p className="mt-0.5 text-xs text-blue-600/80 dark:text-blue-400/80">Completed stays & tours</p>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                Month Revenue
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <CalendarIcon className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-400">
              {formatPrice(monthStats.monthRevenue, "INR")}
            </div>
            <p className="mt-0.5 text-xs text-purple-600/80 dark:text-purple-400/80">Scheduled bookings</p>
          </div>
        </div>

        {/* ─── 2. Controls & Filter Bar ────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          {/* Month Navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-background/80 p-1 shadow-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevMonth}
                className="size-8 p-0 rounded-lg hover:bg-muted"
                aria-label="Previous Month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-3 text-sm font-bold tracking-tight text-foreground min-w-[140px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextMonth}
                className="size-8 p-0 rounded-lg hover:bg-muted"
                aria-label="Next Month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-9 rounded-xl text-xs font-semibold"
            >
              Today
            </Button>
          </div>

          {/* Service & Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium max-w-[220px]"
            >
              <option value="all">All Service Listings ({services.length})</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* ─── 3. Main Calendar & Day Inspector Grid ─────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Calendar Grid (8 cols) */}
          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-card lg:col-span-8">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div
                  key={dayName}
                  className="py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Day Cells Matrix */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                const dayBookings = bookingsByDate.get(dateKey) || [];
                const activeBookings = dayBookings.filter(
                  (b) => b.status === "confirmed" || b.status === "pending"
                );
                const confirmedCount = dayBookings.filter((b) => b.status === "confirmed").length;
                const pendingCount = dayBookings.filter((b) => b.status === "pending").length;
                const completedCount = dayBookings.filter((b) => b.status === "completed").length;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "group relative flex min-h-[72px] sm:min-h-[88px] flex-col justify-between rounded-2xl p-1.5 sm:p-2 text-left transition-all border",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                        : "border-border/50 bg-background/50 hover:border-primary/40 hover:bg-card",
                      !isCurrentMonth && "opacity-35 bg-muted/20"
                    )}
                  >
                    {/* Top Row: Date Number & Today Pill */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                          isTodayDate
                            ? "bg-primary text-primary-foreground font-bold"
                            : isSelected
                              ? "bg-primary/20 text-primary font-bold"
                              : "text-foreground group-hover:text-primary"
                        )}
                      >
                        {format(day, "d")}
                      </span>

                      {dayBookings.length > 0 && (
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {dayBookings.length} {dayBookings.length === 1 ? "trip" : "trips"}
                        </span>
                      )}
                    </div>

                    {/* Booking Status Indicators */}
                    <div className="mt-1 space-y-1">
                      {confirmedCount > 0 && (
                        <div className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          <span>{confirmedCount} Confirmed</span>
                        </div>
                      )}
                      {pendingCount > 0 && (
                        <div className="flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 truncate">
                          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>{pendingCount} Pending</span>
                        </div>
                      )}
                      {completedCount > 0 && confirmedCount === 0 && pendingCount === 0 && (
                        <div className="flex items-center gap-1 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400 truncate">
                          <span className="size-1.5 rounded-full bg-blue-500" />
                          <span>{completedCount} Completed</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  <span>Confirmed Arrival</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-amber-500" />
                  <span>Pending Request</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-blue-500" />
                  <span>Completed Trip</span>
                </div>
              </div>
              <span className="text-[11px]">Click any date to inspect capacity & guest bookings</span>
            </div>
          </div>

          {/* Day Inspection & Capacity Panel (4 cols) */}
          <div className="space-y-5 lg:col-span-4">
            {/* Selected Date Header Card */}
            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Selected Schedule
                  </span>
                  <h3 className="text-lg font-bold text-foreground">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </h3>
                </div>
                {isToday(selectedDate) && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold">
                    Today
                  </Badge>
                )}
              </div>

              {/* Real Database Capacity per Service */}
              <div className="mt-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Service Capacity Breakdown</span>
                  <span>{services.length} Listings</span>
                </h4>

                {services.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active services registered.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {services.map((service) => {
                      const cap = getServiceCapacityForDate(service, selectedDateKey);
                      const isTargeted = selectedServiceId === "all" || selectedServiceId === service.id;
                      if (!isTargeted) return null;

                      const pct = Math.min(100, Math.round((cap.bookedGuests / cap.maxCapacity) * 100));

                      return (
                        <div
                          key={service.id}
                          className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="font-semibold text-foreground line-clamp-1">
                                {service.title}
                              </strong>
                              <span className="text-[11px] text-muted-foreground capitalize">
                                {service.category} • Max {cap.maxCapacity} guests
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleBlockDate(service.id, selectedDateKey)}
                              className={cn(
                                "rounded-lg px-2 py-0.5 text-[10px] font-semibold transition-colors border",
                                cap.isBlocked
                                  ? "border-rose-500/40 bg-rose-500/10 text-rose-600"
                                  : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                              )}
                              title={cap.isBlocked ? "Unblock this date" : "Block date for new bookings"}
                            >
                              {cap.isBlocked ? "Blocked" : "Block"}
                            </button>
                          </div>

                          {/* Capacity Progress Bar */}
                          <div className="mt-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                Booked: <strong>{cap.bookedGuests}</strong> / {cap.maxCapacity}
                              </span>
                              <span
                                className={cn(
                                  "font-bold",
                                  cap.isFullyBooked
                                    ? "text-rose-600"
                                    : cap.remainingCapacity <= 2
                                      ? "text-amber-600"
                                      : "text-emerald-600"
                                )}
                              >
                                {cap.isFullyBooked
                                  ? "Sold Out"
                                  : `${cap.remainingCapacity} spots left`}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full transition-all duration-300",
                                  cap.isFullyBooked
                                    ? "bg-rose-500"
                                    : pct > 60
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bookings on Selected Date */}
            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Users className="size-4 text-primary" />
                  <span>Bookings on this Day</span>
                </h4>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {selectedDateBookings.length} {selectedDateBookings.length === 1 ? "Guest" : "Guests"}
                </Badge>
              </div>

              {selectedDateBookings.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <CalendarIcon className="mx-auto size-8 opacity-30 mb-2" />
                  No bookings scheduled for this date.
                </div>
              ) : (
                <div className="mt-3 space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {selectedDateBookings.map((b) => {
                    const touristName = b.profiles?.full_name || "Guest Tourist";
                    const serviceTitle = b.services?.title || "Booked Service";

                    return (
                      <div
                        key={b.id}
                        className="rounded-2xl border border-border/60 bg-muted/30 p-3.5 space-y-2 text-xs transition-all hover:border-primary/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                              {touristName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong className="text-foreground text-sm font-semibold block leading-tight">
                                {touristName}
                              </strong>
                              <span className="text-[11px] text-muted-foreground">
                                Party of {b.guests} • {formatPrice(b.total_price, "INR")}
                              </span>
                            </div>
                          </div>

                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                              b.status === "confirmed" && "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
                              b.status === "pending" && "bg-amber-500/10 text-amber-700 border-amber-500/30",
                              b.status === "completed" && "bg-blue-500/10 text-blue-700 border-blue-500/30",
                              b.status === "cancelled" && "bg-rose-500/10 text-rose-700 border-rose-500/30"
                            )}
                          >
                            {b.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground font-medium truncate">
                          {serviceTitle}
                        </p>

                        {b.notes && (
                          <p className="rounded-lg bg-background/80 p-2 text-[11px] italic text-muted-foreground border border-border/40">
                            "{b.notes}"
                          </p>
                        )}

                        <div className="flex items-center justify-between border-t border-border/40 pt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setInspectBooking(b)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="size-3 mr-1" /> Details
                          </Button>

                          {b.user_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setChatPartner({
                                  id: b.user_id,
                                  name: touristName,
                                  bookingId: b.id,
                                  serviceTitle: serviceTitle,
                                })
                              }
                              className="h-7 px-2.5 text-xs gap-1 rounded-lg"
                            >
                              <MessageSquare className="size-3 text-primary" /> Chat
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. Quick Booking Details Modal ──────────────────────────────────── */}
      {inspectBooking && (
        <Dialog open={Boolean(inspectBooking)} onOpenChange={(open) => !open && setInspectBooking(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Booking Details</DialogTitle>
              <DialogDescription>
                Booking Reference ID: <code className="font-mono text-xs">{inspectBooking.id}</code>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Guest Name</span>
                  <strong className="text-foreground text-sm font-semibold">
                    {inspectBooking.profiles?.full_name || "Guest Tourist"}
                  </strong>
                </div>
                {inspectBooking.profiles?.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="text-foreground">{inspectBooking.profiles.email}</span>
                  </div>
                )}
                {inspectBooking.profiles?.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="text-foreground">{inspectBooking.profiles.phone}</span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Service Listing</span>
                  <strong className="text-foreground font-semibold">
                    {inspectBooking.services?.title || "Reserved Service"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Travel / Check-in Date</span>
                  <span className="font-semibold text-foreground">
                    {inspectBooking.travel_date
                      ? format(parseISO(inspectBooking.travel_date), "EEEE, MMMM d, yyyy")
                      : "Date not specified"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Number of Guests</span>
                  <span className="font-semibold text-foreground">{inspectBooking.guests} Guests</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                  <span className="text-muted-foreground">Total Price</span>
                  <strong className="text-base text-primary font-bold">
                    {formatPrice(inspectBooking.total_price, "INR")}
                  </strong>
                </div>
              </div>

              {inspectBooking.notes && (
                <div className="rounded-2xl border border-border/70 bg-amber-500/5 p-3.5">
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block mb-1">
                    Special Requests from Guest:
                  </span>
                  <p className="text-xs text-foreground italic">"{inspectBooking.notes}"</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Link to="/provider/bookings">
                <Button variant="outline" size="sm" className="rounded-xl text-xs">
                  Manage in Bookings Hub
                </Button>
              </Link>
              <Button
                variant="ocean"
                size="sm"
                onClick={() => setInspectBooking(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── 5. Direct Chat with Customer ────────────────────────────────────── */}
      {chatPartner && (
        <ChatDialog
          partnerId={chatPartner.id}
          partnerName={chatPartner.name}
          partnerRoleLabel="Tourist / Customer"
          bookingId={chatPartner.bookingId}
          serviceTitle={chatPartner.serviceTitle}
          open={Boolean(chatPartner)}
          onOpenChange={(open) => !open && setChatPartner(null)}
        />
      )}
    </PageShell>
  );
}
