import { useState, useEffect } from 'react';

/**
 * Debounces a value change by the specified delay.
 * @param {any} value - The value to debounce
 * @param {number} delay - Debounce delay in milliseconds (default 300)
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
