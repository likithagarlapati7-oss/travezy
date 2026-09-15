import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Navigation,
  MapPin,
  Hotel,
  Utensils,
  Compass,
  User,
  Star,
  ArrowDownUp,
  SlidersHorizontal,
  Layers,
  Map as MapIcon,
  Search,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGeolocation, PRESET_LOCATIONS } from "@/hooks/useGeolocation";
import { servicesQuery } from "@/lib/travezy";
import { HOTELS_AND_STAYS, type StaysListing } from "@/data/hotels-and-stays";
import { INDIAN_RESTAURANTS, type IndianRestaurantData } from "@/data/indian-restaurants";
import { TOURS_AND_EXPERIENCES, type ToursListing } from "@/data/tours-and-experiences";
import { HUMAN_TOUR_GUIDES, type HumanTourGuide } from "@/data/human-guides";
import { calculateDistanceKm, type GuideWithDistance } from "@/lib/guides";
import { MapboxMap, type ServiceMarker } from "@/components/MapboxMap";
import { GuideBookingModal } from "@/components/GuideBookingModal";
import { WishlistButton } from "@/components/WishlistButton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore-near-me")({
  head: () => ({
    meta: [
      { title: "Explore Near Me — Stays, Dining & Guides Nearby | Travezy" },
      {
        name: "description",
        content: "Find boutique hotels, authentic restaurants, adventure tours, and verified local human tour guides closest to your current location.",
      },
    ],
  }),
  component: ExploreNearMePage,
});

export type UnifiedListing = {
  id: string;
  type: "hotel" | "restaurant" | "experience" | "guide";
  title: string;
  description: string;
  categoryName: string;
  destination: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  price: number;
  currency: string;
  rating: number;
  review_count: number;
  image_url: string;
  is_active: boolean;
  // Category specific
  guide?: HumanTourGuide;
  hotel_type?: string;
  cuisine_type?: string;
  tour_type?: string;
  duration?: string;
};

export function ExploreNearMePage() {
  const {
    coords,
    locationName,
    loading: geoLoading,
    permissionStatus,
    errorMessage,
    requestLocation,
    setManualLocation,
    presetLocations,
  } = useGeolocation(true);

  // 1. Fetch live services from Supabase
  const { data: dbServices = [], isLoading: dbLoading } = useQuery(servicesQuery());

  // 2. UI State
  const [activeTab, setActiveTab] = useState<"all" | "hotels" | "restaurants" | "experiences" | "guides">("all");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [sortBy, setSortBy] = useState<"nearest" | "rating_desc" | "price_asc" | "reviews_desc">("nearest");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [manualSearchText, setManualSearchText] = useState("");

  // Guide booking modal
  const [bookingGuide, setBookingGuide] = useState<GuideWithDistance | null>(null);

  // 3. Fallback coordinate if location permission is not yet active: Kochi, Kerala
  const activeLat = coords?.lat ?? 9.9658;
  const activeLng = coords?.lng ?? 76.2421;
  const isActualGps = Boolean(coords);

  // 4. Combine and compute distance for all catalog items
  const allListings: UnifiedListing[] = useMemo(() => {
    const list: UnifiedListing[] = [];

    // 4.1 Hotels
    HOTELS_AND_STAYS.forEach((h) => {
      const dist = calculateDistanceKm(activeLat, activeLng, h.latitude, h.longitude);
      list.push({
        id: h.id,
        type: "hotel",
        title: h.title,
        description: h.description,
        categoryName: h.hotel_type || "Boutique Stay",
        destination: h.destination,
        city: h.city,
        state: h.state,
        latitude: h.latitude,
        longitude: h.longitude,
        distanceKm: dist,
        price: h.price,
        currency: h.currency || "INR",
        rating: h.rating || 4.8,
        review_count: h.review_count || 120,
        image_url: h.image_url,
        is_active: h.is_active,
        hotel_type: h.hotel_type,
      });
    });

    // 4.2 Restaurants
    INDIAN_RESTAURANTS.forEach((r) => {
      const dist = calculateDistanceKm(activeLat, activeLng, r.latitude, r.longitude);
      list.push({
        id: r.id,
        type: "restaurant",
        title: r.title,
        description: r.description,
        categoryName: `${r.cuisine_type || "Regional"} Cuisine`,
        destination: r.destination,
        city: r.city,
        state: r.state,
        latitude: r.latitude,
        longitude: r.longitude,
        distanceKm: dist,
        price: r.price,
        currency: r.currency || "INR",
        rating: r.rating || 4.7,
        review_count: r.review_count || 85,
        image_url: r.image_url,
        is_active: r.is_active,
        cuisine_type: r.cuisine_type,
      });
    });

    // 4.3 Experiences & Tours
    TOURS_AND_EXPERIENCES.forEach((t) => {
      const dist = calculateDistanceKm(activeLat, activeLng, t.latitude, t.longitude);
      list.push({
        id: t.id,
        type: "experience",
        title: t.title,
        description: t.description,
        categoryName: t.tour_type || "Eco Tour",
        destination: t.destination,
        city: t.city,
        state: t.state,
        latitude: t.latitude,
        longitude: t.longitude,
        distanceKm: dist,
        price: t.price,
        currency: t.currency || "INR",
        rating: t.rating || 4.9,
        review_count: t.review_count || 140,
        image_url: t.image_url,
        is_active: t.is_active,
        tour_type: t.tour_type,
        duration: t.duration,
      });
    });

    // 4.4 Human Tour Guides (Human guide profiles with privacy preservation)
    HUMAN_TOUR_GUIDES.forEach((g) => {
      const dist = calculateDistanceKm(activeLat, activeLng, g.latitude, g.longitude);
      list.push({
        id: g.id,
        type: "guide",
        title: g.name,
        description: g.bio,
        categoryName: `Local Guide • ${g.experience_years}y Exp`,
        destination: `${g.city}, ${g.state}`,
        city: g.city,
        state: g.state,
        latitude: g.latitude,
        longitude: g.longitude,
        distanceKm: dist,
        price: g.hourly_rate,
        currency: "INR",
        rating: g.rating,
        review_count: g.review_count,
        image_url: g.profile_image,
        is_active: g.active,
        guide: g,
      });
    });

    return list;
  }, [activeLat, activeLng]);

  // 5. Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let result = allListings.filter((item) => {
      // Category filter
      if (activeTab === "hotels" && item.type !== "hotel") return false;
      if (activeTab === "restaurants" && item.type !== "restaurant") return false;
      if (activeTab === "experiences" && item.type !== "experience") return false;
      if (activeTab === "guides" && item.type !== "guide") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCity = item.city.toLowerCase().includes(q);
        const matchesState = item.state.toLowerCase().includes(q);
        const matchesCategory = item.categoryName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCity && !matchesState && !matchesCategory) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    switch (sortBy) {
      case "nearest":
        return result.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
      case "rating_desc":
        return result.sort((a, b) => b.rating - a.rating);
      case "price_asc":
        return result.sort((a, b) => a.price - b.price);
      case "reviews_desc":
        return result.sort((a, b) => b.review_count - a.review_count);
      default:
        return result.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    }
  }, [allListings, activeTab, searchQuery, sortBy]);

  // 6. Map markers for all visible items
  const mapMarkers: ServiceMarker[] = useMemo(() => {
    return filteredAndSorted.slice(0, 100).map((item) => ({
      id: item.id,
      lat: item.latitude,
      lng: item.longitude,
      title: item.title,
      subtitle: `${item.city}, ${item.state}`,
      category: item.type,
      image_url: item.image_url,
      rating: item.rating,
      review_count: item.review_count,
      price: item.price,
      currency: item.currency,
      price_unit: item.type === "guide" ? "/ hr" : item.type === "hotel" ? "/ night" : "/ person",
      distance_km: item.distanceKm ? `${item.distanceKm.toFixed(1)} km away` : undefined,
      guideId: item.type === "guide" ? item.id : undefined,
      serviceId: item.type !== "guide" ? item.id : undefined,
    }));
  }, [filteredAndSorted]);

  const counts = useMemo(() => {
    return {
      all: allListings.length,
      hotels: allListings.filter((i) => i.type === "hotel").length,
      restaurants: allListings.filter((i) => i.type === "restaurant").length,
      experiences: allListings.filter((i) => i.type === "experience").length,
      guides: allListings.filter((i) => i.type === "guide").length,
    };
  }, [allListings]);

  const handleBookListing = (item: UnifiedListing) => {
    if (item.type === "guide" && item.guide) {
      setBookingGuide({
        ...item.guide,
        distanceKm: item.distanceKm,
        isWithinRadius: (item.distanceKm ?? 0) <= item.guide.service_radius_km,
      });
    }
  };

  const filteredPresetLocations = presetLocations.filter(
    (p) =>
      p.name.toLowerCase().includes(manualSearchText.toLowerCase()) ||
      p.state.toLowerCase().includes(manualSearchText.toLowerCase())
  );

  return (
    <PageShell
      eyebrow="Nearby Discovery"
      title="📍 Explore Near Me"
      subtitle="Discover boutique stays, iconic restaurants, unique local experiences, and verified human guides right around you."
    >
      {/* ── Geolocation Status & Manual Selector Header ───────────────────────── */}
      <div className="mb-8 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Navigation className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Current Location
                </span>
                {isActualGps && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-[10px] py-0 px-2">
                    GPS Active
                  </Badge>
                )}
              </div>
              <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="size-4 text-rose-500" />
                {locationName || "Kochi, Kerala"}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualPicker(!showManualPicker)}
              className="rounded-full text-xs gap-1.5 font-semibold"
            >
              <MapPin className="size-3.5 text-primary" /> Choose Location Manually
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={requestLocation}
              disabled={geoLoading}
              className="rounded-full text-xs gap-1.5 font-semibold"
            >
              <RefreshCw className={cn("size-3.5", geoLoading && "animate-spin")} />
              {geoLoading ? "Locating..." : "Refresh GPS"}
            </Button>
          </div>
        </div>

        {/* Permission Denied / Unavailable Alert (Graceful Fallback) */}
        {permissionStatus === "denied" && !coords && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-600 shrink-0" />
              <span>
                <strong>Location access is unavailable.</strong> Showing curated listings around{" "}
                <strong>Kochi, Kerala</strong>. You can switch to any city manually below.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowManualPicker(true)}
              className="rounded-full text-xs font-semibold bg-background shrink-0"
            >
              Choose City
            </Button>
          </div>
        )}

        {/* Manual Location Preset Dropdown / Picker */}
        {showManualPicker && (
          <div className="mt-5 pt-5 border-t border-border space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select a Tourist Hub in India
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManualPicker(false)}
                className="text-xs h-7"
              >
                Close
              </Button>
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={manualSearchText}
                onChange={(e) => setManualSearchText(e.target.value)}
                placeholder="Search city or state..."
                className="h-9 pl-9 pr-3 text-xs rounded-full"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1 max-h-40 overflow-y-auto">
              {filteredPresetLocations.map((p) => (
                <button
                  key={`${p.name}-${p.state}`}
                  type="button"
                  onClick={() => {
                    setManualLocation({ lat: p.lat, lng: p.lng }, `${p.name}, ${p.state}`);
                    setShowManualPicker(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                    locationName.includes(p.name)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted hover:bg-muted/80 text-foreground border-border"
                  )}
                >
                  📍 {p.name}, {p.state}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Filters & View Control Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
        {/* Category Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full lg:w-auto"
        >
          <TabsList className="grid grid-cols-3 sm:flex flex-wrap h-auto p-1 bg-muted rounded-xl gap-1">
            <TabsTrigger value="all" className="rounded-lg text-xs py-2 px-3">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="hotels" className="rounded-lg text-xs py-2 px-3 gap-1">
              <Hotel className="size-3.5 text-blue-500" /> Hotels ({counts.hotels})
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="rounded-lg text-xs py-2 px-3 gap-1">
              <Utensils className="size-3.5 text-amber-500" /> Dining ({counts.restaurants})
            </TabsTrigger>
            <TabsTrigger value="experiences" className="rounded-lg text-xs py-2 px-3 gap-1">
              <Compass className="size-3.5 text-emerald-500" /> Experiences ({counts.experiences})
            </TabsTrigger>
            <TabsTrigger value="guides" className="rounded-lg text-xs py-2 px-3 gap-1">
              <User className="size-3.5 text-purple-500" /> Guides ({counts.guides})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sorter, Search & View Mode Switch */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name..."
              className="h-9 pl-9 pr-3 text-xs rounded-full bg-background"
            />
          </div>

          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="h-9 w-44 rounded-full text-xs">
              <ArrowDownUp className="size-3.5 text-muted-foreground mr-1" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nearest">📍 Nearest First</SelectItem>
              <SelectItem value="rating_desc">★ Highest Rated</SelectItem>
              <SelectItem value="price_asc">₹ Lowest Price</SelectItem>
              <SelectItem value="reviews_desc">🔥 Most Popular</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center rounded-full border border-border p-0.5 bg-muted">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="size-3.5" /> Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors",
                viewMode === "map"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapIcon className="size-3.5" /> Map ({mapMarkers.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── View Mode: Interactive Map ────────────────────────────────────────── */}
      {viewMode === "map" && (
        <div className="mb-10 overflow-hidden rounded-3xl border border-border shadow-float">
          <div className="bg-muted/70 p-4 border-b border-border flex items-center justify-between">
            <div>
              <h4 className="font-display font-semibold text-foreground text-sm flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" /> Live Proximity Map
              </h4>
              <p className="text-xs text-muted-foreground">
                Showing {mapMarkers.length} verified listings near {locationName}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              Center: {activeLat.toFixed(2)}°N, {activeLng.toFixed(2)}°E
            </Badge>
          </div>
          <MapboxMap
            markers={mapMarkers}
            center={[activeLng, activeLat]}
            zoom={10}
            className="h-[520px] w-full"
            showSearchAreaButton={true}
          />
        </div>
      )}

      {/* ── View Mode: Listings Grid ─────────────────────────────────────────── */}
      {filteredAndSorted.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:shadow-card transition-all duration-300"
            >
              {/* Image & Badges */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Top Category Badge */}
                <div className="absolute top-3 left-3">
                  <Badge
                    className={cn(
                      "text-[11px] font-semibold",
                      item.type === "hotel" && "bg-blue-600/90 text-white",
                      item.type === "restaurant" && "bg-amber-600/90 text-white",
                      item.type === "experience" && "bg-emerald-600/90 text-white",
                      item.type === "guide" && "bg-purple-600/90 text-white"
                    )}
                  >
                    {item.type === "hotel" && "🏨 Hotel"}
                    {item.type === "restaurant" && "🍽️ Dining"}
                    {item.type === "experience" && "🎒 Experience"}
                    {item.type === "guide" && "👨‍🏫 Human Guide"}
                  </Badge>
                </div>

                {/* Wishlist Button */}
                <div className="absolute top-3 right-3">
                  <WishlistButton
                    item={{
                      item_type: item.type,
                      item_id: item.id,
                      item_title: item.title,
                      item_image: item.image_url,
                      item_category: item.categoryName,
                      destination: item.destination,
                      city: item.city,
                      state: item.state,
                      price: item.price,
                      currency: item.currency,
                      rating: item.rating,
                      review_count: item.review_count,
                    }}
                  />
                </div>

                {/* Distance Badge (Bottom Left) */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white">
                  {item.distanceKm !== null && (
                    <Badge className="bg-black/70 backdrop-blur-md text-sky-300 border-sky-400/40 text-xs font-bold gap-1">
                      <Navigation className="size-3" />
                      {item.distanceKm < 1
                        ? `${(item.distanceKm * 1000).toFixed(0)} m away`
                        : `${item.distanceKm.toFixed(1)} km away`}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content Body */}
              <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1.5">
                    <span className="font-semibold text-primary capitalize line-clamp-1">
                      {item.categoryName}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-foreground shrink-0">
                      <Star className="size-3 text-amber-500 fill-amber-500" />
                      {item.rating.toFixed(1)}
                      <span className="font-normal text-muted-foreground text-[11px]">
                        ({item.review_count})
                      </span>
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>

                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Human Guide Special Badges */}
                  {item.type === "guide" && item.guide && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                        ✓ Travezy Verified
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Radius: {item.guide.service_radius_km} km
                      </Badge>
                      {item.guide.languages.slice(0, 2).map((lang) => (
                        <Badge key={lang} variant="secondary" className="text-[10px]">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Price Tag */}
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    ₹{item.price.toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {item.type === "guide"
                        ? "/ hour"
                        : item.type === "hotel"
                          ? "/ night"
                          : "/ person"}
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl text-xs gap-1"
                  >
                    <Link
                      to={
                        item.type === "guide"
                          ? (`/guides/${item.id}` as any)
                          : (`/services/${item.id}` as any)
                      }
                    >
                      <ExternalLink className="size-3" /> View Details
                    </Link>
                  </Button>

                  {item.type === "guide" ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleBookListing(item)}
                      className="rounded-xl text-xs font-semibold px-4"
                    >
                      Book Guide
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      variant="default"
                      className="rounded-xl text-xs font-semibold px-4"
                    >
                      <Link to={`/services/${item.id}` as any}>
                        Book Now
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border p-12 text-center bg-card/50">
          <Navigation className="size-10 text-muted-foreground mb-3" />
          <h3 className="font-display text-lg font-bold text-foreground">No listings match your search</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search query or selecting a different location.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setActiveTab("all");
            }}
            className="mt-4 rounded-full text-xs"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Guide Booking Modal */}
      {bookingGuide && (
        <GuideBookingModal
          guide={bookingGuide}
          isOpen={Boolean(bookingGuide)}
          onClose={() => setBookingGuide(null)}
          onBookingSuccess={() => setBookingGuide(null)}
        />
      )}
    </PageShell>
  );
}
