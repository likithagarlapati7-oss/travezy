import { Printer, CheckCircle2, Plane, ShieldCheck, MapPin, CalendarDays, Users, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, type PaymentWithDetails } from "@/lib/travezy";

export interface PaymentReceiptProps {
  payment: PaymentWithDetails;
  onClose?: () => void;
  showActions?: boolean;
}

export function PaymentReceipt({ payment, onClose, showActions = true }: PaymentReceiptProps) {
  const booking = payment.bookings;
  const service = booking?.services;
  const tourist = booking?.profiles;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(payment.updated_at || payment.created_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const isSuccess = payment.status.toUpperCase() === "SUCCESS";

  return (
    <div className="receipt-container mx-auto max-w-2xl bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-card space-y-6 text-foreground print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black">
      {/* Header with Travezy Branding */}
      <div className="flex justify-between items-start border-b border-border pb-6 flex-wrap gap-4 print:border-neutral-300">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-lagoon text-white shadow-sm print:bg-neutral-800 print:text-white">
            <Plane className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Travezy</h2>
            <p className="text-xs text-muted-foreground print:text-neutral-600">Official Payment Receipt & Travel Voucher</p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20 print:border-neutral-400 print:bg-neutral-100 print:text-neutral-900">
            {isSuccess ? <CheckCircle2 className="size-3.5" /> : null}
            {payment.status}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 font-mono print:text-neutral-600">
            Receipt: #{payment.id.slice(0, 10).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Top Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-muted/40 p-4 rounded-2xl border border-border print:bg-neutral-50 print:border-neutral-200">
        <div>
          <span className="text-muted-foreground block print:text-neutral-500">Date Paid</span>
          <span className="font-medium">{formattedDate}</span>
        </div>
        <div>
          <span className="text-muted-foreground block print:text-neutral-500">Payment Gateway</span>
          <span className="font-medium capitalize">{payment.payment_method || payment.method || "Razorpay"}</span>
        </div>
        <div>
          <span className="text-muted-foreground block print:text-neutral-500">Razorpay Ref</span>
          <span className="font-mono font-medium truncate block" title={payment.razorpay_payment_id || "—"}>
            {payment.razorpay_payment_id || "—"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block print:text-neutral-500">Booking Ref</span>
          <span className="font-mono font-medium truncate block" title={payment.booking_id}>
            {payment.booking_id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Tourist & Provider Columns */}
      <div className="grid sm:grid-cols-2 gap-6 text-sm">
        <div className="space-y-1 rounded-2xl border border-border p-4 bg-card/60 print:border-neutral-200">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block print:text-neutral-500">
            Billed To (Tourist)
          </span>
          <p className="font-semibold text-base">{tourist?.full_name || "Valued Traveller"}</p>
          {tourist?.email && <p className="text-xs text-muted-foreground print:text-neutral-600">{tourist.email}</p>}
          {tourist?.phone && <p className="text-xs text-muted-foreground print:text-neutral-600">{tourist.phone}</p>}
        </div>

        <div className="space-y-1 rounded-2xl border border-border p-4 bg-card/60 print:border-neutral-200">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block print:text-neutral-500">
            Service Provider
          </span>
          <p className="font-semibold text-base">
            {service?.providers?.business_name || (payment.providers as any)?.business_name || "Travezy Verified Partner"}
          </p>
          <p className="text-xs text-muted-foreground print:text-neutral-600">
            {service?.destination || "Destination Partner"}
          </p>
        </div>
      </div>

      {/* Experience Itemization */}
      <div className="border border-border rounded-2xl overflow-hidden print:border-neutral-300">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground border-b border-border print:bg-neutral-100 print:border-neutral-300 print:text-neutral-700">
            <tr>
              <th className="p-3 sm:p-4">Item & Experience</th>
              <th className="p-3 sm:p-4 text-center">Travel Date</th>
              <th className="p-3 sm:p-4 text-center">Guests</th>
              <th className="p-3 sm:p-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border print:divide-neutral-200">
            <tr>
              <td className="p-3 sm:p-4">
                <p className="font-medium text-foreground print:text-black">{service?.title || "Travel Service Experience"}</p>
                <p className="text-xs text-muted-foreground print:text-neutral-600 flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3 text-accent shrink-0 print:hidden" />
                  {service?.destination}
                </p>
              </td>
              <td className="p-3 sm:p-4 text-center text-xs whitespace-nowrap">
                {booking?.travel_date || "—"}
              </td>
              <td className="p-3 sm:p-4 text-center text-xs">
                {booking?.guests || 1}
              </td>
              <td className="p-3 sm:p-4 text-right font-semibold">
                {formatPrice(Number(payment.amount), payment.currency)}
              </td>
            </tr>
          </tbody>
          <tfoot className="bg-muted/30 border-t border-border font-medium print:bg-neutral-50 print:border-neutral-300">
            <tr>
              <td colSpan={3} className="p-3 sm:p-4 text-right text-xs uppercase tracking-wider text-muted-foreground print:text-neutral-600">
                Total Amount Paid
              </td>
              <td className="p-3 sm:p-4 text-right font-display text-lg font-bold text-primary print:text-black">
                {formatPrice(Number(payment.amount), payment.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Security & Verification Footer */}
      <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-4 border border-border text-xs text-muted-foreground print:bg-white print:border-neutral-200 print:text-neutral-600">
        <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
        <p className="leading-relaxed">
          This is an official computer-generated receipt issued upon cryptographic settlement verification. It confirms your payment to <strong>Travezy</strong> for the specified service.
        </p>
      </div>

      {/* Actions (Hidden when printing) */}
      {showActions && (
        <div className="flex flex-wrap justify-end gap-3 pt-2 print:hidden">
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
          <Button variant="ocean" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="size-4" /> Print Receipt
          </Button>
        </div>
      )}
    </div>
  );
}
