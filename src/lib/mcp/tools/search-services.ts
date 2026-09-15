import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_services",
  title: "Search travel listings",
  description:
    "Search active Travezy listings (stays, tours, experiences, transport) by keyword, destination, category, price and rating.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free text matched against title and destination."),
    category: z.enum(["hotel", "tour", "experience", "transport"]).optional(),
    country: z.string().trim().optional(),
    city: z.string().trim().optional(),
    max_price: z.number().positive().optional(),
    min_rating: z.number().min(0).max(5).optional(),
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("services")
      .select("id, title, description, category, destination, country, state, city, price, currency, rating, image_url")
      .eq("is_active", true);

    if (input.query) q = q.or(`title.ilike.%${input.query}%,destination.ilike.%${input.query}%`);
    if (input.category) q = q.eq("category", input.category);
    if (input.country) q = q.ilike("country", input.country);
    if (input.city) q = q.ilike("city", input.city);
    if (input.max_price !== undefined) q = q.lte("price", input.max_price);
    if (input.min_rating !== undefined) q = q.gte("rating", input.min_rating);

    const { data, error } = await q.order("rating", { ascending: false }).limit(input.limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { services: data ?? [] },
    };
  },
});
