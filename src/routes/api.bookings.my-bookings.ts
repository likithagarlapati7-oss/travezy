import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/bookings.server";

export const Route = createFileRoute("/api/bookings/my-bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { supabase, userId } = await authenticateRequest(request);

          const { data: bookings, error: bErr } = await supabase
            .from("bookings")
            .select("*, services(*)")
            .eq("user_id", userId)
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
          const status = e.message.startsWith("Unauthorized") ? 401 : 400;
          return new Response(JSON.stringify({ error: e.message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
