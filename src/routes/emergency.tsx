import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Ambulance,
  HeartPulse,
  Phone,
  ShieldCheck,
  MapPin,
  Navigation,
  Languages,
  ShieldAlert,
  Hospital,
  Pill,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Check,
  Copy,
  LocateFixed,
  HelpCircle,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmergencyMap } from "@/components/EmergencyMap";
import {
  EMERGENCY_HELPLINES,
  type EmergencyPlace,
  type EmergencyPlaceCategory,
} from "@/lib/emergency.schema";
import { getNearbyEmergencyPlacesFn } from "@/lib/emergency.functions";
import { aiTranslateFn } from "@/lib/ai.functions";
import { SUPPORTED_LANGUAGES } from "@/lib/ai.schema";
import { toast } from "sonner";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency Assistance & Nearby Hospitals / Police — Travezy" },
      {
        name: "description",
        content:
          "Locate nearby hospitals, police stations, pharmacies, access 24/7 emergency hotlines, and translate emergency phrases.",
      },
      { property: "og:title", content: "Emergency Assistance — Travezy" },
      {
        property: "og:description",
        content:
          "Instant nearby hospital and police search, 24/7 hotlines, and emergency translation on Travezy.",
      },
    ],
  }),
  component: EmergencyPage,
});

const EMERGENCY_PHRASES = [
  "Where is the nearest hospital?",
  "I need urgent medical help.",
  "Please call an ambulance.",
  "Please call the police.",
  "I am lost, please help me find my way.",
  "Where is the nearest pharmacy or medical store?",
  "I have lost my passport and luggage.",
];

const POPULAR_HUBS = [
  { name: "Goa (Panaji)", lat: 15.4989, lng: 73.8278 },
  { name: "Kerala (Kochi)", lat: 9.9312, lng: 76.2673 },
  { name: "Manali", lat: 32.2396, lng: 77.1887 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
];

function EmergencyPage() {
  // Geolocation state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "detecting" | "success" | "denied" | "unavailable"
  >("idle");

  // Emergency facilities state
  const [category, setCategory] = useState<EmergencyPlaceCategory>("hospital");
  const [places, setPlaces] = useState<EmergencyPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  // Translation state
  const [phraseInput, setPhraseInput] = useState(EMERGENCY_PHRASES[0]);
  const [translateTargetLang, setTranslateTargetLang] = useState("hi");
  const [translatedPhrase, setTranslatedPhrase] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  // AI Guidance state
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  // Request browser location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  // Fetch nearby places when location or category changes
  useEffect(() => {
    if (userLocation) {
      fetchNearbyPlaces(userLocation.lat, userLocation.lng, category);
    }
  }, [userLocation, category]);

  // Translate initial phrase
  useEffect(() => {
    if (phraseInput) {
      handleTranslatePhrase(phraseInput, translateTargetLang);
    }
  }, [phraseInput, translateTargetLang]);

  function detectLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      // Use Goa as fallback center
      setUserLocation({ lat: 15.4989, lng: 73.8278 });
      return;
    }

    setLocationStatus("detecting");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
        };
        setUserLocation(coords);
        setLocationStatus("success");
        toast.success("Location acquired successfully!");
      },
      (err) => {
        console.warn("[Geolocation] error:", err.message);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus("denied");
        } else {
          setLocationStatus("unavailable");
        }
        // Graceful fallback to Goa so map and listings are populated immediately
        setUserLocation({ lat: 15.4989, lng: 73.8278 });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  async function fetchNearbyPlaces(lat: number, lng: number, cat: EmergencyPlaceCategory) {
    setIsLoadingPlaces(true);
    try {
      const res = await getNearbyEmergencyPlacesFn({
        data: {
          lat,
          lng,
          category: cat,
          radiusKm: 25,
          limit: 15,
        },
      });

      setPlaces(res.places);
      if (res.places.length > 0 && res.places[0]) {
        setSelectedPlaceId(res.places[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load emergency facilities");
    } finally {
      setIsLoadingPlaces(false);
    }
  }

  async function handleTranslatePhrase(phrase: string, targetLang: string) {
    setIsTranslating(true);
    try {
      const res = await aiTranslateFn({
        data: {
          text: phrase,
          sourceLanguage: "auto",
          targetLanguage: targetLang,
          preserveFormatting: true,
        },
      });

      setTranslatedPhrase(res.translatedText);
    } catch (err: any) {
      console.warn("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleCopyTranslation() {
    if (!translatedPhrase) return;
    try {
      await navigator.clipboard.writeText(translatedPhrase);
      setCopied(true);
      toast.success("Emergency phrase copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  function handleAiAdvice(topic: string) {
    setAiQuestion(topic);
    if (topic.includes("passport")) {
      setAiAdvice(
        "1. File an FIR at the nearest police station immediately.\n2. Contact your country's Embassy/Consulate with the police report copy.\n3. Request an Emergency Certificate (EC) or replacement passport.\n4. Travezy Support Desk can assist with travel rebooking."
      );
    } else if (topic.includes("FIR") || topic.includes("police")) {
      setAiAdvice(
        "1. Visit the nearest police station (shown on the map above).\n2. Request the duty officer to record an FIR (First Information Report).\n3. Keep an official stamped copy of the FIR for travel insurance and embassy claims.\n4. Call 112 if you are in immediate danger."
      );
    } else {
      setAiAdvice(
        "1. Present the translated medical phrase below to hospital reception.\n2. Keep your passport and insurance policy number ready.\n3. Government hospitals (District Hospitals / GMC) offer 24/7 trauma emergency care."
      );
    }
  }

  return (
    <PageShell
      eyebrow="24/7 Immediate Help & Safety"
      title="Emergency Assistance Hub"
      subtitle="Locate nearby hospitals, police stations, pharmacies, access verified 24/7 emergency hotlines, and get instant emergency translation."
    >
      <div className="space-y-10">
        {/* GEOLOCATION & STATUS BAR */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              <LocateFixed className={`size-5 text-primary ${locationStatus === "detecting" ? "animate-spin" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current GPS Location
                </span>
                {locationStatus === "success" && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Live GPS Active
                  </Badge>
                )}
                {(locationStatus === "denied" || locationStatus === "unavailable") && (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    Fallback Region
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {userLocation
                  ? `${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° E`
                  : "Detecting location..."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={detectLocation}
              disabled={locationStatus === "detecting"}
              className="rounded-xl text-xs"
            >
              <RotateCcw className="size-3.5 mr-1.5" />
              {locationStatus === "detecting" ? "Detecting..." : "Refresh Location"}
            </Button>

            {/* Quick Hub Switcher */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground text-[11px] mr-1">Hub:</span>
              <select
                onChange={(e) => {
                  const hub = POPULAR_HUBS.find((h) => h.name === e.target.value);
                  if (hub) {
                    setUserLocation({ lat: hub.lat, lng: hub.lng });
                    toast.success(`Centered on ${hub.name}`);
                  }
                }}
                className="h-8 rounded-xl border border-input bg-background px-2 text-xs font-medium focus:outline-none"
              >
                {POPULAR_HUBS.map((h) => (
                  <option key={h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location Denied / Unavailable Guidance Alert if applicable */}
        {locationStatus === "denied" && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Browser location permission was not granted</p>
              <p className="mt-0.5 leading-relaxed text-muted-foreground">
                We're currently showing facilities around popular tourist regions (Goa). You can enable location permissions in your browser bar and click "Refresh Location" to view facilities closest to you.
              </p>
            </div>
          </div>
        )}

        {/* QUICK CATEGORY FILTER BUTTONS */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant={category === "hospital" ? "ocean" : "outline"}
            onClick={() => setCategory("hospital")}
            className="rounded-2xl gap-2 font-medium"
          >
            <Hospital className="size-4 text-red-500" />
            Nearby Hospitals
          </Button>

          <Button
            type="button"
            variant={category === "police" ? "ocean" : "outline"}
            onClick={() => setCategory("police")}
            className="rounded-2xl gap-2 font-medium"
          >
            <ShieldCheck className="size-4 text-blue-500" />
            Nearby Police Stations
          </Button>

          <Button
            type="button"
            variant={category === "pharmacy" ? "ocean" : "outline"}
            onClick={() => setCategory("pharmacy")}
            className="rounded-2xl gap-2 font-medium"
          >
            <Pill className="size-4 text-emerald-500" />
            Nearby Pharmacies
          </Button>

          <Button
            type="button"
            variant={category === "all" ? "ocean" : "outline"}
            onClick={() => setCategory("all")}
            className="rounded-2xl gap-2 font-medium"
          >
            <ShieldAlert className="size-4 text-amber-500" />
            All Emergency Facilities
          </Button>
        </div>

        {/* INTERACTIVE MAP & DISTANCE-SORTED LIST VIEW */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Map Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold flex items-center gap-2">
                <MapPin className="size-5 text-accent" />
                Live Map
              </h3>
              <span className="text-xs text-muted-foreground">
                {places.length} verified places found
              </span>
            </div>

            <EmergencyMap
              userLocation={userLocation}
              places={places}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={(p) => setSelectedPlaceId(p.id)}
              height="h-[520px]"
            />
          </div>

          {/* Sorted List Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold">
                Facilities Sorted by Distance
              </h3>
              <Badge variant="outline" className="text-xs">
                Nearest First
              </Badge>
            </div>

            <div className="h-[520px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {isLoadingPlaces ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-muted/60 animate-pulse" />
                  ))}
                </div>
              ) : places.length > 0 ? (
                places.map((place) => {
                  const isSelected = place.id === selectedPlaceId;
                  const isHospital = place.category === "hospital";
                  const isPolice = place.category === "police";

                  return (
                    <div
                      key={place.id}
                      onClick={() => setSelectedPlaceId(place.id)}
                      className={`rounded-2xl border p-4.5 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-secondary/20 shadow-md ring-1 ring-primary/40"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isHospital
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                  : isPolice
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              }`}
                            >
                              {place.category}
                            </span>
                            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                              {place.formattedDistance}
                            </span>
                          </div>
                          <h4 className="font-display text-base font-semibold text-foreground leading-snug truncate">
                            {place.name}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {place.address}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <a
                          href={place.directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-accent"
                        >
                          <Navigation className="size-3.5" />
                          Get Directions ↗
                        </a>

                        {place.phone && (
                          <a
                            href={`tel:${place.phone.replace(/\s/g, "")}`}
                            className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <Phone className="size-3.5" />
                            {place.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
                  No facilities found in this immediate radius. Try zooming out or selecting a nearby hub.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EMERGENCY PHRASE TRANSLATION BAR */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                <Languages className="size-4 text-accent" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">Emergency Phrase Translator</h3>
                <p className="text-xs text-muted-foreground">Communicate urgently with local responders, police, or hospital staff</p>
              </div>
            </div>

            {/* Target Language Select */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Translate into:</span>
              <select
                value={translateTargetLang}
                onChange={(e) => setTranslateTargetLang(e.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium focus:outline-none"
              >
                {Object.entries(SUPPORTED_LANGUAGES)
                  .filter(([code]) => code !== "auto")
                  .map(([code, info]) => (
                    <option key={code} value={code}>
                      {info.flag} {info.name} ({info.nativeName})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Suggested Emergency Phrases */}
          <div className="flex flex-wrap gap-1.5">
            {EMERGENCY_PHRASES.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPhraseInput(phrase)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                  phraseInput === phrase
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/60 text-foreground border-border hover:bg-muted"
                }`}
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Translation Output Card */}
          <div className="rounded-2xl bg-secondary/30 border border-secondary p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Translated Phrase ({SUPPORTED_LANGUAGES[translateTargetLang]?.name}):
              </p>
              <p className="font-display text-xl font-bold text-foreground">
                {isTranslating ? "Translating..." : translatedPhrase || "Select phrase"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyTranslation}
              disabled={!translatedPhrase || isTranslating}
              className="rounded-xl text-xs shrink-0"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 mr-1.5 text-emerald-500" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5 mr-1.5" /> Copy Phrase
                </>
              )}
            </Button>
          </div>
        </div>

        {/* AI EMERGENCY ADVISOR & PROCEDURAL GUIDANCE */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-card space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-2xl bg-gradient-lagoon text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">AI Emergency Procedural Guidance</h3>
              <p className="text-xs text-muted-foreground">Instant step-by-step guidance for travel incidents</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAiAdvice("I lost my passport in India. What are the immediate steps?")}
              className="rounded-xl text-xs"
            >
              🛂 Lost Passport Steps
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAiAdvice("How do I file a police FIR report as a foreign tourist?")}
              className="rounded-xl text-xs"
            >
              👮 How to File a Police FIR
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAiAdvice("How do I communicate medical insurance at a hospital?")}
              className="rounded-xl text-xs"
            >
              🏥 Medical Insurance Procedure
            </Button>
          </div>

          {aiAdvice && (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-xs space-y-2 animate-float-up">
              <p className="font-semibold text-foreground">{aiQuestion}</p>
              <div className="whitespace-pre-line text-muted-foreground leading-relaxed">
                {aiAdvice}
              </div>
            </div>
          )}

          {/* Mandatory Safety Notice */}
          <div className="text-[11px] text-muted-foreground bg-muted/30 p-3 rounded-xl flex items-start gap-2">
            <ShieldAlert className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>Important Notice:</strong> AI advice provides general travel procedures and does not replace emergency medical dispatchers, police authorities, or consular officials. In life-threatening emergencies, dial <strong>112</strong> immediately.
            </p>
          </div>
        </div>

        {/* 24/7 EMERGENCY HELPLINES DIRECTORY */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl font-semibold">24/7 Verified Emergency Helplines</h3>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Active Hotline Dispatch
            </Badge>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {EMERGENCY_HELPLINES.map((h, i) => (
              <div
                key={i}
                className="rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-float transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                      {h.country}
                    </span>
                    <Phone className="size-4 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <h4 className="font-display text-lg font-semibold text-foreground">
                    {h.category}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {h.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-xl font-bold text-primary">
                    {h.number}
                  </span>
                  <Button asChild size="sm" variant="hero" className="rounded-xl px-4 text-xs">
                    <a href={`tel:${h.number.replace(/\s/g, "")}`}>Call Now</a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
