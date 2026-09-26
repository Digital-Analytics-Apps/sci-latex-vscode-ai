/**
 * Generic utility functions for reading, cleaning, and serializing URL search parameters.
 * Works with any typed filter object T extends Record<string, any>.
 */

/**
 * Parses URLSearchParams into a typed filter object T using provided defaultValues.
 * Automatically casts numbers and booleans, preserving string defaults.
 */
export function parseUrlParams<T extends Record<string, any>>(
  searchParams: URLSearchParams,
  defaultValues: T,
): T {
  const result = { ...defaultValues };

  for (const key of Object.keys(defaultValues) as Array<keyof T & string>) {
    const rawValue = searchParams.get(key);
    if (rawValue === null) continue;

    const defaultValue = defaultValues[key];

    if (typeof defaultValue === "number") {
      const num = Number(rawValue);
      if (!Number.isNaN(num)) {
        (result as any)[key] = num;
      }
    } else if (typeof defaultValue === "boolean") {
      (result as any)[key] = rawValue === "true";
    } else {
      (result as any)[key] = rawValue;
    }
  }

  return result;
}

/**
 * Cleans a filter object by removing empty strings, null, undefined,
 * or values matching defaultValues. Produces a clean Record<string, string> for API queries.
 */
export function buildCleanApiParams<T extends Record<string, any>>(
  filters: T,
  defaultValues?: Partial<T>,
): Record<string, string> {
  const clean: Record<string, string> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === "") continue;

    // Skip wildcard 'all' or 'ALL' strings
    if (
      typeof value === "string" &&
      (value.toLowerCase() === "all" || value === "ALL")
    ) {
      continue;
    }

    // Skip values matching default values
    if (
      defaultValues &&
      defaultValues[key] !== undefined &&
      defaultValues[key] === value
    ) {
      continue;
    }

    clean[key] = String(value);
  }

  return clean;
}

/**
 * Serializes a filter object T into a clean URLSearchParams instance,
 * omitting default values and empty strings so shared URLs stay clean.
 */
export function serializeToSearchParams<T extends Record<string, any>>(
  filters: T,
  defaultValues?: T,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === "") continue;

    // Omit default values from the URL query string
    if (
      defaultValues &&
      defaultValues[key] !== undefined &&
      defaultValues[key] === value
    ) {
      continue;
    }

    // Skip wildcard 'all' or 'ALL' strings
    if (
      typeof value === "string" &&
      (value.toLowerCase() === "all" || value === "ALL")
    ) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams;
}
