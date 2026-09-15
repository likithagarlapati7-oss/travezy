import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPin, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  getMapStyle,
  hasMapboxToken,
  isValidCoord,
  loadMapboxGL,
  MAPBOX_TOKEN,
} from "@/lib/mapbox";
import { Button } from "@/components/ui/button";

// ── Types ────────────────────────────────────────────────────────────────────

export type MarkerCategory = "hotel" | "restaurant" | "experience" | "tour" | "guide" | string;

export type ServiceMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string | undefined;
  category?: MarkerCategory | undefined;
  serviceId?: string | undefined;
  guideId?: string | undefined;
  destinationSlug?: string | undefined;
  image_url?: string | undefined;
  rating?: number | undefined;
  review_count?: number | undefined;
  price?: number | undefined;
  currency?: string | undefined;
  price_unit?: string | undefined;
  distance_km?: number | string | undefined;
  languages?: string[] | undefined;
  available_today?: boolean | undefined;
};

type Props = {
  /** Array of markers to display. Only markers with valid coords are shown. */
  markers?: ServiceMarker[] | undefined;
  /** Map center [lng, lat]. Defaults to centre of India. */
  center?: [number, number] | undefined;
  zoom?: number | undefined;
  className?: string | undefined;
  /** Height class, e.g. "h-[450px]". Defaults to "h-[450px]". */
  height?: string | undefined;
  /** Optional callback when user clicks 'Book' on a popup card */
  onBookClick?: ((marker: ServiceMarker) => void) | undefined;
  /** Optional callback for "Search this area" */
  onSearchArea?: ((center: [number, number], zoom: number) => void) | undefined;
  /** Show the "Search this area" floating button */
  showSearchAreaButton?: boolean | undefined;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(s?: string | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCategoryConfig(category?: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("hotel") || cat.includes("stay") || cat.includes("resort") || cat.includes("homestay")) {
    return {
      name: "Hotel & Stay",
      color: "#2563eb", // blue-600
      bg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 22v-6.57a2 2 0 0 1 1.07-1.78l3.93-2.19V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v18Z"/><path d="M18 9h4v13h-4z"/></svg>`,
      emoji: "🏨",
    };
  }
  if (cat.includes("restaurant") || cat.includes("dining") || cat.includes("food") || cat.includes("culinary")) {
    return {
      name: "Restaurant",
      color: "#d97706", // amber-600
      bg: "linear-gradient(135deg, #f59e0b, #d97706)",
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 11v11"/><path d="M5 2v14a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2"/><path d="M8 7V2"/></svg>`,
      emoji: "🍽️",
    };
  }
  if (cat.includes("guide")) {
    return {
      name: "Human Guide",
      color: "#9333ea", // purple-600
      bg: "linear-gradient(135deg, #a855f7, #7e22ce)",
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      emoji: "👨‍🏫",
    };
  }
  // Default: Experience / Tour
  return {
    name: "Experience",
    color: "#059669", // emerald-600
    bg: "linear-gradient(135deg, #10b981, #047857)",
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    emoji: "🎒",
  };
}

function createMarkerElement(marker: ServiceMarker): HTMLElement {
  const cfg = getCategoryConfig(marker.category);
  const el = document.createElement("div");
  el.className = "travezy-map-pin";
  el.setAttribute("aria-label", `${marker.title} (${cfg.name})`);
  el.style.cssText = [
    "width:36px",
    "height:36px",
    `background:${cfg.bg}`,
    "border:2.5px solid #ffffff",
    "border-radius:50%",
    "cursor:pointer",
    "box-shadow:0 4px 14px rgba(0,0,0,0.35)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "transition:transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
    "z-index:10",
  ].join(";");

  el.innerHTML = cfg.icon;

  el.addEventListener("mouseenter", () => {
    el.style.transform = "scale(1.22) translateY(-4px)";
    el.style.zIndex = "50";
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "scale(1) translateY(0)";
    el.style.zIndex = "10";
  });

  return el;
}

function buildPopupHtml(marker: ServiceMarker): string {
  const cfg = getCategoryConfig(marker.category);
  const imageTag = marker.image_url
    ? `<div style="position:relative;width:100%;height:110px;overflow:hidden;border-radius:10px 10px 0 0;background:#e2e8f0">
        <img src="${escHtml(marker.image_url)}" alt="${escHtml(marker.title)}" style="width:100%;height:100%;object-fit:cover" />
        <div style="position:absolute;top:6px;left:6px;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);color:#ffffff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:9999px;display:flex;align-items:center;gap:4px">
          <span>${cfg.emoji}</span> <span>${cfg.name}</span>
        </div>
      </div>`
    : `<div style="background:${cfg.bg};height:36px;border-radius:10px 10px 0 0;padding:8px 12px;color:white;font-weight:700;font-size:11px;display:flex;align-items:center;gap:5px">
        <span>${cfg.emoji}</span> <span>${cfg.name}</span>
      </div>`;

  const ratingHtml = marker.rating
    ? `<div style="display:flex;align-items:center;gap:3px;font-size:12px;font-weight:700;color:#0f172a">
        <span style="color:#eab308">★</span> ${marker.rating.toFixed(1)}
        ${marker.review_count ? `<span style="font-size:10px;color:#64748b;font-weight:400">(${marker.review_count})</span>` : ""}
      </div>`
    : "";

  const distanceHtml = marker.distance_km !== undefined && marker.distance_km !== null
    ? `<div style="font-size:11px;color:#0284c7;font-weight:600;display:flex;align-items:center;gap:3px">
        📍 ${typeof marker.distance_km === "number" ? `${marker.distance_km.toFixed(1)} km away` : marker.distance_km}
      </div>`
    : marker.subtitle
      ? `<div style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          📍 ${escHtml(marker.subtitle)}
        </div>`
      : "";

  const priceHtml = marker.price !== undefined && marker.price !== null
    ? `<div style="font-size:13px;font-weight:800;color:#0f172a">
        ₹${Number(marker.price).toLocaleString("en-IN")}
        <span style="font-size:10px;font-weight:500;color:#64748b">${escHtml(marker.price_unit || (marker.category === "guide" ? "/ hr" : marker.category === "hotel" ? "/ night" : "/ person"))}</span>
      </div>`
    : "";

  const viewUrl = marker.guideId
    ? `/guides/${marker.guideId}`
    : marker.serviceId
      ? `/services/${marker.serviceId}`
      : marker.destinationSlug
        ? `/destinations/${marker.destinationSlug}`
        : "#";

  return `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;width:240px;padding:0;margin:0;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.15)">
      ${imageTag}
      <div style="padding:10px 12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          ${ratingHtml}
          ${distanceHtml}
        </div>
        
        <h4 style="font-weight:700;font-size:13px;line-height:1.3;color:#0f172a;margin:0 0 6px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
          ${escHtml(marker.title)}
        </h4>

        ${priceHtml ? `<div style="margin-bottom:10px">${priceHtml}</div>` : `<div style="margin-bottom:8px"></div>`}

        <div style="display:flex;align-items:center;gap:6px;padding-top:8px;border-top:1px solid #f1f5f9">
          <a href="${viewUrl}" style="flex:1;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;color:#0f172a;font-size:11px;font-weight:600;padding:6px 8px;border-radius:8px;text-decoration:none;transition:background 0.15s ease">
            View Details
          </a>
          <button type="button" data-book-marker-id="${escHtml(marker.id)}" style="flex:1;background:#0284c7;color:#ffffff;border:none;font-size:11px;font-weight:700;padding:7px 8px;border-radius:8px;cursor:pointer;transition:background 0.15s ease">
            Book
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Component ────────────────────────────────────────────────────────────────

export function MapboxMap({
  markers = [],
  center,
  zoom = DEFAULT_ZOOM,
  className,
  height = "h-[450px]",
  onBookClick,
  onSearchArea,
  showSearchAreaButton = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [mapMoved, setMapMoved] = useState(false);

  // ── Global click listener for Popup Book buttons ───────────────────────────
  useEffect(() => {
    const handlePopupClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const bookBtn = target.closest("[data-book-marker-id]");
      if (bookBtn) {
        const markerId = bookBtn.getAttribute("data-book-marker-id");
        const found = markers.find((m) => String(m.id) === String(markerId));
        if (found) {
          if (onBookClick) {
            onBookClick(found);
          } else {
            // Default action: navigate to details or book
            const url = found.guideId
              ? `/guides/${found.guideId}`
              : found.serviceId
                ? `/services/${found.serviceId}`
                : found.destinationSlug
                  ? `/destinations/${found.destinationSlug}`
                  : null;
            if (url) {
              window.location.href = url;
            }
          }
        }
      }
    };

    document.addEventListener("click", handlePopupClick);
    return () => document.removeEventListener("click", handlePopupClick);
  }, [markers, onBookClick]);

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
          // Open layer fallback
          mapboxgl.accessToken = "pk.eyJ1Ijoib3BlbnN0cmVldG1hcHMiLCJhIjoiY2x4b3BlbnN0cmVldG1hcHMiLCJ0IjowfQ.none";
        }

        const validMarkers = markers.filter((m) => isValidCoord(m.lat, m.lng));
        const initialCenter: [number, number] =
          center ??
          (validMarkers.length === 1
            ? [validMarkers[0]!.lng, validMarkers[0]!.lat]
            : DEFAULT_CENTER);

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: getMapStyle() as any,
          center: initialCenter,
          zoom: validMarkers.length === 1 ? zoom : DEFAULT_ZOOM,
          attributionControl: true,
        });

        map.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          "top-right"
        );

        map.on("load", () => {
          if (!destroyed) {
            setMapReady(true);
            setIsLoading(false);
            setTimeout(() => {
              if (!destroyed && mapRef.current) {
                mapRef.current.resize();
              }
            }, 100);
          }
        });

        map.on("moveend", () => {
          if (!destroyed && mapReady) {
            setMapMoved(true);
          }
        });

        map.on("error", (e: any) => {
          console.warn("Mapbox warning/error:", e?.error?.message || e);
        });

        mapRef.current = map;
      } catch (err) {
        if (!destroyed) {
          setIsLoading(false);
          setLoadError(
            err instanceof Error ? err.message : "Unable to load the map. Please try again."
          );
        }
      }
    })();

    return () => {
      destroyed = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  // ── Fly to new center when prop changes ────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !center) return;
    mapRef.current.flyTo({ center, zoom, essential: true });
    setMapMoved(false);
  }, [center, zoom, mapReady]);

  // ── Sync markers whenever the markers prop changes ─────────────────────────
  useEffect(() => {
    if (!mapReady || !glRef.current || !mapRef.current) return;

    const mapboxgl = glRef.current;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const valid = markers.filter((m) => isValidCoord(m.lat, m.lng));

    valid.forEach((marker) => {
      const popup = new mapboxgl.Popup({
        offset: 24,
        maxWidth: "280px",
        className: "travezy-custom-popup",
        closeButton: true,
        closeOnClick: true,
      }).setHTML(buildPopupHtml(marker));

      const markerElement = createMarkerElement(marker);

      const m = new mapboxgl.Marker({ element: markerElement })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(popup)
        .addTo(mapRef.current);

      markersRef.current.push(m);
    });

    // Fit bounds around all markers
    if (valid.length > 1 && !center) {
      const bounds = new mapboxgl.LngLatBounds();
      valid.forEach((m) => bounds.extend([m.lng, m.lat]));
      mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    } else if (valid.length === 1 && !center) {
      const m = valid[0]!;
      mapRef.current.flyTo({
        center: [m.lng, m.lat],
        zoom: Math.max(DEFAULT_ZOOM, zoom),
        essential: true,
      });
    }
  }, [markers, mapReady, zoom, center]);

  const handleSearchThisArea = () => {
    if (!mapRef.current) return;
    const currentCenter = mapRef.current.getCenter();
    const currentZoom = mapRef.current.getZoom();
    setMapMoved(false);
    if (onSearchArea) {
      onSearchArea([currentCenter.lng, currentCenter.lat], currentZoom);
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-card shadow-card min-h-[300px]",
        height,
        className
      )}
    >
      <div ref={containerRef} className="size-full" />

      {/* Floating "Search this area" button */}
      {showSearchAreaButton && mapMoved && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
          <Button
            size="sm"
            onClick={handleSearchThisArea}
            className="rounded-full shadow-lg text-xs font-semibold gap-1.5 px-4 bg-background text-foreground hover:bg-muted border border-border"
          >
            <Search className="size-3.5 text-primary" /> Search this area
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted/70 backdrop-blur-xs">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Loading interactive map…</p>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-card/95 p-6 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <div className="space-y-1 max-w-sm">
            <p className="text-sm font-semibold text-foreground">Unable to load the map</p>
            <p className="text-xs text-muted-foreground">{loadError}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetryCount((c) => c + 1)}
            className="flex items-center gap-1.5 text-xs mt-2"
          >
            <RefreshCw className="size-3.5" /> Retry
          </Button>
        </div>
      )}
    </div>
  );
}
