import React, { useState, useEffect } from "react";
import {
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  RotateCcw,
  CheckSquare,
  Square,
  Tag,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  loadTripPackingList,
  saveTripPackingList,
  type PackingItem,
  type PackingList,
} from "@/lib/packing";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface SmartPackingListProps {
  tripPlanId?: string | null;
  destinationName: string;
  durationDays?: number;
  weatherSummary?: string;
  activities?: string[];
  className?: string;
}

export function SmartPackingList({
  tripPlanId,
  destinationName,
  durationDays = 4,
  weatherSummary,
  activities = [],
  className,
}: SmartPackingListProps) {
  const { user } = useAuth();
  const [packingList, setPackingList] = useState<PackingList | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Clothing");

  useEffect(() => {
    (async () => {
      const list = await loadTripPackingList(
        tripPlanId,
        destinationName,
        durationDays,
        weatherSummary
      );
      setPackingList(list);
    })();
  }, [tripPlanId, destinationName, durationDays, weatherSummary]);

  if (!packingList) {
    return (
      <div className="p-8 rounded-3xl border border-border bg-card text-center animate-pulse">
        <p className="text-xs text-muted-foreground">Generating your smart packing checklist...</p>
      </div>
    );
  }

  const items = packingList.items;
  const packedCount = items.filter((i) => i.is_packed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];

  const filteredItems = items.filter((i) => {
    if (selectedCategory === "All") return true;
    return i.category === selectedCategory;
  });

  const handleToggleItem = async (itemId: string) => {
    const updatedItems = items.map((i) =>
      i.id === itemId ? { ...i, is_packed: !i.is_packed } : i
    );
    const updatedList: PackingList = {
      ...packingList,
      items: updatedItems,
      packed_items: updatedItems.filter((i) => i.is_packed).length,
    };
    setPackingList(updatedList);
    await saveTripPackingList(updatedList, user?.id);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: PackingItem = {
      id: `custom-${Date.now()}`,
      category: newItemCategory,
      name: newItemName.trim(),
      is_packed: false,
      is_custom: true,
      reason: "Custom added item",
    };

    const updatedItems = [newItem, ...items];
    const updatedList: PackingList = {
      ...packingList,
      items: updatedItems,
      total_items: updatedItems.length,
    };
    setPackingList(updatedList);
    setNewItemName("");
    await saveTripPackingList(updatedList, user?.id);
    toast.success(`Added "${newItem.name}" to packing list`);
  };

  const handleDeleteItem = async (itemId: string) => {
    const updatedItems = items.filter((i) => i.id !== itemId);
    const updatedList: PackingList = {
      ...packingList,
      items: updatedItems,
      total_items: updatedItems.length,
      packed_items: updatedItems.filter((i) => i.is_packed).length,
    };
    setPackingList(updatedList);
    await saveTripPackingList(updatedList, user?.id);
  };

  const handlePackAll = async (packAll: boolean) => {
    const updatedItems = items.map((i) => ({ ...i, is_packed: packAll }));
    const updatedList: PackingList = {
      ...packingList,
      items: updatedItems,
      packed_items: packAll ? updatedItems.length : 0,
    };
    setPackingList(updatedList);
    await saveTripPackingList(updatedList, user?.id);
    toast.info(packAll ? "Marked all items as packed!" : "Unchecked all items");
  };

  return (
    <div className={cn("rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-6", className)}>
      {/* ── Top Header: Title & Progress Bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 text-sm">
              🎒
            </span>
            <span>Smart Packing List • {destinationName}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-tailored for a {durationDays}-day holiday with live weather adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePackAll(progressPercent < 100)}
            className="rounded-full text-xs h-8"
          >
            {progressPercent === 100 ? "Uncheck All" : "Pack All"}
          </Button>
        </div>
      </div>

      {/* ── Progress Status Card ─────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Packing Progress: <strong>{packedCount}</strong> of <strong>{totalCount}</strong> items packed</span>
          </span>
          <span className="font-bold text-primary">{progressPercent}% Completed</span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-2.5 w-full rounded-full bg-background border border-border/60 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              progressPercent === 100 ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── Add Custom Item Input ────────────────────────────────────────────── */}
      <form onSubmit={handleAddItem} className="flex flex-wrap items-center gap-2">
        <Input
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Add custom item (e.g. Hiking boots, Drone)..."
          className="h-9 text-xs rounded-xl flex-1 min-w-[200px]"
        />
        <select
          value={newItemCategory}
          onChange={(e) => setNewItemCategory(e.target.value)}
          className="h-9 px-3 rounded-xl border border-border bg-background text-xs text-foreground font-semibold"
        >
          <option value="Clothing">👔 Clothing</option>
          <option value="Toiletries">🧴 Toiletries</option>
          <option value="Electronics">🔌 Electronics</option>
          <option value="Documents">📄 Documents</option>
          <option value="Health">💊 Health</option>
          <option value="Activity Gear">🎒 Activity Gear</option>
        </select>
        <Button type="submit" size="sm" className="rounded-xl text-xs font-semibold h-9 px-4 gap-1">
          <Plus className="size-3.5" /> Add
        </Button>
      </form>

      {/* ── Category Filter Pills ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground hover:text-foreground border-border"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Checklist Items ──────────────────────────────────────────────────── */}
      <div className="grid gap-2 sm:grid-cols-2 max-h-[400px] overflow-y-auto pr-1">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => handleToggleItem(item.id)}
            className={cn(
              "group flex items-start justify-between gap-3 p-3 rounded-2xl border transition-all duration-200 cursor-pointer select-none",
              item.is_packed
                ? "bg-emerald-500/5 border-emerald-300/60 dark:border-emerald-900/40 text-muted-foreground"
                : "bg-card border-border hover:border-primary/40 text-foreground"
            )}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <button
                type="button"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-lg border mt-0.5 transition-colors",
                  item.is_packed
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-border bg-background"
                )}
              >
                {item.is_packed && <Check className="size-3.5 stroke-[3]" />}
              </button>

              <div className="min-w-0">
                <p
                  className={cn(
                    "text-xs font-semibold leading-snug line-clamp-1",
                    item.is_packed && "line-through text-muted-foreground font-normal"
                  )}
                >
                  {item.name}
                </p>
                {item.reason && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {item.reason}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {item.category}
              </Badge>
              {item.is_custom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded-md transition-opacity"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
