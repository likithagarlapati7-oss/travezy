import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Globe2,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { GuideBookingModal } from "@/components/GuideBookingModal";
import { WishlistButton } from "@/components/WishlistButton";
import { useAuth } from "@/hooks/useAuth";
import type { GuideWithDistance } from "@/lib/guides";
import { cn } from "@/lib/utils";

interface GuideCardProps {
  guide: GuideWithDistance;
  onBookClick?: ((guide: GuideWithDistance) => void) | undefined;
  className?: string | undefined;
}

export function GuideCard({ guide, onBookClick, className }: GuideCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const handleChatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleBook = () => {
    if (onBookClick) {
      onBookClick(guide);
    } else {
      setBookingModalOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl",
          className,
        )}
      >
        {/* Wishlist Button absolute in top right */}
        <div className="absolute top-4 right-4 z-10">
          <WishlistButton
            item={{
              item_type: "guide",
              item_id: guide.id,
              item_title: guide.name,
              item_image: guide.profile_image,
              item_category: "Local Guide",
              destination: `${guide.city}, ${guide.state}`,
              city: guide.city,
              state: guide.state,
              price: guide.hourly_rate,
              rating: guide.rating,
              review_count: guide.review_count,
            }}
          />
        </div>

        {/* Top Header: Avatar, Status, Verified Badge */}
        <div>
          <div className="flex items-start gap-4 pr-10">
            {/* Guide Avatar with Availability Ring */}
            <div className="relative shrink-0">
              <img
                src={guide.profile_image}
                alt={guide.name}
                loading="lazy"
                className="size-20 rounded-2xl object-cover ring-2 ring-border transition-transform duration-300 group-hover:scale-105"
              />
              {guide.available_today ? (
                <span
                  title="Available Today"
                  className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card"
                >
                  <span className="size-2 animate-ping rounded-full bg-white opacity-75" />
                  <span className="absolute size-2 rounded-full bg-white" />
                </span>
              ) : null}
            </div>

            {/* Basic Info & Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <Link
                  to="/guides/$guideId"
                  params={{ guideId: guide.id }}
                  className="truncate text-base font-bold tracking-tight text-foreground transition-colors hover:text-primary"
                >
                  {guide.name}
                </Link>
              </div>

              {guide.is_travezy_verified && (
                <Badge
                  variant="secondary"
                  className="mt-1 inline-flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400"
                >
                  <CheckCircle2 className="size-3" />
                  Travezy Verified
                </Badge>
              )}

              {/* Location & Distance */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground/80">
                  <MapPin className="size-3.5 text-primary" />
                  {guide.city}, {guide.state}
                </span>

                {guide.distanceKm != null && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    📍 {guide.distanceKm < 1 ? `${Math.round(guide.distanceKm * 1000)}m away` : `${guide.distanceKm} km away`}
                  </span>
                )}
              </div>

              {/* Rating & Completed Tours */}
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Star className="size-3.5 fill-amber-500" />
                  {guide.rating.toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  ({guide.review_count} {guide.review_count === 1 ? "review" : "reviews"})
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span className="font-medium text-foreground/80">
                  {guide.completed_tours}+ tours led
                </span>
              </div>
            </div>
          </div>

          {/* Bio Snippet */}
          <p className="mt-3.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {guide.bio}
          </p>

          {/* Languages Spoken */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground/70">
              <Globe2 className="size-3 text-muted-foreground" />
              Speaks:
            </span>
            {guide.languages.slice(0, 3).map((lang) => (
              <span
                key={lang}
                className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
              >
                {lang}
              </span>
            ))}
            {guide.languages.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{guide.languages.length - 3} more
              </span>
            )}
          </div>

          {/* Specializations & Categories */}
          <div className="mt-2.5 flex flex-wrap gap-1">
            {guide.specializations.slice(0, 2).map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[10px] font-medium text-foreground/80"
              >
                <Sparkles className="size-2.5 text-primary" />
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Section: Price & Action Buttons */}
        <div className="mt-5 border-t border-border/60 pt-4">
          <div className="flex items-baseline justify-between mb-3.5">
            <div>
              <span className="text-xs text-muted-foreground">From</span>{" "}
              <span className="text-base font-extrabold text-foreground">
                ₹{guide.half_day_rate.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground"> / half-day</span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              ₹{guide.hourly_rate}/hr
            </span>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-semibold"
            >
              <Link to="/guides/$guideId" params={{ guideId: guide.id }}>
                View Profile
              </Link>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleChatClick}
              className="flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-foreground"
            >
              <MessageSquare className="size-3.5 text-primary" />
              Chat
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleBook}
              className="rounded-xl text-xs font-semibold shadow-sm"
            >
              Book Guide
            </Button>
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
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
      />
    </>
  );
}
