import { useState, useEffect, useCallback } from "react";
import type { UserInterests } from "@/lib/recommendations";
import type { ServiceWithProvider } from "@/lib/travezy";

const STORAGE_KEY = "travezy_user_interests";

const DEFAULT_INTERESTS: UserInterests = {
  destinations: [],
  categories: [],
  viewedIds: [],
  bookedIds: [],
};

export function useUserInterests() {
  const [interests, setInterests] = useState<UserInterests>(() => {
    if (typeof window === "undefined") return DEFAULT_INTERESTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_INTERESTS;
    } catch {
      return DEFAULT_INTERESTS;
    }
  });

  // Keep in sync with local storage
  const saveInterests = useCallback((updated: UserInterests) => {
    setInterests(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn("[useUserInterests save failed]", err);
      }
    }
  }, []);

  /**
   * Tracks a viewed service, capturing its destination and category to enhance recommendations.
   */
  const trackServiceView = useCallback(
    (service: ServiceWithProvider | null | undefined) => {
      if (!service || !service.id) return;

      const dest = service.city || service.destination || service.state;
      const cat = service.category;

      setInterests((prev) => {
        const destinations = prev.destinations || [];
        const categories = prev.categories || [];
        const viewedIds = prev.viewedIds || [];

        const newDestinations = dest && !destinations.includes(dest)
          ? [dest, ...destinations].slice(0, 8)
          : destinations;

        const newCategories = cat && !categories.includes(cat)
          ? [cat, ...categories].slice(0, 6)
          : categories;

        const newViewedIds = [service.id, ...viewedIds.filter((id) => id !== service.id)].slice(0, 20);

        const updated: UserInterests = {
          ...prev,
          destinations: newDestinations,
          categories: newCategories,
          viewedIds: newViewedIds,
        };

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch {}
        }

        return updated;
      });
    },
    []
  );

  /**
   * Tracks a confirmed booking to avoid over-recommending the exact same service and suggest complementary activities.
   */
  const trackBooking = useCallback(
    (serviceId: string, destination?: string) => {
      setInterests((prev) => {
        const bookedIds = prev.bookedIds || [];
        const destinations = prev.destinations || [];

        const updated: UserInterests = {
          ...prev,
          bookedIds: [serviceId, ...bookedIds.filter((id) => id !== serviceId)].slice(0, 20),
          destinations: destination && !destinations.includes(destination)
            ? [destination, ...destinations].slice(0, 8)
            : destinations,
        };

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch {}
        }

        return updated;
      });
    },
    []
  );

  return {
    interests,
    trackServiceView,
    trackBooking,
    clearInterests: () => saveInterests(DEFAULT_INTERESTS),
  };
}
