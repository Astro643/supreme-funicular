// Forwards /api/* to the backend. This is a normal route action (see routes.ts), not a middleware.
import { createFetchProxy } from "remix/fetch-proxy"

const backend = (process.env.BACKEND_URL ?? "https://didactic-doodle-three.vercel.app").replace(/\/+$/, "")
const agentBackend = (process.env.AGENT_BACKEND_URL ?? backend).replace(/\/+$/, "")
const TIMEOUT_MS = 60_000
const MAX_AGENT_BODY_BYTES = 128 * 1024
const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,200}$/

// fetch-proxy keeps redirects (magic-link sign-in) and their cookies for the browser, rewrites Set-Cookie
// domains, and strips the encoding and length headers that no longer describe a decoded body.
const forward = createFetchProxy(backend, {
  fetch(input, init) {
    const own = input instanceof Request ? input.signal : undefined
    const signal = AbortSignal.any(own ? [own, AbortSignal.timeout(TIMEOUT_MS)] : [AbortSignal.timeout(TIMEOUT_MS)])
    return fetch(input, { ...init, signal })
  },
})

function agentError(detail: string, status: number) {
  return Response.json({ detail }, { status, headers: { "cache-control": "no-store" } })
}

async function readAgentBody(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const contentLength = Number(request.headers.get("content-length"))
    if (Number.isFinite(contentLength) && contentLength > MAX_AGENT_BODY_BYTES) {
      return agentError("Request body is too large.", 413)
    }
    const text = await request.text()
    if (Buffer.byteLength(text) > MAX_AGENT_BODY_BYTES) return agentError("Request body is too large.", 413)
    const body: unknown = JSON.parse(text)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return agentError("A JSON object is required.", 400)
    }
    return body as Record<string, unknown>
  } catch {
    return agentError("A valid JSON body is required.", 400)
  }
}

async function forwardAgent(
  request: Request,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<Response> {
  const key = process.env.AGENT_API_KEY
  if (!key) return agentError("Agent API is not configured.", 503)

  const cookie = request.headers.get("cookie")

  let url: URL
  try {
    url = new URL(`${agentBackend}${path}`)
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      return agentError("AGENT_BACKEND_URL must use HTTPS.", 503)
    }
  } catch {
    return agentError("Agent backend is not configured correctly.", 503)
  }

  try {
    const upstream = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${key}`,
        ...(cookie ? { cookie } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (upstream.status === 401) {
      const error = await upstream.clone().json().catch(() => ({} as { detail?: unknown }))
      if (error.detail === "unauthorized") {
        return agentError("The agent backend rejected its server credential. Check AGENT_API_KEY.", 502)
      }
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError"
    return agentError(
      timedOut ? "The service took too long to answer. Please try again." : "The service is unavailable. Please try again shortly.",
      timedOut ? 504 : 502,
    )
  }
}

async function proxyAgent(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url)
  const parts = url.pathname.split("/")
  const method = request.method.toUpperCase()
  const isPost = method === "POST"

  if (isPost && request.headers.get("origin") !== url.origin) {
    return agentError("Same-origin requests only.", 403)
  }

  if (parts[4] === "preview" && parts.length === 5 && isPost) {
    const body = await readAgentBody(request)
    if (body instanceof Response) return body
    if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 2000) {
      return agentError("prompt must be a non-empty string of at most 2000 characters.", 400)
    }
    return forwardAgent(request, "/api/agent/preview", "POST", { prompt: body.prompt.trim() })
  }

  if (parts[4] === "execute" && parts.length === 5 && isPost) {
    const body = await readAgentBody(request)
    if (body instanceof Response) return body
    if (!body.agent_plan || typeof body.agent_plan !== "object" || Array.isArray(body.agent_plan)) {
      return agentError("agent_plan from preview is required.", 400)
    }
    return forwardAgent(request, "/api/agent/execute", "POST", { agent_plan: body.agent_plan })
  }

  const action = parts[4]
  if (["status", "cancel", "approve"].includes(action) && parts.length === 6) {
    let runId: string
    try {
      runId = decodeURIComponent(parts[5])
    } catch {
      return agentError("Invalid run id.", 400)
    }
    if (!RUN_ID_PATTERN.test(runId)) return agentError("Invalid run id.", 400)

    if (action === "status" && method === "GET") {
      return forwardAgent(request, `/api/status/${encodeURIComponent(runId)}`, "GET")
    }
    if (action === "cancel" && isPost) {
      return forwardAgent(request, `/api/cancel/${encodeURIComponent(runId)}`, "POST", {})
    }
    if (action === "approve" && isPost) {
      const body = await readAgentBody(request)
      if (body instanceof Response) return body
      if (typeof body.approval_token !== "string" || typeof body.approved !== "boolean") {
        return agentError("approval_token and approved are required.", 400)
      }
      return forwardAgent(request, `/api/agent/approve/${encodeURIComponent(runId)}`, "POST", {
        approval_token: body.approval_token,
        approved: body.approved,
      })
    }
  }

  return undefined
}

export async function proxy(request: Request): Promise<Response> {
  try {
    if (new URL(request.url).pathname.startsWith("/api/controller/agent/")) {
      const agentResponse = await proxyAgent(request)
      if (agentResponse) return agentResponse
      return agentError("Not found.", 404)
    }

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
