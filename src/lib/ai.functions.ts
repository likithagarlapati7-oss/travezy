import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  chatRequestSchema,
  itineraryInputSchema,
  translationRequestSchema,
} from "./ai.schema";
import {
  generateItinerary,
  processChatConversation,
  translateTravelText,
} from "./ai.server";

function getSupabaseServerClient() {
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

/**
 * Server function for conversational chat with AI assistant
 */
export const aiChatFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => chatRequestSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    return await processChatConversation(
      supabase,
      data.message,
      data.conversationHistory,
      data.preferences
    );
  });

/**
 * Server function for structured itinerary generation
 */
export const aiGenerateItineraryFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => itineraryInputSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    return await generateItinerary(supabase, data);
  });

/**
 * Server function for travel translation
 */
export const aiTranslateFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => translationRequestSchema.parse(data))
  .handler(async ({ data }) => {
    return await translateTravelText(data);
  });

