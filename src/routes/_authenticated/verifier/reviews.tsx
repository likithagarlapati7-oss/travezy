import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  CheckCircle2,
  CornerDownRight,
  Loader2,
  MessageSquare,
  Send,
  Star,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getVerifierHotels } from "@/lib/hotels.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verifier/reviews")({
  head: () => ({
    meta: [
      { title: "Hotel Reviews & Guest Feedback — Travezy Verifier" },
      {
        name: "description",
        content: "View guest reviews for your properties, manage ratings, and respond to traveler feedback.",
      },
    ],
  }),
  component: VerifierReviewsPage,
});

// Sample verified guest reviews for hotels
const INITIAL_HOTEL_REVIEWS = [
  {
    id: "rev-001",
    hotel_name: "The Royal Heritage Haveli",
    guest_name: "Ananya Mehra",
    rating: 5,
    comment: "An enchanting stay in Udaipur! The heritage architecture, courtyard breakfast with live sitar, and the attentive staff made our anniversary trip unforgettable. The Maharaja Lake-View Suite is worth every penny.",
    date: "2026-08-28",
    response: "Dear Ananya, thank you for choosing our heritage palace for your anniversary celebration! It was our pleasure hosting you, and we look forward to welcoming you back to Udaipur.",
    responded_at: "2026-08-29",
  },
  {
    id: "rev-002",
    hotel_name: "Kumarakom Waters Backwater Resort",
    guest_name: "Kavita Krishnamurthy",
    rating: 5,
    comment: "Serene, pristine, and rejuvenating. The private plunge pool villa was immaculate, and the Ayurvedic massage therapies at the wellness pavilion were deeply relaxing. Highly recommended!",
    date: "2026-08-20",
    response: null,
    responded_at: null,
  },
  {
    id: "rev-003",
    hotel_name: "The Himalayan Cedar Sanctuary",
    guest_name: "Rohan Varma",
    rating: 4,
    comment: "Stunning mountain views and cozy wooden chalets with wood-burning fireplaces. The food at the cafe was delicious and fresh. Wifi was occasionally slow due to snow, but otherwise an exceptional retreat.",
    date: "2026-08-14",
    response: "Thank you for the warm feedback, Rohan! We have since upgraded our high-altitude satellite link to guarantee high-speed connectivity even in heavy snow.",
    responded_at: "2026-08-15",
  },
];

function VerifierReviewsPage() {
  const qc = useQueryClient();
  const getHotelsFn = useServerFn(getVerifierHotels);

  const [reviews, setReviews] = useState(INITIAL_HOTEL_REVIEWS);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: hotels = [] } = useQuery({
    queryKey: ["verifier", "hotels"],
    queryFn: () => getHotelsFn(),
  });

  const avgRating = (
    reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)
  ).toFixed(1);

  function handlePostResponse(reviewId: string) {
    if (!replyText.trim()) return;

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              response: replyText.trim(),
              responded_at: new Date().toISOString().slice(0, 10),
            }
          : r,
      ),
    );

    toast.success("Hotel response published to guest review!");
    setReplyingToId(null);
    setReplyText("");
  }

  return (
    <PageShell
      eyebrow="Reputation & Feedback"
      title="Hotel Guest Reviews"
      subtitle="Monitor guest ratings across your properties, evaluate feedback, and post official responses from hotel management."
    >
      {/* Ratings Overview Card */}
      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card flex items-center gap-5">
          <div className="grid size-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 font-display text-2xl font-bold">
            {avgRating}
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="size-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <h3 className="font-bold text-sm text-foreground">Overall Property Score</h3>
            <p className="text-xs text-muted-foreground">Based on {reviews.length} verified stays</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card md:col-span-2 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-foreground">Active Properties ({hotels.length})</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              100% of reviews are linked to confirmed guest stays verified at check-in.
            </p>
          </div>
          <span className="bg-emerald-500/10 text-emerald-600 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> 100% Verified Stays
          </span>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-foreground">{rev.guest_name}</span>
                  <span className="text-xs text-muted-foreground">• {rev.date}</span>
                </div>
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <Building2 className="size-3" /> {rev.hotel_name}
                </p>
              </div>

              <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full text-amber-600 text-xs font-bold">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span>{rev.rating}.0 / 5.0</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              "{rev.comment}"
            </p>

            {/* Official Hotel Response */}
            {rev.response ? (
              <div className="bg-muted/40 p-4 rounded-2xl border-l-4 border-primary space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-foreground flex items-center gap-1.5">
                    <CornerDownRight className="size-3.5 text-primary" /> Response from Hotelier
                  </strong>
                  <span className="text-[10px] text-muted-foreground">{rev.responded_at}</span>
                </div>
                <p className="text-muted-foreground mt-1">{rev.response}</p>
              </div>
            ) : replyingToId === rev.id ? (
              <div className="space-y-3 pt-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a professional and courteous response to the guest..."
                  rows={3}
                  className="rounded-xl text-xs"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs"
                    onClick={() => {
                      setReplyingToId(null);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="hero"
                    size="sm"
                    className="rounded-xl text-xs gap-1.5"
                    disabled={!replyText.trim()}
                    onClick={() => handlePostResponse(rev.id)}
                  >
                    <Send className="size-3" /> Publish Response
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs gap-1.5"
                  onClick={() => setReplyingToId(rev.id)}
                >
                  <MessageSquare className="size-3.5" /> Post Hotel Response
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
