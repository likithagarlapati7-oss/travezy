import { createFileRoute } from "@tanstack/react-router";
import { nearbyEmergencyQuerySchema } from "@/lib/emergency.schema";
import { searchNearbyEmergencyPlaces } from "@/lib/emergency.server";

export const Route = createFileRoute("/api/emergency/nearby")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const lat = parseFloat(url.searchParams.get("lat") || "15.4989");
          const lng = parseFloat(url.searchParams.get("lng") || "73.8278");
          const category = (url.searchParams.get("category") || "all") as any;
          const radiusKm = parseFloat(url.searchParams.get("radiusKm") || "15");

          const parsed = nearbyEmergencyQuerySchema.parse({
            lat,
            lng,
            category,
            radiusKm,
          });

          const result = await searchNearbyEmergencyPlaces(parsed);

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ error: e.message || "Failed to find nearby emergency places" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = nearbyEmergencyQuerySchema.parse(body);

          const result = await searchNearbyEmergencyPlaces(parsed);

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ error: e.message || "Failed to find nearby emergency places" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
