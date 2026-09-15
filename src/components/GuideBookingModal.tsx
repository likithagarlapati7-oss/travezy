import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  saveLocalGuideBooking,
  type HumanTourGuide,
  type GuidePackage,
  type GuideBooking,
} from "@/lib/guides";
import { createGuideBooking } from "@/lib/guides.functions";

export interface GuideBookingModalProps {
  guide: HumanTourGuide | null;
  selectedPackage?: GuidePackage | undefined;
  open?: boolean | undefined;
  isOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  onClose?: (() => void) | undefined;
  onSuccess?: ((booking: GuideBooking) => void) | undefined;
  onBookingSuccess?: (() => void) | undefined;
}

export function GuideBookingModal({
  guide,
  selectedPackage,
  open,
  isOpen,
  onOpenChange,
  onClose,
  onSuccess,
  onBookingSuccess,
}: GuideBookingModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const { user } = useAuth();
  const qc = useQueryClient();

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) onOpenChange(newOpen);
    if (!newOpen && onClose) onClose();
  };

  // Form State
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0]!;
  const [bookingDate, setBookingDate] = useState(tomorrowStr);
  const [startTime, setStartTime] = useState("09:00");
  const [durationType, setDurationType] = useState<"hourly" | "half_day" | "full_day">(
    selectedPackage ? selectedPackage.duration_type : "half_day",
  );
  const [customHours, setCustomHours] = useState(3);
  const [travellers, setTravellers] = useState(2);
  const [meetingLocation, setMeetingLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<GuideBooking | null>(null);

  if (!guide) return null;

  // Price Calculation
  let basePrice = 0;
  if (selectedPackage) {
    basePrice = selectedPackage.price;
  } else if (durationType === "half_day") {
    basePrice = guide.half_day_rate;
  } else if (durationType === "full_day") {
    basePrice = guide.full_day_rate;
  } else {
    basePrice = guide.hourly_rate * customHours;
  }

  // Small supplement for groups > 4
  const groupSupplement = travellers > 4 ? (travellers - 4) * 200 : 0;
  const totalPrice = basePrice + groupSupplement;

  const durationHours =
    durationType === "half_day" ? 4 : durationType === "full_day" ? 8 : customHours;

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const touristId = user?.id || "tourist-guest-session";
      const touristName = user?.email ? user.email.split("@")[0] : "Travezy Guest";

      const result = await createGuideBooking({
        data: {
          touristId,
          touristName,
          touristEmail: user?.email || undefined,
          guideId: guide.id,
          bookingDate,
          startTime,
          durationHours,
          durationType,
          travellers,
          meetingLocation: meetingLocation.trim() || `${guide.city} Central / Hotel Pickup`,
          totalPrice,
          notes: notes.trim() || undefined,
          packageId: selectedPackage?.id || undefined,
          packageTitle: selectedPackage?.title || undefined,
        },
      });

      const fullBooking: GuideBooking = {
        ...result,
        guide,
        tourist_id: touristId,
        tourist_name: touristName,
        booking_status: "PENDING",
        payment_status: "PENDING",
      };

      saveLocalGuideBooking(fullBooking);
      return fullBooking;
    },
    onSuccess: (booking) => {
      toast.success(`Booking request sent to ${guide.name}! 🧭`);
      setConfirmedBooking(booking);
      qc.invalidateQueries({ queryKey: ["guide-bookings"] });
      if (onSuccess) onSuccess(booking);
      if (onBookingSuccess) onBookingSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create guide booking");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingLocation.trim()) {
      toast.error("Please enter a meeting point or hotel name");
      return;
    }
    bookingMutation.mutate();
  };

  const handleClose = () => {
    setConfirmedBooking(null);
    handleOpenChange(false);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-3xl p-6">
        {confirmedBooking ? (
          // Success State
          <div className="flex flex-col items-center py-6 text-center space-y-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-10" />
            </div>

            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Tour Requested Successfully!
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Your request has been forwarded directly to{" "}
                <span className="font-semibold text-foreground">{guide.name}</span>.
              </DialogDescription>
            </div>

            {/* Booking Summary Box */}
            <div className="w-full rounded-2xl border border-border bg-muted/30 p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guide:</span>
                <span className="font-semibold text-foreground">{guide.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time:</span>
                <span className="font-semibold text-foreground">
                  {confirmedBooking.booking_date} at {confirmedBooking.start_time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-semibold text-foreground">
                  {confirmedBooking.duration_hours} Hours ({confirmedBooking.duration_type.replace("_", " ")})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meeting Point:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">
                  {confirmedBooking.meeting_location}
                </span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-sm">
                <span>Total Amount:</span>
                <span className="text-primary">₹{confirmedBooking.total_price.toLocaleString()}</span>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-3 pt-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/tourist/bookings" onClick={handleClose}>
                  My Trips
                </Link>
              </Button>
              <Button onClick={handleClose} className="rounded-xl">
                Done
              </Button>
            </div>
          </div>
        ) : (
          // Booking Form
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <img
                  src={guide.profile_image}
                  alt={guide.name}
                  className="size-12 rounded-xl object-cover ring-1 ring-border"
                />
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    Book {guide.name}
                    {guide.is_travezy_verified && (
                      <CheckCircle2 className="size-4 text-sky-500" />
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Personal Guided Tour in {guide.city}, {guide.state}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Selected Package Banner if applicable */}
            {selectedPackage && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5">
                <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">{selectedPackage.title}</p>
                  <p className="text-muted-foreground mt-0.5">{selectedPackage.description}</p>
                </div>
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date-input" className="text-xs font-semibold">
                  Tour Date
                </Label>
                <Input
                  id="date-input"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="time-input" className="text-xs font-semibold">
                  Start Time
                </Label>
                <Input
                  id="time-input"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            {/* Duration Type Selector */}
            {!selectedPackage && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duration Option</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDurationType("half_day")}
                    className={`flex flex-col items-center rounded-2xl border p-2.5 text-center transition-all ${
                      durationType === "half_day"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <span className="text-xs font-semibold">Half-Day (4h)</span>
                    <span className="text-[11px] font-bold mt-0.5">₹{guide.half_day_rate}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDurationType("full_day")}
                    className={`flex flex-col items-center rounded-2xl border p-2.5 text-center transition-all ${
                      durationType === "full_day"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <span className="text-xs font-semibold">Full-Day (8h)</span>
                    <span className="text-[11px] font-bold mt-0.5">₹{guide.full_day_rate}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDurationType("hourly")}
                    className={`flex flex-col items-center rounded-2xl border p-2.5 text-center transition-all ${
                      durationType === "hourly"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <span className="text-xs font-semibold">Custom Hours</span>
                    <span className="text-[11px] font-bold mt-0.5">₹{guide.hourly_rate}/hr</span>
                  </button>
                </div>

                {durationType === "hourly" && (
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-muted/40 p-2 text-xs">
                    <span>Number of hours:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="size-7 rounded-lg p-0"
                        onClick={() => setCustomHours(Math.max(1, customHours - 1))}
                      >
                        -
                      </Button>
                      <span className="font-bold">{customHours} hrs</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="size-7 rounded-lg p-0"
                        onClick={() => setCustomHours(Math.min(12, customHours + 1))}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Number of Travellers */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Number of Travellers</span>
                <span className="text-[11px] text-muted-foreground">{travellers} People</span>
              </Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 6, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTravellers(num)}
                    className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold transition-all ${
                      travellers === num
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting Location */}
            <div className="space-y-1.5">
              <Label htmlFor="meeting-location" className="text-xs font-semibold">
                Meeting Point / Hotel Pickup
              </Label>
              <Input
                id="meeting-location"
                placeholder="e.g. Grand Hyatt Lobby or Fort Kochi Ferry Station"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                className="rounded-xl text-xs"
                required
              />
            </div>

            {/* Special Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes-input" className="text-xs font-semibold">
                Special Requests & Dietary / Accessibility Notes (Optional)
              </Label>
              <Textarea
                id="notes-input"
                placeholder="Any special sights you want to cover, languages preferred, or requirements..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl text-xs resize-none"
                rows={2}
              />
            </div>

            {/* Price Breakdown */}
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Guide Fee ({durationHours} Hours):</span>
                <span>₹{basePrice.toLocaleString()}</span>
              </div>

              {groupSupplement > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Group size supplement ({travellers} travellers):</span>
                  <span>+₹{groupSupplement.toLocaleString()}</span>
                </div>
              )}

              <div className="border-t border-border/60 pt-2 flex items-baseline justify-between font-bold text-sm text-foreground">
                <span>Total Amount:</span>
                <span className="text-base text-primary">₹{totalPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={bookingMutation.isPending}
              className="w-full rounded-2xl py-5 text-sm font-bold shadow-md"
            >
              {bookingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending Request…
                </>
              ) : (
                `Confirm & Request Tour (₹${totalPrice.toLocaleString()})`
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
