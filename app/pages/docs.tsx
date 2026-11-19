import type { PageMeta } from "../lib/page.ts"
import { Layout } from "../ui/chrome.tsx"

export const meta: PageMeta = {
  title: "Docs · Controller",
  description:
    "How to use the Controller Console: getting started, writing goals, request statuses, safety and how requests run under the hood.",
  styles: ["/site.css"],
}

const SECTIONS = [
  ["getting-started", "Getting started"],
  ["console", "Using the Console"],
  ["goals", "Writing good goals"],
  ["statuses", "Request statuses"],
  ["how-it-runs", "How a request runs"],
  ["safety", "Safety"],
  ["scheduled", "Scheduled runs"],
  ["support", "Support"],
  ["api", "API"],
] as const

export function DocsPage() {
  return () => (
    <Layout>
      <div class="page">
        <h1>Docs</h1>
        <p class="lead">How to use Controller, what your agent does with a goal, and what every status means.</p>
        <ul class="toc">
          {SECTIONS.map(([id, title]) => (
            <li key={id}>
              <a href={"#" + id}>{title}</a>
            </li>
          ))}
        </ul>
      </div>

      <div class="prose">
        <h2 id="getting-started">Getting started</h2>
        <p>
          Controller has no setup screens and no passwords. Add the bot to your server, then type{" "}
          <span class="mono">/dashboard</span> in your server. The bot replies with a magic link that only you can see — it
          works once and expires in minutes. Open it to reach your Console.
        </p>
        <p>
          If the Console ever says your session expired, just run <span class="mono">/dashboard</span> again for a fresh
          link. Your request history is not lost — it lives in your browser.
        </p>

        <h2 id="console">Using the Console</h2>
        <p>
          Describe a goal in plain language and press execute. Controller sends it directly to the agent and shows the
          request status as it runs.
        </p>
        <p>
          The Console opens over whatever page you are on, from any Open Console button. Press{" "}
          <span class="mono">Ctrl</span> + <span class="mono">K</span> (<span class="mono">⌘</span> +{" "}
          <span class="mono">K</span> on a Mac) to open it from anywhere, and <span class="mono">Esc</span> to close it.
          Closing it stops nothing: your requests keep running, and the Console shows their latest status when you open it
          again.
        </p>
        <ul>
          <li>
            <b>Direct execution.</b> Requests start as soon as you press execute, without a preview or confirmation
            step. Double-check the goal and its targets before sending, then follow progress in the Console.
          </li>
          <li>
            <b>Tracking.</b> Each request appears in your Console with a live status. Your last 50 requests are kept in
            your browser only — clearing your browser data clears them.
          </li>
          <li>
            <b>Cancel.</b> A waiting request can be cancelled. Steps that already ran are not undone.
          </li>
        </ul>

        <h2 id="goals">Writing good goals</h2>
        <p>Write the goal the way you would tell a person. A few habits get better plans:</p>
        <ul>
          <li>
            <b>Name the exact targets.</b> “Rename #general to #lobby and slow it to 5 seconds” beats “tidy up my
            channels”.
          </li>
          <li>
            <b>One outcome per request.</b> Ten small requests are easier to track and cancel than one giant one.
          </li>
          <li>
            <b>Questions are free.</b> Ask “how many webhooks does my server have?” — questions get answers, not actions.
          </li>
        </ul>

        <h2 id="statuses">Request statuses</h2>
        <ul>
          <li>
            <b>Processing.</b> The plan is running right now.
          </li>
          <li>
            <b>Waiting.</b> The request is paused for a scheduled step and will resume on time. It can still be
            cancelled.
          </li>
          <li>
            <b>Completed.</b> Every step finished. The result note shows what was done.
          </li>
          <li>
            <b>Failed.</b> Something went wrong; the note says what. Nothing is retried without your say-so — run it
            again from the Console.
          </li>
          <li>
            <b>Traffic stall.</b> Discord rate limits slowed the plan down. It resumes automatically; no action needed.
          </li>
          <li>
            <b>No response.</b> The request went quiet for too long and was retired. Run it again if it still looks
            right.
          </li>
          <li>
            <b>Rejected.</b> The plan was refused by a safety check before anything ran.
          </li>
          <li>
            <b>Cancelled.</b> You stopped it.
          </li>
          <li>
            <b>Expired.</b> The request is no longer known to the server and was retired.
          </li>
        </ul>

        <h2 id="how-it-runs">How a request runs</h2>
        <p>
          When you execute a plan, Controller starts a durable workflow: an isolated Linux sandbox is created for your
          request, each step runs inside it in order, and the sandbox is destroyed when the plan finishes — nothing is
          shared between requests. The bot carries out the Discord-side actions, and the workflow records the result of
          every step so the Console can show you exactly what happened.
        </p>

        <h2 id="safety">Safety</h2>
        <ul>
          <li>
            <b>Owner only.</b> Console links come from the <span class="mono">/dashboard</span> command, work once, and
            expire in minutes.
          </li>
          <li>
            <b>Never against you.</b> The bot refuses to act against the server owner or itself.
          </li>
          <li>
            <b>Small footprint.</b> Your request history stays in your browser. Server history and audit records are
            removed automatically after 30 days.
          </li>
        </ul>

        <h2 id="scheduled">Scheduled runs (coming soon)</h2>
        <p>
          Soon you will be able to put any goal on a monthly schedule: Controller will run it for you automatically, around
          the same time every month, and you will be able to cancel it from the Console like any other request.
        </p>

        <h2 id="support">Support and status</h2>
        <p>
          The chat bubble on every page shows live system status and an AI assistant that answers questions about
          Controller, around the clock.
        </p>

        <h2 id="api">API</h2>
        <p>
          The Console sends agent requests through same-origin routes. The frontend server forwards the existing
          session cookie and attaches its private agent API key:
        </p>
        <ul>
          <li>
            <code>POST /api/controller/agent/preview</code> — turn a prompt into a plan or clarifying question.
          </li>
          <li>
            <code>POST /api/controller/agent/execute</code> — start the previewed plan.
          </li>
          <li>
            <code>GET /api/controller/agent/status/:id</code> — poll status, result, or pending approval.
          </li>
          <li>
            <code>POST /api/controller/agent/approve/:id</code> — approve or reject a requested action.
          </li>
          <li>
            <code>POST /api/controller/agent/cancel/:id</code> — cancel a waiting agent request.
          </li>
          <li>
            <code>GET /api/public/status</code> — system status feed.
          </li>
          <li>
            <code>POST /api/support/chat</code> — AI support chat.
          </li>
        </ul>
      </div>

      <div class="faq">
        <details>
          <summary>Do I need to learn commands?</summary>
          <div class="ans">
            <p>
              Only one: <span class="mono">/dashboard</span>, to get your Console link. Everything else is plain language.
            </p>
          </div>
        </details>
        <details>
          <summary>Where is my request history kept?</summary>
          <div class="ans">
            <p>
              In your browser, on your device — the last 50 requests. Clearing your browser data clears it. Server-side
              history and audit records are deleted automatically after 30 days.
            </p>
          </div>
        </details>
        <details>
          <summary>What happens when I cancel a request?</summary>
          <div class="ans">
            <p>
              The remaining steps never run. Steps that already finished are not undone — if a channel was already
              renamed, it stays renamed.
            </p>
          </div>
        </details>
        <details>
          <summary>Why did my request fail?</summary>
          <div class="ans">
            <p>
              The note next to the status says what went wrong — usually a missing channel or a permission Discord
              refused. Fix the detail and run it again; nothing is retried on its own.
            </p>
          </div>
        </details>
        <details>
          <summary>Is Controller affiliated with Discord?</summary>
          <div class="ans">
            <p>No. Controller is an independent product and is not affiliated with or endorsed by Discord Inc.</p>
          </div>
        </details>
      </div>
    </Layout>
  )
}
