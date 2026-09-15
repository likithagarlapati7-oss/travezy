import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Edit,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getVerifierHotels } from "@/lib/hotels.functions";

export const Route = createFileRoute("/_authenticated/verifier/profile")({
  head: () => ({
    meta: [
      { title: "Hotel Partner Profile — Travezy Verifier" },
      {
        name: "description",
        content: "Manage your hotelier partner credentials, contact details, business entity, and verified properties.",
      },
    ],
  }),
  component: VerifierProfilePage,
});

function VerifierProfilePage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const getHotelsFn = useServerFn(getVerifierHotels);

  const [fullName, setFullName] = useState(profile?.full_name || "Heritage Hotels & Stays Group");
  const [phone, setPhone] = useState(profile?.phone || "+91 98200 88990");
  const [businessName, setBusinessName] = useState("Travezy Verified Hotel Partner Network");
  const [taxId, setTaxId] = useState("GSTIN: 08AAACH1234F1Z5");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: hotels = [] } = useQuery({
    queryKey: ["verifier", "hotels"],
    queryFn: () => getHotelsFn(),
  });

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Hotel partner profile updated successfully!");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["auth-account"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      eyebrow="Partner Credentials"
      title="Hotelier Profile & Account"
      subtitle="Manage your business verification details, emergency front-desk contact, and associated property licenses."
    >
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Profile Card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <span className="grid size-20 place-items-center rounded-3xl bg-primary/10 text-primary font-display text-2xl font-bold">
                {fullName.charAt(0)}
              </span>
              <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-emerald-500 text-white shadow-md">
                <ShieldCheck className="size-4" />
              </span>
            </div>

            <h3 className="font-display font-semibold text-lg text-foreground mt-4">
              {fullName}
            </h3>
            <p className="text-xs text-muted-foreground">{user?.email}</p>

            <div className="mt-3 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <BadgeCheck className="size-3.5" /> Verified Hotel Partner
            </div>
          </div>

          <div className="border-t border-border/50 pt-5 space-y-3 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Account Role</span>
              <strong className="text-foreground uppercase">VERIFIER / HOTELIER</strong>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Managed Properties</span>
              <strong className="text-foreground">{hotels.length} Active Hotels</strong>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Verification Status</span>
              <strong className="text-emerald-600">KYC Verified</strong>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Member Since</span>
              <strong className="text-foreground">August 2026</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Partner Form & Properties Summary */}
        <div className="space-y-8 lg:col-span-2">
          {/* Form */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-border/50">
              <div>
                <h3 className="font-bold text-base text-foreground">Partner Business Details</h3>
                <p className="text-xs text-muted-foreground">
                  Official contact information displayed on reservation invoices and front desk operations.
                </p>
              </div>
              <Button
                variant={isEditing ? "outline" : "hero"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancel" : <><Edit className="size-3.5 mr-1" /> Edit Profile</>}
              </Button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Primary Contact / Host Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={!isEditing}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Registered Entity / Group Name</Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={!isEditing}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Account Email (Login Identity)</Label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="rounded-xl text-xs bg-muted"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Front-Desk Phone Number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!isEditing}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Business Tax / GSTIN License</Label>
                  <Input
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    disabled={!isEditing}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button
                    type="submit"
                    variant="hero"
                    size="sm"
                    className="rounded-xl text-xs gap-1.5"
                    disabled={saving}
                  >
                    <Save className="size-3.5" />
                    {saving ? "Saving Changes..." : "Save Profile"}
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Connected Properties Overview */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-bold text-base text-foreground mb-4">
              Connected Hotel Properties ({hotels.length})
            </h3>
            <div className="space-y-3">
              {hotels.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/50 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="size-4" />
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{h.name}</p>
                      <p className="text-muted-foreground">{h.city}, {h.state} • {h.phone}</p>
                    </div>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
