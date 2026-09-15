import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_service",
  title: "Get listing details",
  description: "Fetch one Travezy listing with its public reviews by listing id.",
  inputSchema: { service_id: z.string().uuid().describe("Listing id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ service_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [serviceRes, reviewsRes] = await Promise.all([
      supabase.from("services").select("*").eq("id", service_id).maybeSingle(),
      supabase
        .from("reviews")
        .select("id, rating, comment, created_at")
        .eq("service_id", service_id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (serviceRes.error) return { content: [{ type: "text", text: serviceRes.error.message }], isError: true };
    if (!serviceRes.data) return { content: [{ type: "text", text: "Listing not found" }], isError: true };
    const payload = { service: serviceRes.data, reviews: reviewsRes.data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
