import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Wand2,
  Send,
  Calendar,
  Compass,
  MapPin,
  Utensils,
  Sun,
  Sunset,
  Moon,
  Info,
  DollarSign,
  Users,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Briefcase,
  ChevronRight,
  Sliders,
  MessageSquare,
  BookmarkCheck,
  ShieldAlert,
  Languages,
  Check,
  Copy,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ServiceCard } from "@/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TravelInterests,
  SUPPORTED_LANGUAGES,
  type StructuredItinerary,
  type ChatMessage,
} from "@/lib/ai.schema";
import { aiChatFn, aiGenerateItineraryFn, aiTranslateFn } from "@/lib/ai.functions";
import { TravelTranslator } from "@/components/TravelTranslator";
import type { ServiceWithProvider } from "@/lib/travezy";
import { toast } from "sonner";

export const Route = createFileRoute("/ai-guide")({
  head: () => ({
    meta: [
      { title: "AI Travel Assistant & Trip Planner — Travezy" },
      {
        name: "description",
        content:
          "Generate personalized day-by-day itineraries, explore verified stays & tours, and get smart travel recommendations.",
      },
      { property: "og:title", content: "AI Travel Assistant — Travezy" },
      {
        property: "og:description",
        content:
          "Plan personalized trips and explore bookable platform services with Travezy's AI Travel Assistant.",
      },
    ],
  }),
  component: AiAssistantPage,
});

const STARTER_PROMPTS = [
  "Plan a 3-day Goa trip under ₹20,000",
  "Create a romantic Kerala itinerary for 4 days",
  "Suggest a 3-day family trip to Jaipur with kids",
  "Find top adventure activities and treks in Manali",
  "Recommend luxury stays and culinary spots in Udaipur",
];

const POPULAR_DESTINATIONS = [
  "Goa",
  "Kerala",
  "Manali",
  "Jaipur",
  "Kashmir",
  "Udaipur",
  "Leh Ladakh",
  "Varanasi",
  "Andaman",
  "Paris",
  "Bali",
];

function AiAssistantPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "planner" | "translator">("chat");

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your **Travezy AI Travel Assistant**. How can I help you plan your next unforgettable trip? You can ask me to create an itinerary, suggest hidden gems, or find verified stays and tours.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatRecommendedServices, setChatRecommendedServices] = useState<ServiceWithProvider[]>([]);
  const [currentItinerary, setCurrentItinerary] = useState<StructuredItinerary | null>(null);

  // Structured Planner State
  const [destination, setDestination] = useState("Goa");
  const [days, setDays] = useState(3);
  const [startDate, setStartDate] = useState("");
  const [budget, setBudget] = useState(15000);
  const [currency, setCurrency] = useState("INR");
  const [travelers, setTravelers] = useState(2);
  const [groupType, setGroupType] = useState<"solo" | "couple" | "family" | "friends" | "backpacker" | "luxury">("couple");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "Beaches & Water Sports",
    "Food & Culinary",
    "Relaxation & Wellness",
  ]);
  const [activityPace, setActivityPace] = useState<"relaxed" | "moderate" | "packed">("moderate");
  const [customNotes, setCustomNotes] = useState("");
  const [isPlannerLoading, setIsPlannerLoading] = useState(false);
  const [plannerServices, setPlannerServices] = useState<ServiceWithProvider[]>([]);

  // Active day view tab for day-by-day display
  const [selectedDayTab, setSelectedDayTab] = useState<number>(1);

  // Inline translation states for chat messages
  const [translatingMsgIndex, setTranslatingMsgIndex] = useState<number | null>(null);
  const [messageTranslations, setMessageTranslations] = useState<Record<number, { text: string; lang: string }>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatLoading]);

  // Handle Send Chat
  async function handleSendChat(textToSend?: string) {
    const query = (textToSend || chatInput).trim();
    if (!query || isChatLoading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiChatFn({
        data: {
          message: query,
          conversationHistory: history as any,
          preferences: {
            destination: destination || undefined,
            days: days || undefined,
            budget: budget || undefined,
            currency,
            travelers,
            groupType,
          },
        },
      });

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: res.reply,
        itinerary: res.itinerary,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (res.itinerary) {
        setCurrentItinerary(res.itinerary);
        setSelectedDayTab(1);
      }

      if (res.recommendedServices && res.recommendedServices.length > 0) {
        setChatRecommendedServices(res.recommendedServices as ServiceWithProvider[]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI response. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I encountered a temporary connection issue while formulating your travel plan. Please check your inputs and try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }

  // Handle Generate Structured Itinerary
  async function handleGenerateStructuredItinerary() {
    if (!destination.trim()) {
      toast.error("Please enter a destination");
      return;
    }

    setIsPlannerLoading(true);
    try {
      const res = await aiGenerateItineraryFn({
        data: {
          destination: destination.trim(),
          days,
          startDate: startDate || undefined,
          budget: budget > 0 ? budget : undefined,
          currency,
          travelers,
          groupType,
          interests: selectedInterests,
          activityPace,
          customNotes: customNotes.trim() || undefined,
        },
      });

      if (res.itinerary) {
        setCurrentItinerary(res.itinerary);
        setSelectedDayTab(1);
      }

      if (res.recommendedServices && res.recommendedServices.length > 0) {
        setPlannerServices(res.recommendedServices as ServiceWithProvider[]);
      }

      toast.success(`Generated ${days}-day itinerary for ${destination}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate itinerary. Please try again.");
    } finally {
      setIsPlannerLoading(false);
    }
  }

  // Translate specific chat message
  async function handleTranslateMessage(msgIndex: number, targetLang: string) {
    const msg = messages[msgIndex];
    if (!msg || !msg.content) return;

    setTranslatingMsgIndex(msgIndex);
    try {
      const res = await aiTranslateFn({
        data: {
          text: msg.content,
          sourceLanguage: "auto",
          targetLanguage: targetLang,
          preserveFormatting: true,
        },
      });

      setMessageTranslations((prev) => ({
        ...prev,
        [msgIndex]: { text: res.translatedText, lang: targetLang },
      }));
      toast.success(`Translated to ${SUPPORTED_LANGUAGES[targetLang]?.name}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to translate message");
    } finally {
      setTranslatingMsgIndex(null);
    }
  }

  function toggleInterest(interest: string) {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  }

  const activeServices =
    activeTab === "planner"
      ? (plannerServices.length ? plannerServices : chatRecommendedServices)
      : (chatRecommendedServices.length ? chatRecommendedServices : plannerServices);

  return (
    <PageShell
      eyebrow="Smart AI Travel Suite"
      title="AI Travel Assistant & Trip Planner"
      subtitle="Craft customized day-by-day itineraries, translate travel phrases & guidebooks, and discover verified stays & local tours."
    >
      <div className="space-y-8">
        {/* Navigation Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1 bg-muted">
              <TabsTrigger
                value="chat"
                className="flex items-center gap-2 rounded-xl py-2.5 font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs sm:text-sm"
              >
                <MessageSquare className="size-4 text-primary" />
                <span>Interactive Chat</span>
              </TabsTrigger>
              <TabsTrigger
                value="planner"
                className="flex items-center gap-2 rounded-xl py-2.5 font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs sm:text-sm"
              >
                <Sliders className="size-4 text-gold" />
                <span>Trip Builder</span>
              </TabsTrigger>
              <TabsTrigger
                value="translator"
                className="flex items-center gap-2 rounded-xl py-2.5 font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs sm:text-sm"
              >
                <Languages className="size-4 text-accent" />
                <span>Travel Translator</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-gold animate-pulse" />
            <span>Grounded with live Travezy database listings</span>
          </div>
        </div>

        {/* TAB 1: INTERACTIVE CHAT */}
        {activeTab === "chat" && (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left: Chat Container */}
            <div className="flex flex-col h-[700px] rounded-3xl border border-border bg-card shadow-card overflow-hidden">
              {/* Chat Header */}
              <div className="border-b border-border bg-muted/40 p-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-2xl bg-gradient-lagoon text-primary-foreground shadow-sm">
                    <Wand2 className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold">Travezy AI Guide</h3>
                    <p className="text-xs text-muted-foreground">Always ready to craft travel plans</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMessages([
                      {
                        role: "assistant",
                        content: "Conversation refreshed. Where would you like to travel next?",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      },
                    ]);
                    setCurrentItinerary(null);
                    setChatRecommendedServices([]);
                    setMessageTranslations({});
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5 mr-1" /> Reset Chat
                </Button>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((msg, i) => {
                  const translation = messageTranslations[i];
                  return (
                    <div
                      key={i}
                      className={`flex flex-col ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-muted/70 text-foreground border border-border/60 rounded-tl-xs"
                        }`}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {translation ? translation.text : msg.content}
                        </div>

                        {/* Translation indicator */}
                        {translation && (
                          <div className="mt-2 text-[10px] text-accent font-medium flex items-center gap-1">
                            <Languages className="size-3" /> Translated to {SUPPORTED_LANGUAGES[translation.lang]?.name}
                          </div>
                        )}

                        {msg.itinerary && (
                          <div className="mt-3 pt-3 border-t border-border/40 text-xs flex items-center justify-between text-muted-foreground">
                            <span className="font-medium text-foreground flex items-center gap-1">
                              <BookmarkCheck className="size-3.5 text-gold" />
                              {msg.itinerary.daysCount}-Day {msg.itinerary.destination} Plan
                            </span>
                            <span className="text-[11px] bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-full">
                              {msg.itinerary.estimatedTotalBudget}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Message Footer Actions */}
                      <div className="flex items-center gap-2 px-1 mt-1">
                        {msg.timestamp && (
                          <span className="text-[10px] text-muted-foreground/60">
                            {msg.timestamp}
                          </span>
                        )}

                        {msg.role === "assistant" && (
                          <div className="flex items-center gap-1 text-[11px]">
                            {translatingMsgIndex === i ? (
                              <span className="text-muted-foreground text-[10px] animate-pulse">
                                Translating...
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground/70">Translate:</span>
                                {["hi", "te", "ta", "es", "fr"].map((lang) => (
                                  <button
                                    key={lang}
                                    type="button"
                                    onClick={() => handleTranslateMessage(i, lang)}
                                    className="text-[10px] font-medium text-primary hover:underline px-1 py-0.5 rounded bg-muted/40"
                                  >
                                    {SUPPORTED_LANGUAGES[lang]?.name.slice(0, 2)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isChatLoading && (
                  <div className="flex items-start gap-2 animate-pulse">
                    <div className="rounded-2xl bg-muted p-4 text-xs text-muted-foreground flex items-center gap-2">
                      <Sparkles className="size-4 text-gold animate-spin" />
                      Travezy AI is designing your travel plan...
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Starter Prompts */}
              <div className="border-t border-border/60 bg-muted/20 p-3 px-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <Lightbulb className="size-3 text-gold" /> Suggested questions
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {STARTER_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChat(p)}
                      disabled={isChatLoading}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-all hover:border-accent"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Bar */}
              <div className="border-t border-border p-3 bg-card flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder="e.g. Plan a 4-day Goa trip with beaches and local food under ₹15,000..."
                  disabled={isChatLoading}
                  className="rounded-2xl h-11 focus-visible:ring-primary"
                />
                <Button
                  onClick={() => handleSendChat()}
                  disabled={isChatLoading || !chatInput.trim()}
                  variant="hero"
                  className="rounded-2xl px-5 h-11"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>

            {/* Right: Companion Itinerary & Service View */}
            <div className="space-y-6">
              {currentItinerary ? (
                <ItineraryCard
                  itinerary={currentItinerary}
                  selectedDayTab={selectedDayTab}
                  onSelectDayTab={setSelectedDayTab}
                  onRefine={(refinement) => handleSendChat(refinement)}
                  isLoading={isChatLoading}
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground bg-card/50 flex flex-col items-center justify-center min-h-[400px]">
                  <div className="size-14 rounded-full bg-muted grid place-items-center mb-4">
                    <Compass className="size-6 text-accent" />
                  </div>
                  <h4 className="font-display text-lg text-foreground font-semibold">Your Itinerary Preview</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Ask a question in the chat or pick a starter prompt to see your live day-by-day plan rendered here with morning, afternoon, and evening slots.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STRUCTURED TRIP PLANNER FORM */}
        {activeTab === "planner" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            {/* Form Column */}
            <div className="rounded-3xl border border-border bg-card p-7 shadow-card space-y-6">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-gradient-gold text-gold-foreground">
                  <Sliders className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-semibold">Bespoke Trip Builder</h3>
                  <p className="text-xs text-muted-foreground">Customize every parameter for exact recommendations</p>
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Destination
                </label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Goa, Kerala, Manali, Jaipur..."
                  className="mt-1.5 h-11 rounded-xl"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {POPULAR_DESTINATIONS.slice(0, 6).map((dest) => (
                    <button
                      key={dest}
                      type="button"
                      onClick={() => setDestination(dest)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        destination.toLowerCase() === dest.toLowerCase()
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {dest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days & Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Duration ({days} {days === 1 ? "Day" : "Days"})
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDays((d) => Math.max(1, d - 1))}
                      disabled={days <= 1}
                      className="rounded-xl px-3"
                    >
                      -
                    </Button>
                    <span className="flex-1 text-center font-display text-lg font-semibold">{days}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDays((d) => Math.min(14, d + 1))}
                      disabled={days >= 14}
                      className="rounded-xl px-3"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Estimated Budget ({currency})
                  </label>
                  <Input
                    type="number"
                    min={1000}
                    step={1000}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>
              </div>

              {/* Travelers & Group Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Travelers ({travelers})
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTravelers((t) => Math.max(1, t - 1))}
                      disabled={travelers <= 1}
                      className="rounded-xl px-3"
                    >
                      -
                    </Button>
                    <span className="flex-1 text-center font-display text-lg font-semibold">{travelers}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTravelers((t) => Math.min(20, t + 1))}
                      disabled={travelers >= 20}
                      className="rounded-xl px-3"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Group Type
                  </label>
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value as any)}
                    className="mt-1.5 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="solo">Solo Explorer</option>
                    <option value="couple">Couple / Romantic</option>
                    <option value="family">Family with Kids</option>
                    <option value="friends">Group of Friends</option>
                    <option value="backpacker">Backpacker / Budget</option>
                    <option value="luxury">Luxury & Wellness</option>
                  </select>
                </div>
              </div>

              {/* Interests Multi-Select */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Travel Interests
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TravelInterests.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/50 text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Activity Pace */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Activity Pace
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["relaxed", "moderate", "packed"] as const).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={activityPace === p ? "ocean" : "outline"}
                      size="sm"
                      onClick={() => setActivityPace(p)}
                      className="capitalize rounded-xl text-xs py-2"
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Notes */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Special Notes / Preferences (Optional)
                </label>
                <Textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Vegetarian food preferences, beachfront stay preferred, avoid strenuous hikes..."
                  rows={2}
                  className="mt-1.5 rounded-xl text-xs"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateStructuredItinerary}
                disabled={isPlannerLoading || !destination.trim()}
                variant="hero"
                size="lg"
                className="w-full rounded-2xl h-12 shadow-float"
              >
                {isPlannerLoading ? (
                  <>
                    <Sparkles className="size-4 mr-2 animate-spin text-gold" />
                    Generating {days}-Day Itinerary...
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4 mr-2" />
                    Generate {days}-Day Itinerary
                  </>
                )}
              </Button>
            </div>

            {/* Generated Plan Column */}
            <div>
              {currentItinerary ? (
                <ItineraryCard
                  itinerary={currentItinerary}
                  selectedDayTab={selectedDayTab}
                  onSelectDayTab={setSelectedDayTab}
                  onRefine={(refinement) => {
                    setActiveTab("chat");
                    handleSendChat(refinement);
                  }}
                  isLoading={isPlannerLoading}
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground bg-card/60 flex flex-col items-center justify-center min-h-[500px]">
                  <div className="size-16 rounded-full bg-secondary text-secondary-foreground grid place-items-center mb-4">
                    <Sparkles className="size-8 text-gold" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-foreground">Ready to Plan Your Dream Trip</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2">
                    Adjust your preferences on the left and click <strong>"Generate Itinerary"</strong> to produce a complete day-by-day travel blueprint connected to live Travezy stays & experiences.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TRAVEL TRANSLATOR */}
        {activeTab === "translator" && (
          <div className="space-y-6 animate-float-up">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-gradient-ocean text-primary-foreground">
                <Languages className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold">Travel Language Translator</h3>
                <p className="text-xs text-muted-foreground">Translate essential travel phrases, questions, and guides seamlessly</p>
              </div>
            </div>

            <TravelTranslator />
          </div>
        )}

        {/* CONNECTED PLATFORM SERVICES SECTION */}
        {activeTab !== "translator" && activeServices.length > 0 && (
          <section className="mt-14 pt-10 border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  Verified Bookable Experiences
                </span>
                <h3 className="font-display text-3xl text-foreground mt-1">
                  Matching Travezy Platform Services
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Actual live listings from verified providers in our database matching this itinerary.
                </p>
              </div>
              <Badge variant="outline" className="text-xs px-3 py-1 bg-muted/60">
                {activeServices.length} live listings available
              </Badge>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeServices.map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* SAFETY & DYNAMIC INFO DISCLAIMER BANNER */}
        <div className="rounded-3xl border border-border bg-muted/40 p-6 flex items-start gap-4 text-xs text-muted-foreground">
          <ShieldAlert className="size-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-semibold text-foreground text-sm">Dynamic Travel Information Notice</h5>
            <p className="leading-relaxed">
              Ticket prices, monument opening hours, transportation schedules, and weather conditions can fluctuate. While our AI assistant generates realistic recommendations grounded in our database, please verify critical details with official operators before travelling.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/**
 * Sub-component for rendering structured day-by-day itinerary with inline translation
 */
function ItineraryCard({
  itinerary,
  selectedDayTab,
  onSelectDayTab,
  onRefine,
  isLoading,
}: {
  itinerary: StructuredItinerary;
  selectedDayTab: number;
  onSelectDayTab: (d: number) => void;
  onRefine: (text: string) => void;
  isLoading: boolean;
}) {
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [isTranslatingPlan, setIsTranslatingPlan] = useState(false);
  const [itinTargetLang, setItinTargetLang] = useState("hi");

  const activeDay =
    itinerary.days.find((d) => d.day === selectedDayTab) || itinerary.days[0] || null;

  async function handleTranslateItinerary(target: string) {
    setItinTargetLang(target);
    setIsTranslatingPlan(true);
    try {
      const summaryText = `${itinerary.destination} Itinerary: ${itinerary.summary}\n\n${itinerary.days
        .map((d) => `Day ${d.day}: ${d.title}\n- Morning: ${d.morning.title}\n- Afternoon: ${d.afternoon.title}\n- Evening: ${d.evening.title}`)
        .join("\n\n")}`;

      const res = await aiTranslateFn({
        data: {
          text: summaryText,
          sourceLanguage: "auto",
          targetLanguage: target,
          preserveFormatting: true,
        },
      });

      setTranslatedSummary(res.translatedText);
      toast.success(`Itinerary summary translated to ${SUPPORTED_LANGUAGES[target]?.name}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to translate itinerary");
    } finally {
      setIsTranslatingPlan(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-card space-y-6 animate-float-up">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">
              {itinerary.travelerType || "CURATED JOURNEY"}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs font-semibold text-foreground">
              {itinerary.daysCount} Days
            </span>
          </div>
          <h2 className="font-display text-3xl font-semibold mt-1 text-foreground">
            {itinerary.destination} Itinerary
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
            {itinerary.summary}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {itinerary.estimatedTotalBudget && (
            <div className="bg-secondary/70 text-secondary-foreground rounded-2xl p-3 px-4 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground/80">
                Est. Total Budget
              </p>
              <p className="font-display text-xl font-bold text-primary">
                {itinerary.estimatedTotalBudget}
              </p>
            </div>
          )}

          {/* Inline Translate Itinerary Action */}
          <div className="flex items-center gap-1.5 text-xs bg-muted/60 p-1 px-2.5 rounded-xl">
            <Languages className="size-3.5 text-accent" />
            <span className="text-[11px] text-muted-foreground">Translate:</span>
            <select
              value={itinTargetLang}
              onChange={(e) => handleTranslateItinerary(e.target.value)}
              disabled={isTranslatingPlan}
              className="bg-transparent text-[11px] font-medium text-primary focus:outline-none cursor-pointer"
            >
              {Object.entries(SUPPORTED_LANGUAGES)
                .filter(([code]) => code !== "auto")
                .map(([code, info]) => (
                  <option key={code} value={code}>
                    {info.name}
                  </option>
                ))}
            </select>
            {isTranslatingPlan && <Sparkles className="size-3 text-gold animate-spin" />}
          </div>
        </div>
      </div>

      {/* Translated Itinerary Overview Overlay if triggered */}
      {translatedSummary && (
        <div className="rounded-2xl bg-secondary/30 border border-secondary p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-secondary-foreground flex items-center gap-1.5">
              <Languages className="size-3.5 text-accent" /> Translated Itinerary Overview ({SUPPORTED_LANGUAGES[itinTargetLang]?.name})
            </span>
            <button
              onClick={() => setTranslatedSummary(null)}
              className="text-[10px] text-muted-foreground hover:underline"
            >
              Dismiss
            </button>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{translatedSummary}</p>
        </div>
      )}

      {/* Day Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {itinerary.days.map((day) => (
          <button
            key={day.day}
            onClick={() => onSelectDayTab(day.day)}
            className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
              selectedDayTab === day.day
                ? "bg-primary text-primary-foreground shadow-sm scale-105"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Day {day.day}
          </button>
        ))}
      </div>

      {/* Active Day Card */}
      {activeDay && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-foreground">
              {activeDay.title}
            </h3>
            {activeDay.estimatedDailyExpense && (
              <span className="text-xs font-mono font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                Est. Daily Spend: {activeDay.estimatedDailyExpense}
              </span>
            )}
          </div>

          {/* Time Slots (Morning, Afternoon, Evening) */}
          <div className="grid gap-3.5 sm:grid-cols-3">
            {/* Morning */}
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-2 hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Sun className="size-4" /> Morning
              </div>
              <h4 className="font-display text-sm font-semibold leading-tight text-foreground">
                {activeDay.morning.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeDay.morning.description}
              </p>
              {activeDay.morning.estimatedCost && (
                <p className="text-[11px] font-mono text-muted-foreground/80 pt-1 border-t border-border/40">
                  Est: {activeDay.morning.estimatedCost}
                </p>
              )}
            </div>

            {/* Afternoon */}
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-2 hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                <Sunset className="size-4" /> Afternoon
              </div>
              <h4 className="font-display text-sm font-semibold leading-tight text-foreground">
                {activeDay.afternoon.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeDay.afternoon.description}
              </p>
              {activeDay.afternoon.estimatedCost && (
                <p className="text-[11px] font-mono text-muted-foreground/80 pt-1 border-t border-border/40">
                  Est: {activeDay.afternoon.estimatedCost}
                </p>
              )}
            </div>

            {/* Evening */}
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-2 hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Moon className="size-4" /> Evening
              </div>
              <h4 className="font-display text-sm font-semibold leading-tight text-foreground">
                {activeDay.evening.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeDay.evening.description}
              </p>
              {activeDay.evening.estimatedCost && (
                <p className="text-[11px] font-mono text-muted-foreground/80 pt-1 border-t border-border/40">
                  Est: {activeDay.evening.estimatedCost}
                </p>
              )}
            </div>
          </div>

          {/* Food Suggestions & Insider Tip */}
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            {activeDay.foodSuggestions && activeDay.foodSuggestions.length > 0 && (
              <div className="rounded-2xl bg-secondary/40 border border-secondary p-3.5 text-xs">
                <p className="font-semibold text-secondary-foreground flex items-center gap-1.5 mb-1.5">
                  <Utensils className="size-3.5 text-accent" /> Recommended Food & Dining
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {activeDay.foodSuggestions.map((food, idx) => (
                    <li key={idx} className="leading-snug">{food}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeDay.insiderTip && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs">
                <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                  <Lightbulb className="size-3.5 text-gold" /> Local Insider Tip
                </p>
                <p className="text-muted-foreground leading-snug">{activeDay.insiderTip}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Practical Tips & Packing Advice */}
      <div className="pt-4 border-t border-border grid gap-4 sm:grid-cols-2 text-xs">
        {itinerary.practicalTips && itinerary.practicalTips.length > 0 && (
          <div>
            <h5 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" /> Practical Travel Tips
            </h5>
            <ul className="space-y-1 text-muted-foreground">
              {itinerary.practicalTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {itinerary.packingAdvice && itinerary.packingAdvice.length > 0 && (
          <div>
            <h5 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Briefcase className="size-3.5 text-gold" /> Packing Essentials
            </h5>
            <ul className="space-y-1 text-muted-foreground">
              {itinerary.packingAdvice.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-gold mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Quick Refinement Action Pills */}
      <div className="pt-4 border-t border-border flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Refine plan:</span>
        <button
          onClick={() => onRefine("Make this itinerary more budget-friendly")}
          disabled={isLoading}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-all hover:border-accent"
        >
          💰 Make it cheaper
        </button>
        <button
          onClick={() => onRefine("Add more romantic cafes and scenic viewpoints")}
          disabled={isLoading}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-all hover:border-accent"
        >
          ✨ Romantic spots
        </button>
        <button
          onClick={() => onRefine("Include more outdoor adventure and water sports")}
          disabled={isLoading}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-all hover:border-accent"
        >
          🏄 More adventure
        </button>
        <button
          onClick={() => onRefine("Slow down the pace and give more free leisure time")}
          disabled={isLoading}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-all hover:border-accent"
        >
          🌴 Relaxed pace
        </button>
      </div>
    </div>
  );
}
