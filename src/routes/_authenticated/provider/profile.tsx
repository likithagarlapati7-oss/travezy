import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { CloudinaryImageUpload } from "@/components/CloudinaryImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { myProviderQuery } from "@/lib/travezy";

export const Route = createFileRoute("/_authenticated/provider/profile")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Provider Business Profile & Settings — Travezy" },
      {
        name: "description",
        content: "Manage your hospitality business brand, verification badges, contact information, and payout settings on Travezy.",
      },
      { property: "og:title", content: "Provider Business Profile & Settings — Travezy" },
      {
        property: "og:description",
        content: "Provider account settings and business information.",
      },
    ],
  }),
  component: ProviderProfilePage,
});

function ProviderProfilePage() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();

  const { data: provider, isLoading: isProviderLoading } = useQuery({
    ...myProviderQuery(userId),
    enabled: !!userId,
  });

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultUpi, setDefaultUpi] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state when data is loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setBio(profile.bio || "");
    }
    if (provider) {
      setBusinessName(provider.business_name || "");
      setBusinessLocation(provider.location || "");
      setBusinessDescription(provider.description || "");
      setLogoUrl(provider.logo_url || "");
    }
  }, [profile, provider]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);

    try {
      // 1. Update profiles table
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          bio,
          location: businessLocation,
        })
        .eq("id", userId);

      if (pErr) throw pErr;

      // 2. Update providers table
      if (provider?.id) {
        const { error: provErr } = await supabase
          .from("providers")
          .update({
            business_name: businessName,
            location: businessLocation,
            description: businessDescription,
            logo_url: logoUrl,
          })
          .eq("id", provider.id);

        if (provErr) throw provErr;
      }

      toast.success("Business profile and settings updated successfully!");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["auth-account"] });
      qc.invalidateQueries({ queryKey: ["provider", userId] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      eyebrow="Provider Console"
      title="Business Profile & Settings"
      subtitle="Manage your brand entity, public contact channels, verified licenses, and settlement preferences."
    >
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Business Card & Verification */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={businessName || fullName}
                    className="size-24 rounded-3xl object-cover ring-2 ring-primary/20 shadow-md"
                  />
                ) : (
                  <span className="grid size-24 place-items-center rounded-3xl bg-primary/10 text-primary font-display text-3xl font-bold">
                    {(businessName || fullName || "P").charAt(0)}
                  </span>
                )}
                {provider?.verified && (
                  <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-emerald-500 text-white shadow-md">
                    <ShieldCheck className="size-4.5" />
                  </span>
                )}
              </div>

              <h3 className="mt-4 font-bold text-foreground text-lg">
                {businessName || "Registered Travezy Provider"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{fullName} (Host)</p>

              <div className="mt-3 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold gap-1"
                >
                  <ShieldCheck className="size-3.5" /> Verified Business
                </Badge>
                <Badge variant="outline" className="text-xs capitalize font-medium">
                  Hospitality Partner
                </Badge>
              </div>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-5 text-xs">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Mail className="size-4 text-primary shrink-0" />
                <span className="truncate text-foreground font-medium">{profile?.email || user?.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Phone className="size-4 text-primary shrink-0" />
                <span className="text-foreground font-medium">{phone || "No phone added"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <MapPin className="size-4 text-primary shrink-0" />
                <span className="text-foreground font-medium">{businessLocation || "India"}</span>
              </div>
            </div>

            <div className="border-t border-border/60 pt-4">
              <Button
                variant={isEditing ? "outline" : "ocean"}
                onClick={() => setIsEditing(!isEditing)}
                className="w-full rounded-xl text-xs font-semibold gap-1.5"
              >
                <Edit className="size-3.5" /> {isEditing ? "Cancel Editing" : "Edit Profile"}
              </Button>
            </div>
          </div>

          {/* Quick Security & Compliance Card */}
          <div className="rounded-3xl border border-border/70 bg-muted/20 p-5 space-y-3 text-xs">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Platform Compliance
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Your business profile is linked with Travezy Trust & Safety standards. All verified customer reviews and payout settlements reflect this entity name.
            </p>
          </div>
        </div>

        {/* Right Column: Editable Profile Settings Form */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <div className="border-b border-border/60 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground text-lg">Business & Personal Information</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update the brand and contact details shown to tourists on booking confirmations.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-6 space-y-6">
            {/* 1. Business Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" /> Business Entity
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="businessName" className="text-xs font-semibold">
                    Business / Brand Name
                  </Label>
                  <Input
                    id="businessName"
                    disabled={!isEditing}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Whispering Pines Hospitality Group"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="businessLocation" className="text-xs font-semibold">
                    Headquarters / Primary Destination
                  </Label>
                  <Input
                    id="businessLocation"
                    disabled={!isEditing}
                    value={businessLocation}
                    onChange={(e) => setBusinessLocation(e.target.value)}
                    placeholder="e.g. Munnar, Kerala"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="logoUrl" className="text-xs font-semibold">
                    Logo / Cover Image URL
                  </Label>
                  <Input
                    id="logoUrl"
                    disabled={!isEditing}
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="h-11 rounded-xl"
                  />
                </div>

                {isEditing && (
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-xs font-semibold">Upload Logo Image (Cloudinary)</Label>
                    <CloudinaryImageUpload
                      value={logoUrl}
                      onChange={(url) => setLogoUrl(url)}
                      folder="travezy_providers"
                    />
                  </div>
                )}

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="businessDescription" className="text-xs font-semibold">
                    Business Bio / Mission Statement
                  </Label>
                  <Textarea
                    id="businessDescription"
                    disabled={!isEditing}
                    rows={3}
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    placeholder="Describe your hospitality brand, heritage history, guest experience standards..."
                    className="rounded-xl resize-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 2. Personal Contact Info */}
            <div className="space-y-4 border-t border-border/60 pt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-primary" /> Primary Contact Person
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-semibold">
                    Host Full Name
                  </Label>
                  <Input
                    id="fullName"
                    disabled={!isEditing}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Nair"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold">
                    Official Support Phone / WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    disabled={!isEditing}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="ocean"
                  disabled={saving}
                  className="rounded-xl gap-2 font-semibold shadow-md"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" /> Save Profile Settings
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </PageShell>
  );
}
