import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "@/components/WishlistButton";
import { formatPrice, providerName, type ServiceWithProvider } from "@/lib/travezy";

export function ServiceCard({ service, index = 0 }: { service: ServiceWithProvider; index?: number }) {
  const itemType =
    service.category === "hotel"
      ? "hotel"
      : service.category === "restaurant"
        ? "restaurant"
        : "experience";

  return (
    <article
      className="group animate-float-up overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-float"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-gradient-ocean">
        <img
          src={service.image_url ?? ""}
          alt={`${service.title} in ${service.destination}`}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <span className="glass-panel absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold capitalize text-primary-foreground">
          {service.category}
        </span>
        <div className="absolute right-4 top-4 flex items-center gap-2">
          {Number(service.rating) > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-gold px-2.5 py-1 text-xs font-bold text-gold-foreground shadow-sm">
              <Star className="size-3 fill-current" />
              {Number(service.rating).toFixed(1)}
            </span>
          )}
          <WishlistButton
            item={{
              item_type: itemType,
              item_id: service.id,
              item_title: service.title,
              item_image: service.image_url,
              item_category: service.category,
              destination: service.destination,
              city: service.city,
              state: service.state,
              price: Number(service.price),
              currency: service.currency,
              rating: Number(service.rating),
              review_count: service.review_count,
            }}
          />
        </div>
      </div>

      <div className="space-y-3 p-5">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-accent-foreground/70">
          <MapPin className="size-3.5 text-accent" />
          {[service.city && service.city !== service.destination ? service.city : null, service.destination, service.state, service.country]
            .filter(Boolean)
            .slice(0, 3)
            .join(", ")}
        </p>
        <h3 className="font-display text-xl leading-snug text-foreground">{service.title}</h3>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BadgeCheck className="size-3.5 text-primary" />
          {providerName(service)}
        </p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="font-display text-2xl font-semibold text-primary">
              {formatPrice(Number(service.price), service.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              per person
              {service.review_count > 0 ? ` · ${service.review_count} reviews` : " · new listing"}
            </p>
          </div>
          <Button asChild variant="ocean" size="sm">
            <Link to="/services/$serviceId" params={{ serviceId: service.id }}>
              View Details
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="aspect-4/3 animate-pulse bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-3/4 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
