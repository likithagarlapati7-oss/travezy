import { useState } from "react";
import {
  ArrowRightLeft,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Languages,
  ShieldAlert,
  Navigation,
  Hotel,
  Utensils,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  SUPPORTED_LANGUAGES,
  TRAVEL_PHRASE_CATEGORIES,
} from "@/lib/ai.schema";
import { aiTranslateFn } from "@/lib/ai.functions";
import { toast } from "sonner";

export function TravelTranslator({
  initialText = "",
  initialSource = "auto",
  initialTarget = "hi",
  className = "",
}: {
  initialText?: string;
  initialSource?: string;
  initialTarget?: string;
  className?: string;
}) {
  const [sourceLang, setSourceLang] = useState(initialSource);
  const [targetLang, setTargetLang] = useState(initialTarget);
  const [inputText, setInputText] = useState(initialText);
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Translate handler
  async function handleTranslate(textToTranslate?: string, targetOverride?: string) {
    const query = (textToTranslate !== undefined ? textToTranslate : inputText).trim();
    const target = targetOverride || targetLang;

    if (!query) {
      toast.error("Please enter text to translate");
      return;
    }

    if (query.length > 5000) {
      toast.error("Text exceeds 5,000 character limit");
      return;
    }

    setIsLoading(true);
    try {
      const res = await aiTranslateFn({
        data: {
          text: query,
          sourceLanguage: sourceLang,
          targetLanguage: target,
          preserveFormatting: true,
        },
      });

      setTranslatedText(res.translatedText);
      if (res.detectedLanguage && sourceLang === "auto") {
        setDetectedLang(res.detectedLanguage);
      } else {
        setDetectedLang(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to translate text. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Swap Languages
  function handleSwapLanguages() {
    const newSource = targetLang;
    const newTarget = sourceLang === "auto" ? (detectedLang || "en") : sourceLang;

    setSourceLang(newSource);
    setTargetLang(newTarget);
    setInputText(translatedText);
    setTranslatedText(inputText);
  }

  // Copy translated text
  async function handleCopy() {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      toast.success("Translation copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  // Clear all
  function handleClear() {
    setInputText("");
    setTranslatedText("");
    setDetectedLang(null);
  }

  // Quick phrase click
  function handlePhraseClick(phrase: string) {
    setInputText(phrase);
    handleTranslate(phrase);
  }

  const categoryIcons: Record<string, any> = {
    ShieldAlert,
    Navigation,
    Hotel,
    Utensils,
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Translation Main Card */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-card space-y-5">
        {/* Language Selection Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Source Language Select */}
            <div className="flex-1 sm:w-48">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                From
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => (
                  <option key={code} value={code}>
                    {info.flag} {info.name} {info.nativeName !== info.name ? `(${info.nativeName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSwapLanguages}
                title="Swap languages"
                className="rounded-xl size-10 p-0 shrink-0 hover:bg-muted"
              >
                <ArrowRightLeft className="size-4" />
              </Button>
            </div>

            {/* Target Language Select */}
            <div className="flex-1 sm:w-48">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                To
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

          {/* Action Header controls */}
          <div className="flex items-center gap-2">
            {detectedLang && sourceLang === "auto" && (
              <Badge variant="outline" className="text-[11px] bg-secondary/50">
                Detected: {SUPPORTED_LANGUAGES[detectedLang]?.name || detectedLang}
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!inputText && !translatedText}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3 mr-1" /> Clear
            </Button>
          </div>
        </div>

        {/* Dual Input/Output Textareas */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Source Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Original Text</span>
              <span className="font-mono text-[11px]">
                {inputText.length} / 5,000
              </span>
            </div>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleTranslate();
                }
              }}
              placeholder="Enter or paste travel text, questions, or itinerary details to translate... (Ctrl+Enter to translate)"
              rows={7}
              className="rounded-2xl resize-none text-sm p-4 leading-relaxed focus-visible:ring-primary"
            />
          </div>

          {/* Target Textarea / Result Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Languages className="size-3.5 text-accent" />
                Translated Output ({SUPPORTED_LANGUAGES[targetLang]?.name})
              </span>
              {translatedText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                >
                  {copied ? (
                    <>
                      <Check className="size-3 mr-1 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3 mr-1" /> Copy
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="relative min-h-[175px] rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-relaxed overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground text-xs animate-pulse space-y-2">
                  <Sparkles className="size-6 text-gold animate-spin" />
                  <span>Translating with travel context preservation...</span>
                </div>
              ) : translatedText ? (
                <div className="whitespace-pre-wrap font-sans text-foreground">
                  {translatedText}
                </div>
              ) : (
                <p className="text-muted-foreground/60 text-xs italic select-none">
                  Translation will appear here instantly.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Translate Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3 text-gold" />
            Preserves destination names, hotels, currency (₹), and addresses
          </p>

          <Button
            type="button"
            onClick={() => handleTranslate()}
            disabled={isLoading || !inputText.trim()}
            variant="hero"
            size="lg"
            className="rounded-2xl px-6 h-11 shadow-sm"
          >
            {isLoading ? (
              <>
                <Sparkles className="size-4 mr-2 animate-spin text-gold" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="size-4 mr-2" />
                Translate Text
              </>
            )}
          </Button>
        </div>
      </div>

      {/* CATEGORIZED TRAVEL PHRASE SHORTCUTS */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Lightbulb className="size-4 text-gold" />
            </div>
            <div>
              <h4 className="font-display text-base font-semibold">Travel Phrasebook Shortcuts</h4>
              <p className="text-xs text-muted-foreground">Click any essential travel phrase to translate immediately</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {TRAVEL_PHRASE_CATEGORIES.map((cat, idx) => {
            const Icon = categoryIcons[cat.icon] || Lightbulb;
            return (
              <div key={idx} className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2.5">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Icon className="size-3.5 text-accent" /> {cat.category}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.phrases.map((phrase, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handlePhraseClick(phrase)}
                      disabled={isLoading}
                      className="text-xs px-2.5 py-1 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all hover:border-accent hover:scale-[1.02] text-left"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
