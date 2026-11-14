import type { PageMeta } from "../lib/page.ts"
import { Layout, PREFETCH } from "../ui/chrome.tsx"

export const meta: PageMeta = {
  title: "About · Controller",
  description: "Why I built Controller, what I put first, and what comes next.",
  styles: ["/site.css"],
}

export function AboutPage() {
  return () => (
    <Layout>
      <div class="page">
        <h1>About</h1>
        <p class="lead">Why I built Controller, what I put first, and what comes next.</p>
        <div class="cta">
          <a class="btn btn-primary" href="/dashboard" {...PREFETCH}>Open Console</a>
          <a class="btn" href="/docs" {...PREFETCH}>Read the docs</a>
        </div>
      </div>

      <div class="prose">
        <h2>Why it exists</h2>
        <p>
          Most Discord bots do one simple thing at a time: you run a command and get a response. I wanted something that
          could do agentic tasks and Discord actions in the same request, so you can describe a goal in plain language and
          have it planned, researched and carried out.
        </p>
        <p>Controller is that. An agent works out the plan, and your bot does the Discord side.</p>

        <h2>Safety comes first</h2>
        <p>
          Safety came before everything else. I spent a lot of time battle testing Controller, and its protections are
          built into how it works, not added afterward.
        </p>
        <ul>
          <li>
            <b>Owner only.</b> Your Console link works once and expires in minutes.
          </li>
          <li>
            <b>You approve every plan.</b> Nothing runs until you have seen a preview.
          </li>
          <li>
            <b>Never against you.</b> The bot refuses to act against the server owner or itself.
          </li>
          <li>
            <b>Web content cannot take control.</b> Once an agent has read the web, destructive actions are blocked for
            that request.
          </li>
        </ul>
        <p>
          The full list is in the <a href="/docs#safety">Docs</a>.
        </p>

        <h2>What’s next</h2>
        <p>
          The next step is not a new feature. Before I add anything, I want to make Controller safer in every way I can.
        </p>
        <p>
          After that, the goal is to grow the catalogue of actions it can take. Scheduled monthly runs are already
          planned, and the <a href="/docs#scheduled">Docs</a> describe them.
        </p>
      </div>
    </Layout>
  )
}
