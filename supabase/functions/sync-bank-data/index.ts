import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FALLBACK_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID') ?? '';
const FALLBACK_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET') ?? '';
const PLUGGY_API = 'https://api.pluggy.ai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Busca credenciais do usuário (ou usa fallback global)
async function getUserPluggyCredentials(userId: string): Promise<{ clientId: string; clientSecret: string }> {
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const { data } = await adminClient
    .from('user_integrations')
    .select('client_id, client_secret, status')
    .eq('user_id', userId)
    .eq('provider', 'pluggy')
    .maybeSingle();

  if (data?.client_id && data?.client_secret && data.status === 'valid') {
    return { clientId: data.client_id, clientSecret: data.client_secret };
  }
  if (FALLBACK_CLIENT_ID && FALLBACK_CLIENT_SECRET) {
    return { clientId: FALLBACK_CLIENT_ID, clientSecret: FALLBACK_CLIENT_SECRET };
  }
  throw new Error('Credenciais Pluggy não configuradas. Configure em Integrações > Configurações.');
}

// Gera API Key temporária do Pluggy
async function getPluggyApiKey(userId: string): Promise<string> {
  const { clientId, clientSecret } = await getUserPluggyCredentials(userId);
  const res = await fetch(`${PLUGGY_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  const data = await res.json();
  if (!data.apiKey) throw new Error('Falha ao autenticar com Pluggy');
  return data.apiKey;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Validar usuário autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, itemId, connection_id } = body;

    // ─────────────────────────────────────────────
    // AÇÃO 1: Gerar Connect Token para o widget Pluggy
    // ─────────────────────────────────────────────
    if (action === 'get_connect_token') {
      console.log('Gerando connect token para usuário:', user.id);

      const apiKey = await getPluggyApiKey(user.id);
      const res = await fetch(`${PLUGGY_API}/connect_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({ clientUserId: user.id }),
      });

      const { accessToken } = await res.json();
      if (!accessToken) throw new Error('Falha ao gerar connect token');

      return new Response(
        JSON.stringify({ connectToken: accessToken }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─────────────────────────────────────────────
    // AÇÃO 2: Sincronizar via Pluggy (itemId)
    // ─────────────────────────────────────────────
    if (action === 'sync' && itemId) {
      console.log('Sincronizando item Pluggy:', itemId);

      const apiKey = await getPluggyApiKey(user.id);

      // Buscar contas do item
      const accountsRes = await fetch(`${PLUGGY_API}/accounts?itemId=${itemId}`, {
        headers: { 'X-API-KEY': apiKey },
      });
      const { results: accounts } = await accountsRes.json();

      let totalImported = 0;

      for (const account of accounts || []) {
        // Buscar transações dos últimos 90 dias
        const from = new Date();
        from.setDate(from.getDate() - 90);
        const fromStr = from.toISOString().split('T')[0];

        const txRes = await fetch(
          `${PLUGGY_API}/transactions?accountId=${account.id}&from=${fromStr}&pageSize=100`,
          { headers: { 'X-API-KEY': apiKey } }
        );
        const { results: transactions } = await txRes.json();

        for (const tx of transactions || []) {
          // Salvar em synced_transactions (mantendo sua tabela atual)
          const { error: upsertError } = await supabaseClient
            .from('synced_transactions')
            .upsert({
              user_id: user.id,
              external_transaction_id: tx.id,
              amount: tx.amount,
              description: tx.description || tx.descriptionRaw || 'Sem descrição',
              date: tx.date?.split('T')[0],
              transaction_type: tx.amount < 0 ? 'expense' : 'income',
              category_suggestion: tx.category?.description || null,
              raw_data: tx,
              is_matched: false,
            }, {
              onConflict: 'external_transaction_id',
              ignoreDuplicates: true,
            });

          if (!upsertError) totalImported++;
        }
      }

      // Atualizar último sync na bank_connections
      await supabaseClient
        .from('bank_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          connection_status: 'active',
        })
        .eq('account_external_id', itemId)
        .eq('user_id', user.id);

      console.log(`Importadas ${totalImported} transações via Pluggy`);

      return new Response(
        JSON.stringify({
          success: true,
          accounts: accounts?.length || 0,
          synced_count: totalImported,
          message: 'Transações sincronizadas com sucesso',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─────────────────────────────────────────────
    // AÇÃO 3: Sync legado por connection_id (mantido para compatibilidade)
    // ─────────────────────────────────────────────
    if (connection_id) {
      console.log('Sync legado para connection_id:', connection_id);

      const { data: connection, error: connectionError } = await supabaseClient
        .from('bank_connections')
        .select('*')
        .eq('id', connection_id)
        .eq('user_id', user.id)
        .single();

      if (connectionError || !connection) {
        return new Response(
          JSON.stringify({ error: 'Conexão não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Se tiver account_external_id (Pluggy), sincronizar via API real
      if (connection.account_external_id) {
        const apiKey = await getPluggyApiKey(user.id);

        const accountsRes = await fetch(
          `${PLUGGY_API}/accounts?itemId=${connection.account_external_id}`,
          { headers: { 'X-API-KEY': apiKey } }
        );
        const { results: accounts } = await accountsRes.json();

        let totalImported = 0;

        for (const account of accounts || []) {
          const from = new Date();
          from.setDate(from.getDate() - 90);
          const fromStr = from.toISOString().split('T')[0];

          const txRes = await fetch(
            `${PLUGGY_API}/transactions?accountId=${account.id}&from=${fromStr}&pageSize=100`,
            { headers: { 'X-API-KEY': apiKey } }
          );
          const { results: transactions } = await txRes.json();

          for (const tx of transactions || []) {
            const { error } = await supabaseClient
              .from('synced_transactions')
              .upsert({
                user_id: user.id,
                bank_connection_id: connection_id,
                external_transaction_id: tx.id,
                amount: tx.amount,
                description: tx.description || tx.descriptionRaw || 'Sem descrição',
                date: tx.date?.split('T')[0],
                transaction_type: tx.amount < 0 ? 'expense' : 'income',
                category_suggestion: tx.category?.description || null,
                raw_data: tx,
                is_matched: false,
              }, {
                onConflict: 'bank_connection_id,external_transaction_id',
                ignoreDuplicates: true,
              });

            if (!error) totalImported++;
          }
        }

        await supabaseClient
          .from('bank_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            connection_status: 'active',
          })
          .eq('id', connection_id);

        return new Response(
          JSON.stringify({
            success: true,
            synced_count: totalImported,
            message: 'Transações sincronizadas com sucesso',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fallback: mock para conexões sem Pluggy configurado
      const mockTransactions = [
        {
          external_transaction_id: `tx_${Date.now()}_1`,
          amount: -45.67,
          description: 'Compra no Supermercado ABC',
          date: new Date().toISOString().split('T')[0],
          transaction_type: 'expense',
          category_suggestion: 'Alimentação',
          raw_data: { merchant: 'Supermercado ABC', category: 'grocery' },
        },
        {
          external_transaction_id: `tx_${Date.now()}_2`,
          amount: 1500.00,
          description: 'Transferência PIX Recebida',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          transaction_type: 'income',
          category_suggestion: 'Transferência',
          raw_data: { type: 'pix', sender: 'João Silva' },
        },
        {
          external_transaction_id: `tx_${Date.now()}_3`,
          amount: -89.90,
          description: 'Pagamento Cartão de Crédito',
          date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
          transaction_type: 'expense',
          category_suggestion: 'Cartão de Crédito',
          raw_data: { type: 'credit_card_payment', card_ending: '1234' },
        },
      ];

      const { data: insertedTransactions, error: insertError } = await supabaseClient
        .from('synced_transactions')
        .upsert(
          mockTransactions.map(tx => ({
            ...tx,
            user_id: user.id,
            bank_connection_id: connection_id,
            is_matched: false,
          })),
          { onConflict: 'bank_connection_id,external_transaction_id', ignoreDuplicates: true }
        )
        .select();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao inserir transações' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseClient
        .from('bank_connections')
        .update({ last_sync_at: new Date().toISOString(), connection_status: 'active' })
        .eq('id', connection_id);

      return new Response(
        JSON.stringify({
          success: true,
          synced_count: insertedTransactions?.length || 0,
          message: 'Transações sincronizadas com sucesso (modo demo)',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Parâmetros inválidos. Use action ou connection_id.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
