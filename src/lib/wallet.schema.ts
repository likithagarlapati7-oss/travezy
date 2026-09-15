import { z } from "zod";

export const withdrawalMethodSchema = z.enum(["bank_transfer", "upi"]);

export const bankDetailsSchema = z.object({
  account_holder: z.string().min(2, "Account holder name is required"),
  bank_name: z.string().min(2, "Bank name is required"),
  account_number: z.string().min(8, "Valid account number is required"),
  ifsc_code: z.string().min(4, "Valid IFSC/routing code is required"),
});

export const upiDetailsSchema = z.object({
  upi_id: z.string().min(3, "Valid UPI ID is required (e.g. user@okhdfcbank)"),
});

export const requestWithdrawalInputSchema = z.object({
  amount: z.number().positive("Withdrawal amount must be greater than 0"),
  withdrawal_method: withdrawalMethodSchema,
  bank_details: bankDetailsSchema.optional(),
  upi_details: upiDetailsSchema.optional(),
}).refine(
  (data) => {
    if (data.withdrawal_method === "bank_transfer") {
      return !!data.bank_details;
    }
    if (data.withdrawal_method === "upi") {
      return !!data.upi_details;
    }
    return true;
  },
  {
    message: "Missing required details for selected withdrawal method",
    path: ["withdrawal_method"],
  }
);

export const confirmCashPaymentInputSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID format"),
  payment_id: z.string().optional(),
  note: z.string().optional(),
});

export const adminWithdrawalActionInputSchema = z.object({
  withdrawal_id: z.string().uuid("Invalid withdrawal ID"),
  action: z.enum(["mark_processing", "approve_completed", "reject_failed", "cancel"]),
  payout_reference: z.string().optional(),
  admin_note: z.string().optional(),
});

export const createCashBookingPaymentSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID format"),
});
