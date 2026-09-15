import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, CalendarDays, MapPin } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/roles";
import { paymentDetailQuery } from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/tourist/payments/$paymentId")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["tourist"]);
  },
  head: () => ({
    meta: [
      { title: "Payment Details & Receipt — Travezy" },
      {
        name: "description",
        content: "View transaction summary and print official payment receipt.",
      },
    ],
  }),
  component: PaymentDetailPage,
});

function PaymentDetailPage() {
  const { paymentId } = Route.useParams();
  const { data: payment, isLoading, isError } = useQuery(paymentDetailQuery(paymentId));

  if (isLoading) {
    return (
      <PageShell title="Loading payment…">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (isError || !payment) {
    return (
      <PageShell
        title="Payment not found"
        subtitle="The requested transaction record could not be found or you do not have permission to view it."
      >
        <Button asChild variant="ocean">
          <Link to="/tourist/payments">Back to My Payments</Link>
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Payment Record"
      title="Transaction Details"
      subtitle="Detailed view of payment verification, itemized charges and travel voucher."
    >
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center print:hidden">
          <Link
            to="/tourist/payments"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Back to transaction history
          </Link>

          {payment.booking_id && (
            <Button asChild variant="outline" size="sm">
              <Link
                to="/tourist/bookings/$bookingId"
                params={{ bookingId: payment.booking_id }}
              >
                View Related Booking
              </Link>
            </Button>
          )}
        </div>

        {/* Official Printable Receipt Card */}
        <PaymentReceipt payment={payment} showActions={true} />
      </div>
    </PageShell>
  );
}
