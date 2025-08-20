export interface CategoryRule {
  id: string;
  keywords: string[];
  categoryId: string;
  confidence: number;
  isActive: boolean;
}

export interface CategorizationResult {
  categoryId: string | null;
  confidence: number;
  matchedKeywords: string[];
  rule?: CategoryRule;
}

// Regras padrão de categorização baseadas em palavras-chave
export const DEFAULT_CATEGORIZATION_RULES: Omit<CategoryRule, 'categoryId'>[] = [
  // Alimentação
  {
    id: 'food_general',
    keywords: ['restaurante', 'lanchonete', 'padaria', 'supermercado', 'mercado', 'açougue', 'hortifruti', 'pizza', 'hamburguer', 'comida', 'almoço', 'jantar', 'café', 'bar', 'mcdonald', 'burger king', 'subway', 'ifood', 'uber eats', 'rappi'],
    confidence: 0.9,
    isActive: true
  },
  
  // Transporte
  {
    id: 'transport_general',
    keywords: ['uber', 'taxi', 'posto', 'combustivel', 'gasolina', 'etanol', 'diesel', 'oficina', 'estacionamento', 'pedágio', 'onibus', 'metro', 'vlt', '99', 'ipva', 'seguro auto', 'revisão'],
    confidence: 0.9,
    isActive: true
  },
  
  // Moradia
  {
    id: 'housing_general', 
    keywords: ['aluguel', 'condominio', 'iptu', 'luz', 'agua', 'gas', 'internet', 'telefone', 'limpeza', 'construção', 'reforma', 'móveis', 'decoração', 'eletrodomésticos'],
    confidence: 0.9,
    isActive: true
  },
  
  // Saúde
  {
    id: 'health_general',
    keywords: ['farmacia', 'remedio', 'medico', 'dentista', 'hospital', 'clinica', 'exame', 'plano saude', 'convenio', 'psicólogo', 'fisioterapia', 'laboratorio'],
    confidence: 0.9,
    isActive: true
  },
  
  // Educação
  {
    id: 'education_general',
    keywords: ['escola', 'universidade', 'curso', 'livro', 'material escolar', 'mensalidade', 'professor', 'aula', 'faculdade', 'pos graduação'],
    confidence: 0.9,
    isActive: true
  },
  
  // Lazer
  {
    id: 'entertainment_general',
    keywords: ['cinema', 'teatro', 'show', 'netflix', 'spotify', 'amazon prime', 'youtube', 'jogos', 'viagem', 'hotel', 'turismo', 'festa', 'presente'],
    confidence: 0.8,
    isActive: true
  },
  
  // Compras
  {
    id: 'shopping_general',
    keywords: ['shopping', 'loja', 'roupa', 'sapato', 'acessorio', 'magazine luiza', 'americanas', 'casas bahia', 'amazon', 'mercado livre', 'aliexpress', 'shein'],
    confidence: 0.8,
    isActive: true
  },
  
  // Receitas - Salário
  {
    id: 'salary_income',
    keywords: ['salario', 'ordenado', 'vencimento', 'pagamento', 'empresa', 'trabalho', 'pix salario', 'folha pagamento'],
    confidence: 0.95,
    isActive: true
  },
  
  // Receitas - Freelance
  {
    id: 'freelance_income',
    keywords: ['freelance', 'freela', 'consultoria', 'projeto', 'serviço', 'trabalho extra', 'bico'],
    confidence: 0.85,
    isActive: true
  }
];

export class AutoCategorizationEngine {
  private rules: CategoryRule[] = [];
  private learningData: Map<string, { categoryId: string; count: number }> = new Map();

  constructor(categories: Array<{ id: string; name: string; transaction_type: string }>) {
    this.initializeRules(categories);
  }

  private initializeRules(categories: Array<{ id: string; name: string; transaction_type: string }>) {
    this.rules = DEFAULT_CATEGORIZATION_RULES.map(rule => {
      // Mapear regras para categorias existentes baseado no nome
      let categoryId = this.findCategoryByKeywords(categories, rule.keywords);
      
      // Fallback para categoria baseada no ID da regra
      if (!categoryId) {
        categoryId = this.findCategoryByRuleId(categories, rule.id);
      }

      return {
        ...rule,
        categoryId: categoryId || categories[0]?.id || ''
      };
    }).filter(rule => rule.categoryId !== '');
  }

  private findCategoryByKeywords(categories: Array<{ id: string; name: string; transaction_type: string }>, keywords: string[]): string | null {
    for (const category of categories) {
      const categoryNameLower = category.name.toLowerCase();
      
      // Mapear nomes de categorias para palavras-chave
      const categoryMappings: Record<string, string[]> = {
        'alimentação': ['restaurante', 'comida', 'supermercado'],
        'transporte': ['uber', 'taxi', 'combustivel'],
        'moradia': ['aluguel', 'luz', 'agua'],
        'saúde': ['farmacia', 'medico', 'hospital'],
        'educação': ['escola', 'curso', 'livro'],
        'lazer': ['cinema', 'netflix', 'viagem'],
        'compras': ['shopping', 'loja', 'roupa'],
        'salário': ['salario', 'ordenado', 'pagamento'],
        'freelance': ['freelance', 'consultoria', 'projeto']
      };

      for (const [catName, catKeywords] of Object.entries(categoryMappings)) {
        if (categoryNameLower.includes(catName) && keywords.some(k => catKeywords.includes(k))) {
          return category.id;
        }
      }
    }
    return null;
  }

  private findCategoryByRuleId(categories: Array<{ id: string; name: string; transaction_type: string }>, ruleId: string): string | null {
    const ruleTypeMappings: Record<string, string[]> = {
      'food_general': ['alimentação', 'comida'],
      'transport_general': ['transporte'],
      'housing_general': ['moradia', 'casa'],
      'health_general': ['saúde'],
      'education_general': ['educação'],
      'entertainment_general': ['lazer', 'entretenimento'],
      'shopping_general': ['compras'],
      'salary_income': ['salário', 'trabalho'],
      'freelance_income': ['freelance', 'extra']
    };

    const possibleNames = ruleTypeMappings[ruleId] || [];
    
    for (const name of possibleNames) {
      const category = categories.find(c => c.name.toLowerCase().includes(name));
      if (category) return category.id;
    }
    
    return null;
  }

  categorizeTransaction(description: string, amount: number, existingCategoryId?: string): CategorizationResult {
    const normalizedDescription = this.normalizeText(description);
    
    let bestMatch: CategorizationResult = {
      categoryId: null,
      confidence: 0,
      matchedKeywords: []
    };

    // Verificar regras de categorização
    for (const rule of this.rules.filter(r => r.isActive)) {
      const matchedKeywords = rule.keywords.filter(keyword => 
        normalizedDescription.includes(this.normalizeText(keyword))
      );

      if (matchedKeywords.length > 0) {
        const confidence = this.calculateConfidence(rule, matchedKeywords, normalizedDescription);
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            categoryId: rule.categoryId,
            confidence,
            matchedKeywords,
            rule
          };
        }
      }
    }

    // Usar dados de aprendizado se não houver regra forte
    if (bestMatch.confidence < 0.7) {
      const learningResult = this.getLearningBasedSuggestion(normalizedDescription);
      if (learningResult && learningResult.confidence > bestMatch.confidence) {
        bestMatch = learningResult;
      }
    }

    // Registrar para aprendizado se categoria já foi definida
    if (existingCategoryId) {
      this.learnFromTransaction(normalizedDescription, existingCategoryId);
    }

    return bestMatch;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .trim();
  }

  private calculateConfidence(rule: CategoryRule, matchedKeywords: string[], description: string): number {
    let confidence = rule.confidence;
    
    // Bonus por múltiplas palavras-chave
    if (matchedKeywords.length > 1) {
      confidence += 0.1 * (matchedKeywords.length - 1);
    }

    // Bonus por correspondência exata
    const exactMatches = matchedKeywords.filter(keyword => 
      description === this.normalizeText(keyword)
    );
    if (exactMatches.length > 0) {
      confidence += 0.1;
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
      
      if (similarity > 0.6) {
        matches.push({
          categoryId: data.categoryId,
          count: data.count,
          similarity
        });
      }
    }

    if (matches.length === 0) return null;

    // Ordenar por similaridade e frequência
    matches.sort((a, b) => (b.similarity * b.count) - (a.similarity * a.count));
    
    const best = matches[0];
    return {
      categoryId: best.categoryId,
      confidence: best.similarity * 0.8, // Reduzir confiança para aprendizado
      matchedKeywords: [`similarity: ${best.similarity.toFixed(2)}`]
    };
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    
    return commonWords.length / totalWords;
  }

  // Métodos para gerenciar regras personalizadas
  addCustomRule(rule: Omit<CategoryRule, 'id'>): CategoryRule {
    const newRule: CategoryRule = {
      ...rule,
      id: `custom_${Date.now()}`
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
      learningEntries: this.learningData.size
    };
  }
}