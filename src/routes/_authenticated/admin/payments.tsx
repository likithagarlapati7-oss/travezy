import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Eye,
  FileCheck,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { AdminTable, Td } from "@/components/AdminTable";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminPaymentsQuery, type AdminPayment } from "@/lib/admin";
import { formatPrice } from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payment Ledger — Travezy Admin" },
      { name: "description", content: "Audit marketplace transactions, payment gateway settlements, and order receipts." },
      { property: "og:title", content: "Payment Ledger — Travezy Admin" },
      { property: "og:description", content: "Audit Travezy marketplace payment transactions." },
    ],
  }),
  component: AdminPayments,
});

const PAGE_SIZE = 10;

function AdminPayments() {
  const { data: payments, isLoading, error } = useQuery(adminPaymentsQuery);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [inspectingPayment, setInspectingPayment] = useState<AdminPayment | null>(null);

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    return payments.filter((p) => {
      const s = (p.status || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "success") matchesStatus = s === "success" || s === "paid";
      else if (statusFilter === "pending") matchesStatus = s === "pending";
      else if (statusFilter === "failed") matchesStatus = s === "failed";

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.id.toLowerCase().includes(q) ||
        (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes(q)) ||
        (p.razorpay_order_id && p.razorpay_order_id.toLowerCase().includes(q)) ||
        (p.booking_id && p.booking_id.toLowerCase().includes(q)) ||
        (p.user?.full_name && p.user.full_name.toLowerCase().includes(q)) ||
        (p.user?.email && p.user.email.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [payments, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPayments.slice(start, start + PAGE_SIZE);
  }, [filteredPayments, page]);

  const counts = useMemo(() => {
    if (!payments) return { all: 0, success: 0, pending: 0, failed: 0 };
    return {
      all: payments.length,
      success: payments.filter((p) => {
        const s = (p.status || "").toLowerCase();
        return s === "success" || s === "paid";
      }).length,
      pending: payments.filter((p) => (p.status || "").toLowerCase() === "pending").length,
      failed: payments.filter((p) => (p.status || "").toLowerCase() === "failed").length,
    };
  }, [payments]);

  return (
    <PageShell
      eyebrow="Financial Governance"
      title="Transaction Ledger"
      subtitle="Audit marketplace payments, verify gateway reconciliation, and inspect customer receipts."
    >
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
            All Transactions ({counts.all})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "success" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setStatusFilter("success");
              setPage(1);
            }}
          >
            Successful ({counts.success})
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

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search payment ID, booking, user..."
            className="rounded-full pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="mt-6">
        <AdminTable
          headers={["Transaction ID", "Customer", "Service", "Amount", "Method", "Status", "Date", "Actions"]}
          isLoading={isLoading}
          error={error}
          empty={
            searchQuery || statusFilter !== "all"
              ? "No transactions match your search filter."
              : "No payment transactions recorded yet."
          }
          rows={paginatedPayments.map((p) => {
            const isSuccess = (p.status || "").toLowerCase() === "success" || (p.status || "").toLowerCase() === "paid";
            return (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <Td>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {p.razorpay_payment_id || p.id.slice(0, 8)}
                  </code>
                </Td>
                <Td>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground">{p.user?.full_name || "Customer"}</p>
                    <p className="text-xs text-muted-foreground">{p.user?.email || "—"}</p>
                  </div>
                </Td>
                <Td>
                  <span className="text-xs font-medium text-foreground">
                    {p.booking?.services?.title ?? "Marketplace Booking"}
                  </span>
                </Td>
                <Td>
                  <span className="font-display font-semibold text-sm text-foreground">
                    {formatPrice(Number(p.amount), p.currency || "INR")}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {p.payment_method || p.method || "Online"}
                  </span>
                </Td>
                <Td>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                      isSuccess
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : (p.status || "").toLowerCase() === "pending"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isSuccess ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                    {p.status}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </Td>
                <Td>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    onClick={() => setInspectingPayment(p)}
                  >
                    <Eye className="size-3.5" />
                    Audit
                  </Button>
                </Td>
              </tr>
            );
          })}
        />
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredPayments.length)} of{" "}
            {filteredPayments.length} transactions
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-xs font-medium px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Payment Inspection Modal */}
      <Dialog open={!!inspectingPayment} onOpenChange={(open) => !open && setInspectingPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" />
              Transaction Audit Record
            </DialogTitle>
            <DialogDescription>Gateway verification details & receipt ledger</DialogDescription>
          </DialogHeader>

          {inspectingPayment && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Internal ID:</span>
                  <code className="font-mono text-xs">{inspectingPayment.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <code className="font-mono text-xs">{inspectingPayment.booking_id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gateway Payment ID:</span>
                  <code className="font-mono text-xs font-semibold">{inspectingPayment.razorpay_payment_id || "—"}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gateway Order ID:</span>
                  <code className="font-mono text-xs">{inspectingPayment.razorpay_order_id || "—"}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Settled:</span>
                  <span className="font-display font-semibold text-primary">
                    {formatPrice(Number(inspectingPayment.amount), inspectingPayment.currency || "INR")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-semibold uppercase text-xs">{inspectingPayment.payment_method || inspectingPayment.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-bold uppercase text-xs">{inspectingPayment.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span>{new Date(inspectingPayment.created_at).toLocaleString()}</span>
                </div>
              </div>

              {inspectingPayment.error_description && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                  <p className="font-semibold">Gateway Error:</p>
                  <p>{inspectingPayment.error_description} (Code: {inspectingPayment.error_code})</p>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground text-center">
                🔒 Protected transaction record. Cryptographic secrets and card PANs are never exposed.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
