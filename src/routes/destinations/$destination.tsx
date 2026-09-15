import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  ExternalLink,
  Flame,
  Globe2,
  Heart,
  Hotel,
  Layers,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  SunMedium,
  Umbrella,
  User,
  Utensils,
  Wifi,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
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
import { GuideCard } from "@/components/GuideCard";
import { GuideBookingModal } from "@/components/GuideBookingModal";
import { InteractiveDestinationMap } from "@/components/InteractiveDestinationMap";
import { WishlistButton } from "@/components/WishlistButton";
import { type ServiceMarker } from "@/components/MapboxMap";
import { servicesQuery, formatPrice, type ServiceWithProvider } from "@/lib/travezy";
import { HOTELS_AND_STAYS, type StaysListing } from "@/data/hotels-and-stays";
import { INDIAN_RESTAURANTS, type IndianRestaurantData } from "@/data/indian-restaurants";
import { TOURS_AND_EXPERIENCES, type ToursListing } from "@/data/tours-and-experiences";
import { HUMAN_TOUR_GUIDES, type HumanTourGuide } from "@/data/human-guides";
import { getDestinationBySlug, type DestinationData } from "@/data/destinations-data";
import { getServiceCoordinates } from "@/lib/mapbox";
import { GuideWithDistance } from "@/lib/guides";
import { WeatherWidget } from "@/components/WeatherWidget";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/destinations/$destination")({
  head: ({ params }) => {
    const dest = getDestinationBySlug(params.destination);
    const title = dest
      ? `${dest.name} Travel Guide — Hotels, Restaurants, Tours & Local Guides`
      : "Destination Guide — Travezy";
    const desc = dest
      ? `Explore everything in ${dest.name}, ${dest.country}. Book boutique hotels, taste regional cuisines, experience guided eco-tours, and connect with verified local tour guides.`
      : "Explore travel services, stays, dining, and human guides for this destination.";

    return {
      meta: [
        { title: `${title} | Travezy` },
        { name: "description", content: desc },
        { property: "og:title", content: `${title} | Travezy` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DestinationDetailPage,
});

const PREVIEW_LIMIT = 6;
const GUIDE_PREVIEW_LIMIT = 4;

function DestinationDetailPage() {
  const { destination: destinationSlug } = Route.useParams();
  const navigate = useNavigate();

  // 1. Resolve destination metadata
  const destinationData: DestinationData = useMemo(() => {
    const found = getDestinationBySlug(destinationSlug);
    if (found) return found;

    // Fallback if accessed via direct custom name
    const formattedName = destinationSlug
      .split("-")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return {
      slug: destinationSlug,
      name: formattedName,
      state: formattedName,
      country: "India",
      region: "South India",
      tagline: `Discover the best of ${formattedName} — Curated Stays, Dining, Tours & Guides`,
      description: `Experience the beauty, culture, and authentic hospitality of ${formattedName}. Explore top-rated hotels, regional restaurants, unforgettable excursions, and hire verified local human tour guides.`,
      cover_image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1600&q=80",
      popular_cities: [formattedName],
      best_time_to_visit: "October to March",
      climate: "Pleasant seasonal climate with refreshing breezes",
      ideal_duration: "4 to 7 Days",
      popular_attractions: ["Scenic Landscapes", "Local Heritage Trails", "Culinary Hotspots", "Cultural Centres"],
      culture_and_cuisine: "Rich regional traditions and authentic local recipes.",
      latitude: 10.8505,
      longitude: 76.2711,
    };
  }, [destinationSlug]);

  // 2. Fetch live services from Supabase query
  const { data: allServices = [], isLoading } = useQuery(servicesQuery());

  // 3. Section Expansion State (Prevents 75+ cards rendered simultaneously on initial load)
  const [expandHotels, setExpandHotels] = useState(false);
  const [expandRestaurants, setExpandRestaurants] = useState(false);
  const [expandTours, setExpandTours] = useState(false);
  const [expandGuides, setExpandGuides] = useState(false);

  // Selected guide for booking modal
  const [selectedGuideForBooking, setSelectedGuideForBooking] = useState<GuideWithDistance | null>(null);

  // 4. Matcher strictly for this destination
  const isDestinationMatch = (item: { state?: string | null; destination?: string | null; city?: string | null }) => {
    const destStateLower = destinationData.state.toLowerCase();
    const destNameLower = destinationData.name.toLowerCase();

    const stateMatch = item.state && item.state.toLowerCase() === destStateLower;
    const destMatch = item.destination && item.destination.toLowerCase().includes(destNameLower);
    const cityMatch =
      item.city && destinationData.popular_cities.some((c) => c.toLowerCase() === item.city?.toLowerCase());

    return Boolean(stateMatch || destMatch || cityMatch);
  };

  // 4.1 All Hotels belonging to this destination
  const destinationHotels = useMemo(() => {
    const staticMatches = HOTELS_AND_STAYS.filter(isDestinationMatch);
    const dbMatches = allServices
      .filter((s) => ["hotel", "resort", "homestay", "heritage"].includes(s.category.toLowerCase()) && isDestinationMatch(s))
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description || "",
        category: "hotel" as const,
        hotel_type: "Boutique Stay",
        star_rating: 4.8,
        destination: s.destination,
        city: s.city || destinationData.name,
        state: s.state || destinationData.state,
        country: "India" as const,
        price: Number(s.price) || 4500,
        currency: "INR" as const,
        rating: Number(s.rating) || 4.8,
        review_count: s.review_count || 45,
        latitude: s.latitude || destinationData.latitude,
        longitude: s.longitude || destinationData.longitude,
        image_url: s.image_url || destinationData.cover_image,
        is_active: s.is_active,
        max_guests: 4,
        amenities: ["Free High-Speed WiFi", "Room Service", "Breakfast Included"],
        check_in_time: "14:00",
        check_out_time: "11:00",
        cancellation_policy: "Free cancellation up to 24h prior",
        nearby_attractions: destinationData.popular_attractions,
      }));

    // Merge unique by title/id
    const combined = [...staticMatches];
    dbMatches.forEach((dbItem) => {
      if (!combined.some((c) => c.id === dbItem.id || c.title.toLowerCase() === dbItem.title.toLowerCase())) {
        combined.push(dbItem);
      }
    });
    return combined;
  }, [allServices, destinationData]);

  // 4.2 All Restaurants belonging to this destination
  const destinationRestaurants = useMemo(() => {
    const staticMatches = INDIAN_RESTAURANTS.filter(isDestinationMatch);
    const dbMatches = allServices
      .filter((s) => ["restaurant", "dining", "culinary"].includes(s.category.toLowerCase()) && isDestinationMatch(s))
      .map((s) => ({
        id: s.id,
        title: s.title,
        category: "restaurant" as const,
        destination: s.destination,
        city: s.city || destinationData.name,
        state: s.state || destinationData.state,
        country: "India" as const,
        description: s.description || "",
        price: Number(s.price) || 600,
        currency: "INR" as const,
        rating: Number(s.rating) || 4.7,
        review_count: s.review_count || 80,
        latitude: s.latitude || destinationData.latitude,
        longitude: s.longitude || destinationData.longitude,
        image_url: s.image_url || destinationData.cover_image,
        is_active: s.is_active,
        max_guests: 8,
        cuisine_type: `${destinationData.name} Regional Cuisine`,
      }));

    const combined = [...staticMatches];
    dbMatches.forEach((dbItem) => {
      if (!combined.some((c) => c.id === dbItem.id || c.title.toLowerCase() === dbItem.title.toLowerCase())) {
        combined.push(dbItem);
      }
    });
    return combined;
  }, [allServices, destinationData]);

  // 4.3 All Tours & Experiences belonging to this destination
  const destinationTours = useMemo(() => {
    const staticMatches = TOURS_AND_EXPERIENCES.filter(isDestinationMatch);
    const dbMatches = allServices
      .filter((s) => ["tour", "activity", "adventure", "heritage", "experience"].includes(s.category.toLowerCase()) && isDestinationMatch(s))
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description || "",
        category: "tour" as const,
        tour_type: "Guided Experience",
        destination: s.destination,
        city: s.city || destinationData.name,
        state: s.state || destinationData.state,
        country: "India" as const,
        duration: "4 - 6 Hours",
        price: Number(s.price) || 1800,
        currency: "INR" as const,
        rating: Number(s.rating) || 4.8,
        review_count: s.review_count || 95,
        latitude: s.latitude || destinationData.latitude,
        longitude: s.longitude || destinationData.longitude,
        image_url: s.image_url || destinationData.cover_image,
        is_active: s.is_active,
        max_guests: 12,
        included: ["Local Guide", "Entry Tickets", "Refreshments"],
        excluded: ["Personal expenses"],
        starting_location: s.city || destinationData.name,
        guide_languages: ["English", "Hindi"],
        cancellation_policy: "Free cancellation up to 24h prior",
      }));

    const combined = [...staticMatches];
    dbMatches.forEach((dbItem) => {
      if (!combined.some((c) => c.id === dbItem.id || c.title.toLowerCase() === dbItem.title.toLowerCase())) {
        combined.push(dbItem);
      }
    });
    return combined;
  }, [allServices, destinationData]);

  // 4.4 All Human Guides covering this destination
  const destinationGuides: GuideWithDistance[] = useMemo(() => {
    return HUMAN_TOUR_GUIDES.filter((g) => {
      const stateMatch = g.state && g.state.toLowerCase() === destinationData.state.toLowerCase();
      const cityMatch = destinationData.popular_cities.some((c) => c.toLowerCase() === g.city.toLowerCase());
      const coverageMatch = g.coverage_areas.some(
        (area) =>
          area.toLowerCase().includes(destinationData.name.toLowerCase()) ||
          destinationData.popular_cities.some((c) => area.toLowerCase().includes(c.toLowerCase()))
      );
      return stateMatch || cityMatch || coverageMatch;
    }).map((g) => ({
      ...g,
      distanceKm: null,
      isWithinRadius: true,
    }));
  }, [destinationData]);

  // 4.5 All Markers for the Interactive Map
  const mapMarkers: ServiceMarker[] = useMemo(() => {
    const list: ServiceMarker[] = [];

    // Hotels
    destinationHotels.forEach((h) => {
      list.push({
        id: h.id,
        lat: h.latitude,
        lng: h.longitude,
        title: h.title,
        subtitle: `${h.city}, ${h.state}`,
        category: "hotel",
        image_url: h.image_url,
        rating: h.rating,
        review_count: h.review_count,
        price: h.price,
        currency: h.currency,
        price_unit: "/ night",
        serviceId: h.id,
      });
    });

    // Restaurants
    destinationRestaurants.forEach((r) => {
      list.push({
        id: r.id,
        lat: r.latitude,
        lng: r.longitude,
        title: r.title,
        subtitle: `${r.city}, ${r.state}`,
        category: "restaurant",
        image_url: r.image_url,
        rating: r.rating,
        review_count: r.review_count,
        price: r.price,
        currency: r.currency,
        price_unit: "/ person",
        serviceId: r.id,
      });
    });

    // Experiences
    destinationTours.forEach((t) => {
      list.push({
        id: t.id,
        lat: t.latitude,
        lng: t.longitude,
        title: t.title,
        subtitle: `${t.city}, ${t.state}`,
        category: "experience",
        image_url: t.image_url,
        rating: t.rating,
        review_count: t.review_count,
        price: t.price,
        currency: t.currency,
        price_unit: "/ person",
        serviceId: t.id,
      });
    });

    // Human Guides (Remain Human Guide profiles)
    destinationGuides.forEach((g) => {
      list.push({
        id: g.id,
        lat: g.latitude,
        lng: g.longitude,
        title: g.name,
        subtitle: `Local Guide • ${g.city}`,
        category: "guide",
        image_url: g.profile_image,
        rating: g.rating,
        review_count: g.review_count,
        price: g.hourly_rate,
        currency: "INR",
        price_unit: "/ hr",
        guideId: g.id,
        languages: g.languages,
        available_today: g.available_today,
      });
    });

    return list;
  }, [destinationHotels, destinationRestaurants, destinationTours, destinationGuides]);

  const scrollToMap = () => {
    const el = document.getElementById("destination-map");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const visibleHotels = expandHotels ? destinationHotels : destinationHotels.slice(0, PREVIEW_LIMIT);
  const visibleRestaurants = expandRestaurants ? destinationRestaurants : destinationRestaurants.slice(0, PREVIEW_LIMIT);
  const visibleTours = expandTours ? destinationTours : destinationTours.slice(0, PREVIEW_LIMIT);
  const visibleGuides = expandGuides ? destinationGuides : destinationGuides.slice(0, GUIDE_PREVIEW_LIMIT);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ─── 1. DESTINATION HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 text-white min-h-[500px] flex items-end">
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={destinationData.cover_image}
            alt={destinationData.name}
            className="size-full object-cover object-center transform scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/40" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs font-semibold text-white/70 mb-4">
            <Link
              to="/destinations"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="size-3.5" /> All Destinations
            </Link>
            <span>/</span>
            <span className="text-white">{destinationData.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              {/* Region Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/90 hover:bg-primary text-white font-semibold text-xs px-3 py-1 rounded-full border-none shadow-sm">
                  {destinationData.region}
                </Badge>
                <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs px-3 py-1 rounded-full">
                  📍 {destinationData.state}, {destinationData.country}
                </Badge>
              </div>

              {/* Title & Tagline */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-md">
                {destinationData.name}
              </h1>

              <p className="text-base sm:text-lg text-white/90 font-medium leading-relaxed drop-shadow-sm">
                {destinationData.tagline}
              </p>

              {/* Quick Metadata Stats */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold text-white/80">
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Calendar className="size-3.5 text-sky-400" />
                  <span>Best Time: {destinationData.best_time_to_visit}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Clock className="size-3.5 text-amber-400" />
                  <span>Ideal: {destinationData.ideal_duration}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <SunMedium className="size-3.5 text-emerald-400" />
                  <span className="truncate max-w-[200px]">{destinationData.climate}</span>
                </div>
                <WeatherWidget
                  destinationName={destinationData.name}
                  latitude={destinationData.latitude}
                  longitude={destinationData.longitude}
                  variant="compact"
                />
              </div>
            </div>

            {/* Action Buttons: Plan My Trip + Explore on Map + Wishlist */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <Button
                asChild
                size="lg"
                className="rounded-full font-bold text-sm shadow-xl px-6 bg-gradient-to-r from-sky-500 to-primary hover:from-sky-600 hover:to-primary/90 text-white"
              >
                <Link to={`/planner?destination=${destinationData.slug}` as any}>
                  <Sparkles className="size-4 mr-2" /> ✨ Plan My Trip
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={scrollToMap}
                className="rounded-full font-bold text-sm backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border-white/25 shadow-lg"
              >
                <MapIcon className="size-4 mr-2 text-sky-300" /> 🗺️ Explore on Map
              </Button>

              {/* Wishlist Save Button for this destination */}
              <WishlistButton
                item={{
                  item_type: "destination",
                  item_id: destinationData.slug,
                  item_title: destinationData.name,
                  item_image: destinationData.cover_image,
                  item_category: "Destination",
                  destination: destinationData.name,
                  state: destinationData.state,
                  rating: 4.9,
                  metadata: { slug: destinationData.slug, region: destinationData.region },
                }}
                variant="hero"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        {/* ── Overview & Culture Highlight ────────────────────────────────────── */}
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                About {destinationData.name}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {destinationData.description}
              </p>

              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Utensils className="size-3.5 text-primary" /> Culinary & Cultural Heritage
                </h4>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed bg-muted/50 p-3.5 rounded-2xl border border-border/60">
                  {destinationData.culture_and_cuisine}
                </p>
              </div>
            </div>

            {/* Attractions List */}
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-5 space-y-3">
              <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" /> Must-See Highlights
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {destinationData.popular_attractions.map((attraction, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">{attraction}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Live Weather & Smart Recommendations ─────────────────────────────── */}
        <section className="space-y-4">
          <WeatherWidget
            destinationName={destinationData.name}
            latitude={destinationData.latitude}
            longitude={destinationData.longitude}
            variant="hero"
            showExperiences={true}
          />
        </section>

        {/* ─── 2. HOTELS & STAYS (6-8 preview cards) ──────────────────────────── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
                <Hotel className="size-4" /> Stays & Accommodations
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Hotels & Stays in {destinationData.name}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Handpicked boutique hotels, heritage havelis, serene resorts, and homestays.
              </p>
            </div>

            {destinationHotels.length > PREVIEW_LIMIT && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandHotels(!expandHotels)}
                className="rounded-full text-xs font-semibold self-start sm:self-auto gap-1"
              >
                {expandHotels ? (
                  <>Show Less <ChevronUp className="size-3.5" /></>
                ) : (
                  <>View All Hotels ({destinationHotels.length}) <ChevronDown className="size-3.5" /></>
                )}
              </Button>
            )}
          </div>

          {visibleHotels.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:shadow-card transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                    <img
                      src={hotel.image_url}
                      alt={hotel.title}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3">
                      <Badge className="bg-blue-600/90 text-white text-[11px] font-semibold">
                        {hotel.hotel_type}
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3">
                      <WishlistButton
                        item={{
                          item_type: "hotel",
                          item_id: hotel.id,
                          item_title: hotel.title,
                          item_image: hotel.image_url,
                          item_category: hotel.hotel_type,
                          destination: hotel.destination,
                          city: hotel.city,
                          state: hotel.state,
                          price: hotel.price,
                          rating: hotel.rating,
                          review_count: hotel.review_count,
                        }}
                      />
                    </div>

                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="text-xs font-medium flex items-center gap-1 drop-shadow-sm">
                        <MapPin className="size-3 text-sky-400" /> {hotel.city || hotel.destination}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5 space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-semibold text-primary">{hotel.star_rating}★ Rating</span>
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          ★ {hotel.rating.toFixed(1)} ({hotel.review_count})
                        </span>
                      </div>

                      <h3 className="font-display font-bold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors">
                        {hotel.title}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {hotel.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {hotel.amenities.slice(0, 3).map((a) => (
                          <Badge key={a} variant="secondary" className="text-[10px] px-2 py-0.5">
                            {a}
                          </Badge>
                        ))}
                      </div>

                      <p className="mt-3 text-base font-extrabold text-foreground">
                        ₹{hotel.price.toLocaleString("en-IN")}{" "}
                        <span className="text-xs font-normal text-muted-foreground">/ night</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                      <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl text-xs gap-1">
                        <Link to={`/services/${hotel.id}` as any}>
                          <ExternalLink className="size-3" /> View Details
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="default" className="rounded-xl text-xs font-semibold px-4">
                        <Link to={`/services/${hotel.id}` as any}>
                          Book Now
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No hotels listed yet for {destinationData.name}.</p>
          )}
        </section>

        {/* ─── 3. RESTAURANTS & DINING (6-8 preview cards) ─────────────────────── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
                <Utensils className="size-4" /> Authentic Dining
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Restaurants & Regional Dining
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Savour traditional delicacies and culinary hotspots across {destinationData.name}.
              </p>
            </div>

            {destinationRestaurants.length > PREVIEW_LIMIT && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandRestaurants(!expandRestaurants)}
                className="rounded-full text-xs font-semibold self-start sm:self-auto gap-1"
              >
                {expandRestaurants ? (
                  <>Show Less <ChevronUp className="size-3.5" /></>
                ) : (
                  <>View All Restaurants ({destinationRestaurants.length}) <ChevronDown className="size-3.5" /></>
                )}
              </Button>
            )}
          </div>

          {visibleRestaurants.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:shadow-card transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.title}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3">
                      <Badge className="bg-amber-600/90 text-white text-[11px] font-semibold">
                        {restaurant.cuisine_type}
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3">
                      <WishlistButton
                        item={{
                          item_type: "restaurant",
                          item_id: restaurant.id,
                          item_title: restaurant.title,
                          item_image: restaurant.image_url,
                          item_category: restaurant.cuisine_type,
                          destination: restaurant.destination,
                          city: restaurant.city,
                          state: restaurant.state,
                          price: restaurant.price,
                          rating: restaurant.rating,
                          review_count: restaurant.review_count,
                        }}
                      />
                    </div>

                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="text-xs font-medium flex items-center gap-1 drop-shadow-sm">
                        <MapPin className="size-3 text-amber-400" /> {restaurant.city}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5 space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">Authentic Flavours</span>
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          ★ {restaurant.rating.toFixed(1)} ({restaurant.review_count})
                        </span>
                      </div>

                      <h3 className="font-display font-bold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors">
                        {restaurant.title}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {restaurant.description}
                      </p>

                      <p className="mt-3 text-base font-extrabold text-foreground">
                        ₹{restaurant.price.toLocaleString("en-IN")}{" "}
                        <span className="text-xs font-normal text-muted-foreground">/ average 2 persons</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                      <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl text-xs gap-1">
                        <Link to={`/services/${restaurant.id}` as any}>
                          <ExternalLink className="size-3" /> View Details
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="default" className="rounded-xl text-xs font-semibold px-4">
                        <Link to={`/services/${restaurant.id}` as any}>
                          Reserve Table
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No restaurants listed yet for {destinationData.name}.</p>
          )}
        </section>

        {/* ─── 4. TOURISM & EXPERIENCES (6-8 preview cards) ───────────────────── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                <Compass className="size-4" /> Unforgettable Excursions
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Tourism & Experiences
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Guided plantation walks, backwater cruises, heritage cycling tours and wilderness safaris.
              </p>
            </div>

            {destinationTours.length > PREVIEW_LIMIT && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandTours(!expandTours)}
                className="rounded-full text-xs font-semibold self-start sm:self-auto gap-1"
              >
                {expandTours ? (
                  <>Show Less <ChevronUp className="size-3.5" /></>
                ) : (
                  <>View All Experiences ({destinationTours.length}) <ChevronDown className="size-3.5" /></>
                )}
              </Button>
            )}
          </div>

          {visibleTours.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTours.map((tour) => (
                <div
                  key={tour.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:shadow-card transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                    <img
                      src={tour.image_url}
                      alt={tour.title}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3">
                      <Badge className="bg-emerald-600/90 text-white text-[11px] font-semibold">
                        {tour.tour_type}
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3">
                      <WishlistButton
                        item={{
                          item_type: "experience",
                          item_id: tour.id,
                          item_title: tour.title,
                          item_image: tour.image_url,
                          item_category: tour.tour_type,
                          destination: tour.destination,
                          city: tour.city,
                          state: tour.state,
                          price: tour.price,
                          rating: tour.rating,
                          review_count: tour.review_count,
                        }}
                      />
                    </div>

                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="text-xs font-medium flex items-center gap-1 drop-shadow-sm">
                        <Clock className="size-3 text-emerald-400" /> {tour.duration}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5 space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Eco & Heritage</span>
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          ★ {tour.rating.toFixed(1)} ({tour.review_count})
                        </span>
                      </div>

                      <h3 className="font-display font-bold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors">
                        {tour.title}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {tour.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {tour.included.slice(0, 3).map((inc) => (
                          <Badge key={inc} variant="secondary" className="text-[10px] px-2 py-0.5">
                            ✓ {inc}
                          </Badge>
                        ))}
                      </div>

                      <p className="mt-3 text-base font-extrabold text-foreground">
                        ₹{tour.price.toLocaleString("en-IN")}{" "}
                        <span className="text-xs font-normal text-muted-foreground">/ person</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                      <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl text-xs gap-1">
                        <Link to={`/services/${tour.id}` as any}>
                          <ExternalLink className="size-3" /> View Details
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="default" className="rounded-xl text-xs font-semibold px-4">
                        <Link to={`/services/${tour.id}` as any}>
                          Book Experience
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No tours listed yet for {destinationData.name}.</p>
          )}
        </section>

        {/* ─── 5. FIND LOCAL HUMAN GUIDES (3-4 preview cards) ─────────────────── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
                <User className="size-4" /> Local Storytellers
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Find Verified Local Human Guides
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Connect with government-licensed native experts for heritage walks, food trails, and cultural immersions.
              </p>
            </div>

            {destinationGuides.length > GUIDE_PREVIEW_LIMIT && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandGuides(!expandGuides)}
                className="rounded-full text-xs font-semibold self-start sm:self-auto gap-1"
              >
                {expandGuides ? (
                  <>Show Less <ChevronUp className="size-3.5" /></>
                ) : (
                  <>View All Guides ({destinationGuides.length}) <ChevronDown className="size-3.5" /></>
                )}
              </Button>
            )}
          </div>

          {visibleGuides.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {visibleGuides.map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  onBookClick={(g) => setSelectedGuideForBooking(g)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No human guides registered yet for {destinationData.name}.</p>
          )}
        </section>

        {/* ─── 6. EXPLORE ON MAP ──────────────────────────────────────────────── */}
        <section id="destination-map" className="space-y-6 pt-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
                <MapPin className="size-4" /> Geo Discovery
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                🗺️ Explore {destinationData.name} on Map
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Interactive map displaying all verified stays, authentic restaurants, adventure spots, and local human guides.
              </p>
            </div>

            <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5 self-start sm:self-auto">
              <Link to="/explore-near-me">
                <Navigation className="size-3.5 text-primary" /> Explore Near Me
              </Link>
            </Button>
          </div>

          {/* Interactive Map Component with Filter Bar */}
          <InteractiveDestinationMap
            markers={mapMarkers}
            center={[destinationData.longitude, destinationData.latitude]}
            zoom={9}
            destinationName={destinationData.name}
            height="h-[550px]"
          />
        </section>
      </div>

      {/* Guide Booking Modal */}
      {selectedGuideForBooking && (
        <GuideBookingModal
          guide={selectedGuideForBooking}
          isOpen={Boolean(selectedGuideForBooking)}
          onClose={() => setSelectedGuideForBooking(null)}
          onBookingSuccess={() => setSelectedGuideForBooking(null)}
        />
      )}
    </div>
  );
}
