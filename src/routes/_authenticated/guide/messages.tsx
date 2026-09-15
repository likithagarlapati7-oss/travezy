import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { requireRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/guide/messages")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider", "admin", "tourist"]);
  },
  head: () => ({
    meta: [
      { title: "Tour Guide Messages — Travezy" },
      {
        name: "description",
        content: "Communicate directly with travellers, answer tour inquiries, coordinate meeting points and customized itineraries.",
      },
      { property: "og:title", content: "Tour Guide Messages — Travezy" },
      { property: "og:description", content: "Real-time communication between Tour Guides and Travellers on Travezy." },
    ],
  }),
  component: GuideMessagesPage,
});

function GuideMessagesPage() {
  return (
    <PageShell
      eyebrow="Guide Communications"
      title="Traveller Inquiries & Messages"
      subtitle="Coordinate meeting points, discuss customized walking itineraries, and reply to prospective travellers."
    >
      <ChatPanel roleContext="guide" />
    </PageShell>
  );
}
