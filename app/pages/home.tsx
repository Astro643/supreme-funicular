import type { PageMeta } from "../lib/page.ts"
import { inviteHref } from "../lib/site-config.ts"
import { CONSOLE, Layout } from "../ui/chrome.tsx"
import { ScrollCue } from "../ui/scroll-cue.tsx"

export const meta: PageMeta = {
  title: "Controller · Agentic infrastructure for Discord",
  description:
    "Agentic infrastructure for Discord. AI agents audit and plan your goals, durable workflows run them, and your bot carries them out.",
  styles: ["/site.css"],
}

const PARTS = [
  [
    "Your own agent",
    "Every Console session gets a dedicated AI agent that audits the request, then works step by step, reading each result before choosing the next. It has a backup model ready if its main model fails.",
  ],
  [
    "Durable workflows",
    "Each request runs as a background workflow. It can pause for minutes or hours and pick up again on time, even after you close the Console.",
  ],
  [
    "An executor, not a gambler",
    "The bot has no AI of its own. It performs one approved step at a time, with hard safety limits built into the bot itself.",
  ],
  [
    "Visible end to end",
    "Live status for every request, and a live status card for the bot, each agent and the task engine, right in the corner of the site.",
  ],
] as const

const CAPABILITIES = [
  ["Structure", "Create categories and channels, rename them, lock them down or remove them when you are done."],
  ["Roles", "Make roles with exactly the permissions you choose, then hand them out or take them back."],
  ["Moderation", "Kick, ban, time out or rename members, people and bots alike, simply by their display name."],
  [
    "Scheduled work",
    "Ask for something to happen later, such as locking a channel in two hours. Waits can last up to 12 hours in total.",
  ],
  [
    "Research and automation",
    "Search the web, write the summary, post it to Discord, email it to you or call your own webhooks, all from one goal.",
  ],
  [
    "Anything Discord allows",
    "Beyond the built-in actions, agents can use Discord itself for threads, events, invites, emojis and more.",
  ],
] as const

const SAFEGUARDS = [
  ["Owner only.", "Your magic link works once and expires in minutes."],
  ["Never against you.", "The bot refuses to act against the server owner or itself."],
  ["Audited first.", "Requests that look abusive or unclear are rejected before anything runs."],
  [
    "Web content cannot take control.",
    "Once an agent has read the web, destructive actions like bans and deletes are blocked for that request.",
  ],
  ["Fails safe.", "If an agent and its backup model are both unavailable, nothing runs."],
  ["Cancel while waiting.", "A request paused for a scheduled step can be cancelled any time before it resumes."],
  ["Capped.", "A single request is limited in size, so one mistake cannot snowball."],
] as const

function Cta() {
  return () => (
    <div class="cta">
      {inviteHref ? (
        <>
          <a class="btn btn-primary" href={inviteHref}>Add to Discord</a>
          <a class="btn" href="/dashboard" {...CONSOLE}>Open Console</a>
        </>
      ) : (
        <a class="btn btn-primary" href="/dashboard" {...CONSOLE}>Open Console</a>
      )}
    </div>
  )
}

export function HomePage() {
  return () => (
    <Layout>
      <section class="landing" aria-label="Agentic infrastructure">
        <div>
          <p class="display">
            Agentic
            <br />
            infrastructure
          </p>
        </div>
        <div class="a-mid">
          <div class="tile">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 5h19L12 20.5z" fill="currentColor" />
            </svg>
          </div>
        </div>
        <div class="a-right">
          <ul class="a-list">
            <li>For server owners</li>
            <li>To run goals in plain language</li>
            <li>Automated by agents</li>
          </ul>
        </div>
        <ScrollCue />
      </section>

      <section class="hero" id="intro">
        <span class="eyebrow">Agentic infrastructure for Discord</span>
        <h1>
          Give your server <em>agents that do the work.</em>
        </h1>
        <p class="lead">
          State a goal in plain language. A dedicated AI agent audits it, researches, decides each next step and acts, a
          durable workflow keeps it running, and your bot carries out the Discord side, in seconds or across hours.
        </p>
        <Cta />
        <div class="demo" role="group" aria-label="Example request">
          <div class="bubble">Post the tournament rules in #announcements, then lock #signups in 2 hours</div>
          <div class="row">
            <span class="badge s-waiting">
              <i />
              Waiting
            </span>
            <span class="mono">2 steps · resumes in 2h</span>
          </div>
          <div class="steps-mini">
            <div>
              <b>1</b> post the rules in #announcements <span class="done">· done</span>
            </div>
            <div>
              <b>2</b> wait 2 hours, then lock #signups from @everyone
            </div>
          </div>
        </div>
      </section>

      <section class="block">
        <div class="head">
          <h2>Infrastructure, not another dashboard.</h2>
          <p>Four parts work together so a request can be checked, planned and finished without you babysitting it.</p>
        </div>
        <div class="grid four">
          {PARTS.map(([title, text]) => (
            <div class="card" key={title}>
              <div class="bar" aria-hidden="true"></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section class="block">
        <div class="head">
          <h2>What your agents can do.</h2>
          <p>Anything an owner does by hand, from one sentence.</p>
        </div>
        <div class="grid">
          {CAPABILITIES.map(([title, text]) => (
            <div class="card" key={title}>
              <div class="bar" aria-hidden="true"></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section class="block">
        <div class="head">
          <h2>Three steps. No setup screens.</h2>
        </div>
        <div class="steps">
          <div class="step">
            <h3>Get a magic link</h3>
            <p>
              Type <span class="mono">/dashboard</span> in your server. Only you can see the link, and it works once.
            </p>
          </div>
          <div class="step">
            <h3>State the goal</h3>
            <p>Write it the way you would tell a person. No commands to learn.</p>
          </div>
          <div class="step">
            <h3>Let the agents run it</h3>
            <p>Your agent audits and plans it, the workflow runs it, and the status updates live.</p>
          </div>
        </div>
      </section>

      <section class="block">
        <div class="grid split">
          <div>
            <h2>Autonomy with the owner in control.</h2>
            <p class="lead">
              Agents are only worth it if you can trust them. These protections are built in, not bolted on.
            </p>
          </div>
          <ul class="checks">
            {SAFEGUARDS.map(([title, text]) => (
              <li key={title}>
                <span>
                  <b>{title}</b> {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section class="band">
        <h2>Put agents to work on your server.</h2>
        <p class="lead">
          Add the bot, run <span class="mono">/dashboard</span>, and hand over your first goal.
        </p>
        <Cta />
      </section>
    </Layout>
  )
}

