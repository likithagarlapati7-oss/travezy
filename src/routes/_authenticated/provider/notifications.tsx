import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Bell,
  BellRing,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  DollarSign,
  ExternalLink,
  Filter,
  Flame,
  Info,
  Layers,
  MessageSquare,
  Plane,
  Receipt,
  Sparkles,
  Star,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { requireRole } from "@/lib/roles";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/provider/notifications")({
  beforeLoad: async ({ context }) => {
    await requireRole((context as { user: { id: string } }).user.id, ["provider"]);
  },
  head: () => ({
    meta: [
      { title: "Notification Center — Travezy Provider Hub" },
      {
        name: "description",
        content: "Real-time alerts for booking requests, customer messages, payments, reviews, and withdrawals on Travezy.",
      },
      { property: "og:title", content: "Notification Center — Travezy Provider Hub" },
      {
        property: "og:description",
        content: "Provider alerts and booking communications feed.",
      },
    ],
  }),
  component: ProviderNotificationsPage,
});

type FilterType = "all" | "unread" | "bookings" | "payments" | "reviews" | "messages" | "withdrawals";

function ProviderNotificationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const getNotifsFn = useServerFn(getUserNotifications);
  const markReadFn = useServerFn(markNotificationAsRead);
  const markAllReadFn = useServerFn(markAllNotificationsAsRead);

  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => await getNotifsFn(),
    enabled: !!userId,
    refetchInterval: 15000,
  });

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await markReadFn({ data: { notificationId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return await markAllReadFn();
    },
    onSuccess: () => {
      toast.success("All notifications marked as read.");
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to mark all as read.");
    },
  });

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === "unread" && n.is_read) return false;
      if (activeFilter === "bookings" && !n.type.includes("booking")) return false;
      if (activeFilter === "payments" && !n.type.includes("payment") && !n.type.includes("cash")) return false;
      if (activeFilter === "reviews" && !n.type.includes("review")) return false;
      if (activeFilter === "messages" && !n.type.includes("message")) return false;
      if (activeFilter === "withdrawals" && !n.type.includes("withdrawal")) return false;
      return true;
    });
  }, [notifications, activeFilter]);

  function getNotificationIcon(type: string) {
    if (type.includes("booking_created") || type.includes("booking_pending")) {
      return <Clock className="size-5 text-amber-500" />;
    }
    if (type.includes("booking_confirmed") || type.includes("booking_completed")) {
      return <CheckCircle2 className="size-5 text-emerald-500" />;
    }
    if (type.includes("booking_cancelled") || type.includes("payment_failed")) {
      return <XCircle className="size-5 text-rose-500" />;
    }
    if (type.includes("payment") || type.includes("cash")) {
      return <CreditCard className="size-5 text-blue-500" />;
    }
    if (type.includes("withdrawal")) {
      return <Wallet className="size-5 text-purple-500" />;
    }
    if (type.includes("review")) {
      return <Star className="size-5 fill-amber-400 text-amber-500" />;
    }
    if (type.includes("message")) {
      return <MessageSquare className="size-5 text-primary" />;
    }
    return <Bell className="size-5 text-primary" />;
  }

  return (
    <PageShell
      eyebrow="Provider Command Center"
      title="Notification Center"
      subtitle="Real-time alerts for booking arrivals, traveler messages, payment releases, and review feedback."
    >
      <div className="space-y-6">
        {/* ─── 1. Header Action Bar ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BellRing className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>Notification Stream</span>
                {unreadCount > 0 && (
                  <Badge className="bg-amber-500 text-white font-semibold text-xs px-2">
                    {unreadCount} Unread
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">Auto-synced with Supabase real-time events</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="rounded-xl text-xs gap-1.5 h-9"
              >
                <CheckCheck className="size-4 text-primary" />
                <span>Mark All as Read</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="rounded-xl text-xs h-9"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* ─── 2. Filter Tabs ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: `All Alerts (${notifications.length})` },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "bookings", label: "Bookings" },
            { id: "payments", label: "Payments" },
            { id: "reviews", label: "Reviews" },
            { id: "messages", label: "Messages" },
            { id: "withdrawals", label: "Withdrawals" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id as FilterType)}
              className={cn(
                "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all",
                activeFilter === f.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "border border-border/60 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ─── 3. Notifications Feed ───────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <Bell className="size-7 opacity-40" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">No notifications found</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {activeFilter === "unread"
                ? "You're all caught up! No unread notifications remaining."
                : "New guest bookings, reviews, payments, and system updates will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const isUnread = !notif.is_read;

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4.5 transition-all shadow-xs",
                    isUnread
                      ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                      : "border-border/60 bg-card hover:border-border"
                  )}
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border/70 shadow-xs mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground text-sm">{notif.title}</h4>
                        {isUnread && (
                          <span className="size-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[11px] text-muted-foreground/80 block pt-0.5">
                        {format(parseISO(notif.created_at), "MMM d, yyyy • h:mm a")}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                    {notif.link_url && (
                      <Link to={notif.link_url as any}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => isUnread && markReadMutation.mutate(notif.id)}
                          className="h-8 rounded-xl text-xs gap-1"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="size-3" />
                        </Button>
                      </Link>
                    )}

                    {isUnread && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markReadMutation.mutate(notif.id)}
                        className="h-8 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                        title="Mark as Read"
                      >
                        <Check className="size-3.5 mr-1" /> Read
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
