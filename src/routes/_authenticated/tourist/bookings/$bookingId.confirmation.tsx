import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Loader2, MapPin } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { formatPrice, touristBookingQuery } from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/tourist/bookings/$bookingId/confirmation")({
  head: () => ({
    meta: [{ title: "Booking Confirmation — Travezy" }],
  }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { bookingId } = Route.useParams();

  const { data: booking, isLoading, isError } = useQuery(touristBookingQuery(bookingId));

  if (isLoading) {
    return (
      <PageShell title="Loading confirmation…">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (isError || !booking) {
    return (
      <PageShell title="Request failed" subtitle="We couldn't retrieve booking confirmation details.">
        <Button asChild variant="ocean">
          <Link to="/tourist/bookings">Go to My Bookings</Link>
        </Button>
      </PageShell>
    );
  }

  const { services: service } = booking;

  return (
    <PageShell eyebrow="Booking Request Sent" title="Pending Confirmation" subtitle="Your request has been sent to the service provider.">
      <div className="mx-auto max-w-2xl text-center space-y-8 py-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-500 animate-bounce">
            <CalendarDays className="size-16" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-display">Pending Provider Confirmation</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Your booking request status is currently <strong className="uppercase">PENDING</strong>. The provider will review your dates and guest numbers shortly. You will not be charged until the provider accepts.
          </p>
        </div>

        {/* Details Card */}
        {service && (
          <div className="rounded-3xl border border-border bg-card p-6 text-left shadow-card space-y-4">
            <div className="flex gap-4 items-center">
              <img
                src={service.image_url ?? ""}
                alt={service.title}
                className="size-16 rounded-xl object-cover"
              />
              <div>
                <h4 className="font-semibold text-lg">{service.title}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3.5 text-accent" />
                  {service.destination}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block uppercase tracking-wider font-medium">Booking ID</span>
                <span className="font-mono text-xs font-semibold">{booking.id}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block uppercase tracking-wider font-medium">Status</span>
                <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-semibold capitalize text-amber-800 dark:text-amber-300">
                  {booking.status}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block uppercase tracking-wider font-medium">Travel Date</span>
                <span className="font-semibold text-foreground">{booking.travel_date}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block uppercase tracking-wider font-medium">Guests</span>
                <span className="font-semibold text-foreground">{booking.guests} guest{booking.guests > 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex justify-between items-center text-sm">
              <span className="font-medium text-muted-foreground">Amount calculated</span>
              <span className="font-display text-xl text-primary font-bold">{formatPrice(Number(booking.total_price))}</span>
            </div>

            <div className="border-t border-border pt-3 text-xs text-muted-foreground">
              <strong>Your request:</strong> {booking.notes ? `"${booking.notes}"` : "No special requests."}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Button asChild variant="hero" size="lg">
            <Link to="/tourist/bookings/$bookingId" params={{ bookingId: booking.id }}>
              View Details & Pay with Razorpay
            </Link>
          </Button>
          <Button asChild variant="ocean" size="lg">
            <Link to="/tourist/bookings">View My Bookings</Link>
          </Button>
          {service && (
            <Button asChild variant="outline" size="lg">
              <Link to="/services/$serviceId" params={{ serviceId: service.id }}>
                View Service
              </Link>
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
