import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  DoorClosed,
  IndianRupee,
  KeyRound,
  Loader2,
  LogOut as CheckOutIcon,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
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
import { Textarea } from "@/components/ui/textarea";
import {
  getHotelRooms,
  getVerifierFinancials,
  getVerifierHotels,
  getVerifierReservations,
  processCheckInCheckOut,
  updateReservationStatus,
} from "@/lib/hotels.functions";
import type { HotelReservationRecord } from "@/lib/hotels.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verifier/dashboard")({
  head: () => ({
    meta: [
      { title: "Hotel Operations Hub — Travezy Verifier" },
      {
        name: "description",
        content: "Manage properties, room inventory, guest check-ins, reservations, and hotel operations.",
      },
    ],
  }),
  component: VerifierDashboardPage,
});

function VerifierDashboardPage() {
  const qc = useQueryClient();

  const getHotelsFn = useServerFn(getVerifierHotels);
  const getRoomsFn = useServerFn(getHotelRooms);
  const getReservationsFn = useServerFn(getVerifierReservations);
  const getFinancialsFn = useServerFn(getVerifierFinancials);
  const updateStatusFn = useServerFn(updateReservationStatus);
  const checkInOutFn = useServerFn(processCheckInCheckOut);

  // Rejection Dialog State
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    reservationId: string;
    guestName: string;
  }>({ open: false, reservationId: "", guestName: "" });
  const [rejectReason, setRejectReason] = useState("");

  // Queries
  const { data: hotels = [], isLoading: hotelsLoading } = useQuery({
    queryKey: ["verifier", "hotels"],
    queryFn: () => getHotelsFn(),
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["verifier", "rooms"],
    queryFn: () => getRoomsFn({ data: {} }),
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ["verifier", "reservations"],
    queryFn: () => getReservationsFn({ data: {} }),
  });

  const { data: financials, isLoading: financialsLoading } = useQuery({
    queryKey: ["verifier", "financials"],
    queryFn: () => getFinancialsFn(),
  });

  // Mutations
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
            ? "Reservation rejected. Guest notified."
            : `Reservation updated to ${vars.status}.`,
      );
      qc.invalidateQueries({ queryKey: ["verifier"] });
      setRejectDialog({ open: false, reservationId: "", guestName: "" });
      setRejectReason("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update reservation");
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
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to process check-in/out");
    },
  });

  const isLoading = hotelsLoading || roomsLoading || reservationsLoading || financialsLoading;

  // Compute live operational metrics
  const todayStr = new Date().toISOString().slice(0, 10);

  const totalHotelsCount = hotels.length;
  const activeHotelsCount = hotels.filter((h) => h.status === "active").length;
  const totalRoomsCount = rooms.reduce((acc, r) => acc + (r.total_rooms || 0), 0);
  const availableRoomsCount = rooms.reduce((acc, r) => acc + (r.available_rooms || 0), 0);

  const pendingReservations = reservations.filter((r) => r.booking_status === "PENDING");
  const confirmedReservations = reservations.filter((r) => r.booking_status === "CONFIRMED");
  const inHouseGuests = reservations.filter((r) => r.booking_status === "CHECKED_IN");

  const todayArrivals = reservations.filter(
    (r) =>
      r.check_in === todayStr &&
      (r.booking_status === "CONFIRMED" || r.booking_status === "PENDING"),
  );

  const todayDepartures = reservations.filter(
    (r) => r.check_out === todayStr && r.booking_status === "CHECKED_IN",
  );

  return (
    <PageShell
      eyebrow="Hotel Partner Operations"
      title="Property Management Console"
      subtitle="Verify incoming reservations, monitor live room inventory, manage arrivals/departures, and track property revenues."
    >
      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8 bg-card/80 border border-border p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Building2 className="size-6" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Front-Desk Desk Live</h3>
            <p className="text-xs text-muted-foreground">
              {todayArrivals.length} arrivals scheduled today • {todayDepartures.length} departing guests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5 text-xs">
            <Link to="/verifier/checkin-checkout">
              <KeyRound className="size-3.5" />
              Check-In / Out Desk
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5 text-xs">
            <Link to="/verifier/availability">
              <Calendar className="size-3.5" />
              Room Calendar
            </Link>
          </Button>
          <Button asChild variant="hero" size="sm" className="rounded-full gap-1.5 text-xs">
            <Link to="/verifier/hotels">
              <Plus className="size-3.5" />
              Add Hotel Property
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Top Summary KPI Cards (10 Core Operational Metrics) ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-10">
        <MetricCard
          label="Total Properties"
          value={totalHotelsCount}
          subtext={`${activeHotelsCount} Active Listings`}
          icon={Building2}
          color="blue"
        />
        <MetricCard
          label="Total Rooms"
          value={totalRoomsCount}
          subtext={`${availableRoomsCount} Available Now`}
          icon={BedDouble}
          color="purple"
        />
        <MetricCard
          label="Today's Arrivals"
          value={todayArrivals.length}
          subtext="Expected Check-Ins"
          icon={ArrowDownRight}
          color="emerald"
          highlight={todayArrivals.length > 0}
        />
        <MetricCard
          label="Today's Departures"
          value={todayDepartures.length}
          subtext="Pending Check-Outs"
          icon={ArrowUpRight}
          color="amber"
          highlight={todayDepartures.length > 0}
        />
        <MetricCard
          label="Pending Verification"
          value={pendingReservations.length}
          subtext="Needs Approval"
          icon={Clock}
          color="rose"
          highlight={pendingReservations.length > 0}
        />
        <MetricCard
          label="Confirmed Stays"
          value={confirmedReservations.length}
          subtext="Upcoming Bookings"
          icon={CalendarCheck}
          color="indigo"
        />
        <MetricCard
          label="In-House Guests"
          value={inHouseGuests.length}
          subtext="Currently Checked In"
          icon={UserCheck}
          color="teal"
        />
        <MetricCard
          label="Monthly Revenue"
          value={`₹${(financials?.monthly_revenue || 0).toLocaleString("en-IN")}`}
          subtext="Verified Hotel Earnings"
          icon={CreditCard}
          color="green"
        />
        <MetricCard
          label="Pending Front-Desk Cash"
          value={`₹${(financials?.pending_cash_amount || 0).toLocaleString("en-IN")}`}
          subtext="Pay on Arrival / Check-out"
          icon={IndianRupee}
          color="amber"
        />
        <MetricCard
          label="Completed Stays"
          value={financials?.completed_reservations_count || 0}
          subtext="Lifetime Check-Outs"
          icon={CheckCircle2}
          color="slate"
        />
      </div>

      {/* ── Section 1: Today's Arrivals Desk ── */}
      <section className="mb-10 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowDownRight className="size-4" />
            </span>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Today's Arrivals</h2>
              <p className="text-xs text-muted-foreground">Guests arriving today requiring room check-in and key issuance.</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full text-xs">
            <Link to="/verifier/checkin-checkout">
              Open Front Desk <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        {todayArrivals.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
            <UserCheck className="mx-auto size-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">No arrivals scheduled for today</p>
            <p className="text-xs text-muted-foreground mt-1">
              All upcoming arrivals will appear here on their check-in date.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Guest Details</th>
                  <th className="p-3.5">Hotel & Room</th>
                  <th className="p-3.5">Check-In / Out</th>
                  <th className="p-3.5">Guests</th>
                  <th className="p-3.5">Total & Payment</th>
                  <th className="p-3.5 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {todayArrivals.map((res) => (
                  <tr key={res.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-medium text-foreground">
                      <p className="font-semibold">{res.guest_name}</p>
                      <p className="text-[11px] text-muted-foreground">{res.guest_phone}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-foreground">{res.hotel?.name}</p>
                      <p className="text-[11px] text-primary">{res.room?.room_type}</p>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      <p className="font-medium text-foreground">{res.check_in}</p>
                      <p className="text-[11px]">to {res.check_out} ({res.nights}n)</p>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold">{res.guests} Guests</span>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-foreground">₹{res.total_price.toLocaleString("en-IN")}</p>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          res.payment_status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {res.payment_status} ({res.payment_method})
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8 rounded-full text-xs">
                          <Link to="/verifier/messages">
                            <MessageSquare className="size-3 mr-1" /> Contact
                          </Link>
                        </Button>
                        <Button
                          variant="hero"
                          size="sm"
                          className="h-8 rounded-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 2: Today's Departures Desk ── */}
      <section className="mb-10 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ArrowUpRight className="size-4" />
            </span>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Today's Departures</h2>
              <p className="text-xs text-muted-foreground">In-house guests completing their stay today.</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
            {todayDepartures.length} Pending Check-Outs
          </span>
        </div>

        {todayDepartures.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
            <CheckCircle2 className="mx-auto size-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">No departures pending today</p>
            <p className="text-xs text-muted-foreground mt-1">
              All departing guests have been checked out or have stays extending beyond today.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Guest Details</th>
                  <th className="p-3.5">Hotel & Room</th>
                  <th className="p-3.5">Stay Dates</th>
                  <th className="p-3.5">Payment Balance</th>
                  <th className="p-3.5 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {todayDepartures.map((res) => (
                  <tr key={res.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-medium text-foreground">
                      <p className="font-semibold">{res.guest_name}</p>
                      <p className="text-[11px] text-muted-foreground">{res.guest_phone}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-foreground">{res.hotel?.name}</p>
                      <p className="text-[11px] text-primary">{res.room?.room_type}</p>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      <p className="font-medium text-foreground">Checked in: {res.check_in}</p>
                      <p className="text-[11px] text-amber-600 font-semibold">Departs: {res.check_out}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-foreground">₹{res.total_price.toLocaleString("en-IN")}</p>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          res.payment_status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {res.payment_status} ({res.payment_method})
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
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
                        <CheckOutIcon className="size-3 mr-1" /> Check Out Guest
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 3: Pending Reservations Queue (Verification Workflow) ── */}
      <section className="mb-10 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Clock className="size-4" />
            </span>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Pending Reservations (Verification Queue)</h2>
              <p className="text-xs text-muted-foreground">Reservations waiting for hotel partner review and acceptance.</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-rose-600 bg-rose-500/10 px-3 py-1 rounded-full">
            {pendingReservations.length} Action Required
          </span>
        </div>

        {pendingReservations.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
            <CheckCircle2 className="mx-auto size-8 text-emerald-500/50 mb-2" />
            <p className="text-sm font-semibold text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No pending reservations awaiting verification.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingReservations.map((res) => (
              <div
                key={res.id}
                className="p-5 rounded-2xl border border-border/80 bg-background hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">
                        ID: {res.id.slice(0, 12)}
                      </span>
                      <h3 className="font-bold text-sm text-foreground">{res.guest_name}</h3>
                      <p className="text-xs text-muted-foreground">{res.guest_email} • {res.guest_phone}</p>
                    </div>
                    <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      PENDING VERIFICATION
                    </span>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-xl mb-3 space-y-1 text-xs">
                    <p className="font-semibold text-foreground">{res.hotel?.name}</p>
                    <p className="text-primary font-medium">{res.room?.room_type}</p>
                    <p className="text-muted-foreground">
                      Dates: <strong>{res.check_in}</strong> to <strong>{res.check_out}</strong> ({res.nights} Nights, {res.guests} Guests)
                    </p>
                    {res.special_requests && (
                      <p className="text-[11px] text-muted-foreground italic mt-1 pt-1 border-t border-border/40">
                        "{res.special_requests}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs mb-4">
                    <span className="text-muted-foreground">Total Booking Amount:</span>
                    <span className="font-bold text-base text-foreground">
                      ₹{res.total_price.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl text-xs text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      setRejectDialog({
                        open: true,
                        reservationId: res.id,
                        guestName: res.guest_name,
                      })
                    }
                  >
                    <XCircle className="size-3.5 mr-1" /> Reject
                  </Button>
                  <Button
                    variant="hero"
                    size="sm"
                    className="flex-1 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        reservation_id: res.id,
                        status: "CONFIRMED",
                      })
                    }
                  >
                    <CheckCircle2 className="size-3.5 mr-1" /> Accept Reservation
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 4: Recent Hotel Reservations Overview ── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-semibold text-lg text-foreground">Recent Reservations</h2>
            <p className="text-xs text-muted-foreground">Complete reservation registry across all properties.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
            <Link to="/verifier/reservations">
              View All Reservations <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 rounded-l-xl">Reservation ID</th>
                <th className="p-3.5">Guest</th>
                <th className="p-3.5">Hotel & Room</th>
                <th className="p-3.5">Check-In / Out</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5 text-right rounded-r-xl">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {reservations.slice(0, 8).map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                    #{r.id.slice(0, 8)}
                  </td>
                  <td className="p-3.5 font-medium text-foreground">
                    <p className="font-semibold">{r.guest_name}</p>
                    <p className="text-[11px] text-muted-foreground">{r.guest_phone}</p>
                  </td>
                  <td className="p-3.5">
                    <p className="font-medium text-foreground">{r.hotel?.name}</p>
                    <p className="text-[11px] text-primary">{r.room?.room_type}</p>
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    {r.check_in} → {r.check_out} ({r.nights}n)
                  </td>
                  <td className="p-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                        r.booking_status === "CONFIRMED" && "bg-emerald-500/10 text-emerald-600",
                        r.booking_status === "CHECKED_IN" && "bg-blue-500/10 text-blue-600",
                        r.booking_status === "CHECKED_OUT" && "bg-purple-500/10 text-purple-600",
                        r.booking_status === "COMPLETED" && "bg-slate-500/10 text-slate-600",
                        r.booking_status === "PENDING" && "bg-amber-500/10 text-amber-600",
                        r.booking_status === "REJECTED" && "bg-rose-500/10 text-rose-600",
                        r.booking_status === "CANCELLED" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {r.booking_status}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                        r.payment_status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600",
                      )}
                    >
                      {r.payment_status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-foreground">
                    ₹{r.total_price.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Rejection Confirmation Dialog ── */}
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
              Rejecting reservation for <strong>{rejectDialog.guestName}</strong>. Please provide a clear reason so the guest receives an explanation and refund guidance.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Rejection Reason *
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Room undergoing maintenance, overbooked during peak event dates, etc."
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

function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  color = "blue",
  highlight = false,
}: {
  label: string;
  value: string | number;
  subtext: string;
  icon: any;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all bg-card shadow-sm flex flex-col justify-between",
        highlight
          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
          : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </span>
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg text-xs",
            color === "blue" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            color === "purple" && "bg-purple-500/10 text-purple-600 dark:text-purple-400",
            color === "emerald" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            color === "amber" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            color === "rose" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            color === "indigo" && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
            color === "teal" && "bg-teal-500/10 text-teal-600 dark:text-teal-400",
            color === "green" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            color === "slate" && "bg-slate-500/10 text-slate-600 dark:text-slate-400",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>

      <div>
        <p className="font-display text-xl font-bold tracking-tight text-foreground truncate">
          {value}
        </p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}
