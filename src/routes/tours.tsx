import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Compass,
  Crosshair,
  Filter,
  Globe2,
  List,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/PageShell";
import { GuideCard } from "@/components/GuideCard";
import { GuideMap } from "@/components/GuideMap";
import { GuideBookingModal } from "@/components/GuideBookingModal";
import { ServiceCard } from "@/components/ServiceCard";
import {
  humanGuidesQuery,
  calculateDistanceKm,
  resolveLocationCoords,
  type GuideWithDistance,
  type HumanTourGuide,
} from "@/lib/guides";
import { POPULAR_LOCATIONS } from "@/data/human-guides";
import { TOURS_AND_EXPERIENCES } from "@/data/tours-and-experiences";
import { formatToursAsServices } from "@/lib/travezy";

export const Route = createFileRoute("/tours")({
  head: () => ({
    meta: [
      { title: "Find Nearby Tour Guides — Travezy" },
      {
        name: "description",
        content:
          "Connect with verified local human tour guides near you in real-time. Check availability, chat, and book personalized heritage, food, and adventure tours.",
      },
      { property: "og:title", content: "Find Nearby Human Tour Guides — Travezy" },
      {
        property: "og:description",
        content:
          "Connect with verified local human tour guides near you in real-time across India.",
      },
    ],
  }),
  component: HumanGuidesDiscoveryPage,
});

const POPULAR_LANGUAGES = [
  "All",
  "English",
  "Hindi",
  "Malayalam",
  "Tamil",
  "Kannada",
  "Telugu",
  "Bengali",
  "Marathi",
  "French",
  "German",
  "Spanish",
];

const CATEGORIES = [
  { id: "all", label: "All Categories", icon: "✨" },
  { id: "heritage", label: "Heritage & History", icon: "🏛" },
  { id: "food", label: "Food & Culinary", icon: "🍲" },
  { id: "nature", label: "Nature & Flora", icon: "🌿" },
  { id: "trekking", label: "Trekking & Trails", icon: "🥾" },
  { id: "culture", label: "Local Culture & Arts", icon: "🎨" },
  { id: "photography", label: "Photo Walks", icon: "📸" },
  { id: "night", label: "Night Tours", icon: "🌙" },
];

const DISTANCE_RADII = [
  { value: 5, label: "Within 5 km" },
  { value: 10, label: "Within 10 km" },
  { value: 25, label: "Within 25 km (Default)" },
  { value: 50, label: "Within 50 km" },
  { value: 100, label: "Within 100 km" },
];

function HumanGuidesDiscoveryPage() {
  // GPS State
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsCityName, setGpsCityName] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRadius, setSelectedRadius] = useState<number>(25);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "distance" | "rating" | "completed_tours" | "price_asc" | "experience"
  >("distance");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Booking Modal State
  const [selectedGuideForBooking, setSelectedGuideForBooking] = useState<HumanTourGuide | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Trigger GPS detection
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setGpsPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setGpsLocation({ lat, lng });
        setIsLocating(false);

        // Find closest recognized Indian destination for friendly display label
        let closestCity = "Your Current Location";
        let minDistance = Infinity;
        POPULAR_LOCATIONS.forEach((loc) => {
          const d = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
          if (d < minDistance) {
            minDistance = d;
            closestCity = minDistance <= 35 ? `${loc.city}, ${loc.state}` : "Detected GPS Location";
          }
        });

        setGpsCityName(closestCity);
        toast.success(`📍 Location detected: ${closestCity}`);
      },
      (error) => {
        setIsLocating(false);
        setGpsPermissionDenied(true);
        console.warn("GPS Permission denied or unavailable:", error.message);
        toast.info(
          "Location access denied. Please select or search your destination manually below.",
        );
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  // Auto-prompt once on mount if no location set yet
  useEffect(() => {
    const hasPrompted = sessionStorage.getItem("travezy_gps_prompted");
    if (!hasPrompted) {
      sessionStorage.setItem("travezy_gps_prompted", "true");
      requestLocation();
    }
  }, []);

  // Filter guides
  const filterParams = useMemo(
    () => ({
      userLat: gpsLocation?.lat,
      userLng: gpsLocation?.lng,
      radiusKm: selectedRadius,
      query: searchQuery,
      category: selectedCategory,
      language: selectedLanguage === "All" ? "all" : selectedLanguage,
      availableOnly,
      sortBy: gpsLocation ? sortBy : sortBy === "distance" ? "rating" : sortBy,
    }),
    [
      gpsLocation,
      selectedRadius,
      searchQuery,
      selectedCategory,
      selectedLanguage,
      availableOnly,
      sortBy,
    ],
  );

  const { data: guides = [], isLoading } = useQuery(humanGuidesQuery(filterParams));

  // Popular Places / Sights (Secondary content)
  const allSecondaryTours = useMemo(() => formatToursAsServices(), []);
  const nearbyPlaces = useMemo(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return allSecondaryTours
        .filter((t) => t.city?.toLowerCase().includes(q) || t.state?.toLowerCase().includes(q))
        .slice(0, 3);
    }
    if (gpsCityName) {
      const firstWord = gpsCityName.split(",")[0]?.trim().toLowerCase();
      const matched = allSecondaryTours.filter((t) => t.city?.toLowerCase().includes(firstWord || ""));
      if (matched.length > 0) return matched.slice(0, 3);
    }
    return allSecondaryTours.slice(0, 3);
  }, [searchQuery, gpsCityName, allSecondaryTours]);

  const handleSelectLocationChip = (loc: (typeof POPULAR_LOCATIONS)[number]) => {
    setGpsLocation({ lat: loc.lat, lng: loc.lng });
    setGpsCityName(loc.label);
    setSearchQuery("");
    toast.success(`📍 Searching guides near ${loc.label}`);
  };

  const clearLocation = () => {
    setGpsLocation(null);
    setGpsCityName(null);
    setSearchQuery("");
  };

  return (
    <PageShell
      eyebrow="Nearby Human Tour Guides"
      title="Where are you travelling?"
      subtitle="Find, chat with, and book verified local human guides near your location for personalized walking tours, food trails, and cultural immersions."
    >
      {/* ── 1. LOCATION DISCOVERY HERO / GPS CONTROLS ─────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/5 via-card to-background p-6 shadow-card md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Compass className="size-4" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Find a Tour Guide Near You
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground md:text-sm max-w-xl">
              {gpsLocation
                ? `Showing verified human guides near ${gpsCityName || "your location"} within ${selectedRadius} km.`
                : "Allow location access or select a popular destination to find trusted local experts around you."}
            </p>
          </div>

          {/* GPS Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {gpsLocation ? (
              <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary">
                <LocateFixed className="size-4 animate-pulse text-primary" />
                <span>{gpsCityName || "Current Location"}</span>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                  title="Clear location"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={requestLocation}
                disabled={isLocating}
                className="group relative flex items-center gap-2 rounded-2xl px-5 py-5 text-xs font-bold shadow-md"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Detecting Location…
                  </>
                ) : (
                  <>
                    <Crosshair className="size-4 transition-transform group-hover:rotate-45 text-white" />
                    Find Guides Near Me
                  </>
                )}
              </Button>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-2xl border border-border bg-card p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="size-3.5" />
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === "map"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapIcon className="size-3.5" />
                Map View
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar + Quick Destination Pills */}
        <div className="mt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, landmark, guide name (e.g. Fort Kochi, Jaipur, Munnar, Goa, Hampi)..."
              className="h-11 rounded-2xl bg-background pl-10 pr-10 text-xs shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Quick Destination Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Popular Destinations:
            </span>
            {POPULAR_LOCATIONS.slice(0, 8).map((loc) => (
              <button
                key={loc.city}
                type="button"
                onClick={() => handleSelectLocationChip(loc)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  gpsCityName?.includes(loc.city)
                    ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                    : "border-border/80 bg-background/80 text-foreground hover:border-primary/50 hover:bg-card"
                }`}
              >
                📍 {loc.city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. FILTERS & SORTING BAR ───────────────────────────────────────── */}
      <section className="mt-8 space-y-4">
        {/* Category Horizontal Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-border/80 hover:bg-muted/40"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Secondary Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Distance Radius */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground/70">Radius:</span>
              <select
                value={selectedRadius}
                onChange={(e) => setSelectedRadius(Number(e.target.value))}
                className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-hidden"
              >
                {DISTANCE_RADII.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div className="flex items-center gap-1.5">
              <Globe2 className="size-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground/70">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-hidden"
              >
                {POPULAR_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Available Today Toggle */}
            <button
              type="button"
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                availableOnly
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 font-semibold"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              Available Today Only
            </button>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground/70">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-hidden"
            >
              <option value="distance">📍 Distance (Closest First)</option>
              <option value="rating">⭐ Highest Rated</option>
              <option value="completed_tours">🏆 Most Tours Led</option>
              <option value="price_asc">💵 Price: Low to High</option>
              <option value="experience">🎓 Years of Experience</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── 3. RESULTS DISPLAY (GRID OR MAP) ──────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Available Human Guides
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({guides.length} {guides.length === 1 ? "guide" : "guides"} found)
              </span>
            </h3>
            {gpsCityName && (
              <p className="text-xs text-muted-foreground">
                Displaying local tour guides within {selectedRadius} km of {gpsCityName}
              </p>
            )}
          </div>
        </div>

        {viewMode === "map" ? (
          /* Interactive Map View */
          <div className="space-y-6">
            <GuideMap
              guides={guides}
              userLocation={gpsLocation}
              height="h-[520px]"
              onGuideSelect={(g) => {
                setSelectedGuideForBooking(g);
                setBookingModalOpen(true);
              }}
            />

            {/* Compact Grid Below Map */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  onBookClick={(g) => {
                    setSelectedGuideForBooking(g);
                    setBookingModalOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          /* List / Grid View */
          <>
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-80 animate-pulse rounded-3xl border border-border bg-card p-6"
                  />
                ))}
              </div>
            ) : guides.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {guides.map((guide) => (
                  <GuideCard
                    key={guide.id}
                    guide={guide}
                    onBookClick={(g) => {
                      setSelectedGuideForBooking(g);
                      setBookingModalOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center space-y-3">
                <Compass className="size-12 text-primary/40" />
                <h4 className="text-base font-bold text-foreground">No Tour Guides Found</h4>
                <p className="text-xs text-muted-foreground max-w-md">
                  No human guides currently match your selected filters or distance radius. Try
                  expanding the distance radius to 50 km or searching for another city like Fort
                  Kochi, Jaipur, Munnar, or Goa.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRadius(50);
                      setSelectedLanguage("All");
                      setSelectedCategory("all");
                      setSearchQuery("");
                    }}
                    className="rounded-xl text-xs"
                  >
                    Reset Filters
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSelectLocationChip(POPULAR_LOCATIONS[0]!)}
                    className="rounded-xl text-xs"
                  >
                    Browse Kochi Guides
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── 4. SECONDARY SECTION: POPULAR SIGHTS & EXPERIENCES ─────────────── */}
      {nearbyPlaces.length > 0 && (
        <section className="mt-16 border-t border-border/80 pt-12 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Attractions & Landmarks
              </span>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Popular Places & Sights Near You
              </h3>
              <p className="text-xs text-muted-foreground">
                Top tourist destinations you can explore with a personal guide.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
              <Link to="/destinations">Explore Sights →</Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {nearbyPlaces.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Guide Booking Modal */}
      <GuideBookingModal
        guide={selectedGuideForBooking}
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
      />
    </PageShell>
  );
}
