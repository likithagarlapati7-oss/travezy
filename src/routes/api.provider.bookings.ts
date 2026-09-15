import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest, requireProvider } from "@/lib/bookings.server";

export const Route = createFileRoute("/api/provider/bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { supabase, userId } = await authenticateRequest(request);
          const providerId = await requireProvider(supabase, userId);

          // Get services owned by this provider
          const { data: services, error: sErr } = await supabase
            .from("services")
            .select("id")
            .eq("provider_id", providerId);

          if (sErr) {
            return new Response(JSON.stringify({ error: sErr.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const serviceIds = (services ?? []).map((s) => s.id);
          if (serviceIds.length === 0) {
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const { data: bookings, error: bErr } = await supabase
            .from("bookings")
            .select("*, services(*)")
            .in("service_id", serviceIds)
            .order("created_at", { ascending: false });

          if (bErr) {
            return new Response(JSON.stringify({ error: bErr.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify(bookings), {
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
