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

const EXAMPLES = [
  "Post the tournament rules in #announcements, then lock #signups in 2 hours",
  "Rename #general to #lobby and slow it to 5 seconds",
  "How many webhooks does my server have?",
]

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

const paletteStyle = css({
  "@keyframes cp-in": {
    from: { opacity: "0", transform: "translateY(-8px) scale(.985)" },
    to: { opacity: "1", transform: "none" },
  },
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "12vh 16px 16px",
  background: "rgba(0,0,0,.32)",
  backdropFilter: "blur(3px)",
  opacity: 0,
  visibility: "hidden",
  pointerEvents: "none",
  transition: "opacity .16s ease,visibility 0s linear .16s",
  "&.open": { opacity: 1, visibility: "visible", pointerEvents: "auto", transitionDelay: "0s" },
  "& .cp-panel": {
    width: "min(860px,100%)",
    maxHeight: "min(640px,78dvh)",
    display: "flex",
    flexDirection: "column",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    boxShadow: "0 30px 90px -24px rgba(0,0,0,.4),0 0 0 1px rgba(0,0,0,.03)",
    overflow: "hidden",
    letterSpacing: "-.011em",
  },
  "&.open .cp-panel": { animation: "cp-in .18s cubic-bezier(.2,.8,.2,1)" },
  "& .cp-head": {
    flex: "none",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "6px 14px 6px 24px",
    borderBottom: "1px solid var(--border-soft)",
  },
  "& .cp-input": {
    flex: 1,
    minWidth: 0,
    font: "400 17px var(--sans)",
    letterSpacing: "inherit",
    color: "var(--ink)",
    background: "transparent",
    border: 0,
    outline: "none",
    padding: "16px 0",
  },
  "& .cp-input::placeholder": { color: "var(--faint)" },
  "& .cp-keys": { display: "flex", alignItems: "center", gap: "8px" },
  "& .cp-go": {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    border: 0,
    padding: 0,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    color: "var(--faint)",
    background: "#F2F2F2",
    transition: "background .15s ease,color .15s ease",
  },
  "& .cp-go svg": { width: "16px", height: "16px", display: "block" },
  "& .cp-head.ready .cp-go": { color: "#fff", background: "var(--btn)" },
  "& .cp-head.ready .cp-go:hover": { background: "#000" },
  "& .cp-go:disabled": { opacity: ".5", cursor: "progress" },
  "& .cp-esc": {
    font: "500 12px var(--mono)",
    color: "var(--muted)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    padding: "6px 8px",
    cursor: "pointer",
  },
  "& .cp-esc:hover": { color: "var(--ink)", background: "#F5F5F5" },
  "& .cp-hint": { flex: "none", margin: 0, padding: 0, fontSize: "13px", color: "var(--muted)", maxHeight: 0, overflow: "hidden" },
  "& .cp-hint.on": { padding: "10px 24px", maxHeight: "80px", borderBottom: "1px solid var(--border-soft)" },
  "& .cp-hint.err": { color: "var(--rose)" },
  "& .cp-list": { flex: 1, minHeight: "140px", overflow: "auto", padding: "6px 8px 10px" },
  "& .cp-label": { margin: 0, padding: "14px 16px 8px", font: "500 13px var(--sans)", color: "var(--faint)", letterSpacing: "0" },
  "& .cp-row": {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: "12px",
    alignItems: "start",
    padding: "12px 16px",
    borderRadius: "10px",
    animation: "rise .3s cubic-bezier(.2,.7,.2,1) backwards",
  },
  "& .cp-row:hover": { background: "#F5F5F5" },
  "& .cp-prompt": {
    fontSize: "15px",
    lineHeight: 1.45,
    color: "var(--ink)",
    wordBreak: "break-word",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  "& .cp-meta": { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginTop: "6px" },
  "& .op-id": {
    fontFamily: "var(--mono)",
    fontSize: "11.5px",
    color: "var(--muted)",
    background: "var(--mono-bg)",
    borderRadius: "6px",
    padding: "2px 8px",
  },
  "& .op-time": { font: "500 11.5px var(--mono)", color: "var(--muted)", fontVariantNumeric: "tabular-nums" },
  "& .cp-note": {
    marginTop: "8px",
    fontFamily: "var(--mono)",
    fontSize: "12px",
    lineHeight: 1.7,
    color: "var(--ink-2)",
    background: "var(--canvas)",
    border: "1px solid var(--border-soft)",
    borderRadius: "10px",
    padding: "10px 12px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  "& .cp-side": { display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: "8px" },
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
  "& .cp-ex": {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    font: "inherit",
    fontSize: "15px",
    textAlign: "left",
    color: "var(--ink)",
    background: "transparent",
    border: 0,
    cursor: "pointer",
  },
  "& .cp-ico": { flex: "none", width: "16px", height: "16px", color: "var(--muted)" },
  "@media (max-width:640px)": {
    padding: "8vh 10px 10px",
    "& .cp-row": { gridTemplateColumns: "minmax(0,1fr)" },
    "& .cp-side": { justifyContent: "flex-start" },
  },
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
  let polling = false
  let pausedUntil = 0
  let isOpen = false
  let panel: HTMLElement | undefined
  let returnTo: HTMLElement | null = null
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

  // The Console is an overlay on whatever page the person is on. It stays mounted while closed,
  // so requests keep being tracked and the latest status is there when it opens again.
  const open = () => {
    if (isOpen) return
    isOpen = true
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.documentElement.style.overflow = "hidden"
    refresh()
    setTimeout(focusInput, 30)
  }

  const close = () => {
    if (!isOpen) return
    if (preview) closePreview()
    isOpen = false
    document.documentElement.style.overflow = ""
    // A magic link lands on /dashboard; once it is closed, that page is just the home page.
    if (location.pathname === "/dashboard") history.replaceState(null, "", "/")
    refresh()
    if (returnTo?.isConnected) returnTo.focus()
    returnTo = null
  }

  const useExample = (text: string) => {
    setDraft(text)
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
      document.documentElement.style.overflow = ""
    })

    // Every "Open Console" link opens the overlay. Capture phase, so it wins over any link handling.
    document.addEventListener(
      "click",
      (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        if (!(event.target instanceof Element) || !event.target.closest("[data-open-console]")) return
        event.preventDefault()
        event.stopImmediatePropagation()
        open()
      },
      { capture: true, signal: handle.signal },
    )

    document.addEventListener(
      "keydown",
      (event) => {
        if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
          event.preventDefault()
          if (isOpen) close()
          else open()
          return
        }
        if (event.key === "Escape") {
          if (preview) closePreview()
          else if (isOpen) close()
          return
        }
        if (event.key === "Tab" && isOpen && !preview && panel) {
          const nodes = [...panel.querySelectorAll<HTMLElement>("button:not(:disabled), input, [href]")]
          const first = nodes[0]
          const last = nodes[nodes.length - 1]
          if (!first || !last) return
          const active = document.activeElement
          if (!panel.contains(active) || (event.shiftKey && active === first)) {
            event.preventDefault()
            ;(event.shiftKey ? last : first).focus()
          } else if (!event.shiftKey && active === last) {
            event.preventDefault()
            first.focus()
          }
        }
      },
      { signal: handle.signal },
    )

    poll()
    if (location.pathname === "/dashboard") open()
  })

  const rows = () =>
    [...items].reverse().map((item) => (
      <article key={item.id} class="cp-row">
        <div>
          <div class="cp-prompt">{item.prompt}</div>
          <div class="cp-meta">
            <span class="op-id">{item.id}</span>
            <time class="op-time" datetime={new Date(item.ts).toISOString()}>
              {stamp(item.ts)}
            </time>
          </div>
          {item.note ? <div class="cp-note">{item.note}</div> : null}
        </div>
        <div class="cp-side">
          <span class={"badge s-" + item.status}>
            <i />
            {LABELS[item.status] || item.status}
          </span>
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
      <div
        class={isOpen ? "cp open" : "cp"}
        aria-hidden={isOpen ? undefined : "true"}
        mix={[
          paletteStyle,
          on("click", (event) => {
            if (event.target === event.currentTarget) close()
          }),
        ]}
      >
        <div
          class="cp-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Console"
          mix={ref((node) => {
            panel = node
          })}
        >
          <form
            class={draft.trim() ? "cp-head ready" : "cp-head"}
            autoComplete="off"
            mix={on("submit", (event) => submit(event))}
          >
            <input
              class="cp-input"
              type="text"
              maxLength={2000}
              placeholder="Describe a goal or ask a question…"
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
            <div class="cp-keys">
              <button class="cp-go" type="submit" aria-label="Preview goal" title="Preview goal" disabled={busy}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              </button>
              <button class="cp-esc" type="button" aria-label="Close console" title="Close (Esc)" mix={on("click", close)}>
                Esc
              </button>
            </div>
          </form>
          <p class={hint ? (hintIsError ? "cp-hint on err" : "cp-hint on") : "cp-hint"} role="status">
            {hint}
          </p>
          <section class="cp-list" aria-live="polite" aria-label="Requests">
            {loaded && items.length > 0 ? (
              <>
                <p class="cp-label">Recent</p>
                {rows()}
              </>
            ) : null}
            <p class="cp-label">Try</p>
            {EXAMPLES.map((text) => (
              <div key={text} class="cp-row">
                <button class="cp-ex" type="button" mix={on("click", () => useExample(text))}>
                  <svg class="cp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  <span>{text}</span>
                </button>
              </div>
            ))}
          </section>
        </div>
      </div>
      {previewModal()}
    </>
  )
})

