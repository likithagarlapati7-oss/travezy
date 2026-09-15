import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Bookmark,
  Calendar,
  Compass,
  Eye,
  Hotel,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Users,
  Utensils,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { requireRole } from "@/lib/roles";
import { deleteTripPlanFn, getUserTripPlansFn } from "@/lib/itinerary.functions";

export const Route = createFileRoute("/_authenticated/tourist/itineraries")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["tourist"]);
  },
  head: () => ({
    meta: [
      { title: "My Saved Itineraries — Travezy" },
      {
        name: "description",
        content: "Manage and customize your AI-generated travel itineraries and holiday plans on Travezy.",
      },
    ],
  }),
  component: MyItinerariesPage,
});

function MyItinerariesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const getPlansFn = useServerFn(getUserTripPlansFn);
  const deletePlanFn = useServerFn(deleteTripPlanFn);

  const { data: tripPlans = [], isLoading, isError } = useQuery({
    queryKey: ["user-trip-plans", user?.id],
    queryFn: async () => {
      return await getPlansFn();
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (tripPlanId: string) => {
      return await deletePlanFn({
        data: { tripPlanId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-trip-plans"] });
      toast.success("Itinerary deleted successfully.");
      setDeleteTargetId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete itinerary.");
    },
  });

  return (
    <PageShell
      eyebrow="Holiday Planner"
      title="My Saved Itineraries"
      subtitle="Access, customize, and book your personalized trip plans generated with Travezy AI."
    >
      <div className="space-y-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/40 p-6 rounded-3xl border border-border">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Bookmark className="size-5 text-primary" /> {tripPlans.length} Saved{" "}
              {tripPlans.length === 1 ? "Itinerary" : "Itineraries"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every plan is linked with verified stays, genuine dining spots, and local guides.
            </p>
          </div>

          <Button asChild variant="hero" size="sm" className="rounded-full shadow-card gap-1.5">
            <Link to="/planner">
              <Sparkles className="size-4 fill-current text-gold" /> Plan New Trip
            </Link>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-3xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && tripPlans.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-4 max-w-xl mx-auto my-8">
            <div className="grid size-16 place-items-center rounded-3xl bg-primary/10 text-primary mx-auto text-3xl">
              🗺️
            </div>
            <h3 className="font-display text-xl font-bold">No saved itineraries yet</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use our AI Trip Planner to create custom day-by-day itineraries with real hotels,
              authentic restaurants, and licensed human tour guides.
            </p>
            <Button asChild variant="hero" size="lg" className="rounded-2xl gap-2 shadow-card mt-2">
              <Link to="/planner">
                <Sparkles className="size-4 fill-current text-gold" /> Create Your First Itinerary
              </Link>
            </Button>
          </div>
        )}

        {/* List of Trip Plans */}
        {!isLoading && tripPlans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tripPlans.map((plan) => {
              const itemsCount = plan.itinerary_items?.length || 0;

              return (
                <div
                  key={plan.id}
                  className="group rounded-3xl border border-border bg-card overflow-hidden shadow-xs hover:shadow-card hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  {/* Image & Badges */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={
                        plan.cover_image_url ||
                        "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944"
                      }
                      alt={plan.title}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <Badge className="bg-primary text-primary-foreground text-[11px] font-bold border-none">
                        {plan.days_count} Days
                      </Badge>
                      <Badge className="bg-black/50 text-white backdrop-blur-md text-[10px] capitalize border-none">
                        {plan.budget_tier}
                      </Badge>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-[11px] text-white/80 uppercase font-semibold flex items-center gap-1">
                        <MapPin className="size-3 text-accent shrink-0" /> {plan.destination}
                      </p>
                      <h4 className="font-display text-lg font-bold leading-snug line-clamp-1">
                        {plan.title}
                      </h4>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" /> {plan.travelers_count} Travellers
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" /> {itemsCount} Activities
                        </span>
                      </div>

                      {plan.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {plan.summary}
                        </p>
                      )}
                    </div>

                    {/* Cost and Actions */}
                    <div className="border-t border-border pt-4 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                          Est. Budget
                        </p>
                        <p className="font-display text-base font-bold text-primary">
                          ₹{Number(plan.estimated_total_cost || 0).toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          asChild
                          variant="hero"
                          size="sm"
                          className="rounded-full text-xs shadow-xs"
                        >
                          <Link to="/itinerary/$itineraryId" params={{ itineraryId: plan.id }}>
                            <Eye className="size-3.5 mr-1" /> View & Edit
                          </Link>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTargetId(plan.id)}
                          className="size-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteTargetId && (
          <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={() => setDeleteTargetId(null)}>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-xl font-bold">
                  Delete Saved Itinerary?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  Are you sure you want to delete this trip plan? All day-by-day activities will be
                  permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
                  className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Itinerary
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </PageShell>
  );
}
