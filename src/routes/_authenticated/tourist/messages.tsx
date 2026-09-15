import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { requireRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/tourist/messages")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["tourist"]);
  },
  head: () => ({
    meta: [
      { title: "Messages — Travezy" },
      { name: "description", content: "Chat in real-time with travel hosts, guides, and activity operators." },
      { property: "og:title", content: "Messages — Travezy" },
      { property: "og:description", content: "Real-time communication with your travel providers on Travezy." },
    ],
  }),
  component: TouristMessagesPage,
});

function TouristMessagesPage() {
  return (
    <PageShell
      eyebrow="Direct Communication"
      title="Host Messages"
      subtitle="Connect directly with tour operators, hotel hosts, and local guides for your booked journeys."
    >
      <ChatPanel roleContext="tourist" />
    </PageShell>
  );
}
