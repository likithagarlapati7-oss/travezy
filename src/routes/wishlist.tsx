import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Heart,
  Hotel,
  Utensils,
  Compass,
  User,
  MapPin,
  Trash2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Navigation,
  Layers,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWishlist } from "@/hooks/useWishlist";
import { GuideBookingModal } from "@/components/GuideBookingModal";
import { HUMAN_TOUR_GUIDES } from "@/data/human-guides";
import type { GuideWithDistance } from "@/lib/guides";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "My Wishlist — Saved Stays, Dining & Guides | Travezy" },
      {
        name: "description",
        content: "View and manage your saved hotels, authentic restaurants, adventure tours, and verified human guides.",
      },
    ],
  }),
  component: WishlistPage,
});

export function WishlistPage() {
  const { items, isLoading, removeSave, counts, groupedByDestination } = useWishlist();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedGuideForBooking, setSelectedGuideForBooking] = useState<GuideWithDistance | null>(null);

  const destinationEntries = Object.entries(groupedByDestination);

  const filteredItems = items.filter((item) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "hotels") return item.item_type === "hotel";
    if (activeCategory === "restaurants") return item.item_type === "restaurant";
    if (activeCategory === "experiences") return item.item_type === "experience" || item.item_type === "tour";
    if (activeCategory === "guides") return item.item_type === "guide";
    if (activeCategory === "destinations") return item.item_type === "destination";
    return true;
  });

  const handleBookItem = (item: any) => {
    if (item.item_type === "guide") {
      const fullGuide = HUMAN_TOUR_GUIDES.find((g) => g.id === item.item_id);
      if (fullGuide) {
        setSelectedGuideForBooking({ ...fullGuide, distanceKm: null, isWithinRadius: true });
        return;
      }
    }
  };

  const getItemLink = (item: any) => {
    if (item.item_type === "guide") return `/guides/${item.item_id}`;
    if (item.item_type === "destination") {
      const slug = item.metadata?.slug || item.item_id.toLowerCase().replace(/\s+/g, "-");
      return `/destinations/${slug}`;
    }
    return `/services/${item.item_id}`;
  };

  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case "hotel":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 text-[11px] font-semibold gap-1">
            <Hotel className="size-3" /> Hotel & Stay
          </Badge>
        );
      case "restaurant":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 text-[11px] font-semibold gap-1">
            <Utensils className="size-3" /> Restaurant
          </Badge>
        );
      case "experience":
      case "tour":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 text-[11px] font-semibold gap-1">
            <Compass className="size-3" /> Experience
          </Badge>
        );
      case "guide":
        return (
          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/40 text-[11px] font-semibold gap-1">
            <User className="size-3" /> Human Tour Guide
          </Badge>
        );
      case "destination":
        return (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40 text-[11px] font-semibold gap-1">
            <MapPin className="size-3" /> Destination
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <PageShell
      eyebrow="Saved Collection"
      title="My Wishlist"
      subtitle="Your curated selection of unforgettable stays, authentic regional dining, guided tours, and verified human guides."
    >
      {/* ── Destination Summary Section ──────────────────────────────────────── */}
      {destinationEntries.length > 0 && (
        <div className="mb-10 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Saved by Destination
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {destinationEntries.map(([destName, group]) => (
              <div
                key={destName}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h4 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <Heart className="size-4 text-rose-500 fill-rose-500" />
                    <span>{destName}</span>
                  </h4>
                  <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
                    {group.totalCount} saved
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <div className="flex items-center gap-1.5">
                    <Hotel className="size-3.5 text-blue-500" />
                    <span>Hotels — <strong className="text-foreground">{group.hotels.length}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Utensils className="size-3.5 text-amber-500" />
                    <span>Restaurants — <strong className="text-foreground">{group.restaurants.length}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Compass className="size-3.5 text-emerald-500" />
                    <span>Experiences — <strong className="text-foreground">{group.experiences.length}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5 text-purple-500" />
                    <span>Guides — <strong className="text-foreground">{group.guides.length}</strong></span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                  <Link
                    to={`/destinations/${destName.toLowerCase().replace(/\s+/g, "-")}` as any}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Explore {destName} Guide <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Category Filter Tabs ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <Tabs
          value={activeCategory}
          onValueChange={setActiveCategory}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-3 sm:flex flex-wrap h-auto p-1 bg-muted rounded-xl gap-1">
            <TabsTrigger value="all" className="rounded-lg text-xs py-2 px-3">
              All ({counts.total})
            </TabsTrigger>
            <TabsTrigger value="hotels" className="rounded-lg text-xs py-2 px-3">
              🏨 Hotels ({counts.hotels})
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="rounded-lg text-xs py-2 px-3">
              🍽️ Dining ({counts.restaurants})
            </TabsTrigger>
            <TabsTrigger value="experiences" className="rounded-lg text-xs py-2 px-3">
              🎒 Experiences ({counts.experiences})
            </TabsTrigger>
            <TabsTrigger value="guides" className="rounded-lg text-xs py-2 px-3">
              👨‍🏫 Guides ({counts.guides})
            </TabsTrigger>
            {counts.destinations > 0 && (
              <TabsTrigger value="destinations" className="rounded-lg text-xs py-2 px-3">
                📍 Places ({counts.destinations})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button asChild variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
            <Link to="/explore-near-me">
              <Navigation className="size-3.5 text-primary" /> Explore Near Me
            </Link>
          </Button>
          <Button asChild variant="default" size="sm" className="rounded-full text-xs gap-1.5">
            <Link to="/planner">
              <Sparkles className="size-3.5" /> Plan Itinerary
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Wishlist Items Grid ──────────────────────────────────────────────── */}
      {filteredItems.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <div
              key={`${item.item_type}-${item.item_id}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:shadow-card transition-all duration-300"
            >
              {/* Thumbnail Image */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                {item.item_image ? (
                  <img
                    src={item.item_image}
                    alt={item.item_title}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                    <Compass className="size-10 stroke-1" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-3 left-3">
                  {getItemTypeBadge(item.item_type)}
                </div>

                {/* Remove Save Button */}
                <button
                  type="button"
                  onClick={() => removeSave(item.item_type, item.item_id, item.item_title)}
                  className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-rose-600 transition-colors"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="size-3.5" />
                </button>

                {/* Destination Pill at bottom left */}
                <div className="absolute bottom-3 left-3 text-white">
                  <p className="text-xs font-medium flex items-center gap-1 drop-shadow-sm">
                    <MapPin className="size-3 text-rose-400" />
                    {item.destination || item.city || item.state || "India"}
                  </p>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1.5">
                    <span className="font-semibold text-primary capitalize">
                      {item.item_category || item.item_type}
                    </span>
                    {item.rating ? (
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        ★ {item.rating.toFixed(1)}
                        {item.review_count ? ` (${item.review_count})` : ""}
                      </span>
                    ) : null}
                  </div>

                  <h4 className="font-display font-bold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {item.item_title}
                  </h4>

                  {item.price !== null && item.price !== undefined ? (
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      ₹{item.price.toLocaleString("en-IN")}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {item.item_type === "guide"
                          ? "/ hour"
                          : item.item_type === "hotel"
                            ? "/ night"
                            : "/ person"}
                      </span>
                    </p>
                  ) : null}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl text-xs gap-1"
                  >
                    <Link to={getItemLink(item) as any}>
                      <ExternalLink className="size-3" /> View Details
                    </Link>
                  </Button>

                  {item.item_type === "guide" ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleBookItem(item)}
                      className="rounded-xl text-xs font-semibold px-4"
                    >
                      Book Guide
                    </Button>
                  ) : item.item_type === "hotel" || item.item_type === "experience" || item.item_type === "tour" ? (
                    <Button
                      asChild
                      size="sm"
                      variant="default"
                      className="rounded-xl text-xs font-semibold px-4"
                    >
                      <Link to={`/services/${item.item_id}` as any}>
                        Book Now
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border p-12 text-center bg-card/50">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 mb-4">
            <Heart className="size-8 stroke-1" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">Your wishlist is empty</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            Save boutique hotels, authentic regional eateries, excursions, and verified local human guides to plan your perfect journey.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="default" className="rounded-full text-xs gap-1.5">
              <Link to="/destinations">
                <MapPin className="size-3.5" /> Explore Destinations
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full text-xs gap-1.5">
              <Link to="/explore-near-me">
                <Navigation className="size-3.5 text-primary" /> Explore Near Me
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Guide Booking Modal */}
      {selectedGuideForBooking && (
        <GuideBookingModal
          guide={selectedGuideForBooking}
          open={Boolean(selectedGuideForBooking)}
          onOpenChange={(open) => {
            if (!open) setSelectedGuideForBooking(null);
          }}
          onSuccess={() => {
            setSelectedGuideForBooking(null);
          }}
        />
      )}
    </PageShell>
  );
}
