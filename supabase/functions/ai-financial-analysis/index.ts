import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Motor de análise local ────────────────────────────────────────────────
function localAnalysis(summary: Record<string, any>) {
  const {
    income_month,
    expense_month,
    net_month,
    total_balance,
    credit_usage_pct,
    goals_count,
    goals_completed,
    recurring_transactions,
    transactions_count_month,
    accounts_count,
  } = summary;

  // ── Score por critérios ponderados (total 100) ──
  let score = 0;
  const reasons: string[] = [];

  // 1. Fluxo de caixa (30 pts)
  if (income_month > 0) {
    const savingsRate = net_month / income_month;
    if (savingsRate >= 0.2) { score += 30; reasons.push('boa taxa de poupança'); }
    else if (savingsRate >= 0.05) { score += 18; reasons.push('fluxo positivo mas apertado'); }
    else if (savingsRate >= 0) { score += 8; reasons.push('fluxo quase equilibrado'); }
    else { score += 0; reasons.push('gastos acima da receita'); }
  } else {
    score += 5;
    reasons.push('sem receitas registradas este mês');
  }

  // 2. Saldo total positivo (20 pts)
  if (total_balance > 0) {
    const coverMonths = income_month > 0 ? total_balance / expense_month : 0;
    if (coverMonths >= 3) { score += 20; reasons.push('reserva para 3+ meses'); }
    else if (coverMonths >= 1) { score += 13; }
    else { score += 6; }
  } else {
    reasons.push('saldo total negativo');
  }

  // 3. Uso de crédito (20 pts)
  if (credit_usage_pct === 0) {
    score += 20; // sem cartão ou sem uso
  } else if (credit_usage_pct <= 30) { score += 20; reasons.push('uso saudável do crédito'); }
  else if (credit_usage_pct <= 60) { score += 12; reasons.push('uso moderado do crédito'); }
  else if (credit_usage_pct <= 80) { score += 5; reasons.push('limite de crédito elevado'); }
  else { score += 0; reasons.push('limite de crédito crítico'); }

  // 4. Metas financeiras (15 pts)
  if (goals_count === 0) { score += 5; reasons.push('sem metas cadastradas'); }
  else {
    const goalRate = goals_completed / goals_count;
    score += Math.round(goalRate * 15);
    if (goalRate >= 0.5) reasons.push('bom progresso nas metas');
  }

  // 5. Transações recorrentes (10 pts — controle financeiro)
  if (recurring_transactions >= 3) { score += 10; reasons.push('boa organização de recorrências'); }
  else if (recurring_transactions >= 1) { score += 6; }
  else { score += 2; reasons.push('poucas recorrências organizadas'); }

  // 6. Diversificação de contas (5 pts)
  if (accounts_count >= 2) { score += 5; }

  score = Math.min(100, Math.max(0, score));

  // ── Razão principal ──
  const scoreReason =
    score >= 75 ? `Finanças saudáveis — ${reasons.slice(0, 2).join(' e ')}.` :
    score >= 50 ? `Situação razoável — ${reasons.slice(0, 2).join(' e ')}.` :
    score >= 30 ? `Atenção necessária — ${reasons.slice(0, 2).join(' e ')}.` :
                  `Situação crítica — ${reasons.slice(0, 2).join(' e ')}.`;

  // ── Recomendações (sempre 3) ──
  type Priority = 'alta' | 'media' | 'baixa';
  const recs: { title: string; description: string; priority: Priority; icon: string }[] = [];

  if (credit_usage_pct > 60) {
    recs.push({
      title: 'Reduza o uso do cartão',
      description: `Você usou ${credit_usage_pct.toFixed(0)}% do limite disponível. Tente manter abaixo de 30% para proteger seu score de crédito.`,
      priority: credit_usage_pct > 80 ? 'alta' : 'media',
      icon: 'credit-card',
    });
  }

  if (net_month < 0) {
    recs.push({
      title: 'Controle seus gastos',
      description: `Suas despesas (R$ ${expense_month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) superaram sua receita este mês. Revise os maiores gastos.`,
      priority: 'alta',
      icon: 'alert-triangle',
    });
  } else if (income_month > 0 && net_month / income_month < 0.1) {
    recs.push({
      title: 'Aumente sua taxa de poupança',
      description: 'Você está poupando menos de 10% da renda. Pequenos ajustes nos gastos variáveis podem fazer grande diferença.',
      priority: 'media',
      icon: 'piggy-bank',
    });
  }

  if (goals_count === 0) {
    recs.push({
      title: 'Defina metas financeiras',
      description: 'Cadastrar objetivos (reserva de emergência, viagem, etc.) aumenta o foco e a disciplina financeira.',
      priority: 'media',
      icon: 'target',
    });
  } else if (goals_completed < goals_count) {
    recs.push({
      title: 'Acelere suas metas',
      description: `Você tem ${goals_count - goals_completed} meta(s) em andamento. Tente destinar parte do saldo positivo mensal para elas.`,
      priority: 'baixa',
      icon: 'target',
    });
  }

  if (total_balance <= 0) {
    recs.push({
      title: 'Construa uma reserva de emergência',
      description: 'Seu saldo total está negativo ou zerado. Priorize criar uma reserva mínima de 3 meses de despesas.',
      priority: 'alta',
      icon: 'wallet',
    });
  } else if (income_month > 0 && total_balance < expense_month) {
    recs.push({
      title: 'Amplie sua reserva',
      description: 'Seu saldo atual cobre menos de 1 mês de despesas. O ideal é ter 3 a 6 meses guardados.',
      priority: 'media',
      icon: 'wallet',
    });
  }

  if (recurring_transactions === 0) {
    recs.push({
      title: 'Organize seus pagamentos fixos',
      description: 'Cadastre suas despesas recorrentes (aluguel, assinaturas, etc.) para ter visibilidade total do orçamento.',
      priority: 'baixa',
      icon: 'trending-up',
    });
  }

  if (transactions_count_month < 3) {
    recs.push({
      title: 'Registre mais movimentações',
      description: 'Você tem poucas transações este mês. Quanto mais completo o registro, mais precisa é a análise.',
      priority: 'baixa',
      icon: 'trending-up',
    });
  }

  // Garante exatamente 3 recomendações
  const defaults: typeof recs = [
    { title: 'Mantenha o controle', description: 'Continue registrando suas transações regularmente para um panorama financeiro preciso.', priority: 'baixa', icon: 'trending-up' },
    { title: 'Diversifique investimentos', description: 'Com o fluxo positivo, considere começar a investir parte do saldo em renda fixa ou fundos.', priority: 'baixa', icon: 'piggy-bank' },
    { title: 'Revise assinaturas', description: 'Faça um levantamento mensal das assinaturas ativas para eliminar as que não usa.', priority: 'baixa', icon: 'credit-card' },
  ];
  let i = 0;
  while (recs.length < 3) { recs.push(defaults[i++ % defaults.length]); }
  const finalRecs = recs.slice(0, 3);

  // ── Alerta de risco ──
  let riskAlert: { title: string; message: string; severity: 'high' | 'medium' } | null = null;
  if (credit_usage_pct > 80) {
    riskAlert = {
      title: 'Limite de crédito crítico',
      message: `Você utilizou ${credit_usage_pct.toFixed(0)}% do seu limite total de cartão. Isso pode impactar seu score e dificultar emergências.`,
      severity: 'high',
    };
  } else if (net_month < 0 && Math.abs(net_month) > income_month * 0.2) {
    riskAlert = {
      title: 'Gastos acima da receita',
      message: `Suas despesas superaram a receita em R$ ${Math.abs(net_month).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} este mês.`,
      severity: 'high',
    };
  } else if (credit_usage_pct > 60 || (net_month < 0)) {
    riskAlert = {
      title: 'Atenção ao equilíbrio financeiro',
      message: 'Alguns indicadores merecem atenção. Revise as recomendações abaixo para melhorar sua saúde financeira.',
      severity: 'medium',
    };
  }

  return { score, score_reason: scoreReason, recommendations: finalRecs, risk_alert: riskAlert };
}

// ─── Fallback OpenAI ───────────────────────────────────────────────────────
async function openAIAnalysis(summary: Record<string, any>, apiKey: string) {
  const systemPrompt = `Você é um analista financeiro pessoal. Analise os dados do usuário (em BRL) e retorne SOMENTE JSON válido com este shape exato:
{
  "score": number (0-100),
  "score_reason": string (uma frase curta),
  "recommendations": [
    { "title": string, "description": string, "priority": "alta"|"media"|"baixa", "icon": "trending-up"|"piggy-bank"|"credit-card"|"target"|"alert-triangle"|"wallet" }
  ] (exatamente 3),
  "risk_alert": { "title": string, "message": string, "severity": "high"|"medium" } | null
}
Seja direto e prático em português brasileiro.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Dados financeiros do mês atual:\n${JSON.stringify(summary, null, 2)}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('OpenAI error:', res.status, err);
    return null; // sinaliza para usar análise local
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ─── Handler principal ─────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Bug #1 fix: usar getUser() — API correta do Supabase v2
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    // ── Busca dados financeiros do usuário ──
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
    const recurring = transactions.filter((t: any) => t.is_recurring === true).length;

    const creditCards = accounts.filter((a: any) => a.type === 'credit_card');
    const totalLimit = creditCards.reduce((s: number, a: any) => s + Number(a.credit_limit || 0), 0);
    const totalAvailable = creditCards.reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
    const usedLimit = totalLimit - totalAvailable;
    const limitUsagePct = totalLimit > 0 ? (usedLimit / totalLimit) * 100 : 0;

    const totalBalance = accounts
      .filter((a: any) => a.type !== 'credit_card')
      .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

    const summary = {
      income_month: income,
      expense_month: expense,
      net_month: income - expense,
      total_balance: totalBalance,
      credit_total_limit: totalLimit,
      credit_used: usedLimit,
      credit_usage_pct: Number(limitUsagePct.toFixed(1)),
      goals_count: goals.length,
      goals_completed: goals.filter((g: any) => g.is_completed).length,
      recurring_transactions: recurring,
      transactions_count_month: transactions.length,
      accounts_count: accounts.filter((a: any) => a.type !== 'credit_card').length,
    };

    // ── Tenta OpenAI se OPENAI_API_KEY estiver configurada, senão usa local ──
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    let analysis = null;
    let source = 'local';

    if (OPENAI_API_KEY) {
      try {
        analysis = await openAIAnalysis(summary, OPENAI_API_KEY);
        if (analysis) source = 'openai';
      } catch (e) {
        console.warn('OpenAI falhou, usando análise local:', e);
      }
    }

    // Fallback garantido: análise local
    if (!analysis) {
      analysis = localAnalysis(summary);
      source = 'local';
    }

    console.log(`Análise gerada via: ${source}`);

    return new Response(JSON.stringify({ analysis, summary, source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('Erro inesperado:', e);
    return new Response(JSON.stringify({ error: (e as Error).message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
