import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Printer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Star,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { ReviewFormDialog } from "@/components/ReviewFormDialog";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay } from "@/hooks/useRazorpay";
import { updateBookingStatus } from "@/lib/bookings.functions";
import { createCashBookingPayment } from "@/lib/wallet.functions";
import {
  bookingPaymentQuery,
  bookingReviewQuery,
  formatPrice,
  providerName,
  touristBookingQuery,
  type PaymentWithDetails,
} from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/tourist/bookings/$bookingId")({
  head: () => ({
    meta: [{ title: "Booking Details — Travezy" }],
  }),
  component: BookingDetailsPage,
});

type PaymentOptionId = "upi" | "card" | "credit_card" | "net_banking" | "wallet" | "cash";

const PAYMENT_METHODS: {
  id: PaymentOptionId;
  name: string;
  description: string;
  icon: any;
  badge?: string;
}[] = [
  {
    id: "upi",
    name: "UPI",
    description: "Google Pay, PhonePe, Paytm, BHIM, QR",
    icon: Smartphone,
    badge: "Instant & Free",
  },
  {
    id: "card",
    name: "Debit Card",
    description: "Visa, Mastercard, RuPay debit cards",
    icon: CreditCard,
  },
  {
    id: "credit_card",
    name: "Credit Card",
    description: "Visa, Mastercard, Amex credit cards",
    icon: CreditCard,
  },
  {
    id: "net_banking",
    name: "Net Banking",
    description: "50+ Indian & International banks",
    icon: Landmark,
  },
  {
    id: "wallet",
    name: "Wallets",
    description: "Paytm, Mobikwik, PhonePe wallets",
    icon: Wallet,
  },
  {
    id: "cash",
    name: "Cash at Service / Pay Later",
    description: "Pay directly in cash to host at location",
    icon: Banknote,
    badge: "Pay on Arrival",
  },
];

function BookingDetailsPage() {
  const { bookingId } = Route.useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { initiatePayment, isProcessing: isPaying } = useRazorpay();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentOptionId>("upi");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: "failed" | "cancelled" | null;
    message?: string;
  }>({ type: null });

  const { data: booking, isLoading, isError } = useQuery(touristBookingQuery(bookingId));
  const { data: paymentData, isLoading: isLoadingPayment } = useQuery(bookingPaymentQuery(bookingId));
  const { data: reviewData } = useQuery(bookingReviewQuery(bookingId));
  const updateStatusFn = useServerFn(updateBookingStatus);
  const createCashPaymentFn = useServerFn(createCashBookingPayment);

  const cashPaymentMutation = useMutation({
    mutationFn: async () => {
      return await createCashPaymentFn({
        data: {
          booking_id: bookingId,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(res.message || "Cash at service confirmed!");
      queryClient.invalidateQueries({ queryKey: ["payment", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["my-payments"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to confirm cash option. Please try again.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return await updateStatusFn({
        data: {
          id: bookingId,
          status: "cancelled",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking cancelled successfully.");
      setShowCancelDialog(false);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to cancel booking. Please try again.");
    },
  });

  if (isLoading) {
    return (
      <PageShell title="Loading details…">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (isError || !booking) {
    return (
      <PageShell
        title="Booking not found"
        subtitle="The requested booking details do not exist or you do not have permission to view them."
      >
        <Button asChild variant="ocean">
          <Link to="/tourist/bookings">Back to my bookings</Link>
        </Button>
      </PageShell>
    );
  }

  const { services: service } = booking;
  const isPaid = paymentData?.isPaid ?? false;
  const payment = paymentData?.payment;
  const isCashPending =
    !isPaid &&
    payment &&
    ((payment.payment_method || payment.method || "").toUpperCase() === "CASH" ||
      (payment.status || "").toUpperCase() === "PENDING");

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/20 px-3 py-1 text-xs font-semibold capitalize text-amber-800 dark:text-amber-300">
          Pending Confirmation
        </span>
      );
    }
    if (s === "confirmed") {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 text-xs font-semibold capitalize text-emerald-800 dark:text-emerald-300">
          Confirmed
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold capitalize text-destructive">
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold capitalize text-slate-800 dark:text-slate-300">
        Completed
      </span>
    );
  };

  const isCancelable =
    booking.status.toLowerCase() === "pending" || booking.status.toLowerCase() === "confirmed";

  const handlePayNow = () => {
    if (isPaid) {
      toast.info("This booking is already paid.");
      return;
    }

    if (selectedPaymentMethod === "cash") {
      cashPaymentMutation.mutate();
      return;
    }

    setPaymentFeedback({ type: null });

    const userMeta = (user?.user_metadata || {}) as Record<string, any>;
    initiatePayment({
      bookingId,
      serviceTitle: service?.title || "Travezy Trip",
      paymentMethod: selectedPaymentMethod.toUpperCase(),
      customerName: (userMeta["full_name"] as string | undefined) || undefined,
      customerEmail: user?.email || undefined,
      customerPhone: (userMeta["phone"] as string | undefined) || undefined,
      onSuccess: () => {
        setPaymentFeedback({ type: null });
        queryClient.invalidateQueries({ queryKey: ["payment", bookingId] });
        queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        queryClient.invalidateQueries({ queryKey: ["my-payments"] });
      },
      onError: (err) => {
        setPaymentFeedback({
          type: "failed",
          message: err.message || "Payment failed. Please try again.",
        });
        queryClient.invalidateQueries({ queryKey: ["payment", bookingId] });
      },
      onDismiss: () => {
        setPaymentFeedback({
          type: "cancelled",
          message: "Payment was cancelled. You can retry whenever you're ready.",
        });
        queryClient.invalidateQueries({ queryKey: ["payment", bookingId] });
      },
    });
  };

  // Structured payment details for receipt view
  const userMeta = (user?.user_metadata || {}) as Record<string, any>;
  const paymentReceiptDetails: PaymentWithDetails | null = payment
    ? {
        ...payment,
        bookings: {
          ...booking,
          services: service ?? null,
          profiles: {
            full_name: (userMeta["full_name"] as string) || "Valued Traveller",
            email: user?.email || null,
            phone: (userMeta["phone"] as string) || null,
          },
        },
        providers: service?.providers ?? null,
      }
    : null;

  return (
    <PageShell
      eyebrow="Booking Details"
      title="Manage your trip"
      subtitle="Review stay dates, payment status and check booking updates."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Back Link */}
        <Link
          to="/tourist/bookings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Back to trips
        </Link>

        <div className="grid gap-6 md:grid-cols-[1.5fr_1fr] items-start">
          {/* Main Info */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-card space-y-6">
              {/* Header info */}
              <div className="flex justify-between items-start gap-4 flex-wrap border-b border-border pb-6">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">ID: {booking.id}</p>
                  <h2 className="text-3xl font-display mt-1 leading-snug">{service?.title}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <MapPin className="size-4 text-accent shrink-0" />
                    {service?.destination}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(booking.status)}
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="size-3.5" /> Payment Successful
                    </span>
                  ) : booking.status.toLowerCase() !== "cancelled" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                      <CreditCard className="size-3.5" /> Payment Pending
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Travel metrics */}
              <div className="grid gap-6 sm:grid-cols-2 text-sm pt-2">
                <div className="flex gap-3 items-center">
                  <div className="rounded-xl bg-muted p-3 text-accent shrink-0">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block uppercase tracking-wider font-semibold">
                      Travel Date
                    </span>
                    <span className="font-semibold text-lg">{booking.travel_date}</span>
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <div className="rounded-xl bg-muted p-3 text-accent shrink-0">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block uppercase tracking-wider font-semibold">
                      Guests
                    </span>
                    <span className="font-semibold text-lg">
                      {booking.guests} guest{booking.guests > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="size-3.5" /> Your Notes / Special Requests
                </h4>
                <p className="text-sm text-foreground italic">
                  {booking.notes ? `"${booking.notes}"` : "No special requests."}
                </p>
              </div>

              {/* Cancel Button */}
              {isCancelable && (
                <div className="border-t border-border pt-6 flex justify-end">
                  <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
                    Cancel Booking
                  </Button>
                </div>
              )}
            </div>

            {/* Payment Feedback Banner (Failed or Cancelled) */}
            {paymentFeedback.type === "failed" && !isPaid && (
              <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5 shadow-card space-y-3">
                <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                  <ShieldAlert className="size-5" />
                  Payment Failed
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentFeedback.message || "Payment failed. Please try again."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePayNow}
                  disabled={isPaying}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <RotateCcw className="size-3.5" /> Retry Payment
                </Button>
              </div>
            )}

            {paymentFeedback.type === "cancelled" && !isPaid && (
              <div className="rounded-3xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-5 shadow-card space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-sm">
                  <AlertCircle className="size-5" />
                  Payment Cancelled
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentFeedback.message || "Payment was cancelled. You can retry whenever you're ready."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePayNow}
                  disabled={isPaying}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <RotateCcw className="size-3.5" /> Complete Payment
                </Button>
              </div>
            )}

            {/* Payment Record Details & Receipt Section (When Paid) */}
            {payment && isPaid && (
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 p-6 shadow-card space-y-5">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 p-2.5 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        Payment Successful
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Settled & cryptographically verified via Razorpay
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReceiptModal(true)}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <FileText className="size-3.5" /> View Receipt
                    </Button>
                    <Button
                      variant="ocean"
                      size="sm"
                      onClick={() => setShowReceiptModal(true)}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <Printer className="size-3.5" /> Print
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 text-xs border-t border-emerald-500/10">
                  <div>
                    <span className="text-muted-foreground block">Transaction ID</span>
                    <span className="font-mono font-medium truncate block" title={payment.razorpay_payment_id || payment.id}>
                      {payment.razorpay_payment_id || payment.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Amount Paid</span>
                    <span className="font-semibold text-foreground">
                      {formatPrice(Number(payment.amount), payment.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Settled On</span>
                    <span className="font-medium text-foreground">
                      {new Date(payment.updated_at || payment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Review Section (Only when Completed) */}
            {booking.status.toLowerCase() === "completed" && (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
                {reviewData ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                          Your Verified Experience Review
                        </span>
                        <div className="flex items-center gap-1 text-gold mt-1">
                          {Array.from({ length: reviewData.rating }).map((_, i) => (
                            <Star key={i} className="size-4 fill-current" />
                          ))}
                          <span className="text-xs font-semibold text-foreground ml-1.5">
                            {reviewData.rating} / 5 Stars
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReviewDialog(true)}
                        className="text-xs"
                      >
                        Edit Review
                      </Button>
                    </div>

                    <p className="text-sm text-foreground bg-muted/40 p-4 rounded-2xl border border-border leading-relaxed italic">
                      "{reviewData.comment}"
                    </p>

                    {reviewData.provider_response && (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
                        <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5" /> Response from Host ({service?.providers?.business_name || "Provider"})
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {reviewData.provider_response}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-amber-500/10 p-2.5 text-gold">
                        <Star className="size-6 fill-current" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-foreground">
                          Rate & Review Your Trip
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Your adventure is completed! Share your experience to help the community.
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="hero"
                      size="sm"
                      onClick={() => setShowReviewDialog(true)}
                      className="flex items-center gap-1.5"
                    >
                      <Star className="size-3.5 fill-current" /> Write a Review
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pricing & Checkout Sidebar */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-6">
            <h3 className="text-lg font-display">Payment Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per guest</span>
                <span>{service ? formatPrice(Number(service.price), service.currency) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span>× {booking.guests}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-display text-xl text-primary font-bold">
                <span>Total amount</span>
                <span>{formatPrice(Number(booking.total_price), service?.currency)}</span>
              </div>
            </div>

            {/* Pay Now / Payment Method Selection */}
            {isPaid ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center space-y-2">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="size-4" /> Payment Successful
                </p>
                <p className="text-xs text-muted-foreground">
                  Your payment has been successfully verified and recorded.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setShowReceiptModal(true)}
                >
                  <FileText className="size-3.5 mr-1.5" /> View Official Receipt
                </Button>
              </div>
            ) : booking.status.toLowerCase() === "cancelled" ? (
              <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                This booking is cancelled and ineligible for payment.
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {/* Cash at Service Pending Notice if already selected */}
                {isCashPending && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-1.5">
                    <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Banknote className="size-4" /> Cash at Service (Pending)
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      You chose to pay at the service location. Please pay ₹{Number(booking.total_price).toLocaleString()} in cash to your host upon arrival.
                    </p>
                  </div>
                )}

                {/* Choose Payment Method List */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Choose Payment Method
                  </label>
                  <div className="grid gap-2">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const isSelected = selectedPaymentMethod === method.id;
                      return (
                        <div
                          key={method.id}
                          onClick={() => setSelectedPaymentMethod(method.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                              : "border-border bg-background hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`rounded-xl p-2 shrink-0 ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs text-foreground block">
                                  {method.name}
                                </span>
                                {method.badge && (
                                  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.2 rounded-full">
                                    {method.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground truncate block">
                                {method.description}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`size-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            }`}
                          >
                            {isSelected && <Check className="size-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full flex items-center justify-center gap-2 shadow-float"
                  onClick={handlePayNow}
                  disabled={isPaying || isLoadingPayment || cashPaymentMutation.isPending}
                >
                  {isPaying || cashPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Processing…
                    </>
                  ) : selectedPaymentMethod === "cash" ? (
                    <>
                      <Banknote className="size-4" /> Confirm Cash at Service
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" /> Pay {formatPrice(Number(booking.total_price), service?.currency)} via {PAYMENT_METHODS.find((m) => m.id === selectedPaymentMethod)?.name}
                    </>
                  )}
                </Button>

                <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  {selectedPaymentMethod === "cash"
                    ? "Pay securely in cash at your destination"
                    : "256-bit encrypted Razorpay payment gateway"}
                </p>
              </div>
            )}

            {service && (
              <div className="rounded-2xl bg-muted/40 p-4 text-xs text-muted-foreground space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Hosted By</span>
                    <strong className="text-sm font-semibold text-foreground">{providerName(service)}</strong>
                  </div>
                  {service.providers?.user_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs rounded-full bg-background"
                      onClick={() => setShowChatModal(true)}
                    >
                      <MessageSquare className="size-3.5 text-primary" />
                      Message Host
                    </Button>
                  )}
                </div>
                <p>
                  <strong>Created:</strong> {new Date(booking.created_at).toLocaleDateString()}
                </p>
                {booking.updated_at && (
                  <p>
                    <strong>Last updated:</strong>{" "}
                    {new Date(booking.updated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cancel Confirmation Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
            <div className="max-w-md w-full rounded-3xl border border-border bg-card p-6 shadow-float space-y-5">
              <div className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="size-8" />
                <h3 className="text-xl font-display">Cancel Booking?</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Are you sure you want to cancel this booking? This will immediately notify the
                provider and release your slots. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={cancelMutation.isPending}
                >
                  No, Keep booking
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? "Cancelling…" : "Yes, Cancel Booking"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal Dialog */}
        {showReceiptModal && paymentReceiptDetails && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl my-8">
              <PaymentReceipt
                payment={paymentReceiptDetails}
                onClose={() => setShowReceiptModal(false)}
                showActions={true}
              />
            </div>
          </div>
        )}

        {/* Review Form Modal Dialog */}
        {showReviewDialog && service && (
          <ReviewFormDialog
            bookingId={bookingId}
            serviceId={service.id}
            serviceTitle={service.title}
            existingReview={reviewData ?? null}
            isOpen={showReviewDialog}
            onClose={() => setShowReviewDialog(false)}
          />
        )}

        {/* Chat Dialog with Host */}
        {showChatModal && service?.providers?.user_id && (
          <ChatDialog
            open={showChatModal}
            onOpenChange={setShowChatModal}
            partnerId={service.providers.user_id}
            partnerName={providerName(service)}
            bookingId={booking.id}
            serviceTitle={service.title}
          />
        )}
      </div>
    </PageShell>
  );
}
