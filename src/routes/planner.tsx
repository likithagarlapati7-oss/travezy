import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  Check,
  ChevronRight,
  Compass,
  CreditCard,
  Edit2,
  ExternalLink,
  Heart,
  Hotel,
  Info,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Plus,
  Printer,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  User,
  Users,
  Utensils,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { DESTINATIONS_DATA, getDestinationBySlug, type DestinationData } from "@/data/destinations-data";
import { HOTELS_AND_STAYS } from "@/data/hotels-and-stays";
import { INDIAN_RESTAURANTS } from "@/data/indian-restaurants";
import { TOURS_AND_EXPERIENCES } from "@/data/tours-and-experiences";
import { HUMAN_TOUR_GUIDES } from "@/data/human-guides";
import { generateGroundedItineraryFn, saveTripPlanFn } from "@/lib/itinerary.functions";
import { WeatherWidget } from "@/components/WeatherWidget";
import { TripBudgetPlanner } from "@/components/TripBudgetPlanner";
import { SmartPackingList } from "@/components/SmartPackingList";
import { type CheaperAlternativeOption } from "@/lib/budget";
import type {
  ActivityItem,
  BudgetTier,
  ItineraryDay,
  StructuredItinerary,
  TravelStyle,
} from "@/lib/ai.schema";

interface PlannerSearchParams {
  destination?: string | undefined;
  days?: number | undefined;
  budget?: BudgetTier | undefined;
  budgetTier?: BudgetTier | undefined;
  style?: TravelStyle | undefined;
}

export const Route = createFileRoute("/planner")({
  validateSearch: (search: Record<string, unknown>): PlannerSearchParams => {
    const dest = typeof search["destination"] === "string" ? search["destination"] : undefined;
    const days = typeof search["days"] === "number" ? search["days"] : typeof search["days"] === "string" ? Number(search["days"]) : undefined;
    const b = (typeof search["budget"] === "string" ? search["budget"] : typeof search["budgetTier"] === "string" ? search["budgetTier"] : undefined) as BudgetTier | undefined;
    const style = typeof search["style"] === "string" ? (search["style"] as TravelStyle) : undefined;
    return {
      destination: dest,
      days,
      budget: b,
      budgetTier: b,
      style,
    };
  },
  head: () => ({
    meta: [
      { title: "✨ AI Trip Planner & Itinerary Generator — Travezy" },
      {
        name: "description",
        content:
          "Plan your dream Indian holiday in seconds with AI grounded in real verified hotels, dining, experiences, and local tour guides.",
      },
    ],
  }),
  component: PlannerPage,
});

const INTEREST_OPTIONS = [
  { id: "Nature & Scenic", label: "Nature & Landscapes", icon: "🌿" },
  { id: "Adventure & Thrills", label: "Adventure & Sports", icon: "🧗" },
  { id: "History & Forts", label: "History & Heritage", icon: "🏰" },
  { id: "Food & Culinary", label: "Food & Culinary Trails", icon: "🍛" },
  { id: "Culture & Art", label: "Culture & Traditions", icon: "🎭" },
  { id: "Shopping & Markets", label: "Shopping & Local Bazaars", icon: "🛍️" },
  { id: "Photography & Vistas", label: "Photography & Scenic Points", icon: "📸" },
  { id: "Wildlife & Safari", label: "Wildlife & Safaris", icon: "🐅" },
  { id: "Beaches & Water Sports", label: "Beaches & Backwaters", icon: "🏖️" },
  { id: "Relaxation & Wellness", label: "Ayurveda & Wellness", icon: "🧘" },
];

const BUDGET_TIERS: Array<{
  id: BudgetTier;
  name: string;
  range: string;
  desc: string;
  icon: string;
}> = [
  {
    id: "budget",
    name: "Budget",
    range: "₹1,500 – ₹3,500 / day",
    desc: "Cozy verified stays, authentic local street food & regional dining, self-guided exploration",
    icon: "🎒",
  },
  {
    id: "moderate",
    name: "Moderate",
    range: "₹3,500 – ₹8,000 / day",
    desc: "Premium 3-4★ stays, iconic guided experiences, popular dining spots & comfortable transit",
    icon: "✨",
  },
  {
    id: "luxury",
    name: "Luxury",
    range: "₹8,000 – ₹20,000 / day",
    desc: "5★ heritage palaces & luxury beach resorts, private tour guides, signature dining & private transfers",
    icon: "👑",
  },
  {
    id: "ultra_luxury",
    name: "Ultra-Luxury",
    range: "₹20,000+ / day",
    desc: "Bespoke presidential suites, private houseboats, royal gastronomy & VIP white-glove concierge",
    icon: "💎",
  },
];

const TRAVEL_STYLES: Array<{
  id: TravelStyle;
  name: string;
  pace: string;
  desc: string;
  icon: string;
}> = [
  {
    id: "relaxed",
    name: "Relaxed",
    pace: "1–2 Activities / Day",
    desc: "Slow travel with ample downtime, leisurely breakfasts, sunset cafes, and zero rush.",
    icon: "🌿",
  },
  {
    id: "balanced",
    name: "Balanced",
    pace: "2–3 Activities / Day",
    desc: "The sweet spot: explore signature sights in the morning, authentic lunch, and evening culture.",
    icon: "⚖️",
  },
  {
    id: "packed",
    name: "Packed",
    pace: "3–4 Activities / Day",
    desc: "Maximum adventure from dawn to dusk covering all major landmarks, food hotspots, and vistas.",
    icon: "⚡",
  },
];

function PlannerPage() {
  const search = useSearch({ from: "/planner" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Multi-step planner state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [selectedDestinationSlug, setSelectedDestinationSlug] = useState<string>(
    search.destination || "kerala"
  );
  const [days, setDays] = useState<number>(search.days || 4);
  const [travelers, setTravelers] = useState<number>(2);
  const [budgetTier, setBudgetTier] = useState<BudgetTier>(search.budget || "moderate");
  const [travelStyle, setTravelStyle] = useState<TravelStyle>(search.style || "balanced");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "Nature & Scenic",
    "Food & Culinary",
    "History & Forts",
  ]);
  const [startDate, setStartDate] = useState<string>("");
  const [customNotes, setCustomNotes] = useState<string>("");

  // Generated Itinerary State
  const [generatedItinerary, setGeneratedItinerary] = useState<StructuredItinerary | null>(null);
  const [activeDayTab, setActiveDayTab] = useState<string>("day-1");
  const [activePlannerToolTab, setActivePlannerToolTab] = useState<"schedule" | "budget" | "weather" | "packing">("schedule");
  const [maxBudget, setMaxBudget] = useState<number | null>(null);

  // Activity customization modals
  const [showAddActivityModal, setShowAddActivityModal] = useState<boolean>(false);
  const [targetDayForAdd, setTargetDayForAdd] = useState<number>(1);
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>("all");
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>("");

  const [replacingActivity, setReplacingActivity] = useState<{
    dayNumber: number;
    activityId: string;
    itemType: string;
  } | null>(null);

  const handleSwapPlannerItem = (option: CheaperAlternativeOption) => {
    if (!generatedItinerary) return;
    let found = false;
    const priceDiff = option.cheaperItem.price - option.currentCost;

    const newDays = generatedItinerary.days.map((day) => {
      const newActs = day.activities.map((act) => {
        if (
          act.id === option.currentItemTitle ||
          act.externalReferenceId === option.currentItemTitle ||
          act.title === option.currentItemTitle
        ) {
          found = true;
          return {
            ...act,
            id: option.cheaperItem.id,
            externalReferenceId: option.cheaperItem.id,
            title: option.cheaperItem.title,
            numericCost: option.cheaperItem.price,
            estimatedCost: `₹${option.cheaperItem.price.toLocaleString("en-IN")}`,
            imageUrl: option.cheaperItem.image_url || act.imageUrl,
            rating: option.cheaperItem.rating || act.rating,
          };
        }
        return act;
      });

      return {
        ...day,
        activities: newActs,
        dailyCostNumeric: newActs.reduce((acc, a) => acc + (a.numericCost || 0), 0),
      };
    });

    if (found) {
      const newTotal = Math.max(0, generatedItinerary.totalCostNumeric + priceDiff);
      setGeneratedItinerary({
        ...generatedItinerary,
        days: newDays,
        totalCostNumeric: newTotal,
        estimatedTotalBudget: `₹${newTotal.toLocaleString("en-IN")}`,
      });
      toast.success(`Swapped to "${option.cheaperItem.title}"! Budget updated.`);
    }
  };

  // Server functions
  const generateItineraryFn = useServerFn(generateGroundedItineraryFn);
  const saveTripPlanMutationFn = useServerFn(saveTripPlanFn);

  // Filtered destinations for Step 1
  const filteredDestinations = useMemo(() => {
    if (!destinationSearch.trim()) return DESTINATIONS_DATA;
    const q = destinationSearch.toLowerCase().trim();
    return DESTINATIONS_DATA.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.state.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q)
    );
  }, [destinationSearch]);

  const selectedDestinationData: DestinationData = useMemo(() => {
    return (
      DESTINATIONS_DATA.find((d) => d.slug === selectedDestinationSlug) ||
      DESTINATIONS_DATA[0]!
    );
  }, [selectedDestinationSlug]);

  // Generation Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      return await generateItineraryFn({
        data: {
          destination: selectedDestinationData.name,
          days,
          travelers,
          budgetTier,
          travelStyle,
          interests: selectedInterests,
          startDate: startDate || undefined,
          customNotes: customNotes || undefined,
        },
      });
    },
    onSuccess: (itinerary) => {
      setGeneratedItinerary(itinerary);
      setActiveDayTab("day-1");
      setCurrentStep(8); // Move to Itinerary View
      toast.success(
        `Generated personalized ${days}-day ${selectedDestinationData.name} itinerary!`
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate itinerary. Please try again.");
    },
  });

  // Save Trip Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!generatedItinerary) throw new Error("No active itinerary to save");

      // Flatten items from all days
      const itemsToSave: Array<{
        dayNumber: number;
        timeSlot: string;
        orderIndex: number;
        itemType: string;
        title: string;
        description?: string | undefined;
        location?: string | undefined;
        estimatedCost: number;
        serviceId?: string | null | undefined;
        externalReferenceId?: string | null | undefined;
        imageUrl?: string | null | undefined;
        rating?: number | null | undefined;
        bookingUrl?: string | null | undefined;
        notes?: string | null | undefined;
      }> = [];

      generatedItinerary.days.forEach((d) => {
        d.activities.forEach((act, idx) => {
          itemsToSave.push({
            dayNumber: d.day,
            timeSlot: act.timeSlot,
            orderIndex: act.orderIndex ?? idx,
            itemType: act.itemType,
            title: act.title,
            description: act.description,
            location: act.location,
            estimatedCost: act.numericCost || 0,
            serviceId: act.matchedServiceId || null,
            externalReferenceId: act.externalReferenceId || act.id || null,
            imageUrl: act.imageUrl || null,
            rating: act.rating || null,
            bookingUrl: act.bookingUrl || null,
            notes: act.notes || null,
          });
        });
      });

      return await saveTripPlanMutationFn({
        data: {
          title: generatedItinerary.title,
          destination: generatedItinerary.destination,
          destinationSlug: generatedItinerary.destinationSlug || selectedDestinationSlug,
          daysCount: generatedItinerary.daysCount,
          travelersCount: generatedItinerary.travelersCount,
          budgetTier: generatedItinerary.budgetTier,
          estimatedTotalCost: generatedItinerary.totalCostNumeric,
          currency: generatedItinerary.currency,
          travelStyle: generatedItinerary.travelStyle,
          interests: generatedItinerary.interests,
          startDate: generatedItinerary.startDate,
          endDate: generatedItinerary.endDate,
          coverImageUrl: generatedItinerary.coverImageUrl,
          summary: generatedItinerary.summary,
          maxBudget: maxBudget ?? undefined,
          items: itemsToSave,
        },
      });
    },
    onSuccess: (savedPlan) => {
      queryClient.invalidateQueries({ queryKey: ["user-trip-plans"] });
      toast.success("Itinerary saved successfully to My Trips!");
      navigate({ to: "/tourist/itineraries" });
    },
    onError: (err: Error) => {
      if (err.message.includes("Unauthorized")) {
        toast.error("Please sign in as a tourist to save this trip to your account.");
      } else {
        toast.error(err.message || "Failed to save itinerary.");
      }
    },
  });

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((i) => i !== interestId)
        : [...prev, interestId]
    );
  };

  // Local activity manipulation on the generated plan
  const handleRemoveActivity = (dayNum: number, activityId: string) => {
    if (!generatedItinerary) return;
    const updatedDays = generatedItinerary.days.map((d) => {
      if (d.day !== dayNum) return d;
      const filtered = d.activities.filter((a) => a.id !== activityId);
      const newDailyNumeric = filtered.reduce((acc, a) => acc + (a.numericCost || 0), 0);
      return {
        ...d,
        activities: filtered,
        dailyCostNumeric: newDailyNumeric,
        estimatedDailyExpense: `₹${newDailyNumeric.toLocaleString("en-IN")}`,
      };
    });

    const newTotal = updatedDays.reduce((acc, d) => acc + d.dailyCostNumeric, 0);

    setGeneratedItinerary({
      ...generatedItinerary,
      days: updatedDays,
      totalCostNumeric: newTotal,
      estimatedTotalBudget: `₹${newTotal.toLocaleString("en-IN")}`,
    });

    toast.success("Activity removed from day's plan.");
  };

  const handleAddActivityToDay = (activity: ActivityItem) => {
    if (!generatedItinerary) return;

    const updatedDays = generatedItinerary.days.map((d) => {
      if (d.day !== targetDayForAdd) return d;
      const updatedList = [...d.activities, activity];
      const newDailyNumeric = updatedList.reduce((acc, a) => acc + (a.numericCost || 0), 0);
      return {
        ...d,
        activities: updatedList,
        dailyCostNumeric: newDailyNumeric,
        estimatedDailyExpense: `₹${newDailyNumeric.toLocaleString("en-IN")}`,
      };
    });

    const newTotal = updatedDays.reduce((acc, d) => acc + d.dailyCostNumeric, 0);

    setGeneratedItinerary({
      ...generatedItinerary,
      days: updatedDays,
      totalCostNumeric: newTotal,
      estimatedTotalBudget: `₹${newTotal.toLocaleString("en-IN")}`,
    });

    setShowAddActivityModal(false);
    toast.success(`Added "${activity.title}" to Day ${targetDayForAdd}!`);
  };

  // Replace Activity Handler
  const handleReplaceActivity = (replacementItem: ActivityItem) => {
    if (!generatedItinerary || !replacingActivity) return;

    const { dayNumber, activityId } = replacingActivity;
    const updatedDays = generatedItinerary.days.map((d) => {
      if (d.day !== dayNumber) return d;
      const replacedList = d.activities.map((a) =>
        a.id === activityId ? { ...replacementItem, timeSlot: a.timeSlot, orderIndex: a.orderIndex } : a
      );
      const newDailyNumeric = replacedList.reduce((acc, a) => acc + (a.numericCost || 0), 0);
      return {
        ...d,
        activities: replacedList,
        dailyCostNumeric: newDailyNumeric,
        estimatedDailyExpense: `₹${newDailyNumeric.toLocaleString("en-IN")}`,
      };
    });

    const newTotal = updatedDays.reduce((acc, d) => acc + d.dailyCostNumeric, 0);

    setGeneratedItinerary({
      ...generatedItinerary,
      days: updatedDays,
      totalCostNumeric: newTotal,
      estimatedTotalBudget: `₹${newTotal.toLocaleString("en-IN")}`,
    });

    setReplacingActivity(null);
    toast.success(`Replaced with "${replacementItem.title}"!`);
  };

  // Real Destination Catalog items for the Add / Replace Activity dialog
  const catalogForDestination = useMemo(() => {
    const slug = selectedDestinationSlug.toLowerCase();
    const destName = (selectedDestinationData?.name || "").toLowerCase();

    // 1. Hotels
    const hotels = HOTELS_AND_STAYS.filter(
      (h) => h.destination.toLowerCase().includes(slug) || h.destination.toLowerCase().includes(destName)
    ).map(
      (h): ActivityItem => ({
        id: h.id,
        itemType: "hotel",
        timeSlot: "night",
        title: h.title,
        description: h.description,
        location: `${h.city}, ${h.state}`,
        estimatedCost: `₹${h.price.toLocaleString("en-IN")}/night`,
        numericCost: h.price,
        currency: "INR",
        imageUrl: h.image_url,
        rating: h.rating,
        bookingUrl: `/destinations/${slug}`,
        externalReferenceId: h.id,
        isBooked: false,
        orderIndex: 0,
      })
    );

    // 2. Restaurants
    const restaurants = INDIAN_RESTAURANTS.filter(
      (r) => r.destination.toLowerCase().includes(slug) || r.destination.toLowerCase().includes(destName)
    ).map(
      (r): ActivityItem => ({
        id: r.id,
        itemType: "restaurant",
        timeSlot: "afternoon",
        title: r.title,
        description: `${r.cuisine_type} - ${r.description}`,
        location: `${r.city}, ${r.state}`,
        estimatedCost: `₹${r.price.toLocaleString("en-IN")}`,
        numericCost: r.price,
        currency: "INR",
        imageUrl: r.image_url,
        rating: r.rating,
        bookingUrl: `/destinations/${slug}`,
        externalReferenceId: r.id,
        isBooked: false,
        orderIndex: 0,
      })
    );

    // 3. Experiences
    const experiences = TOURS_AND_EXPERIENCES.filter(
      (t) => t.destination.toLowerCase().includes(slug) || t.destination.toLowerCase().includes(destName)
    ).map(
      (t): ActivityItem => ({
        id: t.id,
        itemType: "experience",
        timeSlot: "morning",
        title: t.title,
        description: t.description,
        location: `${t.city}, ${t.state}`,
        estimatedCost: `₹${t.price.toLocaleString("en-IN")}`,
        numericCost: t.price,
        currency: "INR",
        imageUrl: t.image_url,
        rating: t.rating,
        bookingUrl: `/tours`,
        externalReferenceId: t.id,
        isBooked: false,
        orderIndex: 0,
      })
    );

    // 4. Guides
    const guides = HUMAN_TOUR_GUIDES.filter(
      (g) => selectedDestinationData && g.state.toLowerCase() === selectedDestinationData.state.toLowerCase()
    ).map(
      (g): ActivityItem => ({
        id: g.id,
        itemType: "guide",
        timeSlot: "morning",
        title: `${g.name} (Local Guide)`,
        description: `Specializations: ${(g.specializations || []).join(", ")}. Languages: ${g.languages.join(", ")}.`,
        location: `${g.city}, ${g.state}`,
        estimatedCost: `₹${g.hourly_rate * 4}/half-day`,
        numericCost: g.hourly_rate * 4,
        currency: "INR",
        imageUrl: g.profile_image,
        rating: g.rating,
        bookingUrl: `/destinations/${slug}`,
        externalReferenceId: g.id,
        isBooked: false,
        orderIndex: 0,
      })
    );

    return {
      all: [...hotels, ...experiences, ...restaurants, ...guides],
      hotels,
      restaurants,
      experiences,
      guides,
    };
  }, [selectedDestinationSlug, selectedDestinationData]);

  const filteredCatalogItems = useMemo(() => {
    let list: ActivityItem[] = [];
    if (activityCategoryFilter === "hotel") list = catalogForDestination.hotels;
    else if (activityCategoryFilter === "restaurant") list = catalogForDestination.restaurants;
    else if (activityCategoryFilter === "experience") list = catalogForDestination.experiences;
    else if (activityCategoryFilter === "guide") list = catalogForDestination.guides;
    else list = catalogForDestination.all;

    if (!activitySearchQuery.trim()) return list;
    const q = activitySearchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [catalogForDestination, activityCategoryFilter, activitySearchQuery]);

  const printItinerary = () => {
    window.print();
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Itinerary share link copied to clipboard!");
  };

  return (
    <PageShell
      eyebrow="AI-Powered Trip Generator"
      title="✨ Plan Your Perfect Itinerary"
      subtitle="Select your destination, travel pace, and interests. Our AI pairs your preferences directly with verified hotels, authentic dining, and certified local guides."
    >
      <div className="space-y-8">
        {/* ── Progress & Step Indicator (Steps 1 to 7) ────────────────────── */}
        {currentStep <= 7 && (
          <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>STEP {currentStep} OF 7</span>
              <span>
                {currentStep === 1 && "Choose Destination"}
                {currentStep === 2 && "Duration & Days"}
                {currentStep === 3 && "Travellers"}
                {currentStep === 4 && "Budget Tier"}
                {currentStep === 5 && "Travel Style & Pace"}
                {currentStep === 6 && "Interests & Passions"}
                {currentStep === 7 && "Dates & Preferences"}
              </span>
            </div>

            {/* Visual Step Progress Bar */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setCurrentStep(step)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    step === currentStep
                      ? "bg-primary ring-2 ring-primary/30"
                      : step < currentStep
                      ? "bg-emerald-500"
                      : "bg-muted"
                  }`}
                  aria-label={`Go to step ${step}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: Destination Selection ───────────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Where do you want to travel?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose from India's most iconic states and heritage regions.
                </p>
              </div>

              <div className="w-full sm:w-72">
                <Input
                  type="text"
                  placeholder="Search destinations (e.g. Kerala, Goa, Rajasthan)…"
                  value={destinationSearch}
                  onChange={(e) => setDestinationSearch(e.target.value)}
                  className="rounded-2xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredDestinations.map((dest) => {
                const isSelected = selectedDestinationSlug === dest.slug;
                return (
                  <div
                    key={dest.slug}
                    onClick={() => setSelectedDestinationSlug(dest.slug)}
                    className={`group relative overflow-hidden rounded-3xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary ring-3 ring-primary/25 shadow-card"
                        : "border-border bg-card hover:border-primary/50 hover:shadow-float"
                    }`}
                  >
                    <div className="aspect-[16/10] overflow-hidden relative">
                      <img
                        src={dest.cover_image}
                        alt={dest.name}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute top-3 right-3">
                        {isSelected ? (
                          <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs">
                            <Check className="size-4 stroke-[3]" />
                          </span>
                        ) : (
                          <Badge className="bg-black/50 text-white backdrop-blur-md text-[10px] border-none">
                            {dest.best_time_to_visit || "Oct–Mar"}
                          </Badge>
                        )}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <p className="font-display text-lg font-bold leading-tight">{dest.name}</p>
                        <p className="text-xs text-white/80 line-clamp-1">{dest.state}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant="hero"
                size="lg"
                onClick={() => setCurrentStep(2)}
                className="rounded-2xl gap-2 shadow-card"
              >
                Continue to Duration <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Duration / Days Selection ───────────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl mx-auto py-4">
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                How many days is your {selectedDestinationData.name} trip?
              </h2>
              <p className="text-sm text-muted-foreground">
                Select your holiday length from quick weekend getaways to in-depth grand tours.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { count: 3, label: "3 Days", tag: "Weekend Getaway" },
                { count: 5, label: "5 Days", tag: "Popular Choice" },
                { count: 7, label: "7 Days", tag: "Full Week Highlights" },
                { count: 10, label: "10 Days", tag: "Grand Explorer" },
              ].map((preset) => (
                <button
                  key={preset.count}
                  type="button"
                  onClick={() => setDays(preset.count)}
                  className={`p-4 rounded-3xl border text-center transition-all cursor-pointer ${
                    days === preset.count
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <p className="font-display text-xl font-bold text-foreground">{preset.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{preset.tag}</p>
                </button>
              ))}
            </div>

            {/* Interactive Counter Box */}
            <div className="bg-muted/40 border border-border p-6 rounded-3xl flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Exact Number of Days
                </p>
                <p className="font-display text-3xl font-extrabold text-foreground mt-0.5">
                  {days} {days === 1 ? "Day" : "Days"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 rounded-2xl text-lg font-bold"
                  onClick={() => setDays((prev) => Math.max(1, prev - 1))}
                  disabled={days <= 1}
                >
                  -
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 rounded-2xl text-lg font-bold"
                  onClick={() => setDays((prev) => Math.min(14, prev + 1))}
                  disabled={days >= 14}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(1)}
                className="rounded-2xl gap-1.5"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                variant="hero"
                size="lg"
                onClick={() => setCurrentStep(3)}
                className="rounded-2xl gap-2 shadow-card"
              >
                Continue to Travellers <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Travellers Count ────────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl mx-auto py-4">
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Who is travelling on this journey?
              </h2>
              <p className="text-sm text-muted-foreground">
                Room allocations, guide sizes, and dining capacity will adapt to your party.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { count: 1, label: "Solo Explorer", icon: "🎒" },
                { count: 2, label: "Couple / Duo", icon: "💑" },
                { count: 4, label: "Family (3-4)", icon: "👨‍👩‍👧‍👦" },
                { count: 6, label: "Friends Group (5+)", icon: "👥" },
              ].map((t) => (
                <button
                  key={t.count}
                  type="button"
                  onClick={() => setTravelers(t.count)}
                  className={`p-5 rounded-3xl border text-center transition-all cursor-pointer ${
                    travelers === t.count
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span className="text-3xl block mb-2">{t.icon}</span>
                  <p className="font-display text-sm font-bold text-foreground">{t.label}</p>
                </button>
              ))}
            </div>

            <div className="bg-muted/40 border border-border p-6 rounded-3xl flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Number of Travellers
                </p>
                <p className="font-display text-3xl font-extrabold text-foreground mt-0.5">
                  {travelers} {travelers === 1 ? "Traveller" : "Travellers"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 rounded-2xl text-lg font-bold"
                  onClick={() => setTravelers((prev) => Math.max(1, prev - 1))}
                  disabled={travelers <= 1}
                >
                  -
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 rounded-2xl text-lg font-bold"
                  onClick={() => setTravelers((prev) => Math.min(10, prev + 1))}
                  disabled={travelers >= 10}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(2)}
                className="rounded-2xl gap-1.5"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                variant="hero"
                size="lg"
                onClick={() => setCurrentStep(4)}
                className="rounded-2xl gap-2 shadow-card"
              >
                Continue to Budget <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Budget Tier ─────────────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto py-4">
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Choose your preferred budget tier
              </h2>
              <p className="text-sm text-muted-foreground">
                We'll match hotels, dining experiences, and transport to your comfort level.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BUDGET_TIERS.map((tier) => {
                const isSelected = budgetTier === tier.id;
                return (
                  <div
                    key={tier.id}
                    onClick={() => setBudgetTier(tier.id)}
                    className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-card"
                        : "border-border bg-card hover:border-primary/40 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{tier.icon}</span>
                        <div>
                          <p className="font-display text-lg font-bold text-foreground">
                            {tier.name}
                          </p>
                          <p className="text-xs font-semibold text-primary">{tier.range}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tier.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(3)}
                className="rounded-2xl gap-1.5"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                variant="hero"
                size="lg"
                onClick={() => setCurrentStep(5)}
                className="rounded-2xl gap-2 shadow-card"
              >
                Continue to Travel Style <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Travel Style / Pace ─────────────────────────────────── */}
        {currentStep === 5 && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto py-4">
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                What pace feels best for this trip?
              </h2>
              <p className="text-sm text-muted-foreground">
                Control how packed or relaxed your daily itinerary timeline will be.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {TRAVEL_STYLES.map((style) => {
                const isSelected = travelStyle === style.id;
                return (
                  <div
                    key={style.id}
                    onClick={() => setTravelStyle(style.id)}
                    className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-card"
                        : "border-border bg-card hover:border-primary/40 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{style.icon}</span>
                      {isSelected && (
                        <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">{style.name}</p>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {style.pace}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{style.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(4)}
                className="rounded-2xl gap-1.5"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                variant="hero"
                size="lg"
                onClick={() => setCurrentStep(6)}
                className="rounded-2xl gap-2 shadow-card"
              >
                Continue to Interests <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 6: Interests Selection ─────────────────────────────────── */}
        {currentStep === 6 && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto py-4">
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                What are your main travel passions?
              </h2>
              <p className="text-sm text-muted-foreground">
                Select everything you want featured in your customized {selectedDestinationData.name}{" "}
                itinerary.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = selectedInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{interest.icon}</span>
                      <span className="text-xs font-semibold text-foreground truncate">
                        {interest.label}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="size-4 text-primary shrink-0 stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(5)}
                className="rounded-2xl gap-1.5"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                variant="hero"
                size="lg"
                onClick={() => setCurrentStep(7)}
                className="rounded-2xl gap-2 shadow-card"
              >
                Final Details <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 7: Dates & Final Generate Trigger ───────────────────────── */}
        {currentStep === 7 && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl mx-auto py-4">
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Trip Details & Generation
              </h2>
              <p className="text-sm text-muted-foreground">
                Optionally enter travel dates and any specific requests.
              </p>
            </div>

            {/* Summary Review Card */}
            <div className="bg-muted/40 border border-border rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary text-xl">
                    📍
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold">
                      {selectedDestinationData.name} ({days} Days)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {travelers} {travelers > 1 ? "Travellers" : "Traveller"} · {budgetTier} tier ·{" "}
                      {travelStyle} pace
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                  className="rounded-full text-xs text-primary"
                >
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Target Start Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-2xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Custom Requests (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Vegetarian only, traveling with toddler…"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="rounded-2xl text-xs"
                  />
                </div>
              </div>

              {/* Destination Live Weather Preview */}
              <div className="pt-2">
                <WeatherWidget
                  destinationName={selectedDestinationData.name}
                  latitude={selectedDestinationData.latitude}
                  longitude={selectedDestinationData.longitude}
                  variant="card"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(6)}
                className="rounded-2xl gap-1.5"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                variant="hero"
                size="lg"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="rounded-2xl gap-2 shadow-card px-8 text-base"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Synthesizing Itinerary…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5 fill-current text-gold" />
                    Generate My Itinerary
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 8: Generated Day-by-Day Itinerary View ─────────────────── */}
        {currentStep === 8 && generatedItinerary && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* 1. Master Itinerary Hero & Stats */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <div className="h-64 sm:h-80 w-full relative overflow-hidden">
                <img
                  src={generatedItinerary.coverImageUrl || selectedDestinationData.cover_image}
                  alt={generatedItinerary.title}
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                <div className="absolute top-4 left-4 right-4 flex justify-between items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(7)}
                    className="rounded-full bg-black/40 text-white border-white/20 backdrop-blur-md text-xs hover:bg-black/60"
                  >
                    <ArrowLeft className="size-3.5 mr-1" /> Reconfigure
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={printItinerary}
                      className="rounded-full bg-black/40 text-white border-white/20 backdrop-blur-md text-xs hover:bg-black/60"
                    >
                      <Printer className="size-3.5 mr-1" /> Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShareLink}
                      className="rounded-full bg-black/40 text-white border-white/20 backdrop-blur-md text-xs hover:bg-black/60"
                    >
                      <Share2 className="size-3.5 mr-1" /> Share
                    </Button>
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground font-semibold text-xs border-none">
                      {generatedItinerary.daysCount} Days
                    </Badge>
                    <Badge className="bg-white/20 text-white backdrop-blur-md text-xs border-none capitalize">
                      {generatedItinerary.budgetTier} Tier
                    </Badge>
                    <Badge className="bg-white/20 text-white backdrop-blur-md text-xs border-none capitalize">
                      {generatedItinerary.travelStyle} Pace
                    </Badge>
                  </div>

                  <h1 className="font-display text-2xl sm:text-4xl font-extrabold leading-tight">
                    {generatedItinerary.title}
                  </h1>
                  <p className="text-sm text-white/85 max-w-3xl leading-relaxed">
                    {generatedItinerary.summary}
                  </p>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-t border-border bg-muted/30 p-4">
                <div className="p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    Total Estimated Cost
                  </p>
                  <p className="font-display text-xl font-extrabold text-foreground mt-0.5">
                    {generatedItinerary.estimatedTotalBudget}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    For {generatedItinerary.travelersCount} travellers
                  </p>
                </div>

                <div className="p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    Daily Average
                  </p>
                  <p className="font-display text-xl font-extrabold text-foreground mt-0.5">
                    ₹
                    {Math.round(
                      generatedItinerary.totalCostNumeric / generatedItinerary.daysCount
                    ).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">per day breakdown</p>
                </div>

                <div className="p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    Total Activities
                  </p>
                  <p className="font-display text-xl font-extrabold text-foreground mt-0.5">
                    {generatedItinerary.days.reduce((acc, d) => acc + d.activities.length, 0)} Items
                  </p>
                  <p className="text-[11px] text-muted-foreground">100% verified listings</p>
                </div>

                <div className="p-3 text-center flex flex-col justify-center items-center">
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="rounded-full shadow-card w-full sm:w-auto text-xs gap-1.5"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Bookmark className="size-3.5 fill-current" />
                    )}
                    Save to My Trips
                  </Button>
                </div>
              </div>
            </div>

            {/* 2. Smart Travel Tools Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-3">
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/60 rounded-2xl border border-border">
                <Button
                  variant={activePlannerToolTab === "schedule" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActivePlannerToolTab("schedule")}
                  className="rounded-xl text-xs font-semibold gap-1.5"
                >
                  📅 Day Schedule
                </Button>
                <Button
                  variant={activePlannerToolTab === "budget" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActivePlannerToolTab("budget")}
                  className="rounded-xl text-xs font-semibold gap-1.5"
                >
                  💰 Trip Budget
                </Button>
                <Button
                  variant={activePlannerToolTab === "weather" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActivePlannerToolTab("weather")}
                  className="rounded-xl text-xs font-semibold gap-1.5"
                >
                  🌦️ Live Weather
                </Button>
                <Button
                  variant={activePlannerToolTab === "packing" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActivePlannerToolTab("packing")}
                  className="rounded-xl text-xs font-semibold gap-1.5"
                >
                  🎒 Smart Packing
                </Button>
              </div>

              {activePlannerToolTab === "schedule" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentDayNum = parseInt(activeDayTab.replace("day-", ""), 10) || 1;
                    setTargetDayForAdd(currentDayNum);
                    setShowAddActivityModal(true);
                  }}
                  className="rounded-2xl text-xs gap-1.5 shrink-0"
                >
                  <Plus className="size-3.5" /> Add Activity to Day
                </Button>
              )}
            </div>

            {/* View: Trip Budget Planner */}
            {activePlannerToolTab === "budget" && (
              <div className="space-y-6">
                <TripBudgetPlanner
                  items={generatedItinerary.days.flatMap((d) =>
                    d.activities.map((a) => ({
                      id: a.id || a.externalReferenceId || a.title,
                      category: a.itemType,
                      itemType: a.itemType,
                      title: a.title,
                      cost: a.numericCost || 0,
                      location: a.location,
                      currency: a.currency || "INR",
                      externalReferenceId: a.externalReferenceId,
                    }))
                  )}
                  destinationName={generatedItinerary.destination}
                  initialMaxBudget={maxBudget}
                  onMaxBudgetChange={setMaxBudget}
                  onSwapItem={handleSwapPlannerItem}
                />
              </div>
            )}

            {/* View: Weather-Aware Recommendations */}
            {activePlannerToolTab === "weather" && (
              <div className="space-y-6">
                <WeatherWidget
                  destinationName={generatedItinerary.destination}
                  latitude={selectedDestinationData.latitude}
                  longitude={selectedDestinationData.longitude}
                  variant="hero"
                  showExperiences={true}
                />
              </div>
            )}

            {/* View: Smart Packing List */}
            {activePlannerToolTab === "packing" && (
              <div className="space-y-6">
                <SmartPackingList
                  destinationName={generatedItinerary.destination}
                  durationDays={generatedItinerary.daysCount}
                  activities={generatedItinerary.interests}
                />
              </div>
            )}

            {/* View: Day-by-Day Schedule */}
            {activePlannerToolTab === "schedule" && (
              <div className="space-y-6">
                <Tabs
                  value={activeDayTab}
                  onValueChange={setActiveDayTab}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between overflow-x-auto pb-2">
                    <TabsList className="bg-muted p-1 rounded-2xl h-auto">
                      {generatedItinerary.days.map((d) => (
                        <TabsTrigger
                          key={`day-${d.day}`}
                          value={`day-${d.day}`}
                          className="rounded-xl py-2 px-4 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-xs"
                        >
                          DAY {d.day}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* Day Contents */}
                  {generatedItinerary.days.map((day) => (
                    <TabsContent
                      key={`day-${day.day}`}
                      value={`day-${day.day}`}
                      className="space-y-6 focus:outline-none"
                    >
                      {/* Day Header Banner */}
                      <div className="rounded-3xl bg-muted/40 border border-border p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h3 className="font-display text-xl font-bold text-foreground">
                            {day.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Focus: <span className="font-semibold text-foreground">{day.theme}</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase font-semibold">
                            Day Est. Expense
                          </p>
                          <p className="font-display text-lg font-bold text-primary">
                            {day.estimatedDailyExpense}
                          </p>
                        </div>
                      </div>

                      {/* Day Activities Timeline */}
                      <div className="space-y-4">
                        {day.activities.map((act, index) => {
                          const isHotel = act.itemType === "hotel";
                          const isRestaurant = act.itemType === "restaurant";
                          const isGuide = act.itemType === "guide";

                          return (
                            <div
                              key={act.id || `${day.day}-${index}`}
                              className="group rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-card flex flex-col md:flex-row items-start md:items-center gap-5"
                            >
                              {/* Left: Thumbnail image */}
                              <div className="relative size-full md:size-28 rounded-2xl overflow-hidden shrink-0 border border-border">
                                <img
                                  src={act.imageUrl || selectedDestinationData.cover_image}
                                  alt={act.title}
                                  className="size-full object-cover"
                                />
                                <Badge
                                  className={`absolute top-2 left-2 text-[10px] uppercase font-bold border-none ${
                                    isHotel
                                      ? "bg-sky-500 text-white"
                                      : isRestaurant
                                      ? "bg-amber-500 text-white"
                                      : isGuide
                                      ? "bg-purple-600 text-white"
                                      : "bg-primary text-primary-foreground"
                                  }`}
                                >
                                  {act.itemType}
                                </Badge>
                              </div>

                              {/* Center: Details */}
                              <div className="flex-1 space-y-1.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {act.timeSlot}
                                  </Badge>
                                  {act.rating && (
                                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                                      <Star className="size-3 fill-current" /> {act.rating}
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-display text-base sm:text-lg font-bold text-foreground">
                                  {act.title}
                                </h4>

                                {act.location && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="size-3 text-primary shrink-0" />
                                    <span className="truncate">{act.location}</span>
                                  </p>
                                )}

                                {act.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {act.description}
                                  </p>
                                )}
                              </div>

                              {/* Right: Price & Quick Action */}
                              <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                                <div className="text-left md:text-right">
                                  <p className="text-[11px] text-muted-foreground">Estimated</p>
                                  <p className="font-display text-base font-bold text-primary">
                                    {act.estimatedCost || `₹${act.numericCost}`}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setReplacingActivity({
                                        dayNumber: day.day,
                                        activityId: act.id || act.title,
                                        itemType: act.itemType,
                                      })
                                    }
                                    className="rounded-full text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground"
                                    title="Replace Activity"
                                  >
                                    <RefreshCw className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveActivity(day.day, act.id || act.title)}
                                    className="rounded-full text-xs h-8 px-2.5 text-muted-foreground hover:text-destructive"
                                    title="Remove from Itinerary"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Day Insider Tips & Food Suggestions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 space-y-2">
                          <p className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                            <Sparkles className="size-3.5" /> Day {day.day} Insider Tip
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {day.insiderTip}
                          </p>
                        </div>

                        <div className="rounded-3xl border border-border bg-card p-5 space-y-2">
                          <p className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                            <Utensils className="size-3.5 text-accent" /> Recommended Local Bites
                          </p>
                          <ul className="space-y-1">
                            {day.foodSuggestions.map((food, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-muted-foreground flex items-center gap-1.5"
                              >
                                <span className="size-1.5 rounded-full bg-accent shrink-0" />
                                {food}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                {/* 3. Practical Tips & Travel Advice */}
                <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4">
                  <h3 className="font-display text-xl font-bold flex items-center gap-2">
                    <Compass className="size-5 text-primary" /> Destination Practical Advice & Tips
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Local Practical Tips
                      </p>
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        {generatedItinerary.practicalTips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Packing Checklist
                      </p>
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        {generatedItinerary.packingAdvice.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="size-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ADD ACTIVITY MODAL ────────────────────────────────────────────── */}
        {showAddActivityModal && (
          <Dialog open={showAddActivityModal} onOpenChange={setShowAddActivityModal}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-bold">
                  Add Activity to Day {targetDayForAdd} ({selectedDestinationData.name})
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Browse genuine hotels, restaurants, tours, and human guides for this destination.
                </DialogDescription>
              </DialogHeader>

              {/* Filters */}
              <div className="space-y-3 py-2">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "all", label: "All Items" },
                    { id: "experience", label: "🗺️ Experiences" },
                    { id: "restaurant", label: "🍴 Restaurants" },
                    { id: "hotel", label: "🏨 Hotels & Stays" },
                    { id: "guide", label: "👨‍🏫 Tour Guides" },
                  ].map((tab) => (
                    <Button
                      key={tab.id}
                      type="button"
                      variant={activityCategoryFilter === tab.id ? "hero" : "outline"}
                      size="sm"
                      onClick={() => setActivityCategoryFilter(tab.id)}
                      className="rounded-full text-xs"
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>

                <Input
                  type="text"
                  placeholder="Search catalog items…"
                  value={activitySearchQuery}
                  onChange={(e) => setActivitySearchQuery(e.target.value)}
                  className="rounded-2xl text-xs"
                />
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-96">
                {filteredCatalogItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-2xl border border-border bg-card flex items-center justify-between gap-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.imageUrl || selectedDestinationData.cover_image}
                        alt={item.title}
                        className="size-14 rounded-xl object-cover shrink-0 border border-border"
                      />
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.location}</p>
                        <p className="text-xs font-semibold text-primary">{item.estimatedCost}</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="hero"
                      size="sm"
                      onClick={() => handleAddActivityToDay(item)}
                      className="rounded-full text-xs shrink-0"
                    >
                      <Plus className="size-3.5 mr-1" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ── REPLACE ACTIVITY MODAL ────────────────────────────────────────── */}
        {replacingActivity && (
          <Dialog
            open={Boolean(replacingActivity)}
            onOpenChange={(open) => {
              if (!open) setReplacingActivity(null);
            }}
          >
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-bold">
                  Choose Replacement Listing
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Pick an alternative verified listing from {selectedDestinationData.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-96 pt-2">
                {catalogForDestination.all
                  .filter((item) => item.itemType === replacingActivity.itemType || !replacingActivity.itemType)
                  .map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-2xl border border-border bg-card flex items-center justify-between gap-4 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.imageUrl || selectedDestinationData.cover_image}
                          alt={item.title}
                          className="size-14 rounded-xl object-cover shrink-0 border border-border"
                        />
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.location}</p>
                          <p className="text-xs font-semibold text-primary">{item.estimatedCost}</p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="hero"
                        size="sm"
                        onClick={() => handleReplaceActivity(item)}
                        className="rounded-full text-xs shrink-0"
                      >
                        Select
                      </Button>
                    </div>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PageShell>
  );
}
