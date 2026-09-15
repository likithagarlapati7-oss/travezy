import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  ExternalLink,
  Eye,
  FileEdit,
  Filter,
  Flame,
  Globe2,
  Hotel,
  Image as ImageIcon,
  Info,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Users,
  Utensils,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { MapboxLocationPicker, type LocationResult } from "@/components/MapboxLocationPicker";
import { CloudinaryImageUpload } from "@/components/CloudinaryImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import {
  createService,
  deleteService,
  toggleServiceActive,
  updateService,
} from "@/lib/services.functions";
import {
  CANCELLATION_POLICIES,
  COMMON_AMENITIES,
  CURRENCIES,
  SERVICE_CATEGORIES,
  serviceInputSchema,
  type ServiceInput,
} from "@/lib/services.schema";
import {
  formatPrice,
  myProviderQuery,
  providerBookingsQuery,
  providerServicesQuery,
  type Service,
} from "@/lib/travezy";
import { getServiceCoordinates, isValidCoord } from "@/lib/mapbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/provider/services")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Service Listings Management — Travezy Provider Hub" },
      {
        name: "description",
        content: "Create, edit, publish and manage your hotel, resort, tour, and experience listings on Travezy.",
      },
      { property: "og:title", content: "Service Listings Management — Travezy Provider Hub" },
      {
        property: "og:description",
        content: "Manage the listings your business offers on Travezy.",
      },
    ],
  }),
  component: ProviderServices,
});

const CURATED_SAMPLE_IMAGES = [
  { label: "Luxury Heritage Stay", url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80" },
  { label: "Backwater Houseboat / Resort", url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80" },
  { label: "Hill Station Villa / Tea Estate", url: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80" },
  { label: "Coastal Beach Resort", url: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80" },
  { label: "Desert Safari & Cultural Camp", url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80" },
  { label: "Fine Dining & Culinary Experience", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80" },
];

interface FormErrors {
  title?: string;
  category?: string;
  destination?: string;
  city?: string;
  state?: string;
  country?: string;
  price?: string;
  currency?: string;
  max_guests?: string;
  duration?: string;
  description?: string;
  image_url?: string;
}

const emptyFormState: {
  title: string;
  category: typeof SERVICE_CATEGORIES[number];
  destination: string;
  city: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
  price: string;
  currency: typeof CURRENCIES[number];
  max_guests: string;
  duration: string;
  description: string;
  image_url: string;
  amenities: string[];
  inclusions: string;
  exclusions: string;
  cancellation_policy: string;
  is_active: boolean;
} = {
  title: "",
  category: "hotel",
  destination: "",
  city: "",
  state: "",
  country: "India",
  latitude: "",
  longitude: "",
  price: "",
  currency: "INR",
  max_guests: "4",
  duration: "Per Night",
  description: "",
  image_url: "",
  amenities: ["Free High-Speed Wi-Fi", "Air Conditioning / Climate Control"],
  inclusions: "Complimentary breakfast, Welcome drink, High-speed Wi-Fi",
  exclusions: "Airport taxi charges, Personal laundry, Alcoholic beverages",
  cancellation_policy: "flexible",
  is_active: true,
};

function ProviderServices() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const { data: provider } = useQuery({ ...myProviderQuery(userId), enabled: !!userId });
  const providerId = provider?.id ?? "";

  const {
    data: services = [],
    isLoading: isServicesLoading,
    isError,
    refetch,
  } = useQuery({
    ...providerServicesQuery(providerId),
    enabled: !!providerId,
  });

  const { data: bookings = [] } = useQuery({
    ...providerBookingsQuery(providerId),
    enabled: !!providerId,
  });

  const createFn = useServerFn(createService);
  const updateFn = useServerFn(updateService);
  const toggleActiveFn = useServerFn(toggleServiceActive);
  const removeFn = useServerFn(deleteService);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "location" | "media" | "details">("basic");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [previewService, setPreviewService] = useState<Service | null>(null);
  const [toDeleteService, setToDeleteService] = useState<Service | null>(null);

  // Booking count per service lookup
  const serviceBookingCounts = useMemo(() => {
    const counts = new Map<string, { total: number; active: number }>();
    for (const b of bookings) {
      if (!b.service_id) continue;
      const cur = counts.get(b.service_id) || { total: 0, active: 0 };
      cur.total++;
      if (b.status === "confirmed" || b.status === "pending") {
        cur.active++;
      }
      counts.set(b.service_id, cur);
    }
    return counts;
  }, [bookings]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.is_active).length;
    const inactive = total - active;
    const totalCapacity = services.reduce((sum, s) => sum + (s.max_guests || 2), 0);
    return { total, active, inactive, totalCapacity };
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (statusFilter === "active" && !s.is_active) return false;
      if (statusFilter === "inactive" && s.is_active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesDest = s.destination.toLowerCase().includes(q);
        const matchesCity = (s.city || "").toLowerCase().includes(q);
        const matchesCategory = s.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDest && !matchesCity && !matchesCategory) return false;
      }
      return true;
    });
  }, [services, categoryFilter, statusFilter, searchQuery]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["provider-services", providerId] });
    qc.invalidateQueries({ queryKey: ["services"] });
  }

  // Location picker sync
  function applyLocationResult(r: LocationResult) {
    const shortName = r.placeName.split(",")[0]?.trim() ?? r.placeName;
    setForm((f) => ({
      ...f,
      destination: shortName,
      city: r.city || shortName,
      state: r.state || f.state,
      country: r.country || f.country,
      latitude: String(r.lat),
      longitude: String(r.lng),
    }));
  }

  function clearGeoPin() {
    setForm((f) => ({ ...f, latitude: "", longitude: "" }));
  }

  function openCreateModal() {
    setEditingService(null);
    setForm(emptyFormState);
    setErrors({});
    setActiveTab("basic");
    setIsFormOpen(true);
  }

  function openEditModal(s: Service) {
    const coords = getServiceCoordinates(s);
    setEditingService(s);
    setForm({
      title: s.title,
      category: (s.category as typeof SERVICE_CATEGORIES[number]) || "hotel",
      destination: s.destination,
      city: s.city ?? "",
      state: s.state ?? "",
      country: s.country ?? "India",
      latitude: coords != null ? String(coords.lat) : "",
      longitude: coords != null ? String(coords.lng) : "",
      price: String(s.price),
      currency: (s.currency as typeof CURRENCIES[number]) || "INR",
      max_guests: String(s.max_guests ?? 4),
      duration: "Per Night",
      description: s.description ?? "",
      image_url: s.image_url ?? "",
      amenities: ["Free High-Speed Wi-Fi", "Air Conditioning / Climate Control"],
      inclusions: "Complimentary breakfast, Welcome drink, High-speed Wi-Fi",
      exclusions: "Airport taxi charges, Personal laundry, Alcoholic beverages",
      cancellation_policy: "flexible",
      is_active: s.is_active ?? true,
    });
    setErrors({});
    setActiveTab("basic");
    setIsFormOpen(true);
  }

  function toggleAmenity(amenity: string) {
    setForm((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  }

  // Save / Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const lat = form.latitude ? Number(form.latitude) : undefined;
      const lng = form.longitude ? Number(form.longitude) : undefined;
      const parsedPrice = Number(form.price);
      const parsedMaxGuests = form.max_guests ? parseInt(form.max_guests, 10) : 4;

      const payload: ServiceInput = {
        title: form.title,
        description: form.description,
        category: form.category,
        destination: form.destination,
        city: form.city,
        state: form.state,
        country: form.country,
        price: parsedPrice,
        currency: form.currency,
        max_guests: parsedMaxGuests,
        duration: form.duration,
        amenities: form.amenities,
        cancellation_policy: form.cancellation_policy,
        is_active: form.is_active,
        image_url: form.image_url,
        latitude: lat,
        longitude: lng,
      };

      const parsed = serviceInputSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: FormErrors = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0]) as keyof FormErrors;
          fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);

        // Switch to the relevant tab containing the error
        if (fieldErrors.title || fieldErrors.category || fieldErrors.price || fieldErrors.max_guests) {
          setActiveTab("basic");
        } else if (fieldErrors.destination || fieldErrors.city || fieldErrors.state) {
          setActiveTab("location");
        } else if (fieldErrors.image_url) {
          setActiveTab("media");
        } else if (fieldErrors.description) {
          setActiveTab("details");
        }

        throw new Error("Please complete the required fields highlighted in red.");
      }

      setErrors({});

      if (editingService) {
        return await updateFn({ data: { id: editingService.id, values: parsed.data } });
      } else {
        return await createFn({ data: parsed.data });
      }
    },
    onSuccess: () => {
      toast.success(editingService ? "Service listing updated successfully!" : "Service listing published live!");
      setIsFormOpen(false);
      setEditingService(null);
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to save service listing.");
    },
  });

  // Toggle Active/Inactive status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return await toggleActiveFn({ data: { id, is_active } });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.is_active ? "Listing activated & published live!" : "Listing unpublished to draft status.");
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to toggle service status.");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await removeFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Service listing permanently deleted.");
      setToDeleteService(null);
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to delete service.");
    },
  });

  return (
    <PageShell
      eyebrow="Provider Console"
      title="My Service Listings"
      subtitle="Create, configure, publish and manage your hotels, stays, culinary dining, and tour experiences on Travezy."
    >
      <div className="space-y-6">
        {/* ─── 1. Telemetry KPI Metric Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Services</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Layers className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{stats.total}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Listings created</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Active / Live</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">{stats.active}</div>
            <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/80">Visible to tourists</p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Drafts / Inactive</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <XCircle className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">{stats.inactive}</div>
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80">Hidden from discovery</p>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">Total Capacity</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Users className="size-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-400">{stats.totalCapacity}</div>
            <p className="mt-0.5 text-xs text-purple-600/80 dark:text-purple-400/80">Max simultaneous guests</p>
          </div>
        </div>

        {/* ─── 2. Controls & Actions Hub ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services by title, destination, city..."
                className="h-10 rounded-xl pl-9 bg-background/80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center rounded-xl border border-border/70 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  statusFilter === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  statusFilter === "active"
                    ? "bg-emerald-500 text-white font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Live ({stats.active})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  statusFilter === "inactive"
                    ? "bg-amber-500 text-white font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Drafts ({stats.inactive})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/provider/calendar">
              <Button variant="outline" className="h-10 rounded-xl gap-2 border-border/80">
                <Calendar className="size-4 text-primary" />
                <span>Availability Calendar</span>
              </Button>
            </Link>
            <Button
              variant="ocean"
              onClick={openCreateModal}
              className="h-10 rounded-xl gap-2 font-medium shadow-md"
            >
              <Plus className="size-4" />
              <span>Add New Service</span>
            </Button>
          </div>
        </div>

        {/* ─── 3. Category Filter Tabs ────────────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all",
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "border border-border/60 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
            )}
          >
            All Categories
          </button>
          {SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "shrink-0 capitalize rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all",
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "border border-border/60 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ─── 4. Services Grid / List ────────────────────────────────────────── */}
        {isServicesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-3xl border border-border/60 bg-muted/40" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <Compass className="size-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {services.length === 0 ? "No services created yet" : "No matching services found"}
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {services.length === 0
                ? "Get started by adding your first hotel stay, dining experience, or tour package to receive bookings."
                : "Try adjusting your search keywords or switching category/status filters."}
            </p>
            {services.length === 0 ? (
              <Button variant="ocean" onClick={openCreateModal} className="mt-5 rounded-xl gap-2">
                <Plus className="size-4" /> Add Your First Service
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                }}
                className="mt-4 rounded-xl"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => {
              const coords = getServiceCoordinates(service);
              const bStats = serviceBookingCounts.get(service.id) ?? { total: 0, active: 0 };
              const isLive = service.is_active ?? true;

              return (
                <div
                  key={service.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <div>
                    {/* Image Header with Badges */}
                    <div className="relative aspect-video w-full overflow-hidden bg-muted">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.title}
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 text-muted-foreground">
                          <ImageIcon className="size-10 opacity-40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute left-3 top-3 flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="capitalize bg-background/90 text-foreground font-semibold backdrop-blur-md shadow-xs text-xs"
                        >
                          {service.category}
                        </Badge>
                        {coords && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/90 text-white font-medium backdrop-blur-md text-[10px] gap-1"
                          >
                            <MapPin className="size-2.5" /> GPS Pin
                          </Badge>
                        )}
                      </div>

                      {/* Live / Draft Switch Pill */}
                      <div className="absolute right-3 top-3">
                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md shadow-sm border",
                            isLive
                              ? "bg-emerald-500/90 text-white border-emerald-400/50"
                              : "bg-amber-500/90 text-white border-amber-400/50"
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-white animate-pulse" />
                          <span>{isLive ? "Live" : "Draft"}</span>
                        </div>
                      </div>

                      {/* Bottom Info on Image */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                        <div className="flex items-center gap-1 text-xs font-medium drop-shadow-sm">
                          <MapPin className="size-3.5 text-primary-foreground" />
                          <span className="truncate max-w-[160px]">
                            {service.city || service.destination}, {service.state || service.country}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold drop-shadow-sm">
                            {formatPrice(service.price, service.currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors">
                          {service.title}
                        </h4>
                      </div>

                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                        {service.description || "No detailed description provided."}
                      </p>

                      {/* Meta Tags / Metrics Row */}
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="size-3.5 text-primary" />
                          <span>Cap: <strong className="text-foreground">{service.max_guests || 2}</strong></span>
                        </div>
                        <span className="text-border">•</span>
                        <div className="flex items-center gap-1">
                          <Star className="size-3.5 fill-amber-400 text-amber-500" />
                          <span><strong>{service.rating || "5.0"}</strong> ({service.review_count || 0})</span>
                        </div>
                        <span className="text-border">•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3.5 text-blue-500" />
                          <span><strong>{bStats.total}</strong> bookings</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="border-t border-border/60 bg-muted/20 p-3.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isLive}
                        onCheckedChange={(checked) =>
                          toggleStatusMutation.mutate({ id: service.id, is_active: checked })
                        }
                        aria-label="Toggle Service Live Status"
                        title={isLive ? "Unpublish listing" : "Publish listing live"}
                      />
                      <span className="text-xs text-muted-foreground">
                        {isLive ? "Published" : "Hidden"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewService(service)}
                        className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Quick Preview"
                      >
                        <Eye className="size-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(service)}
                        className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Edit Service"
                      >
                        <Pencil className="size-4" />
                      </Button>

                      <a href={`/services/${service.id}`} target="_blank" rel="noreferrer">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                          title="View on Public Site"
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      </a>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setToDeleteService(service)}
                        className="size-8 p-0 rounded-lg text-rose-500/80 hover:bg-rose-500/10 hover:text-rose-600"
                        title="Delete Service"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 5. Comprehensive Create / Edit Service Modal ────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingService ? "Edit Service Listing" : "Create New Service Listing"}
            </DialogTitle>
            <DialogDescription>
              Configure all information, location coordinates, amenities, capacity, and cancellation policies for your listing.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-2">
            <TabsList className="grid grid-cols-4 rounded-xl bg-muted/60 p-1">
              <TabsTrigger value="basic" className="rounded-lg text-xs font-semibold">
                1. Basic Info
              </TabsTrigger>
              <TabsTrigger value="location" className="rounded-lg text-xs font-semibold">
                2. Location & Map
              </TabsTrigger>
              <TabsTrigger value="media" className="rounded-lg text-xs font-semibold">
                3. Photos & Media
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-lg text-xs font-semibold">
                4. Details & Policies
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: BASIC INFO */}
            <TabsContent value="basic" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-semibold">
                    Service Name / Title <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Whispering Pines Luxury Plantation Resort"
                    className="h-11 rounded-xl"
                  />
                  {errors.title && <p className="text-xs text-rose-500">{errors.title}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold">
                    Service Category <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm capitalize"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs font-semibold">
                      Price <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      min="1"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="e.g. 4500"
                      className="h-11 rounded-xl"
                    />
                    {errors.price && <p className="text-xs text-rose-500">{errors.price}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="currency" className="text-xs font-semibold">
                      Currency
                    </Label>
                    <select
                      id="currency"
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value as any })}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="max_guests" className="text-xs font-semibold">
                    Max Guest Capacity <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="max_guests"
                    type="number"
                    min="1"
                    max="500"
                    value={form.max_guests}
                    onChange={(e) => setForm({ ...form, max_guests: e.target.value })}
                    placeholder="e.g. 4"
                    className="h-11 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">Max simultaneous capacity for real-time calendar availability.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="duration" className="text-xs font-semibold">
                    Pricing Duration / Unit
                  </Label>
                  <Input
                    id="duration"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="e.g. Per Night / 3 Hours / Full Day"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: LOCATION & MAP */}
            <TabsContent value="location" className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Interactive Location Pin & Geocoder (Mapbox)
                </Label>
                <MapboxLocationPicker
                  key={editingService?.id ?? "new"}
                  initialLat={form.latitude ? Number(form.latitude) : undefined}
                  initialLng={form.longitude ? Number(form.longitude) : undefined}
                  initialPlaceName={
                    editingService
                      ? [editingService.destination, editingService.city, editingService.country]
                          .filter(Boolean)
                          .join(", ")
                      : form.destination
                  }
                  onLocationChange={applyLocationResult}
                  onClear={clearGeoPin}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="destination" className="text-xs font-semibold">
                    Destination Region <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="destination"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    placeholder="e.g. Kerala, Goa, Rajasthan"
                    className="h-11 rounded-xl"
                  />
                  {errors.destination && <p className="text-xs text-rose-500">{errors.destination}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold">
                    City / Locality
                  </Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Munnar, Fort Kochi, Calangute"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs font-semibold">
                    State / Province
                  </Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="e.g. Kerala"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-xs font-semibold">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="India"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: MEDIA & PHOTOS */}
            <TabsContent value="media" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Upload Cover Photo</Label>
                <CloudinaryImageUpload
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                  folder="travezy_services"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="image_url" className="text-xs font-semibold">
                  Or Direct Image URL
                </Label>
                <Input
                  id="image_url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="h-11 rounded-xl"
                />
                {errors.image_url && <p className="text-xs text-rose-500">{errors.image_url}</p>}
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Quick Scenic Presets (Click to choose)
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CURATED_SAMPLE_IMAGES.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => setForm({ ...form, image_url: sample.url })}
                      className={cn(
                        "group relative aspect-video overflow-hidden rounded-xl border text-left transition-all",
                        form.image_url === sample.url
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-border/60 hover:border-primary/50"
                      )}
                    >
                      <img src={sample.url} alt={sample.label} className="size-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 p-2 flex items-end">
                        <span className="text-[10px] font-semibold text-white leading-tight">
                          {sample.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: DETAILS & POLICIES */}
            <TabsContent value="details" className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Detailed Description <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the experience, architectural features, room amenities, dining highlights, surrounding views..."
                  className="rounded-xl resize-none"
                />
                {errors.description && <p className="text-xs text-rose-500">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Included Amenities & Highlights</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_AMENITIES.map((amenity) => {
                    const selected = form.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-all border",
                          selected
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {selected ? "✓ " : "+ "}
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cancellation_policy" className="text-xs font-semibold">
                  Cancellation Policy
                </Label>
                <select
                  id="cancellation_policy"
                  value={form.cancellation_policy}
                  onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {CANCELLATION_POLICIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/30 p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Publish Live Immediately</Label>
                  <p className="text-xs text-muted-foreground">
                    When active, tourists can discover and book this listing immediately.
                  </p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {activeTab !== "details" ? (
                <Button
                  type="button"
                  variant="ocean"
                  onClick={() => {
                    if (activeTab === "basic") setActiveTab("location");
                    else if (activeTab === "location") setActiveTab("media");
                    else if (activeTab === "media") setActiveTab("details");
                  }}
                  className="rounded-xl"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ocean"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                  className="rounded-xl shadow-md font-semibold"
                >
                  {saveMutation.isPending ? "Saving..." : editingService ? "Update Listing" : "Publish Listing"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 6. Service Quick Preview Modal ─────────────────────────────────── */}
      {previewService && (
        <Dialog open={Boolean(previewService)} onOpenChange={(open) => !open && setPreviewService(null)}>
          <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-3xl">
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              {previewService.image_url && (
                <img
                  src={previewService.image_url}
                  alt={previewService.title}
                  className="size-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <Badge className="capitalize bg-primary font-semibold mb-2">
                  {previewService.category}
                </Badge>
                <h3 className="text-xl font-bold">{previewService.title}</h3>
                <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                  <MapPin className="size-3.5" />
                  {previewService.destination}, {previewService.city || previewService.country}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <span className="text-xs text-muted-foreground">Price per night / unit</span>
                  <div className="text-2xl font-bold text-foreground">
                    {formatPrice(previewService.price, previewService.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Max Capacity</span>
                  <div className="text-base font-semibold text-foreground flex items-center gap-1">
                    <Users className="size-4 text-primary" /> {previewService.max_guests || 2} Guests
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h4>
                <p className="mt-1 text-sm text-foreground/90 leading-relaxed">
                  {previewService.description || "No description provided."}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3">
                <a href={`/services/${previewService.id}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="rounded-xl gap-1.5 text-xs">
                    <ExternalLink className="size-3.5" /> Open Public Discovery Page
                  </Button>
                </a>
                <Button variant="ocean" onClick={() => setPreviewService(null)} className="rounded-xl text-xs">
                  Close Preview
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── 7. Safe Delete Confirmation Dialog ─────────────────────────────── */}
      {toDeleteService && (
        <AlertDialog open={Boolean(toDeleteService)} onOpenChange={(open) => !open && setToDeleteService(null)}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-rose-600 dark:text-rose-400">
                Delete Service Listing?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete <strong>{toDeleteService.title}</strong>?
                <br /><br />
                <span className="text-xs text-muted-foreground">
                  Note: Services with active confirmed or pending bookings cannot be deleted to protect tourist itineraries. If you want to temporarily stop taking new bookings, you can <strong>Unpublish / Deactivate</strong> the listing instead.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(toDeleteService.id)}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </PageShell>
  );
}
