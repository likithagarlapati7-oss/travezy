import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bookingInputSchema } from "./bookings.schema";
import {
  checkAvailability,
  getBackendUserRole,
  requireProvider,
  requireTourist,
  validateStatusTransition,
} from "./bookings.server";

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bookingInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    // 1. Assert tourist role
    await requireTourist(context.supabase, context.userId);

    // 2. Fetch service details securely
    let service: any = null;
    try {
      const { data: s, error: sErr } = await context.supabase
        .from("services")
        .select("*")
        .eq("id", data.service_id)
        .maybeSingle();
      if (!sErr && s) {
        service = s;
      }
    } catch {
      // Database query error fallback
    }

    if (!service) {
      const { getAllCuratedServices } = await import("./travezy");
      const curated = getAllCuratedServices().find((c) => c.id === data.service_id);
      if (curated) {
        service = curated;
      }
    }

    if (!service) {
      throw new Error("Service not found");
    }

    if (!service.is_active) {
      throw new Error("Cannot book an inactive service");
    }

    // 3. Check capacity/availability on travel_date immediately before booking
    const availability = await checkAvailability(
      context.supabase,
      data.service_id,
      data.travel_date,
      data.guests
    );
    if (!availability.available) {
      throw new Error(`Insufficient capacity. Only ${availability.capacity} slots left on this date.`);
    }

    // 4. Calculate total amount securely
    const totalAmount = Number(service.price) * data.guests;

    // Resolve valid service_id for database foreign key constraint:
    // If data.service_id is in remote DB, use it directly.
    // If it is a curated service not in DB, anchor to a valid DB service and encode curated metadata in notes.
    let dbServiceId = data.service_id;
    let isCurated = false;

    try {
      const { data: existingService } = await context.supabase
        .from("services")
        .select("id")
        .eq("id", data.service_id)
        .maybeSingle();

      if (!existingService) {
        isCurated = true;
        const { data: dbMatches } = await context.supabase
          .from("services")
          .select("id")
          .eq("category", service.category)
          .eq("is_active", true)
          .limit(1);

        if (dbMatches && dbMatches.length > 0 && dbMatches[0]) {
          dbServiceId = dbMatches[0].id;
        } else {
          const { data: anyDbService } = await context.supabase
            .from("services")
            .select("id")
            .eq("is_active", true)
            .limit(1);
          if (anyDbService && anyDbService.length > 0 && anyDbService[0]) {
            dbServiceId = anyDbService[0].id;
          }
        }
      }
    } catch {
      // Fallback
    }

    const userNotes = data.notes?.trim() || "";
    const notesPayload = isCurated
      ? `[Curated:${data.service_id}]${userNotes ? " " + userNotes : ""}`
      : userNotes || null;

    // 5. Insert booking (status starts as 'pending')
    const baseBookingPayload = {
      user_id: context.userId,
      service_id: dbServiceId,
      travel_date: data.travel_date,
      guests: data.guests,
      total_price: totalAmount,
      status: "pending",
    };

    let bookingRes = await context.supabase
      .from("bookings")
      .insert({
        ...baseBookingPayload,
        notes: notesPayload,
      })
      .select("id")
      .single();

    // If remote schema cache is missing optional notes/provider_id columns, fallback gracefully
    if (
      bookingRes.error &&
      (bookingRes.error.message?.includes("schema cache") ||
        bookingRes.error.code === "PGRST204" ||
        bookingRes.error.message?.includes("'notes'") ||
        bookingRes.error.message?.includes("'provider_id'"))
    ) {
      bookingRes = await context.supabase
        .from("bookings")
        .insert(baseBookingPayload)
        .select("id")
        .single();
    }

    if (bookingRes.error) throw new Error(bookingRes.error.message);

    // 6. Trigger in-app & transactional notifications
    try {
      const { data: touristProfile } = await context.supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", context.userId)
        .maybeSingle();

      let providerUserId = "";
      if (service.provider_id) {
        const { data: prov } = await context.supabase
          .from("providers")
          .select("user_id")
          .eq("id", service.provider_id)
          .maybeSingle();
        providerUserId = prov?.user_id || "";
      }

      if (providerUserId) {
        const { notifyBookingCreated } = await import("./notifications.server");
        await notifyBookingCreated({
          bookingId: bookingRes.data.id,
          serviceId: data.service_id,
          serviceTitle: service.title,
          touristId: context.userId,
          touristName: touristProfile?.full_name || touristProfile?.email || "Guest",
          providerUserId,
          totalPrice: totalAmount,
        });
      }
    } catch (notifErr) {
      console.warn("[createBooking notification error]", notifErr);
    }

    return { id: bookingRes.data.id };
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "confirmed", "cancelled", "completed", "rejected"]),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    // 1. Fetch booking record
    const { data: booking, error: bErr } = await context.supabase
      .from("bookings")
      .select("*, services(id, title, provider_id)")
      .eq("id", data.id)
      .maybeSingle();

    if (bErr || !booking) {
      throw new Error("Booking not found");
    }

    const role = await getBackendUserRole(context.supabase, context.userId);
    if (!role) throw new Error("Unauthorized");

    // 2. Authorization checks
    if (role === "tourist") {
      // Tourist can ONLY cancel their own booking
      if (booking.user_id !== context.userId) {
        throw new Error("Forbidden: you do not own this booking");
      }
      if (data.status !== "cancelled") {
        throw new Error("Forbidden: tourists can only cancel bookings");
      }
    } else if (role === "provider") {
      // Provider must own the service being booked
      const providerId = await requireProvider(context.supabase, context.userId);
      if (booking.provider_id !== providerId && booking.services?.provider_id !== providerId) {
        throw new Error("Forbidden: this booking belongs to another provider's service");
      }
    } else if (role !== "admin") {
      throw new Error("Forbidden");
    }

    // 3. State machine validation
    validateStatusTransition(booking.status, data.status);

    // 4. Perform update with schema-safe fallback
    let updateRes = await context.supabase
      .from("bookings")
      .update({
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    // If remote schema cache does not have updated_at column, fallback to updating status only
    if (
      updateRes.error &&
      (updateRes.error.message?.includes("updated_at") ||
        updateRes.error.message?.includes("schema cache") ||
        updateRes.error.code === "PGRST204")
    ) {
      updateRes = await context.supabase
        .from("bookings")
        .update({
          status: data.status,
        })
        .eq("id", data.id);
    }

    if (updateRes.error) throw new Error(updateRes.error.message);

    // 5. Trigger status change notification
    try {
      let providerUserId = "";
      const provId = booking.provider_id || booking.services?.provider_id;
      if (provId) {
        const { data: prov } = await context.supabase
          .from("providers")
          .select("user_id")
          .eq("id", provId)
          .maybeSingle();
        providerUserId = prov?.user_id || "";
      }

      const { notifyBookingStatusChanged } = await import("./notifications.server");
      await notifyBookingStatusChanged({
        bookingId: data.id,
        serviceId: booking.service_id,
        serviceTitle: booking.services?.title || "Marketplace Experience",
        touristId: booking.user_id,
        providerUserId,
        newStatus: data.status,
      });
    } catch (notifErr) {
      console.warn("[updateBookingStatus notification error]", notifErr);
    }

    return { id: data.id, status: data.status };
  });

export const getBookingAvailability = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({
      service_id: z.string().min(1),
      travel_date: z.string(),
      guests: z.number().int().min(1),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'];
    const SUPABASE_PUBLISHABLE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY'] || process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
    
    let client: any = null;
    if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { persistSession: false },
        });
      } catch {
        // Fallback
      }
    }

    return await checkAvailability(
      client,
      data.service_id,
      data.travel_date,
      data.guests
    );
  });
