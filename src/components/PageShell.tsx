import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function PageShell({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="bg-gradient-ocean pb-20 pt-32 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
          )}
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight md:text-5xl">{title}</h1>
          {subtitle && (
            <p className="mt-4 max-w-2xl text-base text-primary-foreground/75">{subtitle}</p>
          )}
        </div>
      </section>
      <main className="mx-auto -mt-10 max-w-7xl px-5 pb-24 md:px-8">{children}</main>
      <Footer />
    </div>
  );
}
