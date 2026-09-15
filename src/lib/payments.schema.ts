import { z } from "zod";

export const createOrderInputSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID format"),
});

export const verifyPaymentInputSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID format"),
  razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay signature is required"),
  payment_method: z.string().optional(),
});

export const recordFailureInputSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID format"),
  razorpay_order_id: z.string().optional(),
  error_code: z.string().optional(),
  error_description: z.string().optional(),
});
