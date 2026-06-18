import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getIntakeConversationSummaries } from "@/lib/data/intake-chat";
import { createClient } from "@/lib/supabase/server";

export type ConversationSummary = {
  id: string;
  href: string;
  listingTitle: string;
  otherPerson: string;
  updatedAt: string;
  unreadCount: number;
  kind?: "direct" | "intake";
};

export type ConversationDetail = {
  id: string;
  listingTitle: string;
  otherPerson: string;
  messages: Array<{
    id: string;
    body: string;
    senderName: string;
    isOwn: boolean;
    createdAt: string;
  }>;
};

type ConversationRow = {
  id: string;
  updated_at: string;
  buyer_id: string;
  seller_id: string;
  listings?: { title?: string } | null;
  buyer?: { full_name?: string } | null;
  seller?: { full_name?: string } | null;
};

type MessageRow = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  profiles?: { full_name?: string } | null;
};

function logMessageLoadError(label: string, error: unknown, context: Record<string, unknown>) {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;

  console.error(label, {
    message: typeof record?.message === "string" ? record.message : String(error),
    code: record?.code ?? null,
    details: record?.details ?? null,
    hint: record?.hint ?? null,
    error,
    ...context
  });
}

export async function getConversations(): Promise<ConversationSummary[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("direct_conversations")
    .select("id,updated_at,buyer_id,seller_id,listings(title),buyer:profiles!direct_conversations_buyer_id_fkey(full_name),seller:profiles!direct_conversations_seller_id_fkey(full_name)")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    if (error) {
      logMessageLoadError("Load inbox error:", error, {
        table: "direct_conversations",
        userId: user.id
      });
    }
    return [];
  }

  const directConversations = await Promise.all((data as unknown as ConversationRow[]).map(async (conversation) => {
    const isBuyer = conversation.buyer_id === user.id;
    const { count, error: unreadError } = await supabase
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id)
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (unreadError) {
      logMessageLoadError("Unread messages error:", unreadError, {
        table: "direct_messages",
        action: "countUnread",
        conversationId: conversation.id,
        userId: user.id
      });
    }

    return {
      id: conversation.id,
      href: `/mensajes/${conversation.id}`,
      listingTitle: conversation.listings?.title ?? "Publicación",
      otherPerson: isBuyer
        ? conversation.seller?.full_name ?? "Persona oferente"
        : conversation.buyer?.full_name ?? "Persona interesada",
      updatedAt: new Intl.DateTimeFormat("es-CR", {
        day: "numeric",
        month: "short"
      }).format(new Date(conversation.updated_at)),
      unreadCount: count ?? 0,
      kind: "direct" as const
    };
  }));

  const intakeConversations = (await getIntakeConversationSummaries()).map((conversation) => ({
    ...conversation,
    unreadCount: "unreadCount" in conversation ? Number(conversation.unreadCount) || 0 : 0
  }));
  return [...intakeConversations, ...directConversations];
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  if (!isSupabaseConfigured() || id === "demo") {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("direct_conversations")
    .select("id,buyer_id,seller_id,listings(title),buyer:profiles!direct_conversations_buyer_id_fkey(full_name),seller:profiles!direct_conversations_seller_id_fkey(full_name)")
    .eq("id", id)
    .single();

  if (conversationError || !conversation) {
    if (conversationError) {
      logMessageLoadError("Load inbox error:", conversationError, {
        table: "direct_conversations",
        conversationId: id,
        userId: user.id
      });
    }
    return null;
  }

  const { error: readError } = await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .neq("sender_id", user.id)
    .is("read_at", null);

  if (readError) {
    logMessageLoadError("Unread messages error:", readError, {
      table: "direct_messages",
      action: "markAsRead",
      conversationId: id,
      userId: user.id
    });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("direct_messages")
    .select("id,body,sender_id,created_at,profiles!direct_messages_sender_id_fkey(full_name)")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    logMessageLoadError("Load inbox error:", messagesError, {
      table: "direct_messages",
      conversationId: id,
      userId: user.id
    });
  }

  const isBuyer = conversation.buyer_id === user.id;

  return {
      id: conversation.id,
      listingTitle: (conversation as unknown as ConversationRow).listings?.title ?? "Publicación",
      otherPerson: isBuyer
      ? (conversation as unknown as ConversationRow).seller?.full_name ?? "Persona oferente"
      : (conversation as unknown as ConversationRow).buyer?.full_name ?? "Persona interesada",
    messages:
      (messages as unknown as MessageRow[] | null)?.map((message) => ({
        id: message.id,
        body: message.body,
        senderName: message.sender_id === user.id ? "Tú" : message.profiles?.full_name ?? "Usuario",
        isOwn: message.sender_id === user.id,
        createdAt: new Intl.DateTimeFormat("es-CR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date(message.created_at))
      })) ?? []
  };
}
