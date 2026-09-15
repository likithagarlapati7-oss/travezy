import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Compass,
  Flame,
  Globe2,
  Heart,
  Hotel,
  LifeBuoy,
  MapPin,
  MapPinned,
  Search,
  Sparkles,
  Star,
  Users,
  Utensils,
  CheckCircle2,
} from "lucide-react";
import heroImage from "@/assets/hero-travel.jpg";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RecommendationCard, RecommendationCardSkeleton } from "@/components/RecommendationCard";
import { GuideCard } from "@/components/GuideCard";
import { GuideBookingModal } from "@/components/GuideBookingModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { servicesQuery, formatPrice } from "@/lib/travezy";
import { useUserInterests } from "@/hooks/useUserInterests";
import { HUMAN_TOUR_GUIDES } from "@/data/human-guides";
import { DESTINATIONS_DATA, type DestinationData } from "@/data/destinations-data";
import type { GuideWithDistance } from "@/lib/guides";
import {
  calculateBayesianScore,
  getHighlyRatedServices,
  getPersonalizedRecommendations,
  getPopularInLocation,
} from "@/lib/recommendations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Travezy — Explore Destinations, Stays, Dining & Local Guides" },
      {
        name: "description",
        content:
          "Choose a destination to uncover curated boutique stays, regional dining, authentic experiences, and verified local human guides across India.",
      },
      { property: "og:title", content: "Travezy — Destination-First Travel Platform" },
      {
        property: "og:description",
        content:
          "Explore Kerala, Rajasthan, Goa, Karnataka and all Indian destinations with verified hotels, dining, tours, and human guides.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

const FEATURED_DESTINATIONS_SLUGS = [
  "kerala",
  "rajasthan",
  "goa",
  "karnataka",
  "tamil-nadu",
  "himachal-pradesh",
  "maharashtra",
  "jammu-and-kashmir",
];

function Landing() {
  const navigate = useNavigate();
  const { data: services = [], isLoading } = useQuery(servicesQuery());
  const { interests } = useUserInterests();

  const [heroSearch, setHeroSearch] = useState("");
  const [selectedNearCity, setSelectedNearCity] = useState("Kochi");
  const [selectedGuideCity, setSelectedGuideCity] = useState("Kochi");
  const [selectedGuideForBooking, setSelectedGuideForBooking] = useState<GuideWithDistance | null>(null);

  // Featured destinations for main section
  const featuredDestinations = useMemo(() => {
    return FEATURED_DESTINATIONS_SLUGS.map((slug) =>
      DESTINATIONS_DATA.find((d) => d.slug === slug)
    ).filter((d): d is DestinationData => Boolean(d));
  }, []);

  // Filtered human guides near selected city
  const localGuides: GuideWithDistance[] = useMemo(() => {
    const list = HUMAN_TOUR_GUIDES.filter(
      (g) =>
        g.city.toLowerCase() === selectedGuideCity.toLowerCase() ||
        g.coverage_areas.some((area) => area.toLowerCase().includes(selectedGuideCity.toLowerCase()))
    );
    const guidesToUse = list.length > 0 ? list : HUMAN_TOUR_GUIDES.slice(0, 3);

    return guidesToUse.map((g) => ({
      ...g,
      distanceKm: null,
      isWithinRadius: true,
    }));
  }, [selectedGuideCity]);

  // Personalized Recommendations
  const personalized = useMemo(() => {
    return getPersonalizedRecommendations(services, interests, 6);
  }, [services, interests]);

  // Popular Near You (City Explorer)
  const popularNear = useMemo(() => {
    return getPopularInLocation(services, selectedNearCity, 4);
  }, [services, selectedNearCity]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroSearch.trim().toLowerCase();
    if (!q) {
      navigate({ to: "/destinations" });
      return;
    }

    const matchedDest = DESTINATIONS_DATA.find(
      (d) =>
        d.slug.includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.state.toLowerCase().includes(q) ||
        d.popular_cities.some((c) => c.toLowerCase().includes(q))
    );

    if (matchedDest) {
      navigate({ to: "/destinations/$destination", params: { destination: matchedDest.slug } });
    } else {
      navigate({ to: "/destinations" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar transparent />

      {/* ── Hero Section with Destination First Search ───────────────────────── */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <img
          src={heroImage}
          alt="Aerial view of a turquoise tropical coastline at golden hour"
          width={1920}
          height={1088}
          className="absolute inset-0 size-full object-cover scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-slate-950/75 to-slate-950/50" />

        <div className="relative mx-auto w-full max-w-7xl px-5 py-32 md:px-8">
          <div className="max-w-3xl animate-float-up space-y-6">
            <span className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-primary-foreground shadow-lg">
              <Sparkles className="size-3.5 text-gold" />
              Destination-First Travel Platform
            </span>

            <h1 className="text-5xl leading-[1.08] font-display font-bold text-primary-foreground md:text-7xl">
              Choose a Destination, <span className="text-gradient-gold">Explore Everything</span>
            </h1>

            <p className="max-w-2xl text-base sm:text-lg text-primary-foreground/90 font-medium leading-relaxed">
              Select your destination to uncover curated boutique stays, authentic regional dining,
              immersive local experiences, and verified human tour guides.
            </p>

            {/* Instant Destination Search Box */}
            <form onSubmit={handleHeroSearch} className="glass-panel p-2 rounded-3xl shadow-2xl flex flex-col sm:flex-row gap-2 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gold" />
                <Input
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Where to? (e.g. Kerala, Rajasthan, Goa, Manali, Kashmir)..."
                  className="h-12 pl-12 pr-4 text-base rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus-visible:ring-gold"
                />
              </div>
              <Button type="submit" variant="hero" size="lg" className="rounded-full h-12 px-6 text-sm gap-2">
                <Compass className="size-4" /> Explore Destination
              </Button>
            </form>

            {/* Quick Destination Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs uppercase tracking-wider text-white/70 font-semibold mr-1">
                Popular:
              </span>
              {[
                { name: "Kerala", slug: "kerala" },
                { name: "Rajasthan", slug: "rajasthan" },
                { name: "Goa", slug: "goa" },
                { name: "Karnataka", slug: "karnataka" },
                { name: "Tamil Nadu", slug: "tamil-nadu" },
                { name: "Himachal", slug: "himachal-pradesh" },
                { name: "Kashmir", slug: "jammu-and-kashmir" },
              ].map((dest) => (
                <Link
                  key={dest.slug}
                  to="/destinations/$destination"
                  params={{ destination: dest.slug }}
                  className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white hover:bg-gold hover:text-black transition-colors backdrop-blur-md border border-white/15"
                >
                  {dest.name}
                </Link>
              ))}
            </div>

            {/* Live Stats counters */}
            <dl className="pt-4 grid max-w-xl grid-cols-3 gap-3">
              {[
                { label: "Indian Destinations", value: "36 States & UTs", icon: MapPinned },
                { label: "Curated Listings", value: "300+ Verified", icon: Hotel },
                { label: "Verified Human Guides", value: "Available Daily", icon: Users },
              ].map((stat) => (
                <div key={stat.label} className="glass-panel rounded-2xl p-3.5 backdrop-blur-md">
                  <stat.icon className="size-4 text-gold mb-1" />
                  <dd className="font-display text-lg font-bold text-primary-foreground">
                    {stat.value}
                  </dd>
                  <dt className="text-[11px] text-primary-foreground/75 leading-tight">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── AI TRIP PLANNER BANNER & QUICK LAUNCHER ──────────────────────────── */}
      <section className="relative -mt-10 z-20 mx-auto max-w-7xl px-5 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-primary/95 to-slate-900 p-8 md:p-10 text-white shadow-2xl border border-white/15">
          <div className="absolute -right-20 -top-20 size-80 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-gold/20 blur-3xl" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3.5 py-1 text-xs font-semibold text-gold border border-gold/30">
                <Sparkles className="size-3.5" /> AI Trip Planner & My Itinerary
              </span>
              <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-white">
                Plan Your Perfect Indian Journey in Seconds
              </h2>
              <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-xl">
                Tell our AI your destination, dates, budget, and travel style. We craft a complete, grounded day-by-day itinerary with <strong>100% verified hotels, regional dining, top experiences, and local guides</strong>.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-medium text-white/90">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-400" /> Real Bookable Inventory</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-400" /> Interactive Day Timeline</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-400" /> Save & Customize</span>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-base flex items-center gap-2 text-white">
                <Compass className="size-4 text-gold" /> Quick Trip Launcher
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-white/70 block mb-1">Pick a Destination</label>
                  <select
                    id="homepage-planner-dest"
                    className="w-full bg-slate-900/90 text-white rounded-xl border border-white/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    defaultValue="kerala"
                  >
                    {DESTINATIONS_DATA.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {d.name} ({d.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/70 block mb-1">Duration</label>
                    <select
                      id="homepage-planner-days"
                      className="w-full bg-slate-900/90 text-white rounded-xl border border-white/20 px-3 py-2 text-sm focus:outline-none"
                      defaultValue="3"
                    >
                      {[1, 2, 3, 4, 5, 7, 10, 14].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "Day" : "Days"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/70 block mb-1">Budget</label>
                    <select
                      id="homepage-planner-budget"
                      className="w-full bg-slate-900/90 text-white rounded-xl border border-white/20 px-3 py-2 text-sm focus:outline-none"
                      defaultValue="moderate"
                    >
                      <option value="budget">Budget (Economy)</option>
                      <option value="moderate">Moderate (Standard)</option>
                      <option value="luxury">Luxury (Premium)</option>
                      <option value="ultra-luxury">Ultra Luxury</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  const destSelect = document.getElementById("homepage-planner-dest") as HTMLSelectElement | null;
                  const daysSelect = document.getElementById("homepage-planner-days") as HTMLSelectElement | null;
                  const budgetSelect = document.getElementById("homepage-planner-budget") as HTMLSelectElement | null;
                  const dest = destSelect?.value || "kerala";
                  const days = daysSelect?.value || "3";
                  const budget = budgetSelect?.value || "moderate";
                  navigate({
                    to: "/planner",
                    search: { destination: dest, days: Number(days), budgetTier: budget as any },
                  });
                }}
                className="w-full rounded-xl bg-gold hover:bg-gold/90 text-slate-950 font-bold py-3 text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Sparkles className="size-4" /> Start AI Trip Planner <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 1. EXPLORE DESTINATIONS IN INDIA (MAIN DISCOVERY SECTION) ─────────── */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8 space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary flex items-center gap-1.5">
              <Compass className="size-3.5 text-primary" /> The Main Discovery Hub
            </p>
            <h2 className="mt-2 text-3xl md:text-5xl font-display font-bold text-foreground">
              Explore Destinations in India
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
              Choose your destination first — then explore all boutique stays, regional restaurants,
              curated tourism experiences, and personal tour guides in one place.
            </p>
          </div>

          <Button asChild variant="ocean" size="lg" className="rounded-full gap-2">
            <Link to="/destinations">
              View All Destinations <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Featured Destination Cards Grid */}
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {featuredDestinations.map((dest, i) => (
            <Link
              key={dest.slug}
              to="/destinations/$destination"
              params={{ destination: dest.slug }}
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-card border border-border shadow-card transition-all duration-500 hover:-translate-y-2 hover:shadow-xl"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Cover Photo */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                <img
                  src={dest.cover_image}
                  alt={dest.name}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <Badge className="absolute top-3.5 left-3.5 bg-black/60 backdrop-blur-md text-white border-white/20 text-[10px]">
                  <MapPin className="size-2.5 mr-1 text-gold" />
                  {dest.state}
                </Badge>

                <div className="absolute bottom-3.5 inset-x-3.5 text-white">
                  <h3 className="font-display text-2xl font-bold tracking-tight text-white group-hover:text-primary-foreground">
                    {dest.name}
                  </h3>
                </div>
              </div>

              {/* Card Summary */}
              <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {dest.tagline}
                </p>

                {/* Subsections available */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] rounded-xl bg-muted/50 p-2 text-foreground font-medium">
                  <span className="flex items-center gap-1">🏨 Stays & Resorts</span>
                  <span className="flex items-center gap-1">🍴 Dining Spots</span>
                  <span className="flex items-center gap-1">🗺️ Eco Tours</span>
                  <span className="flex items-center gap-1 text-primary">👨‍🏫 Local Guides</span>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Explore {dest.name}</span>
                  <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 2. FIND LOCAL HUMAN GUIDES NEAR YOU ──────────────────────────────── */}
      <section className="bg-gradient-to-b from-primary/5 via-card to-background py-24 border-y border-border">
        <div className="mx-auto max-w-7xl px-5 md:px-8 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" /> Verified Personal Tour Guides
              </p>
              <h2 className="mt-2 text-3xl md:text-5xl font-display font-bold text-foreground">
                Find Local Guides Near You
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                Connect with authentic human tour guides for personalized storytelling, heritage walks,
                tea trail expeditions, and culinary adventures.
              </p>
            </div>

            <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5">
              <Link to="/tours">
                All India Guide Directory <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {/* Guide City Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs uppercase font-semibold text-muted-foreground shrink-0 mr-1">
              Select City:
            </span>
            {["Kochi", "Jaipur", "Goa", "Munnar", "Bengaluru", "Delhi", "Udaipur", "Manali", "Varanasi"].map(
              (city) => (
                <Button
                  key={city}
                  size="sm"
                  variant={selectedGuideCity.toLowerCase() === city.toLowerCase() ? "ocean" : "outline"}
                  onClick={() => setSelectedGuideCity(city)}
                  className="rounded-full text-xs shrink-0"
                >
                  <MapPin className="size-3 mr-1" />
                  {city}
                </Button>
              )
            )}
          </div>

          {/* Guide Cards Grid */}
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {localGuides.map((guide) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                onBookClick={(g) => setSelectedGuideForBooking(g)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. RECOMMENDED FOR YOU (PERSONALIZED CURATIONS) ──────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent flex items-center gap-1.5">
              <Heart className="size-3.5 fill-accent text-accent" />
              {interests.destinations.length > 0 ? "Tailored for your travels" : "Top verified picks"}
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-foreground">
              Recommended for You
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              {interests.destinations.length > 0
                ? `Curated based on your interest in ${interests.destinations.slice(0, 3).join(", ")}.`
                : "Handpicked stays, dining, and experiences with exceptional traveller reviews."}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5">
            <Link to="/services">
              Explore Marketplace <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <RecommendationCardSkeleton key={i} />)
            : personalized.map((s, i) => (
                <RecommendationCard
                  key={s.id}
                  service={s}
                  index={i}
                  highlightBadge={i === 0 ? "Top Pick" : undefined}
                />
              ))}
        </div>
      </section>

      {/* Guide Booking Modal when booked from homepage */}
      {selectedGuideForBooking && (
        <GuideBookingModal
          guide={selectedGuideForBooking}
          open={Boolean(selectedGuideForBooking)}
          onOpenChange={(open) => {
            if (!open) setSelectedGuideForBooking(null);
          }}
        />
      )}

      <Footer />
    </div>
  );
}
