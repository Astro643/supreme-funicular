import { clientEntry, css, on, ref } from "remix/component"
import type { Handle } from "remix/component"

import { api, reason, store } from "./client.ts"

const LABELS: Record<string, string> = {
  processing: "Processing",
  waiting: "Waiting",
  cancelled: "Cancelled",
  completed: "Completed",
  blocked_by_traffic: "Traffic stall",
  rejected: "Rejected",
  failed: "Failed",
  stalled: "No response",
  unknown: "Expired",
}
// A traffic stall resumes by itself, so it is not final and keeps being polled.
const FINAL = new Set(["cancelled", "completed", "failed", "rejected", "unknown", "stalled"])

const STORE_KEY = "console_history_v1"
const MAX_ITEMS = 50
const POLL_MS = 1500
const WAITING_POLL_MS = 10_000
const SESSION_RETRY_MS = 30_000
const GIVE_UP_MS = 26 * 60 * 60 * 1000
const AUTO_RUN_MS = 9000
const SLOW_API_MS = 45_000

interface OpItem {
  id: string
  prompt: string
  ts: number
  status: string
  note: string
}

interface Plan {
  summary?: string
  steps?: { label?: string; action?: string }[]
}

interface PreviewData extends Plan {
  complete?: boolean
  incomplete?: boolean
  question?: string
}

// Poll fast while a request is fresh, then back off. A long-running request does not need a call every 1.5s.
const pollDelay = (item: OpItem, now: number) => {
  if (item.status === "waiting") return WAITING_POLL_MS
  const age = now - item.ts
  return age < 30_000 ? 0 : age < 5 * 60_000 ? 5000 : WAITING_POLL_MS
}

const stamp = (ts: number) => {
  const date = new Date(ts)
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return date.toDateString() === new Date().toDateString()
    ? time
    : date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + time
}

const feedStyle = css({
  maxWidth: "680px",
  margin: "0 auto",
  padding: "64px 24px 210px",
  minHeight: "100vh",
  fontSize: "15px",
  letterSpacing: "-.011em",
  "& .feed": { display: "flex", flexDirection: "column", gap: "38px" },
  "& .op": {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    scrollMarginBottom: "200px",
    animation: "rise .5s cubic-bezier(.2,.7,.2,1) backwards",
  },
  "& .bubble": {
    alignSelf: "flex-end",
    maxWidth: "86%",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "20px 20px 6px 20px",
    padding: "12px 18px",
    boxShadow: "0 1px 2px rgba(17,17,19,.03)",
    fontSize: "16px",
    lineHeight: 1.6,
    wordBreak: "break-word",
  },
  "& .status-row": { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", paddingLeft: "4px" },
  "& .op-id": {
    fontFamily: "var(--mono)",
    fontSize: "11.5px",
    color: "var(--muted)",
    background: "var(--mono-bg)",
    borderRadius: "6px",
    padding: "2px 8px",
  },
  "& .op-time": { font: "500 11.5px var(--mono)", color: "var(--muted)", fontVariantNumeric: "tabular-nums" },
  "& .op-note": {
    marginLeft: "4px",
    fontFamily: "var(--mono)",
    fontSize: "12px",
    lineHeight: 1.7,
    color: "var(--ink-2)",
    background: "var(--mono-bg)",
    borderRadius: "12px",
    padding: "12px 14px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  "& .op-cancel": {
    font: "500 12px/1 var(--sans)",
    color: "var(--muted)",
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "999px",
    padding: "8px 12px",
    cursor: "pointer",
    transition: "color .15s ease,border-color .15s ease",
  },
  "& .op-cancel:hover": { color: "var(--rose)", borderColor: "var(--rose)" },
  "& .op-cancel:disabled": { opacity: ".5", cursor: "progress" },
  "@media (max-width:520px)": {
    paddingTop: "96px",
    "& .bubble": { maxWidth: "94%" },
  },
})

const barStyle = css({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10,
  pointerEvents: "none",
  padding: "36px 20px calc(26px + env(safe-area-inset-bottom))",
  background: "linear-gradient(180deg,rgba(250,250,250,0),rgba(250,250,250,.85) 32%,#FAFAFA 52%)",
  "& > *": { pointerEvents: "auto" },
  "& .form": { maxWidth: "680px", margin: "0 auto", position: "relative" },
  "& .prompt": {
    width: "100%",
    font: "inherit",
    letterSpacing: "inherit",
    color: "var(--ink)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "19px 68px 19px 26px",
    outline: "none",
    boxShadow: "0 1px 2px rgba(0,0,0,.04),0 12px 24px -16px rgba(0,0,0,.14)",
    transition: "border-color .15s ease,box-shadow .15s ease",
  },
  "& .prompt::placeholder": { color: "var(--muted)" },
  "& .prompt:focus": {
    borderColor: "var(--ink)",
    boxShadow: "0 0 0 3px rgba(0,0,0,.08),0 14px 30px -14px rgba(0,0,0,.18)",
  },
  "& .go": {
    position: "absolute",
    right: "11px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: 0,
    padding: 0,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    color: "var(--faint)",
    background: "#F2F2F2",
    transition: "background .15s ease,color .15s ease,transform .15s ease",
  },
  "& .go svg": { width: "18px", height: "18px", display: "block" },
  "& .form.ready .go": { color: "#fff", background: "var(--btn)" },
  "& .form.ready .go:hover": { background: "#000" },
  "& .go:active": { transform: "translateY(-50%) scale(.93)" },
  "& .go:disabled": { opacity: ".5", cursor: "progress" },
  "& .hint": { maxWidth: "680px", margin: "10px auto 0", textAlign: "center", fontSize: "12px", color: "var(--muted)", minHeight: "18px" },
  "& .hint.err": { color: "var(--rose)" },
  "@media (pointer:coarse)": { "& .prompt": { fontSize: "16px" } },
})

const modalStyle = css({
  "@keyframes fade": { from: { opacity: "0" }, to: { opacity: "1" } },
  "@keyframes countdown": { from: { transform: "scaleX(1)" }, to: { transform: "scaleX(0)" } },
  position: "fixed",
  inset: 0,
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background: "rgba(0,0,0,.4)",
  backdropFilter: "blur(8px)",
  animation: "fade .2s ease both",
  "& .preview-card": {
    width: "100%",
    maxWidth: "520px",
    maxHeight: "82vh",
    overflow: "auto",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "28px 26px 22px",
    boxShadow: "var(--lift),0 40px 90px -30px rgba(5,5,5,.45)",
    animation: "rise .35s cubic-bezier(.2,.7,.2,1) backwards",
  },
  "& .preview-title": { margin: "0 0 6px", font: "500 28px/1.1 var(--display)", letterSpacing: "-.035em" },
  "& .preview-question": {
    margin: "14px 0",
    padding: "12px 14px",
    borderRadius: "10px",
    background: "#FFEBC7",
    color: "#8A4B04",
    fontWeight: 600,
    fontSize: "14.5px",
  },
  "& .preview-summary": { margin: "8px 0 18px", color: "var(--muted)", fontSize: "14.5px" },
  "& .preview-h": { margin: "18px 0 10px", font: "600 11.5px/1 var(--mono)", textTransform: "uppercase", letterSpacing: ".09em", color: "var(--muted)" },
  "& .preview-steps": { display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, listStyle: "none" },
  "& .preview-step": {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    background: "var(--canvas)",
    border: "1px solid var(--border)",
    color: "var(--ink)",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  "& .preview-step-num": {
    flex: "none",
    display: "grid",
    placeItems: "center",
    width: "24px",
    height: "24px",
    borderRadius: "7px",
    background: "var(--btn)",
    color: "#fff",
    font: "700 12px var(--mono)",
  },
  "& .preview-empty": { margin: 0, color: "var(--muted)", fontStyle: "italic" },
  "& .preview-timer": {
    height: "3px",
    margin: "22px 0 0",
    borderRadius: "3px",
    background: "var(--btn)",
    transformOrigin: "left",
    animation: `countdown ${AUTO_RUN_MS}ms linear forwards`,
  },
  "& .preview-auto": { margin: "8px 0 0", font: "500 12px var(--mono)", color: "var(--muted)" },
  "& .preview-actions": { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" },
  "& .preview-btn": {
    font: "500 14px/1 var(--sans)",
    letterSpacing: "-.011em",
    borderRadius: "999px",
    padding: "13px 22px",
    cursor: "pointer",
    transition: "background .15s,transform .08s,border-color .15s",
  },
  "& .preview-cancel": { background: "transparent", color: "var(--ink)", border: "1px solid var(--border)" },
  "& .preview-cancel:hover": { background: "rgba(5,5,5,.05)" },
  "& .preview-confirm": { background: "var(--btn)", color: "#fff", border: 0 },
  "& .preview-confirm:hover": { background: "#000" },
  "& .preview-confirm:active": { transform: "translateY(1px)" },
})

export const Console = clientEntry(import.meta.url, function Console(handle: Handle) {
  let items: OpItem[] = []
  let loaded = false
  let hint = ""
  let hintIsError = false
  let draft = ""
  let busy = false
  let preview: PreviewData | undefined
  let previewPrompt = ""
  let previewPlan: Plan | null = null
  let previewFocused = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let input: HTMLInputElement | undefined
  let freshId = ""
  let polling = false
  let pausedUntil = 0
  const cancelling = new Set<string>()
  const polledAt = new Map<string, number>()

  const refresh = () => handle.update()
  const focusInput = () => input?.focus()
  const say = (message = "", isError = false) => {
    hint = message
    hintIsError = isError
  }
  const setDraft = (value: string) => {
    draft = value
    if (input) input.value = value
  }
  const save = () => store.save(STORE_KEY, items, MAX_ITEMS)
  const patch = (id: string, change: Partial<OpItem>) => {
    items = items.map((item) => (item.id === id ? { ...item, ...change } : item))
  }
  const networkError = () => {
    if (!handle.signal.aborted) say("Network error. Please try again.", true)
  }

  const closePreview = () => {
    clearTimeout(timer)
    preview = undefined
    previewFocused = false
    busy = false
    refresh()
    focusInput()
  }

  const run = async (prompt: string, plan: Plan | null) => {
    busy = true
    say()
    refresh()
    try {
      const r = await api<{ command_id?: string; status?: string }>("/api/execute", {
        body: plan ? { prompt, plan } : { prompt },
        timeout: SLOW_API_MS,
        signal: handle.signal,
      })
      const id = r.data.command_id
      if (!r.ok || !id) {
        say(reason(r, "Could not queue that goal."), true)
        return
      }
      items = [...items, { id, prompt, ts: Date.now(), status: r.data.status || "processing", note: "" }].slice(-MAX_ITEMS)
      freshId = id
      save()
      setDraft("")
    } catch {
      networkError()
    } finally {
      busy = false
      if (!handle.signal.aborted) {
        refresh()
        focusInput()
      }
    }
  }

  // Runs the previewed plan, or sends an unclear request back to the input for more detail.
  const accept = () => {
    if (!preview) return
    const plan = previewPlan
    const prompt = previewPrompt
    const question = preview.question
    clearTimeout(timer)
    preview = undefined
    previewFocused = false
    if (plan) {
      run(prompt, plan)
      return
    }
    setDraft(prompt)
    busy = false
    say(question || "Add more detail and run it again.")
    refresh()
    focusInput()
  }

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    const prompt = draft.trim()
    if (!prompt || busy) return
    busy = true
    say()
    refresh()
    try {
      const r = await api<PreviewData>("/api/preview", { body: { prompt }, timeout: SLOW_API_MS, signal: handle.signal })
      if (!r.ok) {
        say(reason(r, "Could not generate preview."), true)
        return
      }
      preview = r.data
      previewPrompt = prompt
      previewPlan = r.data.complete && !r.data.incomplete ? { summary: r.data.summary, steps: r.data.steps } : null
      if (previewPlan) timer = setTimeout(accept, AUTO_RUN_MS)
    } catch {
      networkError()
    } finally {
      if (!preview) busy = false
      if (!handle.signal.aborted) {
        refresh()
        if (!preview) focusInput()
      }
    }
  }

  const cancelOp = async (item: OpItem) => {
    cancelling.add(item.id)
    refresh()
    try {
      const r = await api("/api/cancel/" + encodeURIComponent(item.id), { method: "POST", signal: handle.signal })
      if (r.ok) {
        patch(item.id, { status: "cancelled", note: "" })
        save()
      } else {
        say(reason(r, "Could not cancel."), true)
      }
    } catch {
      networkError()
    }
    cancelling.delete(item.id)
    refresh()
  }

  const poll = async () => {
    if (polling || Date.now() < pausedUntil) return
    polling = true
    const now = Date.now()
    const due = items.filter((item) => !FINAL.has(item.status) && now - (polledAt.get(item.id) ?? 0) >= pollDelay(item, now))
    try {
      await Promise.all(
        due.map(async (item) => {
          polledAt.set(item.id, now)
          if (now - item.ts > GIVE_UP_MS) return patch(item.id, { status: "stalled" })
          try {
            const r = await api<{ status?: string; error?: string; result?: string }>("/api/status/" + encodeURIComponent(item.id), {
              signal: handle.signal,
            })
            if (r.status === 401) {
              pausedUntil = Date.now() + SESSION_RETRY_MS
              return say(reason(r, ""), true)
            }
            if (r.status === 404) return patch(item.id, { status: "unknown", note: "" })
            if (!r.ok || !r.data.status) return
            const note = r.data.error || r.data.result || ""
            if (r.data.status !== item.status || note !== item.note) patch(item.id, { status: r.data.status, note })
          } catch {}
        }),
      )
    } finally {
      polling = false
    }
    if (due.length && !handle.signal.aborted) {
      save()
      refresh()
    }
  }

  handle.queueTask(() => {
    items = store.load<OpItem>(STORE_KEY).filter((item) => item && typeof item.id === "string" && typeof item.prompt === "string")
    loaded = true
    refresh()

    const tick = setInterval(() => {
      if (!document.hidden) poll()
    }, POLL_MS)
    handle.signal.addEventListener("abort", () => {
      clearInterval(tick)
      clearTimeout(timer)
    })
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && preview) closePreview()
      },
      { signal: handle.signal },
    )

    poll()
    focusInput()
  })

  const feed = () =>
    items.map((item) => (
      <article
        key={item.id}
        class="op"
        mix={ref((node) => {
          // Scroll to a request the moment it appears, not when old history loads.
          if (item.id !== freshId || !node.isConnected) return
          freshId = ""
          node.scrollIntoView({ behavior: "smooth", block: "end" })
        })}
      >
        <div class="bubble">{item.prompt}</div>
        <div class="status-row">
          <span class={"badge s-" + item.status}>
            <i />
            {LABELS[item.status] || item.status}
          </span>
          <span class="op-id">{item.id}</span>
          <time class="op-time" datetime={new Date(item.ts).toISOString()}>
            {stamp(item.ts)}
          </time>
          {item.status === "waiting" ? (
            <button
              class="op-cancel"
              type="button"
              disabled={cancelling.has(item.id)}
              title="Cancel this waiting request. Steps that already ran are not undone."
              mix={on("click", () => cancelOp(item))}
            >
              Cancel
            </button>
          ) : null}
        </div>
        {item.note ? <div class="op-note">{item.note}</div> : null}
      </article>
    ))

  const previewModal = () => {
    if (!preview) return null
    const needsAnswer = !previewPlan
    return (
      <div
        class="preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        mix={[
          modalStyle,
          on("click", (event) => {
            if (event.target === event.currentTarget) closePreview()
          }),
        ]}
      >
        <div class="preview-card">
          <h2 class="preview-title" id="preview-title">
            Preview (Dry Run)
          </h2>
          {needsAnswer ? <p class="preview-question">{preview.question || "Can you clarify your request?"}</p> : null}
          {preview.summary ? <p class="preview-summary">{preview.summary}</p> : null}
          <h3 class="preview-h">Planned steps</h3>
          {preview.steps && preview.steps.length > 0 ? (
            <ol class="preview-steps">
              {preview.steps.map((step, index) => (
                <li key={index} class="preview-step">
                  <span class="preview-step-num">{String(index + 1)}</span>
                  <span>{step.label || step.action}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p class="preview-empty">No steps generated.</p>
          )}
          {previewPlan ? (
            <>
              <div class="preview-timer" aria-hidden="true" />
              <p class="preview-auto">Runs automatically unless you cancel.</p>
            </>
          ) : null}
          <div class="preview-actions">
            <button class="preview-btn preview-cancel" type="button" mix={on("click", closePreview)}>
              Cancel
            </button>
            <button
              class="preview-btn preview-confirm"
              type="button"
              mix={[
                on("click", accept),
                ref((node) => {
                  if (previewFocused || !node.isConnected) return
                  previewFocused = true
                  node.focus()
                }),
              ]}
            >
              {needsAnswer ? "Edit request" : "Execute"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return () => (
    <>
      <main mix={feedStyle}>
        <h1 class="sr-only">Console</h1>
        <section class="feed" aria-live="polite" aria-label="Requests">
          {loaded ? feed() : null}
        </section>
      </main>
      <div mix={barStyle}>
        <form
          class={draft.trim() ? "form ready" : "form"}
          autoComplete="off"
          mix={on("submit", (event) => submit(event))}
        >
          <input
            class="prompt"
            type="text"
            maxLength={2000}
            placeholder="Describe a change to your server"
            aria-label="Goal"
            mix={[
              on("input", (event) => {
                draft = event.currentTarget.value
                refresh()
              }),
              ref((node) => {
                input = node
              }),
            ]}
          />
          <button class="go" type="submit" aria-label="Execute goal" title="Execute goal" disabled={busy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
        <p class={hintIsError ? "hint err" : "hint"} role="status">
          {hint}
        </p>
      </div>
      {previewModal()}
    </>
  )
})
