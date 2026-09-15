import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchServices from "./tools/search-services";
import getService from "./tools/get-service";
import listMyBookings from "./tools/list-my-bookings";
import createBooking from "./tools/create-booking";
import cancelBooking from "./tools/cancel-booking";
import getMyProfile from "./tools/get-my-profile";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "supabase-connect-pro",
  title: "Supabase Connect Pro",
  version: "0.1.0",
  instructions:
    "Tools for Travezy, a tourism marketplace. Search travel listings, inspect a listing with its reviews, and manage the signed-in traveller's bookings and profile.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  // The SDK's tool type declares `outputSchema` as an optional generic slot;
  // under exactOptionalPropertyTypes the inferred `undefined` needs a cast.
  tools: [
    searchServices,
    getService,
    listMyBookings,
    createBooking,
    cancelBooking,
    getMyProfile,
  ] as unknown as Parameters<typeof defineMcp>[0]["tools"],
});
