/**
 * Auto-categorization heuristics: map keywords found in a transaction description
 * to a category name (matched case-insensitively against the user's categories).
 */
const KEYWORD_TO_CATEGORY: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['ifood', 'i food', 'rappi', 'zé delivery', 'ze delivery'], category: 'Delivery' },
  { keywords: ['uber', '99 ', '99app', 'cabify', 'táxi', 'taxi'], category: 'Transporte' },
  { keywords: ['posto', 'gasolina', 'combustivel', 'combustível', 'shell', 'ipiranga', 'petrobras'], category: 'Combustível' },
  { keywords: ['netflix', 'spotify', 'prime video', 'disney', 'hbo', 'youtube premium', 'globoplay'], category: 'Assinaturas' },
  { keywords: ['mercado', 'supermerc', 'carrefour', 'pão de açúcar', 'pao de acucar', 'extra ', 'assai', 'atacadao'], category: 'Supermercado' },
  { keywords: ['farmacia', 'farmácia', 'drogaria', 'droga raia', 'pacheco', 'panvel'], category: 'Saúde' },
  { keywords: ['restaurante', 'lanche', 'lanchonete', 'pizzaria', 'mcdonald', 'burger', 'subway'], category: 'Alimentação' },
  { keywords: ['salario', 'salário', 'pagamento', 'folha'], category: 'Salário' },
  { keywords: ['aluguel', 'condominio', 'condomínio'], category: 'Moradia' },
  { keywords: ['energia', 'luz ', 'enel', 'cemig', 'cpfl', 'light'], category: 'Energia' },
  { keywords: ['agua', 'água', 'sabesp', 'sanepar'], category: 'Água' },
  { keywords: ['internet', 'vivo', 'claro', 'tim ', 'oi fibra', 'net '], category: 'Internet' },
  { keywords: ['amazon', 'mercado livre', 'shopee', 'aliexpress', 'shein'], category: 'Compras' },
  { keywords: ['academia', 'gym', 'smartfit', 'bio ritmo'], category: 'Academia' },
];

/**
 * Given a description and a list of categories, return the matching category id
 * (preferring a sub-category) or null if no heuristic matches.
 */
export function suggestCategoryId(
  description: string,
  categories: Array<{ id: string; name: string; transaction_type: string; parent_id?: string }>,
  transactionType: 'income' | 'expense',
): string | null {
  if (!description) return null;
  const desc = description.toLowerCase();
  for (const rule of KEYWORD_TO_CATEGORY) {
    if (rule.keywords.some(k => desc.includes(k))) {
      const match = categories.find(
        c =>
          c.transaction_type === transactionType &&
          c.name.toLowerCase() === rule.category.toLowerCase(),
      );
      if (match) return match.id;
      // Fuzzy fallback: contains
      const fuzzy = categories.find(
        c =>
          c.transaction_type === transactionType &&
          c.name.toLowerCase().includes(rule.category.toLowerCase()),
      );
      if (fuzzy) return fuzzy.id;
    }
  }
  return null;
}
