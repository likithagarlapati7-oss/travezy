import { createFileRoute } from "@tanstack/react-router";
import { requireTourist, authenticateRequest, checkAvailability } from "@/lib/bookings.server";
import { bookingInputSchema } from "@/lib/bookings.schema";

export const Route = createFileRoute("/api/bookings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabase, userId } = await authenticateRequest(request);
          const body = await request.json();
          const parsed = bookingInputSchema.parse(body);

          await requireTourist(supabase, userId);

          // Retrieve service details securely
          let service: any = null;
          try {
            const { data: s, error: sErr } = await supabase
              .from("services")
              .select("*")
              .eq("id", parsed.service_id)
              .maybeSingle();
            if (!sErr && s) service = s;
          } catch {
            // DB fallback
          }

          if (!service) {
            const { getAllCuratedServices } = await import("@/lib/travezy");
            const curated = getAllCuratedServices().find((c) => c.id === parsed.service_id);
            if (curated) service = curated;
          }

          if (!service) {
            return new Response(JSON.stringify({ error: "Service not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!service.is_active) {
            return new Response(JSON.stringify({ error: "Cannot book an inactive service" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Check capacity availability immediately before creating booking
          const availability = await checkAvailability(
            supabase,
            parsed.service_id,
            parsed.travel_date,
            parsed.guests
          );

          if (!availability.available) {
            return new Response(
              JSON.stringify({
                error: `Insufficient capacity. Only ${availability.capacity} slots left on this date.`,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Calculate price securely
          const totalAmount = Number(service.price) * parsed.guests;

          // Resolve valid service_id for database foreign key constraint:
          let dbServiceId = parsed.service_id;
          let isCurated = false;

          try {
            const { data: existingService } = await supabase
              .from("services")
              .select("id")
              .eq("id", parsed.service_id)
              .maybeSingle();

            if (!existingService) {
              isCurated = true;
              const { data: dbMatches } = await supabase
                .from("services")
                .select("id")
                .eq("category", service.category)
                .eq("is_active", true)
                .limit(1);

              if (dbMatches && dbMatches.length > 0 && dbMatches[0]) {
                dbServiceId = dbMatches[0].id;
              } else {
                const { data: anyDbService } = await supabase
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

          const userNotes = parsed.notes?.trim() || "";
          const notesPayload = isCurated
            ? `[Curated:${parsed.service_id}]${userNotes ? " " + userNotes : ""}`
            : userNotes || null;

          // Insert pending booking
          const baseBookingPayload = {
            user_id: userId,
            service_id: dbServiceId,
            travel_date: parsed.travel_date,
            guests: parsed.guests,
            total_price: totalAmount,
            status: "pending",
          };

          let bookingRes = await supabase
            .from("bookings")
            .insert({
              ...baseBookingPayload,
              notes: notesPayload,
            })
            .select("*")
            .single();

          // If remote schema cache is missing optional notes column, fallback gracefully
          if (
            bookingRes.error &&
            (bookingRes.error.message?.includes("schema cache") ||
              bookingRes.error.code === "PGRST204" ||
              bookingRes.error.message?.includes("'notes'") ||
              bookingRes.error.message?.includes("'provider_id'"))
          ) {
            bookingRes = await supabase
              .from("bookings")
              .insert(baseBookingPayload)
              .select("*")
              .single();
          }

          if (bookingRes.error) {
            return new Response(JSON.stringify({ error: bookingRes.error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify(bookingRes.data), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          const status = e.message.startsWith("Unauthorized") ? 401 : e.message.startsWith("Forbidden") ? 403 : 400;
          return new Response(JSON.stringify({ error: e.message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
