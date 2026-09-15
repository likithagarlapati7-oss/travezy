import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Edit,
  MapPin,
  MessageSquareQuote,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ReviewFormDialog } from "@/components/ReviewFormDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import { touristReviewsQuery, type ReviewWithService } from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/tourist/reviews")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["tourist"]);
  },
  head: () => ({
    meta: [
      { title: "My Reviews — Travezy" },
      {
        name: "description",
        content: "View all your past reviews, ratings, and host replies.",
      },
    ],
  }),
  component: TouristReviewsPage,
});

function TouristReviewsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: reviews, isLoading, isError } = useQuery({
    ...touristReviewsQuery(userId),
    enabled: !!userId,
  });

  const [selectedReview, setSelectedReview] = useState<ReviewWithService | null>(null);

  const totalReviews = reviews?.length ?? 0;
  const avgGiven = totalReviews
    ? (reviews!.reduce((acc, r) => acc + Number(r.rating), 0) / totalReviews).toFixed(1)
    : "—";

  return (
    <PageShell
      eyebrow="My Contributions"
      title="My Reviews & Feedback"
      subtitle="Track your travel reviews, ratings and host responses across all completed trips."
    >
      <div className="space-y-8">
        {/* Metric Cards */}
        <div className="grid gap-5 sm:grid-cols-2 max-w-xl">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-gold shrink-0">
              <Star className="size-6 fill-current" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Average Rating Given</p>
              <p className="font-display text-2xl sm:text-3xl font-bold mt-0.5">
                {avgGiven} <span className="text-xs font-normal text-muted-foreground">/ 5.0</span>
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <MessageSquareQuote className="size-6" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Reviews Written</p>
              <p className="font-display text-2xl sm:text-3xl font-bold mt-0.5">
                {totalReviews}
              </p>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded-3xl" />
            <div className="h-32 bg-muted animate-pulse rounded-3xl" />
          </div>
        ) : isError ? (
          <p className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-destructive text-center">
            Failed to load your reviews. Please refresh and try again.
          </p>
        ) : reviews && reviews.length > 0 ? (
          <div className="space-y-5">
            {reviews.map((r) => {
              const service = r.services;

              return (
                <div
                  key={r.id}
                  className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4 hover:border-accent/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                      {service?.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.title}
                          className="size-12 rounded-xl object-cover shrink-0"
                        />
                      ) : null}
                      <div>
                        {service?.id ? (
                          <Link
                            to="/services/$serviceId"
                            params={{ serviceId: service.id }}
                            className="font-display text-base font-semibold text-foreground hover:text-primary transition-colors"
                          >
                            {service.title}
                          </Link>
                        ) : (
                          <h4 className="font-display text-base font-semibold text-foreground">
                            {service?.title || "Travel Experience"}
                          </h4>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          {service?.destination && (
                            <>
                              <MapPin className="size-3 text-accent" />
                              {service.destination} ·
                            </>
                          )}
                          <span>Reviewed on {new Date(r.created_at).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5 text-gold">
                        {Array.from({ length: Number(r.rating) }).map((_, i) => (
                          <Star key={i} className="size-4 fill-current" />
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReview(r)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Edit className="size-3.5" /> Edit
                      </Button>
                    </div>
                  </div>

                  {/* Review text */}
                  <p className="text-sm text-foreground/90 leading-relaxed italic bg-muted/20 p-4 rounded-2xl border border-border">
                    "{r.comment}"
                  </p>

                  {/* Provider response if present */}
                  {r.provider_response && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1.5 ml-0 sm:ml-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-primary flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5" /> Response from Host ({service?.providers?.business_name || "Provider"})
                        </span>
                        {r.provider_responded_at && (
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(r.provider_responded_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {r.provider_response}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3">
            <Star className="size-8 text-muted-foreground mx-auto" />
            <h3 className="font-display text-lg font-semibold">No reviews written yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Once you complete a booked experience, you can share your story and ratings here.
            </p>
            <Button asChild variant="ocean" size="sm">
              <Link to="/tourist/bookings">View My Trips</Link>
            </Button>
          </div>
        )}

        {/* Edit Review Dialog */}
        {selectedReview && (
          <ReviewFormDialog
            bookingId={selectedReview.booking_id || ""}
            serviceId={selectedReview.service_id}
            serviceTitle={selectedReview.services?.title || "Travel Service"}
            existingReview={selectedReview}
            isOpen={!!selectedReview}
            onClose={() => setSelectedReview(null)}
          />
        )}
      </div>
    </PageShell>
  );
}
