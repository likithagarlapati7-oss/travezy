import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { ServiceCard, ServiceCardSkeleton } from "@/components/ServiceCard";
import { ServiceFilters, useServiceFilters } from "@/components/ServiceFilters";
import { servicesQuery } from "@/lib/travezy";

export const Route = createFileRoute("/hotels")({
  head: () => ({
    meta: [
      { title: "Stays in India & Worldwide — Travezy" },
      {
        name: "description",
        content:
          "Book homestays, heritage hotels, beach resorts and mountain stays across India, plus boutique stays worldwide.",
      },
      { property: "og:title", content: "Stays in India & Worldwide — Travezy" },
      {
        property: "og:description",
        content:
          "Homestays, heritage hotels, beach resorts and mountain stays across India and beyond.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HotelsPage,
});

function HotelsPage() {
  const { data, isLoading } = useQuery(
    servicesQuery(["hotel", "resort", "homestay", "heritage"]),
  );
  const filterState = useServiceFilters(data ?? [], "hotel");

  return (
    <PageShell
      eyebrow="Stays"
      title="Sleep somewhere unforgettable"
      subtitle="Kerala houseboats, Rajasthan havelis, Himalayan lodges and overwater villas — all bookable in seconds."
    >
      <ServiceFilters
        {...filterState}
        showCategory={false}
        resultCount={filterState.filtered.length}
      />

      <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <ServiceCardSkeleton key={i} />)
          : filterState.filtered.map((s, i) => <ServiceCard key={s.id} service={s} index={i} />)}
      </div>
      {!isLoading && filterState.filtered.length === 0 && (
        <p className="mt-16 text-center text-muted-foreground">No stays match your filters.</p>
      )}
    </PageShell>
  );
}
