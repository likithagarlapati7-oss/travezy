import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  type WishlistItem,
  type WishlistItemType,
  fetchUserWishlist,
  addToWishlist,
  removeFromWishlist,
  getLocalWishlist,
  groupWishlistByDestination,
} from "@/lib/wishlist";

const WISHLIST_CHANGE_EVENT = "travezy_wishlist_updated";

export function useWishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>(() => getLocalWishlist());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchUserWishlist(user?.id);
      setItems(res);
    } catch (err) {
      console.warn("Error loading wishlist:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();

    const handleCustomEvent = () => {
      setItems(getLocalWishlist());
    };

    window.addEventListener(WISHLIST_CHANGE_EVENT, handleCustomEvent);
    window.addEventListener("storage", handleCustomEvent);

    return () => {
      window.removeEventListener(WISHLIST_CHANGE_EVENT, handleCustomEvent);
      window.removeEventListener("storage", handleCustomEvent);
    };
  }, [loadData]);

  const notifyChange = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(WISHLIST_CHANGE_EVENT));
    }
  };

  const isSaved = useCallback(
    (type: WishlistItemType, id: string): boolean => {
      return items.some(
        (i) => i.item_type === type && String(i.item_id) === String(id)
      );
    },
    [items]
  );

  const toggleSave = useCallback(
    async (
      item: Omit<WishlistItem, "id" | "created_at">,
      showToast: boolean = true
    ): Promise<boolean> => {
      const alreadySaved = isSaved(item.item_type, item.item_id);

      if (alreadySaved) {
        // Optimistic UI
        const updated = items.filter(
          (i) => !(i.item_type === item.item_type && String(i.item_id) === String(item.item_id))
        );
        setItems(updated);
        await removeFromWishlist(item.item_type, item.item_id, user?.id);
        notifyChange();
        if (showToast) {
          toast.info(`Removed "${item.item_title}" from your wishlist`);
        }
        return false;
      } else {
        // Optimistic UI
        const newItem: WishlistItem = {
          ...item,
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        setItems((prev) => [newItem, ...prev]);
        const res = await addToWishlist(item, user?.id);
        notifyChange();
        if (showToast) {
          toast.success(`Saved "${item.item_title}" to your wishlist ❤️`, {
            description: `${item.destination || item.city || "Travezy"} • ${item.item_type.toUpperCase()}`,
          });
        }
        return true;
      }
    },
    [isSaved, items, user?.id]
  );

  const removeSave = useCallback(
    async (type: WishlistItemType, id: string, title?: string) => {
      const updated = items.filter(
        (i) => !(i.item_type === type && String(i.item_id) === String(id))
      );
      setItems(updated);
      await removeFromWishlist(type, id, user?.id);
      notifyChange();
      if (title) {
        toast.info(`Removed "${title}" from wishlist`);
      }
    },
    [items, user?.id]
  );

  const counts = useMemo(() => {
    return {
      total: items.length,
      hotels: items.filter((i) => i.item_type === "hotel").length,
      restaurants: items.filter((i) => i.item_type === "restaurant").length,
      experiences: items.filter((i) => i.item_type === "experience" || i.item_type === "tour").length,
      guides: items.filter((i) => i.item_type === "guide").length,
      destinations: items.filter((i) => i.item_type === "destination").length,
    };
  }, [items]);

  const grouped = useMemo(() => {
    return groupWishlistByDestination(items);
  }, [items]);

  return {
    items,
    isLoading,
    isSaved,
    toggleSave,
    removeSave,
    counts,
    groupedByDestination: grouped,
    refreshWishlist: loadData,
  };
}
