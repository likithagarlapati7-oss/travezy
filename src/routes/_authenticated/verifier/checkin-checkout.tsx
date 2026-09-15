import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  DoorClosed,
  History,
  KeyRound,
  Loader2,
  LogOut as CheckOutIcon,
  Phone,
  ShieldCheck,
  UserCheck,
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
import {
  getVerifierReservations,
  processCheckInCheckOut,
} from "@/lib/hotels.functions";
import type { HotelReservationRecord } from "@/lib/hotels.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verifier/checkin-checkout")({
  head: () => ({
    meta: [
      { title: "Front-Desk Check-In & Check-Out — Travezy Verifier" },
      {
        name: "description",
        content: "Front desk operations desk for managing guest arrivals, room key assignment, and departing guest check-outs.",
      },
    ],
  }),
  component: VerifierCheckInOutPage,
});

function VerifierCheckInOutPage() {
  const qc = useQueryClient();
  const getReservationsFn = useServerFn(getVerifierReservations);
  const checkInOutFn = useServerFn(processCheckInCheckOut);

  const [activeDesk, setActiveDesk] = useState<"arrivals" | "departures" | "inhouse">("arrivals");

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    reservation: HotelReservationRecord | null;
    action: "check_in" | "check_out";
  }>({ open: false, reservation: null, action: "check_in" });

  const [roomNumber, setRoomNumber] = useState("");

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["verifier", "reservations"],
    queryFn: () => getReservationsFn({ data: {} }),
  });

  const checkInOutMutation = useMutation({
    mutationFn: async ({
      reservation_id,
      action,
      room_number,
    }: {
      reservation_id: string;
      action: "check_in" | "check_out";
      room_number?: string | null | undefined;
    }) => {
      return await checkInOutFn({
        data: { reservation_id, action, room_number: room_number || null },
      });
    },
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ["verifier"] });
      setConfirmModal({ open: false, reservation: null, action: "check_in" });
      setRoomNumber("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to process check-in/out");
    },
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const todayArrivals = reservations.filter(
    (r) =>
      r.check_in === todayStr &&
      (r.booking_status === "CONFIRMED" || r.booking_status === "PENDING"),
  );

  const todayDepartures = reservations.filter(
    (r) => r.check_out === todayStr && r.booking_status === "CHECKED_IN",
  );

  const inHouseGuests = reservations.filter((r) => r.booking_status === "CHECKED_IN");

  const completedStays = reservations.filter(
    (r) => r.booking_status === "CHECKED_OUT" || r.booking_status === "COMPLETED",
  );

  return (
    <PageShell
      eyebrow="Front Desk"
      title="Check-In & Check-Out Operations Desk"
      subtitle="Verify arriving guests, assign room keys, record front-desk check-ins, and process departing check-outs."
    >
      {/* Top Desk Selector Tabs */}
      <div className="flex gap-2 p-1.5 bg-card border border-border rounded-full w-fit mb-8 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveDesk("arrivals")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all",
            activeDesk === "arrivals"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowDownRight className="size-4" />
          Today's Arrivals Desk ({todayArrivals.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveDesk("departures")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all",
            activeDesk === "departures"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowUpRight className="size-4" />
          Today's Departures Desk ({todayDepartures.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveDesk("inhouse")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all",
            activeDesk === "inhouse"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <UserCheck className="size-4" />
          All In-House Guests ({inHouseGuests.length})
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : activeDesk === "arrivals" ? (
        /* ── Arrivals Desk ── */
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-border/50">
            <div>
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                <span className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                Front Desk Arrivals Queue
              </h2>
              <p className="text-xs text-muted-foreground">
                Arriving guests scheduled for check-in today ({todayStr}).
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
              {todayArrivals.length} Guests Expected
            </span>
          </div>

          {todayArrivals.length === 0 ? (
            <div className="p-12 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
              <CheckCircle2 className="mx-auto size-10 text-emerald-500/50 mb-2" />
              <p className="font-semibold text-sm">No pending arrivals for today</p>
              <p className="text-xs text-muted-foreground mt-1">
                All expected guests for today have checked in.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {todayArrivals.map((res) => (
                <div
                  key={res.id}
                  className="rounded-2xl border border-border bg-background p-5 hover:border-emerald-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          #{res.id.slice(0, 10)}
                        </span>
                        <h3 className="font-bold text-base text-foreground">{res.guest_name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="size-3 text-primary" /> {res.guest_phone}
                        </p>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                        {res.booking_status}
                      </span>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-xl mb-3 space-y-1 text-xs">
                      <p className="font-semibold text-foreground">{res.hotel?.name}</p>
                      <p className="text-primary font-medium">{res.room?.room_type}</p>
                      <p className="text-muted-foreground">
                        Stay: <strong>{res.check_in}</strong> to <strong>{res.check_out}</strong> ({res.nights} Nights, {res.guests} Guests)
                      </p>
                      {res.special_requests && (
                        <p className="text-[11px] text-muted-foreground italic mt-1 pt-1 border-t border-border/40">
                          "{res.special_requests}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="text-muted-foreground">Payment Status:</span>
                      <span
                        className={cn(
                          "font-bold",
                          res.payment_status === "PAID" ? "text-emerald-600" : "text-amber-600",
                        )}
                      >
                        {res.payment_status} (₹{res.total_price.toLocaleString("en-IN")})
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="hero"
                    size="sm"
                    className="w-full rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    onClick={() =>
                      setConfirmModal({
                        open: true,
                        reservation: res,
                        action: "check_in",
                      })
                    }
                  >
                    <KeyRound className="size-3.5" /> Execute Check-In & Issue Key
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeDesk === "departures" ? (
        /* ── Departures Desk ── */
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-border/50">
            <div>
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                <span className="size-3 rounded-full bg-amber-500 animate-pulse" />
                Front Desk Departures Queue
              </h2>
              <p className="text-xs text-muted-foreground">
                Guests departing today ({todayStr}) completing their check-out.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
              {todayDepartures.length} Departures Pending
            </span>
          </div>

          {todayDepartures.length === 0 ? (
            <div className="p-12 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
              <CheckCircle2 className="mx-auto size-10 text-amber-500/50 mb-2" />
              <p className="font-semibold text-sm">No pending departures for today</p>
              <p className="text-xs text-muted-foreground mt-1">
                All departing guests have completed check-out.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {todayDepartures.map((res) => (
                <div
                  key={res.id}
                  className="rounded-2xl border border-border bg-background p-5 hover:border-amber-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          #{res.id.slice(0, 10)}
                        </span>
                        <h3 className="font-bold text-base text-foreground">{res.guest_name}</h3>
                        <p className="text-xs text-muted-foreground">{res.guest_phone}</p>
                      </div>
                      <span className="bg-amber-500/10 text-amber-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                        DEPARTING TODAY
                      </span>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-xl mb-3 space-y-1 text-xs">
                      <p className="font-semibold text-foreground">{res.hotel?.name}</p>
                      <p className="text-primary font-medium">{res.room?.room_type}</p>
                      <p className="text-muted-foreground">
                        Stay: <strong>{res.check_in}</strong> → <strong>{res.check_out}</strong>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="text-muted-foreground">Total Bill / Dues:</span>
                      <span
                        className={cn(
                          "font-bold",
                          res.payment_status === "PAID" ? "text-emerald-600" : "text-amber-600",
                        )}
                      >
                        {res.payment_status} (₹{res.total_price.toLocaleString("en-IN")})
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl text-xs text-destructive hover:bg-destructive hover:text-white gap-2"
                    onClick={() =>
                      setConfirmModal({
                        open: true,
                        reservation: res,
                        action: "check_out",
                      })
                    }
                  >
                    <CheckOutIcon className="size-3.5" /> Execute Check-Out & Release Room
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── In-House Guests ── */
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-border/50">
            <div>
              <h2 className="font-bold text-lg text-foreground">In-House Guests Registry</h2>
              <p className="text-xs text-muted-foreground">
                All guests currently checked in and residing at your properties.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full">
              {inHouseGuests.length} In-House Guests
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Guest Details</th>
                  <th className="p-3.5">Property & Room</th>
                  <th className="p-3.5">Checked In At</th>
                  <th className="p-3.5">Check-Out Date</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {inHouseGuests.map((res) => (
                  <tr key={res.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-medium text-foreground">
                      <p className="font-bold">{res.guest_name}</p>
                      <p className="text-[11px] text-muted-foreground">{res.guest_phone}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-foreground">{res.hotel?.name}</p>
                      <p className="text-[11px] text-primary">{res.room?.room_type}</p>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {res.checked_in_at
                        ? new Date(res.checked_in_at).toLocaleDateString()
                        : res.check_in}
                    </td>
                    <td className="p-3.5 font-semibold text-foreground">{res.check_out}</td>
                    <td className="p-3.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          res.payment_status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600",
                        )}
                      >
                        {res.payment_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full text-xs text-destructive hover:bg-destructive hover:text-white"
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            reservation: res,
                            action: "check_out",
                          })
                        }
                      >
                        <CheckOutIcon className="size-3 mr-1" /> Check Out
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Check-In / Check-Out Confirmation Dialog ── */}
      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-semibold flex items-center gap-2">
              {confirmModal.action === "check_in" ? (
                <>
                  <KeyRound className="size-5 text-emerald-600" /> Confirm Guest Check-In
                </>
              ) : (
                <>
                  <CheckOutIcon className="size-5 text-destructive" /> Confirm Guest Check-Out
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {confirmModal.action === "check_in"
                ? `Checking in ${confirmModal.reservation?.guest_name} for ${confirmModal.reservation?.room?.room_type}.`
                : `Processing departure for ${confirmModal.reservation?.guest_name}. This will free the room for housekeeping.`}
            </DialogDescription>
          </DialogHeader>

          {confirmModal.action === "check_in" && (
            <div className="py-2 space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Assigned Room Number (Optional)</label>
                <Input
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. Room 204"
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                <p className="text-muted-foreground">
                  Guest ID verification completed at front desk.
                </p>
                <p className="font-semibold text-foreground">
                  Bill Status: {confirmModal.reservation?.payment_status} (₹
                  {confirmModal.reservation?.total_price.toLocaleString("en-IN")})
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setConfirmModal({ open: false, reservation: null, action: "check_in" })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmModal.action === "check_in" ? "hero" : "destructive"}
              size="sm"
              className="rounded-xl text-xs"
              disabled={checkInOutMutation.isPending}
              onClick={() => {
                if (confirmModal.reservation) {
                  checkInOutMutation.mutate({
                    reservation_id: confirmModal.reservation.id,
                    action: confirmModal.action,
                    room_number: roomNumber || undefined,
                  });
                }
              }}
            >
              {checkInOutMutation.isPending
                ? "Processing..."
                : confirmModal.action === "check_in"
                  ? "Confirm & Complete Check-In"
                  : "Confirm & Complete Check-Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
