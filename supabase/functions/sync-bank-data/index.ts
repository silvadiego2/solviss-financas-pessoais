import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FALLBACK_CLIENT_ID = Deno.env.get("PLUGGY_CLIENT_ID") ?? "";
const FALLBACK_CLIENT_SECRET = Deno.env.get("PLUGGY_CLIENT_SECRET") ?? "";
const PLUGGY_API = "https://api.pluggy.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function getUserPluggyCredentials(userId: string): Promise<{ clientId: string; clientSecret: string }> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data, error } = await adminClient
    .from("user_integrations")
    .select("client_id, client_secret, status")
    .eq("user_id", userId)
    .eq("provider", "pluggy")
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar credenciais do usuário:", error);
  }

  if (data?.client_id && data?.client_secret && data.status === "valid") {
    return {
      clientId: data.client_id,
      clientSecret: data.client_secret,
    };
  }

  if (FALLBACK_CLIENT_ID && FALLBACK_CLIENT_SECRET) {
    return {
      clientId: FALLBACK_CLIENT_ID,
      clientSecret: FALLBACK_CLIENT_SECRET,
    };
  }

  throw new Error("Credenciais Pluggy não configuradas. Configure em Integrações > Configurações.");
}

async function getPluggyApiKey(userId: string): Promise<string> {
  const { clientId, clientSecret } = await getUserPluggyCredentials(userId);

  const res = await fetch(`${PLUGGY_API}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    console.error("Erro Pluggy /auth:", data);
    throw new Error(data?.message || "Falha ao autenticar com Pluggy");
  }

  if (!data?.apiKey) {
    throw new Error("Falha ao autenticar com Pluggy");
  }

  return data.apiKey;
}

async function getAccounts(apiKey: string, itemId: string) {
  const res = await fetch(`${PLUGGY_API}/accounts?itemId=${encodeURIComponent(itemId)}`, {
    headers: {
      "X-API-KEY": apiKey,
    },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    console.error("Erro Pluggy /accounts:", data);
    throw new Error(data?.message || "Falha ao buscar contas");
  }

  return data?.results || [];
}

async function getTransactions(apiKey: string, accountId: string, fromStr: string) {
  const res = await fetch(
    `${PLUGGY_API}/transactions?accountId=${encodeURIComponent(accountId)}&from=${encodeURIComponent(fromStr)}&pageSize=100`,
    {
      headers: {
        "X-API-KEY": apiKey,
      },
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    console.error("Erro Pluggy /transactions:", data);
    throw new Error(data?.message || "Falha ao buscar transações");
  }

  return data?.results || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          code: "UNAUTHORIZED_NO_AUTH_HEADER",
          message: "Missing authorization header",
        },
        401
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return jsonResponse(
        {
          code: "UNAUTHORIZED_USER",
          message: "Não autorizado",
          details: authError?.message ?? null,
        },
        401
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, itemId, connection_id } = body;

    if (action === "get_connect_token") {
      console.log("Gerando connect token para usuário:", user.id);

      const apiKey = await getPluggyApiKey(user.id);

      const res = await fetch(`${PLUGGY_API}/connect_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          clientUserId: user.id,
        }),
      });

      const data = await parseJsonSafe(res);

      if (!res.ok) {
        console.error("Erro Pluggy /connect_token:", data);
        return jsonResponse(
          {
            error: data?.message || "Falha ao gerar connect token",
            details: data,
          },
          500
        );
      }

      const connectToken = data?.accessToken;

      if (!connectToken) {
        return jsonResponse(
          {
            error: "Falha ao gerar connect token",
            details: data,
          },
          500
        );
      }

      return jsonResponse({ connectToken });
    }

    if (action === "sync" && itemId) {
      console.log("Sincronizando item Pluggy:", itemId);

      const apiKey = await getPluggyApiKey(user.id);
      const accounts = await getAccounts(apiKey, itemId);

      let totalImported = 0;

      for (const account of accounts) {
        const from = new Date();
        from.setDate(from.getDate() - 90);
        const fromStr = from.toISOString().split("T")[0];

        const transactions = await getTransactions(apiKey, account.id, fromStr);

        for (const tx of transactions) {
          const { error: upsertError } = await supabaseClient
            .from("synced_transactions")
            .upsert(
              {
                user_id: user.id,
                external_transaction_id: tx.id,
                amount: tx.amount,
                description: tx.description || tx.descriptionRaw || "Sem descrição",
                date: tx.date?.split("T")[0],
                transaction_type: tx.amount < 0 ? "expense" : "income",
                category_suggestion: tx.category?.description || null,
                raw_data: tx,
                is_matched: false,
              },
              {
                onConflict: "external_transaction_id",
                ignoreDuplicates: true,
              }
            );

          if (upsertError) {
            console.error("Erro upsert synced_transactions:", upsertError);
            continue;
          }

          totalImported++;
        }
      }

      await supabaseClient
        .from("bank_connections")
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          connection_status: "active",
        })
        .eq("account_external_id", itemId)
        .eq("user_id", user.id);

      return jsonResponse({
        success: true,
        accounts: accounts.length || 0,
        synced_count: totalImported,
        message: "Transações sincronizadas com sucesso",
      });
    }

    if (connection_id) {
      console.log("Sync legado para connection_id:", connection_id);

      const { data: connection, error: connectionError } = await supabaseClient
        .from("bank_connections")
        .select("*")
        .eq("id", connection_id)
        .eq("user_id", user.id)
        .single();

      if (connectionError || !connection) {
        return jsonResponse({ error: "Conexão não encontrada" }, 404);
      }

      if (connection.account_external_id) {
        const apiKey = await getPluggyApiKey(user.id);
        const accounts = await getAccounts(apiKey, connection.account_external_id);

        let totalImported = 0;

        for (const account of accounts) {
          const from = new Date();
          from.setDate(from.getDate() - 90);
          const fromStr = from.toISOString().split("T")[0];

          const transactions = await getTransactions(apiKey, account.id, fromStr);

          for (const tx of transactions) {
            const { error } = await supabaseClient
              .from("synced_transactions")
              .upsert(
                {
                  user_id: user.id,
                  bank_connection_id: connection_id,
                  external_transaction_id: tx.id,
                  amount: tx.amount,
                  description: tx.description || tx.descriptionRaw || "Sem descrição",
                  date: tx.date?.split("T")[0],
                  transaction_type: tx.amount < 0 ? "expense" : "income",
                  category_suggestion: tx.category?.description || null,
                  raw_data: tx,
                  is_matched: false,
                },
                {
                  onConflict: "bank_connection_id,external_transaction_id",
                  ignoreDuplicates: true,
                }
              );

            if (error) {
              console.error("Erro upsert sync legado:", error);
              continue;
            }

            totalImported++;
          }
        }

        await supabaseClient
          .from("bank_connections")
          .update({
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            connection_status: "active",
          })
          .eq("id", connection_id)
          .eq("user_id", user.id);

        return jsonResponse({
          success: true,
          synced_count: totalImported,
          message: "Transações sincronizadas com sucesso",
        });
      }

      const mockTransactions = [
        {
          external_transaction_id: `tx_${Date.now()}_1`,
          amount: -45.67,
          description: "Compra no Supermercado ABC",
          date: new Date().toISOString().split("T")[0],
          transaction_type: "expense",
          category_suggestion: "Alimentação",
          raw_data: { merchant: "Supermercado ABC", category: "grocery" },
        },
        {
          external_transaction_id: `tx_${Date.now()}_2`,
          amount: 1500.0,
          description: "Transferência PIX Recebida",
          date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          transaction_type: "income",
          category_suggestion: "Transferência",
          raw_data: { type: "pix", sender: "João Silva" },
        },
        {
          external_transaction_id: `tx_${Date.now()}_3`,
          amount: -89.9,
          description: "Pagamento Cartão de Crédito",
          date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
          transaction_type: "expense",
          category_suggestion: "Cartão de Crédito",
          raw_data: { type: "credit_card_payment", card_ending: "1234" },
        },
      ];

      const { data: insertedTransactions, error: insertError } = await supabaseClient
        .from("synced_transactions")
        .upsert(
          mockTransactions.map((tx) => ({
            ...tx,
            user_id: user.id,
            bank_connection_id: connection_id,
            is_matched: false,
          })),
          {
            onConflict: "bank_connection_id,external_transaction_id",
            ignoreDuplicates: true,
          }
        )
        .select();

      if (insertError) {
        console.error("Erro insert mock transactions:", insertError);
        return jsonResponse({ error: "Erro ao inserir transações" }, 500);
      }

      await supabaseClient
        .from("bank_connections")
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          connection_status: "active",
        })
        .eq("id", connection_id)
        .eq("user_id", user.id);

      return jsonResponse({
        success: true,
        synced_count: insertedTransactions?.length || 0,
        message: "Transações sincronizadas com sucesso (modo demo)",
      });
    }

    return jsonResponse(
      { error: "Parâmetros inválidos. Use action ou connection_id." },
      400
    );
  } catch (error: any) {
    console.error("Function error:", error);
    return jsonResponse(
      {
        error: error?.message || "Erro interno do servidor",
      },
      500
    );
  }
});
