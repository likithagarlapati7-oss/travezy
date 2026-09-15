import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  CheckCheck,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getMessagesThread, sendMessage } from "@/lib/chat.functions";
import { cn } from "@/lib/utils";

export interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl?: string | null | undefined;
  partnerLocation?: string | null | undefined;
  partnerRoleLabel?: string | null | undefined;
  isPartnerProvider?: boolean | undefined;
  bookingId?: string | null | undefined;
  serviceTitle?: string | null | undefined;
}

export function ChatDialog({
  open,
  onOpenChange,
  partnerId,
  partnerName,
  partnerAvatarUrl,
  partnerLocation,
  partnerRoleLabel,
  isPartnerProvider = false,
  bookingId,
  serviceTitle,
}: ChatDialogProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat", "thread", user?.id, partnerId],
    queryFn: async () => {
      if (!user || !partnerId) return [];
      return await getMessagesThread({ data: { partnerId } });
    },
    enabled: !!user && !!partnerId && open,
  });

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [open]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !partnerId || !open) return;

    let channel: any = null;
    try {
      const channelId = `dialog-chat-${user.id}-${partnerId}-${Math.random().toString(36).substring(2, 9)}`;
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
              (newMsg.sender_id === partnerId && newMsg.recipient_id === user.id) ||
              (newMsg.sender_id === user.id && newMsg.recipient_id === partnerId)
            ) {
              qc.invalidateQueries({
                queryKey: ["chat", "thread", user.id, partnerId],
              });
              qc.invalidateQueries({
                queryKey: ["chat", "conversations", user.id],
              });
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
            qc.invalidateQueries({
              queryKey: ["chat", "thread", user.id, partnerId],
            });
            qc.invalidateQueries({
              queryKey: ["chat", "conversations", user.id],
            });
          },
        );

      channel.subscribe((status: string, err: any) => {
        if (err) console.warn("[ChatDialog Realtime Status]", status, err);
      });
    } catch (e) {
      console.warn("[ChatDialog Realtime setup error]", e);
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
  }, [user, partnerId, open, qc]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      return await sendMessage({
        data: {
          recipientId: partnerId,
          content: text,
          bookingId: bookingId || null,
        },
      });
    },
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["chat", "thread", user?.id, partnerId] });
      qc.invalidateQueries({ queryKey: ["chat", "conversations", user?.id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send message. Please try again.");
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    sendMutation.mutate(content);
  };

  const badgeText = partnerRoleLabel || (isPartnerProvider ? "Host" : "Tour Guide");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col h-[36rem] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-3xl border border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="border-b border-border bg-card/90 px-4 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative size-11 shrink-0">
              {partnerAvatarUrl ? (
                <img
                  src={partnerAvatarUrl}
                  alt={partnerName}
                  className="size-full rounded-2xl object-cover ring-2 ring-border/80 shadow-xs"
                />
              ) : (
                <span className="grid size-full place-items-center rounded-2xl bg-secondary text-secondary-foreground font-display font-bold text-sm">
                  {isPartnerProvider ? (
                    <Building2 className="size-5 text-primary" />
                  ) : (
                    <User className="size-5 text-muted-foreground" />
                  )}
                </span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-bold truncate text-foreground">
                  {partnerName}
                </DialogTitle>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary flex items-center gap-1">
                  <CheckCircle2 className="size-2.5" />
                  {badgeText}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 truncate">
                {partnerLocation && (
                  <span className="flex items-center gap-1 shrink-0 font-medium">
                    <MapPin className="size-3 text-primary" />
                    {partnerLocation}
                  </span>
                )}
                {partnerLocation && serviceTitle && <span>•</span>}
                {serviceTitle && (
                  <DialogDescription className="text-[11px] text-muted-foreground truncate p-0 m-0">
                    {serviceTitle}
                  </DialogDescription>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-1">
                <MessageSquare className="size-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                Start a conversation with {partnerName}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Ask questions regarding itinerary customizations, language options, meeting points, or tour schedules.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => setContent("Hi! I would like to know more about your guided tour.")}
                  className="rounded-full border border-border/80 bg-secondary/50 px-3 py-1 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  "Hi! I'd like to know more about your tour."
                </button>
                <button
                  type="button"
                  onClick={() => setContent("Are you available for a custom tour this weekend?")}
                  className="rounded-full border border-border/80 bg-secondary/50 px-3 py-1 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  "Are you available this weekend?"
                </button>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col max-w-[82%]",
                    isMine ? "ml-auto items-end" : "mr-auto items-start",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-xs"
                        : "bg-card text-foreground border border-border/80 rounded-bl-xs",
                    )}
                  >
                    {m.content}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground px-1">
                    <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
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

        {/* Footer Input */}
        <form
          onSubmit={handleSend}
          className="border-t border-border bg-card/90 p-3 backdrop-blur-md flex items-center gap-2"
        >
          <Input
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Message ${partnerName}...`}
            aria-label="Type your message"
            disabled={sendMutation.isPending}
            className="rounded-full bg-background text-xs pl-4 h-10 shadow-inner"
          />
          <Button
            type="submit"
            size="sm"
            aria-label="Send message"
            disabled={!content.trim() || sendMutation.isPending}
            className="size-10 rounded-full p-0 shrink-0 shadow-sm"
          >
            {sendMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
