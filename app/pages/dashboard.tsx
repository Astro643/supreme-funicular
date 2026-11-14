import type { PageMeta } from "../lib/page.ts"
import { HomePage } from "./home.tsx"

// A magic link lands here. The Console is an overlay that every page carries, and it opens by itself on this
// address, so this page is the home page underneath it. Closing the Console returns the address to "/".
export const meta: PageMeta = {
  title: "Console · Controller",
  robots: "noindex",
  styles: ["/site.css"],
}

export function DashboardPage() {
  return () => <HomePage />
}
