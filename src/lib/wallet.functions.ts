import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  adminWithdrawalActionInputSchema,
  confirmCashPaymentInputSchema,
  createCashBookingPaymentSchema,
  requestWithdrawalInputSchema,
} from "./wallet.schema";
import {
  calculateProviderWalletServer,
  confirmCashPaymentServer,
  getAdminWithdrawalsServer,
  processAdminWithdrawalServer,
  requestWithdrawalServer,
} from "./wallet.server";
import { requireProvider } from "./bookings.server";
import { getBookingForPayment } from "./payments.server";

/**
 * Server function to fetch the current authenticated Provider's live wallet & earnings.
 */
export const getProviderWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const providerId = await requireProvider(context.supabase, context.userId);
    return await calculateProviderWalletServer(context.supabase, providerId);
  });

/**
 * Server function for Provider to submit a payout withdrawal request.
 */
export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => requestWithdrawalInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await requestWithdrawalServer({
      supabase: context.supabase,
      userId: context.userId,
      amount: data.amount,
      withdrawalMethod: data.withdrawal_method,
      bankDetails: data.bank_details,
      upiDetails: data.upi_details,
    });
  });

/**
 * Server function for Provider or Admin to confirm cash received for a booking.
 */
export const confirmCashPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => confirmCashPaymentInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await confirmCashPaymentServer({
      supabase: context.supabase,
      userId: context.userId,
      bookingId: data.booking_id,
      note: data.note,
    });
  });

/**
 * Server function for Tourist to select "Cash at Service / Pay Later" payment method.
 */
export const createCashBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createCashBookingPaymentSchema.parse(data))
  .handler(async ({ data, context }) => {
    // 1. Verify tourist owns the booking
    const booking = await getBookingForPayment(context.supabase, data.booking_id, context.userId);

    const totalAmount = Number(booking.total_price);
    const providerId = booking.provider_id || (booking.services as any)?.provider_id || null;
    const now = new Date().toISOString();

    // 2. Check if a payment already exists
    const { data: existing } = await context.supabase
      .from("payments")
      .select("*")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (existing && (existing.status?.toUpperCase() === "PAID" || existing.status?.toUpperCase() === "SUCCESS")) {
      throw new Error("This booking has already been paid for.");
    }

    let paymentRecord: any = null;

    if (existing) {
      const { data: updated } = await context.supabase
        .from("payments")
        .update({
          payment_method: "CASH",
          status: "PENDING",
          updated_at: now,
        } as any)
        .eq("id", existing.id)
        .select("*")
        .maybeSingle();
      paymentRecord = updated;
    } else {
      const { data: inserted, error: iErr } = await context.supabase
        .from("payments")
        .insert({
          booking_id: booking.id,
          user_id: context.userId,
          provider_id: providerId,
          amount: totalAmount,
          currency: ((booking.services as any)?.currency || "INR").toUpperCase(),
          payment_method: "CASH",
          status: "PENDING",
          created_at: now,
          updated_at: now,
        } as any)
        .select("*")
        .maybeSingle();

      if (iErr) {
        // Fallback for legacy columns
        const { data: legacyInserted } = await context.supabase
          .from("payments")
          .insert({
            booking_id: booking.id,
            user_id: context.userId,
            amount: totalAmount,
            status: "PENDING",
            method: "cash",
            created_at: now,
          } as any)
          .select("id, booking_id, user_id, amount, status, method, created_at")
          .maybeSingle();
        paymentRecord = legacyInserted;
      } else {
        paymentRecord = inserted;
      }
    }

    // 3. Dispatch Cash Pending notification to provider and tourist
    try {
      const { notifyPaymentOutcome } = await import("./notifications.server");
      let providerUserId = "";
      if (providerId) {
        const { data: prov } = await context.supabase
          .from("providers")
          .select("user_id")
          .eq("id", providerId)
          .maybeSingle();
        providerUserId = prov?.user_id || "";
      }

      await notifyPaymentOutcome({
        bookingId: booking.id,
        serviceTitle: (booking.services as any)?.title || "Marketplace Experience",
        touristId: context.userId,
        providerUserId,
        amount: totalAmount,
        status: "PENDING",
        paymentMethod: "CASH",
      });
    } catch (notifErr) {
      console.warn("[createCashBookingPayment notification error]:", notifErr);
    }

    return {
      success: true,
      payment: paymentRecord,
      message: "Cash payment chosen. Please pay in cash directly to your host at the service location.",
    };
  });

/**
 * Server function for Admin to retrieve all platform withdrawals.
 */
export const getAdminWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return await getAdminWithdrawalsServer(context.supabase, context.userId);
  });

/**
 * Server function for Admin to update withdrawal status.
 */
export const updateAdminWithdrawalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => adminWithdrawalActionInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await processAdminWithdrawalServer({
      supabase: context.supabase,
      userId: context.userId,
      withdrawalId: data.withdrawal_id,
      action: data.action,
      payoutReference: data.payout_reference,
      adminNote: data.admin_note,
    });
  });

/**
 * Server function to fetch all payments for the authenticated Tourist.
 */
export const getTouristPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: payments, error } = await context.supabase
      .from("payments")
      .select("*, bookings(*, services(*, providers(id, business_name, verified)))")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[getTouristPayments error]:", error);
      return [];
    }

    return payments || [];
  });
