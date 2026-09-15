import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  IndianRupee,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  confirmHotelCashPayment,
  getVerifierFinancials,
  getVerifierReservations,
} from "@/lib/hotels.functions";
import type { HotelReservationRecord } from "@/lib/hotels.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verifier/payments")({
  head: () => ({
    meta: [
      { title: "Hotel Revenue & Payments — Travezy Verifier" },
      {
        name: "description",
        content: "Track hotel earnings, verified online payments, pending cash at check-in, and transaction history.",
      },
    ],
  }),
  component: VerifierPaymentsPage,
});

function VerifierPaymentsPage() {
  const qc = useQueryClient();
  const getFinancialsFn = useServerFn(getVerifierFinancials);
  const getReservationsFn = useServerFn(getVerifierReservations);
  const confirmCashFn = useServerFn(confirmHotelCashPayment);

  const [cashModal, setCashModal] = useState<{
    open: boolean;
    reservation: HotelReservationRecord | null;
  }>({ open: false, reservation: null });

  const [receivedAmount, setReceivedAmount] = useState<number>(0);

  const { data: financials, isLoading: financialsLoading } = useQuery({
    queryKey: ["verifier", "financials"],
    queryFn: () => getFinancialsFn(),
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ["verifier", "reservations"],
    queryFn: () => getReservationsFn({ data: {} }),
  });

  const confirmCashMutation = useMutation({
    mutationFn: async ({
      reservation_id,
      amount_received,
    }: {
      reservation_id: string;
      amount_received?: number;
    }) => {
      return await confirmCashFn({
        data: { reservation_id, amount_received },
      });
    },
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ["verifier"] });
      setCashModal({ open: false, reservation: null });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to confirm cash payment");
    },
  });

  const pendingCashReservations = reservations.filter(
    (r) =>
      r.payment_method === "cash" &&
      r.payment_status === "PENDING" &&
      r.booking_status !== "CANCELLED" &&
      r.booking_status !== "REJECTED",
  );

  const isLoading = financialsLoading || reservationsLoading;

  return (
    <PageShell
      eyebrow="Financial Operations"
      title="Hotel Revenue & Settlement"
      subtitle="Track verified online reservation payments, verify front-desk cash collections, and monitor lifetime property booking volume."
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Monthly Revenue
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CreditCard className="size-4" />
            </span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            ₹{(financials?.monthly_revenue || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Verified online & collected stay payments</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Pending Front-Desk Cash
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="size-4" />
            </span>
          </div>
          <p className="font-display text-2xl font-bold text-amber-600">
            ₹{(financials?.pending_cash_amount || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{pendingCashReservations.length} Pending collections</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Total Booking Value
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
              <Wallet className="size-4" />
            </span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            ₹{(financials?.total_booking_value || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Gross reservation volume</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Refunds / Cancellations
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-rose-500/10 text-rose-600">
              <RefreshCw className="size-4" />
            </span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            ₹{(financials?.refunded_amount || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Returned guest reservations</p>
        </div>
      </div>

      {/* ── Pending Cash Collection Desk ── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <IndianRupee className="size-4" />
            </span>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Pending Front-Desk Cash Receipts</h2>
              <p className="text-xs text-muted-foreground">
                Reservations selected by tourists as "Pay Cash at Hotel" requiring verification upon collection.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
            {pendingCashReservations.length} Pending Collections
          </span>
        </div>

        {pendingCashReservations.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
            <CheckCircle2 className="mx-auto size-8 text-emerald-500/50 mb-2" />
            <p className="text-sm font-semibold text-foreground">No pending cash collections</p>
            <p className="text-xs text-muted-foreground mt-1">
              All cash transactions have been confirmed or paid online.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Reservation</th>
                  <th className="p-3.5">Guest</th>
                  <th className="p-3.5">Hotel & Room</th>
                  <th className="p-3.5">Stay Dates</th>
                  <th className="p-3.5">Amount Due</th>
                  <th className="p-3.5 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pendingCashReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                      #{res.id.slice(0, 8)}
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      <p className="font-semibold">{res.guest_name}</p>
                      <p className="text-[11px] text-muted-foreground">{res.guest_phone}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-foreground">{res.hotel?.name}</p>
                      <p className="text-[11px] text-primary">{res.room?.room_type}</p>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {res.check_in} → {res.check_out}
                    </td>
                    <td className="p-3.5 font-bold text-amber-600 text-sm">
                      ₹{res.total_price.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="hero"
                        size="sm"
                        className="h-8 rounded-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => {
                          setReceivedAmount(res.total_price);
                          setCashModal({ open: true, reservation: res });
                        }}
                      >
                        <CheckCircle2 className="size-3.5 mr-1" /> Confirm Cash Received
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Transactions Ledger ── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-semibold text-lg text-foreground">Transaction & Payment Ledger</h2>
            <p className="text-xs text-muted-foreground">Complete historical record of payments, online payouts, and cash settlements.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 rounded-l-xl">Ref ID</th>
                <th className="p-3.5">Guest & Hotel</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Payment Status</th>
                <th className="p-3.5 text-right rounded-r-xl">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {(financials?.recent_transactions || []).map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-mono text-[11px] text-muted-foreground">{tx.id}</td>
                  <td className="p-3.5 font-medium text-foreground">
                    <p className="font-semibold">{tx.guest_name}</p>
                    <p className="text-[11px] text-muted-foreground">{tx.hotel_name}</p>
                  </td>
                  <td className="p-3.5 uppercase font-medium text-[11px] text-muted-foreground">
                    {tx.payment_method}
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                        tx.payment_status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : tx.payment_status === "PENDING"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-rose-500/10 text-rose-600",
                      )}
                    >
                      {tx.payment_status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-foreground">
                    ₹{tx.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Cash Confirmation Modal ── */}
      <Dialog
        open={cashModal.open}
        onOpenChange={(open) => setCashModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-semibold flex items-center gap-2">
              <IndianRupee className="size-5 text-emerald-600" /> Confirm Physical Cash Collection
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirming receipt of cash from <strong>{cashModal.reservation?.guest_name}</strong> for reservation #{cashModal.reservation?.id.slice(0, 8)}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Amount Received in Cash (₹ INR) *</label>
              <Input
                type="number"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(Number(e.target.value))}
                className="rounded-xl text-xs"
              />
            </div>
            <div className="p-3 rounded-xl bg-muted/40 space-y-1 text-muted-foreground">
              <p>Once confirmed, the reservation payment status will be marked as <strong>PAID</strong>.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setCashModal({ open: false, reservation: null })}
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={confirmCashMutation.isPending || receivedAmount <= 0}
              onClick={() => {
                if (cashModal.reservation) {
                  confirmCashMutation.mutate({
                    reservation_id: cashModal.reservation.id,
                    amount_received: receivedAmount,
                  });
                }
              }}
            >
              {confirmCashMutation.isPending ? "Confirming..." : "Confirm & Mark as PAID"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
