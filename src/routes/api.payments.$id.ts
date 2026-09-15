import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest, getBackendUserRole, requireProvider } from "@/lib/bookings.server";

export const Route = createFileRoute("/api/payments/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const paymentId = params.id;
          const { supabase, userId } = await authenticateRequest(request);

          const { data: payment, error } = await supabase
            .from("payments")
            .select("*, bookings(*, services(*))")
            .eq("id", paymentId)
            .maybeSingle();

          if (error || !payment) {
            return new Response(JSON.stringify({ error: "Payment not found" }), {
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

          // 1. Tourists can only view their own payments
          if (role === "tourist" && payment.user_id !== userId) {
            return new Response(JSON.stringify({ error: "Forbidden: You do not own this payment record" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          // 2. Providers can only view payments for their services
          if (role === "provider") {
            const providerId = await requireProvider(supabase, userId);
            const bookingProviderId = payment.provider_id || (payment.bookings as any)?.provider_id || (payment.bookings as any)?.services?.provider_id;
            if (bookingProviderId !== providerId) {
              return new Response(JSON.stringify({ error: "Forbidden: This payment belongs to another provider" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              });
            }
          }

          // Clean response omitting internal artifacts
          const responseData = {
            id: payment.id,
            booking_id: payment.booking_id,
            user_id: payment.user_id,
            provider_id: payment.provider_id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            payment_method: payment.payment_method,
            razorpay_order_id: payment.razorpay_order_id,
            razorpay_payment_id: payment.razorpay_payment_id,
            created_at: payment.created_at,
            updated_at: payment.updated_at,
          };

          return new Response(JSON.stringify(responseData), {
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
