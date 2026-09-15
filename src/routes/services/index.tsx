import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LayoutGrid, Map } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ServiceCard, ServiceCardSkeleton } from "@/components/ServiceCard";
import { SearchFilters, MobileFilterToggle } from "@/components/SearchFilters";
import { MapboxMap, type ServiceMarker } from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { formatPrice, servicesSearchQuery, type ServiceSearchParams } from "@/lib/travezy";
import { getServiceCoordinates, isValidCoord, hasMapboxToken } from "@/lib/mapbox";
import { cn } from "@/lib/utils";

// ── Route definition ──────────────────────────────────────────────────────────

export const Route = createFileRoute("/services/")({
  validateSearch: (raw: Record<string, unknown>): ServiceSearchParams => ({
    q:        typeof raw["q"]        === "string" ? raw["q"] || undefined        : undefined,
    category: typeof raw["category"] === "string" ? raw["category"] || undefined : undefined,
    location: typeof raw["location"] === "string" ? raw["location"] || undefined : undefined,
    minPrice: raw["minPrice"] != null ? Number(raw["minPrice"]) || undefined : undefined,
    maxPrice: raw["maxPrice"] != null ? Number(raw["maxPrice"]) || undefined : undefined,
    rating:   raw["rating"]   != null ? Number(raw["rating"])   || undefined : undefined,
    sort:     typeof raw["sort"]     === "string" ? raw["sort"] || undefined     : undefined,
    page:     raw["page"]     != null ? Math.max(1, Number(raw["page"]) || 1)    : 1,
    view:     raw["view"] === "map" ? "map" : "list",
  }),
  head: () => ({
    meta: [
      { title: "All Travel Services — Travezy" },
      {
        name: "description",
        content: "Search and filter live listings across India and the world — by keyword, category, location, price and rating.",
      },
      { property: "og:title",       content: "All Travel Services — Travezy" },
      { property: "og:description", content: "Browse hotels, tours and experiences from trusted Travezy providers." },
      { property: "og:type",        content: "website" },
      { name: "twitter:card",       content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

// ── Page component ────────────────────────────────────────────────────────────

function ServicesPage() {
  const params   = Route.useSearch();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery(servicesSearchQuery(params));

  const handleChange = useCallback(
    (updates: Partial<ServiceSearchParams>) => {
      navigate({
        to: "/services",
        search: { ...params, ...updates, page: 1 },
        replace: true,
      });
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setMobileOpen(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, params],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({ to: "/services", search: { ...params, page }, replace: true });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [navigate, params],
  );

  const handleClear = useCallback(() => {
    navigate({ to: "/services", search: { page: 1, view: params.view }, replace: true });
    setMobileOpen(false);
  }, [navigate, params.view]);

  const setView = useCallback(
    (view: "list" | "map") =>
      navigate({ to: "/services", search: { ...params, view }, replace: true }),
    [navigate, params],
  );

  const hasFilters = !!(
    params.q || params.category || params.location ||
    params.minPrice || params.maxPrice || params.rating
  );

  const total = data?.total ?? 0;
  const isMapView = params.view === "map";

  // Build markers from services that have valid coordinates or known destinations
  const mapMarkers: ServiceMarker[] = (data?.services ?? [])
    .map((s): ServiceMarker | null => {
      const coords = getServiceCoordinates(s);
      if (!coords) return null;
      return {
        id: s.id,
        lat: coords.lat,
        lng: coords.lng,
        title: s.title,
        subtitle: `${s.destination ? `${s.destination} • ` : ""}${formatPrice(Number(s.price), s.currency)}`,
        category: s.category,
        serviceId: s.id,
      };
    })
    .filter((m): m is ServiceMarker => m !== null);

  return (
    <PageShell
      eyebrow="Marketplace"
      title="Every journey, one place"
      subtitle="Search and filter live listings across India and the world — by keyword, category, location, price and rating."
    >
      {/* ── Mobile filter toggle ── */}
      <div className="mb-5 flex items-center gap-3">
        <MobileFilterToggle
          open={mobileOpen}
          onToggle={() => setMobileOpen((v) => !v)}
          hasFilters={hasFilters}
          total={total}
          isLoading={isLoading}
        />
        {/* View toggle — always visible */}
        <div className="ml-auto flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 lg:hidden">
          <ViewToggleBtn active={!isMapView} onClick={() => setView("list")} label="List">
            <LayoutGrid className="size-4" />
          </ViewToggleBtn>
          <ViewToggleBtn active={isMapView} onClick={() => setView("map")} label="Map" >
            <Map className="size-4" />
          </ViewToggleBtn>
        </div>
      </div>

      {/* ── Mobile collapsible filter panel ── */}
      {mobileOpen && (
        <div className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-card lg:hidden">
          <SearchFilters
            params={params}
            onChange={handleChange}
            onClear={handleClear}
            total={total}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* ── Main 2-column layout ── */}
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <div className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-28 rounded-3xl border border-border bg-card p-6 shadow-card">
            <SearchFilters
              params={params}
              onChange={handleChange}
              onClear={handleClear}
              total={total}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          {/* Desktop: result count + view toggle */}
          <div className="mb-5 hidden items-center justify-between lg:flex">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading…"
                : <><strong className="font-semibold text-foreground">{total.toLocaleString()}</strong> result{total === 1 ? "" : "s"}</>
              }
            </p>
            <div className="flex items-center gap-3">
              {hasFilters && (
                <button type="button" onClick={handleClear} className="text-xs font-semibold text-primary hover:underline">
                  Clear all filters
                </button>
              )}
              {/* Desktop view toggle */}
              <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
                <ViewToggleBtn active={!isMapView} onClick={() => setView("list")} label="List">
                  <LayoutGrid className="size-4" />
                </ViewToggleBtn>
                <ViewToggleBtn active={isMapView} onClick={() => setView("map")} label="Map" >
                  <Map className="size-4" />
                </ViewToggleBtn>
              </div>
            </div>
          </div>

          {/* Error */}
          {isError && (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="font-medium text-destructive">We couldn&apos;t load services right now.</p>
              <button onClick={() => refetch()} className="mt-4 rounded-xl border border-border px-5 py-2 text-sm font-medium hover:bg-muted">
                Try again
              </button>
            </div>
          )}

          {/* ── Map View ── */}
          {!isError && isMapView && (
            <div>
              {isLoading ? (
                <div className="h-[520px] animate-pulse rounded-3xl bg-muted" />
              ) : mapMarkers.length === 0 && !isLoading ? (
                <div className="flex h-[520px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border">
                  <Map className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {total > 0
                      ? "None of the filtered services have map coordinates yet."
                      : "No services found. Try changing your search or filters."}
                  </p>
                  {hasFilters && (
                    <Button variant="outline" size="sm" onClick={handleClear}>Clear filters</Button>
                  )}
                </div>
              ) : (
                <MapboxMap
                  markers={mapMarkers}
                  height="h-[520px]"
                  className="w-full shadow-card"
                />
              )}
              {/* Service count below map */}
              {!isLoading && total > 0 && (
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Showing <strong className="font-semibold text-foreground">{mapMarkers.length}</strong> pinned location{mapMarkers.length === 1 ? "" : "s"} out of <strong className="font-semibold text-foreground">{total.toLocaleString()}</strong> results
                </p>
              )}
            </div>
          )}

          {/* ── List View ── */}
          {!isError && !isMapView && (
            <>
              <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)
                  : (data?.services ?? []).map((s, i) => (
                      <ServiceCard key={s.id} service={s} index={i} />
                    ))
                }
              </div>

              {/* Empty state */}
              {!isLoading && total === 0 && (
                <div className="mt-8 rounded-3xl border border-dashed border-border p-14 text-center">
                  <p className="text-muted-foreground">
                    No services found. Try changing your search or filters.
                  </p>
                  {hasFilters && (
                    <Button variant="outline" size="sm" className="mt-5" onClick={handleClear}>
                      Clear filters
                    </Button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <Pagination
                  page={params.page ?? 1}
                  totalPages={data.totalPages}
                  total={data.total}
                  limit={data.limit}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ── View toggle button ────────────────────────────────────────────────────────

function ViewToggleBtn({
  active, onClick, label, disabled = false, children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} (add VITE_MAPBOX_TOKEN to enable)` : label}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, total, limit, onPageChange,
}: {
  page: number; totalPages: number; total: number; limit: number;
  onPageChange: (page: number) => void;
}) {
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);
  const pages = buildPageList(page, totalPages);

  return (
    <div className="mt-12 flex flex-col items-center gap-5">
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <strong className="font-semibold text-foreground">{start}–{end}</strong>
        {" "}of{" "}
        <strong className="font-semibold text-foreground">{total.toLocaleString()}</strong>
        {" "}services
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="gap-1">
          <ChevronLeft className="size-4" /> Previous
        </Button>
        {pages.map((p, i) =>
          p === null ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
          ) : (
            <Button key={p} size="sm" variant={p === page ? "ocean" : "ghost"} onClick={() => onPageChange(p)} className="min-w-9">
              {p}
            </Button>
          ),
        )}
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="gap-1">
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function buildPageList(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | null)[] = [1];
  if (current > 3)         pages.push(null);
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  for (let i = lo; i <= hi; i++) pages.push(i);
  if (current < total - 2) pages.push(null);
  pages.push(total);
  return pages;
}
