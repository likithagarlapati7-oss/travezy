import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  MapPin,
  Search,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { AdminTable, Td } from "@/components/AdminTable";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminBookingsQuery } from "@/lib/admin";
import { adminUpdateBookingStatus } from "@/lib/admin.functions";
import { formatPrice } from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Booking Administration — Travezy Admin" },
      { name: "description", content: "Monitor and inspect every customer booking and reservation across Travezy." },
      { property: "og:title", content: "Booking Administration — Travezy Admin" },
      { property: "og:description", content: "Monitor marketplace bookings." },
    ],
  }),
  component: AdminBookings,
});

const PAGE_SIZE = 10;

function AdminBookings() {
  const { data: bookings, isLoading, error } = useQuery(adminBookingsQuery);
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [inspectingBooking, setInspectingBooking] = useState<any | null>(null);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      return await adminUpdateBookingStatus({ data: { bookingId, status } });
    },
    onSuccess: () => {
      toast.success("Booking status updated");
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      setInspectingBooking(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update booking status"),
  });

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      const matchesStatus = statusFilter === "all" || b.status.toLowerCase() === statusFilter.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.id.toLowerCase().includes(q) ||
        (b.services?.title && b.services.title.toLowerCase().includes(q)) ||
        (b.services?.destination && b.services.destination.toLowerCase().includes(q)) ||
        (b.tourist?.full_name && b.tourist.full_name.toLowerCase().includes(q)) ||
        (b.tourist?.email && b.tourist.email.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [bookings, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const paginatedBookings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, page]);

  const counts = useMemo(() => {
    if (!bookings) return { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    return {
      all: bookings.length,
      pending: bookings.filter((b) => b.status.toLowerCase() === "pending").length,
      confirmed: bookings.filter((b) => b.status.toLowerCase() === "confirmed").length,
      completed: bookings.filter((b) => b.status.toLowerCase() === "completed").length,
      cancelled: bookings.filter((b) => b.status.toLowerCase() === "cancelled").length,
    };
  }, [bookings]);

  return (
    <PageShell
      eyebrow="Marketplace Reservations"
      title="Booking Administration"
      subtitle="Inspect guest itineraries, audit booking statuses, and review reservation fulfillment."
    >
      {/* Status Filters & Search Bar */}
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
            All ({counts.all})
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
            Pending ({counts.pending})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "confirmed" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setStatusFilter("confirmed");
              setPage(1);
            }}
          >
            Confirmed ({counts.confirmed})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "completed" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setStatusFilter("completed");
              setPage(1);
            }}
          >
            Completed ({counts.completed})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "cancelled" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setStatusFilter("cancelled");
              setPage(1);
            }}
          >
            Cancelled ({counts.cancelled})
          </Button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search booking ID, tourist, service..."
            className="rounded-full pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="mt-6">
        <AdminTable
          headers={["Booking ID", "Tourist", "Service", "Travel Date", "Guests", "Total Amount", "Status", "Actions"]}
          isLoading={isLoading}
          error={error}
          empty={
            searchQuery || statusFilter !== "all"
              ? "No bookings match your filter criteria."
              : "No bookings recorded yet."
          }
          rows={paginatedBookings.map((b) => (
            <tr key={b.id} className="hover:bg-muted/30 transition-colors">
              <Td>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {b.id.slice(0, 8)}…
                </code>
              </Td>
              <Td>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground">{b.tourist?.full_name || "Tourist"}</p>
                  <p className="text-xs text-muted-foreground">{b.tourist?.email || "—"}</p>
                </div>
              </Td>
              <Td>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate max-w-xs">
                    {b.services?.title ?? "Service listing"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" />
                    {b.services?.destination ?? "—"}
                  </p>
                </div>
              </Td>
              <Td>
                <span className="text-xs text-foreground flex items-center gap-1">
                  <Calendar className="size-3 text-muted-foreground" />
                  {b.travel_date || "To confirm"}
                </span>
              </Td>
              <Td>
                <span className="text-xs font-semibold">{b.guests} guest{b.guests > 1 ? "s" : ""}</span>
              </Td>
              <Td>
                <span className="font-display font-semibold text-sm text-primary">
                  {formatPrice(Number(b.total_price))}
                </span>
              </Td>
              <Td>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                    b.status === "confirmed"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : b.status === "completed"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : b.status === "cancelled"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {b.status}
                </span>
              </Td>
              <Td>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setInspectingBooking(b)}
                >
                  <Eye className="size-3.5" />
                  Inspect
                </Button>
              </Td>
            </tr>
          ))}
        />
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredBookings.length)} of{" "}
            {filteredBookings.length} bookings
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

      {/* Booking Details Modal */}
      <Dialog open={!!inspectingBooking} onOpenChange={(open) => !open && setInspectingBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="size-5 text-primary" />
              Reservation Details
            </DialogTitle>
            <DialogDescription>Full booking audit and traveler information</DialogDescription>
          </DialogHeader>

          {inspectingBooking && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <code className="font-mono text-xs">{inspectingBooking.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Title:</span>
                  <span className="font-semibold">{inspectingBooking.services?.title ?? "Service"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destination:</span>
                  <span>{inspectingBooking.services?.destination ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Travel Date:</span>
                  <span className="font-medium">{inspectingBooking.travel_date || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guests:</span>
                  <span className="font-medium">{inspectingBooking.guests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Price:</span>
                  <span className="font-display font-semibold text-primary">
                    {formatPrice(Number(inspectingBooking.total_price))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking Status:</span>
                  <span className="font-semibold uppercase tracking-wider text-xs">
                    {inspectingBooking.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booked On:</span>
                  <span>{new Date(inspectingBooking.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Tourist info */}
              <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-muted-foreground uppercase tracking-wider">Tourist Contact</p>
                <p className="font-medium text-foreground">{inspectingBooking.tourist?.full_name || "Guest"}</p>
                <p className="text-muted-foreground">{inspectingBooking.tourist?.email || "No email"}</p>
                <p className="text-muted-foreground">{inspectingBooking.tourist?.phone || "No phone number"}</p>
              </div>

              {inspectingBooking.notes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Special Notes</p>
                  <p className="mt-1 rounded-xl bg-background border border-border p-3 text-xs leading-relaxed text-foreground">
                    {inspectingBooking.notes}
                  </p>
                </div>
              )}

              {/* Administrative Status Override */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Administrative Status Override</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={inspectingBooking.status === "confirmed" ? "default" : "outline"}
                    disabled={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        bookingId: inspectingBooking.id,
                        status: "confirmed",
                      })
                    }
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant={inspectingBooking.status === "completed" ? "default" : "outline"}
                    disabled={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        bookingId: inspectingBooking.id,
                        status: "completed",
                      })
                    }
                  >
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant={inspectingBooking.status === "cancelled" ? "destructive" : "outline"}
                    disabled={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        bookingId: inspectingBooking.id,
                        status: "cancelled",
                      })
                    }
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
