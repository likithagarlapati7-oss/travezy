import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/bookings.server";
import { respondToReviewServer } from "@/lib/reviews.server";
import { providerResponseSchema } from "@/lib/reviews.schema";

export const Route = createFileRoute("/api/reviews/$id/response")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const reviewId = params.id;
          const { supabase, userId } = await authenticateRequest(request);
          const body = await request.json();

          const parsed = providerResponseSchema.parse({
            review_id: reviewId,
            response: body.response,
          });

          const result = await respondToReviewServer({
            supabase,
            userId,
            reviewId: parsed.review_id,
            response: parsed.response,
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
    },
  },
});
