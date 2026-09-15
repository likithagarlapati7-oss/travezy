import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  FileCheck,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminTable, Td } from "@/components/AdminTable";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminWithdrawals, updateAdminWithdrawalStatus } from "@/lib/wallet.functions";
import { formatPrice } from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  head: () => ({
    meta: [
      { title: "Withdrawals Governance — Travezy Admin" },
      { name: "description", content: "Review and approve provider payout requests." },
    ],
  }),
  component: AdminWithdrawalsPage,
});

const PAGE_SIZE = 10;

function AdminWithdrawalsPage() {
  const queryClient = useQueryClient();
  const getWithdrawalsFn = useServerFn(getAdminWithdrawals);
  const updateStatusFn = useServerFn(updateAdminWithdrawalStatus);

  const {
    data: withdrawals,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      return await getWithdrawalsFn();
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [inspectingWithdrawal, setInspectingWithdrawal] = useState<any | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    withdrawal: any;
    action: "mark_processing" | "approve_completed" | "reject_failed";
  } | null>(null);

  const [payoutReference, setPayoutReference] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!actionDialog) return;
      return await updateStatusFn({
        data: {
          withdrawal_id: actionDialog.withdrawal.id,
          action: actionDialog.action,
          payout_reference: payoutReference || undefined,
          admin_note: adminNote || undefined,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(res?.message || "Withdrawal updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      setActionDialog(null);
      setPayoutReference("");
      setAdminNote("");
      if (inspectingWithdrawal) {
        setInspectingWithdrawal(null);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update withdrawal status.");
    },
  });

  const filteredWithdrawals = useMemo(() => {
    if (!withdrawals) return [];
    return withdrawals.filter((w: any) => {
      const s = (w.withdrawal_status || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "pending") matchesStatus = s === "pending";
      else if (statusFilter === "processing") matchesStatus = s === "processing";
      else if (statusFilter === "completed") matchesStatus = s === "completed";
      else if (statusFilter === "failed") matchesStatus = s === "failed" || s === "cancelled";

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.id.toLowerCase().includes(q) ||
        (w.providers?.business_name && w.providers.business_name.toLowerCase().includes(q)) ||
        (w.provider_profile?.full_name && w.provider_profile.full_name.toLowerCase().includes(q)) ||
        (w.provider_profile?.email && w.provider_profile.email.toLowerCase().includes(q)) ||
        (w.payout_reference && w.payout_reference.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [withdrawals, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredWithdrawals.length / PAGE_SIZE));
  const paginatedWithdrawals = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredWithdrawals.slice(start, start + PAGE_SIZE);
  }, [filteredWithdrawals, page]);

  const counts = useMemo(() => {
    if (!withdrawals) return { all: 0, pending: 0, processing: 0, completed: 0, failed: 0 };
    return {
      all: withdrawals.length,
      pending: withdrawals.filter((w: any) => (w.withdrawal_status || "").toLowerCase() === "pending").length,
      processing: withdrawals.filter((w: any) => (w.withdrawal_status || "").toLowerCase() === "processing").length,
      completed: withdrawals.filter((w: any) => (w.withdrawal_status || "").toLowerCase() === "completed").length,
      failed: withdrawals.filter((w: any) => {
        const s = (w.withdrawal_status || "").toLowerCase();
        return s === "failed" || s === "cancelled";
      }).length,
    };
  }, [withdrawals]);

  const totalPayoutVolume = useMemo(() => {
    if (!withdrawals) return 0;
    return withdrawals
      .filter((w: any) => (w.withdrawal_status || "").toLowerCase() === "completed")
      .reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);
  }, [withdrawals]);

  const pendingPayoutVolume = useMemo(() => {
    if (!withdrawals) return 0;
    return withdrawals
      .filter((w: any) => {
        const s = (w.withdrawal_status || "").toLowerCase();
        return s === "pending" || s === "processing";
      })
      .reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);
  }, [withdrawals]);

  return (
    <PageShell
      eyebrow="Financial Governance"
      title="Provider Payouts & Withdrawals"
      subtitle="Audit host payout requests, verify bank accounts/UPI identifiers, and disburse merchant balances."
    >
      <div className="space-y-8">
        {/* KPI Strip */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Total Disbursed Volume
            </span>
            <p className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
              {formatPrice(totalPayoutVolume)}
            </p>
            <span className="text-xs text-muted-foreground">
              {counts.completed} completed payouts
            </span>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Pending Payout Queue
            </span>
            <p className="text-2xl font-bold font-display text-amber-600 dark:text-amber-400">
              {formatPrice(pendingPayoutVolume)}
            </p>
            <span className="text-xs text-muted-foreground">
              {counts.pending + counts.processing} requests awaiting settlement
            </span>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Pending Requests
            </span>
            <p className="text-2xl font-bold font-display text-foreground">
              {counts.pending}
            </p>
            <span className="text-xs text-muted-foreground">Needs review & processing</span>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Processing / In Transit
            </span>
            <p className="text-2xl font-bold font-display text-primary">
              {counts.processing}
            </p>
            <span className="text-xs text-muted-foreground">Currently at banking gateway</span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={statusFilter === "all" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setStatusFilter("all");
                setPage(1);
              }}
            >
              All ({counts.all})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "pending" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setStatusFilter("pending");
                setPage(1);
              }}
            >
              Pending ({counts.pending})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "processing" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setStatusFilter("processing");
                setPage(1);
              }}
            >
              Processing ({counts.processing})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "completed" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setStatusFilter("completed");
                setPage(1);
              }}
            >
              Completed ({counts.completed})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "failed" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setStatusFilter("failed");
                setPage(1);
              }}
            >
              Failed ({counts.failed})
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search provider, ID, reference…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-9 shrink-0"
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Withdrawals Table */}
        <AdminTable
          headers={["Provider", "Amount", "Method", "Requested Date", "Status", "Actions"]}
          isLoading={isLoading}
          empty="No payout withdrawal requests found."
          rows={paginatedWithdrawals.map((w: any) => {
            const status = (w.withdrawal_status || "PENDING").toUpperCase();
            const providerName = w.provider_profile?.full_name || w.providers?.business_name || "Provider";

            return (
              <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                <Td>
                  <div>
                    <span className="font-semibold text-foreground block">{providerName}</span>
                    <span className="text-xs text-muted-foreground block font-mono">
                      {w.provider_profile?.email || `ID: ${w.provider_id.slice(0, 8)}`}
                    </span>
                  </div>
                </Td>
                <Td>
                  <span className="font-display font-bold text-foreground">
                    {formatPrice(Number(w.amount))}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5 text-xs text-foreground">
                    {w.withdrawal_method === "bank_transfer" ? (
                      <>
                        <Building2 className="size-4 text-muted-foreground" /> Bank Transfer
                      </>
                    ) : (
                      <>
                        <Smartphone className="size-4 text-muted-foreground" /> UPI
                      </>
                    )}
                  </div>
                </Td>
                <Td>
                  <span className="text-xs text-muted-foreground">
                    {new Date(w.requested_at || w.created_at).toLocaleDateString()}
                  </span>
                </Td>
                <Td>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      status === "COMPLETED"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-500/20"
                        : status === "PROCESSING"
                        ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-500/20"
                        : status === "PENDING"
                        ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-500/20"
                        : "bg-red-50 dark:bg-red-950/30 text-red-600 border-red-500/20"
                    }`}
                  >
                    {status === "COMPLETED" && <CheckCircle2 className="size-3" />}
                    {status === "PROCESSING" && <Clock className="size-3" />}
                    {status === "PENDING" && <Clock className="size-3" />}
                    {status === "FAILED" && <XCircle className="size-3" />}
                    {status}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInspectingWithdrawal(w)}
                      className="h-8 gap-1 text-xs"
                    >
                      <Eye className="size-3.5" /> Inspect
                    </Button>

                    {status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setActionDialog({
                            withdrawal: w,
                            action: "mark_processing",
                          })
                        }
                        className="h-8 text-xs text-blue-600 border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      >
                        Process
                      </Button>
                    )}

                    {(status === "PENDING" || status === "PROCESSING") && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setActionDialog({
                              withdrawal: w,
                              action: "approve_completed",
                            })
                          }
                          className="h-8 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          Disburse
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActionDialog({
                              withdrawal: w,
                              action: "reject_failed",
                            })
                          }
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Inspection Modal */}
        {inspectingWithdrawal && (
          <Dialog open={!!inspectingWithdrawal} onOpenChange={() => setInspectingWithdrawal(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="size-5 text-primary" /> Payout Request Details
                </DialogTitle>
                <DialogDescription>
                  Audit account and recipient information for withdrawal #{inspectingWithdrawal.id.slice(0, 8)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-sm">
                <div className="rounded-2xl bg-muted/40 p-4 border border-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider:</span>
                    <strong className="text-foreground">
                      {inspectingWithdrawal.provider_profile?.full_name || inspectingWithdrawal.providers?.business_name}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <strong className="text-lg text-primary font-display">
                      {formatPrice(Number(inspectingWithdrawal.amount))}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method:</span>
                    <span className="uppercase font-semibold text-foreground">
                      {inspectingWithdrawal.withdrawal_method.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-bold text-foreground">
                      {inspectingWithdrawal.withdrawal_status}
                    </span>
                  </div>
                </div>

                {/* Payout Credentials */}
                <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Recipient Payout Destination
                  </span>
                  {inspectingWithdrawal.withdrawal_method === "bank_transfer" ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Holder Name:</span>
                        <span className="font-medium text-foreground">
                          {inspectingWithdrawal.payout_details?.account_holder || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank Name:</span>
                        <span className="font-medium text-foreground">
                          {inspectingWithdrawal.payout_details?.bank_name || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IFSC Code:</span>
                        <span className="font-mono text-foreground font-semibold">
                          {inspectingWithdrawal.payout_details?.ifsc_code || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account:</span>
                        <span className="font-mono text-foreground font-semibold">
                          {inspectingWithdrawal.payout_details?.account_number_masked || "•••• •••• ****"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">UPI ID:</span>
                      <span className="font-mono text-foreground font-semibold">
                        {inspectingWithdrawal.payout_details?.upi_id || "—"}
                      </span>
                    </div>
                  )}
                </div>

                {inspectingWithdrawal.payout_reference && (
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 p-3 text-xs">
                    <span className="text-muted-foreground block">Settlement UTR / Gateway Ref:</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {inspectingWithdrawal.payout_reference}
                    </span>
                  </div>
                )}

                {inspectingWithdrawal.admin_note && (
                  <div className="rounded-2xl bg-muted/40 p-3 text-xs">
                    <span className="text-muted-foreground block font-semibold mb-0.5">Admin Note:</span>
                    <p className="text-foreground">{inspectingWithdrawal.admin_note}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Action Dialog (Process / Approve / Reject) */}
        {actionDialog && (
          <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {actionDialog.action === "mark_processing" && "Mark Withdrawal as Processing"}
                  {actionDialog.action === "approve_completed" && "Disburse & Complete Payout"}
                  {actionDialog.action === "reject_failed" && "Reject Payout Request"}
                </DialogTitle>
                <DialogDescription>
                  {actionDialog.action === "mark_processing" &&
                    "Move withdrawal to processing state while interacting with the banking gateway."}
                  {actionDialog.action === "approve_completed" &&
                    "Confirm that payout funds have been successfully transferred to the merchant's account."}
                  {actionDialog.action === "reject_failed" &&
                    "Rejecting will automatically return the full withdrawal amount back to the host's available balance."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="rounded-2xl bg-muted/30 p-3 border border-border text-xs flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <strong className="text-foreground font-bold">
                    {formatPrice(Number(actionDialog.withdrawal.amount))}
                  </strong>
                </div>

                {actionDialog.action === "approve_completed" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Payout Gateway Reference / UTR Number
                    </label>
                    <Input
                      placeholder="e.g. UTR_BANK_982347102934"
                      value={payoutReference}
                      onChange={(e) => setPayoutReference(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Admin Note / Message to Provider (Optional)
                  </label>
                  <Textarea
                    placeholder="Enter audit note or reason for status update…"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <Button variant="ghost" onClick={() => setActionDialog(null)} disabled={updateStatusMutation.isPending}>
                    Cancel
                  </Button>
                  <Button
                    variant={actionDialog.action === "reject_failed" ? "destructive" : "hero"}
                    onClick={() => updateStatusMutation.mutate()}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-1.5" /> Updating…
                      </>
                    ) : actionDialog.action === "mark_processing" ? (
                      "Set to Processing"
                    ) : actionDialog.action === "approve_completed" ? (
                      "Confirm Payout Disbursement"
                    ) : (
                      "Reject & Refund Balance"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PageShell>
  );
}
