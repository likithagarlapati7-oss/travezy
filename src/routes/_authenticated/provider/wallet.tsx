import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  DollarSign,
  HelpCircle,
  History,
  Info,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import { getProviderWallet, requestWithdrawal } from "@/lib/wallet.functions";
import { formatPrice } from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/provider/wallet")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Provider Wallet & Earnings — Travezy" },
      { name: "description", content: "Manage payout withdrawals, earnings ledger, and wallet balance." },
    ],
  }),
  component: ProviderWalletPage,
});

type WithdrawalMethod = "bank_transfer" | "upi";
type FilterType = "all" | "earnings" | "platform_fees" | "withdrawals" | "refunds" | "completed" | "pending";

function ProviderWalletPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getWalletFn = useServerFn(getProviderWallet);
  const requestWithdrawalFn = useServerFn(requestWithdrawal);

  const {
    data: wallet,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["provider-wallet", user?.id],
    queryFn: async () => {
      return await getWalletFn();
    },
    enabled: !!user?.id,
  });

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  // Withdrawal Form State
  const [method, setMethod] = useState<WithdrawalMethod>("bank_transfer");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");
  const [confirmStep, setConfirmStep] = useState(false);

  const parsedAmount = Number(withdrawAmount) || 0;
  const availableBalance = wallet?.available_balance || 0;
  const remainingBalance = Math.max(0, availableBalance - parsedAmount);
  const isAmountValid = parsedAmount > 0 && parsedAmount <= availableBalance;

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      return await requestWithdrawalFn({
        data: {
          amount: parsedAmount,
          withdrawal_method: method,
          bank_details:
            method === "bank_transfer"
              ? {
                  account_holder: accountHolder,
                  bank_name: bankName,
                  account_number: accountNumber,
                  ifsc_code: ifscCode,
                }
              : undefined,
          upi_details:
            method === "upi"
              ? {
                  upi_id: upiId,
                }
              : undefined,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(res.message || "Withdrawal request submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["provider-wallet"] });
      setShowWithdrawModal(false);
      setConfirmStep(false);
      setWithdrawAmount("");
      setAccountHolder("");
      setBankName("");
      setAccountNumber("");
      setIfscCode("");
      setUpiId("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit withdrawal request.");
    },
  });

  // Combine payments, commission fees, refunds, and withdrawals into a unified transaction stream
  const transactions = useMemo(() => {
    if (!wallet) return [];
    const txList: any[] = [];

    // Earnings from bookings
    for (const b of wallet.bookings || []) {
      const bPayments = (b.payments || []).filter(
        (p: any) =>
          (p.status || "").toUpperCase() === "SUCCESS" ||
          (p.status || "").toUpperCase() === "PAID"
      );
      const isPaid = bPayments.length > 0;
      const bStatus = (b.status || "").toLowerCase();
      const bAmount = Number(b.total_price || 0);

      if (bStatus === "cancelled" || bStatus === "rejected") {
        if (isPaid) {
          txList.push({
            id: `ref_${b.id}`,
            type: "REFUND",
            title: `Refund · Trip #${b.id.slice(0, 8)}`,
            subtitle: `Trip cancelled. Amount returned to guest.`,
            amount: bAmount,
            status: "REFUNDED",
            date: b.created_at,
            isCredit: false,
          });
        }
      } else {
        txList.push({
          id: b.id,
          type: "EARNING",
          title: `Booking #${b.id.slice(0, 8)}`,
          subtitle: `Date: ${b.travel_date} · Status: ${b.status}`,
          amount: bAmount,
          status: bStatus === "completed" && isPaid ? "COMPLETED" : isPaid ? "PENDING" : "UNPAID",
          date: b.created_at,
          isCredit: true,
        });

        if (bStatus === "completed" && isPaid) {
          // 10% Platform fee item
          const fee = Math.round(bAmount * 0.10);
          txList.push({
            id: `fee_${b.id}`,
            type: "PLATFORM_FEE",
            title: `Platform Commission (10%)`,
            subtitle: `Service fee for Trip #${b.id.slice(0, 8)}`,
            amount: fee,
            status: "DEDUCTED",
            date: b.created_at,
            isCredit: false,
          });
        }
      }
    }

    // Withdrawals
    for (const w of wallet.withdrawals || []) {
      txList.push({
        id: w.id,
        type: "WITHDRAWAL",
        title: `Withdrawal via ${w.withdrawal_method === "bank_transfer" ? "Bank" : "UPI"}`,
        subtitle: `Ref: ${w.payout_reference || w.id.slice(0, 8)}${w.admin_note ? ` · Note: ${w.admin_note}` : ""}`,
        amount: Number(w.amount),
        status: (w.withdrawal_status || "PENDING").toUpperCase(),
        date: w.created_at,
        isCredit: false,
      });
    }

    // Sort descending by date
    return txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [wallet]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filter === "all") return true;
      if (filter === "earnings") return t.type === "EARNING";
      if (filter === "platform_fees") return t.type === "PLATFORM_FEE";
      if (filter === "withdrawals") return t.type === "WITHDRAWAL";
      if (filter === "refunds") return t.type === "REFUND";
      if (filter === "completed") return t.status === "COMPLETED" || t.status === "PAID";
      if (filter === "pending") return t.status === "PENDING" || t.status === "PROCESSING";
      return true;
    });
  }, [transactions, filter]);

  if (isLoading) {
    return (
      <PageShell title="Loading wallet & earnings…">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  const grossBookingValue = wallet?.gross_booking_value ?? 0;
  const paidEarnings = wallet?.paid_earnings ?? 0;
  const pendingEarnings = wallet?.pending_earnings ?? 0;
  const netEarnings = wallet?.net_earnings ?? wallet?.total_earned ?? 0;
  const platformFee = wallet?.platform_fee ?? 0;
  const totalWithdrawn = wallet?.total_withdrawn ?? 0;
  const refundedAmount = wallet?.refunded_amount ?? 0;

  return (
    <PageShell
      eyebrow="Provider Financials"
      title="Wallet, Earnings & Withdrawals"
      subtitle="Track verified customer payments, monitor available payout balances, review platform commission deductions, and request direct bank/UPI withdrawals."
    >
      <div className="space-y-8 max-w-6xl">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/provider/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Back to dashboard
          </Link>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh Ledger
            </Button>
            <Button
              variant="hero"
              size="sm"
              onClick={() => setShowWithdrawModal(true)}
              className="flex items-center gap-1.5 shadow-float"
            >
              <Wallet className="size-4" /> Withdraw Money
            </Button>
          </div>
        </div>

        {/* 8-Metric Primary Financial KPI Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Available to Withdraw */}
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-card space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Available to Withdraw
              </span>
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <Wallet className="size-4.5" />
              </div>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {formatPrice(availableBalance)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" /> Settled from completed trips
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWithdrawModal(true)}
              disabled={availableBalance <= 0}
              className="w-full mt-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 h-8 text-xs font-semibold"
            >
              Withdraw Funds →
            </Button>
          </div>

          {/* Net Realized Earnings */}
          <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-5 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Net Realized Earnings
              </span>
              <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                <TrendingUp className="size-4.5" />
              </div>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {formatPrice(netEarnings)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Gross realized minus 10% platform fee
              </p>
            </div>
          </div>

          {/* Gross Booking Value */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Gross Booking Value (GBV)
              </span>
              <div className="rounded-xl bg-muted p-2 text-foreground">
                <DollarSign className="size-4.5" />
              </div>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {formatPrice(grossBookingValue)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Total sum of all booking invoices
              </p>
            </div>
          </div>

          {/* Paid Earnings */}
          <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-5 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Gross Paid Earnings
              </span>
              <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                <CreditCard className="size-4.5" />
              </div>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {formatPrice(paidEarnings)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                All verified guest transactions
              </p>
            </div>
          </div>

          {/* Pending Money / Escrow */}
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Pending Money (Escrow)
              </span>
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <Clock className="size-4.5" />
              </div>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {formatPrice(pendingEarnings)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Held safely for upcoming trips
              </p>
            </div>
          </div>

          {/* Platform Fees */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Platform Fees (10%)
              </span>
              <div className="rounded-xl bg-muted p-2 text-muted-foreground">
                <ShieldCheck className="size-4.5" />
              </div>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {formatPrice(platformFee)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Travezy hosting & payment protection
              </p>
            </div>
          </div>

          {/* Total Withdrawn */}
          <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-5 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Total Withdrawn
              </span>
              <div className="rounded-xl bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
                <Building2 className="size-4.5" />
              </div>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {formatPrice(totalWithdrawn)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Disbursed to your Bank/UPI accounts
              </p>
            </div>
          </div>

          {/* Refunded Amount */}
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                Refunded / Voided
              </span>
              <div className="rounded-xl bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
                <XCircle className="size-4.5" />
              </div>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {formatPrice(refundedAmount)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cancelled trips returned to travelers
              </p>
            </div>
          </div>
        </div>

        {/* Clear Distinction Educational Explainer */}
        <div className="rounded-3xl border border-border bg-muted/20 p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Info className="size-4 text-primary" />
            <span>Understanding Your Financial Metrics at Travezy</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <div className="rounded-2xl border border-border/60 bg-card p-3.5 space-y-1">
              <strong className="text-foreground block font-semibold">1. Gross Booking Value vs Net Earnings</strong>
              <p className="text-muted-foreground">
                <strong>Gross Booking Value</strong> is the full face value paid by the guest. <strong>Net Earnings</strong> is your realized income after the standard 10% Travezy platform fee is deducted upon trip completion.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-3.5 space-y-1">
              <strong className="text-foreground block font-semibold">2. Pending Money (Escrow)</strong>
              <p className="text-muted-foreground">
                Customer payments for upcoming trips are held in safe escrow in your <strong>Pending Balance</strong> until the guest completes their stay or tour.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-3.5 space-y-1 sm:col-span-2 lg:col-span-1">
              <strong className="text-foreground block font-semibold">3. Available Balance vs Withdrawn</strong>
              <p className="text-muted-foreground">
                <strong>Available Balance</strong> can be transferred immediately. Once you submit a payout request, it is logged under <strong>Withdrawn Money</strong> upon disbursement.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History & Withdrawals Ledger */}
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-card space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                <History className="size-5 text-primary" /> Financial Transaction History
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit booking earnings, platform commissions, refunds, and payout disbursements.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border">
              {(
                [
                  { id: "all", label: "All Activity" },
                  { id: "earnings", label: "Earnings" },
                  { id: "platform_fees", label: "Platform Fees" },
                  { id: "withdrawals", label: "Withdrawals" },
                  { id: "refunds", label: "Refunds" },
                  { id: "completed", label: "Completed" },
                  { id: "pending", label: "Pending" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl transition-colors ${
                    filter === tab.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          {filteredTransactions.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredTransactions.map((tx) => {
                const isCredit = tx.isCredit;
                const status = (tx.status || "").toUpperCase();

                return (
                  <div
                    key={`${tx.type}_${tx.id}`}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`rounded-2xl p-2.5 shrink-0 ${
                          isCredit
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="size-5" />
                        ) : (
                          <ArrowUpRight className="size-5" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground">{tx.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              status === "COMPLETED" || status === "PAID"
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-500/20"
                                : status === "PENDING" || status === "PROCESSING"
                                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-500/20"
                                : "bg-red-50 dark:bg-red-950/30 text-red-600 border-red-500/20"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{tx.subtitle}</p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right flex sm:flex-col justify-between items-center sm:items-end">
                      <span
                        className={`font-display font-bold text-base ${
                          isCredit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
                        {formatPrice(tx.amount)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
              No financial records found matching the selected filter.
            </div>
          )}
        </div>

        {/* Withdrawal Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="max-w-lg w-full rounded-3xl border border-border bg-card p-6 md:p-8 shadow-float space-y-6">
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                    <Wallet className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold">Withdraw Funds</h3>
                    <p className="text-xs text-muted-foreground">
                      Transfer earnings to your Bank Account or UPI
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setConfirmStep(false);
                  }}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="size-5" />
                </button>
              </div>

              {!confirmStep ? (
                /* Step 1: Form */
                <div className="space-y-5">
                  {/* Balance Summary Card */}
                  <div className="rounded-2xl bg-muted/30 p-4 border border-border flex justify-between items-center">
                    <div>
                      <span className="text-xs text-muted-foreground block">Available for Withdrawal</span>
                      <span className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
                        {formatPrice(availableBalance)}
                      </span>
                    </div>
                    <span className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-full">
                      Ready for Payout
                    </span>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Withdrawal Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                        ₹
                      </span>
                      <Input
                        type="number"
                        placeholder="Enter amount to withdraw"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="pl-8 text-lg font-semibold"
                        min={1}
                        max={availableBalance}
                      />
                    </div>
                    {parsedAmount > availableBalance && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5" /> Amount exceeds your available balance of {formatPrice(availableBalance)}
                      </p>
                    )}
                  </div>

                  {/* Method Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Select Withdrawal Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMethod("bank_transfer")}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                          method === "bank_transfer"
                            ? "border-primary bg-primary/5 ring-1 ring-primary text-primary"
                            : "border-border hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        <Building2 className="size-5" />
                        <div>
                          <span className="text-xs font-bold block">Bank Account</span>
                          <span className="text-[10px] text-muted-foreground block">Direct NEFT/IMPS</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMethod("upi")}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                          method === "upi"
                            ? "border-primary bg-primary/5 ring-1 ring-primary text-primary"
                            : "border-border hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        <Smartphone className="size-5" />
                        <div>
                          <span className="text-xs font-bold block">UPI ID</span>
                          <span className="text-[10px] text-muted-foreground block">Instant VPA Transfer</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Method Specific Fields */}
                  {method === "bank_transfer" ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          Account Holder Full Name
                        </label>
                        <Input
                          placeholder="e.g. John Doe"
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Bank Name
                          </label>
                          <Input
                            placeholder="e.g. HDFC Bank"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            IFSC Code
                          </label>
                          <Input
                            placeholder="e.g. HDFC0001234"
                            value={ifscCode}
                            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          Bank Account Number
                        </label>
                        <Input
                          type="password"
                          placeholder="Enter account number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-medium text-muted-foreground block">
                        Virtual Payment Address (UPI ID)
                      </label>
                      <Input
                        placeholder="e.g. provider@okhdfcbank"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Ensure this UPI ID is active and linked to your bank account.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="ghost" onClick={() => setShowWithdrawModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="hero"
                      disabled={
                        !isAmountValid ||
                        (method === "bank_transfer" &&
                          (!accountHolder || !bankName || !accountNumber || !ifscCode)) ||
                        (method === "upi" && !upiId)
                      }
                      onClick={() => setConfirmStep(true)}
                    >
                      Review & Confirm →
                    </Button>
                  </div>
                </div>
              ) : (
                /* Step 2: Confirmation Summary */
                <div className="space-y-5">
                  <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Withdrawal Amount:</span>
                      <strong className="font-bold text-lg text-foreground">{formatPrice(parsedAmount)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method:</span>
                      <span className="font-semibold text-foreground uppercase">{method.replace("_", " ")}</span>
                    </div>
                    {method === "bank_transfer" ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account Holder:</span>
                          <span>{accountHolder}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bank & IFSC:</span>
                          <span>{bankName} · {ifscCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account:</span>
                          <span className="font-mono">•••• {accountNumber.slice(-4)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">UPI ID:</span>
                        <span className="font-mono">{upiId}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex justify-between text-xs text-muted-foreground">
                      <span>Remaining Balance After Payout:</span>
                      <span className="font-semibold text-foreground">{formatPrice(remainingBalance)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By confirming, you authorize Travezy finance administration to disburse <strong className="text-foreground">{formatPrice(parsedAmount)}</strong> to the specified account. Your available balance will be updated immediately.
                  </p>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={() => setConfirmStep(false)} disabled={withdrawMutation.isPending}>
                      Back to Edit
                    </Button>
                    <Button
                      variant="hero"
                      onClick={() => withdrawMutation.mutate()}
                      disabled={withdrawMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {withdrawMutation.isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-1.5" /> Submitting Request…
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="size-4 mr-1.5" /> Submit Withdrawal Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
