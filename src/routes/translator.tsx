import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { TravelTranslator } from "@/components/TravelTranslator";

export const Route = createFileRoute("/translator")({
  head: () => ({
    meta: [
      { title: "Travel Translator — Travezy" },
      {
        name: "description",
        content:
          "Translate travel phrases, directions, emergency requests, and itineraries across Hindi, Telugu, Tamil, French, Spanish, German, and more.",
      },
      { property: "og:title", content: "Travel Translator — Travezy" },
      {
        property: "og:description",
        content:
          "Instant travel phrase and itinerary translation powered by AI on Travezy.",
      },
    ],
  }),
  component: TranslatorPage,
});

function TranslatorPage() {
  return (
    <PageShell
      eyebrow="Multilingual Travel"
      title="Travel Translator"
      subtitle="Translate essential travel phrases, questions, directions, and itineraries across regional and global languages."
    >
      <TravelTranslator />
    </PageShell>
  );
}
