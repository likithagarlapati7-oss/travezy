import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Eye,
  FileText,
  HelpCircle,
  History,
  Info,
  LayoutList,
  Loader2,
  MapPin,
  MessageSquare,
  MessageSquareQuote,
  Pencil,
  Plus,
  RefreshCw,
  Reply,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { updateBookingStatus } from "@/lib/bookings.functions";
import { replyToReview } from "@/lib/reviews.functions";
import { getProviderWallet } from "@/lib/wallet.functions";
import { getUserNotifications } from "@/lib/notifications.functions";
import { getConversations } from "@/lib/chat.functions";
import { requireRole } from "@/lib/roles";
import {
  formatPrice,
  myProviderQuery,
  profileQuery,
  providerBookingsQuery,
  providerPaymentsQuery,
  providerReviewsQuery,
  providerServicesQuery,
  type BookingWithService,
  type ReviewWithService,
} from "@/lib/travezy";
import { ChatDialog } from "@/components/chat/ChatDialog";

export const Route = createFileRoute("/_authenticated/provider/dashboard")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Provider Command Centre — Travezy" },
      {
        name: "description",
        content: "Manage your listings, guest reservations, verified revenue, unread messages, and reviews in real time.",
      },
      { property: "og:title", content: "Provider Dashboard — Travezy" },
      {
        property: "og:description",
        content: "Real-time provider command centre for Travezy hospitality and tour partners.",
      },
    ],
  }),
  component: ProviderDashboard,
});

function ProviderDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const { data: profile } = useQuery({ ...profileQuery(userId), enabled: !!userId });

  const {
    data: provider,
    isLoading: providerLoading,
    error: providerError,
    refetch: refetchProvider,
  } = useQuery({ ...myProviderQuery(userId), enabled: !!userId });

  const providerId = provider?.id ?? "";

  // 1. Services
  const {
    data: services = [],
    isLoading: servicesLoading,
  } = useQuery({
    ...providerServicesQuery(providerId),
    enabled: !!providerId,
  });

  // 2. Bookings
  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery({
    ...providerBookingsQuery(providerId),
    enabled: !!providerId,
  });

  // 3. Reviews
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
  } = useQuery({
    ...providerReviewsQuery(providerId),
    enabled: !!providerId,
  });

  // 4. Payments
  const {
    data: payments = [],
    isLoading: paymentsLoading,
  } = useQuery({
    ...providerPaymentsQuery(providerId),
    enabled: !!providerId,
  });

  // 5. Wallet
  const getWalletFn = useServerFn(getProviderWallet);
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ["provider-wallet", userId],
    queryFn: async () => await getWalletFn(),
    enabled: !!userId && !!providerId,
  });

  // 6. Notifications (Unread Count)
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => await getUserNotifications(),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  // 7. Conversations (Unread Messages Count)
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", userId],
    queryFn: async () => await getConversations(),
    enabled: !!userId,
    refetchInterval: 20000,
  });

  // Modal / Dialog states
  const [actionConfirm, setActionConfirm] = useState<{
    id: string;
    status: "confirmed" | "cancelled" | "completed" | "rejected";
    title?: string | undefined;
    touristName?: string | undefined;
  } | null>(null);

  const [activeReplyReview, setActiveReplyReview] = useState<ReviewWithService | null>(null);
  const [replyText, setReplyText] = useState("");
  const [chatPartner, setChatPartner] = useState<{
    id: string;
    name: string;
    bookingId?: string | null | undefined;
    serviceTitle?: string | null | undefined;
  } | null>(null);

  const updateStatusFn = useServerFn(updateBookingStatus);
  const replyFn = useServerFn(replyToReview);

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "confirmed" | "cancelled" | "completed" | "rejected";
    }) => {
      return await updateStatusFn({ data: { id, status } });
    },
    onSuccess: (res) => {
      toast.success(`Booking status updated to ${res.status.toUpperCase()} successfully.`);
      qc.invalidateQueries({ queryKey: ["provider-bookings", providerId] });
      qc.invalidateQueries({ queryKey: ["provider-wallet", userId] });
      setActionConfirm(null);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to update booking status.");
    },
  });

  // Host reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      return await replyFn({
        data: {
          review_id: reviewId,
          response,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-reviews", providerId] });
      toast.success("Host response published successfully!");
      setActiveReplyReview(null);
      setReplyText("");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to publish response.");
    },
  });

  const createProvider = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("providers").insert({
        user_id: userId,
        business_name: profile?.full_name ? `${profile.full_name} Hospitality` : "My Travel Business",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider profile created successfully!");
      qc.invalidateQueries({ queryKey: ["provider", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Real Database Statistics Calculations ─────────────────────────────────
  const totalServices = services.length;
  const activeServices = services.filter((s) => s.is_active).length;

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => (b.status || "").toLowerCase() === "pending");
  const confirmedBookings = bookings.filter((b) => (b.status || "").toLowerCase() === "confirmed");
  const completedBookings = bookings.filter((b) => (b.status || "").toLowerCase() === "completed");
  const cancelledBookings = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "cancelled" || s === "rejected";
  });

  // Upcoming Bookings: Confirmed or Pending bookings where travel_date >= today
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingBookings = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    const isActiveState = s === "confirmed" || s === "pending";
    if (!isActiveState) return false;
    if (!b.travel_date) return true;
    const bDate = typeof b.travel_date === "string" ? b.travel_date.slice(0, 10) : "";
    return bDate >= todayStr;
  });

  // Verified Revenue Calculation
  const successfulDirectPayments = payments.filter((p) => (p.status || "").toUpperCase() === "SUCCESS");
  const bookingSuccessPayments = bookings.flatMap((b) =>
    (b.payments ?? []).filter((p) => (p.status || "").toUpperCase() === "SUCCESS")
  );

  const paymentMap = new Map<string, number>();
  for (const p of successfulDirectPayments) {
    paymentMap.set(p.id, Number(p.amount || 0));
  }
  for (const p of bookingSuccessPayments) {
    if (!paymentMap.has(p.id)) {
      paymentMap.set(p.id, Number(p.amount || 0));
    }
  }

  const verifiedRevenue = Array.from(paymentMap.values()).reduce((sum, amt) => sum + amt, 0);

  // Pending Earnings: value of pending/unconfirmed bookings
  const pendingEarnings = pendingBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  // Reviews & Rating
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews).toFixed(1)
    : "—";

  const repliedReviews = reviews.filter((r) => !!r.provider_response);
  const responseRate = totalReviews > 0 ? Math.round((repliedReviews.length / totalReviews) * 100) : 100;

  // Unread Messages & Notifications Count
  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  // Payment Status Badge Helper
  const getPaymentBadge = (booking: BookingWithService) => {
    const isPaid = (booking.payments ?? []).some(
      (p) => (p.status || "").toUpperCase() === "SUCCESS"
    );
    if (isPaid) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
          <CreditCard className="size-2.5 mr-1" /> PAID
        </Badge>
      );
    }
    const bStatus = (booking.status || "").toLowerCase();
    if (bStatus === "cancelled" || bStatus === "rejected") {
      return (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          VOID
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
        <Clock className="size-2.5 mr-1" /> PAYMENT DUE
      </Badge>
    );
  };

  // Booking Status Badge Helper
  const getBookingStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") {
      return (
        <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[11px] font-semibold">
          <Clock className="size-3 mr-1" /> Pending Request
        </Badge>
      );
    }
    if (s === "confirmed") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-semibold">
          <CheckCircle2 className="size-3 mr-1" /> Confirmed
        </Badge>
      );
    }
    if (s === "rejected" || s === "cancelled") {
      return (
        <Badge variant="destructive" className="text-[11px] font-semibold">
          <XCircle className="size-3 mr-1" /> {s === "rejected" ? "Declined" : "Cancelled"}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-muted text-foreground text-[11px] font-semibold">
        <Check className="size-3 mr-1" /> Completed
      </Badge>
    );
  };

  if (providerError) {
    return (
      <PageShell eyebrow="Provider Command Centre" title="Connection Error">
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
          <ShieldAlert className="mx-auto size-10 text-destructive" />
          <p className="text-destructive font-semibold">
            We couldn't load your provider profile. Please refresh and try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetchProvider()} className="rounded-full">
            <RefreshCw className="size-4 mr-1.5" /> Retry
          </Button>
        </div>
      </PageShell>
    );
  }

  if (providerLoading) {
    return (
      <PageShell eyebrow="Provider Command Centre" title="Loading Provider Command Centre…">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted/60 animate-pulse rounded-3xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!provider) {
    return (
      <PageShell
        eyebrow="Provider Onboarding"
        title="Become a Travezy Provider Partner"
        subtitle="Set up your verified business profile to start listing hotels, tours, and culinary experiences."
      >
        <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-card max-w-2xl mx-auto space-y-4">
          <div className="grid size-16 place-items-center rounded-3xl bg-primary/10 text-primary mx-auto">
            <BadgeCheck className="size-8" />
          </div>
          <h3 className="font-display text-2xl font-bold">Start Hosting on Travezy</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create your provider account in one click to manage listings, accept bookings, track earnings, and respond to guest reviews with verified partner status.
          </p>
          <Button
            variant="hero"
            size="lg"
            className="mt-4 rounded-full"
            disabled={createProvider.isPending}
            onClick={() => createProvider.mutate()}
          >
            {createProvider.isPending ? "Setting up your profile…" : "Create Provider Profile"}
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Provider Command Centre"
      title={provider.business_name}
      subtitle="Live database telemetry, guest reservations, verified revenue, and real-time operational hub."
    >
      {/* ─── 1. Primary Operational KPI Cards ────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Available Balance"
          value={walletLoading ? "…" : formatPrice(walletData?.available_balance || 0)}
          subtitle="Ready for withdrawal"
          to="/provider/wallet"
          accent="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
        />

        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={walletLoading ? "…" : formatPrice(walletData?.total_earned ?? verifiedRevenue)}
          subtitle={`${pendingEarnings > 0 ? `+${formatPrice(pendingEarnings)} pending` : "All settled"}`}
          to="/provider/wallet"
          accent="text-blue-600 dark:text-blue-400 bg-blue-500/10"
        />

        <StatCard
          icon={CalendarRange}
          label="Total Bookings"
          value={bookingsLoading ? "…" : String(totalBookings)}
          subtitle={`${pendingBookings.length} pending · ${confirmedBookings.length} confirmed`}
          to="/provider/bookings"
          accent="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
        />

        <StatCard
          icon={Star}
          label="Average Rating"
          value={reviewsLoading ? "…" : avgRating !== "—" ? `${avgRating} ★` : "—"}
          subtitle={`${totalReviews} reviews · ${responseRate}% replied`}
          to="/provider/reviews"
          accent="text-gold bg-amber-500/10"
        />
      </div>

      {/* ─── 1.1 Secondary Detailed KPI Telemetry Row ────────────────────────── */}
      <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <MiniKpiCard
          label="Active Services"
          value={`${activeServices} / ${totalServices}`}
          to="/provider/services"
          icon={Building2}
          color="text-primary"
        />
        <MiniKpiCard
          label="Pending Requests"
          value={String(pendingBookings.length)}
          to="/provider/bookings"
          icon={Clock}
          color={pendingBookings.length > 0 ? "text-amber-500 font-bold" : "text-muted-foreground"}
        />
        <MiniKpiCard
          label="Upcoming Trips"
          value={String(upcomingBookings.length)}
          to="/provider/bookings"
          icon={CalendarDays}
          color="text-emerald-600"
        />
        <MiniKpiCard
          label="Completed"
          value={String(completedBookings.length)}
          to="/provider/bookings"
          icon={CheckCircle2}
          color="text-blue-600"
        />
        <MiniKpiCard
          label="Unread Messages"
          value={String(unreadMessagesCount)}
          to="/provider/messages"
          icon={MessageSquare}
          color={unreadMessagesCount > 0 ? "text-primary font-bold" : "text-muted-foreground"}
        />
        <MiniKpiCard
          label="Notifications"
          value={String(unreadNotifsCount)}
          to="/provider/bookings"
          icon={Bell}
          color={unreadNotifsCount > 0 ? "text-amber-600 font-bold" : "text-muted-foreground"}
        />
      </div>

      {/* ─── 2. Provider Quick Actions Hub ───────────────────────────────────── */}
      <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Provider Quick Actions
          </h2>
          <span className="text-xs text-muted-foreground">Manage your operations in one click</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <QuickActionBtn
            to="/provider/services"
            icon={Plus}
            label="Add Service"
            desc="List stays or tours"
            variant="hero"
          />
          <QuickActionBtn
            to="/provider/services"
            icon={LayoutList}
            label="Manage Services"
            desc={`${totalServices} listings`}
          />
          <QuickActionBtn
            to="/provider/bookings"
            icon={CalendarRange}
            label="Bookings Hub"
            desc={`${pendingBookings.length} pending`}
          />
          <QuickActionBtn
            to="/provider/calendar"
            icon={Calendar}
            label="Calendar & Capacity"
            desc="Schedules & dates"
          />
          <QuickActionBtn
            to="/provider/customers"
            icon={Users}
            label="Guest Directory"
            desc="Customer records"
          />
          <QuickActionBtn
            to="/provider/wallet"
            icon={Wallet}
            label="Wallet & Payouts"
            desc="Earnings history"
          />
          <QuickActionBtn
            to="/provider/messages"
            icon={MessageSquare}
            label="Host Messages"
            desc={`${unreadMessagesCount} unread`}
          />
        </div>
      </section>

      {/* ─── 3. Two-Column Operational Core ──────────────────────────────────── */}
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* ─── 3A: Pending Booking Requests (Require Immediate Action) ───────── */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <Clock className="size-5 text-amber-500" /> Pending Booking Requests
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Guest requests awaiting your confirmation or rejection
                </p>
              </div>

              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-bold">
                {pendingBookings.length} Pending
              </Badge>
            </div>

            {bookingsLoading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-24 bg-muted/60 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : pendingBookings.length > 0 ? (
              <div className="mt-4 space-y-3">
                {pendingBookings.slice(0, 4).map((b) => {
                  const touristName = b.profiles?.full_name || "Guest Tourist";
                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-border/80 bg-background/60 p-4 transition-all hover:border-primary/40 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {touristName}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              #{b.id.slice(0, 8)}
                            </span>
                          </div>
                          <p className="text-xs text-primary font-medium mt-0.5">
                            {b.services?.title || "Booked Experience"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-display font-bold text-foreground text-sm">
                            {formatPrice(Number(b.total_price), (b.services as any)?.currency || "INR")}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {b.guests} {b.guests === 1 ? "Guest" : "Guests"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5 text-accent" />
                          Travel Date: {b.travel_date ? new Date(b.travel_date).toLocaleDateString() : "Flexible"}
                        </span>
                        {getPaymentBadge(b)}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setActionConfirm({
                              id: b.id,
                              status: "rejected",
                              title: b.services?.title,
                              touristName,
                            })
                          }
                          className="rounded-full text-xs h-8 text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          <X className="size-3.5 mr-1" /> Decline
                        </Button>

                        <Button
                          size="sm"
                          variant="hero"
                          onClick={() =>
                            setActionConfirm({
                              id: b.id,
                              status: "confirmed",
                              title: b.services?.title,
                              touristName,
                            })
                          }
                          className="rounded-full text-xs h-8"
                        >
                          <Check className="size-3.5 mr-1" /> Accept Booking
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="mx-auto size-10 text-emerald-500/60" />
                <p className="text-sm font-semibold text-foreground">All caught up!</p>
                <p className="text-xs max-w-xs mx-auto">
                  There are no pending booking requests. New guest reservations will appear here.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-border">
            <Button asChild variant="ghost" size="sm" className="w-full text-xs gap-1.5 text-primary">
              <Link to="/provider/bookings">
                Go to Full Booking Management <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* ─── 3B: Upcoming Confirmed Guests & Arrivals ──────────────────────── */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <CalendarCheck className="size-5 text-emerald-500" /> Upcoming Guest Arrivals
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirmed guests scheduled to arrive next
                </p>
              </div>

              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
                {upcomingBookings.length} Upcoming
              </Badge>
            </div>

            {bookingsLoading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-24 bg-muted/60 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="mt-4 space-y-3">
                {upcomingBookings.slice(0, 4).map((b) => {
                  const touristName = b.profiles?.full_name || "Guest Tourist";
                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-border/80 bg-background/60 p-4 transition-all hover:border-emerald-500/40 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{touristName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {b.services?.title || "Marketplace Listing"}
                          </p>
                        </div>

                        <div className="text-right">
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px]">
                            {b.travel_date ? new Date(b.travel_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Scheduled"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <span>{b.guests} Guests · {formatPrice(Number(b.total_price))}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setChatPartner({
                                id: b.user_id,
                                name: touristName,
                                bookingId: b.id,
                                serviceTitle: b.services?.title,
                              })
                            }
                            className="h-7 text-xs px-2 text-primary hover:text-primary-foreground hover:bg-primary gap-1"
                          >
                            <MessageSquare className="size-3" /> Chat
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setActionConfirm({
                                id: b.id,
                                status: "completed",
                                title: b.services?.title,
                                touristName,
                              })
                            }
                            className="h-7 text-xs px-2.5 rounded-full"
                          >
                            Mark Completed
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <CalendarDays className="mx-auto size-10 text-muted-foreground/60" />
                <p className="text-sm font-semibold text-foreground">No upcoming arrivals</p>
                <p className="text-xs max-w-xs mx-auto">
                  Confirmed future reservations will appear here with instant guest messaging.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-border">
            <Button asChild variant="ghost" size="sm" className="w-full text-xs gap-1.5 text-primary">
              <Link to="/provider/bookings">
                View All Reservations & Calendar <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </section>
      </div>

      {/* ─── 4. Customer Feedback & Review Responses ─────────────────────────── */}
      <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Star className="size-5 text-gold fill-current" /> Recent Customer Reviews & Feedback
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Guest ratings and direct host reply options ({avgRating} ★ average across {totalReviews} reviews)
            </p>
          </div>

          <Button asChild variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
            <Link to="/provider/reviews">
              View All Reviews <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {reviewsLoading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="h-32 bg-muted/60 animate-pulse rounded-2xl" />
            <div className="h-32 bg-muted/60 animate-pulse rounded-2xl" />
          </div>
        ) : reviews.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {reviews.slice(0, 4).map((rev) => {
              const reviewerName = rev.profiles?.full_name || "Verified Traveler";
              return (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-2.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{reviewerName}</p>
                        <p className="text-xs text-primary font-medium line-clamp-1">
                          {rev.services?.title || "Travezy Experience"}
                        </p>
                      </div>

                      <span className="flex items-center gap-1 rounded-full bg-gradient-gold px-2 py-0.5 text-xs font-bold text-gold-foreground">
                        <Star className="size-3 fill-current" />
                        {Number(rev.rating).toFixed(1)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      "{rev.comment}"
                    </p>
                  </div>

                  {rev.provider_response ? (
                    <div className="rounded-xl bg-muted/40 p-2.5 text-xs border border-border/50 text-foreground/85">
                      <span className="font-semibold text-primary block text-[11px]">Your Host Response:</span>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2">
                        {rev.provider_response}
                      </p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-border/50 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveReplyReview(rev);
                          setReplyText("");
                        }}
                        className="rounded-full text-xs h-7 gap-1"
                      >
                        <Reply className="size-3" /> Reply to Guest
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground text-xs">
            No customer reviews yet. Reviews will show up here once guests complete their journeys.
          </div>
        )}
      </section>

      {/* ─── 5. Dialog: Action Confirmation (Accept / Reject / Complete / Cancel) */}
      {actionConfirm && (
        <Dialog open={Boolean(actionConfirm)} onOpenChange={(open) => !open && setActionConfirm(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="font-display text-lg flex items-center gap-2">
                {actionConfirm.status === "confirmed" && <CheckCircle2 className="size-5 text-emerald-500" />}
                {actionConfirm.status === "rejected" && <XCircle className="size-5 text-destructive" />}
                {actionConfirm.status === "completed" && <Check className="size-5 text-primary" />}
                {actionConfirm.status === "cancelled" && <AlertCircle className="size-5 text-destructive" />}
                Confirm Booking Action
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed pt-1">
                Are you sure you want to mark this booking for{" "}
                <span className="font-semibold text-foreground">
                  {actionConfirm.touristName || "the guest"}
                </span>{" "}
                as{" "}
                <span className="font-bold uppercase text-foreground">
                  {actionConfirm.status === "rejected" ? "DECLINED" : actionConfirm.status}
                </span>
                ?
              </DialogDescription>
            </DialogHeader>

            <div className="my-2 rounded-2xl bg-muted/40 p-3 text-xs border border-border/60">
              <p className="text-muted-foreground">
                An automatic real-time notification will be sent to the tourist and your dashboard calendar will update instantly.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionConfirm(null)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                variant={actionConfirm.status === "rejected" || actionConfirm.status === "cancelled" ? "destructive" : "hero"}
                size="sm"
                disabled={updateStatusMutation.isPending}
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: actionConfirm.id,
                    status: actionConfirm.status,
                  })
                }
                className="rounded-full text-xs gap-1.5"
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Confirm Update"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── 6. Dialog: Host Review Reply ─────────────────────────────────────── */}
      {activeReplyReview && (
        <Dialog open={Boolean(activeReplyReview)} onOpenChange={(open) => !open && setActiveReplyReview(null)}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="font-display text-lg flex items-center gap-2">
                <Reply className="size-5 text-primary" /> Reply to Guest Review
              </DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Respond publicly as the verified host for "{activeReplyReview.services?.title}".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-2">
              <div className="rounded-2xl bg-muted/40 p-3 text-xs border border-border/60">
                <p className="font-semibold text-foreground">
                  {activeReplyReview.profiles?.full_name || "Guest"}:
                </p>
                <p className="text-muted-foreground italic mt-0.5">
                  "{activeReplyReview.comment}"
                </p>
              </div>

              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a courteous host reply thanking the guest..."
                className="text-xs min-h-[100px] rounded-2xl"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveReplyReview(null)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="hero"
                size="sm"
                disabled={!replyText.trim() || replyMutation.isPending}
                onClick={() =>
                  replyMutation.mutate({
                    reviewId: activeReplyReview.id,
                    response: replyText.trim(),
                  })
                }
                className="rounded-full text-xs gap-1.5"
              >
                {replyMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Publish Reply"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── 7. Chat Dialog with Customer ────────────────────────────────────── */}
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  to,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle: string;
  to: string;
  accent: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`grid size-10 place-items-center rounded-2xl ${accent}`}>
          <Icon className="size-5" />
        </span>
      </div>

      <div className="mt-3">
        <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}

function MiniKpiCard({
  label,
  value,
  to,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-2xl border border-border/80 bg-card/60 p-3 hover:bg-muted/40 transition-colors"
    >
      <Icon className={`size-4 ${color} shrink-0`} />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">{label}</p>
        <p className={`text-xs font-bold ${color} truncate`}>{value}</p>
      </div>
    </Link>
  );
}

function QuickActionBtn({
  to,
  icon: Icon,
  label,
  desc,
  variant = "outline",
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  variant?: "outline" | "hero";
}) {
  return (
    <Link
      to={to}
      className={`group flex flex-col justify-between rounded-2xl border p-3.5 transition-all duration-300 hover:-translate-y-0.5 ${
        variant === "hero"
          ? "border-primary/40 bg-primary/10 hover:bg-primary hover:text-primary-foreground"
          : "border-border bg-background/70 hover:border-primary/50 hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid size-7 place-items-center rounded-xl transition-colors ${
            variant === "hero"
              ? "bg-primary text-primary-foreground group-hover:bg-white group-hover:text-primary"
              : "bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
          }`}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="text-xs font-bold leading-tight">{label}</span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground group-hover:text-inherit/80 truncate">
        {desc}
      </p>
    </Link>
  );
}
