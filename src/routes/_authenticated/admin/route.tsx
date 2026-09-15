import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { requireRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    // Role comes from the database (user_roles); admin rights are granted in the backend only.
    await requireRole((context as { user: { id: string } }).user.id, ["admin"]);
  },
  component: AdminLayout,
});

const tabs = [
  { to: "/admin/dashboard", label: "Overview" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/providers", label: "Providers" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/reviews", label: "Reviews" },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <div className="border-b border-border bg-card/60 pt-24 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-3 md:px-8">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                pathname === t.to
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
