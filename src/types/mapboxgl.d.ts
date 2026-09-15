/**
 * Global type declaration for Mapbox GL JS loaded via CDN script tag.
 *
 * Mapbox GL is intentionally NOT imported as an npm package in this project —
 * it is loaded at runtime from the Mapbox CDN inside useEffect() so it never
 * runs on the server (SSR-safe).  The `loadMapboxGL()` helper in
 * `src/lib/mapbox.ts` resolves the module via `window.mapboxgl` once the
 * script tag fires its `onload` callback.
 *
 * This file tells TypeScript about the shape of that global so all callers
 * can reference it without `// eslint-disable-next-line` suppressions.
 */

// ── Minimal surface we actually use ──────────────────────────────────────────
// We only declare the subset of the mapboxgl API that our components touch.
// Keeping it narrow avoids version-drift drift between declaration and runtime.

interface MapboxGLMap {
  addControl(control: unknown, position?: string): this;
  on(event: string, handler: (...args: unknown[]) => void): this;
  off(event: string, handler: (...args: unknown[]) => void): this;
  flyTo(options: { center: [number, number]; zoom?: number; essential?: boolean }): this;
  fitBounds(
    bounds: unknown,
    options?: { padding?: number; maxZoom?: number },
  ): this;
  getCanvas(): HTMLCanvasElement;
  remove(): void;
}

interface MapboxGLMarker {
  setLngLat(lngLat: [number, number]): this;
  setPopup(popup: MapboxGLPopup): this;
  addTo(map: MapboxGLMap): this;
  getLngLat(): { lng: number; lat: number };
  remove(): void;
  getElement(): HTMLElement;
  isDraggable(): boolean;
}

interface MapboxGLPopup {
  setHTML(html: string): this;
  remove(): void;
}

interface MapboxGLLngLatBounds {
  extend(lngLat: [number, number]): this;
}

interface MapboxGLNamespace {
  accessToken: string;
  Map: new (options: {
    container: HTMLElement;
    style: string;
    center: [number, number];
    zoom: number;
    attributionControl?: boolean;
    locale?: Record<string, string>;
  }) => MapboxGLMap;
  Marker: new (options?: {
    element?: HTMLElement;
    draggable?: boolean;
    color?: string;
  }) => MapboxGLMarker;
  Popup: new (options?: { offset?: number; maxWidth?: string }) => MapboxGLPopup;
  NavigationControl: new (options?: { showCompass?: boolean }) => unknown;
  LngLatBounds: new () => MapboxGLLngLatBounds;
}

declare global {
  interface Window {
    mapboxgl: MapboxGLNamespace;
  }
}

export {};
