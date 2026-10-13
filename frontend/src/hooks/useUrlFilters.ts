import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  buildCleanApiParams,
  parseUrlParams,
  serializeToSearchParams,
} from "../utils/urlParamsUtils";

export function useUrlFilters<T extends Record<string, any>>(defaultValues: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Garante referência estável para defaultValues baseada na serialização JSON
  const defaultValuesSerialized = JSON.stringify(defaultValues);
  const stableDefaultValues: T = useMemo(
    () => JSON.parse(defaultValuesSerialized),
    [defaultValuesSerialized],
  );

  // Parse do estado atual a partir dos parâmetros de busca da URL
  const filters: T = useMemo(() => {
    return parseUrlParams(searchParams, stableDefaultValues);
  }, [searchParams, stableDefaultValues]);

  // Limpeza cirúrgica de parâmetros para chamadas de API (React Query / Axios) com referência estável
  const apiParams = useMemo(() => {
    return buildCleanApiParams(filters, stableDefaultValues);
  }, [filters, stableDefaultValues]);

  // Atualiza os filtros e sincroniza com a URL preservando parâmetros não gerenciados
  const setFilters = useCallback(
    (newFilters: Partial<T> | ((prev: T) => Partial<T>)) => {
      setSearchParams(
        (prevSearchParams) => {
          const currentFilters = parseUrlParams(
            prevSearchParams,
            stableDefaultValues,
          );
          const updated =
            typeof newFilters === "function"
              ? newFilters(currentFilters)
              : newFilters;

          const merged: T = {
            ...currentFilters,
            ...updated,
          };

          return serializeToSearchParams(
            merged,
            stableDefaultValues,
            prevSearchParams,
          );
        },
        { replace: true },
      );
    },
    [setSearchParams, stableDefaultValues],
  );

  // Reseta APENAS as chaves gerenciadas de filtro, mantendo outros parâmetros da URL intactos
  const resetFilters = useCallback(() => {
    setSearchParams(
      (prevSearchParams) => {
        const nextParams = new URLSearchParams(prevSearchParams);
        for (const key of Object.keys(stableDefaultValues)) {
          nextParams.delete(key);
        }
        return nextParams;
      },
      { replace: true },
    );
  }, [setSearchParams, stableDefaultValues]);

  return useMemo(
    () => ({
      filters,
      setFilters,
      apiParams,
      resetFilters,
    }),
    [filters, setFilters, apiParams, resetFilters],
  );
}
