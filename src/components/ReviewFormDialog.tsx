import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Loader2, Trash2, X, MessageSquareQuote, ImagePlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { editReview, removeReview, submitReview } from "@/lib/reviews.functions";
import type { PublicReview } from "@/lib/travezy";

export interface ReviewFormDialogProps {
  bookingId: string;
  serviceId: string;
  serviceTitle: string;
  existingReview?: PublicReview | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor — Did not meet expectations",
  2: "Fair — Needs improvement",
  3: "Good — Satisfactory experience",
  4: "Very Good — Highly enjoyable",
  5: "Exceptional — Absolutely incredible!",
};

export function ReviewFormDialog({
  bookingId,
  serviceId,
  serviceTitle,
  existingReview,
  isOpen,
  onClose,
  onSuccess,
}: ReviewFormDialogProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(existingReview?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState<string>(existingReview?.title ?? "");
  const [comment, setComment] = useState<string>(existingReview?.comment ?? "");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [images, setImages] = useState<string[]>(existingReview?.images ?? []);

  const isEditing = !!existingReview;

  const submitReviewFn = useServerFn(submitReview);
  const editReviewFn = useServerFn(editReview);
  const removeReviewFn = useServerFn(removeReview);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEditing && existingReview) {
        return await editReviewFn({
          data: {
            id: existingReview.id,
            rating,
            title: title.trim() || undefined,
            comment: comment.trim(),
            images: images.length > 0 ? images : undefined,
          },
        });
      } else {
        return await submitReviewFn({
          data: {
            booking_id: bookingId,
            service_id: serviceId,
            rating,
            title: title.trim() || undefined,
            comment: comment.trim(),
            images: images.length > 0 ? images : undefined,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", serviceId] });
      queryClient.invalidateQueries({ queryKey: ["service", serviceId] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["booking-review", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["tourist-reviews"] });
      toast.success(isEditing ? "Review updated successfully!" : "Thank you! Your review has been published.");
      onSuccess?.();
      onClose();
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to submit review. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!existingReview) return;
      return await removeReviewFn({
        data: { id: existingReview.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", serviceId] });
      queryClient.invalidateQueries({ queryKey: ["service", serviceId] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["booking-review", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["tourist-reviews"] });
      toast.success("Review deleted successfully.");
      onSuccess?.();
      onClose();
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to delete review.");
    },
  });

  if (!isOpen) return null;

  const activeStar = hoverRating || rating;
  const isSubmitting = saveMutation.isPending || deleteMutation.isPending;

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    if (images.length >= 5) {
      toast.error("Maximum 5 photos allowed per review");
      return;
    }
    setImages((prev) => [...prev, imageUrl.trim()]);
    setImageUrl("");
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-dialog-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-float space-y-6 text-foreground my-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-amber-500/10 text-gold shrink-0">
              <MessageSquareQuote className="size-5" />
            </span>
            <div>
              <h3 id="review-dialog-title" className="font-display text-xl font-bold">
                {isEditing ? "Edit Your Review" : "Write a Review"}
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-xs sm:max-w-sm">
                {serviceTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close review dialog"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Rating selection */}
        <div className="space-y-2 text-center bg-muted/40 p-5 rounded-2xl border border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Overall Rating
          </p>
          <div className="flex justify-center items-center gap-2 py-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} out of 5 stars`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                disabled={isSubmitting}
                className="p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg cursor-pointer"
              >
                <Star
                  className={`size-8 sm:size-9 transition-colors ${
                    star <= activeStar
                      ? "fill-amber-400 text-amber-400"
                      : "text-neutral-300 dark:text-neutral-700"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 min-h-4">
            {RATING_LABELS[activeStar] || "Select your rating"}
          </p>
        </div>

        {/* Optional Title */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="review-title" className="font-semibold text-foreground">
              Headline / Title <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <span className="text-muted-foreground">{title.length}/120</span>
          </div>
          <Input
            id="review-title"
            type="text"
            placeholder="e.g. Unforgettable weekend stay with exceptional hospitality!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            maxLength={120}
            className="rounded-xl text-sm"
          />
        </div>

        {/* Written Comment */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="review-comment" className="font-semibold text-foreground">
              Your Review / Experience <span className="text-destructive">*</span>
            </label>
            <span className="text-muted-foreground">{comment.length}/2000</span>
          </div>
          <Textarea
            id="review-comment"
            rows={4}
            placeholder="Share details of your experience, what you enjoyed most, food, rooms, ambience, or tips for other travellers…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitting}
            maxLength={2000}
            className="rounded-2xl resize-none text-sm"
          />
          {comment.trim().length > 0 && comment.trim().length < 3 && (
            <p className="text-[11px] text-destructive">Comment must be at least 3 characters long.</p>
          )}
        </div>

        {/* Optional Photos */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground block">
            Trip Photos <span className="text-muted-foreground font-normal">(Optional, up to 5)</span>
          </label>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="Paste photo URL (https://...)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={isSubmitting || images.length >= 5}
              className="rounded-xl text-xs flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddImage}
              disabled={isSubmitting || !imageUrl.trim() || images.length >= 5}
              className="rounded-xl text-xs gap-1"
            >
              <ImagePlus className="size-3.5" /> Add
            </Button>
          </div>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {images.map((img, idx) => (
                <div key={idx} className="relative group size-16 rounded-xl overflow-hidden border border-border">
                  <img src={img} alt="Review attachment" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {isEditing ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={isSubmitting}
              className="flex items-center gap-1.5"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ocean"
              onClick={() => saveMutation.mutate()}
              disabled={isSubmitting || comment.trim().length < 3 || rating < 1}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Saving…
                </>
              ) : isEditing ? (
                "Update Review"
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
