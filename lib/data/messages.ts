import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ConversationSummary = {
  id: string;
  listingTitle: string;
  otherPerson: string;
  updatedAt: string;
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

const demoConversations: ConversationSummary[] = [
  {
    id: "demo",
    listingTitle: "Silla ergonómica de oficina",
    otherPerson: "Usuario de ejemplo",
    updatedAt: "Hoy"
  }
];

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

export async function getConversations(): Promise<ConversationSummary[]> {
  if (!isSupabaseConfigured()) {
    return demoConversations;
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
    return [];
  }

  return (data as unknown as ConversationRow[]).map((conversation) => {
    const isBuyer = conversation.buyer_id === user.id;
    return {
      id: conversation.id,
      listingTitle: conversation.listings?.title ?? "Publicación",
      otherPerson: isBuyer
        ? conversation.seller?.full_name ?? "Persona oferente"
        : conversation.buyer?.full_name ?? "Persona interesada",
      updatedAt: new Intl.DateTimeFormat("es-CR", {
        day: "numeric",
        month: "short"
      }).format(new Date(conversation.updated_at))
    };
  });
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  if (!isSupabaseConfigured() || id === "demo") {
    return {
      id: "demo",
      listingTitle: "Silla ergonómica de oficina",
      otherPerson: "Usuario de ejemplo",
      messages: [
        {
          id: "1",
          body: "Hola, ¿todavía está disponible?",
          senderName: "Usuario de ejemplo",
          isOwn: false,
          createdAt: "Hoy"
        },
        {
          id: "2",
          body: "Sí, puedes hacer una oferta o pasar a verla en un punto seguro.",
          senderName: "Tú",
          isOwn: true,
          createdAt: "Hoy"
        }
      ]
    };
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
    return null;
  }

  const { data: messages } = await supabase
    .from("direct_messages")
    .select("id,body,sender_id,created_at,profiles!direct_messages_sender_id_fkey(full_name)")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

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
