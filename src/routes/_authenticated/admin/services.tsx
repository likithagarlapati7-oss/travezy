import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  Users,
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
import { adminServicesQuery } from "@/lib/admin";
import { adminDeleteService, adminToggleServiceActive } from "@/lib/admin.functions";
import { formatPrice, type Service } from "@/lib/travezy";

type AdminServiceItem = Service & {
  providers: { business_name: string; verified: boolean } | null;
};

export const Route = createFileRoute("/_authenticated/admin/services")({
  head: () => ({
    meta: [
      { title: "Service Moderation — Travezy Admin" },
      { name: "description", content: "Moderate and inspect marketplace listings, tours, and hotels across Travezy." },
      { property: "og:title", content: "Service Moderation — Travezy Admin" },
      { property: "og:description", content: "Moderate Travezy marketplace listings." },
    ],
  }),
  component: AdminServices,
});

const PAGE_SIZE = 10;

function AdminServices() {
  const { data: services, isLoading, error } = useQuery(adminServicesQuery);
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [page, setPage] = useState(1);

  // Modal inspection & deletion targets
  const [inspectingService, setInspectingService] = useState<AdminServiceItem | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<AdminServiceItem | null>(null);

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ serviceId, isActive }: { serviceId: string; isActive: boolean }) => {
      return await adminToggleServiceActive({ data: { serviceId, isActive } });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "Listing published to marketplace" : "Listing hidden from marketplace");
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update listing visibility"),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return await adminDeleteService({ data: { serviceId } });
    },
    onSuccess: () => {
      toast.success("Listing permanently deleted");
      setServiceToDelete(null);
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete listing");
    },
  });

  const filteredServices = useMemo(() => {
    if (!services) return [];
    return (services as AdminServiceItem[]).filter((s) => {
      const matchesCategory = categoryFilter === "all" || s.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_active) ||
        (statusFilter === "hidden" && !s.is_active);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q) ||
        (s.providers?.business_name && s.providers.business_name.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [services, categoryFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
  const paginatedServices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredServices.slice(start, start + PAGE_SIZE);
  }, [filteredServices, page]);

  const categories = useMemo(() => {
    if (!services) return [];
    const set = new Set<string>();
    services.forEach((s) => s.category && set.add(s.category.toLowerCase()));
    return Array.from(set);
  }, [services]);

  return (
    <PageShell
      eyebrow="Marketplace Moderation"
      title="Service Administration"
      subtitle="Inspect catalog quality, verify pricing compliance, and moderate public marketplace listings."
    >
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={statusFilter === "all" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setStatusFilter("all");
                setPage(1);
              }}
            >
              All Listings ({services?.length ?? 0})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "active" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setStatusFilter("active");
                setPage(1);
              }}
            >
              Active ({services?.filter((s) => s.is_active).length ?? 0})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "hidden" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setStatusFilter("hidden");
                setPage(1);
              }}
            >
              Hidden ({services?.filter((s) => !s.is_active).length ?? 0})
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, destination, provider..."
              className="rounded-full pl-9 pr-4 text-sm"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium mr-1">Categories:</span>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                categoryFilter === "all"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat);
                  setPage(1);
                }}
                className={`capitalize rounded-full px-3 py-1 font-medium transition-colors ${
                  categoryFilter === cat
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Services Table */}
      <div className="mt-6">
        <AdminTable
          headers={["Listing", "Provider", "Category", "Location", "Price", "Rating", "Status", "Actions"]}
          isLoading={isLoading}
          error={error}
          empty={
            searchQuery || statusFilter !== "all" || categoryFilter !== "all"
              ? "No services match your filters."
              : "No services published yet."
          }
          rows={paginatedServices.map((s) => (
            <tr key={s.id} className="hover:bg-muted/30 transition-colors">
              <Td>
                <div className="flex items-center gap-3">
                  {s.image_url ? (
                    <img
                      src={s.image_url}
                      alt={s.title}
                      className="size-10 rounded-xl object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div className="size-10 rounded-xl bg-muted grid place-items-center shrink-0 text-muted-foreground">
                      <Globe className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate max-w-xs">{s.title}</p>
                    <p className="text-xs text-muted-foreground">ID: {s.id.slice(0, 8)}…</p>
                  </div>
                </div>
              </Td>
              <Td>
                <span className="text-xs font-medium text-foreground flex items-center gap-1">
                  <Building2 className="size-3 text-muted-foreground" />
                  {s.providers?.business_name || "—"}
                </span>
              </Td>
              <Td>
                <span className="capitalize rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {s.category}
                </span>
              </Td>
              <Td>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3" />
                  {s.destination}
                </span>
              </Td>
              <Td>
                <span className="font-display font-semibold text-sm text-primary">
                  {formatPrice(Number(s.price), s.currency)}
                </span>
              </Td>
              <Td>
                <div className="flex items-center gap-1 text-xs">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{s.rating > 0 ? s.rating : "—"}</span>
                  <span className="text-muted-foreground">({s.review_count})</span>
                </div>
              </Td>
              <Td>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${
                    s.is_active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "bg-muted text-muted-foreground font-medium"
                  }`}
                >
                  {s.is_active ? "Active" : "Hidden"}
                </span>
              </Td>
              <Td>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs px-2"
                    onClick={() => setInspectingService(s)}
                    title="Inspect details"
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        serviceId: s.id,
                        isActive: !s.is_active,
                      })
                    }
                  >
                    {s.is_active ? <EyeOff className="size-3 mr-1" /> : <Eye className="size-3 mr-1" />}
                    {s.is_active ? "Hide" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 px-2"
                    onClick={() => setServiceToDelete(s)}
                    title="Delete service"
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
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredServices.length)} of{" "}
            {filteredServices.length} listings
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

      {/* Inspect Service Dialog */}
      <Dialog open={!!inspectingService} onOpenChange={(open) => !open && setInspectingService(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{inspectingService?.title}</DialogTitle>
            <DialogDescription>
              {inspectingService?.destination} · Published by {inspectingService?.providers?.business_name || "Provider"}
            </DialogDescription>
          </DialogHeader>

          {inspectingService && (
            <div className="space-y-4 pt-2 text-sm">
              {inspectingService.image_url && (
                <img
                  src={inspectingService.image_url}
                  alt={inspectingService.title}
                  className="h-44 w-full rounded-2xl object-cover border border-border"
                />
              )}

              <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per guest:</span>
                  <span className="font-semibold text-primary">
                    {formatPrice(Number(inspectingService.price), inspectingService.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="capitalize font-medium">{inspectingService.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity limit:</span>
                  <span className="font-medium">{inspectingService.max_guests ?? "Unlimited"} guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rating & Reviews:</span>
                  <span className="font-medium">
                    ⭐ {inspectingService.rating > 0 ? inspectingService.rating : "No ratings"} ({inspectingService.review_count} reviews)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Public Status:</span>
                  <span className="font-semibold">{inspectingService.is_active ? "Published (Visible)" : "Hidden (Moderated)"}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
                <p className="mt-1 rounded-xl bg-background border border-border p-3 text-xs leading-relaxed text-foreground max-h-40 overflow-y-auto">
                  {inspectingService.description || "No description provided for this listing."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Service Confirmation Dialog */}
      <AlertDialog open={!!serviceToDelete} onOpenChange={(open) => !open && setServiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-destructive" />
              Delete Marketplace Listing?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>
                Are you sure you want to delete <span className="font-semibold text-foreground">“{serviceToDelete?.title}”</span>?
              </p>
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                ⚠️ Listings with existing customer bookings or reviews cannot be deleted because booking and financial ledgers must be preserved. If this listing is invalid or outdated, click <strong>Hide</strong> instead.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteServiceMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteServiceMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (serviceToDelete) deleteServiceMutation.mutate(serviceToDelete.id);
              }}
            >
              {deleteServiceMutation.isPending ? "Deleting…" : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
