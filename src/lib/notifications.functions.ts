import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server function to fetch notifications for the authenticated user.
 */
export const getUserNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: notifications, error } = await context.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.warn("[getUserNotifications error]", error);
      return [];
    }

    return notifications ?? [];
  });

/**
 * Server function to mark a single notification as read.
 */
export const markNotificationAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        notificationId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", data.notificationId)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true, notificationId: data.notificationId };
  });

/**
 * Server function to mark all notifications as read for the user.
 */
export const markAllNotificationsAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", context.userId)
      .eq("is_read", false);

    if (error) throw new Error(error.message);
    return { success: true };
  });
