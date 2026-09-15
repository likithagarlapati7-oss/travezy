import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { saveLocalGuideReview, type HumanTourGuide } from "@/lib/guides";
import { createGuideReview } from "@/lib/guides.functions";

interface GuideReviewModalProps {
  guide: HumanTourGuide | null;
  bookingId?: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (() => void) | undefined;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor experience",
  2: "Fair experience",
  3: "Good tour",
  4: "Very good & knowledgeable",
  5: "Exceptional guide — Highly recommend! ⭐",
};

export function GuideReviewModal({
  guide,
  bookingId,
  open,
  onOpenChange,
  onSuccess,
}: GuideReviewModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");

  if (!guide) return null;

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const touristId = user?.id || "tourist-guest-session";
      const touristName = user?.email ? user.email.split("@")[0] : "Verified Traveller";

      const newReview = await createGuideReview({
        data: {
          guideId: guide.id,
          touristId,
          touristName,
          touristLocation: "India",
          bookingId: bookingId || undefined,
          rating,
          comment: comment.trim(),
        },
      });

      saveLocalGuideReview(guide.id, newReview);
      return newReview;
    },
    onSuccess: () => {
      toast.success("Thank you! Your review for the tour guide has been submitted.");
      qc.invalidateQueries({ queryKey: ["human-guide", guide.id] });
      qc.invalidateQueries({ queryKey: ["human-guides"] });
      onOpenChange(false);
      setComment("");
      if (onSuccess) onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit review");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 5) {
      toast.error("Please write at least a few words about your experience with this guide.");
      return;
    }
    reviewMutation.mutate();
  };

  const activeRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img
              src={guide.profile_image}
              alt={guide.name}
              className="size-12 rounded-xl object-cover ring-1 ring-border"
            />
            <div>
              <DialogTitle className="text-lg font-bold">
                Rate Your Guide: {guide.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                How was your tour experience in {guide.city}?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Star Rating Selector */}
          <div className="flex flex-col items-center justify-center space-y-2 rounded-2xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-hidden"
                >
                  <Star
                    className={`size-7 ${
                      star <= activeRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-foreground/90">
              {RATING_LABELS[activeRating] || `${activeRating} Stars`}
            </p>
          </div>

          {/* Comment text */}
          <div className="space-y-1.5">
            <Label htmlFor="review-comment" className="text-xs font-semibold">
              Your Review & Story
            </Label>
            <Textarea
              id="review-comment"
              placeholder="Tell other travellers what made this guide great (knowledge, punctuality, recommendations)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="rounded-xl text-xs resize-none"
              rows={4}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={reviewMutation.isPending}
            className="w-full rounded-2xl py-4 text-sm font-bold shadow-sm"
          >
            {reviewMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting Review…
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
