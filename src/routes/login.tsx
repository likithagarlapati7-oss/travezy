import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import heroImage from "@/assets/hero-travel.jpg";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, dashboardPathForRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search['redirect'] === "string" ? { redirect: search['redirect'] } : {},
  head: () => ({
    meta: [
      { title: "Login — Travezy" },
      { name: "description", content: "Sign in to manage your Travezy trips, bookings and services." },
      { property: "og:title", content: "Login — Travezy" },
      {
        property: "og:description",
        content: "Sign in to manage your Travezy trips, bookings and services.",
      },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, role, loading, profileLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Only redirect once the session AND role are known — never before.
  useEffect(() => {
    if (loading || !user || profileLoading) return;
    const target = search.redirect;
    if (target && target.startsWith("/") && !target.startsWith("//")) {
      navigate({ to: target, replace: true });
      return;
    }
    navigate({ to: dashboardPathForRole(role), replace: true });
  }, [user, role, loading, profileLoading, navigate, search.redirect]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) {
        const message = /invalid login credentials/i.test(error.message)
          ? "Incorrect email or password."
          : /email not confirmed/i.test(error.message)
            ? "Please confirm your email before signing in."
            : error.message;
        toast.error(message);
        setErrors({ form: message });
        return;
      }
      toast.success("Welcome back to Travezy");
      // The effect above routes to the correct dashboard once the role loads.
    } catch {
      const message = "Network error — check your connection and try again.";
      toast.error(message);
      setErrors({ form: message });
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || (!!user && profileLoading);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative hidden lg:block">
          <img
            src={heroImage}
            alt="Turquoise coastline at sunset"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-ocean opacity-70" />
          <div className="absolute inset-x-0 bottom-0 p-14 text-primary-foreground">
            <h2 className="font-display text-4xl leading-tight">
              Your next journey is one sign-in away.
            </h2>
            <p className="mt-3 max-w-md text-primary-foreground/80">
              Track bookings, revisit wishlists and message your providers in one place.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center px-5 pb-16 pt-32 md:px-12">
          <form onSubmit={onSubmit} noValidate className="w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-foreground/70">
              Welcome back
            </p>
            <h1 className="mt-3 text-4xl">Login to Travezy</h1>

            {errors['form'] && (
              <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errors['form']}
              </p>
            )}

            <div className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="you@example.com"
                />
                {errors['email'] && (
                  <p className="text-xs text-destructive">{errors['email']}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="••••••••"
                />
                {errors['password'] && (
                  <p className="text-xs text-destructive">{errors['password']}</p>
                )}
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="mt-7 w-full" disabled={busy}>
              {busy ? "Signing in…" : "Login"}
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              New to Travezy?{" "}
              <Link to="/register" className="font-semibold text-primary hover:text-accent">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
