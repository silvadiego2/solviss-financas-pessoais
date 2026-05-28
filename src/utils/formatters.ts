/**
 * Utilitários de formatação centralizados.
 * Use estas funções em vez de definir formatCurrency localmente em cada componente.
 */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PCT = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const NUM = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** R$ 1.234,56 */
export const formatCurrency = (value: number): string => BRL.format(value);

/** 12,5% */
export const formatPercent = (value: number): string => PCT.format(value / 100);

/** 1.234,56 (sem símbolo) */
export const formatNumber = (value: number): string => NUM.format(value);

/** Retorna '+R$ 1.234,56' ou '-R$ 1.234,56' com cor sugerida */
export const formatCurrencySigned = (value: number): { text: string; positive: boolean } => ({
  text: (value >= 0 ? '+' : '') + BRL.format(value),
  positive: value >= 0,
});

/** Abrevia valores grandes: 1.2k, 3.4M */
export const formatCurrencyCompact = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return BRL.format(value);
};
