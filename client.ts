// Small helpers shared by the client components (Console and SupportWidget).

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T & { detail?: string }
}

interface ApiOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  timeout?: number
}

/** Aborts when any of the signals does. AbortSignal.any is missing in older browsers (Safari before 17.4), so fall back to a manual link. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals)
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true, signal: controller.signal })
  }
  return controller.signal
}

/** JSON request with a timeout. Never throws on a bad status or a non-JSON body; throws only on network failure or abort. */
export async function api<T = Record<string, never>>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  const { body, signal, timeout = 15_000 } = options
  const res = await fetch(path, {
    method: options.method ?? (body === undefined ? "GET" : "POST"),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: anySignal(signal ? [signal, AbortSignal.timeout(timeout)] : [AbortSignal.timeout(timeout)]),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

/** The message to show for a failed response. */
export function reason(result: ApiResult<unknown>, fallback: string): string {
  if (result.status === 401) return "Session expired. Run /dashboard in your server for a fresh link."
  return typeof result.data.detail === "string" ? result.data.detail : fallback
}

export const store = {
  load<T>(key: string): T[] {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? "[]")
      return Array.isArray(value) ? value : []
    } catch {
      return []
    }
  },
  save<T>(key: string, items: T[], max: number) {
    try {
      localStorage.setItem(key, JSON.stringify(items.slice(-max)))
    } catch {}
  },
}
