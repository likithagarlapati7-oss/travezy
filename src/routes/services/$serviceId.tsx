import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Compass,
  Filter,
  Hotel,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  Users,
  Utensils,
  ArrowUpDown,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { MapboxMap, type ServiceMarker } from "@/components/MapboxMap";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useUserInterests } from "@/hooks/useUserInterests";
import { formatPrice, providerName, serviceQuery, serviceReviewsQuery, servicesQuery, type Service } from "@/lib/travezy";
import { getRelatedRecommendations } from "@/lib/recommendations";
import { getServiceCoordinates } from "@/lib/mapbox";
import { ChatDialog } from "@/components/chat/ChatDialog";

export const Route = createFileRoute("/services/$serviceId")({
  head: () => ({
    meta: [
      { title: "Book your experience — Travezy" },
      {
        name: "description",
        content: "Review the details, pick your travel date and confirm your Travezy booking.",
      },
      { property: "og:title", content: "Book your experience — Travezy" },
      {
        property: "og:description",
        content: "Review the details, pick your travel date and confirm your Travezy booking.",
      },
    ],
  }),
  component: ServiceDetail,
});

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
type SortOption = "recent" | "highest" | "lowest";

function ServiceDetail() {
  const { serviceId } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { trackServiceView } = useUserInterests();

  const { data: service, isLoading, isError } = useQuery(serviceQuery(serviceId));
  const { data: reviews } = useQuery(serviceReviewsQuery(serviceId));
  const { data: allServices = [] } = useQuery(servicesQuery());

  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [recommendationTab, setRecommendationTab] = useState<"stays" | "dining" | "tours" | "similar">("similar");

  // Track service view in personalized interests
  useEffect(() => {
    if (service) {
      trackServiceView(service);
    }
  }, [service, trackServiceView]);

  // "You May Also Like" recommendations
  const related = useMemo(() => {
    if (!service || !allServices.length) {
      return { nearbyStays: [], nearbyDining: [], nearbyExperiences: [], similarCategory: [] };
    }
    return getRelatedRecommendations(service, allServices, 4);
  }, [service, allServices]);

  // Filter & sort reviews
  const filteredReviews = useMemo(() => {
    if (!reviews?.length) return [];
    let list = [...reviews];

    if (ratingFilter !== "all") {
      const targetRating = Number(ratingFilter);
      list = list.filter((r) => r.rating === targetRating);
    }

    if (sortBy === "highest") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "lowest") {
      list.sort((a, b) => a.rating - b.rating);
    } else {
      // Recent
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  }, [reviews, ratingFilter, sortBy]);

  if (isLoading) {
    return (
      <PageShell title="Loading experience…">
        <div className="h-96 animate-pulse rounded-4xl bg-muted" />
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell title="Something went wrong" subtitle="We couldn't load this listing.">
        <Button asChild variant="ocean">
          <Link to="/services">Back to services</Link>
        </Button>
      </PageShell>
    );
  }

  if (!service) {
    return (
      <PageShell title="Service not found" subtitle="This listing is no longer available.">
        <Button asChild variant="ocean">
          <Link to="/services">Back to services</Link>
        </Button>
      </PageShell>
    );
  }

  const reviewList = reviews ?? [];
  const avgRatingDisplay = reviewList.length
    ? (reviewList.reduce((acc, r) => acc + Number(r.rating), 0) / reviewList.length).toFixed(1)
    : Number(service.rating) > 0
    ? Number(service.rating).toFixed(1)
    : "4.8";

  const totalReviewsCount = reviewList.length > 0 ? reviewList.length : (service.review_count ?? 120);

  return (
    <PageShell
      eyebrow={service.category}
      title={service.title}
      subtitle={`${service.destination}${service.country ? `, ${service.country}` : ""}`}
    >
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <img
            src={service.image_url ?? ""}
            alt={service.title}
            className="aspect-16/10 w-full rounded-4xl object-cover shadow-float"
          />
          <div className="rounded-3xl border border-border bg-card p-7 shadow-card">
            <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-accent" />
                {service.destination}
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="size-4 fill-gold text-gold" />
                {avgRatingDisplay} ({totalReviewsCount} reviews)
              </span>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize text-secondary-foreground">
              {service.category}
            </span>
            <h2 className="mt-6 text-2xl">About this service</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{service.description}</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-7 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-display font-bold">Hosted by</h2>
              {service.providers?.user_id && user && user.id !== service.providers.user_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChatOpen(true)}
                  className="rounded-full gap-2 border-primary/30 text-primary hover:bg-primary/10 shadow-xs"
                >
                  <MessageSquare className="size-4" />
                  Contact Host
                </Button>
              )}
            </div>
            <div className="mt-4 flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                <BadgeCheck className="size-6" />
              </span>
              <div>
                <p className="font-display text-lg">{providerName(service)}</p>
                <p className="text-sm text-muted-foreground">
                  {service.providers?.verified ? "Verified Travezy partner" : "Travezy partner"} ·{" "}
                  {[service.city, service.state, service.country].filter(Boolean).join(", ") ||
                    service.destination}
                </p>
              </div>
            </div>
          </div>

          {/* Location map */}
          <ServiceLocationMap service={service} />

          {/* Traveller Reviews & Rating Breakdown Section */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-card space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
              <div>
                <h2 className="text-2xl font-display font-bold">Traveller Reviews</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verified guest ratings and feedback from completed journeys.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-display text-4xl font-extrabold text-primary">
                  {avgRatingDisplay}
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-0.5 text-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totalReviewsCount} verified review{totalReviewsCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Breakdown Distribution Bars */}
            {reviewList.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-4 bg-muted/30 p-5 rounded-2xl border border-border">
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = reviewList.filter((r) => r.rating === stars).length;
                    const pct = Math.round((count / (reviewList.length || 1)) * 100);
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="w-12 font-medium flex items-center gap-1 shrink-0">
                          {stars} <Star className="size-3 fill-amber-400 text-amber-400" />
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-lagoon rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-muted-foreground text-[11px] shrink-0">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-col justify-center items-center text-center p-4 border-t sm:border-t-0 sm:border-l border-border text-xs text-muted-foreground space-y-1">
                  <BadgeCheck className="size-6 text-emerald-500" />
                  <p className="font-semibold text-foreground">100% Verified Reviews</p>
                  <p className="max-w-xs">
                    Reviews can only be submitted by verified guests after completing their booking.
                  </p>
                </div>
              </div>
            )}

            {/* Filter & Sort Controls */}
            {reviewList.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {/* Rating Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground font-medium mr-1 flex items-center gap-1">
                    <Filter className="size-3" /> Filter:
                  </span>
                  {(["all", "5", "4", "3", "2", "1"] as RatingFilter[]).map((rf) => (
                    <button
                      key={rf}
                      onClick={() => setRatingFilter(rf)}
                      className={`px-3 py-1 rounded-full font-medium transition-all ${
                        ratingFilter === rf
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {rf === "all" ? "All Stars" : `${rf} ★`}
                    </button>
                  ))}
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <ArrowUpDown className="size-3" /> Sort:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Sort reviews"
                    className="bg-background border border-border rounded-xl px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="highest">Highest Rated</option>
                    <option value="lowest">Lowest Rated</option>
                  </select>
                </div>
              </div>
            )}

            {/* Reviews List */}
            {filteredReviews.length > 0 ? (
              <ul className="space-y-5">
                {filteredReviews.map((r) => {
                  const authorName = r.reviewer_name || r.profiles?.full_name || "Verified Traveller";
                  const avatarUrl = r.reviewer_avatar || r.profiles?.avatar_url;
                  const initial = authorName.charAt(0).toUpperCase();

                  return (
                    <li
                      key={r.id}
                      className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6 space-y-4 hover:border-accent/30 transition-colors shadow-xs"
                    >
                      {/* Review Author & Header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={authorName}
                              className="size-10 rounded-full object-cover ring-1 ring-border shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="size-10 rounded-full bg-gradient-lagoon grid place-items-center text-white font-semibold text-sm shadow-xs shrink-0">
                              {initial}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-foreground">{authorName}</p>
                              {r.reviewer_location && (
                                <span className="text-[11px] text-muted-foreground font-normal">
                                  · {r.reviewer_location}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-gold">
                          {Array.from({ length: Number(r.rating) }).map((_, i) => (
                            <Star key={i} className="size-3.5 fill-current" />
                          ))}
                        </div>
                      </div>

                      {/* Review Headline if provided */}
                      {r.title && (
                        <h4 className="font-display text-sm font-bold text-foreground pl-0 sm:pl-13">
                          "{r.title}"
                        </h4>
                      )}

                      {/* Review Comment */}
                      <p className="text-sm text-foreground/90 leading-relaxed pl-0 sm:pl-13">
                        {r.comment}
                      </p>

                      {/* Attached Photos */}
                      {r.images && r.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 pl-0 sm:pl-13 pt-1">
                          {r.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt="Review attachment"
                              className="size-16 rounded-xl object-cover border border-border shadow-xs hover:scale-105 transition-transform"
                            />
                          ))}
                        </div>
                      )}

                      {/* Host Response Card */}
                      {r.provider_response && (
                        <div className="mt-3 ml-0 sm:ml-13 rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-primary flex items-center gap-1.5">
                              <BadgeCheck className="size-3.5" />
                              Response from {providerName(service)}
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
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
                <Star className="size-8 text-muted-foreground mx-auto" />
                <h3 className="font-semibold text-sm">No reviews yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Be the first to travel with {providerName(service)} and share your story with the Travezy community!
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit lg:sticky lg:top-28">
          <div className="rounded-3xl border border-border bg-card p-7 shadow-float">
            <p className="font-display text-4xl text-primary">
              {formatPrice(Number(service.price), service.currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              {["hotel", "resort", "homestay", "heritage"].includes(service.category?.toLowerCase())
                ? "per night"
                : "per person"}
            </p>

            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-accent" /> Travel date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guests" className="flex items-center gap-1.5">
                  <Users className="size-4 text-accent" /> Guests
                </Label>
                <Input
                  id="guests"
                  type="number"
                  min={1}
                  max={20}
                  value={guests}
                  onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-2xl text-foreground">
                {formatPrice(Number(service.price) * guests, service.currency)}
              </span>
            </div>

            {role === "provider" ? (
              <div className="mt-6 rounded-xl bg-muted p-3 text-center text-xs text-muted-foreground">
                Providers cannot book travel services.
              </div>
            ) : user ? (
              <Button
                variant="hero"
                size="lg"
                className="mt-6 w-full"
                onClick={() => {
                  navigate({
                    to: "/services/$serviceId/book",
                    params: { serviceId: service.id },
                    search: { date: date || undefined, guests },
                  });
                }}
              >
                Book Now
              </Button>
            ) : (
              <Button asChild variant="hero" size="lg" className="mt-6 w-full">
                <Link
                  to="/login"
                  search={{
                    redirect: `/services/${service.id}/book?date=${date}&guests=${guests}`,
                  }}
                >
                  Sign in to book
                </Link>
              </Button>
            )}
          </div>
        </aside>
      </div>

      {/* "You May Also Like" Recommendation Section */}
      <section className="mt-16 space-y-8 pt-10 border-t border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-gold" /> Curated Recommendations
            </p>
            <h2 className="mt-1 text-3xl font-display font-bold">You May Also Like</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Handpicked stays, dining, and activities matching your itinerary in {service.city || service.destination}.
            </p>
          </div>

          {/* Tabs for recommendation categories */}
          <div className="flex flex-wrap gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border text-xs">
            <button
              onClick={() => setRecommendationTab("similar")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                recommendationTab === "similar"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Similar {service.category}
            </button>
            {related.nearbyStays.length > 0 && (
              <button
                onClick={() => setRecommendationTab("stays")}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1 ${
                  recommendationTab === "stays"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Hotel className="size-3" /> Nearby Stays
              </button>
            )}
            {related.nearbyDining.length > 0 && (
              <button
                onClick={() => setRecommendationTab("dining")}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1 ${
                  recommendationTab === "dining"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Utensils className="size-3" /> Nearby Dining
              </button>
            )}
            {related.nearbyExperiences.length > 0 && (
              <button
                onClick={() => setRecommendationTab("tours")}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1 ${
                  recommendationTab === "tours"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Compass className="size-3" /> Local Tours
              </button>
            )}
          </div>
        </div>

        {/* Selected Recommendation Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(() => {
            const activeList =
              recommendationTab === "stays"
                ? related.nearbyStays
                : recommendationTab === "dining"
                ? related.nearbyDining
                : recommendationTab === "tours"
                ? related.nearbyExperiences
                : related.similarCategory.length > 0
                ? related.similarCategory
                : allServices.filter((s) => s.id !== service.id).slice(0, 4);

            return activeList.map((item, idx) => (
              <RecommendationCard key={item.id} service={item} index={idx} />
            ));
          })()}
        </div>
      </section>

      {service.providers?.user_id && (
        <ChatDialog
          open={isChatOpen}
          onOpenChange={setIsChatOpen}
          partnerId={service.providers.user_id}
          partnerName={providerName(service)}
          isPartnerProvider={true}
          serviceTitle={service.title}
        />
      )}
    </PageShell>
  );
}

// ── ServiceLocationMap helper ──────────────────────────────────────────────────
function ServiceLocationMap({
  service,
}: {
  service: Service & { latitude?: number | null; longitude?: number | null };
}) {
  const coords = getServiceCoordinates(service);
  const locationString = [service.destination, service.city, service.state, service.country]
    .filter(Boolean)
    .join(", ");

  if (!coords) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-card space-y-2">
        <h2 className="text-2xl font-display font-bold">Location</h2>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-muted-foreground/60" />
          {locationString || "Location information is not available for this service."}
        </p>
      </div>
    );
  }

  const marker: ServiceMarker = {
    id: service.id,
    lat: coords.lat,
    lng: coords.lng,
    title: service.title,
    subtitle: [service.destination, service.country].filter(Boolean).join(", "),
    category: service.category,
    serviceId: service.id,
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-card space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">Location</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Explore the listing destination and surrounding area
        </p>
      </div>

      <MapboxMap
        markers={[marker]}
        center={[marker.lng, marker.lat]}
        height="h-[340px]"
        zoom={13}
        className="w-full"
      />

      <p className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
        <MapPin className="size-4 shrink-0 text-accent" />
        <span>{locationString || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}</span>
      </p>
    </div>
  );
}
