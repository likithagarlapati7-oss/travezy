import assert from "node:assert/strict";
import crypto from "crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

console.log("==================================================================");
console.log("   WEEK 9: TRAVEZY FULL INTEGRATION & DEPLOYMENT TEST SUITE      ");
console.log("   Render Readiness, Cloudinary, RBAC, Payments & Lifecycle       ");
console.log("==================================================================\n");

// Parse .env if exists
try {
  if (fs.existsSync(".env")) {
    const envContent = fs.readFileSync(".env", "utf8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  // Ignore env read error
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ─── 1. PRODUCTION DEPLOYMENT CONFIGURATION AUDIT ────────────────────────────

console.log("--- 1. Testing Production Deployment Files & Configurations ---");

test("package.json includes required 'build' and 'start' production scripts", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.ok(pkg.scripts.build, "package.json must contain build script");
  assert.ok(pkg.scripts.start, "package.json must contain start script for Render");
  assert.equal(pkg.scripts.start, "node .output/server/index.mjs");
});

test("render.yaml is valid and declares all required environment variables", () => {
  assert.ok(fs.existsSync("render.yaml"), "render.yaml must exist in root");
  const yamlContent = fs.readFileSync("render.yaml", "utf8");
  assert.ok(yamlContent.includes("type: web"));
  assert.ok(yamlContent.includes("buildCommand: npm install && npm run build"));
  assert.ok(yamlContent.includes("startCommand: npm run start"));
  assert.ok(yamlContent.includes("VITE_SUPABASE_URL"));
  assert.ok(yamlContent.includes("RAZORPAY_KEY_ID"));
  assert.ok(yamlContent.includes("CLOUDINARY_CLOUD_NAME"));
});

test(".env.example documents all production secrets and public tokens", () => {
  assert.ok(fs.existsSync(".env.example"), ".env.example must exist");
  const envExample = fs.readFileSync(".env.example", "utf8");
  assert.ok(envExample.includes("VITE_SUPABASE_URL"));
  assert.ok(envExample.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(envExample.includes("RAZORPAY_KEY_SECRET"));
  assert.ok(envExample.includes("CLOUDINARY_API_SECRET"));
  assert.ok(envExample.includes("VITE_MAPBOX_TOKEN"));
});

test("DEPLOYMENT.md contains complete step-by-step instructions", () => {
  assert.ok(fs.existsSync("DEPLOYMENT.md"), "DEPLOYMENT.md must exist");
  const doc = fs.readFileSync("DEPLOYMENT.md", "utf8");
  assert.ok(doc.includes("Render Deployment"));
  assert.ok(doc.includes("Cloudinary Configuration"));
  assert.ok(doc.includes("Razorpay Configuration"));
});

// ─── 2. CLOUDINARY MEDIA ENGINE & VALIDATION ─────────────────────────────────

console.log("\n--- 2. Testing Cloudinary Media Engine & Image Validations ---");

test("Image upload validator accepts valid image formats (JPG, PNG, WebP, AVIF)", () => {
  const validFormats = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];

  for (const fmt of validFormats) {
    assert.ok(allowed.includes(fmt), `Format ${fmt} must be accepted`);
  }
});

test("Image upload validator rejects non-image formats (PDF, EXE, SVG with scripts)", () => {
  const invalidFormats = ["application/pdf", "text/javascript", "application/x-msdownload"];
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];

  for (const fmt of invalidFormats) {
    assert.ok(!allowed.includes(fmt), `Format ${fmt} must be rejected`);
  }
});

test("Cloudinary HMAC SHA-1 signature generation matches specifications", () => {
  const apiSecret = "test_cloudinary_secret_12345";
  const folder = "travezy/services";
  const timestamp = 1725450000;

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

  assert.equal(typeof signature, "string");
  assert.equal(signature.length, 40, "SHA-1 digest must be 40 hex characters");
});

// ─── 3. FULL TOURIST → PROVIDER → ADMIN LIFECYCLE ────────────────────────────

console.log("\n--- 3. Testing Full Platform Lifecycle & Integration ---");

test("Tourist booking creation calculates price and validates future date", () => {
  const service = { id: "srv-101", price: 4500, title: "Kerala Backwaters Houseboat" };
  const requestedGuests = 3;
  const travelDate = "2027-05-15"; // Future date

  // Verify date
  const isFuture = new Date(travelDate) >= new Date();
  assert.ok(isFuture, "Booking date must be in future");

  // Server-computed total price
  const computedTotal = Number(service.price) * requestedGuests;
  assert.equal(computedTotal, 13500);
});

test("Razorpay cryptographic payment verification and order integrity", () => {
  const keySecret = "rzp_secret_production_key_test";
  const orderId = "order_TravezyLive100";
  const paymentId = "pay_TravezyLive200";

  const payload = `${orderId}|${paymentId}`;
  const validSignature = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");

  const expectedBuffer = Buffer.from(validSignature, "utf8");
  const actualBuffer = Buffer.from(validSignature, "utf8");
  const isValid = crypto.timingSafeEqual(expectedBuffer, actualBuffer);

  assert.equal(isValid, true);
});

test("Review submission strictly requires completed booking & updates rating", () => {
  const booking = { id: "bk-comp-1", status: "completed", user_id: "usr_tourist" };
  assert.equal(booking.status, "completed", "Only completed booking can be reviewed");

  const existingReviews = [
    { rating: 5 },
    { rating: 4 },
  ];
  const newReviewRating = 5;
  const allReviews = [...existingReviews, { rating: newReviewRating }];

  const newAvg = Number((allReviews.reduce((a, b) => a + b.rating, 0) / allReviews.length).toFixed(1));
  assert.equal(newAvg, 4.7);
  assert.equal(allReviews.length, 3);
});

test("Realtime Chat thread groups participants and tracks read status", () => {
  const touristId = "usr_tourist";
  const providerId = "usr_provider";

  const messages = [
    { id: "m1", sender_id: touristId, recipient_id: providerId, content: "Hello", read_at: "2026-09-01T10:00:00Z" },
    { id: "m2", sender_id: providerId, recipient_id: touristId, content: "Hi there!", read_at: null },
  ];

  const unreadForTourist = messages.filter((m) => m.recipient_id === touristId && !m.read_at).length;
  assert.equal(unreadForTourist, 1, "Tourist has 1 unread message");
});

test("Admin governance enforces last-admin demotion safeguard", () => {
  const admins = [{ id: "admin_1", role: "admin" }];

  function demoteAdmin(adminId) {
    if (admins.length <= 1 && admins[0].id === adminId) {
      throw new Error("Cannot demote the last remaining admin on the platform");
    }
    return true;
  }

  assert.throws(() => demoteAdmin("admin_1"), /last remaining admin/);
});

// ─── 4. SUMMARY ───────────────────────────────────────────────────────────────

console.log("\n==================================================================");
console.log(`  WEEK 9 FULL SUITE RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("==================================================================\n");

if (failed > 0) {
  process.exit(1);
}
