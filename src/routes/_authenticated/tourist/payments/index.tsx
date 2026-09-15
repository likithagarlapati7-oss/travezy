import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import { formatPrice, myPaymentsQuery, type PaymentWithDetails } from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/tourist/payments/")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["tourist"]);
  },
  head: () => ({
    meta: [
      { title: "My Payments & Receipts — Travezy" },
      {
        name: "description",
        content: "Review your transaction history, verified receipts, and payment status.",
      },
    ],
  }),
  component: TouristPaymentsPage,
});

type FilterStatus = "all" | "successful" | "pending" | "failed" | "refunded";

function TouristPaymentsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data: payments, isLoading, error, refetch } = useQuery({
    ...myPaymentsQuery(userId),
    enabled: !!userId,
  });

  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentWithDetails | null>(null);

  // Status mapping and styling
  const getStatusBadge = (status: string, method?: string) => {
    const s = (status || "").toUpperCase();
    const isCash = (method || "").toUpperCase() === "CASH";

    if (s === "SUCCESS" || s === "PAID") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-3" /> Paid {isCash ? "(Cash)" : ""}
        </span>
      );
    }
    if (s === "PENDING" || s === "CREATED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <Clock className="size-3" /> {isCash ? "Pay at Service (Pending)" : "Pending"}
        </span>
      );
    }
    if (s === "FAILED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 border border-destructive/20 px-2.5 py-0.5 text-xs font-semibold text-destructive">
          <ShieldAlert className="size-3" /> Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-border px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
        Refunded
      </span>
    );
  };

  const filterTabs: { value: FilterStatus; label: string; count?: number }[] = [
    { value: "all", label: "All Transactions" },
    { value: "successful", label: "Paid" },
    { value: "pending", label: "Pending" },
    { value: "failed", label: "Failed" },
    { value: "refunded", label: "Refunded" },
  ];

  // Filtering & searching
  const filteredPayments = (payments ?? []).filter((p) => {
    const s = (p.status || "").toUpperCase();
    const isPaid = s === "SUCCESS" || s === "PAID";
    // Filter check
    if (activeFilter === "successful" && !isPaid) return false;
    if (activeFilter === "pending" && (s !== "PENDING" && s !== "CREATED")) return false;
    if (activeFilter === "failed" && s !== "FAILED") return false;
    if (activeFilter === "refunded" && s !== "REFUNDED") return false;

    // Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const serviceTitle = p.bookings?.services?.title?.toLowerCase() || "";
      const destination = p.bookings?.services?.destination?.toLowerCase() || "";
      const razorpayId = p.razorpay_payment_id?.toLowerCase() || "";
      const bookingId = p.booking_id?.toLowerCase() || "";
      const paymentId = p.id?.toLowerCase() || "";

      return (
        serviceTitle.includes(q) ||
        destination.includes(q) ||
        razorpayId.includes(q) ||
        bookingId.includes(q) ||
        paymentId.includes(q)
      );
    }

    return true;
  });

  // Calculate Metrics
  const totalSpent = (payments ?? [])
    .filter((p) => {
      const s = (p.status || "").toUpperCase();
      return s === "SUCCESS" || s === "PAID";
    })
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const successfulCount = (payments ?? []).filter((p) => {
    const s = (p.status || "").toUpperCase();
    return s === "SUCCESS" || s === "PAID";
  }).length;

  return (
    <PageShell
      eyebrow="Financial Records"
      title="My Payments & Receipts"
      subtitle="Track your travel transactions, download verified receipts and review payment statuses."
    >
      <div className="space-y-8">
        {/* Metric Cards */}
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <Wallet className="size-6" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Total Settled</p>
              <p className="font-display text-2xl sm:text-3xl font-bold mt-0.5">
                {formatPrice(totalSpent)}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="size-6" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Successful Payments</p>
              <p className="font-display text-2xl sm:text-3xl font-bold mt-0.5">
                {successfulCount}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent shrink-0">
              <History className="size-6" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="font-display text-2xl sm:text-3xl font-bold mt-0.5">
                {payments?.length ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Search & Filter Tabs */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border-b border-border pb-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  activeFilter === tab.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search payment or trip…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Transactions List */}
        {error ? (
          <p className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-destructive text-center">
            We couldn't load your payments. Please refresh and try again.
          </p>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="h-24 bg-muted animate-pulse rounded-3xl" />
            <div className="h-24 bg-muted animate-pulse rounded-3xl" />
            <div className="h-24 bg-muted animate-pulse rounded-3xl" />
          </div>
        ) : filteredPayments.length > 0 ? (
          <div className="space-y-4">
            {filteredPayments.map((p) => {
              const booking = p.bookings;
              const service = booking?.services;
              const s = (p.status || "").toUpperCase();
              const isPaid = s === "SUCCESS" || s === "PAID";

              return (
                <div
                  key={p.id}
                  className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-card hover:shadow-float hover:border-accent/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                >
                  {/* Left: Info */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {service?.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.title}
                        className="size-16 sm:size-20 rounded-2xl object-cover shrink-0 hidden sm:block"
                      />
                    ) : (
                      <div className="size-16 sm:size-20 rounded-2xl bg-muted grid place-items-center shrink-0 text-muted-foreground hidden sm:grid">
                        <CreditCard className="size-8" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(p.status, p.payment_method || p.method)}
                        <span className="text-xs text-muted-foreground font-mono">
                          ID: {p.id.slice(0, 8)}
                        </span>
                        {p.razorpay_payment_id && (
                          <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded-md">
                            Ref: {p.razorpay_payment_id}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-lg font-semibold text-foreground truncate">
                        {service?.title || "Travel Service Booking"}
                      </h3>

                      <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        {service?.destination && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 text-accent shrink-0" />
                            {service.destination}
                          </span>
                        )}
                        <span>·</span>
                        <span>
                          {new Date(p.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>·</span>
                        <span className="capitalize">
                          Method: {p.payment_method || p.method || "Online"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto border-t md:border-t-0 border-border pt-3 md:pt-0 shrink-0">
                    <div className="text-left md:text-right">
                      <p className="font-display text-2xl font-bold text-primary">
                        {formatPrice(Number(p.amount), p.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.bookings?.guests || 1} guest{(p.bookings?.guests || 1) > 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPaid && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1.5"
                          onClick={() => setSelectedReceipt(p)}
                        >
                          <FileText className="size-3.5" />
                          <span className="hidden sm:inline">Receipt</span>
                        </Button>
                      )}

                      <Button asChild variant="ocean" size="sm">
                        <Link
                          to="/tourist/payments/$paymentId"
                          params={{ paymentId: p.id }}
                        >
                          Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4">
            <div className="size-12 rounded-full bg-muted grid place-items-center mx-auto text-muted-foreground">
              <CreditCard className="size-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">No transactions found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                {searchQuery
                  ? "No payments match your search criteria. Try a different query."
                  : "You have not completed any payments in this category yet."}
              </p>
            </div>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            )}
          </div>
        )}

        {/* Instant Receipt Preview Modal */}
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl my-8">
              <PaymentReceipt
                payment={selectedReceipt}
                onClose={() => setSelectedReceipt(null)}
                showActions={true}
              />
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
