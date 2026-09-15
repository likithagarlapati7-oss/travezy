import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Eye,
  FileText,
  Filter,
  HelpCircle,
  History,
  Info,
  Layers,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import { updateBookingStatus } from "@/lib/bookings.functions";
import { confirmCashPayment } from "@/lib/wallet.functions";
import {
  formatPrice,
  myProviderQuery,
  providerBookingsQuery,
  type BookingWithService,
} from "@/lib/travezy";
import { ChatDialog } from "@/components/chat/ChatDialog";

export const Route = createFileRoute("/_authenticated/provider/bookings")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Booking Management — Travezy Provider" },
      {
        name: "description",
        content: "Manage guest reservations, accept requests, verify payments, and coordinate customer journeys.",
      },
      { property: "og:title", content: "Booking Management — Travezy Provider" },
      {
        property: "og:description",
        content: "Manage provider reservations, accept or decline requests, and view guest details.",
      },
    ],
  }),
  component: ProviderBookingsPage,
});

type FilterStatus = "all" | "pending" | "confirmed" | "upcoming" | "completed" | "cancelled";

function ProviderBookingsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const { data: provider, isLoading: providerLoading } = useQuery({
    ...myProviderQuery(userId),
    enabled: !!userId,
  });
  const providerId = provider?.id ?? "";

  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery({
    ...providerBookingsQuery(providerId),
    enabled: !!providerId,
  });

  // UI Filter States
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Modals & Dialogs
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<BookingWithService | null>(null);
  const [cashConfirmBooking, setCashConfirmBooking] = useState<BookingWithService | null>(null);
  const [chatPartner, setChatPartner] = useState<{
    id: string;
    name: string;
    bookingId?: string | null | undefined;
    serviceTitle?: string | null | undefined;
  } | null>(null);

  // Dialog confirmation states
  const [actionConfirm, setActionConfirm] = useState<{
    id: string;
    status: "confirmed" | "cancelled" | "completed" | "rejected";
    touristName?: string | undefined;
    serviceTitle?: string | undefined;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");

  const updateStatusFn = useServerFn(updateBookingStatus);
  const confirmCashFn = useServerFn(confirmCashPayment);

  // Status update mutation
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
      queryClient.invalidateQueries({ queryKey: ["provider-bookings", providerId] });
      queryClient.invalidateQueries({ queryKey: ["provider-wallet", userId] });
      setActionConfirm(null);
      setActionReason("");
      if (selectedBookingForDetails && selectedBookingForDetails.id === res.id) {
        setSelectedBookingForDetails((prev) => (prev ? { ...prev, status: res.status } : null));
      }
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to update booking status. Please try again.");
    },
  });

  // Confirm cash payment mutation
  const confirmCashMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await confirmCashFn({ data: { booking_id: bookingId } });
    },
    onSuccess: (res) => {
      toast.success(res.message || "Cash payment confirmed and recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["provider-bookings", providerId] });
      queryClient.invalidateQueries({ queryKey: ["provider-wallet", userId] });
      setCashConfirmBooking(null);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to confirm cash receipt. Please try again.");
    },
  });

  // Calculate distinct services for filter dropdown
  const uniqueServices = useMemo(() => {
    const map = new Map<string, string>();
    bookings.forEach((b) => {
      if (b.service_id && b.services?.title) {
        map.set(b.service_id, b.services.title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [bookings]);

  // Dynamic Statistics
  const statTotal = bookings.length;
  const statPending = bookings.filter((b) => (b.status || "").toLowerCase() === "pending").length;
  const statConfirmed = bookings.filter((b) => (b.status || "").toLowerCase() === "confirmed").length;
  const statCompleted = bookings.filter((b) => (b.status || "").toLowerCase() === "completed").length;
  const statCancelled = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "cancelled" || s === "rejected";
  }).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const statUpcoming = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    const isActive = s === "confirmed" || s === "pending";
    if (!isActive) return false;
    if (!b.travel_date) return true;
    const bDate = typeof b.travel_date === "string" ? b.travel_date.slice(0, 10) : "";
    return bDate >= todayStr;
  }).length;

  // Filtered Bookings List
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bStatus = (b.status || "").toLowerCase();
      const isPaid = (b.payments ?? []).some((p) => (p.status || "").toUpperCase() === "SUCCESS");

      // 1. Tab status filter
      if (filter === "pending" && bStatus !== "pending") return false;
      if (filter === "confirmed" && bStatus !== "confirmed") return false;
      if (filter === "completed" && bStatus !== "completed") return false;
      if (filter === "cancelled" && bStatus !== "cancelled" && bStatus !== "rejected") return false;
      if (filter === "upcoming") {
        const isActive = bStatus === "confirmed" || bStatus === "pending";
        if (!isActive) return false;
        if (b.travel_date) {
          const bDate = typeof b.travel_date === "string" ? b.travel_date.slice(0, 10) : "";
          if (bDate < todayStr) return false;
        }
      }

      // 2. Service dropdown filter
      if (selectedServiceFilter !== "all" && b.service_id !== selectedServiceFilter) {
        return false;
      }

      // 3. Payment status filter
      if (paymentFilter === "paid" && !isPaid) return false;
      if (paymentFilter === "pending" && isPaid) return false;

      // 4. Date filter
      if (dateFilter) {
        const bDate = b.travel_date ? b.travel_date.slice(0, 10) : "";
        if (bDate !== dateFilter) return false;
      }

      // 5. Search query (booking id, customer name, service name)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const touristName = (b.profiles?.full_name ?? "").toLowerCase();
        const serviceTitle = (b.services?.title ?? "").toLowerCase();
        const bookingId = (b.id ?? "").toLowerCase();
        const notes = (b.notes ?? "").toLowerCase();

        const match =
          touristName.includes(q) ||
          serviceTitle.includes(q) ||
          bookingId.includes(q) ||
          notes.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [bookings, filter, selectedServiceFilter, paymentFilter, dateFilter, searchQuery, todayStr]);

  const resetFilters = () => {
    setFilter("all");
    setSearchQuery("");
    setSelectedServiceFilter("all");
    setPaymentFilter("all");
    setDateFilter("");
  };

  const copyBookingId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`Booking ID copied: #${id.slice(0, 8)}`);
  };

  // Payment Status Badge Helper
  const getPaymentStatusBadge = (booking: BookingWithService) => {
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
        <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted">
          VOID
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
        <Clock className="size-2.5 mr-1" /> PENDING
      </Badge>
    );
  };

  // Booking Status Badge Helper
  const getBookingStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") {
      return (
        <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-xs font-semibold">
          <Clock className="size-3 mr-1" /> Pending Request
        </Badge>
      );
    }
    if (s === "confirmed") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold">
          <CheckCircle2 className="size-3 mr-1" /> Confirmed
        </Badge>
      );
    }
    if (s === "rejected" || s === "cancelled") {
      return (
        <Badge variant="destructive" className="text-xs font-semibold">
          <XCircle className="size-3 mr-1" /> {s === "rejected" ? "Declined" : "Cancelled"}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-muted text-foreground text-xs font-semibold">
        <Check className="size-3 mr-1" /> Completed
      </Badge>
    );
  };

  if (bookingsLoading || providerLoading) {
    return (
      <PageShell eyebrow="Provider" title="Loading reservations…">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Provider Management"
      title="Reservation & Booking Management"
      subtitle="Accept incoming guest requests, manage confirmed arrivals, track payments, and communicate directly with travelers."
    >
      <div className="space-y-6">
        {/* ── Top Navigation & Back Link ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/provider/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Provider Dashboard
          </Link>

          <Badge variant="outline" className="text-xs">
            Provider: <span className="font-semibold text-foreground ml-1">{provider?.business_name || "Partner"}</span>
          </Badge>
        </div>

        {/* ── 1. Telemetry Statistics Counters Bar ────────────────────────────── */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatPill
            label="Total Bookings"
            count={statTotal}
            active={filter === "all"}
            onClick={() => setFilter("all")}
            icon={Layers}
            color="text-foreground"
          />
          <StatPill
            label="Pending Requests"
            count={statPending}
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
            icon={Clock}
            color="text-amber-600 dark:text-amber-400"
            highlight={statPending > 0}
          />
          <StatPill
            label="Confirmed"
            count={statConfirmed}
            active={filter === "confirmed"}
            onClick={() => setFilter("confirmed")}
            icon={CheckCircle2}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <StatPill
            label="Upcoming Trips"
            count={statUpcoming}
            active={filter === "upcoming"}
            onClick={() => setFilter("upcoming")}
            icon={CalendarDays}
            color="text-blue-600 dark:text-blue-400"
          />
          <StatPill
            label="Completed"
            count={statCompleted}
            active={filter === "completed"}
            onClick={() => setFilter("completed")}
            icon={Check}
            color="text-purple-600 dark:text-purple-400"
          />
          <StatPill
            label="Cancelled / Declined"
            count={statCancelled}
            active={filter === "cancelled"}
            onClick={() => setFilter("cancelled")}
            icon={XCircle}
            color="text-destructive"
          />
        </div>

        {/* ── 2. Filter & Live Search Toolbar ─────────────────────────────────── */}
        <div className="glass-card rounded-3xl p-5 shadow-card space-y-4 border border-border">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Booking ID (#1234), Guest Name, Service Title, or notes..."
                className="h-10 pl-10 pr-4 text-xs rounded-full bg-background border-border"
              />
            </div>

            {(selectedServiceFilter !== "all" || paymentFilter !== "all" || dateFilter || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-muted-foreground hover:text-foreground h-9 gap-1 shrink-0"
              >
                <RotateCcw className="size-3" /> Reset Filters
              </Button>
            )}
          </div>

          {/* Sub-Filters: Service, Payment Status, Date */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
            {/* Service Filter Dropdown */}
            <div className="flex items-center gap-1.5 min-w-[200px]">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Service:</span>
              <Select value={selectedServiceFilter} onValueChange={setSelectedServiceFilter}>
                <SelectTrigger className="h-8 rounded-full text-xs">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services ({uniqueServices.length})</SelectItem>
                  {uniqueServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status Dropdown */}
            <div className="flex items-center gap-1.5 min-w-[170px]">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Payment:</span>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="h-8 rounded-full text-xs">
                  <SelectValue placeholder="All Payments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment States</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending / Due</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Travel Date Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Date:</span>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-8 w-36 rounded-full text-xs px-3"
              />
            </div>

            <span className="ml-auto text-xs text-muted-foreground">
              Showing <span className="font-bold text-foreground">{filteredBookings.length}</span> of {bookings.length} reservations
            </span>
          </div>
        </div>

        {/* ── 3. Bookings List & Interactive Cards Table ──────────────────────── */}
        {filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const touristName = b.profiles?.full_name || "Guest Tourist";
              const touristEmail = b.profiles?.email;
              const touristPhone = b.profiles?.phone;
              const serviceTitle = b.services?.title || "Marketplace Experience";
              const serviceCategory = b.services?.category || "service";
              const isPending = (b.status || "").toLowerCase() === "pending";
              const isConfirmed = (b.status || "").toLowerCase() === "confirmed";
              const isCompleted = (b.status || "").toLowerCase() === "completed";
              const isCancelled =
                (b.status || "").toLowerCase() === "cancelled" ||
                (b.status || "").toLowerCase() === "rejected";

              const isPaid = (b.payments ?? []).some(
                (p) => (p.status || "").toUpperCase() === "SUCCESS"
              );

              return (
                <article
                  key={b.id}
                  className={`rounded-3xl border p-5 shadow-card transition-all duration-300 bg-card hover:border-primary/50 ${
                    isPending
                      ? "border-amber-500/40 bg-amber-500/[0.02]"
                      : isConfirmed
                      ? "border-emerald-500/30"
                      : "border-border"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left Column: Tourist & Service Summary */}
                    <div className="flex items-start gap-4">
                      {/* Avatar / Initial */}
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary font-bold text-base font-display">
                        {touristName.charAt(0).toUpperCase()}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display font-bold text-base text-foreground truncate">
                            {touristName}
                          </h4>
                          <button
                            onClick={() => copyBookingId(b.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors bg-muted px-2 py-0.5 rounded-md"
                            title="Click to copy booking ID"
                          >
                            #{b.id.slice(0, 8)} <Copy className="size-2.5" />
                          </button>
                        </div>

                        <p className="text-xs font-semibold text-primary line-clamp-1">
                          {serviceTitle}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-accent" />
                            {b.travel_date ? new Date(b.travel_date).toLocaleDateString() : "Flexible Date"}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Users className="size-3" />
                            {b.guests} {b.guests === 1 ? "Guest" : "Guests"}
                          </span>
                          {b.created_at && (
                            <>
                              <span>·</span>
                              <span className="text-[11px]">
                                Booked on {new Date(b.created_at).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: Status Badges & Price */}
                    <div className="flex flex-wrap items-center gap-4 lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-border/60">
                      <div className="space-y-1 text-left lg:text-right">
                        <div className="flex items-center gap-2 lg:justify-end">
                          {getBookingStatusBadge(b.status)}
                          {getPaymentStatusBadge(b)}
                        </div>

                        <p className="font-display text-lg font-bold text-foreground">
                          {formatPrice(Number(b.total_price), (b.services as any)?.currency || "INR")}
                        </p>
                      </div>

                      {/* Right Column: Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* 1. Pending Actions */}
                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              variant="hero"
                              onClick={() =>
                                setActionConfirm({
                                  id: b.id,
                                  status: "confirmed",
                                  touristName,
                                  serviceTitle,
                                })
                              }
                              className="rounded-full text-xs h-8 gap-1 shadow-sm"
                            >
                              <Check className="size-3.5" /> Accept
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setActionConfirm({
                                  id: b.id,
                                  status: "rejected",
                                  touristName,
                                  serviceTitle,
                                })
                              }
                              className="rounded-full text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                            >
                              <X className="size-3.5" /> Decline
                            </Button>
                          </>
                        )}

                        {/* 2. Confirmed Actions */}
                        {isConfirmed && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setActionConfirm({
                                  id: b.id,
                                  status: "completed",
                                  touristName,
                                  serviceTitle,
                                })
                              }
                              className="rounded-full text-xs h-8 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1"
                            >
                              <Check className="size-3.5" /> Mark Completed
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setActionConfirm({
                                  id: b.id,
                                  status: "cancelled",
                                  touristName,
                                  serviceTitle,
                                })
                              }
                              className="rounded-full text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                              Cancel
                            </Button>
                          </>
                        )}

                        {/* Direct Message Customer Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setChatPartner({
                              id: b.user_id,
                              name: touristName,
                              bookingId: b.id,
                              serviceTitle,
                            })
                          }
                          className="rounded-full text-xs h-8 px-2.5 text-primary hover:bg-primary/10 gap-1"
                          title="Message guest directly"
                        >
                          <MessageSquare className="size-3.5" /> Message
                        </Button>

                        {/* View Details Modal Trigger */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedBookingForDetails(b)}
                          className="rounded-full text-xs h-8 gap-1"
                        >
                          <Eye className="size-3.5" /> Details
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Notes snippet if provided by guest */}
                  {b.notes && (
                    <div className="mt-3 rounded-2xl bg-muted/40 p-2.5 text-xs text-muted-foreground border border-border/40 flex items-start gap-2">
                      <FileText className="size-3.5 text-primary mt-0.5 shrink-0" />
                      <span className="line-clamp-1">
                        <strong className="text-foreground font-semibold">Guest Note:</strong> {b.notes}
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-border p-12 text-center space-y-3">
            <CalendarRange className="mx-auto size-12 text-muted-foreground/50" />
            <h3 className="font-display font-bold text-lg text-foreground">No reservations found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              We couldn't find any bookings matching your current filters. Try changing or clearing your search criteria.
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-full text-xs">
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* ─── 4. Modal: Comprehensive Booking Details ─────────────────────────── */}
      {selectedBookingForDetails && (
        <Dialog
          open={Boolean(selectedBookingForDetails)}
          onOpenChange={(open) => !open && setSelectedBookingForDetails(null)}
        >
          <DialogContent className="sm:max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <Receipt className="size-5 text-primary" /> Reservation Details
                </DialogTitle>
                {getBookingStatusBadge(selectedBookingForDetails.status)}
              </div>
              <DialogDescription className="text-xs font-mono text-muted-foreground pt-1 flex items-center gap-1">
                Booking Reference: #{selectedBookingForDetails.id}
                <button onClick={() => copyBookingId(selectedBookingForDetails.id)}>
                  <Copy className="size-3 text-primary ml-1" />
                </button>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 my-3">
              {/* 4A: Guest Information Section */}
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" /> Guest Information
                </h5>

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Guest Full Name</span>
                    <span className="font-bold text-foreground text-sm">
                      {selectedBookingForDetails.profiles?.full_name || "Guest Traveler"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Party Size</span>
                    <span className="font-semibold text-foreground">
                      {selectedBookingForDetails.guests} {selectedBookingForDetails.guests === 1 ? "Person" : "Persons"}
                    </span>
                  </div>

                  {selectedBookingForDetails.profiles?.email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3 text-accent" />
                      <span className="truncate">{selectedBookingForDetails.profiles.email}</span>
                    </div>
                  )}

                  {selectedBookingForDetails.profiles?.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="size-3 text-accent" />
                      <span>{selectedBookingForDetails.profiles.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/50 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setChatPartner({
                        id: selectedBookingForDetails.user_id,
                        name: selectedBookingForDetails.profiles?.full_name || "Guest",
                        bookingId: selectedBookingForDetails.id,
                        serviceTitle: selectedBookingForDetails.services?.title,
                      });
                    }}
                    className="rounded-full text-xs h-8 gap-1 text-primary"
                  >
                    <MessageSquare className="size-3.5" /> Message Customer Directly
                  </Button>
                </div>
              </div>

              {/* 4B: Booked Experience Information */}
              <div className="rounded-2xl border border-border p-4 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-accent" /> Service & Schedule Details
                </h5>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px]">Service Listing</span>
                    <p className="font-bold text-foreground text-sm">
                      {selectedBookingForDetails.services?.title || "Booked Experience"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[selectedBookingForDetails.services?.city, selectedBookingForDetails.services?.destination].filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-border/50">
                    <div>
                      <span className="text-muted-foreground text-[11px]">Scheduled Date</span>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="size-3 text-accent" />
                        {selectedBookingForDetails.travel_date
                          ? new Date(selectedBookingForDetails.travel_date).toLocaleDateString(undefined, {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Flexible Schedule"}
                      </p>
                    </div>

                    <div>
                      <span className="text-muted-foreground text-[11px]">Booking Created</span>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground" />
                        {new Date(selectedBookingForDetails.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4C: Payment & Pricing Breakdown */}
              <div className="rounded-2xl border border-border p-4 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-emerald-500" /> Payment & Pricing Breakdown
                </h5>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Base Rate × Guests ({selectedBookingForDetails.guests})</span>
                    <span>{formatPrice(Number(selectedBookingForDetails.total_price))}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-border font-bold text-sm text-foreground">
                    <span>Total Booking Price</span>
                    <span className="text-primary text-base">
                      {formatPrice(Number(selectedBookingForDetails.total_price))}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 text-xs">
                    <span className="text-muted-foreground">Payment Status:</span>
                    {getPaymentStatusBadge(selectedBookingForDetails)}
                  </div>
                </div>
              </div>

              {/* 4D: Guest Notes Callout */}
              {selectedBookingForDetails.notes && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs space-y-1">
                  <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <FileText className="size-3.5" /> Notes from Guest
                  </span>
                  <p className="text-foreground/90 leading-relaxed italic">
                    "{selectedBookingForDetails.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBookingForDetails(null)}
                className="rounded-full text-xs"
              >
                Close
              </Button>

              {/* Conditional Action Buttons based on status */}
              {(selectedBookingForDetails.status || "").toLowerCase() === "pending" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActionConfirm({
                        id: selectedBookingForDetails.id,
                        status: "rejected",
                        touristName: selectedBookingForDetails.profiles?.full_name,
                        serviceTitle: selectedBookingForDetails.services?.title,
                      });
                    }}
                    className="rounded-full text-xs text-destructive border-destructive/30"
                  >
                    Decline Request
                  </Button>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => {
                      setActionConfirm({
                        id: selectedBookingForDetails.id,
                        status: "confirmed",
                        touristName: selectedBookingForDetails.profiles?.full_name,
                        serviceTitle: selectedBookingForDetails.services?.title,
                      });
                    }}
                    className="rounded-full text-xs"
                  >
                    Accept Booking
                  </Button>
                </div>
              )}

              {(selectedBookingForDetails.status || "").toLowerCase() === "confirmed" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActionConfirm({
                        id: selectedBookingForDetails.id,
                        status: "cancelled",
                        touristName: selectedBookingForDetails.profiles?.full_name,
                        serviceTitle: selectedBookingForDetails.services?.title,
                      });
                    }}
                    className="rounded-full text-xs text-destructive"
                  >
                    Cancel Booking
                  </Button>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => {
                      setActionConfirm({
                        id: selectedBookingForDetails.id,
                        status: "completed",
                        touristName: selectedBookingForDetails.profiles?.full_name,
                        serviceTitle: selectedBookingForDetails.services?.title,
                      });
                    }}
                    className="rounded-full text-xs"
                  >
                    Mark Completed
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── 5. Dialog: Action Confirmation Dialog ────────────────────────────── */}
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
              <DialogDescription className="text-xs pt-1 leading-relaxed">
                Are you sure you want to mark this reservation for{" "}
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

            <div className="space-y-3 my-2 text-xs">
              <div className="rounded-2xl bg-muted/40 p-3 border border-border/60">
                <p className="text-muted-foreground">
                  The traveler will receive an immediate real-time in-app notification confirming this update.
                </p>
              </div>

              {(actionConfirm.status === "rejected" || actionConfirm.status === "cancelled") && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Reason for cancellation (optional message to traveler):
                  </span>
                  <Textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="e.g. Schedule conflict, seasonal closure..."
                    className="text-xs rounded-xl min-h-[70px]"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionConfirm(null)}
                className="rounded-full text-xs"
              >
                Back
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

      {/* ─── 6. Live Chat Dialog with Customer ───────────────────────────────── */}
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

// ── Pill Helper Component ────────────────────────────────────────────────────

function StatPill({
  label,
  count,
  active,
  onClick,
  icon: Icon,
  color,
  highlight,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border p-3 text-left transition-all ${
        active
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border/80 bg-card hover:bg-muted/40"
      } ${highlight ? "ring-2 ring-amber-500/50" : ""}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`size-3.5 ${color} shrink-0`} />
        <span className="text-xs font-semibold text-muted-foreground truncate">{label}</span>
      </div>
      <span className={`font-mono text-xs font-bold ${color} ml-2 shrink-0`}>{count}</span>
    </button>
  );
}
