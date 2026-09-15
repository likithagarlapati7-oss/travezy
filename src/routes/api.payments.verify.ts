import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/bookings.server";
import { verifyPaymentServer } from "@/lib/payments.server";
import { verifyPaymentInputSchema } from "@/lib/payments.schema";

export const Route = createFileRoute("/api/payments/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabase, userId } = await authenticateRequest(request);
          const body = await request.json();

          const parsed = verifyPaymentInputSchema.parse({
            booking_id: body.booking_id || body.bookingId,
            razorpay_order_id: body.razorpay_order_id || body.razorpayOrderId,
            razorpay_payment_id: body.razorpay_payment_id || body.razorpayPaymentId,
            razorpay_signature: body.razorpay_signature || body.razorpaySignature,
            payment_method: body.payment_method || body.paymentMethod,
          });

          const result = await verifyPaymentServer({
            supabase,
            userId,
            bookingId: parsed.booking_id,
            razorpayOrderId: parsed.razorpay_order_id,
            razorpayPaymentId: parsed.razorpay_payment_id,
            razorpaySignature: parsed.razorpay_signature,
            paymentMethod: parsed.payment_method,
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
