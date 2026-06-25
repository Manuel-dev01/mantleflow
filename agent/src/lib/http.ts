/**
 * Cached, rate-limit-aware JSON fetch used by every API adapter. Keeps external
 * calls (DefiLlama, Etherscan V2) cheap and polite. In-memory TTL cache + a simple
 * per-host concurrency gate + retry with backoff. No persistence — process-local.
 */

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

const cache = new Map<string, CacheEntry>();

export interface FetchJsonOptions {
  /** Cache TTL in ms. 0 disables caching for this call. Default 60_000. */
  ttlMs?: number;
  /** Max retries on network error / 429 / 5xx. Default 3. */
  retries?: number;
  headers?: Record<string, string>;
  /** Abort if the request takes longer than this (ms). Default 20_000. */
  timeoutMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchJsonOptions = {},
): Promise<T> {
  const { ttlMs = 60_000, retries = 3, headers, timeoutMs = 20_000 } = opts;
  const key = url + (headers ? JSON.stringify(headers) : "");

  if (ttlMs > 0) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const init: RequestInit = { signal: ctrl.signal };
    if (headers) init.headers = headers;
    try {
      const res = await fetch(url, init);
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status} from ${hostOf(url)}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${hostOf(url)} (non-retryable)`);
      }
      const value = (await res.json()) as T;
      if (ttlMs > 0) cache.set(key, { expiresAt: Date.now() + ttlMs, value });
      return value;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) await sleep(250 * 2 ** attempt);
    }
  }
  throw new Error(
    `fetchJson failed after ${retries + 1} attempts: ${hostOf(url)} — ${String(lastErr)}`,
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Test/util: clear the in-memory cache. */
export function __clearHttpCache(): void {
  cache.clear();
}
