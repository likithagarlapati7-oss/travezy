import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  Search,
  ShieldAlert,
  Star,
  Trash2,
} from "lucide-react";
import { AdminTable, Td } from "@/components/AdminTable";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminReviewsQuery, type AdminReview } from "@/lib/admin";
import { adminDeleteReview } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Review Moderation — Travezy Admin" },
      { name: "description", content: "Audit and moderate guest feedback, ratings, and provider responses across Travezy." },
      { property: "og:title", content: "Review Moderation — Travezy Admin" },
      { property: "og:description", content: "Moderate guest reviews across Travezy." },
    ],
  }),
  component: AdminReviews,
});

const PAGE_SIZE = 10;

function AdminReviews() {
  const { data: reviews, isLoading, error } = useQuery(adminReviewsQuery);
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [inspectingReview, setInspectingReview] = useState<AdminReview | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<AdminReview | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return await adminDeleteReview({ data: { reviewId } });
    },
    onSuccess: () => {
      toast.success("Review removed and service rating recalculated");
      setReviewToDelete(null);
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove review"),
  });

  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    return reviews.filter((r) => {
      const matchesRating = ratingFilter === "all" || String(r.rating) === ratingFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.comment && r.comment.toLowerCase().includes(q)) ||
        (r.services?.title && r.services.title.toLowerCase().includes(q)) ||
        (r.user?.full_name && r.user.full_name.toLowerCase().includes(q)) ||
        (r.user?.email && r.user.email.toLowerCase().includes(q));

      return matchesRating && matchesSearch;
    });
  }, [reviews, ratingFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
  const paginatedReviews = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredReviews.slice(start, start + PAGE_SIZE);
  }, [filteredReviews, page]);

  return (
    <PageShell
      eyebrow="Marketplace Quality"
      title="Review Moderation"
      subtitle="Audit guest reviews, inspect community feedback, and moderate fraudulent submissions."
    >
      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={ratingFilter === "all" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setRatingFilter("all");
              setPage(1);
            }}
          >
            All Ratings ({reviews?.length ?? 0})
          </Button>
          {[5, 4, 3, 2, 1].map((stars) => (
            <Button
              key={stars}
              size="sm"
              variant={ratingFilter === String(stars) ? "default" : "outline"}
              className="rounded-full gap-1 text-xs"
              onClick={() => {
                setRatingFilter(String(stars));
                setPage(1);
              }}
            >
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {stars} Star ({reviews?.filter((r) => r.rating === stars).length ?? 0})
            </Button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search comment, service, guest..."
            className="rounded-full pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      {/* Reviews Table */}
      <div className="mt-6">
        <AdminTable
          headers={["Service", "Guest", "Rating", "Review Snippet", "Provider Response", "Date", "Actions"]}
          isLoading={isLoading}
          error={error}
          empty={
            searchQuery || ratingFilter !== "all"
              ? "No reviews match your filter criteria."
              : "No guest reviews recorded yet."
          }
          rows={paginatedReviews.map((r) => (
            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
              <Td>
                <div className="min-w-0 max-w-xs">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {r.services?.title ?? "Service listing"}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.services?.destination ?? "—"}</p>
                </div>
              </Td>
              <Td>
                <div className="min-w-0">
                  <p className="font-medium text-xs text-foreground">{r.user?.full_name || "Guest"}</p>
                  <p className="text-[11px] text-muted-foreground">{r.user?.email || "—"}</p>
                </div>
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  <div className="flex text-amber-400">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-semibold ml-1">{r.rating}/5</span>
                </div>
              </Td>
              <Td>
                <p className="text-xs text-foreground line-clamp-2 max-w-sm">
                  {r.comment || <span className="italic text-muted-foreground">No written comment</span>}
                </p>
              </Td>
              <Td>
                {r.provider_response ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    <MessageSquare className="size-3" />
                    Replied
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </Td>
              <Td>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs px-2"
                    onClick={() => setInspectingReview(r)}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 px-2"
                    onClick={() => setReviewToDelete(r)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        />
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredReviews.length)} of{" "}
            {filteredReviews.length} reviews
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-xs font-medium px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Inspect Review Dialog */}
      <Dialog open={!!inspectingReview} onOpenChange={(open) => !open && setInspectingReview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="size-5 fill-amber-400 text-amber-400" />
              Review Audit
            </DialogTitle>
            <DialogDescription>
              {inspectingReview?.services?.title ?? "Marketplace Service"} · By {inspectingReview?.user?.full_name || "Guest"}
            </DialogDescription>
          </DialogHeader>

          {inspectingReview && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Review ID:</span>
                  <code className="font-mono">{inspectingReview.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rating:</span>
                  <span className="font-bold text-amber-500">{inspectingReview.rating} / 5 Stars</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span>{new Date(inspectingReview.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guest Feedback</p>
                <p className="mt-1 rounded-xl bg-background border border-border p-3 text-xs leading-relaxed text-foreground">
                  {inspectingReview.comment || "No written review provided."}
                </p>
              </div>

              {inspectingReview.provider_response && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="size-3" />
                    Provider Official Response
                  </p>
                  <p className="mt-1 rounded-xl bg-blue-500/5 border border-blue-500/20 p-3 text-xs leading-relaxed text-foreground">
                    {inspectingReview.provider_response}
                  </p>
                  {inspectingReview.provider_responded_at && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Responded on: {new Date(inspectingReview.provider_responded_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Review Confirmation Dialog */}
      <AlertDialog open={!!reviewToDelete} onOpenChange={(open) => !open && setReviewToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-destructive" />
              Remove Guest Review?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>
                Are you sure you want to permanently delete this review for{" "}
                <span className="font-semibold text-foreground">“{reviewToDelete?.services?.title}”</span>?
              </p>
              <p className="text-xs text-muted-foreground">
                This action will automatically recalculate and update the overall rating and review count of the service.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (reviewToDelete) deleteMutation.mutate(reviewToDelete.id);
              }}
            >
              {deleteMutation.isPending ? "Removing…" : "Delete Review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
