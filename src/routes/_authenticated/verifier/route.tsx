import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarRange,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Star,
  User,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verifier")({
  beforeLoad: async ({ context }) => {
    // Verifier rights are checked on the server/DB
    await requireRole((context as { user: { id: string } }).user.id, ["verifier", "admin"]);
  },
  component: VerifierLayout,
});

const verifierTabs = [
  { to: "/verifier/dashboard", label: "Operations Hub", icon: LayoutDashboard },
  { to: "/verifier/hotels", label: "Properties", icon: Building2 },
  { to: "/verifier/rooms", label: "Rooms Inventory", icon: BedDouble },
  { to: "/verifier/reservations", label: "Reservations", icon: CalendarCheck },
  { to: "/verifier/guests", label: "Guests CRM", icon: Users },
  { to: "/verifier/availability", label: "Availability", icon: CalendarRange },
  { to: "/verifier/checkin-checkout", label: "Check-In / Out", icon: KeyRound },
  { to: "/verifier/payments", label: "Hotel Revenue", icon: CreditCard },
  { to: "/verifier/messages", label: "Messages", icon: MessageSquare },
  { to: "/verifier/reviews", label: "Reviews", icon: Star },
  { to: "/verifier/profile", label: "Profile", icon: User },
] as const;

function VerifierLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div>
      <div className="border-b border-border bg-card/60 pt-24 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-5 md:px-8 pb-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Hotel Partner Console
              </span>
            </div>
            <span className="text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Live Property Operations
            </span>
          </div>

          <nav className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
            {verifierTabs.map((t) => {
              const Icon = t.icon;
              const isActive = pathname === t.to;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all shrink-0",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="min-h-[calc(100vh-10rem)] bg-background">
        <Outlet />
      </main>
    </div>
  );
}
