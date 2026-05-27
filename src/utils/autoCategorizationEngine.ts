export interface CategoryRule {
  id: string;
  keywords: string[];
  categoryId: string;
  confidence: number;
  isActive: boolean;
  transactionType?: 'income' | 'expense';
}

export interface CategorizationResult {
  categoryId: string | null;
  confidence: number;
  matchedKeywords: string[];
  rule?: CategoryRule;
}

type CategoryRef = {
  id: string;
  name: string;
  transaction_type: string;
};

const CATEGORY_NAME_ALIASES: Record<string, string[]> = {
  alimentacao: ['alimentacao', 'alimentação', 'comida'],
  supermercado: ['supermercado', 'mercado', 'grocery', 'compras mercado'],
  restaurantes: ['restaurante', 'refeicao', 'refeição', 'alimentacao fora', 'alimentação fora'],
  delivery: ['delivery', 'ifood', 'rappi', 'uber eats'],
  transporte: ['transporte', 'mobilidade'],
  combustivel: ['combustivel', 'combustível', 'gasolina', 'etanol', 'diesel'],
  moradia: ['moradia', 'casa', 'lar', 'aluguel'],
  contas: ['contas', 'utilidades', 'servicos', 'serviços'],
  saude: ['saude', 'saúde', 'medico', 'médico', 'farmacia', 'farmácia'],
  educacao: ['educacao', 'educação', 'curso', 'escola'],
  lazer: ['lazer', 'entretenimento', 'diversao', 'diversão'],
  compras: ['compras', 'shopping', 'varejo', 'retail'],
  assinaturas: ['assinaturas', 'streaming', 'digital'],
  taxas: ['taxas', 'tarifas', 'encargos', 'juros'],
  cartao: ['cartao', 'cartão', 'fatura cartao', 'fatura cartão'],
  transferencias: ['transferencias', 'transferências', 'pix', 'ted', 'doc'],
  investimentos: ['investimentos', 'aplicacoes', 'aplicações', 'corretora'],
  salario: ['salario', 'salário', 'ordenado', 'holerite'],
  freelance: ['freelance', 'freela', 'consultoria'],
  reembolso: ['reembolso', 'estorno'],
  vendas: ['venda', 'vendas'],
  rendimentos: ['rendimentos', 'juros', 'dividendos'],
};

export const DEFAULT_CATEGORIZATION_RULES: Omit<CategoryRule, 'categoryId'>[] = [
  {
    id: 'groceries_expense',
    keywords: [
      'supermercado', 'mercado', 'atacadao', 'atacadão', 'assai', 'assaí', 'carrefour', 'extra',
      'pao de acucar', 'pão de açúcar', 'bompreco', 'hortifruti', 'sams club', 'sam s club'
    ],
    confidence: 0.95,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'restaurant_expense',
    keywords: [
      'restaurante', 'lanchonete', 'padaria', 'pizzaria', 'hamburgueria', 'hamburguer',
      'pizza', 'almoco', 'almoço', 'jantar', 'cafe', 'café', 'bar', 'churrascaria',
      'mcdonald', 'burger king', 'subway', 'bob s', 'habibs'
    ],
    confidence: 0.92,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'delivery_expense',
    keywords: ['ifood', 'rappi', 'uber eats', 'delivery'],
    confidence: 0.96,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'transport_expense',
    keywords: ['uber', '99', 'taxi', 'ônibus', 'onibus', 'metro', 'metrô', 'vlt', 'passagem', 'pedagio', 'pedágio', 'estacionamento'],
    confidence: 0.93,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'fuel_expense',
    keywords: ['posto', 'combustivel', 'combustível', 'gasolina', 'etanol', 'diesel', 'shell', 'ipiranga', 'petrobras', 'ale'],
    confidence: 0.95,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'housing_expense',
    keywords: ['aluguel', 'condominio', 'condomínio', 'iptu', 'reforma', 'mudanca', 'mudança', 'imobiliaria', 'imobiliária'],
    confidence: 0.92,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'utilities_expense',
    keywords: ['luz', 'energia', 'agua', 'água', 'gas', 'gás', 'internet', 'telefone', 'celular', 'vivo', 'tim', 'claro', 'oi', 'enel', 'embasa', 'coelba'],
    confidence: 0.94,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'health_expense',
    keywords: ['farmacia', 'farmácia', 'remedio', 'remédio', 'medico', 'médico', 'dentista', 'hospital', 'clinica', 'clínica', 'exame', 'laboratorio', 'laboratório', 'plano de saude', 'plano de saúde'],
    confidence: 0.94,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'education_expense',
    keywords: ['escola', 'universidade', 'faculdade', 'curso', 'livro', 'material escolar', 'mensalidade', 'professor', 'aula', 'pos graduacao', 'pós graduação'],
    confidence: 0.9,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'entertainment_expense',
    keywords: ['cinema', 'teatro', 'show', 'viagem', 'hotel', 'turismo', 'festa', 'ingresso'],
    confidence: 0.88,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'subscription_expense',
    keywords: ['netflix', 'spotify', 'amazon prime', 'prime video', 'youtube premium', 'disney', 'hbo', 'apple', 'icloud', 'google one', 'chatgpt', 'notion'],
    confidence: 0.95,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'shopping_expense',
    keywords: ['shopping', 'loja', 'roupa', 'sapato', 'acessorio', 'acessório', 'amazon', 'mercado livre', 'aliexpress', 'shein', 'magazine luiza', 'americanas', 'casas bahia'],
    confidence: 0.86,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'fees_expense',
    keywords: ['tarifa', 'taxa', 'juros', 'iof', 'anuidade', 'encargo', 'multa'],
    confidence: 0.95,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'credit_card_payment_expense',
    keywords: ['fatura cartao', 'fatura cartão', 'pagamento cartao', 'pagamento cartão'],
    confidence: 0.96,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'transfer_expense',
    keywords: ['pix enviado', 'transferencia enviada', 'transferência enviada', 'ted enviada', 'doc enviado'],
    confidence: 0.92,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'investment_expense',
    keywords: ['aplicacao', 'aplicação', 'investimento', 'tesouro', 'cdb', 'corretora', 'rico', 'xp', 'nu invest', 'itau corretora'],
    confidence: 0.9,
    isActive: true,
    transactionType: 'expense',
  },
  {
    id: 'salary_income',
    keywords: ['salario', 'salário', 'ordenado', 'vencimento', 'folha pagamento', 'folha de pagamento', 'proventos'],
    confidence: 0.98,
    isActive: true,
    transactionType: 'income',
  },
  {
    id: 'freelance_income',
    keywords: ['freelance', 'freela', 'consultoria', 'projeto', 'servico prestado', 'serviço prestado', 'bico'],
    confidence: 0.9,
    isActive: true,
    transactionType: 'income',
  },
  {
    id: 'refund_income',
    keywords: ['reembolso', 'estorno', 'cashback'],
    confidence: 0.96,
    isActive: true,
    transactionType: 'income',
  },
  {
    id: 'sale_income',
    keywords: ['venda', 'vendas', 'mercado pago recebimento', 'pix recebido venda'],
    confidence: 0.88,
    isActive: true,
    transactionType: 'income',
  },
  {
    id: 'investment_income',
    keywords: ['rendimento', 'dividendo', 'juros sobre capital', 'juros', 'resgate investimento'],
    confidence: 0.9,
    isActive: true,
    transactionType: 'income',
  },
  {
    id: 'transfer_income',
    keywords: ['pix recebido', 'transferencia recebida', 'transferência recebida', 'ted recebida', 'doc recebido'],
    confidence: 0.9,
    isActive: true,
    transactionType: 'income',
  }
];

export class AutoCategorizationEngine {
  private rules: CategoryRule[] = [];
  private learningData: Map<string, { categoryId: string; count: number }> = new Map();

  constructor(categories: CategoryRef[]) {
    this.initializeRules(categories);
  }

  private initializeRules(categories: CategoryRef[]) {
    this.rules = DEFAULT_CATEGORIZATION_RULES
      .map(rule => {
        const categoryId =
          this.findCategoryByRuleId(categories, rule.id, rule.transactionType) ||
          this.findCategoryByKeywords(categories, rule.keywords, rule.transactionType);

        if (!categoryId) return null;

        return {
          ...rule,
          categoryId,
        };
      })
      .filter((rule): rule is CategoryRule => rule !== null);
  }

  private findCategoryByKeywords(
    categories: CategoryRef[],
    keywords: string[],
    transactionType?: 'income' | 'expense'
  ): string | null {
    const filtered = transactionType
      ? categories.filter(c => c.transaction_type === transactionType)
      : categories;

    for (const category of filtered) {
      const categoryNameLower = this.normalizeText(category.name);

      for (const aliases of Object.values(CATEGORY_NAME_ALIASES)) {
        const matchedAlias = aliases.some(alias => categoryNameLower.includes(this.normalizeText(alias)));
        const matchedKeyword = keywords.some(keyword =>
          aliases.some(alias => this.normalizeText(keyword).includes(this.normalizeText(alias)))
        );

        if (matchedAlias && matchedKeyword) {
          return category.id;
        }
      }
    }

    return null;
  }

  private findCategoryByRuleId(
    categories: CategoryRef[],
    ruleId: string,
    transactionType?: 'income' | 'expense'
  ): string | null {
    const ruleTypeMappings: Record<string, string[]> = {
      groceries_expense: ['supermercado', 'alimentacao'],
      restaurant_expense: ['restaurantes', 'alimentacao'],
      delivery_expense: ['delivery', 'alimentacao'],
      transport_expense: ['transporte'],
      fuel_expense: ['combustivel', 'transporte'],
      housing_expense: ['moradia'],
      utilities_expense: ['contas'],
      health_expense: ['saude'],
      education_expense: ['educacao'],
      entertainment_expense: ['lazer'],
      subscription_expense: ['assinaturas'],
      shopping_expense: ['compras'],
      fees_expense: ['taxas'],
      credit_card_payment_expense: ['cartao'],
      transfer_expense: ['transferencias'],
      investment_expense: ['investimentos'],
      salary_income: ['salario'],
      freelance_income: ['freelance'],
      refund_income: ['reembolso'],
      sale_income: ['vendas'],
      investment_income: ['rendimentos', 'investimentos'],
      transfer_income: ['transferencias'],
    };

    const possibleNames = ruleTypeMappings[ruleId] || [];
    const filtered = transactionType
      ? categories.filter(c => c.transaction_type === transactionType)
      : categories;

    for (const name of possibleNames) {
      const normalizedName = this.normalizeText(name);
      const category = filtered.find(c => {
        const categoryName = this.normalizeText(c.name);
        return (
          categoryName.includes(normalizedName) ||
          (CATEGORY_NAME_ALIASES[normalizedName] || []).some(alias =>
            categoryName.includes(this.normalizeText(alias))
          )
        );
      });

      if (category) return category.id;
    }

    return null;
  }

  categorizeTransaction(
    description: string,
    amount: number,
    transactionType?: 'income' | 'expense',
    existingCategoryId?: string
  ): CategorizationResult {
    const normalizedDescription = this.normalizeText(description);

    let bestMatch: CategorizationResult = {
      categoryId: null,
      confidence: 0,
      matchedKeywords: [],
    };

    for (const rule of this.rules.filter(r => r.isActive)) {
      if (transactionType && rule.transactionType && rule.transactionType !== transactionType) {
        continue;
      }

      const matchedKeywords = rule.keywords.filter(keyword =>
        normalizedDescription.includes(this.normalizeText(keyword))
      );

      if (matchedKeywords.length > 0) {
        const confidence = this.calculateConfidence(rule, matchedKeywords, normalizedDescription, amount);

        if (confidence > bestMatch.confidence) {
          bestMatch = {
            categoryId: rule.categoryId,
            confidence,
            matchedKeywords,
            rule,
          };
        }
      }
    }

    if (bestMatch.confidence < 0.72) {
      const learningResult = this.getLearningBasedSuggestion(normalizedDescription);
      if (learningResult && learningResult.confidence > bestMatch.confidence) {
        bestMatch = learningResult;
      }
    }

    if (existingCategoryId) {
      this.learnFromTransaction(normalizedDescription, existingCategoryId);
    }

    return bestMatch;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateConfidence(
    rule: CategoryRule,
    matchedKeywords: string[],
    description: string,
    amount: number
  ): number {
    let confidence = rule.confidence;

    if (matchedKeywords.length > 1) {
      confidence += Math.min(0.12, 0.04 * (matchedKeywords.length - 1));
    }

    const exactMatches = matchedKeywords.filter(keyword =>
      description === this.normalizeText(keyword)
    );

    if (exactMatches.length > 0) {
      confidence += 0.08;
    }

    if (rule.id.includes('salary') && amount > 0) {
      confidence += 0.02;
    }

    if (rule.id.includes('fees') && amount < 0) {
      confidence += 0.02;
    }

    return Math.min(confidence, 1);
  }

  private learnFromTransaction(description: string, categoryId: string) {
    const key = `${description}:${categoryId}`;
    const existing = this.learningData.get(key) || { categoryId, count: 0 };
    this.learningData.set(key, { ...existing, count: existing.count + 1 });
  }

  private getLearningBasedSuggestion(description: string): CategorizationResult | null {
    const matches: Array<{ categoryId: string; count: number; similarity: number }> = [];

    for (const [key, data] of this.learningData.entries()) {
      const [learnedDesc] = key.split(':');
      const similarity = this.calculateSimilarity(description, learnedDesc);

      if (similarity > 0.65) {
        matches.push({
          categoryId: data.categoryId,
          count: data.count,
          similarity,
        });
      }
    }

    if (matches.length === 0) return null;

    matches.sort((a, b) => (b.similarity * b.count) - (a.similarity * a.count));

    const best = matches[0];
    return {
      categoryId: best.categoryId,
      confidence: Math.min(best.similarity * 0.78, 0.89),
      matchedKeywords: [`similarity:${best.similarity.toFixed(2)}`],
    };
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(' ').filter(Boolean);
    const words2 = text2.split(' ').filter(Boolean);

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length) || 1;

    return commonWords.length / totalWords;
  }

  addCustomRule(rule: Omit<CategoryRule, 'id'>): CategoryRule {
    const newRule: CategoryRule = {
      ...rule,
      id: `custom_${Date.now()}`,
    };

    this.rules.push(newRule);
    return newRule;
  }

  updateRule(ruleId: string, updates: Partial<CategoryRule>): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;

    this.rules[index] = { ...this.rules[index], ...updates };
    return true;
  }

  deleteRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;

    this.rules.splice(index, 1);
    return true;
  }

  getRules(): CategoryRule[] {
    return [...this.rules];
  }

  getCategorizationStats(): {
    totalRules: number;
    activeRules: number;
    learningEntries: number;
  } {
    return {
      totalRules: this.rules.length,
      activeRules: this.rules.filter(r => r.isActive).length,
      learningEntries: this.learningData.size,
    };
  }
}
