import { useState, useEffect, useCallback } from 'react';
import { GET } from '../utils/api';

/**
 * Generic data-fetching hook.
 * @param {string|null} path - API path to GET. Pass null to skip fetching.
 * @param {object} opts - { deps: [], transform: fn, defaultValue: any }
 * @returns {{ data, loading, error, reload }}
 */
export function useApi(path, opts = {}) {
  const { deps = [], transform, defaultValue = null } = opts;
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await GET(path);
      setData(transform ? transform(res) : res);
    } catch (err) {
      setError(err.message || 'Failed to load data');
      setData(defaultValue);
    } finally {
      setLoading(false);
    }
  }, [path, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}

/**
 * Hook for fetching a list with search/filter support.
 * @param {string} path - API path
 * @returns {{ items, loading, error, reload, setItems }}
 */
export function useApiList(path, opts = {}) {
  const { transform, defaultValue = [] } = opts;
  const result = useApi(path, { ...opts, defaultValue, transform: transform || (r => Array.isArray(r) ? r : []) });
  return { items: result.data, ...result, setItems: result.setData };
}
