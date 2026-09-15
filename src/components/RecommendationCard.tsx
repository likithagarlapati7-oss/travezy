import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, type ServiceWithProvider } from "@/lib/travezy";

export interface RecommendationCardProps {
  service: ServiceWithProvider;
  index?: number;
  highlightBadge?: string | undefined;
}

export function RecommendationCard({ service, index = 0, highlightBadge }: RecommendationCardProps) {
  const ratingNum = Number(service.rating) || 4.8;
  const reviewCount = service.review_count ?? 120;
  const locationText = [service.city, service.state, service.country]
    .filter(Boolean)
    .join(", ") || service.destination;

  const isStay = ["hotel", "resort", "homestay", "heritage"].includes(service.category?.toLowerCase());
  const isDining = ["restaurant", "dining", "culinary"].includes(service.category?.toLowerCase());

  const priceSuffix = isStay ? "/ night" : isDining ? "/ person" : "/ guest";

  return (
    <div
      style={{ animationDelay: `${index * 50}ms` }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-float shadow-card"
    >
      <div>
        {/* Card Image with badges */}
        <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl bg-muted">
          <img
            src={
              service.image_url ||
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
            }
            alt={service.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Top Floating Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white capitalize shadow-sm">
              {service.category}
            </span>

            {highlightBadge ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-lagoon px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                {highlightBadge}
              </span>
            ) : service.providers?.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                <BadgeCheck className="size-3" /> Verified Partner
              </span>
            ) : null}
          </div>

          {/* Bottom Floating Rating Badge */}
          <div className="absolute bottom-2.5 left-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              <Star className="size-3.5 fill-gold text-gold" />
              <span>{ratingNum.toFixed(1)}</span>
              <span className="text-white/70 font-normal text-[11px]">
                ({reviewCount} reviews)
              </span>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="mt-3.5 space-y-1.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
            <MapPin className="size-3.5 text-accent shrink-0" />
            <span className="truncate">{locationText}</span>
          </p>

          <h3 className="font-display text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {service.title}
          </h3>

          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {service.description}
          </p>
        </div>
      </div>

      {/* Footer / Price & Action */}
      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
        <div>
          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
            Starting from
          </span>
          <p className="font-display text-lg font-bold text-primary">
            {formatPrice(Number(service.price), service.currency)}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              {priceSuffix}
            </span>
          </p>
        </div>

        <Button
          asChild
          size="sm"
          variant="ocean"
          className="rounded-full text-xs gap-1 shadow-xs group-hover:shadow-sm"
        >
          <Link to="/services/$serviceId" params={{ serviceId: service.id }}>
            View Details <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function RecommendationCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-4 space-y-4 animate-pulse">
      <div className="aspect-16/10 w-full rounded-2xl bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-5 w-4/5 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-border">
        <div className="h-5 w-20 rounded bg-muted" />
        <div className="h-8 w-24 rounded-full bg-muted" />
      </div>
    </div>
  );
}
