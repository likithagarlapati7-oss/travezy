import { createServerFn } from "@tanstack/react-start";
import { nearbyEmergencyQuerySchema } from "./emergency.schema";
import { searchNearbyEmergencyPlaces } from "./emergency.server";

/**
 * Server function for querying nearby emergency places (hospitals, police stations, pharmacies)
 */
export const getNearbyEmergencyPlacesFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => nearbyEmergencyQuerySchema.parse(data))
  .handler(async ({ data }) => {
    return await searchNearbyEmergencyPlaces(data);
  });
