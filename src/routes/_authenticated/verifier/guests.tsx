import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  IndianRupee,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getVerifierGuests } from "@/lib/hotels.functions";
import type { VerifierGuestRecord } from "@/lib/hotels.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verifier/guests")({
  head: () => ({
    meta: [
      { title: "Guests Directory & CRM — Travezy Verifier" },
      {
        name: "description",
        content: "Access legitimate guest contacts, stay histories, and guest communications for your properties.",
      },
    ],
  }),
  component: VerifierGuestsPage,
});

function VerifierGuestsPage() {
  const getGuestsFn = useServerFn(getVerifierGuests);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ["verifier", "guests", searchQuery],
    queryFn: () => getGuestsFn({ data: { query: searchQuery || undefined } }),
  });

  return (
    <PageShell
      eyebrow="Guest CRM"
      title="Hotel Guests Directory"
      subtitle="Authorized guest contacts, reservation histories, and direct communication channels strictly isolated to your hotel properties."
    >
      {/* Privacy Notice Banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs mb-8">
        <ShieldCheck className="size-5 text-primary shrink-0" />
        <p className="text-muted-foreground">
          <strong>Privacy Guard Active:</strong> In accordance with Travezy Data Privacy standards, you have access only to guest profiles who hold legitimate reservations at your properties. Contact information is restricted to stay operations.
        </p>
      </div>

      {/* Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guests by name, email, or phone..."
            className="rounded-full pl-10 text-xs"
          />
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          {guests.length} Verified Guests
        </span>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : guests.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card">
          <Users className="mx-auto size-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-base text-foreground">No guest records found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Guests who book stays at your hotels will be catalogued in your directory.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guests.map((guest) => (
            <div
              key={guest.guest_id || guest.guest_email}
              className="rounded-3xl border border-border bg-card p-6 shadow-card flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {guest.guest_name.charAt(0)}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{guest.guest_name}</h3>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Building2 className="size-3 text-primary" /> {guest.last_stay_hotel}
                      </span>
                    </div>
                  </div>

                  <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {guest.total_stays} Stay{guest.total_stays > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Contact & Particulars */}
                <div className="bg-muted/40 p-3.5 rounded-2xl space-y-2 text-xs mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground">{guest.guest_phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate">{guest.guest_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-border/40">
                    <IndianRupee className="size-3.5 text-emerald-600 shrink-0" />
                    <span>Total Spend: <strong className="text-foreground">₹{guest.total_spent.toLocaleString("en-IN")}</strong></span>
                  </div>
                </div>

                {/* Active Bookings Peek */}
                <div className="mb-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5">
                    Recent / Active Stays
                  </p>
                  <div className="space-y-1.5">
                    {guest.active_reservations.slice(0, 2).map((res) => (
                      <div
                        key={res.id}
                        className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-background border border-border/60"
                      >
                        <span className="font-medium truncate">{res.room?.room_type || "Room"}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {res.check_in}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50 flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1 rounded-full text-xs">
                  <a href={`tel:${guest.guest_phone}`}>
                    <Phone className="size-3 mr-1" /> Call Guest
                  </a>
                </Button>
                <Button asChild variant="hero" size="sm" className="flex-1 rounded-full text-xs">
                  <Link to="/verifier/messages">
                    <MessageSquare className="size-3 mr-1" /> Direct Chat
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
