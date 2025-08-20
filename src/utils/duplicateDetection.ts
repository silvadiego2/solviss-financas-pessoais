export interface DuplicateTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  account_id: string;
  category_id?: string;
}

export interface DuplicateGroup {
  id: string;
  transactions: DuplicateTransaction[];
  confidence: number;
  reason: string;
  suggestedAction: 'merge' | 'keep_all' | 'remove_duplicates';
}

export interface DuplicateDetectionSettings {
  // Configurações de detecção
  amountTolerance: number; // Percentual de tolerância no valor (0.01 = 1%)
  daysTolerance: number; // Dias de tolerância na data
  descriptionSimilarityThreshold: number; // 0-1, threshold de similaridade
  
  // Configurações de filtros
  ignoreSmallAmounts: boolean;
  smallAmountThreshold: number;
  
  // Configurações específicas
  exactMatchRequired: boolean;
  considerAccount: boolean;
  considerCategory: boolean;
}

export const DEFAULT_DUPLICATE_SETTINGS: DuplicateDetectionSettings = {
  amountTolerance: 0.02, // 2%
  daysTolerance: 7, // 7 dias
  descriptionSimilarityThreshold: 0.8,
  ignoreSmallAmounts: true,
  smallAmountThreshold: 10,
  exactMatchRequired: false,
  considerAccount: true,  
  considerCategory: false
};

export class DuplicateDetectionEngine {
  private settings: DuplicateDetectionSettings;

  constructor(settings: Partial<DuplicateDetectionSettings> = {}) {
    this.settings = { ...DEFAULT_DUPLICATE_SETTINGS, ...settings };
  }

  detectDuplicates(transactions: DuplicateTransaction[]): DuplicateGroup[] {
    const duplicateGroups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      
      if (processedIds.has(transaction.id)) continue;
      
      // Filtrar transações pequenas se configurado
      if (this.settings.ignoreSmallAmounts && 
          Math.abs(transaction.amount) < this.settings.smallAmountThreshold) {
        continue;
      }

      const duplicates = this.findDuplicatesFor(transaction, transactions.slice(i + 1));
      
      if (duplicates.length > 0) {
        const group: DuplicateGroup = {
          id: `group_${transaction.id}`,
          transactions: [transaction, ...duplicates],
          confidence: this.calculateGroupConfidence([transaction, ...duplicates]),
          reason: this.getDetectionReason([transaction, ...duplicates]),
          suggestedAction: this.getSuggestedAction([transaction, ...duplicates])
        };
        
        duplicateGroups.push(group);
        
        // Marcar todas as transações do grupo como processadas
        [transaction, ...duplicates].forEach(t => processedIds.add(t.id));
      }
    }

    return duplicateGroups.sort((a, b) => b.confidence - a.confidence);
  }

  private findDuplicatesFor(target: DuplicateTransaction, candidates: DuplicateTransaction[]): DuplicateTransaction[] {
    const duplicates: Array<{ transaction: DuplicateTransaction; score: number }> = [];

    for (const candidate of candidates) {
      const score = this.calculateDuplicateScore(target, candidate);
      
      if (score >= 0.7) { // Threshold mínimo para considerar duplicata
        duplicates.push({ transaction: candidate, score });
      }
    }

    // Retornar apenas as transações, ordenadas por score
    return duplicates
      .sort((a, b) => b.score - a.score)
      .map(d => d.transaction);
  }

  private calculateDuplicateScore(t1: DuplicateTransaction, t2: DuplicateTransaction): number {
    let score = 0;
    let maxScore = 0;

    // Score do valor (peso: 40%)
    const amountScore = this.calculateAmountSimilarity(t1.amount, t2.amount);
    score += amountScore * 0.4;
    maxScore += 0.4;

    // Score da descrição (peso: 35%)
    const descriptionScore = this.calculateDescriptionSimilarity(t1.description, t2.description);
    score += descriptionScore * 0.35;
    maxScore += 0.35;

    // Score da data (peso: 15%)
    const dateScore = this.calculateDateSimilarity(t1.date, t2.date);
    score += dateScore * 0.15;
    maxScore += 0.15;

    // Score da conta (peso: 10%, se habilitado)
    if (this.settings.considerAccount) {
      const accountScore = t1.account_id === t2.account_id ? 1 : 0;
      score += accountScore * 0.1;
      maxScore += 0.1;
    }

    // Score da categoria (peso adicional, se habilitado)
    if (this.settings.considerCategory && t1.category_id && t2.category_id) {
      const categoryScore = t1.category_id === t2.category_id ? 1 : 0;
      score += categoryScore * 0.05;
      maxScore += 0.05;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  private calculateAmountSimilarity(amount1: number, amount2: number): number {
    if (this.settings.exactMatchRequired) {
      return amount1 === amount2 ? 1 : 0;
    }

    const difference = Math.abs(amount1 - amount2);
    const avgAmount = (Math.abs(amount1) + Math.abs(amount2)) / 2;
    const tolerance = avgAmount * this.settings.amountTolerance;

    if (difference <= tolerance) {
      return 1 - (difference / tolerance);
    }

    return 0;
  }

  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    const normalized1 = this.normalizeDescription(desc1);
    const normalized2 = this.normalizeDescription(desc2);

    // Verificar correspondência exata
    if (normalized1 === normalized2) {
      return 1;
    }

    // Calcular similaridade usando algoritmo de Jaccard para palavras
    const words1 = new Set(normalized1.split(' ').filter(w => w.length > 2));
    const words2 = new Set(normalized2.split(' ').filter(w => w.length > 2));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;

    const jaccardSimilarity = intersection.size / union.size;

    // Calcular similaridade de subsequência comum mais longa
    const lcs = this.longestCommonSubsequence(normalized1, normalized2);
    const lcsRatio = (lcs * 2) / (normalized1.length + normalized2.length);

    // Combinar métricas
    return Math.max(jaccardSimilarity, lcsRatio);
  }

  private normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .replace(/\s+/g, ' ') // Normalizar espaços
      .trim();
  }

  private longestCommonSubsequence(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  private calculateDateSimilarity(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 1;
    if (diffDays <= this.settings.daysTolerance) {
      return 1 - (diffDays / this.settings.daysTolerance);
    }

    return 0;
  }

  private calculateGroupConfidence(transactions: DuplicateTransaction[]): number {
    if (transactions.length < 2) return 0;

    let totalScore = 0;
    let comparisons = 0;

    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        totalScore += this.calculateDuplicateScore(transactions[i], transactions[j]);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalScore / comparisons : 0;
  }

  private getDetectionReason(transactions: DuplicateTransaction[]): string {
    if (transactions.length < 2) return '';

    const reasons: string[] = [];
    const t1 = transactions[0];
    const t2 = transactions[1];

    // Verificar razões específicas
    if (t1.amount === t2.amount) {
      reasons.push('valor idêntico');
    } else if (this.calculateAmountSimilarity(t1.amount, t2.amount) > 0.9) {
      reasons.push('valor similar');
    }

    if (this.calculateDescriptionSimilarity(t1.description, t2.description) > 0.9) {
      reasons.push('descrição similar');
    }

    const dateDiff = Math.abs(new Date(t1.date).getTime() - new Date(t2.date).getTime()) / (1000 * 60 * 60 * 24);
    if (dateDiff <= 1) {
      reasons.push('datas próximas');
    }

    if (this.settings.considerAccount && t1.account_id === t2.account_id) {
      reasons.push('mesma conta');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'múltiplos critérios';
  }

  private getSuggestedAction(transactions: DuplicateTransaction[]): 'merge' | 'keep_all' | 'remove_duplicates' {
    const confidence = this.calculateGroupConfidence(transactions);
    
    if (confidence > 0.95) return 'remove_duplicates';
    if (confidence > 0.8) return 'merge';
    return 'keep_all';
  }

  // Método para aplicar uma ação sugerida
  static applyDuplicateAction(
    group: DuplicateGroup,
    action: 'merge' | 'keep_all' | 'remove_duplicates' | 'keep_first' | 'keep_latest'
  ): {
    toDelete: string[];
    toUpdate?: { id: string; updates: Partial<DuplicateTransaction> };
    message: string;
  } {
    const transactions = group.transactions;

    switch (action) {
      case 'remove_duplicates':
        return {
          toDelete: transactions.slice(1).map(t => t.id),
          message: `${transactions.length - 1} transações duplicadas removidas`
        };

      case 'keep_first':
        return {
          toDelete: transactions.slice(1).map(t => t.id),
          message: `Mantida a primeira transação, ${transactions.length - 1} duplicatas removidas`
        };

      case 'keep_latest':
        const sortedByDate = [...transactions].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        return {
          toDelete: sortedByDate.slice(1).map(t => t.id),
          message: `Mantida a transação mais recente, ${transactions.length - 1} duplicatas removidas`
        };

      case 'merge':
        // Manter a primeira e atualizar com informações combinadas
        const mainTransaction = transactions[0];
        const mergedNotes = transactions
          .map((t, i) => `[${i + 1}] ${t.description}`)
          .join(' | '); 

        return {
          toDelete: transactions.slice(1).map(t => t.id),
          toUpdate: {
            id: mainTransaction.id,
            updates: {
              description: `${mainTransaction.description} (merged)`,
              // Adicionar campo notes se disponível no schema
            }
          },
          message: `${transactions.length} transações mescladas em uma`
        };

      case 'keep_all':
      default:
        return {
          toDelete: [],
          message: 'Nenhuma ação executada - todas as transações mantidas'
        };
    }
  }

  updateSettings(newSettings: Partial<DuplicateDetectionSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  getSettings(): DuplicateDetectionSettings {
    return { ...this.settings };
  }
}