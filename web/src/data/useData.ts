import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataKey, DataMap } from './types';

/**
 * JSON veri katmanı.
 *
 * Modül düzeyinde tek cache — iki feature aynı dosyayı istese bile
 * ağdan bir kez iner (spec 2.3, `needs` sözleşmesi).
 * localStorage/sessionStorage KULLANILMIYOR (kabul kriteri 9).
 */

const cache = new Map<DataKey, unknown>();
const inflight = new Map<DataKey, Promise<unknown>>();

function url(key: DataKey): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : base + '/'}data/${key}.json`;
}

export function load<K extends DataKey>(key: K): Promise<DataMap[K]> {
  if (cache.has(key)) return Promise.resolve(cache.get(key) as DataMap[K]);

  const existing = inflight.get(key);
  if (existing) return existing as Promise<DataMap[K]>;

  const p = fetch(url(key))
    .then((r) => {
      if (!r.ok) throw new Error(`${key}.json yüklenemedi (HTTP ${r.status})`);
      return r.json();
    })
    .then((json) => {
      cache.set(key, json);
      inflight.delete(key);
      return json as DataMap[K];
    })
    .catch((err) => {
      inflight.delete(key); // hata kalıcı cache'lenmesin, tekrar denenebilsin
      throw err;
    });

  inflight.set(key, p);
  return p;
}

/** Cache'te hazır olanı senkron döndürür — ilk render'da flicker olmasın diye. */
function readCached(keys: readonly DataKey[]): Partial<DataMap> {
  const out: Partial<DataMap> = {};
  for (const k of keys) {
    if (cache.has(k)) out[k] = cache.get(k) as never;
  }
  return out;
}

export interface DataResult<K extends DataKey> {
  data: Pick<Partial<DataMap>, K>;
  loading: boolean;
  error: Error | null;
}

/**
 * Bir feature'ın `needs` dizisindeki dosyaları indirir.
 * Dizi referansı her render değişse de içerik aynıysa yeniden fetch etmez.
 */
export function useData<K extends DataKey>(keys: readonly K[]): DataResult<K> {
  const sig = keys.join('|');
  const stable = useMemo(() => keys.slice().sort() as K[], [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  const allCached = stable.every((k) => cache.has(k));
  const [, force] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!allCached);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (stable.every((k) => cache.has(k))) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all(stable.map((k) => load(k)))
      .then(() => {
        if (!alive.current) return;
        setLoading(false);
        force((n) => n + 1);
      })
      .catch((err: Error) => {
        if (!alive.current) return;
        setError(err);
        setLoading(false);
      });
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = readCached(stable) as Pick<Partial<DataMap>, K>;
  return { data, loading, error };
}

/** Tek dosya için kısayol: `const kpi = useDatum('kpi').data;` */
export function useDatum<K extends DataKey>(key: K) {
  const keys = useMemo(() => [key] as const, [key]);
  const { data, loading, error } = useData(keys);
  return { data: data[key] as DataMap[K] | undefined, loading, error };
}

/** Sekme değişiminde bir sonraki sekmenin verisini önden indirmek için. */
export function prefetch(keys: readonly DataKey[]): void {
  for (const k of keys) void load(k).catch(() => {});
}
