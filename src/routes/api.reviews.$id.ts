import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/bookings.server";
import { deleteReviewServer, updateReviewServer } from "@/lib/reviews.server";
import { updateReviewSchema } from "@/lib/reviews.schema";

export const Route = createFileRoute("/api/reviews/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { supabase } = await authenticateRequest(request);
          const { data: review, error } = await supabase
            .from("reviews")
            .select("*, profiles(full_name, avatar_url), services(title, destination)")
            .eq("id", params.id)
            .maybeSingle();

          if (error || !review) {
            return new Response(JSON.stringify({ error: "Review not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify(review), {
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
      PUT: async ({ request, params }) => {
        try {
          const { supabase, userId } = await authenticateRequest(request);
          const body = await request.json();

          const parsed = updateReviewSchema.parse({
            id: params.id,
            rating: Number(body.rating),
            comment: body.comment,
          });

          const result = await updateReviewServer({
            supabase,
            userId,
            reviewId: parsed.id,
            rating: parsed.rating,
            comment: parsed.comment,
          });

          return new Response(JSON.stringify(result), {
            status: 200,
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
      DELETE: async ({ request, params }) => {
        try {
          const { supabase, userId } = await authenticateRequest(request);
          const result = await deleteReviewServer({
            supabase,
            userId,
            reviewId: params.id,
          });

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          const status = e.message.startsWith("Unauthorized")
            ? 401
            : e.message.startsWith("Forbidden")
            ? 403
            : 400;

          return new Response(JSON.stringify({ error: e.message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
