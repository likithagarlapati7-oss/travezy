import { createFileRoute } from "@tanstack/react-router";
import { WishlistPage } from "@/routes/wishlist";

export const Route = createFileRoute("/_authenticated/tourist/wishlist")({
  head: () => ({
    meta: [{ title: "My Wishlist — Travezy Tourist" }],
  }),
  component: WishlistPage,
});
