import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { requireRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/provider/messages")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Guest Messages — Travezy Provider" },
      { name: "description", content: "Communicate with travelers, answer guest inquiries, and manage trip communications." },
      { property: "og:title", content: "Guest Messages — Travezy Provider" },
      { property: "og:description", content: "Guest communication console for Travezy providers." },
    ],
  }),
  component: ProviderMessagesPage,
});

function ProviderMessagesPage() {
  return (
    <PageShell
      eyebrow="Guest Communications"
      title="Customer Messages"
      subtitle="Answer guest questions, coordinate arrival logistics, and provide exceptional customer care."
    >
      <ChatPanel roleContext="provider" />
    </PageShell>
  );
}
