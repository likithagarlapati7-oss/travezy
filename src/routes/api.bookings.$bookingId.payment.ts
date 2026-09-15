import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest, getBackendUserRole, requireProvider } from "@/lib/bookings.server";

export const Route = createFileRoute("/api/bookings/$bookingId/payment")({
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

          // 1. Tourist ownership check
          if (role === "tourist" && booking.user_id !== userId) {
            return new Response(JSON.stringify({ error: "Forbidden: You do not own this booking" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          // 2. Provider ownership check
          if (role === "provider") {
            const providerId = await requireProvider(supabase, userId);
            if (booking.provider_id !== providerId && booking.services?.provider_id !== providerId) {
              return new Response(JSON.stringify({ error: "Forbidden: This booking is for another provider" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              });
            }
          }

          // Fetch payment records for this booking
          const { data: payments, error: pErr } = await supabase
            .from("payments")
            .select("id, booking_id, user_id, provider_id, amount, currency, status, payment_method, razorpay_order_id, razorpay_payment_id, created_at, updated_at")
            .eq("booking_id", bookingId)
            .order("created_at", { ascending: false });

          if (pErr) {
            return new Response(JSON.stringify({ error: pErr.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const successPayment = (payments || []).find((p) => p.status.toUpperCase() === "SUCCESS");
          const latestPayment = payments?.[0] || null;

          return new Response(
            JSON.stringify({
              payment: successPayment || latestPayment,
              allPayments: payments || [],
              isPaid: !!successPayment,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
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
