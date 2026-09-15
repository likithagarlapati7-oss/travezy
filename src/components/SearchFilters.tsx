import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Filter, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SERVICE_CATEGORIES } from "@/lib/services.schema";
import type { ServiceSearchParams } from "@/lib/travezy";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc",   label: "Price: Low to High" },
  { value: "price_desc",  label: "Price: High to Low" },
  { value: "rating_desc", label: "Rating: High to Low" },
  { value: "newest",      label: "Newest first" },
] as const;

const RATING_OPTIONS = [
  { value: 0, label: "Any rating" },
  { value: 4, label: "4+ stars" },
  { value: 3, label: "3+ stars" },
  { value: 2, label: "2+ stars" },
] as const;

type PricePreset = { label: string; min: number | undefined; max: number | undefined };
const PRICE_PRESETS: PricePreset[] = [
  { label: "Under 2K",   min: undefined, max: 2000  },
  { label: "2K – 10K",   min: 2000,      max: 10000 },
  { label: "10K – 50K",  min: 10000,     max: 50000 },
  { label: "50K+",        min: 50000,     max: undefined },
];

// ── SearchFilters component ───────────────────────────────────────────────────

type Props = {
  params: ServiceSearchParams;
  onChange: (updates: Partial<ServiceSearchParams>) => void;
  onClear: () => void;
  total: number;
  isLoading: boolean;
};

export function SearchFilters({ params, onChange, onClear, total, isLoading }: Props) {
  const [searchInput,   setSearchInput]   = useState(params.q        ?? "");
  const [locationInput, setLocationInput] = useState(params.location ?? "");
  const [minPriceStr,   setMinPriceStr]   = useState(params.minPrice != null ? String(params.minPrice) : "");
  const [maxPriceStr,   setMaxPriceStr]   = useState(params.maxPrice != null ? String(params.maxPrice) : "");
  const [priceError,    setPriceError]    = useState("");

  // Prevent circular syncing when URL changes reset local state
  const syncingRef = useRef(false);

  // ── Debounced search → URL ──────────────────────────────────────────────
  useEffect(() => {
    if (syncingRef.current) return;
    const t = setTimeout(() => { onChange({ q: searchInput.trim() || undefined }); }, 450);
    return () => clearTimeout(t);
  }, [searchInput]); // onChange intentionally omitted – parent uses useCallback

  // ── Debounced location → URL ────────────────────────────────────────────
  useEffect(() => {
    if (syncingRef.current) return;
    const t = setTimeout(() => { onChange({ location: locationInput.trim() || undefined }); }, 450);
    return () => clearTimeout(t);
  }, [locationInput]);

  // ── URL → local (on Clear or external URL change) ──────────────────────
  useEffect(() => {
    syncingRef.current = true;
    setSearchInput(params.q ?? "");
    setLocationInput(params.location ?? "");
    setMinPriceStr(params.minPrice != null ? String(params.minPrice) : "");
    setMaxPriceStr(params.maxPrice != null ? String(params.maxPrice) : "");
    setPriceError("");
    queueMicrotask(() => { syncingRef.current = false; });
  }, [params.q, params.location, params.minPrice, params.maxPrice]);

  // ── Price commit (on blur or Enter) ─────────────────────────────────────
  function commitPrices() {
    const min = minPriceStr.trim() ? Number(minPriceStr) : undefined;
    const max = maxPriceStr.trim() ? Number(maxPriceStr) : undefined;
    if (min !== undefined && max !== undefined && min > max) {
      setPriceError("Min price cannot exceed max price");
      return;
    }
    setPriceError("");
    onChange({ minPrice: min, maxPrice: max });
  }

  function handlePriceKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitPrices();
  }

  const hasFilters = !!(params.q || params.category || params.location || params.minPrice || params.maxPrice || params.rating);

  return (
    <aside className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="size-4 text-accent" />
          Filters
        </span>
        {hasFilters && (
          <button type="button" onClick={onClear} className="text-xs font-semibold text-primary hover:underline">
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <section className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Hotels, tours, beaches…"
            className="h-11 rounded-full pl-10 pr-9"
          />
          {searchInput && (
            <button type="button" aria-label="Clear" onClick={() => setSearchInput("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
      </section>

      {/* Sort */}
      <section className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sort by</Label>
        <Select value={params.sort ?? "recommended"} onValueChange={(v) => onChange({ sort: v })}>
          <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </section>

      {/* Category */}
      <section className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Category</Label>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!params.category} onClick={() => onChange({ category: undefined })}>All</Chip>
          {SERVICE_CATEGORIES.map((c) => (
            <Chip key={c} active={params.category === c}
              onClick={() => onChange({ category: params.category === c ? undefined : c })}>
              {c}
            </Chip>
          ))}
        </div>
      </section>

      {/* Location */}
      <section className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Location</Label>
        <div className="relative">
          <Input value={locationInput} onChange={(e) => setLocationInput(e.target.value)}
            placeholder="Goa, Kerala, Jaipur…" className="h-11 rounded-full pr-9" />
          {locationInput && (
            <button type="button" aria-label="Clear" onClick={() => setLocationInput("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
      </section>

      {/* Price range */}
      <section className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Price range</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">Min price</p>
            <Input type="number" min={0} value={minPriceStr} placeholder="0"
              onChange={(e) => { setMinPriceStr(e.target.value); setPriceError(""); }}
              onBlur={commitPrices} onKeyDown={handlePriceKey} className="h-10 rounded-xl" />
          </div>
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">Max price</p>
            <Input type="number" min={0} value={maxPriceStr} placeholder="Any"
              onChange={(e) => { setMaxPriceStr(e.target.value); setPriceError(""); }}
              onBlur={commitPrices} onKeyDown={handlePriceKey} className="h-10 rounded-xl" />
          </div>
        </div>
        {priceError && <p className="text-xs text-destructive">{priceError}</p>}
        <div className="flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((p) => {
            const active = params.minPrice === p.min && params.maxPrice === p.max;
            return (
              <button key={p.label} type="button"
                onClick={() => {
                  setMinPriceStr(p.min != null ? String(p.min) : "");
                  setMaxPriceStr(p.max != null ? String(p.max) : "");
                  setPriceError("");
                  onChange({ minPrice: p.min, maxPrice: p.max });
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-accent bg-secondary text-accent-foreground"
                    : "border-border text-muted-foreground hover:border-accent/60",
                )}>
                {p.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Rating */}
      <section className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Star className="size-3.5 fill-gold text-gold" /> Min rating
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {RATING_OPTIONS.map((r) => (
            <button key={r.value} type="button"
              onClick={() => onChange({ rating: r.value > 0 ? r.value : undefined })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                (params.rating ?? 0) === r.value
                  ? "border-gold bg-gold text-gold-foreground"
                  : "border-border text-muted-foreground hover:border-gold/50",
              )}>
              {r.label}
            </button>
          ))}
        </div>
      </section>

      {/* Results summary */}
      <div className="border-t border-border pt-4 text-xs text-muted-foreground">
        {isLoading
          ? <span className="animate-pulse">Loading…</span>
          : <span><strong className="font-semibold text-foreground">{total.toLocaleString()}</strong>{" "}{total === 1 ? "service" : "services"} found</span>
        }
      </div>
    </aside>
  );
}

// ── Mobile filter toggle (exported, used in services/index.tsx) ───────────────

export function MobileFilterToggle({
  open, onToggle, hasFilters, total, isLoading,
}: {
  open: boolean; onToggle: () => void; hasFilters: boolean; total: number; isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 lg:hidden">
      <Button variant="outline" size="sm" onClick={onToggle} className="relative gap-2">
        <Filter className="size-4" />
        {open ? "Hide filters" : "Filters"}
        {hasFilters && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />}
      </Button>
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Loading…" : `${total.toLocaleString()} result${total === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}

// ── Helper: Chip button ───────────────────────────────────────────────────────

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary/50",
      )}>
      {children}
    </button>
  );
}
