import { useState, useEffect, useCallback } from 'react';
import { requestJson } from '../lib/http';

export function useLazyData<T>(
  apiBase: string, 
  path: string, 
  authHeaders: Record<string, string> = {}, 
  initialData: T | null = null
) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const headersString = JSON.stringify(authHeaders);

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    try {
      const result = await requestJson(apiBase, path, JSON.parse(headersString));
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [apiBase, path, headersString]); // <-- Depend on the stable string, not the object

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  return { data, setData, loading, error, refresh: fetchRequest };
}