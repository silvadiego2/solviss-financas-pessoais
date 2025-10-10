import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  transfer_account_id: string | null;
  type: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  recurrence_frequency: string;
  recurrence_end_date: string | null;
  last_processed_at: string | null;
  notes: string | null;
  tags: string[] | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Iniciando processamento de transações recorrentes...');

    // Buscar transações recorrentes ativas
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .eq('is_active', true)
      .order('date', { ascending: true });

    if (fetchError) {
      console.error('❌ Erro ao buscar transações:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Encontradas ${recurringTransactions?.length || 0} transações recorrentes`);

    const today = new Date();
    let processedCount = 0;
    let skippedCount = 0;

    for (const transaction of (recurringTransactions as RecurringTransaction[]) || []) {
      // Verificar se já passou da data de término
      if (transaction.recurrence_end_date) {
        const endDate = new Date(transaction.recurrence_end_date);
        if (today > endDate) {
          console.log(`⏭️ Transação ${transaction.id} expirada (fim: ${transaction.recurrence_end_date})`);
          
          // Desativar transação expirada
          await supabase
            .from('transactions')
            .update({ is_active: false })
            .eq('id', transaction.id);
          
          skippedCount++;
          continue;
        }
      }

      // Calcular próxima data baseada na frequência
      const lastProcessed = transaction.last_processed_at 
        ? new Date(transaction.last_processed_at) 
        : new Date(transaction.date);
      
      const nextDate = calculateNextDate(lastProcessed, transaction.recurrence_frequency);

      // Verificar se é hora de processar
      if (nextDate <= today) {
        console.log(`✅ Processando transação ${transaction.id} - próxima data: ${nextDate.toISOString()}`);

        // Criar nova transação
        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: transaction.user_id,
            account_id: transaction.account_id,
            category_id: transaction.category_id,
            transfer_account_id: transaction.transfer_account_id,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            date: nextDate.toISOString().split('T')[0],
            status: transaction.status,
            is_recurring: false, // Nova transação não é recorrente
            notes: transaction.notes,
            tags: transaction.tags,
          });

        if (insertError) {
          console.error(`❌ Erro ao criar transação para ${transaction.id}:`, insertError);
          continue;
        }

        // Atualizar last_processed_at
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ last_processed_at: today.toISOString() })
          .eq('id', transaction.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar last_processed_at:`, updateError);
        }

        processedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`✅ Processamento concluído: ${processedCount} criadas, ${skippedCount} ignoradas`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        skipped: skippedCount,
        total: recurringTransactions?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function calculateNextDate(lastDate: Date, frequency: string): Date {
  const next = new Date(lastDate);
  
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'semiannual':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1); // Default: mensal
  }
  
  return next;
}
