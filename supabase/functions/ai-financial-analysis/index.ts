import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    // Fetch user's financial data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    const [accountsRes, txRes, goalsRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', userId).eq('is_active', true),
      supabase.from('transactions').select('*').eq('user_id', userId).gte('date', startOfMonth),
      supabase.from('goals').select('*').eq('user_id', userId),
    ]);

    const accounts = accountsRes.data || [];
    const transactions = txRes.data || [];
    const goals = goalsRes.data || [];

    const income = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expense = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const recurring = transactions.filter((t: any) => t.is_recurring).length;

    const creditCards = accounts.filter((a: any) => a.type === 'credit_card');
    const totalLimit = creditCards.reduce((s: number, a: any) => s + Number(a.credit_limit || 0), 0);
    const totalAvailable = creditCards.reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
    const usedLimit = totalLimit - totalAvailable;
    const limitUsagePct = totalLimit > 0 ? (usedLimit / totalLimit) * 100 : 0;

    const totalBalance = accounts
      .filter((a: any) => a.type !== 'credit_card')
      .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

    const openInvoices = creditCards.map((c: any) => ({
      card: c.name,
      used: Number(c.credit_limit || 0) - Number(c.balance || 0),
      limit: Number(c.credit_limit || 0),
      due_day: c.due_day,
    }));

    const summary = {
      income_month: income,
      expense_month: expense,
      net_month: income - expense,
      total_balance: totalBalance,
      credit_total_limit: totalLimit,
      credit_used: usedLimit,
      credit_usage_pct: Number(limitUsagePct.toFixed(1)),
      open_invoices: openInvoices,
      goals_count: goals.length,
      goals_completed: goals.filter((g: any) => g.is_completed).length,
      recurring_transactions: recurring,
      transactions_count_month: transactions.length,
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você é um analista financeiro pessoal. Analise os dados do usuário (em BRL) e retorne SOMENTE JSON válido com este shape exato:
{
  "score": number (0-100),
  "score_reason": string (uma frase curta),
  "recommendations": [
    { "title": string, "description": string, "priority": "alta"|"media"|"baixa", "icon": "trending-up"|"piggy-bank"|"credit-card"|"target"|"alert-triangle"|"wallet" }
  ] (exatamente 3),
  "risk_alert": { "title": string, "message": string, "severity": "high"|"medium" } | null
}
Critérios de score: saúde do fluxo (receita vs despesa), uso de limite de cartão (>70% reduz muito), saldo positivo, progresso de metas. Seja direto e prático em português.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Dados financeiros do mês atual:\n${JSON.stringify(summary, null, 2)}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns minutos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos no workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Falha na análise de IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = { score: 50, score_reason: 'Análise indisponível', recommendations: [], risk_alert: null };
    }

    return new Response(JSON.stringify({ analysis, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
