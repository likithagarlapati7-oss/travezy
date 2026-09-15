import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/bookings.server";
import { recordPaymentFailureServer } from "@/lib/payments.server";
import { recordFailureInputSchema } from "@/lib/payments.schema";

export const Route = createFileRoute("/api/payments/failure")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabase, userId } = await authenticateRequest(request);
          const body = await request.json();

          const parsed = recordFailureInputSchema.parse({
            booking_id: body.booking_id || body.bookingId,
            razorpay_order_id: body.razorpay_order_id || body.razorpayOrderId,
            error_code: body.error_code || body.errorCode,
            error_description: body.error_description || body.errorDescription,
          });

          const result = await recordPaymentFailureServer({
            supabase,
            userId,
            bookingId: parsed.booking_id,
            razorpayOrderId: parsed.razorpay_order_id,
            errorCode: parsed.error_code,
            errorDescription: parsed.error_description,
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
