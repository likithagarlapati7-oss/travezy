import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Globe2,
  Loader2,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/PageShell";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  getLocalGuideBookings,
  updateLocalGuideBookingStatus,
  getLocalGuideReviews,
  HUMAN_TOUR_GUIDES,
  type GuideBooking,
} from "@/lib/guides";
import { updateGuideBookingStatus } from "@/lib/guides.functions";

export const Route = createFileRoute("/_authenticated/guide/dashboard")({
  head: () => ({
    meta: [
      { title: "Tour Guide Dashboard — Travezy" },
      {
        name: "description",
        content: "Manage your incoming tour requests, schedule availability, and guest reviews.",
      },
    ],
  }),
  component: GuideDashboardPage,
});

function GuideDashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Pick or assign a guide identity for demo (e.g. Ravi Kumar or matched user guide)
  const myGuide =
    HUMAN_TOUR_GUIDES.find((g) => g.user_id === user?.id) || HUMAN_TOUR_GUIDES[0]!;

  const [activeTab, setActiveTab] = useState<"requests" | "upcoming" | "availability" | "reviews">(
    "requests",
  );
  const [chatPartner, setChatPartner] = useState<{ id: string; name: string } | null>(null);

  // Sample default requests + any local bookings created in session
  const { data: bookings = [], refetch } = useQuery({
    queryKey: ["guide-dashboard-bookings", user?.id],
    queryFn: async (): Promise<GuideBooking[]> => {
      const localBookings = getLocalGuideBookings();

      const seedBookings: GuideBooking[] = [
        {
          id: "gb-seed-01",
          tourist_id: "user-tourist-sarah",
          tourist_name: "Sarah Jenkins",
          tourist_email: "sarah.j@gmail.com",
          tourist_phone: "+44 7700 900123",
          guide_id: myGuide.id,
          guide: myGuide,
          booking_date: new Date(Date.now() + 86400000).toISOString().split("T")[0]!,
          start_time: "09:00",
          duration_hours: 4,
          duration_type: "half_day",
          travellers: 2,
          meeting_location: "Brunton Boatyard Hotel Lobby, Fort Kochi",
          total_price: myGuide.half_day_rate,
          currency: "INR",
          booking_status: "PENDING",
          payment_status: "PENDING",
          notes: "Interested in Jewish Synagogue history and spice warehouse photography.",
          package_title: "Fort Kochi & Mattancherry Heritage Immersion",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "gb-seed-02",
          tourist_id: "user-tourist-ananya",
          tourist_name: "Ananya Deshmukh",
          tourist_email: "ananya.d@outlook.com",
          tourist_phone: "+91 98200 11223",
          guide_id: myGuide.id,
          guide: myGuide,
          booking_date: new Date(Date.now() + 172800000).toISOString().split("T")[0]!,
          start_time: "14:30",
          duration_hours: 4,
          duration_type: "half_day",
          travellers: 3,
          meeting_location: "Chinese Fishing Nets Promenade",
          total_price: myGuide.half_day_rate,
          currency: "INR",
          booking_status: "ACCEPTED",
          payment_status: "PAID",
          notes: "Family trip with elderly parents, please keep walking pace comfortable.",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];

      const localForThisGuide = localBookings.filter((b) => b.guide_id === myGuide.id);
      const combined = [...localForThisGuide, ...seedBookings];
      const seen = new Set<string>();
      return combined.filter((b) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
    },
  });

  const pendingRequests = bookings.filter((b) => b.booking_status === "PENDING");
  const upcomingTours = bookings.filter((b) => b.booking_status === "ACCEPTED");
  const completedTours = bookings.filter((b) => b.booking_status === "COMPLETED");

  const totalEarnings = [...upcomingTours, ...completedTours].reduce(
    (sum, b) => sum + (b.total_price || 0),
    0,
  );

  // Status mutation (Accept / Reject / Complete)
  const statusMutation = useMutation({
    mutationFn: async ({
      bookingId,
      status,
      touristUserId,
      bookingDate,
    }: {
      bookingId: string;
      status: "ACCEPTED" | "REJECTED" | "COMPLETED";
      touristUserId: string;
      bookingDate: string;
    }) => {
      updateLocalGuideBookingStatus(bookingId, status);

      return await updateGuideBookingStatus({
        data: {
          bookingId,
          guideId: myGuide.id,
          status,
          touristUserId,
          bookingDate,
        },
      });
    },
    onSuccess: (_, vars) => {
      if (vars.status === "ACCEPTED") toast.success("Tour request accepted! Tourist notified. 🎉");
      if (vars.status === "REJECTED") toast.info("Tour request declined.");
      if (vars.status === "COMPLETED") toast.success("Tour marked as completed! ⭐");
      refetch();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update booking");
    },
  });

  return (
    <PageShell
      eyebrow="Guide Command Centre"
      title={`Welcome, ${myGuide.name}`}
      subtitle={`Manage your personal tour requests in ${myGuide.city}, accept bookings, and set your schedule.`}
    >
      {/* Messages Console Quick Action Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Traveller Inquiries & Direct Chat</h3>
            <p className="text-xs text-muted-foreground">
              Reply to tourists inquiring about tours, custom schedules, and meeting points in real-time.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="rounded-xl font-bold shadow-xs">
          <Link to="/guide/messages">
            <MessageSquare className="mr-1.5 size-3.5" />
            Open Messages Inbox
          </Link>
        </Button>
      </div>

      {/* ── METRIC CARDS ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Pending Requests</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{pendingRequests.length}</div>
          <p className="text-[11px] text-muted-foreground">Awaiting your response</p>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Upcoming Tours</span>
            <Calendar className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{upcomingTours.length}</div>
          <p className="text-[11px] text-muted-foreground">Confirmed scheduled tours</p>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Guide Rating</span>
            <Star className="size-4 fill-amber-500 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {myGuide.rating.toFixed(2)}
            <span className="text-xs font-normal text-muted-foreground ml-1.5">
              ({myGuide.review_count} reviews)
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{myGuide.completed_tours} total tours completed</p>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Earnings This Month</span>
            <Coins className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{totalEarnings.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground">Direct bank deposit</p>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────────── */}
      <div className="mt-8 flex border-b border-border/80 gap-6 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "requests"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Pending Requests</span>
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "upcoming"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Upcoming Tours</span>
          {upcomingTours.length > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
              {upcomingTours.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("availability")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "availability"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Today's Schedule & Slots
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reviews")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "reviews"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Guest Reviews ({myGuide.reviews.length})
        </button>
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────────────────────── */}
      <div className="mt-6">
        {/* Tab 1: Pending Requests */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-foreground">
                          {req.tourist_name || "Traveller"}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {req.travellers} {req.travellers === 1 ? "Traveller" : "Travellers"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📅 {req.booking_date} at {req.start_time} ({req.duration_hours} hrs)
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-primary">
                        ₹{req.total_price.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-muted-foreground">Estimated Payout</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-3.5 text-xs space-y-1.5">
                    <p className="font-semibold text-foreground">
                      📍 Meeting Point: <span className="font-normal text-muted-foreground">{req.meeting_location}</span>
                    </p>
                    {req.package_title && (
                      <p className="font-semibold text-foreground">
                        🧭 Package: <span className="font-normal text-primary">{req.package_title}</span>
                      </p>
                    )}
                    {req.notes && (
                      <p className="text-muted-foreground italic">
                        "{req.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setChatPartner({
                          id: req.tourist_id,
                          name: req.tourist_name || "Traveller",
                        })
                      }
                      className="rounded-xl text-xs gap-1.5"
                    >
                      <MessageSquare className="size-3.5 text-primary" />
                      Chat with Traveller
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          statusMutation.mutate({
                            bookingId: req.id,
                            status: "REJECTED",
                            touristUserId: req.tourist_id,
                            bookingDate: req.booking_date,
                          })
                        }
                        disabled={statusMutation.isPending}
                        className="rounded-xl text-xs text-destructive hover:bg-destructive/10"
                      >
                        <X className="size-3.5 mr-1" />
                        Decline
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          statusMutation.mutate({
                            bookingId: req.id,
                            status: "ACCEPTED",
                            touristUserId: req.tourist_id,
                            bookingDate: req.booking_date,
                          })
                        }
                        disabled={statusMutation.isPending}
                        className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
                      >
                        <Check className="size-3.5" />
                        Accept Tour Request
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground text-xs">
                No pending tour requests right now. Your profile is active and visible to nearby tourists!
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upcoming Tours */}
        {activeTab === "upcoming" && (
          <div className="space-y-4">
            {upcomingTours.length > 0 ? (
              upcomingTours.map((tour) => (
                <div
                  key={tour.id}
                  className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-foreground">
                          {tour.tourist_name || "Traveller"}
                        </span>
                        <Badge className="bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                          Confirmed
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📅 {tour.booking_date} at {tour.start_time} ({tour.duration_hours} hrs)
                      </p>
                    </div>

                    <span className="text-base font-extrabold text-foreground">
                      ₹{tour.total_price.toLocaleString()}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-3.5 text-xs">
                    <p className="font-semibold text-foreground">
                      📍 Meeting Point: <span className="font-normal text-muted-foreground">{tour.meeting_location}</span>
                    </p>
                    {tour.tourist_phone && (
                      <p className="font-semibold text-foreground mt-1">
                        📞 Contact: <span className="font-normal text-muted-foreground">{tour.tourist_phone}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setChatPartner({
                          id: tour.tourist_id,
                          name: tour.tourist_name || "Traveller",
                        })
                      }
                      className="rounded-xl text-xs gap-1.5"
                    >
                      <MessageSquare className="size-3.5 text-primary" />
                      Message Guest
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        statusMutation.mutate({
                          bookingId: tour.id,
                          status: "COMPLETED",
                          touristUserId: tour.tourist_id,
                          bookingDate: tour.booking_date,
                        })
                      }
                      className="rounded-xl text-xs font-bold"
                    >
                      Mark Tour as Completed ⭐
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground text-xs">
                No upcoming confirmed tours.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Availability & Schedule */}
        {activeTab === "availability" && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-foreground">Today's Operating Time Slots</h3>
              <p className="text-xs text-muted-foreground">
                Set when you are available to guide travellers around {myGuide.city}.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {myGuide.availability_slots.map((slot) => (
                <div
                  key={slot.slot_id}
                  className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background p-4 space-y-3"
                >
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{slot.label}</h4>
                    <span className="text-xs text-muted-foreground">
                      {slot.start_time} – {slot.end_time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <span
                      className={`text-xs font-bold ${
                        slot.is_available ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {slot.is_available ? "✓ Open for Booking" : "Booked"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Reviews */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            {myGuide.reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{rev.reviewer_name}</p>
                    <p className="text-[11px] text-muted-foreground">{rev.reviewer_location || "Traveller"}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-3.5 ${
                          i < rev.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">"{rev.comment}"</p>
                <span className="text-[10px] text-muted-foreground block">{rev.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Dialog */}
      {chatPartner && (
        <ChatDialog
          open={!!chatPartner}
          onOpenChange={(open) => !open && setChatPartner(null)}
          partnerId={chatPartner.id}
          partnerName={chatPartner.name}
          partnerRoleLabel="Traveller"
          isPartnerProvider={false}
          serviceTitle={`Personal Guided Tour with ${myGuide.name}`}
        />
      )}
    </PageShell>
  );
}
