import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Globe2,
  Lock,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { GuideBookingModal } from "@/components/GuideBookingModal";
import { GuideReviewModal } from "@/components/GuideReviewModal";
import { GuideMap } from "@/components/GuideMap";
import { useAuth } from "@/hooks/useAuth";
import { humanGuideQuery, type GuidePackage } from "@/lib/guides";

export const Route = createFileRoute("/guides/$guideId")({
  head: ({ params }) => ({
    meta: [
      { title: `Local Tour Guide — Travezy` },
      {
        name: "description",
        content: "View guide profile, hourly rates, availability, customer reviews and book directly.",
      },
    ],
  }),
  component: GuideDetailPage,
});

function GuideDetailPage() {
  const { guideId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: guide, isLoading } = useQuery(humanGuideQuery(guideId));

  const [chatOpen, setChatOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<GuidePackage | undefined>(undefined);

  const handleMessageGuide = () => {
    if (!user) {
      toast.error("Please log in to chat with a tour guide.");
      navigate({
        to: "/login",
        search: { redirect: window.location.pathname },
      });
      return;
    }
    setChatOpen(true);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-96 animate-pulse rounded-3xl bg-muted/40" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Guide Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested tour guide profile could not be found or is currently inactive.
        </p>
        <Button asChild className="rounded-xl">
          <Link to="/tours">Browse All Tour Guides</Link>
        </Button>
      </div>
    );
  }

  const handleBookPackage = (pkg?: GuidePackage) => {
    setSelectedPackage(pkg);
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/tours" className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            Back to Tour Guides
          </Link>
          <span>/</span>
          <span>{guide.state}</span>
          <span>/</span>
          <span className="font-semibold text-foreground">{guide.name}</span>
        </div>

        {/* ── 1. HERO PROFILE CARD ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-card md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {/* Guide Photo */}
            <div className="relative shrink-0">
              <img
                src={guide.profile_image}
                alt={guide.name}
                className="size-32 md:size-40 rounded-3xl object-cover ring-4 ring-background shadow-lg"
              />
              {guide.available_today && (
                <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                  <span className="size-1.5 animate-ping rounded-full bg-white" />
                  Available Today
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
                  {guide.name}
                </h1>
                {guide.is_travezy_verified && (
                  <Badge className="flex items-center gap-1 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-600 dark:text-sky-400">
                    <CheckCircle2 className="size-3.5" />
                    Travezy Verified
                  </Badge>
                )}
              </div>

              {/* Location & Experience */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  {guide.city}, {guide.state}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium">
                  <Award className="size-3.5 text-primary" />
                  {guide.experience_years} Years Experience
                </span>
                <span>•</span>
                <span className="font-medium text-foreground">
                  {guide.completed_tours}+ Guided Tours Completed
                </span>
              </div>

              {/* Rating & Review Summary */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1 text-sm font-black text-amber-600 dark:text-amber-400">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                  {guide.rating.toFixed(2)}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  Based on {guide.review_count} verified traveller reviews
                </span>
              </div>

              {/* Languages Spoken */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="flex items-center gap-1 text-xs font-semibold text-foreground/80">
                  <Globe2 className="size-3.5 text-muted-foreground" />
                  Languages:
                </span>
                {guide.languages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Pricing & Actions Sidebar */}
            <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-muted/30 p-5 md:w-64 space-y-4">
              <div>
                <span className="text-xs text-muted-foreground">Starting from</span>
                <div className="text-2xl font-black text-foreground">
                  ₹{guide.half_day_rate.toLocaleString()}
                </div>
                <span className="text-xs text-muted-foreground">for a 4-hour tour</span>
              </div>

              <div className="space-y-2">
                <Button
                  size="lg"
                  onClick={() => handleBookPackage(undefined)}
                  className="w-full rounded-xl font-bold shadow-md"
                >
                  Book Guide
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMessageGuide}
                  className="w-full flex items-center justify-center gap-2 rounded-xl text-xs font-semibold"
                >
                  <MessageSquare className="size-3.5 text-primary" />
                  Message Guide
                </Button>
              </div>

              {/* Privacy Notice */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="size-3 text-muted-foreground shrink-0" />
                <span>Phone revealed after confirmed booking.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. TWO-COLUMN LAYOUT: DETAILS & AVAILABILITY ──────────────────── */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Column */}
          <div className="space-y-8 lg:col-span-2">
            {/* About Bio */}
            <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-foreground">About {guide.name}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {guide.bio}
              </p>

              {/* Specialization Tags */}
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                  Specialties & Cultural Focus
                </h3>
                <div className="flex flex-wrap gap-2">
                  {guide.specializations.map((spec) => (
                    <span
                      key={spec}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      <Sparkles className="size-3 text-primary" />
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* Tour Packages */}
            {guide.tour_packages && guide.tour_packages.length > 0 && (
              <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-foreground">Curated Tour Packages</h2>
                <div className="space-y-4">
                  {guide.tour_packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="rounded-2xl border border-border/80 bg-background p-4 sm:p-5 transition-all hover:border-primary/40 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-base font-bold text-foreground">{pkg.title}</h4>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="size-3 text-primary" />
                            {pkg.duration}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-base font-extrabold text-primary">
                            ₹{pkg.price.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">{pkg.description}</p>

                      {/* Highlights */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {pkg.highlights.map((hl) => (
                          <span
                            key={hl}
                            className="rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                          >
                            ✓ {hl}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleBookPackage(pkg)}
                          className="rounded-xl text-xs font-semibold"
                        >
                          Book This Package
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Coverage Areas & Service Map */}
            <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-foreground">Service Locations & Coverage</h2>
              <p className="text-xs text-muted-foreground">
                Operating within a {guide.service_radius_km} km radius around {guide.city}.
              </p>

              <div className="flex flex-wrap gap-2">
                {guide.coverage_areas.map((area) => (
                  <Badge key={area} variant="secondary" className="px-3 py-1 text-xs">
                    📍 {area}
                  </Badge>
                ))}
              </div>

              {/* Map View */}
              <div className="pt-2">
                <GuideMap
                  guides={[
                    {
                      ...guide,
                      distanceKm: null,
                      isWithinRadius: true,
                    },
                  ]}
                  center={[guide.longitude, guide.latitude]}
                  zoom={12}
                  height="h-[320px]"
                />
              </div>
            </section>

            {/* Customer Reviews Section */}
            <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Traveller Reviews</h2>
                  <p className="text-xs text-muted-foreground">
                    Authentic feedback from tourists who booked tours with {guide.name}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewModalOpen(true)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Rate This Guide ⭐
                </Button>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                {guide.reviews && guide.reviews.length > 0 ? (
                  guide.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-2xl border border-border/60 bg-background/60 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {rev.reviewer_avatar ? (
                            <img
                              src={rev.reviewer_avatar}
                              alt={rev.reviewer_name}
                              className="size-8 rounded-full object-cover ring-1 ring-border shrink-0"
                            />
                          ) : (
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                              {rev.reviewer_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {rev.reviewer_name}
                            </p>
                            {rev.reviewer_location && (
                              <p className="text-[10px] text-muted-foreground">
                                {rev.reviewer_location}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3 ${
                                i < rev.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-muted-foreground">
                        "{rev.comment}"
                      </p>

                      <div className="flex justify-between text-[10px] text-muted-foreground/70 pt-1">
                        <span>{rev.tour_type || "Guided Cultural Tour"}</span>
                        <span>{new Date(rev.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No reviews yet. Be the first to take a tour with {guide.name}!
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Column: Availability & Rate Card */}
          <div className="space-y-6">
            {/* Availability Calendar & Slots */}
            <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Today's Schedule</h3>
              </div>

              <div className="space-y-2.5">
                {guide.availability_slots.map((slot) => (
                  <div
                    key={slot.slot_id}
                    className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
                      slot.is_available
                        ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                        : "border-border bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{slot.label}</p>
                      <span className="text-[11px] text-muted-foreground">
                        {slot.start_time} – {slot.end_time}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        slot.is_available
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {slot.is_available ? "✓ Available" : "Booked"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Standard Rate Card */}
            <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
              <h3 className="text-base font-bold text-foreground">Standard Rate Card</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Hourly Rate:</span>
                  <span className="font-bold">₹{guide.hourly_rate} / hr</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Half-Day Tour (4 hrs):</span>
                  <span className="font-bold">₹{guide.half_day_rate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-muted-foreground">Full-Day Tour (8 hrs):</span>
                  <span className="font-bold">₹{guide.full_day_rate.toLocaleString()}</span>
                </div>
              </div>

              <Button
                onClick={() => handleBookPackage(undefined)}
                className="w-full mt-2 rounded-xl font-bold"
              >
                Book Guided Tour
              </Button>
            </section>

            {/* Verified Assurance */}
            <div className="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-5 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-sky-600 dark:text-sky-400">
                <ShieldCheck className="size-4" />
                <span>Travezy Guide Protection</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                All guide bookings include 100% money-back satisfaction guarantee and direct chat support.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Dialog */}
      <ChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        partnerId={guide.user_id}
        partnerName={guide.name}
        partnerAvatarUrl={guide.profile_image}
        partnerLocation={`${guide.city}, ${guide.state}`}
        partnerRoleLabel="Local Tour Guide"
        isPartnerProvider={false}
        serviceTitle={`Personal Guide in ${guide.city}`}
      />

      {/* Booking Modal */}
      <GuideBookingModal
        guide={guide}
        selectedPackage={selectedPackage}
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
      />

      {/* Review Modal */}
      <GuideReviewModal
        guide={guide}
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
      />
    </div>
  );
}
