import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatCostaRicaDate, formatCostaRicaRelativeDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

type IntakeConversationRow = {
  id: string;
  intake_id: string;
  user_id: string;
  updated_at: string;
  platform_intakes?: { title?: string; status?: string } | null;
  user?: { full_name?: string } | null;
};

type IntakeMessageRow = {
  id: string;
  body: string;
  sender_id: string | null;
  sender_role: "admin" | "user" | string;
  created_at: string;
  sender?: { full_name?: string } | null;
};

export type IntakeConversationSummary = {
  id: string;
  href: string;
  listingTitle: string;
  otherPerson: string;
  updatedAt: string;
  updatedAtRaw: string;
  kind: "intake";
};

export type IntakeConversationDetail = {
  id: string;
  intakeId: string;
  listingTitle: string;
  otherPerson: string;
  canReply: boolean;
  messages: Array<{
    id: string;
    body: string;
    senderName: string;
    isOwn: boolean;
    createdAt: string;
  }>;
};

function formatDate(value: string | null | undefined) {
  return value ? formatCostaRicaDate(value) : "Sin fecha";
}

function logIntakeChatError(label: string, error: unknown, context: Record<string, unknown>) {
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

export async function getIntakeConversationSummaries(): Promise<IntakeConversationSummary[]> {
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
    .from("intake_conversations")
    .select("id,intake_id,user_id,updated_at,platform_intakes(title,status),user:profiles!intake_conversations_user_id_fkey(full_name)")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    if (error) {
      logIntakeChatError("Load inbox error:", error, {
        table: "intake_conversations",
        userId: user.id
      });
    }
    return [];
  }

  return (data as unknown as IntakeConversationRow[]).map((conversation) => ({
    id: `intake:${conversation.id}`,
    href: `/mensajes/intake/${conversation.id}`,
    listingTitle: conversation.platform_intakes?.title ?? "Entrega a Intercambio CR",
    otherPerson: conversation.user_id === user.id ? "Intercambio CR" : conversation.user?.full_name ?? "Usuario",
    updatedAt: formatCostaRicaRelativeDate(conversation.updated_at),
    updatedAtRaw: conversation.updated_at,
    kind: "intake"
  }));
}

export async function getIntakeConversation(id: string): Promise<IntakeConversationDetail | null> {
  if (!isSupabaseConfigured()) {
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
    .from("intake_conversations")
    .select("id,intake_id,user_id,platform_intakes(title,status),user:profiles!intake_conversations_user_id_fkey(full_name)")
    .eq("id", id)
    .single();

  if (conversationError || !conversation) {
    if (conversationError) {
      logIntakeChatError("Load inbox error:", conversationError, {
        table: "intake_conversations",
        conversationId: id,
        userId: user.id
      });
    }
    return null;
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "admin";
  const row = conversation as unknown as IntakeConversationRow;

  if (!isAdmin && row.user_id !== user.id) {
    return null;
  }

  const { data: messages, error: messagesError } = await supabase
    .from("intake_messages")
    .select("id,body,sender_id,sender_role,created_at,sender:profiles!intake_messages_sender_id_fkey(full_name)")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    logIntakeChatError("Load inbox error:", messagesError, {
      table: "intake_messages",
      conversationId: id,
      userId: user.id
    });
  }

  return {
    id: row.id,
    intakeId: row.intake_id,
    listingTitle: row.platform_intakes?.title ?? "Entrega a Intercambio CR",
    otherPerson: row.user_id === user.id ? "Intercambio CR" : row.user?.full_name ?? "Usuario",
    canReply: true,
    messages:
      (messages as unknown as IntakeMessageRow[] | null)?.map((message) => ({
        id: message.id,
        body: message.body,
        senderName:
          message.sender_id === user.id
            ? "Tú"
            : message.sender_role === "admin"
              ? "Intercambio CR"
              : message.sender?.full_name ?? "Usuario",
        isOwn: message.sender_id === user.id,
        createdAt: formatDate(message.created_at)
      })) ?? []
  };
}
