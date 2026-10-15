import { useEffect, useState } from 'react'

/**
 * Returns `value` after it has stopped changing for `delayMs`.
 * Keeps the caller's immediate value (e.g. a text input) responsive while
 * debouncing downstream work such as network queries.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}