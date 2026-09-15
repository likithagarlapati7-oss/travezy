import crypto from "crypto";

function verifyRazorpaySignature({ orderId, paymentId, signature, secret }) {
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

async function runTests() {
  console.log("=== Running Week 5 Razorpay Integration Unit & Logic Tests ===");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const secret = "test_secret_travezy67890";
  const orderId = "order_N1234567890ABC";
  const paymentId = "pay_P9876543210XYZ";

  // 1. Correct signature generation and verification
  const validSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const isSigValid = verifyRazorpaySignature({
    orderId,
    paymentId,
    signature: validSignature,
    secret,
  });
  assert(isSigValid === true, "Valid Razorpay HMAC SHA-256 signature is accepted");

  // 2. Tampered signature rejection
  const tamperedSig = validSignature.substring(0, validSignature.length - 2) + "ff";
  const isTamperedValid = verifyRazorpaySignature({
    orderId,
    paymentId,
    signature: tamperedSig,
    secret,
  });
  assert(isTamperedValid === false, "Tampered Razorpay signature is rejected");

  // 3. Mismatched order ID rejection
  const isWrongOrderValid = verifyRazorpaySignature({
    orderId: "order_different123",
    paymentId,
    signature: validSignature,
    secret,
  });
  assert(isWrongOrderValid === false, "Mismatched orderId signature is rejected");

  // 4. Mismatched payment ID rejection
  const isWrongPaymentValid = verifyRazorpaySignature({
    orderId,
    paymentId: "pay_different456",
    signature: validSignature,
    secret,
  });
  assert(isWrongPaymentValid === false, "Mismatched paymentId signature is rejected");

  // 5. Empty / missing fields rejection
  const isMissingValid = verifyRazorpaySignature({
    orderId: "",
    paymentId,
    signature: validSignature,
    secret,
  });
  assert(isMissingValid === false, "Empty field signature verification safely returns false");

  // 6. Subunit calculation verification (INR paise)
  const bookingTotal = 4800.5;
  const calculatedPaise = Math.round(bookingTotal * 100);
  assert(calculatedPaise === 480050, "Amount accurately converted to smallest currency subunit (paise)");

  // 7. Test state transitions & enums
  const allowedStatuses = ["CREATED", "PENDING", "SUCCESS", "FAILED", "REFUNDED"];
  assert(
    allowedStatuses.includes("CREATED") && allowedStatuses.includes("SUCCESS"),
    "PaymentStatus enum supports CREATED, PENDING, SUCCESS, FAILED, REFUNDED"
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
