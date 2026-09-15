import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPin, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  geocodeForward,
  geocodeReverse,
  getMapStyle,
  hasMapboxToken,
  isValidCoord,
  loadMapboxGL,
  type LocationResult,
  MAPBOX_TOKEN,
} from "@/lib/mapbox";
import { Button } from "@/components/ui/button";

export { type LocationResult };

type Props = {
  /** Pre-filled value; when changed externally the map will re-centre. */
  initialLat?: number | null | undefined;
  initialLng?: number | null | undefined;
  initialPlaceName?: string | undefined;
  /** Called every time the user moves the pin. */
  onLocationChange: (result: LocationResult) => void;
  /** Called when the user clears the pin. */
  onClear: () => void;
  className?: string | undefined;
};

/** Marker DOM element — custom pin style. */
function makePinEl(): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Draggable location marker");
  el.style.cssText = [
    "width:36px",
    "height:36px",
    "background:linear-gradient(135deg,#0284c7,#0369a1)",
    "border:3px solid #ffffff",
    "border-radius:50%",
    "cursor:grab",
    "box-shadow:0 4px 14px rgba(0,0,0,0.35)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "transition:transform 0.15s ease",
  ].join(";");
  el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
  return el;
}

/**
 * Interactive location picker used in the Provider Add/Edit Service form.
 *
 * Features:
 * - Geocoding autocomplete (search any address/destination -> pick from dropdown)
 * - Click anywhere on the map to drop or move the pin
 * - Drag the existing pin to adjust coordinates
 * - Reverse-geocodes new pin positions to fill city/state/country
 * - Clear button removes the pin and resets coordinates
 */
export function MapboxLocationPicker({
  initialLat,
  initialLng,
  initialPlaceName = "",
  onLocationChange,
  onClear,
  className,
}: Props) {
  const [search, setSearch] = useState(initialPlaceName);
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(isValidCoord(initialLat, initialLng));
  const [reverseLoading, setReverseLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Forward geocode debounce ───────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingSug(true);
      const results = await geocodeForward(search);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setLoadingSug(false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // ── Sync search label when initialPlaceName changes ────────────────────────
  useEffect(() => {
    setSearch(initialPlaceName);
  }, [initialPlaceName]);

  // ── Initialise map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    setIsLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const mapboxgl = await loadMapboxGL();
        if (destroyed || !containerRef.current) return;

        glRef.current = mapboxgl;
        if (hasMapboxToken()) {
          mapboxgl.accessToken = MAPBOX_TOKEN!;
        } else {
          mapboxgl.accessToken = "pk.eyJ1Ijoib3BlbnN0cmVldG1hcHMiLCJhIjoiY2x4b3BlbnN0cmVldG1hcHMiLCJ0IjowfQ.none";
        }

        const initialCenter: [number, number] =
          isValidCoord(initialLat, initialLng)
            ? [Number(initialLng), Number(initialLat)]
            : DEFAULT_CENTER;
        const initialZoom = isValidCoord(initialLat, initialLng)
          ? DEFAULT_ZOOM
          : 4;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: getMapStyle() as any,
          center: initialCenter,
          zoom: initialZoom,
          attributionControl: true,
        });

        map.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          "top-right",
        );

        map.on("load", () => {
          if (destroyed) return;
          setMapReady(true);
          setIsLoading(false);

          // Place initial marker if coords already provided
          if (isValidCoord(initialLat, initialLng)) {
            placeMarker(map, mapboxgl, Number(initialLng), Number(initialLat), true);
          }

          setTimeout(() => {
            if (!destroyed && mapRef.current) {
              mapRef.current.resize();
            }
          }, 100);
        });

        // Click-to-pin
        map.on("click", (e: any) => {
          if (destroyed) return;
          const { lng, lat } = e.lngLat;
          placeMarker(map, mapboxgl, lng, lat, true);
          handlePinDrop(lng, lat);
        });

        mapRef.current = map;
      } catch (err) {
        if (!destroyed) {
          setIsLoading(false);
          setLoadError(err instanceof Error ? err.message : "Unable to load map");
        }
      }
    })();

    return () => {
      destroyed = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  /** Place (or move) the draggable marker at [lng, lat]. */
  function placeMarker(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapboxgl: any,
    lng: number,
    lat: number,
    fly = false,
  ) {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      const marker = new mapboxgl.Marker({
        element: makePinEl(),
        draggable: true,
      })
        .setLngLat([lng, lat])
        .addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        if (pos) handlePinDrop(pos.lng, pos.lat);
      });

      markerRef.current = marker;
    }

    setIsPinned(true);

    if (fly && map) {
      map.flyTo({
        center: [lng, lat],
        zoom: Math.max(DEFAULT_ZOOM, map.getZoom() || DEFAULT_ZOOM),
        essential: true,
      });
    }
  }

  /** After a pin drop, reverse-geocode and notify parent. */
  async function handlePinDrop(lng: number, lat: number) {
    setReverseLoading(true);
    const result = await geocodeReverse(lng, lat);
    setReverseLoading(false);

    const locationResult: LocationResult = result ?? {
      placeName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
      city: "",
      state: "",
      country: "",
    };
    setSearch(locationResult.placeName);
    onLocationChange(locationResult);
  }

  /** Apply a suggestion from the forward-geocode dropdown. */
  function applySuggestion(s: LocationResult) {
    setSuggestions([]);
    setShowDropdown(false);
    setSearch(s.placeName);

    if (mapRef.current && glRef.current) {
      placeMarker(mapRef.current, glRef.current, s.lng, s.lat, true);
    }

    onLocationChange(s);
  }

  /** Remove the pin and reset. */
  function clearPin() {
    markerRef.current?.remove();
    markerRef.current = null;
    setIsPinned(false);
    setSearch("");
    setSuggestions([]);
    onClear();
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── Geocoding search bar ───────────────────────────────────────────── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!e.target.value) clearPin();
          }}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
          placeholder="Search location or address — e.g. Kottayam Kerala, Goa, Jaipur…"
          className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-9 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {loadingSug && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
            Searching…
          </span>
        )}
        {!loadingSug && search && (
          <button
            type="button"
            onMouseDown={clearPin}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear location"
          >
            <X className="size-4" />
          </button>
        )}

        {/* Suggestions dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-xl">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={() => applySuggestion(s)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                >
                  <MapPin className="size-3.5 shrink-0 text-accent" />
                  <span className="line-clamp-1">{s.placeName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Status & Hint chips ─────────────────────────────────────────────── */}
      {isPinned && !reverseLoading && (
        <p className="flex items-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0 text-accent" />
          <span className="flex-1 line-clamp-1">{search || "Location selected"}</span>
        </p>
      )}
      {reverseLoading && (
        <p className="flex items-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="size-3 animate-spin text-primary" /> Identifying location details…
        </p>
      )}
      {!isPinned && (
        <p className="text-xs text-muted-foreground">
          Search an address above or <strong>click anywhere on the map</strong> to drop a pin. Drag the pin to adjust.
        </p>
      )}

      {/* ── Map container ─────────────────────────────────────────────────── */}
      <div className="relative h-[280px] overflow-hidden rounded-3xl border border-border bg-card shadow-inner">
        <div ref={containerRef} className="size-full" />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/70 backdrop-blur-xs">
            <span className="text-xs font-medium text-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" /> Loading location map…
            </span>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/95 p-4 text-center">
            <AlertCircle className="size-6 text-destructive" />
            <p className="text-xs text-muted-foreground">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryCount((c) => c + 1)}
              className="text-xs mt-1"
            >
              <RefreshCw className="size-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
