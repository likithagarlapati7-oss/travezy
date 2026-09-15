import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPin, Navigation, Phone, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  getMapStyle,
  isValidCoord,
  loadMapboxGL,
} from "@/lib/mapbox";
import { type EmergencyPlace } from "@/lib/emergency.schema";
import { Button } from "@/components/ui/button";

type Props = {
  userLocation: { lat: number; lng: number } | null;
  places: EmergencyPlace[];
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: EmergencyPlace) => void;
  height?: string;
  className?: string;
};

function escHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createUserLocationMarkerEl(): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Your current location");
  el.style.cssText = [
    "width:22px",
    "height:22px",
    "background:#0284c7",
    "border:3px solid #ffffff",
    "border-radius:50%",
    "box-shadow:0 0 0 6px rgba(2,132,199,0.35), 0 3px 10px rgba(0,0,0,0.3)",
    "cursor:pointer",
  ].join(";");
  return el;
}

function createPlaceMarkerEl(category: string, isSelected: boolean): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", `${category} marker`);

  const bg =
    category === "hospital"
      ? "linear-gradient(135deg,#ef4444,#b91c1c)"
      : category === "police"
        ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
        : "linear-gradient(135deg,#10b981,#047857)";

  const size = isSelected ? 38 : 32;

  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    `background:${bg}`,
    "border:3px solid #ffffff",
    "border-radius:50%",
    "cursor:pointer",
    `box-shadow:${isSelected ? "0 0 0 4px #f59e0b, " : ""}0 3px 12px rgba(0,0,0,0.35)`,
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "transition:transform 0.15s ease",
  ].join(";");

  // Icon SVG
  if (category === "hospital") {
    // Red Cross icon
    el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/></svg>`;
  } else if (category === "police") {
    // Shield icon
    el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/></svg>`;
  } else {
    // Pharmacy Pill/Cross icon
    el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/></svg>`;
  }

  return el;
}

export function EmergencyMap({
  userLocation,
  places = [],
  selectedPlaceId,
  onSelectPlace,
  height = "h-[450px]",
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const validPlaces = places.filter((p) => isValidCoord(p.lat, p.lng));

  useEffect(() => {
    let unmounted = false;

    async function initMap() {
      if (!containerRef.current) return;
      setLoadState("loading");

      try {
        const mapboxgl = await loadMapboxGL();
        if (unmounted || !containerRef.current) return;

        // Default center
        const firstPlace = validPlaces[0];
        const initialCenter: [number, number] = userLocation
          ? [userLocation.lng, userLocation.lat]
          : firstPlace
            ? [firstPlace.lng, firstPlace.lat]
            : DEFAULT_CENTER;

        const mapStyle = getMapStyle();
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: (typeof mapStyle === "string" ? mapStyle : (mapStyle as any)) as string,
          center: initialCenter,
          zoom: userLocation ? 13 : DEFAULT_ZOOM,
          attributionControl: false,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          if (unmounted) return;
          mapRef.current = map;
          setLoadState("ready");
        });

        map.on("error", (e: any) => {
          if (!mapRef.current) {
            console.warn("[EmergencyMap] error:", e);
          }
        });
      } catch (err: any) {
        if (!unmounted) {
          setLoadState("error");
          setErrorMessage(err.message || "Failed to load map");
        }
      }
    }

    initMap();

    return () => {
      unmounted = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when places, userLocation, or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || loadState !== "ready") return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Add User Location Marker
    if (userLocation && isValidCoord(userLocation.lat, userLocation.lng)) {
      try {
        const userEl = createUserLocationMarkerEl();
        const userPopup = new (window as any).mapboxgl.Popup({ offset: 12 }).setHTML(
          `<div style="font-family:system-ui;padding:4px;font-size:12px;font-weight:600;color:#0284c7;">📍 You are here</div>`
        );

        const marker = new (window as any).mapboxgl.Marker({ element: userEl })
          .setLngLat([userLocation.lng, userLocation.lat])
          .setPopup(userPopup)
          .addTo(map);

        markersRef.current.push(marker);
      } catch (err) {
        console.warn("[EmergencyMap] user marker error:", err);
      }
    }

    // 2. Add Place Markers
    validPlaces.forEach((place) => {
      try {
        const isSelected = place.id === selectedPlaceId;
        const el = createPlaceMarkerEl(place.category, isSelected);

        const categoryLabel =
          place.category === "hospital"
            ? "🏥 Hospital / Medical"
            : place.category === "police"
              ? "👮 Police Station"
              : "💊 Pharmacy";

        const popupHtml = `
          <div style="font-family:system-ui;padding:6px;max-width:240px;color:#1e293b;">
            <span style="display:inline-block;font-size:10px;font-weight:700;text-transform:uppercase;color:#0284c7;letter-spacing:0.05em;margin-bottom:2px;">
              ${categoryLabel}
            </span>
            <p style="margin:0 0 3px 0;font-size:13px;font-weight:600;line-height:1.2;">
              ${escHtml(place.name)}
            </p>
            <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#f59e0b;">
              ${escHtml(place.formattedDistance)}
            </p>
            <p style="margin:0 0 8px 0;font-size:11px;color:#64748b;line-height:1.3;">
              ${escHtml(place.address)}
            </p>
            <div style="display:flex;gap:6px;align-items:center;">
              <a href="${place.directionsUrl}" target="_blank" rel="noopener noreferrer"
                 style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;background:#0284c7;color:#ffffff;padding:4px 8px;border-radius:6px;text-decoration:none;">
                Directions ↗
              </a>
              ${
                place.phone
                  ? `<a href="tel:${place.phone.replace(/\s/g, "")}" style="font-size:11px;color:#0284c7;text-decoration:none;font-weight:600;">Call: ${place.phone}</a>`
                  : ""
              }
            </div>
          </div>
        `;

        const popup = new (window as any).mapboxgl.Popup({ offset: 18 }).setHTML(popupHtml);

        const marker = new (window as any).mapboxgl.Marker({ element: el })
          .setLngLat([place.lng, place.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", () => {
          onSelectPlace?.(place);
        });

        markersRef.current.push(marker);
      } catch (err) {
        console.warn("[EmergencyMap] marker error:", err);
      }
    });

    // 3. Fit bounds to encompass user location and markers
    try {
      const allCoords: Array<[number, number]> = [];
      if (userLocation && isValidCoord(userLocation.lat, userLocation.lng)) {
        allCoords.push([userLocation.lng, userLocation.lat]);
      }
      validPlaces.forEach((p) => allCoords.push([p.lng, p.lat]));

      if (allCoords.length > 1) {
        const bounds = new (window as any).mapboxgl.LngLatBounds();
        allCoords.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
      } else if (allCoords.length === 1) {
        map.flyTo({ center: allCoords[0], zoom: 14, duration: 600 });
      }
    } catch {
      // Safe fallback
    }
  }, [places, userLocation, selectedPlaceId, loadState]);

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-border shadow-card bg-muted", height, className)}>
      <div ref={containerRef} className="size-full" />

      {loadState === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm z-10">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading interactive emergency map...</p>
        </div>
      )}

      {loadState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/95 p-6 text-center z-10">
          <AlertCircle className="size-8 text-destructive" />
          <h4 className="font-display text-base font-semibold">Map unavailable</h4>
          <p className="text-xs text-muted-foreground max-w-xs">{errorMessage}</p>
        </div>
      )}

      {/* Map Legend Overlay */}
      {loadState === "ready" && (
        <div className="absolute left-3 bottom-3 z-10 glass-panel rounded-2xl p-2.5 px-3 flex flex-wrap items-center gap-3 text-[11px] font-medium text-foreground shadow-sm">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#0284c7] ring-2 ring-white" /> You
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ef4444] ring-2 ring-white" /> Hospital
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#3b82f6] ring-2 ring-white" /> Police
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#10b981] ring-2 ring-white" /> Pharmacy
          </span>
        </div>
      )}
    </div>
  );
}
