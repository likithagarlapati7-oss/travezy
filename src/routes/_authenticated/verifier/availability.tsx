import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BedDouble,
  Building2,
  Calendar,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getHotelAvailability, getVerifierHotels } from "@/lib/hotels.functions";
import type { DateAvailabilityCell } from "@/lib/hotels.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verifier/availability")({
  head: () => ({
    meta: [
      { title: "Room Availability & Date Grid — Travezy Verifier" },
      {
        name: "description",
        content: "Real-time room occupancy calendar, date-based availability matrix, and overbooking prevention.",
      },
    ],
  }),
  component: VerifierAvailabilityPage,
});

function VerifierAvailabilityPage() {
  const getHotelsFn = useServerFn(getVerifierHotels);
  const getAvailabilityFn = useServerFn(getHotelAvailability);

  const [dateOffset, setDateOffset] = useState(0);

  const { data: hotels = [] } = useQuery({
    queryKey: ["verifier", "hotels"],
    queryFn: () => getHotelsFn(),
  });

  const [selectedHotelId, setSelectedHotelId] = useState<string>("");

  // Default to first hotel
  const activeHotelId = selectedHotelId || hotels[0]?.id || "";

  // Generate 10-day date slice
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + dateOffset);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 9);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  const { data: matrix = [], isLoading } = useQuery({
    queryKey: ["verifier", "availability", activeHotelId, startStr, endStr],
    queryFn: () =>
      getAvailabilityFn({
        data: {
          hotel_id: activeHotelId,
          start_date: startStr,
          end_date: endStr,
        },
      }),
    enabled: !!activeHotelId,
  });

  // Extract distinct dates & room types
  const dateColumns: string[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dateColumns.push(d.toISOString().slice(0, 10));
  }

  const roomMap = new Map<string, { id: string; name: string; total: number; price: number }>();
  matrix.forEach((cell) => {
    if (!roomMap.has(cell.room_id)) {
      roomMap.set(cell.room_id, {
        id: cell.room_id,
        name: cell.room_type,
        total: cell.total_rooms,
        price: cell.price_per_night,
      });
    }
  });
  const roomTypes = Array.from(roomMap.values());

  const currentHotel = hotels.find((h) => h.id === activeHotelId);

  return (
    <PageShell
      eyebrow="Occupancy & Allocation"
      title="Room Availability Matrix"
      subtitle="Track date-by-date capacity, booked slots, and remaining available units with real-time overbooking protection."
    >
      {/* Property Selector & Date Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-card p-4 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <Building2 className="size-5 text-primary" />
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Select Property</p>
            <Select value={activeHotelId} onValueChange={setSelectedHotelId}>
              <SelectTrigger className="w-[300px] h-9 text-xs rounded-xl mt-0.5">
                <SelectValue placeholder="Choose property" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl text-xs">
                {hotels.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name} ({h.city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Pager */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-8 px-2 text-xs"
            onClick={() => setDateOffset((prev) => prev - 7)}
          >
            <ChevronLeft className="size-4 mr-1" /> Previous 7 Days
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="rounded-full h-8 text-xs font-semibold"
            onClick={() => setDateOffset(0)}
          >
            Today
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-8 px-2 text-xs"
            onClick={() => setDateOffset((prev) => prev + 7)}
          >
            Next 7 Days <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Availability Grid Card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-border/50">
          <div>
            <h2 className="font-bold text-base text-foreground">
              {currentHotel?.name || "Hotel"} — Availability Grid
            </h2>
            <p className="text-xs text-muted-foreground">
              Viewing range: <strong>{startStr}</strong> through <strong>{endStr}</strong>
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-emerald-500" /> High Availability
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-amber-500" /> Limited (1-2 Left)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-rose-500" /> Sold Out (0 Left)
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : roomTypes.length === 0 ? (
          <div className="p-12 text-center">
            <BedDouble className="mx-auto size-10 text-muted-foreground/40 mb-2" />
            <p className="font-semibold text-sm">No room categories registered for this hotel</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add rooms in the Rooms Inventory tab to activate availability tracking.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-3.5 min-w-[200px] font-bold text-foreground">Room Category</th>
                  {dateColumns.map((d) => {
                    const dateObj = new Date(d);
                    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNum = dateObj.getDate();
                    const isToday = d === new Date().toISOString().slice(0, 10);
                    return (
                      <th
                        key={d}
                        className={cn(
                          "p-2 text-center min-w-[85px] font-semibold",
                          isToday && "bg-primary/10 text-primary rounded-t-xl",
                        )}
                      >
                        <span className="text-[10px] uppercase text-muted-foreground block">{dayName}</span>
                        <span className="text-xs font-bold text-foreground">{dayNum}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {roomTypes.map((room) => (
                  <tr key={room.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-foreground">{room.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Total {room.total} units • ₹{room.price.toLocaleString("en-IN")}/n
                      </p>
                    </td>

                    {dateColumns.map((d) => {
                      const cell = matrix.find((c) => c.room_id === room.id && c.date === d);
                      const available = cell ? cell.available_rooms : room.total;
                      const booked = cell ? cell.booked_rooms : 0;
                      const isFull = available <= 0;
                      const isLow = available <= 2 && available > 0;

                      return (
                        <td key={d} className="p-2 text-center align-middle">
                          <div
                            className={cn(
                              "p-2 rounded-xl border flex flex-col items-center justify-center transition-all",
                              isFull
                                ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                : isLow
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                            )}
                          >
                            <span className="font-bold text-xs">
                              {isFull ? "Full" : `${available} Left`}
                            </span>
                            <span className="text-[9px] text-muted-foreground mt-0.5">
                              {booked} Booked
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
