import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  HeartHandshake,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plane,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import {
  formatPrice,
  myProviderQuery,
  providerBookingsQuery,
  providerReviewsQuery,
  type BookingWithService,
  type ReviewWithService,
} from "@/lib/travezy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/provider/customers")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Customer Directory & Guest Management — Travezy Provider Hub" },
      {
        name: "description",
        content: "Manage guest relationships, view verified booking history, and communicate with your tourists on Travezy.",
      },
      { property: "og:title", content: "Customer Directory & Guest Management — Travezy Provider Hub" },
      {
        property: "og:description",
        content: "Customer relationships and trip timelines for your listings.",
      },
    ],
  }),
  component: ProviderCustomersPage,
});

export interface ProviderCustomer {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  totalBookings: number;
  completedBookings: number;
  upcomingBookings: number;
  cancelledBookings: number;
  totalSpend: number;
  lastBookingDate: string | null;
  lastBookingService: string | null;
  bookings: BookingWithService[];
  reviews: ReviewWithService[];
}

function ProviderCustomersPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: provider } = useQuery({ ...myProviderQuery(userId), enabled: !!userId });
  const providerId = provider?.id ?? "";

  // 1. Bookings for this provider (strictly isolated)
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    ...providerBookingsQuery(providerId),
    enabled: !!providerId,
  });

  // 2. Reviews for this provider
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    ...providerReviewsQuery(providerId),
    enabled: !!providerId,
  });

  // UI Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "repeat" | "upcoming" | "past">("all");

  // Selected Customer for Details Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<ProviderCustomer | null>(null);

  // Chat Dialog state
  const [chatPartner, setChatPartner] = useState<{
    id: string;
    name: string;
    bookingId?: string | null | undefined;
    serviceTitle?: string | null | undefined;
  } | null>(null);

  // Group bookings strictly by customer user_id (Zero unauthorized profiles)
  const customers = useMemo(() => {
    const map = new Map<string, ProviderCustomer>();
    const today = new Date().toISOString().slice(0, 10);

    for (const b of bookings) {
      const cId = b.user_id;
      if (!cId) continue;

      let c = map.get(cId);
      if (!c) {
        c = {
          id: cId,
          fullName: b.profiles?.full_name || "Guest Tourist",
          email: b.profiles?.email || null,
          phone: b.profiles?.phone || null,
          avatarUrl: b.profiles?.avatar_url || null,
          totalBookings: 0,
          completedBookings: 0,
          upcomingBookings: 0,
          cancelledBookings: 0,
          totalSpend: 0,
          lastBookingDate: null,
          lastBookingService: null,
          bookings: [],
          reviews: [],
        };
        map.set(cId, c);
      }

      c.totalBookings++;
      c.bookings.push(b);

      const price = Number(b.total_price) || 0;
      if (b.status !== "cancelled" && b.status !== "rejected") {
        c.totalSpend += price;
      }

      if (b.status === "completed") {
        c.completedBookings++;
      } else if (b.status === "confirmed" || b.status === "pending") {
        if (b.travel_date && b.travel_date >= today) {
          c.upcomingBookings++;
        }
      } else if (b.status === "cancelled" || b.status === "rejected") {
        c.cancelledBookings++;
      }

      // Update latest booking date
      if (b.travel_date) {
        if (!c.lastBookingDate || b.travel_date > c.lastBookingDate) {
          c.lastBookingDate = b.travel_date;
          c.lastBookingService = b.services?.title || "Curated Service";
        }
      }
    }

    // Attach reviews from this customer for this provider
    for (const r of reviews) {
      if (!r.user_id) continue;
      const c = map.get(r.user_id);
      if (c) {
        c.reviews.push(r);
      }
    }

    // Convert map to array sorted by total spend (highest value guests first)
    return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [bookings, reviews]);

  // Telemetry KPIs
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter((c) => c.totalBookings >= 2).length;
    const totalSpend = customers.reduce((sum, c) => sum + c.totalSpend, 0);
    const avgSpend = totalCustomers > 0 ? Math.round(totalSpend / totalCustomers) : 0;

    return { totalCustomers, repeatCustomers, totalSpend, avgSpend };
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterTab === "repeat" && c.totalBookings < 2) return false;
      if (filterTab === "upcoming" && c.upcomingBookings === 0) return false;
      if (filterTab === "past" && c.completedBookings === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.fullName.toLowerCase().includes(q);
        const matchesEmail = (c.email || "").toLowerCase().includes(q);
        const matchesPhone = (c.phone || "").toLowerCase().includes(q);
        const matchesService = (c.lastBookingService || "").toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesService) return false;
      }

      return true;
    });
  }, [customers, filterTab, searchQuery]);

  return (
    <PageShell
      eyebrow="Provider Console"
      title="Customer & Guest Directory"
      subtitle="View your verified tourists, track lifetime booking histories, and message guests."
    >
      <div className="space-y-6">
        {/* ─── 1. Telemetry KPI Metric Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Customers
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{stats.totalCustomers}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Unique guests booked</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Repeat Guests
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <HeartHandshake className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
              {stats.repeatCustomers}
            </div>
            <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/80">≥ 2 bookings with you</p>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                Total Customer Spend
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Receipt className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-400">
              {formatPrice(stats.totalSpend, "INR")}
            </div>
            <p className="mt-0.5 text-xs text-purple-600/80 dark:text-purple-400/80">Gross lifetime booking value</p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Avg Spend / Guest
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Sparkles className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
              {formatPrice(stats.avgSpend, "INR")}
            </div>
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80">Average spend per guest</p>
          </div>
        </div>

        {/* ─── 2. Search & Filter Hub ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, email, phone, service..."
              className="h-10 rounded-xl pl-9 bg-background/80"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center rounded-xl border border-border/70 bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                filterTab === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("repeat")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                filterTab === "repeat"
                  ? "bg-emerald-500 text-white font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Repeat ({stats.repeatCustomers})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("upcoming")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                filterTab === "upcoming"
                  ? "bg-blue-500 text-white font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("past")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                filterTab === "past"
                  ? "bg-purple-500 text-white font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Past Guests
            </button>
          </div>
        </div>

        {/* ─── 3. Customer List / Grid ─────────────────────────────────────────── */}
        {bookingsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-3xl border border-border/60 bg-muted/40" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <Users className="size-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {customers.length === 0 ? "No customer bookings yet" : "No matching customers found"}
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {customers.length === 0
                ? "As tourists make bookings for your services, their customer profile and trip history will automatically appear here."
                : "Try clearing your search query or switching filters."}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setFilterTab("all");
                }}
                className="mt-4 rounded-xl"
              >
                Reset Search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => {
              const isRepeat = customer.totalBookings >= 2;

              return (
                <div
                  key={customer.id}
                  className="group flex flex-col justify-between rounded-3xl border border-border/70 bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="space-y-4">
                    {/* Customer Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {customer.avatarUrl ? (
                          <img
                            src={customer.avatarUrl}
                            alt={customer.fullName}
                            className="size-12 rounded-2xl object-cover ring-2 ring-border"
                          />
                        ) : (
                          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary text-base">
                            {customer.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
                              {customer.fullName}
                            </h4>
                            {isRepeat && (
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] px-1.5 py-0.5">
                                Loyal Guest
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {customer.totalBookings} {customer.totalBookings === 1 ? "Booking" : "Bookings"} with you
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info Pills */}
                    <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border/50 pt-3">
                      {customer.email && (
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate text-foreground/80">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="text-foreground/80">{customer.phone}</span>
                        </div>
                      )}
                      {customer.lastBookingService && (
                        <div className="flex items-center gap-2 truncate text-[11px]">
                          <Plane className="size-3.5 text-primary shrink-0" />
                          <span className="truncate text-muted-foreground">
                            Last: <strong className="text-foreground">{customer.lastBookingService}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Booking Breakdown Pill Row */}
                    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-muted/25 p-2.5 text-center text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Completed</span>
                        <strong className="text-sm font-bold text-blue-600 dark:text-blue-400">{customer.completedBookings}</strong>
                      </div>
                      <div className="border-x border-border/50">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Upcoming</span>
                        <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{customer.upcomingBookings}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Lifetime</span>
                        <strong className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatPrice(customer.totalSpend, "INR")}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCustomer(customer)}
                      className="rounded-xl text-xs font-semibold h-8 flex-1"
                    >
                      View History & Reviews
                    </Button>

                    <Button
                      size="sm"
                      variant="ocean"
                      onClick={() =>
                        setChatPartner({
                          id: customer.id,
                          name: customer.fullName,
                          bookingId: customer.bookings[0]?.id || null,
                          serviceTitle: customer.lastBookingService || null,
                        })
                      }
                      className="rounded-xl text-xs font-semibold h-8 gap-1.5 px-3"
                    >
                      <MessageSquare className="size-3.5" /> Message
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 4. Customer Detail Modal ───────────────────────────────────────── */}
      {selectedCustomer && (
        <Dialog open={Boolean(selectedCustomer)} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span>Guest Profile & History</span>
                {selectedCustomer.totalBookings >= 2 && (
                  <Badge className="bg-emerald-500 font-semibold text-white text-xs">
                    Loyal / Repeat Guest
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Complete verified booking records and feedback for this guest on your listings.
              </DialogDescription>
            </DialogHeader>

            {/* Customer Hero Profile */}
            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/30 p-4 mt-2">
              <div className="flex items-center gap-3">
                {selectedCustomer.avatarUrl ? (
                  <img
                    src={selectedCustomer.avatarUrl}
                    alt={selectedCustomer.fullName}
                    className="size-14 rounded-2xl object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary text-xl">
                    {selectedCustomer.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedCustomer.fullName}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {selectedCustomer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" /> {selectedCustomer.email}
                      </span>
                    )}
                    {selectedCustomer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" /> {selectedCustomer.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Total Revenue</span>
                <div className="text-lg font-bold text-primary">
                  {formatPrice(selectedCustomer.totalSpend, "INR")}
                </div>
              </div>
            </div>

            {/* Tabs for Booking History vs Reviews */}
            <Tabs defaultValue="bookings" className="mt-4">
              <TabsList className="grid grid-cols-2 rounded-xl bg-muted/60 p-1">
                <TabsTrigger value="bookings" className="rounded-lg text-xs font-semibold">
                  Booking History ({selectedCustomer.bookings.length})
                </TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-lg text-xs font-semibold">
                  Reviews & Ratings ({selectedCustomer.reviews.length})
                </TabsTrigger>
              </TabsList>

              {/* BOOKINGS HISTORY */}
              <TabsContent value="bookings" className="mt-3 space-y-3">
                {selectedCustomer.bookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-sm font-semibold text-foreground block">
                          {b.services?.title || "Curated Service"}
                        </strong>
                        <span className="text-[11px] text-muted-foreground">
                          {b.travel_date
                            ? format(parseISO(b.travel_date), "EEEE, MMMM d, yyyy")
                            : "Date unspecified"}
                          {" • "}
                          {b.guests} {b.guests === 1 ? "Guest" : "Guests"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border inline-block mb-1",
                            b.status === "confirmed" && "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
                            b.status === "pending" && "bg-amber-500/10 text-amber-700 border-amber-500/30",
                            b.status === "completed" && "bg-blue-500/10 text-blue-700 border-blue-500/30",
                            b.status === "cancelled" && "bg-rose-500/10 text-rose-700 border-rose-500/30"
                          )}
                        >
                          {b.status}
                        </span>
                        <div className="font-bold text-foreground text-sm">
                          {formatPrice(b.total_price, "INR")}
                        </div>
                      </div>
                    </div>

                    {b.notes && (
                      <div className="rounded-xl bg-background/80 p-2.5 text-[11px] italic text-muted-foreground border border-border/40">
                        "{b.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>

              {/* REVIEWS & FEEDBACK */}
              <TabsContent value="reviews" className="mt-3 space-y-3">
                {selectedCustomer.reviews.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No reviews written by this guest yet.
                  </div>
                ) : (
                  selectedCustomer.reviews.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "size-3.5",
                                star <= r.rating
                                  ? "fill-amber-400 text-amber-500"
                                  : "text-muted/40"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {format(parseISO(r.created_at), "MMM d, yyyy")}
                        </span>
                      </div>

                      <p className="text-foreground text-sm leading-relaxed">
                        "{r.comment || "Great experience!"}"
                      </p>

                      {r.provider_response && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mt-2 text-[11px]">
                          <span className="font-semibold text-primary block mb-0.5">Your Response:</span>
                          <p className="text-muted-foreground italic">"{r.provider_response}"</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-xl"
              >
                Close
              </Button>

              <Button
                variant="ocean"
                size="sm"
                onClick={() => {
                  const target = selectedCustomer;
                  setSelectedCustomer(null);
                  setChatPartner({
                    id: target.id,
                    name: target.fullName,
                    bookingId: target.bookings[0]?.id || null,
                    serviceTitle: target.lastBookingService || null,
                  });
                }}
                className="rounded-xl gap-1.5 font-semibold"
              >
                <MessageSquare className="size-3.5" /> Message Customer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── 5. Live Customer Chat Dialog ────────────────────────────────────── */}
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
