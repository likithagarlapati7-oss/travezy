import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck,
  Check,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications.functions";
import { cn } from "@/lib/utils";

export function NotificationBell({ transparent = false }: { transparent?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await getUserNotifications();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Supabase Realtime Subscription for incoming notifications
  useEffect(() => {
    if (!user) return;

    let channel: any = null;
    try {
      const channelId = `user-notifs-${user.id}-${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ["notifications", user.id] });
          },
        );

      channel.subscribe((status: string, err: any) => {
        if (err) {
          console.warn("[Realtime Notifications status]", status, err);
        }
      });
    } catch (e) {
      console.warn("[Realtime Notifications setup error]", e);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [user, qc]);

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await markNotificationAsRead({ data: { notificationId } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return await markAllNotificationsAsRead();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = (n: (typeof notifications)[0]) => {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    setOpen(false);
    if (n.link_url) {
      navigate({ to: n.link_url });
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open notifications"
          className={cn(
            "relative grid size-9 place-items-center rounded-full transition-colors",
            transparent
              ? "text-primary-foreground/90 hover:bg-white/10"
              : "text-foreground/80 hover:bg-muted",
          )}
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-rose-500 font-mono text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in-50 duration-200">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 rounded-2xl border border-border p-0 shadow-2xl backdrop-blur-xl bg-card/95"
      >
        {/* Popover Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <Check className="size-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[22rem] overflow-y-auto divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Sparkles className="mx-auto size-8 text-muted-foreground/50 mb-2" />
              <p className="font-medium text-sm text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">
                You will receive updates here for bookings, trips, payments and messages.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const iconInfo = getNotificationIcon(n.type);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-muted/50",
                    !n.is_read && "bg-primary/5 dark:bg-primary/10 font-medium",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-xl",
                      iconInfo.bg,
                      iconInfo.color,
                    )}
                  >
                    <iconInfo.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-semibold text-foreground">{n.title}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatTimeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground font-normal">
                      {n.message}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "booking_created":
    case "booking_confirmed":
      return { icon: CalendarCheck, bg: "bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400" };
    case "booking_cancelled":
      return { icon: XCircle, bg: "bg-rose-500/10", color: "text-rose-600 dark:text-rose-400" };
    case "booking_completed":
      return { icon: CheckCircle2, bg: "bg-blue-500/10", color: "text-blue-600 dark:text-blue-400" };
    case "payment_success":
      return { icon: CreditCard, bg: "bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400" };
    case "payment_failed":
      return { icon: CreditCard, bg: "bg-rose-500/10", color: "text-rose-600 dark:text-rose-400" };
    case "review_received":
      return { icon: Star, bg: "bg-amber-500/10", color: "text-amber-600 dark:text-amber-400" };
    case "message_received":
      return { icon: MessageSquare, bg: "bg-purple-500/10", color: "text-purple-600 dark:text-purple-400" };
    default:
      return { icon: Sparkles, bg: "bg-primary/10", color: "text-primary" };
  }
}

function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
