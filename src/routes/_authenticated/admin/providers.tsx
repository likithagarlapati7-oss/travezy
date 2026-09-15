import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  MapPin,
  Search,
  ShieldAlert,
  Star,
  XCircle,
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
import { adminProvidersQuery, type AdminProviderWithStats } from "@/lib/admin";
import { adminToggleProviderVerified } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  head: () => ({
    meta: [
      { title: "Provider Administration — Travezy Admin" },
      { name: "description", content: "Review and verify travel businesses, tours, and hotels listed on Travezy." },
      { property: "og:title", content: "Provider Administration — Travezy Admin" },
      { property: "og:description", content: "Manage and verify Travezy travel businesses." },
    ],
  }),
  component: AdminProviders,
});

const PAGE_SIZE = 10;

function AdminProviders() {
  const { data: providers, isLoading, error } = useQuery(adminProvidersQuery);
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending">("all");
  const [page, setPage] = useState(1);

  // Detail Modal & Action State
  const [inspectingProvider, setInspectingProvider] = useState<AdminProviderWithStats | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdminProviderWithStats | null>(null);

  const toggleVerifiedMutation = useMutation({
    mutationFn: async ({ providerId, verified }: { providerId: string; verified: boolean }) => {
      return await adminToggleProviderVerified({ data: { providerId, verified } });
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.verified
          ? "Provider business successfully verified"
          : "Provider verification status revoked",
      );
      qc.invalidateQueries({ queryKey: ["admin", "providers"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      setToggleTarget(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update provider status");
    },
  });

  const filteredProviders = useMemo(() => {
    if (!providers) return [];
    return providers.filter((p) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "verified" && p.verified) ||
        (statusFilter === "pending" && !p.verified);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.business_name.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.profile?.email && p.profile.email.toLowerCase().includes(q)) ||
        (p.profile?.full_name && p.profile.full_name.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [providers, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProviders.length / PAGE_SIZE));
  const paginatedProviders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProviders.slice(start, start + PAGE_SIZE);
  }, [filteredProviders, page]);

  const counts = useMemo(() => {
    if (!providers) return { all: 0, verified: 0, pending: 0 };
    return {
      all: providers.length,
      verified: providers.filter((p) => p.verified).length,
      pending: providers.filter((p) => !p.verified).length,
    };
  }, [providers]);

  return (
    <PageShell
      eyebrow="Marketplace Verification"
      title="Provider Administration"
      subtitle="Verify travel operators, monitor listing portfolios, and audit business credentials."
    >
      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
            All Businesses ({counts.all})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "verified" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setStatusFilter("verified");
              setPage(1);
            }}
          >
            Verified ({counts.verified})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "pending" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setStatusFilter("pending");
              setPage(1);
            }}
          >
            Pending Verification ({counts.pending})
          </Button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search business, location..."
            className="rounded-full pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      {/* Providers Table */}
      <div className="mt-6">
        <AdminTable
          headers={["Business", "Location", "Listings", "Bookings", "Rating", "Status", "Actions"]}
          isLoading={isLoading}
          error={error}
          empty={
            searchQuery || statusFilter !== "all"
              ? "No provider businesses match your search."
              : "No provider businesses registered yet."
          }
          rows={paginatedProviders.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
              <Td>
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="size-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      {p.business_name}
                      {p.verified && <BadgeCheck className="size-4 text-emerald-500" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.profile?.email || "No contact email"}</p>
                  </div>
                </div>
              </Td>
              <Td>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground/70" />
                  {p.location || "—"}
                </span>
              </Td>
              <Td>
                <span className="text-xs font-semibold">{p.services_count} active</span>
              </Td>
              <Td>
                <span className="text-xs font-semibold">{p.bookings_count}</span>
              </Td>
              <Td>
                <div className="flex items-center gap-1 text-xs">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{p.average_rating > 0 ? p.average_rating : "—"}</span>
                </div>
              </Td>
              <Td>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${
                    p.verified
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
                  }`}
                >
                  {p.verified ? <CheckCircle2 className="size-3" /> : <Info className="size-3" />}
                  {p.verified ? "Verified" : "Pending"}
                </span>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs"
                    onClick={() => setInspectingProvider(p)}
                  >
                    <Eye className="size-3.5" />
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant={p.verified ? "outline" : "default"}
                    className="h-8 text-xs"
                    onClick={() => setToggleTarget(p)}
                  >
                    {p.verified ? "Revoke" : "Verify"}
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
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredProviders.length)} of{" "}
            {filteredProviders.length} providers
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

      {/* Provider Details Dialog */}
      <Dialog open={!!inspectingProvider} onOpenChange={(open) => !open && setInspectingProvider(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              {inspectingProvider?.business_name}
            </DialogTitle>
            <DialogDescription>Provider business profile and telemetry</DialogDescription>
          </DialogHeader>

          {inspectingProvider && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider ID:</span>
                  <code className="font-mono text-xs">{inspectingProvider.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Owner:</span>
                  <span className="font-medium">{inspectingProvider.profile?.full_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact Email:</span>
                  <span className="font-medium">{inspectingProvider.profile?.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{inspectingProvider.profile?.phone || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">{inspectingProvider.location || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold">{inspectingProvider.verified ? "Verified Business" : "Pending Verification"}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Description</p>
                <p className="mt-1 rounded-xl bg-background border border-border p-3 text-xs leading-relaxed text-foreground">
                  {inspectingProvider.description || "No public business description provided."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-lg font-bold text-primary">{inspectingProvider.services_count}</p>
                  <p className="text-[11px] text-muted-foreground">Services</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-lg font-bold text-primary">{inspectingProvider.bookings_count}</p>
                  <p className="text-[11px] text-muted-foreground">Bookings</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-lg font-bold text-primary">{inspectingProvider.average_rating || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">Rating</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verification Toggle Confirmation Dialog */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" />
              {toggleTarget?.verified ? "Revoke Provider Verification?" : "Verify Provider Business?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.verified
                ? `Revoking verification for “${toggleTarget?.business_name}” will remove their verified badge on the marketplace. Their active listings will remain accessible unless hidden.`
                : `Verifying “${toggleTarget?.business_name}” confirms their business legitimacy and displays the verified badge across their marketplace listings.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleVerifiedMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={toggleVerifiedMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (toggleTarget) {
                  toggleVerifiedMutation.mutate({
                    providerId: toggleTarget.id,
                    verified: !toggleTarget.verified,
                  });
                }
              }}
            >
              {toggleVerifiedMutation.isPending
                ? "Updating…"
                : toggleTarget?.verified
                  ? "Revoke Verification"
                  : "Verify Business"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
