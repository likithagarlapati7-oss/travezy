import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  BadgeCheck,
  CheckCircle2,
  CornerDownRight,
  Filter,
  Loader2,
  MapPin,
  MessageSquare,
  MessageSquareQuote,
  Pencil,
  Reply,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { replyToReview } from "@/lib/reviews.functions";
import { requireRole } from "@/lib/roles";
import {
  myProviderQuery,
  providerReviewsQuery,
  providerServicesQuery,
  type ReviewWithService,
} from "@/lib/travezy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/provider/reviews")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Review Management & Host Responses — Travezy Provider Hub" },
      {
        name: "description",
        content: "Monitor traveller reviews across your services and publish official host responses on Travezy.",
      },
      { property: "og:title", content: "Review Management & Host Responses — Travezy Provider Hub" },
      {
        property: "og:description",
        content: "Engage with traveller feedback and monitor ratings.",
      },
    ],
  }),
  component: ProviderReviewsPage,
});

type FilterRating = "all" | "5" | "4" | "3" | "2" | "1" | "needs-reply";
type SortOption = "recent" | "highest" | "lowest";

function ProviderReviewsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const { data: provider, isLoading: isProviderLoading } = useQuery({
    ...myProviderQuery(userId),
    enabled: !!userId,
  });

  const providerId = provider?.id ?? "";

  const { data: services = [] } = useQuery({
    ...providerServicesQuery(providerId),
    enabled: !!providerId,
  });

  const { data: reviews = [], isLoading, isError } = useQuery({
    ...providerReviewsQuery(providerId),
    enabled: !!providerId,
  });

  const [activeFilter, setActiveFilter] = useState<FilterRating>("all");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeReplyReview, setActiveReplyReview] = useState<ReviewWithService | null>(null);
  const [replyText, setReplyText] = useState("");
  const [deleteReplyTarget, setDeleteReplyTarget] = useState<ReviewWithService | null>(null);

  const replyFn = useServerFn(replyToReview);

  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      return await replyFn({
        data: {
          review_id: reviewId,
          response,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-reviews", providerId] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Host response published successfully!");
      setActiveReplyReview(null);
      setReplyText("");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to publish response.");
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return await replyFn({
        data: {
          review_id: reviewId,
          response: "", // Clearing the response
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-reviews", providerId] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Host response removed.");
      setDeleteReplyTarget(null);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to remove response.");
    },
  });

  const openReplyModal = (review: ReviewWithService) => {
    setActiveReplyReview(review);
    setReplyText(review.provider_response || "");
  };

  // Metrics
  const totalReviews = reviews.length;
  const avgRating = totalReviews
    ? (reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / totalReviews).toFixed(1)
    : "5.0";

  const repliedCount = reviews.filter((r) => !!r.provider_response).length;
  const responseRate = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 100;

  // Star distribution
  const starCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5))) as 1 | 2 | 3 | 4 | 5;
      counts[star]++;
    }
    return counts;
  }, [reviews]);

  // Filtered and Sorted reviews
  const filteredReviews = useMemo(() => {
    const list = reviews.filter((r) => {
      if (selectedServiceFilter !== "all" && r.service_id !== selectedServiceFilter) return false;
      if (activeFilter === "needs-reply" && !!r.provider_response) return false;
      if (activeFilter !== "all" && activeFilter !== "needs-reply") {
        if (Math.round(Number(r.rating)) !== Number(activeFilter)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = r.services?.title?.toLowerCase() || "";
        const author = r.profiles?.full_name?.toLowerCase() || "";
        const comment = r.comment?.toLowerCase() || "";
        return title.includes(q) || author.includes(q) || comment.includes(q);
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "highest") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "lowest") return (a.rating || 0) - (b.rating || 0);
      // "recent"
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [reviews, selectedServiceFilter, activeFilter, searchQuery, sortBy]);

  return (
    <PageShell
      eyebrow="Guest Feedback"
      title="Customer Reviews & Host Replies"
      subtitle="Engage with traveller feedback, monitor ratings across your listings, and publish official host responses."
    >
      <div className="space-y-6">
        {/* ─── 1. Telemetry KPI Metric Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-card flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Star className="size-7 fill-current" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Average Rating
              </p>
              <div className="font-display text-3xl font-bold mt-1 text-foreground">
                {avgRating} <span className="text-xs font-normal text-muted-foreground">/ 5.0</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Across {totalReviews} guest reviews</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <MessageSquareQuote className="size-7" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Reviews Received
              </p>
              <div className="font-display text-3xl font-bold mt-1 text-foreground">
                {totalReviews}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Verified completed trips</p>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-card flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <BadgeCheck className="size-7" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Host Response Rate
              </p>
              <div className="font-display text-3xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">
                {responseRate}%
              </div>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                {repliedCount} of {totalReviews} reviews responded
              </p>
            </div>
          </div>
        </div>

        {/* ─── 2. Search, Filters & Sorters Hub ────────────────────────────────── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md">
          {/* Top Row: Search & Dropdowns */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search reviewer name, review comment, service title…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-background/80"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Service Filter */}
              <select
                value={selectedServiceFilter}
                onChange={(e) => setSelectedServiceFilter(e.target.value)}
                className="h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium max-w-[200px]"
              >
                <option value="all">All Listings ({services.length})</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>

              {/* Sorting */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium"
              >
                <option value="recent">Most Recent</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </div>

          {/* Bottom Row: Rating Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-border/50 pt-3">
            {[
              { value: "all", label: `All Reviews (${totalReviews})` },
              { value: "needs-reply", label: `Needs Response (${totalReviews - repliedCount})` },
              { value: "5", label: `5 Stars (${starCounts[5]})` },
              { value: "4", label: `4 Stars (${starCounts[4]})` },
              { value: "3", label: `3 Stars (${starCounts[3]})` },
              { value: "2", label: `2 Stars (${starCounts[2]})` },
              { value: "1", label: `1 Star (${starCounts[1]})` },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveFilter(tab.value as FilterRating)}
                className={cn(
                  "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all",
                  activeFilter === tab.value
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border border-border/60 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── 3. Reviews List ─────────────────────────────────────────────────── */}
        {isLoading || isProviderLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-3xl border border-border/60 bg-muted/40" />
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <MessageSquareQuote className="size-7 opacity-40" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">No matching reviews</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {reviews.length === 0
                ? "As tourists complete bookings and leave feedback, their verified reviews will appear here."
                : "No reviews match your current rating or search filters."}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                  setSelectedServiceFilter("all");
                }}
                className="mt-4 rounded-xl text-xs"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((r) => {
              const touristName = r.profiles?.full_name || "Verified Traveler";
              const serviceTitle = r.services?.title || "Curated Service";
              const hasReplied = Boolean(r.provider_response);

              return (
                <div
                  key={r.id}
                  className="rounded-3xl border border-border/70 bg-card p-6 shadow-card space-y-4 transition-all hover:border-primary/40"
                >
                  {/* Top Row: Reviewer + Service + Rating */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                      {r.profiles?.avatar_url ? (
                        <img
                          src={r.profiles.avatar_url}
                          alt={touristName}
                          className="size-11 rounded-2xl object-cover ring-2 ring-border"
                        />
                      ) : (
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary text-base">
                          {touristName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-foreground text-sm">{touristName}</h4>
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] gap-1 px-1.5 py-0.5">
                            <ShieldCheck className="size-3" /> Verified Guest
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="size-3 text-primary" />
                          <strong className="text-foreground/90">{serviceTitle}</strong>
                          {r.services?.destination && <span>• {r.services.destination}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "size-4",
                              star <= r.rating
                                ? "fill-amber-400 text-amber-500"
                                : "text-muted/40"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1">
                        {r.created_at ? format(parseISO(r.created_at), "MMM d, yyyy") : ""}
                      </span>
                    </div>
                  </div>

                  {/* Review Text */}
                  <div className="text-sm text-foreground/90 leading-relaxed">
                    "{r.comment || "Great experience!"}"
                  </div>

                  {/* Official Host Response Box (If present) */}
                  {hasReplied && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-primary">
                          <CornerDownRight className="size-3.5" />
                          <span>Official Response from Host</span>
                        </div>
                        {r.provider_responded_at && (
                          <span className="text-[11px] text-muted-foreground">
                            {format(parseISO(r.provider_responded_at), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed italic">
                        "{r.provider_response}"
                      </p>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                    {hasReplied && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteReplyTarget(r)}
                        className="h-8 rounded-xl text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1 px-2.5"
                      >
                        <Trash2 className="size-3.5" /> Delete Reply
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant={hasReplied ? "outline" : "ocean"}
                      onClick={() => openReplyModal(r)}
                      className="h-8 rounded-xl text-xs gap-1.5 font-semibold px-3.5"
                    >
                      {hasReplied ? (
                        <>
                          <Pencil className="size-3.5" /> Edit Response
                        </>
                      ) : (
                        <>
                          <Reply className="size-3.5" /> Reply to Guest
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 4. Reply / Edit Host Response Modal ─────────────────────────────── */}
      {activeReplyReview && (
        <Dialog open={Boolean(activeReplyReview)} onOpenChange={(open) => !open && setActiveReplyReview(null)}>
          <DialogContent className="max-w-lg rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {activeReplyReview.provider_response ? "Edit Host Response" : "Respond to Customer Review"}
              </DialogTitle>
              <DialogDescription>
                Your response will appear publicly under this customer's review on your service listing page.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>{activeReplyReview.profiles?.full_name || "Guest Tourist"}</span>
                  <span>{activeReplyReview.rating}★</span>
                </div>
                <p className="text-muted-foreground italic line-clamp-2">
                  "{activeReplyReview.comment}"
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reply" className="text-xs font-semibold text-foreground">
                  Your Official Response
                </label>
                <Textarea
                  id="reply"
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Thank the guest for their visit, address any highlights or feedback warmly..."
                  className="rounded-xl resize-none text-xs leading-relaxed"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between border-t border-border/60 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveReplyReview(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="ocean"
                size="sm"
                disabled={!replyText.trim() || replyMutation.isPending}
                onClick={() =>
                  replyMutation.mutate({
                    reviewId: activeReplyReview.id,
                    response: replyText.trim(),
                  })
                }
                className="rounded-xl gap-1.5 font-semibold"
              >
                {replyMutation.isPending ? "Publishing..." : "Publish Response"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── 5. Delete Reply Confirmation Dialog ────────────────────────────── */}
      {deleteReplyTarget && (
        <AlertDialog open={Boolean(deleteReplyTarget)} onOpenChange={(open) => !open && setDeleteReplyTarget(null)}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-rose-600 dark:text-rose-400">
                Delete Host Response?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove your official response from this guest review? The customer's review will remain untouched.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteReplyMutation.mutate(deleteReplyTarget.id)}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              >
                {deleteReplyMutation.isPending ? "Removing..." : "Remove Response"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </PageShell>
  );
}
