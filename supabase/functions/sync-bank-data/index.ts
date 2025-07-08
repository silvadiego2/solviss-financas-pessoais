
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { connection_id } = await req.json();

    if (!connection_id) {
      return new Response(
        JSON.stringify({ error: 'connection_id é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Syncing data for connection:', connection_id);

    // Get the bank connection
    const { data: connection, error: connectionError } = await supabaseClient
      .from('bank_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      console.error('Connection error:', connectionError);
      return new Response(
        JSON.stringify({ error: 'Conexão não encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mock API call - In production, this would call the actual bank API
    // For demonstration, we'll create some mock transactions
    const mockTransactions = [
      {
        external_transaction_id: `tx_${Date.now()}_1`,
        amount: -45.67,
        description: 'Compra no Supermercado ABC',
        date: new Date().toISOString().split('T')[0],
        transaction_type: 'expense',
        category_suggestion: 'Alimentação',
        raw_data: { merchant: 'Supermercado ABC', category: 'grocery' }
      },
      {
        external_transaction_id: `tx_${Date.now()}_2`,
        amount: 1500.00,
        description: 'Transferência PIX Recebida',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        transaction_type: 'income',
        category_suggestion: 'Transferência',
        raw_data: { type: 'pix', sender: 'João Silva' }
      },
      {
        external_transaction_id: `tx_${Date.now()}_3`,
        amount: -89.90,
        description: 'Pagamento Cartão de Crédito',
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago
        transaction_type: 'expense',
        category_suggestion: 'Cartão de Crédito',
        raw_data: { type: 'credit_card_payment', card_ending: '1234' }
      }
    ];

    // Insert synced transactions
    const transactionsToInsert = mockTransactions.map(tx => ({
      user_id: user.id,
      bank_connection_id: connection_id,
      external_transaction_id: tx.external_transaction_id,
      amount: tx.amount,
      description: tx.description,
      date: tx.date,
      transaction_type: tx.transaction_type,
      category_suggestion: tx.category_suggestion,
      raw_data: tx.raw_data,
      is_matched: false
    }));

    const { data: insertedTransactions, error: insertError } = await supabaseClient
      .from('synced_transactions')
      .upsert(transactionsToInsert, { 
        onConflict: 'bank_connection_id,external_transaction_id',
        ignoreDuplicates: true 
      })
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao inserir transações' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update connection last_sync_at
    const { error: updateError } = await supabaseClient
      .from('bank_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        connection_status: 'active'
      })
      .eq('id', connection_id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    console.log(`Synced ${insertedTransactions?.length || 0} transactions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_count: insertedTransactions?.length || 0,
        message: 'Transações sincronizadas com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
