import React, { useState, useMemo } from "react";
import {
  Hotel,
  Utensils,
  Compass,
  User,
  Star,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  MapPin,
  Search,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapboxMap, type ServiceMarker } from "@/components/MapboxMap";
import { GuideBookingModal } from "@/components/GuideBookingModal";
import { HUMAN_TOUR_GUIDES } from "@/data/human-guides";
import type { GuideWithDistance } from "@/lib/guides";
import { cn } from "@/lib/utils";

interface InteractiveDestinationMapProps {
  markers: ServiceMarker[];
  center?: [number, number];
  zoom?: number;
  destinationName?: string;
  className?: string;
  height?: string;
  userCoords?: { lat: number; lng: number } | null;
}

export function InteractiveDestinationMap({
  markers,
  center,
  zoom = 9,
  destinationName = "Destination",
  className,
  height = "h-[500px]",
  userCoords,
}: InteractiveDestinationMapProps) {
  // Category filter: all | hotel | restaurant | experience | guide
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  // Additional filters
  const [minRating, setMinRating] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [maxDistance, setMaxDistance] = useState<string>("all");
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [searchAreaCenter, setSearchAreaCenter] = useState<[number, number] | null>(null);

  // Guide booking modal
  const [bookingGuide, setBookingGuide] = useState<GuideWithDistance | null>(null);

  // Filter markers
  const filteredMarkers = useMemo(() => {
    return markers.filter((m) => {
      // 1. Category match
      if (selectedCategory !== "all") {
        const cat = (m.category || "").toLowerCase();
        if (selectedCategory === "hotel" && !cat.includes("hotel") && !cat.includes("resort") && !cat.includes("homestay")) {
          return false;
        }
        if (selectedCategory === "restaurant" && !cat.includes("restaurant") && !cat.includes("dining")) {
          return false;
        }
        if (selectedCategory === "experience" && !cat.includes("experience") && !cat.includes("tour") && !cat.includes("adventure")) {
          return false;
        }
        if (selectedCategory === "guide" && !cat.includes("guide")) {
          return false;
        }
      }

      // 2. Min Rating
      if (minRating !== "all") {
        const r = m.rating || 0;
        if (minRating === "4.5" && r < 4.5) return false;
        if (minRating === "4.0" && r < 4.0) return false;
        if (minRating === "4.8" && r < 4.8) return false;
      }

      // 3. Price
      if (priceRange !== "all" && m.price !== undefined && m.price !== null) {
        const p = Number(m.price);
        if (priceRange === "budget" && p > 3000) return false;
        if (priceRange === "mid" && (p <= 3000 || p > 8000)) return false;
        if (priceRange === "luxury" && p <= 8000) return false;
      }

      // 4. Distance (if applicable)
      if (maxDistance !== "all" && m.distance_km !== undefined && m.distance_km !== null) {
        const d = typeof m.distance_km === "number" ? m.distance_km : parseFloat(String(m.distance_km));
        if (!isNaN(d)) {
          if (maxDistance === "5" && d > 5) return false;
          if (maxDistance === "10" && d > 10) return false;
          if (maxDistance === "25" && d > 25) return false;
          if (maxDistance === "50" && d > 50) return false;
        }
      }

      // 5. Availability
      if (availableOnly) {
        if (m.available_today === false) return false;
      }

      return true;
    });
  }, [markers, selectedCategory, minRating, priceRange, maxDistance, availableOnly]);

  const counts = useMemo(() => {
    return {
      all: markers.length,
      hotels: markers.filter((m) => (m.category || "").includes("hotel") || (m.category || "").includes("stay") || (m.category || "").includes("resort") || (m.category || "").includes("homestay")).length,
      restaurants: markers.filter((m) => (m.category || "").includes("restaurant") || (m.category || "").includes("dining")).length,
      experiences: markers.filter((m) => (m.category || "").includes("tour") || (m.category || "").includes("experience") || (m.category || "").includes("adventure")).length,
      guides: markers.filter((m) => (m.category || "").includes("guide")).length,
    };
  }, [markers]);

  const handleBookClick = (marker: ServiceMarker) => {
    if (marker.guideId || marker.category === "guide") {
      const guideId = marker.guideId || marker.id;
      const fullGuide = HUMAN_TOUR_GUIDES.find((g) => g.id === guideId);
      if (fullGuide) {
        setBookingGuide({ ...fullGuide, distanceKm: null, isWithinRadius: true });
        return;
      }
    }
    // Fallback: navigate to service
    const url = marker.serviceId
      ? `/services/${marker.serviceId}`
      : marker.destinationSlug
        ? `/destinations/${marker.destinationSlug}`
        : null;
    if (url) {
      window.location.href = url;
    }
  };

  const handleSearchArea = (newCenter: [number, number]) => {
    setSearchAreaCenter(newCenter);
  };

  const resetFilters = () => {
    setSelectedCategory("all");
    setMinRating("all");
    setPriceRange("all");
    setMaxDistance("all");
    setAvailableOnly(false);
  };

  const hasActiveFilters =
    selectedCategory !== "all" ||
    minRating !== "all" ||
    priceRange !== "all" ||
    maxDistance !== "all" ||
    availableOnly;

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Control Header & Category Filters ─────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/80 backdrop-blur-md p-4 shadow-xs">
        {/* Category Pills Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className="rounded-full text-xs font-semibold h-8"
            >
              All ({counts.all})
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === "hotel" ? "default" : "outline"}
              onClick={() => setSelectedCategory("hotel")}
              className="rounded-full text-xs font-semibold h-8 gap-1.5"
            >
              <Hotel className="size-3.5 text-blue-500" /> Hotels ({counts.hotels})
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === "restaurant" ? "default" : "outline"}
              onClick={() => setSelectedCategory("restaurant")}
              className="rounded-full text-xs font-semibold h-8 gap-1.5"
            >
              <Utensils className="size-3.5 text-amber-500" /> Restaurants ({counts.restaurants})
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === "experience" ? "default" : "outline"}
              onClick={() => setSelectedCategory("experience")}
              className="rounded-full text-xs font-semibold h-8 gap-1.5"
            >
              <Compass className="size-3.5 text-emerald-500" /> Experiences ({counts.experiences})
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === "guide" ? "default" : "outline"}
              onClick={() => setSelectedCategory("guide")}
              className="rounded-full text-xs font-semibold h-8 gap-1.5"
            >
              <User className="size-3.5 text-purple-500" /> Human Guides ({counts.guides})
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              Showing <strong className="text-foreground">{filteredMarkers.length}</strong> pins
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="size-3" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Sub-Filters Bar: Rating, Price, Distance, Availability */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <SlidersHorizontal className="size-3.5" /> Filters:
          </div>

          {/* Rating filter */}
          <Select value={minRating} onValueChange={setMinRating}>
            <SelectTrigger className="h-8 rounded-full text-xs w-32">
              <Star className="size-3 text-amber-500 mr-1" />
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Rating</SelectItem>
              <SelectItem value="4.8">★ 4.8+ Exceptional</SelectItem>
              <SelectItem value="4.5">★ 4.5+ Excellent</SelectItem>
              <SelectItem value="4.0">★ 4.0+ Very Good</SelectItem>
            </SelectContent>
          </Select>

          {/* Price filter */}
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="h-8 rounded-full text-xs w-32">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Price</SelectItem>
              <SelectItem value="budget">Budget (≤ ₹3,000)</SelectItem>
              <SelectItem value="mid">Mid-Range (₹3k - ₹8k)</SelectItem>
              <SelectItem value="luxury">Luxury (&gt; ₹8,000)</SelectItem>
            </SelectContent>
          </Select>

          {/* Distance filter (if distance data available) */}
          <Select value={maxDistance} onValueChange={setMaxDistance}>
            <SelectTrigger className="h-8 rounded-full text-xs w-32">
              <MapPin className="size-3 text-primary mr-1" />
              <SelectValue placeholder="Distance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Distance</SelectItem>
              <SelectItem value="5">Within 5 km</SelectItem>
              <SelectItem value="10">Within 10 km</SelectItem>
              <SelectItem value="25">Within 25 km</SelectItem>
              <SelectItem value="50">Within 50 km</SelectItem>
            </SelectContent>
          </Select>

          {/* Availability Toggle */}
          <button
            type="button"
            onClick={() => setAvailableOnly(!availableOnly)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
              availableOnly
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <Calendar className="size-3" />
            <span>Available Today</span>
          </button>
        </div>
      </div>

      {/* ── Interactive Map View ─────────────────────────────────────────────── */}
      <MapboxMap
        markers={filteredMarkers}
        center={searchAreaCenter || center}
        zoom={zoom}
        height={height}
        onBookClick={handleBookClick}
        onSearchArea={handleSearchArea}
        showSearchAreaButton={true}
        className="w-full"
      />

      {/* Guide Booking Modal */}
      {bookingGuide && (
        <GuideBookingModal
          guide={bookingGuide}
          isOpen={Boolean(bookingGuide)}
          onClose={() => setBookingGuide(null)}
          onBookingSuccess={() => setBookingGuide(null)}
        />
      )}
    </div>
  );
}
