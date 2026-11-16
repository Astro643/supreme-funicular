// Forwards /api/* to the backend. This is a normal route action (see routes.ts), not a middleware.
import { createFetchProxy } from "remix/fetch-proxy"

const backend = (process.env.BACKEND_URL ?? "https://didactic-doodle-three.vercel.app").replace(/\/+$/, "")
const TIMEOUT_MS = 60_000

// fetch-proxy keeps redirects (magic-link sign-in) and their cookies for the browser, rewrites Set-Cookie
// domains, and strips the encoding and length headers that no longer describe a decoded body.
const forward = createFetchProxy(backend, {
  fetch(input, init) {
    const own = input instanceof Request ? input.signal : undefined
    const signal = AbortSignal.any(own ? [own, AbortSignal.timeout(TIMEOUT_MS)] : [AbortSignal.timeout(TIMEOUT_MS)])
    return fetch(input, { ...init, signal })
  },
})

export async function proxy(request: Request): Promise<Response> {
  try {
    const upstream = await forward(request)

    // Copy the headers: a Response that came straight from fetch() may have read-only ones.
    const headers = new Headers(upstream.headers)

    // A redirect that names the backend itself should stay on this site.
    const location = headers.get("location")
    if (location?.startsWith(backend)) headers.set("location", location.slice(backend.length) || "/")
    if (!headers.has("cache-control")) headers.set("cache-control", "no-store")

    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError"
    return Response.json(
      { detail: timedOut ? "The service took too long to answer. Please try again." : "The service is unavailable. Please try again shortly." },
      { status: timedOut ? 504 : 502, headers: { "cache-control": "no-store" } },
    )
  }
}
