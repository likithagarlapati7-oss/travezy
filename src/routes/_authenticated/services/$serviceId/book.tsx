import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle, Loader2, MapPin, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBooking, getBookingAvailability } from "@/lib/bookings.functions";
import { formatPrice, providerName, serviceQuery } from "@/lib/travezy";

const searchSchema = z.object({
  date: z.string().optional(),
  guests: z.number().int().min(1).catch(1).optional(),
});

type BookSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_authenticated/services/$serviceId/book")({
  validateSearch: (search: Record<string, unknown>): BookSearch => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Review and Book — Travezy" },
      { name: "description", content: "Review and confirm your experience booking on Travezy." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { serviceId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: service, isLoading, isError } = useQuery(serviceQuery(serviceId));

  const [date, setDate] = useState(search.date ?? "");
  const [guests, setGuests] = useState(search.guests ?? 1);
  const [notes, setNotes] = useState("");

  const checkAvailabilityFn = useServerFn(getBookingAvailability);
  const createBookingFn = useServerFn(createBooking);

  // Availability check query
  const { data: availability, isLoading: isCheckingAvailability } = useQuery({
    queryKey: ["availability", serviceId, date, guests],
    queryFn: async () => {
      if (!date) return null;
      try {
        const res = await checkAvailabilityFn({ data: { service_id: serviceId, travel_date: date, guests } });
        return res;
      } catch (err) {
        console.warn("[availability fallback]", err);
        const max = (service?.max_guests && service.max_guests > 0) ? service.max_guests : 10;
        return {
          available: guests <= max,
          capacity: max,
          maxGuests: max,
        };
      }
    },
    enabled: !!date && guests >= 1,
    staleTime: 5000,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("Please select a travel date");
      return await createBookingFn({
        data: {
          service_id: serviceId,
          travel_date: date,
          guests,
          notes: notes || null,
        },
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      toast.success("Booking request sent successfully!");
      navigate({
        to: "/tourist/bookings/$bookingId/confirmation",
        params: { bookingId: res.id },
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to create booking. Please try again.");
    },
  });

  if (isLoading) {
    return (
      <PageShell title="Loading checkout…">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (isError || !service) {
    return (
      <PageShell title="Service not found" subtitle="We couldn't load checkout details for this listing.">
        <Button asChild variant="ocean">
          <Link to="/services">Back to services</Link>
        </Button>
      </PageShell>
    );
  }

  const totalAmount = Number(service.price) * guests;

  const maxCapacity = (service.max_guests && service.max_guests > 0)
    ? service.max_guests
    : (service as any)?.capacity && (service as any).capacity > 0
      ? (service as any).capacity
      : (availability?.maxGuests && availability.maxGuests > 0)
        ? availability.maxGuests
        : 10;

  return (
    <PageShell eyebrow="Checkout" title="Confirm your request" subtitle="Review your travel details and send a booking request.">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] items-start">
        {/* Service summary */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-5 lg:sticky lg:top-28">
          <img
            src={service.image_url ?? ""}
            alt={service.title}
            className="aspect-16/10 w-full rounded-2xl object-cover"
          />
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize text-secondary-foreground mb-2">
              {service.category}
            </span>
            <h3 className="font-display text-2xl leading-snug">{service.title}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="size-4 text-accent shrink-0" />
              {service.destination}{service.country ? `, ${service.country}` : ""}
            </p>
          </div>

          <div className="border-t border-border pt-4 flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Price per guest</span>
            <span className="font-semibold text-primary">{formatPrice(Number(service.price), service.currency)}</span>
          </div>

          {service.rating > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="size-4 fill-gold text-gold" />
              <span>{Number(service.rating).toFixed(1)} ({service.review_count} reviews)</span>
            </div>
          )}

          <div className="border-t border-border pt-4 text-xs text-muted-foreground">
            Hosted by <strong className="text-foreground">{providerName(service)}</strong>
          </div>
        </div>

        {/* Booking Form */}
        <div className="rounded-3xl border border-border bg-card p-7 shadow-card space-y-6">
          <h2 className="text-2xl font-display">Travel Details</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              bookMutation.mutate();
            }}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="travel_date" className="flex items-center gap-1.5 text-sm font-medium">
                  <CalendarDays className="size-4 text-accent" /> Date of travel
                </Label>
                <Input
                  id="travel_date"
                  type="date"
                  required
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guests" className="flex items-center gap-1.5 text-sm font-medium">
                  <Users className="size-4 text-accent" /> Number of guests
                </Label>
                <Input
                  id="guests"
                  type="number"
                  required
                  min={1}
                  max={maxCapacity}
                  value={guests}
                  onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Availability feedback */}
            {date ? (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 transition-all">
                {isCheckingAvailability ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="size-3.5 animate-spin text-primary" /> Verifying availability for {date}…
                  </p>
                ) : availability && availability.capacity === 0 ? (
                  <div className="flex items-start gap-2.5 text-destructive">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-destructive">Fully booked on {date}</p>
                      <p className="text-muted-foreground">
                        All {availability.maxGuests} spots are booked for this date. Please select another travel date.
                      </p>
                    </div>
                  </div>
                ) : availability && !availability.available ? (
                  <div className="flex items-start gap-2.5 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-amber-600 dark:text-amber-400">
                        Insufficient capacity on {date}
                      </p>
                      <p className="text-muted-foreground">
                        Only <strong className="text-foreground">{availability.capacity}</strong> spot{availability.capacity > 1 ? "s" : ""} available on {date} (you requested {guests} guests). Please reduce guests or choose another date.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold">
                        Date Available for Booking ({date})
                      </p>
                      <p className="text-muted-foreground">
                        {availability && availability.capacity <= 3
                          ? `Only ${availability.capacity} spot${availability.capacity > 1 ? "s" : ""} remaining for ${date}!`
                          : `Verified available for ${guests} guest${guests > 1 ? "s" : ""} on ${date}.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-accent" /> Please choose a travel date to proceed with your booking.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">Special requests / notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Let the provider know about food preferences, pick-up requirements or special setups…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-24 rounded-xl resize-y"
              />
            </div>

            {/* Price Summary */}
            <div className="rounded-2xl border border-border bg-muted/40 p-5 space-y-3">
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Price details</h4>
              <div className="flex justify-between text-sm">
                <span>{formatPrice(Number(service.price), service.currency)} × {guests} guest{guests > 1 ? "s" : ""}</span>
                <span>{formatPrice(totalAmount, service.currency)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-display text-lg text-primary">
                <span>Estimated Total</span>
                <span>{formatPrice(totalAmount, service.currency)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="flex-1"
                disabled={!date || isCheckingAvailability || (availability !== undefined && !availability?.available) || bookMutation.isPending}
              >
                {bookMutation.isPending ? "Sending request…" : "Send Booking Request"}
              </Button>
              <Button asChild type="button" variant="outline" size="lg">
                <Link to="/services/$serviceId" params={{ serviceId }}>Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
