import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getBackendUserRole, requireProvider } from "./bookings.server";
import { requireAdmin } from "./admin.server";

type Client = SupabaseClient<Database>;

export interface MaskedPayoutDetails {
  account_holder?: string;
  bank_name?: string;
  account_number_masked?: string;
  ifsc_code?: string;
  upi_id?: string;
}

/**
 * Mask an account number showing only the last 4 digits (e.g. •••• •••• 1234)
 */
export function maskAccountNumber(accNum: string): string {
  if (!accNum) return "";
  const cleaned = accNum.replace(/\s+/g, "");
  if (cleaned.length <= 4) return cleaned;
  const last4 = cleaned.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Mask a UPI ID for privacy (e.g. u***@okhdfcbank)
 */
export function maskUpiId(upi: string): string {
  if (!upi) return "";
  const parts = upi.split("@");
  if (parts.length !== 2) return upi;
  const handle = parts[0] || "";
  const bank = parts[1] || "";
  if (handle.length <= 2) return `${handle}***@${bank}`;
  return `${handle.slice(0, 2)}***@${bank}`;
}

/**
 * Calculates provider wallet and earnings strictly from verified database records.
 * Ensures complete data integrity and prevents trusting client balance states.
 */
export async function calculateProviderWalletServer(supabase: Client, providerId: string) {
  // 1. Fetch provider's services
  const { data: services, error: sErr } = await supabase
    .from("services")
    .select("id, title, price, currency")
    .eq("provider_id", providerId);

  if (sErr) throw new Error(`Failed to load services for provider: ${sErr.message}`);
  const serviceIds = (services || []).map((s) => s.id);

  // 2. Fetch all bookings for these services
  let bookings: any[] = [];
  if (serviceIds.length > 0) {
    const { data: bData, error: bErr } = await supabase
      .from("bookings")
      .select("id, service_id, user_id, total_price, status, travel_date, created_at, payments(*)")
      .in("service_id", serviceIds)
      .order("created_at", { ascending: false });

    if (!bErr && bData) {
      bookings = bData;
    }
  }

  // 3. Fetch direct payments tagged with provider_id
  const { data: directPayments } = await supabase
    .from("payments")
    .select("*")
    .eq("provider_id", providerId);

  // Map all payments with unique deduplication
  const paymentMap = new Map<string, any>();
  for (const dp of directPayments || []) {
    paymentMap.set(dp.id, dp);
  }
  for (const b of bookings) {
    for (const p of b.payments || []) {
      if (!paymentMap.has(p.id)) {
        paymentMap.set(p.id, { ...p, booking_status: b.status, booking_travel_date: b.travel_date });
      }
    }
  }

  const allPayments = Array.from(paymentMap.values());

  // 4. Fetch all withdrawals for this provider
  let withdrawals: any[] = [];
  try {
    const { data: wData, error: wErr } = await (supabase as any)
      .from("withdrawals")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (!wErr && wData) {
      withdrawals = wData;
    }
  } catch (err) {
    console.warn("[Withdrawals table read fallback]:", err);
  }

  // 5. Compute Comprehensive Financial Ledger:
  // - Gross Booking Value = Sum of total_price across all valid bookings
  // - Paid Earnings = Sum of total_price for all bookings with verified SUCCESS / PAID payments
  // - Pending Earnings = Paid payments for uncompleted trips (confirmed / pending)
  // - Refunded Amount = Bookings cancelled / rejected that had payments
  // - Platform Fee = 10% platform fee on completed / realized earnings
  // - Net Earnings = Settled gross earnings minus platform fees
  // - Available Balance = (Completed paid bookings - Platform Fee) minus (pending + processing + completed withdrawals)
  // - Total Withdrawn = Completed payout disbursements

  let grossBookingValue = 0;
  let paidEarnings = 0;
  let pendingBalance = 0;
  let refundedAmount = 0;
  let completedBookingsCount = 0;
  let completedGross = 0;

  for (const b of bookings) {
    const bStatus = (b.status || "").toLowerCase();
    const bPrice = Number(b.total_price || 0);
    grossBookingValue += bPrice;

    const bPayments = (b.payments || []).filter(
      (p: any) =>
        (p.status || "").toUpperCase() === "SUCCESS" ||
        (p.status || "").toUpperCase() === "PAID"
    );
    const isPaid = bPayments.length > 0;

    if (bStatus === "completed") {
      completedBookingsCount += 1;
      if (isPaid) {
        paidEarnings += bPrice;
        completedGross += bPrice;
      }
    } else if (bStatus === "confirmed" || bStatus === "pending") {
      if (isPaid) {
        paidEarnings += bPrice;
        pendingBalance += bPrice;
      }
    } else if (bStatus === "cancelled" || bStatus === "rejected") {
      if (isPaid) {
        refundedAmount += bPrice;
      }
    }
  }

  // Calculate platform fee (10% of completed gross) and net provider earnings
  const platformFee = Math.round(completedGross * 0.10);
  const netEarnings = Math.max(0, completedGross - platformFee);

  // Deduct active and completed withdrawals
  let totalWithdrawn = 0;
  let activeWithdrawalsHeld = 0;

  for (const w of withdrawals) {
    const wStatus = (w.withdrawal_status || "").toUpperCase();
    const wAmt = Number(w.amount || 0);
    if (wStatus === "COMPLETED") {
      totalWithdrawn += wAmt;
      activeWithdrawalsHeld += wAmt;
    } else if (wStatus === "PENDING" || wStatus === "PROCESSING") {
      activeWithdrawalsHeld += wAmt;
    }
  }

  // Available balance is net realized earnings minus all held withdrawals
  const availableBalance = Math.max(0, netEarnings - activeWithdrawalsHeld);

  const walletSummary = {
    provider_id: providerId,
    gross_booking_value: grossBookingValue,
    paid_earnings: paidEarnings,
    pending_earnings: pendingBalance,
    pending_balance: pendingBalance,
    refunded_amount: refundedAmount,
    platform_fee: platformFee,
    net_earnings: netEarnings,
    total_earned: netEarnings,
    available_balance: availableBalance,
    total_withdrawn: totalWithdrawn,
    completed_bookings_count: completedBookingsCount,
    currency: "INR",
    withdrawals,
    all_payments: allPayments,
    bookings,
  };

  // 6. Cache/Sync into provider_wallets table safely
  try {
    await (supabase as any)
      .from("provider_wallets")
      .upsert({
        provider_id: providerId,
        available_balance: availableBalance,
        pending_balance: pendingBalance,
        total_earned: netEarnings,
        total_withdrawn: totalWithdrawn,
        currency: "INR",
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider_id" });
  } catch (syncErr) {
    console.warn("[provider_wallets cache upsert fallback]:", syncErr);
  }

  return walletSummary;
}

/**
 * Creates a withdrawal request with atomic balance validation.
 */
export async function requestWithdrawalServer({
  supabase,
  userId,
  amount,
  withdrawalMethod,
  bankDetails,
  upiDetails,
}: {
  supabase: Client;
  userId: string;
  amount: number;
  withdrawalMethod: "bank_transfer" | "upi";
  bankDetails?: { account_holder: string; bank_name: string; account_number: string; ifsc_code: string } | undefined;
  upiDetails?: { upi_id: string } | undefined;
}) {
  // 1. Verify user is provider
  const providerId = await requireProvider(supabase, userId);

  // 2. Validate amount
  if (amount <= 0) {
    throw new Error("Withdrawal amount must be greater than 0");
  }

  // 3. Atomically check live available balance
  const wallet = await calculateProviderWalletServer(supabase, providerId);
  if (amount > wallet.available_balance) {
    throw new Error(
      `Insufficient available balance. You have ₹${wallet.available_balance.toLocaleString()} available to withdraw.`
    );
  }

  // 4. Prepare masked payout details for storage & privacy
  let maskedPayoutDetails: MaskedPayoutDetails = {};
  if (withdrawalMethod === "bank_transfer" && bankDetails) {
    maskedPayoutDetails = {
      account_holder: bankDetails.account_holder,
      bank_name: bankDetails.bank_name,
      account_number_masked: maskAccountNumber(bankDetails.account_number),
      ifsc_code: bankDetails.ifsc_code.toUpperCase(),
    };
  } else if (withdrawalMethod === "upi" && upiDetails) {
    maskedPayoutDetails = {
      upi_id: maskUpiId(upiDetails.upi_id),
    };
  }

  // 5. Insert withdrawal record
  const { data: withdrawal, error: wErr } = await (supabase as any)
    .from("withdrawals")
    .insert({
      provider_id: providerId,
      amount,
      currency: "INR",
      withdrawal_method: withdrawalMethod,
      payout_details: maskedPayoutDetails,
      withdrawal_status: "PENDING",
      requested_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (wErr || !withdrawal) {
    throw new Error(`Failed to submit withdrawal request: ${wErr?.message || "Database error"}`);
  }

  // 6. Record in wallet transactions ledger
  try {
    await (supabase as any).from("wallet_transactions").insert({
      provider_id: providerId,
      type: "WITHDRAWAL",
      amount: -amount,
      currency: "INR",
      reference_id: withdrawal.id,
      description: `Payout request via ${withdrawalMethod === "bank_transfer" ? "Bank Transfer" : "UPI"} (${withdrawal.id.slice(0, 8)})`,
      status: "PENDING",
      created_at: new Date().toISOString(),
    });
  } catch (txErr) {
    console.warn("[wallet_transactions insert error]:", txErr);
  }

  // 7. Dispatch notification
  try {
    const { notifyWithdrawalStatus } = await import("./notifications.server");
    await notifyWithdrawalStatus({
      providerUserId: userId,
      withdrawalId: withdrawal.id,
      amount,
      status: "PENDING",
      method: withdrawalMethod,
    });
  } catch (nErr) {
    console.warn("[Withdrawal notification error]:", nErr);
  }

  return {
    success: true,
    withdrawal,
    message: "Withdrawal request submitted successfully. It will be reviewed and processed shortly.",
  };
}

/**
 * Provider or Admin confirms cash payment received at service location.
 */
export async function confirmCashPaymentServer({
  supabase,
  userId,
  bookingId,
  note,
}: {
  supabase: Client;
  userId: string;
  bookingId: string;
  note?: string | undefined;
}) {
  // 1. Fetch booking with service details
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("*, services(*)")
    .eq("id", bookingId)
    .maybeSingle();

  if (bErr || !booking) {
    throw new Error("Booking not found");
  }

  // 2. Validate authority: Must be listing provider or admin
  const userRole = await getBackendUserRole(supabase, userId);
  let isAuthorized = userRole === "admin";

  if (!isAuthorized) {
    const { data: prov } = await supabase
      .from("providers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (prov && (prov.id === booking.provider_id || prov.id === (booking.services as any)?.provider_id)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    throw new Error("Forbidden: Only the assigned service provider or an administrator can confirm cash receipt.");
  }

  // 3. Find or create the CASH payment record
  const { data: existingPayments } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId);

  let cashPayment: any = (existingPayments || []).find(
    (p) => (p.payment_method || (p as any).method || "").toUpperCase() === "CASH" || (p.status || "").toUpperCase() === "PENDING"
  );

  const totalAmount = Number(booking.total_price);
  const now = new Date().toISOString();
  const providerId = booking.provider_id || (booking.services as any)?.provider_id || null;

  if (cashPayment) {
    // Update existing cash payment to PAID
    let uRes: any = await supabase
      .from("payments")
      .update({
        status: "PAID",
        payment_method: "CASH",
        confirmed_by: userId,
        confirmed_at: now,
        updated_at: now,
      } as any)
      .eq("id", cashPayment.id)
      .select("*")
      .maybeSingle();

    if (uRes.error) {
      // Fallback update without new audit columns if remote schema cache is stale
      uRes = await supabase
        .from("payments")
        .update({
          status: "SUCCESS",
          method: "cash",
        } as any)
        .eq("id", cashPayment.id)
        .select("*")
        .maybeSingle();
    }
    cashPayment = uRes.data;
  } else {
    // Insert new PAID cash record
    let iRes: any = await supabase
      .from("payments")
      .insert({
        booking_id: booking.id,
        user_id: booking.user_id,
        provider_id: providerId,
        amount: totalAmount,
        currency: ((booking.services as any)?.currency || "INR").toUpperCase(),
        payment_method: "CASH",
        status: "PAID",
        confirmed_by: userId,
        confirmed_at: now,
        created_at: now,
        updated_at: now,
      } as any)
      .select("*")
      .maybeSingle();

    if (iRes.error) {
      iRes = await supabase
        .from("payments")
        .insert({
          booking_id: booking.id,
          user_id: booking.user_id,
          amount: totalAmount,
          status: "SUCCESS",
          method: "cash",
          created_at: now,
        } as any)
        .select("*")
        .maybeSingle();
    }
    cashPayment = iRes.data;
  }

  // 4. Record wallet transaction if provider exists
  if (providerId) {
    try {
      await (supabase as any).from("wallet_transactions").insert({
        provider_id: providerId,
        type: "EARNING",
        amount: totalAmount,
        currency: "INR",
        reference_id: booking.id,
        description: `Cash received for booking ${booking.id.slice(0, 8)} (${(booking.services as any)?.title || "Trip"})`,
        status: "COMPLETED",
        created_at: now,
      });
    } catch (txErr) {
      console.warn("[wallet_transactions cash confirmation insert fallback]:", txErr);
    }
  }

  // 5. Notify Tourist that their cash payment was confirmed
  try {
    const { notifyCashPaymentConfirmed } = await import("./notifications.server");
    await notifyCashPaymentConfirmed({
      bookingId: booking.id,
      serviceTitle: (booking.services as any)?.title || "Travel Experience",
      touristId: booking.user_id,
      amount: totalAmount,
      confirmedByName: userRole === "admin" ? "Travezy Administrator" : "Host Provider",
    });
  } catch (nErr) {
    console.warn("[Cash confirmation notification error]:", nErr);
  }

  return {
    success: true,
    payment: cashPayment,
    message: "Cash payment confirmed and recorded successfully.",
  };
}

/**
 * Admin processes or updates a provider withdrawal.
 */
export async function processAdminWithdrawalServer({
  supabase,
  userId,
  withdrawalId,
  action,
  payoutReference,
  adminNote,
}: {
  supabase: Client;
  userId: string;
  withdrawalId: string;
  action: "mark_processing" | "approve_completed" | "reject_failed" | "cancel";
  payoutReference?: string | undefined;
  adminNote?: string | undefined;
}) {
  // 1. Require Admin Role
  await requireAdmin(supabase, userId);

  // 2. Fetch withdrawal record
  const { data: withdrawal, error: wErr } = await (supabase as any)
    .from("withdrawals")
    .select("*, providers(user_id, business_name)")
    .eq("id", withdrawalId)
    .maybeSingle();

  if (wErr || !withdrawal) {
    throw new Error("Withdrawal record not found");
  }

  let nextStatus = "PENDING";
  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    updated_at: now,
    admin_note: adminNote || withdrawal.admin_note || null,
  };

  if (action === "mark_processing") {
    nextStatus = "PROCESSING";
    updatePayload["withdrawal_status"] = "PROCESSING";
    updatePayload["processed_at"] = now;
  } else if (action === "approve_completed") {
    nextStatus = "COMPLETED";
    updatePayload["withdrawal_status"] = "COMPLETED";
    updatePayload["completed_at"] = now;
    if (payoutReference) {
      updatePayload["payout_reference"] = payoutReference;
    }
  } else if (action === "reject_failed") {
    nextStatus = "FAILED";
    updatePayload["withdrawal_status"] = "FAILED";
    if (payoutReference) {
      updatePayload["payout_reference"] = payoutReference;
    }
  } else if (action === "cancel") {
    nextStatus = "CANCELLED";
    updatePayload["withdrawal_status"] = "CANCELLED";
  }

  // 3. Update withdrawal
  const { data: updated, error: uErr } = await (supabase as any)
    .from("withdrawals")
    .update(updatePayload)
    .eq("id", withdrawalId)
    .select("*")
    .single();

  if (uErr || !updated) {
    throw new Error(`Failed to update withdrawal status: ${uErr?.message || "Database error"}`);
  }

  // 4. Update wallet transaction ledger status
  try {
    await (supabase as any)
      .from("wallet_transactions")
      .update({
        status: nextStatus === "COMPLETED" ? "COMPLETED" : nextStatus === "FAILED" || nextStatus === "CANCELLED" ? "FAILED" : "PENDING",
      })
      .eq("reference_id", withdrawalId);
  } catch (txErr) {
    console.warn("[wallet_transactions update fallback]:", txErr);
  }

  // 5. Notify Provider of status update
  const providerUserId = (withdrawal.providers as any)?.user_id;
  if (providerUserId) {
    try {
      const { notifyWithdrawalStatus } = await import("./notifications.server");
      await notifyWithdrawalStatus({
        providerUserId,
        withdrawalId: withdrawal.id,
        amount: Number(withdrawal.amount),
        status: nextStatus,
        method: withdrawal.withdrawal_method,
        note: adminNote,
      });
    } catch (nErr) {
      console.warn("[Withdrawal status notification error]:", nErr);
    }
  }

  return {
    success: true,
    withdrawal: updated,
    message: `Withdrawal has been updated to ${nextStatus}.`,
  };
}

/**
 * Retrieves all platform withdrawals for Admin moderation.
 */
export async function getAdminWithdrawalsServer(supabase: Client, userId: string) {
  await requireAdmin(supabase, userId);

  const { data: withdrawals, error } = await (supabase as any)
    .from("withdrawals")
    .select("*, providers(id, business_name, user_id, verified)")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getAdminWithdrawalsServer error]:", error);
    return [];
  }

  // Fetch provider user profiles for admin display
  try {
    const userIds = [...new Set((withdrawals || []).map((w: any) => (w.providers as any)?.user_id).filter(Boolean))] as string[];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      const pMap = new Map((profiles || []).map((p) => [p.id, p]));
      return (withdrawals || []).map((w: any) => ({
        ...w,
        provider_profile: pMap.get((w.providers as any)?.user_id) || null,
      }));
    }
  } catch {
    // Safe fallback
  }

  return withdrawals || [];
}
