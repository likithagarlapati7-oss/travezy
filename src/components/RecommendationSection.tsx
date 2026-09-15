import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecommendationCard, RecommendationCardSkeleton } from "@/components/RecommendationCard";
import type { ServiceWithProvider } from "@/lib/travezy";

export interface RecommendationSectionProps {
  title: string;
  eyebrow?: string | undefined;
  description?: string | undefined;
  services: ServiceWithProvider[];
  isLoading?: boolean | undefined;
  viewAllLink?: string | undefined;
  viewAllText?: string | undefined;
  highlightBadge?: string | undefined;
  icon?: any;
  emptyText?: string | undefined;
}

export function RecommendationSection({
  title,
  eyebrow,
  description,
  services,
  isLoading = false,
  viewAllLink,
  viewAllText = "View All",
  highlightBadge,
  icon: Icon = Sparkles,
  emptyText = "No listings available right now.",
}: RecommendationSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent flex items-center gap-1.5">
              <Icon className="size-3.5" />
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1 text-2xl md:text-3xl font-display font-bold text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {viewAllLink && (
          <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5 text-xs">
            <Link to={viewAllLink}>
              {viewAllText} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <RecommendationCardSkeleton key={i} />
          ))
        ) : services.length > 0 ? (
          services.map((service, index) => (
            <RecommendationCard
              key={service.id}
              service={service}
              index={index}
              highlightBadge={highlightBadge}
            />
          ))
        ) : (
          <div className="col-span-full rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}
