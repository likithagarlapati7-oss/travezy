import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  Check,
  Clock,
  DoorClosed,
  Edit,
  Globe,
  Image as ImageIcon,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createHotel, getVerifierHotels, updateHotel } from "@/lib/hotels.functions";
import type { HotelInput } from "@/lib/hotels.schema";
import type { HotelRecord } from "@/lib/hotels.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verifier/hotels")({
  head: () => ({
    meta: [
      { title: "Manage Properties & Hotels — Travezy Verifier" },
      {
        name: "description",
        content: "Add and manage hotel listings, property details, amenities, rules, and coordinates.",
      },
    ],
  }),
  component: VerifierHotelsPage,
});

const DEFAULT_AMENITIES = [
  "Free High-Speed WiFi",
  "Swimming Pool",
  "Ayurvedic Spa",
  "Multi-Cuisine Restaurant",
  "Free Valet Parking",
  "Air Conditioning & Heating",
  "24/7 Room Service",
  "Airport Shuttle Transfer",
  "Fitness Center / Gym",
  "Power Backup",
  "Pet Friendly",
  "Mountain View / Lakefront",
];

function VerifierHotelsPage() {
  const qc = useQueryClient();
  const getHotelsFn = useServerFn(getVerifierHotels);
  const createHotelFn = useServerFn(createHotel);
  const updateHotelFn = useServerFn(updateHotel);

  const [hotelModal, setHotelModal] = useState<{
    open: boolean;
    hotel: HotelRecord | null;
  }>({ open: false, hotel: null });

  // Form State
  const [formData, setFormData] = useState<HotelInput>({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    latitude: null,
    longitude: null,
    phone: "",
    email: "",
    amenities: ["Free High-Speed WiFi", "Air Conditioning & Heating", "24/7 Room Service"],
    check_in_time: "14:00",
    check_out_time: "11:00",
    cancellation_policy: "Free cancellation up to 24 hours before check-in.",
    hotel_rules: "Valid government ID required at check-in. Non-smoking property.",
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    images: [],
    star_rating: 4.8,
    status: "active",
  });

  const { data: hotels = [], isLoading } = useQuery({
    queryKey: ["verifier", "hotels"],
    queryFn: () => getHotelsFn(),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: HotelInput) => {
      if (hotelModal.hotel?.id) {
        return await updateHotelFn({ data: { ...payload, id: hotelModal.hotel.id } });
      }
      return await createHotelFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(
        hotelModal.hotel?.id ? "Hotel updated successfully!" : "New property created successfully!",
      );
      qc.invalidateQueries({ queryKey: ["verifier"] });
      setHotelModal({ open: false, hotel: null });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save hotel.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ hotel, newStatus }: { hotel: HotelRecord; newStatus: any }) => {
      return await updateHotelFn({
        data: {
          ...hotel,
          status: newStatus,
        },
      });
    },
    onSuccess: () => {
      toast.success("Property status updated.");
      qc.invalidateQueries({ queryKey: ["verifier", "hotels"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to toggle status.");
    },
  });

  function handleOpenAdd() {
    setFormData({
      name: "",
      description: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      latitude: null,
      longitude: null,
      phone: "+91 ",
      email: "",
      amenities: ["Free High-Speed WiFi", "Air Conditioning & Heating", "24/7 Room Service"],
      check_in_time: "14:00",
      check_out_time: "11:00",
      cancellation_policy: "Free cancellation up to 24 hours prior to check-in.",
      hotel_rules: "Valid government ID required upon check-in. Non-smoking rooms.",
      image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      images: [],
      star_rating: 4.8,
      status: "active",
    });
    setHotelModal({ open: true, hotel: null });
  }

  function handleOpenEdit(h: HotelRecord) {
    setFormData({
      id: h.id,
      name: h.name,
      description: h.description,
      address: h.address,
      city: h.city,
      state: h.state,
      country: h.country || "India",
      latitude: h.latitude,
      longitude: h.longitude,
      phone: h.phone,
      email: h.email,
      amenities: h.amenities || [],
      check_in_time: h.check_in_time || "14:00",
      check_out_time: h.check_out_time || "11:00",
      cancellation_policy: h.cancellation_policy || "Free cancellation up to 24 hours before check-in.",
      hotel_rules: h.hotel_rules || "Valid government ID required at check-in.",
      image_url: h.image_url,
      images: h.images || [],
      star_rating: h.star_rating || 4.5,
      status: h.status || "active",
    });
    setHotelModal({ open: true, hotel: h });
  }

  function toggleAmenity(item: string) {
    setFormData((prev) => {
      const exists = prev.amenities?.includes(item);
      const next = exists
        ? (prev.amenities || []).filter((a) => a !== item)
        : [...(prev.amenities || []), item];
      return { ...prev, amenities: next };
    });
  }

  return (
    <PageShell
      eyebrow="Properties & Stays"
      title="Hotel Property Portfolio"
      subtitle="Register, configure, and maintain your accommodation listings, policies, coordinates, and contact details."
    >
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Registered Properties ({hotels.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            All active accommodation properties verified under your hotelier account.
          </p>
        </div>

        <Button onClick={handleOpenAdd} variant="hero" size="sm" className="rounded-full gap-2">
          <Plus className="size-4" /> Add New Hotel
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : hotels.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card">
          <Building2 className="mx-auto size-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-lg text-foreground">No properties added yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Get started by adding your first hotel or resort listing to begin managing room inventory and receiving guest reservations.
          </p>
          <Button onClick={handleOpenAdd} variant="hero" size="sm" className="mt-5 rounded-full gap-2">
            <Plus className="size-4" /> Add Hotel Property
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <div
              key={hotel.id}
              className="group flex flex-col rounded-3xl border border-border bg-card overflow-hidden shadow-card hover:shadow-float transition-all"
            >
              {/* Image Preview & Status Badge */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                <img
                  src={hotel.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"}
                  alt={hotel.name}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-semibold">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <span>{hotel.star_rating} Star</span>
                </div>

                <div className="absolute top-3 right-3">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm",
                      hotel.status === "active"
                        ? "bg-emerald-500/90 text-white"
                        : "bg-muted/90 text-muted-foreground",
                    )}
                  >
                    {hotel.status}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-display font-semibold text-lg truncate">{hotel.name}</h3>
                  <p className="flex items-center gap-1 text-xs text-white/80">
                    <MapPin className="size-3 text-gold" /> {hotel.city}, {hotel.state}
                  </p>
                </div>
              </div>

              {/* Property Details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                    {hotel.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/40 p-3 rounded-2xl mb-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                      <Clock className="size-3 text-primary shrink-0" />
                      <span>In: <strong>{hotel.check_in_time}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                      <Clock className="size-3 text-primary shrink-0" />
                      <span>Out: <strong>{hotel.check_out_time}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate col-span-2">
                      <Phone className="size-3 text-primary shrink-0" />
                      <span>{hotel.phone}</span>
                    </div>
                  </div>

                  {/* Amenities preview */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {hotel.amenities?.slice(0, 4).map((a, i) => (
                      <span
                        key={i}
                        className="bg-secondary text-secondary-foreground text-[10px] font-medium px-2 py-0.5 rounded-md"
                      >
                        {a}
                      </span>
                    ))}
                    {(hotel.amenities?.length || 0) > 4 && (
                      <span className="text-[10px] text-muted-foreground font-semibold px-1">
                        +{(hotel.amenities?.length || 0) - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                  <Button asChild variant="outline" size="sm" className="rounded-full text-xs gap-1">
                    <Link to="/verifier/rooms" search={{ hotel_id: hotel.id }}>
                      <DoorClosed className="size-3.5" /> Manage Rooms
                    </Link>
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full h-8 px-2 text-xs"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          hotel,
                          newStatus: hotel.status === "active" ? "inactive" : "active",
                        })
                      }
                    >
                      {hotel.status === "active" ? (
                        <ToggleRight className="size-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="size-5 text-muted-foreground" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full h-8 px-2.5 text-xs gap-1"
                      onClick={() => handleOpenEdit(hotel)}
                    >
                      <Edit className="size-3" /> Edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Hotel Modal ── */}
      <Dialog
        open={hotelModal.open}
        onOpenChange={(open) => setHotelModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-semibold flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              {hotelModal.hotel ? "Edit Property Information" : "Register New Hotel Property"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide complete accommodation details, check-in policies, contact numbers, and amenities.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formData);
            }}
            className="space-y-4 py-2"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="h-name" className="text-xs font-semibold">
                  Property / Hotel Name *
                </Label>
                <Input
                  id="h-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. The Taj Lake Palace Heritage"
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="h-desc" className="text-xs font-semibold">
                  Detailed Description *
                </Label>
                <Textarea
                  id="h-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your property, ambiance, rooms, heritage value, dining, and surroundings..."
                  required
                  rows={3}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="h-address" className="text-xs font-semibold">
                  Full Street Address *
                </Label>
                <Input
                  id="h-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Pichola Lake Shore, Gangaur Ghat Marg"
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="h-city" className="text-xs font-semibold">
                  City *
                </Label>
                <Input
                  id="h-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Udaipur"
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="h-state" className="text-xs font-semibold">
                  State *
                </Label>
                <Input
                  id="h-state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Rajasthan"
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="h-phone" className="text-xs font-semibold">
                  Front-Desk Phone Number *
                </Label>
                <Input
                  id="h-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 294 242 8888"
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="h-email" className="text-xs font-semibold">
                  Reservations Email *
                </Label>
                <Input
                  id="h-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="reservations@hotel.com"
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="h-checkin" className="text-xs font-semibold">
                  Standard Check-In Time
                </Label>
                <Input
                  id="h-checkin"
                  value={formData.check_in_time}
                  onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                  placeholder="14:00"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="h-checkout" className="text-xs font-semibold">
                  Standard Check-Out Time
                </Label>
                <Input
                  id="h-checkout"
                  value={formData.check_out_time}
                  onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                  placeholder="11:00"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="h-image" className="text-xs font-semibold">
                  Primary Cover Photo URL *
                </Label>
                <Input
                  id="h-image"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="h-policy" className="text-xs font-semibold">
                  Cancellation Policy
                </Label>
                <Input
                  id="h-policy"
                  value={formData.cancellation_policy}
                  onChange={(e) => setFormData({ ...formData, cancellation_policy: e.target.value })}
                  placeholder="e.g. Free cancellation up to 48 hours prior to check-in."
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="h-rules" className="text-xs font-semibold">
                  Hotel Rules & Guest Requirements
                </Label>
                <Input
                  id="h-rules"
                  value={formData.hotel_rules}
                  onChange={(e) => setFormData({ ...formData, hotel_rules: e.target.value })}
                  placeholder="e.g. Valid government ID mandatory at check-in. Quiet hours after 10 PM."
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Amenities Selector */}
            <div className="pt-2">
              <Label className="text-xs font-semibold block mb-2">
                Property Amenities & Features
              </Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_AMENITIES.map((am) => {
                  const selected = formData.amenities?.includes(am);
                  return (
                    <button
                      key={am}
                      type="button"
                      onClick={() => toggleAmenity(am)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5",
                        selected
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {selected && <Check className="size-3 text-primary" />}
                      <span>{am}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/50 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setHotelModal({ open: false, hotel: null })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="hero"
                size="sm"
                className="rounded-xl text-xs"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving Property..." : "Save Hotel Property"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
