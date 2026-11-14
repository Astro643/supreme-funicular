import { css } from "remix/component"

import type { PageMeta } from "../lib/page.ts"
import { Console } from "../ui/console.tsx"
import { Logo } from "../ui/logo.tsx"

export const meta: PageMeta = {
  title: "Console · Controller",
  robots: "noindex",
}

const markStyle = css({
  position: "fixed",
  top: "20px",
  left: "24px",
  zIndex: 5,
  color: "#000",
  lineHeight: 0,
  "& .logo": { width: "22px", height: "22px" },
})

export function DashboardPage() {
  return () => (
    <>
      <a href="/" aria-label="Controller home" mix={markStyle}>
        <Logo />
      </a>
      <Console />
    </>
  )
}
