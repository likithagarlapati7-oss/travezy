import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  ChefHat,
  Filter,
  LayoutGrid,
  Map,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Utensils,
  X,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ServiceCard, ServiceCardSkeleton } from "@/components/ServiceCard";
import { MapboxMap, type ServiceMarker } from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { servicesQuery, formatPrice, type ServiceWithProvider } from "@/lib/travezy";
import { getServiceCoordinates, hasMapboxToken } from "@/lib/mapbox";
import { cn } from "@/lib/utils";

// ── Search & Filter State ───────────────────────────────────────────────────

export type RestaurantFilters = {
  search: string;
  state: string;
  city: string;
  cuisine: string;
  maxPrice: string;
  minRating: string;
  sort: string;
  view: "list" | "map";
};

const INITIAL_FILTERS: RestaurantFilters = {
  search: "",
  state: "all",
  city: "all",
  cuisine: "all",
  maxPrice: "all",
  minRating: "all",
  sort: "recommended",
  view: "list",
};

const POPULAR_CUISINES = [
  "All Cuisines",
  "South Indian",
  "North Indian",
  "Awadhi",
  "Mughlai",
  "Bengali",
  "Rajasthani",
  "Gujarati",
  "Maharashtrian",
  "Kerala",
  "Andhra",
  "Chettinad",
  "Goan",
  "Kashmiri",
  "Assamese",
  "Odia",
  "Himachali",
  "Tibetan",
  "Seafood",
  "Pure Veg",
];

const PRICE_OPTIONS = [
  { label: "Any Price", value: "all" },
  { label: "Under ₹500", value: "500" },
  { label: "Under ₹1,000", value: "1000" },
  { label: "Under ₹1,500", value: "1500" },
];

const RATING_OPTIONS = [
  { label: "Any Rating", value: "all" },
  { label: "★ 4.5 & above", value: "4.5" },
  { label: "★ 4.7 & above", value: "4.7" },
  { label: "★ 4.8 & above", value: "4.8" },
];

// ── Route definition ────────────────────────────────────────────────────────

export const Route = createFileRoute("/restaurants")({
  head: () => ({
    meta: [
      { title: "Indian Restaurants Across 28 States & 8 UTs — Travezy" },
      {
        name: "description",
        content:
          "Explore authentic Indian culinary heritage. Discover over 100+ famous restaurants, regional thalis, iconic street eats, and fine dining across all 28 states and Union Territories of India.",
      },
      {
        property: "og:title",
        content: "Indian Restaurants Across 28 States & 8 UTs — Travezy",
      },
      {
        property: "og:description",
        content:
          "Discover authentic culinary traditions across India — Awadhi biryanis, Malabar seafood, Rajasthani thalis, Bengali delicacies, and Himalayan grills.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RestaurantsPage,
});

// ── Component ───────────────────────────────────────────────────────────────

function RestaurantsPage() {
  const [filters, setFilters] = useState<RestaurantFilters>(INITIAL_FILTERS);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { data, isLoading } = useQuery(servicesQuery(["restaurant"]));

  // Extract unique sorted states & cities from loaded restaurant services
  const allRestaurants = useMemo(() => data ?? [], [data]);

  const states = useMemo(() => {
    const set = new Set<string>();
    allRestaurants.forEach((r) => {
      if (r.state && r.state.trim()) set.add(r.state.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRestaurants]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    allRestaurants
      .filter((r) => filters.state === "all" || r.state === filters.state)
      .forEach((r) => {
        const c = r.city ?? r.destination;
        if (c && c.trim()) set.add(c.trim());
      });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRestaurants, filters.state]);

  const updateFilter = useCallback(
    <K extends keyof RestaurantFilters>(key: K, value: RestaurantFilters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        ...(key === "state" ? { city: "all" } : {}),
      }));
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  // Filter and sort the restaurant services
  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    const cuisine = filters.cuisine === "All Cuisines" ? "all" : filters.cuisine.toLowerCase();

    const list = allRestaurants.filter((s) => {
      if (filters.state !== "all" && s.state !== filters.state) return false;
      if (filters.city !== "all" && (s.city ?? s.destination) !== filters.city) return false;
      if (filters.maxPrice !== "all" && Number(s.price) > Number(filters.maxPrice)) return false;
      if (filters.minRating !== "all" && Number(s.rating) < Number(filters.minRating)) return false;

      // Cuisine filter check across title, description, and destination
      if (cuisine !== "all") {
        const text = `${s.title} ${s.description ?? ""} ${s.destination ?? ""}`.toLowerCase();
        if (cuisine === "pure veg") {
          if (!text.includes("veg") && !text.includes("thali") && !text.includes("bhojan")) return false;
        } else if (cuisine === "seafood") {
          if (!text.includes("fish") && !text.includes("crab") && !text.includes("prawn") && !text.includes("seafood") && !text.includes("coastal"))
            return false;
        } else if (!text.includes(cuisine)) {
          return false;
        }
      }

      if (!q) return true;
      const haystack = [s.title, s.description, s.destination, s.city, s.state, s.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    // Sorting
    switch (filters.sort) {
      case "price_asc":
        return list.sort((a, b) => a.price - b.price);
      case "price_desc":
        return list.sort((a, b) => b.price - a.price);
      case "rating_desc":
        return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      default: // "recommended"
        return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
  }, [allRestaurants, filters]);

  // Build Mapbox markers
  const mapMarkers: ServiceMarker[] = useMemo(() => {
    return filtered
      .map((s): ServiceMarker | null => {
        const coords = getServiceCoordinates(s);
        if (!coords) return null;
        return {
          id: s.id,
          lat: coords.lat,
          lng: coords.lng,
          title: s.title,
          subtitle: `${s.city ?? s.destination ?? "India"} • ${formatPrice(Number(s.price), s.currency)}`,
          category: s.category,
          serviceId: s.id,
        };
      })
      .filter((m): m is ServiceMarker => m !== null);
  }, [filtered]);

  const hasActiveFilters =
    filters.search ||
    filters.state !== "all" ||
    filters.city !== "all" ||
    filters.cuisine !== "all" ||
    filters.maxPrice !== "all" ||
    filters.minRating !== "all";

  return (
    <PageShell
      eyebrow="Culinary Journey Across India"
      title="Authentic Regional Dining"
      subtitle="Discover legendary restaurants, heritage thalis, royal Awadhi kebabs, coastal seafood, and street food institutions across all 28 states and Union Territories."
    >
      {/* ── Search & Filter Controls Header ── */}
      <div className="space-y-4">
        <div className="glass-card space-y-4 rounded-3xl p-5 shadow-card">
          {/* Main search bar & view toggle */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Search restaurant name, dish (Biryani, Dosa, Thali, Litti, Wazwan), state or city…"
                className="h-11 rounded-full pl-11 pr-10 text-sm"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => updateFilter("search", "")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* List / Map view toggle */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                size="sm"
                variant={filters.view === "list" ? "ocean" : "outline"}
                className="rounded-full"
                onClick={() => updateFilter("view", "list")}
              >
                <LayoutGrid className="mr-1.5 size-4" /> List ({filtered.length})
              </Button>
              <Button
                size="sm"
                variant={filters.view === "map" ? "ocean" : "outline"}
                className="rounded-full"
                onClick={() => updateFilter("view", "map")}
              >
                <Map className="mr-1.5 size-4" /> India Map
              </Button>
            </div>
          </div>

          {/* Detailed Filters Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {/* State Filter */}
            <Select value={filters.state} onValueChange={(v) => updateFilter("state", v)}>
              <SelectTrigger className="rounded-full text-xs font-medium">
                <SelectValue placeholder="All States & UTs" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">🇮🇳 All 28 States & 8 UTs</SelectItem>
                {states.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* City Filter */}
            <Select
              value={filters.city}
              onValueChange={(v) => updateFilter("city", v)}
              disabled={cities.length === 0}
            >
              <SelectTrigger className="rounded-full text-xs font-medium">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">📍 All Cities</SelectItem>
                {cities.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {ct}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Max Price Filter */}
            <Select value={filters.maxPrice} onValueChange={(v) => updateFilter("maxPrice", v)}>
              <SelectTrigger className="rounded-full text-xs font-medium">
                <SelectValue placeholder="Price range" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Rating Filter */}
            <Select value={filters.minRating} onValueChange={(v) => updateFilter("minRating", v)}>
              <SelectTrigger className="rounded-full text-xs font-medium">
                <SelectValue placeholder="Min rating" />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select value={filters.sort} onValueChange={(v) => updateFilter("sort", v)}>
              <SelectTrigger className="rounded-full text-xs font-medium">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">⭐ Top Rated</SelectItem>
                <SelectItem value="price_asc">💰 Price: Low to High</SelectItem>
                <SelectItem value="price_desc">💎 Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Cuisine Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cuisine:
            </span>
            {POPULAR_CUISINES.map((c) => {
              const active =
                (c === "All Cuisines" && filters.cuisine === "all") || filters.cuisine === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateFilter("cuisine", c === "All Cuisines" ? "all" : c)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Reset Filters Bar if Active */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
              <span>
                Found <strong className="text-foreground">{filtered.length}</strong> restaurants matching your criteria
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <RotateCcw className="size-3" /> Reset all filters
              </button>
            </div>
          )}
        </div>

        {/* ── Content View: Map or List ── */}
        {filters.view === "map" ? (
          <div className="space-y-4">
            <div className="glass-card overflow-hidden rounded-3xl p-3 shadow-card">
              <div className="h-[620px] w-full overflow-hidden rounded-2xl">
                <MapboxMap
                  markers={mapMarkers}
                  className="size-full"
                  height="h-[620px]"
                  center={[78.9629, 22.5937]}
                  zoom={4.5}
                />
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Click on any pin to view dining details, specialties, price, and reservation options.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)
                : filtered.map((restaurant, idx) => (
                    <ServiceCard key={restaurant.id} service={restaurant} index={idx} />
                  ))}
            </div>

            {!isLoading && filtered.length === 0 && (
              <div className="glass-card mx-auto max-w-md rounded-3xl p-10 text-center shadow-card">
                <Utensils className="mx-auto size-12 text-muted-foreground" />
                <h3 className="mt-4 font-display text-lg">No restaurants found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search terms, state selection, or cuisine filters.
                </p>
                <Button variant="outline" className="mt-6 rounded-full" onClick={resetFilters}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
