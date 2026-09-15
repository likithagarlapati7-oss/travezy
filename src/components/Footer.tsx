import { Link } from "@tanstack/react-router";
import { Plane } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gradient-ocean text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-4 md:px-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-gradient-gold text-gold-foreground">
              <Plane className="size-4" />
            </span>
            <span className="font-display text-2xl font-semibold">Travezy</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-primary-foreground/70">
            A premium marketplace connecting travellers with trusted destinations, stays and local
            experiences worldwide.
          </p>
        </div>
        <FooterCol
          title="Explore"
          items={[
            { to: "/destinations", label: "Destinations" },
            { to: "/hotels", label: "Hotels" },
            { to: "/tours", label: "Tours" },
            { to: "/services", label: "All services" },
          ]}
        />
        <FooterCol
          title="Travellers"
          items={[
            { to: "/ai-guide", label: "AI Guide" },
            { to: "/emergency", label: "Emergency Support" },
            { to: "/tourist/dashboard", label: "My trips" },
          ]}
        />
        <FooterCol
          title="Providers"
          items={[
            { to: "/register", label: "Become a provider" },
            { to: "/provider/dashboard", label: "Provider dashboard" },
            { to: "/login", label: "Login" },
          ]}
        />
      </div>
      <div className="border-t border-white/10 px-5 py-6 text-center text-xs text-primary-foreground/60 md:px-8">
        © {new Date().getFullYear()} Travezy. Crafted for unforgettable journeys.
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { to: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-gold">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((i) => (
          <li key={i.label}>
            <Link
              to={i.to}
              className="text-sm text-primary-foreground/75 transition-colors hover:text-gold"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
