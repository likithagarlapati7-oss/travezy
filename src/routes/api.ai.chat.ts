import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { chatRequestSchema } from "@/lib/ai.schema";
import { processChatConversation } from "@/lib/ai.server";

function getSupabase() {
  const env = process.env as Record<string, string | undefined>;
  const url = env["SUPABASE_URL"] || env["VITE_SUPABASE_URL"] || "";
  const key =
    env["SUPABASE_PUBLISHABLE_KEY"] ||
    env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    "";

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = chatRequestSchema.parse(body);

          const supabase = getSupabase();
          const result = await processChatConversation(
            supabase,
            parsed.message,
            parsed.conversationHistory,
            parsed.preferences
          );

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ error: e.message || "Failed to process AI chat" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
