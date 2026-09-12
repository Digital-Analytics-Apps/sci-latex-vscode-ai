import { useEffect, useState } from "react";

/**
 * Hook para atrasar (debounce) a atualização de um valor até que o usuário
 * pare de digitar por uma determinada quantidade de milissegundos (default: 300ms).
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
