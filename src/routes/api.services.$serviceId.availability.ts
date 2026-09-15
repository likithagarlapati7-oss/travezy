import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest, checkAvailability } from "@/lib/bookings.server";

export const Route = createFileRoute("/api/services/$serviceId/availability")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { serviceId } = params;
          const { supabase } = await authenticateRequest(request);

          const url = new URL(request.url);
          const travelDate = url.searchParams.get("travel_date");
          const guestsStr = url.searchParams.get("guests") || "1";
          const guests = parseInt(guestsStr, 10);

          if (!travelDate) {
            return new Response(JSON.stringify({ error: "Missing required query parameter: travel_date" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (isNaN(guests) || guests < 1) {
            return new Response(JSON.stringify({ error: "Invalid guests count" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const availability = await checkAvailability(supabase, serviceId, travelDate, guests);

          return new Response(JSON.stringify(availability), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          const status = e.message.startsWith("Unauthorized") ? 401 : e.message.includes("not found") ? 404 : 400;
          return new Response(JSON.stringify({ error: e.message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
