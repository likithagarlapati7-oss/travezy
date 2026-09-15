import { useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  createPaymentOrder,
  recordPaymentFailure,
  verifyPayment,
} from "@/lib/payments.functions";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/**
 * Dynamically injects the official Razorpay Checkout script if not already loaded.
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayCheckoutOptions {
  bookingId: string;
  serviceTitle: string;
  paymentMethod?: string | undefined;
  customerName?: string | undefined;
  customerEmail?: string | undefined;
  customerPhone?: string | undefined;
  onSuccess?: ((paymentResult: any) => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
  onDismiss?: (() => void) | undefined;
}

export function useRazorpay() {
  const [isProcessing, setIsProcessing] = useState(false);

  const createOrderFn = useServerFn(createPaymentOrder);
  const verifyPaymentFn = useServerFn(verifyPayment);
  const recordFailureFn = useServerFn(recordPaymentFailure);

  const initiatePayment = useCallback(
    async (options: RazorpayCheckoutOptions) => {
      const {
        bookingId,
        serviceTitle,
        paymentMethod = "ONLINE",
        customerName,
        customerEmail,
        customerPhone,
        onSuccess,
        onError,
        onDismiss,
      } = options;

      setIsProcessing(true);

      try {
        // 1. Ensure Razorpay SDK script is loaded
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error(
            "Failed to load Razorpay payment gateway. Please check your internet connection."
          );
        }

        // 2. Request backend order creation (Server calculates price and generates order)
        const orderData = await createOrderFn({
          data: { booking_id: bookingId },
        });

        const { orderId, amountInSubunits, currency, keyId } = orderData;
        const isSimulated = Boolean((orderData as any).isSimulated);

        // 3. Handle Development Test Simulation Mode
        if (isSimulated) {
          toast.loading("Processing test payment simulation…", { id: "razorpay-verify" });
          const simPaymentId = `pay_sim_${Date.now().toString().slice(-8)}`;
          const simSignature = `sig_sim_${simPaymentId}`;

          setTimeout(async () => {
            try {
              const verifyResult = await verifyPaymentFn({
                data: {
                  booking_id: bookingId,
                  razorpay_order_id: orderId,
                  razorpay_payment_id: simPaymentId,
                  razorpay_signature: simSignature,
                  payment_method: paymentMethod || "CARD",
                },
              });

              toast.success("Payment verified successfully! 🎉", { id: "razorpay-verify" });
              setIsProcessing(false);
              onSuccess?.(verifyResult);
            } catch (err: any) {
              console.error("[Payment verification error]", err);
              toast.error(
                err.message || "Payment verification failed. Please contact support.",
                { id: "razorpay-verify" }
              );
              setIsProcessing(false);
              onError?.(err);
            }
          }, 800);
          return;
        }

        const razorpayConfig: Record<string, any> = {
          key: keyId,
          amount: amountInSubunits,
          currency: currency || "INR",
          name: "Travezy",
          description: `Booking for ${serviceTitle}`,
          order_id: orderId,
          image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=200&q=80",
          prefill: {
            name: customerName || "",
            email: customerEmail || "",
            contact: customerPhone || "",
            method: paymentMethod.toLowerCase() === "upi" ? "upi" : paymentMethod.toLowerCase() === "net_banking" ? "netbanking" : paymentMethod.toLowerCase() === "wallet" ? "wallet" : "card",
          },
          theme: {
            color: "#0284c7",
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              toast.loading("Verifying payment security…", { id: "razorpay-verify" });

              // 4. Cryptographically verify signature on the server
              const verifyResult = await verifyPaymentFn({
                data: {
                  booking_id: bookingId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  payment_method: paymentMethod || "ONLINE",
                },
              });

              toast.success("Payment verified successfully!", { id: "razorpay-verify" });
              setIsProcessing(false);
              onSuccess?.(verifyResult);
            } catch (err: any) {
              console.error("[Payment verification error]", err);
              toast.error(
                err.message || "Payment verification failed. Please contact support.",
                { id: "razorpay-verify" }
              );
              setIsProcessing(false);
              onError?.(err);
            }
          },
          modal: {
            ondismiss: async () => {
              setIsProcessing(false);
              try {
                await recordFailureFn({
                  data: {
                    booking_id: bookingId,
                    razorpay_order_id: orderId,
                    error_code: "CHECKOUT_DISMISSED",
                    error_description: "Tourist closed the Razorpay payment modal",
                  },
                });
              } catch (e) {
                console.warn("Failed to log checkout dismissal", e);
              }
              onDismiss?.();
            },
          },
        };

        const rzp = new window.Razorpay(razorpayConfig);

        rzp.on("payment.failed", async (response: any) => {
          setIsProcessing(false);
          const errorMsg =
            response.error?.description || "Payment failed at gateway";
          toast.error(`Payment failed: ${errorMsg}`);

          try {
            await recordFailureFn({
              data: {
                booking_id: bookingId,
                razorpay_order_id: orderId,
                error_code: response.error?.code || "PAYMENT_FAILED",
                error_description: errorMsg,
              },
            });
          } catch (e) {
            console.warn("Failed to log payment failure", e);
          }

          onError?.(new Error(errorMsg));
        });

        rzp.open();
      } catch (err: any) {
        setIsProcessing(false);
        const message = err.message || "Failed to initialize payment";
        toast.error(message);
        onError?.(err);
      }
    },
    [createOrderFn, verifyPaymentFn, recordFailureFn]
  );

  return {
    initiatePayment,
    isProcessing,
  };
}
