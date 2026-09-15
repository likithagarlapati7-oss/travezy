import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest, getBackendUserRole, requireProvider } from "@/lib/bookings.server";

export const Route = createFileRoute("/api/bookings/$bookingId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { bookingId } = params;
          const { supabase, userId } = await authenticateRequest(request);

          const { data: booking, error: bErr } = await supabase
            .from("bookings")
            .select("*, services(*)")
            .eq("id", bookingId)
            .maybeSingle();

          if (bErr || !booking) {
            return new Response(JSON.stringify({ error: "Booking not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          const role = await getBackendUserRole(supabase, userId);
          if (!role) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Authorization verification:
          // 1. Tourists may only view their own bookings.
          if (role === "tourist" && booking.user_id !== userId) {
            return new Response(JSON.stringify({ error: "Forbidden: You do not own this booking" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          // 2. Providers may only view bookings for services they own.
          if (role === "provider") {
            const providerId = await requireProvider(supabase, userId);
            if (booking.provider_id !== providerId && booking.services?.provider_id !== providerId) {
              return new Response(JSON.stringify({ error: "Forbidden: This booking is for another provider" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              });
            }
          }

          // 3. Admins can view any bookings (no additional checks needed for admin).

          return new Response(JSON.stringify(booking), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          const status = e.message.startsWith("Unauthorized") ? 401 : e.message.startsWith("Forbidden") ? 403 : 400;
          return new Response(JSON.stringify({ error: e.message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
