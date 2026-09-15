import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  KeyRound,
  Loader2,
  LogOut as CheckOutIcon,
  Mail,
  MessageSquare,
  Phone,
  Search,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getVerifierReservations,
  processCheckInCheckOut,
  updateReservationStatus,
} from "@/lib/hotels.functions";
import type { HotelReservationRecord } from "@/lib/hotels.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verifier/reservations")({
  head: () => ({
    meta: [
      { title: "Hotel Reservations Console — Travezy Verifier" },
      {
        name: "description",
        content: "Manage guest bookings, verification workflow, check-ins, check-outs, and stay statuses.",
      },
    ],
  }),
  component: VerifierReservationsPage,
});

const STATUS_TABS = [
  { id: "ALL", label: "All Reservations" },
  { id: "PENDING", label: "Pending Verification" },
  { id: "CONFIRMED", label: "Confirmed Stays" },
  { id: "CHECKED_IN", label: "In-House (Checked In)" },
  { id: "CHECKED_OUT", label: "Checked Out" },
  { id: "COMPLETED", label: "Completed" },
  { id: "REJECTED", label: "Rejected" },
  { id: "CANCELLED", label: "Cancelled" },
] as const;

function VerifierReservationsPage() {
  const qc = useQueryClient();
  const getReservationsFn = useServerFn(getVerifierReservations);
  const updateStatusFn = useServerFn(updateReservationStatus);
  const checkInOutFn = useServerFn(processCheckInCheckOut);

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Details Modal
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    reservation: HotelReservationRecord | null;
  }>({ open: false, reservation: null });

  // Rejection Dialog
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    reservationId: string;
    guestName: string;
  }>({ open: false, reservationId: "", guestName: "" });
  const [rejectReason, setRejectReason] = useState("");

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["verifier", "reservations", activeTab],
    queryFn: () => getReservationsFn({ data: { status: activeTab !== "ALL" ? activeTab : undefined } }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      reservation_id,
      status,
      rejection_reason,
    }: {
      reservation_id: string;
      status: any;
      rejection_reason?: string;
    }) => {
      return await updateStatusFn({
        data: { reservation_id, status, rejection_reason },
      });
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.status === "CONFIRMED"
          ? "Reservation accepted and confirmed!"
          : vars.status === "REJECTED"
            ? "Reservation rejected. Guest informed."
            : `Reservation status changed to ${vars.status}.`,
      );
      qc.invalidateQueries({ queryKey: ["verifier"] });
      setRejectDialog({ open: false, reservationId: "", guestName: "" });
      setRejectReason("");
      if (detailModal.reservation?.id === vars.reservation_id) {
        setDetailModal({ open: false, reservation: null });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const checkInOutMutation = useMutation({
    mutationFn: async ({
      reservation_id,
      action,
    }: {
      reservation_id: string;
      action: "check_in" | "check_out";
    }) => {
      return await checkInOutFn({
        data: { reservation_id, action },
      });
    },
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ["verifier"] });
      if (detailModal.open) {
        setDetailModal({ open: false, reservation: null });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to process check-in/out");
    },
  });

  const filtered = reservations.filter((r) => {
    if (activeTab !== "ALL" && r.booking_status !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.guest_name.toLowerCase().includes(q) ||
      r.guest_email.toLowerCase().includes(q) ||
      r.guest_phone.includes(q) ||
      (r.hotel?.name && r.hotel.name.toLowerCase().includes(q)) ||
      (r.room?.room_type && r.room.room_type.toLowerCase().includes(q)) ||
      r.id.toLowerCase().includes(q)
    );
  });

  return (
    <PageShell
      eyebrow="Guest Bookings"
      title="Hotel Reservations Console"
      subtitle="Accept, verify, check in, check out, and manage stay reservations across your hotel properties."
    >
      {/* Search & Tabs */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by guest name, phone, reservation ID..."
              className="rounded-full pl-10 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
              <Link to="/verifier/checkin-checkout">
                <KeyRound className="size-3.5" /> Check-In / Out Desk
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {STATUS_TABS.map((t) => {
            const count =
              t.id === "ALL"
                ? reservations.length
                : reservations.filter((r) => r.booking_status === t.id).length;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                <span>{t.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isActive ? "bg-white/20 text-white" : "bg-muted text-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Content */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-card">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck className="mx-auto size-12 text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-base text-foreground">No reservations found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              No reservation records match the selected status or query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Reservation ID</th>
                  <th className="p-4">Guest Information</th>
                  <th className="p-4">Hotel & Room</th>
                  <th className="p-4">Stay Dates</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((res) => (
                  <tr key={res.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-mono text-[11px] text-muted-foreground">
                      #{res.id.slice(0, 8)}
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      <p className="font-bold text-sm">{res.guest_name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="size-3 text-primary" /> {res.guest_phone}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Mail className="size-3 text-muted-foreground" /> {res.guest_email}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-foreground">{res.hotel?.name}</p>
                      <p className="text-[11px] text-primary font-semibold">{res.room?.room_type}</p>
                      <p className="text-[10px] text-muted-foreground">{res.guests} Guests</p>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <p className="font-medium text-foreground">{res.check_in}</p>
                      <p className="text-[11px]">to {res.check_out} ({res.nights} Nights)</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                          res.booking_status === "CONFIRMED" && "bg-emerald-500/10 text-emerald-600",
                          res.booking_status === "CHECKED_IN" && "bg-blue-500/10 text-blue-600",
                          res.booking_status === "CHECKED_OUT" && "bg-purple-500/10 text-purple-600",
                          res.booking_status === "COMPLETED" && "bg-slate-500/10 text-slate-600",
                          res.booking_status === "PENDING" && "bg-amber-500/10 text-amber-600",
                          res.booking_status === "REJECTED" && "bg-rose-500/10 text-rose-600",
                          res.booking_status === "CANCELLED" && "bg-muted text-muted-foreground",
                        )}
                      >
                        {res.booking_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          res.payment_status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600",
                        )}
                      >
                        {res.payment_status} ({res.payment_method})
                      </span>
                    </td>
                    <td className="p-4 font-bold text-sm text-foreground">
                      ₹{res.total_price.toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full text-xs px-2.5"
                          onClick={() => setDetailModal({ open: true, reservation: res })}
                        >
                          <Eye className="size-3.5 mr-1" /> View
                        </Button>

                        {res.booking_status === "PENDING" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-full text-xs text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                setRejectDialog({
                                  open: true,
                                  reservationId: res.id,
                                  guestName: res.guest_name,
                                })
                              }
                            >
                              <XCircle className="size-3 mr-1" /> Reject
                            </Button>
                            <Button
                              variant="hero"
                              size="sm"
                              className="h-8 rounded-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={updateStatusMutation.isPending}
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  reservation_id: res.id,
                                  status: "CONFIRMED",
                                })
                              }
                            >
                              <CheckCircle2 className="size-3 mr-1" /> Accept
                            </Button>
                          </>
                        )}

                        {res.booking_status === "CONFIRMED" && (
                          <Button
                            variant="hero"
                            size="sm"
                            className="h-8 rounded-full text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={checkInOutMutation.isPending}
                            onClick={() =>
                              checkInOutMutation.mutate({
                                reservation_id: res.id,
                                action: "check_in",
                              })
                            }
                          >
                            <KeyRound className="size-3 mr-1" /> Check In
                          </Button>
                        )}

                        {res.booking_status === "CHECKED_IN" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full text-xs text-destructive hover:bg-destructive hover:text-white"
                            disabled={checkInOutMutation.isPending}
                            onClick={() =>
                              checkInOutMutation.mutate({
                                reservation_id: res.id,
                                action: "check_out",
                              })
                            }
                          >
                            <CheckOutIcon className="size-3 mr-1" /> Check Out
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── View Details Modal ── */}
      <Dialog
        open={detailModal.open}
        onOpenChange={(open) => setDetailModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-semibold flex items-center gap-2">
              <CalendarCheck className="size-5 text-primary" />
              Reservation #{detailModal.reservation?.id.slice(0, 10)}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete reservation dossier, guest profile, room assignment, and transaction details.
            </DialogDescription>
          </DialogHeader>

          {detailModal.reservation && (
            <div className="space-y-4 py-2 text-xs">
              {/* Status Header */}
              <div className="flex items-center justify-between bg-muted/40 p-3 rounded-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Booking Status
                  </span>
                  <span className="font-bold text-sm text-foreground">
                    {detailModal.reservation.booking_status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Payment
                  </span>
                  <span className="font-bold text-sm text-emerald-600">
                    {detailModal.reservation.payment_status} (₹
                    {detailModal.reservation.total_price.toLocaleString("en-IN")})
                  </span>
                </div>
              </div>

              {/* Guest Profile & Contact */}
              <div className="p-4 rounded-2xl border border-border space-y-2">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <User className="size-4 text-primary" /> Guest Contact (Privacy-Filtered)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Guest Name</span>
                    <strong className="text-foreground">{detailModal.reservation.guest_name}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Party Size</span>
                    <strong className="text-foreground">{detailModal.reservation.guests} Guests</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Phone</span>
                    <strong className="text-foreground">{detailModal.reservation.guest_phone}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Email</span>
                    <strong className="text-foreground">{detailModal.reservation.guest_email}</strong>
                  </div>
                </div>
              </div>

              {/* Stay Particulars */}
              <div className="p-4 rounded-2xl border border-border space-y-2">
                <h4 className="font-bold text-foreground">Stay Details</h4>
                <p className="font-semibold text-foreground">{detailModal.reservation.hotel?.name}</p>
                <p className="text-primary font-medium">{detailModal.reservation.room?.room_type}</p>
                <p className="text-muted-foreground">
                  Check-In: <strong>{detailModal.reservation.check_in}</strong> | Check-Out: <strong>{detailModal.reservation.check_out}</strong> ({detailModal.reservation.nights} Nights)
                </p>
                {detailModal.reservation.special_requests && (
                  <div className="mt-2 bg-muted/40 p-2.5 rounded-xl">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Special Requests
                    </span>
                    <p className="text-foreground italic">{detailModal.reservation.special_requests}</p>
                  </div>
                )}
                {detailModal.reservation.rejection_reason && (
                  <div className="mt-2 bg-rose-500/10 text-rose-700 dark:text-rose-400 p-2.5 rounded-xl">
                    <span className="text-[10px] font-semibold uppercase block">Rejection Reason</span>
                    <p>{detailModal.reservation.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setDetailModal({ open: false, reservation: null })}
            >
              Close
            </Button>
            <Button asChild variant="hero" size="sm" className="rounded-xl text-xs">
              <Link to="/verifier/messages">
                <MessageSquare className="size-3.5 mr-1" /> Open Guest Chat
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rejection Reason Modal ── */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(o) => setRejectDialog((prev) => ({ ...prev, open: o }))}
      >
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 text-destructive">
              <XCircle className="size-5" /> Reject Reservation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rejecting reservation for <strong>{rejectDialog.guestName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Rejection Reason *
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Dates fully booked for private banquet, maintenance in room block..."
              rows={3}
              className="text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setRejectDialog({ open: false, reservationId: "", guestName: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-xl text-xs"
              disabled={!rejectReason.trim() || updateStatusMutation.isPending}
              onClick={() =>
                updateStatusMutation.mutate({
                  reservation_id: rejectDialog.reservationId,
                  status: "REJECTED",
                  rejection_reason: rejectReason.trim(),
                })
              }
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
