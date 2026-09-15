import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { requireRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/verifier/messages")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["verifier", "admin"]);
  },
  head: () => ({
    meta: [
      { title: "Guest Messages & Inquiries — Travezy Verifier" },
      {
        name: "description",
        content: "Communicate directly with hotel guests, answer stay inquiries, coordinate arrival times and special requests.",
      },
    ],
  }),
  component: VerifierMessagesPage,
});

function VerifierMessagesPage() {
  return (
    <PageShell
      eyebrow="Guest Communications"
      title="Hotel Guest Messages"
      subtitle="Coordinate arrival logistics, answer special dietary or room arrangement inquiries, and provide top-tier hospitality support."
    >
      <ChatPanel roleContext="verifier" />
    </PageShell>
  );
}
