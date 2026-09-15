import { useState, useEffect, useCallback } from "react";
import { geocodeReverse, KNOWN_DESTINATION_COORDS } from "@/lib/mapbox";

export interface GeoLocationState {
  coords: { lat: number; lng: number } | null;
  locationName: string;
  loading: boolean;
  permissionStatus: "prompt" | "granted" | "denied" | "unavailable";
  errorMessage: string | null;
}

export const PRESET_LOCATIONS: Array<{
  name: string;
  state: string;
  lat: number;
  lng: number;
}> = [
  { name: "Kochi", state: "Kerala", lat: 9.9658, lng: 76.2421 },
  { name: "Munnar", state: "Kerala", lat: 10.0889, lng: 77.0595 },
  { name: "Alleppey", state: "Kerala", lat: 9.4981, lng: 76.3388 },
  { name: "Calangute", state: "Goa", lat: 15.5439, lng: 73.7628 },
  { name: "Panaji", state: "Goa", lat: 15.4909, lng: 73.8278 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { name: "Udaipur", state: "Rajasthan", lat: 24.5854, lng: 73.7125 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9431, lng: 77.5721 },
  { name: "Mumbai", state: "Maharashtra", lat: 18.9288, lng: 72.8331 },
  { name: "New Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739 },
  { name: "Manali", state: "Himachal Pradesh", lat: 32.2432, lng: 77.1892 },
  { name: "Rishikesh", state: "Uttarakhand", lat: 30.0869, lng: 78.2676 },
  { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.7126, lng: 83.3031 },
];

export function useGeolocation(autoRequest: boolean = true) {
  const [state, setState] = useState<GeoLocationState>({
    coords: null,
    locationName: "Detecting location...",
    loading: true,
    permissionStatus: "prompt",
    errorMessage: null,
  });

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({
        coords: null,
        locationName: "Location not supported",
        loading: false,
        permissionStatus: "unavailable",
        errorMessage: "Geolocation is not supported by your browser.",
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, errorMessage: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const rev = await geocodeReverse(lng, lat);
          const name = rev?.city
            ? `${rev.city}${rev.state ? `, ${rev.state}` : ""}`
            : rev?.placeName || `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`;

          setState({
            coords: { lat, lng },
            locationName: name,
            loading: false,
            permissionStatus: "granted",
            errorMessage: null,
          });
        } catch {
          setState({
            coords: { lat, lng },
            locationName: `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`,
            loading: false,
            permissionStatus: "granted",
            errorMessage: null,
          });
        }
      },
      (error) => {
        let msg = "Location access was denied or is unavailable.";
        let perm: "denied" | "unavailable" = "denied";

        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location access was denied. You can select your city manually below.";
          perm = "denied";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Position unavailable. Please choose your location manually.";
          perm = "unavailable";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please choose manually.";
          perm = "unavailable";
        }

        // Set default fallback (Kochi, Kerala)
        setState({
          coords: null,
          locationName: "Location access unavailable",
          loading: false,
          permissionStatus: perm,
          errorMessage: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  }, []);

  const setManualLocation = useCallback((coords: { lat: number; lng: number }, name: string) => {
    setState({
      coords,
      locationName: name,
      loading: false,
      permissionStatus: "granted",
      errorMessage: null,
    });
  }, []);

  useEffect(() => {
    if (autoRequest) {
      requestLocation();
    }
  }, [autoRequest, requestLocation]);

  return {
    ...state,
    requestLocation,
    setManualLocation,
    presetLocations: PRESET_LOCATIONS,
  };
}
