import React, { useState } from "react";
import {
  DollarSign,
  Hotel,
  Utensils,
  Compass,
  User,
  Car,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  calculateItineraryBudget,
  findCheaperAlternatives,
  type BudgetStatus,
  type CheaperAlternativeOption,
} from "@/lib/budget";
import { cn } from "@/lib/utils";

interface TripBudgetPlannerProps {
  items: Array<{
    id?: string;
    item_type?: string;
    itemType?: string;
    title: string;
    estimated_cost?: number | null;
    estimatedCost?: number | null;
    price?: number | null;
  }>;
  destinationName: string;
  initialMaxBudget?: number | null;
  onMaxBudgetChange?: (newBudget: number | null) => void;
  onSwapItem?: (option: CheaperAlternativeOption) => void;
  className?: string;
}

export function TripBudgetPlanner({
  items,
  destinationName,
  initialMaxBudget,
  onMaxBudgetChange,
  onSwapItem,
  className,
}: TripBudgetPlannerProps) {
  const [maxBudgetInput, setMaxBudgetInput] = useState<string>(
    initialMaxBudget ? String(initialMaxBudget) : "35000"
  );
  const [showCheaperModal, setShowCheaperModal] = useState(false);

  const budgetStatus: BudgetStatus = calculateItineraryBudget(
    items,
    maxBudgetInput ? Number(maxBudgetInput) : null
  );

  const cheaperOptions = findCheaperAlternatives(destinationName, items);

  const handleBudgetBlur = () => {
    const num = Number(maxBudgetInput);
    if (onMaxBudgetChange) {
      onMaxBudgetChange(isNaN(num) || num <= 0 ? null : num);
    }
  };

  const handlePresetClick = (amount: number) => {
    setMaxBudgetInput(String(amount));
    if (onMaxBudgetChange) {
      onMaxBudgetChange(amount);
    }
  };

  return (
    <div className={cn("rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-6", className)}>
      {/* ── Top Header: Title & Maximum Budget Input ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 text-sm">
              💰
            </span>
            <span>Trip Budget Planner</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real cost calculations based on your selected Travezy bookings & services.
          </p>
        </div>

        {/* Max Budget Input Field */}
        <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Max Budget:
            </span>
            <div className="relative w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                value={maxBudgetInput}
                onChange={(e) => setMaxBudgetInput(e.target.value)}
                onBlur={handleBudgetBlur}
                placeholder="Set budget..."
                className="h-8 pl-6 pr-2 text-xs font-bold rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Presets:</span>
            {[20000, 35000, 50000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handlePresetClick(amt)}
                className="text-[10px] font-semibold text-primary hover:underline px-1 py-0.5"
              >
                ₹{(amt / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Status Banner (Within Budget vs Over Budget) ─────────────────────── */}
      <div
        className={cn(
          "p-4 rounded-2xl border transition-all duration-300",
          budgetStatus.isOverBudget
            ? "bg-rose-500/10 border-rose-300 dark:border-rose-900/60"
            : "bg-emerald-500/10 border-emerald-300 dark:border-emerald-900/60"
        )}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {budgetStatus.isOverBudget ? (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                <AlertTriangle className="size-4" />
              </div>
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="size-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h4
                  className={cn(
                    "font-display text-sm font-bold",
                    budgetStatus.isOverBudget
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {budgetStatus.isOverBudget
                    ? `⚠️ ₹${Math.abs(budgetStatus.difference).toLocaleString("en-IN")} over budget`
                    : `✅ Within Budget (${budgetStatus.differenceFormatted})`}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Estimated Total: <strong>₹{budgetStatus.totalEstimated.toLocaleString("en-IN")}</strong>
                {budgetStatus.maxBudget ? ` of ₹${budgetStatus.maxBudget.toLocaleString("en-IN")} target` : ""}
              </p>
            </div>
          </div>

          {/* Find Cheaper Options CTA */}
          {cheaperOptions.length > 0 && (
            <Button
              size="sm"
              variant={budgetStatus.isOverBudget ? "destructive" : "outline"}
              onClick={() => setShowCheaperModal(true)}
              className="rounded-full text-xs font-semibold gap-1.5 shrink-0"
            >
              <TrendingDown className="size-3.5" /> Find Cheaper Options ({cheaperOptions.length})
            </Button>
          )}
        </div>

        {/* Visual Progress Bar */}
        {budgetStatus.maxBudget && (
          <div className="mt-3.5">
            <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  budgetStatus.isOverBudget ? "bg-rose-500" : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(budgetStatus.percentageUsed, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Category Cost Breakdown ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Tag className="size-3.5 text-primary" /> Cost Breakdown by Category
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Hotels */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Hotel className="size-3.5 text-blue-500" /> Hotels
            </span>
            <p className="mt-2 text-sm font-extrabold text-foreground">
              ₹{budgetStatus.breakdown.hotels.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {budgetStatus.categoryPercentages.hotels}% of total
            </span>
          </div>

          {/* Food */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Utensils className="size-3.5 text-amber-500" /> Food & Dining
            </span>
            <p className="mt-2 text-sm font-extrabold text-foreground">
              ₹{budgetStatus.breakdown.food.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {budgetStatus.categoryPercentages.food}% of total
            </span>
          </div>

          {/* Experiences */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Compass className="size-3.5 text-emerald-500" /> Experiences
            </span>
            <p className="mt-2 text-sm font-extrabold text-foreground">
              ₹{budgetStatus.breakdown.experiences.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {budgetStatus.categoryPercentages.experiences}% of total
            </span>
          </div>

          {/* Guide */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="size-3.5 text-purple-500" /> Human Guide
            </span>
            <p className="mt-2 text-sm font-extrabold text-foreground">
              ₹{budgetStatus.breakdown.guide.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {budgetStatus.categoryPercentages.guide}% of total
            </span>
          </div>

          {/* Transport */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Car className="size-3.5 text-sky-500" /> Transport
            </span>
            <p className="mt-2 text-sm font-extrabold text-foreground">
              ₹{budgetStatus.breakdown.transport.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {budgetStatus.categoryPercentages.transport}% of total
            </span>
          </div>

          {/* Other */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex flex-col justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="size-3.5 text-slate-500" /> Other
            </span>
            <p className="mt-2 text-sm font-extrabold text-foreground">
              ₹{budgetStatus.breakdown.other.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {budgetStatus.categoryPercentages.other}% of total
            </span>
          </div>
        </div>
      </div>

      {/* ── Cheaper Options Modal ────────────────────────────────────────────── */}
      <Dialog open={showCheaperModal} onOpenChange={setShowCheaperModal}>
        <DialogContent className="max-w-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <TrendingDown className="size-5 text-emerald-600" />
              <span>Cheaper Alternatives in {destinationName}</span>
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            We searched the actual Travezy catalog for lower-cost verified hotels, restaurants, tours, and guides to optimize your budget.
          </p>

          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            {cheaperOptions.map((opt, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={opt.cheaperItem.image_url}
                    alt={opt.cheaperItem.title}
                    className="size-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-300 font-bold">
                        Save ₹{opt.savings.toLocaleString("en-IN")}
                      </Badge>
                      <span className="text-xs text-muted-foreground line-through">
                        ₹{opt.currentCost.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <h5 className="font-display text-sm font-bold text-foreground">
                      {opt.cheaperItem.title}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      {opt.cheaperItem.type} • ★ {opt.cheaperItem.rating} • <strong>₹{opt.cheaperItem.price.toLocaleString("en-IN")}</strong>
                    </p>
                  </div>
                </div>

                {onSwapItem && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      onSwapItem(opt);
                      setShowCheaperModal(false);
                    }}
                    className="rounded-xl text-xs font-semibold shrink-0"
                  >
                    Swap Option
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
