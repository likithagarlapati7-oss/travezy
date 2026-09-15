import { createFileRoute } from "@tanstack/react-router";
import { translationRequestSchema } from "@/lib/ai.schema";
import { translateTravelText } from "@/lib/ai.server";

export const Route = createFileRoute("/api/ai/translate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = translationRequestSchema.parse(body);

          const result = await translateTravelText(parsed);

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({
              error: e.message || "Failed to process translation",
            }),
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
