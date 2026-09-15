import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Service } from "@/lib/travezy";

export type Region = "all" | "india" | "international";

export type Filters = {
  region: Region;
  search: string;
  category: string;
  country: string;
  state: string;
  city: string;
  maxPrice: string;
  minRating: string;
};

const initial: Filters = {
  region: "all",
  search: "",
  category: "all",
  country: "all",
  state: "all",
  city: "all",
  maxPrice: "all",
  minRating: "all",
};

export const isIndia = (s: Pick<Service, "country">) =>
  (s.country ?? "").trim().toLowerCase() === "india";

const uniq = (values: Array<string | null>) =>
  Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim())))).sort((a, b) =>
    a.localeCompare(b),
  );

export function useServiceFilters<T extends Service>(services: T[], lockCategory?: string) {
  const [filters, setFilters] = useState<Filters>({
    ...initial,
    category: lockCategory ?? "all",
  });

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "country" ? { state: "all", city: "all" } : {}),
      ...(key === "state" ? { city: "all" } : {}),
    }));

  const reset = () => setFilters({ ...initial, category: lockCategory ?? "all" });

  const byRegion = useMemo(
    () =>
      services.filter((s) =>
        filters.region === "all"
          ? true
          : filters.region === "india"
            ? isIndia(s)
            : !isIndia(s),
      ),
    [services, filters.region],
  );

  const countries = useMemo(() => uniq(byRegion.map((s) => s.country)), [byRegion]);
  const states = useMemo(
    () =>
      uniq(
        byRegion
          .filter((s) => filters.country === "all" || s.country === filters.country)
          .map((s) => s.state),
      ),
    [byRegion, filters.country],
  );
  const cities = useMemo(
    () =>
      uniq(
        byRegion
          .filter((s) => filters.country === "all" || s.country === filters.country)
          .filter((s) => filters.state === "all" || s.state === filters.state)
          .map((s) => s.city ?? s.destination),
      ),
    [byRegion, filters.country, filters.state],
  );

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return byRegion.filter((s) => {
      if (filters.category !== "all" && s.category !== filters.category) return false;
      if (filters.country !== "all" && s.country !== filters.country) return false;
      if (filters.state !== "all" && s.state !== filters.state) return false;
      if (filters.city !== "all" && (s.city ?? s.destination) !== filters.city) return false;
      if (filters.maxPrice !== "all" && Number(s.price) > Number(filters.maxPrice)) return false;
      if (filters.minRating !== "all" && Number(s.rating) < Number(filters.minRating)) return false;
      if (!q) return true;
      return [s.title, s.destination, s.city, s.state, s.country, s.description]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [byRegion, filters]);

  return { filters, setFilter, reset, filtered, countries, states, cities };
}

const categories = ["all", "restaurant", "hotel", "tour", "experience", "transport"];
const priceBands = [
  { label: "Any price", value: "all" },
  { label: "Under 2,000", value: "2000" },
  { label: "Under 5,000", value: "5000" },
  { label: "Under 10,000", value: "10000" },
];
const ratings = [
  { label: "Any rating", value: "all" },
  { label: "4.0+", value: "4" },
  { label: "4.5+", value: "4.5" },
];

export function ServiceFilters({
  filters,
  setFilter,
  reset,
  countries,
  states,
  cities,
  showCategory = true,
  resultCount,
}: ReturnType<typeof useServiceFilters> & { showCategory?: boolean; resultCount: number }) {
  const regions: Array<{ label: string; value: Region }> = [
    { label: "All", value: "all" },
    { label: "India", value: "india" },
    { label: "International", value: "international" },
  ];

  return (
    <div className="glass-card space-y-4 rounded-3xl p-5 shadow-card">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Search Goa, Kerala, Manali, Jaipur, Kashmir…"
            className="h-11 rounded-full pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={filters.region === r.value ? "ocean" : "outline"}
              onClick={() => setFilter("region", r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {showCategory && (
          <Select value={filters.category} onValueChange={(v) => setFilter("category", v)}>
            <SelectTrigger className="rounded-full capitalize">
              <SelectValue placeholder="Service type" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c === "all" ? "All service types" : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filters.country} onValueChange={(v) => setFilter("country", v)}>
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.state} onValueChange={(v) => setFilter("state", v)}>
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states / regions</SelectItem>
            {states.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.city} onValueChange={(v) => setFilter("city", v)}>
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.maxPrice} onValueChange={(v) => setFilter("maxPrice", v)}>
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            {priceBands.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.minRating} onValueChange={(v) => setFilter("minRating", v)}>
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            {ratings.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </span>
        <button type="button" onClick={reset} className="font-semibold text-primary hover:underline">
          Reset filters
        </button>
      </div>
    </div>
  );
}
