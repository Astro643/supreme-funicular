import { css } from "remix/component"
import type { Handle, RemixNode } from "remix/component"

import { hasContact, inviteHref, supportHref, supportMail } from "../lib/site-config.ts"
import { Logo } from "./logo.tsx"
import { Console } from "./console.tsx"
import { SupportWidget } from "./support-widget.tsx"

export const PREFETCH = { "data-rmx-prefetch": "intent" } as const

/** Marks a link that opens the Console overlay. The href stays as the fallback when scripts are off. */
export const CONSOLE = { "data-open-console": "true" } as const

const headerStyle = css({
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "rgba(250,250,250,.8)",
  backdropFilter: "saturate(1.4) blur(14px)",
  borderBottom: "1px solid var(--border)",
  "& .bar": {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    height: "72px",
  },
  "& .bar > :last-child": { justifySelf: "end" },
  "& .bar .logo": { color: "#000", transition: "transform .2s ease" },
  "& .brand:hover .logo, & .brand:focus-visible .logo": { transform: "rotate(-90deg)" },
  "@media (prefers-reduced-motion: reduce)": {
    "& .bar .logo": { transition: "none" },
  },
  "& nav": { display: "flex", gap: "4px" },
  "& nav a": {
    font: "400 15px var(--sans)",
    letterSpacing: "-.011em",
    textDecoration: "none",
    color: "var(--muted)",
    padding: "8px 14px",
    borderRadius: "8px",
  },
  "& nav a:hover": { color: "var(--ink)", background: "rgba(0,0,0,.05)" },
  "@media (max-width:760px)": {
    "& .bar": { display: "flex", justifyContent: "space-between", gap: "8px", height: "64px" },
  },
})

const footerStyle = css({
  marginTop: "120px",
  borderTop: "1px solid var(--border)",
  color: "var(--ink)",
  "& .foot": {
    display: "grid",
    gap: "36px",
    gridTemplateColumns: "1.4fr repeat(auto-fit, minmax(120px, 1fr))",
    padding: "56px 0 40px",
  },
  "& .about": { color: "var(--muted)", fontSize: "15px", marginTop: "14px", maxWidth: "300px" },
  "& h4": {
    margin: "0 0 16px",
    font: "500 15px var(--sans)",
    letterSpacing: "-.011em",
    color: "var(--ink)",
  },
  "& .links a": { display: "block", textDecoration: "none", color: "var(--muted)", fontSize: "15px", padding: "5px 0" },
  "& .links a:hover": { color: "var(--ink)" },
  "& .legal": {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "8px 24px",
    borderTop: "1px solid var(--border)",
    padding: "18px 0 32px",
    color: "var(--faint)",
    font: "400 13px var(--sans)",
  },
  "@media (max-width:760px)": {
    "& .foot": { gridTemplateColumns: "1fr 1fr" },
    "& .foot > :first-child": { gridColumn: "1 / -1" },
  },
})

export function Header() {
  return () => (
    <header mix={headerStyle}>
      <div class="wrap bar">
        <a class="brand" href="/" {...PREFETCH}>
          <Logo />
          Controller
        </a>
        <nav aria-label="Main">
          <a href="/docs" {...PREFETCH}>Docs</a>
          <a href="/about" {...PREFETCH}>About</a>
        </nav>
        <a class="btn btn-primary btn-sm" href="/dashboard" {...CONSOLE}>Open Console</a>
      </div>
    </header>
  )
}

export function Footer() {
  return () => (
    <footer mix={footerStyle}>
      <div class="wrap">
        <div class="foot">
          <div>
            <a class="brand" href="/" {...PREFETCH}>
              <Logo />
              Controller
            </a>
            <p class="about">Agentic infrastructure for Discord. Agents plan it, workflows run it, your bot does it.</p>
          </div>
          <div class="links">
            <h4>Product</h4>
            <a href="/dashboard" {...CONSOLE}>Console</a>
            <a href="/docs" {...PREFETCH}>Docs</a>
            <a href="/about" {...PREFETCH}>About</a>
            {inviteHref ? <a href={inviteHref}>Add to Discord</a> : null}
          </div>
          {hasContact ? (
            <div class="links">
              <h4>Help</h4>
              {supportHref ? <a href={supportHref}>Discord server</a> : null}
              {supportMail ? <a href={"mailto:" + supportMail}>{supportMail}</a> : null}
            </div>
          ) : null}
          <div class="links">
            <h4>Legal</h4>
            <a href="/privacy" {...PREFETCH}>Privacy Policy</a>
            <a href="/terms" {...PREFETCH}>Terms of Service</a>
          </div>
        </div>
        <div class="legal">
          <span>© {String(new Date().getFullYear())} Controller</span>
          <span>Not affiliated with or endorsed by Discord Inc.</span>
        </div>
      </div>
    </footer>
  )
}

/** Header, main content, footer, Console overlay and support widget, shared by every page. */
export function Layout(handle: Handle<{ children?: RemixNode }>) {
  return () => (
    <>
      <a class="skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <div class="wrap">{handle.props.children}</div>
      </main>
      <Footer />
      <Console />
      <SupportWidget />
    </>
  )
}

export function ContactLine() {
  return () => {
    if (supportMail && supportHref) {
      return (
        <>
          <a href={"mailto:" + supportMail}>{supportMail}</a>
          {" or "}
          <a href={supportHref}>our Discord server</a>
        </>
      )
    }
    if (supportMail) return <a href={"mailto:" + supportMail}>{supportMail}</a>
    if (supportHref) return <a href={supportHref}>our Discord server</a>
    return <span>please contact whoever operates this bot for your server.</span>
  }
}
