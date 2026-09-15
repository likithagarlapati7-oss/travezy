import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/bookings.server";
import { createReviewServer } from "@/lib/reviews.server";
import { createReviewSchema } from "@/lib/reviews.schema";

export const Route = createFileRoute("/api/reviews")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabase, userId } = await authenticateRequest(request);
          const body = await request.json();

          const parsed = createReviewSchema.parse({
            booking_id: body.booking_id || body.bookingId,
            service_id: body.service_id || body.serviceId,
            rating: Number(body.rating),
            comment: body.comment,
          });

          const result = await createReviewServer({
            supabase,
            userId,
            bookingId: parsed.booking_id,
            serviceId: parsed.service_id,
            rating: parsed.rating,
            comment: parsed.comment,
          });

          return new Response(JSON.stringify(result), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          const status = e.message.startsWith("Unauthorized")
            ? 401
            : e.message.startsWith("Forbidden")
            ? 403
            : e.message.includes("not found")
            ? 404
            : 400;

          return new Response(JSON.stringify({ error: e.message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      GET: async ({ request }) => {
        try {
          const { supabase } = await authenticateRequest(request);
          const url = new URL(request.url);
          const serviceId = url.searchParams.get("service_id") || url.searchParams.get("serviceId");

          let query = supabase
            .from("reviews")
            .select("*, profiles(full_name, avatar_url), services(title, destination)")
            .order("created_at", { ascending: false });

          if (serviceId) {
            query = query.eq("service_id", serviceId);
          }

          const { data: reviews, error } = await query;
          if (error) throw new Error(error.message);

          return new Response(JSON.stringify(reviews || []), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
