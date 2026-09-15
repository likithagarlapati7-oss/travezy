import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  CalendarCheck,
  CalendarRange,
  ChevronDown,
  Compass,
  CreditCard,
  Heart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Navigation,
  Plane,
  Shield,
  Star,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, dashboardPathForRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home" },
  { to: "/destinations", label: "Destinations" },
  { to: "/explore-near-me", label: "📍 Near Me" },
  { to: "/planner", label: "✨ Plan Trip" },
  { to: "/tours", label: "Find Guides" },
  { to: "/wishlist", label: "♡ Wishlist" },
  { to: "/ai-guide", label: "AI Assistant" },
  { to: "/emergency", label: "Emergency Support" },
] as const;

export function Navbar({ transparent = false }: { transparent?: boolean }) {
  const [open, setOpen] = useState(false);
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const roleLinks =
    role === "admin"
      ? ([
          { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
          { to: "/admin/users", label: "Users", icon: Users },
          { to: "/admin/providers", label: "Providers", icon: Shield },
          { to: "/admin/services", label: "Services", icon: Compass },
          { to: "/admin/bookings", label: "Bookings", icon: Plane },
          { to: "/admin/payments", label: "Payments", icon: CreditCard },
          { to: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
          { to: "/admin/reviews", label: "Reviews", icon: Star },
        ] as const)
      : role === "verifier"
        ? ([
            { to: "/verifier/dashboard", label: "Hotel Hub", icon: LayoutDashboard },
            { to: "/verifier/hotels", label: "Properties", icon: Building2 },
            { to: "/verifier/rooms", label: "Room Inventory", icon: BedDouble },
            { to: "/verifier/reservations", label: "Reservations", icon: CalendarCheck },
            { to: "/verifier/guests", label: "Guests CRM", icon: Users },
            { to: "/verifier/availability", label: "Availability", icon: CalendarRange },
            { to: "/verifier/checkin-checkout", label: "Check-In / Out", icon: KeyRound },
            { to: "/verifier/payments", label: "Hotel Revenue", icon: CreditCard },
            { to: "/verifier/messages", label: "Guest Messages", icon: MessageSquare },
            { to: "/verifier/reviews", label: "Hotel Reviews", icon: Star },
            { to: "/verifier/profile", label: "Partner Profile", icon: User },
          ] as const)
        : role === "provider"
          ? ([
              { to: "/provider/dashboard", label: "Provider Hub", icon: LayoutDashboard },
              { to: "/provider/services", label: "Services", icon: Compass },
              { to: "/provider/bookings", label: "Bookings", icon: Plane },
              { to: "/provider/calendar", label: "Calendar", icon: CalendarRange },
              { to: "/provider/customers", label: "Customers", icon: Users },
              { to: "/provider/analytics", label: "Analytics", icon: BarChart3 },
              { to: "/provider/wallet", label: "Earnings & Wallet", icon: Wallet },
              { to: "/provider/reviews", label: "Reviews", icon: Star },
              { to: "/provider/messages", label: "Host Messages", icon: MessageSquare },
              { to: "/provider/notifications", label: "Notifications", icon: Bell },
              { to: "/provider/profile", label: "Business Profile", icon: User },
              { to: "/guide/dashboard", label: "Guide Hub", icon: Compass },
            ] as const)
          : ([
              { to: "/tourist/dashboard", label: "Dashboard", icon: LayoutDashboard },
              { to: "/tourist/wishlist", label: "My Wishlist", icon: Heart },
              { to: "/tourist/itineraries", label: "My Itineraries", icon: CalendarRange },
              { to: "/tourist/bookings", label: "My Trips", icon: Plane },
              { to: "/tourist/messages", label: "Messages", icon: MessageSquare },
              { to: "/tourist/payments", label: "Payments", icon: CreditCard },
              { to: "/tourist/reviews", label: "Reviews", icon: Star },
            ] as const);

  const mainDashboardPath = dashboardPathForRole(role);
  const mainDashboardLabel =
    role === "admin"
      ? "Admin Console"
      : role === "verifier"
        ? "Hotel Operations"
        : role === "provider"
          ? "Provider Hub"
          : "Dashboard";

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        transparent
          ? "glass-panel border-x-0 border-t-0"
          : "border-b border-border bg-background/85 backdrop-blur-xl",
      )}
    >
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-2" aria-label="Travezy Home">
          <span
            className={cn(
              "grid size-9 place-items-center rounded-full bg-gradient-lagoon text-primary-foreground shadow-card",
            )}
          >
            <Plane className="size-4" />
          </span>
          <span
            className={cn(
              "font-display text-2xl font-semibold tracking-tight",
              transparent ? "text-primary-foreground" : "text-foreground",
            )}
          >
            Travezy
          </span>
        </Link>

        {/* Desktop Main Links */}
        <ul className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={cn(
                  "text-sm font-medium transition-colors",
                  transparent
                    ? "text-primary-foreground/85 hover:text-gold"
                    : "text-muted-foreground hover:text-primary",
                  pathname === l.to && (transparent ? "text-gold" : "text-primary font-semibold"),
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop Right Actions */}
        <div className="hidden items-center gap-3 lg:flex">
          {loading ? (
            <div className="h-9 w-32 animate-pulse rounded-full bg-muted/60" />
          ) : user ? (
            <>
              <NotificationBell transparent={transparent} />

              <Button
                asChild
                variant={transparent ? "glass" : pathname.startsWith(mainDashboardPath) ? "hero" : "outline"}
                size="sm"
                className="rounded-full gap-1.5"
              >
                <Link to={mainDashboardPath}>
                  <LayoutDashboard className="size-3.5" />
                  {mainDashboardLabel}
                </Link>
              </Button>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={transparent ? "glass" : "ghost"}
                    size="sm"
                    className="rounded-full gap-2 px-3 text-xs"
                    aria-label="User menu"
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase">
                      {user.email ? user.email.charAt(0) : "U"}
                    </span>
                    <span className="capitalize font-medium">{role || "Account"}</span>
                    <ChevronDown className="size-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2 shadow-float">
                  <div className="px-2 py-1.5 border-b border-border/50 mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
                    <span className="inline-block text-[10px] uppercase font-bold text-primary tracking-wider mt-0.5">
                      {role} Account
                    </span>
                  </div>

                  {roleLinks.map((l) => {
                    const Icon = l.icon;
                    return (
                      <DropdownMenuItem key={l.to} asChild className="rounded-xl cursor-pointer">
                        <Link to={l.to} className="flex items-center gap-2.5 py-2 text-xs">
                          <Icon className="size-4 text-muted-foreground" />
                          <span>{l.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="rounded-xl cursor-pointer text-destructive focus:text-destructive flex items-center gap-2.5 py-2 text-xs"
                  >
                    <LogOut className="size-4" />
                    <span>Log Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant={transparent ? "glass" : "ghost"} size="sm" className="rounded-full">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="hero" size="sm" className="rounded-full">
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Header Actions */}
        <div className="flex items-center gap-2 lg:hidden">
          {user && <NotificationBell transparent={transparent} />}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "grid size-10 place-items-center rounded-full lg:hidden transition-colors",
              transparent ? "glass-panel text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80",
            )}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {open && (
        <div className="border-t border-border bg-background px-5 pb-6 pt-4 lg:hidden max-h-[calc(100vh-5rem)] overflow-y-auto">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    pathname === l.to ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-border pt-4">
            {user ? (
              <div className="space-y-3">
                <div className="px-3 py-1">
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <span className="text-[11px] font-bold text-primary uppercase">{role} Portal</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {roleLinks.map((l) => {
                    const Icon = l.icon;
                    return (
                      <Button
                        key={l.to}
                        asChild
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 rounded-xl text-xs"
                      >
                        <Link to={l.to} onClick={() => setOpen(false)}>
                          <Icon className="size-3.5 text-primary" />
                          {l.label}
                        </Link>
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full rounded-xl gap-2 mt-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button asChild variant="outline" className="flex-1 rounded-xl">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Login
                  </Link>
                </Button>
                <Button asChild variant="hero" className="flex-1 rounded-xl">
                  <Link to="/register" onClick={() => setOpen(false)}>
                    Register
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
