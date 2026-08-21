import { useCallback, useEffect, useState } from "react";

/**
 * useApi – hook compartido de fetching con estados de carga/error.
 * Reemplaza el patrón useState(loading/error/data) + useEffect repetido en cada página.
 *
 * @param {function} fetcher – función que devuelve una Promise con los datos
 * @param {Array} deps – dependencias que disparan la recarga
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetcher()
      .then((result) => {
        if (alive) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e.message || "Error inesperado");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // fetcher se excluye a propósito: cambia identidad en cada render;
    // la recarga la gobiernan deps/reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}
