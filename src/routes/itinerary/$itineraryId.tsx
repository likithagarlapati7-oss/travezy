import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  DollarSign,
  Edit,
  ExternalLink,
  Hotel,
  Loader2,
  MapPin,
  Plus,
  Printer,
  Share2,
  Sparkles,
  Star,
  Trash2,
  User,
  Users,
  Utensils,
  TrendingDown,
  CloudSun,
  Luggage,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  addItineraryItemFn,
  deleteItineraryItemFn,
  getTripPlanByIdFn,
  updateItineraryItemFn,
} from "@/lib/itinerary.functions";
import { TripBudgetPlanner } from "@/components/TripBudgetPlanner";
import { WeatherWidget } from "@/components/WeatherWidget";
import { SmartPackingList } from "@/components/SmartPackingList";
import { calculateItineraryBudget, type CheaperAlternativeOption } from "@/lib/budget";
import { HOTELS_AND_STAYS } from "@/data/hotels-and-stays";
import { INDIAN_RESTAURANTS } from "@/data/indian-restaurants";
import { TOURS_AND_EXPERIENCES } from "@/data/tours-and-experiences";
import { HUMAN_TOUR_GUIDES } from "@/data/human-guides";
import { DESTINATIONS_DATA } from "@/data/destinations-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/itinerary/$itineraryId")({
  head: () => ({
    meta: [
      { title: "Itinerary Details & Smart Travel Tools — Travezy" },
      {
        name: "description",
        content: "View, customize, and manage budget, live weather, and smart packing for your holiday.",
      },
    ],
  }),
  component: ItineraryDetailsPage,
});

function ItineraryDetailsPage() {
  const { itineraryId } = Route.useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeMainTab, setActiveMainTab] = useState<"itinerary" | "budget" | "weather" | "packing">("itinerary");
  const [activeDayTab, setActiveDayTab] = useState<string>("day-1");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addDayTarget, setAddDayTarget] = useState<number>(1);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const getPlanFn = useServerFn(getTripPlanByIdFn);
  const addItemFn = useServerFn(addItineraryItemFn);
  const deleteItemFn = useServerFn(deleteItineraryItemFn);
  const updateItemFn = useServerFn(updateItineraryItemFn);

  // Fetch Itinerary Data
  const {
    data: tripPlan,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["trip-plan", itineraryId],
    queryFn: async () => {
      return await getPlanFn({ data: { id: itineraryId } });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: any) => {
      return await addItemFn({
        data: {
          tripPlanId: itineraryId,
          item: {
            dayNumber: addDayTarget,
            timeSlot: item.timeSlot || "morning",
            itemType: item.itemType || "experience",
            title: item.title,
            description: item.description,
            location: item.location,
            estimatedCost: Number(item.numericCost || 0),
            imageUrl: item.imageUrl,
            rating: item.rating,
            bookingUrl: item.bookingUrl,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-plan", itineraryId] });
      queryClient.invalidateQueries({ queryKey: ["user-trip-plans"] });
      setShowAddModal(false);
      toast.success("Activity added to your itinerary!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add activity.");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await deleteItemFn({
        data: { itemId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-plan", itineraryId] });
      queryClient.invalidateQueries({ queryKey: ["user-trip-plans"] });
      toast.success("Activity removed.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove activity.");
    },
  });

  // Group items by day
  const daysMap = useMemo(() => {
    const map = new Map<number, any[]>();
    const totalDays = tripPlan?.days_count || 1;
    for (let d = 1; d <= totalDays; d++) {
      map.set(d, []);
    }

    (tripPlan?.itinerary_items || []).forEach((item: any) => {
      const d = item.day_number || 1;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(item);
    });

    return map;
  }, [tripPlan]);

  // Compute live budget status from actual items
  const budgetStatus = useMemo(() => {
    return calculateItineraryBudget(
      tripPlan?.itinerary_items || [],
      tripPlan?.estimated_total_cost || 35000
    );
  }, [tripPlan]);

  // Handle swapping cheaper option
  const handleSwapCheaperOption = async (option: CheaperAlternativeOption) => {
    const found = (tripPlan?.itinerary_items || []).find(
      (i: any) => i.title === option.currentItemTitle
    );

    if (found) {
      await deleteItemMutation.mutateAsync(found.id);
      await addItemMutation.mutateAsync({
        itemType: option.category === "hotels" ? "hotel" : option.category === "food" ? "restaurant" : "experience",
        timeSlot: found.time_slot || "morning",
        title: option.cheaperItem.title,
        description: option.cheaperItem.description,
        location: option.cheaperItem.city,
        numericCost: option.cheaperItem.price,
        imageUrl: option.cheaperItem.image_url,
        rating: option.cheaperItem.rating,
      });
      toast.success(`Swapped "${option.currentItemTitle}" with "${option.cheaperItem.title}" — Saved ₹${option.savings.toLocaleString("en-IN")}!`);
    }
  };

  // Catalog items for the destination
  const destinationCatalog = useMemo(() => {
    if (!tripPlan) return [];
    const dest = tripPlan.destination.toLowerCase();
    const slug = (tripPlan.destination_slug || "").toLowerCase();

    const hotels = HOTELS_AND_STAYS.filter(
      (h) => h.destination.toLowerCase().includes(slug) || h.destination.toLowerCase().includes(dest) || (h.state && h.state.toLowerCase().includes(dest))
    ).map((h) => ({
      id: h.id,
      itemType: "hotel",
      timeSlot: "night",
      title: h.title,
      description: h.description,
      location: `${h.city}, ${h.state}`,
      estimatedCost: `₹${h.price.toLocaleString("en-IN")}/night`,
      numericCost: h.price,
      imageUrl: h.image_url,
      rating: h.rating,
      bookingUrl: `/destinations/${slug || dest}`,
    }));

    const restaurants = INDIAN_RESTAURANTS.filter(
      (r) => r.destination.toLowerCase().includes(slug) || r.destination.toLowerCase().includes(dest) || (r.state && r.state.toLowerCase().includes(dest))
    ).map((r) => ({
      id: r.id,
      itemType: "restaurant",
      timeSlot: "afternoon",
      title: r.title,
      description: r.description,
      location: `${r.city}, ${r.state}`,
      estimatedCost: `₹${r.price.toLocaleString("en-IN")}`,
      numericCost: r.price,
      imageUrl: r.image_url,
      rating: r.rating,
      bookingUrl: `/destinations/${slug || dest}`,
    }));

    const tours = TOURS_AND_EXPERIENCES.filter(
      (t) => t.destination.toLowerCase().includes(slug) || t.destination.toLowerCase().includes(dest) || (t.state && t.state.toLowerCase().includes(dest))
    ).map((t) => ({
      id: t.id,
      itemType: "experience",
      timeSlot: "morning",
      title: t.title,
      description: t.description,
      location: `${t.city}, ${t.state}`,
      estimatedCost: `₹${t.price.toLocaleString("en-IN")}`,
      numericCost: t.price,
      imageUrl: t.image_url,
      rating: t.rating,
      bookingUrl: `/tours`,
    }));

    const guides = HUMAN_TOUR_GUIDES.filter((g) =>
      g.coverage_areas.some((a) => a.toLowerCase().includes(dest) || a.toLowerCase().includes(slug)) || g.state.toLowerCase().includes(dest)
    ).map((g) => ({
      id: g.id,
      itemType: "guide",
      timeSlot: "morning",
      title: `${g.name} — Local Guide`,
      description: `Languages: ${g.languages.join(", ")}.`,
      location: `${g.city}, ${g.state}`,
      estimatedCost: `₹${g.hourly_rate.toLocaleString("en-IN")}/hr`,
      numericCost: g.hourly_rate * 3,
      imageUrl: g.profile_image,
      rating: g.rating,
      bookingUrl: `/guides/${g.id}`,
    }));

    return [...hotels, ...restaurants, ...tours, ...guides];
  }, [tripPlan]);

  const filteredCatalog = useMemo(() => {
    let items = destinationCatalog;
    if (categoryFilter !== "all") {
      items = items.filter((i) => i.itemType === categoryFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.location && i.location.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q))
    );
  }, [destinationCatalog, categoryFilter, searchQuery]);

  if (isLoading) {
    return (
      <PageShell title="Loading Itinerary…">
        <div className="space-y-6">
          <div className="h-80 rounded-3xl bg-muted animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  if (isError || !tripPlan) {
    return (
      <PageShell title="Itinerary Not Found">
        <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4">
          <p className="text-muted-foreground">{error?.message || "Could not load itinerary."}</p>
          <Button asChild variant="default">
            <Link to="/tourist/itineraries">View My Itineraries</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={`Itinerary • ${tripPlan.destination}`}
      title={tripPlan.title}
      subtitle={`Personalized ${tripPlan.days_count}-day itinerary for ${tripPlan.travelers_count} travellers.`}
    >
      <div className="space-y-8">
        {/* Master Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="h-64 sm:h-80 w-full relative overflow-hidden">
            <img
              src={
                tripPlan.cover_image_url ||
                "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944"
              }
              alt={tripPlan.title}
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            <div className="absolute top-4 left-4 right-4 flex justify-between items-center gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full bg-black/40 text-white border-white/20 backdrop-blur-md text-xs hover:bg-black/60"
              >
                <Link to="/tourist/itineraries">
                  <ArrowLeft className="size-3.5 mr-1" /> All Itineraries
                </Link>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="rounded-full bg-black/40 text-white border-white/20 backdrop-blur-md text-xs hover:bg-black/60"
                >
                  <Printer className="size-3.5 mr-1" /> Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied to clipboard!");
                  }}
                  className="rounded-full bg-black/40 text-white border-white/20 backdrop-blur-md text-xs hover:bg-black/60"
                >
                  <Share2 className="size-3.5 mr-1" /> Share
                </Button>
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground font-bold text-xs border-none">
                  {tripPlan.days_count} Days
                </Badge>
                <Badge className="bg-white/20 text-white backdrop-blur-md text-xs border-none capitalize">
                  {tripPlan.budget_tier}
                </Badge>
                <Badge className="bg-white/20 text-white backdrop-blur-md text-xs border-none capitalize">
                  {tripPlan.travel_style}
                </Badge>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl font-extrabold leading-tight">
                {tripPlan.title}
              </h1>
              {tripPlan.summary && (
                <p className="text-sm text-white/85 max-w-3xl leading-relaxed line-clamp-2">
                  {tripPlan.summary}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── UNIFIED TRIP OVERVIEW DASHBOARD CARD ──────────────────────────── */}
        <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/40 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Sparkles className="size-4" /> TRIP OVERVIEW
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              Live Smart Tools Summary
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Destination & Travelers */}
            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5 text-rose-500" /> Trip Details
              </span>
              <p className="font-display text-base font-bold text-foreground">
                📍 {tripPlan.destination}
              </p>
              <p className="text-xs text-muted-foreground">
                📅 {tripPlan.days_count} Days • 👥 {tripPlan.travelers_count} {tripPlan.travelers_count === 1 ? "Traveller" : "Travellers"}
              </p>
            </div>

            {/* 2. Budget Summary */}
            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-emerald-500" /> 💰 Budget
                </span>
                <Badge
                  className={cn(
                    "text-[10px] font-bold py-0 px-1.5",
                    budgetStatus.isOverBudget
                      ? "bg-rose-500/15 text-rose-600 border-rose-300"
                      : "bg-emerald-500/15 text-emerald-600 border-emerald-300"
                  )}
                >
                  {budgetStatus.isOverBudget ? "Over Budget" : "Within Budget"}
                </Badge>
              </div>
              <p className="font-display text-base font-bold text-foreground">
                ₹{budgetStatus.totalEstimated.toLocaleString("en-IN")}{" "}
                <span className="text-xs font-normal text-muted-foreground">est.</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Max Target: <strong>₹{(tripPlan.estimated_total_cost || 35000).toLocaleString("en-IN")}</strong>
              </p>
            </div>

            {/* 3. Live Weather Summary */}
            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <CloudSun className="size-3.5 text-sky-500" /> 🌦️ Weather
              </span>
              <WeatherWidget
                destinationName={tripPlan.destination}
                variant="compact"
                className="w-full justify-start p-0 bg-transparent border-none shadow-none font-bold text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Live forecast with activity suitability
              </p>
            </div>

            {/* 4. Packing Summary */}
            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Luggage className="size-3.5 text-purple-500" /> 🎒 Packing
              </span>
              <p className="font-display text-base font-bold text-foreground">
                Smart Packing List
              </p>
              <p className="text-xs text-muted-foreground">
                Auto-tailored checklist with climate gear
              </p>
            </div>
          </div>
        </div>

        {/* ─── MAIN TABS NAVIGATION ───────────────────────────────────────────── */}
        <Tabs
          value={activeMainTab}
          onValueChange={(val) => setActiveMainTab(val as any)}
          className="w-full space-y-6"
        >
          <div className="sticky top-20 z-20 backdrop-blur-xl bg-background/90 p-2 rounded-2xl border border-border shadow-xs">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted rounded-xl gap-1">
              <TabsTrigger
                value="itinerary"
                className="rounded-lg py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Calendar className="size-4" />
                <span>Schedule ({tripPlan.days_count} Days)</span>
              </TabsTrigger>

              <TabsTrigger
                value="budget"
                className="rounded-lg py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
              >
                <DollarSign className="size-4 text-emerald-500" />
                <span>💰 Trip Budget</span>
              </TabsTrigger>

              <TabsTrigger
                value="weather"
                className="rounded-lg py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
              >
                <CloudSun className="size-4 text-sky-500" />
                <span>🌦️ Weather</span>
              </TabsTrigger>

              <TabsTrigger
                value="packing"
                className="rounded-lg py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Luggage className="size-4 text-purple-500" />
                <span>🎒 Packing List</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ─── TAB 1: DAY-BY-DAY ITINERARY ──────────────────────────────────── */}
          <TabsContent value="itinerary" className="space-y-6 animate-fade-in m-0">
            {/* Days Horizontal Tab Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {Array.from({ length: tripPlan.days_count }, (_, i) => i + 1).map((dayNum) => {
                const dayKey = `day-${dayNum}`;
                const itemsCount = daysMap.get(dayNum)?.length || 0;
                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setActiveDayTab(dayKey)}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all shrink-0 border",
                      activeDayTab === dayKey
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-foreground hover:bg-muted border-border"
                    )}
                  >
                    <span>Day {dayNum}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0 rounded-full",
                        activeDayTab === dayKey
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {itemsCount}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Daily Schedule Items */}
            {Array.from({ length: tripPlan.days_count }, (_, i) => i + 1).map((dayNum) => {
              const dayKey = `day-${dayNum}`;
              if (activeDayTab !== dayKey) return null;

              const dayItems = daysMap.get(dayNum) || [];

              return (
                <div key={dayNum} className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Day {dayNum} Schedule
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddDayTarget(dayNum);
                        setShowAddModal(true);
                      }}
                      className="rounded-full text-xs font-semibold gap-1.5"
                    >
                      <Plus className="size-3.5" /> Add Activity to Day {dayNum}
                    </Button>
                  </div>

                  {dayItems.length > 0 ? (
                    <div className="space-y-3">
                      {dayItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="size-14 rounded-xl object-cover shrink-0"
                              />
                            ) : (
                              <div className="flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground shrink-0">
                                <Compass className="size-6" />
                              </div>
                            )}

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge className="text-[10px] uppercase font-bold py-0 px-1.5 capitalize">
                                  {item.time_slot}
                                </Badge>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {item.item_type}
                                </span>
                              </div>

                              <h4 className="font-display font-bold text-sm text-foreground line-clamp-1">
                                {item.title}
                              </h4>

                              {item.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="size-3 text-primary" /> {item.location}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                            {item.estimated_cost !== null && item.estimated_cost !== undefined && (
                              <span className="font-bold text-sm text-foreground">
                                ₹{Number(item.estimated_cost).toLocaleString("en-IN")}
                              </span>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              className="size-8 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                              title="Delete activity"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 rounded-3xl border border-dashed border-border text-center space-y-3 bg-muted/20">
                      <p className="text-sm text-muted-foreground">
                        No activities scheduled for Day {dayNum} yet.
                      </p>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setAddDayTarget(dayNum);
                          setShowAddModal(true);
                        }}
                        className="rounded-full text-xs font-semibold gap-1.5"
                      >
                        <Plus className="size-3.5" /> Add from Catalog
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* ─── TAB 2: TRIP BUDGET PLANNER ───────────────────────────────────── */}
          <TabsContent value="budget" className="space-y-6 animate-fade-in m-0">
            <TripBudgetPlanner
              items={tripPlan.itinerary_items || []}
              destinationName={tripPlan.destination}
              initialMaxBudget={tripPlan.estimated_total_cost || 35000}
              onSwapItem={handleSwapCheaperOption}
            />
          </TabsContent>

          {/* ─── TAB 3: LIVE WEATHER & RECOMMENDATIONS ────────────────────────── */}
          <TabsContent value="weather" className="space-y-6 animate-fade-in m-0">
            <WeatherWidget
              destinationName={tripPlan.destination}
              variant="card"
              showExperiences={true}
            />
          </TabsContent>

          {/* ─── TAB 4: SMART PACKING LIST ────────────────────────────────────── */}
          <TabsContent value="packing" className="space-y-6 animate-fade-in m-0">
            <SmartPackingList
              tripPlanId={itineraryId}
              destinationName={tripPlan.destination}
              durationDays={tripPlan.days_count}
              weatherSummary={budgetStatus.isWithinBudget ? "Fair skies" : "Mixed conditions"}
              activities={(tripPlan.itinerary_items || []).map((i: any) => i.title)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── ADD ACTIVITY DIALOG ──────────────────────────────────────────────── */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">
              Add Activity to Day {addDayTarget} ({tripPlan.destination})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose from verified local hotels, authentic dining, eco tours, or guides.
            </DialogDescription>
          </DialogHeader>

          {/* Category Filter & Search */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search local activities..."
              className="h-8 text-xs rounded-xl flex-1"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2.5 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="all">All Categories</option>
              <option value="hotel">Hotels & Stays</option>
              <option value="restaurant">Restaurants</option>
              <option value="experience">Experiences</option>
              <option value="guide">Human Guides</option>
            </select>
          </div>

          {/* Filtered Catalog List */}
          <div className="space-y-2.5 mt-3 max-h-[50vh] overflow-y-auto pr-1">
            {filteredCatalog.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="size-12 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-xs text-foreground line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.location} • <strong>{item.estimatedCost}</strong>
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => addItemMutation.mutate(item)}
                  disabled={addItemMutation.isPending}
                  className="rounded-xl text-xs font-semibold h-8 px-3 shrink-0"
                >
                  <Plus className="size-3.5 mr-1" /> Add
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
