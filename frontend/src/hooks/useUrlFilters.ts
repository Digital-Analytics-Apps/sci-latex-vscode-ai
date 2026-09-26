import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  buildCleanApiParams,
  parseUrlParams,
  serializeToSearchParams,
} from "../utils/urlParamsUtils";

export function useUrlFilters<T extends Record<string, any>>(defaultValues: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse current state from URL search params using defaultValues
  const filters: T = useMemo(() => {
    return parseUrlParams(searchParams, defaultValues);
  }, [searchParams, defaultValues]);

  // Update filters state & sync with URL
  const setFilters = useCallback(
    (newFilters: Partial<T> | ((prev: T) => Partial<T>)) => {
      setSearchParams((prevSearchParams) => {
        const currentFilters = parseUrlParams(prevSearchParams, defaultValues);
        const updated =
          typeof newFilters === "function"
            ? newFilters(currentFilters)
            : newFilters;

        const merged: T = {
          ...currentFilters,
          ...updated,
        };

        return serializeToSearchParams(merged, defaultValues);
      });
    },
    [setSearchParams, defaultValues],
  );

  // Clean params object for React Query / Axios API calls
  const apiParams = useMemo(() => {
    return buildCleanApiParams(filters, defaultValues);
  }, [filters, defaultValues]);

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return {
    filters,
    setFilters,
    apiParams,
    resetFilters,
  };
}
