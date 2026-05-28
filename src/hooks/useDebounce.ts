import { useState, useEffect } from 'react';

/**
 * Retorna o valor atrasado por `delay` ms.
 * Usado para não disparar queries a cada tecla no campo de busca.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
