import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FileSpreadsheet,
  Globe2,
  Hotel,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Utensils,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { servicesQuery, formatPrice } from "@/lib/travezy";
import { HUMAN_TOUR_GUIDES } from "@/data/human-guides.ts";
import { DESTINATIONS_DATA, type DestinationData } from "@/data/destinations-data.ts";
import { WishlistButton } from "@/components/WishlistButton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/destinations/")({
  head: () => ({
    meta: [
      { title: "Explore Destinations Across India & The World — Travezy" },
      {
        name: "description",
        content:
          "Discover Kerala, Rajasthan, Goa, Karnataka, Tamil Nadu, Himachal Pradesh and all Indian states. Explore hotels, regional restaurants, experiences, and verified local tour guides for each destination.",
      },
      { property: "og:title", content: "Explore Destinations — Travezy" },
      {
        property: "og:description",
        content: "Discover Indian and global destinations with curated stays, authentic dining, activities, and local human guides.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DestinationsCatalogPage,
});

const REGIONS = [
  "All",
  "South India",
  "North India",
  "West India",
  "East India",
  "Central India",
  "North East",
  "Islands & UTs",
] as const;

function DestinationsCatalogPage() {
  const { data: services = [], isLoading } = useQuery(servicesQuery());
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [auditSearch, setAuditSearch] = useState("");

  // Enrich destination data with dynamic live listing counts from services & guides
  const enrichedDestinations = useMemo(() => {
    return DESTINATIONS_DATA.map((dest) => {
      const destServices = services.filter((s) => {
        const stateMatch = s.state && s.state.toLowerCase() === dest.state.toLowerCase();
        const destMatch = s.destination && s.destination.toLowerCase().includes(dest.name.toLowerCase());
        const cityMatch = s.city && dest.popular_cities.some((c) => c.toLowerCase() === s.city?.toLowerCase());
        return stateMatch || destMatch || cityMatch;
      });

      const hotelsCount = destServices.filter((s) =>
        ["hotel", "resort", "homestay", "heritage"].includes(s.category.toLowerCase())
      ).length;

      const diningCount = destServices.filter((s) =>
        ["restaurant", "dining", "culinary"].includes(s.category.toLowerCase())
      ).length;

      const toursCount = destServices.filter((s) =>
        ["tour", "activity", "adventure", "heritage"].includes(s.category.toLowerCase())
      ).length;

      const guidesCount = HUMAN_TOUR_GUIDES.filter((g) => {
        const stateMatch = g.state && g.state.toLowerCase() === dest.state.toLowerCase();
        const cityMatch = dest.popular_cities.some((c) => c.toLowerCase() === g.city?.toLowerCase());
        return stateMatch || cityMatch;
      }).length;

      const minPrice = destServices.length > 0
        ? Math.min(...destServices.map((s) => Number(s.price) || 999999))
        : 1200;

      return {
        ...dest,
        hotelsCount,
        diningCount,
        toursCount,
        guidesCount,
        minPrice: minPrice === 999999 ? 1200 : minPrice,
      };
    });
  }, [services]);

  // Filter destinations by search query and region
  const filteredDestinations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedDestinations.filter((dest) => {
      const matchesRegion = selectedRegion === "All" || dest.region === selectedRegion;
      const matchesSearch =
        !q ||
        dest.name.toLowerCase().includes(q) ||
        dest.state.toLowerCase().includes(q) ||
        dest.tagline.toLowerCase().includes(q) ||
        dest.popular_cities.some((c) => c.toLowerCase().includes(q)) ||
        dest.popular_attractions.some((a) => a.toLowerCase().includes(q));

      return matchesRegion && matchesSearch;
    });
  }, [enrichedDestinations, search, selectedRegion]);

  // Filter for audit matrix modal
  const filteredAudit = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return enrichedDestinations;
    return enrichedDestinations.filter(
      (d) => d.name.toLowerCase().includes(q) || d.state.toLowerCase().includes(q) || d.region.toLowerCase().includes(q)
    );
  }, [enrichedDestinations, auditSearch]);

  return (
    <PageShell
      eyebrow="Main Discovery Point"
      title="Destinations Worth Every Journey"
      subtitle="Select a destination to discover curated boutique stays, authentic regional dining, immersive local experiences, and verified human guides."
    >
      {/* Search & Region Filters & Coverage Audit trigger */}
      <div className="glass-card rounded-3xl p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search destination, state, city (e.g. Kerala, Munnar, Rajasthan, Goa, Kashmir)..."
              className="h-12 pl-12 pr-4 text-base rounded-full bg-background/70 border-border"
            />
          </div>

          {/* Admin / Developer Validation Audit Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-12 px-5 text-xs font-semibold shrink-0 gap-2 border-border/80 shadow-sm"
              >
                <FileSpreadsheet className="size-4 text-primary" />
                <span>Inventory Audit Matrix</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-6 rounded-3xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-500" />
                  Travezy Destination Content Matrix (Admin & Dev Verification)
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Live verification confirming that every destination meets the required inventory threshold (20+ Hotels, 20+ Restaurants, 20+ Experiences, and 3-4 Human Guides).
                </p>
              </DialogHeader>

              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Filter destinations in matrix..."
                  className="h-8 pl-9 text-xs rounded-full"
                />
              </div>

              <div className="overflow-auto mt-4 rounded-2xl border border-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/80 sticky top-0 backdrop-blur-md">
                    <tr className="border-b border-border text-foreground font-semibold">
                      <th className="p-3">Destination</th>
                      <th className="p-3 text-center">Hotels (Target ≥20)</th>
                      <th className="p-3 text-center">Restaurants (Target ≥20)</th>
                      <th className="p-3 text-center">Experiences (Target ≥20)</th>
                      <th className="p-3 text-center">Human Guides (3-4)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAudit.map((dest) => {
                      const meetsCriteria =
                        dest.hotelsCount >= 20 &&
                        dest.diningCount >= 20 &&
                        dest.toursCount >= 20 &&
                        dest.guidesCount >= 3;

                      return (
                        <tr key={dest.slug} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-semibold text-foreground">
                            {dest.name} <span className="text-[10px] text-muted-foreground font-normal">({dest.state})</span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-primary">
                            {dest.hotelsCount}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-accent">
                            {dest.diningCount}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-secondary-foreground">
                            {dest.toursCount}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-amber-600">
                            {dest.guidesCount}
                          </td>
                          <td className="p-3 text-center">
                            {meetsCriteria ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px] font-bold border-emerald-500/30">
                                <CheckCircle2 className="size-3 mr-1" /> Complete
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">
                                Below Target
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
            Regions:
          </span>
          {REGIONS.map((region) => (
            <Button
              key={region}
              size="sm"
              variant={selectedRegion === region ? "ocean" : "outline"}
              onClick={() => setSelectedRegion(region)}
              className="rounded-full text-xs shrink-0"
            >
              {region}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid of Destination Cards */}
      {isLoading ? (
        <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-4/5 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : filteredDestinations.length > 0 ? (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDestinations.map((dest, index) => (
            <Link
              key={dest.slug}
              to="/destinations/$destination"
              params={{ destination: dest.slug }}
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-card border border-border shadow-card transition-all duration-500 hover:-translate-y-2 hover:shadow-xl"
              style={{ animationDelay: `${Math.min(index, 9) * 50}ms` }}
            >
              {/* Image & Overlay */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                <img
                  src={dest.cover_image}
                  alt={`${dest.name}, ${dest.country}`}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                {/* Region & Featured Badges & Wishlist */}
                <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                  <Badge variant="secondary" className="backdrop-blur-md bg-black/40 text-white border-white/20 text-[11px] font-medium">
                    <MapPin className="size-3 mr-1 text-gold" />
                    {dest.region}
                  </Badge>

                  <div className="flex items-center gap-2">
                    {dest.featured && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold tracking-wider">
                        ★ Top Destination
                      </Badge>
                    )}
                    <WishlistButton
                      item={{
                        item_type: "destination",
                        item_id: dest.slug,
                        item_title: dest.name,
                        item_image: dest.cover_image,
                        item_category: "Destination",
                        destination: dest.name,
                        state: dest.state,
                        rating: 4.9,
                        metadata: { slug: dest.slug, region: dest.region },
                      }}
                    />
                  </div>
                </div>

                {/* Destination Name on Image */}
                <div className="absolute bottom-4 inset-x-4 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">
                    {dest.state} · {dest.country}
                  </p>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-white group-hover:text-primary-foreground">
                    {dest.name}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {dest.tagline}
                </p>

                {/* Popular Cities Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {dest.popular_cities.slice(0, 4).map((city) => (
                    <span
                      key={city}
                      className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                    >
                      {city}
                    </span>
                  ))}
                  {dest.popular_cities.length > 4 && (
                    <span className="inline-flex items-center rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      +{dest.popular_cities.length - 4} more
                    </span>
                  )}
                </div>

                {/* Exact Database Inventory Counters */}
                <div className="grid grid-cols-4 gap-1 rounded-2xl bg-muted/40 p-2.5 text-center text-xs">
                  <div className="flex flex-col items-center">
                    <Hotel className="size-3.5 text-primary mb-0.5" />
                    <span className="font-bold text-foreground">{dest.hotelsCount}</span>
                    <span className="text-[10px] text-muted-foreground">Stays</span>
                  </div>
                  <div className="flex flex-col items-center border-l border-border/50">
                    <Utensils className="size-3.5 text-accent mb-0.5" />
                    <span className="font-bold text-foreground">{dest.diningCount}</span>
                    <span className="text-[10px] text-muted-foreground">Dining</span>
                  </div>
                  <div className="flex flex-col items-center border-l border-border/50">
                    <Compass className="size-3.5 text-secondary-foreground mb-0.5" />
                    <span className="font-bold text-foreground">{dest.toursCount}</span>
                    <span className="text-[10px] text-muted-foreground">Tours</span>
                  </div>
                  <div className="flex flex-col items-center border-l border-border/50">
                    <Users className="size-3.5 text-gold mb-0.5" />
                    <span className="font-bold text-foreground">{dest.guidesCount}</span>
                    <span className="text-[10px] text-muted-foreground">Guides</span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Experiences from</span>
                    <p className="text-sm font-bold text-foreground">
                      {formatPrice(dest.minPrice, "INR")}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                    Explore Everything <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-16 rounded-3xl border border-dashed border-border p-12 text-center">
          <MapPin className="mx-auto size-10 text-muted-foreground/60 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No destinations found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            We couldn't find any destinations matching "{search}". Try searching for popular states like Kerala, Rajasthan, Goa, or Karnataka.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setSelectedRegion("All");
            }}
            className="mt-5 rounded-full"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </PageShell>
  );
}
