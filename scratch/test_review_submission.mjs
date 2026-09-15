import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testReviewSubmission() {
  console.log("--- 1. Testing Auth / Sign Up Test Tourist ---");
  const testEmail = `tourist_test_${Date.now()}@example.com`;
  const testPassword = "Tr@v3zy#2026!Secur3";

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: "Test Tourist",
        account_type: "tourist",
      },
    },
  });

  console.log("Sign up result:", authData?.user?.id, authError);

  if (authError || !authData?.user) {
    console.error("Sign up failed:", authError);
    return;
  }

  // Sign in to establish active session for RLS
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  console.log("Sign in result:", signInData?.user?.id, signInError);

  const userId = authData.user.id;

  // Let's check services to find a service to review
  const { data: services, error: sErr } = await supabase
    .from("services")
    .select("id, title")
    .limit(1);

  console.log("Found service:", services?.[0]);
  if (!services || services.length === 0) {
    console.log("No services found");
    return;
  }

  const serviceId = services[0].id;

  // Let's create a booking for this tourist
  console.log("--- 2. Inserting a test booking ---");
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .insert({
      user_id: userId,
      service_id: serviceId,
      travel_date: "2026-10-10",
      guests: 2,
      total_price: 5000,
      status: "completed",
    })
    .select("*")
    .single();

  console.log("Created booking:", booking?.id, bErr);

  if (bErr || !booking) {
    console.error("Failed to create booking:", bErr);
    return;
  }

  // Now, let's attempt to insert into reviews with booking_id!
  console.log("--- 3. Testing review insertion with booking_id ---");
  const insertWithBookingId = await supabase
    .from("reviews")
    .insert({
      user_id: userId,
      service_id: serviceId,
      booking_id: booking.id,
      rating: 5,
      comment: "Wonderful trip!",
    })
    .select("*");

  console.log("Insert with booking_id result:", insertWithBookingId.data, insertWithBookingId.error);

  console.log("--- 4. Testing review insertion WITHOUT booking_id ---");
  const insertWithoutBookingId = await supabase
    .from("reviews")
    .insert({
      user_id: userId,
      service_id: serviceId,
      rating: 5,
      comment: "Wonderful trip without booking_id!",
    })
    .select("*");

  console.log("Insert without booking_id result:", insertWithoutBookingId.data, insertWithoutBookingId.error);
}

testReviewSubmission();
