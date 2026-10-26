import { useCallback, useEffect, useRef, useState } from "react";

/** Runs an async loader whenever deps change; keeps the previous data visible while reloading. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    loader()
      .then((d) => id === latest.current && setData(d))
      .catch((e: Error) => id === latest.current && setError(e))
      .finally(() => id === latest.current && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, setData, error, loading, reload };
}
