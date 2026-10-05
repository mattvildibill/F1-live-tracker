export interface ScopedResult<T> { key: string; value: T }

// Never display a response for a previous session, race, or request selection.
export function valueForRequest<T>(key: string, result: ScopedResult<T> | null): T | null {
  return result?.key === key ? result.value : null;
}
