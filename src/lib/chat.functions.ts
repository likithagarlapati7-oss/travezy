import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getConversationsServer,
  getMessagesThreadServer,
  markMessagesReadServer,
  sendMessageServer,
} from "./chat.server";

/**
 * Server function to send a new message.
 */
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        recipientId: z.string().uuid(),
        bookingId: z.string().uuid().nullable().optional(),
        content: z.string().min(1, "Message cannot be empty"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return await sendMessageServer({
      supabase: context.supabase,
      senderId: context.userId,
      recipientId: data.recipientId,
      bookingId: data.bookingId,
      content: data.content,
    });
  });

/**
 * Server function to fetch all conversations for the authenticated user.
 */
export const getConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return await getConversationsServer(context.supabase, context.userId);
  });

/**
 * Server function to fetch the message thread with a partner.
 */
export const getMessagesThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        partnerId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return await getMessagesThreadServer(context.supabase, context.userId, data.partnerId);
  });

/**
 * Server function to mark messages as read.
 */
export const markMessagesRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        partnerId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return await markMessagesReadServer(context.supabase, context.userId, data.partnerId);
  });
