import { supabase } from "@/integrations/supabase/client";

export type WishlistItemType =
  | "destination"
  | "hotel"
  | "restaurant"
  | "experience"
  | "tour"
  | "guide";

export interface WishlistItem {
  id?: string;
  user_id?: string;
  item_type: WishlistItemType;
  item_id: string;
  item_title: string;
  item_image?: string | null;
  item_category?: string | null;
  destination?: string | null;
  city?: string | null;
  state?: string | null;
  price?: number | null;
  currency?: string;
  rating?: number | null;
  review_count?: number | null;
  metadata?: Record<string, any>;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = "travezy_wishlist_items_v2";

/**
 * Reads locally cached wishlist items from localStorage (instant fallback & offline support)
 */
export function getLocalWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Saves wishlist items to localStorage
 */
export function setLocalWishlist(items: WishlistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Fetches user wishlist from Supabase with fallback to local cache
 */
export async function fetchUserWishlist(userId?: string | null): Promise<WishlistItem[]> {
  const localItems = getLocalWishlist();

  if (!userId) {
    return localItems;
  }

  try {
    const { data, error } = await supabase
      .from("wishlists" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return localItems;
    }

    const fetched: WishlistItem[] = (data as any[]).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      item_type: row.item_type,
      item_id: row.item_id,
      item_title: row.item_title,
      item_image: row.item_image,
      item_category: row.item_category,
      destination: row.destination,
      city: row.city,
      state: row.state,
      price: row.price ? Number(row.price) : null,
      currency: row.currency || "INR",
      rating: row.rating ? Number(row.rating) : null,
      review_count: row.review_count ? Number(row.review_count) : 0,
      metadata: row.metadata || {},
      created_at: row.created_at,
    }));

    // Merge any offline local items for this user
    setLocalWishlist(fetched);
    return fetched;
  } catch (err) {
    console.warn("Could not fetch remote wishlist:", err);
    return localItems;
  }
}

/**
 * Adds an item to the wishlist (database + local cache)
 */
export async function addToWishlist(
  item: Omit<WishlistItem, "id" | "created_at">,
  userId?: string | null
): Promise<{ success: boolean; isDuplicate?: boolean; item?: WishlistItem }> {
  const current = getLocalWishlist();
  const existsLocally = current.some(
    (w) => w.item_type === item.item_type && String(w.item_id) === String(item.item_id)
  );

  const newItem: WishlistItem = {
    ...item,
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };

  if (!existsLocally) {
    const updated = [newItem, ...current];
    setLocalWishlist(updated);
  }

  if (userId) {
    try {
      const { data, error } = await supabase
        .from("wishlists" as any)
        .insert({
          user_id: userId,
          item_type: item.item_type,
          item_id: String(item.item_id),
          item_title: item.item_title,
          item_image: item.item_image || null,
          item_category: item.item_category || null,
          destination: item.destination || null,
          city: item.city || null,
          state: item.state || null,
          price: item.price !== undefined && item.price !== null ? Number(item.price) : null,
          currency: item.currency || "INR",
          rating: item.rating !== undefined && item.rating !== null ? Number(item.rating) : null,
          review_count: item.review_count || 0,
          metadata: item.metadata || {},
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation = already saved
          return { success: true, isDuplicate: true };
        }
        console.warn("Database wishlist save warning:", error.message);
      } else if (data) {
        newItem.id = (data as any).id;
      }
    } catch (err) {
      console.warn("Wishlist Supabase insert error:", err);
    }
  }

  return { success: true, isDuplicate: existsLocally, item: newItem };
}

/**
 * Removes an item from the wishlist
 */
export async function removeFromWishlist(
  itemType: WishlistItemType,
  itemId: string,
  userId?: string | null
): Promise<{ success: boolean }> {
  const current = getLocalWishlist();
  const filtered = current.filter(
    (w) => !(w.item_type === itemType && String(w.item_id) === String(itemId))
  );
  setLocalWishlist(filtered);

  if (userId) {
    try {
      await supabase
        .from("wishlists" as any)
        .delete()
        .eq("user_id", userId)
        .eq("item_type", itemType)
        .eq("item_id", String(itemId));
    } catch (err) {
      console.warn("Wishlist Supabase delete error:", err);
    }
  }

  return { success: true };
}

/**
 * Groups a list of wishlist items by destination name
 */
export function groupWishlistByDestination(items: WishlistItem[]): Record<string, {
  destination: string;
  hotels: WishlistItem[];
  restaurants: WishlistItem[];
  experiences: WishlistItem[];
  guides: WishlistItem[];
  destinations: WishlistItem[];
  totalCount: number;
}> {
  const groups: Record<string, {
    destination: string;
    hotels: WishlistItem[];
    restaurants: WishlistItem[];
    experiences: WishlistItem[];
    guides: WishlistItem[];
    destinations: WishlistItem[];
    totalCount: number;
  }> = {};

  for (const item of items) {
    const destName = item.destination || item.state || item.city || "All India";
    if (!groups[destName]) {
      groups[destName] = {
        destination: destName,
        hotels: [],
        restaurants: [],
        experiences: [],
        guides: [],
        destinations: [],
        totalCount: 0,
      };
    }

    groups[destName].totalCount += 1;

    switch (item.item_type) {
      case "hotel":
        groups[destName].hotels.push(item);
        break;
      case "restaurant":
        groups[destName].restaurants.push(item);
        break;
      case "experience":
      case "tour":
        groups[destName].experiences.push(item);
        break;
      case "guide":
        groups[destName].guides.push(item);
        break;
      case "destination":
        groups[destName].destinations.push(item);
        break;
    }
  }

  return groups;
}
