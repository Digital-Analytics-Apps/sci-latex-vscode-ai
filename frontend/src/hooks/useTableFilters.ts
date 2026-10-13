import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "./useDebounce";
import { useUrlFilters } from "./useUrlFilters";

export interface UseTableFiltersOptions {
  /** Tempo de espera do debounce da busca em ms (padrão: 400) */
  debounceMs?: number;
  /** Nome da chave do parâmetro de busca no filtro (padrão: "search") */
  searchKey?: string;
}

/**
 * Hook Turnkey para Gerenciamento de Estado de Filtros de Tabela + Busca com Debounce + Sincronização via URL.
 *
 * Elimina o código repetitivo em tabelas do DataGrid (useState, useDebounce, useEffect de busca e reset).
 */
export function useTableFilters<T extends Record<string, any>>(
  defaultValues: T,
  options: UseTableFiltersOptions = {},
) {
  const { debounceMs = 400, searchKey = "search" } = options;

  const {
    filters,
    setFilters,
    apiParams,
    resetFilters: baseResetFilters,
  } = useUrlFilters<T>(defaultValues);

  const urlSearchValue = (filters[searchKey] as string) || "";
  const [searchTerm, setSearchTerm] = useState<string>(urlSearchValue);
  const [prevUrlSearch, setPrevUrlSearch] = useState<string>(urlSearchValue);
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  // Sincronização limpa se a busca na URL mudar externamente (ex: navegação na URL)
  if (urlSearchValue !== prevUrlSearch) {
    setPrevUrlSearch(urlSearchValue);
    if (searchTerm !== urlSearchValue) {
      setSearchTerm(urlSearchValue);
    }
  }

  // Atualiza a URL com sincronização à prova de piscar (zero ping-pong ao resetar)
  useEffect(() => {
    // 1. Se a busca local foi limpa para vazio, sincroniza imediatamente para remover da URL
    if (searchTerm === "") {
      if (urlSearchValue !== "") {
        setFilters({ [searchKey]: "" } as Partial<T>);
      }
      return;
    }

    // 2. Se o usuário está digitando, aguarda a estabilização do debounce (debouncedSearchTerm === searchTerm)
    if (
      debouncedSearchTerm === searchTerm &&
      debouncedSearchTerm !== urlSearchValue
    ) {
      setFilters({ [searchKey]: debouncedSearchTerm } as Partial<T>);
    }
  }, [searchTerm, debouncedSearchTerm, urlSearchValue, searchKey, setFilters]);

  // Verifica se algum filtro está ativo em relação ao padrão
  const isFiltered = useMemo(() => {
    if (searchTerm.trim()) return true;
    for (const key of Object.keys(defaultValues)) {
      if (key === searchKey) continue;
      if (filters[key] !== defaultValues[key]) return true;
    }
    return false;
  }, [filters, defaultValues, searchKey, searchTerm]);

  // Reset unificado instantâneo (evita ping-pong com debounce antigo)
  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setPrevUrlSearch("");
    baseResetFilters();
  }, [baseResetFilters]);

  // Props prontas para vincular ao `search` do TableHeaderFilterToolbar
  const searchProps = useMemo(
    () => ({
      value: searchTerm,
      onChange: setSearchTerm,
    }),
    [searchTerm],
  );

  // Helper para vincular um dropdown ao `selectFilters` do TableHeaderFilterToolbar
  const bindSelect = useCallback(
    (key: keyof T) => ({
      value: (filters[key] as string) || "",
      onChange: (val: string) => setFilters({ [key]: val } as Partial<T>),
    }),
    [filters, setFilters],
  );

  return useMemo(
    () => ({
      filters,
      setFilters,
      apiParams,
      searchTerm,
      setSearchTerm,
      isFiltered,
      resetFilters,
      searchProps,
      bindSelect,
    }),
    [
      filters,
      setFilters,
      apiParams,
      searchTerm,
      isFiltered,
      resetFilters,
      searchProps,
      bindSelect,
    ],
  );
}
