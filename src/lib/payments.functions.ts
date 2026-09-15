import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createOrderInputSchema,
  recordFailureInputSchema,
  verifyPaymentInputSchema,
} from "./payments.schema";
import {
  createPaymentOrderServer,
  getBookingForPayment,
  recordPaymentFailureServer,
  verifyPaymentServer,
} from "./payments.server";

/**
 * Server function to create a Razorpay order for an eligible booking.
 */
export const createPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createOrderInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await createPaymentOrderServer({
      supabase: context.supabase,
      bookingId: data.booking_id,
      userId: context.userId,
    });
  });

/**
 * Server function to cryptographically verify a Razorpay payment signature.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => verifyPaymentInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await verifyPaymentServer({
      supabase: context.supabase,
      userId: context.userId,
      bookingId: data.booking_id,
      razorpayOrderId: data.razorpay_order_id,
      razorpayPaymentId: data.razorpay_payment_id,
      razorpaySignature: data.razorpay_signature,
      paymentMethod: data.payment_method,
    });
  });

/**
 * Server function to record payment failures or cancellations.
 */
export const recordPaymentFailure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => recordFailureInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await recordPaymentFailureServer({
      supabase: context.supabase,
      userId: context.userId,
      bookingId: data.booking_id,
      razorpayOrderId: data.razorpay_order_id,
      errorCode: data.error_code,
      errorDescription: data.error_description,
    });
  });

/**
 * Server function to fetch the payment status and details for a booking.
 */
export const getBookingPayment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      booking_id: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    // Assert authorization via booking retrieval
    await getBookingForPayment(context.supabase, data.booking_id, context.userId);

    let payments: any[] = [];
    const fullRes = await context.supabase
      .from("payments")
      .select("*")
      .eq("booking_id", data.booking_id)
      .order("created_at", { ascending: false });

    if (!fullRes.error && fullRes.data) {
      payments = fullRes.data;
    } else {
      const basicRes = await context.supabase
        .from("payments")
        .select("id, booking_id, user_id, amount, status, method, created_at")
        .eq("booking_id", data.booking_id)
        .order("created_at", { ascending: false });

      if (basicRes.error) {
        console.warn("[getBookingPayment fallback error]", basicRes.error);
      }
      payments = basicRes.data || [];
    }

    const successPayment = payments.find((p) => p.status?.toUpperCase() === "SUCCESS");
    const latestPayment = payments[0] || null;

    return {
      payment: successPayment || latestPayment,
      allPayments: payments,
      isPaid: !!successPayment,
    };
  });
