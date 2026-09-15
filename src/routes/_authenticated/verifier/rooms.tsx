import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BedDouble,
  Building2,
  Check,
  DoorClosed,
  Edit,
  IndianRupee,
  Loader2,
  Plus,
  Star,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createHotelRoom,
  getHotelRooms,
  getVerifierHotels,
  updateHotelRoom,
} from "@/lib/hotels.functions";
import type { RoomInput } from "@/lib/hotels.schema";
import type { HotelRoomRecord } from "@/lib/hotels.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verifier/rooms")({
  validateSearch: (search: Record<string, unknown>): { hotel_id?: string | undefined } => ({
    hotel_id: typeof search['hotel_id'] === "string" ? (search['hotel_id'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Room Inventory & Categories — Travezy Verifier" },
      {
        name: "description",
        content: "Manage hotel rooms, room categories, pricing per night, capacity, and amenities.",
      },
    ],
  }),
  component: VerifierRoomsPage,
});

const DEFAULT_ROOM_AMENITIES = [
  "King Sized Bed",
  "Twin Beds",
  "Ensuite Marble Bathroom",
  "Private Balcony / Terrace",
  "Courtyard / Garden View",
  "Lakefront / Mountain View",
  "Free High-Speed WiFi",
  "Air Conditioning & Heating",
  "Mini Bar & Refrigerator",
  "Espresso / Tea Maker",
  "Electronic Safe Locker",
  "24/7 Butler / Room Service",
  "Bathtub / Jacuzzi",
  "Smart LED TV",
];

const ROOM_TYPE_PRESETS = [
  "Standard Room",
  "Deluxe Heritage Courtyard Room",
  "Executive Lake-View Suite",
  "Maharaja Royal Suite",
  "Family Garden Chalet",
  "Waterfront Pool Villa",
  "Presidential Heritage Suite",
];

function VerifierRoomsPage() {
  const qc = useQueryClient();
  const search = Route.useSearch();

  const getHotelsFn = useServerFn(getVerifierHotels);
  const getRoomsFn = useServerFn(getHotelRooms);
  const createRoomFn = useServerFn(createHotelRoom);
  const updateRoomFn = useServerFn(updateHotelRoom);

  const [selectedHotelId, setSelectedHotelId] = useState<string>(search.hotel_id || "ALL");

  const [roomModal, setRoomModal] = useState<{
    open: boolean;
    room: HotelRoomRecord | null;
  }>({ open: false, room: null });

  // Form State
  const [formData, setFormData] = useState<RoomInput>({
    hotel_id: "",
    room_type: "Deluxe Room",
    description: "",
    price_per_night: 4500,
    currency: "INR",
    capacity: 2,
    total_rooms: 5,
    amenities: ["King Sized Bed", "Ensuite Marble Bathroom", "Free High-Speed WiFi", "Air Conditioning & Heating"],
    images: ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"],
    status: "active",
  });

  const { data: hotels = [] } = useQuery({
    queryKey: ["verifier", "hotels"],
    queryFn: () => getHotelsFn(),
  });

  // Sync selected hotel with available hotels if unset
  useEffect(() => {
    if (search.hotel_id) {
      setSelectedHotelId(search.hotel_id);
    }
  }, [search.hotel_id]);

  const { data: allRooms = [], isLoading } = useQuery({
    queryKey: ["verifier", "rooms", selectedHotelId],
    queryFn: () =>
      getRoomsFn({
        data: { hotel_id: selectedHotelId !== "ALL" ? selectedHotelId : undefined },
      }),
  });

  const filteredRooms =
    selectedHotelId === "ALL"
      ? allRooms
      : allRooms.filter((r) => r.hotel_id === selectedHotelId);

  const saveMutation = useMutation({
    mutationFn: async (payload: RoomInput) => {
      if (roomModal.room?.id) {
        return await updateRoomFn({ data: { ...payload, id: roomModal.room.id } });
      }
      return await createRoomFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(roomModal.room ? "Room updated successfully!" : "New room category added!");
      qc.invalidateQueries({ queryKey: ["verifier"] });
      setRoomModal({ open: false, room: null });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save room.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ room, newStatus }: { room: HotelRoomRecord; newStatus: any }) => {
      return await updateRoomFn({
        data: {
          ...room,
          status: newStatus,
        },
      });
    },
    onSuccess: () => {
      toast.success("Room status updated.");
      qc.invalidateQueries({ queryKey: ["verifier", "rooms"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to toggle status.");
    },
  });

  function handleOpenAdd() {
    const targetHotelId =
      selectedHotelId !== "ALL" ? selectedHotelId : hotels[0]?.id || "";
    setFormData({
      hotel_id: targetHotelId,
      room_type: "Deluxe Room",
      description: "Spacious deluxe room with premium furnishings, ensuite bath, and courtyard view.",
      price_per_night: 4500,
      currency: "INR",
      capacity: 2,
      total_rooms: 5,
      amenities: ["King Sized Bed", "Ensuite Marble Bathroom", "Free High-Speed WiFi", "Air Conditioning & Heating"],
      images: ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"],
      status: "active",
    });
    setRoomModal({ open: true, room: null });
  }

  function handleOpenEdit(r: HotelRoomRecord) {
    setFormData({
      id: r.id,
      hotel_id: r.hotel_id,
      room_type: r.room_type,
      description: r.description || "",
      price_per_night: r.price_per_night,
      currency: r.currency || "INR",
      capacity: r.capacity,
      total_rooms: r.total_rooms,
      amenities: r.amenities || [],
      images: r.images || [],
      status: r.status || "active",
    });
    setRoomModal({ open: true, room: r });
  }

  function toggleAmenity(am: string) {
    setFormData((prev) => {
      const exists = prev.amenities?.includes(am);
      const next = exists
        ? (prev.amenities || []).filter((a) => a !== am)
        : [...(prev.amenities || []), am];
      return { ...prev, amenities: next };
    });
  }

  return (
    <PageShell
      eyebrow="Inventory & Pricing"
      title="Room Categories & Capacity"
      subtitle="Configure room types, overnight rates, maximum occupancy limits, and total room inventory per property."
    >
      {/* Property Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-card p-4 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <Building2 className="size-5 text-primary" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Filter by Hotel</p>
            <div className="flex items-center gap-2 mt-1">
              <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                <SelectTrigger className="w-[280px] h-9 text-xs rounded-xl">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl text-xs">
                  <SelectItem value="ALL">All Properties ({hotels.length})</SelectItem>
                  {hotels.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} ({h.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button onClick={handleOpenAdd} variant="hero" size="sm" className="rounded-full gap-2 text-xs">
          <Plus className="size-4" /> Add Room Category
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card">
          <BedDouble className="mx-auto size-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-lg text-foreground">No room categories found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Add room types such as Deluxe, Suite, or Villa to open bookings and set nightly rates.
          </p>
          <Button onClick={handleOpenAdd} variant="hero" size="sm" className="mt-5 rounded-full gap-2">
            <Plus className="size-4" /> Add First Room
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const hotel = hotels.find((h) => h.id === room.hotel_id);
            return (
              <div
                key={room.id}
                className="group flex flex-col rounded-3xl border border-border bg-card overflow-hidden shadow-card hover:shadow-float transition-all"
              >
                {/* Room Photo */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                  <img
                    src={room.images?.[0] || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"}
                    alt={room.room_type}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-semibold flex items-center gap-1.5">
                    <Users className="size-3 text-gold" />
                    <span>Max {room.capacity} Guests</span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase backdrop-blur-md",
                        room.status === "active"
                          ? "bg-emerald-500/90 text-white"
                          : "bg-muted/90 text-muted-foreground",
                      )}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-[11px] text-white/80 font-medium truncate">
                      {hotel?.name || "Property"}
                    </p>
                    <h3 className="font-display font-semibold text-base truncate">
                      {room.room_type}
                    </h3>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                      {room.description || "Spacious room with modern amenities and scenic views."}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-3 rounded-2xl mb-4">
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">Rate / Night</span>
                        <span className="font-bold text-base text-foreground">
                          ₹{room.price_per_night.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">Inventory</span>
                        <span className="font-bold text-base text-foreground">
                          {room.total_rooms} Rooms Total
                        </span>
                      </div>
                    </div>

                    {/* Amenities chips */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {room.amenities?.slice(0, 3).map((a, i) => (
                        <span
                          key={i}
                          className="bg-secondary text-secondary-foreground text-[10px] font-medium px-2 py-0.5 rounded-md"
                        >
                          {a}
                        </span>
                      ))}
                      {(room.amenities?.length || 0) > 3 && (
                        <span className="text-[10px] text-muted-foreground font-semibold px-1">
                          +{(room.amenities?.length || 0) - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full h-8 px-2 text-xs"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          room,
                          newStatus: room.status === "active" ? "inactive" : "active",
                        })
                      }
                    >
                      {room.status === "active" ? (
                        <ToggleRight className="size-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="size-5 text-muted-foreground" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full h-8 px-3 text-xs gap-1.5"
                      onClick={() => handleOpenEdit(room)}
                    >
                      <Edit className="size-3" /> Edit Category
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Room Modal ── */}
      <Dialog
        open={roomModal.open}
        onOpenChange={(open) => setRoomModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-semibold flex items-center gap-2">
              <BedDouble className="size-5 text-primary" />
              {roomModal.room ? "Edit Room Category" : "Add New Room Category"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure room type specifications, nightly tariff in ₹ INR, maximum guest occupancy, and total room units.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!formData.hotel_id) {
                toast.error("Please select a hotel property.");
                return;
              }
              saveMutation.mutate(formData);
            }}
            className="space-y-4 py-2"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="r-hotel" className="text-xs font-semibold">
                  Select Hotel Property *
                </Label>
                <Select
                  value={formData.hotel_id}
                  onValueChange={(val) => setFormData({ ...formData, hotel_id: val })}
                >
                  <SelectTrigger id="r-hotel" className="h-10 text-xs rounded-xl">
                    <SelectValue placeholder="Choose hotel" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl text-xs">
                    {hotels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name} — {h.city}, {h.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="r-type" className="text-xs font-semibold">
                  Room Category / Type Name *
                </Label>
                <Input
                  id="r-type"
                  value={formData.room_type}
                  onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                  placeholder="e.g. Deluxe Heritage Suite"
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="r-desc" className="text-xs font-semibold">
                  Room Description
                </Label>
                <Textarea
                  id="r-desc"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Room layout, bed configurations, view description, marble bathroom..."
                  rows={2}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-price" className="text-xs font-semibold">
                  Price per Night (₹ INR) *
                </Label>
                <Input
                  id="r-price"
                  type="number"
                  min={100}
                  value={formData.price_per_night}
                  onChange={(e) =>
                    setFormData({ ...formData, price_per_night: Number(e.target.value) })
                  }
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-cap" className="text-xs font-semibold">
                  Max Guest Capacity *
                </Label>
                <Input
                  id="r-cap"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: Number(e.target.value) })
                  }
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-total" className="text-xs font-semibold">
                  Total Room Inventory Count *
                </Label>
                <Input
                  id="r-total"
                  type="number"
                  min={1}
                  max={500}
                  value={formData.total_rooms}
                  onChange={(e) =>
                    setFormData({ ...formData, total_rooms: Number(e.target.value) })
                  }
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-image" className="text-xs font-semibold">
                  Primary Room Image URL
                </Label>
                <Input
                  id="r-image"
                  value={formData.images?.[0] || ""}
                  onChange={(e) => setFormData({ ...formData, images: [e.target.value] })}
                  placeholder="https://images.unsplash.com/..."
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Amenities Selector */}
            <div className="pt-2">
              <Label className="text-xs font-semibold block mb-2">Room Amenities</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_ROOM_AMENITIES.map((am) => {
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
                onClick={() => setRoomModal({ open: false, room: null })}
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
                {saveMutation.isPending ? "Saving..." : "Save Room Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
