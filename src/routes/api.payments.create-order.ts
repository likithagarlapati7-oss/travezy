import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/bookings.server";
import { createPaymentOrderServer } from "@/lib/payments.server";
import { createOrderInputSchema } from "@/lib/payments.schema";

export const Route = createFileRoute("/api/payments/create-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabase, userId } = await authenticateRequest(request);
          const body = await request.json();

          // Support both snake_case and camelCase for flexibility
          const bookingId = body.booking_id || body.bookingId;
          const parsed = createOrderInputSchema.parse({ booking_id: bookingId });

          const result = await createPaymentOrderServer({
            supabase,
            bookingId: parsed.booking_id,
            userId,
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
    },
  },
});
