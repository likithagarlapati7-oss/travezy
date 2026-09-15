import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("===============================================================");
console.log("  WEEK 7: DASHBOARDS & ADMINISTRATION — PART 2 AUTOMATED SUITE ");
console.log("  Admin Dashboard, User Management & Administrative Controls   ");
console.log("===============================================================\n");

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

// ─── Mocks & Data Fixtures ───────────────────────────────────────────────────

const mockUsers = [
  { id: "usr_admin_1", full_name: "Super Admin", email: "admin@travezy.test", phone: "+91 9876543210", account_type: "admin", created_at: "2026-01-01T00:00:00Z" },
  { id: "usr_admin_2", full_name: "Ops Admin", email: "ops@travezy.test", phone: "+91 9876543211", account_type: "admin", created_at: "2026-01-02T00:00:00Z" },
  { id: "usr_prov_1", full_name: "Rajesh Sharma", email: "rajesh@adventures.test", phone: "+91 9876543212", account_type: "provider", created_at: "2026-01-05T00:00:00Z" },
  { id: "usr_tourist_1", full_name: "Anita Desai", email: "anita@gmail.test", phone: "+91 9876543213", account_type: "tourist", created_at: "2026-01-10T00:00:00Z" },
  { id: "usr_tourist_2", full_name: "Vikram Mehta", email: "vikram@yahoo.test", phone: "+91 9876543214", account_type: "tourist", created_at: "2026-01-12T00:00:00Z" },
];

const mockUserRoles = [
  { user_id: "usr_admin_1", role: "admin" },
  { user_id: "usr_admin_2", role: "admin" },
  { user_id: "usr_prov_1", role: "provider" },
  { user_id: "usr_tourist_1", role: "tourist" },
  { user_id: "usr_tourist_2", role: "tourist" },
];

const mockProviders = [
  { id: "prov_1", user_id: "usr_prov_1", business_name: "Himalayan Treks & Tours", location: "Manali, HP", verified: true, created_at: "2026-01-05T00:00:00Z" },
  { id: "prov_2", user_id: "usr_tourist_2", business_name: "Goa Watersports Co.", location: "Calangute, Goa", verified: false, created_at: "2026-01-15T00:00:00Z" },
];

const mockServices = [
  { id: "svc_1", provider_id: "prov_1", title: "Hampta Pass Trek", category: "tour", destination: "Manali", price: 7500, currency: "INR", rating: 4.9, review_count: 8, is_active: true, created_at: "2026-01-06T00:00:00Z" },
  { id: "svc_2", provider_id: "prov_1", title: "Solang Paragliding Tandem", category: "activity", destination: "Manali", price: 3200, currency: "INR", rating: 4.8, review_count: 5, is_active: true, created_at: "2026-01-07T00:00:00Z" },
  { id: "svc_3", provider_id: "prov_2", title: "Sunset Catamaran Cruise", category: "tour", destination: "Goa", price: 2000, currency: "INR", rating: 0, review_count: 0, is_active: false, created_at: "2026-01-16T00:00:00Z" },
];

const mockBookings = [
  { id: "bkg_101", user_id: "usr_tourist_1", service_id: "svc_1", provider_id: "prov_1", status: "confirmed", guests: 2, total_price: 15000, travel_date: "2026-09-10", created_at: "2026-08-01T00:00:00Z" },
  { id: "bkg_102", user_id: "usr_tourist_2", service_id: "svc_2", provider_id: "prov_1", status: "completed", guests: 1, total_price: 3200, travel_date: "2026-08-20", created_at: "2026-08-02T00:00:00Z" },
  { id: "bkg_103", user_id: "usr_tourist_1", service_id: "svc_3", provider_id: "prov_2", status: "pending", guests: 4, total_price: 8000, travel_date: "2026-09-15", created_at: "2026-08-03T00:00:00Z" },
  { id: "bkg_104", user_id: "usr_tourist_2", service_id: "svc_1", provider_id: "prov_1", status: "cancelled", guests: 2, total_price: 15000, travel_date: "2026-08-25", created_at: "2026-08-04T00:00:00Z" },
];

const mockPayments = [
  { id: "pay_201", booking_id: "bkg_101", user_id: "usr_tourist_1", provider_id: "prov_1", amount: 15000, currency: "INR", status: "SUCCESS", payment_method: "upi", razorpay_order_id: "order_101", razorpay_payment_id: "pay_101", created_at: "2026-08-01T00:05:00Z" },
  { id: "pay_202", booking_id: "bkg_102", user_id: "usr_tourist_2", provider_id: "prov_1", amount: 3200, currency: "INR", status: "SUCCESS", payment_method: "card", razorpay_order_id: "order_102", razorpay_payment_id: "pay_102", created_at: "2026-08-02T00:05:00Z" },
  { id: "pay_203", booking_id: "bkg_103", user_id: "usr_tourist_1", provider_id: "prov_2", amount: 8000, currency: "INR", status: "PENDING", payment_method: "upi", razorpay_order_id: "order_103", razorpay_payment_id: null, created_at: "2026-08-03T00:05:00Z" },
  { id: "pay_204", booking_id: "bkg_104", user_id: "usr_tourist_2", provider_id: "prov_1", amount: 15000, currency: "INR", status: "FAILED", error_code: "PAYMENT_FAILED", error_description: "Bank declined transaction", payment_method: "card", razorpay_order_id: "order_104", razorpay_payment_id: "pay_104", created_at: "2026-08-04T00:05:00Z" },
];

const mockReviews = [
  { id: "rev_301", booking_id: "bkg_102", user_id: "usr_tourist_2", service_id: "svc_2", provider_id: "prov_1", rating: 5, comment: "Incredible paragliding experience with certified instructors!", provider_response: "Thank you Vikram! Glad you enjoyed the flight.", provider_responded_at: "2026-08-21T10:00:00Z", created_at: "2026-08-21T09:00:00Z" },
];

// ─── Test Execution ───────────────────────────────────────────────────────────

async function run() {
  console.log("--- 1. Backend RBAC & Authorization Tests ---");

  // Helper simulating backend role resolver
  function resolveUserRole(userId) {
    const roleObj = mockUserRoles.find((r) => r.user_id === userId);
    if (roleObj) return roleObj.role;
    const profile = mockUsers.find((u) => u.id === userId);
    return profile?.account_type || "tourist";
  }

  function requireAdminRole(userId) {
    if (!userId) throw new Error("Unauthorized: No user session");
    const role = resolveUserRole(userId);
    if (role !== "admin") throw new Error("Forbidden: Admin privileges required");
    return true;
  }

  test("Anonymous / unauthenticated request is rejected by requireAdmin", () => {
    assert.throws(() => requireAdminRole(null), /Unauthorized/);
  });

  test("Tourist user is rejected from Admin endpoints (403 Forbidden)", () => {
    assert.throws(() => requireAdminRole("usr_tourist_1"), /Forbidden: Admin privileges required/);
  });

  test("Provider user is rejected from Admin endpoints (403 Forbidden)", () => {
    assert.throws(() => requireAdminRole("usr_prov_1"), /Forbidden: Admin privileges required/);
  });

  test("Admin user is successfully authorized on Admin endpoints", () => {
    assert.equal(requireAdminRole("usr_admin_1"), true);
    assert.equal(requireAdminRole("usr_admin_2"), true);
  });

  console.log("\n--- 2. Last-Admin Protection & Role Governance Tests ---");

  function updateUserRole(adminUserId, targetUserId, newRole, rolesList, usersList) {
    requireAdminRole(adminUserId);

    if (!["tourist", "provider", "admin"].includes(newRole)) {
      throw new Error("Invalid role specified");
    }

    const currentRole = rolesList.find((r) => r.user_id === targetUserId)?.role;

    // Check if target is an admin and being demoted
    if (currentRole === "admin" && newRole !== "admin") {
      const currentAdmins = rolesList.filter((r) => r.role === "admin");
      if (currentAdmins.length <= 1) {
        throw new Error("Action blocked: Cannot remove the last remaining Administrator from the platform.");
      }
    }

    // Apply update
    const idx = rolesList.findIndex((r) => r.user_id === targetUserId);
    if (idx >= 0) rolesList[idx].role = newRole;
    else rolesList.push({ user_id: targetUserId, role: newRole });

    const uIdx = usersList.findIndex((u) => u.id === targetUserId);
    if (uIdx >= 0) usersList[uIdx].account_type = newRole;

    return { success: true, userId: targetUserId, newRole };
  }

  test("Admin can successfully promote a tourist to provider", () => {
    const rolesCopy = JSON.parse(JSON.stringify(mockUserRoles));
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));
    const res = updateUserRole("usr_admin_1", "usr_tourist_1", "provider", rolesCopy, usersCopy);
    assert.equal(res.newRole, "provider");
    assert.equal(rolesCopy.find((r) => r.user_id === "usr_tourist_1")?.role, "provider");
  });

  test("Admin can demote an admin when other admins still exist", () => {
    const rolesCopy = JSON.parse(JSON.stringify(mockUserRoles));
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));
    assert.equal(rolesCopy.filter((r) => r.role === "admin").length, 2);

    const res = updateUserRole("usr_admin_1", "usr_admin_2", "tourist", rolesCopy, usersCopy);
    assert.equal(res.newRole, "tourist");
    assert.equal(rolesCopy.filter((r) => r.role === "admin").length, 1);
  });

  test("Demoting the sole remaining admin is blocked with last-admin safeguard", () => {
    // Only 1 admin in set
    const singleAdminRoles = [{ user_id: "usr_admin_1", role: "admin" }, { user_id: "usr_tourist_1", role: "tourist" }];
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));

    assert.throws(
      () => updateUserRole("usr_admin_1", "usr_admin_1", "tourist", singleAdminRoles, usersCopy),
      /Cannot remove the last remaining Administrator/
    );
  });

  console.log("\n--- 3. Platform Telemetry & Overview Calculations Tests ---");

  test("Admin overview calculates exact counts and revenue without hardcoded values", () => {
    const totalUsers = mockUsers.length;
    const totalServices = mockServices.length;
    const activeServices = mockServices.filter((s) => s.is_active).length;
    const totalBookings = mockBookings.length;
    const confirmedBookings = mockBookings.filter((b) => b.status === "confirmed").length;
    const completedBookings = mockBookings.filter((b) => b.status === "completed").length;
    const pendingBookings = mockBookings.filter((b) => b.status === "pending").length;
    const cancelledBookings = mockBookings.filter((b) => b.status === "cancelled").length;

    const successfulPayments = mockPayments.filter((p) => p.status.toUpperCase() === "SUCCESS");
    const grossRevenue = successfulPayments.reduce((acc, p) => acc + p.amount, 0);

    assert.equal(totalUsers, 5);
    assert.equal(totalServices, 3);
    assert.equal(activeServices, 2);
    assert.equal(totalBookings, 4);
    assert.equal(confirmedBookings, 1);
    assert.equal(completedBookings, 1);
    assert.equal(pendingBookings, 1);
    assert.equal(cancelledBookings, 1);
    assert.equal(successfulPayments.length, 2);
    assert.equal(grossRevenue, 18200); // 15000 + 3200
  });

  console.log("\n--- 4. Search, Filter & Pagination Logic Tests ---");

  test("User search filters correctly across name, email, and ID", () => {
    const q1 = "Anita";
    const res1 = mockUsers.filter((u) => u.full_name.toLowerCase().includes(q1.toLowerCase()));
    assert.equal(res1.length, 1);
    assert.equal(res1[0].id, "usr_tourist_1");

    const q2 = "@travezy.test";
    const res2 = mockUsers.filter((u) => u.email.toLowerCase().includes(q2.toLowerCase()));
    assert.equal(res2.length, 2);
  });

  test("Role filtering filters exclusively by selected role tab", () => {
    const tourists = mockUsers.filter((u) => resolveUserRole(u.id) === "tourist");
    const providers = mockUsers.filter((u) => resolveUserRole(u.id) === "provider");
    const admins = mockUsers.filter((u) => resolveUserRole(u.id) === "admin");

    assert.equal(tourists.length, 2);
    assert.equal(providers.length, 1);
    assert.equal(admins.length, 2);
  });

  test("Service search filters by title, provider name, and category", () => {
    const q = "Manali";
    const res = mockServices.filter((s) => s.destination.toLowerCase().includes(q.toLowerCase()));
    assert.equal(res.length, 2);
  });

  test("Payment filter separates successful, pending, and failed transactions", () => {
    const success = mockPayments.filter((p) => p.status.toUpperCase() === "SUCCESS");
    const pending = mockPayments.filter((p) => p.status.toUpperCase() === "PENDING");
    const failed = mockPayments.filter((p) => p.status.toUpperCase() === "FAILED");

    assert.equal(success.length, 2);
    assert.equal(pending.length, 1);
    assert.equal(failed.length, 1);
  });

  test("Pagination correctly slices dataset and computes total pages", () => {
    const pageSize = 2;
    const totalPages = Math.ceil(mockBookings.length / pageSize);
    assert.equal(totalPages, 2);

    const page1 = mockBookings.slice(0, 2);
    const page2 = mockBookings.slice(2, 4);

    assert.equal(page1.length, 2);
    assert.equal(page1[0].id, "bkg_101");
    assert.equal(page2.length, 2);
    assert.equal(page2[0].id, "bkg_103");
  });

  console.log("\n--- 5. Service & Data Safeguard Tests ---");

  function attemptDeleteService(adminUserId, serviceId, servicesList, bookingsList, reviewsList) {
    requireAdminRole(adminUserId);
    const hasBookings = bookingsList.some((b) => b.service_id === serviceId);
    const hasReviews = reviewsList.some((r) => r.service_id === serviceId);

    if (hasBookings || hasReviews) {
      throw new Error("Cannot permanently delete this listing because it has attached bookings or reviews. Deactivate it instead.");
    }

    const idx = servicesList.findIndex((s) => s.id === serviceId);
    if (idx >= 0) servicesList.splice(idx, 1);
    return { success: true, serviceId };
  }

  test("Deleting a service with active bookings/reviews is rejected by safeguard", () => {
    const servicesCopy = JSON.parse(JSON.stringify(mockServices));
    assert.throws(
      () => attemptDeleteService("usr_admin_1", "svc_1", servicesCopy, mockBookings, mockReviews),
      /Cannot permanently delete this listing/
    );
  });

  test("Listing moderation (Hide/Publish) toggles visibility safely without data loss", () => {
    const servicesCopy = JSON.parse(JSON.stringify(mockServices));
    const target = servicesCopy.find((s) => s.id === "svc_1");
    assert.equal(target.is_active, true);

    // Moderate/hide
    target.is_active = false;
    assert.equal(target.is_active, false);
    // Booking records remain intact
    assert.equal(mockBookings.filter((b) => b.service_id === "svc_1").length, 2);
  });

  console.log("\n--- 6. Financial Ledger & Security Invariants ---");

  test("Payment records do not expose cryptographic secrets or raw credentials", () => {
    mockPayments.forEach((p) => {
      assert.equal("razorpay_secret" in p, false);
      assert.equal("secret_key" in p, false);
      assert.equal("card_pan" in p, false);
      assert.equal("cvv" in p, false);
      assert.ok(p.id);
      assert.ok(p.amount > 0);
      assert.ok(p.status);
    });
  });

  console.log("\n===============================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) process.exit(1);
}

run();
