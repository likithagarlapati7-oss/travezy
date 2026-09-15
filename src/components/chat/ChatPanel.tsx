import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  CheckCheck,
  ChevronLeft,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getConversations,
  getMessagesThread,
  markMessagesRead,
  sendMessage,
} from "@/lib/chat.functions";
import type { ConversationSummary } from "@/lib/chat.server";
import { cn } from "@/lib/utils";

export function ChatPanel({
  initialPartnerId,
  initialBookingId,
  roleContext = "tourist",
}: {
  initialPartnerId?: string | null;
  initialBookingId?: string | null;
  roleContext?: "tourist" | "provider" | "verifier" | "guide";
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    initialPartnerId || null,
  );
  const [activeBookingId, setActiveBookingId] = useState<string | null>(
    initialBookingId || null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch conversations list
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["chat", "conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await getConversations();
    },
    enabled: !!user,
  });

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedPartnerId && conversations.length > 0 && conversations[0]) {
      setSelectedPartnerId(conversations[0].partnerId);
      setActiveBookingId(conversations[0].bookingId || null);
    }
  }, [conversations, selectedPartnerId]);

  // 2. Fetch active message thread
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["chat", "thread", user?.id, selectedPartnerId],
    queryFn: async () => {
      if (!user || !selectedPartnerId) return [];
      return await getMessagesThread({ data: { partnerId: selectedPartnerId } });
    },
    enabled: !!user && !!selectedPartnerId,
  });

  // 3. Supabase Realtime subscription on messages
  useEffect(() => {
    if (!user) return;

    let channel: any = null;
    try {
      const channelId = `chat-realtime-${user.id}-${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            const newMsg = payload.new as any;
            if (
              newMsg.recipient_id === user.id ||
              newMsg.sender_id === user.id
            ) {
              qc.invalidateQueries({ queryKey: ["chat", "conversations", user.id] });
              if (
                selectedPartnerId &&
                (newMsg.sender_id === selectedPartnerId ||
                  newMsg.recipient_id === selectedPartnerId)
              ) {
                qc.invalidateQueries({
                  queryKey: ["chat", "thread", user.id, selectedPartnerId],
                });
              }
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
          },
          () => {
            qc.invalidateQueries({ queryKey: ["chat", "conversations", user.id] });
            if (selectedPartnerId) {
              qc.invalidateQueries({
                queryKey: ["chat", "thread", user.id, selectedPartnerId],
              });
            }
          },
        );

      channel.subscribe((status: string, err: any) => {
        if (err) console.warn("[ChatPanel Realtime Status]", status, err);
      });
    } catch (e) {
      console.warn("[ChatPanel Realtime setup error]", e);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [user, selectedPartnerId, qc]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({
      recipientId,
      content,
      bookingId,
    }: {
      recipientId: string;
      content: string;
      bookingId?: string | null;
    }) => {
      return await sendMessage({
        data: {
          recipientId,
          content,
          bookingId: bookingId || null,
        },
      });
    },
    onSuccess: () => {
      setInputMessage("");
      qc.invalidateQueries({ queryKey: ["chat", "thread", user?.id, selectedPartnerId] });
      qc.invalidateQueries({ queryKey: ["chat", "conversations", user?.id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedPartnerId) return;

    sendMutation.mutate({
      recipientId: selectedPartnerId,
      content: inputMessage,
      bookingId: activeBookingId,
    });
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.partnerName.toLowerCase().includes(q) ||
      (c.serviceTitle && c.serviceTitle.toLowerCase().includes(q)) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  const activeConversation = conversations.find(
    (c) => c.partnerId === selectedPartnerId,
  );

  return (
    <div className="grid h-[calc(100vh-14rem)] min-h-[32rem] max-h-[48rem] w-full grid-cols-1 overflow-hidden rounded-3xl border border-border bg-card shadow-card lg:grid-cols-12">
      {/* ── Left Sidebar: Conversations List ── */}
      <div
        className={cn(
          "flex flex-col border-r border-border bg-card/60 lg:col-span-4 lg:flex",
          selectedPartnerId ? "hidden lg:flex" : "flex",
        )}
      >
        {/* Search header */}
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              aria-label="Search conversations"
              className="rounded-full pl-9 text-xs"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {conversationsLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/60" />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="mx-auto size-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-semibold text-foreground">No conversations yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {roleContext === "tourist"
                  ? "Messages with tour guides and hotel hosts will appear here."
                  : roleContext === "guide"
                    ? "Inquiries from travellers interested in your guided tours will appear here."
                    : "Customer inquiries and guest chats will appear here."}
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.partnerId === selectedPartnerId;
              return (
                <button
                  key={c.partnerId}
                  type="button"
                  onClick={() => {
                    setSelectedPartnerId(c.partnerId);
                    setActiveBookingId(c.bookingId || null);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40",
                    isSelected && "bg-primary/10 dark:bg-primary/15 font-medium",
                  )}
                >
                  <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary font-display font-semibold text-secondary-foreground text-xs uppercase overflow-hidden ring-1 ring-border/60">
                    {c.partnerAvatarUrl ? (
                      <img
                        src={c.partnerAvatarUrl}
                        alt={c.partnerName}
                        className="size-full object-cover"
                      />
                    ) : c.isPartnerProvider ? (
                      <Building2 className="size-4 text-primary" />
                    ) : (
                      <User className="size-4 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate font-bold text-xs text-foreground">
                        {c.partnerName}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatShortTime(c.lastMessageTime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {c.partnerRole && (
                        <span className="rounded-md bg-secondary/80 px-1.5 py-0.2 text-[9px] font-semibold text-foreground/80">
                          {c.partnerRole}
                        </span>
                      )}
                      {c.partnerLocation && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground truncate">
                          <MapPin className="size-2.5 text-primary" />
                          {c.partnerLocation}
                        </span>
                      )}
                    </div>

                    {c.serviceTitle && (
                      <p className="truncate text-[11px] text-primary font-medium mt-0.5">
                        {c.serviceTitle}
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {c.lastSenderId === user?.id && <span className="font-semibold text-foreground/70">You: </span>}
                      {c.lastMessage}
                    </p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Pane: Active Message Thread ── */}
      <div
        className={cn(
          "flex flex-col bg-background lg:col-span-8",
          !selectedPartnerId ? "hidden lg:flex" : "flex",
        )}
      >
        {selectedPartnerId ? (
          <>
            {/* Thread Header */}
            <div className="flex items-center justify-between border-b border-border bg-card/60 px-5 py-3 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Back to conversations list"
                  className="h-8 w-8 p-0 lg:hidden"
                  onClick={() => setSelectedPartnerId(null)}
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="relative grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary overflow-hidden ring-1 ring-border/80">
                    {activeConversation?.partnerAvatarUrl ? (
                      <img
                        src={activeConversation.partnerAvatarUrl}
                        alt={activeConversation.partnerName}
                        className="size-full object-cover"
                      />
                    ) : activeConversation?.isPartnerProvider ? (
                      <Building2 className="size-4 text-primary" />
                    ) : (
                      <User className="size-4 text-muted-foreground" />
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      {activeConversation?.partnerName || "Chat"}
                      {activeConversation?.partnerRole && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {activeConversation.partnerRole}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {activeConversation?.partnerLocation && (
                        <span className="flex items-center gap-1 font-medium text-foreground/80">
                          <MapPin className="size-3 text-primary" />
                          {activeConversation.partnerLocation}
                        </span>
                      )}
                      {activeConversation?.partnerLocation && activeConversation?.serviceTitle && <span>•</span>}
                      {activeConversation?.serviceTitle && (
                        <span className="truncate max-w-xs text-muted-foreground">
                          {activeConversation.serviceTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-8">
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
                    <Sparkles className="size-6" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Start the conversation</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                    Send a message to inquire about itinerary details, timing, questions, or reservations.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex flex-col max-w-[80%] sm:max-w-[70%]",
                        isMine ? "ml-auto items-end" : "mr-auto items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed",
                          isMine
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted text-foreground border border-border/60 rounded-bl-none",
                        )}
                      >
                        {m.content}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground px-1">
                        <span>{formatMessageTime(m.created_at)}</span>
                        {isMine && (
                          <span title={m.read_at ? "Read" : "Sent"}>
                            {m.read_at ? (
                              <CheckCheck className="size-3 text-sky-500" />
                            ) : (
                              <Check className="size-3 text-muted-foreground" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Footer */}
            <form
              onSubmit={handleSendMessage}
              className="border-t border-border bg-card/60 p-3.5 backdrop-blur-md flex items-center gap-2"
            >
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                aria-label="Type your message"
                disabled={sendMutation.isPending}
                className="rounded-full bg-background pl-4 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                aria-label="Send chat message"
                disabled={!inputMessage.trim() || sendMutation.isPending}
                className="size-9 rounded-full p-0 shrink-0"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="grid size-14 place-items-center rounded-3xl bg-secondary text-primary mb-3">
              <MessageSquare className="size-7" />
            </div>
            <p className="font-display text-lg font-semibold">Travezy Direct Chat</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Select a conversation from the sidebar or initiate a chat from your trips to message your travel provider.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatShortTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
