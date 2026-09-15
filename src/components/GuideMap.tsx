import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPin, RefreshCw, User, Star } from "lucide-react";
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
import type { GuideWithDistance } from "@/lib/guides";

interface GuideMapProps {
  guides: GuideWithDistance[];
  userLocation?: { lat: number; lng: number } | null | undefined;
  center?: [number, number] | undefined;
  zoom?: number | undefined;
  className?: string | undefined;
  height?: string | undefined;
  onGuideSelect?: ((guide: GuideWithDistance) => void) | undefined;
}

function escHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createUserMarkerEl(): HTMLElement {
  const el = document.createElement("div");
  el.className = "user-gps-marker";
  el.innerHTML = `
    <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:#38bdf8;opacity:0.6;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
      <div style="width:14px;height:14px;border-radius:50%;background:#0284c7;border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
    </div>
  `;
  return el;
}

function createGuideMarkerEl(guide: GuideWithDistance): HTMLElement {
  const el = document.createElement("div");
  el.className = "guide-map-marker";
  el.style.cssText = [
    "cursor:pointer",
    "position:relative",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "transition:transform 0.2s ease",
  ].join(";");

  el.innerHTML = `
    <div style="background:#ffffff;padding:2px 6px 2px 3px;border-radius:9999px;display:flex;align-items:center;gap:4px;box-shadow:0 4px 12px rgba(0,0,0,0.25);border:1.5px solid #0284c7">
      <img src="${escHtml(guide.profile_image)}" style="width:24px;height:24px;border-radius:50%;object-fit:cover" />
      <span style="font-size:11px;font-weight:700;color:#0f172a">⭐ ${guide.rating.toFixed(1)}</span>
    </div>
    <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #0284c7"></div>
  `;
  return el;
}

export function GuideMap({
  guides = [],
  userLocation,
  center,
  zoom = 12,
  className,
  height = "h-[460px]",
  onGuideSelect,
}: GuideMapProps) {
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

  // Initialize Mapbox
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
          center ??
          (userLocation
            ? [userLocation.lng, userLocation.lat]
            : guides.length > 0
              ? [guides[0]!.longitude, guides[0]!.latitude]
              : DEFAULT_CENTER);

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: getMapStyle() as any,
          center: initialCenter,
          zoom: userLocation || guides.length === 1 ? zoom : 6,
          attributionControl: true,
        });

        map.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          "top-right",
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

        map.on("error", (e: any) => {
          console.warn("GuideMap warning/error:", e?.error?.message || e);
        });

        mapRef.current = map;
      } catch (err) {
        if (!destroyed) {
          setIsLoading(false);
          setLoadError(
            err instanceof Error ? err.message : "Unable to load guide map.",
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

  // Sync Markers (User Location + Guides)
  useEffect(() => {
    if (!mapReady || !glRef.current || !mapRef.current) return;

    const mapboxgl = glRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;

    // 1. Add User Location Marker
    if (userLocation && isValidCoord(userLocation.lat, userLocation.lng)) {
      const userPopup = new mapboxgl.Popup({ offset: 15 }).setHTML(`
        <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px 2px;text-align:center">
          <p style="font-weight:700;margin:0;font-size:12px;color:#0284c7">📍 Your Current Location</p>
        </div>
      `);

      const userMarker = new mapboxgl.Marker({ element: createUserMarkerEl() })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(userPopup)
        .addTo(mapRef.current);

      markersRef.current.push(userMarker);
      bounds.extend([userLocation.lng, userLocation.lat]);
      hasCoords = true;
    }

    // 2. Add Guide Markers
    guides.forEach((guide) => {
      if (!isValidCoord(guide.latitude, guide.longitude)) return;

      const popupHtml = `
        <div style="font-family:system-ui,-apple-system,sans-serif;padding:6px;min-width:180px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <img src="${escHtml(guide.profile_image)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" />
            <div>
              <p style="font-weight:700;margin:0;font-size:13px;color:#0f172a">${escHtml(guide.name)}</p>
              <p style="margin:0;font-size:11px;color:#64748b">⭐ ${guide.rating.toFixed(1)} (${guide.review_count} reviews)</p>
            </div>
          </div>
          <p style="font-size:11px;color:#475569;margin:0 0 6px">📍 ${escHtml(guide.city)}, ${escHtml(guide.state)} ${guide.distanceKm != null ? `• <b>${guide.distanceKm} km</b>` : ""}</p>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:11px;font-weight:700;color:#0284c7">₹${guide.half_day_rate.toLocaleString()} / half-day</span>
            <span style="font-size:10px;color:#64748b">${guide.experience_years} yrs exp</span>
          </div>
          <a href="/guides/${guide.id}" style="display:block;text-align:center;background:#0284c7;color:#ffffff;padding:5px 8px;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none">View Profile & Book →</a>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 20, maxWidth: "260px" }).setHTML(popupHtml);

      const m = new mapboxgl.Marker({ element: createGuideMarkerEl(guide) })
        .setLngLat([guide.longitude, guide.latitude])
        .setPopup(popup)
        .addTo(mapRef.current);

      markersRef.current.push(m);
      bounds.extend([guide.longitude, guide.latitude]);
      hasCoords = true;
    });

    // Fit map view if multiple points
    if (hasCoords) {
      if (markersRef.current.length > 1) {
        mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      } else if (center) {
        mapRef.current.flyTo({ center, zoom, essential: true });
      }
    }
  }, [guides, userLocation, mapReady, center, zoom]);

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-border bg-card shadow-card", height, className)}>
      <div ref={containerRef} className="size-full" />

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted/70 backdrop-blur-xs">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Locating nearby human guides…</p>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-card/95 p-6 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <div className="space-y-1 max-w-sm">
            <p className="text-sm font-semibold text-foreground">Map Error</p>
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
