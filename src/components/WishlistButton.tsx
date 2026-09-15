import React, { useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { type WishlistItemType } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  item: {
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
  };
  variant?: "icon" | "button" | "pill" | "hero";
  className?: string;
  showText?: boolean;
}

export function WishlistButton({
  item,
  variant = "icon",
  className,
  showText = false,
}: WishlistButtonProps) {
  const { isSaved, toggleSave } = useWishlist();
  const saved = isSaved(item.item_type, item.item_id);
  const [animating, setAnimating] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);
    await toggleSave(item);
  };

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        className={cn(
          "group inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 backdrop-blur-md border shadow-sm",
          saved
            ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
            : "bg-background/40 hover:bg-background/60 text-foreground border-white/20 hover:border-white/40",
          animating && "scale-110",
          className
        )}
      >
        <Heart
          className={cn(
            "size-4 transition-transform group-hover:scale-110",
            saved
              ? "fill-rose-500 text-rose-500 stroke-rose-500"
              : "stroke-current fill-transparent"
          )}
        />
        <span>{saved ? "♥ Saved" : "♡ Save"}</span>
      </button>
    );
  }

  if (variant === "pill" || showText) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        className={cn(
          "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border shadow-xs",
          saved
            ? "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-500/20"
            : "bg-muted/80 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
          animating && "scale-110",
          className
        )}
      >
        <Heart
          className={cn(
            "size-3.5 transition-transform group-hover:scale-110",
            saved
              ? "fill-rose-500 text-rose-500 stroke-rose-500"
              : "stroke-current fill-transparent"
          )}
        />
        <span>{saved ? "♥ Saved" : "♡ Save"}</span>
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        className={cn(
          "group inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border",
          saved
            ? "bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-900/60"
            : "bg-background hover:bg-muted text-foreground border-border",
          animating && "scale-105",
          className
        )}
      >
        <Heart
          className={cn(
            "size-4 transition-transform group-hover:scale-110",
            saved
              ? "fill-rose-500 text-rose-500 stroke-rose-500"
              : "stroke-current fill-transparent"
          )}
        />
        <span>{saved ? "♥ Saved" : "♡ Save"}</span>
      </button>
    );
  }

  // Default: icon overlay (for image cards)
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={cn(
        "group relative flex size-8 sm:size-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 shadow-md",
        saved
          ? "bg-rose-500 text-white shadow-rose-500/30 hover:bg-rose-600 scale-105"
          : "bg-background/70 hover:bg-background/90 text-foreground/80 hover:text-rose-500 hover:scale-105 border border-white/20",
        animating && "scale-125",
        className
      )}
    >
      <Heart
        className={cn(
          "size-4 sm:size-4.5 transition-transform duration-200",
          saved
            ? "fill-white text-white"
            : "stroke-current fill-transparent group-hover:text-rose-500"
        )}
      />
    </button>
  );
}
