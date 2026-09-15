import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_booking",
  title: "Create a booking",
  description:
    "Create a pending booking for the signed-in traveller on a listing. Total price is computed from the listing price and guest count.",
  inputSchema: {
    service_id: z.string().uuid(),
    guests: z.number().int().min(1).max(30).default(1),
    travel_date: z.string().date().optional().describe("Travel date as YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ service_id, guests, travel_date }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, price, is_active")
      .eq("id", service_id)
      .maybeSingle();
    if (serviceError) return { content: [{ type: "text", text: serviceError.message }], isError: true };
    if (!service || !service.is_active) {
      return { content: [{ type: "text", text: "Listing not found or no longer bookable" }], isError: true };
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        user_id: ctx.getUserId()!,
        service_id,
        guests,
        travel_date: travel_date ?? null,
        total_price: Number(service.price) * guests,
        status: "pending",
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { booking: data },
    };
  },
});
