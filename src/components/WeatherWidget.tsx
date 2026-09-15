import { useEffect, useState } from "react";
import {
  Cloud,
  CloudRain,
  Droplets,
  Info,
  RefreshCw,
  Sun,
  Wind,
  Compass,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchLiveWeather,
  getWeatherAwareExperiences,
  type LiveWeatherData,
} from "@/lib/weather";
import { cn } from "@/lib/utils";

interface WeatherWidgetProps {
  destinationName: string;
  latitude?: number | null;
  longitude?: number | null;
  variant?: "compact" | "card" | "hero" | "banner";
  className?: string;
  showExperiences?: boolean;
}

export function WeatherWidget({
  destinationName,
  latitude,
  longitude,
  variant = "card",
  className,
  showExperiences = true,
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<LiveWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await fetchLiveWeather(latitude, longitude, destinationName);
        if (cancelled) return;
        if (data) {
          setWeather(data);
        } else {
          setError("Live weather unavailable");
        }
      } catch {
        if (!cancelled) setError("Live weather unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [destinationName, latitude, longitude, retryKey]);

  const experienceData = getWeatherAwareExperiences(destinationName, weather);

  // Compact variant (e.g. for badges, pills, headers)
  if (variant === "compact") {
    if (loading) {
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground animate-pulse", className)}>
          <RefreshCw className="size-3 animate-spin" /> Fetching weather...
        </div>
      );
    }
    if (!weather) {
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground", className)}>
          <span>🌦️ Weather unavailable</span>
        </div>
      );
    }
    return (
      <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border shadow-xs text-xs font-semibold text-foreground", className)}>
        <span>{weather.icon}</span>
        <span>{weather.temperature}°C {weather.condition}</span>
      </div>
    );
  }

  // Hero variant (for Destination Hero overlay)
  if (variant === "hero") {
    if (loading) {
      return (
        <div className={cn("inline-flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs text-white/70 animate-pulse", className)}>
          <RefreshCw className="size-3.5 animate-spin text-sky-400" />
          <span>Checking live weather...</span>
        </div>
      );
    }
    if (!weather) {
      return (
        <div className={cn("inline-flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs text-white/70", className)}>
          <Cloud className="size-3.5 text-white/60" />
          <span>Live weather unavailable</span>
        </div>
      );
    }
    return (
      <div className={cn("inline-flex items-center gap-2 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs text-white shadow-sm", className)}>
        <span className="text-base">{weather.icon}</span>
        <span className="font-bold text-sky-300">{weather.temperature}°C</span>
        <span className="text-white/80">{weather.condition}</span>
      </div>
    );
  }

  // Standard Card variant
  return (
    <div className={cn("rounded-3xl border border-border bg-card p-5 shadow-xs overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌦️</span>
          <div>
            <h4 className="font-display font-bold text-sm text-foreground">
              Live Weather • {destinationName}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Real-time forecast & condition-aware activities
            </p>
          </div>
        </div>

        {weather && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRetryKey((k) => k + 1)}
            className="size-7 p-0 rounded-full text-muted-foreground hover:text-foreground"
            title="Refresh weather"
          >
            <RefreshCw className="size-3" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
          <RefreshCw className="size-5 animate-spin text-primary" />
          <span>Connecting to weather satellite...</span>
        </div>
      ) : error || !weather ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">{error || "Live weather service unavailable"}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetryKey((k) => k + 1)}
            className="text-xs rounded-full h-7"
          >
            <RefreshCw className="size-3 mr-1" /> Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current Temperature & Condition Banner */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border/60">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{weather.icon}</span>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-extrabold text-foreground">
                    {weather.temperature}°C
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Feels like {weather.apparentTemperature}°C
                  </span>
                </div>
                <p className="text-xs font-semibold text-primary">{weather.condition}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Droplets className="size-3 text-sky-500" /> {weather.humidity}% Humidity
              </span>
              <span className="flex items-center gap-1">
                <Wind className="size-3 text-slate-500" /> {weather.windSpeed} km/h Wind
              </span>
            </div>
          </div>

          {/* Contextual Weather Recommendation Pill */}
          <div className={cn(
            "p-3 rounded-2xl border text-xs leading-relaxed flex items-start gap-2",
            weather.isRainy
              ? "bg-amber-500/10 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              : "bg-emerald-500/10 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
          )}>
            <Sparkles className="size-3.5 shrink-0 mt-0.5" />
            <span>{weather.recommendationText}</span>
          </div>

          {/* 3-Day Forecast Bar */}
          {weather.forecast.length > 0 && (
            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border/60">
              {weather.forecast.map((f, i) => (
                <div
                  key={f.date}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-background border border-border/60 text-center"
                >
                  <span className="text-[10px] font-semibold text-muted-foreground">{f.dayName}</span>
                  <span className="text-lg my-0.5">{f.icon}</span>
                  <span className="text-xs font-bold text-foreground">{f.maxTemp}°</span>
                  <span className="text-[10px] text-muted-foreground">{f.minTemp}°</span>
                </div>
              ))}
            </div>
          )}

          {/* Weather-aware Recommended Experiences */}
          {showExperiences && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Compass className="size-3.5 text-primary" />
                  {weather.isRainy ? "Recommended Indoor Activities" : "Recommended Outdoor Tours"}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {(weather.isRainy
                  ? experienceData.indoorRecommendations
                  : experienceData.outdoorRecommendations
                )
                  .slice(0, 2)
                  .map((tour) => (
                    <Link
                      key={tour.id}
                      to={`/services/${tour.id}` as any}
                      className="group flex items-center gap-2.5 p-2 rounded-xl bg-background border border-border hover:border-primary/50 transition-colors"
                    >
                      <img
                        src={tour.image_url}
                        alt={tour.title}
                        className="size-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {tour.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ₹{tour.price} • {tour.tour_type}
                        </p>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
