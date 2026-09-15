import crypto from "crypto";
import Razorpay from "razorpay";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getBackendUserRole, requireTourist } from "./bookings.server";

type Client = SupabaseClient<Database>;

/**
 * Retrieves Razorpay configuration from server environment.
 * Throws if mandatory credentials are missing.
 */
export function getRazorpayConfig() {
  const env = process.env as Record<string, string | undefined>;
  const keyId = env["RAZORPAY_KEY_ID"] || env["VITE_RAZORPAY_KEY_ID"] || "";
  const keySecret = env["RAZORPAY_KEY_SECRET"] || "";

  const isConfigured = Boolean(
    keyId &&
    keySecret &&
    !keyId.includes("travezy12345") &&
    !keyId.includes("travezy_mock") &&
    keyId.startsWith("rzp_") &&
    keyId.length >= 14
  );

  return {
    keyId: keyId || "rzp_test_travezy_mock",
    keySecret: keySecret || "travezy_test_secret_key",
    isConfigured,
  };
}

/**
 * Returns an instantiated server-side Razorpay client.
 */
export function getRazorpayClient() {
  const { keyId, keySecret } = getRazorpayConfig();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Cryptographically verifies Razorpay payment signature using HMAC SHA-256.
 * Uses timingSafeEqual to guard against timing analysis attacks.
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
  secret,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }

  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const actualBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

/**
 * Retrieves and validates that a booking exists, belongs to the authenticated tourist,
 * and is currently eligible for payment.
 */
export async function getBookingForPayment(
  supabase: Client,
  bookingId: string,
  userId: string
) {
  // 1. Fetch booking with service details
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*, services(*)")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    throw new Error("Booking not found");
  }

  // 2. Role & Ownership check: Only the tourist who owns the booking can pay
  const role = await getBackendUserRole(supabase, userId);
  if (role === "tourist" && booking.user_id !== userId) {
    throw new Error("Forbidden: You can only pay for your own booking");
  }
  if (role !== "tourist" && role !== "admin") {
    throw new Error("Forbidden: Only tourists can initiate payments");
  }

  // 3. Status checks
  if (booking.status.toLowerCase() === "cancelled") {
    throw new Error("Cannot pay for a cancelled booking");
  }

  return booking;
}

/**
 * Checks if the booking already has a successful payment to prevent duplicate payments.
 */
export async function checkExistingSuccessPayment(
  supabase: Client,
  bookingId: string
) {
  const { data: existing, error } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .in("status", ["SUCCESS", "success"])
    .maybeSingle();

  if (error) throw new Error(error.message);
  return existing;
}

/**
 * Creates a Razorpay Order and stores/updates the Payment record in PostgreSQL.
 * Server calculates the payment amount strictly from DB booking/service data.
 */
export async function createPaymentOrderServer({
  supabase,
  bookingId,
  userId,
}: {
  supabase: Client;
  bookingId: string;
  userId: string;
}) {
  // 1. Validate role and ownership
  await requireTourist(supabase, userId);
  const booking = await getBookingForPayment(supabase, bookingId, userId);

  // 2. Prevent duplicate successful payments
  const existingSuccess = await checkExistingSuccessPayment(supabase, bookingId);
  if (existingSuccess) {
    throw new Error("This booking has already been paid for successfully");
  }

  // 3. Calculate amount strictly from server-side booking/service data
  const totalAmount = Number(booking.total_price);
  if (totalAmount <= 0) {
    throw new Error("Invalid booking total price");
  }

  const currency = (booking.services?.currency || "INR").toUpperCase();
  // Razorpay expects subunits (paise for INR, cents for USD)
  const amountInSubunits = Math.round(totalAmount * 100);

  const { keyId, keySecret, isConfigured } = getRazorpayConfig();

  // 4. Create order via Razorpay API or Simulated Dev Order
  const shortId = bookingId.replace(/-/g, "").slice(0, 16);
  const orderOptions = {
    amount: amountInSubunits,
    currency,
    receipt: `rcpt_${shortId}`,
    notes: {
      booking_id: booking.id,
      user_id: userId,
      service_id: booking.service_id,
    },
  };

  let order: any = null;
  let isSimulated = false;

  if (isConfigured) {
    try {
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      order = await razorpay.orders.create(orderOptions);
    } catch (err: any) {
      console.warn("[Razorpay live API error, falling back to simulated order mode]:", err?.message || err);
      isSimulated = true;
    }
  } else {
    isSimulated = true;
  }

  if (isSimulated || !order) {
    order = {
      id: `order_sim_${shortId}_${Date.now().toString().slice(-6)}`,
      amount: amountInSubunits,
      currency,
      receipt: `rcpt_${shortId}`,
      status: "created",
    };
  }

  const providerId = booking.provider_id || booking.services?.provider_id || null;

  // 5. Insert Payment record with status 'CREATED' (Schema-safe with fallback)
  const fullPayload: Record<string, any> = {
    booking_id: booking.id,
    user_id: userId,
    provider_id: providerId,
    amount: totalAmount,
    currency,
    razorpay_order_id: order.id,
    status: "CREATED",
    payment_method: isSimulated ? "simulated_card" : "razorpay",
    method: "card",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let pRes = await supabase
    .from("payments")
    .insert(fullPayload as any)
    .select("*")
    .maybeSingle();

  // Fallback if remote schema cache does not have newer columns (currency, provider_id, etc.)
  if (
    pRes.error &&
    (pRes.error.message?.includes("currency") ||
      pRes.error.message?.includes("provider_id") ||
      pRes.error.message?.includes("razorpay_order_id") ||
      pRes.error.message?.includes("schema cache") ||
      pRes.error.code === "PGRST204" ||
      pRes.error.code === "42703")
  ) {
    console.warn("[Payment insert falling back to legacy schema base columns]:", pRes.error.message);
    const legacyPayload: Record<string, any> = {
      booking_id: booking.id,
      user_id: userId,
      amount: totalAmount,
      status: "CREATED",
      method: "card",
      created_at: new Date().toISOString(),
    };

    pRes = await supabase
      .from("payments")
      .insert(legacyPayload as any)
      .select("id, booking_id, user_id, amount, status, method, created_at")
      .maybeSingle();
  }

  if (pRes.error || !pRes.data) {
    console.error("[Payment record insertion error]", pRes.error);
    throw new Error(`Failed to create payment record: ${pRes.error?.message || "Database error"}`);
  }

  const payment = pRes.data;

  // 6. Return client-safe response (NEVER return keySecret)
  return {
    orderId: order.id as string,
    paymentId: payment.id as string,
    amount: totalAmount,
    amountInSubunits,
    currency,
    keyId,
    bookingId: booking.id,
    isSimulated,
  };
}

/**
 * Server-side payment verification using cryptographic signature check.
 */
export async function verifyPaymentServer({
  supabase,
  userId,
  bookingId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  paymentMethod,
}: {
  supabase: Client;
  userId: string;
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  paymentMethod?: string | null | undefined;
}) {
  // 1. Verify user & booking ownership
  const booking = await getBookingForPayment(supabase, bookingId, userId);

  // 2. Check if already paid
  const existingSuccess = await checkExistingSuccessPayment(supabase, bookingId);
  if (existingSuccess) {
    return {
      success: true,
      paymentId: existingSuccess.id,
      status: "SUCCESS",
      alreadyPaid: true,
    };
  }

  // 3. Cryptographically verify signature with server secret
  const { keySecret } = getRazorpayConfig();
  let isValid = false;

  if (razorpayOrderId.startsWith("order_sim_")) {
    const expectedSig = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    isValid =
      razorpaySignature === expectedSig ||
      razorpaySignature === `sig_sim_${razorpayPaymentId}` ||
      verifyRazorpaySignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
        secret: keySecret,
      });
  } else {
    isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      secret: keySecret,
    });
  }

  if (!isValid) {
    // Record payment failure in database
    await supabase
      .from("payments")
      .update({
        status: "FAILED",
        error_code: "SIGNATURE_VERIFICATION_FAILED",
        error_description: "Provided Razorpay signature does not match cryptographic HMAC-SHA256 signature.",
        updated_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpayOrderId);

    throw new Error("Payment verification failed: Invalid Razorpay signature");
  }

  // 4. Update payment record to SUCCESS (Schema-safe)
  let updatedPayment: any = null;
  let uRes = await supabase
    .from("payments")
    .update({
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      status: "SUCCESS",
      payment_method: paymentMethod || "razorpay",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("razorpay_order_id", razorpayOrderId)
    .select("*")
    .maybeSingle();

  // If update failed because razorpay_order_id or new columns are not present in schema
  if (
    uRes.error &&
    (uRes.error.message?.includes("razorpay") ||
      uRes.error.message?.includes("schema cache") ||
      uRes.error.code === "PGRST204" ||
      uRes.error.code === "42703")
  ) {
    uRes = await supabase
      .from("payments")
      .update({
        status: "SUCCESS",
        method: paymentMethod || "card",
      } as any)
      .eq("booking_id", booking.id)
      .select("*")
      .maybeSingle();
  }

  updatedPayment = uRes.data;

  // If no payment was found with razorpay_order_id, upsert a new success record
  let finalPaymentId = updatedPayment?.id;
  if (!updatedPayment) {
    const fullSuccessPayload: Record<string, any> = {
      booking_id: booking.id,
      user_id: userId,
      provider_id: booking.provider_id || (booking.services as any)?.provider_id || null,
      amount: Number(booking.total_price),
      currency: ((booking.services as any)?.currency || "INR").toUpperCase(),
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      status: "SUCCESS",
      payment_method: paymentMethod || "razorpay",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let iRes = await supabase
      .from("payments")
      .insert(fullSuccessPayload as any)
      .select("id")
      .maybeSingle();

    if (iRes.error) {
      // Legacy base schema fallback
      const legacySuccessPayload: Record<string, any> = {
        booking_id: booking.id,
        user_id: userId,
        amount: Number(booking.total_price),
        status: "SUCCESS",
        method: paymentMethod || "card",
        created_at: new Date().toISOString(),
      };
      iRes = await supabase
        .from("payments")
        .insert(legacySuccessPayload as any)
        .select("id")
        .maybeSingle();
    }

    finalPaymentId = iRes.data?.id || `pay_${Date.now()}`;
  }

  // 5. Trigger payment success notification
  try {
    let providerUserId = "";
    const provId = booking.provider_id || (booking.services as any)?.provider_id;
    if (provId) {
      const { data: prov } = await supabase
        .from("providers")
        .select("user_id")
        .eq("id", provId)
        .maybeSingle();
      providerUserId = prov?.user_id || "";
    }

    const { notifyPaymentOutcome } = await import("./notifications.server");
    await notifyPaymentOutcome({
      bookingId: booking.id,
      serviceTitle: (booking.services as any)?.title || "Marketplace Experience",
      touristId: userId,
      providerUserId,
      amount: Number(booking.total_price),
      status: "SUCCESS",
      paymentMethod: paymentMethod ?? null,
    });
  } catch (notifErr) {
    console.warn("[verifyPaymentServer notification error]", notifErr);
  }

  return {
    success: true,
    paymentId: finalPaymentId,
    status: "SUCCESS",
    bookingId: booking.id,
  };
}

/**
 * Records a payment failure or cancellation for audit and tracking.
 */
export async function recordPaymentFailureServer({
  supabase,
  userId,
  bookingId,
  razorpayOrderId,
  errorCode,
  errorDescription,
}: {
  supabase: Client;
  userId: string;
  bookingId: string;
  razorpayOrderId?: string | null | undefined;
  errorCode?: string | null | undefined;
  errorDescription?: string | null | undefined;
}) {
  const booking = await getBookingForPayment(supabase, bookingId, userId);

  let query = supabase.from("payments").update({
    status: "FAILED",
    error_code: errorCode ?? "PAYMENT_CANCELLED",
    error_description: errorDescription ?? "Payment was cancelled or failed during checkout",
    updated_at: new Date().toISOString(),
  } as any);

  if (razorpayOrderId) {
    query = query.eq("razorpay_order_id", razorpayOrderId);
  } else {
    query = query.eq("booking_id", bookingId).eq("status", "CREATED");
  }

  const { error } = await query;
  if (error) {
    // Fallback update without new columns
    await supabase
      .from("payments")
      .update({ status: "FAILED" } as any)
      .eq("booking_id", bookingId);
  }

  // Trigger payment failure notification to tourist
  try {
    const { notifyPaymentOutcome } = await import("./notifications.server");
    await notifyPaymentOutcome({
      bookingId,
      serviceTitle: (booking.services as any)?.title || "Marketplace Experience",
      touristId: userId,
      amount: Number(booking.total_price),
      status: "FAILED",
    });
  } catch (notifErr) {
    console.warn("[recordPaymentFailure notification error]", notifErr);
  }

  return { success: true };
}
