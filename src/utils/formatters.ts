/**
 * Utilitários de formatação centralizados.
 * Importe daqui em vez de redefinir em cada componente.
 */

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const raw = String(dateStr).slice(0, 10);
  const [year, month, day] = raw.split('-');
  if (!year || !month || !day) return raw;
  return `${day}/${month}/${year}`;
};

export const formatPercent = (value: number, decimals = 1): string =>
  `${value.toFixed(decimals)}%`;

export const formatCompact = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
