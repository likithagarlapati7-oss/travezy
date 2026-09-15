import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Briefcase, Building2, TreePalm } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import heroImage from "@/assets/hero-travel.jpg";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, dashboardPathForRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — Travezy" },
      {
        name: "description",
        content:
          "Register as a tourist, service provider, or hotel partner/verifier on Travezy.",
      },
      { property: "og:title", content: "Create your account — Travezy" },
      {
        property: "og:description",
        content: "Register as a tourist, service provider, or hotel partner/verifier on Travezy.",
      },
    ],
  }),
  component: RegisterPage,
});

const accountTypes = [
  { value: "tourist", label: "Tourist", desc: "Book stays, tours and dining.", icon: TreePalm },
  {
    value: "provider",
    label: "Service Provider",
    desc: "List tours and activities.",
    icon: Briefcase,
  },
  {
    value: "verifier",
    label: "Hotel Partner",
    desc: "Manage hotels, rooms and guests.",
    icon: Building2,
  },
] as const;

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Please enter your full name")
      .max(100, "Name must be under 100 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email address")
      .max(255),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number")
      .max(20, "Phone number is too long")
      .regex(/^[+()\-\s0-9]+$/, "Phone can only contain digits and + ( ) -"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must contain a letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

function RegisterPage() {
  const navigate = useNavigate();
  const { user, role, loading, profileLoading } = useAuth();
  const [accountType, setAccountType] = useState<"tourist" | "provider" | "verifier">("tourist");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (loading || !user || profileLoading || checkEmail) return;
    navigate({ to: dashboardPathForRole(role), replace: true });
  }, [user, role, loading, profileLoading, checkEmail, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse({
      fullName,
      email,
      phone,
      password,
      confirmPassword,
    });
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
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: parsed.data.fullName,
            phone: parsed.data.phone,
            account_type: accountType,
          },
        },
      });
      if (error) {
        const message = /already registered|already exists|user already/i.test(error.message)
          ? "An account with this email already exists. Try logging in instead."
          : /password/i.test(error.message)
            ? error.message
            : error.message;
        toast.error(message);
        setErrors({ form: message });
        return;
      }
      // Profile + role rows are created automatically for the new auth user.
      if (!data.session) {
        setCheckEmail(true);
        toast.success("Check your email to confirm your account.");
        return;
      }
      toast.success("Welcome to Travezy!");
    } catch {
      const message = "Network error — check your connection and try again.";
      toast.error(message);
      setErrors({ form: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="flex items-center justify-center px-5 pb-16 pt-32 md:px-12">
          <form onSubmit={onSubmit} noValidate className="w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-foreground/70">
              Join Travezy
            </p>
            <h1 className="mt-3 text-4xl">Create your account</h1>

            {checkEmail ? (
              <div className="mt-8 rounded-3xl border border-border bg-card p-7 shadow-card">
                <h2 className="text-xl">Confirm your email</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
                  Travezy account, then sign in.
                </p>
                <Button asChild variant="ocean" className="mt-5 w-full">
                  <Link to="/login">Go to login</Link>
                </Button>
              </div>
            ) : (
              <>
                {errors['form'] && (
                  <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {errors['form']}
                  </p>
                )}

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {accountTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setAccountType(t.value)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        accountType === t.value
                          ? "border-accent bg-secondary shadow-card"
                          : "border-border bg-card hover:border-accent/50",
                      )}
                    >
                      <t.icon className="size-5 text-accent" />
                      <p className="mt-2 font-semibold">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-6 space-y-4">
                  <Field
                    id="name"
                    label="Full name"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Ada Sharma"
                    error={errors['fullName']}
                  />
                  <Field
                    id="phone"
                    label="Phone number"
                    value={phone}
                    onChange={setPhone}
                    placeholder="+91 98765 43210"
                    error={errors['phone']}
                  />
                  <Field
                    id="email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    error={errors['email']}
                  />
                  <Field
                    id="password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="At least 8 characters, with a number"
                    error={errors['password']}
                  />
                  <Field
                    id="confirmPassword"
                    label="Confirm password"
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Re-enter your password"
                    error={errors['confirmPassword']}
                  />
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="mt-7 w-full"
                  disabled={submitting}
                >
                  {submitting ? "Creating account…" : "Register"}
                </Button>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-primary hover:text-accent">
                    Login
                  </Link>
                </p>
              </>
            )}
          </form>
        </div>

        <div className="relative hidden lg:block">
          <img
            src={heroImage}
            alt="Turquoise coastline at sunset"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-ocean opacity-70" />
          <div className="absolute inset-x-0 bottom-0 p-14 text-primary-foreground">
            <h2 className="font-display text-4xl leading-tight">
              Travel more. Or host the journeys others dream of.
            </h2>
            <p className="mt-3 max-w-md text-primary-foreground/80">
              One account, two worlds — book as a tourist or sell as a verified provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  error?: string | undefined;
  type?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl"
        placeholder={placeholder ?? ""}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
