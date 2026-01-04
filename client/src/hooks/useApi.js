import { useMemo } from 'react';
import { createHttpClient } from '../lib/http.js';
import { useAuth } from '../state/auth.js';

export function useApi() {
  const { token, clearSession } = useAuth();

  const api = useMemo(() => {
    return createHttpClient(
      () => token,
      () => {
        clearSession();
      }
    );
  }, [token, clearSession]);

  return api;
}
