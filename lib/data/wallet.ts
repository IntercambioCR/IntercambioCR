import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type WalletData = {
  balances: Array<[string, string, string]>;
  movements: Array<{
    label: string;
    date: string;
    amount: string;
    tone: string;
    balance?: string;
  }>;
};

export async function getWalletData(): Promise<WalletData> {
  const fallback: WalletData = {
    balances: [
      ["Disponibles", "680 créditos", "Listos para ofertas e intercambios"],
      ["Retenidos", "180 créditos", "Ofertas en proceso"],
      ["Pendientes", "420 créditos", "Entrega aprobada en revisión"],
      ["Congelados", "0 créditos", "Disputas o seguridad"]
    ],
    movements: [
      {
        label: "Entrega aprobada en Escazú Centro o Alajuela Centro",
        date: "Hoy",
        amount: "+420 créditos",
        tone: "text-leaf-600",
        balance: "260 → 680"
      },
      {
        label: "Solicitud en proceso",
        date: "Ayer",
        amount: "-180 créditos retenidos",
        tone: "text-ocean-600",
        balance: "860 → 680"
      }
    ]
  };

  if (!isSupabaseConfigured()) {
    return fallback;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return fallback;
  }

  const [accountResult, transactionResult, movementResult] = await Promise.all([
    supabase.from("credit_accounts").select("*").eq("user_id", user.id).single(),
    supabase
      .from("credit_transactions")
      .select("type,amount,previous_balance,new_balance,description,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("credit_movements")
      .select("movement_type,amount,note,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  if (accountResult.error || !accountResult.data) {
    return fallback;
  }

  const account = accountResult.data;
  const transactionMovements =
    transactionResult.data?.map((transaction) => ({
      label: transaction.description ?? transaction.type,
      date: new Intl.DateTimeFormat("es-CR", {
        day: "numeric",
        month: "short"
      }).format(new Date(transaction.created_at)),
      amount: `${transaction.amount > 0 ? "+" : ""}${transaction.amount} créditos`,
      tone: transaction.amount > 0 ? "text-leaf-600" : "text-slate-700",
      balance: `${transaction.previous_balance} → ${transaction.new_balance}`
    })) ?? [];

  const legacyMovements =
    movementResult.data?.map((movement) => ({
      label: movement.note ?? movement.movement_type,
      date: new Intl.DateTimeFormat("es-CR", {
        day: "numeric",
        month: "short"
      }).format(new Date(movement.created_at)),
      amount: `${movement.amount > 0 ? "+" : ""}${movement.amount} créditos`,
      tone: movement.amount > 0 ? "text-leaf-600" : "text-slate-700"
    })) ?? [];

  return {
    balances: [
      ["Disponibles", `${account.available} créditos`, "Listos para ofertas e intercambios"],
      ["Retenidos", `${account.held} créditos`, "Ofertas en proceso"],
      ["Pendientes", `${account.pending} créditos`, "Entregas en revisión"],
      ["Congelados", `${account.frozen} créditos`, "Disputas o seguridad"]
    ],
    movements: transactionMovements.length > 0 ? transactionMovements : legacyMovements
  };
}
