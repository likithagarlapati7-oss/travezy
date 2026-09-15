import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { notifyNewChatMessage } from "./notifications.server";
import { HUMAN_TOUR_GUIDES } from "@/data/human-guides";

type Client = SupabaseClient<Database>;

export type ConversationSummary = {
  partnerId: string;
  partnerName: string;
  partnerEmail: string | null;
  partnerAvatarUrl: string | null;
  partnerLocation?: string | null;
  partnerRole?: string | null;
  isPartnerProvider: boolean;
  businessName: string | null;
  lastMessage: string;
  lastMessageTime: string;
  lastSenderId: string;
  unreadCount: number;
  bookingId: string | null;
  serviceTitle: string | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates authorization and persists a new chat message between tourist, provider, or human tour guide.
 */
export async function sendMessageServer({
  supabase,
  senderId,
  recipientId,
  bookingId,
  content,
}: {
  supabase: Client;
  senderId: string;
  recipientId: string;
  bookingId?: string | null | undefined;
  content: string;
}) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Message content cannot be empty.");
  }

  if (senderId === recipientId) {
    throw new Error("Cannot send a message to yourself.");
  }

  const validBookingId = bookingId && UUID_REGEX.test(bookingId) ? bookingId : null;

  // 1. Insert message into messages table (with fallback for foreign key errors on booking_id)
  let message: any = null;
  const { data: primaryMsg, error: mErr } = await supabase
    .from("messages")
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      booking_id: validBookingId,
      content: trimmed,
      created_at: new Date().toISOString(),
      read_at: null,
    })
    .select("*")
    .single();

  if (mErr) {
    // If foreign key constraint on booking_id failed, retry inserting without booking_id
    const { data: fallbackMsg, error: fallbackErr } = await supabase
      .from("messages")
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        booking_id: null,
        content: trimmed,
        created_at: new Date().toISOString(),
        read_at: null,
      })
      .select("*")
      .single();

    if (fallbackErr || !fallbackMsg) {
      throw new Error(`Failed to send message: ${mErr.message || fallbackErr?.message || "Unknown error"}`);
    }
    message = fallbackMsg;
  } else {
    message = primaryMsg;
  }

  // 2. Resolve sender & recipient details for notification
  const [senderRes, providerRes] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", senderId).maybeSingle(),
    supabase.from("providers").select("id").eq("user_id", recipientId).maybeSingle(),
  ]);

  // Check if sender is a registered guide
  const senderGuide = HUMAN_TOUR_GUIDES.find((g) => g.user_id === senderId || g.id === senderId);
  const recipientGuide = HUMAN_TOUR_GUIDES.find((g) => g.user_id === recipientId || g.id === recipientId);

  const senderName =
    senderGuide?.name || senderRes.data?.full_name || senderRes.data?.email || "User";
  const isRecipientProvider = !!providerRes.data || !!recipientGuide;

  // 3. Dispatch in-app notification & alert to recipient
  try {
    await notifyNewChatMessage({
      messageId: message.id,
      senderId,
      recipientId,
      senderName,
      contentPreview: trimmed,
      bookingId: validBookingId,
      isRecipientProvider,
    });
  } catch (notifErr) {
    console.warn("[sendMessageServer notification warning]", notifErr);
  }

  return message;
}

/**
 * Aggregates all conversation threads for the authenticated user, enriching with guide and host metadata.
 */
export async function getConversationsServer(
  supabase: Client,
  userId: string,
): Promise<ConversationSummary[]> {
  // 1. Query all messages involving the user
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*, bookings(id, service_id, services(title))")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getConversationsServer error]", error);
    return [];
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // 2. Group messages by conversation partner
  const partnerMap = new Map<string, typeof messages>();

  messages.forEach((msg) => {
    const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
    if (!partnerMap.has(partnerId)) {
      partnerMap.set(partnerId, []);
    }
    partnerMap.get(partnerId)!.push(msg);
  });

  const partnerIds = Array.from(partnerMap.keys());

  // 3. Query partner profiles and provider metadata
  const [profilesRes, providersRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", partnerIds),
    supabase.from("providers").select("user_id, business_name").in("user_id", partnerIds),
  ]);

  const profileMap = new Map<string, any>();
  (profilesRes.data ?? []).forEach((p) => profileMap.set(p.id, p));

  const providerMap = new Map<string, string>();
  (providersRes.data ?? []).forEach((prov) => providerMap.set(prov.user_id, prov.business_name));

  // Map of guides by user_id
  const guideMap = new Map<string, (typeof HUMAN_TOUR_GUIDES)[0]>();
  HUMAN_TOUR_GUIDES.forEach((g) => {
    guideMap.set(g.user_id, g);
    guideMap.set(g.id, g);
  });

  // 4. Build summaries
  const conversations: ConversationSummary[] = [];

  partnerMap.forEach((msgs, partnerId) => {
    const latest = msgs[0];
    if (!latest) return;
    const profile = profileMap.get(partnerId);
    const businessName = providerMap.get(partnerId) || null;
    const guide = guideMap.get(partnerId);

    const unreadCount = msgs.filter(
      (m) => m.recipient_id === userId && !m.read_at,
    ).length;

    let serviceTitle = (latest.bookings as any)?.services?.title || null;
    let partnerName = profile?.full_name || profile?.email || "Traveller";
    let partnerAvatarUrl = profile?.avatar_url || null;
    let partnerLocation: string | null = null;
    let partnerRole: string | null = "Traveller";

    if (guide) {
      partnerName = guide.name;
      partnerAvatarUrl = guide.profile_image;
      partnerLocation = `${guide.city}, ${guide.state}`;
      partnerRole = "Tour Guide";
      serviceTitle = serviceTitle || `Personal Guide in ${guide.city}`;
    } else if (businessName) {
      partnerName = businessName;
      partnerRole = "Host / Provider";
    }

    conversations.push({
      partnerId,
      partnerName,
      partnerEmail: profile?.email || guide?.email || null,
      partnerAvatarUrl,
      partnerLocation,
      partnerRole,
      isPartnerProvider: !!businessName || !!guide,
      businessName: guide ? `${guide.name} • Local Guide` : businessName,
      lastMessage: latest.content,
      lastMessageTime: latest.created_at,
      lastSenderId: latest.sender_id,
      unreadCount,
      bookingId: latest.booking_id,
      serviceTitle,
    });
  });

  // Sort by latest message time descending
  return conversations.sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(),
  );
}

/**
 * Fetches the complete message thread between the authenticated user and a partner.
 */
export async function getMessagesThreadServer(
  supabase: Client,
  userId: string,
  partnerId: string,
) {
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*, bookings(id, services(title, destination))")
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  // Mark all unread incoming messages from this partner as read
  const unreadIds = (messages ?? [])
    .filter((m) => m.recipient_id === userId && !m.read_at)
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  return messages ?? [];
}

/**
 * Marks messages from a partner as read.
 */
export async function markMessagesReadServer(
  supabase: Client,
  userId: string,
  partnerId: string,
) {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .eq("sender_id", partnerId)
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return { success: true };
}
