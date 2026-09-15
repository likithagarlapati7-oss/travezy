import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, dashboardPathForRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CloudinaryImageUpload } from "@/components/CloudinaryImageUpload";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Travezy" },
      { name: "description", content: "View and edit your Travezy account details and role." },
      { property: "og:title", content: "Your Profile — Travezy" },
      { property: "og:description", content: "Your Travezy account details and role." },
    ],
  }),
  component: ProfilePage,
});

const empty = { full_name: "", phone: "", avatar_url: "", bio: "", location: "" };

function ProfilePage() {
  const { user, profile, role, profileLoading, signOut } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        avatar_url: profile.avatar_url ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You are not signed in.");
      // RLS guarantees a user can only update their own profile row.
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          bio: form.bio.trim() || null,
          location: form.location.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["auth-account", user?.id] });
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/", replace: true });
  }

  if (profileLoading) {
    return (
      <PageShell eyebrow="Account" title="Loading your profile…">
        <div className="h-40 animate-pulse rounded-3xl bg-muted/60" />
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <PageShell eyebrow="Account" title="Profile unavailable">
        <p className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-destructive">
          We couldn't load your profile. Please refresh, or sign out and back in.
        </p>
        <Button variant="outline" className="mt-5" onClick={handleSignOut}>
          Sign out
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Account"
      title={profile.full_name || "Your profile"}
      subtitle="Your Travezy identity, contact details and account role."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-card lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl">Account details</h2>
            {!editing && (
              <Button variant="ocean" size="sm" onClick={() => setEditing(true)}>
                Edit profile
              </Button>
            )}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <img
              src={
                form.avatar_url ||
                `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile.full_name || "Travezy")}`
              }
              alt={profile.full_name || "Profile avatar"}
              className="size-16 rounded-full object-cover ring-2 ring-accent/40"
            />
            <div>
              <p className="font-display text-lg">{profile.email || user?.email}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {role ?? "tourist"} account
              </p>
            </div>
          </div>

          {editing ? (
            <form
              className="mt-6 grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <Field label="Full name">
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label="Phone number">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label="Location">
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="h-11 rounded-xl"
                  placeholder="City, country"
                />
              </Field>
              <div className="sm:col-span-2">
                <CloudinaryImageUpload
                  value={form.avatar_url}
                  onChange={(url) => setForm({ ...form, avatar_url: url })}
                  label="Profile Avatar Photo"
                  folder="travezy/avatars"
                />
              </div>
              <Field label="Bio" className="sm:col-span-2">
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="min-h-24 rounded-xl"
                  placeholder="Tell fellow travellers a little about yourself."
                />
              </Field>
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" variant="hero" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      full_name: profile.full_name ?? "",
                      phone: profile.phone ?? "",
                      avatar_url: profile.avatar_url ?? "",
                      bio: profile.bio ?? "",
                      location: profile.location ?? "",
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Row label="Full name" value={profile.full_name || "—"} />
              <Row label="Email" value={profile.email || user?.email || "—"} />
              <Row label="Phone" value={profile.phone || "—"} />
              <Row label="Location" value={profile.location || "—"} />
              <Row label="Bio" value={profile.bio || "—"} className="sm:col-span-2" />
            </dl>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-7 shadow-card">
          <h2 className="text-xl">Quick actions</h2>
          <div className="mt-5 flex flex-col gap-3">
            <Button asChild variant="ocean">
              <Link to={dashboardPathForRole(role)}>Go to dashboard</Link>
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Passwords are managed securely by Travezy authentication and are never stored in your
            profile.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-muted/60 p-4 ${className ?? ""}`}>
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium">{value}</dd>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
